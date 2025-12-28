// MOON TAXI - Space Taxi clone for oscilloscope display
// AIDEV-NOTE: Program interface: init(), update(deltaTime), getSegments(), handleKey(key, down)
// AIDEV-NOTE: Lunar lander physics with fuel management, endless mode with increasing difficulty

class MoonTaxiGame {
    constructor() {
        this.segments = [];
        this.keys = { w: false, a: false, d: false };
        
        // Game bounds (UV space 0-1)
        this.minX = 0.05;
        this.maxX = 0.95;
        this.minY = 0.08;  // Ground level
        this.maxY = 0.92;  // Ceiling
        
        // Physics constants
        this.GRAVITY = 0.15;
        this.THRUST = 0.45;
        this.ROTATION_SPEED = 3.0;
        this.MAX_LANDING_VELOCITY = 0.12;
        this.MAX_LANDING_ANGLE = 0.35;  // radians from vertical
        this.FUEL_CONSUMPTION = 0.15;   // per second while thrusting
        this.FUEL_REFILL_RATE = 0.4;    // per second on depot
        
        // Ship state
        this.ship = {
            x: 0.5,
            y: 0.7,
            angle: 0,  // 0 = pointing up
            vx: 0,
            vy: 0,
            fuel: 1.0,
            hasPassenger: false,
            landed: false,
            landedPlatform: null
        };
        
        // Platforms (fixed layout)
        this.platforms = [];
        
        // Passenger state
        this.passenger = {
            platform: null,      // Index of platform passenger is on
            destination: null,   // Index of destination platform
            state: 'none'        // 'none', 'waiting', 'aboard', 'exiting'
        };
        
        // Game state
        this.score = 0;
        this.deliveries = 0;
        this.gameOver = false;
        this.gameOverReason = '';
        this.difficultyMultiplier = 1.0;
        
        // Timing
        this.boardingTimer = 0;
        this.exitingTimer = 0;
        this.messageTimer = 0;
        this.message = '';
        
        this.init();
    }
    
    init() {
        this.segments = [];
        this.score = 0;
        this.deliveries = 0;
        this.gameOver = false;
        this.gameOverReason = '';
        this.difficultyMultiplier = 1.0;
        this.boardingTimer = 0;
        this.exitingTimer = 0;
        this.messageTimer = 0;
        this.message = '';
        
        // Reset ship
        this.ship.x = 0.5;
        this.ship.y = 0.7;
        this.ship.angle = 0;
        this.ship.vx = 0;
        this.ship.vy = 0;
        this.ship.fuel = 1.0;
        this.ship.hasPassenger = false;
        this.ship.landed = false;
        this.ship.landedPlatform = null;
        
        // Create platforms
        this.createPlatforms();
        
        // Spawn first passenger
        this.spawnPassenger();
    }
    
    createPlatforms() {
        // Fixed platform layout for consistent gameplay
        // Each platform: { x, y, width, label, isDepot }
        this.platforms = [
            { x: 0.08, y: 0.25, width: 0.12, label: 'A', isDepot: false },
            { x: 0.30, y: 0.45, width: 0.10, label: 'B', isDepot: false },
            { x: 0.55, y: 0.30, width: 0.11, label: 'C', isDepot: false },
            { x: 0.78, y: 0.50, width: 0.12, label: 'D', isDepot: false },
            { x: 0.45, y: 0.65, width: 0.14, label: 'DEPOT', isDepot: true },
        ];
    }
    
    spawnPassenger() {
        // Pick random platform for passenger (not depot)
        const nonDepotPlatforms = this.platforms
            .map((p, i) => ({ platform: p, index: i }))
            .filter(p => !p.platform.isDepot);
        
        const pickupChoice = nonDepotPlatforms[Math.floor(Math.random() * nonDepotPlatforms.length)];
        
        // Pick different platform for destination (can be depot)
        const otherPlatforms = this.platforms
            .map((p, i) => ({ platform: p, index: i }))
            .filter(p => p.index !== pickupChoice.index);
        
        const destChoice = otherPlatforms[Math.floor(Math.random() * otherPlatforms.length)];
        
        this.passenger = {
            platform: pickupChoice.index,
            destination: destChoice.index,
            state: 'waiting'
        };
        
        this.showMessage('FARE AT ' + pickupChoice.platform.label);
    }
    
    showMessage(msg) {
        this.message = msg;
        this.messageTimer = 2.0;
    }
    
    handleKey(key, down) {
        const k = key.toLowerCase();
        if (k === 'w' || k === 'arrowup') this.keys.w = down;
        if (k === 'a' || k === 'arrowleft') this.keys.a = down;
        if (k === 'd' || k === 'arrowright') this.keys.d = down;
        if (k === ' ' || k === 'space' || key === 'Space') {
            if (down && this.gameOver) {
                this.init();
            }
        }
    }
    
    update(deltaTime) {
        if (this.gameOver) {
            this.generateSegments();
            return;
        }
        
        // Update message timer
        if (this.messageTimer > 0) {
            this.messageTimer -= deltaTime;
        }
        
        // Handle boarding/exiting delays
        if (this.boardingTimer > 0) {
            this.boardingTimer -= deltaTime;
            if (this.boardingTimer <= 0) {
                this.ship.hasPassenger = true;
                this.passenger.state = 'aboard';
                const dest = this.platforms[this.passenger.destination];
                this.showMessage('TO ' + dest.label + '!');
            }
            this.generateSegments();
            return;
        }
        
        if (this.exitingTimer > 0) {
            this.exitingTimer -= deltaTime;
            if (this.exitingTimer <= 0) {
                this.completeDelivery();
            }
            this.generateSegments();
            return;
        }
        
        const s = this.ship;
        const gravity = this.GRAVITY * this.difficultyMultiplier;
        
        // Only apply physics if not landed
        if (!s.landed) {
            // Rotation
            if (this.keys.a) s.angle -= this.ROTATION_SPEED * deltaTime;
            if (this.keys.d) s.angle += this.ROTATION_SPEED * deltaTime;
            
            // Thrust (if fuel available)
            if (this.keys.w && s.fuel > 0) {
                const thrust = this.THRUST * deltaTime;
                // Thrust in direction ship is pointing (angle 0 = up)
                s.vx += Math.sin(s.angle) * thrust;
                s.vy += Math.cos(s.angle) * thrust;
                s.fuel -= this.FUEL_CONSUMPTION * deltaTime;
                s.fuel = Math.max(0, s.fuel);
            }
            
            // Gravity
            s.vy -= gravity * deltaTime;
            
            // Apply velocity
            s.x += s.vx * deltaTime;
            s.y += s.vy * deltaTime;
            
            // Check wall collisions (game over)
            if (s.x < this.minX || s.x > this.maxX) {
                this.triggerGameOver('HIT WALL');
                return;
            }
            if (s.y > this.maxY) {
                this.triggerGameOver('HIT CEILING');
                return;
            }
            
            // Check ground collision
            if (s.y < this.minY) {
                this.triggerGameOver('CRASHED');
                return;
            }
            
            // Check platform landings/collisions
            this.checkPlatformCollisions();
            
            // Check if out of fuel while flying
            if (s.fuel <= 0 && s.y > this.minY + 0.1) {
                // Give player a chance if close to ground
                // Game over only triggers on crash
            }
        } else {
            // Landed - check for takeoff
            if (this.keys.w && s.fuel > 0) {
                s.landed = false;
                s.landedPlatform = null;
                s.vy = 0.05;  // Small boost on takeoff
            }
            
            // Refuel on depot
            if (s.landedPlatform !== null) {
                const platform = this.platforms[s.landedPlatform];
                if (platform.isDepot && s.fuel < 1.0) {
                    s.fuel += this.FUEL_REFILL_RATE * deltaTime;
                    s.fuel = Math.min(1.0, s.fuel);
                }
            }
        }
        
        this.generateSegments();
    }
    
    checkPlatformCollisions() {
        const s = this.ship;
        const shipBottom = s.y - 0.015;  // Bottom of ship
        const shipLeft = s.x - 0.015;
        const shipRight = s.x + 0.015;
        
        for (let i = 0; i < this.platforms.length; i++) {
            const p = this.platforms[i];
            const platLeft = p.x;
            const platRight = p.x + p.width;
            const platTop = p.y;
            
            // Check if ship is over platform horizontally
            if (shipRight > platLeft && shipLeft < platRight) {
                // Check if descending onto platform
                if (shipBottom <= platTop && shipBottom > platTop - 0.03) {
                    // Check landing conditions
                    const speed = Math.sqrt(s.vx * s.vx + s.vy * s.vy);
                    const angleFromVertical = Math.abs(s.angle % (Math.PI * 2));
                    const normalizedAngle = angleFromVertical > Math.PI ? 
                        Math.PI * 2 - angleFromVertical : angleFromVertical;
                    
                    if (speed > this.MAX_LANDING_VELOCITY) {
                        this.triggerGameOver('TOO FAST');
                        return;
                    }
                    
                    if (normalizedAngle > this.MAX_LANDING_ANGLE) {
                        this.triggerGameOver('BAD ANGLE');
                        return;
                    }
                    
                    // Successful landing!
                    this.land(i);
                    return;
                }
            }
        }
    }
    
    land(platformIndex) {
        const s = this.ship;
        const p = this.platforms[platformIndex];
        
        s.landed = true;
        s.landedPlatform = platformIndex;
        s.vx = 0;
        s.vy = 0;
        s.y = p.y + 0.015;  // Snap to platform
        s.angle = 0;  // Straighten up
        
        // Check passenger interactions
        if (this.passenger.state === 'waiting' && this.passenger.platform === platformIndex) {
            // Passenger boards
            this.boardingTimer = 0.8;
            this.passenger.state = 'boarding';
            this.showMessage('BOARDING...');
        } else if (this.passenger.state === 'aboard' && this.passenger.destination === platformIndex) {
            // Passenger exits
            this.exitingTimer = 0.6;
            this.passenger.state = 'exiting';
            this.showMessage('EXITING...');
        }
        
        // Show depot message
        if (p.isDepot && s.fuel < 0.5) {
            this.showMessage('REFUELING...');
        }
    }
    
    completeDelivery() {
        this.deliveries++;
        const points = 100 + Math.floor(this.ship.fuel * 50);  // Bonus for fuel efficiency
        this.score += points;
        this.ship.hasPassenger = false;
        this.passenger.state = 'none';
        
        // Increase difficulty every 3 deliveries
        if (this.deliveries % 3 === 0) {
            this.difficultyMultiplier += 0.1;
            this.showMessage('GRAVITY INCREASING!');
        } else {
            this.showMessage('+' + points + ' POINTS!');
        }
        
        // Spawn next passenger after short delay
        setTimeout(() => {
            if (!this.gameOver) {
                this.spawnPassenger();
            }
        }, 1500);
    }
    
    triggerGameOver(reason) {
        this.gameOver = true;
        this.gameOverReason = reason;
    }
    
    generateSegments() {
        this.segments = [];
        
        // When game over, only draw the game over screen
        if (this.gameOver) {
            this.drawGameOver();
            return;
        }
        
        // Draw platforms
        this.drawPlatforms();
        
        // Draw ship
        this.drawShip();
        
        // Draw passenger (if waiting)
        if (this.passenger.state === 'waiting') {
            this.drawPassenger(this.passenger.platform);
        }
        
        // Draw HUD
        this.drawHUD();
    }
    
    drawPlatforms() {
        for (let i = 0; i < this.platforms.length; i++) {
            const p = this.platforms[i];
            const left = p.x;
            const right = p.x + p.width;
            const top = p.y;
            
            // Platform surface
            this.segments.push([left, top, right, top]);
            
            // Support struts
            const strutHeight = 0.03;
            this.segments.push([left + 0.01, top, left + 0.01, top - strutHeight]);
            this.segments.push([right - 0.01, top, right - 0.01, top - strutHeight]);
            
            // Platform label
            const labelX = p.x + p.width / 2 - (p.label.length * 0.01);
            this.drawText(p.label, labelX, p.y - 0.045, 0.015);
            
            // Highlight destination platform when passenger aboard
            if (this.passenger.state === 'aboard' && this.passenger.destination === i) {
                // Draw arrows pointing down
                const cx = p.x + p.width / 2;
                this.segments.push([cx, top + 0.04, cx - 0.015, top + 0.06]);
                this.segments.push([cx, top + 0.04, cx + 0.015, top + 0.06]);
                this.segments.push([cx, top + 0.04, cx, top + 0.07]);
            }
        }
        
        // Draw ground line
        this.segments.push([this.minX, this.minY, this.maxX, this.minY]);
    }
    
    drawShip() {
        const s = this.ship;
        const size = 0.02;
        
        // Ship body (triangle pointing in direction of angle)
        // angle 0 = pointing up
        const sin = Math.sin(s.angle);
        const cos = Math.cos(s.angle);
        
        // Nose (top when upright)
        const nose = {
            x: s.x + sin * size,
            y: s.y + cos * size
        };
        
        // Left and right bottom corners
        const left = {
            x: s.x + Math.sin(s.angle - 2.4) * size * 0.7,
            y: s.y + Math.cos(s.angle - 2.4) * size * 0.7
        };
        const right = {
            x: s.x + Math.sin(s.angle + 2.4) * size * 0.7,
            y: s.y + Math.cos(s.angle + 2.4) * size * 0.7
        };
        
        // Draw body
        this.segments.push([nose.x, nose.y, left.x, left.y]);
        this.segments.push([left.x, left.y, right.x, right.y]);
        this.segments.push([right.x, right.y, nose.x, nose.y]);
        
        // Landing legs
        const legLen = 0.012;
        const leftLeg = {
            x: left.x - Math.sin(s.angle + 0.5) * legLen,
            y: left.y - Math.cos(s.angle + 0.5) * legLen
        };
        const rightLeg = {
            x: right.x - Math.sin(s.angle - 0.5) * legLen,
            y: right.y - Math.cos(s.angle - 0.5) * legLen
        };
        this.segments.push([left.x, left.y, leftLeg.x, leftLeg.y]);
        this.segments.push([right.x, right.y, rightLeg.x, rightLeg.y]);
        
        // Thrust flame
        if (this.keys.w && s.fuel > 0 && !s.landed) {
            const flameBase = {
                x: (left.x + right.x) / 2,
                y: (left.y + right.y) / 2
            };
            const flameLen = size * (0.8 + Math.random() * 0.5);
            const flameTip = {
                x: s.x - sin * flameLen,
                y: s.y - cos * flameLen
            };
            this.segments.push([flameBase.x, flameBase.y, flameTip.x, flameTip.y]);
            
            // Flame spread
            const spread = 0.008;
            this.segments.push([
                flameBase.x - cos * spread,
                flameBase.y + sin * spread,
                flameTip.x,
                flameTip.y
            ]);
            this.segments.push([
                flameBase.x + cos * spread,
                flameBase.y - sin * spread,
                flameTip.x,
                flameTip.y
            ]);
        }
        
        // Passenger indicator (small dot on ship when carrying)
        if (s.hasPassenger) {
            const dotSize = 0.005;
            this.segments.push([s.x - dotSize, s.y, s.x + dotSize, s.y]);
            this.segments.push([s.x, s.y - dotSize, s.x, s.y + dotSize]);
        }
    }
    
    drawPassenger(platformIndex) {
        const p = this.platforms[platformIndex];
        const px = p.x + p.width / 2 + 0.02;  // Slightly off-center
        const py = p.y;
        
        // Stick figure
        const h = 0.025;  // Height
        
        // Head (small circle approximation)
        const headY = py + h;
        const headR = 0.005;
        this.segments.push([px - headR, headY, px, headY + headR]);
        this.segments.push([px, headY + headR, px + headR, headY]);
        this.segments.push([px + headR, headY, px, headY - headR]);
        this.segments.push([px, headY - headR, px - headR, headY]);
        
        // Body
        const bodyTop = py + h - 0.008;
        const bodyBot = py + h * 0.4;
        this.segments.push([px, bodyTop, px, bodyBot]);
        
        // Arms (waving)
        const armY = bodyTop - 0.005;
        const wave = Math.sin(Date.now() / 200) * 0.005;
        this.segments.push([px, armY, px - 0.01, armY + 0.008 + wave]);
        this.segments.push([px, armY, px + 0.01, armY + 0.008 - wave]);
        
        // Legs
        this.segments.push([px, bodyBot, px - 0.006, py + 0.002]);
        this.segments.push([px, bodyBot, px + 0.006, py + 0.002]);
    }
    
    drawHUD() {
        // Exit instruction
        this.drawText('EXIT: CTRL-C', 0.35, 0.96, 0.018);
        
        // Score (top left)
        this.drawText('SCORE: ' + this.score, 0.05, 0.88, 0.015);
        
        // Deliveries
        this.drawText('FARES: ' + this.deliveries, 0.05, 0.84, 0.012);
        
        // Fuel bar (top right)
        this.drawText('FUEL', 0.75, 0.88, 0.012);
        this.drawFuelBar(0.75, 0.85, 0.18, this.ship.fuel);
        
        // Message display
        if (this.messageTimer > 0 && this.message) {
            const msgX = 0.5 - (this.message.length * 0.01);
            this.drawText(this.message, msgX, 0.50, 0.02);
        }
        
        // Destination indicator when passenger aboard
        if (this.passenger.state === 'aboard') {
            const dest = this.platforms[this.passenger.destination];
            const destText = 'TO: ' + dest.label;
            this.drawText(destText, 0.42, 0.78, 0.018);
        }
    }
    
    drawFuelBar(x, y, width, fill) {
        const height = 0.015;
        
        // Outline
        this.segments.push([x, y, x + width, y]);
        this.segments.push([x, y - height, x + width, y - height]);
        this.segments.push([x, y, x, y - height]);
        this.segments.push([x + width, y, x + width, y - height]);
        
        // Fill
        const fillWidth = Math.max(0, Math.min(1, fill)) * (width - 0.004);
        if (fillWidth > 0.002) {
            const innerY = y - 0.003;
            const innerH = height - 0.006;
            this.segments.push([x + 0.002, innerY, x + 0.002 + fillWidth, innerY]);
            this.segments.push([x + 0.002, innerY - innerH, x + 0.002 + fillWidth, innerY - innerH]);
        }
        
        // Warning indicator when low
        if (fill < 0.25) {
            if (Math.floor(Date.now() / 300) % 2 === 0) {
                this.drawText('LOW', x + width + 0.01, y - 0.003, 0.01);
            }
        }
    }
    
    drawGameOver() {
        this.drawText('GAME OVER', 0.35, 0.58, 0.025);
        this.drawText(this.gameOverReason, 0.38, 0.52, 0.018);
        this.drawText('SCORE: ' + this.score, 0.38, 0.45, 0.015);
        this.drawText('FARES: ' + this.deliveries, 0.38, 0.40, 0.015);
        this.drawText('SPACE TO RESTART', 0.30, 0.33, 0.015);
    }
    
    drawText(text, x, y, size = 0.018) {
        const charWidth = size;
        const charHeight = size * 1.3;
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
const moonTaxiGame = new MoonTaxiGame();

