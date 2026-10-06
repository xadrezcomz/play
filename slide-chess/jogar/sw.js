/* =====================================================================
   SLIDE CHESS — o serviço que deixa o jogo abrir SEM INTERNET.

   A regra é "rede primeiro": com internet, o jogo vem sempre do servidor
   (e a cópia guardada é renovada); sem internet, vem da cópia. Assim uma
   versão nova chega a todo mundo na primeira visita com rede, sem
   ninguém ficar preso numa versão velha.

   Ele só é ligado no jogo empacotado (ver tela.js e empacotar.cjs), e
   precisa estar na MESMA pasta do index.html. Sem ele o jogo funciona
   igual — só não abre offline nem se instala.
   ===================================================================== */

const COPIA = 'slidechess-v1';
const ARQUIVOS = ['./', 'manifest.webmanifest', 'icone-192.png', 'icone-512.png'];

self.addEventListener('install', evento => {
  self.skipWaiting();
  /* Um por um, e sem deixar um arquivo que falte derrubar a instalação
     inteira: o que não veio agora é guardado na primeira vez que for pedido. */
  evento.waitUntil(caches.open(COPIA).then(copia =>
    Promise.all(ARQUIVOS.map(arquivo => copia.add(arquivo).catch(() => { /* fica para depois */ })))));
});

self.addEventListener('activate', evento => {
  evento.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', evento => {
  /* Só o que é do próprio site passa por aqui. Pedido para fora — o contador
     de visitas, por exemplo — segue direto: guardar cópia dele não serve a
     ninguém, e sem internet ele deve simplesmente falhar. */
  if (evento.request.method !== 'GET' || new URL(evento.request.url).origin !== self.location.origin) return;
  evento.respondWith(
    fetch(evento.request)
      .then(resposta => {
        const guardar = resposta.clone();
        caches.open(COPIA).then(copia => copia.put(evento.request, guardar));
        return resposta;
      })
      .catch(() => caches.match(evento.request, { ignoreSearch: true }).then(achou => achou || caches.match('./')))
  );
});
