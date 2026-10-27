// FASE 182 — LEVE CADA RULI À SUA BANDEIRA · o reflexo depende de onde está o espelho: mova o espelho.
RULES.registerLevel({
  id: 182, chapter: 19,
  instruction: 'LEVEL_182_TITLE',
  hints: ['LEVEL_182_HINT_1', 'LEVEL_182_HINT_2', 'LEVEL_182_HINT_3'],
  objects: [
    {id: 'f1', type: 'flag', x: 20, y: 84, w: 8, h: 12, z: 1, passive: true},
    {id: 'f2', type: 'flag', x: 64, y: 84, w: 8, h: 12, z: 1, passive: true},
    {id: 'mirror', type: 'mirrorline', x: 52, y: 70, w: 3, h: 60, z: 2, behaviors: {draggable: {axis: 'x', minX: 30, maxX: 70}}},
    {id: 'ruli', type: 'ruli', x: 36, y: 88, w: 12, h: 13.5, z: 5, behaviors: {draggable: {maxX: 50}, character: {}}},
    {id: 'twin', type: 'ruli', x: 68, y: 88, w: 12, h: 13.5, z: 4, passive: true, cls: 'flipx', behaviors: {mirrorOf: {source: 'ruli', axisObj: 'mirror'}}}
  ],
  win: [{type: 'touching', a: 'ruli', b: 'f1'}, {type: 'touching', a: 'twin', b: 'f2'}],
  onWin: [{expr: 'happy', target: 'ruli'}, {expr: 'happy', target: 'twin'}]
});
