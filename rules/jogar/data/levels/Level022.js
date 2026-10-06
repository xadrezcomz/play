// FASE 22 — FAÇA 2 + 2 = 5 · palitos: mova um traço do segundo 2 e ele vira 3.
(function () {
  // segmentos de um dígito de 7 traços, relativos ao centro: [dx, dy, horizontal?]
  var SEG = { a: [0, -10, 1], b: [5, -5, 0], c: [5, 5, 0], d: [0, 10, 1], e: [-5, 5, 0], f: [-5, -5, 0], g: [0, 0, 1] };
  var Y = 60, objs = [];
  function stick(id, x, y, horiz, extra) {
    objs.push(Object.assign({ id: id, type: 'stick', x: x, y: y, w: horiz ? 9 : 2.6, h: horiz ? 2.6 : 9, z: 4 }, extra || {}));
  }
  function digit(name, cx, segs, skip) {
    segs.split('').forEach(function (s) {
      if (s === skip) return;
      var g = SEG[s];
      stick(name + s, cx + g[0], Y + g[1], g[2]);
    });
  }
  digit('d1', 14, 'abged');
  stick('plusH', 32, Y, 1); stick('plusV', 32, Y, 0);
  digit('d2', 50, 'abged', 'e');
  stick('eqA', 68, Y - 3, 1); stick('eqB', 68, Y + 3, 1);
  digit('d3', 86, 'afgcd');
  // o traço solto (o "e" do segundo 2, meio torto) e o lugar onde ele vira 3
  objs.push({ id: 'slot_c', type: 'marker', x: 55, y: Y + 5, w: 2.6, h: 9, passive: true });
  stick('loose', 45, Y + 5, 0, { rot: 12, z: 6, behaviors: { draggable: {}, snap: { to: ['slot_c'], tol: 6 } } });

  RULES.registerLevel({
    id: 22, chapter: 3,
    instruction: 'LEVEL_022_TITLE',
    hints: ['LEVEL_022_HINT_1', 'LEVEL_022_HINT_2', 'LEVEL_022_HINT_3'],
    objects: objs,
    reactions: [
      { on: 'tap', target: '*', cooldown: 600, do: [{ fx: 'wiggle' }, { sound: 'tap' }] }
    ],
    win: { type: 'state', target: 'loose', key: 'at', equals: 'slot_c' },
    onWin: [{ fx: 'pop', target: 'loose' }]
  });
})();
