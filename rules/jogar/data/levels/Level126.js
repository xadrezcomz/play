// FASE 126 — LEVE O RULI ATÉ A PORTA · o Ruli não quer andar; empurre ele com a bola.
RULES.registerLevel({
  id: 126, chapter: 13,
  instruction: 'LEVEL_126_TITLE',
  hints: ['LEVEL_126_HINT_1', 'LEVEL_126_HINT_2', 'LEVEL_126_HINT_3'],
  objects: [
    {id: 'door', type: 'door', x: 86, y: 84, w: 14, h: 28, z: 1, passive: true},
    {id: 'ruli', type: 'ruli', x: 44, y: 90, w: 12, h: 13.5, z: 6, state: {expr: 'serious'}},
    {id: 'ball', type: 'ball', x: 16, y: 90, w: 11, z: 7, behaviors: {draggable: {}, pushes: {ids: ['ruli']}}}
  ],
  reactions: [
    {on: 'tap', target: 'ruli', cooldown: 800, 'do': [{fx: 'shake'}, {say: 'FB_RULI_STAYS'}]}
  ],
  win: {type: 'touching', a: 'ruli', b: 'door'},
  onWin: [{expr: 'happy', target: 'ruli'}, {move: 'ruli', toObj: 'door', ms: 300, await: true}, {fx: 'enter', target: 'ruli'}]
});
