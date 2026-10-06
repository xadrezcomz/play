// FASE 63 — PINTE O CÉU DE AZUL · só há tinta vermelha e amarela; o azul é a palavra.
RULES.registerLevel({
  id: 63, chapter: 7,
  instruction: 'LEVEL_063_TITLE',   // contém [[w_blue|AZUL]]
  hints: ['LEVEL_063_HINT_1', 'LEVEL_063_HINT_2', 'LEVEL_063_HINT_3'],
  objects: [
    { id: 'w_blue', inText: true, cls: 'word-blue', behaviors: { draggable: {} } },
    { id: 'sky', type: 'sky', x: 50, y: 46, w: 92, h: 56, z: 1, props: { color: '#D3D7DE' },
      behaviors: {
        receives: { from: ['w_blue'], set: { color: '#8EC9FF' }, consume: true },
        'receives#2': { from: ['red', 'yellow'], copyColor: true, returnTool: true }
      } },
    { id: 'red', type: 'bucket', x: 28, y: 98, w: 14, h: 16, z: 5, props: { color: 'coral' }, behaviors: { draggable: {} } },
    { id: 'yellow', type: 'bucket', x: 72, y: 98, w: 14, h: 16, z: 5, props: { color: 'yellow' }, behaviors: { draggable: {} } }
  ],
  reactions: [
    { on: 'used', target: 'sky', unless: { type: 'state', target: 'sky', key: 'color', equals: '#8EC9FF' }, cooldown: 600, do: [{ fail: 'FB_NOT_BLUE' }] }
  ],
  win: { type: 'state', target: 'sky', key: 'color', equals: '#8EC9FF' },
  onWin: [{ fx: 'pop', target: 'sky' }]
});
