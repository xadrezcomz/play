// FASE 294 — ACENDA TODAS AS LUZES · a do meio está queimada: troque pela lâmpada nova.
RULES.registerLevel({
  id: 294, chapter: 30,
  instruction: 'LEVEL_294_TITLE',
  hints: ['LEVEL_294_HINT_1', 'LEVEL_294_HINT_2', 'LEVEL_294_HINT_3'],
  objects: [
    {id: 'b1', type: 'bulb', x: 22, y: 46, w: 14, h: 20, z: 3, state: {on: false}},
    {id: 'b2', type: 'bulb', x: 50, y: 46, w: 14, h: 20, z: 3, state: {on: false}, cls: 'faint', behaviors: {receives: {from: ['spare'], consume: true, set: {fixed: true}}}},
    {id: 'b3', type: 'bulb', x: 78, y: 46, w: 14, h: 20, z: 3, state: {on: false}},
    {id: 's1', type: 'switch', x: 22, y: 80, w: 9, h: 15, z: 3, state: {on: false}, behaviors: {clickable: {toggle: 'on', sound: 'click'}}},
    {id: 's2', type: 'switch', x: 50, y: 80, w: 9, h: 15, z: 3, state: {on: false}, behaviors: {clickable: {toggle: 'on', sound: 'click'}}},
    {id: 's3', type: 'switch', x: 78, y: 80, w: 9, h: 15, z: 3, state: {on: false}, behaviors: {clickable: {toggle: 'on', sound: 'click'}}},
    {id: 'shelf', type: 'shelf', x: 80, y: 106, w: 26, h: 6, z: 1, passive: true},
    {id: 'spare', type: 'bulb', x: 80, y: 98, w: 9, h: 13, z: 4, behaviors: {draggable: {}}}
  ],
  reactions: [
    {on: 'tap', target: 's1', 'do': [{toggle: 'b1'}]},
    {on: 'tap', target: 's3', 'do': [{toggle: 'b3'}]},
    {on: 'tap', target: 's2', when: {type: 'state', target: 'b2', key: 'fixed'}, 'do': [{toggle: 'b2'}]},
    {on: 'tap', target: 's2', unless: {type: 'state', target: 'b2', key: 'fixed'}, cooldown: 600, 'do': [{fx: 'shake', target: 'b2'}, {say: 'FB_BURNT_OUT'}]},
    {on: 'state', target: 'b2', key: 'fixed', 'do': [{cls: 'b2', remove: 'faint'}, {state: 'b2', key: 'on', value: false}, {state: 's2', key: 'on', value: false}]}
  ],
  win: [{type: 'state', target: 'b1', key: 'on'}, {type: 'state', target: 'b2', key: 'on'}, {type: 'state', target: 'b3', key: 'on'}],
  onWin: [{fx: 'pop', target: 'b1'}, {fx: 'pop', target: 'b2'}, {fx: 'pop', target: 'b3'}]
});
