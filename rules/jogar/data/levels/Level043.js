// FASE 43 — FAÇA OS DOIS LADOS FICAREM IGUAIS · os círculos não se mexem; a linha, sim.
RULES.registerLevel({
  id: 43, chapter: 5,
  instruction: 'LEVEL_043_TITLE',
  hints: ['LEVEL_043_HINT_1', 'LEVEL_043_HINT_2', 'LEVEL_043_HINT_3'],
  objects: [
    { id: 'line', type: 'divider', x: 80, y: 66, w: 4, h: 76, z: 6, behaviors: { draggable: { axis: 'x', minX: 6, maxX: 94 } } },
    { id: 'o1', type: 'circle', x: 12, y: 50, w: 11, props: { color: 'blue' } },
    { id: 'o2', type: 'circle', x: 25, y: 82, w: 11, props: { color: 'blue' } },
    { id: 'o3', type: 'circle', x: 38, y: 58, w: 11, props: { color: 'blue' } },
    { id: 'o4', type: 'circle', x: 54, y: 90, w: 11, props: { color: 'blue' } },
    { id: 'o5', type: 'circle', x: 67, y: 44, w: 11, props: { color: 'blue' } },
    { id: 'o6', type: 'circle', x: 89, y: 74, w: 11, props: { color: 'blue' } }
  ],
  reactions: [
    { on: 'tap', target: '+', cooldown: 700, do: [{ fx: 'wobble' }, { say: 'FB_FIXED' }] }
  ],
  win: { type: 'split', divider: 'line', ids: ['o1', 'o2', 'o3', 'o4', 'o5', 'o6'] },
  onWin: [{ fx: 'pop', target: 'line' }]
});
