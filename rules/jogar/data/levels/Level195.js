// FASE 195 — TOQUE NA PALAVRA MAIS LONGA · a mais longa é PALAVRA, na própria frase.
RULES.registerLevel({
  id: 195, chapter: 20,
  instruction: 'LEVEL_195_TITLE',
  hints: ['LEVEL_195_HINT_1', 'LEVEL_195_HINT_2', 'LEVEL_195_HINT_3'],
  objects: [
    {id: 'w_long', inText: true},
    {id: 'a', type: 'word', textKey: 'LEVEL_195_A', fontU: 7, x: 28, y: 50, z: 3, cls: 'card'},
    {id: 'b', type: 'word', textKey: 'LEVEL_195_B', fontU: 7, x: 72, y: 50, z: 3, cls: 'card'},
    {id: 'c', type: 'word', textKey: 'LEVEL_195_C', fontU: 7, x: 50, y: 80, z: 3, cls: 'card huge-word'}
  ],
  reactions: [
    {on: 'tap', target: 'a', cooldown: 500, 'do': [{fx: 'shake'}, {fail: 'FB_COUNT_LETTERS'}]},
    {on: 'tap', target: 'b', cooldown: 500, 'do': [{fx: 'shake'}, {fail: 'FB_COUNT_LETTERS'}]},
    {on: 'tap', target: 'c', cooldown: 500, 'do': [{fx: 'shake'}, {fail: 'FB_COUNT_LETTERS'}]}
  ],
  win: {type: 'tapped', target: 'w_long'},
  onWin: [{fx: 'pop', target: 'w_long'}]
});
