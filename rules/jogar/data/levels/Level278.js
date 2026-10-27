// FASE 278 — TIRE UMA FOTO COM TODOS · todos dentro do quadro (o grandão precisa diminuir) e depois aperte a câmera.
RULES.registerLevel({
  id: 278, chapter: 28,
  instruction: 'LEVEL_278_TITLE',
  hints: ['LEVEL_278_HINT_1', 'LEVEL_278_HINT_2', 'LEVEL_278_HINT_3'],
  objects: [
    {id: 'frame', type: 'outline', x: 50, y: 70, w: 52, h: 30, z: 0, passive: true, props: {color: 'blue'}},
    {id: 'cam', type: 'camera', x: 50, y: 104, w: 18, h: 12.6, z: 5},
    {id: 'q1', type: 'ruli', x: 16, y: 92, w: 11, h: 12.32, z: 4, props: {color: 'pink'}, behaviors: {draggable: {}, character: {}}},
    {id: 'q2', type: 'ruli', x: 84, y: 96, w: 11, h: 12.32, z: 4, props: {color: 'yellow'}, behaviors: {draggable: {}, character: {}}},
    {id: 'q3', type: 'ruli', x: 30, y: 40, w: 11, h: 12.32, z: 4, props: {color: 'purple'}, behaviors: {draggable: {}, character: {}}},
    {id: 'big', type: 'ruli', x: 74, y: 52, w: 26, h: 29.12, z: 4, props: {color: 'coral'}, behaviors: {draggable: {}, character: {}, scalable: {min: 0.4, max: 1}}}
  ],
  reactions: [
    {on: 'tap', target: 'cam', unless: {type: 'count', objects: ['q1', 'q2', 'q3', 'big'], container: 'frame', min: 4}, 'do': [{forget: 'cam'}, {fail: 'FB_SOMEONE_OUT'}]},
    {on: 'drop', target: 'big', when: {type: 'scale', target: 'big', min: 0.7}, cooldown: 800, 'do': [{say: 'FB_TOO_BIG_FOR_PHOTO'}]}
  ],
  win: [{type: 'count', objects: ['q1', 'q2', 'q3', 'big'], container: 'frame', min: 4}, {type: 'scale', target: 'big', max: 0.69}, {type: 'tapped', target: 'cam'}],
  onWin: [{expr: 'happy', target: 'q1'}, {expr: 'happy', target: 'q2'}, {expr: 'happy', target: 'q3'}, {expr: 'happy', target: 'big'}, {fx: 'pop', target: 'frame'}]
});
