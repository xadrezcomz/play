// Roupas (§6): cascas recortadas do próprio corpo pela função de região R_g, subdivididas, afastadas
// pela espessura/folga do tecido (com caimento, dobras, colisão e camadas), com barra dobrada para dentro,
// espaços de cor por faixa e oclusão. Saída explícita (posição, normal, ossos, atributos) — ver §6.1 na espec.
import * as G from './gltf.mjs';
import { K, KN, garmentTerms, evalR, limbCoords } from './label.mjs';
import { BI, NB } from './body.mjs';
import { BVH, neighbors, vertexNormals, boundaryLoops, smoothField, smoothstep, clamp, noise3, rng, seedOf, rayAO, compact } from './geom.mjs';
import { simplifier } from './encode.mjs';
import { SL } from './consts.mjs';

const MAT = { cotton: 1, tech: 2 };
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
function cutAndSubdivide(Aw, widx, terms) {
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
  // subdivide 1→4
  const mid = new Map(), out = [];
  const m = (a, b) => {
    const k = a < b ? a + '_' + b : b + '_' + a;
    let i = mid.get(k);
    if (i === undefined) { const r = new Float64Array(KN); lerpRec(recs[a], 0, recs[b], 0, 0.5, r, 0); i = push(r); mid.set(k, i); }
    return i;
  };
  for (let t = 0; t < tris.length; t += 3) {
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
export function torsoSlices(Aw, y0, y1) {
  const bins = new Map();
  const nw = Aw.length / KN;
  for (let w = 0; w < nw; w++) {
    const o = w * KN;
    if (Aw[o + K.wArm] >= 0.3 || Aw[o + K.head] > 0.5) continue;
    const y = Aw[o + 1];
    if (y < y0 - 0.02 || y > y1 + 0.02) continue;
    const k = Math.floor(y * 100);
    if (!bins.has(k)) bins.set(k, []);
    bins.get(k).push([Aw[o], Aw[o + 2]]);
  }
  const S = new Map();
  for (const [k, pts] of bins) {
    if (pts.length < 6) continue;
    let cx = 0, cz = 0;
    pts.forEach(p => { cx += p[0]; cz += p[1]; });
    cx /= pts.length; cz /= pts.length;
    S.set(k, { c: [cx, cz], h: hull2(pts.slice()) });
  }
  return S;
}
function hullDist(sl, dx, dz) {   // distância do centro até o casco na direção (dx, dz)
  const h = sl.h, cx = sl.c[0], cz = sl.c[1];
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
function offsets(kind, g, V, n, idx, Lm, terms, slices, seed) {
  const f = g === 'f', off = new Float64Array(n * 3), rnd = seedOf(kind + g);
  const H = Lm.H, Yhem = kind === 'corta-vento' ? H[1] - 0.075 : H[1] - 0.035;
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
        d = (f ? 0.005 : 0.006) * (1 - armB) + armB * (0.006 + 0.010 * smoothstep(0.03, Ls, Math.max(0, sA)));
        d += 0.004 * smoothstep(Yhem + 0.06, Yhem, y) * (1 - armB);
        fold = 0.002 * smoothstep(Yhem + 0.14, Yhem + 0.03, y) * (1 - armB) * Math.sin(2 * Math.PI * (y + 0.012 * nz(x, y, z, 18)) / 0.05);
        break;
      }
      case 'regata':
        d = 0.005 + 0.003 * smoothstep(Yhem + 0.06, Yhem, y);
        fold = 0.0015 * smoothstep(Yhem + 0.14, Yhem + 0.03, y) * Math.sin(2 * Math.PI * (y + 0.012 * nz(x, y, z, 18)) / 0.05);
        break;
      case 'top':
        d = tv.hem < 0.035 ? 0.0035 : 0.0025;
        break;
      case 'manga-longa': {
        d = 0.005 + armB * 0.002 * smoothstep(0.04, 0.0, tv.sleeve);
        const el = Lm.upperLen;
        fold = armB * 0.0015 * smoothstep(0.06, 0.0, Math.abs(sA - el)) * Math.sin(2 * Math.PI * (sA + 0.01 * nz(x, y, z, 25)) / 0.035);
        fold += (1 - armB) * 0.0015 * smoothstep(Yhem + 0.14, Yhem + 0.03, y) * Math.sin(2 * Math.PI * (y + 0.012 * nz(x, y, z, 18)) / 0.05);
        break;
      }
      case 'corta-vento': {
        d = 0.012 * (1 - armB) + 0.014 * armB;
        const band = Math.min(tv.hem !== undefined ? tv.hem : 1, tv.sleeve !== undefined && sA >= 0 ? tv.sleeve : 1);
        d = d + (0.006 - d) * smoothstep(0.03, 0.0, band);
        const diag = (1 - armB) * Math.sin(2 * Math.PI * (y * 0.8 + x * 0.6 + 0.02 * nz(x, y, z, 12)) / 0.04);
        const ring = armB * Math.sin(2 * Math.PI * (Math.max(0, sA) + 0.015 * nz(x, y, z, 14)) / 0.045);
        fold = 0.003 * (diag * (0.5 + 0.5 * nz(x, y, z, 6)) + ring * (0.6 + 0.4 * nz(x, y, z, 7)));
        break;
      }
      case 'short': case 'saia-short': case 'bermuda': case 'legging': {
        const L = kind === 'bermuda' ? Lm.thigh - 0.035 : kind === 'legging' ? Lm.thigh + Lm.shin - 0.045 : (f ? 0.135 : 0.25);
        let base, flare = 0, famp = 0, nfold = 7;
        if (kind === 'legging') {
          base = 0.0025 + 0.0005 * smoothstep(0.06, 0.0, Math.abs(sL - Lm.thigh));
          famp = 0;
        } else if (kind === 'bermuda') { base = 0.008; flare = 0.006 + 0.016 * smoothstep(0.05, L, sL); famp = 0.002; }
        else if (f) { base = 0.006; flare = 0.004 + 0.010 * smoothstep(0.03, L, sL); famp = 0.0015; }
        else { base = 0.008; flare = 0.008 + 0.024 * smoothstep(0.03, L, sL); famp = 0.0025 * smoothstep(0.08, 0.25, sL); }
        const wl = smoothstep(0.35, 0.75, wLeg);
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
        if (sl0 && z < sl0.c[1] && Math.abs(x) < 0.06 && y >= Lm.Ybra && y <= Lm.Ychest + 0.03) wf = 1;
      } else if (!f) wf = 0.9 * smoothstep(Lm.Ychest, Lm.Ychest - 0.12, y);
      else wf = y < Lm.Ychest ? 0.6 + 0.4 * smoothstep(Lm.Ychest, Lm.Ybra, y) : 0.6 * smoothstep(Lm.Ychest + 0.05, Lm.Ychest, y);
      if (kind === 'manga-longa') wf *= 0.7;
      if (kind === 'corta-vento') wf = y < Lm.Ychest ? 1 : smoothstep(Lm.Ychest + 0.05, Lm.Ychest, y);
      wf *= 1 - smoothstep(0.3, 0.5, wArm);
      const sl = slices.get(Math.floor(y * 100));
      if (wf > 0 && sl) {
        const dx = x - sl.c[0], dz = z - sl.c[1], rv = Math.hypot(dx, dz);
        if (rv > 1e-4) {
          const rh = hullDist(sl, dx / rv, dz / rv);
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
  smoothField(pv, 3, adj, 4, 0.5);
  for (let i = 0; i < n * 3; i++) off[i] += pv[i];
  smoothField(off, 3, adj, 1, 0.3);
  return { off, adj };
}

// ---------------------------------------------------------------- montagem de uma roupa
export function buildGarment(C, kind, ctx) {
  const { Aw, widx, Lm, bodyBVH, lower } = ctx;
  const spec = GSPEC[kind], terms = garmentTerms(kind, C.g, Lm);
  const cs = cutAndSubdivide(Aw, widx, terms);
  let { V, idx, n } = cs;
  const top = spec.layer === 3;
  const slices = top ? ctx.slices : null;
  const { off } = offsets(kind, C.g, V, n, idx, Lm, terms, slices, 0);
  const P = new Float64Array(n * 3);
  for (let i = 0; i < n; i++) for (let k = 0; k < 3; k++) P[i * 3 + k] = V[i * KN + k] + off[i * 3 + k];
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
      const d0 = other.closest(p[0], p[1], p[2]).d, d1 = other.closest(q[0], q[1], q[2]).d;
      if (d1 < d0 && d0 < 0.2) {
        const s = clamp((d0 / 2 - 0.003) / Math.max(1e-6, d0 - d1), 0, 1);
        if (s < 1) for (let k = 0; k < 3; k++) P[i * 3 + k] = p[k] + (q[k] - p[k]) * s;
      }
    }
  }
  // colisão com o corpo: distância mínima pela normal do ponto mais próximo
  const dmin = spec.mat === MAT.tech ? 0.001 : 0.0015;
  const collide = (margin) => {
    for (let i = 0; i < n; i++) {
      const h = bodyBVH.closest(P[i * 3], P[i * 3 + 1], P[i * 3 + 2], 0.08);
      if (h.tri < 0) continue;
      const nn = nrmAt(h), sd = (P[i * 3] - h.x) * nn[0] + (P[i * 3 + 1] - h.y) * nn[1] + (P[i * 3 + 2] - h.z) * nn[2];
      if (sd < margin) for (let k = 0; k < 3; k++) P[i * 3 + k] += nn[k] * (margin - sd);
    }
  };
  collide(dmin);
  // camadas: por cima das roupas de baixo (todas do gênero) com folga
  let pushedLayer = 0;
  if (lower && lower.length) {
    const marg = top ? 0.003 : 0.0015;
    for (const L of lower) {
      for (let i = 0; i < n; i++) {
        const h = L.bvh.closest(P[i * 3], P[i * 3 + 1], P[i * 3 + 2], 0.03);
        if (h.tri < 0) continue;
        const a = L.idx[h.tri * 3] * 3, b = L.idx[h.tri * 3 + 1] * 3, c = L.idx[h.tri * 3 + 2] * 3, Nn = L.N;
        const nn = G.norm([Nn[a] * h.u + Nn[b] * h.v + Nn[c] * h.w, Nn[a + 1] * h.u + Nn[b + 1] * h.v + Nn[c + 1] * h.w, Nn[a + 2] * h.u + Nn[b + 2] * h.v + Nn[c + 2] * h.w]);
        const sd = (P[i * 3] - h.x) * nn[0] + (P[i * 3 + 1] - h.y) * nn[1] + (P[i * 3 + 2] - h.z) * nn[2];
        // só onde a peça de baixo está de fato embaixo (mesma direção da normal do corpo)
        const bn = [V[i * KN + 3], V[i * KN + 4], V[i * KN + 5]];
        if (G.dot(nn, bn) < 0.3) continue;
        if (sd < marg) { for (let k = 0; k < 3; k++) P[i * 3 + k] += nn[k] * (marg - sd); pushedLayer++; }
      }
    }
    collide(dmin);
  }
  // espaços de cor
  const slot = new Uint8Array(n);
  for (let i = 0; i < n; i++) slot[i] = slotOf(kind, C.g, V, i * KN, terms, Lm);
  // normais (para as camadas de cima e a oclusão)
  return finishShell(C, kind, spec, { V, P, idx, n, slot, terms, Lm, bodyBVH, lower, pushedLayer, ctx });
}

function slotOf(kind, g, V, o, terms, Lm) {
  const dt = k => terms[k] ? -terms[k](V, o) : 9;
  const x = V[o], y = V[o + 1], z = V[o + 2], front = z < Lm.N[2];
  switch (kind) {
    case 'camiseta':
      if (dt('neck') < 0.016 || (V[o + K.sA] >= 0 && dt('sleeve') < 0.018) || dt('hem') < 0.018) return SL.shirtTrim;
      if (x < -0.05 && x > -0.095 && y > Lm.Sy - 0.17 && y < Lm.Sy - 0.13 && z < Lm.N[2] - 0.02) return SL.shirtAccent;
      return SL.shirt;
    case 'regata':
      if (dt('neck') < 0.014 || dt('armhole') < 0.015 || dt('hem') < 0.018) return SL.shirtTrim;
      return SL.shirt;
    case 'top':
      if (dt('hem') < 0.035 || dt('neck') < 0.010 || dt('armhole') < 0.012 || dt('racer') < 0.006) return SL.shirtTrim;
      return SL.shirt;
    case 'manga-longa':
      if ((V[o + K.sA] >= 0 && dt('sleeve') < 0.025) || dt('neck') < 0.016 || dt('hem') < 0.018) return SL.shirtTrim;
      if (Math.abs(V[o + K.wArm] - 0.5) < 0.08 && y > Lm.Sy - 0.08) return SL.shirtAccent;
      return SL.shirt;
    case 'corta-vento':
      if (Math.abs(x) < 0.006 && front) return SL.shirtAccent;
      if (Math.abs(y - (Lm.Sy - 0.12)) < 0.006 && V[o + K.wArm] < 0.5) return SL.shirtAccent;
      if ((V[o + K.sA] >= 0 && dt('sleeve') < 0.02) || dt('hem') < 0.02) return SL.shirtTrim;
      return SL.shirt;
    case 'short': case 'bermuda': case 'saia-short': case 'legging': {
      const leg = kind === 'legging';
      if (dt('waist') < (leg ? 0.045 : 0.035)) return SL.shortsTrim;
      if (V[o + K.sL] >= 0 && dt('legEnd') < (leg ? 0.012 : 0.015)) return SL.shortsTrim;
      if (V[o + K.wLeg] > 0.5 || (leg && V[o + K.sL] >= 0)) {
        const sd = x < 0 ? 'L' : 'R', la = legAxis(Lm, sd, [x, y, z]);
        // lado de fora da perna: direção radial alinhada com ±x
        const outward = sd === 'L' ? -la.r[0] : la.r[0];
        const lat = Math.sqrt(Math.max(0, 1 - outward * outward)) * la.rad;
        if (outward > 0 && lat < (leg ? 0.006 : 0.0075)) return SL.shortsAccent;
      }
      return SL.shorts;
    }
    case 'meia':
      return dt('top') < 0.018 ? SL.sockTrim : SL.sock;
  }
  return 0;
}

// ---------------------------------------------------------------- simplificação, barra, oclusão
function finishShell(C, kind, spec, S) {
  const { V, P, idx, n, slot } = S, Sm = simplifier();
  const P32 = Float32Array.from(P);
  const simp = (target, err, lock = true) => {
    if (idx.length / 3 <= target) return Uint32Array.from(idx);
    const [r] = Sm.simplify(Uint32Array.from(idx), P32, 3, Math.floor(target) * 3, err, lock ? ['LockBorder'] : []);
    return r;
  };
  // a barra (lábio) entra em todos os LODs: o alvo da casca desconta os triângulos dela
  const loops = boundaryLoops(idx);
  const lipTris = loops.reduce((a, l) => a + 2 * l.length, 0);
  const t0 = Math.max(spec.lod[0] - lipTris, spec.lod[0] * 0.5), t1 = Math.max(spec.lod[1] - lipTris, spec.lod[1] * 0.4);
  const L0 = simp(t0, 0.002), L1 = simp(t1, 0.01), L2 = simp(spec.lod[2], 0.05, false);
  // normais da casca pelo LOD0
  const NS = vertexNormals(P, L0, n);
  // barra: duplica a borda e dobra para dentro, até perto do corpo (ou da camada de baixo)
  const lipP = [], lipN = [], lipRec = [], lipSlot = [], lipTri = [];
  const under = (i) => {
    let u = 0;
    if (S.lower) for (const L of S.lower) {
      const h = L.bvh.closest(V[i * KN], V[i * KN + 1], V[i * KN + 2], 0.03);
      if (h.tri >= 0) u = Math.max(u, h.d);
    }
    return u;
  };
  let nv = n;
  for (const loop of loops) {
    const m = loop.length;
    if (m < 3) continue;
    const outer = [], inner = [];
    for (let j = 0; j < m; j++) {
      const i = loop[j], ip = loop[(j + 1) % m], im = loop[(j - 1 + m) % m];
      const e = G.sub([P[ip * 3], P[ip * 3 + 1], P[ip * 3 + 2]], [P[im * 3], P[im * 3 + 1], P[im * 3 + 2]]);
      const ns = [NS[i * 3], NS[i * 3 + 1], NS[i * 3 + 2]];
      const tout = G.norm(G.cross(e, ns));
      const bn = [V[i * KN + 3], V[i * KN + 4], V[i * KN + 5]];
      const lo = Math.max(0.0015, under(i) + 0.0015);
      const q = [P[i * 3], P[i * 3 + 1], P[i * 3 + 2]];
      const base = [V[i * KN], V[i * KN + 1], V[i * KN + 2]];
      const lp = G.add(base, G.scl(bn, lo));
      // não deixa a barra mais "funda" que a própria casca
      const cur = G.dot(G.sub(q, base), bn);
      const inn = cur > lo ? lp : G.add(base, G.scl(bn, Math.max(0, cur - 0.0008)));
      outer.push(nv); lipP.push(...q); lipN.push(...tout); lipRec.push(i); lipSlot.push(slot[i]); nv++;
      inner.push(nv); lipP.push(...inn); lipN.push(...tout); lipRec.push(i); lipSlot.push(slot[i]); nv++;
    }
    for (let j = 0; j < m; j++) {
      const a = outer[j], b = outer[(j + 1) % m], c = inner[(j + 1) % m], d = inner[j];
      // orientação: normal da face para fora da casca (tout)
      lipTri.push(a, d, c, a, c, b);
    }
  }
  // confere a orientação da barra pela primeira face de cada laço
  const PA = new Float64Array(nv * 3); PA.set(P); PA.set(lipP, n * 3);
  const NA = new Float64Array(nv * 3); NA.set(NS); NA.set(lipN, n * 3);
  for (let t = 0; t < lipTri.length; t += 3) {
    const a = lipTri[t] * 3, b = lipTri[t + 1] * 3, c = lipTri[t + 2] * 3;
    const fn = G.cross(G.sub([PA[b], PA[b + 1], PA[b + 2]], [PA[a], PA[a + 1], PA[a + 2]]), G.sub([PA[c], PA[c + 1], PA[c + 2]], [PA[a], PA[a + 1], PA[a + 2]]));
    if (G.dot(fn, [NA[a], NA[a + 1], NA[a + 2]]) < 0) { const tmp = lipTri[t + 1]; lipTri[t + 1] = lipTri[t + 2]; lipTri[t + 2] = tmp; }
  }
  const withLip = L => { const o = new Uint32Array(L.length + lipTri.length); o.set(L); o.set(lipTri, L.length); return o; };
  // registros (pesos) e atributos para todos os vértices
  const REC = new Int32Array(nv); for (let i = 0; i < n; i++) REC[i] = i; lipRec.forEach((r, j) => { REC[n + j] = r; });
  const SLOT = new Uint8Array(nv); SLOT.set(slot); SLOT.set(lipSlot, n);
  const FLAGS = new Uint8Array(nv); for (let i = n; i < nv; i++) FLAGS[i] = 1;
  return { kind, nv, P: PA, N: NA, REC, V, SLOT, FLAGS, lods: [withLip(L0), withLip(L1), L2], shellIdx: L0, nShell: n, mat: spec.mat, layer: spec.layer };
}

// oclusão de uma roupa pronta (raios contra corpo + a própria roupa)
export function garmentAO(G0, bodyBVH, rays) {
  const own = new BVH(G0.P, G0.lods[0]);
  const ao = rayAO([bodyBVH, own], G0.P, G0.N, G0.nv, { rays, maxD: 0.25, k: 0.6, offset: 0.002 });
  for (let i = 0; i < G0.nv; i++) if (G0.FLAGS[i] & 1) ao[i] *= 0.8;
  return ao;
}

// pesos densos (17) de cada vértice da roupa
export function garmentWeights(G0) {
  const W = new Float32Array(G0.nv * NB);
  for (let i = 0; i < G0.nv; i++) {
    const o = G0.REC[i] * KN;
    let s = 0;
    for (let b = 0; b < 17; b++) { W[i * NB + b] = Math.max(0, G0.V[o + K.w0 + b]); s += W[i * NB + b]; }
    for (let b = 0; b < 17; b++) W[i * NB + b] /= s || 1;
  }
  return W;
}
