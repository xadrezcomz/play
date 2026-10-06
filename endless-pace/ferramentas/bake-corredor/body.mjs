// Corpo: carrega o UBC, reposiciona (T → braços para baixo, punho relaxado), emagrece (corredor
// amador em forma), passa para o referencial do jogo e reduz os 65 ossos aos 17 do jogo.
import path from 'node:path';
import * as G from './gltf.mjs';
import { weld, neighbors, taubin, vertexNormals, smoothstep } from './geom.mjs';

export const BONES = ['hips', 'torso', 'head', 'armL', 'elbowL', 'armR', 'elbowR', 'legL', 'kneeL', 'footL', 'legR', 'kneeR', 'footR',
  'pony', 'pony2', 'hairA', 'hairA2'];
export const PARENT = [-1, 0, 1, 1, 3, 1, 5, 0, 7, 8, 0, 10, 11, 2, 13, 2, 15];
export const BI = Object.fromEntries(BONES.map((b, i) => [b, i]));
export const NB = BONES.length;

// osso do UBC → osso do jogo (lado: _l → L, que no jogo fica em x negativo)
export function gameBoneOf(name) {
  const m = name.match(/_(l|r)$/), S = m ? (m[1] === 'l' ? 'L' : 'R') : '';
  const base = name.replace(/_(l|r)$/, '');
  if (base === 'root' || base === 'pelvis') return BI.hips;
  if (/^spine_0[123]$/.test(base) || base === 'clavicle') return BI.torso;
  if (base === 'neck_01' || base === 'Head') return BI.head;
  if (base === 'upperarm') return BI['arm' + S];
  if (base === 'lowerarm' || base === 'hand' || /^(index|middle|ring|pinky|thumb)_0/.test(base)) return BI['elbow' + S];
  if (base === 'thigh') return BI['leg' + S];
  if (base === 'calf') return BI['knee' + S];
  if (base === 'foot' || base === 'ball' || base === 'ball_leaf') return BI['foot' + S];
  throw new Error('osso sem destino: ' + name);
}

const SLIM = {
  m: { upperarm: [0.84, 0.86], lowerarm: [0.9, 0.9], clavicle: [0.8, 0.85], neck_01: [0.84, 0.88], spine_03: [0.88, 0.95], spine_02: [0.92, 0.95],
    spine_01: [0.95, 0.96], pelvis: [0.97, 1], thigh: [0.92, 0.94], calf: [0.94, 0.95] },
  f: { upperarm: [0.93, 0.93], lowerarm: [0.95, 0.95], clavicle: [0.9, 0.9], neck_01: [0.9, 0.92], spine_03: [0.95, 0.94], spine_02: [0.96, 0.98],
    spine_01: [0.97, 0.98], pelvis: [0.96, 1], thigh: [0.93, 0.95], calf: [0.96, 0.97] }
};
const SLIM_CHILD = { upperarm: 'lowerarm', lowerarm: 'hand', clavicle: 'upperarm', neck_01: 'Head', spine_03: 'neck_01', spine_02: 'spine_03',
  spine_01: 'spine_02', pelvis: 'spine_01', thigh: 'calf', calf: 'foot' };

export const POSE = { m: { abd: 10, clav: 8, elbow: 8, fist: 0.8, wrist: 0.5 }, f: { abd: 13, clav: 8, elbow: 8, fist: 0.8, wrist: 0.5 } };

function nodeWorlds(g) {
  const W = new Array(g.nodes.length), par = {};
  g.nodes.forEach((n, i) => (n.children || []).forEach(c => { par[c] = i; }));
  const f = i => {
    if (W[i]) return W[i];
    const n = g.nodes[i], L = n.matrix || G.compose(n.translation, n.rotation, n.scale);
    W[i] = par[i] !== undefined ? G.mul(f(par[i]), L) : L;
    return W[i];
  };
  g.nodes.forEach((_, i) => f(i));
  return W;
}

// média (com sinal alinhado) das rotações de uma animação por nome de nó
export function animMeanRot(ual, animName) {
  const a = ual.animations.find(x => x.name === animName);
  if (!a) throw new Error('animação não encontrada: ' + animName);
  const out = {};
  for (const c of a.channels) {
    if (c.target.path !== 'rotation') continue;
    const v = ual.acc(a.samplers[c.sampler].output), n = v.length / 4;
    const q = [0, 0, 0, 0];
    for (let i = 0; i < n; i++) {
      let s = v[i * 4] * v[0] + v[i * 4 + 1] * v[1] + v[i * 4 + 2] * v[2] + v[i * 4 + 3] * v[3] < 0 ? -1 : 1;
      for (let k = 0; k < 4; k++) q[k] += s * v[i * 4 + k];
    }
    const l = Math.hypot(...q);
    out[ual.nodes[c.target.node].name] = q.map(x => x / l);
  }
  return out;
}

function prim(g, p) {
  const A = p.attributes;
  return {
    pos: g.acc(A.POSITION), nor: g.acc(A.NORMAL), uv: A.TEXCOORD_0 !== undefined ? g.acc(A.TEXCOORD_0) : null,
    jn: g.acc(A.JOINTS_0), wt: g.acc(A.WEIGHTS_0), idx: g.acc(p.indices), mat: g.materials[p.material].name
  };
}

// carrega o glTF do corpo com esqueleto e as três malhas (corpo, olhos, sobrancelhas/cílios)
export function loadBody(file) {
  const g = G.loadGltf(file);
  const sk = g.skins[0], J = sk.joints, nJ = J.length, ibm = g.acc(sk.inverseBindMatrices);
  const names = J.map(j => g.nodes[j].name), ji = Object.fromEntries(names.map((n, i) => [n, i]));
  const parent = new Int32Array(nJ).fill(-1);
  J.forEach((j, i) => (g.nodes[j].children || []).forEach(c => { const k = J.indexOf(c); if (k >= 0) parent[k] = i; }));
  const IBM = names.map((_, i) => Array.from(ibm.subarray(i * 16, i * 16 + 16)));
  const NW = nodeWorlds(g);
  const bindW = IBM.map(m => G.invert(m));
  let err = 0;
  J.forEach((j, i) => { for (let k = 0; k < 16; k++) err = Math.max(err, Math.abs(bindW[i][k] - NW[j][k])); });
  const meshes = {};
  g.nodes.forEach(n => {
    if (n.mesh === undefined) return;
    for (const p of g.meshes[n.mesh].primitives) {
      const pr = prim(g, p);
      const key = /Eyes/i.test(pr.mat) ? 'eyes' : /Hair/i.test(pr.mat) ? 'brows' : 'body';
      if (meshes[key]) throw new Error('malha repetida: ' + key);
      meshes[key] = pr;
    }
  });
  const rootW = Array.from(parent).map((p, i) => p < 0 ? (() => { const pn = g.nodes.findIndex(n => (n.children || []).includes(J[i])); return pn >= 0 ? NW[pn] : G.I4(); })() : null);
  return { g, J, names, ji, parent, IBM, bindW, bindErr: err, meshes, rootW, nodes: J.map(j => g.nodes[j]) };
}

// reposiciona: devolve matrizes de mundo posadas por osso
export function reposeSkeleton(B, ualRot, P) {
  const { names, parent, nodes, rootW } = B, nJ = names.length;
  const fist = /^(index|middle|ring|pinky|thumb)_0[123]_[lr]$/;
  const L = nodes.map((n, i) => {
    let r = n.rotation || [0, 0, 0, 1];
    if (fist.test(names[i]) && ualRot[names[i]]) r = G.slerp(r, ualRot[names[i]], P.fist);
    if (/^hand_[lr]$/.test(names[i]) && ualRot[names[i]]) r = G.slerp(r, ualRot[names[i]], P.wrist);
    return G.compose(n.translation, r, n.scale);
  });
  const W = new Array(nJ);
  for (let i = 0; i < nJ; i++) W[i] = parent[i] < 0 ? G.mul(rootW[i], L[i]) : G.mul(W[parent[i]], L[i]);
  const pos = i => G.transl(W[i]);
  const sub = new Array(nJ).fill(null).map(() => []);
  for (let i = 0; i < nJ; i++) { let p = i; while (p >= 0) { sub[p].push(i); p = parent[p]; } }
  const rotSub = (r, q) => { const R = G.rotAbout(pos(r), q); for (const k of sub[r]) W[k] = G.mul(R, W[k]); };
  const ji = B.ji, log = {};
  for (const side of ['l', 'r']) {
    const sx = side === 'l' ? 1 : -1;
    rotSub(ji['clavicle_' + side], G.axisAngle([0, 0, 1], -sx * P.clav * Math.PI / 180));
    const u = ji['upperarm_' + side], l = ji['lowerarm_' + side], h = ji['hand_' + side];
    const ab = P.abd * Math.PI / 180;
    rotSub(u, G.rotBetween(G.sub(pos(l), pos(u)), [sx * Math.sin(ab), -Math.cos(ab), 0]));
    const up = G.norm(G.sub(pos(l), pos(u)));
    rotSub(l, G.rotBetween(G.sub(pos(h), pos(l)), up));
    // dobra o cotovelo para a frente (+z no glTF): escolhe o sinal que leva o punho para a frente
    const ax = G.norm(G.cross(up, [0, 0, 1])), z0 = pos(h)[2];
    const tryW = W.slice();
    rotSub(l, G.axisAngle(ax, P.elbow * Math.PI / 180));
    if (pos(h)[2] < z0) { for (let i = 0; i < nJ; i++) W[i] = tryW[i]; rotSub(l, G.axisAngle(ax, -P.elbow * Math.PI / 180)); }
    if (!(pos(h)[2] > z0)) throw new Error('cotovelo não dobrou para a frente (' + side + ')');
    // palma voltada para a coxa (medial): os dedos dobrados apontam para o lado da palma
    const m1 = pos(ji['middle_01_' + side]), m3 = pos(ji['middle_03_' + side]), ax2 = G.norm(G.sub(m1, pos(h)));
    let pd = G.sub(m3, m1); pd = G.norm(G.sub(pd, G.scl(ax2, G.dot(pd, ax2))));
    log['palm_' + side] = +(-pd[0] * sx).toFixed(3);
    if (log['palm_' + side] < 0.7) throw new Error('palma não está voltada para a coxa (' + side + '): ' + log['palm_' + side]);
  }
  return { W, log };
}

// aplica as matrizes de pele a uma malha
export function skinMesh(B, W, m) {
  const S = W.map((w, i) => G.mul(w, B.IBM[i]));
  const n = m.pos.length / 3, P = new Float64Array(n * 3), N = new Float64Array(n * 3);
  for (let v = 0; v < n; v++) {
    const p = [m.pos[v * 3], m.pos[v * 3 + 1], m.pos[v * 3 + 2]], q = [m.nor[v * 3], m.nor[v * 3 + 1], m.nor[v * 3 + 2]];
    let rp = [0, 0, 0], rn = [0, 0, 0], tw = 0;
    for (let k = 0; k < 4; k++) {
      const w = m.wt[v * 4 + k];
      if (!w) continue;
      const M = S[m.jn[v * 4 + k]];
      rp = G.add(rp, G.scl(G.tp(M, p), w)); rn = G.add(rn, G.scl(G.td(M, q), w)); tw += w;
    }
    rp = G.scl(rp, 1 / tw); rn = G.norm(rn);
    P.set(rp, v * 3); N.set(rn, v * 3);
  }
  return { P, N };
}

// emagrecimento (§2): escala radial por segmento + Taubin com máscara
export function slimBody(B, gender, P, m, JP, underwear) {
  const K = SLIM[gender], names = B.names, n = P.length / 3;
  const out = new Float64Array(P.length);
  for (let v = 0; v < n; v++) {
    const q = [P[v * 3], P[v * 3 + 1], P[v * 3 + 2]];
    let acc = [0, 0, 0], tw = 0;
    for (let k = 0; k < 4; k++) {
      const w = m.wt[v * 4 + k];
      if (!w) continue;
      const nm = names[m.jn[v * 4 + k]], base = nm.replace(/_[lr]$/, ''), sd = (nm.match(/_[lr]$/) || [''])[0];
      let r = q;
      if (K[base]) {
        const ch = SLIM_CHILD[base], chn = /^(Head|neck_01|spine_0\d)$/.test(ch) ? ch : ch + sd;
        const a = JP[nm], b = JP[chn], ab = G.sub(b, a);
        const t = Math.max(0, Math.min(1, G.dot(G.sub(q, a), ab) / G.dot(ab, ab)));
        const c = G.add(a, G.scl(ab, t)), rad = G.sub(q, c), kk = K[base];
        r = [c[0] + rad[0] * kk[0], c[1] + rad[1] * (kk[0] + kk[1]) / 2, c[2] + rad[2] * kk[1]];
      }
      acc = G.add(acc, G.scl(r, w)); tw += w;
    }
    out.set(G.scl(acc, 1 / tw), v * 3);
  }
  // Taubin na malha soldada
  const wd = weld(m.pos, n, 1e-5);
  const widx = Uint32Array.from(m.idx, i => wd.wid[i]);
  const adj = neighbors(widx, wd.nw);
  const W = new Float64Array(wd.nw * 3), mask = new Float64Array(wd.nw), uw = new Float64Array(wd.nw);
  for (let v = 0; v < n; v++) {
    const w = wd.wid[v];
    W.set(out.subarray(v * 3, v * 3 + 3), w * 3);
    let s = 0;
    for (let k = 0; k < 4; k++) if (/^(spine|pelvis|clavicle|upperarm|lowerarm|thigh|neck)/.test(names[m.jn[v * 4 + k]])) s += m.wt[v * 4 + k];
    mask[w] = Math.min(1, s);
    if (underwear[v]) uw[w] = 1;
  }
  taubin(W, adj, mask, 8);
  // roupa de baixo modelada (volume e bordas): mais suavização só ali
  const uwm = new Float64Array(wd.nw);
  for (let i = 0; i < wd.nw; i++) uwm[i] = uw[i] ? 1 : 0;
  // espalha a máscara um anel para a borda não ficar marcada
  for (let it = 0; it < 2; it++) {
    const t = Float64Array.from(uwm);
    for (let i = 0; i < wd.nw; i++) for (let q = adj.off[i]; q < adj.off[i + 1]; q++) t[i] = Math.max(t[i], uwm[adj.nb[q]] * 0.6);
    uwm.set(t);
  }
  taubin(W, adj, uwm, 6);
  for (let v = 0; v < n; v++) out.set(W.subarray(wd.wid[v] * 3, wd.wid[v] * 3 + 3), v * 3);
  return { P: out, weld: wd, widx, adj };
}

// referencial do jogo (§1.6): 180° em Y, escala para "espaço 1,76", pés na palmilha (LIFT)
export function frameOf(yFloor, top) {
  const s = 1.76 / (top - yFloor);
  return { s, yFloor, LIFT: 0.022, apply: (p) => [-p[0] * s, (p[1] - yFloor) * s + 0.022, -p[2] * s], dir: (d) => [-d[0], d[1], -d[2]] };
}

// pesos reduzidos aos ossos do jogo (densos: n × NB)
export function collapseWeights(B, m) {
  const n = m.pos.length / 3, W = new Float32Array(n * NB), map = B.names.map(gameBoneOf);
  for (let v = 0; v < n; v++) for (let k = 0; k < 4; k++) { const w = m.wt[v * 4 + k]; if (w) W[v * NB + map[m.jn[v * 4 + k]]] += w; }
  for (let v = 0; v < n; v++) {
    let s = 0;
    for (let b = 0; b < NB; b++) s += W[v * NB + b];
    for (let b = 0; b < NB; b++) W[v * NB + b] /= s;
  }
  return W;
}

// soma dos pesos UBC de um grupo de ossos (por vértice)
export function ubcGroupWeight(B, m, re) {
  const n = m.pos.length / 3, out = new Float32Array(n);
  const hit = B.names.map(nm => re.test(nm));
  for (let v = 0; v < n; v++) for (let k = 0; k < 4; k++) if (hit[m.jn[v * 4 + k]]) out[v] += m.wt[v * 4 + k];
  return out;
}

// top-4 quantizado em bytes (soma exatamente 255)
export function quantWeights(dense, n, nb = NB) {
  const J = new Uint8Array(n * 4), Wt = new Uint8Array(n * 4);
  for (let v = 0; v < n; v++) {
    const list = [];
    for (let b = 0; b < nb; b++) { const w = dense[v * nb + b]; if (w > 1e-4) list.push([b, w]); }
    list.sort((a, c) => c[1] - a[1] || a[0] - c[0]);
    const top = list.slice(0, 4);
    const s = top.reduce((a, e) => a + e[1], 0) || 1;
    let q = top.map(e => Math.round(e[1] / s * 255));
    const rem = 255 - q.reduce((a, b) => a + b, 0);
    q[0] += rem;
    for (let k = 0; k < 4; k++) { J[v * 4 + k] = top[k] ? top[k][0] : 0; Wt[v * 4 + k] = top[k] ? q[k] : 0; }
  }
  return { J, W: Wt };
}

export { smoothstep, vertexNormals, path };
