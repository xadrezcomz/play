// Input — toque, deslize e teclado (GDD §67).
// TAP: passada (registrado na hora do dedo encostar, para o ritmo ser justo).
// SWIPE para os lados: movimento lateral e escolha do caminho. Se o toque
// virar deslize, o toque é desfeito (não quebra o ritmo).
(function (EP) {
  'use strict';
  var SWIPE_PX = 26, SWIPE_MS = 320;

  function stamp(e) {
    var t = e && e.timeStamp;
    // timeStamp do evento usa o mesmo relógio de performance.now() (mais preciso que a hora do processamento)
    if (!t || t > 1e11 || Math.abs(t - performance.now()) > 1000) t = performance.now();
    return t / 1000;
  }

  EP.Input = {
    touchSeen: false,
    // handlers: { tap(t), cancelTap(), swipe(dir), pause() , enabled() }
    init: function (layer, h) {
      var pointers = {};
      layer.addEventListener('pointerdown', function (e) {
        if (!h.enabled()) return;
        if (e.pointerType === 'touch') EP.Input.touchSeen = true;
        if (e.button > 0) return;
        e.preventDefault();
        pointers[e.pointerId] = { x: e.clientX, y: e.clientY, t: performance.now(), swiped: false };
        h.tap(stamp(e));
      });
      layer.addEventListener('pointermove', function (e) {
        var p = pointers[e.pointerId];
        if (!p || p.swiped) return;
        var dx = e.clientX - p.x, dy = e.clientY - p.y;
        if (Math.abs(dx) > SWIPE_PX && Math.abs(dx) > Math.abs(dy) * 1.2) {
          p.swiped = true;
          if (performance.now() - p.t < SWIPE_MS) h.cancelTap();
          h.swipe(dx < 0 ? -1 : 1);
        }
      });
      var end = function (e) { delete pointers[e.pointerId]; };
      layer.addEventListener('pointerup', end);
      layer.addEventListener('pointercancel', end);
      layer.addEventListener('contextmenu', function (e) { e.preventDefault(); });

      window.addEventListener('keydown', function (e) {
        if (e.target && e.target.tagName === 'INPUT') return;
        var k = e.key;
        if (k === 'Escape' || k === 'p' || k === 'P') { h.pause(); return; }
        if (!h.enabled()) return;
        if (k === 'ArrowLeft' || k === 'a' || k === 'A') { e.preventDefault(); if (!e.repeat) h.swipe(-1); return; }
        if (k === 'ArrowRight' || k === 'd' || k === 'D') { e.preventDefault(); if (!e.repeat) h.swipe(1); return; }
        if (k === ' ' || k === 'Enter' || k === 'ArrowUp' || k === 'w' || k === 'W' || k === 'j' || k === 'k' || k === 'f') {
          e.preventDefault();
          if (!e.repeat) h.tap(stamp(e));
        }
      });
    }
  };
})(window.EP);
