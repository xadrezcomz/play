# Prepara o arquivo de um jogo para o site: contador do GoatCounter e a
# imagem que aparece quando alguém compartilha o link (WhatsApp, Instagram,
# Facebook, X...). Rode sempre que trocar o arquivo do jogo por uma versão nova:
#
#   python3 ferramentas/prepara-jogo.py rock-orbit  caminho/rock-orbit.html
#   python3 ferramentas/prepara-jogo.py slide-chess caminho/slide-chess.html
#   python3 ferramentas/prepara-jogo.py rules        (RULES: refaz no próprio arquivo)
#   python3 ferramentas/prepara-jogo.py imobiliario  (depois de copiar o jogo com publicar.mjs)
#   python3 ferramentas/eventos-slide-chess.py      (só no Slide Chess, depois)
#
# Sem o segundo argumento, refaz no próprio arquivo que já está no site.
import html, re, sys

SITE = 'https://xadrezcomz.github.io/play/'
JOGOS = {
    'rock-orbit': {
        'titulo': 'Rock Orbit — jogue grátis no navegador',
        'desc': 'Pilote um foguete, colete cristais e deixe o seu rastro por 6 planetas. Grátis, no celular ou no computador.',
        'imagem': 'rock-orbit/img/compartilhar-pt.jpg',
        'alt': 'Rock Orbit: deixe o seu rastro pela galáxia',
        'contagem': '/jogo/rock-orbit',
    },
    'slide-chess': {
        'titulo': 'Slide Chess — jogue grátis no navegador',
        'desc': 'Abra caminho, coroe o peão e leve a dama para casa. Um quebra-cabeça de xadrez grátis, no celular ou no computador.',
        'imagem': 'img/capa-slide-chess.jpg',
        'alt': 'Slide Chess: abra caminho, coroe o peão, leve a dama para casa',
        'contagem': '/jogo/slide-chess',
    },
    'imobiliario': {
        'titulo': 'Imobiliário 3D — jogue grátis no navegador',
        'desc': 'Compre, construa e negocie numa cidade em miniatura. Jogo de tabuleiro em 3D, contra amigos ou o computador. Grátis, no celular ou no computador.',
        'imagem': 'img/capa-imobiliario.jpg',
        'alt': 'Imobiliário 3D: compre, construa e negocie numa cidade em miniatura',
        'contagem': '/jogo/imobiliario',
    },
    'rules': {
        'titulo': 'RULES — jogue grátis no navegador',
        'desc': 'Cada fase tem uma instrução simples. O difícil é descobrir como interpretá-la. 100 fases de puzzle grátis, no celular ou no computador.',
        'imagem': 'img/capa-rules.jpg',
        'alt': 'RULES: leia, pense, duvide',
        'contagem': '/jogo/rules',
    },
}

if len(sys.argv) < 2 or sys.argv[1] not in JOGOS:
    sys.exit('uso: prepara-jogo.py <' + '|'.join(JOGOS) + '> [arquivo-novo.html]')
nome = sys.argv[1]
j = JOGOS[nome]
destino = nome + '/jogar/index.html'
s = open(sys.argv[2] if len(sys.argv) > 2 else destino, encoding='utf-8').read()

a = lambda t: html.escape(t, quote=True)
OG = '\n'.join([
    '<!-- compartilhar: imagem e texto do link (colocado por ferramentas/prepara-jogo.py) -->',
    '<meta property="og:type" content="website">',
    '<meta property="og:site_name" content="Jogos do @xadrezcomz">',
    '<meta property="og:locale" content="pt_BR">',
    '<meta property="og:url" content="' + SITE + nome + '/jogar/">',
    '<meta property="og:title" content="' + a(j['titulo']) + '">',
    '<meta property="og:description" content="' + a(j['desc']) + '">',
    '<meta property="og:image" content="' + SITE + j['imagem'] + '">',
    '<meta property="og:image:type" content="image/jpeg">',
    '<meta property="og:image:width" content="1200">',
    '<meta property="og:image:height" content="630">',
    '<meta property="og:image:alt" content="' + a(j['alt']) + '">',
    '<meta name="twitter:card" content="summary_large_image">',
    '<meta name="twitter:image" content="' + SITE + j['imagem'] + '">',
    '<!-- /compartilhar -->',
])
CONTA = '\n'.join([
    '<!-- cada abertura do jogo conta como uma jogada (GoatCounter, sem cookies) -->',
    "<script>window.CONTAGEM = '" + j['contagem'] + "';</script>",
    '<script src="../../contador.js"></script>',
])

# As tags vão logo depois do <meta charset>, no começo do arquivo: quem lê o
# link (WhatsApp, Facebook) só olha o início da página, e o Rock Orbit é grande.
s = re.sub(r'<!-- compartilhar:.*?<!-- /compartilhar -->\n', '', s, flags=re.S)
m = re.search(r'<meta charset=[^>]*>\n?', s, flags=re.I)
if not m:
    sys.exit('não achei o <meta charset>')
s = s[:m.end()] + OG + '\n' + s[m.end():]

if 'contador.js' not in s:
    if s.count('</head>') < 1:
        sys.exit('não achei o </head>')
    i = s.index('</head>')
    s = s[:i] + CONTA + '\n' + s[i:]

open(destino, 'w', encoding='utf-8').write(s)
print('ok:', destino)
