// FASE 178 — EMPILHE DO MAIOR PARA O MENOR · o grande embaixo, o pequeno em cima.
RULES.registerLevel({
  id: 178, chapter: 18,
  instruction: 'LEVEL_178_TITLE',
  hints: ['LEVEL_178_HINT_1', 'LEVEL_178_HINT_2', 'LEVEL_178_HINT_3'],
  objects: [
    {id: 'ground', type: 'platform', x: 50, y: 113, w: 100, h: 14, z: 1, passive: true},
    {id: 's', type: 'cube', x: 74, y: 101.0, w: 10, z: 4, props: {color: 'yellow'}, behaviors: {draggable: {}, gravity: {solids: ['ground', 'm', 'b']}}},
    {id: 'm', type: 'cube', x: 26, y: 98.5, w: 15, z: 4, props: {color: 'teal'}, behaviors: {draggable: {}, gravity: {solids: ['ground', 's', 'b']}}},
    {id: 'b', type: 'cube', x: 50, y: 96.0, w: 20, z: 4, props: {color: 'purple'}, behaviors: {draggable: {}, gravity: {solids: ['ground', 's', 'm']}}}
  ],
  triggers: [
    {when: {type: 'any', of: [{type: 'stacked', ids: ['m', 's', 'b']}, {type: 'stacked', ids: ['b', 'm', 's']}, {type: 'stacked', ids: ['s', 'b', 'm']}]}, once: false, 'do': [{wait: 300}, {fail: 'FB_ORDER'}]}
  ],
  win: [{type: 'stacked', ids: ['s', 'm', 'b']}, {type: 'state', target: 's', key: 'landed'}],
  onWin: [{fx: 'pop', target: 's'}]
});
