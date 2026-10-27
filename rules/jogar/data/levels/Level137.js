// FASE 137 — CHEGUE À BANDEIRA · o círculo roxo leva o Ruli para o outro círculo roxo.
RULES.registerLevel({
  id: 137, chapter: 14,
  instruction: 'LEVEL_137_TITLE',
  hints: ['LEVEL_137_HINT_1', 'LEVEL_137_HINT_2', 'LEVEL_137_HINT_3'],
  objects: [
    {id: 'w0', type: 'bar', x: 50.0, y: 37.0, w: 100, h: 10, z: 2, passive: true},
    {id: 'w1', type: 'bar', x: 5.0, y: 47.0, w: 10, h: 10, z: 2, passive: true},
    {id: 'w2', type: 'bar', x: 55.0, y: 47.0, w: 10, h: 10, z: 2, passive: true},
    {id: 'w3', type: 'bar', x: 95.0, y: 47.0, w: 10, h: 10, z: 2, passive: true},
    {id: 'w4', type: 'bar', x: 5.0, y: 57.0, w: 10, h: 10, z: 2, passive: true},
    {id: 'w5', type: 'bar', x: 55.0, y: 57.0, w: 10, h: 10, z: 2, passive: true},
    {id: 'w6', type: 'bar', x: 75.0, y: 57.0, w: 10, h: 10, z: 2, passive: true},
    {id: 'w7', type: 'bar', x: 95.0, y: 57.0, w: 10, h: 10, z: 2, passive: true},
    {id: 'w8', type: 'bar', x: 5.0, y: 67.0, w: 10, h: 10, z: 2, passive: true},
    {id: 'w9', type: 'bar', x: 55.0, y: 67.0, w: 10, h: 10, z: 2, passive: true},
    {id: 'w10', type: 'bar', x: 75.0, y: 67.0, w: 10, h: 10, z: 2, passive: true},
    {id: 'w11', type: 'bar', x: 95.0, y: 67.0, w: 10, h: 10, z: 2, passive: true},
    {id: 'w12', type: 'bar', x: 30.0, y: 77.0, w: 60, h: 10, z: 2, passive: true},
    {id: 'w13', type: 'bar', x: 75.0, y: 77.0, w: 10, h: 10, z: 2, passive: true},
    {id: 'w14', type: 'bar', x: 95.0, y: 77.0, w: 10, h: 10, z: 2, passive: true},
    {id: 'w15', type: 'bar', x: 5.0, y: 87.0, w: 10, h: 10, z: 2, passive: true},
    {id: 'w16', type: 'bar', x: 75.0, y: 87.0, w: 10, h: 10, z: 2, passive: true},
    {id: 'w17', type: 'bar', x: 95.0, y: 87.0, w: 10, h: 10, z: 2, passive: true},
    {id: 'w18', type: 'bar', x: 5.0, y: 97.0, w: 10, h: 10, z: 2, passive: true},
    {id: 'w19', type: 'bar', x: 95.0, y: 97.0, w: 10, h: 10, z: 2, passive: true},
    {id: 'w20', type: 'bar', x: 50.0, y: 107.0, w: 100, h: 10, z: 2, passive: true},
    {id: 'pa', type: 'circle', x: 45.0, y: 47.0, w: 8, z: 1, passive: true, props: {color: 'purple'}, cls: 'breathe'},
    {id: 'pb', type: 'circle', x: 15.0, y: 87.0, w: 8, z: 1, passive: true, props: {color: 'purple'}},
    {id: 'flag', type: 'flag', x: 85.0, y: 66.0, w: 7, h: 9, z: 4, passive: true},
    {id: 'ruli', type: 'ruli', x: 15.0, y: 47.0, w: 6.5, h: 7.280000000000001, z: 8, behaviors: {draggable: {}, character: {}, pushes: {ids: [], solids: ['w0', 'w1', 'w2', 'w3', 'w4', 'w5', 'w6', 'w7', 'w8', 'w9', 'w10', 'w11', 'w12', 'w13', 'w14', 'w15', 'w16', 'w17', 'w18', 'w19', 'w20']}}}
  ],
  reactions: [
    {on: 'dragmove', target: 'ruli', when: {type: 'touching', a: 'ruli', b: 'pa', pad: -2}, cooldown: 600, 'do': [{drop: 'ruli'}, {fx: 'squash', target: 'ruli'}, {sound: 'whoosh'}, {move: 'ruli', toObj: 'pb', offset: [6, 0], ms: 0}, {fx: 'pop', target: 'ruli'}]}
  ],
  win: {type: 'touching', a: 'ruli', b: 'flag'},
  onWin: [{expr: 'happy', target: 'ruli'}, {fx: 'hop', target: 'ruli'}]
});
