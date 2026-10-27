// FASE 265 — CHEGUE EM ÚLTIMO · deixe o amigo chegar antes na bandeira.
RULES.registerLevel({
  id: 265, chapter: 27,
  instruction: 'LEVEL_265_TITLE',
  hints: ['LEVEL_265_HINT_1', 'LEVEL_265_HINT_2', 'LEVEL_265_HINT_3'],
  objects: [
    {id: 'floor', type: 'platform', x: 50, y: 104, w: 100, h: 12, z: 0, passive: true},
    {id: 'lane', type: 'bar', x: 50, y: 74, w: 100, h: 1, z: 0, passive: true, props: {color: '#E3DDD2'}},
    {id: 'flag', type: 'flag', x: 88, y: 76, w: 8, h: 50, z: 1, passive: true},
    {id: 'friend', type: 'ruli', x: 12, y: 62, w: 11, h: 12.3, z: 3, passive: true, props: {color: 'pink'}, behaviors: {patrol: {points: [[12, 62], [84, 62]], ms: 5200, delay: 2500, pause: 600000}}},
    {id: 'ruli', type: 'ruli', x: 12, y: 90, w: 11, h: 12.3, z: 3, behaviors: {draggable: {axis: 'x', minX: 8, maxX: 90}, character: {}}}
  ],
  reactions: [
    {on: 'dragmove', target: 'ruli', when: {type: 'pos', target: 'ruli', minX: 82}, unless: {type: 'pos', target: 'friend', minX: 82}, cooldown: 1000, 'do': [{drop: 'ruli'}, {reset: 'ruli', ms: 300}, {fail: 'FB_YOU_WON_RACE'}]}
  ],
  win: [{type: 'pos', target: 'friend', minX: 82}, {type: 'pos', target: 'ruli', minX: 82}],
  onWin: [{expr: 'happy', target: 'friend'}, {expr: 'happy', target: 'ruli'}]
});
