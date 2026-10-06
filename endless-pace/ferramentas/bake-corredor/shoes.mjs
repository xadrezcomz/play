// Tênis paramétrico (§7): medido do pé de cada lado, feito como campo implícito (cabedal + entressola +
// solado, com a abertura do tornozelo cavada) e malhado por surface nets; faixas de cor cortadas exatas.
// O pé do corpo que fica dentro do tênis é apagado.
import * as G from './gltf.mjs';
import { BI } from './body.mjs';
import { smoothstep, clamp, vertexNormals, BVH, rayAO, boundaryLoops, neighbors } from './geom.mjs';
import { cutBy, splitSlots, cleanIslands, distToLoop } from './garments.mjs';
import { simplifier } from './encode.mjs';
import { SL } from './consts.mjs';

const LIFT = 0.022;

function measureFoot(C, sd) {
  const b = C.body, n = b.n, fb = BI['foot' + sd], sx = sd === 'L' ? -1 : 1;
  const pts = [];
  for (let v = 0; v < n; v++) if (b.Wd[v * 17 + fb] > 0.5 && b.P[v * 3 + 1] < 0.14) pts.push([b.P[v * 3], b.P[v * 3 + 1], b.P[v * 3 + 2]]);
  let heel = null, toe = null;
  for (const p of pts) { if (p[1] < 0.07) { if (!heel || p[2] > heel[2]) heel = p; if (!toe || p[2] < toe[2]) toe = p; } }
  let a = G.norm([toe[0] - heel[0], 0, toe[2] - heel[2]]);
  // lateral: perpendicular a a no plano xz, apontando para fora (lado do corpo)
  let L = [a[2], 0, -a[0]];
  if (L[0] * sx < 0) L = [-L[0], 0, -L[2]];
  const Lf = G.dot(G.sub(toe, heel), a);
  const NS = 24, wmin = new Array(NS + 1).fill(1e9), wmax = new Array(NS + 1).fill(-1e9), ymax = new Array(NS + 1).fill(0);
  for (const p of pts) {
    const u = G.dot(G.sub(p, heel), a) / Lf, l = G.dot(G.sub(p, heel), L);
    for (let k = 0; k <= NS; k++) {
      if (Math.abs(u - k / NS) > 0.035) continue;
      if (p[1] < 0.09) { wmin[k] = Math.min(wmin[k], l); wmax[k] = Math.max(wmax[k], l); }
      ymax[k] = Math.max(ymax[k], p[1]);
    }
  }
  // completa estações vazias e suaviza
  const fill = arr => { for (let k = 0; k <= NS; k++) if (!isFinite(arr[k]) || Math.abs(arr[k]) > 1) { let j = k; while (j > 0 && (!isFinite(arr[j]) || Math.abs(arr[j]) > 1)) j--; arr[k] = arr[j]; } };
  fill(wmin); fill(wmax);
  const sm = arr => arr.map((v, k) => (arr[Math.max(0, k - 1)] + 2 * v + arr[Math.min(NS, k + 1)]) / 4);
  const cen = sm(sm(wmin.map((v, k) => (v + wmax[k]) / 2))), half = sm(sm(wmin.map((v, k) => (wmax[k] - v) / 2)));
  // perna na altura do colarinho: centro e raios (elipse em xz)
  const kb = BI['knee' + sd];
  let cx = 0, cz = 0, c = 0;
  const leg = [];
  for (let v = 0; v < n; v++) {
    const y = b.P[v * 3 + 1];
    if (y < 0.085 || y > 0.14) continue;
    if (b.Wd[v * 17 + fb] + b.Wd[v * 17 + kb] < 0.5 || (b.P[v * 3] < 0) !== (sd === 'L')) continue;
    // só a perna (acima do peito do pé): perto do eixo do tornozelo
    const An = C.Lm.An[sd];
    if (Math.hypot(b.P[v * 3] - An[0], b.P[v * 3 + 2] - An[2]) > 0.075) continue;
    leg.push([b.P[v * 3], y, b.P[v * 3 + 2]]); cx += b.P[v * 3]; cz += b.P[v * 3 + 2]; c++;
  }
  cx /= c; cz /= c;
  let rx = 0, rz = 0;
  for (const p of leg) { rx = Math.max(rx, Math.abs(p[0] - cx)); rz = Math.max(rz, Math.abs(p[2] - cz)); }
  const inst = ymax[Math.round(0.55 * NS)];
  // a abertura não pode comer o contraforte do calcanhar: no mínimo 7 mm de parede atrás
  const heelBack = G.dot(G.sub([cx, 0, cz], heel), a);   // distância (negativa = à frente do calcanhar)
  let wrz = rz + 0.005;
  const back = -G.dot([0, 0, 1], a) >= 0 ? 1 : -1;
  const maxBack = (heel[2] + 0.014 * back * 0) - cz;   // z do calcanhar (+14 mm de margem do tênis) − centro
  wrz = Math.min(wrz, Math.abs(heel[2] + 0.014 - cz) - 0.007);
  const R = { heel, toe, a, L, Lf, NS, cen, half, ymax: sm(ymax), inst, well: { cx, cz, rx: rx + 0.005, rz: wrz }, sx };
  if (process.env.DBG_SHOE) console.log(sd, JSON.stringify({ heel, toe, Lf, a, L, half: half.map(v => +v.toFixed(3)), cen: cen.map(v => +v.toFixed(3)), ymax: R.ymax.map(v => +v.toFixed(3)), well: R.well }));
  return R;
}

export function buildShoe(C, sd, opts = {}) {
  const F = measureFoot(C, sd);
  const mHeel = 0.02, mToe = 0.017, Ls = F.Lf + mHeel + mToe;
  const frame = p => { const d = G.sub(p, F.heel); return [(G.dot(d, F.a) + mHeel) / Ls, G.dot(d, F.L), p[1]]; };
  const fromFrame = (s, l, y) => { const t = s * Ls - mHeel; return [F.heel[0] + F.a[0] * t + F.L[0] * l, y, F.heel[2] + F.a[2] * t + F.L[2] * l]; };
  const tab = (arr, s) => { const u = clamp((s * Ls - mHeel) / F.Lf, 0, 1) * F.NS, k = Math.min(F.NS - 1, Math.floor(u)), t = u - k; return arr[k] + (arr[k + 1] - arr[k]) * t; };
  const spring = s => 0.012 * Math.pow(smoothstep(0.78, 1.0, s), 2);
  const midTop = s => LIFT + (0.016 - LIFT) * smoothstep(0.35, 0.75, s);
  // perfil de cima (paramétrico): colarinho no calcanhar, lingueta, peito do pé, biqueira
  const HP = [[0, 0.096], [0.12, 0.093], [0.3, 0.082], [0.45, 0.094], [0.58, 0.082], [0.75, 0.064], [0.9, 0.05], [1, 0.042]];
  const Htab = s => { s = clamp(s, 0, 1); for (let i = 1; i < HP.length; i++) if (s <= HP[i][0]) { const t = (s - HP[i - 1][0]) / (HP[i][0] - HP[i - 1][0]), e = t * t * (3 - 2 * t); return HP[i - 1][1] + (HP[i][1] - HP[i - 1][1]) * e; } return 0.042; };
  const maxFore = Math.max(...F.half.slice(Math.round(F.NS * 0.55)));
  const Wraw = s => (s > 0.55 ? Math.max(tab(F.half, s), maxFore * (1 - 0.22 * smoothstep(0.75, 1, s))) : tab(F.half, s)) + 0.006;
  const rEnd = s => s < 0.5 ? Math.pow(Math.max(0, 1 - Math.pow(1 - 2 * s, 4)), 1 / 4) : Math.pow(Math.max(0, 1 - Math.pow(2 * s - 1, 2.6)), 1 / 2.6);
  // pé do corpo (só o pé, abaixo do tornozelo) para garantir a cobertura
  const b = C.body, fb = BI['foot' + sd], WI = b.widx;
  const footTri = t => { let k = 0; for (let e = 0; e < 3; e++) { const w = WI[t * 3 + e], v = b.weld.rep[w]; if (b.Wd[v * 17 + fb] > 0.5 && b.PW[w * 3 + 1] < 0.085) k++; } return k >= 2; };
  const fbvh = new BVH(b.PW, WI, footTri);
  const NA = 28, NSt = 26;
  const footV = [];
  for (let v = 0; v < b.n; v++) if (b.Wd[v * 17 + fb] > 0.5 && b.P[v * 3 + 1] < 0.085) footV.push(frame([b.P[v * 3], b.P[v * 3 + 1], b.P[v * 3 + 2]]));
  const polarCache = [];
  const polar = (i, j) => {
    if (!polarCache[i]) {
      const s = 0.5 - 0.5 * Math.cos(Math.PI * i / NSt), q = secC(s), bins = new Float64Array(NA);
      for (const f of footV) {
        if (Math.abs(f[0] - s) > 0.03) continue;
        const dl = f[1] - q.c, dy = f[2] - q.ym, r = Math.hypot(dl, dy);
        let ang = Math.atan2(dy, dl) + Math.PI / 2; if (ang < 0) ang += 2 * Math.PI;   // φ = −π/2 → 0
        const jb = Math.round(ang / (2 * Math.PI) * NA) % NA;
        for (const dj of [-1, 0, 1]) { const k = (jb + dj + NA) % NA; bins[k] = Math.max(bins[k], r * (dj ? 0.97 : 1)); }
      }
      polarCache[i] = bins;
    }
    return polarCache[i][j];
  };
  // centro e eixos de cada seção
  const secC = s => { const yb = spring(s), yt = Htab(s); return { c: tab(F.cen, s), ym: (yb + yt) / 2, hh: (yt - yb) / 2, yb, yt }; };
  const R = [], ST = [];
  for (let i = 0; i <= NSt; i++) {
    const s = 0.5 - 0.5 * Math.cos(Math.PI * i / NSt), r = rEnd(s), q = secC(s), w = Wraw(s) * r;
    ST.push(s);
    const row = [];
    for (let j = 0; j < NA; j++) {
      const phi = -Math.PI / 2 + 2 * Math.PI * j / NA, ex = Math.cos(phi), ey = Math.sin(phi), p = ey < 0 ? 8 : 2.6;
      let l = w * Math.sign(ex) * Math.pow(Math.abs(ex), 2 / p);
      let y = q.hh * Math.pow(r, s < 0.5 ? 0.12 : 0.5) * Math.sign(ey) * Math.pow(Math.abs(ey), 2 / p);
      // pé: raio até a pele + 5 mm (casco polar dos vértices do pé perto desta estação)
      const dl = l, dy = y, dd = Math.hypot(dl, dy) || 1e-6;
      let rad = dd;
      if (ey > -0.6) rad = Math.max(rad, polar(i, j) + 0.0055);
      row.push([dl / dd * rad, dy / dd * rad]);
    }
    R.push(row);
  }
  // raio: o piso é o casco do pé + folga (já em R); por cima dele, um envelope liso — máximo local, borrado e
  // laplaciano preso ao piso (sem os calombos dos dedos e do peito do pé). A sola (parte de baixo) fica como está.
  {
    const rr = v => Math.hypot(v[0], v[1]), up = j => Math.sin(-Math.PI / 2 + 2 * Math.PI * j / NA) > -0.35;
    const floor = R.map(row => row.map(rr));
    let Rm = floor.map(r => r.slice());
    const nb = (A, i, j) => [A[i][(j + 1) % NA], A[i][(j + NA - 1) % NA], A[Math.max(0, i - 1)][j], A[Math.min(NSt, i + 1)][j]];
    const step = (A, keepFloor) => A.map((row, i) => row.map((v, j) => { if (!up(j) || i === 0 || i === NSt) return v; const m = (2 * v + nb(A, i, j).reduce((x, y) => x + y, 0)) / 6; return keepFloor ? Math.max(floor[i][j], m) : m; }));
    Rm = Rm.map((row, i) => row.map((v, j) => up(j) && i > 0 && i < NSt ? Math.max(v, ...nb(Rm, i, j).map(x => x * 0.985)) : v));
    for (let it = 0; it < 3; it++) Rm = step(Rm, false);
    for (let it = 0; it < 8; it++) Rm = step(Rm, true);
    for (let i = 1; i < NSt; i++) for (let j = 0; j < NA; j++) { const m = R[i][j], r0 = rr(m); if (r0 > 1e-6) { m[0] *= Rm[i][j] / r0; m[1] *= Rm[i][j] / r0; } }
  }
  const P = [], REC = [], idx = [], ring = [];
  for (let i = 0; i <= NSt; i++) {
    const s = ST[i], q = secC(s), row = [];
    for (let j = 0; j < NA; j++) {
      const phi = -Math.PI / 2 + 2 * Math.PI * j / NA;
      let [l, y] = R[i][j];
      y += q.ym; l += q.c;
      // entressola um pouco para fora (degrau do solado)
      const mt = midTop(s) + spring(s);
      if (y < mt + 0.002) l += Math.sign(Math.cos(phi)) * 0.0035 * rEnd(s) * smoothstep(mt + 0.002, mt - 0.003, y);
      y = Math.max(y, spring(s));
      row.push(P.length / 3); P.push(...fromFrame(s, l, y)); REC.push(s, Math.cos(phi), Math.sin(phi));
    }
    ring.push(row);
  }
  for (let i = 0; i < NSt; i++) for (let j = 0; j < NA; j++) {
    const a = ring[i][j], b2 = ring[i][(j + 1) % NA], c = ring[i + 1][(j + 1) % NA], d = ring[i + 1][j];
    idx.push(a, b2, c, a, c, d);
  }
  for (const [i, sgn] of [[0, -1], [NSt, 1]]) {
    let cx = 0, cy = 0, cz = 0; for (const v of ring[i]) { cx += P[v * 3]; cy += P[v * 3 + 1]; cz += P[v * 3 + 2]; }
    const ci = P.length / 3; P.push(cx / NA, cy / NA, cz / NA); REC.push(ST[i], 0, 0);
    for (let j = 0; j < NA; j++) { const a = ring[i][j], b2 = ring[i][(j + 1) % NA]; if (sgn < 0) idx.push(ci, b2, a); else idx.push(ci, a, b2); }
  }
  let vol = 0;
  for (let t = 0; t < idx.length; t += 3) { const a = idx[t] * 3, b2 = idx[t + 1] * 3, c = idx[t + 2] * 3; vol += G.dot([P[a], P[a + 1], P[a + 2]], G.cross([P[b2], P[b2 + 1], P[b2 + 2]], [P[c], P[c + 1], P[c + 2]])); }
  if (vol < 0) for (let t = 0; t < idx.length; t += 3) { const k = idx[t + 1]; idx[t + 1] = idx[t + 2]; idx[t + 2] = k; }
  const n0 = P.length / 3;
  // registro por vértice: x, y, z, s, cos φ, sen φ
  const K = 6, V0 = new Float64Array(n0 * K);
  for (let i = 0; i < n0; i++) { V0[i * K] = P[i * 3]; V0[i * K + 1] = P[i * 3 + 1]; V0[i * K + 2] = P[i * 3 + 2]; V0[i * K + 3] = REC[i * 3]; V0[i * K + 4] = REC[i * 3 + 1]; V0[i * K + 5] = REC[i * 3 + 2]; }
  const wl = F.well;
  const dwell = (x, z) => { const dx = (x - wl.cx) / wl.rx, dz = (z - wl.cz) / wl.rz; return (Math.sqrt(dx * dx + dz * dz) - 1) * Math.min(wl.rx, wl.rz); };
  // faixas de cor: tudo em campos lisos do espaço do loft (s ao longo do pé, φ em volta, y); a listra lateral é
  // uma faixa entre duas curvas (dois campos com sinal), afinando nas pontas
  const yc = s2 => 0.03 + (0.062 - 0.03) * clamp((0.68 - s2) / 0.36, 0, 1), hwS = s2 => 0.0045 + 0.0055 * Math.sin(Math.PI * clamp((s2 - 0.3) / 0.4, 0, 1));
  const fields = [
    ['open', (V, o) => Math.max(dwell(V[o], V[o + 2]), 0.055 - V[o + 1], -V[o + 5])],
    ['sole', (V, o) => V[o + 1] - (0.0075 + spring(clamp(V[o + 3], 0, 1)))],
    ['mid', (V, o) => V[o + 1] - (midTop(clamp(V[o + 3], 0, 1)) + spring(clamp(V[o + 3], 0, 1)))],
    ['collar', (V, o) => Math.max(dwell(V[o], V[o + 2]) - 0.011, 0.06 - V[o + 1])],
    ['hc1', (V, o) => V[o + 3] - 0.1], ['hc2', (V, o) => V[o + 1] - 0.06],
    ['st1', (V, o) => V[o + 1] - (yc(V[o + 3]) + hwS(V[o + 3]))], ['st2', (V, o) => (yc(V[o + 3]) - hwS(V[o + 3])) - V[o + 1]],
    ['st3', (V, o) => V[o + 3] - 0.7], ['st4', (V, o) => 0.3 - V[o + 3]], ['st5', (V, o) => 0.55 - Math.abs(V[o + 4])]
  ];
  const rule = n => n.sole ? SL.sole : n.mid ? SL.midsole : n.collar ? SL.shoeAccent : (n.hc1 && n.hc2) ? SL.shoeAccent
    : (n.st1 && n.st2 && n.st3 && n.st4 && n.st5) ? SL.shoeAccent : SL.shoe;
  // superfície do loft em (s, φ): para os cadarços
  const NWl = vertexNormals(Float64Array.from(P), Uint32Array.from(idx), n0);
  const surf = (s2, phi) => {
    let i = 0; while (i < NSt - 1 && ST[i + 1] < s2) i++;
    const u = clamp((s2 - ST[i]) / Math.max(1e-9, ST[i + 1] - ST[i]), 0, 1);
    let jf = (phi + Math.PI / 2) / (2 * Math.PI) * NA; jf = ((jf % NA) + NA) % NA;
    const j0 = Math.floor(jf), j1 = (j0 + 1) % NA, v = jf - j0;
    const pick = (A, ii, jj) => [A[ring[ii][jj] * 3], A[ring[ii][jj] * 3 + 1], A[ring[ii][jj] * 3 + 2]];
    const bil = A => { const a = pick(A, i, j0), b2 = pick(A, i, j1), c = pick(A, i + 1, j0), d = pick(A, i + 1, j1); return [0, 1, 2].map(k => (a[k] * (1 - v) + b2[k] * v) * (1 - u) + (c[k] * (1 - v) + d[k] * v) * u); };
    return { p: bil(P), n: G.norm(bil(NWl)) };
  };
  return { V: V0, P: Float64Array.from(P), n: n0, idx: idx.slice(), K, fields, rule, surf, Ls, F, well: wl };
}

function inWell(S, x, z) { const w = S.well, dx = (x - w.cx) / w.rx, dz = (z - w.cz) / w.rz; return dx * dx + dz * dz < 1; }

// um LOD do tênis: corta a abertura (sempre) e, no LOD0, as faixas de cor exatas; LOD1/2 simplificam a casca aberta
// e o espaço sai do sinal médio dos campos no triângulo. Forro (parede + palmilha) em todo LOD; cadarços no LOD0.
function shoeLod(base, lod, Sm) {
  const K = base.K, nf = base.fields.length;
  let M = { V: base.V, P: base.P, n: base.n, idx: base.idx.slice(), K, F: base.fields.map(([, fn]) => { const a = []; for (let i = 0; i < base.n; i++) a.push(fn(base.V, i * K)); return a; }) };
  M = cutBy(M, 0);
  let keep = [];
  for (let t = 0; t < M.idx.length; t += 3) { const fo = M.F[0]; if (fo[M.idx[t]] + fo[M.idx[t + 1]] + fo[M.idx[t + 2]] < 0) continue; keep.push(M.idx[t], M.idx[t + 1], M.idx[t + 2]); }
  M.idx = keep;
  // casca lisa simplificada primeiro (LOD0 com a borda da abertura travada), cortes de cor depois
  {
    const P32 = Float32Array.from(M.P), tgt = [760, 130, 56][lod], err = [0.0015, 0.004, 0.012][lod];
    M.idx = Array.from(Sm.simplify(Uint32Array.from(M.idx), P32, 3, tgt * 3, err, lod === 0 ? ['LockBorder', 'ErrorAbsolute'] : ['ErrorAbsolute'])[0]);
  }
  // debrum do colarinho: distância geodésica (pelo grafo) até a borda da abertura, 9 mm
  {
    const ci = base.fields.findIndex(f => f[0] === 'collar');
    const lps = boundaryLoops(Uint32Array.from(M.idx)), myl = l => l.reduce((a, v) => a + M.P[v * 3 + 1], 0) / l.length;
    const d = distToLoop(M.P, M.n, lps.sort((a, c) => myl(c) - myl(a))[0]);   // só a abertura
    for (let i = 0; i < M.n; i++) M.F[ci][i] = Math.min(d[i], 0.05) - 0.009;
  }
  if (lod === 0) for (let fi = 1; fi < nf; fi++) M = cutBy(M, fi);
  else if (lod === 1) for (const nm of ['sole', 'mid']) M = cutBy(M, base.fields.findIndex(f => f[0] === nm));
  const names = base.fields.map(f => f[0]), nt = M.idx.length / 3, tslot = new Uint8Array(nt);
  for (let t = 0; t < nt; t++) {
    const ng = {}; names.forEach((nm, q) => { const f = M.F[q]; ng[nm] = f[M.idx[t * 3]] + f[M.idx[t * 3 + 1]] + f[M.idx[t * 3 + 2]] < 0; });
    tslot[t] = lod ? (ng.sole ? SL.sole : ng.mid ? SL.midsole : SL.shoe) : base.rule(ng);   // de longe: sem detalhes de cor
  }
  cleanIslands(M.idx, M.P, tslot, [3e-5, 1.5e-4, 4e-4][lod]);
  let dup = splitSlots(M, { fields: base.fields, rule: (ng, t) => tslot[t] });
  if (lod === 0) { const r = Sm.simplify(Uint32Array.from(dup.idx), Float32Array.from(dup.P), 3, 0, 0.0006, ['LockBorder', 'ErrorAbsolute'])[0]; dup = { ...dup, idx: r }; }
  // forro: parede da borda da abertura para dentro e para baixo, com palmilha
  const wl = base.well, loops = boundaryLoops(Uint32Array.from(dup.idx, i => dup.orig[i]));
  const first = new Int32Array(Math.max(...dup.orig) + 1).fill(-1); for (let i = 0; i < dup.n; i++) if (first[dup.orig[i]] < 0) first[dup.orig[i]] = i;
  const Pl = Array.from(dup.P), slot = Array.from(dup.slot), orig = Array.from(dup.orig), idx2 = Array.from(dup.idx);
  let nv = dup.n;
  const addV = (p, sl) => { Pl.push(...p); slot.push(sl); orig.push(nv); return nv++; };
  // só o laço da abertura do tornozelo (o mais alto)
  const my = l => l.reduce((a, v) => a + dup.P[first[v] * 3 + 1], 0) / l.length;
  const opening = loops.filter(l => l.length >= 3).sort((a, c) => my(c) - my(a)).slice(0, 1);
  for (const loop0 of opening) {
    const loop = loop0.map(v => first[v]), m = loop.length;
    let cx = 0, cz = 0; for (const v of loop) { cx += dup.P[v * 3]; cz += dup.P[v * 3 + 2]; } cx /= m; cz /= m;
    const top = [], mid = [], bot = [];
    if (lod === 2) {   // longe: só uma tampa na altura da abertura (palmilha vista de cima)
      let cy = 0; for (const v of loop) cy += dup.P[v * 3 + 1] / m;
      const ci = addV([cx, cy - 0.01, cz], SL.lining);
      for (let j = 0; j < m; j++) idx2.push(addV([dup.P[loop[j] * 3], dup.P[loop[j] * 3 + 1], dup.P[loop[j] * 3 + 2]], SL.lining), ci, addV([dup.P[loop[(j + 1) % m] * 3], dup.P[loop[(j + 1) % m] * 3 + 1], dup.P[loop[(j + 1) % m] * 3 + 2]], SL.lining));
      continue;
    }
    for (const v of loop) {
      const p = [dup.P[v * 3], dup.P[v * 3 + 1], dup.P[v * 3 + 2]], toC = G.norm([cx - p[0], 0, cz - p[2]]);
      top.push(addV(p, SL.lining));
      if (lod === 0) mid.push(addV([p[0] + toC[0] * 0.005, p[1] - 0.006, p[2] + toC[2] * 0.005], SL.lining));
      bot.push(addV([p[0] + toC[0] * 0.007, 0.042, p[2] + toC[2] * 0.007], SL.lining));
    }
    const ci = addV([cx, 0.042, cz], SL.lining);
    for (let j = 0; j < m; j++) {
      const k = (j + 1) % m;
      if (lod === 0) { idx2.push(top[j], mid[j], mid[k], top[j], mid[k], top[k]); idx2.push(mid[j], bot[j], bot[k], mid[j], bot[k], mid[k]); }
      else idx2.push(top[j], bot[j], bot[k], top[j], bot[k], top[k]);
      idx2.push(bot[j], ci, bot[k]);
    }
  }
  for (let t = dup.idx.length; t < idx2.length; t += 3) {
    const a = idx2[t] * 3, b2 = idx2[t + 1] * 3, c = idx2[t + 2] * 3;
    const pa = [Pl[a], Pl[a + 1], Pl[a + 2]], fn = G.cross(G.sub([Pl[b2], Pl[b2 + 1], Pl[b2 + 2]], pa), G.sub([Pl[c], Pl[c + 1], Pl[c + 2]], pa));
    const cen = [(Pl[a] + Pl[b2] + Pl[c]) / 3, (Pl[a + 1] + Pl[b2 + 1] + Pl[c + 1]) / 3, (Pl[a + 2] + Pl[b2 + 2] + Pl[c + 2]) / 3];
    const want = G.len([fn[0], 0, fn[2]]) > Math.abs(fn[1]) ? G.dot([wl.cx - cen[0], 0, wl.cz - cen[2]], fn) : fn[1];
    if (want < 0) { const k = idx2[t + 1]; idx2[t + 1] = idx2[t + 2]; idx2[t + 2] = k; }
  }
  const nShell = dup.idx.length;
  // cadarços (LOD0): 6 barras em relevo atravessando a lingueta, na cor "lace"
  if (lod === 0) {
    for (let k = 0; k < 6; k++) {
      const s0 = 0.5 + k * 0.052, hw = 0.0022 / base.Ls, segs = 7, rows = [];
      for (const [ds, h] of [[-hw, 0.0008], [-hw, 0.003], [hw, 0.003], [hw, 0.0008]]) {
        const row = [];
        for (let q = 0; q <= segs; q++) { const phi = Math.PI / 2 - 0.55 + 1.1 * q / segs, sp = base.surf(s0 + ds, phi); row.push(addV(G.add(sp.p, G.scl(sp.n, h)), SL.lace)); }
        rows.push(row);
      }
      for (let r = 0; r < 3; r++) for (let q = 0; q < segs; q++) { const a = rows[r][q], b2 = rows[r][q + 1], c = rows[r + 1][q + 1], d = rows[r + 1][q]; idx2.push(a, b2, c, a, c, d); }
      for (const q of [0, segs]) { const a = rows[0][q], b2 = rows[1][q], c = rows[2][q], d = rows[3][q]; if (q === 0) idx2.push(a, c, b2, a, d, c); else idx2.push(a, b2, c, a, c, d); }
    }
  }
  return { P: Float64Array.from(Pl), n: nv, idx: Uint32Array.from(idx2), slot: Uint8Array.from(slot), orig: Int32Array.from(orig), nShell };
}

// tênis prontos (os dois lados) + apaga o pé de dentro
export function buildShoes(C, rays) {
  const Sm = simplifier(), out = { P: [], N: [], J: [], W: [], A: [], lods: [[], [], []], n: 0 };
  const deleteMask = new Uint8Array(C.body.idx.length / 3);
  const rep = {}, b = C.body;
  for (const sd of ['L', 'R']) {
    const base = buildShoe(C, sd), fb = BI['foot' + sd], kb = BI['knee' + sd];
    const L = [0, 1, 2].map(l => shoeLod(base, l, Sm));
    const shell0 = new BVH(L[0].P, L[0].idx.subarray(0, L[0].nShell));
    const inside = (x, y, z) => { let hits = 0; for (const d of [[0, 1, 0], [0.3, 0.1, 0.95], [-0.7, 0.2, -0.6]]) { const dn = G.norm(d), h = shell0.ray(x, y, z, dn[0], dn[1], dn[2], 1); if (h) hits++; } return hits >= 2; };
    const counts = [];
    for (const S of L) {
      const NWs = vertexNormals(S.P, Uint32Array.from(S.idx, i => S.orig[i]), S.n), N = new Float64Array(S.n * 3);
      for (let i = 0; i < S.n; i++) N.set(NWs.subarray(S.orig[i] * 3, S.orig[i] * 3 + 3), i * 3);
      const used = new Uint8Array(S.n); for (const i of S.idx) used[i] = 1;   // vértices soltos dos cortes têm normal nula
      const ao = rayAO([new BVH(S.P, S.idx), C.bodyBVH], S.P, N, S.n, { rays, maxD: 0.12, k: 0.55, offset: 0.0015, only: used });
      const baseI = out.n;
      for (let i = 0; i < S.n; i++) {
        const x = S.P[i * 3], y = S.P[i * 3 + 1], z = S.P[i * 3 + 2];
        out.P.push(x, y, z); out.N.push(N[i * 3], N[i * 3 + 1], N[i * 3 + 2]);
        // colarinho: pesos da pele do tornozelo ali perto (joelho/pé), como a meia e a pele — nada fura ao dobrar
        let qk = 0;
        const t = smoothstep(0.05, 0.09, y);
        if (t > 0) {
          const h = C.bodyBVH.closest(x, y, z, 0.05);
          if (h.tri >= 0) {
            let wk = 0, wf = 0;
            for (const [e, wgt] of [[0, h.u], [1, h.v], [2, h.w]]) { const v = b.weld.rep[b.widx[h.tri * 3 + e]]; wk += wgt * b.Wd[v * 17 + kb]; wf += wgt * b.Wd[v * 17 + fb]; }
            qk = Math.round(255 * t * wk / Math.max(1e-6, wk + wf));
          }
        }
        out.J.push(fb, kb, 0, 0); out.W.push(255 - qk, qk, 0, 0);
        out.A.push(4, S.slot[i], Math.round(clamp(ao[i], 0, 1) * 255), 0);
      }
      out.lods[L.indexOf(S)].push(...Array.from(S.idx, i => i + baseI));
      out.n += S.n;
      counts.push(S.idx.length / 3);
    }
    rep[sd] = { v: L.reduce((a, S) => a + S.n, 0), tris: counts, comprimento: +base.Ls.toFixed(3) };
    // pé do corpo dentro do tênis: os três cantos dentro; na abertura do tornozelo, tudo abaixo de 7,5 cm sai (a pele
    // ali aparecia no calcanhar quando o tornozelo dobra; o forro e a palmilha fecham a vista)
    for (let t = 0; t < deleteMask.length; t++) {
      let ins = 0;
      for (let e = 0; e < 3; e++) {
        const v = b.idx[t * 3 + e], x = b.P[v * 3], y = b.P[v * 3 + 1], z = b.P[v * 3 + 2];
        if (y > 0.11) continue;
        if (inWell(base, x, z) ? (y < 0.075) : inside(x, y, z)) ins++;
      }
      if (ins === 3) deleteMask[t] = 1;
    }
  }
  C.rep.tenis = rep;
  return { shoes: out, deleteMask };
}
