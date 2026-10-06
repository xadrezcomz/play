// FASE 85 — COLOQUE O RULI NA SOMBRA DELE · só uma sombra é igual (olhe o broto e os braços).
RULES.registerLevel({
  id: 85, chapter: 9,
  instruction: 'LEVEL_085_TITLE',
  hints: ['LEVEL_085_HINT_1', 'LEVEL_085_HINT_2', 'LEVEL_085_HINT_3'],
  mascot: false,
  objects: [
    { id: 'sh1', type: 'ruli', x: 20, y: 44, w: 20, h: 22, z: 1, cls: 'silhouette mirror', passive: true },
    { id: 'sh2', type: 'ruli', x: 50, y: 44, w: 20, h: 22, z: 1, cls: 'silhouette', state: { expr: 'happy' }, passive: true },
    { id: 'sh3', type: 'ruli', x: 80, y: 44, w: 20, h: 22, z: 1, cls: 'silhouette', passive: true },
    { id: 'ruli', type: 'ruli', x: 50, y: 96, w: 20, h: 22, z: 5,
      behaviors: { draggable: {}, snap: { to: ['sh1', 'sh2', 'sh3'], tol: 12 } } }
  ],
  reactions: [
    { on: 'snapped', target: 'ruli', unless: { type: 'state', target: 'ruli', key: 'at', equals: 'sh3' },
      do: [{ fail: 'FB_NOT_MATCH' }, { wait: 400 }, { state: 'ruli', key: 'at', value: null }, { reset: 'ruli' }] }
  ],
  win: { type: 'state', target: 'ruli', key: 'at', equals: 'sh3' },
  onWin: [{ expr: 'happy', target: 'ruli' }]
});
