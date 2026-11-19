/* The cursor's companion. Mouse only; the system pointer always stays, the star keeps it company.
   - A woven star: four points of dots and dashes on a 3px grid that sits on the page's 6px grid, following the pointer
     on a spring and leaning the way it moves. Over a link or button it turns pearl and grows; over the menu's
     card stock it turns dark, as the click sparks do. It steps aside while the linen tester is up.
   - In the hero, a lantern: every star to magnitude 6 in the real winter sky around Orion (winter-sky.js) lies hidden
     under the network, and the ones near the pointer come up. They are fixed to the page, drawn on a canvas that
     scrolls with the hero, so scrolling slides the sky under the lantern instead of redrawing it.
   - Past the hero, the star carries a soft light behind the page's content. This glow is the one exception to the
     Thread Light Rule (DESIGN.md): the lantern and the glow cross over at the bottom of the hero.
   Reduced motion: the star sits beside the pointer with no spring or lean. Hand-written, no dependencies. */
(function () {
  'use strict';

  const FINE = matchMedia('(hover: hover) and (pointer: fine)');
  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)');
  const css = name => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const clamp = v => Math.max(0, Math.min(1, v));
  const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
  const HOT = 'a, button, summary, label, [role="button"]';
  const OFFSET = [14, 18];   // the star sits just below and right of the pointer's tip, never under it
  const STAR = 72;           // px: the star's own small canvas

  // the loom's rule: floats above .62, dots below, sized by tone (small dots as squares of the same area)
  function mark(path, x, y, t, cell) {
    if (t >= 0.62) { path.rect(x - cell * 0.5, y - cell * 0.22, cell, cell * 0.44); return; }
    const r = cell * 0.62 * Math.pow(t, 0.75);
    if (r < 1.1) { const q = r * 1.772; path.rect(x - q / 2, y - q / 2, q, q); } else { path.moveTo(x + r, y); path.arc(x, y, r, 0, 7); }
  }

  class Cursor {
    // hero: the hero's stage; sky: [ra hours, dec degrees, magnitude] for the lantern
    constructor({ hero, sky }) {
      if (!FINE.matches) return;
      this.hero = hero;
      this.col = { thread: css('--thread'), thread2: css('--thread-2'), pearl: css('--pearl'), ground: css('--ground') };
      this.dpr = Math.min(window.devicePixelRatio || 1, 2);

      // the star: a small canvas moved with the pointer, above everything but the skip link
      this.sc = document.createElement('canvas');
      this.sc.className = 'cursor-star'; this.sc.setAttribute('aria-hidden', 'true');
      this.sc.width = this.sc.height = Math.round(STAR * this.dpr);
      document.body.appendChild(this.sc);
      this.sx = this.sc.getContext('2d');
      // the glow: one soft gradient moved with the pointer, behind the page's content, in front of the night sky
      this.glow = document.createElement('div');
      this.glow.className = 'cursor-glow'; this.glow.setAttribute('aria-hidden', 'true');
      const field = document.querySelector('.field');
      if (field) field.after(this.glow); else document.body.prepend(this.glow);
      // the lantern: a canvas over the hero, under the network
      this.lc = document.createElement('canvas');
      this.lc.className = 'lantern'; this.lc.setAttribute('aria-hidden', 'true');
      hero.insertBefore(this.lc, hero.querySelector('.weave'));
      this.lx = this.lc.getContext('2d');
      this.sky = this.project(sky || []);

      this.p = { x: -999, y: -999, on: false, hot: false, card: false };
      this.star = { x: -999, y: -999, vx: 0, vy: 0, s: 1, a: 0, lean: 0 };
      this.lamp = { x: 0, y: 0, a: 0 };
      this.heroAmt = 1; this.dirty = null; this.running = false; this.last = 0;

      addEventListener('pointermove', e => {
        if (e.pointerType !== 'mouse') return;
        const p = this.p, first = !p.on;
        p.x = e.clientX; p.y = e.clientY; p.on = true;
        if (first && this.star.a < 0.01) Object.assign(this.star, { x: p.x + OFFSET[0], y: p.y + OFFSET[1], vx: 0, vy: 0 });
        this.kick();
      }, { passive: true });
      addEventListener('pointerover', e => {
        const t = e.target.closest ? e.target : null;
        this.p.hot = !!(t && t.closest(HOT)); this.p.card = !!(t && t.closest('.sm-panel, .sm-preview'));
        this.kick();
      }, { passive: true });
      document.documentElement.addEventListener('pointerleave', () => { this.p.on = false; this.kick(); });
      addEventListener('scroll', () => this.kick(), { passive: true });
      new ResizeObserver(() => this.size()).observe(hero);
      this.size();
    }

    // the lantern's sky, as it sits overhead (gnomonic, north up, east to the left), in units of the hero's width
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
      this.lc.width = Math.round(w * this.dpr); this.lc.height = Math.round(h * this.dpr);
      const k = Math.max(w, h * 1.4) / 1.6;   // the patch spans a little more than the hero
      this.sky.forEach(s => { s.x = w / 2 + s.X * k; s.y = h * 0.45 + s.Y * k; });
      this.dirty = null;
      this.kick();
    }

    kick() { if (!this.running) { this.running = true; requestAnimationFrame(t => this.frame(t)); } }

    frame(now) {
      const dt = this.last ? Math.min(40, now - this.last) : 16; this.last = now;
      const still = REDUCED.matches, ease = tau => (still ? 1 : 1 - Math.exp(-dt / tau));
      const p = this.p, s = this.star, L = this.lamp, box = this.hero.getBoundingClientRect();
      const looking = this.hero.classList.contains('is-looking');

      // how far into the hero the pointer is: 1 well inside it, 0 once it is below it (the lantern and glow cross over)
      this.heroAmt = p.on ? smooth(-40, 80, box.bottom - p.y) : this.heroAmt;

      // the star's spring: it catches up, overshoots a touch and settles
      const tx = p.x + OFFSET[0], ty = p.y + OFFSET[1];
      if (still) { s.x = tx; s.y = ty; s.vx = s.vy = 0; }
      else {
        const k = 300, c = 2 * Math.sqrt(k) * 0.78, h = dt / 1000;
        s.vx += (k * (tx - s.x) - c * s.vx) * h; s.vy += (k * (ty - s.y) - c * s.vy) * h;
        s.x += s.vx * h; s.y += s.vy * h;
      }
      const want = p.on && !looking ? 1 : 0;
      s.a += (want - s.a) * ease(120);
      s.s += ((p.hot ? 1.35 : 1) - s.s) * ease(90);
      s.lean += ((still ? 0 : Math.max(-0.35, Math.min(0.35, s.vx * 0.0016))) - s.lean) * ease(110);
      this.drawStar();

      // the glow, past the hero
      const g = s.a * (1 - this.heroAmt);
      this.glow.style.opacity = g.toFixed(3);
      if (g > 0.001) this.glow.style.transform = `translate3d(${(s.x - 180).toFixed(1)}px, ${(s.y - 180).toFixed(1)}px, 0)`;

      // the lantern, in the hero: its centre is worked out in the hero's own coordinates each frame
      const lx = p.x - box.left, ly = p.y - box.top;
      if (L.a < 0.01) { L.x = lx; L.y = ly; } else { L.x += (lx - L.x) * ease(60); L.y += (ly - L.y) * ease(60); }
      const lampWant = p.on && !looking ? this.heroAmt : 0;
      L.a += (lampWant - L.a) * ease(260);
      const lampMoving = Math.hypot(lx - L.x, ly - L.y) > 0.5;
      if (L.a > 0.01 || this.dirty) this.drawLantern();

      const springing = Math.abs(s.vx) + Math.abs(s.vy) > 2 || Math.hypot(tx - s.x, ty - s.y) > 0.4;
      const busy = (s.a > 0.01 && springing) || Math.abs(want - s.a) > 0.01 || Math.abs((p.hot ? 1.35 : 1) - s.s) > 0.01
        || Math.abs(s.lean) > 0.004 || lampMoving || Math.abs(lampWant - L.a) > 0.01;
      if (busy) requestAnimationFrame(t => this.frame(t)); else { this.running = false; this.last = 0; }
    }

    drawStar() {
      const s = this.star, cv = this.sc, x = this.sx, dpr = this.dpr, cell = 3;
      if (s.a < 0.01) { cv.style.opacity = '0'; return; }
      // the canvas sits on the page's grid, so the star's dots line up with the cloth behind it
      const left = Math.round((s.x - STAR / 2) / cell) * cell, top = Math.round((s.y + scrollY - STAR / 2) / cell) * cell - scrollY;
      cv.style.opacity = s.a.toFixed(3);
      cv.style.transform = `translate3d(${left}px, ${top}px, 0)`;
      x.setTransform(dpr, 0, 0, dpr, 0, 0); x.clearRect(0, 0, STAR, STAR);
      const cx = s.x - left, cy = s.y - top, L = 22 * s.s, W = 4.8 * s.s, ca = Math.cos(s.lean), sa = Math.sin(s.lean);
      const body = new Path2D(), core = new Path2D();
      for (let y = cell / 2; y < STAR; y += cell) for (let xx = cell / 2; xx < STAR; xx += cell) {
        const dx0 = xx - cx, dy0 = y - cy, dx = dx0 * ca + dy0 * sa, dy = dy0 * ca - dx0 * sa, ax = Math.abs(dx), ay = Math.abs(dy);
        let t = Math.max(1 - (ax / L + ay / W), 1 - (ax / W + ay / L)) * 1.25;
        t = Math.max(t, 0.55 * Math.exp(-(dx * dx + dy * dy) / (24 * s.s * s.s)));   // a little body where the arms cross
        if (t <= 0.04) continue;
        mark(t >= 0.62 || this.p.hot ? core : body, xx, y, Math.min(1, t), cell);
      }
      const dark = this.p.card;   // on the menu's light card stock the star turns dark, as the click sparks do
      x.fillStyle = dark ? this.col.ground : this.p.hot ? this.col.pearl : this.col.thread; x.fill(body);
      x.fillStyle = dark ? this.col.ground : this.col.pearl; x.fill(core);
    }

    drawLantern() {
      const x = this.lx, dpr = this.dpr, L = this.lamp, cell = 6, R = 240;
      x.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (this.dirty) { const d = this.dirty; x.clearRect(d[0], d[1], d[2], d[3]); }
      else x.clearRect(0, 0, this.w, this.h);
      this.dirty = null;
      if (L.a < 0.01) return;
      const shade = new Path2D(), body = new Path2D(), pearl = new Path2D();
      for (const st of this.sky) {
        const d = Math.hypot(st.x - L.x, st.y - L.y) / R;
        if (d >= 1) continue;
        const tone = st.tone * Math.pow(1 - d, 1.1) * 3.2 * L.a;
        if (tone < 0.04) continue;
        // each star shares its light between the cells around it, on the hero's 6px grid
        const ci = Math.floor(st.x / cell) * cell + cell / 2, cj = Math.floor(st.y / cell) * cell + cell / 2;
        for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
          const cx = ci + di * cell, cy = cj + dj * cell, t = Math.min(1, tone * Math.exp(-((cx - st.x) ** 2 + (cy - st.y) ** 2) / 16));
          if (t < 0.04) continue;
          mark(t >= 0.86 ? pearl : t < 0.3 ? shade : body, cx, cy, t, cell);
        }
      }
      x.fillStyle = this.col.thread2; x.fill(shade);
      x.fillStyle = this.col.thread; x.fill(body);
      x.fillStyle = this.col.pearl; x.fill(pearl);
      this.dirty = [L.x - R - cell * 2, L.y - R - cell * 2, (R + cell * 2) * 2, (R + cell * 2) * 2];   // only this square needs clearing next time
    }
  }

  window.Cursor = Cursor;
})();
