// AchievementManager — avalia as conquistas (GDD §50–52) contra o save.
// Não paga recompensas: só marca e avisa; quem paga é o MetaGame.
(function (EP) {
  'use strict';

  function AchievementManager(defs, save) {
    this.defs = defs || [];
    this.save = save;
  }
  var P = AchievementManager.prototype;

  P.isUnlocked = function (id) { return !!this.save.achievements[id]; };

  // valor atual e alvo de uma condição (para a barra de progresso)
  P.progress = function (def) {
    var c = def.cond || {}, s = this.save, st = s.stats || {}, items = EP.data.items || [];
    var v = 0, target = 1, lower = false;
    if (c.stat) { v = st[c.stat]; if (Array.isArray(v)) v = v.length; target = c.gte; }
    else if (c.record) { v = (s.records || {})[c.record]; target = c.gte; }
    else if (c.recordLte) { v = ((st.challengeRecords || {})[c.recordLte]) || 0; target = c.lte; lower = true; }
    else if (c.level) { v = s.profile.level; target = c.level; }
    else if (c.items) {
      v = s.inventory.filter(function (id) { var it = items.filter(function (x) { return x.id === id; })[0]; return it && !it.starter; }).length;
      target = c.items;
    } else if (c.rarity) {
      v = s.inventory.some(function (id) { var it = items.filter(function (x) { return x.id === id; })[0]; return it && it.rarity === c.rarity; }) ? 1 : 0;
    } else if (c.biomes) { v = (s.unlockedBiomes || []).length; target = c.biomes; }
    else if (c.achievements) { v = Object.keys(s.achievements).length; target = c.achievements; }
    v = v || 0;
    var done = lower ? (v > 0 && v <= target) : v >= target;
    var ratio = lower ? (v > 0 ? Math.min(1, target / v) : 0) : Math.min(1, target ? v / target : 0);
    return { value: v, target: target, ratio: done ? 1 : ratio, done: done, lower: lower };
  };

  P.list = function () {
    var self = this;
    return this.defs.map(function (d) {
      return { def: d, unlocked: self.isUnlocked(d.id), at: self.save.achievements[d.id] || 0, progress: self.progress(d) };
    });
  };

  P.check = function () {
    var got = [], self = this;
    this.defs.forEach(function (d) {
      if (self.isUnlocked(d.id)) return;
      if (self.progress(d).done) {
        self.save.achievements[d.id] = Date.now();
        got.push(d);
        EP.events.emit('achievement_unlocked', { id: d.id, def: d });
      }
    });
    return got;
  };

  P.count = function () { return Object.keys(this.save.achievements).length; };

  EP.AchievementManager = AchievementManager;
})(window.EP);
