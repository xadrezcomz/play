// FASE 01 — TOQUE NO CÍRCULO · ensina TAP.
RULES.registerLevel({
  id: 1, chapter: 1,
  instruction: 'LEVEL_001_TITLE',
  hints: ['LEVEL_001_HINT_1', 'LEVEL_001_HINT_2', 'LEVEL_001_HINT_3'],
  objects: [
    { id: 'circle', type: 'circle', x: 50, y: 58, w: 44, props: { color: 'coral' }, behaviors: { clickable: {} } }
  ],
  win: { type: 'tapped', target: 'circle' },
  onWin: [{ fx: 'pop', target: 'circle' }]
});
