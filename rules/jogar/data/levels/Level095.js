// FASE 95 — FAÇA O RULI DORMIR · apague a luz, guarde o rádio e... fique quieto.
RULES.registerLevel({
  id: 95, chapter: 10,
  instruction: 'LEVEL_095_TITLE',
  hints: ['LEVEL_095_HINT_1', 'LEVEL_095_HINT_2', 'LEVEL_095_HINT_3'],
  mascot: false,
  objects: [
    { id: 'floor', type: 'platform', x: 50, y: 112, w: 100, h: 16, z: 1, passive: true, props: { color: '#CDB69A' } },
    { id: 'bulb', type: 'bulb', x: 50, y: 30, w: 16, h: 23, z: 2, state: { on: true }, behaviors: { mirror: { from: 'switch', key: 'on' } } },
    { id: 'switch', type: 'switch', x: 86, y: 62, w: 11, h: 18, z: 3, state: { on: true }, behaviors: { clickable: { toggle: 'on', sound: 'click', fx: 'squash' } } },
    { id: 'box', type: 'box', x: 76, y: 96, w: 24, h: 19, z: 3, behaviors: { container: {} } },
    { id: 'radio', type: 'radio', x: 30, y: 64, w: 18, h: 13, z: 5, behaviors: { draggable: {} } },
    { id: 'ruli', type: 'ruli', x: 34, y: 95, w: 16, h: 18, z: 4, state: { expr: 'normal' } }
  ],
  reactions: [
    { on: 'contained', target: 'radio', do: [{ state: 'radio', key: 'quiet', value: true }] },
    { on: 'dragstart', target: 'radio', do: [{ state: 'radio', key: 'quiet', value: false }] },
    { on: 'tap', target: 'ruli', cooldown: 600, do: [{ expr: 'surprised', target: 'ruli' }, { say: 'FB_AWAKE' }, { wait: 600 }, { expr: 'normal', target: 'ruli' }] }
  ],
  win: [
    { type: 'state', target: 'bulb', key: 'on', equals: false },
    { type: 'inside', objects: ['radio'], container: 'box' },
    { type: 'idle', seconds: 3 }
  ],
  onWin: [{ expr: 'sleepy', target: 'ruli' }]
});
