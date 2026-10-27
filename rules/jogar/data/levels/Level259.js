// FASE 259 — ACHE A FORMIGA · ela é minúscula: use a lupa.
RULES.registerLevel({
  id: 259, chapter: 26,
  instruction: 'LEVEL_259_TITLE',
  hints: ['LEVEL_259_HINT_1', 'LEVEL_259_HINT_2', 'LEVEL_259_HINT_3'],
  objects: [
    {id: 'leaf', type: 'leaf', x: 30, y: 70, w: 30, h: 21, z: 1, passive: true, props: {color: 'green'}},
    {id: 'rockx', type: 'rock', x: 70, y: 86, w: 22, h: 15, z: 1, passive: true},
    {id: 'ant', type: 'ant', x: 76, y: 56, w: 2.4, h: 1.5, z: 6},
    {id: 'lens', type: 'lens', x: 30, y: 40, w: 22, z: 5, behaviors: {draggable: {}, magnify: {targets: ['ant'], radius: 12, scale: 4}}}
  ],
  reactions: [
    {on: 'tap', target: null, cooldown: 900, 'do': [{say: 'FB_TOO_SMALL'}]}
  ],
  win: {type: 'tapped', target: 'ant'},
  onWin: [{fx: 'hop', target: 'ant'}]
});
