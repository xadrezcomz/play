/* Imobiliário 3D — deixa o jogo abrir sem internet depois da primeira visita.
   "Rede primeiro": com internet vem sempre a versão do site (e a cópia é
   renovada); sem internet, vem a cópia guardada. */
const COPIA = 'imobiliario-v1';
const ARQUIVOS = ['./', 'manifest.webmanifest', 'icone-192.png', 'icone-512.png'];

self.addEventListener('install', (evento) => {
  self.skipWaiting();
  evento.waitUntil(caches.open(COPIA).then((copia) =>
    Promise.all(ARQUIVOS.map((a) => copia.add(a).catch(() => { /* fica para depois */ })))));
});

self.addEventListener('activate', (evento) => {
  evento.waitUntil(caches.keys()
    .then((nomes) => Promise.all(nomes.filter((n) => n.startsWith('imobiliario-') && n !== COPIA).map((n) => caches.delete(n))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (evento) => {
  if (evento.request.method !== 'GET' || new URL(evento.request.url).origin !== self.location.origin) return;
  evento.respondWith(
    fetch(evento.request)
      .then((resposta) => {
        if (resposta.ok) { const guardar = resposta.clone(); caches.open(COPIA).then((c) => c.put(evento.request, guardar)); }
        return resposta;
      })
      .catch(() => caches.match(evento.request, { ignoreSearch: true }).then((achou) => achou || caches.match('./'))),
  );
});
