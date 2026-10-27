// FASE 246 — QUAL RATINHO CHEGA AO QUEIJO? · siga os fios com os olhos: é o vermelho.
RULES.registerLevel({
  id: 246, chapter: 25,
  instruction: 'LEVEL_246_TITLE',
  hints: ['LEVEL_246_HINT_1', 'LEVEL_246_HINT_2', 'LEVEL_246_HINT_3'],
  objects: [
    {id: 'wa', type: 'wire', x: 50, y: 66, w: 72, h: 50, z: 1, passive: true, props: {color: 'coral', pts: [[15, 0], [15, 30], [70, 40], [40, 70], [85, 100]], width: 4}},
    {id: 'wb', type: 'wire', x: 50, y: 66, w: 72, h: 50, z: 1, passive: true, props: {color: 'blue', pts: [[50, 0], [50, 20], [20, 50], [80, 70], [15, 100]], width: 4}},
    {id: 'wc', type: 'wire', x: 50, y: 66, w: 72, h: 50, z: 1, passive: true, props: {color: 'green', pts: [[85, 0], [85, 25], [30, 30], [60, 60], [50, 100]], width: 4}},
    {id: 'sa', type: 'mouse', x: 24.8, y: 36, w: 10, h: 7, z: 3, props: {color: 'coral'}},
    {id: 'sb', type: 'mouse', x: 50.0, y: 36, w: 10, h: 7, z: 3, props: {color: 'blue'}},
    {id: 'sc', type: 'mouse', x: 75.2, y: 36, w: 10, h: 7, z: 3, props: {color: 'green'}},
    {id: 'cheese', type: 'cheese', x: 75.19999999999999, y: 96, w: 10, h: 7, z: 3, passive: true},
    {id: 'xm1', type: 'xmark', x: 24.799999999999997, y: 96, w: 7, z: 3, passive: true},
    {id: 'xm2', type: 'xmark', x: 50, y: 96, w: 7, z: 3, passive: true}
  ],
  reactions: [
    {on: 'tap', target: 'sb', cooldown: 500, 'do': [{fx: 'shake'}, {fail: 'FB_FOLLOW_LINE'}]},
    {on: 'tap', target: 'sc', cooldown: 500, 'do': [{fx: 'shake'}, {fail: 'FB_FOLLOW_LINE'}]}
  ],
  win: {type: 'tapped', target: 'sa'},
  onWin: [{move: 'sa', toObj: 'cheese', ms: 600}]
});
