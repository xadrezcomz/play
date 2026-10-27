// FASE 111 — ACENDA AS 3 LUZES · os fios estão trocados: cada interruptor mexe em outras lâmpadas.
RULES.registerLevel({
  id: 111, chapter: 12,
  instruction: 'LEVEL_111_TITLE',
  hints: ['LEVEL_111_HINT_1', 'LEVEL_111_HINT_2', 'LEVEL_111_HINT_3'],
  objects: [
    {id: 'b1', type: 'bulb', x: 25, y: 44, w: 14, h: 19.599999999999998, z: 3, state: {on: false}},
    {id: 'b2', type: 'bulb', x: 50, y: 44, w: 14, h: 19.599999999999998, z: 3, state: {on: false}},
    {id: 'b3', type: 'bulb', x: 75, y: 44, w: 14, h: 19.599999999999998, z: 3, state: {on: false}},
    {id: 's1', type: 'switch', x: 25, y: 88, w: 10, h: 16, z: 3, state: {on: false}, behaviors: {clickable: {toggle: 'on', sound: 'click'}}},
    {id: 's2', type: 'switch', x: 50, y: 88, w: 10, h: 16, z: 3, state: {on: false}, behaviors: {clickable: {toggle: 'on', sound: 'click'}}},
    {id: 's3', type: 'switch', x: 75, y: 88, w: 10, h: 16, z: 3, state: {on: false}, behaviors: {clickable: {toggle: 'on', sound: 'click'}}}
  ],
  reactions: [
    {on: 'tap', target: 's1', 'do': [{toggle: 'b1'}, {toggle: 'b2'}]},
    {on: 'tap', target: 's2', 'do': [{toggle: 'b2'}, {toggle: 'b3'}]},
    {on: 'tap', target: 's3', 'do': [{toggle: 'b3'}]}
  ],
  win: [{type: 'state', target: 'b1', key: 'on'}, {type: 'state', target: 'b2', key: 'on'}, {type: 'state', target: 'b3', key: 'on'}],
  onWin: [{fx: 'pop', target: 'b1'}, {fx: 'pop', target: 'b2'}, {fx: 'pop', target: 'b3'}]
});
