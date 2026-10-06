// Confere as fases e as traduções sem abrir o navegador:
//   node rules/ferramentas/valida-fases.js
// Verifica: fases da ordem existem e estão no index.html, chaves de texto em
// todos os idiomas, palavras-objeto ([[id|...]]) presentes em cada idioma,
// tipos de objeto, comportamentos, condições, ações e ids referenciados.
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..', 'jogar');
const ctx = { window: {}, console, navigator: { language: 'pt-BR' }, performance: { now: () => 0 } };
ctx.window.window = ctx.window;
vm.createContext(ctx);
const load = f => vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8').replace(/^RULES\./gm, 'window.RULES.'), ctx, { filename: f });
vm.runInContext('var RULES; ', ctx);

const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const scripts = [...html.matchAll(/<script src="([^"]+)"/g)].map(m => m[1]).filter(s => !s.startsWith('..'));
scripts.forEach(s => { if (s.indexOf('ui/') < 0 && s.indexOf('input') < 0) { load(s); vm.runInContext('RULES = window.RULES', ctx); } });
const R = ctx.window.RULES;

const errs = [], warns = [];
const langs = Object.keys(R.L10N);
const files = fs.readdirSync(path.join(ROOT, 'data/levels')).filter(f => /^Level\d+\.js$/.test(f));
files.forEach(f => { if (!scripts.includes('data/levels/' + f)) warns.push(`${f} não está no index.html`); });

const strings = l => R.L10N[l].strings;
const base = Object.keys(strings('pt-BR'));
langs.forEach(l => base.forEach(k => { if (!(k in strings(l))) errs.push(`[${l}] falta a chave ${k}`); }));

const ACTION_KEYS = Object.keys(R.Actions || {}).concat(['wait']);
function checkCond(c, lv, where) {
  if (!c) return errs.push(`fase ${lv.id}: ${where} vazia`);
  if (Array.isArray(c)) return c.forEach(x => checkCond(x, lv, where));
  if (!R.Conditions.types[c.type]) errs.push(`fase ${lv.id}: condição desconhecida "${c.type}" em ${where}`);
  if (c.of) [].concat(c.of).forEach(x => checkCond(x, lv, where));
  ['target', 'container', 'a', 'b', 'divider', 'left', 'right'].forEach(k => { if (c[k] && !ids(lv).includes(c[k])) errs.push(`fase ${lv.id}: ${where} cita "${c[k]}", que não existe`); });
  (c.objects || c.ids || []).forEach(id => { if (!ids(lv).includes(id)) errs.push(`fase ${lv.id}: ${where} cita "${id}", que não existe`); });
}
function checkActions(list, lv, where) {
  (list || []).forEach(a => {
    if (!Object.keys(a).some(k => ACTION_KEYS.includes(k))) errs.push(`fase ${lv.id}: ação sem tipo conhecido em ${where}: ${JSON.stringify(a)}`);
    ['target', 'move', 'reset', 'hide', 'show', 'state', 'toObj'].forEach(k => { if (typeof a[k] === 'string' && !ids(lv).includes(a[k])) errs.push(`fase ${lv.id}: ${where} cita "${a[k]}", que não existe`); });
  });
}
const ids = lv => (lv.objects || []).map(o => o.id);

const order = R.LEVEL_ORDER || [];
order.forEach(id => { if (!R.Levels.get(id)) errs.push(`LEVEL_ORDER cita a fase ${id}, que não foi carregada`); });
Object.values(R.Levels.all()).forEach(lv => {
  [lv.instruction].concat(lv.hints || []).forEach(k => langs.forEach(l => { if (!(k in strings(l))) errs.push(`fase ${lv.id}: [${l}] falta ${k}`); }));
  if ((lv.hints || []).length !== 3) warns.push(`fase ${lv.id}: tem ${(lv.hints || []).length} dicas (o padrão é 3)`);
  (lv.objects || []).forEach(o => {
    if (o.inText) {
      langs.forEach(l => { if (!(strings(l)[lv.instruction] || '').includes('[[' + o.id + '|')) errs.push(`fase ${lv.id}: [${l}] a instrução não tem a palavra [[${o.id}|...]]`); });
    } else if (!R.Renderers.types[o.type] && o.type !== 'word') errs.push(`fase ${lv.id}: tipo de objeto desconhecido "${o.type}" (${o.id})`);
    Object.keys(o.behaviors || {}).forEach(b => { if (!R.Behaviors[b.split('#')[0]]) errs.push(`fase ${lv.id}: comportamento desconhecido "${b}" (${o.id})`); });
    if (o.textKey) langs.forEach(l => { if (!(o.textKey in strings(l))) errs.push(`fase ${lv.id}: [${l}] falta o texto ${o.textKey}`); });
  });
  checkCond(lv.win, lv, 'win');
  (lv.triggers || []).forEach((t, i) => { checkCond(t.when, lv, 'trigger ' + i); checkActions(t.do, lv, 'trigger ' + i); });
  (lv.reactions || []).forEach((r, i) => checkActions(r.do, lv, 'reação ' + i));
  checkActions(lv.onWin, lv, 'onWin');
});

warns.forEach(w => console.log('aviso:', w));
errs.forEach(e => console.log('ERRO:', e));
console.log(`${Object.keys(R.Levels.all()).length} fases, ${langs.length} idiomas, ${base.length} textos: ${errs.length ? errs.length + ' erro(s)' : 'tudo certo'}.`);
process.exit(errs.length ? 1 : 0);
