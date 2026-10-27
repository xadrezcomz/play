// FASE 251 — APERTE OS DOIS BOTÕES JUNTOS · com dois dedos, ou deixe a pedra segurando um deles.
RULES.registerLevel({
  id: 251, chapter: 26,
  instruction: 'LEVEL_251_TITLE',
  hints: ['LEVEL_251_HINT_1', 'LEVEL_251_HINT_2', 'LEVEL_251_HINT_3'],
  objects: [
    {id: 'bA', type: 'button', x: 24, y: 80, w: 20, z: 2, props: {color: 'coral'}, behaviors: {receives: {from: ['rock'], set: {pressed: true, held: true}}}},
    {id: 'bB', type: 'button', x: 76, y: 80, w: 20, z: 2, props: {color: 'blue'}, behaviors: {receives: {from: ['rock'], set: {pressed: true, held: true}}}},
    {id: 'bulb', type: 'bulb', x: 50, y: 38, w: 16, h: 22, z: 1, passive: true},
    {id: 'rock', type: 'rock', x: 50, y: 104, w: 14, h: 10, z: 4, behaviors: {draggable: {}}}
  ],
  reactions: [
    {on: 'tap', target: 'bA', 'do': [{state: 'bA', key: 'pressed', value: true}, {sound: 'click'}, {wait: 400}, {state: 'bA', key: 'pressed', value: false}]},
    {on: 'tap', target: 'bB', 'do': [{state: 'bB', key: 'pressed', value: true}, {sound: 'click'}, {wait: 400}, {state: 'bB', key: 'pressed', value: false}]},
    {on: 'state', target: 'bA', key: 'pressed', value: false, when: {type: 'state', target: 'bA', key: 'held'}, 'do': [{state: 'bA', key: 'pressed', value: true}]},
    {on: 'state', target: 'bB', key: 'pressed', value: false, when: {type: 'state', target: 'bB', key: 'held'}, 'do': [{state: 'bB', key: 'pressed', value: true}]},
    {on: 'state', key: 'pressed', value: true, target: '+', when: [{type: 'state', target: 'bA', key: 'pressed'}, {type: 'state', target: 'bB', key: 'pressed'}], 'do': [{state: 'bulb', key: 'on', value: true}]}
  ],
  win: {type: 'state', target: 'bulb', key: 'on'},
  onWin: [{fx: 'pop', target: 'bulb'}]
});
