// FASE 32 — ATRAVESSE A PONTE · a ponte é curta: estique-a para o lado.
RULES.registerLevel({
  id: 32, chapter: 4,
  instruction: 'LEVEL_032_TITLE',
  hints: ['LEVEL_032_HINT_1', 'LEVEL_032_HINT_2', 'LEVEL_032_HINT_3'],
  mascot: false,
  objects: [
    { id: 'groundL', type: 'platform', x: 18, y: 108, w: 36, h: 24, z: 3, passive: true },
    { id: 'groundR', type: 'platform', x: 82, y: 108, w: 36, h: 24, z: 3, passive: true },
    { id: 'hole', type: 'hole', x: 50, y: 108, w: 28, h: 24, z: 1, passive: true, hitbox: { x: 50, y: 80, w: 28, h: 60 } },
    { id: 'bridge', type: 'plank', x: 43, y: 97, w: 14, h: 4, z: 4,
      behaviors: { scalable: { axis: 'x', anchor: 'left', min: 1, max: 2.6 } } },
    { id: 'ruli', type: 'ruli', x: 16, y: 86, w: 16, h: 19, z: 8,
      behaviors: { draggable: { axis: 'x', minX: 6, maxX: 94 }, fallsInto: { zones: ['hole'], safe: ['bridge'] }, character: {} } }
  ],
  reactions: [
    { on: 'fell', do: [{ fail: 'FB_OOPS' }] },
    { on: 'tap', target: 'bridge', do: [{ fx: 'wobble' }, { sound: 'tap' }] }
  ],
  win: { type: 'pos', target: 'ruli', minX: 72 },
  onWin: [{ expr: 'happy', target: 'ruli' }, { fx: 'hop', target: 'ruli' }]
});
