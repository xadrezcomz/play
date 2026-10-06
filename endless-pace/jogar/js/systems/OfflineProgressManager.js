// OfflineProgressManager — o corredor "continua treinando" com o jogo fechado
// (GDD §45–47): uma fração do seu ritmo médio, até um limite de horas que os
// relógios aumentam. Ao voltar: "Enquanto você esteve fora, correu 4,7 km".
(function (EP) {
  'use strict';

  function OfflineProgressManager(cfg) { this.cfg = cfg; }
  var P = OfflineProgressManager.prototype;

  // velocidade média de corrida do jogador (km/h), com um padrão no começo
  P.avgKmh = function (save) {
    var st = save.stats;
    if (st.totalTime > 120 && st.totalDistance > 300) return st.totalDistance / st.totalTime * 3.6;
    return this.cfg.defaultAvgKmh;
  };

  // fx: efeitos dos itens (offlineHours, offlineRateMult)
  P.compute = function (save, now, fx) {
    var c = this.cfg, last = save.lastSeenAt;
    if (!last || !save.profile.created || !save.stats.runs) return null;
    var away = (now - last) / 1000;            // segundos fora
    if (!(away >= c.minMinutes * 60)) return null;
    var capH = c.baseHours + ((fx && fx.offlineHours) || 0);
    var hours = Math.min(away / 3600, capH);
    var kmh = Math.min(c.maxKmh, this.avgKmh(save) * c.rateOfAvg) * ((fx && fx.offlineRateMult) || 1);
    var km = hours * kmh;
    if (km < 0.05) return null;
    return {
      awayHours: away / 3600, hours: hours, capped: away / 3600 > capH, capHours: capH,
      km: km, meters: Math.round(km * 1000),
      coins: Math.round(km * c.coinsPerKm), xp: Math.round(km * c.xpPerKm)
    };
  };

  // soma distância e moedas no save (o XP é pago pelo MetaGame, que cuida do nível)
  P.apply = function (save, r) {
    save.stats.totalDistance += r.meters;
    save.stats.offlineDistance = (save.stats.offlineDistance || 0) + r.meters;
    save.coins += r.coins;
    save.lastSeenAt = Date.now();
    EP.events.emit('offline_collected', r);
  };

  EP.OfflineProgressManager = OfflineProgressManager;
})(window.EP);
