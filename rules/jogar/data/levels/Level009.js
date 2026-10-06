// FASE 09 — COLOQUE TUDO NA CAIXA · a palavra TUDO também vai para a caixa.
// Primeira interação com o texto da instrução.
RULES.registerLevel({
  id: 9, chapter: 1,
  instruction: 'LEVEL_009_TITLE',   // contém [[w_all|TUDO]]
  hints: ['LEVEL_009_HINT_1', 'LEVEL_009_HINT_2', 'LEVEL_009_HINT_3'],
  objects: [
    { id: 'box', type: 'box', x: 50, y: 92, w: 50, h: 40, z: 5,
      behaviors: { container: { slots: [[-0.28, -0.12], [0, -0.16], [0.28, -0.12], [0, 0.24, 'w_all']] } } },
    { id: 'ball', type: 'ball', x: 20, y: 34, w: 15, props: { color: 'coral' }, behaviors: { draggable: {} } },
    { id: 'star', type: 'star', x: 52, y: 26, w: 16, behaviors: { draggable: {} } },
    { id: 'cube', type: 'cube', x: 80, y: 42, w: 14, props: { color: 'green' }, behaviors: { draggable: {} } },
    { id: 'w_all', inText: true, behaviors: { draggable: {} } }
  ],
  triggers: [
    { when: { type: 'inside', objects: ['ball', 'star', 'cube'], container: 'box' },
      do: [{ wait: 350 }, { fail: 'FB_ALMOST' }, { wait: 1300 }, { fx: 'wiggle', target: 'w_all' }] }
  ],
  win: { type: 'inside', objects: ['ball', 'star', 'cube', 'w_all'], container: 'box' },
  onWin: [{ fx: 'pop', target: 'box' }]
});
