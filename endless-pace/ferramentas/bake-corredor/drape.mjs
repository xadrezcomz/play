// Superfícies "caídas" das roupas (v5, ESPEC §14). O tecido não é mais uma casca afastada da pele: cada peça é um
// volume implícito feito de TUBOS em volta do corpo — tronco (fatias horizontais), braços e pernas (anéis em volta do
// eixo do osso). Cada anel guarda a função de suporte h(φ) do corte do corpo (= casco convexo: pontes sobre o vão entre
// os seios, sob o busto, umbigo, entre as escápulas, sulco dos glúteos), recebe folga, "cai" (o tecido desce do ponto
// mais largo — peito, escápulas, glúteo — e só volta para dentro devagar) e é alisado ao longo do eixo e em volta.
// O volume final (união suave dos tubos, com dobras no próprio campo) vira malha por surface nets; os atributos de cada
// vértice (pesos etc.) vêm do ponto mais próximo do corpo, alisados pela malha onde o tecido se afasta da pele.
import * as G from './gltf.mjs';
import { K, KN, limbCoords, sleeveLen } from './label.mjs';
import { NB } from './body.mjs';
import { BVH, neighbors, smoothField, smoothstep, clamp, surfaceNets, components, compact, noise3 } from './geom.mjs';
import { bodyOcc, morphField } from './proxy.mjs';

export const NPHI = 96;          // direções da função de suporte
export const NT = 160;           // direções da tabela radial
const COS = new Float64Array(NPHI), SIN = new Float64Array(NPHI);
for (let j = 0; j < NPHI; j++) { COS[j] = Math.cos(2 * Math.PI * j / NPHI); SIN[j] = Math.sin(2 * Math.PI * j / NPHI); }
const TWO_PI = 2 * Math.PI;

// ---------------------------------------------------------------- tubo
// origin + s·t = eixo; (u, v) = base do plano do anel. s0..s1 em passos ds.
export function makeTube({ origin, t, u, v, s0, s1, ds = 0.01, name = '' }) {
  const ns = Math.max(2, Math.round((s1 - s0) / ds) + 1);
  return { name, origin, t, u, v, s0, ds, ns, s1: s0 + (ns - 1) * ds, h: new Float64Array(ns * NPHI).fill(-1e9), cnt: new Int32Array(ns),
    cu: new Float64Array(ns), cv: new Float64Array(ns), R: null, capLo: 0, capHi: 0, fold: null, clamp: null };
}
// base (u, v) perpendicular a t; u o mais perto possível de `prefU`
// v sempre do lado de prefV (membros: v para a frente, −z, nos dois lados — ψ = π/2 é a frente em L e em R)
export function frameFor(t, prefU, prefV = null) {
  let u = G.sub(prefU, G.scl(t, G.dot(prefU, t)));
  if (G.len(u) < 1e-6) u = G.sub([0, 0, 1], G.scl(t, t[2]));
  u = G.norm(u);
  let v = G.norm(G.cross(t, u));
  if (prefV && G.dot(v, prefV) < 0) v = G.scl(v, -1);
  return { t: G.norm(t), u, v };
}

// cortes do corpo pelos planos dos anéis: cada aresta que atravessa o plano dá um ponto (u, v)
export function sampleTube(T, P, idx, triFilter = null, pointFilter = null) {
  const O = T.origin, t = T.t, u = T.u, v = T.v, S = [0, 0, 0], U = [0, 0, 0], W = [0, 0, 0], X = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  for (let tr = 0; tr < idx.length / 3; tr++) {
    if (triFilter && !triFilter(tr)) continue;
    for (let e = 0; e < 3; e++) {
      const q = idx[tr * 3 + e] * 3, dx = P[q] - O[0], dy = P[q + 1] - O[1], dz = P[q + 2] - O[2];
      S[e] = dx * t[0] + dy * t[1] + dz * t[2]; U[e] = dx * u[0] + dy * u[1] + dz * u[2]; W[e] = dx * v[0] + dy * v[1] + dz * v[2];
      X[e][0] = P[q]; X[e][1] = P[q + 1]; X[e][2] = P[q + 2];
    }
    const lo = Math.min(S[0], S[1], S[2]), hi = Math.max(S[0], S[1], S[2]);
    const k0 = Math.max(0, Math.ceil((lo - T.s0) / T.ds)), k1 = Math.min(T.ns - 1, Math.floor((hi - T.s0) / T.ds));
    for (let k = k0; k <= k1; k++) {
      const sk = T.s0 + k * T.ds;
      for (let e = 0; e < 3; e++) {
        const a = e, b = (e + 1) % 3, sa = S[a] - sk, sb = S[b] - sk;
        if ((sa < 0) === (sb < 0)) continue;
        const w = sa / (sa - sb), pu = U[a] + (U[b] - U[a]) * w, pv = W[a] + (W[b] - W[a]) * w;
        if (pointFilter && !pointFilter(k, pu, pv, X[a], X[b], w)) continue;
        addPoint(T, k, pu, pv);
      }
    }
  }
  return T;
}
export function addPoint(T, k, pu, pv) {
  const o = k * NPHI, h = T.h;
  for (let j = 0; j < NPHI; j++) { const d = pu * COS[j] + pv * SIN[j]; if (d > h[o + j]) h[o + j] = d; }
  T.cnt[k]++;
}
// anéis com poucos pontos copiam o vizinho válido mais perto (o tubo continua reto além do corpo)
export function fillRings(T, minPts = 8) {
  const ok = k => T.cnt[k] >= minPts;
  let any = -1; for (let k = 0; k < T.ns; k++) if (ok(k)) { any = k; break; }
  if (any < 0) throw new Error('tubo vazio: ' + T.name);
  T.valid = [T.ns, -1];
  for (let k = 0; k < T.ns; k++) if (ok(k)) { T.valid[0] = Math.min(T.valid[0], k); T.valid[1] = Math.max(T.valid[1], k); }
  for (let k = 0; k < T.ns; k++) {
    if (ok(k)) continue;
    let best = -1; for (let d = 1; d < T.ns; d++) { if (k - d >= 0 && ok(k - d)) { best = k - d; break; } if (k + d < T.ns && ok(k + d)) { best = k + d; break; } }
    T.h.copyWithin(k * NPHI, best * NPHI, best * NPHI + NPHI);
  }
  return T;
}
// ponto de Steiner (sempre dentro do convexo) de cada anel, alisado ao longo do eixo
export function centers(T, sigmaS = 0.02) {
  const cu = new Float64Array(T.ns), cv = new Float64Array(T.ns);
  for (let k = 0; k < T.ns; k++) {
    let a = 0, b = 0; for (let j = 0; j < NPHI; j++) { a += T.h[k * NPHI + j] * COS[j]; b += T.h[k * NPHI + j] * SIN[j]; }
    cu[k] = a * 2 / NPHI; cv[k] = b * 2 / NPHI;
  }
  const su = gauss1(cu, sigmaS / T.ds), sv = gauss1(cv, sigmaS / T.ds);
  for (let k = 0; k < T.ns; k++) {
    // o centro alisado tem que ficar dentro do anel com folga; senão fica o de Steiner do próprio anel
    let inside = true;
    for (let j = 0; j < NPHI && inside; j++) if (T.h[k * NPHI + j] - (su[k] * COS[j] + sv[k] * SIN[j]) < 0.006) inside = false;
    T.cu[k] = inside ? su[k] : cu[k]; T.cv[k] = inside ? sv[k] : cv[k];
  }
  return T;
}
function gauss1(a, sg) {
  if (sg <= 0) return Float64Array.from(a);
  const R = Math.ceil(sg * 2.5), w = []; let ws = 0;
  for (let i = -R; i <= R; i++) { const x = Math.exp(-i * i / (2 * sg * sg)); w.push(x); ws += x; }
  const o = new Float64Array(a.length);
  for (let i = 0; i < a.length; i++) { let s = 0; for (let j = -R; j <= R; j++) s += w[j + R] * a[clamp(i + j, 0, a.length - 1)]; o[i] = s / ws; }
  return o;
}

// ---------------------------------------------------------------- operações na função de suporte
// folga e(k, φ) (m) somada
export function ease(T, e) { for (let k = 0; k < T.ns; k++) for (let j = 0; j < NPHI; j++) T.h[k * NPHI + j] += e(T.s0 + k * T.ds, j, 2 * Math.PI * j / NPHI); return T; }
// caimento: a partir do anel kFrom, na direção dir (−1: s decrescente, o tronco cai para baixo; +1: o braço/perna
// cai ao longo do eixo), cada anel contém o anterior encolhido de slope·ds (slope pode depender de φ)
export function drape(T, kFrom, dir, slope) {
  const sl = typeof slope === 'function' ? slope : () => slope;
  for (let k = kFrom + dir; k >= 0 && k < T.ns; k += dir) {
    const o = k * NPHI, p = (k - dir) * NPHI;
    for (let j = 0; j < NPHI; j++) { const c = T.h[p + j] - sl(j, T.s0 + k * T.ds) * T.ds; if (c > T.h[o + j]) T.h[o + j] = c; }
  }
  return T;
}
// gaussiana ao longo do eixo (média de Minkowski: continua convexo) — só entre os anéis [ka, kb]
export function smoothS(T, sigma, ka = 0, kb = T.ns - 1) {
  const sg = sigma / T.ds; if (sg <= 0) return T;
  const col = new Float64Array(T.ns);
  for (let j = 0; j < NPHI; j++) {
    for (let k = 0; k < T.ns; k++) col[k] = T.h[k * NPHI + j];
    const sm = gauss1(col, sg);
    for (let k = ka; k <= kb; k++) T.h[k * NPHI + j] = sm[k];
  }
  return T;
}
// gaussiana circular em φ (arredonda os cantos do casco)
export function smoothPhi(T, sigmaSteps) {
  const R = Math.ceil(sigmaSteps * 2.5), w = []; let ws = 0;
  for (let i = -R; i <= R; i++) { const x = Math.exp(-i * i / (2 * sigmaSteps * sigmaSteps)); w.push(x); ws += x; }
  const row = new Float64Array(NPHI);
  for (let k = 0; k < T.ns; k++) {
    for (let j = 0; j < NPHI; j++) { let s = 0; for (let q = -R; q <= R; q++) s += w[q + R] * T.h[k * NPHI + ((j + q) % NPHI + NPHI) % NPHI]; row[j] = s / ws; }
    T.h.set(row, k * NPHI);
  }
  return T;
}

// tabela radial r(k, θ) em relação ao centro do anel: r = min_φ h_rel(φ) / cos(φ − θ)
export function radial(T) {
  T.R = new Float64Array(T.ns * NT);
  const hr = new Float64Array(NPHI);
  for (let k = 0; k < T.ns; k++) {
    for (let j = 0; j < NPHI; j++) hr[j] = Math.max(0.002, T.h[k * NPHI + j] - (T.cu[k] * COS[j] + T.cv[k] * SIN[j]));
    for (let q = 0; q < NT; q++) {
      const th = TWO_PI * q / NT, ct = Math.cos(th), st = Math.sin(th);
      let r = 1e9;
      for (let j = 0; j < NPHI; j++) { const c = COS[j] * ct + SIN[j] * st; if (c > 0.08) { const x = hr[j] / c; if (x < r) r = x; } }
      T.R[k * NT + q] = r;
    }
  }
  return T;
}
// limita r(k, θ) por um plano (no referencial do anel: pontos com n·(pu, pv) ≤ d(k))
export function clampRadial(T, nu, nv, d) {
  for (let k = 0; k < T.ns; k++) {
    const dk = typeof d === 'function' ? d(T.s0 + k * T.ds) : d, base = dk - (nu * T.cu[k] + nv * T.cv[k]);
    for (let q = 0; q < NT; q++) {
      const th = TWO_PI * q / NT, c = nu * Math.cos(th) + nv * Math.sin(th);
      if (c > 1e-3) T.R[k * NT + q] = Math.min(T.R[k * NT + q], Math.max(0.004, base / c));
    }
  }
  return T;
}
// caixa (mundo) que contém o tubo inteiro + margem: fora dela o tubo não conta (campo = 1)
export function tubeBox(T, margin = 0.04) {
  const b = [1e9, 1e9, 1e9, -1e9, -1e9, -1e9];
  for (let k = 0; k < T.ns; k++) {
    let rm = 0; for (let q = 0; q < NT; q++) rm = Math.max(rm, T.R[k * NT + q]);
    const s = T.s0 + k * T.ds, c = [0, 1, 2].map(i => T.origin[i] + T.t[i] * s + T.u[i] * T.cu[k] + T.v[i] * T.cv[k]);
    const ext = rm + margin + (((k === 0 && !T.capLo) || (k === T.ns - 1 && !T.capHi)) ? 0.15 : 0);
    for (let i = 0; i < 3; i++) { b[i] = Math.min(b[i], c[i] - ext); b[i + 3] = Math.max(b[i + 3], c[i] + ext); }
  }
  T.box = b;
  return T;
}
export function finishTube(T, sigmaC = 0.02, dome = null) {
  centers(T, sigmaC); radial(T);
  // pontas além do último anel com corpo: cúpula (o raio fecha como meia esfera) em vez de cilindro reto
  if (dome && T.valid) for (const [end, len] of [['lo', dome.lo], ['hi', dome.hi]]) {
    if (!len) continue;
    const kv = end === 'lo' ? T.valid[0] : T.valid[1];
    for (let k = 0; k < T.ns; k++) {
      const d = end === 'lo' ? (kv - k) * T.ds : (k - kv) * T.ds;
      if (d <= 0) continue;
      const f = Math.sqrt(Math.max(0.02, 1 - (d / len) * (d / len)));
      for (let q = 0; q < NT; q++) T.R[k * NT + q] *= f;
    }
  }
  return T;
}

// coordenadas de um ponto no tubo: { s, f (anel fracionário), rho, th, r, F }
export function tubeCoords(T, x, y, z, out) {
  const O = T.origin, dx = x - O[0], dy = y - O[1], dz = z - O[2];
  const s = dx * T.t[0] + dy * T.t[1] + dz * T.t[2], pu = dx * T.u[0] + dy * T.u[1] + dz * T.u[2], pv = dx * T.v[0] + dy * T.v[1] + dz * T.v[2];
  let f = (s - T.s0) / T.ds, cap = 0;
  if (f < 0) { cap = -f * T.ds; f = 0; if (!T.capLo) cap = 0; } else if (f > T.ns - 1) { cap = (f - (T.ns - 1)) * T.ds; f = T.ns - 1; if (!T.capHi) cap = 0; }
  const k = Math.min(T.ns - 2, Math.floor(f)), w = f - k;
  const cu = T.cu[k] + (T.cu[k + 1] - T.cu[k]) * w, cv = T.cv[k] + (T.cv[k + 1] - T.cv[k]) * w;
  const du = pu - cu, dv = pv - cv, rho = Math.hypot(du, dv);
  let th = Math.atan2(dv, du); if (th < 0) th += TWO_PI;
  const qf = th / TWO_PI * NT, q0 = Math.floor(qf) % NT, q1 = (q0 + 1) % NT, wq = qf - Math.floor(qf), R = T.R;
  const r0 = R[k * NT + q0] + (R[k * NT + q1] - R[k * NT + q0]) * wq, r1 = R[(k + 1) * NT + q0] + (R[(k + 1) * NT + q1] - R[(k + 1) * NT + q0]) * wq;
  const r = r0 + (r1 - r0) * w;
  out.s = s; out.f = f; out.rho = rho; out.th = th; out.r = r; out.pu = pu; out.pv = pv; out.du = du; out.dv = dv;
  let F = rho - r - (T.fold ? T.fold(s, th, r, x, y, z) : 0);
  if (cap > 0) F = capMax(F, cap, T.capR || 0.012);
  out.F = F;
  return F;
}
// fecha a ponta do tubo arredondada (máximo suave entre a superfície lateral e o plano da ponta)
function capMax(F, cap, k) { const h = Math.max(k - Math.abs(F - cap), 0) / k; return Math.max(F, cap) + h * h * k * 0.25; }

// união suave (polinomial) de n valores
export function sminN(vals, k) {
  let a = vals[0];
  for (let i = 1; i < vals.length; i++) { const b = vals[i], h = Math.max(k - Math.abs(a - b), 0) / k; a = Math.min(a, b) - h * h * k * 0.25; }
  return a;
}

// ---------------------------------------------------------------- malha do volume + registros
// F(x,y,z) → valor; which(x,y,z) → índice do tubo dominante (escolhe a BVH dos atributos); bvhs[i] = { bvh, widx }
// Devolve registros (KN) com posição/normal da superfície e pesos/atributos do corpo mais próximo, alisados onde o
// tecido fica longe da pele (> nearD).
export function drapeMesh(F, box, h, Aw, which, bvhs, Lm, { nearD = 0.006, iters = 60, extra = null, jw = 0.03, vol = { subs: [] } } = {}) {
  const N = surfaceNets(F, box, h), n0 = N.n, P = N.pos;
  const cmp = components(N.idx, n0), cnt = new Map();
  for (let t = 0; t < N.idx.length / 3; t++) cnt.set(cmp.comp[t], (cnt.get(cmp.comp[t]) || 0) + 1);
  // componentes grandes (≥ 15% da maior): as meias são duas peças soltas (uma por perna); pedaços pequenos da grade saem
  let bc = 0; for (const k of cnt.values()) bc = Math.max(bc, k);
  const big = new Set([...cnt].filter(([, k]) => k >= 0.15 * bc).map(([c]) => c));
  const keep = [];
  for (let t = 0; t < N.idx.length / 3; t++) if (big.has(cmp.comp[t])) keep.push(N.idx[t * 3], N.idx[t * 3 + 1], N.idx[t * 3 + 2]);
  const cp = compact(keep, n0), m = cp.back.length, V = new Float64Array(m * KN), dB = new Float64Array(m), tube = new Uint8Array(m), gap = new Float64Array(m);
  for (let i = 0; i < m; i++) {
    const s = cp.back[i], p = [P[s * 3], P[s * 3 + 1], P[s * 3 + 2]], wh = which(p[0], p[1], p[2]), ti = wh.i, B = bvhs[ti], o = i * KN;
    tube[i] = ti; gap[i] = wh.gap;
    // folga até o segundo tubo, com sinal (+ manga/perna, − tronco/quadril): o zero é a linha da junção (cava)
    V[o + K.jn] = Math.min(wh.gap, 1) * ((vol.subs[ti].role || 0) ? 1 : -1);
    const c = B.bvh.closest(p[0], p[1], p[2], 0.4);
    if (c.tri >= 0) { const ws = [c.u, c.v, c.w]; for (let e = 0; e < 3; e++) { const q = B.widx[c.tri * 3 + e] * KN; for (let k = 0; k < KN; k++) V[o + k] += ws[e] * Aw[q + k]; } }
    dB[i] = c.d;
    const g = gradF(F, p[0], p[1], p[2], h * 0.4);
    for (let k = 0; k < 3; k++) { V[o + k] = p[k]; V[o + 3 + k] = g[k]; }
    if (extra) extra(V, o, p, ti);
  }
  const idx = cp.idx;
  for (let t = 0; t < idx.length; t += 3) {   // frente do triângulo para o lado do gradiente
    const a = idx[t] * KN, b = idx[t + 1] * KN, c = idx[t + 2] * KN;
    const fn = G.cross([V[b] - V[a], V[b + 1] - V[a + 1], V[b + 2] - V[a + 2]], [V[c] - V[a], V[c + 1] - V[a + 1], V[c + 2] - V[a + 2]]);
    if (fn[0] * (V[a + 3] + V[b + 3] + V[c + 3]) + fn[1] * (V[a + 4] + V[b + 4] + V[c + 4]) + fn[2] * (V[a + 5] + V[b + 5] + V[c + 5]) < 0) { const k = idx[t + 1]; idx[t + 1] = idx[t + 2]; idx[t + 2] = k; }
  }
  // pesos: fixos perto da pele, alisados pela malha onde o tecido se afasta (pontes, folgas): nada rasga entre
  // tronco e manga, nem entre as pernas
  const adj = neighbors(idx, m), W = new Float64Array(m * NB), fixed = new Uint8Array(m);
  // fora da faixa de junção entre tubos (tronco↔manga, quadril↔perna) cada vértice fica com os pesos do seu tubo;
  // na junção (diferença < jw entre o melhor e o segundo tubo) os pesos são alisados entre as duas bordas fixas
  for (let i = 0; i < m; i++) { for (let b = 0; b < NB; b++) W[i * NB + b] = Math.max(0, V[i * KN + K.w0 + b]); fixed[i] = dB[i] < nearD || gap[i] > jw ? 1 : 0; }
  smoothField(W, NB, adj, iters, 0.6, fixed);
  smoothField(W, NB, adj, 4, 0.3);
  for (let i = 0; i < m; i++) {
    let s2 = 0; for (let b = 0; b < NB; b++) s2 += W[i * NB + b];
    for (let b = 0; b < NB; b++) V[i * KN + K.w0 + b] = W[i * NB + b] / (s2 || 1);
    limbCoords(V, i * KN, Lm);
  }
  return { V, idx, n: m, dB, tube, adj };
}
export function gradF(F, x, y, z, e) {
  const gx = F(x + e, y, z) - F(x - e, y, z), gy = F(x, y + e, z) - F(x, y - e, z), gz = F(x, y, z + e) - F(x, y, z - e), l = Math.hypot(gx, gy, gz) || 1;
  return [gx / l, gy / l, gz / l];
}

// ================================================================ moldes por tipo de roupa
// Folgas (m, radiais) e quedas de cada peça. "tronco" = fatias horizontais sem braços/mãos/cabeça; braço/perna = anéis
// perpendiculares ao osso. Tudo no referencial final (frente = −z, lado L = x negativo).
// dobras (m): hem = "canos" que descem do peito até a barra; pit = diagonais da axila; slv = ondas na barra da manga;
// leg = ondas na barra da perna; gat = franzido logo abaixo do cós elástico; elb = sanfona do cotovelo/punho
const FOLDS = {
  // v6: dobras mais fundas e largas (6–10 mm), assimétricas; diagonais de tensão axila → peito e escápula → cintura
  camiseta: { hem: { m: 0.0085, f: 0.0068 }, diag: { m: 0.003, f: 0.0025 }, slv: 0.0032, sdiag: 0.0022 },
  regata: { hem: { m: 0.0075, f: 0.006 }, diag: { m: 0.003, f: 0.0026 } },
  'manga-longa': { hem: { m: 0.0055, f: 0.0045 }, diag: { m: 0.003, f: 0.0026 }, elb: 0.0026, sdiag: 0.002 },
  // corta-vento (náilon): poucas dobras, largas e vincadas
  'corta-vento': { hem: { m: 0.0085, f: 0.0075 }, crisp: true, diag: { m: 0.0035, f: 0.003 }, elb: 0.0038, cuffG: 0.0022 },
  short: { leg: 0.0032, gat: 0.0014 }, bermuda: { leg: 0.0034, gat: 0.0014 }, 'saia-short': { gat: 0.0008 }, legging: { crease: 0.0007 }
};
// slope = quanto o tecido pode voltar para dentro por metro de queda (pequeno = cai reto); drop = de onde cai
// (f: ápice do busto); sl = manga (cap/hem = folga, slope = queda ao longo do braço, ax = alisamento axial que faz a
// ponte sobre bíceps e deltoide)
const KINDS = {
  camiseta: { tube: 'top', sleeve: 'curta', yoke: 0.006, chest: { m: 0.012, f: 0.009 }, hem: { m: 0.012, f: 0.016 }, slope: { m: 0.1, f: 0.06 }, sl: { cap: 0.008, hem: 0.02, slope: 0.1, ax: 0.03 } },
  regata: { tube: 'top', sleeve: null, yoke: 0.005, chest: { m: 0.010, f: 0.008 }, hem: { m: 0.011, f: 0.014 }, slope: { m: 0.11, f: 0.07 } },
  'manga-longa': { tube: 'top', sleeve: 'longa', yoke: 0.005, chest: { m: 0.007, f: 0.006 }, hem: { m: 0.008, f: 0.012 }, slope: { m: 0.2, f: 0.08 }, sl: { cap: 0.006, hem: 0.008, slope: 0.24, cuff: 0.003, ax: 0.03, fslope: 0.4, gather: 0.05 } },
  'corta-vento': { tube: 'top', sleeve: 'longa', yoke: 0.007, chest: { m: 0.015, f: 0.013 }, hem: { m: 0.012, f: 0.014 }, slope: { m: 0.1, f: 0.07 }, sl: { cap: 0.009, hem: 0.012, slope: 0.18, cuff: 0.0035, ax: 0.04, fslope: 0.3, gather: 0.06 } },
  top: { tube: 'bra' },
  short: { tube: 'bottom', loose: true },
  bermuda: { tube: 'bottom', loose: true },
  'saia-short': { tube: 'bottom', tight: true },
  legging: { tube: 'bottom', tight: true },
  meia: { tube: 'sock' }
};
export const DRAPE_KINDS = Object.keys(KINDS);
// comprimento da perna da peça (m, ao longo da perna a partir do quadril); legging feminina = corsário (meia canela)
export const legLen = (kind, g, Lm) => kind === 'bermuda' ? Lm.thigh - 0.035 : kind === 'legging' ? (g === 'f' ? Lm.thigh + 0.55 * Lm.shin : Lm.thigh + Lm.shin - 0.045) : kind === 'saia-short' ? 0.115 : (g === 'f' ? 0.155 : 0.25);
export const isLoose = kind => ['camiseta', 'regata', 'manga-longa', 'corta-vento', 'short', 'bermuda'].includes(kind);

// contexto por gênero: filtros de triângulo e BVHs dos atributos
function bodyCtx(C, Aw) {
  if (C._drape) return C._drape;
  const PW = C.body.PW, WI = C.body.widx, at = (t, e, k) => Aw[WI[t * 3 + e] * KN + k];
  const avg = (t, k) => (at(t, 0, k) + at(t, 1, k) + at(t, 2, k)) / 3;
  const side = (t, sd) => { let s = 0; for (let e = 0; e < 3; e++) s += Aw[WI[t * 3 + e] * KN]; return sd === 'L' ? s < 0 : s > 0; };
  const trunkTri = t => { for (let e = 0; e < 3; e++) if (at(t, e, K.wArm) >= 0.3 || at(t, e, K.head) > 0.5 || at(t, e, K.hand) >= 0.3) return false; return true; };
  const armTri = sd => t => side(t, sd) && avg(t, K.wArm) >= 0.5 && avg(t, K.hand) < 0.5;
  const legTri = sd => t => side(t, sd) && avg(t, K.wLeg) >= 0.35 && avg(t, K.wArm) < 0.3;
  const D = { PW, WI, trunkTri, armTri, legTri, avg };
  D.bvh = {
    trunk: { bvh: new BVH(PW, WI, trunkTri), widx: WI },
    armL: { bvh: new BVH(PW, WI, t => side(t, 'L') && avg(t, K.wArm) >= 0.35), widx: WI },
    armR: { bvh: new BVH(PW, WI, t => side(t, 'R') && avg(t, K.wArm) >= 0.35), widx: WI },
    legL: { bvh: new BVH(PW, WI, t => side(t, 'L') && avg(t, K.wLeg) >= 0.35 && avg(t, K.wArm) < 0.3), widx: WI },
    legR: { bvh: new BVH(PW, WI, t => side(t, 'R') && avg(t, K.wLeg) >= 0.35 && avg(t, K.wArm) < 0.3), widx: WI },
    noArm: { bvh: new BVH(PW, WI, t => avg(t, K.wArm) < 0.5 && avg(t, K.hand) < 0.3), widx: WI }
  };
  return (C._drape = D);
}

// armY: acima desta altura o braço (deltoide, já colado ao tronco) entra nas fatias — o tronco da camiseta vira uma
// canga lisa sobre os ombros e a manga começa dentro dela
function trunkTube(D, y0, y1, name, armY = null) {
  const T = makeTube({ origin: [0, 0, 0], t: [0, 1, 0], u: [1, 0, 0], v: [0, 0, 1], s0: y0, s1: y1, ds: 0.01, name });
  sampleTube(T, D.PW, D.WI, D.trunkTri);
  if (armY !== null) for (const sd of ['L', 'R']) sampleTube(T, D.PW, D.WI, D.armTri(sd), (k, pu, pv, a, b, w) => T.s0 + k * T.ds >= armY);
  return fillRings(T);
}
// tubo de um segmento de membro: A→B, u para fora do corpo (lado), v completa a base
function limbTube(D, A, B, sd, s0, s1, filter, name, pointFilter = null) {
  const fr = frameFor(G.sub(B, A), [sd === 'L' ? -1 : 1, 0, 0], [0, 0, -1]);
  const T = makeTube({ origin: A, ...fr, s0, s1, ds: 0.01, name });
  fillRings(sampleTube(T, D.PW, D.WI, filter, pointFilter), 6);
  T.h0 = Float64Array.from(T.h);   // casco do corpo (antes de folga/queda): o punho volta para ele
  return T;
}
const kOf = (T, s) => clamp(Math.round((s - T.s0) / T.ds), 0, T.ns - 1);
// plano x = ±m (meio do corpo) no referencial do anel: a perna não passa para o outro lado
function medialClamp(T, sd, m) {
  const ux = T.u[0], vx = T.v[0], l = Math.hypot(ux, vx) || 1, sg = sd === 'L' ? 1 : -1;
  // L: x ≤ −m  ⇔ (ux, vx)·(pu, pv) ≤ −m − xA(s);  R: x ≥ m ⇔ −(ux, vx)·(pu, pv) ≤ xA(s) − m
  return clampRadial(T, sg * ux / l, sg * vx / l, s => { const xA = T.origin[0] + T.t[0] * s; return (sd === 'L' ? (-m - xA) : (xA - m)) / l; });
}

// plano entre braço e tronco, por altura: |x| do lado do tronco (máx.) e do lado de dentro do braço (mín.) em fatias de
// 1 cm; onde os dois se afastam o tecido do tronco e o da manga ficam cada um do seu lado do meio (sem "teia" entre a
// manga e o tronco). Onde se tocam (axila) não há plano.
function armSeparator(D, Lm, sd) {
  const y0 = Lm.Sy - 0.42, y1 = Lm.Sy + 0.02;
  const mk = (filter, nm) => sampleTube(makeTube({ origin: [0, 0, 0], t: [0, 1, 0], u: [1, 0, 0], v: [0, 0, 1], s0: y0, s1: y1, ds: 0.01, name: nm }), D.PW, D.WI, filter);
  const Tt = mk(D.trunkTri, 'sepT'), Ta = mk(D.armTri(sd), 'sepA');
  const jT = sd === 'L' ? NPHI / 2 : 0, jA = sd === 'L' ? 0 : NPHI / 2;
  const mid = new Float64Array(Tt.ns), gap = new Float64Array(Tt.ns);
  for (let k = 0; k < Tt.ns; k++) {
    if (Tt.cnt[k] < 6 || Ta.cnt[k] < 6) { mid[k] = NaN; continue; }
    const tMax = Tt.h[k * NPHI + jT], aMin = -Ta.h[k * NPHI + jA];
    mid[k] = (tMax + aMin) / 2; gap[k] = aMin - tMax;
  }
  // preenche buracos e alisa
  for (let k = 0; k < Tt.ns; k++) if (isNaN(mid[k])) { let j = k; while (j < Tt.ns && isNaN(mid[j])) j++; const a = k > 0 ? k - 1 : j, b = j < Tt.ns ? j : k - 1; mid[k] = mid[a] ?? 0.15; gap[k] = isNaN(mid[b]) ? gap[a] : Math.min(gap[a], gap[b]); }
  const m2 = gauss1(mid, 1.5), g2 = gauss1(gap, 1);
  return y => { const f = clamp((y - y0) / 0.01, 0, Tt.ns - 1), k = Math.min(Tt.ns - 2, Math.floor(f)), w = f - k; return { mid: m2[k] + (m2[k + 1] - m2[k]) * w, gap: g2[k] + (g2[k + 1] - g2[k]) * w }; };
}
// ápice da axila (v6): a altura onde a fresta entre o braço e o tronco fecha (pelo separador de cada lado) e o ponto no
// meio da fresta ali (x do meio, z do ombro). Usado pela membrana da axila e pela pele que nunca some debaixo dela.
export function armpitApex(C, Aw) {
  if (C._apex) return C._apex;
  const D = bodyCtx(C, Aw), Lm = C.Lm, out = {};
  for (const sd of ['L', 'R']) {
    const sep = armSeparator(D, Lm, sd);
    let y = Lm.Sy - 0.1;
    for (let yy = Lm.Sy - 0.25; yy < Lm.Sy - 0.04; yy += 0.0025) if (sep(yy).gap <= 0.001) { y = yy; break; }
    out[sd] = [(sd === 'L' ? -1 : 1) * sep(y).mid, y, Lm.S[sd][2]];
  }
  out.y = (out.L[1] + out.R[1]) / 2;
  return (C._apex = out);
}
// aplica o plano: tronco (tubo vertical) não passa de |x| = meio − m; manga não entra além de meio + m
function clampTrunkSide(T, sep, sd, m) {
  // v6: a margem nunca põe o tecido para dentro da pele (perto do ápice a fresta é estreita: lá decide a membrana)
  return clampRadial(T, sd === 'L' ? -1 : 1, 0, y => { const q = sep(y), mm = Math.min(m, q.gap / 2 - 0.0015); return mm > 0.0005 ? q.mid - mm : 9; });
}
function clampLimbSide(T, sep, sd, m) {
  const ux = T.u[0], vx = T.v[0], l = Math.hypot(ux, vx) || 1;
  // L: x ≤ −(meio + m) ⇔ (ux, vx)·(pu, pv) ≤ −(meio + m) − xA(s);  R: x ≥ meio + m ⇔ −(ux, vx)·(pu, pv) ≤ xA(s) − (meio + m)
  const sg = sd === 'L' ? 1 : -1;
  return clampRadial(T, sg * ux / l, sg * vx / l, s => {
    const y = T.origin[1] + T.t[1] * s, q = sep(y), xA = T.origin[0] + T.t[0] * s, mm = Math.min(m, q.gap / 2 - 0.0015);
    if (mm <= 0.0005) return 9;
    return (sd === 'L' ? (-(q.mid + mm) - xA) : (xA - (q.mid + mm))) / l;
  });
}

// volume de uma peça: { F, subs (tubos com papel), which, bvhs, box, info }
export function garmentVolume(kind, C, Aw) {
  const g = C.g, f = g === 'f', Lm = C.Lm, D = bodyCtx(C, Aw), S = KINDS[kind];
  if (!S) throw new Error('sem molde: ' + kind);
  const subs = [], bvhs = [];
  const tmp = {};
  let k = 0.012, box;
  if (S.tube === 'top') {
    // axila (onde o braço encontra o tronco) ≈ Sy − 11 cm; o caimento começa logo acima dela (f: no ápice do busto)
    const apY = Lm.Sy - 0.1, hemY = (kind === 'corta-vento' ? Lm.T[1] - 0.075 : Lm.T[1] - 0.057);
    const T = trunkTube(D, hemY - 0.08, Lm.N[1] + 0.08, 'tronco', S.sleeve ? Lm.Sy - 0.075 : null);
    const ch = S.chest[g], hm = S.hem[g], dropY = f && Lm.apex ? Math.min(apY, Lm.apex[1]) : apY;
    // folga: canga (ombros) → peito → barra (evasê leve). Nas laterais, perto da axila, pouca folga (o tronco não
    // encosta na manga: a junção fica só na axila)
    const lat = phi => Math.pow(Math.abs(Math.cos(phi)), 4);
    ease(T, (y, j, phi) => { const e = S.yoke + (ch - S.yoke) * smoothstep(apY + 0.05, apY - 0.02, y); return e * (1 - 0.55 * lat(phi) * smoothstep(apY - 0.12, apY - 0.02, y)); });
    // v6: cai reto do peito / do ápice do busto (f) até a barra — a cintura não puxa o tecido para dentro
    drape(T, kOf(T, dropY), -1, S.slope[g]);
    ease(T, (y, j, phi) => hm * Math.pow(smoothstep(dropY, hemY, y), 1.2));
    smoothS(T, 0.02); smoothPhi(T, 1.6);
    // a barra não abraça o quadril (f): alisamento axial mais forte nos 12 cm de baixo
    smoothS(T, 0.03, 0, kOf(T, hemY + 0.12));
    finishTube(T, 0.03);
    const FD = FOLDS[kind] || {}, seedK = kind.length * 7 + (f ? 3 : 0), hemA = FD.hem ? FD.hem[g] : 0, diagA = FD.diag ? FD.diag[g] : 0;
    const prof = FD.crisp ? (u => Math.sign(u) * Math.pow(Math.abs(u), 0.55)) : (u => u);   // náilon: vinco mais marcado
    // dobras: colunas largas que descem do peito/escápulas até a barra (assimétricas: fase e amplitude variam por
    // ruído lento), diagonais de tensão saindo da axila para o peito e das escápulas para a cintura
    T.fold = (y, th, r, x, yy, z) => {
      let d = 0;
      if (process.env.DBG_NOFOLD) return 0;
      const ct = Math.cos(th), st = Math.sin(th);   // ruído amostrado no círculo: periódico em θ (sem costura em θ = 0)
      if (hemA && !process.env.DBG_NOHEM) {
        const a = hemA * Math.pow(smoothstep(dropY + 0.02, hemY + 0.005, y), 1.15) * (0.4 + 0.6 * st * st) * (0.65 + 0.7 * noise3(ct * 1.1, st * 1.1, 7.3, seedK));
        if (a > 0) {
          const n1 = noise3(ct * 0.9 + y * 1.6, st * 0.9, 1.7, seedK), n2 = noise3(ct * 1.3, st * 1.3 + y * 2.4, 5.1, seedK);
          d += a * prof(0.6 * Math.sin((FD.crisp ? 4 : 5) * th + 1.3 * Math.sin(2 * th + 0.4) + 0.6 + 1.1 * n1) + 0.4 * Math.sin((FD.crisp ? 3 : 8) * th + 2.1 + 1.3 * n2));
        }
      }
      if (diagA && !process.env.DBG_NODIAG) {
        // cada lado só na sua metade (somem no meio: sem "V" no esterno nem grade de calombos onde as duas famílias se
        // cruzariam); frente e costas misturadas de leve na lateral
        const wb = smoothstep(Lm.cz - 0.03, Lm.cz + 0.03, z);
        for (const sx of [-1, 1]) {
          const side = smoothstep(0.015, 0.06, x * sx);
          if (side <= 0) continue;
          for (const back of [0, 1]) {
            const wfb = back ? wb : 1 - wb; if (wfb <= 0) continue;
            const ox = sx * (back ? 0.11 : 0.135), oy = back ? Lm.Sy - 0.07 : apY - 0.01;
            const dx = x - ox, dy = yy - oy, ux = -sx * 0.6, uy = -0.8, along = dx * ux + dy * uy, across = dx * uy - dy * ux;
            if (along < -0.03 || along > 0.2) continue;
            const env = side * wfb * smoothstep(-0.03, 0.02, along) * smoothstep(0.2, 0.06, along) * Math.exp(-across * across / (2 * 0.04 * 0.04));
            const u = 2 * Math.PI * across / 0.05 + (back ? 1.9 : 0.7) + (sx > 0 ? 0.9 : 0);
            d += diagA * (sx > 0 ? 1 : 0.8) * env * prof(Math.sin(u) + 0.3 * Math.sin(2 * u + 0.5));
          }
        }
      }
      return d;
    };
    const sep = S.sleeve ? { L: armSeparator(D, Lm, 'L'), R: armSeparator(D, Lm, 'R') } : null;
    if (sep && process.env.DBG_SEP) for (let y = Lm.Sy - 0.2; y <= Lm.Sy - 0.06; y += 0.01) { const q = sep.L(y); console.log('  SEP', g, (y - Lm.Sy).toFixed(2), 'mid', q.mid.toFixed(3), 'gap', (q.gap * 1000).toFixed(1)); }
    if (sep) for (const sd of ['L', 'R']) clampTrunkSide(T, sep[sd], sd, 0.005);
    // ápice real da axila (onde a fresta braço–tronco fecha): a membrana da união fica logo abaixo dele
    tmp.apex = armpitApex(C, Aw).y;
    subs.push(T); bvhs.push(D.bvh.trunk);
    if (S.sleeve) {
      for (const sd of ['L', 'R']) {
        const A = Lm.S[sd], E = Lm.E[sd], Wr = Lm.Wr[sd], Lup = G.dist(A, E);
        const short = S.sleeve === 'curta', L = short ? sleeveLen(g) : Lm.armLen + 0.005, sl = S.sl, sgn = sd === 'L' ? 1 : -1;
        // a manga curta termina num tampo exatamente na barra (cortado depois): debaixo dela o tronco fica inteiro
        const up = limbTube(D, A, E, sd, 0.015, short ? L + 0.004 : Lup + 0.03, D.armTri(sd), 'braço' + sd);
        // v6: o lado de dentro quase sem folga (a manga não encosta no tronco: a barra fica livre para balançar); a manga
        // pende do deltoide (queda pequena + alisamento axial: bíceps e deltoide não marcam o tecido)
        ease(up, (s, j, phi) => (sl.cap + (sl.hem - sl.cap) * smoothstep(0.02, L, s)) * (1 - 0.75 * Math.max(0, -Math.cos(phi))));
        drape(up, kOf(up, short ? 0.0 : 0.035), 1, sl.slope);
        smoothS(up, sl.ax || 0.012); smoothPhi(up, 2.4);
        finishTube(up, 0.02);
        if (sep) clampLimbSide(up, sep[sd], sd, 0.005);
        up.capLo = 1; up.capHi = 1; up.capR = short ? 0.002 : 0.008; up.role = 1;
        const slv = FD.slv || 0, sdg = FD.sdiag || 0;
        if (short) up.fold = (s2, th) => slv * smoothstep(L - 0.08, L, s2) * Math.sin(4 * th + 1.3 + 0.9 * Math.sin(2 * th)) +
          // duas dobras largas em diagonal na manga (da axila para fora e para baixo)
          sdg * smoothstep(0.02, 0.06, s2) * smoothstep(L, L - 0.03, s2) * Math.sin(2 * Math.PI * s2 / 0.05 + 2 * sgn * th + 0.7);   // hélice: volta inteira = sem costura
        else up.fold = (s2, th) => (FD.elb || 0) * smoothstep(Lup - 0.08, Lup - 0.01, s2) * (0.5 + 0.5 * Math.cos(th - Math.PI / 2)) * prof(Math.sin(2 * Math.PI * s2 / (FD.crisp ? 0.04 : 0.03))) +
          sdg * smoothstep(0.03, 0.08, s2) * smoothstep(Lup - 0.1, Lup - 0.14, s2) * Math.sin(2 * Math.PI * s2 / 0.06 + 2 * sgn * th + 0.7);
        subs.push(up); bvhs.push(D.bvh['arm' + sd]);
        if (!short) {
          const Lf = L - Lup;   // punho: comprimento da manga além do cotovelo
          const lo = limbTube(D, E, Wr, sd, -0.04, Lf + 0.004, D.armTri(sd), 'antebraço' + sd);
          ease(lo, s => { const tot = Lup + s; return (sl.cap + (sl.hem - sl.cap) * smoothstep(0.02, L, tot)) * (1 - smoothstep(Lf - 0.06, Lf - 0.02, s)) + sl.cuff * smoothstep(Lf - 0.06, Lf - 0.02, s); });
          drape(lo, kOf(lo, 0.0), 1, sl.fslope || 0.25);
          smoothS(lo, 0.016); smoothPhi(lo, 2.4);
          // punho: os últimos cm voltam para o casco do pulso + folga do punho (elástico/ribana) — a manga não abre em sino
          if (sl.gather) for (let kk = 0; kk < lo.ns; kk++) { const s3 = lo.s0 + kk * lo.ds, w = smoothstep(Lf - sl.gather - 0.04, Lf - 0.012, s3); if (w <= 0) continue; for (let j = 0; j < NPHI; j++) { const o = kk * NPHI + j; lo.h[o] += w * (lo.h0[o] + sl.cuff - lo.h[o]); } }
          finishTube(lo, 0.02);
          lo.capLo = 1; lo.capHi = 1; lo.capR = 0.002; lo.role = 1; lo.sOff = Lup;
          // sanfona no cotovelo (lado de dentro) e franzido acima do punho (elástico no corta-vento: pregas finas e juntas)
          const cg = FD.cuffG || 0;
          lo.fold = (s2, th) => (FD.elb || 0) * smoothstep(0.07, 0.0, s2) * (0.5 + 0.5 * Math.cos(th - Math.PI / 2)) * prof(Math.sin(2 * Math.PI * s2 / (FD.crisp ? 0.035 : 0.026) + 1)) +
            (cg ? cg * smoothstep(Lf - 0.075, Lf - 0.05, s2) * smoothstep(Lf - 0.012, Lf - 0.03, s2) * Math.sin(13 * th + 1.5 * Math.sin(3 * th))
              : 0.8 * (FD.elb || 0) * smoothstep(Lf - 0.11, Lf - 0.07, s2) * smoothstep(Lf - 0.035, Lf - 0.06, s2) * (0.6 + 0.4 * Math.sin(6 * th + 2 * Math.sin(3 * s2 * 60))));
          subs.push(lo); bvhs.push(D.bvh['arm' + sd]);
        }
      }
    }
    box = [-0.34, hemY - 0.06, -0.24, 0.34, Lm.N[1] + 0.06, 0.24];
    k = 0.02;   // v6: costura do ombro arredondada (a manga sai do deltoide sem degrau)
  } else if (S.tube === 'bra') {
    const T = trunkTube(D, Lm.Ybra - 0.07, Lm.N[1] + 0.06, 'tronco');
    ease(T, () => 0.0028);
    drape(T, kOf(T, Lm.apex[1]), -1, 1.1);   // do ápice à faixa: compressão (um volume só, sem vão)
    smoothS(T, 0.012); smoothPhi(T, 1.4);
    finishTube(T, 0.03);
    subs.push(T); bvhs.push(D.bvh.trunk);
    box = [-0.26, Lm.Ybra - 0.06, -0.22, 0.26, Lm.N[1] + 0.05, 0.22];
  } else if (S.tube === 'bottom') {
    const tight = !!S.tight, legging = kind === 'legging';
    const topY = Lm.T[1] + (legging ? 0.02 : -0.012), cy = Lm.crotchY;
    if (tight) {
      // justa: quadril = corpo alisado (voxels de 4 mm com fechamento de 1,6 cm: virilha em "V" redondo, sulco dos
      // glúteos e dobras finas preenchidos) + 2,6 mm; as pernas são tubos (anéis convexos)
      if (!C._pelvisF) {
        const box0 = [-0.24, cy - 0.07, -0.2, 0.24, Lm.T[1] + 0.08, 0.2], noArmT = t => D.avg(t, K.wArm) < 0.3 && D.avg(t, K.hand) < 0.3;
        const oc = bodyOcc(D.PW, D.WI, box0, 0.004, noArmT);
        C._pelvisF = morphField(oc.G, oc.occ, { close: 0.016, sigma: 1.5 });
      }
      const PF = C._pelvisF.F, yLo = cy - 0.01;
      const pel = { name: 'quadril', role: 0, box: [-0.25, yLo - 0.01, -0.21, 0.25, topY + 0.07, 0.21], field: (x, y, z) => Math.max(PF(x, y, z) - 0.0026, yLo - y) };
      subs.push(pel); bvhs.push(D.bvh.noArm);
    }
    const P = tight ? null : trunkTube(D, cy - 0.06, topY + 0.06, 'quadril');
    if (!tight) {
    ease(P, y => 0.003 + 0.006 * smoothstep(topY - 0.035, topY - 0.07, y));
    drape(P, kOf(P, topY - 0.03), -1, 0.32);   // o fundilho cai do glúteo
    smoothS(P, 0.015); smoothPhi(P, 1.6);
    finishTube(P, 0.03);
    // solta: o tubo do quadril desce 1,6 cm abaixo da virilha (a ponte entre as pernas é o fundilho)
    P.capLo = 1; P.capR = 0.022;
    P.s0lim = cy - 0.016;
    const FDb = FOLDS[kind] || {};
    if (FDb.gat) P.fold = (y, th) => FDb.gat * smoothstep(topY - 0.075, topY - 0.05, y) * smoothstep(topY - 0.025, topY - 0.045, y) * Math.sin(30 * th + 1.5 * Math.sin(5 * th));
    { const nk = kOf(P, P.s0lim); P.h = P.h.slice(nk * NPHI); P.R = P.R.slice(nk * NT); P.cu = P.cu.slice(nk); P.cv = P.cv.slice(nk); P.s0 = P.s0 + nk * P.ds; P.ns -= nk; }
    subs.push(P); bvhs.push(D.bvh.noArm);
    }
    const Lleg = legLen(kind, g, Lm);
    for (const sd of ['L', 'R']) {
      const A = Lm.Lg[sd], Kn = Lm.Kn[sd], An = Lm.An[sd];
      const th = limbTube(D, A, Kn, sd, -0.11, Math.min(Lleg, Lm.thigh) + 0.05, D.legTri(sd), 'coxa' + sd);
      if (tight) ease(th, () => 0.0026);
      else {
        const base = f ? 0.007 : 0.009, fl = kind === 'bermuda' ? 0.013 : f ? 0.008 : 0.013;
        // v6: o evasê vai para fora, frente e trás; do lado de dentro (φ = π) quase nada — as duas pernas não se tocam
        ease(th, (s, j, phi) => base * (1 - 0.35 * Math.max(0, -Math.cos(phi))) + fl * Math.pow(smoothstep(0.0, Lleg, s), 1.2) * (1 - 0.7 * Math.max(0, -Math.cos(phi))));
        drape(th, kOf(th, 0.0), 1, kind === 'bermuda' ? 0.12 : 0.1);
      }
      smoothS(th, tight ? 0.014 : 0.016); smoothPhi(th, 1.6);
      finishTube(th, 0.02, { lo: 0.05 });
      medialClamp(th, sd, tight ? 0.0005 : 0.006);
      th.capLo = 1; th.capHi = 1; th.capR = 0.008; th.role = 2;
      const FDl = FOLDS[kind] || {}, sgL = sd === 'L' ? 0 : 2.1;
      if (FDl.leg) th.fold = (s2, ps) => FDl.leg * Math.pow(smoothstep(0.3 * Lleg, Lleg, s2), 1.3) * Math.sin(6 * ps + sgL + 1.1 * Math.sin(2 * ps) + 1.5 * noise3(s2 * 10, ps, 3, 11));
      if (FDl.crease && Lleg > Lm.thigh) th.fold = (s2, ps) => FDl.crease * smoothstep(0.05, 0.0, Math.abs(s2 - Lm.thigh + 0.02)) * Math.max(0, -Math.sin(ps)) * Math.sin(2 * Math.PI * s2 / 0.016);
      subs.push(th); bvhs.push(D.bvh['leg' + sd]);
      if (Lleg > Lm.thigh) {
        const sh = limbTube(D, Kn, An, sd, -0.05, Lleg - Lm.thigh + 0.04, D.legTri(sd), 'canela' + sd);
        ease(sh, () => 0.0026);
        smoothS(sh, 0.014); smoothPhi(sh, 1.6);
        finishTube(sh, 0.02);
        sh.capLo = 1; sh.capHi = 1; sh.capR = 0.012; sh.role = 2; sh.sOff = Lm.thigh;
        subs.push(sh); bvhs.push(D.bvh['leg' + sd]);
      }
    }
    box = [-0.3, Lleg > Lm.thigh ? 0.08 : Math.min(Lm.Kn.L[1], Lm.Lg.L[1] - Lleg) - 0.06, -0.24, 0.3, topY + 0.05, 0.24];
    k = tight ? 0.015 : 0.012;
  } else if (S.tube === 'sock') {
    for (const sd of ['L', 'R']) {
      const Kn = Lm.Kn[sd], An = Lm.An[sd], sh = Lm.shin;
      // v5: desce 5,5 cm abaixo do tornozelo (corte em +4,5 cm, dentro do tênis): a meia cobre o peito do pé até a lingueta
      // anéis cortados a 6,5 cm do eixo para os lados/trás e a 13 cm para a frente (v = frente): a meia cobre o peito do
      // pé que aparece pela garganta do tênis (o tornozelo fica perto do calcanhar)
      const T = limbTube(D, Kn, An, sd, sh - 0.17, sh + 0.055, D.legTri(sd), 'meia' + sd, (kk, pu, pv) => Math.hypot(pu, Math.max(0, pv) * 0.5, Math.min(0, pv)) < 0.065);
      ease(T, () => 0.0019);
      smoothS(T, 0.008); smoothPhi(T, 1.2);
      finishTube(T, 0.015);
      T.capLo = 1; T.capHi = 1; T.capR = 0.01;
      subs.push(T); bvhs.push(D.bvh['leg' + sd]);
    }
    box = [-0.22, 0.02, -0.16, 0.22, 0.3, 0.22];
    k = 0.004;
  }
  const out = {};
  // raio da união: tops — largo no ombro (costura arredondada), pequeno debaixo do braço (a manga não gruda no tronco)
  // v6: debaixo do braço a união vira uma membrana (axila fechada até ~5 cm abaixo do ápice): com o braço erguido ou
  // balançando, o tecido estica sobre a axila em vez de abrir uma fenda entre a manga e o tronco
  const WEB = S.sleeve ? (KINDS[kind].web || 0.024) : 0, apY0 = tmp.apex || Lm.Sy - 0.1;
  // roupas de baixo soltas: abaixo do fundilho a união quase não arredonda (as pernas são tubos separados, sem membrana
  // entre as coxas que rasgaria no sprint)
  const kAt = S.tube === 'top' ? (x, y) => Math.max(0.003 + (k - 0.003) * smoothstep(Lm.Sy - 0.115, Lm.Sy - 0.07, y), WEB ? 0.003 + (WEB - 0.003) * smoothstep(apY0 - 0.015, apY0 + 0.01, y) : 0)
    : (S.tube === 'bottom' && !S.tight) ? (x, y) => 0.004 + (k - 0.004) * smoothstep(Lm.crotchY - 0.03, Lm.crotchY - 0.008, y) : () => k;
  for (const T of subs) if (!T.field) tubeBox(T);
  const inBox = (T, x, y, z) => { const b = T.box; return x >= b[0] && y >= b[1] && z >= b[2] && x <= b[3] && y <= b[4] && z <= b[5]; };
  const val = (T, x, y, z) => !inBox(T, x, y, z) ? 1 : T.field ? T.field(x, y, z) : tubeCoords(T, x, y, z, out);
  const F = (x, y, z) => { if (subs.length === 1) return val(subs[0], x, y, z); const v = subs.map(T => val(T, x, y, z)); return sminN(v, kAt(x, y)); };
  // tubo dominante e a folga até o segundo (junção): os tubos do mesmo osso (braço/antebraço) contam como um só
  const which = (x, y, z) => {
    let b = 0, bv = 1e9; const vals = subs.map((T, i) => { const v = val(T, x, y, z); if (v < bv) { bv = v; b = i; } return v; });
    let g2 = 1e9; vals.forEach((v, i) => { if (i !== b && bvhs[i] !== bvhs[b]) g2 = Math.min(g2, v - bv); });
    return { i: b, gap: g2 };
  };
  if (process.env.DBG_PROBE_TOP && S.tube === 'top') {
    for (const z of [0.03, 0.06, 0.08]) for (let y = (tmp.apex || Lm.Sy - 0.1) - 0.04; y <= (tmp.apex || Lm.Sy - 0.1) + 0.011; y += 0.01) {
      let line = '';
      for (let x = 0.11; x <= 0.2001; x += 0.005) { const v = subs.map(T => val(T, x, y, z)); const f = F(x, y, z); line += (f < 0 ? '#' : v.some(a => a < 0.004) ? '+' : '.'); }
      console.log('  PROBE', g, 'z', z.toFixed(2), 'y-apex', (y - (tmp.apex || 0)).toFixed(3), line, 'k', kAt(0, y).toFixed(4));
    }
  }
  return { F, which, subs, bvhs, box, k };
}

// malha da peça (registros KN) a partir do volume
export function drapeBase(kind, C, Aw) {
  const vol = garmentVolume(kind, C, Aw);
  const h = kind === 'meia' ? 0.003 : 0.0045;
  const co = {};
  const extra = (V, o, p, ti) => {
    const T = vol.subs[ti];
    if (T.field) { co.s = p[1]; } else tubeCoords(T, p[0], p[1], p[2], co);
    V[o + K.dr] = 1; V[o + K.tb] = T.role || 0; V[o + K.sx] = co.s + (T.sOff || 0);
  };
  const M = drapeMesh(vol.F, vol.box, h, Aw, vol.which, vol.bvhs, C.Lm, { nearD: isLoose(kind) ? 0.004 : 0.006, extra, vol });
  M.vol = vol;
  return M;
}
