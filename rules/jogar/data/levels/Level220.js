// FASE 220 — SAIA DA SALA · a senha do cadeado: as horas do relógio, o número atrás do quadro e quantas bolas tem na caixa.
RULES.registerLevel({
  id: 220, chapter: 22,
  instruction: 'LEVEL_220_TITLE',
  hints: ['LEVEL_220_HINT_1', 'LEVEL_220_HINT_2', 'LEVEL_220_HINT_3'],
  objects: [
    {id: 'floor', type: 'platform', x: 50, y: 110, w: 100, h: 12, z: 0, passive: true},
    {id: 'doorway', type: 'doorway', x: 84, y: 80, w: 20, h: 42, z: 1, passive: true},
    {id: 'door', type: 'door', x: 84, y: 80, w: 18, h: 40, z: 2, passive: true},
    {id: 'lock', type: 'lock', x: 84, y: 78, w: 9, h: 11, z: 3, passive: true},
    {id: 'clock', type: 'clock', x: 20, y: 34, w: 18, z: 1, passive: true, props: {numbers: true}},
    {id: 'hh', type: 'hand', x: 20, y: 34, w: 18, z: 2, passive: true, rot: 210, props: {len: 22, width: 7, color: 'coral'}},
    {id: 'hm', type: 'hand', x: 20, y: 34, w: 18, z: 2, passive: true, props: {len: 34, width: 4}},
    {id: 'five', type: 'number', x: 50, y: 34, w: 10, z: 1, passive: true, props: {n: 5, plain: true}},
    {id: 'pic', type: 'frame', x: 50, y: 34, w: 22, h: 18, z: 3, behaviors: {draggable: {}}},
    {id: 'b1', type: 'ball', x: 22, y: 64, w: 7, z: 1, passive: true, props: {color: 'coral'}},
    {id: 'b2', type: 'ball', x: 30, y: 64, w: 7, z: 1, passive: true, props: {color: 'blue'}},
    {id: 'box', type: 'chest', x: 26, y: 64, w: 22, h: 18, z: 3, behaviors: {clickable: {toggle: 'open', fx: 'squash'}}},
    {id: 'i1', type: 'clock', x: 30, y: 86, w: 7, z: 1, passive: true},
    {id: 'i2', type: 'frame', x: 44, y: 86, w: 8, h: 6.4, z: 1, passive: true},
    {id: 'i3', type: 'ball', x: 58, y: 86, w: 6, z: 1, passive: true},
    {id: 'd1', type: 'number', x: 30, y: 98, w: 11, z: 3, state: {n: 0}, behaviors: {cycle: {}}},
    {id: 'd2', type: 'number', x: 44, y: 98, w: 11, z: 3, state: {n: 0}, behaviors: {cycle: {}}},
    {id: 'd3', type: 'number', x: 58, y: 98, w: 11, z: 3, state: {n: 0}, behaviors: {cycle: {}}}
  ],
  reactions: [
    {on: 'state', target: 'box', key: 'open', value: true, 'do': [{move: 'b1', by: [0, -10], ms: 250}, {move: 'b2', by: [0, -10], ms: 250}]},
    {on: 'state', target: 'box', key: 'open', value: false, 'do': [{move: 'b1', to: [22, 64], ms: 200}, {move: 'b2', to: [30, 64], ms: 200}]}
  ],
  win: [{type: 'state', target: 'd1', key: 'n', equals: 7}, {type: 'state', target: 'd2', key: 'n', equals: 5}, {type: 'state', target: 'd3', key: 'n', equals: 2}],
  onWin: [{state: 'lock', key: 'open', value: true}, {wait: 300}, {hide: 'lock'}, {move: 'door', by: [-14, 0], ms: 400}]
});
