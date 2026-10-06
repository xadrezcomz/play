// LocalizationManager — PT-BR, EN-US e ES desde o começo (GDD §72).
// Nenhum texto fica no código: tudo vem de dados/textos/<idioma>.js por chave.
// No HTML: data-t="chave" (texto), data-t-aria="chave" (rótulo acessível).
(function (EP) {
  'use strict';
  var FALLBACK = 'pt-BR';

  var L = EP.i18n = {
    lang: FALLBACK,
    available: function () { return Object.keys(EP.texts); },
    detect: function () {
      var prefs = (typeof navigator !== 'undefined' && (navigator.languages || [navigator.language])) || [];
      for (var i = 0; i < prefs.length; i++) {
        var p = String(prefs[i] || '').toLowerCase();
        if (p.indexOf('pt') === 0) return 'pt-BR';
        if (p.indexOf('es') === 0) return 'es';
        if (p.indexOf('en') === 0) return 'en-US';
      }
      return FALLBACK;
    },
    set: function (lang) {
      L.lang = EP.texts[lang] ? lang : FALLBACK;
      if (typeof document !== 'undefined') document.documentElement.lang = L.lang;
      L._num = {};
      return L.lang;
    },
    has: function (key) { return (EP.texts[L.lang] || {})[key] !== undefined || (EP.texts[FALLBACK] || {})[key] !== undefined; },
    // t('hud.km', { n: 3 }) → troca {n} pelo valor
    t: function (key, params) {
      var s = (EP.texts[L.lang] || {})[key];
      if (s === undefined) s = (EP.texts[FALLBACK] || {})[key];
      if (s === undefined) return key;
      if (params) s = s.replace(/\{(\w+)\}/g, function (m, k) { return params[k] !== undefined ? params[k] : m; });
      return s;
    },
    // números no formato do idioma (vírgula ou ponto)
    num: function (v, decimals) {
      var k = decimals || 0;
      L._num = L._num || {};
      if (!L._num[k]) {
        try { L._num[k] = new Intl.NumberFormat(L.lang, { minimumFractionDigits: k, maximumFractionDigits: k }); }
        catch (e) { L._num[k] = { format: function (x) { return x.toFixed(k); } }; }
      }
      return L._num[k].format(v);
    },
    // distância em metros → "850 m" ou "12,4 km"
    dist: function (m, forceKm) {
      if (!forceKm && m < 1000) return L.num(Math.floor(m)) + ' m';
      var km = m / 1000;
      return L.num(km, km < 100 ? 2 : 1) + ' km';
    },
    // segundos → "32h 17m", "4:05" (curto)
    duration: function (s, short) {
      s = Math.floor(s);
      var h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), sec = s % 60;
      if (short) return (h ? h + ':' + (m < 10 ? '0' : '') : '') + m + ':' + (sec < 10 ? '0' : '') + sec;
      return h ? h + 'h ' + m + 'm' : m + 'm ' + sec + 's';
    },
    apply: function (root) {
      var els = (root || document).querySelectorAll('[data-t]');
      Array.prototype.forEach.call(els, function (el) { el.textContent = L.t(el.getAttribute('data-t')); });
      els = (root || document).querySelectorAll('[data-t-aria]');
      Array.prototype.forEach.call(els, function (el) { el.setAttribute('aria-label', L.t(el.getAttribute('data-t-aria'))); });
      els = (root || document).querySelectorAll('[data-t-ph]');
      Array.prototype.forEach.call(els, function (el) { el.setAttribute('placeholder', L.t(el.getAttribute('data-t-ph'))); });
    }
  };
})(window.EP);
