// FASE 186 — JUNTE O RULI COM O REFLEXO · o reflexo na água repete o Ruli de cabeça para baixo.
RULES.registerLevel({
  id: 186, chapter: 19,
  instruction: 'LEVEL_186_TITLE',
  hints: ['LEVEL_186_HINT_1', 'LEVEL_186_HINT_2', 'LEVEL_186_HINT_3'],
  objects: [
    {id: 'water', type: 'bar', x: 50, y: 98, w: 100, h: 44, z: 1, passive: true, props: {color: '#BDE3FF'}},
    {id: 'line', type: 'bar', x: 50, y: 76, w: 100, h: 1, z: 1, passive: true, props: {color: '#7FC1F5'}},
    {id: 'ruli', type: 'ruli', x: 50, y: 40, w: 14, h: 16, z: 5, behaviors: {draggable: {maxY: 70}, character: {}}},
    {id: 'twin', type: 'ruli', x: 50, y: 112, w: 14, h: 16, z: 4, passive: true, cls: 'reflect', behaviors: {mirrorOf: {source: 'ruli', axis: 76, dir: 'y'}}}
  ],
  win: {type: 'touching', a: 'ruli', b: 'twin', pad: 0.5},
  onWin: [{expr: 'happy', target: 'ruli'}, {fx: 'hop', target: 'ruli'}]
});
