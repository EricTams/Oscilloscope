// AIDEV-NOTE: Global vitals system - tracks player physiological state
// Separate from STATUS display so events can influence vitals globally
// STATUS reads from this system; events write to it

const VitalsSystem = {
    // Base values (what vitals return to over time)
    baseHeartRate: 72,
    baseOxygen: 94,
    baseTemperature: 98.6,
    baseRespiration: 16,
    baseBloodPressure: { sys: 120, dia: 80 },
    
    // Current values (includes event-driven spikes)
    heartRate: 72,
    oxygen: 94,
    temperature: 98.6,
    respiration: 16,
    bloodPressure: { sys: 120, dia: 80 },
    
    // Spike state - applied on top of natural drift
    // AIDEV-NOTE: Spike decays back to 0 over time (exponential decay)
    heartRateSpike: 0,
    respirationSpike: 0,
    bloodPressureSpike: { sys: 0, dia: 0 },
    
    // Decay rate for spikes (half-life in seconds)
    // AIDEV-NOTE: Higher = slower decay. 30 seconds means spike takes ~30 seconds to decay to half
    spikeHalfLife: 30.0,
    
    // Natural drift time (for subtle variation)
    driftTime: 0,
    
    /**
     * Spike the heart rate by a delta amount
     * @param {number} delta - Amount to add to heart rate (e.g., 40 for stress)
     */
    spikeHeartRate(delta) {
        this.heartRateSpike += delta;
    },
    
    /**
     * Spike respiration by a delta amount
     */
    spikeRespiration(delta) {
        this.respirationSpike += delta;
    },
    
    /**
     * Spike blood pressure
     */
    spikeBloodPressure(sysDelta, diaDelta) {
        this.bloodPressureSpike.sys += sysDelta;
        this.bloodPressureSpike.dia += diaDelta;
    },
    
    /**
     * Apply a stress response (spikes multiple vitals at once)
     * @param {number} intensity - 0 to 1, how stressed
     */
    applyStress(intensity) {
        const i = Math.max(0, Math.min(1, intensity));
        this.spikeHeartRate(40 * i);
        this.spikeRespiration(8 * i);
        this.spikeBloodPressure(30 * i, 20 * i);
    },
    
    /**
     * Update vitals (call each frame)
     * @param {number} deltaTime - seconds since last frame
     */
    update(deltaTime) {
        this.driftTime += deltaTime;
        
        // Decay spikes toward 0 using exponential decay with half-life
        // AIDEV-NOTE: Formula: decay = 0.5^(deltaTime / halfLife)
        // This means spike decays to 50% after halfLife seconds
        const decayFactor = Math.pow(0.5, deltaTime / this.spikeHalfLife);
        this.heartRateSpike *= decayFactor;
        this.respirationSpike *= decayFactor;
        this.bloodPressureSpike.sys *= decayFactor;
        this.bloodPressureSpike.dia *= decayFactor;
        
        // Clear very small spikes
        if (Math.abs(this.heartRateSpike) < 0.5) this.heartRateSpike = 0;
        if (Math.abs(this.respirationSpike) < 0.1) this.respirationSpike = 0;
        if (Math.abs(this.bloodPressureSpike.sys) < 0.5) this.bloodPressureSpike.sys = 0;
        if (Math.abs(this.bloodPressureSpike.dia) < 0.5) this.bloodPressureSpike.dia = 0;
        
        // Calculate current values: base + natural drift + spike
        const t = this.driftTime;
        
        this.heartRate = this.baseHeartRate + 
            Math.sin(t * 0.5) * 5 +  // Natural drift
            this.heartRateSpike;
        
        this.oxygen = this.baseOxygen + Math.sin(t * 0.3) * 2;
        
        this.temperature = this.baseTemperature + Math.sin(t * 0.2) * 0.3;
        
        this.respiration = this.baseRespiration + 
            Math.sin(t * 0.4) * 2 +
            this.respirationSpike;
        
        this.bloodPressure.sys = this.baseBloodPressure.sys + 
            Math.sin(t * 0.25) * 8 +
            this.bloodPressureSpike.sys;
            
        this.bloodPressure.dia = this.baseBloodPressure.dia + 
            Math.sin(t * 0.3) * 5 +
            this.bloodPressureSpike.dia;
    },
    
    /**
     * Reset to base state (no spikes)
     */
    reset() {
        this.heartRateSpike = 0;
        this.respirationSpike = 0;
        this.bloodPressureSpike.sys = 0;
        this.bloodPressureSpike.dia = 0;
        this.driftTime = 0;
    }
};

