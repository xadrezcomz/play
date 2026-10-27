// FASE 233 — ENCONTRE OS PARES · vire duas cartas; se forem iguais, ficam abertas.
RULES.registerLevel({
  id: 233, chapter: 24,
  instruction: 'LEVEL_233_TITLE',
  hints: ['LEVEL_233_HINT_1', 'LEVEL_233_HINT_2', 'LEVEL_233_HINT_3'],
  objects: [
    {id: 'm0', type: 'mcard', x: 37.5, y: 48.0, w: 20, h: 26.6, z: 3, props: {sym: 'heart', symColor: 'coral'}},
    {id: 'm1', type: 'mcard', x: 62.5, y: 48.0, w: 20, h: 26.6, z: 3, props: {sym: 'star', symColor: 'yellow'}},
    {id: 'm2', type: 'mcard', x: 37.5, y: 79.6, w: 20, h: 26.6, z: 3, props: {sym: 'heart', symColor: 'coral'}},
    {id: 'm3', type: 'mcard', x: 62.5, y: 79.6, w: 20, h: 26.6, z: 3, props: {sym: 'star', symColor: 'yellow'}},
    {id: 'ctl', type: 'marker', x: 0, y: 0, w: 1, passive: true, behaviors: {pairs: {cards: ['m0', 'm1', 'm2', 'm3']}}}
  ],
  win: {type: 'state', target: 'ctl', key: 'done'},
  onWin: [{fx: 'pop', target: 'm0'}, {fx: 'pop', target: 'm1'}, {fx: 'pop', target: 'm2'}, {fx: 'pop', target: 'm3'}]
});
