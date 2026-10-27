// FASE 266 — BAGUNCE O QUARTO · tire tudo dos lugares certinhos.
RULES.registerLevel({
  id: 266, chapter: 27,
  instruction: 'LEVEL_266_TITLE',
  hints: ['LEVEL_266_HINT_1', 'LEVEL_266_HINT_2', 'LEVEL_266_HINT_3'],
  objects: [
    {id: 'shelf', type: 'shelf', x: 50, y: 66, w: 80, h: 8, z: 1, passive: true},
    {id: 's1', type: 'slot', x: 26, y: 56, w: 16, z: 1, passive: true},
    {id: 's2', type: 'slot', x: 50, y: 56, w: 16, z: 1, passive: true},
    {id: 's3', type: 'slot', x: 74, y: 56, w: 16, z: 1, passive: true},
    {id: 't1', type: 'ball', x: 26, y: 56, w: 12, z: 3, props: {color: 'blue'}, behaviors: {draggable: {}}},
    {id: 't2', type: 'cube', x: 50, y: 56, w: 12, z: 3, props: {color: 'green'}, behaviors: {draggable: {}}},
    {id: 't3', type: 'star', x: 74, y: 56, w: 12, z: 3, props: {color: 'yellow'}, behaviors: {draggable: {}}}
  ],
  reactions: [
    {on: 'tap', target: 't1', cooldown: 600, 'do': [{fx: 'wobble'}, {say: 'FB_TOO_TIDY'}]},
    {on: 'tap', target: 't2', cooldown: 600, 'do': [{fx: 'wobble'}, {say: 'FB_TOO_TIDY'}]},
    {on: 'tap', target: 't3', cooldown: 600, 'do': [{fx: 'wobble'}, {say: 'FB_TOO_TIDY'}]}
  ],
  win: [{type: 'not', of: {type: 'touching', a: 't1', b: 's1'}}, {type: 'not', of: {type: 'touching', a: 't2', b: 's2'}}, {type: 'not', of: {type: 'touching', a: 't3', b: 's3'}}],
  onWin: [{mascot: 'happy'}]
});
