// FASE 172 — PESE O SACO DE 5 · com os pesos 1, 2 e 4: use o 1 e o 4.
RULES.registerLevel({
  id: 172, chapter: 18,
  instruction: 'LEVEL_172_TITLE',
  hints: ['LEVEL_172_HINT_1', 'LEVEL_172_HINT_2', 'LEVEL_172_HINT_3'],
  objects: [
    {id: 'post', type: 'stick', x: 50, y: 84, w: 3, h: 36, z: 1, passive: true, props: {color: '#9AA0B4'}},
    {id: 'beam', type: 'plank', x: 50, y: 66, w: 64, h: 3, z: 2, passive: true, props: {color: '#7D8597'}, behaviors: {balance: {left: 'panL', right: 'panR', ids: ['bag', 'w1', 'w2', 'w4']}}},
    {id: 'panL', type: 'basket', x: 22, y: 74, w: 24, h: 16, z: 3, passive: true, behaviors: {container: {slots: [[-0.22, -0.3], [0.22, -0.3], [0, -0.3]]}}},
    {id: 'panR', type: 'basket', x: 78, y: 74, w: 24, h: 16, z: 3, passive: true, behaviors: {container: {slots: [[-0.22, -0.3], [0.22, -0.3], [0, -0.3]]}}},
    {id: 'bag', type: 'number', x: 22, y: 70, w: 13, z: 5, props: {n: 5, weight: 5, color: 'coral'}},
    {id: 'w1', type: 'number', x: 26, y: 104, w: 11, z: 5, props: {n: 1, weight: 1, color: 'yellow'}, behaviors: {draggable: {}}},
    {id: 'w2', type: 'number', x: 50, y: 104, w: 11, z: 5, props: {n: 2, weight: 2, color: 'yellow'}, behaviors: {draggable: {}}},
    {id: 'w4', type: 'number', x: 74, y: 104, w: 11, z: 5, props: {n: 4, weight: 4, color: 'yellow'}, behaviors: {draggable: {}}}
  ],
  triggers: [
    {when: {type: 'inside', objects: ['w1', 'w2', 'w4'], container: 'panR'}, 'do': [{wait: 500}, {say: 'FB_TOO_HEAVY_SIDE'}]}
  ],
  win: {type: 'balanced', left: 'panL', right: 'panR', ids: ['bag', 'w1', 'w2', 'w4']},
  onWin: [{fx: 'pop', target: 'beam'}]
});
