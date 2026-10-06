// FASE 57 — ENCONTRE O 7 · nenhuma carta é 7; o 7 está no rótulo "FASE 57".
(function () {
  var objs = [{ id: 'w_seven', inLabel: true, behaviors: { clickable: {} } }], reactions = [];
  [1, 2, 3, 4, 5, 6, 8, 9].forEach(function (n, i) {
    var id = 'c' + n;
    objs.push({ id: id, type: 'card', x: 16 + (i % 4) * 22.6, y: 46 + Math.floor(i / 4) * 34, w: 15, h: 20, props: { n: n } });
    reactions.push({ on: 'tap', target: id, cooldown: 400, do: [{ fx: 'shake' }, { fail: 'FB_NOT_SEVEN' }] });
  });
  RULES.registerLevel({
    id: 57, chapter: 6,
    instruction: 'LEVEL_057_TITLE',
    label: 'LEVEL_057_LABEL',     // "FASE 5[[w_seven|7]]"
    hints: ['LEVEL_057_HINT_1', 'LEVEL_057_HINT_2', 'LEVEL_057_HINT_3'],
    objects: objs,
    reactions: reactions,
    win: { type: 'tapped', target: 'w_seven' },
    onWin: [{ fx: 'pop', target: 'w_seven' }]
  });
})();
