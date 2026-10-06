// EnergySystem — por quanto tempo dá para manter velocidades altas (GDD §10–11).
//
// Caminhada recupera, trote recupera pouco, corrida normal fica estável,
// corrida forte e sprint gastam. Energia zerada nunca encerra a corrida: só
// limita a velocidade até recuperar um pouco.
(function (EP) {
  'use strict';
  var U = EP.util;

  function EnergySystem(cfg, speedCfg) {
    this.cfg = cfg;
    this.speedCfg = speedCfg;
    this.reset();
  }
  var P = EnergySystem.prototype;

  P.reset = function () {
    this.value = this.cfg.max;
    this.exhausted = false;
    this.rate = 0;
  };

  // mods: { flowLevel, energy (rota: 1.1 = +10%), efficiency, recovery (equipamentos, futuro) }
  P.update = function (dt, speedKmh, mods) {
    var c = this.cfg, r = U.table(c.rate, speedKmh);
    var routeMul = (mods && mods.energy) || 1;
    if (r < 0) {
      var lvl = Math.min((mods && mods.flowLevel) || 0, c.flowSavingMaxLevel);
      r *= (1 - lvl * c.flowSavingPerLevel) / routeMul / ((mods && mods.efficiency) || 1);
    } else {
      r *= routeMul * ((mods && mods.recovery) || 1);
    }
    this.rate = r;
    this.value = U.clamp(this.value + r * dt, 0, c.max);
    if (this.value <= 0.01) this.exhausted = true;
    else if (this.exhausted && this.value >= this.speedCfg.lowEnergyUntil) this.exhausted = false;
  };

  P.spend = function (amount) {
    this.value = Math.max(0, this.value - amount);
    if (this.value <= 0.01) this.exhausted = true;
  };

  P.fraction = function () { return this.value / this.cfg.max; };

  EP.EnergySystem = EnergySystem;
})(window.EP);
