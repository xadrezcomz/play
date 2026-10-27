// FASE 196 — TOQUE NA ÚLTIMA PALAVRA · é a última palavra da própria frase.
RULES.registerLevel({
  id: 196, chapter: 20,
  instruction: 'LEVEL_196_TITLE',
  hints: ['LEVEL_196_HINT_1', 'LEVEL_196_HINT_2', 'LEVEL_196_HINT_3'],
  objects: [
    {id: 'w_last', inText: true},
    {id: 'fim', type: 'word', textKey: 'LEVEL_196_A', fontU: 7, x: 50, y: 60, z: 3, cls: 'card'},
    {id: 'z', type: 'word', textKey: 'LEVEL_196_B', fontU: 7, x: 50, y: 88, z: 3, cls: 'card'}
  ],
  reactions: [
    {on: 'tap', target: 'fim', cooldown: 500, 'do': [{fx: 'shake'}, {fail: 'FB_LAST_OF_WHAT'}]},
    {on: 'tap', target: 'z', cooldown: 500, 'do': [{fx: 'shake'}, {fail: 'FB_LAST_OF_WHAT'}]}
  ],
  win: {type: 'tapped', target: 'w_last'},
  onWin: [{fx: 'pop', target: 'w_last'}]
});
