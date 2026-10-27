// FASE 239 — QUEM TROCOU DE LUGAR? · no escuro, o rosa e o roxo trocaram; toque num deles.
RULES.registerLevel({
  id: 239, chapter: 24,
  instruction: 'LEVEL_239_TITLE',
  hints: ['LEVEL_239_HINT_1', 'LEVEL_239_HINT_2', 'LEVEL_239_HINT_3'],
  objects: [
    {id: 'p0', type: 'ruli', x: 20, y: 76, w: 14, h: 16, z: 2, props: {color: 'teal'}},
    {id: 'p1', type: 'ruli', x: 40, y: 76, w: 14, h: 16, z: 2, props: {color: 'pink'}},
    {id: 'p2', type: 'ruli', x: 60, y: 76, w: 14, h: 16, z: 2, props: {color: 'yellow'}},
    {id: 'p3', type: 'ruli', x: 80, y: 76, w: 14, h: 16, z: 2, props: {color: 'purple'}},
    {id: 'dark', type: 'blackout', x: 50, y: 70, w: 104, h: 100, z: 10, passive: true, hidden: true},
    {id: 'ctl', type: 'marker', x: 0, y: 0, w: 1, passive: true, behaviors: {timer: {delay: 2600, times: 1, 'do': [{show: 'dark'}, {move: 'p1', to: [80, 76], ms: 0}, {move: 'p3', to: [40, 76], ms: 0}, {wait: 800}, {hide: 'dark'}, {state: 'ctl', key: 'asked', value: true}]}}}
  ],
  reactions: [
    {on: 'tap', target: 'p0', cooldown: 500, 'do': [{fx: 'hop'}, {fail: 'FB_DIDNT_MOVE'}]},
    {on: 'tap', target: 'p2', cooldown: 500, 'do': [{fx: 'hop'}, {fail: 'FB_DIDNT_MOVE'}]},
    {on: 'tap', target: 'p1', unless: {type: 'state', target: 'ctl', key: 'asked'}, 'do': [{forget: 'p1'}]},
    {on: 'tap', target: 'p3', unless: {type: 'state', target: 'ctl', key: 'asked'}, 'do': [{forget: 'p3'}]}
  ],
  win: [{type: 'state', target: 'ctl', key: 'asked'}, {type: 'any', of: [{type: 'tapped', target: 'p1'}, {type: 'tapped', target: 'p3'}]}],
  onWin: [{expr: 'happy', target: 'p1'}, {expr: 'happy', target: 'p3'}]
});
