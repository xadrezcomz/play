// FASE 24 — ENCONTRE O AZUL · a única coisa azul é a palavra AZUL.
RULES.registerLevel({
  id: 24, chapter: 3,
  instruction: 'LEVEL_024_TITLE',   // contém [[w_blue|AZUL]]
  hints: ['LEVEL_024_HINT_1', 'LEVEL_024_HINT_2', 'LEVEL_024_HINT_3'],
  objects: [
    { id: 'w_blue', inText: true, cls: 'word-blue' },
    { id: 'apple', type: 'apple', x: 26, y: 40, w: 22, props: { color: 'coral' } },
    { id: 'star', type: 'star', x: 72, y: 46, w: 22, props: { color: 'yellow' } },
    { id: 'cube', type: 'cube', x: 32, y: 88, w: 20, props: { color: 'green' } },
    { id: 'ball', type: 'ball', x: 72, y: 92, w: 18, props: { color: 'coral' } }
  ],
  reactions: [
    { on: 'tap', target: 'apple', do: [{ fx: 'wobble' }, { fail: 'FB_NOT_BLUE' }] },
    { on: 'tap', target: 'star', do: [{ fx: 'wobble' }, { fail: 'FB_NOT_BLUE' }] },
    { on: 'tap', target: 'cube', do: [{ fx: 'wobble' }, { fail: 'FB_NOT_BLUE' }] },
    { on: 'tap', target: 'ball', do: [{ fx: 'wobble' }, { fail: 'FB_NOT_BLUE' }] }
  ],
  win: { type: 'tapped', target: 'w_blue' },
  onWin: [{ fx: 'pop', target: 'w_blue' }]
});
