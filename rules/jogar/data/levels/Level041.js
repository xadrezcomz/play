// FASE 41 — NÃO TOQUE NO VERDE · pinte o verde de outra cor e então toque nele.
RULES.registerLevel({
  id: 41, chapter: 5,
  instruction: 'LEVEL_041_TITLE',
  hints: ['LEVEL_041_HINT_1', 'LEVEL_041_HINT_2', 'LEVEL_041_HINT_3'],
  objects: [
    { id: 'g', type: 'circle', x: 50, y: 52, w: 28, z: 3, props: { color: 'green' },
      behaviors: { receives: { from: ['paint'], copyColor: true, returnTool: true } } },
    { id: 'r', type: 'circle', x: 24, y: 94, w: 18, props: { color: 'coral' } },
    { id: 'y', type: 'circle', x: 76, y: 94, w: 18, props: { color: 'yellow' } },
    { id: 'paint', type: 'bucket', x: 18, y: 26, w: 14, h: 16, z: 6, props: { color: 'blue' }, behaviors: { draggable: {} } }
  ],
  reactions: [
    { on: 'tap', target: 'g', unless: { type: 'state', target: 'g', key: 'color', truthy: true },
      do: [{ forget: 'g' }, { fx: 'shake' }, { fail: 'FB_GREEN' }] },
    { on: 'tap', target: 'r', cooldown: 500, do: [{ fx: 'wobble' }, { fail: 'FB_HMM' }] },
    { on: 'tap', target: 'y', cooldown: 500, do: [{ fx: 'wobble' }, { fail: 'FB_HMM' }] }
  ],
  win: [{ type: 'state', target: 'g', key: 'color', truthy: true }, { type: 'tapped', target: 'g' }],
  onWin: [{ fx: 'pop', target: 'g' }]
});
