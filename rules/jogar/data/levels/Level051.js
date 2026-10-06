// FASE 51 — PEÇA AJUDA · abrir a dica é a solução.
RULES.registerLevel({
  id: 51, chapter: 6,
  instruction: 'LEVEL_051_TITLE',
  hints: ['LEVEL_051_HINT_1', 'LEVEL_051_HINT_2', 'LEVEL_051_HINT_3'],
  mascot: false,
  objects: [
    { id: 'ruli', type: 'ruli', x: 50, y: 66, w: 30, h: 34, z: 3, state: { expr: 'thinking' } },
    { id: 'box', type: 'cube', x: 20, y: 96, w: 14, props: { color: 'blue' }, behaviors: { draggable: {} } },
    { id: 'btn', type: 'button', x: 80, y: 98, w: 16, z: 3, props: { color: 'coral' } }
  ],
  reactions: [
    { on: 'tap', target: 'ruli', cooldown: 600, do: [{ fx: 'hop' }, { say: 'FB_HELP' }] },
    { on: 'tap', target: 'btn', cooldown: 600, do: [{ state: 'btn', key: 'pressed', value: true }, { sound: 'click' }, { wait: 200 }, { state: 'btn', key: 'pressed', value: false }, { fail: true }] },
    { on: 'hint', do: [{ expr: 'happy', target: 'ruli' }] }
  ],
  win: { type: 'hint' },
  onWin: [{ expr: 'happy', target: 'ruli' }, { fx: 'hop', target: 'ruli' }]
});
