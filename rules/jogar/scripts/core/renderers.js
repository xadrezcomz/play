// Renderers: o desenho de cada tipo de objeto (SVG vetorial leve).
// Uma fase só escolhe o tipo ("ball", "door"...) e as props (cor, padrão).
// Para criar um visual novo: RULES.Renderers.register('nome', { view, svg }).
(function () {
  'use strict';
  var R = window.RULES;

  var C = R.COLORS = {
    coral: '#FF6B6B', yellow: '#FFC94A', teal: '#2EC4B6', blue: '#4D96FF',
    purple: '#9B7BFF', green: '#6BCB77', orange: '#FF9F45', pink: '#FF8FB1',
    ink: '#2B2D42', soft: '#E9E4DA', wood: '#C98B5B', woodDark: '#9C6A43', sky: '#BDE3FF'
  };
  function col(p, def) { return (p && C[p.color]) || (p && p.color) || def; }
  function shade(hex, amt) {
    var n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    var f = function (v) { return Math.max(0, Math.min(255, Math.round(v + amt))); };
    return '#' + ((1 << 24) + (f(r) << 16) + (f(g) << 8) + f(b)).toString(16).slice(1);
  }

  var T = {};

  T.circle = { view: '0 0 100 100', svg: function (p, o) {
    var c = (o.state.color && (C[o.state.color] || o.state.color)) || col(p, C.coral);
    return '<circle cx="50" cy="50" r="48" fill="' + c + '"/>' +
      '<path d="M50 98 A48 48 0 0 1 2 50 A48 48 0 0 0 98 50 A48 48 0 0 1 50 98Z" fill="' + shade(c, -28) + '" opacity=".45"/>' +
      '<ellipse cx="34" cy="30" rx="13" ry="8" fill="#fff" opacity=".4" transform="rotate(-30 34 30)"/>';
  } };

  T.ball = { view: '0 0 100 100', svg: function (p) {
    var c = col(p, C.blue);
    if (p && p.pattern === 'beach') {
      return '<circle cx="50" cy="50" r="48" fill="#fff"/>' +
        '<path d="M50 2 C30 20 30 80 50 98 C20 92 2 70 2 50 C2 28 22 6 50 2Z" fill="' + C.coral + '"/>' +
        '<path d="M50 2 C70 20 70 80 50 98 C80 92 98 70 98 50 C98 28 78 6 50 2Z" fill="' + C.blue + '"/>' +
        '<path d="M50 2 C42 30 42 70 50 98 C58 70 58 30 50 2Z" fill="' + C.yellow + '"/>' +
        '<circle cx="50" cy="50" r="48" fill="none" stroke="' + shade(C.blue, -40) + '" stroke-opacity=".25" stroke-width="2"/>' +
        '<ellipse cx="33" cy="28" rx="12" ry="7" fill="#fff" opacity=".5" transform="rotate(-30 33 28)"/>';
    }
    return '<circle cx="50" cy="50" r="48" fill="' + c + '"/>' +
      '<path d="M8 38 Q50 58 92 38" fill="none" stroke="#fff" stroke-width="7" opacity=".85"/>' +
      '<ellipse cx="34" cy="26" rx="12" ry="7" fill="#fff" opacity=".45" transform="rotate(-30 34 26)"/>';
  } };

  T.star = { view: '0 0 100 100', svg: function (p) {
    var c = col(p, C.yellow);
    return '<path d="M50 6 L62 36 L94 38 L69 58 L78 90 L50 72 L22 90 L31 58 L6 38 L38 36Z" fill="' + c + '" stroke="' + c + '" stroke-width="8" stroke-linejoin="round"/>' +
      '<path d="M50 20 L57 38" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".55"/>';
  } };

  T.cube = { view: '0 0 100 100', svg: function (p) {
    var c = col(p, C.green);
    return '<rect x="6" y="18" width="76" height="76" rx="12" fill="' + shade(c, -30) + '"/>' +
      '<rect x="18" y="6" width="76" height="76" rx="12" fill="' + c + '"/>' +
      '<rect x="30" y="18" width="22" height="10" rx="5" fill="#fff" opacity=".5"/>';
  } };

  // Caixa de papelão vista de frente, aberta em cima.
  T.box = { view: '0 0 100 80', svg: function (p) {
    var c = col(p, '#E8A866');
    return '<path d="M8 22 L92 22 L84 8 L16 8Z" fill="' + shade(c, -45) + '"/>' +
      '<path d="M8 22 L-2 6 L20 6 L28 22Z" fill="' + shade(c, -18) + '"/>' +
      '<path d="M92 22 L102 6 L80 6 L72 22Z" fill="' + shade(c, -18) + '"/>' +
      '<rect x="6" y="20" width="88" height="58" rx="6" fill="' + c + '"/>' +
      '<rect x="6" y="20" width="88" height="8" fill="' + shade(c, -22) + '" opacity=".6"/>' +
      '<rect x="40" y="20" width="20" height="58" fill="#fff" opacity=".18"/>';
  } };

  // Alvo quadrado (o "QUADRADO" da fase 5).
  T.slot = { view: '0 0 100 100', svg: function (p) {
    var c = col(p, C.purple);
    return '<rect x="4" y="4" width="92" height="92" rx="12" fill="' + c + '" opacity=".16"/>' +
      '<rect x="4" y="4" width="92" height="92" rx="12" fill="none" stroke="' + c + '" stroke-width="6" stroke-dasharray="14 9" stroke-linecap="round"/>';
  } };

  T.door = { view: '0 0 50 100', svg: function (p) {
    var c = col(p, C.purple);
    return '<rect x="2" y="2" width="46" height="96" rx="6" fill="' + c + '"/>' +
      '<rect x="8" y="9" width="34" height="34" rx="4" fill="' + shade(c, -24) + '" opacity=".55"/>' +
      '<rect x="8" y="51" width="34" height="40" rx="4" fill="' + shade(c, -24) + '" opacity=".55"/>' +
      '<circle cx="39" cy="50" r="4.5" fill="' + C.yellow + '"/><circle cx="38" cy="49" r="1.6" fill="#fff" opacity=".7"/>';
  } };

  // Batente + passagem iluminada que aparece quando a porta sai da frente.
  T.doorway = { view: '0 0 60 110', svg: function () {
    return '<rect x="0" y="0" width="60" height="110" rx="8" fill="' + C.wood + '"/>' +
      '<rect x="6" y="6" width="48" height="104" rx="5" fill="#FFF3C4"/>' +
      '<circle cx="30" cy="40" r="12" fill="#FFD966"/>' +
      '<path d="M6 92 Q20 80 34 90 T54 86 L54 110 L6 110Z" fill="' + C.green + '" opacity=".75"/>';
  } };

  T.key = { view: '0 0 100 50', svg: function (p) {
    var c = col(p, C.yellow);
    return '<circle cx="24" cy="25" r="18" fill="none" stroke="' + c + '" stroke-width="10"/>' +
      '<rect x="38" y="20" width="58" height="10" rx="5" fill="' + c + '"/>' +
      '<rect x="70" y="26" width="9" height="16" rx="3" fill="' + c + '"/><rect x="84" y="26" width="9" height="12" rx="3" fill="' + c + '"/>' +
      '<path d="M14 15 Q20 9 28 10" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".6"/>';
  } };

  T.platform = { view: '0 0 100 100', stretch: true, svg: function (p) {
    var c = col(p, '#D9B48F');
    return '<rect x="0" y="0" width="100" height="100" fill="' + c + '"/>' +
      '<rect x="0" y="0" width="100" height="14" fill="' + C.green + '"/>';
  } };

  T.hole = { view: '0 0 100 100', stretch: true, svg: function () {
    return '<defs><linearGradient id="holeg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5A4A6B"/><stop offset="1" stop-color="#2B2340"/></linearGradient></defs>' +
      '<rect x="0" y="0" width="100" height="100" fill="url(#holeg)"/>';
  } };

  T.button = { view: '0 0 100 100', svg: function (p, o) {
    var c = col(p, C.coral), down = o.state.pressed;
    return '<ellipse cx="50" cy="70" rx="46" ry="22" fill="' + shade(c, -60) + '"/>' +
      '<rect x="12" y="' + (down ? 52 : 38) + '" width="76" height="' + (down ? 18 : 32) + '" rx="10" fill="' + shade(c, -30) + '"/>' +
      '<ellipse cx="50" cy="' + (down ? 52 : 38) + '" rx="38" ry="16" fill="' + c + '"/>';
  } };

  T.bulb = { view: '0 0 70 100', svg: function (p, o) {
    var on = o.state.on;
    return (on ? '<circle cx="35" cy="36" r="34" fill="#FFE27A" opacity=".45"/>' : '') +
      '<circle cx="35" cy="36" r="26" fill="' + (on ? '#FFD84A' : '#E5E1D8') + '"/>' +
      '<rect x="22" y="58" width="26" height="12" fill="' + (on ? '#FFD84A' : '#E5E1D8') + '"/>' +
      '<rect x="20" y="70" width="30" height="18" rx="4" fill="#9AA0B4"/><rect x="26" y="88" width="18" height="8" rx="3" fill="#6E7491"/>';
  } };

  T['switch'] = { view: '0 0 60 100', svg: function (p, o) {
    var on = o.state.on;
    return '<rect x="2" y="2" width="56" height="96" rx="12" fill="#F2EEE6" stroke="#D6D0C4" stroke-width="3"/>' +
      '<rect x="18" y="18" width="24" height="64" rx="12" fill="#D6D0C4"/>' +
      '<rect x="16" y="' + (on ? 18 : 50) + '" width="28" height="32" rx="10" fill="' + (on ? C.green : '#A9A39A') + '"/>';
  } };

  T.sun = { view: '0 0 100 100', svg: function () {
    var rays = '';
    for (var i = 0; i < 8; i++) rays += '<rect x="46" y="2" width="8" height="16" rx="4" fill="#FFB938" transform="rotate(' + (i * 45) + ' 50 50)"/>';
    return rays + '<circle cx="50" cy="50" r="28" fill="#FFC94A"/>';
  } };

  // Nuvem: state.charge (0–1) escurece; state.raining desenha a chuva.
  T.cloud = { view: '0 0 100 60', svg: function (p, o) {
    var k = o.state.charge || 0, v = Math.round(255 - k * 110);
    var fill = 'rgb(' + v + ',' + Math.round(v + k * 8) + ',' + Math.round(v + k * 30) + ')';
    var rain = '';
    if (o.state.raining) {
      for (var i = 0; i < 6; i++) rain += '<path class="drop" style="animation-delay:' + (i * 0.12) + 's" d="M' + (20 + i * 12) + ' 62 l-3 12" stroke="' + C.blue + '" stroke-width="4" stroke-linecap="round"/>';
    }
    return rain + '<path d="M22 56 Q2 56 4 40 Q6 26 22 28 Q26 8 48 10 Q66 4 74 22 Q96 20 96 40 Q96 56 78 56Z" fill="' + fill + '" stroke="#D5DEEA" stroke-width="3"/>';
  } };

  // Copo: state.fill de 0 a 1.
  T.cup = { view: '0 0 80 100', svg: function (p, o) {
    var f = o.state.fill || 0, top = 92 - f * 78;
    var water = f > 0 ? '<path d="M' + (10 + (92 - top) * 0.08) + ' ' + top + ' L' + (70 - (92 - top) * 0.08) + ' ' + top + ' L64 92 Q40 96 16 92Z" fill="' + C.blue + '" opacity=".75"/>' : '';
    return water + '<path d="M6 8 L16 92 Q40 98 64 92 L74 8" fill="none" stroke="#9FB4C9" stroke-width="5" stroke-linejoin="round" stroke-linecap="round"/>' +
      '<path d="M14 18 L20 80" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".7"/>';
  } };

  // Jarra com bico à esquerda; state.pouring desenha o fio de água.
  T.jug = { view: '0 0 100 100', svg: function (p, o) {
    var stream = o.state.pouring ? '<path class="stream" d="M10 30 Q2 60 8 140" fill="none" stroke="' + C.blue + '" stroke-width="7" stroke-linecap="round" opacity=".8"/>' : '';
    return stream + '<path d="M84 34 Q100 40 96 60 Q92 74 78 74" fill="none" stroke="' + C.purple + '" stroke-width="7"/>' +
      '<path d="M8 26 L26 22 L78 20 L82 90 Q50 98 22 90 L26 40Z" fill="' + C.purple + '"/>' +
      '<path d="M28 44 L76 44 L79 86 Q50 93 25 86Z" fill="' + C.blue + '" opacity=".55"/>' +
      '<path d="M34 30 L36 78" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".45"/>';
  } };

  T.stick = { view: '0 0 10 10', stretch: true, svg: function (p) {
    return '<rect x="0" y="0" width="10" height="10" rx="5" ry="5" fill="' + col(p, C.ink) + '"/>';
  } };

  T.fish = { view: '0 0 100 60', svg: function (p) {
    var c = col(p, C.orange);
    return '<path d="M74 30 L98 10 L96 50Z" fill="' + shade(c, -25) + '"/>' +
      '<ellipse cx="44" cy="30" rx="38" ry="24" fill="' + c + '"/>' +
      '<path d="M38 8 Q50 0 60 9" fill="' + shade(c, -25) + '"/>' +
      '<circle cx="22" cy="24" r="7" fill="#fff"/><circle cx="20" cy="24" r="3.6" fill="' + C.ink + '"/>' +
      '<path d="M10 36 Q16 40 22 36" fill="none" stroke="' + C.ink + '" stroke-width="2.6" stroke-linecap="round"/>' +
      '<path d="M44 18 Q52 30 44 42 M56 18 Q64 30 56 42" fill="none" stroke="#fff" stroke-width="3" opacity=".5"/>';
  } };

  // Caixa fechada, sem tampa à vista; state.open abre as abas e mostra o brilho.
  T.chest = { view: '0 0 100 90', svg: function (p, o) {
    var c = col(p, '#E8A866');
    if (o.state.open) {
      return '<circle cx="50" cy="26" r="26" fill="#FFE27A" opacity=".55"/>' +
        '<path d="M8 32 L-4 10 L30 12 L36 32Z" fill="' + shade(c, -15) + '"/><path d="M92 32 L104 10 L70 12 L64 32Z" fill="' + shade(c, -15) + '"/>' +
        '<rect x="6" y="30" width="88" height="58" rx="6" fill="' + c + '"/><rect x="6" y="30" width="88" height="8" fill="' + shade(c, -40) + '"/>';
    }
    return '<rect x="6" y="20" width="88" height="68" rx="7" fill="' + c + '"/>' +
      '<rect x="6" y="20" width="88" height="12" rx="6" fill="' + shade(c, -15) + '"/>' +
      '<rect x="44" y="20" width="12" height="68" fill="#fff" opacity=".2"/>';
  } };

  T.wall = { view: '0 0 100 100', stretch: true, svg: function (p) {
    var c = col(p, '#E9A07E'), rows = '';
    for (var y = 0; y < 100; y += 12.5) {
      var off = (y / 12.5) % 2 ? 12.5 : 0;
      for (var x = -off; x < 100; x += 25) rows += '<rect x="' + (x + 1) + '" y="' + (y + 1) + '" width="23" height="10.5" rx="1.5" fill="' + shade(c, ((x + y) % 3) * 6 - 6) + '"/>';
    }
    return '<rect width="100" height="100" fill="' + shade(c, -40) + '"/>' + rows;
  } };

  T.gem = { view: '0 0 100 90', svg: function (p) {
    var c = col(p, C.teal);
    return '<path d="M20 4 L80 4 L98 30 L50 88 L2 30Z" fill="' + c + '"/>' +
      '<path d="M2 30 L98 30 M20 4 L36 30 L50 88 L64 30 L80 4" fill="none" stroke="#fff" stroke-width="3" opacity=".5" stroke-linejoin="round"/>';
  } };

  T.feather = { view: '0 0 50 100', svg: function (p) {
    var c = col(p, C.pink);
    return '<path d="M25 96 Q22 50 40 6 Q50 40 30 80 Z" fill="' + c + '"/><path d="M25 96 Q14 56 6 26 Q30 50 30 80Z" fill="' + shade(c, -20) + '"/>' +
      '<path d="M25 98 Q26 50 40 8" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/>';
  } };

  T.tree = { view: '0 0 60 100', svg: function () {
    return '<rect x="25" y="55" width="10" height="45" rx="3" fill="' + C.woodDark + '"/>' +
      '<circle cx="30" cy="34" r="26" fill="' + C.green + '"/><circle cx="20" cy="26" r="7" fill="#fff" opacity=".25"/>';
  } };

  T.apple = { view: '0 0 100 100', svg: function (p) {
    var c = col(p, C.coral);
    return '<path d="M50 24 Q78 6 92 40 Q100 80 66 94 Q50 88 34 94 Q0 80 8 40 Q22 6 50 24Z" fill="' + c + '"/>' +
      '<path d="M50 24 Q50 10 58 2" fill="none" stroke="' + C.woodDark + '" stroke-width="5" stroke-linecap="round"/>' +
      '<ellipse cx="68" cy="10" rx="12" ry="6" fill="' + C.green + '" transform="rotate(-25 68 10)"/>';
  } };

  T.ruli = { view: '0 0 100 112', svg: function (p, o) { return null; } };

  function sc(p, o, d) { return (o && o.state.color && (C[o.state.color] || o.state.color)) || col(p, d); }

  T.triangle = { view: '0 0 100 90', svg: function (p) {
    var c = col(p, C.yellow);
    return '<path d="M50 6 L96 84 L4 84Z" fill="' + c + '" stroke="' + c + '" stroke-width="8" stroke-linejoin="round"/>';
  } };
  // metade de triângulo (props.side: 'left' | 'right')
  T.halftri = { view: '0 0 50 90', svg: function (p) {
    var c = col(p, C.yellow), d = p.side === 'right' ? 'M4 6 L46 84 L4 84Z' : 'M46 6 L46 84 L4 84Z';
    return '<path d="' + d + '" fill="' + c + '" stroke="' + c + '" stroke-width="6" stroke-linejoin="round"/>';
  } };
  T.plank = { view: '0 0 100 20', stretch: true, svg: function (p) {
    return '<rect x="0" y="0" width="100" height="20" rx="4" fill="' + col(p, C.wood) + '"/><rect x="0" y="0" width="100" height="6" fill="#fff" opacity=".18"/>';
  } };
  T.plant = { view: '0 0 60 100', svg: function (p, o) {
    var g = o.state.grown, w = o.state.watered;
    return '<path d="M8 70 L52 70 L46 98 L14 98Z" fill="' + C.coral + '"/>' +
      '<rect x="4" y="64" width="52" height="10" rx="4" fill="' + shade(C.coral, -25) + '"/>' +
      (w ? '<ellipse cx="30" cy="66" rx="20" ry="3" fill="' + C.blue + '" opacity=".6"/>' : '') +
      (g ? '<path d="M30 66 L30 14" stroke="' + C.green + '" stroke-width="5"/><ellipse cx="18" cy="34" rx="13" ry="7" fill="' + C.green + '" transform="rotate(-25 18 34)"/><ellipse cx="42" cy="24" rx="13" ry="7" fill="' + C.green + '" transform="rotate(25 42 24)"/><circle cx="30" cy="12" r="9" fill="' + C.pink + '"/><circle cx="30" cy="12" r="4" fill="' + C.yellow + '"/>'
        : '<path d="M30 66 L30 50" stroke="' + C.green + '" stroke-width="4"/><ellipse cx="24" cy="50" rx="7" ry="4" fill="' + C.green + '" transform="rotate(-25 24 50)"/>');
  } };
  T.can = { view: '0 0 100 70', svg: function () {
    return '<path d="M30 20 L80 20 L76 66 L34 66Z" fill="' + C.teal + '"/><path d="M30 30 L4 10" stroke="' + C.teal + '" stroke-width="8" stroke-linecap="round"/>' +
      '<path d="M80 26 Q98 36 80 52" fill="none" stroke="' + C.teal + '" stroke-width="6"/><circle cx="4" cy="10" r="5" fill="' + shade(C.teal, -30) + '"/>';
  } };
  T.moon = { view: '0 0 100 100', svg: function () {
    return '<path d="M62 6 A46 46 0 1 0 94 70 A38 38 0 1 1 62 6Z" fill="#FFE9A8"/><circle cx="40" cy="60" r="6" fill="#F2D27A"/>';
  } };
  T.sky = { view: '0 0 100 100', stretch: true, svg: function (p, o) {
    var night = o.state.night || p.night;
    return '<rect width="100" height="100" rx="4" fill="' + (night ? '#2B2D5C' : '#BDE3FF') + '"/>' +
      (night ? '<circle cx="20" cy="30" r="1.6" fill="#fff"/><circle cx="70" cy="18" r="1.2" fill="#fff"/><circle cx="84" cy="56" r="1.4" fill="#fff"/><circle cx="40" cy="70" r="1" fill="#fff"/>' : '');
  } };
  T.clock = { view: '0 0 100 100', svg: function () {
    var t = '';
    for (var i = 0; i < 12; i++) t += '<rect x="48.5" y="8" width="3" height="' + (i % 3 ? 5 : 9) + '" rx="1.5" fill="' + C.ink + '" transform="rotate(' + i * 30 + ' 50 50)"/>';
    return '<circle cx="50" cy="50" r="47" fill="#fff" stroke="' + C.ink + '" stroke-width="5"/>' + t;
  } };
  // ponteiro: desenhado do centro para cima, para girar em volta do centro
  T.hand = { view: '0 0 100 100', svg: function (p) {
    var len = p.len || 36, wd = p.width || 5;
    return '<rect x="' + (50 - wd / 2) + '" y="' + (50 - len) + '" width="' + wd + '" height="' + (len + 6) + '" rx="' + wd / 2 + '" fill="' + col(p, C.ink) + '"/><circle cx="50" cy="50" r="5" fill="' + C.coral + '"/>';
  } };
  T.flag = { view: '0 0 60 100', svg: function () {
    return '<rect x="8" y="4" width="5" height="94" rx="2" fill="' + C.ink + '"/><path d="M13 6 L56 18 L13 32Z" fill="' + C.coral + '"/>';
  } };
  T.bucket = { view: '0 0 80 90', svg: function (p) {
    var c = col(p, C.blue);
    return '<path d="M10 30 L70 30 L62 86 L18 86Z" fill="#E5E1D8"/><ellipse cx="40" cy="30" rx="30" ry="9" fill="' + c + '"/>' +
      '<path d="M10 30 Q40 -6 70 30" fill="none" stroke="#9AA0B4" stroke-width="4"/><path d="M26 34 Q30 52 24 60" stroke="' + c + '" stroke-width="7" stroke-linecap="round" fill="none"/>';
  } };
  T.divider = { view: '0 0 10 100', stretch: true, svg: function () {
    return '<rect x="3" y="0" width="4" height="100" rx="2" fill="' + C.ink + '"/><rect x="0" y="44" width="10" height="12" rx="3" fill="' + C.coral + '"/>';
  } };
  T.shelf = { view: '0 0 100 20', stretch: true, svg: function () {
    return '<rect x="0" y="0" width="100" height="8" rx="2" fill="' + C.wood + '"/><rect x="6" y="8" width="5" height="12" fill="' + C.woodDark + '"/><rect x="89" y="8" width="5" height="12" fill="' + C.woodDark + '"/>';
  } };
  T.cushion = { view: '0 0 100 40', svg: function () {
    return '<rect x="2" y="6" width="96" height="30" rx="14" fill="' + C.purple + '"/><path d="M14 14 Q50 4 86 14" stroke="#fff" stroke-width="4" fill="none" opacity=".4"/>';
  } };
  T.vase = { view: '0 0 60 100', svg: function () {
    return '<path d="M20 4 L40 4 L38 20 Q58 40 50 80 Q46 96 30 96 Q14 96 10 80 Q2 40 22 20Z" fill="' + C.blue + '"/><path d="M14 56 Q30 62 46 56" stroke="#fff" stroke-width="4" fill="none" opacity=".6"/>';
  } };
  T.balloon = { view: '0 0 60 110', svg: function (p) {
    var c = col(p, C.coral);
    return '<path d="M30 76 Q26 92 32 108" fill="none" stroke="' + C.ink + '" stroke-width="2"/><ellipse cx="30" cy="38" rx="26" ry="34" fill="' + c + '"/><path d="M26 72 L34 72 L30 78Z" fill="' + c + '"/><ellipse cx="20" cy="24" rx="6" ry="10" fill="#fff" opacity=".4"/>';
  } };
  T.rock = { view: '0 0 100 70', svg: function () {
    return '<path d="M10 64 Q0 40 18 26 Q30 4 58 10 Q90 14 96 44 Q100 64 80 66Z" fill="#9AA0B4"/><path d="M30 22 Q44 16 56 20" stroke="#fff" stroke-width="4" fill="none" opacity=".35"/>';
  } };
  T.seesaw = { view: '0 0 100 40', svg: function () {
    return '<path d="M40 40 L50 20 L60 40Z" fill="' + C.ink + '"/><rect x="0" y="14" width="100" height="7" rx="3" fill="' + C.wood + '"/>';
  } };
  T.basket = { view: '0 0 100 70', svg: function () {
    return '<path d="M6 10 L94 10 L82 66 L18 66Z" fill="' + C.wood + '"/><path d="M14 28 L86 28 M18 46 L82 46" stroke="' + C.woodDark + '" stroke-width="4"/><rect x="2" y="4" width="96" height="10" rx="5" fill="' + C.woodDark + '"/>';
  } };
  T.magnet = { view: '0 0 80 80', svg: function () {
    return '<path d="M12 8 L12 44 A28 28 0 0 0 68 44 L68 8 L50 8 L50 44 A10 10 0 0 1 30 44 L30 8Z" fill="' + C.coral + '"/><rect x="12" y="8" width="18" height="12" fill="#E5E1D8"/><rect x="50" y="8" width="18" height="12" fill="#E5E1D8"/>';
  } };
  T.clip = { view: '0 0 40 80', svg: function () {
    return '<path d="M10 70 L10 16 A10 10 0 0 1 30 16 L30 60 A6 6 0 0 1 18 60 L18 24" fill="none" stroke="#7D8597" stroke-width="5" stroke-linecap="round"/>';
  } };
  T.glassbox = { view: '0 0 100 100', stretch: true, svg: function () {
    return '<rect x="2" y="2" width="96" height="96" rx="6" fill="#DFF3FF" fill-opacity=".45" stroke="#9FC9E8" stroke-width="4"/><path d="M14 14 L30 14 M14 22 L22 22" stroke="#fff" stroke-width="4" stroke-linecap="round"/>';
  } };
  // tanque de água: state.level de 0 a 1
  T.tank = { view: '0 0 60 100', stretch: true, svg: function (p, o) {
    var lv = o.state.level || 0, top = 98 - lv * 92;
    return '<rect x="4" y="' + top + '" width="52" height="' + (98 - top) + '" fill="' + C.blue + '" opacity=".55"/>' +
      '<path d="M3 2 L3 98 L57 98 L57 2" fill="none" stroke="#9FB4C9" stroke-width="5" stroke-linejoin="round"/>';
  } };
  T.cork = { view: '0 0 60 50', svg: function () {
    return '<path d="M8 20 L52 20 L46 48 L14 48Z" fill="' + C.wood + '"/><ellipse cx="30" cy="20" rx="22" ry="6" fill="#E2B486"/>' +
      '<circle cx="20" cy="8" r="7" fill="none" stroke="' + C.yellow + '" stroke-width="4"/><rect x="25" y="6" width="22" height="4" rx="2" fill="' + C.yellow + '"/>';
  } };
  // escuridão com um buraco de luz (variáveis --lx, --ly, --lr)
  T.dark = { view: '0 0 10 10', stretch: true, svg: function () { return ''; } };
  T.flashlight = { view: '0 0 60 100', svg: function () {
    return '<path d="M10 4 L50 4 L42 34 L18 34Z" fill="' + C.yellow + '"/><rect x="18" y="32" width="24" height="64" rx="6" fill="' + C.ink + '"/><rect x="24" y="48" width="12" height="8" rx="3" fill="' + C.coral + '"/>';
  } };
  T.traffic = { view: '0 0 50 120', svg: function (p, o) {
    var on = o.state.light || 'red', l = function (k, y, c) { return '<circle cx="25" cy="' + y + '" r="13" fill="' + (on === k ? c : '#4A4E69') + '"/>'; };
    return '<rect x="4" y="2" width="42" height="116" rx="10" fill="' + C.ink + '"/>' + l('red', 24, C.coral) + l('yellow', 60, C.yellow) + l('green', 96, C.green);
  } };
  T.campfire = { view: '0 0 100 80', svg: function (p, o) {
    var f = o.state.fire, smoke = (o.state.heat || 0) > 0.3 && !f;
    return (f ? '<path d="M50 6 Q72 30 64 52 Q60 62 50 62 Q40 62 36 52 Q28 30 50 6Z" fill="' + C.orange + '"/><path d="M50 26 Q60 40 56 52 Q50 58 44 52 Q40 40 50 26Z" fill="' + C.yellow + '"/>' : '') +
      (smoke ? '<circle cx="46" cy="40" r="8" fill="#C9CED6" opacity=".7"/><circle cx="56" cy="28" r="6" fill="#C9CED6" opacity=".5"/>' : '') +
      '<rect x="14" y="58" width="72" height="12" rx="6" fill="' + C.woodDark + '" transform="rotate(10 50 64)"/><rect x="14" y="58" width="72" height="12" rx="6" fill="' + C.wood + '" transform="rotate(-10 50 64)"/>';
  } };
  T.twig = { view: '0 0 100 20', svg: function () {
    return '<rect x="2" y="5" width="96" height="10" rx="5" fill="' + C.wood + '"/><rect x="60" y="0" width="16" height="6" rx="3" fill="' + C.wood + '" transform="rotate(-25 68 3)"/>';
  } };
  T.icecream = { view: '0 0 60 100', svg: function (p, o) {
    var m = o.state.melt || 0;
    return '<path d="M12 46 L30 98 L48 46Z" fill="#E8B07A"/><path d="M16 52 L44 52 M20 64 L40 64" stroke="#C98B5B" stroke-width="2"/>' +
      '<ellipse cx="30" cy="' + (36 + m * 14) + '" rx="' + (22 + m * 8) + '" ry="' + (22 - m * 12) + '" fill="' + C.pink + '"/>' +
      (m > 0.2 ? '<path d="M14 46 Q16 ' + (54 + m * 20) + ' 18 46 M40 46 Q42 ' + (52 + m * 24) + ' 44 46" stroke="' + C.pink + '" stroke-width="4" fill="none"/>' : '');
  } };
  T.umbrella = { view: '0 0 100 100', svg: function () {
    return '<path d="M4 44 Q50 -10 96 44 Q84 36 72 44 Q60 36 50 44 Q40 36 28 44 Q16 36 4 44Z" fill="' + C.purple + '"/><path d="M50 40 L50 90 Q50 98 42 96" fill="none" stroke="' + C.ink + '" stroke-width="5" stroke-linecap="round"/>';
  } };
  T.pipe = { view: '0 0 100 100', svg: function (p, o) {
    var w = '#7D8597', wat = o.state.wet ? C.blue : '#B8BFCC';
    if (p.shape === 'corner') return '<path d="M50 0 L50 50 L100 50" fill="none" stroke="' + w + '" stroke-width="34"/><path d="M50 0 L50 50 L100 50" fill="none" stroke="' + wat + '" stroke-width="18"/><rect x="2" y="2" width="96" height="96" rx="10" fill="none" stroke="#E5E1D8" stroke-width="3"/>';
    return '<path d="M50 0 L50 100" stroke="' + w + '" stroke-width="34"/><path d="M50 0 L50 100" stroke="' + wat + '" stroke-width="18"/><rect x="2" y="2" width="96" height="96" rx="10" fill="none" stroke="#E5E1D8" stroke-width="3"/>';
  } };
  T.faucet = { view: '0 0 100 60', svg: function () {
    return '<rect x="0" y="14" width="70" height="22" rx="6" fill="#9AA0B4"/><rect x="56" y="14" width="22" height="44" rx="6" fill="#9AA0B4"/><rect x="20" y="0" width="12" height="16" rx="3" fill="' + C.coral + '"/>';
  } };
  // disco do cofre: números em volta; o número no topo é o escolhido
  T.dial = { view: '0 0 100 100', svg: function () {
    var t = '';
    for (var i = 0; i < 10; i++) {
      var a = (i * 36 - 90) * Math.PI / 180;
      t += '<text x="' + (50 + Math.cos(a) * 34).toFixed(1) + '" y="' + (50 + Math.sin(a) * 34 + 5).toFixed(1) + '" text-anchor="middle" font-size="14" font-weight="900" fill="' + C.ink + '" font-family="sans-serif">' + i + '</text>';
    }
    return '<circle cx="50" cy="50" r="47" fill="#E5E1D8" stroke="#9AA0B4" stroke-width="4"/>' + t + '<circle cx="50" cy="50" r="14" fill="#9AA0B4"/><rect x="47" y="38" width="6" height="12" rx="3" fill="' + C.ink + '"/>';
  } };
  T.safe = { view: '0 0 100 100', svg: function (p, o) {
    return '<rect x="2" y="2" width="96" height="96" rx="10" fill="#7D8597"/><rect x="10" y="10" width="80" height="80" rx="6" fill="' + (o.state.open ? '#3D405B' : '#9AA0B4') + '"/>' +
      (o.state.open ? '<path d="M50 30 L57 46 L74 47 L61 58 L65 74 L50 65 L35 74 L39 58 L26 47 L43 46Z" fill="' + C.yellow + '"/>' : '<rect x="44" y="4" width="12" height="8" rx="2" fill="' + C.coral + '"/>');
  } };
  T.radio = { view: '0 0 100 70', svg: function (p, o) {
    return '<rect x="4" y="14" width="92" height="54" rx="8" fill="' + C.orange + '"/><circle cx="32" cy="41" r="16" fill="' + C.ink + '"/><rect x="58" y="28" width="28" height="8" rx="3" fill="#fff" opacity=".6"/><path d="M20 14 L40 2" stroke="' + C.ink + '" stroke-width="4" stroke-linecap="round"/>' +
      (o.state.quiet ? '' : '<path class="notes" d="M70 0 l0 -8 l8 -2 l0 8" stroke="' + C.ink + '" stroke-width="3" fill="none"/>');
  } };
  T.drop = { view: '0 0 60 80', svg: function (p, o) {
    var c = sc(p, o, C.blue);
    return '<path d="M30 4 Q56 40 52 54 Q48 76 30 76 Q12 76 8 54 Q4 40 30 4Z" fill="' + c + '"/><ellipse cx="22" cy="48" rx="5" ry="9" fill="#fff" opacity=".45"/>';
  } };
  T.leaf = { view: '0 0 100 70', svg: function (p, o) {
    var c = sc(p, o, '#D6D0C4');
    return '<path d="M6 60 Q10 6 94 8 Q88 64 6 60Z" fill="' + c + '"/><path d="M10 58 Q50 36 88 12" stroke="#fff" stroke-width="3" fill="none" opacity=".6"/>';
  } };
  T.xmark = { view: '0 0 100 100', svg: function (p, o) {
    var a = 1 - (o.state.erase || 0);
    return '<path d="M16 16 L84 84 M84 16 L16 84" stroke="' + C.coral + '" stroke-width="16" stroke-linecap="round" opacity="' + a.toFixed(2) + '"/>';
  } };
  T.mirrorline = { view: '0 0 10 100', stretch: true, svg: function () {
    return '<rect x="2" y="0" width="6" height="100" fill="#BDE3FF"/><rect x="4" y="0" width="2" height="100" fill="#fff"/>';
  } };
  T.card = { view: '0 0 60 80', svg: function (p) {
    return '<rect x="2" y="2" width="56" height="76" rx="8" fill="#fff" stroke="#E3DDD2" stroke-width="3"/><text x="30" y="54" text-anchor="middle" font-size="40" font-weight="900" fill="' + C.ink + '" font-family="sans-serif">' + (p.n != null ? p.n : '') + '</text>';
  } };
  T.cup2 = { view: '0 0 80 90', svg: function (p) {
    var c = col(p, C.coral);
    return '<path d="M12 4 L68 4 L78 86 L2 86Z" fill="' + c + '"/><rect x="0" y="80" width="80" height="10" rx="4" fill="' + shade(c, -30) + '"/><path d="M20 14 L16 70" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".4"/>';
  } };
  T.paper = { view: '0 0 100 60', stretch: true, svg: function () {
    return '<rect x="0" y="0" width="100" height="60" rx="3" fill="#FFFDF5" stroke="#E3DDD2" stroke-width="2"/><path d="M10 16 L70 16 M10 28 L84 28 M10 40 L60 40" stroke="#E3DDD2" stroke-width="3" stroke-linecap="round"/>';
  } };
  T.outline = { view: '0 0 100 100', stretch: true, svg: function (p) {
    var c = col(p, C.purple);
    return '<rect x="3" y="3" width="94" height="94" rx="6" fill="' + c + '" fill-opacity=".12" stroke="' + c + '" stroke-width="3" stroke-dasharray="8 6" vector-effect="non-scaling-stroke"/>';
  } };
  T.blackout = { view: '0 0 10 10', stretch: true, svg: function () { return '<rect width="10" height="10" fill="#1B1D33"/>'; } };

  // Ponto invisível (lugares de encaixe, controladores).
  T.marker = { view: '0 0 10 10', svg: function () { return ''; } };

  R.Renderers = {
    types: T,
    register: function (name, def) { T[name] = def; },

    // Só redesenha quando o desenho depende do estado (svg(props, obj)).
    usesState: function (obj) {
      if (obj.type === 'word') return false;
      if (obj.type === 'ruli') return true;
      var t = T[obj.type];
      return !!t && t.svg.length >= 2;
    },

    // Cria o conteúdo visual dentro de obj.inner.
    draw: function (obj) {
      if (obj.type === 'word') {
        obj.inner.textContent = obj.text;
        return;
      }
      if (obj.type === 'ruli') {
        obj.inner.innerHTML = R.Ruli.svg(obj.state.expr || 'normal', (obj.def.props || {}).color, obj.state.balloon);
        return;
      }
      var t = T[obj.type];
      if (!t) { obj.inner.innerHTML = ''; return; }
      obj.inner.innerHTML = '<svg viewBox="' + t.view + '" preserveAspectRatio="' + (t.stretch ? 'none' : 'xMidYMid meet') +
        '" overflow="visible" aria-hidden="true">' + t.svg(obj.def.props || {}, obj) + '</svg>';
    }
  };
})();
