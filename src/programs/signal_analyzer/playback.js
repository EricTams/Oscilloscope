// SIGNAL ANALYZER - Playback Mode
// AIDEV-NOTE: Handles recorded signal playback and analysis visualization

// Analysis modes
const ANALYSIS_SPECTRUM = 0;
const ANALYSIS_WAVEFORM = 1;
const ANALYSIS_SPECTROGRAM = 2;
const ANALYSIS_MODE_NAMES = ['SPECTRUM', 'WAVEFORM', 'SPECTROGRAM'];

class SignalAnalyzerPlayback {
    constructor(analyzer) {
        this.analyzer = analyzer;
        
        // Analysis mode
        this.analysisMode = ANALYSIS_SPECTRUM;
        
        // Playback state
        this.isPlaying = false;
        
        // Zoom/pan for spectrum
        this.freqZoom = 1;
        this.freqOffset = 0;
        
        // Spectrogram history
        this.spectrogramHistory = [];
        this.spectrogramWidth = 100;  // Number of columns
        
        // Layout
        this.displayTop = 0.88;
        this.displayBottom = 0.18;
        this.displayLeft = 0.06;
        this.displayRight = 0.94;
    }
    
    init() {
        this.analysisMode = ANALYSIS_SPECTRUM;
        this.freqZoom = 1;
        this.freqOffset = 0;
        this.spectrogramHistory = [];
    }
    
    update(deltaTime) {
        this.isPlaying = this.analyzer.audio.isPlaying;
        
        // Update FFT data
        if (this.isPlaying) {
            this.analyzer.audio.updateFFT();
            
            // Update spectrogram history
            if (this.analysisMode === ANALYSIS_SPECTROGRAM) {
                this.updateSpectrogram();
            }
        }
    }
    
    updateSpectrogram() {
        const freqData = this.analyzer.audio.frequencyData;
        if (!freqData) return;
        
        // Downsample frequency data for spectrogram
        const numBins = 64;
        const binSize = Math.floor(freqData.length / numBins);
        const column = new Uint8Array(numBins);
        
        for (let i = 0; i < numBins; i++) {
            let max = 0;
            for (let j = 0; j < binSize; j++) {
                max = Math.max(max, freqData[i * binSize + j]);
            }
            column[i] = max;
        }
        
        this.spectrogramHistory.push(column);
        
        // Keep only last N columns
        if (this.spectrogramHistory.length > this.spectrogramWidth) {
            this.spectrogramHistory.shift();
        }
    }
    
    handleKey(key) {
        switch (key) {
            case ' ':
                this.analyzer.audio.togglePlayback();
                break;
                
            case 'ArrowLeft':
                // Move playhead backward
                this.movePlayhead(-0.05);
                break;
                
            case 'ArrowRight':
                // Move playhead forward
                this.movePlayhead(0.05);
                break;
                
            case 'ArrowUp':
                // Zoom in (spectrum mode)
                if (this.analysisMode === ANALYSIS_SPECTRUM) {
                    this.freqZoom = Math.min(this.freqZoom * 1.5, 16);
                }
                break;
                
            case 'ArrowDown':
                // Zoom out (spectrum mode)
                if (this.analysisMode === ANALYSIS_SPECTRUM) {
                    this.freqZoom = Math.max(this.freqZoom / 1.5, 1);
                    if (this.freqZoom === 1) this.freqOffset = 0;
                }
                break;
                
            case 'm':
            case 'M':
                // Cycle analysis mode
                this.analysisMode = (this.analysisMode + 1) % 3;
                if (this.analysisMode === ANALYSIS_SPECTROGRAM) {
                    this.spectrogramHistory = [];
                }
                break;
                
            case 'r':
            case 'R':
                // Reset zoom
                this.freqZoom = 1;
                this.freqOffset = 0;
                break;
        }
    }
    
    movePlayhead(delta) {
        const currentPos = this.analyzer.audio.getPlaybackPosition();
        let newPos = currentPos + delta;
        
        // Wrap around
        if (newPos < 0) newPos += 1;
        if (newPos > 1) newPos -= 1;
        
        this.analyzer.audio.setPlaybackPosition(newPos);
    }
    
    getSegments() {
        const segments = [];
        const drawText = (text, x, y, scale) => this.analyzer.drawTextToSegments(segments, text, x, y, scale);
        
        // Title and mode
        drawText('SIGNAL PLAYBACK', 0.36, 0.95);
        drawText('MODE: ' + ANALYSIS_MODE_NAMES[this.analysisMode], 0.70, 0.95);
        
        // Status
        const statusText = this.isPlaying ? 'PLAYING' : 'PAUSED';
        drawText('STATUS: ' + statusText, 0.06, 0.95);
        
        // Draw main display based on mode
        switch (this.analysisMode) {
            case ANALYSIS_SPECTRUM:
                this.drawSpectrum(segments);
                break;
            case ANALYSIS_WAVEFORM:
                this.drawWaveform(segments);
                break;
            case ANALYSIS_SPECTROGRAM:
                this.drawSpectrogram(segments);
                break;
        }
        
        // Playhead position bar
        this.drawPlayheadBar(segments);
        
        // Controls
        drawText('SPACE:PLAY  L/R:SEEK  M:MODE  S:TUNER', 0.06, 0.03);
        
        return segments;
    }
    
    drawSpectrum(segments) {
        const left = this.displayLeft;
        const right = this.displayRight;
        const top = this.displayTop;
        const bottom = this.displayBottom;
        
        const sampleRate = this.analyzer.audio.sampleRate;
        const maxFreq = sampleRate / 2;
        const visibleRange = maxFreq / this.freqZoom;
        const startFreq = this.freqOffset * maxFreq;
        const endFreq = startFreq + visibleRange;
        
        // Panel label
        this.analyzer.drawTextToSegments(segments, 'SPECTRUM', left, top + 0.03);
        const rangeText = Math.round(startFreq) + '-' + Math.round(endFreq) + ' HZ';
        this.analyzer.drawTextToSegments(segments, rangeText, right - 0.18, top + 0.03);
        
        // Border
        segments.push([left, top, right, top]);
        segments.push([left, bottom, right, bottom]);
        segments.push([left, bottom, left, top]);
        segments.push([right, bottom, right, top]);
        
        // Draw frequency axis
        this.drawFrequencyAxis(segments, left, right, bottom, startFreq, endFreq);
        
        // Draw spectrum data
        const freqData = this.analyzer.audio.frequencyData;
        if (freqData && this.isPlaying) {
            const width = right - left;
            const height = top - bottom - 0.04;
            const binCount = freqData.length;
            const fftSize = this.analyzer.audio.fftSize;
            const freqPerBin = sampleRate / fftSize;
            
            const startBin = Math.floor(startFreq / freqPerBin);
            const endBin = Math.min(Math.ceil(endFreq / freqPerBin), binCount);
            const numBins = endBin - startBin;
            
            let prevX = null;
            let prevY = null;
            const binsPerPoint = Math.max(1, Math.floor(numBins / 150));
            
            for (let i = startBin; i < endBin; i += binsPerPoint) {
                let maxMag = 0;
                for (let j = i; j < Math.min(i + binsPerPoint, endBin); j++) {
                    maxMag = Math.max(maxMag, freqData[j]);
                }
                
                const normalized = maxMag / 255;
                const binFreq = i * freqPerBin;
                
                const x = left + ((binFreq - startFreq) / visibleRange) * width;
                const y = bottom + 0.04 + normalized * height;
                
                if (prevX !== null) {
                    segments.push([prevX, prevY, x, y]);
                }
                
                if (normalized > 0.05) {
                    segments.push([x, bottom + 0.04, x, y]);
                }
                
                prevX = x;
                prevY = y;
            }
        }
    }
    
    drawWaveform(segments) {
        const left = this.displayLeft;
        const right = this.displayRight;
        const top = this.displayTop;
        const bottom = this.displayBottom;
        const centerY = (top + bottom) / 2;
        
        // Panel label
        this.analyzer.drawTextToSegments(segments, 'WAVEFORM', left, top + 0.03);
        
        // Border
        segments.push([left, top, right, top]);
        segments.push([left, bottom, right, bottom]);
        segments.push([left, bottom, left, top]);
        segments.push([right, bottom, right, top]);
        
        // Center line
        segments.push([left, centerY, right, centerY]);
        
        // Draw full waveform from recorded buffer
        const buffer = this.analyzer.audio.getRecordedBuffer();
        if (buffer) {
            const width = right - left;
            const height = (top - bottom) * 0.9;
            const channelData = buffer.getChannelData(0);
            const numSamples = channelData.length;
            const numPoints = 400;
            const samplesPerPoint = Math.floor(numSamples / numPoints);
            
            // Find global max for scaling
            let globalMax = 0;
            for (let i = 0; i < numSamples; i++) {
                globalMax = Math.max(globalMax, Math.abs(channelData[i]));
            }
            const scale = globalMax > 0 ? 1 / (globalMax * 1.1) : 1;
            
            for (let i = 0; i < numPoints; i++) {
                const startSample = i * samplesPerPoint;
                const endSample = Math.min(startSample + samplesPerPoint, numSamples);
                
                let minVal = 0, maxVal = 0;
                for (let j = startSample; j < endSample; j++) {
                    minVal = Math.min(minVal, channelData[j]);
                    maxVal = Math.max(maxVal, channelData[j]);
                }
                
                const scaledMin = minVal * scale;
                const scaledMax = maxVal * scale;
                
                const x = left + (i / numPoints) * width;
                const yMin = centerY + scaledMin * (height / 2);
                const yMax = centerY + scaledMax * (height / 2);
                
                segments.push([x, yMin, x, yMax]);
            }
            
            // Draw playhead
            const position = this.analyzer.audio.getPlaybackPosition();
            const playheadX = left + position * width;
            segments.push([playheadX, top - 0.01, playheadX, bottom + 0.01]);
        }
    }
    
    drawSpectrogram(segments) {
        const left = this.displayLeft;
        const right = this.displayRight;
        const top = this.displayTop;
        const bottom = this.displayBottom;
        
        // Panel label
        this.analyzer.drawTextToSegments(segments, 'SPECTROGRAM', left, top + 0.03);
        
        // Border
        segments.push([left, top, right, top]);
        segments.push([left, bottom, right, bottom]);
        segments.push([left, bottom, left, top]);
        segments.push([right, bottom, right, top]);
        
        if (this.spectrogramHistory.length === 0) return;
        
        const width = right - left;
        const height = top - bottom;
        const numBins = this.spectrogramHistory[0].length;
        const columnWidth = width / this.spectrogramWidth;
        const binHeight = height / numBins;
        
        // Draw spectrogram as vertical lines with varying density
        for (let col = 0; col < this.spectrogramHistory.length; col++) {
            const x = left + (col / this.spectrogramWidth) * width;
            const column = this.spectrogramHistory[col];
            
            for (let bin = 0; bin < numBins; bin++) {
                const intensity = column[bin] / 255;
                
                // Only draw if intensity is significant
                if (intensity > 0.1) {
                    const y = bottom + (bin / numBins) * height;
                    
                    // Draw horizontal lines based on intensity
                    const numLines = Math.floor(intensity * 3) + 1;
                    for (let l = 0; l < numLines; l++) {
                        const ly = y + (l / numLines) * binHeight * 0.8;
                        const lineLen = columnWidth * 0.8 * intensity;
                        segments.push([x, ly, x + lineLen, ly]);
                    }
                }
            }
        }
    }
    
    drawPlayheadBar(segments) {
        const left = this.displayLeft;
        const right = this.displayRight;
        const y = 0.12;
        const h = 0.03;
        
        // Bar outline
        segments.push([left, y, right, y]);
        segments.push([left, y + h, right, y + h]);
        segments.push([left, y, left, y + h]);
        segments.push([right, y, right, y + h]);
        
        // Playhead position
        const position = this.analyzer.audio.getPlaybackPosition();
        const px = left + position * (right - left);
        
        // Playhead marker (triangle)
        segments.push([px - 0.01, y + h + 0.01, px + 0.01, y + h + 0.01]);
        segments.push([px - 0.01, y + h + 0.01, px, y + h]);
        segments.push([px + 0.01, y + h + 0.01, px, y + h]);
        
        // Progress fill
        for (let x = left + 0.003; x < px; x += 0.006) {
            segments.push([x, y + 0.005, x, y + h - 0.005]);
        }
        
        // Time display
        const buffer = this.analyzer.audio.getRecordedBuffer();
        if (buffer) {
            const duration = buffer.duration;
            const currentTime = position * duration;
            const timeStr = currentTime.toFixed(1) + 's / ' + duration.toFixed(1) + 's';
            this.analyzer.drawTextToSegments(segments, timeStr, right - 0.12, y - 0.03, 0.008);
        }
    }
    
    drawFrequencyAxis(segments, left, right, bottom, startFreq, endFreq) {
        const width = right - left;
        const range = endFreq - startFreq;
        
        const niceIntervals = [50, 100, 200, 500, 1000, 2000, 5000, 10000];
        let interval = 100;
        for (const ni of niceIntervals) {
            if (range / ni >= 3 && range / ni <= 10) {
                interval = ni;
                break;
            }
        }
        
        const firstTick = Math.ceil(startFreq / interval) * interval;
        
        for (let freq = firstTick; freq < endFreq; freq += interval) {
            const x = left + ((freq - startFreq) / range) * width;
            
            segments.push([x, bottom, x, bottom + 0.015]);
            
            const label = freq >= 1000 ? (freq / 1000) + 'K' : freq.toString();
            this.analyzer.drawTextToSegments(segments, label, x - 0.015, bottom - 0.025, 0.008);
        }
    }
}

