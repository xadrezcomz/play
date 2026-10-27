// FASE 173 — O QUE PESA MAIS? · 1 kg de penas ou 1 kg de pedras: pesam igual.
RULES.registerLevel({
  id: 173, chapter: 18,
  instruction: 'LEVEL_173_TITLE',
  hints: ['LEVEL_173_HINT_1', 'LEVEL_173_HINT_2', 'LEVEL_173_HINT_3'],
  objects: [
    {id: 'sackA', type: 'basket', x: 28, y: 74, w: 28, h: 20, z: 2},
    {id: 'fA', type: 'feather', x: 22, y: 62, w: 6, h: 12, z: 1, passive: true, rot: -20},
    {id: 'fB', type: 'feather', x: 32, y: 60, w: 6, h: 12, z: 1, passive: true, rot: 15},
    {id: 'sackB', type: 'basket', x: 72, y: 74, w: 28, h: 20, z: 2},
    {id: 'rA', type: 'rock', x: 68, y: 64, w: 12, h: 8, z: 1, passive: true},
    {id: 'rB', type: 'rock', x: 77, y: 63, w: 10, h: 7, z: 1, passive: true},
    {id: 'kgA', type: 'word', textKey: 'LEVEL_173_KG', fontU: 5, x: 28, y: 90, z: 3, passive: true, cls: 'sign'},
    {id: 'kgB', type: 'word', textKey: 'LEVEL_173_KG', fontU: 5, x: 72, y: 90, z: 3, passive: true, cls: 'sign'},
    {id: 'same', type: 'word', textKey: 'LEVEL_173_SAME', fontU: 6, x: 50, y: 108, z: 3, cls: 'card'}
  ],
  reactions: [
    {on: 'tap', target: 'sackA', cooldown: 600, 'do': [{fx: 'shake'}, {fail: 'FB_READ_AGAIN'}]},
    {on: 'tap', target: 'sackB', cooldown: 600, 'do': [{fx: 'shake'}, {fail: 'FB_READ_AGAIN'}]}
  ],
  win: {type: 'tapped', target: 'same'},
  onWin: [{fx: 'pop', target: 'same'}]
});
