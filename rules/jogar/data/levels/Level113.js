// FASE 113 — ACENDA A LUZ · o interruptor já está ligado; falta ligar o fio na tomada.
RULES.registerLevel({
  id: 113, chapter: 12,
  instruction: 'LEVEL_113_TITLE',
  hints: ['LEVEL_113_HINT_1', 'LEVEL_113_HINT_2', 'LEVEL_113_HINT_3'],
  objects: [
    {id: 'bulb', type: 'bulb', x: 50, y: 34, w: 16, h: 22.4, z: 3, state: {on: false}},
    {id: 'switch', type: 'switch', x: 22, y: 62, w: 10, h: 16, z: 3, state: {on: true}, behaviors: {clickable: {toggle: 'on', sound: 'click'}}},
    {id: 'socket', type: 'socket', x: 78, y: 94, w: 17, z: 2, passive: true},
    {id: 'plug', type: 'plug', x: 36, y: 96, w: 11, h: 19, z: 4, behaviors: {draggable: {}, snap: {to: ['socket'], tol: 12}}}
  ],
  reactions: [
    {on: 'tap', target: 'switch', unless: {type: 'state', target: 'plug', key: 'at', equals: 'socket'}, cooldown: 900, 'do': [{wait: 200}, {say: 'FB_NOTHING_HAPPENS'}]}
  ],
  win: [{type: 'state', target: 'switch', key: 'on'}, {type: 'state', target: 'plug', key: 'at', equals: 'socket'}],
  onWin: [{state: 'bulb', key: 'on', value: true}, {fx: 'pop', target: 'bulb'}]
});
