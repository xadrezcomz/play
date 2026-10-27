// FASE 125 — COLOQUE CADA CAIXA NO SEU X · as caixas azul e vermelha têm X da mesma cor.
RULES.registerLevel({
  id: 125, chapter: 13,
  instruction: 'LEVEL_125_TITLE',
  hints: ['LEVEL_125_HINT_1', 'LEVEL_125_HINT_2', 'LEVEL_125_HINT_3'],
  objects: [
    {id: 'xb', type: 'xmark', x: 40, y: 38, w: 13, z: 1, passive: true, props: {color: 'blue'}},
    {id: 'xr', type: 'xmark', x: 84, y: 90, w: 13, z: 1, passive: true},
    {id: 'cb', type: 'chest', x: 40, y: 66, w: 14, h: 12.6, z: 5, props: {color: 'blue'}},
    {id: 'cr', type: 'chest', x: 58, y: 90, w: 14, h: 12.6, z: 5, props: {color: 'coral'}},
    {id: 'ruli', type: 'ruli', x: 16, y: 104, w: 12, h: 13.5, z: 8, behaviors: {draggable: {}, character: {}, pushes: {ids: ['cb', 'cr'], solids: []}}}
  ],
  reactions: [
    {on: 'tap', target: 'cb', cooldown: 800, 'do': [{fx: 'shake'}, {say: 'FB_HEAVY_PUSH'}]},
    {on: 'tap', target: 'cr', cooldown: 800, 'do': [{fx: 'shake'}, {say: 'FB_HEAVY_PUSH'}]}
  ],
  win: [{type: 'inside', objects: ['cb'], container: 'xb'}, {type: 'inside', objects: ['cr'], container: 'xr'}],
  onWin: [{fx: 'squash', target: 'cb'}, {fx: 'squash', target: 'cr'}, {expr: 'happy', target: 'ruli'}]
});
