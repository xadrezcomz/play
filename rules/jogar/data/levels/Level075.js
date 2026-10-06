// FASE 75 — PEGUE O CLIPE · ele está atrás do vidro; o ímã puxa através dele.
RULES.registerLevel({
  id: 75, chapter: 8,
  instruction: 'LEVEL_075_TITLE',
  hints: ['LEVEL_075_HINT_1', 'LEVEL_075_HINT_2', 'LEVEL_075_HINT_3'],
  objects: [
    { id: 'clip', type: 'clip', x: 50, y: 70, w: 6, h: 12, z: 2 },
    { id: 'glass', type: 'glassbox', x: 50, y: 66, w: 34, h: 34, z: 4 },
    { id: 'magnet', type: 'magnet', x: 20, y: 102, w: 15, h: 15, z: 6, behaviors: { draggable: {}, magnet: { targets: ['clip'], radius: 24 } } }
  ],
  reactions: [
    { on: 'tap', target: 'glass', cooldown: 600, do: [{ fx: 'shake' }, { fail: 'FB_GLASS' }] }
  ],
  win: { type: 'state', target: 'clip', key: 'stuck' },
  onWin: [{ fx: 'pop', target: 'magnet' }]
});
