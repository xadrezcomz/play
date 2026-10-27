// FASE 289 — TOQUE EM QUALQUER LUGAR MENOS NO X · o X ocupa o tabuleiro todo: toque fora dele, na frase lá em cima.
RULES.registerLevel({
  id: 289, chapter: 29,
  instruction: 'LEVEL_289_TITLE',
  hints: ['LEVEL_289_HINT_1', 'LEVEL_289_HINT_2', 'LEVEL_289_HINT_3'],
  objects: [
    {id: 'zone', type: 'outline', x: 50, y: 60, w: 98, h: 118, z: 1, passive: true, props: {color: 'coral'}},
    {id: 'x', type: 'xmark', x: 50, y: 60, w: 100, h: 120, z: 5}
  ],
  reactions: [
    {on: 'tap', target: 'x', cooldown: 400, 'do': [{fx: 'shake'}, {fail: 'FB_THATS_THE_X'}]},
    {on: 'tap', target: null, 'do': [{state: 'x', key: 'missed', value: true}]}
  ],
  win: {type: 'state', target: 'x', key: 'missed'},
  onWin: [{fx: 'pop', target: 'x'}]
});
