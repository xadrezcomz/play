// ProceduralWorldGenerator — o mundo infinito (GDD §24–26, §62–63).
//
// Encaixa módulos de rua um atrás do outro, só na janela perto do corredor
// (5 à frente, 2 atrás). Os módulos são montados uma vez no começo (2
// versões de cada, mais o espelhamento) e reaproveitados: nada é criado ou
// destruído durante a corrida. Não repete os módulos recentes, segue a rota
// atual (bairro, parque, centro) e para na bifurcação até o jogador escolher.
(function (EP) {
  'use strict';
  var U = EP.util;

  function ProceduralWorldGenerator(scene, biome) {
    var D = EP.data;
    this.scene = scene;
    this.biome = biome;
    this.W = D.world;
    this.routes = D.routes;
    this.forks = D.forks;
    this.defs = {};
    this.geos = {};
    this.pool = {};
    this.segments = [];
    var self = this;
    D.roadModules.filter(function (m) { return m.biome === biome.id; }).forEach(function (def, i) {
      self.defs[def.id] = def;
      self.geos[def.id] = [];
      self.pool[def.id] = [];
      for (var v = 0; v < self.W.variants; v++) {
        self.geos[def.id].push(EP.RoadModules.build(def, 1000 + i * 97 + v * 7919, biome, self.W));
      }
    });
    this.signMeshes = null;
    this.rnd = Math.random;
  }
  var P = ProceduralWorldGenerator.prototype;

  P._acquire = function (id, variant) {
    var list = this.pool[id];
    for (var i = 0; i < list.length; i++) if (!list[i].userData.busy && list[i].userData.variant === variant) {
      list[i].userData.busy = true; list[i].visible = true; return list[i];
    }
    var g = this.geos[id][variant], M = EP.Materials;
    var mesh = new THREE.Mesh(g.world, M.world);
    mesh.frustumCulled = false;   // a curvatura move os vértices: o recorte padrão erraria
    if (g.glow) { var gl = new THREE.Mesh(g.glow, M.glow); gl.frustumCulled = false; mesh.add(gl); }
    if (g.water) { var wa = new THREE.Mesh(g.water, M.water); wa.frustumCulled = false; mesh.add(wa); }
    mesh.matrixAutoUpdate = false;
    mesh.userData = { busy: true, variant: variant, id: id };
    this.scene.add(mesh);
    list.push(mesh);
    return mesh;
  };

  P._release = function (seg) {
    seg.mesh.userData.busy = false;
    seg.mesh.visible = false;
    if (seg.signs) { seg.mesh.remove(seg.signs); }
  };

  // opts: { firstRun, startZ }
  P.reset = function (opts) {
    var self = this;
    this.segments.forEach(function (s) { self._release(s); });
    this.segments = [];
    this.route = this.biome.startRoute;
    this.routeLeft = Infinity;
    this.sinceFork = 0;
    this.forkDue = opts && opts.firstRun ? this.W.firstForkAfter : Math.round(U.range(this.W.forkEvery));
    this.pending = null;
    this.recent = [];
    this.zEnd = (opts && opts.startZ !== undefined) ? opts.startZ : 40;
    this._append(this.defs[this.routes[this.route].modules[0]]);
    this.update(0);
  };

  P._next = function () {
    var self = this;
    if (this.route === this.biome.startRoute && this.sinceFork >= this.forkDue && this.forks.length) {
      var fork = U.pick(this.forks, this.rnd);
      return { def: this.defs[fork.module], fork: fork };
    }
    var list = this.routes[this.route].modules.filter(function (id) { return self.defs[id] && self.recent.indexOf(id) < 0; });
    if (!list.length) {
      var last = this.recent[this.recent.length - 1];
      list = this.routes[this.route].modules.filter(function (id) { return id !== last; });
    }
    return { def: this.defs[U.pick(list, this.rnd)] };
  };

  P._append = function (def, fork) {
    var variant = Math.floor(this.rnd() * this.W.variants);
    var mirror = def.mirror !== false && this.rnd() < 0.5;
    var seg = { def: def, z0: this.zEnd, z1: this.zEnd - def.length, route: this.route, mirror: mirror, fork: fork || null, choice: 0 };
    seg.mesh = this._acquire(def.id, variant);
    seg.mesh.position.set(0, 0, seg.z0);
    seg.mesh.scale.x = mirror ? -1 : 1;
    seg.mesh.updateMatrix();
    this.zEnd = seg.z1;
    this.segments.push(seg);
    this.recent.push(def.id);
    if (this.recent.length > this.W.recentBlock) this.recent.shift();
    if (fork) {
      this.pending = seg;
      if (this.signMeshes) { seg.signs = this.signMeshes; seg.mesh.add(this.signMeshes); }
    } else {
      this.sinceFork++;
      if (this.route !== this.biome.startRoute && --this.routeLeft <= 0) this.route = this.biome.startRoute;
    }
    return seg;
  };

  P.indexAt = function (z) {
    for (var i = 0; i < this.segments.length; i++) if (z <= this.segments[i].z0 && z > this.segments[i].z1) return i;
    return z > (this.segments[0] && this.segments[0].z0) ? 0 : this.segments.length - 1;
  };
  P.segmentAt = function (z) { return this.segments[this.indexAt(z)]; };

  // mantém a janela: alguns módulos atrás, alguns à frente (parando na bifurcação pendente)
  P.update = function (playerZ) {
    var cur = this.indexAt(playerZ);
    while (cur > this.W.behind) { this._release(this.segments.shift()); cur--; }
    while (!this.pending && this.segments.length - 1 - cur < this.W.ahead) {
      var n = this._next();
      this._append(n.def, n.fork);
    }
  };

  // escolha na bifurcação: side -1 esquerda, +1 direita
  P.choose = function (side) {
    var seg = this.pending;
    if (!seg) return null;
    var routeId = side < 0 ? seg.fork.left : seg.fork.right;
    seg.choice = side;
    this.pending = null;
    this.route = routeId;
    this.routeLeft = Math.round(U.range(this.routes[routeId].length || [4, 6]));
    this.sinceFork = 0;
    this.forkDue = Math.round(U.range(this.W.forkEvery));
    return routeId;
  };

  // distância (m) do corredor até o começo do canteiro da bifurcação pendente
  P.forkDistance = function (playerZ) {
    var seg = this.pending;
    return seg ? playerZ - (seg.z0 - seg.def.divider.from) : Infinity;
  };

  // limites laterais no ponto z (o canteiro da bifurcação divide a rua em dois)
  P.limitsAt = function (z, x, limit) {
    var seg = this.segmentAt(z), dv = seg && seg.def.divider;
    if (dv) {
      var dl = seg.z0 - z;
      if (dl > dv.from - 1.5 && dl < dv.to + 1.5) {
        var gap = dv.halfWidth + 0.45;
        return x < 0 ? [-limit, -gap] : [gap, limit];
      }
    }
    return [-limit, limit];
  };

  // curvatura do trecho à frente, com o sinal do espelhamento
  P.curvatureAt = function (z) {
    var seg = this.segmentAt(z);
    return seg ? (seg.def.curvature || 0) * (seg.mirror ? -1 : 1) : 0;
  };

  P.rebase = function (shift) {
    this.segments.forEach(function (s) {
      s.z0 += shift; s.z1 += shift;
      s.mesh.position.z += shift;
      s.mesh.updateMatrix();
    });
    this.zEnd += shift;
  };

  P.setSigns = function (group) { this.signMeshes = group; };

  EP.ProceduralWorldGenerator = ProceduralWorldGenerator;
})(window.EP);
