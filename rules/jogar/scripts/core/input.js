// InteractionSystem: transforma toques e mouse em eventos do engine.
//   tap, hold, dragstart, dragmove, drop, swipe, rub,
//   scalestart, scale, scaleend, scaledenied, input (qualquer toque)
// Pinça: um dedo no objeto + um segundo dedo em qualquer lugar.
// No PC, a rodinha do mouse (ou a pinça do touchpad) faz o mesmo.
(function () {
  'use strict';
  var R = window.RULES, U = R.util;
  var MOVE_PX = 8, TAP_MS = 600;

  function Input(engine, root) {
    this.E = engine;
    this.root = root;
    this.ptrs = new Map();
    this.pinch = null;
    this.wheelObj = null;
    this._down = this.down.bind(this);
    this._move = this.move.bind(this);
    this._up = this.up.bind(this);
    this._wheel = this.wheel.bind(this);
  }

  Input.prototype = {
    attach: function () {
      this.root.addEventListener('pointerdown', this._down, { passive: false });
      window.addEventListener('pointermove', this._move, { passive: false });
      window.addEventListener('pointerup', this._up);
      window.addEventListener('pointercancel', this._up);
      // Se o navegador tirar o toque do jogo, trata como "soltou".
      this.root.addEventListener('lostpointercapture', this._up);
      this.root.addEventListener('wheel', this._wheel, { passive: false });
      // iOS/apps: impede que o arraste vire rolagem ou gesto do navegador.
      this.root.addEventListener('touchmove', function (e) {
        if (!e.target.closest('[data-ui]') && e.cancelable) e.preventDefault();
      }, { passive: false });
    },

    active: function () { return this.ptrs.size > 0 || !!this.wheelObj; },

    reset: function () {
      this.ptrs.forEach(function (p) {
        clearTimeout(p.holdTimer);
        if (p.mode === 'drag' && p.obj) p.obj.el.classList.remove('dragging');
      });
      this.ptrs.clear();
      this.pinch = null;
      clearTimeout(this._wheelT);
      this.wheelObj = null;
    },

    objAt: function (target) {
      var el = target && target.closest && target.closest('[data-obj]');
      var o = el ? this.E.get(el.getAttribute('data-obj')) : null;
      return o && !o.def.passive && !o.hidden ? o : null;
    },

    down: function (e) {
      if (e.target.closest('[data-ui]') && !e.target.closest('[data-obj]')) return;
      var E = this.E;
      if (!E.level) return;
      e.preventDefault();
      R.Audio.unlock();
      if (E.locked || E.paused) return;
      if (e.button != null && e.button > 0 && e.pointerType === 'mouse') return;
      E.onInput();

      // Um novo primeiro dedo significa que qualquer toque anterior já acabou,
      // mesmo que o "soltou" dele tenha se perdido.
      if (e.isPrimary && this.ptrs.size) this.flush();

      var p = {
        id: e.pointerId, cx: e.clientX, cy: e.clientY, sx: e.clientX, sy: e.clientY,
        t0: U.now(), obj: this.objAt(e.target), mode: 'pending', lastDir: 0, revs: 0
      };
      // No celular o toque fica preso ao elemento tocado; se esse elemento for
      // redesenhado (a porta abrindo, o Ruli mudando de cara), o resto do gesto
      // se perderia. Capturando na tela do jogo, os eventos sempre chegam.
      try { this.root.setPointerCapture(e.pointerId); } catch (err) { /* sem captura */ }

      if (this.ptrs.size === 1 && !this.pinch) {
        var first = this.ptrs.values().next().value;
        // dois dedos em objetos diferentes: cada um faz o seu (toque simultâneo, arrastar dois)
        var indep = first.obj && p.obj && first.obj !== p.obj && !first.obj.has('scalable') && !p.obj.has('scalable');
        if (first.mode !== 'none' && !indep) {
          this.ptrs.set(p.id, p);
          this.startPinch(first, p);
          return;
        }
      }
      if (this.ptrs.size >= 2 || this.pinch) { p.mode = 'none'; this.ptrs.set(p.id, p); return; }

      this.ptrs.set(p.id, p);
      if (p.obj && p.obj.has('holdable')) {
        p.holdTimer = setTimeout(function () {
          if (p.mode !== 'pending') return;
          p.mode = 'held';
          E.emit('hold', { obj: p.obj });
        }, p.obj.behaviors.holdable.ms || 700);
      }
    },

    move: function (e) {
      var p = this.ptrs.get(e.pointerId);
      if (!p) return;
      if (e.cancelable) e.preventDefault();
      var dx = e.clientX - p.cx;
      p.cx = e.clientX; p.cy = e.clientY;

      if (this.pinch && (p === this.pinch.a || p === this.pinch.b)) {
        if (!this.pinch.denied) this.updatePinch();
        return;
      }
      if (p.mode === 'pending' && Math.hypot(p.cx - p.sx, p.cy - p.sy) > MOVE_PX) {
        clearTimeout(p.holdTimer);
        var o = p.obj;
        if (o && o.has('rotatable') && !this.E.locked) this.startRotate(p);
        else if (o && o.has('draggable') && !o._falling && !this.E.locked) {
          if (this.canDrag(o)) this.startDrag(p);
          else { p.mode = 'swipe'; o.fx('shake'); this.E.emit('locked', { obj: o }); }
        }
        else if (!o && this.E.level.draw) this.startDraw(p);
        else p.mode = 'swipe';
      }
      if (p.mode === 'drag') this.updateDrag(p);
      else if (p.mode === 'rotate') this.updateRotate(p);
      else if (p.mode === 'draw') this.updateDraw(p);
      else if (p.mode === 'swipe') {
        var dy = e.clientY - (p.py != null ? p.py : p.sy);
        this.rub(p, dx, 'lastDir');
        this.rub(p, dy, 'lastDirY');
      }
      p.py = e.clientY;
    },

    up: function (e) {
      var p = this.ptrs.get(e.pointerId);
      if (!p) return;
      this.ptrs.delete(p.id);
      clearTimeout(p.holdTimer);
      var E = this.E;

      if (this.pinch && (p === this.pinch.a || p === this.pinch.b)) {
        var other = p === this.pinch.a ? this.pinch.b : this.pinch.a;
        other.mode = 'none';
        if (!this.pinch.denied) E.emit('scaleend', { obj: this.pinch.obj });
        this.pinch = null;
      } else if (p.mode === 'pending') {
        if (U.now() - p.t0 < TAP_MS) E.tap(p.obj, p.cx, p.cy);
      } else if (p.mode === 'drag') {
        this.endDrag(p, true);
      } else if (p.mode === 'rotate') {
        this.endRotate(p);
      } else if (p.mode === 'draw') {
        this.endDraw(p);
      } else if (p.mode === 'swipe') {
        var dx = p.cx - p.sx, dy = p.cy - p.sy;
        if (Math.hypot(dx, dy) > 40 && U.now() - p.t0 < 600) {
          E.emit('swipe', { obj: p.obj, dir: Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up') });
        }
      }
      if (this.ptrs.size === 0) E.check();
    },

    // Esfregar: cada vez que o dedo inverte a direção em cima de um objeto.
    rub: function (p, d, key) {
      if (Math.abs(d) < 2) return;
      var dir = d > 0 ? 1 : -1;
      if (p[key] && dir !== p[key]) {
        p.revs++;
        var o = this.objAt(document.elementFromPoint(p.cx, p.cy)) || p.obj;
        if (o) this.E.emit('rub', { obj: o, count: p.revs });
      }
      p[key] = dir;
    },

    // draggable { requires: { estado: valor } } → só arrasta depois de destravado
    canDrag: function (o) {
      var req = o.behaviors.draggable.requires;
      return !req || Object.keys(req).every(function (k) { return o.state[k] === req[k]; });
    },

    // ---- girar (rotatable { snap }) ----
    angleTo: function (o, p) {
      var b = R.Stage.fromClient(p.cx, p.cy), c = o.center();
      return Math.atan2(b[1] - c[1], b[0] - c[0]) * 180 / Math.PI;
    },
    startRotate: function (p) {
      var o = p.obj;
      p.mode = 'rotate';
      p.lastA = this.angleTo(o, p);
      o.el.classList.add('dragging');
      o.el.style.transition = '';
      R.Audio.play('drag');
      this.E.emit('rotatestart', { obj: o });
    },
    updateRotate: function (p) {
      var o = p.obj, a = this.angleTo(o, p), d = a - p.lastA;
      if (d > 180) d -= 360;
      if (d < -180) d += 360;
      p.lastA = a;
      o.rot += d;
      o.state.turns = (o.state.turns || 0) + Math.abs(d) / 360;
      o.layout();
      this.E.emit('rotate', { obj: o, delta: d });
    },
    endRotate: function (p) {
      var o = p.obj, cfg = o.behaviors.rotatable;
      o.el.classList.remove('dragging');
      if (cfg.snap) o.rot = Math.round(o.rot / cfg.snap) * cfg.snap;
      var ang = Math.round(((o.rot % 360) + 360) % 360);
      if (ang === 360) ang = 0;
      o.animate(function () { o.layout(); }, 120);
      o.setState('angle', ang);
      R.Audio.play('click');
      this.E.emit('rotated', { obj: o, angle: ang });
    },

    // ---- desenhar com o dedo (fase com draw: true) ----
    startDraw: function (p) {
      var E = this.E;
      p.mode = 'draw';
      p.pts = [R.Stage.fromClient(p.sx, p.sy)];
      if (!E.drawEl) {
        E.drawEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        E.drawEl.setAttribute('class', 'draw-layer');
        E.layer.appendChild(E.drawEl);
      }
      p.line = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
      p.line.setAttribute('class', 'draw-line');
      E.drawEl.appendChild(p.line);
      this.updateDraw(p);
    },
    updateDraw: function (p) {
      var b = R.Stage.fromClient(p.cx, p.cy), l = R.Stage.layerRect;
      p.pts.push(b);
      p.line.setAttribute('points', p.pts.map(function (q) {
        var px = R.Stage.toPx(q[0], q[1]);
        return px[0].toFixed(1) + ',' + px[1].toFixed(1);
      }).join(' '));
      p.line.style.strokeWidth = Math.max(4, R.Stage.s * 2.2) + 'px';
    },
    endDraw: function (p) {
      var line = p.line, ev = { points: p.pts, handled: false };
      this.E.emit('drawn', ev);
      line.classList.add(ev.handled ? 'ok' : 'fade');
      setTimeout(function () { line.remove(); }, ev.handled ? 900 : 500);
    },

    startDrag: function (p) {
      var o = p.obj, E = this.E;
      if (o.inText) E.detachWord(o);
      var b = R.Stage.fromClient(p.sx, p.sy);
      p.mode = 'drag';
      p.offX = o.x - b[0];
      p.offY = o.y - b[1];
      p.fromX = o.x; p.fromY = o.y;
      o.z = 500;
      o.el.classList.add('dragging');
      o.el.style.transition = '';
      R.Audio.play('drag');
      E.emit('dragstart', { obj: o });
      this.updateDrag(p);
    },

    updateDrag: function (p) {
      var o = p.obj, cfg = o.behaviors.draggable;
      var b = R.Stage.fromClient(p.cx, p.cy), sb = R.Stage.screenBounds();
      var x = b[0] + p.offX, y = b[1] + p.offY;
      if (cfg.axis === 'x') y = p.fromY;
      if (cfg.axis === 'y') x = p.fromX;
      o.x = U.clamp(x, cfg.minX != null ? cfg.minX : sb.x1 + 2, cfg.maxX != null ? cfg.maxX : sb.x2 - 2);
      o.y = U.clamp(y, cfg.minY != null ? cfg.minY : sb.y1 + 2, cfg.maxY != null ? cfg.maxY : sb.y2 - 2);
      o.layout();
      this.E.emit('dragmove', { obj: o });
    },

    endDrag: function (p, drop) {
      var o = p.obj, E = this.E;
      o.el.classList.remove('dragging');
      o.z = ++E.zTop;
      o.layout();
      if (!drop) return;
      var ev = { obj: o, fromX: p.fromX, fromY: p.fromY, handled: false };
      R.Audio.play('drop');
      E.emit('drop', ev);
      if (o.behaviors.draggable.returnOnDrop && !ev.handled) o.moveTo(p.fromX, p.fromY, 260);
    },

    // Encerra toques pendurados (soltando o que estava sendo arrastado).
    flush: function () {
      var self = this;
      this.ptrs.forEach(function (p) {
        clearTimeout(p.holdTimer);
        if (p.mode === 'drag') self.endDrag(p, true);
      });
      if (this.pinch && !this.pinch.denied) this.E.emit('scaleend', { obj: this.pinch.obj });
      this.ptrs.clear();
      this.pinch = null;
    },

    // Interrompe o arraste de um objeto (por exemplo, quando ele cai num buraco).
    cancel: function (o) {
      var self = this;
      this.ptrs.forEach(function (p) {
        if (p.obj === o && p.mode === 'drag') { self.endDrag(p, false); p.mode = 'none'; }
      });
    },

    startPinch: function (a, b) {
      var E = this.E;
      clearTimeout(a.holdTimer);
      if (a.mode === 'drag') this.endDrag(a, false);
      a.mode = b.mode = 'pinch';
      var target = a.obj || b.obj;
      if (!target) {
        // sem dedo em cima de nada: escolhe o objeto redimensionável mais perto
        var m = R.Stage.fromClient((a.cx + b.cx) / 2, (a.cy + b.cy) / 2), best = 36;
        E.objects.forEach(function (o) {
          if (!o.has('scalable') || o.hidden) return;
          var d = U.dist(m[0], m[1], o.x, o.y);
          if (d < best) { best = d; target = o; }
        });
      }
      if (!target || !target.has('scalable')) {
        if (target) E.emit('scaledenied', { obj: target });
        this.pinch = { denied: true, a: a, b: b };
        return;
      }
      if (target.inText) E.detachWord(target);
      this.pinch = { obj: target, a: a, b: b, d0: Math.max(20, Math.hypot(a.cx - b.cx, a.cy - b.cy)), s0: E.getScale(target), snd: 0 };
      E.emit('scalestart', { obj: target });
    },

    updatePinch: function () {
      var P = this.pinch, o = P.obj, cfg = o.behaviors.scalable;
      var d = Math.hypot(P.a.cx - P.b.cx, P.a.cy - P.b.cy);
      var s = U.clamp(P.s0 * d / P.d0, cfg.min || 0.3, cfg.max || 3);
      this.E.setScale(o, s);
      if (U.now() - P.snd > 70) {
        P.snd = U.now();
        R.Audio.play('scale', (s - (cfg.min || 0.3)) / ((cfg.max || 3) - (cfg.min || 0.3)));
      }
    },

    wheel: function (e) {
      var E = this.E;
      if (!E.level || E.locked || E.paused || e.target.closest('[data-ui]')) return;
      var o = this.objAt(document.elementFromPoint(e.clientX, e.clientY));
      if (!o) return;
      e.preventDefault();
      E.onInput();
      if (!o.has('scalable')) {
        if (!this._deniedT || U.now() - this._deniedT > 900) { this._deniedT = U.now(); E.emit('scaledenied', { obj: o }); }
        return;
      }
      if (o.inText) E.detachWord(o);
      var cfg = o.behaviors.scalable;
      var k = Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0015));
      if (!this.wheelObj) E.emit('scalestart', { obj: o });
      this.wheelObj = o;
      E.setScale(o, U.clamp(E.getScale(o) * k, cfg.min || 0.3, cfg.max || 3));
      R.Audio.play('scale', 0.5);
      var self = this;
      clearTimeout(this._wheelT);
      this._wheelT = setTimeout(function () {
        self.wheelObj = null;
        E.emit('scaleend', { obj: o });
        E.check();
      }, 260);
    }
  };

  R.Input = Input;
})();
