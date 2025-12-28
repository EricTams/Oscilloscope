// WebGL2 Setup and Shader Utilities
// AIDEV-NOTE: Raw WebGL2 for Shadertoy-style rendering - no abstractions

/**
 * Initialize WebGL2 context with error handling
 * @param {HTMLCanvasElement} canvas 
 * @returns {WebGL2RenderingContext}
 */
function initWebGL(canvas) {
    const gl = canvas.getContext('webgl2', {
        antialias: false,
        alpha: false,
        preserveDrawingBuffer: false,
    });
    
    if (!gl) {
        throw new Error('WebGL2 not supported - this game requires a modern browser');
    }
    
    // Set viewport to match canvas size
    gl.viewport(0, 0, canvas.width, canvas.height);
    
    return gl;
}

/**
 * Compile a shader from source
 * @param {WebGL2RenderingContext} gl 
 * @param {number} type - gl.VERTEX_SHADER or gl.FRAGMENT_SHADER
 * @param {string} source - GLSL source code
 * @returns {WebGLShader}
 */
function compileShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const info = gl.getShaderInfoLog(shader);
        const typeName = type === gl.VERTEX_SHADER ? 'VERTEX' : 'FRAGMENT';
        gl.deleteShader(shader);
        throw new Error(`${typeName} SHADER COMPILATION FAILED:\n${info}`);
    }
    
    return shader;
}

/**
 * Create a shader program from vertex and fragment shaders
 * @param {WebGL2RenderingContext} gl 
 * @param {string} vertexSource 
 * @param {string} fragmentSource 
 * @returns {WebGLProgram}
 */
function createProgram(gl, vertexSource, fragmentSource) {
    const vertexShader = compileShader(gl, gl.VERTEX_SHADER, vertexSource);
    const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
    
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        const info = gl.getProgramInfoLog(program);
        gl.deleteProgram(program);
        throw new Error(`SHADER PROGRAM LINK FAILED:\n${info}`);
    }
    
    // Clean up individual shaders (they're now part of the program)
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);
    
    return program;
}

/**
 * Create a fullscreen quad for rendering
 * @param {WebGL2RenderingContext} gl 
 * @param {WebGLProgram} program 
 * @returns {WebGLVertexArrayObject}
 */
function createFullscreenQuad(gl, program) {
    // Two triangles covering the entire clip space
    const vertices = new Float32Array([
        -1, -1,
         1, -1,
        -1,  1,
        -1,  1,
         1, -1,
         1,  1,
    ]);
    
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    
    const vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
    
    const positionLoc = gl.getAttribLocation(program, 'aPosition');
    gl.enableVertexAttribArray(positionLoc);
    gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);
    
    gl.bindVertexArray(null);
    
    return vao;
}

/**
 * Get shader source from embedded script tag
 * @param {string} id - Script element ID
 * @returns {string}
 */
function getShaderSource(id) {
    const element = document.getElementById(id);
    if (!element) {
        throw new Error(`Shader source not found: ${id}`);
    }
    return element.textContent.trim();
}

/**
 * Create a framebuffer with a color texture attachment
 * AIDEV-NOTE: Uses RGBA16F for HDR if available, falls back to RGBA8
 * @param {WebGL2RenderingContext} gl 
 * @param {number} width 
 * @param {number} height 
 * @returns {{framebuffer: WebGLFramebuffer, texture: WebGLTexture}}
 */
function createFramebuffer(gl, width, height) {
    // Enable float texture rendering extension if available
    const floatExt = gl.getExtension('EXT_color_buffer_float');
    const useFloat = floatExt !== null;
    
    const framebuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    
    // Create single-channel intensity texture (we only need brightness, color applied later)
    // AIDEV-NOTE: Using R16F instead of RGBA16F - we store intensity only
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    
    if (useFloat) {
        // Single channel HDR float texture
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.R16F, width, height, 0, gl.RED, gl.FLOAT, null);
    } else {
        // Fallback to R8
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, width, height, 0, gl.RED, gl.UNSIGNED_BYTE, null);
    }
    
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    
    // Attach texture to framebuffer
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    
    // Check framebuffer is complete
    const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    if (status !== gl.FRAMEBUFFER_COMPLETE) {
        throw new Error(`Framebuffer incomplete: ${status}`);
    }
    
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.bindTexture(gl.TEXTURE_2D, null);
    
    return { framebuffer, texture };
}

/**
 * Cache for uniform locations to avoid repeated lookups
 */
class UniformCache {
    constructor(gl, program) {
        this.gl = gl;
        this.program = program;
        this.cache = new Map();
    }
    
    /**
     * Get uniform location (cached)
     * @param {string} name 
     * @returns {WebGLUniformLocation}
     */
    getLocation(name) {
        if (!this.cache.has(name)) {
            const location = this.gl.getUniformLocation(this.program, name);
            // AIDEV-NOTE: We don't throw on null - unused uniforms get optimized out
            this.cache.set(name, location);
        }
        return this.cache.get(name);
    }
    
    setFloat(name, value) {
        const loc = this.getLocation(name);
        if (loc) this.gl.uniform1f(loc, value);
    }
    
    setInt(name, value) {
        const loc = this.getLocation(name);
        if (loc) this.gl.uniform1i(loc, value);
    }
    
    setVec2(name, x, y) {
        const loc = this.getLocation(name);
        if (loc) this.gl.uniform2f(loc, x, y);
    }
    
    setVec3(name, x, y, z) {
        const loc = this.getLocation(name);
        if (loc) this.gl.uniform3f(loc, x, y, z);
    }
    
    setVec4(name, x, y, z, w) {
        const loc = this.getLocation(name);
        if (loc) this.gl.uniform4f(loc, x, y, z, w);
    }
    
    setVec4Array(name, data) {
        const loc = this.getLocation(name);
        if (loc) this.gl.uniform4fv(loc, data);
    }
}

