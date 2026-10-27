// FASE 211 — ABRA A PORTA · a chave está embaixo do tapete.
RULES.registerLevel({
  id: 211, chapter: 22,
  instruction: 'LEVEL_211_TITLE',
  hints: ['LEVEL_211_HINT_1', 'LEVEL_211_HINT_2', 'LEVEL_211_HINT_3'],
  objects: [
    {id: 'floor', type: 'platform', x: 50, y: 110, w: 100, h: 12, z: 0, passive: true},
    {id: 'doorway', type: 'doorway', x: 74, y: 82, w: 22, h: 42, z: 1, passive: true},
    {id: 'door', type: 'door', x: 74, y: 82, w: 20, h: 40, z: 2, passive: true},
    {id: 'key', type: 'key', x: 30, y: 101, w: 12, h: 6, z: 3, behaviors: {draggable: {}}},
    {id: 'mat', type: 'bar', x: 30, y: 101, w: 26, h: 5, z: 4, props: {color: 'coral'}, behaviors: {draggable: {}}},
    {id: 'lock', type: 'marker', x: 80, y: 82, w: 10, h: 12, z: 0, passive: true, behaviors: {receives: {from: ['key'], consume: true, set: {open: true}}}}
  ],
  reactions: [
    {on: 'tap', target: 'mat', cooldown: 700, 'do': [{fx: 'wiggle'}, {say: 'FB_WELCOME'}]}
  ],
  win: {type: 'state', target: 'lock', key: 'open'},
  onWin: [{move: 'door', by: [-14, 0], ms: 400}, {sound: 'click'}]
});
