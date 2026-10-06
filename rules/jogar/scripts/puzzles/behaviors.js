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
//   mirror     { from:'id', key }                 → copia um estado de outro objeto (lâmpada ↔ interruptor)
//   group      { members:[ids], key, max, tieMs } → no máximo N ligados; ligados juntos "empatam"
//   pourer     { target:'id', range, rate }       → segurado em cima do alvo, despeja e enche (fill → full)
//   gravity    { delay, g, solids:[ids] }         → cai; pousa em cima de "solids"; se cair da tela, volta
//   snap       { to:[ids], tol, fitScale }        → solto perto de um lugar, encaixa (state.at = id)
//   receives   { from:[ids], set:{...}, consume } → outro objeto solto em cima dele aplica estados (ferramenta)
//   rubbable   { count, decayMs, progress, set }  → esfregar (ou passar algo por cima) várias vezes
//   carries    { ids:[...] }                      → ao ser arrastado, leva esses objetos junto
//   stackPress { key }                            → tocar num objeto empilhado aciona também os de baixo
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

    mirror: {
      init: function (o, cfg, E) {
        var src = E.get(cfg.from), key = cfg.key || 'on';
        if (src) o.state[key] = !!src.state[key];
        E.on('state', function (e) {
          if (e.obj.id === cfg.from && e.key === key) o.setState(key, e.value);
        });
      }
    },

    // Fica num objeto "controlador" invisível. Se mais de `max` membros ficam
    // ligados, o mais antigo desliga, a não ser que os dois mais antigos tenham
    // sido ligados ao mesmo tempo (empate: ninguém sabe quem desligar).
    group: {
      init: function (o, cfg, E) {
        var key = cfg.key || 'on', t = {}, max = cfg.max || 2, tie = cfg.tieMs || 400;
        E.on('state', function (e) {
          if (cfg.members.indexOf(e.obj.id) < 0 || e.key !== key) return;
          if (!e.value) { delete t[e.obj.id]; return; }
          t[e.obj.id] = U.now();
          var on = cfg.members.filter(function (id) { return E.get(id).state[key]; });
          if (on.length <= max) return;
          var old = on.filter(function (id) { return id !== e.obj.id; })
            .sort(function (a, b) { return t[a] - t[b]; });
          if (old.length >= 2 && Math.abs(t[old[1]] - t[old[0]]) <= tie) { E.emit('tie', { obj: o }); return; }
          var victim = E.get(old[0]);
          victim.setState(key, false);
          victim.fx('shake');
          R.Audio.play('click');
          E.emit('replaced', { obj: victim });
        });
      }
    },

    pourer: {
      init: function (o, cfg, E) {
        var timer = null, range = cfg.range || 18, rate = cfg.rate || 0.4;
        function over() {
          var c = E.get(cfg.target);
          if (!c) return false;
          var dy = c.y - o.y;
          return Math.abs(o.x - c.x) < range && dy > c.sh * 0.4 && dy < c.sh * 0.5 + 40;
        }
        function stop() {
          clearInterval(timer); timer = null;
          if (o.rot) { o.rot = 0; o.setState('pouring', false); o.layout(); }
        }
        E.on('dragmove', function (e) {
          if (e.obj !== o) return;
          if (!over()) { stop(); return; }
          if (timer) return;
          o.rot = cfg.tilt || -55; o.setState('pouring', true); o.layout();
          R.Audio.play('whoosh');
          timer = setInterval(function () {
            var c = E.get(cfg.target);
            if (!c || !o.el.classList.contains('dragging')) { stop(); return; }
            var f = Math.min(1, (c.state.fill || 0) + rate * 0.05);
            c.setState('fill', f);
            if (f >= 1 && !c.state.full) { c.setState('full', true); c.fx('pop'); R.Audio.play('pop'); stop(); }
          }, 50);
        });
        E.on('drop', function (e) { if (e.obj === o) stop(); });
      }
    },

    gravity: {
      init: function (o, cfg, E) {
        var tok = E.token, vy = 0, g = cfg.g || 0.016, floor = cfg.floor || R.Stage.H + 15;
        var waitUntil = U.now() + (cfg.delay || 2000);
        o.state.landed = false;
        o.fx('wiggle');
        function support() {
          var best = null;
          (cfg.solids || []).forEach(function (id) {
            var s = E.get(id);
            if (!s) return;
            var r = s.rect();
            if (o.x >= r.x1 - 1 && o.x <= r.x2 + 1) best = r;
          });
          return best;
        }
        function frame() {
          if (E.token !== tok) return;
          requestAnimationFrame(frame);
          if (E.paused || E.completed || U.now() < waitUntil) return;
          var bottom = o.y + o.sh / 2, r = support();
          if (o.state.landed) {
            if (r && Math.abs(bottom - r.y1) < 3) { o.y = r.y1 - o.sh / 2; o.layout(); return; }
            o.setState('landed', false);
          }
          vy += g;
          var nb = bottom + vy;
          if (r && bottom <= r.y1 + 0.5 && nb >= r.y1) {
            o.y = r.y1 - o.sh / 2; vy = 0;
            o.setState('landed', true);
            o.fx('squash');
            R.Audio.play('drop');
            o.layout();
            return;
          }
          o.y += vy;
          o.layout();
          if (o.y - o.sh / 2 > floor) {
            vy = 0; o.x = o.x0; o.y = o.y0; o.layout(); o.fx('pop');
            waitUntil = U.now() + (cfg.delay || 2000);
            E.emit('fell', { obj: o });
          }
        }
        requestAnimationFrame(frame);
      }
    },

    snap: {
      init: function (o, cfg, E) {
        var tol = cfg.tol || 9;
        o.state.at = null;
        E.on('drop', function (e) {
          if (e.obj !== o) return;
          var best = null, bd = tol;
          (cfg.to || []).forEach(function (id) {
            var t = E.get(id);
            if (!t) return;
            var d = U.dist(o.x, o.y, t.x, t.y);
            if (d < bd) { bd = d; best = t; }
          });
          if (!best) {
            if (o.state.at) { o.setState('at', null); if (cfg.fitScale) o.animate(function () { o.scale = o.scale0; o.layout(); }, 150); }
            return;
          }
          e.handled = true;
          E.objects.forEach(function (x) {
            if (x !== o && x.state && x.state.at === best.id) {
              x.setState('at', null);
              x.scale = x.scale0;
              x.moveTo(x.x0, x.y0, 260);
            }
          });
          o.rot = 0;
          if (cfg.fitScale) o.scale = Math.min(o.scale0, (best.w * cfg.fitScale) / o.w);
          o.moveTo(best.x, best.y, 150);
          o.setState('at', best.id);
          R.Audio.play('pop');
          E.emit('snapped', { obj: o, slot: best });
        });
      }
    },

    receives: {
      init: function (o, cfg, E) {
        E.on('drop', function (e) {
          var t = e.obj;
          if (e.handled || t === o || (cfg.from || []).indexOf(t.id) < 0) return;
          if (!U.overlap(t.rect(), o.rect())) return;
          e.handled = true;
          Object.keys(cfg.set || {}).forEach(function (k) { o.setState(k, cfg.set[k]); });
          if (cfg.consume) {
            t.moveTo(o.x, o.y, 160).then(function () { t.setHidden(true); });
          }
          o.fx('pop');
          R.Audio.play('pop');
          E.emit('used', { obj: o, tool: t });
        });
      }
    },

    rubbable: {
      init: function (o, cfg, E) {
        var n = 0, last = 0, done = false, need = cfg.count || 10;
        var tools = {}; // objetos arrastados por cima: última direção de cada eixo
        function bump() {
          if (done) return;
          var now = U.now();
          if (cfg.decayMs && now - last > cfg.decayMs) n = 0;
          last = now;
          n++;
          if (cfg.progress) o.setState(cfg.progress, Math.min(1, n / need));
          if (n % 3 === 0) { o.fx('wiggle'); R.Audio.play('scale', n / need); }
          E.emit('rubbing', { obj: o, count: n });
          if (n >= need) {
            done = true;
            Object.keys(cfg.set || {}).forEach(function (k) { o.setState(k, cfg.set[k]); });
            o.fx('pop');
            R.Audio.play('pop');
            E.emit('rubbed', { obj: o });
          }
        }
        E.on('rub', function (e) { if (e.obj === o) bump(); });
        E.on('dragmove', function (e) {
          var t = e.obj;
          if (t === o || !U.overlap(t.rect(), o.rect())) { delete tools[t.id]; return; }
          var m = tools[t.id] || (tools[t.id] = { x: t.x, y: t.y, dx: 0, dy: 0 });
          [['x', 'dx'], ['y', 'dy']].forEach(function (k) {
            var d = t[k[0]] - m[k[0]];
            if (Math.abs(d) < 0.6) return;
            var dir = d > 0 ? 1 : -1;
            if (m[k[1]] && dir !== m[k[1]]) bump();
            m[k[1]] = dir; m[k[0]] = t[k[0]];
          });
        });
      }
    },

    // Objetos empilhados (um em cima do outro) são apertados juntos.
    stackPress: {
      init: function (o, cfg, E) {
        var key = cfg.key || 'on';
        E.on('tap', function (e) {
          if (e.obj !== o) return;
          E.objects.forEach(function (x) {
            if (x === o || !x.has('stackPress')) return;
            if (U.dist(x.x, x.y, o.x, o.y) > Math.min(o.sw, x.sw) * 0.7) return;
            x.setState(key, !x.state[key]);
            x.fx('squash');
          });
        });
      }
    },

    carries: {
      init: function (o, cfg, E) {
        var lx = o.x, ly = o.y;
        E.on('dragstart', function (e) { if (e.obj === o) { lx = o.x; ly = o.y; } });
        E.on('dragmove', function (e) {
          if (e.obj !== o) return;
          var dx = o.x - lx, dy = o.y - ly;
          lx = o.x; ly = o.y;
          (cfg.ids || []).forEach(function (id) {
            var c = E.get(id);
            if (c) { c.x += dx; c.y += dy; c.layout(); }
          });
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
