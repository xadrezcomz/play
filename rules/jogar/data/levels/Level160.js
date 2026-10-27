// FASE 160 — PROTEJA O RULI DA CHUVA · desenhe um círculo em volta dele.
RULES.registerLevel({
  id: 160, chapter: 16,
  instruction: 'LEVEL_160_TITLE',
  hints: ['LEVEL_160_HINT_1', 'LEVEL_160_HINT_2', 'LEVEL_160_HINT_3'],
  draw: true,
  objects: [
    {id: 'cloud', type: 'cloud', x: 50, y: 30, w: 40, h: 24, z: 3, state: {raining: true, charge: 0.8}},
    {id: 'ruli', type: 'ruli', x: 50, y: 80, w: 16, h: 18, z: 2, state: {expr: 'confused'}},
    {id: 'shield', type: 'bubble', x: 50, y: 80, w: 32, z: 4, hidden: true, passive: true},
    {id: 'ctl', type: 'marker', x: 0, y: 0, w: 1, passive: true, behaviors: {encircle: {target: 'ruli', failSay: 'FB_ALMOST'}}}
  ],
  reactions: [
    {on: 'tap', target: 'ruli', cooldown: 700, 'do': [{fx: 'hop'}, {say: 'FB_WET'}]},
    {on: 'tap', target: 'cloud', cooldown: 700, 'do': [{fx: 'shake'}, {say: 'FB_CLOUD_STAYS'}]}
  ],
  win: {type: 'state', target: 'ctl', key: 'done'},
  onWin: [{show: 'shield'}, {expr: 'happy', target: 'ruli'}]
});
