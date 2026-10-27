// FASE 102 — SOME 10 · o 9 não sai da bandeja; virado, ele vale 6 e 6 + 4 = 10.
RULES.registerLevel({
  id: 102, chapter: 11,
  instruction: 'LEVEL_102_TITLE',
  hints: ['LEVEL_102_HINT_1', 'LEVEL_102_HINT_2', 'LEVEL_102_HINT_3'],
  objects: [
    { id: 'screen', type: 'display', x: 50, y: 24, w: 30, h: 15, z: 2, passive: true, behaviors: { sumDisplay: { container: 'tray', ids: ['n9', 'a', 'b', 'c'] } } },
    { id: 'tray', type: 'slot', x: 50, y: 62, w: 70, h: 30, z: 1, passive: true, behaviors: { container: { slots: [[0.08, 0], [0.32, 0]] } } },
    { id: 'n9', type: 'number', x: 33, y: 62, w: 20, z: 4, props: { n: 9, color: 'purple' }, behaviors: { rotatable: { snap: 90 } } },
    { id: 'a', type: 'number', x: 24, y: 100, w: 16, z: 5, props: { n: 4 }, behaviors: { draggable: {} } },
    { id: 'b', type: 'number', x: 50, y: 100, w: 16, z: 5, props: { n: 3 }, behaviors: { draggable: {} } },
    { id: 'c', type: 'number', x: 76, y: 100, w: 16, z: 5, props: { n: 2 }, behaviors: { draggable: {} } }
  ],
  triggers: [
    { when: { type: 'state', target: 'screen', key: 'n', min: 11 }, once: false, do: [{ fail: 'FB_TOO_MUCH' }] }
  ],
  win: { type: 'sum', container: 'tray', ids: ['n9', 'a', 'b', 'c'], equals: 10 },
  onWin: [{ fx: 'pop', target: 'screen' }]
});
