// ModelData — decodifica os corredores "assados" (jogar/dados/modelos/*.js, gerados por
// ferramentas/bake-corredor.mjs a partir dos Universal Base Characters da Quaternius, CC0).
//
// Os arquivos de dados guardam cada malha como fluxos base64 comprimidos pelo codec do
// meshoptimizer (posição quantizada, normal octaédrica, UV, ossos, pesos e atributos), com as
// listas de índices por nível de detalhe. Aqui eles viram arrays prontos para BufferGeometry.
// Formato completo: ferramentas/ESPEC-corredor.md §11.
//
//   EP.ModelData.ok()                         dados e decodificador presentes
//   EP.ModelData.char(g)                      cabeçalho do gênero ('m'|'f'): ossos, âncoras, medidas, slots...
//   EP.ModelData.part(g, nome)                'body'|'eyes'|'brows'|'shoes' → malha (vértices decodificados, cache)
//   EP.ModelData.hair(g, estilo)              → malha
//   EP.ModelData.garment(g, tipo)             → malha
//   EP.ModelData.index(malha, lod)            → Uint16Array (ou null se a peça não existe nesse LOD)
//   EP.ModelData.coverMask(g, roupa)          → máscara de pele coberta
//   EP.ModelData.assemble(g, roupa, lod)      roupa { top, bottom, hair, socks } → malha única (cache por chave)
//   EP.ModelData.geometry(malha)              → THREE.BufferGeometry (position, normal, uv, skinIndex, skinWeight, mat)
//   EP.ModelData.texture(g, 'skin'|'normal')  → THREE.Texture (criada uma vez)
//
// Malha = { n, position, normal, uv, skinIndex (Uint8 ×4), skinWeight (Float32 ×4), mat, slot, ao (0..1), flags,
//           index, key }
(function (EP) {
  'use strict';

  // ---------------------------------------------------------------- decodificador meshoptimizer
  // Adaptado de meshopt_decoder_reference.js (meshoptimizer 1.3.0, MIT — Copyright (C) 2016-2026
  // Arseny Kapoulkine; implementação de referência de Jasper St. Pierre). Só os codecs de vértice
  // (0xa0/0xa1) e de índice (0xe1), sem filtros. Licença: jogar/modelos/LICENCAS/meshoptimizer-LICENSE.md
  var MO = (function () {
    function assert(c) { if (!c) throw new Error('ModelData: dado corrompido'); }
    function dezig(v) { return (v >>> 1) ^ -(v & 1); }
    function decodeVertexBuffer(target, elementCount, byteStride, source) {
      assert(source[0] === 0xa0 || source[0] === 0xa1);
      var version = source[0] & 0x0f;
      var maxBlockElements = Math.min((0x2000 / byteStride) & ~0x000f, 0x100);
      var deltas = new Uint8Array(maxBlockElements * byteStride);
      var tailSize = version === 0 ? byteStride : byteStride + byteStride / 4;
      var tailDataOffs = source.length - tailSize;
      var tempData = source.slice(tailDataOffs, tailDataOffs + byteStride);
      var channels = version === 0 ? null : source.slice(tailDataOffs + byteStride, tailDataOffs + tailSize);
      var srcOffs = 1;
      var headerModes = [[0, 2, 4, 8], [0, 1, 2, 4], [1, 2, 4, 8]];
      for (var dstElemBase = 0; dstElemBase < elementCount; dstElemBase += maxBlockElements) {
        var attrBlockElementCount = Math.min(elementCount - dstElemBase, maxBlockElements);
        var groupCount = ((attrBlockElementCount + 0x0f) & ~0x0f) >>> 4;
        var headerByteCount = ((groupCount + 0x03) & ~0x03) >>> 2;
        var controlBitsOffs = srcOffs;
        srcOffs += version === 0 ? 0 : byteStride / 4;
        deltas.fill(0);
        for (var byte = 0; byte < byteStride; byte++) {
          var deltaBase = byte * attrBlockElementCount;
          var controlMode = version === 0 ? 0 : (source[controlBitsOffs + (byte >>> 2)] >>> ((byte & 0x03) << 1)) & 0x03;
          if (controlMode === 2) continue;
          if (controlMode === 3) {
            deltas.set(source.subarray(srcOffs, srcOffs + attrBlockElementCount), deltaBase);
            srcOffs += attrBlockElementCount;
            continue;
          }
          var headerBitsOffs = srcOffs;
          srcOffs += headerByteCount;
          for (var group = 0; group < groupCount; group++) {
            var mode = (source[headerBitsOffs + (group >>> 2)] >>> ((group & 0x03) << 1)) & 0x03;
            var modeBits = headerModes[version === 0 ? 0 : controlMode + 1][mode];
            var deltaOffs = deltaBase + (group << 4), m, srcBase, delta;
            if (modeBits === 0) {
              // tudo zero
            } else if (modeBits === 1) {
              srcBase = srcOffs; srcOffs += 0x02;
              for (m = 0; m < 0x10; m++) {
                delta = (source[srcBase + (m >>> 3)] >>> (m & 0x07)) & 0x01;
                if (delta === 1) delta = source[srcOffs++];
                deltas[deltaOffs + m] = delta;
              }
            } else if (modeBits === 2) {
              srcBase = srcOffs; srcOffs += 0x04;
              for (m = 0; m < 0x10; m++) {
                delta = (source[srcBase + (m >>> 2)] >>> (6 - ((m & 0x03) << 1))) & 0x03;
                if (delta === 3) delta = source[srcOffs++];
                deltas[deltaOffs + m] = delta;
              }
            } else if (modeBits === 4) {
              srcBase = srcOffs; srcOffs += 0x08;
              for (m = 0; m < 0x10; m++) {
                delta = (source[srcBase + (m >>> 1)] >>> (4 - ((m & 0x01) << 2))) & 0x0f;
                if (delta === 0xf) delta = source[srcOffs++];
                deltas[deltaOffs + m] = delta;
              }
            } else {
              deltas.set(source.subarray(srcOffs, srcOffs + 0x10), deltaOffs);
              srcOffs += 0x10;
            }
          }
        }
        for (var elem = 0; elem < attrBlockElementCount; elem++) {
          var dstElem = dstElemBase + elem;
          for (var byteGroup = 0; byteGroup < byteStride; byteGroup += 4) {
            var channelMode = version === 0 ? 0 : channels[byteGroup >>> 2] & 0x03, b, temp, dstOffs;
            assert(channelMode !== 0x03);
            if (channelMode === 0) {
              for (b = byteGroup; b < byteGroup + 4; b++) {
                temp = (tempData[b] + dezig(deltas[b * attrBlockElementCount + elem])) & 0xff;
                target[dstElem * byteStride + b] = tempData[b] = temp;
              }
            } else if (channelMode === 1) {
              for (b = byteGroup; b < byteGroup + 4; b += 2) {
                delta = dezig(deltas[b * attrBlockElementCount + elem] + (deltas[(b + 1) * attrBlockElementCount + elem] << 8));
                temp = (tempData[b] + (tempData[b + 1] << 8) + delta) & 0xffff;
                dstOffs = dstElem * byteStride + b;
                target[dstOffs] = tempData[b] = temp & 0xff;
                target[dstOffs + 1] = tempData[b + 1] = temp >>> 8;
              }
            } else {
              b = byteGroup;
              delta = deltas[b * attrBlockElementCount + elem] + (deltas[(b + 1) * attrBlockElementCount + elem] << 8) +
                (deltas[(b + 2) * attrBlockElementCount + elem] << 16) + (deltas[(b + 3) * attrBlockElementCount + elem] << 24);
              temp = tempData[b] + (tempData[b + 1] << 8) + (tempData[b + 2] << 16) + (tempData[b + 3] << 24);
              var rot = channels[byteGroup >>> 2] >>> 4;
              temp = temp ^ ((delta >>> rot) | (delta << (32 - rot)));
              dstOffs = dstElem * byteStride + b;
              target[dstOffs] = tempData[b] = temp & 0xff;
              target[dstOffs + 1] = tempData[b + 1] = (temp >>> 8) & 0xff;
              target[dstOffs + 2] = tempData[b + 2] = (temp >>> 16) & 0xff;
              target[dstOffs + 3] = tempData[b + 3] = temp >>> 24;
            }
          }
        }
      }
      var tailSizePadded = Math.max(tailSize, version === 0 ? 32 : 24);
      assert(srcOffs === source.length - tailSizePadded);
    }
    function decodeIndexBuffer(target, count, source) {
      assert(source[0] === 0xe1 && count % 3 === 0);
      var dst = target, triCount = count / 3;
      var codeOffs = 1, dataOffs = codeOffs + triCount, codeauxOffs = source.length - 0x10;
      var next = 0, last = 0;
      var edgefifo = new Uint32Array(32), vertexfifo = new Uint32Array(16), eo = 0, vo = 0;
      function readLEB128() { var n = 0; for (var i = 0; ; i += 7) { var b = source[dataOffs++]; n |= (b & 0x7f) << i; if (b < 0x80) return n; } }
      function decodeIndex(v) { return (last += dezig(v)); }
      function readE(n) { return edgefifo[(eo - 1 - n) & 31]; }
      function readV(n) { return vertexfifo[(vo - 1 - n) & 15]; }
      function pushE(n) { edgefifo[eo] = n; eo = (eo + 1) & 31; }
      function pushV(n) { vertexfifo[vo] = n; vo = (vo + 1) & 15; }
      var d = 0;
      for (var i = 0; i < triCount; i++) {
        var code = source[codeOffs++], b0 = code >>> 4, b1 = code & 0x0f, a, b, c, e, z, w;
        if (b0 < 0x0f) {
          a = readE((b0 << 1) + 0); b = readE((b0 << 1) + 1); c = -1;
          if (b1 === 0x00) { c = next++; pushV(c); } else if (b1 < 0x0d) c = readV(b1);
          else if (b1 === 0x0d) { c = --last; pushV(c); } else if (b1 === 0x0e) { c = ++last; pushV(c); } else { c = decodeIndex(readLEB128()); pushV(c); }
          pushE(b); pushE(c); pushE(c); pushE(a);
        } else {
          if (b1 < 0x0e) {
            e = source[codeauxOffs + b1]; z = e >>> 4; w = e & 0x0f;
            a = next++;
            b = z === 0 ? next++ : readV(z - 1);
            c = w === 0 ? next++ : readV(w - 1);
            pushV(a); if (z === 0) pushV(b); if (w === 0) pushV(c);
          } else {
            e = source[dataOffs++];
            if (e === 0) next = 0;
            z = e >>> 4; w = e & 0x0f;
            a = b1 === 0x0e ? next++ : decodeIndex(readLEB128());
            b = z === 0 ? next++ : z === 0x0f ? decodeIndex(readLEB128()) : readV(z - 1);
            c = w === 0 ? next++ : w === 0x0f ? decodeIndex(readLEB128()) : readV(w - 1);
            pushV(a); if (z === 0 || z === 0x0f) pushV(b); if (w === 0 || w === 0x0f) pushV(c);
          }
          pushE(a); pushE(b); pushE(b); pushE(c); pushE(c); pushE(a);
        }
        dst[d++] = a; dst[d++] = b; dst[d++] = c;
      }
      assert(dataOffs <= codeauxOffs);
    }
    return { decodeVertexBuffer: decodeVertexBuffer, decodeIndexBuffer: decodeIndexBuffer };
  })();

  // ---------------------------------------------------------------- fluxos
  function bytes(s) {
    var bin = typeof atob === 'function' ? atob(s) : Buffer.from(s, 'base64').toString('binary');
    var u = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    return u;
  }
  function vstream(s, n, stride) { var u = new Uint8Array(n * stride); if (n) MO.decodeVertexBuffer(u, n, stride, bytes(s)); return u; }
  function istream(s, t) { var u = new Uint16Array(t * 3); if (t) MO.decodeIndexBuffer(u, t * 3, bytes(s)); return u; }

  function decodePart(p) {
    if (p._m) return p._m;
    var n = p.n, q = p.q, i;
    var P = new Uint16Array(vstream(p.P, n, 8).buffer), Nn = new Int8Array(vstream(p.N, n, 4).buffer);
    var pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), dx = q[3] - q[0], dy = q[4] - q[1], dz = q[5] - q[2];
    for (i = 0; i < n; i++) {
      pos[i * 3] = q[0] + P[i * 4] / 65535 * dx; pos[i * 3 + 1] = q[1] + P[i * 4 + 1] / 65535 * dy; pos[i * 3 + 2] = q[2] + P[i * 4 + 2] / 65535 * dz;
      var x = Nn[i * 4] / 127, y = Nn[i * 4 + 1] / 127, z = 1 - Math.abs(x) - Math.abs(y), t = Math.max(-z, 0);
      x += x >= 0 ? -t : t; y += y >= 0 ? -t : t;
      var l = Math.sqrt(x * x + y * y + z * z) || 1;
      nor[i * 3] = x / l; nor[i * 3 + 1] = y / l; nor[i * 3 + 2] = z / l;
    }
    var uv = null;
    if (p.T) {
      var T = new Uint16Array(vstream(p.T, n, 4).buffer);
      uv = new Float32Array(n * 2);
      for (i = 0; i < n * 2; i++) uv[i] = T[i] / 65535;
    }
    var J = vstream(p.J, n, 4), Wb = vstream(p.W, n, 4), A = vstream(p.A, n, 4);
    var sw = new Float32Array(n * 4), mat = new Uint8Array(n), slot = new Uint8Array(n), ao = new Float32Array(n), flags = new Uint8Array(n);
    for (i = 0; i < n * 4; i++) sw[i] = Wb[i] / 255;
    for (i = 0; i < n; i++) { mat[i] = A[i * 4]; slot[i] = A[i * 4 + 1]; ao[i] = A[i * 4 + 2] / 255; flags[i] = A[i * 4 + 3]; }
    p._m = { n: n, position: pos, normal: nor, uv: uv, skinIndex: J, skinWeight: sw, mat: mat, slot: slot, ao: ao, flags: flags, src: p, _idx: [] };
    return p._m;
  }
  function index(m, lod) {
    var p = m.src, L = p.lods[lod];
    if (!L) return null;
    if (!m._idx[lod]) m._idx[lod] = istream(L.I, L.t);
    return m._idx[lod];
  }
  function indexByMask(m, mask) {
    var L = m.src.lod2ByMask && m.src.lod2ByMask[String(mask)];
    if (!L) return null;
    m._mask = m._mask || {};
    if (!m._mask[mask]) m._mask[mask] = istream(L.I, L.t);
    return m._mask[mask];
  }

  var models = function () { return EP.data && EP.data.models; };
  function char(g) { var M = models(); return M && M.corredor && M.corredor[g]; }
  function part(g, name) { var c = char(g); return c && c[name] ? decodePart(c[name]) : null; }
  function hair(g, style) { var M = models(), h = M && M.cabelos && M.cabelos[g]; return h && h[style] ? decodePart(h[style]) : null; }
  function garment(g, kind) { var M = models(), r = M && M.roupas && M.roupas[g]; return r && r[kind] ? decodePart(r[kind]) : null; }

  // roupa normalizada (mesmas regras do RunnerRig): topo, baixo, cabelo, meia
  var TOPS = { camiseta: 1, regata: 1, top: 1, 'manga-longa': 1, 'corta-vento': 1 };
  var BOTTOMS = { short: 1, bermuda: 1, legging: 1, 'saia-short': 1 };
  function normOutfit(g, o) {
    o = o || {};
    var top = TOPS[o.top] ? o.top : (g === 'f' ? 'top' : 'camiseta');
    var bottom = BOTTOMS[o.bottom] ? o.bottom : (g === 'f' ? 'legging' : 'short');
    if (g === 'm' && top === 'top') top = 'regata';
    if (g === 'm' && bottom === 'saia-short') bottom = 'short';
    var hairS = o.hair || (g === 'f' ? 'rabo' : 'curto');
    var socks = o.socks !== undefined ? !!o.socks : bottom !== 'legging';
    return { top: top, bottom: bottom, hair: hairS, socks: socks };
  }
  function coverMask(g, outfit) {
    var c = char(g), o = normOutfit(g, outfit), b = c.coverBits, m = 0;
    if (b[o.top] !== undefined) m |= 1 << b[o.top];
    if (b[o.bottom] !== undefined) m |= 1 << b[o.bottom];
    if (o.socks && b.meia !== undefined) m |= 1 << b.meia;
    if (b['hair:' + o.hair] !== undefined) m |= 1 << b['hair:' + o.hair];
    return m >>> 0;
  }

  var asmCache = {}, warned = {};
  function warnOnce(msg) { if (warned[msg]) return; warned[msg] = 1; if (typeof console !== 'undefined' && console.warn) console.warn(msg); }
  function assemble(g, outfit, lod) {
    var o = normOutfit(g, outfit), key = g + '|' + o.top + '|' + o.bottom + '|' + o.hair + '|' + (o.socks ? 1 : 0) + '|' + lod;
    if (asmCache[key]) return asmCache[key];
    var c = char(g), mask = coverMask(g, o), list = [];
    // corpo: só as células que nenhuma peça cobre (LOD2: malha pronta por combinação, se houver)
    var body = part(g, 'body'), bIdx = null;
    if (lod >= 2) bIdx = indexByMask(body, mask);
    if (lod >= 2 && !bIdx) warnOnce('ModelData: sem LOD2 assado para ' + key + ' (usa o LOD1 do corpo, ~4k triângulos a mais)');
    if (!bIdx) { var bl = Math.min(lod, 1); bIdx = cellsKeep(index(body, bl), body.src.lods[bl].cells, mask); }
    // LOD2: pele só com a cor por vértice (o UV da malha dizimada distorce o rosto) → UV no retalho neutro
    list.push([body, bIdx, lod >= 2]);
    // peça; com células (roupa de baixo), tira os triângulos inteiros embaixo da roupa de cima
    var add = function (m, hide) {
      if (!m || m.src.lods.length <= lod) return;
      var ix = index(m, lod), cl = m.src.lods[lod].cells;
      if (cl && hide) ix = cellsKeep(ix, cl, hide);
      list.push([m, ix]);
    };
    var bits = c.coverBits;
    add(part(g, 'eyes')); add(part(g, 'brows')); add(part(g, 'shoes'));
    add(hair(g, o.hair));
    add(garment(g, o.top)); add(garment(g, o.bottom), 1 << bits[o.top]);
    if (o.socks) add(garment(g, 'meia'), 1 << bits[o.bottom]);
    var r = concat(list, c.textures.uvNeutral);
    r.key = key; r.outfit = o; r.coverMask = mask;
    asmCache[key] = r;
    return r;
  }
  // só as células (faixas contíguas do índice) cuja máscara não bate com hide
  function cellsKeep(all, cells, hide) {
    var keep = [], off = 0, tot = 0, k;
    for (k = 0; k < cells.length; k++) {
      var cnt = cells[k][2] * 3;
      if ((cells[k][0] & hide) === 0) { keep.push(all.subarray(off, off + cnt)); tot += cnt; }
      off += cnt;
    }
    var out = new Uint16Array(tot); off = 0;
    keep.forEach(function (a) { out.set(a, off); off += a.length; });
    return out;
  }

  // junta as peças, só com os vértices usados
  function concat(list, uvN) {
    var n = 0, ni = 0, maps = [];
    list.forEach(function (e) {
      var m = e[0], ix = e[1], map = new Int32Array(m.n).fill(-1), cnt = 0;
      for (var i = 0; i < ix.length; i++) if (map[ix[i]] < 0) map[ix[i]] = cnt++;
      maps.push([map, cnt]); n += cnt; ni += ix.length;
    });
    var o = { n: n, position: new Float32Array(n * 3), normal: new Float32Array(n * 3), uv: new Float32Array(n * 2), skinIndex: new Uint8Array(n * 4),
      skinWeight: new Float32Array(n * 4), mat: new Uint8Array(n), slot: new Uint8Array(n), ao: new Float32Array(n), flags: new Uint8Array(n),
      index: n > 65535 ? new Uint32Array(ni) : new Uint16Array(ni) };
    var vo = 0, io = 0;
    list.forEach(function (e, li) {
      var m = e[0], ix = e[1], map = maps[li][0], i, v, k;
      for (v = 0; v < m.n; v++) {
        var d = map[v];
        if (d < 0) continue;
        d += vo;
        for (k = 0; k < 3; k++) { o.position[d * 3 + k] = m.position[v * 3 + k]; o.normal[d * 3 + k] = m.normal[v * 3 + k]; }
        if (m.uv && !e[2]) { o.uv[d * 2] = m.uv[v * 2]; o.uv[d * 2 + 1] = m.uv[v * 2 + 1]; } else { o.uv[d * 2] = uvN[0]; o.uv[d * 2 + 1] = uvN[1]; }
        for (k = 0; k < 4; k++) { o.skinIndex[d * 4 + k] = m.skinIndex[v * 4 + k]; o.skinWeight[d * 4 + k] = m.skinWeight[v * 4 + k]; }
        o.mat[d] = m.mat[v]; o.slot[d] = m.slot[v]; o.ao[d] = m.ao[v]; o.flags[d] = m.flags[v];
      }
      for (i = 0; i < ix.length; i++) o.index[io + i] = map[ix[i]] + vo;
      vo += maps[li][1]; io += ix.length;
    });
    return o;
  }

  function geometry(m) {
    var g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(m.position, 3));
    g.setAttribute('normal', new THREE.BufferAttribute(m.normal, 3));
    g.setAttribute('uv', new THREE.BufferAttribute(m.uv, 2));
    g.setAttribute('skinIndex', new THREE.BufferAttribute(m.skinIndex, 4));
    g.setAttribute('skinWeight', new THREE.BufferAttribute(m.skinWeight, 4));
    g.setAttribute('mat', new THREE.BufferAttribute(m.mat, 1));
    g.setIndex(new THREE.BufferAttribute(m.index, 1));
    return g;
  }

  var texCache = {};
  function texture(g, kind) {
    var key = g + '|' + kind;
    if (texCache[key]) return texCache[key];
    var c = char(g), src = c && c.textures[kind];
    if (!src) return null;
    var tex = new THREE.Texture();
    var img = new Image();
    img.onload = function () { tex.needsUpdate = true; };
    img.src = src;
    tex.image = img;
    tex.flipY = false;
    tex.encoding = kind === 'skin' ? THREE.sRGBEncoding : THREE.LinearEncoding;
    tex.anisotropy = 4;
    return (texCache[key] = tex);
  }

  EP.ModelData = {
    ok: function () { return !!(char('m') && char('f')); },
    char: char, part: part, hair: hair, garment: garment, index: index, coverMask: coverMask, normOutfit: normOutfit,
    assemble: assemble, geometry: geometry, texture: texture,
    _decodeVertexBuffer: MO.decodeVertexBuffer, _decodeIndexBuffer: MO.decodeIndexBuffer
  };
})(typeof window !== 'undefined' ? window.EP : globalThis.EP);
