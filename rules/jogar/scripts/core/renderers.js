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

  T.circle = { view: '0 0 100 100', svg: function (p) {
    var c = col(p, C.coral);
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

  T.cloud = { view: '0 0 100 60', svg: function () {
    return '<path d="M22 56 Q2 56 4 40 Q6 26 22 28 Q26 8 48 10 Q66 4 74 22 Q96 20 96 40 Q96 56 78 56Z" fill="#fff" stroke="#E2E8F0" stroke-width="3"/>';
  } };

  T.ruli = { view: '0 0 100 112', svg: function (p, o) { return null; } };

  R.Renderers = {
    types: T,
    register: function (name, def) { T[name] = def; },

    // Cria o conteúdo visual dentro de obj.inner.
    draw: function (obj) {
      if (obj.type === 'word') {
        obj.inner.textContent = obj.text;
        return;
      }
      if (obj.type === 'ruli') {
        obj.inner.innerHTML = R.Ruli.svg(obj.state.expr || 'normal');
        return;
      }
      var t = T[obj.type];
      if (!t) { obj.inner.innerHTML = ''; return; }
      obj.inner.innerHTML = '<svg viewBox="' + t.view + '" preserveAspectRatio="' + (t.stretch ? 'none' : 'xMidYMid meet') +
        '" overflow="visible" aria-hidden="true">' + t.svg(obj.def.props || {}, obj) + '</svg>';
    }
  };
})();
