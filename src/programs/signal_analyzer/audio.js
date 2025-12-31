// SIGNAL ANALYZER - Audio System
// AIDEV-NOTE: Handles Web Audio API, noise generation, recording, signal mixing

class SignalAnalyzerAudio {
    constructor() {
        this.audioContext = null;
        this.analyser = null;
        this.masterGain = null;
        
        // Noise generation
        this.noiseSource = null;
        this.noiseGain = null;
        this.noiseBuffer = null;
        
        // Signal playback
        this.signalSource = null;
        this.signalGain = null;
        this.signalBuffer = null;
        
        // Recording
        this.isRecording = false;
        this.recordingBuffer = null;
        this.recordingStartTime = 0;
        this.recordingDuration = 10;
        this.recordedBuffer = null;
        this.recordingSampleIndex = 0;
        this.recordingSignalOffset = 0;
        
        // Signal playback tracking for global time sync
        this.signalPlaybackStartTime = 0;
        this.signalPlaybackOffset = 0;
        
        // Playback of recorded signal
        this.playbackSource = null;
        this.isPlaying = false;
        this.playbackStartTime = 0;
        this.pauseOffset = 0;
        
        // FFT data arrays
        this.fftSize = 2048;
        this.frequencyData = null;
        this.timeDomainData = null;
        this.sampleRate = 44100;
        
        // Current signal info
        this.currentSignal = null;
        this.signalStrength = 0;
        
        // Global song time tracking - simulates radio stations playing continuously
        // Key: signal name, Value: { startTime: timestamp when we "started" tracking }
        this.globalSongTimes = {};
        this.globalReferenceTime = Date.now();  // Reference point for all songs
    }
    
    async init() {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.sampleRate = this.audioContext.sampleRate;
        
        // Create analyser for visualization
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = this.fftSize;
        this.analyser.smoothingTimeConstant = 0.3;
        
        // Allocate FFT data arrays
        const bufferLength = this.analyser.frequencyBinCount;
        this.frequencyData = new Uint8Array(bufferLength);
        this.timeDomainData = new Uint8Array(this.fftSize);
        
        // Master gain for output
        this.masterGain = this.audioContext.createGain();
        this.masterGain.gain.value = 0.5;
        this.masterGain.connect(this.analyser);
        this.analyser.connect(this.audioContext.destination);
        
        // Create noise gain node
        this.noiseGain = this.audioContext.createGain();
        this.noiseGain.connect(this.masterGain);
        
        // Create signal gain node
        this.signalGain = this.audioContext.createGain();
        this.signalGain.connect(this.masterGain);
        
        // Generate and start continuous noise
        await this.createNoiseBuffer();
        this.startNoise();
    }
    
    async createNoiseBuffer() {
        // Create 2 seconds of white noise (will loop)
        const duration = 2;
        const numSamples = Math.floor(duration * this.sampleRate);
        this.noiseBuffer = this.audioContext.createBuffer(1, numSamples, this.sampleRate);
        const channelData = this.noiseBuffer.getChannelData(0);
        
        for (let i = 0; i < numSamples; i++) {
            channelData[i] = (Math.random() - 0.5) * 2;
        }
    }
    
    startNoise() {
        if (this.noiseSource) {
            this.noiseSource.stop();
            this.noiseSource.disconnect();
        }
        
        this.noiseSource = this.audioContext.createBufferSource();
        this.noiseSource.buffer = this.noiseBuffer;
        this.noiseSource.loop = true;
        this.noiseSource.connect(this.noiseGain);
        this.noiseSource.start();
    }
    
    stopNoise() {
        if (this.noiseSource) {
            this.noiseSource.stop();
            this.noiseSource.disconnect();
            this.noiseSource = null;
        }
    }
    
    // Update the mix between noise and signal based on tuner position
    updateTunerMix(signalStrength) {
        this.signalStrength = signalStrength;
        
        // Crossfade: more signal strength = less noise, more signal
        // At 100% signal, noise drops to near zero
        const noiseLevel = 0.25 * (1 - signalStrength);
        const signalLevel = signalStrength;
        
        this.noiseGain.gain.setTargetAtTime(noiseLevel, this.audioContext.currentTime, 0.05);
        this.signalGain.gain.setTargetAtTime(signalLevel, this.audioContext.currentTime, 0.05);
    }
    
    // Load a signal file for the tuner
    async loadSignalForTuner(signal) {
        if (this.signalSource) {
            this.signalSource.stop();
            this.signalSource.disconnect();
            this.signalSource = null;
        }
        
        this.currentSignal = signal;
        this.signalBuffer = null;
        
        try {
            const response = await fetch(signal.file);
            if (!response.ok) throw new Error('File not found');
            const arrayBuffer = await response.arrayBuffer();
            this.signalBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
        } catch (err) {
            console.warn('Could not load signal file, generating:', err.message);
            this.signalBuffer = this.generateSignalBuffer(signal);
        }
        
        // Start playing the signal at the correct global position
        this.startSignalAtGlobalTime();
    }
    
    // Calculate where in the song we should be based on global time
    getGlobalSongOffset(signalName, duration) {
        // Time elapsed since our global reference point (in seconds)
        const elapsedSeconds = (Date.now() - this.globalReferenceTime) / 1000;
        
        // Where in the song we should be (looping)
        return elapsedSeconds % duration;
    }
    
    // Generate a test signal buffer with notch pattern
    generateSignalBuffer(signal) {
        // Pattern timing (in seconds)
        const beepDuration = 0.4;
        const gapDuration = 0.15;
        const pauseDuration = 0.5;
        
        const patternLength = (beepDuration * 3) + (gapDuration * 2) + pauseDuration;
        const duration = patternLength * 2;
        const numSamples = Math.floor(duration * this.sampleRate);
        
        const buffer = this.audioContext.createBuffer(1, numSamples, this.sampleRate);
        const channelData = buffer.getChannelData(0);
        
        // Notch frequencies for each beep
        const notch1 = 5000;
        const notch2 = 15000;
        const notch3 = 10000;
        
        const beep1Start = 0;
        const beep1End = beepDuration;
        const beep2Start = beep1End + gapDuration;
        const beep2End = beep2Start + beepDuration;
        const beep3Start = beep2End + gapDuration;
        const beep3End = beep3Start + beepDuration;
        
        // Pre-generate white noise
        const noiseBuffer = new Float32Array(numSamples);
        for (let i = 0; i < numSamples; i++) {
            noiseBuffer[i] = (Math.random() - 0.5) * 2;
        }
        
        const applyNotch = (startSample, endSample, notchFreq) => {
            const notchBandwidth = 4000;
            const Q = notchFreq / notchBandwidth;
            const w0 = 2 * Math.PI * notchFreq / this.sampleRate;
            const alpha = Math.sin(w0) / (2 * Q);
            
            const b0 = 1;
            const b1 = -2 * Math.cos(w0);
            const b2 = 1;
            const a0 = 1 + alpha;
            const a1 = -2 * Math.cos(w0);
            const a2 = 1 - alpha;
            
            const b0n = b0 / a0;
            const b1n = b1 / a0;
            const b2n = b2 / a0;
            const a1n = a1 / a0;
            const a2n = a2 / a0;
            
            // Three-pass filter for deep notch
            let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
            const temp1 = new Float32Array(endSample - startSample);
            const temp2 = new Float32Array(endSample - startSample);
            
            for (let i = startSample; i < endSample; i++) {
                const x0 = noiseBuffer[i];
                const y0 = b0n * x0 + b1n * x1 + b2n * x2 - a1n * y1 - a2n * y2;
                temp1[i - startSample] = y0;
                x2 = x1; x1 = x0;
                y2 = y1; y1 = y0;
            }
            
            x1 = 0; x2 = 0; y1 = 0; y2 = 0;
            for (let i = 0; i < temp1.length; i++) {
                const x0 = temp1[i];
                const y0 = b0n * x0 + b1n * x1 + b2n * x2 - a1n * y1 - a2n * y2;
                temp2[i] = y0;
                x2 = x1; x1 = x0;
                y2 = y1; y1 = y0;
            }
            
            x1 = 0; x2 = 0; y1 = 0; y2 = 0;
            for (let i = 0; i < temp2.length; i++) {
                const x0 = temp2[i];
                const y0 = b0n * x0 + b1n * x1 + b2n * x2 - a1n * y1 - a2n * y2;
                
                const progress = i / temp2.length;
                let envelope = 1.0;
                if (progress < 0.02) envelope = progress / 0.02;
                else if (progress > 0.98) envelope = (1.0 - progress) / 0.02;
                
                channelData[startSample + i] = y0 * 0.1 * envelope;
                x2 = x1; x1 = x0;
                y2 = y1; y1 = y0;
            }
        };
        
        // Initialize with silence
        for (let i = 0; i < numSamples; i++) {
            channelData[i] = 0;
        }
        
        // Process each pattern cycle
        for (let cycle = 0; cycle < 2; cycle++) {
            const offset = Math.floor(cycle * patternLength * this.sampleRate);
            
            const b1s = offset + Math.floor(beep1Start * this.sampleRate);
            const b1e = offset + Math.floor(beep1End * this.sampleRate);
            const b2s = offset + Math.floor(beep2Start * this.sampleRate);
            const b2e = offset + Math.floor(beep2End * this.sampleRate);
            const b3s = offset + Math.floor(beep3Start * this.sampleRate);
            const b3e = offset + Math.floor(beep3End * this.sampleRate);
            
            applyNotch(b1s, Math.min(b1e, numSamples), notch1);
            applyNotch(b2s, Math.min(b2e, numSamples), notch2);
            applyNotch(b3s, Math.min(b3e, numSamples), notch3);
        }
        
        return buffer;
    }
    
    startSignal() {
        if (!this.signalBuffer) return;
        
        if (this.signalSource) {
            this.signalSource.stop();
            this.signalSource.disconnect();
        }
        
        this.signalSource = this.audioContext.createBufferSource();
        this.signalSource.buffer = this.signalBuffer;
        this.signalSource.loop = true;
        this.signalSource.connect(this.signalGain);
        this.signalSource.start();
    }
    
    // Start signal at the correct position based on global time
    startSignalAtGlobalTime() {
        if (!this.signalBuffer) return;
        
        if (this.signalSource) {
            this.signalSource.stop();
            this.signalSource.disconnect();
        }
        
        const duration = this.signalBuffer.duration;
        const offset = this.getGlobalSongOffset(this.currentSignal.name, duration);
        
        // Track when this playback started for recording sync
        this.signalPlaybackStartTime = this.audioContext.currentTime;
        this.signalPlaybackOffset = offset;
        
        this.signalSource = this.audioContext.createBufferSource();
        this.signalSource.buffer = this.signalBuffer;
        this.signalSource.loop = true;
        this.signalSource.connect(this.signalGain);
        this.signalSource.start(0, offset);
    }
    
    // Get current position in the signal buffer (for recording)
    getCurrentSignalPosition() {
        if (!this.signalBuffer || !this.signalSource) return 0;
        
        const elapsed = this.audioContext.currentTime - this.signalPlaybackStartTime;
        const position = (this.signalPlaybackOffset + elapsed) % this.signalBuffer.duration;
        return position;
    }
    
    stopSignal() {
        if (this.signalSource) {
            this.signalSource.stop();
            this.signalSource.disconnect();
            this.signalSource = null;
        }
    }
    
    // Start recording from the current audio to a buffer
    startRecording(durationSeconds = 10) {
        if (this.isRecording) return;
        
        this.recordingDuration = durationSeconds;
        const numSamples = Math.floor(durationSeconds * this.sampleRate);
        this.recordingBuffer = this.audioContext.createBuffer(1, numSamples, this.sampleRate);
        this.recordingStartTime = this.audioContext.currentTime;
        this.recordingSampleIndex = 0;
        
        // Save the current position in the signal so recording captures the right part
        this.recordingSignalOffset = this.getCurrentSignalPosition();
        
        this.isRecording = true;
    }
    
    // Called each frame to capture audio incrementally
    updateRecording() {
        if (!this.isRecording) return;
        
        const elapsed = this.audioContext.currentTime - this.recordingStartTime;
        const targetSample = Math.floor(elapsed * this.sampleRate);
        const maxSamples = this.recordingBuffer.length;
        
        const channelData = this.recordingBuffer.getChannelData(0);
        const signalData = this.signalBuffer ? this.signalBuffer.getChannelData(0) : null;
        const signalLength = signalData ? signalData.length : 0;
        
        // At 100% signal, minimal noise. At 0% signal, full noise.
        const noiseLevel = 0.15 * (1 - this.signalStrength);
        const signalLevel = this.signalStrength;
        
        // Calculate starting position in the signal based on global time
        // This ensures recording captures the actual song position
        const signalStartSample = Math.floor(this.recordingSignalOffset * this.sampleRate);
        
        // Fill buffer from last position to current position
        const endSample = Math.min(targetSample, maxSamples);
        for (let i = this.recordingSampleIndex; i < endSample; i++) {
            const noise = (Math.random() - 0.5) * 2 * noiseLevel;
            // Use the correct position in the signal (accounting for where we started)
            const signalSampleIndex = (signalStartSample + i) % signalLength;
            const signal = signalData ? signalData[signalSampleIndex] * signalLevel : 0;
            channelData[i] = noise + signal;
        }
        this.recordingSampleIndex = endSample;
        
        // Auto-stop at max duration
        if (elapsed >= this.recordingDuration) {
            this.stopRecording();
        }
    }
    
    // Stop recording and finalize the buffer
    stopRecording() {
        if (!this.isRecording) return;
        
        this.isRecording = false;
        
        // Create a trimmed buffer with only the recorded samples
        if (this.recordingSampleIndex > 0) {
            const trimmedBuffer = this.audioContext.createBuffer(
                1, 
                this.recordingSampleIndex, 
                this.sampleRate
            );
            const srcData = this.recordingBuffer.getChannelData(0);
            const dstData = trimmedBuffer.getChannelData(0);
            
            for (let i = 0; i < this.recordingSampleIndex; i++) {
                dstData[i] = srcData[i];
            }
            
            this.recordedBuffer = trimmedBuffer;
        }
    }
    
    getRecordingProgress() {
        if (!this.isRecording) return 1;
        const elapsed = this.audioContext.currentTime - this.recordingStartTime;
        return Math.min(elapsed / this.recordingDuration, 1);
    }
    
    hasRecording() {
        return this.recordedBuffer !== null;
    }
    
    getRecordedBuffer() {
        return this.recordedBuffer;
    }
    
    // Playback controls for recorded signal
    startPlayback() {
        if (this.isPlaying || !this.recordedBuffer) return;
        
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
        
        this.playbackSource = this.audioContext.createBufferSource();
        this.playbackSource.buffer = this.recordedBuffer;
        this.playbackSource.loop = true;
        this.playbackSource.connect(this.masterGain);
        this.playbackSource.start(0, this.pauseOffset);
        
        this.isPlaying = true;
        this.playbackStartTime = this.audioContext.currentTime - this.pauseOffset;
    }
    
    stopPlayback() {
        if (!this.isPlaying) return;
        
        if (this.recordedBuffer && this.audioContext) {
            const elapsed = this.audioContext.currentTime - this.playbackStartTime;
            this.pauseOffset = elapsed % this.recordedBuffer.duration;
        }
        
        if (this.playbackSource) {
            this.playbackSource.stop();
            this.playbackSource.disconnect();
            this.playbackSource = null;
        }
        
        this.isPlaying = false;
    }
    
    togglePlayback() {
        if (this.isPlaying) {
            this.stopPlayback();
        } else {
            this.startPlayback();
        }
    }
    
    getPlaybackPosition() {
        if (!this.recordedBuffer) return 0;
        
        if (this.isPlaying) {
            const elapsed = this.audioContext.currentTime - this.playbackStartTime;
            return (elapsed % this.recordedBuffer.duration) / this.recordedBuffer.duration;
        } else {
            return this.pauseOffset / this.recordedBuffer.duration;
        }
    }
    
    setPlaybackPosition(position) {
        // Position is 0-1
        if (!this.recordedBuffer) return;
        
        this.pauseOffset = position * this.recordedBuffer.duration;
        
        if (this.isPlaying) {
            this.stopPlayback();
            this.startPlayback();
        }
    }
    
    // Get current FFT data
    updateFFT() {
        if (this.analyser) {
            this.analyser.getByteFrequencyData(this.frequencyData);
            this.analyser.getByteTimeDomainData(this.timeDomainData);
        }
    }
    
    // Stop all audio when switching modes
    stopTunerAudio() {
        this.stopNoise();
        this.stopSignal();
    }
    
    // Resume tuner audio
    resumeTunerAudio() {
        this.startNoise();
        if (this.signalBuffer) {
            this.startSignalAtGlobalTime();
        }
    }
    
    cleanup() {
        this.stopPlayback();
        this.stopNoise();
        this.stopSignal();
        
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }
    }
}


