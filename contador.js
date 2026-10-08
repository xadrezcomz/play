// Contagem de visitas e jogadas pelo GoatCounter: sem cookies e sem dados
// pessoais (só a página, o país aproximado e de onde a pessoa veio).
// Cada página pode escolher o nome do que conta em window.CONTAGEM antes de
// carregar este arquivo (por exemplo, '/jogo/rock-orbit').
(function(){
  var CODIGO = 'xadrezcomz';
  var BASE = 'https://' + CODIGO + '.goatcounter.com';
  if (window.CONTAGEM) window.goatcounter = { path: window.CONTAGEM };

  // "Continue jogando" da página inicial: guarda só no aparelho qual jogo foi
  // aberto por último (nada disso é enviado)
  if (/^\/jogo\//.test(window.CONTAGEM || '')) {
    try { localStorage.setItem('xz.ultimoJogo', JSON.stringify({ jogo: window.CONTAGEM, em: Date.now() })); } catch (e) {}
  }
  var s = document.createElement('script');
  s.async = true;
  s.src = 'https://gc.zgo.at/count.js';
  s.setAttribute('data-goatcounter', BASE + '/count');
  document.head.appendChild(s);

  // números nos cartões: <span data-contagem="/jogo/rock-orbit" hidden><b></b> jogadas</span>
  // (só aparecem se a opção de mostrar contagens estiver ligada no GoatCounter).
  // Se receber uma função, chama no fim com { '/jogo/rock-orbit': 123, ... }.
  window.mostraContagens = function(fim){
    var els = document.querySelectorAll('[data-contagem]'), numeros = {};
    var pedidos = Array.prototype.map.call(els, function(el){
      var caminho = el.getAttribute('data-contagem');
      return fetch(BASE + '/counter/' + encodeURIComponent(caminho) + '.json')
        .then(function(r){ return r.ok ? r.json() : null; })
        .then(function(j){
          if (!j || !j.count) return;
          var n = parseInt(String(j.count).replace(/\D/g, ''), 10);
          if (!n) return;
          numeros[caminho] = n;
          el.querySelector('b').textContent = n.toLocaleString(document.documentElement.lang || 'pt-BR');
          el.hidden = false;
        })
        .catch(function(){});
    });
    if (fim) Promise.all(pedidos).then(function(){ fim(numeros); });
  };
})();
