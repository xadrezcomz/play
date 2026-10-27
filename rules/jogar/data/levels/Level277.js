// FASE 277 — DIVIDA OS DOCES · seis doces para três amigos: dois para cada um.
RULES.registerLevel({
  id: 277, chapter: 28,
  instruction: 'LEVEL_277_TITLE',
  hints: ['LEVEL_277_HINT_1', 'LEVEL_277_HINT_2', 'LEVEL_277_HINT_3'],
  objects: [
    {id: 'a1', type: 'ruli', x: 22, y: 52, w: 13, h: 14.56, z: 4, props: {color: 'pink'}},
    {id: 'a2', type: 'ruli', x: 50, y: 52, w: 13, h: 14.56, z: 4, props: {color: 'yellow'}},
    {id: 'a3', type: 'ruli', x: 78, y: 52, w: 13, h: 14.56, z: 4, props: {color: 'purple'}},
    {id: 'p1', type: 'bar', x: 22, y: 76, w: 20, h: 3, z: 1, passive: true, props: {color: '#E5E1D8'}},
    {id: 'p2', type: 'bar', x: 50, y: 76, w: 20, h: 3, z: 1, passive: true, props: {color: '#E5E1D8'}},
    {id: 'p3', type: 'bar', x: 78, y: 76, w: 20, h: 3, z: 1, passive: true, props: {color: '#E5E1D8'}},
    {id: 'p1z', type: 'marker', x: 22, y: 72, w: 22, h: 12, z: 0, passive: true, behaviors: {container: {slots: [[-0.22, 0], [0.22, 0], [0, -0.3]]}}},
    {id: 'p2z', type: 'marker', x: 50, y: 72, w: 22, h: 12, z: 0, passive: true, behaviors: {container: {slots: [[-0.22, 0], [0.22, 0], [0, -0.3]]}}},
    {id: 'p3z', type: 'marker', x: 78, y: 72, w: 22, h: 12, z: 0, passive: true, behaviors: {container: {slots: [[-0.22, 0], [0.22, 0], [0, -0.3]]}}},
    {id: 'k0', type: 'candy', x: 20, y: 104, w: 9, h: 4.5, z: 5, props: {color: 'pink'}, behaviors: {draggable: {}}},
    {id: 'k1', type: 'candy', x: 32, y: 104, w: 9, h: 4.5, z: 5, props: {color: 'yellow'}, behaviors: {draggable: {}}},
    {id: 'k2', type: 'candy', x: 44, y: 104, w: 9, h: 4.5, z: 5, props: {color: 'blue'}, behaviors: {draggable: {}}},
    {id: 'k3', type: 'candy', x: 56, y: 104, w: 9, h: 4.5, z: 5, props: {color: 'pink'}, behaviors: {draggable: {}}},
    {id: 'k4', type: 'candy', x: 68, y: 104, w: 9, h: 4.5, z: 5, props: {color: 'yellow'}, behaviors: {draggable: {}}},
    {id: 'k5', type: 'candy', x: 80, y: 104, w: 9, h: 4.5, z: 5, props: {color: 'blue'}, behaviors: {draggable: {}}}
  ],
  triggers: [
    {when: {type: 'any', of: [{type: 'count', objects: ['k0', 'k1', 'k2', 'k3', 'k4', 'k5'], container: 'p1z', min: 3}, {type: 'count', objects: ['k0', 'k1', 'k2', 'k3', 'k4', 'k5'], container: 'p2z', min: 3}, {type: 'count', objects: ['k0', 'k1', 'k2', 'k3', 'k4', 'k5'], container: 'p3z', min: 3}]}, once: false, 'do': [{say: 'FB_NOT_FAIR'}]}
  ],
  win: [{type: 'count', objects: ['k0', 'k1', 'k2', 'k3', 'k4', 'k5'], container: 'p1z', min: 2, max: 2}, {type: 'count', objects: ['k0', 'k1', 'k2', 'k3', 'k4', 'k5'], container: 'p2z', min: 2, max: 2}, {type: 'count', objects: ['k0', 'k1', 'k2', 'k3', 'k4', 'k5'], container: 'p3z', min: 2, max: 2}],
  onWin: [{expr: 'happy', target: 'a1'}, {expr: 'happy', target: 'a2'}, {expr: 'happy', target: 'a3'}]
});
