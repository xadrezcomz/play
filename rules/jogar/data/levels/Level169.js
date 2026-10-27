// FASE 169 — PEGUE O RATINHO 3 VEZES · ele aparece e some nos buracos; toque quando aparecer.
RULES.registerLevel({
  id: 169, chapter: 17,
  instruction: 'LEVEL_169_TITLE',
  hints: ['LEVEL_169_HINT_1', 'LEVEL_169_HINT_2', 'LEVEL_169_HINT_3'],
  objects: [
    {id: 'h0', type: 'hole', x: 22, y: 75, w: 18, h: 6, z: 1, passive: true},
    {id: 'h1', type: 'hole', x: 50, y: 97, w: 18, h: 6, z: 1, passive: true},
    {id: 'h2', type: 'hole', x: 78, y: 75, w: 18, h: 6, z: 1, passive: true},
    {id: 'score', type: 'display', x: 50, y: 36, w: 26, h: 13, z: 2, passive: true, state: {n: 0}},
    {id: 'mouse', type: 'mouse', x: 22, y: 66, w: 14, h: 10, z: 3, hidden: true},
    {id: 'ctl', type: 'marker', x: 0, y: 0, w: 1, passive: true, behaviors: {timer: {every: 100, delay: 600, 'do': [{move: 'mouse', to: [22, 67], ms: 0}, {show: 'mouse'}, {wait: 900}, {hide: 'mouse'}, {wait: 350}, {move: 'mouse', to: [78, 67], ms: 0}, {show: 'mouse'}, {wait: 900}, {hide: 'mouse'}, {wait: 350}, {move: 'mouse', to: [50, 89], ms: 0}, {show: 'mouse'}, {wait: 900}, {hide: 'mouse'}, {wait: 350}, {move: 'mouse', to: [22, 67], ms: 0}, {show: 'mouse'}, {wait: 900}, {hide: 'mouse'}, {wait: 350}, {move: 'mouse', to: [50, 89], ms: 0}, {show: 'mouse'}, {wait: 900}, {hide: 'mouse'}, {wait: 350}, {move: 'mouse', to: [78, 67], ms: 0}, {show: 'mouse'}, {wait: 900}, {hide: 'mouse'}, {wait: 350}]}}}
  ],
  reactions: [
    {on: 'tap', target: 'mouse', 'do': [{hide: 'mouse'}, {add: 'score', key: 'n', by: 1}, {sound: 'pop'}]},
    {on: 'tap', target: null, cooldown: 900, 'do': [{say: 'FB_MISSED'}]}
  ],
  win: {type: 'state', target: 'score', key: 'n', min: 3},
  onWin: [{fx: 'pop', target: 'score'}]
});
