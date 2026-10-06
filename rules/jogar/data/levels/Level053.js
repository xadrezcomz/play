// FASE 53 — NÃO LEIA ISTO · cubra a instrução com o papel.
RULES.registerLevel({
  id: 53, chapter: 6,
  instruction: 'LEVEL_053_TITLE',
  hints: ['LEVEL_053_HINT_1', 'LEVEL_053_HINT_2', 'LEVEL_053_HINT_3'],
  objects: [
    { id: 'paper', type: 'paper', x: 50, y: 92, w: 80, h: 26, z: 5, behaviors: { draggable: {} } },
    { id: 'eye', type: 'circle', x: 50, y: 52, w: 18, z: 2, props: { color: 'blue' } }
  ],
  reactions: [
    { on: 'tap', target: 'eye', cooldown: 600, do: [{ fx: 'wobble' }, { say: 'FB_READING' }] }
  ],
  win: { type: 'text', target: 'paper', mode: 'covers' },
  onWin: [{ fx: 'pop', target: 'paper' }]
});
