// RunnerRig — o corredor (GDD §5): humano estilizado esculpido (js/runner/
// BodyModel.js), com roupas de verdade por cima do corpo, animado por 14
// ossos (quadril, tronco, cabeça, braços, cotovelos, coxas, joelhos, pés e
// rabo de cavalo). Uma malha só por corredor (uma chamada de desenho).
//
// Desempenho: a forma de cada combinação (gênero + cabelo + roupa + nível de
// detalhe) é montada uma vez e compartilhada; cada corredor só tem a sua cor
// por vértice. Os corredores da rua usam moldes mais leves quando longe (LOD).
(function (EP) {
  'use strict';
  var U = EP.util, BM = EP.BodyModel, C = BM.C;
  // ciclos (2 passos) por segundo: 163 passos/min a 10 km/h, 182 a 20 km/h (como um corredor de verdade)
  var STRIDE = [[0, 0.85], [4, 0.9], [6, 1.02], [7.5, 1.3], [10, 1.36], [12, 1.4], [15, 1.45], [20, 1.52], [22, 1.55]];
  // fração do ciclo com o pé no chão: caminhando quase sempre, correndo cada vez menos
  var DUTY = [[4, 0.62], [6, 0.6], [7.5, 0.42], [10, 0.37], [15, 0.31], [20, 0.27], [24, 0.24]];
  var THIGH = 0.45, SHIN = 0.385, SOLE_Y = -0.062, HEEL_F = -0.08, TOE_F = 0.19, LEG_MAX = (THIGH + SHIN) * 0.999;
  // tornozelo para a sola tocar o chão no ponto gf (frente = +f) com o pé inclinado th
  function ankleOn(gf, th, pf, out) { var c = Math.cos(th), s = Math.sin(th); out.y = -(SOLE_Y * c + pf * s); out.f = gf - (pf * c - SOLE_Y * s); return out; }
  // perna de dois ossos até o tornozelo (IK analítica no plano frente/cima)
  function legIK(leg, knee, foot, hipY, ay, af, th) {
    var dy = ay - hipY, d = Math.sqrt(dy * dy + af * af);
    if (d > LEG_MAX) { dy *= LEG_MAX / d; af *= LEG_MAX / d; d = LEG_MAX; }
    var a = Math.atan2(af, -dy) + Math.acos(U.clamp((THIGH * THIGH + d * d - SHIN * SHIN) / (2 * THIGH * d), -1, 1));
    var b = Math.acos(U.clamp((THIGH * THIGH + SHIN * SHIN - d * d) / (2 * THIGH * SHIN), -1, 1)) - Math.PI;
    leg.rotation.x = a; knee.rotation.x = b; foot.rotation.x = th - a - b;
  }
  var _t = [{ y: 0, f: 0, th: 0 }, { y: 0, f: 0, th: 0 }], _fa = { y: 0, f: 0 }, _fb = { y: 0, f: 0 };
  var HIP_H = BM.HIP_H, HC = BM.HC;
  var DISC = null;
  var BONES = BM.BONES;
  var PARENT = { hips: null, torso: 'hips', head: 'torso', armL: 'torso', elbowL: 'armL', armR: 'torso', elbowR: 'armR',
    legL: 'hips', kneeL: 'legL', footL: 'kneeL', legR: 'hips', kneeR: 'legR', footR: 'kneeR', pony: 'head' };

  function gcfg(gender) {
    var g = EP.data.appearance.genders.filter(function (x) { return x.id === gender; })[0] || EP.data.appearance.genders[0];
    return g.body;
  }
  function outfitOf(app) {
    var gear = app.gear || {};
    var top = (gear.shirt && gear.shirt.kind) || app.shirtKind || (app.gender === 'f' ? 'top' : 'camiseta');
    var bottom = (gear.shorts && gear.shorts.kind) || app.shortsKind || (app.gender === 'f' ? 'legging' : 'short');
    if (bottom === 'saia-short') bottom = 'short';
    if (app.gender === 'm' && top === 'top') top = 'regata';
    return { top: top, bottom: bottom, hair: app.hairStyle };
  }

  // ---------------------------------------------------------------- equipamentos
  // Acessórios: malhas com a cor já pintada, presas a um osso e guardadas por
  // tipo + cores (vários corredores com o mesmo boné usam a mesma geometria).
  var accCache = {};
  function hairClass(style) { return style === 'cacheado' ? 1.14 : style === 'coque' ? 1.04 : 1; }

  var ACC = {
    head: function (gb, v, k) {
      var c = v.color, a = v.accent || v.color, H = HC;
      if (v.kind === 'faixa') {
        gb.add('cyl10s', 0, H + 0.05, 0.012, 0.19 * k, 0.045, 0.214 * k, c);
        gb.add('cyl10s', 0, H + 0.05, 0.012, 0.193 * k, 0.012, 0.217 * k, a);
        return;
      }
      if (v.kind === 'viseira') {
        gb.add('cyl10s', 0, H + 0.055, 0.012, 0.19 * k, 0.04, 0.214 * k, c);
        gb.add('sph16', 0, H + 0.045, -0.118, 0.17, 0.02, 0.13, a, 0, -0.18);
        return;
      }
      if (v.kind === 'gorro') {
        gb.add('sph16', 0, H + 0.07, 0.014, 0.2 * k, 0.215 * k, 0.225 * k, c);
        gb.add('cyl10', 0, H + 0.035, 0.014, 0.198 * k, 0.045, 0.222 * k, a);
        gb.add('icoS', 0, H + 0.18 * k + 0.02, 0.025, 0.065, 0.065, 0.065, a);
        return;
      }
      if (v.kind === 'bandana') {
        gb.add('sph16', 0, H + 0.06, 0.018, 0.195 * k, 0.19 * k, 0.215 * k, c);
        gb.add('sph8', 0, H + 0.035, 0.12 * k, 0.05, 0.045, 0.045, a);
        gb.add('sph8', 0.02, H - 0.01, 0.13 * k, 0.026, 0.08, 0.018, c, 0, 0.3, 0.25);
        gb.add('sph8', -0.02, H - 0.01, 0.13 * k, 0.026, 0.08, 0.018, c, 0, 0.3, -0.25);
        return;
      }
      // bonés
      gb.add('sph16', 0, H + 0.058, 0.01, 0.2 * k, 0.2 * k, 0.222 * k, c);
      gb.add('sph8', 0, H + 0.058 + 0.099 * k, 0.01, 0.026, 0.014, 0.026, a);
      if (v.kind === 'bone-aba-reta') gb.add('sph16', 0, H + 0.06, -0.13, 0.19, 0.016, 0.15, a, 0, -0.04);
      else {
        gb.add('sph16', 0, H + 0.055, -0.118, 0.178, 0.022, 0.15, c, 0, -0.2);
        gb.add('sph8', 0, H + 0.095, -0.098, 0.05, 0.026, 0.01, a, 0, -0.35);
      }
    },
    eyes: function (gb, v) {
      var c = v.color, l = v.lens || '#2a2f3a', y = HC + 0.014, z = -0.104;
      if (v.kind === 'oculos-esporte') {
        gb.add('sph16', 0, y, z + 0.028, 0.18, 0.05, 0.07, l);
        gb.add('sph16', 0, y + 0.026, z + 0.03, 0.184, 0.014, 0.07, c);
        return;
      }
      var big = v.kind === 'oculos-sol', w = big ? 0.048 : 0.042, h = big ? 0.038 : 0.034;
      [-1, 1].forEach(function (sd) {
        gb.add('cyl10', sd * 0.035, y, z, w + 0.01, 0.01, h + 0.01, c, 0, Math.PI / 2);
        gb.add('sph8', sd * 0.035, y, z - 0.004, w, h, 0.01, l);
        gb.add('box', sd * 0.086, y + 0.008, z + 0.055, 0.007, 0.009, 0.11, c);
      });
      gb.add('box', 0, y + 0.008, z, 0.026, 0.007, 0.007, c);
    },
    ears: function (gb, v) {
      var c = v.color, a = v.accent || v.color, y = HC - 0.002;
      if (v.kind === 'fone-sem-fio') {
        [-1, 1].forEach(function (sd) {
          gb.add('sph8', sd * 0.088, y, -0.004, 0.032, 0.032, 0.032, c);
          gb.add('cyl10', sd * 0.09, y - 0.035, -0.01, 0.012, 0.05, 0.012, c);
          gb.add('sph8', sd * 0.098, y + 0.002, -0.004, 0.012, 0.012, 0.012, a);
        });
        return;
      }
      var sport = v.kind === 'fone-esporte', cup = sport ? 0.055 : 0.078;
      [-1, 1].forEach(function (sd) {
        gb.add('cyl10', sd * 0.1, y, 0.006, cup, 0.032, cup, c, 0, 0, Math.PI / 2);
        gb.add('cyl10', sd * 0.118, y, 0.006, cup * 0.72, 0.008, cup * 0.72, a, 0, 0, Math.PI / 2);
      });
      if (sport) {
        for (var j = 0; j <= 8; j++) {
          var t = Math.PI * j / 8;
          gb.add('sph8', Math.cos(t) * 0.1, y - 0.03, 0.02 + Math.sin(t) * 0.1, 0.022, 0.022, 0.022, c);
        }
        return;
      }
      for (var i = 0; i <= 10; i++) {
        var ang = Math.PI * i / 10;
        gb.add('sph8', Math.cos(ang) * 0.108, y + 0.01 + Math.sin(ang) * 0.135, 0.012, 0.026, 0.026, 0.03, c);
      }
    },
    wrist: function (gb, v) {
      var c = v.color, a = v.accent || c, y = -0.205;
      gb.add('cyl10', 0, y, 0, 0.064, 0.028, 0.06, c);
      if (v.kind === 'pulseira') { gb.add('cyl10', 0, y + 0.03, 0, 0.062, 0.012, 0.058, a); return; }
      if (v.kind === 'smartwatch') gb.add('box', -0.033, y - 0.022, 0, 0.012, 0.045, 0.036, a);
      else gb.add('cyl10', -0.033, y, 0, 0.04, 0.01, 0.04, a, 0, 0, Math.PI / 2);
    },
    skirt: function (gb, v, k, hp) {
      gb.add('taper10s', 0, -0.035, 0.005, hp + 0.1, 0.17, 0.25, v.color, 0, Math.PI);
      gb.add('cyl10s', 0, -0.118, 0.005, hp + 0.124, 0.016, 0.262, v.accent || v.color);
    },
    flag: function (gb) {
      // corredor-guia (pacer): bandeirinha presa nas costas
      gb.add('cyl10', 0.07, 0.72, 0.12, 0.016, 0.8, 0.016, '#f4f1ea');
      gb.add('box', 0.07 + 0.13, 0.98, 0.12, 0.26, 0.17, 0.008, '#ff5a3d');
      gb.add('box', 0.07 + 0.13, 0.98, 0.125, 0.15, 0.05, 0.008, '#ffffff');
      gb.add('sph8', 0.07, 1.13, 0.12, 0.04, 0.04, 0.04, '#ffd23f');
    }
  };
  var ACC_BONE = { head: 'head', eyes: 'head', ears: 'head', wrist: 'elbowL', skirt: 'hips', flag: 'torso' };

  function accGeo(slot, v, k, hp) {
    var key = slot + '|' + (v.kind || '') + '|' + (v.color || '') + '|' + (v.accent || '') + '|' + (v.lens || '') + '|' + k + '|' + (hp || 0);
    if (!accCache[key]) {
      var gb = new EP.GeoBuilder();
      ACC[slot](gb, v, k, hp);
      accCache[key] = gb.build();
    }
    return accCache[key];
  }

  // estampa da roupa: quanto da cor de destaque entra (0–1) na altura t (0 embaixo, 1 em cima)
  function patternMix(kind, t) {
    if (kind === 'faixa') return U.smooth((t - 0.5) / 0.05) * (1 - U.smooth((t - 0.72) / 0.05));
    if (kind === 'listras') return U.smooth((Math.sin(t * Math.PI * 7) - 0.1) / 0.5);
    if (kind === 'degrade') return U.smooth(t * 1.1 - 0.05);
    return 0;
  }
  var PAT_SHIRT = [HIP_H - 0.03, HIP_H + 0.5], PAT_SHORTS = [HIP_H - 0.3, HIP_H + 0.08];

  // ---------------------------------------------------------------- corredor
  function RunnerRig() {
    var M = EP.Materials, self = this;
    this.root = new THREE.Group();
    this.body = new THREE.Group();          // leva a escala (altura)
    this.root.add(this.body);
    var bones = this.bones = [];
    BONES.forEach(function (name) {
      var b = new THREE.Bone();
      b.name = name;
      bones.push(b);
      self[name] = b;
      if (PARENT[name]) self[PARENT[name]].add(b);
    });
    this.body.add(this.hips);
    this.skeleton = new THREE.Skeleton(bones);
    this.mesh = new THREE.SkinnedMesh(new THREE.BufferGeometry(), M.runnerSkin);
    this.mesh.frustumCulled = false;
    this.mesh.castShadow = true;
    this.body.add(this.mesh);
    // acessórios (boné, óculos, fone, relógio, saia, bandeira do pacer)
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
    this._bindKey = '';
    this._geos = {};
    this._pal = [];
    for (var i = 0; i < BM.NSLOT; i++) this._pal.push(new THREE.Color());
    this._ponyV = 0; this._ponyA = 0; this._ponyZ = 0; this._ponyVZ = 0;
    this._stance = 0;
  }
  var P = RunnerRig.prototype;

  var _c = new THREE.Color(), _a = new THREE.Color(), _w = new THREE.Color(1, 1, 1);
  function lin(hex, out) { return out.set(hex).convertSRGBToLinear(); }

  // pose de repouso do gênero e "amarra" a malha aos ossos
  P._bind = function (gender) {
    var bp = BM.bonePos(gender), self = this;
    BONES.forEach(function (n) { var b = self[n]; b.position.fromArray(bp[n]); b.rotation.set(0, 0, 0); b.scale.set(1, 1, 1); });
    var rr = this.root.rotation.clone(), rp = this.root.position.clone(), sc = this.body.scale.clone();
    this.root.rotation.set(0, 0, 0); this.root.position.set(0, 0, 0); this.body.scale.set(1, 1, 1);
    this.root.updateMatrixWorld(true);
    this.skeleton.calculateInverses();
    this.mesh.bind(this.skeleton, this.mesh.matrixWorld);
    this.root.rotation.copy(rr); this.root.position.copy(rp); this.body.scale.copy(sc);
    this._bindKey = gender;
  };

  // app: cores já resolvidas { gender, skin, hairStyle, hair, shirt, shorts, shoes, gear, pacer,
  //   shirtKind, shortsKind, shoeAccent } · gear: visual de cada espaço ({ kind, color, accent, pattern, lens })
  P.setAppearance = function (app) {
    var b = gcfg(app.gender), hp = b.hips, self = this, gear = app.gear || {};
    // forma ainda não esculpida: pede ao Worker e aplica quando ficar pronta
    var want = outfitOf(app);
    if (!BM.ready(app.gender, want, this.lod)) {
      this._want = app;
      BM.prepare(app.gender, want, this.lod, function () { if (self._want === app) self.setAppearance(app); });
      return;
    }
    this._want = null;
    this.app = app;
    this.outfit = want;
    if (this._bindKey !== app.gender) this._bind(app.gender);
    this.body.scale.setScalar(b.height / 1.76);
    var shirtV = gear.shirt || {}, shortsV = gear.shorts || {}, shoesV = gear.shoes || {};
    var p = this._pal;
    lin(app.skin, p[C.skin]);
    p[C.nail].copy(p[C.skin]).lerp(lin('#ffd9d0', _c), 0.35);
    p[C.lips].copy(p[C.skin]).lerp(lin('#a8494a', _c), 0.42);
    p[C.cheek].copy(p[C.skin]).lerp(lin('#e88a7e', _c), 0.06);
    lin(app.hair, p[C.hair]);
    p[C.brow].copy(p[C.hair]).multiplyScalar(0.8).lerp(p[C.skin], 0.25);
    lin('#2a1d18', p[C.lash]);
    lin('#f2eee8', p[C.eyeWhite]);
    lin(app.eyes || '#5a3a22', p[C.iris]);
    lin('#0d0a08', p[C.pupil]);
    lin(app.shirt, p[C.shirt]);
    p[C.shirtTrim].copy(p[C.shirt]).multiplyScalar(0.78);
    p[C.shirtAccent].copy(p[C.shirt]).lerp(_w, 0.7);
    lin(app.shorts, p[C.shorts]);
    p[C.shortsTrim].copy(p[C.shorts]).multiplyScalar(0.72);
    p[C.shortsAccent].copy(p[C.shorts]).lerp(_w, 0.35);
    lin('#f3f2ee', p[C.sock]);
    lin(app.shoes, p[C.shoe]);
    lin('#f6f5f0', p[C.midsole]);
    lin('#4a4a50', p[C.sole]);
    p[C.lace].copy(p[C.shoe]).lerp(_w, 0.75);
    // tênis de três cores: cabedal, detalhe e entressola
    p[C.shoeAccent].copy(p[C.shoe]).lerp(_w, 0.6);
    var accent = shirtV.accent ? lin(shirtV.accent, new THREE.Color()) : null;
    if (accent) { p[C.shirtTrim].copy(accent); p[C.shirtAccent].copy(accent); }
    var sAccent = shortsV.accent ? lin(shortsV.accent, new THREE.Color()) : null;
    if (sAccent) { p[C.shortsAccent].copy(sAccent); if (shortsV.pattern !== 'degrade') p[C.shortsTrim].copy(sAccent); }
    if (shoesV.accent) {
      lin(shoesV.accent, p[C.shoeAccent]);
      if (shoesV.kind === 'tenis-corrida' || shoesV.kind === 'tenis-pro') p[C.midsole].copy(p[C.shoeAccent]).lerp(_w, 0.55);
      if (shoesV.kind === 'tenis-pro') p[C.sock].copy(p[C.shoe]).lerp(_w, 0.6);
    } else if (app.shoeAccent) lin(app.shoeAccent, p[C.shoeAccent]);
    if (app.pacer) {   // colete do corredor-guia
      lin('#d9ff3d', p[C.shirt]); lin('#ff5a3d', p[C.shirtTrim]); lin('#ff5a3d', p[C.shirtAccent]);
    }
    this._pat = {
      shirt: !app.pacer && shirtV.pattern && accent ? shirtV.pattern : null, accent: accent,
      shorts: shortsV.pattern && sAccent && shortsV.pattern !== 'faixa' ? shortsV.pattern : null, sAccent: sAccent
    };
    this._paint();
    // acessórios
    var hk = hairClass(app.hairStyle);
    var setAcc = function (name, v, extra) {
      var m = self.acc[name];
      if (!v) { m.visible = false; return; }
      m.geometry = accGeo(name, v, hk, extra);
      m.visible = true;
    };
    setAcc('head', gear.head);
    setAcc('eyes', gear.eyes);
    setAcc('ears', gear.ears);
    setAcc('wrist', gear.wrist);
    setAcc('skirt', ((shortsV.kind || app.shortsKind) === 'saia-short') ? { color: app.shorts, accent: shortsV.accent } : null, hp);
    setAcc('flag', app.pacer ? { kind: 'flag' } : null);
  };

  // pinta a geometria do molde atual (forma compartilhada, cor deste corredor)
  P._paint = function () {
    var app = this.app, t = BM.assemble(app.gender, this.outfit, this.lod), gk = t.key;
    var g = this._geos[gk];
    if (!g) {
      g = this._geos[gk] = new THREE.BufferGeometry();
      var src = t.geometry;
      ['position', 'normal', 'skinIndex', 'skinWeight', 'mat'].forEach(function (k) { g.setAttribute(k, src.attributes[k]); });
      g.setIndex(src.index);
      g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(t.n * 3), 3));
    }
    var p = this._pal, pat = this._pat, col = g.attributes.color.array, slot = t.slot, ao = t.ao, tone = t.tone, pos = t.pos;
    for (var i = 0, j = 0; i < t.n; i++, j += 3) {
      var sl = slot[i], c = p[sl], k = ao[i] * tone[i];
      if (sl === C.shirt && pat.shirt) c = _c.copy(c).lerp(pat.accent, patternMix(pat.shirt, (pos[j + 1] - PAT_SHIRT[0]) / (PAT_SHIRT[1] - PAT_SHIRT[0])));
      else if (sl === C.shorts && pat.shorts) c = _c.copy(c).lerp(pat.sAccent, patternMix(pat.shorts, (pos[j + 1] - PAT_SHORTS[0]) / (PAT_SHORTS[1] - PAT_SHORTS[0])));
      col[j] = c.r * k; col[j + 1] = c.g * k; col[j + 2] = c.b * k;
    }
    g.attributes.color.needsUpdate = true;
    this.mesh.geometry = g;
  };

  // nível de detalhe (0 = completo, 1 = médio, 2 = leve): os corredores da rua trocam pela distância
  P.setLod = function (lod) {
    if (lod === this.lod || this._want) return;
    if (this.app && !BM.has(this.app.gender, this.outfit, lod)) return;   // só troca para moldes já prontos
    this.lod = lod;
    if (this.app) this._paint();
  };

  // ---------------------------------------------------------------- animação
  // A passada acompanha a velocidade real: cadência de corredor e pés
  // plantados por IK (o pé apoiado não escorrega). Braço oposto à perna,
  // cotovelo dobrado para a frente.
  // opts: { idle, celebrate, lateral }
  P.animate = function (dt, speed, opts) {
    opts = opts || {};
    if (opts.idle || opts.celebrate) return this._idle(dt, opts);
    var run = U.smooth((speed - 5.8) / 2.6), sprint = U.smooth((speed - 14) / 5);
    var freq = U.table(STRIDE, speed), duty = U.table(DUTY, speed);
    this.phase += dt * Math.PI * 2 * freq;
    var ph = this.phase, s = Math.sin(ph), c = Math.cos(ph);
    // Pés plantados: no apoio, o pé fica parado no chão enquanto o corpo passa
    // (a distância percorrida no apoio = velocidade × tempo de apoio), sem escorregar.
    var D = speed / 3.6 / this.body.scale.y * duty / freq;
    var land = D * U.lerp(0.48, 0.38, run) + 0.02;
    var thTD = U.lerp(0.28, 0.12, run), thTO = -U.lerp(0.4, 0.75, run);
    var lift = U.lerp(0.07, 0.3, run) + sprint * 0.12, hipMax = 9, step = 0, i;
    for (i = 0; i < 2; i++) {
      var t = _t[i], u = ((ph / (Math.PI * 2) + i * 0.5) % 1 + 1) % 1, k = (u - 0.5 + duty / 2) / duty;
      if (k >= 0 && k <= 1) {   // apoio: calcanhar toca, pé plano, empurra com a ponta
        var heel = land + HEEL_F - D * k;
        t.th = k < 0.2 ? thTD * (1 - U.smooth(k / 0.2)) : k > 0.5 ? thTO * U.smooth((k - 0.5) / 0.5) : 0;
        if (t.th >= 0) ankleOn(heel, t.th, HEEL_F, t); else ankleOn(heel + TOE_F - HEEL_F, t.th, TOE_F, t);
        hipMax = Math.min(hipMax, t.y + Math.sqrt(Math.max(0, LEG_MAX * LEG_MAX - t.f * t.f)));
        if (!(this._stance & (1 << i))) { this._stance |= 1 << i; step = i ? 1 : -1; }
      } else {                   // balanço: o pé sobe e volta para a frente
        var w = (k > 1 ? k - 1 : k + 1 / duty - 1) * duty / (1 - duty), e = U.smooth(w);
        ankleOn(land + HEEL_F - D + TOE_F - HEEL_F, thTO, TOE_F, _fa);
        ankleOn(land + HEEL_F, thTD, HEEL_F, _fb);
        t.f = U.lerp(_fa.f, _fb.f, e);
        t.y = U.lerp(_fa.y, _fb.y, e) + lift * Math.pow(Math.sin(Math.PI * Math.pow(w, 0.75)), 1.2);
        t.th = U.lerp(thTO, thTD, U.smooth(w * 1.4 - 0.2));
        this._stance &= ~(1 << i);
      }
    }
    var bob = Math.abs(Math.cos(ph - 0.35));
    var hy = HIP_H - run * 0.035 - U.lerp(0.012, 0.045, run) * (bob - 0.5) - 0.012 * (1 - run);
    this.hips.position.y = Math.max(Math.min(hy, hipMax + 0.01), hy - 0.07);
    this.hips.rotation.set(0, -0.08 * s, 0.035 * c * (1 - run * 0.4));
    var legs = [[this.legL, this.kneeL, this.footL], [this.legR, this.kneeR, this.footR]];
    for (i = 0; i < 2; i++) {
      legIK(legs[i][0], legs[i][1], legs[i][2], this.hips.position.y - 0.01, _t[i].y, _t[i].f, _t[i].th);
      legs[i][0].rotation.z = (i ? -1 : 1) * 0.015;
    }
    // braços: o esquerdo vai para a frente quando a perna direita vai (e vice-versa);
    // o cotovelo dobra para a frente, mais quanto mais rápido
    var aa = U.lerp(0.26, 0.55, run) + sprint * 0.2, elbow = U.lerp(0.3, 1.5, run) + sprint * 0.12;
    this.armL.rotation.set(-aa * s - 0.04 * run, 0, -0.07 - run * 0.03);
    this.armR.rotation.set(aa * s - 0.04 * run, 0, 0.07 + run * 0.03);
    this.elbowL.rotation.set(elbow + 0.2 * Math.max(0, s) * run, 0, 0.16 * run);
    this.elbowR.rotation.set(elbow + 0.2 * Math.max(0, -s) * run, 0, -0.16 * run);
    // tronco: inclina com a velocidade e gira levemente
    var lean = U.lerp(0.035, 0.11, run) + sprint * 0.06;
    this.torso.rotation.set(-lean, 0.14 * s * (0.6 + run * 0.4), -0.02 * c);
    // a cabeça olha para a frente (compensa o giro do tronco)
    this.head.rotation.set(lean * 0.7 + 0.02 * (bob - 0.5) * run, -0.1 * s * (0.6 + run * 0.4), 0.02 * c);
    this._ponyStep(dt, run, bob, s);
    this.root.rotation.z = U.damp(this.root.rotation.z, -(opts.lateral || 0) * 0.045, 8, dt);
    if (this.onStep && step) this.onStep(step);
  };

  // rabo de cavalo: mola amortecida puxada pelo sobe-e-desce e pelo giro
  P._ponyStep = function (dt, run, bob, s) {
    var targetX = 0.15 + run * 0.45 + (bob - 0.5) * 0.35 * run, targetZ = -s * 0.25 * (0.3 + run * 0.7);
    var k = 60, d = 7, h = Math.min(dt, 0.033);
    this._ponyV += ((targetX - this._ponyA) * k - this._ponyV * d) * h;
    this._ponyA += this._ponyV * h;
    this._ponyVZ += ((targetZ - this._ponyZ) * k * 0.7 - this._ponyVZ * d) * h;
    this._ponyZ += this._ponyVZ * h;
    this.pony.rotation.set(this._ponyA, 0, this._ponyZ);
  };

  P._idle = function (dt, opts) {
    this.phase += dt * (opts.celebrate ? 5 : 1.6);
    this.idleT += dt;
    var br = Math.sin(this.phase);
    this.footL.rotation.set(0, 0, 0); this.footR.rotation.set(0, 0, 0);
    this.head.rotation.set(0, 0, 0);
    if (opts.celebrate) {
      var hop = Math.max(0, Math.sin(this.phase));
      this.hips.position.y = HIP_H + hop * 0.06;
      this.hips.rotation.set(0, 0, 0);
      this.torso.rotation.set(0.05, 0, 0);
      this.legL.rotation.set(-hop * 0.2, 0, 0.05); this.legR.rotation.set(-hop * 0.2, 0, -0.05);
      this.kneeL.rotation.x = -hop * 0.4; this.kneeR.rotation.x = -hop * 0.4;
      this.armL.rotation.set(Math.PI * 0.95, 0, -0.3 - hop * 0.15); this.armR.rotation.set(Math.PI * 0.95, 0, 0.3 + hop * 0.15);
      this.elbowL.rotation.set(0.3, 0, 0); this.elbowR.rotation.set(0.3, 0, 0);
    } else {
      // respira, troca o peso de perna e às vezes alonga os braços
      var sway = Math.sin(this.idleT * 0.7) * 0.04, stretch = U.smooth((Math.sin(this.idleT * 0.35) - 0.85) / 0.15);
      this.hips.position.y = HIP_H - 0.01 + br * 0.004;
      this.hips.rotation.set(0, 0, sway * 0.4);
      this.torso.rotation.set(-0.02 + br * 0.01, 0, -sway * 0.5);
      this.legL.rotation.set(0.02, 0, 0.025 - sway * 0.4); this.legR.rotation.set(-0.02, 0, -0.025 - sway * 0.4);
      this.kneeL.rotation.x = -0.04 - Math.max(0, sway) * 1.2; this.kneeR.rotation.x = -0.04 - Math.max(0, -sway) * 1.2;
      this.footL.rotation.x = -this.legL.rotation.x - this.kneeL.rotation.x; this.footR.rotation.x = -this.legR.rotation.x - this.kneeR.rotation.x;
      this.footL.rotation.z = -this.legL.rotation.z - this.hips.rotation.z; this.footR.rotation.z = -this.legR.rotation.z - this.hips.rotation.z;
      this.armL.rotation.set(0.04 + br * 0.02 + stretch * 2.7, 0, -0.06 - stretch * 0.15);
      this.armR.rotation.set(0.03 - br * 0.02 + stretch * 2.7, 0, 0.06 + stretch * 0.15);
      this.elbowL.rotation.set(0.18 + stretch * 0.1, 0, 0); this.elbowR.rotation.set(0.18 + stretch * 0.1, 0, 0);
    }
    this._ponyStep(dt, 0, 0.5, 0);
    this.root.rotation.z = 0;
  };

  P.dispose = function () {
    for (var k in this._geos) this._geos[k].dispose();
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

  // Corredores da rua: combinações de uma paleta esportiva (nada de cores
  // soltas) e só formas de roupa já montadas (nada é esculpido no meio da corrida).
  RunnerRig.NPC_OUTFITS = [
    { gender: 'm', top: 'camiseta', bottom: 'short', hair: 'curto' }, { gender: 'm', top: 'regata', bottom: 'short', hair: 'raspado' },
    { gender: 'm', top: 'camiseta', bottom: 'short', hair: 'cacheado' }, { gender: 'm', top: 'manga-longa', bottom: 'legging', hair: 'curto' },
    { gender: 'f', top: 'top', bottom: 'legging', hair: 'rabo' }, { gender: 'f', top: 'regata', bottom: 'short', hair: 'rabo' },
    { gender: 'f', top: 'camiseta', bottom: 'legging', hair: 'coque' }, { gender: 'f', top: 'top', bottom: 'short', hair: 'curto' }
  ];
  RunnerRig.random = function (rnd) {
    var A = EP.data.appearance, K = A.npcKits || null;
    rnd = rnd || Math.random;
    var ready = RunnerRig.NPC_OUTFITS.filter(function (o) { return BM.has(o.gender, o, 1); });
    var o = U.pick(ready.length ? ready : RunnerRig.NPC_OUTFITS.slice(0, 1), rnd);
    var kit = K ? U.pick(K, rnd) : null;
    return {
      gender: o.gender, skin: U.pick(A.skin, rnd), hairStyle: o.hair, hair: U.pick(A.hairColors, rnd),
      shirt: kit ? kit[0] : U.pick(A.npcShirts, rnd), shorts: kit ? kit[1] : U.pick(A.npcShorts, rnd), shoes: kit ? kit[2] : U.pick(A.npcShoes, rnd),
      shoeAccent: kit ? kit[3] : null, shirtKind: o.top, shortsKind: o.bottom,
      gear: randomGear(rnd)
    };
  };
  // monta (aos poucos) as formas dos corredores da rua: médio e leve
  RunnerRig.warmNpcs = function (done) {
    var jobs = [];
    RunnerRig.NPC_OUTFITS.forEach(function (o) { jobs.push({ gender: o.gender, outfit: o, lod: 1 }); });
    RunnerRig.NPC_OUTFITS.forEach(function (o) { jobs.push({ gender: o.gender, outfit: o, lod: 2 }); });
    BM.warm(jobs, done);
  };

  // acessórios dos corredores da rua (a rua fica mais viva; mesmas peças da loja)
  var NPC_GEAR = { head: 0.25, eyes: 0.2, ears: 0.18, wrist: 0.45 };
  var gearPool = null;
  function randomGear(rnd) {
    if (!EP.data.items) return null;
    if (!gearPool) {
      gearPool = {};
      EP.data.items.forEach(function (it) { if (!it.starter && NPC_GEAR[it.slot]) (gearPool[it.slot] = gearPool[it.slot] || []).push(it.visual); });
    }
    var g = {};
    for (var s in NPC_GEAR) if (gearPool[s] && rnd() < NPC_GEAR[s]) g[s] = U.pick(gearPool[s], rnd);
    return g;
  }

  RunnerRig.outfitOf = outfitOf;
  EP.RunnerRig = RunnerRig;
})(window.EP);
