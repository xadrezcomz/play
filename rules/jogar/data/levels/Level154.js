// FASE 154 — APAGUE A VELA · sopre: deslize o dedo rápido por cima da vela.
RULES.registerLevel({
  id: 154, chapter: 16,
  instruction: 'LEVEL_154_TITLE',
  hints: ['LEVEL_154_HINT_1', 'LEVEL_154_HINT_2', 'LEVEL_154_HINT_3'],
  objects: [
    {id: 'cake', type: 'bar', x: 50, y: 98, w: 44, h: 18, z: 1, passive: true, props: {color: 'pink'}},
    {id: 'candle', type: 'candle', x: 50, y: 72, w: 12, h: 32, z: 3, state: {lit: true}}
  ],
  reactions: [
    {on: 'tap', target: 'candle', cooldown: 700, 'do': [{fx: 'shake'}, {fail: 'FB_HOT'}]},
    {on: 'swipe', target: 'candle', 'do': [{state: 'candle', key: 'lit', value: false}, {sound: 'whoosh'}]}
  ],
  win: {type: 'state', target: 'candle', key: 'lit', equals: false},
  onWin: [{mascot: 'happy'}]
});
