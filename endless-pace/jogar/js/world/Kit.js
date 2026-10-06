// Kit — peças "mid-poly" suaves para o cenário (direção de arte v2):
// árvores com copas de cartões de folhas, canteiros com flores, postes
// clássicos com faixas, bancos, guarda-corpo, prédios montados por módulos
// (base + fachada + janelas + sacadas + cornija + telhado + decoração) e
// fachadas de cafés com toldo. A riqueza vem de forma, cor e textura de
// detalhe — não de geometria pesada.
//
// Convenção (igual a Assets.js): referencial local com a frente virada para
// +z, base em y = 0; o gerador posiciona e gira (B.frame).
(function (EP) {
  'use strict';
  var U = EP.util;
  var shade = function (c, f) { return EP.GeoBuilder.shade(c, f); };
  var IRON = '#2a2e35', IRON_HI = '#3a3f48', TRIM = '#f2ede2';

  // desenha com um padrão de textura de detalhe (1 asfalto, 2 placas, 3 grama, 4 reboco)
  function det(B, n, fn) { var o = B.w.detail; B.w.detail = n; fn(); B.w.detail = o; }

  // ---------------------------------------------------------------- vegetação
  // Um tufo de copa: miolo liso (dá volume e preenche) + cartões de folhas em
  // volta, com normais "de bola" (a copa inteira recebe luz como um volume macio).
  function cluster(B, x, y, z, r, col, rnd, cards) {
    B.w.add('icoS', x, y - r * 0.08, z, r * 1.3, r * 1.12, r * 1.3, shade(col, 0.72), rnd() * 6);
    var start = B.leaf.count(), n = cards || Math.round(8 + r * 5);
    for (var i = 0; i < n; i++) {
      // pontos espalhados na superfície (mais em cima e dos lados que embaixo)
      var a = rnd() * Math.PI * 2, e = Math.asin(rnd() * 1.6 - 0.6), rr = r * (0.72 + rnd() * 0.3);
      var px = x + Math.cos(a) * Math.cos(e) * rr, py = y + Math.sin(e) * rr * 0.85, pz = z + Math.sin(a) * Math.cos(e) * rr;
      var s = r * (1.05 + rnd() * 0.45), tone = shade(col, 0.82 + (Math.sin(e) + 1) * 0.16 + rnd() * 0.1);
      B.leaf.card('leaves', px, py, pz, s, s, tone, a + Math.PI / 2 + (rnd() - 0.5) * 0.8, (rnd() - 0.5) * 0.9, (rnd() - 0.5) * 1.2);
    }
    B.leaf.puffNormals(start, x, y, z, r * 0.25);
  }

  // tronco curvo em segmentos (fica mais fino para cima), com galhos até cada tufo
  function trunk(B, x0, y0, z0, x1, y1, z1, r0, r1, col) {
    var n = 3, px = x0, py = y0, pz = z0;
    for (var i = 1; i <= n; i++) {
      var t = i / n, bend = Math.sin(t * Math.PI) * 0.12;
      var qx = U.lerp(x0, x1, t) + bend, qy = U.lerp(y0, y1, t), qz = U.lerp(z0, z1, t);
      limb(B, px, py, pz, qx, qy, qz, U.lerp(r0, r1, (i - 1) / n), U.lerp(r0, r1, t), col);
      px = qx; py = qy; pz = qz;
    }
  }
  var _a = new THREE.Vector3(), _b = new THREE.Vector3(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _up = new THREE.Vector3(0, 1, 0);
  function limb(B, x0, y0, z0, x1, y1, z1, r0, r1, col) {
    _a.set(x1 - x0, y1 - y0, z1 - z0);
    var len = _a.length();
    _q.setFromUnitVectors(_up, _a.normalize());
    _e.setFromQuaternion(_q, 'XYZ');
    // taper8: raio de cima 0,38 e de baixo 0,5 → escala pelo raio de baixo
    B.w.add('taper8', (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, r0 * 2, len, r0 * 2, col, _e.y, _e.x, _e.z);
  }

  var TREES = {
    // copa larga e madura (avenida-parque): 4–5 tufos
    copa: function (B, rnd, pal, k) {
      k = k || 1;
      var h = (5.6 + rnd() * 1.6) * k, R = (1.25 + rnd() * 0.35) * k, col = U.pick(pal.leaves, rnd), bark = pal.trunk;
      var lean = (rnd() - 0.5) * 0.6;
      trunk(B, 0, 0, 0, lean, h * 0.55, 0, 0.17 * k, 0.12 * k, bark);
      B.w.add('cyl10', 0, 0.06, 0, 0.42 * k, 0.12, 0.42 * k, shade(bark, 0.8));     // raiz
      var tufts = [[0, h * 0.86, 0, 1.0], [R * 1.05, h * 0.74, R * 0.2, 0.82], [-R * 1.0, h * 0.76, -R * 0.15, 0.85], [R * 0.15, h * 0.72, R * 1.0, 0.8], [-R * 0.2, h * 0.75, -R * 1.0, 0.8]];
      var nt = 4 + (rnd() < 0.5 ? 1 : 0);
      for (var i = 0; i < nt; i++) {
        var t = tufts[i], tx = t[0] + lean, ty = t[1], tz = t[2];
        if (i) limb(B, lean * 0.8, h * 0.52, 0, tx * 0.7, ty - R * 0.4, tz * 0.7, 0.08 * k, 0.05 * k, bark);
        cluster(B, tx, ty, tz, R * t[3] * (0.9 + rnd() * 0.2), shade(col, 0.92 + rnd() * 0.16), rnd);
      }
      return { h: h, r: R * 2.1 };
    },
    // alta e oval (rua residencial)
    alta: function (B, rnd, pal, k) {
      k = k || 1;
      var h = (6.5 + rnd() * 1.5) * k, R = (0.95 + rnd() * 0.2) * k, col = U.pick(pal.leaves, rnd);
      trunk(B, 0, 0, 0, 0.1, h * 0.45, 0, 0.14 * k, 0.1 * k, pal.trunk);
      cluster(B, 0, h * 0.55, 0, R * 1.05, col, rnd);
      cluster(B, 0.15, h * 0.74, 0.1, R * 0.95, shade(col, 1.06), rnd);
      cluster(B, -0.1, h * 0.9, -0.05, R * 0.75, shade(col, 1.12), rnd);
      return { h: h, r: R * 1.4 };
    },
    // florida (ipê, cerejeira): copa de flores
    florida: function (B, rnd, pal, k) {
      k = k || 1;
      var h = (4.6 + rnd() * 1.0) * k, R = (1.05 + rnd() * 0.25) * k, col = U.pick(pal.blossom, rnd);
      trunk(B, 0, 0, 0, 0.2, h * 0.55, 0, 0.13 * k, 0.09 * k, shade(pal.trunk, 0.85));
      [[0, h * 0.85, 0, 1], [R * 0.9, h * 0.72, 0.2, 0.8], [-R * 0.85, h * 0.74, -0.15, 0.8]].forEach(function (t, i) {
        if (i) limb(B, 0.15, h * 0.5, 0, t[0] * 0.7, t[1] - R * 0.4, t[2] * 0.7, 0.06 * k, 0.04 * k, pal.trunk);
        cluster(B, t[0], t[1], t[2], R * t[3], shade(col, 0.95 + rnd() * 0.12), rnd);
      });
      return { h: h, r: R * 1.8 };
    },
    // palmeira: tronco anelado e folhas em arco (cartões de folha alongados)
    palmeira: function (B, rnd, pal, k) {
      k = k || 1;
      var h = (6 + rnd() * 2) * k, lean = 0.3 + rnd() * 0.4;
      for (var i = 0; i < 7; i++) {
        var t0 = i / 7, t1 = (i + 1) / 7;
        limb(B, lean * t0 * t0, h * t0, 0, lean * t1 * t1, h * t1, 0, 0.16 - t0 * 0.05, 0.15 - t1 * 0.05, shade(pal.trunk, 1 + (i % 2) * 0.08));
      }
      var col = U.pick(pal.leaves, rnd), start = B.leaf.count();
      for (var f = 0; f < 9; f++) {
        var a = f / 9 * Math.PI * 2 + rnd() * 0.3;
        B.leaf.card('leaves', lean + Math.cos(a) * 1.0, h - 0.2, Math.sin(a) * 1.0, 2.4, 0.9, shade(col, 0.9 + rnd() * 0.2), -a, 0, -0.5);
      }
      B.leaf.puffNormals(start, lean, h - 0.6, 0, 0.6);
      B.w.add('icoS', lean, h - 0.05, 0, 0.5, 0.4, 0.5, shade(col, 0.6));
      return { h: h, r: 1.6 };
    },
    // pinheiro: camadas de cartões em cone
    pinheiro: function (B, rnd, pal, k) {
      k = k || 1;
      var h = (6 + rnd() * 2) * k, col = shade(U.pick(pal.leaves, rnd), 0.78);
      limb(B, 0, 0, 0, 0, h * 0.4, 0, 0.14, 0.1, pal.trunk);
      for (var l = 0; l < 4; l++) {
        var y = h * (0.35 + l * 0.17), r = (1.5 - l * 0.3) * k;
        B.w.add('cone12', 0, y + r * 0.4, 0, r * 2, r * 1.5, r * 2, shade(col, 0.7 + l * 0.05));
        var start = B.leaf.count();
        for (var i = 0; i < 7; i++) {
          var a = i / 7 * Math.PI * 2 + l;
          B.leaf.card('leaves', Math.cos(a) * r * 0.65, y + 0.25, Math.sin(a) * r * 0.65, r * 1.2, r * 1.0, shade(col, 0.9 + l * 0.06), a + Math.PI / 2, 0.25);
        }
        B.leaf.puffNormals(start, 0, y, 0, 0.2);
      }
      return { h: h, r: 1.5 };
    }
  };

  // arbusto: um tufo baixo
  function bush(B, x, y, z, r, col, rnd) { cluster(B, x, y + r * 0.6, z, r, col, rnd, Math.round(6 + r * 6)); }

  // flores e grama (cartões cruzados)
  function flowers(B, x, y, z, w, d, n, rnd, tint) {
    for (var i = 0; i < n; i++) {
      var px = x + (rnd() - 0.5) * w, pz = z + (rnd() - 0.5) * d, s = 0.45 + rnd() * 0.3, a = rnd() * Math.PI;
      B.leaf.card('flowers', px, y + s * 0.42, pz, s, s * 0.85, tint || '#ffffff', a);
      B.leaf.card('flowers', px, y + s * 0.42, pz, s, s * 0.85, tint || '#ffffff', a + Math.PI / 2);
    }
  }
  function grass(B, x, y, z, w, d, n, rnd, col) {
    for (var i = 0; i < n; i++) {
      var px = x + (rnd() - 0.5) * w, pz = z + (rnd() - 0.5) * d, s = 0.35 + rnd() * 0.3, a = rnd() * Math.PI;
      B.leaf.card('grass', px, y + s * 0.45, pz, s * 1.3, s, shade(col, 0.9 + rnd() * 0.25), a);
      B.leaf.card('grass', px, y + s * 0.45, pz, s * 1.3, s, shade(col, 0.9 + rnd() * 0.25), a + Math.PI / 2);
    }
  }
  // folhas caídas no chão (outono leve, só um toque de cor)
  function fallenLeaves(B, x, z, w, d, n, rnd) {
    var cols = ['#e0a24a', '#d98a3a', '#e8c25a', '#c9753a'];
    for (var i = 0; i < n; i++) {
      B.leaf.card('leaf', x + (rnd() - 0.5) * w, 0.022, z + (rnd() - 0.5) * d, 0.22, 0.22, U.pick(cols, rnd), rnd() * 6, -Math.PI / 2);
    }
  }

  // ---------------------------------------------------------------- objetos urbanos
  var PROPS = {
    // poste clássico de ferro com lanterna e, se pedido, duas faixas da marca
    poste: function (B, rnd, pal, opts) {
      opts = opts || {};
      var h = 4.4;
      B.w.add('cyl8', 0, 0.12, 0, 0.34, 0.24, 0.34, IRON);
      B.w.add('cyl8', 0, 0.36, 0, 0.24, 0.26, 0.24, IRON_HI);
      B.w.add('taper8', 0, h / 2 + 0.3, 0, 0.13, h - 0.4, 0.13, IRON);
      B.w.add('cyl8', 0, 1.3, 0, 0.17, 0.08, 0.17, IRON_HI);
      B.w.add('cyl8', 0, h + 0.1, 0, 0.3, 0.08, 0.3, IRON);
      // lanterna: vidro que acende, quatro hastes, chapéu
      B.g.add('cyl8', 0, h + 0.42, 0, 0.28, 0.46, 0.28, '#ffe2a8');
      for (var i = 0; i < 4; i++) { var a = i * Math.PI / 2 + Math.PI / 4; B.w.add('boxF', Math.cos(a) * 0.15, h + 0.42, Math.sin(a) * 0.15, 0.03, 0.5, 0.03, IRON, -a); }
      B.w.add('cone12', 0, h + 0.78, 0, 0.5, 0.26, 0.5, IRON);
      B.w.add('cyl8', 0, h + 0.96, 0, 0.06, 0.14, 0.06, IRON_HI);
      if (opts.banners) {
        // braço e duas faixas (azul e laranja) penduradas para a rua
        B.w.add('boxF', 0.36, 3.55, 0, 0.72, 0.04, 0.04, IRON);
        B.w.add('boxF', 0.36, 2.05, 0, 0.72, 0.04, 0.04, IRON);
        var side = opts.flip ? -1 : 1;
        B.sign.uvRect = [0, 0, 0.5, 1];
        B.sign.add('quad', 0.38, 2.8, 0.02 * side, 0.6, 1.45, 1, '#ffffff', 0);
        B.sign.uvRect = [0.5, 0, 0.5, 1];
        B.sign.add('quad', 0.38, 2.8, -0.02 * side, 0.6, 1.45, 1, '#ffffff', Math.PI);
        B.sign.uvRect = null;
      }
      B.light.blob(0, 0.03, 0, 3.4, 3.4);
      B.shadow.blob(0, 0.03, 0.5, 0.45, 1.1);
    },
    // banco de praça: pés de ferro, assento e encosto de ripas de madeira
    banco: function (B, rnd, pal) {
      var wood = pal.wood || '#b07a4f';
      [-0.75, 0.75].forEach(function (x) {
        B.w.box(x, 0, 0.12, 0.07, 0.44, 0.08, IRON);
        B.w.box(x, 0, -0.2, 0.07, 0.44, 0.08, IRON);
        B.w.box(x, 0.4, -0.04, 0.07, 0.06, 0.46, IRON);
        B.w.add('box', x, 0.68, -0.27, 0.07, 0.62, 0.06, IRON, 0, -0.18);
      });
      for (var i = 0; i < 4; i++) B.w.box(0, 0.44, 0.12 - i * 0.115, 1.8, 0.045, 0.095, shade(wood, 0.95 + (i % 2) * 0.08));
      for (i = 0; i < 3; i++) B.w.add('box', 0, 0.62 + i * 0.13, -0.29 - i * 0.022, 1.8, 0.085, 0.04, shade(wood, 0.92 + (i % 2) * 0.08), 0, -0.18);
      B.shadow.blob(0, 0.02, 0.25, 1.15, 0.55);
    },
    lixeira: function (B) {
      B.w.add('cyl12', 0, 0.45, 0, 0.42, 0.9, 0.42, '#3d5a4a');
      B.w.add('cyl12', 0, 0.92, 0, 0.46, 0.06, 0.46, IRON_HI);
      B.w.add('cyl12', 0, 0.25, 0, 0.44, 0.05, 0.44, IRON_HI);
      B.shadow.blob(0, 0.02, 0.15, 0.35, 0.4);
    },
    balizador: function (B) {
      B.w.add('cyl10', 0, 0.38, 0, 0.16, 0.76, 0.16, IRON);
      B.w.add('sph8', 0, 0.78, 0, 0.17, 0.12, 0.17, IRON_HI);
      B.w.add('cyl10', 0, 0.64, 0, 0.18, 0.04, 0.18, '#c9a24a');
    },
    // vaso grande com arbusto e flores
    vaso: function (B, rnd, pal) {
      B.w.add('taper10', 0, 0.32, 0, 0.75, 0.64, 0.75, '#c7b8a2', 0, Math.PI);
      B.w.add('cyl12', 0, 0.62, 0, 0.8, 0.06, 0.8, '#d8ccb8');
      bush(B, 0, 0.6, 0, 0.42, U.pick(pal.leaves, rnd), rnd);
      flowers(B, 0, 0.62, 0, 0.6, 0.6, 3, rnd);
      B.shadow.blob(0, 0.02, 0.2, 0.55, 0.6);
    },
    bicicletario: function (B) {
      for (var i = 0; i < 4; i++) {
        var x = -1.2 + i * 0.8;
        B.w.add('cyl8', x - 0.25, 0.4, 0, 0.05, 0.8, 0.05, '#8a929c');
        B.w.add('cyl8', x + 0.25, 0.4, 0, 0.05, 0.8, 0.05, '#8a929c');
        B.w.add('cyl8', x, 0.8, 0, 0.05, 0.5, 0.05, '#8a929c', 0, 0, Math.PI / 2);
      }
    }
  };

  // ---------------------------------------------------------------- prédios modulares
  // Janela: moldura em relevo, vidro recuado com o céu refletido (degradê),
  // peitoril; às vezes venezianas ou floreira. À noite algumas acendem.
  function windowModule(B, x, y, z, ww, wh, st, rnd) {
    var tr = st.trim;
    B.w.boxF(x, y - wh / 2 - 0.1, z + 0.03, ww + 0.26, wh + 0.2, 0.1, tr);                // moldura
    var g0 = B.glass.count();
    B.glass.quad(x, y, z + 0.085, ww, wh, '#000');
    B.glass.vGradient(g0, st.skyHi, st.skyLo);
    if (rnd() < st.lit) B.g.quad(x, y, z + 0.09, ww * 0.94, wh * 0.94, '#ffcf86');       // luz acesa à noite
    B.w.quad(x, y, z + 0.1, 0.05, wh, tr);                                                // divisórias
    B.w.quad(x, y + 0.02, z + 0.1, ww, 0.05, tr);
    B.w.boxF(x, y - wh / 2 - 0.2, z + 0.12, ww + 0.4, 0.09, 0.24, tr);                   // peitoril
    B.w.boxF(x, y + wh / 2 + 0.1, z + 0.08, ww + 0.36, 0.12, 0.16, tr);                  // verga
    if (st.shutters && rnd() < 0.6) {
      B.w.boxF(x - ww / 2 - 0.22, y - wh / 2, z + 0.08, 0.3, wh, 0.05, st.shutters);
      B.w.boxF(x + ww / 2 + 0.22, y - wh / 2, z + 0.08, 0.3, wh, 0.05, st.shutters);
    }
  }
  function balconyModule(B, x, y, z, w, st) {
    B.w.box(x, y, z + 0.45, w, 0.14, 0.9, st.trim);
    B.w.box(x, y + 0.14, z + 0.88, w, 0.05, 0.05, IRON);
    B.w.box(x, y + 0.98, z + 0.88, w, 0.05, 0.06, IRON);
    for (var bx = -w / 2 + 0.1; bx <= w / 2 - 0.05; bx += 0.16) B.w.quad(x + bx, y + 0.56, z + 0.9, 0.028, 0.84, IRON);
    B.w.box(x - w / 2, y + 0.14, z + 0.45, 0.05, 0.84, 0.9, IRON);
    B.w.box(x + w / 2, y + 0.14, z + 0.45, 0.05, 0.84, 0.9, IRON);
  }

  // estilos de fachada (combinados com módulos: base, andares, cornija, telhado)
  var STYLES = {
    classico: { walls: ['#e9dcc4', '#f0e2c8', '#e6d3b3', '#efe6d6', '#e4cfb6'], trim: '#f7f1e4', base: '#cdbfa6', roof: '#6d7b8c', shutters: null, lit: 0.25,
      skyHi: '#a9c7e2', skyLo: '#3e5468', mansard: true, pilasters: true },
    colorido: { walls: ['#f2c6a0', '#e8a98c', '#f3d79a', '#c9dcc0', '#bcd3e3', '#f0c4c8'], trim: '#fbf6ec', base: '#b9ad9c', roof: '#a8553f', shutters: '#5f8f7a', lit: 0.3,
      skyHi: '#b3cfe6', skyLo: '#45596b', mansard: false, pilasters: false },
    moderno: { walls: ['#d9dde2', '#c9d1d8', '#e8e6e1', '#b9c3cc'], trim: '#eef1f4', base: '#8d949c', roof: '#6b737c', shutters: null, lit: 0.35,
      skyHi: '#9fc0de', skyLo: '#30455a', mansard: false, pilasters: false, wide: true }
  };

  // fachada de loja/café no térreo: vitrine, porta, toldo listrado e placa
  var SHOPS = [
    { awn: ['#2f6d5a', '#f3efe4'], sign: '#2f6d5a', text: '#f3efe4', table: true },     // café
    { awn: ['#c0453a', '#f6efe2'], sign: '#8c2f28', text: '#ffe7c2', table: true },     // padaria
    { awn: ['#1f4fa8', '#ffffff'], sign: '#1f4fa8', text: '#ffffff', table: false },    // loja de esportes
    { awn: ['#e8892f', '#fff4e0'], sign: '#3a3f48', text: '#ffd28a', table: true }      // sorveteria
  ];
  function shopFront(B, w, gh, st, rnd, pal) {
    var shop = U.pick(SHOPS, rnd), x0 = -w / 2 + 0.5, x1 = w / 2 - 0.5;
    B.w.box(0, 0, 0.02, w, 0.18, 0.12, st.base);
    // vitrine em painéis com caixilho escuro
    var panes = Math.max(2, Math.round((x1 - x0) / 1.6)), pw = (x1 - x0) / panes;
    for (var i = 0; i < panes; i++) {
      var px = x0 + pw * (i + 0.5), door = i === Math.floor(panes / 2);
      var g0 = B.glass.count();
      B.glass.quad(px, gh * 0.47, 0.06, pw - 0.12, gh * 0.8, '#000');
      B.glass.vGradient(g0, '#c9dbe8', door ? '#3c3226' : '#4a4036');
      B.g.quad(px, gh * 0.4, 0.05, pw - 0.2, gh * 0.55, '#ffd9a0');
      B.w.box(px - pw / 2, 0.18, 0.08, 0.08, gh * 0.85, 0.08, IRON);
    }
    B.w.box(x1, 0.18, 0.08, 0.08, gh * 0.85, 0.08, IRON);
    B.w.box(0, gh * 0.87, 0.08, x1 - x0 + 0.1, 0.08, 0.1, IRON);
    // placa
    B.w.box(0, gh * 0.9, 0.1, x1 - x0, 0.55, 0.12, shop.sign);
    for (var k = 0; k < 5; k++) B.w.box(-0.9 + k * 0.45, gh * 0.9 + 0.2, 0.17, 0.32, 0.14, 0.02, shop.text);
    // toldo listrado inclinado
    var stripes = Math.round((x1 - x0) / 0.5);
    for (var s = 0; s < stripes; s++) {
      var sx = x0 + (s + 0.5) * (x1 - x0) / stripes;
      var sw2 = (x1 - x0) / stripes + 0.01, ac = shop.awn[s % 2];
      B.w.add('quad', sx, gh * 0.83, 0.75, sw2, 1.6, 1, ac, 0, -Math.PI / 2 + 0.32);              // em cima
      B.w.add('quad', sx, gh * 0.83 - 0.02, 0.75, sw2, 1.6, 1, shade(ac, 0.8), 0, Math.PI / 2 + 0.32);   // por baixo
      B.w.add('quad', sx, gh * 0.83 - 0.38, 1.5, sw2, 0.26, 1, ac);                                // franja
    }
    B.shadow.blob(0, 0.02, 1.3, w * 0.45, 0.9);
    return shop;
  }
  // mesinhas na calçada (café)
  function cafeTables(B, w, rnd, pal) {
    for (var x = -w / 2 + 1.4; x < w / 2 - 1; x += 2.3) {
      var z = 2.1 + rnd() * 0.3;
      B.w.add('cyl6', x, 0.37, z, 0.06, 0.74, 0.06, IRON);
      B.w.add('cyl12', x, 0.75, z, 0.7, 0.04, 0.7, '#f2f0ea');
      B.w.add('cyl6', x, 0.02, z, 0.36, 0.04, 0.36, IRON);
      [-1, 1].forEach(function (sd) {
        var cx = x + sd * 0.55;
        B.w.boxF(cx, 0.4, z, 0.38, 0.05, 0.38, '#8c6a4a');
        B.w.add('boxF', cx + sd * 0.17, 0.62, z, 0.04, 0.5, 0.38, '#8c6a4a', 0, 0, sd * 0.1);
        B.w.add('cyl6', cx, 0.2, z, 0.05, 0.4, 0.05, IRON);
      });
      if (rnd() < 0.5) {   // guarda-sol
        B.w.add('cyl6', x, 1.4, z, 0.04, 1.3, 0.04, '#d8d2c6');
        B.w.add('cone12', x, 2.2, z, 2.0, 0.42, 2.0, rnd() < 0.5 ? '#f3efe4' : '#2f6d5a');
      }
      B.shadow.blob(x, 0.02, z + 0.5, 0.8, 0.8);
    }
  }

  // prédio: opts { w, floors, style, shop }
  function building(B, rnd, pal, opts) {
    var st = STYLES[opts.style] || STYLES.classico, w = opts.w, floors = opts.floors, d = 12;
    var wall = U.pick(st.walls, rnd), gh = 3.8, fh = 3.15, H = gh + floors * fh;
    det(B, 4, function () {
      B.w.box(0, 0, -d / 2, w, H, d, wall);                                      // volume
      if (st.pilasters) for (var px = -w / 2; px <= w / 2 + 0.01; px += w / Math.max(2, Math.round(w / 4.2))) B.w.boxF(px, gh, 0.05, 0.42, H - gh - 0.4, 0.14, shade(wall, 1.04));
      B.w.box(0, 0, 0.02, w + 0.04, gh, 0.12, st.base);                           // térreo em pedra
    });
    B.w.box(0, gh - 0.1, 0.12, w + 0.3, 0.26, 0.34, st.trim);                     // friso do térreo
    // andares: janelas em grade, sacadas em alguns
    var cols = Math.max(2, Math.round(w / (st.wide ? 2.2 : 2.8))), step = w / cols, ww = st.wide ? step - 0.5 : 1.15, wh = st.wide ? 2.0 : 1.75;
    for (var f = 0; f < floors; f++) {
      var y = gh + f * fh + fh * 0.52;
      var balc = (f === 0 || f === floors - 2) && rnd() < 0.55;
      for (var i = 0; i < cols; i++) {
        var x = -w / 2 + step * (i + 0.5);
        windowModule(B, x, y, 0, ww, wh, st, rnd);
        if (balc && (i % 2 === 0 || st.wide)) balconyModule(B, x, y - wh / 2 - 0.28, 0, Math.min(step - 0.3, 1.9), st);
      }
      if (f > 0) B.w.boxF(0, gh + f * fh - 0.06, 0.04, w + 0.1, 0.12, 0.12, shade(st.trim, 0.97));
    }
    // cornija (a "aba" no alto) e telhado
    B.w.box(0, H - 0.05, -d / 2 + 0.1, w + 0.5, 0.22, d + 0.3, st.trim);
    B.w.box(0, H + 0.17, -d / 2 + 0.05, w + 0.34, 0.16, d + 0.16, shade(st.trim, 0.94));
    if (st.mansard) {
      B.w.add('prism', 0, H + 0.33, -d / 2, w + 0.1, 2.0, d - 0.4, st.roof);
      for (var m = 0; m < cols; m += 2) {                                         // água-furtada
        var mx = -w / 2 + step * (m + 0.5);
        B.w.box(mx, H + 0.5, -0.9, 1.1, 1.2, 1.2, st.trim);
        B.w.add('prism', mx, H + 1.7, -0.9, 1.3, 0.5, 1.4, st.roof, Math.PI / 2);
        var g1 = B.glass.count(); B.glass.quad(mx, H + 1.1, -0.28, 0.7, 0.8, '#000'); B.glass.vGradient(g1, st.skyHi, st.skyLo);
      }
    } else {
      B.w.box(0, H + 0.33, -d / 2, w + 0.1, 0.55, d, shade(wall, 0.92));            // platibanda
      if (rnd() < 0.6) B.w.box((rnd() - 0.5) * w * 0.5, H + 0.88, -d * 0.6, 2.2, 1.6, 2.2, '#9aa2ab');   // casa de máquinas
      if (rnd() < 0.5) { B.w.add('cyl12', -w * 0.25, H + 1.6, -d * 0.4, 1.6, 1.5, 1.6, '#b6a48c'); }       // caixa d'água
    }
    // térreo: loja/café ou entrada com porta e luminárias
    var shop = null;
    if (opts.shop) shop = shopFront(B, w, gh, st, rnd, pal);
    else {
      B.w.box(0, 0, 0.1, 1.9, 2.9, 0.16, st.trim);
      var g2 = B.glass.count(); B.glass.quad(0, 1.4, 0.2, 1.5, 2.6, '#000'); B.glass.vGradient(g2, '#a9b8c4', '#2c3238');
      B.g.quad(-1.2, 2.4, 0.2, 0.18, 0.3, '#ffd9a0'); B.g.quad(1.2, 2.4, 0.2, 0.18, 0.3, '#ffd9a0');
      for (var k2 = -1; k2 <= 1; k2 += 2) for (var wx = 1; wx < w / 2 - 1; wx += 2.4) {
        var g3 = B.glass.count(); B.glass.quad(k2 * (wx + 0.8), gh * 0.5, 0.1, 1.2, 1.9, '#000'); B.glass.vGradient(g3, st.skyHi, st.skyLo);
        B.w.box(k2 * (wx + 0.8), gh * 0.5 - 1.05, 0.14, 1.5, 0.12, 0.2, st.trim);
      }
    }
    B.shadow.blob(0, 0.02, 0.4, w * 0.55, 0.7);
    return { h: H, shop: shop };
  }

  EP.Kit = { TREES: TREES, PROPS: PROPS, STYLES: STYLES, cluster: cluster, bush: bush, flowers: flowers, grass: grass, fallenLeaves: fallenLeaves,
    building: building, cafeTables: cafeTables, det: det, limb: limb, IRON: IRON };
})(window.EP);
