// FASE 19 — NÃO DEIXE A BOLA CAIR · leve a plataforma para baixo da bola.
RULES.registerLevel({
  id: 19, chapter: 2,
  instruction: 'LEVEL_019_TITLE',
  hints: ['LEVEL_019_HINT_1', 'LEVEL_019_HINT_2', 'LEVEL_019_HINT_3'],
  objects: [
    { id: 'ball', type: 'ball', x: 26, y: 22, w: 13, z: 6, props: { color: 'coral' },
      behaviors: { gravity: { delay: 2200, g: 0.014, solids: ['plat'] } } },
    { id: 'plat', type: 'platform', x: 74, y: 102, w: 28, h: 5, z: 5, behaviors: { draggable: {} } }
  ],
  reactions: [
    { on: 'fell', do: [{ fail: 'FB_OOPS' }] },
    { on: 'tap', target: 'ball', do: [{ fx: 'wobble' }, { sound: 'tap' }] }
  ],
  win: { type: 'state', target: 'ball', key: 'landed', equals: true },
  onWin: [{ fx: 'hop', target: 'ball' }]
});
