// FASE 52 — TENTE OUTRA VEZ · na primeira vez não há nada; ao reiniciar, aparece a estrela.
RULES.registerLevel({
  id: 52, chapter: 6,
  instruction: 'LEVEL_052_TITLE',
  hints: ['LEVEL_052_HINT_1', 'LEVEL_052_HINT_2', 'LEVEL_052_HINT_3'],
  objects: [
    { id: 'chest', type: 'chest', x: 50, y: 70, w: 40, h: 36, z: 3 },
    { id: 'star', type: 'star', x: 50, y: 36, w: 16, z: 5, minAttempt: 2, behaviors: { clickable: {} } }
  ],
  reactions: [
    { on: 'tap', target: 'chest', cooldown: 600, do: [{ fx: 'shake' }, { fail: 'FB_LOCKED' }] }
  ],
  win: { type: 'tapped', target: 'star' },
  onWin: [{ fx: 'pop', target: 'star' }]
});
