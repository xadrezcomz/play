// FASE 42 — COLOQUE A ESTRELA FORA DA CAIXA · cresça a estrela até a caixa ficar dentro dela.
RULES.registerLevel({
  id: 42, chapter: 5,
  instruction: 'LEVEL_042_TITLE',
  hints: ['LEVEL_042_HINT_1', 'LEVEL_042_HINT_2', 'LEVEL_042_HINT_3'],
  objects: [
    { id: 'star', type: 'star', x: 50, y: 59, w: 14, z: 3, behaviors: { scalable: { min: 1, max: 4.2 } } },
    { id: 'box', type: 'chest', x: 50, y: 72, w: 34, h: 31, z: 5, passive: true }
  ],
  win: { type: 'scale', target: 'star', min: 3.1 },
  onWin: [{ fx: 'pop', target: 'star' }]
});
