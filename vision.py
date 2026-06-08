#!/usr/bin/env python3
"""
Vision Processing Module - MediaPipe 0.10.35+
Optimized for EARLY detection from any position + fast processing
"""

import os
import cv2
import numpy as np
import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision as mpvision
from urllib.request import urlretrieve
from utils import calculate_distance, calculate_angle

HAND_MODEL_URL = "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task"
FACE_MODEL_URL = "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task"


def download_model(url, model_path):
    if not os.path.exists(model_path):
        print(f"[Vision] Downloading model: {os.path.basename(model_path)}...")
        os.makedirs(os.path.dirname(model_path) if os.path.dirname(model_path) else ".", exist_ok=True)
        urlretrieve(url, model_path)
        print(f"[Vision] Model ready: {model_path}")


class VisionProcessor:
    def __init__(self):
        self.script_dir = os.path.dirname(os.path.abspath(__file__))
        self.models_dir = os.path.join(self.script_dir, "models")
        os.makedirs(self.models_dir, exist_ok=True)

        self.hand_model_path = os.path.join(self.models_dir, "hand_landmarker.task")
        self.face_model_path = os.path.join(self.models_dir, "face_landmarker.task")

        download_model(HAND_MODEL_URL, self.hand_model_path)
        download_model(FACE_MODEL_URL, self.face_model_path)

        # LOWER confidence = EARLIER detection from any position/angle
        hand_base_options = python.BaseOptions(model_asset_path=self.hand_model_path)
        hand_options = mpvision.HandLandmarkerOptions(
            base_options=hand_base_options,
            num_hands=2,
            min_hand_detection_confidence=0.3,      # Lower = detect earlier
            min_hand_presence_confidence=0.3,         # Lower = track longer
            min_tracking_confidence=0.3               # Lower = smoother tracking
        )
        self.hand_detector = mpvision.HandLandmarker.create_from_options(hand_options)

        face_base_options = python.BaseOptions(model_asset_path=self.face_model_path)
        face_options = mpvision.FaceLandmarkerOptions(
            base_options=face_base_options,
            num_faces=1,
            min_face_detection_confidence=0.3,         # Lower = detect earlier
            min_face_presence_confidence=0.3,
            min_tracking_confidence=0.3,
            output_face_blendshapes=True,
            output_facial_transformation_matrixes=False
        )
        self.face_detector = mpvision.FaceLandmarker.create_from_options(face_options)

        self.smile_threshold = 0.30
        self.smile_status = "Neutral"

        # Gesture smoothing buffer
        self.gesture_buffer = []
        self.gesture_buffer_size = 5
        self.last_stable_gesture = "None"

    def process(self, frame):
        h, w = frame.shape[:2]
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)

        hand_result = self.hand_detector.detect(mp_image)
        face_result = self.face_detector.detect(mp_image)

        hands_count = 0
        faces_count = 0
        gesture = "None"
        handedness = []
        confidence = 0.0
        landmarks_data = []
        face_landmarks_data = []
        pinch_distance = 0.0
        finger_count = 0

        if hand_result.hand_landmarks:
            hands_count = len(hand_result.hand_landmarks)

            for idx, hand_landmarks in enumerate(hand_result.hand_landmarks):
                hand_label = "Unknown"
                hand_score = 0.0
                if hand_result.handedness and idx < len(hand_result.handedness):
                    category = hand_result.handedness[idx][0]
                    hand_label = category.category_name
                    hand_score = category.score
                    handedness.append(f"{hand_label} ({hand_score:.2f})")
                    confidence = max(confidence, hand_score)

                lm_list = []
                for lm in hand_landmarks:
                    cx, cy = int(lm.x * w), int(lm.y * h)
                    lm_list.append([cx, cy, lm.z])
                landmarks_data.append(lm_list)

                detected_gesture = self.recognize_gesture(lm_list)
                if detected_gesture != "None":
                    gesture = detected_gesture

                finger_count = self.count_fingers(lm_list)

                thumb_tip = lm_list[4]
                index_tip = lm_list[8]
                pinch_distance = calculate_distance(thumb_tip[:2], index_tip[:2])

        if face_result.face_landmarks:
            faces_count = len(face_result.face_landmarks)

            for face_landmarks in face_result.face_landmarks:
                face_lm_list = []
                for lm in face_landmarks:
                    cx, cy = int(lm.x * w), int(lm.y * h)
                    face_lm_list.append([cx, cy, lm.z])
                face_landmarks_data.append(face_lm_list)
                self.smile_status = self.detect_smile(face_lm_list)

        # Smooth gesture to prevent flickering
        gesture = self.smooth_gesture(gesture)

        return {
            'hands_count': hands_count,
            'faces_count': faces_count,
            'gesture': gesture,
            'smile_status': self.smile_status,
            'handedness': handedness,
            'confidence': round(confidence, 2),
            'landmarks': landmarks_data,
            'face_landmarks': face_landmarks_data,
            'pinch_distance': round(pinch_distance, 2),
            'finger_count': finger_count
        }

    def smooth_gesture(self, gesture):
        """Smooth gesture detection to prevent rapid flickering"""
        self.gesture_buffer.append(gesture)
        if len(self.gesture_buffer) > self.gesture_buffer_size:
            self.gesture_buffer.pop(0)

        if len(self.gesture_buffer) < 3:
            return self.last_stable_gesture

        # Count occurrences
        counts = {}
        for g in self.gesture_buffer:
            counts[g] = counts.get(g, 0) + 1

        # Require 60% agreement to change gesture
        most_common = max(counts, key=counts.get)
        if counts[most_common] >= len(self.gesture_buffer) * 0.6:
            self.last_stable_gesture = most_common

        return self.last_stable_gesture

    def recognize_gesture(self, lm_list):
        if not lm_list or len(lm_list) < 21:
            return "None"

        fingers = []
        thumb_tip = lm_list[4]
        thumb_ip = lm_list[3]
        thumb_mcp = lm_list[2]
        thumb_extended = thumb_tip[0] > thumb_ip[0] if thumb_tip[0] > thumb_mcp[0] else thumb_tip[0] < thumb_ip[0]
        fingers.append(thumb_extended)

        finger_tips = [8, 12, 16, 20]
        finger_pips = [6, 10, 14, 18]
        for tip, pip in zip(finger_tips, finger_pips):
            fingers.append(lm_list[tip][1] < lm_list[pip][1])

        if all(fingers):
            return "Open Palm"
        elif not any(fingers):
            return "Closed Fist"
        elif fingers[1] and fingers[2] and not fingers[0] and not fingers[3] and not fingers[4]:
            return "Peace Sign"
        elif fingers[0] and not any(fingers[1:]):
            return "Thumbs Up"
        elif fingers[1] and not any([fingers[0], fingers[2], fingers[3], fingers[4]]):
            return "Pointing Finger"
        elif fingers[1] and fingers[4] and not fingers[0] and not fingers[2] and not fingers[3]:
            return "Rock Gesture"
        elif fingers[1] and fingers[2] and not fingers[3] and not fingers[4]:
            return "Victory Gesture"

        thumb_index_dist = calculate_distance(lm_list[4][:2], lm_list[8][:2])
        if thumb_index_dist < 40:
            return "Pinch"

        return "None"

    def count_fingers(self, lm_list):
        if not lm_list or len(lm_list) < 21:
            return 0

        count = 0
        if lm_list[4][0] > lm_list[3][0]:
            count += 1

        tips = [8, 12, 16, 20]
        pips = [6, 10, 14, 18]
        for tip, pip in zip(tips, pips):
            if lm_list[tip][1] < lm_list[pip][1]:
                count += 1

        return count

    def detect_smile(self, face_lm):
        if not face_lm or len(face_lm) < 468:
            return "Neutral"

        left_corner = face_lm[61]
        right_corner = face_lm[291]
        upper_lip = face_lm[13]
        lower_lip = face_lm[14]

        mouth_width = calculate_distance(left_corner[:2], right_corner[:2])
        mouth_height = calculate_distance(upper_lip[:2], lower_lip[:2])

        ratio = mouth_height / (mouth_width + 1e-6)

        if ratio > self.smile_threshold:
            return "Smiling"
        elif ratio > self.smile_threshold * 0.5:
            return "Neutral"
        else:
            return "Not Smiling"

    def release(self):
        self.hand_detector.close()
        self.face_detector.close()
