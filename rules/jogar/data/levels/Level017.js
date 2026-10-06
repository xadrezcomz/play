// FASE 17 — ENCONTRE O DIFERENTE · todos "respiram" juntos, menos um.
RULES.registerLevel({
  id: 17, chapter: 2,
  instruction: 'LEVEL_017_TITLE',
  hints: ['LEVEL_017_HINT_1', 'LEVEL_017_HINT_2', 'LEVEL_017_HINT_3'],
  objects: [
    { id: 'c1', type: 'circle', x: 22, y: 26, w: 15, cls: 'breathe', props: { color: 'blue' } },
    { id: 'c2', type: 'circle', x: 50, y: 26, w: 15, cls: 'breathe', props: { color: 'blue' } },
    { id: 'c3', type: 'circle', x: 78, y: 26, w: 15, cls: 'breathe', props: { color: 'blue' } },
    { id: 'c4', type: 'circle', x: 36, y: 50, w: 15, cls: 'breathe', props: { color: 'blue' } },
    { id: 'c5', type: 'circle', x: 64, y: 50, w: 15, cls: 'breathe', props: { color: 'blue' } },
    { id: 'c6', type: 'circle', x: 22, y: 74, w: 15, cls: 'breathe', props: { color: 'blue' } },
    { id: 'c7', type: 'circle', x: 50, y: 74, w: 15, cls: 'breathe breathe-odd', props: { color: 'blue' } },
    { id: 'c8', type: 'circle', x: 78, y: 74, w: 15, cls: 'breathe', props: { color: 'blue' } },
    { id: 'c9', type: 'circle', x: 36, y: 98, w: 15, cls: 'breathe', props: { color: 'blue' } },
    { id: 'c10', type: 'circle', x: 64, y: 98, w: 15, cls: 'breathe', props: { color: 'blue' } }
  ],
  reactions: [
    { on: 'tap', target: 'c1', do: [{ fx: 'shake' }, { fail: 'FB_SAME' }] },
    { on: 'tap', target: 'c2', do: [{ fx: 'shake' }, { fail: 'FB_SAME' }] },
    { on: 'tap', target: 'c3', do: [{ fx: 'shake' }, { fail: 'FB_SAME' }] },
    { on: 'tap', target: 'c4', do: [{ fx: 'shake' }, { fail: 'FB_SAME' }] },
    { on: 'tap', target: 'c5', do: [{ fx: 'shake' }, { fail: 'FB_SAME' }] },
    { on: 'tap', target: 'c6', do: [{ fx: 'shake' }, { fail: 'FB_SAME' }] },
    { on: 'tap', target: 'c8', do: [{ fx: 'shake' }, { fail: 'FB_SAME' }] },
    { on: 'tap', target: 'c9', do: [{ fx: 'shake' }, { fail: 'FB_SAME' }] },
    { on: 'tap', target: 'c10', do: [{ fx: 'shake' }, { fail: 'FB_SAME' }] }
  ],
  win: { type: 'tapped', target: 'c7' },
  onWin: [{ fx: 'pop', target: 'c7' }]
});
