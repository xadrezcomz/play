// FASE 07 — FAÇA OS DOIS SE ENCONTRAREM · cada um só anda até o meio: mova os dois.
RULES.registerLevel({
  id: 7, chapter: 1,
  instruction: 'LEVEL_007_TITLE',
  hints: ['LEVEL_007_HINT_1', 'LEVEL_007_HINT_2', 'LEVEL_007_HINT_3'],
  mascot: false,
  objects: [
    { id: 'ground', type: 'platform', x: 50, y: 110, w: 100, h: 20, z: 1, passive: true },
    { id: 'middle', type: 'stick', x: 50, y: 99, w: 1.2, h: 2.5, z: 2, passive: true, props: { color: '#C9B79F' } },
    { id: 'ruli', type: 'ruli', x: 14, y: 89, w: 18, h: 20, z: 5,
      behaviors: { draggable: { axis: 'x', minX: 8, maxX: 44 }, character: {} } },
    { id: 'friend', type: 'ruli', x: 86, y: 89, w: 18, h: 20, z: 5, props: { color: 'pink' },
      behaviors: { draggable: { axis: 'x', minX: 56, maxX: 92 }, character: {} } }
  ],
  win: { type: 'touching', a: 'ruli', b: 'friend', pad: 1.5 },
  onWin: [
    { expr: 'happy', target: 'ruli' }, { expr: 'happy', target: 'friend' },
    { fx: 'hop', target: 'ruli' }, { wait: 120 }, { fx: 'hop', target: 'friend' }
  ]
});
