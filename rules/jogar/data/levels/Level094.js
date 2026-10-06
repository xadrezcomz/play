// FASE 94 — ABRA O COFRE · a senha está sempre à vista: é o número desta fase.
RULES.registerLevel({
  id: 94, chapter: 10,
  instruction: 'LEVEL_094_TITLE',
  hints: ['LEVEL_094_HINT_1', 'LEVEL_094_HINT_2', 'LEVEL_094_HINT_3'],
  objects: [
    { id: 'safe', type: 'safe', x: 50, y: 50, w: 40, z: 2, passive: true },
    { id: 'arrow1', type: 'triangle', x: 34, y: 76, w: 5, h: 4, z: 3, rot: 180, passive: true, props: { color: 'coral' } },
    { id: 'arrow2', type: 'triangle', x: 66, y: 76, w: 5, h: 4, z: 3, rot: 180, passive: true, props: { color: 'coral' } },
    { id: 'd1', type: 'dial', x: 34, y: 92, w: 24, z: 3, behaviors: { rotatable: { snap: 36 } } },
    { id: 'd2', type: 'dial', x: 66, y: 92, w: 24, z: 3, behaviors: { rotatable: { snap: 36 } } }
  ],
  reactions: [
    { on: 'tap', target: 'd1', cooldown: 500, do: [{ say: 'FB_SPIN_IT' }] },
    { on: 'tap', target: 'd2', cooldown: 500, do: [{ say: 'FB_SPIN_IT' }] }
  ],
  win: [{ type: 'state', target: 'd1', key: 'angle', equals: 36 }, { type: 'state', target: 'd2', key: 'angle', equals: 216 }],
  onWin: [{ state: 'safe', key: 'open', value: true }, { fx: 'pop', target: 'safe' }]
});
