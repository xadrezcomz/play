// FASE 29 — FAÇA CHOVER · pressione e esfregue a nuvem até ela carregar.
RULES.registerLevel({
  id: 29, chapter: 3,
  instruction: 'LEVEL_029_TITLE',
  hints: ['LEVEL_029_HINT_1', 'LEVEL_029_HINT_2', 'LEVEL_029_HINT_3'],
  objects: [
    { id: 'cloud', type: 'cloud', x: 50, y: 40, w: 56, h: 34, z: 5, state: { charge: 0 },
      behaviors: { rubbable: { count: 16, progress: 'charge', set: { raining: true } } } },
    { id: 'ground', type: 'platform', x: 50, y: 112, w: 100, h: 16, z: 1, passive: true },
    { id: 'plant', type: 'tree', x: 50, y: 96, w: 10, h: 17, z: 2, passive: true }
  ],
  reactions: [
    { on: 'tap', target: 'cloud', cooldown: 500, do: [{ fx: 'wobble' }, { fail: 'FB_HMM' }] }
  ],
  win: { type: 'state', target: 'cloud', key: 'raining', equals: true },
  onWin: [{ wait: 300 }, { fx: 'hop', target: 'plant' }]
});
