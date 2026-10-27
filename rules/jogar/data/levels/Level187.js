// FASE 187 — LEVE A LUA PARA CASA · a lua do céu não sai, mas a do balde (o reflexo) vai junto com o balde.
RULES.registerLevel({
  id: 187, chapter: 19,
  instruction: 'LEVEL_187_TITLE',
  hints: ['LEVEL_187_HINT_1', 'LEVEL_187_HINT_2', 'LEVEL_187_HINT_3'],
  objects: [
    {id: 'sky', type: 'sky', x: 50, y: 50, w: 100, h: 56, z: 0, passive: true, props: {night: true}},
    {id: 'moon', type: 'moon', x: 74, y: 34, w: 16, z: 1},
    {id: 'ground', type: 'platform', x: 50, y: 100, w: 100, h: 40, z: 0, passive: true, props: {color: '#9C8BB0'}},
    {id: 'house', type: 'doorway', x: 16, y: 92, w: 18, h: 30, z: 1, passive: true},
    {id: 'bucket', type: 'bucket', x: 70, y: 96, w: 16, h: 18, z: 3, props: {color: '#2B2D5C'}, behaviors: {draggable: {}, carries: {ids: ['refl']}}},
    {id: 'refl', type: 'moon', x: 70, y: 89.5, w: 6, z: 4, passive: true}
  ],
  reactions: [
    {on: 'tap', target: 'moon', cooldown: 700, 'do': [{fx: 'wobble'}, {say: 'FB_TOO_FAR'}]}
  ],
  win: {type: 'touching', a: 'bucket', b: 'house'},
  onWin: [{fx: 'pop', target: 'refl'}]
});
