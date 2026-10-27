// FASE 229 — ENCONTRE A ESTRELA · ela é tão grande que ocupa a tela toda: diminua o amarelo.
RULES.registerLevel({
  id: 229, chapter: 23,
  instruction: 'LEVEL_229_TITLE',
  hints: ['LEVEL_229_HINT_1', 'LEVEL_229_HINT_2', 'LEVEL_229_HINT_3'],
  objects: [
    {id: 'star', type: 'star', x: 50, y: 72, w: 16, scale: 24, z: 1, behaviors: {scalable: {min: 0.6, max: 24}}},
    {id: 'ball', type: 'ball', x: 26, y: 96, w: 10, z: 3, props: {color: 'blue'}},
    {id: 'cube', type: 'cube', x: 76, y: 40, w: 10, z: 3, props: {color: 'coral'}}
  ],
  reactions: [
    {on: 'tap', target: 'star', unless: {type: 'scale', target: 'star', max: 2.5}, 'do': [{forget: 'star'}, {say: 'FB_ALL_YELLOW'}]},
    {on: 'tap', target: 'ball', cooldown: 600, 'do': [{fx: 'shake'}, {fail: 'FB_HMM'}]},
    {on: 'tap', target: 'cube', cooldown: 600, 'do': [{fx: 'shake'}, {fail: 'FB_HMM'}]}
  ],
  win: [{type: 'tapped', target: 'star'}, {type: 'scale', target: 'star', max: 2.5}],
  onWin: [{fx: 'pop', target: 'star'}]
});
