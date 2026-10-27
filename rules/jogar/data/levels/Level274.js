// FASE 274 — ESQUENTE O AMIGO · ele está tremendo de frio: o sol ajuda, o sorvete não.
RULES.registerLevel({
  id: 274, chapter: 28,
  instruction: 'LEVEL_274_TITLE',
  hints: ['LEVEL_274_HINT_1', 'LEVEL_274_HINT_2', 'LEVEL_274_HINT_3'],
  objects: [
    {id: 'cold', type: 'ruli', x: 50, y: 66, w: 18, h: 20.16, z: 4, props: {color: 'blue'}, behaviors: {receives: {from: ['sun'], returnTool: true, set: {warm: true}}, 'receives#2': {from: ['ice', 'snow'], returnTool: true, set: {}}}, cls: 'shiver', state: {expr: 'confused'}},
    {id: 'ice', type: 'icecream', x: 22, y: 100, w: 9, h: 15, z: 4, behaviors: {draggable: {}}},
    {id: 'snow', type: 'snowman', x: 50, y: 100, w: 11, h: 15, z: 4, behaviors: {draggable: {}}},
    {id: 'sun', type: 'sun', x: 78, y: 100, w: 14, z: 4, behaviors: {draggable: {}}}
  ],
  reactions: [
    {on: 'used', target: 'cold', unless: {type: 'state', target: 'cold', key: 'warm'}, cooldown: 500, 'do': [{fail: 'FB_COLDER'}]},
    {on: 'state', target: 'cold', key: 'warm', 'do': [{cls: 'cold', remove: 'shiver'}, {state: 'cold', key: 'color', value: 'coral'}, {expr: 'happy', target: 'cold'}]}
  ],
  win: {type: 'state', target: 'cold', key: 'warm'},
  onWin: [{fx: 'hop', target: 'cold'}]
});
