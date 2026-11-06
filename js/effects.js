/* ============================================================
   Little Garden — effects.js
   Watering sparkle, celebration petals, butterflies and bees.
   ============================================================ */
(function (global) {
  'use strict';

  const Effects = {
    fx: null,
    pour: null,
    insects: null,
    _insectList: [],
    _lastInsectCheck: 0,

    init() {
      Effects.fx = document.getElementById('fx');
      Effects.pourLayer = document.getElementById('pouring');
      Effects.insects = document.getElementById('insects');
    },

    /* ------------------------------------------------ watering moment */
    pour(centerX, soilY, plantTipY, amountText) {
      const startY = -20;
      const count = 12;
      for (let i = 0; i < count; i++) {
        setTimeout(() => Effects._oneDrop(centerX, startY, soilY), i * 45);
      }
      // splash + ripple at the soil
      setTimeout(() => {
        Effects.ripple(centerX, soilY);
        Effects.splash(centerX, soilY);
        Effects.gain(centerX, soilY - 10, amountText);
        Effects.sparkle(centerX, plantTipY + 30, 5);
      }, 420);
    },

    _oneDrop(x, startY, endY) {
      const d = Util.el('div', 'drop');
      d.style.left = (x + (Math.random() - 0.5) * 46) + 'px';
      d.style.top = startY + 'px';
      d.style.setProperty('--dist', (endY - startY) + 'px');
      d.style.setProperty('--fall', (0.62 + Math.random() * 0.2) + 's');
      d.style.transform = 'rotate(' + ((Math.random() - 0.5) * 30) + 'deg)';
      Effects.pourLayer.appendChild(d);
      d.addEventListener('animationend', () => d.remove());
    },

    splash(x, y) {
      for (let i = 0; i < 8; i++) {
        const s = Util.el('div', 'splash');
        s.style.left = x + 'px';
        s.style.top = y + 'px';
        const a = (Math.PI * 2 * i) / 8 + Math.random() * 0.4;
        const r = 16 + Math.random() * 28;
        s.style.setProperty('--sx', (Math.cos(a) * r).toFixed(1) + 'px');
        s.style.setProperty('--sy', (Math.sin(a) * r * 0.7 - 14).toFixed(1) + 'px');
        Effects.pourLayer.appendChild(s);
        s.addEventListener('animationend', () => s.remove());
      }
    },

    ripple(x, y) {
      const r = Util.el('div', 'ripple');
      r.style.left = x + 'px';
      r.style.top = y + 'px';
      r.style.width = r.style.height = '26px';
      Effects.pourLayer.appendChild(r);
      r.addEventListener('animationend', () => r.remove());
    },

    gain(x, y, text) {
      const g = Util.el('div', 'gain', text);
      g.style.left = x + 'px';
      g.style.top = y + 'px';
      Effects.pourLayer.appendChild(g);
      g.addEventListener('animationend', () => g.remove());
    },

    sparkle(x, y, n) {
      n = n || 4;
      for (let i = 0; i < n; i++) {
        const s = Util.el('div', 'spark');
        s.style.left = (x + (Math.random() - 0.5) * 60) + 'px';
        s.style.top = (y + (Math.random() - 0.5) * 50) + 'px';
        s.style.animationDelay = (Math.random() * 0.25) + 's';
        Effects.pourLayer.appendChild(s);
        s.addEventListener('animationend', () => s.remove());
      }
    },

    /* soft petal mote drifting down from the transplant arc */
    petalMote(x, y) {
      const host = Effects.fx || Effects.pourLayer;
      if (!host) return;
      const p = Util.el('div', 'petal-mote');
      p.style.left = x + 'px';
      p.style.top = y + 'px';
      p.style.background = ['#ffd6e6', '#ffe8b0', '#e6d4ff', '#cdf0ff', '#d6f5dd'][Math.floor(Math.random() * 5)];
      p.style.setProperty('--sx', (Math.random() * 50 - 25).toFixed(0) + 'px');
      p.style.setProperty('--sy', (70 + Math.random() * 70).toFixed(0) + 'px');
      host.appendChild(p);
      p.addEventListener('animationend', () => p.remove());
    },

    /* ------------------------------------------------ seed planting puff */
    plantPuff(x, y) {
      for (let i = 0; i < 6; i++) {
        const p = Util.el('div', 'puff');
        p.style.left = (x + (Math.random() - 0.5) * 34) + 'px';
        p.style.top = (y + (Math.random() - 0.5) * 10) + 'px';
        p.style.animationDelay = (i * 0.05) + 's';
        Effects.pourLayer.appendChild(p);
        p.addEventListener('animationend', () => p.remove());
      }
      Effects.sparkle(x, y - 10, 6);
    },

    /* ------------------------------------------------ celebration */
    celebrate() {
      const host = document.getElementById('celebrate');
      if (!host) return;
      const colors = ['#ff9ec4', '#ffd166', '#a9e4ff', '#c9a7ff', '#bdf0c2', '#ffb3a7'];
      const n = Util.prefersReducedMotion() ? 16 : 42;
      for (let i = 0; i < n; i++) {
        const c = Util.el('div', 'confetti');
        c.style.left = (Math.random() * 100) + '%';
        c.style.background = colors[Math.floor(Math.random() * colors.length)];
        c.style.setProperty('--dur', (2.6 + Math.random() * 2.4) + 's');
        c.style.setProperty('--spin', (360 + Math.random() * 720) + 'deg');
        c.style.animationDelay = (Math.random() * 0.6) + 's';
        c.style.width = (7 + Math.random() * 8) + 'px';
        c.style.height = (9 + Math.random() * 9) + 'px';
        host.appendChild(c);
        c.addEventListener('animationend', () => c.remove());
      }
    },

    /* ------------------------------------------------ insects */
    spawnInsects(count) {
      Effects.insects.innerHTML = '';
      Effects._insectList = [];
      const w = global.innerWidth, h = global.innerHeight;
      for (let i = 0; i < count; i++) {
        const isBee = i % 3 === 0;
        const el = Effects._makeInsect(isBee);
        const x = Util.lerp(w * 0.12, w * 0.88, Math.random());
        const y = Util.lerp(h * 0.28, h * 0.6, Math.random());
        el.style.transform = `translate(${x}px, ${y}px)`;
        Effects.insects.appendChild(el);
        Effects._insectList.push({
          el, x, y,
          tx: x, ty: y,
          speed: isBee ? 34 : 26,
          wobble: Math.random() * Math.PI * 2,
          dir: 1,
          rest: 1.5 + Math.random() * 4,
          isBee
        });
      }
    },

    _makeInsect(isBee) {
      const el = Util.el('div', isBee ? 'bee' : 'butterfly');
      const l = Util.el('div', 'wing left');
      const r = Util.el('div', 'wing right');
      const b = Util.el('div', 'body');
      el.appendChild(l); el.appendChild(r); el.appendChild(b);
      if (!isBee) {
        const p1 = ['#ff9ec4', '#ffd166', '#c9a7ff', '#a9e4ff', '#ffb3a7'][Math.floor(Math.random() * 5)];
        const p2 = ['#ff6fa5', '#f6a94e', '#9b79e8', '#5cb8e6', '#f0705d'][Math.floor(Math.random() * 5)];
        el.style.setProperty('--bw1', p1);
        el.style.setProperty('--bw2', p2);
      }
      return el;
    },

    updateInsects(dt, active) {
      const list = Effects._insectList;
      if (!list.length) return;
      const w = global.innerWidth, h = global.innerHeight;
      for (const it of list) {
        it.el.classList.toggle('active', active);
        if (!active) continue;
        const dx = it.tx - it.x, dy = it.ty - it.y;
        const dist = Math.hypot(dx, dy);
        it.wobble += dt * 3.1;
        if (dist < 8) {
          it.rest -= dt;
          if (it.rest <= 0) {
            it.rest = 1.2 + Math.random() * 4;
            it.tx = Util.clamp(it.x + (Math.random() - 0.5) * w * 0.5, 40, w - 40);
            it.ty = Util.clamp(it.y + (Math.random() - 0.5) * h * 0.24, h * 0.18, h * 0.68);
          }
        } else {
          const step = it.speed * dt;
          it.x += (dx / dist) * step;
          it.y += (dy / dist) * step + Math.sin(it.wobble) * 0.6;
          it.dir = dx >= 0 ? 1 : -1;
        }
        const bobY = Math.sin(it.wobble * 1.4) * 4;
        const scale = it.dir;
        it.el.style.transform =
          `translate(${it.x.toFixed(1)}px, ${(it.y + bobY).toFixed(1)}px) scaleX(${scale})`;
      }
    },

    refreshInsects(gardenCount) {
      const want = gardenCount <= 0 ? 0 : Math.min(6, 1 + Math.floor(gardenCount / 3));
      if (want !== Effects._insectList.length) {
        Effects.spawnInsects(want);
      }
    },

    insectsActive(now, gardenCount, blooming) {
      return (gardenCount > 0 || blooming) && !Sky.isNight(now) && !Util.prefersReducedMotion();
    },

    tick(dt, now, gardenCount, blooming) {
      Effects.updateInsects(dt, Effects.insectsActive(now, gardenCount, blooming));
    }
  };

  global.Effects = Effects;
})(window);
