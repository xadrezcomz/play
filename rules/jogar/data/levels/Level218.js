// FASE 218 — PEGUE A CHAVE · ela está congelada: leve o gelo para o sol e espere derreter.
RULES.registerLevel({
  id: 218, chapter: 22,
  instruction: 'LEVEL_218_TITLE',
  hints: ['LEVEL_218_HINT_1', 'LEVEL_218_HINT_2', 'LEVEL_218_HINT_3'],
  objects: [
    {id: 'sunny', type: 'outline', x: 74, y: 84, w: 36, h: 36, z: 0, passive: true, props: {color: 'yellow'}},
    {id: 'sun', type: 'sun', x: 80, y: 36, w: 20, z: 1, passive: true},
    {id: 'beam', type: 'bar', x: 74, y: 64, w: 30, h: 50, z: 0, passive: true, props: {color: '#FFF1B8'}},
    {id: 'key', type: 'key', x: 24, y: 86, w: 12, h: 6, z: 2, passive: true},
    {id: 'ice', type: 'ice', x: 24, y: 86, w: 22, z: 3, behaviors: {draggable: {}, carries: {ids: ['key']}, bake: {in: 'sunny', ms: 3200, set: {melted: true}}}}
  ],
  reactions: [
    {on: 'tap', target: 'ice', cooldown: 700, 'do': [{fx: 'shake'}, {say: 'FB_FROZEN'}]},
    {on: 'baked', target: 'ice', 'do': [{state: 'ice', key: 'melt', value: 1}, {wait: 200}, {hide: 'ice'}]}
  ],
  win: {type: 'state', target: 'ice', key: 'melted'},
  onWin: [{fx: 'pop', target: 'key'}]
});
