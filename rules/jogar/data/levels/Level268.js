// FASE 268 — GIRE O RELÓGIO PARA TRÁS · uma volta inteira no sentido contrário.
RULES.registerLevel({
  id: 268, chapter: 27,
  instruction: 'LEVEL_268_TITLE',
  hints: ['LEVEL_268_HINT_1', 'LEVEL_268_HINT_2', 'LEVEL_268_HINT_3'],
  objects: [
    {id: 'clock', type: 'clock', x: 50, y: 66, w: 60, z: 1, passive: true, props: {numbers: true}},
    {id: 'hand', type: 'hand', x: 50, y: 66, w: 60, z: 2, props: {len: 40, width: 6}, behaviors: {rotatable: {}}}
  ],
  reactions: [
    {on: 'state', target: 'hand', key: 'spin', when: {type: 'state', target: 'hand', key: 'spin', min: 60}, cooldown: 1200, 'do': [{fail: 'FB_BACKWARDS_PLEASE'}]}
  ],
  win: {type: 'state', target: 'hand', key: 'spin', max: -340},
  onWin: [{fx: 'pop', target: 'clock'}]
});
