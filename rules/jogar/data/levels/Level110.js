// FASE 110 — QUANTOS QUADRADOS? · 4 pequenos + 1 grande que é a soma de todos = 5.
RULES.registerLevel({
  id: 110, chapter: 11,
  instruction: 'LEVEL_110_TITLE',
  hints: ['LEVEL_110_HINT_1', 'LEVEL_110_HINT_2', 'LEVEL_110_HINT_3'],
  objects: [
    { id: 'q1', type: 'outline', x: 38, y: 44, w: 24, h: 24, z: 2, passive: true, props: { color: 'blue' } },
    { id: 'q2', type: 'outline', x: 62, y: 44, w: 24, h: 24, z: 2, passive: true, props: { color: 'blue' } },
    { id: 'q3', type: 'outline', x: 38, y: 68, w: 24, h: 24, z: 2, passive: true, props: { color: 'blue' } },
    { id: 'q4', type: 'outline', x: 62, y: 68, w: 24, h: 24, z: 2, passive: true, props: { color: 'blue' } },
    { id: 'ans', type: 'display', x: 38, y: 102, w: 30, h: 15, z: 3, state: { n: 0 }, behaviors: { cycle: { key: 'n' } } },
    { id: 'ok', type: 'button', x: 70, y: 102, w: 16, z: 3, props: { color: 'green' } }
  ],
  reactions: [
    { on: 'tap', target: 'ok', unless: { type: 'state', target: 'ans', key: 'n', equals: 5 }, do: [{ forget: 'ok' }, { fx: 'shake', target: 'ans' }, { fail: 'FB_COUNT_AGAIN' }] }
  ],
  win: [{ type: 'state', target: 'ans', key: 'n', equals: 5 }, { type: 'tapped', target: 'ok' }],
  onWin: [{ fx: 'pop', target: 'ans' }]
});
