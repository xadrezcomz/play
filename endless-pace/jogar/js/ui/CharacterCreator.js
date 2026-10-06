// CharacterCreator — "CRIE SEU CORREDOR" em 4 passos (GDD §4): corredor ou
// corredora, nome, aparência e roupa inicial. O boneco 3D muda na hora.
(function (EP) {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };

  function CharacterCreator(root) {
    this.root = root;
    this.step = 1;
    var self = this;
    root.querySelectorAll('[data-genero]').forEach(function (b) {
      b.addEventListener('click', function () {
        self.profile.gender = b.getAttribute('data-genero');
        // cabelo padrão de cada um, se ainda não mexeu
        if (!self.touchedHair) self.profile.appearance.hairStyle = EP.data.appearance.genders.filter(function (g) { return g.id === self.profile.gender; })[0].hairStyle;
        EP.AudioManager.ui();
        self._render(); self._changed();
      });
    });
    $('c-nome').addEventListener('input', function () {
      var v = $('c-nome').value.replace(/[\u0000-\u001f<>]/g, '').slice(0, EP.data.appearance.nameMax);
      if (v !== $('c-nome').value) $('c-nome').value = v;
      self.profile.name = v.trim().toUpperCase();
      $('c-proximo').disabled = false;
    });
    $('c-nome').addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); self.next(); } });
    $('c-proximo').addEventListener('click', function () { self.next(); });
    $('c-voltar').addEventListener('click', function () { self.back(); });
  }
  var P = CharacterCreator.prototype;

  // opts: { profile, editing, onChange(profile), onDone(profile), onCancel() }
  P.open = function (opts) {
    this.opts = opts;
    this.profile = EP.util.copy(opts.profile);
    this.touchedHair = !!opts.editing;
    this.step = 1;
    $('c-nome').value = this.profile.name || '';
    this._render();
  };

  P._changed = function () { if (this.opts.onChange) this.opts.onChange(this.profile); };

  P.next = function () {
    if (this.step === 2 && !this.profile.name) {
      var n = $('c-nome');
      n.focus();
      n.animate && n.animate([{ transform: 'translateX(-6px)' }, { transform: 'translateX(6px)' }, { transform: 'none' }], { duration: 240 });
      return;
    }
    EP.AudioManager.ui();
    if (this.step < 4) { this.step++; this._render(); return; }
    this.opts.onDone(this.profile);
  };

  P.back = function () {
    if (this.step > 1) { this.step--; this._render(); return; }
    if (this.opts.onCancel) this.opts.onCancel();
  };

  P._swatches = function (el, colors, key) {
    var self = this, a = this.profile.appearance;
    el.innerHTML = '';
    colors.forEach(function (c, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'cor' + (a[key] === i ? ' sel' : '');
      b.style.background = c;
      b.setAttribute('aria-label', String(i + 1));
      b.setAttribute('aria-pressed', a[key] === i ? 'true' : 'false');
      b.addEventListener('click', function () { a[key] = i; EP.AudioManager.ui(); self._render(); self._changed(); });
      el.appendChild(b);
    });
  };

  P._render = function () {
    var D = EP.data.appearance, t = EP.i18n.t, self = this, a = this.profile.appearance;
    $('c-passo').textContent = t('create.step', { n: this.step });
    this.root.querySelectorAll('.pontos i').forEach(function (d, i) { d.classList.toggle('feito', i < self.step); });
    this.root.querySelectorAll('.etapa').forEach(function (e) { e.classList.toggle('ativa', +e.getAttribute('data-etapa') === self.step); });
    this.root.querySelectorAll('[data-genero]').forEach(function (b) {
      var sel = b.getAttribute('data-genero') === self.profile.gender;
      b.classList.toggle('sel', sel);
      b.setAttribute('aria-pressed', sel ? 'true' : 'false');
    });
    this._swatches($('c-pele'), D.skin, 'skin');
    this._swatches($('c-cor-cabelo'), D.hairColors, 'hairColor');
    this._swatches($('c-camiseta'), D.shirts, 'shirt');
    this._swatches($('c-short'), D.shorts, 'shorts');
    this._swatches($('c-tenis'), D.shoes, 'shoes');
    var hair = $('c-cabelo');
    hair.innerHTML = '';
    D.hairStyles.forEach(function (h) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'chip' + (a.hairStyle === h.id ? ' sel' : '');
      b.textContent = t(h.text);
      b.setAttribute('aria-pressed', a.hairStyle === h.id ? 'true' : 'false');
      b.addEventListener('click', function () { a.hairStyle = h.id; self.touchedHair = true; EP.AudioManager.ui(); self._render(); self._changed(); });
      hair.appendChild(b);
    });
    $('c-proximo').textContent = this.step < 4 ? t('ui.next') : t(this.opts.editing ? 'ui.save' : 'ui.start');
    $('c-voltar').style.visibility = this.step > 1 || this.opts.onCancel ? 'visible' : 'hidden';
    if (this.step === 2) setTimeout(function () { if (!EP.Input.touchSeen) $('c-nome').focus(); }, 60);
  };

  EP.CharacterCreator = CharacterCreator;
})(window.EP);
