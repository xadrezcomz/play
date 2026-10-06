// LevelSystem — nível e XP do corredor (GDD §55).
(function (EP) {
  'use strict';

  function LevelSystem(cfg, save) {
    this.cfg = cfg;
    this.save = save;
  }
  var P = LevelSystem.prototype;

  P.xpForLevel = function (n) {
    var c = this.cfg.curve;
    return Math.round(c.base * Math.pow(Math.max(1, n), c.exp));
  };

  P.progress = function () {
    var p = this.save.profile, need = this.xpForLevel(p.level);
    return { level: p.level, xp: p.xp, need: need, ratio: Math.min(1, p.xp / need) };
  };

  P.title = function (level) {
    var t = this.cfg.titles || [], out = t[0] ? t[0].text : '';
    for (var i = 0; i < t.length; i++) if ((level || this.save.profile.level) >= t[i].from) out = t[i].text;
    return out;
  };

  P._rewardsFor = function (level) {
    var out = [];
    (this.cfg.rewards || []).forEach(function (r) {
      if (r.every && level % r.every === 0 && r.coins) out.push({ coins: r.scale ? r.coins * level : r.coins });
      if (r.at === level) out.push({ item: r.item, coins: r.coins || 0 });
    });
    return out;
  };

  // soma XP; a cada nível novo paga as moedas e devolve os itens para o chamador
  P.addXp = function (n, reason) {
    var p = this.save.profile, gained = 0, rewards = [];
    if (!(n > 0)) return { levelsGained: 0, rewards: rewards };
    p.xp += n;
    while (p.level < this.cfg.maxLevel && p.xp >= this.xpForLevel(p.level)) {
      p.xp -= this.xpForLevel(p.level);
      p.level++;
      gained++;
      var rw = this._rewardsFor(p.level), self = this;
      rw.forEach(function (r) { if (r.coins) self.save.coins += r.coins; });
      rewards = rewards.concat(rw);
      EP.events.emit('level_up', { level: p.level, rewards: rw, reason: reason });
    }
    return { levelsGained: gained, rewards: rewards };
  };

  EP.LevelSystem = LevelSystem;
})(window.EP);
