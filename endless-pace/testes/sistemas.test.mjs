// Testes da lógica da corrida (sem 3D): node --test endless-pace/testes/
// Carrega os mesmos arquivos do jogo num contexto isolado, como o navegador faria.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const JOGO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'jogar');
const ARQUIVOS = [
  'js/core/EP.js',
  'dados/balanceamento.js', 'dados/aparencia.js', 'dados/npcs.js', 'dados/biomas.js', 'dados/modulos.js', 'dados/desafios.js',
  'dados/textos/pt-BR.js', 'dados/textos/en-US.js', 'dados/textos/es.js',
  'js/core/SaveManager.js', 'js/core/LocalizationManager.js',
  'js/systems/TapRhythmSystem.js', 'js/systems/FlowSystem.js', 'js/systems/EnergySystem.js', 'js/systems/SpeedSystem.js',
  'js/systems/OvertakeSystem.js', 'js/systems/EconomyManager.js', 'js/systems/ChallengeManager.js', 'js/systems/ProgressionManager.js'
];

function carrega() {
  const ctx = { console, Intl, Math, JSON, Date };
  ctx.window = ctx;
  vm.createContext(ctx);
  for (const a of ARQUIVOS) vm.runInContext(fs.readFileSync(path.join(JOGO, a), 'utf8'), ctx, { filename: a });
  return ctx.EP;
}

// toca em ritmo: n toques a cada `iv` segundos, a partir de t0; devolve as avaliações
function toca(r, n, iv, t0 = 0, jitter = () => 0) {
  const out = [];
  for (let i = 0; i < n; i++) out.push(r.tap(t0 + i * iv + jitter(i)));
  return out;
}

test('ritmo regular dá PERFECT depois do aquecimento', () => {
  const EP = carrega();
  const r = new EP.TapRhythmSystem(EP.data.balance.rhythm);
  const res = toca(r, 12, 0.5);
  assert.equal(res[0].rating, null);
  assert.equal(res[1].rating, null);
  assert.ok(res.slice(2).every(x => x.rating === 'perfect'));
  assert.equal(r.streak, 10);
});

test('ritmo irregular quebra a sequência', () => {
  const EP = carrega();
  const r = new EP.TapRhythmSystem(EP.data.balance.rhythm);
  toca(r, 6, 0.5);
  const fora = r.tap(2.5 + 0.25);   // meio intervalo antes da hora
  assert.equal(fora.rating, 'off');
  assert.equal(r.streak, 0);
});

test('tocar rápido demais nunca passa de GOOD', () => {
  const EP = carrega();
  const r = new EP.TapRhythmSystem(EP.data.balance.rhythm);
  const res = toca(r, 20, 0.1);
  assert.ok(res.slice(2).every(x => x.rating === 'good' && x.spam));
});

test('cancelar o toque do deslize mantém o ritmo', () => {
  const EP = carrega();
  const r = new EP.TapRhythmSystem(EP.data.balance.rhythm);
  toca(r, 6, 0.5);
  r.tap(2.73);           // toque do deslize, fora do ritmo
  r.cancelLast();
  assert.equal(r.streak, 4);
  assert.equal(r.tap(3.0).rating, 'perfect');
});

test('frequência cai quando para de tocar', () => {
  const EP = carrega();
  const r = new EP.TapRhythmSystem(EP.data.balance.rhythm);
  toca(r, 6, 0.5);
  assert.ok(Math.abs(r.frequency(2.6) - 2) < 0.01);
  assert.ok(r.frequency(3.5) < 1.2);
  assert.equal(r.frequency(5), 0);
});

test('FLOW: 5 PERFECT ×1, 10 ×2, 20 ×3, 30 ×4 e cai com erro', () => {
  const EP = carrega();
  const f = new EP.FlowSystem(EP.data.balance.flow);
  const niveis = [];
  for (let i = 1; i <= 30; i++) { f.onRating('perfect'); niveis[i] = f.level; }
  assert.equal(niveis[4], 0); assert.equal(niveis[5], 1); assert.equal(niveis[10], 2);
  assert.equal(niveis[20], 3); assert.equal(niveis[30], 4);
  f.onRating('off'); f.onRating('off');
  assert.ok(f.level < 4);
  f.update(30, true);
  assert.equal(f.level, 0);
});

test('velocidade: sem tocar caminha a 4 km/h; ritmo de 2 toques/s corre perto de 11,5', () => {
  const EP = carrega();
  const b = EP.data.balance;
  const s = new EP.SpeedSystem(b.speed, b.zones);
  for (let i = 0; i < 100; i++) s.update(0.1, 0, {});
  assert.equal(s.value, 4);
  assert.equal(s.zone(), 'walk');
  for (let i = 0; i < 100; i++) s.update(0.1, 2.0, {});
  assert.ok(s.value > 11 && s.value < 12, String(s.value));
  assert.equal(s.zone(), 'run');
  for (let i = 0; i < 100; i++) s.update(0.1, 2.0, { exhausted: true });
  assert.equal(s.value, b.speed.lowEnergyCap);
});

test('energia: corrida normal estável, sprint esvazia e nunca para o corredor', () => {
  const EP = carrega();
  const b = EP.data.balance;
  const e = new EP.EnergySystem(b.energy, b.speed);
  for (let i = 0; i < 600; i++) e.update(0.1, 11.5, {});
  assert.equal(e.value, 100);
  for (let i = 0; i < 300; i++) e.update(0.1, 19, {});
  assert.equal(e.value, 0);
  assert.ok(e.exhausted);
  for (let i = 0; i < 40; i++) e.update(0.1, 7, {});
  assert.ok(e.exhausted, 'ainda recuperando');
  for (let i = 0; i < 200; i++) e.update(0.1, 5, {});
  assert.ok(!e.exhausted);
});

test('FLOW economiza energia', () => {
  const EP = carrega();
  const b = EP.data.balance;
  const sem = new EP.EnergySystem(b.energy, b.speed), com = new EP.EnergySystem(b.energy, b.speed);
  for (let i = 0; i < 50; i++) { sem.update(0.1, 18, {}); com.update(0.1, 18, { flowLevel: 4 }); }
  assert.ok(com.value > sem.value);
});

test('ultrapassagens em sequência fazem combo e dão moedas extras', () => {
  const EP = carrega();
  const o = new EP.OvertakeSystem(EP.data.balance.economy);
  assert.equal(o.onOvertake(0).combo, 1);
  assert.equal(o.onOvertake(1).combo, 2);
  const c = o.onOvertake(2);
  assert.equal(c.combo, 3); assert.equal(c.coins, 3);
  assert.equal(o.onOvertake(20).combo, 1);
  assert.equal(o.maxCombo, 3); assert.equal(o.total, 4);
});

test('desafio de PERFECT seguidos completa, dá recompensa e sobe a meta', () => {
  const EP = carrega();
  const save = EP.SaveManager.defaults();
  const ch = new EP.ChallengeManager(EP.data.challenges, save.stats);
  ch.reset(true);
  ch.update(0.1, { distance: 100 });
  assert.equal(ch.active, null);
  ch.update(0.1, { distance: 170 });
  assert.equal(ch.active.target, 10);
  let feito = null;
  EP.events.on('challenge_completed', p => { feito = p; });
  for (let i = 0; i < 9; i++) ch.onRating('perfect');
  ch.onRating('great');
  for (let i = 0; i < 10; i++) ch.onRating('perfect');
  assert.ok(feito);
  assert.equal(save.stats.challenges.flow, 1);
  ch.update(0.1, { distance: 5000 });
  assert.equal(ch.active.target, 15);
});

test('desafio falha quando o tempo acaba', () => {
  const EP = carrega();
  const save = EP.SaveManager.defaults();
  const ch = new EP.ChallengeManager(EP.data.challenges, save.stats);
  ch.reset(true);
  ch.update(0.1, { distance: 200 });
  let falhou = false;
  EP.events.on('challenge_failed', () => { falhou = true; });
  for (let i = 0; i < 500; i++) ch.update(0.1, { distance: 200 + i });
  assert.ok(falhou);
  assert.equal(save.stats.challengesCompleted, 0);
});

test('moedas por distância respeitam o multiplicador', () => {
  const EP = carrega();
  const save = EP.SaveManager.defaults();
  const eco = new EP.EconomyManager(EP.data.balance.economy, save);
  for (let i = 0; i < 1000; i++) eco.addDistance(1, 1);
  assert.equal(save.coins, 20);
  const m = eco.multiplier(4, { coins: 1.2 });
  assert.ok(Math.abs(m - 2.4) < 1e-9);
});

test('progresso: totais ao vivo e recordes novos', () => {
  const EP = carrega();
  const save = EP.SaveManager.defaults();
  const p = new EP.ProgressionManager(save);
  p.startRun(); p.tick(60, 500, 10); const a = p.finishRun();
  assert.equal(a.firstRun, true); assert.deepEqual([...a.newRecords], []);
  p.startRun(); p.tick(60, 800, 12); p.addOvertake(1); const b = p.finishRun();
  assert.equal(save.stats.totalDistance, 1300);
  assert.ok(b.newRecords.includes('longestRun') && b.newRecords.includes('topSpeed') && b.newRecords.includes('mostOvertakes'));
});

test('save: grava, lê e completa saves antigos', () => {
  const EP = carrega();
  const mem = {};
  const storage = { getItem: k => mem[k] ?? null, setItem: (k, v) => { mem[k] = v; }, removeItem: k => { delete mem[k]; } };
  const s = new EP.SaveManager(storage);
  const d = s.load();
  d.profile.name = 'FELIPE'; d.coins = 42;
  s.save();
  const velho = JSON.parse(mem[EP.SaveManager.KEY]);
  delete velho.records; delete velho.settings.music;
  mem[EP.SaveManager.KEY] = JSON.stringify(velho);
  const d2 = new EP.SaveManager(storage).load();
  assert.equal(d2.profile.name, 'FELIPE'); assert.equal(d2.coins, 42);
  assert.equal(d2.records.topSpeed, 0); assert.equal(d2.settings.music, true);
});

test('textos: os três idiomas têm as mesmas chaves', () => {
  const EP = carrega();
  const pt = Object.keys(EP.texts['pt-BR']).sort();
  for (const l of ['en-US', 'es']) {
    const outras = Object.keys(EP.texts[l]).sort();
    assert.deepEqual(outras.filter(k => !pt.includes(k)), [], l + ' tem chaves a mais');
    assert.deepEqual(pt.filter(k => !outras.includes(k)), [], l + ' está sem chaves');
  }
  EP.i18n.set('pt-BR');
  assert.equal(EP.i18n.dist(12400), '12,40 km');
  EP.i18n.set('en-US');
  assert.equal(EP.i18n.dist(850), '850 m');
});

test('dados: módulos das rotas e bifurcações existem', () => {
  const EP = carrega();
  const ids = EP.data.roadModules.map(m => m.id);
  assert.equal(ids.length, 10);
  for (const r of Object.values(EP.data.routes)) for (const m of r.modules) assert.ok(ids.includes(m), m);
  for (const f of EP.data.forks) {
    assert.ok(ids.includes(f.module));
    assert.ok(EP.data.routes[f.left] && EP.data.routes[f.right]);
  }
});
