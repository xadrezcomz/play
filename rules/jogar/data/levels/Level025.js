// FASE 25 — FAÇA RULI SORRIR · cócegas: esfregue rápido (com o dedo ou com a pena).
RULES.registerLevel({
  id: 25, chapter: 3,
  instruction: 'LEVEL_025_TITLE',
  hints: ['LEVEL_025_HINT_1', 'LEVEL_025_HINT_2', 'LEVEL_025_HINT_3'],
  mascot: false,
  objects: [
    { id: 'ruli', type: 'ruli', x: 50, y: 62, w: 34, h: 38, z: 4, state: { expr: 'serious' },
      behaviors: { rubbable: { count: 12, decayMs: 900, set: { expr: 'happy', laughing: true } } } },
    { id: 'feather', type: 'feather', x: 18, y: 100, w: 9, h: 18, z: 7, rot: -20, behaviors: { draggable: {} } },
    { id: 'ball', type: 'ball', x: 80, y: 102, w: 12, props: { color: 'blue' }, behaviors: { draggable: {} } },
    { id: 'cube', type: 'cube', x: 82, y: 26, w: 11, props: { color: 'yellow' }, behaviors: { draggable: {} } }
  ],
  reactions: [
    { on: 'tap', target: 'ruli', cooldown: 600, do: [{ fx: 'wobble' }, { fail: 'FB_SERIOUS' }] },
    { on: 'rubbing', target: 'ruli', cooldown: 400, do: [{ expr: 'surprised', target: 'ruli' }] }
  ],
  win: { type: 'state', target: 'ruli', key: 'laughing', equals: true },
  onWin: [{ expr: 'happy', target: 'ruli' }, { fx: 'hop', target: 'ruli' }]
});
