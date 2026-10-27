// FASE 162 — PARE O PONTEIRO NO 12 · ele gira sem parar; aperte o botão na hora certa.
RULES.registerLevel({
  id: 162, chapter: 17,
  instruction: 'LEVEL_162_TITLE',
  hints: ['LEVEL_162_HINT_1', 'LEVEL_162_HINT_2', 'LEVEL_162_HINT_3'],
  objects: [
    {id: 'clock', type: 'clock', x: 50, y: 58, w: 56, z: 1, passive: true},
    {id: 'hand', type: 'hand', x: 50, y: 58, w: 56, z: 2, passive: true, props: {len: 38, width: 5}, behaviors: {spinner: {speed: 2.4}}},
    {id: 'stop', type: 'button', x: 50, y: 102, w: 20, z: 3, props: {color: 'coral'}}
  ],
  reactions: [
    {on: 'tap', target: 'stop', unless: {type: 'state', target: 'hand', key: 'stopped'}, 'do': [{state: 'hand', key: 'stopped', value: true}, {sound: 'click'}]},
    {on: 'state', target: 'hand', key: 'angle', unless: {type: 'any', of: [{type: 'state', target: 'hand', key: 'angle', min: 345}, {type: 'state', target: 'hand', key: 'angle', max: 15}]}, 'do': [{fail: 'FB_MISSED'}, {wait: 700}, {state: 'hand', key: 'angle', value: -1}, {state: 'hand', key: 'stopped', value: false}]}
  ],
  win: [{type: 'state', target: 'hand', key: 'stopped'}, {type: 'any', of: [{type: 'state', target: 'hand', key: 'angle', min: 345}, {type: 'state', target: 'hand', key: 'angle', min: 0, max: 15}]}],
  onWin: [{fx: 'pop', target: 'clock'}]
});
