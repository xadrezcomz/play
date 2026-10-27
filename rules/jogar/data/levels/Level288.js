// FASE 288 — QUE HORAS SÃO AGORA? · de verdade: coloque o ponteiro na hora do seu relógio.
RULES.registerLevel({
  id: 288, chapter: 29,
  instruction: 'LEVEL_288_TITLE',
  hints: ['LEVEL_288_HINT_1', 'LEVEL_288_HINT_2', 'LEVEL_288_HINT_3'],
  objects: [
    {id: 'clock', type: 'clock', x: 50, y: 66, w: 62, z: 1, passive: true, props: {numbers: true}},
    {id: 'hour', type: 'hand', x: 50, y: 66, w: 44, z: 3, props: {len: 30, width: 8, color: 'coral'}, state: {angle: null}, behaviors: {rotatable: {snap: 30}}},
    {id: 'ok', type: 'button', x: 50, y: 108, w: 14, z: 3, props: {color: 'green'}}
  ],
  reactions: [
    {on: 'tap', target: 'ok', unless: {type: 'realHour', target: 'hour', key: 'angle'}, 'do': [{forget: 'ok'}, {fx: 'shake', target: 'clock'}, {fail: 'FB_CHECK_REAL_TIME'}]}
  ],
  win: [{type: 'realHour', target: 'hour', key: 'angle'}, {type: 'tapped', target: 'ok'}],
  onWin: [{fx: 'pop', target: 'clock'}]
});
