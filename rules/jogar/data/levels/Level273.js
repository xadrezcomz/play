// FASE 273 — DÊ A CADA AMIGO O QUE ELE QUER · olhe o pensamento de cada um.
RULES.registerLevel({
  id: 273, chapter: 28,
  instruction: 'LEVEL_273_TITLE',
  hints: ['LEVEL_273_HINT_1', 'LEVEL_273_HINT_2', 'LEVEL_273_HINT_3'],
  objects: [
    {id: 'fa_t', type: 'thought', x: 26, y: 48, w: 20, h: 16, z: 2, passive: true, props: {sym: 'apple', symColor: null}},
    {id: 'fa', type: 'ruli', x: 22, y: 72, w: 13, h: 14.56, z: 4, props: {color: 'pink'}, behaviors: {receives: {from: ['apple'], consume: true, set: {happy: true}}, 'receives#2': {from: ['star', 'ball'], returnTool: true, set: {}}}},
    {id: 'fb_t', type: 'thought', x: 54, y: 48, w: 20, h: 16, z: 2, passive: true, props: {sym: 'star', symColor: null}},
    {id: 'fb', type: 'ruli', x: 50, y: 72, w: 13, h: 14.56, z: 4, props: {color: 'yellow'}, behaviors: {receives: {from: ['star'], consume: true, set: {happy: true}}, 'receives#2': {from: ['apple', 'ball'], returnTool: true, set: {}}}},
    {id: 'fc_t', type: 'thought', x: 82, y: 48, w: 20, h: 16, z: 2, passive: true, props: {sym: 'ball', symColor: 'blue'}},
    {id: 'fc', type: 'ruli', x: 78, y: 72, w: 13, h: 14.56, z: 4, props: {color: 'purple'}, behaviors: {receives: {from: ['ball'], consume: true, set: {happy: true}}, 'receives#2': {from: ['apple', 'star'], returnTool: true, set: {}}}},
    {id: 'apple', type: 'apple', x: 50, y: 102, w: 11, z: 5, props: {color: 'coral'}, behaviors: {draggable: {}}},
    {id: 'star', type: 'star', x: 78, y: 102, w: 11, z: 5, props: {color: 'yellow'}, behaviors: {draggable: {}}},
    {id: 'ball', type: 'ball', x: 22, y: 102, w: 11, z: 5, props: {color: 'blue'}, behaviors: {draggable: {}}}
  ],
  reactions: [
    {on: 'used', target: 'fa', unless: {type: 'state', target: 'fa', key: 'happy'}, cooldown: 500, 'do': [{expr: 'confused', target: 'fa'}, {fail: 'FB_NOT_WHAT_I_WANT'}]},
    {on: 'used', target: 'fb', unless: {type: 'state', target: 'fb', key: 'happy'}, cooldown: 500, 'do': [{expr: 'confused', target: 'fb'}, {fail: 'FB_NOT_WHAT_I_WANT'}]},
    {on: 'used', target: 'fc', unless: {type: 'state', target: 'fc', key: 'happy'}, cooldown: 500, 'do': [{expr: 'confused', target: 'fc'}, {fail: 'FB_NOT_WHAT_I_WANT'}]},
    {on: 'state', target: 'fa', key: 'happy', 'do': [{expr: 'happy', target: 'fa'}, {hide: 'fa_t'}]},
    {on: 'state', target: 'fb', key: 'happy', 'do': [{expr: 'happy', target: 'fb'}, {hide: 'fb_t'}]},
    {on: 'state', target: 'fc', key: 'happy', 'do': [{expr: 'happy', target: 'fc'}, {hide: 'fc_t'}]}
  ],
  win: [{type: 'state', target: 'fa', key: 'happy'}, {type: 'state', target: 'fb', key: 'happy'}, {type: 'state', target: 'fc', key: 'happy'}],
  onWin: [{fx: 'hop', target: 'fa'}, {fx: 'hop', target: 'fb'}, {fx: 'hop', target: 'fc'}]
});
