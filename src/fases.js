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
   motivo: o primeiro dia de estágio, a reunião com hora marcada, o dia
   do fechamento. Dentro de um ato os dias são seguidos; o tempo pula
   ENTRE atos, e é isso que deixa poucas fases cobrirem um ano.

   Uma fase é um DIA INTEIRO na vida do personagem: começa quando ele sai
   de casa e acaba quando ele volta. A volta é metade da tensão do jogo,
   porque é nela que o cansaço e o dinheiro cobram — fase que acaba na
   ida perderia justamente isso. Fase curta continua possível sem motor
   novo: é uma fase com uma perna só.

   O que a fase escreve: a ocasião, o relógio, o aperto e quem te
   procura. O que acontece no caminho continua sorteado pelo jogo.

   Personagem sem fases escritas cai na rotina de sempre (`ROTINAS`), e
   é assim que o resto do elenco continua jogável enquanto só o
   estudante tem campanha. */

/* Dez por personagem, oito personagens, oitenta na temporada (GDD §13 e
   a decisão de 20/09 no CAMPANHA.md). A lista de fases mostra as dez
   mesmo pra quem ainda não tem nenhuma escrita. */
var FASES_POR_TEMPORADA = 10;

var FASES = {
  /* ---------- Ato 1 do estudante: a primeira semana de estágio ----------
     As cinco fases são os cinco dias que a HISTÓRIA já tinha escritos
     (`HIST_DIAS.estudante`, em historia.js): a Sueli no primeiro dia, a
     reunião do Marcão, o crachá na Sé, o café e o fechamento de sexta.
     Antes as duas listas existiam sem se falar — a fase 2 era uma prova
     na UNIPA enquanto o ZipZap mandava uma reunião — e o jogador ficava
     com duas versões do mesmo dia.

     Aqui não há salto de tempo: a própria história diz que é uma semana
     ('sexta é dia de fechamento'). O salto fica entre ATOS.

     `aperto` é a dificuldade ESCRITA da fase. Ela era fórmula (subia com
     as pernas feitas e com o número do dia), e por isso o dia difícil era
     difícil por acúmulo, nunca porque alguém quis. Agora cada ocasião diz
     o quanto aperta: o primeiro dia é manso, a reunião tem hora marcada,
     o fechamento é o dia do chefão. */
  estudante: [
    {
      titulo: 'PRIMEIRO DIA DE ESTÁGIO',
      quando: 'SEGUNDA',
      premissa: 'A SUELI do RH te espera no Paraíso. Ela falou 8h duas vezes.',
      aperto: 1,
      pernas: [
        { rotulo: 'O ESTÁGIO', estacao: 'PARAÍSO', saida: 6 * 60 + 50 },
        { rotulo: 'A UNIPA', estacao: 'VERGUEIRO', saida: 13 * 60 + 10 },
        { rotulo: 'CASA', estacao: 'CASA', saida: 22 * 60 + 40 }
      ]
    },
    {
      titulo: 'A REUNIÃO DAS 8H',
      quando: 'TERÇA',
      premissa: 'O MARCÃO avisou: quem chega depois das 8h fica do lado de fora.',
      aperto: 1.6,
      pernas: [
        // sai mais tarde de propósito: a folga é menor que a da segunda
        { rotulo: 'A REUNIÃO', estacao: 'PARAÍSO', saida: 7 * 60 + 5 },
        { rotulo: 'A UNIPA', estacao: 'VERGUEIRO', saida: 13 * 60 + 10 },
        { rotulo: 'CASA', estacao: 'CASA', saida: 22 * 60 + 40 }
      ]
    },
    {
      titulo: 'O CRACHÁ',
      quando: 'QUARTA',
      premissa: 'O crachá novo ficou pronto, e está no balcão da baldeação da Sé.',
      aperto: 1.3,
      pernas: [
        { rotulo: 'O ESTÁGIO', estacao: 'PARAÍSO', saida: 6 * 60 + 45 },
        { rotulo: 'A UNIPA', estacao: 'VERGUEIRO', saida: 13 * 60 + 10 },
        { rotulo: 'CASA', estacao: 'CASA', saida: 22 * 60 + 40 }
      ]
    },
    {
      titulo: 'O CAFÉ DO MARCÃO',
      quando: 'QUINTA',
      premissa: 'Um café do metrô pro gestor. E o pessoal da UNIPA marcou rolê hoje.',
      aperto: 1.8,
      pernas: [
        { rotulo: 'O ESTÁGIO', estacao: 'PARAÍSO', saida: 6 * 60 + 55 },
        { rotulo: 'A UNIPA', estacao: 'VERGUEIRO', saida: 13 * 60 + 10 },
        // a volta é mais tarde: é o dia do rolê, e o último trem fica perto
        { rotulo: 'CASA', estacao: 'CASA', saida: 23 * 60 + 10 }
      ]
    },
    {
      titulo: 'O FECHAMENTO',
      quando: 'SEXTA',
      premissa: 'Fechamento do mês, e chegar cedo não é pedido. Tem alguém de colete na estação.',
      aperto: 2.3,
      pernas: [
        { rotulo: 'O FECHAMENTO', estacao: 'PARAÍSO', saida: 6 * 60 + 30 },
        { rotulo: 'A UNIPA', estacao: 'VERGUEIRO', saida: 13 * 60 + 10 },
        { rotulo: 'CASA', estacao: 'CASA', saida: 22 * 60 + 40 }
      ]
    },

    /* ---------- Ato 2 do estudante: o desgaste da rotina ----------
       Fases 6 e 7. Aqui o tempo PULA — a fase 5 era a sexta da primeira
       semana (Mês 1), a fase 6 é o Mês 6 e a 7 é o Mês 8. É o salto entre
       atos que o comentário lá em cima descreve: dentro do ato os dias
       são seguidos, entre atos não. Roteiro fiel a
       `docs/gdd/02-biblia-narrativa.md` (Protagonista 1, fases 6-7). */
    {
      titulo: 'A MAQUETE NO HORÁRIO DE PICO',
      quando: 'QUARTA',
      premissa: 'A maquete do trabalho em grupo não pode chegar amassada. E o trem das 18h30 não tem dó.',
      aperto: 2,
      pernas: [
        { rotulo: 'O ESTÁGIO', estacao: 'PARAÍSO', saida: 6 * 60 + 55 },
        { rotulo: 'A UNIPA', estacao: 'VERGUEIRO', saida: 18 * 60 + 30 },
        { rotulo: 'CASA', estacao: 'CASA', saida: 22 * 60 + 40 }
      ]
    },
    {
      titulo: 'O DILÚVIO DE VERÃO',
      quando: 'QUINTA',
      premissa: 'Temporal alaga a Linha Vermelha. O trem para no escuro, entre estações, por um bom tempo.',
      aperto: 2.6,
      pernas: [
        { rotulo: 'O ESTÁGIO', estacao: 'PARAÍSO', saida: 6 * 60 + 40 },
        { rotulo: 'CASA', estacao: 'CASA', saida: 23 * 60 + 20 }
      ]
    },

    /* ---------- Ato 3 do estudante: o encerramento do ciclo ----------
       Fases 8 a 10. Meses 10, 11 e 12 — o fim do contrato de um ano. A
       fase 10 fecha a temporada inteira do estudante e passa o bastão pro
       CLT (Bíblia Narrativa, Protagonista 1, fase 10 / Protagonista 2). A
       campanha do CLT em si (as 10 fases dele) ainda não existe — é o
       Tier 3 do roadmap (`docs/roadmap-gdd.md`); aqui só o fechamento
       narrativo do estudante, pelo ZipZap (historia.js). */
    {
      titulo: 'A GRANDE PARALISAÇÃO OPERACIONAL',
      quando: 'TERÇA',
      premissa: 'Greve surpresa para a Linha Vermelha. O Marcão quer a entrega hoje do mesmo jeito.',
      aperto: 2.8,
      pernas: [
        { rotulo: 'O ESTÁGIO', estacao: 'PARAÍSO', saida: 6 * 60 + 10 },
        { rotulo: 'CASA', estacao: 'CASA', saida: 22 * 60 + 40 }
      ]
    },
    {
      titulo: 'A PROVA FINAL E A APRESENTAÇÃO ANUAL',
      quando: 'QUARTA',
      premissa: 'De manhã, a apresentação contra o Caio. De noite, a prova final na UNIPA. Sem dormir no meio.',
      aperto: 3,
      pernas: [
        { rotulo: 'A APRESENTAÇÃO', estacao: 'PARAÍSO', saida: 6 * 60 + 45 },
        { rotulo: 'A PROVA', estacao: 'VERGUEIRO', saida: 21 * 60 },
        { rotulo: 'CASA', estacao: 'CASA', saida: 23 * 60 + 30 }
      ]
    },
    {
      titulo: 'O FECHAMENTO DO CONTRATO',
      quando: 'SEXTA',
      premissa: 'Um ano de estágio termina hoje. O Marcão fecha a avaliação.',
      aperto: 2.5,
      pernas: [
        { rotulo: 'A AVALIAÇÃO', estacao: 'PARAÍSO', saida: 6 * 60 + 50 },
        { rotulo: 'CASA', estacao: 'CASA', saida: 19 * 60 }
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
