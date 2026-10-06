// FASE 56 — NÃO TOQUE NA ESTRELA · tire o "NÃO" da frase e toque.
RULES.registerLevel({
  id: 56, chapter: 6,
  instruction: 'LEVEL_056_TITLE',   // "[[w_not|NÃO]] TOQUE NA ESTRELA"
  hints: ['LEVEL_056_HINT_1', 'LEVEL_056_HINT_2', 'LEVEL_056_HINT_3'],
  objects: [
    { id: 'w_not', inText: true, behaviors: { draggable: {} } },
    { id: 'star', type: 'star', x: 50, y: 64, w: 22, z: 3, behaviors: { clickable: {} } }
  ],
  reactions: [
    { on: 'tap', target: 'star', unless: { type: 'text', target: 'w_not', mode: 'outside' },
      do: [{ forget: 'star' }, { fail: 'FB_NOT_ALLOWED' }] }
  ],
  win: [{ type: 'text', target: 'w_not', mode: 'outside' }, { type: 'tapped', target: 'star' }],
  onWin: [{ fx: 'pop', target: 'star' }]
});
