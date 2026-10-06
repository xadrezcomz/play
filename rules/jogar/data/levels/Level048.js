// FASE 48 — ENCONTRE A RESPOSTA · nenhum número serve: a palavra RESPOSTA vai no espaço.
RULES.registerLevel({
  id: 48, chapter: 5,
  instruction: 'LEVEL_048_TITLE',   // contém [[w_ans|RESPOSTA]]
  hints: ['LEVEL_048_HINT_1', 'LEVEL_048_HINT_2', 'LEVEL_048_HINT_3'],
  objects: [
    { id: 'w_ans', inText: true, behaviors: { draggable: {} } },
    { id: 'q', type: 'word', textKey: 'LEVEL_048_Q', fontU: 8, x: 50, y: 34, z: 2, passive: true },
    { id: 'slot', type: 'outline', x: 50, y: 62, w: 46, h: 16, z: 1,
      behaviors: {
        receives: { from: ['w_ans'], set: { answered: true } },
        'receives#2': { from: ['c4', 'c6', 'c7'], requires: { never: true }, failSay: 'FB_WRONG' }
      } },
    { id: 'c4', type: 'card', x: 24, y: 98, w: 14, h: 19, props: { n: 4 }, behaviors: { draggable: {} } },
    { id: 'c6', type: 'card', x: 50, y: 98, w: 14, h: 19, props: { n: 6 }, behaviors: { draggable: {} } },
    { id: 'c7', type: 'card', x: 76, y: 98, w: 14, h: 19, props: { n: 7 }, behaviors: { draggable: {} } }
  ],
  win: { type: 'state', target: 'slot', key: 'answered' },
  onWin: [{ move: 'w_ans', toObj: 'slot', ms: 200 }, { fx: 'pop', target: 'w_ans' }]
});
