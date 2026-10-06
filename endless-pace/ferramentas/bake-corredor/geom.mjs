// Geometria offline: solda, vizinhança, normais, BVH (ponto mais próximo e raio), suavização,
// ruído determinístico e utilidades de malha.

export const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
export const smoothstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
export function smax(a, b, k = 0.01) { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.max(a, b) + h * h * k * 0.25; }
export function smin(a, b, k = 0.01) { return -smax(-a, -b, k); }

// gerador com semente (mulberry32) — mesmo do jogo (EP.util.rng)
export function rng(seed) {
  let s = (seed >>> 0) || 1;
  return () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function seedOf(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

function hash3(i, j, k, seed) {
  let h = (i * 374761393 + j * 668265263 + k * 1274126177 + seed * 2246822519) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
// ruído de valor 3D em [-1, 1]
export function noise3(x, y, z, seed = 0) {
  const i = Math.floor(x), j = Math.floor(y), k = Math.floor(z), fx = x - i, fy = y - j, fz = z - k;
  const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy), uz = fz * fz * (3 - 2 * fz);
  const a = hash3(i, j, k, seed), b = hash3(i + 1, j, k, seed), c = hash3(i, j + 1, k, seed), d = hash3(i + 1, j + 1, k, seed);
  const e = hash3(i, j, k + 1, seed), f = hash3(i + 1, j, k + 1, seed), g = hash3(i, j + 1, k + 1, seed), h = hash3(i + 1, j + 1, k + 1, seed);
  const x1 = a + (b - a) * ux, x2 = c + (d - c) * ux, x3 = e + (f - e) * ux, x4 = g + (h - g) * ux;
  const y1 = x1 + (x2 - x1) * uy, y2 = x3 + (x4 - x3) * uy;
  return (y1 + (y2 - y1) * uz) * 2 - 1;
}
// Worley F1 (distância ao ponto de célula mais próximo), células de tamanho 1
export function worley(x, y, z, seed = 0) {
  const i0 = Math.floor(x), j0 = Math.floor(y), k0 = Math.floor(z);
  let best = 9;
  for (let i = i0 - 1; i <= i0 + 1; i++) for (let j = j0 - 1; j <= j0 + 1; j++) for (let k = k0 - 1; k <= k0 + 1; k++) {
    const px = i + hash3(i, j, k, seed), py = j + hash3(i, j, k, seed + 17), pz = k + hash3(i, j, k, seed + 31);
    const d = Math.hypot(px - x, py - y, pz - z);
    if (d < best) best = d;
  }
  return best;
}

// ---------------------------------------------------------------- solda e vizinhança
export function weld(pos, n, eps = 1e-5) {
  const key = i => Math.round(pos[i * 3] / eps) + ',' + Math.round(pos[i * 3 + 1] / eps) + ',' + Math.round(pos[i * 3 + 2] / eps);
  const map = new Map(), wid = new Int32Array(n), rep = [];
  for (let i = 0; i < n; i++) {
    const k = key(i);
    let w = map.get(k);
    if (w === undefined) { w = rep.length; map.set(k, w); rep.push(i); }
    wid[i] = w;
  }
  return { wid, nw: rep.length, rep: Int32Array.from(rep) };
}

// vizinhos (CSR) a partir de triângulos
export function neighbors(idx, nv) {
  const sets = Array.from({ length: nv }, () => new Set());
  for (let t = 0; t < idx.length; t += 3) for (let e = 0; e < 3; e++) {
    const a = idx[t + e], b = idx[t + (e + 1) % 3];
    sets[a].add(b); sets[b].add(a);
  }
  const off = new Int32Array(nv + 1);
  for (let i = 0; i < nv; i++) off[i + 1] = off[i] + sets[i].size;
  const nb = new Int32Array(off[nv]);
  for (let i = 0; i < nv; i++) { let k = off[i]; for (const j of sets[i]) nb[k++] = j; }
  return { off, nb };
}

export function vertexNormals(pos, idx, nv) {
  const nor = new Float64Array(nv * 3);
  for (let t = 0; t < idx.length; t += 3) {
    const a = idx[t] * 3, b = idx[t + 1] * 3, c = idx[t + 2] * 3;
    const ux = pos[b] - pos[a], uy = pos[b + 1] - pos[a + 1], uz = pos[b + 2] - pos[a + 2];
    const vx = pos[c] - pos[a], vy = pos[c + 1] - pos[a + 1], vz = pos[c + 2] - pos[a + 2];
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    for (const q of [a, b, c]) { nor[q] += nx; nor[q + 1] += ny; nor[q + 2] += nz; }
  }
  for (let i = 0; i < nv; i++) {
    const l = Math.hypot(nor[i * 3], nor[i * 3 + 1], nor[i * 3 + 2]) || 1;
    nor[i * 3] /= l; nor[i * 3 + 1] /= l; nor[i * 3 + 2] /= l;
  }
  return nor;
}

// Taubin (laplaciano uniforme) com força por vértice m[i] em [0, 1]
export function taubin(pos, adj, m, iters, lam = 0.5, mu = -0.53) {
  const nv = m.length, tmp = new Float64Array(pos.length);
  const step = k => {
    tmp.set(pos);
    for (let i = 0; i < nv; i++) {
      if (m[i] < 1e-3) continue;
      const o0 = adj.off[i], o1 = adj.off[i + 1], c = o1 - o0;
      if (!c) continue;
      let sx = 0, sy = 0, sz = 0;
      for (let q = o0; q < o1; q++) { const j = adj.nb[q] * 3; sx += pos[j]; sy += pos[j + 1]; sz += pos[j + 2]; }
      const w = k * m[i];
      tmp[i * 3] = pos[i * 3] + w * (sx / c - pos[i * 3]);
      tmp[i * 3 + 1] = pos[i * 3 + 1] + w * (sy / c - pos[i * 3 + 1]);
      tmp[i * 3 + 2] = pos[i * 3 + 2] + w * (sz / c - pos[i * 3 + 2]);
    }
    pos.set(tmp);
  };
  for (let it = 0; it < iters; it++) { step(lam); step(mu); }
}

// suaviza um campo escalar/vetorial sobre o grafo
export function smoothField(field, dim, adj, iters, lam = 0.5, fixed = null) {
  const nv = adj.off.length - 1, tmp = new Float64Array(field.length);
  for (let it = 0; it < iters; it++) {
    tmp.set(field);
    for (let i = 0; i < nv; i++) {
      if (fixed && fixed[i]) continue;
      const o0 = adj.off[i], o1 = adj.off[i + 1], c = o1 - o0;
      if (!c) continue;
      for (let d = 0; d < dim; d++) {
        let s = 0;
        for (let q = o0; q < o1; q++) s += field[adj.nb[q] * dim + d];
        tmp[i * dim + d] = field[i * dim + d] + lam * (s / c - field[i * dim + d]);
      }
    }
    field.set(tmp);
  }
}

// arestas de borda (usadas por um triângulo só) → laços ordenados
export function boundaryLoops(idx) {
  const cnt = new Map();
  const k = (a, b) => a < b ? a + '_' + b : b + '_' + a;
  for (let t = 0; t < idx.length; t += 3) for (let e = 0; e < 3; e++) {
    const a = idx[t + e], b = idx[t + (e + 1) % 3], kk = k(a, b);
    const c = cnt.get(kk);
    if (c) c.n++; else cnt.set(kk, { n: 1, a, b });
  }
  const next = new Map();
  for (const v of cnt.values()) if (v.n === 1) next.set(v.a, v.b);   // orientação do triângulo
  const loops = [], seen = new Set();
  for (const s of next.keys()) {
    if (seen.has(s)) continue;
    const loop = [];
    let c = s;
    while (c !== undefined && !seen.has(c)) { seen.add(c); loop.push(c); c = next.get(c); }
    loops.push(loop);
  }
  return loops;
}

// componentes conexas por triângulo
export function components(idx, nv) {
  const par = Int32Array.from({ length: nv }, (_, i) => i);
  const f = x => { while (par[x] !== x) { par[x] = par[par[x]]; x = par[x]; } return x; };
  for (let t = 0; t < idx.length; t += 3) { const a = f(idx[t]); par[f(idx[t + 1])] = a; par[f(idx[t + 2])] = a; }
  const comp = new Int32Array(idx.length / 3);
  const ids = new Map();
  for (let t = 0; t < idx.length; t += 3) { const r = f(idx[t]); if (!ids.has(r)) ids.set(r, ids.size); comp[t / 3] = ids.get(r); }
  return { comp, count: ids.size };
}

// tira vértices não usados; devolve { idx, map (antigo→novo), back (novo→antigo) }
export function compact(idx, nv) {
  const map = new Int32Array(nv).fill(-1), back = [];
  const out = new Uint32Array(idx.length);
  for (let i = 0; i < idx.length; i++) {
    const v = idx[i];
    if (map[v] < 0) { map[v] = back.length; back.push(v); }
    out[i] = map[v];
  }
  return { idx: out, map, back: Int32Array.from(back) };
}

// ---------------------------------------------------------------- BVH de triângulos
export class BVH {
  constructor(pos, idx, triFilter = null) {
    this.pos = pos; this.idx = idx;
    const tris = [];
    for (let t = 0; t < idx.length / 3; t++) if (!triFilter || triFilter(t)) tris.push(t);
    const nt = tris.length, cen = new Float64Array(nt * 3), bb = new Float64Array(nt * 6);
    for (let q = 0; q < nt; q++) {
      const t = tris[q];
      let mnx = 1e9, mny = 1e9, mnz = 1e9, mxx = -1e9, mxy = -1e9, mxz = -1e9;
      for (let e = 0; e < 3; e++) {
        const v = idx[t * 3 + e] * 3, x = pos[v], y = pos[v + 1], z = pos[v + 2];
        if (x < mnx) mnx = x; if (y < mny) mny = y; if (z < mnz) mnz = z;
        if (x > mxx) mxx = x; if (y > mxy) mxy = y; if (z > mxz) mxz = z;
      }
      bb.set([mnx, mny, mnz, mxx, mxy, mxz], q * 6);
      cen[q * 3] = (mnx + mxx) / 2; cen[q * 3 + 1] = (mny + mxy) / 2; cen[q * 3 + 2] = (mnz + mxz) / 2;
    }
    const order = Int32Array.from({ length: nt }, (_, i) => i);
    const nodes = [];   // { b: [6], l, r, s, c }
    const build = (s, e) => {
      const b = [1e9, 1e9, 1e9, -1e9, -1e9, -1e9];
      for (let q = s; q < e; q++) { const o = order[q] * 6; for (let k = 0; k < 3; k++) { b[k] = Math.min(b[k], bb[o + k]); b[k + 3] = Math.max(b[k + 3], bb[o + k + 3]); } }
      const id = nodes.length;
      nodes.push({ b, l: -1, r: -1, s, c: e - s });
      if (e - s <= 4) return id;
      let ax = 0, ext = -1;
      for (let k = 0; k < 3; k++) if (b[k + 3] - b[k] > ext) { ext = b[k + 3] - b[k]; ax = k; }
      const sub = Array.from(order.subarray(s, e)).sort((a, c) => cen[a * 3 + ax] - cen[c * 3 + ax]);
      order.set(sub, s);
      const m = (s + e) >> 1;
      nodes[id].l = build(s, m); nodes[id].r = build(m, e); nodes[id].c = 0;
      return id;
    };
    if (nt) build(0, nt);
    this.tris = Int32Array.from(order, q => tris[q]);
    const nn = nodes.length;
    this.nb = new Float64Array(nn * 6); this.nl = new Int32Array(nn); this.nr = new Int32Array(nn); this.ns = new Int32Array(nn); this.nc = new Int32Array(nn);
    nodes.forEach((n, i) => { this.nb.set(n.b, i * 6); this.nl[i] = n.l; this.nr[i] = n.r; this.ns[i] = n.s; this.nc[i] = n.c; });
    this.empty = nt === 0;
  }
  // ponto mais próximo: { d, x, y, z, tri, u, v, w } (u,v,w = baricêntricas dos cantos 0,1,2)
  closest(px, py, pz, maxD = Infinity) {
    const res = { d: maxD, x: 0, y: 0, z: 0, tri: -1, u: 0, v: 0, w: 0 };
    if (this.empty) return res;
    let best2 = maxD === Infinity ? Infinity : maxD * maxD;
    const stack = [0], nb = this.nb, pos = this.pos, idx = this.idx;
    while (stack.length) {
      const n = stack.pop(), o = n * 6;
      const dx = Math.max(nb[o] - px, 0, px - nb[o + 3]), dy = Math.max(nb[o + 1] - py, 0, py - nb[o + 4]), dz = Math.max(nb[o + 2] - pz, 0, pz - nb[o + 5]);
      if (dx * dx + dy * dy + dz * dz >= best2) continue;
      if (this.nc[n]) {
        for (let q = this.ns[n]; q < this.ns[n] + this.nc[n]; q++) {
          const t = this.tris[q];
          const r = closestOnTri(px, py, pz, pos, idx[t * 3], idx[t * 3 + 1], idx[t * 3 + 2]);
          if (r[0] < best2) { best2 = r[0]; res.tri = t; res.x = r[1]; res.y = r[2]; res.z = r[3]; res.u = r[4]; res.v = r[5]; res.w = r[6]; }
        }
      } else { stack.push(this.nl[n], this.nr[n]); }
    }
    res.d = Math.sqrt(best2);
    return res;
  }
  // raio: primeiro acerto { t, tri, u, v } ou null (dos dois lados)
  ray(ox, oy, oz, dx, dy, dz, tmax = Infinity, skip = -1) {
    if (this.empty) return null;
    let best = tmax, bt = -1, bu = 0, bv = 0;
    const ix = 1 / dx, iy = 1 / dy, iz = 1 / dz, nb = this.nb, pos = this.pos, idx = this.idx;
    const stack = [0];
    while (stack.length) {
      const n = stack.pop(), o = n * 6;
      let t0 = (nb[o] - ox) * ix, t1 = (nb[o + 3] - ox) * ix;
      let tmin = Math.min(t0, t1), tmx = Math.max(t0, t1);
      t0 = (nb[o + 1] - oy) * iy; t1 = (nb[o + 4] - oy) * iy;
      tmin = Math.max(tmin, Math.min(t0, t1)); tmx = Math.min(tmx, Math.max(t0, t1));
      t0 = (nb[o + 2] - oz) * iz; t1 = (nb[o + 5] - oz) * iz;
      tmin = Math.max(tmin, Math.min(t0, t1)); tmx = Math.min(tmx, Math.max(t0, t1));
      if (tmx < Math.max(tmin, 0) || tmin > best) continue;
      if (this.nc[n]) {
        for (let q = this.ns[n]; q < this.ns[n] + this.nc[n]; q++) {
          const t = this.tris[q];
          if (t === skip) continue;
          const a = idx[t * 3] * 3, b = idx[t * 3 + 1] * 3, c = idx[t * 3 + 2] * 3;
          const e1x = pos[b] - pos[a], e1y = pos[b + 1] - pos[a + 1], e1z = pos[b + 2] - pos[a + 2];
          const e2x = pos[c] - pos[a], e2y = pos[c + 1] - pos[a + 1], e2z = pos[c + 2] - pos[a + 2];
          const px = dy * e2z - dz * e2y, py = dz * e2x - dx * e2z, pz = dx * e2y - dy * e2x;
          const det = e1x * px + e1y * py + e1z * pz;
          if (Math.abs(det) < 1e-14) continue;
          const inv = 1 / det, sx = ox - pos[a], sy = oy - pos[a + 1], sz = oz - pos[a + 2];
          const u = (sx * px + sy * py + sz * pz) * inv;
          if (u < 0 || u > 1) continue;
          const qx = sy * e1z - sz * e1y, qy = sz * e1x - sx * e1z, qz = sx * e1y - sy * e1x;
          const v = (dx * qx + dy * qy + dz * qz) * inv;
          if (v < 0 || u + v > 1) continue;
          const tt = (e2x * qx + e2y * qy + e2z * qz) * inv;
          if (tt > 1e-6 && tt < best) { best = tt; bt = t; bu = u; bv = v; }
        }
      } else stack.push(this.nl[n], this.nr[n]);
    }
    return bt < 0 ? null : { t: best, tri: bt, u: bu, v: bv };
  }
}

// Ericson, "Real-Time Collision Detection" 5.1.5 — devolve [d², x, y, z, wa, wb, wc]
function closestOnTri(px, py, pz, pos, ia, ib, ic) {
  const a = ia * 3, b = ib * 3, c = ic * 3;
  const ax = pos[a], ay = pos[a + 1], az = pos[a + 2];
  const abx = pos[b] - ax, aby = pos[b + 1] - ay, abz = pos[b + 2] - az;
  const acx = pos[c] - ax, acy = pos[c + 1] - ay, acz = pos[c + 2] - az;
  const apx = px - ax, apy = py - ay, apz = pz - az;
  const d1 = abx * apx + aby * apy + abz * apz, d2 = acx * apx + acy * apy + acz * apz;
  let wa, wb, wc;
  if (d1 <= 0 && d2 <= 0) { wa = 1; wb = 0; wc = 0; } else {
    const bpx = px - pos[b], bpy = py - pos[b + 1], bpz = pz - pos[b + 2];
    const d3 = abx * bpx + aby * bpy + abz * bpz, d4 = acx * bpx + acy * bpy + acz * bpz;
    if (d3 >= 0 && d4 <= d3) { wa = 0; wb = 1; wc = 0; } else {
      const vc = d1 * d4 - d3 * d2;
      if (vc <= 0 && d1 >= 0 && d3 <= 0) { const v = d1 / (d1 - d3); wa = 1 - v; wb = v; wc = 0; } else {
        const cpx = px - pos[c], cpy = py - pos[c + 1], cpz = pz - pos[c + 2];
        const d5 = abx * cpx + aby * cpy + abz * cpz, d6 = acx * cpx + acy * cpy + acz * cpz;
        if (d6 >= 0 && d5 <= d6) { wa = 0; wb = 0; wc = 1; } else {
          const vb = d5 * d2 - d1 * d6;
          if (vb <= 0 && d2 >= 0 && d6 <= 0) { const w = d2 / (d2 - d6); wa = 1 - w; wb = 0; wc = w; } else {
            const va = d3 * d6 - d5 * d4;
            if (va <= 0 && (d4 - d3) >= 0 && (d5 - d6) >= 0) { const w = (d4 - d3) / ((d4 - d3) + (d5 - d6)); wa = 0; wb = 1 - w; wc = w; } else {
              const den = 1 / (va + vb + vc), v = vb * den, w = vc * den; wa = 1 - v - w; wb = v; wc = w;
            }
          }
        }
      }
    }
  }
  const x = ax + abx * wb + acx * wc, y = ay + aby * wb + acy * wc, z = az + abz * wb + acz * wc;
  const dx = px - x, dy = py - y, dz = pz - z;
  return [dx * dx + dy * dy + dz * dz, x, y, z, wa, wb, wc];
}

// direções no hemisfério (cosseno), determinísticas
export function hemiDirs(n, seed = 7) {
  const r = rng(seed), out = [];
  for (let i = 0; i < n; i++) {
    const u = (i + r()) / n, v = r();
    const rr = Math.sqrt(u), th = 2 * Math.PI * v;
    out.push([rr * Math.cos(th), rr * Math.sin(th), Math.sqrt(Math.max(0, 1 - u))]);
  }
  return out;
}
// base ortonormal com z = n
export function basis(nx, ny, nz) {
  const t = Math.abs(nx) < 0.9 ? [1, 0, 0] : [0, 1, 0];
  let ux = t[1] * nz - t[2] * ny, uy = t[2] * nx - t[0] * nz, uz = t[0] * ny - t[1] * nx;
  const l = Math.hypot(ux, uy, uz); ux /= l; uy /= l; uz /= l;
  return [[ux, uy, uz], [ny * uz - nz * uy, nz * ux - nx * uz, nx * uy - ny * ux]];
}
// oclusão por raios: ao = 1 - k * fração ocluída
export function rayAO(bvhs, pos, nor, nv, { rays = 24, maxD = 0.25, k = 0.6, offset = 0.0015, seed = 7 } = {}) {
  const dirs = hemiDirs(rays, seed), ao = new Float32Array(nv);
  for (let i = 0; i < nv; i++) {
    const nx = nor[i * 3], ny = nor[i * 3 + 1], nz = nor[i * 3 + 2];
    const [tu, tv] = basis(nx, ny, nz);
    const ox = pos[i * 3] + nx * offset, oy = pos[i * 3 + 1] + ny * offset, oz = pos[i * 3 + 2] + nz * offset;
    let occ = 0;
    for (const d of dirs) {
      const dx = tu[0] * d[0] + tv[0] * d[1] + nx * d[2], dy = tu[1] * d[0] + tv[1] * d[1] + ny * d[2], dz = tu[2] * d[0] + tv[2] * d[1] + nz * d[2];
      for (const b of bvhs) { const h = b.ray(ox, oy, oz, dx, dy, dz, maxD); if (h) { occ += 1 - (h.t / maxD) * 0.5; break; } }
    }
    ao[i] = 1 - k * occ / rays;
  }
  return ao;
}
