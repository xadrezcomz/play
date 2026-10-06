// FASE 45 — FAÇA RULI CHEGAR MAIS ALTO · empilhe as caixas e suba o Ruli nelas.
(function () {
  var solids = ['ground', 'b1', 'b2', 'b3'], boxSolids = solids.concat('ruli');
  RULES.registerLevel({
    id: 45, chapter: 5,
    instruction: 'LEVEL_045_TITLE',
    hints: ['LEVEL_045_HINT_1', 'LEVEL_045_HINT_2', 'LEVEL_045_HINT_3'],
    mascot: false,
    objects: [
      { id: 'ground', type: 'platform', x: 50, y: 112, w: 100, h: 16, z: 1, passive: true },
      { id: 'star', type: 'star', x: 50, y: 36, w: 12, z: 2, passive: true },
      { id: 'steps', type: 'plank', x: 88, y: 100, w: 12, h: 8, z: 2, passive: true, props: { color: '#C9B79F' } },
      { id: 'b1', type: 'cube', x: 20, y: 96, w: 16, z: 4, props: { color: 'blue' }, behaviors: { draggable: {}, gravity: { solids: boxSolids } } },
      { id: 'b2', type: 'cube', x: 50, y: 96, w: 16, z: 4, props: { color: 'yellow' }, behaviors: { draggable: {}, gravity: { solids: boxSolids } } },
      { id: 'b3', type: 'cube', x: 74, y: 96, w: 16, z: 4, props: { color: 'coral' }, behaviors: { draggable: {}, gravity: { solids: boxSolids } } },
      { id: 'ruli', type: 'ruli', x: 34, y: 95, w: 15, h: 18, z: 8, behaviors: { draggable: {}, gravity: { solids: solids }, character: {} } }
    ],
    win: [{ type: 'touching', a: 'ruli', b: 'star' }, { type: 'state', target: 'ruli', key: 'landed' }],
    onWin: [{ expr: 'happy', target: 'ruli' }, { fx: 'pop', target: 'star' }]
  });
})();
