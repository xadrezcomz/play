// FASE 129 — TIRE A CAIXA DA SALA · empurre a caixa pela abertura da parede.
RULES.registerLevel({
  id: 129, chapter: 13,
  instruction: 'LEVEL_129_TITLE',
  hints: ['LEVEL_129_HINT_1', 'LEVEL_129_HINT_2', 'LEVEL_129_HINT_3'],
  objects: [
    {id: 'wt', type: 'bar', x: 50, y: 40, w: 82, h: 3, z: 2, passive: true},
    {id: 'wb', type: 'bar', x: 50, y: 106, w: 82, h: 3, z: 2, passive: true},
    {id: 'wl', type: 'bar', x: 10, y: 73, w: 3, h: 69, z: 2, passive: true},
    {id: 'wr1', type: 'bar', x: 90, y: 50, w: 3, h: 23, z: 2, passive: true},
    {id: 'wr2', type: 'bar', x: 90, y: 96, w: 3, h: 23, z: 2, passive: true},
    {id: 'crate', type: 'chest', x: 50, y: 72, w: 14, h: 12.6, z: 5},
    {id: 'ruli', type: 'ruli', x: 24, y: 90, w: 12, h: 13.5, z: 8, behaviors: {draggable: {}, character: {}, pushes: {ids: ['crate'], solids: ['wt', 'wb', 'wl', 'wr1', 'wr2']}}}
  ],
  reactions: [
    {on: 'tap', target: 'crate', cooldown: 800, 'do': [{fx: 'shake'}, {say: 'FB_HEAVY_PUSH'}]}
  ],
  win: {type: 'pos', target: 'crate', minX: 89},
  onWin: [{fx: 'squash', target: 'crate'}, {expr: 'happy', target: 'ruli'}]
});
