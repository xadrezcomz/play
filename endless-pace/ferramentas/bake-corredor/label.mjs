// Rótulos do corpo (§5): coordenadas por vértice (braço/perna), regiões, marcos e as funções de
// região de cada roupa R_g (negativo = tem tecido, aproximadamente em metros).
import { BI } from './body.mjs';
import { smax, smin, clamp, smoothstep } from './geom.mjs';
import * as G from './gltf.mjs';

export const REG = ['cabeca', 'pescoco', 'troncoSup', 'troncoInf', 'quadril', 'bracoL', 'antebracoL', 'maoL', 'bracoR', 'antebracoR', 'maoR',
  'coxaL', 'canelaL', 'peL', 'coxaR', 'canelaR', 'peR'];
export const RI = Object.fromEntries(REG.map((r, i) => [r, i]));

// atributos interpolados de cada ponto (corpo soldado e pontos derivados das roupas)
// v5: dr = 1 nos registros das roupas caídas (0 no corpo); tb = papel do tubo dominante (0 tronco/quadril, 1 manga,
// 2 perna); sx = coordenada axial no tubo (m, a partir do ombro/quadril); jn = folga até o segundo tubo (junção)
export const K = { px: 0, py: 1, pz: 2, nx: 3, ny: 4, nz: 5, w0: 6, sA: 23, sL: 24, wArm: 25, wLeg: 26, hand: 27, head: 28, neck: 29, dr: 30, tb: 31, sx: 32, jn: 33 };
export const KN = 34;

// marcos do corpo no referencial final
export function landmarks(C, bvh) {
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
    // linha sob o busto: perfil da frente (raios em x = ±0,08) volta 60% do ápice até o ponto mais recuado abaixo
    const zf = y => { let s = 0, c = 0; for (const x of [-0.08, 0.08]) { const h = bvh.ray(x, y, -1, 0, 0, 1, 2); if (h) { s += -1 + h.t; c++; } } return c ? s / c : null; };
    const az = zf(ay);
    let zr = -1e9;
    for (let y = ay - 0.04; y >= ay - 0.14; y -= 0.005) { const z = zf(y); if (z !== null && z > zr) zr = z; }
    let yb = Sy - 0.2;
    for (let y = ay; y >= ay - 0.16; y -= 0.0025) { const z = zf(y); if (z !== null && z >= az + 0.6 * (zr - az)) { yb = y; break; } }
    L.Ybra = yb; L.zRib = zr;
  }
  // virilha: ponto mais baixo do tronco em x = 0 (raio de baixo para cima)
  { const h = bvh.ray(0.0003, 0.3, L.H[2], 0, 1, 0, 1.0); L.crotchY = h ? 0.3 + h.t : L.H[1] - 0.09; }
  // centro do tronco (z) na altura do peito
  { const hf = bvh.ray(0, L.Ychest, -1, 0, 0, 1, 2), hb = bvh.ray(0, L.Ychest, 1, 0, 0, -1, 2); L.cz = hf && hb ? ((-1 + hf.t) + (1 - hb.t)) / 2 : L.H[2]; }
  return L;
}

// alças do top (costas nadador): polilinhas coladas no corpo, uma por lado
export function strapPaths(Lm, bvh) {
  const fr = (x, y) => { const h = bvh.ray(x, y, -1, 0, 0, 1, 2); return h ? [x, y, -1 + h.t] : null; };
  const bk = (x, y) => { const h = bvh.ray(x, y, 1, 0, 0, -1, 2); return h ? [x, y, 1 - h.t] : null; };
  const tp = (x, z) => { const h = bvh.ray(x, 2.5, z, 0, -1, 0, 2); return h ? [x, 2.5 - h.t, z] : null; };
  const out = {};
  for (const sd of ['L', 'R']) {
    const sx = sd === 'L' ? -1 : 1, ay = Lm.apex[1];
    // v5: nadador — as duas alças descem das costas até se encontrarem na alça única do meio (Sy − 9,5 cm)
    const pts = [fr(sx * 0.072, ay + 0.02), fr(sx * 0.088, Lm.Sy - 0.04), tp(sx * 0.10, Lm.N[2] - 0.005), bk(sx * 0.07, Lm.Sy - 0.04),
      bk(sx * 0.03, Lm.Sy - 0.078)].filter(Boolean);
    // reamostra a cada ~8 mm e cola cada ponto na pele (a corda entre pontos passaria por dentro do corpo)
    const dense = [];
    for (let i = 0; i + 1 < pts.length; i++) {
      const a = pts[i], b = pts[i + 1], m = Math.max(1, Math.ceil(G.dist(a, b) / 0.008));
      for (let k = 0; k < m; k++) dense.push(G.lerp3(a, b, k / m));
    }
    dense.push(pts[pts.length - 1]);
    for (let it = 0; it < 3; it++) for (let i = 0; i < dense.length; i++) {
      const h = bvh.closest(dense[i][0], dense[i][1], dense[i][2]);
      dense[i] = [h.x, h.y, h.z];
    }
    out[sd] = dense;
  }
  return out;
}
function distPoly(p, pts) {
  let best = 1e9;
  for (let i = 0; i + 1 < pts.length; i++) {
    const a = pts[i], b = pts[i + 1], ab = G.sub(b, a), t = clamp(G.dot(G.sub(p, a), ab) / G.dot(ab, ab), 0, 1);
    best = Math.min(best, G.dist(p, G.add(a, G.scl(ab, t))));
  }
  return best;
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

// manga curta (v6): até o meio do bíceps — o lado de dentro da barra fica ~3 cm abaixo do ápice da axila (antes a barra
// de dentro caía no próprio ápice e a manga ficava soldada ao tronco)
export const sleeveLen = (g) => g === 'f' ? 0.145 : 0.165;
// barra dos tops (v4): 4,5 cm abaixo do topo do cós do short (corta-vento 6,3 cm) — a camiseta não cobre o short inteiro
export const hemY = (kind, Lm) => kind === 'corta-vento' ? Lm.T[1] - 0.075 : Lm.T[1] - 0.057;
// ---------------------------------------------------------------- funções de região das roupas
// Cada roupa: termos { nome: f(A, o) } e R = smax dos termos. δ de um termo = −valor (distância à borda).
export function garmentTerms(kind, g, Lm) {
  const f = g === 'f', H = Lm.H, N = Lm.N, T = Lm.T;
  const y = (A, o) => A[o + 1];
  const hem = Y => (A, o) => Y - y(A, o);
  const top = Y => (A, o) => y(A, o) - Y;
  // manga: no corpo, pela coordenada sA (peso de braço); na roupa caída, pela coordenada axial do tubo do braço (os
  // vértices do tronco nunca são cortados pela manga, mesmo herdando peso de braço perto da axila)
  // barra da manga curta inclinada: 2,5 cm mais curta do lado de dentro (virado para o tronco), onde o braço encosta
  const inner = (A, o) => { const sd = A[o] < 0 ? 'L' : 'R', S = Lm.S[sd], E = Lm.E[sd], ax = G.norm(G.sub(E, S)), d = G.sub([A[o], A[o + 1], A[o + 2]], S), r = G.sub(d, G.scl(ax, G.dot(d, ax))), l = G.len(r) || 1; return Math.max(0, (sd === 'L' ? r[0] : -r[0]) / l); };
  const sleeve = (L, tilt = 0) => (A, o) => A[o + K.dr] > 0.5 ? (A[o + K.tb] > 0.5 && A[o + K.tb] < 1.5 ? A[o + K.sx] - L + tilt * inner(A, o) : -1) : A[o + K.sA] < 0 ? -1 : A[o + K.sA] - L;
  // barra da perna: plano perpendicular ao eixo da coxa (distância L do quadril) — para todo ponto do lado, não só
  // os de peso de perna ≥ 0,5 (senão a barra subia em "V" na dobra do glúteo); canela: sL como antes
  const legEnd = L => (A, o) => {
    if (L > Lm.thigh) return A[o + K.sL] < 0 ? -1 : A[o + K.sL] - L;
    const sd = A[o] < 0 ? 'L' : 'R', a = Lm.Lg[sd], ax = G.norm(G.sub(Lm.Kn[sd], a));
    return (A[o] - a[0]) * ax[0] + (A[o + 1] - a[1]) * ax[1] + (A[o + 2] - a[2]) * ax[2] - L;
  };
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
  const noHead = (A, o) => A[o + K.head] >= 0.5 ? 1 : -1;
  switch (kind) {
    case 'camiseta': return { noHead, hem: hem(hemY(kind, Lm)), neck: neck(0.068, 0.03), sleeve: sleeve(sleeveLen(g)) };
    case 'regata': return { noHead, hem: hem(hemY(kind, Lm)), neck: neck(0.075, f ? 0.10 : 0.09), armhole: armhole(f ? 0.07 : 0.075, f ? 0.14 : 0.15, f ? 0.11 : 0.115), noArm };
    case 'top': {
      // corpo do top: faixa sob o busto + bojo na frente até a linha de cima (por ângulo em volta do tronco)
      const ay = Lm.apex[1], Yb = Lm.Ybra;
      // v4: painel lateral até a axila (Sy − 6 cm) — antes a lateral descia a Ybra + 7,5 cm e abria uma janela entre o
      // bojo e a alça que mostrava a lateral do seio
      const topY = th => { const a = Math.abs(th); const P = [[0, ay + 0.035], [0.5, ay + 0.04], [0.95, Lm.Sy - 0.055], [1.5, Lm.Sy - 0.065], [2.15, Lm.Sy - 0.08], [2.6, Yb + 0.065], [Math.PI, Yb + 0.05]];
        for (let i = 1; i < P.length; i++) if (a <= P[i][0]) { const t = (a - P[i - 1][0]) / (P[i][0] - P[i - 1][0]); return P[i - 1][1] + (P[i][1] - P[i - 1][1]) * t; } return P[P.length - 1][1]; };
      const line = (A, o) => y(A, o) - topY(Math.atan2(A[o], -(A[o + 2] - Lm.cz)));
      const strap = (A, o) => { const p = [A[o], A[o + 1], A[o + 2]]; return Math.min(distPoly(p, Lm.straps.L), distPoly(p, Lm.straps.R)) - 0.016; };
      // alça única nas costas (nadador): "Y" que abre na faixa embaixo e recebe as duas alças em cima
      const wB = yy => 0.016 + 0.034 * Math.pow(smoothstep(Yb + 0.07, Yb + 0.02, yy), 1.5) + 0.02 * smoothstep(Lm.Sy - 0.098, Lm.Sy - 0.07, yy);
      const back = (A, o) => { const yy = A[o + 1]; if (A[o + 2] < Lm.cz + 0.01) return 1; return smax(Math.abs(A[o]) - wB(yy), Math.max(yy - (Lm.Sy - 0.066), (Yb - 0.02) - yy), 0.004); };
      const hm = hem(Yb - 0.02);
      return { noHead, noArm, hem: hm, line, strap, back,
        _R: (A, o) => smax(smax(smin(smin(smax(hm(A, o), line(A, o), 0.006), smax(strap(A, o), hm(A, o), 0.006), 0.012), back(A, o), 0.01), noArm(A, o), 0.004), noHead(A, o), 0.004) };
    }
    case 'manga-longa': return { noHead, hem: hem(hemY(kind, Lm)), neck: neck(0.066, 0.025), sleeve: sleeve(Lm.armLen - 0.015) };
    case 'corta-vento': return { noHead, hem: hem(hemY(kind, Lm)), neck: neck(0.075, 0.005), sleeve: sleeve(Lm.armLen + 0.005) };
    case 'short': return { waist: top(T[1] - 0.012), legEnd: legEnd(f ? 0.155 : 0.25), noArm };
    // v6: o short de baixo da saia-short é mais curto que a saia (a barra dele não aparece embaixo da saia)
    case 'saia-short': return { waist: top(T[1] - 0.012), legEnd: legEnd(0.115), noArm };
    case 'bermuda': return { waist: top(T[1] - 0.012), legEnd: legEnd(Lm.thigh - 0.035), noArm };
    case 'legging': return { waist: top(T[1] + 0.02), legEnd: legEnd(f ? Lm.thigh + 0.55 * Lm.shin : LL - 0.045), noArm };   // feminina: corsário
    case 'meia': return {
      top: (A, o) => A[o + K.sL] < 0 ? 1 : (LL - 0.10) - A[o + K.sL],
      bottom: (A, o) => A[o + K.sL] < 0 ? 1 : A[o + K.sL] - (LL + (A[o + K.dr] > 0.5 ? 0.045 : 0.02))   // v5: a meia caída desce mais (dentro do tênis)
    };
  }
  throw new Error('roupa desconhecida: ' + kind);
}
export function evalR(terms, A, o) {
  if (terms._R) return terms._R(A, o);
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
