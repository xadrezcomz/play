// FASE 292 — LEVE A BOLA ATÉ A CAIXA · a bola é pesada demais: leve a caixa até a bola.
RULES.registerLevel({
  id: 292, chapter: 30,
  instruction: 'LEVEL_292_TITLE',
  hints: ['LEVEL_292_HINT_1', 'LEVEL_292_HINT_2', 'LEVEL_292_HINT_3'],
  objects: [
    {id: 'floor', type: 'platform', x: 50, y: 110, w: 100, h: 12, z: 0, passive: true},
    {id: 'ball', type: 'ball', x: 24, y: 98, w: 14, z: 3, props: {color: 'ink', weight: 9}, behaviors: {draggable: {requires: {light: true}}}},
    {id: 'box', type: 'box', x: 76, y: 90, w: 30, h: 24, z: 4, behaviors: {draggable: {}}}
  ],
  reactions: [
    {on: 'locked', target: 'ball', cooldown: 900, 'do': [{say: 'FB_HEAVY'}]}
  ],
  win: {type: 'inside', objects: ['ball'], container: 'box'},
  onWin: [{fx: 'squash', target: 'box'}]
});
