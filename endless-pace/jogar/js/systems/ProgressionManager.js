// ProgressionManager — números da corrida atual, totais da vida do corredor e
// recordes (GDD §53–54). Os totais sobem ao vivo: se a página fechar no meio
// da corrida, o que foi corrido já está no save.
(function (EP) {
  'use strict';

  // recorde → estatística da corrida que o alimenta
  var RECORDS = { topSpeed: 'maxSpeed', maxFlow: 'maxFlow', maxCombo: 'maxCombo', longestRun: 'distance', mostOvertakes: 'overtakes' };

  function ProgressionManager(save) {
    this.save = save;
    this.run = null;
  }
  var P = ProgressionManager.prototype;
  ProgressionManager.RECORDS = RECORDS;

  P.startRun = function () {
    this.run = { distance: 0, time: 0, maxSpeed: 0, overtakes: 0, maxCombo: 0, maxFlow: 0, perfects: 0, coins: 0, challenges: 0, flowTime: 0 };
    this.before = EP.util.copy(this.save.records);
    this.firstRun = !this.save.stats.runs;
    this._nextKm = 1;
  };

  P._record = function (key, value) {
    if (value > (this.save.records[key] || 0)) this.save.records[key] = value;
  };

  P.tick = function (dt, meters, speed) {
    var r = this.run, s = this.save.stats;
    r.distance += meters; r.time += dt;
    s.totalDistance += meters; s.totalTime += dt;
    if (speed > r.maxSpeed) { r.maxSpeed = speed; this._record('topSpeed', speed); }
    this._record('longestRun', r.distance);
    while (r.distance >= this._nextKm * 1000) {
      EP.events.emit('distance_reached', { km: this._nextKm, total: s.totalDistance });
      this._nextKm++;
    }
  };

  P.addPerfect = function () { this.run.perfects++; this.save.stats.perfects++; };

  P.addOvertake = function (combo) {
    var r = this.run;
    r.overtakes++; this.save.stats.overtakes++;
    this._record('mostOvertakes', r.overtakes);
    if (combo > r.maxCombo) { r.maxCombo = combo; this._record('maxCombo', combo); }
  };

  P.setFlow = function (level) {
    if (level > this.run.maxFlow) { this.run.maxFlow = level; this._record('maxFlow', level); }
  };

  P.addFlowTime = function (dt) { this.run.flowTime += dt; this.save.stats.flowTime += dt; };

  // fecha a corrida: quais recordes caíram (na primeira corrida, nenhum: tudo é estreia)
  P.finishRun = function () {
    var r = this.run, before = this.before, news = [];
    this.save.stats.runs++;
    if (!this.firstRun) {
      for (var k in RECORDS) {
        var v = r[RECORDS[k]];
        if (v > 0 && Math.round(v * 10) > Math.round((before[k] || 0) * 10)) news.push(k);   // como aparece na tela (1 casa)
      }
    }
    var summary = { run: r, newRecords: news, firstRun: this.firstRun };
    this.run = null;
    return summary;
  };

  EP.ProgressionManager = ProgressionManager;
})(window.EP);
