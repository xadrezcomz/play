// FASE 225 — ENCONTRE O CAMALEÃO · ele é verde como as folhas e anda devagar.
RULES.registerLevel({
  id: 225, chapter: 23,
  instruction: 'LEVEL_225_TITLE',
  hints: ['LEVEL_225_HINT_1', 'LEVEL_225_HINT_2', 'LEVEL_225_HINT_3'],
  objects: [
    {id: 'f0', type: 'leaf', x: 16, y: 44, w: 20, h: 14, z: 1, passive: true, props: {color: 'green'}, rot: -30},
    {id: 'f1', type: 'leaf', x: 39, y: 44, w: 20, h: 14, z: 1, passive: true, props: {color: 'green'}, rot: 7},
    {id: 'f2', type: 'leaf', x: 62, y: 44, w: 20, h: 14, z: 1, passive: true, props: {color: 'green'}, rot: -16},
    {id: 'f3', type: 'leaf', x: 85, y: 44, w: 20, h: 14, z: 1, passive: true, props: {color: 'green'}, rot: 21},
    {id: 'f4', type: 'leaf', x: 16, y: 66, w: 20, h: 14, z: 1, passive: true, props: {color: 'green'}, rot: -2},
    {id: 'f5', type: 'leaf', x: 39, y: 66, w: 20, h: 14, z: 1, passive: true, props: {color: 'green'}, rot: -25},
    {id: 'f6', type: 'leaf', x: 62, y: 66, w: 20, h: 14, z: 1, passive: true, props: {color: 'green'}, rot: 12},
    {id: 'f7', type: 'leaf', x: 85, y: 66, w: 20, h: 14, z: 1, passive: true, props: {color: 'green'}, rot: -11},
    {id: 'f8', type: 'leaf', x: 16, y: 88, w: 20, h: 14, z: 1, passive: true, props: {color: 'green'}, rot: 26},
    {id: 'f9', type: 'leaf', x: 39, y: 88, w: 20, h: 14, z: 1, passive: true, props: {color: 'green'}, rot: 3},
    {id: 'f10', type: 'leaf', x: 62, y: 88, w: 20, h: 14, z: 1, passive: true, props: {color: 'green'}, rot: -20},
    {id: 'f11', type: 'leaf', x: 85, y: 88, w: 20, h: 14, z: 1, passive: true, props: {color: 'green'}, rot: 17},
    {id: 'cham', type: 'ruli', x: 40, y: 66, w: 9, h: 10, z: 2, props: {color: 'green'}, behaviors: {patrol: {points: [[40, 66], [62, 70], [58, 86], [36, 84]], ms: 2600}}}
  ],
  reactions: [
    {on: 'tap', target: null, cooldown: 900, 'do': [{say: 'FB_JUST_LEAVES'}]}
  ],
  win: {type: 'tapped', target: 'cham'},
  onWin: [{expr: 'surprised', target: 'cham'}, {fx: 'hop', target: 'cham'}]
});
