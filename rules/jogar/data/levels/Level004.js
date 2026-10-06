// FASE 04 — ACENDA A LUZ · o interruptor liga a lâmpada.
RULES.registerLevel({
  id: 4, chapter: 1,
  instruction: 'LEVEL_004_TITLE',
  hints: ['LEVEL_004_HINT_1', 'LEVEL_004_HINT_2', 'LEVEL_004_HINT_3'],
  objects: [
    { id: 'bulb', type: 'bulb', x: 50, y: 38, w: 26, h: 37, behaviors: { mirror: { from: 'switch', key: 'on' } } },
    { id: 'switch', type: 'switch', x: 50, y: 96, w: 16, h: 26, behaviors: { clickable: { toggle: 'on', sound: 'click', fx: 'squash' } } }
  ],
  reactions: [
    { on: 'tap', target: 'bulb', cooldown: 500, do: [{ fx: 'wobble' }, { fail: 'FB_HMM' }] }
  ],
  win: { type: 'state', target: 'bulb', key: 'on', equals: true },
  onWin: [{ fx: 'pop', target: 'bulb' }]
});
