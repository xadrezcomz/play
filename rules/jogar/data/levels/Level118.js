// FASE 118 — DEIXE SÓ UMA LUZ ACESA · em roda, cada lâmpada troca ela e as duas vizinhas.
RULES.registerLevel({
  id: 118, chapter: 12,
  instruction: 'LEVEL_118_TITLE',
  hints: ['LEVEL_118_HINT_1', 'LEVEL_118_HINT_2', 'LEVEL_118_HINT_3'],
  objects: [
    {id: 'r0', type: 'bulb', x: 50.0, y: 36.0, w: 13, h: 18.2, z: 3, state: {on: true}},
    {id: 'r1', type: 'bulb', x: 78.5, y: 56.7, w: 13, h: 18.2, z: 3, state: {on: true}},
    {id: 'r2', type: 'bulb', x: 67.6, y: 90.3, w: 13, h: 18.2, z: 3, state: {on: true}},
    {id: 'r3', type: 'bulb', x: 32.4, y: 90.3, w: 13, h: 18.2, z: 3, state: {on: true}},
    {id: 'r4', type: 'bulb', x: 21.5, y: 56.7, w: 13, h: 18.2, z: 3, state: {on: true}}
  ],
  reactions: [
    {on: 'tap', target: 'r0', 'do': [{toggle: 'r4'}, {toggle: 'r0'}, {toggle: 'r1'}]},
    {on: 'tap', target: 'r1', 'do': [{toggle: 'r0'}, {toggle: 'r1'}, {toggle: 'r2'}]},
    {on: 'tap', target: 'r2', 'do': [{toggle: 'r1'}, {toggle: 'r2'}, {toggle: 'r3'}]},
    {on: 'tap', target: 'r3', 'do': [{toggle: 'r2'}, {toggle: 'r3'}, {toggle: 'r4'}]},
    {on: 'tap', target: 'r4', 'do': [{toggle: 'r3'}, {toggle: 'r4'}, {toggle: 'r0'}]}
  ],
  win: {type: 'countState', ids: ['r0', 'r1', 'r2', 'r3', 'r4'], key: 'on', equals: 1},
  onWin: [{fx: 'pop', target: 'r0'}, {fx: 'pop', target: 'r1'}, {fx: 'pop', target: 'r2'}, {fx: 'pop', target: 'r3'}, {fx: 'pop', target: 'r4'}]
});
