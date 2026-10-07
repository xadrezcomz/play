// FASE 36 — ENCONTRE O QUE ESTÁ ESCONDIDO · a própria instrução esconde a estrela.
RULES.registerLevel({
  id: 36, chapter: 4,
  instruction: 'LEVEL_036_TITLE',   // a frase inteira é [[w_all|...]]
  hints: ['LEVEL_036_HINT_1', 'LEVEL_036_HINT_2', 'LEVEL_036_HINT_3'],
  objects: [
    { id: 'w_all', inText: true, behaviors: { draggable: {} } },
    { id: 'star', type: 'star', x: 50, y: -12, w: 12, z: 2, hidden: true, behaviors: { clickable: {} } },
    { id: 'box1', type: 'cube', x: 24, y: 48, w: 18, props: { color: 'blue' }, behaviors: { draggable: {} } },
    { id: 'box2', type: 'cube', x: 70, y: 66, w: 18, props: { color: 'yellow' }, behaviors: { draggable: {} } },
    { id: 'box3', type: 'cube', x: 40, y: 98, w: 18, props: { color: 'coral' }, behaviors: { draggable: {} } }
  ],
  reactions: [
    { on: 'detached', target: 'w_all', do: [{ move: 'star', toObj: 'w_all', ms: 0 }, { show: 'star' }] },
    { on: 'drop', target: 'box1', cooldown: 900, do: [{ say: 'FB_NOTHING' }] },
    { on: 'drop', target: 'box2', cooldown: 900, do: [{ say: 'FB_NOTHING' }] },
    { on: 'drop', target: 'box3', cooldown: 900, do: [{ say: 'FB_NOTHING' }] }
  ],
  win: { type: 'tapped', target: 'star' },
  onWin: [{ fx: 'pop', target: 'star' }]
});
