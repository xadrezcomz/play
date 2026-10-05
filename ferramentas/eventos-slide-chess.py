# Coloca os eventos de uso (GoatCounter) no Slide Chess.
# Rode de novo sempre que trocar o arquivo do jogo por uma versão nova:
#   python3 ferramentas/eventos-slide-chess.py slide-chess/jogar/index.html
import sys

ARQ = sys.argv[1] if len(sys.argv) > 1 else 'slide-chess/jogar/index.html'
s = open(ARQ, encoding='utf-8').read()
if 'evComecou(' in s:
    print('já tem os eventos'); sys.exit(0)

def troca(antes, depois):
    global s
    if s.count(antes) != 1:
        sys.exit('não achei (ou achei mais de uma vez): ' + antes[:60])
    s = s.replace(antes, depois)

MODULO = r"""  /* =====================================================================
     EVENTOS DE USO (site xadrezcomz.github.io/play, GoatCounter)
     Contagens anônimas, sem cookies e sem nada que identifique alguém:
     nível tentado e vencido, desafio do dia, modo livre, tempo de jogo e se
     a pessoa volta em outro dia. Fora do site, evento() não faz nada.
     (Colocado por ferramentas/eventos-slide-chess.py.)
     ===================================================================== */
  const evFila = [], evSessao = { comecou: false, tempo: 0, marco: 0 }, EV_MINUTOS = [5, 15, 30];
  function evento(nome) {
    const gc = window.goatcounter;
    if (!gc) return;
    if (!gc.count) { evFila.push(nome); return; }
    try { gc.count({ path: 'sc/' + nome, title: 'Slide Chess', event: true }); } catch { /* sem contagem */ }
  }
  (function esvazia(n) {
    const gc = window.goatcounter;
    if (!gc || n > 30) return;
    if (gc.count && evFila.length) { evFila.splice(0).forEach(evento); return; }
    setTimeout(() => esvazia(n + 1), 1000);
  })(0);
  const evNome = { campanha: 'nivel', diario: 'desafio-do-dia', livre: 'modo-livre', desafio: 'desafio-de-amigo' };
  function evOnde(p) {
    return p.tipo === 'campanha' ? 'mundo-' + (p.nivel.mundo + 1) + '/nivel-' + p.nivel.id : (evNome[p.tipo] || p.tipo);
  }
  function evComecou(p) {
    if (!window.goatcounter) return;
    if (!evSessao.comecou) { evSessao.comecou = true; evento('comecou'); }
    evento('tentou/' + evOnde(p));
  }
  function evVenceu(p, completouMundo, zerou) {
    evento('venceu/' + evOnde(p));
    if (completouMundo) evento('mundo-completo/' + (p.nivel.mundo + 1));
    if (zerou) evento('zerou');
  }
  // tempo de jogo nesta visita: conta só com uma partida aberta e a página visível
  setInterval(() => {
    if (!window.goatcounter || evSessao.marco >= EV_MINUTOS.length) return;
    if (document.visibilityState !== 'visible' || !partida || acabou) return;
    evSessao.tempo += 5;
    if (evSessao.tempo >= EV_MINUTOS[evSessao.marco] * 60) evento('tempo/' + EV_MINUTOS[evSessao.marco++] + '-min');
  }, 5000);
  // voltou em outro dia: a data fica só neste aparelho; vai só o aviso "voltou"
  (function () {
    if (!window.goatcounter) return;
    const hoje = new Date().toISOString().slice(0, 10);
    let d = null;
    try { d = JSON.parse(localStorage.getItem('slide.evDias')); } catch { /* começa agora */ }
    const grava = v => { try { localStorage.setItem('slide.evDias', JSON.stringify(v)); } catch { /* navegação privada */ } };
    if (!d) { grava({ primeiro: hoje, ultimo: hoje }); return; }
    if (d.ultimo === hoje) return;
    evento('voltou');
    if (!d.semana && Date.parse(hoje) - Date.parse(d.primeiro) >= 7 * 864e5) { d.semana = 1; evento('voltou-depois-de-7-dias'); }
    d.ultimo = hoje; grava(d);
  })();

"""
troca('  function comecar(p) {\n', MODULO + '  function comecar(p) {\n')
troca('    pararPartida();\n    partida = p;\n', '    pararPartida();\n    partida = p;\n    evComecou(p);\n')
troca("    const zerou = naCampanha && primeiraVez && nivel.id <= NA_CAMPANHA && resumo().campanha === NA_CAMPANHA;\n",
      "    const zerou = naCampanha && primeiraVez && nivel.id <= NA_CAMPANHA && resumo().campanha === NA_CAMPANHA;\n    evVenceu(p, completouMundo, zerou);\n")
open(ARQ, 'w', encoding='utf-8').write(s)
print('eventos colocados em', ARQ)
