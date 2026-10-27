// FASE 119 — APAGUE TODAS AS LUZES · também a luz do sol: feche a cortina.
RULES.registerLevel({
  id: 119, chapter: 12,
  instruction: 'LEVEL_119_TITLE',
  hints: ['LEVEL_119_HINT_1', 'LEVEL_119_HINT_2', 'LEVEL_119_HINT_3'],
  objects: [
    {id: 'win', type: 'sky', x: 50, y: 44, w: 46, h: 36, z: 1, passive: true},
    {id: 'sun', type: 'sun', x: 58, y: 40, w: 16, z: 2, passive: true},
    {id: 'curtain', type: 'curtain', x: 50, y: 44, w: 52, h: 40, z: 3, state: {open: true}, behaviors: {clickable: {toggle: 'open', fx: 'squash'}}},
    {id: 'b1', type: 'bulb', x: 13, y: 30, w: 14, h: 19.599999999999998, z: 3, state: {on: true}},
    {id: 'b2', type: 'bulb', x: 87, y: 30, w: 14, h: 19.599999999999998, z: 3, state: {on: true}},
    {id: 's1', type: 'switch', x: 30, y: 92, w: 10, h: 16, z: 3, state: {on: true}, behaviors: {clickable: {toggle: 'on', sound: 'click'}}},
    {id: 's2', type: 'switch', x: 70, y: 92, w: 10, h: 16, z: 3, state: {on: true}, behaviors: {clickable: {toggle: 'on', sound: 'click'}}}
  ],
  reactions: [
    {on: 'tap', target: 's1', 'do': [{toggle: 'b1'}]},
    {on: 'tap', target: 's2', 'do': [{toggle: 'b2'}]}
  ],
  triggers: [
    {when: [{type: 'state', target: 'b1', key: 'on', equals: false}, {type: 'state', target: 'b2', key: 'on', equals: false}, {type: 'state', target: 'curtain', key: 'open'}], 'do': [{wait: 300}, {say: 'FB_STILL_LIGHT'}]}
  ],
  win: [{type: 'state', target: 'b1', key: 'on', equals: false}, {type: 'state', target: 'b2', key: 'on', equals: false}, {type: 'state', target: 'curtain', key: 'open', equals: false}],
  onWin: [{fx: 'squash', target: 'curtain'}]
});
