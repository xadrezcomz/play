// RunnerRig — o boneco do corredor (GDD §5): proporções humanas estilizadas,
// formas arredondadas (nada de blocos), rosto simpático e cabelo com volume.
// São 7 peças articuladas (tronco, braços, coxas e canelas), todas com o
// mesmo material e a cor guardada em cada vértice.
//
// Desempenho: a forma de cada peça é montada uma vez por "molde" (gênero +
// cabelo) e compartilhada entre todos os corredores; trocar a roupa de um
// corredor da rua só reescreve as cores (rápido, sem criar geometria).
(function (EP) {
  'use strict';
  var U = EP.util;
  var STRIDE = [[0, 0.85], [4, 0.9], [6, 1.0], [8, 1.28], [12, 1.42], [16, 1.55], [21, 1.68]];   // ciclos por segundo
  var THIGH = 0.45, HIP_H = 0.91, ARM_BEND = 1.2;
  var DISC = null;

  // espaços de cor de cada vértice (o molde guarda o espaço, o corredor dá a cor)
  var C = { skin: 0, skinShade: 1, hair: 2, shirt: 3, shirtTrim: 4, shorts: 5, shortsTrim: 6, sock: 7, shoe: 8, sole: 9,
    eyeWhite: 10, eye: 11, mouth: 12, bib: 13, bibStripe: 14, brow: 15, cheek: 16 };
  var NSLOT = 17;
  var PARTS = ['torso', 'armL', 'armR', 'thighL', 'thighR', 'shinL', 'shinR'];
  var templates = {};

  function body(gender) {
    var g = EP.data.appearance.genders.filter(function (x) { return x.id === gender; })[0] || EP.data.appearance.genders[0];
    return g.body;
  }

  // ---------------------------------------------------------------- cabelo
  function hair(gb, style, female) {
    var hy = 0.69;
    gb.partId = C.hair;
    if (style === 'cacheado') {
      gb.add('sph16', 0, hy + 0.06, 0.02, 0.27, 0.22, 0.27, '#000');
      [[0.1, 0.1, -0.04], [-0.1, 0.1, -0.04], [0, 0.15, 0.0], [0.12, 0.04, 0.07], [-0.12, 0.04, 0.07], [0, 0.08, 0.12],
        [0.06, 0.13, 0.08], [-0.06, 0.13, 0.08], [0.0, 0.13, -0.07]].forEach(function (b) {
        gb.add('sph8', b[0], hy + b[1], b[2], 0.12, 0.11, 0.12, '#000');
      });
      return;
    }
    if (style === 'raspado') {
      gb.add('sph16', 0, hy + 0.035, 0.018, 0.212, 0.2, 0.218, '#000');
      return;
    }
    // base: touca de cabelo que deixa a testa e o rosto livres
    gb.add('sph16', 0, hy + 0.045, 0.028, 0.222, 0.2, 0.222, '#000');
    gb.add('sph16', 0, hy - 0.005, 0.05, 0.208, 0.19, 0.18, '#000');            // nuca
    gb.add('sph8', 0.03, hy + 0.1, -0.075, 0.13, 0.05, 0.07, '#000', 0, 0.3, -0.25);   // franja
    gb.add('sph8', -0.06, hy + 0.095, -0.07, 0.1, 0.045, 0.06, '#000', 0, 0.3, 0.3);
    if (style === 'rabo') {
      gb.add('sph8', 0, hy + 0.04, 0.13, 0.07, 0.07, 0.07, '#000');
      gb.add('sph8', 0, hy - 0.03, 0.16, 0.085, 0.12, 0.08, '#000', 0, -0.4);
      gb.add('sph8', 0, hy - 0.13, 0.175, 0.065, 0.11, 0.06, '#000', 0, -0.2);
    } else if (style === 'coque') {
      gb.add('sph16', 0, hy + 0.14, 0.09, 0.12, 0.11, 0.12, '#000');
    } else if (style === 'longo') {
      gb.add('taper10', 0, hy - 0.11, 0.07, 0.24, 0.26, 0.13, '#000', 0, Math.PI);
      gb.add('sph8', 0, hy - 0.24, 0.07, 0.2, 0.08, 0.11, '#000');
    } else if (female && style === 'curto') {
      gb.add('sph8', 0, hy - 0.05, 0.08, 0.2, 0.14, 0.12, '#000');
    }
  }

  // ---------------------------------------------------------------- moldes
  function buildTemplate(gender, hairStyle) {
    var b = body(gender), sh = b.shoulders, hp = b.hips, female = gender === 'f', GB = EP.GeoBuilder, out = {};
    var gb;
    // tronco (origem na altura do quadril)
    gb = new GB();
    gb.partId = C.shorts;
    gb.add('sph16', 0, 0.01, 0, hp + 0.05, 0.22, 0.2, '#000');                 // quadril
    gb.partId = C.shortsTrim;
    gb.add('cyl10', 0, 0.115, 0, hp + 0.075, 0.035, 0.235, '#000');           // cós
    gb.partId = C.shirt;
    gb.add('taper10', 0, 0.2, 0, sh * 0.74, 0.26, 0.19, '#000', 0, Math.PI); // barriga
    gb.add('sph16', 0, 0.37, 0, sh * 0.92, 0.27, 0.205, '#000');              // peito
    gb.add('sph8', sh / 2 - 0.035, 0.435, 0, 0.11, 0.1, 0.11, '#000');         // ombros
    gb.add('sph8', -sh / 2 + 0.035, 0.435, 0, 0.11, 0.1, 0.11, '#000');
    if (female) gb.add('sph16', 0, 0.355, -0.06, sh * 0.55, 0.11, 0.09, '#000');
    gb.partId = C.shirtTrim;
    gb.add('cyl10', 0, 0.5, 0, 0.13, 0.03, 0.12, '#000');                      // gola
    gb.partId = C.bib;
    gb.add('box', 0, 0.32, 0.104, 0.16, 0.12, 0.012, '#000');
    gb.partId = C.bibStripe;
    gb.add('box', 0, 0.363, 0.109, 0.16, 0.026, 0.01, '#000');
    gb.partId = C.skin;
    gb.add('cyl10', 0, 0.535, 0, 0.095, 0.08, 0.095, '#000');                 // pescoço
    gb.add('sph16', 0, 0.68, 0, 0.2, 0.235, 0.215, '#000');                     // cabeça
    gb.add('sph8', 0, 0.618, -0.012, 0.13, 0.09, 0.13, '#000');                  // queixo
    gb.partId = C.skinShade;
    gb.add('sph8', 0.102, 0.67, 0.008, 0.04, 0.065, 0.04, '#000');              // orelhas
    gb.add('sph8', -0.102, 0.67, 0.008, 0.04, 0.065, 0.04, '#000');
    gb.add('sph8', 0, 0.66, -0.108, 0.032, 0.04, 0.032, '#000');                // nariz
    gb.partId = C.eyeWhite;
    gb.add('sph8', 0.041, 0.688, -0.097, 0.032, 0.028, 0.014, '#000');
    gb.add('sph8', -0.041, 0.688, -0.097, 0.032, 0.028, 0.014, '#000');
    gb.partId = C.eye;
    gb.add('sph8', 0.041, 0.687, -0.103, 0.018, 0.021, 0.008, '#000');
    gb.add('sph8', -0.041, 0.687, -0.103, 0.018, 0.021, 0.008, '#000');
    gb.partId = C.brow;
    gb.add('sph8', 0.043, 0.72, -0.098, 0.042, 0.009, 0.012, '#000', 0, 0, -0.08);
    gb.add('sph8', -0.043, 0.72, -0.098, 0.042, 0.009, 0.012, '#000', 0, 0, 0.08);
    gb.partId = C.mouth;
    gb.add('sph8', 0, 0.632, -0.097, 0.034, 0.009, 0.01, '#000');
    hair(gb, hairStyle, female);
    out.torso = gb;

    // braços: manga, braço, cotovelo, antebraço dobrado e mão
    ['armL', 'armR'].forEach(function (name) {
      gb = new GB();
      gb.partId = C.shirt;
      gb.add('taper10', 0, -0.06, 0, 0.125, 0.14, 0.125, '#000', 0, Math.PI);
      gb.partId = C.shirtTrim;
      gb.add('cyl10', 0, -0.13, 0, 0.112, 0.02, 0.112, '#000');
      gb.partId = C.skin;
      gb.add('taper10', 0, -0.15, 0, 0.085, 0.24, 0.085, '#000', 0, Math.PI);
      gb.add('sph8', 0, -0.27, 0, 0.078, 0.078, 0.078, '#000');
      var dy = -Math.cos(ARM_BEND), dz = -Math.sin(ARM_BEND);
      gb.add('taper10', 0, -0.27 + dy * 0.12, dz * 0.12, 0.072, 0.24, 0.072, '#000', 0, ARM_BEND + Math.PI);
      gb.add('sph8', 0, -0.27 + dy * 0.255, dz * 0.255, 0.075, 0.09, 0.065, '#000');
      out[name] = gb;
    });
    // coxas: perna do short e coxa
    ['thighL', 'thighR'].forEach(function (name) {
      gb = new GB();
      gb.partId = C.shorts;
      gb.add('taper10', 0, -0.09, 0, 0.2, 0.22, 0.21, '#000', 0, Math.PI);
      gb.partId = C.shortsTrim;
      gb.add('cyl10', 0, -0.2, 0, 0.185, 0.02, 0.19, '#000');
      gb.partId = C.skin;
      gb.add('taper10', 0, -0.24, 0, 0.15, 0.42, 0.155, '#000', 0, Math.PI);
      gb.add('sph8', 0, -THIGH, 0, 0.11, 0.1, 0.11, '#000');                   // joelho
      out[name] = gb;
    });
    // canelas: panturrilha, meia e tênis arredondado
    ['shinL', 'shinR'].forEach(function (name) {
      gb = new GB();
      gb.partId = C.skin;
      gb.add('taper10', 0, -0.2, 0, 0.1, 0.38, 0.105, '#000', 0, Math.PI);
      gb.add('sph8', 0, -0.13, 0.018, 0.115, 0.2, 0.12, '#000');
      gb.partId = C.sock;
      gb.add('cyl10', 0, -0.375, 0, 0.098, 0.07, 0.1, '#000');
      gb.partId = C.shoe;
      gb.add('sph16', 0, -0.415, -0.05, 0.125, 0.1, 0.28, '#000');
      gb.add('sph8', 0, -0.405, 0.04, 0.11, 0.1, 0.11, '#000');                // calcanhar
      gb.partId = C.sole;
      gb.add('sph16', 0, -0.445, -0.045, 0.13, 0.035, 0.29, '#000');
      out[name] = gb;
    });

    // vira geometria compartilhada (posição e normal) + espaço de cor de cada vértice
    var t = {};
    PARTS.forEach(function (name) {
      var g = out[name];
      t[name] = {
        pos: new THREE.Float32BufferAttribute(g.pos, 3),
        nor: new THREE.Float32BufferAttribute(g.nor, 3),
        slot: new Uint8Array(g.part),
        n: g.part.length
      };
    });
    return t;
  }

  function template(gender, hairStyle) {
    var k = gender + '|' + hairStyle;
    return templates[k] || (templates[k] = buildTemplate(gender, hairStyle));
  }

  // ---------------------------------------------------------------- boneco
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
    if (!DISC) DISC = new THREE.CircleGeometry(0.46, 20).rotateX(-Math.PI / 2);
    this.shadow = new THREE.Mesh(DISC, M.shadow);
    this.shadow.position.y = 0.03;
    this.shadow.frustumCulled = false;
    this.shadow.renderOrder = 1;
    this.root.add(this.shadow);
    this.phase = Math.random() * Math.PI * 2;
    this.idleT = Math.random() * 10;
    this.onStep = null;   // chamado a cada pisada (som de passos)
    this._key = '';
    this._geos = {};
    this._pal = [];
    for (var i = 0; i < NSLOT; i++) this._pal.push(new THREE.Color());
  }
  var P = RunnerRig.prototype;

  var _c = new THREE.Color();
  function lin(hex, out) { return out.set(hex).convertSRGBToLinear(); }

  // app: cores já resolvidas { gender, skin, hairStyle, hair, shirt, shorts, shoes, bib }
  P.setAppearance = function (app) {
    var b = body(app.gender), k = b.height / 1.76, sh = b.shoulders, hp = b.hips, self = this;
    this.app = app;
    this.body.scale.setScalar(k);
    this.hips.position.set(0, HIP_H, 0);
    this.legL.position.set(-hp * 0.3, 0, 0); this.legR.position.set(hp * 0.3, 0, 0);
    this.kneeL.position.set(0, -THIGH, 0); this.kneeR.position.set(0, -THIGH, 0);
    this.armL.position.set(-sh / 2 - 0.035, 0.43, 0); this.armR.position.set(sh / 2 + 0.035, 0.43, 0);
    var key = app.gender + '|' + app.hairStyle, t = template(app.gender, app.hairStyle);
    // paleta deste corredor (cores lineares)
    var p = this._pal;
    lin(app.skin, p[C.skin]);
    p[C.skinShade].copy(p[C.skin]).multiplyScalar(0.86);
    lin(app.hair, p[C.hair]);
    lin(app.shirt, p[C.shirt]);
    p[C.shirtTrim].copy(p[C.shirt]).multiplyScalar(0.62);
    lin(app.shorts, p[C.shorts]);
    p[C.shortsTrim].copy(p[C.shorts]).lerp(lin('#ffffff', _c), 0.55);
    lin('#f2f2f0', p[C.sock]);
    lin(app.shoes, p[C.shoe]);
    lin('#fafafa', p[C.sole]);
    lin('#ffffff', p[C.eyeWhite]);
    lin('#2b211c', p[C.eye]);
    lin('#7a3b33', p[C.mouth]);
    if (app.bib) { lin('#ffffff', p[C.bib]); lin(app.bib, p[C.bibStripe]); }
    else { p[C.bib].copy(p[C.shirt]); p[C.bibStripe].copy(p[C.shirt]); }
    p[C.brow].copy(p[C.hair]).multiplyScalar(0.8);
    p[C.cheek].copy(p[C.skin]).lerp(lin('#ff8f86', _c), 0.12);
    // cada corredor guarda uma geometria por molde (só a cor é dele; forma é compartilhada)
    var set = this._geos[key];
    if (!set) {
      set = this._geos[key] = {};
      PARTS.forEach(function (name) {
        var tp = t[name], g = new THREE.BufferGeometry();
        g.setAttribute('position', tp.pos);
        g.setAttribute('normal', tp.nor);
        g.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(tp.n * 3), 3));
        set[name] = g;
      });
    }
    PARTS.forEach(function (name) {
      var mesh = self.m[name], tp = t[name], g = set[name];
      mesh.geometry = g;
      var col = g.attributes.color.array, slot = tp.slot;
      for (var i = 0, j = 0; i < tp.n; i++, j += 3) {
        var c = p[slot[i]];
        col[j] = c.r; col[j + 1] = c.g; col[j + 2] = c.b;
      }
      g.attributes.color.needsUpdate = true;
    });
    this._key = key;
  };

  // anima a passada. opts: { idle (parado na tela inicial), celebrate, lateral (velocidade de lado) }
  P.animate = function (dt, speed, opts) {
    opts = opts || {};
    var run = U.smooth((speed - 5.5) / 2.5), sprint = U.smooth((speed - 14) / 5);
    if (opts.idle || opts.celebrate) {
      this.phase += dt * (opts.celebrate ? 5 : 1.6);
      this.idleT += dt;
      var br = Math.sin(this.phase);
      if (opts.celebrate) {
        var hop = Math.max(0, Math.sin(this.phase));
        this.hips.position.y = HIP_H + hop * 0.06;
        this.torso.rotation.set(0.05, 0, 0);
        this.legL.rotation.set(-hop * 0.2, 0, 0.05); this.legR.rotation.set(-hop * 0.2, 0, -0.05);
        this.kneeL.rotation.x = -hop * 0.4; this.kneeR.rotation.x = -hop * 0.4;
        this.armL.rotation.set(Math.PI * 0.95, 0, -0.35 - hop * 0.15); this.armR.rotation.set(Math.PI * 0.95, 0, 0.35 + hop * 0.15);
      } else {
        // respira, troca o peso de perna e às vezes alonga os braços
        var sway = Math.sin(this.idleT * 0.7) * 0.04, stretch = U.smooth((Math.sin(this.idleT * 0.35) - 0.85) / 0.15);
        this.hips.position.y = HIP_H + br * 0.006;
        this.hips.rotation.z = sway * 0.4;
        this.hips.rotation.y = 0;
        this.torso.rotation.set(-0.02 + br * 0.012, 0, -sway * 0.5);
        this.legL.rotation.set(0.02, 0, 0.03 - sway * 0.3); this.legR.rotation.set(-0.02, 0, -0.03 - sway * 0.3);
        this.kneeL.rotation.x = -0.04 - Math.max(0, sway) * 1.2; this.kneeR.rotation.x = -0.04 - Math.max(0, -sway) * 1.2;
        this.armL.rotation.set(0.12 + br * 0.03 + stretch * 2.6, 0, -0.12 - stretch * 0.2);
        this.armR.rotation.set(0.1 - br * 0.03 + stretch * 2.6, 0, 0.12 + stretch * 0.2);
      }
      this.root.rotation.z = 0;
      return;
    }
    this.hips.rotation.z = 0;
    var prev = this.phase;
    this.phase += dt * Math.PI * 2 * U.table(STRIDE, speed);
    var s = Math.sin(this.phase), c = Math.cos(this.phase);
    var A = U.lerp(0.42, 0.8, run) + sprint * 0.14, bias = run * 0.12;
    this.legL.rotation.set(A * s + bias, 0, 0);
    this.legR.rotation.set(-A * s + bias, 0, 0);
    var kb = U.lerp(0.06, 0.3, run), kk = U.lerp(0.5, 1.5, run) + sprint * 0.2;
    this.kneeL.rotation.x = -(kb + kk * Math.pow(Math.max(0, c), 1.4));
    this.kneeR.rotation.x = -(kb + kk * Math.pow(Math.max(0, -c), 1.4));
    var aa = U.lerp(0.32, 0.72, run) + sprint * 0.18;
    this.armL.rotation.set(-aa * s + 0.1 * run, 0, -0.08);
    this.armR.rotation.set(aa * s + 0.1 * run, 0, 0.08);
    var bob = U.lerp(-0.018 * (Math.abs(s) - 0.5), 0.05 * (Math.abs(s) - 0.5), run);
    this.hips.position.y = HIP_H - run * 0.03 + bob;
    this.hips.rotation.y = -0.07 * s;
    this.torso.rotation.set(-(U.lerp(0.04, 0.12, run) + sprint * 0.07), 0.12 * s * (0.5 + run * 0.5), 0);
    this.root.rotation.z = U.damp(this.root.rotation.z, -(opts.lateral || 0) * 0.05, 8, dt);
    // pisada: quando o seno troca de sinal
    if (this.onStep && Math.sin(prev) * s < 0) this.onStep(s > 0 ? 1 : -1);
  };

  P.dispose = function () {
    for (var k in this._geos) for (var n in this._geos[k]) this._geos[k][n].dispose();
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
      hairStyle: g === 'f' ? (rnd() < 0.5 ? 'rabo' : U.pick(styles, rnd)) : (rnd() < 0.6 ? 'curto' : U.pick(['cacheado', 'raspado', 'curto'], rnd)),
      hair: U.pick(A.hairColors, rnd),
      shirt: U.pick(rnd() < 0.5 ? A.npcShirts : A.shirts, rnd), shorts: U.pick(A.npcShorts, rnd), shoes: U.pick(A.npcShoes, rnd),
      bib: rnd() < 0.35 ? U.pick(['#2fb5ff', '#20c997', '#ffd23f'], rnd) : null
    };
  };

  RunnerRig.templateCount = function () { return Object.keys(templates).length; };
  EP.RunnerRig = RunnerRig;
})(window.EP);
