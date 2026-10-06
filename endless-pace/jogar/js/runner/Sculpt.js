// Sculpt — "escultura digital" procedural para os corredores.
//
// As formas são descritas por campos de distância (SDF): elipsoides e cones
// arredondados que se fundem suavemente (como argila), em vez de peças
// encaixadas. A malha sai do campo por "surface nets" (uma grade de amostras),
// cada vértice é puxado para a superfície e a normal vem do gradiente do
// campo — o resultado é liso mesmo com poucos triângulos.
//
// Também calcula a oclusão de ambiente (sombras suaves nas dobras) pelo
// próprio campo, sem nenhuma textura.
(function sculptModule(EP) {
  'use strict';

  var S = EP.Sculpt = {};
  S.module = sculptModule;   // o Worker de escultura usa o mesmo código (BodyModel.request)

  // ---------------------------------------------------------------- primitivas
  // elipsoide (aproximação de Inigo Quilez: boa perto da superfície)
  function bound(f, cx, cy, cz, r) { f.b = [cx, cy, cz, r]; return f; }
  S.ellipsoid = function (cx, cy, cz, rx, ry, rz) {
    return bound(function (x, y, z) {
      var px = (x - cx) / rx, py = (y - cy) / ry, pz = (z - cz) / rz;
      var k0 = Math.sqrt(px * px + py * py + pz * pz);
      var qx = px / rx, qy = py / ry, qz = pz / rz, k1 = Math.sqrt(qx * qx + qy * qy + qz * qz);
      return k1 > 1e-9 ? k0 * (k0 - 1) / k1 : -Math.min(rx, ry, rz);
    }, cx, cy, cz, Math.max(rx, ry, rz));
  };
  S.sphere = function (cx, cy, cz, r) {
    return bound(function (x, y, z) { var dx = x - cx, dy = y - cy, dz = z - cz; return Math.sqrt(dx * dx + dy * dy + dz * dz) - r; }, cx, cy, cz, r);
  };
  // cone arredondado entre a e b, raios ra e rb (membros, dedos, nariz)
  S.cone = function (ax, ay, az, bx, by, bz, ra, rb) {
    var bax = bx - ax, bay = by - ay, baz = bz - az, l2 = bax * bax + bay * bay + baz * baz, rr = ra - rb, a2 = l2 - rr * rr, il2 = 1 / l2;
    return bound(function (x, y, z) {
      var pax = x - ax, pay = y - ay, paz = z - az;
      var yy = pax * bax + pay * bay + paz * baz, zz = yy - l2;
      var qx = pax * l2 - bax * yy, qy = pay * l2 - bay * yy, qz = paz * l2 - baz * yy;
      var x2 = qx * qx + qy * qy + qz * qz, y2 = yy * yy * l2, z2 = zz * zz * l2;
      var k = (rr > 0 ? 1 : rr < 0 ? -1 : 0) * rr * rr * x2;
      if ((zz > 0 ? 1 : zz < 0 ? -1 : 0) * a2 * z2 > k) return Math.sqrt(x2 + z2) * il2 - rb;
      if ((yy > 0 ? 1 : yy < 0 ? -1 : 0) * a2 * y2 < k) return Math.sqrt(x2 + y2) * il2 - ra;
      return (Math.sqrt(x2 * a2 * il2) + yy * rr) * il2 - ra;
    }, (ax + bx) / 2, (ay + by) / 2, (az + bz) / 2, Math.sqrt(l2) / 2 + Math.max(ra, rb));
  };
  // união suave (k = largura da "solda" em metros)
  S.smin = function (a, b, k) {
    var h = Math.max(k - Math.abs(a - b), 0) / k;
    return Math.min(a, b) - h * h * k * 0.25;
  };
  S.smax = function (a, b, k) { return -S.smin(-a, -b, k); };

  // Junta uma lista de partes { f, k, tag, sub } num campo só. Devolve a função
  // e, se pedido, qual parte está mais perto (para cor e região).
  S.union = function (parts) {
    var n = parts.length, BX = new Float64Array(n), BY = new Float64Array(n), BZ = new Float64Array(n), BR = new Float64Array(n);
    var F = [], K = new Float64Array(n), SUB = new Uint8Array(n);
    for (var q = 0; q < n; q++) {
      var b = parts[q].f.b;
      if (b) { BX[q] = b[0]; BY[q] = b[1]; BZ[q] = b[2]; BR[q] = b[3]; } else BR[q] = -1;
      F.push(parts[q].f); K[q] = parts[q].k || 0; SUB[q] = parts[q].sub ? 1 : 0;
    }
    // a esfera que envolve cada parte dá um limite inferior da distância: as partes
    // longe demais para mudar o resultado nem são calculadas (sem raiz quadrada)
    var field = function (x, y, z) {
      var d = 1e9;
      for (var i = 0; i < n; i++) {
        var k = K[i];
        if (BR[i] >= 0) {
          var dx = x - BX[i], dy = y - BY[i], dz = z - BZ[i], lim = (SUB[i] ? (k || 0.004) : d + k) + BR[i];
          if (lim > 0 && dx * dx + dy * dy + dz * dz > lim * lim) continue;
        }
        var v = F[i](x, y, z);
        if (SUB[i]) d = S.smax(d, -v, k || 0.004);
        else if (k) { var hh = k - Math.abs(d - v); d = hh > 0 ? Math.min(d, v) - hh * hh * 0.25 / k : Math.min(d, v); }
        else if (v < d) d = v;
      }
      return d;
    };
    field.nearest = function (x, y, z) {
      var best = null, bd = 1e9;
      for (var i = 0; i < n; i++) {
        if (SUB[i] || parts[i].noTag) continue;
        if (BR[i] >= 0) {
          var dx = x - BX[i], dy = y - BY[i], dz = z - BZ[i], lim = bd + BR[i];
          if (lim > 0 && dx * dx + dy * dy + dz * dz > lim * lim) continue;
        }
        var v = F[i](x, y, z);
        if (v < bd) { bd = v; best = parts[i]; }
      }
      return best;
    };
    return field;
  };

  // ---------------------------------------------------------------- ruído (dobras, cachos, mechas)
  function hash(i, j, k) {
    var h = (i * 374761393 + j * 668265263 + k * 1274126177) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }
  S.noise = function (x, y, z) {
    var i = Math.floor(x), j = Math.floor(y), k = Math.floor(z), fx = x - i, fy = y - j, fz = z - k;
    var ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy), uz = fz * fz * (3 - 2 * fz);
    var a = hash(i, j, k), b = hash(i + 1, j, k), c = hash(i, j + 1, k), d = hash(i + 1, j + 1, k);
    var e = hash(i, j, k + 1), f = hash(i + 1, j, k + 1), g = hash(i, j + 1, k + 1), h = hash(i + 1, j + 1, k + 1);
    var x1 = a + (b - a) * ux, x2 = c + (d - c) * ux, x3 = e + (f - e) * ux, x4 = g + (h - g) * ux;
    var y1 = x1 + (x2 - x1) * uy, y2 = x3 + (x4 - x3) * uy;
    return (y1 + (y2 - y1) * uz) * 2 - 1;
  };

  // ---------------------------------------------------------------- malha (surface nets)
  // field(x, y, z) < 0 dentro. box = [x0, y0, z0, x1, y1, z1]; h = tamanho da célula.
  // Devolve { pos: Float32Array, nor: Float32Array, index: Uint32Array, n }.
  S.mesh = function (field, box, h) {
    var x0 = box[0] - h, y0 = box[1] - h, z0 = box[2] - h;
    var nx = Math.ceil((box[3] - box[0]) / h) + 3, ny = Math.ceil((box[4] - box[1]) / h) + 3, nz = Math.ceil((box[5] - box[2]) / h) + 3;
    var nxy = nx * ny, grid = new Float32Array(nxy * nz), i, j, k, idx;
    // grade grossa primeiro (de 4 em 4); só refina os blocos perto da superfície
    var B4 = 4, cx = Math.ceil((nx - 1) / B4) + 1, cy = Math.ceil((ny - 1) / B4) + 1, cz = Math.ceil((nz - 1) / B4) + 1;
    var coarse = new Float32Array(cx * cy * cz), near = h * B4 * 1.9;
    for (k = 0; k < cz; k++) for (j = 0; j < cy; j++) for (i = 0; i < cx; i++) coarse[i + j * cx + k * cx * cy] = field(x0 + i * B4 * h, y0 + j * B4 * h, z0 + k * B4 * h);
    for (var bk = 0; bk < cz - 1; bk++) for (var bj = 0; bj < cy - 1; bj++) for (var bi = 0; bi < cx - 1; bi++) {
      var mn = 1e9, sg = 0;
      for (var q = 0; q < 8; q++) {
        var cvv = coarse[(bi + (q & 1)) + (bj + ((q >> 1) & 1)) * cx + (bk + (q >> 2)) * cx * cy];
        mn = Math.min(mn, Math.abs(cvv)); sg = cvv;
      }
      var fine = mn < near, fill = sg < 0 ? -near : near;
      for (k = bk * B4; k <= Math.min(nz - 1, bk * B4 + B4); k++) for (j = bj * B4; j <= Math.min(ny - 1, bj * B4 + B4); j++) for (i = bi * B4; i <= Math.min(nx - 1, bi * B4 + B4); i++) {
        idx = i + j * nx + k * nxy;
        if (fine) grid[idx] = field(x0 + i * h, y0 + j * h, z0 + k * h);
        else if (grid[idx] === 0) grid[idx] = fill;
      }
    }
    var cellV = new Int32Array(nxy * nz).fill(-1), P = [];
    var corner = [[0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0], [0, 0, 1], [1, 0, 1], [0, 1, 1], [1, 1, 1]];
    var edges = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];
    var cv = new Float32Array(8);
    for (k = 0; k < nz - 1; k++) for (j = 0; j < ny - 1; j++) for (i = 0; i < nx - 1; i++) {
      var inside = 0;
      for (var c = 0; c < 8; c++) { cv[c] = grid[(i + corner[c][0]) + (j + corner[c][1]) * nx + (k + corner[c][2]) * nxy]; if (cv[c] < 0) inside++; }
      if (inside === 0 || inside === 8) continue;
      var sx = 0, sy = 0, sz = 0, cnt = 0;
      for (var e = 0; e < 12; e++) {
        var a = edges[e][0], b = edges[e][1], va = cv[a], vb = cv[b];
        if ((va < 0) === (vb < 0)) continue;
        var t = va / (va - vb);
        sx += corner[a][0] + (corner[b][0] - corner[a][0]) * t;
        sy += corner[a][1] + (corner[b][1] - corner[a][1]) * t;
        sz += corner[a][2] + (corner[b][2] - corner[a][2]) * t;
        cnt++;
      }
      cellV[i + j * nx + k * nxy] = P.length / 3;
      P.push(x0 + (i + sx / cnt) * h, y0 + (j + sy / cnt) * h, z0 + (k + sz / cnt) * h);
    }
    // faces: cada aresta da grade que cruza a superfície vira um quadrilátero
    var I = [];
    function quad(a, b, c, d, flip) {
      if (a < 0 || b < 0 || c < 0 || d < 0) return;
      if (flip) I.push(a, c, b, a, d, c); else I.push(a, b, c, a, c, d);
    }
    for (k = 1; k < nz - 1; k++) for (j = 1; j < ny - 1; j++) for (i = 1; i < nx - 1; i++) {
      idx = i + j * nx + k * nxy;
      var v0 = grid[idx], in0 = v0 < 0;
      if (i < nx - 1 && (grid[idx + 1] < 0) !== in0)       // aresta em x
        quad(cellV[idx], cellV[idx - nx], cellV[idx - nx - nxy], cellV[idx - nxy], !in0);
      if (j < ny - 1 && (grid[idx + nx] < 0) !== in0)      // aresta em y
        quad(cellV[idx], cellV[idx - nxy], cellV[idx - 1 - nxy], cellV[idx - 1], !in0);
      if (k < nz - 1 && (grid[idx + nxy] < 0) !== in0)     // aresta em z
        quad(cellV[idx], cellV[idx - 1], cellV[idx - 1 - nx], cellV[idx - nx], !in0);
    }
    // puxa cada vértice para a superfície e calcula a normal pelo gradiente
    var n = P.length / 3, pos = new Float32Array(P), nor = new Float32Array(n * 3), eps = h * 0.3;
    for (var v = 0; v < n; v++) {
      var px = pos[v * 3], py = pos[v * 3 + 1], pz = pos[v * 3 + 2];
      var d0 = field(px, py, pz);
      var gx = field(px + eps, py, pz) - d0, gy = field(px, py + eps, pz) - d0, gz = field(px, py, pz + eps) - d0;
      var gl = Math.sqrt(gx * gx + gy * gy + gz * gz) || 1;
      gx /= gl; gy /= gl; gz /= gl;
      var step = Math.max(-h * 0.5, Math.min(h * 0.5, d0));
      px -= gx * step; py -= gy * step; pz -= gz * step;
      // normal no ponto final (diferença central: sombreado liso)
      gx = field(px + eps, py, pz) - field(px - eps, py, pz);
      gy = field(px, py + eps, pz) - field(px, py - eps, pz);
      gz = field(px, py, pz + eps) - field(px, py, pz - eps);
      gl = Math.sqrt(gx * gx + gy * gy + gz * gz) || 1;
      pos[v * 3] = px; pos[v * 3 + 1] = py; pos[v * 3 + 2] = pz;
      nor[v * 3] = gx / gl; nor[v * 3 + 1] = gy / gl; nor[v * 3 + 2] = gz / gl;
    }
    return { pos: pos, nor: nor, index: new Uint32Array(I), n: n };
  };

  // oclusão de ambiente pelo campo (occ: campo dos "vizinhos" que fazem sombra)
  S.ao = function (occ, x, y, z, nx, ny, nz, scale) {
    var o = 0, w = 1, st = scale || 0.016;
    for (var i = 1; i <= 3; i++) {
      var d = i * st, v = occ(x + nx * d, y + ny * d, z + nz * d);
      o += (d - Math.min(d, v)) * w;
      w *= 0.55;
    }
    return Math.max(0.4, Math.min(1, 1 - o / st * 0.55));
  };
})(window.EP);
