// Tênis de corrida (§7, v5): medido do pé de cada lado. Cabedal = loft paramétrico ajustado ao pé (abertura do
// tornozelo cortada, biqueira, contraforte e faixa lateral por cortes de cor exatos); entressola grossa (drop de 1 cm,
// abaulada no calcanhar, com vinco), solado escuro com borda chanfrada, colarinho acolchoado, lingueta, cadarços e laço.
// O pé do corpo que fica dentro do tênis é apagado.
import * as G from './gltf.mjs';
import { BI } from './body.mjs';
import { smoothstep, clamp, vertexNormals, BVH, rayAO, boundaryLoops, neighbors, weld } from './geom.mjs';
import { cutBy, splitSlots, cleanIslands, distToLoop, refineNear } from './garments.mjs';
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
  const spring = s => 0.011 * Math.pow(smoothstep(0.7, 1.0, s), 1.6);   // v6: bico levantado ~1 cm (toe spring)
  const midTop = s => 0.031 - 0.01 * smoothstep(0.3, 0.75, s);   // entressola: 31 mm no calcanhar → 21 mm na frente (drop 10 mm)
  // perfil de cima (paramétrico): colarinho no calcanhar, lingueta, peito do pé, biqueira
  // v6: colarinho/contraforte mais altos atrás, peito do pé cheio e biqueira alta e redonda (volume de tênis de corrida)
  const HP = [[0, 0.106], [0.1, 0.104], [0.28, 0.09], [0.45, 0.092], [0.6, 0.084], [0.76, 0.071], [0.9, 0.058], [1, 0.047]];
  const Htab = s => { s = clamp(s, 0, 1); for (let i = 1; i < HP.length; i++) if (s <= HP[i][0]) { const t = (s - HP[i - 1][0]) / (HP[i][0] - HP[i - 1][0]), e = t * t * (3 - 2 * t); return HP[i - 1][1] + (HP[i][1] - HP[i - 1][1]) * e; } return 0.042; };
  const maxFore = Math.max(...F.half.slice(Math.round(F.NS * 0.55)));
  const Wraw = s => (s > 0.55 ? Math.max(tab(F.half, s), maxFore * (1 - 0.18 * smoothstep(0.78, 1, s))) : tab(F.half, s)) + 0.0072;
  // pontas arredondadas: calcanhar em arco de círculo nos últimos 14% (vista de cima redonda, parede de trás alta),
  // bico em elipse nos últimos 24%
  const rEnd = s => s < 0.14 ? Math.sqrt(Math.max(0, 1 - Math.pow(1 - s / 0.14, 2))) : s > 0.76 ? Math.pow(Math.max(0, 1 - Math.pow((s - 0.76) / 0.24, 2.2)), 1 / 2.2) : 1;
  // pé do corpo (só o pé, abaixo do tornozelo) para garantir a cobertura
  const b = C.body, fb = BI['foot' + sd], WI = b.widx;
  const footTri = t => { let k = 0; for (let e = 0; e < 3; e++) { const w = WI[t * 3 + e], v = b.weld.rep[w]; if (b.Wd[v * 17 + fb] > 0.5 && b.PW[w * 3 + 1] < 0.085) k++; } return k >= 2; };
  const fbvh = new BVH(b.PW, WI, footTri);
  const NA = 28, NSt = 26;
  const footV = [];
  for (let v = 0; v < b.n; v++) if (b.Wd[v * 17 + fb] > 0.5 && b.P[v * 3 + 1] < 0.085) footV.push(frame([b.P[v * 3], b.P[v * 3 + 1], b.P[v * 3 + 2]]));
  // v5: peito do pé (até 13 cm) fora da abertura do tornozelo também entra no casco — senão a pele furava o cabedal
  // na frente da garganta (ela fica acima dos 8,5 cm)
  {
    const kb = BI['knee' + sd], w = F.well, sx = sd === 'L' ? -1 : 1;
    for (let v = 0; v < b.n; v++) {
      const y = b.P[v * 3 + 1], x = b.P[v * 3], z = b.P[v * 3 + 2];
      if (y < 0.085 || y > 0.13 || x * sx < 0 || b.Wd[v * 17 + fb] + b.Wd[v * 17 + kb] < 0.5) continue;
      const dx = (x - w.cx) / w.rx, dz = (z - w.cz) / w.rz;
      if (dx * dx + dz * dz < 1.08) continue;   // dentro da abertura (a perna sobe por ali)
      footV.push(frame([x, y, z]));
    }
  }
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
      const phi = -Math.PI / 2 + 2 * Math.PI * j / NA, ex = Math.cos(phi), ey = Math.sin(phi), p = ey < 0 ? 8 : 2.25;
      let l = w * Math.sign(ex) * Math.pow(Math.abs(ex), 2 / p);
      // calcanhar: a parede de trás continua alta até a ponta (a última seção é uma linha vertical, não um ponto)
      let y = q.hh * (s < 0.5 ? Math.pow(0.3 + 0.7 * r, 0.3) : Math.pow(r, 0.5)) * Math.sign(ey) * Math.pow(Math.abs(ey), 2 / p);
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
  // solda por posição (a última seção do calcanhar é uma linha vertical e a do bico um ponto: vértices repetidos) e
  // tira triângulos degenerados — senão os cortes deixam laços de borda espúrios
  {
    const wd = weld(Float64Array.from(P), P.length / 3, 1e-7), P2 = [], R2 = [];
    for (let w = 0; w < wd.nw; w++) { const v = wd.rep[w]; P2.push(P[v * 3], P[v * 3 + 1], P[v * 3 + 2]); R2.push(REC[v * 3], REC[v * 3 + 1], REC[v * 3 + 2]); }
    const I2 = [];
    for (let t = 0; t < idx.length; t += 3) {
      const a = wd.wid[idx[t]], b = wd.wid[idx[t + 1]], c = wd.wid[idx[t + 2]];
      if (a === b || b === c || a === c) continue;
      const ar = G.len(G.cross(G.sub(P2.slice(b * 3, b * 3 + 3), P2.slice(a * 3, a * 3 + 3)), G.sub(P2.slice(c * 3, c * 3 + 3), P2.slice(a * 3, a * 3 + 3))));
      if (ar < 1e-10) continue;
      I2.push(a, b, c);
    }
    P.length = 0; P.push(...P2); REC.length = 0; REC.push(...R2); idx.length = 0; idx.push(...I2);
    for (const row of ring) for (let j = 0; j < row.length; j++) row[j] = wd.wid[row[j]];
  }
  const n0 = P.length / 3;
  // registro por vértice: x, y, z, s, cos φ, sen φ
  const K = 6, V0 = new Float64Array(n0 * K);
  for (let i = 0; i < n0; i++) { V0[i * K] = P[i * 3]; V0[i * K + 1] = P[i * 3 + 1]; V0[i * K + 2] = P[i * 3 + 2]; V0[i * K + 3] = REC[i * 3]; V0[i * K + 4] = REC[i * 3 + 1]; V0[i * K + 5] = REC[i * 3 + 2]; }
  const wl = F.well;
  const dwell = (x, z) => { const dx = (x - wl.cx) / wl.rx, dz = (z - wl.cz) / wl.rz; return (Math.sqrt(dx * dx + dz * dz) - 1) * Math.min(wl.rx, wl.rz); };
  // faixas de cor: tudo em campos lisos do espaço do loft (s ao longo do pé, φ em volta, y); a listra lateral é
  // uma faixa entre duas curvas (dois campos com sinal), afinando nas pontas
  const yMid = s2 => midTop(clamp(s2, 0, 1)) + spring(clamp(s2, 0, 1));
  // faixa lateral (swoosh): sobe da entressola perto da frente (s 0,72) até o meio do pé alto (s 0,28), afinando
  const yc = s2 => yMid(s2) + 0.008 + 0.034 * Math.pow(clamp((0.72 - s2) / 0.44, 0, 1), 1.2), hwS = s2 => 0.0035 + 0.0062 * Math.sin(Math.PI * clamp((s2 - 0.28) / 0.44, 0, 1));
  const fields = [
    // abertura: mais baixa nos lados (abaixo do maléolo), alta atrás (contraforte e colarinho do tendão)
    ['open', (V, o) => Math.max(dwell(V[o], V[o + 2]), 0.058 + 0.026 * smoothstep(-0.2, 0.9, (V[o + 2] - wl.cz) / wl.rz) - V[o + 1], -V[o + 5])],
    ['base', (V, o) => yMid(V[o + 3]) - 0.0065 - V[o + 1]],   // abaixo da linha da entressola o cabedal sai (fica dentro dela)
    ['collar', (V, o) => Math.max(dwell(V[o], V[o + 2]) - 0.011, 0.06 - V[o + 1])],
    ['hc', (V, o) => Math.max(V[o + 1] - (yMid(V[o + 3]) + 0.006 + 0.04 * Math.pow(1 - smoothstep(0.0, 0.24, V[o + 3]), 1.3)), V[o + 3] - 0.24)],   // contraforte (curva lisa)
    ['toe', (V, o) => V[o + 1] - (yMid(V[o + 3]) + 0.004 + 0.016 * smoothstep(0.84, 0.99, V[o + 3]))],   // biqueira de borracha (sobe no bico, some na lateral)
    ['st1', (V, o) => V[o + 1] - (yc(V[o + 3]) + hwS(V[o + 3]))], ['st2', (V, o) => (yc(V[o + 3]) - hwS(V[o + 3])) - V[o + 1]],
    ['st3', (V, o) => V[o + 3] - 0.72], ['st4', (V, o) => 0.28 - V[o + 3]], ['st5', (V, o) => 0.5 - Math.abs(V[o + 4])]
  ];
  const rule = n => n.collar ? SL.shoeAccent : n.hc ? SL.shoeAccent : n.toe ? SL.shoeAccent
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
  return { V: V0, P: Float64Array.from(P), n: n0, idx: idx.slice(), K, fields, rule, surf, Ls, F, well: wl, frame, fromFrame, midTop, spring, yMid, ring, ST, NSt, NA, sd, mHeel, mToe, bodyBVH: C.bodyBVH };
}

function inWell(S, x, z) { const w = S.well, dx = (x - w.cx) / w.rx, dz = (z - w.cz) / w.rz; return dx * dx + dz * dz < 1; }

// ---------------------------------------------------------------- peças (cada uma: P, N, slot, idx)
function part() { return { P: [], N: [], slot: [], idx: [] }; }
function addV(M, p, n, sl) { M.P.push(p[0], p[1], p[2]); M.N.push(n[0], n[1], n[2]); M.slot.push(sl); return M.P.length / 3 - 1; }
function merge(into, M) { const o = into.P.length / 3; into.P.push(...M.P); into.N.push(...M.N); into.slot.push(...M.slot); for (const i of M.idx) into.idx.push(i + o); }
// normais lisas da própria peça (pelas faces), triângulos virados para o lado da normal de referência
function finishPart(M, ref) {
  const P = Float64Array.from(M.P);
  for (let t = 0; t < M.idx.length; t += 3) {
    const a = M.idx[t] * 3, b = M.idx[t + 1] * 3, c = M.idx[t + 2] * 3;
    const fn = G.cross([P[b] - P[a], P[b + 1] - P[a + 1], P[b + 2] - P[a + 2]], [P[c] - P[a], P[c + 1] - P[a + 1], P[c + 2] - P[a + 2]]);
    const r = ref(t / 3, [(P[a] + P[b] + P[c]) / 3, (P[a + 1] + P[b + 1] + P[c + 1]) / 3, (P[a + 2] + P[b + 2] + P[c + 2]) / 3]);
    if (G.dot(fn, r) < 0) { const k = M.idx[t + 1]; M.idx[t + 1] = M.idx[t + 2]; M.idx[t + 2] = k; }
  }
  const N = vertexNormals(P, Uint32Array.from(M.idx), P.length / 3);
  for (let i = 0; i < N.length; i++) M.N[i] = N[i];
  return M;
}
// triangulação de polígono simples 2D (orelhas)
function earClip(pts) {
  const n = pts.length, idx = [...Array(n).keys()], out = [];
  let area = 0; for (let i = 0; i < n; i++) { const a = pts[i], b = pts[(i + 1) % n]; area += a[0] * b[1] - b[0] * a[1]; }
  const ccw = area > 0, cr = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  let guard = 0;
  while (idx.length > 3 && guard++ < 5000) {
    let cut = false;
    for (let k = 0; k < idx.length; k++) {
      const i0 = idx[(k - 1 + idx.length) % idx.length], i1 = idx[k], i2 = idx[(k + 1) % idx.length], a = pts[i0], b = pts[i1], c = pts[i2];
      const cv = cr(a, b, c); if (ccw ? cv <= 1e-12 : cv >= -1e-12) continue;
      let inside = false;
      for (const j of idx) { if (j === i0 || j === i1 || j === i2) continue; const p = pts[j], d1 = cr(a, b, p), d2 = cr(b, c, p), d3 = cr(c, a, p); if (ccw ? (d1 > 0 && d2 > 0 && d3 > 0) : (d1 < 0 && d2 < 0 && d3 < 0)) { inside = true; break; } }
      if (inside) continue;
      out.push(i0, i1, i2); idx.splice(k, 1); cut = true; break;
    }
    if (!cut) break;
  }
  if (idx.length === 3) out.push(idx[0], idx[1], idx[2]);
  return out;
}

// contorno da sola no plano do pé (t = m a partir do calcanhar, l = lateral): calcanhar → lado de fora → bico → lado de
// dentro, tirado do cabedal na altura da entressola, deslocado para fora (abaulado no calcanhar) e reamostrado em N pontos
function soleOutline(base, N) {
  const { ring, ST, NSt, NA, P, frame, Ls, mHeel, yMid } = base;
  const lat = [], med = [];
  for (let i = 0; i <= NSt; i++) {
    let lmax = -1, lmin = 1;
    for (let j = 0; j < NA; j++) { const v = ring[i][j], q = frame([P[v * 3], P[v * 3 + 1], P[v * 3 + 2]]); if (q[2] > yMid(ST[i]) + 0.008) continue; lmax = Math.max(lmax, q[1]); lmin = Math.min(lmin, q[1]); }
    const t = ST[i] * Ls - mHeel;
    if (lmax > lmin) { lat.push([t, lmax]); med.push([t, lmin]); }
  }
  let poly = [...lat, ...med.reverse()];
  poly = poly.filter((p, i) => { const q = poly[(i - 1 + poly.length) % poly.length]; return Math.hypot(p[0] - q[0], p[1] - q[1]) > 0.002; });
  const cen = poly.reduce((a, p) => [a[0] + p[0] / poly.length, a[1] + p[1] / poly.length], [0, 0]);
  const sOf = t => (t + mHeel) / Ls;
  // abaulado: 7 mm no calcanhar → 3,5 mm no meio → 4,5 mm na frente
  const flare = t => { const s2 = sOf(t); return 0.0035 + 0.0035 * (1 - smoothstep(0.0, 0.3, s2)) + 0.001 * smoothstep(0.55, 0.85, s2); };
  const offs = (pl, f) => pl.map((p, i) => {
    const a = pl[(i - 1 + pl.length) % pl.length], b = pl[(i + 1) % pl.length];
    let nx = b[1] - a[1], ny = -(b[0] - a[0]); const l = Math.hypot(nx, ny) || 1; nx /= l; ny /= l;
    if ((p[0] - cen[0]) * nx + (p[1] - cen[1]) * ny < 0) { nx = -nx; ny = -ny; }
    return [p[0] + nx * f(p[0]), p[1] + ny * f(p[0]), nx, ny];
  });
  let out = offs(poly, flare).map(q => [q[0], q[1]]);
  for (let it = 0; it < 4; it++) out = out.map((p, i) => { const a = out[(i - 1 + out.length) % out.length], b = out[(i + 1) % out.length]; return [p[0] * 0.5 + (a[0] + b[0]) * 0.25, p[1] * 0.5 + (a[1] + b[1]) * 0.25]; });
  // reamostra por comprimento de arco, começando no calcanhar
  const L = [0]; for (let i = 1; i <= out.length; i++) L.push(L[i - 1] + Math.hypot(out[i % out.length][0] - out[i - 1][0], out[i % out.length][1] - out[i - 1][1]));
  const res = [];
  for (let k = 0; k < N; k++) {
    const d = L[out.length] * k / N; let i = 0; while (L[i + 1] < d) i++;
    const u = (d - L[i]) / Math.max(1e-9, L[i + 1] - L[i]), a = out[i], b = out[(i + 1) % out.length];
    res.push([a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u]);
  }
  return offs(res, () => 0).map(q => ({ t: q[0], l: q[1], nt: q[2], nl: q[3], s: sOf(q[0]), f: flare(q[0]) }));
}

// entressola (parede abaulada com vinco, aba de cima até o cabedal) + solado (parede chanfrada e fundo)
function soleParts(base, lod) {
  const N = [56, 22, 10][lod], O = soleOutline(base, N), { fromFrame, spring, yMid, F } = base, M = part(), up = [0, 1, 0];
  const W = (o, y, r) => fromFrame(o.s, o.l + o.nl * r, y).map((v, k) => v + (k === 1 ? 0 : 0)) && (() => { const t = o.t + o.nt * r; const s2 = (t + base.mHeel) / base.Ls; return fromFrame(s2, o.l + o.nl * r, y); })();
  const rowsMid = lod === 0 ? [0, 0.42, 0.64, 1] : [0, 1];
  const prof = tr => lod === 0 ? 0.0012 * Math.sin(Math.PI * tr) - 0.0012 * Math.exp(-Math.pow((tr - 0.64) / 0.04, 2)) : 0.0006 * Math.sin(Math.PI * tr);
  const grid = [];
  const mid = part();
  for (const tr of rowsMid) grid.push(O.map(o => { const y0 = spring(o.s) + (lod === 2 ? 0 : 0.0045), y1 = yMid(o.s) + 0.0008; return addV(mid, W(o, y0 + (y1 - y0) * tr, prof(tr)), [0, 0, 0], SL.midsole); }));
  // aba de cima: da borda da parede até dentro do cabedal (2 mm além do contorno do cabedal)
  grid.push(O.map(o => addV(mid, W(o, yMid(o.s) + 0.0011, -o.f - 0.0025), [0, 0, 0], SL.midsole)));
  for (let r = 0; r + 1 < grid.length; r++) for (let k = 0; k < N; k++) { const k2 = (k + 1) % N, a = grid[r][k], b = grid[r][k2], c = grid[r + 1][k2], d = grid[r + 1][k]; mid.idx.push(a, b, c, a, c, d); }
  const cenW = fromFrame(0.5, O.reduce((a, o) => a + o.l / N, 0), 0.02);
  finishPart(mid, (t, c) => { const r = Math.floor(t / (2 * N)); if (r === grid.length - 2) return up; const d = G.sub(c, cenW); return [d[0], 0, d[2]]; });
  merge(M, mid);
  // solado: parede chanfrada (embaixo 0,9 mm para dentro) e fundo plano (com a ponta levantada)
  const sole = part(), g2 = [];
  if (lod < 2) for (const [y, r] of [[0, -0.0011], [0.0045, 0]]) g2.push(O.map(o => addV(sole, W(o, spring(o.s) + y, r), [0, 0, 0], SL.sole)));
  for (let r = 0; r + 1 < g2.length; r++) for (let k = 0; k < N; k++) { const k2 = (k + 1) % N, a = g2[r][k], b = g2[r][k2], c = g2[r + 1][k2], d = g2[r + 1][k]; sole.idx.push(a, b, c, a, c, d); }
  const nWall = sole.idx.length / 3;
  const bot = O.map(o => addV(sole, W(o, spring(o.s), lod === 2 ? 0 : -0.0009), [0, -1, 0], SL.sole));
  for (const i of earClip(O.map(o => [o.t, o.l]))) sole.idx.push(bot[i]);
  finishPart(sole, (t, c) => { if (t >= nWall) return [0, -1, 0]; const d = G.sub(c, cenW); return [d[0], 0, d[2]]; });
  // o fundo com normal para baixo (sem média com a parede: vértices próprios)
  for (const i of bot) { sole.N[i * 3] = 0; sole.N[i * 3 + 1] = -1; sole.N[i * 3 + 2] = 0; }
  merge(M, sole);
  return M;
}

// colarinho acolchoado: rolo (meio tubo) em volta da abertura, mais grosso atrás (protetor do tendão)
function collarRoll(loopPts, well) {
  const M = part(), n = loopPts.length, ANG = [-55, 10, 75, 150, 215].map(a => a * Math.PI / 180), rows = [];
  for (let j = 0; j < n; j++) {
    const B = loopPts[j], T = G.norm(G.sub(loopPts[(j + 1) % n], loopPts[(j - 1 + n) % n]));
    const din = G.norm([well.cx - B[0], 0, well.cz - B[2]]), back = smoothstep(0.0, 0.8, (B[2] - well.cz) / well.rz);
    let upv = G.norm(G.cross(T, din)); if (upv[1] < 0) upv = G.scl(upv, -1);
    const out = G.scl(din, -1), r = 0.0058 * (1 + 0.5 * back), Cc = G.add(G.add(B, G.scl(din, r * 0.5)), G.scl(upv, -r * 0.1));   // v6: colarinho acolchoado de 12–17 mm
    rows.push(ANG.map(a => { const nn = G.add(G.scl(out, Math.cos(a)), G.scl(upv, Math.sin(a))); return addV(M, G.add(Cc, G.scl(nn, r)), nn, a > 1.2 ? SL.lining : SL.shoeAccent); }));
  }
  for (let j = 0; j < n; j++) for (let q = 0; q + 1 < ANG.length; q++) { const a = rows[j][q], b = rows[(j + 1) % n][q], c = rows[(j + 1) % n][q + 1], d = rows[j][q + 1]; M.idx.push(a, b, c, a, c, d); }
  const nn0 = M.N.slice();
  finishPart(M, (t) => { const v = M.idx[t * 3]; return [nn0[v * 3], nn0[v * 3 + 1], nn0[v * 3 + 2]]; });
  return M;
}

// puxador do calcanhar: aba arredondada (2 cm × 1,6 cm acima do colarinho, 3 mm), na cor de destaque
function heelTab(loopPts, well) {
  const M = part();
  let back = loopPts[0]; for (const p of loopPts) if (p[2] - well.cz > back[2] - well.cz) back = p;   // ponto mais de trás (+z)
  const out = G.norm([back[0] - well.cx, 0, back[2] - well.cz]), side = G.norm(G.cross([0, 1, 0], out)), up = G.norm(G.add([0, 1, 0], G.scl(out, 0.25)));
  const base0 = G.add(back, G.scl(up, -0.012)), rows = [];
  const prof = [[-1, 0], [-1, 0.75], [-0.75, 1], [0, 1.08], [0.75, 1], [1, 0.75], [1, 0]];
  for (const [u, v] of prof) {
    const p = G.add(G.add(base0, G.scl(side, u * 0.012)), G.scl(up, v * 0.034));
    rows.push([addV(M, G.add(p, G.scl(out, 0.0022)), out, SL.shoeAccent), addV(M, G.sub(p, G.scl(out, 0.0012)), G.scl(out, -1), SL.lining)]);
  }
  const cIn = addV(M, G.add(G.add(base0, G.scl(up, 0.012)), G.scl(out, 0.0022)), out, SL.shoeAccent), cBk = addV(M, G.sub(G.add(base0, G.scl(up, 0.012)), G.scl(out, 0.0012)), G.scl(out, -1), SL.lining);
  for (let k = 0; k + 1 < prof.length; k++) { M.idx.push(cIn, rows[k][0], rows[k + 1][0], cBk, rows[k + 1][1], rows[k][1]); const a = rows[k][0], b = rows[k + 1][0], c = rows[k + 1][1], d = rows[k][1]; M.idx.push(a, d, c, a, c, b); }
  const nn0 = M.N.slice();
  finishPart(M, t => { const v = M.idx[t * 3]; return [nn0[v * 3], nn0[v * 3 + 1], nn0[v * 3 + 2]]; });
  return M;
}

// lingueta: sai de baixo dos cadarços e sobe 1,4 cm acima do colarinho na frente; frente 'shoe', costas 'lining'
function tongue(base, front, lod) {
  const { surf, F } = base, M = part(), sF = base.frame(front)[0];
  const m2s = d => d / base.Ls;   // metros → parâmetro s
  const rowsS = (lod === 0 ? [0.1, 0.07, 0.042, 0.018, 0] : [0.09, 0.035, 0]).map(d => sF + m2s(d));
  const cols = lod === 0 ? [-1, -0.5, 0, 0.5, 1] : [-1, 0, 1];
  const center = rowsS.map(s2 => surf(clamp(s2, 0, 1), Math.PI / 2));
  // ponta de cima: sobe 1,9 cm acima da frente da abertura (encostada na canela), um pouco inclinada para a frente
  const fwd = n => { const d = G.dot(n, F.a); return d > 0.15 ? n : G.norm(G.add(n, G.scl(F.a, 0.15 - d + 0.2))); };
  const pts = center.map(c => ({ p: G.add(c.p, G.scl(c.n, 0.0016)), n: fwd(c.n) }));
  const topN = G.norm(G.add(G.scl(F.a, 1), [0, 0.45, 0]));
  pts.push({ p: G.add(G.add(front, [0, 0.017, 0]), G.scl(F.a, 0.006)), n: topN, w: 0.019 });
  const rows = pts.map((c, r) => {
    const t = r / (pts.length - 1), w = c.w || 0.0175, across = G.norm(G.cross(c.n, F.a)), lat = G.dot(across, F.L) < 0 ? G.scl(across, -1) : across;
    return cols.map(u => {
      // v6: mais estreita (cabe na garganta) e curvada sobre o peito do pé (as bordas descem até a pele do cabedal)
      const round = r === pts.length - 1 ? 1 - 0.35 * u * u : 1, sag = -0.0045 * u * u * (1 - 0.6 * t);
      const p = G.add(G.add(c.p, G.scl(lat, w * u * round)), G.scl(c.n, sag));
      return [addV(M, p, c.n, r === pts.length - 1 ? SL.shoeAccent : SL.shoe), addV(M, G.sub(p, G.scl(c.n, 0.0055)), G.scl(c.n, -1), SL.lining)];
    });
  });
  const R = rows.length, Cn = cols.length;
  for (let r = 0; r + 1 < R; r++) for (let k = 0; k + 1 < Cn; k++) for (const f of [0, 1]) { const a = rows[r][k][f], b = rows[r][k + 1][f], c = rows[r + 1][k + 1][f], d = rows[r + 1][k][f]; M.idx.push(a, b, c, a, c, d); }
  for (let k = 0; k + 1 < Cn; k++) { const a = rows[R - 1][k][0], b = rows[R - 1][k + 1][0], c = rows[R - 1][k + 1][1], d = rows[R - 1][k][1]; M.idx.push(a, b, c, a, c, d); }   // borda de cima
  for (const k of [0, Cn - 1]) for (let r = 0; r + 1 < R; r++) { const a = rows[r][k][0], b = rows[r + 1][k][0], c = rows[r + 1][k][1], d = rows[r][k][1]; M.idx.push(a, b, c, a, c, d); }   // lados
  const nn0 = M.N.slice(), nf = M.idx.length;
  finishPart(M, (t, c) => { const v = M.idx[t * 3]; const sl = M.slot[v]; return sl === SL.lining && t < (R - 1) * (Cn - 1) * 4 ? [nn0[v * 3], nn0[v * 3 + 1], nn0[v * 3 + 2]] : [nn0[v * 3], nn0[v * 3 + 1], nn0[v * 3 + 2]]; });
  return M;
}

// cadarços (v6): fitas chatas (5,5 × 1,2 mm) assentadas na lingueta — 0,5 mm acima dela no meio e as pontas entrando
// no cabedal (ilhós) —, 5 passadas no LOD0 (3 no LOD1); laço baixo e chato na de cima com duas pontas curtas
function laces(base, front, lod) {
  const { surf, F } = base, M = part(), sF = base.frame(front)[0], nRow = lod === 0 ? 5 : 3;
  const ribbon = (pts, w, th) => {   // pts: [{ c, n, t }] centro, normal da superfície, tangente ao longo da fita
    const rows = pts.map(q => { const side = G.norm(G.cross(q.n, q.t)); return [[-1, 1], [1, 1], [1, -1], [-1, -1]].map(([a, b]) => addV(M, G.add(G.add(q.c, G.scl(side, a * w / 2)), G.scl(q.n, b * th / 2)), G.norm(G.add(G.scl(side, a * 0.35), G.scl(q.n, b))), SL.lace)); });
    for (let q = 0; q + 1 < rows.length; q++) for (let k = 0; k < 4; k++) { const a = rows[q][k], b = rows[q][(k + 1) % 4], c = rows[q + 1][(k + 1) % 4], d = rows[q + 1][k]; M.idx.push(a, b, c, a, c, d); }
  };
  const bar = (s0, half, w, th) => {
    const segs = lod === 0 ? 6 : 3, pts = [];
    for (let q = 0; q <= segs; q++) {
      const u = -1 + 2 * q / segs, phi = Math.PI / 2 + half * u, sp = surf(clamp(s0, 0, 1), phi);
      const lift = th / 2 + 0.0005 * (1 - u * u) - 0.0012 * Math.pow(Math.abs(u), 6);   // pontas entram no cabedal
      const sp2 = surf(clamp(s0, 0, 1), phi + 0.01), t = G.norm(G.sub(sp2.p, sp.p));
      pts.push({ c: G.add(sp.p, G.scl(sp.n, lift)), n: sp.n, t });
    }
    ribbon(pts, w, th);
  };
  const m2s = d => d / base.Ls;
  for (let k = 0; k < nRow; k++) bar(sF + m2s(0.014 + k * (lod === 0 ? 0.0165 : 0.028)), 0.6 - 0.05 * k, lod === 0 ? 0.0055 : 0.006, 0.0012);
  if (lod === 0) {   // laço chato: duas alças deitadas e duas pontas curtas caindo para os lados
    const s0 = sF + m2s(0.018);
    for (const sg of [-1, 1]) {
      const loop = [];
      for (let q = 0; q <= 8; q++) {
        const th = Math.PI * q / 8, phi = Math.PI / 2 + sg * (0.1 + 0.32 * Math.sin(th)), ds = m2s(0.006 * Math.cos(th) - 0.001);
        const sp = surf(clamp(s0 + ds, 0, 1), phi), sp2 = surf(clamp(s0 + ds + m2s(0.002) * -Math.sin(th), 0, 1), phi + sg * 0.02 * Math.cos(th));
        loop.push({ c: G.add(sp.p, G.scl(sp.n, 0.0024 + 0.0008 * Math.sin(th))), n: sp.n, t: G.norm(G.sub(sp2.p, sp.p)) });
      }
      ribbon(loop, 0.004, 0.001);
      const tail = [];
      for (let q = 0; q <= 3; q++) { const u = q / 3, sp = surf(clamp(s0 + m2s(0.004 + 0.022 * u), 0, 1), Math.PI / 2 + sg * (0.12 + 0.28 * u)), sp2 = surf(clamp(s0 + m2s(0.006 + 0.022 * u), 0, 1), Math.PI / 2 + sg * (0.14 + 0.28 * u)); tail.push({ c: G.add(sp.p, G.scl(sp.n, 0.0019 - 0.0008 * u)), n: sp.n, t: G.norm(G.sub(sp2.p, sp.p)) }); }
      ribbon(tail, 0.0035, 0.001);
    }
  }
  const nn0 = M.N.slice();
  finishPart(M, (t) => { const v = M.idx[t * 3]; return [nn0[v * 3], nn0[v * 3 + 1], nn0[v * 3 + 2]]; });
  for (let i = 0; i < nn0.length; i++) M.N[i] = nn0[i];   // normais da seção (aresta viva da fita)
  return M;
}

// um LOD do tênis: cabedal (abertura e base cortadas, simplificado, cores exatas no LOD0), forro, sola e entressola,
// colarinho, lingueta e cadarços
function shoeLod(base, lod, Sm) {
  const K = base.K, nf = base.fields.length;
  let M = { V: base.V, P: base.P, n: base.n, idx: base.idx.slice(), K, F: base.fields.map(([, fn]) => { const a = []; for (let i = 0; i < base.n; i++) a.push(fn(base.V, i * K)); return a; }) };
  const fi = nm => base.fields.findIndex(f => f[0] === nm);
  // abertura: sai o lado negativo (dentro da elipse do tornozelo); base: sai o positivo (abaixo da linha da entressola)
  for (const [nm, sg] of [['open', -1], ['base', 1]]) {
    M = cutBy(M, fi(nm));
    const keep = [], fo = M.F[fi(nm)];
    for (let t = 0; t < M.idx.length; t += 3) { if (sg * (fo[M.idx[t]] + fo[M.idx[t + 1]] + fo[M.idx[t + 2]]) > 0) continue; keep.push(M.idx[t], M.idx[t + 1], M.idx[t + 2]); }
    M.idx = keep;
  }
  // casca lisa simplificada primeiro (bordas travadas), cortes de cor depois
  {
    const P32 = Float32Array.from(M.P), tgt = [980, 170, 44][lod], err = [0.0009, 0.004, 0.014][lod];
    if (M.idx.length > tgt * 3) M.idx = Array.from(Sm.simplify(Uint32Array.from(M.idx), P32, 3, tgt * 3, err, lod === 0 ? ['LockBorder', 'ErrorAbsolute'] : ['ErrorAbsolute'])[0]);
  }
  const lps = boundaryLoops(Uint32Array.from(M.idx)), myl = l => l.reduce((a, v) => a + M.P[v * 3 + 1], 0) / l.length;
  const opening = lps.sort((a, c) => myl(c) - myl(a))[0];
  { const ci = fi('collar'), d = distToLoop(M.P, M.n, opening); for (let i = 0; i < M.n; i++) M.F[ci][i] = Math.min(d[i], 0.05) - 0.009; }
  const colorF = ['collar', 'hc', 'toe', 'st1', 'st2', 'st3', 'st4', 'st5'];
  if (lod === 0) {
    // triângulos cruzados por uma linha de cor bissectados até ≤ 6 mm (bordas lisas da faixa e do contraforte)
    const cf = ['hc', 'toe', 'st1', 'st2'].map(nm => base.fields[fi(nm)][1]), coll = M.F[fi('collar')];
    const R = refineNear({ V: M.V, P: M.P, n: M.n, idx: M.idx, K }, cf, 0.0035, 6000);
    const dC = distToLoop(R.P, R.n, opening.map(v => v));   // laço: índices antigos continuam válidos (refine só acrescenta)
    M = { ...R, F: base.fields.map(([nm, fn]) => { const a = []; for (let i = 0; i < R.n; i++) a.push(nm === 'collar' ? Math.min(dC[i], 0.05) - 0.009 : fn(R.V, i * K)); return a; }) };
    for (const nm of colorF) M = cutBy(M, fi(nm));
  }
  else if (lod === 1) for (const nm of ['hc']) M = cutBy(M, fi(nm));
  const names = base.fields.map(f => f[0]), nt = M.idx.length / 3, tslot = new Uint8Array(nt);
  for (let t = 0; t < nt; t++) {
    const ng = {}; names.forEach((nm, q) => { const f = M.F[q]; ng[nm] = f[M.idx[t * 3]] + f[M.idx[t * 3 + 1]] + f[M.idx[t * 3 + 2]] < 0; });
    tslot[t] = lod === 0 ? base.rule(ng) : lod === 1 && ng.hc ? SL.shoeAccent : SL.shoe;
  }
  cleanIslands(M.idx, M.P, tslot, [1.6e-4, 3e-4, 6e-4][lod]);
  let dup = splitSlots(M, { fields: base.fields, rule: (ng, t) => tslot[t] });
  if (lod === 0) { const r = Sm.simplify(Uint32Array.from(dup.idx), Float32Array.from(dup.P), 3, 0, 0.0006, ['LockBorder', 'ErrorAbsolute'])[0]; dup = { ...dup, idx: r }; }
  // faixa lateral e contraforte em relevo (0,6 mm), zero na linha de cor (sem rachar a costura)
  const NWd = vertexNormals(M.P, Uint32Array.from(dup.idx, i => dup.orig[i]), M.n);
  if (lod === 0) {
    const raised = new Uint8Array(M.n);
    for (let t = 0; t < dup.idx.length; t += 3) if (dup.slot[dup.idx[t]] === SL.shoeAccent) for (let e = 0; e < 3; e++) raised[dup.orig[dup.idx[t + e]]] |= 1;
    for (let t = 0; t < dup.idx.length; t += 3) if (dup.slot[dup.idx[t]] !== SL.shoeAccent) for (let e = 0; e < 3; e++) raised[dup.orig[dup.idx[t + e]]] |= 2;
    // v6: sem relevo (o degrau de 0,6 mm na malha grossa dava serrilhado na borda da cor)
  }
  const wl = base.well, out = part();
  const Nup = vertexNormals(dup.P, Uint32Array.from(dup.idx), dup.n);
  for (let i = 0; i < dup.n; i++) addV(out, [dup.P[i * 3], dup.P[i * 3 + 1], dup.P[i * 3 + 2]], NWd.subarray(dup.orig[i] * 3, dup.orig[i] * 3 + 3), dup.slot[i]);
  for (const i of dup.idx) out.idx.push(i);
  const nShellV = dup.n, nShell = out.idx.length;
  // laço da abertura (posições), da frente (ponto de maior s)
  const first = new Int32Array(M.n).fill(-1); for (let i = 0; i < dup.n; i++) if (first[dup.orig[i]] < 0) first[dup.orig[i]] = i;
  const loopP = opening.map(v => [M.P[v * 3], M.P[v * 3 + 1], M.P[v * 3 + 2]]);
  let front = loopP[0]; for (const p of loopP) if (base.frame(p)[0] > base.frame(front)[0]) front = p;
  if (process.env.DBG_SHOE) console.log('  tênis', base.sd, 'LOD' + lod, 'frente s', base.frame(front)[0].toFixed(3), 'y', front[1].toFixed(3), 'laço', loopP.length, 'laços', lps.length);
  // forro: parede da borda da abertura para dentro e para baixo, com palmilha
  {
    const L = part(), m = loopP.length;
    let cx = 0, cz = 0; for (const p of loopP) { cx += p[0] / m; cz += p[2] / m; }
    if (lod === 2) {
      let cy = 0; for (const p of loopP) cy += p[1] / m;
      const ci = addV(L, [cx, cy - 0.01, cz], [0, 1, 0], SL.lining), ring = loopP.map(p => addV(L, p, [0, 1, 0], SL.lining));
      for (let j = 0; j < m; j++) L.idx.push(ring[j], ci, ring[(j + 1) % m]);
      finishPart(L, () => [0, 1, 0]);
    } else {
      const rows = [loopP.map(p => addV(L, p, [0, 0, 0], SL.lining))];
      if (lod === 0) rows.push(loopP.map(p => { const d = G.norm([cx - p[0], 0, cz - p[2]]); return addV(L, [p[0] + d[0] * 0.005, p[1] - 0.006, p[2] + d[2] * 0.005], [0, 0, 0], SL.lining); }));
      rows.push(loopP.map(p => { const d = G.norm([cx - p[0], 0, cz - p[2]]); return addV(L, [p[0] + d[0] * 0.007, 0.042, p[2] + d[2] * 0.007], [0, 0, 0], SL.lining); }));
      for (let r = 0; r + 1 < rows.length; r++) for (let j = 0; j < m; j++) { const k = (j + 1) % m; L.idx.push(rows[r][j], rows[r + 1][j], rows[r + 1][k], rows[r][j], rows[r + 1][k], rows[r][k]); }
      const nWall = L.idx.length / 3, ci = addV(L, [cx, 0.042, cz], [0, 1, 0], SL.lining), bot = rows[rows.length - 1];
      for (let j = 0; j < m; j++) L.idx.push(bot[j], ci, bot[(j + 1) % m]);
      finishPart(L, (t, c) => t >= nWall ? [0, 1, 0] : [cx - c[0], 0, cz - c[2]]);
    }
    merge(out, L);
  }
  const dbg = process.env.DBG_SHOE ? (nm, M2) => console.log('  tênis LOD' + lod, nm, M2.idx.length / 3) : () => {};
  dbg('cabedal', out); { const sp = soleParts(base, lod); dbg('sola', sp); merge(out, sp); }
  if (lod === 0) {
    // colarinho acolchoado (reamostrado em 30 pontos)
    const Ll = [0]; for (let i = 1; i <= loopP.length; i++) Ll.push(Ll[i - 1] + G.dist(loopP[i - 1], loopP[i % loopP.length]));
    const rs = []; for (let k = 0; k < 26; k++) { const d = Ll[loopP.length] * k / 26; let i = 0; while (Ll[i + 1] < d) i++; rs.push(G.lerp3(loopP[i], loopP[(i + 1) % loopP.length], (d - Ll[i]) / Math.max(1e-9, Ll[i + 1] - Ll[i]))); }
    { const cr = collarRoll(rs, wl); dbg('colarinho', cr); merge(out, cr); merge(out, heelTab(rs, wl)); }
  }
  if (lod < 2) { const tg = tongue(base, front, lod), lc = laces(base, front, lod); dbg('lingueta', tg); dbg('cadarços', lc); merge(out, tg); merge(out, lc); }
  return { P: Float64Array.from(out.P), N: Float64Array.from(out.N), n: out.P.length / 3, idx: Uint32Array.from(out.idx), slot: Uint8Array.from(out.slot), nShell, nShellV };
}

// tênis prontos (os dois lados) + apaga o pé de dentro
export function buildShoes(C, rays) {
  const Sm = simplifier(), out = { P: [], N: [], J: [], W: [], A: [], lods: [[], [], []], n: 0 };
  const deleteMask = new Uint8Array(C.body.idx.length / 3);
  const rep = {}, b = C.body;
  for (const sd of ['L', 'R']) {
    const base = buildShoe(C, sd), fb = BI['foot' + sd], kb = BI['knee' + sd];
    const L = [0, 1, 2].map(l => shoeLod(base, l, Sm));
    const shell0 = new BVH(L[0].P, L[0].idx);
    const inside = (x, y, z) => { let hits = 0; for (const d of [[0, 1, 0], [0.3, 0.1, 0.95], [-0.7, 0.2, -0.6]]) { const dn = G.norm(d), h = shell0.ray(x, y, z, dn[0], dn[1], dn[2], 1); if (h) hits++; } return hits >= 2; };
    const counts = [];
    for (const S of L) {
      const N = S.N;
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
