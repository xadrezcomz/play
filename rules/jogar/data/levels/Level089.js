// FASE 89 — TOQUE NA CAIXA MAIS PESADA · são iguais por fora; a balança conta a verdade.
RULES.registerLevel({
  id: 89, chapter: 9,
  instruction: 'LEVEL_089_TITLE',
  hints: ['LEVEL_089_HINT_1', 'LEVEL_089_HINT_2', 'LEVEL_089_HINT_3'],
  objects: [
    { id: 'post', type: 'stick', x: 50, y: 76, w: 3, h: 30, z: 1, passive: true, props: { color: '#9AA0B4' } },
    { id: 'beam', type: 'plank', x: 50, y: 60, w: 64, h: 3, z: 2, passive: true, props: { color: '#7D8597' },
      behaviors: { balance: { left: 'panL', right: 'panR', ids: ['a', 'b', 'c'] } } },
    { id: 'panL', type: 'basket', x: 22, y: 68, w: 24, h: 16, z: 3, passive: true, behaviors: { container: {} } },
    { id: 'panR', type: 'basket', x: 78, y: 68, w: 24, h: 16, z: 3, passive: true, behaviors: { container: {} } },
    { id: 'a', type: 'cube', x: 26, y: 104, w: 12, z: 5, props: { color: 'yellow', weight: 1 }, behaviors: { draggable: {} } },
    { id: 'b', type: 'cube', x: 50, y: 104, w: 12, z: 5, props: { color: 'yellow', weight: 2 }, behaviors: { draggable: {} } },
    { id: 'c', type: 'cube', x: 74, y: 104, w: 12, z: 5, props: { color: 'yellow', weight: 1 }, behaviors: { draggable: {} } }
  ],
  reactions: [
    { on: 'tap', target: 'a', cooldown: 400, do: [{ fx: 'shake' }, { fail: 'FB_LIGHT' }] },
    { on: 'tap', target: 'c', cooldown: 400, do: [{ fx: 'shake' }, { fail: 'FB_LIGHT' }] }
  ],
  win: { type: 'tapped', target: 'b' },
  onWin: [{ fx: 'pop', target: 'b' }]
});
