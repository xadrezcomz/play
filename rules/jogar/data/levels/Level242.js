// FASE 242 — COMPLETE O QUADRADO · toda linha e coluna soma 15: falta o 5 no meio.
RULES.registerLevel({
  id: 242, chapter: 25,
  instruction: 'LEVEL_242_TITLE',
  hints: ['LEVEL_242_HINT_1', 'LEVEL_242_HINT_2', 'LEVEL_242_HINT_3'],
  objects: [
    {id: 'g0', type: 'number', x: 30, y: 42, w: 16, z: 3, props: {n: 2}, passive: true},
    {id: 'g1', type: 'number', x: 50, y: 42, w: 16, z: 3, props: {n: 7}, passive: true},
    {id: 'g2', type: 'number', x: 70, y: 42, w: 16, z: 3, props: {n: 6}, passive: true},
    {id: 'g3', type: 'number', x: 30, y: 62, w: 16, z: 3, props: {n: 9}, passive: true},
    {id: 'mid', type: 'number', x: 50, y: 62, w: 16, z: 3, state: {n: 0}, props: {color: 'teal'}, behaviors: {cycle: {}}},
    {id: 'g5', type: 'number', x: 70, y: 62, w: 16, z: 3, props: {n: 1}, passive: true},
    {id: 'g6', type: 'number', x: 30, y: 82, w: 16, z: 3, props: {n: 4}, passive: true},
    {id: 'g7', type: 'number', x: 50, y: 82, w: 16, z: 3, props: {n: 3}, passive: true},
    {id: 'g8', type: 'number', x: 70, y: 82, w: 16, z: 3, props: {n: 8}, passive: true},
    {id: 'hint15', type: 'word', textKey: 'LEVEL_242_SUM', fontU: 5, x: 50, y: 104, z: 2, passive: true, cls: 'sign'}
  ],
  win: {type: 'state', target: 'mid', key: 'n', equals: 5},
  onWin: [{fx: 'pop', target: 'mid'}]
});
