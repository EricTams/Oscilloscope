// DEFENSE - Point Defense Turret Control
// AIDEV-NOTE: Program interface: init(), update(deltaTime), getSegments(), handleKey(key, down)
// AIDEV-NOTE: 4-window layout: 3D display (top-left), Spinal (top-right), Elevation (bottom-left), Status (bottom-right)
// AIDEV-NOTE: COORDINATE SYSTEM:
//   X = left/right (horizontal perpendicular to spine)
//   Y = another horizontal direction (perpendicular to X and Z)
//   Z = forward/back (SPINE AXIS - front is +Z, back is -Z)
// AIDEV-NOTE: Spinal rotation rotates around Z-axis (the spine), sweeping through the X-Y plane
// AIDEV-NOTE: Elevation controls how much we shoot along Z: +90=forward(+Z), -90=backward(-Z), 0=perpendicular

// Layout constants (UV coordinates 0-1)
const DEFENSE_3D_LEFT = 0.02;
const DEFENSE_3D_RIGHT = 0.49;
const DEFENSE_3D_TOP = 0.97;
const DEFENSE_3D_BOTTOM = 0.52;

const DEFENSE_SPINAL_LEFT = 0.51;
const DEFENSE_SPINAL_RIGHT = 0.98;
const DEFENSE_SPINAL_TOP = 0.97;
const DEFENSE_SPINAL_BOTTOM = 0.52;

const DEFENSE_ELEV_LEFT = 0.02;
const DEFENSE_ELEV_RIGHT = 0.49;
const DEFENSE_ELEV_TOP = 0.48;
const DEFENSE_ELEV_BOTTOM = 0.03;

const DEFENSE_STATUS_LEFT = 0.51;
const DEFENSE_STATUS_RIGHT = 0.98;
const DEFENSE_STATUS_TOP = 0.48;
const DEFENSE_STATUS_BOTTOM = 0.03;

// Projection scale - controls size of 3D display elements
const DEFENSE_PROJ_SCALE = 0.0007;

// Initial target positions (debris in 3D space)
// X/Y = horizontal plane perpendicular to spine, Z = spine axis (front=+Z)
const DEFENSE_INITIAL_TARGETS = [
    { x: -500, y: 400, z: 200 },
    { x: -150, y: -200, z: -450 },
    { x: 450, y: -100, z: 600 }
];

// Helper to create fresh target objects
function createTargets() {
    return DEFENSE_INITIAL_TARGETS.map(t => ({ ...t, destroyed: false }));
}

// Window centers
const DEFENSE_3D_CENTER_X = (DEFENSE_3D_LEFT + DEFENSE_3D_RIGHT) / 2;
const DEFENSE_3D_CENTER_Y = (DEFENSE_3D_TOP + DEFENSE_3D_BOTTOM) / 2;
const DEFENSE_SPINAL_CENTER_X = (DEFENSE_SPINAL_LEFT + DEFENSE_SPINAL_RIGHT) / 2;
const DEFENSE_SPINAL_CENTER_Y = (DEFENSE_SPINAL_TOP + DEFENSE_SPINAL_BOTTOM) / 2;
const DEFENSE_ELEV_CENTER_X = (DEFENSE_ELEV_LEFT + DEFENSE_ELEV_RIGHT) / 2;
const DEFENSE_ELEV_CENTER_Y = (DEFENSE_ELEV_TOP + DEFENSE_ELEV_BOTTOM) / 2;

// Game constants
const DEFENSE_RELOAD_TIME = 8.0;        // Seconds to reload
const DEFENSE_PROJECTILE_SPEED = 800;   // Units per second
const DEFENSE_PROJECTILE_MAX_AGE = 2.5; // Seconds before despawn
const DEFENSE_HIT_RADIUS = 80;          // Units - distance for hit detection
const DEFENSE_EXPLOSION_DURATION = 1.0; // Seconds
const DEFENSE_EXPLOSION_PARTICLES = 10; // Number of particles per explosion

class DefenseProgram {
    constructor() {
        this.segments = [];
        
        // Turret state
        this.spinalAngle = 0;      // 0-360 degrees
        this.elevationAngle = 0;   // -90 to +90 degrees
        
        // Weapon state
        this.reloadTimer = 0;      // 0 = ready, >0 = reloading
        
        // Projectile (when fired)
        this.projectile = null;    // { x, y, z, dx, dy, dz, age }
        
        // Explosions (array of active particle systems)
        this.explosions = [];      // [{ x, y, z, age, particles: [{x,y,z,dx,dy,dz},...] }]
        
        // Targets (3 debris pieces in 3D space)
        this.targets = createTargets();
        
        // Animation
        this.blinkTimer = 0;
        this.blinkOn = true;
        this.time = 0;
    }
    
    init() {
        this.segments = [];
        this.spinalAngle = 0;
        this.elevationAngle = 0;
        this.reloadTimer = 0;
        this.projectile = null;
        this.explosions = [];
        this.blinkTimer = 0;
        this.blinkOn = true;
        this.time = 0;
        
        // Reset targets
        this.targets = createTargets();
    }
    
    handleKey(key, down) {
        if (!down) return;
        
        const k = key.toLowerCase();
        const step = 2;
        
        // Left/Right → Spinal rotation
        if (k === 'arrowleft' || k === 'a') {
            this.spinalAngle = (this.spinalAngle - step + 360) % 360;
        } else if (k === 'arrowright' || k === 'd') {
            this.spinalAngle = (this.spinalAngle + step) % 360;
        }
        
        // Up/Down → Elevation
        if (k === 'arrowup' || k === 'w') {
            this.elevationAngle = Math.min(90, this.elevationAngle + step);
        } else if (k === 'arrowdown' || k === 's') {
            this.elevationAngle = Math.max(-90, this.elevationAngle - step);
        }
        
        // Fire
        if (key === ' ' && this.reloadTimer <= 0) {
            this.fire();
        }
    }
    
    fire() {
        // Calculate direction from spinal and elevation angles
        // Z is the spine axis (front=+Z), spinal rotates in X-Y plane around Z
        // Elevation controls how much we shoot along Z: +90=forward, -90=backward
        const spinalRad = this.spinalAngle * Math.PI / 180;
        const elevRad = this.elevationAngle * Math.PI / 180;
        
        // cosElev = component in X-Y plane (perpendicular to spine)
        // sinElev = component along Z (spine axis)
        const cosElev = Math.cos(elevRad);
        const sinElev = Math.sin(elevRad);
        
        // At spinal=0, elev=0: firing in +X direction (perpendicular to spine)
        // At spinal=90, elev=0: firing in +Y direction
        // At any spinal, elev=+90: firing in +Z direction (forward along spine)
        const dx = Math.cos(spinalRad) * cosElev;  // X component
        const dy = Math.sin(spinalRad) * cosElev;  // Y component
        const dz = sinElev;                         // Z component (along spine)
        
        this.projectile = {
            x: 0, y: 0, z: 0,
            dx: dx,
            dy: dy,
            dz: dz,
            age: 0
        };
        
        this.reloadTimer = DEFENSE_RELOAD_TIME;
    }
    
    update(deltaTime) {
        this.time += deltaTime;
        
        // Blink timer
        this.blinkTimer += deltaTime;
        if (this.blinkTimer >= 0.4) {
            this.blinkTimer = 0;
            this.blinkOn = !this.blinkOn;
        }
        
        // Update reload timer
        if (this.reloadTimer > 0) {
            this.reloadTimer = Math.max(0, this.reloadTimer - deltaTime);
        }
        
        // Update projectile
        if (this.projectile) {
            this.projectile.age += deltaTime;
            
            // Move projectile
            this.projectile.x += this.projectile.dx * DEFENSE_PROJECTILE_SPEED * deltaTime;
            this.projectile.y += this.projectile.dy * DEFENSE_PROJECTILE_SPEED * deltaTime;
            this.projectile.z += this.projectile.dz * DEFENSE_PROJECTILE_SPEED * deltaTime;
            
            // Check for hits
            for (const target of this.targets) {
                if (target.destroyed) continue;
                
                const dx = this.projectile.x - target.x;
                const dy = this.projectile.y - target.y;
                const dz = this.projectile.z - target.z;
                const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
                
                if (dist < DEFENSE_HIT_RADIUS) {
                    // Hit! Create explosion
                    target.destroyed = true;
                    this.createExplosion(target.x, target.y, target.z);
                    this.projectile = null;
                    break;
                }
            }
            
            // Despawn if too old
            if (this.projectile && this.projectile.age > DEFENSE_PROJECTILE_MAX_AGE) {
                this.projectile = null;
            }
        }
        
        // Update explosions
        for (let i = this.explosions.length - 1; i >= 0; i--) {
            const exp = this.explosions[i];
            exp.age += deltaTime;
            
            // Move particles outward
            for (const p of exp.particles) {
                p.x += p.dx * deltaTime;
                p.y += p.dy * deltaTime;
                p.z += p.dz * deltaTime;
            }
            
            // Remove old explosions
            if (exp.age > DEFENSE_EXPLOSION_DURATION) {
                this.explosions.splice(i, 1);
            }
        }
        
        this.generateSegments();
    }
    
    createExplosion(x, y, z) {
        const particles = [];
        for (let i = 0; i < DEFENSE_EXPLOSION_PARTICLES; i++) {
            // Random direction
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.random() * Math.PI - Math.PI / 2;
            const speed = 100 + Math.random() * 150;
            
            particles.push({
                x: x,
                y: y,
                z: z,
                dx: Math.cos(theta) * Math.cos(phi) * speed,
                dy: Math.sin(theta) * Math.cos(phi) * speed,
                dz: Math.sin(phi) * speed
            });
        }
        
        this.explosions.push({
            x: x,
            y: y,
            z: z,
            age: 0,
            particles: particles
        });
    }
    
    // AIDEV-NOTE: Project 3D world coordinates to 2D screen coordinates
    // COORDINATE SYSTEM: X/Y = horizontal plane, Z = spine (front=+Z)
    // Spinal rotation rotates our VIEW around Z axis (the spine)
    // Screen X = aim direction (viewForward), Screen Y = Z (spine) + viewRight
    projectToScreen(x, y, z, useConstantDepth = false) {
        const spinalRad = this.spinalAngle * Math.PI / 180;
        
        // Transform world X-Y coords to view coords (rotate around Z axis)
        // At spinal=0, we're looking in the +X direction
        const viewForward = x * Math.cos(spinalRad) + y * Math.sin(spinalRad);
        const viewRight = -x * Math.sin(spinalRad) + y * Math.cos(spinalRad);
        const viewUp = z;  // Z is spine axis
        
        // Perspective scaling - use constant depth for ellipse, variable for targets
        const fov = 800;
        const depth = useConstantDepth ? 1000 : (viewForward + 1000);
        const scale = fov / (fov + depth);
        
        // Project to screen:
        // Screen X = viewForward (aim direction) - so "0" is on the RIGHT at spinal=0
        // Screen Y = Z (spine) + foreshortened viewRight (creates ellipse)
        const projScale = DEFENSE_PROJ_SCALE;
        const ellipseRatio = 0.6;  // Y is 60% of X for ellipse foreshortening
        
        const screenX = DEFENSE_3D_CENTER_X + viewForward * scale * projScale;
        const screenY = DEFENSE_3D_CENTER_Y - 0.02 
                      + viewUp * scale * projScale * 0.8  // Z contribution (spine axis)
                      + viewRight * scale * projScale * ellipseRatio;
        
        return { x: screenX, y: screenY, scale: scale, depth: viewForward };
    }
    
    generateSegments() {
        this.segments = [];
        
        // Draw window borders
        this.drawWindowBorders();
        
        // Draw each window
        this.draw3DDisplay();
        this.drawSpinalDisplay();
        this.drawElevationDisplay();
        this.drawStatusDisplay();
    }
    
    drawWindowBorders() {
        // 3D Display border
        this.segments.push([DEFENSE_3D_LEFT, DEFENSE_3D_BOTTOM, DEFENSE_3D_RIGHT, DEFENSE_3D_BOTTOM]);
        this.segments.push([DEFENSE_3D_RIGHT, DEFENSE_3D_BOTTOM, DEFENSE_3D_RIGHT, DEFENSE_3D_TOP]);
        this.segments.push([DEFENSE_3D_RIGHT, DEFENSE_3D_TOP, DEFENSE_3D_LEFT, DEFENSE_3D_TOP]);
        this.segments.push([DEFENSE_3D_LEFT, DEFENSE_3D_TOP, DEFENSE_3D_LEFT, DEFENSE_3D_BOTTOM]);
        
        // Spinal Display border
        this.segments.push([DEFENSE_SPINAL_LEFT, DEFENSE_SPINAL_BOTTOM, DEFENSE_SPINAL_RIGHT, DEFENSE_SPINAL_BOTTOM]);
        this.segments.push([DEFENSE_SPINAL_RIGHT, DEFENSE_SPINAL_BOTTOM, DEFENSE_SPINAL_RIGHT, DEFENSE_SPINAL_TOP]);
        this.segments.push([DEFENSE_SPINAL_RIGHT, DEFENSE_SPINAL_TOP, DEFENSE_SPINAL_LEFT, DEFENSE_SPINAL_TOP]);
        this.segments.push([DEFENSE_SPINAL_LEFT, DEFENSE_SPINAL_TOP, DEFENSE_SPINAL_LEFT, DEFENSE_SPINAL_BOTTOM]);
        
        // Elevation Display border
        this.segments.push([DEFENSE_ELEV_LEFT, DEFENSE_ELEV_BOTTOM, DEFENSE_ELEV_RIGHT, DEFENSE_ELEV_BOTTOM]);
        this.segments.push([DEFENSE_ELEV_RIGHT, DEFENSE_ELEV_BOTTOM, DEFENSE_ELEV_RIGHT, DEFENSE_ELEV_TOP]);
        this.segments.push([DEFENSE_ELEV_RIGHT, DEFENSE_ELEV_TOP, DEFENSE_ELEV_LEFT, DEFENSE_ELEV_TOP]);
        this.segments.push([DEFENSE_ELEV_LEFT, DEFENSE_ELEV_TOP, DEFENSE_ELEV_LEFT, DEFENSE_ELEV_BOTTOM]);
        
        // Status Display border
        this.segments.push([DEFENSE_STATUS_LEFT, DEFENSE_STATUS_BOTTOM, DEFENSE_STATUS_RIGHT, DEFENSE_STATUS_BOTTOM]);
        this.segments.push([DEFENSE_STATUS_RIGHT, DEFENSE_STATUS_BOTTOM, DEFENSE_STATUS_RIGHT, DEFENSE_STATUS_TOP]);
        this.segments.push([DEFENSE_STATUS_RIGHT, DEFENSE_STATUS_TOP, DEFENSE_STATUS_LEFT, DEFENSE_STATUS_TOP]);
        this.segments.push([DEFENSE_STATUS_LEFT, DEFENSE_STATUS_TOP, DEFENSE_STATUS_LEFT, DEFENSE_STATUS_BOTTOM]);
    }
    
    draw3DDisplay() {
        // Title
        this.drawText('3D TARGETING', DEFENSE_3D_LEFT + 0.02, DEFENSE_3D_TOP - 0.03, 0.01);
        
        // Draw the perspective disc (ellipse)
        this.drawPerspectiveDisc();
        
        // Draw targets
        this.drawTargets();
        
        // Draw stubby arrow indicator
        this.drawStubbyArrow();
        
        // Draw projectile trail
        if (this.projectile) {
            this.drawProjectile();
        }
        
        // Draw explosions
        this.drawExplosions();
    }
    
    drawPerspectiveDisc() {
        // Draw the X-Y plane at Z=0 using constant depth (no perspective distortion)
        // This gives a clean ellipse, targets use variable depth for perspective
        const discRadius = 600;  // Radius in world units
        const segments = 36;
        
        // Draw ellipse outline - use constant depth for clean shape
        for (let i = 0; i < segments; i++) {
            const a1 = (i / segments) * Math.PI * 2;
            const a2 = ((i + 1) / segments) * Math.PI * 2;
            
            // Points on circle in world X-Y plane at Z=0
            const wx1 = Math.cos(a1) * discRadius;
            const wy1 = Math.sin(a1) * discRadius;
            const wx2 = Math.cos(a2) * discRadius;
            const wy2 = Math.sin(a2) * discRadius;
            
            // Project with constant depth for clean ellipse
            const p1 = this.projectToScreen(wx1, wy1, 0, true);
            const p2 = this.projectToScreen(wx2, wy2, 0, true);
            
            this.segments.push([p1.x, p1.y, p2.x, p2.y]);
        }
        
        // Draw degree markings at points on the circle
        const markings = [
            { deg: 0, label: '0' },    // +X direction in world (RIGHT at spinal=0)
            { deg: 90, label: '90' },  // +Y direction in world
            { deg: 180, label: '180' },// -X direction
            { deg: 270, label: '270' } // -Y direction
        ];
        
        for (const mark of markings) {
            const worldAngle = mark.deg * Math.PI / 180;
            
            // Inner and outer points on circle in world coords
            const innerR = discRadius * 0.85;
            const outerR = discRadius * 1.05;
            const labelR = discRadius * 1.2;
            
            const ix = Math.cos(worldAngle) * innerR;
            const iy = Math.sin(worldAngle) * innerR;
            const ox = Math.cos(worldAngle) * outerR;
            const oy = Math.sin(worldAngle) * outerR;
            const lx = Math.cos(worldAngle) * labelR;
            const ly = Math.sin(worldAngle) * labelR;
            
            // Project with constant depth
            const pi = this.projectToScreen(ix, iy, 0, true);
            const po = this.projectToScreen(ox, oy, 0, true);
            const pl = this.projectToScreen(lx, ly, 0, true);
            
            this.segments.push([pi.x, pi.y, po.x, po.y]);
            this.drawText(mark.label, pl.x - 0.012, pl.y - 0.008, 0.008);
        }
        
        // Draw small tick marks every 30 degrees
        for (let deg = 0; deg < 360; deg += 30) {
            if (deg % 90 === 0) continue;
            const worldAngle = deg * Math.PI / 180;
            
            const innerR = discRadius * 0.92;
            const outerR = discRadius * 1.0;
            
            const ix = Math.cos(worldAngle) * innerR;
            const iy = Math.sin(worldAngle) * innerR;
            const ox = Math.cos(worldAngle) * outerR;
            const oy = Math.sin(worldAngle) * outerR;
            
            // Use constant depth for clean ellipse
            const pi = this.projectToScreen(ix, iy, 0, true);
            const po = this.projectToScreen(ox, oy, 0, true);
            
            this.segments.push([pi.x, pi.y, po.x, po.y]);
        }
        
        // Draw crosshairs at center (origin in world) - use constant depth
        const chSize = 80;  // Crosshair size in world units
        const chL = this.projectToScreen(-chSize, 0, 0, true);
        const chR = this.projectToScreen(chSize, 0, 0, true);
        const chU = this.projectToScreen(0, chSize, 0, true);
        const chD = this.projectToScreen(0, -chSize, 0, true);
        
        this.segments.push([chL.x, chL.y, chR.x, chR.y]);
        this.segments.push([chU.x, chU.y, chD.x, chD.y]);
    }
    
    drawTargets() {
        for (const target of this.targets) {
            if (target.destroyed) continue;
            
            // Project base position (on disc plane, z=0) - constant depth to match ellipse
            const baseProj = this.projectToScreen(target.x, target.y, 0, true);
            
            // Target position: same X as base, Y offset by Z (spine position)
            // Z > 0 = forward (toward bow), Z < 0 = backward (toward stern)
            const zOffset = target.z * baseProj.scale * DEFENSE_PROJ_SCALE * 0.8;
            const targetX = baseProj.x;
            const targetY = baseProj.y + zOffset;
            
            // Skip if outside window
            if (targetX < DEFENSE_3D_LEFT || targetX > DEFENSE_3D_RIGHT ||
                targetY < DEFENSE_3D_BOTTOM || targetY > DEFENSE_3D_TOP) {
                continue;
            }
            
            // Draw line from base to target (shows height off disc)
            if (baseProj.x >= DEFENSE_3D_LEFT && baseProj.x <= DEFENSE_3D_RIGHT &&
                baseProj.y >= DEFENSE_3D_BOTTOM && baseProj.y <= DEFENSE_3D_TOP) {
                this.segments.push([baseProj.x, baseProj.y, targetX, targetY]);
                
                // Draw small cross at base (different from target's X shape)
                const bs = 0.006;
                this.segments.push([baseProj.x - bs, baseProj.y, baseProj.x + bs, baseProj.y]);
                this.segments.push([baseProj.x, baseProj.y - bs, baseProj.x, baseProj.y + bs]);
            }
            
            // Draw target as X cross
            const size = 0.015;
            this.segments.push([targetX - size, targetY - size, targetX + size, targetY + size]);
            this.segments.push([targetX - size, targetY + size, targetX + size, targetY - size]);
            
            // Draw circle around target
            this.drawCircle(targetX, targetY, size * 1.2, 8);
        }
    }
    
    drawStubbyArrow() {
        // Draw arrow showing aim direction using same projection as targets/projectiles
        // This ensures the arrow points where the projectile will actually go
        const spinalRad = this.spinalAngle * Math.PI / 180;
        const elevRad = this.elevationAngle * Math.PI / 180;
        
        // Calculate aim direction in world space (same as fire() function)
        const aimDist = 200;  // Distance for arrow tip in world units
        const dx = Math.cos(spinalRad) * Math.cos(elevRad);
        const dy = Math.sin(spinalRad) * Math.cos(elevRad);
        const dz = Math.sin(elevRad);
        
        // Project origin and tip using same method as targets
        const originProj = this.projectToScreen(0, 0, 0, true);
        
        const tipX_world = dx * aimDist;
        const tipY_world = dy * aimDist;
        const tipZ_world = dz * aimDist;
        
        const tipBase = this.projectToScreen(tipX_world, tipY_world, 0, true);
        const tipZOffset = tipZ_world * tipBase.scale * DEFENSE_PROJ_SCALE * 0.8;
        const tipX = tipBase.x;
        const tipY = tipBase.y + tipZOffset;
        
        // Draw arrow shaft
        this.segments.push([originProj.x, originProj.y, tipX, tipY]);
        
        // Draw arrowhead (in screen space, pointing along the arrow direction)
        const arrowDx = tipX - originProj.x;
        const arrowDy = tipY - originProj.y;
        const arrowLen = Math.sqrt(arrowDx * arrowDx + arrowDy * arrowDy);
        if (arrowLen > 0.001) {
            const nx = arrowDx / arrowLen;
            const ny = arrowDy / arrowLen;
            const headSize = 0.015;
            
            // Perpendicular for arrowhead wings
            const px = -ny;
            const py = nx;
            
            const h1x = tipX - nx * headSize + px * headSize * 0.5;
            const h1y = tipY - ny * headSize + py * headSize * 0.5;
            const h2x = tipX - nx * headSize - px * headSize * 0.5;
            const h2y = tipY - ny * headSize - py * headSize * 0.5;
            
            this.segments.push([tipX, tipY, h1x, h1y]);
            this.segments.push([tipX, tipY, h2x, h2y]);
        }
    }
    
    drawProjectile() {
        // Project using same method as targets: X,Y on plane, then Z offset
        const originProj = this.projectToScreen(0, 0, 0, true);
        
        // Project projectile position same as targets
        const baseProj = this.projectToScreen(this.projectile.x, this.projectile.y, 0, true);
        const zOffset = this.projectile.z * baseProj.scale * DEFENSE_PROJ_SCALE * 0.8;
        const projX = baseProj.x;
        const projY = baseProj.y + zOffset;
        
        // Only draw if in window
        if (projX >= DEFENSE_3D_LEFT && projX <= DEFENSE_3D_RIGHT &&
            projY >= DEFENSE_3D_BOTTOM && projY <= DEFENSE_3D_TOP) {
            // Draw trail from origin to current position
            this.segments.push([originProj.x, originProj.y, projX, projY]);
            
            // Draw projectile head as small dot
            const dotSize = 0.006;
            this.segments.push([projX - dotSize, projY, projX + dotSize, projY]);
            this.segments.push([projX, projY - dotSize, projX, projY + dotSize]);
        }
    }
    
    drawExplosions() {
        for (const exp of this.explosions) {
            // Fade based on age
            const fade = 1 - (exp.age / DEFENSE_EXPLOSION_DURATION);
            if (fade <= 0) continue;
            
            for (const p of exp.particles) {
                // Project using same method as targets
                const baseProj = this.projectToScreen(p.x, p.y, 0, true);
                const zOffset = p.z * baseProj.scale * DEFENSE_PROJ_SCALE * 0.8;
                const px = baseProj.x;
                const py = baseProj.y + zOffset;
                
                // Skip if outside window
                if (px < DEFENSE_3D_LEFT || px > DEFENSE_3D_RIGHT ||
                    py < DEFENSE_3D_BOTTOM || py > DEFENSE_3D_TOP) {
                    continue;
                }
                
                // Draw particle as small cross
                const size = 0.005 * fade;
                this.segments.push([px - size, py, px + size, py]);
                this.segments.push([px, py - size, px, py + size]);
            }
        }
    }
    
    drawSpinalDisplay() {
        // Title
        this.drawText('SPINAL ROTATION', DEFENSE_SPINAL_LEFT + 0.02, DEFENSE_SPINAL_TOP - 0.03, 0.01);
        
        // Draw compass circle
        const cx = DEFENSE_SPINAL_CENTER_X;
        const cy = DEFENSE_SPINAL_CENTER_Y - 0.02;
        const radius = 0.14;
        
        this.drawCircle(cx, cy, radius, 36);
        
        // Draw tick marks and labels (0° on RIGHT, like 3D display)
        for (let deg = 0; deg < 360; deg += 30) {
            const rad = deg * Math.PI / 180;
            const innerR = (deg % 90 === 0) ? radius * 0.8 : radius * 0.9;
            
            // cos for X, sin for Y - puts 0° on the right
            const x1 = cx + Math.cos(rad) * innerR;
            const y1 = cy + Math.sin(rad) * innerR;
            const x2 = cx + Math.cos(rad) * radius;
            const y2 = cy + Math.sin(rad) * radius;
            
            this.segments.push([x1, y1, x2, y2]);
            
            // Labels at 0, 90, 180, 270
            if (deg % 90 === 0) {
                const lx = cx + Math.cos(rad) * radius * 1.15 - 0.012;
                const ly = cy + Math.sin(rad) * radius * 1.15 - 0.008;
                this.drawText(deg.toString(), lx, ly, 0.009);
            }
        }
        
        // Draw pointer/needle at current spinal angle
        const pointerRad = this.spinalAngle * Math.PI / 180;
        const px = cx + Math.cos(pointerRad) * radius * 0.75;
        const py = cy + Math.sin(pointerRad) * radius * 0.75;
        
        // Needle line
        this.segments.push([cx, cy, px, py]);
        
        // Arrowhead
        const arrowSize = 0.02;
        const a1x = px - Math.cos(pointerRad - 0.3) * arrowSize;
        const a1y = py - Math.sin(pointerRad - 0.3) * arrowSize;
        const a2x = px - Math.cos(pointerRad + 0.3) * arrowSize;
        const a2y = py - Math.sin(pointerRad + 0.3) * arrowSize;
        
        this.segments.push([px, py, a1x, a1y]);
        this.segments.push([px, py, a2x, a2y]);
        
        // Center dot
        this.drawCircle(cx, cy, 0.008, 8);
        
        // Current value display
        this.drawText('ANGLE: ' + this.spinalAngle + ' DEG', DEFENSE_SPINAL_LEFT + 0.04, DEFENSE_SPINAL_BOTTOM + 0.03, 0.009);
    }
    
    drawElevationDisplay() {
        // Title
        this.drawText('ELEVATION', DEFENSE_ELEV_LEFT + 0.02, DEFENSE_ELEV_TOP - 0.03, 0.01);
        
        // Draw arc gauge from -90 to +90
        const cx = DEFENSE_ELEV_CENTER_X + 0.08;  // Offset to left side
        const cy = DEFENSE_ELEV_CENTER_Y;
        const radius = 0.12;
        
        // Arc goes from -90 deg (-PI/2) to +90 deg (+PI/2) on left side
        const startAngle = -Math.PI / 2;  // -90 elevation
        const endAngle = Math.PI / 2;     // +90 elevation
        const arcSegments = 18;
        
        for (let i = 0; i < arcSegments; i++) {
            const a1 = startAngle + (endAngle - startAngle) * (i / arcSegments);
            const a2 = startAngle + (endAngle - startAngle) * ((i + 1) / arcSegments);
            
            // Arc on left side of center
            const x1 = cx - Math.cos(a1) * radius;
            const y1 = cy + Math.sin(a1) * radius;
            const x2 = cx - Math.cos(a2) * radius;
            const y2 = cy + Math.sin(a2) * radius;
            
            this.segments.push([x1, y1, x2, y2]);
        }
        
        // Draw tick marks every 15 degrees
        for (let elev = -90; elev <= 90; elev += 15) {
            const angle = elev * Math.PI / 180;
            const innerR = (elev % 45 === 0) ? radius * 0.8 : radius * 0.9;
            
            const x1 = cx - Math.cos(angle) * innerR;
            const y1 = cy + Math.sin(angle) * innerR;
            const x2 = cx - Math.cos(angle) * radius;
            const y2 = cy + Math.sin(angle) * radius;
            
            this.segments.push([x1, y1, x2, y2]);
        }
        
        // Labels at -90, 0, +90
        this.drawText('-90', cx - radius * 1.35, cy - radius - 0.01, 0.008);
        this.drawText('0', cx - radius * 1.3, cy - 0.01, 0.008);
        this.drawText('+90', cx - radius * 1.35, cy + radius - 0.01, 0.008);
        
        // Draw needle at current elevation
        const needleAngle = this.elevationAngle * Math.PI / 180;
        const nx = cx - Math.cos(needleAngle) * radius * 0.75;
        const ny = cy + Math.sin(needleAngle) * radius * 0.75;
        
        this.segments.push([cx, cy, nx, ny]);
        
        // Arrowhead
        const arrowSize = 0.015;
        const na = Math.atan2(ny - cy, nx - cx);
        const a1x = nx - Math.cos(na - 0.4) * arrowSize;
        const a1y = ny - Math.sin(na - 0.4) * arrowSize;
        const a2x = nx - Math.cos(na + 0.4) * arrowSize;
        const a2y = ny - Math.sin(na + 0.4) * arrowSize;
        
        this.segments.push([nx, ny, a1x, a1y]);
        this.segments.push([nx, ny, a2x, a2y]);
        
        // Center dot
        this.drawCircle(cx, cy, 0.006, 6);
        
        // Current value display
        const elevStr = (this.elevationAngle >= 0 ? '+' : '') + this.elevationAngle;
        this.drawText('ANGLE: ' + elevStr + ' DEG', DEFENSE_ELEV_LEFT + 0.04, DEFENSE_ELEV_BOTTOM + 0.03, 0.009);
    }
    
    drawStatusDisplay() {
        const left = DEFENSE_STATUS_LEFT + 0.02;
        let y = DEFENSE_STATUS_TOP - 0.04;
        const lineHeight = 0.045;
        
        // Auto-targeting status (blinking)
        if (this.blinkOn) {
            this.drawText('AUTO-TARGETING: OFFLINE', left, y, 0.009);
        }
        y -= lineHeight;
        
        // Objects detected
        const remaining = this.targets.filter(t => !t.destroyed).length;
        this.drawText('OBJECTS DETECTED: ' + remaining, left, y, 0.009);
        y -= lineHeight * 1.2;
        
        // Separator
        this.segments.push([DEFENSE_STATUS_LEFT + 0.01, y + 0.015, DEFENSE_STATUS_RIGHT - 0.01, y + 0.015]);
        y -= lineHeight * 0.5;
        
        // Current aim
        this.drawText('SPINAL: ' + this.spinalAngle + ' DEG  [L/R]', left, y, 0.009);
        y -= lineHeight;
        
        const elevStr = (this.elevationAngle >= 0 ? '+' : '') + this.elevationAngle;
        this.drawText('ELEVATION: ' + elevStr + ' DEG  [U/D]', left, y, 0.009);
        y -= lineHeight * 1.2;
        
        // Separator
        this.segments.push([DEFENSE_STATUS_LEFT + 0.01, y + 0.015, DEFENSE_STATUS_RIGHT - 0.01, y + 0.015]);
        y -= lineHeight * 0.5;
        
        // Reload status
        if (this.reloadTimer > 0) {
            this.drawText('RELOADING...', left, y, 0.009);
            y -= lineHeight * 0.7;
            
            // Progress bar
            const barLeft = left;
            const barRight = DEFENSE_STATUS_RIGHT - 0.03;
            const barWidth = barRight - barLeft;
            const barHeight = 0.025;
            
            // Outline
            this.segments.push([barLeft, y, barRight, y]);
            this.segments.push([barRight, y, barRight, y + barHeight]);
            this.segments.push([barRight, y + barHeight, barLeft, y + barHeight]);
            this.segments.push([barLeft, y + barHeight, barLeft, y]);
            
            // Fill
            const progress = 1 - (this.reloadTimer / DEFENSE_RELOAD_TIME);
            const fillWidth = barWidth * progress;
            if (fillWidth > 0.005) {
                for (let i = 0; i < 4; i++) {
                    const fy = y + 0.005 + i * 0.005;
                    this.segments.push([barLeft + 0.003, fy, barLeft + fillWidth - 0.003, fy]);
                }
            }
            
            // Time remaining
            this.drawText(this.reloadTimer.toFixed(1) + 's', barRight + 0.01, y + 0.005, 0.008);
        } else {
            // Ready to fire - no blinking, always visible
            this.drawText('>> READY TO FIRE <<', left, y, 0.009);
        }
        y -= lineHeight;
        
        // Hint
        this.drawText('[SPACE] FIRE  [ARROWS] AIM', left, DEFENSE_STATUS_BOTTOM + 0.02, 0.008);
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
const defenseProgram = new DefenseProgram();

