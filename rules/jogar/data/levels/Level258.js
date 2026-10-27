// FASE 258 — LEIA A LETRA MIÚDA · amplie o papel com a pinça e faça o que ele diz.
RULES.registerLevel({
  id: 258, chapter: 26,
  instruction: 'LEVEL_258_TITLE',
  hints: ['LEVEL_258_HINT_1', 'LEVEL_258_HINT_2', 'LEVEL_258_HINT_3'],
  objects: [
    {id: 'tiny', type: 'word', textKey: 'LEVEL_258_MSG', fontU: 1.2, x: 50, y: 46, z: 3, cls: 'sign', behaviors: {scalable: {min: 1, max: 6}}},
    {id: 'sun', type: 'sun', x: 24, y: 94, w: 16, z: 2},
    {id: 'moon', type: 'moon', x: 50, y: 94, w: 14, z: 2},
    {id: 'star', type: 'star', x: 76, y: 94, w: 14, z: 2}
  ],
  reactions: [
    {on: 'tap', target: 'sun', cooldown: 500, 'do': [{fx: 'shake'}, {fail: 'FB_NOT_WHAT_IT_SAYS'}]},
    {on: 'tap', target: 'moon', cooldown: 500, 'do': [{fx: 'shake'}, {fail: 'FB_NOT_WHAT_IT_SAYS'}]}
  ],
  win: {type: 'tapped', target: 'star'},
  onWin: [{fx: 'pop', target: 'star'}]
});
