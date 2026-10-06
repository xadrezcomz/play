// Texturas: PNG/JPEG, atlas de posições (texel → ponto 3D), mapa de detalhe da pele tingível,
// remoção da roupa de baixo pintada, mapa normal achatado, ladrilho do olho e retalho neutro.

let PNG = null, JPEG = null;
export function initImg(png, jpeg) { PNG = png; JPEG = jpeg; }

export function decodePNG(buf) { const p = PNG.sync.read(buf); return { w: p.width, h: p.height, d: p.data }; }   // RGBA 8 bits
export function encodePNG(img) { const p = new PNG({ width: img.w, height: img.h }); p.data = Buffer.from(img.d); return PNG.sync.write(p); }
export function encodeJPEG(img, q = 88) {
  const r = JPEG.encode({ width: img.w, height: img.h, data: Buffer.from(img.d) }, q);
  return r.data;
}

export const s2l = c => { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
export const l2s = v => { v = Math.max(0, Math.min(1, v)); return Math.round(255 * (v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055)); };
const S2L = new Float32Array(256).map((_, i) => s2l(i));

// imagem linear float RGB (Float32 w*h*3)
export function toLinear(img) {
  const n = img.w * img.h, o = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) for (let c = 0; c < 3; c++) o[i * 3 + c] = S2L[img.d[i * 4 + c]];
  return { w: img.w, h: img.h, f: o };
}
export function down2(L) {
  const w = L.w >> 1, h = L.h >> 1, o = new Float32Array(w * h * 3);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) for (let c = 0; c < 3; c++) {
    const a = ((2 * y) * L.w + 2 * x) * 3 + c, b = ((2 * y + 1) * L.w + 2 * x) * 3 + c;
    o[(y * w + x) * 3 + c] = (L.f[a] + L.f[a + 3] + L.f[b] + L.f[b + 3]) / 4;
  }
  return { w, h, f: o };
}
// amostragem bilinear (uv glTF: v para baixo)
export function sample(L, u, v, out = [0, 0, 0]) {
  const x = u * L.w - 0.5, y = v * L.h - 0.5;
  const x0 = Math.max(0, Math.min(L.w - 1, Math.floor(x))), y0 = Math.max(0, Math.min(L.h - 1, Math.floor(y)));
  const x1 = Math.min(L.w - 1, x0 + 1), y1 = Math.min(L.h - 1, y0 + 1), fx = Math.max(0, Math.min(1, x - x0)), fy = Math.max(0, Math.min(1, y - y0));
  for (let c = 0; c < 3; c++) {
    const a = L.f[(y0 * L.w + x0) * 3 + c], b = L.f[(y0 * L.w + x1) * 3 + c], d = L.f[(y1 * L.w + x0) * 3 + c], e = L.f[(y1 * L.w + x1) * 3 + c];
    out[c] = (a * (1 - fx) + b * fx) * (1 - fy) + (d * (1 - fx) + e * fx) * fy;
  }
  return out;
}
export const lum = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
export function hsv(r, g, b) {   // de sRGB 0..1
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
  return { v: mx, s: mx > 0 ? (mx - mn) / mx : 0 };
}

// ---------------------------------------------------------------- atlas de posições
// Rasteriza os triângulos UV: por texel, o triângulo e as baricêntricas → qualquer atributo por vértice.
export function rasterAtlas(size, uv, idx, nTri) {
  const tri = new Int32Array(size * size).fill(-1), bar = new Float32Array(size * size * 2);
  for (let t = 0; t < nTri; t++) {
    const a = idx[t * 3], b = idx[t * 3 + 1], c = idx[t * 3 + 2];
    const ax = uv[a * 2] * size, ay = uv[a * 2 + 1] * size, bx = uv[b * 2] * size, by = uv[b * 2 + 1] * size, cx = uv[c * 2] * size, cy = uv[c * 2 + 1] * size;
    const x0 = Math.max(0, Math.floor(Math.min(ax, bx, cx))), x1 = Math.min(size - 1, Math.ceil(Math.max(ax, bx, cx)));
    const y0 = Math.max(0, Math.floor(Math.min(ay, by, cy))), y1 = Math.min(size - 1, Math.ceil(Math.max(ay, by, cy)));
    const den = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy);
    if (Math.abs(den) < 1e-12) continue;
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const px = x + 0.5, py = y + 0.5;
      const w0 = ((by - cy) * (px - cx) + (cx - bx) * (py - cy)) / den, w1 = ((cy - ay) * (px - cx) + (ax - cx) * (py - cy)) / den, w2 = 1 - w0 - w1;
      // um pouco de folga na borda (meio texel) para não deixar furos entre triângulos
      const e = -0.02;
      if (w0 < e || w1 < e || w2 < e) continue;
      const k = y * size + x;
      if (tri[k] >= 0 && Math.min(w0, w1, w2) < 0) continue;
      tri[k] = t; bar[k * 2] = w1; bar[k * 2 + 1] = w2;
    }
  }
  return { size, tri, bar };
}
// interpola um atributo por vértice (dim) para os texels do atlas
export function atlasAttr(A, idx, attr, dim) {
  const n = A.size * A.size, o = new Float32Array(n * dim);
  for (let k = 0; k < n; k++) {
    const t = A.tri[k];
    if (t < 0) continue;
    const b1 = A.bar[k * 2], b2 = A.bar[k * 2 + 1], b0 = 1 - b1 - b2;
    const a = idx[t * 3], b = idx[t * 3 + 1], c = idx[t * 3 + 2];
    for (let d = 0; d < dim; d++) o[k * dim + d] = attr[a * dim + d] * b0 + attr[b * dim + d] * b1 + attr[c * dim + d] * b2;
  }
  return o;
}

// ---------------------------------------------------------------- filtros
export function blur(f, w, h, dim, sigma, mask = null) {
  const r = Math.ceil(sigma * 2.5), k = [];
  let s = 0;
  for (let i = -r; i <= r; i++) { const v = Math.exp(-i * i / (2 * sigma * sigma)); k.push(v); s += v; }
  const tmp = new Float32Array(f.length), wt = new Float32Array(w * h), tw = new Float32Array(w * h), out = new Float32Array(f.length);
  // separável, normalizado pela máscara (só texels válidos contam)
  const m = mask || new Uint8Array(w * h).fill(1);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let ws = 0; const acc = new Array(dim).fill(0);
    for (let i = -r; i <= r; i++) {
      const xx = x + i; if (xx < 0 || xx >= w) continue;
      const q = y * w + xx; if (!m[q]) continue;
      const kv = k[i + r]; ws += kv;
      for (let d = 0; d < dim; d++) acc[d] += f[q * dim + d] * kv;
    }
    const p = y * w + x; wt[p] = ws;
    for (let d = 0; d < dim; d++) tmp[p * dim + d] = ws ? acc[d] / ws : 0;
  }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let ws = 0; const acc = new Array(dim).fill(0);
    for (let i = -r; i <= r; i++) {
      const yy = y + i; if (yy < 0 || yy >= h) continue;
      const q = yy * w + x; if (!wt[q]) continue;
      const kv = k[i + r]; ws += kv;
      for (let d = 0; d < dim; d++) acc[d] += tmp[q * dim + d] * kv;
    }
    const p = y * w + x; tw[p] = ws;
    for (let d = 0; d < dim; d++) out[p * dim + d] = ws ? acc[d] / ws : 0;
  }
  return out;
}

// preenchimento "push-pull" (pirâmide): completa os texels com known=0 a partir dos vizinhos
export function pushPull(f, w, h, dim, known) {
  if (w <= 1 || h <= 1) return;
  const w2 = Math.max(1, w >> 1), h2 = Math.max(1, h >> 1);
  const g = new Float32Array(w2 * h2 * dim), k2 = new Float32Array(w2 * h2);
  for (let y = 0; y < h2; y++) for (let x = 0; x < w2; x++) {
    let ws = 0; const acc = new Array(dim).fill(0);
    for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) {
      const xx = Math.min(w - 1, 2 * x + dx), yy = Math.min(h - 1, 2 * y + dy), q = yy * w + xx, kw = known[q];
      if (kw <= 0) continue;
      ws += kw; for (let d = 0; d < dim; d++) acc[d] += f[q * dim + d] * kw;
    }
    const p = y * w2 + x;
    k2[p] = Math.min(1, ws);
    for (let d = 0; d < dim; d++) g[p * dim + d] = ws ? acc[d] / ws : 0;
  }
  pushPull(g, w2, h2, dim, k2);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const p = y * w + x, kw = known[p];
    if (kw >= 1) continue;
    // bilinear do nível de baixo
    const gx = Math.min(w2 - 1, Math.max(0, (x + 0.5) / 2 - 0.5)), gy = Math.min(h2 - 1, Math.max(0, (y + 0.5) / 2 - 0.5));
    const x0 = Math.floor(gx), y0 = Math.floor(gy), x1 = Math.min(w2 - 1, x0 + 1), y1 = Math.min(h2 - 1, y0 + 1), fx = gx - x0, fy = gy - y0;
    for (let d = 0; d < dim; d++) {
      const v = (g[(y0 * w2 + x0) * dim + d] * (1 - fx) + g[(y0 * w2 + x1) * dim + d] * fx) * (1 - fy) + (g[(y1 * w2 + x0) * dim + d] * (1 - fx) + g[(y1 * w2 + x1) * dim + d] * fx) * fy;
      f[p * dim + d] = f[p * dim + d] * kw + v * (1 - kw);
    }
  }
}

export function dilateMask(m, w, h, r) {
  let cur = m;
  for (let it = 0; it < r; it++) {
    const o = Uint8Array.from(cur);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const p = y * w + x;
      if (cur[p]) continue;
      if ((x > 0 && cur[p - 1]) || (x < w - 1 && cur[p + 1]) || (y > 0 && cur[p - w]) || (y < h - 1 && cur[p + w])) o[p] = 1;
    }
    cur = o;
  }
  return cur;
}

// maior quadrado livre (com folga) no atlas: devolve [x, y, lado]
export function freeSquare(occ, size, pad) {
  // distância em xadrez a um texel ocupado ou à borda
  const d = new Int32Array(size * size);
  for (let y = size - 1; y >= 0; y--) for (let x = size - 1; x >= 0; x--) {
    const p = y * size + x;
    if (occ[p]) { d[p] = 0; continue; }
    const r = x < size - 1 ? d[p + 1] : 0, b = y < size - 1 ? d[p + size] : 0, rb = x < size - 1 && y < size - 1 ? d[p + size + 1] : 0;
    d[p] = 1 + Math.min(r, b, rb);
  }
  // d = lado do maior quadrado livre com canto superior esquerdo em (x, y), sem folga; aplica a folga
  let best = [0, 0, 0];
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const s = d[y * size + x] - 2 * pad;
    if (s > best[2]) best = [x + pad, y + pad, s];
  }
  return best;
}

// redimensiona (bilinear com pré-média) uma imagem RGBA 8 bits para w×h
export function resizeRGBA(img, w, h) {
  const o = new Uint8Array(w * h * 4), sx = img.w / w, sy = img.h / h;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const acc = [0, 0, 0, 0]; let n = 0;
    for (let yy = Math.floor(y * sy); yy < Math.min(img.h, Math.ceil((y + 1) * sy)); yy++)
      for (let xx = Math.floor(x * sx); xx < Math.min(img.w, Math.ceil((x + 1) * sx)); xx++) {
        for (let c = 0; c < 4; c++) acc[c] += img.d[(yy * img.w + xx) * 4 + c];
        n++;
      }
    for (let c = 0; c < 4; c++) o[(y * w + x) * 4 + c] = Math.round(acc[c] / n);
  }
  return { w, h, d: o };
}
