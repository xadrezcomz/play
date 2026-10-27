// FASE 285 — QUE FASE É ESTA? · o número sumiu; a anterior foi a 284.
RULES.registerLevel({
  id: 285, chapter: 29,
  instruction: 'LEVEL_285_TITLE',
  label: 'LEVEL_285_LABEL',
  hints: ['LEVEL_285_HINT_1', 'LEVEL_285_HINT_2', 'LEVEL_285_HINT_3'],
  objects: [
    {id: 'q', inLabel: true},
    {id: 'd1', type: 'number', x: 30, y: 70, w: 16, z: 3, state: {n: 0}, behaviors: {cycle: {}}},
    {id: 'd2', type: 'number', x: 50, y: 70, w: 16, z: 3, state: {n: 0}, behaviors: {cycle: {}}},
    {id: 'd3', type: 'number', x: 70, y: 70, w: 16, z: 3, state: {n: 0}, behaviors: {cycle: {}}}
  ],
  win: [{type: 'state', target: 'd1', key: 'n', equals: 2}, {type: 'state', target: 'd2', key: 'n', equals: 8}, {type: 'state', target: 'd3', key: 'n', equals: 5}],
  onWin: [{setText: 'q', key: 'LEVEL_285_NUM'}, {fx: 'pop', target: 'd3'}]
});
