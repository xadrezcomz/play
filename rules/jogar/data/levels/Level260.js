// FASE 260 — ABRA O PRESENTE · desamarre o laço (afaste os dedos), tire a tampa (deslize para cima) e ache o que tem dentro com a lupa.
RULES.registerLevel({
  id: 260, chapter: 26,
  instruction: 'LEVEL_260_TITLE',
  hints: ['LEVEL_260_HINT_1', 'LEVEL_260_HINT_2', 'LEVEL_260_HINT_3'],
  objects: [
    {id: 'gift', type: 'gift', x: 50, y: 76, w: 40, z: 2, behaviors: {scalable: {min: 0.9, max: 1.6}}},
    {id: 'ring', type: 'gem', x: 50, y: 76, w: 2.4, h: 2.2, z: 6, hidden: true},
    {id: 'lens', type: 'lens', x: 18, y: 44, w: 18, z: 5, hidden: true, behaviors: {draggable: {}, magnify: {targets: ['ring'], radius: 12, scale: 5}}}
  ],
  reactions: [
    {on: 'tap', target: 'gift', cooldown: 700, 'do': [{fx: 'shake'}, {say: 'FB_TIED'}]},
    {on: 'scaleend', target: 'gift', when: {type: 'scale', target: 'gift', min: 1.35}, unless: {type: 'state', target: 'gift', key: 'untied'}, 'do': [{state: 'gift', key: 'untied', value: true}, {grow: 'gift', to: 1, ms: 250}, {say: 'FB_UNTIED'}]},
    {on: 'swipe', target: 'gift', dir: 'up', when: {type: 'state', target: 'gift', key: 'untied'}, 'do': [{state: 'gift', key: 'open', value: true}, {show: 'ring'}, {show: 'lens'}, {say: 'FB_LOOKS_EMPTY'}]},
    {on: 'swipe', target: 'gift', dir: 'up', unless: {type: 'state', target: 'gift', key: 'untied'}, cooldown: 700, 'do': [{say: 'FB_TIED'}]}
  ],
  win: {type: 'tapped', target: 'ring'},
  onWin: [{fx: 'pop', target: 'ring'}, {mascot: 'happy'}]
});
