// FASE 30 — NÃO MOVA RULI · leve o cenário inteiro (o chão com a porta) até ele.
RULES.registerLevel({
  id: 30, chapter: 3,
  instruction: 'LEVEL_030_TITLE',
  hints: ['LEVEL_030_HINT_1', 'LEVEL_030_HINT_2', 'LEVEL_030_HINT_3'],
  mascot: false,
  objects: [
    { id: 'world', type: 'platform', x: 90, y: 108, w: 180, h: 24, z: 2,
      behaviors: { draggable: { axis: 'x', minX: 6, maxX: 90 }, carries: { ids: ['door', 'tree1', 'tree2'] } } },
    { id: 'tree1', type: 'tree', x: 40, y: 82, w: 14, h: 24, z: 3, passive: true },
    { id: 'tree2', type: 'tree', x: 64, y: 84, w: 11, h: 20, z: 3, passive: true },
    { id: 'door', type: 'door', x: 90, y: 79, w: 16, h: 32, z: 4 },
    { id: 'ruli', type: 'ruli', x: 12, y: 86, w: 16, h: 18, z: 8,
      behaviors: { draggable: { returnOnDrop: true }, character: {} } }
  ],
  reactions: [
    { on: 'dragstart', target: 'ruli', do: [{ fail: 'FB_DONT_MOVE' }] },
    { on: 'tap', target: 'door', do: [{ fx: 'shake' }, { sound: 'click' }] }
  ],
  win: { type: 'touching', a: 'door', b: 'ruli' },
  onWin: [
    { expr: 'happy', target: 'ruli' },
    { fx: 'enter', target: 'ruli' }
  ]
});
