// FASE 148 — QUAL VEM DEPOIS? · cor e tamanho se repetem: o próximo é azul e pequeno.
RULES.registerLevel({
  id: 148, chapter: 15,
  instruction: 'LEVEL_148_TITLE',
  hints: ['LEVEL_148_HINT_1', 'LEVEL_148_HINT_2', 'LEVEL_148_HINT_3'],
  objects: [
    {id: 's1', type: 'circle', x: 12, y: 48, w: 16, z: 2, passive: true, props: {color: 'coral'}},
    {id: 's2', type: 'circle', x: 27, y: 48, w: 9, z: 2, passive: true, props: {color: 'yellow'}},
    {id: 's3', type: 'circle', x: 42, y: 48, w: 16, z: 2, passive: true, props: {color: 'blue'}},
    {id: 's4', type: 'circle', x: 57, y: 48, w: 9, z: 2, passive: true, props: {color: 'coral'}},
    {id: 's5', type: 'circle', x: 72, y: 48, w: 16, z: 2, passive: true, props: {color: 'yellow'}},
    {id: 'q', type: 'slot', x: 87, y: 48, w: 12, z: 1, passive: true},
    {id: 'o1', type: 'circle', x: 25, y: 92, w: 16, z: 3, props: {color: 'blue'}},
    {id: 'o2', type: 'circle', x: 50, y: 92, w: 9, z: 3, props: {color: 'green'}},
    {id: 'o3', type: 'circle', x: 75, y: 92, w: 9, z: 3, props: {color: 'blue'}}
  ],
  reactions: [
    {on: 'tap', target: 'o1', 'do': [{fx: 'shake'}, {fail: 'FB_SIZE_TOO'}]},
    {on: 'tap', target: 'o2', 'do': [{fx: 'shake'}, {fail: 'FB_HMM'}]}
  ],
  win: {type: 'tapped', target: 'o3'},
  onWin: [{move: 'o3', toObj: 'q', ms: 300}]
});
