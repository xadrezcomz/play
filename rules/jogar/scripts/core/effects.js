// Efeitos leves: partículas num canvas (só desenha enquanto há partículas)
// e o "toquinho" visual de cada toque.
(function () {
  'use strict';
  var R = window.RULES, U = R.util;
  var COLORS = ['#FF6B6B', '#FFC94A', '#2EC4B6', '#4D96FF', '#9B7BFF', '#6BCB77'];

  R.Effects = {
    canvas: null, ctx: null, parts: [], running: false, dpr: 1, host: null,

    init: function (canvas, host) {
      this.canvas = canvas;
      this.host = host;
      this.ctx = canvas.getContext('2d');
      this.resize();
    },

    resize: function () {
      var r = this.host.getBoundingClientRect();
      this.dpr = Math.min(2, window.devicePixelRatio || 1);
      this.canvas.width = Math.round(r.width * this.dpr);
      this.canvas.height = Math.round(r.height * this.dpr);
      this.ox = r.left; this.oy = r.top;
    },

    // x, y em coordenadas da tela (clientX/clientY).
    burst: function (cx, cy, n) {
      if (R.reduceMotion) return;
      var r = this.host.getBoundingClientRect(), x = cx - r.left, y = cy - r.top;
      var scale = r.width / 400;
      for (var i = 0; i < (n || 34); i++) {
        var a = Math.random() * Math.PI * 2, v = (2.5 + Math.random() * 5.5) * scale;
        this.parts.push({
          x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 3 * scale,
          s: (4 + Math.random() * 6) * scale, c: U.pick(COLORS), rot: Math.random() * 6,
          vr: (Math.random() - 0.5) * 0.4, life: 1, kind: Math.random() < 0.5 ? 0 : 1, g: 0.22 * scale
        });
      }
      if (!this.running) { this.running = true; requestAnimationFrame(this.frame.bind(this)); }
    },

    frame: function () {
      var c = this.ctx, d = this.dpr;
      c.setTransform(d, 0, 0, d, 0, 0);
      c.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.parts = this.parts.filter(function (p) {
        p.x += p.vx; p.y += p.vy; p.vy += p.g; p.vx *= 0.985; p.rot += p.vr; p.life -= 0.016;
        if (p.life <= 0) return false;
        c.globalAlpha = Math.min(1, p.life * 2);
        c.fillStyle = p.c;
        c.save(); c.translate(p.x, p.y); c.rotate(p.rot);
        if (p.kind) c.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2);
        else { c.beginPath(); c.arc(0, 0, p.s / 2.4, 0, Math.PI * 2); c.fill(); }
        c.restore();
        return true;
      });
      c.globalAlpha = 1;
      if (this.parts.length) requestAnimationFrame(this.frame.bind(this));
      else { this.running = false; c.clearRect(0, 0, this.canvas.width, this.canvas.height); }
    },

    ripple: function (host, cx, cy) {
      var r = host.getBoundingClientRect();
      var d = U.el('span', 'ripple', host);
      d.style.left = cx - r.left + 'px';
      d.style.top = cy - r.top + 'px';
      setTimeout(function () { d.remove(); }, 450);
    }
  };
})();
