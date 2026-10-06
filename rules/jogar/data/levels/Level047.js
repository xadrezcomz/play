// FASE 47 — FAÇA O DIA VIRAR NOITE · leve o sol para baixo do horizonte.
RULES.registerLevel({
  id: 47, chapter: 5,
  instruction: 'LEVEL_047_TITLE',
  hints: ['LEVEL_047_HINT_1', 'LEVEL_047_HINT_2', 'LEVEL_047_HINT_3'],
  objects: [
    { id: 'sky', type: 'sky', x: 50, y: 48, w: 100, h: 96, z: 1, passive: true },
    { id: 'sun', type: 'sun', x: 70, y: 28, w: 22, z: 3, behaviors: { draggable: {} } },
    { id: 'moon', type: 'moon', x: 28, y: 26, w: 16, z: 3, hidden: true, passive: true },
    { id: 'ground', type: 'platform', x: 50, y: 108, w: 100, h: 24, z: 6, passive: true }
  ],
  reactions: [
    { on: 'tap', target: 'sun', cooldown: 600, do: [{ fx: 'wobble' }, { sound: 'tap' }] }
  ],
  win: { type: 'pos', target: 'sun', minY: 104 },
  onWin: [{ state: 'sky', key: 'night', value: true }, { show: 'moon' }]
});
