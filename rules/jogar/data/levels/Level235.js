// FASE 235 — O QUE SUMIU? · decore os cinco; quando voltarem quatro, toque no que sumiu (a estrela).
RULES.registerLevel({
  id: 235, chapter: 24,
  instruction: 'LEVEL_235_TITLE',
  hints: ['LEVEL_235_HINT_1', 'LEVEL_235_HINT_2', 'LEVEL_235_HINT_3'],
  objects: [
    {id: 'i_apple', type: 'apple', x: 14, y: 50, w: 12, z: 2, passive: true, props: {color: 'coral'}},
    {id: 'i_star', type: 'star', x: 32, y: 50, w: 12, z: 2, passive: true, props: {color: 'yellow'}},
    {id: 'i_ball', type: 'ball', x: 50, y: 50, w: 12, z: 2, passive: true, props: {color: 'blue'}},
    {id: 'i_cube', type: 'cube', x: 68, y: 50, w: 12, z: 2, passive: true, props: {color: 'green'}},
    {id: 'i_heart', type: 'heart', x: 86, y: 50, w: 12, z: 2, passive: true, props: {color: 'pink'}},
    {id: 'o_star', type: 'star', x: 26, y: 96, w: 14, z: 3, hidden: true, props: {color: 'yellow'}},
    {id: 'o_moon', type: 'moon', x: 50, y: 96, w: 14, z: 3, hidden: true},
    {id: 'o_key', type: 'key', x: 74, y: 96, w: 16, h: 8, z: 3, hidden: true},
    {id: 'ctl', type: 'marker', x: 0, y: 0, w: 1, passive: true, behaviors: {timer: {delay: 3000, times: 1, 'do': [{hide: 'i_apple'}, {hide: 'i_star'}, {hide: 'i_ball'}, {hide: 'i_cube'}, {hide: 'i_heart'}, {wait: 500}, {move: 'i_heart', to: [20, 50], ms: 0}, {show: 'i_heart'}, {move: 'i_ball', to: [40, 50], ms: 0}, {show: 'i_ball'}, {move: 'i_apple', to: [60, 50], ms: 0}, {show: 'i_apple'}, {move: 'i_cube', to: [80, 50], ms: 0}, {show: 'i_cube'}, {show: 'o_star'}, {show: 'o_moon'}, {show: 'o_key'}, {state: 'ctl', key: 'asked', value: true}]}}}
  ],
  reactions: [
    {on: 'tap', target: 'o_moon', cooldown: 500, 'do': [{fx: 'shake'}, {fail: 'FB_WASNT_THERE'}]},
    {on: 'tap', target: 'o_key', cooldown: 500, 'do': [{fx: 'shake'}, {fail: 'FB_WASNT_THERE'}]}
  ],
  win: {type: 'tapped', target: 'o_star'},
  onWin: [{fx: 'pop', target: 'o_star'}]
});
