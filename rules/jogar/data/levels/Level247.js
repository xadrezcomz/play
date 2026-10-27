// FASE 247 — AGORA SÃO 10 HORAS. COLOQUE O RELÓGIO DAQUI A 5 HORAS · 10 + 5 = 15, ou seja, 3 horas.
RULES.registerLevel({
  id: 247, chapter: 25,
  instruction: 'LEVEL_247_TITLE',
  hints: ['LEVEL_247_HINT_1', 'LEVEL_247_HINT_2', 'LEVEL_247_HINT_3'],
  objects: [
    {id: 'clock', type: 'clock', x: 50, y: 66, w: 60, z: 1, passive: true, props: {numbers: true}},
    {id: 'minute', type: 'hand', x: 50, y: 66, w: 60, z: 2, passive: true, props: {len: 40, width: 4}},
    {id: 'hour', type: 'hand', x: 50, y: 66, w: 42, z: 3, rot: 300, props: {len: 30, width: 8, color: 'coral'}, behaviors: {rotatable: {snap: 30}}}
  ],
  triggers: [
    {when: {type: 'state', target: 'hour', key: 'angle', equals: 150}, 'do': [{say: 'FB_THINK_AGAIN'}]}
  ],
  win: {type: 'state', target: 'hour', key: 'angle', equals: 90},
  onWin: [{fx: 'pop', target: 'clock'}]
});
