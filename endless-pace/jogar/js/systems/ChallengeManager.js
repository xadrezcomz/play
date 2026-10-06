// ChallengeManager — mini-desafios durante a corrida (GDD §22).
//
// Modular: cada TIPO de desafio é um avaliador em ChallengeManager.types; cada
// DESAFIO é um item em dados/desafios.js que aponta para um tipo. Para criar
// os desafios das próximas versões (PACE, OVERTAKE, ENERGY, SPRINT, DRAFT,
// COMBO), basta registrar o tipo aqui e cadastrar o desafio nos dados.
(function (EP) {
  'use strict';
  var U = EP.util;

  function ChallengeManager(data, stats) {
    this.data = data;     // EP.data.challenges
    this.stats = stats;   // save.stats (challengesCompleted, challenges por id)
    this.reset(false);
  }
  var P = ChallengeManager.prototype;

  // Avaliadores. Cada um recebe o estado do desafio (s) e mexe em s.progress.
  // Ganchos possíveis: onRating(s, rating), onOvertake(s), update(s, dt, ctx).
  ChallengeManager.types = {
    perfectStreak: {
      onRating: function (s, rating) {
        if (rating === 'perfect') s.progress++;
        else if (rating) s.progress = 0;
      }
    }
  };

  P.reset = function (firstRun) {
    this.active = null;
    this.distance = 0;
    this.lastId = null;
    this.nextAt = firstRun ? this.data.firstAt : U.range(this.data.every);
  };

  P._type = function () { return ChallengeManager.types[this.active.def.type]; };

  P.start = function () {
    var list = this.data.list, self = this;
    var options = list.length > 1 ? list.filter(function (c) { return c.id !== self.lastId; }) : list;
    var def = U.pick(options);
    var done = (this.stats.challenges && this.stats.challenges[def.id]) || 0;
    var target = def.tiers[Math.min(done, def.tiers.length - 1)];
    this.active = { def: def, target: target, progress: 0, timeLeft: def.timeLimit, time: 0 };
    this.lastId = def.id;
    EP.events.emit('challenge_started', { id: def.id, target: target, timeLimit: def.timeLimit, text: def.text });
    return this.active;
  };

  P._check = function () {
    var a = this.active;
    if (a && a.progress >= a.target) this._finish(true);
  };

  P._finish = function (ok) {
    var a = this.active;
    this.active = null;
    this.nextAt = this.distance + U.range(this.data.every);
    if (ok) {
      this.stats.challengesCompleted = (this.stats.challengesCompleted || 0) + 1;
      this.stats.challenges = this.stats.challenges || {};
      this.stats.challenges[a.def.id] = (this.stats.challenges[a.def.id] || 0) + 1;
      EP.events.emit('challenge_completed', { id: a.def.id, target: a.target, time: a.time, reward: a.def.reward, text: a.def.text });
    } else {
      EP.events.emit('challenge_failed', { id: a.def.id, progress: a.progress, target: a.target, text: a.def.text });
    }
  };

  // ctx: { distance (m nesta corrida), blocked (não começar agora) }
  P.update = function (dt, ctx) {
    this.distance = ctx.distance;
    if (!this.active) {
      if (ctx.distance >= this.nextAt && !ctx.blocked) this.start();
      return;
    }
    var a = this.active, type = this._type();
    a.time += dt;
    a.timeLeft -= dt;
    if (type.update) type.update(a, dt, ctx);
    this._check();
    if (this.active && a.timeLeft <= 0) this._finish(false);
  };

  P.onRating = function (rating) {
    if (!this.active) return;
    var type = this._type();
    if (type.onRating) { type.onRating(this.active, rating); this._check(); }
  };

  P.onOvertake = function () {
    if (!this.active) return;
    var type = this._type();
    if (type.onOvertake) { type.onOvertake(this.active); this._check(); }
  };

  EP.ChallengeManager = ChallengeManager;
})(window.EP);
