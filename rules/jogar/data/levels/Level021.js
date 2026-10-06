// FASE 21 — ENCONTRE A SAÍDA · não há porta: arraste a parede.
RULES.registerLevel({
  id: 21, chapter: 3,
  instruction: 'LEVEL_021_TITLE',
  hints: ['LEVEL_021_HINT_1', 'LEVEL_021_HINT_2', 'LEVEL_021_HINT_3'],
  mascot: false,
  objects: [
    { id: 'floor', type: 'platform', x: 50, y: 112, w: 100, h: 16, z: 1, passive: true, props: { color: '#CDB69A' } },
    { id: 'door', type: 'door', x: 60, y: 82, w: 18, h: 36, z: 2, behaviors: { clickable: {} } },
    { id: 'wall', type: 'wall', x: 58, y: 70, w: 64, h: 68, z: 4, behaviors: { draggable: {} } },
    { id: 'ruli', type: 'ruli', x: 14, y: 94, w: 16, h: 18, z: 6, passive: true }
  ],
  reactions: [
    { on: 'tap', target: 'wall', cooldown: 500, do: [{ fx: 'shake' }, { sound: 'collision' }, { fail: 'FB_HMM' }] },
    { on: 'dragstart', target: 'wall', do: [{ expr: 'surprised', target: 'ruli' }] }
  ],
  win: { type: 'tapped', target: 'door' },
  onWin: [
    { expr: 'happy', target: 'ruli' },
    { move: 'ruli', toObj: 'door', offset: [0, 8], ms: 380, z: 900, await: true },
    { fx: 'enter', target: 'ruli' }
  ]
});
