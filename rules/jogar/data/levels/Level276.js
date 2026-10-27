// FASE 276 — LEVE TODOS PARA DENTRO DE CASA · os amigos seguem o Ruli em fila.
RULES.registerLevel({
  id: 276, chapter: 28,
  instruction: 'LEVEL_276_TITLE',
  hints: ['LEVEL_276_HINT_1', 'LEVEL_276_HINT_2', 'LEVEL_276_HINT_3'],
  objects: [
    {id: 'house', type: 'outline', x: 74, y: 52, w: 46, h: 40, z: 0, passive: true, props: {color: 'coral'}},
    {id: 'roof', type: 'triangle', x: 74, y: 25, w: 50, h: 14, z: 0, passive: true, props: {color: 'coral'}},
    {id: 'ruli', type: 'ruli', x: 40, y: 96, w: 11, h: 12.32, z: 4, props: {color: 'teal'}, behaviors: {draggable: {}, character: {}}},
    {id: 'g1', type: 'ruli', x: 28, y: 96, w: 11, h: 12.32, z: 4, props: {color: 'pink'}, behaviors: {follows: {target: 'ruli', gap: 7, speed: 0.08}}},
    {id: 'g2', type: 'ruli', x: 18, y: 96, w: 11, h: 12.32, z: 4, props: {color: 'yellow'}, behaviors: {follows: {target: 'g1', gap: 7, speed: 0.08}}},
    {id: 'g3', type: 'ruli', x: 8, y: 96, w: 11, h: 12.32, z: 4, props: {color: 'purple'}, behaviors: {follows: {target: 'g2', gap: 7, speed: 0.08}}}
  ],
  reactions: [
    {on: 'tap', target: 'g1', cooldown: 700, 'do': [{fx: 'hop'}, {say: 'FB_FOLLOW_RULI'}]},
    {on: 'tap', target: 'g2', cooldown: 700, 'do': [{fx: 'hop'}, {say: 'FB_FOLLOW_RULI'}]},
    {on: 'tap', target: 'g3', cooldown: 700, 'do': [{fx: 'hop'}, {say: 'FB_FOLLOW_RULI'}]}
  ],
  win: {type: 'count', objects: ['ruli', 'g1', 'g2', 'g3'], container: 'house', min: 4},
  onWin: [{expr: 'happy', target: 'ruli'}, {expr: 'happy', target: 'g1'}, {expr: 'happy', target: 'g2'}, {expr: 'happy', target: 'g3'}]
});
