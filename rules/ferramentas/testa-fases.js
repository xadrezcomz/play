// Joga as fases do MVP como uma pessoa jogaria (toque, arraste, pinça com dois
// dedos, espera) e confere também que as tentativas "erradas" não completam.
// Precisa do Playwright e de um servidor local na raiz do site:
//   npx http-server -p 8123 .            (na pasta play/)
//   node rules/ferramentas/testa-fases.js [url] [pasta-para-screenshots]
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }
const SHOTS = (process.argv[3] || require('os').tmpdir()) + '/rules-';
const URL = process.argv[2] || 'http://localhost:8123/rules/jogar/';
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }).catch(() => chromium.launch());
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, locale: 'pt-BR' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  const cdp = await ctx.newCDPSession(page);

  await page.goto(URL);
  await sleep(700);
  await page.screenshot({ path: SHOTS + '00-menu.png' });

  const center = async id => page.evaluate(id => {
    const r = document.querySelector(`[data-obj="${id}"]`).getBoundingClientRect();
    return [r.left + r.width / 2, r.top + r.height / 2, r.width, r.height];
  }, id);
  const touch = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map((p, i) => ({ x: p[0], y: p[1], id: i })) });
  const tap = async id => { const c = await center(id); await touch('touchStart', [c]); await sleep(40); await touch('touchEnd', []); };
  const tapXY = async (x, y) => { await touch('touchStart', [[x, y]]); await sleep(40); await touch('touchEnd', []); };
  const drag = async (id, tx, ty, steps = 12) => {
    const c = await center(id);
    await touch('touchStart', [c]);
    for (let i = 1; i <= steps; i++) { await touch('touchMove', [[c[0] + (tx - c[0]) * i / steps, c[1] + (ty - c[1]) * i / steps]]); await sleep(16); }
    await touch('touchEnd', []);
  };
  const dragTo = async (id, target) => { const t = await center(target); await drag(id, t[0], t[1]); };
  const pinch = async (id, factor) => {
    const c = await center(id), d0 = 40, d1 = d0 * factor;
    const a = [c[0], c[1]];
    await touch('touchStart', [a]);
    await sleep(30);
    await touch('touchStart', [a, [c[0] + d0, c[1] + d0]]);
    for (let i = 1; i <= 10; i++) { const d = d0 + (d1 - d0) * i / 10; await touch('touchMove', [a, [c[0] + d, c[1] + d]]); await sleep(16); }
    await touch('touchEnd', [a]);
    await sleep(20);
    await touch('touchEnd', []);
  };
  const state = () => page.evaluate(() => ({ lvl: RULES.Game.current, won: RULES.Game.won, screen: RULES.Game.screen, label: document.querySelector('#level-label').textContent, instr: document.querySelector('#instr-text').textContent }));
  const waitLevel = async id => { for (let i = 0; i < 60; i++) { const s = await state(); if (s.lvl === id && !s.won && s.screen === 'play') { await sleep(250); return; } await sleep(100); } throw new Error('não chegou na fase ' + id); };
  const expectWin = async (id, name) => {
    for (let i = 0; i < 30; i++) { if ((await state()).won) { console.log('OK  fase', id, name); return; } await sleep(100); }
    await page.screenshot({ path: SHOTS + 'FAIL-' + id + '.png' });
    throw new Error('fase ' + id + ' não completou');
  };
  const notWon = async (id, why) => { await sleep(300); const s = await state(); if (s.won) throw new Error('fase ' + id + ' completou cedo demais: ' + why); console.log('    ok, não completou:', why); };
  const skipCard = async () => { await sleep(200); const vis = await page.evaluate(() => !document.querySelector('#chapter-card').hidden); if (vis) { await page.screenshot({ path: SHOTS + 'card-' + Date.now() + '.png' }); await tapXY(195, 420); await sleep(300); } };

  await page.click('#btn-play');
  await skipCard();

  // 01
  await waitLevel(1); await page.screenshot({ path: SHOTS + '01.png' });
  await tapXY(30, 700); await notWon(1, 'toque fora do círculo');
  await tap('circle'); await expectWin(1, 'TOQUE NO CÍRCULO');
  await sleep(250); await page.screenshot({ path: SHOTS + '01-win.png' });

  // 02
  await waitLevel(2); await page.screenshot({ path: SHOTS + '02.png' });
  await tap('ball'); await notWon(2, 'só tocar na bola');
  await dragTo('ball', 'box'); await expectWin(2, 'LEVE A BOLA');

  // 03
  await waitLevel(3); await page.screenshot({ path: SHOTS + '03.png' });
  await tap('door'); await notWon(3, 'tocar na porta');
  await page.screenshot({ path: SHOTS + '03-tap.png' });
  { const c = await center('door'); await drag('door', c[0] + 130, c[1]); }
  await expectWin(3, 'ABRA A PORTA');

  // 05
  await waitLevel(5); await page.screenshot({ path: SHOTS + '05.png' });
  await dragTo('circle', 'square'); await sleep(450); await notWon(5, 'círculo grande demais');
  await page.screenshot({ path: SHOTS + '05-reject.png' });
  await pinch('circle', 0.35);
  console.log('    escala do círculo:', await page.evaluate(() => RULES.Game.engine.get('circle').scale.toFixed(2)));
  await dragTo('circle', 'square'); await expectWin(5, 'CÍRCULO NO QUADRADO');

  // 09
  await waitLevel(9); await page.screenshot({ path: SHOTS + '09.png' });
  for (const id of ['ball', 'star', 'cube']) { await dragTo(id, 'box'); await sleep(250); }
  await notWon(9, 'três objetos sem a palavra');
  await sleep(500); await page.screenshot({ path: SHOTS + '09-almost.png' });
  await dragTo('w_all', 'box'); await expectWin(9, 'COLOQUE TUDO');
  await sleep(150); await page.screenshot({ path: SHOTS + '09-win.png' });

  // 10
  await waitLevel(10); await skipCard();
  await page.screenshot({ path: SHOTS + '10.png' });
  await sleep(2000); await tapXY(200, 500); await sleep(1500); await notWon(10, 'tocou antes dos 3 s');
  await expectWin(10, 'NÃO TOQUE EM NADA (espera)').catch(async () => { await sleep(2000); await expectWin(10, 'NÃO TOQUE EM NADA'); });

  // 11
  await skipCard(); await waitLevel(11); await skipCard(); await page.screenshot({ path: SHOTS + '11.png' });
  { const before = await center('key'); await dragTo('ruli', 'key'); await sleep(400); const after = await center('key');
    console.log('    chave fugiu:', Math.round(before[0]), Math.round(before[1]), '→', Math.round(after[0]), Math.round(after[1])); }
  await notWon(11, 'Ruli foi até a chave');
  await page.screenshot({ path: SHOTS + '11-flee.png' });
  await dragTo('key', 'ruli'); await expectWin(11, 'PEGUE A CHAVE');

  // 12
  await waitLevel(12); await page.screenshot({ path: SHOTS + '12.png' });
  { const c = await center('ruli'); await drag('ruli', c[0] + 250, c[1], 20); }
  await sleep(700); await notWon(12, 'Ruli caiu no buraco');
  console.log('    Ruli voltou para x =', await page.evaluate(() => RULES.Game.engine.get('ruli').x.toFixed(1)));
  await dragTo('door', 'ruli'); await expectWin(12, 'CHEGUE À PORTA');

  // 16
  await waitLevel(16); await page.screenshot({ path: SHOTS + '16.png' });
  await dragTo('ball', 'box'); await sleep(450); await notWon(16, 'bola não cabe');
  await pinch('ball', 2); await notWon(16, 'tentou aumentar a bola');
  await pinch('box', 3);
  console.log('    escala da caixa:', await page.evaluate(() => RULES.Game.engine.get('box').scale.toFixed(2)));
  await page.screenshot({ path: SHOTS + '16-big.png' });
  await dragTo('ball', 'box'); await expectWin(16, 'BOLA NA CAIXA');

  // 20
  await waitLevel(20); await page.screenshot({ path: SHOTS + '20.png' });
  await sleep(3500); await tapXY(200, 500); await sleep(3000); await notWon(20, 'tocou no meio da espera');
  await sleep(2600); await expectWin(20, 'ESPERE.');

  await sleep(1400);
  console.log('tela final:', (await state()).screen);
  await page.screenshot({ path: SHOTS + 'end.png' });

  const save = await page.evaluate(() => localStorage.getItem('rules.save.v1'));
  console.log('save:', save);
  await page.reload(); await sleep(500);
  console.log('botão após reload:', await page.textContent('#btn-play'));
  await page.click('[data-act="map"]'); await sleep(300);
  await page.screenshot({ path: SHOTS + 'map.png' });
  await page.click('[data-act="menu"]'); await page.click('[data-act="settings"]'); await sleep(200);
  await page.screenshot({ path: SHOTS + 'settings.png' });
  console.log('analytics:', await page.evaluate(() => RULES.Analytics.log.map(e => e.name).join(',')).then(s => s.slice(0, 300)));
  console.log(errors.length ? 'ERROS:\n' + errors.join('\n') : 'sem erros no console');
  if (errors.length) console.log('(erros de rede do contador são esperados fora do site)');
  await browser.close();
})().catch(e => { console.error('FALHOU:', e.message); process.exit(1); });
