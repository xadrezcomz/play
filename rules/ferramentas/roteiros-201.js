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
    }],
    221: ['RULI ESCONDIDO', async () => { await tap('bush'); await notWon(221, 'tocar no arbusto'); await dragBy('bush', -150, 0); await sleep(200); await tap('ruli'); }],
    222: ['QUANTOS RULIS', async () => { await tapN('ans', 2); await tap('ok'); await notWon(222, 'contar 2'); await tapN('ans', 2); await tap('ok'); }],
    223: ['CHAVE EMBAIXO', async () => { await tap('c0'); await tap('c1'); await tap('c2'); await notWon(223, 'abrir as caixas'); await dragBy('c1', 0, -170); await sleep(200); await tap('key'); }],
    224: ['MENSAGEM', async () => { await tap('moon'); await notWon(224, 'adivinhar sem ler'); await rub('paper', 16, 40); await sleep(300); await tap('moon'); }],
    225: ['CAMALEÃO', async () => { await tap('f0'); await notWon(225, 'tocar numa folha');
      const c = await page.evaluate(() => { const r = document.querySelector('[data-obj="cham"]').getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }); await tapXY(c[0], c[1]); }],
    226: ['LUA DE DIA', async () => { await tap('sun'); await notWon(226, 'tocar no sol'); await tap('moon'); }],
    227: ['5 ESTRELAS', async () => {
      for (const s of ['s1', 's2', 's3']) await tap(s);
      await notWon(227, 'três estrelas'); await dragBy('cloud', -80, 160); await sleep(200); await tap('s4'); await tap('s5');
    }],
    228: ['GATO', async () => { const o = await board(30, 100); await tapXY(o[0], o[1]); await notWon(228, 'tocar no vazio'); await tap('cat'); }],
    229: ['ESTRELA GIGANTE', async () => { await tap('star'); await notWon(229, 'tocar no amarelo'); for (let i = 0; i < 4; i++) { await pinch('star', 0.25); await sleep(150); } await tap('star'); }],
    230: ['RULI NA MULTIDÃO', async () => { await tap('p0'); await notWon(230, 'tocar num amigo'); await tap('ruli'); }],
    231: ['ESTRELA NO COPO', async () => { await sleep(2900); await tap('k1'); await sleep(700); await notWon(231, 'copo do meio'); await tap('k0'); }],
    232: ['JOGO DOS COPOS', async () => { await sleep(6800); await tap('k0'); await sleep(700); await notWon(232, 'copo errado'); await tap('k1'); }, 4000],
    233: ['PARES 4', async () => { await tap('m0'); await tap('m1'); await sleep(1000); for (const [a, b] of [['m0', 'm2'], ['m1', 'm3']]) { await tap(a); await tap(b); await sleep(300); } }],
    234: ['PARES 6', async () => { for (const [a, b] of [['m1', 'm3'], ['m2', 'm4'], ['m0', 'm5']]) { await tap(a); await tap(b); await sleep(300); } }],
    235: ['O QUE SUMIU', async () => { await sleep(3900); await tap('o_moon'); await notWon(235, 'escolher a lua'); await tap('o_star'); }],
    236: ['COR DA PORTA', async () => { await sleep(3000); await tap('c_purple'); await notWon(236, 'roxo'); await tap('c_blue'); }],
    237: ['CAMINHO', async () => { await sleep(3800); for (const t of ['t0', 't4', 't5', 't8']) { await tap(t); await sleep(250); } }],
    238: ['QUANTAS ESTRELAS', async () => { await sleep(3000); await tapN('ans', 6); await tap('ok'); await notWon(238, 'contar 6'); await tapN('ans', 1); await tap('ok'); }],
    239: ['QUEM TROCOU', async () => { await sleep(3800); await tap('p0'); await notWon(239, 'o que não saiu'); await tap('p1'); }],
    240: ['PARES 8', async () => { for (const [a, b] of [['m1', 'm3'], ['m0', 'm5'], ['m2', 'm6'], ['m4', 'm7']]) { await tap(a); await tap(b); await sleep(300); } }],
    241: ['PRÓXIMO', async () => { await tap('o24'); await notWon(241, '24'); await tap('o32'); }],
    242: ['QUADRADO MÁGICO', async () => { await tapN('mid', 4); await notWon(242, '4 no meio'); await tap('mid'); }],
    243: ['MESMO NÚMERO', async () => {
      for (const b of ['b0', 'b1', 'b2']) { await dragTo(b, 'A'); await sleep(150); }
      for (const b of ['b3', 'b4']) { await dragTo(b, 'B'); await sleep(150); }
      await sleep(300); await notWon(243, '3 e 2'); await dragBy('b0', 0, 200);
    }],
    244: ['NÃO COMBINA', async () => { await tap('moon'); await notWon(244, 'a lua'); await tap('fish'); }],
    245: ['BOLAS E ESTRELA', async () => { await tapN('ans', 2); await tap('ok'); await notWon(245, 'responder 2'); await tapN('ans', 2); await tap('ok'); }],
    246: ['FIOS', async () => { await tap('sc'); await notWon(246, 'ratinho verde'); await tap('sa'); }],
    247: ['10 + 5', async () => { await spin('hour', 210 / 360); await sleep(300); await notWon(247, '5 horas'); await spin('hour', 300 / 360); }],
    248: ['TRIÂNGULOS', async () => { await tapN('ans', 2); await tap('ok'); await notWon(248, 'contar 2'); await tap('ans'); await tap('ok'); }],
    249: ['MAIS ALTA', async () => { await tap('bia'); await notWon(249, 'Bia'); await tap('ana'); }],
    250: ['HANÓI', async () => {
      const mv = async (d, x) => { await dragToBoard(d, x, 70); await sleep(350); };
      await mv('d2', 80); await notWon(250, 'mexer no disco de baixo');
      await mv('d1', 80); await mv('d2', 50); await mv('d1', 50); await mv('d3', 80); await mv('d1', 20); await mv('d2', 80); await mv('d1', 80);
    }]
  };
};
