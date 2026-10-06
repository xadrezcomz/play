// FASE 92 — LIGUE OS PONTOS · trace uma linha passando pelos números em ordem.
RULES.registerLevel({
  id: 92, chapter: 10,
  instruction: 'LEVEL_092_TITLE',
  hints: ['LEVEL_092_HINT_1', 'LEVEL_092_HINT_2', 'LEVEL_092_HINT_3'],
  draw: true,
  objects: [
    { id: 'star', type: 'star', x: 50, y: 64, w: 50, z: 1, hidden: true, passive: true },
    { id: 'd1', type: 'card', x: 50, y: 30, w: 8, h: 10, z: 3, passive: true, props: { n: 1 } },
    { id: 'd2', type: 'card', x: 72, y: 88, w: 8, h: 10, z: 3, passive: true, props: { n: 2 } },
    { id: 'd3', type: 'card', x: 20, y: 52, w: 8, h: 10, z: 3, passive: true, props: { n: 3 } },
    { id: 'd4', type: 'card', x: 80, y: 52, w: 8, h: 10, z: 3, passive: true, props: { n: 4 } },
    { id: 'd5', type: 'card', x: 28, y: 88, w: 8, h: 10, z: 3, passive: true, props: { n: 5 } },
    { id: 'pen', type: 'marker', x: 50, y: 0, w: 1, passive: true,
      behaviors: { connect: { dots: ['d1', 'd2', 'd3', 'd4', 'd5'], spawn: 'star', tol: 8 } } }
  ],
  win: { type: 'state', target: 'pen', key: 'done' },
  onWin: [{ fx: 'pop', target: 'star' }]
});
