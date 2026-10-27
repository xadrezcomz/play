// FASE 107 — TOQUE DO MENOR PARA O MAIOR · o menor é o 0: o "O" da própria frase.
RULES.registerLevel({
  id: 107, chapter: 11,
  instruction: 'LEVEL_107_TITLE',   // a letra O vira [[w0|O]]
  hints: ['LEVEL_107_HINT_1', 'LEVEL_107_HINT_2', 'LEVEL_107_HINT_3'],
  objects: [
    { id: 'w0', inText: true },
    { id: 'n2', type: 'number', x: 24, y: 60, w: 18, z: 3, props: { n: 2, color: 'yellow' } },
    { id: 'n3', type: 'number', x: 76, y: 52, w: 18, z: 3, props: { n: 3, color: 'teal' } },
    { id: 'n1', type: 'number', x: 50, y: 90, w: 18, z: 3, props: { n: 1, color: 'coral' } },
    { id: 'seq', type: 'marker', x: 0, y: 0, w: 1, passive: true, behaviors: { order: { seq: ['w0', 'n1', 'n2', 'n3'], failSay: 'FB_SMALLER' } } }
  ],
  win: { type: 'state', target: 'seq', key: 'done' },
  onWin: [{ fx: 'pop', target: 'n3' }]
});
