// RunnerRig — o corredor (GDD §5): os personagens da Quaternius (CC0) "assados" para o jogo
// (dados/modelos/*.js, lidos por js/runner/ModelData.js): corpo com textura de pele tingível,
// roupas, tênis e cabelos de verdade, em três níveis de detalhe. Animado por 17 ossos: quadril,
// tronco, cabeça, braços, cotovelos, coxas, joelhos, pés e quatro molas de cabelo (rabo de cavalo e
// cabelo comprido). Uma malha só por corredor (uma chamada de desenho).
//
// Desempenho: a geometria de cada combinação (gênero + roupa + cabelo + nível de detalhe) é montada
// uma vez e compartilhada por todos; cada corredor só tem o seu material, com a paleta de cores num
// uniform (js/world/Materials.js). Os corredores da rua usam moldes mais leves quando longe (LOD).
//
// Medidas (comprimento da coxa e da canela, altura do tornozelo, sola do tênis, ombros, cabeça) vêm
// dos dados (ossos, âncoras e malhas), nada fixo aqui: dados regenerados entram sem mexer no código.
(function (EP) {
  'use strict';
  var U = EP.util, MD = EP.ModelData;
  // ciclos (2 passos) por segundo: 163 passos/min a 10 km/h, 182 a 20 km/h (como um corredor de verdade)
  var STRIDE = [[0, 0.85], [4, 0.9], [6, 1.02], [7.5, 1.3], [10, 1.36], [12, 1.4], [15, 1.45], [20, 1.52], [22, 1.55]];
  // fração do ciclo com o pé no chão: caminhando quase sempre, correndo cada vez menos
  var DUTY = [[4, 0.62], [6, 0.6], [7.5, 0.42], [10, 0.37], [15, 0.31], [20, 0.27], [24, 0.24]];
  // ossos do contrato (ESPEC-corredor §3) e o pai de cada um (a ordem e os pais de verdade vêm dos dados)
  var BONES = ['hips', 'torso', 'head', 'armL', 'elbowL', 'armR', 'elbowR', 'legL', 'kneeL', 'footL', 'legR', 'kneeR', 'footR',
    'pony', 'pony2', 'hairA', 'hairA2'];
  var PARENT = { torso: 'hips', head: 'torso', armL: 'torso', elbowL: 'armL', armR: 'torso', elbowR: 'armR', legL: 'hips', kneeL: 'legL',
    footL: 'kneeL', legR: 'hips', kneeR: 'legR', footR: 'kneeR', pony: 'head', pony2: 'pony', hairA: 'head', hairA2: 'hairA' };
  var RAISE_MAX = 2.2;   // braço erguido: além disso a manga sai do ombro (não há osso de clavícula; ESPEC §11.5)
  var PATTERN = { faixa: 1, listras: 2, degrade: 3 };

  // ---------------------------------------------------------------- medidas de cada gênero (dos dados)
  var RIGS = {};
  function vlen(v) { return Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]); }
  function rigOf(g) {
    if (RIGS[g]) return RIGS[g];
    var c = MD.char(g), B = c.bones, idx = {}, W = [], i;
    for (i = 0; i < B.names.length; i++) {
      idx[B.names[i]] = i;
      var p = B.parent[i], r = B.pos[i];
      W.push(p < 0 ? r.slice() : [W[p][0] + r[0], W[p][1] + r[1], W[p][2] + r[2]]);
    }
    var rel = function (n) { return B.pos[idx[n]]; }, at = function (n) { return W[idx[n]]; };
    var kn = rel('kneeL'), ft = rel('footL'), el = rel('elbowL'), wr = c.anchors.wristL.pos, ank = at('footL');
    var R = {
      g: g, c: c, idx: idx, world: W, slot: {}, fit: {}, spring: {},
      scale: (c.heightReal || c.space || 1.76) / (c.space || 1.76),   // espaço "1,76" → altura de verdade
      HIP_H: at('hips')[1],                    // quadril em repouso
      LEG_Y: rel('legL')[1],                   // articulação do quadril em relação ao osso do quadril
      THIGH: vlen(kn), SHIN: vlen(ft),
      // ângulos de repouso (frente = +) da coxa e da canela: o joelho e o tornozelo não ficam exatamente embaixo
      aT: Math.atan2(-kn[2], -kn[1]), aS: Math.atan2(-ft[2], -ft[1]),
      // braço em repouso já vem aberto (o punho não encosta no short) e o antebraço um pouco dobrado
      armAbd: Math.atan2(Math.abs(el[0]), -el[1]),
      foreFlex: Math.atan2(-wr[2], Math.sqrt(wr[0] * wr[0] + wr[1] * wr[1])),
      SOLE_Y: -ank[1]                          // sola (y = 0) no referencial do tornozelo
    };
    R.LEG_MAX = (R.THIGH + R.SHIN) * 0.999;
    // sola do tênis, medida na malha (pé esquerdo): apoio do calcanhar e até onde a sola é plana
    var sh = MD.part(g, 'shoes'), heel = -Infinity, flat = Infinity;
    if (sh) for (i = 0; i < sh.n; i++) {
      var x = sh.position[i * 3], y = sh.position[i * 3 + 1], z = sh.position[i * 3 + 2];
      if (x > 0) continue;
      if (z > heel) heel = z;
      if (y < 0.008 && z < flat) flat = z;
    }
    if (!isFinite(heel) || !isFinite(flat)) { var fl = c.measures.footLen || 0.3; heel = ank[2] + fl * 0.25; flat = ank[2] - fl * 0.66; }
    R.HEEL_F = ank[2] - heel + 0.006;   // frente = −z; o calcanhar é arredondado: apoio um pouco para dentro da borda
    R.TOE_F = ank[2] - flat;            // a curva da biqueira rola por cima do chão depois deste ponto
    c.slots.forEach(function (s, k) { R.slot[s] = k; });
    ['pony', 'pony2', 'hairA', 'hairA2'].forEach(function (n) { if (idx[n] !== undefined) R.spring[idx[n]] = 1; });
    // primeiro osso de mola (os de mola vêm por último): o shader não recolhe sob o boné o que balança
    R.sprMin = 255;
    for (i = B.names.length - 1; i >= 0 && R.spring[i]; i--) R.sprMin = i;
    return (RIGS[g] = R);
  }

  // Cabeça + cabelo de cada estilo, no referencial do osso da cabeça: o crânio dos dados (âncora skull)
  // mais a espessura do cabelo medida na malha (lados, alto, frente e trás; sem o rabo e sem o coque,
  // que ficam para fora do boné). Bonés, gorros e fones assentam por cima do cabelo; o que ainda passa
  // da copa (franja, mechas soltas, cachos) o shader do corpo recolhe para dentro dela (uCap, Materials).
  function robust(a) {
    if (a.length < 8) return 0;
    a.sort(function (x, y) { return x - y; });
    // corta só o que é claramente outra coisa (o coque, 4 cm ou mais para fora); a franja e os cachos contam
    var lim = Math.max(0.025, a[a.length >> 1] * 2.5), n = 0;
    while (n < a.length && a[n] <= lim) n++;
    return a[Math.floor((n - 1) * 0.97)];
  }
  // largura do rosto na altura dos olhos (malha do corpo, vértices da cabeça): onde ficam as dobradiças
  // dos óculos (frente) e por onde as hastes passam até a orelha
  function faceWidth(R, y, z0, z1) {
    var body = MD.part(R.g, 'body'), hb = R.idx.head, hw = R.world[hb], best = 0, i, k;
    if (!body) return 0;
    for (i = 0; i < body.n; i++) {
      var w = 0;
      for (k = 0; k < 4; k++) if (body.skinIndex[i * 4 + k] === hb) w += body.skinWeight[i * 4 + k];
      if (w < 0.5) continue;
      var py = body.position[i * 3 + 1] - hw[1], pz = body.position[i * 3 + 2] - hw[2];
      if (Math.abs(py - y) > 0.012 || pz < z0 || pz > z1) continue;
      best = Math.max(best, Math.abs(body.position[i * 3] - hw[0]));
    }
    return best;
  }
  function headFit(R, style) {
    var key = style || '-';
    if (R.fit[key]) return R.fit[key];
    var A = R.c.anchors, sk = A.skull, hw = R.world[R.idx[sk.bone || 'head']], h = style ? MD.hair(R.g, style) : null;
    var cx = hw[0] + sk.center[0], cy = hw[1] + sk.center[1], cz = hw[2] + sk.center[2];
    var rx = sk.radii[0], ry = sk.radii[1], rz = sk.radii[2], t = { top: [], side: [], front: [], back: [] }, i, k;
    var band = A.eyes.center[1] + 0.03, dyb = (band - sk.center[1]) / ry - 0.15;   // faixa do boné: meio da testa
    if (h) for (i = 0; i < h.n; i++) {
      var spring = false;
      for (k = 0; k < 4; k++) if (h.skinWeight[i * 4 + k] > 0.05 && R.spring[h.skinIndex[i * 4 + k]]) spring = true;
      if (spring) continue;
      var px = h.position[i * 3] - cx, py = h.position[i * 3 + 1] - cy, pz = h.position[i * 3 + 2] - cz;
      var dx = px / rx, dy = py / ry, dz = pz / rz, r = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (r < 1 || dy < dyb) continue;   // dentro do crânio ou abaixo da faixa do boné
      var th = Math.sqrt(px * px + py * py + pz * pz) * (1 - 1 / r), ax = Math.abs(dx), az = Math.abs(dz);
      if (dy > ax && dy > az) t.top.push(th); else if (ax > az) t.side.push(th); else (dz < 0 ? t.front : t.back).push(th);
    }
    var tf = robust(t.front) * 0.5, tb = robust(t.back), E = A.eyes, ear = A.ears.left, earX = Math.abs(ear[0]);
    var ez = E.front, fx = faceWidth(R, E.center[1], ez - 0.01, ez + 0.03), sx = faceWidth(R, E.center[1], ear[2] - 0.04, ear[2] - 0.022);
    return (R.fit[key] = {
      cx: sk.center[0], cz: sk.center[2] + (tb - tf) / 2, rx: rx + robust(t.side), rz: rz + (tf + tb) / 2,
      top: sk.center[1] + ry + robust(t.top),
      band: band,
      ey: E.center[1], ez: ez, sp: E.spacing, earX: earX, earY: ear[1], earZ: ear[2],
      faceX: fx > 0.02 ? Math.min(fx, earX) : earX * 0.8,   // têmporas (dobradiça dos óculos)
      sideX: sx > 0.02 ? Math.min(sx, earX) : earX * 0.92   // lado da cabeça logo à frente da orelha
    });
  }

  // Pulso: o contorno de verdade do antebraço na altura do relógio (vértices do corpo presos ao osso do
  // antebraço, no referencial da malha do relógio: y ao longo do antebraço). Guarda a "função suporte"
  // do contorno em WN direções: a pulseira passa por fora de todos os pontos, sem achatar nem girar errado.
  var WN = 20, WRIST_UP = 0.018;
  function wristFit(R, off) {
    var key = 'w' + off;
    if (R.fit[key]) return R.fit[key];
    var A = R.c.anchors.wristL, bi = R.idx[A.bone || 'elbowL'], eb = R.world[bi], body = MD.part(R.g, 'body');
    var d = new THREE.Vector3().fromArray(A.pos).normalize();
    var C = new THREE.Vector3().fromArray(A.pos).addScaledVector(d, -WRIST_UP - off).add(new THREE.Vector3().fromArray(eb));
    var q = new THREE.Quaternion().setFromUnitVectors(_up, d.clone().negate()).invert(), v = new THREE.Vector3(), pts = [], i, k;
    // vértices no anel e também onde as arestas dos triângulos cruzam as bordas do anel (a malha do pulso é
    // esparsa: um triângulo comprido até a mão passa pela borda longe de qualquer vértice)
    var ix = body && MD.index(body, 0), L = body ? new Float32Array(body.n * 3) : null, ok = body ? new Uint8Array(body.n) : null, hh = 0.015;
    if (body) for (i = 0; i < body.n; i++) {
      var w = 0;
      for (k = 0; k < 4; k++) if (body.skinIndex[i * 4 + k] === bi) w += body.skinWeight[i * 4 + k];
      if (w < 0.5) continue;
      v.fromArray(body.position, i * 3).sub(C).applyQuaternion(q);
      if (v.x * v.x + v.z * v.z > 0.0064) continue;
      ok[i] = 1; L[i * 3] = v.x; L[i * 3 + 1] = v.y; L[i * 3 + 2] = v.z;
      if (Math.abs(v.y) <= hh) pts.push(v.x, v.z);
    }
    if (ix) for (i = 0; i < ix.length; i += 3) {
      for (k = 0; k < 3; k++) {
        var a = ix[i + k], b = ix[i + (k + 1) % 3];
        if (!ok[a] || !ok[b]) continue;
        var ya = L[a * 3 + 1], yb = L[b * 3 + 1];
        [-hh, hh].forEach(function (yp) {
          if ((ya - yp) * (yb - yp) >= 0) return;
          var t = (yp - ya) / (yb - ya);
          pts.push(L[a * 3] + (L[b * 3] - L[a * 3]) * t, L[a * 3 + 2] + (L[b * 3 + 2] - L[a * 3 + 2]) * t);
        });
      }
    }
    var x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity, hs = [];
    for (i = 0; i < pts.length; i += 2) { x0 = Math.min(x0, pts[i]); x1 = Math.max(x1, pts[i]); z0 = Math.min(z0, pts[i + 1]); z1 = Math.max(z1, pts[i + 1]); }
    var ccx = pts.length ? (x0 + x1) / 2 : 0, ccz = pts.length ? (z0 + z1) / 2 : 0;
    for (k = 0; k < WN; k++) {
      var a = k / WN * Math.PI * 2, ux = Math.cos(a), uz = Math.sin(a), m = pts.length < 16 ? A.radius : 0;
      for (i = 0; i < pts.length; i += 2) m = Math.max(m, (pts[i] - ccx) * ux + (pts[i + 1] - ccz) * uz);
      hs.push(m);
    }
    return (R.fit[key] = { cx: ccx, cz: ccz, h: hs, y: off });
  }

  // ---------------------------------------------------------------- geometria compartilhada
  // Uma por combinação, usada por todos os corredores com aquela roupa. Os moldes da rua (warmNpcs) ficam
  // presos (pinned): são usados o tempo todo. Os outros (o que o jogador experimenta na criação e na loja)
  // não enchem a placa de vídeo: passando de GEO_MAX soltos, sai o usado há mais tempo que nenhum
  // corredor está mostrando.
  var GEO = {}, GEO_N = 0, GEO_MAX = 12, geoClock = 0, ALL = [];
  function geoFor(g, outfit, lod, pin) {
    var m = MD.assemble(g, outfit, lod), geo = GEO[m.key];
    if (!geo) {
      geo = MD.geometry(m);
      geo.setAttribute('slot', new THREE.BufferAttribute(m.slot, 1));
      geo.setAttribute('aov', new THREE.BufferAttribute(m.ao, 1));
      GEO[m.key] = geo;
      GEO_N++;
    }
    if (pin && !geo.userData.pinned) { geo.userData.pinned = true; GEO_N--; }
    geo.userData.used = ++geoClock;
    if (GEO_N > GEO_MAX) geoEvict(geo);
    return geo;
  }
  function geoEvict(keep) {
    var best = null, k, i;
    search: for (k in GEO) {
      var gk = GEO[k];
      if (gk === keep || gk.userData.pinned) continue;
      for (i = 0; i < ALL.length; i++) if (ALL[i].mesh.geometry === gk) continue search;
      if (!best || gk.userData.used < GEO[best].userData.used) best = k;
    }
    if (best) { GEO[best].dispose(); delete GEO[best]; GEO_N--; }
  }

  // roupa do corredor: tipos do equipamento (ou da criação) → peças dos dados. Peça que os dados não têm
  // (dados parciais, durante uma regeração) cai para a primeira que existe: nunca sobra buraco no corpo.
  var TOP_ALT = ['camiseta', 'regata', 'top', 'manga-longa', 'corta-vento'], BOTTOM_ALT = ['short', 'legging', 'bermuda', 'saia-short'];
  var HAIR_ALT = ['curto', 'rabo', 'raspado', 'coque', 'cacheado', 'longo'];
  function have(fn, g, want, alt) {
    if (!MD || !MD.ok() || fn(g, want)) return want;
    for (var i = 0; i < alt.length; i++) if (fn(g, alt[i])) return alt[i];
    return want;
  }
  function outfitOf(app) {
    var gear = app.gear || {}, f = app.gender === 'f', g = f ? 'f' : 'm';
    var top = (gear.shirt && gear.shirt.kind) || app.shirtKind || (f ? 'top' : 'camiseta');
    var bottom = (gear.shorts && gear.shorts.kind) || app.shortsKind || (f ? 'legging' : 'short');
    if (!f && bottom === 'saia-short') bottom = 'short';   // corpo masculino: short + saia por cima (acessório)
    if (!f && top === 'top') top = 'regata';
    var o = { top: top, bottom: bottom, hair: app.hairStyle || (f ? 'rabo' : 'curto') };
    if (MD && MD.ok()) {
      o.top = have(MD.garment, g, o.top, [f ? 'top' : 'camiseta'].concat(TOP_ALT));
      o.bottom = have(MD.garment, g, o.bottom, [f ? 'legging' : 'short'].concat(BOTTOM_ALT));
      o.hair = have(MD.hair, g, o.hair, [f ? 'rabo' : 'curto'].concat(HAIR_ALT));
    }
    if (app.socks !== undefined) o.socks = !!app.socks;
    return o;
  }
  function outfitKey(g, o) { return g + '|' + o.top + '|' + o.bottom + '|' + o.hair + '|' + o.socks; }

  // ---------------------------------------------------------------- equipamentos
  // Acessórios: malhas com a cor já pintada, presas a um osso e guardadas por tipo + cores + cabeça
  // (vários corredores com o mesmo boné usam a mesma geometria). Medidas das âncoras dos dados.
  // Os da rua são montados aos poucos na abertura (warmNpcs): nada é construído no meio da corrida.
  var accCache = {}, DOME = null, SHAPES = {};
  function dome() {   // meia esfera (raio 0,5, base em y = 0): copa de boné e gorro
    if (!DOME) {
      var g = new THREE.SphereGeometry(0.5, 20, 8, 0, Math.PI * 2, 0, Math.PI / 2).toNonIndexed();
      DOME = { pos: g.attributes.position.array, nor: g.attributes.normal.array, uv: null };
    }
    return DOME;
  }
  function cyl20() {  // cilindro fechado de 20 lados (barra do gorro: mesma divisão da copa)
    if (!SHAPES.cyl20) {
      var g = new THREE.CylinderGeometry(0.5, 0.5, 1, 20).toNonIndexed();
      SHAPES.cyl20 = { pos: g.attributes.position.array, nor: g.attributes.normal.array, uv: null };
    }
    return SHAPES.cyl20;
  }

  // formas feitas aqui, já no tamanho final (addUnit com escala 1). Cada vértice: [x, y, z, nx, ny, nz];
  // a ordem do triângulo é acertada pela normal (sempre de frente para fora)
  function Shape() { this.pos = []; this.nor = []; }
  Shape.prototype.tri = function (a, b, c) {
    var ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    var fx = uy * vz - uz * vy, fy = uz * vx - ux * vz, fz = ux * vy - uy * vx;
    if (fx * (a[3] + b[3] + c[3]) + fy * (a[4] + b[4] + c[4]) + fz * (a[5] + b[5] + c[5]) < 0) { var t = b; b = c; c = t; }
    for (var p = [a, b, c], i = 0; i < 3; i++) { this.pos.push(p[i][0], p[i][1], p[i][2]); this.nor.push(p[i][3], p[i][4], p[i][5]); }
  };
  Shape.prototype.quad = function (a, b, c, d) { this.tri(a, b, c); this.tri(a, c, d); };
  Shape.prototype.unit = function () { return { pos: new Float32Array(this.pos), nor: new Float32Array(this.nor), uv: null }; };
  // tubo de raio r por uma linha de pontos (fechado: volta ao primeiro); up = normal do plano da linha
  function tube(pts, r, around, closed, up) {
    var sh = new Shape(), n = pts.length, rings = [], i, k;
    for (i = 0; i < n; i++) {
      var a = pts[closed ? (i - 1 + n) % n : Math.max(0, i - 1)], b = pts[closed ? (i + 1) % n : Math.min(n - 1, i + 1)];
      var t = _v.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]).normalize(), u = _v2.set(up[0], up[1], up[2]).cross(t).normalize();
      var w = _v3.copy(t).cross(u), ring = [];
      for (k = 0; k < around; k++) {
        var an = k / around * Math.PI * 2, c = Math.cos(an), s = Math.sin(an);
        var nx = u.x * c + w.x * s, ny = u.y * c + w.y * s, nz = u.z * c + w.z * s;
        ring.push([pts[i][0] + nx * r, pts[i][1] + ny * r, pts[i][2] + nz * r, nx, ny, nz]);
      }
      rings.push(ring);
    }
    for (i = 0; i < (closed ? n : n - 1); i++) {
      var A = rings[i], B = rings[(i + 1) % n];
      for (k = 0; k < around; k++) sh.quad(A[k], B[k], B[(k + 1) % around], A[(k + 1) % around]);
    }
    return sh.unit();
  }
  function arc(cx, cy, cz, ax, ay, az, n) {   // meia elipse: (cx + cos·ax, cy + sin·ay, cz + sin·az), ângulo 0..π
    var pts = [];
    for (var j = 0; j <= n; j++) { var t = Math.PI * j / n; pts.push([cx + Math.cos(t) * ax, cy + Math.sin(t) * ay, cz + Math.sin(t) * az]); }
    return pts;
  }
  // anel com o contorno do pulso (função suporte W, folga m), altura hgt, espessura e
  function band(W, m, hgt, e, y) {
    var sh = new Shape(), out = [], inn = [], k, y0 = y - hgt / 2, y1 = y + hgt / 2;
    for (k = 0; k < WN; k++) {
      // vértice k entre as retas suporte k e k+1 (fica por fora do contorno inteiro)
      var a0 = k / WN * Math.PI * 2, a1 = (k + 1) / WN * Math.PI * 2, h0 = W.h[k] + m, h1 = W.h[(k + 1) % WN] + m;
      var c0 = Math.cos(a0), s0 = Math.sin(a0), c1 = Math.cos(a1), s1 = Math.sin(a1), det = c0 * s1 - s0 * c1;
      var x = (h0 * s1 - h1 * s0) / det, z = (c0 * h1 - c1 * h0) / det, l = Math.sqrt(x * x + z * z) || 1;
      out.push([W.cx + x, W.cz + z, x / l, z / l]);
      inn.push([W.cx + x - x / l * e, W.cz + z - z / l * e, -x / l, -z / l]);
    }
    for (k = 0; k < WN; k++) {
      var o0 = out[k], o1 = out[(k + 1) % WN], i0 = inn[k], i1 = inn[(k + 1) % WN];
      sh.quad([o0[0], y0, o0[1], o0[2], 0, o0[3]], [o1[0], y0, o1[1], o1[2], 0, o1[3]], [o1[0], y1, o1[1], o1[2], 0, o1[3]], [o0[0], y1, o0[1], o0[2], 0, o0[3]]);
      sh.quad([i0[0], y0, i0[1], i0[2], 0, i0[3]], [i1[0], y0, i1[1], i1[2], 0, i1[3]], [i1[0], y1, i1[1], i1[2], 0, i1[3]], [i0[0], y1, i0[1], i0[2], 0, i0[3]]);
      sh.quad([o0[0], y1, o0[1], 0, 1, 0], [o1[0], y1, o1[1], 0, 1, 0], [i1[0], y1, i1[1], 0, 1, 0], [i0[0], y1, i0[1], 0, 1, 0]);
      sh.quad([o0[0], y0, o0[1], 0, -1, 0], [o1[0], y0, o1[1], 0, -1, 0], [i1[0], y0, i1[1], 0, -1, 0], [i0[0], y0, i0[1], 0, -1, 0]);
    }
    return { unit: sh.unit(), out: out };
  }
  // saia (rodada, aberta embaixo): anéis elípticos [y, rx, rz, cz] de cima para baixo, com as duas faces
  function skirt(rings, n) {
    var sh = new Shape(), R = [], i, k;
    for (i = 0; i < rings.length; i++) {
      var g = rings[i], row = [];
      for (k = 0; k < n; k++) {
        var a = k / n * Math.PI * 2, c = Math.cos(a), s = Math.sin(a), nx = c / g[1], nz = s / g[2], l = Math.sqrt(nx * nx + nz * nz);
        row.push([c * g[1], g[0], g[3] + s * g[2], nx / l, 0, nz / l]);
      }
      R.push(row);
    }
    var flip = function (p, e) { return [p[0] - p[3] * e, p[1], p[2] - p[5] * e, -p[3], -p[4], -p[5]]; };
    for (i = 0; i + 1 < R.length; i++) {
      for (k = 0; k < n; k++) {
        var a0 = R[i][k], a1 = R[i][(k + 1) % n], b0 = R[i + 1][k], b1 = R[i + 1][(k + 1) % n];
        sh.quad(a0, b0, b1, a1);
        sh.quad(flip(a0, 0.002), flip(b0, 0.002), flip(b1, 0.002), flip(a1, 0.002));
      }
    }
    return sh.unit();
  }

  var ACC = {
    head: function (gb, v, H) {
      var c = v.color, a = v.accent || v.color, yb = H.band, rx = H.rx + 0.006, rz = H.rz + 0.006, front = H.cz - rz;
      if (v.kind === 'faixa') {
        gb.add('cyl10s', 0, yb + 0.012, H.cz, rx * 2, 0.045, rz * 2, c);
        gb.add('cyl10s', 0, yb + 0.012, H.cz, rx * 2 + 0.003, 0.012, rz * 2 + 0.003, a);
        return null;
      }
      if (v.kind === 'viseira') {
        gb.add('cyl10s', 0, yb + 0.014, H.cz, rx * 2, 0.04, rz * 2, c);
        gb.add('sph16', 0, yb + 0.004, front - 0.045, 0.17, 0.02, 0.13, a, 0, -0.18);
        return null;
      }
      if (v.kind === 'gorro') {
        var gy = yb - 0.012, gh = H.top - gy + 0.014, dx = rx + 0.007, dz = rz + 0.007;
        gb.addUnit(dome(), 0, gy, H.cz, dx * 2, gh * 2, dz * 2, c);
        // barra: 20 lados como a copa e por fora dela até no meio de cada face (cos 9° ≈ 0,988)
        gb.addUnit(cyl20(), 0, gy + 0.02, H.cz, dx * 2 / 0.985 + 0.01, 0.045, dz * 2 / 0.985 + 0.01, a);
        gb.add('icoS', 0, H.top + 0.03, H.cz + 0.01, 0.065, 0.065, 0.065, a);
        return { y: gy, rx: dx, ry: gh, rz: dz, cz: H.cz };
      }
      if (v.kind === 'bandana') {
        var bh = H.top - yb + 0.008;
        gb.addUnit(dome(), 0, yb, H.cz, rx * 2, bh * 2, rz * 2, c);
        var bz = H.cz + rz - 0.002;
        gb.add('sph8', 0, yb + 0.012, bz, 0.05, 0.045, 0.045, a);
        gb.add('sph8', 0.02, yb - 0.035, bz + 0.012, 0.026, 0.08, 0.018, c, 0, 0.3, 0.25);
        gb.add('sph8', -0.02, yb - 0.035, bz + 0.012, 0.026, 0.08, 0.018, c, 0, 0.3, -0.25);
        return { y: yb, rx: rx, ry: bh, rz: rz, cz: H.cz };
      }
      // bonés: copa sobre a cabeça + cabelo, botão e aba
      var ch = H.top - yb + 0.01, ly = 0.032, lz = H.cz - rz * Math.sqrt(1 - (ly / ch) * (ly / ch));
      gb.addUnit(dome(), 0, yb, H.cz, rx * 2, ch * 2, rz * 2, c);
      gb.add('sph8', 0, yb + ch * 0.99, H.cz, 0.026, 0.014, 0.026, a);
      if (v.kind === 'bone-aba-reta') gb.add('sph16', 0, yb + 0.004, front - 0.05, 0.19, 0.016, 0.15, a, 0, -0.04);
      else {
        gb.add('sph16', 0, yb - 0.002, front - 0.035, 0.178, 0.022, 0.135, c, 0, -0.22);
        gb.add('sph8', 0, yb + ly, lz - 0.001, 0.05, 0.026, 0.01, a, 0, -0.35);   // escudo na frente da copa
      }
      return { y: yb, rx: rx, ry: ch, rz: rz, cz: H.cz };
    },
    eyes: function (gb, v, H) {
      var c = v.color, l = v.lens || '#2a2f3a', y = H.ey + 0.002, z = H.ez - 0.012;
      if (v.kind === 'oculos-esporte') {   // lente única envolvente
        var hw = H.earX + 0.004, rz = 0.045;
        gb.add('sph16', 0, y, z + rz - 0.004, hw * 2, 0.05, rz * 2, l);
        // armação no alto da lente, rente a ela (a lente é um elipsoide: nessa altura ela tem ~73% da largura)
        gb.add('sph16', 0, y + 0.017, z + rz - 0.004, hw * 1.46 + 0.006, 0.012, rz * 1.46 + 0.006, c);
        return null;
      }
      var big = v.kind === 'oculos-sol', w = big ? 0.048 : 0.042, h = big ? 0.038 : 0.034, lx = H.sp / 2 + 0.002;
      var clear = v.kind === 'oculos' && lum(lin(l, _x)) > 0.45;   // grau com lente clara: só a armação (os olhos aparecem)
      // dobradiça logo depois da armação, encostada na têmpora; haste para trás, rente à cabeça, até a orelha
      var rimX = lx + w / 2 + 0.005, hx = Math.max(rimX, H.faceX + 0.004), ex = Math.max(H.sideX + 0.003, hx - 0.012);
      var ez = H.earZ + 0.005, ty = y + 0.008, tl = Math.sqrt((ez - z) * (ez - z) + (ex - hx) * (ex - hx));
      [-1, 1].forEach(function (sd) {
        if (clear) {   // aro fechado de verdade (aparece de frente, de lado e por trás)
          var pts = [];
          for (var j = 0; j < 16; j++) { var t = j / 16 * Math.PI * 2; pts.push([sd * lx + Math.cos(t) * (w / 2 + 0.003), y + Math.sin(t) * (h / 2 + 0.003), z]); }
          gb.addUnit(tube(pts, 0.0032, 5, true, [0, 0, 1]), 0, 0, 0, 1, 1, 1, c);
        } else {
          gb.add('cyl10', sd * lx, y, z, w + 0.01, 0.01, h + 0.01, c, 0, Math.PI / 2);
          gb.add('sph8', sd * lx, y, z - 0.004, w, h, 0.01, l);
        }
        if (hx > rimX) gb.add('box', sd * (rimX + hx) / 2 - sd * 0.002, ty, z + 0.002, hx - rimX + 0.006, 0.008, 0.007, c);
        gb.add('box', sd * (hx + ex) / 2, ty, (z + ez) / 2, 0.006, 0.008, tl, c, sd * Math.atan2(ex - hx, ez - z));
      });
      gb.add('box', 0, ty, z, H.sp - w * 0.9, 0.007, 0.007, c);
      return null;
    },
    ears: function (gb, v, H) {
      var c = v.color, a = v.accent || v.color, y = H.earY, z = H.earZ;
      if (v.kind === 'fone-sem-fio') {
        [-1, 1].forEach(function (sd) {
          var x = sd * (H.earX + 0.006);
          gb.add('sph8', x, y, z, 0.032, 0.032, 0.032, c);
          gb.add('cyl10', x + sd * 0.002, y - 0.035, z - 0.006, 0.012, 0.05, 0.012, c);
          gb.add('sph8', x + sd * 0.01, y + 0.002, z, 0.012, 0.012, 0.012, a);
        });
        return null;
      }
      var sport = v.kind === 'fone-esporte', cup = sport ? 0.055 : 0.078, cx = Math.max(H.earX, H.rx * 0.96) + 0.018;
      [-1, 1].forEach(function (sd) {
        gb.add('cyl10', sd * cx, y, z, cup, 0.032, cup, c, 0, 0, Math.PI / 2);
        gb.add('cyl10', sd * (cx + 0.018), y, z, cup * 0.72, 0.008, cup * 0.72, a, 0, 0, Math.PI / 2);
      });
      if (sport) {   // arco atrás da nuca (um tubo só, ~200 triângulos)
        var bz = Math.max(H.cz + H.rz, z + 0.06) + 0.012;
        gb.addUnit(tube(arc(0, y - 0.03, z, cx, 0, bz - z, 14), 0.011, 6, false, [0, 1, 0]), 0, 0, 0, 1, 1, 1, c);
        return null;
      }
      var ry = H.top + 0.016 - y;   // arco por cima do cabelo
      gb.addUnit(tube(arc(0, y + 0.01, z, cx, ry, 0, 18), 0.012, 6, false, [0, 0, 1]), 0, 0, 0, 1, 1, 1, c);
      return null;
    },
    // relógio: no referencial da malha do relógio (y ao longo do antebraço, ver _bind), com o contorno
    // medido do pulso (wristFit): a pulseira passa por fora da pele em toda a volta
    wrist: function (gb, v, H) {
      var c = v.color, a = v.accent || c, W = H.w, b = band(W, 0.0035, 0.028, 0.003, 0), o = b.out[WN >> 1];   // o[]: lado de fora (−x)
      gb.addUnit(b.unit, 0, 0, 0, 1, 1, 1, c);
      if (v.kind === 'pulseira') { gb.addUnit(band(H.w2, 0.0035, 0.012, 0.0025, 0.03).unit, 0, 0, 0, 1, 1, 1, a); return null; }
      if (v.kind === 'smartwatch') gb.add('box', o[0] - 0.003, 0, o[1], 0.009, 0.04, 0.032, a);
      else gb.add('cyl10', o[0] - 0.004, 0, o[1], 0.04, 0.01, 0.04, a, 0, 0, Math.PI / 2);
      return null;
    },
    // saia por cima do short (corpo masculino: os dados só têm a saia-short no feminino)
    skirt: function (gb, v, H) {
      var c = v.color, a = v.accent || c, S = H.s;
      gb.addUnit(skirt(S, 20), 0, 0, 0, 1, 1, 1, c);
      var e = S[S.length - 1];
      gb.addUnit(skirt([[e[0] + 0.012, e[1] + 0.003, e[2] + 0.003, e[3]], [e[0] - 0.002, e[1] + 0.004, e[2] + 0.004, e[3]]], 20), 0, 0, 0, 1, 1, 1, a);
      return null;
    },
    flag: function (gb, v, H) {
      // corredor-guia (pacer): bandeirinha presa nas costas, acima da cabeça
      var x = 0.07, z = H.backZ + 0.035, y0 = H.backY - 0.06, y1 = H.headTop + 0.32;
      gb.add('cyl10', x, (y0 + y1) / 2, z, 0.016, y1 - y0, 0.016, '#f4f1ea');
      gb.add('box', x + 0.13, y1 - 0.14, z, 0.26, 0.17, 0.008, '#ff5a3d');
      gb.add('box', x + 0.13, y1 - 0.14, z + 0.005, 0.15, 0.05, 0.008, '#ffffff');
      gb.add('sph8', x, y1 + 0.01, z, 0.04, 0.04, 0.04, '#ffd23f');
      return null;
    }
  };
  var ACC_BONE = { head: 'head', eyes: 'head', ears: 'head', wrist: 'elbowL', skirt: 'hips', flag: 'torso' };
  var LOD2_HIDE = { eyes: 1, ears: 1, wrist: 1 };   // longe: só o boné (o resto nem aparece e custa desenho)

  // saia masculina: do cós (âncora waist) até um palmo abaixo, por fora do short medido na malha
  function skirtFit(R) {
    if (R.fit.skirt) return R.fit.skirt;
    var W = R.c.anchors.waist, hb = R.idx[W.bone || 'hips'], hw = R.world[hb], sh = MD.garment(R.g, 'short') || MD.part(R.g, 'body');
    var y0 = W.y, y1 = W.y - 0.2, mx = W.rx, mz = W.rz, i;
    if (sh) for (i = 0; i < sh.n; i++) {
      var py = sh.position[i * 3 + 1] - hw[1];
      if (py > y0 || py < y1) continue;
      mx = Math.max(mx, Math.abs(sh.position[i * 3] - hw[0]));
      mz = Math.max(mz, Math.abs(sh.position[i * 3 + 2] - hw[2] - W.cz));
    }
    // cós por dentro da camiseta, abre por fora do short e vai até o meio da coxa (como a saia dos dados)
    return (R.fit.skirt = { s: [[W.y, W.rx + 0.004, W.rz + 0.004, W.cz], [W.y - 0.09, mx + 0.018, mz + 0.018, W.cz + 0.004],
      [W.y - 0.28, mx * 1.24 + 0.035, mz * 1.4 + 0.04, W.cz + 0.01]] });
  }

  function accKey(slot, v, R, style) {
    return slot + '|' + (v.kind || '') + '|' + (v.color || '') + '|' + (v.accent || '') + '|' + (v.lens || '') + '|' + R.g + '|' +
      (slot === 'wrist' || slot === 'flag' || slot === 'skirt' ? '' : style);
  }
  function accGeo(slot, v, R, style) {
    var key = accKey(slot, v, R, style);
    if (!accCache[key]) {
      var A = R.c.anchors, gb = new EP.GeoBuilder(), H;
      if (slot === 'wrist') H = { w: wristFit(R, 0), w2: wristFit(R, 0.03) };
      else if (slot === 'skirt') H = skirtFit(R);
      else if (slot === 'flag') {   // costas no referencial do tronco; topo da cabeça idem
        var tw = R.world[R.idx[A.back.bone || 'torso']];
        H = { backY: A.back.pos[1], backZ: A.back.pos[2], headTop: R.c.measures.headTop - tw[1] };
      } else H = headFit(R, style);
      var cap = ACC[slot](gb, v, H);
      accCache[key] = gb.build();
      accCache[key].userData.cap = cap || null;   // copa (boné, gorro, bandana): o cabelo de baixo é recolhido
    }
    return accCache[key];
  }

  // ---------------------------------------------------------------- corredor
  function RunnerRig() {
    var M = EP.Materials, self = this;
    this.root = new THREE.Group();
    this.body = new THREE.Group();          // leva a escala (altura)
    this.root.add(this.body);
    this.bones = [];
    BONES.forEach(function (n) { self._bone(n); });
    BONES.forEach(function (n) { (PARENT[n] ? self[PARENT[n]] : self.body).add(self[n]); });
    this.skeleton = new THREE.Skeleton(this.bones.slice());
    this.mat = M.runnerBody();
    this.mesh = new THREE.SkinnedMesh(new THREE.BufferGeometry(), this.mat);
    this.mesh.frustumCulled = false;
    this.mesh.castShadow = true;
    this.body.add(this.mesh);
    this.mesh.bind(this.skeleton, new THREE.Matrix4());
    // acessórios (boné, óculos, fone, relógio, bandeira do pacer, saia por cima do short no corpo masculino)
    this.acc = {};
    Object.keys(ACC_BONE).forEach(function (a) {
      var m = new THREE.Mesh(new THREE.BufferGeometry(), M.runner);
      m.frustumCulled = false; m.visible = false; m.castShadow = true;
      self[ACC_BONE[a]].add(m);
      self.acc[a] = m;
    });
    if (!DISC) DISC = new THREE.CircleGeometry(0.42, 20).rotateX(-Math.PI / 2);
    this.shadow = new THREE.Mesh(DISC, M.shadow);
    this.shadow.position.y = 0.03;
    this.shadow.frustumCulled = false;
    this.shadow.renderOrder = 1;
    this.root.add(this.shadow);
    this.phase = Math.random() * Math.PI * 2;
    this.idleT = Math.random() * 10;
    this.onStep = null;   // chamado a cada pisada (som de passos)
    this.lod = 0;
    this.R = null;
    this._bindKey = '';
    this._stance = 0;
    this._vx = 0;
    this._yaw = 0;
    this._hs = { x1: 0, vx1: 0, z1: 0, vz1: 0, x2: 0, vx2: 0, z2: 0, vz2: 0 };   // molas do cabelo
    this._accOn = {};
    this._soon = 0;
    ALL.push(this);
  }
  var DISC = null;
  var P = RunnerRig.prototype;

  P._bone = function (name) {
    var b = new THREE.Bone();
    b.name = name;
    this.bones.push(b);
    this[name] = b;
    return b;
  };

  // pose de repouso do gênero (ossos dos dados) e "amarra" a malha aos ossos
  P._bind = function (g) {
    var R = rigOf(g), B = R.c.bones, list = [], i;
    for (i = 0; i < B.names.length; i++) {
      var b = this[B.names[i]] || this._bone(B.names[i]), p = B.parent[i], par = p < 0 ? this.body : list[p];
      if (b.parent !== par) par.add(b);
      b.position.fromArray(B.pos[i]); b.rotation.set(0, 0, 0); b.scale.set(1, 1, 1);
      list.push(b);
    }
    var rx = this.root.rotation.x, ry = this.root.rotation.y, rz = this.root.rotation.z, px = this.root.position.x, py = this.root.position.y, pz = this.root.position.z;
    this.root.rotation.set(0, 0, 0); this.root.position.set(0, 0, 0); this.body.scale.set(1, 1, 1);
    this.root.updateMatrixWorld(true);
    var same = this.skeleton.bones.length === list.length && this.skeleton.bones.every(function (bb, k) { return bb === list[k]; });
    if (same) this.skeleton.calculateInverses();
    else { this.skeleton.dispose(); this.skeleton = new THREE.Skeleton(list); }
    this.mesh.bind(this.skeleton, this.mesh.matrixWorld);
    this.root.rotation.set(rx, ry, rz); this.root.position.set(px, py, pz);
    // relógio no pulso: y da malha ao longo do antebraço (para o cotovelo), um pouco acima da articulação
    var W = R.c.anchors.wristL, wb = this[W.bone] || this.elbowL, wm = this.acc.wrist, d = _v.fromArray(W.pos), L = d.length() || 1;
    if (wm.parent !== wb) wb.add(wm);
    d.multiplyScalar(1 / L);
    wm.position.fromArray(W.pos).addScaledVector(d, -WRIST_UP);
    wm.quaternion.setFromUnitVectors(_up, d.negate());
    var bk = this[R.c.anchors.back.bone] || this.torso;
    if (this.acc.flag.parent !== bk) bk.add(this.acc.flag);
    this._bindKey = g;
    this.R = R;
    var hs = this._hs;
    hs.x1 = hs.vx1 = hs.z1 = hs.vz1 = hs.x2 = hs.vx2 = hs.z2 = hs.vz2 = 0;
  };
  var _v = new THREE.Vector3(), _v2 = new THREE.Vector3(), _v3 = new THREE.Vector3(), _up = new THREE.Vector3(0, 1, 0);

  // app: cores já resolvidas { gender, skin, hairStyle, hair, shirt, shorts, shoes, gear, pacer, shirtKind, shortsKind,
  //   shoeAccent, shirtAccent, shortsAccent, socks, socksColor, hairTie } · gear: visual de cada espaço ({ kind, color, accent, pattern, lens })
  P.setAppearance = function (app) {
    if (this._soon) { clearTimeout(this._soon); this._soon = 0; }
    if (!MD || !MD.ok()) return;   // sem os dados dos corredores não há o que mostrar
    var g = app.gender === 'f' ? 'f' : 'm', gear = app.gear || {}, self = this;
    if (this._bindKey !== g) this._bind(g);
    var R = this.R;
    this.app = app;
    this.outfit = outfitOf(app);
    this.body.scale.setScalar(R.scale);
    // textura de pele do gênero (o programa do material não muda: só a imagem)
    var mat = this.mat, skin = MD.texture(g, 'skin');
    if (mat.map !== skin) mat.map = skin;
    mat.color.setScalar(skin ? 2 : 1);   // textura = pele ÷ média × 0,5 (sem textura: só a paleta)
    if (!mat.lite) { var nm = MD.texture(g, 'normal'); if (mat.normalMap !== nm) mat.normalMap = nm; }
    this._paint();
    this.mesh.geometry = geoFor(g, this.outfit, this.lod);
    // acessórios
    var style = this.outfit.hair, on = this._accOn;
    var setAcc = function (name, v) {
      on[name] = !!v;
      if (v) self.acc[name].geometry = accGeo(name, v, R, style);
    };
    setAcc('head', gear.head);
    setAcc('eyes', gear.eyes);
    setAcc('ears', gear.ears);
    setAcc('wrist', gear.wrist);
    setAcc('flag', app.pacer ? { kind: 'flag' } : null);
    // saia-short no corpo masculino: saia por cima do short (no feminino ela já é roupa dos dados)
    var sv = gear.shorts || {}, sk = g === 'm' && (sv.kind || app.shortsKind) === 'saia-short';
    setAcc('skirt', sk ? { kind: 'saia', color: app.shorts, accent: sv.accent || app.shortsAccent } : null);
    this._accVis();
    // boné, gorro ou bandana: o cabelo que passaria da copa é recolhido para dentro dela (no shader, em
    // repouso: o osso da cabeça leva os dois juntos)
    var cap = on.head && this.acc.head.geometry.userData.cap, u = mat.runnerU;
    if (cap) {
      var hw = R.world[R.idx.head];
      u.uCapC.value.set(hw[0], hw[1] + cap.y, hw[2] + cap.cz, 1);
      u.uCapR.value.set(cap.rx, cap.ry, cap.rz, R.sprMin);
    } else u.uCapC.value.w = 0;
  };
  // visibilidade dos acessórios: os equipados, menos os miúdos quando o corredor está longe (LOD2)
  P._accVis = function () {
    for (var a in this.acc) this.acc[a].visible = !!this._accOn[a] && !(this.lod >= 2 && LOD2_HIDE[a]);
  };
  // como setAppearance, mas uma troca de roupa ou de cabelo espera um pouco (criação e equipamentos):
  // clicar em vários cabelos seguidos não monta (e guarda) o molde completo de cada um no caminho
  P.setAppearanceSoon = function (app, ms) {
    var self = this, g = app.gender === 'f' ? 'f' : 'm';
    if (this._soon) { clearTimeout(this._soon); this._soon = 0; }
    if (!this.app || !this.R || !MD || !MD.ok() || outfitKey(g, outfitOf(app)) === outfitKey(this.R.g, this.outfit)) return this.setAppearance(app);
    this._soon = setTimeout(function () { self._soon = 0; self.setAppearance(app); }, ms === undefined ? 160 : ms);
  };

  var _w = new THREE.Color(1, 1, 1), _x = new THREE.Color();
  function lin(hex, out) { return out.set(hex).convertSRGBToLinear(); }
  function lum(c) { return 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b; }

  // paleta do corredor (cor linear de cada espaço da malha) e estampas da roupa
  P._paint = function () {
    var app = this.app, R = this.R, S = R.slot, u = this.mat.runnerU, pal = u.uPal.value, gear = app.gear || {};
    var shirtV = gear.shirt || {}, shortsV = gear.shorts || {}, shoesV = gear.shoes || {}, ms = R.c.measures;
    var col = function (name) { return S[name] !== undefined && pal[S[name]] ? pal[S[name]] : _x; };
    var skin = lin(app.skin, col('skin')), hair = lin(app.hair, col('hair'));
    // sobrancelha: tom do cabelo, mas sempre mais escura que a pele (no máximo 40% da luminância dela)
    var brow = col('brow').copy(hair).multiplyScalar(0.65).lerp(skin, 0.15), lb = lum(brow), lmax = lum(skin) * 0.4;
    if (lb > lmax) brow.multiplyScalar(lmax / lb);
    lin('#2a1d18', col('lash'));
    col('eye').setRGB(1, 1, 1);   // o olho vem da textura
    lin(app.hairTie || '#26262c', col('hairTie'));
    // camiseta: corpo, acabamentos (gola, mangas, barra) e detalhe
    var shirt = lin(app.shirt, col('shirt')), trim = col('shirtTrim').copy(shirt).multiplyScalar(0.78), sacc = col('shirtAccent').copy(shirt).lerp(_w, 0.7);
    var sA = shirtV.accent || app.shirtAccent;
    if (sA) { lin(sA, trim); sacc.copy(trim); }
    if (app.pacer) { lin('#d9ff3d', shirt); lin('#ff5a3d', trim); sacc.copy(trim); sA = null; }   // colete do corredor-guia
    // short/legging: corpo, cós e barra, faixa lateral
    var shorts = lin(app.shorts, col('shorts')), btrim = col('shortsTrim').copy(shorts).multiplyScalar(0.72), bacc = col('shortsAccent').copy(shorts).lerp(_w, 0.35);
    var bA = shortsV.accent || app.shortsAccent;
    if (bA) { lin(bA, bacc); if (shortsV.pattern !== 'degrade') btrim.copy(bacc); }
    // meia, tênis (cabedal, detalhes, entressola, solado, cadarço, forro)
    var sock = lin(app.socksColor || '#f3f2ee', col('sock'));
    var shoe = lin(app.shoes, col('shoe')), shacc = col('shoeAccent').copy(shoe).lerp(_w, 0.6), mid = lin('#f6f5f0', col('midsole'));
    var sole = lin('#4a4a50', col('sole')), lace = col('lace').copy(shoe).lerp(_w, 0.75);
    lin('#3a3a40', col('lining'));
    if (shoesV.accent) {
      lin(shoesV.accent, shacc);
      if (shoesV.kind === 'tenis-corrida' || shoesV.kind === 'tenis-pro') { mid.copy(shacc).lerp(_w, 0.55); lace.copy(_w); }
      if (shoesV.kind === 'tenis-pro') { sock.copy(shoe).lerp(_w, 0.6); sole.copy(shacc).multiplyScalar(0.55); lace.copy(shacc); }
    } else if (app.shoeAccent) lin(app.shoeAccent, shacc);
    col('sockTrim').copy(sock).multiplyScalar(0.8);
    // estampas (por pixel no shader): faixa, listras ou degradê na altura do corpo em repouso
    var pa = sA && shirtV.pattern ? PATTERN[shirtV.pattern] || 0 : 0;
    var pb = bA && shortsV.pattern && shortsV.pattern !== 'faixa' ? PATTERN[shortsV.pattern] || 0 : 0;   // a faixa do short já é a lateral
    if (this.lod >= 2) {   // longe: listras viram a cor média (não cintilam)
      if (pa === 2) { shirt.lerp(lin(sA, _x), 0.45); pa = 0; }
      if (pb === 2) { shorts.lerp(lin(bA, _x), 0.45); pb = 0; }
    }
    u.uPatA.value.set(pa, ms.hipY - 0.03, ms.neckY - 0.03, S.shirt);
    u.uPatB.value.set(pb, ms.hipY - 0.3, ms.hipY + 0.08, S.shorts);
    if (pa) lin(sA, u.uPatColA.value);
    if (pb) lin(bA, u.uPatColB.value);
  };

  // nível de detalhe (0 = completo, 1 = médio, 2 = leve): os corredores da rua trocam pela distância
  P.setLod = function (lod) {
    if (lod === this.lod) return;
    var far = (this.lod >= 2) !== (lod >= 2);
    this.lod = lod;
    if (!this.app) return;
    this.mesh.geometry = geoFor(this.R.g, this.outfit, lod);
    if (far) { this._paint(); this._accVis(); }
  };

  // ---------------------------------------------------------------- animação
  var _t = [{ y: 0, f: 0, th: 0 }, { y: 0, f: 0, th: 0 }], _fa = { y: 0, f: 0 }, _fb = { y: 0, f: 0 };
  // tornozelo para a sola tocar o chão no ponto gf (frente = +f) com o pé inclinado th (ponta para cima = +)
  function ankleOn(R, gf, th, pf, out) {
    var c = Math.cos(th), s = Math.sin(th);
    out.y = -(R.SOLE_Y * c + pf * s); out.f = gf - (pf * c - R.SOLE_Y * s);
    return out;
  }
  // perna de dois ossos até o tornozelo (IK analítica no plano frente/cima), descontando o ângulo de
  // repouso da coxa e da canela; o pé fica com a inclinação th
  function legIK(R, leg, knee, foot, hipY, ay, af, th) {
    var T = R.THIGH, S = R.SHIN, dy = ay - hipY, d = Math.sqrt(dy * dy + af * af);
    if (d > R.LEG_MAX) { dy *= R.LEG_MAX / d; af *= R.LEG_MAX / d; d = R.LEG_MAX; }
    d = Math.max(d, 1e-4);
    var t1 = Math.atan2(af, -dy) + Math.acos(U.clamp((T * T + d * d - S * S) / (2 * T * d), -1, 1));
    var t2 = t1 + Math.acos(U.clamp((T * T + S * S - d * d) / (2 * T * S), -1, 1)) - Math.PI;
    leg.rotation.x = t1 - R.aT;
    knee.rotation.x = t2 - R.aS - leg.rotation.x;
    foot.rotation.x = th - (t2 - R.aS);
  }

  // A passada acompanha a velocidade real: cadência de corredor e pés plantados por IK (o pé apoiado
  // não escorrega). Braço oposto à perna, cotovelo dobrado para a frente; o cabelo balança com molas.
  // opts: { idle, celebrate, lateral }
  var NO_OPTS = {};
  P.animate = function (dt, speed, opts) {
    opts = opts || NO_OPTS;
    if (!this.R) return;
    if (opts.idle || opts.celebrate) return this._idle(dt, opts);
    var R = this.R, run = U.smooth((speed - 5.8) / 2.6), sprint = U.smooth((speed - 14) / 5);
    var freq = U.table(STRIDE, speed), duty = U.table(DUTY, speed), ph0 = this.phase;
    this.phase += dt * Math.PI * 2 * freq;
    var ph = this.phase, s = Math.sin(ph), c = Math.cos(ph);
    // Pés plantados: no apoio, o pé fica parado no chão enquanto o corpo passa
    // (a distância percorrida no apoio = velocidade × tempo de apoio), sem escorregar.
    var D = speed / 3.6 / this.body.scale.y * duty / freq;
    var land = D * U.lerp(0.48, 0.38, run) + 0.02;
    var thTD = U.lerp(0.28, 0.12, run), thTO = -U.lerp(0.4, 0.75, run);
    var lift = U.lerp(0.07, 0.3, run) + sprint * 0.12, hipMax = 9, step = 0, i, HEEL_F = R.HEEL_F, TOE_F = R.TOE_F;
    for (i = 0; i < 2; i++) {
      var t = _t[i], u = ((ph / (Math.PI * 2) + i * 0.5) % 1 + 1) % 1, k = (u - 0.5 + duty / 2) / duty;
      if (k >= 0 && k <= 1) {   // apoio: calcanhar toca, pé plano, empurra com a ponta
        var heel = land + HEEL_F - D * k;
        t.th = k < 0.2 ? thTD * (1 - U.smooth(k / 0.2)) : k > 0.5 ? thTO * U.smooth((k - 0.5) / 0.5) : 0;
        if (t.th >= 0) ankleOn(R, heel, t.th, HEEL_F, t); else ankleOn(R, heel + TOE_F - HEEL_F, t.th, TOE_F, t);
        hipMax = Math.min(hipMax, t.y + Math.sqrt(Math.max(0, R.LEG_MAX * R.LEG_MAX - t.f * t.f)));
        if (!(this._stance & (1 << i))) { this._stance |= 1 << i; step = i ? 1 : -1; }
      } else {                   // balanço: o pé sobe e volta para a frente
        var w = (k > 1 ? k - 1 : k + 1 / duty - 1) * duty / (1 - duty), e = U.smooth(w);
        ankleOn(R, land + HEEL_F - D + TOE_F - HEEL_F, thTO, TOE_F, _fa);
        ankleOn(R, land + HEEL_F, thTD, HEEL_F, _fb);
        t.f = U.lerp(_fa.f, _fb.f, e);
        t.y = U.lerp(_fa.y, _fb.y, e) + lift * Math.pow(Math.sin(Math.PI * Math.pow(w, 0.75)), 1.2);
        t.th = U.lerp(thTO, thTD, U.smooth(w * 1.4 - 0.2));
        this._stance &= ~(1 << i);
      }
    }
    var bob = Math.abs(Math.cos(ph - 0.35));
    var hy = R.HIP_H - run * 0.035 - U.lerp(0.012, 0.045, run) * (bob - 0.5) - 0.012 * (1 - run);
    this.hips.position.y = Math.max(Math.min(hy, hipMax - R.LEG_Y), hy - 0.07);
    this.hips.rotation.set(0, -0.08 * s, 0.035 * c * (1 - run * 0.4));
    var hipY = this.hips.position.y + R.LEG_Y;
    legIK(R, this.legL, this.kneeL, this.footL, hipY, _t[0].y, _t[0].f, _t[0].th);
    legIK(R, this.legR, this.kneeR, this.footR, hipY, _t[1].y, _t[1].f, _t[1].th);
    this.legL.rotation.z = 0.015; this.legR.rotation.z = -0.015;
    this.footL.rotation.z = -0.015 - this.hips.rotation.z; this.footR.rotation.z = 0.015 - this.hips.rotation.z;   // sola plana
    // braços: o esquerdo vai para a frente quando a perna direita vai (e vice-versa); o cotovelo dobra
    // para a frente, mais quanto mais rápido. O repouso já vem aberto: o braço fecha até ~5° do corpo.
    var aa = U.lerp(0.26, 0.55, run) + sprint * 0.2, elbow = U.lerp(0.3, 1.5, run) + sprint * 0.12 - R.foreFlex;
    var abd = R.armAbd - (0.07 + run * 0.03);
    this.armL.rotation.set(-aa * s - 0.04 * run, 0, abd);
    this.armR.rotation.set(aa * s - 0.04 * run, 0, -abd);
    this.elbowL.rotation.set(elbow + 0.2 * Math.max(0, s) * run, 0, 0.16 * run);
    this.elbowR.rotation.set(elbow + 0.2 * Math.max(0, -s) * run, 0, -0.16 * run);
    // tronco: inclina com a velocidade e gira levemente
    var lean = U.lerp(0.035, 0.11, run) + sprint * 0.06;
    this.torso.rotation.set(-lean, 0.14 * s * (0.6 + run * 0.4), -0.02 * c);
    // a cabeça olha para a frente (compensa o giro do tronco)
    this.head.rotation.set(lean * 0.7 + 0.02 * (bob - 0.5) * run, -0.1 * s * (0.6 + run * 0.4), 0.02 * c);
    // aceleração de lado (desvios do jogador) também mexe o cabelo
    var vx = opts.lateral || 0, ax = dt > 0 ? U.clamp((vx - this._vx) / dt, -8, 8) : 0;
    this._vx = vx;
    this._hair(dt, ph0, ph, run, sprint, false, ax);
    this.root.rotation.z = U.damp(this.root.rotation.z, -vx * 0.045, 8, dt);
    if (this.onStep && step) this.onStep(step);
  };

  // Molas do cabelo: rabo de cavalo (pony → pony2) e cabelo comprido (hairA → hairA2). O cabelo pende
  // atrás da cabeça: ficar para trás na corrida = rotação x NEGATIVA (ESPEC §3). O primeiro gomo segue
  // um alvo que vem da passada (arrasto do ar, o sobe-e-desce e o balanço do tronco), com frequência
  // própria perto da cadência e pouco amortecimento (balança de verdade); o segundo atrasa o primeiro
  // (efeito chicote). Integração em passos pequenos (estável com qualquer fps).
  var SPRING = {
    rabo: { a: 'pony', b: 'pony2', k: 72, z: 0.3, k2: 130, z2: 0.25, whip: 0.35, trail: [0.06, 0.22, 0.1], bounce: 0.3, bounce2: 0.2,
      sway: 0.2, lat: 0.04, x: [-1.2, 0.15], zl: 0.7 },
    longo: { a: 'hairA', b: 'hairA2', k: 52, z: 0.4, k2: 90, z2: 0.32, whip: 0.25, trail: [0.02, 0.15, 0.06], bounce: 0.08, bounce2: 0.06,
      sway: 0.07, lat: 0.02, x: [-0.6, 0.1], zl: 0.3 }
  };
  P._hair = function (dt, ph0, ph1, run, sprint, idle, lat) {
    var cfg = this.outfit && SPRING[this.outfit.hair];
    if (!cfg) return;
    var hs = this._hs, T = Math.min(dt, 0.1), n = Math.min(8, Math.max(1, Math.ceil(T * 120))), h = T / n;
    var d1 = 2 * cfg.z * Math.sqrt(cfg.k), d2 = 2 * cfg.z2 * Math.sqrt(cfg.k2), lo = cfg.x[0], hi = cfg.x[1], zl = cfg.zl;
    var trail = idle ? 0 : cfg.trail[0] + cfg.trail[1] * run + cfg.trail[2] * sprint, gait = 0.3 + 0.7 * run;
    for (var j = 1; j <= n; j++) {
      var ph = ph0 + (ph1 - ph0) * j / n, tx, tz, tx2 = 0;
      if (idle) { tx = 0.015 * Math.sin(ph); tz = -cfg.lat * lat; }
      else {
        // pisada (o quadril freia a descida) puxa o cabelo para baixo; no voo ele sobe e fica para trás
        var bb = Math.cos(2 * (ph - 0.35));
        tx = -trail + cfg.bounce * gait * bb;
        tx2 = cfg.bounce2 * gait * Math.cos(2 * (ph - 0.35) - 1);
        tz = -Math.sin(ph) * cfg.sway * gait - cfg.lat * lat;
      }
      var ax = (tx - hs.x1) * cfg.k - hs.vx1 * d1, az = (tz - hs.z1) * cfg.k - hs.vz1 * d1;
      hs.vx1 += ax * h; hs.x1 += hs.vx1 * h; hs.vz1 += az * h; hs.z1 += hs.vz1 * h;
      var bx = (tx2 - hs.x2) * cfg.k2 - hs.vx2 * d2 - cfg.whip * ax, bz = -hs.z2 * cfg.k2 - hs.vz2 * d2 - cfg.whip * az;
      hs.vx2 += bx * h; hs.x2 += hs.vx2 * h; hs.vz2 += bz * h; hs.z2 += hs.vz2 * h;
      // limites (o cabelo não entra na cabeça nem dá a volta)
      if (hs.x1 < lo) { hs.x1 = lo; if (hs.vx1 < 0) hs.vx1 = 0; } else if (hs.x1 > hi) { hs.x1 = hi; if (hs.vx1 > 0) hs.vx1 = 0; }
      if (hs.x2 < lo) { hs.x2 = lo; if (hs.vx2 < 0) hs.vx2 = 0; } else if (hs.x2 > hi) { hs.x2 = hi; if (hs.vx2 > 0) hs.vx2 = 0; }
      if (Math.abs(hs.z1) > zl) { hs.z1 = zl * (hs.z1 > 0 ? 1 : -1); hs.vz1 *= -0.3; }
      if (Math.abs(hs.z2) > zl) { hs.z2 = zl * (hs.z2 > 0 ? 1 : -1); hs.vz2 *= -0.3; }
    }
    this[cfg.a].rotation.set(hs.x1, 0, hs.z1);
    this[cfg.b].rotation.set(hs.x2, 0, hs.z2);
  };

  // altura do quadril para o pé mais baixo ficar no chão (pés planos; poses paradas, sem IK)
  function soleBelowHips(R, leg, knee, rz) {
    var a = leg.rotation.x, b = a + knee.rotation.x;
    return R.LEG_Y + leg.position.x * Math.sin(rz) - (R.THIGH * Math.cos(R.aT + a) + R.SHIN * Math.cos(R.aS + b)) * Math.cos(leg.rotation.z) + R.SOLE_Y;
  }
  P._groundHips = function () {
    var rz = this.hips.rotation.z;
    return -Math.min(soleBelowHips(this.R, this.legL, this.kneeL, rz), soleBelowHips(this.R, this.legR, this.kneeR, rz));
  };

  P._idle = function (dt, opts) {
    var R = this.R, ph0 = this.phase;
    this.phase += dt * (opts.celebrate ? 5 : 1.6);
    this.idleT += dt;
    var br = Math.sin(this.phase), A0 = R.armAbd;
    this.footL.rotation.set(0, 0, 0); this.footR.rotation.set(0, 0, 0);
    this.head.rotation.set(0, 0, 0);
    if (opts.celebrate) {
      var hop = Math.max(0, Math.sin(this.phase));
      this.hips.rotation.set(0, 0, 0);
      this.torso.rotation.set(0.05, 0, 0);
      this.legL.rotation.set(-hop * 0.2, 0, 0.05); this.legR.rotation.set(-hop * 0.2, 0, -0.05);
      this.kneeL.rotation.x = -hop * 0.4; this.kneeR.rotation.x = -hop * 0.4;
      this.footL.rotation.x = -this.legL.rotation.x - this.kneeL.rotation.x; this.footR.rotation.x = -this.legR.rotation.x - this.kneeR.rotation.x;
      this.hips.position.y = R.HIP_H + hop * 0.06;   // pulinho: as pernas encolhem no ar
      this.armL.rotation.set(RAISE_MAX, 0, A0 - 0.3 - hop * 0.15); this.armR.rotation.set(RAISE_MAX, 0, -(A0 - 0.3 - hop * 0.15));
      this.elbowL.rotation.set(0.3 - R.foreFlex, 0, 0); this.elbowR.rotation.set(0.3 - R.foreFlex, 0, 0);
    } else {
      // respira, troca o peso de perna e às vezes alonga os braços
      var sway = Math.sin(this.idleT * 0.7) * 0.04, stretch = U.smooth((Math.sin(this.idleT * 0.35) - 0.85) / 0.15);
      this.hips.rotation.set(0, 0, sway * 0.4);
      this.torso.rotation.set(-0.02 + br * 0.01, 0, -sway * 0.5);
      this.legL.rotation.set(0.02, 0, 0.025 - sway * 0.4); this.legR.rotation.set(-0.02, 0, -0.025 - sway * 0.4);
      this.kneeL.rotation.x = -0.04 - Math.max(0, sway) * 1.2; this.kneeR.rotation.x = -0.04 - Math.max(0, -sway) * 1.2;
      this.footL.rotation.x = -this.legL.rotation.x - this.kneeL.rotation.x; this.footR.rotation.x = -this.legR.rotation.x - this.kneeR.rotation.x;
      this.footL.rotation.z = -this.legL.rotation.z - this.hips.rotation.z; this.footR.rotation.z = -this.legR.rotation.z - this.hips.rotation.z;
      this.hips.position.y = this._groundHips();
      // braços soltos na abertura de repouso (o punho não encosta no short)
      this.armL.rotation.set(0.04 + br * 0.02 + stretch * RAISE_MAX, 0, 0.02 - stretch * 0.15);
      this.armR.rotation.set(0.03 - br * 0.02 + stretch * RAISE_MAX, 0, -0.02 + stretch * 0.15);
      this.elbowL.rotation.set(0.04 + stretch * 0.1, 0, 0); this.elbowR.rotation.set(0.04 + stretch * 0.1, 0, 0);
    }
    // girar o corredor (arrastar na criação e nos equipamentos) balança o cabelo para fora
    var yaw = this.root.rotation.y, wy = dt > 0 ? U.clamp((yaw - this._yaw) / dt, -6, 6) : 0;
    this._yaw = yaw;
    this._hair(dt, ph0, this.phase, 0, 0, true, wy * 1.5);
    this.root.rotation.z = 0;
  };

  P.dispose = function () {
    var i = ALL.indexOf(this);
    if (i >= 0) ALL.splice(i, 1);
    if (this._soon) clearTimeout(this._soon);
    this.mat.dispose();
    if (this.skeleton) this.skeleton.dispose();
  };

  // gear (opcional): visual dos itens equipados por espaço; color 'perfil' = a cor da criação
  RunnerRig.resolve = function (profile, gear) {
    var A = EP.data.appearance, a = profile.appearance, f = profile.gender === 'f';
    var out = {
      gender: profile.gender, skin: A.skin[a.skin] || A.skin[0], hairStyle: a.hairStyle, hair: A.hairColors[a.hairColor] || A.hairColors[0],
      shirt: A.shirts[a.shirt] || A.shirts[0], shorts: A.shorts[a.shorts] || A.shorts[0], shoes: A.shoes[a.shoes] || A.shoes[0],
      shirtKind: f ? 'top' : 'camiseta', shortsKind: f ? 'legging' : 'short',
      gear: gear || null
    };
    if (gear) {
      ['shirt', 'shorts', 'shoes'].forEach(function (s) {
        var v = gear[s];
        if (v && v.color && v.color !== 'perfil') out[s] = v.color;
      });
    }
    return out;
  };

  // Corredores da rua: só estas roupas (o nível leve do corpo vem pronto dos dados para cada uma, com e
  // sem meia — ferramentas/bake-corredor confere esta lista) e cores de conjuntos que combinam.
  RunnerRig.NPC_OUTFITS = [
    { gender: 'm', top: 'camiseta', bottom: 'short', hair: 'curto' }, { gender: 'm', top: 'regata', bottom: 'short', hair: 'raspado' },
    { gender: 'm', top: 'camiseta', bottom: 'short', hair: 'cacheado' }, { gender: 'm', top: 'manga-longa', bottom: 'legging', hair: 'curto' },
    { gender: 'f', top: 'top', bottom: 'legging', hair: 'rabo' }, { gender: 'f', top: 'regata', bottom: 'short', hair: 'rabo' },
    { gender: 'f', top: 'camiseta', bottom: 'legging', hair: 'coque' }, { gender: 'f', top: 'top', bottom: 'short', hair: 'curto' }
  ];
  // cor do cabelo pelo tom de pele (todas aparecem; loiro e ruivo mais raros com pele escura)
  var HAIR_W = [[2, 3, 2.5, 1.4, 0.8], [2, 3, 2.5, 1.4, 0.8], [3, 3, 2, 0.6, 0.4], [5, 3, 1, 0.15, 0.1], [5, 3, 1, 0.15, 0.1]];
  var NPC_SOCKS = ['#f3f2ee', '#f3f2ee', '#f3f2ee', '#2a2d34'];
  // roupas da rua que existem nos dados (dados parciais, durante uma regeração, não viram corredor pelado)
  var npcReady = null;
  function npcOutfits() {
    if (!npcReady) {
      npcReady = RunnerRig.NPC_OUTFITS.filter(function (o) {
        return MD && MD.ok() && MD.garment(o.gender, o.top) && MD.garment(o.gender, o.bottom) && MD.hair(o.gender, o.hair);
      });
      if (!npcReady.length) npcReady = RunnerRig.NPC_OUTFITS.slice();
    }
    return npcReady;
  }
  // accept (opcional): função que aceita ou não a roupa sorteada (ex.: o pacer quer camiseta ou regata)
  RunnerRig.random = function (rnd, accept) {
    var A = EP.data.appearance, K = A.npcKits || null, list = npcOutfits();
    rnd = rnd || Math.random;
    if (accept) list = list.filter(accept).length ? list.filter(accept) : list;
    var o = U.pick(list, rnd), kit = K ? U.pick(K, rnd) : null;
    var si = Math.floor(rnd() * A.skin.length) % A.skin.length, hw = HAIR_W[Math.min(si, HAIR_W.length - 1)];
    var hc = U.pickWeighted(A.hairColors.map(function (c, i) { return i; }), function (i) { return hw[i] || 0.5; }, rnd);
    var shirt = kit ? kit[0] : U.pick(A.npcShirts, rnd), shorts = kit ? kit[1] : U.pick(A.npcShorts, rnd);
    var shoes = kit ? kit[2] : U.pick(A.npcShoes, rnd), accent = kit ? kit[3] : null;
    // detalhes no tom do conjunto: gola/barra na cor de destaque, faixa do short clara ou de destaque
    var trim = accent && accent !== shirt && rnd() < 0.5 ? accent : null;
    var stripe = rnd() < 0.55 ? (accent && accent !== shorts && rnd() < 0.6 ? accent : '#f2f3f5') : null;
    var legging = o.bottom === 'legging', socks = legging ? rnd() < 0.15 : rnd() < 0.85;
    var sc = rnd() < 0.1 && accent ? accent : U.pick(NPC_SOCKS, rnd);
    return {
      gender: o.gender, skin: A.skin[si], hairStyle: o.hair, hair: A.hairColors[hc],
      shirt: shirt, shorts: shorts, shoes: shoes, shoeAccent: accent, shirtAccent: trim, shortsAccent: stripe,
      shirtKind: o.top, shortsKind: o.bottom, socks: socks, socksColor: sc, hairTie: accent || '#26262c',
      gear: randomGear(rnd)
    };
  };
  // monta aos poucos (sem travar a tela) as geometrias dos corredores da rua: médio, leve e, se pedir,
  // completo (presas: não saem do cache) e todos os acessórios que eles podem sortear, para cada cabeça
  // (gênero + cabelo): nada de montar um fone no meio da corrida
  var PACER_CAP = { kind: 'viseira', color: '#ffffff', accent: '#ff5a3d' };
  RunnerRig.warmNpcs = function (done, lods) {
    var jobs = [], heads = {};
    if (!MD || !MD.ok()) { if (done) done(); return; }
    var list = npcOutfits();
    (lods || [1, 2]).forEach(function (lod) {
      list.forEach(function (o) {
        [true, false].forEach(function (sk) { jobs.push(function () { geoFor(o.gender, { top: o.top, bottom: o.bottom, hair: o.hair, socks: sk }, lod, true); }); });
      });
    });
    var pool = npcGearPool();
    list.forEach(function (o) {
      var hk = o.gender + '|' + o.hair;
      if (heads[hk]) return;
      heads[hk] = 1;
      ['head', 'eyes', 'ears'].forEach(function (slot) {
        (pool[slot] || []).concat(slot === 'head' ? [PACER_CAP] : []).forEach(function (v) {
          jobs.push(function () { accGeo(slot, v, rigOf(o.gender), o.hair); });
        });
      });
    });
    ['m', 'f'].forEach(function (g) {
      (pool.wrist || []).forEach(function (v) { jobs.push(function () { accGeo('wrist', v, rigOf(g), ''); }); });
      jobs.push(function () { accGeo('flag', { kind: 'flag' }, rigOf(g), ''); });
    });
    var now = function () { return (window.performance && performance.now) ? performance.now() : Date.now(); };
    (function next() {
      var t0 = now();
      while (jobs.length && now() - t0 < 6) jobs.shift()();
      if (jobs.length) setTimeout(next, 30); else if (done) done();
    })();
  };

  // acessórios dos corredores da rua (a rua fica mais viva; mesmas peças da loja)
  var NPC_GEAR = { head: 0.25, eyes: 0.2, ears: 0.18, wrist: 0.45 };
  var gearPool = null;
  function npcGearPool() {
    if (!gearPool && EP.data.items) {
      gearPool = {};
      EP.data.items.forEach(function (it) { if (!it.starter && NPC_GEAR[it.slot]) (gearPool[it.slot] = gearPool[it.slot] || []).push(it.visual); });
    }
    return gearPool || {};
  }
  function randomGear(rnd) {
    if (!EP.data.items) return null;
    var pool = npcGearPool(), g = {};
    for (var s in NPC_GEAR) if (pool[s] && rnd() < NPC_GEAR[s]) g[s] = U.pick(pool[s], rnd);
    return g;
  }

  RunnerRig.outfitOf = outfitOf;
  EP.RunnerRig = RunnerRig;
})(window.EP);
