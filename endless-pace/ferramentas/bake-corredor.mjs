// ENDLESS PACE — "assa" os corredores a partir dos Universal Base Characters da Quaternius (CC0).
//
//   node ferramentas/bake-corredor.mjs [--cache DIR] [--saida DIR] [--so m|f] [--baixar] [--rapido]
//
// --cache  pasta FORA do repositório com as fontes (fontes/) e as dependências npm (node_modules/).
//          Padrão: $EP_BAKE_CACHE ou ~/.cache/endless-pace-bake. Tudo que falta é baixado (SHA-1 conferido).
// --saida  pasta dos arquivos de dados (padrão jogar/dados/modelos).
// --baixar baixa as fontes de novo mesmo se já estiverem no cache.
// --rapido menos raios de oclusão (só para testes).
//
// Saída: jogar/dados/modelos/{corredor-m,corredor-f,roupas,cabelos}.js (scripts clássicos que preenchem
// EP.data.models) e ferramentas/saida-ver/relatorio.json. Formato e decisões: ferramentas/ESPEC-corredor.md.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { garantirFontes, garantirDeps } from './bake-corredor/fontes.mjs';
import { bakeGender } from './bake-corredor/pipeline.mjs';
import { initMeshopt } from './bake-corredor/encode.mjs';
import { initImg } from './bake-corredor/textures.mjs';
import { writeOutputs } from './bake-corredor/saida.mjs';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(AQUI, '..');
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const CACHE = path.resolve(opt('--cache', process.env.EP_BAKE_CACHE || path.join(os.homedir(), '.cache', 'endless-pace-bake')));
const SAIDA = path.resolve(opt('--saida', path.join(RAIZ, 'jogar', 'dados', 'modelos')));
const SO = opt('--so', null);
const RAPIDO = args.includes('--rapido');

if (CACHE.startsWith(RAIZ + path.sep)) throw new Error('o cache não pode ficar dentro do repositório: ' + CACHE);

const t0 = Date.now();
console.log('cache:', CACHE);
await garantirFontes(path.join(CACHE, 'fontes'), { force: args.includes('--baixar') });
const deps = await garantirDeps(CACHE);
await initMeshopt(deps.meshopt);
initImg(deps.PNG, deps.jpeg);

const report = { versao: 1, inicio: new Date().toISOString(), generos: {} };
const out = {};
for (const g of SO ? [SO] : ['m', 'f']) {
  console.log('== gênero', g);
  out[g] = await bakeGender(g, { fontes: path.join(CACHE, 'fontes'), rapido: RAPIDO, raiz: RAIZ, report: (report.generos[g] = {}) });
}
writeOutputs(out, { saida: SAIDA, raiz: RAIZ, deps, report, fontes: path.join(CACHE, 'fontes') });
report.segundos = +((Date.now() - t0) / 1000).toFixed(1);
const rel = path.join(RAIZ, 'ferramentas', 'saida-ver');
fs.mkdirSync(rel, { recursive: true });
fs.writeFileSync(path.join(rel, 'relatorio.json'), JSON.stringify(report, null, 1));
console.log('pronto em', report.segundos, 's');
