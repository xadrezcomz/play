// Textures — texturas pequenas geradas no próprio jogo (nada para baixar).
// O detalhe vem de poucas texturas repetíveis, não de geometria:
//   detail (256×256, um padrão por canal): R asfalto, G calçada de placas,
//     B grama, A reboco/pedra. O material do cenário escolhe o canal pelo
//     atributo "detail" de cada vértice e projeta pela posição no mundo.
//   foliage (512×512, 4 quadros): cacho de folhas, flores, tufo de grama, folha solta.
//   shadow (128×64): sombra lisa (esquerda) e sombra de folhagem (direita).
(function (EP) {
  'use strict';
  var U = EP.util;

  // ruído de valor que se repete sem emenda (periódico em "cells")
  function tileNoise(size, cells, rnd) {
    var g = new Float32Array(cells * cells), out = new Float32Array(size * size), i, x, y;
    for (i = 0; i < g.length; i++) g[i] = rnd();
    for (y = 0; y < size; y++) {
      var fy = y / size * cells, y0 = Math.floor(fy), ty = U.smooth(fy - y0), y1 = (y0 + 1) % cells;
      for (x = 0; x < size; x++) {
        var fx = x / size * cells, x0 = Math.floor(fx), tx = U.smooth(fx - x0), x1 = (x0 + 1) % cells;
        var a = g[y0 * cells + x0], b = g[y0 * cells + x1], c = g[y1 * cells + x0], d = g[y1 * cells + x1];
        out[y * size + x] = (a + (b - a) * tx) * (1 - ty) + (c + (d - c) * tx) * ty;
      }
    }
    return out;
  }
  function fbm(size, base, octaves, rnd) {
    var out = new Float32Array(size * size), amp = 1, total = 0;
    for (var o = 0; o < octaves; o++) {
      var n = tileNoise(size, base << o, rnd);
      for (var i = 0; i < out.length; i++) out[i] += n[i] * amp;
      total += amp; amp *= 0.5;
    }
    for (i = 0; i < out.length; i++) out[i] /= total;
    return out;
  }

  var T = EP.Textures = {
    detail: function () {
      if (T._detail) return T._detail;
      var S = 256, rnd = U.rng(1234), data = new Uint8Array(S * S * 4), i, x, y;
      var asph = fbm(S, 8, 4, rnd), grass = fbm(S, 16, 3, rnd), plaster = fbm(S, 4, 4, rnd), stone = fbm(S, 32, 2, rnd);
      // calçada: placas de 0,5 m (4×4 por textura de 2 m), cada uma com o seu tom
      var tiles = [], N = 4;
      for (i = 0; i < N * N; i++) tiles.push(0.42 + rnd() * 0.2);
      for (y = 0; y < S; y++) {
        for (x = 0; x < S; x++) {
          i = y * S + x;
          // asfalto: grão fino + pedrinhas claras e escuras
          var r = 0.42 + (asph[i] - 0.5) * 0.5, sp = rnd();
          if (sp < 0.05) r += 0.22 * rnd(); else if (sp < 0.09) r -= 0.16 * rnd();
          // placas com rejunte escuro
          var cx = x / (S / N), cy = y / (S / N), tx = Math.floor(cx), ty = Math.floor(cy);
          var ex = Math.min(cx - tx, 1 - (cx - tx)) * (S / N), ey = Math.min(cy - ty, 1 - (cy - ty)) * (S / N);
          var gEdge = Math.min(ex, ey), gv = tiles[ty * N + tx] + (stone[i] - 0.5) * 0.12;
          if (gEdge < 1.2) gv = 0.22; else if (gEdge < 2.4) gv *= 0.86;
          // grama: listras de corte + pontinhos
          var bv = 0.42 + (grass[i] - 0.5) * 0.6 + (rnd() - 0.5) * 0.14 + Math.sin(y / S * Math.PI * 8) * 0.04;
          // reboco: manchas suaves
          var av = 0.5 + (plaster[i] - 0.5) * 0.55 + (rnd() - 0.5) * 0.05;
          data[i * 4] = U.clamp(r, 0, 1) * 255;
          data[i * 4 + 1] = U.clamp(gv, 0, 1) * 255;
          data[i * 4 + 2] = U.clamp(bv, 0, 1) * 255;
          data[i * 4 + 3] = U.clamp(av, 0, 1) * 255;
        }
      }
      var t = new THREE.DataTexture(data, S, S, THREE.RGBAFormat);
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.magFilter = THREE.LinearFilter;
      t.minFilter = THREE.LinearMipmapLinearFilter;
      t.generateMipmaps = true;
      t.anisotropy = 4;
      t.needsUpdate = true;
      return (T._detail = t);
    },

    // quadros do atlas de folhagem (u0, v0 de cada quadro de 0,5×0,5)
    CELL: { leaves: [0, 0.5], flowers: [0.5, 0.5], grass: [0, 0], leaf: [0.5, 0] },

    foliage: function () {
      if (T._foliage) return T._foliage;
      var S = 512, H = S / 2, c = document.createElement('canvas');
      c.width = c.height = S;
      var g = c.getContext('2d'), rnd = U.rng(99);
      function leaf(x, y, len, wid, ang, col) {
        g.save(); g.translate(x, y); g.rotate(ang); g.fillStyle = col;
        g.beginPath(); g.moveTo(0, 0);
        g.quadraticCurveTo(wid, -len * 0.45, 0, -len);
        g.quadraticCurveTo(-wid, -len * 0.45, 0, 0);
        g.fill(); g.restore();
      }
      // 1) cacho de folhas (tons claros: a cor vem do vértice) — sobe e alarga no meio
      var cx = H / 2, cy = H / 2, k, a, r;
      for (k = 0; k < 520; k++) {
        a = rnd() * Math.PI * 2; r = Math.sqrt(rnd()) * H * 0.43;
        var px = cx + Math.cos(a) * r, py = cy + Math.sin(a) * r * 0.92, shade = 150 + Math.floor((1 - (py / H)) * 70 + rnd() * 35);
        var tone = 'rgb(' + Math.floor(shade * 0.92) + ',' + shade + ',' + Math.floor(shade * 0.82) + ')';
        leaf(px, py, 15 + rnd() * 14, 6 + rnd() * 4, a + Math.PI / 2 + (rnd() - 0.5), tone);
      }
      // 2) flores (cores próprias) sobre folhinhas
      var petals = ['#ff8fb8', '#ffd0e0', '#ffffff', '#ffd447', '#ff9e7a', '#d7a3f0'];
      for (k = 0; k < 140; k++) {
        a = rnd() * Math.PI * 2; r = Math.sqrt(rnd()) * H * 0.42;
        leaf(H + H / 2 + Math.cos(a) * r, H / 2 + Math.sin(a) * r * 0.8 + 10, 18, 6, a + Math.PI / 2, '#5f9a48');
      }
      for (k = 0; k < 90; k++) {
        a = rnd() * Math.PI * 2; r = Math.sqrt(rnd()) * H * 0.38;
        var fx = H + H / 2 + Math.cos(a) * r, fy = H / 2 + Math.sin(a) * r * 0.75, col = petals[k % petals.length];
        for (var p = 0; p < 5; p++) { g.fillStyle = col; g.beginPath(); g.arc(fx + Math.cos(p * 1.256) * 5, fy + Math.sin(p * 1.256) * 5, 4.6, 0, 7); g.fill(); }
        g.fillStyle = '#ffcf3f'; g.beginPath(); g.arc(fx, fy, 2.6, 0, 7); g.fill();
      }
      // 3) tufo de grama (lâminas claras, base mais escura)
      for (k = 0; k < 120; k++) {
        var bx = H * 0.12 + rnd() * H * 0.76, h = H * (0.35 + rnd() * 0.55), lean = (rnd() - 0.5) * 50, sh = 140 + Math.floor(rnd() * 80);
        var grd = g.createLinearGradient(0, S, 0, S - h);
        grd.addColorStop(0, 'rgb(' + (sh * 0.55 | 0) + ',' + (sh * 0.65 | 0) + ',' + (sh * 0.5 | 0) + ')');
        grd.addColorStop(1, 'rgb(' + (sh | 0) + ',' + (sh | 0) + ',' + (sh * 0.85 | 0) + ')');
        g.fillStyle = grd;
        g.beginPath(); g.moveTo(bx - 4, S); g.quadraticCurveTo(bx + lean * 0.3, S - h * 0.6, bx + lean, S - h); g.quadraticCurveTo(bx + lean * 0.3 + 2, S - h * 0.6, bx + 4, S); g.fill();
      }
      // 4) folha solta (para o chão): uma folha grande
      leaf(H + H / 2, H + H * 0.85, H * 0.7, H * 0.22, 0.4, '#f0f0f0');
      g.strokeStyle = 'rgba(120,110,100,0.6)'; g.lineWidth = 3;
      g.beginPath(); g.moveTo(H + H / 2, H + H * 0.85); g.lineTo(H + H / 2 + Math.sin(0.4) * H * 0.62, H + H * 0.85 - Math.cos(0.4) * H * 0.62); g.stroke();
      var t = new THREE.CanvasTexture(c);
      t.encoding = THREE.sRGBEncoding;
      t.anisotropy = 4;
      return (T._foliage = t);
    },

    // sombra lisa (metade esquerda) e sombra de copa com furinhos de luz (metade direita)
    shadow: function () {
      if (T._shadow) return T._shadow;
      var c = document.createElement('canvas');
      c.width = 128; c.height = 64;
      var g = c.getContext('2d'), rnd = U.rng(7);
      var grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      grad.addColorStop(0, 'rgba(0,0,0,1)'); grad.addColorStop(0.55, 'rgba(0,0,0,0.7)'); grad.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = grad; g.fillRect(0, 0, 64, 64);
      // copa: manchas que se sobrepõem, com buracos de luz
      for (var k = 0; k < 46; k++) {
        var a = rnd() * Math.PI * 2, r = Math.sqrt(rnd()) * 22, x = 96 + Math.cos(a) * r, y = 32 + Math.sin(a) * r, rr = 4 + rnd() * 7;
        var gg = g.createRadialGradient(x, y, 0, x, y, rr);
        gg.addColorStop(0, 'rgba(0,0,0,0.55)'); gg.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = gg; g.beginPath(); g.arc(x, y, rr, 0, 7); g.fill();
      }
      g.globalCompositeOperation = 'destination-out';
      for (k = 0; k < 26; k++) {
        var hx = 96 + (rnd() - 0.5) * 40, hy = 32 + (rnd() - 0.5) * 40, hr = 1 + rnd() * 2.5;
        g.fillStyle = 'rgba(0,0,0,0.7)'; g.beginPath(); g.arc(hx, hy, hr, 0, 7); g.fill();
      }
      var t = new THREE.CanvasTexture(c);
      return (T._shadow = t);
    },

    // nuvem fofa (cúmulo): bolas macias, topo claro, base levemente acinzentada
    cloud: function (seed) {
      var key = '_cloud' + seed;
      if (T[key]) return T[key];
      var c = document.createElement('canvas');
      c.width = 256; c.height = 128;
      var g = c.getContext('2d'), rnd = U.rng(seed || 3);
      for (var k = 0; k < 22; k++) {
        var t = rnd(), x = 30 + t * 196, mid = 1 - Math.abs(t - 0.5) * 2;
        var r = 18 + mid * 30 + rnd() * 14, y = 92 - mid * 26 - rnd() * 18;
        var gr = g.createRadialGradient(x, y, r * 0.15, x, y, r);
        gr.addColorStop(0, 'rgba(255,255,255,0.95)'); gr.addColorStop(0.6, 'rgba(255,255,255,0.75)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
      }
      // base mais escura e achatada
      g.globalCompositeOperation = 'source-atop';
      var sh = g.createLinearGradient(0, 40, 0, 120);
      sh.addColorStop(0, 'rgba(255,255,255,0)'); sh.addColorStop(1, 'rgba(150,165,190,0.55)');
      g.fillStyle = sh; g.fillRect(0, 0, 256, 128);
      g.globalCompositeOperation = 'destination-out';
      var cut = g.createLinearGradient(0, 100, 0, 128);
      cut.addColorStop(0, 'rgba(0,0,0,0)'); cut.addColorStop(1, 'rgba(0,0,0,1)');
      g.fillStyle = cut; g.fillRect(0, 0, 256, 128);
      var t2 = new THREE.CanvasTexture(c);
      t2.encoding = THREE.sRGBEncoding;
      return (T[key] = t2);
    },

    // faixas de rua (banners) da marca: azul (esquerda) e laranja (direita) numa textura só
    banners: function () {
      if (T._banners) return T._banners;
      var c = document.createElement('canvas');
      c.width = 256; c.height = 256;
      var g = c.getContext('2d');
      [['#1f4fa8', '#ffffff', 0], ['#e8892f', '#ffffff', 128]].forEach(function (b) {
        var x0 = b[2], bg = b[0], fg = b[1];
        g.fillStyle = bg; g.fillRect(x0, 0, 128, 256);
        g.fillStyle = 'rgba(255,255,255,0.14)'; g.fillRect(x0, 0, 128, 14); g.fillRect(x0, 242, 128, 14);
        g.fillStyle = fg;
        g.beginPath(); g.moveTo(x0 + 24, 108); g.lineTo(x0 + 50, 68); g.lineTo(x0 + 63, 86); g.lineTo(x0 + 78, 62); g.lineTo(x0 + 104, 108); g.closePath(); g.fill();
        g.fillStyle = bg; g.beginPath(); g.moveTo(x0 + 70, 74); g.lineTo(x0 + 78, 62); g.lineTo(x0 + 86, 74); g.lineTo(x0 + 78, 70); g.closePath(); g.fill();
        g.fillStyle = fg; g.textAlign = 'center';
        g.font = '800 23px "Baloo 2", "Arial Black", sans-serif'; g.fillText('ENDLESS', x0 + 64, 150);
        g.font = '800 34px "Baloo 2", "Arial Black", sans-serif'; g.fillText('PACE', x0 + 64, 186);
      });
      var t = new THREE.CanvasTexture(c);
      t.encoding = THREE.sRGBEncoding;
      t.anisotropy = 4;
      return (T._banners = t);
    }
  };
})(window.EP);
