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
    }],
    251: ['DOIS BOTÕES', async () => {
      await tap('bA'); await sleep(700); await tap('bB'); await sleep(500); await notWon(251, 'um depois do outro');
      await tapTogether('bA', 'bB'); await sleep(300);
      if (await page.evaluate(() => RULES.Game.current === 251 && !RULES.Game.won)) { console.log('      (dois dedos não funcionou, usando a pedra)'); await restart(); await dragTo('rock', 'bA'); await sleep(300); await tap('bB'); }
    }],
    252: ['ABRA A CAIXA', async () => { await tap('box'); await notWon(252, 'tocar na caixa'); await pinch('box', 1.9); }],
    253: ['COBRA', async () => { await tap('body'); await notWon(253, 'tocar na cobra'); await pinch('body', 3.2); }],
    254: ['PORTA CALÇADA', async () => {
      await walk('ruli', [[70, 98]]); await notWon(254, 'porta fechada');
      await dragToBoard('wedge', 56, 98); await sleep(300); await dragBy('door', 0, -120); await sleep(800);
      await walk('ruli', [[30, 98], [80, 98]]);
    }],
    255: ['TAMANHO DO BURACO', async () => {
      await dragTo('ball', 'hole'); await sleep(500); await notWon(255, 'bola grande');
      await pinch('ball', 0.52); await sleep(200); const s = await obj('ball'); console.log('      escala', s.scale.toFixed(2));
      await dragTo('ball', 'hole');
    }],
    256: ['DOIS BOTÕES COM PESO', async () => {
      await dragTo('ruli', 'zone1'); await sleep(300); await notWon(256, 'só o Ruli'); await dragTo('friend', 'zone2');
    }],
    257: ['SEPARE', async () => { await tap('hug'); await notWon(257, 'tocar no abraço'); await pinch('hug', 1.8); }],
    258: ['LETRA MIÚDA', async () => { await tap('sun'); await notWon(258, 'chutar o sol'); const c = await center('tiny'); await pinchAt(c[0], c[1], 4); await sleep(200); await tap('star'); }],
    259: ['LUPA', async () => { await tap('leaf'); await notWon(259, 'procurar sem lupa'); await dragToBoard('lens', 74, 58); await sleep(300); await tap('ant'); }],
    260: ['PRESENTE', async () => {
      await tap('gift'); await notWon(260, 'tocar no presente'); await pinch('gift', 1.9); await sleep(400);
      const c = await center('gift'); await dragXY(c[0], c[1] + 20, c[0], c[1] - 120, 5); await sleep(400);
      await dragToBoard('lens', 52, 78); await sleep(300); await tap('ring');
    }],
    261: ['MENOS A ESTRELA', async () => {
      await tap('ball'); await tap('star'); await sleep(200); await tap('cube'); await tap('apple'); await tap('heart'); await notWon(261, 'tocar na estrela no meio');
      await tap('ball');
    }],
    262: ['ESVAZIE', async () => { await tap('cup'); await notWon(262, 'tocar no copo'); await spin('cup', 0.6); }],
    263: ['SETAS TROCADAS', async () => {
      await tap('right'); await tap('right'); await notWon(263, 'seta da direita');
      for (let i = 0; i < 8; i++) { await tap('left'); await sleep(120); }
    }],
    264: ['SIM É NÃO', async () => { await tap('yes'); await notWon(264, 'SIM'); await tap('no'); }],
    265: ['ÚLTIMO', async () => {
      await walk('ruli', [[86, 90]]); await sleep(400); await notWon(265, 'chegar primeiro');
      for (let i = 0; i < 120; i++) { if ((await pos('friend'))[0] >= 83) break; await sleep(100); }
      await walk('ruli', [[86, 90]]);
    }, 4000],
    266: ['BAGUNÇA', async () => { await tap('t1'); await notWon(266, 'tocar'); await dragBy('t1', 0, 150); await dragBy('t2', 0, 180); await sleep(200); await notWon(266, 'falta um'); await dragBy('t3', 0, 150); }],
    267: ['ESVAZIE A CAIXA', async () => { await dragBy('ball', -100, 160); await dragBy('star', 100, 160); await sleep(400); await notWon(267, 'sem a palavra'); await dragBy('all', 0, 190); }],
    268: ['PARA TRÁS', async () => {
      await spin('hand', 0.5); await sleep(300); await notWon(268, 'sentido horário');
      const c = await center('hand'), r = Math.min(c[2], c[3]) * 0.35;
      await touch('touchStart', [[c[0], c[1] - r]]);
      for (let i = 1; i <= 30; i++) { const a = -Math.PI / 2 - i * Math.PI * 2 / 24; await touch('touchMove', [[c[0] + Math.cos(a) * r, c[1] + Math.sin(a) * r]]); await sleep(12); }
      await touch('touchEnd', []); await sleep(200);
    }],
    269: ['ESTOURE O BALÃO', async () => { await sleep(1200); await notWon(269, 'esperar'); await tap('ruli'); await sleep(2500); }, 4000],
    270: ['CONTRÁRIO DA PLACA', async () => {
      await tap('switch'); await tap('moon'); await dragTo('ball', 'box'); await sleep(300); await notWon(270, 'apagar a luz');
      await tap('switch');
    }],
    271: ['CASAS', async () => {
      await dragTo('f_pink', 'z_pink'); await dragTo('f_yellow', 'z_yellow'); await dragTo('f_purple', 'z_purple'); await sleep(300); await notWon(271, 'roxo dormindo');
      await tap('f_purple'); await sleep(600); await dragTo('f_purple', 'z_purple');
    }],
    272: ['ABRAÇO', async () => { await dragTo('ruli', 'shy'); await sleep(500); await notWon(272, 'o tímido foge'); await tap('switch'); await sleep(200); await dragTo('ruli', 'shy'); }],
    273: ['PRESENTES', async () => {
      await dragTo('star', 'fa'); await sleep(400); await notWon(273, 'presente errado');
      await dragTo('apple', 'fa'); await sleep(300); await dragTo('star', 'fb'); await sleep(300); await dragTo('ball', 'fc');
    }],
    274: ['FRIO', async () => { await dragTo('ice', 'cold'); await sleep(400); await notWon(274, 'sorvete'); await dragTo('sun', 'cold'); }],
    275: ['TRISTE', async () => { await tap('c1'); await notWon(275, 'tocar num feliz'); await tap('c4'); }],
    276: ['FILA', async () => { await tap('g1'); await notWon(276, 'tocar num amigo'); await walk('ruli', [[60, 80], [84, 42]], 30); await sleep(3500); }, 5000],
    277: ['DOCES', async () => {
      for (let k = 0; k < 3; k++) { await dragTo('k' + k, 'p1z'); await sleep(150); }
      await sleep(300); await notWon(277, 'três num prato'); await dragTo('k2', 'p2z'); await sleep(150);
      await dragTo('k3', 'p2z'); await dragTo('k4', 'p3z'); await dragTo('k5', 'p3z');
    }],
    278: ['FOTO', async () => {
      for (const q of ['q1', 'q2', 'q3']) { await dragTo(q, 'frame'); await sleep(150); }
      await tap('cam'); await notWon(278, 'faltando o grandão');
      await pinch('big', 0.55); await sleep(200); await dragTo('big', 'frame'); await sleep(200); await tap('cam');
    }],
    279: ['CHAPÉUS', async () => { await dragTo('hat_pink', 'head_pink'); await sleep(500); await notWon(279, 'um chapéu certo'); await dragTo('hat_yellow', 'head_yellow'); await sleep(400); }],
    280: ['FESTA', async () => {
      await dragTo('pp', 'room'); await sleep(200); await tap('ss'); await sleep(300); await dragTo('ss', 'room'); await sleep(500); await notWon(280, 'falta o escondido');
      await dragBy('bush', 0, -160); await sleep(200); await dragTo('hh', 'room');
    }]
  };
};
