/* ============================================================
   Little Garden — app.js
   The controller: game rules, day rollover, UI + wiring.
   ============================================================ */
(function (global) {
  'use strict';

  const MOUTHS = {
    content: 'M86 112 Q100 120 114 112',
    smile:   'M84 109 Q100 126 116 109',
    big:     'M82 107 Q100 134 118 107',
    thirsty: 'M87 114 Q100 117 113 114',
    sad:     'M86 119 Q100 109 114 119',
    sick:    'M84 115 Q92 109 100 115 Q108 121 116 115'
  };

  const SPEECH = {
    newDay: [
      'Un nuovo seme! Aiutami a crescere oggi 🌱',
      'Sono solo un germoglio… un sorso mi aiuterebbe 💧',
      'Buongiorno! Cresciamo insieme 🌿',
      'Chissà quanto in alto arriveremo oggi…'
    ],
    drink: [
      '+1 bicchiere! Lo sento 💧',
      'Ahh, grazie 🌿',
      'Delizioso — sto crescendo!',
      'Proprio quello che ci voleva 💚',
      'Continua così, siamo una bella squadra!',
      'Le mie foglie si stanno rianimando!'
    ],
    thirsty: [
      'Un sorsetto sarebbe meraviglioso… 💧',
      'Comincio ad avere un po’ di sete…',
      'Un bicchiere d’acqua mi tirerebbe su 🌱',
      'Sto sognando le gocce di pioggia…'
    ],
    sick: [
      'Mi sento appassire… acqua, per favore? 🥺',
      'Le mie foglie si arricciano… un sorso aiuterebbe',
      'È stato tranquillo. Beviamo qualcosa?'
    ],
    bloom: [
      'Sono fiorito! Grazie 🌸',
      'Guarda noi! Una fioritura bellissima ✨',
      'Ce l’hai fatta — e anch’io! 🌷',
      'Questa è la mia sensazione preferita 🌼'
    ],
    idle: [
      'Stai facendo qualcosa di buono per te 💛',
      'Un piccolo sorso alla volta è abbastanza.',
      'Sono fiero di te per essere qui.',
      'Anche un progresso gentile è progresso 🌿'
    ],
    undo: ['Va bene — senza fretta.', 'Possiamo ricominciare, con calma.']
  };

  // Each day's companion has the same flower form as the species it will
  // become in the garden, so the variety is obvious day to day.
  const HEAD_BY_SPECIES = {
    daisy: 'layered', poppy: 'poppy', tulip: 'tulip',
    bell: 'bell', spike: 'spike', rose: 'rose', bush: 'layered'
  };

  const App = {
    state: null,
    plant: null,
    isNewDay: false,
    paused: false,
    onboarding: false,
    faceOverride: null,
    lookDir: null,
    lookUntil: 0,
    _lastSecond: 0,
    _lastSky: 0,

    /* ------------------------------------------------------- bootstrap */
    init() {
      App.state = Store.load();
      Sound.enabled = !!App.state.settings.sound;

      Notify.init();
      Sky.init();
      Effects.init();
      Garden.init(document.getElementById('garden'));

      App.cacheDom();
      App.syncSettingsUI();
      App.bindEvents();

      App.ensureToday();
      Garden.render(App.state.garden.slice(-60));
      Effects.refreshInsects(App.state.garden.length);

      App.setupPlant();
      App.updateAll();
      Sky.update(new Date());

      if (!App.state.settings.onboarded) {
        App.onboarding = true;
        App.openWelcome();
      } else if (App.isNewDay) {
        setTimeout(() => App.onNewDay(true), 600);
      } else {
        // a quiet hello when returning to a living companion
        if (!App.state.today.bloomed) {
          setTimeout(() => App.sayRandom('idle'), 2600);
        }
      }

      if (location.protocol === 'http:' || location.protocol === 'https:') {
        const link = document.createElement('link');
        link.rel = 'manifest';
        link.href = 'manifest.webmanifest';
        document.head.appendChild(link);
        Notify.registerServiceWorker();
      }
      window.addEventListener('beforeunload', () => Store.saveNow());

      requestAnimationFrame(() => App.layout());
      setTimeout(() => App.layout(), 350);
      // re-measure whenever the top bar or controls change size (text wrapping etc.)
      if (window.ResizeObserver) {
        App._ro = new ResizeObserver(() => App.queueLayout());
        [App.dom.meter, App.dom.controls].forEach((el) => el && App._ro.observe(el));
      }

      App.startLoop();
      setInterval(App.secondTick, 1000);
      setInterval(() => {
        if (Util.dayKey(new Date()) !== App.state.today.dayKey) App.rollDay();
      }, 30000);

      document.addEventListener('visibilitychange', () => {
        App.paused = document.hidden;
        if (!document.hidden) App.secondTick();
      });
    },

    cacheDom() {
      App.dom = {
        greeting: document.getElementById('greeting'),
        dateline: document.getElementById('dateline'),
        gardenCountNum: document.getElementById('gardenCountNum'),
        meter: document.getElementById('meter'),
        meterFill: document.getElementById('meterFill'),
        meterValue: document.getElementById('meterValue'),
        meterGoal: document.getElementById('meterGoal'),
        meterBarFill: document.getElementById('meterBarFill'),
        meterSub: document.getElementById('meterSub'),
        controls: document.querySelector('.controls'),
        lastDrink: document.getElementById('lastDrink'),
        drinkBtn: document.getElementById('drinkBtn'),
        drinkRipple: document.getElementById('drinkRipple'),
        drinkMl: document.getElementById('drinkMl'),
        undoBtn: document.getElementById('undoBtn'),
        settingsBtn: document.getElementById('settingsBtn'),
        statsBtn: document.getElementById('statsBtn'),
        companion: document.getElementById('companion'),
        mainPlant: document.getElementById('mainPlant'),
        pot: document.getElementById('pot'),
        speech: document.getElementById('speech'),
        companionTag: document.getElementById('companionTag'),
        bloomBanner: document.getElementById('bloomBanner'),
        eyes: document.querySelector('#potFace .eyes'),
        mouth: document.getElementById('potMouth'),
        brows: [document.querySelector('.brow-left'), document.querySelector('.brow-right')],
        sweat: document.getElementById('potSweat'),
        settingsSheet: document.getElementById('settingsSheet'),
        statsSheet: document.getElementById('statsSheet'),
        welcome: document.getElementById('welcome'),
        goalRange: document.getElementById('goalRange'),
        goalOut: document.getElementById('goalOut'),
        glassRange: document.getElementById('glassRange'),
        glassOut: document.getElementById('glassOut'),
        remindRange: document.getElementById('remindRange'),
        remindOut: document.getElementById('remindOut'),
        notifyToggle: document.getElementById('notifyToggle'),
        soundToggle: document.getElementById('soundToggle'),
        resetBtn: document.getElementById('resetBtn'),
        welcomeGoal: document.getElementById('welcomeGoal'),
        welcomeGoalOut: document.getElementById('welcomeGoalOut'),
        welcomeStart: document.getElementById('welcomeStart'),
        welcomeArt: document.getElementById('welcomeArt'),
        statGlasses: document.getElementById('statGlasses'),
        statGoal: document.getElementById('statGoal'),
        statStreak: document.getElementById('statStreak'),
        statBlooms: document.getElementById('statBlooms'),
        statTip: document.getElementById('statTip')
      };
    },

    bindEvents() {
      const d = App.dom;
      d.drinkBtn.addEventListener('click', App.logGlass);
      d.undoBtn.addEventListener('click', App.undoGlass);
      d.settingsBtn.addEventListener('click', () => { App.syncSettingsUI(); App.openSheet('settingsSheet'); });
      d.statsBtn.addEventListener('click', () => App.openStats());

      Util.$$('[data-close]').forEach((b) =>
        b.addEventListener('click', () => App.closeSheet(b.getAttribute('data-close'))));

      // settings inputs
      d.goalRange.addEventListener('input', () => {
        d.goalOut.textContent = parseFloat(d.goalRange.value).toFixed(1).replace('.', ',');
      });
      d.goalRange.addEventListener('change', () => {
        App.state.settings.goalLiters = parseFloat(d.goalRange.value);
        App.afterGoalChange();
      });
      d.glassRange.addEventListener('input', () => {
        d.glassOut.textContent = d.glassRange.value;
        d.drinkMl.textContent = '+' + d.glassRange.value + ' ml';
      });
      d.glassRange.addEventListener('change', () => {
        App.state.settings.glassMl = parseInt(d.glassRange.value, 10);
        Store.save(); App.updateAll();
      });
      d.remindRange.addEventListener('input', () => {
        d.remindOut.textContent = d.remindRange.value;
      });
      d.remindRange.addEventListener('change', () => {
        App.state.settings.reminderMin = parseInt(d.remindRange.value, 10);
        Store.save();
      });

      d.notifyToggle.addEventListener('click', App.toggleNotifications);
      d.soundToggle.addEventListener('click', () => {
        const on = d.soundToggle.getAttribute('aria-checked') !== 'true';
        d.soundToggle.setAttribute('aria-checked', String(on));
        App.state.settings.sound = on;
        Sound.enabled = on;
        if (on) { Sound.resume(); Sound.play('tap'); }
        Store.save();
      });
      d.resetBtn.addEventListener('click', App.resetAll);

      // welcome
      d.welcomeGoal.addEventListener('input', () => {
        d.welcomeGoalOut.textContent = parseFloat(d.welcomeGoal.value).toFixed(1).replace('.', ',') + ' L';
      });
      d.welcomeStart.addEventListener('click', App.finishWelcome);

      window.addEventListener('resize', App.onResize);
      window.addEventListener('orientationchange', () => setTimeout(App.layout, 250));

      // hidden keep-awake for audio on first gesture
      const wake = () => { Sound.resume(); };
      document.addEventListener('touchstart', wake, { once: true, passive: true });
      document.addEventListener('click', wake, { once: true });
    },

    /* --------------------------------------------------- day handling */
    createDay(key, now) {
      const seed = Util.hash(key) >>> 0;
      const rnd = Util.rng(seed);
      return {
        dayKey: key,
        glasses: 0,
        ml: 0,
        plantedAt: now.getTime(),
        lastDrinkAt: now.getTime(),
        bloomed: false,
        bloomedAt: null,
        remindersSent: 0,
        seed: seed,
        hue: Math.floor(Util.range(rnd, 92, 148)),
        paletteIndex: Math.floor(rnd() * Plant.PALETTES.length),
        species: Garden.speciesFor(seed)
      };
    },

    ensureToday() {
      const now = new Date();
      const key = Util.dayKey(now);
      App.isNewDay = false;
      if (App.state.today && App.state.today.dayKey !== key) {
        App.finalizeDay(App.state.today, key);
        App.state.today = null;
        App.isNewDay = true;
      }
      if (!App.state.today) {
        App.state.today = App.createDay(key, now);
      }
      App.state.lastSeenDay = key;
      Store.save();
    },

    finalizeDay(prev, newKey) {
      const gap = Util.daysBetween(prev.dayKey, newKey);
      const already = App.state.history.some((h) => h.dayKey === prev.dayKey);
      if (prev.bloomed) {
        if (!App.state.garden.some((g) => g.dayKey === prev.dayKey)) {
          const index = App.state.garden.length;
          const entry = Garden.add({
            dayKey: prev.dayKey,
            seed: prev.seed,
            hue: prev.hue,
            paletteIndex: prev.paletteIndex,
            species: prev.species
          }, index);
          App.state.garden.push(entry);
          App.state.totalBlooms = (App.state.totalBlooms || 0) + 1;
        }
        App.state.streak = (gap === 1) ? (App.state.streak || 0) + 1 : 1;
      } else {
        App.state.streak = 0;
      }
      App.state.bestStreak = Math.max(App.state.bestStreak || 0, App.state.streak || 0);
      if (!already) {
        App.state.history.push({
          dayKey: prev.dayKey, ml: prev.ml, glasses: prev.glasses, bloomed: !!prev.bloomed
        });
      }
      if (App.state.history.length > 120) App.state.history = App.state.history.slice(-120);
      Store.save();
    },

    rollDay() {
      const now = new Date();
      const key = Util.dayKey(now);
      if (App.state.today && App.state.today.dayKey === key) return;
      App.finalizeDay(App.state.today, key);
      App.state.today = App.createDay(key, now);
      Store.save();

      Garden.render(App.state.garden.slice(-60));
      Effects.refreshInsects(App.state.garden.length);
      App.setupPlant();
      App.updateAll();
      App.onNewDay(true);
    },

    onNewDay(animate) {
      const r = App.dom.pot.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const soilY = r.top + r.height * 0.15;
      if (animate && !Util.prefersReducedMotion()) {
        Effects.plantPuff(cx, soilY);
        App.plant.gustNow();
      }
      App.say(Util.pick(Math.random, SPEECH.newDay), 5200);
      if (App.state.settings.sound) Sound.play('newday');
      Notify.toast('🌱', 'Un nuovo seme è piantato. Aspetta il suo primo bicchiere.', { duration: 5200 });
    },

    /* --------------------------------------------------- plant setup */
    setupPlant() {
      const t = App.state.today;
      const p = Store.progress();
      App.plant = new Plant(App.dom.mainPlant, t.seed, {
        hue: t.hue,
        palette: Plant.PALETTES[t.paletteIndex % Plant.PALETTES.length],
        headType: HEAD_BY_SPECIES[t.species] || 'layered',
        progress: Math.max(p, 0.06),
        health: App.computeHealth(),
        bloom: t.bloomed
      });
      App.plant.snap();
    },

    computeHealth(now) {
      const t = App.state.today;
      if (!t) return 1;
      if (t.bloomed) return 1;
      const nowMs = now ? now.getTime() : Date.now();
      const interval = Math.max(15, App.state.settings.reminderMin) * 60000;
      const elapsed = nowMs - (t.lastDrinkAt || t.plantedAt || nowMs);
      const ratio = elapsed / interval;
      if (ratio <= 1) return 1;
      return Util.clamp(1 - (ratio - 1) / 2.6, 0.1, 1);
    },

    /* --------------------------------------------------- core actions */
    logGlass() {
      const t = App.state.today;
      const s = App.state.settings;
      t.glasses += 1;
      t.ml += s.glassMl;
      t.lastDrinkAt = Date.now();
      t.remindersSent = 0;
      App.state.totalGlasses = (App.state.totalGlasses || 0) + 1;

      const goalG = Store.goalGlasses();
      let newlyBloomed = false;
      if (!t.bloomed && t.glasses >= goalG) {
        t.bloomed = true;
        t.bloomedAt = Date.now();
        newlyBloomed = true;
      }
      Store.save();

      App.drinkFeedback(newlyBloomed);
      App.updateAll();

      if (newlyBloomed) {
        App.react('bloom', 'bounce', 1500);
        App.handleBloom();
      } else {
        App.react('joy', 'bounce', 900);
        App.sayRandom('drink');
      }
    },

    undoGlass() {
      const t = App.state.today;
      if (t.glasses <= 0) return;
      t.glasses -= 1;
      t.ml = Math.max(0, t.ml - App.state.settings.glassMl);
      t.lastDrinkAt = Date.now();
      if (App.state.totalGlasses > 0) App.state.totalGlasses -= 1;
      if (t.bloomed && t.glasses < Store.goalGlasses()) {
        t.bloomed = false;
        t.bloomedAt = null;
        App.removeTransplant(t.dayKey);
      }
      Store.save();
      Sound.play('undo');
      Util.vibrate(12);
      App.react('sad', 'wiggle', 850);
      App.hideBloomBanner();
      App.sayRandom('undo');
      App.updateAll();
    },

    drinkFeedback(newlyBloomed) {
      const pr = App.dom.pot.getBoundingClientRect();
      const mr = App.dom.mainPlant.getBoundingClientRect();
      const cx = pr.left + pr.width / 2;
      const soilY = pr.top + pr.height * 0.14;
      const tipY = mr.top + mr.height * 0.22;
      Effects.pour(cx, soilY, tipY, '+' + App.state.settings.glassMl + ' ml');
      if (!newlyBloomed) {
        App.plant.gustNow();
        App.dom.companion.classList.remove('sparkle');
        void App.dom.companion.offsetWidth;
        App.dom.companion.classList.add('sparkle');
        clearTimeout(App._sparkleTimer);
        App._sparkleTimer = setTimeout(() => App.dom.companion.classList.remove('sparkle'), 1100);
      }
      if (App.state.settings.sound) Sound.play(newlyBloomed ? 'bloom' : 'drink');
      Util.vibrate(newlyBloomed ? [18, 40, 18, 40, 60] : 18);

      const ripple = App.dom.drinkRipple;
      ripple.classList.remove('go');
      void ripple.offsetWidth;
      ripple.classList.add('go');
    },

    handleBloom() {
      const t = App.state.today;
      App.plant.setBloom(true);
      App.dom.companion.classList.add('blooming');
      Effects.celebrate();
      App.sayRandom('bloom', 6000);
      App.showBloomBanner('Hai raggiunto il tuo obiettivo! 🌸',
        Util.fmtLiters(t.ml) + ' L — il tuo compagno sta fiorendo nel giardino');
      Notify.toast('🌸', 'Il tuo compagno è fiorito! Si sta piantando nel tuo giardino.', { duration: 6000 });
      if (App.state.settings.notifications) {
        Notify.send('Una fioritura! 🌸', 'Hai raggiunto il tuo obiettivo — il tuo compagno sta sbocciando.', 'bloom-' + t.dayKey);
      }
      if (App.state.garden.length === 0) Effects.spawnInsects(3);
      App.transplantBloom();
    },

    /* the moment of flourishing: the bloom flies into the garden */
    transplantBloom() {
      const t = App.state.today;
      if (!t.bloomed) return;
      if (App.state.garden.some((g) => g.dayKey === t.dayKey)) return;
      const index = App.state.garden.length;
      const entry = Garden.add({
        dayKey: t.dayKey, seed: t.seed, hue: t.hue,
        paletteIndex: t.paletteIndex, species: t.species
      }, index);
      App.state.garden.push(entry);
      App.state.totalBlooms = (App.state.totalBlooms || 0) + 1;
      Store.save();
      App.dom.gardenCountNum.textContent = App.state.garden.length;

      const mr = App.dom.mainPlant.getBoundingClientRect();
      const origin = { left: mr.left + mr.width / 2 - 22, top: mr.top + mr.height * 0.22, width: 44, height: 8 };
      App.say('Guarda — mi sto piantando nel giardino! 🌼', 2600);
      setTimeout(() => {
        // the user may have undone the bloom, or midnight may have re-rendered the garden
        if (!App.state.garden.some((g) => g.dayKey === entry.dayKey)) return;
        if (Garden.host && Garden.host.querySelector('.garden-plant[data-day="' + entry.dayKey + '"]')) return;
        Garden.transplant(entry, origin, () => {
          Effects.refreshInsects(App.state.garden.length);
          Notify.toast('🌼', 'Una nuova fioritura ha trovato casa nel giardino.', { duration: 4600, tag: 'planted', cooldown: 1000 });
        });
      }, 220);
    },

    removeTransplant(dayKey) {
      const idx = App.state.garden.findIndex((g) => g.dayKey === dayKey);
      if (idx < 0) return;
      App.state.garden.splice(idx, 1);
      App.state.totalBlooms = Math.max(0, (App.state.totalBlooms || 1) - 1);
      if (Garden.host) Garden.remove(dayKey);
      Effects.refreshInsects(App.state.garden.length);
      App.dom.gardenCountNum.textContent = App.state.garden.length;
      Store.save();
    },

    afterGoalChange() {
      Store.save();
      const t = App.state.today;
      if (!t.bloomed && t.glasses >= Store.goalGlasses()) {
        t.bloomed = true;
        t.bloomedAt = Date.now();
        Store.save();
        App.handleBloom();
      } else if (t.bloomed && t.glasses < Store.goalGlasses()) {
        t.bloomed = false;
        App.removeTransplant(t.dayKey);
        App.dom.companion.classList.remove('blooming');
      }
      App.updateAll();
    },

    /* --------------------------------------------------- reminders */
    secondTick() {
      if (App.onboarding) return;   // keep the onboarding screen perfectly still
      const now = new Date();
      Sky.update(now);
      App.updateClock(now);
      App.updateFace();
      App.updateLastDrink(now);
      App.checkReminder(now);
      App.maybeBlink();
      App.idleFace();
      if (App.paused) return;
    },

    checkReminder(now) {
      const t = App.state.today;
      if (!t || t.bloomed) return;
      const interval = Math.max(15, App.state.settings.reminderMin) * 60000;
      const elapsed = now.getTime() - t.lastDrinkAt;
      const due = (t.remindersSent + 1) * interval;
      if (elapsed < due || t.remindersSent >= 10) return;
      if (Sky.isNight(now)) return; // let everyone rest
      t.remindersSent += 1;
      Store.save();
      const msg = Util.pick(Math.random, SPEECH.thirsty);
      Notify.toast('💧', msg, { tag: 'reminder', cooldown: 15000, duration: 5200 });
      if (App.state.settings.notifications) {
        Notify.send('La tua piantina ha sete 💧', 'Un bicchiere d’acqua la renderebbe felicissima.', 'reminder');
      }
      App.say(msg, 5200);
      App.react('thirsty', null, 1800);
    },

    maybeBlink() {
      if (Math.random() < 0.22 && !App.plant.bloom && App.dom.eyes) {
        App.dom.eyes.classList.add('closed');
        setTimeout(() => App.dom.eyes.classList.remove('closed'), 150);
      }
    },

    /* little idle glances, so the face feels alive without moving the scene */
    idleFace() {
      if (App.faceOverride) return;
      if (Math.random() < 0.07) {
        App.lookDir = ['left', 'right', 'up'][Math.floor(Math.random() * 3)];
        App.lookUntil = performance.now() + 1200 + Math.random() * 1600;
      }
    },

    /* --------------------------------------------------- UI updates */
    updateAll() {
      Store.state = App.state;
      const t = App.state.today;
      const s = App.state.settings;
      const p = Store.progress();
      const d = App.dom;

      d.meterValue.textContent = Util.fmtLiters(t.ml);
      d.meterGoal.textContent = '/ ' + s.goalLiters.toFixed(2).replace('.', ',') + ' L';
      d.meterFill.style.height = (p * 100).toFixed(1) + '%';
      d.meterBarFill.style.width = (p * 100).toFixed(1) + '%';
      d.meter.classList.toggle('near', p >= 0.66 && p < 1);
      d.meter.classList.toggle('full', p >= 1);
      d.drinkMl.textContent = '+' + s.glassMl + ' ml';
      d.undoBtn.disabled = t.glasses <= 0;
      d.drinkBtn.classList.toggle('done', t.bloomed);
      d.gardenCountNum.textContent = App.state.garden.length;

      d.companionTag.textContent = t.bloomed
        ? 'Fiorito oggi 🌸'
        : 'Giorno ' + (App.state.history.length + 1) + ' · ' + t.glasses + '/' + Store.goalGlasses() + ' bicchieri';

      App.updateMeterSub(p);
      App.updateClock(new Date());
      App.updateLastDrink(new Date());
      App.updateStats();

      if (App.plant) {
        App.plant.setProgress(Math.max(p, 0.06));
        App.plant.setHealth(App.computeHealth());
        App.plant.setBloom(t.bloomed);
        if (t.bloomed) d.companion.classList.add('blooming');
        else d.companion.classList.remove('blooming');
      }
      App.updateFace();
      App.queueLayout();
      Store.save();
    },

    updateMeterSub(p) {
      const t = App.state.today;
      const h = App.plant ? App.plant.health : 1;
      let msg;
      if (t.bloomed) msg = 'Hai raggiunto il tuo obiettivo — una fioritura per te! 🌸';
      else if (h < 0.5) msg = 'Un sorso aiuterebbe il tuo amico a riprendersi…';
      else if (t.glasses === 0) msg = 'Iniziamo con un sorso';
      else if (p < 0.4) msg = 'Bene — ogni bicchiere conta';
      else if (p < 0.7) msg = 'Più di metà strada!';
      else if (p < 1) msg = 'Così vicino alla fioritura 🌱';
      else msg = 'Obiettivo raggiunto!';
      App.dom.meterSub.textContent = msg;
    },

    updateClock(now) {
      App.dom.greeting.textContent = Sky.greeting(now);
      try {
        App.dom.dateline.textContent = now.toLocaleDateString('it-IT', {
          weekday: 'long', month: 'long', day: 'numeric'
        });
      } catch (_) {
        App.dom.dateline.textContent = now.toDateString();
      }
    },

    updateLastDrink(now) {
      const t = App.state.today;
      const el = App.dom.lastDrink;
      if (t.bloomed) {
        el.textContent = 'Il tuo compagno sta fiorendo — qualcosa in più è un regalo 💛';
        el.classList.remove('thirsty');
        return;
      }
      const mins = Util.minutesSince(t.lastDrinkAt, now.getTime());
      const h = App.plant ? App.plant.health : 1;
      if (t.glasses === 0 && mins < 1) {
        el.textContent = 'Il tuo piccolo amico aspetta un sorso';
      } else {
        el.textContent = 'Ultimo bicchiere ' + Util.fmtDuration(mins);
      }
      el.classList.toggle('thirsty', h < 0.6);
    },

    updateStats() {
      const d = App.dom;
      d.statGlasses.textContent = App.state.today.glasses;
      d.statGoal.textContent = Store.goalGlasses();
      d.statStreak.textContent = App.state.streak || 0;
      d.statBlooms.textContent = App.state.garden.length;
      const best = App.state.bestStreak || 0;
      const n = App.state.garden.length;
      d.statTip.textContent =
        'Hai fatto crescere ' + n + (n === 1 ? ' amico fiorito' : ' amici fioriti') +
        (best > 0 ? '. La tua serie migliore è di ' + best + (best === 1 ? ' giorno' : ' giorni') + '.' : '.') +
        ' Ogni bicchiere è un gesto di cura per il tuo corpo.';
    },

    /* --------------------------------------------------- pot face */
    /* --------------------------------------------------- reactions */
    react(mood, anim, ms) {
      ms = ms || 900;
      App.faceOverride = { mood: mood, until: performance.now() + ms };
      const pot = App.dom.pot;
      if (pot && anim) {
        pot.classList.remove('bounce', 'wiggle', 'shake');
        void pot.offsetWidth;
        pot.classList.add(anim);
        clearTimeout(App._potAnim);
        App._potAnim = setTimeout(() => pot.classList.remove('bounce', 'wiggle', 'shake'), ms + 60);
      }
      if (mood === 'joy' || mood === 'bloom') {
        const r = pot ? pot.getBoundingClientRect() : null;
        if (r) Effects.sparkle(r.left + r.width / 2, r.top + r.height * 0.35, 4);
      }
      App.updateFace();
      clearTimeout(App._reactTimer);
      App._reactTimer = setTimeout(() => { App.faceOverride = null; App.updateFace(); }, ms + 40);
    },

    /* Keep the companion in the space between the liter meter and the
       controls, so the counter never covers the bloom. */
    layout() {
      const d = App.dom;
      if (!d || !d.meter || !d.controls || !d.pot || !d.companion) return;
      const vh = window.innerHeight;
      const root = document.documentElement.style;
      const meterRect = d.meter.getBoundingClientRect();
      const controlsRect = d.controls.getBoundingClientRect();
      const potWrap = d.pot.parentElement;
      const potH = potWrap ? potWrap.getBoundingClientRect().height : 160;
      const tagH = d.companionTag ? d.companionTag.offsetHeight : 0;
      const overlap = potH * 0.10;
      const available = controlsRect.top - meterRect.bottom;
      root.setProperty('--companion-scale', '1');
      let plantH = Util.clamp(available - potH - tagH + overlap - 14, 72, 340);
      root.setProperty('--controls-h', Math.round(controlsRect.height) + 'px');
      root.setProperty('--companion-bottom', Math.round(vh - controlsRect.top + 8) + 'px');
      root.setProperty('--plant-wrap-h', Math.round(plantH) + 'px');

      // guarantee the companion never slides under the liter meter
      for (let i = 0; i < 4; i++) {
        const overlapPx = meterRect.bottom - d.companion.getBoundingClientRect().top;
        if (overlapPx <= 0) break;
        plantH -= overlapPx + 4;
        if (plantH < 56) break;
        root.setProperty('--plant-wrap-h', Math.round(plantH) + 'px');
      }

      // on very short screens (e.g. zoomed in) shrink the whole companion too,
      // so it can never be pushed off the top and disappear
      const naturalH = plantH + potH - overlap + tagH;
      const fitScale = naturalH > 0 ? Math.min(1, (available - 4) / naturalH) : 1;
      root.setProperty('--companion-scale', Math.max(0.4, fitScale).toFixed(3));

      // place the meadow either side of the pot's real width, on the grass
      const potRect = d.pot.getBoundingClientRect();
      const vw = Math.max(1, window.innerWidth);
      const clearHalf = (potRect.width / 2) / vw + 0.045;
      if (Garden.clearHalf == null || Math.abs(Garden.clearHalf - clearHalf) > 0.025) {
        Garden.clearHalf = clearHalf;
        if (App.state && App.state.garden && App.state.garden.length) {
          Garden.render(App.state.garden.slice(-60));
        }
      } else {
        Garden.clearHalf = clearHalf;
      }
    },

    onResize() {
      clearTimeout(App._resizeTimer);
      App._resizeTimer = setTimeout(() => App.layout(), 120);
    },

    queueLayout() {
      if (App._layoutQueued) return;
      App._layoutQueued = true;
      requestAnimationFrame(() => { App._layoutQueued = false; App.layout(); });
    },

    /* --------------------------------------------------- bloom banner */
    showBloomBanner(text, sub) {
      const b = App.dom.bloomBanner;
      if (!b) return;
      b.innerHTML = '<div class="bb-title">' + text + '</div>' +
        (sub ? '<div class="bb-sub">' + sub + '</div>' : '');
      b.classList.add('show');
      clearTimeout(App._bannerTimer);
      App._bannerTimer = setTimeout(() => b.classList.remove('show'), 3800);
    },

    hideBloomBanner() {
      if (App.dom.bloomBanner) App.dom.bloomBanner.classList.remove('show');
    },

    updateFace() {
      const d = App.dom;
      if (!d.mouth) return;
      const t = App.state.today;
      const h = App.plant ? App.plant.health : 1;
      const now = performance.now();
      let mood;
      if (App.faceOverride && now < App.faceOverride.until) {
        mood = App.faceOverride.mood;
      } else {
        App.faceOverride = null;
        if (t.bloomed) mood = 'bloom';
        else if (h < 0.45) mood = 'sick';
        else if (h < 0.8) mood = 'thirsty';
        else if (Store.progress() >= 0.6) mood = 'smile';
        else mood = 'content';
      }

      const mouthKey = (mood === 'bloom' || mood === 'joy') ? 'big' : mood;
      d.mouth.setAttribute('d', MOUTHS[mouthKey] || MOUTHS.content);

      const eyes = d.eyes;
      eyes.classList.remove('happy', 'joy', 'look-left', 'look-right', 'look-up');
      if (mood === 'bloom' || mood === 'joy') eyes.classList.add('joy');
      else if (mood === 'smile') eyes.classList.add('happy');
      if (App.lookDir && now < App.lookUntil) eyes.classList.add('look-' + App.lookDir);

      const showBrows = (mood === 'sick' || mood === 'thirsty');
      d.brows.forEach((b) => b && b.setAttribute('opacity', showBrows ? '0.85' : '0'));
      if (mood === 'sick') {
        d.brows[0] && d.brows[0].setAttribute('d', 'M60 78 Q74 70 88 80');
        d.brows[1] && d.brows[1].setAttribute('d', 'M112 80 Q126 70 140 78');
      } else {
        d.brows[0] && d.brows[0].setAttribute('d', 'M60 74 Q74 67 88 74');
        d.brows[1] && d.brows[1].setAttribute('d', 'M112 74 Q126 67 140 74');
      }
      if (d.sweat) d.sweat.setAttribute('opacity', mood === 'sick' ? '0.9' : '0');
      if (d.blush) d.blush.classList.toggle('pulse', mood === 'joy' || mood === 'bloom');
    },

    /* --------------------------------------------------- speech */
    say(text, ms) {
      const el = App.dom.speech;
      el.textContent = text;
      el.classList.add('show');
      clearTimeout(App._sayTimer);
      App._sayTimer = setTimeout(() => el.classList.remove('show'), ms || 4000);
    },
    sayRandom(kind, ms) {
      const arr = SPEECH[kind] || SPEECH.idle;
      App.say(Util.pick(Math.random, arr), ms);
    },

    /* --------------------------------------------------- sheets */
    openSheet(id) {
      const el = document.getElementById(id);
      if (el) el.hidden = false;
      Sound.play('tap');
    },
    closeSheet(id) {
      const el = document.getElementById(id);
      if (el) el.hidden = true;
    },
    openStats() {
      App.updateStats();
      App.openSheet('statsSheet');
      if (App.state.settings.sound) Sound.play('tap');
    },

    toggleNotifications() {
      const d = App.dom;
      const on = d.notifyToggle.getAttribute('aria-checked') !== 'true';
      if (on) {
        Notify.request().then((perm) => {
          const granted = perm === 'granted';
          d.notifyToggle.setAttribute('aria-checked', String(granted));
          App.state.settings.notifications = granted;
          Store.save();
          if (!granted) Notify.toast('🔔', 'I promemoria richiedono il permesso per le notifiche. Puoi attivarlo più tardi.', {});
          else Notify.toast('🔔', 'Ora il tuo compagno può chiamarti.', {});
        });
      } else {
        d.notifyToggle.setAttribute('aria-checked', 'false');
        App.state.settings.notifications = false;
        Store.save();
      }
    },

    resetAll() {
      if (!confirm('Iniziare un giardino nuovo? Tutte le tue fioriture andranno perse.')) return;
      Store.reset();
      location.reload();
    },

    /* --------------------------------------------------- welcome */
    openWelcome() {
      const d = App.dom;
      d.welcome.hidden = false;
      d.welcomeGoal.value = App.state.settings.goalLiters;
      d.welcomeGoalOut.textContent = App.state.settings.goalLiters.toFixed(1).replace('.', ',') + ' L';
      App.buildWelcomeArt();
    },

    buildWelcomeArt() {
      const el = App.dom.welcomeArt;
      const card = App.dom.welcome ? App.dom.welcome.querySelector('.welcome-card') : null;
      if (!el || el.dataset.built) return;
      el.dataset.built = '1';
      const NS = 'http://www.w3.org/2000/svg';
      const svgEl = document.createElementNS(NS, 'svg');
      svgEl.setAttribute('viewBox', '0 0 220 300');
      svgEl.setAttribute('xmlns', NS);
      svgEl.setAttribute('opacity', '0.16');
      const demo = new Plant(svgEl, 12345, { hue: 128, progress: 1, bloom: true, palette: Plant.PALETTES[0] });
      demo.snap();
      // use the plant as the card's *background* so it can never sit on top of the text
      try {
        const markup = new XMLSerializer().serializeToString(svgEl);
        const uri = 'url("data:image/svg+xml;charset=utf-8,' + encodeURIComponent(markup) + '")';
        if (card) card.style.backgroundImage = uri;
      } catch (_) { /* background is optional */ }
    },

    syncSettingsUI() {
      const s = App.state.settings, d = App.dom;
      d.goalRange.value = s.goalLiters;
      d.goalOut.textContent = Number(s.goalLiters).toFixed(1).replace('.', ',');
      d.glassRange.value = s.glassMl;
      d.glassOut.textContent = s.glassMl;
      d.remindRange.value = s.reminderMin;
      d.remindOut.textContent = s.reminderMin;
      d.notifyToggle.setAttribute('aria-checked', String(!!s.notifications));
      d.soundToggle.setAttribute('aria-checked', String(!!s.sound));
      d.drinkMl.textContent = '+' + s.glassMl + ' ml';
    },

    finishWelcome() {
      const d = App.dom;
      App.state.settings.goalLiters = parseFloat(d.welcomeGoal.value) || 2;
      App.state.settings.onboarded = true;
      Store.save();
      d.welcome.hidden = true;
      App.onboarding = false;
      if (App._welcomeRaf) { cancelAnimationFrame(App._welcomeRaf); App._welcomeRaf = 0; }
      App.setupPlant();
      App.updateAll();
      App.layout();
      setTimeout(() => App.layout(), 300);
      setTimeout(() => App.onNewDay(true), 350);
      if (App.state.settings.notifications) Notify.request();
    },

    /* --------------------------------------------------- loop */
    startLoop() {
      let last = performance.now();
      const tick = (ts) => {
        const dt = Math.min(0.06, (ts - last) / 1000) || 0.016;
        last = ts;
        if (!App.paused && !App.onboarding) {
          if (App.plant) App.plant.update(dt);
          Effects.tick(dt, new Date(), App.state.garden.length, App.state.today.bloomed);
        }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }
  };

  global.App = App;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', App.init);
  } else {
    App.init();
  }
})(window);
