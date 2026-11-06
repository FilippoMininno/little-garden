/* ============================================================
   Little Garden — garden.js
   A thriving meadow of many flower species. Every bloomed
   companion is transplanted here the moment it flourishes.
   ============================================================ */
(function (global) {
  'use strict';

  const SVGNS = 'http://www.w3.org/2000/svg';
  function svg(tag, attrs) {
    const e = document.createElementNS(SVGNS, tag);
    if (attrs) for (const k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  }
  function qp(p0, p1, p2, t) {
    const mt = 1 - t;
    return { x: mt * mt * p0.x + 2 * mt * t * p1.x + t * t * p2.x, y: mt * mt * p0.y + 2 * mt * t * p1.y + t * t * p2.y };
  }
  function petalPath(ph, pw) {
    return `M0,0 C ${-pw},${-ph * 0.35} ${-pw * 0.92},${-ph * 0.85} ${-pw * 0.38},${-ph * 0.99} ` +
           `C ${-pw * 0.12},${-ph * 1.06} ${pw * 0.12},${-ph * 1.06} ${pw * 0.38},${-ph * 0.99} ` +
           `C ${pw * 0.92},${-ph * 0.85} ${pw},${-ph * 0.35} 0,0 Z`;
  }
  function lighten(hex, amt) { return Util.mixHex(hex, '#ffffff', amt); }

  let UID = 0;

  // Depth bands on the grass, ordered nearest-first so the first bloom of a
  // new garden is a big, obvious foreground flower.
  const BANDS = [
    { bottom: 48, scale: 0.86, z: 3, fade: 1,    blur: 0 },    // near (front)
    { bottom: 60, scale: 0.68, z: 2, fade: 0.90, blur: 0.15 }, // mid
    { bottom: 72, scale: 0.52, z: 1, fade: 0.78, blur: 0.4 }   // far (back)
  ];
  const BASE_W = 108;

  // Flower species. Each receives seeded rng, hue, palette and a uid
  // for gradients, and returns a fully drawn <g> in a 100x170 box.
  const SPECIES = {
    daisy(rnd, hue, pal, uid) {
      const g = svg('g');
      const base = { x: 50, y: 164 };
      const topx = 50 + Util.range(rnd, -9, 9);
      const topy = 164 - Util.range(rnd, 78, 116);
      const ctrl = { x: 50 + Util.range(rnd, -16, 16), y: (base.y + topy) / 2 + Util.range(rnd, -6, 8) };
      g.appendChild(svg('path', { class: 'g-stem', d: `M${base.x},${base.y} Q${ctrl.x.toFixed(1)},${ctrl.y.toFixed(1)} ${topx.toFixed(1)},${topy.toFixed(1)}`, stroke: `hsl(${hue},45%,40%)`, 'stroke-width': 4 }));
      addLeaves(g, rnd, hue, base, ctrl, { x: topx, y: topy }, 5);
      // flower
      const f = svg('g', { transform: `translate(${topx.toFixed(1)},${topy.toFixed(1)}) rotate(${Util.range(rnd, -6, 6).toFixed(1)})` });
      const n = 12 + Math.floor(rnd() * 6);
      for (let i = 0; i < n; i++) {
        const ph = Util.range(rnd, 10, 14), pw = Util.range(rnd, 2.4, 3.4);
        f.appendChild(svg('path', { class: 'g-petal', d: petalPath(ph, pw), fill: `url(#pg-${uid})`, transform: `rotate(${(i / n) * 360})` }));
      }
      f.appendChild(svg('circle', { r: 4.4, fill: `url(#cg-${uid})` }));
      g.appendChild(f);
      return g;
    },

    poppy(rnd, hue, pal, uid) {
      const g = svg('g');
      const topx = 50 + Util.range(rnd, -8, 8);
      const topy = 164 - Util.range(rnd, 74, 104);
      g.appendChild(svg('path', { class: 'g-stem', d: `M50,164 Q${(50 + Util.range(rnd, -14, 14)).toFixed(1)},${((164 + topy) / 2).toFixed(1)} ${topx.toFixed(1)},${topy.toFixed(1)}`, stroke: `hsl(${hue},42%,38%)`, 'stroke-width': 3.6 }));
      addLeaves(g, rnd, hue, { x: 50, y: 164 }, { x: 50, y: (164 + topy) / 2 }, { x: topx, y: topy }, 4);
      const f = svg('g', { transform: `translate(${topx.toFixed(1)},${topy.toFixed(1)})` });
      const n = 4 + Math.floor(rnd() * 3);
      for (let i = 0; i < n; i++) {
        const ph = Util.range(rnd, 13, 17), pw = Util.range(rnd, 11, 15);
        f.appendChild(svg('path', { class: 'g-petal', d: petalPath(ph, pw), fill: i % 2 ? pal.petal : pal.petal2, transform: `rotate(${(i / n) * 360 + 20})` }));
      }
      f.appendChild(svg('circle', { r: 4.6, fill: '#3a2b3f' }));
      f.appendChild(svg('circle', { r: 2.2, fill: '#5a4560' }));
      g.appendChild(f);
      return g;
    },

    tulip(rnd, hue, pal, uid) {
      const g = svg('g');
      const topx = 50 + Util.range(rnd, -7, 7);
      const topy = 164 - Util.range(rnd, 74, 100);
      g.appendChild(svg('path', { class: 'g-stem', d: `M50,164 Q${(50 + Util.range(rnd, -8, 8)).toFixed(1)},${((164 + topy) / 2).toFixed(1)} ${topx.toFixed(1)},${topy.toFixed(1)}`, stroke: `hsl(${hue},48%,38%)`, 'stroke-width': 4 }));
      // two broad tulip leaves
      for (const s of [-1, 1]) {
        g.appendChild(svg('path', {
          d: `M50,150 C ${50 + s * 22},${118} ${50 + s * 26},${86} ${50 + s * 12},${70} C ${50 + s * 6},${100} ${50 + s * 2},${128} 50,150 Z`,
          fill: `hsl(${hue},48%,${s < 0 ? 38 : 44}%)`
        }));
      }
      const f = svg('g', { transform: `translate(${topx.toFixed(1)},${topy.toFixed(1)})` });
      for (let i = 0; i < 3; i++) {
        const ph = Util.range(rnd, 15, 18), pw = Util.range(rnd, 7.5, 9.5);
        f.appendChild(svg('path', { d: `M0,0 C ${-pw},${-ph * 0.5} ${-pw},${-ph * 0.95} 0,${-ph} C ${pw},${-ph * 0.95} ${pw},${-ph * 0.5} 0,0 Z`, fill: i === 1 ? pal.petal2 : pal.petal, transform: `translate(${(i - 1) * 6},0) rotate(${(i - 1) * 12})` }));
      }
      g.appendChild(f);
      return g;
    },

    bell(rnd, hue, pal, uid) {
      const g = svg('g');
      const topx = 50 + Util.range(rnd, -6, 6);
      const topy = 164 - Util.range(rnd, 80, 110);
      g.appendChild(svg('path', { class: 'g-stem', d: `M50,164 Q${(50 + Util.range(rnd, -10, 10)).toFixed(1)},${((164 + topy) / 2).toFixed(1)} ${topx.toFixed(1)},${topy.toFixed(1)}`, stroke: `hsl(${hue},45%,40%)`, 'stroke-width': 3.6 }));
      addLeaves(g, rnd, hue, { x: 50, y: 164 }, { x: 50, y: (164 + topy) / 2 }, { x: topx, y: topy }, 4);
      const n = 3 + Math.floor(rnd() * 3);
      for (let i = 0; i < n; i++) {
        const x = topx + (i - (n - 1) / 2) * Util.range(rnd, 8, 12);
        const y = topy - Math.abs(i - (n - 1) / 2) * Util.range(rnd, 3, 7) + 6;
        const bell = svg('g', { transform: `translate(${x.toFixed(1)},${y.toFixed(1)})` });
        bell.appendChild(svg('path', { d: 'M0,0 Q 7,0 7,8 Q 7,17 0,19 Q -7,17 -7,8 Q -7,0 0,0 Z', fill: i % 2 ? pal.petal : pal.petal2 }));
        bell.appendChild(svg('circle', { cx: 0, cy: 19, r: 1.6, fill: pal.core }));
        g.appendChild(bell);
      }
      return g;
    },

    spike(rnd, hue, pal, uid) {
      const g = svg('g');
      const topx = 50 + Util.range(rnd, -6, 6);
      const topy = 164 - Util.range(rnd, 86, 116);
      g.appendChild(svg('path', { class: 'g-stem', d: `M50,164 Q${(50 + Util.range(rnd, -8, 8)).toFixed(1)},${((164 + topy) / 2).toFixed(1)} ${topx.toFixed(1)},${topy.toFixed(1)}`, stroke: `hsl(${hue},40%,42%)`, 'stroke-width': 3 }));
      addLeaves(g, rnd, hue, { x: 50, y: 164 }, { x: 50, y: (164 + topy) / 2 }, { x: topx, y: topy }, 3);
      const spikes = 3 + Math.floor(rnd() * 3);
      for (let s = 0; s < spikes; s++) {
        const sx = topx + (s - (spikes - 1) / 2) * Util.range(rnd, 5, 9);
        const sh = Util.range(rnd, 24, 40);
        const st = svg('g', { transform: `translate(${sx.toFixed(1)},${(topy + Util.range(rnd, -4, 6)).toFixed(1)})` });
        st.appendChild(svg('path', { d: `M0,0 Q 3,${-sh * 0.5} 0,${-sh}`, fill: 'none', stroke: `hsl(${hue},45%,45%)`, 'stroke-width': 2 }));
        const buds = 6 + Math.floor(rnd() * 5);
        for (let b = 0; b < buds; b++) {
          const t = b / buds;
          st.appendChild(svg('ellipse', { cx: 0, cy: (-sh * t).toFixed(1), rx: (1.6 + t * 1.8).toFixed(1), ry: (2.7 + t).toFixed(1), fill: Util.mixHex(pal.petal2, pal.petal, t), transform: `rotate(${(b % 2 ? 22 : -22)})` }));
        }
        g.appendChild(st);
      }
      return g;
    },

    rose(rnd, hue, pal, uid) {
      const g = svg('g');
      const topx = 50 + Util.range(rnd, -6, 6);
      const topy = 164 - Util.range(rnd, 66, 92);
      g.appendChild(svg('path', { class: 'g-stem', d: `M50,164 Q${(50 + Util.range(rnd, -12, 12)).toFixed(1)},${((164 + topy) / 2).toFixed(1)} ${topx.toFixed(1)},${topy.toFixed(1)}`, stroke: `hsl(${hue},42%,36%)`, 'stroke-width': 4.2 }));
      addLeaves(g, rnd, hue, { x: 50, y: 164 }, { x: 50, y: (164 + topy) / 2 }, { x: topx, y: topy }, 3);
      const f = svg('g', { transform: `translate(${topx.toFixed(1)},${topy.toFixed(1)})` });
      for (let layer = 0; layer < 3; layer++) {
        const rr = 9 + layer * 5;
        const petalsN = 5 + layer * 2;
        for (let i = 0; i < petalsN; i++) {
          const a = (i / petalsN) * 360 + layer * 24;
          f.appendChild(svg('path', { d: `M0,0 C -5,-3 -6,-8 0,-12 C 6,-8 5,-3 0,0 Z`, fill: Util.mixHex(pal.petal2, pal.petal, layer / 2), transform: `rotate(${a}) translate(0,${-rr * 0.35}) scale(${(0.6 + layer * 0.35).toFixed(2)})` }));
        }
      }
      f.appendChild(svg('circle', { r: 3.4, fill: pal.petal2 }));
      g.appendChild(f);
      return g;
    },

    bush(rnd, hue, uid) {
      const g = svg('g');
      const cx = 50 + Util.range(rnd, -6, 6);
      const top = 164 - Util.range(rnd, 52, 78);
      g.appendChild(svg('path', { class: 'g-stem', d: `M50,164 Q ${cx},${(164 + top) / 2} ${cx},${top}`, stroke: `hsl(${hue},45%,36%)`, 'stroke-width': 3.4 }));
      const n = 26 + Math.floor(rnd() * 14);
      for (let i = 0; i < n; i++) {
        const t = Math.pow(rnd(), 0.7);
        const x = cx + Util.range(rnd, -1, 1) * 24 * (0.4 + t);
        const y = 164 - t * (164 - top) - Util.range(rnd, 0, 16);
        const L = Util.range(rnd, 8, 15);
        g.appendChild(svg('path', { d: `M0,0 C ${L * 0.3},${-L * 0.5} ${L * 0.75},${-L * 0.5} ${L},0 C ${L * 0.75},${L * 0.5} ${L * 0.3},${L * 0.5} 0,0 Z`, fill: `hsl(${hue},50%,${34 + Math.floor(rnd() * 18)}%)`, transform: `translate(${x.toFixed(1)},${y.toFixed(1)}) rotate(${Util.range(rnd, 0, 360).toFixed(0)})` }));
      }
      return g;
    }
  };

  const SPECIES_NAMES = ['daisy', 'daisy', 'poppy', 'tulip', 'bell', 'spike', 'rose', 'rose', 'bush', 'bush'];

  function addLeaves(g, rnd, hue, base, ctrl, top, count) {
    for (let i = 1; i <= count; i++) {
      const t = i / (count + 1);
      const p = qp(base, ctrl, top, t);
      const side = i % 2 === 0 ? 1 : -1;
      const L = Util.range(rnd, 12, 20) * (1 - t * 0.3);
      const Wd = L * 0.45;
      g.appendChild(svg('path', {
        d: `M0,0 C ${L * 0.28},${-Wd} ${L * 0.74},${-Wd} ${L},0 C ${L * 0.74},${Wd} ${L * 0.28},${Wd} 0,0 Z`,
        fill: `hsl(${hue},52%,${40 + Math.floor(rnd() * 12)}%)`,
        transform: `translate(${p.x.toFixed(1)},${p.y.toFixed(1)}) rotate(${side === 1 ? Util.range(rnd, 25, 55).toFixed(0) : Util.range(rnd, 125, 155).toFixed(0)})`
      }));
    }
  }

  const Garden = {
    host: null,
    count: 0,

    init(host) { Garden.host = host; },

    assignPlacement(entry, index) {
      const rnd = Util.rng((entry.seed || 1) ^ 0x51ed270b);
      const band = index % BANDS.length;
      // Frame the pot on the grass: alternate sides and step outward so the
      // meadow fills the ground either side of the companion, never on top of it.
      const half = Garden.clearHalf || 0.30;
      const side = (index % 2) ? 1 : -1;
      const rank = Math.floor(index / 2);
      const col = rank % 3;
      const spacing = 0.18;
      const jitter = Util.range(rnd, -0.025, 0.025);
      let xr = 0.5 + side * (half + 0.02 + col * spacing) + jitter;
      if (xr < 0.06 || xr > 0.94) {
        xr = 0.5 + side * (half + 0.02 + (col % 2) * spacing * 0.5) + jitter;
      }
      entry.band = band;
      entry.xr = Util.clamp(xr, 0.05, 0.95);
      entry.scaleMul = entry.scaleMul != null ? entry.scaleMul : Util.range(rnd, 0.82, 1.22);
      entry.sway = entry.sway != null ? entry.sway : Util.range(rnd, 9, 15);
      entry.swayAmt = entry.swayAmt != null ? entry.swayAmt : Util.range(rnd, 0.4, 1.1);
      entry.rot = entry.rot != null ? entry.rot : Util.range(rnd, -2, 2);
      return entry;
    },

    render(entries, opts) {
      opts = opts || {};
      if (!Garden.host) return;
      Garden.host.innerHTML = '';
      Garden.count = entries.length;
      entries.forEach((entry, i) => {
        Garden.assignPlacement(entry, i);
        const el = Garden.buildElement(entry);
        el.dataset.day = entry.dayKey;
        Garden.host.appendChild(el);
        if (opts.animateLast && i === entries.length - 1) el.classList.add('fresh');
      });
    },

    buildElement(entry) {
      const band = BANDS[entry.band] || BANDS[0];
      const el = Util.el('div', 'garden-plant');
      el.dataset.day = entry.dayKey;
      const w = BASE_W * band.scale * entry.scaleMul;
      const h = w * 1.7;
      el.style.left = (entry.xr * 100).toFixed(2) + '%';
      el.style.bottom = band.bottom + '%';
      el.style.width = w.toFixed(1) + 'px';
      el.style.height = h.toFixed(1) + 'px';
      el.style.marginLeft = (-w / 2).toFixed(1) + 'px';
      el.style.zIndex = String(band.z);
      el.style.opacity = String(band.fade);
      el.style.filter = band.blur ? `blur(${band.blur}px) saturate(${band.fade})` : '';
      el.style.setProperty('--rot', entry.rot.toFixed(2) + 'deg');
      el.style.setProperty('--sway-dur', entry.sway.toFixed(2) + 's');
      el.style.setProperty('--sway-delay', (-entry.sway * 0.5).toFixed(2) + 's');
      el.style.setProperty('--sway-amt', entry.swayAmt.toFixed(2) + 'deg');
      el.appendChild(Garden.buildSVG(entry));
      return el;
    },

    buildSVG(entry) {
      const rnd = Util.rng(entry.seed >>> 0);
      const uid = 'g' + (UID++).toString(36);
      const pal = Plant.PALETTES[(entry.paletteIndex || 0) % Plant.PALETTES.length];
      const hue = entry.hue != null ? entry.hue : Math.floor(Util.range(rnd, 90, 150));
      const W = 100, H = 170;
      const root = svg('svg', { viewBox: `0 0 ${W} ${H}`, preserveAspectRatio: 'xMidYMax meet' });

      // gradients
      const defs = svg('defs');
      const pg = svg('linearGradient', { id: `pg-${uid}`, x1: '0', y1: '1', x2: '0.1', y2: '0' });
      [[0, pal.petal2], [0.55, pal.petal], [1, lighten(pal.petal, 0.4)]].forEach(([o, c]) => pg.appendChild(svg('stop', { offset: o, 'stop-color': c })));
      const cg = svg('radialGradient', { id: `cg-${uid}`, cx: '0.4', cy: '0.38', r: '0.7' });
      [[0, lighten(pal.core, 0.45)], [0.6, pal.core], [1, pal.core2]].forEach(([o, c]) => cg.appendChild(svg('stop', { offset: o, 'stop-color': c })));
      defs.appendChild(pg); defs.appendChild(cg);
      root.appendChild(defs);

      const species = entry.species || SPECIES_NAMES[Math.floor(rnd() * SPECIES_NAMES.length)];
      const builder = SPECIES[species] || SPECIES.daisy;
      // a soft contact shadow so every plant is clearly rooted in the grass
      root.appendChild(svg('ellipse', { class: 'g-shadow', cx: 50, cy: 165, rx: 30, ry: 7, fill: 'rgba(22,48,28,0.32)' }));
      root.appendChild(svg('ellipse', { class: 'g-shadow', cx: 50, cy: 164.5, rx: 18, ry: 4, fill: 'rgba(15,35,20,0.35)' }));
      root.appendChild(builder(rnd, hue, pal, uid, entry));
      return root;
    },

    add(bloom, index) {
      const entry = {
        dayKey: bloom.dayKey,
        seed: bloom.seed >>> 0,
        hue: bloom.hue != null ? bloom.hue : Math.floor(Math.random() * 60) + 90,
        paletteIndex: bloom.paletteIndex != null ? bloom.paletteIndex : Math.floor(Math.random() * Plant.PALETTES.length)
      };
      entry.species = bloom.species || Garden.speciesFor(entry.seed);
      Garden.assignPlacement(entry, index != null ? index : Garden.count);
      return entry;
    },

    speciesFor(seed) {
      const rnd = Util.rng((seed >>> 0) ^ 0x1234abcd);
      return SPECIES_NAMES[Math.floor(rnd() * SPECIES_NAMES.length)];
    },

    /* The moment of flourishing: a glowing flower-seed lifts out of the pot,
       arcs high into the air and takes root in the garden behind. The plant
       itself is revealed by a guaranteed timer, so it always appears even if
       the decorative animation is unavailable. */
    transplant(entry, originRect, onDone) {
      Garden.count++;
      const el = Garden.buildElement(entry);
      el.dataset.day = entry.dayKey;
      const band = BANDS[entry.band] || BANDS[0];
      el.style.opacity = '0';
      Garden.host.appendChild(el);
      const target = el.getBoundingClientRect();
      const fx = document.getElementById('fx') || Garden.host;

      const sx = originRect.left + originRect.width / 2;
      const sy = originRect.top + originRect.height * 0.06;
      const tx = target.left + target.width / 2;
      const ty = target.top + target.height * 0.32;
      const dx = tx - sx, dy = ty - sy;
      const peak = Math.min(240, 160 + Math.abs(dx) * 0.45);
      const DUR = 1650;

      let wisp = null, trail = null;
      let landed = false;
      const finish = () => {
        if (landed) return;
        landed = true;
        clearTimeout(safety);
        if (trail) clearInterval(trail);
        if (wisp && wisp.parentNode) wisp.remove();
        Garden.landing(tx, ty, entry);
        el.style.opacity = String(band.fade);
        el.classList.add('fresh');
        Effects.sparkle(tx, ty, 12);
        Effects.plantPuff(tx, ty + 18);
        if (onDone) onDone();
      };

      // Guaranteed reveal — scheduled before anything that could fail.
      const safety = setTimeout(finish, DUR + 450);

      try {
        Garden.drawTrail(sx, sy, dx, dy, peak, DUR);

        const body = Util.el('div', 'wisp-body');
        for (let i = 0; i < 6; i++) {
          const petal = Util.el('i');
          petal.style.transform = `rotate(${i * 60}deg) translateY(-14px)`;
          body.appendChild(petal);
        }
        body.appendChild(Util.el('span', 'wisp-core'));
        wisp = Util.el('div', 'transplant-wisp');
        wisp.appendChild(body);
        fx.appendChild(wisp);
        wisp.style.left = sx + 'px';
        wisp.style.top = sy + 'px';

        const N = 12;
        const frames = [];
        for (let k = 0; k <= N; k++) {
          const t = k / N;
          const x = dx * t;
          const y = dy * t - peak * Math.sin(Math.PI * t);
          const scale = Util.lerp(1.3, 0.5, t);
          frames.push({
            transform: `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) scale(${scale.toFixed(3)})`,
            opacity: t === 0 ? 0 : 1,
            offset: t
          });
        }
        let anim = null;
        if (wisp.animate) anim = wisp.animate(frames, { duration: DUR, easing: 'linear' });
        if (anim && anim.addEventListener) anim.addEventListener('finish', finish);
        else if (anim) anim.onfinish = finish;

        let step = 0;
        const maxSteps = 18;
        trail = setInterval(() => {
          step++;
          const t = step / maxSteps;
          const x = sx + dx * t;
          const y = sy + dy * t - peak * Math.sin(Math.PI * t);
          if (step % 2 === 0) Effects.sparkle(x, y, 2);
          if (step % 3 === 0) Effects.petalMote(x, y);
          if (step >= maxSteps) clearInterval(trail);
        }, DUR / maxSteps);
      } catch (e) {
        // Decorative animation failed — the safety timer still plants it.
      }
    },

    landing(x, y, entry) {
      const fx = document.getElementById('fx');
      if (!fx) return;
      const pal = Plant.PALETTES[(entry.paletteIndex || 0) % Plant.PALETTES.length] || {};
      const ring = Util.el('div', 'transplant-ring');
      ring.style.left = x + 'px';
      ring.style.top = y + 'px';
      ring.style.color = pal.petal || '#ffd166';
      fx.appendChild(ring);
      ring.addEventListener('animationend', () => ring.remove());
    },

    drawTrail(sx, sy, dx, dy, peak, duration) {
      const fx = document.getElementById('fx');
      if (!fx) return;
      const NS = 'http://www.w3.org/2000/svg';
      const uid = 'tt' + (UID++).toString(36);
      const W = window.innerWidth, H = window.innerHeight;
      const svgEl = document.createElementNS(NS, 'svg');
      svgEl.setAttribute('class', 'transplant-trail-svg');
      svgEl.setAttribute('viewBox', `0 0 ${W} ${H}`);
      svgEl.setAttribute('preserveAspectRatio', 'none');

      const defs = document.createElementNS(NS, 'defs');
      const grad = document.createElementNS(NS, 'linearGradient');
      grad.setAttribute('id', 'tg-' + uid);
      grad.setAttribute('x1', '0'); grad.setAttribute('y1', '1');
      grad.setAttribute('x2', '1'); grad.setAttribute('y2', '0');
      [['0', '#ffb3d1'], ['0.5', '#ffd166'], ['1', '#fff6d0']].forEach(([o, c]) => {
        const st = document.createElementNS(NS, 'stop');
        st.setAttribute('offset', o); st.setAttribute('stop-color', c);
        grad.appendChild(st);
      });
      const blur = document.createElementNS(NS, 'filter');
      blur.setAttribute('id', 'tblur-' + uid);
      blur.setAttribute('x', '-40%'); blur.setAttribute('y', '-40%');
      blur.setAttribute('width', '180%'); blur.setAttribute('height', '180%');
      const fb = document.createElementNS(NS, 'feGaussianBlur');
      fb.setAttribute('stdDeviation', '4');
      blur.appendChild(fb);
      defs.appendChild(grad); defs.appendChild(blur);
      svgEl.appendChild(defs);

      let d = '';
      const N = 26;
      for (let k = 0; k <= N; k++) {
        const t = k / N;
        const x = sx + dx * t;
        const y = sy + dy * t - peak * Math.sin(Math.PI * t);
        d += (k ? ' L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1);
      }
      const mk = (width, stroke, filter, opacity) => {
        const p = document.createElementNS(NS, 'path');
        p.setAttribute('d', d);
        p.setAttribute('fill', 'none');
        p.setAttribute('stroke', stroke);
        p.setAttribute('stroke-width', width);
        p.setAttribute('stroke-linecap', 'round');
        p.setAttribute('stroke-linejoin', 'round');
        if (filter) p.setAttribute('filter', filter);
        p.setAttribute('opacity', opacity);
        return p;
      };
      const outer = mk(9, `url(#tg-${uid})`, `url(#tblur-${uid})`, '0.55');
      const inner = mk(3, '#fffdf2', null, '0.9');
      svgEl.appendChild(outer); svgEl.appendChild(inner);
      fx.appendChild(svgEl);

      const len = inner.getTotalLength ? inner.getTotalLength() : 400;
      [outer, inner].forEach((p) => {
        p.style.strokeDasharray = len;
        p.style.strokeDashoffset = len;
        p.animate([{ strokeDashoffset: len }, { strokeDashoffset: 0 }],
          { duration: duration, easing: 'linear', fill: 'forwards' });
      });
      svgEl.animate([
        { opacity: 1 },
        { opacity: 1, offset: 0.82 },
        { opacity: 0 }
      ], { duration: duration + 450, easing: 'ease-out', fill: 'forwards' });
      setTimeout(() => svgEl.remove(), duration + 800);
    },

    remove(dayKey) {
      const el = Garden.host && Garden.host.querySelector(`.garden-plant[data-day="${dayKey}"]`);
      if (!el) return;
      el.style.transition = 'opacity .4s ease, transform .4s ease';
      el.style.opacity = '0';
      el.style.transform = (el.style.transform || '') + ' scale(0.6)';
      setTimeout(() => el.remove(), 420);
      Garden.count = Math.max(0, Garden.count - 1);
    }
  };

  global.Garden = Garden;
})(window);
