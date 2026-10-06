// FASE 11 — PEGUE A CHAVE · a chave foge de Ruli; leve a chave até ele.
RULES.registerLevel({
  id: 11, chapter: 2,
  instruction: 'LEVEL_011_TITLE',
  hints: ['LEVEL_011_HINT_1', 'LEVEL_011_HINT_2', 'LEVEL_011_HINT_3'],
  mascot: false,
  objects: [
    { id: 'ruli', type: 'ruli', x: 24, y: 90, w: 20, h: 22, behaviors: { draggable: {}, character: {} } },
    { id: 'key', type: 'key', x: 72, y: 46, w: 18, h: 9,
      behaviors: { draggable: {}, flee: { from: 'ruli', radius: 24 } } }
  ],
  reactions: [
    { on: 'flee', cooldown: 500, do: [{ expr: 'surprised', target: 'ruli' }] },
    { on: 'tap', target: 'key', do: [{ fx: 'wiggle' }, { sound: 'tap' }] }
  ],
  win: { type: 'touching', a: 'key', b: 'ruli' },
  onWin: [
    { move: 'key', toObj: 'ruli', offset: [8, 2], ms: 200, z: 900 },
    { expr: 'happy', target: 'ruli' },
    { fx: 'hop', target: 'ruli' }
  ]
});
