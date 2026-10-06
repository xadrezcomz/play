// EconomyManager — a moeda única do jogo, COINS (GDD §41).
// Ganha-se por distância, ultrapassagens, FLOW e desafios. Os valores ficam em
// dados/balanceamento.js (economy) e as rotas podem multiplicar (centro +20%).
(function (EP) {
  'use strict';

  function EconomyManager(cfg, save) {
    this.cfg = cfg;
    this.save = save;   // objeto do save (save.coins)
    this.reset();
  }
  var P = EconomyManager.prototype;

  P.reset = function () {
    this.runCoins = 0;
    this._distAcc = 0;
  };

  P.multiplier = function (flowLevel, routeMods) {
    var c = this.cfg;
    var flow = 1 + Math.min(flowLevel || 0, c.flowCoinMaxLevel) * c.flowCoinPerLevel;
    return flow * ((routeMods && routeMods.coins) || 1);
  };

  P.add = function (n, reason) {
    n = Math.round(n);
    if (n <= 0) return 0;
    this.runCoins += n;
    this.save.coins += n;
    EP.events.emit('coins', { amount: n, reason: reason, total: this.save.coins });
    return n;
  };

  // distância percorrida (m) com o multiplicador do momento
  P.addDistance = function (meters, mult) {
    this._distAcc += meters / this.cfg.metersPerCoin * (mult || 1);
    if (this._distAcc >= 1) {
      var n = Math.floor(this._distAcc);
      this._distAcc -= n;
      this.add(n, 'distance');
    }
  };

  EP.EconomyManager = EconomyManager;
})(window.EP);
