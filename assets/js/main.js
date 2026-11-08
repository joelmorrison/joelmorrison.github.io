(function () {
  'use strict';
  const { networkLayout, drawNetwork, drawTrack, drawSilk } = window.LoomPictures;
  const NET = window.ALL_ROUNDER;
  const root = document.documentElement;
  const cssVar = n => getComputedStyle(root).getPropertyValue(n).trim();
  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const FINE = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const EASE = 'cubic-bezier(.22, 1, .36, 1)';
  const clamp01 = v => Math.max(0, Math.min(1, v));

  /* ---------- chapter 00: the all-rounder's network, centred, with the name along the bottom ---------- */
  const weave = document.getElementById('weave');
  const labels = document.getElementById('labels');
  let heroBox = null;
  let liveNet = null;   // the live layer: replays the all-rounder's real lap through its real weights

  function heroPicture(x, w, h) {
    const narrow = window.innerWidth < 860, cell = 6;
    drawSilk(x, w, h, narrow ? 0.45 : 0.6);
    // keep the cloth quiet behind the name and caption
    x.globalCompositeOperation = 'destination-out';
    const g = x.createLinearGradient(0, h, 0, h * (narrow ? 0.3 : 0.6));
    g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(0.5, 'rgba(0,0,0,.85)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g; x.fillRect(0, 0, w, h);
    x.globalCompositeOperation = 'source-over';
    // the output labels need room for their longest live reading, "steering straight"
    const LABEL = narrow ? 146 : 170;
    if (narrow) {
      // phones: a fixed-size network under the header, sized from the width so the copy can flow beneath it
      const bh = Math.round(Math.min(w * 0.62, window.innerHeight * 0.34, 340)), bx = w * 0.06;
      heroBox = { x: bx, y: 84, w: Math.min(w * 0.64, bh / 0.62, (w - 20 - LABEL - bx) / 0.92), h: bh };
    } else {
      // centre what you see (three columns of neurons plus their labels), and stop short of the name
      const stage = weave.parentElement, foot = stage.querySelector('.hero-foot');
      const top = Math.max(96, h * 0.12), room = foot.getBoundingClientRect().top - stage.getBoundingClientRect().top - top - 40;
      const bh = Math.max(260, Math.min(h * 0.58, room)), bw = Math.min(w * 0.6, bh * 1.75), seen = bw * 0.84 + LABEL;
      heroBox = { x: (w - seen) / 2 - bw * 0.08, y: top, w: bw, h: bh };
    }
    drawNetwork(x, heroBox, NET, cell);
    placeLabels();
    if (liveNet) liveNet.layout(heroBox, networkLayout(heroBox));
    weave.parentElement.style.setProperty('--net-bottom', Math.round(heroBox.y + heroBox.h + 16) + 'px');
  }

  function placeLabels() {
    if (!heroBox) return;
    const outs = networkLayout(heroBox)[2];
    const mid = outs[1].y, step = Math.max(outs[1].y - outs[0].y, 22);   // at least 22px between labels
    labels.innerHTML = outs.map((p, k) => `<span class="out" style="left:${p.x}px;top:${mid + (k - 1) * step}px">${NET.outputs[k]}</span>`).join('');
    if (liveNet) liveNet.o.labels = [...labels.querySelectorAll('.out')];
  }

  /* ---------- section light: a different soft spot per chapter, faded away from the text ---------- */
  function sectionLight(x, w, h, n) {
    const narrow = window.innerWidth < 860;
    const spots = [[0.92, 0.25], [0.85, 0.8], [0.97, 0.55], [0.8, 0.15], [0.95, 0.9], [0.88, 0.45]];
    const [cx, cy] = spots[n % spots.length], r = Math.max(w, Math.min(h, 1100)) * (narrow ? 0.45 : 0.42);
    const g = x.createRadialGradient(cx * w, cy * h, 0, cx * w, cy * h, r);
    g.addColorStop(0, `rgba(0,0,0,${narrow ? 0.3 : 0.4})`); g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g; x.fillRect(0, 0, w, h);
    x.globalCompositeOperation = 'destination-out';
    const f = x.createLinearGradient(0, 0, w, 0);
    f.addColorStop(0, 'rgba(0,0,0,1)'); f.addColorStop(narrow ? 0.9 : 0.74, 'rgba(0,0,0,1)'); f.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = f; x.fillRect(0, 0, w, h); x.globalCompositeOperation = 'source-over';
  }

  /* ---------- cloths ---------- */
  function start() {
    if (NET.lap && window.LiveNet) liveNet = new window.LiveNet(weave.parentElement, NET, {
      cell: 6, clock: document.querySelector('.lap-clock'),
      isReady: () => hero.row >= hero.rows,   // threads start moving once the weave-in has finished
    });
    const hero = new window.Loom(weave, {
      cell: 6, rowMs: 9, interactive: true, eager: true, draw: heroPicture,
      onRow: row => { if (liveNet && row >= hero.rows) liveNet.redraw(); },
    });
    const trackBox = (w, h) => ({ x: w * 0.04, y: h * 0.04, w: w * 0.92, h: h * 0.92 });
    new window.Loom(document.getElementById('track'), {
      cell: 6, rowMs: 14, startOnVisible: true, interactive: true,
      draw: (x, w, h) => drawTrack(x, trackBox(w, h), NET.technical_track, 6),
    });
    if (window.Loom.canLook()) document.querySelector('.hold-hint').hidden = false;

    // the halftone background: each chapter gets its own fall of light, kept out of the reading column
    document.querySelectorAll('.sheen-field').forEach((cv, n) => new window.Loom(cv, {
      cell: 8, animate: false, particles: false, floatAt: 2,
      draw: (x, w, h) => sectionLight(x, w, h, n),
    }));

    // all work: hovering Crash Course's row weaves a small copy of its track beside the pointer
    const preview = document.querySelector('.preview');
    if (FINE && preview) {
      const pv = new window.Loom(document.getElementById('preview-track'), {
        cell: 4, rowMs: 7, eager: true, particles: false,
        draw: (x, w, h) => drawTrack(x, { x: w * 0.08, y: h * 0.08, w: w * 0.84, h: h * 0.84 }, NET.technical_track, 4),
      });
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
          if (performance.now() - hidden > 600 && pv.w) pv.build(false);   // weave it in again after a pause
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
  new IntersectionObserver(([e]) => header.classList.toggle('scrolled', !e.isIntersecting), { rootMargin: '-80px 0px 0px 0px' })
    .observe(document.getElementById('name'));

  /* ---------- staggered menu ---------- */
  const sm = document.querySelector('.sm');
  const menuBtn = document.querySelector('.menu-btn');
  const menuWord = menuBtn.querySelector('.menu-word');
  const nav = document.getElementById('nav');
  const mainEl = document.getElementById('main');
  const skipLink = document.querySelector('.skip');
  const isOpen = () => sm.dataset.open === 'true';
  const setMenu = open => {
    // locking the page hides its scrollbar; pad by its width so nothing behind the menu shifts
    if (open) root.style.setProperty('--sbw', (innerWidth - root.clientWidth) + 'px');
    sm.dataset.open = String(open);
    root.classList.toggle('menu-open', open);
    menuBtn.setAttribute('aria-expanded', String(open));
    menuWord.textContent = open ? 'Close' : 'Menu';
    mainEl.inert = open;            // keep keyboard focus inside the header and the open menu
    skipLink.inert = open;
    if (open) nav.querySelector('a').focus({ preventScroll: true });
  };
  menuBtn.addEventListener('click', () => setMenu(!isOpen()));
  sm.querySelector('.sm-scrim').addEventListener('click', () => setMenu(false));
  nav.addEventListener('click', e => { if (e.target.closest('a')) setMenu(false); });
  addEventListener('keydown', e => { if (e.key === 'Escape' && isOpen()) { setMenu(false); menuBtn.focus(); } });

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

  /* ---------- click sparks: short threads fly out from a click (mouse only, never with reduced motion) ---------- */
  const sparks = document.getElementById('sparks');
  if (FINE && !REDUCED && sparks) {
    const sx = sparks.getContext('2d');
    const col = { thread: cssVar('--thread'), pearl: cssVar('--pearl'), ground: cssVar('--ground') };
    let list = [], raf = 0, dpr = 1;
    const fit = () => { dpr = Math.min(devicePixelRatio || 1, 2); sparks.width = Math.round(innerWidth * dpr); sparks.height = Math.round(innerHeight * dpr); };
    fit(); addEventListener('resize', fit);
    const LIFE = 480;
    const tick = now => {
      sx.setTransform(dpr, 0, 0, dpr, 0, 0); sx.clearRect(0, 0, innerWidth, innerHeight);
      list = list.filter(s => now - s.t0 < LIFE);
      sx.lineWidth = 2; sx.lineCap = 'square';
      for (const s of list) {
        const p = Math.max(0, (now - s.t0) / LIFE), e = 1 - Math.pow(1 - p, 3);
        const d0 = 5 + e * s.reach, d1 = d0 + 10 * (1 - p) + 2, cx = Math.cos(s.a), cy = Math.sin(s.a);
        sx.globalAlpha = 1 - p * p; sx.strokeStyle = s.col;
        sx.beginPath(); sx.moveTo(s.x + cx * d0, s.y + cy * d0); sx.lineTo(s.x + cx * d1, s.y + cy * d1); sx.stroke();
      }
      sx.globalAlpha = 1;
      raf = list.length ? requestAnimationFrame(tick) : 0;
    };
    addEventListener('pointerdown', e => {
      // the cloths keep press-and-hold for the linen tester, so they don't spark
      if (e.button !== 0 || e.pointerType !== 'mouse' || e.target.closest('.weave, #track')) return;
      const onCard = !!e.target.closest('.sm-panel'), a0 = Math.random() * Math.PI, now = performance.now();
      for (let k = 0; k < 8; k++) list.push({
        x: e.clientX, y: e.clientY, a: a0 + k * Math.PI / 4, t0: now, reach: 16 + (k % 2) * 8,
        col: onCard ? col.ground : (k % 2 ? col.pearl : col.thread),
      });
      if (!raf) raf = requestAnimationFrame(tick);
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
