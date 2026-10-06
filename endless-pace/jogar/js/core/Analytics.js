// Analytics — eventos internos prontos para integração futura (GDD §79).
//
// Todos os eventos do jogo ficam registrados em EP.Analytics.log (memória).
// No site xadrezcomz.github.io/play, alguns viram contagens anônimas do
// GoatCounter com o prefixo "ep/" (sem cookies, nada que identifique alguém).
// Fora do site (arquivo aberto direto, app) nada é enviado.
(function (EP) {
  'use strict';
  var MAX_LOG = 300;
  var log = [];
  var session = { started: false, flow: false, minutes: 0, mark: 0 };
  var MINUTES = [5, 15, 30];
  var queue = [];

  function send(name) {
    var gc = window.goatcounter;
    if (!gc) return;
    if (!gc.count) { queue.push(name); return; }
    try { gc.count({ path: 'ep/' + name, title: 'Endless Pace', event: true }); } catch (e) { /* sem contagem */ }
  }
  (function flush(n) {
    var gc = window.goatcounter;
    if (!gc || n > 30) return;
    if (gc.count && queue.length) { queue.splice(0).forEach(send); return; }
    setTimeout(function () { flush(n + 1); }, 1000);
  })(0);

  // nome interno (GDD) → evento do site
  var SITE = {
    run_started: function () { if (!session.started) { session.started = true; send('comecou'); } },
    character_created: function () { send('criou-corredor'); },
    tutorial_completed: function () { send('tutorial'); },
    distance_reached: function (p) { if ([1, 3, 5, 10, 21, 42].indexOf(p.km) >= 0) send('correu/' + p.km + '-km'); },
    flow_started: function () { if (!session.flow) { session.flow = true; send('flow'); } },
    challenge_started: function (p) { send('desafio/tentou/' + p.id + '-' + p.target); },
    challenge_completed: function (p) { send('desafio/venceu/' + p.id + '-' + p.target); },
    route_chosen: function (p) { send('caminho/' + p.route); },
    run_finished: function (p) {
      var km = p.distance / 1000;
      send('terminou/' + (km < 0.5 ? 'menos-de-500-m' : km < 1 ? '500-m' : km < 3 ? '1-km' : km < 5 ? '3-km' : km < 10 ? '5-km' : '10-km'));
    }
  };

  EP.Analytics = {
    log: log,
    // minutos correndo nesta visita (chamado pelo GameManager a cada segundo de corrida)
    runningSecond: function () {
      session.minutes += 1 / 60;
      if (session.mark < MINUTES.length && session.minutes >= MINUTES[session.mark]) send('tempo/' + MINUTES[session.mark++] + '-min');
    },
    // voltou em outro dia: a data fica só neste aparelho
    visit: function () {
      try {
        var k = 'endlesspace.visita', hoje = new Date().toISOString().slice(0, 10);
        var d = JSON.parse(localStorage.getItem(k) || 'null') || { primeiro: hoje, ultimo: hoje };
        if (d.ultimo !== hoje) {
          send('voltou');
          if (!d.semana && Date.parse(hoje) - Date.parse(d.primeiro) >= 7 * 864e5) { d.semana = 1; send('voltou-depois-de-7-dias'); }
          d.ultimo = hoje;
        }
        localStorage.setItem(k, JSON.stringify(d));
      } catch (e) { /* sem armazenamento */ }
    }
  };

  EP.events.on('*', function (payload, name) {
    if (name === 'flow_level' || name === 'coins' || name === 'tap') return;   // frequentes demais para o registro
    log.push({ t: Date.now(), name: name, data: payload });
    if (log.length > MAX_LOG) log.shift();
    if (SITE[name]) SITE[name](payload);
  });
})(window.EP);
