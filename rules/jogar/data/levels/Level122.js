// FASE 122 — LEVE A CAIXA ATÉ O X · empurre para cima e depois para o lado.
RULES.registerLevel({
  id: 122, chapter: 13,
  instruction: 'LEVEL_122_TITLE',
  hints: ['LEVEL_122_HINT_1', 'LEVEL_122_HINT_2', 'LEVEL_122_HINT_3'],
  objects: [
    {id: 'x', type: 'xmark', x: 80, y: 42, w: 13, z: 1, passive: true},
    {id: 'crate', type: 'chest', x: 46, y: 84, w: 14, h: 12.6, z: 5},
    {id: 'ruli', type: 'ruli', x: 18, y: 104, w: 12, h: 13.5, z: 8, behaviors: {draggable: {}, character: {}, pushes: {ids: ['crate'], solids: []}}}
  ],
  reactions: [
    {on: 'tap', target: 'crate', cooldown: 800, 'do': [{fx: 'shake'}, {say: 'FB_HEAVY_PUSH'}]}
  ],
  win: {type: 'inside', objects: ['crate'], container: 'x'},
  onWin: [{fx: 'squash', target: 'crate'}, {expr: 'happy', target: 'ruli'}]
});
