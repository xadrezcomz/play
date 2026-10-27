// FASE 249 — QUEM É A MAIS ALTA? · Ana é mais alta que Bia e Bia é mais alta que Cris: Ana.
RULES.registerLevel({
  id: 249, chapter: 25,
  instruction: 'LEVEL_249_TITLE',
  hints: ['LEVEL_249_HINT_1', 'LEVEL_249_HINT_2', 'LEVEL_249_HINT_3'],
  objects: [
    {id: 'wall', type: 'bar', x: 50, y: 92, w: 84, h: 20, z: 3, passive: true, props: {color: '#E9A07E'}},
    {id: 'ana', type: 'ruli', x: 26, y: 80, w: 16, h: 18, z: 2, props: {color: 'pink'}},
    {id: 'ana_n', type: 'word', textKey: 'LEVEL_249_ANA', fontU: 4.5, x: 26, y: 66, z: 4, passive: true, cls: 'card'},
    {id: 'bia', type: 'ruli', x: 50, y: 80, w: 16, h: 18, z: 2, props: {color: 'yellow'}},
    {id: 'bia_n', type: 'word', textKey: 'LEVEL_249_BIA', fontU: 4.5, x: 50, y: 66, z: 4, passive: true, cls: 'card'},
    {id: 'cris', type: 'ruli', x: 74, y: 80, w: 16, h: 18, z: 2, props: {color: 'purple'}},
    {id: 'cris_n', type: 'word', textKey: 'LEVEL_249_CRIS', fontU: 4.5, x: 74, y: 66, z: 4, passive: true, cls: 'card'},
    {id: 's1', type: 'word', textKey: 'LEVEL_249_S1', fontU: 4.4, x: 50, y: 36, z: 2, passive: true},
    {id: 's2', type: 'word', textKey: 'LEVEL_249_S2', fontU: 4.4, x: 50, y: 45, z: 2, passive: true}
  ],
  reactions: [
    {on: 'tap', target: 'bia', cooldown: 500, 'do': [{fx: 'hop'}, {fail: 'FB_THINK_AGAIN'}]},
    {on: 'tap', target: 'cris', cooldown: 500, 'do': [{fx: 'hop'}, {fail: 'FB_THINK_AGAIN'}]}
  ],
  win: {type: 'tapped', target: 'ana'},
  onWin: [{move: 'ana', by: [0, -10], ms: 300}, {expr: 'happy', target: 'ana'}]
});
