// FASE 73 — PEGUE A CHAVE · ela está no fundo da água; pedras fazem a água subir.
RULES.registerLevel({
  id: 73, chapter: 8,
  instruction: 'LEVEL_073_TITLE',
  hints: ['LEVEL_073_HINT_1', 'LEVEL_073_HINT_2', 'LEVEL_073_HINT_3'],
  objects: [
    { id: 'tank', type: 'tank', x: 50, y: 84, w: 22, h: 46, z: 4, state: { level: 0.28 },
      behaviors: { tank: { stones: ['s1', 's2', 's3', 's4'], per: 0.18, floaters: ['cork'], top: 0.95 } } },
    { id: 'cork', type: 'cork', x: 50, y: 100, w: 12, h: 10, z: 3, behaviors: { draggable: { requires: { reachable: true } } } },
    { id: 's1', type: 'rock', x: 14, y: 102, w: 9, h: 6, z: 6, behaviors: { draggable: {} } },
    { id: 's2', type: 'rock', x: 24, y: 108, w: 9, h: 6, z: 6, behaviors: { draggable: {} } },
    { id: 's3', type: 'rock', x: 78, y: 104, w: 9, h: 6, z: 6, behaviors: { draggable: {} } },
    { id: 's4', type: 'rock', x: 88, y: 98, w: 9, h: 6, z: 6, behaviors: { draggable: {} } }
  ],
  reactions: [
    { on: 'locked', target: 'cork', cooldown: 700, do: [{ say: 'FB_TOO_DEEP' }] },
    { on: 'raised', target: 'tank', cooldown: 300, do: [{ say: 'FB_GLUG' }] }
  ],
  win: [{ type: 'state', target: 'cork', key: 'reachable' }, { type: 'pos', target: 'cork', maxY: 54 }],
  onWin: [{ fx: 'pop', target: 'cork' }]
});
