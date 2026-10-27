// FASE 275 — QUEM ESTÁ TRISTE? · todos sorriem, menos o verde, que está sério.
RULES.registerLevel({
  id: 275, chapter: 28,
  instruction: 'LEVEL_275_TITLE',
  hints: ['LEVEL_275_HINT_1', 'LEVEL_275_HINT_2', 'LEVEL_275_HINT_3'],
  objects: [
    {id: 'c0', type: 'ruli', x: 22, y: 50, w: 15, h: 16.8, z: 4, props: {color: 'pink'}, state: {expr: 'normal'}},
    {id: 'c1', type: 'ruli', x: 50, y: 50, w: 15, h: 16.8, z: 4, props: {color: 'yellow'}, state: {expr: 'normal'}},
    {id: 'c2', type: 'ruli', x: 78, y: 50, w: 15, h: 16.8, z: 4, props: {color: 'purple'}, state: {expr: 'normal'}},
    {id: 'c3', type: 'ruli', x: 22, y: 86, w: 15, h: 16.8, z: 4, props: {color: 'coral'}, state: {expr: 'normal'}},
    {id: 'c4', type: 'ruli', x: 50, y: 86, w: 15, h: 16.8, z: 4, props: {color: 'green'}, state: {expr: 'serious'}},
    {id: 'c5', type: 'ruli', x: 78, y: 86, w: 15, h: 16.8, z: 4, props: {color: 'blue'}, state: {expr: 'normal'}}
  ],
  reactions: [
    {on: 'tap', target: 'c0', cooldown: 500, 'do': [{fx: 'hop'}, {fail: 'FB_THIS_ONE_IS_FINE'}]},
    {on: 'tap', target: 'c1', cooldown: 500, 'do': [{fx: 'hop'}, {fail: 'FB_THIS_ONE_IS_FINE'}]},
    {on: 'tap', target: 'c2', cooldown: 500, 'do': [{fx: 'hop'}, {fail: 'FB_THIS_ONE_IS_FINE'}]},
    {on: 'tap', target: 'c3', cooldown: 500, 'do': [{fx: 'hop'}, {fail: 'FB_THIS_ONE_IS_FINE'}]},
    {on: 'tap', target: 'c5', cooldown: 500, 'do': [{fx: 'hop'}, {fail: 'FB_THIS_ONE_IS_FINE'}]}
  ],
  win: {type: 'tapped', target: 'c4'},
  onWin: [{expr: 'happy', target: 'c4'}, {fx: 'hop', target: 'c4'}]
});
