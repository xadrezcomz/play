// RoadModules — monta a geometria de cada módulo de rua a partir dos dados
// (dados/modulos.js): piso, slots das laterais (prédios, árvores, objetos) e
// partes especiais. Cada módulo vira três geometrias (cenário, luzes, água).
//
// Referencial do módulo: começa em z = 0 e avança para z = -length. Lado
// s = -1 é a esquerda, s = +1 a direita. "dl" é a distância desde o começo.
(function (EP) {
  'use strict';
  var U = EP.util, A = EP.Assets;
  var shade = function (c, f) { return EP.GeoBuilder.shade(c, f); };
  var FACE = function (s) { return s < 0 ? Math.PI / 2 : -Math.PI / 2; };   // frente virada para a rua

  // ---- pisos ---------------------------------------------------------------
  var floors = {
    rua: function (B, def, L, pal, ctx) { return city(B, def, L, pal, ctx, false); },
    avenida: function (B, def, L, pal, ctx) { return city(B, def, L, pal, ctx, true); },
    ponte: function (B, def, L, pal, ctx) { ctx.noGround = true; return city(B, def, L, pal, ctx, false); },
    parque: function (B, def, L, pal, ctx) {
      var R = ctx.W.roadHalf, path = pal.path;
      B.w.floor(0, 0.012, -L / 2, 2 * R - 0.3, L, path);
      for (var z = 1; z < L; z += 5) B.w.floor(0, 0.016, -(z + 1), 0.1, 2, '#f6e9dc');
      for (z = 0; z < L; z += 3) B.w.floor(0, 0.014, -z, 2 * R - 0.3, 0.07, shade(path, 0.86));
      [-1, 1].forEach(function (s) {
        B.w.box(s * (R - 0.08), 0, -L / 2, 0.22, 0.07, L, pal.stone);
        B.w.floor(s * (R + 40), 0, -L / 2, 80, L, pal.grass);
        for (var k = 0; k < L; k += 8) B.w.floor(s * (R + 13), 0.004, -(k + 2), 24, 4, pal.grassAlt);   // grama cortada em faixas
      });
      ctx.outer = R; ctx.curbX = R + 0.55; ctx.innerX = R + 1.3; ctx.propY = 0;
      return R;
    }
  };

  function city(B, def, L, pal, ctx, wide) {
    var R = ctx.W.roadHalf, S = ctx.W.sidewalk + (wide ? 1.8 : 0), outer = R + 0.2 + S, z;
    var arnd = U.rng(Math.round(L * 131 + R * 7));
    for (z = 0; z < L; z += 6) {
      var zl = Math.min(6, L - z);
      for (var xs = -1; xs <= 1; xs++) B.w.floor(xs * R * 2 / 3, 0, -(z + zl / 2), R * 2 / 3, zl, shade(pal.asphalt, 0.95 + arnd() * 0.1));
    }
    for (z = 1.5; z < L - 1; z += 6) B.w.floor(0, 0.012, -(z + 1.5), 0.16, 3, pal.line);
    [-1, 1].forEach(function (s) {
      B.w.floor(s * (R - 0.35), 0.012, -L / 2, 0.12, L, pal.line);
      B.w.box(s * (R + 0.1), 0, -L / 2, 0.2, 0.17, L, pal.curb);
      B.w.box(s * (R + 0.2 + S / 2), 0, -L / 2, S, 0.15, L, pal.sidewalk);
      for (z = 1; z < L; z += 2) B.w.floor(s * (R + 0.2 + S / 2), 0.152, -z, S, 0.07, pal.sidewalkAlt);   // juntas: sensação de velocidade
      if (!ctx.noGround) B.w.floor(s * (outer + 35), 0.03, -L / 2, 70, L, pal[def.ground] || pal.ground);
    });
    ctx.outer = outer; ctx.wide = wide; ctx.curbX = R + 0.55; ctx.innerX = outer - 0.6; ctx.treeX = R + 1.1; ctx.propY = 0.15;
    return outer;
  }

  // ---- laterais ------------------------------------------------------------
  function placeBuildings(B, sides, s, L, pal, rnd, ctx) {
    var list = sides.buildings;
    if (!list || !list.length) return;
    var dl = 1 + rnd() * 2;
    while (dl < L - 3) {
      var a = A.buildings[U.pick(list, rnd)], w = a.size(rnd);
      if (dl + w > L - 0.5) break;
      if (ctx.free(s, dl, dl + w, 'buildings')) {
        B.frame(s * (U.range(sides.setback, rnd) + (ctx.wide ? 1.8 : 0)), 0, -(dl + w / 2), FACE(s));
        a.draw(B, rnd, pal, w);
      }
      dl += w + U.range(sides.buildingGap, rnd);
    }
    B.noFrame();
  }

  function placeTrees(B, sides, s, L, pal, rnd, ctx, park) {
    var list = sides.trees;
    if (!list || !list.length) return;
    for (var dl = U.range(sides.treeEvery, rnd) * 0.5; dl < L - 1; dl += U.range(sides.treeEvery, rnd)) {
      if (park) {
        var bands = [[ctx.W.roadHalf + 2.4, ctx.W.roadHalf + 7], [ctx.W.roadHalf + 9, ctx.W.roadHalf + 34]];
        for (var b = 0; b < bands.length; b++) {
          var x = U.range(bands[b], rnd), d = Math.min(L - 0.5, dl + rnd() * 2);
          if (rnd() < 0.85 && ctx.free(s, d, d, 'trees', x)) {
            B.frame(s * x, 0, -d, rnd() * 6);
            B.shadow.blob(0, 0.03, 0, 1.7, 1.7);
            A.trees[U.pick(list, rnd)](B, rnd, pal);
            if (b === 0) ctx.mark(s, d);
          }
        }
      } else if (ctx.free(s, dl, dl, 'trees')) {
        B.frame(s * ctx.treeX, 0.15, -dl, rnd() * 6);
        B.w.floor(0, 0.006, 0, 1.2, 1.2, '#6d5b49');
        B.shadow.blob(0.3, 0.012, 0.3, 1.8, 1.8);
        B.noFrame(); B.shadow.blob(s * (ctx.treeX - 1.6), 0.02, -dl + 0.6, 2.2, 1.9); B.frame(s * ctx.treeX, 0.15, -dl, 0);
        A.trees[U.pick(list, rnd)](B, rnd, pal);
        ctx.mark(s, dl);
      }
    }
    B.noFrame();
  }

  function placeProps(B, sides, s, L, pal, rnd, ctx) {
    var list = sides.props;
    if (!list || !list.length) return;
    for (var dl = U.range(sides.propEvery, rnd) * 0.5; dl < L - 1; dl += U.range(sides.propEvery, rnd)) {
      var p = A.props[U.pick(list, rnd)], d = ctx.nearTree(s, dl, 1.6) ? dl + 2.2 : dl;
      if (d > L - 0.5 || !ctx.free(s, d, d, 'props')) continue;
      B.frame(s * (p.curb ? ctx.curbX : ctx.innerX), ctx.propY, -d, FACE(s));
      p.draw(B, rnd, pal);
    }
    B.noFrame();
  }

  function skyline(B, L, pal, rnd, count, tall, minX) {
    [-1, 1].forEach(function (s) {
      for (var i = 0; i < count; i++) {
        var w = 12 + rnd() * 18, d = 12 + rnd() * 12, h = (tall ? 32 : 18) + rnd() * (tall ? 60 : 34);
        var x = s * (minX + rnd() * 70), z = -rnd() * L, c = shade(pal.skyline, 0.85 + rnd() * 0.3);
        B.w.box(x, 0, z, d, h, w, c);
        for (var k = 0; k < 3; k++) B.g.quad(x - s * (d / 2 + 0.05), h * (0.3 + k * 0.22), z, w * 0.7, 1.2, '#ffe2a0', -s * Math.PI / 2);
      }
    });
  }

  // ---- partes especiais ----------------------------------------------------
  var extras = {
    crosswalk: function (B, def, L, pal, rnd, ctx) {
      var R = ctx.W.roadHalf;
      for (var x = -R + 0.7; x < R - 0.3; x += 1.0) B.w.floor(x, 0.013, -5, 0.5, 4, pal.line);
    },
    skyline: function () { /* prédios ao fundo: mais altos e em maior número (ver build) */ },
    fonte: function (B, def, L, pal, rnd, ctx) {
      var s = rnd() < 0.5 ? -1 : 1, o = ctx.outer, from = 14, to = L - 14, mid = (from + to) / 2;
      ctx.reserve(s, from - 2, to + 2, 'all');
      B.w.floor(s * (o + 20), 0.08, -mid, 40, to - from, pal.sidewalkAlt);
      for (var z = from; z <= to; z += 4) B.w.floor(s * (o + 20), 0.083, -z, 40, 0.06, shade(pal.sidewalkAlt, 0.9));
      var fx = s * (o + 11);
      B.frame(fx, 0.08, -mid, 0); A.pieces.fountain(B, pal);
      for (var k = 0; k < 4; k++) {
        var a = Math.PI / 4 + k * Math.PI / 2, bx = fx + Math.cos(a) * 5.4, bz = -mid + Math.sin(a) * 5.4;
        B.frame(bx, 0.08, bz, Math.atan2(fx - bx, -mid - bz)); A.props.banco.draw(B, rnd, pal);
      }
      [[3, from + 2], [3, to - 2], [21, from + 2], [21, to - 2]].forEach(function (p) {
        B.frame(s * (o + p[0]), 0.08, -p[1], rnd() * 6); A.trees.florida(B, rnd, pal);
      });
      [[1.2, mid - 8], [1.2, mid + 8]].forEach(function (p) {
        B.frame(s * (o + p[0]), 0.08, -p[1], FACE(s)); A.props.poste.draw(B, rnd, pal);
      });
      B.noFrame();
    },
    rio: function (B, def, L, pal, rnd, ctx) {
      var o = ctx.outer, from = 14, to = L - 14, span = to - from, mid = (from + to) / 2;
      [-1, 1].forEach(function (s) { ctx.reserve(s, from - 3, to + 3, { buildings: 1, trees: 1 }); });
      B.water.floor(0, -2.0, -mid, 200, span, pal.water);
      [-1, 1].forEach(function (s) {
        B.w.floor(s * (o + 35), 0.03, -from / 2, 70, from, pal[def.ground]);
        B.w.floor(s * (o + 35), 0.03, -(to + (L - to) / 2), 70, L - to, pal[def.ground]);
        B.w.box(s * (o + 35), -2.05, -from, 70, 2.08, 0.8, pal.stone);
        B.w.box(s * (o + 35), -2.05, -to, 70, 2.08, 0.8, pal.stone);
        for (var z = from; z <= to; z += 2.5) B.w.add('cyl6', s * (o - 0.15), 0.67, -z, 0.09, 1.05, 0.09, '#e9eef2');
        B.w.box(s * (o - 0.15), 1.15, -mid, 0.12, 0.1, span, '#e9eef2');
        for (var t = 0; t < 7; t++) {
          var d = rnd() < 0.5 ? 1 + rnd() * (from - 3) : to + 2 + rnd() * (L - to - 3);
          B.frame(s * (o + 3 + rnd() * 34), 0, -d, rnd() * 6);
          A.trees[rnd() < 0.5 ? 'pinheiro' : 'redonda'](B, rnd, pal);
        }
        B.noFrame();
      });
      B.w.box(0, -1.02, -mid, 2 * o, 1.0, span + 1, shade(pal.curb, 0.82));
      [mid - 16, mid + 16].forEach(function (z) { B.w.box(0, -2.1, -z, 2 * o - 3, 1.1, 1.8, pal.stone); });
      for (var b = 0; b < 2; b++) {
        B.frame((rnd() < 0.5 ? -1 : 1) * (22 + rnd() * 40), -2.0, -(from + 8 + rnd() * (span - 16)), rnd() * 6);
        A.pieces.boat(B, rnd);
      }
      B.noFrame();
    },
    tunel: function (B, def, L, pal, rnd, ctx) {
      var o = ctx.outer, from = 24, to = L - 19, len = to - from, mid = (from + to) / 2, wall = '#8d929b', top = 9;
      [-1, 1].forEach(function (s) {
        ctx.reserve(s, from - 4, to + 4, 'all');
        B.w.box(s * (o + 0.8 + 20), 0, -mid, 40, top, len, wall);                    // encostas
        B.w.box(s * (o + 0.4), 0, -mid, 0.8, 6.2, len, shade(wall, 0.72));             // parede interna
        B.w.box(s * (o + 0.5), 0, -from, 1.2, 6.6, 0.6, '#6c717b');                     // moldura
        B.w.box(s * (o + 0.5), 0, -to, 1.2, 6.6, 0.6, '#6c717b');
      });
      B.w.box(0, 6.2, -mid, 2 * o + 1.6, top - 6.2, len, wall);                          // teto
      B.w.box(0, 6.2, -mid, 2 * o + 0.2, 0.05, len - 0.4, shade(wall, 0.6));
      B.w.box(0, 6.0, -from, 2 * o + 2.4, 0.7, 0.6, '#6c717b');
      B.w.box(0, 6.0, -to, 2 * o + 2.4, 0.7, 0.6, '#6c717b');
      B.w.box(0, top, -mid, 2 * o + 82, 0.4, len + 1, pal.grass);                        // morro gramado
      for (var z = from + 2; z < to; z += 4.5) {
        B.g.box(-2.4, 6.13, -z, 0.3, 0.06, 2.4, '#fff3cf');
        B.g.box(2.4, 6.13, -z, 0.3, 0.06, 2.4, '#fff3cf');
      }
      for (var t = 0; t < 14; t++) {
        B.frame((rnd() < 0.5 ? -1 : 1) * (2 + rnd() * 38), top + 0.4, -(from + 3 + rnd() * (len - 6)), rnd() * 6);
        A.trees[rnd() < 0.6 ? 'redonda' : 'arbusto'](B, rnd, pal);
      }
      B.noFrame();
    },
    gramado: function (B, def, L, pal, rnd, ctx) {
      var R = ctx.W.roadHalf;
      [-1, 1].forEach(function (s) {
        for (var i = 0; i < 6; i++) {
          var x = s * (R + 3 + rnd() * 18), z = -rnd() * L, c = U.pick(pal.blossom, rnd);
          for (var k = 0; k < 5; k++) B.w.add('ico', x + (rnd() - 0.5) * 1.6, 0.12, z + (rnd() - 0.5) * 1.6, 0.3, 0.25, 0.3, c);
        }
      });
    },
    canteiros: function (B, def, L, pal, rnd, ctx) {
      var R = ctx.W.roadHalf;
      [-1, 1].forEach(function (s) {
        for (var z = 12 + rnd() * 8; z < L - 6; z += 26 + rnd() * 10) {
          var x = s * (R + 2.2), c = U.pick(pal.blossom, rnd);
          B.w.box(x, 0, -z, 1.4, 0.3, 4.2, pal.stone);
          for (var k = 0; k < 8; k++) B.w.add('ico', x + (rnd() - 0.5) * 0.9, 0.42, -z + (rnd() - 0.5) * 3.6, 0.42, 0.35, 0.42, k % 3 ? c : '#ffffff');
        }
      });
    },
    lago: function (B, def, L, pal, rnd, ctx) {
      var s = rnd() < 0.5 ? -1 : 1, R = ctx.W.roadHalf, cx = s * (R + 16), cz = -L / 2, rx = 10, rz = 34;
      ctx.reserve(s, L / 2 - rz - 3, L / 2 + rz + 3, { trees: 1 }, R + 30);
      B.w.add('ring', cx, 0.03, cz, 2 * rx + 1.6, 1, 2 * rz + 1.6, pal.stone);
      B.water.add('ring', cx, 0.07, cz, 2 * rx, 1, 2 * rz, pal.water);
      for (var i = 0; i < 16; i++) {
        var a = rnd() * Math.PI * 2, ex = cx + Math.cos(a) * (rx + 0.4), ez = cz + Math.sin(a) * (rz + 0.4);
        for (var k = 0; k < 4; k++) B.w.add('cyl6', ex + (rnd() - 0.5) * 0.6, 0.5, ez + (rnd() - 0.5) * 0.6, 0.06, 1.0 + rnd() * 0.5, 0.06, '#5f8f3e');
      }
      for (var d = 0; d < 4; d++) {
        B.frame(cx + (rnd() - 0.5) * rx, 0.07, cz + (rnd() - 0.5) * rz * 1.2, rnd() * 6);
        A.pieces.duck(B, rnd);
      }
      B.noFrame();
      B.w.box(s * (R + 6.4), 0, cz, 2.2, 0.35, 1.6, pal.wood);                         // deque
      for (var t = 0; t < 8; t++) {
        B.frame(s * (R + 30 + rnd() * 10), 0, -(rnd() * L), rnd() * 6);
        A.trees[rnd() < 0.5 ? 'pinheiro' : 'redonda'](B, rnd, pal);
      }
      B.noFrame();
    },
    quadra: function (B, def, L, pal, rnd, ctx) {
      var s = rnd() < 0.5 ? -1 : 1, R = ctx.W.roadHalf, cx = s * (R + 13), cz = -L / 2, line = '#ffffff';
      ctx.reserve(s, L / 2 - 17, L / 2 + 17, 'all');
      B.w.box(cx, 0, cz, 15, 0.08, 27, '#3f8f5f');
      B.w.box(cx, 0, cz, 12, 0.09, 24, '#3a6ea5');
      [[0, 12, 12, 0.12], [0, -12, 12, 0.12], [6, 0, 0.12, 24], [-6, 0, 0.12, 24], [0, 0, 12, 0.12]].forEach(function (l) {
        B.w.floor(cx + l[0], 0.1, cz + l[1], l[2], l[3], line);
      });
      for (var z = -13.5; z <= 13.5; z += 3) {
        B.w.add('cyl6', cx - 7.5, 0.7, cz + z, 0.07, 1.4, 0.07, '#7a8290');
        B.w.add('cyl6', cx + 7.5, 0.7, cz + z, 0.07, 1.4, 0.07, '#7a8290');
      }
      B.w.box(cx - 7.5, 1.35, cz, 0.06, 0.06, 27, '#7a8290');
      B.w.box(cx + 7.5, 1.35, cz, 0.06, 0.06, 27, '#7a8290');
      B.frame(cx, 0, cz - 12.6, 0); A.pieces.hoop(B);
      B.frame(cx, 0, cz + 12.6, Math.PI); A.pieces.hoop(B);
      B.noFrame();
    },
    bifurcacao: function (B, def, L, pal, rnd, ctx) {
      var dv = def.divider, R = ctx.W.roadHalf, o = ctx.outer, len = dv.to - dv.from, mid = (dv.from + dv.to) / 2, hw = dv.halfWidth;
      B.w.box(0, 0, -mid, 2 * hw, 0.22, len, pal.curb);
      B.w.floor(0, 0.225, -mid, 2 * hw - 0.25, len - 0.5, pal.grass);
      B.w.add('cyl12', 0, 0.11, -dv.from, 2 * hw, 0.22, 2 * hw, pal.curb);
      B.w.add('cyl12', 0, 0.11, -dv.to, 2 * hw, 0.22, 2 * hw, pal.curb);
      // canteiro: arbustos redondos e flores (nada de muro de grama)
      for (var z = dv.from + 1.5; z < dv.to - 1; z += 1.7) {
        var leaf = shade(U.pick(pal.leaves, rnd), 0.8 + rnd() * 0.25), r = 0.55 + rnd() * 0.2;
        B.w.add('icoS', (rnd() - 0.5) * 0.3, 0.22 + r * 0.7, -z, r * 2.1, r * 1.6, r * 2.1, leaf, rnd() * 6);
        if (rnd() < 0.6) B.w.add('icoT', (rnd() - 0.5) * 0.8, 0.22 + r * 1.35, -z - 0.5, 0.3, 0.26, 0.3, U.pick(pal.blossom, rnd));
      }
      // setas no asfalto: uma para cada lado
      [-1, 1].forEach(function (s) {
        B.w.add('plane', s * 1.3, 0.014, -(dv.from - 7), 0.35, 1, 6, pal.line, -s * 0.38);
        B.w.add('plane', s * 2.25, 0.014, -(dv.from - 3.9), 0.35, 1, 1.6, pal.line, s * 0.5);
      });
      // pórtico das placas
      [-1, 1].forEach(function (s) { B.w.add('cyl8', s * (R + 0.45), 3.2, -10, 0.24, 6.4, 0.24, pal.metal); });
      B.w.box(0, 6.0, -10, 2 * R + 1.2, 0.35, 0.35, pal.metal);
      // esquerda com cara de parque, direita com cara de centro
      B.w.floor(-(o + 35), 0.035, -L / 2, 70, L, pal.grass);
      for (z = 4; z < L; z += 5) {
        B.frame(-(o + 2 + rnd() * 24), 0.035, -z, rnd() * 6);
        A.trees[U.pick(['redonda', 'pinheiro', 'florida'], rnd)](B, rnd, pal);
      }
      B.noFrame();
      placeBuildings(B, { buildings: ['predio-alto', 'predio-baixo', 'predio-alto'], buildingGap: [2, 5], setback: [11, 12] }, 1, L, pal, rnd, ctx);
    }
  };

  // ---- montagem ------------------------------------------------------------
  function Ctx(W) {
    this.W = W;
    this.res = { '-1': [], '1': [] };
    this.trees = { '-1': [], '1': [] };
  }
  Ctx.prototype.reserve = function (s, from, to, kinds, xMax) {
    this.res[s].push({ from: from, to: to, kinds: kinds, xMax: xMax === undefined ? Infinity : xMax });
  };
  Ctx.prototype.free = function (s, from, to, kind, x) {
    var list = this.res[s];
    for (var i = 0; i < list.length; i++) {
      var r = list[i];
      if (to < r.from || from > r.to) continue;
      if (r.kinds !== 'all' && !r.kinds[kind]) continue;
      if (x !== undefined && x > r.xMax) continue;
      return false;
    }
    return true;
  };
  Ctx.prototype.mark = function (s, dl) { this.trees[s].push(dl); };
  Ctx.prototype.nearTree = function (s, dl, gap) {
    return this.trees[s].some(function (t) { return Math.abs(t - dl) < gap; });
  };

  // Registros abertos: cada região pode acrescentar pisos e partes especiais
  // no seu arquivo (js/world/biomas/<id>.js) sem mexer neste:
  //   EP.RoadModules.floors.areia = function (B, def, L, pal, ctx) { ... }
  //   EP.RoadModules.extras.farol = function (B, def, L, pal, rnd, ctx) { ... }
  // As funções de laterais ficam em EP.RoadModules.helpers para reaproveitar.
  EP.RoadModules = {
    floors: floors,
    extras: extras,
    helpers: { city: city, placeBuildings: placeBuildings, placeTrees: placeTrees, placeProps: placeProps, skyline: skyline, FACE: FACE, Ctx: Ctx },
    build: function (def, seed, biome, W) {
      var rnd = U.rng(seed), pal = biome.palette, L = def.length;
      var B = new EP.Batch(), ctx = new Ctx(W);
      ctx.biome = biome;
      if (!floors[def.floor]) throw new Error('piso desconhecido: ' + def.floor + ' (módulo ' + def.id + ')');
      floors[def.floor](B, def, L, pal, ctx);
      (def.extras || []).forEach(function (e) {
        if (!extras[e]) throw new Error('parte especial desconhecida: ' + e + ' (módulo ' + def.id + ')');
        extras[e](B, def, L, pal, rnd, ctx);
      });
      var park = def.floor === 'parque';
      [-1, 1].forEach(function (s) {
        placeBuildings(B, def.sides, s, L, pal, rnd, ctx);
        placeTrees(B, def.sides, s, L, pal, rnd, ctx, park);
        placeProps(B, def.sides, s, L, pal, rnd, ctx);
      });
      var tall = (def.extras || []).indexOf('skyline') >= 0;
      if (def.skyline !== false && biome.skyline !== false) skyline(B, L, pal, rnd, tall ? 7 : park ? 2 : 4, tall, park ? 75 : 55);
      return {
        world: B.w.build(),
        glow: B.g.count() ? B.g.build() : null,
        water: B.water.count() ? B.water.build() : null,
        shadow: B.shadow.count() ? B.shadow.build() : null,
        light: B.light.count() ? B.light.build() : null,
        leaf: B.leaf.count() ? B.leaf.build() : null,
        glass: B.glass.count() ? B.glass.build() : null,
        sign: B.sign.count() ? B.sign.build() : null
      };
    }
  };
})(window.EP);
