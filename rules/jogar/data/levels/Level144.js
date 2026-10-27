// FASE 144 — OS DOIS QUADRADOS SÃO IGUAIS? · parecem diferentes por causa do fundo; são iguais.
RULES.registerLevel({
  id: 144, chapter: 15,
  instruction: 'LEVEL_144_TITLE',
  hints: ['LEVEL_144_HINT_1', 'LEVEL_144_HINT_2', 'LEVEL_144_HINT_3'],
  objects: [
    {id: 'bgd', type: 'bar', x: 28, y: 62, w: 40, h: 46, z: 1, passive: true, props: {color: '#2B2D42'}},
    {id: 'bgl', type: 'bar', x: 72, y: 62, w: 40, h: 46, z: 1, passive: true, props: {color: '#FFFDF5'}},
    {id: 'q1', type: 'bar', x: 28, y: 62, w: 14, h: 14, z: 4, props: {color: '#8F8A99'}, behaviors: {draggable: {}}},
    {id: 'q2', type: 'bar', x: 72, y: 62, w: 14, h: 14, z: 4, props: {color: '#8F8A99'}, behaviors: {draggable: {}}},
    {id: 'yes', type: 'word', textKey: 'UI_YES', fontU: 7, x: 32, y: 102, z: 3, cls: 'card'},
    {id: 'no', type: 'word', textKey: 'UI_NO', fontU: 7, x: 68, y: 102, z: 3, cls: 'card'}
  ],
  reactions: [
    {on: 'tap', target: 'no', 'do': [{forget: 'no'}, {fx: 'shake'}, {fail: 'FB_LOOK_AGAIN'}]}
  ],
  win: {type: 'tapped', target: 'yes'},
  onWin: [{fx: 'pop', target: 'yes'}, {move: 'q1', to: [43, 62], ms: 300}, {move: 'q2', to: [57, 62], ms: 300}]
});
