// Rótulos do corpo (§5): coordenadas por vértice (braço/perna), regiões, marcos e as funções de
// região de cada roupa R_g (negativo = tem tecido, aproximadamente em metros).
import { BI } from './body.mjs';
import { smax, clamp } from './geom.mjs';
import * as G from './gltf.mjs';

export const REG = ['cabeca', 'pescoco', 'troncoSup', 'troncoInf', 'quadril', 'bracoL', 'antebracoL', 'maoL', 'bracoR', 'antebracoR', 'maoR',
  'coxaL', 'canelaL', 'peL', 'coxaR', 'canelaR', 'peR'];
export const RI = Object.fromEntries(REG.map((r, i) => [r, i]));

// atributos interpolados de cada ponto (corpo soldado e pontos derivados das roupas)
export const K = { px: 0, py: 1, pz: 2, nx: 3, ny: 4, nz: 5, w0: 6, sA: 23, sL: 24, wArm: 25, wLeg: 26, hand: 27, head: 28, neck: 29 };
export const KN = 30;

// marcos do corpo no referencial final
export function landmarks(C) {
  const bw = C.boneWorld, JP = C.JP, g = C.g;
  const L = {
    H: bw.hips, T: bw.torso, N: bw.head,
    S: { L: bw.armL, R: bw.armR }, E: { L: bw.elbowL, R: bw.elbowR }, Wr: { L: JP.hand_l, R: JP.hand_r },
    Lg: { L: bw.legL, R: bw.legR }, Kn: { L: bw.kneeL, R: bw.kneeR }, An: { L: bw.footL, R: bw.footR }
  };
  L.armLen = G.dist(L.S.L, L.E.L) + G.dist(L.E.L, L.Wr.L);
  L.upperLen = G.dist(L.S.L, L.E.L);
  L.thigh = G.dist(L.Lg.L, L.Kn.L); L.shin = G.dist(L.Kn.L, L.An.L);
  const Sy = (L.S.L[1] + L.S.R[1]) / 2;
  L.Sy = Sy;
  const b = C.body;
  if (g === 'm') { L.Ychest = Sy - 0.12; L.apex = null; L.Ybra = null; } else {
    // ápice do busto: vértice mais à frente (z mínimo) com |x| em [0,04; 0,12]
    let best = 1e9, ay = Sy - 0.15, ap = null;
    for (let v = 0; v < b.n; v++) {
      const x = Math.abs(b.P[v * 3]), y = b.P[v * 3 + 1], z = b.P[v * 3 + 2];
      if (x < 0.04 || x > 0.12 || y < Sy - 0.25 || y > Sy - 0.05) continue;
      if (z < best) { best = z; ay = y; ap = [b.P[v * 3], y, z]; }
    }
    L.apex = ap; L.Ychest = ay;
    // linha sob o busto: perfil da frente (z mínimo por faixa de 1 cm, |x| 0,06–0,10) volta 60% para a caixa torácica
    const prof = new Map();
    for (let v = 0; v < b.n; v++) {
      const x = Math.abs(b.P[v * 3]), y = b.P[v * 3 + 1], z = b.P[v * 3 + 2];
      if (x < 0.06 || x > 0.1 || y > ay || y < ay - 0.16) continue;
      const k = Math.floor(y * 100);
      if (!prof.has(k) || z < prof.get(k)) prof.set(k, z);
    }
    const keys = [...prof.keys()].sort((a, c) => c - a);
    const zr = Math.max(...keys.slice(-4).map(k => prof.get(k)));   // caixa torácica (abaixo do busto)
    let yb = Sy - 0.2;
    for (const k of keys) { if (prof.get(k) >= best + 0.6 * (zr - best)) { yb = k / 100; break; } }
    L.Ybra = yb; L.zRib = zr;
  }
  return L;
}

// atributos por vértice soldado: posição, normal, pesos, sA, sL, wArm, wLeg, mão, cabeça, pescoço
export function weldedAttrs(C, Lm) {
  const b = C.body, wd = b.weld, nw = wd.nw, A = new Float64Array(nw * KN);
  for (let w = 0; w < nw; w++) {
    const v = wd.rep[w], o = w * KN;
    for (let k = 0; k < 3; k++) { A[o + k] = b.PW[w * 3 + k]; A[o + 3 + k] = b.NW[w * 3 + k]; }
    for (let k = 0; k < 17; k++) A[o + K.w0 + k] = b.Wd[v * 17 + k];
    A[o + K.hand] = b.handW[v]; A[o + K.head] = b.headW[v]; A[o + K.neck] = b.neckW[v];
  }
  for (let w = 0; w < nw; w++) limbCoords(A, w * KN, Lm);
  return A;
}

// sA / sL / wArm / wLeg a partir de posição e pesos (também usado nos pontos interpolados)
export function limbCoords(A, o, Lm) {
  const sd = A[o] < 0 ? 'L' : 'R';
  const w = k => A[o + K.w0 + BI[k]];
  const wArm = w('arm' + sd) + w('elbow' + sd), wLeg = w('leg' + sd) + w('knee' + sd) + w('foot' + sd);
  A[o + K.wArm] = wArm; A[o + K.wLeg] = wLeg;
  const p = [A[o], A[o + 1], A[o + 2]];
  if (wArm < 0.5) A[o + K.sA] = -1; else {
    const S = Lm.S[sd], E = Lm.E[sd], Wr = Lm.Wr[sd];
    if (w('elbow' + sd) < 0.5) A[o + K.sA] = G.dot(G.sub(p, S), G.norm(G.sub(E, S)));
    else A[o + K.sA] = G.dist(E, S) + G.dot(G.sub(p, E), G.norm(G.sub(Wr, E)));
  }
  if (wLeg < 0.5) A[o + K.sL] = -1; else {
    const Lg = Lm.Lg[sd], Kn = Lm.Kn[sd], An = Lm.An[sd];
    if (w('knee' + sd) + w('foot' + sd) < 0.5) A[o + K.sL] = G.dot(G.sub(p, Lg), G.norm(G.sub(Kn, Lg)));
    else if (w('foot' + sd) < 0.5) A[o + K.sL] = G.dist(Kn, Lg) + G.dot(G.sub(p, Kn), G.norm(G.sub(An, Kn)));
    else A[o + K.sL] = G.dist(Kn, Lg) + G.dist(An, Kn) + G.dot(G.sub(p, An), G.norm(G.sub(An, Kn)));
  }
}

// região de um vértice (§5.2)
export function regionOf(A, o, Lm) {
  const sd = A[o] < 0 ? 'L' : 'R';
  if (A[o + K.head] >= 0.5) return RI.cabeca;
  if (A[o + K.neck] >= 0.5) return RI.pescoco;
  if (A[o + K.hand] >= 0.5) return RI['mao' + sd];
  let best = -1, bw = -1;
  for (let k = 0; k < 13; k++) if (A[o + K.w0 + k] > bw) { bw = A[o + K.w0 + k]; best = k; }
  const name = ['hips', 'torso', 'head', 'armL', 'elbowL', 'armR', 'elbowR', 'legL', 'kneeL', 'footL', 'legR', 'kneeR', 'footR'][best];
  if (name === 'head') return A[o + K.head] >= A[o + K.neck] ? RI.cabeca : RI.pescoco;
  if (name === 'torso') return A[o + 1] >= Lm.Ychest - 0.06 ? RI.troncoSup : RI.troncoInf;
  if (name === 'hips') return RI.quadril;
  const s2 = name.slice(-1);
  if (name.startsWith('arm')) return RI['braco' + s2];
  if (name.startsWith('elbow')) return RI['antebraco' + s2];
  if (name.startsWith('leg')) return RI['coxa' + s2];
  if (name.startsWith('knee')) return RI['canela' + s2];
  return RI['pe' + s2];
}

// ---------------------------------------------------------------- funções de região das roupas
// Cada roupa: termos { nome: f(A, o) } e R = smax dos termos. δ de um termo = −valor (distância à borda).
export function garmentTerms(kind, g, Lm) {
  const f = g === 'f', H = Lm.H, N = Lm.N, T = Lm.T;
  const y = (A, o) => A[o + 1];
  const hem = Y => (A, o) => Y - y(A, o);
  const top = Y => (A, o) => y(A, o) - Y;
  const sleeve = L => (A, o) => A[o + K.sA] < 0 ? -1 : A[o + K.sA] - L;
  const legEnd = L => (A, o) => A[o + K.sL] < 0 ? -1 : A[o + K.sL] - L;
  const noArm = (A, o) => A[o + K.wArm] >= 0.5 ? 1 : -1;
  const noLeg = (A, o) => A[o + K.wLeg] >= 0.5 ? 1 : -1;
  const neck = (r, drop) => (A, o) => {
    const dx = A[o] - N[0], dz = A[o + 2] - N[2], rho = Math.sqrt(dx * dx + (1.6 * dz) * (1.6 * dz));
    const front = clamp(-dz / 0.07, 0, 1), back = clamp(dz / 0.06, 0, 1);
    const cut = N[1] - 0.022 - drop * front * front + 0.012 * back + 1.4 * Math.max(0, rho - r);
    return y(A, o) - cut;
  };
  const armhole = (rx, ry, rz) => (A, o) => {
    const sd = A[o] < 0 ? 'L' : 'R', S = Lm.S[sd], c = [S[0] + (sd === 'L' ? 0.01 : -0.01), S[1] - 0.07, S[2]];
    const a = (A[o] - c[0]) / rx, b = (A[o + 1] - c[1]) / ry, d = (A[o + 2] - c[2]) / rz;
    return 0.04 * (1 - (a * a + b * b + d * d));
  };
  const racer = (A, o) => {
    if (!(A[o + 2] > N[2] + 0.02 && A[o + 1] > Lm.Ybra + 0.04)) return -1;
    return (Math.abs(A[o]) - 0.032 - Math.max(0, (Lm.Sy + 0.03) - A[o + 1]) * 0.75) * 0.5;
  };
  const LL = Lm.thigh + Lm.shin;
  switch (kind) {
    case 'camiseta': return { hem: hem(H[1] - (f ? 0.03 : 0.035)), neck: neck(0.068, 0.03), sleeve: sleeve(f ? 0.115 : 0.135) };
    case 'regata': return { hem: hem(H[1] - 0.035), neck: neck(0.075, f ? 0.10 : 0.09), armhole: armhole(f ? 0.07 : 0.075, f ? 0.14 : 0.15, f ? 0.11 : 0.115), noArm };
    case 'top': return { hem: hem(Lm.Ybra - 0.02), neck: neck(0.08, 0.12), armhole: armhole(0.08, 0.16, 0.12), racer, noArm };
    case 'manga-longa': return { hem: hem(H[1] - 0.035), neck: neck(0.066, 0.025), sleeve: sleeve(Lm.armLen - 0.015) };
    case 'corta-vento': return { hem: hem(H[1] - 0.075), neck: neck(0.075, 0.005), sleeve: sleeve(Lm.armLen + 0.005) };
    case 'short': case 'saia-short': return { waist: top(T[1] - 0.012), legEnd: legEnd(f ? 0.135 : 0.25), noArm };
    case 'bermuda': return { waist: top(T[1] - 0.012), legEnd: legEnd(Lm.thigh - 0.035), noArm };
    case 'legging': return { waist: top(T[1] + 0.02), legEnd: legEnd(LL - 0.045), noArm };
    case 'meia': return {
      top: (A, o) => A[o + K.sL] < 0 ? 1 : (LL - 0.10) - A[o + K.sL],
      bottom: (A, o) => A[o + K.sL] < 0 ? 1 : A[o + K.sL] - (LL + 0.02)
    };
  }
  throw new Error('roupa desconhecida: ' + kind);
}
export function evalR(terms, A, o) {
  let r = -1e9;
  for (const k in terms) r = r === -1e9 ? terms[k](A, o) : smax(r, terms[k](A, o), 0.01);
  return r;
}

export const TOPS = ['camiseta', 'regata', 'top', 'manga-longa', 'corta-vento'];
export const BOTTOMS = ['short', 'bermuda', 'legging', 'saia-short'];
export function kindsOf(g) {
  return g === 'f' ? ['camiseta', 'regata', 'top', 'manga-longa', 'corta-vento', 'short', 'bermuda', 'legging', 'saia-short', 'meia']
    : ['camiseta', 'regata', 'manga-longa', 'corta-vento', 'short', 'bermuda', 'legging', 'meia'];
}
