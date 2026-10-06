// Escreve os arquivos de dados (scripts clássicos) e as licenças.
import fs from 'node:fs';
import path from 'node:path';

const CREDITO = 'Corredores: Universal Base Characters e Universal Animation Library por Quaternius (CC0) — quaternius.com; decodificador meshoptimizer (MIT, Arseny Kapoulkine).';

function wrap(title, assign, obj) {
  return '// ENDLESS PACE — ' + title + ' (Quaternius UBC, CC0). Gerado por ferramentas/bake-corredor.mjs — não editar.\n' +
    '// ' + CREDITO + '\n' +
    '(function (EP) {\n  \'use strict\';\n  var M = EP.data.models = EP.data.models || {};\n' +
    '  ' + assign + ' = ' + JSON.stringify(obj) + ';\n})(window.EP);\n';
}

export function writeOutputs(out, { saida, raiz, deps, report, fontes }) {
  fs.mkdirSync(saida, { recursive: true });
  const sizes = {};
  const put = (name, txt) => { fs.writeFileSync(path.join(saida, name), txt); sizes[name] = txt.length; };
  for (const g of Object.keys(out)) {
    const C = out[g];
    put('corredor-' + g + '.js', wrap(g === 'm' ? 'corredor masculino' : 'corredor feminino', 'M.corredor = M.corredor || {};\n  M.corredor.' + g, C.data));
  }
  const roupas = {}, cabelos = {};
  for (const g of Object.keys(out)) { if (out[g].roupas) roupas[g] = out[g].roupas; if (out[g].cabelos) cabelos[g] = out[g].cabelos; }
  if (Object.keys(roupas).length) put('roupas.js', wrap('roupas dos corredores', 'M.roupas', roupas));
  if (Object.keys(cabelos).length) put('cabelos.js', wrap('cabelos dos corredores', 'M.cabelos', cabelos));
  // licenças
  const lic = path.join(raiz, 'jogar', 'modelos', 'LICENCAS');
  fs.mkdirSync(lic, { recursive: true });
  fs.copyFileSync(path.join(fontes, 'License_Standard.txt'), path.join(lic, 'Quaternius-UBC-License_Standard.txt'));
  fs.copyFileSync(path.join(fontes, 'ual', 'README.txt'), path.join(lic, 'Quaternius-UAL-Readme.txt'));
  fs.copyFileSync(path.join(fontes, 'ual', 'License.txt'), path.join(lic, 'Quaternius-UAL-License.txt'));
  fs.copyFileSync(deps.meshoptLicense, path.join(lic, 'meshoptimizer-LICENSE.md'));
  fs.writeFileSync(path.join(lic, 'LEIA-ME.txt'),
    'Modelos dos corredores do ENDLESS PACE (jogar/dados/modelos/*.js)\n\n' +
    'Corpos, cabelos, sobrancelhas, olhos e texturas de pele vêm do "Universal Base Characters [Standard]" da Quaternius\n' +
    '(https://quaternius.com), CC0 1.0 (domínio público). A pose de mão fechada vem da animação Jog_Fwd_Loop do\n' +
    '"Universal Animation Library [Standard]", também CC0. Modificados por nós com ferramentas/bake-corredor.mjs:\n' +
    'pose de braços para baixo, corpo mais magro (corredor amador), roupas, tênis e cabelos novos ou adaptados, texturas\n' +
    'de pele tingíveis (sem a roupa de baixo pintada) e níveis de detalhe. O decodificador embutido em\n' +
    'jogar/js/runner/ModelData.js é o meshopt_decoder_reference.js do meshoptimizer 1.3.0 (MIT, Arseny Kapoulkine).\n' +
    'CC0 não exige crédito; damos assim mesmo:\n' + CREDITO + '\n');
  report.arquivos = sizes;
  report.totalBytes = Object.values(sizes).reduce((a, b) => a + b, 0);
  console.log('arquivos:', Object.entries(sizes).map(([k, v]) => k + ' ' + (v / 1024).toFixed(0) + ' KB').join(', '), '| total', (report.totalBytes / 1024).toFixed(0), 'KB');
}
