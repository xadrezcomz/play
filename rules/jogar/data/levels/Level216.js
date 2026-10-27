// FASE 216 — ENTRE · bata três vezes na porta (três toques rápidos).
RULES.registerLevel({
  id: 216, chapter: 22,
  instruction: 'LEVEL_216_TITLE',
  hints: ['LEVEL_216_HINT_1', 'LEVEL_216_HINT_2', 'LEVEL_216_HINT_3'],
  objects: [
    {id: 'floor', type: 'platform', x: 50, y: 110, w: 100, h: 12, z: 0, passive: true},
    {id: 'doorway', type: 'doorway', x: 56, y: 80, w: 26, h: 50, z: 1, passive: true},
    {id: 'door', type: 'door', x: 56, y: 80, w: 24, h: 48, z: 2, passive: true},
    {id: 'knock', type: 'marker', x: 56, y: 80, w: 24, h: 48, z: 3, behaviors: {multitap: {n: 3, ms: 450}}}
  ],
  reactions: [
    {on: 'tap', target: 'knock', 'do': [{fx: 'shake', target: 'door'}, {sound: 'tap'}]},
    {on: 'multitap', target: 'knock', 'do': [{state: 'door', key: 'answered', value: true}, {say: 'FB_COME_IN'}]},
    {on: 'swipe', target: 'knock', cooldown: 700, 'do': [{say: 'FB_LOCKED'}]}
  ],
  win: {type: 'state', target: 'door', key: 'answered'},
  onWin: [{wait: 500}, {move: 'door', by: [-18, 0], ms: 400}]
});
