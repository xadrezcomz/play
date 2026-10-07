// Verificações automáticas (§12.1) sobre os arquivos já escritos, decodificados pelo decodificador real
// do jogo (jogar/js/runner/ModelData.js) num contexto isolado do Node.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { BVH } from './geom.mjs';
import { NPC_OUTFITS } from './pipeline.mjs';
import * as PS from './posed.mjs';

const TABLE = {   // posições esperadas (referencial final, §3.1) — tolerância 1 cm
  m: { hips: [0, 0.971, 0.035], head: [0, 1.502, 0.040], armL: [-0.198, 1.415, 0.063], kneeL: [-0.111, 0.556, 0.035], footL: [-0.111, 0.115, 0.085] },
  f: { hips: [0, 0.966, 0.051], head: [0, 1.502, 0.040], armL: [-0.147, 1.419, 0.054], kneeL: [-0.110, 0.560, 0.032], footL: [-0.110, 0.100, 0.076] }
};

export function loadRuntime(raiz, saida) {
  const ctx = { window: {}, atob: s => Buffer.from(s, 'base64').toString('binary'), console: { ...console, warn: () => {} } };
  ctx.window = ctx; ctx.EP = { data: {} }; ctx.globalThis = ctx;
  vm.createContext(ctx);
  for (const f of ['corredor-m.js', 'corredor-f.js', 'roupas.js', 'cabelos.js']) vm.runInContext(fs.readFileSync(path.join(saida, f), 'utf8'), ctx, { filename: f });
  vm.runInContext(fs.readFileSync(path.join(raiz, 'jogar', 'js', 'runner', 'ModelData.js'), 'utf8'), ctx, { filename: 'ModelData.js' });
  return ctx.EP;
}

// furos no crânio: raios do centro do crânio (osso head + âncora skull.center) em direções de Fibonacci contra a
// malha montada inteira; um raio que não acerta nada sai por um furo (pele cortada sem cabelo por cima)
export function skullHoles(MD, g, outfit, lod, nDirs = 1500) {
  const ch = MD.char(g), a = MD.assemble(g, outfit, lod), names = ch.bones.names, par = ch.bones.parent, pos = ch.bones.pos, world = [];
  names.forEach((n, i) => { world[i] = par[i] < 0 ? pos[i].slice() : pos[i].map((v, k) => v + world[par[i]][k]); });
  const hw = world[names.indexOf('head')], c = ch.anchors.skull.center.map((v, k) => v + hw[k]);
  const bvh = new BVH(Float64Array.from(a.position), Uint32Array.from(a.index));
  // onde o raio sai da pele inteira (sem cortes): só conta como furo da cabeça se a saída fica acima da base do pescoço
  const body = MD.part(g, 'body'), full = new BVH(Float64Array.from(body.position), Uint32Array.from(MD.index(body, Math.min(lod, 1))));
  const ga = Math.PI * (3 - Math.sqrt(5)), exits = [];
  let miss = 0, head = 0;
  for (let i = 0; i < nDirs; i++) {
    const y = 1 - 2 * (i + 0.5) / nDirs, r = Math.sqrt(1 - y * y), th = ga * i, d = [Math.cos(th) * r, y, Math.sin(th) * r];
    if (bvh.ray(c[0], c[1], c[2], d[0], d[1], d[2], 3)) continue;
    miss++;
    const h = full.ray(c[0], c[1], c[2], d[0], d[1], d[2], 3), p = h ? c.map((v, k) => +(v + d[k] * h.t).toFixed(3)) : null;
    if (!p || p[1] > hw[1]) { head++; if (exits.length < 12) exits.push(p); }
  }
  return { frac: head / nDirs, head, miss, exits };
}

// v8: integridade das cascas das roupas (LOD0): (1) furos — laços de borda com perímetro < 5 cm (a casca tinha
// furinhos de 4 vértices com barra e faixa de acabamento em volta: manchas escuras redondas); (2) ilhas de cor — partes
// conexas de um espaço que não é o principal (acabamento/destaque) com a caixa < 6 cm (faixa solta no meio do tecido).
// Fora: barra/forro (bits 0–1), saia (bit 2) e detalhes costurados por cima (bit 4: cordão, trava, gola).
export function garmentIntegrity(MD, g, kinds) {
  const ch = MD.char(g), out = {};
  for (const k of kinds) {
    const m = MD.garment(g, k), ix = MD.index(m, 0), P = m.position, F = m.flags;
    const key = v => Math.round(P[v * 3] * 1e5) + ',' + Math.round(P[v * 3 + 1] * 1e5) + ',' + Math.round(P[v * 3 + 2] * 1e5);
    const wmap = new Map(), W = new Int32Array(m.n).fill(-1);
    for (let i = 0; i < ix.length; i++) { const v = ix[i]; if (W[v] < 0) { const kk = key(v); if (!wmap.has(kk)) wmap.set(kk, wmap.size); W[v] = wmap.get(kk); } }
    const tris = [];
    for (let t = 0; t < ix.length; t += 3) { const a = ix[t], b = ix[t + 1], c = ix[t + 2]; if ((F[a] | F[b] | F[c]) & (1 | 2 | 4 | 16)) continue; tris.push(t); }
    // (1) laços de borda pequenos
    const ec = new Map();
    for (const t of tris) for (let e = 0; e < 3; e++) { const a = W[ix[t + e]], b = W[ix[t + (e + 1) % 3]], kk = a < b ? a * 1e7 + b : b * 1e7 + a; ec.set(kk, (ec.get(kk) || 0) + 1); }
    const adj = new Map(), pos = new Map();
    for (let i = 0; i < ix.length; i++) { const v = ix[i]; if (!pos.has(W[v])) pos.set(W[v], [P[v * 3], P[v * 3 + 1], P[v * 3 + 2]]); }
    for (const [kk, c] of ec) if (c === 1) { const a = Math.floor(kk / 1e7), b = kk % 1e7; if (!adj.has(a)) adj.set(a, []); if (!adj.has(b)) adj.set(b, []); adj.get(a).push(b); adj.get(b).push(a); }
    const seen = new Set(), small = [];
    for (const s0 of adj.keys()) {
      if (seen.has(s0)) continue;
      const comp = [s0]; seen.add(s0);
      for (let q = 0; q < comp.length; q++) for (const u of adj.get(comp[q])) if (!seen.has(u)) { seen.add(u); comp.push(u); }
      let per = 0; const done = new Set();
      for (const a of comp) for (const b of adj.get(a)) { const kk = a < b ? a + ',' + b : b + ',' + a; if (done.has(kk)) continue; done.add(kk); const pa = pos.get(a), pb = pos.get(b); per += Math.hypot(pa[0] - pb[0], pa[1] - pb[1], pa[2] - pb[2]); }
      if (per < 0.05) small.push({ per: +(per * 100).toFixed(1), at: pos.get(s0).map(x => +x.toFixed(3)) });
    }
    // (2) ilhas de cor
    const mainSlots = new Set(['shirt', 'shorts', 'sock'].map(nm => ch.slots.indexOf(nm)));
    const par = new Int32Array(ix.length / 3).map((_, i) => i), f = x => { while (par[x] !== x) { par[x] = par[par[x]]; x = par[x]; } return x; };
    const em = new Map();
    for (const t of tris) for (let e = 0; e < 3; e++) { const a = W[ix[t + e]], b = W[ix[t + (e + 1) % 3]], kk = a < b ? a * 1e7 + b : b * 1e7 + a; if (!em.has(kk)) em.set(kk, []); em.get(kk).push(t / 3); }
    for (const L of em.values()) for (let i = 1; i < L.length; i++) if (m.slot[ix[L[0] * 3]] === m.slot[ix[L[i] * 3]]) par[f(L[i])] = f(L[0]);
    const box = new Map();
    for (const t of tris) { const r = f(t / 3); if (!box.has(r)) box.set(r, { sl: m.slot[ix[t]], lo: [9, 9, 9], hi: [-9, -9, -9], n: 0 }); const B = box.get(r); B.n++; for (let e = 0; e < 3; e++) { const v = ix[t + e]; for (let q = 0; q < 3; q++) { B.lo[q] = Math.min(B.lo[q], P[v * 3 + q]); B.hi[q] = Math.max(B.hi[q], P[v * 3 + q]); } } }
    const islands = [];
    for (const B of box.values()) { if (mainSlots.has(B.sl)) continue; const d = Math.hypot(B.hi[0] - B.lo[0], B.hi[1] - B.lo[1], B.hi[2] - B.lo[2]); if (d < (+process.env.ILHA_D || 0.06)) islands.push({ slot: ch.slots[B.sl], diag: +(d * 100).toFixed(1), tris: B.n, at: B.lo.map((x, q) => +((x + B.hi[q]) / 2).toFixed(3)) }); }
    out[k] = { furos: small, ilhas: islands };
  }
  return out;
}

// limites das verificações com pose (raios de 8 mm em 8 vistas; ver ESPEC §15.3 e §16)
// v7: rasgo = arestas da roupa > 1,6× e > 12 mm a mais que em repouso, 1,35× o esticamento da pele embaixo E 1,5× a
// mediana das vizinhas (posed.tearTest: esticamento localizado — fenda/alça; tecido esticado por igual não conta);
// pele = raios que mostram pele que em repouso fica debaixo de uma peça, cercada de tecido nas 4 direções (ilha de pele
// furando o tecido — o defeito visível que o v6 deixava passar); furos da comemoração: só os "de dentro"
// Calibração v7 (bake completo, ESPEC §16.9): ~10 % acima do pior valor medido, como guarda de regressão. O pior
// "rasgo" que sobra na corrida é esticamento liso de arestas compridas da casca simplificada (39–65 mm em repouso, 1,6–2,3×:
// parte de trás da coxa/glúteo da bermuda e do short com a perna à frente, costas da axila da camiseta no balanço de
// 18 m/s) — conferido nos renders; as lascas de verdade (aresta de 3 mm esticando 15–19× no gancho) foram corrigidas.
// v8: innerCel 120 → 45 (todo top, com o reforço da axila: pior medido 35); backRun 15 → 20 (frestas da silhueta atrás da
// axila da camiseta no balanço de 18 m/s, 1–2 cm, invisíveis na câmera do jogo — conferido nos renders)
export const POSED_LIM = { backRun: 20, holes: 75, innerCel: 45, flip: 8,
  skinRun: 5, skinExt: 8, skinCel: 12,
  tearRun: 125, tearRunMm: 60, tear: 190, tearMm: 55, tearCel: 480, tearCelMm: 130,
  // v8: avesso do top visto de fora cercado de tecido (repouso / corrida / extremos) e furos vistos de frente nas
  // roupas de baixo com a coxa erguida (joelho alto, sprint, corrida) — a boca da perna mostra o forro, não o vazio
  // facingRun 5 = o pior medido (camiseta m, 18 m/s fase 6: a dobra debaixo da manga com o braço atrás do corpo, vista
  // de lado por trás das costas — ESPEC §17.10); o resto da corrida fica em ≤ 2
  facingRest: 0, facingRun: 5, facingExt: 8, legFront: 12 };
export function runChecks(out, { raiz, saida, report, rapido = false }) {
  const opts = { rapido };
  const t0 = Date.now(), EP = loadRuntime(raiz, saida), MD = EP.ModelData, R = report.verificacoes = {}, fails = [];
  const fail = msg => { fails.push(msg); };
  const genders = Object.keys(out);
  for (const g of genders) {
    const C = out[g], ch = MD.char(g), r = R[g] = {};
    // ossos: hierarquia e posições
    const names = ch.bones.names, par = ch.bones.parent, pos = ch.bones.pos, world = [];
    names.forEach((n, i) => { world[i] = par[i] < 0 ? pos[i].slice() : pos[i].map((v, k) => v + world[par[i]][k]); if (par[i] >= i) fail(g + ': pai depois do filho ' + n); });
    let berr = 0;
    names.forEach((n, i) => { berr = Math.max(berr, Math.hypot(...world[i].map((v, k) => v - C.boneWorld[n][k]))); });
    r.ossosErro = +berr.toExponential(2);
    if (berr > 2e-5) fail(g + ': posições dos ossos não reproduzem o mundo');
    r.ossosVsTabela = {};
    for (const [n, w] of Object.entries(TABLE[g])) { const d = Math.hypot(...world[names.indexOf(n)].map((v, k) => v - w[k])); r.ossosVsTabela[n] = +d.toFixed(4); }
    // partes: pesos somam 255, índices < 17, sem NaN; decodificação = dados de entrada (quantização)
    const parts = { body: MD.part(g, 'body'), eyes: MD.part(g, 'eyes'), brows: MD.part(g, 'brows'), shoes: MD.part(g, 'shoes') };
    for (const k of Object.keys(EP.data.models.roupas[g])) parts['roupa:' + k] = MD.garment(g, k);
    for (const k of Object.keys(EP.data.models.cabelos[g])) parts['cabelo:' + k] = MD.hair(g, k);
    let wbad = 0, jbad = 0, nan = 0;
    for (const [k, m] of Object.entries(parts)) {
      for (let i = 0; i < m.n; i++) {
        let s = 0; for (let q = 0; q < 4; q++) { s += Math.round(m.skinWeight[i * 4 + q] * 255); if (m.skinIndex[i * 4 + q] >= names.length) jbad++; }
        if (s !== 255) wbad++;
        for (let q = 0; q < 3; q++) if (!isFinite(m.position[i * 3 + q]) || !isFinite(m.normal[i * 3 + q])) nan++;
      }
      for (let l = 0; l < m.src.lods.length; l++) { const ix = MD.index(m, l); for (let i = 0; i < ix.length; i++) if (ix[i] >= m.n) fail(g + ' ' + k + ': índice fora'); }
    }
    r.pesosRuins = wbad; r.ossoRuim = jbad; r.nan = nan;
    if (wbad || jbad || nan) fail(g + ': pesos/ossos/NaN inválidos');
    // altura e chão
    r.altura = C.rep.altura;
    if (Math.abs(C.rep.altura - 1.76) > 0.002) fail(g + ': altura ' + C.rep.altura);
    let sy = 1e9; const sh = parts.shoes; for (let i = 0; i < sh.n; i++) sy = Math.min(sy, sh.position[i * 3 + 1]);
    r.soloTenis = +sy.toFixed(5);
    if (Math.abs(sy) > 0.0005) fail(g + ': solado fora do chão ' + sy);
    // folga punho–coxa e punho–short
    const b = parts.body, hand = [], thigh = [];
    const cells = b.src.lods[0].cells, ix0 = MD.index(b, 0);
    let off = 0;
    for (const c of cells) { const reg = c[1]; for (let t = off; t < off + c[2] * 3; t++) { if (reg === 7 || reg === 10) hand.push(ix0[t]); if (reg === 11 || reg === 14) thigh.push(ix0[t]); } off += c[2] * 3; }
    const tb = new BVH(Float64Array.from(b.position), Uint32Array.from(thigh));
    let gap = 1e9; for (const v of new Set(hand)) gap = Math.min(gap, tb.closest(b.position[v * 3], b.position[v * 3 + 1], b.position[v * 3 + 2]).d);
    r.punhoCoxa = +gap.toFixed(4);
    const shortM = parts['roupa:short'], sb = new BVH(Float64Array.from(shortM.position), Uint32Array.from(MD.index(shortM, 0)));
    let gap2 = 1e9; for (const v of new Set(hand)) gap2 = Math.min(gap2, sb.closest(b.position[v * 3], b.position[v * 3 + 1], b.position[v * 3 + 2]).d);
    r.punhoShort = +gap2.toFixed(4);
    if (gap < 0.015) fail(g + ': punho a ' + gap.toFixed(3) + ' da coxa');
    // roupas fora do corpo (distância com sinal pelo corpo do LOD0, pele inteira)
    const bodyAll = new BVH(Float64Array.from(b.position), Uint32Array.from(ix0));
    r.roupaDentroDoCorpo = {};
    for (const k of Object.keys(EP.data.models.roupas[g])) {
      const m = parts['roupa:' + k]; let bad = 0, n = 0;
      for (let i = 0; i < m.n; i++) {
        if (m.flags[i] || m.position[i * 3 + 1] < 0.1) continue;   // barra/forro e dentro do tênis
        const h = bodyAll.closest(m.position[i * 3], m.position[i * 3 + 1], m.position[i * 3 + 2], 0.05);
        if (h.tri < 0) continue;
        const a = ix0[h.tri * 3], bb = ix0[h.tri * 3 + 1], c = ix0[h.tri * 3 + 2];
        const nx = b.normal[a * 3] * h.u + b.normal[bb * 3] * h.v + b.normal[c * 3] * h.w, ny = b.normal[a * 3 + 1] * h.u + b.normal[bb * 3 + 1] * h.v + b.normal[c * 3 + 1] * h.w, nz = b.normal[a * 3 + 2] * h.u + b.normal[bb * 3 + 2] * h.v + b.normal[c * 3 + 2] * h.w;
        const sd = (m.position[i * 3] - h.x) * nx + (m.position[i * 3 + 1] - h.y) * ny + (m.position[i * 3 + 2] - h.z) * nz;
        n++; if (sd < 0.0005) bad++;
      }
      r.roupaDentroDoCorpo[k] = +(bad / Math.max(1, n) * 100).toFixed(2) + '%';
    }
    // v8: furos e ilhas de cor nas cascas das roupas
    r.integridade = garmentIntegrity(MD, g, Object.keys(EP.data.models.roupas[g]));
    for (const [k, v] of Object.entries(r.integridade)) {
      if (v.furos.length) fail(g + ' ' + k + ': ' + v.furos.length + ' furo(s) na casca ' + JSON.stringify(v.furos.slice(0, 3)));
      if (v.ilhas.length) fail(g + ' ' + k + ': ' + v.ilhas.length + ' ilha(s) de cor solta(s) ' + JSON.stringify(v.ilhas.slice(0, 3)));
    }
    // orçamentos por combinação (LOD0 / LOD1) e LOD2 dos corredores da rua
    const tops = Object.keys(EP.data.models.roupas[g]).filter(k => EP.data.models.roupas[g][k].layer === 3);
    const bottoms = Object.keys(EP.data.models.roupas[g]).filter(k => EP.data.models.roupas[g][k].layer === 2);
    const hairs = Object.keys(EP.data.models.cabelos[g]);
    let worst0 = 0, worst1 = 0, wk0 = '', wk1 = '';
    for (const tp of tops) for (const bt of bottoms) for (const hs of hairs) {
      const a0 = MD.assemble(g, { top: tp, bottom: bt, hair: hs }, 0), a1 = MD.assemble(g, { top: tp, bottom: bt, hair: hs }, 1);
      if (a0.index.length / 3 > worst0) { worst0 = a0.index.length / 3; wk0 = a0.key; }
      if (a1.index.length / 3 > worst1) { worst1 = a1.index.length / 3; wk1 = a1.key; }
    }
    r.pior = { lod0: [worst0, wk0], lod1: [worst1, wk1] };
    if (worst0 > 28000) fail(g + ': LOD0 acima de 28k (' + worst0 + ')');
    if (worst1 > 9500) fail(g + ': LOD1 acima de 9,5k (' + worst1 + ')');   // LOD1 é dos corredores da rua: o limite de 8k vale para eles (abaixo)
    r.lod2Rua = {};
    for (const o of NPC_OUTFITS.filter(o => o.gender === g).flatMap(o => [o, { ...o, socks: o.bottom === 'legging' }])) {
      const a2 = MD.assemble(g, o, 2), k = o.top + '+' + o.bottom + '+' + o.hair + (o.socks !== undefined ? (o.socks ? '+meia' : '-meia') : '');
      if (!EP.data.models.corredor[g].body.lod2ByMask[String(a2.coverMask)]) fail(g + ': LOD2 do corpo não assado para ' + k);
      r.lod2Rua[k] = a2.index.length / 3;
      if (a2.index.length / 3 > 2200) fail(g + ': LOD2 acima de 2,2k (' + k + ')');
      const a1 = MD.assemble(g, o, 1); r.lod2Rua[k] = [a2.index.length / 3, a1.index.length / 3];
      if (a1.index.length / 3 > 8000) fail(g + ': LOD1 da rua acima de 8k (' + k + ')');
    }
    // furos no crânio, todo estilo × LOD (camiseta/short e as roupas da rua)
    r.furosCranio = {};
    for (const hs of hairs) for (let l = 0; l < 3; l++) {
      for (const o of [{ top: 'camiseta', bottom: 'short', hair: hs }, ...NPC_OUTFITS.filter(o => o.gender === g && o.hair === hs)]) {
        const h = skullHoles(MD, g, o, l, 1500), k = hs + '|' + l + (o.gender ? '|rua:' + o.top + '+' + o.bottom : '');
        if (h.head) { r.furosCranio[k] = h.head; fail(g + ': furo no crânio ' + k + ' (' + h.head + ' raios, saída em ' + JSON.stringify(h.exits.slice(0, 3)) + ')'); }
      }
    }
    // decodificação = entrada (posição do corpo)
    let derr = 0; const q = ch.body.q, tol = Math.max(q[3] - q[0], q[4] - q[1], q[5] - q[2]) / 65535;
    for (let i = 0; i < C.body.n; i++) { /* ordem muda (busca): compara caixas */ }
    r.quantPasso = +tol.toExponential(2);
  }
  // ---- verificações com pose (§15.3, §16): roupa vazada, pele furando a roupa (ilhas de pele e vértices), rasgos, na
  // corrida do jogo (10 e 18 m/s × 8 fases, 14 m/s × 4) e nos extremos (sprint, joelho alto, perna atrás, braços fechados
  // balançando, braços à frente, comemoração a 2,2 rad, pé em ponta)
  for (const g of genders) {
    const r = R[g].pose = {}, Rg = PS.rigOf(MD, g), st = PS.staticPoses(Rg), roupas = EP.data.models.roupas[g];
    const tops = Object.keys(roupas).filter(k => roupas[k].layer === 3), bots = Object.keys(roupas).filter(k => roupas[k].layer === 2);
    const dTop = g === 'f' ? 'top' : 'camiseta', dBot = g === 'f' ? 'legging' : 'short';
    const outfits = [...tops.map(t => ({ top: t, bottom: dBot })), ...bots.filter(b => b !== dBot).map(b => ({ top: dTop, bottom: b }))];
    // saia-short com todo top (v7) e short com a camiseta (o par da revisão)
    if (g === 'f') { for (const t of tops) if (t !== dTop) outfits.push({ top: t, bottom: 'saia-short' }); outfits.push({ top: 'camiseta', bottom: 'short' }); }
    if (g === 'm') outfits.push({ top: 'regata', bottom: 'bermuda' });
    const poses = { rest: {}, sprint: st.sprint, armsTight: st.armsTight, armsFwd: st.armsFwd, kneeLift: st.kneeLift, legBack: st.legBack, footPF: st.footPF, celebrate22: st.celebrate22 };
    const runSet = opts.rapido ? [[18, [1, 3, 5, 7]], [10, [2, 6]]] : [[10, [0, 1, 2, 3, 4, 5, 6, 7]], [14, [1, 3, 5, 7]], [18, [0, 1, 2, 3, 4, 5, 6, 7]]];
    for (const [sp, ks] of runSet) for (const k of ks) poses['run' + sp + '_' + k] = PS.gameRun(Rg, k * Math.PI / 4, sp);
    let worstRun = [0, ''], worstCel = [0, ''], worstFlip = [0, ''], worstStr = [0, ''], worstTear = [0, ''], worstSkin = [0, ''], worstTearRun = [0, ''], worstFacing = [0, ''], worstLeg = [0, ''];
    for (const o of outfits) {
      const key = o.top + '+' + o.bottom, res = PS.posedSuite(MD, g, { ...o, hair: 'curto' }, poses, { step: 0.008 }), rr = r[key] = {};
      for (const pn in res) {
        const x = res[pn], fl = Object.entries(x.flip).filter(([pair]) => pair.startsWith('skin>'));
        const flipN = fl.reduce((a, [, v]) => a + (v.max > 0.006 ? v.n : 0), 0), flipMax = fl.reduce((a, [, v]) => Math.max(a, v.max), 0);
        // vistas de trás (câmera do jogo atrás do corredor): az = π e az = −2,4
        const back = x.see.filter(v => Math.abs(v.view[0] - Math.PI) < 0.01 || Math.abs(v.view[0] + 2.4) < 0.01).reduce((a, v) => a + v.holes, 0);
        const run = pn.startsWith('run'), cel = pn === 'celebrate22';
        rr[pn] = { furos: x.holes, furosDentro: x.inner, furosTras: back, furosFrente: x.holesFront, avesso: x.facing, pele: x.skin, peleFura: flipN, peleMaxMm: +(flipMax * 1000).toFixed(1), estica: x.stretch.max, estica16: x.stretch.over, rasgo: x.tear.n, rasgoTodos: x.tear.all, rasgoMaxMm: +(x.tear.max * 1000).toFixed(1) };
        if (x.facing > worstFacing[0]) worstFacing = [x.facing, key + ' ' + pn];
        const legP = o.bottom !== 'legging' && (pn === 'kneeLift' || pn === 'sprint' || run);
        if (legP && x.holesFront > worstLeg[0]) worstLeg = [x.holesFront, key + ' ' + pn];
        const fL = pn === 'rest' ? POSED_LIM.facingRest : run ? POSED_LIM.facingRun : cel ? Infinity : POSED_LIM.facingExt;
        if (x.facing > fL) fail(g + ' ' + key + ' ' + pn + ': avesso do top aparece por fora em ' + x.facing + ' raios');
        if (legP && x.holesFront > POSED_LIM.legFront) fail(g + ' ' + key + ' ' + pn + ': ' + x.holesFront + ' raios vazados de frente (boca da perna)');
        if (!cel && x.tear.n > worstTear[0]) worstTear = [x.tear.n, key + ' ' + pn + ' ' + (x.tear.max * 1000).toFixed(0) + 'mm'];
        if (run && x.tear.max * 1000 > worstTearRun[0]) worstTearRun = [+(x.tear.max * 1000).toFixed(0), key + ' ' + pn + ' ' + x.tear.n + ' arestas'];
        if (cel) { if (x.inner > worstCel[0]) worstCel = [x.inner, key]; }
        else if (x.holes > worstRun[0]) worstRun = [x.holes, key + ' ' + pn];
        if (x.skin > worstSkin[0]) worstSkin = [x.skin, key + ' ' + pn + ' ' + JSON.stringify((x.see.find(v => v.skin) || {}).skinPts?.[0] || null)];
        if (flipN > worstFlip[0]) worstFlip = [flipN, key + ' ' + pn + ' ' + (flipMax * 1000).toFixed(0) + 'mm'];
        if (x.stretch.over > worstStr[0]) worstStr = [x.stretch.over, key + ' ' + pn];
        // falhas: furo visível pela câmera do jogo na corrida, pele furando o tecido, rasgo localizado
        if (run && back > POSED_LIM.backRun) fail(g + ' ' + key + ' ' + pn + ': ' + back + ' raios vazados vistos de trás');
        if (!cel && x.holes > POSED_LIM.holes) fail(g + ' ' + key + ' ' + pn + ': ' + x.holes + ' raios vazados');
        if (cel && x.inner > POSED_LIM.innerCel) fail(g + ' ' + key + ' celebrate22: ' + x.inner + ' raios vazados por dentro (' + x.holes + ' com as frestas da silhueta)');
        const skL = run ? POSED_LIM.skinRun : cel ? POSED_LIM.skinCel : POSED_LIM.skinExt;
        if (x.skin > skL) fail(g + ' ' + key + ' ' + pn + ': ' + x.skin + ' raios de pele furando o tecido');
        if (flipN > POSED_LIM.flip) fail(g + ' ' + key + ' ' + pn + ': pele atravessa a roupa (' + flipN + ' vértices > 6 mm, máx. ' + (flipMax * 1000).toFixed(0) + ' mm)');
        const tN = cel ? POSED_LIM.tearCel : run ? POSED_LIM.tearRun : POSED_LIM.tear, tMm = cel ? POSED_LIM.tearCelMm : run ? POSED_LIM.tearRunMm : POSED_LIM.tearMm;
        if (x.tear.n > tN || x.tear.max * 1000 > tMm) fail(g + ' ' + key + ' ' + pn + ': roupa rasga (' + x.tear.n + ' arestas, máx. +' + (x.tear.max * 1000).toFixed(0) + ' mm)');
      }
    }
    R[g].posePior = { furosCorrida: worstRun, furosDentroComemora: worstCel, peleIlhas: worstSkin, peleFura: worstFlip, estica16: worstStr, rasgo: worstTear, rasgoCorridaMm: worstTearRun, avessoPorFora: worstFacing, bocaPernaFrente: worstLeg };
  }

  // tamanhos
  const total = report.totalBytes;
  if (total > 3 * 1024 * 1024) fail('tamanho total acima de 3 MB: ' + total);
  for (const g of genders) {
    const t = MD.char(g).textures;
    R[g].texturasKB = { pele: Math.round(t.skin.length * 0.75 / 1024), normal: Math.round(t.normal.length * 0.75 / 1024) };
  }
  // tempo de decodificação de tudo (referência, Node)
  const t1 = Date.now();
  const EP2 = loadRuntime(raiz, saida);
  for (const g of genders) { const M2 = EP2.ModelData; ['body', 'eyes', 'brows', 'shoes'].forEach(n => M2.part(g, n)); Object.keys(EP2.data.models.roupas[g]).forEach(k => M2.garment(g, k)); Object.keys(EP2.data.models.cabelos[g]).forEach(k => M2.hair(g, k)); }
  R.decodificarTudoMs = Date.now() - t1;
  R.falhas = fails;
  R.ms = Date.now() - t0;
  return fails;
}
