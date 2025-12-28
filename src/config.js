// Oscilloscope Configuration Constants
// AIDEV-NOTE: All magic numbers live here - no hardcoded values elsewhere

const CONFIG = {
    // Canvas dimensions
    CANVAS_WIDTH: 640,
    CANVAS_HEIGHT: 480,
    
    // Phosphor display settings
    PHOSPHOR_COLOR: [0.2, 1.0, 0.3],      // Classic green phosphor
    PHOSPHOR_DECAY: 0.65,                   // 65% brightness remaining after 1/60th second (faster fade)
    GLOW_INTENSITY: 0.8,                    // Intensity of the phosphor glow
    SCANLINE_INTENSITY: 0.15,               // Subtle scanlines
    NOISE_AMOUNT: 0.02,                     // Background noise level
    
    // Text rendering settings
    TEXT_CHAR_WIDTH: 0.038,                 // Width of each character in UV space
    TEXT_CHAR_HEIGHT: 0.07,                 // Height of each character
    TEXT_LINE_SPACING: 0.09,                // Vertical spacing between lines
    TEXT_START_X: 0.05,                     // Left margin
    TEXT_START_Y: 0.88,                     // Top of text area (UV coords, Y=1 is top)
    TEXT_MAX_X: 0.95,                       // Right margin (for word wrapping)
    TEXT_TYPING_SPEED_MS: 50,               // Milliseconds per character
    
    // Frame rate target
    TARGET_FPS: 60,
    FRAME_TIME_MS: 1000 / 60,
};

// Freeze config to prevent accidental modification
Object.freeze(CONFIG);

