// FASE 199 — PONHA A FRASE EM ORDEM · as palavras da instrução estão embaralhadas; arraste cada uma para o seu lugar.
RULES.registerLevel({
  id: 199, chapter: 20,
  instruction: 'LEVEL_199_TITLE',
  hints: ['LEVEL_199_HINT_1', 'LEVEL_199_HINT_2', 'LEVEL_199_HINT_3'],
  objects: [
    {id: 's1', type: 'slot', x: 14, y: 84, w: 16, h: 10, z: 1, passive: true},
    {id: 's2', type: 'slot', x: 32, y: 84, w: 16, h: 10, z: 1, passive: true},
    {id: 's3', type: 'slot', x: 50, y: 84, w: 16, h: 10, z: 1, passive: true},
    {id: 's4', type: 'slot', x: 68, y: 84, w: 16, h: 10, z: 1, passive: true},
    {id: 's5', type: 'slot', x: 86, y: 84, w: 16, h: 10, z: 1, passive: true},
    {id: 'w1', inText: true, behaviors: {draggable: {}, snap: {to: ['s1', 's2', 's3', 's4', 's5'], tol: 9}}},
    {id: 'w2', inText: true, behaviors: {draggable: {}, snap: {to: ['s1', 's2', 's3', 's4', 's5'], tol: 9}}},
    {id: 'w3', inText: true, behaviors: {draggable: {}, snap: {to: ['s1', 's2', 's3', 's4', 's5'], tol: 9}}},
    {id: 'w4', inText: true, behaviors: {draggable: {}, snap: {to: ['s1', 's2', 's3', 's4', 's5'], tol: 9}}},
    {id: 'w5', inText: true, behaviors: {draggable: {}, snap: {to: ['s1', 's2', 's3', 's4', 's5'], tol: 9}}}
  ],
  win: [{type: 'state', target: 'w1', key: 'at', equals: 's1'}, {type: 'state', target: 'w2', key: 'at', equals: 's2'}, {type: 'state', target: 'w3', key: 'at', equals: 's3'}, {type: 'state', target: 'w4', key: 'at', equals: 's4'}, {type: 'state', target: 'w5', key: 'at', equals: 's5'}],
  onWin: [{fx: 'pop', target: 'w1'}, {fx: 'pop', target: 'w2'}, {fx: 'pop', target: 'w3'}, {fx: 'pop', target: 'w4'}, {fx: 'pop', target: 'w5'}]
});
