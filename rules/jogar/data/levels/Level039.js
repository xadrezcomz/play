// FASE 39 — FAÇA O RELÓGIO ANDAR MAIS RÁPIDO · gire o ponteiro você mesmo (2 voltas).
RULES.registerLevel({
  id: 39, chapter: 4,
  instruction: 'LEVEL_039_TITLE',
  hints: ['LEVEL_039_HINT_1', 'LEVEL_039_HINT_2', 'LEVEL_039_HINT_3'],
  objects: [
    { id: 'clock', type: 'clock', x: 50, y: 60, w: 60, z: 2, passive: true },
    { id: 'hour', type: 'hand', x: 50, y: 60, w: 60, z: 3, rot: 300, passive: true, props: { len: 22, width: 7 } },
    { id: 'minute', type: 'hand', x: 50, y: 60, w: 60, z: 4, props: { len: 38, width: 5 }, behaviors: { rotatable: {} } }
  ],
  reactions: [
    { on: 'tap', target: 'minute', cooldown: 700, do: [{ say: 'FB_TICTAC' }] }
  ],
  win: { type: 'state', target: 'minute', key: 'turns', min: 2 },
  onWin: [{ fx: 'pop', target: 'clock' }]
});
