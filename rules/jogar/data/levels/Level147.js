// FASE 147 — SEPARE AS BOLAS POR COR · a bola cinza não tem cesto: pinte-a antes.
RULES.registerLevel({
  id: 147, chapter: 15,
  instruction: 'LEVEL_147_TITLE',
  hints: ['LEVEL_147_HINT_1', 'LEVEL_147_HINT_2', 'LEVEL_147_HINT_3'],
  objects: [
    {id: 'r1', type: 'circle', x: 20, y: 40, w: 11, z: 5, props: {color: 'coral'}, behaviors: {draggable: {}}},
    {id: 'y1', type: 'circle', x: 40, y: 34, w: 11, z: 5, props: {color: 'yellow'}, behaviors: {draggable: {}}},
    {id: 'b1', type: 'circle', x: 60, y: 40, w: 11, z: 5, props: {color: 'blue'}, behaviors: {draggable: {}}},
    {id: 'r2', type: 'circle', x: 80, y: 34, w: 11, z: 5, props: {color: 'coral'}, behaviors: {draggable: {}}},
    {id: 'gray', type: 'circle', x: 50, y: 58, w: 11, z: 5, props: {color: '#B8BFCC'}, behaviors: {draggable: {}, receives: {from: ['pb'], copyColor: true, returnTool: true}}},
    {id: 'kr', type: 'basket', x: 20, y: 98, w: 22, h: 15, z: 2, props: {}, behaviors: {container: {}}},
    {id: 'ky', type: 'basket', x: 50, y: 98, w: 22, h: 15, z: 2, behaviors: {container: {}}},
    {id: 'kb', type: 'basket', x: 80, y: 98, w: 22, h: 15, z: 2, behaviors: {container: {}}},
    {id: 'tr', type: 'bar', x: 20, y: 108, w: 16, h: 2.5, z: 3, passive: true, props: {color: 'coral'}},
    {id: 'ty', type: 'bar', x: 50, y: 108, w: 16, h: 2.5, z: 3, passive: true, props: {color: 'yellow'}},
    {id: 'tb', type: 'bar', x: 80, y: 108, w: 16, h: 2.5, z: 3, passive: true, props: {color: 'blue'}},
    {id: 'pb', type: 'bucket', x: 86, y: 66, w: 12, h: 13.5, z: 6, props: {color: 'blue'}, behaviors: {draggable: {}}}
  ],
  triggers: [
    {when: [{type: 'inside', objects: ['r1', 'r2'], container: 'kr'}, {type: 'inside', objects: ['y1'], container: 'ky'}, {type: 'inside', objects: ['b1'], container: 'kb'}], 'do': [{wait: 400}, {say: 'FB_GRAY_LEFT'}]}
  ],
  win: [{type: 'inside', objects: ['r1', 'r2'], container: 'kr'}, {type: 'inside', objects: ['y1'], container: 'ky'}, {type: 'inside', objects: ['b1'], container: 'kb'}, {type: 'any', of: [[{type: 'state', target: 'gray', key: 'color', equals: 'coral'}, {type: 'inside', objects: ['gray'], container: 'kr'}], [{type: 'state', target: 'gray', key: 'color', equals: 'yellow'}, {type: 'inside', objects: ['gray'], container: 'ky'}], [{type: 'state', target: 'gray', key: 'color', equals: 'blue'}, {type: 'inside', objects: ['gray'], container: 'kb'}]]}],
  onWin: [{fx: 'squash', target: 'kr'}, {fx: 'squash', target: 'ky'}, {fx: 'squash', target: 'kb'}]
});
