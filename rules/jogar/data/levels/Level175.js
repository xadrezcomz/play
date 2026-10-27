// FASE 175 — TOQUE NA MOEDA MAIS LEVE · as quatro parecem iguais; use a balança.
RULES.registerLevel({
  id: 175, chapter: 18,
  instruction: 'LEVEL_175_TITLE',
  hints: ['LEVEL_175_HINT_1', 'LEVEL_175_HINT_2', 'LEVEL_175_HINT_3'],
  objects: [
    {id: 'post', type: 'stick', x: 50, y: 78, w: 3, h: 36, z: 1, passive: true, props: {color: '#9AA0B4'}},
    {id: 'beam', type: 'plank', x: 50, y: 60, w: 64, h: 3, z: 2, passive: true, props: {color: '#7D8597'}, behaviors: {balance: {left: 'panL', right: 'panR', ids: ['c1', 'c2', 'c3', 'c4']}}},
    {id: 'panL', type: 'basket', x: 22, y: 68, w: 24, h: 16, z: 3, passive: true, behaviors: {container: {slots: [[-0.22, -0.3], [0.22, -0.3], [0, -0.3]]}}},
    {id: 'panR', type: 'basket', x: 78, y: 68, w: 24, h: 16, z: 3, passive: true, behaviors: {container: {slots: [[-0.22, -0.3], [0.22, -0.3], [0, -0.3]]}}},
    {id: 'c1', type: 'coin', x: 20, y: 104, w: 11, z: 5, props: {weight: 2}, behaviors: {draggable: {}}},
    {id: 'c2', type: 'coin', x: 40, y: 104, w: 11, z: 5, props: {weight: 2}, behaviors: {draggable: {}}},
    {id: 'c3', type: 'coin', x: 60, y: 104, w: 11, z: 5, props: {weight: 1}, behaviors: {draggable: {}}},
    {id: 'c4', type: 'coin', x: 80, y: 104, w: 11, z: 5, props: {weight: 2}, behaviors: {draggable: {}}}
  ],
  reactions: [
    {on: 'tap', target: 'c1', cooldown: 500, 'do': [{forget: 'c1'}, {fx: 'shake'}, {fail: 'FB_SAME_WEIGHT'}]},
    {on: 'tap', target: 'c2', cooldown: 500, 'do': [{forget: 'c2'}, {fx: 'shake'}, {fail: 'FB_SAME_WEIGHT'}]},
    {on: 'tap', target: 'c4', cooldown: 500, 'do': [{forget: 'c4'}, {fx: 'shake'}, {fail: 'FB_SAME_WEIGHT'}]}
  ],
  win: {type: 'tapped', target: 'c3'},
  onWin: [{fx: 'pop', target: 'c3'}]
});
