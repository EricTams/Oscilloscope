// SIGNAL ANALYZER - Signal Definitions
// AIDEV-NOTE: Each signal has a frequency (MHz), name, and required game flag
// Signals only appear when their game flag is set to true

const BROADCAST_SIGNALS = [
    { 
        freq: 5.0,     // MHz - Emergency band
        name: 'ASTRONAUT_DISTRESS', 
        gameFlag: null,  // Always available
        file: 'sounds/signals/astronaut_distress.mp3'
    },
    { 
        freq: 7.250,   // MHz
        name: 'UNKNOWN_SIGNAL_1', 
        gameFlag: 'SignalReceived',
        file: 'sounds/signals/Unknown_Signal_1.wav'
    },
    { 
        freq: 14.175,  // MHz
        name: 'DISTRESS_BEACON', 
        gameFlag: 'DistressDetected',
        file: 'sounds/signals/Distress_Beacon.wav'
    },
    { 
        freq: 21.0,    // MHz
        name: 'SPACE_RADIO_1', 
        gameFlag: null,  // Always available
        file: 'sounds/signals/Space Calm Music.mp3'
    },
    { 
        freq: 22.0,    // MHz
        name: 'SPACE_RADIO_2', 
        gameFlag: null,  // Always available
        file: 'sounds/signals/Space Calm Music 2.mp3'
    },
    { 
        freq: 23.0,    // MHz
        name: 'SPACE_RADIO_3', 
        gameFlag: null,  // Always available
        file: 'sounds/signals/Space Calm Music 3.mp3'
    }
];

// Tuner constants
const TUNER_MIN_FREQ = 3.0;    // MHz - Shortwave HF band start
const TUNER_MAX_FREQ = 30.0;   // MHz - Shortwave HF band end
const TUNER_STEP_FINE = 0.001; // 1 kHz fine step
const TUNER_STEP_COARSE = 0.1; // 100 kHz coarse step
const SIGNAL_LOCK_RANGE = 0.05; // +/- 50 kHz to lock onto signal
const SIGNAL_AUDIBLE_RANGE = 0.2; // +/- 200 kHz to hear signal mixed with noise

// Check if a signal is available based on game state
function isSignalAvailable(signal) {
    if (!signal.gameFlag) return true;
    return typeof GameState !== 'undefined' && GameState[signal.gameFlag] === true;
}

// Find the closest available signal to a given frequency
function findNearestSignal(freqMHz) {
    let nearest = null;
    let nearestDist = Infinity;
    
    for (const signal of BROADCAST_SIGNALS) {
        if (!isSignalAvailable(signal)) continue;
        
        const dist = Math.abs(signal.freq - freqMHz);
        if (dist < nearestDist) {
            nearestDist = dist;
            nearest = signal;
        }
    }
    
    return nearest ? { signal: nearest, distance: nearestDist } : null;
}

// Calculate signal strength based on distance from center frequency
// Returns 0-1, where 1 is perfectly tuned
function calculateSignalStrength(freqMHz, signalFreq) {
    const distance = Math.abs(freqMHz - signalFreq);
    
    if (distance > SIGNAL_AUDIBLE_RANGE) return 0;
    if (distance < SIGNAL_LOCK_RANGE) return 1;
    
    // Linear falloff from lock range to audible range
    const range = SIGNAL_AUDIBLE_RANGE - SIGNAL_LOCK_RANGE;
    const distFromLock = distance - SIGNAL_LOCK_RANGE;
    return 1 - (distFromLock / range);
}

