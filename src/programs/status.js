// STATUS - Life Support Status Monitor with Heartbeat Display
// AIDEV-NOTE: Program interface: init(), update(deltaTime), getSegments(), handleKey(key, down)

class StatusMonitor {
    constructor() {
        this.segments = [];
        
        // Heartbeat waveform - fixed width, scan line overwrites
        this.heartbeatPhase = 0;
        this.heartRate = 72;  // BPM
        this.waveformData = [];    // Full width array
        this.scanPosition = 0;     // Current draw position (0 to maxWidth)
        this.maxWidth = 200;
        
        // Simulated vitals (slowly drift for visual interest)
        this.vitals = {
            oxygen: 94,
            heartRate: 72,
            bloodPressure: { sys: 120, dia: 80 },
            temperature: 98.6,
            respiration: 16
        };
        
        // Hold status - exposed to vacuum
        this.hold = {
            oxygen: 0,
            temperature: -270,  // Near absolute zero (space)
            pressure: 0,
            hullBreach: true
        };
        
        this.driftTime = 0;
        
        this.init();
    }
    
    init() {
        this.segments = [];
        this.heartbeatPhase = 0;
        this.scanPosition = 0;
        this.waveformData = new Array(this.maxWidth).fill(0);
        this.driftTime = 0;
        this.baselineDrift = 0;
    }
    
    handleKey(key, down) {
        // No input needed for status display
    }
    
    update(deltaTime) {
        this.driftTime += deltaTime;
        
        // Update heartbeat phase
        const beatDuration = 60.0 / this.heartRate;
        this.heartbeatPhase += deltaTime / beatDuration;
        if (this.heartbeatPhase >= 1.0) {
            this.heartbeatPhase -= 1.0;
        }
        
        // Generate current waveform value at scan position (with baseline drift)
        const waveValue = this.getHeartbeatValue(this.heartbeatPhase) + this.baselineDrift;
        this.waveformData[Math.floor(this.scanPosition)] = waveValue;
        
        // Advance scan position slowly (wraps around)
        // ~30 pixels per second for a slow sweep
        this.scanPosition += deltaTime * 30;
        if (this.scanPosition >= this.maxWidth) {
            this.scanPosition -= this.maxWidth;
        }
        
        // Slowly drift vitals for visual interest
        this.vitals.oxygen = 94 + Math.sin(this.driftTime * 0.3) * 2;
        this.vitals.heartRate = 72 + Math.sin(this.driftTime * 0.5) * 5;
        this.heartRate = this.vitals.heartRate;
        this.vitals.temperature = 98.6 + Math.sin(this.driftTime * 0.2) * 0.3;
        this.vitals.respiration = 16 + Math.sin(this.driftTime * 0.4) * 2;
        this.vitals.bloodPressure.sys = 120 + Math.sin(this.driftTime * 0.25) * 8;
        this.vitals.bloodPressure.dia = 80 + Math.sin(this.driftTime * 0.3) * 5;
        
        // ECG baseline drift
        this.baselineDrift = Math.sin(this.driftTime * 0.15) * 0.08;
        
        this.generateSegments();
    }
    
    getHeartbeatValue(phase) {
        // EKG-style waveform: flat, P wave, flat, QRS complex, flat, T wave, flat
        // phase 0-1 represents one heartbeat
        
        if (phase < 0.1) {
            // Baseline
            return 0;
        } else if (phase < 0.15) {
            // P wave (small bump)
            const t = (phase - 0.1) / 0.05;
            return Math.sin(t * Math.PI) * 0.15;
        } else if (phase < 0.25) {
            // Baseline
            return 0;
        } else if (phase < 0.28) {
            // Q dip
            const t = (phase - 0.25) / 0.03;
            return -Math.sin(t * Math.PI) * 0.1;
        } else if (phase < 0.35) {
            // R spike (tall)
            const t = (phase - 0.28) / 0.07;
            return Math.sin(t * Math.PI) * 0.9;
        } else if (phase < 0.40) {
            // S dip
            const t = (phase - 0.35) / 0.05;
            return -Math.sin(t * Math.PI) * 0.2;
        } else if (phase < 0.55) {
            // Baseline
            return 0;
        } else if (phase < 0.70) {
            // T wave (medium bump)
            const t = (phase - 0.55) / 0.15;
            return Math.sin(t * Math.PI) * 0.25;
        } else {
            // Baseline until next beat
            return 0;
        }
    }
    
    generateSegments() {
        this.segments = [];
        
        // Title
        this.drawText("LIFE SUPPORT STATUS", 0.25, 0.94);
        this.drawText("EXIT: CTRL-C", 0.38, 0.06);
        
        // Draw EKG waveform
        this.drawWaveform();
        
        // Draw vital signs (left column)
        this.drawVitals();
        
        // Draw hold status (right column)
        this.drawHold();
    }
    
    drawWaveform() {
        const startX = 0.05;
        const endX = 0.95;
        const centerY = 0.70;
        const height = 0.15;
        
        // Border box for waveform
        this.segments.push([startX, centerY + height + 0.02, endX, centerY + height + 0.02]);
        this.segments.push([startX, centerY - height - 0.02, endX, centerY - height - 0.02]);
        this.segments.push([startX, centerY - height - 0.02, startX, centerY + height + 0.02]);
        this.segments.push([endX, centerY - height - 0.02, endX, centerY + height + 0.02]);
        
        // Labels above the box
        this.drawText("ECG", startX, centerY + height + 0.05);
        this.drawText("HR: " + Math.round(this.vitals.heartRate) + " BPM", 0.72, centerY + height + 0.05);
        
        // Draw the full waveform (scan line overwrites old data)
        const stepX = (endX - startX) / this.maxWidth;
        const gapSize = 10;  // Gap ahead of scan line (erased area)
        const scanPos = Math.floor(this.scanPosition);
        
        for (let i = 1; i < this.maxWidth; i++) {
            // Skip drawing near the scan position (creates the "erase" gap)
            const distFromScan = (i - scanPos + this.maxWidth) % this.maxWidth;
            if (distFromScan < gapSize) continue;
            
            const x1 = startX + (i - 1) * stepX;
            const x2 = startX + i * stepX;
            const y1 = centerY + this.waveformData[i - 1] * height;
            const y2 = centerY + this.waveformData[i] * height;
            
            this.segments.push([x1, y1, x2, y2]);
        }
        
        // Draw scan line cursor (vertical line at current position)
        const scanX = startX + this.scanPosition * stepX;
        this.segments.push([scanX, centerY - height, scanX, centerY + height]);
    }
    
    drawVitals() {
        const x = 0.05;
        let y = 0.45;
        const lineHeight = 0.06;
        const barX = 0.32;
        const barW = 0.12;
        
        this.drawText("CREW VITALS", x, y);
        y -= lineHeight;
        
        this.drawText("SPO2:", x, y);
        this.drawText(this.vitals.oxygen.toFixed(0) + "%", x + 0.14, y);
        this.drawBar(barX, y, barW, this.vitals.oxygen / 100);
        y -= lineHeight;
        
        this.drawText("TEMP:", x, y);
        this.drawText(this.vitals.temperature.toFixed(1) + "F", x + 0.14, y);
        this.drawBar(barX, y, barW, (this.vitals.temperature - 95) / 10);
        y -= lineHeight;
        
        this.drawText("RESP:", x, y);
        this.drawText(Math.round(this.vitals.respiration) + "/M", x + 0.14, y);
        this.drawBar(barX, y, barW, this.vitals.respiration / 30);
        y -= lineHeight;
        
        this.drawText("BP:", x, y);
        this.drawText(Math.round(this.vitals.bloodPressure.sys) + "/" + 
                      Math.round(this.vitals.bloodPressure.dia), x + 0.14, y);
    }
    
    drawHold() {
        const x = 0.52;
        let y = 0.45;
        const lineHeight = 0.06;
        const barX = 0.82;
        const barW = 0.12;
        
        this.drawText("HOLD STATUS", x, y);
        y -= lineHeight;
        
        // Oxygen - 0% (vacuum)
        this.drawText("O2:", x, y);
        this.drawText(this.hold.oxygen.toFixed(0) + "%", x + 0.14, y);
        this.drawBar(barX, y, barW, this.hold.oxygen / 100);
        y -= lineHeight;
        
        // Temperature - near absolute zero
        this.drawText("TEMP:", x, y);
        this.drawText(Math.round(this.hold.temperature) + "C", x + 0.14, y);
        this.drawBar(barX, y, barW, 0);
        y -= lineHeight;
        
        // Pressure - vacuum
        this.drawText("PRES:", x, y);
        this.drawText(this.hold.pressure.toFixed(1) + " ATM", x + 0.14, y);
        this.drawBar(barX, y, barW, this.hold.pressure);
        y -= lineHeight;
        
        // Hull breach warning
        if (this.hold.hullBreach) {
            // Blink the warning
            if (Math.floor(this.driftTime * 2) % 2 === 0) {
                this.drawText("!! BREACH !!", x + 0.05, y);
            }
        }
    }
    
    drawBar(x, y, width, fill) {
        const height = 0.02;
        const halfH = height / 2;
        
        // Outline
        this.segments.push([x, y - halfH, x + width, y - halfH]);
        this.segments.push([x, y + halfH, x + width, y + halfH]);
        this.segments.push([x, y - halfH, x, y + halfH]);
        this.segments.push([x + width, y - halfH, x + width, y + halfH]);
        
        // Fill (clamped)
        const fillWidth = Math.max(0, Math.min(1, fill)) * width;
        if (fillWidth > 0.005) {
            // Draw fill as a few horizontal lines
            this.segments.push([x + 0.002, y, x + fillWidth - 0.002, y]);
            this.segments.push([x + 0.002, y - halfH + 0.003, x + fillWidth - 0.002, y - halfH + 0.003]);
            this.segments.push([x + 0.002, y + halfH - 0.003, x + fillWidth - 0.002, y + halfH - 0.003]);
        }
    }
    
    drawText(text, x, y) {
        const charWidth = 0.018;
        const charHeight = 0.025;
        let cx = x;
        
        for (const char of text.toString()) {
            const charLines = getCharacterLines(char);
            for (const seg of charLines) {
                this.segments.push([
                    cx + seg[0] * charWidth,
                    y + seg[1] * charHeight,
                    cx + seg[2] * charWidth,
                    y + seg[3] * charHeight
                ]);
            }
            cx += charWidth * 1.1;
        }
    }
    
    getSegments() {
        return this.segments;
    }
}

// Global instance
const statusMonitor = new StatusMonitor();

