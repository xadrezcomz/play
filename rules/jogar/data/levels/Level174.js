// FASE 174 — LEVANTE A PEDRA · é uma alavanca: coloque peso na outra ponta (o Ruli e a bola).
RULES.registerLevel({
  id: 174, chapter: 18,
  instruction: 'LEVEL_174_TITLE',
  hints: ['LEVEL_174_HINT_1', 'LEVEL_174_HINT_2', 'LEVEL_174_HINT_3'],
  objects: [
    {id: 'fulcrum', type: 'triangle', x: 50, y: 100, w: 12, h: 11, z: 1, passive: true, props: {color: '#7D8597'}},
    {id: 'beam', type: 'plank', x: 50, y: 93, w: 76, h: 3, z: 2, passive: true, behaviors: {balance: {left: 'zl', right: 'zr', ids: ['rock', 'ruli', 'ball']}}},
    {id: 'zl', type: 'marker', x: 24, y: 84, w: 26, h: 16, z: 0, passive: true},
    {id: 'zr', type: 'marker', x: 76, y: 84, w: 26, h: 16, z: 0, passive: true},
    {id: 'ground', type: 'platform', x: 50, y: 113, w: 100, h: 14, z: 1, passive: true},
    {id: 'rock', type: 'rock', x: 22, y: 85, w: 18, h: 12, z: 4, props: {weight: 2}},
    {id: 'ruli', type: 'ruli', x: 30, y: 52, w: 13, h: 15, z: 5, props: {weight: 2}, behaviors: {draggable: {}, character: {}}},
    {id: 'ball', type: 'ball', x: 70, y: 50, w: 9, z: 5, props: {weight: 1, color: 'coral'}, behaviors: {draggable: {}}}
  ],
  reactions: [
    {on: 'tap', target: 'rock', cooldown: 700, 'do': [{fx: 'shake'}, {say: 'FB_HEAVY'}]}
  ],
  win: {type: 'state', target: 'beam', key: 'diff', max: -0.5},
  onWin: [{expr: 'happy', target: 'ruli'}]
});
