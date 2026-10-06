// FASE 55 — ESCONDA O RULI · atrás da árvore ainda dá para ver; atrás da instrução, não.
RULES.registerLevel({
  id: 55, chapter: 6,
  instruction: 'LEVEL_055_TITLE',
  hints: ['LEVEL_055_HINT_1', 'LEVEL_055_HINT_2', 'LEVEL_055_HINT_3'],
  mascot: false,
  objects: [
    { id: 'ground', type: 'platform', x: 50, y: 112, w: 100, h: 16, z: 1, passive: true },
    { id: 'tree', type: 'tree', x: 76, y: 86, w: 20, h: 34, z: 6, passive: true },
    { id: 'chest', type: 'chest', x: 30, y: 94, w: 20, h: 18, z: 6, passive: true },
    { id: 'ruli', type: 'ruli', x: 52, y: 95, w: 15, h: 18, z: 4, behaviors: { draggable: {}, character: {} } }
  ],
  reactions: [
    { on: 'drop', target: 'ruli', cooldown: 600, unless: { type: 'text', target: 'ruli', mode: 'inside' }, do: [{ say: 'FB_SEEN' }] }
  ],
  win: { type: 'text', target: 'ruli', mode: 'inside' },
  onWin: [{ fx: 'enter', target: 'ruli' }]
});
