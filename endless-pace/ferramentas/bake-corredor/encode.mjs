// Codificação das partes: quantização, normal octaédrica, ordem de cache/busca e codecs do meshoptimizer.
// Formato documentado em ferramentas/ESPEC-corredor.md §11.

let E = null, Sm = null;
export async function initMeshopt(mod) {
  E = mod.MeshoptEncoder; Sm = mod.MeshoptSimplifier;
  await E.ready; await Sm.ready;
}
export const simplifier = () => Sm;
export const encoder = () => E;

const b64 = u8 => Buffer.from(u8.buffer, u8.byteOffset, u8.byteLength).toString('base64');
export function vbuf(typed, n, stride) {
  const u8 = new Uint8Array(typed.buffer, typed.byteOffset, typed.byteLength);
  if (u8.length !== n * stride) throw new Error('tamanho de fluxo errado');
  return b64(E.encodeVertexBuffer(u8, n, stride));
}
export function ibuf(idx) {
  const u16 = Uint16Array.from(idx);
  if (idx.length && Math.max(...sample(idx)) > 65535) throw new Error('índice > 65535');
  return b64(E.encodeIndexBuffer(new Uint8Array(u16.buffer), u16.length, 2));
}
function sample(idx) { let m = 0; for (let i = 0; i < idx.length; i++) if (idx[i] > m) m = idx[i]; return [m]; }

export function octEncode(x, y, z) {
  const l = Math.abs(x) + Math.abs(y) + Math.abs(z) || 1;
  x /= l; y /= l;
  if (z < 0) {
    const ox = x;
    x = (1 - Math.abs(y)) * (ox >= 0 ? 1 : -1);
    y = (1 - Math.abs(ox)) * (y >= 0 ? 1 : -1);
  }
  return [Math.round(x * 127), Math.round(y * 127)];
}
export function octDecode(ox, oy) {
  let x = ox / 127, y = oy / 127; const z = 1 - Math.abs(x) - Math.abs(y), t = Math.max(-z, 0);
  x += x >= 0 ? -t : t; y += y >= 0 ? -t : t;
  const l = Math.hypot(x, y, z) || 1;
  return [x / l, y / l, z / l];
}

// ordena triângulos para cache sem mudar a numeração externa
export function cacheOrderKeep(idx) {
  if (!idx.length) return Uint32Array.from(idx);
  const used = new Map(), back = [];
  const loc = new Uint32Array(idx.length);
  for (let i = 0; i < idx.length; i++) { let v = used.get(idx[i]); if (v === undefined) { v = back.length; used.set(idx[i], v); back.push(idx[i]); } loc[i] = v; }
  const [remap] = E.reorderMesh(loc, true, true);
  const inv = new Uint32Array(back.length);
  for (let i = 0; i < back.length; i++) if (remap[i] !== 0xffffffff) inv[remap[i]] = back[i];
  return Uint32Array.from(loc, v => inv[v]);
}

// renumera vértices pela ordem do primeiro uso; devolve { order (novo→antigo), map (antigo→novo) }
export function fetchOrder(idx, nv) {
  const map = new Int32Array(nv).fill(-1), order = [];
  for (let i = 0; i < idx.length; i++) if (map[idx[i]] < 0) { map[idx[i]] = order.length; order.push(idx[i]); }
  return { order: Int32Array.from(order), map };
}

// Monta uma "Part" codificada. v = { n, P (Float n*3), N (n*3), T? (n*2), J (u8 n*4), W (u8 n*4), A (u8 n*4) }
// lods = [{ idx: Uint32Array (índices em v), cells? }] — LOD0 define a ordem dos vértices (busca).
// Vértices que nenhum LOD usa são descartados.
export function encodePart(v, lods, extra = {}) {
  // ordem de busca: LOD0 primeiro; vértices só dos LODs seguintes (ex.: casca inflada do cabelo) vão no fim
  let all = lods[0].idx;
  if (lods.length > 1) { const tot = lods.reduce((a, L) => a + L.idx.length, 0); all = new Uint32Array(tot); let o = 0; for (const L of lods) { all.set(L.idx, o); o += L.idx.length; } }
  const fo = fetchOrder(all, v.n), n = fo.order.length, ord = fo.order;
  let x0 = 1e9, y0 = 1e9, z0 = 1e9, x1 = -1e9, y1 = -1e9, z1 = -1e9;
  for (const o of ord) {
    const x = v.P[o * 3], y = v.P[o * 3 + 1], z = v.P[o * 3 + 2];
    if (x < x0) x0 = x; if (y < y0) y0 = y; if (z < z0) z0 = z; if (x > x1) x1 = x; if (y > y1) y1 = y; if (z > z1) z1 = z;
  }
  const q = [x0, y0, z0, x1, y1, z1].map(a => +a.toFixed(5));
  const dx = (q[3] - q[0]) || 1, dy = (q[4] - q[1]) || 1, dz = (q[5] - q[2]) || 1;
  const P = new Uint16Array(n * 4), N = new Int8Array(n * 4), J = new Uint8Array(n * 4), W = new Uint8Array(n * 4), A = new Uint8Array(n * 4);
  const T = v.T ? new Uint16Array(n * 2) : null;
  const dec = new Float64Array(n * 3);   // posição como o decodificador verá
  for (let i = 0; i < n; i++) {
    const o = ord[i];
    const qx = Math.round((v.P[o * 3] - q[0]) / dx * 65535), qy = Math.round((v.P[o * 3 + 1] - q[1]) / dy * 65535), qz = Math.round((v.P[o * 3 + 2] - q[2]) / dz * 65535);
    P[i * 4] = Math.max(0, Math.min(65535, qx)); P[i * 4 + 1] = Math.max(0, Math.min(65535, qy)); P[i * 4 + 2] = Math.max(0, Math.min(65535, qz));
    dec[i * 3] = q[0] + P[i * 4] / 65535 * dx; dec[i * 3 + 1] = q[1] + P[i * 4 + 1] / 65535 * dy; dec[i * 3 + 2] = q[2] + P[i * 4 + 2] / 65535 * dz;
    const on = octEncode(v.N[o * 3], v.N[o * 3 + 1], v.N[o * 3 + 2]);
    N[i * 4] = on[0]; N[i * 4 + 1] = on[1];
    if (T) { T[i * 2] = Math.round(Math.max(0, Math.min(1, v.T[o * 2])) * 65535); T[i * 2 + 1] = Math.round(Math.max(0, Math.min(1, v.T[o * 2 + 1])) * 65535); }
    for (let k = 0; k < 4; k++) { J[i * 4 + k] = v.J[o * 4 + k]; W[i * 4 + k] = v.W[o * 4 + k]; A[i * 4 + k] = v.A[o * 4 + k]; }
  }
  const out = { n, q, P: vbuf(P, n, 8), N: vbuf(N, n, 4) };
  if (T) out.T = vbuf(T, n, 4);
  out.J = vbuf(J, n, 4); out.W = vbuf(W, n, 4); out.A = vbuf(A, n, 4);
  out.lods = lods.map(L => {
    const idx = Uint32Array.from(L.idx, i => { const m = fo.map[i]; if (m < 0) throw new Error('LOD usa vértice sem ordem'); return m; });
    const o = { t: idx.length / 3, I: ibuf(idx) };
    if (L.cells) o.cells = L.cells;
    return o;
  });
  Object.assign(out, extra);
  return { part: out, map: fo.map, order: ord, decPos: dec, rawSize: n * 28 };
}

export function remapIdx(idx, map) { return Uint32Array.from(idx, i => map[i]); }
