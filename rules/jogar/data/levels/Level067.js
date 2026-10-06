// FASE 67 — APAGUE O X · esfregue o X do cenário... e o X da instrução também.
RULES.registerLevel({
  id: 67, chapter: 7,
  instruction: 'LEVEL_067_TITLE',   // contém [[w_x|X]]
  hints: ['LEVEL_067_HINT_1', 'LEVEL_067_HINT_2', 'LEVEL_067_HINT_3'],
  objects: [
    { id: 'w_x', inText: true, behaviors: { rubbable: { count: 8, set: { erased: true } } } },
    { id: 'x', type: 'xmark', x: 50, y: 64, w: 40, z: 3, state: { erase: 0 },
      behaviors: { rubbable: { count: 14, progress: 'erase', set: { erased: true } } } }
  ],
  reactions: [
    { on: 'tap', target: 'x', cooldown: 600, do: [{ fx: 'wobble' }, { fail: 'FB_HMM' }] },
    { on: 'rubbed', target: 'w_x', do: [{ cls: 'w_x', add: 'erased' }] }
  ],
  triggers: [
    { when: { type: 'state', target: 'x', key: 'erased' }, do: [{ wait: 300 }, { fail: 'FB_ALMOST' }, { wait: 1000 }, { fx: 'wiggle', target: 'w_x' }] }
  ],
  win: [{ type: 'state', target: 'x', key: 'erased' }, { type: 'state', target: 'w_x', key: 'erased' }],
  onWin: [{ fx: 'pop', target: 'x' }]
});
