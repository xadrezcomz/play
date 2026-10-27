// FASE 114 — ACENDA A LUZ · são dois interruptores; o segundo está atrás do aviso.
RULES.registerLevel({
  id: 114, chapter: 12,
  instruction: 'LEVEL_114_TITLE',
  hints: ['LEVEL_114_HINT_1', 'LEVEL_114_HINT_2', 'LEVEL_114_HINT_3'],
  objects: [
    {id: 'bulb', type: 'bulb', x: 50, y: 32, w: 16, h: 22.4, z: 3, state: {on: false}},
    {id: 's1', type: 'switch', x: 30, y: 74, w: 10, h: 16, z: 3, state: {on: false}, behaviors: {clickable: {toggle: 'on', sound: 'click'}}},
    {id: 's2', type: 'switch', x: 70, y: 74, w: 10, h: 16, z: 3, state: {on: false}, behaviors: {clickable: {toggle: 'on', sound: 'click'}}},
    {id: 'note', type: 'paper', x: 70, y: 76, w: 26, h: 22, z: 6, behaviors: {draggable: {}}}
  ],
  reactions: [
    {on: 'tap', target: 's1', unless: {type: 'state', target: 's2', key: 'on'}, cooldown: 900, 'do': [{wait: 200}, {say: 'FB_NOTHING_HAPPENS'}]}
  ],
  win: [{type: 'state', target: 's1', key: 'on'}, {type: 'state', target: 's2', key: 'on'}],
  onWin: [{state: 'bulb', key: 'on', value: true}, {fx: 'pop', target: 'bulb'}]
});
