// FASE 13 — ENCONTRE O MAIOR CÍRCULO · o maior "O" está na própria instrução.
RULES.registerLevel({
  id: 13, chapter: 2,
  instruction: 'LEVEL_013_TITLE',   // contém [[w_o|O]]
  hints: ['LEVEL_013_HINT_1', 'LEVEL_013_HINT_2', 'LEVEL_013_HINT_3'],
  objects: [
    { id: 'w_o', inText: true, cls: 'big-letter' },
    { id: 'c1', type: 'circle', x: 22, y: 30, w: 14, props: { color: 'blue' } },
    { id: 'c2', type: 'circle', x: 70, y: 40, w: 34, props: { color: 'coral' } },
    { id: 'c3', type: 'circle', x: 30, y: 72, w: 22, props: { color: 'yellow' } },
    { id: 'c4', type: 'circle', x: 76, y: 92, w: 18, props: { color: 'green' } },
    { id: 'c5', type: 'circle', x: 46, y: 104, w: 10, props: { color: 'purple' } }
  ],
  reactions: [
    { on: 'tap', target: 'c2', cooldown: 400, do: [{ fx: 'wobble' }, { fail: 'FB_BIGGER' }] },
    { on: 'tap', target: 'c1', do: [{ fx: 'wobble' }, { fail: true }] },
    { on: 'tap', target: 'c3', do: [{ fx: 'wobble' }, { fail: true }] },
    { on: 'tap', target: 'c4', do: [{ fx: 'wobble' }, { fail: true }] },
    { on: 'tap', target: 'c5', do: [{ fx: 'wobble' }, { fail: true }] }
  ],
  win: { type: 'tapped', target: 'w_o' },
  onWin: [{ fx: 'pop', target: 'w_o' }]
});
