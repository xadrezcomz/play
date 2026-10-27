// FASE 252 — ABRA A CAIXA · afaste os dedos em cima dela (ou use a rodinha do mouse).
RULES.registerLevel({
  id: 252, chapter: 26,
  instruction: 'LEVEL_252_TITLE',
  hints: ['LEVEL_252_HINT_1', 'LEVEL_252_HINT_2', 'LEVEL_252_HINT_3'],
  objects: [
    {id: 'box', type: 'chest', x: 50, y: 70, w: 30, h: 27, z: 2, behaviors: {scalable: {min: 0.9, max: 1.6}}},
    {id: 'star', type: 'star', x: 50, y: 58, w: 12, z: 3, hidden: true, passive: true}
  ],
  reactions: [
    {on: 'tap', target: 'box', cooldown: 700, 'do': [{fx: 'shake'}, {say: 'FB_STUCK_LID'}]},
    {on: 'scaleend', target: 'box', when: {type: 'scale', target: 'box', min: 1.35}, 'do': [{state: 'box', key: 'open', value: true}, {grow: 'box', to: 1, ms: 250}, {show: 'star'}, {move: 'star', by: [0, -14], ms: 300}]}
  ],
  win: {type: 'state', target: 'box', key: 'open'},
  onWin: [{fx: 'pop', target: 'star'}]
});
