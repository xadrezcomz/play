// FASE 163 — FRITE O OVO · coloque o ovo na frigideira quente e espere sem tirar.
RULES.registerLevel({
  id: 163, chapter: 17,
  instruction: 'LEVEL_163_TITLE',
  hints: ['LEVEL_163_HINT_1', 'LEVEL_163_HINT_2', 'LEVEL_163_HINT_3'],
  objects: [
    {id: 'fire', type: 'campfire', x: 50, y: 100, w: 30, h: 24, z: 1, passive: true, state: {fire: true}},
    {id: 'pan', type: 'pan', x: 56, y: 84, w: 44, h: 18, z: 2, passive: true, state: {hot: true}, hitbox: {x: 48, y: 80, w: 32, h: 16}, behaviors: {container: {slots: [[-0.17, -0.25]]}}},
    {id: 'egg', type: 'egg', x: 24, y: 46, w: 13, h: 16, z: 4, behaviors: {draggable: {}, bake: {in: 'pan', ms: 2600, set: {cooked: true}}}}
  ],
  reactions: [
    {on: 'state', target: 'egg', key: 'baking', value: 0, when: {type: 'not', of: {type: 'state', target: 'egg', key: 'cooked'}}, cooldown: 900, 'do': [{say: 'FB_TOO_SOON'}]}
  ],
  win: {type: 'state', target: 'egg', key: 'cooked'},
  onWin: [{fx: 'hop', target: 'egg'}]
});
