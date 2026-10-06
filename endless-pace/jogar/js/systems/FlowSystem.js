// FlowSystem — sequências regulares ativam o FLOW (GDD §8).
//
// PERFECT soma pontos, GREAT segura, GOOD e toques fora do ritmo tiram, e
// ficar sem tocar faz o FLOW escorrer. Os pontos viram níveis (×1, ×2...).
// Quanto maior o nível: menos gasto de energia, um pouco mais de velocidade,
// mais moedas, mais camadas na música e mais sensação de velocidade.
(function (EP) {
  'use strict';

  function FlowSystem(cfg) {
    this.cfg = cfg;
    this.reset();
  }
  var P = FlowSystem.prototype;

  P.reset = function () {
    this.gainMult = this.gainMult || 1;     // boné, rota da orla, chuva: FLOW sobe mais rápido
    this.decayMult = this.decayMult || 1;   // e escorre mais devagar
    this.points = 0;
    this.level = 0;
    this.peak = 0;
    this.timeInFlow = 0;
  };

  P.levelFor = function (points) {
    var th = this.cfg.thresholds, lvl = 0;
    for (var i = 0; i < th.length; i++) if (points >= th[i]) lvl = i + 1;
    if (lvl === th.length) lvl += Math.floor((points - th[th.length - 1]) / this.cfg.extraEvery);
    return Math.min(lvl, this.cfg.maxLevel);
  };

  P._set = function (points) {
    var c = this.cfg, prev = this.level;
    this.points = Math.max(0, Math.min(c.maxPoints, points));
    var lvl = this.levelFor(this.points);
    if (lvl < prev) lvl = Math.max(lvl, Math.min(prev, this.levelFor(this.points + c.hysteresis)));
    this.level = lvl;
    if (lvl > this.peak) this.peak = lvl;
    if (lvl !== prev) {
      if (prev === 0) EP.events.emit('flow_started', { level: lvl });
      else if (lvl === 0) EP.events.emit('flow_lost', { from: prev });
      EP.events.emit('flow_level', { level: lvl, prev: prev });
    }
    return lvl !== prev;
  };

  P.onRating = function (rating) {
    if (!rating) return false;
    var g = this.cfg.gain[rating] || 0;
    return this._set(this.points + (g > 0 ? g * this.gainMult : g));
  };

  P.update = function (dt, idle) {
    if (idle && this.points > 0) this._set(this.points - this.cfg.idleDecay * this.decayMult * dt);
    if (this.level > 0) this.timeInFlow += dt;
  };

  // progresso até o próximo nível (0–1), para a barrinha do FLOW
  P.progress = function () {
    var th = this.cfg.thresholds, lvl = this.levelFor(this.points);
    if (lvl >= this.cfg.maxLevel) return 1;
    var from = lvl === 0 ? 0 : lvl <= th.length ? th[lvl - 1] : th[th.length - 1] + (lvl - th.length) * this.cfg.extraEvery;
    var to = lvl < th.length ? th[lvl] : th[th.length - 1] + (lvl - th.length + 1) * this.cfg.extraEvery;
    return Math.max(0, Math.min(1, (this.points - from) / (to - from)));
  };

  EP.FlowSystem = FlowSystem;
})(window.EP);
