// FASE 286 — COLOQUE ESTA FRASE NA CAIXA · a frase inteira vai junto.
RULES.registerLevel({
  id: 286, chapter: 29,
  instruction: 'LEVEL_286_TITLE',
  hints: ['LEVEL_286_HINT_1', 'LEVEL_286_HINT_2', 'LEVEL_286_HINT_3'],
  objects: [
    {id: 'p', inText: true, behaviors: {draggable: {}}},
    {id: 'box', type: 'box', x: 50, y: 90, w: 46, h: 36, z: 2, behaviors: {container: {}}},
    {id: 'ball', type: 'ball', x: 24, y: 56, w: 12, z: 3, props: {color: 'coral'}, behaviors: {draggable: {}}}
  ],
  reactions: [
    {on: 'contained', target: 'ball', cooldown: 600, 'do': [{fail: 'FB_THATS_A_BALL'}]}
  ],
  win: {type: 'inside', objects: ['p'], container: 'box'},
  onWin: [{fx: 'squash', target: 'box'}]
});
