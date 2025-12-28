// Shader Sources for Oscilloscope Display
// AIDEV-NOTE: Stored as JS strings to avoid fetch() CORS issues with file:// protocol

const SHADERS = {
    
    // Simple vertex shader for fullscreen quad
    vertex: `#version 300 es
in vec2 aPosition;
out vec2 vUv;

void main() {
    vUv = aPosition * 0.5 + 0.5;
    gl_Position = vec4(aPosition, 0.0, 1.0);
}`,

    // Fade/decay the phosphor buffer (single channel intensity)
    fade: `#version 300 es
precision highp float;

in vec2 vUv;
out vec4 fragColor;

uniform sampler2D uPrevFrame;
uniform float uDecay;

void main() {
    float prev = texture(uPrevFrame, vUv).r;
    fragColor = vec4(prev * uDecay, 0.0, 0.0, 1.0);
}`,

    // Composite - apply phosphor color with artifacts and effects
    // AIDEV-NOTE: Artifacts controlled by uniforms (0-1), can fade in/out dynamically
    composite: `#version 300 es
precision highp float;

in vec2 vUv;
out vec4 fragColor;

uniform sampler2D uPhosphorBuffer;
uniform vec3 uPhosphorColor;
uniform float iTime;
uniform vec2 iResolution;

// Artifact controls (0.0 = off, 1.0 = full)
uniform float uNoise;        // Static/snow
uniform float uFlicker;      // Brightness variation
uniform float uDistortion;   // Horizontal sync issues
uniform float uInterference; // Rolling EMI bands
uniform float uJitter;       // Position wobble

// Pseudo-random function
float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

// Value noise
float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

void main() {
    vec2 uv = vUv;
    
    // === JITTER (position wobble) ===
    if (uJitter > 0.0) {
        float jitterX = (noise(vec2(iTime * 50.0, uv.y * 10.0)) - 0.5) * 0.01 * uJitter;
        float jitterY = (noise(vec2(iTime * 47.0, uv.x * 10.0)) - 0.5) * 0.005 * uJitter;
        uv += vec2(jitterX, jitterY);
    }
    
    // === HORIZONTAL SYNC DISTORTION ===
    if (uDistortion > 0.0) {
        // Occasional horizontal line shifts
        float lineNoise = hash(vec2(floor(uv.y * 200.0), floor(iTime * 10.0)));
        if (lineNoise > (1.0 - uDistortion * 0.1)) {
            uv.x += (hash(vec2(uv.y * 100.0, iTime)) - 0.5) * 0.05 * uDistortion;
        }
        // Wavy distortion
        uv.x += sin(uv.y * 30.0 + iTime * 5.0) * 0.002 * uDistortion;
    }
    
    // Sample the phosphor buffer
    float intensity = texture(uPhosphorBuffer, uv).r;
    
    // Soft tone mapping
    float mapped = 1.0 - exp(-intensity * 1.5);
    
    // === STATIC/NOISE ===
    if (uNoise > 0.0) {
        float staticNoise = hash(uv * iResolution + iTime * 1000.0);
        mapped += (staticNoise - 0.5) * uNoise * 0.3;
        mapped = max(0.0, mapped);
    }
    
    // === INTERFERENCE BANDS (EMI) ===
    if (uInterference > 0.0) {
        // Rolling horizontal bands - dark bars moving up screen
        float band = sin(uv.y * 30.0 - iTime * 2.0) * 0.5 + 0.5;
        band = pow(band, 2.0);  // Softer bands (more visible)
        mapped *= 1.0 - band * uInterference * 0.7;
        
        // Secondary faster, thinner bands
        float band2 = sin(uv.y * 80.0 + iTime * 5.0) * 0.5 + 0.5;
        mapped *= 1.0 - pow(band2, 3.0) * uInterference * 0.4;
        
        // Occasional bright flash/spike
        float spike = pow(sin(iTime * 1.5) * 0.5 + 0.5, 8.0);
        mapped += spike * uInterference * 0.3;
    }
    
    // === FLICKER ===
    if (uFlicker > 0.0) {
        float flicker = 1.0 - (noise(vec2(iTime * 20.0, 0.0)) * uFlicker * 0.2);
        // Occasional bigger dips
        if (hash(vec2(floor(iTime * 8.0), 0.0)) > 0.95) {
            flicker *= 0.7;
        }
        mapped *= flicker;
    }
    
    // Apply phosphor color
    vec3 color = uPhosphorColor * mapped;
    
    // Subtle vignette (always on, slight)
    float vignette = 1.0 - length(vUv - 0.5) * 0.3;
    color *= vignette;
    
    fragColor = vec4(color, 1.0);
}`
};

// Freeze to prevent accidental modification
Object.freeze(SHADERS);

