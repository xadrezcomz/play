// Roupas (§6): cascas recortadas do próprio corpo pela função de região R_g, subdivididas, afastadas
// pela espessura/folga do tecido (com caimento, dobras, colisão e camadas), com barra dobrada para dentro,
// espaços de cor por faixa e oclusão. Saída explícita (posição, normal, ossos, atributos) — ver §6.1 na espec.
import * as G from './gltf.mjs';
import { K, KN, garmentTerms, evalR, limbCoords, hemY } from './label.mjs';
const KN0 = KN;
import { BI, NB } from './body.mjs';
import { BVH, neighbors, vertexNormals, boundaryLoops, smoothField, smoothstep, smax, clamp, noise3, rng, seedOf, rayAO, compact, taubin, weld, surfaceNets, components } from './geom.mjs';
import { zeroAlong, gradAt } from './proxy.mjs';
import { simplifier } from './encode.mjs';
import { SL } from './consts.mjs';

const MAT = { cotton: 1, tech: 2 };
export const smoothstepX = smoothstep;
export const GSPEC = {
  camiseta: { mat: MAT.cotton, layer: 3, lod: [4000, 1600, 300] },
  regata: { mat: MAT.cotton, layer: 3, lod: [3000, 1200, 300] },
  top: { mat: MAT.tech, layer: 3, lod: [1800, 700, 260] },
  'manga-longa': { mat: MAT.cotton, layer: 3, lod: [5000, 2000, 320] },
  'corta-vento': { mat: MAT.tech, layer: 3, lod: [5500, 2200, 340] },
  short: { mat: MAT.cotton, layer: 2, lod: [3000, 1200, 280] },
  bermuda: { mat: MAT.cotton, layer: 2, lod: [3500, 1400, 280] },
  legging: { mat: MAT.tech, layer: 2, lod: [4000, 1600, 280] },
  'saia-short': { mat: MAT.cotton, layer: 2, lod: [2400, 1000, 280] },
  meia: { mat: MAT.cotton, layer: 1, lod: [400, 160, 40] }
};

const lerpRec = (a, ao, b, bo, t, out, oo) => { for (let k = 0; k < KN; k++) out[oo + k] = a[ao + k] + (b[bo + k] - a[ao + k]) * t; };

// ---------------------------------------------------------------- 1–2. recorte e subdivisão
function cutAndSubdivide(Aw, widx, terms, subdivide = true) {
  const nw = Aw.length / KN, R = new Float64Array(nw);
  for (let w = 0; w < nw; w++) R[w] = evalR(terms, Aw, w * KN);
  const recs = [], key = new Map();
  const push = (arr) => { recs.push(arr); return recs.length - 1; };
  const vid = w => { const k = 'v' + w; let i = key.get(k); if (i === undefined) { i = push(Aw.slice(w * KN, w * KN + KN)); key.set(k, i); } return i; };
  const eid = (a, b) => {
    const lo = Math.min(a, b), hi = Math.max(a, b), k = 'e' + lo + '_' + hi;
    let i = key.get(k);
    if (i === undefined) {
      const t = R[lo] / (R[lo] - R[hi]), r = new Float64Array(KN);
      lerpRec(Aw, lo * KN, Aw, hi * KN, t, r, 0);
      i = push(r); key.set(k, i);
    }
    return i;
  };
  const tris = [];
  for (let t = 0; t < widx.length; t += 3) {
    const v = [widx[t], widx[t + 1], widx[t + 2]];
    const ins = v.map(w => R[w] < 0);
    if (!ins[0] && !ins[1] && !ins[2]) continue;
    const poly = [];
    for (let e = 0; e < 3; e++) {
      const a = v[e], b = v[(e + 1) % 3];
      if (ins[e]) poly.push(vid(a));
      if (ins[e] !== ins[(e + 1) % 3]) poly.push(eid(a, b));
    }
    for (let k = 1; k + 1 < poly.length; k++) tris.push(poly[0], poly[k], poly[k + 1]);
  }
  // subdivide 1→4 (a casca da grade de voxels já é fina: sem subdivisão)
  const mid = new Map(), out = subdivide ? [] : tris;
  const m = (a, b) => {
    const k = a < b ? a + '_' + b : b + '_' + a;
    let i = mid.get(k);
    if (i === undefined) { const r = new Float64Array(KN); lerpRec(recs[a], 0, recs[b], 0, 0.5, r, 0); i = push(r); mid.set(k, i); }
    return i;
  };
  if (subdivide) for (let t = 0; t < tris.length; t += 3) {
    const a = tris[t], b = tris[t + 1], c = tris[t + 2], ab = m(a, b), bc = m(b, c), ca = m(c, a);
    out.push(a, ab, ca, ab, b, bc, ca, bc, c, ab, bc, ca);
  }
  // normaliza normais interpoladas e tira triângulos degenerados
  const n = recs.length, V = new Float64Array(n * KN);
  recs.forEach((r, i) => {
    V.set(r, i * KN);
    const o = i * KN, l = Math.hypot(V[o + 3], V[o + 4], V[o + 5]) || 1;
    V[o + 3] /= l; V[o + 4] /= l; V[o + 5] /= l;
  });
  const keep = [];
  for (let t = 0; t < out.length; t += 3) {
    const a = out[t] * KN, b = out[t + 1] * KN, c = out[t + 2] * KN;
    const ux = V[b] - V[a], uy = V[b + 1] - V[a + 1], uz = V[b + 2] - V[a + 2], vx = V[c] - V[a], vy = V[c + 1] - V[a + 1], vz = V[c + 2] - V[a + 2];
    const ar = Math.hypot(uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx);
    if (ar > 2e-9) keep.push(out[t], out[t + 1], out[t + 2]);
  }
  const cp = compact(keep, n);
  const V2 = new Float64Array(cp.back.length * KN);
  cp.back.forEach((o, i) => V2.set(V.subarray(o * KN, o * KN + KN), i * KN));
  return { V: V2, idx: cp.idx, n: cp.back.length };
}

// ---------------------------------------------------------------- caimento (casco convexo por fatia)
function hull2(pts) {
  pts.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], up = [];
  for (const p of pts) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
  for (let i = pts.length - 1; i >= 0; i--) { const p = pts[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); }
  return lo.slice(0, -1).concat(up.slice(0, -1));
}
// fatias horizontais do tronco (a cada 1 cm): interseção exata dos triângulos com o plano, sem os braços
export function torsoSlices(Aw, y0, y1, widx) {
  const S = new Map();
  for (let k = Math.floor((y0 - 0.02) * 100); k <= Math.ceil((y1 + 0.02) * 100); k++) {
    const yc = (k + 0.5) / 100, pts = [];
    for (let t = 0; t < widx.length; t += 3) {
      const o = [widx[t] * KN, widx[t + 1] * KN, widx[t + 2] * KN];
      if (o.some(q => Aw[q + K.wArm] >= 0.3 || Aw[q + K.head] > 0.5)) continue;
      for (let e = 0; e < 3; e++) {
        const a = o[e], bb = o[(e + 1) % 3], ya = Aw[a + 1] - yc, yb = Aw[bb + 1] - yc;
        if ((ya < 0) === (yb < 0)) continue;
        const u = ya / (ya - yb);
        pts.push([Aw[a] + (Aw[bb] - Aw[a]) * u, Aw[a + 2] + (Aw[bb + 2] - Aw[a + 2]) * u]);
      }
    }
    if (pts.length < 6) continue;
    let cx = 0, cz = 0;
    pts.forEach(p => { cx += p[0]; cz += p[1]; });
    S.set(k, { c: [cx / pts.length, cz / pts.length], h: hull2(pts) });
  }
  return S;
}
// ponto (x, z) dentro do casco convexo da fatia (com margem m para dentro)
export function inSliceHull(sl, x, z, m = 0) {
  const h = sl.h, n = h.length;
  for (let i = 0; i < n; i++) { const a = h[i], b = h[(i + 1) % n], ex = b[0] - a[0], ez = b[1] - a[1], l = Math.hypot(ex, ez) || 1; if ((ex * (z - a[1]) - ez * (x - a[0])) / l < m) return false; }
  return true;
}
function hullDist(sl, dx, dz, cx = sl.c[0], cz = sl.c[1]) {   // distância do centro (cx, cz) até o casco na direção (dx, dz)
  const h = sl.h;
  let best = 0;
  for (let i = 0; i < h.length; i++) {
    const a = h[i], b = h[(i + 1) % h.length];
    const ex = b[0] - a[0], ez = b[1] - a[1], ax = a[0] - cx, az = a[1] - cz;
    const den = dx * ez - dz * ex;
    if (Math.abs(den) < 1e-12) continue;
    const t = (ax * ez - az * ex) / den, s = (ax * dz - az * dx) / den;
    if (t > 0 && s >= -1e-6 && s <= 1 + 1e-6) best = Math.max(best, t);
  }
  return best;
}

// corpo procurador dos tops (v4): cada vértice do corpo soldado (fora braço, mão e cabeça) vai pela própria normal até a
// superfície do campo aberto+fechado (proxy.mjs) — sem mamilo, ponta do busto, abdômen e umbigo; vão sob o busto e
// decote preenchidos. O deslocamento é alisado no grafo e um Taubin leve tira o serrilhado dos voxels.
// tIn(p): quanto o vértice pode ir para dentro (m). Os voxels do braço são tirados do campo e isso escava o ombro e a
// lateral do peito — sem o limite o tecido afundava ali; o busto (ponta arredondada) pode entrar mais.
export function fieldProxy(Aw, widx, adjW, F, y0, y1, tIn = () => 0.006) {
  const nw = Aw.length / KN, A = Float64Array.from(Aw), Pp = new Float64Array(nw * 3), m = new Float64Array(nw), D = new Float64Array(nw * 3);
  let moved = 0;
  for (let w = 0; w < nw; w++) {
    const o = w * KN, p = [Aw[o], Aw[o + 1], Aw[o + 2]], n = [Aw[o + 3], Aw[o + 4], Aw[o + 5]];
    for (let k = 0; k < 3; k++) Pp[w * 3 + k] = p[k];
    m[w] = (1 - smoothstep(0.25, 0.55, Aw[o + K.wArm])) * clamp(1 - 2 * (Aw[o + K.head] + Aw[o + K.hand]), 0, 1) * smoothstep(y0, y0 + 0.04, p[1]) * smoothstep(y1 + 0.06, y1, p[1]);
    if (m[w] <= 0) continue;
    let t = zeroAlong(F, p, n, -0.045, 0.07);
    if (t === null) { m[w] = 0; continue; }
    t = Math.max(t, -tIn(p));
    for (let k = 0; k < 3; k++) D[w * 3 + k] = n[k] * t * m[w];
    moved++;
  }
  smoothField(D, 3, adjW, 3, 0.5);
  for (let i = 0; i < nw * 3; i++) Pp[i] += D[i];
  taubin(Pp, adjW, m, 4);
  const Np = vertexNormals(Pp, widx, nw);
  for (let w = 0; w < nw; w++) { const o = w * KN; for (let k = 0; k < 3; k++) { A[o + k] = Pp[w * 3 + k]; A[o + 3 + k] = Np[w * 3 + k]; } }
  return { Aw: A, slices: torsoSlices(A, y0, y1, widx), moved };
}

// base das roupas de baixo (v4): malha (surface nets) do campo do corpo sem braços, com o fechamento ligado da
// virilha para cima (sem "V" na frente, sem sulco atrás, e uma ponte lisa entre as coxas logo abaixo da virilha —
// o fundilho). Atributos (pesos, sL...) do ponto mais próximo do corpo; na ponte os pesos são alisados pela malha
// (sem rasgo entre as pernas). Saída no formato de registros (KN) de cutAndSubdivide.
export function netsBase(F, box, h, Aw, attrBVH, widxB, Lm) {
  const N = surfaceNets(F, box, h), n = N.n, P = N.pos;
  // só a componente principal (pedaços soltos da grade)
  const cmp = components(N.idx, n), cnt = new Map();
  for (let t = 0; t < N.idx.length / 3; t++) cnt.set(cmp.comp[t], (cnt.get(cmp.comp[t]) || 0) + 1);
  let big = -1, bc = -1; for (const [c, k] of cnt) if (k > bc) { bc = k; big = c; }
  const keep = [];
  for (let t = 0; t < N.idx.length / 3; t++) if (cmp.comp[t] === big) keep.push(N.idx[t * 3], N.idx[t * 3 + 1], N.idx[t * 3 + 2]);
  const cp = compact(keep, n), m = cp.back.length, V = new Float64Array(m * KN), dB = new Float64Array(m);
  for (let i = 0; i < m; i++) {
    const s = cp.back[i], p = [P[s * 3], P[s * 3 + 1], P[s * 3 + 2]], c = attrBVH.closest(p[0], p[1], p[2], 0.3), o = i * KN;
    if (c.tri >= 0) {
      const ws = [c.u, c.v, c.w];
      for (let e = 0; e < 3; e++) { const q = widxB[c.tri * 3 + e] * KN; for (let k = 0; k < KN; k++) V[o + k] += ws[e] * Aw[q + k]; }
    }
    dB[i] = c.d;
    const nn = gradAt(F, p[0], p[1], p[2]);
    for (let k = 0; k < 3; k++) { V[o + k] = p[k]; V[o + 3 + k] = nn[k]; }
  }
  const idx = cp.idx;
  // orientação: normal do triângulo do lado do gradiente
  for (let t = 0; t < idx.length; t += 3) {
    const a = idx[t] * KN, b = idx[t + 1] * KN, c = idx[t + 2] * KN;
    const fn = G.cross([V[b] - V[a], V[b + 1] - V[a + 1], V[b + 2] - V[a + 2]], [V[c] - V[a], V[c + 1] - V[a + 1], V[c + 2] - V[a + 2]]);
    if (fn[0] * (V[a + 3] + V[b + 3] + V[c + 3]) + fn[1] * (V[a + 4] + V[b + 4] + V[c + 4]) + fn[2] * (V[a + 5] + V[b + 5] + V[c + 5]) < 0) { const k = idx[t + 1]; idx[t + 1] = idx[t + 2]; idx[t + 2] = k; }
  }
  // pesos alisados onde a casca se afasta do corpo (ponte da virilha, sulcos preenchidos)
  const adj = neighbors(idx, m), W = new Float64Array(m * NB), fixed = new Uint8Array(m);
  for (let i = 0; i < m; i++) { for (let b = 0; b < NB; b++) W[i * NB + b] = Math.max(0, V[i * KN + K.w0 + b]); fixed[i] = dB[i] < 0.005 ? 1 : 0; }
  smoothField(W, NB, adj, 60, 0.6, fixed);
  for (let i = 0; i < m; i++) {
    let s2 = 0; for (let b = 0; b < NB; b++) s2 += W[i * NB + b];
    for (let b = 0; b < NB; b++) V[i * KN + K.w0 + b] = W[i * NB + b] / (s2 || 1);
    limbCoords(V, i * KN, Lm);
  }
  return { V, idx, n: m, dB };
}

// ---------------------------------------------------------------- utilidades de perna (eixo e lado)
function legAxis(Lm, sd, p) {
  const a = Lm.Lg[sd], b = Lm.Kn[sd], c = Lm.An[sd];
  const seg = (s0, s1) => { const ab = G.sub(s1, s0), t = clamp(G.dot(G.sub(p, s0), ab) / G.dot(ab, ab), 0, 1); return G.add(s0, G.scl(ab, t)); };
  const q1 = seg(a, b), q2 = seg(b, c);
  const q = G.dist(p, q1) < G.dist(p, q2) ? q1 : q2;
  const ax = G.dist(p, q1) < G.dist(p, q2) ? G.norm(G.sub(b, a)) : G.norm(G.sub(c, b));
  let r = G.sub(p, q); r = G.sub(r, G.scl(ax, G.dot(r, ax)));
  return { q, ax, r: G.norm(r), rad: G.len(r) };
}

// ---------------------------------------------------------------- deslocamento por tipo
function offsets(kind, g, V, n, idx, Lm, terms, slices, seed, bridge = null) {
  const f = g === 'f', off = new Float64Array(n * 3), rnd = seedOf(kind + g);
  const H = Lm.H, Yhem = hemY(kind, Lm);
  const top = ['camiseta', 'regata', 'top', 'manga-longa', 'corta-vento'].includes(kind);
  const bottom = ['short', 'bermuda', 'legging', 'saia-short'].includes(kind);
  const nz = (x, y, z, s) => noise3(x * s, y * s, z * s, rnd);
  const push = new Float64Array(n);   // empurrão radial do caimento
  const pdir = new Float64Array(n * 2);
  for (let i = 0; i < n; i++) {
    const o = i * KN, x = V[o], y = V[o + 1], z = V[o + 2], sA = V[o + K.sA], sL = V[o + K.sL], wArm = V[o + K.wArm], wLeg = V[o + K.wLeg];
    const sd = x < 0 ? 'L' : 'R';
    const armB = smoothstep(0.35, 0.65, wArm);
    let d = 0, fold = 0;
    const tv = {};
    for (const k in terms) tv[k] = -terms[k](V, o);   // δ por termo
    switch (kind) {
      case 'camiseta': {
        const Ls = f ? 0.115 : 0.135;
        d = (f ? 0.0065 : 0.0075) * (1 - armB) + armB * (0.007 + 0.010 * smoothstep(0.03, Ls, Math.max(0, sA)));
        d += 0.004 * smoothstep(Yhem + 0.06, Yhem, y) * (1 - armB);
        fold = 0.002 * smoothstep(Yhem + 0.14, Yhem + 0.03, y) * (1 - armB) * Math.sin(2 * Math.PI * (y + 0.012 * nz(x, y, z, 18)) / 0.05);
        break;
      }
      case 'regata':
        d = 0.0065 + 0.003 * smoothstep(Yhem + 0.06, Yhem, y);
        fold = 0.0015 * smoothstep(Yhem + 0.14, Yhem + 0.03, y) * Math.sin(2 * Math.PI * (y + 0.012 * nz(x, y, z, 18)) / 0.05);
        break;
      case 'top':
        d = tv.hem < 0.035 ? 0.0035 : 0.0025;
        break;
      case 'manga-longa': {
        d = 0.0065 + armB * 0.002 * smoothstep(0.04, 0.0, tv.sleeve);
        const el = Lm.upperLen;
        fold = armB * 0.0015 * smoothstep(0.06, 0.0, Math.abs(sA - el)) * Math.sin(2 * Math.PI * (sA + 0.01 * nz(x, y, z, 25)) / 0.035);
        fold += (1 - armB) * 0.0015 * smoothstep(Yhem + 0.14, Yhem + 0.03, y) * Math.sin(2 * Math.PI * (y + 0.012 * nz(x, y, z, 18)) / 0.05);
        break;
      }
      case 'corta-vento': {
        d = 0.022 * (1 - armB) + 0.016 * armB;   // folgado: 2,2 cm no tronco
        const band = Math.min(tv.hem !== undefined ? tv.hem : 1, tv.sleeve !== undefined && sA >= 0 ? tv.sleeve : 1);
        d = d + (0.006 - d) * smoothstep(0.03, 0.0, band);
        const diag = (1 - armB) * Math.sin(2 * Math.PI * (y * 0.8 + x * 0.6 + 0.02 * nz(x, y, z, 12)) / 0.04);
        const ring = armB * Math.sin(2 * Math.PI * (Math.max(0, sA) + 0.015 * nz(x, y, z, 14)) / 0.045);
        fold = 0.003 * (diag * (0.5 + 0.5 * nz(x, y, z, 6)) + ring * (0.6 + 0.4 * nz(x, y, z, 7)));
        break;
      }
      case 'short': case 'saia-short': case 'bermuda': case 'legging': {
        const L = kind === 'bermuda' ? Lm.thigh - 0.035 : kind === 'legging' ? Lm.thigh + Lm.shin - 0.045 : (f ? 0.155 : 0.25);
        let base, flare = 0, famp = 0, nfold = 7;
        if (kind === 'legging') {
          base = 0.0025 + 0.0005 * smoothstep(0.06, 0.0, Math.abs(sL - Lm.thigh));
          famp = 0;
        } else if (kind === 'bermuda') { base = 0.008; flare = 0.006 + 0.016 * smoothstep(0.05, L, sL); famp = 0.002; }
        else if (kind === 'saia-short') { base = 0.0045; flare = 0; famp = 0; }   // bermudinha justa por baixo da saia (não fura a saia)
        else if (f) { base = 0.006; flare = 0.004 + 0.010 * smoothstep(0.03, L, sL); famp = 0.0015; }
        else { base = 0.008; flare = 0.008 + 0.024 * smoothstep(0.03, L, sL); famp = 0.0025 * smoothstep(0.08, 0.25, sL); }
        const wl = smoothstep(0.35, 0.75, wLeg) * (bridge ? 1 - bridge[i] : 1);   // fundilho: sem evasê para a outra perna
        d = base + (tv.waist < (kind === 'legging' ? 0.045 : 0.035) ? 0.0015 * smoothstep(0, 0.006, tv.waist) : 0);
        if (wl > 0 && flare > base) {
          const la = legAxis(Lm, sd, [x, y, z]);
          const ang = Math.atan2(la.r[2], la.r[0] * (sd === 'L' ? -1 : 1));
          const fl = (flare - base) * wl;
          pdir[i * 2] = la.r[0]; pdir[i * 2 + 1] = la.r[2];
          push[i] = fl;
          fold = famp * wl * Math.sin(ang * nfold + 2 * nz(x, y, z, 10));
        }
        if (kind === 'legging') {   // vincos atrás do joelho e franzido no tornozelo
          const back = smoothstep(0, 0.6, V[o + 5]);
          fold = 0.0008 * back * smoothstep(0.05, 0, Math.abs(sL - Lm.thigh)) * Math.sin(2 * Math.PI * (y + 0.01 * nz(x, y, z, 30)) / 0.03);
          fold += 0.001 * smoothstep(0.06, 0.0, tv.legEnd) * Math.sin(2 * Math.PI * (y + 0.008 * nz(x, y, z, 30)) / 0.02);
        }
        break;
      }
      case 'meia': {
        d = 0.0018 + 0.0007 * smoothstep(0.018, 0.012, tv.top);
        const la = legAxis(Lm, sd, [x, y, z]);
        const ang = Math.atan2(la.r[2], la.r[0]);
        fold = 0.0004 * smoothstep(0.018, 0.012, tv.top) * Math.sin(ang * 40);
        break;
      }
    }
    const nrm = [V[o + 3], V[o + 4], V[o + 5]];
    off[i * 3] = nrm[0] * (d + fold); off[i * 3 + 1] = nrm[1] * (d + fold); off[i * 3 + 2] = nrm[2] * (d + fold);
    // caimento dos tops: até o casco convexo da fatia
    if (top && wArm < 0.5 && slices) {
      let wf = 0;
      if (kind === 'top') {
        const sl0 = slices.get(Math.floor(y * 100));
        if (sl0 && z < sl0.c[1] && Math.abs(x) < 0.06 && y >= Lm.Ybra + 0.03 && y <= Lm.Ychest + 0.03) wf = smoothstep(Lm.Ybra + 0.03, Lm.Ybra + 0.05, y);   // a faixa abraça as costelas
      } else wf = smoothstep(Lm.Ychest + 0.06, Lm.Ychest, y) * (kind === 'manga-longa' ? 0.85 : 1);
      // perto do braço o caimento some aos poucos (transição curta fazia um sulco entre o peito e a manga)
      wf *= kind === 'top' ? 1 - smoothstep(0.3, 0.5, wArm) : 1 - smoothstep(0.05, 0.45, wArm);
      const sl = slices.get(Math.floor(y * 100));
      if (wf > 0 && sl) {
        const dx = x - sl.c[0], dz = z - sl.c[1], rv = Math.hypot(dx, dz);
        if (rv > 1e-4) {
          let rh = hullDist(sl, dx / rv, dz / rv);
          // caimento vertical (v4): o tecido desce do peito/busto e das escápulas e só pode voltar para dentro
          // `slope` m por m de queda — preenche o vão sob o busto, a cintura e a lombar (sem "pintado no corpo")
          if (kind !== 'top' && !process.env.DBG_NOENV) {
            const slope = kind === 'corta-vento' ? 0.22 : 0.35, kTop = Math.floor((Lm.Ychest + 0.03) * 100), k0 = Math.floor(y * 100);
            // máximo suave (1 cm): sem vinco onde o caimento assume (lia como um afundado sob o peitoral)
            let env = -1;
            for (let k = k0 + 1; k <= kTop; k++) { const s2 = slices.get(k); if (!s2) continue; env = Math.max(env, hullDist(s2, dx / rv, dz / rv, sl.c[0], sl.c[1]) - slope * (k - k0) / 100); }
            if (env > 0) rh = smax(rh, env, 0.012);
          }
          push[i] = Math.max(0, rh - rv) * wf;
          pdir[i * 2] = dx / rv; pdir[i * 2 + 1] = dz / rv;
        }
      }
    }
  }
  // suaviza o empurrão (caimento/alargamento) sobre a casca
  const adj = neighbors(idx, n);
  const pv = new Float64Array(n * 3);
  for (let i = 0; i < n; i++) { pv[i * 3] = pdir[i * 2] * push[i]; pv[i * 3 + 2] = pdir[i * 2 + 1] * push[i]; }
  smoothField(pv, 3, adj, kind === 'corta-vento' ? 24 : top ? 12 : 4, 0.5);
  for (let i = 0; i < n * 3; i++) off[i] += pv[i];
  smoothField(off, 3, adj, 1, 0.3);
  return { off, adj };
}

// ---------------------------------------------------------------- montagem de uma roupa
export function buildGarment(C, kind, ctx) {
  const { Aw, widx, Lm, bodyBVH, lower } = ctx;
  const spec = GSPEC[kind], terms = garmentTerms(kind, C.g, Lm);
  // tops: recortados de um corpo "procurador" alisado (sem mamilo, peitoral, abdômen e deltoide marcados); o
  // corta-vento usa um ainda mais liso. O caimento (casco por fatia) também sai dele.
  const isTop = spec.layer === 3, proxy = isTop ? (kind === 'corta-vento' ? ctx.proxy.loose : ctx.proxy.fit) : null;
  // roupas de baixo: casca da grade de voxels (fundilho e sem "V"); meia: a própria pele
  const nb = spec.layer === 2 && ctx.nets ? (kind === 'legging' || kind === 'saia-short' ? ctx.nets.tight : ctx.nets.loose) : null;
  const cs = nb ? cutAndSubdivide(nb.V, nb.idx, terms, false) : cutAndSubdivide(proxy ? proxy.Aw : Aw, widx, terms);
  let { V, idx, n } = cs;
  const top = spec.layer === 3;
  const slices = top ? proxy.slices : null;
  // alisa a base da casca (umbigo, abdômen e dobras finas do corpo não marcam o tecido) e refaz as normais
  {
    const adj = neighbors(idx, n), fixed = new Uint8Array(n);
    for (const l of boundaryLoops(idx)) for (const v of l) fixed[v] = 1;
    const B = new Float64Array(n * 3), m = new Float64Array(n);
    for (let i = 0; i < n; i++) { for (let k = 0; k < 3; k++) B[i * 3 + k] = V[i * KN + k]; m[i] = fixed[i] ? 0 : 1; }
    taubin(B, adj, m, kind === 'corta-vento' ? 30 : top ? 14 : 4);
    const NN = vertexNormals(B, idx, n);
    for (let i = 0; i < n; i++) {
      const o = i * KN, s0 = NN[i * 3] * V[o + 3] + NN[i * 3 + 1] * V[o + 4] + NN[i * 3 + 2] * V[o + 5] < 0 ? -1 : 1;
      for (let k = 0; k < 3; k++) { V[o + k] = B[i * 3 + k]; V[o + 3 + k] = NN[i * 3 + k] * s0; }
    }
  }
  // fundilho (v4): quanto a base se afasta da pele (ponte entre as coxas) — ali não há evasê nem trava de coxa
  let bridge = null;
  if (nb) { bridge = new Float64Array(n); for (let i = 0; i < n; i++) bridge[i] = smoothstep(0.003, 0.010, bodyBVH.closest(V[i * KN], V[i * KN + 1], V[i * KN + 2], 0.05).d) * smoothstep(Lm.crotchY + 0.06, Lm.crotchY + 0.01, V[i * KN + 1]); }
  const { off } = offsets(kind, C.g, V, n, idx, Lm, terms, slices, 0, bridge);
  const P = new Float64Array(n * 3);
  for (let i = 0; i < n; i++) for (let k = 0; k < 3; k++) P[i * 3 + k] = V[i * KN + k] + off[i * 3 + k];
  const stage = process.env.DBG_STAGE === kind ? (nm, PP) => {   // depuração: triângulos virados (normal da face contra a da base)
    let bad = 0, low = 0;
    for (let t = 0; t < idx.length; t += 3) {
      const a = idx[t], b = idx[t + 1], c = idx[t + 2], A = PP || V, st = PP ? 3 : KN;
      const fn = G.cross([A[b * st] - A[a * st], A[b * st + 1] - A[a * st + 1], A[b * st + 2] - A[a * st + 2]], [A[c * st] - A[a * st], A[c * st + 1] - A[a * st + 1], A[c * st + 2] - A[a * st + 2]]);
      const bn = [V[a * KN + 3] + V[b * KN + 3] + V[c * KN + 3], V[a * KN + 4] + V[b * KN + 4] + V[c * KN + 4], V[a * KN + 5] + V[b * KN + 5] + V[c * KN + 5]];
      if (G.dot(fn, bn) < 0) { bad++; if (V[a * KN + 1] < Lm.crotchY + 0.05) low++; }
    }
    console.log('  DBG_STAGE', kind, nm, 'virados', bad, 'perto da virilha', low);
  } : () => {};
  stage('base', null); stage('offsets', P);
  const BN = C.body.NW, BW = C.body.widx;
  const nrmAt = h => {
    const a = BW[h.tri * 3] * 3, b = BW[h.tri * 3 + 1] * 3, c = BW[h.tri * 3 + 2] * 3;
    return G.norm([BN[a] * h.u + BN[b] * h.v + BN[c] * h.w, BN[a + 1] * h.u + BN[b + 1] * h.v + BN[c + 1] * h.w, BN[a + 2] * h.u + BN[b + 2] * h.v + BN[c + 2] * h.w]);
  };
  // folga entre as pernas (roupas soltas): metade do vão até a outra perna menos 3 mm
  if (['short', 'bermuda', 'saia-short'].includes(kind)) {
    for (let i = 0; i < n; i++) {
      const o = i * KN; if (V[o + K.wLeg] < 0.3) continue;
      const other = V[o] < 0 ? ctx.legBVH.R : ctx.legBVH.L;
      const p = [V[o], V[o + 1], V[o + 2]], q = [P[i * 3], P[i * 3 + 1], P[i * 3 + 2]];
      if (bridge && bridge[i] > 0.5) continue;   // ponte do fundilho: fica onde está
      const d0 = other.closest(p[0], p[1], p[2]).d, d1 = other.closest(q[0], q[1], q[2]).d;
      if (d1 < d0 && d0 < 0.2) {
        const s = clamp((d0 / 2 - 0.003) / Math.max(1e-6, d0 - d1), 0, 1);
        if (s < 1) for (let k = 0; k < 3; k++) P[i * 3 + k] = p[k] + (q[k] - p[k]) * s;
      }
    }
  }
  stage('clamp', P);
  // colisão com o corpo: distância mínima pela normal do ponto mais próximo
  const dmin = spec.mat === MAT.tech ? 0.001 : 0.0015;
  // tops: longe da borda (R ≤ −2..−5 cm, onde a pele embaixo é cortada) o tecido pode passar uns mm por dentro do
  // corpo real — é isso que deixa o procurador alisado valer (mamilo e músculo não empurram o tecido de volta)
  const alw = new Float64Array(n);
  if (top) {
    // folga só onde a pele embaixo some de verdade: distância (pelo grafo) de cada vértice do corpo até a pele que
    // continua visível com esta roupa (triângulo com algum canto R > −1,5 cm)
    const nw = Aw.length / KN, Rr = new Float64Array(nw), vis = new Uint8Array(nw), dist = new Float64Array(nw).fill(1e9), q = [];
    for (let w = 0; w < nw; w++) Rr[w] = evalR(terms, Aw, w * KN);
    for (let t = 0; t < widx.length; t += 3) if (Rr[widx[t]] > -0.015 || Rr[widx[t + 1]] > -0.015 || Rr[widx[t + 2]] > -0.015) for (let e = 0; e < 3; e++) vis[widx[t + e]] = 1;
    for (let w = 0; w < nw; w++) if (vis[w]) { dist[w] = 0; q.push(w); }
    const adjB = C.body.adjW, PW = C.body.PW;
    for (let it = 0; it < q.length; it++) { const v = q[it]; for (let k = adjB.off[v]; k < adjB.off[v + 1]; k++) { const u = adjB.nb[k], d = dist[v] + Math.hypot(PW[u * 3] - PW[v * 3], PW[u * 3 + 1] - PW[v * 3 + 1], PW[u * 3 + 2] - PW[v * 3 + 2]); if (d < dist[u] - 1e-9) { dist[u] = d; q.push(u); } } }
    const maxIn = C.g === 'f' ? 0.025 : 0.015;   // pele embaixo é cortada (máscara); perto da pele visível a folga some
    for (let i = 0; i < n; i++) {
      const h = bodyBVH.closest(V[i * KN], V[i * KN + 1], V[i * KN + 2], 0.05); if (h.tri < 0) continue;
      const dd = dist[widx[h.tri * 3]] * h.u + dist[widx[h.tri * 3 + 1]] * h.v + dist[widx[h.tri * 3 + 2]] * h.w;
      alw[i] = maxIn * smoothstep(0.012, 0.04, dd);   // v4: rampa mais longe da borda (alças estreitas deixavam a pele furar)
    }
  }
  // v4: o tronco do top colide só com o tronco (o braço ao lado empurrava o tecido para dentro do peito: sulco na
  // axila); depois o tronco é recuado pela normal da base até ficar 4 mm fora do braço
  const trunkV = i => top && V[i * KN + K.wArm] < 0.5;
  const collide = (margin) => {
    for (let i = 0; i < n; i++) {
      const bv = trunkV(i) && ctx.trunkBVH ? ctx.trunkBVH : bodyBVH;
      const h = bv.closest(P[i * 3], P[i * 3 + 1], P[i * 3 + 2], 0.08);
      if (h.tri < 0) continue;
      const nn = nrmAt(h), sd = (P[i * 3] - h.x) * nn[0] + (P[i * 3 + 1] - h.y) * nn[1] + (P[i * 3 + 2] - h.z) * nn[2], mg = margin - alw[i];
      if (sd < mg) for (let k = 0; k < 3; k++) P[i * 3 + k] += nn[k] * (mg - sd);
    }
    if (top && ctx.armBVH) for (let i = 0; i < n; i++) {
      if (!trunkV(i)) continue;
      const bn = [V[i * KN + 3], V[i * KN + 4], V[i * KN + 5]];
      for (let it = 0; it < 6; it++) {
        const h = ctx.armBVH.closest(P[i * 3], P[i * 3 + 1], P[i * 3 + 2], 0.03);
        if (h.tri < 0) break;
        const nn = nrmAt(h), sd = (P[i * 3] - h.x) * nn[0] + (P[i * 3 + 1] - h.y) * nn[1] + (P[i * 3 + 2] - h.z) * nn[2];
        if (sd >= 0.004) break;
        const cur = (P[i * 3] - V[i * KN]) * bn[0] + (P[i * 3 + 1] - V[i * KN + 1]) * bn[1] + (P[i * 3 + 2] - V[i * KN + 2]) * bn[2];
        const step = Math.min(0.004 - sd, Math.max(0, cur - 0.001));
        if (step <= 1e-5) break;
        for (let k = 0; k < 3; k++) P[i * 3 + k] -= bn[k] * step;
      }
    }
  };
  collide(dmin);
  stage('collide1', P);
  // camadas: por cima das roupas de baixo (todas do gênero) com folga
  let pushedLayer = 0;
  if (lower && lower.length) {
    const marg = top ? 0.006 : 0.002;
    // espessura das camadas de baixo em cada ponto (raio da pele para fora); dilatada 2 anéis para pegar as bordas
    const need = new Float64Array(n);
    for (const L of lower) for (let i = 0; i < n; i++) {
      const bn = [V[i * KN + 3], V[i * KN + 4], V[i * KN + 5]], b0 = [V[i * KN], V[i * KN + 1], V[i * KN + 2]];
      // todas as superfícies da camada de baixo ao longo do raio até 3,5 cm (short + saia por cima dele)
      let t0 = 0.0005;
      for (let guard = 0; guard < 6; guard++) {
        const h = L.bvh.ray(b0[0] + bn[0] * t0, b0[1] + bn[1] * t0, b0[2] + bn[2] * t0, bn[0], bn[1], bn[2], 0.07);
        if (!h || t0 + h.t > 0.035) break;
        const a = L.idx[h.tri * 3] * 3, b = L.idx[h.tri * 3 + 1] * 3, c = L.idx[h.tri * 3 + 2] * 3, w0 = 1 - h.u - h.v, Nn = L.N;
        const hn = G.norm([Nn[a] * w0 + Nn[b] * h.u + Nn[c] * h.v, Nn[a + 1] * w0 + Nn[b + 1] * h.u + Nn[c + 1] * h.v, Nn[a + 2] * w0 + Nn[b + 2] * h.u + Nn[c + 2] * h.v]);
        if (G.dot(hn, bn) >= 0.4) need[i] = Math.max(need[i], t0 + h.t + marg);
        t0 += h.t + 0.0005;
      }
    }
    const adjL = neighbors(idx, n);
    for (let it = 0; it < 2; it++) { const t = Float64Array.from(need); for (let i = 0; i < n; i++) for (let q = adjL.off[i]; q < adjL.off[i + 1]; q++) t[i] = Math.max(t[i], need[adjL.nb[q]]); need.set(t); }
    for (let i = 0; i < n; i++) {
      if (!need[i]) continue;
      const bn = [V[i * KN + 3], V[i * KN + 4], V[i * KN + 5]];
      const cur = (P[i * 3] - V[i * KN]) * bn[0] + (P[i * 3 + 1] - V[i * KN + 1]) * bn[1] + (P[i * 3 + 2] - V[i * KN + 2]) * bn[2];
      if (cur < need[i]) { for (let k = 0; k < 3; k++) P[i * 3 + k] += bn[k] * (need[i] - cur); pushedLayer++; }
    }
    collide(dmin);
    stage('collide2', P);
  }
  // relaxa o deslocamento (tira pontas isoladas, principalmente na borda) e confere a colisão de novo
  {
    const adj = neighbors(idx, n), D = new Float64Array(n * 3);
    for (let i = 0; i < n; i++) for (let k = 0; k < 3; k++) D[i * 3 + k] = P[i * 3 + k] - V[i * KN + k];
    // limite: nenhum deslocamento passa de 1,6× a média dos vizinhos (+3 mm)
    for (let i = 0; i < n; i++) {
      let m = 0, c = 0; for (let q = adj.off[i]; q < adj.off[i + 1]; q++) { const j = adj.nb[q]; m += Math.hypot(D[j * 3], D[j * 3 + 1], D[j * 3 + 2]); c++; }
      const lim = (c ? m / c : 0) * 1.6 + 0.003, l = Math.hypot(D[i * 3], D[i * 3 + 1], D[i * 3 + 2]);
      if (l > lim) for (let k = 0; k < 3; k++) D[i * 3 + k] *= lim / l;
    }
    smoothField(D, 3, adj, 2, 0.4);
    for (let i = 0; i < n; i++) for (let k = 0; k < 3; k++) P[i * 3 + k] = V[i * KN + k] + D[i * 3 + k];
    collide(dmin);
    stage('collide3', P);
  }
  if (process.env.DBG_IN === kind) {
    const hist = {};
    for (let i = 0; i < n; i++) {
      const h = bodyBVH.closest(P[i * 3], P[i * 3 + 1], P[i * 3 + 2], 0.08); if (h.tri < 0) continue;
      const nn = nrmAt(h), sd = (P[i * 3] - h.x) * nn[0] + (P[i * 3 + 1] - h.y) * nn[1] + (P[i * 3 + 2] - h.z) * nn[2];
      const Rr = evalR(terms, V, i * KN), k = (Rr > -0.015 ? 'borda' : 'dentro') + (sd < 0 ? ' fora<0' : ' ok');
      hist[k] = (hist[k] || 0) + 1;
    }
    console.log('DBG_IN', kind, JSON.stringify(hist));
  }
  // espaços de cor: a casca é simplificada primeiro e as faixas são cortadas DEPOIS, em cada LOD (ver finishShell)
  const SF = slotFields(kind, C.g, Lm, terms, ctx);
  return finishShell(C, kind, spec, { V, P, idx: Uint32Array.from(idx), n, SF, terms, Lm, bodyBVH, lower, ctx });
}

// costura lateral de cada perna: o ponto mais de fora de cada fatia horizontal (sem braço/mão), alisado em y e
// colado na pele — uma curva contínua da cintura ao tornozelo (a listra lateral sai daqui)
function lateralSeam(Aw, Lm, bodyBVH, sd) {
  const key = '_seam' + sd;
  if (Lm[key]) return Lm[key];
  const sx = sd === 'L' ? -1 : 1, nw = Aw.length / KN, y0 = Lm.An[sd][1] + 0.02, y1 = Lm.T[1] + 0.07, pts = [];
  for (let yc = y0; yc <= y1; yc += 0.01) {
    let best = null, bx = -1;
    for (let w = 0; w < nw; w++) {
      const o = w * KN, y = Aw[o + 1];
      if (Math.abs(y - yc) > 0.008 || Aw[o] * sx < 0.02 || Aw[o + K.wArm] >= 0.3 || Aw[o + K.hand] >= 0.3) continue;
      if (Aw[o] * sx > bx) { bx = Aw[o] * sx; best = [Aw[o], yc, Aw[o + 2]]; }
    }
    if (best) pts.push(best);
  }
  for (let it = 0; it < 3; it++) {   // média móvel ±4 cm em x e z
    const t = pts.map(p => p.slice());
    for (let i = 0; i < pts.length; i++) { let sx2 = 0, sz = 0, c = 0; for (let j = Math.max(0, i - 4); j <= Math.min(pts.length - 1, i + 4); j++) { sx2 += pts[j][0]; sz += pts[j][2]; c++; } t[i][0] = sx2 / c; t[i][2] = sz / c; }
    for (let i = 0; i < pts.length; i++) pts[i] = t[i];
  }
  const out = pts.map(p => { const h = bodyBVH.closest(p[0], p[1], p[2]); return [h.x, h.y, h.z]; });
  return (Lm[key] = out);
}
// coordenada lateral com sinal (m) em relação à costura: + para a frente, − para trás
function seamU(seam, p) {
  let best = 1e9, bi = 0, bt = 0;
  for (let i = 0; i + 1 < seam.length; i++) {
    const a = seam[i], b = seam[i + 1], ab = G.sub(b, a), t = clamp(G.dot(G.sub(p, a), ab) / G.dot(ab, ab), 0, 1), d = G.dist(p, G.add(a, G.scl(ab, t)));
    if (d < best) { best = d; bi = i; bt = t; }
  }
  const a = seam[bi], b = seam[bi + 1], c = G.add(a, G.scl(G.sub(b, a), bt));
  return (p[2] < c[2] ? 1 : -1) * best;
}

// campos das faixas de cor (negativo = dentro) e a regra do espaço por triângulo. Faixas finas (listras, zíper,
// faixa refletiva) são DOIS campos com sinal (um por borda): a interpolação linear de |d| num triângulo grande
// perderia o mínimo e serrilharia a borda.
function slotFields(kind, g, Lm, terms, ctx) {
  const dt = (k, A, o) => terms[k] ? -terms[k](A, o) : 1;
  const arm = (A, o) => A[o + K.sA] >= 0;
  const T = SL;
  const stripe = hw => {
    const sL = lateralSeam(ctx.Aw, Lm, ctx.bodyBVH, 'L'), sR = lateralSeam(ctx.Aw, Lm, ctx.bodyBVH, 'R');
    const u = (A, o) => seamU(A[o] < 0 ? sL : sR, [A[o], A[o + 1], A[o + 2]]);
    // um campo só: |u| − meia largura (com o refinamento perto das linhas, a interpolação de |u| não serrilha)
    return [['stripe', (A, o) => Math.min(Math.abs(u(A, o)), 0.05) - hw]];
  };
  // debrum/cós: largura medida pela distância geodésica até o laço de borda daquele tipo (gola, manga, barra, cós,
  // perna, punho de meia) — a linha de cor fica paralela à borda de verdade
  const trimBy = (widths, extra, rule) => { const SFo = { fields: [['trim', (A, o) => SFo.trimD(A, o)], ...extra], rule, trimWidths: widths }; return SFo; };
  switch (kind) {
    case 'camiseta': return trimBy({ neck: 0.016, sleeve: 0.018, hem: 0.018 }, [], n => n.trim ? T.shirtTrim : T.shirt);
    case 'regata': return trimBy({ neck: 0.014, sleeve: 0.012, hem: 0.018 }, [], n => n.trim ? T.shirtTrim : T.shirt);
    case 'top': {   // debrum pela distância geodésica à borda da casca (−R dava ilhas no encontro bojo/alça)
      const SFo = { fields: [['trim', (A, o) => Math.min(SFo.edge(A, o) - 0.009, A[o + 1] - (Lm.Ybra + 0.02))]], rule: n => n.trim ? T.shirtTrim : T.shirt, needEdge: true };
      return SFo;
    }
    case 'manga-longa': return trimBy({ neck: 0.016, sleeve: 0.025, hem: 0.018 }, [], n => n.trim ? T.shirtTrim : T.shirt);   // sem a linha raglan (virava lascas brancas no ombro)
    case 'corta-vento': {
      const Yb = Lm.Sy - 0.12;
      const SFo = {
        trimWidths: { sleeve: 0.02, hem: 0.02 },
        fields: [['zip', (A, o) => Math.max(Math.abs(A[o]) - 0.006, A[o + 2] - Lm.cz)],
          ['trim', (A, o) => SFo.trimD(A, o)],
          // faixa refletiva só nas costas (na frente cruzava o zíper e formava uma cruz)
          ['band', (A, o) => Math.max(Math.abs(A[o + 1] - Yb) - 0.007, (Lm.cz + 0.03) - A[o + 2], A[o + K.wArm] - 0.3)]],
        rule: n => n.zip ? T.shirtAccent : n.trim ? T.shirtTrim : n.band ? T.shirtAccent : T.shirt };
      return SFo;
    }
    case 'short': case 'bermuda': case 'saia-short': return trimBy({ waist: 0.035, leg: 0.015 }, stripe(0.0075), n => n.trim ? T.shortsTrim : n.stripe ? T.shortsAccent : T.shorts);
    case 'legging': return trimBy({ waist: 0.045, leg: 0.012 }, stripe(0.006), n => n.trim ? T.shortsTrim : n.stripe ? T.shortsAccent : T.shorts);
    case 'meia': return trimBy({ top: 0.018 }, [], n => n.trim ? T.sockTrim : T.sock);
  }
  throw new Error('sem faixas: ' + kind);
}

// corta a malha na linha F[fi] = 0 (novos pontos interpolados: registro, posição e todos os campos)
export function cutBy(M, fi) {
  const { V, P, F } = M, f = F[fi], KN = M.K || KN0;
  let n = M.n;
  const Vn = [V], Pn = [P], extraV = [], extraP = [];
  const key = new Map(), out = [];
  const ptOf = (a, b) => {
    const lo = Math.min(a, b), hi = Math.max(a, b), k = lo * 4194304 + hi;
    let i = key.get(k);
    if (i !== undefined) return i;
    const t = f[lo] / (f[lo] - f[hi]);
    const getV = (i0, kk) => i0 < M.n ? V[i0 * KN + kk] : extraV[(i0 - M.n) * KN + kk];
    const getP = (i0, kk) => i0 < M.n ? P[i0 * 3 + kk] : extraP[(i0 - M.n) * 3 + kk];
    for (let kk = 0; kk < KN; kk++) extraV.push(getV(lo, kk) + (getV(hi, kk) - getV(lo, kk)) * t);
    for (let kk = 0; kk < 3; kk++) extraP.push(getP(lo, kk) + (getP(hi, kk) - getP(lo, kk)) * t);
    for (let q = 0; q < F.length; q++) F[q].push(q === fi ? 0 : F[q][lo] + (F[q][hi] - F[q][lo]) * t);
    i = n++;
    key.set(k, i);
    return i;
  };
  const idx = M.idx;
  for (let t = 0; t < idx.length; t += 3) {
    const v = [idx[t], idx[t + 1], idx[t + 2]], fv = v.map(i => f[i]);
    const hasN = fv.some(x => x < 0), hasP = fv.some(x => x > 0);
    if (!(hasN && hasP)) { out.push(v[0], v[1], v[2]); continue; }
    const ins = [], outs = [];
    for (let e = 0; e < 3; e++) {
      const a = v[e], b = v[(e + 1) % 3], fa = fv[e], fb = fv[(e + 1) % 3];
      if (fa <= 0) ins.push(a);
      if (fa >= 0) outs.push(a);
      if ((fa < 0 && fb > 0) || (fa > 0 && fb < 0)) { const c = ptOf(a, b); ins.push(c); outs.push(c); }
    }
    for (const poly of [ins, outs]) for (let k = 1; k + 1 < poly.length; k++) out.push(poly[0], poly[k], poly[k + 1]);
  }
  const V2 = new Float64Array(n * KN); V2.set(V); V2.set(extraV, M.n * KN);
  const P2 = new Float64Array(n * 3); P2.set(P); P2.set(extraP, M.n * 3);
  return { V: V2, P: P2, n, idx: out, F, K: M.K };
}

// um espaço de cor por triângulo; vértices na divisa entre espaços são duplicados (costura)
export function splitSlots(M, SF) {
  const KN = M.K || KN0, nt = M.idx.length / 3, tslot = new Uint8Array(nt), names = SF.fields.map(f => f[0]);
  for (let t = 0; t < nt; t++) {
    const neg = {};
    names.forEach((nm, q) => { const F = M.F[q]; neg[nm] = F[M.idx[t * 3]] + F[M.idx[t * 3 + 1]] + F[M.idx[t * 3 + 2]] < 0; });
    tslot[t] = SF.rule(neg, t, M);
  }
  const first = new Int16Array(M.n).fill(-1), extra = new Map(), orig = [], slotV = [];
  for (let i = 0; i < M.n; i++) { orig.push(i); slotV.push(0); }
  const idx = new Uint32Array(M.idx.length);
  for (let t = 0; t < nt; t++) for (let e = 0; e < 3; e++) {
    const v = M.idx[t * 3 + e], sl = tslot[t];
    let r = v;
    if (first[v] < 0) { first[v] = sl; slotV[v] = sl; } else if (first[v] !== sl) {
      const k = v * 64 + sl;
      if (!extra.has(k)) { extra.set(k, orig.length); orig.push(v); slotV.push(sl); }
      r = extra.get(k);
    }
    idx[t * 3 + e] = r;
  }
  const n = orig.length, V = new Float64Array(n * KN), P = new Float64Array(n * 3);
  for (let i = 0; i < n; i++) { V.set(M.V.subarray(orig[i] * KN, orig[i] * KN + KN), i * KN); P.set(M.P.subarray(orig[i] * 3, orig[i] * 3 + 3), i * 3); }
  return { V, P, idx, n, slot: Uint8Array.from(slotV), orig: Int32Array.from(orig), tslot };
}

// bissecção pela aresta mais longa (com o triângulo vizinho da mesma aresta: sem vértice pendurado) dos triângulos
// cortados por alguma linha de cor (campo muda de sinal) e maiores que maxLen
export function refineNear(M, fns, maxLen, maxTris = 60000) {
  const KK = M.K || KN0, Vl = [], Pl = [], fv = fns.map(() => []);
  const addVert = (rec, p) => { const i = Pl.length / 3; for (let k = 0; k < KK; k++) Vl.push(rec[k]); Pl.push(p[0], p[1], p[2]); fns.forEach((fn, q) => fv[q].push(fn(Vl, i * KK))); return i; };
  for (let i = 0; i < M.n; i++) addVert(M.V.subarray(i * KK, i * KK + KK), [M.P[i * 3], M.P[i * 3 + 1], M.P[i * 3 + 2]]);
  const tris = [], alive = [], emap = new Map(), ek = (a, b) => a < b ? a * 4194304 + b : b * 4194304 + a;
  const addT = (a, b, c) => { const t = tris.length / 3; tris.push(a, b, c); alive.push(1); for (const [x, y] of [[a, b], [b, c], [c, a]]) { const k = ek(x, y); if (!emap.has(k)) emap.set(k, new Set()); emap.get(k).add(t); } return t; };
  const killT = t => { alive[t] = 0; const a = tris[t * 3], b = tris[t * 3 + 1], c = tris[t * 3 + 2]; for (const [x, y] of [[a, b], [b, c], [c, a]]) emap.get(ek(x, y)).delete(t); };
  for (let t = 0; t < M.idx.length; t += 3) addT(M.idx[t], M.idx[t + 1], M.idx[t + 2]);
  const len2 = (a, b) => (Pl[a * 3] - Pl[b * 3]) ** 2 + (Pl[a * 3 + 1] - Pl[b * 3 + 1]) ** 2 + (Pl[a * 3 + 2] - Pl[b * 3 + 2]) ** 2;
  const crossed = t => { const v = [tris[t * 3], tris[t * 3 + 1], tris[t * 3 + 2]]; for (const f of fv) { const a = f[v[0]], b = f[v[1]], c = f[v[2]]; if (Math.min(a, b, c) < 0 && Math.max(a, b, c) > 0) return true; } return false; };
  const m2 = maxLen * maxLen, q = [];
  for (let t = 0; t < alive.length; t++) q.push(t);
  // LEPP (Rivara): segue o caminho das arestas mais longas até uma aresta "terminal" (a mais longa dos dois lados) e
  // divide essa — a malha não degenera em leques de lascas
  const longest = t => { const v = [tris[t * 3], tris[t * 3 + 1], tris[t * 3 + 2]]; let e = 0, L = -1; for (let k = 0; k < 3; k++) { const l2 = len2(v[k], v[(k + 1) % 3]); if (l2 > L) { L = l2; e = k; } } return [v[e], v[(e + 1) % 3], L]; };
  const split = (a, b) => {
    const key = ek(a, b), rec = new Float64Array(KK);
    for (let k = 0; k < KK; k++) rec[k] = (Vl[a * KK + k] + Vl[b * KK + k]) / 2;
    const nl = Math.hypot(rec[3], rec[4], rec[5]) || 1; rec[3] /= nl; rec[4] /= nl; rec[5] /= nl;
    const mi = addVert(rec, [(Pl[a * 3] + Pl[b * 3]) / 2, (Pl[a * 3 + 1] + Pl[b * 3 + 1]) / 2, (Pl[a * 3 + 2] + Pl[b * 3 + 2]) / 2]);
    for (const u of [...emap.get(key)]) {
      const w = [tris[u * 3], tris[u * 3 + 1], tris[u * 3 + 2]];
      let k = 0; while (!((w[k] === a && w[(k + 1) % 3] === b) || (w[k] === b && w[(k + 1) % 3] === a))) k++;
      const x = w[k], y = w[(k + 1) % 3], z = w[(k + 2) % 3];
      killT(u);
      q.push(addT(x, mi, z), addT(mi, y, z));
    }
  };
  while (q.length && tris.length / 3 < maxTris) {
    const t = q.pop();
    if (!alive[t] || !crossed(t) || longest(t)[2] <= m2) continue;
    let cur = t;
    for (let depth = 0; depth < 64; depth++) {
      const [a, b] = longest(cur), others = [...emap.get(ek(a, b))].filter(u => u !== cur);
      if (!others.length) { split(a, b); break; }
      const [c, d] = longest(others[0]);
      if (ek(c, d) === ek(a, b) || depth === 63) { split(a, b); break; }
      cur = others[0];
    }
    if (alive[t]) q.push(t);
  }
  const idx = []; for (let t = 0; t < alive.length; t++) if (alive[t]) idx.push(tris[t * 3], tris[t * 3 + 1], tris[t * 3 + 2]);
  return { V: Float64Array.from(Vl), P: Float64Array.from(Pl), n: Pl.length / 3, idx, K: M.K };
}

// distância euclidiana de cada vértice até a polilinha fechada de um laço
export function distToLoop(P, n, loop) {
  const m = loop.length, out = new Float64Array(n).fill(1e9);
  for (let i = 0; i < n; i++) {
    const px = P[i * 3], py = P[i * 3 + 1], pz = P[i * 3 + 2];
    let best = 1e18;
    for (let j = 0; j < m; j++) {
      const a = loop[j] * 3, b = loop[(j + 1) % m] * 3;
      const ex = P[b] - P[a], ey = P[b + 1] - P[a + 1], ez = P[b + 2] - P[a + 2], wx = px - P[a], wy = py - P[a + 1], wz = pz - P[a + 2];
      const ee = ex * ex + ey * ey + ez * ez, t = ee > 0 ? clamp((wx * ex + wy * ey + wz * ez) / ee, 0, 1) : 0;
      const dx = wx - ex * t, dy = wy - ey * t, dz = wz - ez * t, d2 = dx * dx + dy * dy + dz * dz;
      if (d2 < best) best = d2;
    }
    out[i] = Math.sqrt(best);
  }
  return out;
}

// ilhas de cor pequenas (lascas, pontinhos) voltam para o espaço da vizinhança: componentes de triângulos do mesmo
// espaço (ligados por aresta) com área < minA recebem o espaço que mais faz divisa com elas
export function cleanIslands(idx, P, tslot, minA) {
  const nt = idx.length / 3, emap = new Map(), area = new Float64Array(nt);
  const ek = (a, b) => a < b ? a * 4194304 + b : b * 4194304 + a;
  for (let t = 0; t < nt; t++) {
    const a = idx[t * 3] * 3, b = idx[t * 3 + 1] * 3, c = idx[t * 3 + 2] * 3;
    area[t] = 0.5 * G.len(G.cross([P[b] - P[a], P[b + 1] - P[a + 1], P[b + 2] - P[a + 2]], [P[c] - P[a], P[c + 1] - P[a + 1], P[c + 2] - P[a + 2]]));
    for (let e = 0; e < 3; e++) { const k = ek(idx[t * 3 + e], idx[t * 3 + (e + 1) % 3]); if (!emap.has(k)) emap.set(k, []); emap.get(k).push(t); }
  }
  let changed = 0;
  for (let pass = 0; pass < 3; pass++) {
    const comp = new Int32Array(nt).fill(-1), comps = [];
    for (let s = 0; s < nt; s++) {
      if (comp[s] >= 0) continue;
      const list = [s]; comp[s] = comps.length;
      for (let q = 0; q < list.length; q++) {
        const t = list[q];
        for (let e = 0; e < 3; e++) for (const u of emap.get(ek(idx[t * 3 + e], idx[t * 3 + (e + 1) % 3]))) if (comp[u] < 0 && tslot[u] === tslot[t]) { comp[u] = comps.length; list.push(u); }
      }
      comps.push(list);
    }
    let any = false;
    comps.forEach((list, ci) => {
      let A = 0; for (const t of list) A += area[t];
      if (A >= minA) return;
      const vote = new Map();
      for (const t of list) for (let e = 0; e < 3; e++) {
        const a = idx[t * 3 + e], b = idx[t * 3 + (e + 1) % 3];
        for (const u of emap.get(ek(a, b))) if (comp[u] !== ci) { const L = Math.hypot(P[a * 3] - P[b * 3], P[a * 3 + 1] - P[b * 3 + 1], P[a * 3 + 2] - P[b * 3 + 2]); vote.set(tslot[u], (vote.get(tslot[u]) || 0) + L); }
      }
      let bs = -1, bv = 0; for (const [s, v] of vote) if (v > bv) { bv = v; bs = s; }
      if (bs >= 0) { for (const t of list) tslot[t] = bs; changed += list.length; any = true; }
    });
    if (!any) break;
  }
  return changed;
}

// ---------------------------------------------------------------- simplificação, cortes de cor, barra, oclusão
// Por LOD: simplifica a casca lisa (sem costuras), infla os LODs 1–2 para ficarem por cima da casca LOD0, corta as
// faixas de cor exatas nesse LOD, limpa as ilhas, duplica as divisas. Cada LOD tem os seus vértices.
function finishShell(C, kind, spec, S) {
  const { V, idx, n, SF } = S, Sm = simplifier(), P = Float64Array.from(S.P);
  // 1. bordas (barras) alisadas ao longo do laço: sem serrilhado do recorte e do afastamento por vértice
  let loops = boundaryLoops(idx);
  for (const l of loops) {
    const m = l.length; if (m < 6) continue;
    for (let it = 0; it < 20; it++) {
      const t = l.map((v, j) => { const a = l[(j - 1 + m) % m], b = l[(j + 1) % m]; return [0, 1, 2].map(k => P[v * 3 + k] + 0.5 * ((P[a * 3 + k] + P[b * 3 + k]) / 2 - P[v * 3 + k])); });
      l.forEach((v, j) => { for (let k = 0; k < 3; k++) P[v * 3 + k] = t[j][k]; });
    }
  }
  const flips = (nm, PP, ix) => {   // depuração (DBG_STAGE=tipo): triângulos virados contra a normal da base
    if (process.env.DBG_STAGE !== kind) return;
    let bad = 0, low = 0;
    for (let t = 0; t < ix.length; t += 3) {
      const a = ix[t], b = ix[t + 1], c = ix[t + 2];
      const fn = G.cross([PP[b * 3] - PP[a * 3], PP[b * 3 + 1] - PP[a * 3 + 1], PP[b * 3 + 2] - PP[a * 3 + 2]], [PP[c * 3] - PP[a * 3], PP[c * 3 + 1] - PP[a * 3 + 1], PP[c * 3 + 2] - PP[a * 3 + 2]]);
      const VV = nm.V || V, bn = [VV[a * KN + 3] + VV[b * KN + 3] + VV[c * KN + 3], VV[a * KN + 4] + VV[b * KN + 4] + VV[c * KN + 4], VV[a * KN + 5] + VV[b * KN + 5] + VV[c * KN + 5]];
      if (G.dot(fn, bn) < 0) { bad++; if (PP[a * 3 + 1] < S.Lm.crotchY + 0.05) low++; }
    }
    console.log('  DBG_STAGE', kind, nm.n || nm, 'virados', bad, 'perto da virilha', low, '/', ix.length / 3);
  };
  flips('bordas', P, idx);
  // 2. campos das faixas: funções do registro (posição-base no corpo etc.), avaliáveis em qualquer ponto novo.
  // Distância às bordas = distância euclidiana da posição-base à polilinha (também em posição-base) de cada laço.
  const segsOf = l => l.map((v, j) => { const a = l[j], b = l[(j + 1) % l.length]; return [V[a * KN], V[a * KN + 1], V[a * KN + 2], V[b * KN], V[b * KN + 1], V[b * KN + 2]]; });
  const dSegs = (segs, A, o) => {
    const px = A[o], py = A[o + 1], pz = A[o + 2]; let best = 1e18;
    for (const sg of segs) {
      const ex = sg[3] - sg[0], ey = sg[4] - sg[1], ez = sg[5] - sg[2], wx = px - sg[0], wy = py - sg[1], wz = pz - sg[2];
      const ee = ex * ex + ey * ey + ez * ez, t = ee > 0 ? clamp((wx * ex + wy * ey + wz * ez) / ee, 0, 1) : 0;
      const dx = wx - ex * t, dy = wy - ey * t, dz = wz - ez * t, d2 = dx * dx + dy * dy + dz * dz;
      if (d2 < best) best = d2;
    }
    return Math.sqrt(best);
  };
  if (SF.needEdge) { const segs = loops.flatMap(segsOf); SF.edge = (A, o) => dSegs(segs, A, o); }
  if (SF.trimWidths) {
    // tipo de cada laço: o mais alto é gola/cós (ou punho da meia); |x| médio > 12 cm (tops) = manga; o resto, barra/perna
    const top = spec.layer === 3, info = loops.map(l => { let x = 0, y = 0; for (const v of l) { x += Math.abs(P[v * 3]); y += P[v * 3 + 1]; } return { x: x / l.length, y: y / l.length }; });
    const yMax = Math.max(...info.map(q => q.y)), W = SF.trimWidths, typed = [];
    loops.forEach((l, li) => {
      const f = info[li];
      let w;
      if (kind === 'meia') w = f.y > S.Lm.An.L[1] + 0.03 ? W.top : null;
      else if (top) w = f.y === yMax && kind !== 'corta-vento' ? W.neck : f.x > 0.12 ? W.sleeve : W.hem;
      else w = f.y === yMax ? W.waist : W.leg;
      if (w != null) typed.push([segsOf(l), w]);
    });
    SF.trimD = (A, o) => { let d = 0.2; for (const [segs, w] of typed) d = Math.min(d, dSegs(segs, A, o) - w); return d; };
  }
  const fns = SF.fields.map(f => f[1]);
  // 3. LODs da casca lisa
  const P32 = Float32Array.from(P);
  const simp = (src, target, err, flags) => src.length / 3 <= target ? Uint32Array.from(src) : Sm.simplify(Uint32Array.from(src), P32, 3, Math.max(1, Math.floor(target)) * 3, err, flags)[0];
  let lipLoops = loops;
  if (kind === 'meia') lipLoops = loops.filter(l => l.reduce((a, i) => a + P[i * 3 + 1], 0) / l.length > S.Lm.An.L[1] + 0.03);
  let neckLoopRef = null;
  if (kind === 'corta-vento') {
    const my = l => l.reduce((a, i) => a + P[i * 3 + 1], 0) / l.length;
    neckLoopRef = loops.reduce((b, l) => (!b || my(l) > my(b)) ? l : b, null);
    lipLoops = lipLoops.filter(l => l !== neckLoopRef);
  }
  // barra: ~2 triângulos por aresta de borda depois da simplificação (arestas de ~1,2 cm)
  const perim = l => l.reduce((a, v, j) => { const w = l[(j + 1) % l.length]; return a + Math.hypot(P[v * 3] - P[w * 3], P[v * 3 + 1] - P[w * 3 + 1], P[v * 3 + 2] - P[w * 3 + 2]); }, 0);
  const lipTris = Math.round(lipLoops.reduce((a, l) => a + 2 * perim(l) / 0.012, 0));
  // v4: a borda também é simplificada (dentro do erro de 2,5 mm) — a casca da grade de voxels tem borda de 5 mm, que
  // travada comia o orçamento do miolo (facetado e dobras na virilha)
  const U0 = simp(idx, Math.max(spec.lod[0] * 0.88 - lipTris, spec.lod[0] * 0.45), 0.0025, ['ErrorAbsolute']);
  const U1 = simp(U0, spec.lod[1] * 0.75, kind === 'meia' ? 0.02 : 0.012, ['ErrorAbsolute']);
  const U2 = simp(U1, spec.lod[2] * 0.9, 0.05, ['ErrorAbsolute']);
  const bvh0 = new BVH(P, idx);   // casca cheia (antes da simplificação): todo LOD fica por cima dela
  if (process.env.DBG_LOD) console.log(kind, 'casca', idx.length / 3, 'U', U0.length / 3, U1.length / 3, U2.length / 3, 'barra', lipTris);
  // 4. monta cada LOD
  const OP = [], ON = [], OV = [], OSL = [], OFL = [], lods = [];
  let neckLoop = null, neckP = null;
  [U0, U1, U2].forEach((U, l) => {
    const cp = compact(U, n), back = cp.back, m = back.length;
    const Vs = new Float64Array(m * KN), Ps = new Float64Array(m * 3);
    back.forEach((o, i) => { Vs.set(V.subarray(o * KN, o * KN + KN), i * KN); Ps.set(P.subarray(o * 3, o * 3 + 3), i * 3); });
    flips({ n: 'simpl' + l, V: Vs }, Ps, cp.idx);
    inflateShell(Ps, Vs, cp.idx, bvh0, l ? 0.0005 : 0.0002);
    flips({ n: 'infla' + l, V: Vs }, Ps, cp.idx);
    let M = { V: Vs, P: Ps, n: m, idx: Array.from(cp.idx), K: KN };
    // LOD0/1: triângulos grandes cruzados por uma linha de cor são bissectados (aresta mais longa, com o vizinho)
    // até ≤ 5 mm / 10 mm — o campo é avaliado exato nos pontos novos e a linha cortada fica lisa. LOD2: sem cortes.
    if (l < 2) M = refineNear(M, fns, l ? 0.010 : 0.005);
    M.F = fns.map(fn => { const a = []; for (let i = 0; i < M.n; i++) a.push(fn(M.V, i * KN)); return a; });
    flips({ n: 'refina' + l, V: M.V }, M.P, M.idx);
    if (l < 2) for (let fi = 0; fi < fns.length; fi++) M = cutBy(M, fi);
    flips({ n: 'corte' + l, V: M.V }, M.P, M.idx);
    // espaço por triângulo pela regra; ilhas pequenas somem
    const nt = M.idx.length / 3, names = SF.fields.map(f => f[0]), tslot = new Uint8Array(nt);
    for (let t = 0; t < nt; t++) { const neg = {}; if (l < 2) names.forEach((nm, q) => { const f = M.F[q]; neg[nm] = f[M.idx[t * 3]] + f[M.idx[t * 3 + 1]] + f[M.idx[t * 3 + 2]] < 0; }); tslot[t] = SF.rule(neg); }   // LOD2: só a cor principal
    cleanIslands(M.idx, M.P, tslot, [1.5e-4, 4e-4, 9e-4][l]);
    let dup = splitSlots(M, { fields: SF.fields, rule: (ng, t) => tslot[t] });
    // os cortes deixam lascas (ponto de corte perto de um vértice): simplificação com erro de 0,6 mm, divisas de
    // cor preservadas (vértices duplicados = costura) e borda travada
    if (l < 2) {
      const P32c = Float32Array.from(dup.P), r = Sm.simplify(Uint32Array.from(dup.idx), P32c, 3, 0, l ? 0.0015 : 0.0006, ['LockBorder', 'ErrorAbsolute'])[0];
      dup = { ...dup, idx: r };
    }
    flips({ n: 'final' + l, V: dup.V }, dup.P, dup.idx);
    // normais lisas pela malha cortada (antes da duplicação das divisas)
    const wIdx = Uint32Array.from(dup.idx, i => dup.orig[i]), NW = vertexNormals(M.P, wIdx, M.n);
    const base = OP.length / 3;
    for (let i = 0; i < dup.n; i++) {
      for (let k = 0; k < 3; k++) { OP.push(dup.P[i * 3 + k]); ON.push(NW[dup.orig[i] * 3 + k]); }
      for (let k = 0; k < KN; k++) OV.push(dup.V[i * KN + k]);
      OSL.push(dup.slot[i]); OFL.push(0);
    }
    const L = Array.from(dup.idx, i => i + base);
    if (l === 0) {
      // barra dobrada para dentro (só LOD0)
      const lp = buildLips(kind, S, dup, wIdx, M.n, NW, base, OP, ON, OV, OSL, OFL);
      for (const i of lp.tris) L.push(i);
      neckLoop = lp.neckLoop; neckP = M.P;
    }
    lods.push(Uint32Array.from(L));
  });
  const nv = OP.length / 3, REC = new Int32Array(nv);
  for (let i = 0; i < nv; i++) REC[i] = i;
  const FLAGS = Uint8Array.from(OFL);
  const res = { kind, nv, P: Float64Array.from(OP), N: Float64Array.from(ON), REC, V: Float64Array.from(OV), SLOT: Uint8Array.from(OSL), FLAGS, lods, mat: spec.mat, layer: spec.layer, Wx: null };
  if (kind === 'corta-vento' && neckLoop) addExtra(res, collar(neckLoop, neckP, S.Lm), [true, true, false]);
  if (kind === 'saia-short') {
    // raio de cada direção = superfície mais de fora (casca do short + corpo), vista de fora para dentro
    const Aw = S.ctx.Aw, WI = S.ctx.widx, sb = new BVH(P, idx), sb1 = new BVH(res.P, res.lods[1]);   // casca cheia e a do LOD1 (inflada)
    const bb = new BVH(C.body.PW, WI, t => { for (let e = 0; e < 3; e++) { const o = WI[t * 3 + e] * KN; if (Aw[o + K.wArm] >= 0.3 || Aw[o + K.hand] >= 0.3) return false; } return true; });   // sem braços e mãos
    const outerAt = (cx, y, cz, dx, dz) => {
      let r = 0;
      for (const b of [sb, sb1, bb]) { const h = b.ray(cx + dx * 0.4, y, cz + dz * 0.4, -dx, 0, -dz, 0.4); if (h) r = Math.max(r, 0.4 - h.t); }
      return r;
    };
    const X = skirt(S.Lm, S.ctx.slices, outerAt);
    // pesos (v4): calculados em skirt() — quadril dominante, pernas lisas em volta do anel inteiro (sem rasgo)
    addExtra(res, X, [true, true, false]);
  }
  return res;
}

// LOD simplificado da roupa: amostras de cada triângulo procuram a casca LOD0 pela normal do corpo; se ela está
// por cima, os vértices sobem até 0,5 mm acima (máx. 12 mm). Assim o LOD1/2 não afunda na pele nem na camada de baixo.
function inflateShell(Ps, Vs, idx, bvh0, gap) {
  const m = Ps.length / 3, need = new Float64Array(m);
  const pt = i => [Ps[i * 3], Ps[i * 3 + 1], Ps[i * 3 + 2]], nr = i => [Vs[i * KN + 3], Vs[i * KN + 4], Vs[i * KN + 5]];
  const BP = bvh0.pos, BI0 = bvh0.idx;
  const faceN = t => { const a = BI0[t * 3] * 3, b = BI0[t * 3 + 1] * 3, c = BI0[t * 3 + 2] * 3; return G.norm(G.cross([BP[b] - BP[a], BP[b + 1] - BP[a + 1], BP[b + 2] - BP[a + 2]], [BP[c] - BP[a], BP[c + 1] - BP[a + 1], BP[c + 2] - BP[a + 2]])); };
  for (let t = 0; t < idx.length; t += 3) {
    const a = idx[t], b = idx[t + 1], c = idx[t + 2];
    const S = [[1, 0, 0], [0, 1, 0], [0, 0, 1], [0.5, 0.5, 0], [0, 0.5, 0.5], [0.5, 0, 0.5], [1 / 3, 1 / 3, 1 / 3]];
    let mx = 0;
    for (const [wa, wb, wc] of S) {
      const s0 = G.add(G.add(G.scl(pt(a), wa), G.scl(pt(b), wb)), G.scl(pt(c), wc));
      const nn = G.norm(G.add(G.add(G.scl(nr(a), wa), G.scl(nr(b), wb)), G.scl(nr(c), wc)));
      const o = G.add(s0, G.scl(nn, 0.012)), h = bvh0.ray(o[0], o[1], o[2], -nn[0], -nn[1], -nn[2], 0.024);
      // v4: só conta a casca cheia do mesmo lado (na virilha o raio pegava a outra coxa e inflava 12 mm)
      if (h && h.t < 0.012 - gap && Math.abs(G.dot(faceN(h.tri), nn)) > 0.5) mx = Math.max(mx, 0.012 - h.t + gap);
    }
    mx = Math.min(mx, 0.008);
    for (const v of [a, b, c]) need[v] = Math.max(need[v], mx);
  }
  // sem virar triângulo: onde a inflação vira a face, ela cai pela metade (até 6 vezes)
  const P0 = Float64Array.from(Ps), fn0 = [];
  for (let t = 0; t < idx.length; t += 3) { const a = idx[t] * 3, b = idx[t + 1] * 3, c = idx[t + 2] * 3; fn0.push(G.cross([P0[b] - P0[a], P0[b + 1] - P0[a + 1], P0[b + 2] - P0[a + 2]], [P0[c] - P0[a], P0[c + 1] - P0[a + 1], P0[c + 2] - P0[a + 2]])); }
  for (let it = 0; it < 7; it++) {
    for (let i = 0; i < m; i++) { const nn = nr(i); for (let k = 0; k < 3; k++) Ps[i * 3 + k] = P0[i * 3 + k] + nn[k] * need[i]; }
    let bad = 0;
    for (let t = 0; t < idx.length; t += 3) {
      const a = idx[t] * 3, b = idx[t + 1] * 3, c = idx[t + 2] * 3;
      const f = G.cross([Ps[b] - Ps[a], Ps[b + 1] - Ps[a + 1], Ps[b + 2] - Ps[a + 2]], [Ps[c] - Ps[a], Ps[c + 1] - Ps[a + 1], Ps[c + 2] - Ps[a + 2]]);
      if (G.dot(f, fn0[t / 3]) <= 0.2 * G.len(fn0[t / 3]) * G.len(f)) { bad++; for (const v of [idx[t], idx[t + 1], idx[t + 2]]) need[v] *= it < 6 ? 0.5 : 0; }
    }
    if (!bad) break;
  }
}

// barra: duplica cada borda e dobra para dentro, até perto do corpo (ou da camada de baixo); devolve os triângulos
function buildLips(kind, S, dup, wIdx, nM, NW, base, OP, ON, OV, OSL, OFL) {
  const { V, P, orig } = dup;
  let loops = boundaryLoops(wIdx);   // índices da malha cortada (M); posição via o primeiro dup de cada um
  const firstDup = new Int32Array(nM).fill(-1);
  for (let i = 0; i < dup.n; i++) if (firstDup[orig[i]] < 0) firstDup[orig[i]] = i;
  const PM = i => [P[firstDup[i] * 3], P[firstDup[i] * 3 + 1], P[firstDup[i] * 3 + 2]];
  if (kind === 'meia') loops = loops.filter(l => l.reduce((a, i) => a + PM(i)[1], 0) / l.length > S.Lm.An.L[1] + 0.03);
  let neckLoop = null;
  if (kind === 'corta-vento') {
    const my = l => l.reduce((a, i) => a + PM(i)[1], 0) / l.length;
    neckLoop = loops.reduce((b, l) => (!b || my(l) > my(b)) ? l : b, null);
    loops = loops.filter(l => l !== neckLoop);
  }
  // espaço de cor da barra: o do triângulo vizinho à aresta de borda
  const edgeSlot = new Map();
  for (let t = 0; t < dup.idx.length; t += 3) for (let e = 0; e < 3; e++) edgeSlot.set(wIdx[t + e] + '_' + wIdx[t + (e + 1) % 3], dup.slot[dup.idx[t + e]]);
  const under = (i) => {
    let u = 0;
    const r = firstDup[i] * KN, bn = [V[r + 3], V[r + 4], V[r + 5]];
    if (S.lower) for (const L of S.lower) {
      const h = L.bvh.ray(V[r] + bn[0] * 0.0005, V[r + 1] + bn[1] * 0.0005, V[r + 2] + bn[2] * 0.0005, bn[0], bn[1], bn[2], 0.07);
      if (h) u = Math.max(u, h.t);
    }
    return u;
  };
  const tris = [];
  for (const loop of loops) {
    const m = loop.length;
    if (m < 3) continue;
    const outer = [], inner = [], skip = [];
    for (let j = 0; j < m; j++) {
      const i = loop[j], ip = loop[(j + 1) % m], im = loop[(j - 1 + m) % m];
      const e = G.sub(PM(ip), PM(im)), ns = [NW[i * 3], NW[i * 3 + 1], NW[i * 3 + 2]], tout = G.norm(G.cross(e, ns));
      const r = firstDup[i] * KN, bn = [V[r + 3], V[r + 4], V[r + 5]];
      const lo = Math.max(0.0015, under(i) + 0.0015), q = PM(i), cur = G.dot(G.sub(q, [V[r], V[r + 1], V[r + 2]]), bn);
      const depth = Math.max(0.0008, Math.min(cur - lo, 0.008));
      // dobra na direção do ponto-base no corpo (não pela normal: na virilha a normal apontava para a outra perna)
      const toB = G.sub([V[r], V[r + 1], V[r + 2]], q), lb = G.len(toB);
      const inn = lb > 1e-6 ? G.add(q, G.scl(toB, Math.min(1, depth / lb))) : G.sub(q, G.scl(bn, depth));
      const sl = edgeSlot.get(i + '_' + ip) ?? dup.slot[firstDup[i]];
      // v4: a base é o procurador (fundilho incluído) — barra em volta toda, sem dentes; só na entreperna (perto de
      // x = 0, abaixo da virilha) não há barra: ali as duas pernas quase se tocam e as barras se cruzavam
      skip.push(S.Lm.crotchY !== undefined && (Math.abs(V[r]) < 0.035 || Math.abs(q[0]) < 0.025) && V[r + 1] < S.Lm.crotchY && (kind === 'short' || kind === 'bermuda' || kind === 'saia-short' || kind === 'legging'));
      for (const [pp, fl] of [[q, outer], [inn, inner]]) {
        fl.push(OP.length / 3);
        OP.push(...pp); ON.push(...tout); for (let k = 0; k < KN; k++) OV.push(V[r + k]); OSL.push(sl); OFL.push(1);
      }
    }
    const lt = [];
    for (let j = 0; j < m; j++) { if (skip[j] || skip[(j + 1) % m]) continue; const a = outer[j], b = outer[(j + 1) % m], c = inner[(j + 1) % m], d = inner[j]; lt.push(a, d, c, a, c, b); }
    for (let t = 0; t < lt.length; t += 3) {
      const a = lt[t] * 3, b = lt[t + 1] * 3, c = lt[t + 2] * 3;
      const fn = G.cross([OP[b] - OP[a], OP[b + 1] - OP[a + 1], OP[b + 2] - OP[a + 2]], [OP[c] - OP[a], OP[c + 1] - OP[a + 1], OP[c + 2] - OP[a + 2]]);
      if (G.dot(fn, [ON[a], ON[a + 1], ON[a + 2]]) < 0) { const k = lt[t + 1]; lt[t + 1] = lt[t + 2]; lt[t + 2] = k; }
    }
    for (const i of lt) tris.push(i);
  }
  return { tris, neckLoop };
}

// junta uma peça explícita (gola, saia) à roupa: vértices com pesos próprios
function addExtra(R, X, inLod) {
  const n0 = R.nv, n = X.P.length / 3, nv = n0 + n;
  const grow = (A, d, T) => { const o = new T(nv * d); o.set(A); return o; };
  R.P = grow(R.P, 3, Float64Array); R.P.set(X.P, n0 * 3);
  R.N = grow(R.N, 3, Float64Array); R.N.set(X.N, n0 * 3);
  R.REC = grow(R.REC, 1, Int32Array); for (let i = n0; i < nv; i++) R.REC[i] = 0;
  R.SLOT = grow(R.SLOT, 1, Uint8Array); R.SLOT.set(X.slot, n0);
  R.FLAGS = grow(R.FLAGS, 1, Uint8Array); R.FLAGS.set(X.flags || new Uint8Array(n), n0);
  if (!R.Wx) R.Wx = new Map();
  for (let i = 0; i < n; i++) R.Wx.set(n0 + i, X.W.subarray(i * NB, i * NB + NB));
  R.lods = R.lods.map((L, k) => { if (!inLod[k]) return L; const o = new Uint32Array(L.length + X.idx.length); o.set(L); for (let j = 0; j < X.idx.length; j++) o[L.length + j] = X.idx[j] + n0; return o; });
  R.nv = nv;
}

// gola do corta-vento: sobe 35 mm a partir do decote, fechando até o raio do pescoço + 12 mm
function collar(loop0, P0, Lm) {
  // reamostra o decote em 36 pontos (comprimento de arco)
  const pts = loop0.map(i => [P0[i * 3], P0[i * 3 + 1], P0[i * 3 + 2]]), L = [0];
  for (let i = 1; i <= pts.length; i++) L.push(L[i - 1] + G.dist(pts[i - 1], pts[i % pts.length]));
  const M = 36, P = [], loop = [];
  for (let j = 0; j < M; j++) {
    const d = L[pts.length] * j / M; let i = 0; while (L[i + 1] < d) i++;
    const t = (d - L[i]) / Math.max(1e-9, L[i + 1] - L[i]), p = G.lerp3(pts[i], pts[(i + 1) % pts.length], t);
    loop.push(j); P.push(...p);
  }
  const N = Lm.N, m = loop.length, OUT = [], NOR = [], SLOT = [], idx = [];
  let cx = 0, cz = 0; for (const i of loop) { cx += P[i * 3]; cz += P[i * 3 + 2]; } cx /= m; cz /= m;
  const rows = 3, ring = [];
  // raio do pescoço na altura da gola
  const add = (p, nn, sl) => { OUT.push(...p); NOR.push(...nn); SLOT.push(sl); return OUT.length / 3 - 1; };
  for (let r = 0; r < rows; r++) {
    const t = r / (rows - 1), row = [];
    for (const i of loop) {
      const b = [P[i * 3], P[i * 3 + 1], P[i * 3 + 2]], dir = G.norm([b[0] - cx, 0, b[2] - cz]), r0 = Math.hypot(b[0] - cx, b[2] - cz);
      const rr = r0 + (Math.min(r0, 0.068) - r0) * smoothstep(0, 1, t);
      const p = [cx + dir[0] * rr, b[1] + 0.035 * t, cz + dir[2] * rr];
      const front = p[2] < cz && Math.abs(p[0] - cx) < 0.006;
      row.push(add(p, dir, front ? SL.shirtAccent : SL.shirt));
    }
    ring.push(row);
  }
  // face de dentro (3 mm para dentro), cor de acabamento
  const inner = ring.map(row => row.map(v => { const p = OUT.slice(v * 3, v * 3 + 3), nn = NOR.slice(v * 3, v * 3 + 3); return add([p[0] - nn[0] * 0.003, p[1], p[2] - nn[2] * 0.003], [-nn[0], -nn[1], -nn[2]], SL.shirtTrim); }));
  const quad = (a, b, c, d, out) => { idx.push(a, b, c, a, c, d); };
  for (let r = 0; r < rows - 1; r++) for (let j = 0; j < m; j++) {
    const k = (j + 1) % m;
    quad(ring[r][j], ring[r][k], ring[r + 1][k], ring[r + 1][j]);
    quad(inner[r][j], inner[r + 1][j], inner[r + 1][k], inner[r][k]);
  }
  // borda de cima
  for (let j = 0; j < m; j++) { const k = (j + 1) % m; quad(ring[rows - 1][j], ring[rows - 1][k], inner[rows - 1][k], inner[rows - 1][j]); }
  orientFaces(OUT, idx, NOR);
  const n = OUT.length / 3, W = new Float32Array(n * NB);
  for (let i = 0; i < n; i++) { const t = clamp((OUT[i * 3 + 1] - (N[1] - 0.03)) / 0.06, 0, 1); W[i * NB + BI.torso] = 1 - 0.4 * t; W[i * NB + BI.head] = 0.4 * t; }
  return { P: Float64Array.from(OUT), N: Float64Array.from(NOR), slot: Uint8Array.from(SLOT), idx: Uint32Array.from(idx), W };
}

// saia do saia-short (v4): começa no cós (cobre o cós do short) e abre para baixo; o raio de cada direção é a
// superfície mais de fora acumulada de cima para baixo (+ folga), pala justa até a barra das camisetas e evasê abaixo,
// com 9 pregas macias (o raio e a barra ondulam, mais forte embaixo). Face de dentro 2,5 mm para dentro (forro: a
// saia vista de baixo não fica vazada), unida à de fora por uma borda de barra de verdade. Pesos: quadril dominante;
// as pernas entram aos poucos para baixo (frente até 0,65, lados 0,25, trás 0,4) e se dividem entre L e R por uma
// função larga e lisa de x — a saia estica entre as pernas em vez de rasgar em abas.
function skirt(Lm, slices, outerAt) {
  const T0 = Lm.T[1] + 0.002, y1 = Lm.H[1] - 0.155, yY = Lm.H[1] - 0.045, AR = 54, trimH = 0.016, NP = 9;
  const ts = [0, 0.1, 0.2, 0.32, 0.44, 0.56, 0.68, 0.8, 0.9, 1 - trimH / (T0 - y1), 1 - trimH / (T0 - y1), 1];   // linha repetida = divisa da barra
  const sl0 = slices.get(Math.floor(T0 * 100)) || [...slices.values()][0];
  const cx = sl0.c[0], cz = sl0.c[1];
  const hullAt = (y, dx, dz) => outerAt(cx, y, cz, dx, dz);
  const OUT = [], NOR = [], SLOT = [], idx = [], ring = [], TF = [];
  const add = (p, nn, sl) => { OUT.push(...p); NOR.push(...nn); SLOT.push(sl); return OUT.length / 3 - 1; };
  let rHip = 0;
  const runMax = new Float64Array(AR);
  const pleat = th => { const u = Math.sin(NP * th + 0.35 * Math.sin(3 * th)); return Math.sign(u) * Math.pow(Math.abs(u), 0.7); };
  ts.forEach((t, r) => {
    const yb = T0 + (y1 - T0) * t, row = [];
    for (let a = 0; a < AR; a++) {
      const th = 2 * Math.PI * a / AR, dx = Math.sin(th), dz = -Math.cos(th);
      for (let yy = yb + 0.003; yy >= yb - 0.02; yy -= 0.003) runMax[a] = Math.max(runMax[a], hullAt(yy, dx, dz));
      const front = smoothstep(0, 1, -dz);
      const tf = clamp((yY - yb) / (yY - y1), 0, 1), pl = pleat(th) * smoothstep(0.15, 1, tf);
      const rr = runMax[a] + 0.0045 + 0.017 * smoothstep(0, 0.35, tf) + 0.05 * Math.pow(tf, 1.5) + 0.012 * tf * front + 0.0055 * pl;
      const y = yb + 0.004 * pl * smoothstep(0.7, 1, t);   // barra levemente ondulada nas pregas
      rHip = Math.max(rHip, rr);
      row.push(add([cx + dx * rr, y, cz + dz * rr], G.norm([dx, 0.3, dz]), r >= ts.length - 2 ? SL.shortsTrim : SL.shorts));
      TF.push(t);
    }
    ring.push(row);
  });
  // normais de verdade da face de fora (as pregas mudam a direção)
  const outIdx = [];
  for (let r = 0; r < ts.length - 1; r++) { if (ts[r + 1] === ts[r]) continue; for (let a = 0; a < AR; a++) { const b = (a + 1) % AR; outIdx.push(ring[r][a], ring[r + 1][a], ring[r + 1][b], ring[r][a], ring[r + 1][b], ring[r][b]); } }
  orientFaces(OUT, outIdx, NOR);
  { const nO = OUT.length / 3, NN = vertexNormals(OUT, outIdx, nO); for (let i = 0; i < nO; i++) { const l = Math.hypot(NN[i * 3], NN[i * 3 + 1], NN[i * 3 + 2]); if (l > 0.5) for (let k = 0; k < 3; k++) NOR[i * 3 + k] = NN[i * 3 + k]; } }
  // linhas repetidas (divisa da cor) ficam com a normal da de cima
  for (let r = 1; r < ts.length; r++) if (ts[r] === ts[r - 1]) for (let a = 0; a < AR; a++) for (let k = 0; k < 3; k++) NOR[ring[r][a] * 3 + k] = NOR[ring[r - 1][a] * 3 + k];
  const nOut = OUT.length / 3;
  const inner = ring.map(row => row.map(v => { const p = OUT.slice(v * 3, v * 3 + 3), nn = NOR.slice(v * 3, v * 3 + 3); TF.push(TF[v]); return add([p[0] - nn[0] * 0.0025, p[1], p[2] - nn[2] * 0.0025], [-nn[0], -nn[1], -nn[2]], SL.shorts); }));
  for (const t of outIdx) idx.push(t);
  for (let r = 0; r < ts.length - 1; r++) {
    if (ts[r + 1] === ts[r]) continue;
    for (let a = 0; a < AR; a++) { const b = (a + 1) % AR; idx.push(inner[r][a], inner[r][b], inner[r + 1][b], inner[r][a], inner[r + 1][b], inner[r + 1][a]); }
  }
  // borda da barra: anel próprio (normal para baixo), cor de barra
  const L = ts.length - 1, rimO = [], rimI = [];
  for (let a = 0; a < AR; a++) { const o = ring[L][a], q = inner[L][a]; rimO.push(add(OUT.slice(o * 3, o * 3 + 3), [0, -1, 0], SL.shortsTrim)); TF.push(1); rimI.push(add(OUT.slice(q * 3, q * 3 + 3), [0, -1, 0], SL.shortsTrim)); TF.push(1); }
  const rimIdx = [];
  for (let a = 0; a < AR; a++) { const b = (a + 1) % AR; rimIdx.push(rimO[a], rimI[a], rimI[b], rimO[a], rimI[b], rimO[b]); }
  orientFaces(OUT, rimIdx, NOR);
  for (const t of rimIdx) idx.push(t);
  const innerIdx = idx.slice(outIdx.length, idx.length - rimIdx.length);
  orientFaces(OUT, innerIdx, NOR);
  for (let k = 0; k < innerIdx.length; k++) idx[outIdx.length + k] = innerIdx[k];
  const n = OUT.length / 3, W = new Float32Array(n * NB), flags = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    const x = OUT[i * 3], z = OUT[i * 3 + 2], t = TF[i];
    const c = -(z - cz) / rHip, sx = clamp((x - cx) / (0.8 * rHip), -1, 1);   // c > 0 frente; lado esquerdo do jogo = x negativo
    const ty = Math.pow(smoothstep(0.05, 1, t), 1.1);
    const wl = ty * (0.25 + 0.4 * smoothstep(0, 1, c) + 0.15 * smoothstep(0, 1, -c));
    const sL = 0.5 - 0.5 * Math.sin(clamp(sx * 1.4, -1, 1) * Math.PI / 2);
    W[i * NB + BI.hips] = 1 - wl; W[i * NB + BI.legL] = wl * sL; W[i * NB + BI.legR] = wl * (1 - sL);
    flags[i] = i >= nOut ? 2 | 4 : 4;   // bit2 = saia (bit1 = forro e borda)
  }
  return { P: Float64Array.from(OUT), N: Float64Array.from(NOR), slot: Uint8Array.from(SLOT), idx: Uint32Array.from(idx), W, flags };
}

// cada triângulo com a normal do lado das normais dos vértices
function orientFaces(P, idx, N) {
  for (let t = 0; t < idx.length; t += 3) {
    const a = idx[t] * 3, b = idx[t + 1] * 3, c = idx[t + 2] * 3;
    const fn = G.cross(G.sub([P[b], P[b + 1], P[b + 2]], [P[a], P[a + 1], P[a + 2]]), G.sub([P[c], P[c + 1], P[c + 2]], [P[a], P[a + 1], P[a + 2]]));
    const nn = [N[a] + N[b] + N[c], N[a + 1] + N[b + 1] + N[c + 1], N[a + 2] + N[b + 2] + N[c + 2]];
    if (G.dot(fn, nn) < 0) { const k = idx[t + 1]; idx[t + 1] = idx[t + 2]; idx[t + 2] = k; }
  }
}

// oclusão de uma roupa pronta (raios contra corpo + a própria roupa)
// bodyBVH: só a pele que continua visível com esta roupa (a pele coberta é cortada no jogo; com ela o tecido que passa
// por dentro do corpo ficava com manchas escuras do mamilo e do abdômen)
export function garmentAO(G0, bodyBVH, rays) {
  const own = new BVH(G0.P, G0.lods[0]);
  const used = new Uint8Array(G0.nv);
  for (const L of G0.lods) for (const i of L) used[i] = 1;
  const ao = rayAO([bodyBVH, own], G0.P, G0.N, G0.nv, { rays, maxD: 0.25, k: 0.6, offset: 0.002, only: used });
  for (let i = 0; i < G0.nv; i++) { if (G0.FLAGS[i] & 1) ao[i] *= 0.8; if (G0.FLAGS[i] & 2) ao[i] *= 0.6; }
  return ao;
}

// pesos densos (17) de cada vértice da roupa
export function garmentWeights(G0, Lm = null) {
  const W = new Float32Array(G0.nv * NB);
  for (let i = 0; i < G0.nv; i++) {
    if (G0.Wx && G0.Wx.has(i)) { W.set(G0.Wx.get(i), i * NB); continue; }
    const o = G0.REC[i] * KN;
    let s = 0;
    for (let b = 0; b < 17; b++) { W[i * NB + b] = Math.max(0, G0.V[o + K.w0 + b]); s += W[i * NB + b]; }
    for (let b = 0; b < 17; b++) W[i * NB + b] /= s || 1;
  }
  // tops: a passagem tronco → braço espalhada pela casca (braço levantado acima da cabeça: sem bolha na axila nem
  // nas costas). Laplaciano dos pesos só onde há mistura de braço, na malha soldada por posição (costuras iguais).
  if (G0.layer === 3) {
    const wd = weld(G0.P, G0.nv, 1e-6), nw = wd.nw, Ww = new Float64Array(nw * NB), cnt = new Float64Array(nw), all = [];
    for (let i = 0; i < G0.nv; i++) { if (G0.Wx && G0.Wx.has(i)) continue; cnt[wd.wid[i]]++; for (let b = 0; b < NB; b++) Ww[wd.wid[i] * NB + b] += W[i * NB + b]; }
    for (let w = 0; w < nw; w++) if (cnt[w]) for (let b = 0; b < NB; b++) Ww[w * NB + b] /= cnt[w];
    for (const L of G0.lods) for (const i of L) all.push(wd.wid[i]);
    const adj = neighbors(Uint32Array.from(all), nw), arm = w => Ww[w * NB + BI.armL] + Ww[w * NB + BI.armR] + Ww[w * NB + BI.elbowL] + Ww[w * NB + BI.elbowR];
    const mix = new Uint8Array(nw); for (let w = 0; w < nw; w++) { const a = arm(w); mix[w] = cnt[w] && a > 0.02 && a < 0.98 ? 1 : 0; }
    for (let it = 0; it < 2; it++) { const t = Uint8Array.from(mix); for (let w = 0; w < nw; w++) if (mix[w]) for (let q = adj.off[w]; q < adj.off[w + 1]; q++) t[adj.nb[q]] = cnt[adj.nb[q]] ? 1 : 0; mix.set(t); }
    smoothField(Ww, NB, adj, 8, 0.5, Uint8Array.from(mix, m => 1 - m));
    for (let i = 0; i < G0.nv; i++) { if (G0.Wx && G0.Wx.has(i)) continue; let s2 = 0; for (let b = 0; b < NB; b++) { const v = Math.max(0, Ww[wd.wid[i] * NB + b]); W[i * NB + b] = v; s2 += v; } for (let b = 0; b < NB; b++) W[i * NB + b] /= s2 || 1; }
    // mangas (v4): passada a costura do ombro a manga é do braço (≥ 0,8, 0,95 a 5 cm) — com o braço acima da cabeça a
    // manga vai junto em vez de ficar de "asa" presa ao tronco
    if (Lm) for (let i = 0; i < G0.nv; i++) {
      if (G0.Wx && G0.Wx.has(i)) continue;
      const o = G0.REC[i] * KN, wArm = G0.V[o + K.wArm]; if (wArm < 0.3) continue;
      const sd = G0.V[o] < 0 ? 'L' : 'R', S = Lm.S[sd], ax = G.norm(G.sub(Lm.E[sd], S)), t = G.dot(G.sub([G0.V[o], G0.V[o + 1], G0.V[o + 2]], S), ax);
      const Lt = (0.8 + 0.15 * smoothstep(0.0, 0.05, t)) * smoothstep(0.3, 0.55, wArm) * smoothstep(-0.03, 0.0, t);
      const a = BI['arm' + sd], e = BI['elbow' + sd], L = W[i * NB + a] + W[i * NB + e];
      if (L >= Lt || Lt <= 0) continue;
      const ka = L > 1e-6 ? Lt / L : 0, kr = (1 - Lt) / Math.max(1e-6, 1 - L);
      for (let b = 0; b < NB; b++) W[i * NB + b] *= (b === a || b === e) ? ka : kr;
      if (L <= 1e-6) W[i * NB + a] = Lt;
    }
  }
  return W;
}
