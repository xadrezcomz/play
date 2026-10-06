// Junta o ENDLESS PACE num arquivo .html só (scripts, estilo, fontes e ícone
// embutidos). Serve para testar mandando o arquivo, abrir sem internet e,
// depois, empacotar como app (como o gera-versoes.mjs do Rock Orbit).
//
//   node endless-pace/ferramentas/arquivo-unico.mjs [saida.html] [--cdn]
//
// --cdn: em vez de embutir, carrega o three.js do cdnjs e as fontes do Google
// Fonts (arquivo bem menor, mas precisa de internet).
// O arquivo avulso não conta jogadas (sem o contador do site).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const JOGO = path.resolve(AQUI, '..', 'jogar');
const SITE = path.resolve(AQUI, '..', '..');
const args = process.argv.slice(2);
const cdn = args.includes('--cdn');
const saida = path.resolve(args.find(a => !a.startsWith('--')) || path.join(AQUI, '..', 'endless-pace.html'));
const ler = f => fs.readFileSync(f, 'utf8');
const semFimDeScript = js => js.replace(/<\/script/gi, '<\\/script');

let html = ler(path.join(JOGO, 'index.html'));
const troca = (de, para) => {
  if (typeof de === 'string' ? !html.includes(de) : !de.test(html)) throw new Error('não achei: ' + de);
  html = html.replace(de, () => para);
};

// contador do site: fora do arquivo avulso
troca(/<!-- cada abertura do jogo conta[^\n]*\n<script>window\.CONTAGEM[^\n]*\n<script src="\.\.\/\.\.\/contador\.js"><\/script>\n/, '');

// fontes
if (cdn) {
  troca('<link rel="stylesheet" href="../../fontes/fontes.css">',
    '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n' +
    '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@600;700&family=Exo+2:wght@400;500;600;700;800&display=swap">');
} else {
  // só o subconjunto latino (português, inglês e espanhol cabem nele)
  const css = ler(path.join(SITE, 'fontes', 'fontes.css'))
    .split('@font-face').filter(b => b.includes('-latin.woff2'))
    .map(b => '@font-face' + b.replace(/\/\* latin(-ext)? \*\//g, '').trim())
    .join('\n')
    .replace(/url\(([^)]+\.woff2)\)/g, (_, f) => 'url(data:font/woff2;base64,' + fs.readFileSync(path.join(SITE, 'fontes', f)).toString('base64') + ')');
  troca('<link rel="stylesheet" href="../../fontes/fontes.css">', '<style>\n' + css + '\n</style>');
}

// estilo e ícone
troca('<link rel="stylesheet" href="estilo.css">', '<style>\n' + ler(path.join(JOGO, 'estilo.css')) + '</style>');
troca('<link rel="icon" href="icone.svg" type="image/svg+xml">',
  '<link rel="icon" href="data:image/svg+xml;base64,' + fs.readFileSync(path.join(JOGO, 'icone.svg')).toString('base64') + '">');

// links do site viram endereços completos
html = html.replace(/href="\.\.\/\.\.\/privacidade\.html"/g, 'href="https://xadrezcomz.github.io/play/privacidade.html" target="_blank" rel="noopener"');

// scripts
html = html.replace(/<script src="([^"]+)"><\/script>/g, (tag, src) => {
  if (src === 'vendor/three-0.128.0.min.js' && cdn) return '<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>';
  if (/^https?:/.test(src) || src.startsWith('../')) throw new Error('script de fora do jogo: ' + src);
  return '<script>\n' + semFimDeScript(ler(path.join(JOGO, src))) + '\n</script>';
});

fs.writeFileSync(saida, html);
console.log('ok:', path.relative(process.cwd(), saida), (fs.statSync(saida).size / 1024).toFixed(0) + ' KB');
