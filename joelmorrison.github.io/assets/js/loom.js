/* The loom: draws a picture offscreen, samples it on a grid of weave cells and renders it as cloth.
   Strong cells become weft floats (short horizontal threads), weaker cells become halftone dots
   sized by tone, and the warp shows as a faint grid of dots. Hand-written, no dependencies. */
(function () {
  'use strict';

  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)');
  const FINE = matchMedia('(hover: hover) and (pointer: fine)');
  const css = name => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

  class Loom {
    constructor(canvas, opts) {
      this.c = canvas;
      this.ctx = canvas.getContext('2d');
      this.o = Object.assign({
        cell: 7,            // weave cell size in CSS px
        floatAt: 0.62,      // tone at which a cell becomes a woven float
        animate: true,      // weave in row by row
        particles: true,    // threads fly in from the side while weaving
        rowMs: 12,
        startOnVisible: false,
        interactive: false, // sheen follows the pointer, press and hold for the linen tester
        zoom: 2.6,
        warp: true,
        onRow: null,
      }, opts);
      this.motion = !REDUCED.matches && FINE.matches;   // reduced motion and touch get the finished cloth
      this.temp = document.createElement('canvas');
      this.visible = false;
      this.started = !this.o.startOnVisible;
      this.running = false;
      this.particles = [];
      this.sheen = { x: 0, y: 0, a: 0, on: false };
      this.lens = { x: 0, y: 0, a: 0, on: false };

      if (this.o.interactive) this.bindPointer();
      // build a cloth only once it comes within about a screen of view, in idle time
      this.near = false;
      new IntersectionObserver(([e]) => {
        if (!e.isIntersecting || this.near) return;
        this.near = true;
        const go = () => this.resize();
        if (window.requestIdleCallback && !this.o.eager) requestIdleCallback(go, { timeout: 400 }); else go();
      }, { rootMargin: '100% 0px' }).observe(canvas);
      new ResizeObserver(() => { if (this.near) this.resize(); }).observe(canvas);
      new IntersectionObserver(([e]) => {
        this.visible = e.isIntersecting;
        if (this.visible && !this.started) { this.started = true; this.lastRow = performance.now(); }
        if (this.visible) this.kick();
      }, { threshold: 0.15 }).observe(canvas);
    }

    bindPointer() {
      const c = this.c;
      const at = e => { const r = c.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
      c.addEventListener('pointermove', e => {
        if (!FINE.matches || !this.motion) return;
        const p = at(e);
        if (!this.sheen.on) { this.sheen.x = p.x; this.sheen.y = p.y; }
        this.sheen.on = true; this.pointer = p; this.kick();
      });
      c.addEventListener('pointerleave', () => { this.sheen.on = false; this.lens.on = false; clearTimeout(this.holdTimer); this.kick(); });
      c.addEventListener('pointerdown', e => {
        if (!FINE.matches || !this.motion || e.button !== 0) return;
        const p = at(e); this.pointer = p;
        clearTimeout(this.holdTimer);
        this.holdTimer = setTimeout(() => {
          this.lens.on = true; this.lens.x = this.pointer.x; this.lens.y = this.pointer.y;
          c.style.cursor = 'none'; this.kick();
        }, 160);
      });
      const release = () => { clearTimeout(this.holdTimer); this.lens.on = false; c.style.cursor = ''; this.kick(); };
      c.addEventListener('pointerup', release);
      c.addEventListener('pointercancel', release);
      c.addEventListener('contextmenu', e => { if (this.lens.on) e.preventDefault(); });
    }

    colors() {
      this.col = {
        thread: css('--thread'), thread2: css('--thread-2'), pearl: css('--pearl'),
        warp: css('--warp'), ground2: css('--ground-2'),
      };
    }

    resize() {
      const w = this.c.clientWidth, h = this.c.clientHeight;
      if (!w || !h || (w === this.w && h === this.h)) return;
      this.w = w; this.h = h; this.dpr = Math.min(window.devicePixelRatio || 1, 2);
      for (const cv of [this.c, this.temp]) { cv.width = Math.round(w * this.dpr); cv.height = Math.round(h * this.dpr); }
      this.build(this.row !== undefined);
    }

    redraw(fn) { if (fn) this.o.draw = fn; if (this.w) this.build(true); }

    build(keepProgress) {
      this.colors();
      const { w, h, dpr } = this, cell = this.o.cell;
      const off = document.createElement('canvas'); off.width = w; off.height = h;
      const octx = off.getContext('2d', { willReadFrequently: true });
      this.o.draw(octx, w, h);
      const data = octx.getImageData(0, 0, w, h).data;
      this.cols = Math.floor(w / cell); this.rows = Math.floor(h / cell);
      this.cells = new Float32Array(this.cols * this.rows);
      for (let j = 0; j < this.rows; j++) for (let i = 0; i < this.cols; i++) {
        const x = Math.min(w - 1, Math.round(i * cell + cell / 2)), y = Math.min(h - 1, Math.round(j * cell + cell / 2));
        this.cells[j * this.cols + i] = data[(y * w + x) * 4 + 3] / 255;
      }
      const layer = () => {
        const cv = document.createElement('canvas'); cv.width = this.c.width; cv.height = this.c.height;
        const x = cv.getContext('2d'); x.scale(dpr, dpr); return [cv, x];
      };
      [this.warpC, this.warpX] = layer();
      [this.maskC, this.maskX] = layer();
      if (this.o.warp) {
        this.warpX.fillStyle = this.col.warp;
        const r = cell * 0.11, tile = cell * dpr;
        if (Number.isInteger(tile)) {                 // whole-pixel spacing: stamp one dot tile across the grid
          const t = document.createElement('canvas'); t.width = t.height = tile;
          const tx = t.getContext('2d'); tx.fillStyle = this.col.warp;
          tx.beginPath(); tx.arc(tile / 2, tile / 2, r * dpr, 0, 7); tx.fill();
          const pat = this.warpX.createPattern(t, 'repeat'); pat.setTransform(new DOMMatrix([1 / dpr, 0, 0, 1 / dpr, 0, 0]));
          this.warpX.fillStyle = pat; this.warpX.fillRect(0, 0, this.cols * cell, this.rows * cell);
        } else {
          this.warpX.beginPath();                     // otherwise every dot in one path, one fill
          for (let j = 0; j < this.rows; j++) for (let i = 0; i < this.cols; i++) {
            const cx = i * cell + cell / 2, cy = j * cell + cell / 2;
            this.warpX.moveTo(cx + r, cy); this.warpX.arc(cx, cy, r, 0, 7);
          }
          this.warpX.fill();
        }
      }
      // the woven layer is painted in its thread colours directly: lilac shading into violet
      const g = this.maskX.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, this.col.thread); g.addColorStop(0.7, this.col.thread); g.addColorStop(1, this.col.thread2);
      this.threadFill = g; this.maskX.fillStyle = g;
      const weaveIn = this.o.animate && this.motion;
      const upTo = keepProgress ? Math.min(this.row ?? this.rows, this.rows) : (weaveIn ? 0 : this.rows);
      for (let j = 0; j < upTo; j++) this.weaveRow(j, false);
      this.row = upTo; this.particles = []; this.lastRow = performance.now();
      if (this.o.onRow) this.o.onRow(this.row, this.rows);
      this.frame(performance.now(), true);
      this.kick();
    }

    shape(x, i, j, dx = 0, dy = 0) {
      const cell = this.o.cell, v = this.cells[j * this.cols + i];
      const cx = i * cell + cell / 2 + dx, cy = j * cell + cell / 2 + dy;
      if (v >= this.o.floatAt) x.fillRect(cx - cell * 0.5, cy - cell * 0.22, cell, cell * 0.44);
      else if (v > 0.02) { x.beginPath(); x.arc(cx, cy, cell * 0.62 * Math.pow(v, 0.75), 0, 7); x.fill(); }
    }

    weaveRow(j, fly) {
      const cell = this.o.cell, x = this.maskX;
      x.beginPath();                                  // the row's halftone dots share one path
      for (let i = 0; i < this.cols; i++) {
        const v = this.cells[j * this.cols + i];
        if (v <= 0.02) continue;
        if (fly && this.o.particles && v >= this.o.floatAt * 0.6) {
          const fromLeft = j % 2 === 0, x1 = i * cell + cell / 2, y1 = j * cell + cell / 2;
          this.particles.push({
            i, j, x1, y1, x0: fromLeft ? -30 : this.w + 30, y0: y1 + (Math.random() - 0.5) * 90,
            t0: performance.now() + Math.random() * 120,
            dur: 380 + Math.random() * 340 + Math.abs(fromLeft ? x1 : this.w - x1) * 0.32,
          });
        } else if (v >= this.o.floatAt) {
          const cx = i * cell + cell / 2, cy = j * cell + cell / 2;
          x.fillRect(cx - cell * 0.5, cy - cell * 0.22, cell, cell * 0.44);
        } else {
          const cx = i * cell + cell / 2, cy = j * cell + cell / 2, r = cell * 0.62 * Math.pow(v, 0.75);
          x.moveTo(cx + r, cy); x.arc(cx, cy, r, 0, 7);
        }
      }
      x.fill();
    }

    kick() {
      if (!this.running && this.w && this.visible) { this.running = true; requestAnimationFrame(t => this.frame(t)); }
    }

    frame(now, once = false) {
      if (!once && !this.visible) { this.running = false; return; }
      const { ctx, w, h, dpr, col } = this;
      const weaving = this.started && this.o.animate && this.motion && this.row < this.rows;
      if (!once && weaving && now - this.lastRow > this.o.rowMs) {
        const steps = Math.min(4, Math.floor((now - this.lastRow) / this.o.rowMs));
        for (let s = 0; s < steps && this.row < this.rows; s++) { this.weaveRow(this.row, true); this.row++; }
        this.lastRow = now;
        if (this.o.onRow) this.o.onRow(this.row, this.rows);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(this.warpC, 0, 0, w, h);

      // the woven layer, plus a pearl sheen near the pointer (only then is the extra layer needed)
      const s = this.sheen;
      // frame-rate independent easing: the same feel at 60 Hz and 120 Hz
      const dt = once ? 0 : Math.min(64, now - (this.lastFrame || now)); if (!once) this.lastFrame = now;
      const ease = rate => 1 - Math.pow(1 - rate, dt / 16.67);
      if (!once) {
        if (this.pointer) { s.x += (this.pointer.x - s.x) * ease(0.18); s.y += (this.pointer.y - s.y) * ease(0.18); }
        s.a += ((s.on ? 1 : 0) - s.a) * ease(0.12);
      }
      if (s.a > 0.01) {
        // a soft tilt of light, not a spotlight: brightness still reads as weight under the cursor
        const tx = this.temp.getContext('2d'), W = this.temp.width, H = this.temp.height;
        tx.setTransform(1, 0, 0, 1, 0, 0);
        tx.globalCompositeOperation = 'source-over'; tx.clearRect(0, 0, W, H);
        tx.drawImage(this.maskC, 0, 0);
        tx.globalCompositeOperation = 'source-atop';
        const R = 220 * dpr, rg = tx.createRadialGradient(s.x * dpr, s.y * dpr, 0, s.x * dpr, s.y * dpr, R);
        rg.addColorStop(0, col.pearl); rg.addColorStop(1, 'rgba(255,255,255,0)');
        tx.globalAlpha = s.a * 0.36; tx.fillStyle = rg; tx.fillRect(0, 0, W, H); tx.globalAlpha = 1;
        ctx.drawImage(this.temp, 0, 0, w, h);
      } else ctx.drawImage(this.maskC, 0, 0, w, h);

      // threads in flight
      if (this.particles.length) {
        ctx.strokeStyle = col.thread; ctx.lineWidth = this.o.cell * 0.4; ctx.lineCap = 'round';
        const keep = [];
        for (const p of this.particles) {
          const k = Math.min(1, Math.max(0, (now - p.t0) / p.dur));
          if (k >= 1) { this.maskX.fillStyle = this.threadFill; this.shape(this.maskX, p.i, p.j); continue; }
          const e = 1 - Math.pow(2, -10 * k), x = p.x0 + (p.x1 - p.x0) * e, y = p.y0 + (p.y1 - p.y0) * e;
          const dir = Math.sign(p.x1 - p.x0) || 1, tail = (1 - e) * 26 + this.o.cell * 0.5;
          ctx.globalAlpha = 0.35 + 0.65 * k;
          ctx.beginPath(); ctx.moveTo(x - dir * tail, y + (p.y0 - p.y1) * (1 - e) * 0.15); ctx.lineTo(x, y); ctx.stroke();
          keep.push(p);
        }
        ctx.globalAlpha = 1; this.particles = keep;
      }

      // linen tester
      const L = this.lens;
      if (!once) {
        if (this.pointer) { L.x += (this.pointer.x - L.x) * ease(0.35); L.y += (this.pointer.y - L.y) * ease(0.35); }
        L.a += ((L.on ? 1 : 0) - L.a) * ease(0.22);
      }
      if (L.a > 0.01) this.drawLens(ctx, L.x, L.y, L.a);

      if (once) return;
      const busy = weaving || this.particles.length || s.on || s.a > 0.01 || L.on || L.a > 0.01;
      if (busy) requestAnimationFrame(t => this.frame(t)); else { this.running = false; this.lastFrame = 0; }
    }

    drawLens(ctx, mx, my, a) {
      const cell = this.o.cell, Z = this.o.zoom, col = this.col, u = cell * Z;
      const S = 180 * (0.8 + 0.2 * a), h = S / 2;
      ctx.save(); ctx.globalAlpha = a;
      ctx.shadowColor = 'rgba(0,0,0,.5)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 12;
      ctx.fillStyle = col.ground2; ctx.fillRect(mx - h, my - h, S, S);
      ctx.shadowColor = 'transparent';
      ctx.beginPath(); ctx.rect(mx - h, my - h, S, S); ctx.clip();
      const r = h / Z + cell * 2;
      const i0 = Math.max(0, Math.floor((mx - r) / cell)), i1 = Math.min(this.cols - 1, Math.ceil((mx + r) / cell));
      const j0 = Math.max(0, Math.floor((my - r) / cell)), j1 = Math.min(this.rows - 1, Math.ceil((my + r) / cell));
      ctx.strokeStyle = col.warp; ctx.lineWidth = u * 0.16;
      for (let i = i0; i <= i1; i++) {
        const x = mx + (i * cell + cell / 2 - mx) * Z;
        ctx.beginPath(); ctx.moveTo(x, my - h); ctx.lineTo(x, my + h); ctx.stroke();
      }
      for (let j = j0; j <= j1; j++) {
        const cy = my + (j * cell + cell / 2 - my) * Z;
        const g = ctx.createLinearGradient(0, cy - u * 0.22, 0, cy + u * 0.22);
        g.addColorStop(0, col.pearl); g.addColorStop(0.45, col.thread); g.addColorStop(1, col.thread2);
        for (let i = i0; i <= i1; i++) {
          const v = this.cells[j * this.cols + i]; if (v <= 0.04) continue;
          const cx = mx + (i * cell + cell / 2 - mx) * Z;
          if (v >= this.o.floatAt) { ctx.fillStyle = g; ctx.beginPath(); ctx.roundRect(cx - u * 0.5, cy - u * 0.22, u * 0.98, u * 0.44, u * 0.22); ctx.fill(); }
          else { ctx.fillStyle = col.thread2; ctx.globalAlpha = a * (0.45 + v); ctx.beginPath(); ctx.arc(cx, cy, u * (0.08 + v * 0.3), 0, 7); ctx.fill(); ctx.globalAlpha = a; }
        }
      }
      ctx.restore();
      ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = col.pearl; ctx.lineWidth = 1;
      ctx.strokeRect(mx - h + 0.5, my - h + 0.5, S - 1, S - 1);
      for (let k = 0, x = mx - h; x <= mx + h; k++, x += u) { ctx.beginPath(); ctx.moveTo(x, my - h); ctx.lineTo(x, my - h + (k % 5 ? 5 : 10)); ctx.stroke(); }
      for (let k = 0, y = my - h; y <= my + h; k++, y += u) { ctx.beginPath(); ctx.moveTo(mx - h, y); ctx.lineTo(mx - h + (k % 5 ? 5 : 10), y); ctx.stroke(); }
      ctx.fillStyle = col.ground2; ctx.fillRect(mx - h, my + h, 46, 18);
      ctx.fillStyle = col.pearl; ctx.font = '400 10px "Azeret Mono", monospace'; ctx.fillText('×' + Z, mx - h + 6, my + h + 13);
      ctx.restore();
    }
  }

  /* ---------- pictures ---------- */

  // Node positions for an 11 → 8 → 3 network inside a box.
  function networkLayout(box) {
    const sizes = [11, 8, 3], gap = Math.min(box.h / 11.5, 64);
    return sizes.map((n, l) => Array.from({ length: n }, (_, k) => ({
      x: box.x + box.w * (0.08 + l * 0.42),
      y: box.y + box.h / 2 + (k - (n - 1) / 2) * gap,
    })));
  }

  // The real all-rounder: every connection drawn with its trained weight. The strongest fifth
  // weave as bright thread; the rest fall back to halftone, sized by how strong they are.
  function drawNetwork(ctx, box, net, cell) {
    const pts = networkLayout(box);
    const edges = [];
    net.hidden_weights.forEach((row, h) => row.forEach((wgt, i) => edges.push({ a: pts[0][i], b: pts[1][h], w: Math.abs(wgt) })));
    net.output_weights.forEach((row, o) => row.forEach((wgt, h) => edges.push({ a: pts[1][h], b: pts[2][o], w: Math.abs(wgt) })));
    const sorted = edges.map(e => e.w).sort((p, q) => p - q);
    const max = sorted[sorted.length - 1], hotAt = sorted[Math.floor(sorted.length * 0.8)];
    ctx.lineCap = 'round';
    edges.sort((p, q) => p.w - q.w).forEach(e => {
      const hot = e.w >= hotAt, s = e.w / max;
      ctx.lineWidth = cell * (hot ? 1.15 : 0.9);
      ctx.strokeStyle = `rgba(0,0,0,${hot ? 1 : 0.08 + 0.36 * s})`;
      ctx.beginPath(); ctx.moveTo(e.a.x, e.a.y); ctx.lineTo(e.b.x, e.b.y); ctx.stroke();
    });
    const r = Math.max(cell * 1.4, Math.min(box.h / 32, 18));
    ctx.fillStyle = '#000';
    for (const layer of pts) for (const p of layer) { ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, 7); ctx.fill(); }
    return pts;
  }

  // Closed Catmull-Rom curve through the control points, the same construction Crash Course uses.
  function catmullRomLoop(points, spacing = 6) {
    const n = points.length, out = [];
    for (let i = 0; i < n; i++) {
      const p0 = points[(i - 1 + n) % n], p1 = points[i], p2 = points[(i + 1) % n], p3 = points[(i + 2) % n];
      const steps = Math.max(2, Math.floor(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / spacing));
      for (let k = 0; k < steps; k++) {
        const t = k / steps, t2 = t * t, t3 = t2 * t;
        const f = d => 0.5 * ((2 * p1[d]) + (-p0[d] + p2[d]) * t + (2 * p0[d] - 5 * p1[d] + 4 * p2[d] - p3[d]) * t2 + (-p0[d] + 3 * p1[d] - 3 * p2[d] + p3[d]) * t3);
        out.push([f(0), f(1)]);
      }
    }
    return out;
  }

  // The technical circuit from track.py: road surface in halftone, centre line woven.
  function drawTrack(ctx, box, track, cell) {
    const path = catmullRomLoop(track.control_points), pad = track.road_width / 2;
    const xs = path.map(p => p[0]), ys = path.map(p => p[1]);
    const minX = Math.min(...xs) - pad, maxX = Math.max(...xs) + pad, minY = Math.min(...ys) - pad, maxY = Math.max(...ys) + pad;
    const s = Math.min(box.w / (maxX - minX), box.h / (maxY - minY));
    const ox = box.x + (box.w - (maxX - minX) * s) / 2, oy = box.y + (box.h - (maxY - minY) * s) / 2;
    ctx.save(); ctx.lineJoin = ctx.lineCap = 'round';
    ctx.beginPath();
    path.forEach(([x, y], k) => { const X = ox + (x - minX) * s, Y = oy + (y - minY) * s; k ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); });
    ctx.closePath();
    ctx.strokeStyle = 'rgba(0,0,0,.3)'; ctx.lineWidth = track.road_width * s; ctx.stroke();
    ctx.strokeStyle = '#000'; ctx.lineWidth = cell * 1.25; ctx.stroke();
    ctx.restore();
  }

  // Broad soft light falling across silk; rendered by the loom only as halftone dots.
  function drawSilk(ctx, w, h, strength) {
    const spots = [[0.78, 0.28, 0.55, 0.32], [0.98, 0.92, 0.45, 0.26], [0.3, 1.08, 0.5, 0.2], [0.55, 0.02, 0.35, 0.16], [0.12, 0.42, 0.3, 0.1]];
    for (const [cx, cy, r, a] of spots) {
      const g = ctx.createRadialGradient(cx * w, cy * h, 0, cx * w, cy * h, r * Math.max(w, h));
      g.addColorStop(0, `rgba(0,0,0,${a * strength})`); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    }
  }

  Loom.canLook = () => FINE.matches && !REDUCED.matches;
  window.Loom = Loom;
  window.LoomPictures = { networkLayout, drawNetwork, drawTrack, drawSilk };
})();
