// FASE 152 — AJUDE O PINTINHO A SAIR · três toques rápidos no ovo.
RULES.registerLevel({
  id: 152, chapter: 16,
  instruction: 'LEVEL_152_TITLE',
  hints: ['LEVEL_152_HINT_1', 'LEVEL_152_HINT_2', 'LEVEL_152_HINT_3'],
  objects: [
    {id: 'egg', type: 'egg', x: 50, y: 66, w: 26, h: 32, z: 3, behaviors: {multitap: {n: 3, ms: 450}}}
  ],
  reactions: [
    {on: 'tap', target: 'egg', unless: {type: 'state', target: 'egg', key: 'hatched'}, 'do': [{fx: 'wobble'}, {add: 'egg', key: 'crack', by: 0.3, max: 0.9}, {sound: 'tap'}]},
    {on: 'multitap', target: 'egg', 'do': [{state: 'egg', key: 'hatched', value: true}, {fx: 'pop', target: 'egg'}]}
  ],
  triggers: [
    {when: {type: 'state', target: 'egg', key: 'crack', min: 0.9}, 'do': [{wait: 500}, {say: 'FB_FASTER'}]}
  ],
  win: {type: 'state', target: 'egg', key: 'hatched'},
  onWin: [{fx: 'hop', target: 'egg'}]
});
