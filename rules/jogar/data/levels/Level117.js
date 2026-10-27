// FASE 117 — ACENDA TODAS AS LUZES · cada lâmpada troca ela e as vizinhas em cruz: cantos e centro.
RULES.registerLevel({
  id: 117, chapter: 12,
  instruction: 'LEVEL_117_TITLE',
  hints: ['LEVEL_117_HINT_1', 'LEVEL_117_HINT_2', 'LEVEL_117_HINT_3'],
  objects: [
    {id: 'g0', type: 'bulb', x: 26, y: 38, w: 13, h: 18.2, z: 3, state: {on: false}},
    {id: 'g1', type: 'bulb', x: 50, y: 38, w: 13, h: 18.2, z: 3, state: {on: false}},
    {id: 'g2', type: 'bulb', x: 74, y: 38, w: 13, h: 18.2, z: 3, state: {on: false}},
    {id: 'g3', type: 'bulb', x: 26, y: 68, w: 13, h: 18.2, z: 3, state: {on: false}},
    {id: 'g4', type: 'bulb', x: 50, y: 68, w: 13, h: 18.2, z: 3, state: {on: false}},
    {id: 'g5', type: 'bulb', x: 74, y: 68, w: 13, h: 18.2, z: 3, state: {on: false}},
    {id: 'g6', type: 'bulb', x: 26, y: 98, w: 13, h: 18.2, z: 3, state: {on: false}},
    {id: 'g7', type: 'bulb', x: 50, y: 98, w: 13, h: 18.2, z: 3, state: {on: false}},
    {id: 'g8', type: 'bulb', x: 74, y: 98, w: 13, h: 18.2, z: 3, state: {on: false}}
  ],
  reactions: [
    {on: 'tap', target: 'g0', 'do': [{toggle: 'g0'}, {toggle: 'g3'}, {toggle: 'g1'}]},
    {on: 'tap', target: 'g1', 'do': [{toggle: 'g1'}, {toggle: 'g4'}, {toggle: 'g2'}, {toggle: 'g0'}]},
    {on: 'tap', target: 'g2', 'do': [{toggle: 'g2'}, {toggle: 'g5'}, {toggle: 'g1'}]},
    {on: 'tap', target: 'g3', 'do': [{toggle: 'g3'}, {toggle: 'g6'}, {toggle: 'g0'}, {toggle: 'g4'}]},
    {on: 'tap', target: 'g4', 'do': [{toggle: 'g4'}, {toggle: 'g7'}, {toggle: 'g1'}, {toggle: 'g5'}, {toggle: 'g3'}]},
    {on: 'tap', target: 'g5', 'do': [{toggle: 'g5'}, {toggle: 'g8'}, {toggle: 'g2'}, {toggle: 'g4'}]},
    {on: 'tap', target: 'g6', 'do': [{toggle: 'g6'}, {toggle: 'g3'}, {toggle: 'g7'}]},
    {on: 'tap', target: 'g7', 'do': [{toggle: 'g7'}, {toggle: 'g4'}, {toggle: 'g8'}, {toggle: 'g6'}]},
    {on: 'tap', target: 'g8', 'do': [{toggle: 'g8'}, {toggle: 'g5'}, {toggle: 'g7'}]}
  ],
  win: [{type: 'state', target: 'g0', key: 'on'}, {type: 'state', target: 'g1', key: 'on'}, {type: 'state', target: 'g2', key: 'on'}, {type: 'state', target: 'g3', key: 'on'}, {type: 'state', target: 'g4', key: 'on'}, {type: 'state', target: 'g5', key: 'on'}, {type: 'state', target: 'g6', key: 'on'}, {type: 'state', target: 'g7', key: 'on'}, {type: 'state', target: 'g8', key: 'on'}],
  onWin: [{fx: 'pop', target: 'g0'}, {fx: 'pop', target: 'g1'}, {fx: 'pop', target: 'g2'}, {fx: 'pop', target: 'g3'}, {fx: 'pop', target: 'g4'}, {fx: 'pop', target: 'g5'}, {fx: 'pop', target: 'g6'}, {fx: 'pop', target: 'g7'}, {fx: 'pop', target: 'g8'}]
});
