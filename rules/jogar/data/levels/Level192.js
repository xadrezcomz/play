// FASE 192 — ACORDE O RULI · tocar não adianta; leve a palavra ACORDE até ele.
RULES.registerLevel({
  id: 192, chapter: 20,
  instruction: 'LEVEL_192_TITLE',
  hints: ['LEVEL_192_HINT_1', 'LEVEL_192_HINT_2', 'LEVEL_192_HINT_3'],
  objects: [
    {id: 'w_wake', inText: true, behaviors: {draggable: {}}},
    {id: 'bed', type: 'cushion', x: 50, y: 96, w: 50, h: 16, z: 1, passive: true},
    {id: 'ruli', type: 'ruli', x: 50, y: 82, w: 18, h: 20, z: 3, state: {expr: 'sleepy'}, behaviors: {receives: {from: ['w_wake'], consume: true, set: {awake: true}}}}
  ],
  reactions: [
    {on: 'tap', target: 'ruli', cooldown: 700, 'do': [{fx: 'squash'}, {say: 'FB_ZZZ'}]}
  ],
  win: {type: 'state', target: 'ruli', key: 'awake'},
  onWin: [{expr: 'surprised', target: 'ruli'}, {fx: 'hop', target: 'ruli'}, {wait: 400}, {expr: 'happy', target: 'ruli'}]
});
