// FASE 177 — FAÇA A ESTRELA CAIR NA CESTA · coloque a cesta embaixo e tire a prateleira.
RULES.registerLevel({
  id: 177, chapter: 18,
  instruction: 'LEVEL_177_TITLE',
  hints: ['LEVEL_177_HINT_1', 'LEVEL_177_HINT_2', 'LEVEL_177_HINT_3'],
  objects: [
    {id: 'ground', type: 'platform', x: 50, y: 113, w: 100, h: 14, z: 1, passive: true},
    {id: 'shelf', type: 'shelf', x: 62, y: 48, w: 28, h: 6, z: 2, behaviors: {draggable: {}}},
    {id: 'star', type: 'star', x: 62, y: 40, w: 10, z: 3, behaviors: {gravity: {solids: ['shelf', 'basket', 'ground']}}},
    {id: 'basket', type: 'basket', x: 20, y: 98, w: 22, h: 15, z: 4, behaviors: {draggable: {axis: 'x', minX: 12, maxX: 88}}}
  ],
  reactions: [
    {on: 'tap', target: 'star', cooldown: 700, 'do': [{fx: 'shake'}, {say: 'FB_TOO_HIGH_UP'}]}
  ],
  win: [{type: 'touching', a: 'star', b: 'basket', pad: 1.5}, {type: 'state', target: 'star', key: 'landed'}, {type: 'pos', target: 'star', minY: 80}],
  onWin: [{fx: 'squash', target: 'basket'}]
});
