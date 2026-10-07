// Cabelos (§8): peças da Quaternius ajustadas a cada cabeça (e ao outro gênero), afastadas do couro
// cabeludo, com tom por vértice (sem textura), faces de trás nas bordas abertas, rabo de cavalo e coque
// gerados, cabelo longo alongado com ossos de mola e cacheado procedural.
import fs from 'node:fs';
import path from 'node:path';
import * as G from './gltf.mjs';
import { BI, NB, loadBody } from './body.mjs';
import { weld, neighbors, vertexNormals, components, boundaryLoops, compact, smoothField, smoothstep, clamp, noise3, worley, BVH, rayAO, basis, rng, taubin } from './geom.mjs';
import { cutBy } from './garments.mjs';
import { simplifier } from './encode.mjs';
import { SL, HAIRS } from './consts.mjs';
import * as TX from './textures.mjs';

const GFILE = { m: 'Superhero_Male_FullBody', f: 'Superhero_Female_FullBody' };

// mesh simples: { P (n*3), UV (n*2), idx } no referencial do glTF
function loadHairMesh(file) {
  const g = G.loadGltf(file), p = g.meshes[0].primitives[0];
  return { P: Float64Array.from(g.acc(p.attributes.POSITION)), UV: Float64Array.from(g.acc(p.attributes.TEXCOORD_0)), idx: Uint32Array.from(g.acc(p.indices)),
    tex: /Hair_2/.test(g.materials[p.material].name) ? 'T_Hair_2_BaseColor.png' : 'T_Hair_1_BaseColor.png' };
}

// crânio (vértices dominados pela cabeça, acima dos olhos) no referencial do glTF
const skullCache = {};
function skullOf(F, g) {
  if (skullCache[g]) return skullCache[g];
  const B = loadBody(path.join(F, GFILE[g] + '.gltf')), m = B.meshes.body, e = B.meshes.eyes;
  let ey = 0; for (let i = 0; i < e.pos.length / 3; i++) ey += e.pos[i * 3 + 1]; ey /= e.pos.length / 3;
  const hi = B.names.indexOf('Head'), mn = [9, 9, 9], mx = [-9, -9, -9], c = [0, 0, 0];
  let k = 0;
  for (let v = 0; v < m.pos.length / 3; v++) {
    let w = 0; for (let q = 0; q < 4; q++) if (m.jn[v * 4 + q] === hi) w += m.wt[v * 4 + q];
    if (w < 0.5 || m.pos[v * 3 + 1] < ey) continue;
    for (let q = 0; q < 3; q++) { mn[q] = Math.min(mn[q], m.pos[v * 3 + q]); mx[q] = Math.max(mx[q], m.pos[v * 3 + q]); c[q] += m.pos[v * 3 + q]; }
    k++;
  }
  return (skullCache[g] = { c: [(mn[0] + mx[0]) / 2, (mn[1] + mx[1]) / 2, (mn[2] + mx[2]) / 2], size: G.sub(mx, mn), eyeY: ey });
}

const hash01 = k => { const x = Math.sin(k * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
// ---------------------------------------------------------------- utilidades de malha de cabelo (referencial final)
const recOf = (M) => { const K = 9, V = new Float64Array(M.n * K); for (let i = 0; i < M.n; i++) { for (let k = 0; k < 3; k++) { V[i * K + k] = M.P[i * 3 + k]; V[i * K + 3 + k] = M.N ? M.N[i * 3 + k] : 0; } V[i * K + 6] = M.UV[i * 2]; V[i * K + 7] = M.UV[i * 2 + 1]; V[i * K + 8] = M.tone ? M.tone[i] : 1; } return V; };
function cutKeep(M, fn) {   // corta na linha fn = 0 e mantém fn <= 0
  const V = recOf(M), K = 9, F = [[]];
  for (let i = 0; i < M.n; i++) F[0].push(fn(M.P[i * 3], M.P[i * 3 + 1], M.P[i * 3 + 2], i));
  const R = cutBy({ V, P: Float64Array.from(M.P), n: M.n, idx: Array.from(M.idx), F, K }, 0);
  const keep = [];
  for (let t = 0; t < R.idx.length; t += 3) { const f = R.F[0]; if (f[R.idx[t]] + f[R.idx[t + 1]] + f[R.idx[t + 2]] <= 0) keep.push(R.idx[t], R.idx[t + 1], R.idx[t + 2]); }
  const cp = compact(keep, R.n), n = cp.back.length, P = new Float64Array(n * 3), N = new Float64Array(n * 3), UV = new Float64Array(n * 2), tone = new Float64Array(n);
  cp.back.forEach((o, i) => { for (let k = 0; k < 3; k++) { P[i * 3 + k] = R.V[o * K + k]; N[i * 3 + k] = R.V[o * K + 3 + k]; } UV[i * 2] = R.V[o * K + 6]; UV[i * 2 + 1] = R.V[o * K + 7]; tone[i] = R.V[o * K + 8]; });
  return { ...M, P, N, UV, tone, idx: cp.idx, n };
}
function subsetTris(M, keepTri) {
  const keep = [];
  for (let t = 0; t < M.idx.length / 3; t++) if (keepTri(t)) keep.push(M.idx[t * 3], M.idx[t * 3 + 1], M.idx[t * 3 + 2]);
  const cp = compact(keep, M.n), n = cp.back.length;
  const pick = (A, d) => { if (!A) return null; const o = new A.constructor(n * d); cp.back.forEach((s, i) => { for (let k = 0; k < d; k++) o[i * d + k] = A[s * d + k]; }); return o; };
  return { ...M, P: pick(M.P, 3), N: pick(M.N, 3), UV: pick(M.UV, 2), tone: pick(M.tone, 1), W: pick(M.W, NB), idx: cp.idx, n };
}
function merge(list) {
  let n = 0; for (const m of list) n += m.n;
  const P = new Float64Array(n * 3), UV = new Float64Array(n * 2), tone = new Float64Array(n).fill(1), W = new Float32Array(n * NB), slot = new Uint8Array(n).fill(SL.hair), idx = [];
  let o = 0;
  for (const m of list) {
    P.set(m.P, o * 3); UV.set(m.UV, o * 2); if (m.tone) tone.set(m.tone, o);
    if (m.W) W.set(m.W, o * NB); else for (let i = 0; i < m.n; i++) W[(o + i) * NB + BI.head] = 1;
    if (m.slot) slot.set(m.slot, o);
    for (const i of m.idx) idx.push(i + o);
    o += m.n;
  }
  return { P, UV, tone, W, slot, idx: Uint32Array.from(idx), n };
}
const posComps = M => { const wd = weld(M.P, M.n, 1e-5); const wi = Uint32Array.from(M.idx, i => wd.wid[i]); const c = components(wi, wd.nw); return c; };

// ---------------------------------------------------------------- tubo do rabo de cavalo
function catmull(p0, p1, p2, p3, t) {
  const t2 = t * t, t3 = t2 * t;
  return [0, 1, 2].map(k => 0.5 * ((2 * p1[k]) + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3));
}
function ponytail(root, seed) {
  // caminho: sai para trás do elástico e cai numa curva suave (sem quina no nó)
  const pts = [G.add(root, [0, 0.01, -0.01]), root, G.add(root, [0, -0.025, 0.05]), G.add(root, [0, -0.11, 0.07]), G.add(root, [0, -0.2, 0.06]), G.add(root, [0, -0.26, 0.045])];
  const NP = pts.length - 3;
  const path = t => { const s = clamp(t, 0, 1) * NP, i = Math.min(NP - 1, Math.floor(s)), u = s - i; return catmull(pts[i], pts[i + 1], pts[i + 2], pts[i + 3], u); };
  const frameAt = t => {
    const d = G.norm(G.sub(path(Math.min(1, t + 0.01)), path(Math.max(0, t - 0.01))));
    let side = G.norm(G.cross(d, [0, 0, 1])); if (G.len(side) < 0.5) side = [1, 0, 0];
    return { c: path(t), d, side, up: G.norm(G.cross(side, d)) };
  };
  // raio do rabo inteiro: fino no elástico, cheio no meio, afinando para a ponta
  // v7: feixe mais cheio e redondo (raiz 19 mm, meio 32 mm)
  const R = t => t < 0.1 ? 0.019 + 0.013 * smoothstep(0.02, 0.1, t) : 0.032 - 0.009 * smoothstep(0.3, 0.9, t);
  // v6: o rabo é um feixe redondo de mechas — 7 mechas de seção em gota (a ponta da gota para fora), que se sobrepõem
  // perto do elástico e se separam para a ponta, torcendo 1,3 rad, cada uma afinando até um comprimento diferente
  // (0,8–1,0), + 2 fiapos finos que se soltam mais na ponta, em volta de um miolo que tapa as frestas da raiz
  const NCL = 8, rnd = rng(seed), P = [], UV = [], idx = [], T = [], tone = [];
  const tube = (center, radius, t0, t1, rings, sides, tipT, tn, shape = () => 1) => {
    const base = P.length / 3;
    for (let r = 0; r <= rings; r++) {
      const t = t0 + (t1 - t0) * r / rings, c = center(t), f = frameAt(Math.min(t, 1)), rr = Math.max(0.0008, radius(t));
      for (let a = 0; a < sides; a++) {
        const ang = 2 * Math.PI * a / sides, sh = shape(ang, t), nz = 1 + 0.06 * noise3(Math.cos(ang) * 1.5, Math.sin(ang) * 1.5 + r * 0.7, seed, seed);
        const p = G.add(c, G.add(G.scl(f.side, Math.cos(ang) * rr * nz * sh), G.scl(f.up, Math.sin(ang) * rr * nz * sh)));
        P.push(...p); UV.push(a / sides, t); T.push(Math.min(t, 1)); tone.push(tn);
      }
    }
    for (let r = 0; r < rings; r++) for (let a = 0; a < sides; a++) {
      const i0 = base + r * sides + a, i1 = base + r * sides + (a + 1) % sides, i2 = base + (r + 1) * sides + (a + 1) % sides, i3 = base + (r + 1) * sides + a;
      idx.push(i0, i1, i2, i0, i2, i3);
    }
    if (tipT !== null) { const tip = P.length / 3; P.push(...center(tipT)); UV.push(0.5, tipT); T.push(Math.min(tipT, 1)); tone.push(tn); for (let a = 0; a < sides; a++) idx.push(base + rings * sides + a, base + rings * sides + (a + 1) % sides, tip); }
    // fecha a ponta da raiz (dentro do elástico)
    const cap = P.length / 3; P.push(...center(t0)); UV.push(0.5, t0); T.push(t0); tone.push(tn);
    for (let a = 0; a < sides; a++) idx.push(base + (a + 1) % sides, base + a, cap);
  };
  // miolo
  tube(t => path(t), t => 0.7 * R(t) * (1 - 0.85 * smoothstep(0.55, 0.85, t)), 0.02, 0.86, 9, 8, null, 0.8);
  const clump = (th0, tEnd, spread, tn, rad, twist, sides, rings, out = 0) => {
    const center = t => { const f = frameAt(Math.min(t, 1)), th = th0 + twist * t, d = R(Math.min(t, 1)) * spread * (1 + 0.2 * smoothstep(0.35, 1, t)) + out * smoothstep(0.5, 1, t); return G.add(f.c, G.add(G.scl(f.side, Math.cos(th) * d), G.scl(f.up, Math.sin(th) * d))); };
    // v6: afina só no último terço e a ponta fecha arredondada (a ponta de agulha dava o ar espetado)
    const radius = t => rad * R(Math.min(t, 1)) * Math.pow(Math.max(0, 1 - Math.pow(smoothstep(0.58, tEnd, t), 2.2)), 0.5);
    // gota: mais larga para fora (ang = θ da mecha) e afilada para dentro
    const shape = (ang, t) => { const th = th0 + twist * t, c = Math.cos(ang - th); return 0.82 + 0.26 * c * c * Math.sign(c) * 0.5 + 0.12 * c; };
    tube(center, radius, 0.03, tEnd * 0.985, rings, sides, tEnd, tn, shape);
  };
  // v7: mechas mais grossas e mais juntas (o feixe lê redondo, não um leque chato)
  for (let c = 0; c < NCL; c++) clump(2 * Math.PI * c / NCL + 0.3 * (rnd() - 0.5), 0.86 + 0.14 * rnd(), 0.3 + 0.08 * rnd(), 0.88 + 0.16 * rnd(), 0.8 + 0.1 * rnd(), 1.2 + 0.3 * (rnd() - 0.5), 7, 12);
  // fiapos: finos, soltam-se um pouco para fora na metade de baixo
  for (let c = 0; c < 2; c++) clump(2 * Math.PI * rnd(), 0.7 + 0.12 * rnd(), 0.62, 0.95, 0.2, 1.6, 5, 8, 0.005 + 0.004 * rnd());
  // elástico (v7): "scrunchie" — toro de 20 × 10 lados, seção de 8,5 mm de raio com franzido macio, assentado na raiz
  const f0 = frameAt(0.035), Rm = R(0.035) + 0.0045;
  const tie = scrunchie(f0.c, f0.d, f0.side, f0.up, Rm, 0.0085, 0.88);
  // orientação: cada triângulo para fora do eixo do rabo (mechas) / do anel (elástico)
  const outOf = (Pp, ix, cen) => { for (let t = 0; t < ix.length; t += 3) { const a = ix[t] * 3, b = ix[t + 1] * 3, c = ix[t + 2] * 3, pa = [Pp[a], Pp[a + 1], Pp[a + 2]]; const fn = G.cross(G.sub([Pp[b], Pp[b + 1], Pp[b + 2]], pa), G.sub([Pp[c], Pp[c + 1], Pp[c + 2]], pa)); const m = [(Pp[a] + Pp[b] + Pp[c]) / 3, (Pp[a + 1] + Pp[b + 1] + Pp[c + 1]) / 3, (Pp[a + 2] + Pp[b + 2] + Pp[c + 2]) / 3]; if (G.dot(fn, G.sub(m, cen(m))) < 0) { const k = ix[t + 1]; ix[t + 1] = ix[t + 2]; ix[t + 2] = k; } } };
  // centro de referência: o ponto do eixo mais perto (pela altura relativa ao caminho)
  const nearAxis = m => { let best = path(0), bd = 1e9; for (let k = 0; k <= 40; k++) { const q = path(k / 40), d = G.dist(q, m); if (d < bd) { bd = d; best = q; } } return best; };
  // as mechas: centro = eixo da própria mecha (aprox. pelo eixo do rabo deslocado) — usa o eixo do rabo
  outOf(P, idx, nearAxis);
  return { tube: { P: Float64Array.from(P), UV: Float64Array.from(UV), idx: Uint32Array.from(idx), n: P.length / 3, T, tone }, tie, path };
}

// elástico de cabelo (v7): toro franzido em volta do eixo d (centro c; side/up no plano do anel), raio do anel Rm, raio
// da seção rm (franzido ±16 % em 11 ondas), achatado `flat` no eixo up. Normais lisas do próprio toro.
function scrunchie(c, d, side, up, Rm, rm0, flat = 1, SEG = 20, SD = 10) {
  const P = [], N = [], UV = [], idx = [], T = [];
  for (let a = 0; a < SEG; a++) for (let b = 0; b < SD; b++) {
    const A = 2 * Math.PI * a / SEG, Bb = 2 * Math.PI * b / SD, ruf = 1 + 0.16 * Math.sin(11 * A + 0.7) * (0.6 + 0.4 * Math.cos(Bb));
    const ring = G.norm(G.add(G.scl(side, Math.cos(A)), G.scl(up, Math.sin(A) * flat))), rm = rm0 * ruf;
    const nn = G.norm(G.add(G.scl(ring, Math.cos(Bb)), G.scl(d, Math.sin(Bb))));
    const p = G.add(c, G.add(G.scl(ring, Rm * (Math.hypot(Math.cos(A), Math.sin(A) * flat)) + rm * Math.cos(Bb)), G.scl(d, rm * 1.1 * Math.sin(Bb))));
    P.push(...p); N.push(...nn); UV.push(0, 0); T.push(0.035);
  }
  for (let a = 0; a < SEG; a++) for (let b = 0; b < SD; b++) {
    const i0 = a * SD + b, i1 = ((a + 1) % SEG) * SD + b, i2 = ((a + 1) % SEG) * SD + (b + 1) % SD, i3 = a * SD + (b + 1) % SD;
    idx.push(i0, i1, i2, i0, i2, i3);
  }
  // para fora da seção (pela normal do toro)
  for (let t = 0; t < idx.length; t += 3) {
    const ia = idx[t] * 3, ib = idx[t + 1] * 3, ic = idx[t + 2] * 3, pa = P.slice(ia, ia + 3);
    const fn = G.cross(G.sub(P.slice(ib, ib + 3), pa), G.sub(P.slice(ic, ic + 3), pa)), nm = [N[ia] + N[ib] + N[ic], N[ia + 1] + N[ib + 1] + N[ic + 1], N[ia + 2] + N[ib + 2] + N[ic + 2]];
    if (G.dot(fn, nm) < 0) { const k = idx[t + 1]; idx[t + 1] = idx[t + 2]; idx[t + 2] = k; }
  }
  return { P: Float64Array.from(P), N: Float64Array.from(N), UV: Float64Array.from(UV), idx: Uint32Array.from(idx), n: P.length / 3, T };
}

// orienta as faces para fora (pelo centro da cabeça)
function orientOut(M, center) {
  const idx = M.idx;
  for (let t = 0; t < idx.length; t += 3) {
    const a = idx[t] * 3, b = idx[t + 1] * 3, c = idx[t + 2] * 3;
    const pa = [M.P[a], M.P[a + 1], M.P[a + 2]], fn = G.cross(G.sub([M.P[b], M.P[b + 1], M.P[b + 2]], pa), G.sub([M.P[c], M.P[c + 1], M.P[c + 2]], pa));
    const cen = [(M.P[a] + M.P[b] + M.P[c]) / 3, (M.P[a + 1] + M.P[b + 1] + M.P[c + 1]) / 3, (M.P[a + 2] + M.P[b + 2] + M.P[c + 2]) / 3];
    if (G.dot(fn, G.sub(cen, center)) < 0) { const k = idx[t + 1]; idx[t + 1] = idx[t + 2]; idx[t + 2] = k; }
  }
}

// ---------------------------------------------------------------- montagem de todos os estilos de um gênero
export function buildHairs(C, rays) {
  const F = C.ctx.fontes, g = C.g, FR = C.FR, Sm = simplifier();
  const skT = skullOf(F, g);
  // texturas de cabelo (luminância 256²) para o tom por vértice
  const texL = {};
  const lumTex = name => {
    if (texL[name]) return texL[name];
    const img = TX.decodePNG(fs.readFileSync(path.join(F, name))), S = 256, o = new Float32Array(S * S), k = img.w / S;
    let sum = 0;
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      let a = 0; for (let j = 0; j < k; j += 2) for (let i = 0; i < k; i += 2) { const p = ((y * k + j) * img.w + x * k + i) * 4; a += TX.lum(img.d[p], img.d[p + 1], img.d[p + 2]); }
      o[y * S + x] = a; sum += a;
    }
    const mean = sum / (S * S);
    for (let i = 0; i < S * S; i++) o[i] /= mean;
    return (texL[name] = { S, o });
  };
  const toneAt = (tx, u, v) => { const S = tx.S; let a = 0; for (const [du, dv] of [[0, 0], [2, 0], [0, 2], [-2, 0], [0, -2]]) { const x = clamp(Math.floor(u * S) + du, 0, S - 1), y = clamp(Math.floor(v * S) + dv, 0, S - 1); a += tx.o[y * S + x]; } return clamp(a / 5, 0.7, 1.15); };
  // fonte → referencial final (com ajuste de outra cabeça)
  const place = (file) => {
    const M = loadHairMesh(path.join(F, 'hair', file + '.gltf')), srcG = /Female|Long|Buns/.test(file) ? 'f' : 'm';
    const skS = skullOf(F, srcG), sc = [skT.size[0] / skS.size[0], skT.size[1] / skS.size[1], skT.size[2] / skS.size[2]];
    const n = M.P.length / 3, P = new Float64Array(n * 3), tx = lumTex(M.tex), tone = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      let p = [M.P[i * 3], M.P[i * 3 + 1], M.P[i * 3 + 2]];
      if (srcG !== g) p = [skT.c[0] + (p[0] - skS.c[0]) * sc[0], skT.c[1] + (p[1] - skS.c[1]) * sc[1], skT.c[2] + (p[2] - skS.c[2]) * sc[2]];
      P.set(FR.apply(p), i * 3);
      tone[i] = toneAt(tx, M.UV[i * 2], M.UV[i * 2 + 1]);
    }
    // v5: tom liso pela malha soldada e com pouco contraste — amostrado por vértice ele virava listras claras/cinza
    // (cartões vizinhos caindo em fios claros e escuros da textura)
    {
      const wd = weld(P, n, 1e-5), wi = Uint32Array.from(M.idx, i => wd.wid[i]), adj = neighbors(wi, wd.nw), tw = new Float64Array(wd.nw), cnt = new Float64Array(wd.nw);
      for (let i = 0; i < n; i++) { tw[wd.wid[i]] += tone[i]; cnt[wd.wid[i]]++; }
      for (let w = 0; w < wd.nw; w++) tw[w] /= cnt[w] || 1;
      smoothField(tw, 1, adj, 8, 0.5);
      for (let i = 0; i < n; i++) tone[i] = clamp(1 + 0.5 * (tw[wd.wid[i]] - 1), 0.86, 1.06);
    }
    return { P, UV: M.UV, idx: M.idx, n, tone };
  };
  // centro do crânio no referencial final
  const Hc = FR.apply(skT.c), Lm = C.Lm, body = C.body;
  const headBVH = C.bodyBVH;
  let eyeY = 0; for (let i = 0; i < C.eyes.P.length / 3; i++) eyeY += C.eyes.P[i * 3 + 1] / (C.eyes.P.length / 3);
  // centro do crânio como na âncora skull.center (caixa da pele da cabeça acima dos olhos − 3 cm)
  const Sc = (() => { const mn = [9, 9, 9], mx = [-9, -9, -9]; for (let v = 0; v < body.n; v++) if (body.headW[v] > 0.5 && body.P[v * 3 + 1] > eyeY - 0.03) for (let k = 0; k < 3; k++) { mn[k] = Math.min(mn[k], body.P[v * 3 + k]); mx[k] = Math.max(mx[k], body.P[v * 3 + k]); } return [(mn[0] + mx[0]) / 2, (mn[1] + mx[1]) / 2, (mn[2] + mx[2]) / 2]; })();
  const out = {}, bones = {};
  const scalpHit = (cap, d) => { const b = new BVH(cap.P, cap.idx), dn = G.norm(d), h = b.ray(Hc[0], Hc[1], Hc[2], dn[0], dn[1], dn[2], 0.4); if (!h) return null; return G.add(Hc, G.scl(dn, h.t)); };

  // ---- estilos
  const styles = {};
  // curto
  // v7: o curto masculino tinha a coroa serrilhada (pontas dos cartões no contorno de trás): Taubin leve na malha
  // soldada, borda presa
  if (g === 'm') {
    const M0 = place('Hair_SimpleParted'), wd = weld(M0.P, M0.n, 1e-5), wi = Uint32Array.from(M0.idx, i => wd.wid[i]), adj = neighbors(wi, wd.nw);
    const pw = new Float64Array(wd.nw * 3), mob = new Float64Array(wd.nw).fill(1);
    for (let i = 0; i < M0.n; i++) pw.set(M0.P.subarray(i * 3, i * 3 + 3), wd.wid[i] * 3);
    for (const l of boundaryLoops(wi)) for (const v of l) mob[v] = 0;
    // só a metade de cima/trás (coroa): a franja e a risca ficam como estão
    for (let w = 0; w < wd.nw; w++) if (pw[w * 3 + 1] < Hc[1] + 0.02 || pw[w * 3 + 2] < Hc[2] - 0.02) mob[w] *= 0.25;
    taubin(pw, adj, mob, 6);
    for (let i = 0; i < M0.n; i++) M0.P.set(pw.subarray(wd.wid[i] * 3, wd.wid[i] * 3 + 3), i * 3);
    styles.curto = M0;
  }
  else {
    const L = place('Hair_Long');
    const cutY = Hc[1] - 0.085;
    // v6: pontas levemente desfiadas (mechas de 3–8 mm, irregulares) — os dentes de 1–2,4 cm viravam serrote
    const tri = u => { const f = u - Math.floor(u); return 1 - Math.abs(2 * f - 1); };
    styles.curto = cutKeep(L, (x, y, z, i) => { const th = Math.atan2(x - Hc[0], z - Hc[2]), u = th / (2 * Math.PI) * 38, k = Math.floor(u + 19); return cutY + (z < Hc[2] - 0.03 ? 0.015 : 0) - 0.006 + (0.003 + 0.005 * hash01(k)) * Math.pow(tri(u), 1.6) + 0.003 * noise3(x * 45, 0, z * 45, 11) - y; });
  }
  // raspado
  styles.raspado = smoothHairline(place(g === 'm' ? 'Hair_Buzzed' : 'Hair_BuzzedFemale'), 12);
  styles.raspado.offset = 0.0015;
  // cacheado (procedural sobre a touca raspada)
  styles.cacheado = curly(place(g === 'm' ? 'Hair_Buzzed' : 'Hair_BuzzedFemale'), Hc, g, C);
  // rabo e coque: touca dos coques sem os coques
  const buns = place('Hair_Buns');
  const comp = posComps(buns);
  const cent = new Map();
  for (let t = 0; t < buns.idx.length / 3; t++) {
    const c = comp.comp[t], a = buns.idx[t * 3] * 3;
    if (!cent.has(c)) cent.set(c, [0, 0, 0, 0]);
    const e = cent.get(c); e[0] += buns.P[a]; e[1] += buns.P[a + 1]; e[2] += buns.P[a + 2]; e[3]++;
  }
  const isBun = new Set();
  for (const [c, e] of cent) { const x = e[0] / e[3], z = e[2] / e[3]; if (Math.abs(x) > 0.07 && z > Hc[2] + 0.02) isBun.add(c); }
  const cap = subsetTris(buns, t => !isBun.has(comp.comp[t]));
  // um coque (o do lado esquerdo) para o "coque"
  let bunC = -1; for (const c of isBun) { const e = cent.get(c); if (bunC < 0 || e[0] / e[3] < 0) bunC = c; }
  const bun = subsetTris(buns, t => comp.comp[t] === bunC);
  // rabo de cavalo
  const ponyRoot = (() => { const p = scalpHit(cap, [0, 0.45, 1]); return G.add(p, G.scl(G.norm(G.sub(p, Hc)), 0.012)); })();
  bones.pony = ponyRoot; bones.pony2 = G.add(ponyRoot, [0, -0.12, 0.035]);
  const pt = ponytail(ponyRoot, 5);
  const tubeW = new Float32Array(pt.tube.n * NB), tubeTone = new Float64Array(pt.tube.n);
  pt.tube.T.forEach((t, i) => {
    // mistura longa (cabeça → pony → pony2) para o rabo dobrar em curva, não em quina
    const wh = 1 - smoothstep(0.0, 0.2, t), wp2 = smoothstep(0.15, 0.85, t), wp = Math.max(0, 1 - wh - wp2);
    const s = wh + wp + wp2; tubeW[i * NB + BI.head] = wh / s; tubeW[i * NB + BI.pony] = wp / s; tubeW[i * NB + BI.pony2] = wp2 / s;
    tubeTone[i] = (pt.tube.tone ? pt.tube.tone[i] : 1) * (0.86 + 0.14 * smoothstep(0, 0.2, t));
  });
  const tieW = new Float32Array(pt.tie.n * NB); for (let i = 0; i < pt.tie.n; i++) tieW[i * NB + BI.head] = 1;
  styles.rabo = { parts: [cap, { ...pt.tube, W: tubeW, tone: tubeTone, noClear: true, keep0: true }, { ...pt.tie, W: tieW, tone: new Float64Array(pt.tie.n).fill(1), slot: new Uint8Array(pt.tie.n).fill(SL.hairTie), noClear: true, keep0: true }] };
  // coque: um coque girado para cima/trás
  {
    const d = G.norm([0, 0.55, 1]), sp = scalpHit(cap, d);
    let bc = [0, 0, 0]; for (let i = 0; i < bun.n; i++) for (let k = 0; k < 3; k++) bc[k] += bun.P[i * 3 + k] / bun.n;
    const q = G.rotBetween(G.sub(bc, Hc), d), R = G.compose([0, 0, 0], q), tgt = G.add(sp, G.scl(d, 0.035));
    const P = new Float64Array(bun.n * 3);
    for (let i = 0; i < bun.n; i++) { const p = G.td(R, G.scl(G.sub([bun.P[i * 3], bun.P[i * 3 + 1], bun.P[i * 3 + 2]], bc), 1.15)); P.set(G.add(tgt, p), i * 3); }
    // v7: elástico na base do coque (toro justo em volta do coque)
    // (na junção: os vértices do coque a até 6 mm da touca formam o anel onde ele sai da cabeça — centro e raio médio
    // desse anel; o elástico fica 3 mm acima, justo)
    const capB = new BVH(cap.P, cap.idx), jn = [];
    for (let i = 0; i < bun.n; i++) { const p = [P[i * 3], P[i * 3 + 1], P[i * 3 + 2]], h = capB.closest(p[0], p[1], p[2], 0.02); if (h.tri >= 0 && h.d < 0.006) jn.push(p); }
    let cB = G.add(sp, G.scl(d, 0.006)), rB = 0.02;
    if (jn.length >= 8) { cB = jn.reduce((a, p) => G.add(a, G.scl(p, 1 / jn.length)), [0, 0, 0]); rB = jn.reduce((a, p) => { const v = G.sub(p, cB); return a + G.len(G.sub(v, G.scl(d, G.dot(v, d)))) / jn.length; }, 0); }
    const sideB = G.norm(G.cross(d, [0, 1, 0])), upB = G.cross(sideB, d);
    const tieB = scrunchie(G.add(cB, G.scl(d, 0.004)), d, sideB, upB, clamp(rB * 1.0, 0.014, 0.05), 0.009);
    const tieBW = new Float32Array(tieB.n * NB); for (let i = 0; i < tieB.n; i++) tieBW[i * NB + BI.head] = 1;
    C.rep.coqueElastico = { raioJuncao: +rB.toFixed(4), pontos: jn.length };
    styles.coque = { parts: [cap, { ...bun, P, noClear: true }, { ...tieB, W: tieBW, tone: new Float64Array(tieB.n).fill(1), slot: new Uint8Array(tieB.n).fill(SL.hairTie), noClear: true, keep0: true }] };
  }
  // longo: alongado atrás + molas
  {
    const L = place('Hair_Long');
    const yEar = C.JP.Head[1];
    let ymin = 1e9; for (let i = 0; i < L.n; i++) if (L.P[i * 3 + 2] > Hc[2] + 0.02) ymin = Math.min(ymin, L.P[i * 3 + 1]);
    const want = Lm.N[1] - 0.07, kmax = Math.max(1, (yEar - want) / Math.max(1e-3, yEar - ymin));
    for (let i = 0; i < L.n; i++) {
      const y = L.P[i * 3 + 1]; if (y >= yEar) continue;
      const b = smoothstep(-0.02, 0.04, L.P[i * 3 + 2] - Hc[2]), k = 1 + (kmax - 1) * b;
      L.P[i * 3 + 1] = yEar + (y - yEar) * k;
    }
    // v5: mechas — abaixo da orelha os fios se juntam em feixes (o ângulo em volta do eixo vertical da cabeça é puxado
    // para o centro do feixe, mais forte nas pontas), pontas em comprimentos diferentes e a fresta entre feixes mais escura
    {
      let yb = 1e9; for (let i = 0; i < L.n; i++) if (L.P[i * 3 + 2] > Hc[2] - 0.02) yb = Math.min(yb, L.P[i * 3 + 1]);
      const nCl = 24, w = 2 * Math.PI / nCl, hk = k => { const x = Math.sin(k * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
      for (let i = 0; i < L.n; i++) {
        const x = L.P[i * 3], y = L.P[i * 3 + 1], z = L.P[i * 3 + 2];
        if (y >= yEar) continue;
        const tip = smoothstep(yEar - 0.03, yb, y), th = Math.atan2(x - Hc[0], z - Hc[2]), k = Math.round(th / w), thc = (k + 0.3 * (hk(k) - 0.5)) * w;
        const dth = th - thc, th2 = thc + dth * (1 - 0.62 * tip), r = Math.hypot(x - Hc[0], z - Hc[2]);
        L.P[i * 3] = Hc[0] + r * Math.sin(th2); L.P[i * 3 + 2] = Hc[2] + r * Math.cos(th2);
        // pontas: o meio da mecha mais comprido que as bordas (ponta em V) e comprimentos bem desencontrados
        L.P[i * 3 + 1] = y + (0.028 * hk(k + 7) + 0.012 * Math.min(1, Math.pow(dth / (w / 2), 2))) * tip * tip;
        L.tone[i] *= 1 - 0.22 * Math.min(1, Math.pow(dth / (w / 2), 2)) * tip;
      }
    }
    L.springs = true;
    styles.longo = L;
    C.rep.cabeloLongoK = +kmax.toFixed(3);
  }
  // ossos de mola do longo
  {
    const p = scalpHit(styles.longo, [0, -0.15, 1]) || G.add(Hc, [0, -0.02, 0.1]);
    bones.hairA = G.add(p, G.scl(G.norm(G.sub(p, Hc)), 0.01)); bones.hairA2 = G.add(bones.hairA, [0, -0.13, 0.02]);
  }

  // ---- processamento comum
  const result = {}, covers = {};
  for (const st of HAIRS) {
    const S = styles[st];
    const parts = S.parts || [S];
    const proc = parts.map(pp => finishPiece(C, pp, Hc, S.offset || 0));
    const M = merge(proc);
    // triângulos que o LOD0 não simplifica (rabo de cavalo e elástico: geometria já enxuta e redonda)
    const keepT = new Uint8Array(M.idx.length / 3); { let o = 0; for (const pp of proc) { const nt = pp.idx.length / 3; if (pp.keep0) keepT.fill(1, o, o + nt); o += nt; } }
    // pesos de mola do longo
    if (st === 'longo') {
      const A = bones.hairA;
      for (let i = 0; i < M.n; i++) {
        const y = M.P[i * 3 + 1], b = smoothstep(-0.02, 0.04, M.P[i * 3 + 2] - Hc[2]);
        const h = clamp((A[1] + 0.03 - y) / 0.30, 0, 1), ws = smoothstep(0, 0.35, h) * (0.35 + 0.65 * b), share = smoothstep(0.40, 0.85, h);
        M.W.fill(0, i * NB, i * NB + NB);
        M.W[i * NB + BI.head] = 1 - ws; M.W[i * NB + BI.hairA] = ws * (1 - share); M.W[i * NB + BI.hairA2] = ws * share;
      }
    }
    // raspado: a linha do cabelo esmaece na pele (vértices da borda com a cor da pele, a cor interpola no triângulo)
    if (st === 'raspado') {
      const wd = weld(M.P, M.n, 1e-5), wi = Uint32Array.from(M.idx, i => wd.wid[i]), bord = new Uint8Array(wd.nw);
      for (const l of boundaryLoops(wi)) for (const v of l) bord[v] = 1;
      for (let i = 0; i < M.n; i++) if (bord[wd.wid[i]]) M.slot[i] = SL.skin;
    }
    // faces de trás perto das bordas abertas (3 cm pelo grafo)
    const withBack = addBackfaces(M, 0.03);
    // normais, oclusão
    const Nn = vertexNormals(withBack.P, withBack.idx, withBack.n);
    // a face de trás leva a normal oposta
    for (let i = 0; i < withBack.n; i++) if (withBack.back[i]) for (let k = 0; k < 3; k++) Nn[i * 3 + k] = -withBack.N0[i * 3 + k];
    // v7: normais estilizadas nas toucas (peças da Quaternius): normal lisa por posição (sem as quinas entre os cartões)
    // misturada 55 % com a direção radial a partir do eixo da cabeça (esfera em cima, cilindro abaixo do centro) — a
    // coroa deixa de ser uma estrela de facetas; faces viradas para dentro ficam só com a normal lisa
    if (st === 'curto' || st === 'rabo' || st === 'coque' || st === 'longo') {
      const capV = new Uint8Array(M.n); { let o = 0; for (let k = 0; k < proc.length; k++) { if (!parts[k].noClear) capV.fill(1, o, o + proc[k].n); o += proc[k].n; } }
      const Pp = withBack.P, wd = weld(Pp, withBack.n, 1e-5), acc = new Float64Array(wd.nw * 3);
      for (let t = 0; t < M.idx.length; t += 3) {
        const a = M.idx[t], b = M.idx[t + 1], c = M.idx[t + 2]; if (!capV[a]) continue;
        const pa = [Pp[a * 3], Pp[a * 3 + 1], Pp[a * 3 + 2]], fn = G.cross(G.sub([Pp[b * 3], Pp[b * 3 + 1], Pp[b * 3 + 2]], pa), G.sub([Pp[c * 3], Pp[c * 3 + 1], Pp[c * 3 + 2]], pa));
        for (const v of [a, b, c]) for (let k = 0; k < 3; k++) acc[wd.wid[v] * 3 + k] += fn[k];
      }
      for (let i = 0; i < M.n; i++) {
        if (!capV[i]) continue;
        const w = wd.wid[i], nw = G.norm([acc[w * 3], acc[w * 3 + 1], acc[w * 3 + 2]]), p = [Pp[i * 3], Pp[i * 3 + 1], Pp[i * 3 + 2]];
        const r = G.norm(G.sub(p, [Hc[0], clamp(p[1], Hc[1] - 0.3, Hc[1]), Hc[2]])), mix = G.dot(nw, r) > 0 ? 0.55 : 0;
        const nn = G.norm(G.add(G.scl(nw, 1 - mix), G.scl(r, mix)));
        for (let k = 0; k < 3; k++) Nn[i * 3 + k] = nn[k];
      }
      withBack.src.forEach((s0, j) => { if (capV[s0]) for (let k = 0; k < 3; k++) Nn[(M.n + j) * 3 + k] = -Nn[s0 * 3 + k]; });
    }
    const ownB = new BVH(withBack.P, withBack.idx);
    const ao = rayAO([ownB, headBVH], withBack.P, Nn, withBack.n, { rays, maxD: 0.12, k: 0.55, offset: 0.0015 });
    // camadas de dentro (outra mecha por cima, olhando do centro da cabeça para fora) e faces de baixo/de trás
    // ficam mais escuras: sem isso pegam o céu e o brilho e parecem mechas descoloridas
    for (let i = 0; i < withBack.n; i++) {
      const p = [withBack.P[i * 3], withBack.P[i * 3 + 1], withBack.P[i * 3 + 2]], d = G.norm(G.sub(p, Hc));
      let over = 0;
      const h = ownB.ray(p[0] + d[0] * 0.002, p[1] + d[1] * 0.002, p[2] + d[2] * 0.002, d[0], d[1], d[2], 0.05);
      if (h) over = 1 - 0.5 * h.t / 0.05;
      const facing = Nn[i * 3] * d[0] + Nn[i * 3 + 1] * d[1] + Nn[i * 3 + 2] * d[2];   // < 0: virada para a cabeça
      ao[i] *= (1 - 0.35 * over) * (facing < 0 ? 0.7 + 0.3 * (1 + facing) : 1) * (Nn[i * 3 + 1] < -0.3 ? 0.85 : 1);
    }
    // oclusão alisada dentro de cada cartão (as cunhas claras/escuras da coroa somem)
    { const a64 = Float64Array.from(ao); smoothField(a64, 1, neighbors(withBack.idx, withBack.n), 2, 0.5); for (let i = 0; i < ao.length; i++) ao[i] = a64[i]; }
    // LODs
    const P32 = Float32Array.from(withBack.P);
    const simp = (src, target, err, flags) => src.length / 3 <= target ? Uint32Array.from(src) : Sm.simplify(Uint32Array.from(src), P32, 3, target * 3, err, flags)[0];
    // v7: rabo/coque com o elástico novo (toro) e o feixe mais cheio — orçamento maior para a touca não ser dizimada
    // até abrir uma fresta na linha do cabelo (a pele do couro aparecia como uma faixa clara acima da franja)
    const T0 = st === 'cacheado' ? 3800 : st === 'rabo' ? 4000 : st === 'coque' ? 3300 : 3000;
    const keptI = [], restI = [];
    for (let t = 0; t < withBack.idx.length / 3; t++) (t < keepT.length && keepT[t] ? keptI : restI).push(withBack.idx[t * 3], withBack.idx[t * 3 + 1], withBack.idx[t * 3 + 2]);
    const T0r = Math.max(800, T0 - keptI.length / 3);
    // v7: toucas de cartões sem o modo "Permissive" (ele colapsava vértices de borda e abria frestas na touca)
    const passes = st === 'cacheado' || st === 'raspado' ? [[0.004, []], [0.012, []], [0.004, ['Permissive']], [0.008, ['Permissive']], [0.02, ['Permissive']]] : [[0.004, []], [0.008, []], [0.012, []], [0.02, []]];
    let L0 = null; for (const [e, f] of passes) { L0 = simp(restI, T0r, e, f); if (L0.length / 3 <= T0r * 1.02) break; }
    C.rep['cabelo_' + st + '_touca'] = { alvo: T0r, obtido: L0.length / 3 };
    if (keptI.length) L0 = Uint32Array.from([...L0, ...keptI]);
    // LOD1/LOD2: só as faces da frente; mechas soltas viram um volume por agrupamento (sloppy), que não abre
    // "carecas" como a simplificação por arestas faz com mechas finas e separadas
    const front = []; for (let t = 0; t < L0.length; t += 3) if (!withBack.back[L0[t]]) front.push(L0[t], L0[t + 1], L0[t + 2]);
    const sloppy = (src, target) => src.length / 3 <= target ? Uint32Array.from(src) : Sm.simplifySloppy(Uint32Array.from(src), P32, 3, null, target * 3, 1)[0];
    const mode = process.env.EP_HAIR_LOD || 'sloppy';
    let L1, L2raw;
    if (mode === 'sloppy') { L1 = sloppy(front, 900); L2raw = sloppy(front, 380); }
    else { L1 = simp(L0, 900, 0.03, []); if (L1.length / 3 > 1000) L1 = simp(L0, 900, 0.05, ['Permissive']); L2raw = simp(L1, 380, 0.025, []); if (L2raw.length / 3 > 440) L2raw = simp(L1, 380, 0.05, ['Permissive']); }
    // LOD1/LOD2: as cordas dos triângulos grandes afundam no crânio; cópias infladas dos vértices (ver inflateLod)
    let H0 = { ...withBack, N: Nn, ao };
    const i1 = inflateLod(H0, L0, L1, Hc), H1 = i1.H;
    const i2 = inflateLod(H1, L0, L2raw, Hc);
    H0 = i2.H;
    const L1i = i1.idx, L2 = i2.idx;
    result[st] = { ...H0, lods: [L0, L1i, L2] };
    C.rep['cabelo_' + st + '_inflado'] = [+i1.max.toFixed(4), +i2.max.toFixed(4)];
    // pele coberta, por LOD: só sai a pele que o cabelo daquele LOD tapa de todas as direções (raio pela normal e
    // inclinado ±45° nos dois eixos tangentes, todos acertando o cabelo perto). Estilos com franja/risca nunca
    // tiram a testa e as têmporas. LOD1 (e LOD2, que usa as células do LOD1) confere contra o cabelo LOD1 E LOD2.
    const fringe = st === 'curto' || st === 'rabo' || st === 'coque' || st === 'longo';
    const bvhL = [L0, L1i, L2].map(L => new BVH(H0.P, L));
    const coverBy = bl => {
      const cov = new Uint8Array(body.weld.nw);
      for (let w = 0; w < body.weld.nw; w++) {
        const o = w * 3, v = body.weld.rep[w];
        if (body.headW[v] + body.neckW[v] < 0.5) continue;
        const px = body.PW[o], py = body.PW[o + 1], pz = body.PW[o + 2];
        if (fringe && pz < Hc[2] - 0.015 && py > eyeY - 0.03) continue;   // testa e têmporas (frente = −z)
        const nx = body.NW[o], ny = body.NW[o + 1], nz = body.NW[o + 2];
        const [tu, tv] = basis(nx, ny, nz);
        let ok = true;
        for (const [a, b] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) {
          let dx = nx + a * tu[0] + b * tv[0], dy = ny + a * tu[1] + b * tv[1], dz = nz + a * tu[2] + b * tv[2];
          const l = Math.hypot(dx, dy, dz); dx /= l; dy /= l; dz /= l;
          const maxD = a || b ? 0.06 : 0.04;
          for (const bh of bl) if (!bh.ray(px + nx * 0.001, py + ny * 0.001, pz + nz * 0.001, dx, dy, dz, maxD)) { ok = false; break; }
          if (!ok) break;
        }
        if (ok) cov[w] = 1;
      }
      // erode um anel: a borda do recorte fica sempre embaixo do cabelo (o interior dos triângulos também)
      const adj = body.adjW, out = Uint8Array.from(cov);
      for (let w = 0; w < cov.length; w++) if (cov[w]) for (let q = adj.off[w]; q < adj.off[w + 1]; q++) if (!cov[adj.nb[q]]) { out[w] = 0; break; }
      return out;
    };
    // além disso, visto do centro do crânio: o raio que passa pelo ponto da pele tem que acertar o cabelo depois dele
    const rayBy = bl => (p) => {
      for (const O of [Hc, Sc]) {
        const d = G.sub(p, O), r = G.len(d), dn = G.scl(d, 1 / r);
        for (const bh of bl) { const h = bh.ray(O[0], O[1], O[2], dn[0], dn[1], dn[2], r + 0.08); if (!h || h.t < r - 0.004) return false; }
      }
      return true;
    };
    covers[st] = [coverBy([bvhL[0]]), coverBy([bvhL[1], bvhL[2]]), rayBy([bvhL[0]]), rayBy([bvhL[1], bvhL[2]])];
    C.rep['cabelo_' + st] = { v: H0.n, tris: [L0.length / 3, L1i.length / 3, L2.length / 3] };
  }
  return { hairs: result, covers, bones, Hc };
}

// LOD simplificado do cabelo: para cada triângulo, amostras (cantos, meios das arestas, centro) olham na direção do
// centro do crânio para fora; se o cabelo LOD0 mais de dentro está acima da amostra (até 3 cm), os vértices do
// triângulo ganham uma cópia empurrada para fora (radial) até ficar 1 mm por cima. Máx. 15 mm.
function inflateLod(H, L0, L, Hc) {
  const b0 = new BVH(H.P, L0), need = new Float64Array(H.n), P = H.P;
  const pt = i => [P[i * 3], P[i * 3 + 1], P[i * 3 + 2]];
  for (let t = 0; t < L.length; t += 3) {
    const a = pt(L[t]), b = pt(L[t + 1]), c = pt(L[t + 2]);
    const samples = [a, b, c, G.lerp3(a, b, 0.5), G.lerp3(b, c, 0.5), G.lerp3(c, a, 0.5), [(a[0] + b[0] + c[0]) / 3, (a[1] + b[1] + c[1]) / 3, (a[2] + b[2] + c[2]) / 3]];
    let m = 0;
    for (const s of samples) {
      const d = G.sub(s, Hc), r = G.len(d), dn = G.scl(d, 1 / r), h = b0.ray(Hc[0], Hc[1], Hc[2], dn[0], dn[1], dn[2], r + 0.03);
      if (h && h.t > r - 0.03) m = Math.max(m, h.t - r + 0.001);
    }
    m = Math.min(m, 0.015);
    for (let e = 0; e < 3; e++) need[L[t + e]] = Math.max(need[L[t + e]], m);
  }
  // vértices na mesma posição (costuras, faces de trás) levam o mesmo empurrão: sem rachaduras
  const wd = weld(P, H.n, 1e-5), wn = new Float64Array(wd.nw);
  for (let i = 0; i < H.n; i++) wn[wd.wid[i]] = Math.max(wn[wd.wid[i]], need[i]);
  for (let i = 0; i < H.n; i++) need[i] = wn[wd.wid[i]];
  const map = new Map(), add = [];
  let max = 0;
  for (const i of L) if (need[i] > 0 && !map.has(i)) { map.set(i, H.n + add.length); add.push(i); max = Math.max(max, need[i]); }
  const n = H.n + add.length, out = { ...H, n };
  const grow = (A, d) => { if (!A) return A; const o = new A.constructor(n * d); o.set(A); add.forEach((s, j) => { for (let k = 0; k < d; k++) o[(H.n + j) * d + k] = A[s * d + k]; }); return o; };
  out.P = grow(H.P, 3); out.N = grow(H.N, 3); out.UV = grow(H.UV, 2); out.tone = grow(H.tone, 1); out.W = grow(H.W, NB); out.slot = grow(H.slot, 1); out.back = grow(H.back, 1); out.ao = grow(H.ao, 1); out.N0 = grow(H.N0, 3);
  add.forEach((s, j) => { const d = G.norm(G.sub(pt(s), Hc)); for (let k = 0; k < 3; k++) out.P[(H.n + j) * 3 + k] += d[k] * need[s]; });
  return { H: out, idx: Uint32Array.from(L, i => map.has(i) ? map.get(i) : i), max };
}

// alisa a linha do cabelo (laços de borda): laplaciano 1D ao longo do laço, puxando junto o primeiro anel de dentro
export function smoothHairline(M, iters) {
  const wd = weld(M.P, M.n, 1e-5), wi = Uint32Array.from(M.idx, i => wd.wid[i]), pw = new Float64Array(wd.nw * 3);
  for (let i = 0; i < M.n; i++) pw.set(M.P.subarray(i * 3, i * 3 + 3), wd.wid[i] * 3);
  const orig = Float64Array.from(pw), loops = boundaryLoops(wi), onB = new Uint8Array(wd.nw);
  for (const l of loops) for (const v of l) onB[v] = 1;
  for (const l of loops) {
    const m = l.length; if (m < 6) continue;
    for (let it = 0; it < iters; it++) {
      const tmp = l.map((v, j) => { const a = l[(j - 1 + m) % m], b = l[(j + 1) % m]; return [0, 1, 2].map(k => pw[v * 3 + k] + 0.5 * ((pw[a * 3 + k] + pw[b * 3 + k]) / 2 - pw[v * 3 + k])); });
      l.forEach((v, j) => { for (let k = 0; k < 3; k++) pw[v * 3 + k] = tmp[j][k]; });
    }
  }
  // o primeiro anel de dentro acompanha metade do deslocamento do vizinho de borda (sem triângulo esticado)
  const adj = neighbors(wi, wd.nw), mv = new Float64Array(wd.nw * 3), cnt = new Float64Array(wd.nw);
  for (let v = 0; v < wd.nw; v++) if (onB[v]) for (let q = adj.off[v]; q < adj.off[v + 1]; q++) { const u = adj.nb[q]; if (onB[u]) continue; for (let k = 0; k < 3; k++) mv[u * 3 + k] += pw[v * 3 + k] - orig[v * 3 + k]; cnt[u]++; }
  for (let u = 0; u < wd.nw; u++) if (cnt[u]) for (let k = 0; k < 3; k++) pw[u * 3 + k] += 0.5 * mv[u * 3 + k] / cnt[u];
  const P = new Float64Array(M.n * 3);
  for (let i = 0; i < M.n; i++) P.set(pw.subarray(wd.wid[i] * 3, wd.wid[i] * 3 + 3), i * 3);
  return { ...M, P };
}

// afasta do couro cabeludo (2 mm) e do pescoço/ombros (8 mm), suaviza o empurrão
function finishPiece(C, M, Hc, extraOff) {
  const b = C.body, n = M.n, P = Float64Array.from(M.P), push = new Float64Array(n * 3);
  const wd = weld(P, n, 1e-5), wi = Uint32Array.from(M.idx, i => wd.wid[i]);
  if (!M.noClear) {
    for (let i = 0; i < n; i++) {
      const h = C.bodyBVH.closest(P[i * 3], P[i * 3 + 1], P[i * 3 + 2], 0.06);
      if (h.tri < 0) continue;
      const W = b.widx, a = W[h.tri * 3], bb = W[h.tri * 3 + 1], c = W[h.tri * 3 + 2], NW = b.NW;
      const nn = G.norm([NW[a * 3] * h.u + NW[bb * 3] * h.v + NW[c * 3] * h.w, NW[a * 3 + 1] * h.u + NW[bb * 3 + 1] * h.v + NW[c * 3 + 1] * h.w, NW[a * 3 + 2] * h.u + NW[bb * 3 + 2] * h.v + NW[c * 3 + 2] * h.w]);
      const sd = (P[i * 3] - h.x) * nn[0] + (P[i * 3 + 1] - h.y) * nn[1] + (P[i * 3 + 2] - h.z) * nn[2];
      const head = b.headW[b.weld.rep[a]] > 0.5;
      const need = (head ? 0.002 : 0.008) + extraOff;
      if (sd < need) for (let k = 0; k < 3; k++) push[i * 3 + k] = nn[k] * (need - sd);
    }
    // suaviza pela malha soldada
    const pw = new Float64Array(wd.nw * 3), cnt = new Float64Array(wd.nw);
    for (let i = 0; i < n; i++) { for (let k = 0; k < 3; k++) pw[wd.wid[i] * 3 + k] += push[i * 3 + k]; cnt[wd.wid[i]]++; }
    for (let w = 0; w < wd.nw; w++) for (let k = 0; k < 3; k++) pw[w * 3 + k] /= cnt[w] || 1;
    const adj = neighbors(wi, wd.nw);
    const keepMax = Float64Array.from(pw);
    smoothField(pw, 3, adj, 3, 0.5);
    for (let w = 0; w < wd.nw; w++) { const a = Math.hypot(keepMax[w * 3], keepMax[w * 3 + 1], keepMax[w * 3 + 2]), s = Math.hypot(pw[w * 3], pw[w * 3 + 1], pw[w * 3 + 2]); if (s < a && s > 1e-9) for (let k = 0; k < 3; k++) pw[w * 3 + k] *= a / s; }
    for (let i = 0; i < n; i++) for (let k = 0; k < 3; k++) P[i * 3 + k] += pw[wd.wid[i] * 3 + k];
  }
  return { ...M, P };
}

// cópia de trás (normais invertidas) dos triângulos a até `reach` (pelo grafo) de uma borda aberta
function addBackfaces(M, reach) {
  const n = M.n, wd = weld(M.P, n, 1e-5), wi = Uint32Array.from(M.idx, i => wd.wid[i]);
  const loops = boundaryLoops(wi);
  const dist = new Float64Array(wd.nw).fill(1e9), adj = neighbors(wi, wd.nw), q = [];
  for (const l of loops) for (const v of l) { dist[v] = 0; q.push(v); }
  // Dijkstra simples (fila ordenada por inserção basta para distâncias curtas)
  const P = M.P, pw = new Float64Array(wd.nw * 3);
  for (let i = 0; i < n; i++) pw.set(P.subarray(i * 3, i * 3 + 3), wd.wid[i] * 3);
  for (let it = 0; it < q.length; it++) {
    const v = q[it];
    for (let k = adj.off[v]; k < adj.off[v + 1]; k++) {
      const u = adj.nb[k], d = dist[v] + Math.hypot(pw[u * 3] - pw[v * 3], pw[u * 3 + 1] - pw[v * 3 + 1], pw[u * 3 + 2] - pw[v * 3 + 2]);
      if (d < dist[u] && d < reach) { dist[u] = d; q.push(u); }
    }
  }
  const N0 = vertexNormals(P, M.idx, n);
  const extra = new Map(), idx = Array.from(M.idx), newP = [], src = [];
  const dupOf = i => { if (!extra.has(i)) { extra.set(i, n + src.length); src.push(i); } return extra.get(i); };
  for (let t = 0; t < M.idx.length; t += 3) {
    const a = M.idx[t], b = M.idx[t + 1], c = M.idx[t + 2];
    if (Math.min(dist[wd.wid[a]], dist[wd.wid[b]], dist[wd.wid[c]]) >= reach) continue;
    idx.push(dupOf(a), dupOf(c), dupOf(b));
  }
  const nn = n + src.length;
  const out = { n: nn, P: new Float64Array(nn * 3), UV: new Float64Array(nn * 2), tone: new Float64Array(nn), W: new Float32Array(nn * NB), slot: new Uint8Array(nn), back: new Uint8Array(nn), N0: new Float64Array(nn * 3), idx: Uint32Array.from(idx) };
  const copy = (d, s) => {
    for (let k = 0; k < 3; k++) { out.P[d * 3 + k] = M.P[s * 3 + k]; out.N0[d * 3 + k] = N0[s * 3 + k]; }
    out.UV[d * 2] = M.UV[s * 2]; out.UV[d * 2 + 1] = M.UV[s * 2 + 1]; out.tone[d] = M.tone[s]; out.slot[d] = M.slot[s];
    for (let k = 0; k < NB; k++) out.W[d * NB + k] = M.W[s * NB + k];
  };
  for (let i = 0; i < n; i++) copy(i, i);
  src.forEach((s, j) => { copy(n + j, s); out.back[n + j] = 1; out.tone[n + j] *= 0.7; });
  out.src = Int32Array.from(src);
  return out;
}

// cacheado: touca subdividida e "inflada" com cachos (Worley) e um pouco de ruído
function curly(cap0, Hc, g, C) {
  // subdivide 2× (1→16): cachos de ~2,5 cm precisam de vértices suficientes
  const sub = c => {
    const P = Array.from(c.P), UV = Array.from(c.UV), tone = Array.from(c.tone), idx = [], mid = new Map();
    const m = (a, b) => { const k = a < b ? a + '_' + b : b + '_' + a; if (!mid.has(k)) { const i = P.length / 3; for (let q = 0; q < 3; q++) P.push((P[a * 3 + q] + P[b * 3 + q]) / 2); UV.push((UV[a * 2] + UV[b * 2]) / 2, (UV[a * 2 + 1] + UV[b * 2 + 1]) / 2); tone.push((tone[a] + tone[b]) / 2); mid.set(k, i); } return mid.get(k); };
    for (let t = 0; t < c.idx.length; t += 3) { const a = c.idx[t], b = c.idx[t + 1], cc = c.idx[t + 2], ab = m(a, b), bc = m(b, cc), ca = m(cc, a); idx.push(a, ab, ca, ab, b, bc, ca, bc, cc, ab, bc, ca); }
    return { P: Float64Array.from(P), UV: Float64Array.from(UV), tone: Float64Array.from(tone), idx: Uint32Array.from(idx), n: P.length / 3 };
  };
  const cap = sub(sub(cap0));
  const P = Array.from(cap.P), UV = Array.from(cap.UV), tone = Array.from(cap.tone), idx = Array.from(cap.idx);
  const n = P.length / 3, Pa = Float64Array.from(P);
  const wd = weld(Pa, n, 1e-6), wi = Uint32Array.from(idx, i => wd.wid[i]);
  // nuca mais longa (feminino)
  const yEar = C.JP.Head[1];
  if (g === 'f') for (let i = 0; i < n; i++) { const y = Pa[i * 3 + 1]; if (y < yEar && Pa[i * 3 + 2] > Hc[2]) Pa[i * 3 + 1] = yEar + (y - yEar) * 1.6; }
  const N = vertexNormals(Pa, Uint32Array.from(idx), n);
  // garante normal para fora
  const vol = g === 'f' ? 0.03 : 0.02, loops = boundaryLoops(wi), border = new Uint8Array(wd.nw);
  for (const l of loops) for (const v of l) border[v] = 1;
  // distância (aprox.) à linha do cabelo pela borda: suaviza o volume perto dela
  const adj = neighbors(wi, wd.nw), dist = new Float64Array(wd.nw).fill(1e9), q = [];
  for (let w = 0; w < wd.nw; w++) if (border[w]) { dist[w] = 0; q.push(w); }
  const pw = new Float64Array(wd.nw * 3); for (let i = 0; i < n; i++) pw.set(Pa.subarray(i * 3, i * 3 + 3), wd.wid[i] * 3);
  for (let it = 0; it < q.length; it++) { const v = q[it]; for (let k = adj.off[v]; k < adj.off[v + 1]; k++) { const u = adj.nb[k], d = dist[v] + Math.hypot(pw[u * 3] - pw[v * 3], pw[u * 3 + 1] - pw[v * 3 + 1], pw[u * 3 + 2] - pw[v * 3 + 2]); if (d < dist[u]) { dist[u] = d; q.push(u); } } }
  const out = new Float64Array(n * 3), tn = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    let nx = N[i * 3], ny = N[i * 3 + 1], nz = N[i * 3 + 2];
    const dc = G.sub([Pa[i * 3], Pa[i * 3 + 1], Pa[i * 3 + 2]], Hc); if (nx * dc[0] + ny * dc[1] + nz * dc[2] < 0) { nx = -nx; ny = -ny; nz = -nz; }
    const x = Pa[i * 3], y = Pa[i * 3 + 1], z = Pa[i * 3 + 2];
    // cachos: células de Worley de ~2,4 cm (domo por célula) + um segundo nível mais fino; vales mais escuros
    const f1 = worley(x / 0.024, y / 0.024, z / 0.024, 23), bump = Math.pow(1 - clamp(f1 / 0.75, 0, 1), 1.5);
    const f2 = worley(x / 0.011, y / 0.011, z / 0.011, 41), bump2 = 1 - clamp(f2 / 0.8, 0, 1);
    const edge = smoothstep(0, 0.025, dist[wd.wid[i]]);
    const d = vol * (0.75 + 0.25 * edge) * smoothstep(-0.004, 0.02, dist[wd.wid[i]] + 0.004) + (0.012 * bump + 0.003 * bump2) * (0.4 + 0.6 * edge) + 0.003 * noise3(x * 25, y * 25, z * 25, 3);
    out[i * 3] = x + nx * d; out[i * 3 + 1] = y + ny * d; out[i * 3 + 2] = z + nz * d;
    tn[i] = (0.6 + 0.3 * bump + 0.1 * bump2) * tone[i];
  }
  return { P: out, UV: Float64Array.from(UV), tone: tn, idx: Uint32Array.from(idx), n };
}
