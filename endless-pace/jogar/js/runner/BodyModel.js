// BodyModel — o corredor esculpido (corpo, rosto, mãos, cabelo, roupas e tênis).
//
// Cada parte é um campo de distância (js/runner/Sculpt.js) em pose de repouso
// (em pé, braços ao lado do corpo, frente para -z, pés em y = 0). As roupas são
// cascas de verdade por cima do corpo: o corpo "inflado" pela espessura do
// tecido (mais folgado onde a roupa cai), recortado na barra, na gola e nas
// cavas — com dobras, cós, punhos e costuras. A pele que fica embaixo da roupa
// é removida (nada atravessa o tecido na corrida).
//
// Saída: geometria indexada com posição, normal, ossos (até 4 por vértice),
// material (pele, algodão, tecido técnico, cabelo, tênis, olho), espaço de cor
// e oclusão de ambiente já calculada. A cor final é pintada pelo RunnerRig.
(function bodyModelModule(EP) {
  'use strict';
  var S = EP.Sculpt, U = EP.util;
  var E = S.ellipsoid, CN = S.cone, SP = S.sphere;
  var sm = function (a, b, x) { var t = U.clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

  var HIP_H = 0.91, THIGH = 0.45, SHIN = 0.385, NECK_Y = 0.52, UPPER = 0.27, HC = 0.165;
  var BONES = ['hips', 'torso', 'head', 'armL', 'elbowL', 'armR', 'elbowR', 'legL', 'kneeL', 'footL', 'legR', 'kneeR', 'footR', 'pony'];
  var BI = {}; BONES.forEach(function (b, i) { BI[b] = i; });
  var MIRROR_BONE = BONES.map(function (b) { return BI[b.replace(/L$/, '#').replace(/R$/, 'L').replace(/#$/, 'R')]; });

  // espaços de cor (o RunnerRig dá a cor de cada um)
  var C = { skin: 0, lips: 1, brow: 2, lash: 3, eyeWhite: 4, iris: 5, pupil: 6, hair: 7,
    shirt: 8, shirtTrim: 9, shirtAccent: 10, shorts: 11, shortsTrim: 12, shortsAccent: 13,
    sock: 14, shoe: 15, shoeAccent: 16, sole: 17, midsole: 18, lace: 19, nail: 20, cheek: 21 };
  var NSLOT = 22;
  // materiais (o shader do corredor muda brilho e textura por material)
  var MAT = { skin: 0, cotton: 1, tech: 2, hair: 3, shoe: 4, eye: 5 };

  function gcfg(gender) {
    var g = EP.data.appearance.genders.filter(function (x) { return x.id === gender; })[0] || EP.data.appearance.genders[0];
    return g.body;
  }

  // posição dos ossos (no osso pai) — a mesma pose de repouso da escultura
  function bonePos(gender) {
    var b = gcfg(gender), sh = b.shoulders, hp = b.hips, f = gender === 'f';
    var hx = hp * (f ? 0.29 : 0.28);
    return {
      hips: [0, HIP_H, 0], torso: [0, 0, 0], head: [0, NECK_Y, 0.005],
      armL: [-(sh / 2 + 0.005), 0.435, 0.005], elbowL: [0, -UPPER, 0], armR: [sh / 2 + 0.005, 0.435, 0.005], elbowR: [0, -UPPER, 0],
      legL: [-hx, -0.01, 0], kneeL: [0, -THIGH, 0], footL: [0, -SHIN, 0],
      legR: [hx, -0.01, 0], kneeR: [0, -THIGH, 0], footR: [0, -SHIN, 0],
      pony: [0, HC + 0.05, 0.1]
    };
  }

  // medidas do corpo de cada gênero (em metros, no espaço do corpo em repouso)
  function dims(gender) {
    var b = gcfg(gender), f = gender === 'f';
    var sx = b.shoulders / 2 + 0.005, hx = b.hips * (f ? 0.29 : 0.28);
    return { f: f, sx: sx, hx: hx, shY: HIP_H + 0.435, elY: HIP_H + 0.435 - UPPER, wrY: HIP_H + 0.435 - UPPER - 0.235,
      hipY: HIP_H - 0.01, kneeY: HIP_H - 0.01 - THIGH, ankY: HIP_H - 0.01 - THIGH - SHIN, neckY: HIP_H + NECK_Y, headY: HIP_H + NECK_Y + HC };
  }

  // ---------------------------------------------------------------- corpo
  function torsoParts(D) {
    var f = D.f, P = [];
    var add = function (fn, k, tag) { P.push({ f: fn, k: k || 0, tag: tag || 'skin' }); };
    if (!f) {
      add(E(0, 0.935, 0.005, 0.158, 0.105, 0.105));
      add(E(-0.068, 0.885, 0.045, 0.082, 0.092, 0.075), 0.035); add(E(0.068, 0.885, 0.045, 0.082, 0.092, 0.075), 0.035);
      add(E(0, 0.86, 0.0, 0.07, 0.06, 0.07), 0.03);
      add(E(0, 1.06, -0.008, 0.14, 0.125, 0.098), 0.06);
      add(E(0, 1.215, 0.0, 0.165, 0.165, 0.112), 0.06);
      add(E(-0.062, 1.265, -0.052, 0.078, 0.058, 0.045), 0.035); add(E(0.062, 1.265, -0.052, 0.078, 0.058, 0.045), 0.035);
      add(E(0, 1.3, 0.03, 0.17, 0.11, 0.085), 0.05);
      add(CN(-0.045, 1.4, 0.012, -0.178, 1.355, 0.01, 0.05, 0.042), 0.05); add(CN(0.045, 1.4, 0.012, 0.178, 1.355, 0.01, 0.05, 0.042), 0.05);
      add(CN(0, 1.36, 0.012, 0, 1.5, 0.0, 0.056, 0.05), 0.04);
    } else {
      add(E(0, 0.93, 0.008, 0.17, 0.11, 0.108));
      add(E(-0.075, 0.88, 0.05, 0.09, 0.1, 0.082), 0.035); add(E(0.075, 0.88, 0.05, 0.09, 0.1, 0.082), 0.035);
      add(E(0, 0.855, 0.0, 0.075, 0.06, 0.07), 0.03);
      add(E(0, 1.06, -0.004, 0.122, 0.12, 0.09), 0.06);
      add(E(0, 1.205, 0.0, 0.142, 0.15, 0.1), 0.06);
      add(E(-0.056, 1.24, -0.058, 0.066, 0.062, 0.058), 0.03, 'bust'); add(E(0.056, 1.24, -0.058, 0.066, 0.062, 0.058), 0.03, 'bust');
      add(E(0, 1.29, 0.03, 0.148, 0.1, 0.075), 0.05);
      add(CN(-0.04, 1.395, 0.012, -0.155, 1.36, 0.01, 0.045, 0.038), 0.05); add(CN(0.04, 1.395, 0.012, 0.155, 1.36, 0.01, 0.045, 0.038), 0.05);
      add(CN(0, 1.36, 0.012, 0, 1.5, 0.0, 0.05, 0.045), 0.04);
    }
    return P;
  }
  // braço esquerdo (x negativo); o direito é o espelho
  function armParts(D) {
    var x = -D.sx, s = D.f ? 0.86 : 1, P = [], sh = D.shY, el = D.elY;
    var add = function (fn, k) { P.push({ f: fn, k: k || 0, tag: 'skin' }); };
    add(E(x + 0.002, sh - 0.015, 0.0, 0.056 * s, 0.07 * s, 0.062 * s));
    add(CN(x, sh - 0.005, 0.005, x, el + 0.01, 0.005, 0.046 * s, 0.037 * s), 0.03);
    add(E(x, sh - 0.13, -0.016, 0.038 * s, 0.075 * s, 0.036 * s), 0.03);
    add(E(x - 0.004, sh - 0.11, 0.022, 0.04 * s, 0.085 * s, 0.036 * s), 0.03);
    add(SP(x, el, 0.008, 0.034 * s), 0.02);
    add(CN(x, el - 0.005, 0.005, x, D.wrY + 0.01, 0.0, 0.037 * s, 0.024 * s), 0.03);
    add(E(x + 0.004, el - 0.065, -0.004, 0.04 * s, 0.07 * s, 0.035 * s), 0.03);
    add(E(x, D.wrY + 0.005, 0, 0.024 * s, 0.02 * s, 0.02 * s), 0.015);
    return P;
  }
  // mão esquerda fechada de leve (punho de corredor), palma virada para o corpo
  function handParts(D) {
    var x = -D.sx, pd = 1, s = D.f ? 0.9 : 1, w = D.wrY, P = [];
    var add = function (fn, k, tag) { P.push({ f: fn, k: k || 0, tag: tag || 'skin' }); };
    add(E(x, w - 0.05 * s, -0.004, 0.022 * s, 0.045 * s, 0.038 * s));
    var lens = [0.88, 1, 0.95, 0.8];
    for (var i = 0; i < 4; i++) {
      var z = (-0.024 + i * 0.016) * s, L = lens[i] * s, ky = w - 0.083 * s;
      add(CN(x, ky, z, x + pd * 0.013 * L, ky - 0.03 * L, z, 0.0095 * s, 0.0085 * s), 0.006);
      add(CN(x + pd * 0.013 * L, ky - 0.03 * L, z, x + pd * 0.03 * L, ky - 0.021 * L, z, 0.0085 * s, 0.0075 * s), 0.004, 'nail');
    }
    add(CN(x + pd * 0.012, w - 0.035 * s, -0.03 * s, x + pd * 0.024, w - 0.067 * s, -0.043 * s, 0.011 * s, 0.009 * s), 0.008);
    add(E(x, w + 0.003, 0, 0.024 * s, 0.025 * s, 0.021 * s), 0.01);
    return P;
  }
  function legParts(D) {
    var x = -D.hx, f = D.f, P = [], k = D.kneeY;
    var add = function (fn, kk) { P.push({ f: fn, k: kk || 0, tag: 'skin' }); };
    add(CN(x * 1.05, 0.95, 0.0, x, k + 0.025, 0.0, f ? 0.09 : 0.085, f ? 0.048 : 0.05));
    add(E(x, 0.7, -0.028, f ? 0.056 : 0.062, 0.17, f ? 0.048 : 0.052), 0.04);
    add(E(x + 0.018, k + 0.08, -0.02, 0.042, 0.06, 0.04), 0.03);
    add(E(x, 0.72, 0.03, f ? 0.058 : 0.06, 0.16, f ? 0.05 : 0.05), 0.04);
    if (f) add(E(x * 0.8, 0.8, 0.0, 0.06, 0.1, 0.06), 0.04);
    add(E(x, k + 0.005, -0.008, 0.047, 0.05, 0.046), 0.03);
    add(E(x, k + 0.015, -0.042, 0.024, 0.028, 0.014), 0.015);
    add(CN(x, k - 0.005, 0.0, x, D.ankY + 0.02, 0.005, 0.045, 0.029), 0.03);
    add(E(x - 0.004, k - 0.12, 0.028, f ? 0.045 : 0.05, 0.11, f ? 0.042 : 0.046), 0.04);
    add(E(x + 0.012, k - 0.14, 0.025, 0.04, 0.09, 0.04), 0.03);
    add(SP(x, D.ankY + 0.01, 0.005, 0.033), 0.02);
    return P;
  }
  function headParts(D) {
    var f = D.f, Y = D.headY, P = [];
    var add = function (fn, k, tag, sub) { P.push({ f: fn, k: k || 0, tag: tag || 'skin', sub: !!sub }); };
    add(E(0, Y + 0.02, 0.012, 0.079, 0.1, 0.097));
    add(E(0, Y + 0.005, 0.04, 0.075, 0.085, 0.07), 0.03);
    add(E(0, Y - 0.05, -0.022, f ? 0.055 : 0.06, f ? 0.052 : 0.058, f ? 0.066 : 0.07), 0.04);
    add(E(0, Y - 0.082, -0.06, f ? 0.021 : 0.026, 0.02, 0.02), 0.02);
    var ck = f ? 1.12 : 1; add(E(-0.043, Y - 0.013, -0.05, 0.03 * ck, 0.024 * ck, 0.03 * ck), 0.025, 'cheek'); add(E(0.043, Y - 0.013, -0.05, 0.03 * ck, 0.024 * ck, 0.03 * ck), 0.025, 'cheek');
    add(E(0, Y + 0.029, -0.074, 0.058, f ? 0.011 : 0.014, 0.02), 0.02);
    add(CN(0, Y + 0.023, -0.087, 0, Y - 0.019, f ? -0.099 : -0.102, f ? 0.0065 : 0.008, f ? 0.0098 : 0.013), 0.012);
    add(E(-0.011, Y - 0.021, -0.093, 0.01, 0.008, 0.009), 0.006); add(E(0.011, Y - 0.021, -0.093, 0.01, 0.008, 0.009), 0.006);
    add(E(0, Y - 0.043, -0.088, 0.021, f ? 0.0075 : 0.0065, 0.011), 0.006, 'lips');
    add(E(0, Y - 0.054, -0.085, 0.018, f ? 0.0078 : 0.0068, 0.011), 0.006, 'lips');
    add(SP(-0.032, Y + 0.011, -0.09, 0.016), 0.012, 'skin', true); add(SP(0.032, Y + 0.011, -0.09, 0.016), 0.012, 'skin', true);
    add(E(-0.032, Y + 0.019, -0.0805, 0.0178, 0.0078, 0.0118), 0.004, 'lid'); add(E(0.032, Y + 0.019, -0.0805, 0.0178, 0.0078, 0.0118), 0.004, 'lid');
    add(E(-0.032, Y - 0.0025, -0.08, 0.016, 0.0048, 0.011), 0.004, 'lidLow'); add(E(0.032, Y - 0.0025, -0.08, 0.016, 0.0048, 0.011), 0.004, 'lidLow');
    add(E(-0.078, Y + 0.003, 0.008, 0.012, 0.03, 0.02), 0.008, 'ear'); add(E(0.078, Y + 0.003, 0.008, 0.012, 0.03, 0.02), 0.008, 'ear');
    add(CN(0, D.neckY - 0.02, 0.012, 0, Y - 0.035, 0.004, f ? 0.049 : 0.054, f ? 0.045 : 0.05), 0.035);
    return P;
  }

  // ---------------------------------------------------------------- tênis (pé esquerdo)
  function shoeField(D) {
    var x = -D.hx, z0 = 0.005;
    var sole = S.union([{ f: E(x, 0.02, z0 - 0.105, 0.052, 0.06, 0.1) }, { f: E(x, 0.02, z0 + 0.012, 0.044, 0.06, 0.065), k: 0.04 }]);
    var upper = S.union([
      { f: E(x, 0.045, z0 - 0.1, 0.046, 0.036, 0.09) },
      { f: E(x, 0.062, z0 - 0.025, 0.047, 0.05, 0.075), k: 0.03 },
      { f: E(x, 0.066, z0 + 0.028, 0.042, 0.056, 0.046), k: 0.03 },
      { f: E(x, 0.1, z0 - 0.04, 0.026, 0.013, 0.042), k: 0.012 }
    ]);
    var collar = E(x, 0.118, z0 + 0.012, 0.034, 0.032, 0.042);
    return function (px, py, pz) {
      var s = S.smax(S.smax(sole(px, py, pz), 0.003 - py, 0.004), py - 0.036, 0.004);
      var u = S.smax(S.smax(upper(px, py, pz), -collar(px, py, pz), 0.008), py - 0.125, 0.006);
      return Math.min(s, u);
    };
  }
  function shoeSlot(D) {
    var x = -D.hx, z0 = 0.005;
    return function (px, py, pz) {
      var lx = px - x;
      if (py < 0.011) return C.sole;
      if (py < 0.036 && Math.abs(lx) > 0.0) {
        // entressola: mais alta no calcanhar
        if (py < 0.03 + Math.max(0, (pz - z0)) * 0.12) return C.midsole;
      }
      // cadarço por cima, na frente da abertura
      if (Math.abs(lx) < 0.017 && pz < z0 - 0.015 && pz > z0 - 0.115 && py > 0.07 + (z0 - 0.02 - pz) * -0.35) {
        return (Math.floor((pz - z0) / 0.011) & 1) ? C.lace : C.shoe;
      }
      // contraforte e faixa lateral (o "detalhe" de cor)
      if (pz > z0 + 0.03 && py < 0.11) return C.shoeAccent;
      if (Math.abs(lx) > 0.03 && py > 0.035 && py < 0.07 - (pz - z0 + 0.1) * 0.12 && pz < z0 + 0.03 && pz > z0 - 0.15) return C.shoeAccent;
      if (py > 0.112) return C.shoeAccent;   // gola acolchoada
      return C.shoe;
    };
  }

  // ---------------------------------------------------------------- cabelo
  function hairline(D, x, y, z) {
    var th = Math.abs(Math.atan2(x, -(z - 0.012))), Y = D.headY;   // 0 = testa, π = nuca
    var lim;
    if (th < 0.75) lim = Y + 0.062 - th * 0.03;
    else if (th < 1.5) lim = U.lerp(Y + 0.04, Y + 0.035, (th - 0.75) / 0.75);
    else if (th < 2.1) lim = U.lerp(Y + 0.035, Y - 0.02, (th - 1.5) / 0.6);
    else lim = U.lerp(Y - 0.02, Y - 0.075, Math.min(1, (th - 2.1) / 0.8));
    return lim - y;
  }
  function hairField(D, style) {
    var Y = D.headY, f = D.f;
    var skull = S.union([{ f: E(0, Y + 0.02, 0.012, 0.079, 0.1, 0.097) }, { f: E(0, Y + 0.005, 0.04, 0.075, 0.085, 0.07), k: 0.03 }]);
    var extra = [];
    if (style === 'coque') extra.push({ f: E(0, Y + 0.115, 0.06, 0.046, 0.04, 0.046), k: 0.02 });
    if (style === 'rabo') extra.push({ f: SP(0, Y + 0.05, 0.103, 0.02), k: 0.015 });
    if (style === 'longo') {
      extra.push({ f: CN(0, Y + 0.0, 0.07, 0, Y - 0.24, 0.085, 0.075, 0.06), k: 0.04 });
      extra.push({ f: CN(-0.068, Y + 0.03, -0.02, -0.075, Y - 0.12, 0.02, 0.022, 0.016), k: 0.03 });
      extra.push({ f: CN(0.068, Y + 0.03, -0.02, 0.075, Y - 0.12, 0.02, 0.022, 0.016), k: 0.03 });
    }
    var ex = extra.length ? S.union(extra) : null;
    var bob = f && style === 'curto';
    return function (x, y, z) {
      var t;
      if (style === 'raspado') t = 0.0035;
      else if (style === 'cacheado') t = 0.026 + 0.012 * S.noise(x * 48, y * 48, z * 48) + 0.006 * sm(Y, Y + 0.09, y);
      else if (style === 'rabo' || style === 'coque' || style === 'longo') t = 0.007 - 0.0016 * Math.abs(Math.sin(Math.atan2(x, z) * 22 + y * 30));
      else t = 0.011 + 0.012 * sm(Y + 0.03, Y + 0.1, y) + 0.003 * S.noise(x * 70, y * 70, z * 70);
      var d = skull(x, y, z) - t;
      var line = hairline(D, x, y, z);
      if (bob) line = Math.min(line, Math.max(Y - 0.07 - y, (Math.abs(Math.atan2(x, -(z - 0.012))) < 1.05 ? 1 : -1) * 0.02));
      d = S.smax(d, line, 0.006);
      if (ex) d = S.smin(d, ex(x, y, z) + 0.002 * S.noise(x * 60, y * 25, z * 60), 0.02);
      return d;
    };
  }
  function ponyField(D) {
    var Y = D.headY;
    var chain = S.union([
      { f: CN(0, Y + 0.045, 0.112, 0, Y - 0.035, 0.14, 0.028, 0.034) },
      { f: CN(0, Y - 0.035, 0.14, 0, Y - 0.145, 0.135, 0.034, 0.021), k: 0.02 },
      { f: CN(0, Y - 0.145, 0.135, 0, Y - 0.2, 0.124, 0.021, 0.005), k: 0.015 }
    ]);
    return function (x, y, z) { return chain(x, y, z) + 0.003 * Math.abs(Math.sin(Math.atan2(x, z - 0.13) * 9 + y * 20)); };
  }

  // ---------------------------------------------------------------- roupas
  // Cada roupa: partes (sobre qual parte do corpo), espessura/folga, recorte
  // (região: negativo = tem tecido), material e pintura.
  function garment(kind, D) {
    var f = D.f, sx = D.sx, hx = D.hx, neckY = D.neckY;
    var G = { parts: [], mat: MAT.cotton };
    // gola: o tecido acaba numa linha em volta do pescoço (mais baixa na frente;
    // sobe longe do pescoço para não cortar os ombros). drop = quanto desce na frente
    var neckHole = function (x, y, z, r, drop) {
      var rr = Math.sqrt(x * x + z * z * 1.6), front = U.clamp(-z / 0.07, 0, 1), back = U.clamp(z / 0.06, 0, 1);
      var cut = neckY - 0.022 - drop * front * front + 0.012 * back + 1.4 * Math.max(0, rr - r);
      return y - cut;
    };
    var armhole = function (x, y, cx, cy, rx, ry) { var a = (Math.abs(x) - cx) / rx, b = (y - cy) / ry; return (1 - a * a - b * b) * 0.04; };
    var waistFold = function (x, y, z, top) { return 0.0018 * Math.sin(y * 120 + 3 * S.noise(x * 18, y * 4, z * 18)) * sm(top, top - 0.12, y); };
    if (kind === 'camiseta' || kind === 'manga-longa' || kind === 'corta-vento') {
      var loose = kind === 'corta-vento' ? 0.012 : 0;
      var hem = kind === 'corta-vento' ? 0.84 : 0.875;
      G.parts.push({ on: 'torso', drape: true,
        t: function (x, y, z) { return 0.008 + loose + 0.012 * sm(1.2, 0.95, y) + waistFold(x, y, z, 1.02); },
        region: function (x, y, z) { return Math.max(hem - y, neckHole(x, y, z, 0.066, kind === 'corta-vento' ? 0.005 : 0.03)); },
        slot: function (x, y, z) {
          if (y < hem + 0.022) return C.shirtTrim;
          if (neckHole(x, y, z, 0.066, kind === 'corta-vento' ? 0.005 : 0.03) > -0.016) return C.shirtTrim;
          if (kind === 'corta-vento' && z < 0 && Math.abs(x) < 0.006) return C.shirtAccent;
          if (kind !== 'corta-vento' && x < -0.05 && x > -0.095 && y > 1.24 && y < 1.285 && z < 0) return C.shirtAccent;   // logo
          return C.shirt;
        } });
      var sleeveEnd = kind === 'camiseta' ? D.shY - 0.175 : D.wrY + 0.02;
      G.parts.push({ on: 'arm',
        t: function (x, y, z) { return 0.008 + loose + (kind === 'camiseta' ? 0.012 * sm(D.shY - 0.06, sleeveEnd, y) : 0.004 + 0.002 * Math.sin(y * 90 + S.noise(x * 30, y * 9, z * 30) * 2)); },
        region: function (x, y) { return sleeveEnd - y; },
        slot: function (x, y) { return y < sleeveEnd + 0.02 ? C.shirtTrim : C.shirt; } });
      if (kind === 'corta-vento') G.extra = { collar: true };
    } else if (kind === 'regata') {
      G.parts.push({ on: 'torso', drape: true,
        t: function (x, y, z) { return 0.007 + 0.01 * sm(1.2, 0.95, y) + waistFold(x, y, z, 1.02); },
        region: function (x, y, z) { return Math.max(0.875 - y, neckHole(x, y, z, 0.075, 0.09), armhole(x, y, sx - 0.005, D.shY - 0.05, 0.085, 0.16)); },
        slot: function (x, y, z) {
          if (y < 0.897) return C.shirtTrim;
          if (neckHole(x, y, z, 0.075, 0.09) > -0.014 || armhole(x, y, sx - 0.005, D.shY - 0.05, 0.1, 0.18) > -0.002) return C.shirtTrim;
          return C.shirt;
        } });
    } else if (kind === 'top') {
      G.mat = MAT.tech;
      G.parts.push({ on: 'torso',
        t: function () { return 0.005; },
        region: function (x, y, z) {
          var back = (Math.abs(x) - 0.032 - Math.max(0, 1.37 - y) * 0.75) * 0.5;   // costas nadador (em Y)
          return Math.max(1.155 - y, neckHole(x, y, z, 0.08, 0.12), armhole(x, y, sx - 0.0, D.shY - 0.06, 0.09, 0.17), z > 0.02 && y > 1.2 ? back : -1);
        },
        slot: function (x, y, z) { return y < 1.18 || neckHole(x, y, z, 0.08, 0.12) > -0.012 ? C.shirtTrim : C.shirt; } });
    } else if (kind === 'short' || kind === 'bermuda' || kind === 'legging' || kind === 'saia-short') {
      var legging = kind === 'legging';
      if (legging) G.mat = MAT.tech;
      var top = 0.985, legEnd = legging ? D.ankY + 0.04 : kind === 'bermuda' ? D.kneeY + 0.03 : f ? 0.76 : 0.64;
      var tl = legging ? 0.0035 : 0.009;
      G.parts.push({ on: 'torso',
        t: function (x, y, z) { return tl + (legging ? 0 : 0.004 * sm(0.95, 0.85, y)); },
        region: function (x, y) { return y - top; },
        slot: function (x, y) { return y > top - 0.032 ? C.shortsTrim : C.shorts; } });
      G.parts.push({ on: 'leg',
        t: function (x, y, z) {
          if (legging) return tl + 0.0012 * Math.sin(y * 140 + S.noise(x * 30, y * 6, z * 30) * 2) * sm(D.kneeY + 0.06, D.kneeY, y) * sm(D.kneeY - 0.08, D.kneeY - 0.02, y);
          return tl + (f ? 0.008 : 0.016) * sm(0.86, legEnd, y) + 0.0015 * S.noise(x * 25, y * 12, z * 25);
        },
        region: function (x, y) { return legEnd - y; },
        slot: function (x, y, z) {
          if (y < legEnd + (legging ? 0.012 : 0.018)) return C.shortsTrim;
          var side = Math.abs(Math.abs(x) - hx) > 0.04 && Math.abs(z) < 0.018 && Math.abs(x) > hx;
          if (side) return C.shortsAccent;
          return C.shorts;
        } });
      if (kind === 'saia-short') G.extra = { skirt: true };
    } else if (kind === 'meia') {
      G.parts.push({ on: 'leg', t: function () { return 0.003; }, region: function (x, y) { return y - (D.ankY + 0.07); },
        slot: function (x, y) { return y > D.ankY + 0.055 ? C.shortsTrim : C.sock; }, sockSlot: true });
    }
    return G;
  }

  // ---------------------------------------------------------------- ossos de cada vértice
  // regras suaves por parte (pose de repouso): junta = mistura dos dois ossos
  function weightsFor(D, base, x, y, z) {
    var side = x < 0 ? 'L' : 'R', w = [];
    var push = function (b, v) { if (v > 0.001) w.push([BI[b], v]); };
    if (base === 'torso') {
      var head = sm(D.neckY - 0.04, D.neckY + 0.05, y) * 0.8;
      var leg = sm(D.hipY + 0.03, D.hipY - 0.07, y) * 0.55;
      var torso = sm(HIP_H + 0.02, HIP_H + 0.16, y);
      push('head', head);
      push('leg' + side, leg * (1 - torso));
      push('torso', torso * (1 - head));
      push('hips', (1 - torso) * (1 - leg));
    } else if (base === 'arm' || base === 'hand') {
      var tor = base === 'arm' ? sm(D.shY - 0.06, D.shY + 0.02, y) * 0.5 : 0;
      var el = sm(D.elY + 0.045, D.elY - 0.035, y);
      push('torso', tor);
      push('arm' + side, (1 - el) * (1 - tor));
      push('elbow' + side, el * (1 - tor));
    } else if (base === 'leg' || base === 'shoe') {
      var hp = sm(D.hipY - 0.06, D.hipY + 0.03, y) * 0.45;
      var kn = sm(D.kneeY + 0.05, D.kneeY - 0.04, y);
      var ft = base === 'shoe' ? 1 - sm(D.ankY + 0.03, D.ankY + 0.08, y) * 0.35 : sm(D.ankY + 0.06, D.ankY + 0.0, y) * 0.5;
      push('hips', hp);
      push('leg' + side, (1 - kn) * (1 - hp));
      push('knee' + side, kn * (1 - ft) * (1 - hp));
      push('foot' + side, kn * ft);
    } else if (base === 'head' || base === 'hair') {
      var nk = base === 'head' ? sm(D.neckY + 0.07, D.neckY + 0.01, y) * 0.75 : 0;
      push('torso', nk); push('head', 1 - nk);
    } else if (base === 'pony') {
      var rt = sm(D.headY + 0.02, D.headY + 0.05, y) * 0.6;
      push('head', rt); push('pony', 1 - rt);
    }
    w.sort(function (a, b) { return b[1] - a[1]; });
    w = w.slice(0, 4);
    var tot = 0; w.forEach(function (e) { tot += e[1]; });
    return w.map(function (e) { return [e[0], e[1] / (tot || 1)]; });
  }

  // ---------------------------------------------------------------- montagem das peças
  var cache = {};
  var LOD_H = [1, 2, 3.4];   // multiplicador do tamanho da célula por nível de detalhe

  function boxOfParts(D, base) {
    var f = D.f;
    switch (base) {
      case 'torso': return [-0.26, 0.76, -0.19, 0.26, 1.53, 0.17];
      case 'arm': return [-D.sx - 0.085, D.wrY - 0.03, -0.09, -D.sx + 0.085, D.shY + 0.08, 0.09];
      case 'hand': return [-D.sx - 0.05, D.wrY - 0.13, -0.065, -D.sx + 0.05, D.wrY + 0.03, 0.05];
      case 'leg': return [-D.hx - 0.13, D.ankY - 0.04, -0.12, -D.hx + 0.13, 1.0, 0.12];
      case 'head': return [-0.1, D.neckY - 0.04, -0.125, 0.1, D.headY + 0.14, 0.13];
      case 'shoe': return [-D.hx - 0.065, -0.005, -0.21, -D.hx + 0.065, 0.14, 0.08];
      case 'hair': return [-0.12, D.headY - 0.3, -0.13, 0.12, D.headY + 0.17, 0.2];
      case 'pony': return [-0.06, D.headY - 0.24, 0.07, 0.06, D.headY + 0.08, 0.2];
    }
    return null;
  }
  var BASE_H = { torso: 0.022, arm: 0.015, hand: 0.0085, leg: 0.02, head: 0.0085, shoe: 0.0095, hair: 0.0105, pony: 0.011, eye: 0.0032 };

  // campos do corpo de um gênero (guardados)
  function bodyFields(gender) {
    var key = 'f|' + gender;
    if (cache[key]) return cache[key];
    var D = dims(gender);
    var F = { D: D, torso: S.union(torsoParts(D)), arm: S.union(armParts(D)), hand: S.union(handParts(D)), leg: S.union(legParts(D)), head: S.union(headParts(D)) };
    // contorno "vestido" do tronco: a camiseta cai do peito, sem marcar barriga e costelas
    var hull = D.f ? E(0, 1.1, -0.004, 0.15, 0.26, 0.105) : E(0, 1.11, -0.002, 0.168, 0.28, 0.112);
    F.torsoDrape = function (x, y, z) { return S.smin(F.torso(x, y, z), hull(x, y, z) + 0.004, 0.09); };
    // sombra (oclusão): só as partes vizinhas de cada uma (mais rápido)
    var near = {
      torso: function (x, y, z) { var ax = -Math.abs(x); return Math.min(F.torso(x, y, z), F.arm(ax, y, z), y < 1.05 ? F.leg(ax, y, z) : 1, y > 1.35 ? F.head(x, y, z) : 1); },
      arm: function (x, y, z) { var ax = -Math.abs(x); return Math.min(F.arm(ax, y, z), F.torso(x, y, z)); },
      hand: function (x, y, z) { var ax = -Math.abs(x); return Math.min(F.hand(ax, y, z), F.arm(ax, y, z), F.leg(ax, y, z)); },
      leg: function (x, y, z) { var ax = -Math.abs(x); return Math.min(F.leg(ax, y, z), F.leg(-ax, y, z), y > 0.75 ? F.torso(x, y, z) : 1); },
      head: function (x, y, z) { return Math.min(F.head(x, y, z), y < 1.5 ? F.torso(x, y, z) : 1); }
    };
    F.occ = function (x, y, z) {
      var ax = -Math.abs(x);
      return Math.min(F.torso(x, y, z), F.arm(ax, y, z), F.hand(ax, y, z), F.leg(ax, y, z), F.head(x, y, z));
    };
    F.occOf = function (base) { return near[base] || F.occ; };
    return (cache[key] = F);
  }

  // malha de um campo com tudo o que o corredor precisa
  function build(F, base, field, box, h, slotFn, matFn, opts) {
    var m = S.mesh(field, box, h), D = F.D, n = m.n;
    var slot = new Uint8Array(n), ao = new Float32Array(n), tone = new Float32Array(n), mat = new Uint8Array(n);
    var si = new Uint16Array(n * 4), sw = new Float32Array(n * 4);
    var occ = opts && opts.occ || F.occOf(base);
    for (var i = 0; i < n; i++) {
      var x = m.pos[i * 3], y = m.pos[i * 3 + 1], z = m.pos[i * 3 + 2];
      var r = slotFn(x, y, z, i, m);
      slot[i] = r;
      mat[i] = matFn(r);
      ao[i] = S.ao(occ, x, y, z, m.nor[i * 3], m.nor[i * 3 + 1], m.nor[i * 3 + 2], opts && opts.aoStep);
      tone[i] = opts && opts.tone ? opts.tone(x, y, z) : 1;
      var w = weightsFor(D, base, x, y, z);
      for (var k = 0; k < 4; k++) { si[i * 4 + k] = w[k] ? w[k][0] : 0; sw[i * 4 + k] = w[k] ? w[k][1] : 0; }
    }
    return { pos: m.pos, nor: m.nor, index: m.index, n: n, slot: slot, ao: ao, tone: tone, mat: mat, si: si, sw: sw, base: base };
  }

  function mirror(p) {
    var n = p.n, pos = new Float32Array(p.pos), nor = new Float32Array(p.nor), idx = new Uint32Array(p.index.length), si = new Uint16Array(p.si);
    for (var i = 0; i < n; i++) { pos[i * 3] = -pos[i * 3]; nor[i * 3] = -nor[i * 3]; }
    for (i = 0; i < p.index.length; i += 3) { idx[i] = p.index[i]; idx[i + 1] = p.index[i + 2]; idx[i + 2] = p.index[i + 1]; }
    for (i = 0; i < si.length; i++) si[i] = MIRROR_BONE[si[i]];
    return { pos: pos, nor: nor, index: idx, n: n, slot: p.slot, ao: p.ao, tone: p.tone, mat: p.mat, si: si, sw: p.sw, base: p.base, cover: p.cover };
  }

  var skinMat = function () { return MAT.skin; };

  // uma peça (com cache): 'torso', 'armL', 'handR', 'legL', 'head', 'shoeL', 'hair:rabo', 'pony',
  // 'g:<roupa>:<parte>:<L|R|>'
  function piece(gender, name, lod) {
    var key = gender + '|' + name + '|' + lod;
    if (cache[key]) return cache[key];
    var F = bodyFields(gender), D = F.D, L = LOD_H[lod] || 1, out;
    var side = name.slice(-1);
    if ((side === 'R') && name.indexOf(':') < 0) return (cache[key] = mirror(piece(gender, name.slice(0, -1) + 'L', lod)));
    if (name.indexOf('g:') === 0 && side === 'R') return (cache[key] = mirror(piece(gender, name.slice(0, -1) + 'L', lod)));
    var base = name.replace(/[LR]$/, '').split(':')[0];
    if (name === 'torso' || base === 'arm' || base === 'leg' || base === 'hand') {
      var fb = base === 'torso' ? F.torso : F[base];
      var tagSlot = function (x, y, z) {
        var p = fb.nearest(x, y, z);
        if (p && p.tag === 'nail') return C.nail;
        return C.skin;
      };
      out = build(F, base, fb, boxOfParts(D, base), BASE_H[base] * L, tagSlot, skinMat, {
        tone: function (x, y, z) {   // joelhos, cotovelos e dedos um pouco mais rosados
          var k = 1;
          if (base === 'leg') k -= 0.05 * sm(0.04, 0, Math.abs(y - D.kneeY)) * sm(0, -0.03, z);
          if (base === 'arm') k -= 0.04 * sm(0.04, 0, Math.abs(y - D.elY)) * sm(0, 0.03, z);
          return k;
        }
      });
    } else if (name === 'head') {
      var fh = F.head, Y = D.headY;
      var eyes = S.union([{ f: SP(-0.032, Y + 0.0105, -0.08, 0.0125) }, { f: SP(0.032, Y + 0.0105, -0.08, 0.0125) }]);
      out = build(F, 'head', fh, boxOfParts(D, 'head'), BASE_H.head * L, function (x, y, z) {
        var p = fh.nearest(x, y, z), tag = p ? p.tag : 'skin';
        if (tag === 'lips') return C.lips;
        if (tag === 'lid' && y < Y + (D.f ? 0.0158 : 0.0148) && z < -0.085) return C.lash;
        if (tag === 'cheek' && z < -0.06) return C.cheek;
        // sobrancelhas: faixa em arco acima dos olhos
        var ax = Math.abs(x);
        if (z < -0.07 && ax > 0.012 && ax < 0.056 && Math.abs(y - (Y + 0.034 - (ax - 0.032) * (ax - 0.032) * 6)) < (D.f ? 0.0034 : 0.0048)) return C.brow;
        return C.skin;
      }, skinMat, { aoStep: 0.008 });
      if (lod < 2) {
        var em = build(F, 'head', eyes, [-0.05, Y - 0.006, -0.096, 0.05, Y + 0.027, -0.064], BASE_H.eye * L, function (x, y, z) {
          var cx = x < 0 ? -0.032 : 0.032, dx = x - cx, dy = y - (Y + 0.0105), dz = z + 0.08, l = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
          var fwd = -dz / l;
          return fwd > 0.955 ? C.pupil : fwd > 0.8 ? C.iris : C.eyeWhite;
        }, function () { return MAT.eye; }, { occ: fh });
        out = concat([out, em]);
      }
    } else if (base === 'shoe') {
      out = build(F, 'shoe', shoeField(D), boxOfParts(D, 'shoe'), BASE_H.shoe * L, shoeSlot(D), function () { return MAT.shoe; });
    } else if (base === 'hair') {
      var style = name.split(':')[1];
      out = build(F, 'hair', hairField(D, style), boxOfParts(D, 'hair'), BASE_H.hair * L, function () { return C.hair; }, function () { return MAT.hair; }, {
        tone: function (x, y, z) { return 0.86 + 0.14 * (0.5 + 0.5 * S.noise(Math.atan2(x, z) * 9, y * 14, 0.5)) - 0.1 * sm(D.headY + 0.02, D.headY - 0.06, y); }
      });
    } else if (name === 'pony') {
      out = build(F, 'pony', ponyField(D), boxOfParts(D, 'pony'), BASE_H.pony * L, function () { return C.hair; }, function () { return MAT.hair; }, {
        tone: function (x, y, z) { return 0.82 + 0.18 * (0.5 + 0.5 * S.noise(Math.atan2(x, z - 0.13) * 6, y * 30, 0.5)); }
      });
    } else if (name.indexOf('g:') === 0) {
      // roupa: g:<tipo>:<parte do corpo>:<lado>
      var bits = name.split(':'), kind = bits[1], on = bits[2], G = garment(kind, D);
      var gp = G.parts.filter(function (p) { return p.on === on; })[0];
      var bf = on === 'torso' ? (gp.drape ? F.torsoDrape : F.torso) : F[on];
      var gfield = function (x, y, z) { return S.smax(bf(x, y, z) - gp.t(x, y, z), gp.region(x, y, z), 0.011); };
      var gbox = boxOfParts(D, on);
      gbox = [gbox[0] - 0.03, gbox[1], gbox[2] - 0.03, gbox[3] + 0.03, gbox[4], gbox[5] + 0.03];
      out = build(F, on, gfield, gbox, BASE_H[on] * L, gp.slot, function () { return gp.sockSlot ? MAT.cotton : G.mat; });
    }
    return (cache[key] = out);
  }

  // região coberta por uma roupa (para tirar a pele de baixo): função, não vem do Worker
  function coverOf(gender, name) {
    var bits = name.split(':'), G = garment(bits[1], bodyFields(gender).D);
    var gp = G.parts.filter(function (p) { return p.on === bits[2]; })[0];
    return gp.region;
  }

  // nomes das peças de uma combinação (só os lados esquerdos: o direito é espelho)
  function needed(gender, outfit, lod) {
    var o = normOutfit(gender, outfit), list = ['torso', 'armL', 'handL', 'legL', 'head', 'shoeL', 'hair:' + (o.hair || 'curto')];
    if (o.hair === 'rabo') list.push('pony');
    garmentsOf(o).forEach(function (g) { if (g.slice(-1) !== 'R') list.push(g); });
    return list.filter(function (n) { return !cache[gender + '|' + n + '|' + lod]; });
  }

  function concat(list) {
    var n = 0, ni = 0;
    list.forEach(function (p) { n += p.n; ni += p.index.length; });
    var o = { pos: new Float32Array(n * 3), nor: new Float32Array(n * 3), index: new Uint32Array(ni), n: n, slot: new Uint8Array(n), ao: new Float32Array(n),
      tone: new Float32Array(n), mat: new Uint8Array(n), si: new Uint16Array(n * 4), sw: new Float32Array(n * 4) };
    var vo = 0, io = 0;
    list.forEach(function (p) {
      o.pos.set(p.pos, vo * 3); o.nor.set(p.nor, vo * 3); o.slot.set(p.slot, vo); o.ao.set(p.ao, vo); o.tone.set(p.tone, vo); o.mat.set(p.mat, vo);
      o.si.set(p.si, vo * 4); o.sw.set(p.sw, vo * 4);
      for (var i = 0; i < p.index.length; i++) o.index[io + i] = p.index[i] + vo;
      vo += p.n; io += p.index.length;
    });
    return o;
  }

  // tira os triângulos de uma peça que ficam inteiros embaixo da roupa
  function cull(p, covers) {
    if (!covers.length) return p;
    var hidden = new Uint8Array(p.n);
    for (var i = 0; i < p.n; i++) {
      var x = p.pos[i * 3], y = p.pos[i * 3 + 1], z = p.pos[i * 3 + 2];
      for (var c = 0; c < covers.length; c++) if (covers[c](x, y, z) < -0.012) { hidden[i] = 1; break; }
    }
    var keep = [];
    for (i = 0; i < p.index.length; i += 3) {
      var a = p.index[i], b = p.index[i + 1], d = p.index[i + 2];
      if (!(hidden[a] && hidden[b] && hidden[d])) keep.push(a, b, d);
    }
    var o = Object.assign({}, p);
    o.index = new Uint32Array(keep);
    return o;
  }

  // corredor completo: outfit = { top, bottom, hair }
  var TOP_PARTS = { camiseta: ['torso', 'arm'], 'manga-longa': ['torso', 'arm'], 'corta-vento': ['torso', 'arm'], regata: ['torso'], top: ['torso'] };
  var BOTTOM_PARTS = { short: ['torso', 'leg'], bermuda: ['torso', 'leg'], legging: ['torso', 'leg'], 'saia-short': ['torso', 'leg'] };
  function normOutfit(gender, outfit) {
    var top = TOP_PARTS[outfit.top] ? outfit.top : (gender === 'f' ? 'top' : 'camiseta');
    var bottom = BOTTOM_PARTS[outfit.bottom] ? outfit.bottom : (gender === 'f' ? 'legging' : 'short');
    if (gender === 'm' && top === 'top') top = 'regata';
    return { top: top, bottom: bottom, hair: outfit.hair || 'curto' };
  }
  function garmentsOf(o) {
    var garments = [];
    TOP_PARTS[o.top].forEach(function (on) {
      if (on === 'torso') garments.push('g:' + o.top + ':torso:'); else { garments.push('g:' + o.top + ':' + on + ':L'); garments.push('g:' + o.top + ':' + on + ':R'); }
    });
    BOTTOM_PARTS[o.bottom].forEach(function (on) {
      if (on === 'torso') garments.push('g:' + o.bottom + ':torso:'); else { garments.push('g:' + o.bottom + ':' + on + ':L'); garments.push('g:' + o.bottom + ':' + on + ':R'); }
    });
    if (o.bottom !== 'legging') { garments.push('g:meia:leg:L'); garments.push('g:meia:leg:R'); }
    return garments;
  }
  function assemble(gender, outfit, lod) {
    var o = normOutfit(gender, outfit), top = o.top, bottom = o.bottom;
    outfit = o;
    var key = 'A|' + gender + '|' + top + '|' + bottom + '|' + outfit.hair + '|' + lod;
    if (cache[key]) return cache[key];
    var garments = garmentsOf(o);
    var gp = garments.map(function (g) { return piece(gender, g, lod); });
    // o que cada roupa cobre (para tirar a pele de baixo), por parte do corpo
    var covers = function (on, sideName) {
      return garments.filter(function (g) { var b = g.split(':'); return b[2] === on && (!sideName || !b[3] || b[3] === sideName); })
        .map(function (g) { return coverOf(gender, g); });
    };
    var mirrorCover = function (fns) { return fns.map(function (fn) { return function (x, y, z) { return fn(-x, y, z); }; }); };
    var body = [
      cull(piece(gender, 'torso', lod), covers('torso')),
      cull(piece(gender, 'armL', lod), covers('arm', 'L')), cull(piece(gender, 'armR', lod), mirrorCover(covers('arm', 'L'))),
      piece(gender, 'handL', lod), piece(gender, 'handR', lod),
      cull(piece(gender, 'legL', lod), covers('leg', 'L')), cull(piece(gender, 'legR', lod), mirrorCover(covers('leg', 'L'))),
      piece(gender, 'head', lod), piece(gender, 'shoeL', lod), piece(gender, 'shoeR', lod),
      piece(gender, 'hair:' + (outfit.hair || 'curto'), lod)
    ];
    if (outfit.hair === 'rabo') body.push(piece(gender, 'pony', lod));
    var all = concat(body.concat(gp));
    var g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(all.pos, 3));
    g.setAttribute('normal', new THREE.BufferAttribute(all.nor, 3));
    g.setAttribute('skinIndex', new THREE.BufferAttribute(new Float32Array(all.si), 4));
    g.setAttribute('skinWeight', new THREE.BufferAttribute(all.sw, 4));
    g.setAttribute('mat', new THREE.BufferAttribute(new Float32Array(all.mat), 1));
    g.setIndex(new THREE.BufferAttribute(all.n > 65535 ? all.index : new Uint16Array(all.index), 1));
    all.geometry = g;
    all.key = key;
    return (cache[key] = all);
  }

  // trabalho pesado em pedaços (sem travar a tela): gera as peças de uma lista de roupas
  function warm(list, done) {
    var left = list.length;
    if (!left && done) done();
    list.forEach(function (j) {
      prepare(j.gender, j.outfit, j.lod, function () {
        setTimeout(function () { assemble(j.gender, j.outfit, j.lod); if (--left === 0 && done) done(); }, 0);
      });
    });
  }

  // ---------------------------------------------------------------- Worker de escultura
  // Esculpir é pesado (centenas de ms por peça no celular): um Worker faz isso em
  // paralelo, com o mesmo código destes arquivos, e devolve as malhas prontas.
  var worker = null, workerFailed = false, pending = {}, waiting = [];
  function workerSource() {
    var util = '{clamp:function(v,a,b){return v<a?a:v>b?b:v},lerp:function(a,b,t){return a+(b-a)*t},smooth:function(t){t=t<0?0:t>1?1:t;return t*t*(3-2*t)}}';
    return 'self.window=self;var EP=self.EP={data:{appearance:' + JSON.stringify(EP.data.appearance) + '}};EP.util=' + util + ';\n' +
      '(' + EP.Sculpt.module.toString() + ')(EP);\n(' + bodyModelModule.toString() + ')(EP);\n' +
      'onmessage=function(e){var j=e.data,p=EP.BodyModel.piece(j.gender,j.name,j.lod),o={key:j.key,n:p.n,pos:p.pos,nor:p.nor,index:p.index,slot:p.slot,ao:p.ao,tone:p.tone,mat:p.mat,si:p.si,sw:p.sw,base:p.base};' +
      'postMessage(o,[o.pos.buffer,o.nor.buffer,o.index.buffer,o.slot.buffer,o.ao.buffer,o.tone.buffer,o.mat.buffer,o.si.buffer,o.sw.buffer]);};';
  }
  function getWorker() {
    if (worker || workerFailed) return worker;
    try {
      var url = URL.createObjectURL(new Blob([workerSource()], { type: 'text/javascript' }));
      worker = new Worker(url);
      worker.onmessage = function (e) {
        var d = e.data;
        cache[d.key] = d;
        delete pending[d.key];
        flush();
      };
      worker.onerror = function () { workerFailed = true; worker = null; pending = {}; flush(); };
    } catch (err) { workerFailed = true; worker = null; }
    return worker;
  }
  function flush() {
    waiting = waiting.filter(function (w) {
      if (needed(w.gender, w.outfit, w.lod).length) {
        if (!getWorker()) { // sem Worker: esculpe aqui mesmo, uma peça por vez
          var n = needed(w.gender, w.outfit, w.lod)[0];
          piece(w.gender, n, w.lod);
          setTimeout(flush, 0);
        }
        return true;
      }
      w.cb();
      return false;
    });
  }
  // prepara (em segundo plano) as peças de uma combinação e avisa quando pronta
  function prepare(gender, outfit, lod, cb) {
    var miss = needed(gender, outfit, lod);
    waiting.push({ gender: gender, outfit: outfit, lod: lod, cb: cb || function () {} });
    var w = getWorker();
    if (w) miss.forEach(function (n) {
      var key = gender + '|' + n + '|' + lod;
      if (pending[key]) return;
      pending[key] = 1;
      w.postMessage({ key: key, gender: gender, name: n, lod: lod });
    });
    setTimeout(flush, 0);
  }

  EP.BodyModel = { C: C, NSLOT: NSLOT, MAT: MAT, BONES: BONES, bonePos: bonePos, dims: dims, assemble: assemble, piece: piece, warm: warm,
    has: function (gender, outfit, lod) {
      var o = normOutfit(gender, outfit);
      return !!cache['A|' + gender + '|' + o.top + '|' + o.bottom + '|' + o.hair + '|' + lod];
    },
    ready: function (gender, outfit, lod) { return needed(gender, outfit, lod).length === 0; },
    prepare: prepare,
    HIP_H: HIP_H, HC: HC };
})(window.EP);
