// FASE 208 — QUAL POTE TEM AÇÚCAR? · os dois parecem iguais; as formigas sabem: espere e veja.
RULES.registerLevel({
  id: 208, chapter: 21,
  instruction: 'LEVEL_208_TITLE',
  hints: ['LEVEL_208_HINT_1', 'LEVEL_208_HINT_2', 'LEVEL_208_HINT_3'],
  objects: [
    {id: 'ja', type: 'jar', x: 30, y: 86, w: 22, h: 28, z: 2, props: {color: 'blue'}},
    {id: 'jb', type: 'jar', x: 70, y: 86, w: 22, h: 28, z: 2, props: {color: 'blue'}},
    {id: 'table', type: 'bar', x: 50, y: 104, w: 90, h: 4, z: 1, passive: true, props: {color: 'wood'}},
    {id: 'a0', type: 'ant', x: 6, y: 112, w: 4, h: 2.4, z: 3, passive: true, behaviors: {patrol: {points: [[6, 112], [40, 112], [66, 104], [70, 92], [66, 104], [40, 112]], ms: 1100, delay: 1500}}},
    {id: 'a1', type: 'ant', x: 11, y: 112, w: 4, h: 2.4, z: 3, passive: true, behaviors: {patrol: {points: [[11, 112], [40, 112], [68, 104], [72, 92], [68, 104], [40, 112]], ms: 1100, delay: 1900}}},
    {id: 'a2', type: 'ant', x: 16, y: 112, w: 4, h: 2.4, z: 3, passive: true, behaviors: {patrol: {points: [[16, 112], [40, 112], [70, 104], [74, 92], [70, 104], [40, 112]], ms: 1100, delay: 2300}}},
    {id: 'a3', type: 'ant', x: 21, y: 112, w: 4, h: 2.4, z: 3, passive: true, behaviors: {patrol: {points: [[21, 112], [40, 112], [72, 104], [76, 92], [72, 104], [40, 112]], ms: 1100, delay: 2700}}}
  ],
  reactions: [
    {on: 'tap', target: 'ja', 'do': [{forget: 'ja'}, {fx: 'shake'}, {fail: 'FB_SALT'}]}
  ],
  win: {type: 'tapped', target: 'jb'},
  onWin: [{fx: 'pop', target: 'jb'}]
});
