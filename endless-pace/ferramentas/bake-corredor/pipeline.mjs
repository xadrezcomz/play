// Linha de produção de um gênero: corpo → rótulos → tênis → roupas → cabelos → texturas → LODs → codificação.
import fs from 'node:fs';
import path from 'node:path';
import * as G from './gltf.mjs';
import * as BD from './body.mjs';
import { vertexNormals, neighbors, BVH } from './geom.mjs';
import * as LB from './label.mjs';
import * as GM from './garments.mjs';
import * as TX from './textures.mjs';
import * as EN from './encode.mjs';
import { SLOTS, SL, MATS, COVER_BITS } from './consts.mjs';
export { SL };

export const GFILE = { m: 'Superhero_Male_FullBody', f: 'Superhero_Female_FullBody' };
export const ALBEDO = { m: 'T_Superhero_Male_Dark.png', f: 'T_Superhero_Female_Dark_BaseColor.png' };
export const NORMAL = { m: 'T_Superhero_Male_Normal.png', f: 'T_Superhero_Female_Normal.png' };

let ualCache = null;


export async function bakeGender(g, ctx) {
  const rep = ctx.report, F = ctx.fontes;
  const B = BD.loadBody(path.join(F, GFILE[g] + '.gltf'));
  rep.bindErr = B.bindErr;
  if (!ualCache) ualCache = BD.animMeanRot(G.loadGlb(path.join(F, 'ual', 'UAL1_Standard.glb')), 'Jog_Fwd_Loop');
  const C = { g, B, rep, ctx };

  // ---- 1. pose
  const { W, log } = BD.reposeSkeleton(B, ualCache, BD.POSE[g]);
  Object.assign(rep, log);
  const JPg = Object.fromEntries(B.names.map((n, i) => [n, G.transl(W[i])]));
  const body = B.meshes.body;
  const sk = BD.skinMesh(B, W, body);
  const eyes = BD.skinMesh(B, W, B.meshes.eyes), brows = BD.skinMesh(B, W, B.meshes.brows);

  // ---- 2. albedo e máscara da roupa de baixo (por vértice)
  const albImg = TX.decodePNG(fs.readFileSync(path.join(F, ALBEDO[g])));
  C.albImg = albImg;
  const n = body.pos.length / 3;
  const uwV = new Uint8Array(n), uwRe = g === 'f' ? /^(pelvis|spine_0[123]|thigh_[lr])$/ : /^(pelvis|spine_01|thigh_[lr])$/;
  for (let v = 0; v < n; v++) {
    let b = -1, bw = 0;
    for (let k = 0; k < 4; k++) if (body.wt[v * 4 + k] > bw) { bw = body.wt[v * 4 + k]; b = body.jn[v * 4 + k]; }
    if (!uwRe.test(B.names[b])) continue;
    const x = Math.min(albImg.w - 1, Math.floor(body.uv[v * 2] * albImg.w)), y = Math.min(albImg.h - 1, Math.floor(body.uv[v * 2 + 1] * albImg.h));
    const p = (y * albImg.w + x) * 4, hv = TX.hsv(albImg.d[p] / 255, albImg.d[p + 1] / 255, albImg.d[p + 2] / 255);
    if (hv.v < 0.32 && hv.s < 0.35) uwV[v] = 1;
  }
  C.uwV = uwV;

  // ---- 3. emagrecer
  const sl = BD.slimBody(B, g, sk.P, body, JPg, uwV);

  // ---- 4. referencial do jogo
  let yMin = 1e9, yMax = -1e9;
  for (let v = 0; v < n; v++) { yMin = Math.min(yMin, sl.P[v * 3 + 1]); yMax = Math.max(yMax, sl.P[v * 3 + 1]); }
  const FR = BD.frameOf(yMin, yMax);
  C.FR = FR;
  const toGame = (P) => { const o = new Float64Array(P.length); for (let i = 0; i < P.length / 3; i++) o.set(FR.apply([P[i * 3], P[i * 3 + 1], P[i * 3 + 2]]), i * 3); return o; };
  const dirGame = (N) => { const o = new Float64Array(N.length); for (let i = 0; i < N.length / 3; i++) { o[i * 3] = -N[i * 3]; o[i * 3 + 1] = N[i * 3 + 1]; o[i * 3 + 2] = -N[i * 3 + 2]; } return o; };
  const P = toGame(sl.P);
  const JP = Object.fromEntries(Object.entries(JPg).map(([k, v]) => [k, FR.apply(v)]));
  C.JP = JP;
  // normais lisas pela malha soldada (sem costura de UV)
  const wd = sl.weld, PW = new Float64Array(wd.nw * 3);
  for (let v = 0; v < n; v++) PW.set(P.subarray(v * 3, v * 3 + 3), wd.wid[v] * 3);
  const NW = vertexNormals(PW, sl.widx, wd.nw);
  const N = new Float64Array(n * 3);
  for (let v = 0; v < n; v++) N.set(NW.subarray(wd.wid[v] * 3, wd.wid[v] * 3 + 3), v * 3);
  C.body = { n, P, N, uv: body.uv, idx: body.idx, weld: wd, widx: sl.widx, PW, NW, adjW: sl.adj };
  C.body.Wd = BD.collapseWeights(B, body);
  C.body.handW = BD.ubcGroupWeight(B, body, /^(hand|index|middle|ring|pinky|thumb)_/);
  C.body.headW = BD.ubcGroupWeight(B, body, /^Head$/);
  C.body.neckW = BD.ubcGroupWeight(B, body, /^neck_01$/);
  C.eyes = { P: toGame(eyes.P), N: dirGame(eyes.N), uv: B.meshes.eyes.uv, idx: B.meshes.eyes.idx };
  C.brows = { P: toGame(brows.P), N: dirGame(brows.N), uv: B.meshes.brows.uv, idx: B.meshes.brows.idx };
  rep.altura = +((yMax - yMin) * FR.s).toFixed(4);
  rep.escala = +FR.s.toFixed(5);

  // ---- 5. ossos
  const mid = (a, b) => G.lerp3(a, b, 0.5);
  const world = {
    hips: mid(JP.thigh_l, JP.thigh_r), torso: JP.spine_01, head: JP.neck_01,
    armL: JP.upperarm_l, elbowL: JP.lowerarm_l, armR: JP.upperarm_r, elbowR: JP.lowerarm_r,
    legL: JP.thigh_l, kneeL: JP.calf_l, footL: JP.foot_l, legR: JP.thigh_r, kneeR: JP.calf_r, footR: JP.foot_r
  };
  world.hips[0] = 0; world.torso[0] = 0; world.head[0] = 0;
  // provisórios (cabelo define depois)
  world.pony = G.add(JP.Head, [0, 0.1, 0.1]); world.pony2 = G.add(world.pony, [0, -0.12, 0.035]);
  world.hairA = G.add(JP.Head, [0, 0.02, 0.1]); world.hairA2 = G.add(world.hairA, [0, -0.13, 0.02]);
  C.boneWorld = world;

  // ---- 6. rótulos e roupas
  const Lm = LB.landmarks(C);
  C.Lm = Lm;
  const Aw = LB.weldedAttrs(C, Lm);
  C.Aw = Aw;
  rep.marcos = { Ychest: +Lm.Ychest.toFixed(3), Ybra: Lm.Ybra && +Lm.Ybra.toFixed(3), Sy: +Lm.Sy.toFixed(3) };
  const bodyBVH = new BVH(C.body.PW, C.body.widx);
  C.bodyBVH = bodyBVH;
  const legSide = sd => t => { let s = 0; for (let e = 0; e < 3; e++) { const o = C.body.widx[t * 3 + e] * LB.KN; if ((Aw[o] < 0) === (sd === 'L') && Aw[o + LB.K.wLeg] > 0.5) s++; } return s >= 2; };
  const legBVH = { L: new BVH(C.body.PW, C.body.widx, legSide('L')), R: new BVH(C.body.PW, C.body.widx, legSide('R')) };
  const slices = GM.torsoSlices(Aw, Lm.H[1] - 0.15, Lm.Sy + 0.05);
  const ctx0 = { Aw, widx: C.body.widx, Lm, bodyBVH, legBVH, slices };
  const kinds = LB.kindsOf(g), built = {};
  const shellOf = G0 => ({ bvh: new BVH(G0.P, G0.shellIdx), idx: G0.shellIdx, N: G0.N });
  const order = ['meia', ...kinds.filter(k => LB.BOTTOMS.includes(k)), ...kinds.filter(k => LB.TOPS.includes(k))];
  for (const k of order) {
    const lower = k === 'meia' ? [] : LB.BOTTOMS.includes(k) ? [shellOf(built.meia)] : kinds.filter(b => LB.BOTTOMS.includes(b)).map(b => shellOf(built[b]));
    const t1 = Date.now();
    built[k] = GM.buildGarment(C, k, { ...ctx0, lower });
    built[k].ao = GM.garmentAO(built[k], bodyBVH, ctx.rapido ? 8 : 24);
    rep['roupa_' + k] = { v: built[k].nv, tris: built[k].lods.map(l => l.length / 3), ms: Date.now() - t1 };
  }
  C.garments = built;

  // ---- 7. máscaras de cobertura por triângulo do corpo
  const nw = C.body.weld.nw, Rk = {};
  for (const k of kinds) { const T = LB.garmentTerms(k, g, Lm), r = new Float64Array(nw); for (let w = 0; w < nw; w++) r[w] = LB.evalR(T, Aw, w * LB.KN); Rk[k] = r; }
  C.Rk = Rk;
  const regW = new Uint8Array(nw);
  for (let w = 0; w < nw; w++) regW[w] = LB.regionOf(Aw, w * LB.KN, Lm);
  C.regW = regW;

  pack(C);
  return C;
}

// ---- empacotamento
function headOnly(n) { const J = new Uint8Array(n * 4), W = new Uint8Array(n * 4); for (let i = 0; i < n; i++) { J[i * 4] = BD.BI.head; W[i * 4] = 255; } return { J, W }; }
function attrA(n, mat, slot, ao = 255) { const A = new Uint8Array(n * 4); for (let i = 0; i < n; i++) { A[i * 4] = mat; A[i * 4 + 1] = slot; A[i * 4 + 2] = ao; } return A; }

function bodyCells(C) {
  const b = C.body, wid = b.weld.wid, nt = b.idx.length / 3, mask = new Uint32Array(nt), reg = new Uint8Array(nt);
  for (let t = 0; t < nt; t++) {
    const w = [wid[b.idx[t * 3]], wid[b.idx[t * 3 + 1]], wid[b.idx[t * 3 + 2]]];
    let m = 0;
    for (const k in C.Rk) { const r = C.Rk[k]; if (r[w[0]] <= -0.015 && r[w[1]] <= -0.015 && r[w[2]] <= -0.015) m |= 1 << COVER_BITS[k]; }
    if (C.hairCover) for (const hs in C.hairCover) { const hc = C.hairCover[hs]; if (hc[w[0]] && hc[w[1]] && hc[w[2]]) m |= 1 << COVER_BITS['hair:' + hs]; }
    mask[t] = m >>> 0;
    const rs = w.map(x => C.regW[x]).sort((a, c) => a - c);
    reg[t] = rs[1] === rs[2] ? rs[1] : rs[0] === rs[1] ? rs[0] : rs[0];
  }
  return { mask, reg };
}

function pack(C) {
  const b = C.body, q = BD.quantWeights(b.Wd, b.n);
  const { mask, reg } = bodyCells(C);
  const cellsMap = new Map();
  for (let t = 0; t < mask.length; t++) {
    const key = mask[t] * 32 + reg[t];
    if (!cellsMap.has(key)) cellsMap.set(key, []);
    cellsMap.get(key).push(t);
  }
  const keys = [...cellsMap.keys()].sort((a, c) => a - c);
  const cells = [], idx = [];
  for (const k of keys) {
    const tl = cellsMap.get(k), sub = [];
    for (const t of tl) sub.push(b.idx[t * 3], b.idx[t * 3 + 1], b.idx[t * 3 + 2]);
    idx.push(...EN.cacheOrderKeep(sub));
    cells.push([Math.floor(k / 32), k % 32, tl.length]);
  }
  C.rep.celulas = cells.length;
  const body = EN.encodePart({ n: b.n, P: b.P, N: b.N, T: b.uv, J: q.J, W: q.W, A: attrA(b.n, 0, 0) }, [{ idx: Uint32Array.from(idx), cells }]).part;
  const en = C.eyes.P.length / 3, eh = headOnly(en);
  const eyes = EN.encodePart({ n: en, P: C.eyes.P, N: C.eyes.N, T: C.eyes.uv, J: eh.J, W: eh.W, A: attrA(en, 5, SL.eye) }, [{ idx: EN.cacheOrderKeep(C.eyes.idx) }]).part;
  const bn = C.brows.P.length / 3, bh = headOnly(bn);
  const brows = EN.encodePart({ n: bn, P: C.brows.P, N: C.brows.N, J: bh.J, W: bh.W, A: attrA(bn, 3, SL.brow) }, [{ idx: EN.cacheOrderKeep(C.brows.idx) }]).part;
  const L = TX.down2(TX.toLinear(C.albImg));
  const img = { w: L.w, h: L.h, d: new Uint8Array(L.w * L.h * 4) };
  for (let i = 0; i < L.w * L.h; i++) { for (let c = 0; c < 3; c++) img.d[i * 4 + c] = TX.l2s(L.f[i * 3 + c] * 0.5); img.d[i * 4 + 3] = 255; }
  const skin = 'data:image/jpeg;base64,' + Buffer.from(TX.encodeJPEG(img, 88)).toString('base64');
  C.data = {
    v: 1, id: C.g + '-dev', gender: C.g, space: 1.76, heightReal: C.g === 'm' ? 1.76 : 1.68, lift: C.FR.LIFT,
    bones: { names: BD.BONES, parent: BD.PARENT, pos: boneRel(C.boneWorld) },
    slots: SLOTS, mats: MATS, coverBits: COVER_BITS,
    textures: { skin, uvNeutral: [0.5, 0.5], eyeTile: [0, 0, 1, 1] },
    body, eyes, brows
  };
  // roupas
  C.roupas = {};
  for (const k in C.garments) {
    const G0 = C.garments[k], Wd = GM.garmentWeights(G0), qq = BD.quantWeights(Wd, G0.nv), A = new Uint8Array(G0.nv * 4);
    for (let i = 0; i < G0.nv; i++) { A[i * 4] = G0.mat; A[i * 4 + 1] = G0.SLOT[i]; A[i * 4 + 2] = Math.round(Math.max(0, Math.min(1, G0.ao[i])) * 255); A[i * 4 + 3] = G0.FLAGS[i]; }
    const part = EN.encodePart({ n: G0.nv, P: G0.P, N: G0.N, J: qq.J, W: qq.W, A }, G0.lods.map(l => ({ idx: EN.cacheOrderKeep(l) })),
      { kind: k, mat: G0.mat, coverBit: COVER_BITS[k], layer: G0.layer }).part;
    C.roupas[k] = part;
  }
}

// posições relativas ao pai (repouso, rotações identidade)
export function boneRel(world) {
  return BD.BONES.map((b, i) => {
    const p = BD.PARENT[i], w = world[b];
    const r = p < 0 ? w : G.sub(w, world[BD.BONES[p]]);
    return r.map(x => +x.toFixed(5));
  });
}
