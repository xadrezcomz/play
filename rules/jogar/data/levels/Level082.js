// FASE 82 — O QUE MUDOU? · a luz pisca e um círculo troca de cor.
(function () {
  var cols = ['coral', 'yellow', 'blue', 'green', 'purple'], objs = [], reactions = [];
  var pos = [[22, 40], [70, 36], [46, 66], [24, 94], [76, 90]];
  cols.forEach(function (c, i) {
    var id = 'o' + (i + 1);
    objs.push({ id: id, type: 'circle', x: pos[i][0], y: pos[i][1], w: 16, z: 3, props: { color: c } });
    if (id !== 'o3') reactions.push({ on: 'tap', target: id, cooldown: 400, do: [{ fx: 'shake' }, { fail: 'FB_SAME_AS_BEFORE' }] });
  });
  objs.push({ id: 'ctrl', type: 'marker', x: 50, y: 0, w: 1, passive: true,
    behaviors: { timer: { delay: 2600, times: 1, 'do': [
      { show: 'blackout' }, { state: 'o3', key: 'color', value: 'pink' }, { wait: 280 }, { hide: 'blackout' }, { state: 'ctrl', key: 'changed', value: true }
    ] } } });
  objs.push({ id: 'blackout', type: 'blackout', x: 50, y: 60, w: 110, h: 130, z: 950, hidden: true, passive: true });
  reactions.push({ on: 'tap', target: 'o3', unless: { type: 'state', target: 'ctrl', key: 'changed' }, do: [{ forget: 'o3' }, { fx: 'shake' }, { fail: 'FB_WAIT_WATCH' }] });
  RULES.registerLevel({
    id: 82, chapter: 9,
    instruction: 'LEVEL_082_TITLE',
    hints: ['LEVEL_082_HINT_1', 'LEVEL_082_HINT_2', 'LEVEL_082_HINT_3'],
    objects: objs,
    reactions: reactions,
    win: [{ type: 'state', target: 'ctrl', key: 'changed' }, { type: 'tapped', target: 'o3' }],
    onWin: [{ fx: 'pop', target: 'o3' }]
  });
})();
