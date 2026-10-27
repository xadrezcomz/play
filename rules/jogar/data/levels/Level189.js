// FASE 189 — ACHE O ERRO NO ESPELHO · o reflexo da estrela está com a cor errada.
RULES.registerLevel({
  id: 189, chapter: 19,
  instruction: 'LEVEL_189_TITLE',
  hints: ['LEVEL_189_HINT_1', 'LEVEL_189_HINT_2', 'LEVEL_189_HINT_3'],
  objects: [
    {id: 'mid', type: 'mirrorline', x: 50, y: 66, w: 3, h: 60, z: 1, passive: true},
    {id: 'l_ball', type: 'ball', x: 22, y: 46, w: 12, z: 2, props: {color: 'coral'}},
    {id: 'r_ball', type: 'ball', x: 78, y: 46, w: 12, z: 2, props: {color: 'coral'}, cls: 'flipx'},
    {id: 'l_star', type: 'star', x: 22, y: 66, w: 12, z: 2, props: {color: 'yellow'}},
    {id: 'r_star', type: 'star', x: 78, y: 66, w: 12, z: 2, props: {color: 'blue'}, cls: 'flipx'},
    {id: 'l_cube', type: 'cube', x: 22, y: 86, w: 12, z: 2, props: {color: 'green'}},
    {id: 'r_cube', type: 'cube', x: 78, y: 86, w: 12, z: 2, props: {color: 'green'}, cls: 'flipx'},
    {id: 'l_apple', type: 'apple', x: 38, y: 66, w: 12, z: 2, props: {color: 'coral'}},
    {id: 'r_apple', type: 'apple', x: 62, y: 66, w: 12, z: 2, props: {color: 'coral'}, cls: 'flipx'}
  ],
  reactions: [
    {on: 'tap', target: 'l_ball', cooldown: 500, 'do': [{fx: 'shake'}, {fail: 'FB_SAME_IN_MIRROR'}]},
    {on: 'tap', target: 'r_ball', cooldown: 500, 'do': [{fx: 'shake'}, {fail: 'FB_SAME_IN_MIRROR'}]},
    {on: 'tap', target: 'l_star', cooldown: 500, 'do': [{fx: 'shake'}, {fail: 'FB_SAME_IN_MIRROR'}]},
    {on: 'tap', target: 'l_cube', cooldown: 500, 'do': [{fx: 'shake'}, {fail: 'FB_SAME_IN_MIRROR'}]},
    {on: 'tap', target: 'r_cube', cooldown: 500, 'do': [{fx: 'shake'}, {fail: 'FB_SAME_IN_MIRROR'}]},
    {on: 'tap', target: 'l_apple', cooldown: 500, 'do': [{fx: 'shake'}, {fail: 'FB_SAME_IN_MIRROR'}]},
    {on: 'tap', target: 'r_apple', cooldown: 500, 'do': [{fx: 'shake'}, {fail: 'FB_SAME_IN_MIRROR'}]}
  ],
  win: {type: 'tapped', target: 'r_star'},
  onWin: [{fx: 'pop', target: 'r_star'}]
});
