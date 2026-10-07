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
  // v8: bico levantado 1,5 cm (rocker de corrida) e o calcanhar chanfrado atrás (4 mm nos últimos 9 %)
  const spring = s => 0.015 * Math.pow(smoothstep(0.68, 1.0, s), 1.5) + 0.004 * Math.pow(1 - smoothstep(0.0, 0.09, s), 2);
  // v8: entressola de tênis de corrida atual — 34 mm no calcanhar → 22 mm na frente (drop 12 mm)
  const midTop = s => 0.034 - 0.012 * smoothstep(0.28, 0.78, s);
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
      // (cos/sen quase nulos viram zero: sen(π) ≈ 1e-16 jogava o ponto do meio da linha do calcanhar 5,5 mm para cima
      // de um lado só — fenda no contraforte)
      const phi = -Math.PI / 2 + 2 * Math.PI * j / NA, snap = x => Math.abs(x) < 1e-9 ? 0 : x, ex = snap(Math.cos(phi)), ey = snap(Math.sin(phi)), p = ey < 0 ? 8 : 2.25;
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
  // v7: a primeira seção (calcanhar) é uma linha vertical: raio simétrico entre os dois lados (φ e π − φ), senão os
  // vértices dos dois lados não soldam e o relevo do contraforte abre uma fenda no meio do calcanhar
  for (const i of [0, NSt]) for (let j = 0; j < NA; j++) {
    const j2 = (NA - j) % NA, a = R[i][j], b2 = R[i][j2], ra = Math.hypot(a[0], a[1]), rb = Math.hypot(b2[0], b2[1]), r = Math.max(ra, rb);
    if (ra > 1e-9) { a[0] *= r / ra; a[1] *= r / ra; } if (rb > 1e-9 && j2 !== j) { b2[0] *= r / rb; b2[1] *= r / rb; }
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
  // faixas de cor: tudo em campos lisos do espaço do loft (s ao longo do pé, φ em volta, y). v7: biqueira grande (sobe
  // até 2,8 cm no bico), contraforte, "swoosh" curvo nos dois lados (crescente que sobe da entressola perto da frente e
  // afina para trás), colarinho e o painel dos ilhoses (faixa dos dois lados da garganta, sob os cadarços) — todos na
  // cor de destaque e em relevo de 1,1 mm com parede viva (shoeLod)
  const yMid = s2 => midTop(clamp(s2, 0, 1)) + spring(clamp(s2, 0, 1));
  // swoosh: crescente que nasce na frente do contraforte (s 0,30, alto e grosso, ponta de trás arredondada) e desce
  // curvando até a entressola perto da frente (s 0,80), afinando numa ponta fina
  // v7b: crescente fechado — ponta fina atrás (s 0,24, alta, logo à frente do contraforte), engrossa descendo para a
  // frente e termina redonda em s 0,70 logo acima da entressola (sem a cauda fina comprida de antes)
  const uSw = s2 => clamp((s2 - 0.24) / 0.46, 0, 1);
  const ySw = s2 => yMid(s2) + 0.0095 + 0.024 * Math.pow(1 - uSw(s2), 1.7), hwSw = s2 => { const u = uSw(s2), fr = u < 0.8 ? 1 : Math.sqrt(Math.max(0, 1 - Math.pow((u - 0.8) / 0.2, 2))); return 0.0088 * Math.pow(u, 1.1) * fr; };
  // frente da garganta (ponto da elipse do tornozelo mais à frente, em s) e o ângulo dos ilhoses
  const sF = frame([wl.cx + F.a[0] * wl.rz, 0, wl.cz + F.a[2] * wl.rz])[0];
  const dphi = (V, o) => Math.abs(Math.atan2(V[o + 5], V[o + 4]) - Math.PI / 2);
  const eyeDs = (V, o) => (V[o + 3] - sF) * Ls;   // metros à frente da garganta
  const fields = [
    // abertura: mais baixa nos lados (abaixo do maléolo), alta atrás (contraforte e colarinho do tendão)
    ['open', (V, o) => Math.max(dwell(V[o], V[o + 2]), 0.058 + 0.026 * smoothstep(-0.2, 0.9, (V[o + 2] - wl.cz) / wl.rz) - V[o + 1], -V[o + 5])],
    ['base', (V, o) => yMid(V[o + 3]) + 0.0004 - V[o + 1]],   // v6: a borda do cabedal assenta na aba da entressola
    ['collar', (V, o) => Math.max(dwell(V[o], V[o + 2]) - 0.011, 0.06 - V[o + 1])],
    // contraforte (v8): mais baixo (3,4 cm atrás) e mais comprido, descendo em curva até a entressola em s 0,30 — um
    // clipe em volta do calcanhar, não uma chapa
    ['hc', (V, o) => Math.max(V[o + 1] - (yMid(V[o + 3]) + 0.005 + 0.029 * Math.pow(1 - smoothstep(0.0, 0.3, V[o + 3]), 1.5)), V[o + 3] - 0.3)],
    // biqueira (v7b: a faixa de 4,5 mm junto da entressola só na frente — antes corria o pé todo e, com a cauda do
    // swoosh, fazia duas linhas finas paralelas)
    ['toe', (V, o) => V[o + 1] - (yMid(V[o + 3]) - 0.002 + 0.0065 * smoothstep(0.6, 0.78, V[o + 3]) + 0.024 * Math.pow(smoothstep(0.8, 0.995, V[o + 3]), 1.4))],
    ['st1', (V, o) => V[o + 1] - (ySw(V[o + 3]) + hwSw(V[o + 3]))], ['st2', (V, o) => (ySw(V[o + 3]) - hwSw(V[o + 3])) - V[o + 1]],
    ['st3', (V, o) => V[o + 3] - 0.7], ['st4', (V, o) => 0.24 - V[o + 3]], ['st5', (V, o) => 0.55 - Math.abs(V[o + 4])],
    // painel dos ilhoses: |φ − π/2| entre 0,40 e 0,80 rad, da garganta até 10,5 cm à frente (afina para a frente)
    ['eye', (V, o) => { const ds = eyeDs(V, o), d = dphi(V, o); return Math.max((0.4 - d) * 0.06, (d - (0.8 - 0.16 * clamp(ds / 0.105, 0, 1))) * 0.06, -0.006 - ds, ds - 0.105); }]
  ];
  // v8: sem a faixa de destaque em volta da abertura (o colarinho acolchoado já é dessa cor e cobria a faixa: só gastava
  // triângulos de parede)
  const rule = n => n.hc || n.toe || n.eye || (n.st1 && n.st2 && n.st3 && n.st4 && n.st5) ? SL.shoeAccent : SL.shoe;
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
  return { V: V0, P: Float64Array.from(P), n: n0, idx: idx.slice(), K, fields, rule, surf, Ls, F, well: wl, frame, fromFrame, midTop, spring, yMid, ring, ST, NSt, NA, sd, mHeel, mToe, bodyBVH: C.bodyBVH, sF };
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
  // abaulado: v8 — 9 mm no calcanhar → 4,5 mm no meio → 6 mm na frente (a entressola sai bem para fora do cabedal: a
  // borda de cima vira um degrau com sombra e a sola lê como uma peça grossa)
  const flare = t => { const s2 = sOf(t); return 0.0045 + 0.0045 * (1 - smoothstep(0.0, 0.3, s2)) + 0.0015 * smoothstep(0.55, 0.85, s2); };
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
  const N = [36, 22, 10][lod], O = soleOutline(base, N), { fromFrame, spring, yMid, F } = base, M = part(), up = [0, 1, 0];
  const W = (o, y, r) => fromFrame(o.s, o.l + o.nl * r, y).map((v, k) => v + (k === 1 ? 0 : 0)) && (() => { const t = o.t + o.nt * r; const s2 = (t + base.mHeel) / base.Ls; return fromFrame(s2, o.l + o.nl * r, y); })();
  // v8: parede esculpida — base alargada (sai 2,2 mm), um sulco horizontal a ~48 % da altura (1,2 mm para dentro) e a
  // borda de cima arredondada para dentro até a aba (o cabedal assenta num degrau). Perfil (fração da altura → raio)
  const PROF = lod === 0 ? [[0, 0.0016], [0.2, 0.0022], [0.42, 0.0011], [0.5, -0.0003], [0.58, 0.0011], [1, -0.0006]]
    : lod === 1 ? [[0, 0.0014], [0.3, 0.0018], [0.75, 0.0012], [1, -0.0004]] : [[0, 0.0008], [1, 0]];
  const grid = [];
  const mid = part();
  for (const [tr, pr] of PROF) grid.push(O.map(o => { const y0 = spring(o.s) + (lod === 2 ? 0 : 0.004), y1 = yMid(o.s) + 0.0008; return addV(mid, W(o, y0 + (y1 - y0) * tr, pr), [0, 0, 0], SL.midsole); }));
  // aba de cima: da borda da parede até dentro do cabedal (2 mm além do contorno do cabedal)
  grid.push(O.map(o => addV(mid, W(o, yMid(o.s) + 0.0011, -o.f - 0.0045), [0, 0, 0], SL.midsole)));
  for (let r = 0; r + 1 < grid.length; r++) for (let k = 0; k < N; k++) { const k2 = (k + 1) % N, a = grid[r][k], b = grid[r][k2], c = grid[r + 1][k2], d = grid[r + 1][k]; mid.idx.push(a, b, c, a, c, d); }
  const cenW = fromFrame(0.5, O.reduce((a, o) => a + o.l / N, 0), 0.02);
  finishPart(mid, (t, c) => { const r = Math.floor(t / (2 * N)); if (r === grid.length - 2) return up; const d = G.sub(c, cenW); return [d[0], 0, d[2]]; });
  merge(M, mid);
  // solado: parede chanfrada (embaixo 0,9 mm para dentro) e fundo plano (com a ponta levantada)
  // v8: borracha só nos apoios (calcanhar s < 0,3 e antepé s > 0,5); no meio do pé aparece a espuma da entressola (de
  // trás, com o pé no ar, o fundo não lê mais como uma placa preta)
  const rub = s2 => s2 < 0.3 || s2 > 0.5 ? SL.sole : SL.midsole;
  const sole = part(), g2 = [];
  if (lod < 2) for (const [y, r] of [[0, -0.0011], [0.004, 0]]) g2.push(O.map(o => addV(sole, W(o, spring(o.s) + y, r), [0, 0, 0], lod === 0 ? rub(o.s) : SL.sole)));
  // parede: cada coluna na cor do meio dela (borracha × espuma com divisa nítida, sem degradê entre as duas)
  const dupS = (v, sl) => sole.slot[v] === sl ? v : addV(sole, sole.P.slice(v * 3, v * 3 + 3), [0, 0, 0], sl);
  for (let r = 0; r + 1 < g2.length; r++) for (let k = 0; k < N; k++) {
    const k2 = (k + 1) % N, sl = lod === 0 ? rub((O[k].s + O[k2].s) / 2) : SL.sole;
    const a = dupS(g2[r][k], sl), b = dupS(g2[r][k2], sl), c = dupS(g2[r + 1][k2], sl), d = dupS(g2[r + 1][k], sl); sole.idx.push(a, b, c, a, c, d);
  }
  const nWall = sole.idx.length / 3;
  const bot = O.map(o => addV(sole, W(o, spring(o.s), lod === 2 ? 0 : -0.0009), [0, -1, 0], lod === 0 ? rub(o.s) : SL.sole));
  const botIdx = earClip(O.map(o => [o.t, o.l])).map(i => bot[i]);
  if (lod === 0) {
    // v6: fundo em faixas transversais (linhas nas bordas e no meio de cada sulco): 6 sulcos de flexão em V de 1,3 mm
    // (4 na frente, 2 no calcanhar), escuros; as pontas (calcanhar e bico) fecham em leque até o contorno
    const hw = 0.0022 / base.Ls, GR = [0.13, 0.21, 0.58, 0.655, 0.73, 0.805];
    let sMin = 1, sMax = 0; for (const o of O) { sMin = Math.min(sMin, o.s); sMax = Math.max(sMax, o.s); }
    const rowsS = new Set();
    for (let v = sMin + 0.05; v < sMax - 0.05; v += 0.055) rowsS.add(+v.toFixed(5));
    for (const g of GR) for (const d of [-hw, 0, hw]) rowsS.add(+(g + d).toFixed(5));
    const RS = [...rowsS].filter(v => v > sMin + 0.02 && v < sMax - 0.02).sort((x, y) => x - y);
    const cross = sv => { let lo = 1e9, hi = -1e9; for (let k = 0; k < O.length; k++) { const p = O[k], q = O[(k + 1) % O.length]; if ((p.s - sv) * (q.s - sv) > 0 || p.s === q.s) continue; const u = (sv - p.s) / (q.s - p.s), l = p.l + (q.l - p.l) * u; lo = Math.min(lo, l); hi = Math.max(hi, l); } return [lo, hi]; };
    const yB = sv => spring(sv), inG = sv => GR.some(g => Math.abs(sv - g) < hw - 1e-7), onC = sv => GR.some(g => Math.abs(sv - g) < 1e-7);
    const rowV = RS.map(sv => { const [lo, hi] = cross(sv), y = yB(sv) + (onC(sv) ? 0.0013 : 0); return [0, 0.5, 1].map(f => addV(sole, fromFrame(sv, lo + (hi - lo) * f, y), [0, -1, 0], SL.sole)); });
    for (let r = 0; r + 1 < RS.length; r++) {
      const sm = (RS[r] + RS[r + 1]) / 2, groove = inG(sm), foam = rub(sm) === SL.midsole;
      const pick = (rr, c) => { const v = rowV[rr][c]; if (!groove && !foam) return v; return addV(sole, sole.P.slice(v * 3, v * 3 + 3), [0, -1, 0], groove ? SL.lining : SL.midsole); };
      for (let c = 0; c < 2; c++) { const a2 = pick(r, c), b2 = pick(r, c + 1), c2 = pick(r + 1, c + 1), d2 = pick(r + 1, c); sole.idx.push(a2, b2, c2, a2, c2, d2); }
    }
    // pontas: leque do primeiro/último anel até os pontos do contorno além dele
    for (const [rr, cmp] of [[0, o => o.s < RS[0]], [RS.length - 1, o => o.s > RS[RS.length - 1]]]) {
      const ring = O.map((o, k) => [o, k]).filter(([o]) => cmp(o)).map(([o, k]) => bot[k]);
      if (!ring.length) continue;
      const cen = rowV[rr][1];
      const all = [rowV[rr][0], ...ring, rowV[rr][2]];
      // ordena pelo ângulo em volta do centro da linha (plano do chão)
      const cp = sole.P.slice(cen * 3, cen * 3 + 3);
      all.sort((x, y) => Math.atan2(sole.P[x * 3 + 2] - cp[2], sole.P[x * 3] - cp[0]) - Math.atan2(sole.P[y * 3 + 2] - cp[2], sole.P[y * 3] - cp[0]));
      for (let k = 0; k < all.length; k++) { const x = all[k], y2 = all[(k + 1) % all.length]; if (x === y2) continue; const ang = Math.atan2(sole.P[y2 * 3 + 2] - cp[2], sole.P[y2 * 3] - cp[0]) - Math.atan2(sole.P[x * 3 + 2] - cp[2], sole.P[x * 3] - cp[0]); if (((ang % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI) > Math.PI) continue; sole.idx.push(cen, x, y2); }
    }
    if (process.env.DBG_SHOE) console.log('  sola fundo', RS.length, 'linhas');
  } else for (const i of botIdx) sole.idx.push(i);
  finishPart(sole, (t, c) => { if (t >= nWall) return [0, -1, 0]; const d = G.sub(c, cenW); return [d[0], 0, d[2]]; });
  // o fundo com normal para baixo (sem média com a parede: vértices próprios); nos sulcos a normal das faces
  const nWallV = bot[0];
  for (let i = nWallV; i < sole.P.length / 3; i++) if (sole.slot[i] !== SL.lining) { sole.N[i * 3] = 0; sole.N[i * 3 + 1] = -1; sole.N[i * 3 + 2] = 0; }
  merge(M, sole);
  return M;
}

// colarinho acolchoado (v7): tubo grosso (7,2 mm de raio, +40 % atrás no protetor do tendão) em volta das costas e dos
// lados da abertura; na frente (garganta) ele não passa — termina dos dois lados em ponta arredondada, onde começa o
// painel dos ilhoses, e a lingueta fecha a frente (antes o rolo fazia um "V" pontudo na garganta)
function collarRoll(loopPts, well, aDir) {
  const M = part(), n = loopPts.length, ANG = [-55, 15, 85, 155, 225].map(a => a * Math.PI / 180);
  // fração "de frente" de cada ponto do laço: direção do centro da abertura para o ponto · eixo do pé
  const fr = loopPts.map(B => { const d = G.norm([B[0] - well.cx, 0, B[2] - well.cz]); return d[0] * aDir[0] + d[2] * aDir[2]; });
  // começa no ponto mais de trás e anda em volta; guarda só os pontos com fr < 0,55 (fora da garganta)
  let j0 = 0; for (let j = 1; j < n; j++) if (fr[j] < fr[j0]) j0 = j;
  const order = [...Array(n).keys()].map(k => (j0 + k) % n), FR = 0.72, keep = order.filter(j => fr[j] < FR);
  // dois arcos (um de cada lado da parte de trás) viram um só: o laço inteiro menos a garganta, a partir do fim da garganta
  let startK = order.findIndex((j, k) => fr[j] < FR && fr[order[(k - 1 + n) % n]] >= FR); if (startK < 0) startK = 0;
  const arc = []; for (let k = 0; k < n; k++) { const j = order[(startK + k) % n]; if (fr[j] >= FR) break; arc.push(j); }
  const pts = (arc.length > 4 ? arc : keep).map(j => loopPts[j]), m = pts.length, rows = [];
  for (let q = 0; q < m; q++) {
    const B = pts[q], T = G.norm(G.sub(pts[Math.min(m - 1, q + 1)], pts[Math.max(0, q - 1)]));
    const din = G.norm([well.cx - B[0], 0, well.cz - B[2]]), back = smoothstep(0.0, 0.8, (B[2] - well.cz) / well.rz);
    let upv = G.norm(G.cross(T, din)); if (upv[1] < 0) upv = G.scl(upv, -1);
    const out = G.scl(din, -1), endT = Math.min(q, m - 1 - q), taper = Math.sqrt(smoothstep(-0.5, 2.5, endT));
    const r = 0.0072 * (1 + 0.4 * back) * (0.35 + 0.65 * taper), Cc = G.add(G.add(B, G.scl(din, r * 0.5)), G.scl(upv, r * 0.12));
    rows.push(ANG.map(a => { const nn = G.add(G.scl(out, Math.cos(a)), G.scl(upv, Math.sin(a))); return addV(M, G.add(Cc, G.scl(nn, r)), nn, a > 2.2 ? SL.lining : SL.shoeAccent); }));
  }
  for (let q = 0; q + 1 < m; q++) for (let k = 0; k + 1 < ANG.length; k++) { const a = rows[q][k], b = rows[q + 1][k], c = rows[q + 1][k + 1], d = rows[q][k + 1]; M.idx.push(a, b, c, a, c, d); }
  // pontas: leque até o centro de cada extremo
  for (const q of [0, m - 1]) { const cc = rows[q].reduce((acc, v) => G.add(acc, M.P.slice(v * 3, v * 3 + 3)), [0, 0, 0]).map(x => x / ANG.length); const ci = addV(M, cc, G.norm(G.sub(pts[q], pts[q ? q - 1 : 1])), SL.shoeAccent); for (let k = 0; k + 1 < ANG.length; k++) M.idx.push(ci, rows[q][k], rows[q][k + 1]); }
  const nn0 = M.N.slice();
  finishPart(M, (t) => { const v = M.idx[t * 3]; return [nn0[v * 3], nn0[v * 3 + 1], nn0[v * 3 + 2]]; });
  for (let i = 0; i < nn0.length; i++) if (M.slot[Math.floor(i / 3)] !== undefined) M.N[i] = nn0[i];   // normais do tubo (lisas)
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
    const p = G.add(G.add(base0, G.scl(side, u * 0.011)), G.scl(up, v * 0.024));
    rows.push([addV(M, G.add(p, G.scl(out, 0.0022)), out, SL.shoeAccent), addV(M, G.sub(p, G.scl(out, 0.0012)), G.scl(out, -1), SL.lining)]);
  }
  const cIn = addV(M, G.add(G.add(base0, G.scl(up, 0.012)), G.scl(out, 0.0022)), out, SL.shoeAccent), cBk = addV(M, G.sub(G.add(base0, G.scl(up, 0.012)), G.scl(out, 0.0012)), G.scl(out, -1), SL.lining);
  for (let k = 0; k + 1 < prof.length; k++) { M.idx.push(cIn, rows[k][0], rows[k + 1][0], cBk, rows[k + 1][1], rows[k][1]); const a = rows[k][0], b = rows[k + 1][0], c = rows[k + 1][1], d = rows[k][1]; M.idx.push(a, d, c, a, c, b); }
  const nn0 = M.N.slice();
  finishPart(M, t => { const v = M.idx[t * 3]; return [nn0[v * 3], nn0[v * 3 + 1], nn0[v * 3 + 2]]; });
  return M;
}

// lingueta (v7): acolchoada — 6 mm de espessura com a frente abaulada, sai de baixo do primeiro cadarço (10 cm à
// frente da garganta), cobre a garganta e sobe 2,2 cm acima do colarinho, inclinada para a frente, com a borda de cima
// redonda (meia-cana, cor de destaque); frente 'shoe', costas 'lining'
function tongue(base, front, lod) {
  const { surf, F } = base, M = part(), sF = base.frame(front)[0];
  const m2s = d => d / base.Ls;
  const rowsS = (lod === 0 ? [0.1, 0.07, 0.04, 0.015, -0.004] : [0.095, 0.04, -0.004]).map(d => sF + m2s(d));
  const cols = lod === 0 ? [-1, -0.55, 0, 0.55, 1] : [-1, 0, 1];
  const center = rowsS.map(s2 => surf(clamp(s2, 0, 1), Math.PI / 2));
  const fwd = n => { const d = G.dot(n, F.a); return d > 0.15 ? n : G.norm(G.add(n, G.scl(F.a, 0.15 - d + 0.2))); };
  const pts = center.map(c => ({ p: c.p, n: fwd(c.n), w: 0.026 }));   // v8: lingueta larga — fica embaixo de toda a laçada (2,6 cm de cada lado)
  // parte de cima: dois anéis acima da garganta, encostados na canela, um pouco para a frente
  const topN = G.norm(G.add(G.scl(F.a, 1), [0, 0.5, 0]));
  // v7b: mais baixa (1,8 cm acima da garganta), em pé junto da canela e mais grossa (8 mm): de lado lê como almofada,
  // não como uma barbatana fina
  // v8: a lingueta sai bem acima do colarinho (2,7 cm acima da garganta, inclinada para a frente): de lado e de trás
  // ela aparece, como num tênis de corrida
  pts.push({ p: G.add(G.add(front, [0, 0.012, 0]), G.scl(F.a, 0.004)), n: topN, w: 0.024, up: 1 });
  pts.push({ p: G.add(G.add(front, [0, 0.027, 0]), G.scl(F.a, 0.008)), n: topN, w: 0.022, top: 1, up: 1 });
  const TH = 0.008, rows = pts.map((c, r) => {
    const across = G.norm(G.cross(c.n, F.a)), lat = G.dot(across, F.L) < 0 ? G.scl(across, -1) : across, onUpper = !c.top && r < center.length;
    return cols.map(u => {
      const round = c.top ? 1 - 0.3 * u * u : 1, sag = onUpper ? -0.0035 * u * u : 0;
      const b0 = G.add(G.add(c.p, G.scl(lat, c.w * u * round)), G.scl(c.n, (onUpper ? 0.0012 : 0) + sag));
      const fF = G.add(b0, G.scl(c.n, onUpper ? 0.0018 + 0.0028 * (1 - u * u) : TH * (0.75 + 0.25 * (1 - u * u))));
      const nf = G.norm(G.add(c.n, G.scl(lat, 0.45 * u)));
      // costas: forro escuro só dentro do tênis; acima do colarinho, tecido claro (de trás não vira um buraco preto)
      return [addV(M, fF, nf, c.up ? SL.shoeAccent : SL.shoe), addV(M, b0, G.scl(c.n, -1), c.up ? SL.shoe : SL.lining)];
    });
  });
  const R = rows.length, Cn = cols.length;
  for (let r = 0; r + 1 < R; r++) for (let k = 0; k + 1 < Cn; k++) for (const f of [0, 1]) { const a = rows[r][k][f], b = rows[r][k + 1][f], c = rows[r + 1][k + 1][f], d = rows[r + 1][k][f]; M.idx.push(a, b, c, a, c, d); }
  // lados: vértices próprios na cor da frente (com os do forro, o espaço de cor interpolado fazia uma linha escura
  // ao longo da garganta)
  for (const k of [0, Cn - 1]) for (let r = 0; r + 1 < R; r++) {
    const sl = M.slot[rows[r][k][0]], sl2 = M.slot[rows[r + 1][k][0]];
    const mk = (v, sl0) => addV(M, M.P.slice(v * 3, v * 3 + 3), M.N.slice(v * 3, v * 3 + 3), sl0);
    const a = mk(rows[r][k][0], sl), b = mk(rows[r + 1][k][0], sl2), c = mk(rows[r + 1][k][1], sl2), d = mk(rows[r][k][1], sl);
    M.idx.push(a, b, c, a, c, d);
  }
  // borda de cima: meia-cana entre a frente e as costas da última linha
  { const last = rows[R - 1], up = pts[R - 1].n, mids = last.map(([fv, bv]) => { const pf = M.P.slice(fv * 3, fv * 3 + 3), pb = M.P.slice(bv * 3, bv * 3 + 3), c = G.lerp3(pf, pb, 0.5), u2 = G.norm(G.add(G.scl(F.a, 0.2), [0, 1, 0])); return addV(M, G.add(c, G.scl(u2, 0.0032)), u2, SL.shoeAccent); });
    const fr2 = last.map(([fv]) => { const v = addV(M, M.P.slice(fv * 3, fv * 3 + 3), M.N.slice(fv * 3, fv * 3 + 3), SL.shoeAccent); return v; });
    for (let k = 0; k + 1 < Cn; k++) { M.idx.push(fr2[k], fr2[k + 1], mids[k + 1], fr2[k], mids[k + 1], mids[k]); M.idx.push(mids[k], mids[k + 1], last[k + 1][1], mids[k], last[k + 1][1], last[k][1]); } }
  const nn0 = M.N.slice();
  finishPart(M, (t) => { const v = M.idx[t * 3]; return [nn0[v * 3], nn0[v * 3 + 1], nn0[v * 3 + 2]]; });
  return M;
}

// cadarços (v8): cruzados em X por cima da lingueta, como num tênis de verdade — 6 pares de ilhoses (do painel de um
// lado ao do outro), cada passada vai do ilhós de um lado da fileira k ao do outro lado da fileira k + 1, colada na
// frente da lingueta (0,8 mm acima dela no meio, descendo até o painel dos ilhoses nas pontas), seção de fita achatada
// (5 × 1,6 mm, só as três faces de cima: a de baixo encosta na lingueta); onde as duas passadas de um par se cruzam,
// a de cima sobe 0,9 mm. Em cima, um laço compacto. LOD1: 3 fileiras, 2 pares.
function laces(base, front, lod, below = null) {
  const { surf } = base, M = part(), sF = base.frame(front)[0], nRow = lod === 0 ? 6 : 3;
  // v8: a fita assenta no que estiver embaixo (lingueta ou painel dos ilhoses) — raio de cima para baixo pela normal
  // do cabedal contra a malha já pronta (cabedal + lingueta); sem acerto, a altura estimada
  const seat = (sp, est) => { if (!below) return est; const o = G.add(sp.p, G.scl(sp.n, 0.025)), h = below.ray(o[0], o[1], o[2], -sp.n[0], -sp.n[1], -sp.n[2], 0.04); const r = h ? Math.max(0.025 - h.t, 0) + 0.00025 + 0.4 * TH : est; if (process.env.DBG_LACE && lod === 0) console.log('  LACE est', (est * 1000).toFixed(2), 'seat', (r * 1000).toFixed(2), h ? 'hit' : 'miss'); return r; };
  const SEC = [[-1, 0.0], [-0.55, 1], [0.55, 1], [1, 0.0]];   // fita: base larga, topo plano (seção aberta embaixo)
  const ribbon = (pts, w, th) => {   // pts: [{ c, n, t }]
    const rows = pts.map(q => { const side = G.norm(G.cross(q.n, q.t)); return SEC.map(([a, b]) => addV(M, G.add(G.add(q.c, G.scl(side, a * w / 2)), G.scl(q.n, (b - 0.4) * th)), G.norm(G.add(G.scl(side, a * 0.55), G.scl(q.n, 0.6 + b * 0.6))), SL.lace)); });
    for (let q = 0; q + 1 < rows.length; q++) for (let k = 0; k + 1 < SEC.length; k++) { const a = rows[q][k], b = rows[q][k + 1], c = rows[q + 1][k + 1], d = rows[q + 1][k]; M.idx.push(a, b, c, a, c, d); }
  };
  const m2s = d => d / base.Ls, TH = 0.0016, W = lod === 0 ? 0.005 : 0.0058;
  const sRow = k => sF + m2s(0.012 + k * (lod === 0 ? 0.0165 : 0.03)), half = k => (0.62 - 0.035 * k * (lod === 0 ? 1 : 2));
  // altura acima do cabedal (centro da fita): a fita encosta no que estiver embaixo — a frente da lingueta (5,8 mm no
  // meio, caindo para os lados: 5,8 − 8,6·v² mm) ou, nas pontas, o painel dos ilhoses (1,2 mm) — mais 0,2 mm
  const lift = (v, hk) => Math.max(0.0058 - 0.0086 * v * v, Math.abs(v) * (hk || 0.6) > 0.4 ? 0.0012 : 0.0002) + 0.0002 + 0.4 * TH;
  const segs = lod === 0 ? 3 : 2;
  for (let k = 0; k + 1 < nRow; k++) for (const sg of [-1, 1]) {
    const pts = [];
    for (let q = 0; q <= segs; q++) {
      const u = q / segs, s2 = sRow(k) + (sRow(k + 1) - sRow(k)) * u, hk = half(k) + (half(k + 1) - half(k)) * u, v = sg * (2 * u - 1);
      const phi = Math.PI / 2 + hk * v, sp = surf(clamp(s2, 0, 1), phi);
      const sp2 = surf(clamp(s2 + m2s(0.004) / segs, 0, 1), phi + sg * 0.02), t = G.norm(G.sub(sp2.p, sp.p));
      const over = (sg > 0 ? 0.0009 : 0) * Math.exp(-Math.pow((u - 0.5) / 0.2, 2));   // no cruzamento uma passa por cima
      pts.push({ c: G.add(sp.p, G.scl(sp.n, seat(sp, lift(v, hk)) + over)), n: sp.n, t });
    }
    ribbon(pts, W, TH);
  }
  // passada reta da fileira de baixo (perto do bico) fecha o X
  { const k = nRow - 1, pts = []; for (let q = 0; q <= 4; q++) { const v = -1 + 2 * q / 4, phi = Math.PI / 2 + half(k) * v, sp = surf(clamp(sRow(k), 0, 1), phi), sp2 = surf(clamp(sRow(k), 0, 1), phi + 0.02); pts.push({ c: G.add(sp.p, G.scl(sp.n, seat(sp, lift(v, half(k))))), n: sp.n, t: G.norm(G.sub(sp2.p, sp.p)) }); } ribbon(pts, W, TH); }
  if (lod === 0) {   // laço compacto em cima da primeira fileira
    const s0 = sRow(0) + m2s(0.001), up = lift(0) + 0.6 * TH;
    for (const sg of [-1, 1]) {
      const loop = [];
      for (let q = 0; q <= 5; q++) {
        const th = Math.PI * q / 5, phi = Math.PI / 2 + sg * (0.05 + 0.3 * Math.sin(th)), ds = m2s(0.007 * Math.cos(th) - 0.001);
        const sp = surf(clamp(s0 + ds, 0, 1), phi), sp2 = surf(clamp(s0 + ds - m2s(0.002) * Math.sin(th), 0, 1), phi + sg * 0.02 * Math.cos(th));
        loop.push({ c: G.add(sp.p, G.scl(sp.n, up + 0.0012 * Math.sin(th))), n: sp.n, t: G.norm(G.sub(sp2.p, sp.p)) });
      }
      ribbon(loop, 0.0042, 0.0015);
      const tail = [];
      for (let q = 0; q <= 2; q++) { const u = q / 2, sp = surf(clamp(s0 + m2s(0.003 + 0.02 * u), 0, 1), Math.PI / 2 + sg * (0.1 + 0.3 * u)), sp2 = surf(clamp(s0 + m2s(0.005 + 0.02 * u), 0, 1), Math.PI / 2 + sg * (0.12 + 0.3 * u)); tail.push({ c: G.add(sp.p, G.scl(sp.n, up - 0.0012 * u)), n: sp.n, t: G.norm(G.sub(sp2.p, sp.p)) }); }
      ribbon(tail, 0.0036, 0.0015);
    }
  }
  const nn0 = M.N.slice();
  finishPart(M, (t) => { const v = M.idx[t * 3]; return [nn0[v * 3], nn0[v * 3 + 1], nn0[v * 3 + 2]]; });
  for (let i = 0; i < nn0.length; i++) M.N[i] = nn0[i];   // normais da seção (lisas)
  return M;
}

// um LOD do tênis: cabedal (abertura e base cortadas, simplificado, cores exatas no LOD0), forro, sola e entressola,
// colarinho, lingueta e cadarços
function dbgSeam(tag, base, P, idx, map) {
  if (!process.env.DBG_SEAM) return;
  const em = new Map(), key = (a, b) => a < b ? a + ',' + b : b + ',' + a, id = v => map ? map[v] : v;
  for (let t = 0; t < idx.length; t += 3) for (let e = 0; e < 3; e++) { const a = id(idx[t + e]), b = id(idx[t + (e + 1) % 3]); if (a === b) continue; const k = key(a, b); em.set(k, (em.get(k) || 0) + 1); }
  let nb = 0; const ex = [];
  for (const [k, c] of em) { if (c !== 1) continue; const [a, b] = k.split(',').map(Number); const q = base.frame([(P[a * 3] + P[b * 3]) / 2, (P[a * 3 + 1] + P[b * 3 + 1]) / 2, (P[a * 3 + 2] + P[b * 3 + 2]) / 2]); if (q[0] < 0.03 && q[2] > 0.035 && q[2] < 0.085) { nb++; if (ex.length < 4) ex.push(q.map(v => v.toFixed(4)).join(' ')); } }
  console.log('  costura', base.sd, tag, nb, ex.join(' | '));
}
function shoeLod(base, lod, Sm) {
  const K = base.K, nf = base.fields.length;
  if (lod === 0) dbgSeam('loft', base, base.P, base.idx);
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
    const P32 = Float32Array.from(M.P), tgt = [+(process.env.EP_SHOE_T0 || 360), 170, 44][lod], err = [+(process.env.EP_SHOE_E0 || 0.0012), 0.004, 0.014][lod];
    if (M.idx.length > tgt * 3) M.idx = Array.from(Sm.simplify(Uint32Array.from(M.idx), P32, 3, tgt * 3, err, lod === 0 ? ['LockBorder', 'ErrorAbsolute'] : ['ErrorAbsolute'])[0]);
  }
  if (lod === 0) dbgSeam('simplif', base, M.P, M.idx);
  const lps = boundaryLoops(Uint32Array.from(M.idx)), myl = l => l.reduce((a, v) => a + M.P[v * 3 + 1], 0) / l.length;
  const opening = lps.sort((a, c) => myl(c) - myl(a))[0];
  { const ci = fi('collar'), d = distToLoop(M.P, M.n, opening); for (let i = 0; i < M.n; i++) M.F[ci][i] = Math.min(d[i], 0.05) - 0.009; }
  const colorF = ['hc', 'toe', 'st1', 'st2', 'st3', 'st4', 'st5', 'eye'];
  if (lod === 0) {
    // triângulos cruzados por uma linha de cor bissectados até ≤ 3,5 mm (bordas lisas dos painéis em relevo)
    const cf = ['hc', 'toe', 'st1', 'st2', 'eye'].map(nm => base.fields[fi(nm)][1]), coll = M.F[fi('collar')];
    const R = refineNear({ V: M.V, P: M.P, n: M.n, idx: M.idx, K }, cf, +(process.env.EP_SHOE_RF || 0.0045), 8000);   // v8: 4,5 mm (contornos lisos, dentro do orçamento)
    const dC = distToLoop(R.P, R.n, opening.map(v => v));   // laço: índices antigos continuam válidos (refine só acrescenta)
    M = { ...R, F: base.fields.map(([nm, fn]) => { const a = []; for (let i = 0; i < R.n; i++) a.push(nm === 'collar' ? Math.min(dC[i], 0.05) - 0.009 : fn(R.V, i * K)); return a; }) };
    dbgSeam('refine', base, R.P, R.idx);
    for (const nm of colorF) M = cutBy(M, fi(nm));
    dbgSeam('cortes', base, M.P, M.idx);
  }
  else if (lod === 1) for (const nm of ['hc']) M = cutBy(M, fi(nm));
  const names = base.fields.map(f => f[0]), nt = M.idx.length / 3, tslot = new Uint8Array(nt);
  for (let t = 0; t < nt; t++) {
    const ng = {}; names.forEach((nm, q) => { const f = M.F[q]; ng[nm] = f[M.idx[t * 3]] + f[M.idx[t * 3 + 1]] + f[M.idx[t * 3 + 2]] < 0; });
    tslot[t] = lod === 0 ? base.rule(ng) : lod === 1 && ng.hc ? SL.shoeAccent : SL.shoe;
  }
  cleanIslands(M.idx, M.P, tslot, [1.6e-4, 3e-4, 6e-4][lod]);
  let tsl = tslot;
  if (lod === 0) {
    // v7b: vértices coincidentes (corte passando rente a um vértice) soldados e triângulos degenerados fora antes da
    // simplificação final — com cópias no mesmo lugar o simplificador abria fendas nas costuras (contraforte)
    const wd = weld(Float64Array.from(M.P), M.n, 1e-9), keep = [], ts2 = [];
    for (let t = 0; t < nt; t++) {
      const a = wd.wid[M.idx[t * 3]], b = wd.wid[M.idx[t * 3 + 1]], c = wd.wid[M.idx[t * 3 + 2]];
      if (a === b || b === c || a === c) continue;
      keep.push(wd.rep[a], wd.rep[b], wd.rep[c]); ts2.push(tslot[t]);
    }
    M = { ...M, idx: keep }; tsl = ts2;
    if (process.env.DBG_SEAM) console.log('  solda pré-simplificação', nt - ts2.length, 'degenerados', M.n - wd.nw, 'cópias');
  }
  let dup = splitSlots(M, { fields: base.fields, rule: (ng, t) => tsl[t] });
  if (lod === 0) { const r = Sm.simplify(Uint32Array.from(dup.idx), Float32Array.from(dup.P), 3, 0, 0.0006, ['LockBorder', 'ErrorAbsolute'])[0]; dup = { ...dup, idx: r }; }
  // v7: normais lisas do loft (superfície em (s, φ) antes da simplificação) — o cabedal simplificado não fica facetado
  // (contraforte "amassado"); painéis de destaque (biqueira, contraforte, swoosh, ilhoses, colarinho) em relevo de
  // 1,1 mm com parede viva na borda (aresta nítida que lê de longe; o degrau suave antigo serrilhava)
  const wl = base.well, out = part(), nrmOf = i => { const o = i * K, sp = base.surf(clamp(dup.V[o + 3], 0, 1), Math.atan2(dup.V[o + 5], dup.V[o + 4])); return sp.n; };
  const Nan = new Float64Array(dup.n * 3), Nmesh = vertexNormals(M.P, Uint32Array.from(dup.idx, i => dup.orig[i]), M.n);
  // na ponta do calcanhar (primeira estação do loft é uma linha vertical: normal indefinida) e no bico vale a da malha
  for (let i = 0; i < dup.n; i++) { const sv = dup.V[i * K + 3]; if (sv < base.ST[2] || sv > base.ST[base.NSt - 2]) Nan.set(Nmesh.subarray(dup.orig[i] * 3, dup.orig[i] * 3 + 3), i * 3); else Nan.set(nrmOf(i), i * 3); }
  if (lod === 0) dbgSeam('slots', base, M.P, Array.from(dup.idx), dup.orig);
  const Pd = Float64Array.from(dup.P), H = 0.0012, HE = 0.0005, relV = new Uint8Array(dup.n);
  const acc = i => dup.slot[i] === SL.shoeAccent;
  if (lod === 0) {
    // v8: painéis sobrepostos com a borda arredondada — sobem 0,5 mm na borda (parede baixa) e 1,2 mm a partir de 3 mm
    // para dentro (chanfro liso), com a normal do chanfro tirada da malha (sombreia como uma borda redonda, não como uma
    // chapa recortada)
    const onB = new Uint8Array(M.n), isA = new Uint8Array(M.n), isN = new Uint8Array(M.n);
    for (let i = 0; i < dup.n; i++) (acc(i) ? isA : isN)[dup.orig[i]] = 1;
    for (let o = 0; o < M.n; o++) onB[o] = isA[o] && isN[o] ? 1 : 0;
    const dE = new Float64Array(M.n).fill(1e9), q = [], adjA = new Map();
    for (let t = 0; t < dup.idx.length; t += 3) { if (!acc(dup.idx[t])) continue; for (let e = 0; e < 3; e++) { const a = dup.orig[dup.idx[t + e]], b = dup.orig[dup.idx[t + (e + 1) % 3]]; if (!adjA.has(a)) adjA.set(a, new Set()); if (!adjA.has(b)) adjA.set(b, new Set()); adjA.get(a).add(b); adjA.get(b).add(a); } }
    for (let o = 0; o < M.n; o++) if (onB[o]) { dE[o] = 0; q.push(o); }
    for (let it = 0; it < q.length; it++) { const v = q[it]; for (const u of adjA.get(v) || []) { const d = dE[v] + Math.hypot(M.P[u * 3] - M.P[v * 3], M.P[u * 3 + 1] - M.P[v * 3 + 1], M.P[u * 3 + 2] - M.P[v * 3 + 2]); if (d < dE[u] && d < 0.004) { dE[u] = d; q.push(u); } } }
    const raise = o => HE + (H - HE) * smoothstep(0, 0.003, dE[o] > 1 ? 1 : dE[o]);
    // relevo só na biqueira, no contraforte e no swoosh (os painéis dos ilhoses ficam rentes: estão embaixo dos cadarços)
    const fv = nm => base.fields[fi(nm)][1];
    const fToe = fv('toe'), fHc = fv('hc'), fS = ['st1', 'st2', 'st3', 'st4', 'st5'].map(fv);
    for (let i = 0; i < dup.n; i++) relV[i] = acc(i) && (fToe(dup.V, i * K) < 1e-6 || fHc(dup.V, i * K) < 1e-6 || fS.every(f => f(dup.V, i * K) < 1e-6)) ? 1 : 0;
    for (let i = 0; i < dup.n; i++) if (relV[i]) { const r = raise(dup.orig[i]); for (let k = 0; k < 3; k++) Pd[i * 3 + k] += Nan[i * 3 + k] * r; }
    const accTri = []; for (let t = 0; t < dup.idx.length; t += 3) if (acc(dup.idx[t])) accTri.push(dup.idx[t], dup.idx[t + 1], dup.idx[t + 2]);
    const Nb = vertexNormals(Pd, Uint32Array.from(accTri), dup.n);
    for (let i = 0; i < dup.n; i++) {
      if (!relV[i]) continue; const d = dE[dup.orig[i]]; if (!(d < 0.003)) continue;
      const f = 0.65 * (1 - d / 0.003), l = Math.hypot(Nb[i * 3], Nb[i * 3 + 1], Nb[i * 3 + 2]); if (l < 0.5) continue;
      const nn = G.norm([Nan[i * 3] * (1 - f) + Nb[i * 3] * f, Nan[i * 3 + 1] * (1 - f) + Nb[i * 3 + 1] * f, Nan[i * 3 + 2] * (1 - f) + Nb[i * 3 + 2] * f]);
      Nan[i * 3] = nn[0]; Nan[i * 3 + 1] = nn[1]; Nan[i * 3 + 2] = nn[2];
    }
  }
  for (let i = 0; i < dup.n; i++) addV(out, [Pd[i * 3], Pd[i * 3 + 1], Pd[i * 3 + 2]], Nan.subarray(i * 3, i * 3 + 3), dup.slot[i]);
  for (const i of dup.idx) out.idx.push(i);
  if (lod === 0) {
    // paredes: arestas da casca (soldada por orig) entre um triângulo de destaque e um comum
    const em = new Map(), ek = (a, b) => a < b ? a * 1e6 + b : b * 1e6 + a;
    for (let t = 0; t < dup.idx.length; t += 3) for (let e = 0; e < 3; e++) { const a = dup.idx[t + e], b = dup.idx[t + (e + 1) % 3], k = ek(dup.orig[a], dup.orig[b]); if (!em.has(k)) em.set(k, []); em.get(k).push([t, a, b]); }
    let nw = 0;
    for (const L of em.values()) {
      if (L.length !== 2) continue;
      const [x, y] = L, ax = acc(x[1]), ay = acc(y[1]); if (ax === ay) continue;
      const A = ax ? x : y, Bt = ax ? y : x;   // A: lado do destaque (levantado); B: lado comum
      if (!relV[A[1]] && !relV[A[2]]) continue;   // v8: painel rente (ilhoses): sem parede
      // vértices do lado comum com o mesmo orig das pontas da aresta do destaque
      const findB = o => [Bt[1], Bt[2]].find(v => dup.orig[v] === o);
      const a1 = A[1], a2 = A[2], b1 = findB(dup.orig[a1]), b2 = findB(dup.orig[a2]); if (b1 === undefined || b2 === undefined) continue;
      // normal da parede: perpendicular à aresta, no plano tangente, para fora do painel
      const pa = Pd.slice(b1 * 3, b1 * 3 + 3), pb = Pd.slice(b2 * 3, b2 * 3 + 3), nm = G.norm(G.add(Nan.slice(b1 * 3, b1 * 3 + 3), Nan.slice(b2 * 3, b2 * 3 + 3)));
      const t0 = A[0], cA = [0, 1, 2].map(k => (Pd[dup.idx[t0] * 3 + k] + Pd[dup.idx[t0 + 1] * 3 + k] + Pd[dup.idx[t0 + 2] * 3 + k]) / 3);
      let wn = G.norm(G.cross(G.sub(pb, pa), nm)); if (G.dot(wn, G.sub(pa, cA)) < 0) wn = G.scl(wn, -1);
      const v0 = addV(out, pa, wn, SL.shoeAccent), v1 = addV(out, pb, wn, SL.shoeAccent), v2 = addV(out, Pd.slice(a2 * 3, a2 * 3 + 3), wn, SL.shoeAccent), v3 = addV(out, Pd.slice(a1 * 3, a1 * 3 + 3), wn, SL.shoeAccent);
      const f = G.cross(G.sub(pb, pa), G.sub(Pd.slice(a1 * 3, a1 * 3 + 3), pa));
      if (G.dot(f, wn) >= 0) out.idx.push(v0, v1, v2, v0, v2, v3); else out.idx.push(v0, v2, v1, v0, v3, v2);
      nw++;
    }
    if (process.env.DBG_SHOE) console.log('  tênis paredes', nw);
  }
  const nShellV = dup.n, nShell = out.idx.length;
  const NWd = Nan;
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
      // v7b: em cima o laço inteiro (fecha com a borda do cabedal); embaixo (palmilha) um ponto sim, outro não
      const top = loopP.map(p => addV(L, p, [0, 0, 0], SL.lining)), step = lod === 0 ? 2 : 1, mb = Math.ceil(m / step);
      const bot = []; for (let q = 0; q < mb; q++) { const p = loopP[q * step], d = G.norm([cx - p[0], 0, cz - p[2]]); bot.push(addV(L, [p[0] + d[0] * 0.007, 0.042, p[2] + d[2] * 0.007], [0, 0, 0], SL.lining)); }
      for (let q = 0; q < mb; q++) {
        const j0 = q * step, j1 = Math.min(m, (q + 1) * step), b0 = bot[q], b1 = bot[(q + 1) % mb];
        for (let j = j0; j < j1; j++) L.idx.push(top[j], b0, top[(j + 1) % m]);
        L.idx.push(top[j1 % m], b0, b1);
      }
      const nWall = L.idx.length / 3, ci = addV(L, [cx, 0.042, cz], [0, 1, 0], SL.lining);
      for (let q = 0; q < mb; q++) L.idx.push(bot[q], ci, bot[(q + 1) % mb]);
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
    { const cr = collarRoll(rs, wl, base.F.a); dbg('colarinho', cr); merge(out, cr); merge(out, heelTab(rs, wl)); }
  }
  if (lod < 2) {
    const tg = tongue(base, front, lod), und = part(); merge(und, out); merge(und, tg);
    const lc = laces(base, front, lod, new BVH(Float64Array.from(und.P), Uint32Array.from(und.idx)));
    dbg('lingueta', tg); dbg('cadarços', lc); merge(out, tg); merge(out, lc);
  }
  return { P: Float64Array.from(out.P), N: Float64Array.from(out.N), n: out.P.length / 3, idx: Uint32Array.from(out.idx), slot: Uint8Array.from(out.slot), nShell, nShellV };
}

// tênis prontos (os dois lados) + apaga o pé de dentro
export function buildShoes(C, rays) {
  const Sm = simplifier(), out = { P: [], N: [], J: [], W: [], A: [], lods: [[], [], []], n: 0 };
  const deleteMask = new Uint8Array(C.body.idx.length / 3);
  const rep = {}, b = C.body;
  // v7b: oclusão sem o pé do corpo (ele fica dentro do tênis e é apagado; onde a pele encostava/furava a base do
  // cabedal no arco, a oclusão fazia uma cunha escura no meio do pé)
  const fL = BI.footL, fR = BI.footR, WIb = b.widx;
  const bodyAO = new BVH(b.PW, WIb, t => { let k = 0; for (let e = 0; e < 3; e++) { const w = WIb[t * 3 + e], v = b.weld.rep[w]; if (b.Wd[v * 17 + fL] + b.Wd[v * 17 + fR] > 0.5 && b.PW[w * 3 + 1] < 0.1) k++; } return k < 2; });
  for (const sd of ['L', 'R']) {
    const base = buildShoe(C, sd), fb = BI['foot' + sd], kb = BI['knee' + sd];
    const L = [0, 1, 2].map(l => shoeLod(base, l, Sm));
    const shell0 = new BVH(L[0].P, L[0].idx);
    const inside = (x, y, z) => { let hits = 0; for (const d of [[0, 1, 0], [0.3, 0.1, 0.95], [-0.7, 0.2, -0.6]]) { const dn = G.norm(d), h = shell0.ray(x, y, z, dn[0], dn[1], dn[2], 1); if (h) hits++; } return hits >= 2; };
    const counts = [];
    for (const S of L) {
      const N = S.N;
      const used = new Uint8Array(S.n); for (const i of S.idx) used[i] = 1;   // vértices soltos dos cortes têm normal nula
      // v7b: o cabedal e as peças de cima não são ocluídos pela sola/entressola (a aba da entressola escurecia toda a
      // borda de baixo do cabedal e, interpolado em triângulos compridos, virava cunhas escuras); a sola usa tudo
      const isSole = i => S.slot[i] === SL.sole || S.slot[i] === SL.midsole, triU = [];
      for (let t = 0; t < S.idx.length; t += 3) if (!isSole(S.idx[t])) triU.push(S.idx[t], S.idx[t + 1], S.idx[t + 2]);
      const onlyS = used.map((u, i) => u && isSole(i) ? 1 : 0), onlyU = used.map((u, i) => u && !isSole(i) ? 1 : 0);
      const aoS = rayAO([new BVH(S.P, S.idx), bodyAO], S.P, N, S.n, { rays, maxD: 0.12, k: 0.55, offset: 0.0015, only: onlyS });
      const aoU = rayAO([new BVH(S.P, Uint32Array.from(triU)), bodyAO], S.P, N, S.n, { rays, maxD: 0.12, k: 0.55, offset: 0.0015, only: onlyU });
      const ao = aoS.map((v, i) => isSole(i) ? v : aoU[i]);
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
