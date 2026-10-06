// FASE 44 — ENCONTRE A PORTA · não há porta: monte uma com as formas.
RULES.registerLevel({
  id: 44, chapter: 5,
  instruction: 'LEVEL_044_TITLE',
  hints: ['LEVEL_044_HINT_1', 'LEVEL_044_HINT_2', 'LEVEL_044_HINT_3'],
  mascot: false,
  objects: [
    { id: 'floor', type: 'platform', x: 50, y: 112, w: 100, h: 16, z: 1, passive: true, props: { color: '#CDB69A' } },
    { id: 'frame', type: 'outline', x: 60, y: 82, w: 22, h: 40, z: 2, passive: true },
    { id: 'kslot', type: 'marker', x: 66, y: 83, w: 3, passive: true },
    { id: 'panel', type: 'plank', x: 24, y: 46, w: 22, h: 40, z: 5, props: { color: 'purple' },
      behaviors: { draggable: {}, snap: { to: ['frame'], tol: 12 } } },
    { id: 'knob', type: 'circle', x: 80, y: 40, w: 5, z: 7, props: { color: 'yellow' },
      behaviors: { draggable: {}, snap: { to: ['kslot'], tol: 7 } } },
    { id: 'tri', type: 'triangle', x: 84, y: 60, w: 14, h: 12, z: 5, props: { color: 'teal' }, behaviors: { draggable: {} } },
    { id: 'ruli', type: 'ruli', x: 14, y: 95, w: 15, h: 17, z: 8, passive: true }
  ],
  win: [{ type: 'state', target: 'panel', key: 'at', equals: 'frame' }, { type: 'state', target: 'knob', key: 'at', equals: 'kslot' }],
  onWin: [
    { expr: 'happy', target: 'ruli' },
    { move: 'ruli', toObj: 'panel', offset: [0, 11], ms: 420, z: 900, await: true },
    { fx: 'enter', target: 'ruli' }
  ]
});
