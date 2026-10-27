// FASE 209 — DÊ A BANANA PARA O RULI · ele só come descascada: deslize o dedo para baixo na banana.
RULES.registerLevel({
  id: 209, chapter: 21,
  instruction: 'LEVEL_209_TITLE',
  hints: ['LEVEL_209_HINT_1', 'LEVEL_209_HINT_2', 'LEVEL_209_HINT_3'],
  objects: [
    {id: 'banana', type: 'banana', x: 30, y: 56, w: 26, h: 16, z: 4, behaviors: {draggable: {requires: {peeled: true}}}},
    {id: 'ruli', type: 'ruli', x: 68, y: 90, w: 18, h: 20, z: 3, behaviors: {receives: {from: ['banana'], consume: true, set: {fed: true}}}}
  ],
  reactions: [
    {on: 'locked', target: 'banana', cooldown: 900, 'do': [{say: 'FB_PEEL_FIRST'}]},
    {on: 'swipe', target: 'banana', dir: 'down', 'do': [{state: 'banana', key: 'peeled', value: true}, {sound: 'whoosh'}]},
    {on: 'tap', target: 'ruli', cooldown: 700, 'do': [{fx: 'hop'}, {say: 'FB_HUNGRY'}]}
  ],
  win: {type: 'state', target: 'ruli', key: 'fed'},
  onWin: [{expr: 'happy', target: 'ruli'}, {fx: 'hop', target: 'ruli'}]
});
