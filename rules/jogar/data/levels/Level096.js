// FASE 96 — NÃO TOQUE EM NADA · o vaso vai cair... e cai na almofada. Confie.
RULES.registerLevel({
  id: 96, chapter: 10,
  instruction: 'LEVEL_096_TITLE',
  hints: ['LEVEL_096_HINT_1', 'LEVEL_096_HINT_2', 'LEVEL_096_HINT_3'],
  objects: [
    { id: 'shelf', type: 'shelf', x: 40, y: 40, w: 40, h: 7, z: 2, passive: true },
    { id: 'cushion', type: 'cushion', x: 64, y: 100, w: 26, h: 10, z: 2, behaviors: { draggable: {} } },
    { id: 'vase', type: 'vase', x: 64, y: 30, w: 10, h: 17, z: 3, behaviors: { gravity: { delay: 1600, g: 0.02, solids: ['cushion'] } } }
  ],
  reactions: [
    { on: 'input', cooldown: 900, do: [{ fail: 'FB_HMM' }] },
    { on: 'fell', target: 'vase', do: [{ fail: 'FB_CRASH' }] }
  ],
  win: [{ type: 'idle', seconds: 5 }, { type: 'state', target: 'vase', key: 'landed' }],
  onWin: [{ fx: 'hop', target: 'vase' }]
});
