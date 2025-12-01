/**
 * WebGLVideoRenderer
 *
 *
 * DISCLAIMER:
 * - This renderer was made with the help of a LLM (this is why its fairly inconsistent with the rest of the code-base)
 * - In time I'll be cleaning/changing this code as I learn more about OpenGL/WebGL.
 *
 * ABOUT:
 * - GPU-accelerated video rendering + filters (brightness / contrast / saturation)
 * - Uses WebGL to sample an HTMLVideoElement as a texture and apply a fragment shader.
 * - If WebGL is unavailable or fails, users should fallback to a 2D canvas renderer (the app already handles this).
 * - Synchronizes rendering with `videoPlayerElement.requestVideoFrameCallback`, otherwise uses RAF (`requestAnimationFrame`) as a fallback.
 *
 *
 * NOTES:
 * - The module is designed to be a drop-in renderer; it does not manipulate the DOM in any shape.
 */

export class WebGLVideoRenderer {
  constructor(canvas, video, _opts = {}) {
    if (!WebGLVideoRenderer.isSupported()) {
      throw new Error("WebGL2 is not supported in this environment.");
    }

    this.canvas = canvas;
    this.video = video;
    this.opts = _opts;

    // request a WebGL2 context tuned for performance
    this.gl = canvas.getContext("webgl2", {
      antialias: false,
      alpha: false,
      preserveDrawingBuffer: false,
      powerPreference: "high-performance",
    });

    if (!this.gl) {
      throw new Error("Failed to obtain WebGL2 context.");
    }

    // GL resources
    this.program = null;
    this.texture = null;
    this.buffers = { position: null, texcoord: null };
    this.locations = {
      u_texture: null,
      u_brightness: null,
      u_contrast: null,
      u_saturation: null,
    };

    // running state & frame callback binding
    this.running = false;
    this._boundFrameCb = null;

    // texture bookkeeping for efficient updates
    this._textureInitialized = false;
    this._texWidth = 0;
    this._texHeight = 0;

    // default filter params
    this.params = {
      brightness: 0.0,
      contrast: 1.0,
      saturation: 1.0,
    };

    this._initGL();
  }

  static isSupported() {
    const canvas = document.createElement("canvas");
    return !!canvas.getContext("webgl2");
  }

  _initGL() {
    const gl = this.gl;

    // GLSL ES 3.00 (WebGL2)
    const vsSource = `#version 300 es
      in vec2 a_position;
      in vec2 a_texcoord;
      out vec2 v_texcoord;
      void main() {
        gl_Position = vec4(a_position, 0.0, 1.0);
        v_texcoord = a_texcoord;
      }
    `;

    const fsSource = `#version 300 es
      precision mediump float;
      uniform sampler2D u_texture;
      uniform float u_brightness;
      uniform float u_contrast;
      uniform float u_saturation;
      in vec2 v_texcoord;
      out vec4 outColor;
      const vec3 LUMA = vec3(0.2126, 0.7152, 0.0722);
      void main() {
        vec4 color = texture(u_texture, v_texcoord);
        color.rgb += u_brightness;
        color.rgb = (color.rgb - 0.5) * u_contrast + 0.5;
        float l = dot(color.rgb, LUMA);
        vec3 gray = vec3(l);
        color.rgb = mix(gray, color.rgb, u_saturation);
        outColor = color;
      }
    `;

    const vert = this._compileShader(gl.VERTEX_SHADER, vsSource);
    const frag = this._compileShader(gl.FRAGMENT_SHADER, fsSource);
    this.program = this._createProgram(vert, frag);
    gl.useProgram(this.program);

    // attribute setup: full-screen quad (two triangles)
    const positions = new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]);
    const texcoords = new Float32Array([0, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 0]);

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
    this.buffers.position = positionBuffer;

    const texcoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, texcoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, texcoords, gl.STATIC_DRAW);
    this.buffers.texcoord = texcoordBuffer;

    const posLoc = gl.getAttribLocation(this.program, "a_position");
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    const texLoc = gl.getAttribLocation(this.program, "a_texcoord");
    gl.bindBuffer(gl.ARRAY_BUFFER, texcoordBuffer);
    gl.enableVertexAttribArray(texLoc);
    gl.vertexAttribPointer(texLoc, 2, gl.FLOAT, false, 0, 0);

    // texture setup
    this.texture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    // uniform locations
    this.locations.u_texture = gl.getUniformLocation(this.program, "u_texture");
    this.locations.u_brightness = gl.getUniformLocation(
      this.program,
      "u_brightness",
    );
    this.locations.u_contrast = gl.getUniformLocation(this.program, "u_contrast");
    this.locations.u_saturation = gl.getUniformLocation(
      this.program,
      "u_saturation",
    );

    // bind sampler to texture unit 0
    gl.uniform1i(this.locations.u_texture, 0);

    this._applyUniforms();
  }

  _compileShader(type, source) {
    const gl = this.gl;
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    const ok = gl.getShaderParameter(shader, gl.COMPILE_STATUS);

    if (!ok) {
      const info = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error("Shader compile failed: " + info);
    }

    return shader;
  }

  _createProgram(vs, fs) {
    const gl = this.gl;
    const program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);

    const ok = gl.getProgramParameter(program, gl.LINK_STATUS);

    if (!ok) {
      const info = gl.getProgramInfoLog(program);
      gl.deleteProgram(program);
      throw new Error("Program link failed: " + info);
    }

    return program;
  }

  _applyUniforms() {
    const gl = this.gl;
    gl.useProgram(this.program);

    const brightnessClamp = Math.max(-2.0, Math.min(2.0, this.params.brightness));
    const contrastClamp = Math.max(0.0, Math.min(10.0, this.params.contrast));
    const saturationClamp = Math.max(0.0, Math.min(10.0, this.params.saturation));

    // handle texture filters
    gl.uniform1f(this.locations.u_brightness, brightnessClamp);
    gl.uniform1f(this.locations.u_contrast, contrastClamp);
    gl.uniform1f(this.locations.u_saturation, saturationClamp);
  }

  setParams({ brightness, contrast, saturation } = {}) {
    if (typeof brightness === "number") {
      this.params.brightness = brightness;
    }
    if (typeof contrast === "number") {
      this.params.contrast = contrast;
    }
    if (typeof saturation === "number") {
      this.params.saturation = saturation;
    }

    // apply uniform values
    this._applyUniforms();
  }

  _updateTextureFromVideo() {
    const gl = this.gl;
    const video = this.video;

    if (!video) {
      return;
    }

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);

    // don't flip Y; texcoords handle orientation
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 0);

    // compute a sensible target size using
    // reported video resolution if available
    //
    // (otherwise allocate using the canvas
    // client size multiplied by devicePixelRatio)
    const dpr =
      typeof window !== "undefined" && window.devicePixelRatio
        ? window.devicePixelRatio
        : 1;
    const cssW = Math.max(1, Math.round(this.canvas.clientWidth * dpr));
    const cssH = Math.max(1, Math.round(this.canvas.clientHeight * dpr));

    const vidW = video.videoWidth || 0;
    const vidH = video.videoHeight || 0;

    // target size to allocate/match texture to
    const targetW = vidW > 0 ? vidW : cssW;
    const targetH = vidH > 0 ? vidH : cssH;

    // if canvas pixel buffer differs from current resolution
    // resize it and mark texture for reallocation
    if (this.canvas.width !== targetW || this.canvas.height !== targetH) {
      this.canvas.width = targetW;
      this.canvas.height = targetH;
      // update viewport immediately so rendering uses the new size
      gl.viewport(0, 0, targetW, targetH);
      this._textureInitialized = false;
    }

    // if the texture is already allocated to the correct
    // size and the video has reported frames, perform
    //  an in-place update for best performance
    if (
      this._textureInitialized &&
      targetW === this._texWidth &&
      targetH === this._texHeight &&
      vidW > 0 &&
      vidH > 0
    ) {
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, video);
      return;
    }

    // allocate texture storage sized to the available dimensions
    // if the video hasn't reported its dimensions yet,
    // allocate to the canvas size so rendering still works
    const allocW = targetW;
    const allocH = targetH;

    if (allocW > 0 && allocH > 0) {
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        allocW,
        allocH,
        0,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        null,
      );

      // If a real video frame is available,
      // upload it into the allocated storage
      if (vidW > 0 && vidH > 0) {
        gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, video);
      }

      this._textureInitialized = true;
      this._texWidth = allocW;
      this._texHeight = allocH;
    }
  }

  _renderOnce() {
    const gl = this.gl;

    // ensure viewport matches canvas pixel size
    if (
      this.canvas.width !== gl.drawingBufferWidth ||
      this.canvas.height !== gl.drawingBufferHeight
    ) {
      gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    }

    // update texture from video frame
    this._updateTextureFromVideo();

    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(this.program);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  _frameCallback = (now, metadata) => {
    if (!this.running) {
      return;
    }

    this._renderOnce();

    if (this.video) {
      this.video.requestVideoFrameCallback(this._boundFrameCb);
    }
  };

  start() {
    if (this.running) {
      return;
    }

    this.running = true;

    // bind once to allow rescheduling in callback
    this._boundFrameCb = this._frameCallback.bind(this);

    if (this.video && typeof this.video.requestVideoFrameCallback === "function") {
      this.video.requestVideoFrameCallback(this._boundFrameCb);
    } else {
      // use RAF if requestVideoFrameCallback is not available
      const loop = () => {
        if (!this.running) {
          return;
        }

        this._renderOnce();

        requestAnimationFrame(loop);
      };

      requestAnimationFrame(loop);
    }
  }

  stop() {
    this.running = false;
  }

  destroy() {
    this.stop();
    const gl = this.gl;
    if (!gl) {
      return;
    }

    if (this.texture) {
      gl.deleteTexture(this.texture);
      this.texture = null;
    }
    if (this.buffers.position) {
      gl.deleteBuffer(this.buffers.position);
      this.buffers.position = null;
    }
    if (this.buffers.texcoord) {
      gl.deleteBuffer(this.buffers.texcoord);
      this.buffers.texcoord = null;
    }
    if (this.program) {
      gl.deleteProgram(this.program);
      this.program = null;
    }

    this.gl = null;
  }
}

export default WebGLVideoRenderer;
