// FASE 120 — ACENDA TODAS AS LUZES · a última lâmpada é o botão de dica.
RULES.registerLevel({
  id: 120, chapter: 12,
  instruction: 'LEVEL_120_TITLE',
  hints: ['LEVEL_120_HINT_1', 'LEVEL_120_HINT_2', 'LEVEL_120_HINT_3'],
  objects: [
    {id: 'b1', type: 'bulb', x: 25, y: 46, w: 14, h: 19.599999999999998, z: 3, state: {on: false}},
    {id: 'b2', type: 'bulb', x: 50, y: 46, w: 14, h: 19.599999999999998, z: 3, state: {on: false}},
    {id: 'b3', type: 'bulb', x: 75, y: 46, w: 14, h: 19.599999999999998, z: 3, state: {on: false}},
    {id: 's1', type: 'switch', x: 25, y: 88, w: 10, h: 16, z: 3, state: {on: false}, behaviors: {clickable: {toggle: 'on', sound: 'click'}}},
    {id: 's2', type: 'switch', x: 50, y: 88, w: 10, h: 16, z: 3, state: {on: false}, behaviors: {clickable: {toggle: 'on', sound: 'click'}}},
    {id: 's3', type: 'switch', x: 75, y: 88, w: 10, h: 16, z: 3, state: {on: false}, behaviors: {clickable: {toggle: 'on', sound: 'click'}}}
  ],
  reactions: [
    {on: 'tap', target: 's1', 'do': [{toggle: 'b1'}]},
    {on: 'tap', target: 's2', 'do': [{toggle: 'b2'}]},
    {on: 'tap', target: 's3', 'do': [{toggle: 'b3'}]}
  ],
  triggers: [
    {when: [{type: 'state', target: 'b1', key: 'on'}, {type: 'state', target: 'b2', key: 'on'}, {type: 'state', target: 'b3', key: 'on'}], 'do': [{wait: 400}, {say: 'FB_ONE_MORE_LIGHT'}]}
  ],
  win: [{type: 'state', target: 'b1', key: 'on'}, {type: 'state', target: 'b2', key: 'on'}, {type: 'state', target: 'b3', key: 'on'}, {type: 'hint'}],
  onWin: [{fx: 'pop', target: 'b1'}, {fx: 'pop', target: 'b2'}, {fx: 'pop', target: 'b3'}]
});
