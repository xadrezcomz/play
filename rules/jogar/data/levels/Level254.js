// FASE 254 — PASSE PELA PORTA · ela fecha quando você solta: segure com um dedo e passe com o outro, ou calce com a caixa.
RULES.registerLevel({
  id: 254, chapter: 26,
  instruction: 'LEVEL_254_TITLE',
  hints: ['LEVEL_254_HINT_1', 'LEVEL_254_HINT_2', 'LEVEL_254_HINT_3'],
  objects: [
    {id: 'floor', type: 'platform', x: 50, y: 110, w: 100, h: 12, z: 0, passive: true},
    {id: 'top', type: 'bar', x: 56, y: 42, w: 10, h: 24, z: 1, passive: true, props: {color: '#8C7B9E'}},
    {id: 'door', type: 'bar', x: 56, y: 80, w: 7, h: 52, z: 3, props: {color: 'purple'}, behaviors: {draggable: {axis: 'y', minY: 46, maxY: 80, returnOnDrop: true}}},
    {id: 'wedge', type: 'cube', x: 86, y: 96, w: 10, z: 4, props: {color: 'wood'}, behaviors: {draggable: {}}},
    {id: 'flag', type: 'flag', x: 84, y: 98, w: 7, h: 10, z: 1, passive: true},
    {id: 'ruli', type: 'ruli', x: 22, y: 98, w: 11, h: 12.3, z: 5, behaviors: {draggable: {axis: 'x', minX: 6, maxX: 94}, character: {}, pushes: {ids: [], solids: ['door']}}}
  ],
  reactions: [
    {on: 'drop', target: 'wedge', when: {type: 'pos', target: 'wedge', minX: 44, maxX: 68, minY: 84}, 'do': [{move: 'wedge', to: [56, 100], ms: 150}]},
    {on: 'drop', target: 'door', when: {type: 'pos', target: 'wedge', minX: 50, maxX: 62, minY: 94}, 'do': [{wait: 320}, {move: 'door', to: [56, 62], ms: 200}, {sound: 'drop'}]},
    {on: 'bump', target: 'door', cooldown: 1500, 'do': [{say: 'FB_DOOR_CLOSED'}]}
  ],
  win: {type: 'pos', target: 'ruli', minX: 70},
  onWin: [{expr: 'happy', target: 'ruli'}]
});
