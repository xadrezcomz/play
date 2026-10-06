// FASE 78 — ACENDA A FOGUEIRA · esfregue o graveto na lenha até sair fogo.
RULES.registerLevel({
  id: 78, chapter: 8,
  instruction: 'LEVEL_078_TITLE',
  hints: ['LEVEL_078_HINT_1', 'LEVEL_078_HINT_2', 'LEVEL_078_HINT_3'],
  objects: [
    { id: 'ground', type: 'platform', x: 50, y: 112, w: 100, h: 16, z: 1, passive: true },
    { id: 'fire', type: 'campfire', x: 50, y: 92, w: 36, h: 29, z: 3, state: { heat: 0 },
      behaviors: { rubbable: { count: 12, progress: 'heat', set: { fire: true } } } },
    { id: 'twig', type: 'twig', x: 22, y: 60, w: 22, h: 5, z: 6, behaviors: { draggable: {} } }
  ],
  reactions: [
    { on: 'tap', target: 'fire', cooldown: 600, do: [{ fx: 'wobble' }, { fail: 'FB_NEEDS_HEAT' }] }
  ],
  win: { type: 'state', target: 'fire', key: 'fire' },
  onWin: [{ fx: 'pop', target: 'fire' }]
});
