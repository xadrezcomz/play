// Textura da pele (§9): mapa de detalhe tingível 1024² (cor final = detalhe × tom de pele), sem a roupa
// de baixo pintada e com o sombreado dos músculos atenuado; mapa normal 512² achatado; ladrilho do olho e
// retalho neutro num quadrado livre do atlas.
import fs from 'node:fs';
import path from 'node:path';
import * as TX from './textures.mjs';
import { RI } from './label.mjs';

const BODY_REG = new Set([RI.troncoSup, RI.troncoInf, RI.quadril, RI.bracoL, RI.bracoR, RI.antebracoL, RI.antebracoR, RI.coxaL, RI.coxaR, RI.canelaL, RI.canelaR, RI.pescoco]);

export function bakeSkin(C, F, normalFile, triReg) {
  const b = C.body, S = 1024, nt = b.idx.length / 3, Lm = C.Lm, g = C.g;
  const L = TX.down2(TX.toLinear(C.albImg));
  const A = TX.rasterAtlas(S, b.uv, b.idx, nt);
  const pos = TX.atlasAttr(A, b.idx, b.P, 3);
  const inIsland = new Uint8Array(S * S), reg = new Uint8Array(S * S).fill(255);
  for (let k = 0; k < S * S; k++) if (A.tri[k] >= 0) { inIsland[k] = 1; reg[k] = triReg[A.tri[k]]; }
  const f = L.f;
  // ---- roupa de baixo pintada: escura e pouco saturada, nas regiões do quadril/barriga/coxa (e busto)
  const uw = new Uint8Array(S * S);
  for (let k = 0; k < S * S; k++) {
    if (!inIsland[k]) continue;
    const r = reg[k], y = pos[k * 3 + 1];
    let cand = r === RI.quadril || r === RI.troncoInf || ((r === RI.coxaL || r === RI.coxaR) && y > Lm.H[1] - 0.2);
    if (g === 'f' && r === RI.troncoSup && y < Lm.Sy - 0.02) cand = true;
    if (!cand) continue;
    const hv = TX.hsv(TX.l2s(f[k * 3]) / 255, TX.l2s(f[k * 3 + 1]) / 255, TX.l2s(f[k * 3 + 2]) / 255);
    if (hv.v < 0.32 && hv.s < 0.35) uw[k] = 1;
  }
  const uwD = TX.dilateMask(uw, S, S, 3);
  for (let k = 0; k < S * S; k++) if (!inIsland[k]) uwD[k] = 0;
  // grão de pele (alta frequência) para pôr de volta depois do preenchimento
  const blurAll = TX.blur(f, S, S, 3, 3, inIsland);
  const known = new Float32Array(S * S);
  for (let k = 0; k < S * S; k++) known[k] = inIsland[k] && !uwD[k] ? 1 : 0;
  const filled = Float32Array.from(f);
  TX.pushPull(filled, S, S, 3, known);
  // grão: do texel 6 cm acima (mesma região do corpo), por tabela espacial de texels conhecidos
  const grid = new Map(), key = (x, y, z) => Math.floor(x / 0.01) + ',' + Math.floor(y / 0.01) + ',' + Math.floor(z / 0.01);
  for (let k = 0; k < S * S; k++) if (known[k] === 1) { const kk = key(pos[k * 3], pos[k * 3 + 1], pos[k * 3 + 2]); if (!grid.has(kk)) grid.set(kk, k); }
  for (let k = 0; k < S * S; k++) {
    if (!uwD[k]) continue;
    let src = -1;
    for (const dy of [0.06, 0.09, 0.12, 0.16, 0.2]) {
      src = grid.get(key(pos[k * 3], pos[k * 3 + 1] + dy, pos[k * 3 + 2]));
      if (src !== undefined && src >= 0) break;
      src = -1;
    }
    for (let c = 0; c < 3; c++) {
      const gr = src >= 0 ? (f[src * 3 + c] - blurAll[src * 3 + c]) * 0.5 : 0;
      f[k * 3 + c] = Math.max(0, filled[k * 3 + c] + gr);
    }
  }
  // ---- sombreado dos músculos atenuado (corpo, não cabeça nem mãos)
  const bodyM = new Uint8Array(S * S);
  for (let k = 0; k < S * S; k++) bodyM[k] = inIsland[k] && BODY_REG.has(reg[k]) ? 1 : 0;
  const B = TX.blur(f, S, S, 3, 10, bodyM);
  for (let k = 0; k < S * S; k++) if (bodyM[k]) for (let c = 0; c < 3; c++) f[k * 3 + c] = B[k * 3 + c] + 0.45 * (f[k * 3 + c] - B[k * 3 + c]);
  // ---- feminino: tira o delineador (escuro, perto dos olhos, fora da abertura)
  if (g === 'f' && C.eyeCenters) softenFace(f, pos, inIsland, reg, S, C.eyeCenters);
  // ---- pele média (mediana) e detalhe D = T / M com 65% da cor
  const ch = [[], [], []];
  for (let k = 0; k < S * S; k += 3) if (bodyM[k] && !uwD[k] && reg[k] !== RI.pescoco) for (let c = 0; c < 3; c++) ch[c].push(f[k * 3 + c]);
  const M = ch.map(a => { a.sort((x, y) => x - y); return a[a.length >> 1]; });
  const D = new Float32Array(S * S * 3);
  for (let k = 0; k < S * S; k++) {
    if (!inIsland[k]) continue;
    const d = [f[k * 3] / M[0], f[k * 3 + 1] / M[1], f[k * 3 + 2] / M[2]], l = TX.lum(d[0], d[1], d[2]);
    for (let c = 0; c < 3; c++) D[k * 3 + c] = Math.max(0, Math.min(1.9, l + (d[c] - l) * 0.65));
  }
  // ---- quadrado livre: ladrilho do olho (96) + retalho neutro (16)
  const occ = inIsland;
  const fs0 = TX.freeSquare(occ, S, 8);
  if (fs0[2] < 113) throw new Error('sem espaço no atlas para olho + neutro: ' + fs0);
  const [ex, ey] = fs0;
  const eyeImg = TX.resizeRGBA(TX.decodePNG(fs.readFileSync(path.join(F, 'T_Eye_Brown.png'))), 96, 96);
  const known2 = Float32Array.from(inIsland);
  for (let y = 0; y < 96; y++) for (let x = 0; x < 96; x++) {
    const k = (ey + y) * S + ex + x;
    for (let c = 0; c < 3; c++) D[k * 3 + c] = TX.s2l(eyeImg.d[(y * 96 + x) * 4 + c]) * 2;   // ×0,5 na gravação → cor real × 2 na tela
    known2[k] = 1;
  }
  const nx = ex + 97, ny = ey;
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const k = (ny + y) * S + nx + x; D[k * 3] = D[k * 3 + 1] = D[k * 3 + 2] = 1; known2[k] = 1; }
  // ---- folga das ilhas (8 px) e gravação sRGB(D × 0,5)
  const padded = Float32Array.from(D);
  TX.pushPull(padded, S, S, 3, known2);
  const img = { w: S, h: S, d: new Uint8Array(S * S * 4) };
  for (let k = 0; k < S * S; k++) { for (let c = 0; c < 3; c++) img.d[k * 4 + c] = TX.l2s(padded[k * 3 + c] * 0.5); img.d[k * 4 + 3] = 255; }
  // retalho neutro exato (188)
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const k = (ny + y) * S + nx + x; img.d[k * 4] = img.d[k * 4 + 1] = img.d[k * 4 + 2] = TX.l2s(0.5); }
  const jpg = TX.encodeJPEG(img, 88);
  // ---- mapa normal 512²
  const nrm = bakeNormal(C, normalFile, triReg, uwD, [ex, ey, nx, ny]);
  C.rep.textura = { pele: jpg.length, normal: nrm.length, livre: fs0, M: M.map(v => +v.toFixed(4)), roupaDeBaixoTexels: uw.reduce((a, v) => a + v, 0) };
  return {
    skin: 'data:image/jpeg;base64,' + Buffer.from(jpg).toString('base64'),
    normal: 'data:image/jpeg;base64,' + Buffer.from(nrm).toString('base64'),
    uvNeutral: [+((nx + 8) / S).toFixed(5), +((ny + 8) / S).toFixed(5)],
    eyeTile: [ex / S, ey / S, (ex + 96) / S, (ey + 96) / S].map(v => +v.toFixed(5)),
    debug: { img }
  };
}

function softenFace(f, pos, inIsland, reg, S, eyes) {
  const lumA = new Float32Array(S * S);
  for (let k = 0; k < S * S; k++) lumA[k] = TX.lum(f[k * 3], f[k * 3 + 1], f[k * 3 + 2]);
  const head = new Uint8Array(S * S);
  for (let k = 0; k < S * S; k++) head[k] = inIsland[k] && reg[k] === RI.cabeca ? 1 : 0;
  const blurC = TX.blur(f, S, S, 3, 8, head);
  const blurL = new Float32Array(S * S);
  for (let k = 0; k < S * S; k++) blurL[k] = TX.lum(blurC[k * 3], blurC[k * 3 + 1], blurC[k * 3 + 2]);
  for (let k = 0; k < S * S; k++) {
    if (!head[k]) continue;
    const p = [pos[k * 3], pos[k * 3 + 1], pos[k * 3 + 2]];
    for (const e of eyes) {
      const d = Math.hypot(p[0] - e[0], p[1] - e[1], p[2] - e[2]);
      if (d < 0.006 || d > 0.024) continue;
      // fora da abertura do olho: abaixo/acima e principalmente para o lado de fora (asa do delineador)
      if (lumA[k] < 0.6 * blurL[k]) {
        const w = 0.7 * Math.min(1, (0.024 - d) / 0.004);
        for (let c = 0; c < 3; c++) f[k * 3 + c] += (blurC[k * 3 + c] - f[k * 3 + c]) * w;
      }
    }
  }
}

function bakeNormal(C, normalFile, triReg, uwD1024, tiles) {
  const b = C.body, S = 512;
  const src = TX.decodePNG(fs.readFileSync(normalFile));
  const k4 = src.w / S;
  const n = new Float32Array(S * S * 3);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    let ax = 0, ay = 0, az = 0;
    for (let j = 0; j < k4; j++) for (let i = 0; i < k4; i++) {
      const p = ((y * k4 + j) * src.w + x * k4 + i) * 4;
      ax += src.d[p] / 127.5 - 1; ay += src.d[p + 1] / 127.5 - 1; az += src.d[p + 2] / 127.5 - 1;
    }
    const l = Math.hypot(ax, ay, az) || 1, o = (y * S + x) * 3;
    n[o] = ax / l; n[o + 1] = ay / l; n[o + 2] = az / l;
  }
  const A = TX.rasterAtlas(S, b.uv, b.idx, b.idx.length / 3);
  const known = new Float32Array(S * S);
  const kOf = r => (r === RI.cabeca || r === RI.maoL || r === RI.maoR) ? 0 : r === RI.pescoco ? 0.3 : 0.65;
  for (let k = 0; k < S * S; k++) {
    if (A.tri[k] < 0) continue;
    known[k] = 1;
    const x = k % S, y = Math.floor(k / S);
    let kk = kOf(triReg[A.tri[k]]);
    if (uwD1024[(2 * y) * 1024 + 2 * x]) kk = 1;
    const o = k * 3;
    let vx = n[o] * (1 - kk), vy = n[o + 1] * (1 - kk), vz = n[o + 2] * (1 - kk) + kk;
    const l = Math.hypot(vx, vy, vz) || 1;
    n[o] = vx / l; n[o + 1] = vy / l; n[o + 2] = vz / l;
  }
  // olho e retalho neutro: plano
  const [ex, ey, nx, ny] = tiles.map(v => Math.floor(v / 2));
  for (let y = 0; y < 48; y++) for (let x = 0; x < 56; x++) { const k = (ey + y) * S + ex + x; if (k < S * S) { n[k * 3] = 0; n[k * 3 + 1] = 0; n[k * 3 + 2] = 1; known[k] = 1; } }
  TX.pushPull(n, S, S, 3, known);
  const img = { w: S, h: S, d: new Uint8Array(S * S * 4) };
  for (let k = 0; k < S * S; k++) {
    const l = Math.hypot(n[k * 3], n[k * 3 + 1], n[k * 3 + 2]) || 1;
    for (let c = 0; c < 3; c++) img.d[k * 4 + c] = Math.max(0, Math.min(255, Math.round((n[k * 3 + c] / l * 0.5 + 0.5) * 255)));
    img.d[k * 4 + 3] = 255;
  }
  return TX.encodeJPEG(img, 88);
}
