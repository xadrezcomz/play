// Linha de produção de um gênero: corpo → rótulos → tênis → roupas → cabelos → texturas → LODs → codificação.
import fs from 'node:fs';
import path from 'node:path';
import * as G from './gltf.mjs';
import * as BD from './body.mjs';
import { vertexNormals, neighbors, BVH, weld, components } from './geom.mjs';
import crypto from 'node:crypto';
import * as LB from './label.mjs';
import * as PX from './proxy.mjs';
import * as GM from './garments.mjs';
import * as DR from './drape.mjs';
import * as SK from './skin.mjs';
import * as SH from './shoes.mjs';
import * as HR from './hair.mjs';
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
  const body = B.meshes.body;

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

  // ---- 3. pose + emagrecer; abdução adaptativa: punho a ≥ 3 cm da coxa (cabe o short com folga)
  const handW = BD.ubcGroupWeight(B, body, /^(hand|index|middle|ring|pinky|thumb)_/), thighW = BD.ubcGroupWeight(B, body, /^thigh_/);
  let W, log, JPg, sk, sl, abd = BD.POSE[g].abd;
  for (;;) {
    ({ W, log } = BD.reposeSkeleton(B, ualCache, { ...BD.POSE[g], abd }));
    JPg = Object.fromEntries(B.names.map((nm, i) => [nm, G.transl(W[i])]));
    sk = BD.skinMesh(B, W, body);
    sl = BD.slimBody(B, g, sk.P, body, JPg, uwV);
    const hv = [], tv = [];
    for (let v = 0; v < n; v++) { if (handW[v] > 0.5) hv.push(v); else if (thighW[v] > 0.5) tv.push(v); }
    let gap = 1e9;
    for (const a of hv) for (const c of tv) { const d = Math.hypot(sl.P[a * 3] - sl.P[c * 3], sl.P[a * 3 + 1] - sl.P[c * 3 + 1], sl.P[a * 3 + 2] - sl.P[c * 3 + 2]); if (d < gap) gap = d; }
    rep.abducao = abd; rep.punhoCoxaPose = +gap.toFixed(4);
    if (gap >= 0.03 || abd >= 16) break;
    abd += 1;
  }
  Object.assign(rep, log);
  const eyes = BD.skinMesh(B, W, B.meshes.eyes), brows = BD.skinMesh(B, W, B.meshes.brows);

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
  // tronco sempre coberto por um top: sem mamilo e com o busto (f) / peitoral e abdômen (m) alisados — senão o tecido
  // colado marca tudo. Laplaciano puro no busto (f) e Taubin no tronco da frente (m).
  {
    const Sy = (JPg.upperarm_l[1] + JPg.upperarm_r[1]) / 2, sy = FR.apply([0, Sy, 0])[1], Wd0 = BD.collapseWeights(B, body), mb = new Float64Array(wd.nw);
    for (let v = 0; v < n; v++) {
      const w = wd.wid[v], x = PW[w * 3], y = PW[w * 3 + 1], z = PW[w * 3 + 2], armW = Wd0[v * 17 + BD.BI.armL] + Wd0[v * 17 + BD.BI.armR] + Wd0[v * 17 + BD.BI.elbowL] + Wd0[v * 17 + BD.BI.elbowR];
      if (armW > 0.2 || Wd0[v * 17 + BD.BI.head] > 0.2) continue;
      if (g === 'f') mb[w] = (z < 0.0 && Math.abs(x) < 0.15 ? 1 : 0) * GM.smoothstepX(sy - 0.24, sy - 0.18, y) * GM.smoothstepX(sy - 0.01, sy - 0.07, y);
      else mb[w] = GM.smoothstepX(sy - 0.45, sy - 0.38, y) * GM.smoothstepX(sy - 0.02, sy - 0.08, y) * 0.8;
    }
    const wi = Uint32Array.from(body.idx, i => wd.wid[i]), adj0 = neighbors(wi, wd.nw);
    if (g === 'f') BD.taubin(PW, adj0, mb, 10, 0.5, 0); else BD.taubin(PW, adj0, mb, 10);
    for (let v = 0; v < n; v++) P.set(PW.subarray(wd.wid[v] * 3, wd.wid[v] * 3 + 3), v * 3);
  }
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
  rep.alturaTopo = yMax * 0 + FR.apply([0, yMax, 0])[1];
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
  const bodyBVH = new BVH(C.body.PW, C.body.widx);
  C.bodyBVH = bodyBVH;
  const Lm = LB.landmarks(C, bodyBVH);
  C.Lm = Lm;
  const Aw = LB.weldedAttrs(C, Lm);
  C.Aw = Aw;
  if (g === 'f') Lm.straps = LB.strapPaths(Lm, bodyBVH);
  if (process.env.EP_DUMP) {   // depuração: instantâneo do corpo rotulado (ver ESPEC §14)
    const v8 = await import('node:v8');
    fs.writeFileSync(process.env.EP_DUMP + '-' + g + '.bin', v8.serialize({ g, PW: C.body.PW, NW: C.body.NW, widx: C.body.widx, P: C.body.P, idx: C.body.idx, Aw, Lm, rep: C.body.weld.rep, wid: C.body.weld.wid, nw: C.body.weld.nw, JP: C.JP, boneWorld: C.boneWorld }));
  }
  rep.marcos = { Ychest: +Lm.Ychest.toFixed(3), Ybra: Lm.Ybra && +Lm.Ybra.toFixed(3), Sy: +Lm.Sy.toFixed(3), cz: +Lm.cz.toFixed(3) };
  const legSide = sd => t => { let s = 0; for (let e = 0; e < 3; e++) { const o = C.body.widx[t * 3 + e] * LB.KN; if ((Aw[o] < 0) === (sd === 'L') && Aw[o + LB.K.wLeg] > 0.5) s++; } return s >= 2; };
  const legBVH = { L: new BVH(C.body.PW, C.body.widx, legSide('L')), R: new BVH(C.body.PW, C.body.widx, legSide('R')) };
  const slices = GM.torsoSlices(Aw, Lm.H[1] - 0.2, Lm.Sy + 0.05, C.body.widx);
  const bust = g === 'f' ? { Ybra: Lm.Ybra, apex: Lm.apex, cz: Lm.cz } : null;
  const tP = Date.now(), WI = C.body.widx;
  const triAvg = (t, k) => (Aw[WI[t * 3] * LB.KN + k] + Aw[WI[t * 3 + 1] * LB.KN + k] + Aw[WI[t * 3 + 2] * LB.KN + k]) / 3;
  const noArm = t => triAvg(t, LB.K.wArm) < 0.5 && triAvg(t, LB.K.hand) < 0.3;
  // v5: as roupas saem dos volumes caídos (drape.mjs); o procurador v4 (voxels) só com EP_OLD_GARMENTS=1
  let proxy = null, nets = null;
  if (process.env.EP_OLD_GARMENTS) ({ proxy, nets } = oldProxy(C, Aw, Lm, slices, WI, triAvg, noArm, rep));
  C.noArmBVH = new BVH(C.body.PW, WI, t => triAvg(t, LB.K.wArm) < 0.3 && triAvg(t, LB.K.hand) < 0.3);
  const trunkBVH = new BVH(C.body.PW, WI, noArm), armBVH = new BVH(C.body.PW, WI, t => triAvg(t, LB.K.wArm) >= 0.5 || triAvg(t, LB.K.hand) >= 0.3);
  const ctx0 = { Aw, widx: C.body.widx, Lm, bodyBVH, legBVH, slices, proxy, nets, trunkBVH, armBVH };
  const kinds = LB.kindsOf(g), built = {}, only = process.env.EP_ONLY ? process.env.EP_ONLY.split(',') : null;
  // camada de baixo para os raios de empilhamento: sem o forro (flag 2) e sem a saia (flag 4) — a pala da saia some
  // sob o top pelas máscaras de cobertura, então o top não precisa passar por cima dela
  const shellOf = G0 => { const L = G0.lods[0].filter((v, i, a) => { const t = i - i % 3; return !((G0.FLAGS[a[t]] | G0.FLAGS[a[t + 1]] | G0.FLAGS[a[t + 2]]) & 6); }); return { bvh: new BVH(G0.P, L), idx: L, N: G0.N }; };
  const order = ['meia', ...kinds.filter(k => LB.BOTTOMS.includes(k)), ...kinds.filter(k => LB.TOPS.includes(k))];
  for (const k of order) {
    if (only && !only.includes(k)) continue;
    const lower = k === 'meia' ? [] : LB.BOTTOMS.includes(k) ? (built.meia ? [shellOf(built.meia)] : []) : kinds.filter(b => LB.BOTTOMS.includes(b) && built[b]).map(b => shellOf(built[b]));
    const t1 = Date.now();
    built[k] = GM.buildGarment(C, k, { ...ctx0, lower });
    { const T = LB.garmentTerms(k, g, Lm), r = new Float64Array(C.body.weld.nw); for (let w = 0; w < r.length; w++) r[w] = LB.evalR(T, Aw, w * LB.KN);
      const lim = GM.cullMargin(k), vis = new BVH(C.body.PW, WI, t => !(r[WI[t * 3]] <= lim && r[WI[t * 3 + 1]] <= lim && r[WI[t * 3 + 2]] <= lim));
      built[k].ao = GM.garmentAO(built[k], vis, ctx.rapido ? 8 : 24); }
    rep['roupa_' + k] = { v: built[k].nv, tris: built[k].lods.map(l => l.length / 3), ms: Date.now() - t1 };
    console.log('  roupa', k, JSON.stringify(rep['roupa_' + k]));
  }
  C.garments = built;

  // ---- 6b. tênis (e o pé que fica dentro dele sai do corpo)
  const sh = SH.buildShoes(C, ctx.rapido ? 8 : 24);
  C.shoes = sh.shoes; C.footDel = sh.deleteMask;
  console.log('  tênis', JSON.stringify(rep.tenis), 'pé apagado:', sh.deleteMask.reduce((a, v) => a + v, 0), 'tris');

  // ---- 6c. cabelos (ossos de mola definidos aqui)
  const hr = HR.buildHairs(C, ctx.rapido ? 8 : 20);
  C.hairs = hr.hairs; C.hairCover = hr.covers;
  Object.assign(C.boneWorld, hr.bones);
  C.Hc = hr.Hc;

  // ---- 7. máscaras de cobertura por triângulo do corpo
  const nw = C.body.weld.nw, Rk = {};
  for (const k of kinds) { const T = LB.garmentTerms(k, g, Lm), r = new Float64Array(nw); for (let w = 0; w < nw; w++) r[w] = LB.evalR(T, Aw, w * LB.KN); Rk[k] = r; }
  // v6: short/bermuda soltos — a perna da peça é um tubo rígido com a coxa da virilha para baixo, então a coxa embaixo
  // dela fica (não é cortada) a partir de 5 cm abaixo da virilha: olhando pela boca da perna com o joelho alto aparece
  // a coxa, não o vazio
  for (const k of ['short', 'bermuda']) {
    if (!Rk[k]) continue;
    for (let w = 0; w < nw; w++) {
      const o = w * LB.KN; if (Aw[o + LB.K.wLeg] < 0.6) continue;
      const sd = Aw[o] < 0 ? 'L' : 'R', A = Lm.Lg[sd], ax = G.norm(G.sub(Lm.Kn[sd], A)), s = (Aw[o] - A[0]) * ax[0] + (Aw[o + 1] - A[1]) * ax[1] + (Aw[o + 2] - A[2]) * ax[2];
      if (s > (A[1] - Lm.crotchY) + 0.05) Rk[k][w] = Math.max(Rk[k][w], 0.01);
    }
  }
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

function bodyCells(C, lod) {
  const b = C.body, wid = b.weld.wid, nt = b.idx.length / 3, mask = new Uint32Array(nt), reg = new Uint8Array(nt);
  // v5: pele perto da axila fica sob tops soltos com manga/cava (a fresta da cava abre com o braço para trás)
  if (!C._nearPit) {
    // v6: só o fundo da axila (3,5 cm em volta do ápice medido): é o que fica exposto com o braço erguido; mais longe a
    // pele furava a manga no balanço do braço
    const ap = DR.armpitApex(C, C.Aw), pits = [ap.L, ap.R];
    C._nearPit = new Uint8Array(b.weld.nw);
    for (let w = 0; w < b.weld.nw; w++) for (const q of pits) if (Math.hypot(b.PW[w * 3] - q[0], b.PW[w * 3 + 1] - q[1], b.PW[w * 3 + 2] - q[2]) < 0.035) C._nearPit[w] = 1;
  }
  const pitKinds = new Set(['camiseta', 'regata', 'manga-longa', 'corta-vento']);
  for (let t = 0; t < nt; t++) {
    const w = [wid[b.idx[t * 3]], wid[b.idx[t * 3 + 1]], wid[b.idx[t * 3 + 2]]];
    let m = 0;
    // v5: roupas soltas deixam 3,5 cm de pele por dentro das aberturas (barra, manga, perna): olhando por baixo da barra
    // aparece o forro e a pele, nunca o vazio
    const pit = C._nearPit[w[0]] || C._nearPit[w[1]] || C._nearPit[w[2]];
    for (const k in C.Rk) { if (pit && pitKinds.has(k) && !process.env.EP_NOPIT) continue; const r = C.Rk[k], lim = GM.cullMargin(k); if (r[w[0]] <= lim && r[w[1]] <= lim && r[w[2]] <= lim) m |= 1 << COVER_BITS[k]; }
    if (C.hairCover) for (const hs in C.hairCover) {
      const hc = C.hairCover[hs][lod ? 1 : 0], ray = C.hairCover[hs][lod ? 3 : 2];
      if (!(hc[w[0]] && hc[w[1]] && hc[w[2]])) continue;
      const p = w.map(x => [b.PW[x * 3], b.PW[x * 3 + 1], b.PW[x * 3 + 2]]);
      const pts = [...p, G.lerp3(p[0], p[1], 0.5), G.lerp3(p[1], p[2], 0.5), G.lerp3(p[2], p[0], 0.5), [(p[0][0] + p[1][0] + p[2][0]) / 3, (p[0][1] + p[1][1] + p[2][1]) / 3, (p[0][2] + p[1][2] + p[2][2]) / 3]];
      if (pts.every(ray)) m |= 1 << COVER_BITS['hair:' + hs];
    }
    mask[t] = m >>> 0;
    const rs = w.map(x => C.regW[x]).sort((a, c) => a - c);
    reg[t] = rs[1] === rs[2] ? rs[1] : rs[0] === rs[1] ? rs[0] : rs[0];
  }
  return { mask, reg };
}

// roupas dos corredores da rua (iguais a RunnerRig.NPC_OUTFITS; conferido por expressão regular)
export const NPC_OUTFITS = [
  { gender: 'm', top: 'camiseta', bottom: 'short', hair: 'curto' }, { gender: 'm', top: 'regata', bottom: 'short', hair: 'raspado' },
  { gender: 'm', top: 'camiseta', bottom: 'short', hair: 'cacheado' }, { gender: 'm', top: 'manga-longa', bottom: 'legging', hair: 'curto' },
  { gender: 'f', top: 'top', bottom: 'legging', hair: 'rabo' }, { gender: 'f', top: 'regata', bottom: 'short', hair: 'rabo' },
  { gender: 'f', top: 'camiseta', bottom: 'legging', hair: 'coque' }, { gender: 'f', top: 'top', bottom: 'short', hair: 'curto' }
];
export function checkNpcOutfits(raiz) {
  const src = fs.readFileSync(path.join(raiz, 'jogar', 'js', 'runner', 'RunnerRig.js'), 'utf8');
  const m = src.match(/NPC_OUTFITS = \[([\s\S]*?)\];/);
  if (!m) return 'NPC_OUTFITS não encontrado em RunnerRig.js';
  const found = [...m[1].matchAll(/\{\s*gender:\s*'(\w)',\s*top:\s*'([\w-]+)',\s*bottom:\s*'([\w-]+)',\s*hair:\s*'(\w+)'\s*\}/g)].map(x => x.slice(1).join('|'));
  const mine = NPC_OUTFITS.map(o => [o.gender, o.top, o.bottom, o.hair].join('|'));
  return JSON.stringify(found) === JSON.stringify(mine) ? null : 'NPC_OUTFITS diferente de RunnerRig.js: ' + JSON.stringify(found);
}
export function maskOf(o) {
  let m = (1 << COVER_BITS[o.top]) | (1 << COVER_BITS[o.bottom]) | (1 << COVER_BITS['hair:' + o.hair]);
  if (o.socks !== undefined ? o.socks : o.bottom !== 'legging') m |= 1 << COVER_BITS.meia;
  return m >>> 0;
}

function pack(C) {
  const b = C.body, q = BD.quantWeights(b.Wd, b.n), Sm = EN.simplifier(), rep = C.rep;
  const P32 = Float32Array.from(b.P);
  const simp = (src, target, err, flags = ['LockBorder']) => src.length / 3 <= target ? Uint32Array.from(src) : Sm.simplify(Uint32Array.from(src), P32, 3, Math.max(1, Math.floor(target)) * 3, err, flags)[0];
  // células por (máscara, região); LOD0 e LOD1 têm máscaras próprias (o cabelo simplificado cobre menos couro cabeludo)
  const cellsOf = lod => {
    const { mask, reg } = bodyCells(C, lod), map = new Map();
    for (let t = 0; t < mask.length; t++) {
      if (C.footDel && C.footDel[t]) continue;
      const key = mask[t] * 32 + reg[t];
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(t);
    }
    return { map, keys: [...map.keys()].sort((a, c) => a - c), reg };
  };
  const CL0 = cellsOf(0), CL1 = cellsOf(1), reg = CL0.reg;
  const cells0 = [], cells1 = [], idx0 = [], idx1 = [], cellTris1 = [];
  const cellIdx = (k, tl, lod) => {
    const sub = [], r = k % 32;
    for (const t of tl) sub.push(b.idx[t * 3], b.idx[t * 3 + 1], b.idx[t * 3 + 2]);
    const hand = r === LB.RI.maoL || r === LB.RI.maoR, head = r === LB.RI.cabeca;
    const L0 = hand ? simp(sub, sub.length / 3 * 0.45, 0.002) : Uint32Array.from(sub);
    return lod ? simp(L0, L0.length / 3 * (head ? 0.3 : 0.38), 0.012) : L0;
  };
  for (const k of CL0.keys) {
    const o0 = EN.cacheOrderKeep(cellIdx(k, CL0.map.get(k), 0));
    for (const i of o0) idx0.push(i);
    cells0.push([Math.floor(k / 32), k % 32, o0.length / 3]);
  }
  for (const k of CL1.keys) {
    const o1 = EN.cacheOrderKeep(cellIdx(k, CL1.map.get(k), 1));
    for (const i of o1) idx1.push(i);
    cells1.push([Math.floor(k / 32), k % 32, o1.length / 3]);
    cellTris1.push(o1);
  }
  // LOD2 do corpo por combinação dos corredores da rua (só as células visíveis, simplificadas juntas)
  const lod2 = {}, lod2rep = {};
  // cada roupa da rua com e sem meia (o jogo pode trocar a meia); outras combinações caem no LOD1 com aviso
  for (const o of NPC_OUTFITS.filter(o => o.gender === C.g).flatMap(o => [o, { ...o, socks: o.bottom === 'legging' }])) {
    const m = maskOf(o);
    if (lod2[String(m)]) continue;
    // por grupos (cabeça, cada braço, cada perna, tronco), cada um com a borda travada: o rosto não desaba (erro
    // pequeno) e a simplificação não faz triângulos ligando o braço ao tronco (viravam "asas" na corrida)
    const R = LB.RI, grp = r => r === R.cabeca ? 0 : (r === R.bracoL || r === R.antebracoL || r === R.maoL) ? 1 : (r === R.bracoR || r === R.antebracoR || r === R.maoR) ? 2
      : (r === R.coxaL || r === R.canelaL || r === R.peL) ? 3 : (r === R.coxaR || r === R.canelaR || r === R.peR) ? 4 : 5;
    const G2 = [[], [], [], [], [], []];
    cells1.forEach((c, i) => { if ((c[0] & m) === 0) for (const v of cellTris1[i]) G2[grp(c[1])].push(v); });
    const tg = [[250, 0.004], [100, 0.02], [100, 0.02], [60, 0.03], [60, 0.03], [220, 0.05]];
    const L2 = Uint32Array.from(G2.flatMap((g, k) => g.length ? Array.from(simp(g, tg[k][0], tg[k][1])) : []));
    lod2[String(m)] = EN.cacheOrderKeep(L2);
    lod2rep[o.top + '+' + o.bottom + '+' + o.hair + (o.socks !== undefined ? (o.socks ? '+meia' : '-meia') : '')] = L2.length / 3;
  }
  rep.corpo = { celulas: cells0.length, tris: [idx0.length / 3, idx1.length / 3], lod2: lod2rep, peApagado: C.footDel ? C.footDel.reduce((a, v) => a + v, 0) : 0 };
  // ---- texturas (pele tingível + normal) e UV dos olhos no ladrilho
  let eyeC = [[0, 0, 0, 0], [0, 0, 0, 0]];
  for (let v = 0; v < C.eyes.P.length / 3; v++) { const e = eyeC[C.eyes.P[v * 3] < 0 ? 0 : 1]; e[0] += C.eyes.P[v * 3]; e[1] += C.eyes.P[v * 3 + 1]; e[2] += C.eyes.P[v * 3 + 2]; e[3]++; }
  C.eyeCenters = eyeC.map(e => [e[0] / e[3], e[1] / e[3], e[2] / e[3]]);
  const tex = SK.bakeSkin(C, C.ctx.fontes, path.join(C.ctx.fontes, NORMAL[C.g]), reg);
  { const dd = path.join(C.ctx.raiz, 'ferramentas', 'saida-ver'); fs.mkdirSync(dd, { recursive: true }); fs.writeFileSync(path.join(dd, 'pele-' + C.g + '.png'), TX.encodePNG(tex.debug.img)); }
  // ---- corpo codificado
  const encB = EN.encodePart({ n: b.n, P: b.P, N: b.N, T: b.uv, J: q.J, W: q.W, A: attrA(b.n, 0, SL.skin) },
    [{ idx: Uint32Array.from(idx0), cells: cells0 }, { idx: Uint32Array.from(idx1), cells: cells1 }]);
  const body = encB.part;
  body.lod2ByMask = {};
  for (const m in lod2) { const ix = EN.remapIdx(lod2[m], encB.map); body.lod2ByMask[m] = { t: ix.length / 3, I: EN.ibuf(ix) }; }
  // ---- olhos (ladrilho do olho no atlas da pele); LOD1 = esfera simplificada
  const en = C.eyes.P.length / 3, eh = headOnly(en), euv = new Float32Array(en * 2);
  for (let v = 0; v < en; v++) {
    euv[v * 2] = tex.eyeTile[0] + Math.max(0, Math.min(1, C.eyes.uv[v * 2])) * (tex.eyeTile[2] - tex.eyeTile[0]);
    euv[v * 2 + 1] = tex.eyeTile[1] + Math.max(0, Math.min(1, C.eyes.uv[v * 2 + 1])) * (tex.eyeTile[3] - tex.eyeTile[1]);
  }
  const EP32 = Float32Array.from(C.eyes.P);
  const eL0 = Uint32Array.from(C.eyes.idx), eL1 = Sm.simplify(eL0, EP32, 3, 128 * 3, 0.05, ['Permissive'])[0], eL2 = Sm.simplify(eL1, EP32, 3, 48 * 3, 0.05, ['Permissive'])[0];
  const eyes = EN.encodePart({ n: en, P: C.eyes.P, N: C.eyes.N, T: euv, J: eh.J, W: eh.W, A: attrA(en, 5, SL.eye) }, [{ idx: EN.cacheOrderKeep(eL0) }, { idx: EN.cacheOrderKeep(eL1) }, { idx: EN.cacheOrderKeep(eL1) }]).part;
  // ---- sobrancelhas e cílios: tinta lisa (sem textura), sobrancelha feminina mais fina
  const brows = packBrows(C);
  // ---- tênis
  const S = C.shoes;
  const shoes = EN.encodePart({ n: S.n, P: Float64Array.from(S.P), N: Float64Array.from(S.N), J: Uint8Array.from(S.J), W: Uint8Array.from(S.W), A: Uint8Array.from(S.A) },
    S.lods.map(l => ({ idx: EN.cacheOrderKeep(Uint32Array.from(l)) }))).part;
  // ---- cabeçalho
  const id = C.g + '-' + crypto.createHash('sha1').update(body.P + body.T + body.J + body.W + body.lods[0].I).digest('hex').slice(0, 8);
  C.data = {
    v: 1, id, gender: C.g, space: 1.76, heightReal: C.g === 'm' ? 1.76 : 1.68, lift: C.FR.LIFT,
    bones: { names: BD.BONES, parent: BD.PARENT, pos: boneRel(C.boneWorld) },
    measures: measures(C, S), anchors: anchors(C),
    slots: SLOTS, mats: MATS, coverBits: COVER_BITS,
    textures: { skin: tex.skin, normal: tex.normal, uvNeutral: tex.uvNeutral, eyeTile: tex.eyeTile },
    body, eyes, brows, shoes
  };
  // ---- cabelos
  C.cabelos = {};
  for (const st in C.hairs) {
    const H = C.hairs[st], qq = BD.quantWeights(H.W, H.n), A = new Uint8Array(H.n * 4);
    for (let i = 0; i < H.n; i++) { A[i * 4] = st === 'raspado' ? 1 : 3; A[i * 4 + 1] = H.slot[i]; A[i * 4 + 2] = Math.round(Math.max(0, Math.min(1, H.ao[i] * H.tone[i] / 1.15)) * 255); A[i * 4 + 3] = H.back[i] ? 2 : 0; }
    C.cabelos[st] = EN.encodePart({ n: H.n, P: H.P, N: H.N, J: qq.J, W: qq.W, A }, H.lods.map(l => ({ idx: EN.cacheOrderKeep(l) })), { style: st, bodyId: id }).part;
  }
  // ---- roupas
  C.roupas = {};
  for (const k in C.garments) {
    const G0 = C.garments[k], Wd = GM.garmentWeights(G0, C, k), qq = BD.quantWeights(Wd, G0.nv), A = new Uint8Array(G0.nv * 4);
    for (let i = 0; i < G0.nv; i++) { A[i * 4] = G0.mat; A[i * 4 + 1] = G0.SLOT[i]; A[i * 4 + 2] = Math.round(Math.max(0, Math.min(1, G0.ao[i])) * 255); A[i * 4 + 3] = G0.FLAGS[i]; }
    // células por cobertura: triângulos de baixo que ficam inteiros embaixo de uma roupa de cima (2 cm de margem)
    const coverKinds = G0.layer === 2 ? LB.TOPS.filter(t => C.garments[t]) : G0.layer === 1 ? LB.BOTTOMS.filter(b => C.garments[b]) : [];
    const vmask = new Uint32Array(G0.nv);
    for (const ck of coverKinds) {
      const T = LB.garmentTerms(ck, C.g, C.Lm), bit = 1 << COVER_BITS[ck];
      for (let i = 0; i < G0.nv; i++) {
        if (!(G0.Wx && G0.Wx.has(i))) { if (LB.evalR(T, G0.V, G0.REC[i] * LB.KN) <= -0.012) vmask[i] |= bit; continue; }
        if (!(G0.FLAGS[i] & 4)) continue;
        // saia: a pala que fica 2 cm ou mais para dentro da barra do top some (o top não precisa passar por cima dela)
        // ponto do corpo mais perto SEM braço/mão (a mão pendurada ao lado do quadril dava registro de braço: não cortava)
        const p = [G0.P[i * 3], G0.P[i * 3 + 1], G0.P[i * 3 + 2]], h = C.noArmBVH.closest(p[0], p[1], p[2], 0.2);
        if (h.tri < 0) continue;
        const rec = Float64Array.from(C.Aw.subarray(C.body.widx[h.tri * 3] * LB.KN, C.body.widx[h.tri * 3] * LB.KN + LB.KN));
        rec[0] = h.x; rec[1] = p[1]; rec[2] = h.z;
        // v5: a saia some debaixo do top até 6 mm abaixo da barra dele (a camiseta solta não passa por cima da pala)
        if (LB.evalR(T, rec, 0) <= 0.006) vmask[i] |= bit;
      }
    }
    const lodsC = G0.lods.map(l => {
      const by = new Map();
      for (let t = 0; t < l.length; t += 3) { const m = (vmask[l[t]] & vmask[l[t + 1]] & vmask[l[t + 2]]) >>> 0; if (!by.has(m)) by.set(m, []); by.get(m).push(l[t], l[t + 1], l[t + 2]); }
      const ks = [...by.keys()].sort((a, b) => a - b), idx = [], cells = [];
      for (const m of ks) { const o = EN.cacheOrderKeep(by.get(m)); for (const i of o) idx.push(i); cells.push([m, 0, o.length / 3]); }
      return coverKinds.length ? { idx: Uint32Array.from(idx), cells } : { idx: EN.cacheOrderKeep(l) };
    });
    C.roupas[k] = EN.encodePart({ n: G0.nv, P: G0.P, N: G0.N, J: qq.J, W: qq.W, A }, lodsC,
      { kind: k, mat: G0.mat, coverBit: COVER_BITS[k], layer: G0.layer, bodyId: id }).part;
  }
}

function packBrows(C) {
  const Bm = C.brows, n = Bm.P.length / 3, P = Float64Array.from(Bm.P);
  const wd = weldIdx(P, Bm.idx, n), comp = components(wd.wi, wd.nw);
  const eyeY = (C.eyeCenters[0][1] + C.eyeCenters[1][1]) / 2;
  const cent = new Map();
  for (let t = 0; t < Bm.idx.length / 3; t++) {
    const c = comp.comp[t]; if (!cent.has(c)) cent.set(c, [0, 0, 0, 0]);
    const e = cent.get(c); for (let k = 0; k < 3; k++) { const v = Bm.idx[t * 3 + k]; e[0] += P[v * 3]; e[1] += P[v * 3 + 1]; e[2] += P[v * 3 + 2]; e[3]++; }
  }
  const isBrow = c => { const e = cent.get(c); return e[1] / e[3] > eyeY + 0.012; };
  const slot = new Uint8Array(n).fill(SL.brow), BN = Float64Array.from(Bm.N);
  // sobrancelha feminina: mais fina (escala 0,82 em y no centro de cada uma)
  const vComp = new Int32Array(n).fill(-1);
  for (let t = 0; t < Bm.idx.length / 3; t++) for (let k = 0; k < 3; k++) vComp[Bm.idx[t * 3 + k]] = comp.comp[t];
  for (let v = 0; v < n; v++) {
    const c = vComp[v]; if (c < 0) continue;
    if (!isBrow(c)) {
      slot[v] = SL.lash;
      // cílio feminino: menos "delineador" (asa mais curta e fina)
      if (C.g === 'f') { const e = cent.get(c), cx = e[0] / e[3], cy = e[1] / e[3]; P[v * 3] = cx + (P[v * 3] - cx) * 0.88; P[v * 3 + 1] = cy + (P[v * 3 + 1] - cy) * 0.6; }
      continue;
    }
    // sobrancelha mais fina (os dois gêneros) e colada na pele (no máximo 0,6 mm acima)
    { const e = cent.get(c); P[v * 3 + 1] = e[1] / e[3] + (P[v * 3 + 1] - e[1] / e[3]) * (C.g === 'f' ? 0.66 : 0.72); }
    const h = C.bodyBVH.closest(P[v * 3], P[v * 3 + 1], P[v * 3 + 2], 0.03);
    if (h.tri >= 0) {
      const W = C.body.widx, NW = C.body.NW, a = W[h.tri * 3] * 3, bb = W[h.tri * 3 + 1] * 3, cc = W[h.tri * 3 + 2] * 3;
      const nn = G.norm([NW[a] * h.u + NW[bb] * h.v + NW[cc] * h.w, NW[a + 1] * h.u + NW[bb + 1] * h.v + NW[cc + 1] * h.w, NW[a + 2] * h.u + NW[bb + 2] * h.v + NW[cc + 2] * h.w]);
      const sd = (P[v * 3] - h.x) * nn[0] + (P[v * 3 + 1] - h.y) * nn[1] + (P[v * 3 + 2] - h.z) * nn[2];
      const want = Math.min(Math.max(sd, 0.0003), 0.0006);
      for (let k = 0; k < 3; k++) { P[v * 3 + k] += nn[k] * (want - sd); BN[v * 3 + k] = nn[k]; }   // sombreia como a pele embaixo
    }
  }
  // faces de trás dos cílios abertos (masculino) — simples: duplica todos os triângulos dos cílios invertidos
  const tris = [], lashT = [], browT = [];
  for (let t = 0; t < Bm.idx.length / 3; t++) (isBrow(comp.comp[t]) ? browT : lashT).push(Bm.idx[t * 3], Bm.idx[t * 3 + 1], Bm.idx[t * 3 + 2]);
  // contorno da sobrancelha alisado (as pontas "desfiadas" do cartão original somem)
  { const sm = HR.smoothHairline({ P, n, idx: Uint32Array.from(browT) }, 8).P; for (const i of browT) for (let k = 0; k < 3; k++) P[i * 3 + k] = sm[i * 3 + k]; }
  const Sm = EN.simplifier(), P32 = Float32Array.from(P);
  const browCards = [...cent.keys()].filter(isBrow).length, lashCards = cent.size - browCards;
  const sB0 = Sm.simplify(Uint32Array.from(browT), P32, 3, 160 * browCards * 3, 0.01, ['LockBorder'])[0];
  const sB1 = Sm.simplify(sB0, P32, 3, 40 * browCards * 3, 0.05, ['Permissive'])[0];
  const sL0 = C.g === 'f' ? Sm.simplify(Uint32Array.from(lashT), P32, 3, 120 * lashCards * 3, 0.01, ['LockBorder'])[0] : Uint32Array.from(lashT);
  // vértices de trás (normais invertidas) para os cílios
  const nb = n, Pall = Array.from(P), Nall = Array.from(BN), slotAll = Array.from(slot), back = [];
  const map = new Map();
  for (const i of sL0) if (!map.has(i)) { map.set(i, Pall.length / 3); Pall.push(P[i * 3], P[i * 3 + 1], P[i * 3 + 2]); Nall.push(-Bm.N[i * 3], -Bm.N[i * 3 + 1], -Bm.N[i * 3 + 2]); slotAll.push(SL.lash); }
  for (let t = 0; t < sL0.length; t += 3) back.push(map.get(sL0[t]), map.get(sL0[t + 2]), map.get(sL0[t + 1]));
  const nn = Pall.length / 3, J = new Uint8Array(nn * 4), W = new Uint8Array(nn * 4), A = new Uint8Array(nn * 4);
  for (let i = 0; i < nn; i++) { J[i * 4] = BD.BI.head; W[i * 4] = 255; A[i * 4] = 1; A[i * 4 + 1] = slotAll[i]; A[i * 4 + 2] = slotAll[i] === SL.lash ? 200 : 235; A[i * 4 + 3] = i >= nb ? 2 : 0; }
  const L0 = [...sB0, ...sL0, ...back], L1 = [...sB1];
  C.rep.sobrancelhas = { cartoes: browCards, cilios: lashCards, tris: [L0.length / 3, L1.length / 3] };
  return EN.encodePart({ n: nn, P: Float64Array.from(Pall), N: Float64Array.from(Nall), J, W, A }, [{ idx: EN.cacheOrderKeep(Uint32Array.from(L0)) }, { idx: EN.cacheOrderKeep(Uint32Array.from(L1)) }]).part;
}
function weldIdx(P, idx, n) { const wd = weld(P, n, 1e-6); return { wi: Uint32Array.from(idx, i => wd.wid[i]), nw: wd.nw }; }

const r5 = v => v.map(x => +x.toFixed(4));
function measures(C, S) {
  const bw = C.boneWorld, Lm = C.Lm;
  return {
    hipY: +bw.hips[1].toFixed(4), thigh: +Lm.thigh.toFixed(4), shin: +Lm.shin.toFixed(4), ankleY: +bw.footL[1].toFixed(4),
    footLen: +(C.rep.tenis ? C.rep.tenis.L.comprimento : 0.29).toFixed(4), shoulderW: +G.dist(bw.armL, bw.armR).toFixed(4), hipW: +G.dist(bw.legL, bw.legR).toFixed(4),
    upperArm: +Lm.upperLen.toFixed(4), foreArm: +G.dist(Lm.E.L, Lm.Wr.L).toFixed(4), neckY: +bw.head[1].toFixed(4), headTop: +C.rep.alturaTopo.toFixed(4)
  };
}
function anchors(C) {
  const bw = C.boneWorld, b = C.body, Lm = C.Lm, rel = (p, bone) => r5(G.sub(p, bw[bone]));
  // crânio: caixa dos vértices da cabeça acima dos olhos
  const eyeY = (C.eyeCenters[0][1] + C.eyeCenters[1][1]) / 2;
  const mn = [9, 9, 9], mx = [-9, -9, -9];
  for (let v = 0; v < b.n; v++) if (b.headW[v] > 0.5 && b.P[v * 3 + 1] > eyeY - 0.03) for (let k = 0; k < 3; k++) { mn[k] = Math.min(mn[k], b.P[v * 3 + k]); mx[k] = Math.max(mx[k], b.P[v * 3 + k]); }
  const sc = [(mn[0] + mx[0]) / 2, (mn[1] + mx[1]) / 2, (mn[2] + mx[2]) / 2];
  // orelhas: pontos mais de fora na altura dos olhos
  const ear = sd => { let best = null; for (let v = 0; v < b.n; v++) { if (b.headW[v] < 0.5) continue; const y = b.P[v * 3 + 1]; if (y < eyeY - 0.05 || y > eyeY + 0.01) continue; const x = b.P[v * 3]; if ((sd < 0 ? -x : x) > (best ? (sd < 0 ? -best[0] : best[0]) : -1)) best = [x, y, b.P[v * 3 + 2]]; } return best; };
  const eL = ear(-1), eR = ear(1);
  // pulso esquerdo: raio médio do antebraço perto do pulso
  const Wr = Lm.Wr.L, E = Lm.E.L, ax = G.norm(G.sub(Wr, E));
  let rs = 0, rc = 0;
  for (let v = 0; v < b.n; v++) { const p = [b.P[v * 3], b.P[v * 3 + 1], b.P[v * 3 + 2]], d = G.sub(p, Wr), t = G.dot(d, ax); if (t < -0.04 || t > -0.02 || b.handW[v] > 0.5 || p[0] > 0) continue; const r = G.len(G.sub(d, G.scl(ax, t))); if (r < 0.06) { rs += r; rc++; } }
  const back = (() => { const y = Lm.Sy - 0.15, h = C.bodyBVH.ray(0, y, 1, 0, 0, -1, 2); return h ? [0, y, 1 - h.t] : [0, y, 0.1]; })();
  const wy = Lm.T[1] - 0.012;
  let wx = 0, wz0 = 1, wz1 = -1;
  for (let v = 0; v < b.n; v++) { if (Math.abs(b.P[v * 3 + 1] - wy) > 0.01 || b.Wd[v * 17 + BD.BI.armL] + b.Wd[v * 17 + BD.BI.elbowL] + b.Wd[v * 17 + BD.BI.armR] + b.Wd[v * 17 + BD.BI.elbowR] > 0.3) continue; wx = Math.max(wx, Math.abs(b.P[v * 3])); wz0 = Math.min(wz0, b.P[v * 3 + 2]); wz1 = Math.max(wz1, b.P[v * 3 + 2]); }
  const eyesC = G.lerp3(C.eyeCenters[0], C.eyeCenters[1], 0.5);
  return {
    skull: { bone: 'head', center: rel(sc, 'head'), radii: r5(G.scl(G.sub(mx, mn), 0.5)), top: +(mx[1] - bw.head[1]).toFixed(4) },
    eyes: { bone: 'head', center: rel(eyesC, 'head'), spacing: +G.dist(C.eyeCenters[0], C.eyeCenters[1]).toFixed(4), front: +(Math.min(C.eyeCenters[0][2], C.eyeCenters[1][2]) - 0.012 - bw.head[2]).toFixed(4) },
    ears: { bone: 'head', left: rel(eL, 'head'), right: rel(eR, 'head') },
    wristL: { bone: 'elbowL', pos: rel(Wr, 'elbowL'), radius: +(rs / Math.max(1, rc)).toFixed(4) },
    back: { bone: 'torso', pos: rel(back, 'torso') },
    waist: { bone: 'hips', y: +(wy - bw.hips[1]).toFixed(4), rx: +wx.toFixed(4), rz: +((wz1 - wz0) / 2).toFixed(4), cz: +((wz1 + wz0) / 2 - bw.hips[2]).toFixed(4) }
  };
}

// posições relativas ao pai (repouso, rotações identidade)
export function boneRel(world) {
  return BD.BONES.map((b, i) => {
    const p = BD.PARENT[i], w = world[b];
    const r = p < 0 ? w : G.sub(w, world[BD.BONES[p]]);
    return r.map(x => +x.toFixed(5));
  });
}

// procurador v4 (voxels) — só para comparar (EP_OLD_GARMENTS=1)
function oldProxy(C, Aw, Lm, slices, WI, triAvg, noArm, rep) {
  const g = C.g, tP = Date.now();
  // corpo procurador (v4): campo de distância em voxels de 5 mm, sem braço/mão (e sem cabeça nos tops), com abertura
  // (tira mamilo, ponta do busto, abdômen) e fechamento (vão sob o busto, decote, umbigo, virilha, sulco dos glúteos)
  const noArmHead = t => noArm(t) && triAvg(t, LB.K.head) < 0.5;
  const boxTop = [-0.27, Lm.H[1] - 0.17, -0.2, 0.27, Lm.N[1] + 0.07, 0.22];
  const inTrunk = p => { const sl = slices.get(Math.floor(p[1] * 100)); return !!sl && p[1] < Lm.Sy - 0.02 && GM.inSliceHull(sl, p[0], p[2], 0.004); };
  const occT = PX.bodyOcc(C.body.PW, WI, boxTop, 0.005, noArmHead, inTrunk);
  const fFit = PX.morphField(occT.G, occT.occ, { open: g === 'f' ? 0.04 : 0.025, close: 0.04 });
  const fLoose = PX.morphField(occT.G, occT.occ, { open: 0.035, close: 0.07 });
  const tIn = p => g === 'f' && p[2] < Lm.cz && Math.abs(p[0]) > 0.015 && Math.abs(p[0]) < 0.15 ? 0.006 + 0.016 * GM.smoothstepX(Lm.Ybra - 0.03, Lm.Ybra + 0.01, p[1]) * GM.smoothstepX(Lm.apex[1] + 0.08, Lm.apex[1] + 0.03, p[1]) : 0.006;
  const proxy = { fit: GM.fieldProxy(Aw, WI, C.body.adjW, fFit.F, Lm.H[1] - 0.17, Lm.N[1] + 0.02, tIn),
    loose: GM.fieldProxy(Aw, WI, C.body.adjW, fLoose.F, Lm.H[1] - 0.17, Lm.N[1] + 0.02, tIn) };
  // roupas de baixo: o campo do corpo é misturado ao fechado da virilha para cima (a ponte some 2,5 cm abaixo dela)
  const boxBot = [-0.27, 0.05, -0.2, 0.27, Lm.T[1] + 0.09, 0.22];
  const occB = PX.bodyOcc(C.body.PW, WI, boxBot, 0.005, noArm);
  // casco convexo de cada fatia da virilha (−1,2 cm) até a cintura: a frente vai reta de coxa a coxa, o sulco dos
  // glúteos some e logo abaixo da virilha fica o fundilho (ponte lisa entre as coxas)
  const occH = PX.hullFill(occB.G, occB.occ, Lm.crotchY - 0.04, Lm.T[1] + 0.1, y => 0.06 * Math.pow(GM.smoothstepX(Lm.crotchY - 0.035, Lm.crotchY + 0.005, y), 1.5), 0.075);
  const fBody = PX.morphField(occB.G, occB.occ, {}), fHull = PX.morphField(occB.G, occH, { sigma: 1.1, sigmaY: 2.5 });   // sem fechamento: ele fechava o vão entre as coxas (aleta na entreperna)
  // legging: justa — casco inteiro na frente, metade atrás (o glúteo ainda aparece), só da virilha para cima
  const tightF = (x, y, z) => { const a = fBody.F(x, y, z), b = fHull.F(x, y, z), w = (1 - 0.5 * GM.smoothstepX(Lm.H[2] - 0.02, Lm.H[2] + 0.04, z)) * GM.smoothstepX(Lm.crotchY - 0.01, Lm.crotchY + 0.02, y); return a + (b - a) * w; };
  if (process.env.DBG_ARM) for (let w = 0; w < C.body.weld.nw; w++) { const o = w * LB.KN; if (Aw[o + 1] > 1.29 && Aw[o + 1] < 1.37 && Aw[o] > 0.09 && Aw[o] < 0.16 && Aw[o + 2] > -0.08 && Aw[o + 2] < 0.04) console.log('  ARM', Aw[o].toFixed(3), Aw[o + 1].toFixed(3), Aw[o + 2].toFixed(3), 'wArm', Aw[o + LB.K.wArm].toFixed(2)); }
  if (process.env.DBG_PROBE) {   // depuração: perfil da frente (z) dos campos
    const front = (F, x, y) => { for (let z = -0.2; z < 0.2; z += 0.0005) if (F(x, y, z) < 0) return z.toFixed(4); return '-'; };
    for (let y = Lm.crotchY + 0.06; y > Lm.crotchY - 0.06; y -= 0.01) console.log('  PROBE y', y.toFixed(3), [0, 0.03, 0.06, 0.09].map(x => x + ':' + front(fBody.F, x, y) + '/' + front(fHull.F, x, y)).join('  '));
  }
  const attrBVH = new BVH(C.body.PW, WI, noArm);
  const nets = { loose: GM.netsBase(fHull.F, boxBot, 0.005, Aw, attrBVH, WI, Lm), tight: GM.netsBase(tightF, boxBot, 0.005, Aw, attrBVH, WI, Lm) };
  rep.procurador = { ms: Date.now() - tP, topoMovidos: proxy.fit.moved, cascaBaixo: nets.loose.idx.length / 3, virilhaY: +Lm.crotchY.toFixed(3) };
  console.log('  procurador', JSON.stringify(rep.procurador));
  return { proxy, nets };
}
