// RunnerRig — o corredor (GDD §5): humano estilizado, proporções naturais,
// silhueta lisa. Uma malha só por corredor, deformada por 14 "ossos"
// (quadril, tronco, cabeça, braços, cotovelos, coxas, joelhos, pés e rabo de
// cavalo). Os joelhos e cotovelos dobram de verdade (a pele perto da junta
// segue os dois ossos), os pés rolam no chão e o cabelo balança.
//
// Desempenho: a forma de cada "molde" (gênero + cabelo + nível de detalhe) é
// montada uma vez e compartilhada; cada corredor só tem a sua cor por vértice.
// Os corredores da rua usam o molde leve quando estão longe (LOD).
(function (EP) {
  'use strict';
  var U = EP.util;
  var STRIDE = [[0, 0.85], [4, 0.9], [6, 1.0], [8, 1.3], [12, 1.43], [16, 1.55], [21, 1.68]];   // ciclos (2 passos) por segundo
  var HIP_H = 0.91, THIGH = 0.45, SHIN = 0.385, NECK_Y = 0.52, UPPER = 0.27, HC = 0.165;   // HC: centro da cabeça acima do pescoço
  var DISC = null;

  // espaços de cor (o molde guarda o espaço, o corredor dá a cor)
  var C = { skin: 0, skinShade: 1, hair: 2, shirt: 3, shirtTrim: 4, shorts: 5, shortsTrim: 6, sock: 7, shoe: 8, sole: 9,
    eyeWhite: 10, eye: 11, mouth: 12, bib: 13, bibStripe: 14, brow: 15, lips: 16,
    sleeve: 17, sleeveTrim: 18, forearm: 19, thighSkin: 20, knee: 21, shinSkin: 22, shoeAccent: 23, shoulder: 24, belly: 25 };
  var NSLOT = 26;

  // ossos e seus pais (a posição de cada um no pai sai de bonePos, por gênero)
  var BONES = ['hips', 'torso', 'head', 'armL', 'elbowL', 'armR', 'elbowR', 'legL', 'kneeL', 'footL', 'legR', 'kneeR', 'footR', 'pony'];
  var PARENT = { hips: null, torso: 'hips', head: 'torso', armL: 'torso', elbowL: 'armL', armR: 'torso', elbowR: 'armR',
    legL: 'hips', kneeL: 'legL', footL: 'kneeL', legR: 'hips', kneeR: 'legR', footR: 'kneeR', pony: 'head' };
  var BI = {};
  BONES.forEach(function (b, i) { BI[b] = i; });
  var templates = {};

  function gcfg(gender) {
    var g = EP.data.appearance.genders.filter(function (x) { return x.id === gender; })[0] || EP.data.appearance.genders[0];
    return g.body;
  }

  function bonePos(gender) {
    var b = gcfg(gender), sh = b.shoulders, hp = b.hips, f = gender === 'f';
    return {
      hips: [0, HIP_H, 0], torso: [0, 0, 0], head: [0, NECK_Y, 0.005],
      armL: [-(sh / 2 + 0.005), 0.435, 0.005], elbowL: [0, -UPPER, 0], armR: [sh / 2 + 0.005, 0.435, 0.005], elbowR: [0, -UPPER, 0],
      legL: [-hp * (f ? 0.29 : 0.28), -0.01, 0], kneeL: [0, -THIGH, 0], footL: [0, -SHIN, 0],
      legR: [hp * (f ? 0.29 : 0.28), -0.01, 0], kneeR: [0, -THIGH, 0], footR: [0, -SHIN, 0],
      pony: [0, HC + 0.05, 0.1]
    };
  }

  // posição de cada osso no corpo (pose de repouso)
  function modelPos(bp, name) {
    var x = 0, y = 0, z = 0, n = name;
    while (n) { var p = bp[n]; x += p[0]; y += p[1]; z += p[2]; n = PARENT[n]; }
    return [x, y, z];
  }

  // ---------------------------------------------------------------- molde
  // Monta a malha em pose de repouso (braços e pernas retos). Cada parte é
  // desenhada no espaço do seu osso; perto das juntas a pele segue dois ossos.
  function Template(gender, hairStyle, lod) {
    var GB = EP.GeoBuilder, b = gcfg(gender), sh = b.shoulders, hp = b.hips, wa = b.waist, female = gender === 'f';
    var hi = lod === 0, SEG = hi ? 18 : 9, S16 = hi ? 'sph16' : 'sph8';
    var gb = new GB(), bp = bonePos(gender), bone = 0;
    var skA = [], skB = [], skW = [];
    var lathe = function (name, pts) { return GB.lathe(name + '|' + gender + '|' + SEG, pts, SEG); };
    // desenha no espaço do osso e anota o osso de cada vértice
    function part(boneName, fn, partFn, blendFn) {
      var m = modelPos(bp, boneName), start = gb.part.length;
      bone = BI[boneName];
      gb.frame(m[0], m[1], m[2], 0);
      gb.partFn = partFn ? function (x, y, z) { return partFn(x - m[0], y - m[1], z - m[2]); } : null;
      fn();
      for (var i = start; i < gb.part.length; i++) {
        var w = 0, other = bone;
        if (blendFn) {
          var r = blendFn(gb.pos[i * 3] - m[0], gb.pos[i * 3 + 1] - m[1], gb.pos[i * 3 + 2] - m[2]);
          if (r) { other = BI[r[0]]; w = r[1]; }
        }
        skA.push(bone); skB.push(other); skW.push(w);
      }
      gb.partFn = null;
      gb.noFrame();
    }

    // ---- tronco (espaço do quadril; y = 0 na altura da articulação do quadril)
    var dz = female ? 0.7 : 0.66, hw = hp * 0.5 + (female ? 0.022 : 0.006), ww = wa * 0.5 + 0.004;
    var torsoPts = [[0.001, -0.135], [hp * 0.36, -0.118], [hw * 0.92, -0.085], [hw, -0.04], [hw * 0.98, 0.02], [ww * 1.04, 0.09],
      [ww, 0.15], [ww * 1.03, 0.2], [sh * 0.41, 0.27], [sh * 0.46, 0.34], [sh * 0.475, 0.4], [sh * 0.44, 0.45], [sh * 0.33, 0.49], [0.075, 0.515], [0.058, 0.53], [0.001, 0.535]];
    part('torso', function () {
      gb.partId = C.shirt;
      gb.addUnit(lathe('torso', torsoPts), 0, 0, 0, 1, 1, dz, '#000');
      // glúteos, peito e costas dão a silhueta (de costas é o que a câmera mais vê)
      gb.partId = C.shorts;
      gb.add(S16, -hp * 0.19, -0.05, 0.03, hp * 0.44, 0.15, 0.13, '#000');
      gb.add(S16, hp * 0.19, -0.05, 0.03, hp * 0.44, 0.15, 0.13, '#000');
      gb.partId = C.shirt;
      if (female) {
        gb.add(S16, -0.052, 0.345, -0.062, 0.115, 0.105, 0.09, '#000');
        gb.add(S16, 0.052, 0.345, -0.062, 0.115, 0.105, 0.09, '#000');
      } else gb.add(S16, 0, 0.36, -0.03, sh * 0.78, 0.15, 0.13, '#000');
      gb.add(S16, 0, 0.36, 0.035, sh * 0.82, 0.2, 0.12, '#000');                  // costas (escápulas)
    }, function (x, y, z) {
      var ax = Math.abs(x);
      if (y > 0.5) return y > 0.512 ? C.skin : C.shirtTrim;                           // gola e base do pescoço
      if (y < (female ? 0.075 : 0.085)) return C.shorts;
      if (y < (female ? 0.095 : 0.105)) return C.shortsTrim;
      if (y > 0.415 && ax > sh * 0.28) return C.shoulder;
      if (y < 0.255) return C.belly;
      return undefined;
    }, function (x, y) {
      return y < -0.06 ? [x < 0 ? 'legL' : 'legR', U.smooth((-0.06 - y) / 0.08) * 0.35] : null;
    });

    // ---- cabeça e pescoço
    part('head', function () {
      gb.partId = C.skin;
      gb.add('cyl10', 0, 0.035, 0.005, 0.088, 0.1, 0.095, '#000');                     // pescoço
      gb.add(S16, 0, HC, 0, 0.168, 0.215, 0.195, '#000');                            // crânio
      gb.add(S16, 0, HC - 0.052, -0.016, 0.128, 0.12, 0.155, '#000');                // maxilar
      gb.add(S16, 0, HC + 0.02, 0.022, 0.17, 0.19, 0.17, '#000');                    // nuca
      gb.partId = C.skinShade;
      gb.add('sph8', -0.084, HC - 0.003, 0.008, 0.024, 0.058, 0.04, '#000');          // orelhas
      gb.add('sph8', 0.084, HC - 0.003, 0.008, 0.024, 0.058, 0.04, '#000');
      gb.add('sph8', 0, HC - 0.012, -0.098, 0.026, 0.048, 0.034, '#000', 0, 0.25);   // nariz
      gb.partId = C.eyeWhite;
      gb.add('sph8', -0.033, HC + 0.014, -0.089, 0.03, 0.019, 0.012, '#000');
      gb.add('sph8', 0.033, HC + 0.014, -0.089, 0.03, 0.019, 0.012, '#000');
      gb.partId = C.eye;
      gb.add('sph8', -0.033, HC + 0.013, -0.094, 0.016, 0.017, 0.006, '#000');
      gb.add('sph8', 0.033, HC + 0.013, -0.094, 0.016, 0.017, 0.006, '#000');
      gb.partId = C.brow;
      gb.add('sph8', -0.035, HC + 0.04, -0.091, 0.036, 0.007, 0.012, '#000', 0, 0, 0.1);
      gb.add('sph8', 0.035, HC + 0.04, -0.091, 0.036, 0.007, 0.012, '#000', 0, 0, -0.1);
      gb.partId = C.lips;
      gb.add('sph8', 0, HC - 0.055, -0.088, 0.03, 0.009, 0.01, '#000');
      hair(gb, hairStyle, female, S16);
    }, null, function (x, y) { return y < 0.03 ? ['torso', U.smooth((0.03 - y) / 0.05) * 0.5] : null; });

    // ---- braços: ombro, braço (manga) e antebraço com a mão
    ['L', 'R'].forEach(function (sd) {
      var sx = sd === 'L' ? -1 : 1;
      part('arm' + sd, function () {
        gb.partId = C.shoulder;
        gb.add(S16, -sx * 0.016, -0.022, 0, 0.098, 0.1, 0.1, '#000');               // deltoide
        gb.partId = C.forearm;
        gb.addUnit(lathe('upperArm', [[0.001, -UPPER - 0.03], [0.034, -UPPER - 0.01], [0.037, -0.22], [0.046, -0.13], [0.05, -0.06], [0.05, 0.0], [0.001, 0.03]]), 0, 0, 0, 1, 1, 0.94, '#000');
      }, function (x, y) {
        if (y > -0.1) return C.sleeve;
        if (y > -0.125) return C.sleeveTrim;
        return undefined;
      }, function (x, y) {
        if (y > -0.03) return ['torso', U.smooth((y + 0.03) / 0.07) * 0.3];
        if (y < -0.22) return ['elbow' + sd, U.smooth((-0.22 - y) / 0.08) * 0.5];
        return null;
      });
      part('elbow' + sd, function () {
        gb.partId = C.forearm;
        gb.addUnit(lathe('foreArm', [[0.001, -0.245], [0.023, -0.235], [0.025, -0.2], [0.035, -0.12], [0.039, -0.05], [0.035, 0.0], [0.001, 0.035]]), 0, 0, 0, 1, 1, 0.92, '#000');
        gb.partId = C.skin;
        gb.add(S16, 0, -0.29, -0.005, 0.058, 0.09, 0.07, '#000');                    // mão (fechada, relaxada)
        gb.add('sph8', 0, -0.265, -0.035, 0.03, 0.05, 0.028, '#000', 0, 0.3);         // polegar
      }, null, function (x, y) { return y > -0.05 ? ['arm' + sd, U.smooth((y + 0.05) / 0.08) * 0.5] : null; });
    });

    // ---- pernas: coxa (short), canela com panturrilha (meia) e tênis
    ['L', 'R'].forEach(function (sd) {
      var hem = female ? -0.12 : -0.17;
      part('leg' + sd, function () {
        gb.partId = C.thighSkin;
        gb.addUnit(lathe('thigh', [[0.001, -THIGH - 0.03], [0.045, -THIGH - 0.01], [0.05, -0.38], [0.063, -0.26], [0.08, -0.13], [0.088, -0.04], [0.085, 0.04], [0.001, 0.08]]), 0, 0, 0, 0.98, 1, 1.02, '#000');
        gb.add(S16, 0, -0.2, -0.03, 0.12, 0.24, 0.1, '#000');                         // quadríceps
      }, function (x, y) {
        if (y > hem + 0.025) return C.shorts;
        if (y > hem) return C.shortsTrim;
        if (y < -0.38) return C.knee;
        return undefined;
      }, function (x, y) {
        if (y > -0.02) return ['hips', U.smooth((y + 0.02) / 0.08) * 0.4];
        if (y < -0.37) return ['knee' + sd, U.smooth((-0.37 - y) / 0.09) * 0.5];
        return null;
      });
      part('knee' + sd, function () {
        gb.partId = C.shinSkin;
        gb.addUnit(lathe('shin', [[0.001, -SHIN - 0.02], [0.03, -SHIN], [0.031, -0.33], [0.038, -0.25], [0.048, -0.12], [0.048, -0.04], [0.046, 0.0], [0.001, 0.04]]), 0, 0, 0, 1, 1, 1, '#000');
        gb.add(S16, 0, -0.145, 0.016, 0.08, 0.17, 0.078, '#000');                      // panturrilha
      }, function (x, y) {
        if (y > -0.035) return C.knee;
        if (y < -0.315) return C.sock;
        return undefined;
      }, function (x, y) {
        if (y > -0.06) return ['leg' + sd, U.smooth((y + 0.06) / 0.09) * 0.5];
        if (y < -0.33) return ['foot' + sd, U.smooth((-0.33 - y) / 0.06) * 0.35];
        return null;
      });
      // tênis: sola, entressola, cabedal, biqueira, contraforte, faixa lateral e cadarço
      part('foot' + sd, function () {
        gb.partId = C.sock;
        gb.add('cyl10', 0, 0.012, 0.003, 0.068, 0.04, 0.074, '#000');
        gb.partId = C.shoe;
        gb.add(S16, 0, -0.03, -0.035, 0.094, 0.082, 0.235, '#000');
        gb.add(S16, 0, -0.04, -0.105, 0.088, 0.06, 0.115, '#000');
        gb.partId = C.shoeAccent;
        gb.add(S16, 0, -0.022, 0.04, 0.09, 0.085, 0.085, '#000');                    // calcanhar
        gb.add('sph8', -0.045, -0.035, -0.045, 0.012, 0.032, 0.13, '#000', 0, 0.22);   // faixas laterais
        gb.add('sph8', 0.045, -0.035, -0.045, 0.012, 0.032, 0.13, '#000', 0, 0.22);
        gb.partId = C.sole;
        gb.add(S16, 0, -0.062, -0.04, 0.1, 0.03, 0.27, '#000');                       // sola
        gb.add(S16, 0, -0.055, 0.02, 0.098, 0.045, 0.13, '#000');                     // entressola (calcanhar)
        gb.add('box', 0, 0.002, -0.075, 0.032, 0.01, 0.075, '#000', 0, -0.35);       // cadarço
      }, null, null);
    });
    // ---- rabo de cavalo (osso próprio: balança)
    if (hairStyle === 'rabo') {
      part('pony', function () {
        gb.partId = C.hair;
        gb.add('sph8', 0, 0, 0, 0.05, 0.05, 0.05, '#000');
        gb.add(S16, 0, -0.065, 0.022, 0.075, 0.15, 0.07, '#000');
        gb.add(S16, 0, -0.16, 0.034, 0.064, 0.15, 0.058, '#000');
        gb.add(S16, 0, -0.245, 0.04, 0.042, 0.1, 0.036, '#000');
      }, null, null);
    }

    var n = gb.part.length, ys = new Float32Array(n), i;
    for (i = 0; i < n; i++) ys[i] = gb.pos[i * 3 + 1];
    var si = new Uint16Array(n * 4), sw = new Float32Array(n * 4);
    for (i = 0; i < n; i++) { si[i * 4] = skA[i]; si[i * 4 + 1] = skB[i]; sw[i * 4] = 1 - skW[i]; sw[i * 4 + 1] = skW[i]; }
    this.pos = new THREE.Float32BufferAttribute(gb.pos, 3);
    this.nor = new THREE.Float32BufferAttribute(gb.nor, 3);
    this.skinIndex = new THREE.Uint16BufferAttribute(si, 4);
    this.skinWeight = new THREE.Float32BufferAttribute(sw, 4);
    this.slot = new Uint8Array(gb.part);
    this.y = ys;
    this.n = n;
  }

  // ---------------------------------------------------------------- cabelo (espaço da cabeça)
  function hair(gb, style, female, S16) {
    var h = HC;
    gb.partId = C.hair;
    if (style === 'cacheado') {
      gb.add(S16, 0, h + 0.05, 0.02, 0.215, 0.19, 0.225, '#000');
      [[0.07, 0.1, -0.03], [-0.07, 0.1, -0.03], [0, 0.13, 0.0], [0.09, 0.06, 0.05], [-0.09, 0.06, 0.05], [0, 0.08, 0.1],
        [0.05, 0.12, 0.06], [-0.05, 0.12, 0.06], [0.0, 0.11, -0.06], [0.08, 0.02, 0.08], [-0.08, 0.02, 0.08]].forEach(function (p) {
        gb.add('icoS', p[0], h + p[1], p[2], 0.1, 0.09, 0.1, '#000');
      });
      return;
    }
    if (style === 'raspado') { gb.add(S16, 0, h + 0.022, 0.012, 0.176, 0.2, 0.2, '#000'); return; }
    // touca: a linha do cabelo aparece onde ela sai da cabeça
    gb.add(S16, 0, h + 0.045, 0.016, 0.186, 0.2, 0.208, '#000');
    gb.add(S16, 0, h - 0.008, 0.036, 0.178, 0.18, 0.17, '#000');                     // nuca
    gb.add(S16, 0.02, h + 0.085, -0.06, 0.12, 0.05, 0.075, '#000', 0.3, -0.35);      // franja
    gb.add(S16, -0.045, h + 0.08, -0.055, 0.09, 0.045, 0.065, '#000', -0.3, -0.3);
    gb.add('sph8', -0.083, h + 0.02, -0.01, 0.03, 0.08, 0.07, '#000');                // costeletas
    gb.add('sph8', 0.083, h + 0.02, -0.01, 0.03, 0.08, 0.07, '#000');
    if (style === 'rabo') {
      gb.add(S16, 0, h + 0.05, 0.08, 0.08, 0.07, 0.06, '#000');                       // prende o rabo
    } else if (style === 'coque') {
      gb.add(S16, 0, h + 0.12, 0.065, 0.1, 0.09, 0.1, '#000');
      gb.add('cyl10', 0, h + 0.085, 0.055, 0.07, 0.02, 0.07, '#000');
    } else if (style === 'longo') {
      gb.add('taper10', 0, h - 0.1, 0.06, 0.2, 0.26, 0.11, '#000', 0, Math.PI);
      gb.add(S16, 0, h - 0.23, 0.065, 0.18, 0.07, 0.1, '#000');
      gb.add(S16, -0.075, h - 0.05, -0.005, 0.05, 0.18, 0.08, '#000');
      gb.add(S16, 0.075, h - 0.05, -0.005, 0.05, 0.18, 0.08, '#000');
    } else if (female && style === 'curto') {
      gb.add(S16, 0, h - 0.04, 0.05, 0.19, 0.13, 0.13, '#000');
      gb.add(S16, -0.075, h - 0.03, -0.01, 0.05, 0.13, 0.09, '#000');
      gb.add(S16, 0.075, h - 0.03, -0.01, 0.05, 0.13, 0.09, '#000');
    }
  }

  function template(gender, hairStyle, lod) {
    var k = gender + '|' + hairStyle + '|' + lod;
    return templates[k] || (templates[k] = new Template(gender, hairStyle, lod));
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
  // faixa de altura (no corpo, em repouso) de cada roupa para as estampas
  var PAT_SHIRT = [HIP_H + 0.1, HIP_H + 0.5], PAT_SHORTS = [HIP_H - 0.2, HIP_H + 0.08];

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
    this._key = '';
    this._bindKey = '';
    this._geos = {};
    this._pal = [];
    for (var i = 0; i < NSLOT; i++) this._pal.push(new THREE.Color());
    this._ponyV = 0; this._ponyA = 0; this._ponyZ = 0; this._ponyVZ = 0;
  }
  var P = RunnerRig.prototype;

  var _c = new THREE.Color(), _a = new THREE.Color(), _w = new THREE.Color(1, 1, 1);
  function lin(hex, out) { return out.set(hex).convertSRGBToLinear(); }

  // pose de repouso do gênero e "amarra" a malha aos ossos
  P._bind = function (gender) {
    var bp = bonePos(gender), self = this;
    BONES.forEach(function (n) { var b = self[n]; b.position.fromArray(bp[n]); b.rotation.set(0, 0, 0); b.scale.set(1, 1, 1); });
    var rr = this.root.rotation.clone(), rp = this.root.position.clone(), sc = this.body.scale.clone();
    this.root.rotation.set(0, 0, 0); this.root.position.set(0, 0, 0); this.body.scale.set(1, 1, 1);
    this.root.updateMatrixWorld(true);
    this.skeleton.calculateInverses();
    this.mesh.bind(this.skeleton, this.mesh.matrixWorld);
    this.root.rotation.copy(rr); this.root.position.copy(rp); this.body.scale.copy(sc);
    this._bindKey = gender;
  };

  // app: cores já resolvidas { gender, skin, hairStyle, hair, shirt, shorts, shoes, bib, gear, pacer,
  //   shirtKind, shortsKind, shoeAccent } · gear: visual de cada espaço ({ kind, color, accent, pattern, lens })
  P.setAppearance = function (app) {
    var b = gcfg(app.gender), hp = b.hips, self = this, gear = app.gear || {};
    this.app = app;
    if (this._bindKey !== app.gender) this._bind(app.gender);
    this.body.scale.setScalar(b.height / 1.76);
    var shirtV = gear.shirt || {}, shortsV = gear.shorts || {}, shoesV = gear.shoes || {};
    var p = this._pal;
    lin(app.skin, p[C.skin]);
    p[C.skinShade].copy(p[C.skin]).multiplyScalar(0.9);
    lin(app.hair, p[C.hair]);
    lin(app.shirt, p[C.shirt]);
    p[C.shirtTrim].copy(p[C.shirt]).multiplyScalar(0.7);
    lin(app.shorts, p[C.shorts]);
    p[C.shortsTrim].copy(p[C.shorts]).lerp(lin('#ffffff', _c), 0.5);
    lin('#f0f0ee', p[C.sock]);
    lin(app.shoes, p[C.shoe]);
    lin('#fbfbf8', p[C.sole]);
    lin('#f4f1ec', p[C.eyeWhite]);
    lin('#3a2a20', p[C.eye]);
    lin('#7a3b33', p[C.mouth]);
    p[C.lips].copy(p[C.skin]).lerp(lin('#b5544a', _c), 0.35);
    if (app.bib) { lin('#ffffff', p[C.bib]); lin(app.bib, p[C.bibStripe]); }
    else { p[C.bib].copy(p[C.shirt]); p[C.bibStripe].copy(p[C.shirt]); }
    p[C.brow].copy(p[C.hair]).multiplyScalar(0.85);
    // partes que a roupa decide
    p[C.sleeve].copy(p[C.shirt]); p[C.sleeveTrim].copy(p[C.shirtTrim]); p[C.shoulder].copy(p[C.shirt]); p[C.belly].copy(p[C.shirt]);
    p[C.forearm].copy(p[C.skin]); p[C.thighSkin].copy(p[C.skin]); p[C.knee].copy(p[C.skin]); p[C.shinSkin].copy(p[C.skin]);
    // tênis de três cores: cabedal, detalhe (calcanhar e faixa) e sola
    p[C.shoeAccent].copy(p[C.shoe]).lerp(_w, 0.55);
    var accent = shirtV.accent ? lin(shirtV.accent, new THREE.Color()) : null;
    var kind = shirtV.kind || app.shirtKind;
    if (kind === 'regata' || kind === 'top') {
      p[C.sleeve].copy(p[C.skin]); p[C.sleeveTrim].copy(p[C.skin]); p[C.shoulder].copy(p[C.skin]);
      if (accent) p[C.shirtTrim].copy(accent);
      if (kind === 'top') p[C.belly].copy(p[C.skin]);
    } else if (kind === 'manga-longa' || kind === 'corta-vento') {
      p[C.forearm].copy(p[C.shirt]).multiplyScalar(0.95);
      if (accent) { p[C.shirtTrim].copy(accent); p[C.sleeveTrim].copy(p[C.shirt]).multiplyScalar(0.95); }
    } else if (accent && shirtV.pattern === 'faixa') p[C.sleeveTrim].copy(accent);
    var sAccent = shortsV.accent ? lin(shortsV.accent, new THREE.Color()) : null;
    if (sAccent && shortsV.pattern !== 'degrade') p[C.shortsTrim].copy(sAccent);
    var skind = shortsV.kind || app.shortsKind;
    if (skind === 'bermuda') p[C.thighSkin].copy(p[C.shorts]);
    else if (skind === 'legging') {
      p[C.shortsTrim].copy(p[C.shorts]).multiplyScalar(0.85);
      if (sAccent) p[C.shortsTrim].copy(sAccent);
      p[C.thighSkin].copy(p[C.shorts]); p[C.knee].copy(p[C.shorts]).multiplyScalar(0.95); p[C.shinSkin].copy(p[C.shorts]).multiplyScalar(0.95);
    }
    if (shoesV.accent) {
      var sa = lin(shoesV.accent, _a);
      p[C.shoeAccent].copy(sa);
      if (shoesV.kind === 'tenis-corrida' || shoesV.kind === 'tenis-pro') p[C.sole].copy(sa).lerp(_w, 0.35);
      if (shoesV.kind === 'tenis-pro') p[C.sock].copy(p[C.shoe]).lerp(_w, 0.6);
    } else if (app.shoeAccent) lin(app.shoeAccent, p[C.shoeAccent]);
    if (app.pacer) {   // colete do corredor-guia
      lin('#d9ff3d', p[C.shirt]); p[C.belly].copy(p[C.shirt]); p[C.shoulder].copy(p[C.skin]); p[C.sleeve].copy(p[C.skin]); p[C.sleeveTrim].copy(p[C.skin]);
      lin('#ff5a3d', p[C.shirtTrim]); lin('#ffffff', p[C.bib]); lin('#ff5a3d', p[C.bibStripe]);
    }
    this._pat = {
      shirt: !app.pacer && shirtV.pattern && accent ? shirtV.pattern : null, accent: accent,
      shorts: shortsV.pattern && sAccent && shortsV.pattern !== 'faixa' ? shortsV.pattern : null, sAccent: sAccent
    };
    this._key = app.gender + '|' + app.hairStyle;
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
    setAcc('skirt', skind === 'saia-short' ? { color: app.shorts, accent: shortsV.accent } : null, hp);
    setAcc('flag', app.pacer ? { kind: 'flag' } : null);
  };

  // pinta a geometria do molde atual (forma compartilhada, cor deste corredor)
  P._paint = function () {
    var app = this.app, t = template(app.gender, app.hairStyle, this.lod), gk = this._key + '|' + this.lod;
    var g = this._geos[gk];
    if (!g) {
      g = this._geos[gk] = new THREE.BufferGeometry();
      g.setAttribute('position', t.pos);
      g.setAttribute('normal', t.nor);
      g.setAttribute('skinIndex', t.skinIndex);
      g.setAttribute('skinWeight', t.skinWeight);
      g.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(t.n * 3), 3));
    }
    var p = this._pal, pat = this._pat, col = g.attributes.color.array, slot = t.slot, ys = t.y;
    for (var i = 0, j = 0; i < t.n; i++, j += 3) {
      var sl = slot[i], c = p[sl];
      if ((sl === C.shirt || sl === C.belly) && pat.shirt) {
        c = _c.copy(c).lerp(pat.accent, patternMix(pat.shirt, (ys[i] - PAT_SHIRT[0]) / (PAT_SHIRT[1] - PAT_SHIRT[0])));
      } else if (sl === C.shorts && pat.shorts) {
        c = _c.copy(c).lerp(pat.sAccent, patternMix(pat.shorts, (ys[i] - PAT_SHORTS[0]) / (PAT_SHORTS[1] - PAT_SHORTS[0])));
      }
      col[j] = c.r; col[j + 1] = c.g; col[j + 2] = c.b;
    }
    g.attributes.color.needsUpdate = true;
    this.mesh.geometry = g;
  };

  // nível de detalhe (0 = completo, 1 = leve): os corredores da rua trocam conforme a distância
  P.setLod = function (lod) {
    if (lod === this.lod) return;
    this.lod = lod;
    if (this.app) this._paint();
  };

  // ---------------------------------------------------------------- animação
  // A passada acompanha a velocidade real: a amplitude do quadril sai do
  // comprimento do passo (velocidade ÷ cadência), assim o pé apoiado não
  // escorrega no chão. opts: { idle, celebrate, lateral }
  P.animate = function (dt, speed, opts) {
    opts = opts || {};
    if (opts.idle || opts.celebrate) return this._idle(dt, opts);
    var run = U.smooth((speed - 5.8) / 2.6), sprint = U.smooth((speed - 14) / 5);
    var prev = this.phase, freq = U.table(STRIDE, speed);
    this.phase += dt * Math.PI * 2 * freq;
    var ph = this.phase, s = Math.sin(ph), c = Math.cos(ph);
    var omega = Math.PI * 2 * freq, A = U.clamp(speed / 3.6 / (0.88 * omega), 0.26, 0.62) * (1 + run * 0.18);
    var legs = [[this.legL, this.kneeL, this.footL, 0], [this.legR, this.kneeR, this.footR, Math.PI]];
    for (var i = 0; i < 2; i++) {
      var L = legs[i], p = ph + L[3], ls = Math.sin(p), lc = Math.cos(p);
      var swing = Math.max(0, lc);                                   // perna indo para a frente
      var hip = A * ls + run * 0.1 + swing * run * 0.12 * ls;
      // joelho: dobra muito no balanço (o calcanhar sobe), pouco no apoio
      var kneeSwing = U.lerp(0.45, 1.75, run) + sprint * 0.25;
      var knee = -(U.lerp(0.06, 0.22, run) * Math.max(0, -lc) * (0.6 + 0.4 * Math.max(0, ls)) +
        kneeSwing * Math.pow(Math.max(0, Math.sin(p + 0.55 + run * 0.25)), 1.6) * (0.35 + 0.65 * swing));
      // pé: toca de calcanhar (ponta para cima), fica plano no apoio e empurra com a ponta
      var stance = Math.max(0, -lc);
      var abs = 0.22 * Math.max(0, ls) * (1 - run * 0.5) - 0.65 * stance * Math.max(0, -ls) * (0.5 + run * 0.5) + swing * 0.12;
      L[0].rotation.set(hip, 0, (i ? -1 : 1) * 0.015);
      L[1].rotation.x = knee;
      L[2].rotation.x = abs - hip - knee;
    }
    // braços: balanço oposto às pernas; o cotovelo dobra mais quanto mais rápido
    var aa = U.lerp(0.28, 0.62, run) + sprint * 0.22, elbow = U.lerp(0.35, 1.45, run) + sprint * 0.12;
    this.armL.rotation.set(-aa * s + 0.08 * run, 0, -0.06 - run * 0.04);
    this.armR.rotation.set(aa * s + 0.08 * run, 0, 0.06 + run * 0.04);
    this.elbowL.rotation.set(-(elbow + 0.15 * Math.max(0, -s) * run), 0, 0.12 * run);
    this.elbowR.rotation.set(-(elbow + 0.15 * Math.max(0, s) * run), 0, -0.12 * run);
    // tronco e quadril: sobe e desce duas vezes por ciclo, gira levemente
    var bob = Math.abs(Math.cos(ph - 0.35));
    this.hips.position.y = HIP_H - run * 0.035 - U.lerp(0.012, 0.045, run) * (bob - 0.5) - 0.012 * (1 - run);
    this.hips.rotation.set(0, -0.08 * s, 0.035 * c * (1 - run * 0.4));
    var lean = U.lerp(0.035, 0.11, run) + sprint * 0.06;
    this.torso.rotation.set(-lean, 0.14 * s * (0.6 + run * 0.4), -0.02 * c);
    // a cabeça olha para a frente (compensa o giro do tronco)
    this.head.rotation.set(lean * 0.7 + 0.02 * (bob - 0.5) * run, -0.1 * s * (0.6 + run * 0.4), 0.02 * c);
    this._ponyStep(dt, run, bob, s);
    this.root.rotation.z = U.damp(this.root.rotation.z, -(opts.lateral || 0) * 0.045, 8, dt);
    if (this.onStep && Math.sin(prev) * s < 0) this.onStep(s > 0 ? 1 : -1);
  };

  // rabo de cavalo: mola amortecida puxada pelo sobe-e-desce e pelo giro
  P._ponyStep = function (dt, run, bob, s) {
    var targetX = 0.25 + run * 0.55 + (bob - 0.5) * 0.35 * run, targetZ = -s * 0.25 * (0.3 + run * 0.7);
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
      this.elbowL.rotation.set(-0.3, 0, 0); this.elbowR.rotation.set(-0.3, 0, 0);
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
      this.armL.rotation.set(0.06 + br * 0.02 + stretch * 2.7, 0, -0.08 - stretch * 0.15);
      this.armR.rotation.set(0.05 - br * 0.02 + stretch * 2.7, 0, 0.08 + stretch * 0.15);
      this.elbowL.rotation.set(-0.18 - stretch * 0.1, 0, 0); this.elbowR.rotation.set(-0.18 - stretch * 0.1, 0, 0);
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
      shirt: A.shirts[a.shirt] || A.shirts[0], shorts: A.shorts[a.shorts] || A.shorts[0], shoes: A.shoes[a.shoes] || A.shoes[0], bib: null,
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

  // corredores da rua: combinações de uma paleta esportiva (nada de cores soltas)
  RunnerRig.random = function (rnd) {
    var A = EP.data.appearance, K = A.npcKits || null;
    rnd = rnd || Math.random;
    var g = rnd() < 0.5 ? 'm' : 'f';
    var styles = A.hairStyles.map(function (h) { return h.id; });
    var kit = K ? U.pick(K, rnd) : null;
    return {
      gender: g, skin: U.pick(A.skin, rnd),
      hairStyle: g === 'f' ? (rnd() < 0.55 ? 'rabo' : U.pick(styles, rnd)) : (rnd() < 0.6 ? 'curto' : U.pick(['cacheado', 'raspado', 'curto'], rnd)),
      hair: U.pick(A.hairColors, rnd),
      shirt: kit ? kit[0] : U.pick(A.npcShirts, rnd), shorts: kit ? kit[1] : U.pick(A.npcShorts, rnd), shoes: kit ? kit[2] : U.pick(A.npcShoes, rnd),
      shoeAccent: kit ? kit[3] : null,
      shirtKind: g === 'f' ? U.pick(['top', 'regata', 'camiseta'], rnd) : (rnd() < 0.3 ? 'regata' : 'camiseta'),
      shortsKind: g === 'f' ? (rnd() < 0.6 ? 'legging' : 'short') : (rnd() < 0.15 ? 'legging' : 'short'),
      bib: null,
      gear: randomGear(rnd)
    };
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

  RunnerRig.templateCount = function () { return Object.keys(templates).length; };
  RunnerRig.template = template;
  EP.RunnerRig = RunnerRig;
})(window.EP);
