// FASE 31 — ENCONTRE 3 TRIÂNGULOS · dois estão à vista; o terceiro nasce de duas metades.
RULES.registerLevel({
  id: 31, chapter: 4,
  instruction: 'LEVEL_031_TITLE',
  hints: ['LEVEL_031_HINT_1', 'LEVEL_031_HINT_2', 'LEVEL_031_HINT_3'],
  objects: [
    { id: 't1', type: 'triangle', x: 26, y: 36, w: 24, h: 21, props: { color: 'yellow' } },
    { id: 't2', type: 'triangle', x: 72, y: 50, w: 26, h: 23, props: { color: 'teal' } },
    { id: 't3', type: 'triangle', x: 50, y: 80, w: 24, h: 22, hidden: true, props: { color: 'purple' } },
    { id: 'hL', type: 'halftri', x: 28, y: 94, w: 12, h: 22, props: { color: 'purple', side: 'left' },
      behaviors: { draggable: {}, merge: { 'with': ['hR'], into: 't3' } } },
    { id: 'hR', type: 'halftri', x: 76, y: 92, w: 12, h: 22, props: { color: 'purple', side: 'right' },
      behaviors: { draggable: {}, merge: { 'with': ['hL'], into: 't3' } } }
  ],
  reactions: [
    { on: 'tap', target: 't1', cooldown: 500, do: [{ fx: 'pop' }, { say: 'FB_ONLY_TWO' }] },
    { on: 'tap', target: 't2', cooldown: 500, do: [{ fx: 'pop' }, { say: 'FB_ONLY_TWO' }] }
  ],
  win: { type: 'state', target: 't3', key: 'made' },
  onWin: [{ fx: 'pop', target: 't1' }, { wait: 90 }, { fx: 'pop', target: 't2' }, { wait: 90 }, { fx: 'pop', target: 't3' }]
});
