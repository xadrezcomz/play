// FASE 244 — QUAL NÃO COMBINA? · sol, lua e estrela ficam no céu; o peixe não.
RULES.registerLevel({
  id: 244, chapter: 25,
  instruction: 'LEVEL_244_TITLE',
  hints: ['LEVEL_244_HINT_1', 'LEVEL_244_HINT_2', 'LEVEL_244_HINT_3'],
  objects: [
    {id: 'sun', type: 'sun', x: 20, y: 66, w: 14, h: 14, z: 2},
    {id: 'moon', type: 'moon', x: 40, y: 66, w: 14, h: 14, z: 2},
    {id: 'star', type: 'star', x: 60, y: 66, w: 14, h: 14, z: 2},
    {id: 'fish', type: 'fish', x: 80, y: 66, w: 14, h: 8.4, z: 2}
  ],
  reactions: [
    {on: 'tap', target: 'sun', cooldown: 500, 'do': [{fx: 'shake'}, {fail: 'FB_THINK_AGAIN'}]},
    {on: 'tap', target: 'moon', cooldown: 500, 'do': [{fx: 'shake'}, {fail: 'FB_THINK_AGAIN'}]},
    {on: 'tap', target: 'star', cooldown: 500, 'do': [{fx: 'shake'}, {fail: 'FB_THINK_AGAIN'}]}
  ],
  win: {type: 'tapped', target: 'fish'},
  onWin: [{fx: 'hop', target: 'fish'}]
});
