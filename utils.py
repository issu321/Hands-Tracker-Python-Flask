#!/usr/bin/env python3
"""
Utility Functions for Hands Tracker
"""

import time
import platform
import psutil
import numpy as np

class FPSCounter:
    """High-performance FPS counter with rolling window"""
    def __init__(self, window_size=30):
        self.window_size = window_size
        self.timestamps = []
        self.last_time = time.time()

    def tick(self):
        current = time.time()
        self.timestamps.append(current)
        if len(self.timestamps) > self.window_size:
            self.timestamps.pop(0)
        self.last_time = current

    def get_fps(self):
        if len(self.timestamps) < 2:
            return 0.0
        duration = self.timestamps[-1] - self.timestamps[0]
        if duration <= 0:
            return 0.0
        return round((len(self.timestamps) - 1) / duration, 1)

class Logger:
    """Simple colored logger"""
    def info(self, msg):
        print(f"[INFO] {msg}")

    def error(self, msg):
        print(f"[ERROR] {msg}")

    def warning(self, msg):
        print(f"[WARN] {msg}")

def get_system_info():
    """Get system information"""
    return {
        'platform': platform.system(),
        'platform_version': platform.version(),
        'processor': platform.processor(),
        'cpu_count': psutil.cpu_count(),
        'memory_gb': round(psutil.virtual_memory().total / (1024**3), 2),
        'python_version': platform.python_version()
    }

def calculate_distance(p1, p2):
    """Calculate Euclidean distance between two points"""
    return np.sqrt((p1[0] - p2[0])**2 + (p1[1] - p2[1])**2)

def calculate_angle(a, b, c):
    """Calculate angle between three points (b is vertex)"""
    ba = np.array([a[0] - b[0], a[1] - b[1]])
    bc = np.array([c[0] - b[0], c[1] - b[1]])

    cosine_angle = np.dot(ba, bc) / (np.linalg.norm(ba) * np.linalg.norm(bc) + 1e-6)
    angle = np.arccos(np.clip(cosine_angle, -1.0, 1.0))
    return np.degrees(angle)

def map_value(value, in_min, in_max, out_min, out_max):
    """Map value from one range to another"""
    return (value - in_min) * (out_max - out_min) / (in_max - in_min) + out_min

def hsv_to_rgb(h, s, v):
    """Convert HSV to RGB"""
    h = h % 360
    c = v * s
    x = c * (1 - abs((h / 60) % 2 - 1))
    m = v - c

    if h < 60:
        r, g, b = c, x, 0
    elif h < 120:
        r, g, b = x, c, 0
    elif h < 180:
        r, g, b = 0, c, x
    elif h < 240:
        r, g, b = 0, x, c
    elif h < 300:
        r, g, b = x, 0, c
    else:
        r, g, b = c, 0, x

    return (int((r + m) * 255), int((g + m) * 255), int((b + m) * 255))

def get_rainbow_color(index, total=100):
    """Get rainbow color for index"""
    hue = int((index / total) * 360) % 360
    return hsv_to_rgb(hue, 1.0, 1.0)

def smooth_value(current, target, factor=0.3):
    """Smooth value transition"""
    return current + (target - current) * factor
