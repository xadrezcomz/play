// FASE 109 — COLOQUE O RELÓGIO NAS 3 HORAS · os dois ponteiros: o pequeno no 3 e o grande no 12.
RULES.registerLevel({
  id: 109, chapter: 11,
  instruction: 'LEVEL_109_TITLE',
  hints: ['LEVEL_109_HINT_1', 'LEVEL_109_HINT_2', 'LEVEL_109_HINT_3'],
  objects: [
    { id: 'clock', type: 'clock', x: 50, y: 64, w: 66, z: 1, passive: true },
    { id: 'minute', type: 'hand', x: 50, y: 64, w: 66, z: 3, rot: 180, props: { len: 40, width: 4 }, behaviors: { rotatable: { snap: 30 } } },
    { id: 'hour', type: 'hand', x: 50, y: 64, w: 40, z: 4, rot: 300, props: { len: 34, width: 8, color: 'coral' }, behaviors: { rotatable: { snap: 30 } } }
  ],
  triggers: [
    { when: [{ type: 'state', target: 'hour', key: 'angle', equals: 90 }, { type: 'not', of: { type: 'state', target: 'minute', key: 'angle', equals: 0 } }],
      do: [{ wait: 300 }, { say: 'FB_THREE_THIRTY' }] }
  ],
  win: [{ type: 'state', target: 'hour', key: 'angle', equals: 90 }, { type: 'state', target: 'minute', key: 'angle', equals: 0 }],
  onWin: [{ fx: 'pop', target: 'clock' }]
});
