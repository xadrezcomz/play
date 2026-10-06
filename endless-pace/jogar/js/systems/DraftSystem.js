// DraftSystem — vácuo (GDD §24): correndo logo atrás de outro corredor, o
// vento é menor: gasta menos energia e ganha um pouquinho de velocidade.
(function (EP) {
  'use strict';
  var U = EP.util;

  function DraftSystem(cfg) { this.cfg = cfg; this.reset(); }
  var P = DraftSystem.prototype;

  P.reset = function () { this.amount = 0; this.active = false; this.target = null; };

  // npcs: lista do NPCManager (pool) · player: { x, z } · speed: km/h do jogador
  P.update = function (dt, npcs, player, speed) {
    var c = this.cfg, best = null, bestDz = 99;
    if (speed >= c.minSpeed) {
      for (var i = 0; i < npcs.length; i++) {
        var n = npcs[i];
        if (!n.active) continue;
        var dz = player.z - n.z;   // > 0: o corredor está à frente
        if (dz >= c.behind[0] && dz <= c.behind[1] && Math.abs(n.x - player.x) <= c.side && dz < bestDz) { best = n; bestDz = dz; }
      }
    }
    this.target = best;
    this.amount = U.clamp(this.amount + (best ? dt : -dt * 2) / c.rampIn, 0, 1);
    var was = this.active;
    this.active = this.amount > 0.5;
    if (this.active !== was) EP.events.emit(this.active ? 'draft_started' : 'draft_ended', {});
    return this.amount;
  };

  P.consumption = function () { return U.lerp(1, this.cfg.consumption, this.amount); };
  P.speedBonus = function () { return this.cfg.speedBonus * this.amount; };

  EP.DraftSystem = DraftSystem;
})(window.EP);
