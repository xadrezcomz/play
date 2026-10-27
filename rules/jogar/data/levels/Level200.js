// FASE 200 — DEIXE A FRASE VERDADEIRA · ela diz que tem três palavras, mas tem cinco: tire duas (sem tirar o TRÊS).
RULES.registerLevel({
  id: 200, chapter: 20,
  instruction: 'LEVEL_200_TITLE',
  hints: ['LEVEL_200_HINT_1', 'LEVEL_200_HINT_2', 'LEVEL_200_HINT_3'],
  objects: [
    {id: 't1', inText: true, behaviors: {draggable: {}}},
    {id: 't2', inText: true, behaviors: {draggable: {}}},
    {id: 't3', inText: true, behaviors: {draggable: {}}},
    {id: 't4', inText: true, behaviors: {draggable: {}}},
    {id: 't5', inText: true, behaviors: {draggable: {}}},
    {id: 'trash', type: 'bin', x: 50, y: 92, w: 22, h: 28, z: 1, passive: true}
  ],
  triggers: [
    {when: [{type: 'wordsIn', ids: ['t1', 't2', 't3', 't4', 't5'], equals: 3}, {type: 'not', of: {type: 'wordsIn', ids: ['t4'], equals: 1}}], 'do': [{say: 'FB_NOT_TRUE'}]}
  ],
  win: [{type: 'wordsIn', ids: ['t1', 't2', 't3', 't4', 't5'], equals: 3}, {type: 'wordsIn', ids: ['t4'], equals: 1}],
  onWin: [{fx: 'pop', target: 't4'}]
});
