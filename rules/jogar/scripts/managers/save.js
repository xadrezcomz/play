// SaveManager: progresso local (localStorage). Grava a cada mudança, então
// fechar o app nunca perde nada. Se o armazenamento falhar (aba anônima,
// bloqueio), o jogo continua funcionando só na memória.
(function () {
  'use strict';
  var R = window.RULES;
  var KEY = 'rules.save.v1';

  function prefersReduced() {
    try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; }
  }

  function defaults() {
    return {
      version: 1,
      unlockedUpTo: null,   // id da última fase desbloqueada
      lastLevel: null,      // última fase aberta
      completed: {},        // id → true
      attempts: {},         // id → número de tentativas
      hints: {},            // id → maior nível de dica visto (1–3)
      settings: {
        music: true,
        sfx: true,
        vibration: true,
        reduceMotion: prefersReduced(),
        lang: null
      }
    };
  }

  R.Save = {
    data: defaults(),

    load: function () {
      try {
        var raw = localStorage.getItem(KEY);
        if (raw) {
          var d = JSON.parse(raw), base = defaults();
          Object.keys(base).forEach(function (k) { if (d[k] == null) d[k] = base[k]; });
          d.settings = Object.assign(base.settings, d.settings);
          this.data = d;
        }
      } catch (e) { this.data = defaults(); }
      return this.data;
    },

    write: function () {
      try { localStorage.setItem(KEY, JSON.stringify(this.data)); } catch (e) { /* sem armazenamento */ }
    },

    reset: function () {
      var lang = this.data.settings.lang;
      this.data = defaults();
      this.data.settings.lang = lang;
      this.write();
    },

    isCompleted: function (id) { return !!this.data.completed[id]; },
    markCompleted: function (id) { this.data.completed[id] = true; this.write(); },
    addAttempt: function (id) {
      this.data.attempts[id] = (this.data.attempts[id] || 0) + 1;
      this.write();
      return this.data.attempts[id];
    },
    attempts: function (id) { return this.data.attempts[id] || 0; },
    hintTier: function (id) { return this.data.hints[id] || 0; },
    setHintTier: function (id, n) {
      if (n > this.hintTier(id)) { this.data.hints[id] = n; this.write(); }
    },
    setLast: function (id) { this.data.lastLevel = id; this.write(); },
    setUnlocked: function (id) { this.data.unlockedUpTo = id; this.write(); },
    setting: function (k) { return this.data.settings[k]; },
    setSetting: function (k, v) { this.data.settings[k] = v; this.write(); }
  };
})();
