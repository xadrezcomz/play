// FASE 264 — AQUI, SIM É NÃO. VOCÊ QUER PASSAR DE FASE? · toque em NÃO.
RULES.registerLevel({
  id: 264, chapter: 27,
  instruction: 'LEVEL_264_TITLE',
  hints: ['LEVEL_264_HINT_1', 'LEVEL_264_HINT_2', 'LEVEL_264_HINT_3'],
  objects: [
    {id: 'yes', type: 'word', textKey: 'UI_YES', fontU: 9, x: 30, y: 72, z: 3, cls: 'card'},
    {id: 'no', type: 'word', textKey: 'UI_NO', fontU: 9, x: 70, y: 72, z: 3, cls: 'card'}
  ],
  reactions: [
    {on: 'tap', target: 'yes', 'do': [{forget: 'yes'}, {fx: 'shake'}, {fail: 'FB_YES_IS_NO'}]}
  ],
  win: {type: 'tapped', target: 'no'},
  onWin: [{fx: 'pop', target: 'no'}]
});
