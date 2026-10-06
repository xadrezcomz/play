// Componentes reutilizáveis. Uma fase liga um comportamento num objeto pelos
// dados, por exemplo:  behaviors: { draggable: { axis: 'x' }, scalable: {} }
//
// Comportamentos só de capacidade (lidos pelo InteractionSystem):
//   draggable  { axis:'x'|'y', minX, maxX, minY, maxY, returnOnDrop }
//   scalable   { min, max, anchor:'bottom' }      → pinça / rodinha do mouse
//   holdable   { ms }                             → evento 'hold'
// Comportamentos ativos (escutam eventos do engine):
//   clickable  { toggle:'on', fx, sound }
//   container  { fit, fitRatio, slots:[[fx,fy]...], accepts:[ids], rejectSay }
//   door       { openDistance }                   → estado open = true
//   flee       { from:'id', radius, jump, margin } → foge quando "from" chega perto
//   fallsInto  { zones:['id'] }                   → cai e volta ao início
//   character  {}                                 → reações do Ruli ao ser arrastado
(function () {
  'use strict';
  var R = window.RULES, U = R.util;

  R.Behaviors = {
    draggable: {},
    scalable: {},
    holdable: {},

    clickable: {
      init: function (o, cfg, E) {
        E.on('tap', function (e) {
          if (e.obj !== o) return;
          if (cfg.toggle) o.setState(cfg.toggle, !o.state[cfg.toggle]);
          if (cfg.fx !== false) o.fx(cfg.fx || 'pop');
          R.Audio.play(cfg.sound || 'tap');
        });
      }
    },

    container: {
      init: function (box, cfg, E) {
        E.on('drop', function (e) {
          var o = e.obj;
          if (e.handled || o === box) return;
          if (cfg.accepts && cfg.accepts.indexOf(o.id) < 0) return;
          var c = o.center();
          if (!U.pointIn(c[0], c[1], box.rect())) return;
          e.handled = true;
          if (cfg.fit && !E.fits(o, box)) {
            o.moveTo(e.fromX, e.fromY, 340, 'cubic-bezier(.34,1.56,.64,1)');
            o.fx('wobble'); box.fx('shake');
            R.Audio.play('collision');
            E.emit('rejected', { obj: o, container: box });
            E.fail(cfg.rejectSay || 'FB_NOFIT');
            return;
          }
          var p = E.freeSlot(box, o);
          o.moveTo(p[0], p[1], 170);
          box.fx('squash');
          R.Audio.play('pop');
          E.emit('contained', { obj: o, container: box });
        });
      }
    },

    door: {
      init: function (o, cfg, E) {
        o.state.open = false;
        var upd = function (e) {
          if (e.obj !== o) return;
          var open = U.dist(o.x, o.y, o.x0, o.y0) >= (cfg.openDistance || o.w * 0.6);
          if (open !== !!o.state.open) {
            o.setState('open', open);
            if (open) R.Audio.play('click');
          }
        };
        E.on('dragmove', upd);
        E.on('drop', upd);
      }
    },

    flee: {
      init: function (o, cfg, E) {
        var until = 0, r = cfg.radius || 25;
        E.on('dragmove', function (e) {
          var f = e.obj;
          if (f.id !== cfg.from || U.now() < until) return;
          if (U.dist(f.x, f.y, o.x, o.y) >= r) return;
          until = U.now() + 60;
          var b = E.boardBounds(o, cfg.margin || 4);
          var a = Math.atan2(o.y - f.y, o.x - f.x), j = cfg.jump || r * 1.4;
          var nx = U.clamp(o.x + Math.cos(a) * j, b.x1, b.x2);
          var ny = U.clamp(o.y + Math.sin(a) * j, b.y1, b.y2);
          if (U.dist(nx, ny, f.x, f.y) < r) {
            // encurralado: pula para o ponto livre mais longe
            var best = null, bd = -1;
            [[b.x1, b.y1], [b.x2, b.y1], [b.x1, b.y2], [b.x2, b.y2], [50, b.y1], [50, b.y2], [b.x1, 60], [b.x2, 60]].forEach(function (p) {
              var d = U.dist(p[0], p[1], f.x, f.y);
              if (d > bd) { bd = d; best = p; }
            });
            nx = best[0]; ny = best[1];
          }
          o.moveTo(nx, ny, 260);
          o.fx('wiggle');
          R.Audio.play('whoosh');
          E.emit('flee', { obj: o, from: f });
        });
      }
    },

    fallsInto: {
      init: function (o, cfg, E) {
        E.on('dragmove', function (e) {
          if (e.obj !== o || o._falling) return;
          var c = o.center();
          var hit = (cfg.zones || []).some(function (id) {
            var z = E.get(id);
            return z && U.pointIn(c[0], c[1], z.rect());
          });
          if (!hit) return;
          E.input.cancel(o);
          E.fall(o);
        });
      }
    },

    character: {
      init: function (o, cfg, E) {
        E.on('dragstart', function (e) {
          if (e.obj !== o) return;
          o.setExpr('surprised');
          R.Audio.play('ruli');
        });
        E.on('drop', function (e) { if (e.obj === o) o.setExpr('normal'); });
        E.on('tap', function (e) {
          if (e.obj !== o) return;
          o.fx('hop');
          R.Audio.play('ruli');
        });
      }
    }
  };
})();
