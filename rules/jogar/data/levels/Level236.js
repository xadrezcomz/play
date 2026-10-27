// FASE 236 — DE QUE COR ERA A PORTA? · ela era azul antes de apagar a luz.
RULES.registerLevel({
  id: 236, chapter: 24,
  instruction: 'LEVEL_236_TITLE',
  hints: ['LEVEL_236_HINT_1', 'LEVEL_236_HINT_2', 'LEVEL_236_HINT_3'],
  objects: [
    {id: 'door', type: 'door', x: 50, y: 60, w: 20, h: 40, z: 2, passive: true, props: {color: 'blue'}},
    {id: 'gray', type: 'door', x: 50, y: 60, w: 20, h: 40, z: 3, passive: true, hidden: true, props: {color: '#B8BFCC'}},
    {id: 'c_purple', type: 'circle', x: 20, y: 100, w: 13, z: 3, hidden: true, props: {color: 'purple'}},
    {id: 'c_blue', type: 'circle', x: 40, y: 100, w: 13, z: 3, hidden: true, props: {color: 'blue'}},
    {id: 'c_green', type: 'circle', x: 60, y: 100, w: 13, z: 3, hidden: true, props: {color: 'green'}},
    {id: 'c_coral', type: 'circle', x: 80, y: 100, w: 13, z: 3, hidden: true, props: {color: 'coral'}},
    {id: 'ctl', type: 'marker', x: 0, y: 0, w: 1, passive: true, behaviors: {timer: {delay: 2500, times: 1, 'do': [{show: 'gray'}, {show: 'c_purple'}, {show: 'c_blue'}, {show: 'c_green'}, {show: 'c_coral'}]}}}
  ],
  reactions: [
    {on: 'tap', target: 'c_purple', cooldown: 500, 'do': [{fx: 'shake'}, {fail: 'FB_OTHER_COLOR'}]},
    {on: 'tap', target: 'c_green', cooldown: 500, 'do': [{fx: 'shake'}, {fail: 'FB_OTHER_COLOR'}]},
    {on: 'tap', target: 'c_coral', cooldown: 500, 'do': [{fx: 'shake'}, {fail: 'FB_OTHER_COLOR'}]}
  ],
  win: {type: 'tapped', target: 'c_blue'},
  onWin: [{hide: 'gray'}, {fx: 'pop', target: 'door'}]
});
