// FASE 297 — CHEGUE À BANDEIRA · ponha a tábua no buraco e abra a porta com a chave do tapete.
RULES.registerLevel({
  id: 297, chapter: 30,
  instruction: 'LEVEL_297_TITLE',
  hints: ['LEVEL_297_HINT_1', 'LEVEL_297_HINT_2', 'LEVEL_297_HINT_3'],
  objects: [
    {id: 'gl', type: 'platform', x: 18, y: 108, w: 36, h: 16, z: 1, passive: true},
    {id: 'gr', type: 'platform', x: 72, y: 108, w: 56, h: 16, z: 1, passive: true},
    {id: 'hole', type: 'hole', x: 40, y: 108, w: 8, h: 16, z: 1, passive: true, hitbox: {x: 40, y: 96, w: 8, h: 30}},
    {id: 'plank', type: 'plank', x: 20, y: 52, w: 18, h: 3, z: 4, behaviors: {draggable: {}, snap: {to: ['bridgeAt'], tol: 10}}},
    {id: 'bridgeAt', type: 'marker', x: 40, y: 101.5, w: 4, z: 0, passive: true},
    {id: 'door', type: 'door', x: 70, y: 86, w: 12, h: 28, z: 2, passive: true, behaviors: {receives: {from: ['key'], consume: true, set: {unlocked: true}}}},
    {id: 'key', type: 'key', x: 84, y: 98, w: 10, h: 5, z: 2, behaviors: {draggable: {}}},
    {id: 'rug', type: 'bar', x: 84, y: 98.5, w: 18, h: 3.5, z: 3, props: {color: 'coral'}, behaviors: {draggable: {}}},
    {id: 'flag', type: 'flag', x: 90, y: 86, w: 8, h: 12, z: 1, passive: true},
    {id: 'ruli', type: 'ruli', x: 14, y: 92, w: 11, h: 12.3, z: 5, behaviors: {draggable: {axis: 'x', minX: 6, maxX: 94}, character: {}, fallsInto: {zones: ['hole'], safe: ['plank']}, pushes: {ids: [], solids: ['door']}}}
  ],
  reactions: [
    {on: 'fell', target: 'ruli', 'do': [{fail: 'FB_OOPS'}]},
    {on: 'bump', target: 'door', cooldown: 1500, 'do': [{say: 'FB_LOCKED'}]},
    {on: 'state', target: 'door', key: 'unlocked', 'do': [{hide: 'door'}, {sound: 'click'}]}
  ],
  win: {type: 'touching', a: 'ruli', b: 'flag'},
  onWin: [{expr: 'happy', target: 'ruli'}, {fx: 'hop', target: 'ruli'}]
});
