// FASE 180 — MANDE A BOLA PARA A CESTA · uma gangorra: solte algo pesado na outra ponta.
RULES.registerLevel({
  id: 180, chapter: 18,
  instruction: 'LEVEL_180_TITLE',
  hints: ['LEVEL_180_HINT_1', 'LEVEL_180_HINT_2', 'LEVEL_180_HINT_3'],
  objects: [
    {id: 'ground', type: 'platform', x: 50, y: 113, w: 100, h: 14, z: 1, passive: true},
    {id: 'fulcrum', type: 'triangle', x: 50, y: 100, w: 12, h: 11, z: 1, passive: true, props: {color: '#7D8597'}},
    {id: 'plank', type: 'plank', x: 50, y: 93, w: 64, h: 3, z: 2, passive: true, rot: -8},
    {id: 'ball', type: 'ball', x: 24, y: 92, w: 9, z: 4, props: {color: 'coral'}},
    {id: 'basket', type: 'basket', x: 22, y: 40, w: 20, h: 13, z: 3, passive: true},
    {id: 'end', type: 'marker', x: 76, y: 84, w: 24, h: 18, z: 0, passive: true},
    {id: 'feather', type: 'feather', x: 62, y: 50, w: 6, h: 12, z: 5, behaviors: {draggable: {}}},
    {id: 'rock', type: 'rock', x: 84, y: 46, w: 16, h: 11, z: 5, behaviors: {draggable: {}}}
  ],
  reactions: [
    {on: 'tap', target: 'ball', cooldown: 700, 'do': [{fx: 'hop'}, {say: 'FB_TOO_HIGH'}]},
    {on: 'drop', target: 'feather', when: {type: 'touching', a: 'feather', b: 'end'}, cooldown: 800, 'do': [{move: 'feather', to: [76, 88], ms: 500}, {fail: 'FB_TOO_LIGHT'}]},
    {on: 'drop', target: 'rock', when: {type: 'touching', a: 'rock', b: 'end'}, 'do': [{move: 'rock', to: [76, 84], ms: 200, await: true}, {move: 'plank', rot: 8, ms: 120}, {sound: 'whoosh'}, {move: 'ball', to: [26, 20], ms: 380, ease: 'cubic-bezier(.2,.9,.4,1)', await: true}, {move: 'ball', to: [22, 38], ms: 260, ease: 'ease-in', await: true}, {state: 'ball', key: 'scored', value: true}]}
  ],
  win: {type: 'state', target: 'ball', key: 'scored'},
  onWin: [{fx: 'squash', target: 'basket'}]
});
