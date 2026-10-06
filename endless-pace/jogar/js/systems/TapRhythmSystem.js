// TapRhythmSystem — lê os toques e avalia a cadência (GDD §7 e §9).
//
// Cada toque é uma passada. O sistema mede o intervalo entre toques e compara
// com o "seu ritmo" (média móvel dos intervalos). Ritmo regular dá GOOD, GREAT
// e PERFECT em qualquer velocidade; o que separa caminhar de correr é a
// frequência, e quem paga a conta da velocidade é a energia. Tocar rápido
// demais e sem controle nunca passa de GOOD.
(function (EP) {
  'use strict';

  function TapRhythmSystem(cfg) {
    this.cfg = cfg;
    this.reset();
  }
  var P = TapRhythmSystem.prototype;

  P.reset = function () {
    this.lastTap = -1e9;   // segundos
    this.interval = 0;     // seu ritmo: intervalo médio entre toques
    this.count = 0;        // toques na sequência atual
    this.streak = 0;       // PERFECT seguidos
    this.lastRating = null;
    this._snap = null;
  };

  P.windowFor = function (name, interval) {
    var w = this.cfg[name];
    return Math.max(w.rel * interval, w.abs);
  };

  // t: momento do toque, em segundos. Devolve null se o toque foi ignorado.
  P.tap = function (t) {
    var c = this.cfg, gap = t - this.lastTap;
    if (gap < c.ignoreBelow) return null;
    this._snap = { lastTap: this.lastTap, interval: this.interval, count: this.count, streak: this.streak, lastRating: this.lastRating };

    var rating = null;
    if (this.count === 0 || gap > c.resetGap) {
      this.count = 1;
      this.interval = 0;
    } else {
      this.count++;
      if (this.count === 2) {
        this.interval = gap;                  // primeiro intervalo: só mede
      } else if (this.count <= c.warmupTaps) {
        this.interval += (gap - this.interval) * 0.5;
      } else {
        var dev = Math.abs(gap - this.interval);
        if (dev <= this.windowFor('perfect', this.interval)) rating = 'perfect';
        else if (dev <= this.windowFor('great', this.interval)) rating = 'great';
        else if (dev <= this.windowFor('good', this.interval)) rating = 'good';
        else rating = 'off';
        if (gap < c.spamInterval && (rating === 'perfect' || rating === 'great')) rating = 'good';
        this.interval += (gap - this.interval) * c.emaAlpha;
      }
    }
    this.lastTap = t;
    if (rating === 'perfect') this.streak++;
    else if (rating) this.streak = 0;
    this.lastRating = rating;
    return { rating: rating, gap: gap, interval: this.interval, spam: this.count > 1 && gap < c.spamInterval, count: this.count };
  };

  // Desfaz o último toque (o toque que virou deslize lateral não quebra o ritmo).
  P.cancelLast = function () {
    if (!this._snap) return;
    var s = this._snap;
    this.lastTap = s.lastTap; this.interval = s.interval; this.count = s.count;
    this.streak = s.streak; this.lastRating = s.lastRating;
    this._snap = null;
  };

  // Toques por segundo agora. Parar de tocar faz a frequência cair aos poucos.
  P.frequency = function (t) {
    var since = t - this.lastTap;
    if (since > this.cfg.resetGap) return 0;
    if (this.count < 2) return since < 0.9 ? 1.0 : 0;    // um toque só: um impulso de trote
    return 1 / Math.max(this.interval, since);
  };

  // Sem tocar há tempo suficiente para o ritmo se perder?
  P.idle = function (t) { return t - this.lastTap > this.cfg.resetGap; };

  // 0 logo depois de um toque, 1 quando o próximo toque "deveria" acontecer
  P.phase = function (t) {
    if (this.count < 2 || !this.interval) return -1;
    return (t - this.lastTap) / this.interval;
  };

  EP.TapRhythmSystem = TapRhythmSystem;
})(window.EP);
