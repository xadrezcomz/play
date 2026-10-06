// FASE 66 — ESCREVA O NOME DISTO · monte a palavra com as letras certas.
(function () {
  var slots = ['s1', 's2', 's3'];
  RULES.registerLevel({
    id: 66, chapter: 7,
    instruction: 'LEVEL_066_TITLE',
    hints: ['LEVEL_066_HINT_1', 'LEVEL_066_HINT_2', 'LEVEL_066_HINT_3'],
    objects: [
      { id: 'sun', type: 'sun', x: 50, y: 34, w: 24, z: 2, passive: true },
      { id: 's1', type: 'outline', x: 32, y: 70, w: 15, h: 18, z: 1, passive: true },
      { id: 's2', type: 'outline', x: 50, y: 70, w: 15, h: 18, z: 1, passive: true },
      { id: 's3', type: 'outline', x: 68, y: 70, w: 15, h: 18, z: 1, passive: true },
      { id: 'a', type: 'word', textKey: 'LEVEL_066_A', fontU: 10, cls: 'card', x: 52, y: 98, z: 4, behaviors: { draggable: {}, snap: { to: slots, tol: 9 } } },
      { id: 'b', type: 'word', textKey: 'LEVEL_066_B', fontU: 10, cls: 'card', x: 14, y: 98, z: 4, behaviors: { draggable: {}, snap: { to: slots, tol: 9 } } },
      { id: 'c', type: 'word', textKey: 'LEVEL_066_C', fontU: 10, cls: 'card', x: 71, y: 98, z: 4, behaviors: { draggable: {}, snap: { to: slots, tol: 9 } } },
      { id: 'x1', type: 'word', textKey: 'LEVEL_066_X1', fontU: 10, cls: 'card', x: 33, y: 98, z: 4, behaviors: { draggable: {}, snap: { to: slots, tol: 9 } } },
      { id: 'x2', type: 'word', textKey: 'LEVEL_066_X2', fontU: 10, cls: 'card', x: 90, y: 98, z: 4, behaviors: { draggable: {}, snap: { to: slots, tol: 9 } } }
    ],
    win: [
      { type: 'state', target: 'a', key: 'at', equals: 's1' },
      { type: 'state', target: 'b', key: 'at', equals: 's2' },
      { type: 'state', target: 'c', key: 'at', equals: 's3' }
    ],
    onWin: [{ fx: 'pop', target: 'sun' }]
  });
})();
