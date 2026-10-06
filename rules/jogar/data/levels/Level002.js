// FASE 02 — LEVE A BOLA ATÉ A CAIXA · ensina DRAG.
RULES.registerLevel({
  id: 2, chapter: 1,
  instruction: 'LEVEL_002_TITLE',
  hints: ['LEVEL_002_HINT_1', 'LEVEL_002_HINT_2', 'LEVEL_002_HINT_3'],
  objects: [
    { id: 'box', type: 'box', x: 72, y: 88, w: 40, h: 32, z: 5, behaviors: { container: {} } },
    { id: 'ball', type: 'ball', x: 26, y: 38, w: 20, props: { color: 'blue' }, behaviors: { draggable: {} } }
  ],
  reactions: [
    { on: 'tap', target: 'ball', do: [{ fx: 'hop' }, { sound: 'tap' }] },
    { on: 'tap', target: 'box', do: [{ fx: 'squash' }, { sound: 'tap' }] }
  ],
  win: { type: 'inside', objects: ['ball'], container: 'box' },
  onWin: [{ fx: 'pop', target: 'box' }]
});
