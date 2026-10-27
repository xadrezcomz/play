// FASE 170 — ESPERE O NÚMERO CHEGAR A 0 · demora muito; adiante o relógio girando o ponteiro.
RULES.registerLevel({
  id: 170, chapter: 17,
  instruction: 'LEVEL_170_TITLE',
  hints: ['LEVEL_170_HINT_1', 'LEVEL_170_HINT_2', 'LEVEL_170_HINT_3'],
  objects: [
    {id: 'n', type: 'display', x: 50, y: 36, w: 34, h: 17, z: 2, passive: true, state: {n: 30}},
    {id: 'clock', type: 'clock', x: 50, y: 80, w: 44, z: 1, passive: true},
    {id: 'hand', type: 'hand', x: 50, y: 80, w: 44, z: 2, props: {len: 36, width: 6}, behaviors: {rotatable: {}}},
    {id: 'ctl', type: 'marker', x: 0, y: 0, w: 1, passive: true, behaviors: {timer: {every: 2000, 'do': [{add: 'n', key: 'n', by: -1, min: 0}]}}}
  ],
  reactions: [
    {on: 'rotate', target: 'hand', 'do': [{add: 'n', key: 'n', by: -0.25, min: 0}]}
  ],
  triggers: [
    {when: {type: 'idle', seconds: 8}, 'do': [{say: 'FB_SLOW_TIME'}]}
  ],
  win: {type: 'state', target: 'n', key: 'n', max: 0},
  onWin: [{fx: 'pop', target: 'n'}]
});
