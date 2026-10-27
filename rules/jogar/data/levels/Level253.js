// FASE 253 — ESTIQUE A COBRA ATÉ A MAÇÃ · use a pinça (ou a rodinha) na cobra.
RULES.registerLevel({
  id: 253, chapter: 26,
  instruction: 'LEVEL_253_TITLE',
  hints: ['LEVEL_253_HINT_1', 'LEVEL_253_HINT_2', 'LEVEL_253_HINT_3'],
  objects: [
    {id: 'apple', type: 'apple', x: 84, y: 72, w: 11, z: 2, passive: true},
    {id: 'body', type: 'snake', x: 22, y: 72, w: 24, h: 7, z: 3, behaviors: {scalable: {axis: 'x', anchor: 'left', min: 1, max: 3.2}}},
    {id: 'head', type: 'circle', x: 34, y: 72, w: 10, z: 4, passive: true, props: {color: 'green'}, behaviors: {stickTo: {target: 'body', side: 'right', dx: 2}}},
    {id: 'eye', type: 'circle', x: 36, y: 70, w: 2.6, z: 5, passive: true, props: {color: 'ink'}, behaviors: {stickTo: {target: 'body', side: 'right', dx: 4, dy: -2}}}
  ],
  reactions: [
    {on: 'tap', target: 'body', cooldown: 700, 'do': [{fx: 'wiggle'}, {say: 'FB_HUNGRY_SNAKE'}]}
  ],
  win: {type: 'touching', a: 'head', b: 'apple'},
  onWin: [{hide: 'apple'}, {fx: 'pop', target: 'head'}]
});
