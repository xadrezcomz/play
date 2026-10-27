// FASE 238 — QUANTAS ESTRELAS VOCÊ VIU? · eram 7, antes da nuvem cobrir.
RULES.registerLevel({
  id: 238, chapter: 24,
  instruction: 'LEVEL_238_TITLE',
  hints: ['LEVEL_238_HINT_1', 'LEVEL_238_HINT_2', 'LEVEL_238_HINT_3'],
  objects: [
    {id: 's0', type: 'star', x: 20, y: 40, w: 9, z: 2, passive: true},
    {id: 's1', type: 'star', x: 44, y: 36, w: 9, z: 2, passive: true},
    {id: 's2', type: 'star', x: 70, y: 42, w: 9, z: 2, passive: true},
    {id: 's3', type: 'star', x: 30, y: 60, w: 9, z: 2, passive: true},
    {id: 's4', type: 'star', x: 58, y: 58, w: 9, z: 2, passive: true},
    {id: 's5', type: 'star', x: 82, y: 64, w: 9, z: 2, passive: true},
    {id: 's6', type: 'star', x: 46, y: 78, w: 9, z: 2, passive: true},
    {id: 'cloud', type: 'cloud', x: 50, y: 56, w: 96, h: 56, z: 5, hidden: true, passive: true, state: {charge: 0.2}},
    {id: 'ans', type: 'display', x: 38, y: 102, w: 26, h: 13, z: 3, state: {n: 0}, behaviors: {cycle: {key: 'n'}}},
    {id: 'ok', type: 'button', x: 66, y: 102, w: 14, z: 3, props: {color: 'green'}},
    {id: 'ctl', type: 'marker', x: 0, y: 0, w: 1, passive: true, behaviors: {timer: {delay: 2600, times: 1, 'do': [{show: 'cloud'}]}}}
  ],
  reactions: [
    {on: 'tap', target: 'ok', unless: {type: 'state', target: 'ans', key: 'n', equals: 7}, 'do': [{forget: 'ok'}, {fx: 'shake', target: 'ans'}, {fail: 'FB_COUNT_AGAIN'}]}
  ],
  win: [{type: 'state', target: 'ans', key: 'n', equals: 7}, {type: 'tapped', target: 'ok'}],
  onWin: [{hide: 'cloud'}]
});
