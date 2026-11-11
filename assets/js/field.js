/* The field: one halftone light behind the whole page.
   The warp dots belong to the cloth and scroll with it; the light glides across them from chapter
   to chapter, so the page reads as one length of silk rather than a stack of panels.
   While you scroll fast the lit dots draw out into weft floats, and near a mouse pointer they lift.
   Reduced motion gets the same light, placed without easing or effects. Hand-written, no dependencies. */
(function () {
  'use strict';

  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)');
  const FINE = matchMedia('(hover: hover) and (pointer: fine)');
  const css = name => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  const lerp = (a, b, k) => a + (b - a) * k;

  class Field {
    // sections: the chapters in page order; spots: one light per chapter, [x, y, radius, strength] in viewport fractions
    constructor(canvas, sections, spots, opts) {
      this.c = canvas; this.x = canvas.getContext('2d');
      this.sections = sections; this.spots = spots;
      this.o = Object.assign({ cell: 6 }, opts);
      this.cur = null; this.vel = 0; this.stretch = 0; this.lastY = scrollY; this.lastT = 0; this.running = false;
      this.ptr = { x: 0, y: 0, tx: 0, ty: 0, a: 0, on: false };
      this.resize();
      addEventListener('resize', () => { this.resize(); this.kick(); }, { passive: true });
      addEventListener('scroll', () => this.kick(), { passive: true });
      new ResizeObserver(() => { this.measure(); this.kick(); }).observe(document.body);
      if (FINE.matches) {
        // the pointer only lifts dots on the lit side, so moving over the text costs nothing
        addEventListener('pointermove', e => {
          const p = this.ptr, lit = e.clientX > this.w * 0.5;
          if (lit && !p.on && p.a < 0.01) { p.x = e.clientX; p.y = e.clientY; }
          p.tx = e.clientX; p.ty = e.clientY;
          if (lit || p.on) { p.on = lit; this.kick(); }
        }, { passive: true });
        document.documentElement.addEventListener('pointerleave', () => { this.ptr.on = false; this.kick(); });
      }
    }

    resize() {
      const w = innerWidth, h = innerHeight, dpr = Math.min(window.devicePixelRatio || 1, 2), cell = this.o.cell;
      this.w = w; this.h = h; this.dpr = dpr;
      this.c.width = Math.round(w * dpr); this.c.height = Math.round(h * dpr);
      // the warp: one faint dot per weave cell, drawn once and slid with the page
      const warp = document.createElement('canvas');
      warp.width = this.c.width; warp.height = Math.round((h + cell * 2) * dpr);
      const wx = warp.getContext('2d'); wx.scale(dpr, dpr); wx.fillStyle = css('--warp');
      const r = cell * 0.11; wx.beginPath();
      for (let y = cell / 2; y < h + cell * 2; y += cell) for (let x = cell / 2; x < w; x += cell) { wx.moveTo(x + r, y); wx.arc(x, y, r, 0, 7); }
      wx.fill();
      this.warp = warp;
      const g = this.x.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, css('--thread')); g.addColorStop(0.7, css('--thread')); g.addColorStop(1, css('--thread-2'));
      this.fill = g;
      this.measure();
      this.cur = null;
      this.draw();
    }

    measure() {
      this.tops = this.sections.map(s => s.getBoundingClientRect().top + scrollY);
      this.hs = this.sections.map(s => Math.max(1, s.offsetHeight));
    }

    // where the light should be for this scroll position: it holds through a chapter, then glides to the next
    target() {
      const vh = this.h, mid = scrollY + vh * 0.5, n = this.tops.length;
      let i = 0; while (i < n - 1 && mid >= this.tops[i + 1]) i++;
      const frac = Math.max(0, Math.min(1, (mid - this.tops[i]) / this.hs[i]));
      const A = this.spots[i], B = this.spots[Math.min(i + 1, n - 1)], k = smooth(0.5, 1, frac);
      const narrow = this.w < 860;
      return {
        x: lerp(A[0], B[0], k), y: lerp(A[1], B[1], k), r: lerp(A[2], B[2], k),
        // the hero has its own silk: the field's light rises as the hero leaves
        a: lerp(A[3], B[3], k) * (narrow ? 0.75 : 1) * smooth(0.12, 0.7, scrollY / vh),
      };
    }

    kick() { if (!this.running) { this.running = true; requestAnimationFrame(t => this.frame(t)); } }

    frame(now) {
      const dt = this.lastT ? Math.min(64, now - this.lastT) : 16; this.lastT = now;
      const still = REDUCED.matches, ease = tau => still ? 1 : 1 - Math.exp(-dt / tau);
      const T = this.target();
      if (!this.cur) this.cur = Object.assign({}, T);
      let moving = false;
      for (const k of ['x', 'y', 'r', 'a']) { this.cur[k] += (T[k] - this.cur[k]) * ease(260); if (Math.abs(T[k] - this.cur[k]) > 0.0008) moving = true; }
      // scroll speed, smoothed: a fast scroll draws the lit dots out into floats, which settle back after
      const v = Math.abs(scrollY - this.lastY) / dt; this.lastY = scrollY;
      this.vel += (v - this.vel) * ease(70);
      const want = still ? 0 : smooth(0.35, 3, this.vel);
      this.stretch += (want - this.stretch) * ease(want > this.stretch ? 90 : 320);
      const p = this.ptr;
      if (!still) { p.x += (p.tx - p.x) * ease(110); p.y += (p.ty - p.y) * ease(110); p.a += ((p.on ? 1 : 0) - p.a) * ease(220); }
      this.draw();
      const busy = moving || this.vel > 0.01 || this.stretch > 0.003 || Math.abs((p.on ? 1 : 0) - p.a) > 0.01 || (p.a > 0.01 && Math.hypot(p.tx - p.x, p.ty - p.y) > 0.5);
      if (busy) requestAnimationFrame(t => this.frame(t)); else { this.running = false; this.lastT = 0; }
    }

    draw() {
      const { x: ctx, w, h, dpr } = this, cell = this.o.cell;
      if (!this.cur) this.cur = this.target();
      const cur = this.cur, p = this.ptr, st = this.stretch;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const oy = -(((scrollY % cell) + cell) % cell);
      ctx.drawImage(this.warp, 0, oy, w, this.warp.height / dpr);
      if (cur.a < 0.004 && p.a < 0.01) return;

      const narrow = w < 860, m0 = narrow ? 0.86 : 0.68, m1 = narrow ? 1.02 : 0.97;
      const cx = cur.x * w, cy = cur.y * h, R = cur.r * Math.max(w, Math.min(h, 1100));
      const i0 = Math.floor(w * Math.min(m0, 0.5) / cell), cols = Math.ceil(w / cell), rows = Math.ceil(h / cell) + 1;
      ctx.fillStyle = this.fill; ctx.beginPath();
      for (let j = 0; j < rows; j++) {
        const y = oy + j * cell + cell / 2;
        for (let i = i0; i < cols; i++) {
          const x = i * cell + cell / 2, fx = x / w;
          let t = 0;
          const mask = smooth(m0, m1, fx);   // the light stays out of the reading column
          if (mask > 0 && cur.a > 0.004) { const d = Math.hypot(x - cx, y - cy) / R; if (d < 1) t = cur.a * (1 - d) * mask; }
          if (p.a > 0.01) { const d = Math.hypot(x - p.x, y - p.y) / 170; if (d < 1) t += 0.3 * p.a * (1 - d) * (1 - d) * smooth(0.5, 0.72, fx); }
          if (t < 0.03) continue;
          const r = cell * 0.62 * Math.pow(Math.min(1, t), 0.75);
          if (st > 0.05) {   // a weft float, as long as the scroll is fast and the light is strong
            const len = Math.min(cell * 0.86, r * 2 + cell * 1.2 * st * Math.min(1, t * 2.4)), hh = Math.max(0.7, r * 2 * (1 - 0.4 * st));   // short of a full cell, so each float stays its own thread
            ctx.rect(x - len / 2, y - hh / 2, len, hh);
          } else { ctx.moveTo(x + r, y); ctx.arc(x, y, r, 0, 7); }
        }
      }
      ctx.fill();
    }
  }

  window.Field = Field;
})();
