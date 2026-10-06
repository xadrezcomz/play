// FASE 83 — ACHE A CHAVE NO ESCURO · use a lanterna.
RULES.registerLevel({
  id: 83, chapter: 9,
  instruction: 'LEVEL_083_TITLE',
  hints: ['LEVEL_083_HINT_1', 'LEVEL_083_HINT_2', 'LEVEL_083_HINT_3'],
  objects: [
    { id: 'c1', type: 'cube', x: 24, y: 44, w: 14, z: 2, props: { color: 'blue' } },
    { id: 'c2', type: 'ball', x: 70, y: 56, w: 12, z: 2, props: { color: 'yellow' } },
    { id: 'c3', type: 'star', x: 30, y: 92, w: 13, z: 2 },
    { id: 'key', type: 'key', x: 78, y: 98, w: 12, h: 6, z: 2, behaviors: { clickable: {} } },
    { id: 'dark', type: 'dark', x: 50, y: 64, w: 104, h: 104, z: 50, passive: true },
    { id: 'lamp', type: 'flashlight', x: 50, y: 66, w: 9, h: 15, z: 60, behaviors: { draggable: {}, spotlight: { target: 'dark', radius: 15 } } }
  ],
  win: { type: 'tapped', target: 'key' },
  onWin: [{ fx: 'pop', target: 'key' }]
});
