// Oscilloscope Display Renderer - Multi-pass with Phosphor Persistence
// AIDEV-NOTE: Draw lines to buffer, blur, add to phosphor buffer, composite

class OscilloscopeDisplay {
    constructor(canvas) {
        this.canvas = canvas;
        this.gl = null;
        this.startTime = performance.now();
        
        // Shader programs
        this.lineProgram = null;      // Draw raw lines
        this.blurProgram = null;      // Blur draw buffer
        this.fadeProgram = null;      // Decay phosphor
        this.compositeProgram = null; // Final output
        
        // Uniform caches
        this.lineUniforms = null;
        this.blurUniforms = null;
        this.fadeUniforms = null;
        this.compositeUniforms = null;
        
        // Framebuffers
        this.drawBuffer = null;       // Raw lines drawn here
        this.phosphorBufferA = null;  // Ping-pong for persistence
        this.phosphorBufferB = null;
        this.currentBuffer = 0;
        
        // VAOs
        this.quadVAO = null;
        this.lineVAO = null;
        this.lineVBO = null;
        
        // Pending lines
        this.pendingLines = [];
        
        this.init();
    }
    
    init() {
        this.canvas.width = CONFIG.CANVAS_WIDTH;
        this.canvas.height = CONFIG.CANVAS_HEIGHT;
        
        this.gl = initWebGL(this.canvas);
        const gl = this.gl;
        
        this.createShaders();
        this.quadVAO = createFullscreenQuad(gl, this.fadeProgram);
        this.createLineBuffers();
        
        // Create all framebuffers
        this.drawBuffer = createFramebuffer(gl, this.canvas.width, this.canvas.height);
        this.phosphorBufferA = createFramebuffer(gl, this.canvas.width, this.canvas.height);
        this.phosphorBufferB = createFramebuffer(gl, this.canvas.width, this.canvas.height);
        
        this.clearBuffers();
        this.setDefaultUniforms();
        
        console.log('Oscilloscope: Multi-pass bloom renderer initialized');
    }
    
    createShaders() {
        const gl = this.gl;
        
        // Line vertex shader - UV space (0-1) to clip space
        const lineVertexSource = `#version 300 es
            in vec2 aPosition;
            void main() {
                vec2 clipPos = aPosition * 2.0 - 1.0;
                gl_Position = vec4(clipPos, 0.0, 1.0);
            }
        `;
        
        // Line fragment - just output intensity
        const lineFragmentSource = `#version 300 es
            precision highp float;
            uniform float uIntensity;
            out vec4 fragColor;
            void main() {
                fragColor = vec4(uIntensity, 0.0, 0.0, 1.0);
            }
        `;
        
        // Blur shader - Gaussian blur for soft glow
        const blurFragmentSource = `#version 300 es
            precision highp float;
            
            in vec2 vUv;
            out vec4 fragColor;
            
            uniform sampler2D uDrawBuffer;
            uniform vec2 uPixelSize;
            uniform float uBloomRadius;
            uniform float uBloomIntensity;
            
            void main() {
                float result = 0.0;
                
                // Gaussian weights for 3x3 kernel (sigma ~0.85)
                // Center has highest weight, falls off at edges
                float weights[9] = float[](
                    0.0625, 0.125, 0.0625,
                    0.125,  0.25,  0.125,
                    0.0625, 0.125, 0.0625
                );
                
                vec2 offsets[9] = vec2[](
                    vec2(-1, -1), vec2(0, -1), vec2(1, -1),
                    vec2(-1,  0), vec2(0,  0), vec2(1,  0),
                    vec2(-1,  1), vec2(0,  1), vec2(1,  1)
                );
                
                for (int i = 0; i < 9; i++) {
                    vec2 offset = offsets[i] * uPixelSize * uBloomRadius;
                    result += texture(uDrawBuffer, vUv + offset).r * weights[i];
                }
                
                fragColor = vec4(result * uBloomIntensity, 0.0, 0.0, 1.0);
            }
        `;
        
        this.lineProgram = createProgram(gl, lineVertexSource, lineFragmentSource);
        this.lineUniforms = new UniformCache(gl, this.lineProgram);
        
        this.blurProgram = createProgram(gl, SHADERS.vertex, blurFragmentSource);
        this.blurUniforms = new UniformCache(gl, this.blurProgram);
        
        this.fadeProgram = createProgram(gl, SHADERS.vertex, SHADERS.fade);
        this.fadeUniforms = new UniformCache(gl, this.fadeProgram);
        
        this.compositeProgram = createProgram(gl, SHADERS.vertex, SHADERS.composite);
        this.compositeUniforms = new UniformCache(gl, this.compositeProgram);
    }
    
    createLineBuffers() {
        const gl = this.gl;
        
        this.lineVAO = gl.createVertexArray();
        gl.bindVertexArray(this.lineVAO);
        
        this.lineVBO = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.lineVBO);
        
        const posLoc = gl.getAttribLocation(this.lineProgram, 'aPosition');
        gl.enableVertexAttribArray(posLoc);
        gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
        
        gl.bindVertexArray(null);
    }
    
    clearBuffers() {
        const gl = this.gl;
        
        gl.clearColor(0.0, 0.0, 0.0, 0.0);
        
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.drawBuffer.framebuffer);
        gl.clear(gl.COLOR_BUFFER_BIT);
        
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.phosphorBufferA.framebuffer);
        gl.clear(gl.COLOR_BUFFER_BIT);
        
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.phosphorBufferB.framebuffer);
        gl.clear(gl.COLOR_BUFFER_BIT);
        
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }
    
    setDefaultUniforms() {
        const gl = this.gl;
        const [r, g, b] = CONFIG.PHOSPHOR_COLOR;
        
        gl.useProgram(this.lineProgram);
        this.lineUniforms.setFloat('uIntensity', 1.0);
        
        gl.useProgram(this.blurProgram);
        this.blurUniforms.setInt('uDrawBuffer', 0);
        this.blurUniforms.setVec2('uPixelSize', 1.0 / this.canvas.width, 1.0 / this.canvas.height);
        this.blurUniforms.setFloat('uBloomRadius', 1.0);   // Subtle 1-pixel blur
        this.blurUniforms.setFloat('uBloomIntensity', 1.0); // Full intensity (was dimming too much)
        
        gl.useProgram(this.fadeProgram);
        this.fadeUniforms.setInt('uPrevFrame', 0);
        this.fadeUniforms.setFloat('uDecay', CONFIG.PHOSPHOR_DECAY);
        
        gl.useProgram(this.compositeProgram);
        this.compositeUniforms.setInt('uPhosphorBuffer', 0);
        this.compositeUniforms.setVec2('iResolution', this.canvas.width, this.canvas.height);
        this.compositeUniforms.setVec3('uPhosphorColor', r, g, b);
        
        // Artifact uniforms - all start at 0 (off)
        this.compositeUniforms.setFloat('uNoise', 0.0);
        this.compositeUniforms.setFloat('uFlicker', 0.0);
        this.compositeUniforms.setFloat('uDistortion', 0.0);
        this.compositeUniforms.setFloat('uInterference', 0.0);
        this.compositeUniforms.setFloat('uJitter', 0.0);
        
        // Store current artifact values for interpolation
        this.artifacts = {
            noise: 0,
            flicker: 0,
            distortion: 0,
            interference: 0,
            jitter: 0
        };
    }
    
    addLines(lines) {
        for (let i = 0; i < lines.length; i++) {
            this.pendingLines.push(lines[i]);
        }
    }
    
    setLines(lines) {
        this.clearBuffers();
        this.pendingLines = Array.from(lines);
    }
    
    clearLines() {
        this.pendingLines = [];
        this.clearBuffers();
    }
    
    render(deltaTime = 1/60) {
        const gl = this.gl;
        const time = (performance.now() - this.startTime) / 1000.0;
        
        const frameDecay = Math.pow(CONFIG.PHOSPHOR_DECAY, deltaTime * 60);
        
        const readBuffer = this.currentBuffer === 0 ? this.phosphorBufferA : this.phosphorBufferB;
        const writeBuffer = this.currentBuffer === 0 ? this.phosphorBufferB : this.phosphorBufferA;
        
        // PASS 1: Fade previous phosphor frame
        gl.bindFramebuffer(gl.FRAMEBUFFER, writeBuffer.framebuffer);
        gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        gl.disable(gl.BLEND);
        
        gl.useProgram(this.fadeProgram);
        this.fadeUniforms.setFloat('uDecay', frameDecay);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, readBuffer.texture);
        
        gl.bindVertexArray(this.quadVAO);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        
        // PASS 2: Draw raw lines to draw buffer (if any)
        if (this.pendingLines.length >= 4) {
            // Clear draw buffer first
            gl.bindFramebuffer(gl.FRAMEBUFFER, this.drawBuffer.framebuffer);
            gl.clearColor(0.0, 0.0, 0.0, 0.0);
            gl.clear(gl.COLOR_BUFFER_BIT);
            
            // Draw lines (no blend - just write)
            gl.disable(gl.BLEND);
            gl.useProgram(this.lineProgram);
            
            const lineData = new Float32Array(this.pendingLines);
            gl.bindVertexArray(this.lineVAO);
            gl.bindBuffer(gl.ARRAY_BUFFER, this.lineVBO);
            gl.bufferData(gl.ARRAY_BUFFER, lineData, gl.DYNAMIC_DRAW);
            
            const lineCount = Math.floor(this.pendingLines.length / 4);
            gl.drawArrays(gl.LINES, 0, lineCount * 2);
            
            // PASS 3: Blur draw buffer and add to phosphor (additive blend)
            gl.bindFramebuffer(gl.FRAMEBUFFER, writeBuffer.framebuffer);
            gl.enable(gl.BLEND);
            gl.blendEquation(gl.FUNC_ADD);
            gl.blendFunc(gl.ONE, gl.ONE);  // Additive
            
            gl.useProgram(this.blurProgram);
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, this.drawBuffer.texture);
            
            gl.bindVertexArray(this.quadVAO);
            gl.drawArrays(gl.TRIANGLES, 0, 6);
            
            this.pendingLines = [];
        }
        
        // Swap buffers
        this.currentBuffer = 1 - this.currentBuffer;
        
        // PASS 4: Composite to screen
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        gl.disable(gl.BLEND);
        
        gl.useProgram(this.compositeProgram);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, writeBuffer.texture);
        this.compositeUniforms.setFloat('iTime', time);
        
        gl.bindVertexArray(this.quadVAO);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        
        gl.bindVertexArray(null);
    }
    
    getTime() {
        return (performance.now() - this.startTime) / 1000.0;
    }
    
    resize(width, height) {
        const gl = this.gl;
        
        this.canvas.width = width;
        this.canvas.height = height;
        
        // Recreate all framebuffers
        gl.deleteFramebuffer(this.drawBuffer.framebuffer);
        gl.deleteTexture(this.drawBuffer.texture);
        gl.deleteFramebuffer(this.phosphorBufferA.framebuffer);
        gl.deleteTexture(this.phosphorBufferA.texture);
        gl.deleteFramebuffer(this.phosphorBufferB.framebuffer);
        gl.deleteTexture(this.phosphorBufferB.texture);
        
        this.drawBuffer = createFramebuffer(gl, width, height);
        this.phosphorBufferA = createFramebuffer(gl, width, height);
        this.phosphorBufferB = createFramebuffer(gl, width, height);
        
        // Update uniforms
        gl.useProgram(this.blurProgram);
        this.blurUniforms.setVec2('uPixelSize', 1.0 / width, 1.0 / height);
        
        gl.useProgram(this.compositeProgram);
        this.compositeUniforms.setVec2('iResolution', width, height);
    }
    
    setPhosphorColor(r, g, b) {
        this.gl.useProgram(this.compositeProgram);
        this.compositeUniforms.setVec3('uPhosphorColor', r, g, b);
    }
    
    setDecay(decay) {
        this.gl.useProgram(this.fadeProgram);
        this.fadeUniforms.setFloat('uDecay', decay);
    }
    
    setBloom(radius, intensity) {
        this.gl.useProgram(this.blurProgram);
        this.blurUniforms.setFloat('uBloomRadius', radius);
        this.blurUniforms.setFloat('uBloomIntensity', intensity);
    }
    
    /**
     * Set artifact levels (0 = off, 1 = full)
     * Can set individual or pass object with multiple
     */
    setArtifact(name, value) {
        if (this.artifacts.hasOwnProperty(name)) {
            this.artifacts[name] = Math.max(0, Math.min(1, value));
            this.gl.useProgram(this.compositeProgram);
            const uniformName = 'u' + name.charAt(0).toUpperCase() + name.slice(1);
            this.compositeUniforms.setFloat(uniformName, this.artifacts[name]);
        }
    }
    
    /**
     * Set multiple artifacts at once
     * @param {Object} values - { noise: 0.5, flicker: 0.2, ... }
     */
    setArtifacts(values) {
        for (const [name, value] of Object.entries(values)) {
            this.setArtifact(name, value);
        }
    }
    
    /**
     * Get current artifact levels
     */
    getArtifacts() {
        return { ...this.artifacts };
    }
}
