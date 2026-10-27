// FASE 157 — ESFRIE A PANELA · abane com o dedo, de um lado para o outro.
RULES.registerLevel({
  id: 157, chapter: 16,
  instruction: 'LEVEL_157_TITLE',
  hints: ['LEVEL_157_HINT_1', 'LEVEL_157_HINT_2', 'LEVEL_157_HINT_3'],
  objects: [
    {id: 'pan', type: 'pan', x: 46, y: 70, w: 50, h: 21, z: 2, state: {hot: true}, behaviors: {rubbable: {count: 14, set: {hot: false}}}}
  ],
  reactions: [
    {on: 'tap', target: 'pan', cooldown: 700, 'do': [{fx: 'shake'}, {fail: 'FB_HOT'}]}
  ],
  win: {type: 'state', target: 'pan', key: 'hot', equals: false},
  onWin: [{fx: 'pop', target: 'pan'}]
});
