// FASE 153 — COLOQUE A MAÇÃ NA CESTA · a maçã está no alto: sacuda a árvore.
RULES.registerLevel({
  id: 153, chapter: 16,
  instruction: 'LEVEL_153_TITLE',
  hints: ['LEVEL_153_HINT_1', 'LEVEL_153_HINT_2', 'LEVEL_153_HINT_3'],
  objects: [
    {id: 'ground', type: 'platform', x: 50, y: 113, w: 100, h: 14, z: 1, passive: true},
    {id: 'tree', type: 'tree', x: 40, y: 70, w: 52, h: 72, z: 2, behaviors: {rubbable: {count: 10, set: {shaken: true}}}},
    {id: 'branch', type: 'marker', x: 40, y: 52, w: 10, h: 2, z: 0, passive: true},
    {id: 'apple', type: 'apple', x: 40, y: 47, w: 9, z: 4, behaviors: {draggable: {requires: {fallen: true}}, gravity: {solids: ['branch', 'ground']}}},
    {id: 'basket', type: 'basket', x: 82, y: 99, w: 24, h: 16, z: 3, behaviors: {container: {}}}
  ],
  reactions: [
    {on: 'locked', target: 'apple', cooldown: 900, 'do': [{say: 'FB_TOO_HIGH_UP'}]},
    {on: 'tap', target: 'apple', unless: {type: 'state', target: 'apple', key: 'fallen'}, cooldown: 900, 'do': [{fx: 'shake'}, {say: 'FB_TOO_HIGH_UP'}]},
    {on: 'state', target: 'tree', key: 'shaken', 'do': [{hide: 'branch'}, {fx: 'wiggle', target: 'tree'}]},
    {on: 'landed', target: 'apple', when: {type: 'pos', target: 'apple', minY: 90}, 'do': [{state: 'apple', key: 'fallen', value: true}]}
  ],
  win: {type: 'inside', objects: ['apple'], container: 'basket'},
  onWin: [{fx: 'squash', target: 'basket'}]
});
