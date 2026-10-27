// FASE 185 — FAÇA A SOMBRA DO RULI TOCAR A ESTRELA · a sombra vai para o lado contrário da lâmpada.
RULES.registerLevel({
  id: 185, chapter: 19,
  instruction: 'LEVEL_185_TITLE',
  hints: ['LEVEL_185_HINT_1', 'LEVEL_185_HINT_2', 'LEVEL_185_HINT_3'],
  objects: [
    {id: 'ground', type: 'platform', x: 50, y: 108, w: 100, h: 12, z: 1, passive: true},
    {id: 'star', type: 'star', x: 14, y: 94, w: 10, z: 2, passive: true},
    {id: 'shadow', type: 'ruli', x: 70, y: 94, w: 14, h: 16, z: 2, passive: true, cls: 'silhouette', behaviors: {shadowOf: {source: 'ruli', light: 'lamp', k: 0.9, y: 94}}},
    {id: 'ruli', type: 'ruli', x: 50, y: 92, w: 14, h: 16, z: 4, passive: true},
    {id: 'lamp', type: 'bulb', x: 30, y: 44, w: 12, h: 17, z: 5, state: {on: true}, behaviors: {draggable: {}}}
  ],
  reactions: [
    {on: 'tap', target: 'lamp', cooldown: 700, 'do': [{fx: 'wobble'}, {say: 'FB_MOVE_LIGHT'}]}
  ],
  win: {type: 'touching', a: 'shadow', b: 'star'},
  onWin: [{fx: 'pop', target: 'star'}]
});
