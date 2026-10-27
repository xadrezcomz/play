// FASE 214 — ENTRE NO CÍRCULO · gire o anel até a abertura ficar virada para o Ruli.
RULES.registerLevel({
  id: 214, chapter: 22,
  instruction: 'LEVEL_214_TITLE',
  hints: ['LEVEL_214_HINT_1', 'LEVEL_214_HINT_2', 'LEVEL_214_HINT_3'],
  objects: [
    {id: 'floor', type: 'platform', x: 50, y: 110, w: 100, h: 12, z: 0, passive: true},
    {id: 'star', type: 'star', x: 62, y: 70, w: 10, z: 1, passive: true},
    {id: 'ring', type: 'ring', x: 62, y: 70, w: 40, z: 2, behaviors: {rotatable: {snap: 90}}},
    {id: 'ruli', type: 'ruli', x: 16, y: 72, w: 12, h: 13.5, z: 4, passive: true}
  ],
  reactions: [
    {on: 'tap', target: 'ring', cooldown: 700, 'do': [{fx: 'wobble'}, {say: 'FB_TURN_IT'}]}
  ],
  win: {type: 'state', target: 'ring', key: 'angle', equals: 270},
  onWin: [{move: 'ruli', to: [52, 72], ms: 500, await: true}, {expr: 'happy', target: 'ruli'}, {fx: 'pop', target: 'star'}]
});
