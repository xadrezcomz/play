// SaveManager — progresso salvo só no aparelho (GDD §48).
//
// Web: localStorage (dados simples, um JSON pequeno). No app, a mesma chave
// pode ir para um arquivo local. Sem servidor: sem conta e sem ranking, o
// que é aceitável no MVP (§49). O formato tem versão: saves antigos são
// completados com os campos novos em migrate().
(function (EP) {
  'use strict';
  var U = EP.util;
  var KEY = 'endlesspace.save';
  var VERSION = 2;

  function defaults() {
    var app = EP.data.appearance;
    return {
      version: VERSION,
      createdAt: 0,
      lastSeenAt: 0,            // carimbo da última vez que o jogo esteve aberto (progresso offline)
      // RunnerProfile (GDD §73)
      profile: {
        created: false,
        name: '',
        gender: app.defaults.gender,
        appearance: { skin: app.defaults.skin, hairStyle: app.defaults.hairStyle, hairColor: app.defaults.hairColor,
          shirt: app.defaults.shirt, shorts: app.defaults.shorts, shoes: app.defaults.shoes },
        level: 1, xp: 0          // nível do corredor (GDD §55)
      },
      coins: 0,
      stats: { totalDistance: 0, totalTime: 0, overtakes: 0, perfects: 0, runs: 0, challengesCompleted: 0, challenges: {}, flowTime: 0, forks: {},
        pacersCompleted: 0, draftTime: 0, daysPlayed: 0, lastDay: '', itemsBought: 0, biomesVisited: ['cidade'], challengeRecords: {}, offlineDistance: 0 },
      records: { topSpeed: 0, maxFlow: 0, maxCombo: 0, longestRun: 0, mostOvertakes: 0 },
      inventory: [],             // itens comprados (ids)
      equipped: {},              // espaço → id do item
      achievements: {},          // id → quando foi conquistada
      missions: { date: '', list: [] },
      unseen: { achievements: [] },   // conquistas ainda não vistas (selo no botão)
      unlockedBiomes: ['cidade'],
      tutorialDone: false,
      world: { timeOfDay: EP.data.dayNight.startPhase, region: 'cidade' },
      settings: { lang: '', music: true, sfx: true, vibration: true, reduceMotion: false, bigUi: false, quality: 'auto' }
    };
  }

  function migrate(d) {
    if (!d || typeof d !== 'object') return null;
    // versão 2: conquistas viram objeto (id → data) e entram itens, missões e regiões
    if ((d.version || 1) < 2) {
      if (Array.isArray(d.achievements)) d.achievements = {};
    }
    U.fill(d, defaults());
    if (!Array.isArray(d.stats.biomesVisited)) d.stats.biomesVisited = ['cidade'];
    d.version = VERSION;
    return d;
  }

  function SaveManager(storage) {
    this.storage = storage !== undefined ? storage : SaveManager.defaultStorage();
    this.data = null;
    this.available = !!this.storage;
  }
  SaveManager.defaultStorage = function () {
    try {
      var s = window.localStorage, k = KEY + '.teste';
      s.setItem(k, '1'); s.removeItem(k);
      return s;
    } catch (e) { return null; }   // navegação privada ou bloqueado: joga sem salvar
  };
  SaveManager.KEY = KEY;
  SaveManager.defaults = defaults;
  SaveManager.migrate = migrate;
  var P = SaveManager.prototype;

  P.load = function () {
    var d = null;
    if (this.storage) {
      try { d = migrate(JSON.parse(this.storage.getItem(KEY))); } catch (e) { d = null; }
    }
    if (!d) { d = defaults(); d.createdAt = Date.now(); }
    this.data = d;
    return d;
  };

  P.save = function () {
    if (!this.data) return false;
    this.data.lastSeenAt = Date.now();
    if (!this.storage) return false;
    try { this.storage.setItem(KEY, JSON.stringify(this.data)); return true; } catch (e) { return false; }
  };

  P.reset = function () {
    if (this.storage) { try { this.storage.removeItem(KEY); } catch (e) { /* sem acesso */ } }
    var lang = this.data && this.data.settings.lang;
    this.data = defaults();
    this.data.createdAt = Date.now();
    if (lang) this.data.settings.lang = lang;
    return this.data;
  };

  EP.SaveManager = SaveManager;
})(window.EP);
