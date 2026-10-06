// FASE 38 — JUNTE OS IGUAIS · só se juntam quando ficam do mesmo tamanho.
RULES.registerLevel({
  id: 38, chapter: 4,
  instruction: 'LEVEL_038_TITLE',
  hints: ['LEVEL_038_HINT_1', 'LEVEL_038_HINT_2', 'LEVEL_038_HINT_3'],
  objects: [
    { id: 'c3', type: 'circle', x: 50, y: 60, w: 22, hidden: true, props: { color: 'teal' } },
    { id: 'c1', type: 'circle', x: 26, y: 48, w: 12, props: { color: 'teal' },
      behaviors: { draggable: {}, scalable: { min: 0.4, max: 3 }, merge: { 'with': ['c2'], into: 'c3', sameSize: true, keepScale: true } } },
    { id: 'c2', type: 'circle', x: 70, y: 82, w: 32, props: { color: 'teal' },
      behaviors: { draggable: {}, scalable: { min: 0.3, max: 2 }, merge: { 'with': ['c1'], into: 'c3', sameSize: true, keepScale: true } } }
  ],
  win: { type: 'state', target: 'c3', key: 'made' },
  onWin: [{ fx: 'pop', target: 'c3' }]
});
