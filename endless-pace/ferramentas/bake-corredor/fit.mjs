// Ajuste dos pesos das roupas por poses (v7, ESPEC §16). O tecido tem que se mover como a pele que ele cobre — e
// o melhor juiz disso são as próprias poses do jogo. Partindo dos pesos da pele embaixo (raio para dentro + alisamento),
// o laço abaixo deforma a peça e o corpo em cada pose (LBS de 4 ossos, igual ao three.js) e:
//   - onde a pele (só a da região certa: tronco para o lado do tronco, braço para a manga, perna para o short...) passa
//     do tecido, o vértice puxa os pesos para os da pele que entrou nele (é ela que o empurraria de verdade);
//   - onde o tecido estica demais (aresta > 1,5× e +8 mm) ou dobra (triângulo virado em relação às normais), o campo é
//     alisado mais forte ali;
//   - perto da pele em repouso (peças justas, gola, cós) o peso volta para o da pele embaixo (âncora).
// O resultado converge para "copiar a pele onde há contato" e "ponte lisa onde o tecido fica longe dela".
import { BVH } from './geom.mjs';

const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

// posições (e normais) de pele por pesos densos (nb por vértice) só com os ossos em `bones`
export function skinDense(P0, N0, W, nb, bones, S, n, outP, outN) {
  for (let v = 0; v < n; v++) {
    let x = 0, y = 0, z = 0, nx = 0, ny = 0, nz = 0;
    const px = P0[v * 3], py = P0[v * 3 + 1], pz = P0[v * 3 + 2];
    const qx = N0 ? N0[v * 3] : 0, qy = N0 ? N0[v * 3 + 1] : 0, qz = N0 ? N0[v * 3 + 2] : 0;
    for (const b of bones) {
      const w = W[v * nb + b]; if (!(w > 1e-6)) continue;
      const M = S[b];
      x += w * (M[0] * px + M[4] * py + M[8] * pz + M[12]); y += w * (M[1] * px + M[5] * py + M[9] * pz + M[13]); z += w * (M[2] * px + M[6] * py + M[10] * pz + M[14]);
      if (outN) { nx += w * (M[0] * qx + M[4] * qy + M[8] * qz); ny += w * (M[1] * qx + M[5] * qy + M[9] * qz); nz += w * (M[2] * qx + M[6] * qy + M[10] * qz); }
    }
    outP[v * 3] = x; outP[v * 3 + 1] = y; outP[v * 3 + 2] = z;
    if (outN) { const l = Math.hypot(nx, ny, nz) || 1; outN[v * 3] = nx / l; outN[v * 3 + 1] = ny / l; outN[v * 3 + 2] = nz / l; }
  }
}
// pele com pesos de 4 ossos (Uint8 J, W em 0..1)
export function skin4(P0, N0, J, Wt, S, n, outP, outN) {
  for (let v = 0; v < n; v++) {
    let x = 0, y = 0, z = 0, nx = 0, ny = 0, nz = 0;
    const px = P0[v * 3], py = P0[v * 3 + 1], pz = P0[v * 3 + 2], qx = N0[v * 3], qy = N0[v * 3 + 1], qz = N0[v * 3 + 2];
    for (let k = 0; k < 4; k++) {
      const w = Wt[v * 4 + k]; if (!w) continue;
      const M = S[J[v * 4 + k]];
      x += w * (M[0] * px + M[4] * py + M[8] * pz + M[12]); y += w * (M[1] * px + M[5] * py + M[9] * pz + M[13]); z += w * (M[2] * px + M[6] * py + M[10] * pz + M[14]);
      nx += w * (M[0] * qx + M[4] * qy + M[8] * qz); ny += w * (M[1] * qx + M[5] * qy + M[9] * qz); nz += w * (M[2] * qx + M[6] * qy + M[10] * qz);
    }
    const l = Math.hypot(nx, ny, nz) || 1;
    outP[v * 3] = x; outP[v * 3 + 1] = y; outP[v * 3 + 2] = z; outN[v * 3] = nx / l; outN[v * 3 + 1] = ny / l; outN[v * 3 + 2] = nz / l;
  }
}

// corpo em cada pose: { P, N, get(grupo) → BVH (feita na primeira vez) }. body = { n, P, N, J, W (0..1), idx, Wd (denso
// nb) }, groups = { nome: filtro(t) } sobre os triângulos do corpo em repouso
export function poseBodies(body, poses, groups) {
  return poses.map(ps => {
    const P = new Float64Array(body.n * 3), N = new Float64Array(body.n * 3), bvh = {};
    skin4(body.P, body.N, body.J, body.W, ps.S, body.n, P, N);
    let vs = null;
    const stretch = () => {
      if (vs) return vs;
      vs = new Float64Array(body.n).fill(1);
      const I = body.idx, Q = body.P;
      for (let t = 0; t < I.length; t += 3) for (let e = 0; e < 3; e++) {
        const a = I[t + e], b = I[t + (e + 1) % 3];
        const l0 = Math.hypot(Q[a * 3] - Q[b * 3], Q[a * 3 + 1] - Q[b * 3 + 1], Q[a * 3 + 2] - Q[b * 3 + 2]); if (l0 < 1e-5) continue;
        const r = Math.hypot(P[a * 3] - P[b * 3], P[a * 3 + 1] - P[b * 3 + 1], P[a * 3 + 2] - P[b * 3 + 2]) / l0;
        if (r > vs[a]) vs[a] = r; if (r > vs[b]) vs[b] = r;
      }
      return vs;
    };
    return { P, N, get: g => bvh[g] || (groups[g] ? (bvh[g] = new BVH(P, body.idx, groups[g])) : null), stretch, name: ps.name, wt: ps.wt == null ? 1 : ps.wt, S: ps.S, kind: ps.kind };
  });
}

// preparação por gênero (no bake): corpo como o jogo o vê (pesos de 4 ossos quantizados), grupos de pele, o esqueleto
// do jogo e as poses (corrida do RunnerRig a 10/14/18 m/s × 8 fases + extremos)
export function prepare(C, { PS, BI, NB, quantWeights, K, KN }) {
  if (C._fit) return C._fit;
  const b = C.body, n = b.n, Aw = C.Aw, wid = b.weld.wid, idx = b.idx;
  const q = quantWeights(b.Wd, n), Wq = new Float32Array(n * 4), Wd = new Float64Array(n * NB);
  for (let i = 0; i < n * 4; i++) Wq[i] = q.W[i] / 255;
  for (let v = 0; v < n; v++) for (let k = 0; k < 4; k++) Wd[v * NB + q.J[v * 4 + k]] += Wq[v * 4 + k];
  const at = (v, k) => Aw[wid[v] * KN + k], avg = (t, k) => (at(idx[t * 3], k) + at(idx[t * 3 + 1], k) + at(idx[t * 3 + 2], k)) / 3;
  const avgB = (t, bs) => { let s2 = 0; for (let e = 0; e < 3; e++) for (const bb of bs) s2 += Wd[idx[t * 3 + e] * NB + bb]; return s2 / 3; };
  const sideOf = t => (at(idx[t * 3], 0) + at(idx[t * 3 + 1], 0) + at(idx[t * 3 + 2], 0)) < 0 ? 'L' : 'R';
  const ELB = [BI.elbowL, BI.elbowR];
  const lower = t => avg(t, K.wArm) < 0.3 && avg(t, K.hand) < 0.3 && avg(t, K.head) < 0.5;
  // grupos de pele: filtros por triângulo do corpo (regiões); "<grupo>_v:<peça>" = só a pele que a peça não esconde
  // (máscara de cobertura LOD0 em C._bodyMask0), criado na hora
  const groups = {
    trunk: t => avg(t, K.wArm) < 0.5 && avg(t, K.hand) < 0.3 && avg(t, K.head) < 0.6 && avg(t, K.wLeg) < 0.5,
    arm: t => avg(t, K.wArm) >= 0.3 && avg(t, K.hand) < 0.3 && avgB(t, ELB) < 0.5,
    armLong: t => avg(t, K.wArm) >= 0.3 && avg(t, K.hand) < 0.3,
    lower,
    lowerL: t => lower(t) && !(sideOf(t) === 'R' && avg(t, K.wLeg) > 0.5),
    lowerR: t => lower(t) && !(sideOf(t) === 'L' && avg(t, K.wLeg) > 0.5),
    legs: t => avg(t, K.wLeg) > 0.5
  };
  const ch = { bones: C.data.bones, anchors: C.data.anchors, measures: C.data.measures, heightReal: C.data.heightReal, space: C.data.space };
  const MDf = { char: () => ch, part: () => (C.shoes ? { n: C.shoes.n, position: C.shoes.P } : null) };
  const R = PS.rigOf(MDf, C.g), st = PS.staticPoses(R), poses = [];
  const add = (name, pose, wt, kind) => poses.push({ name, S: PS.skinMats(ch, pose), wt, kind });
  for (const sp of [10, 14, 18]) for (let k = 0; k < 8; k++) add('r' + sp + '_' + k, PS.gameRun(R, k * Math.PI / 4, sp), sp === 14 ? 0.6 : 1, 'run');
  for (const pn of ['sprint', 'kneeLift', 'legBack']) add(pn, st[pn], 0.8, 'leg');
  for (const pn of ['armsFwd', 'armsBack', 'armsTight']) add(pn, st[pn], 0.8, 'arm');
  add('celebrate22', st.celebrate22, 0.6, 'arm');
  for (const pn of ['footPF', 'footDF']) add(pn, st[pn], 0.6, 'foot');
  const posed = poseBodies({ n, P: b.P, N: b.N, J: q.J, W: Wq, idx, Wd }, poses, groups);
  const byLayer = { 3: posed.filter(p => p.kind === 'run' || p.kind === 'arm' || p.name === 'sprint'), 2: posed.filter(p => p.kind === 'run' || p.kind === 'leg'),
    1: posed.filter(p => p.kind === 'run' || p.kind === 'foot' || p.name === 'kneeLift') };
  const visGroup = (gname, bit) => { const key = gname + '_v:' + bit; if (!groups[key]) { const f = groups[gname], M = C._bodyMask0; groups[key] = t => f(t) && !(M && (M[t] & bit)) && !(C.footDel && C.footDel[t]); } return key; };
  return (C._fit = { posed, byLayer, Wd, idx, groups, visGroup, ch, R });
}

// o laço de ajuste. o = {
//   P0, N0, n          casca soldada da peça em repouso (posição, normal)
//   adj, tris          vizinhança (CSR {off, nb}) e triângulos (índices soldados)
//   W                  pesos densos n×nb (alterados no lugar)
//   nb, allow          nº de ossos e máscara dos permitidos
//   S0, d0             pesos da pele embaixo em repouso (n×nb) e distância até ela
//   body               { idx, Wd }   (pesos densos da pele por vértice do corpo)
//   posed              poseBodies(...)
//   tests(v)           [[grupo, margem, ganho], ...] — que pele pode empurrar o vértice v e a distância mínima dela
//                      (margem negativa = só conta se entrar mais que isso: pele escondida pela máscara)
//   iters, eta, lam, smoothIt, anchor(v), maxD, fixed (Uint8: vértices que não mudam), project(v, W, o)
// }
// Direção do passo: para os pesos da pele que entrou, se isso afasta o vértice dela (modelo linear da LBS:
// d(sd)/d(w_b) = n·(M_b p)); senão, o gradiente dentro dos ossos que já pesam ali. Tamanho: o que desfaz a entrada.
export function fitWeights(o) {
  const { P0, N0, n, adj, tris, W, nb, allow, S0, body, posed } = o;
  const iters = o.iters ?? 8, eta = o.eta ?? 0.8, lam0 = o.lam ?? 0, smoothIt = o.smoothIt ?? 2, maxD = o.maxD ?? 0.05;
  const anchor = o.anchor || (() => 0);
  const fixed = o.fixed || null;
  const bones = []; for (let b = 0; b < nb; b++) if (allow[b]) bones.push(b);
  const P = new Float64Array(n * 3), N = new Float64Array(n * 3), acc = new Float64Array(n * nb), cnt = new Float64Array(n), mark = new Float64Array(n);
  const s = new Float64Array(nb), g = new Float64Array(nb), d = new Float64Array(nb), T = new Float64Array(n * nb), BW = body.Wd, BI = body.idx;
  // comprimentos de repouso das arestas
  const elen = new Float64Array(adj.nb.length);
  for (let v = 0; v < n; v++) for (let k = adj.off[v]; k < adj.off[v + 1]; k++) { const u = adj.nb[k]; elen[k] = Math.hypot(P0[u * 3] - P0[v * 3], P0[u * 3 + 1] - P0[v * 3 + 1], P0[u * 3 + 2] - P0[v * 3 + 2]); }
  const stats = [];
  const normalize = v => {
    let t = 0; for (const b of bones) { if (W[v * nb + b] < 0) W[v * nb + b] = 0; t += W[v * nb + b]; }
    for (let b = 0; b < nb; b++) if (!allow[b]) W[v * nb + b] = 0;
    if (t < 1e-9) { for (const b of bones) W[v * nb + b] = S0[v * nb + b]; return; }
    for (const b of bones) W[v * nb + b] /= t;
    if (o.project) o.project(v, W, v * nb);
  };
  for (let v = 0; v < n; v++) normalize(v);
  const testsOf = new Array(n); for (let v = 0; v < n; v++) testsOf[v] = o.tests(v) || [];
  for (let it = 0; it <= iters; it++) {
    acc.fill(0); cnt.fill(0); mark.fill(0);
    let viol = 0, violVis = 0, violMax = 0, str = 0, fold = 0;
    for (const ps of posed) {
      skinDense(P0, N0, W, nb, bones, ps.S, n, P, N);
      const S = ps.S;
      for (let v = 0; v < n; v++) {
        let best = null;
        for (const [gname, mg, gain] of testsOf[v]) {
          const bvh = ps.get(gname); if (!bvh) continue;
          const h = bvh.closest(P[v * 3], P[v * 3 + 1], P[v * 3 + 2], maxD);
          if (h.tri < 0) continue;
          const a = BI[h.tri * 3], b = BI[h.tri * 3 + 1], c = BI[h.tri * 3 + 2], PN = ps.N;
          const nx = PN[a * 3] * h.u + PN[b * 3] * h.v + PN[c * 3] * h.w, ny = PN[a * 3 + 1] * h.u + PN[b * 3 + 1] * h.v + PN[c * 3 + 1] * h.w, nz = PN[a * 3 + 2] * h.u + PN[b * 3 + 2] * h.v + PN[c * 3 + 2] * h.w;
          const nl = Math.hypot(nx, ny, nz) || 1, sd = ((P[v * 3] - h.x) * nx + (P[v * 3 + 1] - h.y) * ny + (P[v * 3 + 2] - h.z) * nz) / nl;
          if (sd >= mg) continue;
          const dv = mg - sd, sc = Math.min(1, dv / 0.008) * gain;
          if (!best || sc > best.sc) best = { sc, dv, a, b, c, h, n: [nx / nl, ny / nl, nz / nl], vis: mg > 0 };
        }
        if (!best) continue;
        viol++; if (best.vis) violVis++; if (best.dv > violMax) violMax = best.dv;
        const { a, b, c, h } = best;
        let t = 0;
        for (const bb of bones) { s[bb] = BW[a * nb + bb] * h.u + BW[b * nb + bb] * h.v + BW[c * nb + bb] * h.w; t += s[bb]; }
        if (t < 1e-6) continue;
        // d(sd)/d(w_b) = n · (M_b p0)
        const px = P0[v * 3], py = P0[v * 3 + 1], pz = P0[v * 3 + 2], nn = best.n;
        for (const bb of bones) { const M = S[bb]; g[bb] = nn[0] * (M[0] * px + M[4] * py + M[8] * pz + M[12]) + nn[1] * (M[1] * px + M[5] * py + M[9] * pz + M[13]) + nn[2] * (M[2] * px + M[6] * py + M[10] * pz + M[14]); }
        let dsd = 0;
        for (const bb of bones) { d[bb] = s[bb] / t - W[v * nb + bb]; dsd += d[bb] * g[bb]; }
        if (!(dsd > 1e-5)) {
          // gradiente dentro do suporte (ossos que já pesam no vértice ou na pele que entrou)
          let gm = 0, ns = 0;
          for (const bb of bones) if (W[v * nb + bb] > 0.01 || s[bb] / t > 0.01) { gm += g[bb]; ns++; }
          if (ns < 2) continue;
          gm /= ns; dsd = 0;
          for (const bb of bones) { d[bb] = (W[v * nb + bb] > 0.01 || s[bb] / t > 0.01) ? g[bb] - gm : 0; dsd += d[bb] * g[bb]; }
          if (!(dsd > 1e-6)) continue;
        }
        let al = Math.min(1, best.dv * 1.2 / dsd);
        for (const bb of bones) if (d[bb] < 0) al = Math.min(al, W[v * nb + bb] / -d[bb]);
        if (!(al > 0)) continue;
        for (const bb of bones) acc[v * nb + bb] += best.sc * ps.wt * al * d[bb];
        cnt[v] += best.sc * ps.wt;
      }
      // esticamento (em relação ao da pele embaixo, se houver) e dobra (triângulo virado contra as normais)
      const vs = o.under && ps.stretch ? ps.stretch() : null;
      for (let v = 0; v < n; v++) for (let k = adj.off[v]; k < adj.off[v + 1]; k++) {
        const u = adj.nb[k]; if (u < v) continue;
        const l = Math.hypot(P[u * 3] - P[v * 3], P[u * 3 + 1] - P[v * 3 + 1], P[u * 3 + 2] - P[v * 3 + 2]), l0 = elen[k], r = l / l0;
        const rs = vs ? Math.max(vs[o.under[v]], vs[o.under[u]]) : 1;
        if (r > 1.5 && l - l0 > 0.008 && r > 1.3 * rs) { const m = Math.min(1, (r - 1.5) / 1.5 + 0.3) * ps.wt; mark[v] = Math.max(mark[v], m); mark[u] = Math.max(mark[u], m); str++; }
      }
      if (tris) for (let t3 = 0; t3 < tris.length; t3 += 3) {
        const a = tris[t3], b = tris[t3 + 1], c = tris[t3 + 2];
        const e1x = P[b * 3] - P[a * 3], e1y = P[b * 3 + 1] - P[a * 3 + 1], e1z = P[b * 3 + 2] - P[a * 3 + 2], e2x = P[c * 3] - P[a * 3], e2y = P[c * 3 + 1] - P[a * 3 + 1], e2z = P[c * 3 + 2] - P[a * 3 + 2];
        const fx = e1y * e2z - e1z * e2y, fy = e1z * e2x - e1x * e2z, fz = e1x * e2y - e1y * e2x;
        const sx = N[a * 3] + N[b * 3] + N[c * 3], sy = N[a * 3 + 1] + N[b * 3 + 1] + N[c * 3 + 1], sz = N[a * 3 + 2] + N[b * 3 + 2] + N[c * 3 + 2];
        const dd = fx * sx + fy * sy + fz * sz;
        if (dd < -0.2 * Math.hypot(fx, fy, fz) * Math.hypot(sx, sy, sz)) { fold++; const m = 0.6 * ps.wt; mark[a] = Math.max(mark[a], m); mark[b] = Math.max(mark[b], m); mark[c] = Math.max(mark[c], m); }
      }
    }
    stats.push({ it, viol, vis: violVis, violMax: +(violMax * 1000).toFixed(1), str, fold });
    if (o.log) o.log(stats[stats.length - 1]);
    if (it === iters) break;
    // a correção (não o campo) é espalhada pela vizinhança: o campo de base (pele, manga rígida) não se dilui
    for (let v = 0; v < n; v++) { const k = cnt[v] > 0 ? eta / Math.max(cnt[v], 1) : 0; for (const b of bones) acc[v * nb + b] *= k; }
    for (let si = 0; si < (o.spread ?? 4); si++) {
      T.set(acc);
      for (let v = 0; v < n; v++) {
        const o0 = adj.off[v], o1 = adj.off[v + 1]; if (o1 === o0) continue;
        for (const b of bones) { let m = 0; for (let k = o0; k < o1; k++) m += acc[adj.nb[k] * nb + b]; const mm = m / (o1 - o0); if (Math.abs(mm) > Math.abs(acc[v * nb + b])) T[v * nb + b] = 0.5 * (acc[v * nb + b] + mm); }
      }
      acc.set(T);
    }
    for (let v = 0; v < n; v++) {
      if (fixed && fixed[v]) continue;
      for (const b of bones) W[v * nb + b] += acc[v * nb + b];
      const an = anchor(v); if (an > 0) for (const b of bones) W[v * nb + b] += an * (S0[v * nb + b] - W[v * nb + b]);
      normalize(v);
    }
    // alisamento do campo só onde esticou além da pele ou dobrou (e um pouco em todo lugar, se lam > 0)
    for (let si = 0; si < smoothIt; si++) {
      T.set(W);
      for (let v = 0; v < n; v++) {
        if (fixed && fixed[v]) continue;
        const o0 = adj.off[v], o1 = adj.off[v + 1]; if (o1 === o0) continue;
        const l = Math.min(0.85, lam0 + 0.6 * mark[v]); if (!(l > 0)) continue;
        for (const b of bones) { let m = 0; for (let k = o0; k < o1; k++) m += W[adj.nb[k] * nb + b]; T[v * nb + b] = W[v * nb + b] + l * (m / (o1 - o0) - W[v * nb + b]); }
      }
      W.set(T);
      for (let v = 0; v < n; v++) normalize(v);
    }
  }
  return stats;
}
