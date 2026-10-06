// GameManager — liga tudo: estados do jogo (criar, início, corrida, pausa,
// resumo), o laço de cada quadro, a câmera e a ordem em que os sistemas
// conversam. Os sistemas não se conhecem: quem passa um número de um para o
// outro é este arquivo (e o barramento EP.events).
(function (EP) {
  'use strict';
  var U = EP.util;
  var $ = function (id) { return document.getElementById(id); };
  var t = function (k, p) { return EP.i18n.t(k, p); };
  var UI = EP.UI, AU = EP.AudioManager, MU = EP.MetaUI;
  var META_MODALS = ['tela-item', 'tela-loja', 'tela-conquistas', 'tela-missoes', 'tela-opcoes', 'tela-recordes'];

  var G = EP.Game = {
    state: 'boot',

    boot: function () {
      this.saveMgr = new EP.SaveManager();
      this.save = this.saveMgr.load();
      // itens, nível, conquistas e missões; o treino com o jogo fechado vira aviso na tela inicial
      EP.Meta.init(this.save);
      EP.Meta.collectOffline(Date.now());
      EP.i18n.set(this.save.settings.lang || EP.i18n.detect());
      UI.init(this);
      MU.init(this);
      this._applySettings();
      if (!this._webgl()) { UI.error(t('boot.noWebgl')); return; }
      var self = this;
      // antes de abrir: o corredor do jogador e um corredor da rua já esculpidos (em segundo plano)
      var RR = EP.RunnerRig, heroApp = this._look(), npc0 = RR.NPC_OUTFITS[0], left = 2;
      var go = function () {
        if (--left > 0) return;
        try { self._init3d(); }
        catch (e) { UI.error(t('boot.noWebgl')); if (window.console) console.error(e); }
      };
      EP.BodyModel.prepare(heroApp.gender, RR.outfitOf(heroApp), 0, go);
      EP.BodyModel.prepare(npc0.gender, npc0, 1, go);
    },

    _webgl: function () {
      try { var c = document.createElement('canvas'); return !!(window.WebGLRenderingContext && (c.getContext('webgl') || c.getContext('experimental-webgl'))); }
      catch (e) { return false; }
    },

    _init3d: function () {
      var B = EP.data.balance, save = this.save, self = this;
      this.B = B;
      this.renderer = new THREE.WebGLRenderer({ canvas: $('cena'), antialias: save.settings.quality !== 'low', powerPreference: 'high-performance' });
      // cor correta: luz calculada em espaço linear e curva de tons de cinema na saída
      this.renderer.outputEncoding = THREE.sRGBEncoding;
      this.renderer.toneMapping = THREE.CustomToneMapping;   // curva e grading em Materials.js
      this.renderer.toneMappingExposure = 0.78;
      this.renderer.autoClear = false;
      // sombra de verdade só do corredor e de quem está perto (o cenário usa sombras pintadas)
      if (save.settings.quality !== 'low') {
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      }
      this.scene = new THREE.Scene();
      this.camera = new THREE.PerspectiveCamera(60, 1, 0.3, 700);
      this._resize();
      EP.Materials.init(save.settings.quality);
      this.daynight = new EP.DayNightSystem(this.scene, EP.data.dayNight);
      if (this.renderer.shadowMap.enabled) {
        this.daynight.sun.castShadow = true;
        var ms = save.settings.quality === 'high' ? 2048 : 1024;
        this.daynight.sun.shadow.mapSize.set(ms, ms);
      }
      this.daynight.phase = this.daynight.startPhaseFor(save.world.timeOfDay);
      this.world = new EP.ProceduralWorldGenerator(this.scene);
      this.world.signFactory = function (fork) { return EP.ForkSigns.get(fork); };
      this.world.regionSignFactory = function (biome) { return EP.RegionSign.get(biome); };
      this.biome = this.world.biomeById(save.world.region || EP.data.biomes[0].id);

      this.rig = new EP.RunnerRig();
      this.rig.setAppearance(this._look());
      this.rig.shadow.material = EP.Materials.shadowSoft || this.rig.shadow.material;
      this.rig.onStep = function () { if (self.state === 'run') AU.step(self.speed.value); };
      this.scene.add(this.rig.root);
      this.player = new EP.RunnerController(this.rig, B.run);
      this.npcs = new EP.NPCManager(this.scene, EP.data.npcs, B.run.laneLimit);
      setTimeout(function () { EP.RunnerRig.warmNpcs(); }, 400);   // as outras roupas da rua, aos poucos

      this.rhythm = new EP.TapRhythmSystem(B.rhythm);
      this.flow = new EP.FlowSystem(B.flow);
      this.energy = new EP.EnergySystem(B.energy, B.speed);
      this.speed = new EP.SpeedSystem(B.speed, B.zones);
      this.overtakes = new EP.OvertakeSystem(B.economy);
      this.economy = new EP.EconomyManager(B.economy, save);
      this.challenges = new EP.ChallengeManager(EP.data.challenges, save.stats);
      this.draft = new EP.DraftSystem(EP.data.draft);
      this.pacer = new EP.PacemakerSystem(this.npcs);
      this.progression = new EP.ProgressionManager(save);
      this.creator = new EP.CharacterCreator($('tela-criar'));

      this.cam = { theta: Math.PI - 0.4, r: 4.4, h: 1.5, fov: 60, look: new THREE.Vector3(0, 1, 0), turn: 0 };
      this.fovKick = 0;
      this.clock = performance.now() / 1000;
      this._events();
      this._buttons();
      this._input();
      window.addEventListener('resize', function () { self._resize(); });
      document.addEventListener('visibilitychange', function () {
        if (document.hidden) { self._persist(); if (self.state === 'run') self.pause(); AU.suspend(); }
        else if (self.state !== 'paused') AU.resume();
      });
      window.addEventListener('pagehide', function () { self._persist(); });
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { EP.ForkSigns.refreshAll(); });
      if (!this.saveMgr.available) setTimeout(function () { UI.toast(t('boot.noSave'), 4000); }, 500);

      UI.hide('tela-carregando');
      if (!save.profile.created) this.openCreator(false);
      else this.goHome();
      this.snapCam = true;
      this.last = performance.now();
      requestAnimationFrame(function loop(now) { requestAnimationFrame(loop); self._frame(now); });
      EP.Analytics.visit();
    },

    // ---------------------------------------------------------------- estados
    // aparência do corredor com os itens equipados · basic: roupa da criação (o criador mostra as cores escolhidas)
    _look: function (profile, basic) {
      var M = EP.Meta, eq = this.save.equipped;
      if (basic && M.inv) {
        eq = Object.assign({}, eq);
        ['shirt', 'shorts', 'shoes'].forEach(function (s) { var st = M.inv.starterFor(s); if (st) eq[s] = st.id; });
      }
      return EP.RunnerRig.resolve(profile || this.save.profile, M.gear(eq));
    },

    _homeScene: function () {
      this.world.reset({ biome: this.biome.id, firstRun: !this.save.stats.runs });
      this.daynight.setBiome(this.biome);
      this.player.reset(0);
      this.npcs.reset(this.player, this._npcCtx(true));
      this.snapCam = true;
    },

    goHome: function () {
      this.state = 'home';
      this.camMode = 'home';
      this.dressing = false;
      ['tela-criar', 'tela-pausa', 'tela-resumo', 'tela-equipar'].forEach(UI.hide);
      UI.hud(false);
      UI.show('tela-inicio');
      EP.Meta.refreshDay();
      UI.home(this.save);
      this._homeScene();
      AU.ambience(false);
      this._persist();
      var self = this;
      setTimeout(function () { self._nextPopup(); }, 450);
    },

    // ---------------------------------------------------------------- loja, equipar, conquistas, missões
    _modalOpen: function () {
      return this.dressing || UI.isOpen('tela-aviso') || UI.isOpen('tela-confirmar') || META_MODALS.some(function (id) { return UI.isOpen(id); });
    },
    // avisos guardados (offline, nível, conquista, região, presente): um de cada vez, só na tela inicial
    _nextPopup: function () {
      var M = EP.Meta, self = this;
      if (this.state !== 'home' || this._modalOpen() || !M.popups.length) return;
      var p = M.popups.shift();
      if (p.type === 'level' || p.type === 'achievement' || p.type === 'gift') AU.challenge(true); else AU.ui();
      this._popupDone = function (action) {
        self._popupDone = null;
        UI.hide('tela-aviso');
        self._persist();
        UI.home(self.save);
        if (action === 'shop') self.openShop('tenis');
        else if (action === 'equip') self.openEquip();
        else self._nextPopup();
      };
      MU.popup(p, function (action) { AU.ui(); if (self._popupDone) self._popupDone(action); });
    },

    openShop: function (cat) {
      AU.unlock(); AU.ui();
      if (this.dressing) this.closeEquip(true);
      MU.shop(cat);
      UI.show('tela-loja');
      document.getElementById('loja-lista').scrollTop = 0;
    },
    buyItem: function (id) {
      if (!EP.Meta.buy(id)) { AU.ui(); return; }
      AU.coin();
      EP.haptics.pulse([20, 30, 20]);
      this._persist();
      MU.shop();
      MU.item(id, true);
      UI.home(this.save);
    },
    equipItem: function (id) {
      if (!EP.Meta.equipItem(id)) return;
      AU.ui();
      EP.haptics.pulse(12);
      this._afterGear();
    },
    unequipSlot: function (slot) {
      EP.Meta.inv.unequip(slot);
      EP.Meta.recompute();
      AU.ui();
      this._afterGear();
    },
    // depois de trocar um item: bônus na corrida, roupa no boneco e as telas abertas
    _afterGear: function () {
      EP.Meta.applyTo(this);
      this.rig.setAppearance(this._look());
      this._persist();
      if (UI.isOpen('tela-equipar')) MU.equip();
      if (UI.isOpen('tela-loja')) MU.shop();
      UI.home(this.save);
    },
    openEquip: function () {
      AU.unlock(); AU.ui();
      this.dressing = true;
      this.camMode = 'create';
      this.cam.turn = 0;
      UI.hide('tela-inicio');
      MU.equip();
      UI.show('tela-equipar');
    },
    closeEquip: function (quiet) {
      this.dressing = false;
      this.camMode = 'home';
      UI.hide('tela-equipar');
      if (this.state !== 'home') return;
      UI.show('tela-inicio');
      UI.home(this.save);
      if (!quiet) this._nextPopup();
    },
    openAchievements: function () {
      AU.unlock(); AU.ui();
      MU.achievements();
      UI.show('tela-conquistas');
      this._persist();   // as novidades já foram vistas
    },
    openMissions: function () {
      AU.unlock(); AU.ui();
      MU.missions();
      UI.show('tela-missoes');
    },
    claimMission: function (i) {
      if (!EP.Meta.claimMission(i)) return;
      AU.coin();
      EP.haptics.pulse([20, 30, 20]);
      this._persist();
      MU.missions();
      UI.home(this.save);
    },
    claimBonus: function () {
      if (!EP.Meta.claimBonus()) return;
      AU.challenge(true);
      EP.haptics.pulse([30, 40, 30]);
      this._persist();
      MU.missions();
      UI.home(this.save);
    },

    openCreator: function (editing) {
      var self = this;
      this.state = 'create';
      this.camMode = 'create';
      this.cam.turn = 0;
      UI.hide('tela-inicio');
      UI.show('tela-criar');
      if (!editing) this._homeScene();
      this.rig.setAppearance(this._look(this.save.profile, true));
      this.creator.open({
        profile: this.save.profile,
        editing: editing,
        onChange: function (p) { self.rig.setAppearance(self._look(p, true)); },
        onDone: function (p) {
          var first = !self.save.profile.created;
          self.save.profile.name = p.name;
          self.save.profile.gender = p.gender;
          self.save.profile.appearance = p.appearance;
          self.save.profile.created = true;
          self.rig.setAppearance(self._look());
          if (first) EP.events.emit('character_created', { gender: p.gender });
          self.goHome();
        },
        onCancel: editing ? function () { self.rig.setAppearance(self._look()); self.goHome(); } : null
      });
    },

    startRun: function () {
      var save = this.save;
      AU.unlock();
      if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
      this.state = 'run';
      this.camMode = 'run';
      this.dressing = false;
      // bônus dos itens equipados (antes de zerar: a energia máxima depende deles)
      var M = EP.Meta;
      M.refreshDay();
      M.recompute();
      M.applyTo(this);
      M.runXp = 0;
      this.runMeta = { levelFrom: save.profile.level, achievements: [], missions: [] };
      M.visit(this.biome.id);
      this.rhythm.reset(); this.flow.reset(); this.energy.reset(); this.speed.reset();
      this.overtakes.reset(); this.economy.reset(); this.draft.reset(); this.pacer.stop();
      var firstRun = !save.stats.runs;
      this.challenges.reset(firstRun || !save.tutorialDone);
      this.progression.startRun();
      this.daynight.phase = this.daynight.startPhaseFor(this.daynight.phase);
      this.saveT = 0; this.secT = 0; this.tapUndo = null; this.lastSpamHint = -99; this.wasExhausted = false;
      this.forkShown = false; this.forkHideT = 0; this.routeId = this.biome.startRoute; this.comboShown = false;
      this.tutorial = save.tutorialDone ? null : { step: -1, t: 0, taps: 0 };
      this.npcs.reset(this.player, this._npcCtx(false));
      META_MODALS.concat(['tela-inicio', 'tela-aviso', 'tela-equipar']).forEach(UI.hide);
      UI.resetCache();
      UI.clearToasts();
      MU.clearRunToasts();
      UI.hud(true);
      UI.flow(0); UI.combo(0); UI.challenge(null); UI.route(null); UI.fork(null); UI.rating(null); UI.hint(null);
      UI.coins(save.coins);
      AU.ambience(true, this.routeId);
      EP.events.emit('run_started', { runs: save.stats.runs, totalDistance: save.stats.totalDistance });
    },

    pause: function () {
      if (this.state !== 'run') return;
      this.state = 'paused';
      UI.show('tela-pausa');
      AU.ambience(false);
      this._persist();
    },

    resume: function () {
      if (this.state !== 'paused') return;
      this.state = 'run';
      UI.hide('tela-pausa');
      UI.hide('tela-opcoes');
      AU.resume();
      AU.ambience(true, this.routeId);
    },

    finishRun: function () {
      var r = this.progression.run;
      this.state = 'summary';
      this.camMode = 'summary';
      UI.hide('tela-pausa');
      UI.hud(false);
      var sum = this.progression.finishRun();
      sum.run.coins = this.economy.runCoins;
      // fecha a parte "meta" da corrida: último segundo, missão de corridas, regiões e conquistas
      var M = EP.Meta, rm = this.runMeta || { levelFrom: this.save.profile.level, achievements: [], missions: [] };
      M.flushRun({ flowLevel: 0, drafting: false, speed: 0 });
      M.track('runs', 1);
      M.checkUnlocks();
      M.checkAchievements();
      this.runMeta = null;
      // o que já aparece no resumo não volta como aviso na tela inicial
      var shown = {};
      rm.achievements.forEach(function (d) { shown[d.id] = 1; });
      M.popups = M.popups.filter(function (p) { return !(p.type === 'achievement' && shown[p.data.id]); });
      MU.clearRunToasts();
      EP.events.emit('run_finished', { distance: r.distance, time: r.time, overtakes: r.overtakes, coins: sum.run.coins, maxFlow: r.maxFlow });
      this._persist();
      UI.summary(sum, this.save);
      MU.summary({ xp: M.runXp, levelFrom: rm.levelFrom, levelTo: this.save.profile.level, achievements: rm.achievements, missions: rm.missions });
      UI.show('tela-resumo');
      AU.ambience(false);
    },

    // ---------------------------------------------------------------- entrada
    _input: function () {
      var self = this, layer = $('toque');
      EP.Input.init(layer, {
        enabled: function () { return self.state === 'run'; },
        tap: function (time) { self.onTap(time); },
        cancelTap: function () { self.cancelTap(); },
        swipe: function (dir) { self.onSwipe(dir); },
        pause: function () { self._escape(); }
      });
      // girar o boneco na criação
      var drag = null;
      var turning = function () { return self.state === 'create' || self.dressing; };
      layer.addEventListener('pointerdown', function (e) { if (turning()) drag = e.clientX; });
      layer.addEventListener('pointermove', function (e) {
        if (drag === null || !turning()) return;
        self.cam.turn += (e.clientX - drag) * 0.012;
        drag = e.clientX;
      });
      window.addEventListener('pointerup', function () { drag = null; });
    },

    _escape: function () {
      if (UI.isOpen('tela-confirmar')) { UI.hide('tela-confirmar'); return; }
      if (UI.isOpen('tela-aviso')) { if (this._popupDone) this._popupDone('ok'); else UI.hide('tela-aviso'); return; }
      for (var i = 0; i < META_MODALS.length; i++) {
        if (UI.isOpen(META_MODALS[i])) { AU.ui(); UI.hide(META_MODALS[i]); this.onModalClosed(); return; }
      }
      if (this.dressing) { AU.ui(); this.closeEquip(); return; }
      if (this.state === 'run') this.pause();
      else if (this.state === 'paused') this.resume();
    },

    onTap: function (time) {
      AU.unlock();
      if (this.state !== 'run') return;
      var ch = this.challenges.active;
      var undo = { flow: this.flow.points, energy: this.energy.value, ch: ch, chProgress: ch ? ch.progress : 0 };
      var res = this.rhythm.tap(time);
      if (!res) return;
      var r = res.rating;
      if (res.spam) {
        this.energy.spend(this.B.energy.spamCost);
        if (this.clock - this.lastSpamHint > 8) { this.lastSpamHint = this.clock; UI.toast(t('hud.spam')); }
      }
      this.flow.onRating(r);
      this.challenges.onRating(r);
      undo.perfect = r === 'perfect';
      if (undo.perfect) {
        this.progression.addPerfect();
        EP.Meta.track('perfects', 1);
        EP.Meta.addXp(EP.Meta.xpCfg().perPerfect || 0, 'perfect');
        EP.haptics.pulse(8);
        if (!this.save.settings.reduceMotion) this.fovKick = 1.3;
      }
      this.tapUndo = undo;
      AU.tap(r, this.flow.level, res.interval);
      UI.rating(r);
      EP.events.emit('tap', { rating: r });
      this._tutorialTap(r);
    },

    // o toque virou deslize: desfaz o efeito no ritmo
    cancelTap: function () {
      var u = this.tapUndo;
      if (!u || this.state !== 'run') return;
      this.rhythm.cancelLast();
      this.flow._set(u.flow);
      this.energy.value = u.energy;
      if (u.ch && this.challenges.active === u.ch) u.ch.progress = u.chProgress;
      if (u.perfect) {
        this.progression.run.perfects--; this.save.stats.perfects--;
        EP.Meta.missions.list().forEach(function (m) { if (m.metric === 'perfects' && !m.done && m.progress > 0) m.progress--; });
      }
      UI.rating(null);
      if (this.tutorial) this.tutorial.taps = Math.max(0, this.tutorial.taps - 1);
      this.tapUndo = null;
    },

    onSwipe: function (dir) {
      if (this.state !== 'run') return;
      if (this.world.pending && this.forkShown) { this._chooseFork(dir); return; }
      this.player.nudge(dir);
    },

    // ---------------------------------------------------------------- quadro
    // Qualidade automática: mede o tempo de quadro e ajusta a resolução (30 fps
    // estáveis como mínimo; volta a subir quando sobra folga)
    _adapt: function (rawDt) {
      if (this.save.settings.quality !== 'auto' || this.state !== 'run') return;
      var a = this._perf || (this._perf = { t: 0, n: 0, sum: 0 });
      a.t += rawDt; a.n++; a.sum += Math.min(rawDt, 0.2);
      if (a.t < 2.5) return;
      var avg = a.sum / a.n, sc = this.resScale || 1;
      if (avg > 1 / 38 && sc > 0.6) sc = Math.max(0.6, sc - 0.12);
      else if (avg < 1 / 56 && sc < 1) sc = Math.min(1, sc + 0.06);
      a.t = 0; a.n = 0; a.sum = 0;
      if (sc !== this.resScale) { this.resScale = sc; this._resize(); }
    },

    _frame: function (now) {
      var raw = Math.max(0, (now - this.last) / 1000), dt = Math.min(0.05, raw);
      this.last = now;
      this._adapt(raw);
      this.clock = now / 1000;
      if (this.state === 'run') this._updateRun(dt);
      else if (this.state === 'home' || this.state === 'create' || this.state === 'summary') this._updateIdle(dt);
      this._updateCamera(dt);
      this.daynight.update(dt, this.camera.position, this.state === 'run');
      this.daynight.follow(this.rig.root.position, this.camera);
      // duas camadas: céu e paisagem distante, depois o mundo (que termina na neblina)
      var cam = this.camera, r = this.renderer;
      r.clear();
      cam.far = 1400; cam.updateProjectionMatrix();
      r.render(this.daynight.back, cam);
      r.clearDepth();
      cam.far = this.daynight.fog.far + 15; cam.updateProjectionMatrix();
      r.render(this.scene, cam);
    },

    _npcCtx: function (idle) {
      var seg = this.world.segmentAt(this.player.z), route = EP.data.routes[seg ? seg.route : 'bairro'];
      var density = idle ? 0.5 : (route.modifiers.npcDensity || 1) * ((seg && seg.def.npcDensity) || 1);
      var self = this;
      return {
        playerSpeed: idle ? 0 : this.speed.value,
        runDistance: this.progression.run ? this.progression.run.distance : 0,
        density: density, gen: this.world, home: idle,
        onOvertake: idle ? null : function (n) { self._onOvertake(n); }
      };
    },

    _updateIdle: function (dt) {
      this.rig.animate(dt, 0, { idle: true });
      this.rig.root.rotation.y = U.damp(this.rig.root.rotation.y, this.state === 'create' || this.dressing ? this.cam.turn : 0, 10, dt);
      this.npcs.update(dt, this.player, this._npcCtx(true));
    },

    _updateRun: function (dt) {
      var B = this.B, W = EP.data.world, clock = this.clock;
      var seg = this.world.segmentAt(this.player.z), route = EP.data.routes[seg.route], mods = route.modifiers;
      var freq = this.rhythm.frequency(clock);
      this.flow.update(dt, this.rhythm.idle(clock));
      var lvl = this.flow.level;
      this.draft.update(dt, this.npcs.pool, this.player, this.speed.value);
      var fx = EP.Meta.fx;   // tênis, camisetas, shorts... (EquipmentManager.effects)
      this.speed.update(dt, freq, { flowLevel: lvl, exhausted: this.energy.exhausted, speedBonus: this.draft.speedBonus(), statSpeed: fx.speedMult });
      this.energy.update(dt, this.speed.value, { flowLevel: lvl, energy: mods.energy, consumption: this.draft.consumption() * fx.consumptionMult, recovery: fx.recoveryMult });
      if (this.energy.exhausted && !this.wasExhausted) UI.toast(t('hud.lowEnergy'), 2600);
      this.wasExhausted = this.energy.exhausted;
      var limits = this.world.limitsAt(this.player.z, this.player.x, B.run.laneLimit);
      this.player.update(dt, this.speed.value, limits);
      var meters = this.speed.value / 3.6 * dt;
      this.progression.tick(dt, meters, this.speed.value);
      this.economy.addDistance(meters, this._coinMult(lvl, mods));
      if (lvl > 0) this.progression.addFlowTime(dt);
      EP.Meta.runTick(dt, meters, { flowLevel: lvl, drafting: this.draft.active, speed: this.speed.value });

      this.world.update(this.player.z);
      this._updateFork(dt);
      this.npcs.update(dt, this.player, this._npcCtx(false));
      this.overtakes.update(clock);
      if (this.comboShown && !this.overtakes.combo) { this.comboShown = false; UI.combo(0); }
      this.challenges.update(dt, {
        distance: this.progression.run.distance, blocked: this.forkShown || (this.tutorial && this.tutorial.step < 3),
        meters: meters, speed: this.speed.value, energy: this.energy.fraction(), drafting: this.draft.active,
        pacerGap: this.pacer.gap(this.player), level: this.save.profile.level
      });
      if (this.challenges.active) UI.challengeTick(this.challenges.active);

      seg = this.world.segmentAt(this.player.z);
      if (seg.route !== this.routeId) {
        this.routeId = seg.route;
        UI.route(this.routeId);
        UI.toast(this.routeId === this.biome.startRoute ? t('route.back') : t('route.entered', { name: EP.data.routes[this.routeId].icon + ' ' + t(EP.data.routes[this.routeId].text) }));
        AU.ambience(true, this.routeId);
      }
      if (this.player.z < -W.rebaseEvery) this._rebase(W.rebaseEvery);
      this._tutorialUpdate(dt);
      AU.tick(dt, this.speed.intensity());

      this.secT += dt;
      if (this.secT >= 1) { this.secT -= 1; EP.Analytics.runningSecond(); }
      this.saveT += dt;
      if (this.saveT >= B.run.saveEvery) { this.saveT = 0; this._persist(); }

      UI.updateHud({
        dt: dt, distance: this.progression.run.distance, speed: this.speed.value, zone: this.speed.zone(),
        energy: this.energy.fraction(), exhausted: this.energy.exhausted, overtakes: this.progression.run.overtakes,
        beat: this.rhythm.phase(clock), flow: lvl, flowProgress: this.flow.progress()
      });
    },

    // moedas: FLOW e rota multiplicam; no FLOW os fones dão um bônus a mais
    _coinMult: function (lvl, mods) {
      return this.economy.multiplier(lvl, mods) * (lvl > 0 ? EP.Meta.fx.flowCoinMult : 1);
    },

    _onOvertake: function () {
      var seg = this.world.segmentAt(this.player.z), mods = EP.data.routes[seg.route].modifiers;
      var o = this.overtakes.onOvertake(this.clock);
      this.progression.addOvertake(o.combo);
      EP.Meta.track('overtakes', 1);
      EP.Meta.track('combo', o.combo, 'max');
      this.economy.add(o.coins * this._coinMult(this.flow.level, mods), 'overtake');
      this.challenges.onOvertake(o.combo);
      UI.combo(o.combo);
      this.comboShown = o.combo > 1;
      AU.overtake(o.combo);
    },

    _updateFork: function (dt) {
      var W = EP.data.world, fd = this.world.forkDistance(this.player.z);
      if (this.forkHideT > 0) { this.forkHideT -= dt; if (this.forkHideT <= 0) UI.fork(null); }
      if (fd === Infinity) return;
      if (!this.forkShown && fd < W.forkPromptAt) {
        this.forkShown = true;
        this.forkHideT = 0;
        UI.fork(this.world.pending.fork);
        AU.ui();
      }
      if (this.forkShown && fd < W.forkDecideAt) this._chooseFork(this.player.x < 0 ? -1 : 1);
    },

    _chooseFork: function (side) {
      var route = this.world.choose(side);
      if (!route) return;
      this.forkShown = false;
      this.forkHideT = 1.4;
      this.player.goTo(side * 2.3);
      UI.forkChosen(side);
      AU.challenge(true);
      this.save.stats.forks[route] = (this.save.stats.forks[route] || 0) + 1;
      EP.events.emit('route_chosen', { route: route });
      if (this.tutorial && this.tutorial.step === 4) this._tutorialStep(5);
    },

    _rebase: function (shift) {
      this.world.rebase(shift);
      this.player.rebase(shift);
      this.npcs.rebase(shift);
      this.camera.position.z += shift;
      this.cam.look.z += shift;
    },

    // ---------------------------------------------------------------- tutorial (GDD §68)
    _tutorialStep: function (n) {
      var tu = this.tutorial;
      tu.step = n; tu.t = 0;
      var touch = EP.Input.touchSeen || ('ontouchstart' in window);
      switch (n) {
        case 0: UI.hint(t('tut.1'), touch ? t('tut.1b') : t('tut.1k')); break;
        case 1: UI.hint(t('tut.2'), t('tut.2b')); break;
        case 2: UI.hint(t('tut.3'), t('tut.3b')); break;
        case 3: UI.hint(null); break;
        case 4: UI.hint(t('tut.4'), t('tut.4b')); break;
        case 5: UI.hint(t('tut.done'), ''); break;
      }
    },
    _tutorialTap: function (r) {
      var tu = this.tutorial;
      if (!tu) return;
      tu.taps++;
      if (tu.step === 0 && tu.taps >= 3) this._tutorialStep(1);
      else if (tu.step === 1 && r === 'perfect') this._tutorialStep(2);
    },
    _tutorialUpdate: function (dt) {
      var tu = this.tutorial;
      if (!tu) return;
      tu.t += dt;
      if (tu.step === -1) this._tutorialStep(0);
      else if (tu.step === 2 && tu.t > 2.8) this._tutorialStep(3);
      else if (tu.step === 3 && this.forkShown) this._tutorialStep(4);
      else if (tu.step === 5 && tu.t > 2.2) {
        UI.hint(null);
        this.tutorial = null;
        this.save.tutorialDone = true;
        EP.events.emit('tutorial_completed', {});
        this._persist();
      }
    },

    // ---------------------------------------------------------------- câmera (GDD §64)
    _updateCamera: function (dt) {
      if (this.camMode === 'free') { this.camera.updateProjectionMatrix(); return; }   // ferramentas de inspeção posicionam a câmera
      var c = this.cam, B = this.B.camera, cam = this.camera, p = this.player, aspect = cam.aspect;
      var calm = this.save.settings.reduceMotion, k = U.smooth((0.85 - aspect) / 0.35);
      var theta, r, h, fov, lx, ly, lz, cx;
      if (this.camMode === 'run') {
        var it = this.speed.intensity(), lvl = Math.min(this.flow.level, 4);
        theta = 0;
        r = U.lerp(B.walk.dist, B.sprint.dist, it) * U.lerp(1, B.portraitDist, k);
        h = U.lerp(B.walk.height, B.sprint.height, it) - k * 0.1;
        // 55° caminhando, 60° correndo, 65° no sprint (+ um pouco no FLOW)
        fov = (it < 0.5 ? U.lerp(B.walk.fov, B.run.fov, it * 2) : U.lerp(B.run.fov, B.sprint.fov, it * 2 - 1)) + lvl * B.flowFov + (calm ? 0 : this.fovKick * 0.6);
        cx = p.x * 0.55; lx = p.x * 0.7; ly = 1.2 - k * 0.15; lz = p.z - 10;
        if (!calm) h += Math.sin(this.rig.phase * 2) * 0.012 * U.smooth((this.speed.value - 6) / 4);
      } else {
        var create = this.camMode === 'create';
        theta = Math.PI - (create ? 0.15 : 0.42);
        r = create ? 3.7 + k * 0.6 : 4.3 + k * 0.6;
        h = create ? 1.25 : 1.4;
        fov = 50;
        cx = p.x;
        lx = p.x; ly = 0.95; lz = p.z;
      }
      // celular em pé: abre a vertical para manter um campo horizontal mínimo
      var hmin = (this.camMode === 'run' ? B.minHFov : 40) * Math.PI / 180;
      var vNeed = 2 * Math.atan(Math.tan(hmin / 2) / aspect) * 180 / Math.PI;
      fov = Math.min(B.maxVFov, Math.max(fov, vNeed));
      this._viewOffset(dt);   // em todos os modos (na corrida volta a zero)
      this.fovKick = U.damp(this.fovKick, 0, 6, dt);
      if (this.snapCam) {
        c.theta = theta; c.r = r; c.h = h; c.fov = fov; c.look.set(lx, ly, lz); c.cx = cx;
        this.snapCam = false;
      } else {
        c.theta = U.damp(c.theta, theta, 2.6, dt);
        c.r = U.damp(c.r, r, 2.2, dt);
        c.h = U.damp(c.h, h, 2.2, dt);
        c.fov = U.damp(c.fov, fov, 2, dt);
        c.cx = U.damp(c.cx, cx, 3.5, dt);
        c.look.x = U.damp(c.look.x, lx, 3.5, dt);
        c.look.y = U.damp(c.look.y, ly, 4, dt);
        c.look.z = this.camMode === 'run' ? U.damp(c.look.z, lz, 12, dt) : U.damp(c.look.z, lz, 4, dt);
      }
      cam.position.set(c.cx + Math.sin(c.theta) * c.r, c.h, p.z + Math.cos(c.theta) * c.r);
      cam.fov = c.fov;
      cam.updateProjectionMatrix();
      cam.lookAt(c.look);
      // curvatura da rua à frente
      var BEND = EP.Materials.BEND, target = this.camMode === 'run' ? this.world.curvatureAt(p.z - 80) * 0.0009 : 0;
      BEND.uBendOrigin.value = cam.position.z;
      BEND.uBendX.value = U.damp(BEND.uBendX.value, target, 0.6, dt);
    },

    // desloca a imagem para o boneco ficar na parte livre da tela (fora dos painéis)
    _viewOffset: function (dt) {
      var w = window.innerWidth, h = window.innerHeight, ox = 0, oy = 0, el;
      if (this.state === 'create' || this.dressing) {
        el = document.querySelector(this.dressing ? '#tela-equipar .painel' : '#tela-criar .painel');
        if (w < h) oy = el.offsetHeight / 2 - 10;
        else ox = (el.offsetWidth + 16) / 2;
      } else if (this.state === 'home') {
        el = document.querySelector('.inicio-base');
        if (w < h) oy = el.offsetHeight / 2 - 30;
        else ox = -el.offsetWidth / 2;
      }
      var v = this.view || (this.view = { x: ox, y: oy });
      if (this.snapCam) { v.x = ox; v.y = oy; }
      v.x = U.damp(v.x, ox, 5, dt); v.y = U.damp(v.y, oy, 5, dt);
      if (Math.abs(v.x) < 0.5 && Math.abs(v.y) < 0.5) { if (this.camera.view && this.camera.view.enabled) this.camera.clearViewOffset(); }
      else this.camera.setViewOffset(w, h, v.x, v.y, w, h);
    },

    _resize: function () {
      var w = window.innerWidth, h = window.innerHeight, q = this.save.settings.quality, dpr = window.devicePixelRatio || 1;
      var base = q === 'low' ? Math.min(dpr, 1) : Math.min(dpr, q === 'high' ? 2 : 1.5);
      this.renderer.setPixelRatio(base * (q === 'auto' ? this.resScale || 1 : 1));
      this.renderer.setSize(w, h, false);
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
    },

    // ---------------------------------------------------------------- eventos e botões
    _events: function () {
      var self = this, E = EP.events;
      E.on('flow_level', function (p) {
        if (self.state !== 'run') return;
        var up = p.level > p.prev;
        UI.flow(p.level, up);
        if (up) { AU.flowUp(p.level); EP.haptics.pulse(20); self.progression.setFlow(p.level); }
      });
      E.on('flow_lost', function () { if (self.state === 'run') AU.flowLost(); });
      E.on('challenge_started', function (p) {
        if (p.type === 'pacer') self.pacer.start(self.player, p.speed);
        UI.challenge(self.challenges.active); AU.ui();
      });
      var endPacer = function () { self.pacer.stop(); };
      E.on('challenge_failed', endPacer); E.on('challenge_completed', endPacer); E.on('challenge_cancelled', endPacer);
      E.on('challenge_completed', function (p) {
        var coins = self.economy.add(p.reward.coins, 'challenge');
        self.progression.run.challenges++;
        var M = EP.Meta, x = M.xpCfg();
        M.track('challenges', 1);
        M.addXp(x.perChallenge || 0, 'challenge');
        if (p.type === 'pacer') { M.track('pacers', 1); M.addXp(x.perPacer || 0, 'pacer'); }
        M.checkAchievements();
        UI.challengeDone(true, p.target);
        UI.toast(t('ch.done') + ' ' + t('ch.reward', { n: coins }), 2600);
        AU.challenge(true);
        EP.haptics.pulse([30, 40, 30]);
      });
      E.on('challenge_failed', function () { UI.challengeDone(false); UI.toast(t('ch.failed')); AU.challenge(false); });
      E.on('distance_reached', function (p) { UI.toast(t('toast.km', { n: p.km }), 2400); });
      E.on('coins', function (p) {
        UI.coins(p.total);
        if (self.state === 'home') document.getElementById('i-moedas').textContent = EP.i18n.num(p.total);
        if (p.reason !== 'distance' && !p.silent) AU.coin();
      });
      // conquistas, missões e nível: aviso rápido na corrida e lista no resumo
      E.on('achievement_unlocked', function (p) {
        if (self.state !== 'run' && self.state !== 'paused' && !self.runMeta) return;
        var d = p.def;
        if (self.runMeta) self.runMeta.achievements.push(d);
        if (self.state === 'run') { MU.runToast(d.icon, t('toast.ach'), t(d.text + '.t')); AU.challenge(true); }
      });
      E.on('mission_completed', function (p) {
        if (!self.runMeta) return;
        var m = EP.Meta.missions.list().filter(function (x) { return x.id === p.id; })[0];
        if (!m) return;
        self.runMeta.missions.push(m);
        if (self.state === 'run') { MU.runToast(MU.missionIcon[m.metric] || '🎯', t('toast.mission'), MU.missionText(m)); AU.ui(); }
      });
      E.on('level_up', function (p) {
        if (self.state === 'run') { MU.runToast('⭐', t('toast.level'), t('lvl.level', { n: p.level }) + ' · ' + t(EP.Meta.levels.title(p.level))); AU.flowUp(5); }
      });
    },

    _buttons: function () {
      var self = this;
      $('i-correr').addEventListener('click', function () { self.startRun(); });
      $('i-loja').addEventListener('click', function () { self.openShop(); });
      $('i-equipar').addEventListener('click', function () { self.openEquip(); });
      $('i-conquistas').addEventListener('click', function () { self.openAchievements(); });
      $('i-missoes').addEventListener('click', function () { self.openMissions(); });
      $('i-perfil').addEventListener('click', function () { AU.unlock(); AU.ui(); UI.records(self.save); UI.show('tela-recordes'); });
      $('i-corredor').addEventListener('click', function () { AU.unlock(); AU.ui(); self.openCreator(true); });
      $('i-recordes').addEventListener('click', function () { AU.unlock(); AU.ui(); UI.records(self.save); UI.show('tela-recordes'); });
      $('i-opcoes').addEventListener('click', function () { AU.unlock(); AU.ui(); self._openOptions(); });
      $('h-pausa').addEventListener('click', function () { self.pause(); });
      $('p-continuar').addEventListener('click', function () { self.resume(); });
      $('p-opcoes').addEventListener('click', function () { self._openOptions(); });
      $('p-encerrar').addEventListener('click', function () { self.finishRun(); });
      $('r-continuar').addEventListener('click', function () { AU.ui(); self.goHome(); });
    },

    // uma tela foi fechada (botão ✕/Fechar ou ESC)
    onModalClosed: function () {
      if (this.dressing && !UI.isOpen('tela-equipar')) { this.closeEquip(); return; }
      if (UI.isOpen('tela-loja')) MU.shop();   // fechou o detalhe do item
      if (this.state === 'home') { UI.home(this.save); this._nextPopup(); }
    },

    _openOptions: function () {
      var self = this;
      UI.options(this.save, {
        change: function (key, value) { self.changeSetting(key, value); },
        reset: function () { self.saveMgr.reset(); self.saveMgr.save(); location.reload(); }
      });
      UI.show('tela-opcoes');
    },

    changeSetting: function (key, value) {
      var st = this.save.settings;
      st[key] = value;
      if (key === 'lang') {
        EP.i18n.set(value);
        EP.i18n.apply();
        UI.resetCache();
        EP.ForkSigns.refreshAll();
        if (this.state === 'home') UI.home(this.save);
        if (this.state === 'run' || this.state === 'paused') UI.route(this.routeId);
      }
      this._applySettings();
      this._persist();
      this._openOptions();
    },

    _applySettings: function () {
      var st = this.save.settings, html = document.documentElement;
      AU.set(st);
      EP.haptics.enabled = st.vibration;
      html.classList.toggle('grande', !!st.bigUi);
      html.classList.toggle('calmo', !!st.reduceMotion);
    },

    _persist: function () {
      if (!this.save) return;
      if (this.daynight) this.save.world.timeOfDay = this.daynight.phase;
      this.saveMgr.save();
    },

    // Inspeção visual (ferramentas de teste): coloca um módulo à frente do
    // corredor, sem HUD nem corredores da rua. opts: { phase, dist (0–1 do módulo) }
    debugShowModule: function (moduleId, opts) {
      opts = opts || {};
      var W = this.world, def = W.defs[moduleId];
      if (!def) throw new Error('módulo não existe: ' + moduleId);
      this.biome = W.biomeById(def.biome);
      W.reset({ biome: def.biome, startZ: 10 });
      W.segments.forEach(function (sg) { W._release(sg); });
      W.segments = []; W.pending = null; W.zEnd = 10;
      var fork = def.fork ? (EP.data.forks.filter(function (f) { return f.module === moduleId; })[0] || null) : null;
      W._append(def, fork, !!opts.sign);
      W.pending = null;
      var start = W.routes[W.biome.startRoute].modules.filter(function (id) { return id !== moduleId; });
      W._append(W.defs[start[0] || moduleId]); W._append(W.defs[start[1] || start[0] || moduleId]);
      this.state = 'debug';
      this.camMode = 'run';
      ['tela-criar', 'tela-inicio', 'tela-pausa', 'tela-resumo'].forEach(UI.hide);
      UI.hud(false);
      this.player.reset(0);
      this.player.z = 10 - def.length * (opts.dist === undefined ? 0.3 : opts.dist);
      this.player.update(0, 4, [-3.3, 3.3]);
      this.npcs.hideAll();
      if (opts.phase !== undefined) this.daynight.phase = opts.phase;
      this.daynight.setBiome(this.biome);
      this.snapCam = true;
      return { biome: def.biome, length: def.length };
    },

    // números de desempenho (para testes)
    debug: function () {
      var i = this.renderer.info;
      return { calls: i.render.calls, triangles: i.render.triangles, geometries: i.memory.geometries, npcs: this.npcs.activeCount(), segments: this.world.segments.length, state: this.state };
    }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { G.boot(); });
  else G.boot();
})(window.EP);
