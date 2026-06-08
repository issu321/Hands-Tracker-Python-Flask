/**
 * Hands Tracker - Magic View Dashboard
 * Pixel-perfect alignment: video drawn to canvas + mirrored overlays
 */

const state = {
    socket: null,
    stream: null,
    video: null,
    canvas: null,
    ctx: null,
    isTracking: false,
    effectsEnabled: true,
    frameCount: 0,
    sessionStart: null,
    gestureHistory: [],
    smileEvents: 0,
    totalGestures: 0,
    fps: 0,
    lastFrameTime: 0,
    lastServerSend: 0,
    serverFps: 0,
    overlayData: null,

    // Smooth interpolation
    targetLandmarks: null,
    currentLandmarks: null,
    targetFaceLandmarks: null,
    currentFaceLandmarks: null,
    lerpFactor: 0.3,

    // Magic effects
    trailHistory: [],
    particles: [],
    rainbowHue: 0,
    scanLineY: 0,
    auraPulse: 0,

    // Throttling
    sendCounter: 0,
    SEND_EVERY_N_FRAMES: 3
};

const elements = {};

function log(msg) {
    console.log('[HandsTracker] ' + msg);
}

document.addEventListener('DOMContentLoaded', function() {
    log('Magic View initializing...');
    cacheElements();
    initSocket();
    setupEventListeners();
    startSessionTimer();
    setTimeout(() => initCamera(), 300);
});

function cacheElements() {
    elements.video = document.getElementById('webcam');
    elements.canvas = document.getElementById('outputCanvas');
    elements.cameraOverlay = document.getElementById('cameraOverlay');
    elements.cameraError = document.getElementById('cameraError');
    elements.errorMessage = document.getElementById('errorMessage');
    elements.retryButton = document.getElementById('retryCamera');
    elements.serverStatus = document.getElementById('serverStatus');
    elements.serverStatusText = document.getElementById('serverStatusText');
    elements.fpsBadge = document.getElementById('fpsBadge');
    elements.liveBadge = document.getElementById('liveBadge');
    elements.statFps = document.getElementById('statFps');
    elements.statHands = document.getElementById('statHands');
    elements.statFaces = document.getElementById('statFaces');
    elements.statFingers = document.getElementById('statFingers');
    elements.gestureIcon = document.getElementById('gestureIcon');
    elements.gestureName = document.getElementById('gestureName');
    elements.gestureConfidence = document.getElementById('gestureConfidence');
    elements.gestureHistory = document.getElementById('gestureHistory');
    elements.smileFace = document.getElementById('smileFace');
    elements.smileStatus = document.getElementById('smileStatus');
    elements.smileMeter = document.getElementById('smileMeter');
    elements.handednessValue = document.getElementById('handednessValue');
    elements.pinchValue = document.getElementById('pinchValue');
    elements.accuracyValue = document.getElementById('accuracyValue');
    elements.cameraStatus = document.getElementById('cameraStatus');
    elements.sessionDuration = document.getElementById('sessionDuration');
    elements.framesProcessed = document.getElementById('framesProcessed');
    elements.smileEvents = document.getElementById('smileEvents');
    elements.totalGestures = document.getElementById('totalGestures');
    elements.toggleCamera = document.getElementById('toggleCamera');
    elements.toggleEffects = document.getElementById('toggleEffects');
    elements.fullscreenBtn = document.getElementById('fullscreenBtn');
}

function initSocket() {
    log('SocketIO connecting...');
    try {
        state.socket = io();

        state.socket.on('connect', function() {
            log('Socket connected');
            elements.serverStatus.classList.add('online');
            elements.serverStatusText.textContent = 'Online';
            state.socket.emit('start_tracking');
        });

        state.socket.on('disconnect', function() {
            elements.serverStatus.classList.remove('online');
            elements.serverStatusText.textContent = 'Offline';
        });

        state.socket.on('tracking_data', function(data) {
            state.overlayData = data;
            state.serverFps = data.fps || 0;

            if (data.landmarks && data.landmarks.length > 0) {
                state.targetLandmarks = data.landmarks;
                if (!state.currentLandmarks) {
                    state.currentLandmarks = JSON.parse(JSON.stringify(data.landmarks));
                }
            } else {
                state.targetLandmarks = null;
            }

            if (data.face_landmarks && data.face_landmarks.length > 0) {
                state.targetFaceLandmarks = data.face_landmarks;
                if (!state.currentFaceLandmarks) {
                    state.currentFaceLandmarks = JSON.parse(JSON.stringify(data.face_landmarks));
                }
            } else {
                state.targetFaceLandmarks = null;
            }

            updateDashboard(data);
        });

        state.socket.on('error', function(data) {
            log('Server error: ' + data.message);
        });

        state.socket.on('tracking_started', function() {
            state.isTracking = true;
            state.sessionStart = Date.now();
            elements.cameraStatus.textContent = 'Active';
            elements.cameraStatus.style.color = '#00ff88';
        });

        state.socket.on('tracking_stopped', function() {
            state.isTracking = false;
            elements.cameraStatus.textContent = 'Stopped';
            elements.cameraStatus.style.color = '#ff5f57';
        });
    } catch (e) {
        log('SocketIO failed: ' + e.message);
    }
}

function withTimeout(promise, ms, errorMsg) {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error(errorMsg || 'Timed out')), ms);
        promise.then(v => { clearTimeout(timer); resolve(v); }, e => { clearTimeout(timer); reject(e); });
    });
}

async function initCamera() {
    elements.cameraOverlay.style.display = 'flex';
    elements.cameraError.style.display = 'none';

    try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            if (navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia) {
                await initCameraLegacy();
                return;
            }
            throw new Error('Camera API not available. Try: chromium --no-sandbox http://localhost:5000');
        }

        const constraints = {
            video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
            audio: false
        };

        const stream = await withTimeout(
            navigator.mediaDevices.getUserMedia(constraints),
            10000,
            'Camera timed out. May be in use or blocked.'
        );

        state.stream = stream;
        elements.video.srcObject = stream;

        await withTimeout(
            new Promise(r => { elements.video.onloadedmetadata = () => r(); }),
            5000, 'Video load timed out'
        );

        await elements.video.play();

        const vw = elements.video.videoWidth || 640;
        const vh = elements.video.videoHeight || 480;
        elements.canvas.width = vw;
        elements.canvas.height = vh;
        state.ctx = elements.canvas.getContext('2d');

        elements.cameraOverlay.style.display = 'none';
        elements.cameraStatus.textContent = 'Connected';
        elements.cameraStatus.style.color = '#00ff88';

        startMagicLoop();

    } catch (err) {
        showCameraError(err);
    }
}

function initCameraLegacy() {
    return new Promise((resolve, reject) => {
        const gum = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
        if (!gum) { reject(new Error('No camera API')); return; }
        gum.call(navigator, { video: true, audio: false },
            stream => {
                state.stream = stream;
                elements.video.srcObject = stream;
                elements.video.onloadedmetadata = () => {
                    elements.video.play();
                    elements.canvas.width = elements.video.videoWidth || 640;
                    elements.canvas.height = elements.video.videoHeight || 480;
                    state.ctx = elements.canvas.getContext('2d');
                    elements.cameraOverlay.style.display = 'none';
                    startMagicLoop();
                    resolve();
                };
            },
            err => reject(new Error('Legacy camera failed: ' + err.message))
        );
    });
}

function showCameraError(err) {
    let msg = '<b>' + (err.name || 'Error') + '</b><br><br>' + err.message;
    if (err.name === 'NotAllowedError') {
        msg = '<b>Permission denied.</b><br><br>Allow camera access. On Kali root: <code>chromium --no-sandbox http://localhost:5000</code>';
    } else if (err.name === 'NotFoundError') {
        msg = '<b>No camera found.</b><br><br>Connect a webcam.';
    } else if (err.message && err.message.includes('timed out')) {
        msg = '<b>Camera timed out.</b><br><br>' + err.message + '<br><br>Try: <code>chromium --no-sandbox http://localhost:5000</code>';
    }
    elements.cameraOverlay.style.display = 'none';
    elements.cameraError.style.display = 'flex';
    elements.errorMessage.innerHTML = msg;
    elements.cameraStatus.textContent = 'Error';
    elements.cameraStatus.style.color = '#ff5f57';
}

/**
 * MAGIC RENDER LOOP - Draws video to canvas + overlays for pixel-perfect alignment
 */
function startMagicLoop() {
    log('Magic loop starting at 60fps');
    let lastSend = 0;
    const SEND_INTERVAL = 66; // ~15fps to server

    function loop() {
        if (!state.ctx || !state.stream || !elements.video.readyState >= 2) {
            requestAnimationFrame(loop);
            return;
        }

        const now = performance.now();
        const ctx = state.ctx;
        const w = elements.canvas.width;
        const h = elements.canvas.height;

        // 1. CLEAR CANVAS
        ctx.clearRect(0, 0, w, h);

        // 2. DRAW VIDEO FRAME TO CANVAS (pixel-perfect alignment)
        // This is the KEY fix - we draw the video so overlays match exactly
        ctx.save();
        ctx.translate(w, 0);
        ctx.scale(-1, 1); // MIRROR for natural selfie view
        ctx.drawImage(elements.video, 0, 0, w, h);
        ctx.restore();

        // 3. Interpolate landmarks for smooth movement
        interpolateLandmarks();

        // 4. Update magic animations
        state.rainbowHue = (state.rainbowHue + 2) % 360;
        state.auraPulse = (state.auraPulse + 0.05) % (Math.PI * 2);
        state.scanLineY = (state.scanLineY + 2) % h;

        // 5. DRAW MAGIC OVERLAYS (mirrored to match video)
        if (state.effectsEnabled) {
            ctx.save();
            ctx.translate(w, 0);
            ctx.scale(-1, 1); // Mirror overlays to match mirrored video

            // Face effects (drawn behind hands)
            if (state.currentFaceLandmarks && state.currentFaceLandmarks.length > 0) {
                for (const faceLm of state.currentFaceLandmarks) {
                    drawMagicFace(ctx, faceLm, w, h);
                }
            }

            // Hand effects
            if (state.currentLandmarks && state.currentLandmarks.length > 0) {
                for (let i = 0; i < state.currentLandmarks.length; i++) {
                    const lm = state.currentLandmarks[i];
                    const handLabel = (state.overlayData && state.overlayData.handedness && state.overlayData.handedness[i])
                        ? (state.overlayData.handedness[i].includes('Left') ? 'Left' : 'Right')
                        : 'Right';
                    drawMagicHand(ctx, lm, i, handLabel, w, h);
                }
            }

            // Particles
            updateAndDrawParticles(ctx);

            ctx.restore(); // Un-mirror for HUD text (text should read normally)

            // HUD text (not mirrored so it reads correctly)
            drawMagicHUD(ctx, w, h);
        }

        // 6. Send frame to server (throttled)
        if (state.isTracking && state.socket && state.socket.connected) {
            if (now - lastSend >= SEND_INTERVAL) {
                lastSend = now;
                sendFrameToServer();
            }
        }

        requestAnimationFrame(loop);
    }

    requestAnimationFrame(loop);
}

function interpolateLandmarks() {
    const lerp = state.lerpFactor;

    if (state.targetLandmarks && state.currentLandmarks) {
        for (let h = 0; h < state.currentLandmarks.length && h < state.targetLandmarks.length; h++) {
            const curr = state.currentLandmarks[h];
            const targ = state.targetLandmarks[h];
            for (let i = 0; i < curr.length && i < targ.length; i++) {
                curr[i][0] += (targ[i][0] - curr[i][0]) * lerp;
                curr[i][1] += (targ[i][1] - curr[i][1]) * lerp;
            }
        }
    } else if (state.targetLandmarks) {
        state.currentLandmarks = JSON.parse(JSON.stringify(state.targetLandmarks));
    }

    if (state.targetFaceLandmarks && state.currentFaceLandmarks) {
        for (let f = 0; f < state.currentFaceLandmarks.length && f < state.targetFaceLandmarks.length; f++) {
            const curr = state.currentFaceLandmarks[f];
            const targ = state.targetFaceLandmarks[f];
            for (let i = 0; i < curr.length && i < targ.length; i++) {
                curr[i][0] += (targ[i][0] - curr[i][0]) * lerp;
                curr[i][1] += (targ[i][1] - curr[i][1]) * lerp;
            }
        }
    } else if (state.targetFaceLandmarks) {
        state.currentFaceLandmarks = JSON.parse(JSON.stringify(state.targetFaceLandmarks));
    }

    // Fade out if no target
    if (!state.targetLandmarks && state.currentLandmarks) {
        state.currentLandmarks = null;
        state.trailHistory = [];
    }
    if (!state.targetFaceLandmarks && state.currentFaceLandmarks) {
        state.currentFaceLandmarks = null;
    }
}

function rainbowColor(hueOffset, sat, val) {
    const h = (state.rainbowHue + hueOffset) % 360;
    const s = sat || 100;
    const v = val || 100;
    const c = v * s / 100;
    const x = c * (1 - Math.abs((h / 60) % 2 - 1));
    const m = v - c;
    let r, g, b;
    if (h < 60) { r = c; g = x; b = 0; }
    else if (h < 120) { r = x; g = c; b = 0; }
    else if (h < 180) { r = 0; g = c; b = x; }
    else if (h < 240) { r = 0; g = x; b = c; }
    else if (h < 300) { r = x; g = 0; b = c; }
    else { r = c; g = 0; b = x; }
    return `rgb(${Math.round((r + m) * 2.55)},${Math.round((g + m) * 2.55)},${Math.round((b + m) * 2.55)})`;
}

/**
 * DRAW MAGIC HAND - Correct skeleton + rainbow trails + glow
 */
function drawMagicHand(ctx, lm, handIdx, handLabel, w, h) {
    if (!lm || lm.length < 21) return;

    const baseHue = handLabel === 'Left' ? 320 : 180;

    // Correct MediaPipe hand connections
    const connections = [
        [0,1],[1,2],[2,3],[3,4],           // Thumb
        [0,5],[5,6],[6,7],[7,8],           // Index
        [0,9],[9,10],[10,11],[11,12],      // Middle
        [0,13],[13,14],[14,15],[15,16],    // Ring
        [0,17],[17,18],[18,19],[19,20],    // Pinky
        [5,9],[9,13],[13,17]               // Palm
    ];

    // Calculate hand center for aura
    let cx = 0, cy = 0;
    for (const p of lm) { cx += p[0]; cy += p[1]; }
    cx /= lm.length;
    cy /= lm.length;

    // 1. Hand Aura - pulsing circle
    const auraRadius = 70 + Math.sin(state.auraPulse + handIdx * 2) * 15;
    ctx.save();
    ctx.strokeStyle = rainbowColor(baseHue, 70, 80);
    ctx.lineWidth = 2;
    ctx.shadowColor = rainbowColor(baseHue, 100, 100);
    ctx.shadowBlur = 25;
    ctx.beginPath();
    ctx.arc(cx, cy, auraRadius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // 2. Draw skeleton connections (neon rainbow lines)
    for (const [start, end] of connections) {
        if (start >= lm.length || end >= lm.length) continue;
        const x1 = lm[start][0], y1 = lm[start][1];
        const x2 = lm[end][0], y2 = lm[end][1];

        ctx.save();
        ctx.strokeStyle = rainbowColor(baseHue + start * 15, 85, 90);
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.shadowColor = rainbowColor(baseHue + start * 15, 100, 100);
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        ctx.restore();
    }

    // 3. Draw landmark points (glowing dots)
    for (let i = 0; i < lm.length; i++) {
        const x = lm[i][0], y = lm[i][1];
        const color = rainbowColor(baseHue + i * 17, 100, 100);

        // Outer glow
        ctx.save();
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 18;
        ctx.beginPath();
        ctx.arc(x, y, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // White core
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Spawn particles at fingertips
        if ([4, 8, 12, 16, 20].includes(i)) {
            spawnParticles(x, y, color, 1);
        }
    }

    // 4. Finger laser beams
    const tips = [4, 8, 12, 16, 20];
    const bases = [3, 7, 11, 15, 19];
    for (let i = 0; i < tips.length; i++) {
        const tip = tips[i];
        const base = bases[i];
        if (tip >= lm.length || base >= lm.length) continue;

        const x1 = lm[base][0], y1 = lm[base][1];
        const x2 = lm[tip][0], y2 = lm[tip][1];
        const dx = x2 - x1;
        const dy = y2 - y1;
        const len = Math.sqrt(dx*dx + dy*dy) + 0.001;
        const bx = x2 + (dx / len) * 50;
        const by = y2 + (dy / len) * 50;

        ctx.save();
        ctx.strokeStyle = 'rgba(255,255,255,0.9)';
        ctx.lineWidth = 2;
        ctx.shadowColor = rainbowColor(baseHue + tip * 20, 100, 100);
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.moveTo(x2, y2);
        ctx.lineTo(bx, by);
        ctx.stroke();
        ctx.restore();
    }

    // 5. Light trails
    updateTrails(handIdx, lm);
    drawTrails(ctx, handIdx, baseHue);
}

function updateTrails(handIdx, lm) {
    const tips = [4, 8, 12, 16, 20];
    for (let i = 0; i < tips.length; i++) {
        const idx = tips[i];
        if (idx >= lm.length) continue;
        state.trailHistory.push({
            handIdx: handIdx,
            tipIdx: i,
            x: lm[idx][0],
            y: lm[idx][1],
            age: 1.0
        });
    }
    // Keep only recent trails (max 150)
    state.trailHistory = state.trailHistory.filter(t => {
        t.age -= 0.035;
        return t.age > 0;
    });
    if (state.trailHistory.length > 150) {
        state.trailHistory = state.trailHistory.slice(-150);
    }
}

function drawTrails(ctx, handIdx, baseHue) {
    const trails = state.trailHistory.filter(t => t.handIdx === handIdx);
    if (trails.length < 2) return;

    for (let i = 1; i < trails.length; i++) {
        const t1 = trails[i - 1];
        const t2 = trails[i];
        if (t1.tipIdx !== t2.tipIdx) continue;

        const alpha = t2.age * 0.7;
        const color = rainbowColor(baseHue + t2.tipIdx * 40, 100, 100);

        ctx.save();
        ctx.strokeStyle = color.replace('rgb', 'rgba').replace(')', `,${alpha})`);
        ctx.lineWidth = 5 * t2.age;
        ctx.lineCap = 'round';
        ctx.shadowColor = color;
        ctx.shadowBlur = 10 * t2.age;
        ctx.beginPath();
        ctx.moveTo(t1.x, t1.y);
        ctx.lineTo(t2.x, t2.y);
        ctx.stroke();
        ctx.restore();
    }
}

function spawnParticles(x, y, color, count) {
    for (let i = 0; i < count; i++) {
        state.particles.push({
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 5,
            vy: (Math.random() - 0.5) * 5 - 1,
            life: 1.0,
            decay: 0.025 + Math.random() * 0.02,
            color: color,
            size: 2 + Math.random() * 3
        });
    }
}

function updateAndDrawParticles(ctx) {
    const alive = [];
    for (const p of state.particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.1;
        p.life -= p.decay;

        if (p.life > 0) {
            const alpha = p.life;
            ctx.save();
            ctx.fillStyle = p.color.replace('rgb', 'rgba').replace(')', `,${alpha})`);
            ctx.shadowColor = p.color;
            ctx.shadowBlur = 8 * alpha;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
            alive.push(p);
        }
    }
    state.particles = alive;
}

/**
 * DRAW MAGIC FACE - Holographic scan box + key points
 */
function drawMagicFace(ctx, faceLm, w, h) {
    if (!faceLm || faceLm.length < 468) return;

    const xs = faceLm.map(p => p[0]);
    const ys = faceLm.map(p => p[1]);
    const xMin = Math.min(...xs) - 15;
    const yMin = Math.min(...ys) - 15;
    const xMax = Math.max(...xs) + 15;
    const yMax = Math.max(...ys) + 15;

    // Hologram bounding box
    ctx.save();
    ctx.strokeStyle = '#00ffff';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#00ffff';
    ctx.shadowBlur = 15;
    ctx.strokeRect(xMin, yMin, xMax - xMin, yMax - yMin);
    ctx.restore();

    // Animated scan line
    const scanY = yMin + ((state.scanLineY / h) * (yMax - yMin)) % (yMax - yMin);
    ctx.save();
    ctx.strokeStyle = 'rgba(0,255,255,0.7)';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#00ffff';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.moveTo(xMin, scanY);
    ctx.lineTo(xMax, scanY);
    ctx.stroke();
    ctx.restore();

    // Key face landmarks with glow
    const keyPoints = [33, 133, 362, 263, 1, 2, 0, 61, 291, 13, 14, 152, 468, 473];
    ctx.save();
    for (const idx of keyPoints) {
        if (idx >= faceLm.length) continue;
        const x = faceLm[idx][0];
        const y = faceLm[idx][1];
        const color = rainbowColor(idx * 8, 90, 90);
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();

    // Eye mesh (subtle)
    const eyeLines = [
        [33,7],[7,163],[163,144],[144,145],[145,153],[153,154],[154,155],[155,133],
        [263,249],[249,390],[390,373],[373,374],[374,380],[380,381],[381,382],[382,362]
    ];
    ctx.save();
    ctx.strokeStyle = 'rgba(255,100,200,0.3)';
    ctx.lineWidth = 1;
    for (const [a, b] of eyeLines) {
        if (a < faceLm.length && b < faceLm.length) {
            ctx.beginPath();
            ctx.moveTo(faceLm[a][0], faceLm[a][1]);
            ctx.lineTo(faceLm[b][0], faceLm[b][1]);
            ctx.stroke();
        }
    }
    ctx.restore();

    // Mouth outline
    const mouthLines = [
        [61,185],[185,40],[40,39],[39,37],[37,0],[0,267],[267,269],[269,270],[270,409],[409,291]
    ];
    ctx.save();
    ctx.strokeStyle = 'rgba(255,200,50,0.3)';
    ctx.lineWidth = 1;
    for (const [a, b] of mouthLines) {
        if (a < faceLm.length && b < faceLm.length) {
            ctx.beginPath();
            ctx.moveTo(faceLm[a][0], faceLm[a][1]);
            ctx.lineTo(faceLm[b][0], faceLm[b][1]);
            ctx.stroke();
        }
    }
    ctx.restore();
}

/**
 * MAGIC HUD - Futuristic info overlay
 */
function drawMagicHUD(ctx, w, h) {
    const data = state.overlayData;
    if (!data) return;

    ctx.save();

    // Top-left info panel background
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(0, 0, 260, 125);

    ctx.font = 'bold 15px Orbitron, Rajdhani, monospace';
    ctx.textBaseline = 'top';

    const lines = [
        { text: 'HANDS: ' + (data.hands_count || 0), color: '#00ff88', y: 12 },
        { text: 'FACES: ' + (data.faces_count || 0), color: '#64c8ff', y: 37 },
        { text: 'GESTURE: ' + (data.gesture || 'None'), color: '#ffea00', y: 62 },
        { text: 'SMILE: ' + (data.smile_status || 'Neutral'), color: '#ff64c8', y: 87 }
    ];

    for (const line of lines) {
        ctx.fillStyle = line.color;
        ctx.shadowColor = line.color;
        ctx.shadowBlur = 8;
        ctx.fillText(line.text, 15, line.y);
    }

    ctx.shadowBlur = 0;
    ctx.restore();

    // Corner cyber brackets
    ctx.save();
    ctx.strokeStyle = '#00ffff';
    ctx.lineWidth = 2;
    const cl = 35;
    ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(cl,0); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(0,cl); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(w-cl,0); ctx.lineTo(w,0); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(w,0); ctx.lineTo(w,cl); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0,h-cl); ctx.lineTo(0,h); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0,h); ctx.lineTo(cl,h); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(w-cl,h); ctx.lineTo(w,h); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(w,h-cl); ctx.lineTo(w,h); ctx.stroke();
    ctx.restore();

    // Bottom status bar
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, h - 30, w, 30);
    ctx.font = '13px Orbitron, Rajdhani, monospace';
    ctx.fillStyle = '#00ffff';
    ctx.shadowColor = '#00ffff';
    ctx.shadowBlur = 6;
    ctx.fillText('Hands Tracker | MediaPipe Active | ' + (data.smile_status || 'Neutral'), 15, h - 22);
    ctx.shadowBlur = 0;
    ctx.restore();
}

function sendFrameToServer() {
    try {
        const w = elements.canvas.width;
        const h = elements.canvas.height;
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = w;
        tempCanvas.height = h;
        const tempCtx = tempCanvas.getContext('2d');
        // Send un-mirrored frame to server (MediaPipe expects normal orientation)
        tempCtx.drawImage(elements.video, 0, 0, w, h);
        const frameData = tempCanvas.toDataURL('image/jpeg', 0.5);
        state.socket.emit('frame', { image: frameData });
        state.frameCount++;
    } catch (e) {
        // Silent fail
    }
}

function updateDashboard(data) {
    elements.fpsBadge.textContent = Math.round(data.fps || 0) + ' FPS';
    elements.statFps.textContent = Math.round(data.fps || 0);
    elements.statHands.textContent = data.hands_count || 0;
    elements.statFaces.textContent = data.faces_count || 0;
    elements.statFingers.textContent = data.finger_count || 0;

    updateGesture(data.gesture, data.confidence);
    updateSmile(data.smile_status);

    elements.handednessValue.textContent = data.handedness && data.handedness.length > 0
        ? data.handedness.join(', ')
        : 'None';
    elements.pinchValue.textContent = (data.pinch_distance || 0) + ' px';
    elements.accuracyValue.textContent = Math.round((data.confidence || 0) * 100) + '%';
    elements.framesProcessed.textContent = state.frameCount;
}

function updateGesture(gesture, confidence) {
    if (!gesture || gesture === 'None') {
        elements.gestureName.textContent = 'No Gesture';
        elements.gestureConfidence.textContent = 'Confidence: 0%';
        elements.gestureIcon.innerHTML = '<i class="fas fa-hand-paper"></i>';
        return;
    }

    elements.gestureName.textContent = gesture;
    elements.gestureConfidence.textContent = 'Confidence: ' + Math.round((confidence || 0) * 100) + '%';

    const iconMap = {
        'Open Palm': 'fa-hand-paper',
        'Closed Fist': 'fa-hand-rock',
        'Peace Sign': 'fa-hand-peace',
        'Thumbs Up': 'fa-thumbs-up',
        'Pointing Finger': 'fa-hand-point-up',
        'Rock Gesture': 'fa-hand-horns',
        'Victory Gesture': 'fa-hand-peace',
        'Pinch': 'fa-hand-pointer'
    };

    const iconClass = iconMap[gesture] || 'fa-hand-paper';
    elements.gestureIcon.innerHTML = '<i class="fas ' + iconClass + '"></i>';

    if (gesture !== 'None') {
        const timestamp = new Date().toLocaleTimeString();
        const historyItem = document.createElement('div');
        historyItem.className = 'history-item';
        historyItem.innerHTML = '<span>' + gesture + '</span><span>' + timestamp + '</span>';
        elements.gestureHistory.insertBefore(historyItem, elements.gestureHistory.firstChild);

        while (elements.gestureHistory.children.length > 10) {
            elements.gestureHistory.removeChild(elements.gestureHistory.lastChild);
        }

        state.totalGestures++;
        elements.totalGestures.textContent = state.totalGestures;
    }
}

function updateSmile(status) {
    status = status || 'Neutral';
    elements.smileStatus.textContent = status;
    elements.smileStatus.className = 'status-value ' + status.toLowerCase().replace(' ', '-');

    const faceMap = {
        'Smiling': 'fa-smile-beam',
        'Neutral': 'fa-meh',
        'Not Smiling': 'fa-frown'
    };

    const faceClass = faceMap[status] || 'fa-meh';
    elements.smileFace.innerHTML = '<i class="fas ' + faceClass + '"></i>';
    elements.smileFace.className = 'smile-face ' + status.toLowerCase().replace(' ', '-');

    let meterValue = 0;
    if (status === 'Smiling') meterValue = 100;
    else if (status === 'Neutral') meterValue = 50;
    else meterValue = 10;

    elements.smileMeter.style.width = meterValue + '%';

    if (status === 'Smiling') {
        state.smileEvents++;
        elements.smileEvents.textContent = state.smileEvents;
    }
}

function startSessionTimer() {
    setInterval(function() {
        if (state.sessionStart) {
            const elapsed = Math.floor((Date.now() - state.sessionStart) / 1000);
            const minutes = Math.floor(elapsed / 60).toString().padStart(2, '0');
            const seconds = (elapsed % 60).toString().padStart(2, '0');
            elements.sessionDuration.textContent = minutes + ':' + seconds;
        }
    }, 1000);
}

function setupEventListeners() {
    if (elements.retryButton) {
        elements.retryButton.addEventListener('click', function() {
            initCamera();
        });
    }

    if (elements.toggleCamera) {
        elements.toggleCamera.addEventListener('click', function() {
            if (state.isTracking) {
                state.isTracking = false;
                if (state.socket) state.socket.emit('stop_tracking');
                elements.toggleCamera.innerHTML = '<i class="fas fa-video-slash"></i>';
                elements.liveBadge.style.opacity = '0.3';
            } else {
                state.isTracking = true;
                if (state.socket) state.socket.emit('start_tracking');
                elements.toggleCamera.innerHTML = '<i class="fas fa-video"></i>';
                elements.liveBadge.style.opacity = '1';
            }
        });
    }

    if (elements.toggleEffects) {
        elements.toggleEffects.addEventListener('click', function() {
            state.effectsEnabled = !state.effectsEnabled;
            elements.toggleEffects.innerHTML = state.effectsEnabled
                ? '<i class="fas fa-magic"></i>'
                : '<i class="fas fa-ban"></i>';
            elements.toggleEffects.style.color = state.effectsEnabled ? 'var(--primary)' : '#ff5f57';
        });
    }

    if (elements.fullscreenBtn) {
        elements.fullscreenBtn.addEventListener('click', function() {
            const container = document.querySelector('.camera-panel');
            if (!document.fullscreenElement) {
                container.requestFullscreen().catch(function(err) {
                    log('Fullscreen error: ' + err.message);
                });
            } else {
                document.exitFullscreen();
            }
        });
    }

    window.addEventListener('beforeunload', function() {
        if (state.stream) {
            state.stream.getTracks().forEach(function(track) { track.stop(); });
        }
        if (state.socket) {
            state.socket.disconnect();
        }
    });
}
