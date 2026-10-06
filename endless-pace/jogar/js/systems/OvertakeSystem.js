// OvertakeSystem — conta as ultrapassagens e os combos (GDD §14).
// Quem detecta a ultrapassagem é o NPCManager; aqui ficam a contagem, o combo
// e quantas moedas cada uma vale.
(function (EP) {
  'use strict';

  function OvertakeSystem(cfg) {
    this.cfg = cfg;   // balance.economy
    this.reset();
  }
  var P = OvertakeSystem.prototype;

  P.reset = function () {
    this.total = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.lastAt = -1e9;
  };

  P.onOvertake = function (t) {
    var c = this.cfg;
    this.combo = t - this.lastAt <= c.comboWindow ? this.combo + 1 : 1;
    this.lastAt = t;
    this.total++;
    if (this.combo > this.maxCombo) this.maxCombo = this.combo;
    var coins = c.overtakeCoins + (this.combo > 1 ? c.comboBonus * (this.combo - 1) : 0);
    EP.events.emit('overtake', { total: this.total, combo: this.combo, coins: coins });
    return { total: this.total, combo: this.combo, coins: coins };
  };

  // o combo some quando passa a janela sem ultrapassar ninguém
  P.update = function (t) {
    if (this.combo && t - this.lastAt > this.cfg.comboWindow) this.combo = 0;
  };

  P.comboTimeLeft = function (t) {
    return this.combo ? Math.max(0, 1 - (t - this.lastAt) / this.cfg.comboWindow) : 0;
  };

  EP.OvertakeSystem = OvertakeSystem;
})(window.EP);
