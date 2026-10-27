// FASE 197 — OBEDEÇA A PLACA · a placa diz NINGUÉM TOCA EM NADA: espere.
RULES.registerLevel({
  id: 197, chapter: 20,
  instruction: 'LEVEL_197_TITLE',
  hints: ['LEVEL_197_HINT_1', 'LEVEL_197_HINT_2', 'LEVEL_197_HINT_3'],
  objects: [
    {id: 'post', type: 'stick', x: 50, y: 86, w: 3, h: 40, z: 1, passive: true, props: {color: 'wood'}},
    {id: 'sign', type: 'paper', x: 50, y: 58, w: 62, h: 30, z: 2, passive: true, props: {blank: true}},
    {id: 'msg1', type: 'word', textKey: 'LEVEL_197_A', fontU: 5.5, x: 50, y: 52, z: 3, passive: true},
    {id: 'msg2', type: 'word', textKey: 'LEVEL_197_B', fontU: 5.5, x: 50, y: 64, z: 3, passive: true},
    {id: 'star', type: 'star', x: 20, y: 100, w: 12, z: 3, behaviors: {draggable: {}}}
  ],
  triggers: [
    {when: {type: 'idle', seconds: 2}, 'do': [{say: 'FB_GOOD'}]}
  ],
  win: {type: 'idle', seconds: 4},
  onWin: [{fx: 'pop', target: 'sign'}]
});
