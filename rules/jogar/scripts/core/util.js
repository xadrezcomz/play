// RULES · utilitários compartilhados por todo o engine.
// Tudo fica no namespace window.RULES (scripts clássicos: funciona até
// abrindo o arquivo direto no navegador, sem servidor).
(function () {
  'use strict';
  var R = (window.RULES = window.RULES || {});

  R.util = {
    clamp: function (v, a, b) { return Math.max(a, Math.min(b, v)); },
    dist: function (ax, ay, bx, by) { return Math.hypot(ax - bx, ay - by); },
    pad: function (n, len) { return String(n).padStart(len || 2, '0'); },
    pick: function (arr) { return arr[Math.floor(Math.random() * arr.length)]; },
    now: function () { return performance.now(); },
    wait: function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); },
    el: function (tag, cls, parent) {
      var e = document.createElement(tag);
      if (cls) e.className = cls;
      if (parent) parent.appendChild(e);
      return e;
    },
    overlap: function (a, b) {
      return a.x1 < b.x2 && a.x2 > b.x1 && a.y1 < b.y2 && a.y2 > b.y1;
    },
    pointIn: function (x, y, r) {
      return x >= r.x1 && x <= r.x2 && y >= r.y1 && y <= r.y2;
    }
  };

  // Barramento de eventos mínimo.
  R.Emitter = function () { this._l = {}; };
  R.Emitter.prototype.on = function (name, fn) {
    (this._l[name] = this._l[name] || []).push(fn);
    return fn;
  };
  R.Emitter.prototype.off = function (name, fn) {
    var a = this._l[name];
    if (a) this._l[name] = a.filter(function (f) { return f !== fn; });
  };
  R.Emitter.prototype.emit = function (name, payload) {
    var a = this._l[name];
    if (!a) return;
    a.slice().forEach(function (fn) { fn(payload); });
  };
  R.Emitter.prototype.clearListeners = function () { this._l = {}; };
})();
