// FASE 50 — VOCÊ JÁ SABE O QUE FAZER · caixa → chave → porta → Ruli. Depois, o final.
RULES.registerLevel({
  id: 50, chapter: 5,
  instruction: 'LEVEL_050_TITLE',
  hints: ['LEVEL_050_HINT_1', 'LEVEL_050_HINT_2', 'LEVEL_050_HINT_3'],
  mascot: false,
  finale: 'mid',
  objects: [
    { id: 'ground', type: 'platform', x: 50, y: 110, w: 100, h: 20, z: 1, passive: true },
    { id: 'button', type: 'button', x: 80, y: 44, w: 18, z: 3, props: { color: 'coral' } },
    { id: 'key', type: 'key', x: 46, y: 96, w: 14, h: 7, z: 3, behaviors: { draggable: {} } },
    { id: 'box', type: 'cube', x: 46, y: 92, w: 22, z: 5, props: { color: 'yellow' }, behaviors: { draggable: {} } },
    { id: 'door', type: 'door', x: 84, y: 82, w: 17, h: 34, z: 4,
      behaviors: { draggable: { requires: { unlocked: true } }, receives: { from: ['key'], set: { unlocked: true }, consume: true } } },
    { id: 'ruli', type: 'ruli', x: 14, y: 90, w: 16, h: 19, z: 8, behaviors: { draggable: {}, character: {} } }
  ],
  reactions: [
    { on: 'locked', target: 'door', cooldown: 700, do: [{ say: 'FB_LOCKED' }] },
    { on: 'tap', target: 'button', cooldown: 500, do: [{ state: 'button', key: 'pressed', value: true }, { sound: 'click' }, { wait: 200 }, { state: 'button', key: 'pressed', value: false }, { say: 'FB_NOTHING' }] },
    { on: 'used', target: 'door', do: [{ say: 'FB_UNLOCKED' }] }
  ],
  win: [{ type: 'touching', a: 'ruli', b: 'door' }, { type: 'state', target: 'door', key: 'unlocked' }],
  onWin: [
    { expr: 'happy', target: 'ruli' },
    { move: 'ruli', toObj: 'door', offset: [0, 6], ms: 300, z: 900, await: true },
    { fx: 'enter', target: 'ruli' }
  ]
});
