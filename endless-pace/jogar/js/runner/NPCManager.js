// NPCManager — os corredores da rua (GDD §13, §15, §19, §61).
//
// Um grupo fixo de corredores é reaproveitado (pooling): quem fica para trás
// some e volta lá na frente com outra roupa e outra velocidade. Eles desviam
// uns dos outros e do jogador com pequenos passos para o lado: nada de
// colisão, ninguém cai. Quando o jogador passa por um deles, avisa.
(function (EP) {
  'use strict';
  var U = EP.util;

  function NPCManager(scene, data, limit) {
    this.data = data;
    this.limit = limit;           // até onde vão para os lados
    this.pool = [];
    this.groupSeq = 0;
    this.frame = 0;
    for (var i = 0; i < data.poolSize; i++) {
      var rig = new EP.RunnerRig();
      rig.root.visible = false;
      scene.add(rig.root);
      this.pool.push({ rig: rig, active: false });
    }
  }
  var P = NPCManager.prototype;

  P.activeCount = function () {
    var n = 0;
    for (var i = 0; i < this.pool.length; i++) if (this.pool[i].active) n++;
    return n;
  };

  P._free = function () {
    for (var i = 0; i < this.pool.length; i++) if (!this.pool[i].active) return this.pool[i];
    return null;
  };

  // sorteia uma categoria (mais gente devagar no começo da corrida) entre as
  // que cabem na faixa de velocidade pedida, e a velocidade dentro dela
  P._pick = function (runDistance, lo, hi) {
    var t = U.clamp(runDistance / this.data.warmupDistance, 0, 1);
    var fit = this.data.categories.filter(function (c) { return c.speed[0] < hi && c.speed[1] > lo; });
    if (!fit.length) fit = [lo > 10 ? this.data.categories[this.data.categories.length - 1] : this.data.categories[0]];
    var cat = U.pickWeighted(fit, function (c) { return U.lerp(c.weight[0], c.weight[1], t); });
    return { cat: cat, speed: U.range([Math.max(cat.speed[0], lo), Math.min(cat.speed[1], hi)]) };
  };

  P._activate = function (n, z, x, speed, cat, group) {
    n.active = true;
    n.z = z; n.x = x; n.laneX = x; n.desiredX = x;
    n.base = speed; n.speed = speed; n.cat = cat; n.group = group || 0;
    n.wobbleT = Math.random() * 100; n.wobbleF = 0.05 + Math.random() * 0.12;
    n.counted = false; n.wasAhead = false; n.animAcc = 0; n.laneTimer = 4 + Math.random() * 10;
    n.rig.setAppearance(EP.RunnerRig.random());
    n.rig.root.visible = true;
    n.rig.root.position.set(x, 0, z);
  };

  // Quem aparece lá na frente é mais lento que o jogador (alguém para
  // ultrapassar); quem vem por trás é mais rápido (e passa por ele). Assim a
  // rua nunca fica cheia de gente no mesmo ritmo que nunca chega.
  P._spawn = function (player, ctx, initialZ) {
    var d = this.data, n = this._free();
    if (!n) return;
    var ps = ctx.home ? 0 : Math.max(ctx.playerSpeed, 8), ahead, z, pick;
    if (initialZ !== undefined) ahead = initialZ < player.z;
    else if (ctx.home) ahead = false;
    else ahead = ctx.playerSpeed >= 7 && Math.random() < 0.8;   // caminhando: só gente vindo de trás
    if (ahead) pick = this._pick(ctx.runDistance, 0, ps - 1.2);
    else pick = this._pick(ctx.runDistance, ps + 1.2, 99);
    if (initialZ !== undefined) z = initialZ;
    else if (ctx.home) z = player.z + U.range([110, 140]);   // tela inicial: vêm de trás e passam pela câmera
    else z = ahead ? player.z - U.range(d.spawnAhead) : player.z - U.range(d.spawnBehind);
    // grupo de corrida: alguns lado a lado no mesmo ritmo (GDD §15)
    if (ahead && initialZ === undefined && ctx.playerSpeed >= 10 && Math.random() < d.group.chance) {
      var size = Math.round(U.range(d.group.size)), gs = Math.min(U.range(d.group.speed), ctx.playerSpeed - 0.6), gid = ++this.groupSeq;
      var cx = U.range([-this.limit + 1.2, this.limit - 1.2]);
      for (var i = 0; i < size; i++) {
        var m = i === 0 ? n : this._free();
        if (!m) break;
        var row = Math.floor(i / 2), col = i % 2 ? 0.55 : -0.55;
        this._activate(m, z - row * 1.7, U.clamp(cx + col + (row % 2) * 0.3, -this.limit, this.limit), gs + (Math.random() - 0.5) * 0.15, 'group', gid);
        m.wasAhead = true;
      }
      return;
    }
    this._activate(n, z, this._freeLane(z), pick.speed, pick.cat.id, 0);
    n.wasAhead = ahead;
  };

  P._freeLane = function (z) {
    var best = 0, bestGap = -1;
    for (var k = 0; k < 6; k++) {
      var x = U.range([-this.limit, this.limit]), gap = 99;
      for (var i = 0; i < this.pool.length; i++) {
        var o = this.pool[i];
        if (o.active && Math.abs(o.z - z) < 4) gap = Math.min(gap, Math.abs(o.x - x));
      }
      if (gap > bestGap) { bestGap = gap; best = x; }
    }
    return best;
  };

  // ctx: { playerSpeed, runDistance, density }
  P.reset = function (player, ctx) {
    this.pool.forEach(function (n) { n.active = false; n.rig.root.visible = false; });
    this.spawnTimer = 0;
    var count = Math.round(this.data.baseCount * (ctx.density || 1));
    for (var i = 0; i < count; i++) {
      var dz = (i + Math.random() * 0.8) * ((ctx.home ? 120 : 130) / count);
      this._spawn(player, ctx, ctx.home ? player.z + 6 + dz : player.z - 9 - dz);
    }
  };

  P.hideAll = function () { this.pool.forEach(function (n) { n.active = false; n.rig.root.visible = false; }); };

  // ctx: { playerSpeed (km/h), runDistance, density, gen (limites), onOvertake(n), home (tela inicial) }
  P.update = function (dt, player, ctx) {
    var d = this.data, list = this.pool, i, j, n, o;
    this.frame++;
    var target = Math.round(d.baseCount * (ctx.density || 1));
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0 && this.activeCount() < target) { this._spawn(player, ctx); this.spawnTimer = d.spawnInterval; }

    for (i = 0; i < list.length; i++) {
      n = list[i];
      if (!n.active) continue;
      n.wobbleT += dt;
      n.speed = Math.max(4, n.base + Math.sin(n.wobbleT * n.wobbleF * Math.PI * 2) * d.wobble);
      n.z -= n.speed / 3.6 * dt;
      // de vez em quando muda de faixa
      n.laneTimer -= dt;
      if (n.laneTimer <= 0 && !n.group) { n.laneX = U.range([-this.limit + 0.4, this.limit - 0.4]); n.laneTimer = 6 + Math.random() * 12; }
      var want = n.laneX;
      // desvia de quem está mais devagar logo à frente (e do jogador)
      for (j = -1; j < list.length; j++) {
        var oz, ox, os;
        if (j === -1) { oz = player.z; ox = player.x; os = ctx.playerSpeed; }
        else { o = list[j]; if (!o.active || o === n || (n.group && o.group === n.group)) continue; oz = o.z; ox = o.x; os = o.speed; }
        var dz = n.z - oz, dx = n.x - ox;
        if (dz > 0.2 && dz < 6 && Math.abs(dx) < 0.95 && n.speed > os + 0.2) {
          want = ox + (ox > 0 ? -1.15 : 1.15);              // passa pelo lado com mais espaço
        }
        if (j === -1 && dz < 0 && dz > -4.5 && Math.abs(dx) < 0.9 && os > n.speed + 0.3) {
          want = n.x + (dx >= 0 ? 1.2 : -1.2);              // o jogador vem chegando: abre espaço
        }
      }
      n.desiredX = want;
      var lim = ctx.gen.limitsAt(n.z, n.x, this.limit);
      var tx = U.clamp(n.desiredX, lim[0], lim[1]);
      var step = 1.4 * dt;
      n.x += U.clamp(tx - n.x, -step, step);
      n.x = U.clamp(n.x, lim[0], lim[1]);
    }
    // separação: dois corredores nunca ocupam o mesmo lugar
    for (i = 0; i < list.length; i++) {
      n = list[i];
      if (!n.active) continue;
      for (j = i + 1; j < list.length; j++) {
        o = list[j];
        if (!o.active) continue;
        var ddz = n.z - o.z, ddx = n.x - o.x;
        if (Math.abs(ddz) < 0.8 && Math.abs(ddx) < 0.6) {
          var push = (0.6 - Math.abs(ddx)) * 0.5 * (ddx >= 0 ? 1 : -1);
          n.x += push; o.x -= push;
        }
      }
      var pdz = n.z - player.z, pdx = n.x - player.x;
      if (Math.abs(pdz) < 0.8 && Math.abs(pdx) < 0.6) n.x += (0.6 - Math.abs(pdx)) * (pdx >= 0 ? 1 : -1);
    }
    // ultrapassagens, retirada e animação
    var behindLim = ctx.home ? -160 : d.despawnBehind, aheadLim = ctx.home ? 30 : d.despawnAhead;
    for (i = 0; i < list.length; i++) {
      n = list[i];
      if (!n.active) continue;
      var ahead = player.z - n.z;
      if (ahead > 0.6) n.wasAhead = true;
      if (!n.counted && n.wasAhead && ahead < -0.6) { n.counted = true; if (ctx.onOvertake) ctx.onOvertake(n); }
      if (ahead < behindLim || ahead > aheadLim || (!ctx.home && ahead > 112 && n.speed >= ctx.playerSpeed)) { n.active = false; n.rig.root.visible = false; continue; }
      n.rig.root.position.set(n.x, 0, n.z);
      n.animAcc += dt;
      if (Math.abs(ahead) < 70 || (this.frame + i) % 3 === 0) { n.rig.animate(n.animAcc, n.speed, null); n.animAcc = 0; }
    }
  };

  P.rebase = function (shift) {
    this.pool.forEach(function (n) { if (n.active) { n.z += shift; n.rig.root.position.z = n.z; } });
  };

  EP.NPCManager = NPCManager;
})(window.EP);
