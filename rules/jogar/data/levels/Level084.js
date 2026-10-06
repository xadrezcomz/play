// FASE 84 — QUANTAS ESTRELAS? · tem uma atrás da nuvem.
RULES.registerLevel({
  id: 84, chapter: 9,
  instruction: 'LEVEL_084_TITLE',
  hints: ['LEVEL_084_HINT_1', 'LEVEL_084_HINT_2', 'LEVEL_084_HINT_3'],
  objects: [
    { id: 's1', type: 'star', x: 18, y: 30, w: 11, z: 2, passive: true },
    { id: 's2', type: 'star', x: 44, y: 22, w: 11, z: 2, passive: true },
    { id: 's3', type: 'star', x: 30, y: 58, w: 11, z: 2, passive: true },
    { id: 's4', type: 'star', x: 84, y: 34, w: 11, z: 2, passive: true },
    { id: 's5', type: 'star', x: 66, y: 60, w: 11, z: 2, passive: true },
    { id: 'cloud', type: 'cloud', x: 66, y: 60, w: 30, h: 18, z: 5, behaviors: { draggable: {} } },
    { id: 'n3', type: 'card', x: 28, y: 100, w: 14, h: 19, props: { n: 3 } },
    { id: 'n4', type: 'card', x: 50, y: 100, w: 14, h: 19, props: { n: 4 } },
    { id: 'n5', type: 'card', x: 72, y: 100, w: 14, h: 19, props: { n: 5 } }
  ],
  reactions: [
    { on: 'tap', target: 'n3', cooldown: 400, do: [{ fx: 'shake' }, { fail: 'FB_COUNT_AGAIN' }] },
    { on: 'tap', target: 'n4', cooldown: 400, do: [{ fx: 'shake' }, { fail: 'FB_COUNT_AGAIN' }] }
  ],
  win: { type: 'tapped', target: 'n5' },
  onWin: [{ fx: 'pop', target: 'n5' }]
});
