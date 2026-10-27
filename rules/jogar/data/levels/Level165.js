// FASE 165 — TOQUE NA LUA · é de dia; espere a noite chegar.
RULES.registerLevel({
  id: 165, chapter: 17,
  instruction: 'LEVEL_165_TITLE',
  hints: ['LEVEL_165_HINT_1', 'LEVEL_165_HINT_2', 'LEVEL_165_HINT_3'],
  objects: [
    {id: 'sky', type: 'sky', x: 50, y: 64, w: 92, h: 80, z: 1},
    {id: 'sun', type: 'sun', x: 70, y: 40, w: 20, z: 2, passive: true},
    {id: 'moon', type: 'moon', x: 30, y: 44, w: 16, z: 2, hidden: true},
    {id: 'ctl', type: 'marker', x: 0, y: 0, w: 1, passive: true, behaviors: {timer: {delay: 5000, times: 1, 'do': [{move: 'sun', to: [70, 120], ms: 1200}, {state: 'sky', key: 'night', value: true}, {show: 'moon'}]}}}
  ],
  reactions: [
    {on: 'tap', target: 'sky', cooldown: 900, unless: {type: 'state', target: 'sky', key: 'night'}, 'do': [{say: 'FB_ALREADY_DAY'}]}
  ],
  win: {type: 'tapped', target: 'moon'},
  onWin: [{fx: 'pop', target: 'moon'}]
});
