// Assets — as peças da cidade, desenhadas com formas simples (GDD §59, §81):
// 5 prédios modulares, 5 árvores e 5 objetos urbanos. Estilo "stylized":
// formas limpas, cores agradáveis, nada de textura.
//
// Convenção: cada peça é desenhada no referencial local com a frente virada
// para +z (a rua), base em y = 0. Prédios ocupam x de -w/2 a w/2 e vão de
// z = 0 (fachada) para trás. O gerador posiciona e gira.
(function (EP) {
  'use strict';
  var U = EP.util;
  var shade = function (c, f) { return EP.GeoBuilder.shade(c, f); };
  var WIN = '#ffd98a', WIN_COOL = '#cfe8ff', DOOR = '#6f4a32', DARK = '#3a3f4a';

  // janelas em grade na fachada (z = 0) e, se pedido, nas laterais
  var TRIM = '#f4f1ea';
  // janela com moldura, peitoril e vidro (que acende à noite); detalhes tiram a cara de bloco
  function win(B, x, y, z, ww, wh, glass, trim, extra) {
    B.w.box(x, y - wh / 2 - 0.08, z + 0.02, ww + 0.22, wh + 0.2, 0.08, trim);           // moldura
    B.w.box(x, y - wh / 2 - 0.16, z + 0.09, ww + 0.34, 0.08, 0.2, trim);                // peitoril
    B.g.quad(x, y, z + 0.075, ww, wh, glass);
    B.w.box(x, y - wh / 2, z + 0.07, 0.05, wh, 0.03, trim);                             // divisória
    if (extra && extra.shutter) {                                                         // venezianas
      B.w.box(x - ww / 2 - 0.25, y - wh / 2, z + 0.06, 0.3, wh, 0.05, extra.shutter);
      B.w.box(x + ww / 2 + 0.25, y - wh / 2, z + 0.06, 0.3, wh, 0.05, extra.shutter);
    }
    if (extra && extra.flowers) {                                                         // floreira
      B.w.box(x, y - wh / 2 - 0.42, z + 0.2, ww + 0.1, 0.26, 0.26, extra.box || '#9c6b4a');
      for (var k = 0; k < 4; k++) B.w.add('icoT', x - ww / 2 + (k + 0.5) * ww / 4, y - wh / 2 - 0.14, z + 0.22, 0.26, 0.22, 0.26, k % 2 ? extra.flowers : '#5aa857');
    }
  }
  function windows(B, w, d, floors, fh, y0, ww, wh, sides, c, trim, extra, rnd) {
    var cols = Math.max(1, Math.floor(w / 2.5)), step = w / cols;
    var colsD = Math.max(1, Math.floor(d / 2.8)), stepD = d / colsD;
    for (var f = 0; f < floors; f++) {
      var y = y0 + f * fh + fh * 0.5;
      for (var i = 0; i < cols; i++) win(B, -w / 2 + step * (i + 0.5), y, 0, ww, wh, c, trim || TRIM, extra && rnd && rnd() < 0.5 ? extra : null);
      if (f > 0) B.w.box(0, y0 + f * fh - 0.1, 0.05, w + 0.1, 0.14, 0.12, trim || TRIM);   // friso entre andares
      if (sides) {
        for (var j = 0; j < colsD; j++) {
          var z = -stepD * (j + 0.5);
          B.g.quad(w / 2 + 0.04, y, z, ww, wh, c, Math.PI / 2);
          B.g.quad(-w / 2 - 0.04, y, z, ww, wh, c, -Math.PI / 2);
        }
      }
    }
  }
  // fileira de arbustos redondos (cerca viva) em vez de um muro verde
  function hedge(B, x0, x1, z, leaf, rnd) {
    for (var x = x0; x <= x1; x += 0.95) B.w.add('icoS', x, 0.45, z, 1.0, 0.85, 0.8, shade(leaf, 0.85 + rnd() * 0.25), rnd() * 6);
  }

  var buildings = {
    casa: {
      size: function (rnd) { return 7 + rnd() * 2; },
      draw: function (B, rnd, pal, w) {
        var d = 7.5, h = 3.3, facade = U.pick(pal.facades, rnd), roof = U.pick(pal.roofs, rnd);
        B.w.box(0, 0, -d / 2, w, h, d, facade);
        B.w.add('prism', 0, h, -d / 2, w + 0.7, 1.9, d + 0.9, roof);
        B.w.box(0, 0, -d / 2, w + 0.2, 0.35, d + 0.2, shade(facade, 0.8));   // rodapé
        var door = rnd() < 0.5 ? -1 : 1;
        B.w.box(door * w * 0.22, 0, 0.03, 1.25, 2.35, 0.1, TRIM);                    // batente
        B.w.box(door * w * 0.22, 0, 0.06, 1.0, 2.2, 0.1, DOOR);
        B.w.box(door * w * 0.22, 0, 0.55, 1.6, 0.18, 0.9, shade(facade, 0.7));          // degrau
        var flo = U.pick(pal.blossom, rnd), shut = rnd() < 0.5 ? shade(roof, 1.1) : null;
        win(B, -door * w * 0.2, 1.75, 0, 1.5, 1.1, WIN, TRIM, { shutter: shut, flowers: flo });
        win(B, door * w * 0.22 + door * 1.55, 1.8, 0, 0.8, 0.9, WIN, TRIM, null);
        B.w.box(0, h - 0.18, -d / 2, w + 0.3, 0.2, d + 0.3, TRIM);                      // beiral
        if (rnd() < 0.5) B.w.box(w * 0.28 * -door, h + 0.4, -d * 0.35, 0.6, 1.6, 0.6, shade(roof, 0.8));   // chaminé
        if (rnd() < 0.7) { if (door > 0) hedge(B, -w / 2 + 0.4, w * 0.22 - 1.1, 1.1, U.pick(pal.leaves, rnd), rnd); else hedge(B, -w * 0.22 + 1.1, w / 2 - 0.4, 1.1, U.pick(pal.leaves, rnd), rnd); }
        B.shadow.blob(0, 0.04, 0.6, w * 0.6, 1.6);
      }
    },
    sobrado: {
      size: function (rnd) { return 6.5 + rnd() * 2; },
      draw: function (B, rnd, pal, w) {
        var d = 8, fh = 3.1, h = fh * 2 + 0.3, facade = U.pick(pal.facades, rnd);
        B.w.box(0, 0, -d / 2, w, h, d, facade);
        if (rnd() < 0.5) B.w.add('prism', 0, h, -d / 2, w + 0.5, 1.6, d + 0.6, U.pick(pal.roofs, rnd));
        else B.w.box(0, h, -d / 2, w + 0.3, 0.45, d + 0.3, shade(facade, 0.85));
        B.w.box(-w * 0.25, 0, 0.03, 1.25, 2.45, 0.1, TRIM);
        B.w.box(-w * 0.25, 0, 0.06, 1.0, 2.3, 0.1, DOOR);
        win(B, w * 0.2, 1.7, 0, 1.6, 1.2, WIN, TRIM, { flowers: U.pick(pal.blossom, rnd) });
        windows(B, w, d, 1, fh, fh, 1.2, 1.4, false, WIN, TRIM);
        B.w.box(0, fh - 0.05, 0.05, w + 0.1, 0.16, 0.14, TRIM);                          // friso
        // sacada com grade de balaústres
        var bw = w * 0.7;
        B.w.box(0, fh + 0.02, 0.6, bw, 0.14, 1.2, shade(facade, 0.8));
        B.w.box(0, fh + 0.92, 1.17, bw, 0.07, 0.07, '#f2f4f6');
        for (var bx = -bw / 2 + 0.1; bx <= bw / 2; bx += 0.22) B.w.add('cyl6', bx, fh + 0.55, 1.17, 0.04, 0.75, 0.04, '#f2f4f6');
        if (rnd() < 0.6) B.w.add('icoT', bw / 2 - 0.35, fh + 0.42, 0.9, 0.55, 0.5, 0.55, U.pick(pal.leaves, rnd));
      }
    },
    'predio-baixo': {
      size: function (rnd) { return 10 + rnd() * 4; },
      draw: function (B, rnd, pal, w) {
        var floors = 3 + Math.floor(rnd() * 3), fh = 3.1, d = 11, h = floors * fh + 0.6;
        var facade = U.pick(rnd() < 0.5 ? pal.facades : pal.towers, rnd);
        B.w.box(0, 0, -d / 2, w, h, d, facade);
        B.w.box(0, 0, -d / 2 + 0.15, w + 0.2, 3.2, d, shade(facade, 0.72));        // térreo
        B.g.quad(0, 1.55, 0.2, w * 0.72, 2.1, WIN);                                  // vitrine
        windows(B, w, d, floors - 1, fh, 3.2, 1.25, 1.5, true, WIN, TRIM, { flowers: U.pick(pal.blossom, rnd) }, rnd);
        B.w.box(0, 3.2, 0.12, w + 0.3, 0.2, 0.25, TRIM);                               // marquise
        B.w.box(0, h, -d / 2, w + 0.35, 0.45, d + 0.35, shade(facade, 0.82));       // platibanda
        B.w.box(0, h + 0.45, -d / 2, w + 0.5, 0.12, d + 0.5, TRIM);
        if (rnd() < 0.6) B.w.add('cyl8', w * 0.2, h + 1.2, -d * 0.6, 1.8, 1.8, 1.8, '#d9dde3');   // caixa d'água
        if (rnd() < 0.5) {
          B.w.add('box', 0, 3.0, 0.9, w * 0.8, 0.12, 1.9, U.pick(pal.awnings, rnd), 0, 0.25);    // toldo
        }
      }
    },
    'predio-alto': {
      size: function (rnd) { return 12 + rnd() * 3.5; },
      draw: function (B, rnd, pal, w) {
        var floors = 8 + Math.floor(rnd() * 7), fh = 3.2, d = 13, h = floors * fh + 1;
        var facade = U.pick(pal.towers, rnd), glass = rnd() < 0.5 ? WIN : WIN_COOL;
        B.w.box(0, 0, -d / 2, w, h, d, facade);
        B.w.box(0, 0, -d / 2 + 0.2, w + 0.3, 4.2, d, shade(facade, 0.7));            // térreo
        B.g.quad(0, 2.0, 0.2, w * 0.6, 3.0, WIN);
        // faixas de janelas por andar (fachada e laterais)
        for (var f = 1; f < floors; f++) {
          var y = 4.2 + (f - 1) * fh + fh * 0.55;
          B.g.quad(0, y, 0.04, w * 0.84, 1.35, glass);
          B.w.box(0, y - 0.95, 0.06, w * 0.9, 0.16, 0.14, shade(facade, 1.12));        // laje aparente
          for (var mx = -w * 0.42; mx <= w * 0.42 + 0.01; mx += w * 0.84 / 5) B.w.box(mx, y - 0.68, 0.07, 0.1, 1.36, 0.06, shade(facade, 0.9));
          B.g.quad(w / 2 + 0.04, y, -d / 2, d * 0.84, 1.35, glass, Math.PI / 2);
          B.g.quad(-w / 2 - 0.04, y, -d / 2, d * 0.84, 1.35, glass, -Math.PI / 2);
        }
        B.w.box(0, h, -d / 2, w * 0.7, 2.2, d * 0.7, shade(facade, 0.85));          // coroa
        if (rnd() < 0.5) B.w.add('cyl6', w * 0.25, h + 4, -d / 2, 0.15, 5, 0.15, '#c9ced6');   // antena
      }
    },
    loja: {
      size: function (rnd) { return 6 + rnd() * 2.5; },
      draw: function (B, rnd, pal, w) {
        var two = rnd() < 0.5, d = 8, h = two ? 6.8 : 4.4, facade = U.pick(pal.facades, rnd), aw = U.pick(pal.awnings, rnd);
        B.w.box(0, 0, -d / 2, w, h, d, facade);
        B.w.box(0, h, -d / 2, w + 0.2, 0.4, d + 0.2, shade(facade, 0.8));
        B.w.box(-w * 0.12, 0.25, 0.02, w * 0.62 + 0.24, 2.3, 0.08, TRIM);               // moldura da vitrine
        B.g.quad(-w * 0.12, 1.4, 0.075, w * 0.62, 2.0, WIN);                           // vitrine
        B.w.box(-w * 0.12, 0, 0.35, w * 0.62, 0.35, 0.4, shade(facade, 0.7));            // floreira
        for (var fk = 0; fk < 5; fk++) B.w.add('icoT', -w * 0.12 - w * 0.25 + fk * w * 0.125, 0.45, 0.35, 0.34, 0.3, 0.34, fk % 2 ? U.pick(pal.blossom, rnd) : '#5aa857');
        B.w.box(w * 0.34, 0, 0.03, 0.95, 2.2, 0.12, DARK);
        B.w.add('box', 0, 3.05, 0.75, w + 0.1, 0.12, 1.6, aw, 0, 0.3);                // toldo
        B.w.box(0, 3.5, 0.08, w * 0.8, 0.7, 0.16, shade(aw, 0.9));                     // letreiro
        B.g.quad(0, 3.85, 0.18, w * 0.6, 0.3, '#fff6d8');
        if (two) windows(B, w, d, 1, 2.4, 4.4, 1.1, 1.2, false, WIN);
      }
    }
  };

  // copa redonda e lisa: várias bolas com sombreado suave (nada de facetas)
  function canopy(B, cx, cy, cz, r, leaf, rnd, n) {
    B.w.add('icoS', cx, cy, cz, r * 2, r * 1.75, r * 2, leaf, rnd() * 6);
    for (var i = 0; i < n; i++) {
      var a = i / n * Math.PI * 2 + rnd(), d = r * (0.55 + rnd() * 0.25), rr = r * (0.48 + rnd() * 0.22);
      B.w.add('icoT', cx + Math.cos(a) * d, cy + (rnd() - 0.2) * r * 0.55, cz + Math.sin(a) * d, rr * 2, rr * 1.8, rr * 2,
        shade(leaf, 0.86 + rnd() * 0.3), rnd() * 6);
    }
    B.w.add('icoT', cx + (rnd() - 0.5) * r * 0.4, cy + r * 0.62, cz + (rnd() - 0.5) * r * 0.4, r * 1.1, r * 0.9, r * 1.1, shade(leaf, 1.18), rnd() * 6);
  }
  function trunk(B, h, rBase, color, lean) {
    B.w.add('taper10', 0, h / 2, 0, rBase * 2, h, rBase * 2, color, 0, 0, lean || 0);
    B.w.add('icoS', 0, 0.08, 0, rBase * 3.2, 0.25, rBase * 3.2, shade(color, 0.85));   // raiz
  }

  var trees = {
    redonda: function (B, rnd, pal) {
      var s = 0.85 + rnd() * 0.4, leaf = U.pick(pal.leaves, rnd);
      trunk(B, 2.3 * s, 0.17 * s, pal.trunk);
      B.w.add('cyl8', 0.35 * s, 2.1 * s, 0, 0.12 * s, 1.0 * s, 0.12 * s, pal.trunk, 0, 0, -0.7);
      B.w.add('cyl8', -0.3 * s, 2.2 * s, 0.1, 0.11 * s, 0.9 * s, 0.11 * s, pal.trunk, 0, 0, 0.75);
      canopy(B, 0, 3.0 * s, 0, 1.45 * s, leaf, rnd, 4);
    },
    pinheiro: function (B, rnd, pal) {
      var s = 0.85 + rnd() * 0.5, leaf = shade(U.pick(pal.leaves, rnd), 0.78);
      trunk(B, 1.4 * s, 0.15 * s, pal.trunk);
      var layers = [[1.6, 2.8, 2.2], [2.5, 2.3, 1.9], [3.35, 1.8, 1.6], [4.1, 1.25, 1.3]];
      layers.forEach(function (l, i) {
        B.w.add('cone12', 0, l[0] * s + l[2] * s / 2 - 0.3 * s, 0, l[1] * s, l[2] * s, l[1] * s, shade(leaf, 0.92 + i * 0.07), rnd() * 6);
      });
    },
    palmeira: function (B, rnd, pal) {
      var s = 0.9 + rnd() * 0.35, lean = (rnd() - 0.5) * 0.3, x = 0, y = 0, n = 6, seg = 1.05 * s;
      for (var i = 0; i < n; i++) {
        var bend = lean * (1 + i * 0.15);
        B.w.add('taper10', x, y + seg / 2, 0, (0.3 - i * 0.022) * s, seg * 1.04, (0.3 - i * 0.022) * s, shade(pal.trunk, 1.15 + (i % 2) * 0.1), 0, 0, -bend);
        x += Math.sin(bend) * seg; y += Math.cos(bend) * seg;
      }
      var leaf = U.pick(pal.leaves, rnd);
      for (var k = 0; k < 8; k++) {
        var a = k / 8 * Math.PI * 2 + rnd() * 0.3, ca = Math.cos(a), sa = Math.sin(a), c = shade(leaf, 0.85 + rnd() * 0.3);
        // folha em dois trechos: sobe e depois cai (arco)
        B.w.add('icoT', x + ca * 0.75 * s, y + 0.3 * s, sa * 0.75 * s, 1.8 * s, 0.14 * s, 0.55 * s, c, -a, 0, 0.35);
        B.w.add('icoT', x + ca * 1.85 * s, y - 0.15 * s, sa * 1.85 * s, 1.7 * s, 0.1 * s, 0.45 * s, shade(c, 0.92), -a, 0, -0.55);
      }
      B.w.add('icoS', x, y + 0.05, 0, 0.55 * s, 0.45 * s, 0.55 * s, shade(pal.trunk, 0.8));
      for (var c2 = 0; c2 < 3; c2++) B.w.add('icoT', x + Math.cos(c2 * 2.1) * 0.22, y - 0.15, Math.sin(c2 * 2.1) * 0.22, 0.22, 0.24, 0.22, '#8a6a2e');
    },
    arbusto: function (B, rnd, pal) {
      var s = 0.8 + rnd() * 0.5, leaf = U.pick(pal.leaves, rnd);
      B.w.add('icoS', 0, 0.5 * s, 0, 1.5 * s, 1.0 * s, 1.5 * s, leaf, rnd() * 6);
      B.w.add('icoS', 0.55 * s, 0.4 * s, 0.25 * s, 1.0 * s, 0.75 * s, 1.0 * s, shade(leaf, 1.1), rnd() * 6);
      B.w.add('icoS', -0.5 * s, 0.38 * s, -0.2 * s, 0.9 * s, 0.7 * s, 0.9 * s, shade(leaf, 0.9), rnd() * 6);
      if (rnd() < 0.6) {
        var f = U.pick(pal.blossom, rnd);
        for (var k = 0; k < 5; k++) B.w.add('icoT', (rnd() - 0.5) * 1.2 * s, (0.7 + rnd() * 0.3) * s, (rnd() - 0.5) * 1.0 * s, 0.22, 0.2, 0.22, f);
      }
    },
    florida: function (B, rnd, pal) {   // ipê
      var s = 0.85 + rnd() * 0.35, bloom = U.pick(pal.blossom, rnd);
      trunk(B, 2.4 * s, 0.16 * s, pal.trunk, 0.06);
      B.w.add('cyl8', 0.4 * s, 2.2 * s, 0, 0.1 * s, 1.1 * s, 0.1 * s, pal.trunk, 0, 0, -0.8);
      canopy(B, 0.1 * s, 3.1 * s, 0, 1.5 * s, bloom, rnd, 5);
    }
  };

  // objetos urbanos: frente para +z (a rua). "curb" = vai perto do meio-fio
  var props = {
    poste: {
      curb: true,
      draw: function (B, rnd, pal) {
        B.w.add('taper10', 0, 2.8, 0, 0.13, 5.6, 0.13, pal.metal);
        B.w.add('cyl10', 0, 0.3, 0, 0.26, 0.6, 0.26, pal.metal);
        B.w.add('cyl8', 0, 5.5, 0.7, 0.08, 1.45, 0.08, pal.metal, 0, Math.PI / 2 - 0.12);
        B.w.add('icoS', 0, 5.3, 1.42, 0.5, 0.26, 0.62, pal.metal);
        B.g.add('icoS', 0, 5.2, 1.42, 0.34, 0.12, 0.44, '#fff1c2');
        B.shadow.blob(0, 0.005, 0, 0.35, 0.35);
        B.light.blob(0, -0.1, 1.6, 3.4, 3.4);   // poça de luz na calçada e na rua (só à noite)
      }
    },
    banco: {
      draw: function (B, rnd, pal) {
        B.w.box(0, 0.42, 0, 1.8, 0.08, 0.5, pal.wood);
        B.w.box(0, 0.55, -0.24, 1.8, 0.42, 0.07, pal.wood);
        B.w.box(-0.75, 0, 0, 0.08, 0.42, 0.45, DARK);
        B.w.box(0.75, 0, 0, 0.08, 0.42, 0.45, DARK);
      }
    },
    lixeira: {
      draw: function (B, rnd, pal) {
        var c = rnd() < 0.5 ? '#2e9e5b' : '#f08a24';
        B.w.add('cyl8', 0, 0.45, 0, 0.5, 0.9, 0.5, c);
        B.w.add('cyl8', 0, 0.93, 0, 0.56, 0.08, 0.56, shade(c, 0.7));
      }
    },
    placa: {
      curb: true,
      draw: function (B, rnd, pal) {
        var c = U.pick(['#2d7dd2', '#2e9e5b', '#f08a24'], rnd);
        B.w.add('cyl6', 0, 1.3, 0, 0.08, 2.6, 0.08, pal.metal);
        B.w.box(0, 2.2, 0.05, 1.1, 0.65, 0.06, c);
        B.w.box(0, 2.42, 0.09, 0.8, 0.08, 0.02, '#ffffff');
        B.w.box(0, 2.28, 0.09, 0.6, 0.06, 0.02, '#ffffff');
      }
    },
    hidrante: {
      curb: true,
      draw: function (B, rnd, pal) {
        B.w.add('cyl8', 0, 0.35, 0, 0.3, 0.7, 0.3, '#e63946');
        B.w.add('ico', 0, 0.74, 0, 0.32, 0.24, 0.32, '#e63946');
        B.w.add('cyl6', 0, 0.45, 0, 0.5, 0.1, 0.1, '#c92c3a', 0, 0, Math.PI / 2);
      }
    }
  };

  // peças das partes especiais
  var pieces = {
    fountain: function (B, pal) {
      B.w.add('cyl12', 0, 0.3, 0, 6.4, 0.6, 6.4, pal.stone);
      B.water.add('disc', 0, 0.56, 0, 5.8, 1, 5.8, pal.water);
      B.w.add('cyl8', 0, 0.9, 0, 0.9, 1.6, 0.9, shade(pal.stone, 1.1));
      B.w.add('cyl12', 0, 1.75, 0, 2.4, 0.3, 2.4, pal.stone);
      B.water.add('disc', 0, 1.91, 0, 2.1, 1, 2.1, pal.water);
      B.water.add('cone8', 0, 2.6, 0, 0.5, 1.4, 0.5, shade(pal.water, 1.35));
    },
    duck: function (B, rnd) {
      var c = rnd() < 0.5 ? '#ffffff' : '#ffd23f';
      B.w.box(0, 0.05, 0, 0.42, 0.24, 0.6, c);
      B.w.add('ico', 0, 0.42, 0.24, 0.24, 0.24, 0.24, c);
      B.w.box(0, 0.38, 0.38, 0.1, 0.06, 0.14, '#ff8c1a');
    },
    boat: function (B, rnd) {
      var c = U.pick(['#ff6a3d', '#2fb5ff', '#ffffff'], rnd);
      B.w.box(0, -0.1, 0, 1.6, 0.5, 4.2, c);
      B.w.box(0, 0.4, 0, 1.4, 0.06, 4.0, '#c8a27a');
      B.w.add('cyl6', 0, 2.4, 0.2, 0.1, 4, 0.1, '#e9e9e9');
      B.w.add('prism', 0, 0.8, 0.9, 0.06, 3.2, 1.6, '#ffffff');
    },
    hoop: function (B) {
      B.w.add('cyl6', 0, 1.6, 0, 0.14, 3.2, 0.14, '#5d6470');
      B.w.box(0, 2.9, 0.4, 1.8, 1.1, 0.08, '#ffffff');
      B.w.box(0, 2.85, 0.75, 0.5, 0.05, 0.5, '#ff6a00');
    }
  };

  EP.Assets = { buildings: buildings, trees: trees, props: props, pieces: pieces, windows: windows, win: win, hedge: hedge, canopy: canopy, trunk: trunk };
})(window.EP);
