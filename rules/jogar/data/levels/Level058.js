// FASE 58 — COLOQUE O GIGANTE NA CAIXA · a palavra GIGANTE é grande demais: diminua-a.
RULES.registerLevel({
  id: 58, chapter: 6,
  instruction: 'LEVEL_058_TITLE',   // contém [[w_g|GIGANTE]]
  hints: ['LEVEL_058_HINT_1', 'LEVEL_058_HINT_2', 'LEVEL_058_HINT_3'],
  objects: [
    { id: 'w_g', inText: true, cls: 'huge', behaviors: { draggable: {}, scalable: { min: 0.2, max: 1.2 } } },
    { id: 'box', type: 'box', x: 50, y: 92, w: 30, h: 24, z: 3, behaviors: { container: { fit: true, rejectSay: 'FB_TOO_BIG' } } },
    { id: 'ball', type: 'ball', x: 22, y: 52, w: 12, props: { color: 'coral' }, behaviors: { draggable: {} } }
  ],
  reactions: [
    { on: 'contained', target: 'ball', cooldown: 600, do: [{ fail: 'FB_ALMOST' }] }
  ],
  win: { type: 'inside', objects: ['w_g'], container: 'box' },
  onWin: [{ fx: 'pop', target: 'box' }]
});
