// FASE 123 — COLOQUE A BOLA NO BURACO · empurre a bola com o Ruli.
RULES.registerLevel({
  id: 123, chapter: 13,
  instruction: 'LEVEL_123_TITLE',
  hints: ['LEVEL_123_HINT_1', 'LEVEL_123_HINT_2', 'LEVEL_123_HINT_3'],
  objects: [
    {id: 'hole', type: 'hole', x: 78, y: 98, w: 18, h: 10, z: 1, passive: true},
    {id: 'ball', type: 'ball', x: 44, y: 66, w: 11, z: 5, props: {pattern: 'beach'}},
    {id: 'ruli', type: 'ruli', x: 16, y: 66, w: 12, h: 13.5, z: 8, behaviors: {draggable: {}, character: {}, pushes: {ids: ['ball'], solids: []}}}
  ],
  reactions: [
    {on: 'tap', target: 'ball', cooldown: 800, 'do': [{fx: 'shake'}, {say: 'FB_HEAVY_PUSH'}]}
  ],
  win: {type: 'inside', objects: ['ball'], container: 'hole'},
  onWin: [{move: 'ball', toObj: 'hole', ms: 200, await: true}, {hide: 'ball'}, {expr: 'happy', target: 'ruli'}]
});
