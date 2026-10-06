// FASE 70 — "A PORTA ABRE A CHAVE" · troque as duas palavras de lugar e a chave passa a abrir a porta.
RULES.registerLevel({
  id: 70, chapter: 7,
  instruction: 'LEVEL_070_TITLE',   // "A [[w_a|PORTA]] ABRE A [[w_b|CHAVE]]"
  hints: ['LEVEL_070_HINT_1', 'LEVEL_070_HINT_2', 'LEVEL_070_HINT_3'],
  objects: [
    { id: 'w_a', inText: true, behaviors: { draggable: {}, receives: { from: ['w_b'], set: { swapped: true } } } },
    { id: 'w_b', inText: true, behaviors: { draggable: {}, receives: { from: ['w_a'], set: { swapped: true } } } },
    { id: 'floor', type: 'platform', x: 50, y: 112, w: 100, h: 16, z: 1, passive: true, props: { color: '#CDB69A' } },
    { id: 'door', type: 'door', x: 74, y: 84, w: 18, h: 36, z: 3,
      behaviors: { receives: { from: ['key'], requires: { rule: true }, set: { open: true }, consume: true, failSay: 'FB_BACKWARDS' } } },
    { id: 'key', type: 'key', x: 26, y: 70, w: 16, h: 8, z: 5, behaviors: { draggable: {} } }
  ],
  reactions: [
    { on: 'used', target: 'w_a', do: [{ swapText: ['w_a', 'w_b'] }, { state: 'door', key: 'rule', value: true }, { say: 'FB_MAKES_SENSE' }] },
    { on: 'used', target: 'w_b', do: [{ swapText: ['w_a', 'w_b'] }, { state: 'door', key: 'rule', value: true }, { say: 'FB_MAKES_SENSE' }] },
    { on: 'tap', target: 'door', cooldown: 600, do: [{ fx: 'shake' }, { sound: 'click' }] }
  ],
  win: { type: 'state', target: 'door', key: 'open' },
  onWin: [{ fx: 'pop', target: 'door' }]
});
