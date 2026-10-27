// FASE 201 — FAÇA UM SANDUÍCHE · pão embaixo, queijo no meio, pão em cima.
RULES.registerLevel({
  id: 201, chapter: 21,
  instruction: 'LEVEL_201_TITLE',
  hints: ['LEVEL_201_HINT_1', 'LEVEL_201_HINT_2', 'LEVEL_201_HINT_3'],
  objects: [
    {id: 'plate', type: 'bar', x: 50, y: 100, w: 46, h: 4, z: 1, passive: true, props: {color: '#E5E1D8'}},
    {id: 's1', type: 'marker', x: 50, y: 95, w: 4, z: 0, passive: true},
    {id: 's2', type: 'marker', x: 50, y: 89.5, w: 4, z: 0, passive: true},
    {id: 's3', type: 'marker', x: 50, y: 84, w: 4, z: 0, passive: true},
    {id: 'b1', type: 'plank', x: 22, y: 46, w: 32, h: 6, z: 4, props: {color: '#D9A066'}, behaviors: {draggable: {}, snap: {to: ['s1', 's2', 's3'], tol: 7}}},
    {id: 'b2', type: 'plank', x: 78, y: 46, w: 32, h: 6, z: 4, props: {color: '#D9A066'}, behaviors: {draggable: {}, snap: {to: ['s1', 's2', 's3'], tol: 7}}},
    {id: 'cheese', type: 'plank', x: 50, y: 62, w: 30, h: 4.5, z: 5, props: {color: 'yellow'}, behaviors: {draggable: {}, snap: {to: ['s1', 's2', 's3'], tol: 7}}}
  ],
  reactions: [
    {on: 'snapped', target: 'cheese', when: {type: 'not', of: {type: 'state', target: 'cheese', key: 'at', equals: 's2'}}, cooldown: 600, 'do': [{say: 'FB_CHEESE_MIDDLE'}]}
  ],
  win: [{type: 'state', target: 'cheese', key: 'at', equals: 's2'}, {type: 'any', of: [[{type: 'state', target: 'b1', key: 'at', equals: 's1'}, {type: 'state', target: 'b2', key: 'at', equals: 's3'}], [{type: 'state', target: 'b1', key: 'at', equals: 's3'}, {type: 'state', target: 'b2', key: 'at', equals: 's1'}]]}],
  onWin: [{fx: 'pop', target: 'cheese'}]
});
