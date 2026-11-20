/* The lantern, in the hero. Mouse only.
   Every star to magnitude 6 in the real winter sky around Orion (winter-sky.js) lies hidden under the network, and
   the ones near the pointer come up, woven by the loom's rule on the hero's grid. They are fixed to the page, drawn on
   a canvas that scrolls with the hero, so scrolling slides the sky under the lantern instead of redrawing it.
   It fades out as the pointer leaves the hero. Reduced motion: it follows the pointer directly, with no easing.
   Hand-written, no dependencies. */
(function () {
  'use strict';

  const FINE = matchMedia('(hover: hover) and (pointer: fine)');
  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)');
  const css = name => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const clamp = v => Math.max(0, Math.min(1, v));
  const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
  const R = 280, CELL = 6;   // its reach, and the hero's weave cell

  // the loom's rule: floats above .62, dots below, sized by tone (small dots as squares of the same area)
  function mark(path, x, y, t, cell) {
    if (t >= 0.62) { path.rect(x - cell * 0.5, y - cell * 0.22, cell, cell * 0.44); return; }
    const r = cell * 0.62 * Math.pow(t, 0.75);
    if (r < 1.1) { const q = r * 1.772; path.rect(x - q / 2, y - q / 2, q, q); } else { path.moveTo(x + r, y); path.arc(x, y, r, 0, 7); }
  }

  class Lantern {
    // hero: the hero's stage; sky: [ra hours, dec degrees, magnitude]
    constructor({ hero, sky }) {
      if (!FINE.matches) return;
      this.hero = hero;
      this.col = { thread: css('--thread'), thread2: css('--thread-2'), pearl: css('--pearl') };
      this.dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.c = document.createElement('canvas');
      this.c.className = 'lantern'; this.c.setAttribute('aria-hidden', 'true');
      hero.insertBefore(this.c, hero.querySelector('.weave'));   // under the network
      this.x = this.c.getContext('2d');
      this.sky = this.project(sky || []);
      this.p = { x: 0, y: 0, on: false };
      this.lamp = { x: 0, y: 0, a: 0 };
      this.dirty = null; this.running = false; this.last = 0;

      addEventListener('pointermove', e => {
        if (e.pointerType !== 'mouse') return;
        this.p.x = e.clientX; this.p.y = e.clientY; this.p.on = true; this.kick();
      }, { passive: true });
      document.documentElement.addEventListener('pointerleave', () => { this.p.on = false; this.kick(); });
      addEventListener('scroll', () => this.kick(), { passive: true });
      new ResizeObserver(() => this.size()).observe(hero);
      this.size();
    }

    // the sky as it sits overhead (gnomonic, north up, east to the left), in units of the hero's width
    project(list) {
      const rad = Math.PI / 180, vec = (ra, de) => [Math.cos(de * rad) * Math.cos(ra * 15 * rad), Math.cos(de * rad) * Math.sin(ra * 15 * rad), Math.sin(de * rad)];
      const c = vec(5.6, 18), e0 = [-c[1], c[0], 0], el = Math.hypot(e0[0], e0[1]), e = e0.map(q => q / el);
      const n = [c[1] * e[2] - c[2] * e[1], c[2] * e[0] - c[0] * e[2], c[0] * e[1] - c[1] * e[0]], dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
      return list.map(([ra, de, mag]) => {
        const p = vec(ra, de), d = dot(p, c);
        return { X: -dot(p, e) / d, Y: -dot(p, n) / d, tone: 0.24 + 0.7 * clamp((6 - mag) / 6.5), x: 0, y: 0 };
      });
    }

    size() {
      const w = this.hero.clientWidth, h = this.hero.clientHeight;
      if (!w || !h) return;
      this.w = w; this.h = h;
      this.c.width = Math.round(w * this.dpr); this.c.height = Math.round(h * this.dpr);
      const k = Math.max(w, h * 1.4) / 1.6;   // the patch spans a little more than the hero
      this.sky.forEach(s => { s.x = w / 2 + s.X * k; s.y = h * 0.45 + s.Y * k; });
      this.dirty = null;
      this.kick();
    }

    kick() { if (!this.running) { this.running = true; requestAnimationFrame(t => this.frame(t)); } }

    frame(now) {
      const dt = this.last ? Math.min(40, now - this.last) : 16; this.last = now;
      const ease = tau => (REDUCED.matches ? 1 : 1 - Math.exp(-dt / tau));
      const p = this.p, L = this.lamp, box = this.hero.getBoundingClientRect();
      // its centre is worked out in the hero's own coordinates each frame, so it stays under the pointer as the page scrolls
      const lx = p.x - box.left, ly = p.y - box.top;
      if (L.a < 0.01) { L.x = lx; L.y = ly; } else { L.x += (lx - L.x) * ease(60); L.y += (ly - L.y) * ease(60); }
      // full strength anywhere in the hero, gone over the first 60px below it, and away while the linen tester is up
      const want = p.on && !this.hero.classList.contains('is-looking') ? smooth(-60, 0, box.bottom - p.y) : 0;
      L.a += (want - L.a) * ease(260);
      if (L.a > 0.01 || this.dirty) this.draw();
      const busy = Math.hypot(lx - L.x, ly - L.y) > 0.5 || Math.abs(want - L.a) > 0.01;
      if (busy) requestAnimationFrame(t => this.frame(t)); else { this.running = false; this.last = 0; }
    }

    draw() {
      const x = this.x, L = this.lamp;
      x.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      if (this.dirty) { const d = this.dirty; x.clearRect(d[0], d[1], d[2], d[3]); } else x.clearRect(0, 0, this.w, this.h);
      this.dirty = null;
      if (L.a < 0.01) return;
      const shade = new Path2D(), body = new Path2D(), pearl = new Path2D();
      for (const st of this.sky) {
        const d = Math.hypot(st.x - L.x, st.y - L.y) / R;
        if (d >= 1) continue;
        const tone = st.tone * Math.pow(1 - d, 0.9) * 4.4 * L.a;
        if (tone < 0.04) continue;
        // each star shares its light between the cells around it, on the hero's grid
        const ci = Math.floor(st.x / CELL) * CELL + CELL / 2, cj = Math.floor(st.y / CELL) * CELL + CELL / 2;
        for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
          const cx = ci + di * CELL, cy = cj + dj * CELL, t = Math.min(1, tone * Math.exp(-((cx - st.x) ** 2 + (cy - st.y) ** 2) / 16));
          if (t < 0.04) continue;
          mark(t >= 0.5 ? pearl : t < 0.2 ? shade : body, cx, cy, t, CELL);   // stars read white; only the faintest stay violet
        }
      }
      x.fillStyle = this.col.thread2; x.fill(shade);
      x.fillStyle = this.col.thread; x.fill(body);
      x.fillStyle = this.col.pearl; x.fill(pearl);
      this.dirty = [L.x - R - CELL * 2, L.y - R - CELL * 2, (R + CELL * 2) * 2, (R + CELL * 2) * 2];   // only this square needs clearing next time
    }
  }

  window.Lantern = Lantern;
})();
