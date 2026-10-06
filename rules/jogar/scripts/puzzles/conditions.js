// WinConditionSystem: condições objetivas e declarativas.
// Uma lista [...] significa "todas". Tipos:
//   { type:'tapped',   target }
//   { type:'inside',   objects:[ids], container }
//   { type:'touching', a, b, pad }
//   { type:'moved',    target, distance }
//   { type:'state',    target, key, equals }  (ou truthy:true)
//   { type:'idle',     seconds }          → nenhum toque por N segundos
//   { type:'scale',    target, min, max }
//   { type:'all'|'any', of:[...] }, { type:'not', of: cond }
(function () {
  'use strict';
  var R = window.RULES, U = R.util;

  var C = {
    all: function (c, E) { return c.of.every(function (x) { return test(x, E); }); },
    any: function (c, E) { return c.of.some(function (x) { return test(x, E); }); },
    not: function (c, E) { return !test(c.of, E); },

    tapped: function (c, E) { return !!E.memory.tapped[c.target]; },

    inside: function (c, E) {
      var box = E.get(c.container);
      return !!box && c.objects.every(function (id) {
        var o = E.get(id);
        return o && E.isInside(o, box);
      });
    },

    touching: function (c, E) {
      var a = E.get(c.a), b = E.get(c.b), p = c.pad || 0;
      if (!a || !b) return false;
      var ra = a.rect(), rb = b.rect();
      return U.overlap({ x1: ra.x1 - p, y1: ra.y1 - p, x2: ra.x2 + p, y2: ra.y2 + p }, rb);
    },

    moved: function (c, E) {
      var o = E.get(c.target);
      return !!o && U.dist(o.x, o.y, o.x0, o.y0) >= c.distance;
    },

    state: function (c, E) {
      var o = E.get(c.target);
      if (!o) return false;
      if (c.truthy) return !!o.state[c.key];
      return o.state[c.key] === (c.equals === undefined ? true : c.equals);
    },

    idle: function (c, E) { return E.idleMs() >= c.seconds * 1000; },

    scale: function (c, E) {
      var o = E.get(c.target);
      return !!o && o.scale >= (c.min || 0) && o.scale <= (c.max || Infinity);
    }
  };

  function test(cond, E) {
    if (!cond) return false;
    if (Array.isArray(cond)) return cond.every(function (x) { return test(x, E); });
    var fn = C[cond.type];
    return fn ? fn(cond, E) : false;
  }

  R.Conditions = { types: C, test: test, register: function (name, fn) { C[name] = fn; } };
})();
