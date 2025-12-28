// ROCKS - Asteroids game for oscilloscope display
// AIDEV-NOTE: Program interface: init(), update(deltaTime), getSegments(), handleKey(key, down)

class RocksGame {
    constructor() {
        this.segments = [];
        this.keys = { w: false, a: false, s: false, d: false, space: false };
        this.lastSpace = false;  // For detecting space press (not hold)
        
        // Game bounds (UV space 0-1)
        this.minX = 0.05;
        this.maxX = 0.95;
        this.minY = 0.15;  // Leave room for text at bottom
        this.maxY = 0.95;
        
        // Ship state
        this.ship = {
            x: 0.5,
            y: 0.55,
            angle: Math.PI / 2,  // Pointing up
            vx: 0,
            vy: 0,
            alive: true,
            respawnTimer: 0
        };
        
        // Bullets
        this.bullets = [];
        this.bulletSpeed = 0.8;
        this.bulletLife = 1.5;  // seconds
        this.fireRate = 0.15;   // seconds between shots
        this.fireCooldown = 0;
        
        // Asteroids
        this.asteroids = [];
        
        // Game state
        this.score = 0;
        this.lives = 3;
        this.gameOver = false;
        
        this.init();
    }
    
    init() {
        this.segments = [];
        this.bullets = [];
        this.asteroids = [];
        this.score = 0;
        this.lives = 3;
        this.gameOver = false;
        
        this.ship.x = 0.5;
        this.ship.y = 0.55;
        this.ship.angle = Math.PI / 2;
        this.ship.vx = 0;
        this.ship.vy = 0;
        this.ship.alive = true;
        this.ship.respawnTimer = 0;
        
        // Spawn initial asteroids
        for (let i = 0; i < 4; i++) {
            this.spawnAsteroid(3);  // Size 3 = large
        }
    }
    
    spawnAsteroid(size, x, y) {
        // Random position if not specified (but away from ship)
        if (x === undefined || y === undefined) {
            do {
                x = this.minX + Math.random() * (this.maxX - this.minX);
                y = this.minY + Math.random() * (this.maxY - this.minY);
            } while (Math.hypot(x - this.ship.x, y - this.ship.y) < 0.2);
        }
        
        // Random velocity
        const speed = 0.05 + Math.random() * 0.1;
        const angle = Math.random() * Math.PI * 2;
        
        // Generate irregular polygon shape
        const numPoints = 8 + Math.floor(Math.random() * 4);
        const baseRadius = size * 0.025;
        const points = [];
        
        for (let i = 0; i < numPoints; i++) {
            const a = (i / numPoints) * Math.PI * 2;
            const r = baseRadius * (0.7 + Math.random() * 0.6);
            points.push({ angle: a, radius: r });
        }
        
        this.asteroids.push({
            x, y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            rotation: Math.random() * Math.PI * 2,
            rotSpeed: (Math.random() - 0.5) * 2,
            size,
            radius: baseRadius,
            points
        });
    }
    
    handleKey(key, down) {
        const k = key.toLowerCase();
        if (k === 'w') this.keys.w = down;
        if (k === 'a') this.keys.a = down;
        if (k === 's') this.keys.s = down;
        if (k === 'd') this.keys.d = down;
        if (k === ' ' || k === 'space') this.keys.space = down;
    }
    
    update(deltaTime) {
        if (this.gameOver) {
            // Press space to restart
            if (this.keys.space && !this.lastSpace) {
                this.init();
            }
            this.lastSpace = this.keys.space;
            this.generateSegments();
            return;
        }
        
        // Update ship
        if (this.ship.alive) {
            // Rotation
            if (this.keys.a) this.ship.angle += 3.0 * deltaTime;
            if (this.keys.d) this.ship.angle -= 3.0 * deltaTime;
            
            // Thrust
            if (this.keys.w) {
                const thrust = 0.5 * deltaTime;
                this.ship.vx += Math.cos(this.ship.angle) * thrust;
                this.ship.vy += Math.sin(this.ship.angle) * thrust;
            }
            
            // Brake
            if (this.keys.s) {
                this.ship.vx *= 0.95;
                this.ship.vy *= 0.95;
            }
            
            // Apply velocity with drag
            this.ship.x += this.ship.vx * deltaTime;
            this.ship.y += this.ship.vy * deltaTime;
            this.ship.vx *= 0.995;
            this.ship.vy *= 0.995;
            
            // Wrap around screen
            this.ship.x = this.wrap(this.ship.x, this.minX, this.maxX);
            this.ship.y = this.wrap(this.ship.y, this.minY, this.maxY);
            
            // Fire bullets
            this.fireCooldown -= deltaTime;
            if (this.keys.space && !this.lastSpace && this.fireCooldown <= 0) {
                this.bullets.push({
                    x: this.ship.x + Math.cos(this.ship.angle) * 0.02,
                    y: this.ship.y + Math.sin(this.ship.angle) * 0.02,
                    vx: Math.cos(this.ship.angle) * this.bulletSpeed + this.ship.vx * 0.5,
                    vy: Math.sin(this.ship.angle) * this.bulletSpeed + this.ship.vy * 0.5,
                    life: this.bulletLife
                });
                this.fireCooldown = this.fireRate;
            }
        } else {
            // Respawn timer
            this.ship.respawnTimer -= deltaTime;
            if (this.ship.respawnTimer <= 0) {
                this.ship.alive = true;
                this.ship.x = 0.5;
                this.ship.y = 0.55;
                this.ship.vx = 0;
                this.ship.vy = 0;
            }
        }
        
        this.lastSpace = this.keys.space;
        
        // Update bullets
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const b = this.bullets[i];
            b.x += b.vx * deltaTime;
            b.y += b.vy * deltaTime;
            b.life -= deltaTime;
            
            // Wrap bullets
            b.x = this.wrap(b.x, this.minX, this.maxX);
            b.y = this.wrap(b.y, this.minY, this.maxY);
            
            if (b.life <= 0) {
                this.bullets.splice(i, 1);
            }
        }
        
        // Update asteroids
        for (const a of this.asteroids) {
            a.x += a.vx * deltaTime;
            a.y += a.vy * deltaTime;
            a.rotation += a.rotSpeed * deltaTime;
            
            a.x = this.wrap(a.x, this.minX, this.maxX);
            a.y = this.wrap(a.y, this.minY, this.maxY);
        }
        
        // Collision: bullets vs asteroids
        for (let bi = this.bullets.length - 1; bi >= 0; bi--) {
            const b = this.bullets[bi];
            for (let ai = this.asteroids.length - 1; ai >= 0; ai--) {
                const a = this.asteroids[ai];
                const dist = Math.hypot(b.x - a.x, b.y - a.y);
                
                if (dist < a.radius) {
                    // Hit!
                    this.bullets.splice(bi, 1);
                    this.asteroids.splice(ai, 1);
                    
                    // Score based on size
                    this.score += (4 - a.size) * 20;
                    
                    // Split asteroid if big enough
                    if (a.size > 1) {
                        this.spawnAsteroid(a.size - 1, a.x, a.y);
                        this.spawnAsteroid(a.size - 1, a.x, a.y);
                    }
                    
                    break;
                }
            }
        }
        
        // Collision: ship vs asteroids
        if (this.ship.alive) {
            for (const a of this.asteroids) {
                const dist = Math.hypot(this.ship.x - a.x, this.ship.y - a.y);
                if (dist < a.radius + 0.015) {
                    // Ship destroyed
                    this.ship.alive = false;
                    this.lives--;
                    
                    if (this.lives <= 0) {
                        this.gameOver = true;
                    } else {
                        this.ship.respawnTimer = 2.0;
                    }
                    break;
                }
            }
        }
        
        // Spawn new wave if all asteroids destroyed
        if (this.asteroids.length === 0) {
            const waveSize = 4 + Math.floor(this.score / 500);
            for (let i = 0; i < Math.min(waveSize, 10); i++) {
                this.spawnAsteroid(3);
            }
        }
        
        this.generateSegments();
    }
    
    wrap(val, min, max) {
        const range = max - min;
        if (val < min) return val + range;
        if (val > max) return val - range;
        return val;
    }
    
    generateSegments() {
        this.segments = [];
        
        // Draw ship
        if (this.ship.alive) {
            const s = this.ship;
            const size = 0.02;
            
            // Triangle ship
            const nose = { 
                x: s.x + Math.cos(s.angle) * size, 
                y: s.y + Math.sin(s.angle) * size 
            };
            const left = { 
                x: s.x + Math.cos(s.angle + 2.5) * size * 0.7, 
                y: s.y + Math.sin(s.angle + 2.5) * size * 0.7 
            };
            const right = { 
                x: s.x + Math.cos(s.angle - 2.5) * size * 0.7, 
                y: s.y + Math.sin(s.angle - 2.5) * size * 0.7 
            };
            
            this.segments.push([nose.x, nose.y, left.x, left.y]);
            this.segments.push([left.x, left.y, right.x, right.y]);
            this.segments.push([right.x, right.y, nose.x, nose.y]);
            
            // Thrust flame when accelerating
            if (this.keys.w) {
                const flameBase = { x: (left.x + right.x) / 2, y: (left.y + right.y) / 2 };
                const flameTip = {
                    x: s.x - Math.cos(s.angle) * size * (0.8 + Math.random() * 0.4),
                    y: s.y - Math.sin(s.angle) * size * (0.8 + Math.random() * 0.4)
                };
                this.segments.push([flameBase.x, flameBase.y, flameTip.x, flameTip.y]);
            }
        }
        
        // Draw bullets
        for (const b of this.bullets) {
            const len = 0.008;
            const angle = Math.atan2(b.vy, b.vx);
            this.segments.push([
                b.x - Math.cos(angle) * len,
                b.y - Math.sin(angle) * len,
                b.x + Math.cos(angle) * len,
                b.y + Math.sin(angle) * len
            ]);
        }
        
        // Draw asteroids
        for (const a of this.asteroids) {
            const pts = a.points;
            for (let i = 0; i < pts.length; i++) {
                const p1 = pts[i];
                const p2 = pts[(i + 1) % pts.length];
                
                const x1 = a.x + Math.cos(p1.angle + a.rotation) * p1.radius;
                const y1 = a.y + Math.sin(p1.angle + a.rotation) * p1.radius;
                const x2 = a.x + Math.cos(p2.angle + a.rotation) * p2.radius;
                const y2 = a.y + Math.sin(p2.angle + a.rotation) * p2.radius;
                
                this.segments.push([x1, y1, x2, y2]);
            }
        }
        
        // Draw "EXIT: CTRL-C" at top center
        this.drawText("EXIT: CTRL-C", 0.35, 0.96);
        
        // Draw score (top left)
        this.drawNumber(this.score, 0.08, 0.90);
        
        // Draw lives (top right) as small triangles
        for (let i = 0; i < this.lives; i++) {
            const lx = 0.88 - i * 0.03;
            const ly = 0.90;
            const ls = 0.01;
            this.segments.push([lx, ly + ls, lx - ls * 0.7, ly - ls * 0.5]);
            this.segments.push([lx - ls * 0.7, ly - ls * 0.5, lx + ls * 0.7, ly - ls * 0.5]);
            this.segments.push([lx + ls * 0.7, ly - ls * 0.5, lx, ly + ls]);
        }
        
        // Game over text
        if (this.gameOver) {
            this.drawText("GAME OVER", 0.35, 0.55);
            this.drawText("SPACE TO RESTART", 0.28, 0.45);
        }
    }
    
    drawNumber(num, x, y) {
        const str = num.toString();
        const charWidth = 0.025;
        for (let i = 0; i < str.length; i++) {
            this.drawDigit(str[i], x + i * charWidth, y);
        }
    }
    
    drawDigit(d, x, y) {
        const w = 0.015;
        const h = 0.025;
        
        // 7-segment style digits
        const segs = {
            '0': [[0,0,w,0],[w,0,w,h/2],[w,h/2,w,h],[w,h,0,h],[0,h,0,h/2],[0,h/2,0,0]],
            '1': [[w,0,w,h]],
            '2': [[0,0,w,0],[w,0,w,h/2],[w,h/2,0,h/2],[0,h/2,0,h],[0,h,w,h]],
            '3': [[0,0,w,0],[w,0,w,h/2],[w,h/2,0,h/2],[w,h/2,w,h],[w,h,0,h]],
            '4': [[0,0,0,h/2],[0,h/2,w,h/2],[w,0,w,h]],
            '5': [[w,0,0,0],[0,0,0,h/2],[0,h/2,w,h/2],[w,h/2,w,h],[w,h,0,h]],
            '6': [[w,0,0,0],[0,0,0,h],[0,h,w,h],[w,h,w,h/2],[w,h/2,0,h/2]],
            '7': [[0,0,w,0],[w,0,w,h]],
            '8': [[0,0,w,0],[w,0,w,h],[w,h,0,h],[0,h,0,0],[0,h/2,w,h/2]],
            '9': [[0,h,w,h],[w,h,w,0],[w,0,0,0],[0,0,0,h/2],[0,h/2,w,h/2]],
        };
        
        const s = segs[d] || [];
        for (const seg of s) {
            this.segments.push([x + seg[0], y - seg[1], x + seg[2], y - seg[3]]);
        }
    }
    
    drawText(text, x, y) {
        const charWidth = 0.025;
        const charHeight = 0.03;
        let cx = x;
        
        for (const char of text) {
            const charLines = getCharacterLines(char);
            for (const seg of charLines) {
                this.segments.push([
                    cx + seg[0] * charWidth,
                    y + seg[1] * charHeight,
                    cx + seg[2] * charWidth,
                    y + seg[3] * charHeight
                ]);
            }
            cx += charWidth * 1.2;
        }
    }
    
    getSegments() {
        return this.segments;
    }
}

// Global instance
const rocksGame = new RocksGame();

