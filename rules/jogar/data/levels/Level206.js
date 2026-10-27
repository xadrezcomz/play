// FASE 206 — FERVA A ÁGUA · gire o botão do fogão para acender e espere.
RULES.registerLevel({
  id: 206, chapter: 21,
  instruction: 'LEVEL_206_TITLE',
  hints: ['LEVEL_206_HINT_1', 'LEVEL_206_HINT_2', 'LEVEL_206_HINT_3'],
  objects: [
    {id: 'stove', type: 'stove', x: 50, y: 98, w: 50, h: 20, z: 1, passive: true, hitbox: {x: 50, y: 86, w: 50, h: 36}},
    {id: 'pot', type: 'pot', x: 50, y: 80, w: 34, h: 24, z: 2, behaviors: {bake: {in: 'stove', ms: 3000, requires: {fire: true}, set: {boiling: true}}}},
    {id: 'knob', type: 'knob', x: 84, y: 56, w: 14, z: 3, behaviors: {rotatable: {snap: 90}}}
  ],
  reactions: [
    {on: 'tap', target: 'pot', cooldown: 700, 'do': [{fx: 'wobble'}, {say: 'FB_COLD_WATER'}]},
    {on: 'rotated', target: 'knob', 'do': [{state: 'stove', key: 'fire', value: false}]},
    {on: 'rotated', target: 'knob', when: {type: 'state', target: 'knob', key: 'angle', min: 90}, 'do': [{state: 'stove', key: 'fire', value: true}]}
  ],
  win: {type: 'state', target: 'pot', key: 'boiling'},
  onWin: [{fx: 'wiggle', target: 'pot'}]
});
