// FASE 243 — DEIXE AS CAIXAS COM O MESMO NÚMERO DE BOLAS · são 5 bolas: uma pode ficar fora (2 e 2).
RULES.registerLevel({
  id: 243, chapter: 25,
  instruction: 'LEVEL_243_TITLE',
  hints: ['LEVEL_243_HINT_1', 'LEVEL_243_HINT_2', 'LEVEL_243_HINT_3'],
  objects: [
    {id: 'A', type: 'box', x: 26, y: 66, w: 30, h: 24, z: 2, behaviors: {container: {}}},
    {id: 'B', type: 'box', x: 74, y: 66, w: 30, h: 24, z: 2, behaviors: {container: {}}},
    {id: 'b0', type: 'ball', x: 18, y: 60, w: 7, z: 4, props: {color: 'coral'}, behaviors: {draggable: {}}},
    {id: 'b1', type: 'ball', x: 26, y: 60, w: 7, z: 4, props: {color: 'coral'}, behaviors: {draggable: {}}},
    {id: 'b2', type: 'ball', x: 34, y: 60, w: 7, z: 4, props: {color: 'coral'}, behaviors: {draggable: {}}},
    {id: 'b3', type: 'ball', x: 18, y: 68, w: 7, z: 4, props: {color: 'coral'}, behaviors: {draggable: {}}},
    {id: 'b4', type: 'ball', x: 26, y: 68, w: 7, z: 4, props: {color: 'coral'}, behaviors: {draggable: {}}}
  ],
  triggers: [
    {when: [{type: 'count', objects: ['b0', 'b1', 'b2', 'b3', 'b4'], container: 'A', min: 3}, {type: 'count', objects: ['b0', 'b1', 'b2', 'b3', 'b4'], container: 'B', min: 2}], once: false, 'do': [{wait: 300}, {say: 'FB_ODD'}]}
  ],
  win: {type: 'any', of: [[{type: 'count', objects: ['b0', 'b1', 'b2', 'b3', 'b4'], container: 'A', min: 1, max: 1}, {type: 'count', objects: ['b0', 'b1', 'b2', 'b3', 'b4'], container: 'B', min: 1, max: 1}], [{type: 'count', objects: ['b0', 'b1', 'b2', 'b3', 'b4'], container: 'A', min: 2, max: 2}, {type: 'count', objects: ['b0', 'b1', 'b2', 'b3', 'b4'], container: 'B', min: 2, max: 2}]]},
  onWin: [{fx: 'squash', target: 'A'}, {fx: 'squash', target: 'B'}]
});
