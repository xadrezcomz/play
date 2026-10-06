// FASE 16 — COLOQUE A BOLA NA CAIXA · a bola é enorme: aumente a caixa.
RULES.registerLevel({
  id: 16, chapter: 2,
  instruction: 'LEVEL_016_TITLE',
  hints: ['LEVEL_016_HINT_1', 'LEVEL_016_HINT_2', 'LEVEL_016_HINT_3'],
  objects: [
    { id: 'box', type: 'box', x: 50, y: 108, w: 20, h: 16, z: 5,
      behaviors: { container: { fit: true, rejectSay: 'FB_NOFIT' }, scalable: { min: 1, max: 3, anchor: 'bottom' } } },
    { id: 'ball', type: 'ball', x: 50, y: 30, w: 44, props: { pattern: 'beach' }, behaviors: { draggable: {} } }
  ],
  reactions: [
    { on: 'scaledenied', target: 'ball', do: [{ fx: 'wobble' }, { fail: 'FB_HMM' }] },
    { on: 'tap', target: 'ball', do: [{ fx: 'hop' }, { sound: 'tap' }] }
  ],
  win: { type: 'inside', objects: ['ball'], container: 'box' },
  onWin: [{ fx: 'pop', target: 'box' }]
});
