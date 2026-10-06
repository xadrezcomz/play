// SpeedSystem — transforma a frequência dos toques em velocidade (GDD §6).
//
// Caminhada 4–6 km/h, trote 7–9, corrida 10–13, forte 14–17, sprint 18+.
// A velocidade persegue o alvo aos poucos: acelera ao tocar e desacelera
// devagar ao parar, até a caminhada mínima.
(function (EP) {
  'use strict';
  var U = EP.util;

  function SpeedSystem(cfg, zones) {
    this.cfg = cfg;
    this.zones = zones;
    this.reset();
  }
  var P = SpeedSystem.prototype;

  P.reset = function () {
    this.value = this.cfg.min;
    this.target = this.cfg.min;
  };

  P.bonus = function (flowLevel) {
    return Math.min(flowLevel || 0, this.cfg.flowBonusMaxLevel) * this.cfg.flowBonusPerLevel;
  };

  P.maxSpeed = function (flowLevel, statSpeed) {
    return this.cfg.maxBase * (1 + this.bonus(flowLevel)) * (statSpeed || 1);
  };

  // freq: toques por segundo · ctx: { flowLevel, exhausted, statSpeed (tênis: multiplica alvo e teto),
  //   speedBonus (km/h somados: descida, rota, vácuo) }
  P.update = function (dt, freq, ctx) {
    var c = this.cfg, lvl = (ctx && ctx.flowLevel) || 0, stat = (ctx && ctx.statSpeed) || 1, add = (ctx && ctx.speedBonus) || 0;
    var target = U.table(c.tapCurve, freq) * (1 + this.bonus(lvl)) * stat;
    target = Math.min(target, this.maxSpeed(lvl, stat));
    if (add && freq > 0) target += add;
    if (ctx && ctx.exhausted) target = Math.min(target, c.lowEnergyCap);
    target = Math.max(target, c.min);
    this.target = target;
    var rate = target > this.value ? c.accel : c.decel * (ctx && ctx.exhausted ? 1.6 : 1);
    var step = rate * dt;
    this.value = Math.abs(target - this.value) <= step ? target : this.value + (target > this.value ? step : -step);
    return this.value;
  };

  P.metersPerSecond = function () { return this.value / 3.6; };

  P.zone = function (v) {
    var speed = v === undefined ? this.value : v, z = this.zones[0];
    for (var i = 0; i < this.zones.length; i++) if (speed >= this.zones[i].from) z = this.zones[i];
    return z.id;
  };

  // 0 na caminhada → 1 no sprint (para câmera e efeitos)
  P.intensity = function () {
    return U.clamp((this.value - this.cfg.min) / (18 - this.cfg.min), 0, 1);
  };

  EP.SpeedSystem = SpeedSystem;
})(window.EP);
