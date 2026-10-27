// FASE 179 — AFUNDE A BOLA · ela boia; amarre a pedra na bola.
RULES.registerLevel({
  id: 179, chapter: 18,
  instruction: 'LEVEL_179_TITLE',
  hints: ['LEVEL_179_HINT_1', 'LEVEL_179_HINT_2', 'LEVEL_179_HINT_3'],
  objects: [
    {id: 'tank', type: 'tank', x: 50, y: 86, w: 46, h: 46, z: 1, passive: true, state: {level: 0.75}},
    {id: 'ball', type: 'ball', x: 50, y: 72, w: 11, z: 3, cls: 'breathe', props: {pattern: 'beach'}},
    {id: 'rock', type: 'rock', x: 18, y: 50, w: 14, h: 10, z: 4, behaviors: {draggable: {}, merge: {'with': ['ball'], into: 'pair'}}},
    {id: 'pair', type: 'rock', x: 50, y: 72, w: 14, h: 10, z: 3, hidden: true, passive: true},
    {id: 'pball', type: 'ball', x: 50, y: 66, w: 11, z: 2, hidden: true, passive: true, props: {pattern: 'beach'}}
  ],
  reactions: [
    {on: 'tap', target: 'ball', cooldown: 700, 'do': [{move: 'ball', by: [0, 8], ms: 150, await: true}, {move: 'ball', by: [0, -8], ms: 300}, {say: 'FB_FLOATS'}]},
    {on: 'drop', target: 'rock', when: {type: 'touching', a: 'rock', b: 'tank'}, unless: {type: 'touching', a: 'rock', b: 'ball'}, cooldown: 600, 'do': [{reset: 'rock'}, {say: 'FB_ROCK_ALONE'}]}
  ],
  win: {type: 'state', target: 'pair', key: 'made'},
  onWin: [{show: 'pball'}, {move: 'pball', to: [50, 96], ms: 700}, {move: 'pair', to: [50, 104], ms: 700, await: true}]
});
