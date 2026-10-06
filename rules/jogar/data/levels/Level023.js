// FASE 23 — COLOQUE O PEIXE NA ÁGUA · aumente o copo antes de colocar o peixe.
RULES.registerLevel({
  id: 23, chapter: 3,
  instruction: 'LEVEL_023_TITLE',
  hints: ['LEVEL_023_HINT_1', 'LEVEL_023_HINT_2', 'LEVEL_023_HINT_3'],
  objects: [
    { id: 'glass', type: 'cup', x: 50, y: 103, w: 14, h: 18, z: 3, state: { fill: 0.8 },
      behaviors: { container: { fit: true, offsetY: 0.05, rejectSay: 'FB_NOFIT' }, scalable: { min: 1, max: 3.2, anchor: 'bottom' } } },
    { id: 'fish', type: 'fish', x: 50, y: 34, w: 30, h: 18, z: 6, cls: 'flop', behaviors: { draggable: {} } }
  ],
  reactions: [
    { on: 'tap', target: 'fish', do: [{ fx: 'hop' }, { sound: 'ruli' }] },
    { on: 'scaledenied', target: 'fish', do: [{ fx: 'wobble' }, { fail: 'FB_HMM' }] }
  ],
  win: { type: 'inside', objects: ['fish'], container: 'glass' },
  onWin: [{ fx: 'hop', target: 'fish' }, { fx: 'pop', target: 'glass' }]
});
