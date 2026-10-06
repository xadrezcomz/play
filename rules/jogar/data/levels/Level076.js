// FASE 76 — DERRUBE A TORRE · os blocos estão colados; sacuda o chão (esfregue).
RULES.registerLevel({
  id: 76, chapter: 8,
  instruction: 'LEVEL_076_TITLE',
  hints: ['LEVEL_076_HINT_1', 'LEVEL_076_HINT_2', 'LEVEL_076_HINT_3'],
  objects: [
    { id: 'ground', type: 'platform', x: 50, y: 110, w: 100, h: 20, z: 1,
      behaviors: { rubbable: { count: 10, set: { shaken: true } } } },
    { id: 't1', type: 'cube', x: 50, y: 92, w: 16, z: 3, props: { color: 'coral' } },
    { id: 't2', type: 'cube', x: 50, y: 76, w: 16, z: 3, props: { color: 'yellow' } },
    { id: 't3', type: 'cube', x: 50, y: 60, w: 16, z: 3, props: { color: 'blue' } },
    { id: 't4', type: 'cube', x: 50, y: 44, w: 16, z: 3, props: { color: 'green' } }
  ],
  reactions: [
    { on: 'tap', target: 't1', cooldown: 600, do: [{ fx: 'wobble' }, { say: 'FB_GLUED' }] },
    { on: 'tap', target: 't2', cooldown: 600, do: [{ fx: 'wobble' }, { say: 'FB_GLUED' }] },
    { on: 'tap', target: 't3', cooldown: 600, do: [{ fx: 'wobble' }, { say: 'FB_GLUED' }] },
    { on: 'tap', target: 't4', cooldown: 600, do: [{ fx: 'wobble' }, { say: 'FB_GLUED' }] },
    { on: 'rubbing', target: 'ground', cooldown: 150, do: [{ fx: 'shake', target: 't4' }, { fx: 'shake', target: 't3' }] }
  ],
  win: { type: 'state', target: 'ground', key: 'shaken' },
  onWin: [
    { move: 't4', to: [86, 94], rot: 70, ms: 500 },
    { move: 't3', to: [16, 94], rot: -50, ms: 450 },
    { move: 't2', to: [68, 94], rot: 20, ms: 400, await: true }
  ]
});
