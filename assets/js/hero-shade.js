/* The hero's shading: the soft patches of halftone behind the network, drawn live so they can respond.
   They follow the lap the network is replaying: brighter as the car gathers speed, a lift on the accelerator,
   dimmer under braking, and the light swings the way the car is steering. It does not respond to the pointer.
   One small shader on the graphics card works out every dot's size, so a screen of halftone costs almost nothing
   per frame; drawn one by one on a 2D canvas it would be some 35,000 dots, every frame. Without WebGL, or if the
   graphics card drops the context, the hero keeps its still shading woven into the cloth (main.js).
   It pauses off-screen and in hidden tabs. Reduced motion gets one still frame. Hand-written, no dependencies. */
(function () {
  'use strict';

  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)');
  const css = name => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const rgb = hex => {
    const h = hex.replace('#', ''), n = parseInt(h.length === 3 ? h.replace(/./g, m => m + m) : h, 16);
    return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255];
  };

  const VERT = 'attribute vec2 aP; void main() { gl_Position = vec4(aP, 0.0, 1.0); }';
  // One pass per pixel: find its weave cell, work out that cell's tone from the five patches, the fade behind the
  // name, then draw the cell's dot (a square of the same area when it is small), in the loom's
  // thread colours.
  const FRAG = `precision highp float;
    uniform vec2 uRes, uGrid; uniform float uDpr, uCell, uFadeLo, uCap; uniform vec4 uSpot[5]; uniform vec3 uC1, uC2;
    void main() {
      vec2 p = vec2(gl_FragCoord.x, uRes.y * uDpr - gl_FragCoord.y) / uDpr;
      vec2 ij = floor(p / uCell);
      if (ij.x >= uGrid.x || ij.y >= uGrid.y) discard;
      vec2 c = ij * uCell + uCell * 0.5;
      float rest = 1.0;
      for (int s = 0; s < 5; s++) { vec4 sp = uSpot[s]; float d = distance(c, sp.xy); if (d < sp.z) rest *= 1.0 - sp.w * (1.0 - d / sp.z); }
      float y = min(uRes.y - 1.0, floor(c.y + 0.5)), u = (uRes.y - y) / (uRes.y - uFadeLo);
      float cut = u <= 0.0 ? 1.0 : (u < 0.5 ? 1.0 - 0.3 * (u / 0.5) : (u < 1.0 ? 0.85 * (1.0 - (u - 0.5) / 0.5) : 0.0));
      float t = (1.0 - rest) * (1.0 - cut);
      if (t <= 0.02) discard;
      t = min(t, uCap);
      float r = uCell * 0.62 * pow(t, 0.75), px = 1.0 / uDpr, a;
      vec2 dv = abs(p - c);
      if (r < 1.3) a = clamp((r * 0.886 - max(dv.x, dv.y)) / px + 0.5, 0.0, 1.0);
      else a = clamp((r - length(p - c)) / px + 0.5, 0.0, 1.0);
      if (a <= 0.0) discard;
      float g = dot(p, uRes) / dot(uRes, uRes);
      vec3 col = g < 0.7 ? uC1 : mix(uC1, uC2, (g - 0.7) / 0.3);
      gl_FragColor = vec4(col * a, a);
    }`;

  class HeroShade {
    // stage: the hero's stage. opts: spots (LoomPictures.SILK), cell(), strength(), fadeLo() as a fraction of the
    // height, lap(now) → { speed, steer, acc, brake } or null, onLost() when the shading has to fall back
    constructor(stage, opts) {
      this.stage = stage; this.o = opts; this.ok = false;
      this.c = document.createElement('canvas');
      this.c.className = 'shade';
      this.c.setAttribute('aria-hidden', 'true');
      const gl = this.c.getContext('webgl', { premultipliedAlpha: true, antialias: false, alpha: true, powerPreference: 'low-power' });
      if (!gl) return;
      try {
        const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
        const pr = gl.createProgram();
        gl.attachShader(pr, sh(gl.VERTEX_SHADER, VERT)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FRAG)); gl.linkProgram(pr);
        if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(pr));
        gl.useProgram(pr);
        const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);   // one triangle over the whole canvas
        const aP = gl.getAttribLocation(pr, 'aP'); gl.enableVertexAttribArray(aP); gl.vertexAttribPointer(aP, 2, gl.FLOAT, false, 0, 0);
        this.u = {};
        ['uRes', 'uGrid', 'uDpr', 'uCell', 'uFadeLo', 'uCap', 'uSpot', 'uC1', 'uC2'].forEach(n => { this.u[n] = gl.getUniformLocation(pr, n); });
        gl.uniform3fv(this.u.uC1, rgb(css('--thread'))); gl.uniform3fv(this.u.uC2, rgb(css('--thread-2')));
        gl.uniform1f(this.u.uCap, 0.56);   // the shading stays dots; floats are for the network
      } catch (err) { return; }
      this.gl = gl; this.ok = true;
      stage.insertBefore(this.c, stage.querySelector('.weave'));
      this.lap = { speed: 0.72, acc: 1, brake: 0, steer: 0 };
      this.visible = true; this.running = false; this.last = 0;
      this.c.addEventListener('webglcontextlost', e => {
        e.preventDefault(); this.ok = false; this.c.remove();
        if (this.o.onLost) this.o.onLost();
      });
      new IntersectionObserver(([e]) => { this.visible = e.isIntersecting; this.kick(); }, { threshold: 0 }).observe(stage);
      document.addEventListener('visibilitychange', () => this.kick());
      new ResizeObserver(() => this.size()).observe(stage);
    }

    size() {
      if (!this.ok) return;
      const w = this.stage.clientWidth, h = this.stage.clientHeight, dpr = Math.min(window.devicePixelRatio || 1, 2), cell = this.o.cell();
      if (!w || !h) return;
      this.w = w; this.h = h; this.cell = cell;
      this.c.width = Math.round(w * dpr); this.c.height = Math.round(h * dpr);
      const gl = this.gl, u = this.u;
      gl.viewport(0, 0, this.c.width, this.c.height);
      gl.uniform2f(u.uRes, w, h); gl.uniform1f(u.uDpr, dpr); gl.uniform1f(u.uCell, cell);
      gl.uniform2f(u.uGrid, Math.floor(w / cell), Math.floor(h / cell));   // the same cells as the loom's
      gl.uniform1f(u.uFadeLo, h * this.o.fadeLo());
      this.draw(performance.now(), 16);
      this.kick();
    }

    kick() { if (this.ok && !this.running) { this.running = true; requestAnimationFrame(t => this.frame(t)); } }

    frame(now) {
      if (!this.ok) { this.running = false; return; }
      const dt = this.last ? Math.min(64, now - this.last) : 16; this.last = now;
      this.draw(now, dt);
      const on = this.visible && !document.hidden && !REDUCED.matches;
      if (on) requestAnimationFrame(t => this.frame(t)); else { this.running = false; this.last = 0; }
    }

    draw(now, dt) {
      if (!this.w) return;
      const gl = this.gl, u = this.u, { w, h } = this, still = REDUCED.matches;
      const ease = tau => (still ? 1 : 1 - Math.exp(-dt / tau));
      let strength = this.o.strength(), shift = 0;
      const r = this.o.lap(now);
      if (r) {   // smoothed, so the light swells and settles instead of flickering with each sample
        const L = this.lap;
        L.speed += (r.speed - L.speed) * ease(420); L.acc += (r.acc - L.acc) * ease(300);
        L.brake += (r.brake - L.brake) * ease(220); L.steer += (r.steer - L.steer) * ease(500);
        strength *= (0.45 + 0.75 * L.speed) * (1 + 0.18 * L.acc) * (1 - 0.35 * L.brake);
        shift = -L.steer * 0.09;   // a positive output steers the car left, so the light swings left
      }
      const spots = new Float32Array(20);
      this.o.spots.forEach(([cx, cy, rad, a], k) => spots.set([(cx + shift) * w, cy * h, rad * Math.max(w, h), a * strength], k * 4));
      gl.uniform4fv(u.uSpot, spots);
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
  }

  window.HeroShade = HeroShade;
})();
