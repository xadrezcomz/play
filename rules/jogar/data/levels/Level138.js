// FASE 138 — LEVE O RATINHO ATÉ O QUEIJO · o gato anda pelo corredor do meio; passe quando ele estiver longe.
RULES.registerLevel({
  id: 138, chapter: 14,
  instruction: 'LEVEL_138_TITLE',
  hints: ['LEVEL_138_HINT_1', 'LEVEL_138_HINT_2', 'LEVEL_138_HINT_3'],
  objects: [
    {id: 'w0', type: 'bar', x: 50.0, y: 37.0, w: 100, h: 10, z: 2, passive: true},
    {id: 'w1', type: 'bar', x: 5.0, y: 47.0, w: 10, h: 10, z: 2, passive: true},
    {id: 'w2', type: 'bar', x: 95.0, y: 47.0, w: 10, h: 10, z: 2, passive: true},
    {id: 'w3', type: 'bar', x: 5.0, y: 57.0, w: 10, h: 10, z: 2, passive: true},
    {id: 'w4', type: 'bar', x: 50.0, y: 57.0, w: 60, h: 10, z: 2, passive: true},
    {id: 'w5', type: 'bar', x: 95.0, y: 57.0, w: 10, h: 10, z: 2, passive: true},
    {id: 'w6', type: 'bar', x: 5.0, y: 67.0, w: 10, h: 10, z: 2, passive: true},
    {id: 'w7', type: 'bar', x: 95.0, y: 67.0, w: 10, h: 10, z: 2, passive: true},
    {id: 'w8', type: 'bar', x: 5.0, y: 77.0, w: 10, h: 10, z: 2, passive: true},
    {id: 'w9', type: 'bar', x: 50.0, y: 77.0, w: 60, h: 10, z: 2, passive: true},
    {id: 'w10', type: 'bar', x: 95.0, y: 77.0, w: 10, h: 10, z: 2, passive: true},
    {id: 'w11', type: 'bar', x: 5.0, y: 87.0, w: 10, h: 10, z: 2, passive: true},
    {id: 'w12', type: 'bar', x: 95.0, y: 87.0, w: 10, h: 10, z: 2, passive: true},
    {id: 'w13', type: 'bar', x: 5.0, y: 97.0, w: 10, h: 10, z: 2, passive: true},
    {id: 'w14', type: 'bar', x: 50.0, y: 97.0, w: 60, h: 10, z: 2, passive: true},
    {id: 'w15', type: 'bar', x: 95.0, y: 97.0, w: 10, h: 10, z: 2, passive: true},
    {id: 'w16', type: 'bar', x: 50.0, y: 107.0, w: 100, h: 10, z: 2, passive: true},
    {id: 'flag', type: 'cheese', x: 85.0, y: 97.0, w: 8, h: 5.6, z: 4, passive: true},
    {id: 'cat', type: 'cat', x: 15, y: 67, w: 9, h: 8, z: 7, passive: true, behaviors: {patrol: {points: [[15, 67], [85, 67]], ms: 1900, pause: 250}}},
    {id: 'ruli', type: 'mouse', x: 15.0, y: 47.0, w: 8, h: 5.6, z: 8, behaviors: {draggable: {}, pushes: {ids: [], solids: ['w0', 'w1', 'w2', 'w3', 'w4', 'w5', 'w6', 'w7', 'w8', 'w9', 'w10', 'w11', 'w12', 'w13', 'w14', 'w15', 'w16']}}}
  ],
  reactions: [
    {on: 'dragmove', target: 'ruli', when: {type: 'touching', a: 'ruli', b: 'cat', pad: -1}, cooldown: 800, 'do': [{drop: 'ruli'}, {fx: 'shake', target: 'cat'}, {fail: 'FB_CAT'}, {reset: 'ruli', ms: 300}]}
  ],
  win: {type: 'touching', a: 'ruli', b: 'flag'},
  onWin: [{hide: 'flag'}, {fx: 'hop', target: 'ruli'}]
});
