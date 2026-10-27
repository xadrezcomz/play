// FASE 159 — DEIXE O CACHORRO FELIZ · faça carinho: esfregue o cachorro.
RULES.registerLevel({
  id: 159, chapter: 16,
  instruction: 'LEVEL_159_TITLE',
  hints: ['LEVEL_159_HINT_1', 'LEVEL_159_HINT_2', 'LEVEL_159_HINT_3'],
  objects: [
    {id: 'dog', type: 'dog', x: 50, y: 70, w: 34, h: 30, z: 2, behaviors: {rubbable: {count: 14, set: {happy: true}}}},
    {id: 'bone', type: 'bone', x: 22, y: 100, w: 16, h: 6.5, z: 3, behaviors: {draggable: {}}}
  ],
  reactions: [
    {on: 'tap', target: 'dog', cooldown: 700, 'do': [{fx: 'shake'}, {fail: 'FB_WOOF'}]},
    {on: 'drop', target: 'bone', when: {type: 'touching', a: 'bone', b: 'dog'}, cooldown: 700, 'do': [{reset: 'bone'}, {say: 'FB_NOT_HUNGRY'}]}
  ],
  win: {type: 'state', target: 'dog', key: 'happy'},
  onWin: [{fx: 'hop', target: 'dog'}]
});
