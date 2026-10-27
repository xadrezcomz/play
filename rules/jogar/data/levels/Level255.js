// FASE 255 — COLOQUE A BOLA NO BURACO · ela precisa ter o tamanho do buraco.
RULES.registerLevel({
  id: 255, chapter: 26,
  instruction: 'LEVEL_255_TITLE',
  hints: ['LEVEL_255_HINT_1', 'LEVEL_255_HINT_2', 'LEVEL_255_HINT_3'],
  objects: [
    {id: 'hole', type: 'circle', x: 50, y: 84, w: 14, z: 1, passive: true, props: {color: '#3D405B'}},
    {id: 'ball', type: 'ball', x: 50, y: 44, w: 26, z: 3, behaviors: {draggable: {}, scalable: {min: 0.2, max: 1.4}}}
  ],
  reactions: [
    {on: 'drop', target: 'ball', when: {type: 'touching', a: 'ball', b: 'hole'}, unless: {type: 'scale', target: 'ball', min: 0.44, max: 0.64}, 'do': [{reset: 'ball'}, {fx: 'shake', target: 'hole'}, {fail: 'FB_SIZE_HOLE'}]},
    {on: 'drop', target: 'ball', when: [{type: 'touching', a: 'ball', b: 'hole'}, {type: 'scale', target: 'ball', min: 0.44, max: 0.64}], 'do': [{move: 'ball', toObj: 'hole', ms: 150}, {state: 'ball', key: 'in', value: true}]}
  ],
  win: {type: 'state', target: 'ball', key: 'in'},
  onWin: [{fx: 'pop', target: 'hole'}]
});
