// FASE 03 — ABRA A PORTA · tocar não funciona: a porta desliza para o lado.
RULES.registerLevel({
  id: 3, chapter: 1,
  instruction: 'LEVEL_003_TITLE',
  hints: ['LEVEL_003_HINT_1', 'LEVEL_003_HINT_2', 'LEVEL_003_HINT_3'],
  objects: [
    { id: 'doorway', type: 'doorway', x: 50, y: 62, w: 32, h: 58, z: 2, passive: true },
    { id: 'door', type: 'door', x: 50, y: 63, w: 27, h: 54, z: 5,
      behaviors: { draggable: { axis: 'x', minX: 16, maxX: 84 }, door: { openDistance: 15 } } }
  ],
  reactions: [
    { on: 'tap', target: 'door', cooldown: 400, do: [{ fx: 'shake' }, { sound: 'click' }, { fail: 'FB_HMM' }] }
  ],
  win: { type: 'state', target: 'door', key: 'open', equals: true },
  onWin: [{ fx: 'pop', target: 'doorway' }]
});
