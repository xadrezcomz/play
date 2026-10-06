// FASE 40 — CHEGUE AO FINAL · o caminho é enorme; leve a palavra FINAL até Ruli.
RULES.registerLevel({
  id: 40, chapter: 4,
  instruction: 'LEVEL_040_TITLE',   // contém [[w_final|FINAL]]
  hints: ['LEVEL_040_HINT_1', 'LEVEL_040_HINT_2', 'LEVEL_040_HINT_3'],
  mascot: false,
  objects: [
    { id: 'w_final', inText: true, behaviors: { draggable: {} } },
    { id: 'ground', type: 'platform', x: 50, y: 108, w: 100, h: 24, z: 2, passive: true },
    { id: 'p1', type: 'stick', x: 36, y: 99, w: 5, h: 1.6, z: 3, passive: true, props: { color: '#C9B79F' } },
    { id: 'p2', type: 'stick', x: 52, y: 99, w: 5, h: 1.6, z: 3, passive: true, props: { color: '#C9B79F' } },
    { id: 'p3', type: 'stick', x: 68, y: 99, w: 5, h: 1.6, z: 3, passive: true, props: { color: '#C9B79F' } },
    { id: 'flag', type: 'flag', x: 93, y: 84, w: 8, h: 14, z: 3, passive: true },
    { id: 'ruli', type: 'ruli', x: 12, y: 87, w: 16, h: 18, z: 6, state: { expr: 'thinking' },
      behaviors: { receives: { from: ['w_final'], set: { arrived: true }, consume: true } } }
  ],
  reactions: [
    { on: 'tap', target: 'ruli', cooldown: 600, do: [{ fx: 'wobble' }, { fail: 'FB_TIRED' }] }
  ],
  win: { type: 'state', target: 'ruli', key: 'arrived' },
  onWin: [{ expr: 'happy', target: 'ruli' }, { move: 'flag', toObj: 'ruli', offset: [10, -3], ms: 450 }]
});
