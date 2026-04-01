class ShaderBackground {
  constructor() {
    this.canvas = document.getElementById("bgCanvas");
    this.gl = this.canvas.getContext("webgl");

    this.vertexShaderSource = `
            attribute vec2 position;
            void main() {
                gl_Position = vec4(position, 0.0, 1.0);
            }
        `;

    this.fragmentShaderSource = `
            precision mediump float;
            uniform vec2 iResolution;
            uniform float iTime;

            #define SPIN_ROTATION -2.0
            #define SPIN_SPEED 7.0
            #define OFFSET vec2(0.0)
            
            #define COLOUR_1 vec4(0.20, 0.20, 0.20, 1.0)
            #define COLOUR_2 vec4(0.45, 0.45, 0.45, 1.0)
            #define COLOUR_3 vec4(0.05, 0.05, 0.05, 1.0)
            
            #define CONTRAST 3.5
            #define LIGTHING 0.4
            #define SPIN_AMOUNT 0.25
            #define PIXEL_FILTER 745.0
            #define SPIN_EASE 1.0

            vec4 effect(vec2 screenSize, vec2 screen_coords) {
                float pixel_size = length(screenSize.xy) / PIXEL_FILTER;
                vec2 uv = (floor(screen_coords.xy*(1.0/pixel_size))*pixel_size - 0.5*screenSize.xy)/length(screenSize.xy) - OFFSET;
                float uv_len = length(uv);
                
                float speed = (SPIN_ROTATION*SPIN_EASE*0.2) + 302.2;
                float new_pixel_angle = atan(uv.y, uv.x) + speed - SPIN_EASE*20.0*(1.0*SPIN_AMOUNT*uv_len + (1.0 - 1.0*SPIN_AMOUNT));
                vec2 mid = (screenSize.xy/length(screenSize.xy))/2.0;
                uv = (vec2((uv_len * cos(new_pixel_angle) + mid.x), (uv_len * sin(new_pixel_angle) + mid.y)) - mid);
                
                uv *= 30.0;
                speed = iTime*(SPIN_SPEED);
                vec2 uv2 = vec2(uv.x+uv.y, uv.x+uv.y);
                
                for(int i=0; i < 5; i++) {
                    uv2 += sin(max(uv.x, uv.y)) + uv;
                    uv  += 0.5*vec2(cos(5.1123314 + 0.353*uv2.y + speed*0.131121), sin(uv2.x - 0.113*speed));
                    uv  -= 1.0*cos(uv.x + uv.y) - 1.0*sin(uv.x*0.711 - uv.y);
                }
                
                float contrast_mod = (0.25*CONTRAST + 0.5*SPIN_AMOUNT + 1.2);
                float paint_res = min(2.0, max(0.0, length(uv)*(0.035)*contrast_mod));
                float c1p = max(0.0, 1.0 - contrast_mod*abs(1.0-paint_res));
                float c2p = max(0.0, 1.0 - contrast_mod*abs(paint_res));
                float c3p = 1.0 - min(1.0, c1p + c2p);
                float light = (LIGTHING - 0.2)*max(c1p*5.0 - 4.0, 0.0) + LIGTHING*max(c2p*5.0 - 4.0, 0.0);
                
                vec4 baseColor = (0.3/CONTRAST)*COLOUR_1 + (1.0 - 0.3/CONTRAST)*(COLOUR_1*c1p + COLOUR_2*c2p + vec4(c3p*COLOUR_3.rgb, c3p*COLOUR_1.a));
                return baseColor + vec4(light, light, light, 0.0);
            }

            void main() {
                vec2 fragCoord = vec2(gl_FragCoord.x, iResolution.y - gl_FragCoord.y);
                gl_FragColor = effect(iResolution.xy, fragCoord.xy);
            }
        `;

    this.initGL();
  }

  initGL() {
    const compileShader = (type, source) => {
      const shader = this.gl.createShader(type);
      this.gl.shaderSource(shader, source);
      this.gl.compileShader(shader);
      return shader;
    };

    const vs = compileShader(this.gl.VERTEX_SHADER, this.vertexShaderSource);
    const fs = compileShader(
      this.gl.FRAGMENT_SHADER,
      this.fragmentShaderSource,
    );

    this.program = this.gl.createProgram();
    this.gl.attachShader(this.program, vs);
    this.gl.attachShader(this.program, fs);
    this.gl.linkProgram(this.program);
    this.gl.useProgram(this.program);

    const vertices = new Float32Array([
      -1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1,
    ]);
    const buffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, vertices, this.gl.STATIC_DRAW);

    const positionLocation = this.gl.getAttribLocation(
      this.program,
      "position",
    );
    this.gl.enableVertexAttribArray(positionLocation);
    this.gl.vertexAttribPointer(
      positionLocation,
      2,
      this.gl.FLOAT,
      false,
      0,
      0,
    );

    this.resolutionLocation = this.gl.getUniformLocation(
      this.program,
      "iResolution",
    );
    this.timeLocation = this.gl.getUniformLocation(this.program, "iTime");
  }

  resize(width, height) {
    this.canvas.width = width;
    this.canvas.height = height;
    this.gl.viewport(0, 0, width, height);
    this.gl.uniform2f(this.resolutionLocation, width, height);
  }

  render(time) {
    this.gl.uniform1f(this.timeLocation, time * 0.001);
    this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);
  }
}

class GameRenderer {
  constructor() {
    this.canvas = document.getElementById("gameCanvas");
    this.ctx = this.canvas.getContext("2d");
    this.bgShader = new ShaderBackground();

    // --- JUICE: Impact Variables ---
    this.shakeMagnitude = 0;
    this.flashOpacity = 0;
  }

  // --- JUICE: Trigger Functions ---
  triggerImpact(shake = 15, flash = 0.8) {
    this.shakeMagnitude = shake;
    this.flashOpacity = flash;
  }

  resize(width, height) {
    this.canvas.width = width;
    this.canvas.height = height;
    this.ctx.imageSmoothingEnabled = false;
    this.bgShader.resize(width, height);
  }

  beginFrame(time) {
    this.bgShader.render(time);
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // --- JUICE: Apply Camera Shake ---
    this.ctx.save();
    if (this.shakeMagnitude > 0.5) {
      const dx = (Math.random() - 0.5) * this.shakeMagnitude;
      const dy = (Math.random() - 0.5) * this.shakeMagnitude;
      this.ctx.translate(dx, dy);
      this.shakeMagnitude *= 0.85; // Rapidly damp the shake every frame
    }
  }

  // render.js
  // Replace your endFrame method in render.js
  endFrame() {
    this.ctx.restore(); // Undo the shake translation so scanlines stay put

    // Static Scanlines
    this.ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
    for (let i = 0; i < this.canvas.height; i += 4) {
      this.ctx.fillRect(0, i, this.canvas.width, 2);
    }

    // Vignette
    const gradient = this.ctx.createRadialGradient(
      this.canvas.width / 2,
      this.canvas.height / 2,
      this.canvas.height / 3,
      this.canvas.width / 2,
      this.canvas.height / 2,
      this.canvas.height,
    );
    gradient.addColorStop(0, "rgba(0,0,0,0)");
    gradient.addColorStop(1, "rgba(0,0,0,0.8)");
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // --- JUICE: Apply Screen Flash ---
    if (this.flashOpacity > 0.01) {
      this.ctx.fillStyle = `rgba(255, 255, 255, ${this.flashOpacity})`;
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      this.flashOpacity *= 0.75; // Fast fade out
    }
  }
}
