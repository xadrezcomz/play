// FASE 88 — REPITA A SEQUÊNCIA · as lâmpadas acendem numa ordem; toque na mesma ordem.
RULES.registerLevel({
  id: 88, chapter: 9,
  instruction: 'LEVEL_088_TITLE',
  hints: ['LEVEL_088_HINT_1', 'LEVEL_088_HINT_2', 'LEVEL_088_HINT_3'],
  objects: [
    { id: 'l1', type: 'bulb', x: 22, y: 60, w: 18, h: 26, z: 3 },
    { id: 'l2', type: 'bulb', x: 50, y: 60, w: 18, h: 26, z: 3 },
    { id: 'l3', type: 'bulb', x: 78, y: 60, w: 18, h: 26, z: 3 },
    { id: 'ctrl', type: 'marker', x: 50, y: 0, w: 1, passive: true, behaviors: { simon: { seq: ['l2', 'l1', 'l3', 'l2'], show: 480, delay: 1000 } } }
  ],
  win: { type: 'state', target: 'ctrl', key: 'done' },
  onWin: [{ fx: 'pop', target: 'l1' }, { fx: 'pop', target: 'l2' }, { fx: 'pop', target: 'l3' }]
});
