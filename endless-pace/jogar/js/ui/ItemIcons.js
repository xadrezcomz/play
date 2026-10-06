// ItemIcons — desenho simples (SVG) de cada item da loja, com as cores do
// próprio item (visual.color, accent, lens, pattern). Assim um item novo em
// dados/itens.js já ganha ícone sem precisar de imagem.
(function (EP) {
  'use strict';
  var uid = 0;

  function hex(c) {
    c = String(c || '#888888').replace('#', '');
    if (c.length === 3) c = c[0] + c[0] + c[1] + c[1] + c[2] + c[2];
    var n = parseInt(c, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  // mistura duas cores (t = 0 → a, 1 → b)
  function mix(a, b, t) {
    var x = hex(a), y = hex(b);
    return 'rgb(' + [0, 1, 2].map(function (i) { return Math.round(x[i] + (y[i] - x[i]) * t); }).join(',') + ')';
  }
  var OUT = 'stroke="rgba(10,14,24,.55)" stroke-width="1.6" stroke-linejoin="round"';

  // estampa recortada na forma da peça (faixa, listras, degradê)
  function pattern(shape, color, accent, pat, vertical) {
    var id = 'icp' + (++uid), s = '';
    if (pat === 'degrade') {
      return '<defs><linearGradient id="' + id + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + color + '"/><stop offset="1" stop-color="' + accent + '"/></linearGradient></defs>' +
        '<path d="' + shape + '" fill="url(#' + id + ')" ' + OUT + '/>';
    }
    s += '<defs><clipPath id="' + id + '"><path d="' + shape + '"/></clipPath></defs>';
    s += '<path d="' + shape + '" fill="' + color + '"/>';
    s += '<g clip-path="url(#' + id + ')" fill="' + accent + '">';
    if (pat === 'faixa') s += vertical ? '<rect x="8" y="0" width="5" height="64"/><rect x="51" y="0" width="5" height="64"/>' : '<rect x="0" y="27" width="64" height="7"/>';
    else if (pat === 'listras') s += '<rect x="0" y="20" width="64" height="4"/><rect x="0" y="30" width="64" height="4"/><rect x="0" y="40" width="64" height="4"/><rect x="0" y="50" width="64" height="4"/>';
    s += '</g><path d="' + shape + '" fill="none" ' + OUT + '/>';
    return s;
  }
  function body(shape, color, accent, pat, vertical) {
    if (pat && accent) return pattern(shape, color, accent, pat, vertical);
    return '<path d="' + shape + '" fill="' + color + '" ' + OUT + '/>';
  }

  var draw = {
    shoes: function (v, c, a) {
      var pro = v.kind === 'tenis-pro', race = v.kind === 'tenis-corrida' || pro;
      var sole = pro ? mix(a, '#ffffff', 0.45) : race ? mix(a, '#ffffff', 0.7) : '#f2f1ec';
      var top = race ? 'M8 41 C8 33 13 28 21 27 L29 26 C33 31 40 33 49 34 C55 35 59 38 59 42 L59 44 L8 44 Z'
        : 'M8 40 C8 30 13 25 21 25 L30 25 C34 30 40 32 48 33 C54 34 58 37 58 42 L58 44 L8 44 Z';
      var soleH = pro ? 9 : 6;
      return '<path d="M6 44 L61 44 C61 ' + (44 + soleH) + ' 58 ' + (46 + soleH) + ' 54 ' + (46 + soleH) + ' L11 ' + (46 + soleH) + ' C7 ' + (46 + soleH) + ' 6 ' + (44 + soleH) + ' 6 44 Z" fill="' + sole + '" ' + OUT + '/>' +
        '<path d="' + top + '" fill="' + c + '" ' + OUT + '/>' +
        '<path d="M16 39 C26 41 38 39 50 35" fill="none" stroke="' + a + '" stroke-width="4" stroke-linecap="round"/>' +
        '<path d="M25 28 l4 4 M30 27.5 l4 4 M35 29 l4 4" stroke="' + mix(c, '#ffffff', 0.75) + '" stroke-width="2" stroke-linecap="round"/>' +
        '<path d="M8 41 L8 33 C8 30 10 28 12 27" fill="none" stroke="' + mix(c, '#000000', 0.3) + '" stroke-width="2"/>';
    },
    shirt: function (v, c, a) {
      var shapes = {
        camiseta: 'M22 10 L13 13 L5 23 L13 29 L18 25 L18 55 L46 55 L46 25 L51 29 L59 23 L51 13 L42 10 C40 14 36 16 32 16 C28 16 24 14 22 10 Z',
        regata: 'M23 8 L23 14 C23 22 17 24 17 31 L17 56 L47 56 L47 31 C47 24 41 22 41 14 L41 8 L37 8 C37 14 35 18 32 18 C29 18 27 14 27 8 Z',
        'manga-longa': 'M22 10 L13 13 L8 24 L5 51 L12 52 L16 31 L18 29 L18 55 L46 55 L46 29 L48 31 L52 52 L59 51 L56 24 L51 13 L42 10 C40 14 36 16 32 16 C28 16 24 14 22 10 Z',
        'corta-vento': 'M22 9 L13 13 L8 24 L5 51 L12 52 L16 31 L18 29 L18 55 L46 55 L46 29 L48 31 L52 52 L59 51 L56 24 L51 13 L42 9 C41 12 37 15 32 15 C27 15 23 12 22 9 Z',
        top: 'M24 10 L22 17 C20 23 18 27 18 33 L18 43 L46 43 L46 33 C46 27 44 23 42 17 L40 10 L37 10 C36 16 34 19 32 19 C30 19 28 16 27 10 Z'
      };
      var s = body(shapes[v.kind] || shapes.camiseta, c, a, v.pattern);
      if (v.kind === 'corta-vento') s += '<path d="M32 15 L32 55" stroke="' + (a || '#ddd') + '" stroke-width="2.4"/><path d="M22 9 C24 4 40 4 42 9" fill="none" stroke="' + mix(c, '#000000', 0.25) + '" stroke-width="3"/>';
      else if (!v.pattern && a) s += '<path d="M23 11 C25 15 29 17 32 17 C35 17 39 15 41 11" fill="none" stroke="' + a + '" stroke-width="2.4"/>';
      return s;
    },
    shorts: function (v, c, a) {
      var shapes = {
        short: 'M14 14 L50 14 L54 43 L36 45 L32 29 L28 45 L10 43 Z',
        bermuda: 'M14 11 L50 11 L54 51 L36 53 L32 28 L28 53 L10 51 Z',
        legging: 'M19 6 L45 6 L46 14 L42 59 L34 59 L32 24 L30 59 L22 59 L18 14 Z',
        'saia-short': 'M17 14 L47 14 L56 47 L8 47 Z'
      };
      var sh = shapes[v.kind] || shapes.short;
      var s = body(sh, c, a, v.pattern, v.pattern === 'faixa');
      var y = v.kind === 'bermuda' ? 11 : v.kind === 'legging' ? 6 : 14, x0 = v.kind === 'legging' ? 19 : v.kind === 'saia-short' ? 17 : 14;
      s += '<rect x="' + x0 + '" y="' + y + '" width="' + (64 - 2 * x0) + '" height="5" fill="' + (a || mix(c, '#000000', 0.3)) + '" ' + OUT + '/>';
      return s;
    },
    head: function (v, c, a) {
      var dark = mix(c, '#000000', 0.3);
      switch (v.kind) {
        case 'viseira':
          return '<path d="M10 30 C10 26 14 24 20 24 L46 24 L46 33 L12 33 C10 33 10 32 10 30 Z" fill="' + c + '" ' + OUT + '/>' +
            '<path d="M44 26 L61 31 C62 35 60 38 56 38 L44 35 Z" fill="' + (a || dark) + '" ' + OUT + '/>';
        case 'faixa':
          return '<ellipse cx="32" cy="34" rx="23" ry="9" fill="none" stroke="' + dark + '" stroke-width="9"/>' +
            '<ellipse cx="32" cy="34" rx="23" ry="9" fill="none" stroke="' + c + '" stroke-width="7"/>' +
            '<path d="M14 38 C24 43 40 43 50 38" fill="none" stroke="' + (a || '#fff') + '" stroke-width="2"/>';
        case 'bandana':
          return '<path d="M10 34 C10 20 20 12 32 12 C44 12 54 20 54 34 Z" fill="' + c + '" ' + OUT + '/>' +
            '<path d="M11 33 L3 44 L9 44 L14 37 Z M13 34 L7 48 L14 45 Z" fill="' + c + '" ' + OUT + '/>' +
            '<circle cx="24" cy="24" r="2.5" fill="' + (a || '#fff') + '"/><circle cx="35" cy="20" r="2.5" fill="' + (a || '#fff') + '"/><circle cx="44" cy="28" r="2.5" fill="' + (a || '#fff') + '"/><circle cx="30" cy="30" r="2.5" fill="' + (a || '#fff') + '"/>';
        case 'gorro':
          return '<circle cx="32" cy="10" r="6" fill="' + (a || '#fff') + '" ' + OUT + '/>' +
            '<path d="M13 42 C13 24 21 14 32 14 C43 14 51 24 51 42 Z" fill="' + c + '" ' + OUT + '/>' +
            '<path d="M22 18 L22 40 M32 15 L32 40 M42 18 L42 40" stroke="' + dark + '" stroke-width="1.5" opacity=".6"/>' +
            '<rect x="11" y="38" width="42" height="10" rx="4" fill="' + (a || dark) + '" ' + OUT + '/>';
        case 'bone-aba-reta':
          return '<path d="M12 37 C12 23 21 15 32 15 C43 15 50 23 50 37 Z" fill="' + c + '" ' + OUT + '/>' +
            '<rect x="42" y="34" width="20" height="5" rx="1" fill="' + (a || dark) + '" ' + OUT + '/>' +
            '<circle cx="32" cy="15" r="2.5" fill="' + (a || dark) + '"/><path d="M20 30 L40 30" stroke="' + (a || '#fff') + '" stroke-width="3"/>';
        default:   // boné
          return '<path d="M12 38 C12 23 21 15 32 15 C43 15 50 23 50 38 Z" fill="' + c + '" ' + OUT + '/>' +
            '<path d="M46 34 C52 34 60 36 61 40 C58 42 52 42 46 40 Z" fill="' + dark + '" ' + OUT + '/>' +
            '<path d="M32 15 C30 22 30 30 31 38" fill="none" stroke="' + dark + '" stroke-width="1.5"/>' +
            '<circle cx="32" cy="15" r="2.5" fill="' + (a || dark) + '"/><circle cx="22" cy="28" r="4" fill="' + (a || '#fff') + '"/>';
      }
    },
    eyes: function (v, c, a, lens) {
      lens = lens || '#cfe8ff';
      if (v.kind === 'oculos-esporte') {
        return '<path d="M6 28 C18 21 46 21 58 28 L56 38 C48 43 39 41 32 36 C25 41 16 43 8 38 Z" fill="' + lens + '" ' + OUT + '/>' +
          '<path d="M6 28 C18 21 46 21 58 28" fill="none" stroke="' + c + '" stroke-width="4" stroke-linecap="round"/>' +
          '<path d="M14 29 C20 27 26 27 28 28" stroke="#fff" stroke-width="2" opacity=".6" stroke-linecap="round"/>';
      }
      var sun = v.kind === 'oculos-sol';
      var lensL = sun ? '<rect x="7" y="25" width="21" height="15" rx="6"/>' : '<circle cx="19" cy="33" r="9"/>';
      var lensR = sun ? '<rect x="36" y="25" width="21" height="15" rx="6"/>' : '<circle cx="45" cy="33" r="9"/>';
      var g = function (shape) {
        return shape.replace('/>', ' fill="' + lens + '" fill-opacity="' + (sun ? 0.95 : 0.55) + '" stroke="' + c + '" stroke-width="3.5"/>');
      };
      return g(lensL) + g(lensR) +
        '<path d="M' + (sun ? 28 : 28) + ' 31 Q32 27 ' + (sun ? 36 : 36) + ' 31" fill="none" stroke="' + c + '" stroke-width="3"/>' +
        '<path d="M' + (sun ? 7 : 10) + ' 30 L3 27 M' + (sun ? 57 : 54) + ' 30 L61 27" stroke="' + c + '" stroke-width="3" stroke-linecap="round"/>' +
        '<path d="M' + (sun ? 11 : 14) + ' 30 l5 -2" stroke="#fff" stroke-width="2" opacity=".55" stroke-linecap="round"/>';
    },
    ears: function (v, c, a) {
      a = a || mix(c, '#000000', 0.3);
      if (v.kind === 'fone-sem-fio') {
        var bud = function (x, flip) {
          return '<ellipse cx="' + x + '" cy="26" rx="9" ry="8" fill="' + c + '" ' + OUT + '/>' +
            '<rect x="' + (x - 3 + (flip ? 2 : -2)) + '" y="28" width="6" height="20" rx="3" fill="' + c + '" ' + OUT + '/>' +
            '<circle cx="' + x + '" cy="26" r="3.5" fill="' + a + '"/>';
        };
        return bud(20, false) + bud(44, true);
      }
      if (v.kind === 'fone-esporte') {
        return '<path d="M12 28 C12 52 52 52 52 28" fill="none" stroke="' + c + '" stroke-width="5" stroke-linecap="round"/>' +
          '<circle cx="12" cy="24" r="8" fill="' + c + '" ' + OUT + '/><circle cx="52" cy="24" r="8" fill="' + c + '" ' + OUT + '/>' +
          '<circle cx="12" cy="24" r="3.5" fill="' + a + '"/><circle cx="52" cy="24" r="3.5" fill="' + a + '"/>';
      }
      return '<path d="M13 38 C13 14 51 14 51 38" fill="none" stroke="' + c + '" stroke-width="6" stroke-linecap="round"/>' +
        '<path d="M13 38 C13 14 51 14 51 38" fill="none" stroke="rgba(10,14,24,.35)" stroke-width="1.4"/>' +
        '<rect x="5" y="32" width="15" height="21" rx="7" fill="' + c + '" ' + OUT + '/><rect x="44" y="32" width="15" height="21" rx="7" fill="' + c + '" ' + OUT + '/>' +
        '<rect x="9" y="36" width="7" height="13" rx="3.5" fill="' + a + '"/><rect x="48" y="36" width="7" height="13" rx="3.5" fill="' + a + '"/>';
    },
    wrist: function (v, c, a) {
      a = a || '#e8ecf2';
      if (v.kind === 'pulseira') {
        var beads = '';
        for (var i = 0; i < 10; i++) {
          var ang = i / 10 * Math.PI * 2, x = 32 + Math.cos(ang) * 20, y = 34 + Math.sin(ang) * 11;
          beads += '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="4.2" fill="' + (i % 2 ? a : c) + '" ' + OUT + '/>';
        }
        return beads;
      }
      var smart = v.kind === 'smartwatch';
      var strap = '<rect x="23" y="4" width="18" height="56" rx="6" fill="' + c + '" ' + OUT + '/>';
      if (smart) {
        return strap + '<rect x="16" y="19" width="32" height="27" rx="8" fill="#1a1f2b" ' + OUT + '/>' +
          '<rect x="20" y="23" width="24" height="19" rx="5" fill="' + mix(a, '#000000', 0.55) + '"/>' +
          '<path d="M23 35 l5 -6 l5 4 l6 -7" fill="none" stroke="' + a + '" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>';
      }
      return strap + '<circle cx="32" cy="32" r="14" fill="' + mix(c, '#000000', 0.25) + '" ' + OUT + '/>' +
        '<circle cx="32" cy="32" r="10.5" fill="' + a + '"/>' +
        '<path d="M32 32 L32 25 M32 32 L37 34" stroke="#1a1f2b" stroke-width="2.2" stroke-linecap="round"/>';
    }
  };

  EP.ItemIcons = {
    mix: mix,
    // it: item de dados/itens.js · profileColors: { shirt, shorts, shoes } para a roupa básica (cor 'perfil')
    svg: function (it, profileColors) {
      var v = (it && it.visual) || {}, slot = it ? it.slot : 'shirt';
      var c = v.color === 'perfil' ? ((profileColors || {})[slot] || '#8a94a6') : (v.color || '#8a94a6');
      var fn = draw[slot] || draw.shirt;
      return '<svg viewBox="0 0 64 64" aria-hidden="true">' + fn(v, c, v.accent, v.lens) + '</svg>';
    }
  };
})(window.EP);
