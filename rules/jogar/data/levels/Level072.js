// FASE 72 — EQUILIBRE A BALANÇA · as bolas não bastam; tire a pedra e os dois pratos ficam iguais.
RULES.registerLevel({
  id: 72, chapter: 8,
  instruction: 'LEVEL_072_TITLE',
  hints: ['LEVEL_072_HINT_1', 'LEVEL_072_HINT_2', 'LEVEL_072_HINT_3'],
  objects: [
    { id: 'post', type: 'stick', x: 50, y: 84, w: 3, h: 36, z: 1, passive: true, props: { color: '#9AA0B4' } },
    { id: 'beam', type: 'plank', x: 50, y: 66, w: 64, h: 3, z: 2, passive: true, props: { color: '#7D8597' },
      behaviors: { balance: { left: 'panL', right: 'panR', ids: ['rock', 'b1', 'b2', 'feather'] } } },
    { id: 'panL', type: 'basket', x: 22, y: 74, w: 24, h: 16, z: 3, passive: true, behaviors: { container: {} } },
    { id: 'panR', type: 'basket', x: 78, y: 74, w: 24, h: 16, z: 3, passive: true, behaviors: { container: {} } },
    { id: 'rock', type: 'rock', x: 22, y: 72, w: 16, h: 11, z: 5, props: { weight: 3 }, behaviors: { draggable: {} } },
    { id: 'b1', type: 'ball', x: 40, y: 106, w: 9, z: 5, props: { color: 'coral', weight: 1 }, behaviors: { draggable: {} } },
    { id: 'b2', type: 'ball', x: 60, y: 106, w: 9, z: 5, props: { color: 'blue', weight: 1 }, behaviors: { draggable: {} } },
    { id: 'feather', type: 'feather', x: 84, y: 104, w: 6, h: 12, z: 5, props: { weight: 0 }, behaviors: { draggable: {} } }
  ],
  win: { type: 'balanced', left: 'panL', right: 'panR', ids: ['rock', 'b1', 'b2', 'feather'] },
  onWin: [{ fx: 'pop', target: 'beam' }]
});
