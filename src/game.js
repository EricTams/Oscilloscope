// Oscilloscope Game - Main Controller
// AIDEV-NOTE: Entry point for the game, manages text display and rendering loop

/**
 * Static text buffer - holds line segments and redraws them cyclically
 * Each frame draws a portion of the lines to maintain phosphor persistence
 */
/**
 * Input state - just tracks the text, cursor blink, and callbacks
 */
class InputState {
    constructor() {
        this.text = '';
        this.cursorVisible = true;
        this.cursorBlinkRate = 500;
        this.lastBlinkTime = 0;
        this.onSubmit = null;
    }
    
    update(currentTime) {
        if (currentTime - this.lastBlinkTime > this.cursorBlinkRate) {
            this.cursorVisible = !this.cursorVisible;
            this.lastBlinkTime = currentTime;
        }
    }
    
    addChar(char) {
        if (this.text.length < 70) {  // Tektronix 4010: 74 char line
            this.text += char.toUpperCase();
        }
    }
    
    backspace() {
        this.text = this.text.slice(0, -1);
    }
    
    submit() {
        const submitted = this.text;
        this.text = '';
        if (this.onSubmit) {
            this.onSubmit(submitted);
        }
        return submitted;
    }
    
    clear() {
        this.text = '';
    }
    
    getDisplayText() {
        return this.text + (this.cursorVisible ? '*' : ' ');
    }
}

/**
 * Terminal display - scrolling text buffer + separator + input area
 * Renders as one unified pass
 * AIDEV-NOTE: Text buffer and input are separate data, but draw together
 * AIDEV-NOTE: Uses snapshot-based drawing to prevent banding artifacts
 */
class Terminal {
    constructor(oscilloscope, totalLines = 35) {
        this.oscilloscope = oscilloscope;
        this.totalLines = totalLines;  // Total visible lines including input area
        this.textLines = [];           // Scrolling text buffer
        this.inputState = null;        // Reference to input state (set externally)
        
        // Layout (Tektronix 4010 style)
        this.startX = 0.03;
        this.startY = 0.96;
        this.charWidth = 0.0105;
        this.charHeight = 0.022;
        this.lineHeight = this.charHeight * 1.4;
        
        // Separator
        this.separator = '________________________________________________________________________';
        
        // Snapshot-based rendering state
        // We take a snapshot of segments and draw through it completely
        // before taking a new snapshot - DO NOT recalculate mid-draw!
        this.drawSnapshot = [];        // Current snapshot being drawn
        this.drawIndex = 0;            // Where we are in the snapshot
        this.segmentsPerSecond = 180000; // Target drawing rate (~3000/frame at 60fps)
        
        // External graphics sources (like the cube) register here
        this.graphicsSources = [];     // Array of objects with getSegments() method
    }
    
    /**
     * Register a graphics source that provides segments for the snapshot
     * Source must have a getSegments() method that returns array of [x1,y1,x2,y2]
     */
    registerGraphicsSource(source) {
        this.graphicsSources.push(source);
    }
    
    /**
     * Get max text lines (total minus 3 for separator + 2 input lines)
     */
    get maxTextLines() {
        return this.totalLines - 3;
    }
    
    /**
     * Print text and advance to next line
     */
    println(text = '') {
        this.textLines.push(text);
        
        // Scroll if too many lines
        while (this.textLines.length > this.maxTextLines) {
            this.textLines.shift();
        }
    }
    
    /**
     * Clear text buffer (not input)
     */
    clear() {
        this.textLines = [];
        this.drawSnapshot = [];  // Force new snapshot on next update
        this.drawIndex = 0;
    }
    
    /**
     * Generate segments from current text buffer + input + graphics sources (for snapshot)
     * AIDEV-NOTE: This is called ONLY when starting a new draw cycle
     */
    generateSegments() {
        const segments = [];
        
        let y = this.startY;
        
        // 1. Render text lines
        for (const line of this.textLines) {
            this.renderLineToArray(line, y, segments);
            y -= this.lineHeight;
        }
        
        // 2. Skip to bottom for input area (fixed position)
        const inputAreaY = this.startY - (this.totalLines - 3) * this.lineHeight;
        
        // 3. Render separator
        this.renderLineToArray(this.separator, inputAreaY, segments);
        
        // 4. Render input line
        if (this.inputState) {
            const inputText = this.inputState.getDisplayText();
            this.renderLineToArray(inputText, inputAreaY - this.lineHeight, segments);
        }
        
        // 5. Include segments from all registered graphics sources (cube, etc.)
        // AIDEV-NOTE: Must COPY segments, never push references (source may mutate)
        for (const source of this.graphicsSources) {
            const sourceSegments = source.getSegments();
            for (const seg of sourceSegments) {
                segments.push([seg[0], seg[1], seg[2], seg[3]]);
            }
        }
        
        return segments;
    }
    
    /**
     * Render a single line of text to a segments array
     */
    renderLineToArray(text, y, segments) {
        const charAdvance = this.charWidth * 1.2;
        let x = this.startX;
        
        for (const char of text) {
            const charSegs = getCharacterLines(char);
            for (const seg of charSegs) {
                segments.push([
                    x + seg[0] * this.charWidth,
                    y + seg[1] * this.charHeight,
                    x + seg[2] * this.charWidth,
                    y + seg[3] * this.charHeight
                ]);
            }
            x += charAdvance;
        }
    }
    
    /**
     * Update and draw (call each frame)
     * Uses snapshot-based drawing: finish current snapshot before getting new one
     * AIDEV-NOTE: DO NOT recalculate snapshot until drawing is COMPLETE
     * @param {number} deltaTime - seconds since last frame
     */
    update(deltaTime) {
        // Only get a new snapshot when we've FINISHED drawing the current one
        if (this.drawIndex >= this.drawSnapshot.length) {
            this.drawSnapshot = this.generateSegments();
            this.drawIndex = 0;
        }
        
        if (this.drawSnapshot.length === 0) return;
        
        // Calculate segments to draw this frame (60,000 per second, scaled by deltaTime)
        const segmentsThisFrame = Math.ceil(this.segmentsPerSecond * deltaTime);
        
        // Draw from where we left off
        const endIndex = Math.min(this.drawIndex + segmentsThisFrame, this.drawSnapshot.length);
        
        const batch = [];
        for (let i = this.drawIndex; i < endIndex; i++) {
            const seg = this.drawSnapshot[i];
            if (seg) {
                batch.push(seg[0], seg[1], seg[2], seg[3]);
            }
        }
        
        this.drawIndex = endIndex;
        
        if (batch.length > 0) {
            this.oscilloscope.addLines(new Float32Array(batch));
        }
    }
}

class TextDisplay {
    /**
     * Text display controller for typing text one character at a time
     * @param {OscilloscopeDisplay} oscilloscope 
     */
    constructor(oscilloscope) {
        this.oscilloscope = oscilloscope;
        
        // Current text state
        this.fullText = '';           // The complete text to display
        this.displayedChars = 0;      // How many characters are currently shown
        this.renderedChars = 0;       // How many characters have been sent to renderer
        this.isTyping = false;        // Is the typing animation active
        
        // Typing animation
        this.typingSpeed = CONFIG.TEXT_TYPING_SPEED_MS;
        this.lastTypeTime = 0;
        
        // Text position settings
        this.startX = CONFIG.TEXT_START_X;
        this.startY = CONFIG.TEXT_START_Y;
        this.charWidth = CONFIG.TEXT_CHAR_WIDTH;
        this.charHeight = CONFIG.TEXT_CHAR_HEIGHT;
        
        // Cursor position tracking for incremental rendering
        this.cursorX = this.startX;
        this.cursorY = this.startY;
        
        // Callback when typing completes
        this.onComplete = null;
        
        // Refresh timer for maintaining text visibility
        this.refreshInterval = 100;  // ms between refreshes
        this.lastRefreshTime = 0;
    }
    
    /**
     * Start typing new text
     * @param {string} text - Text to type out
     * @param {Function} [onComplete] - Callback when typing finishes
     */
    typeText(text, onComplete = null) {
        this.fullText = text;
        this.displayedChars = 0;
        this.renderedChars = 0;
        this.isTyping = true;
        this.onComplete = onComplete;
        this.lastTypeTime = performance.now();
        
        // Reset cursor position
        this.cursorX = this.startX;
        this.cursorY = this.startY;
    }
    
    /**
     * Immediately show all text (skip typing animation)
     */
    showAllText() {
        this.displayedChars = this.fullText.length;
        this.isTyping = false;
        this.renderNewCharacters();
        if (this.onComplete) {
            this.onComplete();
            this.onComplete = null;
        }
    }
    
    /**
     * Clear the display
     */
    clear() {
        this.fullText = '';
        this.displayedChars = 0;
        this.renderedChars = 0;
        this.cursorX = this.startX;
        this.cursorY = this.startY;
        this.isTyping = false;
        this.oscilloscope.clearLines();
    }
    
    /**
     * Render new characters incrementally (only unrendered chars)
     * AIDEV-NOTE: This sends only delta to oscilloscope for efficient phosphor persistence
     */
    renderNewCharacters() {
        if (this.renderedChars >= this.displayedChars) return;
        
        const charAdvance = this.charWidth * 1.2;
        const lineHeight = this.charHeight * 1.4;
        const maxX = CONFIG.TEXT_MAX_X;
        
        const lines = [];
        
        // Render characters from renderedChars to displayedChars
        for (let i = this.renderedChars; i < this.displayedChars; i++) {
            const char = this.fullText[i];
            
            // Handle newline
            if (char === '\n') {
                this.cursorX = this.startX;
                this.cursorY -= lineHeight;
                continue;
            }
            
            // Handle space at line start - skip it
            if (char === ' ' && this.cursorX === this.startX) {
                continue;
            }
            
            // Word wrap check - look ahead to see if current word fits
            if (char !== ' ') {
                // Find end of current word
                let wordEnd = i;
                while (wordEnd < this.fullText.length && 
                       this.fullText[wordEnd] !== ' ' && 
                       this.fullText[wordEnd] !== '\n') {
                    wordEnd++;
                }
                const wordLength = wordEnd - i;
                const wordWidth = wordLength * charAdvance;
                
                // Wrap if word doesn't fit and we're not at line start
                if (this.cursorX > this.startX && this.cursorX + wordWidth > maxX) {
                    this.cursorX = this.startX;
                    this.cursorY -= lineHeight;
                }
            }
            
            // Get character line segments
            const charLines = getCharacterLines(char);
            
            // Transform to screen position
            for (const segment of charLines) {
                lines.push(
                    this.cursorX + segment[0] * this.charWidth,
                    this.cursorY + segment[1] * this.charHeight,
                    this.cursorX + segment[2] * this.charWidth,
                    this.cursorY + segment[3] * this.charHeight
                );
            }
            
            // Advance cursor
            this.cursorX += charAdvance;
            
            // Add space after word ends (if next char is space, advance cursor)
            if (i + 1 < this.fullText.length && this.fullText[i + 1] === ' ') {
                // Space will be handled in next iteration
            }
        }
        
        // Send new lines to oscilloscope
        if (lines.length > 0) {
            this.oscilloscope.addLines(new Float32Array(lines));
        }
        
        this.renderedChars = this.displayedChars;
    }
    
    /**
     * Update typing animation (call every frame)
     * @param {number} currentTime - Current timestamp from performance.now()
     */
    update(currentTime) {
        // Handle typing animation
        if (this.isTyping) {
            const elapsed = currentTime - this.lastTypeTime;
            
            if (elapsed >= this.typingSpeed) {
                this.displayedChars++;
                this.lastTypeTime = currentTime;
                
                // Render only new characters
                this.renderNewCharacters();
                
                // Check if typing is complete
                if (this.displayedChars >= this.fullText.length) {
                    this.isTyping = false;
                    if (this.onComplete) {
                        this.onComplete();
                        this.onComplete = null;
                    }
                }
            }
        }
        
        // Periodically refresh displayed text to maintain visibility
        if (this.displayedChars > 0 && currentTime - this.lastRefreshTime >= this.refreshInterval) {
            this.refreshDisplay();
            this.lastRefreshTime = currentTime;
        }
    }
    
    /**
     * Refresh the entire displayed text (for phosphor persistence)
     */
    refreshDisplay() {
        // Temporarily reset cursor to redraw all displayed text
        const savedCursorX = this.cursorX;
        const savedCursorY = this.cursorY;
        const savedRendered = this.renderedChars;
        
        this.cursorX = this.startX;
        this.cursorY = this.startY;
        this.renderedChars = 0;
        
        this.renderNewCharacters();
        
        // Restore cursor state
        this.cursorX = savedCursorX;
        this.cursorY = savedCursorY;
        this.renderedChars = savedRendered;
    }
    
    /**
     * Set typing speed
     * @param {number} ms - Milliseconds per character
     */
    setTypingSpeed(ms) {
        this.typingSpeed = ms;
    }
    
    /**
     * Check if currently typing
     * @returns {boolean}
     */
    isActive() {
        return this.isTyping;
    }
}

// ============================================================================
// Rotating Cube - Demonstrates phosphor persistence
// ============================================================================

class RotatingCube {
    constructor(centerX, centerY, size) {
        this.centerX = centerX;
        this.centerY = centerY;
        this.size = size;
        this.rotationX = 0;
        this.rotationY = 0;
        this.rotationZ = 0;
        this.enabled = true;
        
        // Current segments (updated each frame, used by snapshot system)
        this.segments = [];
        
        // Cube vertices (centered at origin)
        this.vertices = [
            [-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1],  // Back face
            [-1, -1,  1], [1, -1,  1], [1, 1,  1], [-1, 1,  1]   // Front face
        ];
        
        // Edges (pairs of vertex indices)
        this.edges = [
            [0, 1], [1, 2], [2, 3], [3, 0],  // Back face
            [4, 5], [5, 6], [6, 7], [7, 4],  // Front face
            [0, 4], [1, 5], [2, 6], [3, 7]   // Connecting edges
        ];
    }
    
    /**
     * Rotate a 3D point around X, Y, Z axes
     */
    rotatePoint(x, y, z) {
        // Rotate around X
        let y1 = y * Math.cos(this.rotationX) - z * Math.sin(this.rotationX);
        let z1 = y * Math.sin(this.rotationX) + z * Math.cos(this.rotationX);
        
        // Rotate around Y
        let x2 = x * Math.cos(this.rotationY) + z1 * Math.sin(this.rotationY);
        let z2 = -x * Math.sin(this.rotationY) + z1 * Math.cos(this.rotationY);
        
        // Rotate around Z
        let x3 = x2 * Math.cos(this.rotationZ) - y1 * Math.sin(this.rotationZ);
        let y3 = x2 * Math.sin(this.rotationZ) + y1 * Math.cos(this.rotationZ);
        
        return [x3, y3, z2];
    }
    
    /**
     * Project 3D point to 2D screen (simple perspective)
     */
    project(x, y, z) {
        const fov = 2.5;
        const scale = fov / (fov + z);
        return [
            this.centerX + x * scale * this.size,
            this.centerY + y * scale * this.size
        ];
    }
    
    /**
     * Update rotation and recalculate segments (called every frame)
     * Segments are stored, not drawn - they'll be included in the next snapshot
     */
    update(deltaTime) {
        if (!this.enabled) {
            this.segments = [];
            return;
        }
        
        // Rotate the cube
        this.rotationX += deltaTime * 0.7;
        this.rotationY += deltaTime * 1.1;
        this.rotationZ += deltaTime * 0.3;
        
        // Generate projected edges as segments
        this.segments = [];
        
        for (const [i1, i2] of this.edges) {
            const v1 = this.vertices[i1];
            const v2 = this.vertices[i2];
            
            // Rotate vertices
            const r1 = this.rotatePoint(v1[0], v1[1], v1[2]);
            const r2 = this.rotatePoint(v2[0], v2[1], v2[2]);
            
            // Project to 2D
            const p1 = this.project(r1[0], r1[1], r1[2]);
            const p2 = this.project(r2[0], r2[1], r2[2]);
            
            this.segments.push([p1[0], p1[1], p2[0], p2[1]]);
        }
    }
    
    /**
     * Get current segments for snapshot system
     */
    getSegments() {
        return this.segments;
    }
    
    setEnabled(enabled) {
        this.enabled = enabled;
    }
    
    setPosition(x, y) {
        this.centerX = x;
        this.centerY = y;
    }
    
    setSize(size) {
        this.size = size;
    }
}

// ============================================================================
// Main Game Initialization
// ============================================================================

let oscilloscope = null;
let textDisplay = null;
let terminal = null;
let inputState = null;
let cube = null;
let animationFrameId = null;
let lastFrameTime = 0;

// Background music
// AIDEV-NOTE: Plays quietly on loop, started on first user interaction (browser autoplay policy)
const BACKGROUND_MUSIC_VOLUME = 0.15;  // Quiet background level
let backgroundMusic = null;
let backgroundMusicStarted = false;

function initBackgroundMusic() {
    backgroundMusic = new Audio('sounds/music/Space Sounds.mp3');
    backgroundMusic.loop = true;
    backgroundMusic.volume = BACKGROUND_MUSIC_VOLUME;
}

function startBackgroundMusic() {
    if (backgroundMusicStarted || !backgroundMusic) return;
    backgroundMusic.play().then(() => {
        backgroundMusicStarted = true;
        console.log('Background music started');
    }).catch(err => {
        // Browser blocked autoplay, will try again on next interaction
        console.log('Background music blocked, will retry on interaction');
    });
}

// FPS tracking
let fpsFrameCount = 0;
let fpsLastTime = 0;
let currentFPS = 0;

// Display modes
// AIDEV-NOTE: Command Mode = mixed text/graphics + input; Direct Mode = full program control
const MODE_COMMAND = 'command';
const MODE_DIRECT = 'direct';
let currentMode = MODE_COMMAND;
let directModeProgram = null;  // Object with update(dt), getSegments(), handleKey(key, down)
let directModeProgramName = null;

// Dev mode - when active, all commands are available regardless of requiresFlag
let devMode = false;

/**
 * Enter Direct Mode - gives full screen control to a program
 * @param {Object} program - Object with init(), update(dt), getSegments(), handleKey(key, down)
 * @param {string} name - Program name for display
 */
function enterDirectMode(program, name) {
    currentMode = MODE_DIRECT;
    directModeProgram = program;
    directModeProgramName = name || 'PROGRAM';
    // Clear screen and init program
    if (oscilloscope) {
        oscilloscope.clearLines();
    }
    if (program.init) {
        program.init();
    }
    console.log(`Entered Direct Mode: ${name} (Ctrl+C to exit)`);
}

/**
 * Return to Command Mode from Direct Mode
 * AIDEV-NOTE: Calls cleanup() on program if it exists (for audio, WebGL resources, etc.)
 */
function enterCommandMode() {
    // Call cleanup on current program if it has one
    if (directModeProgram && directModeProgram.cleanup) {
        directModeProgram.cleanup();
    }
    
    currentMode = MODE_COMMAND;
    directModeProgram = null;
    directModeProgramName = null;
    // Clear screen and restore command mode display
    if (oscilloscope) {
        oscilloscope.clearLines();
    }
    
    // Refresh status display when returning to command mode (shows current power level)
    if (terminal) {
        updateStationStatus();
    }
    
    console.log('Returned to Command Mode');
}

// Ambient artifact state - random fluctuations for damaged station feel
// AIDEV-NOTE: Each artifact has its own phase and speed for organic variation
// Exposed to window so EventSystem can disable during spikes
const ambientArtifacts = {
    enabled: true,
    time: 0,
    // Each artifact: { phase, speed, min, max }
    noise:        { phase: Math.random() * 100, speed: 0.3,  min: 0.0, max: 0.15 },
    flicker:      { phase: Math.random() * 100, speed: 0.5,  min: 0.0, max: 0.25 },
    distortion:   { phase: Math.random() * 100, speed: 0.2,  min: 0.2, max: 0.5  },
    interference: { phase: Math.random() * 100, speed: 0.15, min: 0.0, max: 0.2  },
    jitter:       { phase: Math.random() * 100, speed: 0.4,  min: 0.0, max: 0.15 },
};
window.ambientArtifacts = ambientArtifacts;

function updateAmbientArtifacts(deltaTime) {
    if (!ambientArtifacts.enabled || !oscilloscope) return;
    
    ambientArtifacts.time += deltaTime;
    const t = ambientArtifacts.time;
    
    for (const [name, cfg] of Object.entries(ambientArtifacts)) {
        if (name === 'enabled' || name === 'time') continue;
        
        // Use multiple sine waves for organic feel
        const wave1 = Math.sin(t * cfg.speed + cfg.phase);
        const wave2 = Math.sin(t * cfg.speed * 1.7 + cfg.phase * 2.3) * 0.5;
        const wave3 = Math.sin(t * cfg.speed * 0.3 + cfg.phase * 0.7) * 0.3;
        
        // Combine and normalize to 0-1
        const combined = (wave1 + wave2 + wave3) / 1.8;
        const normalized = (combined + 1) / 2;  // 0 to 1
        
        // Map to min-max range
        const value = cfg.min + normalized * (cfg.max - cfg.min);
        oscilloscope.setArtifact(name, value);
    }
}

/**
 * Main game loop
 */
function gameLoop(currentTime) {
    const deltaTime = (currentTime - lastFrameTime) / 1000.0;
    lastFrameTime = currentTime;
    
    // Update event system (handles vitals decay, scripted sequences)
    EventSystem.update(deltaTime);
    
    // Update ambient artifacts (damaged station ambience)
    updateAmbientArtifacts(deltaTime);
    
    // FPS calculation
    fpsFrameCount++;
    if (currentTime - fpsLastTime >= 1000) {
        currentFPS = fpsFrameCount;
        fpsFrameCount = 0;
        fpsLastTime = currentTime;
        // Update FPS display element if it exists
        const fpsEl = document.getElementById('fps-display');
        if (fpsEl) fpsEl.textContent = currentFPS + ' FPS';
    }
    
    if (currentMode === MODE_COMMAND) {
        // Command Mode: mixed graphics/text display with input
        
        // Update input state (cursor blink)
        if (inputState) {
            inputState.update(currentTime);
        }
        
        // Update rotating cube BEFORE terminal (so snapshot gets current position)
        if (cube) {
            cube.update(deltaTime);
        }
        
        // Update terminal (text + input + graphics in one pass via snapshot)
        if (terminal) {
            terminal.update(deltaTime);
        }
        
        // Update text display animation (for typing effect)
        if (textDisplay) {
            textDisplay.update(currentTime);
        }
    } else if (currentMode === MODE_DIRECT) {
        // Direct Mode: full screen control to program
        if (directModeProgram) {
            // Update program
            if (directModeProgram.update) {
                directModeProgram.update(deltaTime);
            }
            // Get segments and draw
            if (directModeProgram.getSegments) {
                const segs = directModeProgram.getSegments();
                if (segs.length > 0) {
                    const batch = [];
                    for (const seg of segs) {
                        batch.push(seg[0], seg[1], seg[2], seg[3]);
                    }
                    oscilloscope.addLines(new Float32Array(batch));
                }
            }
        }
    }
    
    // Render the oscilloscope (pass deltaTime for frame-rate independent decay)
    oscilloscope.render(deltaTime);
    
    // Continue the loop
    animationFrameId = requestAnimationFrame(gameLoop);
}

// ============================================================================
// Command Processing
// ============================================================================

const LOREM_IPSUM = `Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Curabitur pretium tincidunt lacus. Nulla gravida orci a odio. Nullam varius, turpis et commodo pharetra, est eros bibendum elit, nec luctus magna felis sollicitudin mauris. Integer in mauris eu nibh euismod gravida. Duis ac tellus et risus vulputate vehicula.`;

// AIDEV-NOTE: Puzzle definitions for PUZZ command
// Each puzzle has a name and setup function that configures GameState preconditions
const PUZZLES = {
    0: {
        name: 'Reset All State',
        setup: () => {
            GameState.reset();
        }
    },
    1: {
        name: 'Transmitter Ready',
        setup: () => {
            GameState.reset();
            GameState.FixRecieverCompleted = true;
            GameState.FixTransmitterCompleted = true;
            GameState.SignalReceived = true;  // Signal analyzer is available
            // Transmitter is ready but not yet initialized
            // Player needs to talk to Eliza to start the test
        }
    }
};

// AIDEV-NOTE: Helper to check if a command is available based on requiresFlag
// AIDEV-NOTE: Dev mode bypasses all requiresFlag checks
// AIDEV-NOTE: Commands with requiresDevMode only available when dev mode is on
function isCommandAvailable(cmd) {
    // Check if command requires dev mode
    if (cmd.requiresDevMode && !devMode) return false;
    
    // Dev mode: all commands available (except those that require dev mode, which we already checked)
    if (devMode) return true;
    
    // Normal mode: check requiresFlag
    if (!cmd.requiresFlag) return true;
    return GameState[cmd.requiresFlag] === true;
}

const COMMANDS = {
    'COMMANDS': {
        description: 'List available commands',
        action: () => {
            terminal.println('');
            terminal.println('AVAILABLE COMMANDS:');
            terminal.println('');
            for (const [name, cmd] of Object.entries(COMMANDS)) {
                // Only show commands that are available (no requiresFlag or flag is true)
                if (isCommandAvailable(cmd)) {
                    terminal.println('  ' + name + ' - ' + cmd.description);
                }
            }
            terminal.println('');
        }
    },
    'CLEAR': {
        description: 'Clear the screen',
        action: () => {
            terminal.clear();
            oscilloscope.clearLines();
        }
    },
    'STATUS': {
        description: 'Life support monitor (CTRL+C to exit)',
        action: () => {
            terminal.println('LOADING STATUS MONITOR...');
            setTimeout(() => {
                enterDirectMode(statusMonitor, 'STATUS');
            }, 300);
        }
    },
    'SOLAR': {
        description: 'Solar panel alignment (fix power)',
        requiresFlag: 'NeedsSolarProgram',
        action: () => {
            terminal.println('LOADING SOLAR ARRAY CONTROL...');
            terminal.println('ARROWS=SELECT/ROTATE  CTRL+C=QUIT');
            setTimeout(() => {
                enterDirectMode(solarProgram, 'SOLAR');
            }, 300);
        }
    },
    'CUBE': {
        description: 'Toggle the rotating cube',
        requiresFlag: 'CubeUnlocked',
        action: () => {
            if (cube) {
                cube.setEnabled(!cube.enabled);
                terminal.println(cube.enabled ? 'Cube enabled' : 'Cube disabled');
            }
        }
    },
    'ROCKS': {
        description: 'Play Asteroids (WASD + SPACE)',
        requiresFlag: 'RocksUnlocked',
        action: () => {
            terminal.println('LAUNCHING ROCKS...');
            terminal.println('WASD=MOVE  SPACE=FIRE  CTRL+C=QUIT');
            // Small delay so message is visible
            setTimeout(() => {
                enterDirectMode(rocksGame, 'ROCKS');
            }, 500);
        }
    },
    'MOONTAXI': {
        description: 'Space Taxi game (W=THRUST A/D=ROTATE)',
        requiresFlag: 'MoonTaxiUnlocked',
        action: () => {
            terminal.println('LAUNCHING MOON TAXI...');
            terminal.println('W=THRUST  A/D=ROTATE  CTRL+C=QUIT');
            terminal.println('LAND ON PLATFORMS TO PICK UP FARES');
            setTimeout(() => {
                enterDirectMode(moonTaxiGame, 'MOONTAXI');
            }, 500);
        }
    },
    'ELIZA': {
        description: 'Talk to stasis bay AI (requires LLM)',
        action: () => {
            terminal.println('CONNECTING TO STASIS BAY...');
            setTimeout(() => {
                enterDirectMode(elizaProgram, 'ELIZA');
            }, 300);
        }
    },
    'CHESS': {
        description: 'Chess Sorcerer - play chess vs evil AI',
        requiresFlag: 'ChessUnlocked',
        action: () => {
            terminal.println('SUMMONING THE SORCERER...');
            terminal.println('ARROWS=MOVE SPACE=SELECT D=DEBUG');
            terminal.println('1-4=DIFFICULTY R=RESTART CTRL-C=QUIT');
            setTimeout(() => {
                enterDirectMode(chessSorcererGame, 'CHESS');
            }, 500);
        }
    },
    'ANALYZER': {
        description: 'Signal analyzer - FFT spectrum display',
        requiresFlag: 'SignalReceived',
        action: () => {
            terminal.println('LOADING SIGNAL ANALYZER...');
            terminal.println('SPACE=PLAY  ARROWS=ZOOM  R=RESET');
            terminal.println('CTRL+C=QUIT');
            setTimeout(() => {
                enterDirectMode(signalAnalyzer, 'ANALYZER');
            }, 500);
        }
    },
    'REACTOR': {
        description: 'Plasma containment reactor control',
        action: () => {
            terminal.println('LOADING REACTOR CONTROL...');
            terminal.println('ARROWS=SELECT/ADJUST  SPACE=INJECT');
            terminal.println('CTRL+C=QUIT');
            setTimeout(() => {
                enterDirectMode(reactorProgram, 'REACTOR');
            }, 300);
        }
    },
    'ARTIFACTS': {
        description: 'Demo all visual artifacts',
        requiresDevMode: true,
        action: () => {
            terminal.println('ARTIFACT TEST - 10 SECONDS');
            const artifacts = ['noise', 'flicker', 'distortion', 'interference', 'jitter'];
            const duration = 2.0;  // 2 seconds per artifact (1s in, 1s out)
            let elapsed = 0;
            let lastTime = performance.now();
            
            // Disable ambient artifacts during test
            const wasAmbientEnabled = ambientArtifacts.enabled;
            ambientArtifacts.enabled = false;
            
            function animate() {
                const now = performance.now();
                const dt = (now - lastTime) / 1000;
                lastTime = now;
                elapsed += dt;
                
                // Which artifact and where in its cycle
                const totalPerArtifact = duration;
                const currentIndex = Math.floor(elapsed / totalPerArtifact);
                const cycleTime = elapsed % totalPerArtifact;
                
                // Reset all artifacts
                oscilloscope.setArtifacts({ noise: 0, flicker: 0, distortion: 0, interference: 0, jitter: 0 });
                
                if (currentIndex < artifacts.length) {
                    // Fade in first half, fade out second half
                    let value;
                    if (cycleTime < totalPerArtifact / 2) {
                        // Fade in
                        value = cycleTime / (totalPerArtifact / 2);
                    } else {
                        // Fade out
                        value = 1.0 - (cycleTime - totalPerArtifact / 2) / (totalPerArtifact / 2);
                    }
                    terminal.println(artifacts[currentIndex].toUpperCase() + ': ' + Math.round(value * 100) + '%');
                    oscilloscope.setArtifact(artifacts[currentIndex], value);
                    requestAnimationFrame(animate);
                } else {
                    // Done - clear all and restore ambient
                    oscilloscope.setArtifacts({ noise: 0, flicker: 0, distortion: 0, interference: 0, jitter: 0 });
                    ambientArtifacts.enabled = wasAmbientEnabled;
                    terminal.println('ARTIFACT TEST COMPLETE');
                }
            }
            
            requestAnimationFrame(animate);
        }
    },
    'SCREENTEST': {
        description: 'Fill screen with test text',
        requiresDevMode: true,
        action: () => {
            terminal.clear();
            oscilloscope.clearLines();
            // Word wrap lorem ipsum into lines (~70 chars), repeat 3 times
            const fullText = (LOREM_IPSUM + ' ' + LOREM_IPSUM + ' ' + LOREM_IPSUM).toUpperCase();
            const words = fullText.split(' ');
            let line = '';
            for (const word of words) {
                if (line.length + word.length + 1 > 70) {
                    terminal.println(line);
                    line = word;
                } else {
                    line = line ? line + ' ' + word : word;
                }
            }
            if (line) terminal.println(line);
        }
    },
    'PUZZ': {
        description: 'List puzzles or set puzzle state (PUZZ [num])',
        action: (args) => {
            if (!args) {
                // List all puzzles
                terminal.println('');
                terminal.println('AVAILABLE PUZZLES:');
                terminal.println('');
                for (const [num, puzzle] of Object.entries(PUZZLES)) {
                    terminal.println('  ' + num + ' - ' + puzzle.name);
                }
                terminal.println('');
                terminal.println('Usage: PUZZ <number>');
            } else {
                const num = parseInt(args, 10);
                if (PUZZLES[num]) {
                    PUZZLES[num].setup();
                    terminal.println('Puzzle ' + num + ' state set: ' + PUZZLES[num].name);
                } else {
                    terminal.println('Unknown puzzle: ' + args);
                }
            }
        }
    },
    'DEV': {
        description: 'Toggle dev mode (unlocks all commands)',
        action: () => {
            devMode = !devMode;
            terminal.println('');
            terminal.println('DEV MODE: ' + (devMode ? 'ON' : 'OFF'));
            terminal.println(devMode ? 'All commands are now available.' : 'Commands restricted by game state.');
            terminal.println('');
        }
    }
};

/**
 * Process a command entered by the user
 * AIDEV-NOTE: Commands can now take arguments (e.g., PUZZ 1)
 */
function processCommand(input) {
    const trimmed = input.trim().toUpperCase();
    
    // Echo the command
    terminal.println('> ' + input);
    
    if (trimmed === '') {
        return;
    }
    
    // Parse command and arguments
    const spaceIndex = trimmed.indexOf(' ');
    const cmd = spaceIndex === -1 ? trimmed : trimmed.substring(0, spaceIndex);
    const args = spaceIndex === -1 ? null : trimmed.substring(spaceIndex + 1).trim();
    
    // Look up command
    if (COMMANDS[cmd]) {
        // Check if command is available (requiresFlag check)
        if (!isCommandAvailable(COMMANDS[cmd])) {
            terminal.println('Unknown command: ' + cmd);
            terminal.println("Type 'COMMANDS' for options");
            return;
        }
        COMMANDS[cmd].action(args);
    } else {
        terminal.println('Unknown command: ' + cmd);
        terminal.println("Type 'COMMANDS' for options");
    }
}

/**
 * Update station status display in command mode
 * AIDEV-NOTE: Called when status changes or periodically to show current power level
 */
function updateStationStatus(showCommandsHint = false) {
    if (!terminal || currentMode !== MODE_COMMAND) return;
    
    const power = GameState.powerLevel.toFixed(1);
    const powerStatus = GameState.powerLevel < 2.4 ? 'CRITICAL' : 'LOW';
    
    terminal.println('STATION STATUS');
    terminal.println('');
    terminal.println('LIFE SUPPORT: ONLINE');
    terminal.println('OXYGEN: 87%');
    terminal.println(`POWER: ${power}% [${powerStatus}]`);
    terminal.println('HULL: INTACT');
    terminal.println('');
    
    if (showCommandsHint) {
        terminal.println("Type 'COMMANDS' for options");
    }
}

/**
 * Initialize the game
 */
function initGame() {
    console.log('Initializing Oscilloscope Display...');
    
    // Initialize program defaults in GameState
    // AIDEV-NOTE: Programs with persistent state should register their defaults here
    SolarProgram.initDefaults();
    
    // Initialize event system (preloads sounds)
    EventSystem.init();
    
    // Initialize background music (will start on first user interaction)
    initBackgroundMusic();
    
    // Initialize LLM setup handlers (buttons, etc.)
    LLM.initSetupHandlers();
    
    // Always show setup screen on startup - lets user choose to continue, change, or skip
    console.log('Showing LLM setup screen');
    LLM.showSetupScreen();
    
    try {
        // Get canvas element
        const canvas = document.getElementById('oscilloscope-canvas');
        if (!canvas) {
            throw new Error('Canvas element not found');
        }
        
        // Create oscilloscope display
        oscilloscope = new OscilloscopeDisplay(canvas);
        console.log('WebGL2 initialized successfully');
        
        // Create text display controller (for typing animations)
        textDisplay = new TextDisplay(oscilloscope);
        
        // Create input state
        inputState = new InputState();
        inputState.onSubmit = (text) => {
            processCommand(text);
        };
        
        // Create unified terminal (text buffer + separator + input)
        terminal = new Terminal(oscilloscope, 32);
        terminal.inputState = inputState;
        
        // Create rotating cube in bottom right corner
        cube = new RotatingCube(0.82, 0.45, 0.1);
        cube.setEnabled(true);
        
        // Register cube with terminal so it draws through the snapshot system
        terminal.registerGraphicsSource(cube);
        
        // Handle keyboard input
        document.addEventListener('keydown', (e) => {
            // Start background music on first interaction (browser autoplay policy)
            startBackgroundMusic();
            
            // Ctrl+C returns to Command Mode from Direct Mode
            if (e.ctrlKey && e.key === 'c') {
                if (currentMode === MODE_DIRECT) {
                    enterCommandMode();
                    e.preventDefault();
                    return;
                }
            }
            
            // Ctrl+D for debug in Direct Mode (must prevent browser bookmark action)
            if (e.ctrlKey && (e.key === 'd' || e.key === 'D')) {
                e.preventDefault();
                if (currentMode === MODE_DIRECT && directModeProgram) {
                    if (directModeProgram.copyDebugToClipboard) {
                        directModeProgram.copyDebugToClipboard();
                    }
                }
                return;
            }
            
            // Ctrl+L for copying full log/transcript (ELIZA only)
            // AIDEV-NOTE: Must prevent browser's "Focus Address Bar" action
            if (e.ctrlKey && (e.key === 'l' || e.key === 'L')) {
                e.preventDefault();
                if (currentMode === MODE_DIRECT && directModeProgram && directModeProgram.copyFullDialogToClipboard) {
                    directModeProgram.copyFullDialogToClipboard();
                }
                return;
            }
            
            // Direct Mode - forward to program
            if (currentMode === MODE_DIRECT && directModeProgram && directModeProgram.handleKey) {
                directModeProgram.handleKey(e.key, true, e);
                e.preventDefault();
                return;
            }
            
            // Command Mode input handling
            if (currentMode === MODE_COMMAND && inputState) {
                if (e.key === 'Backspace') {
                    inputState.backspace();
                    e.preventDefault();
                } else if (e.key === 'Enter') {
                    inputState.submit();
                    e.preventDefault();
                } else if (e.key.length === 1 && /[a-zA-Z0-9 .,!?:\-]/.test(e.key)) {
                    inputState.addChar(e.key);
                    e.preventDefault();
                }
            }
        });
        
        // Key up for Direct Mode
        document.addEventListener('keyup', (e) => {
            if (currentMode === MODE_DIRECT && directModeProgram && directModeProgram.handleKey) {
                directModeProgram.handleKey(e.key, false, e);
            }
        });
        
        // Also start music on click (for mouse/touch users)
        document.addEventListener('click', () => {
            startBackgroundMusic();
        }, { once: true });
        
        // Start the game loop
        lastFrameTime = performance.now();
        animationFrameId = requestAnimationFrame(gameLoop);
        
        // Wait for LLM setup interaction before launching STATUS
        // AIDEV-NOTE: This ensures user has interacted with page (unblocks audio autoplay)
        // The 'llm-setup-complete' event fires when user clicks any button (save, continue, skip)
        window.addEventListener('llm-setup-complete', () => {
            console.log('LLM setup complete - launching STATUS');
            // Launch STATUS after user interaction (allows sound to play)
            setTimeout(() => {
                enterDirectMode(statusMonitor, 'STATUS');
                
                // Trigger opening distress event after STATUS is visible
                // AIDEV-NOTE: User has already interacted, so audio will play
                setTimeout(() => {
                    console.log('Triggering opening distress event (user has interacted)');
                    if (typeof EventSystem !== 'undefined' && oscilloscope) {
                        EventSystem.triggerOpeningDistress(oscilloscope);
                    }
                }, 1500);  // 1.5 second delay - let player orient first
            }, 100);
        }, { once: true });
        
        // Expose for debugging
        window.Game = {
            oscilloscope,
            textDisplay,
            terminal,
            inputState,
            cube,
            // Mode control
            getMode: () => currentMode,
            enterDirectMode,
            enterCommandMode,
            // Terminal-style output (scrolling buffer)
            println: (text) => terminal.println(text || ''),
            // Helper to type new text (animated)
            type: (text) => textDisplay.typeText(text),
            // Helper to clear everything
            clear: () => { 
                textDisplay.clear(); 
                terminal.clear();
                oscilloscope.clearLines();
            },
            // Set phosphor color (RGB 0-1)
            setColor: (r, g, b) => oscilloscope.setPhosphorColor(r, g, b),
            // Set phosphor decay (0-1, higher = longer trails)
            setDecay: (d) => oscilloscope.setDecay(d),
            // Toggle rotating cube
            toggleCube: () => cube.setEnabled(!cube.enabled),
            // Artifact controls (0-1 each)
            // noise, flicker, distortion, interference, jitter
            setArtifact: (name, value) => oscilloscope.setArtifact(name, value),
            setArtifacts: (values) => oscilloscope.setArtifacts(values),
            getArtifacts: () => oscilloscope.getArtifacts(),
            // Ambient artifact control
            setAmbientArtifacts: (enabled) => { ambientArtifacts.enabled = enabled; },
            getAmbientArtifacts: () => ambientArtifacts,
            // Background music control
            setMusicVolume: (v) => { if (backgroundMusic) backgroundMusic.volume = Math.max(0, Math.min(1, v)); },
            getMusicVolume: () => backgroundMusic ? backgroundMusic.volume : 0,
            pauseMusic: () => { if (backgroundMusic) backgroundMusic.pause(); },
            resumeMusic: () => { if (backgroundMusic) backgroundMusic.play(); },
        };
        
        console.log('Game initialized. Use window.Game to interact.');
        console.log('  Game.type("YOUR TEXT HERE") - Type new text');
        console.log('  Game.clear() - Clear display');
        console.log('  Game.setColor(r, g, b) - Change phosphor color (0-1)');
        console.log('  Game.setDecay(0.95) - Set phosphor decay (0-1)');
        console.log('  Game.setArtifact("noise", 0.5) - Set artifact level');
        console.log('  Artifacts: noise, flicker, distortion, interference, jitter');
        
    } catch (error) {
        console.error('Failed to initialize game:', error);
        showError(error.message);
    }
}

/**
 * Show error message in the canvas container
 */
function showError(message) {
    const container = document.getElementById('oscilloscope-bezel');
    if (container) {
        container.innerHTML = `
            <div class="webgl-error">
                <h2>Initialization Failed</h2>
                <p>${message}</p>
                <p>This game requires a WebGL2-capable browser.</p>
            </div>
        `;
    }
}

// Start when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGame);
} else {
    initGame();
}

