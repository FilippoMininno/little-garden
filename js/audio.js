/* ============================================================
   Little Garden — audio.js
   Tiny WebAudio helpers for soft, optional feedback tones.
   Nothing loads from the network; every sound is synthesised.
   ============================================================ */
(function (global) {
  'use strict';

  const Audio = {
    ctx: null,
    enabled: false,

    init() {
      if (Audio.ctx) return Audio.ctx;
      const Ctx = global.AudioContext || global.webkitAudioContext;
      if (!Ctx) return null;
      try { Audio.ctx = new Ctx(); } catch (_) { Audio.ctx = null; }
      return Audio.ctx;
    },

    resume() {
      const ctx = Audio.init();
      if (ctx && ctx.state === 'suspended') ctx.resume();
    },

    tone(freq, start, dur, gain, type, glideTo) {
      const ctx = Audio.ctx;
      if (!ctx) return;
      const t0 = ctx.currentTime + start;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = type || 'sine';
      osc.frequency.setValueAtTime(freq, t0);
      if (glideTo) osc.frequency.exponentialRampToValueAtTime(glideTo, t0 + dur);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(gain, t0 + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(g).connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + dur + 0.05);
    },

    /* a small three-note water chime */
    play(name) {
      if (!Audio.enabled) return;
      const ctx = Audio.init();
      if (!ctx) return;
      Audio.resume();

      switch (name) {
        case 'drink':
          Audio.tone(660, 0, 0.18, 0.06, 'sine', 880);
          Audio.tone(990, 0.09, 0.22, 0.045, 'sine', 1180);
          break;
        case 'undo':
          Audio.tone(420, 0, 0.14, 0.04, 'sine', 300);
          break;
        case 'bloom':
          [523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
            Audio.tone(f, i * 0.1, 0.5, 0.05, 'triangle'));
          break;
        case 'newday':
          [392, 523.25, 659.25].forEach((f, i) =>
            Audio.tone(f, i * 0.12, 0.5, 0.045, 'sine'));
          break;
        case 'sad':
          Audio.tone(330, 0, 0.5, 0.04, 'sine', 220);
          break;
        case 'tap':
          Audio.tone(520, 0, 0.08, 0.03, 'sine');
          break;
      }
    }
  };

  global.Sound = Audio;
})(window);
