// FASE 08 — ENCHA O COPO · segure a jarra em cima do copo para ela inclinar.
RULES.registerLevel({
  id: 8, chapter: 1,
  instruction: 'LEVEL_008_TITLE',
  hints: ['LEVEL_008_HINT_1', 'LEVEL_008_HINT_2', 'LEVEL_008_HINT_3'],
  objects: [
    { id: 'cup', type: 'cup', x: 34, y: 96, w: 18, h: 23, z: 3, state: { fill: 0 } },
    { id: 'jug', type: 'jug', x: 70, y: 40, w: 26, h: 26, z: 6, behaviors: { draggable: {}, pourer: { target: 'cup', range: 16, rate: 0.5 } } }
  ],
  reactions: [
    { on: 'tap', target: 'cup', do: [{ fx: 'wobble' }, { sound: 'tap' }] },
    { on: 'tap', target: 'jug', do: [{ fx: 'wobble' }, { sound: 'tap' }] }
  ],
  win: { type: 'state', target: 'cup', key: 'full', equals: true },
  onWin: [{ fx: 'pop', target: 'cup' }]
});
