/* ============================================================
   Little Garden — storage.js
   All persistence lives in localStorage, on this device only.
   ============================================================ */
(function (global) {
  'use strict';

  const KEY = 'little-garden.v1';

  function defaults() {
    return {
      version: 1,
      settings: {
        goalLiters: 2,
        glassMl: 250,
        reminderMin: 45,
        notifications: false,
        sound: false,
        onboarded: false
      },
      today: null,
      garden: [],
      streak: 0,
      bestStreak: 0,
      totalGlasses: 0,
      totalBlooms: 0,
      lastSeenDay: null,
      history: []
    };
  }

  const Store = {
    defaults,
    state: null,
    _saveTimer: null,

    load() {
      let raw = null;
      try { raw = localStorage.getItem(KEY); } catch (_) {}
      let parsed = null;
      if (raw) {
        try { parsed = JSON.parse(raw); } catch (_) { parsed = null; }
      }
      const base = defaults();
      if (!parsed || typeof parsed !== 'object') {
        Store.state = base;
        return Store.state;
      }
      // gentle migration / merge
      const s = Object.assign(base, parsed);
      s.settings = Object.assign(base.settings, parsed.settings || {});
      s.garden = Array.isArray(parsed.garden) ? parsed.garden : [];
      s.history = Array.isArray(parsed.history) ? parsed.history : [];
      if (!s.today || typeof s.today !== 'object') s.today = null;
      Store.state = s;
      return s;
    },

    save() {
      if (Store._saveTimer) return;
      Store._saveTimer = setTimeout(() => {
        Store._saveTimer = null;
        Store.saveNow();
      }, 180);
    },

    saveNow() {
      if (Store._saveTimer) {
        clearTimeout(Store._saveTimer);
        Store._saveTimer = null;
      }
      try {
        localStorage.setItem(KEY, JSON.stringify(Store.state));
      } catch (_) { /* storage might be full or blocked */ }
    },

    reset() {
      Store.state = defaults();
      Store.saveNow();
    },

    /* Live progress toward today's goal, in glasses. */
    goalGlasses(state) {
      const s = state || Store.state;
      const perGlass = s.settings.glassMl || 250;
      return Math.max(1, Math.round((s.settings.goalLiters * 1000) / perGlass));
    },
    progress(state) {
      const s = state || Store.state;
      if (!s.today) return 0;
      return Util.clamp(s.today.glasses / Store.goalGlasses(s), 0, 1);
    }
  };

  global.Store = Store;
})(window);
