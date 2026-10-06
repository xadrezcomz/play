// UIManager — telas e HUD. Só mexe no DOM; quem decide é o GameManager.
// Todo texto vem do LocalizationManager (EP.i18n).
(function (EP) {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var t = function (k, p) { return EP.i18n.t(k, p); };
  var L = EP.i18n;

  var UI = EP.UI = {
    init: function (game) {
      this.game = game;
      this.cache = {};
      this.toasts = [];
      this.toastTimer = 0;
      L.apply();
      var self = this;
      document.querySelectorAll('.tela .fechar').forEach(function (b) {
        b.addEventListener('click', function () { EP.AudioManager.ui(); self.hide(b.closest('.tela').id); game.onModalClosed(); });
      });
    },

    show: function (id) { $(id).hidden = false; },
    hide: function (id) { $(id).hidden = true; },
    isOpen: function (id) { return !$(id).hidden; },
    hud: function (on) { $('hud').hidden = !on; if (!on) $('flow-fx').style.opacity = 0; },

    // escreve só quando muda (o DOM é caro no celular)
    _set: function (id, text) {
      if (this.cache[id] === text) return;
      this.cache[id] = text;
      $(id).textContent = text;
    },
    _style: function (id, prop, value) {
      var k = id + '.' + prop;
      if (this.cache[k] === value) return;
      this.cache[k] = value;
      $(id).style[prop] = value;
    },
    resetCache: function () { this.cache = {}; },

    updateHud: function (s) {
      this._set('h-dist', L.dist(s.distance));
      this._set('h-vel', L.num(s.speed, 1));
      this._set('h-ultra', String(s.overtakes));
      this._set('h-zona', t('zone.' + s.zone));
      this._style('h-energia', 'transform', 'scaleX(' + Math.max(0.001, s.energy).toFixed(3) + ')');
      this._set('h-energia-pct', Math.round(s.energy * 100) + '%');
      var low = s.energy < 0.22 || s.exhausted;
      if (this.cache.low !== low) { this.cache.low = low; $('h-energia').classList.toggle('baixa', low); }
      var b = $('h-batida');
      if (s.beat >= 0 && s.beat < 1.6) {
        if (!this.cache.beatOn) { this.cache.beatOn = true; b.classList.add('ativa'); }
        var ring = 1 + Math.max(0, 1 - s.beat) * 0.9;
        b.firstElementChild.style.transform = 'scale(' + ring.toFixed(3) + ')';
        b.firstElementChild.style.opacity = s.beat > 1.15 ? '0.3' : '1';
      } else if (this.cache.beatOn) { this.cache.beatOn = false; b.classList.remove('ativa'); }
      if (this.cache.beatFlow !== (s.flow > 0)) { this.cache.beatFlow = s.flow > 0; b.classList.toggle('fluindo', s.flow > 0); }
      this._style('h-flow-bar', 'width', s.flow > 0 && s.flow < 5 ? Math.round(s.flowProgress * 100) + '%' : '0%');
      if (this.toastTimer > 0) {
        this.toastTimer -= s.dt;
        if (this.toastTimer <= 0) { $('h-aviso').classList.remove('mostra'); this._nextToast(); }
      }
    },

    coins: function (n) { this._set('h-moedas-b', String(n)); },

    rating: function (r) {
      var el = $('h-aval');
      el.className = 'aval';
      if (!r) { el.textContent = ''; return; }
      void el.offsetWidth;   // reinicia a animação
      el.textContent = t('rating.' + r);
      el.className = 'aval mostra ' + r;
    },

    // FLOW no painel de cima: cinco segmentos (×5 ou mais = máximo, dourado)
    flow: function (level, up) {
      var el = $('h-flow'), segs = el.querySelectorAll('.segs i');
      for (var i = 0; i < segs.length; i++) segs[i].classList.toggle('on', i < level);
      $('h-flow-n').textContent = level > 0 ? '×' + level : '';
      el.classList.toggle('zero', level <= 0);
      el.classList.toggle('max', level >= 5);
      if (up) { el.classList.remove('sobe'); void el.offsetWidth; el.classList.add('sobe'); }
      $('flow-fx').style.opacity = level <= 0 ? 0 : Math.min(1, 0.15 + level * 0.12);
    },

    combo: function (n) {
      var el = $('h-combo');
      el.hidden = n < 2;
      if (n >= 2) {
        el.textContent = t('hud.combo', { n: n });
        el.classList.remove('sobe'); void el.offsetWidth; el.classList.add('sobe');
      }
    },

    toast: function (text, ms) {
      // sem repetir o que já está na tela ou na fila, e sem acumular avisos velhos
      if ((this.toastTimer > 0 && this.toastText === text) || this.toasts.some(function (q) { return q.text === text; })) return;
      if (this.toasts.length >= 2) this.toasts.shift();
      this.toasts.push({ text: text, ms: ms || 2200 });
      if (this.toastTimer <= 0) this._nextToast();
    },
    _nextToast: function () {
      var n = this.toasts.shift();
      if (!n) return;
      var el = $('h-aviso');
      el.textContent = n.text;
      this.toastText = n.text;
      el.classList.add('mostra');
      this.toastTimer = n.ms / 1000;
    },
    clearToasts: function () { this.toasts = []; this.toastTimer = 0; $('h-aviso').classList.remove('mostra'); },

    hint: function (title, sub) {
      var el = $('h-dica');
      if (!title) { el.hidden = true; return; }
      $('h-dica-t').textContent = title;
      $('h-dica-s').textContent = sub || '';
      el.hidden = false;
    },

    route: function (routeId) {
      var el = $('h-rota'), r = EP.data.routes[routeId];
      if (!r || routeId === 'bairro') { el.hidden = true; return; }
      el.textContent = r.icon + ' ' + t(r.text) + (r.perks ? ' · ' + r.perks.map(function (p) { return t(p); }).join(' · ') : '');
      el.hidden = false;
    },

    fork: function (fork) {
      var el = $('h-bif');
      if (!fork) { el.hidden = true; return; }
      [['h-bif-e', fork.left, '←'], ['h-bif-d', fork.right, '→']].forEach(function (c) {
        var r = EP.data.routes[c[1]], card = $(c[0]);
        card.className = 'cartao ' + c[1];
        card.innerHTML = '';
        var arrow = document.createElement('span'); arrow.className = 'c-seta'; arrow.textContent = c[2];
        var name = document.createElement('span'); name.className = 'c-nome'; name.textContent = r.icon + ' ' + t(r.text);
        card.appendChild(arrow); card.appendChild(name);
        (r.perks || []).forEach(function (p) {
          var s = document.createElement('span'); s.className = 'c-perk'; s.textContent = t(p); card.appendChild(s);
        });
      });
      el.hidden = false;
    },
    forkChosen: function (side) {
      $('h-bif-e').classList.add(side < 0 ? 'escolhido' : 'outro');
      $('h-bif-d').classList.add(side > 0 ? 'escolhido' : 'outro');
    },

    challenge: function (state) {
      var el = $('h-desafio');
      if (!state) { el.hidden = true; el.classList.remove('ok'); return; }
      var def = state.def;
      $('h-d-tit').textContent = t(def.text + '.title');
      $('h-d-desc').textContent = t(def.text + '.desc', { n: state.target, v: state.target2 });
      el.hidden = false;
      this.challengeTick(state);
    },
    challengeTick: function (state) {
      var hint = state.hint > 0 ? ' · ' + t('ch.hint.faster') : state.hint < 0 ? ' · ' + t('ch.hint.slower') : '';
      var prog = state.def.type === 'sprint' ? t('ch.sprintTime', { t: L.num(state.time, 1) }) + ' · ' + state.progress + '/' + state.target + ' m'
        : state.progress + '/' + state.target + (state.unit === 's' ? ' s' : state.unit === 'm' ? ' m' : '');
      this._set('h-d-prog', prog + hint);
      this._style('h-d-tempo', 'transform', 'scaleX(' + Math.max(0, state.timeLeft / state.def.timeLimit).toFixed(3) + ')');
    },
    challengeDone: function (ok, target) {
      var el = $('h-desafio');
      if (ok) { el.classList.add('ok'); this._set('h-d-prog', target + '/' + target); }
      setTimeout(function () { el.hidden = true; el.classList.remove('ok'); }, ok ? 900 : 300);
    },

    home: function (save) {
      $('i-nome').textContent = save.profile.name;
      $('i-total').textContent = L.dist(save.stats.totalDistance, true);
      $('i-moedas').textContent = L.num(save.coins);
      $('i-melhor').textContent = save.records.longestRun > 0 ? t('home.best', { d: L.dist(save.records.longestRun) }) : t('home.firstRun');
    },

    summary: function (sum, save) {
      var r = sum.run, list = $('r-lista'), news = sum.newRecords;
      $('r-tit').textContent = t(sum.firstRun ? 'sum.first' : 'sum.title');
      $('r-dist').textContent = L.dist(r.distance);
      $('r-tempo').textContent = L.duration(r.time, true);
      var pace = r.distance > 50 ? r.time / (r.distance / 1000) : 0;
      var rows = [
        ['sum.pace', pace ? L.duration(pace, true) + ' ' + t('sum.paceUnit') : '—'],
        ['sum.avg', L.num(r.time > 0 ? r.distance / r.time * 3.6 : 0, 1) + ' km/h'],
        ['sum.top', L.num(r.maxSpeed, 1) + ' km/h', 'topSpeed'],
        ['sum.overtakes', String(r.overtakes), 'mostOvertakes'],
        ['sum.flow', r.maxFlow ? '×' + r.maxFlow : '—', 'maxFlow'],
        ['sum.combo', r.maxCombo ? '×' + r.maxCombo : '—', 'maxCombo'],
        ['sum.perfects', String(r.perfects)],
        ['sum.challenges', String(r.challenges)]
      ];
      if (news.indexOf('longestRun') >= 0) rows.unshift(['sum.distance', L.dist(r.distance), 'longestRun']);
      list.innerHTML = '';
      rows.forEach(function (row) {
        var dt = document.createElement('dt'), dd = document.createElement('dd');
        dt.textContent = t(row[0]);
        dd.textContent = row[1];
        if (row[2] && news.indexOf(row[2]) >= 0) {
          var b = document.createElement('span'); b.className = 'rec'; b.textContent = t('sum.record'); dd.appendChild(b);
        }
        list.appendChild(dt); list.appendChild(dd);
      });
      $('r-moedas').textContent = '+' + L.num(r.coins);
      $('r-total').textContent = t('sum.total', { d: L.dist(save.stats.totalDistance, true) });
    },

    records: function (save) {
      var s = save.stats, r = save.records;
      $('rec-nome').textContent = save.profile.name;
      var fill = function (id, rows) {
        var list = $(id);
        list.innerHTML = '';
        rows.forEach(function (row) {
          var dt = document.createElement('dt'), dd = document.createElement('dd');
          dt.textContent = t(row[0]); dd.textContent = row[1];
          list.appendChild(dt); list.appendChild(dd);
        });
      };
      fill('rec-perfil', [
        ['rec.totalDistance', L.dist(s.totalDistance, true)],
        ['rec.totalTime', L.duration(s.totalTime)],
        ['rec.runs', String(s.runs)],
        ['rec.overtakes', L.num(s.overtakes)],
        ['rec.perfects', L.num(s.perfects)],
        ['rec.challenges', String(s.challengesCompleted)],
        ['rec.regions', save.unlockedBiomes.length + '/' + EP.data.biomes.length]
      ]);
      fill('rec-melhores', [
        ['rec.longestRun', r.longestRun ? L.dist(r.longestRun) : '—'],
        ['rec.topSpeed', r.topSpeed ? L.num(r.topSpeed, 1) + ' km/h' : '—'],
        ['rec.maxFlow', r.maxFlow ? '×' + r.maxFlow : '—'],
        ['rec.maxCombo', r.maxCombo ? '×' + r.maxCombo : '—'],
        ['rec.mostOvertakes', String(r.mostOvertakes)]
      ]);
    },

    // opções: handlers.change(key, value), handlers.reset()
    options: function (save, handlers) {
      var st = save.settings;
      var langs = $('o-idioma');
      langs.innerHTML = '';
      L.available().forEach(function (l) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'chip' + (L.lang === l ? ' sel' : '');
        b.textContent = EP.texts[l]['lang.name'];
        b.addEventListener('click', function () { handlers.change('lang', l); });
        langs.appendChild(b);
      });
      var q = $('o-qualidade');
      q.innerHTML = '';
      [['auto', 'q.auto'], ['high', 'q.high'], ['low', 'q.low']].forEach(function (o) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'chip' + (st.quality === o[0] ? ' sel' : '');
        b.textContent = t(o[1]);
        b.addEventListener('click', function () { handlers.change('quality', o[0]); });
        q.appendChild(b);
      });
      [['o-musica', 'music'], ['o-efeitos', 'sfx'], ['o-vibracao', 'vibration'], ['o-movimento', 'reduceMotion'], ['o-grande', 'bigUi']].forEach(function (p) {
        var el = $(p[0]);
        el.checked = !!st[p[1]];
        el.onchange = function () { handlers.change(p[1], el.checked); };
      });
      $('o-apagar').onclick = function () { UI.confirm(t('opt.resetConfirm'), handlers.reset); };
      $('o-versao').textContent = t('opt.version', { v: EP.VERSION });
    },

    confirm: function (text, onYes) {
      $('cf-texto').textContent = text;
      UI.show('tela-confirmar');
      $('cf-nao').onclick = function () { UI.hide('tela-confirmar'); };
      $('cf-sim').onclick = function () { UI.hide('tela-confirmar'); onYes(); };
    },

    error: function (text) {
      var e = $('erro');
      e.textContent = text;
      e.hidden = false;
      document.querySelector('.carregando').hidden = true;
    }
  };
})(window.EP);
