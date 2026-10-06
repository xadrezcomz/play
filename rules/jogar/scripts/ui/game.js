// Game: liga as telas (menu, mapa, ajustes, jogo, fim) ao engine e aos
// managers. Fluxo: INSTRUÇÃO → TENTAR → RESOLVER → feedback → PRÓXIMA FASE,
// sem menus entre as fases.
(function () {
  'use strict';
  var R = window.RULES, U = R.util;
  function $(s) { return document.querySelector(s); }

  var THEME_COLOR = { 1: '#FFF7EC', 2: '#EEF5FF', 3: '#F0FAEE', 4: '#F6F0FF', 5: '#FFF0F3' };

  var G = R.Game = {
    current: null,
    won: false,

    init: function () {
      var self = this;
      R.Save.load();
      R.i18n.set(R.Save.setting('lang') || R.i18n.detect());
      this.app = $('#app');
      this.screens = {
        menu: $('#scr-menu'), map: $('#scr-map'), settings: $('#scr-settings'),
        play: $('#scr-play'), end: $('#scr-end')
      };
      this.applySettings();
      this.measure();
      R.Stage.init($('#layer'), $('#board-area'));
      R.Effects.init($('#fx'), this.app);
      R.Hints.init($('#hint-sheet'));

      this.engine = new R.PuzzleEngine({
        layer: $('#layer'),
        instruction: $('#instr-text'),
        label: $('#level-label'),
        inputRoot: this.screens.play,
        hooks: {
          onWin: function (lv, done) { self.onWin(lv, done); },
          toast: function (text, kind) { self.toast(text, kind); },
          mascot: function (expr) { self.mascot(expr); },
          ripple: function (x, y) { R.Effects.ripple(self.screens.play, x, y); }
        }
      });

      this.bindUI();
      R.i18n.applyDom();
      this.show('menu');
      R.Analytics.track('game_opened');
    },

    // ---------- layout ----------
    // Retrato: tudo numa coluna. Paisagem (celular deitado, tablet, PC): instrução
    // e botões à esquerda, puzzle grande à direita. --W é a "largura de referência"
    // que dá o tamanho das letras e botões nos dois casos.
    measure: function () {
      var vw = window.innerWidth, vh = window.innerHeight;
      var land = vw / vh > 1.05;
      this.app.classList.toggle('land', land);
      document.documentElement.classList.toggle('land', land);
      var r = this.app.getBoundingClientRect();
      var W = land ? Math.min(r.width * 0.4, r.height * 0.78, 640) : r.width;
      this.app.style.setProperty('--W', W + 'px');
      this.app.style.setProperty('--H', r.height + 'px');
      this.land = land;
    },

    onResize: function () {
      this.measure();
      R.Effects.resize();
      if (this.engine.level) this.engine.layout();
    },

    applySettings: function () {
      R.reduceMotion = !!R.Save.setting('reduceMotion');
      this.app.classList.toggle('reduce-motion', R.reduceMotion);
    },

    setTheme: function (chapter) {
      var app = this.app;
      var t = ((chapter - 1) % 5) + 1;   // os capítulos 6–10 reaproveitam as 5 cores
      [1, 2, 3, 4, 5].forEach(function (n) { app.classList.toggle('ch' + n, n === t); });
      var meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute('content', THEME_COLOR[t] || THEME_COLOR[1]);
    },

    // ---------- telas ----------
    show: function (name) {
      if (name !== 'play') this.engine.unload();
      R.Transition.show(this.screens, name);
      this.screen = name;
      if (name === 'menu') { this.setTheme(1); this.renderMenu(); }
      if (name === 'map') this.renderMap();
      if (name === 'settings') this.renderSettings();
      if (name === 'end') this.renderEnd();
    },

    bindUI: function () {
      var self = this;
      document.addEventListener('click', function (e) {
        var b = e.target.closest('[data-act]');
        if (!b) return;
        R.Audio.unlock();
        var act = b.getAttribute('data-act');
        if (act !== 'hint-more' && act !== 'hint-close') R.Audio.play('click');
        if (act === 'play') self.startLevel(R.Levels.current(), { chapterCard: true });
        else if (act === 'map') self.show('map');
        else if (act === 'settings') self.show('settings');
        else if (act === 'menu') self.show('menu');
        else if (act === 'leave') self.leave();
        else if (act === 'hint') self.openHint();
        else if (act === 'restart') self.restart();
      });

      $('#menu-ruli').addEventListener('click', function () {
        var el = $('#menu-ruli');
        self._menuExpr = (self._menuExpr + 1) % R.Ruli.EXPRESSIONS.length || 0;
        el.innerHTML = R.Ruli.svg(R.Ruli.EXPRESSIONS[self._menuExpr]);
        el.classList.remove('fx-hop'); void el.offsetWidth; el.classList.add('fx-hop');
        R.Audio.unlock();
        R.Audio.play('ruli');
      });

      this.screens.settings.addEventListener('click', function (e) {
        var row = e.target.closest('[data-setting]');
        if (row) {
          var k = row.getAttribute('data-setting'), v = !R.Save.setting(k);
          if (k === 'music') R.Audio.setMusic(v); else R.Save.setSetting(k, v);
          if (k === 'reduceMotion') self.applySettings();
          if (k === 'vibration' && v) R.Audio.vibrate(30);
          self.renderSettings();
          return;
        }
        var lang = e.target.closest('[data-lang]');
        if (lang) {
          R.Save.setSetting('lang', lang.getAttribute('data-lang'));
          R.i18n.set(lang.getAttribute('data-lang'));
          R.i18n.applyDom();
          self.renderSettings();
          R.Audio.play('click');
        }
      });

      $('#btn-reset').addEventListener('click', function () {
        var b = $('#btn-reset span');
        if (!self._resetArmed) {
          self._resetArmed = true;
          b.textContent = R.i18n.t('UI_RESET_CONFIRM');
          clearTimeout(self._resetT);
          self._resetT = setTimeout(function () { self._resetArmed = false; self.renderSettings(); }, 3000);
          return;
        }
        self._resetArmed = false;
        R.Save.reset();
        R.Audio.stopMusic();
        if (R.Save.setting('music')) R.Audio.startMusic();
        self.applySettings();
        b.textContent = R.i18n.t('UI_RESET_DONE');
        setTimeout(function () { self.renderSettings(); }, 1200);
      });

      window.addEventListener('resize', function () { self.onResize(); });
      if (window.visualViewport) window.visualViewport.addEventListener('resize', function () { self.onResize(); });

      document.addEventListener('visibilitychange', function () {
        if (document.hidden) {
          R.Audio.suspend();
          if (self.engine.level && !self.won) self.engine.pause();
        } else {
          R.Audio.resume();
          if (self.engine.level && !self.won && !R.Hints.isOpen() && !self._card) self.engine.resume();
        }
      });
      window.addEventListener('pagehide', function () { self.trackAbandon(); });

      document.addEventListener('keydown', function (e) {
        if (self.screen !== 'play' || e.repeat) return;
        var k = e.key.toLowerCase();
        if (k === 'escape') { if (R.Hints.isOpen()) R.Hints.close(); else self.leave(); }
        else if (k === 'r') self.restart();
        else if (k === 'h' || k === 'd') { if (R.Hints.isOpen()) R.Hints.close(); else self.openHint(); }
      });

      document.addEventListener('contextmenu', function (e) { if (self.screen === 'play') e.preventDefault(); });
    },

    renderMenu: function () {
      var any = Object.keys(R.Save.data.completed).length > 0;
      $('#btn-play').textContent = R.i18n.t(any ? 'UI_CONTINUE' : 'UI_PLAY');
      this._menuExpr = 0;
      $('#menu-ruli').innerHTML = R.Ruli.svg('normal');
    },

    renderMap: function () {
      var self = this, list = $('#map-list'), cur = R.Levels.current();
      list.innerHTML = '';
      (R.CHAPTERS || []).forEach(function (ch) {
        var ids = R.Levels.chapterLevels(ch.id);
        if (!ids.length) return;
        var h = U.el('li', 'map-chapter', list);
        U.el('span', 'map-ch-k', h).textContent = R.i18n.t('CHAPTER_LABEL', { n: ch.id });
        U.el('span', 'map-ch-t', h).textContent = R.i18n.t(ch.title);
        ids.forEach(function (id) {
          var done = R.Save.isCompleted(id), open = R.Levels.isUnlocked(id);
          var li = U.el('li', 'map-node' + (done ? ' done' : open ? ' open' : ' locked') + (id === cur && !done ? ' current' : ''), list);
          var b = U.el('button', 'map-btn', li);
          b.disabled = !open;
          var n = U.el('span', 'map-n', b);
          n.textContent = U.pad(R.Levels.number(id));
          var txt = U.el('span', 'map-txt', b);
          U.el('span', 'map-title', txt).textContent = open ? R.i18n.plain(R.Levels.get(id).instruction) : '? ? ?';
          var sub = U.el('span', 'map-sub', txt);
          if (done) sub.textContent = '✓ ' + R.i18n.t('UI_COMPLETED') + ' · ' + R.i18n.t('UI_ATTEMPTS', { n: R.Save.attempts(id) });
          else if (!open) sub.textContent = R.i18n.t('UI_LOCKED');
          U.el('span', 'map-st', b).textContent = done ? '✓' : open ? '●' : '🔒';
          b.addEventListener('click', function () { if (open) self.startLevel(id, { chapterCard: false }); });
        });
      });
      var c = list.querySelector('.current') || list.querySelector('.open:last-of-type');
      if (c && c.scrollIntoView) c.scrollIntoView({ block: 'center' });
    },

    renderSettings: function () {
      document.querySelectorAll('[data-setting]').forEach(function (row) {
        var on = !!R.Save.setting(row.getAttribute('data-setting'));
        row.setAttribute('aria-checked', on ? 'true' : 'false');
        row.classList.toggle('on', on);
      });
      var box = $('#lang-list');
      box.innerHTML = '';
      R.i18n.languages().forEach(function (l) {
        var b = U.el('button', 'lang' + (l.code === R.i18n.lang ? ' on' : ''), box);
        b.setAttribute('data-lang', l.code);
        b.textContent = l.name;
      });
      $('#btn-reset span').textContent = R.i18n.t('UI_RESET');
    },

    renderEnd: function () {
      $('#end-ruli').innerHTML = R.Ruli.svg('happy');
      var r = this.app.getBoundingClientRect();
      setTimeout(function () { R.Effects.burst(r.left + r.width / 2, r.top + r.height * 0.35, 60); }, 150);
      R.Audio.play('success');
    },

    // ---------- fases ----------
    startLevel: function (id, opts) {
      var self = this, def = R.Levels.get(id);
      opts = opts || {};
      if (!def || !R.Levels.isUnlocked(id)) return;
      if (this.screen !== 'play') this.show('play');
      this.current = id;
      this.won = false;
      R.Save.setLast(id);
      this.setTheme(def.chapter);
      this.clearFeedback();
      // tentativas nesta visita à fase (algumas fases mudam quando você tenta de novo)
      this._tries = opts.restart && this._triesId === id ? (this._tries || 1) + 1 : 1;
      this._triesId = id;
      if (!def.label) $('#level-label').textContent = R.i18n.t('UI_LEVEL', { n: U.pad(R.Levels.number(id)) });
      this.engine.load(def, { attempt: this._tries });

      var n = R.Save.addAttempt(id);
      if (!opts.restart) R.Analytics.track('level_started', { level: id });
      R.Analytics.track('level_attempt', { level: id, attempt: n });

      if (opts.chapterCard && R.Levels.isChapterStart(id)) {
        var ch = R.Levels.chapter(def.chapter);
        this.engine.pause();
        this._card = true;
        R.Transition.card($('#chapter-card'), R.i18n.t('CHAPTER_LABEL', { n: def.chapter }), R.i18n.t(ch ? ch.title : ''), 1500)
          .then(function () {
            self._card = false;
            if (self.current === id && !R.Hints.isOpen()) self.engine.resume();
          });
      }
    },

    restart: function () {
      var self = this, id = this.current;
      if (!this.engine.level || this.won || this._card) return;
      R.Hints.close();
      R.Transition.swap(this.screens.play, function () { self.startLevel(id, { restart: true }); }, { out: 90, 'in': 140 });
    },

    leave: function () {
      R.Hints.close();
      this.trackAbandon();
      this.show('map');
    },

    trackAbandon: function () {
      if (this.screen === 'play' && this.engine.level && !this.won) {
        R.Analytics.track('level_abandoned', { level: this.current });
      }
    },

    openHint: function () {
      var self = this, lv = this.engine.level;
      if (!lv || this.won || this._card || R.Hints.isOpen()) return;
      this.engine.hintOpened();
      this.engine.pause();
      this.mascot('thinking', true);
      R.Hints.open(lv, function () {
        self.hideMascot();
        if (self.engine.level === lv && !self.won) self.engine.resume();
      });
    },

    onWin: function (lv, done) {
      var self = this, id = lv.id, first = !R.Save.isCompleted(id), next = R.Levels.next(id);
      this.won = true;
      R.Hints.close();
      R.Save.markCompleted(id);
      if (next) R.Save.setUnlocked(next);
      R.Analytics.track('level_completed', { level: id, attempts: R.Save.attempts(id), hints: R.Save.hintTier(id) });
      if (first && R.Levels.isChapterEnd(id)) R.Analytics.track('chapter_completed', { chapter: lv.chapter });

      R.Audio.play('pop');
      setTimeout(function () { R.Audio.play('success'); }, 90);
      R.Audio.vibrate(30);
      var a = $('#board-area').getBoundingClientRect();
      R.Effects.burst(a.left + a.width / 2, a.top + a.height * 0.45, 40);
      var c = $('#celebrate');
      c.textContent = R.i18n.t('SUCCESS_' + (1 + Math.floor(Math.random() * 3)));
      c.classList.remove('show'); void c.offsetWidth; c.classList.add('show');
      $('#layer').classList.remove('win-zoom'); void $('#layer').offsetWidth; $('#layer').classList.add('win-zoom');
      this.toast('', null);
      this.mascot('happy');

      Promise.all([done, U.wait(R.reduceMotion ? 600 : 950)]).then(function () {
        if (self.current !== id || self.screen !== 'play') return;
        if (lv.finale === 'mid') { self.finale(next); return; }
        if (!next) { self.show('end'); return; }
        R.Transition.swap(self.screens.play, function () { self.startLevel(next, { chapterCard: true }); });
      });
    },

    // Final da fase 50: "AGORA VOCÊ CONHECE AS REGRAS." → a palavra cai → "...OU NÃO."
    finale: function (next) {
      var self = this, f = $('#finale'), w = f.querySelector('.finale-word');
      f.querySelector('.finale-a').textContent = R.i18n.t('FINALE_1');
      w.textContent = R.i18n.t('FINALE_WORD');
      f.querySelector('.finale-b').textContent = R.i18n.t('FINALE_2');
      f.querySelector('.finale-go').textContent = R.i18n.t('UI_CONTINUE');
      f.classList.remove('dropped', 'shake');
      f.hidden = false;
      void f.offsetWidth;
      f.classList.add('show');
      var r = this.app.getBoundingClientRect();
      R.Effects.burst(r.left + r.width / 2, r.top + r.height * 0.4, 70);
      setTimeout(function () { f.classList.add('shake'); }, 1600);
      w.onclick = function () {
        if (f.classList.contains('dropped')) return;
        f.classList.add('dropped');
        R.Audio.play('whoosh');
        setTimeout(function () { R.Audio.play('collision'); }, 500);
      };
      f.querySelector('.finale-go').onclick = function () {
        f.classList.remove('show');
        setTimeout(function () { f.hidden = true; }, 200);
        if (next) self.startLevel(next, { chapterCard: true }); else self.show('end');
      };
    },

    // ---------- feedback ----------
    toast: function (text, kind) {
      var t = $('#toast');
      clearTimeout(this._toastT);
      t.classList.remove('show', 'fail', 'say');
      if (!text) return;
      t.textContent = text;
      void t.offsetWidth;
      t.classList.add('show', kind || 'say');
      this._toastT = setTimeout(function () { t.classList.remove('show'); }, 1300);
    },

    mascot: function (expr, stay) {
      var lv = this.engine.level, m = $('#mascot');
      if (lv && lv.mascot === false) return;
      m.innerHTML = R.Ruli.svg(expr);
      m.classList.add('show');
      m.classList.remove('fx-hop'); void m.offsetWidth; if (expr === 'happy') m.classList.add('fx-hop');
      clearTimeout(this._mascotT);
      var self = this;
      if (!stay) this._mascotT = setTimeout(function () { self.hideMascot(); }, 1400);
    },

    hideMascot: function () { clearTimeout(this._mascotT); $('#mascot').classList.remove('show'); },

    clearFeedback: function () {
      this.toast('');
      this.hideMascot();
      $('#celebrate').classList.remove('show');
      $('#layer').classList.remove('win-zoom');
    }
  };
})();
