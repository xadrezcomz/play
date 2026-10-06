// "Insira uma ficha": o apoio ao criador, com cara de fliperama.
//
// O que você edita aqui:
// - DESBLOQUEIOS: o que as fichas ajudam a destravar. Quando um acontecer,
//   troque feito:false por feito:true (ele aparece como destravado).
// - PLACAR: as iniciais de quem apoiou e escreveu 3 letras na mensagem do Pix,
//   do mais recente para o mais antigo. Ex.: { ini:'FAS', fichas:3 }
//
// O Pix é gerado aqui mesmo (QR Code e "copia e cola"), sem servidor e sem
// guardar nada: o pagamento acontece no app do banco de quem apoia.
window.APOIO = {
  chave: 'xadrezcomzdoc@gmail.com',
  nome: 'FHELLIPE AUGUSTO',   // aparece no app do banco (até 25 letras, sem acento)
  cidade: 'BRASIL',           // até 15 letras, sem acento
  ficha: 5,                   // reais por ficha
  pacotes: [
    { fichas: 1,  nome: 'Mais uma vida' },
    { fichas: 3,  nome: 'Combo' },
    { fichas: 10, nome: 'Modo chefão' }
  ],
  DESBLOQUEIOS: [
    { nome: 'Fases novas no Rock Orbit', obs: 'mais planetas para explorar', feito: false },
    { nome: 'Endereço próprio para o site', obs: 'um domínio só dos jogos', feito: false },
    { nome: 'Novos jogos', obs: 'ideias não faltam', feito: false },
    { nome: 'Materiais de xadrez gratuitos', obs: 'para estudar, ensinar e jogar', feito: false }
  ],
  PLACAR: [
  ]
};

(function(){
  var A = window.APOIO;
  var $ = function(id){ return document.getElementById(id); };
  var reais = function(v){ return 'R$ ' + v.toFixed(2).replace('.', ','); };
  var esc = function(t){ return String(t).replace(/[&<>"]/g, function(c){ return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[c]; }); };
  var dois = function(n){ return (n < 10 ? '0' : '') + n; };
  function le(){ try { return parseInt(localStorage.getItem('play.fichas'), 10) || 0; } catch (e){ return 0; } }
  function grava(n){ try { localStorage.setItem('play.fichas', String(n)); } catch (e){} }
  function evento(nome){
    var gc = window.goatcounter;
    if (gc && gc.count) try { gc.count({ path: 'site/apoio/' + nome, title: 'Apoio', event: true }); } catch (e){}
  }

  // ---- Pix "copia e cola" (BR Code estático do Banco Central) ----
  function campo(id, v){ return id + dois(v.length) + v; }
  function crc16(s){
    var crc = 0xFFFF;
    for (var i = 0; i < s.length; i++){
      crc ^= s.charCodeAt(i) << 8;
      for (var b = 0; b < 8; b++) crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) & 0xFFFF : (crc << 1) & 0xFFFF;
    }
    return ('000' + crc.toString(16).toUpperCase()).slice(-4);
  }
  function pix(valor){
    var p = campo('00', '01') +
      campo('26', campo('00', 'br.gov.bcb.pix') + campo('01', A.chave)) +
      campo('52', '0000') + campo('53', '986') +
      (valor ? campo('54', valor.toFixed(2)) : '') +
      campo('58', 'BR') + campo('59', A.nome.slice(0, 25)) + campo('60', A.cidade.slice(0, 15)) +
      campo('62', campo('05', '***')) + '6304';
    return p + crc16(p);
  }
  window.APOIO.pix = pix;

  function copia(texto, botao){
    var ok = function(){ var t = botao.textContent; botao.textContent = 'Copiado ✓'; botao.classList.add('ok'); setTimeout(function(){ botao.textContent = t; botao.classList.remove('ok'); }, 1800); };
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(texto).then(ok, velho); else velho();
    function velho(){
      var ta = document.createElement('textarea'); ta.value = texto; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); ok(); } catch (e){} ta.remove();
    }
  }

  // ---- a seção na página ----
  var LOCK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 10V8a5 5 0 0 1 10 0v2h1.5c.8 0 1.5.7 1.5 1.5v9c0 .8-.7 1.5-1.5 1.5h-13C4.7 22 4 21.3 4 20.5v-9c0-.8.7-1.5 1.5-1.5H7zm2 0h6V8a3 3 0 0 0-6 0v2z"/></svg>';
  var OK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9.5 16.6 4.9 12l-1.4 1.4 6 6 11-11-1.4-1.4z"/></svg>';
  $('desbloqueios').innerHTML = A.DESBLOQUEIOS.map(function(d){
    return '<li class="' + (d.feito ? 'feito' : '') + '"><span class="ic">' + (d.feito ? OK : LOCK) + '</span><span><b>' + esc(d.nome) + '</b>' +
      (d.obs ? '<small>' + esc(d.obs) + '</small>' : '') + '</span><em>' + (d.feito ? 'Destravado' : 'Bloqueado') + '</em></li>';
  }).join('');
  var linhas = A.PLACAR.slice(0, 5).map(function(p, i){
    return '<li><span class="pos">' + (i + 1) + 'º</span><span class="ini">' + esc(String(p.ini).toUpperCase().slice(0, 3)) + '</span><span class="pts">' + dois(p.fichas || 1) + ' ficha' + ((p.fichas || 1) > 1 ? 's' : '') + '</span></li>';
  });
  for (var i = linhas.length; i < 3; i++) linhas.push('<li class="vago"><span class="pos">' + (i + 1) + 'º</span><span class="ini">___</span><span class="pts">vaga</span></li>');
  $('placar').innerHTML = linhas.join('');
  function mostraCredito(){ var n = le(); $('credito').textContent = 'CRÉDITO ' + dois(Math.min(n, 99)); $('credito').classList.toggle('tem', n > 0); }
  mostraCredito();

  // ---- a máquina de fichas (janela) ----
  var jan = $('maquina'), escolha = 0, valor = 0;
  function passo(qual){ ['escolha', 'pagar', 'valeu'].forEach(function(p){ $('passo-' + p).hidden = p !== qual; }); }
  $('pacotes').innerHTML = A.pacotes.map(function(p){
    return '<button type="button" class="pacote" data-fichas="' + p.fichas + '"><span class="moedas">' + '●'.repeat(Math.min(p.fichas, 5)) + '</span><b>' + p.fichas + ' ficha' + (p.fichas > 1 ? 's' : '') + '</b><span>' + esc(p.nome) + '</span><em>' + reais(p.fichas * A.ficha) + '</em></button>';
  }).join('') + '<button type="button" class="pacote livre" data-fichas="0"><span class="moedas">?</span><b>Valor livre</b><span>você escolhe no banco</span><em>R$ —</em></button>';

  function abre(){
    passo('escolha'); evento('abriu');
    if (typeof jan.showModal === 'function') jan.showModal(); else jan.setAttribute('open', '');
  }
  function fecha(){ if (jan.close) jan.close(); else jan.removeAttribute('open'); }
  Array.prototype.forEach.call(document.querySelectorAll('[data-abre-maquina]'), function(b){ b.addEventListener('click', function(e){ e.preventDefault(); abre(); }); });
  $('fechaMaquina').addEventListener('click', fecha);
  jan.addEventListener('click', function(e){ if (e.target === jan) fecha(); });

  function carregaQR(feito){
    if (window.qrcode) return feito();
    var s = document.createElement('script'); s.src = 'lib/qrcode.js'; s.onload = feito; document.head.appendChild(s);
  }
  $('pacotes').addEventListener('click', function(e){
    var b = e.target.closest('.pacote'); if (!b) return;
    escolha = parseInt(b.getAttribute('data-fichas'), 10);
    valor = escolha * A.ficha;
    var codigo = pix(valor);
    $('resumo').innerHTML = escolha ? '<b>' + escolha + ' ficha' + (escolha > 1 ? 's' : '') + '</b> · ' + reais(valor) : '<b>Valor livre</b> · você digita o valor no banco';
    $('copiaCola').value = codigo;
    $('qr').innerHTML = '';
    carregaQR(function(){
      var q = window.qrcode(0, 'M'); q.addData(codigo); q.make();
      $('qr').innerHTML = q.createSvgTag({ cellSize: 6, margin: 2, scalable: true, alt: 'QR Code do Pix' });
    });
    passo('pagar'); evento('escolheu/' + (escolha ? escolha + '-fichas' : 'valor-livre'));
  });
  $('copiaPix').addEventListener('click', function(){ copia($('copiaCola').value, this); evento('copiou'); });
  $('copiaChave').addEventListener('click', function(){ copia(A.chave, this); evento('copiou'); });
  $('voltaEscolha').addEventListener('click', function(){ passo('escolha'); });
  $('inseri').addEventListener('click', function(){
    var n = le() + Math.max(escolha, 1); grava(n); mostraCredito();
    $('valeuCredito').textContent = 'CRÉDITO ' + dois(Math.min(n, 99));
    passo('valeu'); evento('inseriu');
    var m = $('moedaCai'); m.classList.remove('cai'); void m.offsetWidth; m.classList.add('cai');
  });
  $('voltaJogar').addEventListener('click', fecha);
})();
