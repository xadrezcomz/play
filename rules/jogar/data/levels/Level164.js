// FASE 164 — ATRAVESSE A RUA · só com o sinal verde; no vermelho, o Ruli volta.
RULES.registerLevel({
  id: 164, chapter: 17,
  instruction: 'LEVEL_164_TITLE',
  hints: ['LEVEL_164_HINT_1', 'LEVEL_164_HINT_2', 'LEVEL_164_HINT_3'],
  objects: [
    {id: 'road', type: 'bar', x: 50, y: 90, w: 40, h: 30, z: 1, passive: true, props: {color: '#4A4E69'}},
    {id: 'stripe', type: 'bar', x: 50, y: 90, w: 40, h: 2, z: 1, passive: true, props: {color: '#FFFDF5'}},
    {id: 'light', type: 'traffic', x: 50, y: 44, w: 12, h: 28, z: 2, passive: true, state: {light: 'red'}},
    {id: 'ruli', type: 'ruli', x: 14, y: 90, w: 14, h: 16, z: 5, behaviors: {draggable: {axis: 'x', minX: 8, maxX: 92}, character: {}}},
    {id: 'ctl', type: 'marker', x: 0, y: 0, w: 1, passive: true, behaviors: {timer: {every: 400, delay: 2600, 'do': [{state: 'light', key: 'light', value: 'green'}, {wait: 2200}, {state: 'light', key: 'light', value: 'yellow'}, {wait: 700}, {state: 'light', key: 'light', value: 'red'}, {wait: 2600}]}}}
  ],
  reactions: [
    {on: 'dragmove', target: 'ruli', when: [{type: 'state', target: 'light', key: 'light', equals: 'red'}, {type: 'pos', target: 'ruli', minX: 28, maxX: 72}], cooldown: 800, 'do': [{drop: 'ruli'}, {fail: 'FB_RED_LIGHT'}, {reset: 'ruli', ms: 300}]}
  ],
  win: {type: 'pos', target: 'ruli', minX: 80},
  onWin: [{expr: 'happy', target: 'ruli'}, {fx: 'hop', target: 'ruli'}]
});
