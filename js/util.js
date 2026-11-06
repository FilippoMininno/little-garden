/* ============================================================
   Little Garden — util.js
   Small shared helpers: math, seeded randomness, time, colour
   ============================================================ */
(function (global) {
  'use strict';

  const Util = {
    clamp(v, min, max) { return v < min ? min : v > max ? max : v; },
    lerp(a, b, t) { return a + (b - a) * t; },
    invLerp(a, b, v) { return a === b ? 0 : (v - a) / (b - a); },
    mix(a, b, t) { return a + (b - a) * t; },
    smoothstep(t) { t = Util.clamp(t, 0, 1); return t * t * (3 - 2 * t); },
    easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); },
    easeInOutSine(t) { return -(Math.cos(Math.PI * t) - 1) / 2; },

    /* Deterministic PRNG so a given seed always grows the same plant. */
    rng(seed) {
      let s = (seed >>> 0) || 1;
      return function () {
        s |= 0; s = (s + 0x6D2B79F5) | 0;
        let t = Math.imul(s ^ (s >>> 15), 1 | s);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    },
    range(rnd, a, b) { return a + rnd() * (b - a); },
    pick(rnd, arr) { return arr[Math.floor(rnd() * arr.length) % arr.length]; },
    hash(str) {
      let h = 2166136261;
      for (let i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i);
        h = Math.imul(h, 16777619);
      }
      return h >>> 0;
    },

    /* --- local-day helpers --- */
    dayKey(d) {
      const dt = d || new Date();
      const y = dt.getFullYear();
      const m = String(dt.getMonth() + 1).padStart(2, '0');
      const day = String(dt.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    },
    startOfDay(d) {
      const dt = d ? new Date(d) : new Date();
      dt.setHours(0, 0, 0, 0);
      return dt;
    },
    endOfDay(d) {
      const dt = d ? new Date(d) : new Date();
      dt.setHours(23, 59, 59, 999);
      return dt;
    },
    daysBetween(keyA, keyB) {
      const a = new Date(keyA + 'T00:00:00');
      const b = new Date(keyB + 'T00:00:00');
      return Math.round((b - a) / 86400000);
    },

    minutesSince(ts, now) { return (now - ts) / 60000; },

    fmtClock(date) {
      let h = date.getHours();
      const m = String(date.getMinutes()).padStart(2, '0');
      const ampm = h >= 12 ? 'PM' : 'AM';
      h = h % 12; if (h === 0) h = 12;
      return `${h}:${m} ${ampm}`;
    },
    fmtDuration(mins) {
      mins = Math.max(0, Math.round(mins));
      if (mins < 1) return 'adesso';
      if (mins < 60) return `${mins} min fa`;
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      if (h < 24) return m ? `${h} h ${m} min fa` : `${h} h fa`;
      const d = Math.floor(h / 24);
      return d === 1 ? 'ieri' : `${d} giorni fa`;
    },
    fmtLiters(ml) { return (ml / 1000).toFixed(2).replace('.', ','); },

    /* --- colour helpers --- */
    hexToRgb(hex) {
      hex = hex.replace('#', '');
      if (hex.length === 3) hex = hex.split('').map((c) => c + c).join('');
      const n = parseInt(hex, 16);
      return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
    },
    rgbToHex(r, g, b) {
      return '#' + [r, g, b].map((v) => Math.round(Util.clamp(v, 0, 255)).toString(16).padStart(2, '0')).join('');
    },
    mixHex(a, b, t) {
      const A = Util.hexToRgb(a), B = Util.hexToRgb(b);
      return Util.rgbToHex(
        Util.mix(A.r, B.r, t),
        Util.mix(A.g, B.g, t),
        Util.mix(A.b, B.b, t)
      );
    },

    el(tag, cls, html) {
      const e = document.createElement(tag);
      if (cls) e.className = cls;
      if (html != null) e.innerHTML = html;
      return e;
    },
    $(sel, root) { return (root || document).querySelector(sel); },
    $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); },

    vibrate(pattern) {
      if (navigator.vibrate) { try { navigator.vibrate(pattern); } catch (_) {} }
    },
    prefersReducedMotion() {
      return global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
  };

  global.Util = Util;
})(window);
