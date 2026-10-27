// FASE 205 — DIVIDA O BOLO AO MEIO · desenhe uma linha de cima até embaixo, pelo meio.
RULES.registerLevel({
  id: 205, chapter: 21,
  instruction: 'LEVEL_205_TITLE',
  hints: ['LEVEL_205_HINT_1', 'LEVEL_205_HINT_2', 'LEVEL_205_HINT_3'],
  draw: true,
  objects: [
    {id: 'cake', type: 'cake', x: 50, y: 74, w: 56, h: 45, z: 2, passive: true},
    {id: 'top', type: 'marker', x: 50, y: 50, w: 2, z: 0, passive: true},
    {id: 'bottom', type: 'marker', x: 50, y: 98, w: 2, z: 0, passive: true},
    {id: 'cut', type: 'stick', x: 50, y: 76, w: 1.6, h: 40, z: 3, passive: true, hidden: true, props: {color: '#FFFDF5'}},
    {id: 'ctl', type: 'marker', x: 0, y: 0, w: 1, passive: true, behaviors: {drawZone: {from: 'top', to: 'bottom', spawn: 'cut', tol: 10, failSay: 'FB_NOT_HALF'}}}
  ],
  win: {type: 'state', target: 'ctl', key: 'done'},
  onWin: [{fx: 'pop', target: 'cake'}]
});
