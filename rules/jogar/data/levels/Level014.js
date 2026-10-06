// FASE 14 — FAÇA O SOL APARECER · tire a nuvem da frente.
RULES.registerLevel({
  id: 14, chapter: 2,
  instruction: 'LEVEL_014_TITLE',
  hints: ['LEVEL_014_HINT_1', 'LEVEL_014_HINT_2', 'LEVEL_014_HINT_3'],
  objects: [
    { id: 'sun', type: 'sun', x: 52, y: 44, w: 30, z: 2 },
    { id: 'cloud', type: 'cloud', x: 52, y: 47, w: 54, h: 32, z: 6, behaviors: { draggable: {} } },
    { id: 'flower', type: 'tree', x: 50, y: 100, w: 12, h: 20, z: 3, passive: true }
  ],
  reactions: [
    { on: 'tap', target: 'cloud', do: [{ fx: 'wobble' }, { sound: 'tap' }] }
  ],
  win: { type: 'not', of: { type: 'touching', a: 'cloud', b: 'sun', pad: -2 } },
  onWin: [{ fx: 'pop', target: 'sun' }]
});
