// FASE 171 — EQUILIBRE A BALANÇA · a estrela pesa 4: bola 1 + bola 1 + cubo 2.
RULES.registerLevel({
  id: 171, chapter: 18,
  instruction: 'LEVEL_171_TITLE',
  hints: ['LEVEL_171_HINT_1', 'LEVEL_171_HINT_2', 'LEVEL_171_HINT_3'],
  objects: [
    {id: 'post', type: 'stick', x: 50, y: 84, w: 3, h: 36, z: 1, passive: true, props: {color: '#9AA0B4'}},
    {id: 'beam', type: 'plank', x: 50, y: 66, w: 64, h: 3, z: 2, passive: true, props: {color: '#7D8597'}, behaviors: {balance: {left: 'panL', right: 'panR', ids: ['star', 'b1', 'b2', 'cube', 'feather']}}},
    {id: 'panL', type: 'basket', x: 22, y: 74, w: 24, h: 16, z: 3, passive: true, behaviors: {container: {slots: [[-0.22, -0.3], [0.22, -0.3], [0, -0.3]]}}},
    {id: 'panR', type: 'basket', x: 78, y: 74, w: 24, h: 16, z: 3, passive: true, behaviors: {container: {slots: [[-0.22, -0.3], [0.22, -0.3], [0, -0.3]]}}},
    {id: 'star', type: 'star', x: 22, y: 70, w: 13, z: 5, props: {weight: 4}},
    {id: 'b1', type: 'ball', x: 18, y: 104, w: 9, z: 5, props: {color: 'coral', weight: 1}, behaviors: {draggable: {}}},
    {id: 'b2', type: 'ball', x: 38, y: 104, w: 9, z: 5, props: {color: 'blue', weight: 1}, behaviors: {draggable: {}}},
    {id: 'cube', type: 'cube', x: 60, y: 104, w: 11, z: 5, props: {color: 'green', weight: 2}, behaviors: {draggable: {}}},
    {id: 'feather', type: 'feather', x: 82, y: 104, w: 6, h: 12, z: 5, props: {weight: 0}, behaviors: {draggable: {}}}
  ],
  win: [{type: 'balanced', left: 'panL', right: 'panR', ids: ['star', 'b1', 'b2', 'cube', 'feather']}, {type: 'inside', objects: ['star'], container: 'panL'}],
  onWin: [{fx: 'pop', target: 'beam'}]
});
