// FASE 298 — MUDE O NÚMERO DA FASE PARA 300 · toque nos números lá em cima para trocar.
RULES.registerLevel({
  id: 298, chapter: 30,
  instruction: 'LEVEL_298_TITLE',
  label: 'LEVEL_298_LABEL',
  hints: ['LEVEL_298_HINT_1', 'LEVEL_298_HINT_2', 'LEVEL_298_HINT_3'],
  objects: [
    {id: 'a', inLabel: true, behaviors: {textCycle: {}}},
    {id: 'b', inLabel: true, behaviors: {textCycle: {}}},
    {id: 'c', inLabel: true, behaviors: {textCycle: {}}},
    {id: 'goal', type: 'number', x: 50, y: 66, w: 30, z: 2, passive: true, props: {text: '300', color: 'yellow'}}
  ],
  reactions: [
    {on: 'tap', target: 'goal', cooldown: 700, 'do': [{fx: 'wobble'}, {say: 'FB_LOOK_UP'}]}
  ],
  win: [{type: 'wordText', target: 'a', equals: '3'}, {type: 'wordText', target: 'b', equals: '0'}, {type: 'wordText', target: 'c', equals: '0'}],
  onWin: [{fx: 'pop', target: 'goal'}]
});
