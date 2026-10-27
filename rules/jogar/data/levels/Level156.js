// FASE 156 — COMECE O SHOW · a cortina abre puxando a corda.
RULES.registerLevel({
  id: 156, chapter: 16,
  instruction: 'LEVEL_156_TITLE',
  hints: ['LEVEL_156_HINT_1', 'LEVEL_156_HINT_2', 'LEVEL_156_HINT_3'],
  objects: [
    {id: 'stage', type: 'bar', x: 50, y: 98, w: 84, h: 10, z: 1, passive: true, props: {color: 'wood'}},
    {id: 'ruli', type: 'ruli', x: 50, y: 82, w: 16, h: 18, z: 2, passive: true, state: {expr: 'sleepy'}},
    {id: 'curtain', type: 'curtain', x: 50, y: 70, w: 84, h: 56, z: 3},
    {id: 'rope', type: 'rope', x: 92, y: 56, w: 5, h: 30, z: 4, behaviors: {draggable: {axis: 'y', minY: 56, maxY: 80, returnOnDrop: true}}}
  ],
  reactions: [
    {on: 'tap', target: 'curtain', cooldown: 700, 'do': [{fx: 'wiggle'}, {say: 'FB_PULL'}]},
    {on: 'swipe', target: 'curtain', cooldown: 700, 'do': [{fx: 'wiggle'}, {say: 'FB_PULL'}]},
    {on: 'dragmove', target: 'rope', when: {type: 'moved', target: 'rope', distance: 14}, unless: {type: 'state', target: 'curtain', key: 'open'}, 'do': [{state: 'curtain', key: 'open', value: true}, {sound: 'whoosh'}]}
  ],
  win: {type: 'state', target: 'curtain', key: 'open'},
  onWin: [{expr: 'happy', target: 'ruli'}, {fx: 'hop', target: 'ruli'}]
});
