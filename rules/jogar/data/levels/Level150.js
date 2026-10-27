// FASE 150 — PINTE O ARCO-ÍRIS · vermelho, laranja, amarelo, verde, azul e roxo; as misturas se fazem na paleta.
RULES.registerLevel({
  id: 150, chapter: 15,
  instruction: 'LEVEL_150_TITLE',
  hints: ['LEVEL_150_HINT_1', 'LEVEL_150_HINT_2', 'LEVEL_150_HINT_3'],
  objects: [
    {id: 'a0', type: 'circle', x: 16.0, y: 66.0, w: 10, z: 2, props: {color: '#E9E4DA'}, behaviors: {receives: {from: ['pal', 'pr', 'py', 'pb'], copyColor: true, returnTool: true}}},
    {id: 'a1', type: 'circle', x: 22.5, y: 46.0, w: 10, z: 2, props: {color: '#E9E4DA'}, behaviors: {receives: {from: ['pal', 'pr', 'py', 'pb'], copyColor: true, returnTool: true}}},
    {id: 'a2', type: 'circle', x: 39.5, y: 33.7, w: 10, z: 2, props: {color: '#E9E4DA'}, behaviors: {receives: {from: ['pal', 'pr', 'py', 'pb'], copyColor: true, returnTool: true}}},
    {id: 'a3', type: 'circle', x: 60.5, y: 33.7, w: 10, z: 2, props: {color: '#E9E4DA'}, behaviors: {receives: {from: ['pal', 'pr', 'py', 'pb'], copyColor: true, returnTool: true}}},
    {id: 'a4', type: 'circle', x: 77.5, y: 46.0, w: 10, z: 2, props: {color: '#E9E4DA'}, behaviors: {receives: {from: ['pal', 'pr', 'py', 'pb'], copyColor: true, returnTool: true}}},
    {id: 'a5', type: 'circle', x: 84.0, y: 66.0, w: 10, z: 2, props: {color: '#E9E4DA'}, behaviors: {receives: {from: ['pal', 'pr', 'py', 'pb'], copyColor: true, returnTool: true}}},
    {id: 'ref0', type: 'circle', x: 35, y: 24, w: 4.5, z: 1, passive: true, props: {color: 'coral'}},
    {id: 'ref1', type: 'circle', x: 41, y: 24, w: 4.5, z: 1, passive: true, props: {color: 'orange'}},
    {id: 'ref2', type: 'circle', x: 47, y: 24, w: 4.5, z: 1, passive: true, props: {color: 'yellow'}},
    {id: 'ref3', type: 'circle', x: 53, y: 24, w: 4.5, z: 1, passive: true, props: {color: 'green'}},
    {id: 'ref4', type: 'circle', x: 59, y: 24, w: 4.5, z: 1, passive: true, props: {color: 'blue'}},
    {id: 'ref5', type: 'circle', x: 65, y: 24, w: 4.5, z: 1, passive: true, props: {color: 'purple'}},
    {id: 'pal', type: 'palette', x: 50, y: 74, w: 24, h: 19, z: 4, behaviors: {draggable: {}, palette: {from: ['pb', 'py', 'pr']}}},
    {id: 'pr', type: 'bucket', x: 20, y: 106, w: 12, h: 13.5, z: 6, props: {color: 'coral'}, behaviors: {draggable: {}}},
    {id: 'py', type: 'bucket', x: 50, y: 108, w: 12, h: 13.5, z: 6, props: {color: 'yellow'}, behaviors: {draggable: {}}},
    {id: 'pb', type: 'bucket', x: 80, y: 106, w: 12, h: 13.5, z: 6, props: {color: 'blue'}, behaviors: {draggable: {}}}
  ],
  win: [{type: 'state', target: 'a0', key: 'color', equals: 'coral'}, {type: 'state', target: 'a1', key: 'color', equals: 'orange'}, {type: 'state', target: 'a2', key: 'color', equals: 'yellow'}, {type: 'state', target: 'a3', key: 'color', equals: 'green'}, {type: 'state', target: 'a4', key: 'color', equals: 'blue'}, {type: 'state', target: 'a5', key: 'color', equals: 'purple'}],
  onWin: [{fx: 'pop', target: 'a0'}, {fx: 'pop', target: 'a1'}, {fx: 'pop', target: 'a2'}, {fx: 'pop', target: 'a3'}, {fx: 'pop', target: 'a4'}, {fx: 'pop', target: 'a5'}]
});
