// FASE 99 — QUEBRE TODAS AS REGRAS · toque na estrela, mova a caixa e... espere.
RULES.registerLevel({
  id: 99, chapter: 10,
  instruction: 'LEVEL_099_TITLE',
  hints: ['LEVEL_099_HINT_1', 'LEVEL_099_HINT_2', 'LEVEL_099_HINT_3'],
  objects: [
    { id: 'sign1', type: 'word', textKey: 'LEVEL_099_S1', fontU: 3.6, cls: 'sign', x: 50, y: 12, z: 2, passive: true },
    { id: 'sign2', type: 'word', textKey: 'LEVEL_099_S2', fontU: 3.6, cls: 'sign', x: 50, y: 24, z: 2, passive: true },
    { id: 'sign3', type: 'word', textKey: 'LEVEL_099_S3', fontU: 3.6, cls: 'sign', x: 50, y: 36, z: 2, passive: true },
    { id: 'star', type: 'star', x: 28, y: 76, w: 16, z: 3, behaviors: { clickable: {} } },
    { id: 'box', type: 'cube', x: 72, y: 80, w: 16, z: 3, props: { color: 'coral' }, behaviors: { draggable: {} } }
  ],
  reactions: [
    { on: 'tap', target: 'star', do: [{ cls: 'sign1', add: 'broken' }] },
    { on: 'dragstart', target: 'box', do: [{ cls: 'sign2', add: 'broken' }] }
  ],
  triggers: [
    { when: [{ type: 'tapped', target: 'star' }, { type: 'moved', target: 'box', distance: 10 }, { type: 'idle', seconds: 1.5 }], do: [{ cls: 'sign3', add: 'broken' }] }
  ],
  win: [{ type: 'tapped', target: 'star' }, { type: 'moved', target: 'box', distance: 10 }, { type: 'idle', seconds: 3 }],
  onWin: [{ fx: 'pop', target: 'sign3' }]
});
