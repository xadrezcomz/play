// Contagem de visitas e jogadas pelo GoatCounter: sem cookies e sem dados
// pessoais (só a página, o país aproximado e de onde a pessoa veio).
// Cada página pode escolher o nome do que conta em window.CONTAGEM antes de
// carregar este arquivo (por exemplo, '/jogo/rock-orbit').
(function(){
  var CODIGO = 'xadrezcomz';
  var BASE = 'https://' + CODIGO + '.goatcounter.com';
  if (window.CONTAGEM) window.goatcounter = { path: window.CONTAGEM };
  var s = document.createElement('script');
  s.async = true;
  s.src = 'https://gc.zgo.at/count.js';
  s.setAttribute('data-goatcounter', BASE + '/count');
  document.head.appendChild(s);

  // números nos cartões: <span data-contagem="/jogo/rock-orbit" hidden><b></b> jogadas</span>
  // (só aparecem se a opção de mostrar contagens estiver ligada no GoatCounter)
  window.mostraContagens = function(){
    var els = document.querySelectorAll('[data-contagem]');
    Array.prototype.forEach.call(els, function(el){
      fetch(BASE + '/counter/' + encodeURIComponent(el.getAttribute('data-contagem')) + '.json')
        .then(function(r){ return r.ok ? r.json() : null; })
        .then(function(j){
          if (!j || !j.count) return;
          var n = parseInt(String(j.count).replace(/\D/g, ''), 10);
          if (!n) return;
          el.querySelector('b').textContent = n.toLocaleString(document.documentElement.lang || 'pt-BR');
          el.hidden = false;
        })
        .catch(function(){});
    });
  };
})();
