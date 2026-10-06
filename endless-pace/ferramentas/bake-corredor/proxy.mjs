// Corpo "procurador" das roupas (v4): campo de distância com sinal do corpo numa grade de voxels, com abertura
// morfológica (arredonda mamilo, ponta do busto, peitoral, abdômen) e fechamento (preenche o vão sob o busto, o
// decote, o umbigo, o "V" da virilha e o sulco dos glúteos). As roupas saem dessa superfície, não da pele detalhada.
//
//   occupancy  dentro/fora por varredura em linhas (paridade dos cruzamentos, maioria dos três eixos)
//   edt        transformada de distância euclidiana exata (Felzenszwalb & Huttenlocher), separável
//   morph      abertura (erosão → dilatação) e fechamento (dilatação → erosão) com bola de raio r
//   sdf        distância com sinal (m), alisada por gaussiana separável; amostragem trilinear
import { BVH, clamp } from './geom.mjs';

export class Grid {
  constructor(box, h) {
    this.h = h; this.x0 = box[0]; this.y0 = box[1]; this.z0 = box[2];
    this.nx = Math.ceil((box[3] - box[0]) / h) + 1; this.ny = Math.ceil((box[4] - box[1]) / h) + 1; this.nz = Math.ceil((box[5] - box[2]) / h) + 1;
    this.n = this.nx * this.ny * this.nz;
  }
  id(i, j, k) { return i + this.nx * (j + this.ny * k); }
  pos(i, j, k) { return [this.x0 + i * this.h, this.y0 + j * this.h, this.z0 + k * this.h]; }
}

// todos os cruzamentos de um raio com a malha (t crescente)
function rayAll(bvh, o, d, tmax) {
  const out = [];
  let t0 = 0;
  for (let g = 0; g < 64; g++) {
    const h = bvh.ray(o[0] + d[0] * t0, o[1] + d[1] * t0, o[2] + d[2] * t0, d[0], d[1], d[2], tmax - t0);
    if (!h) break;
    out.push(t0 + h.t);
    t0 += h.t + 1e-5;
  }
  return out;
}

// dentro/fora de uma malha fechada: varredura nos três eixos, paridade dos cruzamentos, voto da maioria
export function occupancy(P, idx, G) {
  const bvh = new BVH(P, idx), votes = new Uint8Array(G.n), { nx, ny, nz, h } = G;
  const jit = [1.37e-4, 2.11e-4];   // tira o raio de cima de vértices e arestas
  const scan = (axis) => {
    const [a, b] = axis === 0 ? [1, 2] : axis === 1 ? [0, 2] : [0, 1];
    const N = [nx, ny, nz], O = [G.x0, G.y0, G.z0];
    for (let u = 0; u < N[a]; u++) for (let v = 0; v < N[b]; v++) {
      const o = [0, 0, 0], d = [0, 0, 0];
      o[a] = O[a] + u * h + jit[0]; o[b] = O[b] + v * h + jit[1]; o[axis] = O[axis] - 0.05; d[axis] = 1;
      const L = N[axis] * h + 0.1, ts = rayAll(bvh, o, d, L);
      if (ts.length < 2) continue;
      let inside = false, q = 0;
      for (let w = 0; w < N[axis]; w++) {
        const t = 0.05 + w * h;
        while (q < ts.length && ts[q] <= t) { inside = !inside; q++; }
        if (inside) { const c = [0, 0, 0]; c[a] = u; c[b] = v; c[axis] = w; votes[G.id(c[0], c[1], c[2])]++; }
      }
    }
  };
  scan(0); scan(1); scan(2);
  const occ = new Uint8Array(G.n);
  for (let i = 0; i < G.n; i++) occ[i] = votes[i] >= 2 ? 1 : 0;
  return occ;
}

// distância euclidiana ao quadrado (em voxels) até o voxel marcado mais próximo
const INF = 1e20;
function edt1(f, n, d, v, z) {
  let k = 0; v[0] = 0; z[0] = -INF; z[1] = INF;
  const sOf = (q, p) => ((f[q] + q * q) - (f[p] + p * p)) / (2 * q - 2 * p);
  for (let q = 1; q < n; q++) {
    let s = sOf(q, v[k]);
    while (s <= z[k]) { k--; s = sOf(q, v[k]); }
    k++; v[k] = q; z[k] = s; z[k + 1] = INF;
  }
  k = 0;
  for (let q = 0; q < n; q++) { while (z[k + 1] < q) k++; const p = v[k]; d[q] = (q - p) * (q - p) + f[p]; }
}
export function edt(G, mark) {
  const { nx, ny, nz } = G, D = new Float64Array(G.n), m = Math.max(nx, ny, nz);
  const f = new Float64Array(m), d = new Float64Array(m), v = new Int32Array(m), z = new Float64Array(m + 1);
  for (let i = 0; i < G.n; i++) D[i] = mark[i] ? 0 : INF;
  const pass = (n, stride, starts) => {
    for (const s of starts) {
      let any = false;
      for (let q = 0; q < n; q++) { f[q] = D[s + q * stride]; if (f[q] < INF) any = true; }
      if (!any) continue;
      edt1(f, n, d, v, z);
      for (let q = 0; q < n; q++) D[s + q * stride] = d[q];
    }
  };
  const sx = [], sy = [], sz = [];
  for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) sx.push(G.id(0, j, k));
  for (let k = 0; k < nz; k++) for (let i = 0; i < nx; i++) sy.push(G.id(i, 0, k));
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) sz.push(G.id(i, j, 0));
  pass(nx, 1, sx); pass(ny, nx, sy); pass(nz, nx * ny, sz);
  return D;
}

// dilatação / erosão por bola de raio r (m)
export function dilate(G, occ, r) { const D = edt(G, occ), r2 = (r / G.h) ** 2, o = new Uint8Array(G.n); for (let i = 0; i < G.n; i++) o[i] = D[i] <= r2 ? 1 : 0; return o; }
export function erode(G, occ, r) { const inv = Uint8Array.from(occ, x => 1 - x), D = edt(G, inv), r2 = (r / G.h) ** 2, o = new Uint8Array(G.n); for (let i = 0; i < G.n; i++) o[i] = occ[i] && D[i] > r2 ? 1 : 0; return o; }
export const opening = (G, occ, r) => r > 0 ? dilate(G, erode(G, occ, r), r) : occ;
export const closing = (G, occ, r) => r > 0 ? erode(G, dilate(G, occ, r), r) : occ;

// distância com sinal (m; negativa dentro), alisada (gaussiana separável, sigma em voxels)
export function sdf(G, occ, sigma = 1.2, sigmaY = sigma) {
  const Dout = edt(G, occ), Din = edt(G, Uint8Array.from(occ, x => 1 - x)), S = new Float32Array(G.n), h = G.h;
  for (let i = 0; i < G.n; i++) S[i] = occ[i] ? -(Math.sqrt(Din[i]) - 0.5) * h : (Math.sqrt(Dout[i]) - 0.5) * h;
  if (sigma > 0) blur3(G, S, sigma, sigmaY);
  return S;
}
// gaussiana separável; sigmaY (vertical) pode ser maior (arco do fundilho mais suave)
export function blur3(G, S, sigma, sigmaY = sigma) {
  const ker = sg => { const R = Math.ceil(sg * 2.5), w = []; let ws = 0; for (let k = -R; k <= R; k++) { const v = Math.exp(-k * k / (2 * sg * sg)); w.push(v); ws += v; } return { R, w: w.map(v => v / ws) }; };
  const KX = ker(sigma), KY = ker(sigmaY);
  const { nx, ny, nz } = G, tmp = new Float32Array(Math.max(nx, ny, nz));
  const line = (s, n, st, K) => { const { R, w } = K; for (let q = 0; q < n; q++) { let a = 0; for (let k = -R; k <= R; k++) a += w[k + R] * S[s + clamp(q + k, 0, n - 1) * st]; tmp[q] = a; } for (let q = 0; q < n; q++) S[s + q * st] = tmp[q]; };
  for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) line(G.id(0, j, k), nx, 1, KX);
  for (let k = 0; k < nz; k++) for (let i = 0; i < nx; i++) line(G.id(i, 0, k), ny, nx, KY);
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) line(G.id(i, j, 0), nz, nx * ny, KX);
}
// amostra trilinear (fora da grade: valor grande positivo)
export function sampler(G, S) {
  const { nx, ny, nz, h } = G;
  return (x, y, z) => {
    const fx = (x - G.x0) / h, fy = (y - G.y0) / h, fz = (z - G.z0) / h;
    if (fx < 0 || fy < 0 || fz < 0 || fx > nx - 1.001 || fy > ny - 1.001 || fz > nz - 1.001) return 1;
    const i = Math.floor(fx), j = Math.floor(fy), k = Math.floor(fz), u = fx - i, v = fy - j, t = fz - k;
    const a = G.id(i, j, k), sY = nx, sZ = nx * ny;
    const c00 = S[a] + (S[a + 1] - S[a]) * u, c10 = S[a + sY] + (S[a + sY + 1] - S[a + sY]) * u;
    const c01 = S[a + sZ] + (S[a + sZ + 1] - S[a + sZ]) * u, c11 = S[a + sY + sZ] + (S[a + sY + sZ + 1] - S[a + sY + sZ]) * u;
    const c0 = c00 + (c10 - c00) * v, c1 = c01 + (c11 - c01) * v;
    return c0 + (c1 - c0) * t;
  };
}
// gradiente normalizado do campo (normal da superfície)
export function gradAt(F, x, y, z, e = 0.002) {
  const gx = F(x + e, y, z) - F(x - e, y, z), gy = F(x, y + e, z) - F(x, y - e, z), gz = F(x, y, z + e) - F(x, y, z - e), l = Math.hypot(gx, gy, gz) || 1;
  return [gx / l, gy / l, gz / l];
}
// cruzamento do zero ao longo de p + n·t, t ∈ [t0, t1] (passo de 1 mm, refinado por bissecção); o mais perto de t = 0
export function zeroAlong(F, p, n, t0, t1, step = 0.001) {
  let best = null;
  let prevT = t0, prevF = F(p[0] + n[0] * t0, p[1] + n[1] * t0, p[2] + n[2] * t0);
  for (let t = t0 + step; t <= t1 + 1e-9; t += step) {
    const f = F(p[0] + n[0] * t, p[1] + n[1] * t, p[2] + n[2] * t);
    if ((prevF < 0) !== (f < 0)) {
      let a = prevT, b = t, fa = prevF;
      for (let it = 0; it < 12; it++) { const m = (a + b) / 2, fm = F(p[0] + n[0] * m, p[1] + n[1] * m, p[2] + n[2] * m); if ((fm < 0) === (fa < 0)) { a = m; fa = fm; } else b = m; }
      const r = (a + b) / 2;
      if (best === null || Math.abs(r) < Math.abs(best)) best = r;
    }
    prevT = t; prevF = f;
  }
  return best;
}

// ocupação do corpo sem os voxels cujo triângulo mais próximo não passa em keepTri (braço, mão, cabeça...)
// keepVox(p): voxels que ficam mesmo perto de um triângulo excluído (ex.: dentro do casco do tronco — sem isso tirar o
// braço escavava a lateral do peito e as costas perto da axila)
export function bodyOcc(P, idx, box, h, keepTri = null, keepVox = null) {
  const G = new Grid(box, h), occ = occupancy(P, idx, G);
  if (keepTri) {
    const bvh = new BVH(P, idx);
    for (let k = 0; k < G.nz; k++) for (let j = 0; j < G.ny; j++) for (let i = 0; i < G.nx; i++) {
      const id = G.id(i, j, k); if (!occ[id]) continue;
      const p = G.pos(i, j, k);
      if (keepVox && keepVox(p)) continue;
      const c = bvh.closest(p[0], p[1], p[2], 0.2);
      if (c.tri >= 0 && !keepTri(c.tri)) occ[id] = 0;
    }
  }
  return { G, occ };
}
// campo alisado depois de abertura e fechamento: { G, occ, S, F } (F = amostra trilinear)
export function morphField(G, occ0, { open = 0, close = 0, sigma = 1.2, sigmaY = sigma } = {}) {
  let occ = occ0;
  if (open) occ = opening(G, occ, open);
  if (close) occ = closing(G, occ, close);
  const S = sdf(G, occ, sigma, sigmaY);
  return { G, occ, S, F: sampler(G, S) };
}

// preenche o casco convexo de cada fatia horizontal de voxels com y em [yLo, yHi] (a frente da virilha e o sulco
// dos glúteos viram uma superfície reta de coxa a coxa; logo abaixo da virilha vira o fundilho). sector(x, z) ∈ [0, 1]
// limita o preenchimento (1 = casco inteiro).
// dmax(y) (m, opcional): só enche os voxels do casco a até dmax da fatia original — embaixo o fundilho cresce aos
// poucos a partir das coxas (arco liso), em cima o casco inteiro
export function hullFill(G, occ0, yLo, yHi, dmax = null, xw = Infinity) {
  const occ = Uint8Array.from(occ0), { nx, ny, nz, h } = G, G2 = new Grid([0, 0, 0, (nx - 1) * h, 0, (nz - 1) * h], h);
  for (let j = 0; j < ny; j++) {
    const y = G.y0 + j * h; if (y < yLo || y > yHi) continue;
    const dm = dmax ? dmax(y) : Infinity;
    if (dm <= 0) continue;
    let D2 = null;
    if (isFinite(dm)) { const mk = new Uint8Array(G2.n); for (let k = 0; k < nz; k++) for (let i = 0; i < nx; i++) mk[G2.id(i, 0, k)] = occ0[G.id(i, j, k)]; D2 = edt(G2, mk); }
    const dm2 = (dm / h) ** 2;
    const pts = [];
    // xw: só a faixa central |x| < xw entra no casco (a ponte vai de coxa a coxa pela frente da virilha, sem a
    // aba que o casco da fatia inteira fazia na frente da coxa)
    for (let k = 0; k < nz; k++) for (let i = 0; i < nx; i++) if (occ0[G.id(i, j, k)] && Math.abs(G.x0 + i * h) < xw) pts.push([i, k]);
    if (pts.length < 3) continue;
    pts.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    const lo = [], up = [];
    for (const p of pts) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
    for (let q = pts.length - 1; q >= 0; q--) { const p = pts[q]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); }
    const hull = lo.slice(0, -1).concat(up.slice(0, -1)), m = hull.length;
    let i0 = 1e9, i1 = -1, k0 = 1e9, k1 = -1;
    for (const p of hull) { i0 = Math.min(i0, p[0]); i1 = Math.max(i1, p[0]); k0 = Math.min(k0, p[1]); k1 = Math.max(k1, p[1]); }
    for (let k = k0; k <= k1; k++) for (let i = i0; i <= i1; i++) {
      let inside = true;
      for (let q = 0; q < m && inside; q++) if (cr(hull[q], hull[(q + 1) % m], [i, k]) < -1e-9) inside = false;
      if (inside && (!D2 || D2[G2.id(i, 0, k)] <= dm2)) occ[G.id(i, j, k)] = 1;
    }
  }
  return occ;
}
