// REACTOR - Plasma Containment Reactor Control
// AIDEV-NOTE: Program interface: init(), update(deltaTime), getSegments(), handleKey(key, down)
// AIDEV-NOTE: Lissajous-style plasma path shaped by magnetic pole counts on each wall
// AIDEV-NOTE: Crystals repel plasma, targets must be hit, hold SPACE 5s to sustain

// Reactor states
const REACTOR_STATE_IDLE = 'idle';
const REACTOR_STATE_INJECTING = 'injecting';
const REACTOR_STATE_SUCCESS = 'success';
const REACTOR_STATE_FAILURE = 'failure';

// Layout constants (UV coordinates 0-1)
const REACTOR_CHAMBER_LEFT = 0.03;
const REACTOR_CHAMBER_RIGHT = 0.62;
const REACTOR_CHAMBER_TOP = 0.92;
const REACTOR_CHAMBER_BOTTOM = 0.08;
const REACTOR_SIDEBAR_LEFT = 0.65;
const REACTOR_SIDEBAR_RIGHT = 0.97;

// Chamber dimensions
const REACTOR_CHAMBER_CENTER_X = (REACTOR_CHAMBER_LEFT + REACTOR_CHAMBER_RIGHT) / 2;
const REACTOR_CHAMBER_CENTER_Y = (REACTOR_CHAMBER_TOP + REACTOR_CHAMBER_BOTTOM) / 2;
const REACTOR_CHAMBER_RADIUS_X = (REACTOR_CHAMBER_RIGHT - REACTOR_CHAMBER_LEFT) / 2 * 0.85;
const REACTOR_CHAMBER_RADIUS_Y = (REACTOR_CHAMBER_TOP - REACTOR_CHAMBER_BOTTOM) / 2 * 0.85;

// Sustain time required for success
const REACTOR_SUSTAIN_TIME = 5.0;

// Plasma particle settings
const REACTOR_PLASMA_SPEED = 3.0;       // Base speed multiplier
const REACTOR_PARTICLE_LIFETIME = 6.0;  // How long each particle lives (seconds)
const REACTOR_PARTICLE_SPAWN_RATE = 30; // Particles per second
const REACTOR_PARTICLE_SIZE = 0.006;    // Size of each particle

class ReactorProgram {
    constructor() {
        this.segments = [];
        
        // Program state
        this.state = REACTOR_STATE_IDLE;
        this.sustainTimer = 0;
        this.failureMessage = '';
        this.successTimer = 0;  // For success animation
        
        // Parameter definitions
        // AIDEV-NOTE: Each parameter has name, value, min, max, step, display format, and hidden flag
        // AIDEV-NOTE: HEAT is hidden for now - doesn't have meaningful gameplay impact yet
        // AIDEV-NOTE: H-PHASE and V-PHASE control Lissajous frequencies (non-integer for smooth curves)
        this.parameters = [
            { name: 'RATE',    value: 50,  min: 10, max: 100, step: 5,   format: (v) => v + '%', hidden: false },
            { name: 'ANGLE',   value: 0,   min: -90, max: 90, step: 5,   format: (v) => (v >= 0 ? '+' : '') + v + '°', hidden: false },
            { name: 'HEAT',    value: 30,  min: 10, max: 100, step: 5,   format: (v) => v + '%', hidden: true },
            { name: 'H-PHASE', value: 2.0, min: 0.5, max: 4.0, step: 0.1, format: (v) => v.toFixed(1), hidden: false },
            { name: 'V-PHASE', value: 2.0, min: 0.5, max: 4.0, step: 0.1, format: (v) => v.toFixed(1), hidden: false }
        ];
        
        // Visible parameters (for UI navigation)
        this.visibleParams = this.parameters.filter(p => !p.hidden);
        
        this.selectedParam = 0;
        
        // Crystals - 4 fixed positions forming inner square
        // AIDEV-NOTE: Crystals repel plasma, creating obstacles
        const crystalOffset = 0.08;
        this.crystals = [
            { x: REACTOR_CHAMBER_CENTER_X - crystalOffset, y: REACTOR_CHAMBER_CENTER_Y + crystalOffset * 1.2, radius: 0.025, repulsionRadius: 0.08, strength: 0.015 },
            { x: REACTOR_CHAMBER_CENTER_X + crystalOffset, y: REACTOR_CHAMBER_CENTER_Y + crystalOffset * 1.2, radius: 0.025, repulsionRadius: 0.08, strength: 0.015 },
            { x: REACTOR_CHAMBER_CENTER_X - crystalOffset, y: REACTOR_CHAMBER_CENTER_Y - crystalOffset * 1.2, radius: 0.025, repulsionRadius: 0.08, strength: 0.015 },
            { x: REACTOR_CHAMBER_CENTER_X + crystalOffset, y: REACTOR_CHAMBER_CENTER_Y - crystalOffset * 1.2, radius: 0.025, repulsionRadius: 0.08, strength: 0.015 }
        ];
        
        // Targets - points plasma must pass through
        // AIDEV-NOTE: 6 targets: 2 in center (between crystals) + 4 in corners
        const cornerOffsetX = 0.12;
        const cornerOffsetY = 0.15;
        this.targets = [
            // Center targets (between crystals)
            { x: REACTOR_CHAMBER_CENTER_X, y: REACTOR_CHAMBER_CENTER_Y + 0.06, radius: 0.025, hit: false },
            { x: REACTOR_CHAMBER_CENTER_X, y: REACTOR_CHAMBER_CENTER_Y - 0.06, radius: 0.025, hit: false },
            // Corner targets
            { x: REACTOR_CHAMBER_CENTER_X - cornerOffsetX, y: REACTOR_CHAMBER_CENTER_Y + cornerOffsetY, radius: 0.025, hit: false },
            { x: REACTOR_CHAMBER_CENTER_X + cornerOffsetX, y: REACTOR_CHAMBER_CENTER_Y + cornerOffsetY, radius: 0.025, hit: false },
            { x: REACTOR_CHAMBER_CENTER_X - cornerOffsetX, y: REACTOR_CHAMBER_CENTER_Y - cornerOffsetY, radius: 0.025, hit: false },
            { x: REACTOR_CHAMBER_CENTER_X + cornerOffsetX, y: REACTOR_CHAMBER_CENTER_Y - cornerOffsetY, radius: 0.025, hit: false }
        ];
        
        // Plasma particle simulation state
        this.plasmaTime = 0;
        this.particles = [];  // Array of {birthTime, x, y} - each particle tracks when it was born
        this.particleSpawnAccum = 0;  // Accumulator for spawning particles
        
        // Collision tracking - allow up to 10% crystal hits before failure
        this.crystalHitCount = 0;
        this.totalParticleCount = 0;
        
        // Injector position (bottom center of chamber)
        this.injectorX = REACTOR_CHAMBER_CENTER_X;
        this.injectorY = REACTOR_CHAMBER_BOTTOM + 0.04;
        
        // Animation
        this.blinkTimer = 0;
        this.blinkOn = true;
        
        // Space key state for hold detection
        this.spaceHeld = false;
        
        // Debug mode - D to toggle
        // AIDEV-NOTE: Debug mode: no collisions, continuous particle emission, 8s lifetime
        this.debugMode = false;
    }
    
    init() {
        this.segments = [];
        this.state = REACTOR_STATE_IDLE;
        this.sustainTimer = 0;
        this.failureMessage = '';
        this.successTimer = 0;
        this.plasmaTime = 0;
        this.particles = [];
        this.particleSpawnAccum = 0;
        this.spaceHeld = false;
        
        // Reset target hit states
        for (const target of this.targets) {
            target.hit = false;
        }
    }
    
    handleKey(key, down) {
        const k = key.toLowerCase();
        
        // Space key - hold to inject
        if (key === ' ') {
            if (down && !this.spaceHeld) {
                // Space pressed - start injection
                this.spaceHeld = true;
                if (this.state === REACTOR_STATE_IDLE || this.state === REACTOR_STATE_FAILURE) {
                    this.startInjection();
                }
            } else if (!down && this.spaceHeld) {
                // Space released
                this.spaceHeld = false;
                if (this.state === REACTOR_STATE_INJECTING) {
                    // Released too early - failure
                    this.state = REACTOR_STATE_FAILURE;
                    this.failureMessage = 'RELEASED TOO EARLY';
                }
            }
            return;
        }
        
        // D key - toggle debug mode
        if (k === 'd' && down) {
            this.debugMode = !this.debugMode;
            if (this.debugMode) {
                // Start continuous emission in debug mode
                this.state = REACTOR_STATE_INJECTING;
                this.plasmaTime = 0;
                this.particles = [];
                this.particleSpawnAccum = 0;
            }
            return;
        }
        
        // Only allow parameter adjustment in IDLE or FAILURE state (or debug mode)
        if (!this.debugMode && this.state !== REACTOR_STATE_IDLE && this.state !== REACTOR_STATE_FAILURE) {
            return;
        }
        
        if (!down) return;
        
        // Parameter selection (only visible params)
        if (k === 'arrowup' || k === 'w') {
            this.selectedParam = (this.selectedParam - 1 + this.visibleParams.length) % this.visibleParams.length;
        } else if (k === 'arrowdown' || k === 's') {
            this.selectedParam = (this.selectedParam + 1) % this.visibleParams.length;
        }
        
        // Parameter adjustment (using visible params)
        const param = this.visibleParams[this.selectedParam];
        if (k === 'arrowleft' || k === 'a') {
            param.value = Math.max(param.min, param.value - param.step);
        } else if (k === 'arrowright' || k === 'd') {
            param.value = Math.min(param.max, param.value + param.step);
        }
    }
    
    startInjection() {
        this.state = REACTOR_STATE_INJECTING;
        this.sustainTimer = 0;
        this.plasmaTime = 0;
        this.particles = [];
        this.particleSpawnAccum = 0;
        this.failureMessage = '';
        
        // Reset collision tracking
        this.crystalHitCount = 0;
        this.totalParticleCount = 0;
        
        // Reset target hit states
        for (const target of this.targets) {
            target.hit = false;
        }
    }
    
    update(deltaTime) {
        // Blink timer for UI
        this.blinkTimer += deltaTime;
        if (this.blinkTimer >= 0.4) {
            this.blinkTimer = 0;
            this.blinkOn = !this.blinkOn;
        }
        
        // State-specific updates
        if (this.state === REACTOR_STATE_INJECTING) {
            this.updatePlasma(deltaTime);
            
            // Don't accumulate sustain timer in debug mode
            if (!this.debugMode) {
                this.sustainTimer += deltaTime;
            }
            
            // Check for success (skip in debug mode)
            if (!this.debugMode && this.sustainTimer >= REACTOR_SUSTAIN_TIME) {
                // Check all targets were hit
                const allTargetsHit = this.targets.every(t => t.hit);
                if (allTargetsHit) {
                    this.state = REACTOR_STATE_SUCCESS;
                    this.successTimer = 0;
                } else {
                    this.state = REACTOR_STATE_FAILURE;
                    this.failureMessage = 'TARGETS NOT HIT';
                }
            }
        } else if (this.state === REACTOR_STATE_SUCCESS) {
            this.successTimer += deltaTime;
            // Keep plasma running in success state for visual effect
            this.updatePlasma(deltaTime);
        }
        
        this.generateSegments();
    }
    
    updatePlasma(deltaTime) {
        // Get parameter values
        const rate = this.parameters[0].value / 100;      // 0-1
        const angle = this.parameters[1].value;           // degrees
        const heat = this.parameters[2].value / 100;      // 0-1
        const hPhase = this.parameters[3].value;          // horizontal frequency
        const vPhase = this.parameters[4].value;          // vertical frequency
        
        // Use phase values directly as frequencies
        const freqX = hPhase;
        const freqY = vPhase;
        
        // Angle in radians
        const angleRad = angle * Math.PI / 180;
        
        // Speed scales with heat
        const speed = REACTOR_PLASMA_SPEED * (0.5 + heat * 1.5);
        this.plasmaTime += deltaTime * speed;
        
        // Particle lifetime (longer in debug mode)
        const particleLifetime = this.debugMode ? 8.0 : REACTOR_PARTICLE_LIFETIME;
        
        // In success state: don't spawn new particles, don't expire existing ones
        if (this.state !== REACTOR_STATE_SUCCESS) {
            // Spawn new particles
            this.particleSpawnAccum += deltaTime * REACTOR_PARTICLE_SPAWN_RATE;
            while (this.particleSpawnAccum >= 1) {
                this.particleSpawnAccum -= 1;
                // Each particle remembers when it was born (in plasma time units)
                this.particles.push({ birthTime: this.plasmaTime, hitCrystal: false });
                this.totalParticleCount++;
            }
            
            // Remove old particles
            this.particles = this.particles.filter(p => 
                (this.plasmaTime - p.birthTime) < particleLifetime * speed
            );
        }
        
        // Update each particle's position and check for collisions
        for (const particle of this.particles) {
            const particleAge = this.plasmaTime - particle.birthTime;
            
            // AIDEV-NOTE: Plasma enters from injector at bottom, then gets captured by magnetic field
            // The entry phase (first ~0.5 time units) ramps the plasma up from injector to the Lissajous path
            const entryDuration = 0.5;
            const entryProgress = Math.min(particleAge / entryDuration, 1);
            
            // Lissajous center position - starts at injector, moves to chamber center
            const centerX = REACTOR_CHAMBER_CENTER_X;
            const centerY = this.injectorY + (REACTOR_CHAMBER_CENTER_Y - this.injectorY) * entryProgress;
            
            // Amplitude ramps up during entry phase
            const amplitudeScale = entryProgress * rate;
            
            // Calculate plasma position using Lissajous-style path (unrotated)
            const localX = Math.sin(freqX * particleAge) * REACTOR_CHAMBER_RADIUS_X * amplitudeScale;
            const localY = Math.sin(freqY * particleAge) * REACTOR_CHAMBER_RADIUS_Y * amplitudeScale * 0.8;
            
            // AIDEV-NOTE: Rotate the entire path by injection angle for real directional control
            const cosAngle = Math.cos(angleRad);
            const sinAngle = Math.sin(angleRad);
            let x = centerX + localX * cosAngle - localY * sinAngle;
            let y = centerY + localX * sinAngle + localY * cosAngle;
            
            // Add randomness to particle position - use birthTime as seed for consistent per-particle offset
            const randomAmount = 0.015;
            const noiseSeed = particle.birthTime * 1000;
            x += Math.sin(noiseSeed) * randomAmount;
            y += Math.cos(noiseSeed * 1.7) * randomAmount;
            
            // Additional heat instability
            const noiseAmount = heat * 0.02;
            x += Math.sin(noiseSeed * 3.1 + particleAge * 5) * noiseAmount;
            y += Math.cos(noiseSeed * 2.3 + particleAge * 5) * noiseAmount;
            
            // Apply crystal repulsion
            for (const crystal of this.crystals) {
                const dx = x - crystal.x;
                const dy = y - crystal.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                if (dist < crystal.repulsionRadius && dist > 0.001) {
                    const force = (1 - dist / crystal.repulsionRadius) * crystal.strength;
                    x += (dx / dist) * force;
                    y += (dy / dist) * force;
                }
                
                // Check for crystal collision (skip in debug mode and success state)
                // Track hits instead of immediate failure - allow up to 50% hit rate
                if (!this.debugMode && this.state !== REACTOR_STATE_SUCCESS && dist < crystal.radius && !particle.hitCrystal) {
                    particle.hitCrystal = true;
                    this.crystalHitCount++;
                    
                    // Check if hit rate exceeds 50%
                    if (this.totalParticleCount > 20) {  // Need minimum sample size
                        const hitRate = this.crystalHitCount / this.totalParticleCount;
                        if (hitRate > 0.50 && this.state === REACTOR_STATE_INJECTING) {
                            this.state = REACTOR_STATE_FAILURE;
                            this.failureMessage = 'CRYSTAL COLLISION (' + Math.round(hitRate * 100) + '%)';
                            return;
                        }
                    }
                }
            }
            
            // Calculate direction of movement by looking slightly ahead in time
            // AIDEV-NOTE: Need direction before wall check to only fail when moving toward wall
            const lookAhead = 0.05;
            const futureAge = particleAge + lookAhead;
            const futureEntryProgress = Math.min(futureAge / entryDuration, 1);
            const futureCenterY = this.injectorY + (REACTOR_CHAMBER_CENTER_Y - this.injectorY) * futureEntryProgress;
            const futureAmplitudeScale = futureEntryProgress * rate;
            const futureLocalX = Math.sin(freqX * futureAge) * REACTOR_CHAMBER_RADIUS_X * futureAmplitudeScale;
            const futureLocalY = Math.sin(freqY * futureAge) * REACTOR_CHAMBER_RADIUS_Y * futureAmplitudeScale * 0.8;
            const futureX = REACTOR_CHAMBER_CENTER_X + futureLocalX * cosAngle - futureLocalY * sinAngle;
            const futureY = futureCenterY + futureLocalX * sinAngle + futureLocalY * cosAngle;
            
            // Direction vector (normalized)
            const dirDx = futureX - x;
            const dirDy = futureY - y;
            const dirLen = Math.sqrt(dirDx * dirDx + dirDy * dirDy);
            const dirX = dirLen > 0.0001 ? dirDx / dirLen : 0;
            const dirY = dirLen > 0.0001 ? dirDy / dirLen : 1;
            
            // Check for wall collision (skip in debug mode)
            // Only fail if particle is near wall AND moving toward it
            const wallMargin = 0.02;
            if (!this.debugMode && this.state === REACTOR_STATE_INJECTING) {
                let wallBreach = false;
                
                // Check left wall - only if moving left (dirX < 0)
                if (x < REACTOR_CHAMBER_LEFT + wallMargin && dirX < 0) {
                    wallBreach = true;
                }
                // Check right wall - only if moving right (dirX > 0)
                if (x > REACTOR_CHAMBER_RIGHT - wallMargin && dirX > 0) {
                    wallBreach = true;
                }
                // Check bottom wall - only if moving down (dirY < 0)
                if (y < REACTOR_CHAMBER_BOTTOM + wallMargin && dirY < 0) {
                    wallBreach = true;
                }
                // Check top wall - only if moving up (dirY > 0)
                if (y > REACTOR_CHAMBER_TOP - wallMargin && dirY > 0) {
                    wallBreach = true;
                }
                
                if (wallBreach) {
                    this.state = REACTOR_STATE_FAILURE;
                    this.failureMessage = 'WALL BREACH';
                    return;
                }
            }
            
            // Check for target hits
            for (const target of this.targets) {
                const dx = x - target.x;
                const dy = y - target.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < target.radius) {
                    target.hit = true;
                }
            }
            
            // Store calculated position and direction on particle for drawing
            particle.x = x;
            particle.y = y;
            particle.dirX = dirX;
            particle.dirY = dirY;
            particle.age = particleAge;
        }
    }
    
    generateSegments() {
        this.segments = [];
        
        // Draw chamber
        this.drawChamber();
        
        // Draw crystals
        this.drawCrystals();
        
        // Draw targets
        this.drawTargets();
        
        // Draw injector
        this.drawInjector();
        
        // Draw plasma particles (if injecting or success)
        if (this.state === REACTOR_STATE_INJECTING || this.state === REACTOR_STATE_SUCCESS) {
            this.drawPlasmaParticles();
        }
        
        // Draw sidebar
        this.drawSidebar();
        
        // Draw status bar at bottom of chamber
        this.drawStatusBar();
    }
    
    drawChamber() {
        // Chamber border
        const l = REACTOR_CHAMBER_LEFT;
        const r = REACTOR_CHAMBER_RIGHT;
        const t = REACTOR_CHAMBER_TOP;
        const b = REACTOR_CHAMBER_BOTTOM;
        
        this.segments.push([l, b, r, b]);  // Bottom
        this.segments.push([r, b, r, t]);  // Right
        this.segments.push([r, t, l, t]);  // Top
        this.segments.push([l, t, l, b]);  // Left
        
        // Draw magnetic coil indicators on walls (based on phase values)
        const hPhase = this.parameters[3].value;
        const vPhase = this.parameters[4].value;
        this.drawWallCoils('top', vPhase);
        this.drawWallCoils('bottom', vPhase);
        this.drawWallCoils('left', hPhase);
        this.drawWallCoils('right', hPhase);
    }
    
    drawWallCoils(wall, phase) {
        // Draw wave pattern on wall to indicate magnetic field strength
        const waveHeight = 0.015;
        const segments = 20;
        const margin = 0.04;
        
        let startX, startY, endX, endY;
        let perpX = 0, perpY = 0;
        
        switch (wall) {
            case 'top':
                startX = REACTOR_CHAMBER_LEFT + margin;
                endX = REACTOR_CHAMBER_RIGHT - margin;
                startY = endY = REACTOR_CHAMBER_TOP;
                perpY = -1;
                break;
            case 'bottom':
                startX = REACTOR_CHAMBER_LEFT + margin;
                endX = REACTOR_CHAMBER_RIGHT - margin;
                startY = endY = REACTOR_CHAMBER_BOTTOM;
                perpY = 1;
                break;
            case 'left':
                startY = REACTOR_CHAMBER_BOTTOM + margin;
                endY = REACTOR_CHAMBER_TOP - margin;
                startX = endX = REACTOR_CHAMBER_LEFT;
                perpX = 1;
                break;
            case 'right':
                startY = REACTOR_CHAMBER_BOTTOM + margin;
                endY = REACTOR_CHAMBER_TOP - margin;
                startX = endX = REACTOR_CHAMBER_RIGHT;
                perpX = -1;
                break;
        }
        
        // Draw sine wave along wall (frequency based on phase value)
        for (let i = 0; i < segments; i++) {
            const t1 = i / segments;
            const t2 = (i + 1) / segments;
            
            const x1 = startX + (endX - startX) * t1;
            const y1 = startY + (endY - startY) * t1;
            const x2 = startX + (endX - startX) * t2;
            const y2 = startY + (endY - startY) * t2;
            
            // Sine wave offset based on phase
            const wave1 = Math.sin(t1 * Math.PI * 2 * phase) * waveHeight;
            const wave2 = Math.sin(t2 * Math.PI * 2 * phase) * waveHeight;
            
            this.segments.push([
                x1 + perpX * wave1, y1 + perpY * wave1,
                x2 + perpX * wave2, y2 + perpY * wave2
            ]);
        }
    }
    
    drawCrystals() {
        for (const crystal of this.crystals) {
            // Draw diamond shape for crystal
            const s = crystal.radius;
            this.segments.push([crystal.x, crystal.y + s, crystal.x + s, crystal.y]);
            this.segments.push([crystal.x + s, crystal.y, crystal.x, crystal.y - s]);
            this.segments.push([crystal.x, crystal.y - s, crystal.x - s, crystal.y]);
            this.segments.push([crystal.x - s, crystal.y, crystal.x, crystal.y + s]);
            
            // Inner diamond for detail
            const s2 = s * 0.5;
            this.segments.push([crystal.x, crystal.y + s2, crystal.x + s2, crystal.y]);
            this.segments.push([crystal.x + s2, crystal.y, crystal.x, crystal.y - s2]);
            this.segments.push([crystal.x, crystal.y - s2, crystal.x - s2, crystal.y]);
            this.segments.push([crystal.x - s2, crystal.y, crystal.x, crystal.y + s2]);
        }
    }
    
    drawTargets() {
        for (const target of this.targets) {
            const r = target.radius;
            
            if (target.hit) {
                // Filled circle when hit (draw multiple circles)
                this.drawCircle(target.x, target.y, r, 12);
                this.drawCircle(target.x, target.y, r * 0.6, 8);
                this.drawCircle(target.x, target.y, r * 0.3, 6);
            } else {
                // Empty circle with crosshair
                this.drawCircle(target.x, target.y, r, 12);
                // Crosshair
                this.segments.push([target.x - r * 0.7, target.y, target.x + r * 0.7, target.y]);
                this.segments.push([target.x, target.y - r * 0.7, target.x, target.y + r * 0.7]);
            }
        }
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
    
    drawInjector() {
        // Draw injector nozzle at bottom center
        const x = this.injectorX;
        const y = this.injectorY;
        const w = 0.02;
        const h = 0.025;
        
        // Nozzle shape
        this.segments.push([x - w, y - h, x - w * 0.5, y]);
        this.segments.push([x - w * 0.5, y, x + w * 0.5, y]);
        this.segments.push([x + w * 0.5, y, x + w, y - h]);
        this.segments.push([x + w, y - h, x - w, y - h]);
        
        // Arrow indicating injection direction (when injecting)
        if (this.state === REACTOR_STATE_INJECTING || this.state === REACTOR_STATE_SUCCESS) {
            const arrowY = y + 0.015;
            const arrowSize = 0.01;
            this.segments.push([x, y, x, arrowY]);
            this.segments.push([x, arrowY, x - arrowSize, arrowY - arrowSize]);
            this.segments.push([x, arrowY, x + arrowSize, arrowY - arrowSize]);
        }
    }
    
    drawPlasmaParticles() {
        if (this.particles.length === 0) return;
        
        const speed = REACTOR_PLASMA_SPEED * (0.5 + this.parameters[2].value / 100 * 1.5);
        const particleLifetime = this.debugMode ? 8.0 : REACTOR_PARTICLE_LIFETIME;
        const maxAge = particleLifetime * speed;
        
        // In success state, particles grow to 2x size over 1 second
        let successScale = 1.0;
        if (this.state === REACTOR_STATE_SUCCESS) {
            const growDuration = 1.0;  // seconds to reach full size
            const growProgress = Math.min(this.successTimer / growDuration, 1.0);
            successScale = 1.0 + growProgress;  // 1.0 to 2.0
        }
        
        for (const particle of this.particles) {
            if (particle.x === undefined) continue;
            
            // Particle size varies slightly with age (newer = slightly bigger)
            // In success state, all particles grow together
            const ageRatio = this.state === REACTOR_STATE_SUCCESS ? 0 : (particle.age / maxAge);
            const size = REACTOR_PARTICLE_SIZE * (1.2 - ageRatio * 0.4) * successScale;
            
            // Draw particle as chevron/triangle pointing in direction of movement
            // The "tip" points forward, two "wings" spread backward
            const dirX = particle.dirX || 0;
            const dirY = particle.dirY || 1;
            
            // Perpendicular direction for the wings
            const perpX = -dirY;
            const perpY = dirX;
            
            // Tip of the chevron (forward)
            const tipX = particle.x + dirX * size * 1.5;
            const tipY = particle.y + dirY * size * 1.5;
            
            // Left and right wing points (backward and spread out)
            const wingBackAmount = size * 1.2;
            const wingSpreadAmount = size * 1.0;
            
            const leftWingX = particle.x - dirX * wingBackAmount + perpX * wingSpreadAmount;
            const leftWingY = particle.y - dirY * wingBackAmount + perpY * wingSpreadAmount;
            
            const rightWingX = particle.x - dirX * wingBackAmount - perpX * wingSpreadAmount;
            const rightWingY = particle.y - dirY * wingBackAmount - perpY * wingSpreadAmount;
            
            // Draw two lines forming the chevron (no base)
            this.segments.push([tipX, tipY, leftWingX, leftWingY]);
            this.segments.push([tipX, tipY, rightWingX, rightWingY]);
        }
    }
    
    drawSidebar() {
        const left = REACTOR_SIDEBAR_LEFT;
        const right = REACTOR_SIDEBAR_RIGHT;
        const top = REACTOR_CHAMBER_TOP;
        const bottom = REACTOR_CHAMBER_BOTTOM;
        
        // Sidebar border
        this.segments.push([left, bottom, left, top]);
        
        // Title
        this.drawText('REACTOR', left + 0.02, top - 0.03);
        
        // Separator
        const sepY = top - 0.06;
        this.segments.push([left, sepY, right - 0.01, sepY]);
        
        // Parameters (only visible ones)
        const paramStartY = sepY - 0.04;
        const paramSpacing = 0.055;
        const sliderWidth = 0.12;
        const sliderLeft = left + 0.11;
        
        for (let i = 0; i < this.visibleParams.length; i++) {
            const param = this.visibleParams[i];
            const y = paramStartY - i * paramSpacing;
            
            // Selection indicator - draw box around selected parameter
            if (i === this.selectedParam) {
                const boxLeft = left + 0.005;
                const boxRight = right - 0.015;
                const boxTop = y + 0.025;
                const boxBottom = y - 0.015;
                
                // Draw selection box (always visible, thicker when blinking)
                this.segments.push([boxLeft, boxBottom, boxRight, boxBottom]);
                this.segments.push([boxRight, boxBottom, boxRight, boxTop]);
                this.segments.push([boxRight, boxTop, boxLeft, boxTop]);
                this.segments.push([boxLeft, boxTop, boxLeft, boxBottom]);
                
                // Draw arrows on sides when blinking to indicate adjustable
                if (this.blinkOn) {
                    // Left arrow
                    const arrowY = (boxTop + boxBottom) / 2;
                    const arrowSize = 0.012;
                    this.segments.push([boxLeft + 0.008, arrowY, boxLeft + 0.008 + arrowSize, arrowY + arrowSize * 0.6]);
                    this.segments.push([boxLeft + 0.008, arrowY, boxLeft + 0.008 + arrowSize, arrowY - arrowSize * 0.6]);
                    
                    // Right arrow  
                    this.segments.push([boxRight - 0.008, arrowY, boxRight - 0.008 - arrowSize, arrowY + arrowSize * 0.6]);
                    this.segments.push([boxRight - 0.008, arrowY, boxRight - 0.008 - arrowSize, arrowY - arrowSize * 0.6]);
                }
            }
            
            // Parameter name
            this.drawText(param.name, left + 0.02, y);
            
            // Slider background
            const sliderY = y + 0.005;
            this.segments.push([sliderLeft, sliderY, sliderLeft + sliderWidth, sliderY]);
            
            // Slider fill
            const fillRatio = (param.value - param.min) / (param.max - param.min);
            const fillWidth = sliderWidth * fillRatio;
            // Draw filled portion with multiple lines for thickness
            for (let j = -1; j <= 1; j++) {
                const offsetY = sliderY + j * 0.003;
                this.segments.push([sliderLeft, offsetY, sliderLeft + fillWidth, offsetY]);
            }
            
            // Value text
            this.drawText(param.format(param.value), sliderLeft + sliderWidth + 0.01, y, 0.008);
        }
        
        // Legend section
        const legendY = paramStartY - this.visibleParams.length * paramSpacing - 0.03;
        this.segments.push([left, legendY, right - 0.01, legendY]);
        
        // Legend items
        this.drawText('LEGEND:', left + 0.02, legendY - 0.035);
        
        // Crystal symbol
        const crystalLegendX = left + 0.03;
        const crystalLegendY = legendY - 0.07;
        const cs = 0.012;
        this.segments.push([crystalLegendX, crystalLegendY + cs, crystalLegendX + cs, crystalLegendY]);
        this.segments.push([crystalLegendX + cs, crystalLegendY, crystalLegendX, crystalLegendY - cs]);
        this.segments.push([crystalLegendX, crystalLegendY - cs, crystalLegendX - cs, crystalLegendY]);
        this.segments.push([crystalLegendX - cs, crystalLegendY, crystalLegendX, crystalLegendY + cs]);
        this.drawText('CRYSTAL', left + 0.06, legendY - 0.075, 0.008);
        
        // Target symbol
        const targetLegendX = left + 0.03;
        const targetLegendY = legendY - 0.11;
        this.drawCircle(targetLegendX, targetLegendY, 0.012, 8);
        this.drawText('TARGET', left + 0.06, legendY - 0.115, 0.008);
        
        // Controls hint
        const controlsY = bottom + 0.06;
        this.segments.push([left, controlsY, right - 0.01, controlsY]);
        this.drawText('[ARROWS] ADJ', left + 0.02, controlsY - 0.035, 0.008);
        this.drawText('[SPACE] INJECT', left + 0.02, controlsY - 0.065, 0.008);
    }
    
    drawStatusBar() {
        const left = REACTOR_CHAMBER_LEFT;
        const right = REACTOR_CHAMBER_RIGHT;
        const statusY = REACTOR_CHAMBER_BOTTOM - 0.01;
        
        // Debug mode indicator
        if (this.debugMode) {
            this.drawText('[DEBUG MODE - D TO EXIT]', left + 0.05, statusY + 0.025, 0.008);
        }
        
        // Status text based on state
        let statusText = '';
        let outputText = 'OUTPUT: 0%';
        
        switch (this.state) {
            case REACTOR_STATE_IDLE:
                statusText = 'STATUS: IDLE';
                if (this.blinkOn) {
                    this.drawText('[HOLD SPACE TO INJECT]', left + 0.12, statusY - 0.04, 0.009);
                }
                break;
                
            case REACTOR_STATE_INJECTING:
                const progress = Math.min(this.sustainTimer / REACTOR_SUSTAIN_TIME, 1);
                const progressPercent = Math.floor(progress * 100);
                statusText = 'SUSTAINING ' + this.sustainTimer.toFixed(1) + 's/' + REACTOR_SUSTAIN_TIME.toFixed(1) + 's';
                outputText = 'OUTPUT: ' + progressPercent + '%';
                
                // Progress bar
                const barLeft = left + 0.02;
                const barRight = left + 0.35;
                const barY = statusY - 0.04;
                const barHeight = 0.012;
                
                // Bar outline
                this.segments.push([barLeft, barY, barRight, barY]);
                this.segments.push([barRight, barY, barRight, barY + barHeight]);
                this.segments.push([barRight, barY + barHeight, barLeft, barY + barHeight]);
                this.segments.push([barLeft, barY + barHeight, barLeft, barY]);
                
                // Bar fill
                const fillRight = barLeft + (barRight - barLeft) * progress;
                for (let i = 0; i < 3; i++) {
                    const y = barY + 0.003 + i * 0.003;
                    this.segments.push([barLeft + 0.002, y, fillRight - 0.002, y]);
                }
                break;
                
            case REACTOR_STATE_SUCCESS:
                statusText = 'CONTAINMENT STABLE';
                outputText = 'OUTPUT: 100%';
                if (this.blinkOn) {
                    this.drawText('** SUCCESS **', left + 0.15, statusY - 0.04, 0.01);
                }
                break;
                
            case REACTOR_STATE_FAILURE:
                statusText = 'FAILURE: ' + this.failureMessage;
                if (this.blinkOn) {
                    this.drawText('[SPACE TO RETRY]', left + 0.12, statusY - 0.04, 0.009);
                }
                break;
        }
        
        this.drawText(statusText, left + 0.02, statusY, 0.009);
        this.drawText(outputText, right - 0.15, statusY, 0.009);
    }
    
    drawText(text, x, y, scale = 0.012) {
        const charWidth = scale;
        const charHeight = scale * 1.6;
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
const reactorProgram = new ReactorProgram();

