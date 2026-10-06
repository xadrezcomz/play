// FASE 34 — DEIXE TUDO PEQUENO · os objetos diminuem... e a palavra TUDO também.
RULES.registerLevel({
  id: 34, chapter: 4,
  instruction: 'LEVEL_034_TITLE',   // contém [[w_all|TUDO]]
  hints: ['LEVEL_034_HINT_1', 'LEVEL_034_HINT_2', 'LEVEL_034_HINT_3'],
  objects: [
    { id: 'w_all', inText: true, behaviors: { scalable: { min: 0.3, max: 1.4 } } },
    { id: 'ball', type: 'ball', x: 26, y: 40, w: 24, props: { color: 'coral' }, behaviors: { scalable: { min: 0.3, max: 1.2 } } },
    { id: 'star', type: 'star', x: 72, y: 50, w: 26, behaviors: { scalable: { min: 0.3, max: 1.2 } } },
    { id: 'cube', type: 'cube', x: 44, y: 92, w: 24, props: { color: 'green' }, behaviors: { scalable: { min: 0.3, max: 1.2 } } }
  ],
  triggers: [
    { when: [{ type: 'scale', target: 'ball', max: 0.55 }, { type: 'scale', target: 'star', max: 0.55 }, { type: 'scale', target: 'cube', max: 0.55 }],
      do: [{ wait: 300 }, { fail: 'FB_ALMOST' }, { wait: 1200 }, { fx: 'wiggle', target: 'w_all' }] }
  ],
  win: [
    { type: 'scale', target: 'ball', max: 0.55 }, { type: 'scale', target: 'star', max: 0.55 },
    { type: 'scale', target: 'cube', max: 0.55 }, { type: 'scale', target: 'w_all', max: 0.55 }
  ],
  onWin: [{ fx: 'pop', target: 'w_all' }]
});
