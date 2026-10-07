// Roupas (§6): cascas recortadas do próprio corpo pela função de região R_g, subdivididas, afastadas
// pela espessura/folga do tecido (com caimento, dobras, colisão e camadas), com barra dobrada para dentro,
// espaços de cor por faixa e oclusão. Saída explícita (posição, normal, ossos, atributos) — ver §6.1 na espec.
import * as G from './gltf.mjs';
import { K, KN, garmentTerms, evalR, limbCoords, hemY, sleeveLen } from './label.mjs';
const KN0 = KN;
import { BI, NB, quantWeights } from './body.mjs';
import { BVH, neighbors, vertexNormals, boundaryLoops, smoothField, smoothstep, smax, clamp, noise3, rng, seedOf, rayAO, compact, taubin, weld, surfaceNets, components } from './geom.mjs';
import { zeroAlong, gradAt } from './proxy.mjs';
import { simplifier } from './encode.mjs';
import { drapeBase, DRAPE_KINDS, isLoose, armpitApex, legLen as DR_legLen } from './drape.mjs';
import { SL, COVER_BITS } from './consts.mjs';
import * as FIT from './fit.mjs';
import * as PS from './posed.mjs';

const MAT = { cotton: 1, tech: 2 };
export const smoothstepX = smoothstep;
// margem (m, valor de R_g) a partir da qual a pele embaixo da roupa some (máscara de cobertura)
export const cullMargin = kind => (!process.env.EP_OLD_GARMENTS && isLoose(kind)) ? -0.035 : -0.015;
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
  const tris = [], whole = new Set();
  for (let t = 0; t < widx.length; t += 3) {
    const v = [widx[t], widx[t + 1], widx[t + 2]];
    const ins = v.map(w => R[w] < 0);
    if (!ins[0] && !ins[1] && !ins[2]) continue;
    // v8: triângulo inteiro dentro fica sempre (mesmo com área ~0): tirá-lo abria um furo no meio da peça
    if (!subdivide && ins[0] && ins[1] && ins[2]) whole.add(tris.length / 3);
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
    if (out[t] === out[t + 1] || out[t + 1] === out[t + 2] || out[t] === out[t + 2]) continue;
    const ux = V[b] - V[a], uy = V[b + 1] - V[a + 1], uz = V[b + 2] - V[a + 2], vx = V[c] - V[a], vy = V[c + 1] - V[a + 1], vz = V[c + 2] - V[a + 2];
    const ar = Math.hypot(uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx);
    if (ar > 2e-9 || (!subdivide && whole.has(t / 3))) keep.push(out[t], out[t + 1], out[t + 2]);
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
        const Ls = sleeveLen(g);
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
  const top = spec.layer === 3;
  if (DRAPE_KINDS.includes(kind) && !process.env.EP_OLD_GARMENTS) return buildDraped(C, kind, ctx, spec, terms);
  const isTop = spec.layer === 3, proxy = isTop ? (kind === 'corta-vento' ? ctx.proxy.loose : ctx.proxy.fit) : null;
  const nb = spec.layer === 2 && ctx.nets ? (kind === 'legging' || kind === 'saia-short' ? ctx.nets.tight : ctx.nets.loose) : null;
  const cs = nb ? cutAndSubdivide(nb.V, nb.idx, terms, false) : cutAndSubdivide(proxy ? proxy.Aw : Aw, widx, terms);
  let { V, idx, n } = cs;
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

// v8: rede de segurança — laços de borda pequenos (perímetro < maxPerim) no meio da peça são furos (não aberturas):
// fechados por um leque a partir do centroide (registro = média dos registros do laço, normal = média)
export function fillSmallHoles(V, idx, n, maxPerim, KK = KN) {
  const loops = boundaryLoops(idx), add = [], newRecs = [];
  let filled = 0;
  for (const l of loops) {
    if (l.length < 3) continue;
    let per = 0; for (let j = 0; j < l.length; j++) { const a = l[j] * KK, b = l[(j + 1) % l.length] * KK; per += Math.hypot(V[a] - V[b], V[a + 1] - V[b + 1], V[a + 2] - V[b + 2]); }
    if (per >= maxPerim) continue;
    const r = new Float64Array(KK);
    for (const v of l) for (let k = 0; k < KK; k++) r[k] += V[v * KK + k] / l.length;
    if (KK === KN) { const nl = Math.hypot(r[3], r[4], r[5]) || 1; r[3] /= nl; r[4] /= nl; r[5] /= nl; }
    const c = n + newRecs.length; newRecs.push(r);
    // o laço vem no sentido das arestas dos triângulos vizinhos: o leque vai no sentido contrário
    for (let j = 0; j < l.length; j++) add.push(l[(j + 1) % l.length], l[j], c);
    filled++;
  }
  if (!filled) return { V, idx, n, filled: 0 };
  const V2 = new Float64Array((n + newRecs.length) * KK); V2.set(V.subarray(0, n * KK));
  newRecs.forEach((r, i) => V2.set(r, (n + i) * KK));
  const I2 = new Uint32Array(idx.length + add.length); I2.set(idx); I2.set(add, idx.length);
  return { V: V2, idx: I2, n: n + newRecs.length, filled };
}

// v8: base das peças justas de baixo (legging) — a própria pele da região (R_g + 3,5 cm de margem, subdividida 1→4),
// alisada com força (Taubin: some a micro-forma do corpo — dobra do glúteo, virilha em "V", calombos da grade de voxels
// e o degrau entre o campo do quadril e os tubos das pernas que sombreavam em manchas), afastada 2,8 mm pela normal
// alisada e empurrada para ficar ≥ 2,4 mm fora da pele original em todo lugar. Registros = os da pele (pesos etc.);
// tb = 2 nas pernas (grupos do ajuste por poses), sx = coordenada da perna.
function tightShellBase(kind, C, Aw, terms, bodyBVH) {
  const cs = cutAndSubdivide(Aw, C.body.widx, { _R: (A, o) => evalR(terms, A, o) - 0.035 }, true);
  const { V, idx, n } = cs, adj = neighbors(idx, n), fixed = new Float64Array(n).fill(1);
  for (const l of boundaryLoops(idx)) for (const v of l) fixed[v] = 0;
  const B = new Float64Array(n * 3);
  for (let i = 0; i < n; i++) for (let k = 0; k < 3; k++) B[i * 3 + k] = V[i * KN + k];
  taubin(B, adj, fixed, +(process.env.EP_LEG_TAUBIN || 40));
  const NN = vertexNormals(B, idx, n), P = new Float64Array(n * 3);
  for (let i = 0; i < n; i++) {
    const o = i * KN, s0 = NN[i * 3] * V[o + 3] + NN[i * 3 + 1] * V[o + 4] + NN[i * 3 + 2] * V[o + 5] < 0 ? -1 : 1;
    for (let k = 0; k < 3; k++) { NN[i * 3 + k] *= s0; P[i * 3 + k] = B[i * 3 + k] + NN[i * 3 + k] * 0.0028; }
  }
  const BN = C.body.NW, BW = C.body.widx, dmin = 0.0024;
  const push = () => {
    let moved = 0;
    for (let i = 0; i < n; i++) {
      const h = bodyBVH.closest(P[i * 3], P[i * 3 + 1], P[i * 3 + 2], 0.06); if (h.tri < 0) continue;
      const a = BW[h.tri * 3] * 3, b = BW[h.tri * 3 + 1] * 3, c = BW[h.tri * 3 + 2] * 3;
      const nn = G.norm([BN[a] * h.u + BN[b] * h.v + BN[c] * h.w, BN[a + 1] * h.u + BN[b + 1] * h.v + BN[c + 1] * h.w, BN[a + 2] * h.u + BN[b + 2] * h.v + BN[c + 2] * h.w]);
      const sd = (P[i * 3] - h.x) * nn[0] + (P[i * 3 + 1] - h.y) * nn[1] + (P[i * 3 + 2] - h.z) * nn[2];
      if (sd < dmin) { for (let k = 0; k < 3; k++) P[i * 3 + k] += nn[k] * (dmin - sd); moved++; }
    }
    return moved;
  };
  // empurra, alisa o deslocamento (sem degrau onde a pele empurrou) e empurra de novo
  for (let it = 0; it < 3; it++) {
    push();
    const D = new Float64Array(n * 3);
    for (let i = 0; i < n; i++) for (let k = 0; k < 3; k++) D[i * 3 + k] = P[i * 3 + k] - B[i * 3 + k];
    smoothField(D, 3, adj, 4, 0.5);
    for (let i = 0; i < n; i++) for (let k = 0; k < 3; k++) P[i * 3 + k] = B[i * 3 + k] + D[i * 3 + k];
  }
  const moved = push();
  const N2 = vertexNormals(P, idx, n);
  for (let i = 0; i < n; i++) {
    const o = i * KN, s0 = N2[i * 3] * NN[i * 3] + N2[i * 3 + 1] * NN[i * 3 + 1] + N2[i * 3 + 2] * NN[i * 3 + 2] < 0 ? -1 : 1;
    for (let k = 0; k < 3; k++) { V[o + k] = P[i * 3 + k]; V[o + 3 + k] = N2[i * 3 + k] * s0; }
    V[o + K.dr] = 1; V[o + K.tb] = V[o + K.wLeg] >= 0.5 ? 2 : 0; V[o + K.sx] = V[o + K.sL]; V[o + K.jn] = 0;
  }
  console.log('  casca justa', kind, n, 'vértices,', idx.length / 3, 'triângulos, empurrados no fim', moved);
  return { V, idx, n };
}

// ---------------------------------------------------------------- roupa caída (v5, drape.mjs)
// O volume da peça já é o tecido (folga, queda, dobras): recorta pela região R_g, alisa de leve, colide com o corpo,
// passa por cima das camadas de baixo e segue para as faixas de cor/LODs/barra.
function buildDraped(C, kind, ctx, spec, terms) {
  const { Aw, Lm, bodyBVH, lower } = ctx, top = spec.layer === 3, loose = isLoose(kind);
  const DB = kind === 'legging' && !process.env.EP_LEGTUBE ? tightShellBase(kind, C, Aw, terms, bodyBVH) : drapeBase(kind, C, Aw);
  const cs0 = cutAndSubdivide(DB.V, DB.idx, terms, false);
  const cs = fillSmallHoles(cs0.V, cs0.idx, cs0.n, 0.05);
  if (cs.filled) { console.log('  furos fechados', kind, cs.filled); C.rep['furos_' + kind] = cs.filled; }
  const { V, idx, n } = cs;
  if (process.env.DBG_LOOPS === kind) {   // depuração: laços de borda e o termo que corta cada um
    const lb = boundaryLoops(DB.idx);
    console.log('  LAÇOS na malha caída (antes do recorte):', lb.length, lb.map(l => l.length + '@' + [0, 1, 2].map(k => DB.V[l[0] * KN + k].toFixed(3)).join(',')).join(' '));
    const dg = [];
    for (let t = 0; t < DB.idx.length; t += 3) {
      const a = DB.idx[t] * KN, b = DB.idx[t + 1] * KN, c = DB.idx[t + 2] * KN, V0 = DB.V;
      const ux = V0[b] - V0[a], uy = V0[b + 1] - V0[a + 1], uz = V0[b + 2] - V0[a + 2], vx = V0[c] - V0[a], vy = V0[c + 1] - V0[a + 1], vz = V0[c + 2] - V0[a + 2];
      const ar = Math.hypot(uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx);
      if (ar <= 2e-9) dg.push([V0[a], V0[a + 1], V0[a + 2]].map(x => x.toFixed(3)).join(',') + ' L' + [Math.hypot(ux, uy, uz), Math.hypot(vx, vy, vz)].map(x => (x * 1000).toFixed(2)).join('/'));
    }
    console.log('  DEGENERADOS', dg.length, dg.slice(0, 12).join(' | '));
    for (const l of boundaryLoops(idx)) {
      const c = [0, 0, 0], tc = {};
      for (const v of l) { for (let k = 0; k < 3; k++) c[k] += V[v * KN + k] / l.length; let best = null, bv = -1e9; for (const nm in terms) { if (nm === '_R') continue; const x = terms[nm](V, v * KN); if (x > bv) { bv = x; best = nm; } } tc[best] = (tc[best] || 0) + 1; }
      const r0 = V[l[0] * KN + K.dr], t0 = V[l[0] * KN + K.tb], s0 = V[l[0] * KN + K.sx], sa = V[l[0] * KN + K.sA], wa = V[l[0] * KN + K.wArm];
      console.log('  LAÇO', l.length, c.map(x => x.toFixed(3)).join(','), JSON.stringify(tc), 'dr', r0.toFixed(2), 'tb', t0.toFixed(2), 'sx', s0.toFixed(3), 'sA', sa.toFixed(3), 'wArm', wa.toFixed(2));
    }
  }
  {   // tira o degrau da grade (surface nets) sem mexer na borda
    const adj = neighbors(idx, n), fixed = new Uint8Array(n);
    for (const l of boundaryLoops(idx)) for (const v of l) fixed[v] = 1;
    const B = new Float64Array(n * 3), m = new Float64Array(n);
    for (let i = 0; i < n; i++) { for (let k = 0; k < 3; k++) B[i * 3 + k] = V[i * KN + k]; m[i] = fixed[i] ? 0 : 1; }
    // v8: peças justas de baixo (legging, short da saia) — o quadril vem de um campo de voxels de 4 mm e sombreava em
    // manchas (calombos da grade): 24 passos de Taubin (a colisão logo abaixo devolve o tecido para fora da pele)
    taubin(B, adj, m, (kind === 'legging' || kind === 'saia-short') ? 24 : 3);
    const NN = vertexNormals(B, idx, n);
    for (let i = 0; i < n; i++) {
      const o = i * KN, s0 = NN[i * 3] * V[o + 3] + NN[i * 3 + 1] * V[o + 4] + NN[i * 3 + 2] * V[o + 5] < 0 ? -1 : 1;
      for (let k = 0; k < 3; k++) { V[o + k] = B[i * 3 + k]; V[o + 3 + k] = NN[i * 3 + k] * s0; }
    }
  }
  const P = new Float64Array(n * 3);
  for (let i = 0; i < n; i++) for (let k = 0; k < 3; k++) P[i * 3 + k] = V[i * KN + k];
  const BN = C.body.NW, BW = C.body.widx;
  const nrmAt = h => {
    const a = BW[h.tri * 3] * 3, b = BW[h.tri * 3 + 1] * 3, c = BW[h.tri * 3 + 2] * 3;
    return G.norm([BN[a] * h.u + BN[b] * h.v + BN[c] * h.w, BN[a + 1] * h.u + BN[b + 1] * h.v + BN[c + 1] * h.w, BN[a + 2] * h.u + BN[b + 2] * h.v + BN[c + 2] * h.w]);
  };
  // colisão: o tecido fica a ≥ dmin da pele (pela normal do ponto mais próximo)
  const dmin = loose ? 0.003 : spec.mat === MAT.tech ? 0.0012 : 0.0016;
  const collide = () => {
    for (let i = 0; i < n; i++) {
      const h = bodyBVH.closest(P[i * 3], P[i * 3 + 1], P[i * 3 + 2], 0.08);
      if (h.tri < 0) continue;
      const nn = nrmAt(h), sd = (P[i * 3] - h.x) * nn[0] + (P[i * 3 + 1] - h.y) * nn[1] + (P[i * 3 + 2] - h.z) * nn[2];
      if (sd < dmin) for (let k = 0; k < 3; k++) P[i * 3 + k] += nn[k] * (dmin - sd);
    }
  };
  collide();
  // camadas: por cima das roupas de baixo (todas do gênero) com folga
  if (lower && lower.length) {
    const marg = top ? 0.005 : 0.002, need = new Float64Array(n);
    for (const L of lower) for (let i = 0; i < n; i++) {
      const p0 = [P[i * 3], P[i * 3 + 1], P[i * 3 + 2]], bn = [V[i * KN + 3], V[i * KN + 4], V[i * KN + 5]];
      // raio de dentro para fora pela normal da superfície: a camada de baixo que estiver até 4 cm para dentro
      const o = G.sub(p0, G.scl(bn, 0.04));
      let t0 = 0;
      for (let guard = 0; guard < 6; guard++) {
        const h = L.bvh.ray(o[0] + bn[0] * t0, o[1] + bn[1] * t0, o[2] + bn[2] * t0, bn[0], bn[1], bn[2], 0.08);
        if (!h || t0 + h.t > 0.06) break;
        const a = L.idx[h.tri * 3] * 3, b = L.idx[h.tri * 3 + 1] * 3, c = L.idx[h.tri * 3 + 2] * 3, w0 = 1 - h.u - h.v, Nn = L.N;
        const hn = G.norm([Nn[a] * w0 + Nn[b] * h.u + Nn[c] * h.v, Nn[a + 1] * w0 + Nn[b + 1] * h.u + Nn[c + 1] * h.v, Nn[a + 2] * w0 + Nn[b + 2] * h.u + Nn[c + 2] * h.v]);
        if (G.dot(hn, bn) >= 0.4) need[i] = Math.max(need[i], t0 + h.t - 0.04 + marg);
        t0 += h.t + 0.0005;
      }
    }
    const adjL = neighbors(idx, n);
    for (let it = 0; it < 2; it++) { const t = Float64Array.from(need); for (let i = 0; i < n; i++) for (let q = adjL.off[i]; q < adjL.off[i + 1]; q++) t[i] = Math.max(t[i], need[adjL.nb[q]]); need.set(t); }
    smoothField(need, 1, adjL, 3, 0.5);
    for (let i = 0; i < n; i++) if (need[i] > 0) for (let k = 0; k < 3; k++) P[i * 3 + k] += V[i * KN + 3 + k] * need[i];
    collide();
  }
  // costura lateral das roupas de baixo tirada da própria peça (lisa, sem os calombos do corpo): a listra/painel sai dela
  if (spec.layer === 2) ctx = { ...ctx, seam: { L: garmentSeam(V, n, 'L', Lm), R: garmentSeam(V, n, 'R', Lm) } };
  // tops soltos: costuras laterais (linha mais de fora do tronco abaixo da axila) e de ombro (cume do ombro)
  if (top && loose) ctx = { ...ctx, seamTop: topSeams(V, n, Lm) };
  const SF = slotFields(kind, C.g, Lm, terms, ctx);
  return finishShell(C, kind, spec, { V, P, idx: Uint32Array.from(idx), n, SF, terms, Lm, bodyBVH, lower, ctx, draped: true, kind });
}
function topSeams(V, n, Lm) {
  const apY = Lm.Sy - 0.1, out = { side: {}, ridge: {}, apY };
  const sm = (pts, ks) => { for (let it = 0; it < 3; it++) { const t = pts.map(p => p.slice()); for (let i = 0; i < pts.length; i++) { const acc = [0, 0, 0]; let c = 0; for (let j = Math.max(0, i - 3); j <= Math.min(pts.length - 1, i + 3); j++) { for (const k of ks) acc[k] += pts[j][k]; c++; } for (const k of ks) t[i][k] = acc[k] / c; } for (let i = 0; i < pts.length; i++) pts[i] = t[i]; } return pts; };
  const ext = pts => { if (pts.length > 1) { const a = pts[0], b = pts[1], c = pts[pts.length - 1], d = pts[pts.length - 2]; pts.unshift(G.add(a, G.scl(G.sub(a, b), 3))); pts.push(G.add(c, G.scl(G.sub(c, d), 3))); } return pts; };
  for (const sd of ['L', 'R']) {
    const sg = sd === 'L' ? -1 : 1, side = [], ridge = [];
    let yLo = 1e9; for (let i = 0; i < n; i++) if (V[i * KN + K.tb] < 0.5) yLo = Math.min(yLo, V[i * KN + 1]);
    for (let y = yLo; y <= apY; y += 0.01) {
      let best = null, bx = -1;
      for (let i = 0; i < n; i++) { const o = i * KN; if (V[o + K.tb] > 0.5 || Math.abs(V[o + 1] - y) > 0.006 || V[o] * sg < bx) continue; bx = V[o] * sg; best = [V[o], y, V[o + 2]]; }
      if (best) side.push(best);
    }
    let xMax = 0; for (let i = 0; i < n; i++) { const o = i * KN; if (V[o + K.tb] < 0.5 && V[o + 1] > Lm.Sy - 0.05) xMax = Math.max(xMax, V[o] * sg); }
    for (let x = 0.07; x <= xMax + 1e-9; x += 0.005) {
      let best = null, by = -1;
      for (let i = 0; i < n; i++) { const o = i * KN; if (V[o + K.tb] > 0.5 || Math.abs(V[o] * sg - x) > 0.003 || V[o + 1] < Lm.Sy - 0.08 || V[o + 1] < by) continue; by = V[o + 1]; best = [sg * x, V[o + 1], V[o + 2]]; }
      if (best) ridge.push(best);
    }
    out.side[sd] = ext(sm(side, [0, 2])); out.ridge[sd] = ext(sm(ridge, [1, 2]));
  }
  return out;
}

// ponto mais de fora de cada fatia de 1 cm (lado sd) da superfície da peça, alisado em x e z (média móvel ±4 cm)
function garmentSeam(V, n, sd, Lm) {
  let yLo = 1e9, yHi = -1e9;
  for (let i = 0; i < n; i++) { yLo = Math.min(yLo, V[i * KN + 1]); yHi = Math.max(yHi, V[i * KN + 1]); }
  const pts = [];
  for (let y = yLo; y <= yHi + 1e-9; y += 0.01) {
    let best = null, bx = -1;
    for (let i = 0; i < n; i++) { const o = i * KN; if (Math.abs(V[o + 1] - y) > 0.006) continue; const x = sd === 'L' ? -V[o] : V[o]; if (x > bx) { bx = x; best = [V[o], y, V[o + 2]]; } }
    if (best) pts.push(best);
  }
  for (let it = 0; it < 3; it++) {
    const t = pts.map(p => p.slice());
    for (let i = 0; i < pts.length; i++) { let ax = 0, az = 0, c = 0; for (let j = Math.max(0, i - 4); j <= Math.min(pts.length - 1, i + 4); j++) { ax += pts[j][0]; az += pts[j][2]; c++; } t[i][0] = ax / c; t[i][2] = az / c; }
    for (let i = 0; i < pts.length; i++) pts[i] = t[i];
  }
  // prolonga 3 cm nas pontas (o campo não acaba antes da borda)
  if (pts.length > 1) { const a = pts[0], b = pts[1], c = pts[pts.length - 1], d = pts[pts.length - 2]; pts.unshift(G.add(a, G.scl(G.sub(a, b), 3))); pts.push(G.add(c, G.scl(G.sub(c, d), 3))); }
  return pts;
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
    const sL = ctx.seam ? ctx.seam.L : lateralSeam(ctx.Aw, Lm, ctx.bodyBVH, 'L'), sR = ctx.seam ? ctx.seam.R : lateralSeam(ctx.Aw, Lm, ctx.bodyBVH, 'R');
    const u = (A, o) => seamU(A[o] < 0 ? sL : sR, [A[o], A[o + 1], A[o + 2]]);
    const w = typeof hw === 'function' ? hw : () => hw;
    // um campo só: |u| − meia largura (com o refinamento perto das linhas, a interpolação de |u| não serrilha)
    return [['stripe', (A, o) => Math.min(Math.abs(u(A, o)), 0.06) - w(A[o + 1])]];
  };
  // debrum/cós: largura medida pela distância geodésica até o laço de borda daquele tipo (gola, manga, barra, cós,
  // perna, punho de meia) — a linha de cor fica paralela à borda de verdade
  const trimBy = (widths, extra, rule) => { const SFo = { fields: [['trim', (A, o) => SFo.trimD(A, o)], ...extra], rule, trimWidths: widths }; return SFo; };
  // costura da cava (v5): faixa de 3 mm, cor de acabamento, na linha onde o tronco encontra a manga (zero da folga com
  // sinal entre os tubos). Dois campos com sinal (um por borda) para o corte ficar exato em triângulos grandes.
  const seams = (sleeves) => {
    if (!ctx.seamTop || !sleeves) return [];
    const hw = 0.001;   // v6: linha fina (2 mm), sem relevo
    return [['seamA', (A, o) => A[o + K.jn] - hw], ['seamB', (A, o) => -A[o + K.jn] - hw]];
  };
  switch (kind) {
    case 'camiseta': return trimBy({ neck: 0.016, sleeve: 0.018, hem: 0.018 }, seams(true), n => n.trim || (n.seamA && n.seamB) ? T.shirtTrim : T.shirt);
    case 'regata': return trimBy({ neck: 0.014, sleeve: 0.012, hem: 0.018 }, seams(false), n => n.trim || (n.seamA && n.seamB) ? T.shirtTrim : T.shirt);
    case 'top': {   // debrum pela distância geodésica à borda da casca (−R dava ilhas no encontro bojo/alça)
      const SFo = { fields: [['trim', (A, o) => Math.min(SFo.edge(A, o) - 0.009, A[o + 1] - (Lm.Ybra + 0.02))]], rule: n => n.trim ? T.shirtTrim : T.shirt, needEdge: true,
        // v7: debrum enrolado nas alças/decote/cavas (2,2 mm na borda, perfil redondo até a linha de cor, 9 mm para
        // dentro) e a faixa de baixo como elástico em relevo (1,6 mm, degrau de 4 mm na borda de cima)
        trimRaise: (A, o) => { const e = SFo.edge(A, o), a1 = 0.0022 * Math.sqrt(clamp(1 - (e / 0.009) * (e / 0.009), 0, 1)), a2 = 0.0016 * smoothstep(0, 0.004, (Lm.Ybra + 0.02) - A[o + 1]); return Math.max(a1, a2); } };
      return SFo;
    }
    case 'manga-longa': return trimBy({ neck: 0.016, sleeve: 0.03, hem: 0.018 }, seams(true), n => n.trim || (n.seamA && n.seamB) ? T.shirtTrim : T.shirt);
    case 'corta-vento': {
      const Yb = Lm.Sy - 0.12;
      const SFo = {
        trimWidths: { sleeve: 0.03, hem: 0.022 },
        fields: [['zip', (A, o) => Math.max(Math.abs(A[o]) - 0.006, A[o + 2] - Lm.cz)],
          ['trim', (A, o) => SFo.trimD(A, o)], ...seams(true),
          // faixa refletiva só nas costas (na frente cruzava o zíper e formava uma cruz)
          // v8: só no meio das costas (|x| < 10 cm): perto da axila a faixa entortava em "V" com o braço erguido
          ['band', (A, o) => Math.max(Math.abs(A[o + 1] - Yb) - 0.007, (Lm.cz + 0.03) - A[o + 2], A[o + K.wArm] - 0.3, Math.abs(A[o]) - (g === 'f' ? 0.09 : 0.1))]],
        rule: n => n.zip ? T.shirtAccent : n.trim || (n.seamA && n.seamB) ? T.shirtTrim : n.band ? T.shirtAccent : T.shirt };
      return SFo;
    }
    case 'short': case 'bermuda': return trimBy({ waist: 0.035, leg: 0.015 }, stripe(0.0075), n => n.trim ? T.shortsTrim : n.stripe ? T.shortsAccent : T.shorts);
    // short de baixo da saia: liso, da cor da saia (só aparece com a perna levantada)
    case 'saia-short': return trimBy({ waist: 0.035, leg: 0.012 }, [], n => T.shorts);
    // legging: painel lateral largo (como a corsário de referência): 2,4 cm de meia largura no quadril → 1,3 cm na barra
    // v8 (feminina, corsário): painel largo e curvo — meia largura 40 mm no quadril → 22 mm no joelho → 16 mm na barra,
    // e o centro escorrega para trás da costura (−2,8 cm) do quadril até a panturrilha, como o painel cinza da referência
    case 'legging': {
      if (g === 'f') {
        const sL = ctx.seam ? ctx.seam.L : lateralSeam(ctx.Aw, Lm, ctx.bodyBVH, 'L'), sR = ctx.seam ? ctx.seam.R : lateralSeam(ctx.Aw, Lm, ctx.bodyBVH, 'R');
        const yH = Lm.H[1] - 0.03, yK = Lm.Kn.L[1] + 0.01;
        const cOf = y => -0.028 * smoothstep(yH, yK - 0.04, y), wOf = y => 0.016 + 0.006 * smoothstep(yK - 0.12, yK, y) + 0.018 * smoothstep(yK + 0.02, yH, y);
        const panel = (A, o) => { const u = seamU(A[o] < 0 ? sL : sR, [A[o], A[o + 1], A[o + 2]]); return Math.min(Math.abs(u - cOf(A[o + 1])), 0.09) - wOf(A[o + 1]); };
        return trimBy({ waist: 0.045, leg: 0.012 }, [['stripe', panel]], n => n.trim ? T.shortsTrim : n.stripe ? T.shortsAccent : T.shorts);
      }
      return trimBy({ waist: 0.045, leg: 0.012 }, stripe(y => 0.013 + 0.011 * smoothstep(Lm.Kn.L[1] - 0.05, Lm.H[1] - 0.02, y)), n => n.trim ? T.shortsTrim : n.stripe ? T.shortsAccent : T.shorts);
    }
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
    if (KK === KN0) { const nl = Math.hypot(rec[3], rec[4], rec[5]) || 1; rec[3] /= nl; rec[4] /= nl; rec[5] /= nl; }   // só registros de roupa têm normal em [3..5]
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
// v8: também some toda ilha cuja caixa tem diagonal < minDiag (faixa de acabamento solta no meio do tecido: mancha
// escura redonda) — as faixas de verdade (gola, barra, cós, punho, listra, zíper, refletivo, costuras) são compridas
export function cleanIslands(idx, P, tslot, minA, minDiag = 0) {
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
      let small = A < minA;
      if (!small && minDiag > 0) {
        const lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9];
        for (const t of list) for (let e = 0; e < 3; e++) { const v = idx[t * 3 + e]; for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], P[v * 3 + k]); hi[k] = Math.max(hi[k], P[v * 3 + k]); } }
        small = Math.hypot(hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]) < minDiag;
      }
      if (!small) return;
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
// v8: perímetro de um laço (posições P, passo 3)
const loopPerim = (P, l) => { let s = 0; for (let j = 0; j < l.length; j++) { const a = l[j] * 3, b = l[(j + 1) % l.length] * 3; s += Math.hypot(P[a] - P[b], P[a + 1] - P[b + 1], P[a + 2] - P[b + 2]); } return s; };
function finishShell(C, kind, spec, S) {
  const { V, idx, n, SF } = S, Sm = simplifier(), P = Float64Array.from(S.P);
  // 1. bordas (barras) alisadas ao longo do laço: sem serrilhado do recorte e do afastamento por vértice
  // v8: só as aberturas de verdade (perímetro ≥ 8 cm) — um furinho não ganha faixa de acabamento nem barra
  let loops = boundaryLoops(idx).filter(l => loopPerim(P, l) >= 0.08);
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
      let ty;
      if (kind === 'meia') ty = f.y > S.Lm.An.L[1] + 0.03 ? 'top' : null;
      else if (top) ty = f.y === yMax && kind !== 'corta-vento' ? 'neck' : f.x > 0.12 ? 'sleeve' : 'hem';
      else ty = f.y === yMax ? 'waist' : 'leg';
      if (ty && W[ty] != null) typed.push([segsOf(l), W[ty], ty]);
    });
    SF.trimD = (A, o) => { let d = 0.2; for (const [segs, w] of typed) d = Math.min(d, dSegs(segs, A, o) - w); return d; };
    // faixa dupla em relevo (barra dobrada, ribana da gola, cós elástico, punho): altura por tipo de borda
    const RAISE = { neck: 0.0016, sleeve: kind === 'camiseta' ? 0.0009 : 0.0014, hem: 0.0009, waist: 0.0013, leg: 0.0008, top: 0.0007 };
    SF.trimRaise = (A, o) => { let d = 1e9, r = 0; for (const [segs, w, ty] of typed) { const x = dSegs(segs, A, o) - w; if (x < d) { d = x; r = RAISE[ty] || 0; } } return r; };
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
  const lipTris = Math.round(lipLoops.reduce((a, l) => a + 2 * perim(l) / 0.012, 0) * (S.draped && isLoose(kind) ? 2.6 : 1));
  // v4: a borda também é simplificada (dentro do erro de 2,5 mm) — a casca da grade de voxels tem borda de 5 mm, que
  // travada comia o orçamento do miolo (facetado e dobras na virilha)
  const U0 = simp(idx, Math.max(spec.lod[0] * 0.88 - lipTris, spec.lod[0] * 0.45), 0.0025, ['ErrorAbsolute']);
  const U1 = simp(U0, spec.lod[1] * 0.75, kind === 'meia' ? 0.02 : 0.012, ['ErrorAbsolute']);
  const U2 = simp(U1, spec.lod[2] * 0.9, 0.05, ['ErrorAbsolute']);
  const bvh0 = new BVH(P, idx);   // casca cheia (antes da simplificação): todo LOD fica por cima dela
  if (process.env.DBG_LOD) console.log(kind, 'casca', idx.length / 3, 'U', U0.length / 3, U1.length / 3, U2.length / 3, 'barra', lipTris);
  // 4. monta cada LOD
  const OP = [], ON = [], OV = [], OSL = [], OFL = [], lods = [];
  OFL.src = [];   // v6: vértice de origem na casca (barra e forro herdam os pesos dele)
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
    // costuras (linhas finas) só no LOD0
    const useF = SF.fields.map(f => l === 0 || !f[0].startsWith('seam'));
    if (l < 2) M = refineNear(M, fns.filter((fn, q) => useF[q]), l ? 0.010 : 0.005);
    M.F = fns.map(fn => { const a = []; for (let i = 0; i < M.n; i++) a.push(fn(M.V, i * KN)); return a; });
    flips({ n: 'refina' + l, V: M.V }, M.P, M.idx);
    if (l < 2) for (let fi = 0; fi < fns.length; fi++) if (useF[fi]) M = cutBy(M, fi);
    flips({ n: 'corte' + l, V: M.V }, M.P, M.idx);
    // espaço por triângulo pela regra; ilhas pequenas somem
    const nt = M.idx.length / 3, names = SF.fields.map(f => f[0]), tslot = new Uint8Array(nt);
    for (let t = 0; t < nt; t++) { const neg = {}; if (l < 2) names.forEach((nm, q) => { const f = M.F[q]; neg[nm] = useF[q] && f[M.idx[t * 3]] + f[M.idx[t * 3 + 1]] + f[M.idx[t * 3 + 2]] < 0; }); tslot[t] = SF.rule(neg); }   // LOD2: só a cor principal
    cleanIslands(M.idx, M.P, tslot, [1.5e-4, 4e-4, 9e-4][l], 0.06);
    let dup = splitSlots(M, { fields: SF.fields, rule: (ng, t) => tslot[t] });
    // os cortes deixam lascas (ponto de corte perto de um vértice): simplificação com erro de 0,6 mm, divisas de
    // cor preservadas (vértices duplicados = costura) e borda travada
    if (l < 2) {
      const P32c = Float32Array.from(dup.P), r = Sm.simplify(Uint32Array.from(dup.idx), P32c, 3, 0, l ? 0.0015 : 0.0006, ['LockBorder', 'ErrorAbsolute'])[0];
      dup = { ...dup, idx: r };
    }
    flips({ n: 'final' + l, V: dup.V }, dup.P, dup.idx);
    // normais lisas pela malha cortada (antes da duplicação das divisas)
    const wIdx = Uint32Array.from(dup.idx, i => dup.orig[i]);
    let NW = vertexNormals(M.P, wIdx, M.n);
    // faixas de acabamento em relevo (tecido dobrado): sobe pela normal dentro da faixa, zero na linha de cor
    const ti = SF.fields.findIndex(f => f[0] === 'trim');
    if (S.draped && l < 2 && ti >= 0 && SF.trimRaise) {
      const done = new Uint8Array(M.n);
      for (const i of wIdx) {
        if (done[i]) continue; done[i] = 1;
        const tf = M.F[ti][i]; if (!(tf < 0)) continue;
        const a = SF.trimRaise(M.V, i * KN) * smoothstep(0, 0.0022, -tf);
        for (let k = 0; k < 3; k++) M.P[i * 3 + k] += NW[i * 3 + k] * a;
      }
      for (let i = 0; i < dup.n; i++) for (let k = 0; k < 3; k++) dup.P[i * 3 + k] = M.P[dup.orig[i] * 3 + k];
      NW = vertexNormals(M.P, wIdx, M.n);
    }
    // v6: zíper do corta-vento em relevo (fita de 12 mm com 1,4 mm de altura)
    const zi = SF.fields.findIndex(f => f[0] === 'zip');
    if (S.draped && l < 2 && zi >= 0) {
      const done = new Uint8Array(M.n);
      for (const i of wIdx) { if (done[i]) continue; done[i] = 1; const zf = M.F[zi][i]; if (!(zf < 0)) continue; const a = 0.0014 * smoothstep(0, 0.0018, -zf); for (let k = 0; k < 3; k++) M.P[i * 3 + k] += NW[i * 3 + k] * a; }
      for (let i = 0; i < dup.n; i++) for (let k = 0; k < 3; k++) dup.P[i * 3 + k] = M.P[dup.orig[i] * 3 + k];
      NW = vertexNormals(M.P, wIdx, M.n);
    }
    const base = OP.length / 3;
    for (let i = 0; i < dup.n; i++) {
      for (let k = 0; k < 3; k++) { OP.push(dup.P[i * 3 + k]); ON.push(NW[dup.orig[i] * 3 + k]); }
      for (let k = 0; k < KN; k++) OV.push(dup.V[i * KN + k]);
      OSL.push(dup.slot[i]); OFL.push(0); OFL.src.push(-1);
    }
    const L = Array.from(dup.idx, i => i + base);
    if (l === 0) {
      // barra dobrada para dentro (só LOD0)
      const lp = S.draped && isLoose(kind) ? hemFinish(kind, S, dup, wIdx, M, NW, base, OP, ON, OV, OSL, OFL) : buildLips(kind, S, dup, wIdx, M.n, NW, base, OP, ON, OV, OSL, OFL);
      for (const i of lp.tris) L.push(i);
      neckLoop = lp.neckLoop; neckP = M.P;
      // forro da manga curta (experimental, EP_SLEEVELINING=1): manga + cabeça do ombro, simplificado, 3,5 mm por
      // dentro (olhar pela boca da manga para o alto dela)
      if (process.env.EP_SLEEVELINING && S.draped && kind === 'camiseta') for (const i of sleeveLining(C, S, Sm, dup, wIdx, M, NW, base, OP, ON, OV, OSL, OFL)) L.push(i);
      // v8: forro de dentro do short/bermuda (costas, lados e parede de dentro, do cós à barra): com a coxa erguida,
      // olhando pela boca da perna aparece o avesso do tecido, nunca o vazio (o corpo embaixo da peça é cortado)
      // v9: o avesso inteiro sai de hemFinish (EP_OLDLINING=1 volta ao forro separado)
      if (S.draped && (kind === 'short' || kind === 'bermuda') && process.env.EP_OLDLINING && !process.env.EP_NOLINING) for (const i of bottomLining(C, S, Sm, dup, wIdx, M, NW, base, OP, ON, OV, OSL, OFL)) L.push(i);
    }
    lods.push(Uint32Array.from(L));
  });
  const nv = OP.length / 3, REC = new Int32Array(nv);
  for (let i = 0; i < nv; i++) REC[i] = i;
  const FLAGS = Uint8Array.from(OFL), SRC = Int32Array.from(OFL.src);
  const res = { kind, nv, P: Float64Array.from(OP), N: Float64Array.from(ON), REC, V: Float64Array.from(OV), SLOT: Uint8Array.from(OSL), FLAGS, SRC, lods, mat: spec.mat, layer: spec.layer, Wx: null };
  if (kind === 'corta-vento' && neckLoop) addExtra(res, collar(neckLoop, neckP, S.Lm), [true, true, false]);
  if (S.draped && (kind === 'short' || kind === 'bermuda')) { const X = drawcord(res, S.Lm); if (X) addExtra(res, X, [true, false, false]); }
  if (S.draped && kind === 'corta-vento') { const X = cordLock(res, S.Lm); if (X) addExtra(res, X, [true, false, false]); }
  // forro da axila (v6, experimental, EP_PITPATCH=1): segue a pele 4 mm acima dela; onde o tecido de fora afunda
  // abaixo dele aparece como o próprio tecido (bit 8 em FLAGS: oclusão da casca de fora). Desligado: o contorno
  // serrilhado dele aparecia sob o braço erguido; a camiseta deixa a pele da axila (pipeline.cullTerms)
  if (process.env.EP_PITPATCH && S.draped && kind === 'camiseta') { const X = pitPatch(C, S); if (X) addExtra(res, X, [true, false, false]); }
  if (kind === 'saia-short') {
    // raio de cada direção = superfície mais de fora (casca do short + corpo), vista de fora para dentro
    const Aw = S.ctx.Aw, WI = S.ctx.widx, sb = new BVH(P, idx), sb1 = new BVH(res.P, res.lods[1]);   // casca cheia e a do LOD1 (inflada)
    const bb = new BVH(C.body.PW, WI, t => { for (let e = 0; e < 3; e++) { const o = WI[t * 3 + e] * KN; if (Aw[o + K.wArm] >= 0.3 || Aw[o + K.hand] >= 0.3) return false; } return true; });   // sem braços e mãos
    const outerAt = (cx, y, cz, dx, dz) => {
      let r = 0;
      for (const b of [sb, sb1, bb]) { const h = b.ray(cx + dx * 0.4, y, cz + dz * 0.4, -dx, 0, -dz, 0.4); if (h) r = Math.max(r, 0.4 - h.t); }
      return r;
    };
    // pesos (v4): calculados em skirt() — quadril dominante, pernas lisas em volta do anel inteiro (sem rasgo).
    // v6: LOD1 com a saia de 20 colunas (a de 48 sozinha passava o LOD1 da corredora de 9,5k)
    addExtra(res, skirt(S.Lm, S.ctx.slices, outerAt, 0), [true, false, false]);
    addExtra(res, skirt(S.Lm, S.ctx.slices, outerAt, 1), [false, true, false]);
    addExtra(res, skirt(S.Lm, S.ctx.slices, outerAt, 2), [false, false, true]);   // v7: LOD2 com a saia (antes caía no short liso)
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
        OP.push(...pp); ON.push(...tout); for (let k = 0; k < KN; k++) OV.push(V[r + k]); OSL.push(sl); OFL.push(1); OFL.src.push(base + firstDup[i]);
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

// acabamento das bordas das peças soltas (v5): borda enrolada (meia-cana de espessura t) e, por dentro, uma faixa de
// forro (a própria casca a até D da borda, deslocada t para dentro, com as faces invertidas) — vista de baixo a barra
// tem espessura e o interior da roupa aparece escuro, não vazado.
// v8: forro das roupas de baixo soltas. Região: a casca LOD0 inteira abaixo do cós (3 cm) — com a coxa erguida, pela
// boca da perna aparecem as costas, os lados, o fundilho e o avesso da frente. Simplificado (~55 %), 6 mm para
// dentro pela normal, faces invertidas, cor da peça, bit de forro (oclusão × 0,55); pesos do vértice da casca de
// origem (SRC).
function bottomLining(C, S, Sm, dup, wIdx, M, NW, base, OP, ON, OV, OSL, OFL) {
  const nM = M.n, PM = M.P, Lm = S.Lm, yTop = Lm.T[1] - 0.012 - 0.03;
  const firstDup = new Int32Array(nM).fill(-1);
  for (let i = 0; i < dup.n; i++) if (firstDup[dup.orig[i]] < 0) firstDup[dup.orig[i]] = i;
  // a perna da peça (tubo, abaixo da virilha) inteira — com a coxa erguida a frente dela fica de cara para quem olha
  // por baixo; do quadril para cima só costas, lados e parede de dentro
  // fora o miolo do gancho (|x| < 3,5 cm, ±3,5 cm da virilha): ali a casca dobra apertada no sprint e o forro
  // aparecia em fiozinhos escuros pela dobra (por dentro ele fica escondido pela parte de dentro da coxa)
  const inR = w => PM[w * 3 + 1] < yTop && !(Math.abs(PM[w * 3]) < 0.035 && Math.abs(PM[w * 3 + 1] - Lm.crotchY) < 0.035);
  const sub = [];
  for (let k = 0; k < wIdx.length; k += 3) { const a = wIdx[k], b = wIdx[k + 1], c = wIdx[k + 2]; if (inR(a) && inR(b) && inR(c)) sub.push(a, b, c); }
  if (!sub.length) return [];
  // 6 mm para dentro e pouco simplificado (55 %): as cordas de um forro grosso cortavam por fora dos vales das dobras da
  // perna e o avesso aparecia em pintinhas escuras na coxa no sprint
  const P32 = Float32Array.from(PM), red = Sm.simplify(Uint32Array.from(sub), P32, 3, Math.floor(sub.length * 0.55 / 3) * 3, 0.003, ['ErrorAbsolute', 'LockBorder'])[0];
  const map = new Map(), tris = [], t = 0.006;
  const v = w => {
    if (map.has(w)) return map.get(w);
    const di = firstDup[w], id = OP.length / 3;
    for (let k = 0; k < 3; k++) { OP.push(PM[w * 3 + k] - NW[w * 3 + k] * t); ON.push(-NW[w * 3 + k]); }
    for (let k = 0; k < KN; k++) OV.push(dup.V[di * KN + k]);
    OSL.push(SL.shorts); OFL.push(2); OFL.src.push(base + di);
    map.set(w, id); return id;
  };
  for (let k = 0; k < red.length; k += 3) tris.push(v(red[k]), v(red[k + 2]), v(red[k + 1]));
  C.rep['forro_' + S.kind] = red.length / 3;
  console.log('  forro', S.kind || '', sub.length / 3, '→', red.length / 3, 'triângulos');
  return tris;
}

function sleeveLining(C, S, Sm, dup, wIdx, M, NW, base, OP, ON, OV, OSL, OFL) {
  const nM = M.n, PM = M.P, VM = M.V, apY = armpitApex(C, C.Aw).y, Ls = sleeveLen(C.g) - 0.025;
  const firstDup = new Int32Array(nM).fill(-1);
  for (let i = 0; i < dup.n; i++) if (firstDup[dup.orig[i]] < 0) firstDup[dup.orig[i]] = i;
  // região: tubo da manga até 2,5 cm da barra (o resto é o forro da barra) + ombro (|x| > 10 cm acima da axila)
  const inR = w => { const o = w * KN, sleeveT = VM[o + K.dr] > 0.5 && VM[o + K.tb] > 0.5 && VM[o + K.tb] < 1.5; if (sleeveT) return VM[o + K.sx] < Ls; return Math.abs(PM[w * 3]) > 0.1 && PM[w * 3 + 1] > apY - 0.015; };
  const sub = [];
  for (let k = 0; k < wIdx.length; k += 3) { const a = wIdx[k], b = wIdx[k + 1], c = wIdx[k + 2]; if (inR(a) && inR(b) && inR(c)) sub.push(a, b, c); }
  if (!sub.length) return [];
  const P32 = Float32Array.from(PM), red = Sm.simplify(Uint32Array.from(sub), P32, 3, Math.floor(sub.length * 0.4 / 3) * 3, 0.003, ['ErrorAbsolute'])[0];
  const map = new Map(), tris = [];
  const v = w => {
    if (map.has(w)) return map.get(w);
    const di = firstDup[w], id = OP.length / 3;
    for (let k = 0; k < 3; k++) { OP.push(PM[w * 3 + k] - NW[w * 3 + k] * 0.0035); ON.push(-NW[w * 3 + k]); }
    for (let k = 0; k < KN; k++) OV.push(dup.V[di * KN + k]);
    OSL.push(SL.shirt); OFL.push(2); OFL.src.push(base + di);
    map.set(w, id); return id;
  };
  for (let k = 0; k < red.length; k += 3) tris.push(v(red[k]), v(red[k + 2]), v(red[k + 1]));
  if (process.env.DBG_LOD) console.log('forro da manga', sub.length / 3, '→', red.length / 3);
  return tris;
}

function hemFinish(kind, S, dup, wIdx, M, NW, base, OP, ON, OV, OSL, OFL) {
  const nM = M.n, PM = M.P, top = ['camiseta', 'regata', 'manga-longa', 'corta-vento'].includes(kind);
  let loops = boundaryLoops(wIdx).filter(l => loopPerim(PM, l) >= 0.08);
  const firstDup = new Int32Array(nM).fill(-1);
  for (let i = 0; i < dup.n; i++) if (firstDup[dup.orig[i]] < 0) firstDup[dup.orig[i]] = i;
  const my = l => l.reduce((a, i) => a + PM[i * 3 + 1], 0) / l.length, mx = l => l.reduce((a, i) => a + Math.abs(PM[i * 3]), 0) / l.length;
  const yTop = Math.max(...loops.map(my));
  let neckLoop = null;
  if (kind === 'corta-vento') { neckLoop = loops.reduce((b, l) => (!b || my(l) > my(b)) ? l : b, null); loops = loops.filter(l => l !== neckLoop); }
  // profundidade do forro por tipo de borda
  const depthOf = l => { const y = my(l), x = mx(l); if (top) return Math.abs(y - yTop) < 1e-6 ? 0.012 : x > 0.12 ? 0.028 : 0.04; return Math.abs(y - yTop) < 1e-6 ? 0.015 : 0.038; };
  const t = top ? 0.0026 : 0.0024;
  // distância (pelo grafo, posições soldadas) até cada laço
  const adj = neighbors(wIdx, nM), dist = new Float64Array(nM).fill(1e9), lim = new Float64Array(nM).fill(0), q = [];
  for (const l of loops) { const D = depthOf(l); for (const v of l) { dist[v] = 0; lim[v] = D; q.push(v); } }
  for (let it = 0; it < q.length; it++) {
    const v = q[it];
    for (let k = adj.off[v]; k < adj.off[v + 1]; k++) {
      const u = adj.nb[k], d = dist[v] + Math.hypot(PM[u * 3] - PM[v * 3], PM[u * 3 + 1] - PM[v * 3 + 1], PM[u * 3 + 2] - PM[v * 3 + 2]);
      if (d < dist[u] && d < lim[v] + 0.012) { dist[u] = d; lim[u] = lim[v]; q.push(u); }
    }
  }
  const tris = [];
  // v9: short/bermuda — o avesso cobre a peça inteira do cós (−3 cm) para baixo, sem simplificar: o forro separado
  // (simplificado a 55 %, 6 mm para dentro, sem o miolo do gancho) deixava frestas na boca da perna com o joelho alto
  // (lascas brancas na parede de dentro, perto do gancho) e um degrau entre ele e a faixa da barra
  const fullIn = (kind === 'short' || kind === 'bermuda') && !process.env.EP_OLDLINING, yIn = S.Lm.T[1] - 0.012 - 0.03;
  if (fullIn) for (let v = 0; v < nM; v++) if (PM[v * 3 + 1] < yIn) { dist[v] = 0; lim[v] = 1; }
  // faixa de forro: triângulos (duplicados por cor) com os três cantos dentro da faixa
  const inMap = new Map();
  const innerOf = i => {   // i = índice dup
    if (inMap.has(i)) return inMap.get(i);
    const w = dup.orig[i], id = OP.length / 3;
    for (let k = 0; k < 3; k++) { OP.push(dup.P[i * 3 + k] - NW[w * 3 + k] * t); ON.push(-NW[w * 3 + k]); }
    for (let k = 0; k < KN; k++) OV.push(dup.V[i * KN + k]);
    OSL.push(dup.slot[i]); OFL.push(2); OFL.src.push(base + i);
    inMap.set(i, id); return id;
  };
  for (let k = 0; k < dup.idx.length; k += 3) {
    const a = dup.idx[k], b = dup.idx[k + 1], c = dup.idx[k + 2], wa = dup.orig[a], wb = dup.orig[b], wc = dup.orig[c];
    if (!(dist[wa] <= lim[wa] && dist[wb] <= lim[wb] && dist[wc] <= lim[wc])) continue;
    tris.push(innerOf(a), innerOf(c), innerOf(b));
  }
  // cor da borda: a do triângulo vizinho à aresta
  const edgeSlot = new Map(), edgeDup = new Map();
  for (let k = 0; k < dup.idx.length; k += 3) for (let e = 0; e < 3; e++) { const key = wIdx[k + e] + '_' + wIdx[k + (e + 1) % 3]; edgeSlot.set(key, dup.slot[dup.idx[k + e]]); edgeDup.set(key, dup.idx[k + e]); }
  // meia-cana entre a face de fora (borda) e a de dentro (borda − t·n). v9: um anel intermediário (o ápice), com
  // normais lisas — 3 anéis custavam 8 triângulos por vértice de borda (2,2 mil na regata) e de longe não se via
  const ANG = process.env.EP_ROLL3 ? [Math.PI * 0.3, Math.PI * 0.62, Math.PI * 0.86] : [Math.PI * 0.5];
  if (process.env.DBG_HEM && process.env.DBG_HEM.split(':')[0] === kind) {   // depuração: DBG_HEM=tipo:x,y,z
    const q = process.env.DBG_HEM.split(':')[1].split(',').map(Number);
    for (const loop of loops) loop.forEach((w, j) => { const u = loop[(j + 1) % loop.length], d = Math.hypot(PM[w * 3] - q[0], PM[w * 3 + 1] - q[1], PM[w * 3 + 2] - q[2]); if (d < 0.03) console.log('DBG_HEM', j, [0, 1, 2].map(k => PM[w * 3 + k].toFixed(3)).join(','), '→ próx', (Math.hypot(PM[u * 3] - PM[w * 3], PM[u * 3 + 1] - PM[w * 3 + 1], PM[u * 3 + 2] - PM[w * 3 + 2]) * 1000).toFixed(1) + 'mm', 'sx', M.V[w * KN + K.sx].toFixed(3), 'jn', M.V[w * KN + K.jn].toFixed(4)); });
  }
  for (const loop of loops) {
    const m = loop.length; if (m < 3) continue;
    const rings = [[], ...ANG.map(() => []), []];   // 0 = fora (borda), meia-cana, último = dentro
    for (let j = 0; j < m; j++) {
      const w = loop[j], wp = loop[(j + 1) % m], wm = loop[(j - 1 + m) % m];
      const e = [PM[wp * 3] - PM[wm * 3], PM[wp * 3 + 1] - PM[wm * 3 + 1], PM[wp * 3 + 2] - PM[wm * 3 + 2]], nn = [NW[w * 3], NW[w * 3 + 1], NW[w * 3 + 2]];
      const tout = G.norm(G.cross(e, nn)), B = [PM[w * 3], PM[w * 3 + 1], PM[w * 3 + 2]];
      const di = edgeDup.get(w + '_' + wp) ?? firstDup[w], sl = edgeSlot.get(w + '_' + wp) ?? dup.slot[firstDup[w]];
      const add = (p, nr, fl) => { const id = OP.length / 3; OP.push(...p); ON.push(...nr); for (let k = 0; k < KN; k++) OV.push(dup.V[di * KN + k]); OSL.push(sl); OFL.push(fl); OFL.src.push(base + di); return id; };
      rings[0].push(add(B, nn, 1));
      ANG.forEach((a, r) => rings[r + 1].push(add(G.add(B, G.add(G.scl(tout, t * 0.5 * Math.sin(a)), G.scl(nn, -t * 0.5 * (1 - Math.cos(a))))), G.norm(G.add(G.scl(nn, Math.cos(a)), G.scl(tout, Math.sin(a)))), 1)));
      rings[ANG.length + 1].push(add(G.sub(B, G.scl(nn, t)), G.scl(nn, -1), 1));
    }
    const lt = [];
    for (let r = 0; r <= ANG.length; r++) for (let j = 0; j < m; j++) { const k2 = (j + 1) % m, a = rings[r][j], b = rings[r][k2], c = rings[r + 1][k2], d = rings[r + 1][j]; lt.push(a, d, c, a, c, b); }
    for (let k = 0; k < lt.length; k += 3) {   // frente para fora da meia-cana
      const a = lt[k] * 3, b = lt[k + 1] * 3, c = lt[k + 2] * 3;
      const fn = G.cross([OP[b] - OP[a], OP[b + 1] - OP[a + 1], OP[b + 2] - OP[a + 2]], [OP[c] - OP[a], OP[c + 1] - OP[a + 1], OP[c + 2] - OP[a + 2]]);
      const nn = [ON[a] + ON[b] + ON[c], ON[a + 1] + ON[b + 1] + ON[c + 1], ON[a + 2] + ON[b + 2] + ON[c + 2]];
      if (G.dot(fn, nn) < 0) { const x = lt[k + 1]; lt[k + 1] = lt[k + 2]; lt[k + 2] = x; }
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
  if (R.SRC) { R.SRC = grow(R.SRC, 1, Int32Array); for (let i = n0; i < nv; i++) R.SRC[i] = -1; }
  if (!R.Wx) R.Wx = new Map();
  for (let i = 0; i < n; i++) R.Wx.set(n0 + i, X.W.subarray(i * NB, i * NB + NB));
  R.lods = R.lods.map((L, k) => { if (!inLod[k]) return L; const o = new Uint32Array(L.length + X.idx.length); o.set(L); for (let j = 0; j < X.idx.length; j++) o[L.length + j] = X.idx[j] + n0; return o; });
  R.nv = nv;
}

// cordão do cós (shorts/bermuda): dois cordões saindo da frente do cós, caindo 6,5 cm na frente do tecido, com
// ponteira. Pesos: quadril.
function drawcord(R, Lm) {
  const L0 = R.lods[0], sh = []; for (let t = 0; t < L0.length; t += 3) if (!((R.FLAGS[L0[t]] | R.FLAGS[L0[t + 1]] | R.FLAGS[L0[t + 2]]) & 3)) sh.push(L0[t], L0[t + 1], L0[t + 2]);
  const bvh = new BVH(R.P, sh);
  let yTop = -1e9; for (const i of sh) if (Math.abs(R.P[i * 3]) < 0.02 && R.P[i * 3 + 2] < Lm.H[2]) yTop = Math.max(yTop, R.P[i * 3 + 1]);
  if (yTop < 0) return null;
  const zAt = (x, y) => { const h = bvh.ray(x, y, -1, 0, 0, 1, 2); return h ? -1 + h.t : null; };
  const OUT = [], NOR = [], SLOT = [], idx = [], SIDES = 6;
  for (const sx of [-1, 1]) {
    const pts = [];
    for (let k = 0; k <= 8; k++) {
      const u = k / 8, y = yTop - 0.014 - 0.066 * u, x = sx * (0.007 + 0.013 * u * u);
      const z = zAt(x, y); if (z === null) return null;
      pts.push([x, y, z - 0.0032 - 0.003 * u]);
    }
    const base = OUT.length / 3;
    pts.forEach((c, k) => {
      const d = G.norm(G.sub(pts[Math.min(8, k + 1)], pts[Math.max(0, k - 1)])), a = G.norm(G.cross(d, [0, 0, 1])), b = G.cross(d, a);
      const r = k >= 7 ? 0.0026 : 0.0019, slot = k >= 7 ? SL.shortsTrim : SL.shortsAccent;
      for (let j = 0; j < SIDES; j++) { const th = 2 * Math.PI * j / SIDES, nn = G.add(G.scl(a, Math.cos(th)), G.scl(b, Math.sin(th))); OUT.push(...G.add(c, G.scl(nn, r))); NOR.push(...nn); SLOT.push(slot); }
    });
    for (let k = 0; k < 8; k++) for (let j = 0; j < SIDES; j++) { const a = base + k * SIDES + j, b = base + k * SIDES + (j + 1) % SIDES, c = base + (k + 1) * SIDES + (j + 1) % SIDES, d = base + (k + 1) * SIDES + j; idx.push(a, b, c, a, c, d); }
    const tip = OUT.length / 3; OUT.push(...G.add(pts[8], [0, -0.002, 0])); NOR.push(0, -1, 0); SLOT.push(SL.shortsTrim);
    for (let j = 0; j < SIDES; j++) idx.push(base + 8 * SIDES + j, base + 8 * SIDES + (j + 1) % SIDES, tip);
  }
  orientFaces(OUT, idx, NOR);
  const n = OUT.length / 3, W = new Float32Array(n * NB);
  for (let i = 0; i < n; i++) W[i * NB + BI.hips] = 1;
  // v8: bit 4 (16) = detalhe costurado por cima (cordão, trava): as verificações de ilhas de cor o ignoram
  return { P: Float64Array.from(OUT), N: Float64Array.from(NOR), slot: Uint8Array.from(SLOT), idx: Uint32Array.from(idx), W, flags: new Uint8Array(n).fill(16) };
}

// forro da axila (v6): a pele em volta do ápice da axila (6,5 cm, só a que fica debaixo da peça) copiada 4 mm para fora,
// com os pesos EXATOS da pele. Em repouso fica por dentro do tecido (não aparece); com o braço erguido ou balançando,
// onde a manga e o lado do tronco se afastam ela tapa a axila (sem buraco nem pele). Cor da peça, bit de forro.
function pitPatch(C, S) {
  const b = C.body, Aw = C.Aw, WI = b.widx, ap = armpitApex(C, Aw), Rr = 0.065, nw = b.weld.nw, terms = S.terms;
  const near = new Uint8Array(nw), map = new Int32Array(nw).fill(-1);
  for (let w = 0; w < nw; w++) {
    const p = [b.PW[w * 3], b.PW[w * 3 + 1], b.PW[w * 3 + 2]];
    if (Aw[w * KN + K.head] > 0.3 || Aw[w * KN + K.hand] > 0.3) continue;
    if (Math.min(G.dist(p, ap.L), G.dist(p, ap.R)) > Rr) continue;
    if (evalR(terms, Aw, w * KN) > -0.01) continue;   // só a pele coberta pela peça
    near[w] = 1;
  }
  const OUT = [], NOR = [], idx = [], W = [];
  for (let t = 0; t < WI.length; t += 3) {
    const a = WI[t], bb = WI[t + 1], c = WI[t + 2];
    if (!near[a] || !near[bb] || !near[c]) continue;
    for (const w of [a, bb, c]) {
      if (map[w] < 0) {
        map[w] = OUT.length / 3;
        for (let k = 0; k < 3; k++) { OUT.push(b.PW[w * 3 + k] + b.NW[w * 3 + k] * 0.004); NOR.push(b.NW[w * 3 + k]); }
        let s0 = 0; const wv = new Float64Array(NB);
        for (const bn of ['hips', 'torso', 'armL', 'elbowL', 'armR', 'elbowR']) { wv[BI[bn]] = Math.max(0, Aw[w * KN + K.w0 + BI[bn]]); s0 += wv[BI[bn]]; }
        for (let q = 0; q < NB; q++) W.push(wv[q] / (s0 || 1));
      }
      idx.push(map[w]);
    }
  }
  if (!idx.length) return null;
  const n = OUT.length / 3;
  return { P: Float64Array.from(OUT), N: Float64Array.from(NOR), slot: new Uint8Array(n).fill(SL.shirt), idx: Uint32Array.from(idx), W: Float32Array.from(W), flags: new Uint8Array(n).fill(8) };
}

// trava do cordão da barra do corta-vento (v6): um botão-trava (cilindro de 9 × 14 mm) na barra, do lado esquerdo da
// frente, com as duas pontas do cordão saindo dele. Pesos: os do registro do vértice da barra mais perto.
function cordLock(R, Lm) {
  const L0 = R.lods[0]; let best = -1, bd = 1e9;
  for (const i of L0) { if (R.FLAGS[i] & 2) continue; const x = R.P[i * 3], y = R.P[i * 3 + 1], z = R.P[i * 3 + 2]; if (z > Lm.cz - 0.03) continue; const d = Math.hypot(x + 0.115, (y - (Lm.T[1] - 0.075)) * 3); if (d < bd) { bd = d; best = i; } }
  if (best < 0) return null;
  // ponto mais baixo da barra perto de x = −11,5 cm (frente)
  let lo = best; for (const i of L0) { if (R.FLAGS[i] & 2) continue; if (Math.abs(R.P[i * 3] - R.P[best * 3]) < 0.008 && R.P[i * 3 + 2] < Lm.cz - 0.03 && R.P[i * 3 + 1] < R.P[lo * 3 + 1]) lo = i; }
  const p0 = [R.P[lo * 3], R.P[lo * 3 + 1], R.P[lo * 3 + 2]], nn = G.norm([R.N[lo * 3], 0, R.N[lo * 3 + 2]]);
  const OUT = [], NOR = [], SLOT = [], idx = [], SIDES = 8;
  const tube = (c0, c1, r0, r1, slot) => {   // cilindro de c0 a c1 com tampas
    const d = G.norm(G.sub(c1, c0)), a = G.norm(G.cross(d, Math.abs(d[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0])), b = G.cross(d, a), base = OUT.length / 3;
    for (const [c, r] of [[c0, r0], [c1, r1]]) for (let j = 0; j < SIDES; j++) { const th = 2 * Math.PI * j / SIDES, q = G.add(G.scl(a, Math.cos(th)), G.scl(b, Math.sin(th))); OUT.push(...G.add(c, G.scl(q, r))); NOR.push(...q); SLOT.push(slot); }
    for (let j = 0; j < SIDES; j++) { const k = (j + 1) % SIDES; idx.push(base + j, base + k, base + SIDES + k, base + j, base + SIDES + k, base + SIDES + j); }
    for (const [end, c, sg] of [[0, c0, -1], [1, c1, 1]]) { const ci = OUT.length / 3; OUT.push(...c); NOR.push(...G.scl(d, sg)); SLOT.push(slot); for (let j = 0; j < SIDES; j++) idx.push(ci, base + end * SIDES + j, base + end * SIDES + (j + 1) % SIDES); }
  };
  const c = G.add(p0, G.add(G.scl(nn, 0.006), [0, -0.012, 0]));
  tube(G.add(c, [0, 0.007, 0]), G.add(c, [0, -0.007, 0]), 0.0045, 0.0045, SL.shirtTrim);
  for (const sx of [-1, 1]) tube(G.add(p0, G.add(G.scl(nn, 0.004), [sx * 0.002, 0, 0])), G.add(c, [sx * 0.0015, 0.004, 0]), 0.0014, 0.0014, SL.shirtAccent);
  tube(G.add(c, [0, -0.007, 0]), G.add(c, [0.002, -0.03, 0.002]), 0.0013, 0.0011, SL.shirtAccent);
  orientFaces(OUT, idx, NOR);
  const n = OUT.length / 3, W = new Float32Array(n * NB), o = R.REC[lo] * KN;
  let s0 = 0; for (let b = 0; b < NB; b++) s0 += Math.max(0, R.V[o + K.w0 + b]);
  for (let i = 0; i < n; i++) for (let b = 0; b < NB; b++) W[i * NB + b] = Math.max(0, R.V[o + K.w0 + b]) / (s0 || 1);
  return { P: Float64Array.from(OUT), N: Float64Array.from(NOR), slot: Uint8Array.from(SLOT), idx: Uint32Array.from(idx), W, flags: new Uint8Array(n).fill(16) };
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
  // v7: uma fileira a mais embaixo (4 mm abaixo do decote, 1,5 mm para dentro, escondida sob a casca): as cordas do
  // decote reamostrado deixavam frestas nos lados da gola por onde a pele aparecia com a cabeça virada
  const tRows = [-0.115, 0, 0.5, 1], rows = tRows.length, ring = [];
  // raio do pescoço na altura da gola
  const add = (p, nn, sl) => { OUT.push(...p); NOR.push(...nn); SLOT.push(sl); return OUT.length / 3 - 1; };
  for (let r = 0; r < rows; r++) {
    const t = tRows[r], row = [];
    for (const i of loop) {
      const b = [P[i * 3], P[i * 3 + 1], P[i * 3 + 2]], dir = G.norm([b[0] - cx, 0, b[2] - cz]), r0 = Math.hypot(b[0] - cx, b[2] - cz);
      const rr = r0 + (Math.min(r0, 0.068) - r0) * smoothstep(0, 1, t) - (t < 0 ? 0.0015 : 0);
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
  return { P: Float64Array.from(OUT), N: Float64Array.from(NOR), slot: Uint8Array.from(SLOT), idx: Uint32Array.from(idx), W, flags: new Uint8Array(n).fill(16) };
}

// saia do saia-short (v4): começa no cós (cobre o cós do short) e abre para baixo; o raio de cada direção é a
// v7 (ESPEC §16): saia da saia-short em duas partes.
//  - Cós: anel contínuo sobre o quadril alisado (casco de cada direção na altura do cós, alisado em volta: sem os dentes
//    dos lados e de trás), espessura uniforme de 3,5 mm, borda de cima arredondada (meia-cana), face de dentro.
//  - Painel: pendurado sob o cós (4 mm por dentro dele), evasê para a barra, 8 flautas macias que crescem para baixo
//    (as cristas levantam a barra de leve), folga de 8 mm sobre o short de baixo; forro 2,5 mm por dentro e borda.
// LOD1: 24 colunas e metade das linhas; LOD2: 12 colunas, 3 linhas, só a face de fora (o evasê não some de longe).
// Pesos iniciais: quadril; as pernas entram para baixo (frente mais) e se dividem entre L e R por uma rampa larga em x —
// o ajuste por poses (fitSkirt) corrige onde a coxa ou o short de baixo passariam do tecido.
// v8 (experimental, desligado): folga extra do painel sobre o short de baixo nos lados/atrás, na parte de cima do painel
// (ESPEC §17.10: o short de baixo fura o quadril com a perna atrás; 12 mm até o meio do painel tira as manchas, mas o
// punho em repouso fica dentro do painel mais largo; só no quarto de cima não basta)
const SK_GAP = +(process.env.EP_SKIRT_GAP ?? 0), SK_RAMP = +(process.env.EP_SKIRT_RAMP ?? 0.05);
function skirt(Lm, slices, outerAt, lod = 0) {
  const AR = lod === 0 ? 48 : lod === 1 ? 24 : 12, NF = 8, T0 = Lm.T[1] + 0.002, wbH = 0.03, y1 = Lm.H[1] - 0.155;
  const sl0 = slices.get(Math.floor(T0 * 100)) || [...slices.values()][0], cx = sl0.c[0], cz = sl0.c[1];
  const hullAt = (y, dx, dz) => outerAt(cx, y, cz, dx, dz);
  const TH = [...Array(AR).keys()].map(a => 2 * Math.PI * a / AR), DX = TH.map(t => Math.sin(t)), DZ = TH.map(t => -Math.cos(t));
  const csm = (arr, sg) => { const R = Math.ceil(sg * 2.5), w = []; let ws = 0; for (let i = -R; i <= R; i++) { const x = Math.exp(-i * i / (2 * sg * sg)); w.push(x); ws += x; } return arr.map((_, a) => { let s = 0; for (let i = -R; i <= R; i++) s += w[i + R] * arr[((a + i) % AR + AR) % AR]; return s / ws; }); };
  const sgA = AR / 48;   // σ em colunas por unidade de 7,5°
  // casco na altura do cós (máximo na faixa), alisado em volta; nunca abaixo do casco + 1,5 mm
  const raw = TH.map((_, a) => { let r = 0; for (let y = T0 + 0.004; y >= T0 - wbH - 0.006; y -= 0.003) r = Math.max(r, hullAt(y, DX[a], DZ[a])); return r; });
  let hb = csm(csm(raw, 2.5 * sgA), 2.5 * sgA);
  hb = csm(hb.map((r, a) => Math.max(r, raw[a] + 0.0015)), 1.5 * sgA);
  const OUT = [], NOR = [], SLOT = [], idx = [], TF = [], FL = [];
  const add = (p, nn, sl, t, fl) => { OUT.push(...p); NOR.push(...nn); SLOT.push(sl); TF.push(t); FL.push(fl); return OUT.length / 3 - 1; };
  const quadRows = (A, B, flip = false) => { for (let a = 0; a < AR; a++) { const b = (a + 1) % AR; if (flip) idx.push(A[a], B[b], B[a], A[a], A[b], B[b]); else idx.push(A[a], B[a], B[b], A[a], B[b], A[b]); } };
  const ptAt = (a, r, y) => [cx + DX[a] * r, y, cz + DZ[a] * r];
  const rI = hb.map(r => r + 0.0015), rO = hb.map(r => r + 0.005);
  // ---- cós (LOD2: só a face de fora)
  const bandTop = [], bandBot = [];
  for (let a = 0; a < AR; a++) { bandTop.push(add(ptAt(a, rO[a], T0 - 0.0018), [DX[a], 0, DZ[a]], SL.shortsTrim, 0, 4)); bandBot.push(add(ptAt(a, rO[a], T0 - wbH), [DX[a], 0, DZ[a]], SL.shortsTrim, 0, 4)); }
  quadRows(bandTop, bandBot);
  if (lod < 2) {
    // meia-cana em cima: de fora para dentro passando por cima
    let prev = bandTop;
    for (const ang of [Math.PI * 0.3, Math.PI * 0.5, Math.PI * 0.7, Math.PI]) {
      const row = [];
      for (let a = 0; a < AR; a++) {
        const rc = (rI[a] + rO[a]) / 2, h = (rO[a] - rI[a]) / 2, r = rc + h * Math.cos(ang), y = T0 - 0.0018 + h * Math.sin(ang) * 0.9;
        row.push(add(ptAt(a, r, y), G.norm([DX[a] * Math.cos(ang), Math.sin(ang), DZ[a] * Math.cos(ang)]), SL.shortsTrim, 0, ang >= Math.PI - 1e-6 ? 6 : 4));
      }
      quadRows(prev, row); prev = row;
    }
    const inBot = []; for (let a = 0; a < AR; a++) inBot.push(add(ptAt(a, rI[a], T0 - wbH + 0.002), [-DX[a], 0, -DZ[a]], SL.shortsTrim, 0, 6));
    quadRows(prev, inBot);
  }
  // ---- painel
  const tH = [hemY('camiseta', Lm) - 0.006, hemY('corta-vento', Lm) - 0.006];
  const yTop = T0 - wbH + 0.004;
  const tRows = lod === 0 ? [0, 0.08, 0.18, 0.3, 0.44, 0.58, 0.72, 0.86, 1] : lod === 1 ? [0, 0.25, 0.5, 0.75, 1] : [0, 0.5, 1];
  const ts = [...new Set([...tRows, ...(lod < 2 ? tH.map(y => (yTop - y) / (yTop - y1)).filter(t => t > 0.02 && t < 0.98) : [])].map(v => +v.toFixed(4)))].sort((a, b) => a - b);
  const runMax = hb.map(r => r + 0.0015);
  const fl8 = TH.map(th => Math.cos(NF * th + 0.45 * Math.sin(3 * th + 0.7) + 0.3) * (0.8 + 0.4 * noise3(Math.cos(th) * 1.3, Math.sin(th) * 1.3, 2, 91)));
  const rows = [];
  let yPrev = yTop + 0.003;
  ts.forEach((t, ri) => {
    const yb = yTop + (y1 - yTop) * t;
    // folga de 8 mm sobre o short de baixo (+ SK_GAP experimental nos lados/atrás, no quarto de cima do painel)
    for (let a = 0; a < AR; a++) { const gap = 0.008 * smoothstep(0, 0.12, t) + SK_GAP * Math.max(smoothstep(0, 1, DZ[a]), DX[a] * DX[a]) * smoothstep(0, SK_RAMP, t) * (1 - smoothstep(0.2, 0.35, t)); for (let yy = Math.max(yPrev, yb + 0.003); yy >= yb - 0.02; yy -= 0.003) runMax[a] = Math.max(runMax[a], hullAt(yy, DX[a], DZ[a]) + gap); }
    const rm = csm(runMax, 1.2 * sgA), row = [];
    for (let a = 0; a < AR; a++) {
      const side = DX[a] * DX[a], front = smoothstep(0, 1, -DZ[a]);
      const flare = (0.014 * smoothstep(0, 0.35, t) + 0.05 * Math.pow(t, 1.5)) * (1 - 0.7 * side) + 0.012 * t * front;
      const flute = lod < 2 ? 0.011 * Math.pow(smoothstep(0.08, 1, t), 1.3) * (1 - 0.45 * side) * fl8[a] : 0;
      const r = Math.max(rm[a], rO[a] - 0.0012 * (1 - smoothstep(0, 0.1, t))) + flare + flute;
      const y = yb + smoothstep(0.82, 1, t) * (0.006 * (lod < 2 ? fl8[a] : 0) + 0.003 * Math.sin(TH[a] + 0.7));
      row.push(add(ptAt(a, r, y), [DX[a], 0.25, DZ[a]], SL.shorts, t, 4));
    }
    rows.push(row); yPrev = yb;
  });
  const outStart = idx.length;
  for (let r = 0; r + 1 < rows.length; r++) quadRows(rows[r], rows[r + 1]);
  // normais da face de fora pela malha (cós + painel)
  orientFaces(OUT, idx, NOR);
  { const nO = OUT.length / 3, NN = vertexNormals(OUT, idx, nO); for (let i = 0; i < nO; i++) { const l = Math.hypot(NN[i * 3], NN[i * 3 + 1], NN[i * 3 + 2]); if (l > 0.5 && !(FL[i] & 2)) for (let k = 0; k < 3; k++) NOR[i * 3 + k] = NN[i * 3 + k] / l; } }
  if (lod < 2) {
    // forro e borda da barra
    const inner = rows.map(row => row.map(v => { const p = OUT.slice(v * 3, v * 3 + 3), nn = NOR.slice(v * 3, v * 3 + 3); return add([p[0] - nn[0] * 0.0025, p[1], p[2] - nn[2] * 0.0025], [-nn[0], -nn[1], -nn[2]], SL.shorts, TF[v], 6); }));
    const inStart = idx.length;
    for (let r = 0; r + 1 < inner.length; r++) quadRows(inner[r], inner[r + 1], true);
    const L = rows.length - 1, rimO = [], rimI = [];
    for (let a = 0; a < AR; a++) { rimO.push(add(OUT.slice(rows[L][a] * 3, rows[L][a] * 3 + 3), [0, -1, 0], SL.shortsTrim, 1, 6)); rimI.push(add(OUT.slice(inner[L][a] * 3, inner[L][a] * 3 + 3), [0, -1, 0], SL.shortsTrim, 1, 6)); }
    const rimStart = idx.length;
    quadRows(rimO, rimI);
    const fix = (s0, e0) => { const sub = idx.slice(s0, e0); orientFaces(OUT, sub, NOR); for (let k = 0; k < sub.length; k++) idx[s0 + k] = sub[k]; };
    fix(inStart, rimStart); fix(rimStart, idx.length);
  }
  const n = OUT.length / 3, W = new Float32Array(n * NB), flags = Uint8Array.from(FL);
  let rHip = 0; for (const r of hb) rHip = Math.max(rHip, r);
  for (let i = 0; i < n; i++) {
    const x = OUT[i * 3], z = OUT[i * 3 + 2], t = TF[i], c = -(z - cz) / rHip;
    const front = smoothstep(0, 1, c), backn = smoothstep(0, 1, -c), ty = Math.pow(smoothstep(0.12, 1, t), 1.2);
    const wl = ty * (0.3 + 0.45 * front + 0.25 * backn), sL = smoothstep(0.09, -0.09, x - cx);
    W[i * NB + BI.hips] = 1 - wl; W[i * NB + BI.legL] = wl * sL; W[i * NB + BI.legR] = wl * (1 - sL);
  }
  return { P: Float64Array.from(OUT), N: Float64Array.from(NOR), slot: Uint8Array.from(SLOT), idx: Uint32Array.from(idx), W, flags, TF: Float64Array.from(TF) };
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

// v7: vinco atrás do joelho (legging): a oclusão escurece até 30 % numa mancha de ~6 cm atrás da articulação, só nas
// faces viradas para trás — com o joelho dobrado o brilho aveludado do tecido técnico acendia ali uma mancha clara
export function kneeCrease(G0, Lm) {
  for (let i = 0; i < G0.nv; i++) {
    const x = G0.P[i * 3], y = G0.P[i * 3 + 1], z = G0.P[i * 3 + 2], nz = G0.N[i * 3 + 2], Kn = Lm.Kn[x < 0 ? 'L' : 'R'];
    if (z <= Kn[2]) continue;
    const dy = (y - Kn[1] - 0.005) / 0.03, dx = (x - Kn[0]) / 0.05, w = Math.exp(-dy * dy - dx * dx) * smoothstep(0.15, 0.7, nz);
    G0.ao[i] *= 1 - 0.3 * w;
  }
}

// v8: axila dos tops de manga — a membrana entre a manga e o lado do tronco fica escondida na dobra do braço em
// repouso (oclusão baixa) e aparece quando o braço balança ou sobe: lia como um calombo escuro. Piso de oclusão
// 0,72 a até 5 cm do ápice da axila, indo a zero em 8 cm (forro e barra seguem a regra deles por cima)
export function pitAOLift(G0, C) {
  const ap = armpitApex(C, C.Aw);
  for (let i = 0; i < G0.nv; i++) {
    const p = [G0.P[i * 3], G0.P[i * 3 + 1], G0.P[i * 3 + 2]], d = Math.min(G.dist(p, ap.L), G.dist(p, ap.R));
    const f = smoothstep(0.08, 0.05, d); if (f <= 0) continue;
    const floor = (G0.FLAGS[i] & 2) ? 0.5 : (G0.FLAGS[i] & 1) ? 0.62 : 0.72;
    G0.ao[i] = Math.max(G0.ao[i], G0.ao[i] + (floor - G0.ao[i]) * f);
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
  // v6: oclusão perto (raios curtos, 4 cm): escurece debaixo da barra, debaixo da manga, no vale das dobras e onde o
  // tecido encosta no corpo; mais o fundo das dobras pela curvatura (vale côncavo = mais escuro). Assim as dobras e
  // as barras aparecem com luz chapada.
  const near = rayAO([bodyBVH, own], G0.P, G0.N, G0.nv, { rays, maxD: 0.04, k: 0.55, offset: 0.0015, only: used, seed: 11 });
  const wd = weld(G0.P, G0.nv, 1e-6), nw = wd.nw, L0 = [];
  for (let t = 0; t < G0.lods[0].length; t += 3) { const a = G0.lods[0][t], b = G0.lods[0][t + 1], c = G0.lods[0][t + 2]; if ((G0.FLAGS[a] | G0.FLAGS[b] | G0.FLAGS[c]) & 3) continue; L0.push(wd.wid[a], wd.wid[b], wd.wid[c]); }
  const adj = neighbors(Uint32Array.from(L0), nw), PW = new Float64Array(nw * 3), NWv = new Float64Array(nw * 3), cav = new Float64Array(nw);
  for (let i = 0; i < G0.nv; i++) { const w = wd.wid[i]; for (let k = 0; k < 3; k++) { PW[w * 3 + k] = G0.P[i * 3 + k]; NWv[w * 3 + k] += G0.N[i * 3 + k]; } }
  for (let w = 0; w < nw; w++) {
    const o = adj.off[w], e = adj.off[w + 1]; if (e - o < 3) continue;
    let mx = 0, my = 0, mz = 0, el = 0;
    for (let q = o; q < e; q++) { const u = adj.nb[q]; mx += PW[u * 3]; my += PW[u * 3 + 1]; mz += PW[u * 3 + 2]; el += Math.hypot(PW[u * 3] - PW[w * 3], PW[u * 3 + 1] - PW[w * 3 + 1], PW[u * 3 + 2] - PW[w * 3 + 2]); }
    const m = e - o, nl = Math.hypot(NWv[w * 3], NWv[w * 3 + 1], NWv[w * 3 + 2]) || 1;
    const d = ((mx / m - PW[w * 3]) * NWv[w * 3] + (my / m - PW[w * 3 + 1]) * NWv[w * 3 + 1] + (mz / m - PW[w * 3 + 2]) * NWv[w * 3 + 2]) / nl, h = el / m;
    cav[w] = d / (h * h + 1e-9);   // ≈ curvatura média × 2 (m⁻¹), + = côncavo
  }
  smoothField(cav, 1, adj, 3, 0.5);
  for (let i = 0; i < G0.nv; i++) {
    if (!used[i]) continue;
    const c = (G0.FLAGS[i] & 3) ? 0 : cav[wd.wid[i]];
    ao[i] *= (0.35 + 0.65 * near[i]) * (1 - 0.32 * smoothstep(4, 40, c)) * (1 + 0.06 * smoothstep(4, 30, -c));
    if (G0.FLAGS[i] & 1) ao[i] *= 0.82; if (G0.FLAGS[i] & 2) ao[i] *= 0.55;
    ao[i] = Math.min(1, ao[i]);
  }
  // v6: forro da axila (bit 8) com a oclusão da casca de fora mais perto (ele só aparece onde a casca afundou)
  if (G0.FLAGS.some(f => f & 8)) {
    const sh = []; for (let t = 0; t < G0.lods[0].length; t += 3) { const a = G0.lods[0][t], b = G0.lods[0][t + 1], c = G0.lods[0][t + 2]; if (G0.FLAGS[a] | G0.FLAGS[b] | G0.FLAGS[c] || (G0.Wx && (G0.Wx.has(a) || G0.Wx.has(b) || G0.Wx.has(c)))) continue; sh.push(a, b, c); }
    const sb = new BVH(G0.P, Uint32Array.from(sh));
    for (let i = 0; i < G0.nv; i++) {
      if (!(G0.FLAGS[i] & 8)) continue;
      const h = sb.closest(G0.P[i * 3], G0.P[i * 3 + 1], G0.P[i * 3 + 2], 0.1); if (h.tri < 0) continue;
      ao[i] = h.u * ao[sh[h.tri * 3]] + h.v * ao[sh[h.tri * 3 + 1]] + h.w * ao[sh[h.tri * 3 + 2]];
    }
  }
  return ao;
}

// pesos densos (17) de cada vértice da roupa (v6, ESPEC §15.2). O tecido se move como a pele que está EMBAIXO dele:
// cada vértice da casca LOD0 lança um raio para dentro (contra a normal) e pega os pesos baricêntricos da face do corpo
// atingida (ponto mais próximo como reserva). Onde a casca se afasta da pele (pontes da axila e da virilha, folgas) o
// campo é alisado pela malha da peça (soldada por posição: costuras e faixas de cor têm o mesmo peso), tanto mais quanto
// mais longe da pele; na cava (junção tronco ↔ manga) há uma faixa larga de mistura (±6 cm). Peças justas (meia, top,
// legging) quase não são alisadas: a pele não fura porque o tecido repete a deformação dela. Shorts e bermuda soltos:
// a perna da peça segue a coxa aos poucos (≥ 0,35 na virilha → 1 na barra). Os LOD1/2, a barra e o forro copiam o
// campo da casca LOD0 pelo ponto mais próximo. Só os ossos da região da peça contam (top sem cabeça/pernas etc.).
const ALLOW = { 3: ['hips', 'torso', 'armL', 'elbowL', 'armR', 'elbowR'], 2: ['hips', 'torso', 'legL', 'kneeL', 'footL', 'legR', 'kneeR', 'footR'],
  1: ['legL', 'kneeL', 'footL', 'legR', 'kneeR', 'footR'] };
function beneathBVH(C, layer, trunk = false) {
  const key = '_bnBVH' + layer + (trunk ? 't' : '');
  if (C[key]) return C[key];
  const Aw = C.Aw, WI = C.body.widx, avg = (t, k) => (Aw[WI[t * 3] * KN + k] + Aw[WI[t * 3 + 1] * KN + k] + Aw[WI[t * 3 + 2] * KN + k]) / 3;
  // v6: o lado do tronco de um top só olha a pele do tronco (o antebraço pendurado ao lado da barra dava peso de
  // cotovelo à barra: com os braços erguidos a barra subia 8 cm nos lados)
  const f = layer === 3 ? (trunk ? t => avg(t, K.wArm) < 0.5 && avg(t, K.hand) < 0.3 && avg(t, K.head) < 0.6 : t => avg(t, K.hand) < 0.3 && avg(t, K.head) < 0.6)
    : layer === 2 ? t => avg(t, K.wArm) < 0.3 && avg(t, K.hand) < 0.3 : t => avg(t, K.wLeg) > 0.5;
  return (C[key] = new BVH(C.body.PW, WI, f));
}
export function garmentWeights(G0, C, kind) {
  const nv = G0.nv, layer = G0.layer, W = new Float32Array(nv * NB), Lm = C.Lm, Aw = C.Aw, WI = C.body.widx, PW = C.body.PW;
  const allow = new Uint8Array(NB); for (const b of ALLOW[layer]) allow[BI[b]] = 1;
  const bvhAll = beneathBVH(C, layer), bvhTrunk = layer === 3 ? beneathBVH(C, 3, true) : bvhAll, loose = isLoose(kind);
  const isX = i => G0.Wx && G0.Wx.has(i);
  // lado do tronco de um top (v6): campo de junção jn ≤ 0 (ou peça sem manga)
  const sleeved = kind === 'camiseta' || kind === 'manga-longa' || kind === 'corta-vento';
  const trunkSide = i => layer === 3 && (!sleeved || !(G0.REC && G0.V) || G0.V[G0.REC[i] * KN + K.jn] <= 0);
  // casca LOD0 (sem barra/forro/peças extras): os vértices que recebem o raio
  const L0 = G0.lods[0], shellT = [];
  for (let t = 0; t < L0.length; t += 3) { const a = L0[t], b = L0[t + 1], c = L0[t + 2]; if (isX(a) || isX(b) || isX(c) || ((G0.FLAGS[a] | G0.FLAGS[b] | G0.FLAGS[c]) & 3)) continue; shellT.push(a, b, c); }
  const wd = weld(G0.P, nv, 1e-6), nw = wd.nw, inShell = new Uint8Array(nw), rep = new Int32Array(nw).fill(-1);
  for (const i of shellT) { inShell[wd.wid[i]] = 1; if (rep[wd.wid[i]] < 0) rep[wd.wid[i]] = i; }
  const Ws = new Float64Array(nw * NB), dist = new Float64Array(nw), rec = new Float64Array(NB);
  const dmax = layer === 1 ? 0.025 : 0.08;
  for (let w = 0; w < nw; w++) {
    if (!inShell[w]) continue;
    const i = rep[w], p = [G0.P[i * 3], G0.P[i * 3 + 1], G0.P[i * 3 + 2]], n = [G0.N[i * 3], G0.N[i * 3 + 1], G0.N[i * 3 + 2]];
    let tri = -1, bw = null, d = 0;
    const bvh = trunkSide(i) ? bvhTrunk : bvhAll;
    const h = bvh.ray(p[0] + n[0] * 0.002, p[1] + n[1] * 0.002, p[2] + n[2] * 0.002, -n[0], -n[1], -n[2], dmax);
    if (h) {
      const a = WI[h.tri * 3] * 3, b = WI[h.tri * 3 + 1] * 3, c = WI[h.tri * 3 + 2] * 3;
      const fn = G.cross([PW[b] - PW[a], PW[b + 1] - PW[a + 1], PW[b + 2] - PW[a + 2]], [PW[c] - PW[a], PW[c + 1] - PW[a + 1], PW[c + 2] - PW[a + 2]]);
      if (G.dot(fn, n) > 0.2 * G.len(fn)) { tri = h.tri; bw = [1 - h.u - h.v, h.u, h.v]; d = Math.max(0, h.t - 0.002); }
    }
    if (tri < 0) { const c = bvh.closest(p[0], p[1], p[2], 0.3); if (c.tri >= 0) { tri = c.tri; bw = [c.u, c.v, c.w]; d = c.d; } }
    dist[w] = d;
    if (tri < 0) { Ws[w * NB + (layer === 3 ? BI.torso : layer === 2 ? BI.hips : BI[p[0] < 0 ? 'kneeL' : 'kneeR'])] = 1; continue; }
    rec.fill(0);
    for (let e = 0; e < 3; e++) { const o = WI[tri * 3 + e] * KN; for (let b = 0; b < NB; b++) rec[b] += bw[e] * Math.max(0, Aw[o + K.w0 + b]); }
    let s = 0; for (let b = 0; b < NB; b++) { if (!allow[b]) rec[b] = 0; s += rec[b]; }
    if (s < 1e-6) { rec[layer === 3 ? BI.torso : layer === 2 ? BI.hips : BI[p[0] < 0 ? 'kneeL' : 'kneeR']] = 1; s = 1; }
    for (let b = 0; b < NB; b++) Ws[w * NB + b] = rec[b] / s;
  }
  const Sraw = Float64Array.from(Ws);   // v7: pesos da pele embaixo (âncora do ajuste por poses)
  // grafo soldado da casca
  const wsh = Uint32Array.from(shellT, i => wd.wid[i]), adj = neighbors(wsh, nw);
  // alisamento adaptativo: λ cresce com a distância até a pele (justa ≈ fixa, solta ≈ difusão larga)
  const lam = new Float64Array(nw);
  for (let w = 0; w < nw; w++) lam[w] = inShell[w] ? 0.04 + 0.5 * smoothstep(0.008, 0.03, dist[w]) : 0;
  const smoothAdaptive = (iters, lamOf) => {
    const T = new Float64Array(nw * NB);
    for (let it = 0; it < iters; it++) {
      T.set(Ws);
      for (let w = 0; w < nw; w++) {
        const l = lamOf(w); if (!(l > 0)) continue;
        const o = adj.off[w], e = adj.off[w + 1]; if (e === o) continue;
        for (let b = 0; b < NB; b++) { let m = 0; for (let q = o; q < e; q++) m += Ws[adj.nb[q] * NB + b]; T[w * NB + b] = Ws[w * NB + b] + l * (m / (e - o) - Ws[w * NB + b]); }
      }
      Ws.set(T);
    }
  };
  smoothAdaptive(loose ? 30 : 6, w => lam[w]);
  if (layer === 3) {
    // v6: lado do tronco sem cotovelo e com o braço sumindo abaixo da axila (de 6 a 20 cm abaixo do ápice): com os
    // braços erguidos (2,2 rad) até 2 % de braço levantava a barra 2 cm e abria a fresta da cintura
    const apY = armpitApex(C, Aw).y;
    for (let w = 0; w < nw; w++) {
      if (!inShell[w] || !trunkSide(rep[w])) continue;
      const o = w * NB, y = G0.P[rep[w] * 3 + 1], f = smoothstep(apY - 0.2, apY - 0.06, y);
      let lost = Ws[o + BI.elbowL] + Ws[o + BI.elbowR]; Ws[o + BI.elbowL] = Ws[o + BI.elbowR] = 0;
      for (const b of [BI.armL, BI.armR]) { lost += Ws[o + b] * (1 - f); Ws[o + b] *= f; }
      Ws[o + BI.torso] += lost;
    }
    // v6: axila — a pele embaixo muda de braço para tronco em ~2 cm e o raio de cada vértice cai ora no braço, ora no
    // flanco (pesos vizinhos a 2 mm diferiam 0,3: aresta esticada 9× no balanço do braço). Difusão forte até 10 cm do
    // ápice, dos dois lados da junção, antes da interpolação harmônica da manga.
    const ap = armpitApex(C, Aw), lamPit = new Float64Array(nw);
    for (let w = 0; w < nw; w++) {
      if (!inShell[w]) continue;
      const i = rep[w], p = [G0.P[i * 3], G0.P[i * 3 + 1], G0.P[i * 3 + 2]];
      lamPit[w] = 0.5 * smoothstep(0.10, 0.05, Math.min(G.dist(p, ap.L), G.dist(p, ap.R)));
    }
    smoothAdaptive(60, w => lamPit[w]);
  }
  const sleeve = kind === 'camiseta' || kind === 'manga-longa' || kind === 'corta-vento', V6W = !!process.env.EP_V6W;
  if (V6W && layer === 3 && sleeve) {
    // cava (junção tronco ↔ manga): interpolação harmônica dos pesos pela malha da peça entre o tronco a ≥ 7 cm da
    // linha de junção (zero do campo jn) e a parte de baixo da manga (os 4 cm da barra da manga curta; na longa, do
    // cotovelo para baixo). A passagem tronco → braço fica larga como na pele (axila, ombro, escápula): com o braço
    // balançando ou erguido o tecido estica por igual, sem dobrar nem abrir fenda debaixo do braço.
    const jn = new Float64Array(nw), sx = new Float64Array(nw), tb = new Float64Array(nw);
    for (let w = 0; w < nw; w++) if (inShell[w]) { const o = G0.REC[rep[w]] * KN; jn[w] = G0.V[o + K.jn]; sx[w] = G0.V[o + K.sx]; tb[w] = G0.V[o + K.tb]; }
    const gd = new Float64Array(nw).fill(1e9), q = [];
    for (let w = 0; w < nw; w++) { if (!inShell[w]) continue; for (let k = adj.off[w]; k < adj.off[w + 1]; k++) if ((jn[adj.nb[k]] > 0) !== (jn[w] > 0)) { gd[w] = 0; q.push(w); break; } }
    for (let it = 0; it < q.length; it++) {   // distância geodésica (Bellman-Ford em fila; malha pequena)
      const v = q[it];
      for (let k = adj.off[v]; k < adj.off[v + 1]; k++) {
        const u = adj.nb[k], i0 = rep[v], i1 = rep[u], d = gd[v] + Math.hypot(G0.P[i0 * 3] - G0.P[i1 * 3], G0.P[i0 * 3 + 1] - G0.P[i1 * 3 + 1], G0.P[i0 * 3 + 2] - G0.P[i1 * 3 + 2]);
        if (d < gd[u] - 1e-9 && d < 0.2) { gd[u] = d; q.push(u); }
      }
    }
    // faixa livre: até 6 cm (pela malha) de cada lado da linha de junção; a barra da manga curta (1,4 cm) fica presa
    const Ls = kind === 'camiseta' ? sleeveLen(C.g) - 0.014 : Lm.upperLen - 0.035;
    const free = new Uint8Array(nw);
    // só do lado da manga: o tronco fica com os pesos da pele (com o braço erguido o lado do tronco não sai de cima da
    // axila); a manga vai do peso do tronco na junção ao do braço na barra
    for (let w = 0; w < nw; w++) if (inShell[w]) free[w] = jn[w] > 0 && gd[w] < 0.07 && !(tb[w] > 0.5 && sx[w] >= Ls) ? 1 : 0;
    if (process.env.DBG_W && process.env.DBG_W.split(':')[0] === kind) {   // depuração: DBG_W=tipo:x,y,z
      const q = process.env.DBG_W.split(':')[1].split(',').map(Number);
      for (let w = 0; w < nw; w++) { if (!inShell[w]) continue; const i = rep[w], d = Math.hypot(G0.P[i * 3] - q[0], G0.P[i * 3 + 1] - q[1], G0.P[i * 3 + 2] - q[2]); if (d > 0.012) continue;
        console.log('DBG_W', [0, 1, 2].map(k => G0.P[i * 3 + k].toFixed(3)).join(','), 'jn', jn[w].toFixed(4), 'gd', gd[w] > 1 ? 'inf' : gd[w].toFixed(3), 'tb', tb[w].toFixed(2), 'sx', sx[w].toFixed(3), 'Ls', Ls.toFixed(3), 'free', free[w], 'arm', (Ws[w * NB + BI.armL] + Ws[w * NB + BI.armR]).toFixed(2), 'fl', G0.FLAGS[i]); }
    }
    const T = new Float64Array(nw * NB);
    for (let it = 0; it < 700; it++) {
      T.set(Ws);
      for (let w = 0; w < nw; w++) {
        if (!free[w]) continue;
        const o = adj.off[w], e = adj.off[w + 1]; if (e === o) continue;
        for (let b = 0; b < NB; b++) { let m = 0; for (let k = o; k < e; k++) m += Ws[adj.nb[k] * NB + b]; T[w * NB + b] = m / (e - o); }
      }
      Ws.set(T);
    }
  }
  if (V6W && (kind === 'short' || kind === 'bermuda')) {
    // perna solta: modelo liso em vez da pele de baixo (a virilha da pele vira degrau no joelho alto). Cós = quadril/
    // tronco da pele; dali para baixo a coxa entra por uma rampa lisa ao longo do eixo da coxa até 1 logo abaixo da
    // virilha (a perna da peça é um tubo rígido com a coxa). L/R por uma rampa de ±2,5 cm no meio.
    for (let w = 0; w < nw; w++) {
      if (!inShell[w]) continue;
      const i = rep[w], p = [G0.P[i * 3], G0.P[i * 3 + 1], G0.P[i * 3 + 2]];
      const sd = p[0] < 0 ? 'L' : 'R', A = Lm.Lg[sd], ax = G.norm(G.sub(Lm.Kn[sd], A)), s = G.dot(G.sub(p, A), ax);
      const sC = A[1] - Lm.crotchY, sW = A[1] - (Lm.T[1] - 0.012);
      // v6: acima da virilha, perto do meio (braguilha, costura de trás), a troca L/R fica larga (±5,5 cm) e a perna
      // pesa menos: no sprint (coxas a +1,0 e −0,5 rad) a costura do meio esticava 5 cm em 2 cm
      const up = smoothstep(sC + 0.02, sC - 0.03, s), mid = smoothstep(0.06, 0, Math.abs(p[0])) * up;
      // gancho (sela entre as coxas, |x| < 4,5 cm, de 3 cm abaixo a 4 cm acima da virilha): segue o quadril; a coxa entra pela parte
      // de dentro da perna — a troca L/R em 3 cm de sela esticava 5 cm no sprint
      const sad = smoothstep(0.05, 0.012, Math.abs(p[0])) * smoothstep(Lm.crotchY + 0.05, Lm.crotchY + 0.01, p[1]) * smoothstep(Lm.crotchY - 0.045, Lm.crotchY - 0.015, p[1]);
      const wx = 0.025 + 0.03 * Math.max(up, sad);
      const r = smoothstep(sW + 0.035, sC + 0.03, s) * (1 - 0.45 * mid) * (1 - 0.6 * sad), fL = smoothstep(wx, -wx, p[0]);
      let ht = Ws[w * NB + BI.hips] + Ws[w * NB + BI.torso]; if (ht < 1e-6) { Ws[w * NB + BI.hips] = 1; ht = 1; }
      const kh = (1 - r) / ht;
      for (let b = 0; b < NB; b++) Ws[w * NB + b] = (b === BI.hips || b === BI.torso) ? Ws[w * NB + b] * kh : 0;
      Ws[w * NB + BI.legL] = r * fL; Ws[w * NB + BI.legR] = r * (1 - fL);
    }
    smoothAdaptive(6, () => 0.4);
  }
  // v7: ajuste por poses (fit.mjs) — a pele que entra no tecido em alguma pose do jogo puxa os pesos dele
  if (!process.env.EP_NOFIT && !V6W) fitShell(G0, C, kind, { nw, inShell, rep, shellT, wd, Ws, Sraw, dist, trunkSide });
  // v8: faixa das barras (até 2,5 cm da borda, pela malha soldada) com os pesos alisados ao longo da borda. A meia-cana
  // e o forro copiam o vértice de origem; com pesos que mudavam muito de um vértice da borda para o vizinho (axila,
  // fim da manga rígida) a barra virava abas e lascas com o braço erguido. Fora da faixa nada muda.
  if (layer !== 1 && !process.env.EP_NOHEMW) {
    const dB = new Float64Array(nw).fill(1e9), q = [];
    for (const l of boundaryLoops(wsh)) for (const v of l) if (dB[v] > 0) { dB[v] = 0; q.push(v); }
    for (let it = 0; it < q.length; it++) {
      const v = q[it], pv = rep[v];
      for (let k = adj.off[v]; k < adj.off[v + 1]; k++) {
        const u = adj.nb[k], pu = rep[u], d = dB[v] + Math.hypot(G0.P[pu * 3] - G0.P[pv * 3], G0.P[pu * 3 + 1] - G0.P[pv * 3 + 1], G0.P[pu * 3 + 2] - G0.P[pv * 3 + 2]);
        if (d < dB[u] && d < 0.025) { dB[u] = d; q.push(u); }
      }
    }
    const lamB = w => inShell[w] && dB[w] < 0.025 ? 0.5 * smoothstep(0.025, 0.012, dB[w]) : 0;
    smoothAdaptive(12, lamB);
  }
  // casca: pesos finais; o resto (LOD1/2, barra, forro) pelo ponto mais próximo da casca LOD0
  const out = new Float64Array(NB);
  const norm = (src, o) => { let s = 0; for (let b = 0; b < NB; b++) { out[b] = Math.max(0, src[o + b]); s += out[b]; } for (let b = 0; b < NB; b++) out[b] /= s || 1; return out; };
  const sb = new BVH(G0.P, Uint32Array.from(shellT));
  for (let i = 0; i < nv; i++) {
    if (isX(i)) {
      W.set(G0.Wx.get(i), i * NB);
      // v7: gola do corta-vento — a base da gola leva os pesos EXATOS da casca no decote (onde ela nasce) e só vai
      // para os pesos próprios (tronco + 40 % de cabeça) subindo; antes a base já tinha 5 % de cabeça e, com a cabeça
      // virada na corrida, abria uma fresta entre a gola e o decote que mostrava a pele do pescoço
      if (kind === 'corta-vento' && !(G0.FLAGS[i] & 4)) {
        const c = sb.closest(G0.P[i * 3], G0.P[i * 3 + 1], G0.P[i * 3 + 2], 0.1);
        if (c.tri >= 0) {
          const tri = [wd.wid[shellT[c.tri * 3]], wd.wid[shellT[c.tri * 3 + 1]], wd.wid[shellT[c.tri * 3 + 2]]], bw = [c.u, c.v, c.w];
          const acc = new Float64Array(NB); for (let e = 0; e < 3; e++) for (let b = 0; b < NB; b++) acc[b] += bw[e] * Ws[tri[e] * NB + b];
          const sh = norm(acc, 0), t = smoothstep(0.003, 0.03, G0.P[i * 3 + 1] - c.y);
          for (let b = 0; b < NB; b++) W[i * NB + b] = (1 - t) * sh[b] + t * W[i * NB + b];
        }
      }
      // saia: a parte do quadril vira a mistura quadril/tronco da pele mais perto (igual à barra do top por cima: os dois
      // se movem juntos no giro do tronco e o cós da saia não atravessa a barra)
      if ((G0.FLAGS[i] & 4) && C.noArmBVH) {
        const c = C.noArmBVH.closest(G0.P[i * 3], G0.P[i * 3 + 1], G0.P[i * 3 + 2], 0.3);
        if (c.tri >= 0) {
          let h = 0, t = 0; const bw = [c.u, c.v, c.w];
          for (let e = 0; e < 3; e++) { const o = WI[c.tri * 3 + e] * KN; h += bw[e] * Aw[o + K.w0 + BI.hips]; t += bw[e] * Aw[o + K.w0 + BI.torso]; }
          const hp = W[i * NB + BI.hips], st = h + t;
          if (st > 1e-6) { W[i * NB + BI.hips] = hp * h / st; W[i * NB + BI.torso] = hp * t / st; }
        }
      }
      continue;
    }
    const w = wd.wid[i];
    if (inShell[w]) { W.set(norm(Ws, w * NB), i * NB); continue; }
    if (G0.SRC && G0.SRC[i] >= 0 && inShell[wd.wid[G0.SRC[i]]]) { W.set(norm(Ws, wd.wid[G0.SRC[i]] * NB), i * NB); continue; }
    const c = sb.closest(G0.P[i * 3], G0.P[i * 3 + 1], G0.P[i * 3 + 2], 0.2);
    if (c.tri < 0) { W[i * NB + (layer === 3 ? BI.torso : BI.hips)] = 1; continue; }
    const tri = [wd.wid[shellT[c.tri * 3]], wd.wid[shellT[c.tri * 3 + 1]], wd.wid[shellT[c.tri * 3 + 2]]], bw = [c.u, c.v, c.w];
    const acc = new Float64Array(NB); for (let e = 0; e < 3; e++) for (let b = 0; b < NB; b++) acc[b] += bw[e] * Ws[tri[e] * NB + b];
    W.set(norm(acc, 0), i * NB);
  }
  if (kind === 'saia-short' && !process.env.EP_NOFIT) fitSkirt(G0, C, W);
  return W;
}

// v7 (ESPEC §16): ajuste dos pesos da casca soldada pelas poses do jogo (fit.mjs). Grupos de pele que podem empurrar
// cada vértice: tops — lado do tronco (jn ≤ 0) só a pele do tronco, manga só a do braço (manga curta: sem antebraço);
// roupas de baixo — quadril e as duas pernas, mas a perna da peça de cada lado só com a perna do mesmo lado; meia — pernas.
function fitShell(G0, C, kind, { nw, inShell, rep, shellT, wd, Ws, Sraw, dist, trunkSide }) {
  const layer = G0.layer, FP = FIT.prepare(C, { PS, BI, NB, quantWeights, K, KN });
  const ids = [], map = new Int32Array(nw).fill(-1);
  for (let w = 0; w < nw; w++) if (inShell[w]) { map[w] = ids.length; ids.push(w); }
  const n = ids.length, P0 = new Float64Array(n * 3), N0 = new Float64Array(n * 3), W = new Float64Array(n * NB), S0 = new Float64Array(n * NB), d0 = new Float64Array(n), grp = new Array(n);
  const long = kind === 'manga-longa' || kind === 'corta-vento', sleeved = long || kind === 'camiseta';
  const apY = layer === 3 ? armpitApex(C, C.Aw).y : 0;
  for (let j = 0; j < n; j++) {
    const w = ids[j], i = rep[w], o = G0.REC[i] * KN;
    for (let k = 0; k < 3; k++) { P0[j * 3 + k] = G0.P[i * 3 + k]; N0[j * 3 + k] = G0.N[i * 3 + k]; }
    for (let b = 0; b < NB; b++) { W[j * NB + b] = Ws[w * NB + b]; S0[j * NB + b] = Sraw[w * NB + b]; }
    d0[j] = dist[w];
    if (layer === 3) grp[j] = sleeved && G0.V[o + K.jn] > 0 ? (long ? 'armLong' : 'arm') : 'trunk';
    else if (layer === 2) grp[j] = G0.V[o + K.tb] > 1.5 ? (G0.P[i * 3] < 0 ? 'lowerL' : 'lowerR') : 'lower';
    else grp[j] = 'legs';
  }
  const tris = Uint32Array.from(shellT, i => map[wd.wid[i]]), adj = neighbors(tris, n);
  const allow = new Uint8Array(NB); for (const b of ALLOW[layer]) allow[BI[b]] = 1;
  // lado de cada vértice pela perna (componente conexa do tubo da perna), não pelo sinal de x: a parede de dentro da
    // perna esquerda passa um pouco de x = 0 (coxas que se tocam) e virava "direita" (aresta de 20 cm na passada)
  const side = new Int8Array(n);
    { const tubeV = new Uint8Array(n); for (let j = 0; j < n; j++) tubeV[j] = G0.V[G0.REC[rep[ids[j]]] * KN + K.tb] > 1.5 ? 1 : 0;
      const comp = new Int32Array(n).fill(-1), sx = [];
      for (let s0 = 0; s0 < n; s0++) { if (!tubeV[s0] || comp[s0] >= 0) continue; const q = [s0]; comp[s0] = sx.length; let acc = 0; for (let qi = 0; qi < q.length; qi++) { const v = q[qi]; acc += P0[v * 3]; for (let k = adj.off[v]; k < adj.off[v + 1]; k++) { const u = adj.nb[k]; if (tubeV[u] && comp[u] < 0) { comp[u] = sx.length; q.push(u); } } } sx.push(acc / q.length); }
      for (let j = 0; j < n; j++) side[j] = comp[j] >= 0 ? (sx[comp[j]] < 0 ? -1 : 1) : (P0[j * 3] < 0 ? -1 : 1);
      if (process.env.EP_SLVLOG) console.log('   perna', kind, 'componentes do tubo', sx.length, sx.map(x => x.toFixed(3)).join(' ')); }
  if (layer === 2) for (let j = 0; j < n; j++) if (G0.V[G0.REC[rep[ids[j]]] * KN + K.tb] > 1.5) grp[j] = side[j] < 0 ? 'lowerL' : 'lowerR';

  const fixFit = new Uint8Array(n);   // v7: membros rígidos (manga/perna) ficam fora do ajuste por poses
  if (sleeved && !process.env.EP_NOSLV) {
    // manga rígida com o braço (v7): a pele embaixo da cabeça da manga é quase toda da clavícula (= tronco no jogo) e a
    // manga que copiava isso ficava parada no ombro com o braço erguido (o braço saía dela). "Braço" de cada vértice
    // pela geometria: coordenada s ao longo do eixo ombro→cotovelo (0 = articulação) — de −2 cm (alto do ombro: ainda
    // tronco) a +5 cm a parte do tronco/quadril vai para o braço daquele lado (manga curta: o cotovelo também); só o
    // que está em volta do braço (raio ≤ braço + folga) e não é o painel do tronco (jn < −2 cm).
    // Axila: até RF do ápice (e na faixa de transição da manga) o campo é livre e sai harmônico (Jacobi) entre a manga
    // rígida e o tronco com os pesos da pele — a transição braço ↔ tronco fica larga e lisa como na pele (vértices
    // vizinhos com 0,3 de diferença rasgavam no balanço do braço)
    const SA = +(process.env.EP_SLV_SA || -0.02), SB = +(process.env.EP_SLV_SB || 0.05), RF = +(process.env.EP_SLV_RF || 0.08), Lm = C.Lm, apx = armpitApex(C, C.Aw);
    const fixedS = new Uint8Array(n), aArm = new Float64Array(n);
    // pertença à manga lisa: o sinal de jn (tubo da manga × tubo do tronco) tem uma linha de zero serrilhada; difundido
    // pela malha vira uma rampa de poucos vértices. Acima da canga (armY) o tubo do tronco cobre o deltoide: ali conta
    // como manga (cabeça da manga)
    const armY = Lm.Sy - 0.075, mem = new Float64Array(n), tmpM = new Float64Array(n);
    for (let j = 0; j < n; j++) mem[j] = G0.V[G0.REC[rep[ids[j]]] * KN + K.jn] > 0 ? 1 : 0;
    for (let it = 0; it < 6; it++) { tmpM.set(mem); for (let j = 0; j < n; j++) { const o0 = adj.off[j], o1 = adj.off[j + 1]; if (o1 === o0) continue; let m = 0; for (let k = o0; k < o1; k++) m += mem[adj.nb[k]]; tmpM[j] = 0.5 * mem[j] + 0.5 * m / (o1 - o0); } mem.set(tmpM); }
    let nA = 0, nFree = 0, nGus = 0;
    const GUS = process.env.EP_GUSSET !== '0', GR = +(process.env.EP_GUS_R || 0.065), GW0 = +(process.env.EP_GUS_W || 0.5);
    // v8: faixa da barra da manga curta (1,8 cm, pela malha) rígida com o braço — o canto de dentro da barra, encostado
    // no lado do tronco, ficava com peso misturado e virava um calombo/aba debaixo do braço no balanço da corrida
    const dHem = new Float64Array(n).fill(1e9);
    if (kind === 'camiseta' && !process.env.EP_NOHEMRIG) {
      const q0 = [];
      for (const l of boundaryLoops(tris)) { let mxA = 0; for (const v of l) mxA += Math.abs(P0[v * 3]) / l.length; if (mxA > 0.12) for (const v of l) { dHem[v] = 0; q0.push(v); } }
      for (let it = 0; it < q0.length; it++) { const v = q0[it]; for (let k = adj.off[v]; k < adj.off[v + 1]; k++) { const u = adj.nb[k], d = dHem[v] + Math.hypot(P0[u * 3] - P0[v * 3], P0[u * 3 + 1] - P0[v * 3 + 1], P0[u * 3 + 2] - P0[v * 3 + 2]); if (d < dHem[u] && d < 0.03) { dHem[u] = d; q0.push(u); } } }
    }
    for (let j = 0; j < n; j++) {
      const p = [P0[j * 3], P0[j * 3 + 1], P0[j * 3 + 2]];
      const dAp = Math.min(G.dist(p, apx.L), G.dist(p, apx.R));
      const sd = p[0] < 0 ? 'L' : 'R', S = Lm.S[sd], E = Lm.E[sd], ax = G.norm(G.sub(E, S)), q = G.sub(p, S);
      const sx = G.dot(q, ax), rr = G.len(G.sub(q, G.scl(ax, sx)));
      const gate = Math.max(smoothstep(0.2, 0.8, mem[j]), smoothstep(armY - 0.03, armY + 0.01, p[1]));
      let a = smoothstep(SA, SB, sx) * smoothstep(0.13, 0.095, rr) * gate;
      const hemRig = dHem[j] < 0.018 && mem[j] > 0.5;
      if (hemRig) a = 1;
      if (a < 0.01) a = 0;
      aArm[j] = a;
      if (a > 0) {
        const sd = p[0] < 0 ? 'L' : 'R', am = BI['arm' + sd], em = BI['elbow' + sd], oa = BI['arm' + (sd === 'L' ? 'R' : 'L')], oe = BI['elbow' + (sd === 'L' ? 'R' : 'L')], r = j * NB;
        for (const src of [W, S0]) {
          const mv = (src[r + BI.torso] + src[r + BI.hips] + src[r + oa] + src[r + oe] + (long ? 0 : src[r + em])) * a;
          for (const b of [BI.torso, BI.hips, oa, oe, ...(long ? [] : [em])]) src[r + b] *= 1 - a;
          src[r + am] += mv;
        }
        nA++;
        if (a >= 0.5) grp[j] = long ? 'armLong' : 'arm';
      }
      // livre: perto do ápice da axila ou na rampa da manga; o resto fica (manga rígida / tronco com a pele)
      fixedS[j] = hemRig ? 1 : dAp < RF || (a > 0.02 && a < 0.98) ? 0 : 1;
      if ((a >= 0.98 && dAp >= RF) || hemRig) fixFit[j] = 1;
      // v8 (reforço da axila): a parede de dentro da manga (virada para o tronco) perto do ápice não é rígida com o
      // braço — o peso do braço vai de GW0 no ápice a 1 a GR dele. Com o braço erguido ou balançando, a passagem
      // tronco → manga estica numa faixa larga (um reforço/gusset) em vez de uma tira fina entre a manga e o lado
      if (GUS && a > 0.5 && dAp < GR && !hemRig) {
        const rr2 = G.sub(q, G.scl(ax, sx)), lr = G.len(rr2) || 1, inner = Math.max(0, (sd === 'L' ? rr2[0] : -rr2[0]) / lr);
        if (inner > 0.3) {
          const t = GW0 + (1 - GW0) * smoothstep(0.02, GR, dAp), f = smoothstep(0.3, 0.7, inner), tt = 1 - f * (1 - t), r0 = j * NB, am = BI['arm' + sd];
          for (const src of [W, S0]) { let tot = 0; for (let b = 0; b < NB; b++) tot += src[r0 + b]; const armNow = src[r0 + am] / (tot || 1); if (armNow <= tt) continue; const mv = (armNow - tt) * (tot || 1); src[r0 + am] -= mv; src[r0 + BI.torso] += mv; }
          fixedS[j] = 1; fixFit[j] = 0; nGus++;
        }
      }
      if (!fixedS[j]) nFree++;
    }
    if (GUS) C.rep['reforcoAxila_' + kind] = nGus;
    if (process.env.EP_SLVLOG) {   // conectividade: componentes do grafo e arestas manga↔tronco perto da axila
      const comp = new Int32Array(n).fill(-1); let nc = 0;
      for (let s0 = 0; s0 < n; s0++) { if (comp[s0] >= 0) continue; const q = [s0]; comp[s0] = nc; for (let qi = 0; qi < q.length; qi++) { const v = q[qi]; for (let k = adj.off[v]; k < adj.off[v + 1]; k++) { const u = adj.nb[k]; if (comp[u] < 0) { comp[u] = nc; q.push(u); } } } nc++; }
      const sizes = new Array(nc).fill(0); for (let j = 0; j < n; j++) sizes[comp[j]]++;
      let cross = 0, crossPit = 0;
      for (let j = 0; j < n; j++) for (let k = adj.off[j]; k < adj.off[j + 1]; k++) { const u = adj.nb[k]; if (u < j) continue; if ((aArm[j] > 0.9) !== (aArm[u] > 0.9)) { cross++; const p = [P0[j * 3], P0[j * 3 + 1], P0[j * 3 + 2]]; if (Math.min(G.dist(p, apx.L), G.dist(p, apx.R)) < 0.05) crossPit++; } }
      console.log('   manga', kind, 'componentes', nc, JSON.stringify(sizes.sort((a, b) => b - a).slice(0, 6)), 'arestas braço↔resto', cross, 'perto da axila', crossPit);
    }
    const T = new Float64Array(n * NB);
    for (let it = 0; it < 600; it++) {
      T.set(W);
      for (let j = 0; j < n; j++) {
        if (fixedS[j]) continue;
        const o0 = adj.off[j], o1 = adj.off[j + 1]; if (o1 === o0) continue;
        for (let b = 0; b < NB; b++) { let m = 0; for (let k = o0; k < o1; k++) m += W[adj.nb[k] * NB + b]; T[j * NB + b] = m / (o1 - o0); }
      }
      W.set(T);
    }
    for (let j = 0; j < n; j++) if (!fixedS[j]) for (let b = 0; b < NB; b++) S0[j * NB + b] = W[j * NB + b];
    if (process.env.EP_SLVLOG) {
      let nPit = 0, nRamp = 0; const yr = [9, -9];
      for (let j = 0; j < n; j++) { if (fixedS[j]) continue; const p = [P0[j * 3], P0[j * 3 + 1], P0[j * 3 + 2]], dAp = Math.min(G.dist(p, apx.L), G.dist(p, apx.R)); if (dAp < RF) { nPit++; yr[0] = Math.min(yr[0], p[1]); yr[1] = Math.max(yr[1], p[1]); } else nRamp++; }
      console.log('   manga', kind, 'vértices do braço', nA, 'livres', nFree, '(axila', nPit, 'y', yr.map(x => x.toFixed(3)).join('..'), 'rampa', nRamp + ') de', n, 'ápices', JSON.stringify([apx.L, apx.R].map(q => q.map(x => +x.toFixed(3)))));
    }
    if (process.env.EP_DBGA) {   // depuração: só para ver em repouso — quadril = campo pedido, tronco = o resto
      for (let j = 0; j < n; j++) {
        const i = rep[ids[j]], o = G0.REC[i] * KN, jn = G0.V[o + K.jn];
        const f = process.env.EP_DBGA === 'a' ? aArm[j] : process.env.EP_DBGA === 'fix' ? fixedS[j] : process.env.EP_DBGA === 'jn' ? clamp(0.5 + jn / 0.06, 0, 1) : (W[j * NB + BI.armL] + W[j * NB + BI.armR]);
        for (let b = 0; b < NB; b++) W[j * NB + b] = 0; W[j * NB + BI.hips] = f; W[j * NB + BI.torso] = 1 - f;
      }
      for (let j = 0; j < n; j++) for (let b = 0; b < NB; b++) Ws[ids[j] * NB + b] = W[j * NB + b];
      return;
    }
  }
  // restrições: lado do tronco sem cotovelo e com o braço sumindo de 6 a 20 cm abaixo do ápice da axila (com os braços
  // erguidos até 2 % de braço levantava a barra); o resto só com os ossos da região
  const waistTop = layer === 2 && C.Lm.T ? C.Lm.T[1] - 0.012 + (kind === 'legging' ? 0.032 : 0) : null;
  const project = (j, Wm, o) => {
    if (layer === 2 && (kind === 'short' || kind === 'bermuda')) {
      // cós (v7): sem peso de perna nos 2–5 cm de cima — a coxa erguida puxava o cós para baixo e a pele de baixo dele
      // (mantida pela margem de 3,5 cm) furava a frente
      const f = smoothstep(0.02, 0.05, waistTop - P0[j * 3 + 1]);
      if (f < 1) { let lost = 0; for (const b of [BI.legL, BI.kneeL, BI.footL, BI.legR, BI.kneeR, BI.footR]) { lost += Wm[o + b] * (1 - f); Wm[o + b] *= f; } Wm[o + BI.hips] += lost; }
      return;
    }
    if (layer !== 3 || grp[j] !== 'trunk') return;
    const f = smoothstep(apY - 0.2, apY - 0.06, P0[j * 3 + 1]);
    let lost = Wm[o + BI.elbowL] + Wm[o + BI.elbowR]; Wm[o + BI.elbowL] = Wm[o + BI.elbowR] = 0;
    for (const b of [BI.armL, BI.armR]) { lost += Wm[o + b] * (1 - f); Wm[o + b] *= f; }
    Wm[o + BI.torso] += lost;
  };
  if ((kind === 'short' || kind === 'bermuda') && !process.env.EP_NOLEG) {
    // perna rígida com a coxa (v7): abaixo da virilha o tubo da perna gira com a coxa (sem "alça" na parede de dentro,
    // que pendia com 10–20 % de quadril e virava uma tira com a coxa erguida); uma faixa de ~6 cm na virilha e o gancho
    // ficam livres (harmônicos) entre o quadril (pele) e a perna rígida
    const Lm = C.Lm, mem = new Float64Array(n), tmpM = new Float64Array(n), fixedL = new Uint8Array(n);
    for (let j = 0; j < n; j++) mem[j] = G0.V[G0.REC[rep[ids[j]]] * KN + K.tb] > 1.5 ? 1 : 0;
    for (let it = 0; it < 6; it++) { tmpM.set(mem); for (let j = 0; j < n; j++) { const o0 = adj.off[j], o1 = adj.off[j + 1]; if (o1 === o0) continue; let m = 0; for (let k = o0; k < o1; k++) m += mem[adj.nb[k]]; tmpM[j] = 0.5 * mem[j] + 0.5 * m / (o1 - o0); } mem.set(tmpM); }
    const L0 = +(process.env.EP_LEG_S0 || 0.0), L1 = +(process.env.EP_LEG_S1 || 0.06), legLen = DR_legLen(kind, C.g, Lm), waistTopL = Lm.T[1] - 0.012;
    // v9: onde a perna fica rígida depende do lado em volta da coxa (φ: u = para fora, v = para a frente) — atrás logo
    // abaixo da dobra do glúteo (o pano que pendia ali com peso do quadril ficava parado com a coxa erguida: o "saco"
    // visto de trás), na frente e nos lados 6–7 cm abaixo da virilha (a dobra da virilha comprime numa faixa larga)
    const LB = +(process.env.EP_LEG_SB ?? 0.03), LF = +(process.env.EP_LEG_SF ?? 0.07), SEAT = +(process.env.EP_LEG_SEAT ?? 0.03);
    const seatFix = new Uint8Array(n);
    let nR = 0, nF = 0, nSeat = 0;
    for (let j = 0; j < n; j++) {
      const p = [P0[j * 3], P0[j * 3 + 1], P0[j * 3 + 2]], sd = side[j] < 0 ? 'L' : 'R', A = Lm.Lg[sd], ax = G.norm(G.sub(Lm.Kn[sd], A));
      // rampa da virilha até 6 cm abaixo dela, mas a barra (últimos 3 cm) sempre rígida: no short feminino (15,5 cm) a
      // parte de trás da boca da perna pendia como uma alça embaixo da coxa erguida
      const q = G.sub(p, A), sx = G.dot(q, ax), sC = A[1] - Lm.crotchY;
      const rr = G.sub(q, G.scl(ax, sx)), rl = G.len(rr) || 1, uo = G.norm(G.sub([sd === 'L' ? -1 : 1, 0, 0], G.scl(ax, ax[0] * (sd === 'L' ? -1 : 1)))), vf = G.norm(G.cross(ax, uo));
      const cph = G.dot(rr, uo) / rl, sph0 = G.dot(rr, vf) / rl, sph = vf[2] < 0 ? sph0 : -sph0;   // sph > 0: frente
      const dR = process.env.EP_LEG_OLD ? L1 : L1 * Math.max(0, cph) ** 2 + LF * Math.max(0, sph) ** 2 + LB * Math.max(0, -sph) ** 2 + L1 * Math.max(0, -cph) ** 2;
      const s1 = Math.min(sC + dR, legLen - 0.03);
      const a = smoothstep(sC + L0 - (process.env.EP_LEG_OLD ? 0 : 0.02 * Math.max(0, -sph)), Math.max(s1, sC + L0 + 0.02), sx) * smoothstep(0.2, 0.8, mem[j]);
      // v9: assento — o pano em cima do glúteo (atrás, acima da dobra, perto da pele) fica com os pesos da pele dele
      if (!process.env.EP_LEG_OLD && SEAT > 0 && -sph > 0.45 && sx < sC - SEAT && waistTopL - p[1] > 0.03 && d0[j] < 0.03) { seatFix[j] = 1; nSeat++; }
      const lg = BI['leg' + sd], og = [BI.hips, BI.torso, BI['leg' + (sd === 'L' ? 'R' : 'L')], BI['knee' + (sd === 'L' ? 'R' : 'L')], BI['foot' + (sd === 'L' ? 'R' : 'L')]], r = j * NB;
      if (a > 0) for (const src of [W, S0]) { let mv = 0; for (const b of og) { mv += src[r + b] * a; src[r + b] *= 1 - a; } src[r + lg] += mv; }
      // fixos: o cós (3 cm de cima: quadril/tronco da pele, sem perna) e a perna rígida; todo o resto (glúteo, frente,
      // gancho) sai harmônico entre os dois — a passagem quadril → coxa se espalha pela altura toda do quadril (com a
      // pele copiada o glúteo esticava 2,7× numa faixa de 2 cm sob o cós)
      const wb = waistTopL - p[1] < 0.03;
      if (wb) { let lost = 0; for (const b of [BI.legL, BI.kneeL, BI.footL, BI.legR, BI.kneeR, BI.footR]) { lost += W[r + b]; W[r + b] = 0; } W[r + BI.hips] += lost; }
      fixedL[j] = wb || a >= 0.98 || seatFix[j] ? 1 : 0;
      if (a >= 0.98) fixFit[j] = 1;
      if (a >= 0.98) nR++; if (!fixedL[j]) nF++;
    }
    const T = new Float64Array(n * NB);
    for (let it = 0; it < 600; it++) {
      T.set(W);
      for (let j = 0; j < n; j++) {
        if (fixedL[j]) continue;
        const o0 = adj.off[j], o1 = adj.off[j + 1]; if (o1 === o0) continue;
        for (let b = 0; b < NB; b++) { let m = 0; for (let k = o0; k < o1; k++) m += W[adj.nb[k] * NB + b]; T[j * NB + b] = m / (o1 - o0); }
      }
      W.set(T);
    }
    for (let j = 0; j < n; j++) if (!fixedL[j]) for (let b = 0; b < NB; b++) S0[j * NB + b] = W[j * NB + b];
    // v7b: gancho (|x| < 4,5 cm, da virilha −3 cm a +5 cm): coxa esquerda e direita pesam igual na costura do meio
    // (rampa até 2 cm de cada lado) e o miolo fica fora do ajuste por poses — o ajuste puxava cada lado da costura para
    // a sua coxa e uma aresta de 3 mm esticava 18× na passada de 18 m/s (lasca vista de baixo)
    if (!process.env.EP_NOGANCHO) {
      let nG = 0;
      for (let j = 0; j < n; j++) {
        const x = P0[j * 3], y = P0[j * 3 + 1];
        const f = smoothstep(0.045, 0.02, Math.abs(x)) * smoothstep(Lm.crotchY - 0.03, Lm.crotchY - 0.01, y) * smoothstep(Lm.crotchY + 0.05, Lm.crotchY + 0.03, y);
        if (f <= 0) continue;
        const r = j * NB;
        for (const src of [W, S0]) for (const [bl, br] of [[BI.legL, BI.legR], [BI.kneeL, BI.kneeR], [BI.footL, BI.footR]]) { const mm = (src[r + bl] + src[r + br]) / 2; src[r + bl] += f * (mm - src[r + bl]); src[r + br] += f * (mm - src[r + br]); }
        if (f > 0.5) { fixFit[j] = 1; nG++; }
      }
      C.rep['gancho_' + kind] = nG;
    }
    if (process.env.EP_SLVLOG) console.log('   perna', kind, 'rígidos', nR, 'livres', nF, 'assento', nSeat, 'de', n);
    C.rep['assento_' + kind] = nSeat;
  }
  const tight = !isLoose(kind);
  const t0 = Date.now();
  // pele visível (que esta peça não esconde) não pode chegar perto do tecido; a escondida só conta se entrar fundo
  const bit = 1 << COVER_BITS[kind], under = new Int32Array(n);
  const mgV = layer === 1 ? (j => clamp(0.6 * d0[j], 0.001, 0.002)) : tight ? (j => clamp(0.6 * d0[j], 0.0012, 0.0025)) : (j => clamp(0.6 * d0[j], 0.0015, 0.004));
  const testCache = {};
  const tests = j => { const gname = grp[j]; return [[FP.visGroup(gname, bit), mgV(j), 1], [gname, -0.008, 0.5]]; };
  { const bv = new BVH(C.body.P, C.body.idx); for (let j = 0; j < n; j++) { const c = bv.closest(P0[j * 3], P0[j * 3 + 1], P0[j * 3 + 2], 0.3); let bi = 0; const bw = [c.u, c.v, c.w]; for (let e = 1; e < 3; e++) if (bw[e] > bw[bi]) bi = e; under[j] = c.tri >= 0 ? C.body.idx[c.tri * 3 + bi] : 0; } }
  const stats = FIT.fitWeights({ P0, N0, n, adj, tris, W, nb: NB, allow, S0, d0, body: { idx: FP.idx, Wd: FP.Wd }, posed: FP.byLayer[layer], tests, under,
    iters: +(process.env.EP_FITIT || 8), project, anchor: tight ? (() => 0.3) : null, fixed: fixFit,
    // v9: roupas de baixo soltas — a correção se espalha por 10 anéis (campo liso): com 2 anéis o ajuste fazia degraus
    // de peso na lateral do quadril e a costura lateral dobrava em "J" com a coxa erguida
    spread: (kind === 'short' || kind === 'bermuda') ? +(process.env.EP_FIT_SPREAD || 10) : 2, lam: (kind === 'short' || kind === 'bermuda') ? +(process.env.EP_FIT_LAM ?? 0.05) : 0,
    log: process.env.EP_FITLOG ? (st => console.log('   ajuste', kind, JSON.stringify(st))) : null });
  // v7b: costuras de pesos — o ajuste empurra vértices vizinhos para ossos opostos (virilha: coxa esquerda × direita;
  // lado do tronco: braço × tronco) e uma aresta de 3 mm esticava 15–19× na passada (uma lasca, visível de baixo).
  // Arestas curtas (< 15 mm) com |ΔW|₁ > 0,5: o campo é alisado em 2 anéis em volta delas (só vértices não fixos)
  if (!process.env.EP_NOSEAMFIX && layer === 3) {
    const mark = new Uint8Array(n);
    let nSeam = 0;
    for (let j = 0; j < n; j++) for (let k = adj.off[j]; k < adj.off[j + 1]; k++) {
      const i2 = adj.nb[k]; if (i2 < j) continue;
      if (Math.hypot(P0[j * 3] - P0[i2 * 3], P0[j * 3 + 1] - P0[i2 * 3 + 1], P0[j * 3 + 2] - P0[i2 * 3 + 2]) > 0.015) continue;
      let d = 0; for (let b = 0; b < NB; b++) d += Math.abs(W[j * NB + b] - W[i2 * NB + b]);
      if (d > 0.5) { mark[j] = mark[i2] = 1; nSeam++; }
    }
    for (let it = 0; it < 2; it++) { const m2 = mark.slice(); for (let j = 0; j < n; j++) if (mark[j]) for (let k = adj.off[j]; k < adj.off[j + 1]; k++) m2[adj.nb[k]] = 1; mark.set(m2); }
    const T = new Float64Array(n * NB);
    for (let it = 0; it < 20; it++) {
      T.set(W);
      for (let j = 0; j < n; j++) {
        if (!mark[j] || fixFit[j]) continue;
        const o0 = adj.off[j], o1 = adj.off[j + 1]; if (o1 === o0) continue;
        for (let b = 0; b < NB; b++) { let m = 0; for (let k = o0; k < o1; k++) m += W[adj.nb[k] * NB + b]; T[j * NB + b] = 0.5 * W[j * NB + b] + 0.5 * m / (o1 - o0); }
      }
      W.set(T);
    }
    C.rep['costuraPesos_' + kind] = nSeam;
  }
  for (let j = 0; j < n; j++) for (let b = 0; b < NB; b++) Ws[ids[j] * NB + b] = W[j * NB + b];
  const a = stats[0], z = stats[stats.length - 1];
  C.rep['ajuste_' + kind] = { ms: Date.now() - t0, antes: a, depois: z };
  console.log('  pesos', kind, 'entra', a.viol + '/' + a.vis, '→', z.viol + '/' + z.vis, 'estica', a.str, '→', z.str, 'dobra', a.fold, '→', z.fold, (Date.now() - t0) + 'ms');
}

// v7: saia ajustada pelas poses — a coxa (e o short de baixo, 2,6 mm sobre a pele) não pode chegar a menos de 8 mm do
// tecido (ou 70 % da folga de repouso, perto do cós). O cós fica preso no quadril/tronco; forro, borda e as saias do
// LOD1/LOD2 copiam o ponto mais perto da face de fora do LOD0.
function fitSkirt(G0, C, W) {
  const FP = FIT.prepare(C, { PS, BI, NB, quantWeights, K, KN }), F = G0.FLAGS, L0 = G0.lods[0], Lm = C.Lm, tri = [];
  for (let t = 0; t < L0.length; t += 3) { const a = L0[t], b = L0[t + 1], c = L0[t + 2]; if ((F[a] & F[b] & F[c] & 4) && !((F[a] | F[b] | F[c]) & 2)) tri.push(a, b, c); }
  if (!tri.length) return;
  const wd = weld(G0.P, G0.nv, 1e-7), map = new Map(), ids = [];
  for (const i of tri) { const w = wd.wid[i]; if (!map.has(w)) { map.set(w, ids.length); ids.push(i); } }
  const n = ids.length, P0 = new Float64Array(n * 3), N0 = new Float64Array(n * 3), Wf = new Float64Array(n * NB), S0 = new Float64Array(n * NB), d0 = new Float64Array(n), fixed = new Uint8Array(n);
  const bv = new BVH(C.body.P, C.body.idx), yBand = Lm.T[1] + 0.002 - 0.03 - 0.022;   // cós + 2 cm de cima do painel (preso no cós)
  ids.forEach((i, j) => {
    for (let k = 0; k < 3; k++) { P0[j * 3 + k] = G0.P[i * 3 + k]; N0[j * 3 + k] = G0.N[i * 3 + k]; }
    for (let b = 0; b < NB; b++) Wf[j * NB + b] = S0[j * NB + b] = W[i * NB + b];
    d0[j] = bv.closest(P0[j * 3], P0[j * 3 + 1], P0[j * 3 + 2], 0.3).d;
    fixed[j] = P0[j * 3 + 1] > yBand ? 1 : 0;
  });
  const T = Uint32Array.from(tri, i => map.get(wd.wid[i])), adj = neighbors(T, n);
  const allow = new Uint8Array(NB); for (const b of ['hips', 'torso', 'legL', 'legR']) allow[BI[b]] = 1;
  // a divisão quadril/tronco copiada da pele mais perto variava de um vértice para o outro (no giro do tronco o cós
  // esticava 5–7 cm): alisada pela saia antes do ajuste
  smoothField(Wf, NB, adj, 40, 0.5);
  for (let j = 0; j < n; j++) { let sm = 0; for (let b = 0; b < NB; b++) sm += Wf[j * NB + b]; for (let b = 0; b < NB; b++) S0[j * NB + b] = Wf[j * NB + b] /= sm || 1; }
  const t0 = Date.now();
  const stats = FIT.fitWeights({ P0, N0, n, adj, tris: T, W: Wf, nb: NB, allow, S0, d0, body: { idx: FP.idx, Wd: FP.Wd }, posed: FP.byLayer[2], fixed,
    tests: j => [['lower', Math.min(0.008, 0.7 * d0[j]), 1]], iters: +(process.env.EP_FITIT || 10), spread: 3, eta: 0.9, lam: 0.08,
    log: process.env.EP_FITLOG ? (st => console.log('   ajuste saia', JSON.stringify(st))) : null });
  const a = stats[0], z = stats[stats.length - 1];
  C.rep.ajuste_saia = { ms: Date.now() - t0, antes: a, depois: z };
  console.log('  pesos saia entra', a.viol, '→', z.viol, 'estica', a.str, '→', z.str, 'dobra', a.fold, '→', z.fold, (Date.now() - t0) + 'ms');
  // grava: face de fora pelo vértice soldado; forro/borda/LOD1/LOD2 pelo ponto mais perto da face de fora do LOD0
  const sb = new BVH(P0, T), acc = new Float64Array(NB);
  for (let i = 0; i < G0.nv; i++) {
    if (!(F[i] & 4)) continue;
    const j = map.get(wd.wid[i]);
    if (j !== undefined) { for (let b = 0; b < NB; b++) W[i * NB + b] = Wf[j * NB + b]; continue; }
    const c = sb.closest(G0.P[i * 3], G0.P[i * 3 + 1], G0.P[i * 3 + 2], 0.2); if (c.tri < 0) continue;
    acc.fill(0); const bw = [c.u, c.v, c.w];
    for (let e = 0; e < 3; e++) for (let b = 0; b < NB; b++) acc[b] += bw[e] * Wf[T[c.tri * 3 + e] * NB + b];
    let sm = 0; for (let b = 0; b < NB; b++) sm += acc[b]; for (let b = 0; b < NB; b++) W[i * NB + b] = acc[b] / (sm || 1);
  }
}
