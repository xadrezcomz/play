// FASE 299 — NÃO TERMINE ESTA FASE · tire o NÃO da frase e depois aperte TERMINAR.
RULES.registerLevel({
  id: 299, chapter: 30,
  instruction: 'LEVEL_299_TITLE',
  hints: ['LEVEL_299_HINT_1', 'LEVEL_299_HINT_2', 'LEVEL_299_HINT_3'],
  objects: [
    {id: 'w_not', inText: true, behaviors: {draggable: {}}},
    {id: 'end', type: 'word', textKey: 'LEVEL_299_END', fontU: 8, x: 50, y: 72, z: 3, cls: 'card'}
  ],
  reactions: [
    {on: 'tap', target: 'end', unless: {type: 'text', target: 'w_not', mode: 'outside'}, 'do': [{forget: 'end'}, {fx: 'shake'}, {fail: 'FB_ALMOST_ENDED'}]}
  ],
  win: [{type: 'text', target: 'w_not', mode: 'outside'}, {type: 'tapped', target: 'end'}],
  onWin: [{fx: 'pop', target: 'end'}]
});
