// FASE 33 — COLOQUE 5 BOLAS NA CAIXA · só existem quatro; esticando uma, ela vira duas.
RULES.registerLevel({
  id: 33, chapter: 4,
  instruction: 'LEVEL_033_TITLE',
  hints: ['LEVEL_033_HINT_1', 'LEVEL_033_HINT_2', 'LEVEL_033_HINT_3'],
  objects: [
    { id: 'box', type: 'box', x: 50, y: 94, w: 54, h: 38, z: 5,
      behaviors: { container: { slots: [[-0.3, -0.12], [0, -0.16], [0.3, -0.12], [-0.15, 0.2], [0.15, 0.2]] } } },
    { id: 'b1', type: 'ball', x: 16, y: 30, w: 12, props: { color: 'coral' }, behaviors: { draggable: {} } },
    { id: 'b2', type: 'ball', x: 40, y: 24, w: 12, props: { color: 'blue' }, behaviors: { draggable: {} } },
    { id: 'b3', type: 'ball', x: 64, y: 30, w: 12, props: { color: 'yellow' }, behaviors: { draggable: {} } },
    { id: 'b4', type: 'ball', x: 84, y: 46, w: 12, props: { color: 'green' },
      behaviors: { draggable: {}, scalable: { min: 1, max: 1.8 }, splitOnStretch: { spawn: 'b5', at: 1.5 } } },
    { id: 'b5', type: 'ball', x: 84, y: 46, w: 12, hidden: true, props: { color: 'green' }, behaviors: { draggable: {} } }
  ],
  triggers: [
    { when: { type: 'inside', objects: ['b1', 'b2', 'b3', 'b4'], container: 'box' },
      do: [{ wait: 300 }, { fail: 'FB_ALMOST' }, { wait: 1200 }, { fx: 'wiggle', target: 'b4' }] }
  ],
  win: { type: 'inside', objects: ['b1', 'b2', 'b3', 'b4', 'b5'], container: 'box' },
  onWin: [{ fx: 'pop', target: 'box' }]
});
