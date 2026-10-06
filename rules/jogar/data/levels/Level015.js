// FASE 15 — NÃO APERTE O BOTÃO · tire o botão do lugar e toque no que estava embaixo.
RULES.registerLevel({
  id: 15, chapter: 2,
  instruction: 'LEVEL_015_TITLE',
  hints: ['LEVEL_015_HINT_1', 'LEVEL_015_HINT_2', 'LEVEL_015_HINT_3'],
  objects: [
    { id: 'gem', type: 'gem', x: 50, y: 66, w: 9, h: 8, z: 2, behaviors: { clickable: {} } },
    { id: 'button', type: 'button', x: 50, y: 62, w: 52, z: 6, props: { color: 'coral' }, behaviors: { draggable: {} } }
  ],
  reactions: [
    { on: 'tap', target: 'button', cooldown: 500, do: [
      { state: 'button', key: 'pressed', value: true }, { sound: 'click' }, { fail: 'FB_PRESSED' },
      { wait: 220 }, { state: 'button', key: 'pressed', value: false }
    ] }
  ],
  win: { type: 'tapped', target: 'gem' },
  onWin: [{ fx: 'pop', target: 'gem' }]
});
