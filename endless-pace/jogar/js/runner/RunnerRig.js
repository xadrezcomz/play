// RunnerRig — o boneco do corredor (GDD §5): proporções humanas estilizadas,
// rosto simples, silhueta fácil de ler. Feito de 7 peças articuladas (tronco,
// braços, coxas e canelas) com as cores nos vértices: um material só para
// todos os corredores. A corrida é animada por código, sem arquivos.
(function (EP) {
  'use strict';
  var U = EP.util;
  var STRIDE = [[0, 0.85], [4, 0.9], [6, 1.0], [8, 1.28], [12, 1.42], [16, 1.55], [21, 1.68]];   // ciclos por segundo
  var THIGH = 0.44, HIP_H = 0.88, ARM_BEND = 1.15;
  var DISC = null;

  function RunnerRig() {
    var M = EP.Materials;
    this.root = new THREE.Group();
    this.body = new THREE.Group();          // leva a escala (altura)
    this.root.add(this.body);
    this.hips = new THREE.Group();
    this.body.add(this.hips);
    this.torso = new THREE.Group();
    this.hips.add(this.torso);
    this.legL = new THREE.Group(); this.legR = new THREE.Group();
    this.kneeL = new THREE.Group(); this.kneeR = new THREE.Group();
    this.armL = new THREE.Group(); this.armR = new THREE.Group();
    this.hips.add(this.legL, this.legR);
    this.legL.add(this.kneeL); this.legR.add(this.kneeR);
    this.torso.add(this.armL, this.armR);
    var mk = function () { var m = new THREE.Mesh(new THREE.BufferGeometry(), M.runner); m.frustumCulled = false; return m; };
    this.m = { torso: mk(), armL: mk(), armR: mk(), thighL: mk(), thighR: mk(), shinL: mk(), shinR: mk() };
    this.torso.add(this.m.torso);
    this.armL.add(this.m.armL); this.armR.add(this.m.armR);
    this.legL.add(this.m.thighL); this.legR.add(this.m.thighR);
    this.kneeL.add(this.m.shinL); this.kneeR.add(this.m.shinR);
    if (!DISC) DISC = new THREE.CircleGeometry(0.42, 16).rotateX(-Math.PI / 2);
    this.shadow = new THREE.Mesh(DISC, M.shadow);
    this.shadow.position.y = 0.03;
    this.shadow.frustumCulled = false;
    this.shadow.renderOrder = 1;
    this.root.add(this.shadow);
    this.phase = Math.random() * Math.PI * 2;
    this.lastStepSide = 0;
    this.onStep = null;   // chamado a cada pisada (som de passos)
  }
  var P = RunnerRig.prototype;

  function hairGeo(gb, style, c, gender) {
    var hy = 0.70;
    if (style === 'cacheado') {
      gb.add('ico1', 0, hy + 0.06, 0.012, 0.29, 0.25, 0.29, c);
      var bumps = [[0.09, 0.12, -0.05], [-0.09, 0.12, -0.05], [0, 0.16, 0.02], [0.11, 0.06, 0.06], [-0.11, 0.06, 0.06], [0, 0.08, 0.11]];
      bumps.forEach(function (b) { gb.add('ico1', b[0], hy + b[1], b[2], 0.13, 0.12, 0.13, c); });
    } else {
      gb.add('sph', 0, hy + 0.035, 0.012, 0.25, 0.22, 0.255, c);                // touca de cabelo
      gb.add('sph', 0, hy + 0.0, 0.035, 0.24, 0.2, 0.22, c);                    // nuca
      gb.add('box', 0, hy + 0.085, -0.088, 0.2, 0.05, 0.06, c, 0, 0.35);       // franja
      if (style === 'rabo') {
        gb.add('sph', 0, hy + 0.05, 0.135, 0.07, 0.07, 0.07, c);
        gb.add('sph', 0, hy - 0.06, 0.17, 0.085, 0.2, 0.08, c, 0, -0.35);
      }
    }
  }

  // app: cores já resolvidas { gender, skin, hairStyle, hair, shirt, shorts, shoes, bib }
  P.setAppearance = function (app) {
    var gd = EP.data.appearance.genders.filter(function (g) { return g.id === app.gender; })[0] || EP.data.appearance.genders[0];
    var b = gd.body, k = b.height / 1.76, sh = b.shoulders, hp = b.hips;
    this.app = app;
    this.body.scale.setScalar(k);
    this.hips.position.set(0, HIP_H, 0);
    this.legL.position.set(-hp * 0.3, 0, 0); this.legR.position.set(hp * 0.3, 0, 0);
    this.kneeL.position.set(0, -THIGH, 0); this.kneeR.position.set(0, -THIGH, 0);
    this.armL.position.set(-sh / 2 - 0.02, 0.47, 0); this.armR.position.set(sh / 2 + 0.02, 0.47, 0);
    var skin = app.skin, GB = EP.GeoBuilder, gb;

    // tronco: short, camiseta, pescoço, cabeça, rosto e cabelo
    gb = new GB();
    gb.add('box', 0, -0.03, 0, hp + 0.02, 0.24, 0.22, app.shorts);
    gb.add('taper8', 0, 0.27, 0, sh + 0.02, 0.52, 0.25, app.shirt, 0, Math.PI);
    gb.add('cyl8', 0, 0.5, 0, sh * 0.62, 0.06, 0.2, app.shirt);
    if (app.gender === 'f') gb.add('sph', 0, 0.36, -0.055, sh * 0.6, 0.13, 0.09, app.shirt);
    gb.add('box', 0, 0.06, 0, sh * 0.8, 0.05, 0.225, GB.shade(app.shirt, 0.8));    // barra
    if (app.bib) { gb.add('box', 0, 0.3, 0.118, 0.17, 0.13, 0.01, '#ffffff'); gb.add('box', 0, 0.34, 0.124, 0.17, 0.025, 0.01, app.bib); }
    gb.add('cyl8', 0, 0.56, 0, 0.1, 0.1, 0.1, skin);
    gb.add('sph', 0, 0.7, 0, 0.21, 0.245, 0.225, skin);
    gb.add('sph', 0.108, 0.695, 0.005, 0.04, 0.065, 0.045, skin);
    gb.add('sph', -0.108, 0.695, 0.005, 0.04, 0.065, 0.045, skin);
    gb.add('sph', 0.042, 0.71, -0.1, 0.032, 0.038, 0.02, '#2a201b');
    gb.add('sph', -0.042, 0.71, -0.1, 0.032, 0.038, 0.02, '#2a201b');
    gb.add('box', 0, 0.685, -0.112, 0.028, 0.04, 0.03, GB.shade(skin, 0.94));
    gb.add('box', 0, 0.645, -0.104, 0.05, 0.012, 0.01, GB.shade(skin, 0.7));
    hairGeo(gb, app.hairStyle, app.hair, app.gender);
    this._set('torso', gb);

    // braços: manga, braço, antebraço dobrado (pose de corrida) e mão
    var self = this;
    ['armL', 'armR'].forEach(function (name) {
      gb = new GB();
      gb.add('cyl8', 0, -0.055, 0, 0.125, 0.13, 0.125, app.shirt);
      gb.add('taper8', 0, -0.14, 0, 0.095, 0.27, 0.095, skin, 0, Math.PI);
      var dy = -Math.cos(ARM_BEND), dz = -Math.sin(ARM_BEND);
      gb.add('taper8', 0, -0.27 + dy * 0.12, dz * 0.12, 0.085, 0.24, 0.085, skin, 0, ARM_BEND + Math.PI);
      gb.add('sph', 0, -0.27 + dy * 0.26, dz * 0.26, 0.085, 0.095, 0.085, skin);
      self._set(name, gb);
    });
    ['thighL', 'thighR'].forEach(function (name) {
      gb = new GB();
      gb.add('cyl8', 0, -0.08, 0, 0.19, 0.2, 0.2, app.shorts);
      gb.add('taper8', 0, -0.23, 0, 0.155, 0.44, 0.16, skin, 0, Math.PI);
      self._set(name, gb);
    });
    ['shinL', 'shinR'].forEach(function (name) {
      gb = new GB();
      gb.add('taper8', 0, -0.19, 0, 0.118, 0.38, 0.122, skin, 0, Math.PI);
      gb.add('cyl8', 0, -0.36, 0, 0.098, 0.07, 0.1, '#f4f4f4');
      gb.add('box', 0, -0.405, -0.045, 0.12, 0.08, 0.26, app.shoes);
      gb.add('box', 0, -0.434, -0.045, 0.126, 0.024, 0.272, GB.shade(app.shoes, 0.6).lerp(new THREE.Color(1, 1, 1), 0.7));
      self._set(name, gb);
    });
  };

  P._set = function (name, gb) {
    var m = this.m[name];
    if (m.geometry) m.geometry.dispose();
    m.geometry = gb.build();
  };

  // anima a passada. opts: { idle (parado na tela inicial), lateral (velocidade de lado), lean }
  P.animate = function (dt, speed, opts) {
    opts = opts || {};
    var run = U.smooth((speed - 5.5) / 2.5), sprint = U.smooth((speed - 14) / 5);
    if (opts.idle) {
      this.phase += dt * 1.6;
      var br = Math.sin(this.phase);
      this.hips.position.y = HIP_H + br * 0.006;
      this.torso.rotation.set(-0.02 + br * 0.01, 0, 0);
      this.legL.rotation.set(0.02, 0, 0.03); this.legR.rotation.set(-0.02, 0, -0.03);
      this.kneeL.rotation.x = -0.05; this.kneeR.rotation.x = -0.03;
      this.armL.rotation.set(0.15 + br * 0.03, 0, -0.1); this.armR.rotation.set(0.12 - br * 0.03, 0, 0.1);
      this.root.rotation.z = 0;
      return;
    }
    var prev = this.phase;
    this.phase += dt * Math.PI * 2 * U.table(STRIDE, speed);
    var s = Math.sin(this.phase), c = Math.cos(this.phase);
    var A = U.lerp(0.42, 0.78, run) + sprint * 0.14, bias = run * 0.12;
    this.legL.rotation.set(A * s + bias, 0, 0);
    this.legR.rotation.set(-A * s + bias, 0, 0);
    var kb = U.lerp(0.06, 0.3, run), kk = U.lerp(0.5, 1.45, run) + sprint * 0.2;
    this.kneeL.rotation.x = -(kb + kk * Math.pow(Math.max(0, c), 1.4));
    this.kneeR.rotation.x = -(kb + kk * Math.pow(Math.max(0, -c), 1.4));
    var aa = U.lerp(0.32, 0.72, run) + sprint * 0.18;
    this.armL.rotation.set(-aa * s + 0.1 * run, 0, -0.06);
    this.armR.rotation.set(aa * s + 0.1 * run, 0, 0.06);
    var bob = U.lerp(-0.018 * (Math.abs(s) - 0.5), 0.055 * (Math.abs(s) - 0.5), run);
    this.hips.position.y = HIP_H - run * 0.03 + bob;
    this.hips.rotation.y = -0.07 * s;
    this.torso.rotation.set(-(U.lerp(0.04, 0.13, run) + sprint * 0.08), 0.13 * s * (0.5 + run * 0.5), 0);
    this.root.rotation.z = U.damp(this.root.rotation.z, -(opts.lateral || 0) * 0.05, 8, dt);
    // pisada: quando o seno troca de sinal
    if (this.onStep && Math.sin(prev) * s < 0) this.onStep(s > 0 ? 1 : -1);
  };

  P.dispose = function () {
    for (var k in this.m) this.m[k].geometry.dispose();
  };

  // aparência guardada no save (índices) → cores
  RunnerRig.resolve = function (profile) {
    var A = EP.data.appearance, a = profile.appearance;
    return {
      gender: profile.gender, skin: A.skin[a.skin] || A.skin[0], hairStyle: a.hairStyle, hair: A.hairColors[a.hairColor] || A.hairColors[0],
      shirt: A.shirts[a.shirt] || A.shirts[0], shorts: A.shorts[a.shorts] || A.shorts[0], shoes: A.shoes[a.shoes] || A.shoes[0], bib: '#ff6a3d'
    };
  };

  // aparência sorteada para os corredores da rua
  RunnerRig.random = function (rnd) {
    var A = EP.data.appearance;
    rnd = rnd || Math.random;
    var g = rnd() < 0.5 ? 'm' : 'f';
    var styles = A.hairStyles.map(function (h) { return h.id; });
    return {
      gender: g, skin: U.pick(A.skin, rnd),
      hairStyle: g === 'f' ? (rnd() < 0.6 ? 'rabo' : U.pick(styles, rnd)) : (rnd() < 0.7 ? 'curto' : 'cacheado'),
      hair: U.pick(A.hairColors, rnd),
      shirt: U.pick(rnd() < 0.5 ? A.npcShirts : A.shirts, rnd), shorts: U.pick(A.npcShorts, rnd), shoes: U.pick(A.npcShoes, rnd),
      bib: rnd() < 0.35 ? U.pick(['#2fb5ff', '#20c997', '#ffd23f'], rnd) : null
    };
  };

  EP.RunnerRig = RunnerRig;
})(window.EP);
