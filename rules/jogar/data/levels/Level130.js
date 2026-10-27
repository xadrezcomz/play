// FASE 130 — LEVE AS CAIXAS PARA OS X · os X estão em nichos na parede; cuidado para não prender as caixas.
RULES.registerLevel({
  id: 130, chapter: 13,
  instruction: 'LEVEL_130_TITLE',
  hints: ['LEVEL_130_HINT_1', 'LEVEL_130_HINT_2', 'LEVEL_130_HINT_3'],
  objects: [
    {id: 't1', type: 'bar', x: 13, y: 44, w: 22, h: 3, z: 2, passive: true},
    {id: 't2', type: 'bar', x: 50, y: 44, w: 28, h: 3, z: 2, passive: true},
    {id: 't3', type: 'bar', x: 87, y: 44, w: 22, h: 3, z: 2, passive: true},
    {id: 'n1', type: 'bar', x: 22.5, y: 36, w: 3, h: 18, z: 2, passive: true},
    {id: 'n2', type: 'bar', x: 37.5, y: 36, w: 3, h: 18, z: 2, passive: true},
    {id: 'n3', type: 'bar', x: 62.5, y: 36, w: 3, h: 18, z: 2, passive: true},
    {id: 'n4', type: 'bar', x: 77.5, y: 36, w: 3, h: 18, z: 2, passive: true},
    {id: 'c1', type: 'bar', x: 30, y: 26, w: 18, h: 3, z: 2, passive: true},
    {id: 'c2', type: 'bar', x: 70, y: 26, w: 18, h: 3, z: 2, passive: true},
    {id: 'x1', type: 'xmark', x: 30, y: 34, w: 9, z: 1, passive: true},
    {id: 'x2', type: 'xmark', x: 70, y: 34, w: 9, z: 1, passive: true},
    {id: 'ca', type: 'chest', x: 40, y: 72, w: 9, h: 8.1, z: 5, props: {color: 'yellow'}},
    {id: 'cb', type: 'chest', x: 62, y: 90, w: 9, h: 8.1, z: 5, props: {color: 'teal'}},
    {id: 'ruli', type: 'ruli', x: 50, y: 104, w: 8.5, h: 9.5, z: 8, behaviors: {draggable: {}, character: {}, pushes: {ids: ['ca', 'cb'], solids: ['t1', 't2', 't3', 'n1', 'n2', 'n3', 'n4', 'c1', 'c2']}}}
  ],
  reactions: [
    {on: 'tap', target: 'ca', cooldown: 800, 'do': [{fx: 'shake'}, {say: 'FB_HEAVY_PUSH'}]},
    {on: 'tap', target: 'cb', cooldown: 800, 'do': [{fx: 'shake'}, {say: 'FB_HEAVY_PUSH'}]}
  ],
  win: {type: 'any', of: [[{type: 'inside', objects: ['ca'], container: 'x1'}, {type: 'inside', objects: ['cb'], container: 'x2'}], [{type: 'inside', objects: ['ca'], container: 'x2'}, {type: 'inside', objects: ['cb'], container: 'x1'}]]},
  onWin: [{fx: 'squash', target: 'ca'}, {fx: 'squash', target: 'cb'}, {expr: 'happy', target: 'ruli'}]
});
