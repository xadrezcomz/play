// FASE 141 — TOQUE NA PALAVRA AZUL · a palavra pintada de azul (é a palavra VERMELHO).
RULES.registerLevel({
  id: 141, chapter: 15,
  instruction: 'LEVEL_141_TITLE',
  hints: ['LEVEL_141_HINT_1', 'LEVEL_141_HINT_2', 'LEVEL_141_HINT_3'],
  objects: [
    {id: 'wr', type: 'word', textKey: 'COLOR_RED', fontU: 7, x: 30, y: 46, z: 3, cls: 'word-blue'},
    {id: 'wb', type: 'word', textKey: 'COLOR_BLUE', fontU: 7, x: 70, y: 46, z: 3, cls: 'word-yellow'},
    {id: 'wg', type: 'word', textKey: 'COLOR_GREEN', fontU: 7, x: 30, y: 80, z: 3, cls: 'word-red'},
    {id: 'wy', type: 'word', textKey: 'COLOR_YELLOW', fontU: 7, x: 70, y: 80, z: 3, cls: 'word-green'}
  ],
  reactions: [
    {on: 'tap', target: 'wb', 'do': [{forget: 'wb'}, {fx: 'shake'}, {fail: 'FB_THATS_YELLOW'}]},
    {on: 'tap', target: 'wg', 'do': [{fx: 'shake'}, {fail: 'FB_HMM'}]},
    {on: 'tap', target: 'wy', 'do': [{fx: 'shake'}, {fail: 'FB_HMM'}]}
  ],
  win: {type: 'tapped', target: 'wr'},
  onWin: [{fx: 'pop', target: 'wr'}]
});
