// FASE 62 — USE A PONTE · não há ponte; a palavra PONTE vira uma em cima do rio.
RULES.registerLevel({
  id: 62, chapter: 7,
  instruction: 'LEVEL_062_TITLE',   // contém [[w_bridge|PONTE]]
  hints: ['LEVEL_062_HINT_1', 'LEVEL_062_HINT_2', 'LEVEL_062_HINT_3'],
  mascot: false,
  objects: [
    { id: 'w_bridge', inText: true, behaviors: { draggable: {} } },
    { id: 'groundL', type: 'platform', x: 18, y: 108, w: 36, h: 24, z: 3, passive: true },
    { id: 'groundR', type: 'platform', x: 82, y: 108, w: 36, h: 24, z: 3, passive: true },
    { id: 'river', type: 'tank', x: 50, y: 110, w: 28, h: 20, z: 1, state: { level: 0.7 }, hitbox: { x: 50, y: 85, w: 28, h: 60 },
      behaviors: { receives: { from: ['w_bridge'], set: { bridged: true }, consume: true } } },
    { id: 'bridge', type: 'plank', x: 50, y: 97, w: 30, h: 4, z: 4, hidden: true, passive: true },
    { id: 'ruli', type: 'ruli', x: 16, y: 86, w: 16, h: 19, z: 8,
      behaviors: { draggable: { axis: 'x', minX: 6, maxX: 94 }, fallsInto: { zones: ['river'], safe: ['bridge'] }, character: {} } }
  ],
  reactions: [
    { on: 'fell', do: [{ fail: 'FB_SPLASH' }] },
    { on: 'used', target: 'river', do: [{ show: 'bridge' }] }
  ],
  win: { type: 'pos', target: 'ruli', minX: 72 },
  onWin: [{ expr: 'happy', target: 'ruli' }, { fx: 'hop', target: 'ruli' }]
});
