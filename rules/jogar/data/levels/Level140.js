// FASE 140 — CHEGUE À BANDEIRA · o labirinto não tem saída; arraste o labirinto inteiro.
RULES.registerLevel({
  id: 140, chapter: 14,
  instruction: 'LEVEL_140_TITLE',
  hints: ['LEVEL_140_HINT_1', 'LEVEL_140_HINT_2', 'LEVEL_140_HINT_3'],
  objects: [
    {id: 'w0', type: 'bar', x: 50.0, y: 47.0, w: 80, h: 10, z: 2, passive: true},
    {id: 'w1', type: 'bar', x: 15.0, y: 57.0, w: 10, h: 10, z: 2, passive: true},
    {id: 'w2', type: 'bar', x: 85.0, y: 57.0, w: 10, h: 10, z: 2, passive: true},
    {id: 'w3', type: 'bar', x: 15.0, y: 67.0, w: 10, h: 10, z: 2, passive: true},
    {id: 'w4', type: 'bar', x: 85.0, y: 67.0, w: 10, h: 10, z: 2, passive: true},
    {id: 'w5', type: 'bar', x: 15.0, y: 77.0, w: 10, h: 10, z: 2, passive: true},
    {id: 'w6', type: 'bar', x: 85.0, y: 77.0, w: 10, h: 10, z: 2, passive: true},
    {id: 'w7', type: 'bar', x: 50.0, y: 87.0, w: 80, h: 10, z: 2, passive: true},
    {id: 'frame', type: 'outline', x: 50, y: 67, w: 80, h: 50, z: 1, props: {color: 'purple'}, behaviors: {draggable: {}, carries: {ids: ['w0', 'w1', 'w2', 'w3', 'w4', 'w5', 'w6', 'w7']}}},
    {id: 'flag', type: 'flag', x: 95.0, y: 106.0, w: 7, h: 9, z: 4, passive: true},
    {id: 'ruli', type: 'ruli', x: 45.0, y: 67.0, w: 6.5, h: 7.280000000000001, z: 8, behaviors: {draggable: {}, character: {}, pushes: {ids: [], solids: ['w0', 'w1', 'w2', 'w3', 'w4', 'w5', 'w6', 'w7']}}}
  ],
  win: {type: 'touching', a: 'ruli', b: 'flag'},
  onWin: [{expr: 'happy', target: 'ruli'}, {fx: 'hop', target: 'ruli'}]
});
