// FASE 283 — QUANTAS VEZES VOCÊ ENTROU NESTA FASE? · a resposta é o número da tentativa (reiniciar soma um).
RULES.registerLevel({
  id: 283, chapter: 29,
  instruction: 'LEVEL_283_TITLE',
  hints: ['LEVEL_283_HINT_1', 'LEVEL_283_HINT_2', 'LEVEL_283_HINT_3'],
  objects: [
    {id: 'door', type: 'doorway', x: 50, y: 58, w: 22, h: 40, z: 1, passive: true},
    {id: 'ans', type: 'display', x: 38, y: 102, w: 26, h: 13, z: 3, state: {n: 0}, behaviors: {cycle: {key: 'n'}}},
    {id: 'ok', type: 'button', x: 66, y: 102, w: 14, z: 3, props: {color: 'green'}}
  ],
  reactions: [
    {on: 'tap', target: 'ok', unless: {type: 'attemptIs', target: 'ans', key: 'n'}, 'do': [{forget: 'ok'}, {fx: 'shake', target: 'ans'}, {fail: 'FB_COUNT_VISITS'}]}
  ],
  win: [{type: 'attemptIs', target: 'ans', key: 'n'}, {type: 'tapped', target: 'ok'}],
  onWin: [{fx: 'pop', target: 'ans'}]
});
