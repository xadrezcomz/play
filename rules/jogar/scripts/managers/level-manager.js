// LevelManager: registro das fases (dados), ordem de jogo e capítulos.
// Cada arquivo data/levels/LevelNNN.js chama RULES.registerLevel({...}).
// A ordem jogável fica em data/levels/index.js (RULES.LEVEL_ORDER), então
// dá para montar o MVP, eventos ou capítulos novos sem tocar no engine.
(function () {
  'use strict';
  var R = window.RULES;
  var LEVELS = {};

  R.registerLevel = function (def) { LEVELS[def.id] = def; };

  R.Levels = {
    get: function (id) { return LEVELS[id]; },
    all: function () { return LEVELS; },
    order: function () {
      return (R.LEVEL_ORDER || []).filter(function (id) { return !!LEVELS[id]; });
    },
    index: function (id) { return this.order().indexOf(id); },
    // Número mostrado ao jogador ("FASE 04"): a posição na ordem de jogo.
    number: function (id) { return this.index(id) + 1; },
    next: function (id) {
      var o = this.order(), i = o.indexOf(id);
      return i >= 0 && i < o.length - 1 ? o[i + 1] : null;
    },
    chapter: function (n) {
      return (R.CHAPTERS || []).filter(function (c) { return c.id === n; })[0];
    },
    chapterLevels: function (n) {
      return this.order().filter(function (id) { return LEVELS[id].chapter === n; });
    },
    isChapterStart: function (id) {
      var l = this.chapterLevels(LEVELS[id].chapter);
      return l[0] === id;
    },
    isChapterEnd: function (id) {
      var l = this.chapterLevels(LEVELS[id].chapter);
      return l[l.length - 1] === id;
    },
    isUnlocked: function (id) {
      if (!R.Monetization.isLevelPlayable(id)) return false;
      var o = this.order(), i = o.indexOf(id);
      return i === 0 || R.Save.isCompleted(id) || (i > 0 && R.Save.isCompleted(o[i - 1]));
    },
    // Fase em que o jogador deve continuar.
    current: function () {
      var o = this.order();
      for (var i = 0; i < o.length; i++) if (!R.Save.isCompleted(o[i])) return o[i];
      return o[o.length - 1];
    },
    allDone: function () {
      return this.order().every(function (id) { return R.Save.isCompleted(id); });
    }
  };
})();
