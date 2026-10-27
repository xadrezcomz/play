// FASE 281 — ARRUME O NÚMERO DA FASE · lá em cima está FASE 821: troque o 8 e o 2 de lugar.
RULES.registerLevel({
  id: 281, chapter: 29,
  instruction: 'LEVEL_281_TITLE',
  label: 'LEVEL_281_LABEL',
  hints: ['LEVEL_281_HINT_1', 'LEVEL_281_HINT_2', 'LEVEL_281_HINT_3'],
  objects: [
    {id: 'd1', inLabel: true, behaviors: {draggable: {}}},
    {id: 'd2', inLabel: true, behaviors: {draggable: {}}},
    {id: 'd3', inLabel: true, behaviors: {draggable: {}}},
    {id: 'n2', type: 'number', x: 30, y: 66, w: 16, z: 2, passive: true, props: {n: 2}},
    {id: 'n8', type: 'number', x: 50, y: 66, w: 16, z: 2, passive: true, props: {n: 8}},
    {id: 'n1', type: 'number', x: 70, y: 66, w: 16, z: 2, passive: true, props: {n: 1}},
    {id: 'sw', type: 'marker', x: 0, y: 0, w: 1, passive: true, behaviors: {wordSwap: {ids: ['d1', 'd2', 'd3'], tol: 3}}}
  ],
  win: [{type: 'wordText', target: 'd1', equals: '2'}, {type: 'wordText', target: 'd2', equals: '8'}, {type: 'wordText', target: 'd3', equals: '1'}],
  onWin: [{fx: 'pop', target: 'n8'}]
});
