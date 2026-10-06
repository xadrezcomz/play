// Analytics preparado. Eventos internos (nomes do documento de design):
//   level_started, level_completed, level_attempt, hint_used,
//   level_abandoned, chapter_completed
// Hoje eles vão para o GoatCounter do site (anônimo, sem cookies) com o
// prefixo "ru/". Para outro serviço, troque só o adaptador SEND.
(function () {
  'use strict';
  var R = window.RULES;
  var pad = function (n) { return R.util.pad(n, 2); };

  var PATHS = {
    game_opened: function () { return 'ru/comecou'; },
    level_started: function (d) { return 'ru/comecou/fase-' + pad(d.level); },
    level_attempt: function (d) { return 'ru/tentou/fase-' + pad(d.level); },
    level_completed: function (d) { return 'ru/venceu/fase-' + pad(d.level); },
    hint_used: function (d) { return 'ru/dica/fase-' + pad(d.level) + '-' + d.tier; },
    level_abandoned: function (d) { return 'ru/abandonou/fase-' + pad(d.level); },
    chapter_completed: function (d) { return 'ru/capitulo/' + d.chapter; }
  };

  function SEND(name, data) {
    var gc = window.goatcounter;
    if (!gc || typeof gc.count !== 'function' || !/^https?:/.test(location.protocol)) return;
    var path = PATHS[name] && PATHS[name](data || {});
    if (!path) return;
    try { gc.count({ path: path, title: name, event: true }); } catch (e) { /* ignora */ }
  }

  R.Analytics = {
    log: [],
    track: function (name, data) {
      var entry = { name: name, data: data || {}, t: Date.now() };
      this.log.push(entry);
      if (this.log.length > 200) this.log.shift();
      SEND(name, data);
      try { window.dispatchEvent(new CustomEvent('rules:analytics', { detail: entry })); } catch (e) { /* ignora */ }
    }
  };
})();
