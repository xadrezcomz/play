// FASE 37 — COLOQUE A LUA NO CÉU · a lua não sobe: traga o céu até ela.
RULES.registerLevel({
  id: 37, chapter: 4,
  instruction: 'LEVEL_037_TITLE',
  hints: ['LEVEL_037_HINT_1', 'LEVEL_037_HINT_2', 'LEVEL_037_HINT_3'],
  objects: [
    { id: 'sky', type: 'sky', x: 50, y: 16, w: 92, h: 30, z: 2, props: { night: true },
      behaviors: { draggable: { axis: 'y', minY: 16, maxY: 104 } } },
    { id: 'moon', type: 'moon', x: 50, y: 98, w: 16, z: 5 }
  ],
  reactions: [
    { on: 'tap', target: 'moon', cooldown: 500, do: [{ fx: 'wobble' }, { fail: 'FB_HEAVY' }] }
  ],
  win: { type: 'inside', objects: ['moon'], container: 'sky' },
  onWin: [{ fx: 'pop', target: 'moon' }]
});
