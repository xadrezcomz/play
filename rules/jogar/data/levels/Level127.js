// FASE 127 — TODAS AS CAIXAS NO TAPETE · empurre as três para dentro do tapete.
RULES.registerLevel({
  id: 127, chapter: 13,
  instruction: 'LEVEL_127_TITLE',
  hints: ['LEVEL_127_HINT_1', 'LEVEL_127_HINT_2', 'LEVEL_127_HINT_3'],
  objects: [
    {id: 'rug', type: 'outline', x: 50, y: 92, w: 60, h: 26, z: 1, passive: true, props: {color: 'coral'}},
    {id: 'k1', type: 'chest', x: 22, y: 46, w: 14, h: 12.6, z: 5, props: {color: 'yellow'}},
    {id: 'k2', type: 'chest', x: 50, y: 40, w: 14, h: 12.6, z: 5, props: {color: 'green'}},
    {id: 'k3', type: 'chest', x: 78, y: 52, w: 14, h: 12.6, z: 5, props: {color: 'purple'}},
    {id: 'ruli', type: 'ruli', x: 50, y: 64, w: 12, h: 13.5, z: 8, behaviors: {draggable: {}, character: {}, pushes: {ids: ['k1', 'k2', 'k3'], solids: []}}}
  ],
  reactions: [
    {on: 'tap', target: 'k1', cooldown: 800, 'do': [{fx: 'shake'}, {say: 'FB_HEAVY_PUSH'}]},
    {on: 'tap', target: 'k2', cooldown: 800, 'do': [{fx: 'shake'}, {say: 'FB_HEAVY_PUSH'}]},
    {on: 'tap', target: 'k3', cooldown: 800, 'do': [{fx: 'shake'}, {say: 'FB_HEAVY_PUSH'}]}
  ],
  win: {type: 'count', objects: ['k1', 'k2', 'k3'], container: 'rug', min: 3},
  onWin: [{fx: 'squash', target: 'k1'}, {fx: 'squash', target: 'k2'}, {fx: 'squash', target: 'k3'}]
});
