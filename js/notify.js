/* ============================================================
   Little Garden — notify.js
   Gentle reminders: in-app toasts + optional system notifications.
   ============================================================ */
(function (global) {
  'use strict';

  const Notify = {
    stack: null,
    _lastTagAt: {},

    init() {
      Notify.stack = document.getElementById('toastStack');
    },

    supported() { return 'Notification' in global; },
    permission() { return Notify.supported() ? global.Notification.permission : 'unsupported'; },

    request() {
      if (!Notify.supported()) return Promise.resolve('unsupported');
      try {
        return global.Notification.requestPermission();
      } catch (_) {
        // Safari's older callback form
        return new Promise((resolve) => {
          try { global.Notification.requestPermission(resolve); }
          catch (e) { resolve('denied'); }
        });
      }
    },

    send(title, body, tag) {
      if (!Notify.supported() || Notify.permission() !== 'granted') return;
      try {
        const n = new global.Notification(title, {
          body,
          tag: tag || 'little-garden',
          icon: 'icons/icon.svg',
          badge: 'icons/icon.svg',
          silent: false
        });
        n.onclick = function () {
          try { global.focus(); } catch (_) {}
          n.close();
        };
      } catch (_) {}
    },

    /* in-app toast; dedupe by tag within a short window */
    toast(emoji, text, opts) {
      opts = opts || {};
      const now = Date.now();
      if (opts.tag) {
        if (Notify._lastTagAt[opts.tag] && now - Notify._lastTagAt[opts.tag] < (opts.cooldown || 20000)) return;
        Notify._lastTagAt[opts.tag] = now;
      }
      const t = Util.el('div', 'toast');
      t.appendChild(Util.el('span', 't-emoji', emoji));
      const span = Util.el('span', 't-text');
      span.textContent = text;
      t.appendChild(span);
      Notify.stack.appendChild(t);
      const life = opts.duration || 4600;
      setTimeout(() => {
        t.classList.add('out');
        t.addEventListener('animationend', () => t.remove());
      }, life);
      return t;
    },

    registerServiceWorker() {
      if (!('serviceWorker' in navigator)) return;
      if (location.protocol === 'file:') return; // SW needs http(s)
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }
  };

  global.Notify = Notify;
})(window);
