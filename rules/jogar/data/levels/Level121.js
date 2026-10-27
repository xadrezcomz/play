// FASE 121 — EMPURRE A CAIXA ATÉ O X · a caixa não se arrasta: o Ruli empurra.
RULES.registerLevel({
  id: 121, chapter: 13,
  instruction: 'LEVEL_121_TITLE',
  hints: ['LEVEL_121_HINT_1', 'LEVEL_121_HINT_2', 'LEVEL_121_HINT_3'],
  objects: [
    {id: 'x', type: 'xmark', x: 82, y: 90, w: 13, z: 1, passive: true},
    {id: 'crate', type: 'chest', x: 48, y: 90, w: 14, h: 12.6, z: 5},
    {id: 'ruli', type: 'ruli', x: 16, y: 90, w: 12, h: 13.5, z: 8, behaviors: {draggable: {}, character: {}, pushes: {ids: ['crate'], solids: []}}}
  ],
  reactions: [
    {on: 'tap', target: 'crate', cooldown: 800, 'do': [{fx: 'shake'}, {say: 'FB_HEAVY_PUSH'}]}
  ],
  win: {type: 'inside', objects: ['crate'], container: 'x'},
  onWin: [{fx: 'squash', target: 'crate'}, {expr: 'happy', target: 'ruli'}]
});
