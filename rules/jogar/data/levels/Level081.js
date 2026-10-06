// FASE 81 — ENCONTRE A BOLA · os copos se embaralham; não precisa seguir: é só levantar os copos.
RULES.registerLevel({
  id: 81, chapter: 9,
  instruction: 'LEVEL_081_TITLE',
  hints: ['LEVEL_081_HINT_1', 'LEVEL_081_HINT_2', 'LEVEL_081_HINT_3'],
  objects: [
    { id: 'table', type: 'platform', x: 50, y: 104, w: 96, h: 10, z: 1, passive: true, props: { color: '#D9B48F' } },
    { id: 'ball', type: 'ball', x: 50, y: 94, w: 8, z: 2, props: { color: 'coral' }, behaviors: { clickable: {} } },
    { id: 'k1', type: 'cup2', x: 24, y: 89, w: 17, h: 19, z: 5, props: { color: 'blue' }, behaviors: { draggable: {} } },
    { id: 'k2', type: 'cup2', x: 50, y: 89, w: 17, h: 19, z: 5, props: { color: 'blue' }, behaviors: { draggable: {}, carries: { ids: ['ball'], onlySwap: true } } },
    { id: 'k3', type: 'cup2', x: 76, y: 89, w: 17, h: 19, z: 5, props: { color: 'blue' }, behaviors: { draggable: {} } },
    { id: 'shuffler', type: 'marker', x: 50, y: 0, w: 1, passive: true,
      behaviors: { timer: { delay: 900, times: 1, 'do': [
        { swap: ['k1', 'k2'], ms: 260, await: true }, { wait: 60 }, { swap: ['k2', 'k3'], ms: 260, await: true }, { wait: 60 },
        { swap: ['k1', 'k3'], ms: 260, await: true }, { wait: 60 }, { swap: ['k2', 'k1'], ms: 240, await: true }, { wait: 60 },
        { swap: ['k3', 'k2'], ms: 240, await: true }
      ] } } }
  ],
  reactions: [
    { on: 'tap', target: 'k1', cooldown: 500, do: [{ fx: 'hop' }, { say: 'FB_WHICH' }] },
    { on: 'tap', target: 'k2', cooldown: 500, do: [{ fx: 'hop' }, { say: 'FB_WHICH' }] },
    { on: 'tap', target: 'k3', cooldown: 500, do: [{ fx: 'hop' }, { say: 'FB_WHICH' }] }
  ],
  win: { type: 'tapped', target: 'ball' },
  onWin: [{ fx: 'pop', target: 'ball' }]
});
