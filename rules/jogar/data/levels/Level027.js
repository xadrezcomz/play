// FASE 27 — ABRA A CAIXA · a palavra ABRA é a ferramenta.
RULES.registerLevel({
  id: 27, chapter: 3,
  instruction: 'LEVEL_027_TITLE',   // contém [[w_open|ABRA]]
  hints: ['LEVEL_027_HINT_1', 'LEVEL_027_HINT_2', 'LEVEL_027_HINT_3'],
  objects: [
    { id: 'w_open', inText: true, behaviors: { draggable: {} } },
    { id: 'chest', type: 'chest', x: 50, y: 82, w: 44, h: 40, z: 4,
      behaviors: { receives: { from: ['w_open'], set: { open: true }, consume: true } } },
    { id: 'star', type: 'star', x: 50, y: 62, w: 18, z: 3, hidden: true }
  ],
  reactions: [
    { on: 'tap', target: 'chest', cooldown: 500, do: [{ fx: 'shake' }, { sound: 'collision' }, { fail: 'FB_HMM' }] }
  ],
  win: { type: 'state', target: 'chest', key: 'open', equals: true },
  onWin: [{ show: 'star' }, { move: 'star', to: [50, 48], ms: 400, z: 900 }]
});
