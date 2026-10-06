// FASE 86 — TOQUE QUANDO FICAR VERDE · o verde dura pouco: observe o ritmo.
RULES.registerLevel({
  id: 86, chapter: 9,
  instruction: 'LEVEL_086_TITLE',
  hints: ['LEVEL_086_HINT_1', 'LEVEL_086_HINT_2', 'LEVEL_086_HINT_3'],
  objects: [
    { id: 'tl', type: 'traffic', x: 50, y: 64, w: 20, h: 48, z: 3, state: { light: 'red' } },
    { id: 'cycle', type: 'marker', x: 50, y: 0, w: 1, passive: true,
      behaviors: { timer: { delay: 300, every: 10, 'do': [
        { state: 'tl', key: 'light', value: 'red' }, { wait: 1500 },
        { state: 'tl', key: 'light', value: 'yellow' }, { wait: 600 },
        { state: 'tl', key: 'light', value: 'green' }, { wait: 800 }
      ] } } }
  ],
  reactions: [
    { on: 'tap', target: 'tl', when: { type: 'state', target: 'tl', key: 'light', equals: 'green' }, do: [{ state: 'tl', key: 'ok', value: true }] },
    { on: 'tap', target: 'tl', unless: { type: 'state', target: 'tl', key: 'light', equals: 'green' }, cooldown: 300, do: [{ fx: 'shake' }, { fail: 'FB_NOT_GREEN' }] }
  ],
  win: { type: 'state', target: 'tl', key: 'ok' },
  onWin: [{ fx: 'pop', target: 'tl' }]
});
