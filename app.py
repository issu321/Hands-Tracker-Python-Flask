#!/usr/bin/env python3
"""
Hands Tracker Python Flask
Optimized real-time hand & face tracking - JSON-only protocol
Developer: issu321
GitHub: https://github.com/issu321
Repository: https://github.com/issu321/Hands-Tracker-Python-Flask
"""

import os
import base64
import io
import time
import json
import threading
from datetime import datetime

from flask import Flask, render_template, request, jsonify
from flask_socketio import SocketIO, emit
import cv2
import numpy as np
from PIL import Image

from vision import VisionProcessor
from utils import FPSCounter, Logger, get_system_info

# Flask App Configuration
app = Flask(__name__)
app.config['SECRET_KEY'] = 'hands-tracker-secret-key-2026'
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='threading', max_http_buffer_size=50*1024*1024)

# Global Vision Processor
vision_processor = VisionProcessor()
logger = Logger()
fps_counter = FPSCounter()

# Session Analytics
session_data = {
    'start_time': None,
    'gesture_history': [],
    'smile_events': 0,
    'hands_detected_total': 0,
    'faces_detected_total': 0,
    'frames_processed': 0
}

# Routes
@app.route('/')
def home():
    return render_template('home.html')

@app.route('/dashboard')
def dashboard():
    return render_template('dashboard.html')

@app.route('/features')
def features():
    return render_template('features.html')

@app.route('/contact')
def contact():
    return render_template('contact.html')

@app.route('/api/status')
def api_status():
    return jsonify({
        'status': 'online',
        'timestamp': datetime.now().isoformat(),
        'system': get_system_info()
    })

@app.route('/api/analytics')
def api_analytics():
    return jsonify({
        'session_duration': session_data['start_time'],
        'gesture_history': session_data['gesture_history'][-50:],
        'smile_events': session_data['smile_events'],
        'hands_detected_total': session_data['hands_detected_total'],
        'faces_detected_total': session_data['faces_detected_total'],
        'frames_processed': session_data['frames_processed']
    })

# SocketIO Events
@socketio.on('connect')
def handle_connect():
    logger.info('Client connected')
    session_data['start_time'] = time.time()
    emit('server_status', {'status': 'connected', 'message': 'Server ready'})

@socketio.on('disconnect')
def handle_disconnect():
    logger.info('Client disconnected')

@socketio.on('frame')
def handle_frame(data):
    """Optimized: process frame and return JSON data only (no image)"""
    try:
        fps_counter.tick()

        # Decode base64 image
        img_data = data['image'].split(',')[1]
        img_bytes = base64.b64decode(img_data)
        img = Image.open(io.BytesIO(img_bytes))
        frame = cv2.cvtColor(np.array(img), cv2.COLOR_RGB2BGR)

        # Process frame
        result = vision_processor.process(frame)

        # Update analytics
        session_data['frames_processed'] += 1
        if result['hands_count'] > 0:
            session_data['hands_detected_total'] += result['hands_count']
        if result['faces_count'] > 0:
            session_data['faces_detected_total'] += result['faces_count']
        if result['gesture'] and result['gesture'] != 'None':
            session_data['gesture_history'].append({
                'gesture': result['gesture'],
                'timestamp': time.time()
            })
        if result['smile_status'] == 'Smiling':
            session_data['smile_events'] += 1

        # Emit ONLY lightweight JSON data (no image bytes)
        # This eliminates network lag
        emit('tracking_data', {
            'fps': fps_counter.get_fps(),
            'hands_count': result['hands_count'],
            'faces_count': result['faces_count'],
            'gesture': result['gesture'],
            'smile_status': result['smile_status'],
            'handedness': result['handedness'],
            'confidence': result['confidence'],
            'landmarks': result['landmarks'],
            'face_landmarks': result['face_landmarks'],
            'pinch_distance': result['pinch_distance'],
            'finger_count': result['finger_count']
        })

    except Exception as e:
        logger.error(f'Frame processing error: {str(e)}')
        emit('error', {'message': str(e)})

@socketio.on('start_tracking')
def handle_start_tracking():
    logger.info('Tracking started by client')
    session_data['start_time'] = time.time()
    session_data['gesture_history'] = []
    session_data['smile_events'] = 0
    session_data['hands_detected_total'] = 0
    session_data['faces_detected_total'] = 0
    session_data['frames_processed'] = 0
    emit('tracking_started', {'status': 'success'})

@socketio.on('stop_tracking')
def handle_stop_tracking():
    logger.info('Tracking stopped by client')
    emit('tracking_stopped', {'status': 'success'})

# Error Handlers
@app.errorhandler(404)
def not_found(e):
    return render_template('home.html'), 404

@app.errorhandler(500)
def server_error(e):
    return jsonify({'error': 'Internal server error'}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    debug = os.environ.get('FLASK_DEBUG', 'False').lower() == 'true'
    print(f"Starting Hands Tracker on http://0.0.0.0:{port}")
    print(f"Debug mode: {debug}")
    socketio.run(app, host='0.0.0.0', port=port, debug=debug, allow_unsafe_werkzeug=True)
