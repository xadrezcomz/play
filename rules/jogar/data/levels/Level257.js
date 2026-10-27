// FASE 257 — SEPARE OS DOIS AMIGOS · eles estão grudados num abraço: estique para separar.
RULES.registerLevel({
  id: 257, chapter: 26,
  instruction: 'LEVEL_257_TITLE',
  hints: ['LEVEL_257_HINT_1', 'LEVEL_257_HINT_2', 'LEVEL_257_HINT_3'],
  objects: [
    {id: 'hug', type: 'ruli', x: 50, y: 72, w: 20, h: 22, z: 3, state: {expr: 'happy'}, props: {color: 'purple'}, behaviors: {scalable: {min: 1, max: 2}, splitOnStretch: {spawn: 'friend', at: 1.45}}},
    {id: 'friend', type: 'ruli', x: 50, y: 72, w: 20, h: 22, z: 2, hidden: true, props: {color: 'yellow'}, state: {expr: 'happy'}}
  ],
  reactions: [
    {on: 'tap', target: 'hug', cooldown: 700, 'do': [{fx: 'hop'}, {say: 'FB_STUCK_TOGETHER'}]}
  ],
  win: {type: 'pos', target: 'friend', minX: 60},
  onWin: [{fx: 'hop', target: 'friend'}]
});
