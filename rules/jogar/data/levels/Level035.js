// FASE 35 — FAÇA A PLANTA CRESCER · primeiro a água, depois o sol (sequência de ações).
RULES.registerLevel({
  id: 35, chapter: 4,
  instruction: 'LEVEL_035_TITLE',
  hints: ['LEVEL_035_HINT_1', 'LEVEL_035_HINT_2', 'LEVEL_035_HINT_3'],
  objects: [
    { id: 'plant', type: 'plant', x: 50, y: 92, w: 22, h: 36, z: 3,
      behaviors: {
        receives: { from: ['can'], set: { watered: true }, returnTool: true },
        'receives#2': { from: ['sun'], requires: { watered: true }, set: { grown: true }, returnTool: true, failSay: 'FB_THIRSTY' }
      } },
    { id: 'can', type: 'can', x: 22, y: 40, w: 22, h: 15, z: 6, behaviors: { draggable: {} } },
    { id: 'sun', type: 'sun', x: 78, y: 30, w: 20, z: 6, behaviors: { draggable: {} } }
  ],
  reactions: [
    { on: 'tap', target: 'plant', do: [{ fx: 'wobble' }, { sound: 'tap' }] },
    { on: 'used', target: 'plant', unless: { type: 'state', target: 'plant', key: 'grown' }, do: [{ say: 'FB_GLUG' }] }
  ],
  win: { type: 'state', target: 'plant', key: 'grown' },
  onWin: [{ fx: 'hop', target: 'plant' }]
});
