/* global CASA, TRABALHO, ROTINAS, rotinaDe */
/* Catraca — a campanha por OCASIÕES

   'Será que faço o conceito de vários dias, ou de uma história por
   fases? Dias, se parar pra pensar na vida real, são monótonos. A
   história do estudante pode passar por 10 fases que representam um ano
   inteiro, mas cada dia é uma ocasião diferente.'

   Estava certo, e o sintoma já existia: a rotina do estudante era
   estágio, UNIPA e casa, TODO dia, pra sempre (ver ROTINAS em
   zipzap.js). O dia 4 era o dia 3 com outro número, e a dificuldade
   subia por fórmula (`GameState.dificuldade`, que conta pernas feitas)
   em vez de por autoria.

   Aqui a campanha é uma lista de OCASIÕES. Cada uma existe porque tem
   motivo: o primeiro dia de estágio, a prova que não dá pra perder, o
   rolê que termina no último trem. Entre uma e outra o tempo pula, e é
   isso que deixa dez fases cobrirem um ano.

   Uma fase é um DIA INTEIRO na vida do personagem: começa quando ele sai
   de casa e acaba quando ele volta. A volta é metade da tensão do jogo,
   porque é nela que o cansaço e o dinheiro cobram — fase que acaba na
   ida perderia justamente isso. Fase curta continua possível sem motor
   novo: é uma fase com uma perna só.

   O que a fase escreve: a ocasião, o relógio e quem te procura. O que
   acontece no caminho continua sorteado pelo jogo.

   Personagem sem fases escritas cai na rotina de sempre (`ROTINAS`), e
   é assim que o resto do elenco continua jogável enquanto só o
   estudante tem campanha. */

var FASES = {
  estudante: [
    {
      titulo: 'PRIMEIRO DIA DE ESTÁGIO',
      quando: 'SEGUNDA',
      premissa: 'A SUELI do RH falou 8h. Ela repetiu duas vezes.',
      pernas: [
        { rotulo: 'O ESTÁGIO', estacao: 'PARAÍSO', saida: 6 * 60 + 50 },
        { rotulo: 'A UNIPA', estacao: 'VERGUEIRO', saida: 13 * 60 + 10 },
        { rotulo: 'CASA', estacao: 'CASA', saida: 22 * 60 + 40 }
      ]
    },
    {
      titulo: 'A PROVA DA UNIPA',
      quando: 'QUINTA, DUAS SEMANAS DEPOIS',
      premissa: 'Prova às 13h. Chegar depois é chegar pra assinar a lista.',
      pernas: [
        { rotulo: 'O ESTÁGIO', estacao: 'PARAÍSO', saida: 7 * 60 + 5 },
        { rotulo: 'A PROVA', estacao: 'VERGUEIRO', saida: 12 * 60 + 5 },
        { rotulo: 'CASA', estacao: 'CASA', saida: 22 * 60 + 10 }
      ]
    },
    {
      titulo: 'O ROLÊ DA UNIPA',
      quando: 'SEXTA',
      premissa: 'A ida é mole. A volta é 23h40, e quem manda é o último trem.',
      pernas: [
        { rotulo: 'A UNIPA', estacao: 'VERGUEIRO', saida: 13 * 60 },
        { rotulo: 'O ROLÊ', estacao: 'LIBERDADE', saida: 19 * 60 + 30 },
        { rotulo: 'CASA', estacao: 'CASA', saida: 23 * 60 + 20 }
      ]
    },
    {
      titulo: 'O REMÉDIO DO PAI',
      quando: 'SÁBADO',
      premissa: 'Sem estágio, sem aula. Só a farmácia da Vila Mariana, e a mãe cobrando.',
      pernas: [
        { rotulo: 'A FARMÁCIA', estacao: 'VILA MARIANA', saida: 9 * 60 + 40 },
        { rotulo: 'CASA', estacao: 'CASA', saida: 13 * 60 }
      ]
    },
    {
      titulo: 'O FISCAL',
      quando: 'SEGUNDA, UM MÊS DEPOIS',
      premissa: 'Tem alguém de colete te esperando na estação. Escapar é vencer.',
      pernas: [
        { rotulo: 'O ESTÁGIO', estacao: 'PARAÍSO', saida: 6 * 60 + 40 },
        { rotulo: 'A UNIPA', estacao: 'VERGUEIRO', saida: 13 * 60 + 10 },
        { rotulo: 'CASA', estacao: 'CASA', saida: 22 * 60 + 40 }
      ]
    },
    {
      titulo: 'A APRESENTAÇÃO',
      quando: 'QUARTA',
      premissa: 'Você apresenta pro MARCÃO às 10h. O notebook da empresa vai na mochila.',
      pernas: [
        { rotulo: 'A APRESENTAÇÃO', estacao: 'PARAÍSO', saida: 8 * 60 + 20 },
        { rotulo: 'A UNIPA', estacao: 'VERGUEIRO', saida: 13 * 60 + 10 },
        { rotulo: 'CASA', estacao: 'CASA', saida: 22 * 60 + 40 }
      ]
    }
  ]
};

/* A fase da vez, ou nula quando a temporada daquele personagem acabou (e
   aí o jogo volta a ser a rotina de sempre, que é o lado sem fim). */
function faseDe(charKey, n) {
  var l = FASES[charKey];
  if (!l || !n || n < 1 || n > l.length) return null;
  return l[n - 1];
}
function temporadaDe(charKey) { return FASES[charKey] || []; }
function ultimaFase(charKey) { return temporadaDe(charKey).length; }

/* As pernas da fase, com o 'CASA' resolvido pra casa de quem joga (a
   mesma regra do `rotinaDe`: o palmeirense mora na Barra Funda). */
function pernasDaFase(charKey, n) {
  var f = faseDe(charKey, n);
  if (!f) return null;
  var out = [], i;
  for (i = 0; i < f.pernas.length; i++) {
    var p = f.pernas[i];
    out.push(p.estacao === 'CASA'
      ? { rotulo: 'CASA', estacao: CASA, saida: p.saida }
      : { rotulo: p.rotulo, estacao: p.estacao, saida: p.saida });
  }
  return out;
}

/* O nome da ocasião, pro balanço e pra linha do tempo. Sem fase escrita,
   o dia se chama pelo número, como antes. */
function nomeDaFase(charKey, n) {
  var f = faseDe(charKey, n);
  return f ? f.titulo : 'DIA ' + n;
}
