// FASE 213 — ABRA A PORTA · a senha está atrás do quadro.
RULES.registerLevel({
  id: 213, chapter: 22,
  instruction: 'LEVEL_213_TITLE',
  hints: ['LEVEL_213_HINT_1', 'LEVEL_213_HINT_2', 'LEVEL_213_HINT_3'],
  objects: [
    {id: 'floor', type: 'platform', x: 50, y: 110, w: 100, h: 12, z: 0, passive: true},
    {id: 'doorway', type: 'doorway', x: 78, y: 80, w: 22, h: 44, z: 1, passive: true},
    {id: 'door', type: 'door', x: 78, y: 80, w: 20, h: 42, z: 2, passive: true},
    {id: 'code', type: 'word', textKey: 'LEVEL_213_CODE', fontU: 6, x: 28, y: 44, z: 1, passive: true},
    {id: 'pic', type: 'frame', x: 28, y: 44, w: 30, h: 24, z: 3, behaviors: {draggable: {}}},
    {id: 'd1', type: 'number', x: 22, y: 86, w: 12, z: 3, state: {n: 0}, behaviors: {cycle: {}}},
    {id: 'd2', type: 'number', x: 36, y: 86, w: 12, z: 3, state: {n: 0}, behaviors: {cycle: {}}},
    {id: 'd3', type: 'number', x: 50, y: 86, w: 12, z: 3, state: {n: 0}, behaviors: {cycle: {}}}
  ],
  reactions: [
    {on: 'tap', target: 'door', cooldown: 700, 'do': [{fx: 'shake'}, {say: 'FB_LOCKED'}]}
  ],
  win: [{type: 'state', target: 'd1', key: 'n', equals: 4}, {type: 'state', target: 'd2', key: 'n', equals: 7}, {type: 'state', target: 'd3', key: 'n', equals: 2}],
  onWin: [{move: 'door', by: [-14, 0], ms: 400}]
});
