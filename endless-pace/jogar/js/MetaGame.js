// MetaGame — tudo o que acontece "em volta" da corrida (GDD §37–57):
// equipamentos e loja, nível e XP, conquistas, missões do dia, progresso
// offline e regiões desbloqueadas pela distância. Junta os sistemas de
// js/systems/ (cada um com a sua lógica e testes) e guarda os avisos que a
// tela inicial mostra depois (conquista nova, subiu de nível, nova região...).
(function (EP) {
  'use strict';

  function today() {
    var d = new Date(), p = function (n) { return (n < 10 ? '0' : '') + n; };
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
  }

  var M = EP.Meta = {
    popups: [],          // avisos para mostrar fora da corrida: { type, data }
    today: today,

    init: function (save) {
      var D = EP.data, items = D.items || [];
      this.save = save;
      this.items = items;
      this.itemsById = {};
      items.forEach(function (it) { M.itemsById[it.id] = it; });
      this.equip = EP.EquipmentManager ? new EP.EquipmentManager(items, D.statEffects || {}) : null;
      this.inv = EP.InventoryManager ? new EP.InventoryManager(save, items) : null;
      this.ach = EP.AchievementManager && D.achievements ? new EP.AchievementManager(D.achievements, save) : null;
      this.offline = EP.OfflineProgressManager && D.offline ? new EP.OfflineProgressManager(D.offline) : null;
      this.missions = EP.MissionManager && D.missions ? new EP.MissionManager(D.missions, save) : null;
      this.levels = EP.LevelSystem && D.levels ? new EP.LevelSystem(D.levels, save) : null;
      if (this.inv) this.inv.ensureStarters();
      // dias jogados (conquistas e missões usam a data do aparelho, GDD §57)
      var day = today();
      if (save.stats.lastDay !== day) { save.stats.daysPlayed++; save.stats.lastDay = day; }
      this.refreshDay();
      this.recompute();
      this._acc = { dist: 0, flow: 0, draft: 0, check: 0, top: 0 };
      this.runXp = 0;
      // conquistas que já valem (por exemplo, depois de uma atualização) entram sem festa
      this.checkAchievements(true);
      this.welcomeGift();
    },

    // presente de boas-vindas (uma vez por save): moedas para estrear a loja
    welcomeGift: function () {
      var s = this.save, n = EP.data.welcomeGift || 0;
      s.flags = s.flags || {};
      if (s.flags.welcomeGift || !n) return;
      s.flags.welcomeGift = true;
      s.coins += n;
      this.popups.push({ type: 'gift', data: { coins: n } });
    },

    refreshDay: function () {
      if (this.missions) this.missions.ensureDay(today(), this.save.profile.level);
    },

    // ---------------------------------------------------------- equipamentos
    recompute: function () {
      var none = { speedMult: 1, energyBonus: 0, recoveryMult: 1, flowGainMult: 1, flowDecayMult: 1, windowMult: 1, flowCoinMult: 1, consumptionMult: 1, offlineHours: 0, offlineRateMult: 1 };
      this.totals = this.equip ? this.equip.totals(this.save.equipped) : {};
      this.fx = this.equip ? Object.assign(none, this.equip.effects(this.totals)) : none;
      return this.fx;
    },
    gear: function (equipped) {
      return this.equip ? this.equip.visualFor(equipped || this.save.equipped) : null;
    },
    // aplica os bônus dos itens nos sistemas da corrida
    applyTo: function (g) {
      var fx = this.fx;
      g.rhythm.windowMult = fx.windowMult;
      g.flow.gainMult = fx.flowGainMult;
      g.flow.decayMult = fx.flowDecayMult;
      g.energy.maxBonus = fx.energyBonus;
    },
    buy: function (id) {
      if (!this.inv) return false;
      var ok = this.inv.buy(id, this.save.profile.level);
      if (ok) this.checkAchievements();
      return ok;
    },
    equipItem: function (id) {
      if (!this.inv) return false;
      var ok = this.inv.equip(id);
      this.recompute();
      return ok;
    },
    level: function () { return this.save.profile.level; },
    owns: function (id) { return !!this.inv && this.inv.owns(id); },
    isEquipped: function (id) { var it = this.itemsById[id]; return !!it && this.save.equipped[it.slot] === id; },

    // ---------------------------------------------------------- XP e recompensas
    // reward: { coins, xp, item }
    pay: function (reward, reason, silent) {
      if (!reward) return;
      if (reward.coins) {
        this.save.coins += reward.coins;
        EP.events.emit('coins', { amount: reward.coins, reason: reason, total: this.save.coins, silent: silent });
      }
      if (reward.item) this.grantItem(reward.item);
      if (reward.xp) this.addXp(reward.xp, reason);
    },
    grantItem: function (id) {
      if (!this.itemsById[id] || this.save.inventory.indexOf(id) >= 0) return false;
      this.save.inventory.push(id);
      return true;
    },
    addXp: function (n, reason) {
      if (!this.levels || !(n > 0)) return null;
      this.runXp += n;   // a tela de resumo mostra quanto XP a corrida rendeu
      var r = this.levels.addXp(n, reason);
      if (r && r.levelsGained) {
        // LevelSystem já somou as moedas do nível; item que o jogador já tinha (comprou antes) vira moedas
        var paid = 0, rewards = [];
        (r.rewards || []).forEach(function (rw) {
          paid += rw.coins || 0;
          if (!rw.item) { if (rw.coins) rewards.push({ coins: rw.coins }); return; }
          if (M.grantItem(rw.item)) { rewards.push({ item: rw.item, coins: rw.coins || 0 }); return; }
          var it = M.itemsById[rw.item], back = it ? it.price || 0 : 0;
          M.save.coins += back;
          paid += back;
          rewards.push({ refund: rw.item, coins: (rw.coins || 0) + back });
        });
        if (paid) EP.events.emit('coins', { amount: paid, reason: 'level', total: this.save.coins, silent: true });
        this.popups.push({ type: 'level', data: { level: this.save.profile.level, rewards: rewards } });
        this.refreshDay();
        this.checkAchievements();
      }
      return r;
    },
    // nível em que o item vem de presente (null se não for presente ou se o nível já passou)
    rewardLevel: function (id) {
      var rw = ((EP.data.levels && EP.data.levels.rewards) || []).filter(function (r) { return r.item === id; })[0];
      return rw && this.save.profile.level < rw.at ? rw.at : null;
    },
    xpCfg: function () { return (EP.data.levels && EP.data.levels.xp) || {}; },

    // ---------------------------------------------------------- conquistas
    // a tela de conquistas foi aberta: some o selo de novidade
    seeAchievements: function () { this.save.unseen.achievements = []; },
    unseenCount: function () { return (this.save.unseen.achievements || []).length; },

    checkAchievements: function (quiet) {
      if (!this.ach) return [];
      var got = this.ach.check();
      if (!got || !got.length) return [];
      got.forEach(function (def) {
        M.save.unseen.achievements.push(def.id);
        if (!quiet) M.popups.push({ type: 'achievement', data: def });
        M.pay(def.reward, 'achievement', true);
      });
      return got;
    },

    // ---------------------------------------------------------- missões
    track: function (metric, value, mode) {
      if (!this.missions) return [];
      var done = this.missions.track(metric, value, mode || 'add') || [];
      return done;
    },
    claimMission: function (i) {
      if (!this.missions) return null;
      var r = this.missions.claim(i);
      if (r) this.pay(r, 'mission');
      return r;
    },
    // bônus do dia: as três missões resgatadas
    claimBonus: function () {
      if (!this.missions) return null;
      var r = this.missions.claimBonus();
      if (r) this.pay(r, 'mission_bonus');
      return r;
    },
    pendingMissions: function () { return this.missions ? this.missions.pending() : 0; },

    // durante a corrida, chamado a cada quadro com o que aconteceu nele
    runTick: function (dt, meters, ctx) {
      var a = this._acc, x = this.xpCfg(), done = [];
      a.dist += meters;
      if (ctx.flowLevel > 0) a.flow += dt;
      if (ctx.drafting) a.draft += dt;
      a.check += dt;
      // maior velocidade a cada quadro (a mesma que o resumo mostra), com 1 casa como na tela
      if (ctx.speed > a.top) a.top = ctx.speed;
      if (a.check < 1) return done;
      // uma vez por segundo: missões, XP da distância e conquistas
      a.check = 0;
      done = done.concat(this.track('distance', a.dist), this.track('flowTime', a.flow), this.track('draftTime', a.draft), this.track('topSpeed', Math.round(a.top * 10) / 10, 'max'));
      this.save.stats.draftTime += a.draft;
      var xp = a.dist / 1000 * (x.perKm || 100) + a.flow * (x.perFlowSecond || 0);
      a.dist = 0; a.flow = 0; a.draft = 0;
      this.addXp(xp * (ctx.xpMult || 1), 'run');
      this.checkAchievementsInRun();
      return done;
    },
    // fim da corrida: conta o que sobrou do último segundo
    flushRun: function (ctx) {
      this._acc.check = 1;
      var done = this.runTick(0, 0, ctx || { flowLevel: 0, drafting: false, speed: 0 });
      this._acc.top = 0;   // a próxima corrida começa do zero
      return done;
    },
    checkAchievementsInRun: function () {
      var got = this.checkAchievements();
      got.forEach(function (def) { EP.events.emit('achievement_toast', def); });
    },

    // ---------------------------------------------------------- regiões
    biomesByOrder: function () {
      return EP.data.biomes.slice().sort(function (a, b) { return (a.requiredDistance || 0) - (b.requiredDistance || 0); });
    },
    nextBiome: function () {
      var km = this.save.stats.totalDistance / 1000, list = this.biomesByOrder();
      for (var i = 0; i < list.length; i++) if (list[i].requiredDistance > km && this.save.unlockedBiomes.indexOf(list[i].id) < 0) return list[i];
      return null;
    },
    // novas regiões pela distância acumulada (GDD §30)
    checkUnlocks: function () {
      var km = this.save.stats.totalDistance / 1000, got = [];
      this.biomesByOrder().forEach(function (b) {
        if (km >= (b.requiredDistance || 0) && M.save.unlockedBiomes.indexOf(b.id) < 0) {
          M.save.unlockedBiomes.push(b.id);
          got.push(b);
          M.popups.push({ type: 'region', data: b });
          EP.events.emit('biome_unlocked', { id: b.id });
        }
      });
      if (got.length) this.checkAchievements();
      return got;
    },
    visit: function (biomeId) {
      var v = this.save.stats.biomesVisited;
      if (v.indexOf(biomeId) < 0) { v.push(biomeId); this.checkAchievements(); }
    },

    // ---------------------------------------------------------- offline (GDD §45–47)
    collectOffline: function (now) {
      if (!this.offline) return null;
      var r = this.offline.compute(this.save, now || Date.now(), this.fx);
      if (!r) return null;
      // XP do treino offline (e de conquistas que ele destrava) não é XP de corrida
      var runXp = this.runXp;
      this.offline.apply(this.save, r);
      if (r.xp) this.addXp(r.xp, 'offline');
      this.popups.unshift({ type: 'offline', data: r });
      this.checkUnlocks();
      this.checkAchievements();
      this.runXp = runXp;
      return r;
    }
  };
})(window.EP);
