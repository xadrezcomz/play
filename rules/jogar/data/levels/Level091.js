// FASE 91 — DESENHE UMA PONTE · trace uma linha de uma beirada até a outra.
RULES.registerLevel({
  id: 91, chapter: 10,
  instruction: 'LEVEL_091_TITLE',
  hints: ['LEVEL_091_HINT_1', 'LEVEL_091_HINT_2', 'LEVEL_091_HINT_3'],
  mascot: false,
  draw: true,
  objects: [
    { id: 'groundL', type: 'platform', x: 17, y: 108, w: 34, h: 24, z: 3, passive: true },
    { id: 'groundR', type: 'platform', x: 83, y: 108, w: 34, h: 24, z: 3, passive: true },
    { id: 'hole', type: 'hole', x: 50, y: 108, w: 32, h: 24, z: 1, passive: true, hitbox: { x: 50, y: 80, w: 32, h: 60 } },
    { id: 'edgeA', type: 'marker', x: 34, y: 97, w: 4, passive: true },
    { id: 'edgeB', type: 'marker', x: 66, y: 97, w: 4, passive: true },
    { id: 'bridge', type: 'plank', x: 50, y: 97, w: 34, h: 4, z: 4, hidden: true, passive: true },
    { id: 'pen', type: 'marker', x: 50, y: 0, w: 1, passive: true, behaviors: { drawZone: { from: 'edgeA', to: 'edgeB', spawn: 'bridge', tol: 12 } } },
    { id: 'ruli', type: 'ruli', x: 14, y: 86, w: 16, h: 19, z: 8,
      behaviors: { draggable: { axis: 'x', minX: 6, maxX: 94 }, fallsInto: { zones: ['hole'], safe: ['bridge'] }, character: {} } }
  ],
  reactions: [
    { on: 'fell', do: [{ fail: 'FB_OOPS' }] }
  ],
  win: { type: 'pos', target: 'ruli', minX: 72 },
  onWin: [{ expr: 'happy', target: 'ruli' }, { fx: 'hop', target: 'ruli' }]
});
