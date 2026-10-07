// Verificações automáticas (§12.1) sobre os arquivos já escritos, decodificados pelo decodificador real
// do jogo (jogar/js/runner/ModelData.js) num contexto isolado do Node.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { BVH } from './geom.mjs';
import { NPC_OUTFITS } from './pipeline.mjs';

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

export function runChecks(out, { raiz, saida, report }) {
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
