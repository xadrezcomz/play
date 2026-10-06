// GeoBuilder — junta muitas peças simples (caixas, cilindros, cones...) numa
// geometria só, com a cor em cada vértice. Um módulo de rua inteiro vira
// poucos objetos na tela (GDD §60: menos chamadas de desenho, um material).
(function (EP) {
  'use strict';
  var UNIT = {};

  function ni(g) { return g.index ? g.toNonIndexed() : g; }

  function flat(g) {
    g = g.index ? g.toNonIndexed() : g;
    g.computeVertexNormals();   // geometria sem índice: normal por face (visual low poly)
    return g;
  }

  function frontBox() {
    var g = new THREE.BoxGeometry(1, 1, 1).toNonIndexed(), keep = [0, 1, 2, 4];   // +x, -x, +y, +z
    var pos = [], nor = [], uv = [], P = g.attributes.position.array, N = g.attributes.normal.array, UV = g.attributes.uv.array;
    keep.forEach(function (f) {
      for (var i = f * 6; i < f * 6 + 6; i++) { pos.push(P[i * 3], P[i * 3 + 1], P[i * 3 + 2]); nor.push(N[i * 3], N[i * 3 + 1], N[i * 3 + 2]); uv.push(UV[i * 2], UV[i * 2 + 1]); }
    });
    var out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    out.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    return out;
  }
  // caixa "de frente" apoiada no chão (mesma convenção de box)
  GeoBuilder.prototype.boxF = function (x, y, z, sx, sy, sz, c, ry) { return this.add('boxF', x, y + sy / 2, z, sx, sy, sz, c, ry); };

  function prism() {
    // telhado de duas águas: base 1×1 em y=0, cumeeira em y=1 paralela ao eixo x
    var a = [-0.5, 0, 0.5], b = [-0.5, 0, -0.5], c = [-0.5, 1, 0], d = [0.5, 0, 0.5], e = [0.5, 0, -0.5], f = [0.5, 1, 0];
    var tri = [a, c, b, d, e, f, a, d, f, a, f, c, b, c, f, b, f, e];
    var pos = [];
    tri.forEach(function (p) { pos.push(p[0], p[1], p[2]); });
    var g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.computeVertexNormals();
    return g;
  }

  function make(name) {
    switch (name) {
      case 'box': return new THREE.BoxGeometry(1, 1, 1).toNonIndexed();
      case 'boxF': return frontBox();   // caixa sem fundo e sem a face de trás (molduras, frisos: metade dos vértices)
      case 'cyl6': return new THREE.CylinderGeometry(0.5, 0.5, 1, 6).toNonIndexed();
      case 'cyl8': return new THREE.CylinderGeometry(0.5, 0.5, 1, 8).toNonIndexed();
      case 'cyl12': return new THREE.CylinderGeometry(0.5, 0.5, 1, 12).toNonIndexed();
      case 'taper8': return new THREE.CylinderGeometry(0.38, 0.5, 1, 8).toNonIndexed();   // membro afinando
      case 'cone4': return flat(new THREE.ConeGeometry(0.5, 1, 4));
      case 'cone6': return flat(new THREE.ConeGeometry(0.5, 1, 6));
      case 'cone8': return flat(new THREE.ConeGeometry(0.5, 1, 8));
      case 'ico': return flat(new THREE.IcosahedronGeometry(0.5, 0));
      case 'ico1': return flat(new THREE.IcosahedronGeometry(0.5, 1));
      case 'icoT': return ni(new THREE.IcosahedronGeometry(0.5, 0));      // bolinha leve (flores, frutos)
      case 'icoS': return ni(new THREE.IcosahedronGeometry(0.5, 1));      // bola leve com sombreado liso (copas)
      case 'icoS2': return ni(new THREE.IcosahedronGeometry(0.5, 2));     // mais redonda (nuvens, morros)
      case 'sph': return new THREE.SphereGeometry(0.5, 12, 9).toNonIndexed();
      case 'sph8': return new THREE.SphereGeometry(0.5, 9, 7).toNonIndexed();          // juntas pequenas
      case 'sph16': return new THREE.SphereGeometry(0.5, 18, 14).toNonIndexed();       // cabeça, copas lisas
      case 'cyl10': return new THREE.CylinderGeometry(0.5, 0.5, 1, 10).toNonIndexed();
      case 'taper10': return new THREE.CylinderGeometry(0.4, 0.5, 1, 10).toNonIndexed();
      case 'taper10s': return new THREE.CylinderGeometry(0.4, 0.5, 1, 10, 5).toNonIndexed();   // com anéis (estampas da roupa)
      case 'cyl10s': return new THREE.CylinderGeometry(0.5, 0.5, 1, 14, 1, true).toNonIndexed();  // tubo aberto (faixas, aros)
      case 'cone12': return new THREE.ConeGeometry(0.5, 1, 12).toNonIndexed();         // cone liso (pinheiro)
      case 'plane': return new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2).toNonIndexed();
      case 'quad': return new THREE.PlaneGeometry(1, 1).toNonIndexed();
      case 'disc': return new THREE.CircleGeometry(0.5, 20).rotateX(-Math.PI / 2).toNonIndexed();
      case 'ring': return new THREE.RingGeometry(0.001, 0.5, 24, 6).rotateX(-Math.PI / 2).toNonIndexed();   // disco em anéis (lagos grandes)
      case 'prism': return prism();
    }
    throw new Error('peça desconhecida: ' + name);
  }

  function unit(name) {
    if (!UNIT[name]) {
      var g = make(name);
      if (name === 'icoT') {   // normais lisas (apontam para fora do centro)
        var pa = g.attributes.position, na = g.attributes.normal;
        for (var q = 0; q < pa.count; q++) { var v = new THREE.Vector3(pa.getX(q), pa.getY(q), pa.getZ(q)).normalize(); na.setXYZ(q, v.x, v.y, v.z); }
      }
      UNIT[name] = { pos: g.attributes.position.array, nor: g.attributes.normal.array, uv: g.attributes.uv ? g.attributes.uv.array : null };
    }
    return UNIT[name];
  }

  var _m = new THREE.Matrix4(), _n = new THREE.Matrix3(), _q = new THREE.Quaternion(), _e = new THREE.Euler();
  var _v = new THREE.Vector3(), _s = new THREE.Vector3();
  // As cores dos dados são escritas como no CSS (sRGB). O renderizador
  // trabalha em espaço linear (iluminação correta) e converte na saída.
  var colors = {};
  function color(c) {
    if (typeof c !== 'string') return c;
    return colors[c] || (colors[c] = new THREE.Color(c).convertSRGBToLinear());
  }

  // opts: { ao: escurece a base das paredes (oclusão de ambiente barata), uv: guarda UV }
  function GeoBuilder(opts) {
    this.pos = []; this.nor = []; this.col = []; this.part = []; this.uv = []; this.det = [];
    this.detail = 0;          // padrão de textura do material do cenário (ver Textures.detail)
    this.uvRect = null;       // [u0, v0, du, dv]: recorte do atlas para as próximas peças
    this.withDetail = !!(opts && opts.detail);
    this.frameM = new THREE.Matrix4();
    this.partId = 0;
    this.ao = !!(opts && opts.ao);
    this.withUv = !!(opts && opts.uv);
  }
  var P = GeoBuilder.prototype;

  // referencial local (posição e giro em y) para as próximas peças
  P.frame = function (x, y, z, rotY) { this.frameM.makeRotationY(rotY || 0).setPosition(x, y, z); return this; };
  P.noFrame = function () { this.frameM.identity(); return this; };

  // peça centrada em (x, y, z), escala (sx, sy, sz), giro em radianos
  P.add = function (name, x, y, z, sx, sy, sz, c, ry, rx, rz) {
    return this.addUnit(unit(name), x, y, z, sx, sy, sz, c, ry, rx, rz);
  };

  // como add, mas com uma forma própria ({ pos, nor, uv }), ex.: GeoBuilder.lathe
  P.addUnit = function (u, x, y, z, sx, sy, sz, c, ry, rx, rz) {
    var start = this.part.length;
    _e.set(rx || 0, ry || 0, rz || 0);
    _q.setFromEuler(_e);
    _m.compose(_v.set(x, y, z), _q, _s.set(sx, sy, sz)).premultiply(this.frameM);
    _n.getNormalMatrix(_m);
    var col = color(c), p = u.pos, n = u.nor, e = _m.elements, ne = _n.elements, uv = u.uv;
    for (var i = 0; i < p.length; i += 3) {
      var px = p[i], py = p[i + 1], pz = p[i + 2];
      var wy = e[1] * px + e[5] * py + e[9] * pz + e[13];
      this.pos.push(e[0] * px + e[4] * py + e[8] * pz + e[12], wy, e[2] * px + e[6] * py + e[10] * pz + e[14]);
      var nx = n[i], ny = n[i + 1], nz = n[i + 2];
      var ox = ne[0] * nx + ne[3] * ny + ne[6] * nz, oy = ne[1] * nx + ne[4] * ny + ne[7] * nz, oz = ne[2] * nx + ne[5] * ny + ne[8] * nz;
      var l = Math.sqrt(ox * ox + oy * oy + oz * oz) || 1;
      this.nor.push(ox / l, oy / l, oz / l);
      // paredes ficam um pouco mais escuras perto do chão (dá peso e profundidade)
      var k = 1;
      if (this.ao && Math.abs(oy / l) < 0.7) { var t = Math.max(0, Math.min(1, wy / 3.2)); k = 0.68 + 0.32 * t * t * (3 - 2 * t); }
      this.col.push(col.r * k, col.g * k, col.b * k);
      this.part.push(this.partId);
      if (this.withUv) {
        var j = i / 3 * 2, uu = uv ? uv[j] : 0.5, vv = uv ? uv[j + 1] : 0.5, R = this.uvRect;
        if (R) { uu = R[0] + uu * R[2]; vv = R[1] + vv * R[3]; }
        this.uv.push(uu, vv);
      }
      if (this.withDetail) this.det.push(this.detail);
    }
    // partFn(x, y, z): espaço de cor de cada triângulo pelo centro dele (bordas nítidas)
    if (this.partFn) {
      var P3 = this.pos;
      for (var t = start; t < this.part.length; t += 3) {
        var a = t * 3;
        var id = this.partFn((P3[a] + P3[a + 3] + P3[a + 6]) / 3, (P3[a + 1] + P3[a + 4] + P3[a + 7]) / 3, (P3[a + 2] + P3[a + 5] + P3[a + 8]) / 3);
        if (id !== undefined && id !== null) this.part[t] = this.part[t + 1] = this.part[t + 2] = id;
      }
    }
    return this;
  };

  // sombra suave no chão (disco com degradê): só no construtor de sombras
  P.blob = function (x, y, z, rx, rz) { return this.add('plane', x, y, z, rx * 2, 1, rz * 2, '#000000'); };
  // sombra de copa (luz passando entre as folhas): metade direita do atlas
  P.dapple = function (x, y, z, rx, rz, ry) {
    var r = this.uvRect;
    this.uvRect = [0.5, 0, 0.5, 1];
    this.add('plane', x, y, z, rx * 2, 1, rz * 2, '#000000', ry || 0);
    this.uvRect = r;
    return this;
  };
  // cartão do atlas de folhagem (quadro = Textures.CELL[nome]); vertical, virado para +z
  P.card = function (cell, x, y, z, w, h, c, ry, rx, rz) {
    var r = this.uvRect, C0 = EP.Textures.CELL[cell];
    this.uvRect = [C0[0], C0[1], 0.5, 0.5];
    this.add('quad', x, y, z, w, h, 1, c, ry, rx, rz);
    this.uvRect = r;
    return this;
  };

  // A curvatura do mundo (Materials.js) mexe nos vértices: uma peça muito
  // comprida em z, com vértices só nas pontas, "afunda" no meio. Pisos e
  // caixas compridas são divididos em pedaços de até STEP metros.
  var STEP = 6;
  P._split = function (name, x, y, z, sx, sy, sz, c, ry) {
    if (sz <= STEP * 1.5 || ry) return this.add(name, x, y, z, sx, sy, sz, c, ry);
    var n = Math.ceil(sz / STEP), step = sz / n;
    for (var i = 0; i < n; i++) this.add(name, x, y, z - sz / 2 + step * (i + 0.5), sx, sy, step, c);
    return this;
  };
  // caixa apoiada no chão: (x, z) é o centro, y é a base
  P.box = function (x, y, z, sx, sy, sz, c, ry) { return this._split('box', x, y + sy / 2, z, sx, sy, sz, c, ry); };
  // plano vertical virado para +z (janelas, placas)
  P.quad = function (x, y, z, sx, sy, c, ry) { return this.add('quad', x, y, z, sx, sy, 1, c, ry); };
  // plano deitado (pisos, faixas)
  P.floor = function (x, y, z, sx, sz, c) { return this._split('plane', x, y, z, sx, 1, sz, c); };

  P.count = function () { return this.pos.length / 3; };

  // normais "de copa": as peças a partir do vértice start apontam para fora do
  // centro (cx, cy, cz no referencial atual) — cartões de folha sombreados como
  // uma copa redonda e macia, sem cara de plano
  P.puffNormals = function (start, cx, cy, cz, up) {
    var v = new THREE.Vector3(cx, cy, cz).applyMatrix4(this.frameM), P3 = this.pos, N = this.nor, k = up || 0.35;
    for (var i = start; i < P3.length / 3; i++) {
      var dx = P3[i * 3] - v.x, dy = P3[i * 3 + 1] - v.y + k, dz = P3[i * 3 + 2] - v.z, l = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
      N[i * 3] = dx / l; N[i * 3 + 1] = dy / l; N[i * 3 + 2] = dz / l;
    }
    return this;
  };

  // degradê vertical nas peças a partir de start (vidro com reflexo do céu, troncos)
  P.vGradient = function (start, top, bottom) {
    var a = color(top), b = color(bottom), P3 = this.pos, lo = Infinity, hi = -Infinity, i;
    for (i = start; i < P3.length / 3; i++) { lo = Math.min(lo, P3[i * 3 + 1]); hi = Math.max(hi, P3[i * 3 + 1]); }
    for (i = start; i < P3.length / 3; i++) {
      var t = hi > lo ? (P3[i * 3 + 1] - lo) / (hi - lo) : 0;
      this.col[i * 3] = b.r + (a.r - b.r) * t; this.col[i * 3 + 1] = b.g + (a.g - b.g) * t; this.col[i * 3 + 2] = b.b + (a.b - b.b) * t;
    }
    return this;
  };

  P.build = function () {
    var g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nor, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
    if (this.withUv) g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    if (this.withDetail) g.setAttribute('detail', new THREE.Float32BufferAttribute(this.det, 1));
    g.computeBoundingSphere();
    return g;
  };

  // forma de revolução (corpo, braços, pernas): pts = [[raio, y], ...] de baixo para cima
  var LATHE = {};
  GeoBuilder.lathe = function (key, pts, segs) {
    if (LATHE[key]) return LATHE[key];
    var g = new THREE.LatheGeometry(pts.map(function (p) { return new THREE.Vector2(p[0], p[1]); }), segs || 16);
    g = ni(g);
    return (LATHE[key] = { pos: g.attributes.position.array, nor: g.attributes.normal.array, uv: null });
  };

  // cor mais clara ou mais escura (f > 1 clareia)
  GeoBuilder.shade = function (c, f) {
    var k = color(c).clone().multiplyScalar(f);
    k.r = Math.min(1, k.r); k.g = Math.min(1, k.g); k.b = Math.min(1, k.b);
    return k;
  };
  GeoBuilder.color = color;

  // quatro construtores juntos com o mesmo referencial:
  // w = cenário (com oclusão nas paredes), g = luzes (janelas, lâmpadas),
  // water = água (brilho), shadow = sombras suaves no chão (B.shadow.blob)
  // Batch: um construtor por material do módulo
  //   w cenário (com textura de detalhe) · g luzes · water água · shadow sombras pintadas
  //   light poças de luz · leaf folhagem (atlas, recorte) · glass vidro · sign faixas e placas
  function Batch() {
    this.w = new GeoBuilder({ ao: true, detail: true }); this.g = new GeoBuilder(); this.water = new GeoBuilder(); this.shadow = new GeoBuilder({ uv: true });
    this.shadow.uvRect = [0, 0, 0.5, 1];         // metade esquerda do atlas de sombras: sombra lisa
    this.light = new GeoBuilder({ uv: true });   // poças de luz no chão à noite (B.light.blob)
    this.leaf = new GeoBuilder({ uv: true });    // cartões de folhagem (Textures.foliage)
    this.glass = new GeoBuilder();               // vidros com reflexo falso
    this.sign = new GeoBuilder({ uv: true });    // faixas da marca (Textures.banners)
    this.all = [this.w, this.g, this.water, this.shadow, this.light, this.leaf, this.glass, this.sign];
  }
  Batch.prototype.frame = function (x, y, z, rotY) { this.all.forEach(function (b) { b.frame(x, y, z, rotY); }); return this; };
  Batch.prototype.noFrame = function () { this.all.forEach(function (b) { b.noFrame(); }); return this; };

  EP.GeoBuilder = GeoBuilder;
  EP.Batch = Batch;
})(window.EP);
