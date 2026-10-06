// LocalizationSystem: nenhum texto fica dentro da lógica, só chaves.
// Cada idioma é um arquivo em localization/ que registra RULES.L10N[código].
//
// Palavras que viram objetos dentro de uma instrução usam [[id|TEXTO]]:
//   "COLOQUE [[w_all|TUDO]] NA CAIXA"  →  a palavra TUDO é o objeto "w_all".
// Assim cada idioma escolhe a palavra certa sem mexer na fase.
(function () {
  'use strict';
  var R = window.RULES;
  R.L10N = R.L10N || {};

  R.i18n = {
    lang: 'pt-BR',
    fallback: 'pt-BR',

    detect: function () {
      var n = String(navigator.language || 'en').toLowerCase();
      if (n.indexOf('pt') === 0) return 'pt-BR';
      if (n.indexOf('es') === 0) return 'es-ES';
      return 'en-US';
    },

    set: function (lang) {
      if (!R.L10N[lang]) lang = this.fallback;
      this.lang = lang;
      document.documentElement.lang = lang;
    },

    has: function (key) {
      var cur = R.L10N[this.lang], fb = R.L10N[this.fallback];
      return !!((cur && key in cur.strings) || (fb && key in fb.strings));
    },

    t: function (key, vars) {
      var cur = R.L10N[this.lang], fb = R.L10N[this.fallback];
      var s = cur && key in cur.strings ? cur.strings[key]
        : fb && key in fb.strings ? fb.strings[key] : key;
      if (vars) {
        s = s.replace(/\{(\w+)\}/g, function (m, k) { return vars[k] != null ? vars[k] : m; });
      }
      return s;
    },

    // Texto puro, sem as marcas [[id|...]].
    plain: function (key) {
      return this.t(key).replace(/\[\[[^|\]]+\|([^\]]+)\]\]/g, '$1');
    },

    // Divide em pedaços: { text } ou { id, text } para as palavras-objeto.
    parseRich: function (s) {
      var out = [], re = /\[\[([^|\]]+)\|([^\]]+)\]\]/g, last = 0, m;
      while ((m = re.exec(s))) {
        if (m.index > last) out.push({ text: s.slice(last, m.index) });
        out.push({ id: m[1], text: m[2] });
        last = re.lastIndex;
      }
      if (last < s.length) out.push({ text: s.slice(last) });
      return out;
    },

    languages: function () {
      return Object.keys(R.L10N).map(function (k) { return { code: k, name: R.L10N[k].name }; });
    },

    applyDom: function (root) {
      var self = this;
      (root || document).querySelectorAll('[data-i18n]').forEach(function (e) {
        e.textContent = self.plain(e.getAttribute('data-i18n'));
      });
      (root || document).querySelectorAll('[data-i18n-aria]').forEach(function (e) {
        e.setAttribute('aria-label', self.plain(e.getAttribute('data-i18n-aria')));
      });
    }
  };
})();
