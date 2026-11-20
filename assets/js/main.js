(function () {
  'use strict';
  const { networkLayout, nodeRadius, drawNetwork, drawTrack, drawSilk, drawRings, drawEnvelope, SILK } = window.LoomPictures;
  const NET = window.ALL_ROUNDER;
  const root = document.documentElement;
  const cssVar = n => getComputedStyle(root).getPropertyValue(n).trim();
  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const FINE = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const EASE = 'cubic-bezier(.22, 1, .36, 1)';
  const clamp01 = v => Math.max(0, Math.min(1, v));

  // transitions stay off until the page has painted once, so nothing animates into its resting place on load
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('ready')));

  /* ---------- chapter 00: the all-rounder's network, centred, with the name along the bottom ---------- */
  const weave = document.getElementById('weave');
  const labels = document.getElementById('labels');
  let heroBox = null;
  let liveNet = null;   // the live layer: replays the all-rounder's real lap through its real weights
  let shade = null;     // the hero's live shading (hero-shade.js); without it the still shading is woven into the cloth
  // Phones weave the hero on a 3px grid instead of 6px. A phone is only about 50 six-pixel cells wide, too few to
  // tell 112 connections apart; at 3px it gets the same picture as a wide screen, in miniature. 3 divides 6, so the
  // hero's cloth still sits on the page's grid.
  const PHONE = matchMedia('(max-width: 859px)');
  const heroCell = () => (PHONE.matches ? 3 : 6);

  function heroPicture(x, w, h) {
    const narrow = PHONE.matches, cell = heroCell();
    if (!shade || !shade.ok) drawSilk(x, w, h, narrow ? 0.45 : 0.6);
    // keep the cloth quiet behind the name and caption
    x.globalCompositeOperation = 'destination-out';
    const g = x.createLinearGradient(0, h, 0, h * (narrow ? 0.3 : 0.6));
    g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(0.5, 'rgba(0,0,0,.85)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g; x.fillRect(0, 0, w, h);
    x.globalCompositeOperation = 'source-over';
    // the output labels need room for their longest live reading, "steering straight"
    const LABEL = 186;
    if (narrow) {
      // phones: the same left-to-right network, as tall as the first screen allows while still leaving room for the
      // name and the line under it at the bottom. Its labels stack on two lines so they take less width from it.
      const pad = parseFloat(getComputedStyle(weave.parentElement).paddingLeft) || 20, LABEL_NARROW = 92, NAME = 150;
      const bh = Math.round(Math.max(280, Math.min(window.innerHeight - 92 - 16 - NAME, w * 1.6, 640)));
      heroBox = { x: pad - 8, y: 92, w: (w - pad - LABEL_NARROW - (pad - 8)) / 0.92, h: bh };
    } else {
      // the network is the first thing you see: as large as the screen allows above the name,
      // centred on what you see (three columns of neurons plus their labels)
      const stage = weave.parentElement, foot = stage.querySelector('.hero-foot');
      const top = Math.max(84, h * 0.09), room = foot.getBoundingClientRect().top - stage.getBoundingClientRect().top - top - 28;
      const bh = Math.max(300, Math.min(h * 0.76, room)), bw = Math.min(w * 0.74, bh * 1.95), seen = bw * 0.84 + LABEL;
      heroBox = { x: (w - seen) / 2 - bw * 0.08, y: top, w: bw, h: bh };
    }
    drawNetwork(x, heroBox, NET, cell);
    placeLabels();
    if (liveNet) liveNet.layout(heroBox, networkLayout(heroBox));
    // on phones the copy starts below the network and its labels
    weave.parentElement.style.setProperty('--net-bottom', Math.round(heroBox.y + heroBox.h + 16) + 'px');
  }

  function placeLabels() {
    if (!heroBox) return;
    const outs = networkLayout(heroBox)[2], stack = PHONE.matches;   // phones: each label reads on two lines
    const mid = outs[1].y, step = Math.max(outs[1].y - outs[0].y, stack ? 34 : 22);   // room between labels
    labels.classList.toggle('stacked', stack);
    const gap = stack ? `;padding-left:${Math.round(nodeRadius(heroBox, heroCell()) + 8)}px` : '';   // clear of the neuron
    labels.innerHTML = outs.map((p, k) => `<span class="out" style="left:${p.x}px;top:${mid + (k - 1) * step}px${gap}">${NET.outputs[k]}</span>`).join('');
    if (liveNet) { liveNet.o.labels = [...labels.querySelectorAll('.out')]; liveNet.o.stack = stack; liveNet.o.cell = heroCell(); liveNet.lastLabel = 0; }
  }

  /* ---------- the entry: the picture develops out of scattered dots, from the middle of the network outwards ---------- */
  const stage = weave.parentElement;
  const rand = (i, j) => { const v = Math.sin(i * 127.1 + j * 311.7) * 43758.5453; return v - Math.floor(v); };   // stable per cell
  const ENTRY = {
    duration: 2000, flash: 520, particles: false, easing: k => 1 - Math.pow(1 - k, 3),
    order: (i, j, v, x, y) => {
      const b = heroBox, cx = b.x + b.w / 2, cy = b.y + b.h / 2, far = Math.hypot(Math.max(cx, weave.clientWidth - cx), Math.max(cy, weave.clientHeight - cy));
      return 0.62 * Math.hypot(x - cx, y - cy) / far + 0.38 * rand(i, j);
    },
  };

  /* ---------- cloths ---------- */
  function start() {
    if (NET.lap && window.LiveNet) liveNet = new window.LiveNet(stage, NET, {
      cell: heroCell(), clock: document.querySelector('.lap-clock'),
      isReady: () => hero.row >= hero.rows,   // threads start moving once the entry has finished
    });
    // the shading follows the same lap: brighter with speed, dimmer under braking, swinging with the steering
    if (window.HeroShade) shade = new window.HeroShade(stage, {
      spots: SILK, cell: heroCell, strength: () => (PHONE.matches ? 0.45 : 0.6), fadeLo: () => (PHONE.matches ? 0.3 : 0.6),
      lap: now => (liveNet ? liveNet.reading(now) : null),
      onLost: () => hero.redraw(),   // the graphics card dropped it: weave the still shading back into the cloth
    });
    // the name arrives halfway through the entry; the labels once the network is whole
    const arrived = (row, rows) => {
      if (row >= rows * 0.5) stage.classList.add('is-named');
      if (row >= rows) { stage.classList.add('is-woven'); if (liveNet) liveNet.redraw(); }
    };
    const hero = new window.Loom(weave, Object.assign({
      cell: heroCell(), interactive: true, sheen: false, eager: true, warp: false, motion: true, draw: heroPicture, onRow: arrived,
    }, ENTRY));
    if (!hero.motion) arrived(1, 1);
    // turning the phone or resizing across the breakpoint re-weaves the hero on the other grid
    PHONE.addEventListener('change', () => { hero.o.cell = heroCell(); hero.redraw(); if (shade) shade.size(); });
    // the lantern: real stars come up under the network near the pointer (mouse only)
    if (window.Lantern) new window.Lantern({ hero: stage, sky: window.WINTER_SKY });
    const trackBox = (w, h) => ({ x: w * 0.04, y: h * 0.04, w: w * 0.92, h: h * 0.92 });
    new window.Loom(document.getElementById('track'), {
      cell: 6, rowMs: 14, startOnVisible: true, interactive: true, warp: false,
      draw: (x, w, h) => drawTrack(x, trackBox(w, h), NET.technical_track, 6),
    });
    if (window.Loom.canLook()) document.querySelector('.hold-hint').hidden = false;

    // the halftone field: one night sky behind the whole page, with real constellations woven behind each chapter
    const chapters = ['.hero', '#about', '#work', '#receipts', '#education', '#experience', '#contact'].map(q => document.querySelector(q)).filter(Boolean);
    const SKY = window.CONSTELLATIONS;
    // each chapter's sky: [constellation, x, y, size]. x and y are fractions of the screen; the first one leads.
    // every chapter has at least one constellation that sits on the Milky Way, so the river runs through all of them.
    // the hero has its own picture, so its sky stays dark
    if (window.Field && SKY) new window.Field(document.getElementById('field'), chapters, [
      null,
      [[SKY.orion, 0.86, 0.5, 1], [SKY.taurus, 0.12, 0.76, 0.7], [SKY.pleiades, 0.44, 0.9, 0.2]],                // About: the hunter, what he chases, and the seven sisters
      [[SKY.auriga, 0.87, 0.36, 0.85], [SKY.pegasus, 0.1, 0.7, 0.8], [SKY.sagitta, 0.52, 0.9, 0.3]],             // Work: the charioteer, the winged horse, the arrow
      [[SKY.cygnus, 0.12, 0.68, 0.85], [SKY.lyra, 0.88, 0.3, 0.55], [SKY.aquila, 0.74, 0.82, 0.6]],              // Skills: the bridge, the weaver and the cowherd (the Summer Triangle)
      [[SKY.perseus, 0.13, 0.7, 0.85], [SKY.corona, 0.85, 0.3, 0.5], [SKY.scutum, 0.68, 0.84, 0.34]],            // Education: the hero handed his tools, the crown not yet worn, the shield
      [[SKY.gemini, 0.1, 0.72, 0.75], [SKY.plough, 0.84, 0.28, 0.85], [SKY.canisMajor, 0.72, 0.82, 0.62]],       // Experience: the twins, the plough, the faithful dog
      [[SKY.cassiopeia, 0.5, 0.86, 0.5], [SKY.ursaMinor, 0.86, 0.42, 0.8], [SKY.cepheus, 0.1, 0.3, 0.5]],        // Contact: Polaris and the two that point to it
    ], document.getElementById('main'));

    // all work: hovering Crash Course's row weaves a small copy of its track beside the pointer
    const preview = document.querySelector('.preview');
    if (FINE && preview) {
      let pv = null;   // woven the first time a row is hovered, so it never competes with the hero's entrance
      const loom = () => pv || (pv = new window.Loom(document.getElementById('preview-track'), {
        cell: 4, rowMs: 7, eager: true, particles: false,
        draw: (x, w, h) => drawTrack(x, { x: w * 0.08, y: h * 0.08, w: w * 0.84, h: h * 0.84 }, NET.technical_track, 4),
      }));
      let tx = 0, ty = 0, px = 0, py = 0, raf = 0, hidden = 0;
      const glide = () => {
        px += (tx - px) * 0.22; py += (ty - py) * 0.22;
        preview.style.transform = `translate3d(${px.toFixed(1)}px, ${py.toFixed(1)}px, 0)`;
        raf = Math.abs(tx - px) + Math.abs(ty - py) > 0.4 ? requestAnimationFrame(glide) : 0;
      };
      const aim = (e, snap) => {
        const r = preview.getBoundingClientRect();
        // sit above and right of the pointer so the row's name stays readable
        tx = Math.min(e.clientX + 24, innerWidth - r.width - 16);
        ty = e.clientY - r.height - 20 < 90 ? e.clientY + 28 : e.clientY - r.height - 20;
        if (snap || REDUCED) { px = tx; py = ty; }
        if (!raf) raf = requestAnimationFrame(glide);
      };
      document.querySelectorAll('.row[data-preview] .row-head').forEach(head => {
        head.addEventListener('pointerenter', e => {
          aim(e, !preview.classList.contains('on'));
          if (pv && performance.now() - hidden > 600 && pv.w) pv.build(false);   // weave it in again after a pause
          loom();
          preview.classList.add('on');
        });
        head.addEventListener('pointermove', e => aim(e));
        head.addEventListener('pointerleave', () => { preview.classList.remove('on'); hidden = performance.now(); });
      });
    }
  }
  (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(start);

  /* ---------- header: clear over the hero, solid once the name has gone ---------- */
  const header = document.querySelector('.site');
  const siteBar = document.querySelector('.site-bar');   // the banner is its own layer, beneath the menu
  new IntersectionObserver(([e]) => { header.classList.toggle('scrolled', !e.isIntersecting); if (siteBar) siteBar.classList.toggle('on', !e.isIntersecting); }, { rootMargin: '-80px 0px 0px 0px' })
    .observe(document.getElementById('name'));

  /* ---------- staggered menu ---------- */
  const sm = document.querySelector('.sm');
  const menuBtn = document.querySelector('.menu-btn');
  const menuWord = menuBtn.querySelector('.menu-word');
  const nav = document.getElementById('nav');
  const mainEl = document.getElementById('main');
  const skipLink = document.querySelector('.skip');
  const isOpen = () => sm.dataset.open === 'true';
  const twoFrames = fn => requestAnimationFrame(() => requestAnimationFrame(fn));
  let closing = 0, unprime = 0;
  // the sliding layers get their own compositor layers just before they are needed, and give them back afterwards
  const prime = () => { clearTimeout(unprime); sm.classList.add('primed'); };
  ['pointerenter', 'focus', 'touchstart'].forEach(t => menuBtn.addEventListener(t, prime, { passive: true }));
  menuBtn.addEventListener('pointerleave', () => { if (!isOpen()) unprime = setTimeout(() => sm.classList.remove('primed'), 400); });
  const setMenu = open => {
    prime();
    // locking the page hides its scrollbar; pad by its width so nothing behind the menu shifts
    if (open) root.style.setProperty('--sbw', (innerWidth - root.clientWidth) + 'px');
    // 1. only what starts the slide happens now, so the first frame is not held up
    sm.dataset.open = String(open);
    root.classList.toggle('menu-open', open);
    // while the panel slides away the header's buttons change colour a beat late, once it has left them
    clearTimeout(closing); root.classList.toggle('menu-closing', !open);
    if (!open) closing = setTimeout(() => root.classList.remove('menu-closing'), 460);
    menuBtn.setAttribute('aria-expanded', String(open));
    menuWord.textContent = open ? 'Close' : 'Menu';
    if (open) nav.querySelector('a').focus({ preventScroll: true });
    else { peek(null); unprime = setTimeout(() => sm.classList.remove('primed'), 900); }
    // 2. the costly part (locking the page's scroll, taking the page out of the tab order) waits two frames,
    //    by which time the slide is already running on the compositor and cannot be held up by it
    twoFrames(() => {
      if (isOpen() !== open) return;
      root.classList.toggle('menu-lock', open);
      mainEl.inert = open;            // keep keyboard focus inside the header and the open menu
      skipLink.inert = open;
    });
  };
  menuBtn.addEventListener('click', () => setMenu(!isOpen()));
  sm.querySelector('.sm-scrim').addEventListener('click', () => setMenu(false));
  nav.addEventListener('click', e => { if (e.target.closest('a')) setMenu(false); });
  addEventListener('keydown', e => { if (e.key === 'Escape' && isOpen()) { setMenu(false); menuBtn.focus(); } });

  /* ---------- menu previews: pointing at a chapter brings up its card in the space left of the panel ----------
     The card follows the pointer on a spring, settling rather than snapping, and leans up to 5 degrees the way it is
     moving. Moving to another chapter keeps the card and crossfades its face. Its three pictures are woven on small
     looms the first time they are shown, so nothing is built with the page. Mouse only, and only where the card fits
     beside the panel; a keyboard focus shows the card still, beside the link; reduced motion gets no spring or lean. */
  const card = document.querySelector('.sm-preview');
  const roomy = matchMedia('(min-width: 1010px)');
  const faces = card ? [...card.querySelectorAll('.sm-face')] : [];
  const W = 360, H = 232, GAP = 28;
  const pictures = {
    rings: (x, w, h) => drawRings(x, { x: 8, y: 8, w: w - 16, h: h - 16 }, 4),
    track: (x, w, h) => drawTrack(x, { x: w * 0.03, y: h * 0.04, w: w * 0.94, h: h * 0.92 }, NET.technical_track, 4),
    envelope: (x, w, h) => drawEnvelope(x, { x: 4, y: 4, w: w - 8, h: h - 8 }, 4),
  };
  const looms = new Map();
  const spring = { x: 0, y: 0, vx: 0, vy: 0, tx: 0, ty: 0, rot: 0, raf: 0, last: 0 };
  let shown = null;
  const place = () => { card.style.transform = `translate3d(${spring.x.toFixed(1)}px, ${spring.y.toFixed(1)}px, 0) rotate(${spring.rot.toFixed(2)}deg)`; };
  const settle = now => {
    const s = spring, dt = Math.min(0.032, (now - (s.last || now)) / 1000 || 0.016); s.last = now;
    // a spring a little under critical damping: it catches up, overshoots slightly and settles
    s.vx += (170 * (s.tx - s.x) - 21 * s.vx) * dt; s.vy += (170 * (s.ty - s.y) - 21 * s.vy) * dt;
    s.x += s.vx * dt; s.y += s.vy * dt;
    const lean = Math.max(-5, Math.min(5, s.vy * 0.012 + s.vx * 0.02));
    s.rot += (lean - s.rot) * Math.min(1, dt * 10);
    const still = Math.abs(s.tx - s.x) + Math.abs(s.ty - s.y) < 0.3 && Math.abs(s.vx) + Math.abs(s.vy) < 4 && Math.abs(s.rot) < 0.05;
    if (still) { s.x = s.tx; s.y = s.ty; s.rot = 0; s.vx = s.vy = 0; s.raf = 0; s.last = 0; } else s.raf = requestAnimationFrame(settle);
    place();
  };
  // where the card should be for a pointer (or, with no pointer, level with the link itself)
  const aimCard = (a, e) => {
    const panelLeft = sm.clientWidth - nav.offsetWidth, r = a.getBoundingClientRect();
    const cy = e ? e.clientY : r.top + r.height / 2;
    const drift = e ? Math.max(-16, Math.min(16, (e.clientX - (panelLeft + nav.offsetWidth * 0.4)) * 0.06)) : 0;
    spring.tx = Math.max(12, panelLeft - GAP - W + drift);
    spring.ty = Math.max(96, Math.min(innerHeight - H - 24, cy - H / 2));
  };
  function peek(a, e, keyboard) {
    if (!card) return;
    if (!a || !FINE || !roomy.matches) { card.classList.remove('on'); shown = null; return; }
    const first = !card.classList.contains('on');
    if (a !== shown) {
      shown = a;
      faces.forEach(f => {
        const on = f.dataset.for === a.getAttribute('href');
        f.classList.toggle('on', on);
        const cv = on && f.querySelector('canvas[data-pic]');
        if (!cv) return;
        const loom = looms.get(cv);   // woven the first time its face is shown, and again from the top each time it returns
        if (!loom) looms.set(cv, new window.Loom(cv, { cell: 4, rowMs: 5, eager: true, particles: false, warp: false, draw: pictures[cv.dataset.pic] }));
        else if (loom.w) loom.build(false);
      });
    }
    aimCard(a, e);
    if (first || keyboard || REDUCED) {   // appears right beside the link; a keyboard focus and reduced motion never spring
      cancelAnimationFrame(spring.raf);
      Object.assign(spring, { x: spring.tx, y: spring.ty, vx: 0, vy: 0, rot: 0, raf: 0, last: 0 });
      place();
    } else if (!spring.raf) spring.raf = requestAnimationFrame(settle);
    card.classList.add('on');
  }
  const smList = nav.querySelector('.sm-list');
  smList.querySelectorAll('a').forEach(a => {
    a.addEventListener('pointerenter', e => { if (isOpen() && e.pointerType === 'mouse') peek(a, e); });
    a.addEventListener('pointermove', e => { if (isOpen() && e.pointerType === 'mouse') peek(a, e); });
    a.addEventListener('focus', () => { if (isOpen() && a.matches(':focus-visible')) peek(a, null, true); });
  });
  smList.addEventListener('pointerleave', () => peek(null));
  smList.addEventListener('focusout', e => { if (!smList.contains(e.relatedTarget)) peek(null); });
  addEventListener('resize', () => { if (!roomy.matches) peek(null); });

  // the menu marks the chapter you're reading
  const navLinks = [...nav.querySelectorAll('.sm-list a')];
  const navObserver = new IntersectionObserver(entries => entries.forEach(e => {
    if (!e.isIntersecting) return;
    navLinks.forEach(a => a.getAttribute('href') === '#' + e.target.id ? a.setAttribute('aria-current', 'location') : a.removeAttribute('aria-current'));
  }), { rootMargin: '-45% 0px -50% 0px' });
  navLinks.forEach(a => { const s = document.querySelector(a.getAttribute('href')); if (s) navObserver.observe(s); });

  /* ---------- scroll reveal: only what starts below the fold, so nothing you can already see moves ---------- */
  if (!REDUCED) {
    const units = new Map();
    const rise = (el, delay) => {
      el.classList.remove('pre');
      el.animate([{ opacity: 0, transform: 'translateY(22px)' }, { opacity: 1, transform: 'none' }], { duration: 760, delay, easing: EASE, fill: 'backwards' });
    };
    const io = new IntersectionObserver(entries => {
      let k = 0;
      entries.filter(e => e.isIntersecting).forEach(e => {
        io.unobserve(e.target);
        units.get(e.target).forEach(p => rise(p, Math.min(k++, 8) * 70));   // things that arrive together rise in turn
      });
    }, { rootMargin: '0px 0px -10% 0px' });
    const add = (el, parts) => {
      if (el.getBoundingClientRect().top < innerHeight) return;
      parts.forEach(p => p.classList.add('pre'));
      units.set(el, parts); io.observe(el);
    };
    document.querySelectorAll('[data-reveal]').forEach(el => add(el, el.matches('h2') ? [...el.querySelectorAll('.line')] : [el]));
    document.querySelectorAll('[data-stagger]').forEach(list => [...list.children].forEach(el => add(el, [el])));
  }

  /* ---------- the lead claim lights word by word as it scrolls up to reading height ---------- */
  if (!REDUCED) {
    const esc = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const lits = [...document.querySelectorAll('[data-lit]')].map(p => {
      const text = p.textContent.trim();
      // screen readers get the sentence once, whole; the word spans are only for the eye
      p.innerHTML = `<span class="vh">${esc(text)}</span><span aria-hidden="true">${text.split(/\s+/).map(w => `<span class="w">${esc(w)}</span>`).join(' ')}</span>`;
      p.classList.add('is-live');
      return { p, ws: [...p.querySelectorAll('.w')] };
    });
    let queued = false;
    const light = () => {
      queued = false;
      lits.forEach(({ p, ws }) => {
        const r = p.getBoundingClientRect();
        const n = Math.round(clamp01((innerHeight * 0.9 - r.top) / (innerHeight * 0.4)) * ws.length);
        ws.forEach((w, k) => w.classList.toggle('on', k < n));
      });
    };
    addEventListener('scroll', () => { if (!queued) { queued = true; requestAnimationFrame(light); } }, { passive: true });
    addEventListener('resize', light);
    light();
  }

  /* ---------- disclosures open and close with their height, not a jump ---------- */
  document.querySelectorAll('.row details, details.fold').forEach(d => {
    const sum = d.querySelector(':scope > summary');
    sum.addEventListener('click', e => {
      if (REDUCED) return;
      e.preventDefault();
      const from = d.getBoundingClientRect().height;
      const open = d._anim ? !d._want : !d.open;
      if (d._anim) d._anim.cancel();
      d._want = open; d.open = true;
      const to = open ? d.getBoundingClientRect().height : sum.getBoundingClientRect().height;
      d.classList.add('is-animating');
      const a = d._anim = d.animate({ height: [from + 'px', to + 'px'] }, { duration: open ? 460 : 340, easing: EASE });
      a.onfinish = () => { d._anim = null; d.open = open; d.classList.remove('is-animating'); };
    });
  });

  /* ---------- phones: fold the lead project's notes so the claim, table and links stay close ---------- */
  if (matchMedia('(max-width: 900px)').matches) document.querySelectorAll('details[data-fold]').forEach(d => { d.open = false; });

  /* ---------- click sparks: short threads fly out from a click (mouse only, never with reduced motion) ----------
     Each click gets its own small canvas at the pointer, removed when the threads have gone. A full-screen canvas
     redrawn every frame was costing the same frames the menu needs when its button is clicked. */
  if (FINE && !REDUCED) {
    const col = { thread: cssVar('--thread'), pearl: cssVar('--pearl'), ground: cssVar('--ground') };
    const LIFE = 480, SIZE = 104;
    addEventListener('pointerdown', e => {
      // the cloths keep press-and-hold for the linen tester, so they don't spark
      if (e.button !== 0 || e.pointerType !== 'mouse' || e.target.closest('.weave, #track')) return;
      const onCard = !!e.target.closest('.sm-panel'), a0 = Math.random() * Math.PI, t0 = performance.now();
      const dpr = Math.min(devicePixelRatio || 1, 2), cv = document.createElement('canvas');
      cv.className = 'spark'; cv.setAttribute('aria-hidden', 'true');
      cv.width = cv.height = Math.round(SIZE * dpr);
      cv.style.left = (e.clientX - SIZE / 2) + 'px'; cv.style.top = (e.clientY - SIZE / 2) + 'px';
      document.body.appendChild(cv);
      const sx = cv.getContext('2d'), c = SIZE / 2;
      const tick = now => {
        const p = Math.max(0, (now - t0) / LIFE);
        if (p >= 1) { cv.remove(); return; }
        const ease = 1 - Math.pow(1 - p, 3);
        sx.setTransform(dpr, 0, 0, dpr, 0, 0); sx.clearRect(0, 0, SIZE, SIZE);
        sx.lineWidth = 2; sx.lineCap = 'square'; sx.globalAlpha = 1 - p * p;
        for (let k = 0; k < 8; k++) {
          const ang = a0 + k * Math.PI / 4, d0 = 5 + ease * (16 + (k % 2) * 8), d1 = d0 + 10 * (1 - p) + 2, cx = Math.cos(ang), cy = Math.sin(ang);
          sx.strokeStyle = onCard ? col.ground : (k % 2 ? col.pearl : col.thread);
          sx.beginPath(); sx.moveTo(c + cx * d0, c + cy * d0); sx.lineTo(c + cx * d1, c + cy * d1); sx.stroke();
        }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  }

  /* ---------- copy email ---------- */
  const live = document.getElementById('live');
  document.querySelectorAll('.copy-email').forEach(btn => btn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(btn.dataset.email);
      btn.dataset.state = 'copied'; btn.textContent = 'Copied'; live.textContent = 'Email address copied';
    } catch {
      btn.textContent = 'Copy failed'; live.textContent = 'Copying failed. The address is written on the email button.';
    }
    setTimeout(() => { btn.dataset.state = ''; btn.textContent = 'Copy email'; }, 2200);
  }));
})();
