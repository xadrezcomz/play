// Roteiros de teste das fases 201–300 (usados por testa-fases.js).
module.exports = ({ unit, touch, sleep, center, board, tapXY, tap, dragXY, drag, dragBy, dragTo, pinch, rub, tapTogether, obj, notWon, restart, pinchAt, spin, drawPath, dragToBoard, page }) => {
  const tapN = async (id, n) => { for (let i = 0; i < n; i++) { await tap(id); await sleep(90); } };
  // arrasta um objeto passando por pontos do tabuleiro (para empurrar e andar em labirintos)
  const walk = async (id, pts, sub = 10) => {
    const c = await center(id); let cur = [c[0], c[1]];
    await touch('touchStart', [cur]);
    for (const p of pts) {
      const t = await board(p[0], p[1]);
      for (let i = 1; i <= sub; i++) { await touch('touchMove', [[cur[0] + (t[0] - cur[0]) * i / sub, cur[1] + (t[1] - cur[1]) * i / sub]]); await sleep(14); }
      cur = t;
    }
    await touch('touchEnd', []); await sleep(120);
  };
  const pos = id => page.evaluate(id => { const o = RULES.Game.engine.get(id); return [Math.round(o.x * 10) / 10, Math.round(o.y * 10) / 10]; }, id);
  return {
    201: ['SANDUÍCHE', async () => {
      await dragTo('cheese', 's1'); await sleep(300); await notWon(201, 'queijo embaixo');
      await dragTo('b1', 's2'); await sleep(200); await dragToBoard('cheese', 50, 62); await sleep(200);
      await restart();
      await dragTo('b1', 's1'); await sleep(200); await dragTo('cheese', 's2'); await sleep(200); await dragTo('b2', 's3');
    }],
    202: ['TORRADA', async () => { await dragTo('bread', 'toaster'); await sleep(1500); await notWon(202, 'sem ligar'); await tap('toaster'); await sleep(3200); }, 4000],
    203: ['MASSA', async () => {
      await dragTo('flour', 'bowl'); await sleep(300); await rub('bowl', 14); await notWon(203, 'mexer sem tudo');
      await dragTo('egg', 'bowl'); await sleep(300); await dragTo('milk', 'bowl'); await sleep(300); await rub('bowl', 16);
    }],
    204: ['COPO VIRADO', async () => {
      const c = await center('cup'), s = await unit();
      await drag('jug', c[0], c[1] - 24 * s, 12, 900); await sleep(300); await notWon(204, 'despejar no copo virado');
      await dragBy('jug', 80, -100); await tap('cup'); await sleep(400);
      const c2 = await center('cup'); await drag('jug', c2[0], c2[1] - 24 * s, 12, 2600);
    }],
    205: ['BOLO AO MEIO', async () => {
      await drawPath([[30, 60], [40, 90]]); await notWon(205, 'linha torta');
      await drawPath([[50, 50], [50, 62], [50, 74], [50, 86], [50, 98]]);
    }],
    206: ['ÁGUA FERVENDO', async () => { await tap('pot'); await notWon(206, 'tocar na panela'); await spin('knob', 0.3); await sleep(3600); }, 4000],
    207: ['BANDEJA', async () => {
      const t = await board(78, 60); await drag('tray', t[0], t[1], 4); await sleep(500); await notWon(207, 'rápido demais');
      await drag('tray', t[0], t[1], 90);
    }],
    208: ['AÇÚCAR', async () => { await tap('ja'); await notWon(208, 'escolher o da esquerda'); await sleep(3000); await tap('jb'); }],
    209: ['BANANA', async () => {
      await dragTo('banana', 'ruli'); await notWon(209, 'banana com casca');
      const c = await center('banana'); await dragXY(c[0], c[1] - 20, c[0] + 5, c[1] + 90, 5); await sleep(300);
      await dragTo('banana', 'ruli');
    }],
    210: ['BOLO', async () => {
      await dragTo('candle', 'top'); await sleep(400); await notWon(210, 'vela sem bolo');
      await dragTo('bowl', 'oven'); await sleep(1500); const o = await board(66, 64); await tapXY(o[0], o[1]); await sleep(3200); await dragTo('candle', 'top');
    }, 4000],
    211: ['TAPETE', async () => { await tap('mat'); await notWon(211, 'tocar no tapete'); await dragBy('mat', 0, -150); await sleep(200); await dragTo('key', 'lock'); }],
    212: ['CHAVE CERTA', async () => { await dragTo('k1', 'lock'); await sleep(400); await notWon(212, 'chave vermelha'); await dragTo('k3', 'lock'); }],
    213: ['SENHA', async () => {
      await tap('d1'); await notWon(213, 'chutar a senha'); await tap('d1');
      await dragBy('pic', 150, -20); await sleep(200);
      for (let i = 2; i < 4; i++) await tap('d1');
      for (let i = 0; i < 7; i++) await tap('d2');
      for (let i = 0; i < 2; i++) await tap('d3');
    }],
    214: ['ANEL', async () => { await tap('ring'); await notWon(214, 'tocar no anel'); await spin('ring', 0.8); }],
    215: ['DOIS CADEADOS', async () => {
      await dragBy('pillow', 0, -170); await sleep(200); await dragTo('kb', 'l1'); await sleep(300); await notWon(215, 'um cadeado');
      await tap('gift'); await sleep(500); await dragTo('ka', 'l2');
    }],
    216: ['BATA NA PORTA', async () => { await tap('knock'); await sleep(800); await notWon(216, 'um toque');
      const c = await center('knock'); for (let i = 0; i < 3; i++) await tapXY(c[0], c[1]); await sleep(300); }],
    217: ['LOJA', async () => { await walk('ruli', [[58, 96]]); await notWon(217, 'Ruli pequeno'); await walk('ruli', [[40, 96]]); await pinch('ruli', 3.2); await sleep(200); await walk('ruli', [[56, 80]]); }],
    218: ['GELO', async () => { await tap('ice'); await notWon(218, 'tocar no gelo'); await dragTo('ice', 'sunny'); await sleep(3800); }, 4000],
    219: ['PLACAS', async () => { await tap('d1'); await notWon(219, 'porta 1'); await tap('d2'); }],
    220: ['FUGA', async () => {
      await dragBy('pic', 0, 140); await sleep(200); await tap('box'); await sleep(300);
      for (let i = 0; i < 7; i++) await tap('d1');
      for (let i = 0; i < 5; i++) await tap('d2');
      await notWon(220, 'faltando um número');
      for (let i = 0; i < 2; i++) await tap('d3');
    }]
  };
};
