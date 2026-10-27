// FASE 101 — FAÇA UM 6 · não existe 6; gire o 9 de cabeça para baixo.
RULES.registerLevel({
  id: 101, chapter: 11,
  instruction: 'LEVEL_101_TITLE',
  hints: ['LEVEL_101_HINT_1', 'LEVEL_101_HINT_2', 'LEVEL_101_HINT_3'],
  objects: [
    { id: 'n9', type: 'number', x: 50, y: 64, w: 36, z: 3, props: { n: 9, color: 'purple' }, behaviors: { rotatable: { snap: 90 } } },
    { id: 'n1', type: 'number', x: 20, y: 100, w: 14, z: 2, passive: true, props: { n: 1 } },
    { id: 'n2', type: 'number', x: 80, y: 100, w: 14, z: 2, passive: true, props: { n: 3 } }
  ],
  reactions: [
    { on: 'tap', target: 'n9', cooldown: 700, do: [{ fx: 'shake' }, { say: 'FB_ITS_NINE' }] }
  ],
  win: { type: 'value', target: 'n9', equals: 6 },
  onWin: [{ fx: 'pop', target: 'n9' }]
});
