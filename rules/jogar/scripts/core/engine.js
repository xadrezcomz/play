// PuzzleEngine: carrega a definição de uma fase (só dados) e faz tudo
// funcionar: cria objetos, liga comportamentos, reações, gatilhos e verifica
// as condições de vitória. Nenhuma fase tem código próprio.
//
// Formato de uma fase (veja data/levels/):
//   { id, chapter, instruction, hints:[k1,k2,k3],
//     objects:[{ id, type, x, y, w, h, z, props, state, behaviors, hitbox, passive, inText }],
//     reactions:[{ on, target, do:[ações], cooldown }],
//     triggers:[{ when: condição, do:[ações], once }],
//     win: condição,  onWin:[ações],  mascot: false }
//
// Ações (em sequência): { wait:ms } { fx:'pop', target } { sound:'tap' }
//   { say:'CHAVE' } { fail:true|'CHAVE' } { expr:'happy', target } { mascot:'happy' }
//   { move:'id', to:[x,y] | toObj:'id', offset:[dx,dy] | by:[dx,dy], ms, await:true }
//   { reset:'id' } { hide:'id' } { show:'id' } { state:'id', key, value } { toggle:'id', key }
//   { vibrate:ms } { forget:'id' } { swap:['a','b'], ms } { cls:'id', add, remove }
// Extras de fase: label (rótulo "FASE NN" com palavras-objeto), draw:true
// (desenhar com o dedo), objetos com minAttempt (só aparecem ao tentar de
// novo) e finale:'mid'|'end' (finais especiais).
(function () {
  'use strict';
  var R = window.RULES, U = R.util;
  var FAIL_KEYS = ['FB_ALMOST', 'FB_TRY_DIFFERENT', 'FB_HMM', 'FB_NOT_THIS_TIME'];

  function Engine(opts) {
    R.Emitter.call(this);
    this.layer = opts.layer;
    this.instrEl = opts.instruction;
    this.labelEl = opts.label;
    this.hooks = opts.hooks || {};
    this.objects = new Map();
    this.level = null;
    this.locked = true;
    this.paused = false;
    this.token = 0;
    this.input = new R.Input(this, opts.inputRoot);
    this.input.attach();
  }
  Engine.prototype = Object.create(R.Emitter.prototype);

  var P = Engine.prototype;

  P.load = function (def, opts) {
    var self = this;
    opts = opts || {};
    this.unload();
    this.level = def;
    this.attempt = opts.attempt || 1;
    this.memory = { tapped: {}, hint: false };
    this.fired = {};
    this.cool = {};
    this.completed = false;
    this.locked = false;
    this.paused = false;
    this.zTop = 100;
    this.idleT0 = U.now();
    this._failT = 0;
    R.Stage.update();

    (def.objects || []).forEach(function (d) {
      if (d.inText || d.inLabel) return;
      if (d.minAttempt && self.attempt < d.minAttempt) return;
      var o = new R.GameObject(d, self);
      self.objects.set(o.id, o);
      self.layer.appendChild(o.el);
    });
    this.buildInstruction();
    if (def.label && this.labelEl) this.buildRich(this.labelEl, def.label);

    this.objects.forEach(function (o) {
      Object.keys(o.behaviors).forEach(function (k) {
        if (o.behaviors[k] === true) o.behaviors[k] = {};
        var b = R.Behaviors[k.split('#')[0]];   // 'receives#2' = segundo do mesmo tipo
        if (b && b.init) b.init(o, o.behaviors[k], self);
      });
    });
    (def.reactions || []).forEach(function (r, i) {
      self.on(r.on, function (e) { self.react(r, i, e || {}); });
    });
    this.layout();
    this.measureWords();
    this._tick = setInterval(function () { self.check(); }, 100);
  };

  // Palavras soltas no cenário (textKey): mede o tamanho real do texto.
  P.measureWords = function () {
    var s = R.Stage.s;
    this.objects.forEach(function (o) {
      if (o.type !== 'word' || o.inText || o.def.w) return;
      o.el.style.width = 'auto'; o.el.style.height = 'auto';
      o.el.style.fontSize = o.fontU * s + 'px';
      var r = o.inner.getBoundingClientRect();
      o.w = r.width / s + (o.def.padU || 2);
      o.h = r.height / s + (o.def.padU || 1);
      o.layout();
    });
  };

  P.unload = function () {
    this.token++;
    clearInterval(this._tick);
    this.input.reset();
    this.objects.forEach(function (o) { o.destroy(); });
    this.objects.clear();
    this.clearListeners();
    if (this.instrEl) this.instrEl.innerHTML = '';
    if (this.drawEl) { this.drawEl.remove(); this.drawEl = null; }
    this.level = null;
    this.locked = true;
  };

  // Instrução: texto + palavras que são objetos ([[id|TEXTO]]).
  P.buildInstruction = function () { this.buildRich(this.instrEl, this.level.instruction); };

  P.buildRich = function (el, key) {
    var self = this, def = this.level;
    el.innerHTML = '';
    // Cada palavra fica num bloco que não quebra, mesmo quando só uma letra
    // dela é um objeto (CÍRCUL + [[O]]).
    var word = null;
    function wordEl() { return word || (word = U.el('span', 'instr-word', el)); }
    R.i18n.parseRich(R.i18n.t(key)).forEach(function (part) {
      if (!part.id) {
        part.text.split(/(\s+)/).forEach(function (piece) {
          if (!piece) return;
          if (/^\s+$/.test(piece)) { word = null; el.appendChild(document.createTextNode(piece)); }
          else wordEl().appendChild(document.createTextNode(piece));
        });
        return;
      }
      var base = (def.objects || []).filter(function (o) { return o.id === part.id; })[0] || { id: part.id };
      var d = Object.assign({}, base, { type: 'word', inText: true, text: part.text });
      var o = new R.GameObject(d, self);
      o.el.classList.add('in-text');
      self.objects.set(o.id, o);
      // uma frase inteira como peça pode quebrar linha normalmente
      if (/\s/.test(part.text)) { o.el.classList.add('phrase'); word = null; el.appendChild(o.el); }
      else wordEl().appendChild(o.el);
    });
  };

  // A palavra sai da instrução e vira um objeto solto na tela.
  P.detachWord = function (o) {
    if (!o.inText) return;
    R.Stage.update();
    var r = o.el.getBoundingClientRect(), s = R.Stage.s;
    var c = R.Stage.fromClient(r.left + r.width / 2, r.top + r.height / 2);
    o.fontU = parseFloat(getComputedStyle(o.el).fontSize) / s;
    o.w = r.width / s / o.scale;
    o.h = r.height / s / o.scale;
    o.x = o.x0 = c[0];
    o.y = o.y0 = c[1];
    var ghost = U.el('span', 'word-ghost');
    ghost.textContent = o.text;
    o.el.parentNode.replaceChild(ghost, o.el);
    o.inText = false;
    o.el.classList.remove('in-text');
    o.el.classList.add('detached');
    o.z = ++this.zTop;
    this.layer.appendChild(o.el);
    o.layout();
    this.emit('detached', { obj: o });
  };

  P.get = function (id) { return this.objects.get(id); };

  // Diminui a fonte da instrução até caber na área reservada (telas pequenas,
  // idiomas com frases longas). Palavras já soltas guardam o próprio tamanho.
  P.fitInstruction = function () {
    var el = this.instrEl, box = el && el.parentNode;
    if (!box) return;
    el.style.fontSize = '';
    var size = parseFloat(getComputedStyle(el).fontSize), min = size * 0.6;
    while (el.scrollHeight > box.clientHeight && size > min) {
      size *= 0.93;
      el.style.fontSize = size + 'px';
    }
  };

  P.layout = function () {
    this.fitInstruction();
    R.Stage.update();
    this.objects.forEach(function (o) { o.layout(); });
  };

  P.onInput = function () {
    this.idleT0 = U.now();
    this.emit('input', {});
  };
  P.idleMs = function () { return this.paused ? 0 : U.now() - this.idleT0; };

  P.tap = function (obj, cx, cy) {
    if (obj) this.memory.tapped[obj.id] = true;
    if (this.hooks.ripple) this.hooks.ripple(cx, cy, !!obj);
    this.emit('tap', { obj: obj });
  };

  // Retângulo (em unidades) da instrução: usado por "cubra o texto" etc.
  P.textRect = function () {
    var t = this.instrEl.getBoundingClientRect();
    return R.Stage.rectFromClient(t);
  };

  P.hintOpened = function () { this.memory.hint = true; this.emit('hint', {}); };

  P.pause = function () { this.paused = true; this.input.reset(); };
  P.resume = function () { this.paused = false; this.idleT0 = U.now(); };

  P.check = function () {
    var self = this, lv = this.level;
    if (!lv || this.completed || this.locked || this.paused || this.input.active()) return;
    if (R.Conditions.test(lv.win, this)) { this.win(); return; }
    (lv.triggers || []).forEach(function (t, i) {
      var ok = R.Conditions.test(t.when, self);
      if (ok && !self.fired[i]) { self.fired[i] = true; self.run(t.do); }
      else if (!ok && t.once === false) self.fired[i] = false;
    });
  };

  P.win = function () {
    this.completed = true;
    this.locked = true;
    this.input.reset();
    var done = this.run(this.level.onWin || []);
    if (this.hooks.onWin) this.hooks.onWin(this.level, done);
  };

  P.react = function (r, i, e) {
    if (this.completed) return;
    if ('target' in r) {
      if (r.target === null) { if (e.obj) return; }
      else if (r.target === '+') { if (!e.obj) return; }          // qualquer objeto
      else if (r.target !== '*' && !(e.obj && e.obj.id === r.target)) return;
    }
    if (r.unhandled && e.handled) return;
    if (r.when && !R.Conditions.test(r.when, this)) return;
    if (r.unless && R.Conditions.test(r.unless, this)) return;
    var now = U.now();
    if (r.cooldown && this.cool[i] && now - this.cool[i] < r.cooldown) return;
    this.cool[i] = now;
    this.run(r.do, e);
  };

  // Executa uma lista de ações em sequência. Para se a fase mudar no meio.
  P.run = function (actions, e) {
    var self = this, token = this.token;
    e = e || {};
    return (actions || []).reduce(function (prev, a) {
      return prev.then(function () {
        if (token !== self.token) return;
        if (a.wait) return U.wait(R.reduceMotion ? Math.min(a.wait, 150) : a.wait);
        var name = Object.keys(a).filter(function (k) { return R.Actions[k]; })[0];
        if (!name) return;
        var res = R.Actions[name](a, e, self);
        return a.await ? res : undefined;
      });
    }, Promise.resolve());
  };

  P.target = function (a, e, key) {
    var id = a[key || 'target'];
    return id ? this.get(id) : e && e.obj;
  };

  P.say = function (key) { if (this.hooks.toast) this.hooks.toast(R.i18n.t(key), 'say'); };

  P.fail = function (key) {
    var now = U.now();
    if (now - this._failT < 650) return;
    this._failT = now;
    if (this.hooks.toast) this.hooks.toast(R.i18n.t(key || U.pick(FAIL_KEYS)), 'fail');
    if (this.hooks.mascot) this.hooks.mascot('confused');
    if (this.hooks.onFail) this.hooks.onFail(this.level);
    R.Audio.play('fail');
    R.Audio.vibrate(15);
  };

  // ---- geometria compartilhada pelos comportamentos ----

  P.fits = function (o, box) {
    var cfg = box.behaviors.container || {};
    return o.sw <= box.sw * (cfg.fitRatio || 1);
  };

  P.isInside = function (o, box) {
    var c = o.center();
    if (!U.pointIn(c[0], c[1], box.rect())) return false;
    var cfg = box.behaviors.container || {};
    return !cfg.fit || this.fits(o, box);
  };

  P.freeSlot = function (box, o) {
    var cfg = box.behaviors.container || {}, self = this;
    if (!cfg.slots) return [box.x, box.y + (cfg.offsetY || 0) * box.sh];
    // um slot pode ser reservado para um objeto: [fx, fy, 'id']
    var own = cfg.slots.filter(function (s) { return s[2] === o.id; });
    var usable = own.length ? own : cfg.slots.filter(function (s) { return !s[2]; });
    var slots = usable.map(function (s) { return [box.x + s[0] * box.sw, box.y + s[1] * box.sh]; });
    var free = slots.filter(function (p) {
      var taken = false;
      self.objects.forEach(function (x) {
        if (x !== o && !x.inText && U.dist(x.x, x.y, p[0], p[1]) < 2) taken = true;
      });
      return !taken;
    });
    var list = free.length ? free : slots;
    list.sort(function (a, b) { return U.dist(a[0], a[1], o.x, o.y) - U.dist(b[0], b[1], o.x, o.y); });
    return list[0];
  };

  P.boardBounds = function (o, margin) {
    var m = margin || 0;
    return { x1: o.sw / 2 + m, y1: o.sh / 2 + m, x2: R.Stage.W - o.sw / 2 - m, y2: R.Stage.H - o.sh / 2 - m };
  };

  P.getScale = function (o) {
    var cfg = o.behaviors.scalable || {};
    return cfg.axis === 'x' ? (o.stretch || 1) : o.scale;
  };

  P.setScale = function (o, s) {
    var cfg = o.behaviors.scalable || {}, bottom = o.y + o.sh / 2, left = o.x - o.sw / 2;
    if (cfg.axis === 'x') {
      o.stretch = s; o.w = (o.def.w || 20) * s;
      if (cfg.anchor === 'left') o.x = left + o.sw / 2;
    } else o.scale = s;
    if (cfg.anchor === 'bottom') o.y = bottom - o.sh / 2;
    o.layout();
    this.emit('scale', { obj: o });
  };

  P.fall = function (o) {
    var self = this;
    o._falling = true;
    R.Audio.play('whoosh');
    if (o.type === 'ruli') o.setExpr('surprised');
    return o.animate(function () {
      o.y += 45; o.layout();
      o.el.style.opacity = '0';
    }, 420, 'cubic-bezier(.5,0,.9,.5)').then(function () {
      o.x = o.x0; o.y = o.y0; o.el.style.opacity = '';
      o.layout();
      o.fx('pop');
      o._falling = false;
      if (o.type === 'ruli') o.setExpr('confused');
      self.emit('fell', { obj: o });
    });
  };

  // ---- ações disponíveis para reações, gatilhos e onWin ----
  R.Actions = {
    fx: function (a, e, E) { var o = E.target(a, e); if (o) o.fx(a.fx); },
    sound: function (a) { R.Audio.play(a.sound); },
    say: function (a, e, E) { E.say(a.say); },
    fail: function (a, e, E) { E.fail(a.fail === true ? null : a.fail); },
    expr: function (a, e, E) { var o = E.target(a, e); if (o) o.setExpr(a.expr); },
    mascot: function (a, e, E) { if (E.hooks.mascot) E.hooks.mascot(a.mascot); },
    vibrate: function (a) { R.Audio.vibrate(a.vibrate); },
    move: function (a, e, E) {
      var o = E.get(a.move);
      if (!o) return;
      if (o.inText) E.detachWord(o);
      var x = o.x, y = o.y, t;
      if (a.to) { x = a.to[0]; y = a.to[1]; }
      if (a.toObj && (t = E.get(a.toObj))) { var c = t.center(); x = c[0]; y = c[1]; }
      if (a.offset) { x += a.offset[0]; y += a.offset[1]; }
      if (a.by) { x += a.by[0]; y += a.by[1]; }
      if (a.z) { o.z = a.z; }
      if (a.rot != null) o.rot = a.rot;
      return o.moveTo(x, y, a.ms != null ? a.ms : 300, a.ease);
    },
    reset: function (a, e, E) {
      var o = E.get(a.reset);
      if (o) return o.moveTo(o.x0, o.y0, a.ms != null ? a.ms : 280);
    },
    hide: function (a, e, E) { var o = E.get(a.hide); if (o) o.setHidden(true); },
    show: function (a, e, E) { var o = E.get(a.show); if (o) { o.setHidden(false); o.fx('pop'); } },
    state: function (a, e, E) { var o = E.get(a.state); if (o) o.setState(a.key, a.value); },
    toggle: function (a, e, E) { var o = E.get(a.toggle), k = a.key || 'on'; if (o) o.setState(k, !o.state[k]); },
    forget: function (a, e, E) { delete E.memory.tapped[a.forget]; },
    // troca o texto de duas palavras; a que estava solta volta para o lugar dela
    swapText: function (a, e, E) {
      var A = E.get(a.swapText[0]), B = E.get(a.swapText[1]);
      if (!A || !B) return;
      var t = A.text; A.text = B.text; B.text = t;
      A.inner.textContent = A.text; B.inner.textContent = B.text;
      [A, B].forEach(function (o) {
        o.setHidden(false);
        if (!o.inText) { o.scale = o.scale0; o.moveTo(o.x0, o.y0, 260); }
        o.fx('pop');
      });
    },
    cls: function (a, e, E) {
      var o = E.get(a.cls);
      if (!o) return;
      if (a.add) o.el.classList.add(a.add);
      if (a.remove) o.el.classList.remove(a.remove);
    },
    // troca dois objetos de lugar (e o que cada um carrega junto)
    swap: function (a, e, E) {
      var A = E.get(a.swap[0]), B = E.get(a.swap[1]);
      if (!A || !B) return;
      var ax = A.x, ay = A.y, bx = B.x, by = B.y, ms = a.ms || 350;
      [[A, bx - ax, by - ay], [B, ax - bx, ay - by]].forEach(function (m) {
        var c = m[0].behaviors.carries;
        ((c && c.ids) || []).forEach(function (id) {
          var k = E.get(id);
          if (k) k.moveTo(k.x + m[1], k.y + m[2], ms);
        });
      });
      A.moveTo(bx, by, ms);
      return B.moveTo(ax, ay, ms);
    }
  };

  R.PuzzleEngine = Engine;
})();
