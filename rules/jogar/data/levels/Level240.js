// FASE 240 — ENCONTRE TODOS OS PARES · oito cartas: memória total.
RULES.registerLevel({
  id: 240, chapter: 24,
  instruction: 'LEVEL_240_TITLE',
  hints: ['LEVEL_240_HINT_1', 'LEVEL_240_HINT_2', 'LEVEL_240_HINT_3'],
  objects: [
    {id: 'm0', type: 'mcard', x: 20.0, y: 48.0, w: 15, h: 20.0, z: 3, props: {sym: 'heart', symColor: 'coral'}},
    {id: 'm1', type: 'mcard', x: 40.0, y: 48.0, w: 15, h: 20.0, z: 3, props: {sym: 'apple', symColor: 'green'}},
    {id: 'm2', type: 'mcard', x: 60.0, y: 48.0, w: 15, h: 20.0, z: 3, props: {sym: 'moon', symColor: null}},
    {id: 'm3', type: 'mcard', x: 80.0, y: 48.0, w: 15, h: 20.0, z: 3, props: {sym: 'apple', symColor: 'green'}},
    {id: 'm4', type: 'mcard', x: 20.0, y: 73.0, w: 15, h: 20.0, z: 3, props: {sym: 'star', symColor: 'yellow'}},
    {id: 'm5', type: 'mcard', x: 40.0, y: 73.0, w: 15, h: 20.0, z: 3, props: {sym: 'heart', symColor: 'coral'}},
    {id: 'm6', type: 'mcard', x: 60.0, y: 73.0, w: 15, h: 20.0, z: 3, props: {sym: 'moon', symColor: null}},
    {id: 'm7', type: 'mcard', x: 80.0, y: 73.0, w: 15, h: 20.0, z: 3, props: {sym: 'star', symColor: 'yellow'}},
    {id: 'ctl', type: 'marker', x: 0, y: 0, w: 1, passive: true, behaviors: {pairs: {cards: ['m0', 'm1', 'm2', 'm3', 'm4', 'm5', 'm6', 'm7']}}}
  ],
  win: {type: 'state', target: 'ctl', key: 'done'},
  onWin: [{fx: 'pop', target: 'm0'}, {fx: 'pop', target: 'm1'}, {fx: 'pop', target: 'm2'}, {fx: 'pop', target: 'm3'}, {fx: 'pop', target: 'm4'}, {fx: 'pop', target: 'm5'}, {fx: 'pop', target: 'm6'}, {fx: 'pop', target: 'm7'}]
});
