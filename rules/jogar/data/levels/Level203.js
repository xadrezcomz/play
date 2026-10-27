// FASE 203 — BATA A MASSA · farinha, ovo e leite na tigela; depois mexa (esfregue a tigela).
RULES.registerLevel({
  id: 203, chapter: 21,
  instruction: 'LEVEL_203_TITLE',
  hints: ['LEVEL_203_HINT_1', 'LEVEL_203_HINT_2', 'LEVEL_203_HINT_3'],
  objects: [
    {id: 'bowl', type: 'bowl', x: 50, y: 94, w: 36, h: 22, z: 2, state: {n: 0}, behaviors: {receives: {from: ['flour', 'egg', 'milk'], consume: true}, rubbable: {count: 12, set: {mixed: true}, requires: {n: 3}}}},
    {id: 'flour', type: 'flour', x: 20, y: 46, w: 14, h: 20, z: 4, behaviors: {draggable: {}}},
    {id: 'egg', type: 'egg', x: 50, y: 46, w: 11, h: 14, z: 4, behaviors: {draggable: {}}},
    {id: 'milk', type: 'milk', x: 80, y: 46, w: 11, h: 18, z: 4, behaviors: {draggable: {}}}
  ],
  reactions: [
    {on: 'used', target: 'bowl', 'do': [{add: 'bowl', key: 'n', by: 1}]},
    {on: 'rubdenied', target: 'bowl', 'do': [{say: 'FB_MISSING_INGREDIENT'}]}
  ],
  win: {type: 'state', target: 'bowl', key: 'mixed'},
  onWin: [{fx: 'squash', target: 'bowl'}]
});
