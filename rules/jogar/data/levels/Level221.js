// FASE 221 — ENCONTRE O RULI · ele está atrás do arbusto.
RULES.registerLevel({
  id: 221, chapter: 23,
  instruction: 'LEVEL_221_TITLE',
  hints: ['LEVEL_221_HINT_1', 'LEVEL_221_HINT_2', 'LEVEL_221_HINT_3'],
  objects: [
    {id: 'ground', type: 'platform', x: 50, y: 110, w: 100, h: 12, z: 0, passive: true},
    {id: 'tree', type: 'tree', x: 22, y: 76, w: 30, h: 50, z: 2, passive: true},
    {id: 'ruli', type: 'ruli', x: 70, y: 92, w: 14, h: 16, z: 1, state: {expr: 'happy'}},
    {id: 'bush', type: 'bush', x: 70, y: 94, w: 34, h: 22, z: 3, behaviors: {draggable: {}}},
    {id: 'cloud', type: 'cloud', x: 60, y: 36, w: 30, h: 18, z: 1, behaviors: {draggable: {}}}
  ],
  reactions: [
    {on: 'tap', target: 'bush', cooldown: 700, 'do': [{fx: 'wiggle'}, {say: 'FB_HEARD_SOMETHING'}]}
  ],
  win: {type: 'tapped', target: 'ruli'},
  onWin: [{fx: 'hop', target: 'ruli'}]
});
