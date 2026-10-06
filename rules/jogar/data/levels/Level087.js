// FASE 87 — FAÇA O REFLEXO PEGAR A ESTRELA · o Ruli não atravessa o espelho; o reflexo copia ao contrário.
RULES.registerLevel({
  id: 87, chapter: 9,
  instruction: 'LEVEL_087_TITLE',
  hints: ['LEVEL_087_HINT_1', 'LEVEL_087_HINT_2', 'LEVEL_087_HINT_3'],
  mascot: false,
  objects: [
    { id: 'mirror', type: 'mirrorline', x: 50, y: 64, w: 3, h: 100, z: 2, passive: true },
    { id: 'star', type: 'star', x: 86, y: 34, w: 11, z: 3, passive: true },
    { id: 'refl', type: 'ruli', x: 76, y: 92, w: 15, h: 17, z: 4, cls: 'mirror', passive: true,
      behaviors: { mirrorOf: { source: 'ruli', axis: 50 } } },
    { id: 'ruli', type: 'ruli', x: 24, y: 92, w: 15, h: 17, z: 5, behaviors: { draggable: { maxX: 44 }, character: {} } }
  ],
  win: { type: 'touching', a: 'refl', b: 'star' },
  onWin: [{ expr: 'happy', target: 'ruli' }, { expr: 'happy', target: 'refl' }, { fx: 'pop', target: 'star' }]
});
