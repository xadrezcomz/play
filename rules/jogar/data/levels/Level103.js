// FASE 103 — DEIXE O 2 MAIOR QUE O 8 · "maior" de tamanho: aumente o 2 (ou diminua o 8).
RULES.registerLevel({
  id: 103, chapter: 11,
  instruction: 'LEVEL_103_TITLE',
  hints: ['LEVEL_103_HINT_1', 'LEVEL_103_HINT_2', 'LEVEL_103_HINT_3'],
  objects: [
    { id: 'two', type: 'number', x: 28, y: 66, w: 14, z: 3, props: { n: 2, color: 'teal' }, behaviors: { scalable: { min: 0.5, max: 4 } } },
    { id: 'eight', type: 'number', x: 66, y: 66, w: 34, z: 2, props: { n: 8, color: 'coral' }, behaviors: { scalable: { min: 0.3, max: 1.6 } } }
  ],
  reactions: [
    { on: 'tap', target: 'two', cooldown: 700, do: [{ fx: 'shake' }, { say: 'FB_TWO_SMALL' }] }
  ],
  win: { type: 'bigger', a: 'two', b: 'eight', ratio: 1.15 },
  onWin: [{ fx: 'hop', target: 'two' }]
});
