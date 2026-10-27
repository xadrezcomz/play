// FASE 191 — DÊ UMA MAÇÃ PARA O RULI · não há maçã: leve a palavra MAÇÃ até ele.
RULES.registerLevel({
  id: 191, chapter: 20,
  instruction: 'LEVEL_191_TITLE',
  hints: ['LEVEL_191_HINT_1', 'LEVEL_191_HINT_2', 'LEVEL_191_HINT_3'],
  objects: [
    {id: 'w_apple', inText: true, behaviors: {draggable: {}}},
    {id: 'tree', type: 'tree', x: 24, y: 72, w: 30, h: 48, z: 1, passive: true},
    {id: 'ruli', type: 'ruli', x: 66, y: 86, w: 18, h: 20, z: 3, state: {expr: 'thinking'}, behaviors: {receives: {from: ['w_apple'], consume: true, set: {fed: true}}}}
  ],
  reactions: [
    {on: 'tap', target: 'tree', cooldown: 700, 'do': [{fx: 'wiggle'}, {say: 'FB_NO_APPLES'}]},
    {on: 'tap', target: 'ruli', cooldown: 700, 'do': [{fx: 'hop'}, {say: 'FB_HUNGRY'}]}
  ],
  win: {type: 'state', target: 'ruli', key: 'fed'},
  onWin: [{expr: 'happy', target: 'ruli'}, {fx: 'hop', target: 'ruli'}]
});
