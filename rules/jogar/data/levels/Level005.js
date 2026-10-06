// FASE 05 — COLOQUE O CÍRCULO NO QUADRADO · o círculo é grande demais: pinça.
RULES.registerLevel({
  id: 5, chapter: 1,
  instruction: 'LEVEL_005_TITLE',
  hints: ['LEVEL_005_HINT_1', 'LEVEL_005_HINT_2', 'LEVEL_005_HINT_3'],
  objects: [
    { id: 'square', type: 'slot', x: 50, y: 96, w: 26, z: 3, props: { color: 'purple' },
      behaviors: { container: { fit: true, rejectSay: 'FB_TOO_BIG' } } },
    { id: 'circle', type: 'circle', x: 50, y: 40, w: 54, props: { color: 'teal' },
      behaviors: { draggable: {}, scalable: { min: 0.3, max: 1.25 } } }
  ],
  reactions: [
    { on: 'tap', target: 'circle', do: [{ fx: 'wobble' }, { sound: 'tap' }] }
  ],
  win: { type: 'inside', objects: ['circle'], container: 'square' },
  onWin: [{ fx: 'pop', target: 'circle' }]
});
