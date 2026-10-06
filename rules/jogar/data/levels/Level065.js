// FASE 65 — FAÇA 1 + 1 = 1 · duas gotas juntas viram uma só.
RULES.registerLevel({
  id: 65, chapter: 7,
  instruction: 'LEVEL_065_TITLE',
  hints: ['LEVEL_065_HINT_1', 'LEVEL_065_HINT_2', 'LEVEL_065_HINT_3'],
  objects: [
    { id: 'd3', type: 'drop', x: 50, y: 70, w: 20, h: 27, z: 4, hidden: true },
    { id: 'd1', type: 'drop', x: 26, y: 60, w: 13, h: 17, z: 5, behaviors: { draggable: {}, merge: { 'with': ['d2'], into: 'd3' } } },
    { id: 'd2', type: 'drop', x: 74, y: 82, w: 13, h: 17, z: 5, behaviors: { draggable: {}, merge: { 'with': ['d1'], into: 'd3' } } }
  ],
  win: { type: 'state', target: 'd3', key: 'made' },
  onWin: [{ fx: 'pop', target: 'd3' }]
});
