class DanceToDebug {
    constructor() {
        this.video = null;
        this.canvas = null;
        this.ctx = null;
        this.pose = null;
        this.camera = null;
        this.isDanceVerified = false;
        this.danceStartTime = null;
        this.danceProgress = 0;
        
        this.init();
    }
    
    async init() {
        this.setupDOM();
        await this.initializeCamera();
        this.initializePoseDetection();
        this.setupEventListeners();
    }
    
    setupDOM() {
        // Create main layout elements
        document.body.innerHTML = `
            <div class="container">
                <h1>🕺 Dance to Debug 💃</h1>
                <div class="main-content">
                    <div class="dance-section">
                        <h2>🎥 Dance Zone</h2>
                        <div class="video-container">
                            <video id="webcam" autoplay muted playsinline></video>
                            <canvas id="overlay"></canvas>
                        </div>
                        <div class="dance-status" id="dance-status">Ready to dance!</div>
                        <div class="dance-progress">
                            <div class="dance-progress-bar" id="progress-bar"></div>
                        </div>
                        <button id="start-camera">Start Camera</button>
                    </div>
                    <div class="code-section">
                        <div id="editor-container"></div>
                        <button id="run-code" disabled>Dance First!</button>
                        <div id="output"></div>
                    </div>
                </div>
            </div>
        `;
        
        this.video = document.getElementById('webcam');
        this.canvas = document.getElementById('overlay');
        this.ctx = this.canvas.getContext('2d');
    }
}

//camera initialzation

async initializeCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: {
                width: { ideal: 640 },
                height: { ideal: 480 },
                frameRate: { ideal: 30 }
            }
        });
        
        this.video.srcObject = stream;
        this.video.onloadedmetadata = () => {
            this.canvas.width = this.video.videoWidth;
            this.canvas.height = this.video.videoHeight;
        };
        
        this.updateStatus('Camera ready! Start dancing! 💃');
        
    } catch (error) {
        console.error('Camera access failed:', error);
        this.updateStatus('❌ Camera access required');
        this.showFallbackOptions();
    }
}

// MediaPipe Pose Setup

initializePoseDetection() {
    this.pose = new Pose({
        locateFile: (file) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
        }
    });
    
    this.pose.setOptions({
        modelComplexity: 1,
        smoothSegmentation: true,
        enableSegmentation: false,
        smoothLandmarks: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
    });
    
    this.pose.onResults(this.onPoseResults.bind(this));
    
    // Start camera processing
    this.startPoseDetection();
}

startPoseDetection() {
    if (!this.video.srcObject) return;
    
    const detectPose = async () => {
        if (this.video.readyState >= 2) {
            await this.pose.send({ image: this.video });
        }
        requestAnimationFrame(detectPose);
    };
    
    detectPose();
}

//Dance Movement Detection

onPoseResults(results) {
    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    if (results.poseLandmarks) {
        // Draw pose landmarks
        this.drawPose(results.poseLandmarks);
        
        // Analyze dance movement
        this.analyzeDanceMovement(results.poseLandmarks);
    }
}

analyzeDanceMovement(landmarks) {
    if (!this.previousPose) {
        this.previousPose = landmarks;
        return;
    }
    
    // Calculate movement intensity
    const movement = this.calculateMovementScore(landmarks);
    
    // Dance detection logic
    if (movement > this.MOVEMENT_THRESHOLD) {
        if (!this.danceStartTime) {
            this.startDanceTimer();
        }
        this.updateDanceProgress(movement);
    } else {
        this.resetDanceIfNeeded();
    }
    
    this.previousPose = landmarks;
}

calculateMovementScore(landmarks) {
    let totalMovement = 0;
    const keyPoints = [11, 12, 13, 14, 15, 16]; // Arms and shoulders
    
    keyPoints.forEach(i => {
        if (landmarks[i] && this.previousPose[i]) {
            const dx = landmarks[i].x - this.previousPose[i].x;
            const dy = landmarks[i].y - this.previousPose[i].y;
            totalMovement += Math.sqrt(dx * dx + dy * dy);
        }
    });
    
    return totalMovement * 1000; // Scale for easier thresholding
}

// Monaco Editor Setup

initializeCodeEditor() {
    require.config({ 
        paths: { 'vs': 'https://cdn.jsdelivr.net/npm/monaco-editor@0.34.0/min/vs' }
    });
    
    require(['vs/editor/editor.main'], () => {
        this.editor = monaco.editor.create(
            document.getElementById('editor-container'), {
                value: this.getDefaultCode(),
                language: 'javascript',
                theme: 'vs-dark',
                fontSize: 14,
                readOnly: true,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                automaticLayout: true
            }
        );
    });
}

getDefaultCode() {
    return `// Welcome to Dance to Debug! 🕺💃
// You must dance before you can code!

function celebrateDance() {
    console.log("🎉 You danced! Now you can code!");
    console.log("Dance level: EPIC! 💃🕺");
    
    // Your code here...
    for (let i = 1; i <= 5; i++) {
        console.log(\`Step \${i}: Keep dancing! 💃\`);
    }
    
    return "Happy coding! 🚀";
}

celebrateDance();`;
}

// Code Execution System

executeCode() {
    if (!this.isDanceVerified) {
        this.showDanceRequiredAlert();
        return;
    }
    
    const code = this.editor.getValue();
    const output = document.getElementById('output');
    
    try {
        // Capture console output
        const logs = [];
        const originalLog = console.log;
        console.log = (...args) => {
            logs.push(args.join(' '));
            originalLog.apply(console, args);
        };
        
        // Execute code
        const result = eval(code);
        console.log = originalLog;
        
        // Display output
        const outputHTML = logs.length > 0 ? 
            logs.map(log => `<div>${log}</div>`).join('') : 
            '<div>Code executed successfully!</div>';
            
        output.innerHTML = `
            <div class="success-output">
                ${outputHTML}
                ${result !== undefined ? `<div class="return-value">Returned: ${result}</div>` : ''}
            </div>
        `;
        
        // Reset dance requirement after execution
        setTimeout(() => this.resetDanceRequirement(), 5000);
        
    } catch (error) {
        output.innerHTML = `
            <div class="error-output">
                ❌ Error: ${error.message}
                <br><small>Even dancers make coding mistakes! 💃</small>
            </div>
        `;
    }
}

// Dance Timer & Verification


startDanceTimer() {
    this.danceStartTime = Date.now();
    this.updateStatus('Keep dancing! 🕺💃', true);
    this.DANCE_DURATION = 3000; // 3 seconds of dancing required
}

updateDanceProgress(movementScore) {
    const elapsed = Date.now() - this.danceStartTime;
    const progress = Math.min((elapsed / this.DANCE_DURATION) * 100, 100);
    
    this.setProgressBar(progress);
    
    if (elapsed >= this.DANCE_DURATION && movementScore > this.MOVEMENT_THRESHOLD) {
        this.verifyDance();
    }
}

verifyDance() {
    this.isDanceVerified = true;
    this.danceStartTime = null;
    
    this.updateStatus('✅ Dance verified! Code unlocked! 🎉');
    this.setProgressBar(100);
    this.unlockCodeEditor();
    
    // Add celebration effects
    this.addCelebrationEffects();
}

unlockCodeEditor() {
    if (this.editor) {
        this.editor.updateOptions({ readOnly: false });
    }
    
    const runButton = document.getElementById('run-code');
    runButton.disabled = false;
    runButton.textContent = '🚀 Run Code';
    runButton.classList.add('unlocked');
}
