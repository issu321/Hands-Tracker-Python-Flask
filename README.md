# Hands Tracker Python Flask

**Real-Time AI Hand & Face Tracking Web Application**

[![Python](https://img.shields.io/badge/Python-3.8+-blue.svg)](https://python.org)
[![Flask](https://img.shields.io/badge/Flask-3.0-green.svg)](https://flask.palletsprojects.com)
[![OpenCV](https://img.shields.io/badge/OpenCV-4.9-orange.svg)](https://opencv.org)
[![MediaPipe](https://img.shields.io/badge/MediaPipe-0.10-red.svg)](https://mediapipe.dev)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## Project Overview

Hands Tracker is a production-ready, real-time computer vision web application that tracks hands and faces using AI-powered MediaPipe solutions. Built with Flask, OpenCV, and MediaPipe, it delivers a futuristic cyberpunk UI with neon visual effects, gesture recognition, smile detection, and live analytics.

**Developer:** [issu321](https://github.com/issu321)  
**Repository:** [Hands-Tracker-Python-Flask](https://github.com/issu321/Hands-Tracker-Python-Flask)

---

## Features

### Hand Tracking
- Single & multi-hand detection (up to 2 hands)
- 21 precise hand landmarks per hand
- Real-time finger tracking
- Finger state detection (extended/curled)
- Finger counting
- Pinch detection with distance measurement
- Left/Right hand recognition
- Hand confidence scoring

### Gesture Recognition
Recognizes 8+ gestures in real-time:
- **Open Palm** - All fingers extended
- **Closed Fist** - All fingers curled
- **Peace Sign** - Index & middle fingers up
- **Thumbs Up** - Only thumb extended
- **Pointing Finger** - Only index extended
- **Rock Gesture** - Index & pinky extended
- **Victory Gesture** - V-sign
- **Pinch** - Thumb & index close together

### Face Tracking
- 468-point face mesh detection
- Real-time face tracking with bounding box
- Head position detection
- Face confidence scoring
- Eye iris tracking

### Smile & Blink Detection
- Real-time smile status (Smiling / Neutral / Not Smiling)
- Smile confidence score
- Eye blink detection with event counting
- Left/Right eye state tracking

### Visual Effects
- Rainbow light trails on hand movement
- Neon laser connections between landmarks
- Finger beam effects at fingertips
- Particle explosion effects on gestures
- Glow trails and motion blur
- Cyber hologram face overlay
- Energy pulse aura around hands
- Interactive visual feedback

### Dashboard & Analytics
- Real-time FPS monitoring
- Live hand and face count
- Current gesture display with animated icon
- Smile status with animated meter
- Gesture history log
- Session duration tracking
- Detection statistics
- System status indicators

---

## Technology Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| Python | 3.8+ | Backend language |
| Flask | 3.0.3 | Web framework |
| Flask-SocketIO | 5.3.6 | Real-time communication |
| OpenCV | 4.9.0.80 | Computer vision |
| MediaPipe | 0.10.14 | AI hand/face tracking |
| NumPy | 1.26.4 | Numerical computing |
| Pillow | 10.3.0 | Image processing |
| psutil | 5.9.8 | System monitoring |
| HTML5 | - | Frontend markup |
| CSS3 | - | Styling & animations |
| JavaScript | - | Client-side logic |
| Socket.IO | 4.7.5 | WebSocket client |

---

## Installation

### Prerequisites
- Python 3.8 or higher
- Webcam/Camera
- Modern web browser (Chrome, Firefox, Edge, Safari)

### Linux Setup

```bash
# Clone the repository
git clone https://github.com/issu321/Hands-Tracker-Python-Flask.git
cd Hands-Tracker-Python-Flask

# Run the installer
chmod +x install.sh
./install.sh
```

The installer will:
1. Check Python version
2. Create a virtual environment
3. Install all dependencies
4. Install OpenCV system libraries
5. Create a startup script
6. Optionally launch the app

### Windows Setup

```cmd
# Clone the repository
git clone https://github.com/issu321/Hands-Tracker-Python-Flask.git
cd Hands-Tracker-Python-Flask

# Run the installer
install.bat
```

The installer will:
1. Check Python installation
2. Create a virtual environment
3. Install all dependencies
4. Create start.bat
5. Optionally create a desktop shortcut
6. Optionally launch the app

### Manual Installation

```bash
# Create virtual environment
python -m venv venv

# Activate (Linux/Mac)
source venv/bin/activate

# Activate (Windows)
venv\Scripts\activate.bat

# Install dependencies
pip install -r requirements.txt

# Run the application
python app.py
```

---

## Usage

1. **Start the application:**
   - Linux: `./start.sh` or `python app.py`
   - Windows: Double-click `start.bat` or run `python app.py`

2. **Open your browser:**
   Navigate to `http://localhost:5000`

3. **Grant camera permission:**
   The browser will automatically request camera access. Click "Allow".

4. **Navigate to Dashboard:**
   Click "Launch App" or go to `/dashboard`

5. **Start tracking:**
   - Camera opens automatically
   - Hand tracking begins instantly
   - Face tracking starts automatically
   - Visual effects render in real-time

6. **Interact:**
   - Show your hand to see landmarks and effects
   - Make gestures to see recognition
   - Smile to see smile detection
   - Check the sidebar for live statistics

---

## Project Structure

```
Hands-Tracker-Python-Flask/
├── app.py                 # Flask application & SocketIO server
├── vision.py              # MediaPipe hand/face processing & effects
├── utils.py               # Utility functions (FPS, logger, helpers)
├── requirements.txt       # Python dependencies
├── install.sh             # Linux installer
├── install.bat            # Windows installer
├── start.sh               # Linux startup script (generated)
├── start.bat              # Windows startup script (generated)
├── README.md              # This file
├── templates/
│   ├── home.html          # Landing page
│   ├── dashboard.html     # Real-time tracking dashboard
│   ├── features.html      # Feature list page
│   └── contact.html       # Contact page
└── static/
    ├── css/
    │   └── style.css      # Complete stylesheet (cyberpunk theme)
    ├── js/
    │   ├── main.js        # Home page animations
    │   └── dashboard.js   # Dashboard real-time logic
    └── assets/            # Static assets
```

---

## Pages

| Page | Route | Description |
|------|-------|-------------|
| Home | `/` | Landing page with hero, features, tech stack |
| Dashboard | `/dashboard` | Real-time tracking with camera & analytics |
| Features | `/features` | Complete feature documentation |
| Contact | `/contact` | Developer info & GitHub links |

---

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Home page |
| `/dashboard` | GET | Dashboard page |
| `/features` | GET | Features page |
| `/contact` | GET | Contact page |
| `/api/status` | GET | Server status & system info |
| `/api/analytics` | GET | Session analytics data |

### SocketIO Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `connect` | Client -> Server | Client connection |
| `frame` | Client -> Server | Send video frame |
| `start_tracking` | Client -> Server | Start tracking session |
| `stop_tracking` | Client -> Server | Stop tracking session |
| `frame_result` | Server -> Client | Processed frame & data |
| `server_status` | Server -> Client | Server connection status |
| `tracking_started` | Server -> Client | Tracking started confirmation |
| `tracking_stopped` | Server -> Client | Tracking stopped confirmation |
| `error` | Server -> Client | Error message |

---

## Performance

- **Target FPS:** 60 FPS (server-side processing)
- **Client FPS:** ~30 FPS (network optimized)
- **Latency:** < 100ms end-to-end
- **CPU Usage:** Optimized with frame skipping
- **Memory:** ~200MB RAM usage
- **Compatible:** Works on most modern hardware

---

## Error Handling

The application gracefully handles:
- No camera detected
- Camera busy (other app using it)
- Permission denied
- MediaPipe initialization failure
- OpenCV errors
- Network disconnections
- Server failures

All errors show friendly user messages with retry options.

---

## Troubleshooting

### Camera not working
1. Ensure no other app is using the camera
2. Check browser permissions (click the lock icon in address bar)
3. Try a different browser
4. Restart the application

### Low FPS
1. Close other applications
2. Reduce camera resolution in browser settings
3. Ensure good lighting conditions
4. Check CPU usage

### Installation issues
1. Ensure Python 3.8+ is installed
2. Update pip: `pip install --upgrade pip`
3. Install OpenCV system dependencies (Linux)
4. Use virtual environment

### MediaPipe errors
1. Ensure `protobuf` is compatible: `pip install protobuf==3.20.3`
2. Reinstall MediaPipe: `pip install --force-reinstall mediapipe`
3. Check Python version compatibility

---

## GitHub

- **Developer:** [issu321](https://github.com/issu321)
- **Repository:** [Hands-Tracker-Python-Flask](https://github.com/issu321/Hands-Tracker-Python-Flask)
- **Issues:** [Report a bug](https://github.com/issu321/Hands-Tracker-Python-Flask/issues)
- **Stars:** Show your support by starring the repo!

---

## License

MIT License - See LICENSE file for details.

---

## Credits

- **Developer:** issu321
- **Hand Tracking:** Google MediaPipe Hands
- **Face Tracking:** Google MediaPipe Face Mesh
- **UI Framework:** Flask + SocketIO
- **Computer Vision:** OpenCV
- **Frontend:** Custom HTML/CSS/JS with cyberpunk design

---

<p align="center">
  <b>Built with passion for AI and computer vision</b><br>
  <a href="https://github.com/issu321/Hands-Tracker-Python-Flask">Star on GitHub</a>
</p>
