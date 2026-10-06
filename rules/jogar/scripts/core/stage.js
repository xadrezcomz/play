// Stage: o sistema de coordenadas das fases.
// Toda fase é desenhada num "tabuleiro" lógico de 100 × 120 unidades, que é
// encaixado (sem cortar) na área central da tela. Assim a mesma fase funciona
// em qualquer proporção de celular, tablet ou PC.
(function () {
  'use strict';
  var R = window.RULES;

  R.Stage = {
    W: 100,
    H: 120,
    s: 1,       // pixels por unidade
    ox: 0,      // origem do tabuleiro dentro da camada de objetos (px)
    oy: 0,
    layer: null,
    area: null,
    layerRect: null,

    init: function (layer, area) { this.layer = layer; this.area = area; this.update(); },

    update: function () {
      var a = this.area.getBoundingClientRect(), l = this.layer.getBoundingClientRect();
      this.layerRect = l;
      this.s = Math.max(0.1, Math.min(a.width / this.W, a.height / this.H));
      this.ox = a.left - l.left + (a.width - this.W * this.s) / 2;
      this.oy = a.top - l.top + (a.height - this.H * this.s) / 2;
    },

    toPx: function (x, y) { return [this.ox + x * this.s, this.oy + y * this.s]; },

    fromClient: function (cx, cy) {
      var l = this.layerRect || this.layer.getBoundingClientRect();
      return [(cx - l.left - this.ox) / this.s, (cy - l.top - this.oy) / this.s];
    },

    // Limites da tela inteira em unidades do tabuleiro (para arrastar).
    screenBounds: function () {
      var l = this.layerRect || this.layer.getBoundingClientRect();
      return {
        x1: -this.ox / this.s, y1: -this.oy / this.s,
        x2: (l.width - this.ox) / this.s, y2: (l.height - this.oy) / this.s
      };
    },

    rectFromClient: function (r) {
      var a = this.fromClient(r.left, r.top), b = this.fromClient(r.right, r.bottom);
      return { x1: a[0], y1: a[1], x2: b[0], y2: b[1] };
    }
  };
})();
