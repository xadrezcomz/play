// Componentes reutilizáveis. Uma fase liga um comportamento num objeto pelos
// dados, por exemplo:  behaviors: { draggable: { axis: 'x' }, scalable: {} }
//
// Comportamentos só de capacidade (lidos pelo InteractionSystem):
//   draggable  { axis:'x'|'y', minX, maxX, minY, maxY, returnOnDrop }
//   scalable   { min, max, anchor:'bottom' }      → pinça / rodinha do mouse
//   holdable   { ms }                             → evento 'hold'
//   rotatable  { snap }                           → girar com o dedo (state.angle, state.turns)
// Comportamentos ativos (escutam eventos do engine):
//   clickable  { toggle:'on', fx, sound }
//   container  { fit, fitRatio, slots:[[fx,fy]...], accepts:[ids], rejectSay }
//   door       { openDistance }                   → estado open = true
//   flee       { from:'id', radius, jump, margin } → foge quando "from" chega perto
//   fallsInto  { zones:['id'], safe:['ponte'] }   → cai e volta ao início (a não ser que uma ponte cubra)
//   character  {}                                 → reações do Ruli ao ser arrastado
//   mirror     { from:'id', key }                 → copia um estado de outro objeto (lâmpada ↔ interruptor)
//   group      { members:[ids], key, max, tieMs } → no máximo N ligados; ligados juntos "empatam"
//   pourer     { target:'id', range, rate }       → segurado em cima do alvo, despeja e enche (fill → full)
//   gravity    { delay, g, solids:[ids] }         → cai; pousa em cima de "solids"; se cair da tela, volta
//   snap       { to:[ids], tol, fitScale }        → solto perto de um lugar, encaixa (state.at = id)
//   receives   { from:[ids], set, consume, requires, copyColor, returnTool, failSay } → ferramenta solta em cima
//   rubbable   { count, decayMs, progress, set }  → esfregar (ou passar algo por cima) várias vezes
//   carries    { ids:[...] }                      → ao ser arrastado, leva esses objetos junto
//   stackPress { key }                            → tocar num objeto empilhado aciona também os de baixo
//   merge      { with:[ids], into:'id', sameSize } → solto em cima de outro, os dois viram um terceiro
//   splitOnStretch { spawn:'id', at }             → esticado com a pinça, vira dois
//   floats     { speed, ceil, needs }             → sobe sozinho (balão); needs: estado que liga
//   magnet     { targets:[ids], radius }          → puxa os alvos que chegarem perto
//   tank       { stones:[ids], per, floaters:[ids], top } → pedras sobem a água; o que flutua sobe junto
//   melts      { heat:'id', shade:[ids], rate, safeMs } → derrete ao sol, a não ser que algo faça sombra
//   mirrorOf   { source:'id', axis }              → repete o movimento de outro, espelhado
//   spotlight  { target:'id', radius }            → lanterna: ilumina o escuro em volta
//   timer      { every, do:[ações], times, delay } → repete ações sozinho
//   order      { seq:[ids] }                      → tocar na ordem certa (state.done)
//   simon      { seq:[ids], show }                → mostra uma sequência e espera a repetição
//   drawZone   { from:'id', to:'id', spawn:'id', tol } → um traço de A até B faz aparecer algo
//   connect    { dots:[ids], spawn:'id', tol }    → um traço que passa pelos pontos em ordem
//   balance    { left:'id', right:'id', ids:[...] } → a barra inclina conforme o peso de cada prato
(function () {
  'use strict';
  var R = window.RULES, U = R.util;

  R.Behaviors = {
    draggable: {},
    scalable: {},
    holdable: {},
    rotatable: {},

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
          // uma ponte que cobre o buraco inteiro deixa passar
          var safe = (cfg.safe || []).some(function (id) {
            var b = E.get(id);
            if (!b || b.hidden) return false;
            var rb = b.rect(), z = E.get(cfg.zones[0]).rect();
            return rb.x1 <= z.x1 + 1 && rb.x2 >= z.x2 - 1 && Math.abs(rb.y1 - (o.y + o.sh / 2)) < 8;
          });
          if (safe) return;
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
        var waitUntil = U.now() + (cfg.delay || 0);
        o.state.landed = false;
        if (cfg.delay) o.fx('wiggle');
        // a superfície mais alta logo abaixo do objeto
        function support(bottom) {
          var best = null;
          (cfg.solids || []).forEach(function (id) {
            var s = E.get(id);
            if (!s || s === o || s.hidden) return;
            var r = s.rect();
            if (o.x < r.x1 - 1 || o.x > r.x2 + 1 || r.y1 < bottom - 3) return;
            if (!best || r.y1 < best.y1) best = r;
          });
          return best;
        }
        function frame() {
          if (E.token !== tok) return;
          requestAnimationFrame(frame);
          if (E.paused || E.completed || U.now() < waitUntil || o.hidden) return;
          if (o.el.classList.contains('dragging') || o.state.floating) { vy = 0; if (o.state.landed) o.setState('landed', false); return; }
          var bottom = o.y + o.sh / 2, r = support(bottom);
          if (o.state.landed) {
            if (r && Math.abs(bottom - r.y1) < 3) { if (bottom !== r.y1) { o.y = r.y1 - o.sh / 2; o.layout(); } return; }
            o.setState('landed', false);
          }
          vy = Math.min(vy + g, 3);
          var nb = bottom + vy;
          if (r && nb >= r.y1) {
            o.y = r.y1 - o.sh / 2; vy = 0;
            o.setState('landed', true);
            o.fx('squash');
            R.Audio.play('drop');
            o.layout();
            E.emit('landed', { obj: o });
            return;
          }
          o.y += vy;
          o.layout();
          if (o.y - o.sh / 2 > floor) {
            vy = 0; o.x = o.x0; o.y = o.y0; o.layout(); o.fx('pop');
            waitUntil = U.now() + (cfg.delay || 0);
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
          var req = cfg.requires;
          if (req && !Object.keys(req).every(function (k) { return o.state[k] === req[k]; })) {
            t.moveTo(e.fromX, e.fromY, 300, 'cubic-bezier(.34,1.56,.64,1)');
            o.fx('shake'); R.Audio.play('collision');
            E.fail(cfg.failSay);
            E.emit('refused', { obj: o, tool: t });
            return;
          }
          Object.keys(cfg.set || {}).forEach(function (k) { o.setState(k, cfg.set[k]); });
          if (cfg.copyColor) o.setState('color', (t.def.props || {}).color || t.state.color);
          if (cfg.consume) {
            t.moveTo(o.x, o.y, 160).then(function () { t.setHidden(true); });
          } else if (cfg.returnTool) t.moveTo(t.x0, t.y0, 260);
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
          if (e.obj !== o || cfg.onlySwap) return;
          var dx = o.x - lx, dy = o.y - ly;
          lx = o.x; ly = o.y;
          (cfg.ids || []).forEach(function (id) {
            var c = E.get(id);
            if (c) { c.x += dx; c.y += dy; c.layout(); }
          });
        });
      }
    },

    merge: {
      init: function (o, cfg, E) {
        E.on('drop', function (e) {
          if (e.obj !== o || e.handled) return;
          var t = (cfg['with'] || []).map(function (id) { return E.get(id); }).filter(function (x) {
            return x && !x.hidden && U.overlap(x.rect(), o.rect());
          })[0];
          if (!t) return;
          e.handled = true;
          if (cfg.sameSize && Math.abs(o.sw - t.sw) > t.sw * (cfg.tol || 0.18)) {
            o.moveTo(e.fromX, e.fromY, 300, 'cubic-bezier(.34,1.56,.64,1)');
            o.fx('wobble'); t.fx('wobble');
            R.Audio.play('collision');
            E.fail(cfg.failSay || 'FB_NOT_SAME');
            return;
          }
          var into = E.get(cfg.into);
          o.moveTo(t.x, t.y, 140).then(function () {
            o.setHidden(true); t.setHidden(true);
            if (into) {
              into.x = t.x; into.y = t.y;
              if (cfg.keepScale) into.scale = t.scale;
              into.z = ++E.zTop; into.layout();
              into.setHidden(false); into.fx('pop');
              into.setState('made', true);
            }
            R.Audio.play('pop');
            E.emit('merged', { obj: o, other: t, into: into });
            E.check();
          });
        });
      }
    },

    splitOnStretch: {
      init: function (o, cfg, E) {
        var done = false;
        E.on('scale', function (e) {
          if (e.obj !== o || done || o.scale < (cfg.at || 1.5) * o.scale0) return;
          done = true;
          E.input.reset();
          E.setScale(o, o.scale0);
          var sp = E.get(cfg.spawn);
          if (sp) {
            sp.x = o.x; sp.y = o.y; sp.layout(); sp.setHidden(false);
            sp.moveTo(o.x + o.sw * 0.9, o.y, 220);
          }
          o.fx('squash');
          R.Audio.play('pop');
          E.emit('split', { obj: o, spawn: sp });
        });
      }
    },

    floats: {
      init: function (o, cfg, E) {
        var tok = E.token, sp = cfg.speed || 0.12, ceil = cfg.ceil != null ? cfg.ceil : -20;
        function frame() {
          if (E.token !== tok) return;
          requestAnimationFrame(frame);
          if (E.paused || E.completed || o.hidden || o.el.classList.contains('dragging')) return;
          if (cfg.needs && !o.state[cfg.needs]) return;
          if (o.state.tied) return;
          o.state.floating = true;
          if (o.y - o.sh / 2 > ceil) { o.y -= sp; o.layout(); }
          else if (cfg.escape) {
            o.x = o.x0; o.y = o.y0; o.layout(); o.fx('pop');
            E.emit('escaped', { obj: o });
          }
          E.emit('floatmove', { obj: o });
        }
        requestAnimationFrame(frame);
      }
    },

    magnet: {
      init: function (o, cfg, E) {
        var r = cfg.radius || 22, stuck = [];
        function pull() {
          (cfg.targets || []).forEach(function (id, i) {
            var t = E.get(id);
            if (!t || t.state.stuck) return;
            if (U.dist(t.x, t.y, o.x, o.y) > r) return;
            t.setState('stuck', true);
            stuck.push(t);
            t.z = o.z - 1;
            t.moveTo(o.x, o.y + o.sh * 0.45, 220);
            R.Audio.play('click');
            E.emit('attracted', { obj: t, magnet: o });
          });
          stuck.forEach(function (t) { if (!t._tt) { t.x = o.x; t.y = o.y + o.sh * 0.45; t.layout(); } });
        }
        E.on('dragmove', function (e) { if (e.obj === o) pull(); });
        E.on('drop', function (e) { if (e.obj === o) pull(); });
      }
    },

    tank: {
      init: function (o, cfg, E) {
        var n = 0, per = cfg.per || 0.25;
        o.state.level = o.state.level || 0.25;
        function surface() {
          var r = o.rect();
          return r.y2 - (r.y2 - r.y1) * 0.92 * o.state.level;
        }
        function place() {
          (cfg.floaters || []).forEach(function (id) {
            var f = E.get(id);
            if (!f) return;
            f.moveTo(f.x, surface() - f.sh * 0.35, 400);
            if (o.state.level >= (cfg.top || 0.95)) f.setState('reachable', true);
          });
        }
        E.on('drop', function (e) {
          var t = e.obj;
          if (e.handled || (cfg.stones || []).indexOf(t.id) < 0 || !U.overlap(t.rect(), o.rect())) return;
          e.handled = true;
          var r = o.rect();
          n++;
          t.moveTo(o.x + ((n % 3) - 1) * o.sw * 0.25, r.y2 - t.sh / 2 - Math.floor((n - 1) / 3) * t.sh * 0.8, 260);
          t.behaviors.draggable = null;
          t.el.classList.remove('is-draggable');
          o.setState('level', Math.min(1, o.state.level + per));
          R.Audio.play('drop');
          place();
          E.emit('raised', { obj: o });
        });
        setTimeout(place, 30);
      }
    },

    melts: {
      init: function (o, cfg, E) {
        var tok = E.token, safe = 0, last = U.now();
        o.state.melt = 0;
        var iv = setInterval(function () {
          if (E.token !== tok) { clearInterval(iv); return; }
          var now = U.now(), dt = now - last;
          last = now;
          if (E.paused || E.completed) return;
          var sun = E.get(cfg.heat);
          var shaded = (cfg.shade || []).some(function (id) {
            var s = E.get(id);
            if (!s || s.hidden) return false;
            return (sun && U.overlap(s.rect(), sun.rect())) || U.overlap(s.rect(), { x1: o.x - o.sw * 0.4, y1: o.y - o.sh * 1.4, x2: o.x + o.sw * 0.4, y2: o.y - o.sh * 0.3 });
          });
          if (shaded) {
            safe += dt;
            if (safe >= (cfg.safeMs || 3000) && !o.state.safe) { o.setState('safe', true); E.emit('saved', { obj: o }); E.check(); }
            return;
          }
          safe = 0;
          if (o.state.safe) return;
          var m = Math.min(1, o.state.melt + (cfg.rate || 0.12) * dt / 1000);
          o.setState('melt', Math.round(m * 20) / 20);
          if (m >= 1) {
            o.setState('melt', 0);
            o.fx('pop');
            E.emit('melted', { obj: o });
          }
        }, 100);
      }
    },

    mirrorOf: {
      init: function (o, cfg, E) {
        var ax = cfg.axis != null ? cfg.axis : 50;
        function follow(e) {
          if (e.obj.id !== cfg.source) return;
          o.x = 2 * ax - e.obj.x; o.y = e.obj.y; o.layout();
        }
        E.on('dragmove', follow);
        E.on('drop', follow);
      }
    },

    spotlight: {
      init: function (o, cfg, E) {
        function upd() {
          var d = E.get(cfg.target);
          if (!d) return;
          var r = d.rect();
          d.inner.style.setProperty('--lx', ((o.x - r.x1) / (r.x2 - r.x1) * 100).toFixed(1) + '%');
          d.inner.style.setProperty('--ly', ((o.y - o.sh * 0.6 - r.y1) / (r.y2 - r.y1) * 100).toFixed(1) + '%');
          d.inner.style.setProperty('--lr', (cfg.radius || 16) / (r.x2 - r.x1) * 100 + '%');
        }
        E.on('dragmove', function (e) { if (e.obj === o) upd(); });
        E.on('drop', function (e) { if (e.obj === o) upd(); });
        setTimeout(upd, 20);
      }
    },

    timer: {
      init: function (o, cfg, E) {
        var tok = E.token, n = 0;
        function tick() {
          if (E.token !== tok || E.completed) return;
          if (cfg.times && n >= cfg.times) return;
          if (E.paused) { setTimeout(tick, 300); return; }
          n++;
          E.run(cfg['do']).then(function () { setTimeout(tick, cfg.every || 2000); });
        }
        setTimeout(tick, cfg.delay != null ? cfg.delay : (cfg.every || 2000));
      }
    },

    order: {
      init: function (o, cfg, E) {
        var i = 0;
        E.on('tap', function (e) {
          if (!e.obj || o.state.done || cfg.seq.indexOf(e.obj.id) < 0) return;
          if (e.obj.id === cfg.seq[i]) {
            i++;
            e.obj.fx('pop');
            R.Audio.play('scale', i / cfg.seq.length);
            if (i >= cfg.seq.length) { o.setState('done', true); E.emit('ordered', { obj: o }); }
          } else {
            i = 0;
            e.obj.fx('shake');
            E.fail(cfg.failSay || 'FB_ORDER');
            E.emit('orderreset', { obj: o });
          }
        });
      }
    },

    simon: {
      init: function (o, cfg, E) {
        var tok = E.token, i = 0, showing = false, show = cfg.show || 520;
        function play() {
          showing = true; i = 0;
          var seq = cfg.seq.slice();
          (function next(k) {
            if (E.token !== tok) return;
            if (k >= seq.length) { showing = false; return; }
            var x = E.get(seq[k]);
            setTimeout(function () {
              if (E.token !== tok) return;
              x.setState('on', true); R.Audio.play('scale', k / seq.length);
              setTimeout(function () { x.setState('on', false); next(k + 1); }, show);
            }, 220);
          })(0);
        }
        E.on('tap', function (e) {
          if (!e.obj || o.state.done || cfg.seq.indexOf(e.obj.id) < 0) return;
          if (showing) return;
          var x = e.obj;
          x.setState('on', true);
          setTimeout(function () { x.setState('on', false); }, 180);
          if (x.id === cfg.seq[i]) {
            i++;
            if (i >= cfg.seq.length) { o.setState('done', true); E.emit('repeated', { obj: o }); }
          } else {
            E.fail('FB_AGAIN_WATCH');
            setTimeout(play, 900);
          }
        });
        E.on('replay', play);
        setTimeout(play, cfg.delay || 900);
      }
    },

    drawZone: {
      init: function (o, cfg, E) {
        var tol = cfg.tol || 12;
        E.on('drawn', function (e) {
          var a = E.get(cfg.from), b = E.get(cfg.to), pts = e.points;
          if (!a || !b || pts.length < 4) return;
          var p0 = pts[0], p1 = pts[pts.length - 1];
          var near = function (p, x) { return U.dist(p[0], p[1], x.x, x.y) < tol; };
          if (!((near(p0, a) && near(p1, b)) || (near(p0, b) && near(p1, a)))) { E.fail(cfg.failSay); return; }
          e.handled = true;
          var sp = E.get(cfg.spawn);
          if (sp) { sp.setHidden(false); sp.fx('pop'); }
          R.Audio.play('pop');
          o.setState('done', true);
          E.emit('bridged', { obj: o });
        });
      }
    },

    connect: {
      init: function (o, cfg, E) {
        var tol = cfg.tol || 9;
        E.on('drawn', function (e) {
          var k = 0, pts = e.points;
          pts.forEach(function (p) {
            var d = E.get(cfg.dots[k]);
            if (d && U.dist(p[0], p[1], d.x, d.y) < tol) { k++; d.fx('pop'); }
          });
          if (k < cfg.dots.length) { E.fail(cfg.failSay); return; }
          e.handled = true;
          var sp = E.get(cfg.spawn);
          if (sp) { sp.setHidden(false); sp.fx('pop'); }
          R.Audio.play('pop');
          o.setState('done', true);
          E.emit('connected', { obj: o });
        });
      }
    },

    balance: {
      init: function (o, cfg, E) {
        var L = E.get(cfg.left), Rr = E.get(cfg.right);
        var baseL = L.y, baseR = Rr.y;
        function weight(pan) {
          var sum = 0;
          cfg.ids.forEach(function (id) {
            var x = E.get(id);
            if (x && !x.hidden && E.isInside(x, pan)) sum += (x.def.props && x.def.props.weight != null) ? x.def.props.weight : 1;
          });
          return sum;
        }
        function upd() {
          var d = weight(L) - weight(Rr), t = U.clamp(d * 5, -16, 16);
          o.rot = -t; o.animate(function () { o.layout(); }, 300);
          var dy = t * 0.35;
          [[L, baseL + dy], [Rr, baseR - dy]].forEach(function (m) {
            var pan = m[0], ny = m[1], diff = ny - pan.y;
            cfg.ids.forEach(function (id) {
              var x = E.get(id);
              if (x && !x.hidden && E.isInside(x, pan) && !x.el.classList.contains('dragging')) x.moveTo(x.x, x.y + diff, 300);
            });
            pan.moveTo(pan.x, ny, 300);
          });
          o.setState('balanced', d === 0);
          o.setState('diff', d);
        }
        E.on('drop', function () { setTimeout(upd, 180); });
        E.on('dragstart', function () { setTimeout(upd, 0); });
        setTimeout(upd, 50);
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
