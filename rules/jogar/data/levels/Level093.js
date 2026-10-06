// FASE 93 — LEVE A ÁGUA ATÉ A PLANTA · gire os canos até eles se ligarem.
RULES.registerLevel({
  id: 93, chapter: 10,
  instruction: 'LEVEL_093_TITLE',
  hints: ['LEVEL_093_HINT_1', 'LEVEL_093_HINT_2', 'LEVEL_093_HINT_3'],
  objects: [
    { id: 'faucet', type: 'faucet', x: 26, y: 28, w: 22, h: 13, z: 2, passive: true },
    { id: 'p1', type: 'pipe', x: 34, y: 48, w: 18, z: 3, rot: 90, props: { shape: 'straight' }, behaviors: { rotatable: { snap: 90 } } },
    { id: 'p2', type: 'pipe', x: 34, y: 66, w: 18, z: 3, rot: 180, props: { shape: 'corner' }, behaviors: { rotatable: { snap: 90 } } },
    { id: 'p3', type: 'pipe', x: 52, y: 66, w: 18, z: 3, rot: 0, props: { shape: 'straight' }, behaviors: { rotatable: { snap: 90 } } },
    { id: 'plant', type: 'plant', x: 72, y: 70, w: 18, h: 30, z: 2, passive: true }
  ],
  win: [
    { type: 'any', of: [{ type: 'state', target: 'p1', key: 'angle', equals: 0 }, { type: 'state', target: 'p1', key: 'angle', equals: 180 }] },
    { type: 'state', target: 'p2', key: 'angle', equals: 0 },
    { type: 'any', of: [{ type: 'state', target: 'p3', key: 'angle', equals: 90 }, { type: 'state', target: 'p3', key: 'angle', equals: 270 }] }
  ],
  onWin: [
    { state: 'p1', key: 'wet', value: true }, { wait: 120 }, { state: 'p2', key: 'wet', value: true }, { wait: 120 },
    { state: 'p3', key: 'wet', value: true }, { wait: 120 }, { state: 'plant', key: 'grown', value: true }, { fx: 'hop', target: 'plant' }
  ]
});
