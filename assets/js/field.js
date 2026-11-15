/* The field: one night sky behind the whole page, woven into the cloth.
   The warp dots belong to the cloth: they are a CSS background on the page (site.css), so the browser scrolls
   them for free and this canvas only ever draws what is lit, on the same 6px grid. Each chapter has its own sky: a few constellations
   scattered across the background, built from real star positions and magnitudes
   (assets/data/constellations.js) and woven by the loom's own rule: a star's core is a stack of weft floats,
   its halo is halftone dots sized by tone, and the lines between stars are dotted threads. Brighter stars
   are bigger, and only the brightest reach pearl. Around each figure sit the fainter stars really found there,
   and behind it the Milky Way, drawn where it really runs. Where the page is thick with text or pictures the sky
   thins out gradually, with no edge to see, so the stars sit behind the words instead of fighting them.
   Scrolling drives everything: a constellation lights star by star, brightest first, then its lines draw
   from star to star, and the chapter's other constellations follow it; as the chapter ends they unweave the
   same way and the next sky takes their place, announced by one shooting star. Each constellation turns a few
   degrees and drifts a little through its chapter, and its stars and Milky Way move with it as one piece.
   Nothing moves while the page is still.
   While you scroll fast the dots draw out into floats; near a mouse pointer the lit cloth lifts.
   Reduced motion gets each sky whole and still, with no shooting star.
   The field times its own drawing: on a device that cannot keep up it first drops the Milky Way, then the
   faint stars and the sharpness, and it never drops the constellations. It also stays out of the way of the hero's
   entrance: nothing is measured or worked out until that has finished, or until the first scroll.
   Hand-written, no dependencies. */
(function () {
  'use strict';

  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)');
  const FINE = matchMedia('(hover: hover) and (pointer: fine)');
  const css = name => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const clamp = x => Math.max(0, Math.min(1, x));
  const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
  const easeOut = t => 1 - Math.pow(1 - t, 3);
  // smooth, repeatable noise for the grain of the Milky Way
  const hash = (i, j) => { const h = Math.sin(i * 127.1 + j * 311.7) * 43758.5453; return h - Math.floor(h); };
  const noise = (x, y) => {
    const i = Math.floor(x), j = Math.floor(y), fx = x - i, fy = y - j, ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
    const a = hash(i, j), b = hash(i + 1, j), c = hash(i, j + 1), d = hash(i + 1, j + 1);
    return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
  };

  const REACH = 1.5;   // how far the Milky Way and faint stars reach around a figure, in figure widths
  const GRID = 150;    // the Milky Way is worked out once per figure on a GRID x GRID map, then only looked up

  // Project a constellation onto a flat picture as it sits in the sky: north up, east to the left,
  // centred and scaled to fit a unit box. Gnomonic, so it also holds next to the pole.
  function project(con, seed) {
    const rad = Math.PI / 180;
    const v = con.stars.map(s => { const ra = s[1] * 15 * rad, de = s[2] * rad; return [Math.cos(de) * Math.cos(ra), Math.cos(de) * Math.sin(ra), Math.sin(de)]; });
    let c = [0, 0, 0]; v.forEach(p => { c[0] += p[0]; c[1] += p[1]; c[2] += p[2]; });
    const cl = Math.hypot(c[0], c[1], c[2]); c = c.map(k => k / cl);
    let e = [-c[1], c[0], 0]; const el = Math.hypot(e[0], e[1]); e = e.map(k => k / el);            // east
    const n = [c[1] * e[2] - c[2] * e[1], c[2] * e[0] - c[0] * e[2], c[0] * e[1] - c[1] * e[0]];      // north
    const flat = p => { const d = p[0] * c[0] + p[1] * c[1] + p[2] * c[2]; return [-(p[0] * e[0] + p[1] * e[1] + p[2] * e[2]) / d, -(p[0] * n[0] + p[1] * n[1] + p[2] * n[2]) / d]; };
    const pts = v.map(flat);
    const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
    const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys), k = 1 / Math.max(x1 - x0, y1 - y0);
    const mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
    const order = con.stars.map((s, i) => i).sort((a, b) => con.stars[a][3] - con.stars[b][3]);       // brightest first
    const rank = []; order.forEach((i, r) => { rank[i] = r; });

    // The Milky Way where it really is. Each spot of the picture is turned back into a spot in the sky and lit by
    // how close it lies to the plane of the galaxy: brighter towards the galaxy's centre, with the dark lane down
    // the middle and a grain. Worked out once, the first time the figure is shown; null if the galaxy misses it.
    const G = [-0.867666, -0.198076, 0.455984], GC = [-0.054876, -0.873437, -0.483835], dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    const g0 = dot(c, G), ge = dot(e, G), gn = dot(n, G), c0 = dot(c, GC), ce = dot(e, GC), cn = dot(n, GC);
    let river;
    const milky = () => {
      if (river !== undefined) return river;
      const m = new Float32Array(GRID * GRID); let any = false;
      for (let j = 0; j < GRID; j++) for (let i = 0; i < GRID; i++) {
        const ux = ((i + 0.5) / GRID * 2 - 1) * REACH, uy = ((j + 0.5) / GRID * 2 - 1) * REACH, rr = Math.hypot(ux, uy);
        if (rr > REACH) continue;
        const tx = ux / k + mx, ty = uy / k + my, inv = 1 / Math.sqrt(1 + tx * tx + ty * ty);
        const lat = Math.asin((g0 - tx * ge - ty * gn) * inv) * 57.2958;       // degrees off the galaxy's plane
        if (lat > 22 || lat < -22) continue;
        const core = 0.5 + 0.5 * (c0 - tx * ce - ty * cn) * inv;               // 1 towards the galaxy's centre, 0 away from it
        let t = Math.exp(-lat * lat / 70) * (0.6 + 0.4 * core) * (1 - (0.25 + 0.4 * core) * Math.exp(-(lat - 1.2) * (lat - 1.2) / 3.4));
        t *= 0.26 * (1 - smooth(0.7, REACH, rr)) * (0.34 + 0.66 * noise(ux * 7 + seed * 5, uy * 7) * (0.55 + 0.45 * noise(ux * 23 + 9, uy * 23)));
        if (t >= 0.03) { m[j * GRID + i] = t; any = true; }
      }
      return (river = any ? m : null);
    };

    return {
      stars: con.stars.map((s, i) => {
        const b = Math.max(0.22, 1 - 0.17 * Math.max(0, s[3]));   // brightness from magnitude: faint stars stay dots, bright ones earn floats
        return { x: (pts[i][0] - mx) * k, y: (pts[i][1] - my) * k, peak: 0.4 + 0.6 * b, spread: 3 + 11 * b, rank: rank[i] };
      }),
      lines: con.lines, milky,
      // the fainter stars around the figure: single dots, never floats
      field: (con.field || []).map(f => {
        const ra = f[0] * 15 * rad, de = f[1] * rad, q = flat([Math.cos(de) * Math.cos(ra), Math.cos(de) * Math.sin(ra), Math.sin(de)]);
        return { x: (q[0] - mx) * k, y: (q[1] - my) * k, tone: 0.13 + 0.2 * clamp((5.7 - f[2]) / 3) };
      }),
    };
  }

  class Field {
    // sections: the chapters in page order
    // skies: for each chapter, the constellations behind it (or null for none), each as
    //   [constellation, x, y, size]: x and y place its middle as fractions of the screen, size is relative to the largest
    // content: the element whose text and pictures the sky should dim behind
    constructor(canvas, sections, skies, content, opts) {
      this.c = canvas; this.x = canvas.getContext('2d');
      this.sections = sections; this.content = content;
      let seed = 0;
      this.skies = skies.map(list => list ? list.map(([con, x, y, size]) => ({ sky: project(con, seed++), x, y, size })) : null);
      this.o = Object.assign({
        cell: 6,
        floatAt: 0.62,     // the loom's rule: tone above this weaves as a weft float
        pearlAt: 0.86,     // only the cores of the brightest stars reach pearl
        thread: 0.2,       // tone of the lines between stars
        turn: 7,           // degrees a constellation turns through one chapter
        drift: 46,         // px a constellation drifts up through one chapter
        follow: 0.3,       // how far behind the one before it each constellation in a chapter starts
        hush: 0.7,         // how much the sky thins out where the page is thick with text or pictures
        wait: 2800,        // ms to leave the hero's entrance alone before measuring the page and working out the Milky Way
        milkyWay: true,    // the Milky Way behind each constellation that sits on it
        stars: true,       // the fainter real stars around each constellation
        meteor: true,      // one shooting star as each new sky arrives
        budget: 9,         // ms one frame's drawing may take before the field starts dropping layers
      }, opts);
      // how much the device can afford: 2 everything, 1 no Milky Way, 0 also no faint stars and a softer canvas.
      // It starts lower on devices that say they are small, and only ever steps down.
      const small = (navigator.deviceMemory && navigator.deviceMemory <= 2) || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2);
      this.level = small ? 1 : 2; this.heavy = 0; this.fresh = 0;
      this.q = this.skies.map(() => null);   // how far each chapter's sky is woven, 0..1
      this.vel = 0; this.stretch = 0; this.lastY = scrollY; this.lastT = 0; this.running = false;
      this.now = 0; this.live = -1; this.met = null; this.shots = 0; this.late = 0;
      this.ptr = { x: 0, y: 0, tx: 0, ty: 0, a: 0, on: false };
      this.armed = false; this.map = null;
      this.resize();
      // the heavy preparation waits for the hero's entrance to finish, or for the first scroll, whichever comes first
      setTimeout(() => (window.requestIdleCallback ? requestIdleCallback(() => this.arm(), { timeout: 1200 }) : this.arm()), this.o.wait);
      addEventListener('resize', () => { this.resize(); this.kick(); }, { passive: true });
      addEventListener('scroll', () => { if (!this.armed) this.arm(); this.kick(); }, { passive: true });
      // when the page changes height, re-measure the chapters now and re-map the text once it settles
      new ResizeObserver(() => {
        this.place(); this.kick();
        if (!this.armed) return;
        clearTimeout(this.late); this.late = setTimeout(() => { this.survey(); this.kick(); }, 140);
      }).observe(document.body);
      if (FINE.matches) {
        // the pointer only lifts cloth that is already lit, so moving over the text costs nothing
        addEventListener('pointermove', e => {
          const p = this.ptr, lit = this.near(e.clientX, e.clientY);
          if (lit && !p.on && p.a < 0.01) { p.x = e.clientX; p.y = e.clientY; }
          p.tx = e.clientX; p.ty = e.clientY;
          if (lit || p.on) { p.on = lit; this.kick(); }
        }, { passive: true });
        document.documentElement.addEventListener('pointerleave', () => { this.ptr.on = false; this.kick(); });
      }
    }

    // measure the page and work out the Milky Way maps: done once, after the entrance, never during it
    arm() {
      if (this.armed) return;
      this.armed = true;
      this.survey();
      // each figure's Milky Way map is worked out ahead of time, one per idle moment, so no chapter has to wait for it
      if (this.o.milkyWay && this.level > 1) {
        const todo = [].concat(...this.skies.filter(Boolean)).map(c => c.sky.milky);
        const idle = window.requestIdleCallback ? fn => requestIdleCallback(fn, { timeout: 1500 }) : fn => setTimeout(fn, 60);
        const next = () => { const made = todo.shift(); if (!made) return; if (made.done === undefined) made.done = made(); idle(next); };
        idle(next);
      }
      this.kick();
    }

    resize() {
      const w = innerWidth, h = innerHeight;
      // sharpness: never more than 2x, and 1.5x at most once the device has shown it is struggling
      const dpr = Math.min(window.devicePixelRatio || 1, this.level ? 2 : 1.5);
      this.w = w; this.h = h; this.dpr = dpr;
      this.c.width = Math.round(w * dpr); this.c.height = Math.round(h * dpr);
      this.body = css('--thread'); this.shade = css('--thread-2'); this.pearl = css('--pearl');
      // where each constellation sits. On a narrow screen only the first two of a chapter are kept, small, in opposite corners
      const narrow = w < 860, base = narrow ? Math.min(w * 0.42, 190) : Math.min(w * 0.26, h * 0.52, 400);
      this.dim = narrow ? 0.6 : 1;   // on a phone the sky is always behind text, so it stays dots: no floats, no pearl
      this.boxes = this.skies.map(list => list && list.slice(0, narrow ? 2 : list.length).map((c, k) => {
        const s = base * (narrow ? Math.min(1, c.size + 0.2) : c.size), m = s / 2 + 18;
        const fx = narrow ? (k ? 0.24 : 0.76) : c.x, fy = narrow ? (k ? 0.8 : 0.26) : c.y;
        return { cx: Math.max(m, Math.min(w - m, w * fx)), cy: Math.max(96 + s / 2, Math.min(h - m, h * fy)), s, sky: c.sky, k, grain: Math.max(0.62, Math.min(1, Math.sqrt(s / 380))) };
      }));
      // one scratch sheet of tone, big enough for the largest constellation, reused every frame
      const side = Math.ceil((base * 1.12 + 80) / this.o.cell) + 2;
      this.sheet = new Float32Array(side * side);
      this.place(); if (this.armed) this.survey();
      this.q = this.q.map(() => null);
      this.draw();
    }

    // where each chapter starts and how tall it is
    place() {
      this.tops = this.sections.map(s => s.getBoundingClientRect().top + scrollY);
      this.hs = this.sections.map(s => Math.max(1, s.offsetHeight));
    }

    // Map how thick the page is with text and pictures, so the sky can thin out there.
    // A coarse grid over the whole page, blurred so widely that it has no edges: a paragraph or a table reads as a
    // soft cloud near 1, a lone label barely registers, and the gaps between blocks stay near 0. The text itself is
    // kept readable by its own soft halo (site.css), so this only has to keep the sky from crowding dense copy.
    survey() {
      const g = 12, cols = Math.ceil(this.w / g) + 1, rows = Math.ceil(document.documentElement.scrollHeight / g) + 1;
      const m = new Float32Array(cols * rows);
      const mark = r => {
        if (r.width < 2 || r.height < 2) return;
        const x0 = Math.max(0, Math.floor(r.left / g)), x1 = Math.min(cols - 1, Math.floor(r.right / g));
        const y0 = Math.max(0, Math.floor((r.top + scrollY) / g)), y1 = Math.min(rows - 1, Math.floor((r.bottom + scrollY) / g));
        for (let y = y0; y <= y1; y++) m.fill(1, y * cols + x0, y * cols + x1 + 1);
      };
      if (this.content) {
        const walk = document.createTreeWalker(this.content, NodeFilter.SHOW_TEXT), range = document.createRange();
        for (let n = walk.nextNode(); n; n = walk.nextNode()) {
          if (!n.nodeValue.trim()) continue;
          range.selectNodeContents(n);
          for (const r of range.getClientRects()) mark(r);
        }
        this.content.querySelectorAll('canvas, img, svg, video').forEach(el => mark(el.getBoundingClientRect()));
      }
      // two passes of a wide running-average blur, across then down: about 70px of fade in every direction
      const o = new Float32Array(m.length), R = 3, W = 2 * R + 1;
      for (let pass = 0; pass < 2; pass++) {
        for (let y = 0; y < rows; y++) {
          const r = y * cols; let sum = 0;
          for (let x = -R; x <= R; x++) sum += m[r + Math.max(0, Math.min(cols - 1, x))];
          for (let x = 0; x < cols; x++) { o[r + x] = sum / W; sum += m[r + Math.min(cols - 1, x + R + 1)] - m[r + Math.max(0, x - R)]; }
        }
        for (let x = 0; x < cols; x++) {
          let sum = 0;
          for (let y = -R; y <= R; y++) sum += o[Math.max(0, Math.min(rows - 1, y)) * cols + x];
          for (let y = 0; y < rows; y++) { m[y * cols + x] = sum / W; sum += o[Math.min(rows - 1, y + R + 1) * cols + x] - o[Math.max(0, y - R) * cols + x]; }
        }
      }
      for (let k = 0; k < m.length; k++) m[k] = Math.min(1, m[k] * 1.5);   // a full paragraph reaches 1
      this.map = { m, g, cols, rows };
    }

    // is this point close to a constellation that is lit right now?
    near(x, y) {
      for (let i = 0; i < this.boxes.length; i++) {
        if (!this.boxes[i] || !(this.q[i] > 0.05)) continue;
        for (const b of this.boxes[i]) if (Math.abs(x - b.cx) < b.s * 0.7 && Math.abs(y - b.cy) < b.s * 0.7) return true;
      }
      return false;
    }

    // how far chapter i's sky should be woven at this scroll position:
    // it weaves in as its chapter arrives and unweaves just before the next one begins, with no gap and no overlap
    want(i) {
      const vh = this.h, mid = scrollY + vh * 0.5, top = this.tops[i], end = top + this.hs[i];
      const last = i === this.tops.length - 1;
      return clamp((mid - top + vh * 0.1) / (vh * 0.4)) * (last ? 1 : clamp((end - mid - vh * 0.1) / (vh * 0.3)));
    }

    // send one shooting star across the sky
    shoot() {
      if (REDUCED.matches) return;
      const n = this.shots++, fx = 0.18 + 0.64 * ((n * 0.618034) % 1), dir = n % 2 ? -1 : 1, len = Math.min(this.w * 0.42, 560);
      const x0 = this.w * fx, y0 = 96 + this.h * 0.12 * ((n * 0.37) % 1);
      this.met = { t0: performance.now(), x0, y0, dx: dir * len * 0.9, dy: len * 0.44 };
      this.kick();
    }

    kick() { if (!this.running) { this.running = true; requestAnimationFrame(t => this.frame(t)); } }

    frame(now) {
      const dt = this.lastT ? Math.min(64, now - this.lastT) : 16; this.lastT = now; this.now = now;
      const still = REDUCED.matches, ease = tau => still ? 1 : 1 - Math.exp(-dt / tau);
      // each sky follows the scroll closely; the short ease only matters when a menu link jumps chapters
      let moving = false;
      for (let i = 0; i < this.q.length; i++) {
        if (!this.skies[i]) continue;
        const T = still ? (this.want(i) > 0.5 ? 1 : 0) : this.want(i);
        if (this.q[i] === null) this.q[i] = T;
        this.q[i] += (T - this.q[i]) * ease(110);
        if (Math.abs(T - this.q[i]) > 0.001) moving = true; else this.q[i] = T;
      }
      // which chapter's sky is up; a new one arriving sends a shooting star
      let live = -1; for (let i = 0; i < this.q.length; i++) if (this.skies[i] && this.q[i] > 0.5) live = i;
      if (live !== this.live) { if (live >= 0 && this.o.meteor && !still) this.shoot(); this.live = live; }
      if (this.met && now - this.met.t0 > 900) this.met = null;
      // scroll speed, smoothed: a fast scroll draws the lit dots out into floats, which settle back after
      const v = Math.abs(scrollY - this.lastY) / dt; this.lastY = scrollY;
      this.vel += (v - this.vel) * ease(70);
      const want = still || !this.level ? 0 : smooth(0.35, 3, this.vel);
      this.stretch += (want - this.stretch) * ease(want > this.stretch ? 90 : 320);
      const p = this.ptr;
      if (!still) { p.x += (p.tx - p.x) * ease(110); p.y += (p.ty - p.y) * ease(110); p.a += ((p.on ? 1 : 0) - p.a) * ease(220); }

      // draw, and time it: a device that keeps running over budget loses a layer, and never gets it back this visit
      const t0 = performance.now();
      this.draw();
      const cost = performance.now() - t0;
      if (this.fresh) this.fresh--;                        // a frame that had to work out a Milky Way map does not count
      // over budget means too slow to draw, or the whole page running under about 22 frames a second
      else if (cost > this.o.budget || dt > this.o.budget * 5) { if (++this.heavy > 8 && this.level > 0) { this.level--; this.heavy = 0; if (!this.level) this.resize(); } }
      else if (this.heavy > 0) this.heavy -= 0.5;

      const busy = this.met || moving || this.vel > 0.01 || this.stretch > 0.003 || Math.abs((p.on ? 1 : 0) - p.a) > 0.01 || (p.a > 0.01 && Math.hypot(p.tx - p.x, p.ty - p.y) > 0.5);
      if (busy) requestAnimationFrame(t => this.frame(t)); else { this.running = false; this.lastT = 0; }
    }

    draw() {
      const { x: ctx, w, h, dpr } = this, cell = this.o.cell;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (this.inked) ctx.clearRect(0, 0, w, h);
      const oy = -(((scrollY % cell) + cell) % cell);   // keeps the canvas grid on the page's grid as it scrolls
      let lit = !!this.met;
      // everything lit this frame is gathered into three threads and filled once each
      const ink = { shade: new Path2D(), body: new Path2D(), pearl: new Path2D() };
      for (let i = 0; i < this.skies.length; i++) {
        if (!this.skies[i]) continue;
        if (this.q[i] === null) this.q[i] = REDUCED.matches ? (this.want(i) > 0.5 ? 1 : 0) : this.want(i);
        if (this.q[i] > 0.004) {
          // the chapter's constellations follow one another: the first leads, each later one starts a little behind
          const list = this.boxes[i], f = this.o.follow, span = 1 + f * (list.length - 1);
          for (const b of list) { const q = clamp(this.q[i] * span - f * b.k); if (q > 0.004) { this.weave(b, q, i, oy, ink); lit = true; } }
        }
      }
      this.inked = lit;   // with nothing lit (the hero, or between skies) the canvas is left empty and costs nothing
      if (!lit) return;
      if (this.met) this.streak(oy, ink);
      ctx.fillStyle = this.shade; ctx.fill(ink.shade);
      ctx.fillStyle = this.body; ctx.fill(ink.body);
      ctx.fillStyle = this.pearl; ctx.fill(ink.pearl);
    }

    // how thick the page is around this spot (0 bare cloth, 1 the middle of a block of text or a picture)
    cover(x, y) {
      const map = this.map; if (!map) return 0;
      const my = Math.floor((y + scrollY) / map.g);
      return my >= 0 && my < map.rows ? map.m[my * map.cols + Math.floor(x / map.g)] : 0;
    }

    // one halftone dot of tone t. Small dots are drawn as squares of the same area: at that size the eye cannot
    // tell, and a square costs a fraction of a circle.
    dot(path, x, y, t) {
      const r = this.o.cell * 0.62 * Math.pow(t, 0.75);
      if (r < 1.3) { const s = r * 1.772; path.rect(x - s / 2, y - s / 2, s, s); }
      else { path.moveTo(x + r, y); path.arc(x, y, r, 0, 7); }
    }

    // the Milky Way behind one constellation: looked up from the figure's own map, turned and moved with it
    galaxy(b, q, cy, ca, sa, oy) {
      const made = b.sky.milky; let m = made.done;
      if (m === undefined) { m = made.done = made(); this.fresh = 2; }
      if (!m) return;
      const { x: ctx, w, h } = this, cell = this.o.cell, R = REACH, up = smooth(0.05, 0.7, q) * this.dim, half = GRID / 2, per = half / R;
      ctx.fillStyle = this.shade;   // drawn straight away, so it lies under the stars that are filled at the end of the frame
      const i0 = Math.max(0, Math.floor((b.cx - b.s * R) / cell)), i1 = Math.min(Math.ceil(w / cell), Math.ceil((b.cx + b.s * R) / cell));
      const j0 = Math.max(0, Math.floor((cy - b.s * R - oy) / cell)), j1 = Math.min(Math.ceil(h / cell) + 1, Math.ceil((cy + b.s * R - oy) / cell));
      const map = this.map, sy = scrollY, min = 0.035;
      if (!map) return;
      for (let j = j0; j < j1; j++) {
        const y = oy + j * cell + cell / 2, dy = (y - cy) / b.s;
        const my = Math.floor((y + sy) / map.g), row = my >= 0 && my < map.rows ? my * map.cols : -1;
        for (let i = i0; i < i1; i++) {
          const x = i * cell + cell / 2, dx = (x - b.cx) / b.s;
          const gi = Math.floor((dx * ca + dy * sa) * per + half), gj = Math.floor((dy * ca - dx * sa) * per + half);   // undo the constellation's turn
          if (gi < 0 || gj < 0 || gi >= GRID || gj >= GRID) continue;
          let t = m[gj * GRID + gi] * up;
          if (t < min) continue;
          if (row >= 0) { t *= 1 - 0.8 * map.m[row + Math.floor(x / map.g)]; if (t < min) continue; }
          const s = cell * 1.0988 * Math.pow(t, 0.75);   // always small, so always a square
          ctx.fillRect(x - s / 2, y - s / 2, s, s);
        }
      }
    }

    // one constellation in its box b, woven to q (0 nothing, 1 whole)
    weave(b, q, i, oy, ink) {
      const { w, h } = this, o = this.o, cell = o.cell, sky = b.sky, p = this.ptr, st = this.stretch;
      const { shade, body, pearl } = ink;
      // it turns slowly through the chapter about its own middle, and drifts up a little; neighbours turn opposite ways
      const mid = scrollY + h * 0.5, frac = REDUCED.matches ? 0.5 : clamp((mid - this.tops[i]) / this.hs[i]);
      const a = (frac - 0.5) * o.turn * (b.k % 2 ? -1 : 1) * Math.PI / 180, ca = Math.cos(a), sa = Math.sin(a);
      const cy = b.cy - (frac - 0.5) * o.drift * (1 + 0.5 * b.k);
      const n = sky.stars.length, m = sky.lines.length;
      if (o.milkyWay && this.level > 1) this.galaxy(b, q, cy, ca, sa, oy);

      // stars light brightest first over the first half; each grows from a point
      const S = sky.stars.map(s => {
        const k = easeOut(clamp((q - 0.5 * s.rank / n) / 0.3)), sp = s.spread * (0.55 + 0.45 * k) * b.grain;
        return { x: b.cx + (s.x * ca - s.y * sa) * b.s, y: cy + (s.x * sa + s.y * ca) * b.s, peak: s.peak * k * this.dim, inv: 1 / (sp * sp), far: sp * 3 };
      });
      // lines draw one after another over the second part, each from its first star to its second
      const L = [];
      for (let j = 0; j < m; j++) {
        const k = smooth(0, 1, (q - 0.34 - 0.66 * j / m) / (0.66 / m));
        if (k <= 0.001) continue;
        const f = S[sky.lines[j][0]], t = S[sky.lines[j][1]], dx = t.x - f.x, dy = t.y - f.y, len2 = dx * dx + dy * dy || 1;
        L.push({ x0: f.x, y0: f.y, dx, dy, k, len2, len: Math.sqrt(len2) });
      }

      // Tone is laid onto a scratch sheet covering just this figure: each star only touches the cells around it and
      // each line only the cells along it, so the cost follows what is lit, not the size of the box.
      const pad = 40, i0 = Math.max(0, Math.floor((b.cx - b.s * 0.56 - pad) / cell)), i1 = Math.min(Math.ceil(w / cell), Math.ceil((b.cx + b.s * 0.56 + pad) / cell));
      const j0 = Math.max(0, Math.floor((cy - b.s * 0.56 - pad - oy) / cell)), j1 = Math.min(Math.ceil(h / cell) + 1, Math.ceil((cy + b.s * 0.56 + pad - oy) / cell));
      const gw = i1 - i0, gh = j1 - j0;
      if (gw > 0 && gh > 0 && gw * gh <= this.sheet.length) {
        const T = this.sheet.fill(0, 0, gw * gh), thread = o.thread * this.dim, reach = cell * 0.56, lift = p.a > 0.01, half = cell / 2;
        for (let s = 0; s < n; s++) {
          const st1 = S[s]; if (st1.peak < 0.03) continue;
          const a0 = Math.max(0, Math.floor((st1.x - st1.far) / cell) - i0), a1 = Math.min(gw - 1, Math.floor((st1.x + st1.far) / cell) - i0);
          const b0 = Math.max(0, Math.floor((st1.y - st1.far - oy) / cell) - j0), b1 = Math.min(gh - 1, Math.floor((st1.y + st1.far - oy) / cell) - j0);
          for (let gj = b0; gj <= b1; gj++) {
            const sy = oy + (gj + j0) * cell + half - st1.y;
            for (let gi = a0; gi <= a1; gi++) {
              const sx = (gi + i0) * cell + half - st1.x, g = st1.peak * Math.exp(-(sx * sx + sy * sy) * st1.inv);
              if (g > T[gj * gw + gi]) T[gj * gw + gi] = g;
            }
          }
        }
        for (let l = 0; l < L.length; l++) {
          const ln = L[l], steps = Math.ceil(ln.len * ln.k / half);
          for (let e = 0; e <= steps; e++) {
            const u0 = ln.k * e / (steps || 1), gi0 = Math.floor((ln.x0 + ln.dx * u0) / cell) - i0, gj0 = Math.floor((ln.y0 + ln.dy * u0 - oy) / cell) - j0;
            for (let gj = gj0 - 1; gj <= gj0 + 1; gj++) for (let gi = gi0 - 1; gi <= gi0 + 1; gi++) {
              if (gi < 0 || gj < 0 || gi >= gw || gj >= gh || T[gj * gw + gi] >= thread) continue;
              const lx = (gi + i0) * cell + half - ln.x0, ly = oy + (gj + j0) * cell + half - ln.y0, u = (lx * ln.dx + ly * ln.dy) / ln.len2;
              if (u >= 0 && u <= ln.k && Math.abs(lx * ln.dy - ly * ln.dx) < reach * ln.len) T[gj * gw + gi] = thread;
            }
          }
        }
        for (let gj = 0; gj < gh; gj++) {
          const y = oy + (gj + j0) * cell + half;
          for (let gi = 0; gi < gw; gi++) {
            let t = T[gj * gw + gi];
            if (t < 0.03) continue;
            const x = (gi + i0) * cell + half;
            // where the page is thick with text the sky thins out
            const hush = this.cover(x, y);
            if (hush > 0.01) { t *= 1 - o.hush * hush; if (t < 0.03) continue; }
            if (lift) { const d = Math.hypot(x - p.x, y - p.y) / 150; if (d < 1) t *= 1 + 0.6 * p.a * (1 - d) * (1 - d); }
            const path = t >= o.pearlAt ? pearl : t < 0.3 ? shade : body;
            if (t >= o.floatAt) {             // a star's core: woven as weft floats, exactly as the loom does
              path.rect(x - cell * 0.5, y - cell * 0.22, cell, cell * 0.44);
            } else if (st > 0.05) {           // a fast scroll draws the dot out towards a float
              const r = cell * 0.62 * Math.pow(t, 0.75);
              const len = Math.min(cell * 0.86, r * 2 + cell * 1.2 * st * Math.min(1, t * 2.4)), hh = Math.max(0.7, r * 2 * (1 - 0.4 * st));
              path.rect(x - len / 2, y - hh / 2, len, hh);
            } else this.dot(path, x, y, t);
          }
        }
      }

      // the fainter stars around the figure: one small dot each, shared between the cells it falls across
      if (o.stars && this.level > 0 && sky.field.length) {
        const up = smooth(0.25, 0.9, q) * this.dim;
        if (up > 0.1) for (const f of sky.field) {
          const fx = b.cx + (f.x * ca - f.y * sa) * b.s, fy = cy + (f.x * sa + f.y * ca) * b.s;
          if (fx < -cell || fx > w + cell || fy < 84 || fy > h + cell) continue;
          const tone = f.tone * up, ci = Math.floor(fx / cell), cj = Math.floor((fy - oy) / cell);
          for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
            const x = (ci + di) * cell + cell / 2, y = oy + (cj + dj) * cell + cell / 2;
            let t = tone * Math.exp(-((x - fx) * (x - fx) + (y - fy) * (y - fy)) / 13);
            if (t < 0.03) continue;
            t *= 1 - o.hush * this.cover(x, y);
            if (t < 0.03) continue;
            this.dot(t < 0.3 ? shade : body, x, y, t);
          }
        }
      }
    }

    // a shooting star: a bright head with a thread of dots thinning out behind it, gone in under a second
    streak(oy, ink) {
      const { w, h } = this, cell = this.o.cell, m = this.met, pr = clamp((this.now - m.t0) / 900);
      const head = easeOut(pr), tail = Math.max(0, head - 0.42 * Math.sin(Math.PI * Math.min(1, pr * 1.15)));
      const len = Math.hypot(m.dx, m.dy), fade = 1 - smooth(0.7, 1, pr);
      const ax = m.x0 + m.dx * tail, ay = m.y0 + m.dy * tail, bx = m.x0 + m.dx * head, by = m.y0 + m.dy * head;
      const i0 = Math.max(0, Math.floor((Math.min(ax, bx) - 8) / cell)), i1 = Math.min(Math.ceil(w / cell), Math.ceil((Math.max(ax, bx) + 8) / cell));
      const j0 = Math.max(0, Math.floor((Math.min(ay, by) - 8 - oy) / cell)), j1 = Math.min(Math.ceil(h / cell) + 1, Math.ceil((Math.max(ay, by) + 8 - oy) / cell));
      for (let j = j0; j < j1; j++) for (let i = i0; i < i1; i++) {
        const x = i * cell + cell / 2, y = oy + j * cell + cell / 2;
        const u = ((x - m.x0) * m.dx + (y - m.y0) * m.dy) / (len * len);
        if (u < tail || u > head) continue;
        if (Math.abs((x - m.x0) * m.dy - (y - m.y0) * m.dx) / len > cell * 0.6) continue;
        let t = 0.95 * fade * Math.pow((u - tail) / Math.max(0.001, head - tail), 1.7);
        t *= 1 - 0.6 * this.cover(x, y);
        if (t < 0.04) continue;
        const path = t >= this.o.pearlAt ? ink.pearl : ink.body;
        if (t >= this.o.floatAt) path.rect(x - cell * 0.5, y - cell * 0.22, cell, cell * 0.44);
        else this.dot(path, x, y, t);
      }
    }
  }

  // a constellation as a flat picture in a unit box, for anything else that wants to draw one (the menu's preview cards)
  Field.figure = con => { const p = project(con, 0); return { stars: p.stars.map(s => ({ x: s.x, y: s.y, b: (s.peak - 0.4) / 0.6 })), lines: p.lines }; };

  window.Field = Field;
})();
