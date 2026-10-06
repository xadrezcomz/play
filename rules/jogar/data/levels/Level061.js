// FASE 61 — FAÇA O GATO VIRAR PATO · solte a letra P em cima do G (em inglês, B no C: CAT → BAT).
RULES.registerLevel({
  id: 61, chapter: 7,
  instruction: 'LEVEL_061_TITLE',
  hints: ['LEVEL_061_HINT_1', 'LEVEL_061_HINT_2', 'LEVEL_061_HINT_3'],
  objects: [
    { id: 'l1', type: 'word', textKey: 'LEVEL_061_L1', fontU: 10, cls: 'card', x: 26, y: 54, z: 3 },
    { id: 'l2', type: 'word', textKey: 'LEVEL_061_L2', fontU: 10, cls: 'card', x: 42, y: 54, z: 3 },
    { id: 'l3', type: 'word', textKey: 'LEVEL_061_L3', fontU: 10, cls: 'card', x: 58, y: 54, z: 3 },
    { id: 'l4', type: 'word', textKey: 'LEVEL_061_L4', fontU: 10, cls: 'card', x: 74, y: 54, z: 3 },
    { id: 'l1b', type: 'word', textKey: 'LEVEL_061_NEW', fontU: 10, cls: 'card', x: 26, y: 54, z: 4, hidden: true },
    { id: 'pnew', type: 'word', textKey: 'LEVEL_061_NEW', fontU: 10, cls: 'card', x: 34, y: 96, z: 6,
      behaviors: { draggable: {}, merge: { 'with': ['l1'], into: 'l1b' } } },
    { id: 'pdec', type: 'word', textKey: 'LEVEL_061_DECOY', fontU: 10, cls: 'card', x: 66, y: 96, z: 6, behaviors: { draggable: {} } }
  ],
  win: { type: 'state', target: 'l1b', key: 'made' },
  onWin: [{ fx: 'pop', target: 'l2' }, { fx: 'pop', target: 'l3' }, { fx: 'pop', target: 'l4' }]
});
