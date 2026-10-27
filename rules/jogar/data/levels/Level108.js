// FASE 108 — ABRA O CADEADO · a senha é quantas maçãs, estrelas e luas existem (uma estrela atrás da nuvem).
RULES.registerLevel({
  id: 108, chapter: 11,
  instruction: 'LEVEL_108_TITLE',
  hints: ['LEVEL_108_HINT_1', 'LEVEL_108_HINT_2', 'LEVEL_108_HINT_3'],
  objects: [
    { id: 'a1', type: 'apple', x: 14, y: 28, w: 10, z: 2, passive: true },
    { id: 'a2', type: 'apple', x: 26, y: 36, w: 10, z: 2, passive: true },
    { id: 's1', type: 'star', x: 44, y: 24, w: 9, z: 2, passive: true },
    { id: 's2', type: 'star', x: 56, y: 32, w: 9, z: 2, passive: true },
    { id: 's3', type: 'star', x: 48, y: 42, w: 9, z: 2, passive: true },
    { id: 's4', type: 'star', x: 64, y: 22, w: 9, z: 2, passive: true },
    { id: 's5', type: 'star', x: 84, y: 44, w: 9, z: 2, passive: true },
    { id: 'moon', type: 'moon', x: 84, y: 24, w: 11, z: 2, passive: true },
    { id: 'cloud', type: 'cloud', x: 82, y: 46, w: 24, h: 14, z: 4, behaviors: { draggable: {} } },
    { id: 'lock', type: 'lock', x: 50, y: 64, w: 18, h: 22, z: 2, passive: true },
    { id: 'i1', type: 'apple', x: 26, y: 84, w: 7, z: 2, passive: true },
    { id: 'i2', type: 'star', x: 50, y: 84, w: 7, z: 2, passive: true },
    { id: 'i3', type: 'moon', x: 74, y: 84, w: 7, z: 2, passive: true },
    { id: 'd1', type: 'number', x: 26, y: 100, w: 16, z: 3, state: { n: 0 }, behaviors: { cycle: {} } },
    { id: 'd2', type: 'number', x: 50, y: 100, w: 16, z: 3, state: { n: 0 }, behaviors: { cycle: {} } },
    { id: 'd3', type: 'number', x: 74, y: 100, w: 16, z: 3, state: { n: 0 }, behaviors: { cycle: {} } }
  ],
  triggers: [
    { when: [{ type: 'state', target: 'd1', key: 'n', equals: 2 }, { type: 'state', target: 'd2', key: 'n', equals: 4 }, { type: 'state', target: 'd3', key: 'n', equals: 1 }],
      do: [{ fx: 'shake', target: 'lock' }, { fail: 'FB_COUNT_AGAIN' }] }
  ],
  win: [{ type: 'state', target: 'd1', key: 'n', equals: 2 }, { type: 'state', target: 'd2', key: 'n', equals: 5 }, { type: 'state', target: 'd3', key: 'n', equals: 1 }],
  onWin: [{ state: 'lock', key: 'open', value: true }, { fx: 'pop', target: 'lock' }]
});
