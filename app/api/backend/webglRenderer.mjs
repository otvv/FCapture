/**
 * WebGLVideoRenderer
 *
 * GPU-accelerated video rendering + filters (brightness / contrast / saturation)
 * - Uses WebGL to sample an HTMLVideoElement as a texture and apply a fragment shader.
 * - Synchronizes rendering with `videoPlayerElement.requestVideoFrameCallback` (if available).
 * - Exposes `setParams`, `start`, `stop`, `destroy`.
 *
 *
 * Notes:
 * - The module is designed to be a drop-in renderer; it does not manipulate the DOM.
 * - If WebGL is unavailable or fails, consumers should fallback to a 2D canvas renderer.
 */

export class WebGLVideoRenderer {
  /**
   * @param {HTMLCanvasElement} canvas - the canvas element to render into (pixel buffer size should be set externally to match video resolution)
   * @param {HTMLVideoElement} video - the source video element (srcObject assigned)
   * @param {Object} [opts] - optional settings
   */
  constructor(canvas, video, opts = {}) {
    this.canvas = canvas;
    this.video = video;
    this.opts = opts;

    this.gl = null;
    this.program = null;
    this.texture = null;
    this.buffers = {};
    this.locations = {};
    this.running = false;
    this._boundFrameCb = null;
    // Texture state for efficient updates (avoid reallocations)
    this._textureInitialized = false;
    this._texWidth = 0;
    this._texHeight = 0;

    // Default filter params (neutral)
    this.params = {
      brightness: 0.0, // add
      contrast: 1.0,
      saturation: 1.0,
    };

    this._initSuccess = false;

    try {
      this._initGL();
      this._initSuccess = true;
    } catch (err) {
      console.error("[fcapture] - webglRenderer@constructor:", err);
      this._initSuccess = false;
    }
  }

  static isSupported() {
    try {
      const canvas = document.createElement("canvas");
      // Prefer WebGL2 if available, fall back to WebGL/experimental-webgl
      const gl2 = (() => {
        try {
          return canvas.getContext("webgl2");
        } catch (e) {
          return null;
        }
      })();
      if (gl2) {
        gl2.getExtension && gl2.getExtension("OES_texture_float"); // probe a common ext
        return true;
      }

      const gl = (() => {
        try {
          return (
            canvas.getContext("webgl") || canvas.getContext("experimental-webgl")
          );
        } catch (e) {
          return null;
        }
      })();

      if (!gl) return false;
      // optional: test for basic required features
      return true;
    } catch (e) {
      return false;
    }
  }

  _initGL() {
    const canvas = this.canvas;
    // Helper to try context creation safely
    const tryGetContext = (name, attrs = undefined) => {
      try {
        return attrs ? canvas.getContext(name, attrs) : canvas.getContext(name);
      } catch (err) {
        return null;
      }
    };

    // Candidate context names and attribute sets (ordered by preference)
    // We'll try plain getContext(name) first (some builds only return a context without attributes),
    // then fall back to attempts with attribute sets.
    const contextNames = ["webgl2", "webgl", "experimental-webgl"];

    // First attempt: try plain getContext without attributes for each candidate
    let gl = null;
    let used = null;
    for (const name of contextNames) {
      try {
        gl = tryGetContext(name);
        if (gl) {
          used = { name, attrs: null };
          break;
        }
      } catch (e) {
        // ignore and try next
      }
    }

    // If plain creation failed, try with attribute sets (more strict)
    if (!gl) {
      const attributeSets = [
        {
          antialias: false,
          preserveDrawingBuffer: false,
          alpha: false,
          powerPreference: "high-performance",
          failIfMajorPerformanceCaveat: false,
        },
        { antialias: false, preserveDrawingBuffer: false, alpha: false },
        { antialias: false, alpha: false },
        {},
      ];

      for (const attrs of attributeSets) {
        for (const name of contextNames) {
          try {
            gl = tryGetContext(name, attrs);
            if (gl) {
              used = { name, attrs };
              break;
            }
          } catch (err) {
            // ignore and try next
          }
        }
        if (gl) break;
      }
    }

    // Final fallback: single plain webgl attempt as a last resort
    if (!gl) {
      try {
        gl =
          tryGetContext("webgl") ||
          tryGetContext("experimental-webgl") ||
          tryGetContext("webgl2");
        if (gl) {
          used = {
            name:
              gl && gl.constructor && gl.constructor.name
                ? gl.constructor.name
                : "webgl",
            attrs: null,
          };
        }
      } catch (e) {
        gl = null;
      }
    }

    if (!gl) {
      // Provide a helpful diagnostic string for logs so the caller can see what we tried
      const triedDetails = contextNames.map((n) => `${n}`).join(", ");
      const errMsg = `WebGL not available. Tried contexts: ${triedDetails}`;
      console.error("[fcapture] - webglRenderer@_initGL:", errMsg);
      throw new Error("WebGL not available");
    }

    // store context and a simple identifier for debugging
    this.gl = gl;
    this._glContextName = used ? used.name : "webgl";
    try {
      // DEBUG PURPOSES ONLY
      // console.log(
      //   `[fcapture] - webglRenderer@_initGL: initialized context ${this._glContextName}`,
      // );
    } catch (err) {
      // ignore failures to query parameters
      console.warn(
        "[fcapture] - webglRenderer@_initGL: failed to query GL parameters",
        err,
      );
    }

    // compile shaders and create program (use WebGL2 shaders when available)
    const isWebGL2 =
      typeof WebGL2RenderingContext !== "undefined" &&
      gl instanceof WebGL2RenderingContext;
    let vsSource;
    let fsSource;

    if (isWebGL2) {
      // WebGL2 / GLSL ES 3.00 shaders
      vsSource = `#version 300 es
      in vec2 a_position;
      in vec2 a_texcoord;
      out vec2 v_texcoord;
      void main() {
        gl_Position = vec4(a_position, 0.0, 1.0);
        v_texcoord = a_texcoord;
      }
      `;

      fsSource = `#version 300 es
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
        // brightness (add)
        color.rgb += u_brightness;
        // contrast around 0.5
        color.rgb = (color.rgb - 0.5) * u_contrast + 0.5;
        // saturation
        float l = dot(color.rgb, LUMA);
        vec3 gray = vec3(l);
        color.rgb = mix(gray, color.rgb, u_saturation);
        outColor = color;
      }
      `;
    } else {
      // WebGL1 / GLSL ES 1.00 shaders (legacy)
      vsSource = `
      attribute vec2 a_position;
      attribute vec2 a_texcoord;
      varying vec2 v_texcoord;
      void main() {
        gl_Position = vec4(a_position, 0.0, 1.0);
        v_texcoord = a_texcoord;
      }
      `;

      fsSource = `
      precision mediump float;
      uniform sampler2D u_texture;
      uniform float u_brightness;
      uniform float u_contrast;
      uniform float u_saturation;
      varying vec2 v_texcoord;
      const vec3 LUMA = vec3(0.2126, 0.7152, 0.0722);
      void main() {
        vec4 color = texture2D(u_texture, v_texcoord);
        // brightness (add)
        color.rgb += u_brightness;
        // contrast around 0.5
        color.rgb = (color.rgb - 0.5) * u_contrast + 0.5;
        // saturation
        float l = dot(color.rgb, LUMA);
        vec3 gray = vec3(l);
        color.rgb = mix(gray, color.rgb, u_saturation);
        gl_FragColor = color;
      }
      `;
    }

    const vertShader = this._compileShader(gl.VERTEX_SHADER, vsSource);
    const fragShader = this._compileShader(gl.FRAGMENT_SHADER, fsSource);

    const program = this._createProgram(vertShader, fragShader);
    gl.useProgram(program);
    this.program = program;

    // attributes & buffers (two triangles covering clipspace)
    const positionLocation = gl.getAttribLocation(program, "a_position");
    const texcoordLocation = gl.getAttribLocation(program, "a_texcoord");

    // full-screen quad positions (clip space)
    const positions = new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]);

    // texcoords
    const texcoords = new Float32Array([0, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 0]);

    // create buffers
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

    const texcoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, texcoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, texcoords, gl.STATIC_DRAW);

    // set up vertex attributes
    gl.enableVertexAttribArray(positionLocation);
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    gl.enableVertexAttribArray(texcoordLocation);
    gl.bindBuffer(gl.ARRAY_BUFFER, texcoordBuffer);
    gl.vertexAttribPointer(texcoordLocation, 2, gl.FLOAT, false, 0, 0);

    // create and configure texture
    this.texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    // get uniform locations
    this.locations.u_texture = gl.getUniformLocation(program, "u_texture");
    this.locations.u_brightness = gl.getUniformLocation(program, "u_brightness");
    this.locations.u_contrast = gl.getUniformLocation(program, "u_contrast");
    this.locations.u_saturation = gl.getUniformLocation(program, "u_saturation");

    // bind texture unit 0
    gl.uniform1i(this.locations.u_texture, 0);

    // store buffers
    this.buffers.position = positionBuffer;
    this.buffers.texcoord = texcoordBuffer;

    // initial uniforms
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
    if (!this.gl || !this.program) return;
    const gl = this.gl;
    gl.useProgram(this.program);

    // clamp reasonable values to avoid extreme math
    const b = Math.max(-2.0, Math.min(2.0, this.params.brightness));
    const c = Math.max(0.0, Math.min(10.0, this.params.contrast));
    const s = Math.max(0.0, Math.min(10.0, this.params.saturation));

    gl.uniform1f(this.locations.u_brightness, b);
    gl.uniform1f(this.locations.u_contrast, c);
    gl.uniform1f(this.locations.u_saturation, s);
  }

  /**
   * Update/overwrite filter params.
   * @param {{brightness?:number, contrast?:number, saturation?:number}} param0
   */
  setParams({ brightness, contrast, saturation } = {}) {
    if (typeof brightness === "number") this.params.brightness = brightness;
    if (typeof contrast === "number") this.params.contrast = contrast;
    if (typeof saturation === "number") this.params.saturation = saturation;
    this._applyUniforms();
  }

  _updateTextureFromVideo() {
    const gl = this.gl;
    const video = this.video;

    if (!gl || !this.texture) return;

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);

    // Ensure we do NOT flip the Y during texture upload (we handle orientation via texcoords).
    try {
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 0);
    } catch (e) {
      // ignore if not supported
    }

    // prefer texSubImage2D when texture already matches video size to avoid reallocations
    const vidW =
      video && video.videoWidth ? video.videoWidth : this.canvas.width || 0;
    const vidH =
      video && video.videoHeight ? video.videoHeight : this.canvas.height || 0;

    try {
      // If texture already allocated with matching size, just update it.
      if (
        this._textureInitialized &&
        vidW === this._texWidth &&
        vidH === this._texHeight
      ) {
        gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, video);
      } else {
        // Need to (re)allocate texture storage to video dimensions.
        if (vidW > 0 && vidH > 0) {
          // If WebGL2 and we can use texStorage2D, prefer immutable storage and then texSubImage2D.
          if (this.isWebGL2 && typeof gl.texStorage2D === "function") {
            try {
              // If previously allocated and immutable but size changed, recreate texture storage.
              if (
                this._textureInitialized &&
                this._texImmutable &&
                (this._texWidth !== vidW || this._texHeight !== vidH)
              ) {
                // Recreate texture to change immutable storage size.
                gl.deleteTexture(this.texture);
                this.texture = gl.createTexture();
                gl.bindTexture(gl.TEXTURE_2D, this.texture);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
              }
              // Allocate immutable storage for new size.
              gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA8, vidW, vidH);
              // Upload current frame into the storage.
              gl.texSubImage2D(
                gl.TEXTURE_2D,
                0,
                0,
                0,
                gl.RGBA,
                gl.UNSIGNED_BYTE,
                video,
              );
              this._textureInitialized = true;
              this._texWidth = vidW;
              this._texHeight = vidH;
              this._texImmutable = true;
            } catch (e) {
              // Fall back to mutable allocation if anything fails.
              try {
                gl.texImage2D(
                  gl.TEXTURE_2D,
                  0,
                  gl.RGBA,
                  vidW,
                  vidH,
                  0,
                  gl.RGBA,
                  gl.UNSIGNED_BYTE,
                  null,
                );
                gl.texSubImage2D(
                  gl.TEXTURE_2D,
                  0,
                  0,
                  0,
                  gl.RGBA,
                  gl.UNSIGNED_BYTE,
                  video,
                );
                this._textureInitialized = true;
                this._texWidth = vidW;
                this._texHeight = vidH;
                this._texImmutable = false;
              } catch (err2) {
                console.warn(
                  "[fcapture] - webglRenderer@_updateTextureFromVideo: fallback texture upload failed.",
                  err2,
                );
              }
            }
          } else {
            // WebGL1 or no texStorage2D: allocate/update via texImage2D and texSubImage2D
            try {
              gl.texImage2D(
                gl.TEXTURE_2D,
                0,
                gl.RGBA,
                vidW,
                vidH,
                0,
                gl.RGBA,
                gl.UNSIGNED_BYTE,
                null,
              );
              gl.texSubImage2D(
                gl.TEXTURE_2D,
                0,
                0,
                0,
                gl.RGBA,
                gl.UNSIGNED_BYTE,
                video,
              );
              this._textureInitialized = true;
              this._texWidth = vidW;
              this._texHeight = vidH;
              this._texImmutable = false;
            } catch (err) {
              console.warn(
                "[fcapture] - webglRenderer@_updateTextureFromVideo: texImage2D fallback failed.",
                err,
              );
            }
          }
        } else {
          // Fallback: when video size isn't available yet, attempt direct upload (may allocate)
          try {
            gl.texImage2D(
              gl.TEXTURE_2D,
              0,
              gl.RGBA,
              gl.RGBA,
              gl.UNSIGNED_BYTE,
              video,
            );
            this._textureInitialized = true;
            this._texWidth = vidW;
            this._texHeight = vidH;
          } catch (err) {
            console.warn(
              "[fcapture] - webglRenderer@_updateTextureFromVideo: direct texture upload failed.",
              err,
            );
          }
        }
      }
    } catch (err) {
      // Last resort: try texImage2D with the video element again, and log failure if it fails.
      try {
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);
        this._textureInitialized = true;
        this._texWidth = vidW;
        this._texHeight = vidH;
      } catch (err2) {
        console.warn(
          "[fcapture] - webglRenderer@_updateTextureFromVideo: texture upload failed.",
          err2,
        );
      }
    }
  }

  _renderOnce() {
    if (!this.gl || !this.program) return;

    const gl = this.gl;

    // make sure the viewport matches the canvas pixel size
    if (
      this.canvas.width !== gl.drawingBufferWidth ||
      this.canvas.height !== gl.drawingBufferHeight
    ) {
      // Note: drawingBufferWidth/Height already reflect the backing store; we still set viewport each frame
    }
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);

    // update texture with the current video frame
    this._updateTextureFromVideo();

    // draw
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(this.program);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  _frameCallback = (now, metadata) => {
    if (!this.running) return;
    // render current frame
    try {
      this._renderOnce();
    } catch (err) {
      console.error("[fcapture] - webglRenderer@_frameCallback:", err);
    }
    // schedule next frame synchronized to video frames
    if (this.video && typeof this.video.requestVideoFrameCallback === "function") {
      this.video.requestVideoFrameCallback(this._boundFrameCb);
    } else {
      // fallback: use requestAnimationFrame if rVFC not available
      requestAnimationFrame(() => this._frameCallback(performance.now(), {}));
    }
  };

  start() {
    if (!this._initSuccess) {
      throw new Error(
        "WebGLVideoRenderer: initialization failed or WebGL is not supported.",
      );
    }
    if (this.running) return;
    this.running = true;

    // bind the callback so we can reschedule
    this._boundFrameCb = this._frameCallback.bind(this);

    if (this.video && typeof this.video.requestVideoFrameCallback === "function") {
      this.video.requestVideoFrameCallback(this._boundFrameCb);
    } else {
      // fallback to rAF loop
      this._boundRAF = () => {
        if (!this.running) return;
        this._frameCallback(performance.now(), {});
        requestAnimationFrame(this._boundRAF);
      };
      requestAnimationFrame(this._boundRAF);
    }
  }

  stop() {
    this.running = false;
    // nothing to cancel explicitly with rVFC; flag protects subsequent calls
  }

  destroy() {
    try {
      this.stop();
      const gl = this.gl;
      if (!gl) return;

      if (this.texture) {
        gl.deleteTexture(this.texture);
        this.texture = null;
      }
      if (this.buffers.position) {
        gl.deleteBuffer(this.buffers.position);
      }
      if (this.buffers.texcoord) {
        gl.deleteBuffer(this.buffers.texcoord);
      }
      if (this.program) {
        gl.deleteProgram(this.program);
        this.program = null;
      }
      // optionally lose the context - not necessary
      this.gl = null;
    } catch (err) {
      console.warn("[fcapture] - webglRenderer@destroy:", err);
    }
  }
}

export default WebGLVideoRenderer;
