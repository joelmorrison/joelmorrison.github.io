/* The live network: the hero's woven network replays the real lap the all-rounder drove.
   Each frame runs the recorded sensor readings through the real trained weights (tanh, 11 → 8 → 3),
   so the threads that light up are the connections actually carrying signal at that moment.
   Everything is drawn in the loom's own vocabulary: weft floats and halftone dots on the 6px weave grid.
   Hover a neuron (fine pointers) to follow its connections and read its value.
   Reduced motion gets one still frame, read from the same lap. Hand-written, no dependencies. */
(function () {
  'use strict';

  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)');
  const FINE = matchMedia('(hover: hover) and (pointer: fine)');
  const css = name => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

  class LiveNet {
    constructor(stage, net, opts) {
      this.stage = stage;
      this.net = net;
      this.o = Object.assign({ cell: 6, layout: null, labels: null, clock: null, isReady: () => true }, opts);
      this.c = document.createElement('canvas');
      this.c.className = 'live';
      this.c.setAttribute('aria-hidden', 'true');
      stage.insertBefore(this.c, stage.querySelector('.labels'));
      this.x = this.c.getContext('2d');
      this.tip = document.createElement('p');
      this.tip.className = 'live-tip';
      this.tip.setAttribute('aria-hidden', 'true');
      stage.appendChild(this.tip);

      const lap = net.lap;
      this.frames = lap.frames; this.hz = lap.hz; this.n = lap.frames.length;
      this.box = null; this.pts = null;
      this.t0 = performance.now(); this.paused = 0;
      this.hover = null; this.visible = true; this.running = false;
      this.lastLabel = 0;
      // eased state: the hovered neuron (kept while it fades out), its fade, smoothed activations,
      // how present each connection's travelling signal is, and where along each thread it has got to
      this.hv = null; this.hT = 0; this.hoverAt = 0; this.lastNow = 0;
      this.smA = null; this.vis = null; this.ph = null;

      new IntersectionObserver(([e]) => { this.visible = e.isIntersecting; this.kick(); }, { threshold: 0.05 }).observe(stage);
      document.addEventListener('visibilitychange', () => this.kick());
      new ResizeObserver(() => this.size()).observe(stage);
      stage.addEventListener('pointermove', e => this.onMove(e));
      stage.addEventListener('pointerleave', () => this.setHover(null));
      // press and hold on the cloth raises the loom's linen tester; the live layer steps aside for it
      const weave = stage.querySelector('.weave'), release = () => { clearTimeout(this.holdT); stage.classList.remove('is-looking'); };
      weave.addEventListener('pointerdown', e => { if (!FINE.matches || e.button !== 0) return; clearTimeout(this.holdT); this.holdT = setTimeout(() => stage.classList.add('is-looking'), 160); });
      ['pointerup', 'pointercancel', 'pointerleave'].forEach(t => weave.addEventListener(t, release));
    }

    /* the hero calls this whenever it lays the network out */
    layout(box, pts) { this.box = box; this.pts = pts; this.size(); this.kick(); }

    size() {
      const w = this.stage.clientWidth, h = this.stage.clientHeight, dpr = Math.min(window.devicePixelRatio || 1, 2);
      if (!w || !h) return;
      this.w = w; this.h = h; this.dpr = dpr;
      this.c.width = Math.round(w * dpr); this.c.height = Math.round(h * dpr);
      this.col = { pearl: css('--pearl'), thread: css('--thread'), thread2: css('--thread-2'), ground: css('--ground'), ground2: css('--ground-2') };
      this.draw(performance.now());
    }

    get animated() { return !REDUCED.matches; }

    /* the weave has finished: draw now (reduced motion has no loop to pick it up) */
    redraw() { this.draw(this.animated ? performance.now() : 0); this.kick(); }

    kick() {
      if (this.running || !this.visible || document.hidden || !this.animated) { if (!this.animated) this.draw(0); return; }
      this.running = true;
      requestAnimationFrame(t => this.loop(t));
    }

    loop(now) {
      if (!this.visible || document.hidden) { this.running = false; return; }
      this.draw(now);
      requestAnimationFrame(t => this.loop(t));
    }

    /* recorded inputs at time t, eased between the 15 Hz samples */
    inputsAt(now) {
      const still = !this.animated;
      const f = still ? 214 : ((now - this.t0) / 1000) * this.hz;   // still frame: mid-hairpin
      const i = Math.floor(f) % this.n, j = (i + 1) % this.n, k = f - Math.floor(f);
      const a = this.frames[i], b = this.frames[j];
      return { x: a.slice(0, 11).map((v, m) => v + (b[m] - v) * k), seconds: (f / this.hz) % (this.n / this.hz) };
    }

    forward(x) {
      const { hidden_weights: W1, hidden_biases: b1, output_weights: W2, output_biases: b2 } = this.net;
      const h = W1.map((row, r) => Math.tanh(row.reduce((s, w, i) => s + w * x[i], b1 ? b1[r] : 0)));
      const o = W2.map((row, r) => Math.tanh(row.reduce((s, w, i) => s + w * h[i], b2 ? b2[r] : 0)));
      return { h, o };
    }

    draw(now) {
      if (!this.pts || !this.w || !this.o.isReady()) return;
      const { x: ctx, w, h, dpr, col, pts } = this, cell = this.o.cell;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      // frame-rate independent easing; reduced motion snaps straight to the target
      const dt = this.animated && this.lastNow ? Math.min(64, now - this.lastNow) : 16;
      this.lastNow = this.animated ? now : 0;
      const ease = tau => this.animated ? 1 - Math.exp(-dt / tau) : 1;

      const { x: inp, seconds } = this.inputsAt(now);
      const { h: hid, o: out } = this.forward(inp);
      // what you see is smoothed a little, so neurons swell and settle instead of flickering
      const raw = [inp, hid, out];
      if (!this.smA) this.smA = raw.map(l => l.slice());
      const acts = raw.map((l, li) => l.map((v, m) => (this.smA[li][m] += (v - this.smA[li][m]) * ease(70))));
      const W1 = this.net.hidden_weights, W2 = this.net.output_weights;

      // every connection's signal this instant: its weight times what its source neuron is sending
      const edges = [];
      W1.forEach((row, r) => row.forEach((wgt, i) => edges.push({ a: pts[0][i], b: pts[1][r], s: wgt * acts[0][i], la: 0, ia: i, lb: 1, ib: r })));
      W2.forEach((row, r) => row.forEach((wgt, i) => edges.push({ a: pts[1][i], b: pts[2][r], s: wgt * acts[1][i], la: 1, ia: i, lb: 2, ib: r })));
      const max = Math.max(...edges.map(e => Math.abs(e.s))) || 1;
      if (!this.vis) { this.vis = new Float32Array(edges.length); this.ph = new Float32Array(edges.length).map((_, n) => (n * 0.618) % 1); }
      // the 26 strongest carry visible signal; the set changes gently, never with a pop
      const top = new Set(edges.map((e, n) => n).sort((p, q) => Math.abs(edges[q].s) - Math.abs(edges[p].s)).slice(0, 26));
      edges.forEach((e, n) => {
        this.vis[n] += ((top.has(n) ? 1 : 0) - this.vis[n]) * ease(260);
        const v = Math.abs(e.s) / max, len = Math.hypot(e.b.x - e.a.x, e.b.y - e.a.y);
        this.ph[n] = this.animated ? (this.ph[n] + (dt / 1000) * (50 + 70 * v) / len) % 1 : 0.35;   // stronger signal, faster thread
      });

      // hover fades in and out; the neuron stays in view while it fades
      this.hT += ((this.hover ? 1 : 0) - this.hT) * ease(this.hover ? 110 : 150);
      if (!this.hover && this.hT < 0.004) { this.hT = 0; this.hv = null; }
      const hv = this.hv, hT = this.hT;
      const touches = e => hv && ((e.la === hv.l && e.ia === hv.k) || (e.lb === hv.l && e.ib === hv.k));

      if (hT > 0) {   // the rest of the cloth sinks back so one neuron's threads can be followed
        ctx.fillStyle = col.ground; ctx.globalAlpha = 0.62 * hT;
        ctx.fillRect(0, 0, w, h); ctx.globalAlpha = 1;
      }

      const comets = (e, n, alpha) => {
        const v = Math.abs(e.s) / max, len = Math.hypot(e.b.x - e.a.x, e.b.y - e.a.y), d = (cell * 1.15) / len;
        for (let p = 0; p < 2; p++) {
          const u = (this.ph[n] + p * 0.5) % 1;
          // a short comet of floats: bright head, two fading cells behind it
          [1, 0.5, 0.22].forEach((fade, q) => {
            const uu = u - q * d; if (uu < 0) return;
            this.float(e.a.x + (e.b.x - e.a.x) * uu, e.a.y + (e.b.y - e.a.y) * uu, (0.45 + 0.55 * v) * fade * alpha, e.s >= 0 ? col.pearl : col.thread);
          });
        }
      };
      edges.forEach((e, n) => {
        const a = this.vis[n] * (1 - 0.85 * hT) * (touches(e) ? 0 : 1);
        if (a > 0.02) comets(e, n, a);
      });
      if (hv && hT > 0) {
        // the hovered neuron's threads draw outwards from it, then carry their signal
        const reach = this.animated ? 1 - Math.pow(1 - Math.min(1, (now - this.hoverAt) / 460), 3) : 1;
        edges.forEach((e, n) => {
          if (!touches(e)) return;
          const v = Math.abs(e.s) / max, from = e.la === hv.l && e.ia === hv.k ? e.a : e.b, to = from === e.a ? e.b : e.a;
          this.thread(from, to, Math.max(0.25, v) * hT, e.s >= 0 ? col.pearl : col.thread2, reach);
          if (reach > 0.98) comets(e, n, hT);
        });
      }

      // each neuron fills with halftone in proportion to how strongly it is firing
      const r = window.LoomPictures.nodeRadius(this.box, cell);
      acts.forEach((layer, l) => layer.forEach((a, k) => {
        const p = pts[l][k], other = hv && !(hv.l === l && hv.k === k) && !this.linked(hv, l, k);
        this.node(p.x, p.y, r, Math.abs(a), a >= 0 ? col.pearl : col.thread2, other ? 1 - 0.75 * hT : 1);
      }));
      // a ring of dots marks the neuron being followed, settling in as it fades up
      if (hv && hT > 0.01) {
        const p = pts[hv.l][hv.k], R = r + cell * 1.4 + (1 - hT) * 10, turn = this.animated ? now * 0.00035 : 0;
        ctx.fillStyle = col.pearl; ctx.globalAlpha = 0.85 * hT; ctx.beginPath();
        for (let q = 0; q < 20; q++) {
          const ang = turn + q * Math.PI / 10, cx = p.x + Math.cos(ang) * R, cy = p.y + Math.sin(ang) * R;
          ctx.moveTo(cx + 1.3, cy); ctx.arc(cx, cy, 1.3, 0, 7);
        }
        ctx.fill(); ctx.globalAlpha = 1;
      }

      // output labels read the live decision
      if (this.o.labels && (now - this.lastLabel > 120 || !this.animated)) {
        this.lastLabel = now;
        const [steer, acc, brake] = out;
        const text = [
          `steering ${Math.abs(steer) < 0.05 ? 'straight' : (steer > 0 ? '← ' : '→ ') + Math.abs(steer).toFixed(2)}`,   // ← is the car's left
          `accelerator ${acc > 0 ? 'on' : 'off'}`,
          `brake ${brake > 0 ? 'on' : 'off'}`,
        ];
        this.o.labels.forEach((el, k) => { if (el && el.textContent !== text[k]) el.textContent = text[k]; });
      }
      if (this.o.clock && this.animated) this.o.clock.textContent = `${seconds.toFixed(1)} s of ${(this.n / this.hz).toFixed(1)} s`;
      if (hv) this.showTip(hv, acts);
    }

    linked(hv, l, k) {
      if (Math.abs(hv.l - l) !== 1) return false;
      return true;   // every neuron in a neighbouring layer is connected (fully connected network)
    }

    // a weft float: the loom's woven mark, snapped to the weave grid
    float(px, py, alpha, color) {
      const cell = this.o.cell, ctx = this.x;
      const cx = Math.floor(px / cell) * cell + cell / 2, cy = Math.floor(py / cell) * cell + cell / 2;
      ctx.globalAlpha = alpha; ctx.fillStyle = color;
      ctx.fillRect(cx - cell * 0.5, cy - cell * 0.22, cell, cell * 0.44);
      ctx.globalAlpha = 1;
    }

    // a whole thread drawn as floats, for the hovered neuron's connections
    thread(a, b, alpha, color, reach = 1) {
      const cell = this.o.cell, steps = Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / cell);
      let last = '';
      for (let s = 0; s <= steps * reach; s++) {
        const px = a.x + (b.x - a.x) * s / steps, py = a.y + (b.y - a.y) * s / steps;
        const key = Math.floor(px / cell) + ',' + Math.floor(py / cell);
        if (key === last) continue; last = key;
        this.float(px, py, alpha * 0.55, color);
      }
    }

    // halftone fill inside a neuron: dot size follows activation
    node(px, py, r, a, color, alpha) {
      const cell = this.o.cell, ctx = this.x, reach = r + cell;
      ctx.fillStyle = color; ctx.globalAlpha = alpha;
      ctx.beginPath();
      for (let gy = Math.floor((py - reach) / cell); gy <= Math.floor((py + reach) / cell); gy++) {
        for (let gx = Math.floor((px - reach) / cell); gx <= Math.floor((px + reach) / cell); gx++) {
          const cx = gx * cell + cell / 2, cy = gy * cell + cell / 2;
          if (Math.hypot(cx - px, cy - py) > r) continue;
          const d = cell * 0.5 * Math.pow(Math.min(1, a), 0.8);
          if (d < 0.3) continue;
          ctx.moveTo(cx + d, cy); ctx.arc(cx, cy, d, 0, 7);
        }
      }
      ctx.fill(); ctx.globalAlpha = 1;
    }

    onMove(e) {
      if (!FINE.matches || !this.pts) return;
      const rect = this.stage.getBoundingClientRect(), mx = e.clientX - rect.left, my = e.clientY - rect.top;
      let best = null, bestD = 22;
      this.pts.forEach((layer, l) => layer.forEach((p, k) => {
        const d = Math.hypot(p.x - mx, p.y - my);
        if (d < bestD) { bestD = d; best = { l, k }; }
      }));
      this.setHover(best);
    }

    setHover(hv) {
      const same = (a, b) => a && b && a.l === b.l && a.k === b.k;
      if (same(hv, this.hover) || (!hv && !this.hover)) return;
      if (hv && !same(hv, this.hv)) { this.hv = hv; this.hoverAt = performance.now(); }
      this.hover = hv;
      this.stage.classList.toggle('is-inspecting', !!hv);
      this.tip.classList.toggle('on', !!hv);   // the tip fades; the neuron's threads fade with it
      if (!this.animated) this.draw(0);
    }

    showTip(hv, acts) {
      const p = this.pts[hv.l][hv.k], a = acts[hv.l][hv.k];
      let name, value;
      if (hv.l === 0) {
        name = this.net.inputs ? this.net.inputs[hv.k] : `Input ${hv.k + 1}`;
        value = hv.k < 7 ? `${Math.round(a * 100)}% of its range clear` : a.toFixed(2);
      } else if (hv.l === 1) {
        name = `Hidden neuron ${hv.k + 1} of 8`;
        value = a.toFixed(2);
      } else {
        name = this.net.outputs[hv.k].replace(/^./, c => c.toUpperCase());
        value = hv.k === 0 ? (Math.abs(a) < 0.05 ? 'straight' : `${a > 0 ? 'left' : 'right'} ${Math.abs(a).toFixed(2)}`) : `${a > 0 ? 'on' : 'off'} (${a.toFixed(2)})`;
      }
      const html = `<span>${name}</span><b>${value}</b>`;
      if (this.tip.innerHTML !== html) this.tip.innerHTML = html;
      const left = hv.l === 2;   // outputs: the tip sits to the left so it never covers the labels
      this.tip.style.left = `${Math.round(p.x + (left ? -18 : 18))}px`;
      this.tip.style.top = `${Math.round(p.y)}px`;
      this.tip.classList.toggle('to-left', left);
    }
  }

  window.LiveNet = LiveNet;
})();
