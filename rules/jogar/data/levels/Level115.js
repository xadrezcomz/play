// FASE 115 — LIGUE O RÁDIO · a pilha está sem carga; o sol carrega.
RULES.registerLevel({
  id: 115, chapter: 12,
  instruction: 'LEVEL_115_TITLE',
  hints: ['LEVEL_115_HINT_1', 'LEVEL_115_HINT_2', 'LEVEL_115_HINT_3'],
  objects: [
    {id: 'radio', type: 'radio', x: 50, y: 92, w: 34, h: 24, z: 2, state: {quiet: true}, behaviors: {receives: {from: ['battery'], toolRequires: {charge: 1}, consume: true, set: {quiet: false}, failSay: 'FB_NO_CHARGE'}}},
    {id: 'battery', type: 'battery', x: 26, y: 56, w: 18, h: 9, z: 4, state: {charge: 0}, behaviors: {draggable: {}, receives: {from: ['sun'], set: {charge: 1}, returnTool: true}}},
    {id: 'sun', type: 'sun', x: 78, y: 30, w: 18, z: 3, behaviors: {draggable: {}}}
  ],
  reactions: [
    {on: 'tap', target: 'radio', cooldown: 900, 'do': [{fx: 'shake'}, {say: 'FB_NO_BATTERY'}]}
  ],
  win: {type: 'state', target: 'radio', key: 'quiet', equals: false},
  onWin: [{fx: 'hop', target: 'radio'}]
});
