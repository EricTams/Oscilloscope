// AIDEV-NOTE: Event system for scripted sequences (opening distress, alerts, etc.)
// Events can: play audio, spike artifacts, spike vitals, trigger after delay

const EventSystem = {
    // Track which one-time events have fired
    openingSequencePlayed: false,
    
    // Currently active effects (for artifact management)
    activeEffects: [],
    
    // Audio elements for event sounds
    sounds: {},
    
    // Hull breach state - hold values decay from normal to vacuum
    // AIDEV-NOTE: Realistic physics - pressure drops instantly (air rushes out),
    // temperature cools more slowly (heat transfer takes time)
    breach: {
        active: false,
        startTime: 0,
        
        // Decay durations (realistic timing)
        // AIDEV-NOTE: Pressure drops at medium-large leak rate (45s)
        // Temperature: Thermometer has thermal mass, cools via radiation only in vacuum
        // Initial cooling fast (big temp diff), then slows dramatically as it approaches space temp
        // Realistic: 2-3 min for significant cooling, but full equilibrium takes much longer
        pressureDecayDuration: 45.0,    // 45 seconds - medium-large leak (user preferred speed)
        oxygenDecayDuration: 45.0,      // 45 seconds - drops with pressure
        temperatureDecayDuration: 150.0, // 150 seconds (2.5 min) - thermal mass + radiative cooling
        
        // Normal values (before breach)
        normalOxygen: 21.0,      // 21% (normal air)
        normalTemperature: 20.0, // 20C (room temperature)
        normalPressure: 1.0,      // 1.0 ATM (normal atmospheric)
        
        // Extreme values (vacuum)
        extremeOxygen: 0.0,
        extremeTemperature: -270.0,  // Near absolute zero
        extremePressure: 0.0,
        
        // Current values (interpolated between normal and extreme)
        oxygen: 21.0,
        temperature: 20.0,
        pressure: 1.0
    },
    
    /**
     * Initialize event system (preload sounds)
     */
    init() {
        // Preload event sounds
        this.sounds.structuralGroan = new Audio('sounds/effects/structural_groan.mp3');
        this.sounds.structuralGroan.volume = 0.7;
        
        this.sounds.distress = new Audio('sounds/signals/astronaut_distress.mp3');
        this.sounds.distress.volume = 0.5;
    },
    
    /**
     * Play a sound effect
     * @param {string} soundName - Key in this.sounds
     */
    playSound(soundName) {
        const sound = this.sounds[soundName];
        if (sound) {
            sound.currentTime = 0;
            sound.play().catch(err => {
                console.log('Event sound blocked:', soundName, err.message);
            });
        }
    },
    
    /**
     * Opening distress event - plays when player first wakes in STATUS
     * AIDEV-NOTE: This is the "something's wrong" moment that hooks the player
     * @param {OscilloscopeDisplay} oscilloscope - For artifact control
     */
    triggerOpeningDistress(oscilloscope) {
        if (this.openingSequencePlayed) return;
        this.openingSequencePlayed = true;
        
        console.log('Opening distress event triggered');
        
        // Start hull breach - hold values will decay from normal to vacuum
        this.breach.active = true;
        this.breach.startTime = performance.now();
        this.breach.oxygen = this.breach.normalOxygen;
        this.breach.temperature = this.breach.normalTemperature;
        this.breach.pressure = this.breach.normalPressure;
        
        // Play structural groan sound
        this.playSound('structuralGroan');
        
        // Ramp up player vitals gradually over 2 seconds - panic response builds
        // AIDEV-NOTE: Vitals spike gradually for more realistic panic response
        const rampDuration = 2.0;  // 2 seconds to reach full spike
        const targetHeartRate = 60;        // +60 BPM (from ~72 to ~132)
        const targetRespiration = 12;      // +12 breaths/min (from ~16 to ~28)
        const targetBPSys = 50;            // +50 sys
        const targetBPDia = 35;            // +35 dia
        
        const startTime = performance.now();
        const endTime = startTime + rampDuration * 1000;
        
        const rampUp = () => {
            const now = performance.now();
            const elapsed = (now - startTime) / 1000;
            
            if (now >= endTime) {
                // Ramp complete - set final values directly (don't add, just set)
                VitalsSystem.heartRateSpike = targetHeartRate;
                VitalsSystem.respirationSpike = targetRespiration;
                VitalsSystem.bloodPressureSpike.sys = targetBPSys;
                VitalsSystem.bloodPressureSpike.dia = targetBPDia;
                return;
            }
            
            // Calculate ramp progress (0 to 1) with ease-out curve
            const progress = Math.min(1.0, elapsed / rampDuration);
            // Ease-out: starts fast, slows down (cubic ease-out)
            const eased = 1 - Math.pow(1 - progress, 3);
            
            // Apply current ramp value (clearing previous and setting new)
            // AIDEV-NOTE: We need to track what we've already applied to avoid stacking
            // For now, we'll just gradually increase - the decay will handle smoothing
            const currentHR = targetHeartRate * eased;
            const currentResp = targetRespiration * eased;
            const currentBPSys = targetBPSys * eased;
            const currentBPDia = targetBPDia * eased;
            
            // Set spikes directly (will override previous values)
            VitalsSystem.heartRateSpike = currentHR;
            VitalsSystem.respirationSpike = currentResp;
            VitalsSystem.bloodPressureSpike.sys = currentBPSys;
            VitalsSystem.bloodPressureSpike.dia = currentBPDia;
            
            requestAnimationFrame(rampUp);
        };
        
        requestAnimationFrame(rampUp);
        
        // Spike visual artifacts (jitter at MAX)
        this.spikeArtifacts(oscilloscope, {
            noise: 0.6,
            jitter: 1.0,
            distortion: 0.7,
            flicker: 0.4
        }, 3.0);
    },
    
    /**
     * Spike artifacts temporarily, then decay back
     * @param {OscilloscopeDisplay} oscilloscope 
     * @param {Object} artifacts - { noise, jitter, distortion, flicker, interference }
     * @param {number} duration - How long the spike lasts (seconds)
     * @param {Object} decayRates - Optional per-artifact decay rate multipliers (e.g., { jitter: 3.0 } = 3x faster)
     */
    spikeArtifacts(oscilloscope, artifacts, duration, decayRates = {}) {
        const startTime = performance.now();
        const endTime = startTime + duration * 1000;
        
        // Store original ambient state
        const wasAmbientEnabled = window.ambientArtifacts?.enabled;
        
        // Disable ambient artifacts during spike
        if (window.ambientArtifacts) {
            window.ambientArtifacts.enabled = false;
        }
        
        // Apply initial spike
        oscilloscope.setArtifacts(artifacts);
        
        // Animate decay
        const animate = () => {
            const now = performance.now();
            const elapsed = (now - startTime) / 1000;
            
            if (now >= endTime) {
                // Done - restore ambient
                oscilloscope.setArtifacts({ noise: 0, jitter: 0, distortion: 0, flicker: 0, interference: 0 });
                if (window.ambientArtifacts) {
                    window.ambientArtifacts.enabled = wasAmbientEnabled;
                }
                return;
            }
            
            // Apply decayed values (with per-artifact decay rates)
            const decayed = {};
            for (const [key, value] of Object.entries(artifacts)) {
                // Calculate decay for this artifact (with optional rate multiplier)
                const rate = decayRates[key] || 1.0;
                const progress = Math.min(1.0, (elapsed * rate) / duration);
                const decay = 1 - Math.pow(progress, 0.5);  // Slower decay at start
                decayed[key] = value * decay;
            }
            oscilloscope.setArtifacts(decayed);
            
            requestAnimationFrame(animate);
        };
        
        requestAnimationFrame(animate);
    },
    
    /**
     * Update event system (call each frame)
     * @param {number} deltaTime - seconds since last frame
     */
    update(deltaTime) {
        // Update vitals system
        VitalsSystem.update(deltaTime);
        
        // Update breach decay if active
        // AIDEV-NOTE: Pressure and oxygen drop quickly (air rushes out),
        // temperature cools more slowly (heat transfer takes time)
        if (this.breach.active) {
            const elapsed = (performance.now() - this.breach.startTime) / 1000;
            
            // Pressure and oxygen - fast decay (air escaping)
            const pressureProgress = Math.min(1.0, elapsed / this.breach.pressureDecayDuration);
            const pressureEased = 1 - Math.pow(1 - pressureProgress, 3);  // Fast ease-out
            
            this.breach.pressure = this.breach.normalPressure + 
                (this.breach.extremePressure - this.breach.normalPressure) * pressureEased;
            
            this.breach.oxygen = this.breach.normalOxygen + 
                (this.breach.extremeOxygen - this.breach.normalOxygen) * pressureEased;
            
            // Temperature - slower decay (thermal mass + radiative cooling)
            // AIDEV-NOTE: Uses stronger ease-out curve - fast initial drop, then very slow
            // This models thermal mass holding heat + radiative cooling slowing as temp approaches space temp
            const tempProgress = Math.min(1.0, elapsed / this.breach.temperatureDecayDuration);
            const tempEased = 1 - Math.pow(1 - tempProgress, 4);  // Strong ease-out - holds heat longer
            
            this.breach.temperature = this.breach.normalTemperature + 
                (this.breach.extremeTemperature - this.breach.normalTemperature) * tempEased;
        }
    },
    
    /**
     * Reset event system (for new game)
     */
    reset() {
        this.openingSequencePlayed = false;
        this.breach.active = false;
        this.breach.oxygen = this.breach.normalOxygen;
        this.breach.temperature = this.breach.normalTemperature;
        this.breach.pressure = this.breach.normalPressure;
        VitalsSystem.reset();
    },
    
    /**
     * Get current breach state (for STATUS monitor)
     * @returns {Object} { oxygen, temperature, pressure, hullBreach }
     */
    getBreachState() {
        return {
            oxygen: this.breach.oxygen,
            temperature: this.breach.temperature,
            pressure: this.breach.pressure,
            hullBreach: this.breach.active
        };
    }
};

