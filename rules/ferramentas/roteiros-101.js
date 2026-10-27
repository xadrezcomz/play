// Roteiros de teste das fases 101–200 (usados por testa-fases.js).
module.exports = ({ sleep, center, board, tapXY, tap, dragXY, drag, dragBy, dragTo, pinch, rub, tapTogether, obj, notWon, restart, pinchAt, spin, drawPath, dragToBoard, page }) => {
  const tapN = async (id, n) => { for (let i = 0; i < n; i++) { await tap(id); await sleep(90); } };
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
    }]
  };
};
