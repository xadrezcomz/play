// FASE 80 — LEVE RULI ATÉ A ESTRELA · com o balão, o Ruli flutua até lá.
RULES.registerLevel({
  id: 80, chapter: 8,
  instruction: 'LEVEL_080_TITLE',
  hints: ['LEVEL_080_HINT_1', 'LEVEL_080_HINT_2', 'LEVEL_080_HINT_3'],
  mascot: false,
  objects: [
    { id: 'ground', type: 'platform', x: 50, y: 112, w: 100, h: 16, z: 1, passive: true },
    { id: 'star', type: 'star', x: 30, y: 18, w: 12, z: 2, passive: true },
    { id: 'balloon', type: 'balloon', x: 78, y: 82, w: 13, h: 24, z: 5, behaviors: { draggable: {} } },
    { id: 'ruli', type: 'ruli', x: 30, y: 95, w: 15, h: 18, z: 6,
      behaviors: {
        draggable: {}, character: {}, gravity: { solids: ['ground'] },
        floats: { needs: 'balloon', speed: 0.18, ceil: 6 },
        receives: { from: ['balloon'], set: { balloon: true }, consume: true }
      } }
  ],
  win: [{ type: 'touching', a: 'ruli', b: 'star' }, { type: 'state', target: 'ruli', key: 'balloon' }],
  onWin: [{ expr: 'happy', target: 'ruli' }, { fx: 'pop', target: 'star' }]
});
