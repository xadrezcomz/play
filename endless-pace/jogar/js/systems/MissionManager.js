// MissionManager — missões do dia (GDD §56). Sorteio determinístico pela data:
// fechar e abrir o jogo no mesmo dia mostra as mesmas missões. O progresso
// fica no save (missions.list) e vale entre corridas do mesmo dia.
(function (EP) {
  'use strict';
  var U = EP.util;

  function seedOf(str) {
    var h = 2166136261;
    for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }

  function MissionManager(cfg, save) {
    this.cfg = cfg;
    this.save = save;
    this.byId = {};
    for (var i = 0; i < cfg.list.length; i++) this.byId[cfg.list[i].id] = cfg.list[i];
  }
  var P = MissionManager.prototype;

  P.targetFor = function (def, level) {
    var lv = Math.min(level || 1, this.cfg.levelCap || 99) - 1;
    var t = def.base + def.perLevel * lv;
    t = Math.round(t / def.step) * def.step;
    return Math.max(def.step, Math.min(def.max || t, t));
  };

  // gera as missões do dia (uma vez por data)
  P.ensureDay = function (date, level) {
    var m = this.save.missions;
    if (m.date === date && m.list.length) return false;
    var rnd = U.rng(seedOf('missoes:' + date)), self = this;
    var pool = this.cfg.list.filter(function (d) { return (d.minLevel || 1) <= (level || 1); });
    var chosen = [], usedMetric = {};
    while (chosen.length < this.cfg.perDay && pool.length) {
      var i = Math.floor(rnd() * pool.length), d = pool.splice(i, 1)[0];
      if (usedMetric[d.metric]) continue;   // nada de duas missões de distância no mesmo dia
      usedMetric[d.metric] = 1;
      chosen.push(d);
    }
    m.date = date;
    m.bonusClaimed = false;
    m.list = chosen.map(function (d) {
      return { id: d.id, metric: d.metric, mode: d.mode || 'add', target: self.targetFor(d, level), progress: 0, done: false, claimed: false };
    });
    return true;
  };

  P.def = function (mission) { return this.byId[mission.id]; };
  P.list = function () { return this.save.missions.list; };

  // soma (ou pega o maior) e devolve as missões que acabaram de ser cumpridas
  P.track = function (metric, value, mode) {
    var out = [];
    if (!(value > 0)) return out;
    this.save.missions.list.forEach(function (m) {
      if (m.metric !== metric || m.done) return;
      if ((mode || m.mode) === 'max' || m.mode === 'max') m.progress = Math.max(m.progress, value);
      else m.progress += value;
      if (m.progress >= m.target) {
        m.progress = m.target;
        m.done = true;
        out.push(m);
        EP.events.emit('mission_completed', { id: m.id, target: m.target });
      }
    });
    return out;
  };

  P.rewardOf = function (m) { var d = this.byId[m.id]; return d ? d.reward : null; };

  P.claim = function (i) {
    var m = this.save.missions.list[i];
    if (!m || !m.done || m.claimed) return null;
    m.claimed = true;
    return this.rewardOf(m);
  };

  P.allClaimed = function () {
    var l = this.save.missions.list;
    return l.length > 0 && l.every(function (m) { return m.claimed; });
  };

  P.claimBonus = function () {
    var ms = this.save.missions;
    if (ms.bonusClaimed || !this.allClaimed()) return null;
    ms.bonusClaimed = true;
    return this.cfg.bonus;
  };

  P.pending = function () {
    return this.save.missions.list.filter(function (m) { return m.done && !m.claimed; }).length +
      (this.allClaimed() && !this.save.missions.bonusClaimed ? 1 : 0);
  };

  EP.MissionManager = MissionManager;
})(window.EP);
