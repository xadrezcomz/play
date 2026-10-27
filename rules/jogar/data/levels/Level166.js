// FASE 166 — PARE NO 5 · o número conta sozinho; toque nele quando chegar no 5.
RULES.registerLevel({
  id: 166, chapter: 17,
  instruction: 'LEVEL_166_TITLE',
  hints: ['LEVEL_166_HINT_1', 'LEVEL_166_HINT_2', 'LEVEL_166_HINT_3'],
  objects: [
    {id: 'n', type: 'number', x: 50, y: 62, w: 34, z: 2, state: {n: 1}, props: {color: 'blue'}},
    {id: 'ctl', type: 'marker', x: 0, y: 0, w: 1, passive: true, behaviors: {timer: {every: 520, 'do': [{add: 'n', key: 'n', by: 1, wrap: 10}]}}}
  ],
  reactions: [
    {on: 'tap', target: 'n', unless: {type: 'state', target: 'n', key: 'n', equals: 5}, 'do': [{forget: 'n'}, {fx: 'shake'}, {fail: 'FB_MISSED'}]}
  ],
  win: [{type: 'tapped', target: 'n'}, {type: 'state', target: 'n', key: 'n', equals: 5}],
  onWin: [{fx: 'pop', target: 'n'}]
});
