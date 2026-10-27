// FASE 104 — QUANTAS BOLAS? · duas bolas estão escondidas atrás da caixa: são 6.
RULES.registerLevel({
  id: 104, chapter: 11,
  instruction: 'LEVEL_104_TITLE',
  hints: ['LEVEL_104_HINT_1', 'LEVEL_104_HINT_2', 'LEVEL_104_HINT_3'],
  objects: [
    { id: 'b1', type: 'ball', x: 20, y: 40, w: 12, z: 2, props: { color: 'coral' } },
    { id: 'b2', type: 'ball', x: 42, y: 34, w: 12, z: 2, props: { color: 'blue' } },
    { id: 'b3', type: 'ball', x: 26, y: 62, w: 12, z: 2, props: { color: 'yellow' } },
    { id: 'b4', type: 'ball', x: 46, y: 56, w: 12, z: 2, props: { color: 'green' } },
    { id: 'b5', type: 'ball', x: 70, y: 54, w: 11, z: 2, props: { color: 'purple' } },
    { id: 'b6', type: 'ball', x: 82, y: 60, w: 11, z: 2, props: { color: 'coral' } },
    { id: 'box', type: 'box', x: 76, y: 56, w: 30, h: 24, z: 5, behaviors: { draggable: {} } },
    { id: 'ans', type: 'display', x: 38, y: 98, w: 30, h: 15, z: 3, state: { n: 0 }, behaviors: { cycle: { key: 'n' } } },
    { id: 'ok', type: 'button', x: 70, y: 98, w: 16, z: 3, props: { color: 'green' } }
  ],
  reactions: [
    { on: 'tap', target: 'ok', unless: { type: 'state', target: 'ans', key: 'n', equals: 6 }, do: [{ forget: 'ok' }, { fx: 'shake', target: 'ans' }, { fail: 'FB_COUNT_AGAIN' }] }
  ],
  win: [{ type: 'state', target: 'ans', key: 'n', equals: 6 }, { type: 'tapped', target: 'ok' }],
  onWin: [{ fx: 'pop', target: 'ans' }]
});
