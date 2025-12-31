// SIGNAL ANALYZER - Tuner Mode
// AIDEV-NOTE: Handles frequency scanning, signal detection, and recording

class SignalAnalyzerTuner {
    constructor(analyzer) {
        this.analyzer = analyzer;
        
        // Tuner state
        this.frequency = 15.0;  // Current frequency in MHz
        this.signalStrength = 0;
        this.lockedSignal = null;
        
        // Recording state
        this.isRecording = false;
        this.recordingProgress = 0;
        this.recordingDuration = 10;  // seconds
        this.recordingStartTime = 0;
        
        // Animation
        this.dialAngle = 0;
        this.signalMeterValue = 0;
        this.noisePhase = 0;
        
        // Warning message
        this.warningMessage = null;
        this.warningTimer = 0;
    }
    
    init() {
        this.frequency = 15.0;
        this.signalStrength = 0;
        this.lockedSignal = null;
        this.isRecording = false;
        this.recordingProgress = 0;
        this.warningMessage = null;
        this.warningTimer = 0;
    }
    
    update(deltaTime) {
        this.noisePhase += deltaTime * 50;
        
        // Check for nearby signals
        const nearest = findNearestSignal(this.frequency);
        
        if (nearest && nearest.distance < SIGNAL_AUDIBLE_RANGE) {
            this.signalStrength = calculateSignalStrength(this.frequency, nearest.signal.freq);
            this.lockedSignal = nearest.signal;
            
            // Load signal audio if not already loaded
            if (this.analyzer.audio.currentSignal !== nearest.signal) {
                this.analyzer.audio.loadSignalForTuner(nearest.signal);
            }
        } else {
            this.signalStrength = 0;
            this.lockedSignal = null;
        }
        
        // Update audio mix
        this.analyzer.audio.updateTunerMix(this.signalStrength);
        
        // Update FFT data for waveform display
        this.analyzer.audio.updateFFT();
        
        // Smooth signal meter animation
        const targetMeter = this.signalStrength;
        this.signalMeterValue += (targetMeter - this.signalMeterValue) * deltaTime * 10;
        
        // Update recording progress
        if (this.isRecording) {
            this.analyzer.audio.updateRecording();
            this.recordingProgress = this.analyzer.audio.getRecordingProgress();
            
            // Check if recording finished (either max time or manually stopped)
            if (!this.analyzer.audio.isRecording && this.recordingProgress >= 1) {
                this.finishRecording();
            }
        }
        
        // Update dial animation
        const targetAngle = ((this.frequency - TUNER_MIN_FREQ) / (TUNER_MAX_FREQ - TUNER_MIN_FREQ)) * Math.PI * 1.5;
        this.dialAngle += (targetAngle - this.dialAngle) * deltaTime * 8;
        
        // Update warning timer
        if (this.warningTimer > 0) {
            this.warningTimer -= deltaTime;
            if (this.warningTimer <= 0) {
                this.warningMessage = null;
            }
        }
    }
    
    handleKey(key) {
        // R key toggles recording (must check before early return)
        if (key === 'r' || key === 'R') {
            if (this.isRecording) {
                this.stopRecording();
            } else if (this.signalStrength > 0.5) {
                this.startRecording();
            } else {
                // Signal too low - show warning
                this.warningMessage = 'SIGNAL LOW';
                this.warningTimer = 5;
            }
            return;
        }
        
        if (this.isRecording) {
            // Can't change frequency while recording
            return;
        }
        
        switch (key) {
            case 'ArrowUp':
                // Coarse tune up
                this.frequency = Math.min(this.frequency + TUNER_STEP_COARSE, TUNER_MAX_FREQ);
                break;
                
            case 'ArrowDown':
                // Coarse tune down
                this.frequency = Math.max(this.frequency - TUNER_STEP_COARSE, TUNER_MIN_FREQ);
                break;
                
            case 'ArrowRight':
                // Fine tune up
                this.frequency = Math.min(this.frequency + TUNER_STEP_FINE * 10, TUNER_MAX_FREQ);
                break;
                
            case 'ArrowLeft':
                // Fine tune down
                this.frequency = Math.max(this.frequency - TUNER_STEP_FINE * 10, TUNER_MIN_FREQ);
                break;
                
        }
    }
    
    startRecording() {
        if (this.isRecording) return;
        
        this.isRecording = true;
        this.recordingProgress = 0;
        this.recordingStartTime = performance.now();
        
        this.analyzer.audio.startRecording(this.recordingDuration);
    }
    
    stopRecording() {
        if (!this.isRecording) return;
        
        // Finalize the recording at current progress
        this.analyzer.audio.stopRecording();
        this.finishRecording();
    }
    
    finishRecording() {
        this.isRecording = false;
        
        // Switch to playback mode
        this.analyzer.switchToPlayback();
    }
    
    getSegments() {
        const segments = [];
        const drawText = (text, x, y, scale) => this.analyzer.drawTextToSegments(segments, text, x, y, scale);
        
        // Title
        drawText('SIGNAL TUNER', 0.38, 0.95);
        
        // Main frequency display (large)
        const freqStr = this.frequency.toFixed(3) + ' MHz';
        drawText(freqStr, 0.32, 0.75, 0.025);
        
        // Band indicator
        drawText('SHORTWAVE HF BAND', 0.32, 0.68);
        
        // Draw frequency dial
        this.drawDial(segments, 0.5, 0.45, 0.18);
        
        // Signal strength meter
        this.drawSignalMeter(segments, 0.78, 0.45, 0.12, 0.25);
        
        // Signal info
        if (this.lockedSignal) {
            drawText('SIGNAL: ' + this.lockedSignal.name, 0.06, 0.22);
            drawText('STRENGTH: ' + Math.round(this.signalStrength * 100) + '%', 0.06, 0.18);
        } else {
            drawText('NO SIGNAL DETECTED', 0.06, 0.22);
            drawText('ADJUST FREQUENCY', 0.06, 0.18);
        }
        
        // Recording status
        if (this.isRecording) {
            const pct = Math.round(this.recordingProgress * 100);
            drawText('RECORDING: ' + pct + '%', 0.06, 0.12);
            
            // Recording progress bar
            const barLeft = 0.06;
            const barRight = 0.35;
            const barY = 0.09;
            const barH = 0.02;
            
            segments.push([barLeft, barY, barRight, barY]);
            segments.push([barLeft, barY + barH, barRight, barY + barH]);
            segments.push([barLeft, barY, barLeft, barY + barH]);
            segments.push([barRight, barY, barRight, barY + barH]);
            
            const fillRight = barLeft + (barRight - barLeft) * this.recordingProgress;
            for (let x = barLeft + 0.005; x < fillRight; x += 0.008) {
                segments.push([x, barY + 0.003, x, barY + barH - 0.003]);
            }
        }
        
        // Draw real-time waveform (zoomed in)
        this.drawLiveWaveform(segments, 0.55, 0.12, 0.38, 0.16);
        
        // Controls
        const recordText = this.isRecording ? 'R:STOP REC' : 'R:RECORD';
        drawText('UP/DOWN:COARSE  L/R:FINE  ' + recordText + '  S:PLAYBACK', 0.06, 0.03);
        
        // Warning message (flashing)
        if (this.warningMessage && this.warningTimer > 0) {
            // Flash effect - visible for 0.3s, hidden for 0.2s
            const flashCycle = (this.warningTimer % 0.5);
            if (flashCycle > 0.2) {
                drawText(this.warningMessage, 0.42, 0.08);
            }
        }
        
        return segments;
    }
    
    drawDial(segments, cx, cy, radius) {
        // Draw dial arc
        const arcStart = -Math.PI * 0.75;
        const arcEnd = Math.PI * 0.75;
        const numPoints = 40;
        
        for (let i = 0; i < numPoints; i++) {
            const a1 = arcStart + (arcEnd - arcStart) * (i / numPoints);
            const a2 = arcStart + (arcEnd - arcStart) * ((i + 1) / numPoints);
            
            segments.push([
                cx + Math.cos(a1) * radius,
                cy + Math.sin(a1) * radius,
                cx + Math.cos(a2) * radius,
                cy + Math.sin(a2) * radius
            ]);
        }
        
        // Draw tick marks
        for (let freq = TUNER_MIN_FREQ; freq <= TUNER_MAX_FREQ; freq += 1) {
            const t = (freq - TUNER_MIN_FREQ) / (TUNER_MAX_FREQ - TUNER_MIN_FREQ);
            const angle = arcStart + (arcEnd - arcStart) * t;
            
            const isMajor = freq % 5 === 0;
            const tickLen = isMajor ? 0.025 : 0.012;
            
            const x1 = cx + Math.cos(angle) * (radius - tickLen);
            const y1 = cy + Math.sin(angle) * (radius - tickLen);
            const x2 = cx + Math.cos(angle) * radius;
            const y2 = cy + Math.sin(angle) * radius;
            
            segments.push([x1, y1, x2, y2]);
        }
        
        // Draw signal markers for available signals
        for (const signal of BROADCAST_SIGNALS) {
            if (!isSignalAvailable(signal)) continue;
            
            const t = (signal.freq - TUNER_MIN_FREQ) / (TUNER_MAX_FREQ - TUNER_MIN_FREQ);
            const angle = arcStart + (arcEnd - arcStart) * t;
            
            // Draw small triangle marker
            const markerDist = radius + 0.02;
            const mx = cx + Math.cos(angle) * markerDist;
            const my = cy + Math.sin(angle) * markerDist;
            
            const s = 0.015;
            segments.push([mx - s, my - s, mx + s, my - s]);
            segments.push([mx + s, my - s, mx, my + s]);
            segments.push([mx, my + s, mx - s, my - s]);
        }
        
        // Draw needle
        const needleAngle = arcStart + (arcEnd - arcStart) * 
            ((this.frequency - TUNER_MIN_FREQ) / (TUNER_MAX_FREQ - TUNER_MIN_FREQ));
        
        const needleLen = radius - 0.03;
        segments.push([
            cx,
            cy,
            cx + Math.cos(needleAngle) * needleLen,
            cy + Math.sin(needleAngle) * needleLen
        ]);
        
        // Needle hub
        const hubSize = 0.015;
        segments.push([cx - hubSize, cy, cx + hubSize, cy]);
        segments.push([cx, cy - hubSize, cx, cy + hubSize]);
    }
    
    drawSignalMeter(segments, cx, cy, width, height) {
        const left = cx - width / 2;
        const right = cx + width / 2;
        const bottom = cy - height / 2;
        const top = cy + height / 2;
        
        // Border
        segments.push([left, bottom, right, bottom]);
        segments.push([left, top, right, top]);
        segments.push([left, bottom, left, top]);
        segments.push([right, bottom, right, top]);
        
        // Label
        this.analyzer.drawTextToSegments(segments, 'SIGNAL', cx - 0.04, top + 0.02, 0.008);
        
        // Meter bars
        const numBars = 10;
        const barWidth = (width - 0.02) / numBars;
        const filledBars = Math.floor(this.signalMeterValue * numBars);
        
        for (let i = 0; i < numBars; i++) {
            const x = left + 0.01 + i * barWidth;
            const barH = height - 0.04;
            
            if (i < filledBars) {
                // Filled bar
                segments.push([x, bottom + 0.02, x, bottom + 0.02 + barH]);
                segments.push([x + barWidth * 0.6, bottom + 0.02, x + barWidth * 0.6, bottom + 0.02 + barH]);
                segments.push([x, bottom + 0.02, x + barWidth * 0.6, bottom + 0.02]);
                segments.push([x, bottom + 0.02 + barH, x + barWidth * 0.6, bottom + 0.02 + barH]);
            } else {
                // Empty bar (just outline)
                segments.push([x, bottom + 0.02, x + barWidth * 0.6, bottom + 0.02]);
            }
        }
    }
    
    drawLiveWaveform(segments, x, y, width, height) {
        // Border
        segments.push([x, y, x + width, y]);
        segments.push([x, y + height, x + width, y + height]);
        segments.push([x, y, x, y + height]);
        segments.push([x + width, y, x + width, y + height]);
        
        // Center line
        const centerY = y + height / 2;
        segments.push([x, centerY, x + width, centerY]);
        
        // Draw time domain waveform
        const timeData = this.analyzer.audio.timeDomainData;
        if (!timeData) return;
        
        const numPoints = 100;
        const step = Math.floor(timeData.length / numPoints);
        
        let prevX = x;
        let prevY = centerY;
        
        for (let i = 0; i < numPoints; i++) {
            const sample = (timeData[i * step] - 128) / 128;
            const px = x + (i / numPoints) * width;
            const py = centerY + sample * (height / 2) * 0.8;
            
            if (i > 0) {
                segments.push([prevX, prevY, px, py]);
            }
            
            prevX = px;
            prevY = py;
        }
    }
}

