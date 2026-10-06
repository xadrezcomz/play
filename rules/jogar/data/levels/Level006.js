// FASE 06 — ENCONTRE A ESTRELA · um dos círculos sai do lugar; a estrela está atrás.
RULES.registerLevel({
  id: 6, chapter: 1,
  instruction: 'LEVEL_006_TITLE',
  hints: ['LEVEL_006_HINT_1', 'LEVEL_006_HINT_2', 'LEVEL_006_HINT_3'],
  objects: [
    { id: 'star', type: 'star', x: 70, y: 82, w: 13, z: 2, behaviors: { clickable: {} } },
    { id: 'c1', type: 'circle', x: 25, y: 30, w: 24, props: { color: 'blue' } },
    { id: 'c2', type: 'circle', x: 72, y: 32, w: 26, props: { color: 'yellow' } },
    { id: 'c3', type: 'circle', x: 46, y: 58, w: 24, props: { color: 'green' } },
    { id: 'c4', type: 'circle', x: 70, y: 82, w: 25, props: { color: 'coral' }, behaviors: { draggable: {} } },
    { id: 'c5', type: 'circle', x: 24, y: 88, w: 26, props: { color: 'purple' } }
  ],
  reactions: [
    { on: 'tap', target: 'c1', do: [{ fx: 'wobble' }, { sound: 'tap' }] },
    { on: 'tap', target: 'c2', do: [{ fx: 'wobble' }, { sound: 'tap' }] },
    { on: 'tap', target: 'c3', do: [{ fx: 'wobble' }, { sound: 'tap' }] },
    { on: 'tap', target: 'c4', do: [{ fx: 'wobble' }, { sound: 'tap' }] },
    { on: 'tap', target: 'c5', do: [{ fx: 'wobble' }, { sound: 'tap' }] },
    { on: 'dragstart', target: 'c4', do: [{ sound: 'ruli' }] }
  ],
  win: { type: 'tapped', target: 'star' },
  onWin: [{ fx: 'pop', target: 'star' }]
});
