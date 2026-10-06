// FASE 46 — NÃO DEIXE NADA NO CHÃO · inclusive a palavra NADA, escrita no chão.
RULES.registerLevel({
  id: 46, chapter: 5,
  instruction: 'LEVEL_046_TITLE',
  hints: ['LEVEL_046_HINT_1', 'LEVEL_046_HINT_2', 'LEVEL_046_HINT_3'],
  objects: [
    { id: 'floor', type: 'platform', x: 50, y: 112, w: 100, h: 16, z: 1, passive: true },
    { id: 'shelf', type: 'shelf', x: 50, y: 46, w: 76, h: 7, z: 1, passive: true },
    { id: 'ball', type: 'ball', x: 18, y: 98, w: 11, props: { color: 'coral' }, behaviors: { draggable: {} } },
    { id: 'cube', type: 'cube', x: 42, y: 98, w: 11, props: { color: 'blue' }, behaviors: { draggable: {} } },
    { id: 'apple', type: 'apple', x: 64, y: 98, w: 11, behaviors: { draggable: {} } },
    { id: 'nada', type: 'word', textKey: 'LEVEL_046_WORD', fontU: 3, cls: 'small-word', x: 86, y: 101, z: 2, behaviors: { draggable: {} } }
  ],
  triggers: [
    { when: [{ type: 'pos', target: 'ball', maxY: 80 }, { type: 'pos', target: 'cube', maxY: 80 }, { type: 'pos', target: 'apple', maxY: 80 }],
      do: [{ wait: 300 }, { fail: 'FB_ALMOST' }, { wait: 1200 }, { fx: 'wiggle', target: 'nada' }] }
  ],
  win: [
    { type: 'pos', target: 'ball', maxY: 80 }, { type: 'pos', target: 'cube', maxY: 80 },
    { type: 'pos', target: 'apple', maxY: 80 }, { type: 'pos', target: 'nada', maxY: 80 }
  ],
  onWin: [{ fx: 'pop', target: 'nada' }]
});
