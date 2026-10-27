// FASE 124 — LEVE A CAIXA ATÉ O X · a caixa está presa no canto; leve a palavra CAIXA.
RULES.registerLevel({
  id: 124, chapter: 13,
  instruction: 'LEVEL_124_TITLE',
  hints: ['LEVEL_124_HINT_1', 'LEVEL_124_HINT_2', 'LEVEL_124_HINT_3'],
  objects: [
    {id: 'w_box', inText: true, behaviors: {draggable: {}}},
    {id: 'x', type: 'xmark', x: 76, y: 94, w: 13, z: 1, passive: true},
    {id: 'crate', type: 'chest', x: 9, y: 36, w: 14, h: 12.6, z: 5},
    {id: 'ruli', type: 'ruli', x: 40, y: 60, w: 12, h: 13.5, z: 8, behaviors: {draggable: {}, character: {}, pushes: {ids: ['crate'], solids: []}}}
  ],
  reactions: [
    {on: 'tap', target: 'crate', cooldown: 800, 'do': [{fx: 'shake'}, {say: 'FB_HEAVY_PUSH'}]}
  ],
  win: {type: 'any', of: [{type: 'inside', objects: ['crate'], container: 'x'}, {type: 'inside', objects: ['w_box'], container: 'x'}]},
  onWin: [{fx: 'pop', target: 'x'}]
});
