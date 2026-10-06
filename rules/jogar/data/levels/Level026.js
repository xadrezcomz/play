// FASE 26 — ORGANIZE DO MENOR PARA O MAIOR · 5 lugares, 3 objetos: as palavras completam.
RULES.registerLevel({
  id: 26, chapter: 3,
  instruction: 'LEVEL_026_TITLE',   // contém [[w_min|MENOR]] e [[w_max|MAIOR]]
  hints: ['LEVEL_026_HINT_1', 'LEVEL_026_HINT_2', 'LEVEL_026_HINT_3'],
  objects: [
    { id: 'p1', type: 'slot', x: 12, y: 92, w: 17, z: 1, passive: true, props: { color: 'purple' } },
    { id: 'p2', type: 'slot', x: 31, y: 92, w: 17, z: 1, passive: true, props: { color: 'purple' } },
    { id: 'p3', type: 'slot', x: 50, y: 92, w: 17, z: 1, passive: true, props: { color: 'purple' } },
    { id: 'p4', type: 'slot', x: 69, y: 92, w: 17, z: 1, passive: true, props: { color: 'purple' } },
    { id: 'p5', type: 'slot', x: 88, y: 92, w: 17, z: 1, passive: true, props: { color: 'purple' } },
    { id: 'big', type: 'circle', x: 24, y: 40, w: 15, props: { color: 'coral' }, behaviors: { draggable: {}, snap: { to: ['p1', 'p2', 'p3', 'p4', 'p5'], tol: 10 } } },
    { id: 'small', type: 'circle', x: 52, y: 32, w: 6, props: { color: 'coral' }, behaviors: { draggable: {}, snap: { to: ['p1', 'p2', 'p3', 'p4', 'p5'], tol: 10 } } },
    { id: 'mid', type: 'circle', x: 76, y: 46, w: 10, props: { color: 'coral' }, behaviors: { draggable: {}, snap: { to: ['p1', 'p2', 'p3', 'p4', 'p5'], tol: 10 } } },
    { id: 'w_min', inText: true, behaviors: { draggable: {}, snap: { to: ['p1', 'p2', 'p3', 'p4', 'p5'], tol: 10, fitScale: 1 } } },
    { id: 'w_max', inText: true, behaviors: { draggable: {}, snap: { to: ['p1', 'p2', 'p3', 'p4', 'p5'], tol: 10, fitScale: 1 } } }
  ],
  triggers: [
    { when: [{ type: 'state', target: 'small', key: 'at', truthy: true }, { type: 'state', target: 'mid', key: 'at', truthy: true }, { type: 'state', target: 'big', key: 'at', truthy: true }],
      do: [{ wait: 300 }, { fail: 'FB_ALMOST' }, { wait: 1200 }, { fx: 'wiggle', target: 'w_min' }, { fx: 'wiggle', target: 'w_max' }] }
  ],
  win: [
    { type: 'state', target: 'w_min', key: 'at', equals: 'p1' },
    { type: 'state', target: 'small', key: 'at', equals: 'p2' },
    { type: 'state', target: 'mid', key: 'at', equals: 'p3' },
    { type: 'state', target: 'big', key: 'at', equals: 'p4' },
    { type: 'state', target: 'w_max', key: 'at', equals: 'p5' }
  ],
  onWin: [{ fx: 'pop', target: 'small' }, { wait: 80 }, { fx: 'pop', target: 'mid' }, { wait: 80 }, { fx: 'pop', target: 'big' }]
});
