/* ============================================================
   Little Garden — plant.js
   A hand-built procedural plant: tapered gradient stem, layered
   leaves with veins, gloss and dew, side blooms and a detailed
   flower head. Drawn as SVG and animated with a small IK spine.
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
    return {
      x: mt * mt * p0.x + 2 * mt * t * p1.x + t * t * p2.x,
      y: mt * mt * p0.y + 2 * mt * t * p1.y + t * t * p2.y
    };
  }
  function smoothPath(pts) {
    if (!pts.length) return '';
    let d = `M${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}` + smoothSegments(pts);
    return d;
  }
  function smoothSegments(pts) {
    let d = '';
    for (let i = 1; i < pts.length - 1; i++) {
      const mx = (pts[i].x + pts[i + 1].x) / 2;
      const my = (pts[i].y + pts[i + 1].y) / 2;
      d += ` Q${pts[i].x.toFixed(1)},${pts[i].y.toFixed(1)} ${mx.toFixed(1)},${my.toFixed(1)}`;
    }
    const l = pts[pts.length - 1];
    d += ` L${l.x.toFixed(1)},${l.y.toFixed(1)}`;
    return d;
  }
  function lighten(hex, amt) { return Util.mixHex(hex, '#ffffff', amt); }
  function darken(hex, amt) { return Util.mixHex(hex, '#2a1830', amt); }

  const LEAF_TYPES = {
    ovate: (L, W) => `M0,0 C ${L * 0.28},${-W} ${L * 0.74},${-W} ${L},0 C ${L * 0.74},${W} ${L * 0.28},${W} 0,0 Z`,
    lance: (L, W) => `M0,0 C ${L * 0.45},${-W * 0.95} ${L * 0.8},${-W * 0.42} ${L},0 C ${L * 0.8},${W * 0.42} ${L * 0.45},${W * 0.95} 0,0 Z`,
    round: (L, W) => `M0,0 C ${L * 0.04},${-W} ${L * 0.96},${-W} ${L},0 C ${L * 0.96},${W} ${L * 0.04},${W} 0,0 Z`,
    heart: (L, W) => `M0,0 C ${L * 0.1},${-W * 1.1} ${L * 0.6},${-W} ${L},${-W * 0.35} C ${L * 1.12},${W * 0.1} ${L * 0.7},${W} ${L * 0.32},${W * 0.55} C ${L * 0.1},${W * 0.9} ${-L * 0.08},${W * 0.6} 0,0 Z`
  };

  const PALETTES = [
    { petal: '#ffb3d1', petal2: '#ff6fa5', core: '#ffd166', core2: '#e8942b' },
    { petal: '#ffe08a', petal2: '#f6a94e', core: '#fff3bf', core2: '#e0932b' },
    { petal: '#d3b6ff', petal2: '#9b79e8', core: '#ffe08a', core2: '#e0a72b' },
    { petal: '#bfeaff', petal2: '#5cb8e6', core: '#fff3b0', core2: '#e0b23b' },
    { petal: '#ffc2b0', petal2: '#f0705d', core: '#ffe27a', core2: '#d98a2b' },
    { petal: '#ffffff', petal2: '#ffd6e6', core: '#ffc94b', core2: '#e0902b' },
    { petal: '#c7f5cc', petal2: '#6fce87', core: '#ffe08a', core2: '#d99a2b' },
    { petal: '#ffd0f0', petal2: '#c86fd0', core: '#ffe8a0', core2: '#d98a4b' }
  ];

  const HEADS = ['layered', 'poppy', 'tulip', 'bell', 'spike', 'rose'];

  let UID = 0;

  class Plant {
    constructor(svgEl, seed, opts) {
      opts = opts || {};
      this.svg = svgEl;
      this.seed = seed >>> 0;
      this.rnd = Util.rng(this.seed ^ 0x9e3779b9);
      this.uid = 'pl' + (UID++).toString(36);
      this.maxSegments = opts.segments || 9;
      this.segLen = opts.segLen || 25;
      this.baseX = opts.baseX != null ? opts.baseX : 110;
      this.baseY = opts.baseY != null ? opts.baseY : 292;

      this.progress = opts.progress || 0;
      this.target = this.progress;
      this.health = opts.health != null ? opts.health : 1;
      this.healthTarget = this.health;
      this.bloom = !!opts.bloom;
      this.bloomAmt = this.bloom ? 1 : 0;
      this.hue = opts.hue != null ? opts.hue : Math.floor(Util.range(this.rnd, 96, 142));
      this.palette = opts.palette || Util.pick(this.rnd, PALETTES);
      this.headType = this.palette && opts.headType ? opts.headType : HEADS[Math.floor(this.rnd() * HEADS.length)];
      this.leafCount = this.maxSegments;
      this.wilt = 0;

      this.t = this.rnd() * 100;
      this.gust = 0;
      this._appliedHealth = -1;

      this._build();
      this._compute();
    }

    /* ======================================================= build */
    _build() {
      const rnd = this.rnd;
      const uid = this.uid;
      while (this.svg.firstChild) this.svg.removeChild(this.svg.firstChild);

      // ----- resting lean / per-leaf character
      this.restLean = [];
      const leanBias = Util.range(rnd, -0.045, 0.045);
      const wanderFreq = Util.range(rnd, 0.42, 0.8);
      const wanderPhase = rnd() * Math.PI * 2;
      for (let i = 0; i < this.maxSegments; i++) {
        this.restLean.push(
          leanBias * 0.5 +
          Math.sin(i * wanderFreq + wanderPhase) * 0.035 +
          Math.sin(i * 0.24 + wanderPhase * 0.5) * 0.022
        );
      }
      this.leafData = [];
      let side = rnd() < 0.5 ? 1 : -1;
      for (let i = 0; i < this.leafCount; i++) {
        if (rnd() < 0.82) side *= -1;
        const types = ['ovate', 'ovate', 'lance', 'round', 'heart'];
        this.leafData.push({
          side,
          type: types[Math.floor(rnd() * types.length)],
          scaleRnd: Util.range(rnd, 0.82, 1.14),
          droopBase: Util.range(rnd, -6, 10),
          hasDew: rnd() < 0.34,
          veinCount: 3 + Math.floor(rnd() * 3)
        });
      }

      // ----- defs
      const defs = svg('defs');

      this.stemGrad = svg('linearGradient', { id: `stemG-${uid}`, x1: '0', y1: '0', x2: '1', y2: '0' });
      this.stemStops = ['0', '0.38', '0.64', '1'].map((o) => svg('stop', { offset: o }));
      this.stemStops.forEach((s) => this.stemGrad.appendChild(s));

      this.leafGrad = svg('linearGradient', { id: `leafG-${uid}`, x1: '0', y1: '0', x2: '1', y2: '0' });
      this.leafStops = ['0', '0.45', '1'].map((o) => svg('stop', { offset: o }));
      this.leafStops.forEach((s) => this.leafGrad.appendChild(s));

      this.budGrad = svg('linearGradient', { id: `budG-${uid}`, x1: '0', y1: '1', x2: '0', y2: '0' });
      this.budStops = ['0', '1'].map((o) => svg('stop', { offset: o }));
      this.budStops.forEach((s) => this.budGrad.appendChild(s));

      // petal gradients (outer / inner)
      const pal = this.palette;
      const mkPetalGrad = (id, base, mid, tip) => {
        const g = svg('linearGradient', { id, x1: '0', y1: '1', x2: '0.12', y2: '0' });
        [[0, base], [0.55, mid], [1, tip]].forEach(([o, c]) => g.appendChild(svg('stop', { offset: o, 'stop-color': c })));
        return g;
      };
      this.petalGradOuter = mkPetalGrad(`petO-${uid}`, darken(pal.petal2, 0.12), pal.petal, lighten(pal.petal, 0.45));
      this.petalGradInner = mkPetalGrad(`petI-${uid}`, pal.petal2, pal.petal, lighten(pal.petal, 0.25));

      this.coreGrad = svg('radialGradient', { id: `core-${uid}`, cx: '0.42', cy: '0.38', r: '0.7' });
      this.coreGrad.appendChild(svg('stop', { offset: '0', 'stop-color': lighten(pal.core, 0.5) }));
      this.coreGrad.appendChild(svg('stop', { offset: '0.6', 'stop-color': pal.core }));
      this.coreGrad.appendChild(svg('stop', { offset: '1', 'stop-color': pal.core2 }));

      const dewGrad = svg('radialGradient', { id: `dew-${uid}`, cx: '0.35', cy: '0.3', r: '0.75' });
      dewGrad.appendChild(svg('stop', { offset: '0', 'stop-color': '#ffffff', 'stop-opacity': '0.95' }));
      dewGrad.appendChild(svg('stop', { offset: '0.55', 'stop-color': '#bfe9ff', 'stop-opacity': '0.55' }));
      dewGrad.appendChild(svg('stop', { offset: '1', 'stop-color': '#7fc8ff', 'stop-opacity': '0.12' }));

      const glow = svg('filter', { id: `glow-${uid}`, x: '-80%', y: '-80%', width: '260%', height: '260%' });
      glow.appendChild(svg('feGaussianBlur', { stdDeviation: '6' }));

      [this.stemGrad, this.leafGrad, this.budGrad, this.petalGradOuter, this.petalGradInner,
        this.coreGrad, dewGrad, glow].forEach((d) => defs.appendChild(d));
      this.svg.appendChild(defs);

      // ----- root
      const root = svg('g', { class: 'plant-root' });
      this.svg.appendChild(root);
      this.root = root;

      // stem (filled, tapered) + highlight
      this.stem = svg('path', { class: 'stem', fill: `url(#stemG-${uid})`, stroke: 'none' });
      this.stemHighlight = svg('path', { class: 'stem-highlight', fill: 'none', stroke: '#ffffff', 'stroke-width': '1.1', 'stroke-linecap': 'round', opacity: '0.3' });
      root.appendChild(this.stem);
      root.appendChild(this.stemHighlight);

      // leaves
      this.leaves = [];
      const leafLayer = svg('g', { class: 'leaf-layer' });
      for (let i = 0; i < this.leafCount; i++) {
        const lf = this._makeLeaf(i);
        this.leaves.push(lf);
        leafLayer.appendChild(lf.g);
      }
      root.appendChild(leafLayer);

      // side blooms
      this.sideFlowers = [];
      const sideLayer = svg('g', { class: 'side-layer' });
      const sideJoints = [];
      const sideCount = 1 + Math.floor(rnd() * 2);
      for (let s = 0; s < sideCount; s++) {
        const joint = 3 + s * 3 + Math.floor(rnd() * 2);
        if (joint >= this.maxSegments - 1) continue;
        const sf = this._makeSideFlower(joint, rnd() < 0.5 ? -1 : 1);
        this.sideFlowers.push(sf);
        sideLayer.appendChild(sf.g);
      }
      root.appendChild(sideLayer);

      // main flower
      this._makeFlower();
      root.appendChild(this.flower);
      this._applyColors(true);
    }

    _makeLeaf(i) {
      const d = this.leafData[i];
      const g = svg('g', { class: 'leaf' });
      const L = 26 * d.scaleRnd;
      const W = 10.5 * d.scaleRnd;
      const shapeD = LEAF_TYPES[d.type](L, W);

      const shape = svg('path', { class: 'leaf-shape', d: shapeD, fill: `url(#leafG-${this.uid})` });
      g.appendChild(shape);

      // veins
      const veins = svg('g', { class: 'leaf-veins', fill: 'none' });
      const mid = svg('path', { d: `M${L * 0.06},0 Q ${L * 0.5},${-W * 0.1} ${L * 0.95},0`, 'stroke-width': '1' });
      veins.appendChild(mid);
      for (let v = 0; v < d.veinCount; v++) {
        const t = 0.22 + (v / d.veinCount) * 0.62;
        const root = qp({ x: 0, y: 0 }, { x: L * 0.5, y: -W * 0.1 }, { x: L * 0.95, y: 0 }, t);
        const spread = Math.sin(Math.PI * t) * W * 0.85;
        const ex = root.x + L * 0.14;
        veins.appendChild(svg('path', { d: `M${root.x.toFixed(1)},${root.y.toFixed(1)} Q ${(root.x + L * 0.08).toFixed(1)},${(root.y - spread * 0.5).toFixed(1)} ${ex.toFixed(1)},${(root.y - spread).toFixed(1)}`, 'stroke-width': '0.7' }));
        veins.appendChild(svg('path', { d: `M${root.x.toFixed(1)},${root.y.toFixed(1)} Q ${(root.x + L * 0.08).toFixed(1)},${(root.y + spread * 0.5).toFixed(1)} ${ex.toFixed(1)},${(root.y + spread).toFixed(1)}`, 'stroke-width': '0.7' }));
      }
      g.appendChild(veins);

      // gloss
      const gloss = svg('path', {
        d: `M${L * 0.12},${-W * 0.5} Q ${L * 0.5},${-W * 0.98} ${L * 0.84},${-W * 0.3}`,
        fill: 'none', stroke: '#ffffff', 'stroke-width': '1.5', 'stroke-linecap': 'round', opacity: '0.3'
      });
      g.appendChild(gloss);

      let dew = null;
      if (d.hasDew) {
        const dx = L * Util.range(this.rnd, 0.35, 0.75);
        const dy = Util.range(this.rnd, -W * 0.35, W * 0.35);
        dew = svg('circle', { class: 'dew', cx: dx.toFixed(1), cy: dy.toFixed(1), r: Util.range(this.rnd, 1.6, 2.8).toFixed(1), fill: `url(#dew-${this.uid})` });
        g.appendChild(dew);
        g.appendChild(svg('circle', { cx: (dx - 0.7).toFixed(1), cy: (dy - 0.7).toFixed(1), r: '0.6', fill: '#ffffff', opacity: '0.9' }));
      }

      return { g, shape, veins, gloss, dew, L, W };
    }

    _makePetal(ph, pw, kind) {
      if (kind === 'tulip') {
        return `M0,0 C ${-pw},${-ph * 0.45} ${-pw * 1.02},${-ph * 0.92} 0,${-ph} C ${pw * 1.02},${-ph * 0.92} ${pw},${-ph * 0.45} 0,0 Z`;
      }
      if (kind === 'bell') {
        // a small bell that hangs downward from the attachment point
        return `M0,0 C ${-pw},${ph * 0.08} ${-pw * 0.95},${ph * 0.72} 0,${ph} C ${pw * 0.95},${ph * 0.72} ${pw},${ph * 0.08} 0,0 Z`;
      }
      if (kind === 'spike') {
        return `M0,0 C ${-pw},${-ph * 0.35} ${-pw * 0.82},${-ph} 0,${-ph} C ${pw * 0.82},${-ph} ${pw},${-ph * 0.35} 0,0 Z`;
      }
      if (kind === 'rose') {
        return `M0,0 C ${-pw},${-ph * 0.28} ${-pw * 1.02},${-ph * 0.82} 0,${-ph} C ${pw * 1.02},${-ph * 0.82} ${pw},${-ph * 0.28} 0,0 Z`;
      }
      return `M0,0 C ${-pw},${-ph * 0.32} ${-pw * 0.94},${-ph * 0.82} ${-pw * 0.4},${-ph * 0.98} ` +
             `C ${-pw * 0.14},${-ph * 1.06} ${pw * 0.14},${-ph * 1.06} ${pw * 0.4},${-ph * 0.98} ` +
             `C ${pw * 0.94},${-ph * 0.82} ${pw},${-ph * 0.32} 0,0 Z`;
    }

    _makeFlower() {
      const rnd = this.rnd;
      const type = this.headType;
      const uid = this.uid;
      const flower = svg('g', { class: 'flower' });
      this.petals = [];

      this.glow = svg('circle', { class: 'flower-glow', r: 30, fill: this.palette.petal, opacity: 0, filter: `url(#glow-${uid})` });
      flower.appendChild(this.glow);

      if (type === 'bell') {
        const n = 3 + Math.floor(rnd() * 3);
        const layer = svg('g', { class: 'petals outer' });
        for (let p = 0; p < n; p++) {
          const ph = Util.range(rnd, 15, 19), pw = Util.range(rnd, 7, 9.5);
          const el = svg('path', { class: 'petal', d: this._makePetal(ph, pw, 'bell'), fill: p % 2 ? `url(#petI-${uid})` : `url(#petO-${uid})` });
          layer.appendChild(el);
          this.petals.push({ el, angle: (p - (n - 1) / 2) * 30, dist: 0, scale: 1, delay: p * 0.12 });
        }
        flower.appendChild(layer);
      } else if (type === 'spike') {
        const n = 7 + Math.floor(rnd() * 5);
        const layer = svg('g', { class: 'petals outer' });
        for (let p = 0; p < n; p++) {
          const t = p / (n - 1);
          const ph = Util.range(rnd, 5, 7.5), pw = Util.range(rnd, 2.6, 3.8);
          const el = svg('path', { class: 'petal', d: this._makePetal(ph, pw, 'spike'), fill: t > 0.55 ? `url(#petI-${uid})` : `url(#petO-${uid})` });
          layer.appendChild(el);
          this.petals.push({ el, angle: (p % 2 ? 26 : -26), dist: 1 + t * 34, scale: 0.6 + t * 0.6, delay: (1 - t) * 0.55 });
        }
        flower.appendChild(layer);
      } else if (type === 'rose') {
        for (let l = 0; l < 3; l++) {
          const n = 5 + l * 2;
          const layer = svg('g', { class: 'petals ' + (l === 0 ? 'outer' : 'inner') });
          for (let p = 0; p < n; p++) {
            const ph = 13 - l * 1.6, pw = 8.5 - l * 1.3;
            const el = svg('path', { class: 'petal', d: this._makePetal(ph, pw, 'rose'), fill: l === 0 ? `url(#petO-${uid})` : `url(#petI-${uid})` });
            layer.appendChild(el);
            this.petals.push({ el, angle: (p / n) * 360 + l * 24, dist: 1.5 + l * 2, scale: 0.66 + l * 0.2, delay: l * 0.16 + p * 0.02 });
          }
          flower.appendChild(layer);
        }
      } else {
        let outerN, innerN, ph, pw;
        if (type === 'poppy') { outerN = 5; innerN = 0; ph = 20; pw = 15; }
        else if (type === 'tulip') { outerN = 4; innerN = 2; ph = 24; pw = 11; }
        else { outerN = 10 + Math.floor(rnd() * 6); innerN = Math.floor(outerN * 0.7); ph = 17; pw = 5.5; }

        const outer = svg('g', { class: 'petals outer' });
        for (let p = 0; p < outerN; p++) {
          const wob = Util.range(rnd, 0.86, 1.14);
          const el = svg('path', {
            class: 'petal', d: this._makePetal(ph * wob, pw * Util.range(rnd, 0.85, 1.15), type),
            fill: `url(#petO-${uid})`
          });
          outer.appendChild(el);
          this.petals.push({ el, angle: (p / outerN) * 360, dist: 3.2, scale: 1, delay: p * 0.03 });
        }
        flower.appendChild(outer);

        if (innerN > 0) {
          const inner = svg('g', { class: 'petals inner' });
          for (let p = 0; p < innerN; p++) {
            const el = svg('path', {
              class: 'petal',
              d: this._makePetal(ph * 0.68, pw * 0.85 * Util.range(rnd, 0.9, 1.1), type),
              fill: `url(#petI-${uid})`
            });
            inner.appendChild(el);
            this.petals.push({ el, angle: ((p + 0.5) / innerN) * 360, dist: 1.4, scale: 0.72, delay: 0.18 + p * 0.03 });
          }
          flower.appendChild(inner);
        }
      }

      // core + stamens (hidden for bell / spike)
      const core = svg('g', { class: 'flower-core' });
      if (type !== 'bell' && type !== 'spike') {
        core.appendChild(svg('circle', { r: type === 'poppy' ? 5.4 : 6.4, fill: `url(#core-${uid})` }));
        const stamenN = type === 'rose' ? 8 : (10 + Math.floor(rnd() * 6));
        for (let s = 0; s < stamenN; s++) {
          const a = (s / stamenN) * 360 + 6;
          const len = Util.range(rnd, 5, 8.5);
          const dot = svg('circle', { cx: 0, cy: -len, r: 1.15, fill: lighten(this.palette.core, 0.15) });
          const line = svg('path', { d: `M0,0 L0,${-len + 1}`, stroke: this.palette.core2, 'stroke-width': '0.9', 'stroke-linecap': 'round' });
          const grp = svg('g', { transform: `rotate(${a})` });
          grp.appendChild(line); grp.appendChild(dot);
          core.appendChild(grp);
        }
      }
      this.core = core;
      flower.appendChild(core);

      this.flower = flower;
    }

    _makeSideFlower(joint, side) {
      const rnd = this.rnd;
      const g = svg('g', { class: 'side-flower' });
      const scale = Util.range(rnd, 0.55, 0.75);
      const bud = svg('g', { class: 'side-bud' });
      bud.appendChild(svg('path', { d: 'M0,0 C -7,-8 -7,-17 0,-21 C 7,-17 7,-8 0,0 Z', fill: `url(#budG-${this.uid})` }));
      g.appendChild(bud);

      const petalsG = svg('g', { class: 'side-petals' });
      const petals = [];
      const n = 5 + Math.floor(rnd() * 2);
      for (let p = 0; p < n; p++) {
        const el = svg('path', { class: 'petal', d: this._makePetal(12, 3.6, 'layered'), fill: `url(#petO-${this.uid})` });
        petalsG.appendChild(el);
        petals.push({ el, angle: (p / n) * 360, delay: p * 0.02 });
      }
      petalsG.appendChild(svg('circle', { r: 3.2, fill: `url(#core-${this.uid})` }));
      g.appendChild(petalsG);
      return { g, bud, petalsG, petals, joint, side, scale };
    }

    /* ==================================================== colours */
    _leafColor() {
      const h = Util.clamp(this.health, 0, 1);
      const hue = Util.mix(42, this.hue, h);
      const sat = Util.mix(30, 58, h);
      const base = `hsl(${hue.toFixed(0)},${sat.toFixed(0)}%,${Util.mix(30, 34, h).toFixed(0)}%)`;
      const mid = `hsl(${hue.toFixed(0)},${sat.toFixed(0)}%,${Util.mix(42, 47, h).toFixed(0)}%)`;
      const tip = `hsl(${Util.mix(46, hue, h).toFixed(0)},${sat.toFixed(0)}%,${Util.mix(52, 60, h).toFixed(0)}%)`;
      const vein = `hsl(${hue.toFixed(0)},${(sat * 0.75).toFixed(0)}%,${Util.mix(26, 30, h).toFixed(0)}%)`;
      const stemDark = `hsl(${hue.toFixed(0)},${(sat * 0.8).toFixed(0)}%,${Util.mix(24, 28, h).toFixed(0)}%)`;
      const stemLight = `hsl(${hue.toFixed(0)},${sat.toFixed(0)}%,${Util.mix(48, 56, h).toFixed(0)}%)`;
      const stemMid = `hsl(${hue.toFixed(0)},${sat.toFixed(0)}%,${Util.mix(36, 42, h).toFixed(0)}%)`;
      const budTip = `hsl(${Util.mix(46, hue, h).toFixed(0)},${(sat * 0.7).toFixed(0)}%,${Util.mix(56, 62, h).toFixed(0)}%)`;
      return { base, mid, tip, vein, stemDark, stemLight, stemMid, budTip };
    }

    _applyColors(force) {
      if (!force && Math.abs(this.health - this._appliedHealth) < 0.006) return;
      this._appliedHealth = this.health;
      const c = this._leafColor();
      this.leafStops[0].setAttribute('stop-color', c.base);
      this.leafStops[1].setAttribute('stop-color', c.mid);
      this.leafStops[2].setAttribute('stop-color', c.tip);
      this.stemStops[0].setAttribute('stop-color', c.stemDark);
      this.stemStops[1].setAttribute('stop-color', c.stemLight);
      this.stemStops[2].setAttribute('stop-color', c.stemMid);
      this.stemStops[3].setAttribute('stop-color', c.stemDark);
      this.budStops[0].setAttribute('stop-color', c.stemMid);
      this.budStops[1].setAttribute('stop-color', c.budTip);
      for (const lf of this.leaves) lf.veins.setAttribute('stroke', c.vein);
    }

    /* ====================================================== API */
    setProgress(p) { this.target = Util.clamp(p, 0, 1); }
    setHealth(h) { this.healthTarget = Util.clamp(h, 0, 1); }
    setBloom(v) {
      this.bloom = !!v;
      if (v) { this.health = 1; this.healthTarget = 1; this._applyColors(true); }
    }
    snap() {
      this.progress = this.target;
      this.health = this.healthTarget;
      this.bloomAmt = this.bloom ? 1 : 0;
      this._compute();
    }
    gustNow() { this.gust += 0.5; }

    update(dt) {
      if (!dt || dt < 0) dt = 0.016;
      dt = Math.min(dt, 0.05);
      this.t += dt;
      const k = 1 - Math.pow(0.0025, dt);
      this.progress += (this.target - this.progress) * k;
      this.health += (this.healthTarget - this.health) * (1 - Math.pow(0.15, dt));
      const bTarget = this.bloom ? 1 : 0;
      this.bloomAmt += (bTarget - this.bloomAmt) * (1 - Math.pow(0.02, dt));
      this.gust *= Math.pow(0.1, dt);
      this._applyColors(false);
      this._compute();
    }

    /* ==================================================== geometry */
    _compute() {
      const active = this.progress * this.maxSegments;
      const wilt = Util.clamp(1 - this.health, 0, 1);
      this.wilt = wilt;
      // The plant is still at rest and only sways when it is watered
      // (a gust), so nothing drifts left and right on its own.
      const reduced = Util.prefersReducedMotion();

      const pts = [];
      const normals = [];
      let x = this.baseX, y = this.baseY, dir = -Math.PI / 2;
      pts.push({ x, y, dir });
      const widths = [];
      for (let i = 0; i < this.maxSegments; i++) {
        const seg = Util.clamp(active - i, 0, 1) * this.segLen;
        const frac = (i + 1) / this.maxSegments;
        const wind = reduced ? 0 : this.gust * 0.04 * (0.3 + frac);
        const droop = wilt * 0.11 * (0.4 + frac * 1.2);
        dir += this.restLean[i] + wind + droop;
        x += Math.cos(dir) * seg;
        y += Math.sin(dir) * seg;
        pts.push({ x, y, dir });
      }

      // normals + tapering widths
      for (let i = 0; i < pts.length; i++) {
        const prev = pts[Math.max(0, i - 1)];
        const next = pts[Math.min(pts.length - 1, i + 1)];
        let tx = next.x - prev.x, ty = next.y - prev.y;
        const len = Math.hypot(tx, ty) || 1;
        tx /= len; ty /= len;
        normals.push({ x: -ty, y: tx });
        const grow = Util.easeOutCubic(Util.clamp(active - i, 0, 1));
        widths.push(Util.lerp(3.4, 1.15, i / (pts.length - 1)) * (0.4 + 0.6 * grow));
      }

      // tapered stem + highlight
      const left = [], right = [], hi = [];
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i], n = normals[i], hw = widths[i];
        left.push({ x: p.x + n.x * hw, y: p.y + n.y * hw });
        right.push({ x: p.x - n.x * hw, y: p.y - n.y * hw });
        hi.push({ x: p.x + n.x * hw * 0.35, y: p.y + n.y * hw * 0.35 });
      }
      const stemD = `M${left[0].x.toFixed(1)},${left[0].y.toFixed(1)}` + smoothSegments(left) +
        ` L${right[right.length - 1].x.toFixed(1)},${right[right.length - 1].y.toFixed(1)}` +
        smoothSegments(right.slice().reverse()) + ' Z';
      this.stem.setAttribute('d', stemD);
      this.stemHighlight.setAttribute('d', smoothPath(hi.slice(1, hi.length - 1)));

      // leaves
      for (let i = 0; i < this.leafCount; i++) {
        const lf = this.leaves[i];
        const d = this.leafData[i];
        const reveal = Util.clamp(active - i, 0, 1);
        if (reveal <= 0.001) { lf.g.setAttribute('opacity', '0'); continue; }
        lf.g.setAttribute('opacity', reveal.toFixed(2));
        const joint = pts[Math.min(i + 1, pts.length - 1)];
        const dirDeg = joint.dir * 180 / Math.PI;
        const leafDroop = wilt * 30 * Util.clamp(1 - i / this.maxSegments, 0.3, 1);
        const angle = dirDeg + d.side * (66 + leafDroop + d.droopBase);
        const s = Util.easeOutCubic(reveal) * (1 - 0.2 * (i / this.maxSegments)) * (1 - wilt * 0.08);
        const curl = 1 - wilt * 0.22;
        lf.g.setAttribute('transform',
          `translate(${joint.x.toFixed(1)},${joint.y.toFixed(1)}) rotate(${angle.toFixed(1)}) scale(${(s * curl).toFixed(3)},${s.toFixed(3)})`);
      }

      // side blooms
      for (const sf of this.sideFlowers) {
        const joint = pts[Math.min(sf.joint, pts.length - 1)];
        const dirDeg = joint.dir * 180 / Math.PI;
        const ang = dirDeg + sf.side * 52;
        sf.g.setAttribute('transform', `translate(${joint.x.toFixed(1)},${joint.y.toFixed(1)}) rotate(${ang.toFixed(1)}) scale(${sf.scale.toFixed(2)})`);
        const local = Util.clamp((this.bloomAmt - 0.25 - sf.joint * 0.02) / 0.5, 0, 1);
        sf.petalsG.setAttribute('opacity', local.toFixed(2));
        sf.bud.setAttribute('opacity', (1 - local).toFixed(2));
        for (const p of sf.petals) {
          const l = Util.clamp((local - p.delay) / (1 - p.delay + 0.001), 0, 1);
          const sc = Util.lerp(0.2, 1, l);
          p.el.setAttribute('transform', `rotate(${(p.angle * l).toFixed(1)}) translate(0,${(-1.5 * l).toFixed(1)}) scale(${sc.toFixed(3)})`);
        }
      }

      // main flower
      const tip = pts[pts.length - 1];
      this.flower.setAttribute('transform', `translate(${tip.x.toFixed(1)},${tip.y.toFixed(1)}) rotate(${(tip.dir * 180 / Math.PI + 90).toFixed(1)})`);
      const bloomT = Util.smoothstep(this.bloomAmt);
      const budVisible = Util.clamp((active - 1.2) / 0.8, 0, 1) * (1 - bloomT);
      this.flower.setAttribute('opacity', '1');
      const breathe = 1 + (reduced ? 0 : Math.sin(this.t * 1.4) * 0.02 * bloomT);

      for (const p of this.petals) {
        const local = Util.clamp((bloomT - p.delay) / (1 - p.delay + 0.001), 0, 1);
        const spread = Util.lerp(0.06, 1, local);
        const rot = p.angle * local;
        const sc = Util.lerp(0.18, p.scale, local) * breathe * (1 - wilt * 0.12);
        p.el.setAttribute('transform',
          `rotate(${rot.toFixed(1)}) translate(0,${(-p.dist * spread).toFixed(1)}) scale(${sc.toFixed(3)})`);
      }
      this.core.setAttribute('transform', `scale(${(Util.lerp(0.3, 1, bloomT) * breathe).toFixed(3)})`);
      this.core.setAttribute('opacity', bloomT.toFixed(2));

      // bud is shown while growing, before blooming
      if (!this.budEl) {
        this.budEl = svg('g', { class: 'bud' });
        this.budEl.appendChild(svg('path', { d: 'M0,0 C -8,-10 -8,-22 0,-28 C 8,-22 8,-10 0,0 Z', fill: `url(#budG-${this.uid})` }));
        this.budEl.appendChild(svg('path', { d: 'M-2,-4 C -13,-8 -17,-16 -15,-22 C -6,-18 -2,-12 -2,-4 Z', fill: `url(#budG-${this.uid})` }));
        this.budEl.appendChild(svg('path', { d: 'M2,-4 C 13,-8 17,-16 15,-22 C 6,-18 2,-12 2,-4 Z', fill: `url(#budG-${this.uid})` }));
        this.flower.appendChild(this.budEl);
      }
      this.budEl.setAttribute('opacity', budVisible.toFixed(2));
      this.budEl.setAttribute('transform', `scale(${(Util.clamp(0.5 + active * 0.055, 0.5, 1) * (1 - wilt * 0.15)).toFixed(3)})`);

      // glow — stronger at night for a bioluminescent feel
      const nightBoost = document.body.classList.contains('is-night') ? 1.7 : 1;
      this.glow.setAttribute('opacity', (bloomT * 0.34 * (0.7 + 0.3 * Math.sin(this.t * 1.8)) * nightBoost).toFixed(2));
      this.glow.setAttribute('cx', '0');
      this.glow.setAttribute('cy', '0');
      this.glow.setAttribute('r', (18 + bloomT * 16 * breathe).toFixed(1));
    }
  }

  Plant.PALETTES = PALETTES;
  global.Plant = Plant;
})(window);
