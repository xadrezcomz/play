// ENDLESS PACE — núcleo: espaço de nomes, utilidades e barramento de eventos.
//
// Arquitetura (GDD §78): os SISTEMAS (js/) não guardam conteúdo. Todo o
// conteúdo e todos os números de balanceamento ficam em dados/ e chegam aqui
// por EP.data. Um tênis, um módulo de rua ou um desafio novo é só dado.
(function (root) {
  'use strict';
  var EP = root.EP = root.EP || {};
  EP.VERSION = '0.1.0';
  EP.data = EP.data || {};    // preenchido pelos arquivos de dados/
  EP.texts = EP.texts || {};  // preenchido por dados/textos/<idioma>.js

  var U = EP.util = {
    clamp: function (v, a, b) { return v < a ? a : v > b ? b : v; },
    lerp: function (a, b, t) { return a + (b - a) * t; },
    // aproxima a de b numa taxa que não depende do fps
    damp: function (a, b, rate, dt) { return b + (a - b) * Math.exp(-rate * dt); },
    smooth: function (t) { t = t < 0 ? 0 : t > 1 ? 1 : t; return t * t * (3 - 2 * t); },
    // tabela de pontos [[x, y], ...] em ordem crescente de x → y interpolado
    table: function (pts, x) {
      if (x <= pts[0][0]) return pts[0][1];
      for (var i = 1; i < pts.length; i++) {
        if (x <= pts[i][0]) {
          var a = pts[i - 1], b = pts[i];
          return a[1] + (b[1] - a[1]) * (x - a[0]) / (b[0] - a[0]);
        }
      }
      return pts[pts.length - 1][1];
    },
    // gerador pseudoaleatório com semente (mulberry32): mesma semente, mesmo resultado
    rng: function (seed) {
      var s = (seed >>> 0) || 1;
      return function () {
        s = (s + 0x6D2B79F5) >>> 0;
        var t = s;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    },
    range: function (r, rnd) { return r[0] + (r[1] - r[0]) * (rnd || Math.random)(); },
    pick: function (list, rnd) { return list[Math.floor((rnd || Math.random)() * list.length) % list.length]; },
    pickWeighted: function (list, weight, rnd) {
      var total = 0, i;
      for (i = 0; i < list.length; i++) total += Math.max(0, weight(list[i]));
      var r = (rnd || Math.random)() * total;
      for (i = 0; i < list.length; i++) {
        r -= Math.max(0, weight(list[i]));
        if (r <= 0) return list[i];
      }
      return list[list.length - 1];
    },
    // cópia profunda de dados simples (JSON)
    copy: function (o) { return JSON.parse(JSON.stringify(o)); },
    // completa o objeto com os campos que faltam (para saves antigos)
    fill: function (target, defaults) {
      for (var k in defaults) {
        if (!Object.prototype.hasOwnProperty.call(defaults, k)) continue;
        var d = defaults[k];
        if (target[k] === undefined) target[k] = U.copy(d);
        else if (d && typeof d === 'object' && !Array.isArray(d) && target[k] && typeof target[k] === 'object') U.fill(target[k], d);
      }
      return target;
    }
  };

  // Barramento de eventos: os sistemas avisam o que aconteceu e quem quiser
  // escuta (interface, áudio, analytics), sem um sistema conhecer o outro.
  var handlers = {};
  EP.events = {
    on: function (name, fn) { (handlers[name] = handlers[name] || []).push(fn); return fn; },
    off: function (name, fn) {
      var l = handlers[name];
      if (l) { var i = l.indexOf(fn); if (i >= 0) l.splice(i, 1); }
    },
    emit: function (name, payload) {
      var l = handlers[name];
      if (l) l.slice().forEach(function (fn) { fn(payload || {}, name); });
      var all = handlers['*'];
      if (all) all.slice().forEach(function (fn) { fn(payload || {}, name); });
    },
    clear: function () { handlers = {}; }
  };
})(typeof window !== 'undefined' ? window : globalThis);
