// FASE 272 — FAÇA OS DOIS SE ABRAÇAREM · o amigo é tímido e foge quando vê o Ruli: apague a luz.
RULES.registerLevel({
  id: 272, chapter: 28,
  instruction: 'LEVEL_272_TITLE',
  hints: ['LEVEL_272_HINT_1', 'LEVEL_272_HINT_2', 'LEVEL_272_HINT_3'],
  objects: [
    {id: 'bulb', type: 'bulb', x: 50, y: 30, w: 12, h: 17, z: 1, passive: true, state: {on: true}},
    {id: 'switch', type: 'switch', x: 88, y: 52, w: 8, h: 13, z: 6, state: {on: true}, behaviors: {clickable: {toggle: 'on', sound: 'click'}}},
    {id: 'dark', type: 'blackout', x: 50, y: 66, w: 104, h: 104, z: 5, passive: true, hidden: true, cls: 'dim'},
    {id: 'ruli', type: 'ruli', x: 24, y: 90, w: 13, h: 14.56, z: 4, props: {color: 'teal'}, behaviors: {draggable: {}, character: {}}},
    {id: 'shy', type: 'ruli', x: 72, y: 90, w: 13, h: 14.56, z: 4, props: {color: 'pink'}, behaviors: {flee: {from: 'ruli', radius: 22, when: {type: 'state', target: 'bulb', key: 'on'}}}}
  ],
  reactions: [
    {on: 'tap', target: 'switch', 'do': [{toggle: 'bulb'}]},
    {on: 'state', target: 'bulb', key: 'on', value: false, 'do': [{show: 'dark'}]},
    {on: 'state', target: 'bulb', key: 'on', value: true, 'do': [{hide: 'dark'}]},
    {on: 'flee', target: 'shy', cooldown: 1500, 'do': [{say: 'FB_SHY'}]}
  ],
  win: {type: 'touching', a: 'ruli', b: 'shy'},
  onWin: [{state: 'bulb', key: 'on', value: true}, {hide: 'dark'}, {expr: 'happy', target: 'ruli'}, {expr: 'happy', target: 'shy'}]
});
