// FASE 116 — ACENDA TODAS AS VELAS · esfregue a lenha para fazer fogo; uma vela acesa acende as outras.
RULES.registerLevel({
  id: 116, chapter: 12,
  instruction: 'LEVEL_116_TITLE',
  hints: ['LEVEL_116_HINT_1', 'LEVEL_116_HINT_2', 'LEVEL_116_HINT_3'],
  objects: [
    {id: 'fire', type: 'campfire', x: 70, y: 98, w: 28, h: 22, z: 2, behaviors: {rubbable: {count: 12, progress: 'heat', set: {fire: true}}, receives: {from: ['c1', 'c3'], requires: {fire: true}, returnTool: true, failSay: 'FB_NEEDS_FIRE'}}},
    {id: 'c1', type: 'candle', x: 22, y: 96, w: 9, h: 23, z: 4, props: {color: 'pink'}, state: {lit: false}, behaviors: {draggable: {}, receives: {from: ['c3'], toolRequires: {lit: true}, set: {lit: true}, returnTool: true, failSay: 'FB_NEEDS_FIRE'}}},
    {id: 'c2', type: 'candle', x: 50, y: 50, w: 9, h: 23, z: 4, props: {color: 'blue'}, state: {lit: false}, behaviors: {receives: {from: ['c1', 'c3'], toolRequires: {lit: true}, set: {lit: true}, returnTool: true, failSay: 'FB_NEEDS_FIRE'}}},
    {id: 'c3', type: 'candle', x: 78, y: 50, w: 9, h: 23, z: 4, props: {color: 'yellow'}, state: {lit: false}, behaviors: {draggable: {}, receives: {from: ['c1', 'c2'], toolRequires: {lit: true}, set: {lit: true}, returnTool: true, failSay: 'FB_NEEDS_FIRE'}}}
  ],
  reactions: [
    {on: 'used', target: 'fire', tool: 'c1', 'do': [{state: 'c1', key: 'lit', value: true}]},
    {on: 'used', target: 'fire', tool: 'c3', 'do': [{state: 'c3', key: 'lit', value: true}]}
  ],
  win: [{type: 'state', target: 'c1', key: 'lit'}, {type: 'state', target: 'c2', key: 'lit'}, {type: 'state', target: 'c3', key: 'lit'}],
  onWin: [{fx: 'pop', target: 'c1'}, {fx: 'pop', target: 'c2'}, {fx: 'pop', target: 'c3'}]
});
