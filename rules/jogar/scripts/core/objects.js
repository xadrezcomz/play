// GameObject: um objeto da fase. Guarda posição (centro, em unidades do
// tabuleiro), tamanho, escala, estado e os comportamentos declarados nos dados.
(function () {
  'use strict';
  var R = window.RULES, U = R.util;

  function GameObject(def, engine) {
    this.def = def;
    this.engine = engine;
    this.id = def.id;
    this.type = def.type;
    this.x = this.x0 = def.x || 50;
    this.y = this.y0 = def.y || 60;
    this.w = def.w || 20;
    this.h = def.h || def.w || 20;
    this.scale = this.scale0 = def.scale || 1;
    this.rot = def.rot || 0;
    this.z = this.z0 = def.z != null ? def.z : 10;
    this.state = Object.assign({}, def.state);
    this.behaviors = def.behaviors || {};
    this.text = def.text || '';
    this.inText = !!def.inText;   // palavra ainda presa na instrução
    this.fontU = 0;               // tamanho da fonte (unidades) quando solta
    this.hidden = !!def.hidden;

    var el = this.el = U.el(this.inText ? 'span' : 'div', 'obj obj-' + this.type);
    el.setAttribute('data-obj', this.id);
    if (this.behaviors.draggable && this.type !== 'word') el.classList.add('is-draggable');
    if (this.behaviors.clickable) el.classList.add('is-clickable');
    if (def.passive) el.classList.add('is-passive');
    if (def.cls) def.cls.split(' ').forEach(function (c) { el.classList.add(c); });
    if (this.hidden) el.style.visibility = 'hidden';
    this.inner = U.el('span', 'obj-inner', el);
    R.Renderers.draw(this);
  }

  GameObject.prototype = {
    get sw() { return this.w * this.scale; },
    get sh() { return this.h * this.scale; },

    has: function (b) { return !!this.behaviors[b]; },

    rect: function () {
      if (this.inText) return R.Stage.rectFromClient(this.el.getBoundingClientRect());
      var hb = this.def.hitbox;
      if (hb) return { x1: hb.x - hb.w / 2, y1: hb.y - hb.h / 2, x2: hb.x + hb.w / 2, y2: hb.y + hb.h / 2 };
      return { x1: this.x - this.sw / 2, y1: this.y - this.sh / 2, x2: this.x + this.sw / 2, y2: this.y + this.sh / 2 };
    },

    center: function () {
      if (!this.inText) return [this.x, this.y];
      var r = this.rect();
      return [(r.x1 + r.x2) / 2, (r.y1 + r.y2) / 2];
    },

    layout: function () {
      if (this.inText) return;
      var s = R.Stage.s, p = R.Stage.toPx(this.x - this.sw / 2, this.y - this.sh / 2);
      var st = this.el.style;
      st.width = this.sw * s + 'px';
      st.height = this.sh * s + 'px';
      st.transform = 'translate3d(' + p[0].toFixed(2) + 'px,' + p[1].toFixed(2) + 'px,0)' + (this.rot ? ' rotate(' + this.rot + 'deg)' : '');
      st.zIndex = this.z;
      if (this.type === 'word') st.fontSize = this.fontU * s * this.scale + 'px';
    },

    // Move (com ou sem animação). Resolve quando termina.
    moveTo: function (x, y, ms, ease) {
      var self = this;
      this.x = x; this.y = y;
      return this.animate(function () { self.layout(); }, ms, ease);
    },

    animate: function (apply, ms, ease) {
      var self = this, st = this.el.style;
      if (!ms || R.reduceMotion) { st.transition = ''; apply(); return Promise.resolve(); }
      st.transition = ['transform', 'width', 'height', 'font-size', 'opacity'].map(function (p) {
        return p + ' ' + ms + 'ms ' + (ease || 'cubic-bezier(.2,.8,.3,1)');
      }).join(',');
      apply();
      return new Promise(function (res) {
        clearTimeout(self._tt);
        self._tt = setTimeout(function () { st.transition = ''; res(); }, ms + 20);
      });
    },

    // Animações curtas (squash, wobble, pop...) definidas no CSS.
    fx: function (name) {
      var inner = this.inner, cls = 'fx-' + name;
      inner.classList.remove(cls);
      void inner.offsetWidth;
      inner.classList.add(cls);
      clearTimeout(this['_fx' + name]);
      this['_fx' + name] = setTimeout(function () { inner.classList.remove(cls); }, 900);
    },

    setState: function (key, value) {
      if (this.state[key] === value) return;
      this.state[key] = value;
      if (R.Renderers.usesState(this)) R.Renderers.draw(this);
      this.engine.emit('state', { obj: this, key: key, value: value });
    },

    setExpr: function (expr) {
      if (this.type === 'ruli') this.setState('expr', expr);
    },

    setHidden: function (h) {
      this.hidden = h;
      this.el.style.visibility = h ? 'hidden' : '';
    },

    destroy: function () {
      clearTimeout(this._tt);
      if (this.el.parentNode) this.el.parentNode.removeChild(this.el);
    }
  };

  R.GameObject = GameObject;
})();
