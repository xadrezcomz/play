// RunnerController — o corredor do jogador: avança sempre (nunca para) e se
// move de lado com suavidade (GDD §18). Velocidade vem do SpeedSystem.
(function (EP) {
  'use strict';
  var U = EP.util;

  function RunnerController(rig, cfg) {
    this.rig = rig;
    this.cfg = cfg;   // balance.run
    this.reset(0);
  }
  var P = RunnerController.prototype;

  P.reset = function (z) {
    this.x = 0; this.targetX = 0; this.z = z || 0; this.vx = 0;
    this.rig.root.position.set(0, 0, this.z);
    this.rig.root.rotation.set(0, 0, 0);
  };

  // dir: -1 esquerda, +1 direita
  P.nudge = function (dir) {
    var c = this.cfg;
    this.targetX = U.clamp(this.targetX + dir * c.laneStep, -c.laneLimit, c.laneLimit);
  };

  P.goTo = function (x) { this.targetX = U.clamp(x, -this.cfg.laneLimit, this.cfg.laneLimit); };

  // limits: [min, max] no ponto atual (o canteiro da bifurcação divide a rua)
  P.update = function (dt, speedKmh, limits) {
    this.z -= speedKmh / 3.6 * dt;
    var tx = U.clamp(this.targetX, limits[0], limits[1]);
    var nx = U.damp(this.x, tx, this.cfg.lateralSpeed, dt);
    nx = U.clamp(nx, limits[0], limits[1]);
    this.vx = dt > 0 ? (nx - this.x) / dt : 0;
    this.x = nx;
    if (this.targetX < limits[0] || this.targetX > limits[1]) this.targetX = tx;
    this.rig.root.position.set(this.x, 0, this.z);
    this.rig.animate(dt, speedKmh, { lateral: this.vx });
  };

  P.rebase = function (shift) { this.z += shift; this.rig.root.position.z = this.z; };

  EP.RunnerController = RunnerController;
})(window.EP);
