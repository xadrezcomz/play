// EquipmentManager — soma os atributos dos itens equipados e traduz em efeito
// na corrida (GDD §38–39, §43). Itens ajudam, mas a habilidade continua valendo.
(function (EP) {
  'use strict';
  var STATS = ['speed', 'energy', 'recovery', 'flow', 'flowWindow', 'flowBonus', 'efficiency', 'offline'];

  function EquipmentManager(items, effects) {
    this.items = items || [];
    this.fx = effects || {};
    this.byId = {};
    for (var i = 0; i < this.items.length; i++) this.byId[this.items[i].id] = this.items[i];
  }
  var P = EquipmentManager.prototype;
  EquipmentManager.STATS = STATS;

  P.item = function (id) { return this.byId[id] || null; };

  P.totals = function (equipped) {
    var t = {}, k;
    STATS.forEach(function (s) { t[s] = 0; });
    for (k in equipped || {}) {
      var it = this.byId[equipped[k]];
      if (!it || !it.stats) continue;
      for (var s in it.stats) if (t[s] !== undefined) t[s] += it.stats[s];
    }
    return t;
  };

  P.effects = function (t) {
    var f = this.fx;
    var g = function (k) { return (t && t[k]) || 0; };
    var eff = Math.min(f.efficiencyCap || 0.35, g('efficiency') * (f.efficiency || 0));
    return {
      speedMult: 1 + g('speed') * (f.speed || 0),
      energyBonus: g('energy') * (f.energy || 0),
      recoveryMult: 1 + g('recovery') * (f.recovery || 0),
      flowGainMult: 1 + g('flow') * (f.flow || 0),
      flowDecayMult: Math.max(0.3, 1 - g('flow') * (f.flow || 0)),
      windowMult: 1 + g('flowWindow') * (f.flowWindow || 0),
      flowCoinMult: 1 + g('flowBonus') * (f.flowBonus || 0),
      consumptionMult: 1 - eff,
      offlineHours: g('offline') * (f.offline || 0),
      offlineRateMult: 1 + g('offline') * (f.offlineRate || 0)
    };
  };

  // visual de cada espaço para o corredor (null = roupa base da criação)
  P.visualFor = function (equipped) {
    var out = {}, self = this;
    ['head', 'eyes', 'ears', 'shirt', 'shorts', 'shoes', 'wrist'].forEach(function (slot) {
      var it = self.byId[(equipped || {})[slot]];
      out[slot] = it && it.visual ? it.visual : null;
    });
    return out;
  };

  // diferença de atributos se o item candidato entrasse no lugar do atual
  P.compare = function (equipped, candidateId) {
    var cand = this.byId[candidateId];
    if (!cand) return {};
    var next = {};
    for (var k in equipped || {}) next[k] = equipped[k];
    next[cand.slot] = candidateId;
    var a = this.totals(equipped), b = this.totals(next), d = {};
    STATS.forEach(function (s) { d[s] = b[s] - a[s]; });
    return d;
  };

  EP.EquipmentManager = EquipmentManager;
})(window.EP);
