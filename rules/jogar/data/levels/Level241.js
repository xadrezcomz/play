// FASE 241 — QUAL É O PRÓXIMO? · 2, 4, 8, 16: cada um é o dobro; o próximo é 32.
RULES.registerLevel({
  id: 241, chapter: 25,
  instruction: 'LEVEL_241_TITLE',
  hints: ['LEVEL_241_HINT_1', 'LEVEL_241_HINT_2', 'LEVEL_241_HINT_3'],
  objects: [
    {id: 'n0', type: 'number', x: 14, y: 46, w: 13, z: 3, props: {n: 2}},
    {id: 'n1', type: 'number', x: 32, y: 46, w: 13, z: 3, props: {n: 4}},
    {id: 'n2', type: 'number', x: 50, y: 46, w: 13, z: 3, props: {n: 8}},
    {id: 'n3', type: 'number', x: 68, y: 46, w: 13, z: 3, props: {n: 16}},
    {id: 'q', type: 'slot', x: 86, y: 46, w: 13, z: 2, passive: true},
    {id: 'o18', type: 'number', x: 26, y: 92, w: 15, z: 3, props: {n: 18, color: 'yellow'}},
    {id: 'o24', type: 'number', x: 50, y: 92, w: 15, z: 3, props: {n: 24, color: 'yellow'}},
    {id: 'o32', type: 'number', x: 74, y: 92, w: 15, z: 3, props: {n: 32, color: 'yellow'}}
  ],
  reactions: [
    {on: 'tap', target: 'o18', cooldown: 500, 'do': [{fx: 'shake'}, {fail: 'FB_THINK_AGAIN'}]},
    {on: 'tap', target: 'o24', cooldown: 500, 'do': [{fx: 'shake'}, {fail: 'FB_THINK_AGAIN'}]}
  ],
  win: {type: 'tapped', target: 'o32'},
  onWin: [{move: 'o32', toObj: 'q', ms: 300}]
});
