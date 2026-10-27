// FASE 228 — ACHE O GATO · ele está no meio das bolas laranja.
RULES.registerLevel({
  id: 228, chapter: 23,
  instruction: 'LEVEL_228_TITLE',
  hints: ['LEVEL_228_HINT_1', 'LEVEL_228_HINT_2', 'LEVEL_228_HINT_3'],
  objects: [
    {id: 'o0', type: 'circle', x: 38.0, y: 49.1, w: 12.9, z: 2, passive: true, props: {color: 'orange'}},
    {id: 'o1', type: 'circle', x: 71.8, y: 45.6, w: 12.5, z: 3, passive: true, props: {color: 'orange'}},
    {id: 'o2', type: 'circle', x: 18.5, y: 66.0, w: 9.4, z: 4, passive: true, props: {color: 'orange'}},
    {id: 'o3', type: 'circle', x: 53.5, y: 43.5, w: 12.4, z: 2, passive: true, props: {color: 'orange'}},
    {id: 'o4', type: 'circle', x: 58.9, y: 75.0, w: 9.4, z: 3, passive: true, props: {color: 'coral'}},
    {id: 'o5', type: 'circle', x: 19.4, y: 53.3, w: 12.3, z: 4, passive: true, props: {color: 'orange'}},
    {id: 'o6', type: 'circle', x: 35.7, y: 48.7, w: 9.7, z: 2, passive: true, props: {color: 'yellow'}},
    {id: 'o7', type: 'circle', x: 54.1, y: 80.9, w: 9.6, z: 3, passive: true, props: {color: 'orange'}},
    {id: 'o8', type: 'circle', x: 41.3, y: 72.9, w: 9.4, z: 4, passive: true, props: {color: 'orange'}},
    {id: 'o9', type: 'circle', x: 58.1, y: 69.8, w: 12.2, z: 2, passive: true, props: {color: 'yellow'}},
    {id: 'o10', type: 'circle', x: 47.7, y: 95.4, w: 11.2, z: 3, passive: true, props: {color: 'orange'}},
    {id: 'o11', type: 'circle', x: 70.0, y: 81.9, w: 10.5, z: 4, passive: true, props: {color: 'yellow'}},
    {id: 'o12', type: 'circle', x: 51.7, y: 92.5, w: 13.4, z: 2, passive: true, props: {color: 'yellow'}},
    {id: 'o13', type: 'circle', x: 57.4, y: 44.4, w: 12.1, z: 3, passive: true, props: {color: 'orange'}},
    {id: 'o14', type: 'circle', x: 67.5, y: 49.1, w: 11.9, z: 4, passive: true, props: {color: 'orange'}},
    {id: 'o15', type: 'circle', x: 81.4, y: 44.7, w: 12.3, z: 2, passive: true, props: {color: 'yellow'}},
    {id: 'o16', type: 'circle', x: 39.1, y: 61.0, w: 12.0, z: 3, passive: true, props: {color: 'coral'}},
    {id: 'o17', type: 'circle', x: 20.7, y: 45.6, w: 10.6, z: 4, passive: true, props: {color: 'orange'}},
    {id: 'o18', type: 'circle', x: 20.1, y: 82.1, w: 12.9, z: 2, passive: true, props: {color: 'coral'}},
    {id: 'o19', type: 'circle', x: 35.4, y: 63.1, w: 13.0, z: 3, passive: true, props: {color: 'orange'}},
    {id: 'o20', type: 'circle', x: 80.0, y: 61.3, w: 12.7, z: 4, passive: true, props: {color: 'coral'}},
    {id: 'o21', type: 'circle', x: 20.0, y: 86.1, w: 9.8, z: 2, passive: true, props: {color: 'orange'}},
    {id: 'cat', type: 'cat', x: 62, y: 78, w: 13, h: 11.7, z: 3}
  ],
  reactions: [
    {on: 'tap', target: null, cooldown: 900, 'do': [{say: 'FB_JUST_BALLS'}]}
  ],
  win: {type: 'tapped', target: 'cat'},
  onWin: [{fx: 'hop', target: 'cat'}]
});
