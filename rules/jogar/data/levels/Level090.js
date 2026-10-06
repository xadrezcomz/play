// FASE 90 — ENCONTRE O AMIGO DO RULI · ele está espiando da beirada da tela.
RULES.registerLevel({
  id: 90, chapter: 9,
  instruction: 'LEVEL_090_TITLE',
  hints: ['LEVEL_090_HINT_1', 'LEVEL_090_HINT_2', 'LEVEL_090_HINT_3'],
  mascot: false,
  objects: [
    { id: 'ground', type: 'platform', x: 50, y: 112, w: 120, h: 16, z: 1, passive: true },
    { id: 't1', type: 'tree', x: 20, y: 84, w: 22, h: 36, z: 4 },
    { id: 't2', type: 'tree', x: 50, y: 80, w: 26, h: 44, z: 4 },
    { id: 't3', type: 'chest', x: 76, y: 94, w: 20, h: 18, z: 4 },
    { id: 'ruli', type: 'ruli', x: 36, y: 95, w: 15, h: 17, z: 5, passive: true, state: { expr: 'thinking' } },
    { id: 'friend', type: 'ruli', x: 98, y: 60, w: 16, h: 18, z: 6, rot: -20, props: { color: 'pink' }, behaviors: { clickable: {} } }
  ],
  reactions: [
    { on: 'tap', target: 't1', cooldown: 400, do: [{ fx: 'wobble' }, { say: 'FB_NOT_HERE' }] },
    { on: 'tap', target: 't2', cooldown: 400, do: [{ fx: 'wobble' }, { say: 'FB_NOT_HERE' }] },
    { on: 'tap', target: 't3', cooldown: 400, do: [{ fx: 'wobble' }, { say: 'FB_NOT_HERE' }] }
  ],
  win: { type: 'tapped', target: 'friend' },
  onWin: [{ move: 'friend', to: [62, 95], rot: 0, ms: 420 }, { expr: 'happy', target: 'friend' }, { expr: 'happy', target: 'ruli' }]
});
