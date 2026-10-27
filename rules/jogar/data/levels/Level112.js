// FASE 112 — APAGUE TODAS AS LUZES · cada lâmpada tocada troca ela e as vizinhas: toque nas das pontas.
RULES.registerLevel({
  id: 112, chapter: 12,
  instruction: 'LEVEL_112_TITLE',
  hints: ['LEVEL_112_HINT_1', 'LEVEL_112_HINT_2', 'LEVEL_112_HINT_3'],
  objects: [
    {id: 'b1', type: 'bulb', x: 17, y: 62, w: 14, h: 19.599999999999998, z: 3, state: {on: true}},
    {id: 'b2', type: 'bulb', x: 39, y: 62, w: 14, h: 19.599999999999998, z: 3, state: {on: true}},
    {id: 'b3', type: 'bulb', x: 61, y: 62, w: 14, h: 19.599999999999998, z: 3, state: {on: true}},
    {id: 'b4', type: 'bulb', x: 83, y: 62, w: 14, h: 19.599999999999998, z: 3, state: {on: true}}
  ],
  reactions: [
    {on: 'tap', target: 'b1', 'do': [{toggle: 'b1'}, {toggle: 'b2'}]},
    {on: 'tap', target: 'b2', 'do': [{toggle: 'b1'}, {toggle: 'b2'}, {toggle: 'b3'}]},
    {on: 'tap', target: 'b3', 'do': [{toggle: 'b2'}, {toggle: 'b3'}, {toggle: 'b4'}]},
    {on: 'tap', target: 'b4', 'do': [{toggle: 'b3'}, {toggle: 'b4'}]}
  ],
  win: [{type: 'state', target: 'b1', key: 'on', equals: false}, {type: 'state', target: 'b2', key: 'on', equals: false}, {type: 'state', target: 'b3', key: 'on', equals: false}, {type: 'state', target: 'b4', key: 'on', equals: false}],
  onWin: [{fx: 'squash', target: 'b1'}, {fx: 'squash', target: 'b2'}, {fx: 'squash', target: 'b3'}, {fx: 'squash', target: 'b4'}]
});
