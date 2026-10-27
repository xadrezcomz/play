// FASE 263 — CHEGUE À BANDEIRA · as setas estão trocadas: a da esquerda leva para a direita.
RULES.registerLevel({
  id: 263, chapter: 27,
  instruction: 'LEVEL_263_TITLE',
  hints: ['LEVEL_263_HINT_1', 'LEVEL_263_HINT_2', 'LEVEL_263_HINT_3'],
  objects: [
    {id: 'floor', type: 'platform', x: 50, y: 92, w: 100, h: 12, z: 0, passive: true},
    {id: 'flag', type: 'flag', x: 86, y: 78, w: 8, h: 12, z: 1, passive: true},
    {id: 'ruli', type: 'ruli', x: 30, y: 79, w: 12, h: 13.5, z: 3, passive: true},
    {id: 'left', type: 'arrow', x: 34, y: 108, w: 16, h: 9.6, z: 3, rot: 180, props: {color: 'blue'}},
    {id: 'right', type: 'arrow', x: 66, y: 108, w: 16, h: 9.6, z: 3, props: {color: 'blue'}}
  ],
  reactions: [
    {on: 'tap', target: 'right', 'do': [{move: 'ruli', by: [-12, 0], ms: 200}, {sound: 'tap'}]},
    {on: 'tap', target: 'left', 'do': [{move: 'ruli', by: [12, 0], ms: 200}, {sound: 'tap'}]},
    {on: 'tap', target: 'ruli', cooldown: 700, 'do': [{say: 'FB_USE_ARROWS'}]}
  ],
  triggers: [
    {when: {type: 'pos', target: 'ruli', maxX: 6}, once: false, 'do': [{reset: 'ruli'}, {fail: 'FB_WRONG_WAY'}]}
  ],
  win: {type: 'touching', a: 'ruli', b: 'flag'},
  onWin: [{expr: 'happy', target: 'ruli'}]
});
