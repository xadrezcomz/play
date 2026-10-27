// FASE 105 — FAÇA UM 8 · só existem dois zeros; um em cima do outro vira 8.
RULES.registerLevel({
  id: 105, chapter: 11,
  instruction: 'LEVEL_105_TITLE',
  hints: ['LEVEL_105_HINT_1', 'LEVEL_105_HINT_2', 'LEVEL_105_HINT_3'],
  objects: [
    { id: 'z1', type: 'number', x: 30, y: 70, w: 22, h: 22, z: 3, props: { n: 0, plain: true, color: 'blue' }, behaviors: { draggable: {}, merge: { 'with': ['z2'], into: 'eight' } } },
    { id: 'z2', type: 'number', x: 70, y: 70, w: 22, h: 22, z: 3, props: { n: 0, plain: true, color: 'blue' }, behaviors: { draggable: {}, merge: { 'with': ['z1'], into: 'eight' } } },
    { id: 'eight', type: 'number', x: 50, y: 64, w: 36, z: 4, hidden: true, passive: true, props: { n: 8, plain: true, color: 'blue' } }
  ],
  win: { type: 'state', target: 'eight', key: 'made' },
  onWin: [{ fx: 'pop', target: 'eight' }]
});
