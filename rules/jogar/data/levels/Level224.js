// FASE 224 — LEIA A MENSAGEM SECRETA · esfregue o papel para revelar e faça o que ela diz.
RULES.registerLevel({
  id: 224, chapter: 23,
  instruction: 'LEVEL_224_TITLE',
  hints: ['LEVEL_224_HINT_1', 'LEVEL_224_HINT_2', 'LEVEL_224_HINT_3'],
  objects: [
    {id: 'paper', type: 'paper', x: 50, y: 50, w: 64, h: 30, z: 1, props: {blank: true}, behaviors: {rubbable: {count: 12, set: {shown: true}}}},
    {id: 'msg', type: 'word', textKey: 'LEVEL_224_MSG', fontU: 5, x: 50, y: 50, z: 2, passive: true, hidden: true},
    {id: 'sun', type: 'sun', x: 24, y: 94, w: 16, z: 2},
    {id: 'moon', type: 'moon', x: 50, y: 94, w: 14, z: 2},
    {id: 'star', type: 'star', x: 76, y: 94, w: 14, z: 2}
  ],
  reactions: [
    {on: 'state', target: 'paper', key: 'shown', 'do': [{show: 'msg'}]},
    {on: 'tap', target: 'sun', unless: {type: 'state', target: 'paper', key: 'shown'}, cooldown: 500, 'do': [{fx: 'shake'}, {fail: 'FB_READ_FIRST'}]},
    {on: 'tap', target: 'sun', when: {type: 'state', target: 'paper', key: 'shown'}, cooldown: 500, 'do': [{fx: 'shake'}, {fail: 'FB_NOT_WHAT_IT_SAYS'}]},
    {on: 'tap', target: 'star', 'do': [{fx: 'shake'}, {fail: 'FB_NOT_WHAT_IT_SAYS'}]},
    {on: 'tap', target: 'moon', unless: {type: 'state', target: 'paper', key: 'shown'}, 'do': [{forget: 'moon'}, {fx: 'shake'}, {fail: 'FB_READ_FIRST'}]}
  ],
  win: [{type: 'state', target: 'paper', key: 'shown'}, {type: 'tapped', target: 'moon'}],
  onWin: [{fx: 'pop', target: 'moon'}]
});
