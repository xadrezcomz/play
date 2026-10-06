// Ruli: o personagem. Um SVG simples com expressões trocáveis.
// Expressões: normal, thinking, surprised, happy, confused, serious, sleepy.
// Cores: teal (o Ruli), pink, yellow, purple (amigos).
(function () {
  'use strict';
  var R = window.RULES;

  var INK = '#2B2D42';
  var COLORS = {
    teal: ['#2EC4B6', '#1C8F86'], pink: ['#FF8FB1', '#D9628A'],
    yellow: ['#FFC94A', '#D99A1E'], purple: ['#9B7BFF', '#6E50D6']
  };

  var EXPR = {
    normal:    { pl: [0, 1], pr: [0, 1], r: 6,
                 mouth: '<path d="M41 73 Q50 80 59 73" fill="none" stroke="' + INK + '" stroke-width="3.6" stroke-linecap="round"/>',
                 brows: '' , arms: 'down' },
    thinking:  { pl: [4, -4], pr: [4, -4], r: 6,
                 mouth: '<path d="M43 75 L57 72" fill="none" stroke="' + INK + '" stroke-width="3.6" stroke-linecap="round"/>',
                 brows: '<path d="M56 34 Q64 29 73 33" fill="none" stroke="' + INK + '" stroke-width="3.2" stroke-linecap="round"/>',
                 arms: 'chin' },
    surprised: { pl: [0, 0], pr: [0, 0], r: 4.2,
                 mouth: '<ellipse cx="50" cy="76" rx="5" ry="6.5" fill="' + INK + '"/>',
                 brows: '<path d="M27 33 Q36 27 45 32 M55 32 Q64 27 73 33" fill="none" stroke="' + INK + '" stroke-width="3.2" stroke-linecap="round"/>',
                 arms: 'out' },
    happy:     { eyes: 'closed',
                 mouth: '<path d="M37 68 Q50 88 63 68 Z" fill="' + INK + '"/><path d="M44 77 Q50 83 56 77 Q50 74 44 77Z" fill="#FF8FB1"/>',
                 brows: '', arms: 'up' },
    serious:   { pl: [0, 2], pr: [0, 2], r: 5.5,
                 mouth: '<path d="M42 75 L58 75" fill="none" stroke="' + INK + '" stroke-width="3.6" stroke-linecap="round"/>',
                 brows: '<path d="M27 36 L45 38 M55 38 L73 36" fill="none" stroke="' + INK + '" stroke-width="3.4" stroke-linecap="round"/>',
                 arms: 'down' },
    sleepy:    { eyes: 'closed',
                 mouth: '<ellipse cx="50" cy="76" rx="3.5" ry="2.5" fill="' + INK + '"/>',
                 brows: '', arms: 'down' },
    confused:  { pl: [-3, 3], pr: [3, -3], r: 5.5,
                 mouth: '<path d="M39 75 q5.5 -5 11 0 t11 0" fill="none" stroke="' + INK + '" stroke-width="3.4" stroke-linecap="round"/>',
                 brows: '<path d="M27 37 L44 33 M56 31 L73 36" fill="none" stroke="' + INK + '" stroke-width="3.2" stroke-linecap="round"/>',
                 arms: 'out' }
  };

  var ARMS = {
    down: 'M15 60 Q5 66 9 77 M85 60 Q95 66 91 77',
    up:   'M16 52 Q5 42 9 29 M84 52 Q95 42 91 29',
    out:  'M14 58 Q3 56 2 47 M86 58 Q97 56 98 47',
    chin: 'M15 60 Q5 66 9 77 M80 70 Q72 82 60 82'
  };

  function eyes(e) {
    if (e.eyes === 'closed') {
      return '<path d="M27 53 Q36 43 45 53 M55 53 Q64 43 73 53" fill="none" stroke="' + INK + '" stroke-width="4" stroke-linecap="round"/>';
    }
    var s = '';
    [[36, e.pl], [64, e.pr]].forEach(function (p) {
      s += '<ellipse cx="' + p[0] + '" cy="52" rx="11" ry="13" fill="#fff"/>' +
           '<circle cx="' + (p[0] + p[1][0]) + '" cy="' + (53 + p[1][1]) + '" r="' + e.r + '" fill="' + INK + '"/>' +
           '<circle cx="' + (p[0] + p[1][0] + 2) + '" cy="' + (50 + p[1][1]) + '" r="1.8" fill="#fff"/>';
    });
    return s;
  }

  R.Ruli = {
    EXPRESSIONS: Object.keys(EXPR),
    svg: function (expr, color, balloon) {
      var e = EXPR[expr] || EXPR.normal, c = COLORS[color] || COLORS.teal, BODY = c[0], DARK = c[1];
      return '<svg class="ruli-svg" viewBox="0 0 100 112" aria-hidden="true" overflow="visible">' +
        (balloon ? '<path d="M76 54 Q84 20 76 -20" fill="none" stroke="' + INK + '" stroke-width="1.6"/><ellipse cx="76" cy="-44" rx="18" ry="24" fill="#FF6B6B"/>' : '') +
        '<ellipse cx="50" cy="108" rx="30" ry="3.5" fill="#000" opacity=".08"/>' +
        '<g class="ruli-legs"><ellipse cx="37" cy="101" rx="10" ry="6.5" fill="' + DARK + '"/><ellipse cx="63" cy="101" rx="10" ry="6.5" fill="' + DARK + '"/></g>' +
        '<path d="' + ARMS[e.arms] + '" fill="none" stroke="' + DARK + '" stroke-width="7" stroke-linecap="round"/>' +
        '<path d="M50 18 Q50 9 57 5" fill="none" stroke="' + DARK + '" stroke-width="3.6" stroke-linecap="round"/>' +
        '<ellipse cx="60" cy="6" rx="7" ry="3.8" fill="#6BCB77" transform="rotate(-22 60 6)"/>' +
        '<ellipse cx="50" cy="58" rx="40" ry="40" fill="' + BODY + '"/>' +
        '<ellipse cx="36" cy="33" rx="12" ry="6.5" fill="#fff" opacity=".35" transform="rotate(-20 36 33)"/>' +
        '<ellipse cx="23" cy="69" rx="6" ry="3.6" fill="#FF8FB1" opacity=".55"/><ellipse cx="77" cy="69" rx="6" ry="3.6" fill="#FF8FB1" opacity=".55"/>' +
        eyes(e) + e.brows + e.mouth +
        '</svg>';
    }
  };
})();
