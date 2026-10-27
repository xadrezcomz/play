// FASE 271 — CADA AMIGO NA SUA CASA · a porta da casa tem a cor do amigo; o roxo está dormindo: toque para acordar.
RULES.registerLevel({
  id: 271, chapter: 28,
  instruction: 'LEVEL_271_TITLE',
  hints: ['LEVEL_271_HINT_1', 'LEVEL_271_HINT_2', 'LEVEL_271_HINT_3'],
  objects: [
    {id: 'h_pink', type: 'door', x: 22, y: 46, w: 14, h: 26, z: 1, passive: true, props: {color: 'pink'}},
    {id: 'z_pink', type: 'marker', x: 22, y: 62, w: 18, h: 14, z: 0, passive: true},
    {id: 'h_yellow', type: 'door', x: 50, y: 46, w: 14, h: 26, z: 1, passive: true, props: {color: 'yellow'}},
    {id: 'z_yellow', type: 'marker', x: 50, y: 62, w: 18, h: 14, z: 0, passive: true},
    {id: 'h_purple', type: 'door', x: 78, y: 46, w: 14, h: 26, z: 1, passive: true, props: {color: 'purple'}},
    {id: 'z_purple', type: 'marker', x: 78, y: 62, w: 18, h: 14, z: 0, passive: true},
    {id: 'f_pink', type: 'ruli', x: 76, y: 98, w: 12, h: 13.44, z: 4, props: {color: 'pink'}, behaviors: {draggable: {}, character: {}}},
    {id: 'f_yellow', type: 'ruli', x: 24, y: 98, w: 12, h: 13.44, z: 4, props: {color: 'yellow'}, behaviors: {draggable: {}, character: {}}},
    {id: 'f_purple', type: 'ruli', x: 50, y: 98, w: 12, h: 13.44, z: 4, props: {color: 'purple'}, behaviors: {draggable: {requires: {awake: true}}}, state: {expr: 'sleepy'}}
  ],
  reactions: [
    {on: 'tap', target: 'f_purple', unless: {type: 'state', target: 'f_purple', key: 'awake'}, 'do': [{state: 'f_purple', key: 'awake', value: true}, {expr: 'surprised', target: 'f_purple'}, {wait: 400}, {expr: 'normal', target: 'f_purple'}]},
    {on: 'locked', target: 'f_purple', cooldown: 900, 'do': [{say: 'FB_ZZZ'}]}
  ],
  win: [{type: 'inside', objects: ['f_pink'], container: 'z_pink'}, {type: 'inside', objects: ['f_yellow'], container: 'z_yellow'}, {type: 'inside', objects: ['f_purple'], container: 'z_purple'}],
  onWin: [{expr: 'happy', target: 'f_pink'}, {expr: 'happy', target: 'f_yellow'}, {expr: 'happy', target: 'f_purple'}]
});
