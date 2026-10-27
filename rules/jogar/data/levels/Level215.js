// FASE 215 — ABRA A PORTA · são dois cadeados: uma chave está no presente, outra embaixo da almofada.
RULES.registerLevel({
  id: 215, chapter: 22,
  instruction: 'LEVEL_215_TITLE',
  hints: ['LEVEL_215_HINT_1', 'LEVEL_215_HINT_2', 'LEVEL_215_HINT_3'],
  objects: [
    {id: 'floor', type: 'platform', x: 50, y: 110, w: 100, h: 12, z: 0, passive: true},
    {id: 'doorway', type: 'doorway', x: 76, y: 78, w: 24, h: 48, z: 1, passive: true},
    {id: 'door', type: 'door', x: 76, y: 78, w: 22, h: 46, z: 2, passive: true},
    {id: 'l1', type: 'lock', x: 76, y: 70, w: 9, h: 11, z: 3, passive: true, behaviors: {receives: {from: ['ka', 'kb'], consume: true, set: {open: true}}}},
    {id: 'l2', type: 'lock', x: 76, y: 86, w: 9, h: 11, z: 3, passive: true, behaviors: {receives: {from: ['ka', 'kb'], consume: true, set: {open: true}}}},
    {id: 'gift', type: 'gift', x: 24, y: 92, w: 18, z: 3, behaviors: {clickable: {toggle: 'open', fx: 'squash'}}},
    {id: 'ka', type: 'key', x: 24, y: 80, w: 11, h: 5.5, z: 4, hidden: true, behaviors: {draggable: {}}},
    {id: 'kb', type: 'key', x: 46, y: 101, w: 11, h: 5.5, z: 3, props: {color: 'teal'}, behaviors: {draggable: {}}},
    {id: 'pillow', type: 'cushion', x: 46, y: 100, w: 24, h: 10, z: 4, behaviors: {draggable: {}}}
  ],
  reactions: [
    {on: 'state', target: 'gift', key: 'open', value: true, 'do': [{show: 'ka'}, {move: 'ka', to: [24, 72], ms: 300}]}
  ],
  win: [{type: 'state', target: 'l1', key: 'open'}, {type: 'state', target: 'l2', key: 'open'}],
  onWin: [{hide: 'l1'}, {hide: 'l2'}, {move: 'door', by: [-16, 0], ms: 400}]
});
