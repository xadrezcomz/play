// FASE 226 — TOQUE NA LUA · de dia a lua também aparece, bem clarinha.
RULES.registerLevel({
  id: 226, chapter: 23,
  instruction: 'LEVEL_226_TITLE',
  hints: ['LEVEL_226_HINT_1', 'LEVEL_226_HINT_2', 'LEVEL_226_HINT_3'],
  objects: [
    {id: 'sky', type: 'sky', x: 50, y: 62, w: 96, h: 84, z: 0},
    {id: 'sun', type: 'sun', x: 26, y: 40, w: 20, z: 1},
    {id: 'cloud', type: 'cloud', x: 66, y: 74, w: 30, h: 18, z: 2, behaviors: {draggable: {}}},
    {id: 'moon', type: 'moon', x: 74, y: 38, w: 12, z: 1, cls: 'faint'}
  ],
  reactions: [
    {on: 'tap', target: 'sun', cooldown: 700, 'do': [{fx: 'shake'}, {fail: 'FB_THATS_SUN'}]},
    {on: 'tap', target: 'sky', cooldown: 900, 'do': [{say: 'FB_LOOK_CLOSER'}]}
  ],
  win: {type: 'tapped', target: 'moon'},
  onWin: [{cls: 'moon', remove: 'faint'}, {fx: 'pop', target: 'moon'}]
});
