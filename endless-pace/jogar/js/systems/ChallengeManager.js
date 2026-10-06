// ChallengeManager — mini-desafios durante a corrida (GDD §22).
//
// Modular: cada TIPO de desafio é um avaliador em ChallengeManager.types; cada
// DESAFIO é um item em dados/desafios.js que aponta para um tipo. Tipo novo:
// registre o avaliador aqui e cadastre o desafio nos dados.
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
  // ctx do update: { distance, meters (neste quadro), speed (km/h), energy (0–1),
  //   drafting, pacerGap (m atrás do pacer; negativo = na frente; null = sem pacer) }
  ChallengeManager.types = {
    // PERFECT seguidos
    perfectStreak: {
      onRating: function (s, rating) {
        if (rating === 'perfect') s.progress++;
        else if (rating) s.progress = 0;
      }
    },
    // PACE: segure a velocidade dentro de uma faixa (segundos seguidos; sair
    // da faixa por pouco tempo não zera)
    pace: {
      unit: 's',
      start: function (s) { s.range = [s.target2 - 1, s.target2 + 1]; s.out = 0; },
      update: function (s, dt, ctx) {
        var inside = ctx.speed >= s.range[0] && ctx.speed <= s.range[1];
        if (inside) { s.exact += dt; s.out = 0; } else { s.out += dt; if (s.out > 1.5) s.exact = 0; }
        s.progress = Math.floor(s.exact);
        s.hint = inside ? 0 : ctx.speed < s.range[0] ? 1 : -1;   // 1 = acelere, -1 = segure
      }
    },
    // OVERTAKE: ultrapasse N corredores antes do tempo acabar
    overtake: { onOvertake: function (s) { s.progress++; } },
    // COMBO: chegue a um combo de ultrapassagens ×N
    combo: { onOvertake: function (s, combo) { s.progress = Math.max(s.progress, combo || 0); } },
    // ENERGY: corra forte (≥ 11 km/h) por N segundos sem deixar a energia cair abaixo de 35%
    energy: {
      unit: 's',
      update: function (s, dt, ctx) {
        if (ctx.energy < 0.35) { s.exact = 0; s.hint = -1; }
        else if (ctx.speed >= 11) { s.exact += dt; s.hint = 0; }
        else s.hint = 1;
        s.progress = Math.floor(s.exact);
      }
    },
    // SPRINT: 200 m dentro do tempo; o melhor tempo vira recorde (save.stats.challengeRecords.sprint200)
    sprint: {
      unit: 'm',
      update: function (s, dt, ctx) { s.exact += ctx.meters; s.progress = Math.min(s.target, Math.floor(s.exact)); }
    },
    // DRAFT: aproveite o vácuo de outro corredor (segundos somados)
    draft: {
      unit: 's',
      update: function (s, dt, ctx) { if (ctx.drafting) s.exact += dt; s.hint = ctx.drafting ? 0 : 1; s.progress = Math.floor(s.exact); }
    },
    // PACER: acompanhe o corredor-guia por N metros (até 12 m atrás dele)
    pacer: {
      unit: 'm',
      needsPacer: true,
      update: function (s, dt, ctx) {
        if (ctx.pacerGap === null || ctx.pacerGap === undefined) return;
        var near = ctx.pacerGap < 12 && ctx.pacerGap > -6;
        if (near) { s.exact += ctx.meters; s.lost = 0; } else s.lost += dt;
        s.hint = near ? 0 : ctx.pacerGap >= 12 ? 1 : -1;
        s.progress = Math.min(s.target, Math.floor(s.exact));
        if (s.lost > 8) s.timeLeft = 0;   // ficou para trás demais
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

  // ctx.level: nível do corredor (alguns desafios só aparecem depois)
  P.start = function (ctx, forceId) {
    var list = this.data.list, self = this, level = (ctx && ctx.level) || 1, speed = (ctx && ctx.speed) || 0;
    var options = list.filter(function (c) {
      return c.id !== self.lastId && (c.minLevel || 1) <= level && (!c.minSpeed || speed >= c.minSpeed);
    });
    if (!options.length) options = list.filter(function (c) { return (c.minLevel || 1) <= level; });
    var def = forceId ? list.filter(function (c) { return c.id === forceId; })[0] : U.pickWeighted(options, function (c) { return c.weight || 1; });
    var done = (this.stats.challenges && this.stats.challenges[def.id]) || 0;
    var tier = def.tiers[Math.min(done, def.tiers.length - 1)];
    var target = Array.isArray(tier) ? tier[0] : tier, target2 = Array.isArray(tier) ? tier[1] : 0;
    var type = ChallengeManager.types[def.type];
    this.active = { def: def, target: target, target2: target2, progress: 0, exact: 0, lost: 0, hint: 0, timeLeft: def.timeLimit, time: 0, unit: type.unit || '' };
    if (type.start) type.start(this.active);
    this.lastId = def.id;
    EP.events.emit('challenge_started', { id: def.id, type: def.type, target: target, target2: target2, timeLimit: def.timeLimit, text: def.text, speed: def.pacerSpeed ? def.pacerSpeed[Math.min(done, def.pacerSpeed.length - 1)] : 0 });
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
    if (ok && a.def.type === 'sprint') {
      var rec = this.stats.challengeRecords || (this.stats.challengeRecords = {}), old = rec.sprint200 || 0;
      a.record = !old || a.time < old;
      if (a.record) rec.sprint200 = Math.round(a.time * 10) / 10;
    }
    if (ok && a.def.type === 'pacer') this.stats.pacersCompleted = (this.stats.pacersCompleted || 0) + 1;
    if (ok) {
      this.stats.challengesCompleted = (this.stats.challengesCompleted || 0) + 1;
      this.stats.challenges = this.stats.challenges || {};
      this.stats.challenges[a.def.id] = (this.stats.challenges[a.def.id] || 0) + 1;
      EP.events.emit('challenge_completed', { id: a.def.id, type: a.def.type, target: a.target, time: a.time, record: a.record, reward: a.def.reward, text: a.def.text });
    } else {
      EP.events.emit('challenge_failed', { id: a.def.id, type: a.def.type, progress: a.progress, target: a.target, text: a.def.text });
    }
  };

  // ctx: { distance (m nesta corrida), blocked (não começar agora) }
  P.update = function (dt, ctx) {
    this.distance = ctx.distance;
    if (!this.active) {
      if (ctx.distance >= this.nextAt && !ctx.blocked) this.start(ctx);
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

  P.onOvertake = function (combo) {
    if (!this.active) return;
    var type = this._type();
    if (type.onOvertake) { type.onOvertake(this.active, combo); this._check(); }
  };

  // desiste do desafio atual sem contar como falha (troca de região, fim da corrida)
  P.cancel = function () {
    if (!this.active) return;
    this.active = null;
    this.nextAt = this.distance + U.range(this.data.every);
    EP.events.emit('challenge_cancelled', {});
  };

  EP.ChallengeManager = ChallengeManager;
})(window.EP);
