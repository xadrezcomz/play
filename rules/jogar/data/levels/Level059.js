// FASE 59 — TOQUE DO 1 AO 5 · só tem até o 4 no cenário; o 5 está no rótulo "FASE 59".
RULES.registerLevel({
  id: 59, chapter: 6,
  instruction: 'LEVEL_059_TITLE',
  label: 'LEVEL_059_LABEL',       // "FASE [[w_five|5]]9"
  hints: ['LEVEL_059_HINT_1', 'LEVEL_059_HINT_2', 'LEVEL_059_HINT_3'],
  objects: [
    { id: 'w_five', inLabel: true },
    { id: 'ctrl', type: 'marker', x: 50, y: 0, w: 1, passive: true,
      behaviors: { order: { seq: ['n1', 'n2', 'n3', 'n4', 'w_five'] } } },
    { id: 'n3', type: 'card', x: 24, y: 48, w: 16, h: 21, props: { n: 3 } },
    { id: 'n1', type: 'card', x: 70, y: 44, w: 16, h: 21, props: { n: 1 } },
    { id: 'n4', type: 'card', x: 36, y: 90, w: 16, h: 21, props: { n: 4 } },
    { id: 'n2', type: 'card', x: 76, y: 94, w: 16, h: 21, props: { n: 2 } }
  ],
  win: { type: 'state', target: 'ctrl', key: 'done' },
  onWin: [{ fx: 'pop', target: 'w_five' }]
});
