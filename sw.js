/* Xadrez com Z Games — deixa a página inicial abrir sem internet depois da
   primeira visita. Só cuida dos arquivos da página inicial (raiz, img/ e
   fontes/); os jogos ficam por conta deles mesmos.
   Páginas e scripts: "rede primeiro" (com internet vem sempre a versão nova).
   Imagens e fontes: "cópia primeiro" (mais rápido; mudou a imagem, mude o nome
   ou a versão abaixo). */
const COPIA = 'xz-site-v2';
const ARQUIVOS = [
  './', 'jogos.js', 'contador.js', 'manifest.webmanifest', 'privacidade.html',
  'fontes/fontes.css', 'fontes/chakrapetch-700-latin.woff2', 'fontes/exo2-400-latin.woff2',
  'img/logo.svg', 'img/favicon-64.png', 'img/icone-192.png',
  'img/capa-imobiliario-640.webp', 'img/capa-rock-orbit-640.webp', 'img/capa-slide-chess-640.webp', 'img/capa-rules-640.webp'
];

self.addEventListener('install', (evento) => {
  self.skipWaiting();
  evento.waitUntil(caches.open(COPIA).then((copia) =>
    Promise.all(ARQUIVOS.map((a) => copia.add(a).catch(() => { /* fica para depois */ })))));
});

self.addEventListener('activate', (evento) => {
  evento.waitUntil(caches.keys()
    .then((nomes) => Promise.all(nomes.filter((n) => n.startsWith('xz-site-') && n !== COPIA).map((n) => caches.delete(n))))
    .then(() => self.clients.claim()));
});

// caminho dentro do site ('', 'jogos.js', 'img/x.webp'...), ou null se não for da página inicial
function caminho(url) {
  const base = new URL('./', self.location).pathname;
  if (url.origin !== self.location.origin || !url.pathname.startsWith(base)) return null;
  const resto = url.pathname.slice(base.length);
  return !resto.includes('/') || /^(img|fontes)\//.test(resto) ? resto : null;
}

function guarda(pedido, resposta) {
  if (resposta.ok && resposta.type === 'basic') {
    const copia = resposta.clone();
    caches.open(COPIA).then((c) => c.put(pedido, copia));
  }
  return resposta;
}

self.addEventListener('fetch', (evento) => {
  const pedido = evento.request;
  const url = new URL(pedido.url);
  const resto = caminho(url);
  if (pedido.method !== 'GET' || resto === null) return;
  if (/^(img|fontes)\//.test(resto)) {
    evento.respondWith(caches.match(pedido).then((achou) => achou || fetch(pedido).then((r) => guarda(pedido, r))));
    return;
  }
  evento.respondWith(
    fetch(pedido).then((r) => guarda(pedido, r))
      .catch(() => caches.match(pedido, { ignoreSearch: true })
        .then((achou) => achou || (pedido.mode === 'navigate' ? caches.match('./') : Response.error()))),
  );
});
