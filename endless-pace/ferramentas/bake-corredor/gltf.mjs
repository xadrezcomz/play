// Leitor mínimo de glTF/GLB + matemática de matrizes e quatérnios (coluna maior, como o glTF).
import fs from 'node:fs';
import path from 'node:path';

const CT = { 5120: Int8Array, 5121: Uint8Array, 5122: Int16Array, 5123: Uint16Array, 5125: Uint32Array, 5126: Float32Array };
const NC = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 };

function accessorReader(g, bins) {
  return i => {
    const a = g.accessors[i], bv = g.bufferViews[a.bufferView], T = CT[a.componentType], nc = NC[a.type];
    const buf = bins[bv.buffer], off = (bv.byteOffset || 0) + (a.byteOffset || 0), es = T.BYTES_PER_ELEMENT;
    const stride = bv.byteStride || nc * es, out = new T(a.count * nc);
    const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
    const get = T === Float32Array ? (o) => dv.getFloat32(o, true) : T === Uint16Array ? (o) => dv.getUint16(o, true)
      : T === Uint32Array ? (o) => dv.getUint32(o, true) : T === Uint8Array ? (o) => dv.getUint8(o)
        : T === Int16Array ? (o) => dv.getInt16(o, true) : (o) => dv.getInt8(o);
    for (let k = 0; k < a.count; k++) for (let c = 0; c < nc; c++) out[k * nc + c] = get(off + k * stride + c * es);
    if (a.normalized) {
      const s = T === Uint8Array ? 255 : T === Uint16Array ? 65535 : T === Int16Array ? 32767 : 127;
      return Float32Array.from(out, v => v / s);
    }
    return out;
  };
}

export function loadGltf(file) {
  const g = JSON.parse(fs.readFileSync(file, 'utf8'));
  const bins = g.buffers.map(b => fs.readFileSync(path.join(path.dirname(file), decodeURIComponent(b.uri))));
  g.acc = accessorReader(g, bins);
  return g;
}

export function loadGlb(file) {
  const d = fs.readFileSync(file);
  const L = d.readUInt32LE(12);
  const g = JSON.parse(d.subarray(20, 20 + L).toString());
  const o = 20 + L, bl = d.readUInt32LE(o);
  g.acc = accessorReader(g, [d.subarray(o + 8, o + 8 + bl)]);
  return g;
}

// ---------------------------------------------------------------- vetores
export const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const scl = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
export const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const len = a => Math.hypot(a[0], a[1], a[2]);
export const norm = a => { const l = len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
export const lerp3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
export const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

// ---------------------------------------------------------------- matrizes 4x4 (coluna maior)
export const I4 = () => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
export function compose(t = [0, 0, 0], q = [0, 0, 0, 1], s = [1, 1, 1]) {
  const [x, y, z, w] = q, x2 = x + x, y2 = y + y, z2 = z + z;
  const xx = x * x2, xy = x * y2, xz = x * z2, yy = y * y2, yz = y * z2, zz = z * z2, wx = w * x2, wy = w * y2, wz = w * z2;
  return [(1 - (yy + zz)) * s[0], (xy + wz) * s[0], (xz - wy) * s[0], 0, (xy - wz) * s[1], (1 - (xx + zz)) * s[1], (yz + wx) * s[1], 0,
    (xz + wy) * s[2], (yz - wx) * s[2], (1 - (xx + yy)) * s[2], 0, t[0], t[1], t[2], 1];
}
export function mul(a, b) {
  const o = new Array(16);
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
    let s = 0;
    for (let k = 0; k < 4; k++) s += a[k * 4 + j] * b[i * 4 + k];
    o[i * 4 + j] = s;
  }
  return o;
}
export const tp = (m, p) => [m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12], m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13], m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14]];
export const td = (m, p) => [m[0] * p[0] + m[4] * p[1] + m[8] * p[2], m[1] * p[0] + m[5] * p[1] + m[9] * p[2], m[2] * p[0] + m[6] * p[1] + m[10] * p[2]];
export function invert(a) {
  const o = new Array(16);
  const b00 = a[0] * a[5] - a[1] * a[4], b01 = a[0] * a[6] - a[2] * a[4], b02 = a[0] * a[7] - a[3] * a[4], b03 = a[1] * a[6] - a[2] * a[5];
  const b04 = a[1] * a[7] - a[3] * a[5], b05 = a[2] * a[7] - a[3] * a[6], b06 = a[8] * a[13] - a[9] * a[12], b07 = a[8] * a[14] - a[10] * a[12];
  const b08 = a[8] * a[15] - a[11] * a[12], b09 = a[9] * a[14] - a[10] * a[13], b10 = a[9] * a[15] - a[11] * a[13], b11 = a[10] * a[15] - a[11] * a[14];
  const d = 1 / (b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06);
  o[0] = (a[5] * b11 - a[6] * b10 + a[7] * b09) * d; o[1] = (a[2] * b10 - a[1] * b11 - a[3] * b09) * d;
  o[2] = (a[13] * b05 - a[14] * b04 + a[15] * b03) * d; o[3] = (a[10] * b04 - a[9] * b05 - a[11] * b03) * d;
  o[4] = (a[6] * b08 - a[4] * b11 - a[7] * b07) * d; o[5] = (a[0] * b11 - a[2] * b08 + a[3] * b07) * d;
  o[6] = (a[14] * b02 - a[12] * b05 - a[15] * b01) * d; o[7] = (a[8] * b05 - a[10] * b02 + a[11] * b01) * d;
  o[8] = (a[4] * b10 - a[5] * b08 + a[7] * b06) * d; o[9] = (a[1] * b08 - a[0] * b10 - a[3] * b06) * d;
  o[10] = (a[12] * b04 - a[13] * b02 + a[15] * b00) * d; o[11] = (a[9] * b02 - a[8] * b04 - a[11] * b00) * d;
  o[12] = (a[5] * b07 - a[4] * b09 - a[6] * b06) * d; o[13] = (a[0] * b09 - a[1] * b07 + a[2] * b06) * d;
  o[14] = (a[13] * b01 - a[12] * b03 - a[14] * b00) * d; o[15] = (a[8] * b03 - a[9] * b01 + a[10] * b00) * d;
  return o;
}
export const transl = m => [m[12], m[13], m[14]];

// ---------------------------------------------------------------- quatérnios [x, y, z, w]
export function axisAngle(ax, an) { const a = norm(ax), s = Math.sin(an / 2); return [a[0] * s, a[1] * s, a[2] * s, Math.cos(an / 2)]; }
export function slerp(a, b, t) {
  let [bx, by, bz, bw] = b;
  let c = a[0] * bx + a[1] * by + a[2] * bz + a[3] * bw;
  if (c < 0) { c = -c; bx = -bx; by = -by; bz = -bz; bw = -bw; }
  let k0, k1;
  if (c > 0.9995) { k0 = 1 - t; k1 = t; } else {
    const th = Math.acos(c), s = Math.sin(th);
    k0 = Math.sin((1 - t) * th) / s; k1 = Math.sin(t * th) / s;
  }
  const r = [a[0] * k0 + bx * k1, a[1] * k0 + by * k1, a[2] * k0 + bz * k1, a[3] * k0 + bw * k1];
  const l = Math.hypot(...r);
  return r.map(v => v / l);
}
// rotação q em torno do ponto p (matriz)
export function rotAbout(p, q) { return mul(compose(p), mul(compose([0, 0, 0], q), compose([-p[0], -p[1], -p[2]]))); }
// menor rotação que leva a direção a até b
export function rotBetween(a, b) {
  a = norm(a); b = norm(b);
  const c = Math.min(1, Math.max(-1, dot(a, b)));
  const ax = cross(a, b);
  if (len(ax) < 1e-9) return [0, 0, 0, 1];
  return axisAngle(ax, Math.acos(c));
}
