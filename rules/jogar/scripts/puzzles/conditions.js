// WinConditionSystem: condições objetivas e declarativas.
// Uma lista [...] significa "todas". Tipos:
//   { type:'tapped',   target }
//   { type:'inside',   objects:[ids], container }
//   { type:'touching', a, b, pad }
//   { type:'moved',    target, distance }
//   { type:'state',    target, key, equals }  (ou truthy:true)
//   { type:'idle',     seconds }          → nenhum toque por N segundos
//   { type:'scale',    target, min, max }
//   { type:'hint' }                       → abriu a dica
//   { type:'text', target, mode:'covers'|'inside'|'outside' } → em relação à instrução
//   { type:'pos', target, minX, maxX, minY, maxY }
//   { type:'same', ids:[...], key?, scaleTol? } → mesmo estado e/ou mesmo tamanho
//   { type:'balanced', left, right, ids:[...] } → mesmo peso (props.weight) em dois pratos
//   { type:'split', divider, ids:[...] }   → mesma quantidade dos dois lados da divisória
//   state também aceita min/max (números)
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
      if (c.min != null || c.max != null) {
        var v = o.state[c.key] || 0;
        return v >= (c.min != null ? c.min : -Infinity) && v <= (c.max != null ? c.max : Infinity);
      }
      return o.state[c.key] === (c.equals === undefined ? true : c.equals);
    },

    idle: function (c, E) { return E.idleMs() >= c.seconds * 1000; },

    hint: function (c, E) { return !!E.memory.hint; },

    text: function (c, E) {
      var o = E.get(c.target);
      if (!o) return false;
      var t = E.textRect(), r = o.rect(), m = o.center();
      if (c.mode === 'covers') {
        var tc = [(t.x1 + t.x2) / 2, (t.y1 + t.y2) / 2];
        return U.pointIn(tc[0], tc[1], r) && (r.x2 - r.x1) >= (t.x2 - t.x1) * 0.6;
      }
      var inside = U.pointIn(m[0], m[1], { x1: t.x1 - 2, y1: t.y1 - 2, x2: t.x2 + 2, y2: t.y2 + 2 });
      return c.mode === 'outside' ? !o.inText && !inside : inside;
    },

    pos: function (c, E) {
      var o = E.get(c.target);
      if (!o) return false;
      return (c.minX == null || o.x >= c.minX) && (c.maxX == null || o.x <= c.maxX) &&
        (c.minY == null || o.y >= c.minY) && (c.maxY == null || o.y <= c.maxY);
    },

    same: function (c, E) {
      var os = c.ids.map(function (id) { return E.get(id); });
      if (os.some(function (o) { return !o; })) return false;
      return os.every(function (o) {
        if (c.key && o.state[c.key] !== os[0].state[c.key]) return false;
        if (c.scaleTol != null && Math.abs(o.sw - os[0].sw) > os[0].sw * c.scaleTol) return false;
        return true;
      });
    },

    balanced: function (c, E) {
      var w = function (pan) {
        var p = E.get(pan), sum = 0;
        if (!p) return NaN;
        c.ids.forEach(function (id) {
          var o = E.get(id);
          if (o && !o.hidden && E.isInside(o, p)) sum += (o.def.props && o.def.props.weight != null) ? o.def.props.weight : 1;
        });
        return sum;
      };
      return w(c.left) === w(c.right);
    },

    split: function (c, E) {
      var d = E.get(c.divider), l = 0, r = 0;
      if (!d) return false;
      c.ids.forEach(function (id) { var o = E.get(id); if (o) { if (o.x < d.x) l++; else r++; } });
      return l === r;
    },

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
