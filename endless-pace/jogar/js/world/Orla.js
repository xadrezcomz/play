// Orla — o trecho-modelo da direção de arte (VISUAL TARGET): uma avenida-parque
// à beira do rio. À esquerda, calçadão com canteiros floridos, árvores
// maduras, bancos, postes com faixas, guarda-corpo e o rio (com ponte e
// veleiros); à direita, calçada larga com árvores, vasos, cafés com toldo e
// prédios de fachada clássica. Tudo feito com as peças de js/world/Kit.js.
(function (EP) {
  'use strict';
  var U = EP.util, K = EP.Kit, RM = EP.RoadModules;
  var shade = function (c, f) { return EP.GeoBuilder.shade(c, f); };

  var C = {
    asphalt: '#56555a', line: '#efe9dc', gutter: '#9a958c', curb: '#ddd6c9',
    promenade: '#d6cdbd', sidewalk: '#dbd3c6', bedEdge: '#c4b8a5', soil: '#4a3a2e', pit: '#6b5a48',
    coping: '#d3c8b6', wall: '#a99f8f', water: '#2c6a8c', lot: '#b3ab9c'
  };
  var R = 4.5, SW = 0.15, LEFT_EDGE = -12.6, RIGHT_EDGE = 10.6;

  // ---- piso: asfalto, faixas, sarjeta, meio-fio, calçadas, cais e rio
  RM.floors.orla = function (B, def, L, pal, ctx) {
    var rnd = U.rng(Math.round(L * 7 + 3)), z;
    K.det(B, 1, function () {
      for (z = 0; z < L; z += 6) {
        var zl = Math.min(6, L - z);
        for (var xs = -1; xs <= 1; xs++) B.w.floor(xs * R * 2 / 3, 0, -(z + zl / 2), R * 2 / 3, zl, shade(C.asphalt, 0.96 + rnd() * 0.08));
      }
    });
    // marcas de pneu: faixas um pouco mais escuras onde os carros passam
    [-3.0, -1.4, 1.4, 3.0].forEach(function (x) { B.w.floor(x, 0.006, -L / 2, 0.75, L, shade(C.asphalt, 0.9)); });
    // faixas: tracejada no meio, contínuas nas bordas
    for (z = 2; z < L - 2; z += 7.5) B.w.floor(0, 0.012, -(z + 1.6), 0.14, 3.2, C.line);
    [-1, 1].forEach(function (s) {
      B.w.floor(s * (R - 0.55), 0.012, -L / 2, 0.12, L, shade(C.line, 0.96));
      K.det(B, 4, function () {
        B.w.floor(s * (R - 0.2), 0.008, -L / 2, 0.4, L, C.gutter);                     // sarjeta
        B.w.box(s * (R + 0.11), 0, -L / 2, 0.22, SW + 0.02, L, C.curb);                  // meio-fio
      });
    });
    // calçadão (esquerda) e calçada (direita) em placas
    K.det(B, 2, function () {
      var lw = -LEFT_EDGE - R - 0.22, rw = RIGHT_EDGE - R - 0.22;
      B.w.box(-(R + 0.22 + lw / 2), 0, -L / 2, lw, SW, L, C.promenade);
      B.w.box(R + 0.22 + rw / 2, 0, -L / 2, rw, SW, L, C.sidewalk);
    });
    // atrás dos prédios
    B.w.floor(RIGHT_EDGE + 40, 0.02, -L / 2, 80, L, C.lot);
    // cais: capa de pedra, muro até a água e o rio
    K.det(B, 4, function () {
      B.w.box(LEFT_EDGE - 0.35, 0, -L / 2, 0.7, 0.36, L, C.coping);
      B.w.box(LEFT_EDGE - 0.6, -1.6, -L / 2, 0.5, 1.62, L, C.wall);
    });
    B.water.floor(LEFT_EDGE - 150, -1.2, -L / 2, 299, L, C.water);
    B.water.floor(LEFT_EDGE - 3, -1.19, -L / 2, 4.2, L, shade(C.water, 0.8));            // sombra do muro na água
    // pontas do rio: muros de pedra fecham o canal (o trecho vizinho começa em terra)
    K.det(B, 4, function () {
      [0.3, L - 0.3].forEach(function (zz) { B.w.box(LEFT_EDGE - 150, -1.6, -zz, 299, 1.63, 0.6, C.wall); });
    });
    // guarda-corpo de ferro sobre o cais
    var gx = LEFT_EDGE - 0.2;
    for (z = 0; z < L; z += 2.4) B.w.box(gx, 0.36, -z, 0.08, 1.02, 0.08, K.IRON);
    B.w.box(gx, 1.33, -L / 2, 0.07, 0.06, L, K.IRON);
    B.w.box(gx, 0.48, -L / 2, 0.05, 0.04, L, K.IRON);
    for (z = 0.15; z < L; z += 0.24) B.w.quad(gx + 0.02, 0.91, -z, 0.026, 0.83, '#323741', Math.PI / 2);
    ctx.outer = RIGHT_EDGE; ctx.curbX = R + 0.55; ctx.innerX = RIGHT_EDGE - 0.6; ctx.treeX = R + 1.6; ctx.propY = SW;
    return RIGHT_EDGE;
  };

  // ---- canteiros, árvores, postes, bancos, prédios e o rio com ponte
  RM.extras.orla = function (B, def, L, pal, rnd, ctx) {
    var z, i, T = K.TREES, P = K.PROPS;
    // ESQUERDA: canteiros elevados com flores, grama e uma árvore no meio
    var bedX = -(R + 2.2), bedW = 2.4, bedL = 10, gap = 4, n = 0;
    for (z = 2; z + bedL < L - 1; z += bedL + gap, n++) {
      var zc = -(z + bedL / 2);
      K.det(B, 4, function () { B.w.box(bedX, SW, zc, bedW, 0.25, bedL, C.bedEdge); });
      B.w.floor(bedX, SW + 0.26, zc, bedW - 0.24, bedL - 0.24, C.soil);
      K.grass(B, bedX, SW + 0.25, zc, bedW - 0.3, bedL - 0.5, 22, rnd, '#7fae58');
      K.flowers(B, bedX - 0.45, SW + 0.25, zc, 0.9, bedL - 1.0, 15, rnd);
      K.flowers(B, bedX + 0.55, SW + 0.25, zc, 0.8, bedL - 1.2, 11, rnd);
      if (n % 2) K.bush(B, bedX, SW + 0.25, zc + bedL * 0.32, 0.42, U.pick(pal.leaves, rnd), rnd);
      B.frame(bedX + 0.1, SW + 0.3, zc, rnd() * 6);
      var tr = (n % 3 === 2 ? T.florida : T.copa)(B, rnd, pal, 1.05);
      B.noFrame();
      B.shadow.dapple(bedX + 0.6, SW + 0.02, zc + tr.h * 0.5, tr.r * 1.4, tr.r * 2.0, rnd() * 6);
      B.shadow.dapple(bedX + 3.6, 0.012, zc + tr.h * 0.6, tr.r * 1.5, tr.r * 2.2, rnd() * 6);
    }
    // postes com faixas perto do meio-fio; no cais, postes, bancos e vasos
    for (z = 8; z < L; z += 20) {
      B.frame(-(R + 0.75), SW, -z, 0); P.poste(B, rnd, pal, { banners: true }); B.noFrame();
    }
    for (z = 4; z < L - 2; z += 13) {
      B.frame(LEFT_EDGE + 1.0, SW, -z, -Math.PI / 2); P.banco(B, rnd, pal); B.noFrame();
      if (rnd() < 0.5) { B.frame(LEFT_EDGE + 0.8, SW, -(z + 1.7), 0); P.lixeira(B, rnd, pal); B.noFrame(); }
      else { B.frame(LEFT_EDGE + 0.9, SW, -(z - 2.2), 0); P.vaso(B, rnd, pal); B.noFrame(); }
    }
    for (z = 14; z < L; z += 20) { B.frame(LEFT_EDGE + 0.45, SW, -z, 0); P.poste(B, rnd, pal); B.noFrame(); }

    // DIREITA: prédios com cafés no térreo
    var x = 0, styles = ['classico', 'classico', 'colorido', 'classico', 'moderno'];
    for (z = 0.5; z < L - 6;) {
      var w = 10 + Math.round(rnd() * 4), st = U.pick(styles, rnd), floors = 4 + Math.floor(rnd() * 3);
      if (z + w > L - 0.5) w = L - 0.5 - z;
      if (w < 7) break;
      B.frame(RIGHT_EDGE, SW, -(z + w / 2), -Math.PI / 2);
      var shop = rnd() < 0.6;
      K.building(B, rnd, pal, { w: w, floors: floors, style: st, shop: shop });
      if (shop && rnd() < 0.8) K.cafeTables(B, w, rnd, pal);
      B.noFrame();
      z += w + 0.05;
    }
    // árvores em covas, vasos e postes com faixas na calçada da direita
    for (z = 4; z < L - 2; z += 16) {
      var tx = R + 1.7;
      K.det(B, 4, function () { B.w.floor(tx, SW + 0.004, -z, 1.5, 1.5, C.pit); });
      B.frame(tx, SW, -z, rnd() * 6);
      var t2 = (rnd() < 0.7 ? T.copa : T.alta)(B, rnd, pal, 0.95);
      B.noFrame();
      B.shadow.dapple(tx + 0.6, SW + 0.02, -z + t2.h * 0.55, t2.r * 1.4, t2.r * 2, rnd() * 6);
      B.shadow.dapple(tx - 1.6, 0.012, -z + t2.h * 0.6, t2.r * 1.0, t2.r * 1.5, rnd() * 6);
      K.grass(B, tx, SW, -z, 1.2, 1.2, 4, rnd, '#86b35c');
    }
    for (z = 12; z < L - 2; z += 16) {
      B.frame(R + 0.85, SW, -z, Math.PI); P.poste(B, rnd, pal, { banners: true, flip: true }); B.noFrame();
      B.frame(R + 1.2, SW, -(z + 4), 0); P[rnd() < 0.5 ? 'vaso' : 'balizador'](B, rnd, pal); B.noFrame();
    }
    // um pouco de folhas caídas no asfalto e no calçadão
    K.fallenLeaves(B, -2.6, -L / 2, 3.2, L, 40, rnd);
    K.fallenLeaves(B, 2.8, -L / 2, 2.6, L, 28, rnd);

    // RIO: veleiros e, às vezes, uma ponte em arcos lá adiante
    for (i = 0; i < 3; i++) {
      var bx = LEFT_EDGE - 30 - rnd() * 90, bz = -rnd() * L;
      B.w.add('sph16', bx, -1.05, bz, 1.4, 0.5, 4.2, '#f6f4ef');
      B.w.add('cyl8', bx, 2.4, bz + 0.3, 0.08, 6.6, 0.08, '#d8d2c6');
      B.w.add('prism', bx, 3.2, bz + 0.1, 0.06, 5.6, 2.8, '#ffffff', Math.PI / 2);
    }
    if (rnd() < 0.55) {
      var bzc = -(L * 0.62), x0 = LEFT_EDGE - 38, deck = 6.2, stone = '#cbbfa9';
      K.det(B, 4, function () {
        for (var sp = 0; sp < 5; sp++) {
          var ax = x0 - 4 - sp * 34;
          B.w.box(ax, -1.3, bzc, 4, deck + 1.3, 9, stone);                               // pilar
          for (var a = 0; a < 9; a++) {                                                 // arco
            var t0 = a / 9, ang = Math.PI * (t0 + 0.5 / 9), cxa = ax - 17 + Math.cos(ang) * 15, cya = deck - 5.5 + Math.sin(ang) * 4.8;
            B.w.add('box', cxa, cya, bzc, 5.4, 1.1, 9, shade(stone, 0.96), 0, 0, ang - Math.PI / 2);
          }
        }
        B.w.box(x0 - 85, deck, bzc, 175, 0.9, 9.4, shade(stone, 1.03));
        B.w.box(x0 - 85, deck + 0.9, bzc + 4.4, 175, 0.9, 0.4, stone);
        B.w.box(x0 - 85, deck + 0.9, bzc - 4.4, 175, 0.9, 0.4, stone);
      });
      for (var lp = 0; lp < 6; lp++) { B.frame(x0 - 10 - lp * 30, deck + 1.8, bzc + 4.4, 0); P.poste(B, rnd, pal); B.noFrame(); }
    }
  };
})(window.EP);
