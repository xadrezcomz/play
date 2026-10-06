// Joga todas as fases como uma pessoa jogaria (toque, arraste, pinça com dois
// dedos, toque simultâneo, esfregar, espera) e confere também que as
// tentativas "erradas" não completam a fase.
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
  page.on('console', m => { if (m.type() === 'error' && !/ERR_TUNNEL|ERR_CONNECTION|ERR_NAME/.test(m.text())) errors.push('console: ' + m.text()); });
  const cdp = await ctx.newCDPSession(page);

  await page.goto(URL);
  await sleep(600);
  await page.screenshot({ path: SHOTS + '00-menu.png' });

  // ---------- ajudantes ----------
  const center = id => page.evaluate(id => {
    const r = document.querySelector(`[data-obj="${id}"]`).getBoundingClientRect();
    return [r.left + r.width / 2, r.top + r.height / 2, r.width, r.height];
  }, id);
  const board = (x, y) => page.evaluate(([x, y]) => {
    const p = RULES.Stage.toPx(x, y), l = RULES.Stage.layer.getBoundingClientRect();
    return [l.left + p[0], l.top + p[1]];
  }, [x, y]);
  const unit = () => page.evaluate(() => RULES.Stage.s);
  const touch = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map((p, i) => ({ x: p[0], y: p[1], id: p[2] != null ? p[2] : i })) });
  const tapXY = async (x, y) => { await touch('touchStart', [[x, y]]); await sleep(40); await touch('touchEnd', []); await sleep(60); };
  const tap = async id => { const c = await center(id); await tapXY(c[0], c[1]); };
  const dragXY = async (x0, y0, x1, y1, steps = 12, hold = 0) => {
    await touch('touchStart', [[x0, y0]]);
    for (let i = 1; i <= steps; i++) { await touch('touchMove', [[x0 + (x1 - x0) * i / steps, y0 + (y1 - y0) * i / steps]]); await sleep(16); }
    if (hold) await sleep(hold);
    await touch('touchEnd', []);
    await sleep(60);
  };
  const drag = async (id, tx, ty, steps, hold) => { const c = await center(id); await dragXY(c[0], c[1], tx, ty, steps, hold); };
  const dragBy = async (id, dx, dy) => { const c = await center(id); await dragXY(c[0], c[1], c[0] + dx, c[1] + dy); };
  const dragTo = async (id, target) => { const t = await center(target); await drag(id, t[0], t[1]); };
  const pinch = async (id, factor) => {
    const c = await center(id), d0 = 40, d1 = d0 * factor, a = [c[0], c[1], 0];
    await touch('touchStart', [a]); await sleep(30);
    await touch('touchStart', [a, [c[0] + d0, c[1] + d0, 1]]);
    for (let i = 1; i <= 10; i++) { const d = d0 + (d1 - d0) * i / 10; await touch('touchMove', [a, [c[0] + d, c[1] + d, 1]]); await sleep(16); }
    await touch('touchEnd', [a]); await sleep(20); await touch('touchEnd', []); await sleep(60);
  };
  const rub = async (id, n = 16, amp = 30) => {
    const c = await center(id);
    await touch('touchStart', [[c[0], c[1]]]);
    for (let i = 0; i < n; i++) {
      for (let k = 1; k <= 3; k++) { await touch('touchMove', [[c[0] + (i % 2 ? -1 : 1) * amp * k / 3, c[1]]]); await sleep(12); }
    }
    await touch('touchEnd', []); await sleep(80);
  };
  const tapTogether = async (a, b) => {
    const ca = await center(a), cb = await center(b);
    await touch('touchStart', [[ca[0], ca[1], 0]]); await sleep(30);
    await touch('touchStart', [[ca[0], ca[1], 0], [cb[0], cb[1], 1]]); await sleep(60);
    await touch('touchEnd', [[cb[0], cb[1], 1]]); await sleep(20);
    await touch('touchEnd', []); await sleep(100);
  };
  const state = () => page.evaluate(() => ({ lvl: RULES.Game.current, won: RULES.Game.won, screen: RULES.Game.screen, card: !document.querySelector('#chapter-card').hidden }));
  const obj = (id, k) => page.evaluate(([id, k]) => { const o = RULES.Game.engine.get(id); return k ? o.state[k] : { x: o.x, y: o.y, scale: o.scale }; }, [id, k]);
  const waitLevel = async id => {
    for (let i = 0; i < 80; i++) {
      const s = await state();
      if (s.card) { await page.screenshot({ path: SHOTS + 'card-' + id + '.png' }); await tapXY(195, 420); await sleep(300); continue; }
      if (s.lvl === id && !s.won && s.screen === 'play') { await sleep(250); await page.screenshot({ path: SHOTS + String(id).padStart(2, '0') + '.png' }); return; }
      await sleep(100);
    }
    throw new Error('não chegou na fase ' + id);
  };
  const expectWin = async (id, name, ms = 3000) => {
    for (let i = 0; i < ms / 100; i++) { if ((await state()).won) { console.log('OK  fase', String(id).padStart(2, '0'), name); return; } await sleep(100); }
    await page.screenshot({ path: SHOTS + 'FAIL-' + id + '.png' });
    throw new Error('fase ' + id + ' não completou');
  };
  const notWon = async (id, why) => {
    await sleep(350);
    if ((await state()).won) throw new Error('fase ' + id + ' completou cedo demais: ' + why);
    console.log('      não completou com:', why);
  };
  const restart = async () => { await page.evaluate(() => RULES.Game.restart()); await sleep(450); };

  // ---------- as fases ----------
  const LEVELS = {
    1: ['TOQUE NO CÍRCULO', async () => { await tapXY(30, 700); await notWon(1, 'toque fora'); await tap('circle'); }],
    2: ['LEVE A BOLA ATÉ A CAIXA', async () => { await tap('ball'); await notWon(2, 'tocar na bola'); await dragTo('ball', 'box'); }],
    3: ['ABRA A PORTA', async () => { await tap('door'); await notWon(3, 'tocar na porta'); await dragBy('door', 130, 0); }],
    4: ['ACENDA A LUZ', async () => { await tap('bulb'); await notWon(4, 'tocar na lâmpada'); await tap('switch'); }],
    5: ['CÍRCULO NO QUADRADO', async () => {
      await dragTo('circle', 'square'); await sleep(400); await notWon(5, 'círculo grande demais');
      await pinch('circle', 0.35); await dragTo('circle', 'square');
    }],
    6: ['ENCONTRE A ESTRELA', async () => { await tap('c1'); await notWon(6, 'tocar num círculo'); await dragBy('c4', -150, -120); await sleep(200); await tap('star'); }],
    7: ['FAÇA OS DOIS SE ENCONTRAREM', async () => {
      await dragBy('ruli', 300, 0); await notWon(7, 'só um anda (parou no meio)');
      await dragBy('friend', -300, 0);
    }],
    8: ['ENCHA O COPO', async () => {
      await tap('cup'); await notWon(8, 'tocar no copo');
      await dragTo('jug', 'cup'); await notWon(8, 'soltar a jarra no copo');
      const c = await center('cup'), s = await unit();
      await drag('jug', c[0], c[1] - 28 * s, 12, 2600);
    }],
    9: ['COLOQUE TUDO NA CAIXA', async () => {
      for (const id of ['ball', 'star', 'cube']) { await dragTo(id, 'box'); await sleep(200); }
      await notWon(9, 'três objetos sem a palavra');
      await sleep(400); await dragTo('w_all', 'box');
    }],
    10: ['NÃO TOQUE EM NADA', async () => { await sleep(2000); await tapXY(200, 500); await sleep(1500); await notWon(10, 'tocou antes dos 3 s'); await sleep(1800); }],
    11: ['PEGUE A CHAVE', async () => { await dragTo('ruli', 'key'); await notWon(11, 'Ruli foi até a chave (ela fugiu)'); await dragTo('key', 'ruli'); }],
    12: ['CHEGUE À PORTA', async () => {
      await dragBy('ruli', 250, 0); await sleep(700); await notWon(12, 'Ruli caiu no buraco');
      await dragTo('door', 'ruli');
    }],
    13: ['ENCONTRE O MAIOR CÍRCULO', async () => { await tap('c2'); await notWon(13, 'tocar no maior círculo do cenário'); await tap('w_o'); }],
    14: ['FAÇA O SOL APARECER', async () => { await tap('sun').catch(() => {}); await notWon(14, 'tocar no sol escondido'); await dragBy('cloud', -150, 200); }],
    15: ['NÃO APERTE O BOTÃO', async () => { await tap('button'); await notWon(15, 'apertar o botão'); await dragBy('button', 0, 260); await sleep(200); await tap('gem'); }],
    16: ['BOLA NA CAIXA', async () => {
      await dragTo('ball', 'box'); await sleep(400); await notWon(16, 'bola não cabe');
      await pinch('ball', 2); await notWon(16, 'tentar aumentar a bola');
      await pinch('box', 3); await dragTo('ball', 'box');
    }],
    17: ['ENCONTRE O DIFERENTE', async () => { await tap('c1'); await notWon(17, 'tocar num igual'); await tap('c7'); }],
    18: ['ACENDA TODAS AS LUZES', async () => {
      await tap('s1'); await sleep(500); await tap('s2'); await sleep(500); await tap('s3'); await sleep(500);
      console.log('      um por vez:', await obj('b1', 'on'), await obj('b2', 'on'), await obj('b3', 'on'));
      await notWon(18, 'ligar um por vez');
      await restart();
      await tapTogether('s1', 's2'); await sleep(200); await tap('s3');
    }],
    19: ['NÃO DEIXE A BOLA CAIR', async () => {
      await sleep(5200); await notWon(19, 'deixar a bola cair');
      const b = await center('ball'), p = await center('plat');
      await dragXY(p[0], p[1], b[0], p[1]);
    }, 6000],
    20: ['ESPERE.', async () => { await sleep(3500); await tapXY(200, 500); await sleep(3000); await notWon(20, 'tocar no meio da espera'); await sleep(2600); }],
    21: ['ENCONTRE A SAÍDA', async () => { await tap('wall'); await notWon(21, 'bater na parede'); await dragBy('wall', -40, -240); await sleep(200); await tap('door'); }],
    22: ['FAÇA 2 + 2 = 5', async () => {
      await dragBy('loose', 0, 120); await notWon(22, 'tirar o traço do lugar');
      await dragTo('loose', 'slot_c');
    }],
    23: ['PEIXE NA ÁGUA', async () => {
      await dragTo('fish', 'glass'); await sleep(400); await notWon(23, 'copo pequeno');
      await pinch('glass', 3.2); await dragTo('fish', 'glass');
    }],
    24: ['ENCONTRE O AZUL', async () => { await tap('apple'); await notWon(24, 'tocar num objeto'); await tap('w_blue'); }],
    25: ['FAÇA RULI SORRIR', async () => { await tap('ruli'); await notWon(25, 'tocar no Ruli'); await rub('ruli', 18); }],
    26: ['DO MENOR PARA O MAIOR', async () => {
      await dragTo('small', 'p2'); await dragTo('mid', 'p3'); await dragTo('big', 'p4');
      await notWon(26, 'só os três círculos em ordem'); await sleep(500);
      await dragTo('w_min', 'p1'); await dragTo('w_max', 'p5');
    }],
    27: ['ABRA A CAIXA', async () => { await tap('chest'); await notWon(27, 'tocar na caixa'); await dragTo('w_open', 'chest'); }],
    28: ['ESTRELA PARA CIMA', async () => { await dragBy('star', 0, -300); await sleep(400); await notWon(28, 'arrastar a estrela para cima'); await dragTo('w_up', 'star'); }],
    29: ['FAÇA CHOVER', async () => { await tap('cloud'); await notWon(29, 'tocar na nuvem'); await rub('cloud', 22); }],
    30: ['NÃO MOVA RULI', async () => {
      await dragTo('ruli', 'door'); await sleep(400); await notWon(30, 'arrastar o Ruli até a porta');
      const a = await board(60, 112), b = await board(-25, 112);
      await dragXY(a[0], a[1], b[0], b[1], 20);
    }]
  };

  await page.click('#btn-play');
  const ids = await page.evaluate(() => RULES.Levels.order());
  for (const id of ids) {
    const L = LEVELS[id];
    if (!L) throw new Error('sem roteiro de teste para a fase ' + id);
    await waitLevel(id);
    await L[1]();
    await expectWin(id, L[0], L[2] || 3000);
    await sleep(200);
    if ([9, 11, 18, 26].includes(id)) await page.screenshot({ path: SHOTS + String(id).padStart(2, '0') + '-win.png' });
  }

  await sleep(1400);
  console.log('tela final:', (await state()).screen);
  await page.screenshot({ path: SHOTS + 'end.png' });
  await page.reload(); await sleep(500);
  console.log('botão após recarregar:', await page.textContent('#btn-play'));
  await page.click('[data-act="map"]'); await sleep(300);
  await page.screenshot({ path: SHOTS + 'map.png' });
  console.log(errors.length ? 'ERROS:\n' + errors.join('\n') : 'sem erros no console');
  await browser.close();
  process.exit(errors.length ? 1 : 0);
})().catch(e => { console.error('FALHOU:', e.message); process.exit(1); });
