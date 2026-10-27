// FASE 291 — ABRA A PORTA · atrás da porta tem outra porta, e outra...
RULES.registerLevel({
  id: 291, chapter: 30,
  instruction: 'LEVEL_291_TITLE',
  hints: ['LEVEL_291_HINT_1', 'LEVEL_291_HINT_2', 'LEVEL_291_HINT_3'],
  objects: [
    {id: 'floor', type: 'platform', x: 50, y: 110, w: 100, h: 12, z: 0, passive: true},
    {id: 'doorway', type: 'doorway', x: 50, y: 76, w: 30, h: 56, z: 1, passive: true},
    {id: 'door1', type: 'door', x: 50, y: 76, w: 28, h: 54, z: 10, props: {color: 'purple'}, behaviors: {draggable: {axis: 'x'}, door: {openDistance: 18}}},
    {id: 'door2', type: 'door', x: 50, y: 76, w: 28, h: 54, z: 9, props: {color: 'coral'}, behaviors: {draggable: {axis: 'x'}, door: {openDistance: 18}}},
    {id: 'door3', type: 'door', x: 50, y: 76, w: 28, h: 54, z: 8, props: {color: 'teal'}, behaviors: {draggable: {axis: 'x'}, door: {openDistance: 18}}}
  ],
  reactions: [
    {on: 'tap', target: 'door1', cooldown: 600, 'do': [{fx: 'shake'}, {say: 'FB_KNOCK_KNOCK'}]},
    {on: 'tap', target: 'door2', cooldown: 600, 'do': [{fx: 'shake'}, {say: 'FB_KNOCK_KNOCK'}]},
    {on: 'tap', target: 'door3', cooldown: 600, 'do': [{fx: 'shake'}, {say: 'FB_KNOCK_KNOCK'}]},
    {on: 'state', target: 'door1', key: 'open', value: true, cooldown: 2000, 'do': [{say: 'FB_ANOTHER_DOOR'}]}
  ],
  win: {type: 'state', target: 'door3', key: 'open'},
  onWin: [{fx: 'pop', target: 'doorway'}]
});
