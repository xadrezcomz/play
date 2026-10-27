// FASE 256 — ABRA O PORTÃO · ele abre com peso nos dois botões ao mesmo tempo: o Ruli num, o amigo no outro.
RULES.registerLevel({
  id: 256, chapter: 26,
  instruction: 'LEVEL_256_TITLE',
  hints: ['LEVEL_256_HINT_1', 'LEVEL_256_HINT_2', 'LEVEL_256_HINT_3'],
  objects: [
    {id: 'floor', type: 'platform', x: 50, y: 110, w: 100, h: 12, z: 0, passive: true},
    {id: 'gate', type: 'bar', x: 50, y: 60, w: 4, h: 40, z: 2, passive: true, props: {color: '#7D8597'}},
    {id: 'p1', type: 'bar', x: 20, y: 102, w: 18, h: 3, z: 1, passive: true, props: {color: 'coral'}},
    {id: 'p2', type: 'bar', x: 80, y: 102, w: 18, h: 3, z: 1, passive: true, props: {color: 'coral'}},
    {id: 'zone1', type: 'marker', x: 20, y: 94, w: 20, h: 16, z: 0, passive: true},
    {id: 'zone2', type: 'marker', x: 80, y: 94, w: 20, h: 16, z: 0, passive: true},
    {id: 'star', type: 'star', x: 50, y: 30, w: 12, z: 1, passive: true},
    {id: 'ruli', type: 'ruli', x: 36, y: 60, w: 12, h: 13.5, z: 5, behaviors: {draggable: {}, character: {}}},
    {id: 'friend', type: 'ruli', x: 64, y: 60, w: 12, h: 13.5, z: 5, props: {color: 'pink'}, behaviors: {draggable: {}, character: {}}}
  ],
  triggers: [
    {when: {type: 'any', of: [{type: 'inside', objects: ['ruli', 'friend'], container: 'zone1'}, {type: 'inside', objects: ['ruli', 'friend'], container: 'zone2'}]}, once: false, 'do': [{say: 'FB_ONE_EACH'}]}
  ],
  win: {type: 'any', of: [[{type: 'inside', objects: ['ruli'], container: 'zone1'}, {type: 'inside', objects: ['friend'], container: 'zone2'}], [{type: 'inside', objects: ['ruli'], container: 'zone2'}, {type: 'inside', objects: ['friend'], container: 'zone1'}]]},
  onWin: [{move: 'gate', by: [0, -60], ms: 500}, {expr: 'happy', target: 'ruli'}, {expr: 'happy', target: 'friend'}]
});
