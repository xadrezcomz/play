// FASE 284 — PINTE A PALAVRA FASE DE AZUL · a palavra FASE está lá em cima.
RULES.registerLevel({
  id: 284, chapter: 29,
  instruction: 'LEVEL_284_TITLE',
  label: 'LEVEL_284_LABEL',
  hints: ['LEVEL_284_HINT_1', 'LEVEL_284_HINT_2', 'LEVEL_284_HINT_3'],
  objects: [
    {id: 'w_fase', inLabel: true, behaviors: {receives: {from: ['pb', 'pr'], copyColor: true, returnTool: true}}},
    {id: 'board', type: 'paper', x: 50, y: 56, w: 50, h: 30, z: 1, props: {blank: true}, behaviors: {receives: {from: ['pb', 'pr'], returnTool: true, set: {}}}},
    {id: 'bword', type: 'word', textKey: 'LEVEL_284_WORD', fontU: 7, x: 50, y: 56, z: 2, passive: true},
    {id: 'pb', type: 'bucket', x: 30, y: 100, w: 13, h: 15, z: 5, props: {color: 'blue'}, behaviors: {draggable: {}}},
    {id: 'pr', type: 'bucket', x: 70, y: 100, w: 13, h: 15, z: 5, props: {color: 'coral'}, behaviors: {draggable: {}}}
  ],
  reactions: [
    {on: 'used', target: 'board', cooldown: 500, 'do': [{fail: 'FB_THATS_A_DRAWING'}]}
  ],
  win: {type: 'state', target: 'w_fase', key: 'color', equals: 'blue'},
  onWin: [{fx: 'pop', target: 'board'}]
});
