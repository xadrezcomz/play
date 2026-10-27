// FASE 234 — ENCONTRE OS PARES · agora com seis cartas.
RULES.registerLevel({
  id: 234, chapter: 24,
  instruction: 'LEVEL_234_TITLE',
  hints: ['LEVEL_234_HINT_1', 'LEVEL_234_HINT_2', 'LEVEL_234_HINT_3'],
  objects: [
    {id: 'm0', type: 'mcard', x: 27.0, y: 48.0, w: 18, h: 23.9, z: 3, props: {sym: 'heart', symColor: 'coral'}},
    {id: 'm1', type: 'mcard', x: 50.0, y: 48.0, w: 18, h: 23.9, z: 3, props: {sym: 'star', symColor: 'yellow'}},
    {id: 'm2', type: 'mcard', x: 73.0, y: 48.0, w: 18, h: 23.9, z: 3, props: {sym: 'apple', symColor: 'green'}},
    {id: 'm3', type: 'mcard', x: 27.0, y: 76.9, w: 18, h: 23.9, z: 3, props: {sym: 'star', symColor: 'yellow'}},
    {id: 'm4', type: 'mcard', x: 50.0, y: 76.9, w: 18, h: 23.9, z: 3, props: {sym: 'apple', symColor: 'green'}},
    {id: 'm5', type: 'mcard', x: 73.0, y: 76.9, w: 18, h: 23.9, z: 3, props: {sym: 'heart', symColor: 'coral'}},
    {id: 'ctl', type: 'marker', x: 0, y: 0, w: 1, passive: true, behaviors: {pairs: {cards: ['m0', 'm1', 'm2', 'm3', 'm4', 'm5']}}}
  ],
  win: {type: 'state', target: 'ctl', key: 'done'},
  onWin: [{fx: 'pop', target: 'm0'}, {fx: 'pop', target: 'm1'}, {fx: 'pop', target: 'm2'}, {fx: 'pop', target: 'm3'}, {fx: 'pop', target: 'm4'}, {fx: 'pop', target: 'm5'}]
});
