// TransitionManager: trocas rápidas (entre fases e entre telas).
// Nada aqui pode atrasar a próxima tentativa: as trocas duram ~0,3 s.
(function () {
  'use strict';
  var R = window.RULES, U = R.util;

  R.Transition = {
    // Esconde o elemento, executa mid() e mostra de novo.
    swap: function (el, mid, opts) {
      opts = opts || {};
      if (R.reduceMotion) { mid(); return Promise.resolve(); }
      var out = opts.out || 150, inn = opts['in'] || 200;
      el.classList.remove('tr-in');
      el.classList.add('tr-out');
      return U.wait(out).then(function () {
        mid();
        el.classList.remove('tr-out');
        el.classList.add('tr-in');
        return U.wait(inn);
      }).then(function () { el.classList.remove('tr-in'); });
    },

    // Mostra uma tela e esconde as outras.
    show: function (screens, name) {
      Object.keys(screens).forEach(function (k) {
        var s = screens[k], on = k === name;
        s.hidden = !on;
        s.classList.toggle('active', on);
      });
    },

    // Cartão de capítulo ("CAPÍTULO 2 — NÃO CONFIE NAS REGRAS").
    card: function (el, title, subtitle, ms) {
      el.querySelector('.card-k').textContent = title;
      el.querySelector('.card-t').textContent = subtitle;
      el.hidden = false;
      void el.offsetWidth;
      el.classList.add('show');
      return new Promise(function (res) {
        var done = false;
        function end() {
          if (done) return;
          done = true;
          el.classList.remove('show');
          el.removeEventListener('pointerdown', end);
          setTimeout(function () { el.hidden = true; }, 200);
          res();
        }
        el.addEventListener('pointerdown', end);
        setTimeout(end, R.reduceMotion ? 900 : ms || 1400);
      });
    }
  };
})();
