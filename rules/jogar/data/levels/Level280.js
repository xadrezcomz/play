// FASE 280 — TODOS NA FESTA · traga os amigos para a sala: um está dormindo e outro está escondido no arbusto.
RULES.registerLevel({
  id: 280, chapter: 28,
  instruction: 'LEVEL_280_TITLE',
  hints: ['LEVEL_280_HINT_1', 'LEVEL_280_HINT_2', 'LEVEL_280_HINT_3'],
  objects: [
    {id: 'room', type: 'outline', x: 50, y: 52, w: 60, h: 34, z: 0, passive: true, props: {color: 'purple'}},
    {id: 'banner', type: 'word', textKey: 'LEVEL_280_PARTY', fontU: 5, x: 50, y: 30, z: 1, passive: true, cls: 'sign'},
    {id: 'cake', type: 'cake', x: 50, y: 60, w: 16, h: 12.8, z: 1, passive: true},
    {id: 'ruli', type: 'ruli', x: 30, y: 56, w: 11, h: 12.32, z: 4, props: {color: 'teal'}, behaviors: {draggable: {}, character: {}}},
    {id: 'pp', type: 'ruli', x: 16, y: 98, w: 11, h: 12.32, z: 4, props: {color: 'pink'}, behaviors: {draggable: {}, character: {}}},
    {id: 'ss', type: 'ruli', x: 50, y: 100, w: 11, h: 12.32, z: 4, props: {color: 'yellow'}, behaviors: {draggable: {requires: {awake: true}}}, state: {expr: 'sleepy'}},
    {id: 'hh', type: 'ruli', x: 84, y: 96, w: 11, h: 12.32, z: 2, props: {color: 'purple'}, behaviors: {draggable: {}, character: {}}},
    {id: 'bush', type: 'bush', x: 84, y: 98, w: 26, h: 17, z: 3, behaviors: {draggable: {}}}
  ],
  reactions: [
    {on: 'tap', target: 'ss', unless: {type: 'state', target: 'ss', key: 'awake'}, 'do': [{state: 'ss', key: 'awake', value: true}, {expr: 'happy', target: 'ss'}]},
    {on: 'locked', target: 'ss', cooldown: 900, 'do': [{say: 'FB_ZZZ'}]}
  ],
  triggers: [
    {when: [{type: 'count', objects: ['ruli', 'pp', 'ss'], container: 'room', min: 3}, {type: 'not', of: {type: 'inside', objects: ['hh'], container: 'room'}}], 'do': [{wait: 400}, {say: 'FB_SOMEONE_MISSING'}]}
  ],
  win: {type: 'count', objects: ['ruli', 'pp', 'ss', 'hh'], container: 'room', min: 4},
  onWin: [{expr: 'happy', target: 'ruli'}, {expr: 'happy', target: 'pp'}, {expr: 'happy', target: 'ss'}, {expr: 'happy', target: 'hh'}, {mascot: 'happy'}]
});
