// FASE 49 — QUEBRE A REGRA · a placa diz "NÃO MOVA A PORTA". Mova a porta.
RULES.registerLevel({
  id: 49, chapter: 5,
  instruction: 'LEVEL_049_TITLE',
  hints: ['LEVEL_049_HINT_1', 'LEVEL_049_HINT_2', 'LEVEL_049_HINT_3'],
  objects: [
    { id: 'sign', type: 'word', textKey: 'LEVEL_049_SIGN', fontU: 4.2, cls: 'sign', x: 50, y: 30, z: 2, passive: true },
    { id: 'door', type: 'door', x: 50, y: 78, w: 22, h: 44, z: 4, behaviors: { draggable: {} } }
  ],
  reactions: [
    { on: 'dragstart', target: 'door', do: [{ cls: 'sign', add: 'broken' }, { sound: 'collision' }] },
    { on: 'tap', target: 'door', cooldown: 500, do: [{ fx: 'shake' }, { sound: 'click' }] }
  ],
  win: { type: 'moved', target: 'door', distance: 14 },
  onWin: [{ fx: 'pop', target: 'sign' }]
});
