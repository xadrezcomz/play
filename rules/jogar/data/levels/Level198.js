// FASE 198 — JUNTE ARCO E ÍRIS · uma palavra em cima da outra vira um arco-íris.
RULES.registerLevel({
  id: 198, chapter: 20,
  instruction: 'LEVEL_198_TITLE',
  hints: ['LEVEL_198_HINT_1', 'LEVEL_198_HINT_2', 'LEVEL_198_HINT_3'],
  objects: [
    {id: 'w_a', inText: true, behaviors: {draggable: {}, merge: {'with': ['w_b'], into: 'rainbow'}}},
    {id: 'w_b', inText: true, behaviors: {draggable: {}, merge: {'with': ['w_a'], into: 'rainbow'}}},
    {id: 'rainbow', type: 'rainbow', x: 50, y: 70, w: 60, h: 32, z: 2, hidden: true, passive: true},
    {id: 'cloud1', type: 'cloud', x: 24, y: 94, w: 22, h: 13, z: 1, passive: true},
    {id: 'cloud2', type: 'cloud', x: 76, y: 94, w: 22, h: 13, z: 1, passive: true}
  ],
  win: {type: 'state', target: 'rainbow', key: 'made'},
  onWin: [{move: 'rainbow', to: [50, 78], ms: 400}]
});
