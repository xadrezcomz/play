// FASE 54 — COLOQUE A FASE NA CAIXA · a palavra FASE do rótulo lá em cima vai para a caixa.
RULES.registerLevel({
  id: 54, chapter: 6,
  instruction: 'LEVEL_054_TITLE',
  label: 'LEVEL_054_LABEL',       // "[[w_fase|FASE]] 54"
  hints: ['LEVEL_054_HINT_1', 'LEVEL_054_HINT_2', 'LEVEL_054_HINT_3'],
  objects: [
    { id: 'w_fase', inLabel: true, behaviors: { draggable: {} } },
    { id: 'box', type: 'box', x: 50, y: 90, w: 40, h: 32, z: 3, behaviors: { container: {} } },
    { id: 'star', type: 'star', x: 26, y: 46, w: 12, behaviors: { draggable: {} } }
  ],
  reactions: [
    { on: 'contained', target: 'star', cooldown: 600, do: [{ fail: 'FB_ALMOST' }] }
  ],
  win: { type: 'inside', objects: ['w_fase'], container: 'box' },
  onWin: [{ fx: 'pop', target: 'box' }]
});
