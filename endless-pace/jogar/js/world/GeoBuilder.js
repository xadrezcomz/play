// GeoBuilder — junta muitas peças simples (caixas, cilindros, cones...) numa
// geometria só, com a cor em cada vértice. Um módulo de rua inteiro vira
// poucos objetos na tela (GDD §60: menos chamadas de desenho, um material).
(function (EP) {
  'use strict';
  var UNIT = {};

  function flat(g) {
    g = g.index ? g.toNonIndexed() : g;
    g.computeVertexNormals();   // geometria sem índice: normal por face (visual low poly)
    return g;
  }

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
      case 'cyl6': return new THREE.CylinderGeometry(0.5, 0.5, 1, 6).toNonIndexed();
      case 'cyl8': return new THREE.CylinderGeometry(0.5, 0.5, 1, 8).toNonIndexed();
      case 'cyl12': return new THREE.CylinderGeometry(0.5, 0.5, 1, 12).toNonIndexed();
      case 'taper8': return new THREE.CylinderGeometry(0.38, 0.5, 1, 8).toNonIndexed();   // membro afinando
      case 'cone4': return flat(new THREE.ConeGeometry(0.5, 1, 4));
      case 'cone6': return flat(new THREE.ConeGeometry(0.5, 1, 6));
      case 'cone8': return flat(new THREE.ConeGeometry(0.5, 1, 8));
      case 'ico': return flat(new THREE.IcosahedronGeometry(0.5, 0));
      case 'ico1': return flat(new THREE.IcosahedronGeometry(0.5, 1));
      case 'sph': return new THREE.SphereGeometry(0.5, 12, 9).toNonIndexed();
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
      UNIT[name] = { pos: g.attributes.position.array, nor: g.attributes.normal.array };
    }
    return UNIT[name];
  }

  var _m = new THREE.Matrix4(), _n = new THREE.Matrix3(), _q = new THREE.Quaternion(), _e = new THREE.Euler();
  var _v = new THREE.Vector3(), _s = new THREE.Vector3();
  var colors = {};
  function color(c) {
    if (typeof c !== 'string') return c;
    return colors[c] || (colors[c] = new THREE.Color(c));
  }

  function GeoBuilder() {
    this.pos = []; this.nor = []; this.col = []; this.part = [];
    this.frameM = new THREE.Matrix4();
    this.partId = 0;
  }
  var P = GeoBuilder.prototype;

  // referencial local (posição e giro em y) para as próximas peças
  P.frame = function (x, y, z, rotY) { this.frameM.makeRotationY(rotY || 0).setPosition(x, y, z); return this; };
  P.noFrame = function () { this.frameM.identity(); return this; };

  // peça centrada em (x, y, z), escala (sx, sy, sz), giro em radianos
  P.add = function (name, x, y, z, sx, sy, sz, c, ry, rx, rz) {
    var u = unit(name);
    _e.set(rx || 0, ry || 0, rz || 0);
    _q.setFromEuler(_e);
    _m.compose(_v.set(x, y, z), _q, _s.set(sx, sy, sz)).premultiply(this.frameM);
    _n.getNormalMatrix(_m);
    var col = color(c), p = u.pos, n = u.nor, e = _m.elements, ne = _n.elements;
    for (var i = 0; i < p.length; i += 3) {
      var px = p[i], py = p[i + 1], pz = p[i + 2];
      this.pos.push(e[0] * px + e[4] * py + e[8] * pz + e[12], e[1] * px + e[5] * py + e[9] * pz + e[13], e[2] * px + e[6] * py + e[10] * pz + e[14]);
      var nx = n[i], ny = n[i + 1], nz = n[i + 2];
      var ox = ne[0] * nx + ne[3] * ny + ne[6] * nz, oy = ne[1] * nx + ne[4] * ny + ne[7] * nz, oz = ne[2] * nx + ne[5] * ny + ne[8] * nz;
      var l = Math.sqrt(ox * ox + oy * oy + oz * oz) || 1;
      this.nor.push(ox / l, oy / l, oz / l);
      this.col.push(col.r, col.g, col.b);
      this.part.push(this.partId);
    }
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

  P.build = function () {
    var g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nor, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
    g.computeBoundingSphere();
    return g;
  };

  // cor mais clara ou mais escura (f > 1 clareia)
  GeoBuilder.shade = function (c, f) {
    var k = color(c).clone().multiplyScalar(f);
    k.r = Math.min(1, k.r); k.g = Math.min(1, k.g); k.b = Math.min(1, k.b);
    return k;
  };
  GeoBuilder.color = color;

  // três construtores juntos (cenário, luzes e água) com o mesmo referencial
  function Batch() { this.w = new GeoBuilder(); this.g = new GeoBuilder(); this.water = new GeoBuilder(); }
  Batch.prototype.frame = function (x, y, z, rotY) { this.w.frame(x, y, z, rotY); this.g.frame(x, y, z, rotY); this.water.frame(x, y, z, rotY); return this; };
  Batch.prototype.noFrame = function () { this.w.noFrame(); this.g.noFrame(); this.water.noFrame(); return this; };

  EP.GeoBuilder = GeoBuilder;
  EP.Batch = Batch;
})(window.EP);
