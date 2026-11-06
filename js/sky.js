/* ============================================================
   Little Garden — sky.js
   The living sky: day/night cycle, sun, moon, stars, clouds.
   Colours are computed from the real local time.
   ============================================================ */
(function (global) {
  'use strict';

  const Sky = {
    el: {},
    _starred: false,
    _clouded: false,
    _shootTimer: null,
    _lastPhase: null,

    init() {
      const $ = Util.$;
      Sky.el = {
        scene: $('#scene'),
        day: $('.sky-day'),
        dusk: $('.sky-dusk'),
        night: $('.sky-night'),
        sun: $('#sun'),
        moon: $('#moon'),
        stars: $('#stars'),
        clouds: $('#clouds'),
        atmo: $('#atmo'),
        shooting: $('#shooting'),
        theme: $('#themeColor'),
        body: document.body
      };
      Sky.buildStars(90);
      Sky.buildClouds(6);
      Sky.buildFireflies(14);
      Sky.buildPollen(24);
      Sky.scheduleShootingStar();
    },

    buildStars(count) {
      if (Sky._starred) return;
      const frag = document.createDocumentFragment();
      const rnd = Util.rng(4242);
      for (let i = 0; i < count; i++) {
        const s = Util.el('div', 'star');
        const size = Util.range(rnd, 1.2, 3.2);
        s.style.width = size + 'px';
        s.style.height = size + 'px';
        s.style.left = Util.range(rnd, 1, 99) + '%';
        s.style.top = Util.range(rnd, 0.5, 62) + '%';
        s.style.setProperty('--dur', Util.range(rnd, 2.6, 6.5) + 's');
        s.style.setProperty('--delay', Util.range(rnd, 0, 5) + 's');
        s.style.opacity = Util.range(rnd, 0.5, 1);
        frag.appendChild(s);
      }
      Sky.el.stars.appendChild(frag);
      Sky._starred = true;
    },

    buildClouds(count) {
      if (Sky._clouded) return;
      const frag = document.createDocumentFragment();
      const rnd = Util.rng(1717);
      for (let i = 0; i < count; i++) {
        const c = Util.el('div', 'cloud');
        const w = Util.range(rnd, 90, 200);
        c.style.width = w + 'px';
        c.style.height = w * 0.32 + 'px';
        c.style.top = Util.range(rnd, 8, 46) + '%';
        c.style.setProperty('--dur', Util.range(rnd, 70, 150) + 's');
        c.style.setProperty('--delay', (-Util.range(rnd, 0, 120)) + 's');
        c.style.setProperty('--cloud-op', Util.range(rnd, 0.5, 0.9));
        c.style.transform = 'scale(' + Util.range(rnd, 0.7, 1.2) + ')';
        frag.appendChild(c);
      }
      Sky.el.clouds.appendChild(frag);
      Sky._clouded = true;
    },

    /* fireflies belong to the night; CSS fades them in with body.is-night */
    buildFireflies(count) {
      const host = document.getElementById('fireflies');
      if (!host || host.childElementCount) return;
      const frag = document.createDocumentFragment();
      const rnd = Util.rng(909);
      for (let i = 0; i < count; i++) {
        const f = Util.el('div', 'firefly');
        f.style.left = Util.range(rnd, 6, 94) + '%';
        f.style.top = Util.range(rnd, 48, 88) + '%';
        f.style.setProperty('--dur', Util.range(rnd, 7, 14) + 's');
        f.style.setProperty('--delay', Util.range(rnd, 0, 6) + 's');
        f.style.setProperty('--ff-op', Util.range(rnd, 0.5, 1));
        frag.appendChild(f);
      }
      host.appendChild(frag);
    },

    buildPollen(count) {
      const host = document.getElementById('pollen');
      if (!host || host.childElementCount) return;
      const frag = document.createDocumentFragment();
      const rnd = Util.rng(20240);
      for (let i = 0; i < count; i++) {
        const p = Util.el('div', 'mote');
        const size = Util.range(rnd, 2, 5.5);
        p.style.width = size + 'px';
        p.style.height = size + 'px';
        p.style.left = Util.range(rnd, 0, 100) + '%';
        p.style.top = Util.range(rnd, 18, 90) + '%';
        p.style.setProperty('--dur', Util.range(rnd, 11, 26) + 's');
        p.style.setProperty('--delay', (-Util.range(rnd, 0, 22)) + 's');
        p.style.setProperty('--drift', Util.range(rnd, 18, 70) + 'px');
        p.style.opacity = Util.range(rnd, 0.25, 0.75).toFixed(2);
        frag.appendChild(p);
      }
      host.appendChild(frag);
    },

    scheduleShootingStar() {
      clearTimeout(Sky._shootTimer);
      const rnd = Math.random;
      const wait = 12000 + rnd() * 30000;
      Sky._shootTimer = setTimeout(() => {
        const night = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--night-opacity')) || 0;
        if (night > 0.5 && Sky.el.shooting) {
          Sky.el.shooting.style.left = (30 + rnd() * 55) + '%';
          Sky.el.shooting.style.top = (4 + rnd() * 22) + '%';
          Sky.el.shooting.classList.remove('go');
          void Sky.el.shooting.offsetWidth;
          Sky.el.shooting.classList.add('go');
        }
        Sky.scheduleShootingStar();
      }, wait);
    },

    update(now) {
      const hour = now.getHours() + now.getMinutes() / 60;
      const angle = ((hour - 6) / 12) * Math.PI;   // sunrise 06:00 → sunset 18:00
      const alt = Math.sin(angle);                  // >0 above horizon

      // day / dusk / night blend
      const dayness = Util.clamp(alt * 3, 0, 1);
      const duskness = Util.clamp(1 - Math.abs(alt) * 5.2, 0, 1) * 0.92;
      const night = Util.clamp(1 - dayness * 1.35, 0, 1);

      const root = document.documentElement.style;
      root.setProperty('--night-opacity', night.toFixed(3));
      root.setProperty('--dusk-opacity', duskness.toFixed(3));
      root.setProperty('--atmo-opacity', (duskness * 0.5).toFixed(3));
      root.setProperty('--atmo-color', alt > 0 ? '255 214 150' : '120 140 220');

      // sun position (left→right across the day)
      const st = Util.clamp((hour - 6) / 12, -0.15, 1.15);
      const sx = 4 + st * 92;
      const sy = 76 - Math.sin(Util.clamp(st, 0, 1) * Math.PI) * 64;
      const sunAlt = Math.sin(Util.clamp(st, 0, 1) * Math.PI);
      Sky.el.sun.style.left = sx + '%';
      Sky.el.sun.style.top = sy + '%';
      Sky.el.sun.style.opacity = sunAlt > 0.02 ? Util.clamp(sunAlt * 2.4, 0, 1).toFixed(2) : '0';

      // moon position (rises 18:00, sets 06:00)
      let mh = hour; if (mh < 6) mh += 24;
      const mt = Util.clamp((mh - 18) / 12, 0, 1);
      const mx = 8 + mt * 84;
      const my = 70 - Math.sin(mt * Math.PI) * 58;
      const moonAlt = Math.sin(mt * Math.PI);
      Sky.el.moon.style.left = mx + '%';
      Sky.el.moon.style.top = my + '%';
      Sky.el.moon.style.opacity = (moonAlt > 0.05 ? Util.clamp(moonAlt * 2.2, 0, 0.95) : 0).toFixed(2);

      // atmosphere tints the hills and ground
      const daylight = dayness;
      root.setProperty('--hill-back-top', Util.mixHex('#7cc0a0', '#9ed9b0', daylight));
      root.setProperty('--hill-back-bottom', Util.mixHex('#4f8f78', '#7cc89a', daylight));
      root.setProperty('--hill-mid-top', Util.mixHex('#5fae86', '#7cc98f', daylight));
      root.setProperty('--hill-mid-bottom', Util.mixHex('#3d7a5f', '#57ad78', daylight));
      root.setProperty('--hill-front-top', Util.mixHex('#4d9c6c', '#6cbe83', daylight));
      root.setProperty('--hill-front-bottom', Util.mixHex('#316b48', '#42955f', daylight));
      root.setProperty('--ground-top', Util.mixHex('#4f9c6b', '#6cbe83', daylight));
      root.setProperty('--ground-bottom', Util.mixHex('#2c6342', '#3f8f5c', daylight));

      // clouds get cooler at night
      Sky.el.clouds.classList.toggle('night', night > 0.6);

      // day/night class driving filters & fireflies
      const phase = night > 0.5 ? 'night' : (duskness > 0.5 ? 'dusk' : 'day');
      if (phase !== Sky._lastPhase) {
        Sky.el.body.classList.toggle('is-night', phase === 'night');
        Sky.el.body.classList.toggle('is-dusk', phase === 'dusk');
        Sky._lastPhase = phase;
      }

      // mobile theme-colour / status bar
      const themeColor = phase === 'night' ? '#101a3a' : (phase === 'dusk' ? '#f0a98a' : '#8fd0ee');
      if (Sky.el.theme.getAttribute('content') !== themeColor) {
        Sky.el.theme.setAttribute('content', themeColor);
      }
    },

    greeting(now) {
      const h = now.getHours();
      if (h < 5) return 'Riposa bene';
      if (h < 12) return 'Buongiorno';
      if (h < 17) return 'Buon pomeriggio';
      if (h < 21) return 'Buonasera';
      return 'Buonanotte';
    },

    isNight(now) {
      const h = (now || new Date()).getHours();
      return h >= 21 || h < 6;
    }
  };

  global.Sky = Sky;
})(window);
