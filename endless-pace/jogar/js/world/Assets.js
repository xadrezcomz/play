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
  function windows(B, w, d, floors, fh, y0, ww, wh, sides, c) {
    var cols = Math.max(1, Math.floor(w / 2.5)), step = w / cols;
    var colsD = Math.max(1, Math.floor(d / 2.8)), stepD = d / colsD;
    for (var f = 0; f < floors; f++) {
      var y = y0 + f * fh + fh * 0.5;
      for (var i = 0; i < cols; i++) B.g.quad(-w / 2 + step * (i + 0.5), y, 0.04, ww, wh, c);
      if (sides) {
        for (var j = 0; j < colsD; j++) {
          var z = -stepD * (j + 0.5);
          B.g.quad(w / 2 + 0.04, y, z, ww, wh, c, Math.PI / 2);
          B.g.quad(-w / 2 - 0.04, y, z, ww, wh, c, -Math.PI / 2);
        }
      }
    }
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
        B.w.box(door * w * 0.22, 0, 0.03, 1.0, 2.1, 0.12, DOOR);
        B.g.quad(-door * w * 0.2, 1.75, 0.04, 1.5, 1.1, WIN);
        B.g.quad(door * w * 0.22 + door * 1.5, 1.75, 0.04, 0.9, 1.0, WIN);
        if (rnd() < 0.5) B.w.box(w * 0.28 * -door, h + 0.4, -d * 0.35, 0.6, 1.6, 0.6, shade(roof, 0.8));   // chaminé
        if (rnd() < 0.7) B.w.box(0, 0, 1.1, w, 0.75, 0.55, U.pick(pal.leaves, rnd));                       // cerca viva
      }
    },
    sobrado: {
      size: function (rnd) { return 6.5 + rnd() * 2; },
      draw: function (B, rnd, pal, w) {
        var d = 8, fh = 3.1, h = fh * 2 + 0.3, facade = U.pick(pal.facades, rnd);
        B.w.box(0, 0, -d / 2, w, h, d, facade);
        if (rnd() < 0.5) B.w.add('prism', 0, h, -d / 2, w + 0.5, 1.6, d + 0.6, U.pick(pal.roofs, rnd));
        else B.w.box(0, h, -d / 2, w + 0.3, 0.45, d + 0.3, shade(facade, 0.85));
        B.w.box(-w * 0.25, 0, 0.03, 1.0, 2.2, 0.12, DOOR);
        B.g.quad(w * 0.2, 1.7, 0.04, 1.6, 1.2, WIN);
        windows(B, w, d, 1, fh, fh, 1.2, 1.4, false, WIN);
        // sacada
        B.w.box(0, fh + 0.05, 0.6, w * 0.7, 0.15, 1.2, shade(facade, 0.75));
        B.w.box(0, fh + 0.2, 1.15, w * 0.7, 0.8, 0.08, '#e9eef2');
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
        windows(B, w, d, floors - 1, fh, 3.2, 1.25, 1.5, true, WIN);
        B.w.box(0, h, -d / 2, w + 0.35, 0.45, d + 0.35, shade(facade, 0.82));       // platibanda
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
        B.g.quad(-w * 0.12, 1.4, 0.04, w * 0.62, 2.0, WIN);                           // vitrine
        B.w.box(w * 0.34, 0, 0.03, 0.95, 2.2, 0.12, DARK);
        B.w.add('box', 0, 3.05, 0.75, w + 0.1, 0.12, 1.6, aw, 0, 0.3);                // toldo
        B.w.box(0, 3.5, 0.08, w * 0.8, 0.7, 0.16, shade(aw, 0.9));                     // letreiro
        B.g.quad(0, 3.85, 0.18, w * 0.6, 0.3, '#fff6d8');
        if (two) windows(B, w, d, 1, 2.4, 4.4, 1.1, 1.2, false, WIN);
      }
    }
  };

  var trees = {
    redonda: function (B, rnd, pal) {
      var s = 0.85 + rnd() * 0.4, leaf = U.pick(pal.leaves, rnd);
      B.w.add('cyl6', 0, 0.9 * s, 0, 0.32 * s, 1.8 * s, 0.32 * s, pal.trunk);
      B.w.add('ico', 0, 2.7 * s, 0, 2.8 * s, 2.4 * s, 2.8 * s, leaf, rnd() * 3);
      B.w.add('ico', 0.55 * s, 3.3 * s, 0.25 * s, 1.9 * s, 1.7 * s, 1.9 * s, shade(leaf, 1.1), rnd() * 3);
      B.w.add('ico', -0.5 * s, 3.1 * s, -0.3 * s, 1.7 * s, 1.5 * s, 1.7 * s, shade(leaf, 0.92), rnd() * 3);
    },
    pinheiro: function (B, rnd, pal) {
      var s = 0.85 + rnd() * 0.5, leaf = shade(U.pick(pal.leaves, rnd), 0.8);
      B.w.add('cyl6', 0, 0.6 * s, 0, 0.3 * s, 1.2 * s, 0.3 * s, pal.trunk);
      B.w.add('cone6', 0, 2.0 * s, 0, 2.6 * s, 2.4 * s, 2.6 * s, leaf, rnd());
      B.w.add('cone6', 0, 3.2 * s, 0, 2.0 * s, 2.1 * s, 2.0 * s, shade(leaf, 1.08), rnd());
      B.w.add('cone6', 0, 4.3 * s, 0, 1.3 * s, 1.8 * s, 1.3 * s, shade(leaf, 1.16), rnd());
    },
    palmeira: function (B, rnd, pal) {
      var s = 0.9 + rnd() * 0.35, lean = (rnd() - 0.5) * 0.25, x = 0, y = 0;
      for (var i = 0; i < 5; i++) {
        B.w.add('cyl6', x, y + 0.6 * s, 0, 0.26 * s, 1.25 * s, 0.26 * s, shade(pal.trunk, 1.1 + (i % 2) * 0.12), 0, 0, -lean);
        x += Math.sin(lean) * 1.2 * s; y += 1.2 * s;
      }
      var leaf = U.pick(pal.leaves, rnd);
      for (var k = 0; k < 7; k++) {
        var a = k / 7 * Math.PI * 2 + rnd() * 0.4;
        B.w.add('box', x + Math.cos(a) * 1.0 * s, y + 0.1, Math.sin(a) * 1.0 * s, 2.4 * s, 0.08, 0.55 * s, shade(leaf, 0.9 + rnd() * 0.2), -a, 0, -0.45);
      }
      B.w.add('ico', x, y + 0.1, 0, 0.6 * s, 0.5 * s, 0.6 * s, pal.trunk);
    },
    arbusto: function (B, rnd, pal) {
      var s = 0.8 + rnd() * 0.5, leaf = U.pick(pal.leaves, rnd);
      B.w.add('ico', 0, 0.45 * s, 0, 1.4 * s, 1.0 * s, 1.4 * s, leaf, rnd() * 3);
      B.w.add('ico', 0.5 * s, 0.4 * s, 0.2 * s, 0.9 * s, 0.75 * s, 0.9 * s, shade(leaf, 1.1), rnd() * 3);
      if (rnd() < 0.5) B.w.add('ico', -0.2 * s, 0.85 * s, 0, 0.35, 0.3, 0.35, U.pick(pal.blossom, rnd));
    },
    florida: function (B, rnd, pal) {   // ipê
      var s = 0.85 + rnd() * 0.35, bloom = U.pick(pal.blossom, rnd);
      B.w.add('cyl6', 0, 1.0 * s, 0, 0.3 * s, 2.0 * s, 0.3 * s, pal.trunk, 0, 0, 0.08);
      B.w.add('ico', 0, 2.9 * s, 0, 3.0 * s, 2.0 * s, 3.0 * s, bloom, rnd() * 3);
      B.w.add('ico', 0.7 * s, 3.4 * s, 0.1, 1.8 * s, 1.4 * s, 1.8 * s, shade(bloom, 1.08), rnd() * 3);
      B.w.add('ico', -0.6 * s, 3.3 * s, 0.3, 1.6 * s, 1.3 * s, 1.6 * s, shade(bloom, 0.92), rnd() * 3);
    }
  };

  // objetos urbanos: frente para +z (a rua). "curb" = vai perto do meio-fio
  var props = {
    poste: {
      curb: true,
      draw: function (B, rnd, pal) {
        B.w.add('cyl6', 0, 2.8, 0, 0.14, 5.6, 0.14, pal.metal);
        B.w.box(0, 5.45, 0.75, 0.1, 0.1, 1.5, pal.metal);
        B.w.box(0, 5.25, 1.45, 0.36, 0.2, 0.62, pal.metal);
        B.g.box(0, 5.17, 1.45, 0.28, 0.06, 0.5, '#fff1c2');
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

  EP.Assets = { buildings: buildings, trees: trees, props: props, pieces: pieces, windows: windows };
})(window.EP);
