// FASE 161 — PEGUE A ESTRELA · ela foge de cada toque; parada por um tempo, ela cochila.
RULES.registerLevel({
  id: 161, chapter: 17,
  instruction: 'LEVEL_161_TITLE',
  hints: ['LEVEL_161_HINT_1', 'LEVEL_161_HINT_2', 'LEVEL_161_HINT_3'],
  objects: [
    {id: 'sky', type: 'sky', x: 50, y: 66, w: 92, h: 84, z: 1, passive: true, props: {night: true}},
    {id: 'star', type: 'star', x: 30, y: 50, w: 13, z: 3, behaviors: {patrol: {points: [[30, 50], [70, 44], [74, 84], [26, 90]], ms: 900}}}
  ],
  reactions: [
    {on: 'tap', target: 'star', unless: {type: 'state', target: 'star', key: 'stopped'}, 'do': [{forget: 'star'}, {jump: 'star', area: [16, 34, 84, 100]}, {say: 'FB_TOO_FAST'}]}
  ],
  triggers: [
    {when: {type: 'idle', seconds: 3}, 'do': [{state: 'star', key: 'stopped', value: true}, {cls: 'star', add: 'sleepy-star'}]}
  ],
  win: [{type: 'tapped', target: 'star'}, {type: 'state', target: 'star', key: 'stopped'}],
  onWin: [{fx: 'pop', target: 'star'}]
});
