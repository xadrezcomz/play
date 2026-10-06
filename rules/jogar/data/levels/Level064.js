// FASE 64 — FAÇA O PEQUENO FICAR GRANDE · a bola não cresce; a palavra PEQUENO, sim.
RULES.registerLevel({
  id: 64, chapter: 7,
  instruction: 'LEVEL_064_TITLE',   // contém [[w_small|PEQUENO]]
  hints: ['LEVEL_064_HINT_1', 'LEVEL_064_HINT_2', 'LEVEL_064_HINT_3'],
  objects: [
    { id: 'w_small', inText: true, behaviors: { scalable: { min: 0.5, max: 3 } } },
    { id: 'ball', type: 'ball', x: 50, y: 70, w: 8, props: { color: 'coral' } }
  ],
  reactions: [
    { on: 'scaledenied', target: 'ball', cooldown: 600, do: [{ fx: 'wobble' }, { fail: 'FB_HMM' }] },
    { on: 'tap', target: 'ball', cooldown: 600, do: [{ fx: 'hop' }, { sound: 'tap' }] }
  ],
  win: { type: 'scale', target: 'w_small', min: 2.2 },
  onWin: [{ fx: 'pop', target: 'w_small' }]
});
