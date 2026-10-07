// Poses de teste e verificações com pose (ESPEC §15). O esqueleto é deformado na CPU exatamente como o three.js
// (LBS, Euler XYZ, osso = pai × T(pos) × R(rot), matriz de pele = mundo × inverso do repouso) e a malha montada por
// ModelData.assemble é testada contra o corpo inteiro:
//   - pele que fura a roupa: vértice de pele que em repouso está por dentro da peça (perto dela) e na pose fica mais de
//     2 mm por fora (teste "flip" — pele×top, pele×baixo, baixo×top, pele×meia, meia×tênis, pele×tênis);
//   - roupa vazada: raios ortográficos de 6 vistas; onde o corpo inteiro (sem cortes) é atingido mas a malha montada
//     não mostra nenhuma face de frente na mesma profundidade (± 3 cm), o fundo (ou o outro lado) aparece por um furo;
//   - esticamento: arestas da roupa que passam de 1,6× o comprimento de repouso.
// As poses de corrida são as do jogo (cópia da matemática de RunnerRig.animate: IK do pé plantado, braço que fecha até
// ~5° do corpo); as estáticas são os extremos (sprint, joelho alto, braços à frente/atrás, comemoração a 2,2 rad, pé
// em ponta).
import { BVH } from './geom.mjs';

const U = {
  clamp: (v, a, b) => v < a ? a : v > b ? b : v,
  lerp: (a, b, t) => a + (b - a) * t,
  smooth: t => { t = t < 0 ? 0 : t > 1 ? 1 : t; return t * t * (3 - 2 * t); },
  table: (pts, x) => {
    if (x <= pts[0][0]) return pts[0][1];
    for (let i = 1; i < pts.length; i++) if (x <= pts[i][0]) { const a = pts[i - 1], b = pts[i]; return a[1] + (b[1] - a[1]) * (x - a[0]) / (b[0] - a[0]); }
    return pts[pts.length - 1][1];
  }
};
// tabelas de RunnerRig.js (passada e tempo de apoio)
const STRIDE = [[0, 0.85], [4, 0.9], [6, 1.02], [7.5, 1.3], [10, 1.36], [12, 1.4], [15, 1.45], [20, 1.52], [22, 1.55]];
const DUTY = [[4, 0.62], [6, 0.6], [7.5, 0.42], [10, 0.37], [15, 0.31], [20, 0.27], [24, 0.24]];

// ---------------------------------------------------------------- matrizes (coluna maior, como o three.js)
function mul(a, b) { const o = new Float64Array(16); for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { let s = 0; for (let k = 0; k < 4; k++) s += a[k * 4 + j] * b[i * 4 + k]; o[i * 4 + j] = s; } return o; }
function eulerXYZ(x, y, z, t) {
  const a = Math.cos(x), b = Math.sin(x), c = Math.cos(y), d = Math.sin(y), e = Math.cos(z), f = Math.sin(z);
  const ae = a * e, af = a * f, be = b * e, bf = b * f, m = new Float64Array(16);
  m[0] = c * e; m[4] = -c * f; m[8] = d; m[1] = af + be * d; m[5] = ae - bf * d; m[9] = -b * c; m[2] = bf - ae * d; m[6] = be + af * d; m[10] = a * c;
  m[15] = 1; m[12] = t[0]; m[13] = t[1]; m[14] = t[2];
  return m;
}
// pose = { osso: { r: [x, y, z], t?: [x, y, z] } } → matrizes de pele (uma por osso)
export function skinMats(ch, pose) {
  const B = ch.bones, n = B.names.length, W = [], R = [];
  for (let i = 0; i < n; i++) {
    const nm = B.names[i], p = pose[nm] || {}, r = p.r || [0, 0, 0], t = p.t || B.pos[i], pa = B.parent[i];
    const L = eulerXYZ(r[0], r[1], r[2], t), Lr = eulerXYZ(0, 0, 0, B.pos[i]);
    W[i] = pa < 0 ? L : mul(W[pa], L); R[i] = pa < 0 ? Lr : mul(R[pa], Lr);
  }
  return W.map((w, i) => { const inv = new Float64Array(16); inv[0] = inv[5] = inv[10] = inv[15] = 1; inv[12] = -R[i][12]; inv[13] = -R[i][13]; inv[14] = -R[i][14]; return mul(w, inv); });
}
export function skin(m, S) {
  const n = m.n, P = new Float64Array(n * 3), N = new Float64Array(n * 3);
  for (let v = 0; v < n; v++) {
    let x = 0, y = 0, z = 0, nx = 0, ny = 0, nz = 0;
    const px = m.position[v * 3], py = m.position[v * 3 + 1], pz = m.position[v * 3 + 2], qx = m.normal[v * 3], qy = m.normal[v * 3 + 1], qz = m.normal[v * 3 + 2];
    for (let k = 0; k < 4; k++) {
      const w = m.skinWeight[v * 4 + k]; if (!w) continue;
      const M = S[m.skinIndex[v * 4 + k]];
      x += w * (M[0] * px + M[4] * py + M[8] * pz + M[12]); y += w * (M[1] * px + M[5] * py + M[9] * pz + M[13]); z += w * (M[2] * px + M[6] * py + M[10] * pz + M[14]);
      nx += w * (M[0] * qx + M[4] * qy + M[8] * qz); ny += w * (M[1] * qx + M[5] * qy + M[9] * qz); nz += w * (M[2] * qx + M[6] * qy + M[10] * qz);
    }
    const l = Math.hypot(nx, ny, nz) || 1;
    P[v * 3] = x; P[v * 3 + 1] = y; P[v * 3 + 2] = z; N[v * 3] = nx / l; N[v * 3 + 1] = ny / l; N[v * 3 + 2] = nz / l;
  }
  return { P, N };
}

// ---------------------------------------------------------------- medidas do RunnerRig (rigOf)
export function rigOf(MD, g) {
  const c = MD.char(g), B = c.bones, idx = {}, W = [];
  for (let i = 0; i < B.names.length; i++) { idx[B.names[i]] = i; const p = B.parent[i], r = B.pos[i]; W.push(p < 0 ? r.slice() : [W[p][0] + r[0], W[p][1] + r[1], W[p][2] + r[2]]); }
  const rel = n => B.pos[idx[n]], at = n => W[idx[n]], vlen = v => Math.hypot(v[0], v[1], v[2]);
  const kn = rel('kneeL'), ft = rel('footL'), el = rel('elbowL'), wr = c.anchors.wristL.pos, ank = at('footL');
  const R = { g, c, scale: (c.heightReal || 1.76) / (c.space || 1.76), HIP_H: at('hips')[1], LEG_Y: rel('legL')[1], THIGH: vlen(kn), SHIN: vlen(ft),
    aT: Math.atan2(-kn[2], -kn[1]), aS: Math.atan2(-ft[2], -ft[1]), armAbd: Math.atan2(Math.abs(el[0]), -el[1]),
    foreFlex: Math.atan2(-wr[2], Math.sqrt(wr[0] * wr[0] + wr[1] * wr[1])), SOLE_Y: -ank[1], hipsPos: B.pos[idx.hips] };
  R.LEG_MAX = (R.THIGH + R.SHIN) * 0.999;
  const sh = MD.part(g, 'shoes'); let heel = -Infinity, flat = Infinity;
  if (sh) for (let i = 0; i < sh.n; i++) { const x = sh.position[i * 3], y = sh.position[i * 3 + 1], z = sh.position[i * 3 + 2]; if (x > 0) continue; if (z > heel) heel = z; if (y < 0.008 && z < flat) flat = z; }
  if (!isFinite(heel) || !isFinite(flat)) { const fl = c.measures.footLen || 0.3; heel = ank[2] + fl * 0.25; flat = ank[2] - fl * 0.66; }
  R.HEEL_F = ank[2] - heel + 0.006; R.TOE_F = ank[2] - flat;
  return R;
}
function ankleOn(R, gf, th, pf, out) { const c = Math.cos(th), s = Math.sin(th); out.y = -(R.SOLE_Y * c + pf * s); out.f = gf - (pf * c - R.SOLE_Y * s); return out; }
function legIK(R, hipY, ay, af, th) {
  const T = R.THIGH, S = R.SHIN; let dy = ay - hipY, d = Math.sqrt(dy * dy + af * af);
  if (d > R.LEG_MAX) { dy *= R.LEG_MAX / d; af *= R.LEG_MAX / d; d = R.LEG_MAX; }
  d = Math.max(d, 1e-4);
  const t1 = Math.atan2(af, -dy) + Math.acos(U.clamp((T * T + d * d - S * S) / (2 * T * d), -1, 1));
  const t2 = t1 + Math.acos(U.clamp((T * T + S * S - d * d) / (2 * T * S), -1, 1)) - Math.PI;
  const leg = t1 - R.aT, knee = t2 - R.aS - leg;
  return [leg, knee, th - (t2 - R.aS)];
}
// pose de corrida do jogo (RunnerRig.animate sem as molas do cabelo, que ganham o ângulo de equilíbrio)
export function gameRun(R, ph, speed) {
  const run = U.smooth((speed - 5.8) / 2.6), sprint = U.smooth((speed - 14) / 5), freq = U.table(STRIDE, speed), duty = U.table(DUTY, speed);
  const s = Math.sin(ph), c = Math.cos(ph);
  const D = speed / 3.6 / R.scale * duty / freq, land = D * U.lerp(0.48, 0.38, run) + 0.02;
  const thTD = U.lerp(0.28, 0.12, run), thTO = -U.lerp(0.4, 0.75, run), lift = U.lerp(0.07, 0.3, run) + sprint * 0.12;
  let hipMax = 9; const t = [{}, {}], fa = {}, fb = {};
  for (let i = 0; i < 2; i++) {
    const u = ((ph / (Math.PI * 2) + i * 0.5) % 1 + 1) % 1, k = (u - 0.5 + duty / 2) / duty;
    if (k >= 0 && k <= 1) {
      const heel = land + R.HEEL_F - D * k;
      t[i].th = k < 0.2 ? thTD * (1 - U.smooth(k / 0.2)) : k > 0.5 ? thTO * U.smooth((k - 0.5) / 0.5) : 0;
      if (t[i].th >= 0) ankleOn(R, heel, t[i].th, R.HEEL_F, t[i]); else ankleOn(R, heel + R.TOE_F - R.HEEL_F, t[i].th, R.TOE_F, t[i]);
      hipMax = Math.min(hipMax, t[i].y + Math.sqrt(Math.max(0, R.LEG_MAX * R.LEG_MAX - t[i].f * t[i].f)));
    } else {
      const w = (k > 1 ? k - 1 : k + 1 / duty - 1) * duty / (1 - duty), e = U.smooth(w);
      ankleOn(R, land + R.HEEL_F - D + R.TOE_F - R.HEEL_F, thTO, R.TOE_F, fa);
      ankleOn(R, land + R.HEEL_F, thTD, R.HEEL_F, fb);
      t[i].f = U.lerp(fa.f, fb.f, e);
      t[i].y = U.lerp(fa.y, fb.y, e) + lift * Math.pow(Math.sin(Math.PI * Math.pow(w, 0.75)), 1.2);
      t[i].th = U.lerp(thTO, thTD, U.smooth(w * 1.4 - 0.2));
    }
  }
  const bob = Math.abs(Math.cos(ph - 0.35));
  const hy = R.HIP_H - run * 0.035 - U.lerp(0.012, 0.045, run) * (bob - 0.5) - 0.012 * (1 - run);
  const hipsY = Math.max(Math.min(hy, hipMax - R.LEG_Y), hy - 0.07), hipY = hipsY + R.LEG_Y;
  const hz = 0.035 * c * (1 - run * 0.4);
  const L = legIK(R, hipY, t[0].y, t[0].f, t[0].th), Rr = legIK(R, hipY, t[1].y, t[1].f, t[1].th);
  const aa = U.lerp(0.26, 0.55, run) + sprint * 0.2, elbow = U.lerp(0.3, 1.5, run) + sprint * 0.12 - R.foreFlex, abd = R.armAbd - (0.07 + run * 0.03);
  const lean = U.lerp(0.035, 0.11, run) + sprint * 0.06;
  const tx = -(0.15 + run * 0.45 + (bob - 0.5) * 0.35 * run), tz = -s * 0.25 * (0.3 + run * 0.7);
  return {
    hips: { t: [R.hipsPos[0], hipsY, R.hipsPos[2]], r: [0, -0.08 * s, hz] },
    legL: { r: [L[0], 0, 0.015] }, kneeL: { r: [L[1], 0, 0] }, footL: { r: [L[2], 0, -0.015 - hz] },
    legR: { r: [Rr[0], 0, -0.015] }, kneeR: { r: [Rr[1], 0, 0] }, footR: { r: [Rr[2], 0, 0.015 - hz] },
    armL: { r: [-aa * s - 0.04 * run, 0, abd] }, armR: { r: [aa * s - 0.04 * run, 0, -abd] },
    elbowL: { r: [elbow + 0.2 * Math.max(0, s) * run, 0, 0.16 * run] }, elbowR: { r: [elbow + 0.2 * Math.max(0, -s) * run, 0, -0.16 * run] },
    torso: { r: [-lean, 0.14 * s * (0.6 + run * 0.4), -0.02 * c] }, head: { r: [lean * 0.7 + 0.02 * (bob - 0.5) * run, -0.1 * s * (0.6 + run * 0.4), 0.02 * c] },
    pony: { r: [tx, 0, tz] }, pony2: { r: [tx * 0.6, 0, tz * 0.6] }, hairA: { r: [U.clamp(tx * 0.8, -0.6, 0.1), 0, tz * 0.5] }, hairA2: { r: [U.clamp(tx * 0.5, -0.6, 0.1), 0, tz * 0.3] }
  };
}
// extremos estáticos (os da revisão: sprint, joelho alto, braços, comemoração 2,2 rad, pé em ponta)
export function staticPoses(R) {
  const hy = R.HIP_H, hz = R.hipsPos[2], A0 = R.armAbd;
  return {
    armsFwd: { armL: { r: [0.75, 0, -0.07] }, armR: { r: [-0.75, 0, 0.07] }, elbowL: { r: [1.6, 0, 0] }, elbowR: { r: [1.6, 0, 0] }, torso: { r: [-0.1, 0.14, 0] } },
    armsBack: { armL: { r: [-0.75, 0, -0.07] }, armR: { r: [0.75, 0, 0.07] }, elbowL: { r: [1.6, 0, 0] }, elbowR: { r: [1.6, 0, 0] }, torso: { r: [-0.1, -0.14, 0] } },
    // braços fechados como no jogo (abertura de repouso − 0,1 rad) e balanço máximo do sprint
    armsTight: { armL: { r: [-0.79, 0, A0 - 0.1] }, armR: { r: [0.71, 0, -(A0 - 0.1)] }, elbowL: { r: [1.62, 0, 0.16] }, elbowR: { r: [1.62, 0, -0.16] }, torso: { r: [-0.17, 0.14, 0] } },
    kneeLift: { legL: { r: [1.0, 0, 0.015] }, kneeL: { r: [-1.8, 0, 0] }, footL: { r: [0.8, 0, 0] }, legR: { r: [-0.35, 0, -0.015] }, kneeR: { r: [-0.2, 0, 0] }, hips: { t: [0, hy - 0.04, hz], r: [0, 0.08, 0] }, torso: { r: [-0.17, -0.14, 0] } },
    sprint: { legL: { r: [1.0, 0, 0.015] }, kneeL: { r: [-1.8, 0, 0] }, footL: { r: [0.3, 0, 0] }, legR: { r: [-0.5, 0, -0.015] }, kneeR: { r: [-0.9, 0, 0] }, footR: { r: [0.6, 0, 0] },
      armL: { r: [-0.75, 0, -0.1] }, armR: { r: [0.75, 0, 0.1] }, elbowL: { r: [1.62, 0, 0.16] }, elbowR: { r: [1.62, 0, -0.16] }, hips: { t: [0, hy - 0.06, hz], r: [0, -0.08, 0.02] }, torso: { r: [-0.17, 0.14, 0] }, head: { r: [0.12, -0.1, 0] } },
    legBack: { legL: { r: [-0.6, 0, 0.015] }, kneeL: { r: [-0.4, 0, 0] }, footL: { r: [0.6, 0, 0] }, legR: { r: [0.4, 0, 0] }, kneeR: { r: [-0.1, 0, 0] } },
    celebrate22: { armL: { r: [2.2, 0, A0 - 0.3] }, armR: { r: [2.2, 0, -(A0 - 0.3)] }, elbowL: { r: [0.3 - R.foreFlex, 0, 0] }, elbowR: { r: [0.3 - R.foreFlex, 0, 0] }, torso: { r: [0.05, 0, 0] } },
    footPF: { footL: { r: [1.4, 0, 0] }, footR: { r: [1.2, 0, 0] }, kneeL: { r: [-0.3, 0, 0] }, kneeR: { r: [-0.6, 0, 0] }, legR: { r: [0.3, 0, 0] } },
    footDF: { footL: { r: [-0.45, 0, 0] }, footR: { r: [-0.3, 0, 0] }, kneeL: { r: [-0.6, 0, 0] }, legL: { r: [0.3, 0, 0] } }
  };
}

// ---------------------------------------------------------------- partes da malha montada
const PART = { skin: 'skin', shirt: 'top', shirtTrim: 'top', shirtAccent: 'top', shorts: 'bot', shortsTrim: 'bot', shortsAccent: 'bot', sock: 'sock', sockTrim: 'sock',
  shoe: 'shoe', shoeAccent: 'shoe', sole: 'shoe', midsole: 'shoe', lace: 'shoe', lining: 'shoe' };
export function partsOf(ch, m) { const p = new Array(m.n); for (let v = 0; v < m.n; v++) p[v] = PART[ch.slots[m.slot[v]]] || 'other'; return p; }

function closestOnTri(p, a, b, c) {
  const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], ac = [c[0] - a[0], c[1] - a[1], c[2] - a[2]], ap = [p[0] - a[0], p[1] - a[1], p[2] - a[2]];
  const dot = (u, v) => u[0] * v[0] + u[1] * v[1] + u[2] * v[2], d1 = dot(ab, ap), d2 = dot(ac, ap);
  if (d1 <= 0 && d2 <= 0) return [1, 0, 0];
  const bp = [p[0] - b[0], p[1] - b[1], p[2] - b[2]], d3 = dot(ab, bp), d4 = dot(ac, bp);
  if (d3 >= 0 && d4 <= d3) return [0, 1, 0];
  const vc = d1 * d4 - d3 * d2; if (vc <= 0 && d1 >= 0 && d3 <= 0) { const v = d1 / (d1 - d3); return [1 - v, v, 0]; }
  const cp = [p[0] - c[0], p[1] - c[1], p[2] - c[2]], d5 = dot(ab, cp), d6 = dot(ac, cp);
  if (d6 >= 0 && d5 <= d6) return [0, 0, 1];
  const vb = d5 * d2 - d1 * d6; if (vb <= 0 && d2 >= 0 && d6 <= 0) { const w = d2 / (d2 - d6); return [1 - w, 0, w]; }
  const va = d3 * d6 - d5 * d4; if (va <= 0 && (d4 - d3) >= 0 && (d5 - d6) >= 0) { const w = (d4 - d3) / ((d4 - d3) + (d5 - d6)); return [0, 1 - w, w]; }
  const den = 1 / (va + vb + vc), v = vb * den, w = vc * den; return [1 - v - w, v, w];
}
// triângulos de uma parte (sem forro/face de dentro) e os vértices de borda dela
function partTris(m, parts, outer) {
  const ix = m.index, tris = [], ec = new Map();
  for (let t = 0; t < ix.length; t += 3) {
    const a = ix[t], b = ix[t + 1], c = ix[t + 2];
    if (parts[a] !== outer || parts[b] !== outer || parts[c] !== outer) continue;
    for (const [u, w] of [[a, b], [b, c], [c, a]]) { const k = u < w ? u * 1e6 + w : w * 1e6 + u; ec.set(k, (ec.get(k) || 0) + 1); }
    if ((m.flags[a] | m.flags[b] | m.flags[c]) & 2) continue;
    tris.push(a, b, c);
  }
  const bnd = new Set(); for (const [k, c] of ec) if (c === 1) { bnd.add(Math.floor(k / 1e6)); bnd.add(k % 1e6); }
  return { tris: Uint32Array.from(tris), bnd };
}
// distância com sinal de cada vértice "de dentro" até a parte de fora (face mais próxima; projeção dentro da face;
// face sem vértice de borda; normal geométrica orientada pelas normais dos vértices). null = sem face perto.
function signedTo(m, P, N, parts, inner, outer, maxD = 0.03) {
  const { tris, bnd } = partTris(m, parts, outer), out = new Map();
  if (!tris.length) return out;
  const bvh = new BVH(P, tris), used = new Uint8Array(m.n);
  for (let i = 0; i < m.index.length; i++) used[m.index[i]] = 1;
  for (let v = 0; v < m.n; v++) {
    if (!used[v] || parts[v] !== inner || (m.flags[v] & 2)) continue;
    const h = bvh.closest(P[v * 3], P[v * 3 + 1], P[v * 3 + 2], maxD);
    if (h.tri < 0) continue;
    const A = tris[h.tri * 3], B = tris[h.tri * 3 + 1], Cc = tris[h.tri * 3 + 2];
    if (bnd.has(A) || bnd.has(B) || bnd.has(Cc)) continue;
    if (Math.min(h.u, h.v, h.w) < 0.001) continue;
    const a = [P[A * 3], P[A * 3 + 1], P[A * 3 + 2]], b = [P[B * 3], P[B * 3 + 1], P[B * 3 + 2]], c = [P[Cc * 3], P[Cc * 3 + 1], P[Cc * 3 + 2]];
    let n = [(b[1] - a[1]) * (c[2] - a[2]) - (b[2] - a[2]) * (c[1] - a[1]), (b[2] - a[2]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[2] - a[2]), (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])];
    const vn = [0, 1, 2].map(k => N[A * 3 + k] + N[B * 3 + k] + N[Cc * 3 + k]);
    if (n[0] * vn[0] + n[1] * vn[1] + n[2] * vn[2] < 0) n = n.map(x => -x);
    const l = Math.hypot(...n) || 1;
    const s = ((P[v * 3] - h.x) * n[0] + (P[v * 3 + 1] - h.y) * n[1] + (P[v * 3 + 2] - h.z) * n[2]) / l;
    out.set(v, s);
  }
  return out;
}
export const FLIP_PAIRS = [['skin', 'top'], ['skin', 'bot'], ['bot', 'top'], ['skin', 'sock'], ['sock', 'shoe'], ['skin', 'shoe'], ['bot', 'sock'], ['bot', 'shoe']];
// pele (ou camada de baixo) que fica por fora da peça na pose, tendo estado por dentro em repouso
export function flipTest(m, parts, rest, posed, pairs = FLIP_PAIRS, tol = 0.002) {
  const res = {};
  for (const [i, o] of pairs) {
    const r0 = signedTo(m, rest.P, rest.N, parts, i, o), r1 = signedTo(m, posed.P, posed.N, parts, i, o);
    const bad = [];
    for (const [v, s] of r1) if (s > tol && r0.has(v) && r0.get(v) < 0) bad.push([v, s]);
    if (bad.length) res[i + '>' + o] = { n: bad.length, max: Math.max(...bad.map(x => x[1])), pts: bad.sort((a, b) => b[1] - a[1]).slice(0, 4).map(([v]) => [posed.P[v * 3], posed.P[v * 3 + 1], posed.P[v * 3 + 2]].map(x => +x.toFixed(3))) };
  }
  return res;
}

// ---------------------------------------------------------------- vazados (raios)
// primeiro acerto de FRENTE ao longo do raio (as faces de trás não aparecem no material de um lado só)
function firstFront(bvh, P, idx, o, d, tmax) {
  let t0 = 0;
  for (let guard = 0; guard < 12; guard++) {
    const h = bvh.ray(o[0] + d[0] * t0, o[1] + d[1] * t0, o[2] + d[2] * t0, d[0], d[1], d[2], tmax - t0);
    if (!h) return null;
    const a = idx[h.tri * 3] * 3, b = idx[h.tri * 3 + 1] * 3, c = idx[h.tri * 3 + 2] * 3;
    const e1 = [P[b] - P[a], P[b + 1] - P[a + 1], P[b + 2] - P[a + 2]], e2 = [P[c] - P[a], P[c + 1] - P[a + 1], P[c + 2] - P[a + 2]];
    const n = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
    if (n[0] * d[0] + n[1] * d[1] + n[2] * d[2] < 0) return { t: t0 + h.t, tri: h.tri };
    t0 += h.t + 1e-5;
  }
  return null;
}
// saída do corpo depois da entrada em t0: primeira face de trás ao longo do raio
function exitAfter(bvh, P, idx, o, d, t0) {
  let t = t0 + 1e-4;
  for (let guard = 0; guard < 12; guard++) {
    const h = bvh.ray(o[0] + d[0] * t, o[1] + d[1] * t, o[2] + d[2] * t, d[0], d[1], d[2], 4);
    if (!h) return t;
    const a = idx[h.tri * 3] * 3, b = idx[h.tri * 3 + 1] * 3, c = idx[h.tri * 3 + 2] * 3;
    const e1 = [P[b] - P[a], P[b + 1] - P[a + 1], P[b + 2] - P[a + 2]], e2 = [P[c] - P[a], P[c + 1] - P[a + 1], P[c + 2] - P[a + 2]];
    const n = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
    t += h.t + 1e-5;
    if (n[0] * d[0] + n[1] * d[1] + n[2] * d[2] > 0) return t;
  }
  return t;
}
export const VIEWS6 = [[0, 0], [Math.PI, 0], [Math.PI / 2, 0], [-Math.PI / 2, 0], [0.75, 0.35], [-2.4, 0.35], [2.4, -0.3], [-0.75, -0.3]];
// asm/aP = malha montada e posição na pose; full/fP = corpo inteiro (LOD0, sem cortes) na pose
// box = [y0, y1] da faixa testada; passo em m. Devolve vazados por vista e alguns pontos (mundo).
export function seeThrough(asm, aP, full, fP, { views = VIEWS6, step = 0.006, y0 = 0.05, y1 = 1.58, depthTol = 0.03, img = false } = {}) {
  const bA = new BVH(aP, asm.index), bF = new BVH(fP, full.index), res = [];
  let cx = 0, cz = 0, cnt = 0;
  for (let v = 0; v < full.n; v++) { cx += fP[v * 3]; cz += fP[v * 3 + 2]; cnt++; }
  cx /= cnt; cz /= cnt;
  for (const [az, el] of views) {
    // câmera ortográfica: direção d (da câmera para o alvo), base (r, u) da tela
    const d = [-Math.sin(az) * Math.cos(el), -Math.sin(el), Math.cos(az) * Math.cos(el)];
    let r = [d[2], 0, -d[0]]; const rl = Math.hypot(r[0], r[2]) || 1; r = [r[0] / rl, 0, r[2] / rl];
    const u = [r[1] * d[2] - r[2] * d[1], r[2] * d[0] - r[0] * d[2], r[0] * d[1] - r[1] * d[0]];
    const c0 = [cx - d[0] * 2, (y0 + y1) / 2 - d[1] * 2, cz - d[2] * 2], half = (y1 - y0) / 2 + 0.25;
    let holes = 0; const pts = [];
    const nA = Math.floor(1.2 / step) + 1, nB = Math.floor(2 * half / step) + 1, ras = img ? new Uint8Array(nA * nB) : null;
    for (let ia = 0; ia < nA; ia++) for (let ib = 0; ib < nB; ib++) {
      const a = -0.6 + ia * step, b = -half + ib * step;
      const o = [c0[0] + r[0] * a + u[0] * b, c0[1] + r[1] * a + u[1] * b, c0[2] + r[2] * a + u[2] * b];
      const hf = firstFront(bF, fP, full.index, o, d, 4);
      if (!hf) { if (ras && firstFront(bA, aP, asm.index, o, d, 4)) ras[ib * nA + ia] = 1; continue; }
      const py = o[1] + d[1] * hf.t; if (py < y0 || py > y1) { if (ras) ras[ib * nA + ia] = 1; continue; }
      const ha = firstFront(bA, aP, asm.index, o, d, 4);
      // furo = nada de frente na malha montada, ou o que aparece está ALÉM da saída do primeiro pedaço de corpo atingido
      // (vê-se através dele). Tecido afundado dentro do corpo (pele cortada) não é furo: é só um amassado.
      const tx = ha ? exitAfter(bF, fP, full.index, o, d, hf.t) : 0;
      if (ha && ha.t < Math.max(hf.t + depthTol, tx + 0.005)) { if (ras) ras[ib * nA + ia] = 2 + (asm.mat[asm.index[ha.tri * 3]] === 0 ? 1 : 0); continue; }
      holes++; if (ras) ras[ib * nA + ia] = 4;
      if (pts.length < 6) pts.push([o[0] + d[0] * hf.t, py, o[2] + d[2] * hf.t].map(x => +x.toFixed(3)));
    }
    res.push({ view: [az, el], holes, pts, img: ras ? { w: nA, h: nB, d: ras } : null });
  }
  return res;
}

// ---------------------------------------------------------------- esticamento das arestas da roupa
// tear = arestas acima do limite que também crescem mais de 12 mm (rasgo visível; aresta de 2 mm que vira 5 mm na
// axila é só tecido esticado)
export function stretchTest(m, parts, P0, P1, lim = 1.6, which = ['top', 'bot', 'sock'], tearAbs = 0.012) {
  const seen = new Set(), ix = m.index; let mx = 0, over = 0, worst = null, tear = 0, tearMax = 0, tearAt = null;
  for (let t = 0; t < ix.length; t += 3) for (let e = 0; e < 3; e++) {
    const a = ix[t + e], b = ix[t + (e + 1) % 3];
    if (!which.includes(parts[a]) || parts[a] !== parts[b]) continue;
    const k = a < b ? a * 1e6 + b : b * 1e6 + a; if (seen.has(k)) continue; seen.add(k);
    const l0 = Math.hypot(P0[a * 3] - P0[b * 3], P0[a * 3 + 1] - P0[b * 3 + 1], P0[a * 3 + 2] - P0[b * 3 + 2]);
    if (l0 < 0.002) continue;
    const l1 = Math.hypot(P1[a * 3] - P1[b * 3], P1[a * 3 + 1] - P1[b * 3 + 1], P1[a * 3 + 2] - P1[b * 3 + 2]), r = l1 / l0;
    if (r > mx) { mx = r; worst = [P1[a * 3], P1[a * 3 + 1], P1[a * 3 + 2]].map(x => +x.toFixed(3)); }
    if (r > lim) {
      over++;
      if (l1 - l0 > tearAbs) { tear++; if (l1 - l0 > tearMax) { tearMax = l1 - l0; tearAt = [P0[a * 3], P0[a * 3 + 1], P0[a * 3 + 2]].map(x => +x.toFixed(3)); } }
    }
  }
  return { max: +mx.toFixed(3), over, worst, tear, tearMax: +tearMax.toFixed(4), tearAt };
}

// rasgo da roupa (v6): aresta da roupa que estica além de 1,6× E mais de 12 mm E bem mais (1,35×) que a pele embaixo
// dela — o esticamento que a própria pele tem (joelho, nádega, axila: LBS) não é defeito da roupa
export function tearTest(m, parts, P0, P1, full, fP, { lim = 1.6, abs = 0.012, rel = 1.35, which = ['top', 'bot', 'sock'] } = {}) {
  const fi = full.index, fp0 = full.position, vs = new Float64Array(full.n).fill(1);
  for (let t = 0; t < fi.length; t += 3) for (let e = 0; e < 3; e++) {
    const a = fi[t + e], b = fi[t + (e + 1) % 3];
    const l0 = Math.hypot(fp0[a * 3] - fp0[b * 3], fp0[a * 3 + 1] - fp0[b * 3 + 1], fp0[a * 3 + 2] - fp0[b * 3 + 2]); if (l0 < 1e-5) continue;
    const r = Math.hypot(fP[a * 3] - fP[b * 3], fP[a * 3 + 1] - fP[b * 3 + 1], fP[a * 3 + 2] - fP[b * 3 + 2]) / l0;
    if (r > vs[a]) vs[a] = r; if (r > vs[b]) vs[b] = r;
  }
  const bvh = new BVH(Float64Array.from(fp0), fi), seen = new Set(), ix = m.index;
  let n = 0, worst = 0, at = null;
  for (let t = 0; t < ix.length; t += 3) for (let e = 0; e < 3; e++) {
    const a = ix[t + e], b = ix[t + (e + 1) % 3];
    if (!which.includes(parts[a]) || parts[a] !== parts[b]) continue;
    const k = a < b ? a * 1e6 + b : b * 1e6 + a; if (seen.has(k)) continue; seen.add(k);
    const l0 = Math.hypot(P0[a * 3] - P0[b * 3], P0[a * 3 + 1] - P0[b * 3 + 1], P0[a * 3 + 2] - P0[b * 3 + 2]); if (l0 < 0.002) continue;
    const l1 = Math.hypot(P1[a * 3] - P1[b * 3], P1[a * 3 + 1] - P1[b * 3 + 1], P1[a * 3 + 2] - P1[b * 3 + 2]), r = l1 / l0;
    if (r <= lim || l1 - l0 <= abs) continue;
    const h = bvh.closest((P0[a * 3] + P0[b * 3]) / 2, (P0[a * 3 + 1] + P0[b * 3 + 1]) / 2, (P0[a * 3 + 2] + P0[b * 3 + 2]) / 2, 0.08);
    const rb = h.tri < 0 ? 1 : Math.max(vs[fi[h.tri * 3]], vs[fi[h.tri * 3 + 1]], vs[fi[h.tri * 3 + 2]]);
    if (r <= rel * rb) continue;
    n++; if (l1 - l0 > worst) { worst = l1 - l0; at = [P0[a * 3], P0[a * 3 + 1], P0[a * 3 + 2]].map(x => +x.toFixed(3)); }
  }
  return { n, max: +worst.toFixed(4), at };
}

// ---------------------------------------------------------------- bateria completa de uma combinação
export function posedSuite(MD, g, outfit, poses, { lod = 0, see = true, step = 0.006, views = VIEWS6, img = false } = {}) {
  const ch = MD.char(g), asm = MD.assemble(g, outfit, lod), parts = partsOf(ch, asm);
  const body = MD.part(g, 'body'), full = { n: body.n, position: body.position, normal: body.normal, skinIndex: body.skinIndex, skinWeight: body.skinWeight, index: MD.index(body, 0) };
  const rest = { P: Float64Array.from(asm.position), N: Float64Array.from(asm.normal) }, out = {};
  for (const pn in poses) {
    const S = skinMats(ch, poses[pn]), ps = skin(asm, S), r = { flip: flipTest(asm, parts, rest, ps), stretch: stretchTest(asm, parts, rest.P, ps.P) };
    const fb = skin(full, S);
    r.tear = tearTest(asm, parts, rest.P, ps.P, full, fb.P);
    if (see) { r.see = seeThrough(asm, ps.P, full, fb.P, { step, views, img }); r.holes = r.see.reduce((a, x) => a + x.holes, 0); }
    out[pn] = r;
  }
  return out;
}
