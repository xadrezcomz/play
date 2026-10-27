// Roteiros de teste das fases 101–200 (usados por testa-fases.js).
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
    101: ['FAÇA UM 6', async () => { await tap('n9'); await notWon(101, 'tocar no 9'); await spin('n9', 0.5); }],
    102: ['SOME 10', async () => { await dragTo('a', 'tray'); await sleep(300); await notWon(102, '9 + 4 = 13'); await spin('n9', 0.5); }],
    103: ['2 MAIOR QUE 8', async () => { await tap('two'); await notWon(103, 'tocar no 2'); await pinch('two', 3.4); }],
    104: ['QUANTAS BOLAS', async () => {
      await tapN('ans', 4); await tap('ok'); await notWon(104, 'contar 4');
      await dragBy('box', 0, -170); await tapN('ans', 2); await tap('ok');
    }],
    105: ['FAÇA UM 8', async () => { await tap('z1'); await notWon(105, 'tocar no zero'); await dragTo('z1', 'z2'); }],
    106: ['SÓ OS PARES', async () => {
      await dragTo('t2', 'bin'); await sleep(300);
      for (const id of ['t3', 't5', 't7']) { await dragTo(id, 'bin'); await sleep(200); }
      await notWon(106, 'só os ímpares da mesa'); await sleep(300); await dragTo('d1', 'bin');
    }],
    107: ['DO MENOR PARA O MAIOR', async () => {
      for (const id of ['n1', 'n2', 'n3']) { await tap(id); await sleep(100); }
      await notWon(107, '1, 2, 3 sem o zero');
      for (const id of ['w0', 'n1', 'n2', 'n3']) { await tap(id); await sleep(100); }
    }],
    108: ['CADEADO', async () => {
      await tapN('d1', 2); await tapN('d2', 4); await tapN('d3', 1); await sleep(300); await notWon(108, '2-4-1 sem a estrela escondida');
      await dragBy('cloud', -150, 80); await tapN('d2', 1);
    }],
    109: ['3 HORAS', async () => { await spin('hour', 150 / 360); await sleep(300); await notWon(109, 'só o ponteiro pequeno'); await spin('minute', 0.5); }],
    110: ['QUANTOS QUADRADOS', async () => { await tapN('ans', 4); await tap('ok'); await notWon(110, 'contar 4'); await tapN('ans', 1); await tap('ok'); }],
    111: ['3 LUZES', async () => { await tap('s1'); await tap('s2'); await notWon(111, 's1 + s2'); await tap('s2'); await tap('s3'); }],
    112: ['APAGUE TODAS', async () => { await tap('b2'); await notWon(112, 'tocar numa do meio'); await tap('b2'); await tap('b1'); await tap('b4'); }],
    113: ['TOMADA', async () => { await tap('switch'); await tap('switch'); await notWon(113, 'ligar e desligar'); await dragTo('plug', 'socket'); }],
    114: ['DOIS INTERRUPTORES', async () => { await tap('s1'); await notWon(114, 'só um interruptor'); await dragBy('note', -60, -170); await sleep(150); await tap('s2'); }],
    115: ['RÁDIO', async () => { await dragTo('battery', 'radio'); await sleep(400); await notWon(115, 'pilha sem carga'); await dragTo('sun', 'battery'); await sleep(400); await dragTo('battery', 'radio'); }],
    116: ['VELAS', async () => {
      await dragTo('c1', 'c2'); await sleep(400); await notWon(116, 'vela apagada na outra');
      await rub('fire', 16); await sleep(200); await dragTo('c1', 'fire'); await sleep(500); await dragTo('c1', 'c2'); await sleep(400); await dragTo('c1', 'c3');
    }],
    117: ['3x3', async () => { await tap('g4'); await notWon(117, 'só o centro'); await tap('g4'); for (const g of ['g0', 'g2', 'g4', 'g6', 'g8']) await tap(g); }],
    118: ['SÓ UMA ACESA', async () => { await tap('r0'); await notWon(118, 'uma lâmpada'); await tap('r0'); await tap('r1'); await tap('r3'); }],
    119: ['APAGUE TUDO', async () => { await tap('s1'); await tap('s2'); await notWon(119, 'só as lâmpadas'); await tap('curtain'); }],
    120: ['TODAS AS LUZES', async () => {
      for (const s of ['s1', 's2', 's3']) await tap(s);
      await notWon(120, 'as três lâmpadas');
      await page.evaluate(() => RULES.Game.openHint()); await sleep(500); await page.evaluate(() => RULES.Hints.close()); await sleep(200);
    }],
    121: ['EMPURRE A CAIXA', async () => { await tap('crate'); await notWon(121, 'tocar na caixa'); await walk('ruli', [[30, 90], [70, 90]]); }],
    122: ['CAIXA ATÉ O X', async () => { await walk('ruli', [[46, 104], [46, 55]]); await notWon(122, 'só para cima'); await walk('ruli', [[28, 55], [28, 42], [68, 42]]); }],
    123: ['BOLA NO BURACO', async () => { await walk('ruli', [[40, 66], [66.5, 66]]); await walk('ruli', [[60, 66], [60, 50], [78, 50], [78, 86]]); }],
    124: ['CAIXA PRESA', async () => { await walk('ruli', [[30, 36], [14, 36]]); await notWon(124, 'empurrar a caixa no canto'); await dragTo('w_box', 'x'); }],
    125: ['CADA CAIXA NO SEU X', async () => {
      await walk('ruli', [[30, 90], [71, 90]]); await notWon(125, 'só a vermelha');
      await walk('ruli', [[71, 104], [40, 104], [40, 50.5]]);
    }],
    126: ['RULI NA PORTA', async () => { await tap('ruli'); await notWon(126, 'tocar no Ruli'); await walk('ball', [[30, 90], [80, 90]]); }],
    127: ['TAPETE', async () => {
      await walk('ruli', [[8, 64], [8, 46], [17, 46]]);
      await walk('ruli', [[17, 30], [30, 30], [30, 77.6]]); await notWon(127, 'uma caixa');
      await walk('ruli', [[36, 70], [36, 25], [50, 25], [50, 77.6]]);
      await walk('ruli', [[50, 66], [91, 66], [91, 52], [83, 52]]);
      await walk('ruli', [[83, 36], [70, 36], [70, 77.6]]);
    }],
    128: ['DOMINÓ', async () => { await dragToBoard('d5', 76, 91); await sleep(300); await walk('ruli', [[24, 92], [30, 92]]); await sleep(1500); }, 4000],
    129: ['SALA', async () => { await walk('ruli', [[24, 72], [60, 72]]); await notWon(129, 'caixa ainda na sala'); await walk('ruli', [[80, 72]]); }],
    130: ['NICHOS', async () => {
      await walk('ruli', [[52, 104], [52, 72], [38.75, 72]]);
      await walk('ruli', [[38.75, 84], [30, 84], [30, 30]]);
      await walk('ruli', [[30, 60], [52, 60], [52, 90], [61.25, 90]]);
      await walk('ruli', [[61.25, 104], [70, 104], [70, 30]]);
    }],
    131: ['LABIRINTO', async () => { await walk('ruli', [[15, 80]]); await notWon(131, 'bater na parede'); await walk('ruli', [[25.0,47.0],[35.0,47.0],[35.0,57.0],[35.0,67.0],[25.0,67.0],[15.0,67.0],[15.0,77.0],[15.0,87.0],[15.0,97.0],[25.0,97.0],[35.0,97.0],[35.0,87.0],[45.0,87.0],[55.0,87.0],[55.0,97.0],[65.0,97.0],[75.0,97.0],[85.0,97.0]]); }],
    132: ['BANDEIRA FECHADA', async () => { await walk('ruli', [[85, 47], [85, 97]]); await notWon(132, 'rodear o labirinto'); await dragTo('flag', 'ruli'); }],
    133: ['BLOCO SOLTO', async () => { await walk('ruli', [[35, 67], [70, 67]]); await notWon(133, 'parede no caminho'); await dragBy('mwall', 0, 200); await sleep(200); await walk('ruli', [[75, 67]]); }],
    134: ['FRESTA', async () => { await walk('ruli', [[45, 118]]); await notWon(134, 'Ruli grande demais'); await pinch('ruli', 0.3); await sleep(200); await walk('ruli', [[45, 100], [45, 119]]); }],
    135: ['ESCURO', async () => { await walk('ruli', [[15.0,57.0],[15.0,67.0],[15.0,77.0],[25.0,77.0],[35.0,77.0],[35.0,67.0],[35.0,57.0],[35.0,47.0],[45.0,47.0],[55.0,47.0],[65.0,47.0],[75.0,47.0],[85.0,47.0],[85.0,57.0],[85.0,67.0],[85.0,77.0],[85.0,87.0],[85.0,97.0],[75.0,97.0],[65.0,97.0],[55.0,97.0],[55.0,87.0],[55.0,77.0]]); }],
    136: ['CHAVE', async () => { await walk('ruli', [[25.0,47.0],[35.0,47.0],[35.0,57.0],[35.0,67.0],[45.0,67.0],[55.0,67.0],[55.0,57.0],[55.0,47.0],[65.0,47.0],[75.0,47.0],[85.0,47.0],[85.0,57.0],[85.0,67.0],[75.0,67.0],[85.0,67.0],[85.0,77.0],[85.0,87.0],[85.0,97.0]]); }],
    137: ['PORTAL', async () => { await walk('ruli', [[25.0,47.0],[35.0,47.0],[45.0,47.0]]); await sleep(300); await walk('ruli', [[25.0,87.0],[35.0,87.0],[45.0,87.0],[55.0,87.0],[65.0,87.0],[65.0,97.0],[75.0,97.0],[85.0,97.0],[85.0,87.0],[85.0,77.0],[85.0,67.0]]); }],
    138: ['RATINHO', async () => {
      await walk('ruli', [[85, 47], [85, 55]]);
      for (let i = 0; i < 80; i++) { const c = await pos('cat'); if (c[0] < 30) break; await sleep(60); }
      await walk('ruli', [[85, 77], [85, 97]], 5);
    }, 4000],
    139: ['INVISÍVEL', async () => { await walk('ruli', [[35, 47]]); await notWon(139, 'bater na parede invisível'); await walk('ruli', [[15.0,57.0],[15.0,67.0],[15.0,77.0],[25.0,77.0],[35.0,77.0],[45.0,77.0],[45.0,87.0],[45.0,97.0],[35.0,97.0],[25.0,97.0],[15.0,97.0]]); }],
    140: ['LABIRINTO SEM SAÍDA', async () => { await walk('ruli', [[45, 100]]); await notWon(140, 'sem saída'); await dragToBoard('frame', 50, 30); await sleep(200); await walk('ruli', [[95, 67], [95, 107]]); }],
    141: ['PALAVRA AZUL', async () => { await tap('wb'); await notWon(141, 'tocar em AZUL'); await tap('wr'); }],
    142: ['LARANJA', async () => { await dragTo('blue', 'c'); await sleep(300); await notWon(142, 'pintar de azul'); await dragTo('red', 'yellow'); await sleep(400); await dragTo('orange', 'c'); }],
    143: ['TUDO ROXO', async () => {
      for (const t of ['c1', 'c2', 'ruli']) { await dragTo('paint', t); await sleep(350); }
      await notWon(143, 'sem a palavra TUDO'); await dragTo('paint', 'w_all');
    }],
    144: ['QUADRADOS IGUAIS', async () => { await tap('no'); await notWon(144, 'dizer que não'); await dragTo('q1', 'q2'); await tap('yes'); }],
    145: ['ESCONDA O RULI', async () => { await dragTo('ruli', 'bushfill'); await sleep(400); await notWon(145, 'Ruli azul no arbusto'); await dragTo('pg', 'ruli'); await sleep(400); }],
    146: ['CÍRCULO BRANCO', async () => { await dragTo('p2', 'c'); await sleep(300); await notWon(146, 'pintar de amarelo'); await rub('c', 20); }],
    147: ['SEPARE AS CORES', async () => {
      for (const [b, k] of [['r1', 'kr'], ['r2', 'kr'], ['y1', 'ky'], ['b1', 'kb']]) { await dragTo(b, k); await sleep(200); }
      await notWon(147, 'sem a bola cinza'); await dragTo('pb', 'gray'); await sleep(400); await dragTo('gray', 'kb');
    }],
    148: ['QUAL VEM DEPOIS', async () => { await tap('o1'); await notWon(148, 'azul grande'); await tap('o3'); }],
    149: ['RULI VERDE', async () => { await dragTo('pb', 'ruli'); await sleep(300); await notWon(149, 'Ruli azul'); await dragTo('pb', 'pal'); await sleep(300); await dragTo('py', 'pal'); await sleep(300); await dragTo('pal', 'ruli'); }],
    150: ['ARCO-ÍRIS', async () => {
      const mix = async (cols, target) => { await tap('pal'); await sleep(150); for (const c of cols) { await dragTo(c, 'pal'); await sleep(300); } await dragTo('pal', target); await sleep(400); };
      await dragTo('pr', 'a0'); await sleep(350); await dragTo('py', 'a2'); await sleep(350); await dragTo('pb', 'a4'); await sleep(350);
      await notWon(150, 'só as cores puras');
      await mix(['pr', 'py'], 'a1'); await mix(['pb', 'py'], 'a3'); await mix(['pr', 'pb'], 'a5');
    }, 4000],
    151: ['BALÃO', async () => { await tap('pump'); await notWon(151, 'um toque'); const c = await center('pump'); await touch('touchStart', [[c[0], c[1]]]); await sleep(1600); await touch('touchEnd', []); await sleep(900); }],
    152: ['PINTINHO', async () => { await tap('egg'); await sleep(700); await tap('egg'); await sleep(700); await notWon(152, 'toques lentos');
      const c = await center('egg'); for (let i = 0; i < 3; i++) { await tapXY(c[0], c[1]); } }],
    153: ['MAÇÃ', async () => { await dragTo('apple', 'basket'); await notWon(153, 'arrastar a maçã no alto'); await rub('tree', 14, 40); await sleep(1800); await dragTo('apple', 'basket'); }, 4000],
    154: ['VELA', async () => { await tap('candle'); await notWon(154, 'tocar na vela'); const c = await center('candle'); await dragXY(c[0] - 10, c[1], c[0] + 110, c[1] - 20, 5); }],
    155: ['LIVRO', async () => { await tap('book'); await notWon(155, 'tocar no livro');
      for (let i = 0; i < 2; i++) { const c = await center('book'); await dragXY(c[0] + 60, c[1] + 40, c[0] - 80, c[1] + 40, 5); await sleep(300); }
      await tap('star'); }],
    156: ['CORTINA', async () => { await tap('curtain'); await notWon(156, 'tocar na cortina'); await dragBy('rope', 0, 120); }],
    157: ['PANELA', async () => { await tap('pan'); await notWon(157, 'tocar na panela'); await rub('pan', 18, 40); }],
    158: ['CHAVE', async () => { await tap('key'); await notWon(158, 'tocar na chave'); await spin('key', 0.3); }],
    159: ['CACHORRO', async () => { await dragTo('bone', 'dog'); await sleep(300); await notWon(159, 'dar o osso'); await rub('dog', 18, 40); }],
    160: ['CÍRCULO', async () => { await tap('ruli'); await notWon(160, 'tocar no Ruli');
      const pts = []; for (let i = 0; i <= 26; i++) { const a = i / 24 * Math.PI * 2; pts.push([50 + 20 * Math.cos(a), 80 + 20 * Math.sin(a)]); }
      await drawPath(pts); }],
    161: ['ESTRELA DORMINDO', async () => { await tap('star'); await notWon(161, 'tocar na estrela acordada'); await sleep(4300); await tap('star'); }, 4000],
    162: ['PARE NO 12', async () => {
      for (let k = 0; k < 8; k++) {
        // mede a velocidade real e calcula quando o ponteiro chega perto do topo
        const r0 = await page.evaluate(() => [RULES.Game.engine.get('hand').rot, performance.now()]); await sleep(300);
        const r1 = await page.evaluate(() => [RULES.Game.engine.get('hand').rot, performance.now()]);
        const v = (((r1[0] - r0[0]) + 360) % 360) / (r1[1] - r0[1]);
        const wait = (((352 - r1[0]) + 360) % 360) / v - 70;
        await sleep(Math.max(0, wait));
        await tap('stop'); await sleep(300);
        if ((await page.evaluate(() => RULES.Game.won))) return;
        await sleep(900);
      }
    }],
    163: ['OVO FRITO', async () => { await dragTo('egg', 'pan'); await sleep(800); await dragBy('egg', -100, -150); await sleep(300); await notWon(163, 'tirar cedo'); await dragTo('egg', 'pan'); await sleep(3000); }],
    164: ['SEMÁFORO', async () => {
      await walk('ruli', [[50, 90]]); await sleep(500); await notWon(164, 'atravessar no vermelho');
      for (let i = 0; i < 100; i++) { if ((await obj('light', 'light')) === 'green') break; await sleep(60); }
      await walk('ruli', [[86, 90]], 6);
    }, 4000],
    165: ['LUA', async () => { await tap('sky'); await notWon(165, 'tocar no céu de dia'); await sleep(6800); await tap('moon'); }],
    166: ['PARE NO 5', async () => {
      await tap('n'); await notWon(166, 'tocar fora da hora');
      for (let i = 0; i < 300; i++) { if ((await obj('n', 'n')) === 5) break; await sleep(15); }
      await tap('n');
    }],
    167: ['AO CONTRÁRIO', async () => { await sleep(3800); for (const id of ['l2', 'l4', 'l1']) { await tap(id); await sleep(250); } }],
    168: ['PLANTA', async () => { await dragTo('can', 'plant'); await sleep(300); await tap('plant'); await sleep(1500); await tap('plant'); await notWon(168, 'mexer na planta'); await sleep(3600); }],
    169: ['RATINHO', async () => {
      for (let i = 0; i < 400; i++) {
        const v = await page.evaluate(() => { const m = RULES.Game.engine.get('mouse'); return !m.hidden; });
        if (v) { await tap('mouse'); await sleep(200); }
        if ((await obj('score', 'n')) >= 3) break;
        await sleep(30);
      }
    }],
    170: ['ADIANTE O RELÓGIO', async () => { await spin('hand', 3); await sleep(200); await spin('hand', 3); await sleep(200); await spin('hand', 3); }],
    171: ['BALANÇA', async () => {
      await dragTo('b1', 'panR'); await sleep(200); await dragTo('b2', 'panR'); await sleep(500); await notWon(171, 'só duas bolas');
      await dragTo('cube', 'panR'); await sleep(600);
    }],
    172: ['PESE 5', async () => {
      for (const w of ['w1', 'w2', 'w4']) { await dragTo(w, 'panR'); await sleep(300); }
      await sleep(400); await notWon(172, 'os três pesos'); await dragToBoard('w2', 50, 104); await sleep(600);
    }],
    173: ['1 KG', async () => { await tap('sackB'); await notWon(173, 'escolher as pedras'); await tap('same'); }],
    174: ['ALAVANCA', async () => {
      await dragToBoard('ruli', 76, 84); await sleep(600); await notWon(174, 'só o Ruli (equilibra)');
      await dragToBoard('ball', 80, 84); await sleep(700);
    }],
    175: ['MOEDA LEVE', async () => {
      await dragTo('c1', 'panL'); await dragTo('c3', 'panR'); await sleep(600);
      await tap('c1'); await notWon(175, 'tocar numa moeda normal'); await tap('c3');
    }],
    176: ['METADE', async () => {
      const c = await center('cup'), s = await unit();
      await drag('jug', c[0], c[1] - 24 * s, 12, 3600); await sleep(300); await notWon(176, 'copo cheio demais');
      await dragBy('jug', 90, -120); await tap('cup'); await sleep(200);
      await drag('jug', c[0], c[1] - 24 * s, 12, 1700); await sleep(300);
    }],
    177: ['ESTRELA NA CESTA', async () => {
      await dragBy('shelf', -40, 260); await sleep(1500); await notWon(177, 'tirar a prateleira sem a cesta');
      await restart(); await dragToBoard('basket', 62, 98); await sleep(300); await dragBy('shelf', 80, 260); await sleep(1600);
    }, 4000],
    178: ['TORRE', async () => {
      await dragTo('s', 'b'); await sleep(900); const b = await center('b'); await notWon(178, 'pequeno no grande');
      await dragToBoard('s', 84, 80); await sleep(1200);
      await dragTo('m', 'b'); await sleep(1200); await dragTo('s', 'm'); await sleep(1200);
    }, 4000],
    179: ['AFUNDE', async () => { await dragToBoard('rock', 30, 96); await sleep(400); await notWon(179, 'pedra sozinha'); await dragTo('rock', 'ball'); }, 4000],
    180: ['GANGORRA', async () => { await dragTo('feather', 'end'); await sleep(700); await notWon(180, 'pena leve demais'); await dragTo('rock', 'end'); await sleep(1300); }, 4000],
    181: ['SOMBRAS', async () => {
      await dragTo('star', 's_star'); await dragTo('apple', 's_apple'); await sleep(300); await notWon(181, 'sem o Ruli');
      await dragTo('ruli', 's_ruli');
    }],
    182: ['ESPELHO MÓVEL', async () => {
      await dragToBoard('ruli', 20, 88); await sleep(300); await notWon(182, 'só o Ruli na bandeira');
      await dragToBoard('mirror', 42, 70); await sleep(300);
    }],
    183: ['RELÓGIO NO ESPELHO', async () => { await tap('o3'); await notWon(183, 'ler 3 horas'); await tap('o9'); }],
    184: ['FRASE NO ESPELHO', async () => { await tap('ball'); await notWon(184, 'tocar na bola'); await tap('star'); }],
    185: ['SOMBRA', async () => { await tap('lamp'); await notWon(185, 'tocar na lâmpada'); await dragToBoard('lamp', 88, 44); }],
    186: ['REFLEXO NA ÁGUA', async () => { await dragToBoard('ruli', 20, 40); await notWon(186, 'andar para o lado'); await dragToBoard('ruli', 50, 72); }],
    187: ['LUA EM CASA', async () => { await tap('moon'); await notWon(187, 'tocar na lua'); await dragTo('bucket', 'house'); }],
    188: ['BORBOLETA', async () => { await dragTo('wr', 'slot'); await sleep(500); await notWon(188, 'asa virada'); await tap('wr'); await sleep(200); await dragTo('wr', 'slot'); }],
    189: ['ERRO NO ESPELHO', async () => { await tap('r_ball'); await notWon(189, 'tocar num reflexo certo'); await tap('r_star'); }],
    190: ['PORTA NO ESPELHO', async () => { await walk('ruli', [[46, 93]]); await notWon(190, 'ir até o espelho'); await walk('ruli', [[10, 93]]); }],
    191: ['MAÇÃ', async () => { await tap('tree'); await notWon(191, 'procurar na árvore'); await dragTo('w_apple', 'ruli'); }],
    192: ['ACORDE', async () => { await tap('ruli'); await notWon(192, 'tocar no Ruli'); await dragTo('w_wake', 'ruli'); }],
    193: ['GATO E RATO', async () => { await dragBy('w1', 0, 200); await sleep(400); await notWon(193, 'tirar a palavra'); await dragTo('w1', 'w3'); }],
    194: ['FELIZ', async () => { await rub('ruli', 14); await sleep(300); await notWon(194, 'fazer carinho'); await dragTo('w_happy', 'sad'); }],
    195: ['MAIS LONGA', async () => { await tap('c'); await notWon(195, 'a maior palavra'); await tap('w_long'); }],
    196: ['ÚLTIMA', async () => { await tap('fim'); await notWon(196, 'tocar em FIM'); await tap('w_last'); }],
    197: ['PLACA', async () => { await sleep(2500); await tap('star'); await sleep(2000); await notWon(197, 'tocar na estrela'); await sleep(3000); }, 4000],
    198: ['ARCO-ÍRIS', async () => { await dragTo('w_a', 'w_b'); }],
    199: ['EM ORDEM', async () => { for (let k = 1; k <= 5; k++) { await dragTo('w' + k, 's' + k); await sleep(200); } }],
    200: ['FRASE VERDADEIRA', async () => {
      await dragBy('t4', 0, 260); await dragBy('t5', 0, 340); await sleep(300); await notWon(200, 'tirar o TRÊS');
      await restart(); await dragBy('t1', 0, 260); await dragBy('t2', 0, 340);
    }]
  };
};
