// SIGNAL ANALYZER - Core Controller
// AIDEV-NOTE: Program interface: init(), update(deltaTime), getSegments(), handleKey(key, down)
// AIDEV-NOTE: Uses Web Audio API for real FFT analysis and signal generation
// AIDEV-NOTE: Two modes: TUNER (scan frequencies) and PLAYBACK (analyze recorded signal)

// Source modes
const SOURCE_TUNER = 0;
const SOURCE_PLAYBACK = 1;

class SignalAnalyzer {
    constructor() {
        this.segments = [];
        
        // Current mode
        this.sourceMode = SOURCE_TUNER;
        
        // Sub-modules
        this.audio = new SignalAnalyzerAudio();
        this.tuner = new SignalAnalyzerTuner(this);
        this.playback = new SignalAnalyzerPlayback(this);
        
        // Layout constants
        this.charWidth = 0.012;
        this.charHeight = 0.022;
        
        // Animation
        this.time = 0;
        
        // Status
        this.statusMessage = 'INITIALIZING...';
        this.errorMessage = null;
    }
    
    async init() {
        this.segments = [];
        this.time = 0;
        this.sourceMode = SOURCE_TUNER;
        this.errorMessage = null;
        
        try {
            await this.audio.init();
            this.tuner.init();
            this.playback.init();
            this.statusMessage = 'TUNER READY';
        } catch (err) {
            console.error('Signal Analyzer init error:', err);
            this.errorMessage = 'AUDIO INIT FAILED: ' + err.message;
            this.statusMessage = 'ERROR';
        }
    }
    
    update(deltaTime) {
        this.time += deltaTime;
        
        // Update active mode
        if (this.sourceMode === SOURCE_TUNER) {
            this.tuner.update(deltaTime);
        } else {
            this.playback.update(deltaTime);
        }
        
        this.generateSegments();
    }
    
    handleKey(key, down, event) {
        if (!down) return;
        
        // Global keys
        switch (key) {
            case 's':
            case 'S':
                this.toggleSourceMode();
                return;
        }
        
        // Delegate to active mode
        if (this.sourceMode === SOURCE_TUNER) {
            this.tuner.handleKey(key);
        } else {
            this.playback.handleKey(key);
        }
    }
    
    toggleSourceMode() {
        if (this.sourceMode === SOURCE_TUNER) {
            // Can only switch to playback if we have a recording
            if (this.audio.hasRecording()) {
                this.switchToPlayback();
            }
        } else {
            this.switchToTuner();
        }
    }
    
    switchToPlayback() {
        this.sourceMode = SOURCE_PLAYBACK;
        this.audio.stopTunerAudio();
        this.playback.init();
        this.statusMessage = 'PLAYBACK MODE';
    }
    
    switchToTuner() {
        this.sourceMode = SOURCE_TUNER;
        this.audio.stopPlayback();
        this.audio.resumeTunerAudio();
        this.statusMessage = 'TUNER MODE';
    }
    
    generateSegments() {
        this.segments = [];
        
        // Get segments from active mode
        if (this.sourceMode === SOURCE_TUNER) {
            this.segments = this.tuner.getSegments();
        } else {
            this.segments = this.playback.getSegments();
        }
        
        // Always show exit hint
        this.drawTextToSegments(this.segments, 'CTRL-C:EXIT', 0.82, 0.03);
        
        // Error message if any
        if (this.errorMessage) {
            this.drawTextToSegments(this.segments, this.errorMessage, 0.06, 0.50);
        }
    }
    
    // Helper to draw text into a segments array
    drawTextToSegments(segments, text, x, y, scale = null) {
        const cw = scale || this.charWidth;
        const ch = scale ? scale * 1.8 : this.charHeight;
        let cx = x;
        
        for (const char of text.toString()) {
            const charLines = getCharacterLines(char);
            for (const seg of charLines) {
                segments.push([
                    cx + seg[0] * cw,
                    y + seg[1] * ch,
                    cx + seg[2] * cw,
                    y + seg[3] * ch
                ]);
            }
            cx += cw * 1.1;
        }
    }
    
    getSegments() {
        return this.segments;
    }
    
    cleanup() {
        this.audio.cleanup();
    }
}

// Global instance
const signalAnalyzer = new SignalAnalyzer();

