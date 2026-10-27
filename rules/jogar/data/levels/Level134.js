// FASE 134 — SAIA DO LABIRINTO · a única saída é estreita demais; diminua o Ruli.
RULES.registerLevel({
  id: 134, chapter: 14,
  instruction: 'LEVEL_134_TITLE',
  hints: ['LEVEL_134_HINT_1', 'LEVEL_134_HINT_2', 'LEVEL_134_HINT_3'],
  objects: [
    {id: 'w0', type: 'bar', x: 50.0, y: 37.0, w: 100, h: 10, z: 2, passive: true},
    {id: 'w1', type: 'bar', x: 5.0, y: 47.0, w: 10, h: 10, z: 2, passive: true},
    {id: 'w2', type: 'bar', x: 95.0, y: 47.0, w: 10, h: 10, z: 2, passive: true},
    {id: 'w3', type: 'bar', x: 5.0, y: 57.0, w: 10, h: 10, z: 2, passive: true},
    {id: 'w4', type: 'bar', x: 95.0, y: 57.0, w: 10, h: 10, z: 2, passive: true},
    {id: 'w5', type: 'bar', x: 5.0, y: 67.0, w: 10, h: 10, z: 2, passive: true},
    {id: 'w6', type: 'bar', x: 95.0, y: 67.0, w: 10, h: 10, z: 2, passive: true},
    {id: 'w7', type: 'bar', x: 5.0, y: 77.0, w: 10, h: 10, z: 2, passive: true},
    {id: 'w8', type: 'bar', x: 95.0, y: 77.0, w: 10, h: 10, z: 2, passive: true},
    {id: 'w9', type: 'bar', x: 5.0, y: 87.0, w: 10, h: 10, z: 2, passive: true},
    {id: 'w10', type: 'bar', x: 95.0, y: 87.0, w: 10, h: 10, z: 2, passive: true},
    {id: 'w11', type: 'bar', x: 5.0, y: 97.0, w: 10, h: 10, z: 2, passive: true},
    {id: 'w12', type: 'bar', x: 95.0, y: 97.0, w: 10, h: 10, z: 2, passive: true},
    {id: 'w13', type: 'bar', x: 20.0, y: 107.0, w: 40, h: 10, z: 2, passive: true},
    {id: 'w14', type: 'bar', x: 75.0, y: 107.0, w: 50, h: 10, z: 2, passive: true},
    {id: 'g1', type: 'bar', x: 41.5, y: 107.0, w: 3, h: 10, z: 2, passive: true},
    {id: 'g2', type: 'bar', x: 48.5, y: 107.0, w: 3, h: 10, z: 2, passive: true},
    {id: 'ruli', type: 'ruli', x: 45.0, y: 67.0, w: 7, h: 7.840000000000001, z: 8, behaviors: {draggable: {}, character: {}, pushes: {ids: [], solids: ['w0', 'w1', 'w2', 'w3', 'w4', 'w5', 'w6', 'w7', 'w8', 'w9', 'w10', 'w11', 'w12', 'w13', 'w14', 'g1', 'g2']}, scalable: {min: 0.35, max: 1}}}
  ],
  reactions: [
    {on: 'bump', target: 'g1', cooldown: 1500, 'do': [{say: 'FB_TOO_TIGHT'}]},
    {on: 'bump', target: 'g2', cooldown: 1500, 'do': [{say: 'FB_TOO_TIGHT'}]}
  ],
  win: {type: 'pos', target: 'ruli', minY: 114},
  onWin: [{expr: 'happy', target: 'ruli'}, {fx: 'hop', target: 'ruli'}]
});
