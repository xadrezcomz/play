// FASE 184 — FAÇA O QUE O ESPELHO DIZ · a frase do espelho está ao contrário: TOQUE NA ESTRELA.
RULES.registerLevel({
  id: 184, chapter: 19,
  instruction: 'LEVEL_184_TITLE',
  hints: ['LEVEL_184_HINT_1', 'LEVEL_184_HINT_2', 'LEVEL_184_HINT_3'],
  objects: [
    {id: 'frame', type: 'bar', x: 50, y: 46, w: 80, h: 24, z: 1, passive: true, props: {color: '#BDE3FF'}},
    {id: 'msg', type: 'word', textKey: 'LEVEL_184_MSG', fontU: 6, x: 50, y: 46, z: 2, passive: true, cls: 'flipx'},
    {id: 'star', type: 'star', x: 26, y: 90, w: 14, z: 3},
    {id: 'ball', type: 'ball', x: 50, y: 90, w: 13, z: 3, props: {color: 'coral'}},
    {id: 'cube', type: 'cube', x: 74, y: 90, w: 13, z: 3, props: {color: 'blue'}}
  ],
  reactions: [
    {on: 'tap', target: 'ball', 'do': [{fx: 'shake'}, {fail: 'FB_READ_MIRROR'}]},
    {on: 'tap', target: 'cube', 'do': [{fx: 'shake'}, {fail: 'FB_READ_MIRROR'}]}
  ],
  win: {type: 'tapped', target: 'star'},
  onWin: [{fx: 'pop', target: 'star'}]
});
