// SOLAR - Solar Panel Alignment Program
// AIDEV-NOTE: Program interface: init(), update(deltaTime), getSegments(), handleKey(key, down)
// AIDEV-NOTE: Ship orbiting super-earth HAVEN in TAU CETI system
// Panels 1&2 are OFFLINE (pointed at sun), panels 3&4 must be aligned to moon AEGIS for reflected power

// Power constants
const SOLAR_POWER_MIN = 1.1;      // Min power per functional panel (%)
const SOLAR_POWER_MAX = 5.6;      // Max power when aligned to moon (%)
const SOLAR_POWER_CRITICAL = 2.4; // Below this = CRITICAL status

// Panel rotation constants
// Sun is on LEFT, panels start pointing RIGHT (0°), can rotate ±60° (120° arc)
const PANEL_ANGLE_MIN = -60;      // Can point down-right
const PANEL_ANGLE_MAX = 60;       // Can point up-right
const PANEL_ANGLE_STEP = 5;       // Degrees per key press

class SolarProgram {
    // Default panel angles - random-looking misalignment
    static DEFAULT_ANGLES = [-15, 25, 35, 50];
    
    /**
     * Initialize default values in GameState on game startup
     * AIDEV-NOTE: Call this once when the game loads, before any Solar program usage
     */
    static initDefaults() {
        if (GameState.solarPanelAngles === null) {
            GameState.solarPanelAngles = [...SolarProgram.DEFAULT_ANGLES];
        }
    }
    
    constructor() {
        this.segments = [];
        
        // Panel states
        // Online panels: angle 0 = pointing right, negative = down, positive = up
        // 120 degree arc: -60 to +60
        this.panels = [
            { id: 1, angle: 0, power: 0, offline: true },     // Pointed at sun (left), OFFLINE
            { id: 2, angle: 0, power: 0, offline: true },     // Pointed at sun (left), OFFLINE
            { id: 3, angle: 0, power: 0, offline: false },    // Will be set from GameState
            { id: 4, angle: 0, power: 0, offline: false }     // Will be set from GameState
        ];
        
        this.selectedPanel = 2;  // Start with panel 3 selected (index 2)
        this.blinkTimer = 0;
        this.blinkOn = true;
        
        // Scene layout (UV coordinates 0-1)
        // AIDEV-NOTE: TAU CETI system - super-earth HAVEN with moon AEGIS
        // Planet closer to sun (left), moon further from sun (right)
        // Mass ratio affects L1 position: equal masses → L1 at midpoint
        this.star = { x: 0.50, y: 0.95, label: 'TAU CETI' };  // Star label at top
        this.planet = { x: 0.25, y: 0.70, radius: 0.08, mass: 1.0, label: 'HAVEN' };  // Super-earth (moved up-right)
        this.moon = { x: 0.85, y: 0.38, radius: 0.06, mass: 0.5, label: 'AEGIS' };    // Large moon (moved up-right)
        
        // Calculate Lagrange points from planet-moon geometry
        this.lagrangePoints = this.calculateLagrangePoints(this.planet, this.moon);
        
        // Ship at L1 (between planet and moon, closer to moon)
        this.ship = { x: this.lagrangePoints.L1.x, y: this.lagrangePoints.L1.y };
        
        this.init();
    }
    
    init() {
        this.segments = [];
        this.selectedPanel = 2;  // Panel 3
        this.blinkTimer = 0;
        this.blinkOn = true;
        
        // Load panel angles from GameState (persisted between entries)
        // If null, initialize with defaults
        if (GameState.solarPanelAngles === null) {
            SolarProgram.initDefaults();
        }
        
        // Apply saved angles
        for (let i = 0; i < 4; i++) {
            this.panels[i].angle = GameState.solarPanelAngles[i];
        }
        
        this.updatePanelPower();
    }
    
    /**
     * Save current panel angles to GameState
     * Called after any angle change
     */
    savePanelAngles() {
        GameState.solarPanelAngles = this.panels.map(p => p.angle);
    }
    
    handleKey(key, down) {
        if (!down) return;
        
        const k = key.toLowerCase();
        
        // Panel selection with left/right
        if (k === 'arrowleft' || k === 'a') {
            this.selectedPanel = (this.selectedPanel + 3) % 4;  // Wrap backwards
        } else if (k === 'arrowright' || k === 'd') {
            this.selectedPanel = (this.selectedPanel + 1) % 4;  // Wrap forwards
        }
        
        // Panel rotation with up/down (only for functional panels)
        // 120° arc: -60 to +60 degrees from pointing down
        const panel = this.panels[this.selectedPanel];
        if (!panel.offline) {
            if (k === 'arrowup' || k === 'w') {
                // Rotate panel (decrease angle toward -60)
                panel.angle = Math.max(PANEL_ANGLE_MIN, panel.angle - PANEL_ANGLE_STEP);
                this.savePanelAngles();
                this.updatePanelPower();
            } else if (k === 'arrowdown' || k === 's') {
                // Rotate panel (increase angle toward +60)
                panel.angle = Math.min(PANEL_ANGLE_MAX, panel.angle + PANEL_ANGLE_STEP);
                this.savePanelAngles();
                this.updatePanelPower();
            }
        }
    }
    
    /**
     * Calculate Lagrange points for a two-body system
     * AIDEV-NOTE: Lagrange points are equilibrium positions in a two-body gravitational system
     * L1, L2, L3 are on the line between the bodies (collinear)
     * L4, L5 form equilateral triangles with the two bodies
     * Mass ratio determines L1 position: equal masses → L1 near midpoint
     * @param {Object} primary - Larger body (planet) {x, y, mass}
     * @param {Object} secondary - Smaller body (moon) {x, y, mass}
     * @returns {Object} Lagrange points L1-L5
     */
    calculateLagrangePoints(primary, secondary) {
        const dx = secondary.x - primary.x;
        const dy = secondary.y - primary.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        // Unit vector from primary to secondary
        const ux = dx / dist;
        const uy = dy / dist;
        
        // Perpendicular unit vector (for L4, L5)
        const px = -uy;
        const py = ux;
        
        // Mass ratio determines L1 position
        // mu = M2 / (M1 + M2) is the mass parameter
        const m1 = primary.mass || 1.0;
        const m2 = secondary.mass || 0.01;
        const mu = m2 / (m1 + m2);
        
        // L1: Approximate distance from secondary toward primary
        // r_L1 ≈ R * (mu/3)^(1/3) from the secondary
        // For equal masses (mu=0.5): r_L1 ≈ 0.55R from secondary, so L1 at ~0.45 from primary
        // For small moon (mu=0.01): r_L1 ≈ 0.15R from secondary, so L1 at ~0.85 from primary
        const hillRadius = Math.pow(mu / 3, 1/3);
        const l1Ratio = 1 - hillRadius;  // Distance from primary as fraction of total
        const L1 = {
            x: primary.x + dx * l1Ratio,
            y: primary.y + dy * l1Ratio,
            label: 'L1'
        };
        
        // L2: Beyond the secondary, about 1/6 of orbital distance past it
        const l2Dist = dist * 0.17;
        const L2 = {
            x: secondary.x + ux * l2Dist,
            y: secondary.y + uy * l2Dist,
            label: 'L2'
        };
        
        // L3: Beyond the primary, opposite side from secondary
        const l3Dist = dist * 0.17;
        const L3 = {
            x: primary.x - ux * l3Dist,
            y: primary.y - uy * l3Dist,
            label: 'L3'
        };
        
        // L4: Leading equilateral triangle point (60° ahead of secondary)
        // Forms equilateral triangle with primary and secondary
        const l4Offset = dist * Math.sin(Math.PI / 3);  // Height of equilateral triangle
        const midX = (primary.x + secondary.x) / 2;
        const midY = (primary.y + secondary.y) / 2;
        const L4 = {
            x: midX + px * l4Offset,
            y: midY + py * l4Offset,
            label: 'L4'
        };
        
        // L5: Trailing equilateral triangle point (60° behind secondary)
        const L5 = {
            x: midX - px * l4Offset,
            y: midY - py * l4Offset,
            label: 'L5'
        };
        
        return { L1, L2, L3, L4, L5 };
    }
    
    /**
     * Calculate power output for each panel
     * AIDEV-NOTE: Two-step calculation:
     * 1. How much light does the moon reflect toward the ship? (moon brightness)
     * 2. How well is the panel aligned to capture it? (cosine of deflection)
     */
    updatePanelPower() {
        // Step 1: Calculate moon's reflected brightness toward ship
        const moonBrightness = this.calculateMoonBrightness();
        
        for (const panel of this.panels) {
            if (panel.offline) {
                panel.power = 0;
                continue;
            }
            
            // Step 2: Calculate panel capture efficiency based on alignment
            const captureEfficiency = this.calculatePanelEfficiency(panel);
            
            // Power = base max * moon brightness * panel efficiency
            panel.power = SOLAR_POWER_MAX * moonBrightness * captureEfficiency;
        }
        
        // Update global power level
        const avgPower = this.panels.reduce((sum, p) => sum + p.power, 0) / 4;
        GameState.powerLevel = avgPower;
        
        // Check if we've achieved LOW power status
        if (avgPower >= SOLAR_POWER_CRITICAL && !GameState.SolarAligned) {
            GameState.SolarAligned = true;
            
            // AIDEV-NOTE: Power restored - transition to 'unfinished' goal (end of current content)
            GameState.elizaGoal = 'unfinished';
            GameState.elizaSubgoal = 'greeting';
            console.log('Power restored - Eliza goal: unfinished/greeting');
        }
    }
    
    /**
     * Calculate how much light the moon reflects toward the ship
     * AIDEV-NOTE: Sun is at left (x=0), so moon's lit face points left
     * Ship sees more reflected light when it's to the left of the moon
     * @returns {number} 0 to 1 brightness factor
     */
    calculateMoonBrightness() {
        const ship = this.ship;
        const moon = this.moon;
        
        // Vector from moon to ship
        const toShipX = ship.x - moon.x;
        const toShipY = ship.y - moon.y;
        const distToShip = Math.sqrt(toShipX * toShipX + toShipY * toShipY);
        
        // Normalize
        const toShipNormX = toShipX / distToShip;
        const toShipNormY = toShipY / distToShip;
        
        // Sun direction (coming from left side of screen)
        // Moon's lit face normal points toward sun (left, negative X)
        const litFaceX = -1;
        const litFaceY = 0;
        
        // How much of the lit face does the ship see?
        // Dot product of (moon-to-ship) and (lit face normal)
        // = 1 when ship is directly to the left (sees full lit face)
        // = 0 when ship is above/below (sees half lit, half dark)
        // = -1 when ship is to the right (sees only dark side)
        const visibility = toShipNormX * litFaceX + toShipNormY * litFaceY;
        
        // Clamp to 0-1 (no light from dark side)
        return Math.max(0, visibility);
    }
    
    /**
     * Calculate how efficiently a panel captures light from the moon
     * AIDEV-NOTE: Cosine falloff based on deflection from optimal angle
     * 0° deflection = 100% efficiency, 90°+ deflection = 0%
     * @param {Object} panel - Panel with angle property
     * @returns {number} 0 to 1 efficiency factor
     */
    calculatePanelEfficiency(panel) {
        const ship = this.ship;
        const moon = this.moon;
        
        // Optimal direction: from ship toward moon
        const toMoonX = moon.x - ship.x;
        const toMoonY = moon.y - ship.y;
        const distToMoon = Math.sqrt(toMoonX * toMoonX + toMoonY * toMoonY);
        
        // Normalize optimal direction
        const optimalX = toMoonX / distToMoon;
        const optimalY = toMoonY / distToMoon;
        
        // Panel's actual direction (world coordinates)
        // Panel angle 0 = right (0° world), positive = counter-clockwise
        const panelWorldAngle = panel.angle * Math.PI / 180;
        const panelDirX = Math.cos(panelWorldAngle);
        const panelDirY = Math.sin(panelWorldAngle);
        
        // Dot product gives cosine of angle between directions
        // = 1 when perfectly aligned (0° deflection)
        // = 0 when perpendicular (90° deflection)
        // = -1 when opposite (180° deflection)
        const dotProduct = panelDirX * optimalX + panelDirY * optimalY;
        
        // Efficiency is cosine, clamped to 0 (no negative efficiency)
        return Math.max(0, dotProduct);
    }
    
    update(deltaTime) {
        // Blink timer for selected panel indicator
        this.blinkTimer += deltaTime;
        if (this.blinkTimer >= 0.3) {
            this.blinkTimer = 0;
            this.blinkOn = !this.blinkOn;
        }
        
        this.generateSegments();
    }
    
    generateSegments() {
        this.segments = [];
        
        // Draw sun rays with TAU CETI label at top
        this.drawSunRays();
        
        // Draw planet HAVEN (super-earth) - smaller
        this.drawCircle(this.planet.x, this.planet.y, this.planet.radius, 16);
        this.drawText(this.planet.label, this.planet.x - 0.05, this.planet.y - this.planet.radius - 0.04);
        
        // Draw moon AEGIS
        this.drawCircle(this.moon.x, this.moon.y, this.moon.radius, 12);
        this.drawText(this.moon.label, this.moon.x - 0.04, this.moon.y - this.moon.radius - 0.04);
        
        // Draw Lagrange points
        this.drawLagrangePoints();
        
        // Draw ship (bigger)
        this.drawShip();
        
        // Draw solar panels on ship with alignment arrows
        this.drawPanels();
        
        // Draw status panel at bottom
        this.drawStatusPanel();
        
        // Draw instructions
        this.drawText('EXIT: CTRL-C', 0.75, 0.96);
        this.drawText('L/R: SELECT  U/D: ROTATE', 0.25, 0.03);
    }
    
    drawSunRays() {
        const numRays = 9;
        const startX = 0.02;
        const endX = 0.12;
        const arrowSize = 0.015;
        
        // Draw arrows pointing right (sunlight from left)
        for (let i = 0; i < numRays; i++) {
            const y = 0.15 + (i / (numRays - 1)) * 0.70;
            
            // Horizontal line
            this.segments.push([startX, y, endX, y]);
            
            // Arrow head pointing right
            this.segments.push([endX, y, endX - arrowSize, y - arrowSize]);
            this.segments.push([endX, y, endX - arrowSize, y + arrowSize]);
        }
        
        // TAU CETI label on left side
        this.drawText(this.star.label, 0.01, 0.95);
    }
    
    drawCircle(cx, cy, radius, segments) {
        for (let i = 0; i < segments; i++) {
            const a1 = (i / segments) * Math.PI * 2;
            const a2 = ((i + 1) / segments) * Math.PI * 2;
            
            const x1 = cx + Math.cos(a1) * radius;
            const y1 = cy + Math.sin(a1) * radius;
            const x2 = cx + Math.cos(a2) * radius;
            const y2 = cy + Math.sin(a2) * radius;
            
            this.segments.push([x1, y1, x2, y2]);
        }
    }
    
    drawLagrangePoints() {
        for (const [name, point] of Object.entries(this.lagrangePoints)) {
            // Skip L1 - ship is positioned there
            if (name === 'L1') continue;
            
            const size = 0.015;
            
            // Draw X marker
            this.segments.push([
                point.x - size, point.y - size,
                point.x + size, point.y + size
            ]);
            this.segments.push([
                point.x - size, point.y + size,
                point.x + size, point.y - size
            ]);
            
            // Draw label
            this.drawText(point.label, point.x - 0.015, point.y - 0.04);
        }
    }
    
    drawShip() {
        const x = this.ship.x;
        const y = this.ship.y;
        const width = 0.025;   // Skinnier
        const height = 0.07;   // Longer (to sit between panels)
        
        // Ship body - elongated hexagonal shape (tall and thin)
        const pts = [
            { x: x, y: y + height },           // Top point
            { x: x + width, y: y + height * 0.5 },  // Upper right
            { x: x + width, y: y - height * 0.5 },  // Lower right
            { x: x, y: y - height },           // Bottom point
            { x: x - width, y: y - height * 0.5 },  // Lower left
            { x: x - width, y: y + height * 0.5 }   // Upper left
        ];
        
        // Draw hexagon
        for (let i = 0; i < 6; i++) {
            const p1 = pts[i];
            const p2 = pts[(i + 1) % 6];
            this.segments.push([p1.x, p1.y, p2.x, p2.y]);
        }
        
        // Internal cross structure
        this.segments.push([x, y - height * 0.6, x, y + height * 0.6]);  // Vertical line
        this.segments.push([x - width * 0.8, y, x + width * 0.8, y]);    // Horizontal line
    }
    
    drawPanels() {
        const shipX = this.ship.x;
        const shipY = this.ship.y;
        const panelLength = 0.05;   // Long side (perpendicular to arrow)
        const panelWidth = 0.012;   // Short side (parallel to arrow)
        const arrowLen = 0.035;
        
        // Panel positions relative to ship
        // Sun is on LEFT, so offline panels face left, online panels face right
        const panelOffsets = [
            { dx: -0.05, dy: 0.05 },   // Panel 1 - left top (OFFLINE, faces sun)
            { dx: -0.05, dy: -0.05 },  // Panel 2 - left bottom (OFFLINE, faces sun)
            { dx: 0.05, dy: 0.05 },    // Panel 3 - right top (online, faces away)
            { dx: 0.05, dy: -0.05 }    // Panel 4 - right bottom (online, faces away)
        ];
        
        for (let i = 0; i < 4; i++) {
            const panel = this.panels[i];
            const offset = panelOffsets[i];
            const px = shipX + offset.dx;
            const py = shipY + offset.dy;
            
            // Convert panel angle to world angle (radians)
            // Offline panels point left (toward sun) + their angle offset
            // Online panels point right (away from sun) + their angle
            let worldAngleRad;
            if (panel.offline) {
                // Base direction is left (π), angle offsets from there
                worldAngleRad = Math.PI + panel.angle * Math.PI / 180;
            } else {
                // Base direction is right (0), angle offsets from there
                worldAngleRad = panel.angle * Math.PI / 180;
            }
            
            // Panel rectangle - long side is PERPENDICULAR to facing direction
            // Direction along long side (perpendicular to arrow)
            const longDirX = Math.cos(worldAngleRad + Math.PI/2);
            const longDirY = Math.sin(worldAngleRad + Math.PI/2);
            
            // Direction along short side (parallel to arrow/facing direction)
            const shortDirX = Math.cos(worldAngleRad);
            const shortDirY = Math.sin(worldAngleRad);
            
            // Half-lengths for drawing from center
            const halfLong = panelLength / 2;
            const halfShort = panelWidth / 2;
            
            // Four corners of the panel (centered at px, py)
            const corners = [
                { x: px - longDirX * halfLong - shortDirX * halfShort, 
                  y: py - longDirY * halfLong - shortDirY * halfShort },
                { x: px + longDirX * halfLong - shortDirX * halfShort, 
                  y: py + longDirY * halfLong - shortDirY * halfShort },
                { x: px + longDirX * halfLong + shortDirX * halfShort, 
                  y: py + longDirY * halfLong + shortDirY * halfShort },
                { x: px - longDirX * halfLong + shortDirX * halfShort, 
                  y: py - longDirY * halfLong + shortDirY * halfShort }
            ];
            
            // Draw panel rectangle
            this.segments.push([corners[0].x, corners[0].y, corners[1].x, corners[1].y]);
            this.segments.push([corners[1].x, corners[1].y, corners[2].x, corners[2].y]);
            this.segments.push([corners[2].x, corners[2].y, corners[3].x, corners[3].y]);
            this.segments.push([corners[3].x, corners[3].y, corners[0].x, corners[0].y]);
            
            // Draw alignment arrow from center of long side (facing direction)
            const arrowStartX = px + shortDirX * halfShort;
            const arrowStartY = py + shortDirY * halfShort;
            const arrowTipX = arrowStartX + shortDirX * arrowLen;
            const arrowTipY = arrowStartY + shortDirY * arrowLen;
            const arrowHeadSize = 0.012;
            
            // Arrow shaft
            this.segments.push([arrowStartX, arrowStartY, arrowTipX, arrowTipY]);
            
            // Arrow head
            const headAngle1 = worldAngleRad + Math.PI * 0.8;
            const headAngle2 = worldAngleRad - Math.PI * 0.8;
            this.segments.push([
                arrowTipX, arrowTipY,
                arrowTipX + Math.cos(headAngle1) * arrowHeadSize,
                arrowTipY + Math.sin(headAngle1) * arrowHeadSize
            ]);
            this.segments.push([
                arrowTipX, arrowTipY,
                arrowTipX + Math.cos(headAngle2) * arrowHeadSize,
                arrowTipY + Math.sin(headAngle2) * arrowHeadSize
            ]);
            
            // Selected panel indicator (blinking bracket)
            if (i === this.selectedPanel && this.blinkOn) {
                const bracketSize = 0.025;
                this.segments.push([px - bracketSize, py - bracketSize, px - bracketSize, py + bracketSize]);
                this.segments.push([px - bracketSize, py + bracketSize, px + bracketSize, py + bracketSize]);
                this.segments.push([px + bracketSize, py + bracketSize, px + bracketSize, py - bracketSize]);
                this.segments.push([px + bracketSize, py - bracketSize, px - bracketSize, py - bracketSize]);
            }
            
            // Panel number label (to the side of each panel)
            // Offline panels (1,2) on left: label further left
            // Online panels (3,4) on right: label further right
            const labelX = panel.offline ? px - 0.04 : px + 0.04;
            this.drawText((i + 1).toString(), labelX, py);
        }
    }
    
    drawStatusPanel() {
        const y = 0.18;
        const lineHeight = 0.04;
        
        // Separator line
        this.segments.push([0.05, 0.22, 0.95, 0.22]);
        
        // Selected panel indicator
        const selectedLabel = this.panels[this.selectedPanel].offline 
            ? 'PANEL ' + (this.selectedPanel + 1) + ' [OFFLINE]'
            : 'PANEL ' + (this.selectedPanel + 1);
        this.drawText('SELECTED: ' + selectedLabel, 0.05, y);
        
        // Panel status row 1
        const p1Status = 'PANEL 1: OFFLINE';
        const p2Status = 'PANEL 2: OFFLINE';
        this.drawText(p1Status, 0.05, y - lineHeight);
        this.drawText(p2Status, 0.50, y - lineHeight);
        
        // Panel status row 2
        const p3Status = 'PANEL 3: ' + this.panels[2].power.toFixed(1) + '%';
        const p4Status = 'PANEL 4: ' + this.panels[3].power.toFixed(1) + '%';
        this.drawText(p3Status, 0.05, y - lineHeight * 2);
        this.drawText(p4Status, 0.50, y - lineHeight * 2);
        
        // Average power and status
        const avgPower = GameState.powerLevel;
        const status = avgPower >= SOLAR_POWER_CRITICAL ? 'LOW' : 'CRITICAL';
        const powerText = 'AVG POWER: ' + avgPower.toFixed(2) + '% [' + status + ']';
        this.drawText(powerText, 0.05, y - lineHeight * 3);
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
const solarProgram = new SolarProgram();

