// FASE 28 — LEVE A ESTRELA PARA CIMA · a estrela não sobe: leve CIMA até ela.
RULES.registerLevel({
  id: 28, chapter: 3,
  instruction: 'LEVEL_028_TITLE',   // contém [[w_up|CIMA]]
  hints: ['LEVEL_028_HINT_1', 'LEVEL_028_HINT_2', 'LEVEL_028_HINT_3'],
  objects: [
    { id: 'w_up', inText: true, behaviors: { draggable: {} } },
    { id: 'floor', type: 'platform', x: 50, y: 114, w: 100, h: 12, z: 1, passive: true },
    { id: 'star', type: 'star', x: 50, y: 98, w: 18, z: 4,
      behaviors: { draggable: { returnOnDrop: true }, receives: { from: ['w_up'], set: { up: true }, consume: true } } }
  ],
  reactions: [
    { on: 'drop', target: 'star', cooldown: 600, do: [{ fail: 'FB_NOT_UP' }] }
  ],
  win: { type: 'state', target: 'star', key: 'up', equals: true },
  onWin: [{ move: 'star', to: [50, 20], ms: 700, ease: 'cubic-bezier(.3,1.3,.5,1)', z: 900 }]
});
