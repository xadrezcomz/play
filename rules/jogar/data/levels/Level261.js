// FASE 261 — TOQUE EM TUDO MENOS NA ESTRELA · toque nos outros quatro.
RULES.registerLevel({
  id: 261, chapter: 27,
  instruction: 'LEVEL_261_TITLE',
  hints: ['LEVEL_261_HINT_1', 'LEVEL_261_HINT_2', 'LEVEL_261_HINT_3'],
  objects: [
    {id: 'ball', type: 'ball', x: 22, y: 50, w: 14, z: 2, props: {color: 'blue'}},
    {id: 'cube', type: 'cube', x: 78, y: 50, w: 14, z: 2, props: {color: 'green'}},
    {id: 'apple', type: 'apple', x: 22, y: 92, w: 14, z: 2, props: {color: 'coral'}},
    {id: 'star', type: 'star', x: 78, y: 92, w: 14, z: 2, props: {color: 'yellow'}},
    {id: 'heart', type: 'heart', x: 50, y: 72, w: 14, z: 2, props: {color: 'pink'}}
  ],
  reactions: [
    {on: 'tap', target: 'star', 'do': [{fx: 'shake'}, {fail: 'FB_NOT_THE_STAR'}, {forget: 'ball'}, {forget: 'cube'}, {forget: 'apple'}, {forget: 'star'}, {forget: 'heart'}, {cls: 'ball', remove: 'faint'}, {cls: 'cube', remove: 'faint'}, {cls: 'apple', remove: 'faint'}, {cls: 'star', remove: 'faint'}, {cls: 'heart', remove: 'faint'}]},
    {on: 'tap', target: 'ball', 'do': [{fx: 'pop'}, {cls: 'ball', add: 'faint'}]},
    {on: 'tap', target: 'cube', 'do': [{fx: 'pop'}, {cls: 'cube', add: 'faint'}]},
    {on: 'tap', target: 'apple', 'do': [{fx: 'pop'}, {cls: 'apple', add: 'faint'}]},
    {on: 'tap', target: 'heart', 'do': [{fx: 'pop'}, {cls: 'heart', add: 'faint'}]}
  ],
  win: [{type: 'tapped', target: 'ball'}, {type: 'tapped', target: 'cube'}, {type: 'tapped', target: 'apple'}, {type: 'tapped', target: 'heart'}, {type: 'not', of: {type: 'tapped', target: 'star'}}],
  onWin: [{fx: 'hop', target: 'star'}]
});
