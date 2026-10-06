// FASE 60 — LEVE O RULI ATÉ A PORTA · o Ruli do cenário é um quadro; o de verdade é a palavra.
RULES.registerLevel({
  id: 60, chapter: 6,
  instruction: 'LEVEL_060_TITLE',   // contém [[w_ruli|RULI]]
  hints: ['LEVEL_060_HINT_1', 'LEVEL_060_HINT_2', 'LEVEL_060_HINT_3'],
  mascot: false,
  objects: [
    { id: 'w_ruli', inText: true, behaviors: { draggable: {} } },
    { id: 'floor', type: 'platform', x: 50, y: 112, w: 100, h: 16, z: 1, passive: true, props: { color: '#CDB69A' } },
    { id: 'picture', type: 'ruli', x: 26, y: 58, w: 24, h: 27, z: 3, cls: 'painting' },
    { id: 'door', type: 'door', x: 80, y: 84, w: 18, h: 36, z: 3,
      behaviors: { receives: { from: ['w_ruli'], set: { arrived: true }, consume: true } } }
  ],
  reactions: [
    { on: 'tap', target: 'picture', cooldown: 600, do: [{ fx: 'wobble' }, { say: 'FB_PAINTING' }] }
  ],
  win: { type: 'state', target: 'door', key: 'arrived' },
  onWin: [{ expr: 'happy', target: 'picture' }]
});
