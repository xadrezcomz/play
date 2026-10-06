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

  P.max = function () { return this.cfg.max + (this.maxBonus || 0); };   // camisetas aumentam a energia total

  P.reset = function () {
    this.value = this.max();
    this.exhausted = false;
    this.rate = 0;
  };

  // mods: { flowLevel, energy (rota: 1.1 = +10%), consumption (equipamentos, vácuo, subida: multiplica o gasto),
  //         recovery (equipamentos, clima, subida: multiplica a recuperação) }
  P.update = function (dt, speedKmh, mods) {
    var c = this.cfg, r = U.table(c.rate, speedKmh);
    var routeMul = (mods && mods.energy) || 1;
    if (r < 0) {
      var lvl = Math.min((mods && mods.flowLevel) || 0, c.flowSavingMaxLevel);
      r *= (1 - lvl * c.flowSavingPerLevel) / routeMul * ((mods && mods.consumption) || 1);
    } else {
      r *= routeMul * ((mods && mods.recovery) || 1);
    }
    this.rate = r;
    this.value = U.clamp(this.value + r * dt, 0, this.max());
    if (this.value <= 0.01) this.exhausted = true;
    else if (this.exhausted && this.value >= this.speedCfg.lowEnergyUntil) this.exhausted = false;
  };

  P.spend = function (amount) {
    this.value = Math.max(0, this.value - amount);
    if (this.value <= 0.01) this.exhausted = true;
  };

  P.fraction = function () { return this.value / this.max(); };

  EP.EnergySystem = EnergySystem;
})(window.EP);
