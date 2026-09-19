/* global Phaser */
/* =========================================================
   CATRACA — núcleo (16-bit)
   Resolução 320x576 · tile 32 · personagem 32x48
   Cada material tem rampa de 3 tons: luz, base e sombra.
   ========================================================= */

/* O HUD cresceu de 44 pra 52. Não era só o aperto lateral: as duas
   linhas tinham 6 pixels entre uma tinta e outra, e duas fileiras de
   coisa colada lê como um bloco só. Com 52 a distância vai pra 12, que
   é o que separa "duas linhas" de "uma linha grossa". Custa oito
   pixels de jogo, e todas as cenas desenham a partir de HUD_H. */
var GW = 320, GH = 576, HUD_H = 52;

/* ---------- cor ---------- */
function hex2rgb(h) {
  h = h.replace('#', '');
  return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)];
}
function rgb2hex(r, g, b) {
  function p(v) { v = Math.max(0, Math.min(255, Math.round(v))); return (v < 16 ? '0' : '') + v.toString(16); }
  return '#' + p(r) + p(g) + p(b);
}
function mistura(a, b, t) {
  var x = hex2rgb(a), y = hex2rgb(b);
  return rgb2hex(x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t);
}
function clarear(c, t) { return mistura(c, '#ffffff', t); }
function escurecer(c, t) { return mistura(c, '#0a0a12', t); }
function num(c) { return parseInt(c.replace('#', ''), 16); }

var PAL = {
  bg: '#0b0b12', preto: '#08080e',
  piso: '#3f3f52', pisoLuz: '#50506a', pisoSom: '#2c2c3b', rejunte: '#242430',
  parede: '#5f6c8f', paredeLuz: '#7f8cb0', paredeSom: '#39415f',
  amarelo: '#f2c14e', amareloLuz: '#ffe08a', amareloSom: '#a87a24',
  trilho: '#a3a9be', trilhoSom: '#6a7085', brita: '#14141c', dormente: '#332e28',
  metal: '#8d92a6', metalLuz: '#b3b8cb', metalSom: '#4f5468',
  madeira: '#8a5a34', madeiraSom: '#5c3c22',
  branco: '#f2f0ff', cinza: '#8b90a6', cinzaEsc: '#5a5f74',
  verde: '#00e676', roxo: '#7c3fff', vermelho: '#e8362c', azul: '#0b5fae',
  laranja: '#e8a33c'
};

/* As duas linhas inteiras, na ordem real, e a Sé no meio das duas — que
   é o que faz a baldeação existir. A vermelha só ia da Sé pra oeste; sem
   a metade leste não dava pra morar em Itaquera, que é de onde a maior
   parte da cidade pega esse trem.

   Nome de placa, não nome de portaria: 'ITAQUERA' e não
   'CORINTHIANS-ITAQUERA', porque a barra do HUD tem 320px e o relógio
   mora na outra ponta dela. */
var LINHAS = {
  azul: {
    nome: 'LINHA 1-AZUL', cor: '#0b5fae', num: 0x0b5fae,
    estacoes: ['JABAQUARA', 'CONCEIÇÃO', 'SÃO JUDAS', 'SAÚDE', 'PÇA. ÁRVORE',
      'SANTA CRUZ', 'VILA MARIANA', 'ANA ROSA', 'PARAÍSO', 'VERGUEIRO',
      'SÃO JOAQUIM', 'LIBERDADE', 'SÉ', 'SÃO BENTO', 'LUZ', 'TIRADENTES',
      'ARMÊNIA', 'PORTUGUESA', 'CARANDIRU', 'SANTANA', 'JD.SÃO PAULO',
      'PD. INGLESA', 'TUCURUVI']
  },
  vermelha: {
    nome: 'LINHA 3-VERMELHA', cor: '#e8362c', num: 0xe8362c,
    estacoes: ['BARRA FUNDA', 'MAL. DEODORO', 'STA. CECÍLIA', 'REPÚBLICA',
      'ANHANGABAÚ', 'SÉ', 'PEDRO II', 'BRÁS', 'BRESSER', 'BELÉM', 'TATUAPÉ',
      'CARRÃO', 'PENHA', 'VILA MATILDE', 'GUILHERMINA', 'PATRIARCA',
      'ARTUR ALVIM', 'ITAQUERA']
  }
};

/* ---------- o mapa da rede, desenhado num lugar so ----------
   O mapa do celular eram duas linhas verticais paralelas, lado a lado,
   com a Se ligando as duas por fora. Nao e assim que a rede e, e nao e
   assim que ninguem em Sao Paulo a tem na cabeca: a Azul desce, a
   Vermelha atravessa, e elas se CRUZAM na Se. A baldeacao e o assunto
   do jogo inteiro — a perna de ida troca de linha ali todo dia — e o
   desenho que estava no bolso escondia justamente isso.

   Em cruz o cruzamento e uma coisa so, e a pergunta "falta muito" passa
   a ter resposta geometrica: e o quanto falta ate a esquina.

   A funcao desenha e nao escreve. Quem chama e que sabe fazer texto —
   o celular tem uma reserva de BitmapText, a parede da estacao cria os
   dela — entao os rotulos saem por um `rotula(txt, x, y, cor)`, com x
   ja resolvido pela esquerda.
   O que nao pode se repetir e ONDE cada nome vai, e isso fica aqui.

   Todo rotulo ganha uma chapa escura atras. Nao e enfeite: os nomes das
   pontas cruzam a outra linha (BARRA FUNDA tem 132px e a Azul passa em
   79) e letra clara sobre risco colorido nao se le. Chapa atras de
   texto e a gramatica de placa que o resto do jogo ja usa. */
function desenhaMapaRede(g, x0, y0, W, H, opts) {
  opts = opts || {};
  var rotula = opts.rotula || function () {};
  var eu = opts.eu, linhaEu = opts.linhaEu, alvo = opts.alvo;
  var az = LINHAS.azul, vm = LINHAS.vermelha;
  var nA = az.estacoes.length, nV = vm.estacoes.length;

  /* A Azul do indice 0 e JABAQUARA, que e a ponta SUL: no papel ela vai
     embaixo. Por isso o y anda ao contrario do indice. A Vermelha do 0 e
     BARRA FUNDA, oeste, e essa bate com a esquerda direto. */
  function yAz(i) { return y0 + Math.round(H * (1 - i / (nA - 1))); }
  function xVm(j) { return x0 + Math.round(W * j / (nV - 1)); }

  var CX = xVm(vm.estacoes.indexOf(BALDEACAO));
  var CY = yAz(az.estacoes.indexOf(BALDEACAO));

  // o tronco, com a sombra por baixo pra linha nao virar risco de caneta
  g.fillStyle(0x000000, 0.45).fillRect(CX - 3, y0 + 2, 7, H);
  g.fillStyle(0x000000, 0.45).fillRect(x0, CY - 3, W, 7);
  g.fillStyle(az.num, 1).fillRect(CX - 2, y0, 5, H);
  g.fillStyle(vm.num, 1).fillRect(x0, CY - 2, W, 5);

  /* A chapa do rotulo. O texto do jogo tem 12px por caractere e a tinta
     mora de y+5 a y+19 dentro de uma caixa de 24 — a chapa acompanha a
     TINTA, senao ela sobra por cima e por baixo e vira retangulo solto.

     E o rotulo e PRESO no limite. O primeiro que escapou foi o VOCÊ de
     quem esta em ITAQUERA: a ponta leste mora na borda direita do
     desenho, o nome ia 14px a direita dela e saia pela lateral do
     aparelho — justamente na estacao onde o jogador COMECA todo dia.
     Preso, ele volta pra dentro e encosta na borda, que e o que uma
     placa faz quando o espaco acaba.

     Por isso a ancora nao sai daqui: quem chama recebe a x ja resolvida,
     sempre pela esquerda. Duas contas da mesma coisa saem de sincronia
     na primeira mudanca. */
  var lim0 = (opts.lim && opts.lim[0] !== undefined) ? opts.lim[0] : x0 - 8;
  var lim1 = (opts.lim && opts.lim[1] !== undefined) ? opts.lim[1] : x0 + W + 8;
  function poe(t, x, y, ancora, cor) {
    var w = t.length * 12 + 8;
    var px = Math.round(x - w * ancora);
    if (px + w > lim1) px = lim1 - w;
    if (px < lim0) px = lim0;
    g.fillStyle(0x05050c, 0.88).fillRect(px, y + 2, w, 20);
    rotula(t, px + 4, y, cor);
  }

  var i, x, y, est, souEu, ehAlvo;
  // as bolinhas das duas linhas, e as marcas por cima delas
  for (i = 0; i < nA + nV; i++) {
    var naAzul = (i < nA);
    var k = naAzul ? i : i - nA;
    est = (naAzul ? az : vm).estacoes[k];
    x = naAzul ? CX : xVm(k);
    y = naAzul ? yAz(k) : CY;
    if (est === BALDEACAO) continue;      // a Se e desenhada uma vez so, depois
    souEu = (est === eu && linhaEu === (naAzul ? 'azul' : 'vermelha'));
    ehAlvo = (est === alvo);
    /* ---------- a estacao e CLARA, o tronco e que tem cor ----------
       Primeira versao: bolinha da cor da linha com um halo preto atras.
       O tronco tem 5px e a bolinha 6, quase o mesmo — o que se via na
       tela nao era uma linha com estacoes, era uma linha TRACEJADA, com
       o halo preto abrindo um corte a cada 12px. O olho lia interrupcao
       onde o mapa queria dizer parada.
       Estacao clara sobre tronco colorido e como todo diagrama de metro
       resolve isso, e resolve porque inverte o contraste em vez de
       cortar o traco. O halo escuro sobrou so pra quem precisa saltar do
       desenho: voce e o destino. */
    if (souEu || ehAlvo) {
      g.fillStyle(0x05050c, 1).fillCircle(x, y, 7);
      g.fillStyle(ehAlvo ? 0x00e676 : 0xf2f0ff, 1).fillCircle(x, y, 5);
    } else {
      g.fillStyle(0xcdd6f0, 1).fillCircle(x, y, 2);
    }
    /* ---------- por que o anel nao vem escrito ----------
       Ele vinha: um VOCÊ ao lado do ponto. Em LIBERDADE, que e a estacao
       colada na Se, esse rotulo caiu exatamente em cima do SÉ — os dois
       a direita do tronco, com quatro pixels de diferenca na altura. E
       nao era um caso: qualquer vizinha do cruzamento fazia igual, e o
       cruzamento e onde o jogador mais olha.
       Dava pra empurrar o rotulo pro outro lado, e ai ele bateria na
       ponta oeste. A saida foi perguntar quem ja responde: o anel branco
       e o unico do mapa e diz ONDE, o rodape diz o NOME, e o cabecalho
       diz quanto falta. O texto no meio do desenho nao acrescentava
       nada — so ocupava o unico lugar apertado que o mapa tem. */
    if (souEu) g.lineStyle(2, 0xf2f0ff, 1).strokeCircle(x, y, 9);
    if (ehAlvo) {
      g.lineStyle(2, 0x00e676, 1).strokeCircle(x, y, 9);
      g.fillStyle(0x00e676, 1).fillTriangle(x - 18, y - 6, x - 18, y + 6, x - 10, y);
    }
  }

  /* A Se e a esquina, e por isso ela e a unica que ganha nome no meio do
     desenho: e o ponto onde o jogador troca de linha. Amarela porque no
     resto do jogo amarelo ja e a cor da baldeacao. */
  g.fillStyle(0x05050c, 1).fillCircle(CX, CY, 9);
  g.fillStyle(0xf2c14e, 1).fillCircle(CX, CY, 6);
  /* O laco das bolinhas pula a Se — ela pertence as duas linhas e sairia
     desenhada duas vezes — e por isso o anel dela tem que ser feito aqui.
     Sem isto o mapa perdia o "onde estou" exatamente na estacao em que o
     jogador mais precisa dele, que e a da baldeacao. */
  if (eu === BALDEACAO) g.lineStyle(2, 0xf2f0ff, 1).strokeCircle(CX, CY, 11);
  poe('SÉ', CX + 16, CY + 4, 0, PAL.amarelo);

  /* As quatro pontas. Sao elas que dizem o SENTIDO — o letreiro do trem
     fala em "sentido Itaquera" e "sentido Barra Funda", e sem os nomes
     nas pontas o mapa nao responde a mesma pergunta que o letreiro faz. */
  poe(az.estacoes[nA - 1], CX, y0 - 24, 0.5, '#5aa0e0');
  poe(az.estacoes[0], CX, y0 + H + 6, 0.5, '#5aa0e0');
  poe(vm.estacoes[0], x0, CY - 28, 0, PAL.vermelho);
  poe(vm.estacoes[nV - 1], x0 + W, CY + 10, 1, PAL.vermelho);
}

/* ---------- o que faz perder ----------
   Carisma e descanso zerados já matavam, mas nenhum dos dois falava com
   o trajeto. Com destino e relógio existe a perda que a cidade cobra de
   verdade: chegar atrasado. Descer na estação errada, dormir e passar
   da sua, ficar no trem até a ponta da linha — tudo isso custa minutos,
   e minuto demais vira atraso. Um atraso e você é mandado embora.

   A volta não tem hora pra chegar, mas tem preço: quem chega tarde em
   casa dorme menos, e começa o dia seguinte com menos descanso. */
/* 68 minutos: medido em 200 trajetos por faixa de horário. Trajeto
   limpo leva de 39 a 58 e chega sempre; um erro é perdoado em 98% dos
   casos; três erros chegam no prazo em 13%. É a curva que queria — a
   cidade perdoa o tropeço e cobra o descuido. */
/* ---------- corações ----------
   Carisma e descanso são o desgaste longo da corrida; os corações são o
   fôlego de um trajeto só. Cinco por perna, um por minigame perdido, e
   voltam cheios quando você chega — porque cada trajeto é um dia novo,
   e o que quebra a pessoa é o dia, não a semana. Zerar é acabar. */
var CORACOES_POR_PERNA = 5;

var LIMITE_ATRASO = 68;
/* Um. Era tres, e tres avisos fazem do relogio uma sugestao: dava pra
   atrasar duas vezes de graca. Agora o primeiro atraso e o ultimo. */
var MAX_ATRASOS = 1;

/* onde as duas se cruzam, e o par fixo da corrida */
var BALDEACAO = 'SÉ';
/* A casa de quem joga. Era uma só, Itaquera (a ponta leste da
   Vermelha), e continua sendo pra quase todo mundo; o torcedor do
   Palmeiras mora do outro lado da linha, na Barra Funda, colado no
   Allianz. O são-paulino e o santista saem da Sé por enquanto (o do São
   Paulo vai morar no Morumbi quando a linha Amarela existir).
   GameState.init decide (casaDe). */
var CASA = 'ITAQUERA';
var CASA_DO_TIME = { corinthians: 'ITAQUERA', palmeiras: 'BARRA FUNDA', saopaulo: 'SÉ', santos: 'SÉ' };
function casaDe(charKey) {
  if (CHARS[charKey] && CHARS[charKey].times) return CASA_DO_TIME[leTime()] || 'ITAQUERA';
  return 'ITAQUERA';
}

/* ---------- o nome oficial, onde ele cabe ----------
   Por dentro a estação continua sendo 'ITAQUERA' — a casa, o mapa, as
   missões e a rota falam esse nome. Na PLACA ela é o que é na vida:
   CORINTHIANS-ITAQUERA, vinte letras, 240px. Cabe na faixa da parede da
   plataforma, na placa de sentido, no letreiro do vagão, na pausa e no
   painel do desktop; não cabe no rodapé 'AQUI:' do celular (268px de
   tela), na tabela do fim nem no rótulo da ponta do mapa. `max` é o
   número de letras que o lugar aguenta: passou, fica o curto. */
var NOME_OFICIAL = { 'ITAQUERA': 'CORINTHIANS-ITAQUERA' };
function placaDe(n, max) {
  var o = NOME_OFICIAL[n];
  return (o && (!max || o.length <= max)) ? o : n;
}
var TRABALHO = 'VERGUEIRO';    // linha azul, quatro estações ao sul da Sé

function linhaDaEstacao(nome) {
  return LINHAS.azul.estacoes.indexOf(nome) >= 0 ? 'azul' : 'vermelha';
}

/* ---------- relógio e faixas de horário ----------
   O metrô não é o mesmo o dia inteiro. Cada faixa muda a lotação, a
   espera do trem, quantas catracas ficam abertas e o humor do guardinha.
   É o mesmo trajeto, mas em outra São Paulo. */
/* Cada faixa tinha UMA frase, e uma frase por faixa repete toda vez que
   o relógio passa por ali: na terceira manhã o jogo já dizia a mesma
   coisa que na primeira, e o horário parava de parecer um lugar. Agora
   é repertório, e a escolha evita repetir a última — ouvir duas vezes
   seguidas a mesma linha é justamente o que se estava tentando matar. */
var ultimaFrase = '';
function fraseDaFaixa(f) {
  var lista = (f && f.frases) || [];
  if (!lista.length) return '';
  if (lista.length === 1) return lista[0];
  var i, tenta = 0;
  do { i = Math.floor(Math.random() * lista.length); tenta++; }
  while (lista[i] === ultimaFrase && tenta < 8);
  ultimaFrase = lista[i];
  return lista[i];
}

var FAIXAS = [
  {
    key: 'madrugada', nome: 'MADRUGADA', ini: 0, fim: 5 * 60 + 29,
    lotacao: 0.15, espera: 1.85, guarda: 1.2, catracas: 0.35,
    cor: '#7c8ac4', luz: 0x0a0c1e, luzA: 0.34,
    frases: [
      'Estação vazia. O guardinha só tem você pra olhar.',
      'Quatro pessoas na plataforma e todas de costas.',
      'O trem demora tanto que dá pra ouvir o túnel.',
      'Ninguém aqui está indo trabalhar agora.'
    ]
  },
  {
    key: 'picoManha', nome: 'PICO DA MANHÃ', ini: 5 * 60 + 30, fim: 9 * 60 + 29,
    lotacao: 1.0, espera: 0.55, guarda: 0.75, catracas: 1.0,
    cor: '#f2c14e', luz: 0x2a1e08, luzA: 0.1,
    frases: [
      'Todo mundo indo pro mesmo lugar na mesma hora.',
      'A plataforma enche antes do trem chegar.',
      'Ninguém olha pra ninguém. Todo mundo olha o relógio.',
      'Três trens até caber você. É assim mesmo.'
    ]
  },
  {
    key: 'entrePico', nome: 'ENTRE-PICO', ini: 9 * 60 + 30, fim: 15 * 60 + 59,
    lotacao: 0.4, espera: 1.25, guarda: 1.0, catracas: 0.7,
    cor: '#8bd0ff', luz: 0x101a2c, luzA: 0.1,
    frases: [
      'Meio da tarde. Dá até pra sentar.',
      'O vagão respira. Aproveita.',
      'Essa hora o metrô parece de outra cidade.',
      'Tem banco vazio. Anota o horário.'
    ]
  },
  {
    key: 'picoTarde', nome: 'PICO DA TARDE', ini: 16 * 60, fim: 19 * 60 + 59,
    lotacao: 1.0, espera: 0.6, guarda: 0.8, catracas: 1.0,
    cor: '#e8a33c', luz: 0x2c1408, luzA: 0.13,
    frases: [
      'A cidade inteira voltando pra casa junto.',
      'Todo mundo cansado e ninguém com pressa de ceder.',
      'O pior horário, e você sabia disso quando saiu.',
      'Ombro com ombro até a Sé.'
    ]
  },
  {
    key: 'noite', nome: 'NOITE', ini: 20 * 60, fim: 22 * 60 + 59,
    lotacao: 0.35, espera: 1.4, guarda: 1.05, catracas: 0.55,
    cor: '#9f8ce0', luz: 0x0c0c22, luzA: 0.2,
    frases: [
      'O vagão esvaziou. A estação também.',
      'Sobrou quem trabalha até tarde e quem não quer chegar.',
      'A essa hora o trem para mais tempo em cada estação.',
      'Silêncio no vagão. Estranho e bom.'
    ]
  },
  {
    key: 'ultimo', nome: 'ÚLTIMO TREM', ini: 23 * 60, fim: 24 * 60 - 1,
    lotacao: 0.22, espera: 2.1, guarda: 1.15, catracas: 0.35,
    cor: '#e8362c', luz: 0x0a0a1c, luzA: 0.28,
    frases: [
      'Se perder esse, dormiu na estação.',
      'Último trem. Não tem próximo pra corrigir erro.',
      'A estação já está fechando atrás de você.',
      'Agora é esse ou um táxi que você não pode pagar.'
    ]
  }
];

/* A hora de sair era uma lista fixa, uma por dia: dia 1 no pico da
   manhã, dia 2 de madrugada, e assim por diante. Isso dava variedade
   ENTRE os dias, mas o dia de dentro era sempre igual — sai, volta, e
   as duas pontas na mesma São Paulo.

   Agora quem diz a hora de cada perna é a rotina do personagem (ver
   ROTINAS em zipzap.js), e a variedade mudou de lugar: o estudante sai
   6h50 no pico, volta da faculdade 13h10 no entre-pico e pega o último
   trem às 22h40 — três São Paulos no mesmo dia. */

function faixaDe(min) {
  var m = ((min % 1440) + 1440) % 1440;
  for (var i = 0; i < FAIXAS.length; i++) {
    if (m >= FAIXAS[i].ini && m <= FAIXAS[i].fim) return FAIXAS[i];
  }
  return FAIXAS[0];
}
function horaTexto(min) {
  var m = ((min % 1440) + 1440) % 1440;
  var h = Math.floor(m / 60), mm = m % 60;
  return (h < 10 ? '0' : '') + h + ':' + (mm < 10 ? '0' : '') + mm;
}

/* ---------- personagens jogáveis ---------- */
/* ---------- o que cada um sabe fazer ----------
   Os seis personagens diferiam só em número: tarifa, velocidade, dreno,
   quanto empurra. Trocar de personagem mudava a dificuldade, não o
   jogo — as mesmas ações, na mesma ordem, com os medidores andando mais
   rápido ou mais devagar.

   Agora cada um tem um verbo que só ele tem, e todos os seis mexem nos
   sistemas que já estavam de pé: o banco, o sono, a barra, a rota e o
   dinheiro. Escolher personagem passou a ser escolher como se joga o
   trajeto, não em que dificuldade. */
var PODERES = {
  chao: {
    nome: 'SENTAR NO CHÃO',
    como: 'No chão, fora do pico.'
  },
  cochilo: {
    nome: 'COCHILAR NA BARRA',
    como: 'Dorme em pé. Perde a rota.'
  },
  pedeLugar: {
    nome: 'PEDIR O LUGAR',
    como: 'Pede o banco dos outros.'
  },
  vende: {
    nome: 'VENDER NO VAGÃO',
    como: 'Vende no vagão. Tem risco.'
  },
  perdido: {
    nome: 'NÃO SABE A LINHA',
    como: 'Só vê a rota de perto.'
  },
  torcida: {
    nome: 'TORCIDA JUNTO',
    como: 'O time te dá força.'
  },
  cadeira: {
    nome: 'ELEVADOR E CATRACA PCD',
    como: 'Sem escada. Passa de graça.'
  }
};

var CHARS = {
  estudante: {
    nome: 'ESTUDANTE', asset: 'estudante',
    desc: 'Meia passagem. Mochila atrapalha.',
    tarifa: 2.60, dinheiro: 14.00, carisma: 55, descanso: 90, descansoMax: 100,
    dreno: 0.9, velocidade: 108, empurraoMult: 0.8, gratuidade: false, valeTransporte: 0,
    poder: 'chao',
    visual: { m: { corpo: 'bone_mochila', pal: 'estudante' }, f: { corpo: 'rabo_mochila', pal: 'estudanteF' } }
  },
  clt: {
    nome: 'CLT', asset: 'clt',
    desc: 'Vale-transporte. Já sai cansado.',
    tarifa: 5.20, dinheiro: 9.00, carisma: 60, descanso: 55, descansoMax: 100,
    dreno: 1.35, velocidade: 92, empurraoMult: 1.0, gratuidade: false, valeTransporte: 2,
    poder: 'cochilo',
    visual: { m: { corpo: 'padrao', pal: 'clt' }, f: { corpo: 'bolsa', pal: 'cltF' } }
  },
  senhor: {
    nome: 'IDOSO', asset: 'senhor',
    desc: 'Passa de graça. Recebe o lugar.',
    tarifa: 0, dinheiro: 20.00, carisma: 75, descanso: 70, descansoMax: 70,
    dreno: 1.1, velocidade: 62, empurraoMult: 0.7, gratuidade: true, valeTransporte: 0,
    poder: 'pedeLugar', nomeF: 'IDOSA',
    visual: { m: { corpo: 'senhor', pal: 'senhor' }, f: { corpo: 'senhora_coque', pal: 'senhoraJog' } }
  },
  ambulante: {
    nome: 'AMBULANTE', asset: 'ambulante',
    desc: 'Vende no vagão. Guardinha persegue.',
    tarifa: 5.20, dinheiro: 6.00, carisma: 50, descanso: 80, descansoMax: 100,
    dreno: 1.0, velocidade: 118, empurraoMult: 1.15, gratuidade: false, valeTransporte: 0,
    poder: 'vende',
    visual: { m: { corpo: 'bone', pal: 'ambulante' }, f: { corpo: 'rabo', pal: 'ambulanteF' } }
  },
  gestante: {
    nome: 'GESTANTE', asset: 'gestante',
    desc: 'Recebe o lugar. Cansa em dobro.',
    tarifa: 5.20, dinheiro: 12.00, carisma: 80, descanso: 60, descansoMax: 80,
    dreno: 1.5, velocidade: 74, empurraoMult: 0.65, gratuidade: false, valeTransporte: 0,
    /* Ela também pede o lugar, e pra ela ninguém recusa. O que a separa
       do idoso é o resto: cansa em dobro, e a multidão abre caminho. */
    poder: 'pedeLugar', abremCaminho: true, nuncaRecusam: true,
    poderRotulo: 'ABREM CAMINHO',
    poderComo: 'Ninguém recusa a ela.',
    /* a única sem escolha de gênero, e por causa do próprio verbo: o
       dela é estar grávida */
    visual: { f: { corpo: 'gestante', pal: 'gestanteJog' } },
    preco: 90
  },
  turista: {
    nome: 'TURISTA', asset: 'turista',
    desc: 'Grana sobrando. Se perde fácil.',
    tarifa: 5.20, dinheiro: 40.00, carisma: 45, descanso: 100, descansoMax: 100,
    dreno: 1.25, velocidade: 98, empurraoMult: 0.9, gratuidade: false, valeTransporte: 0,
    poder: 'perdido',
    visual: { m: { corpo: 'bone_mochila', pal: 'turista' }, f: { corpo: 'mochila_longo', pal: 'turistaF' } },
    preco: 150
  },
  /* O torcedor: escolhe o time (Corinthians, Palmeiras, São Paulo ou
     Santos) além do gênero. Quem é do mesmo time no vagão não desafia,
     dá força; torcedor rival apanha mais de ironia. A camisa sai do time
     escolhido (paletaDoTime + camisaDeTime), e cada combinação vira uma
     folha: ch_torcedor_m_santos. */
  /* O cadeirante: não sobe escada rolante (só o elevador), passa de
     graça e só pela catraca larga, que é a PCD; no vagão a cadeira tem
     freio, e o tranco não derruba. */
  cadeirante: {
    nome: 'CADEIRANTE', asset: 'cadeirante',
    desc: 'Sem escada. Passa de graça.',
    tarifa: 0, dinheiro: 16.00, carisma: 70, descanso: 85, descansoMax: 100,
    dreno: 0.95, velocidade: 96, empurraoMult: 0.8, gratuidade: true, valeTransporte: 0,
    poder: 'cadeira',
    visual: { m: { corpo: 'cadeirante', pal: 'cadeirante' }, f: { corpo: 'cadeirante', pal: 'cadeiranteF' } }
  },
  torcedor: {
    nome: 'TORCEDOR', nomeF: 'TORCEDORA', asset: 'torcedor',
    desc: 'Vai pro jogo. Faz amizade fácil.',
    tarifa: 5.20, dinheiro: 18.00, carisma: 70, descanso: 85, descansoMax: 100,
    dreno: 1.05, velocidade: 104, empurraoMult: 1.1, gratuidade: false, valeTransporte: 0,
    poder: 'torcida', times: true,
    visual: { m: { corpo: 'touca_corinthians', pal: 'torcedorJog' }, f: { corpo: 'longo_corinthians', pal: 'torcedoraJog' } }
  }
};

/* ---------- gênero, e o passo de cada um ----------
   Quem joga escolhe um personagem pra ser. O elenco vinha com um gênero
   decidido de fábrica em cada carta, e metade de quem pega esse trem
   toda manhã não tinha onde se reconhecer.

   Gênero aqui é ARTE e NOME, nunca número: o mesmo estudante corre o
   mesmo tanto, cansa o mesmo tanto e paga a mesma meia passagem nas duas
   versões. Amarrar estatística a gênero seria inventar uma diferença
   que não existe, e o jogo não tem nada a ganhar com isso. O que muda é
   o corpo (cabelo, silhueta, o que carrega), o tom da roupa e, quando o
   português pede, o nome: IDOSO e IDOSA.

   A gestante é a única sem escolha, e por um motivo que é do próprio
   personagem: o verbo dela é estar grávida. */
var GENEROS = ['m', 'f'];

function generosDe(k) {
  var v = CHARS[k] && CHARS[k].visual, out = [];
  for (var i = 0; i < GENEROS.length; i++) if (v && v[GENEROS[i]]) out.push(GENEROS[i]);
  return out;
}
/* o gênero válido mais próximo do pedido: personagem de um gênero só
   devolve o dele, e não uma carta em branco */
function generoValido(k, g) {
  var l = generosDe(k);
  return l.indexOf(g) >= 0 ? g : (l[0] || 'm');
}
function outroGenero(k, g) {
  var l = generosDe(k);
  if (l.length < 2) return g;
  return l[(l.indexOf(generoValido(k, g)) + 1) % l.length];
}
function spriteChar(k, g) {
  var base = 'ch_' + k + '_' + generoValido(k, g);
  // o torcedor tem uma folha por time: ch_torcedor_f_palmeiras
  return (CHARS[k] && CHARS[k].times) ? base + '_' + leTime() : base;
}
function spriteJogador() { return spriteChar(GameState.charKey, GameState.genero); }
function nomeDoChar(k, g) {
  var c = CHARS[k];
  return (generoValido(k, g) === 'f' && c.nomeF) ? c.nomeF : c.nome;
}

/* a escolha fica gravada por personagem: quem joga de estudante mulher
   não quer reescolher isso toda partida */
function leGenero(k) {
  try { return generoValido(k, localStorage.getItem('metrosp_genero_' + k) || 'm'); }
  catch (e) { return generoValido(k, 'm'); }
}
function gravaGenero(k, g) {
  try { localStorage.setItem('metrosp_genero_' + k, generoValido(k, g)); } catch (e) { }
}

/* ---------- o passo ----------
   A velocidade sempre existiu na ficha e nunca apareceu em lugar
   nenhum: nem na tela de escolha, nem em palavra dentro do jogo. Quem
   trocava de personagem sentia alguma coisa diferente e não sabia
   dizer o quê. Agora a faixa é larga o bastante pra sentir (o ambulante
   anda quase o dobro do idoso) e tem nome na tela de escolha. */
var PASSOS = [
  { ate: 70, nome: 'DEVAGAR' },
  { ate: 84, nome: 'SEM PRESSA' },
  { ate: 100, nome: 'NORMAL' },
  { ate: 112, nome: 'LIGEIRO' },
  { ate: 999, nome: 'CORRIDO' }
];
function nomeDoPasso(v) {
  for (var i = 0; i < PASSOS.length; i++) if (v <= PASSOS[i].ate) return PASSOS[i].nome;
  return PASSOS[PASSOS.length - 1].nome;
}

/* ---------- o que se come na estação ----------
   Não existia jeito de recuperar fôlego dentro de uma partida: descanso
   só subia sentado no vagão, e coração só voltava no trajeto seguinte.
   Quem começava mal, terminava pior.

   Comprar comida na estação é a saída, e é a mais são-paulina que tem:
   a banca, o carrinho de dogão, o ambulante com a caixa de isopor. Cada
   compra custa dinheiro e alguns minutos do relógio — quem está
   adiantado come, quem está atrasado passa reto. É o mesmo relógio que
   decide tudo no jogo.

   A água vale mais no calor: no pico e nas faixas quentes o corpo pede
   mais, e é quando ela salva. */
var ITENS = {
  chocolate: { nome: 'CHOCOLATE', preco: 2.00, descanso: 8, min: 1 },
  doce: { nome: 'DOCE', preco: 1.00, descanso: 5, min: 1 },
  // a bala de todo ambulante de metrô: refresca o hálito, e isso é carisma
  ralls: { nome: 'RALLS', preco: 2.00, descanso: 4, min: 1, carisma: 2 },
  pururuca: { nome: 'PURURUCA', preco: 3.00, descanso: 10, min: 1, carisma: 1 },
  agua: { nome: 'ÁGUA', preco: 3.00, descanso: 12, min: 1, noCalor: 1.6 },
  cafe: { nome: 'CAFÉ', preco: 4.00, descanso: 16, min: 2 },
  dogao: { nome: 'DOGÃO', preco: 12.00, descanso: 26, min: 4, coracao: true },
  jornal: { nome: 'JORNAL', preco: 4.00, descanso: 4, min: 1, carisma: 5 },
  /* o que a galeria da Itaquera vende: a lista do que existe de verdade
     nas estações (salgado, capinha e fone, perfume, raspadinha) */
  coxinha: { nome: 'COXINHA', preco: 7.00, descanso: 18, min: 2 },
  // o power bank da loja de acessórios: +60% de bateria na hora
  powerbank: { nome: 'POWER BANK', preco: 15.00, descanso: 0, min: 1, bateria: 60 },
  paoQueijo: { nome: 'PÃO DE QUEIJO', preco: 5.00, descanso: 14, min: 1 },
  fone: { nome: 'FONE DE OUVIDO', preco: 20.00, descanso: 14, min: 2, carisma: 2 },
  capinha: { nome: 'CAPINHA', preco: 12.00, descanso: 0, min: 2, carisma: 5 },
  perfume: { nome: 'PERFUME', preco: 30.00, descanso: 0, min: 3, carisma: 12 },
  desodorante: { nome: 'DESODORANTE', preco: 12.00, descanso: 2, min: 1, carisma: 5 },
  // raspadinha: uma em seis paga R$ 30; o resto é papel
  raspadinha: { nome: 'RASPADINHA', preco: 5.00, descanso: 0, min: 1, sorte: 1 / 6, premio: 30 }
};

/* Calor é o que faz a água valer o preço: as faixas de mais movimento
   são as mais abafadas, e o vagão cheio é uma sauna. */
function estaCalor() {
  return GameState.lotacao() > 0.55 ||
    (GameState.minutos > 11 * 60 && GameState.minutos < 17 * 60);
}

/* ---------- pontos e personagens destravados ----------
   Os minigames deixaram de ser só um susto no meio da viagem: ganhar dá
   ponto, e ponto atravessa a corrida — fica guardado mesmo quando a
   cidade te quebra. É o que faz valer a pena encarar o rimador numa
   segunda-feira já sabendo que a semana vai acabar mal.

   O elenco que já existia continua aberto. Cobrar por ele seria tirar
   de quem já jogava, e comprar tem que abrir coisa nova, não retirar o
   que estava lá. Os pontos abrem os dois que entraram junto com eles. */
var LIVRES_DE_SAIDA = ['estudante', 'clt', 'senhor', 'ambulante', 'torcedor', 'cadeirante'];

function lePontos() {
  try { return parseInt(localStorage.getItem('metrosp_pontos') || '0', 10) || 0; } catch (e) { return 0; }
}
function gravaPontos(n) {
  try { localStorage.setItem('metrosp_pontos', String(Math.max(0, n))); } catch (e) { }
}
function leDestravados() {
  var l = LIVRES_DE_SAIDA.slice(0);
  try {
    var g = (localStorage.getItem('metrosp_destravados') || '').split(',');
    for (var i = 0; i < g.length; i++) if (CHARS[g[i]] && l.indexOf(g[i]) < 0) l.push(g[i]);
  } catch (e) { }
  return l;
}
function destravado(k) { return leDestravados().indexOf(k) >= 0; }
function destrava(k) {
  if (destravado(k)) return;
  var l = leDestravados();
  l.push(k);
  try { localStorage.setItem('metrosp_destravados', l.join(',')); } catch (e) { }
}
function precoDe(k) { return CHARS[k] && CHARS[k].preco ? CHARS[k].preco : 0; }

/* compra se der: devolve o que aconteceu, pra tela dizer o porquê */
function compraPersonagem(k) {
  if (destravado(k)) return 'ja';
  var p = lePontos(), c = precoDe(k);
  if (p < c) return 'falta';
  gravaPontos(p - c);
  destrava(k);
  return 'ok';
}

/* ---------- estado global ---------- */
var GameState = {
  init: function (charKey, genero) {
    var c = CHARS[charKey];
    this.charKey = charKey;
    this.char = c;
    /* A tela de minigames liga isto DEPOIS de chamar o init. Zerar aqui
       é o que garante que o JOGAR do título nunca herda o treino: sem
       ponto, sem derrota e sem recorde numa partida de verdade seria um
       jogo que não conta nada. */
    this.treino = null;
    this.gastoNoDia = 0; this.multasNoDia = 0; this.sentouNaPerna = false;
    /* Gênero é arte e nome, não número: nada abaixo desta linha olha
       pra ele. Sem argumento, vale o que ficou gravado da última vez. */
    this.genero = genero ? generoValido(charKey, genero) : leGenero(charKey);
    this.nome = nomeDoChar(charKey, this.genero);
    this.carisma = c.carisma;
    this.descanso = c.descanso;
    this.dinheiro = c.dinheiro;
    this.valeRestante = c.valeTransporte;
    /* O dia deixou de ser ida-e-volta: agora é a lista de pernas da
       rotina deste personagem (ver zipzap.js). A perna 0 sai de casa, e
       a última sempre volta pra casa. */
    this.pernaIdx = 0;
    CASA = casaDe(charKey);
    this.origem = CASA;
    this.compromisso = null;
    this.destino = this.destinoDaRotina();
    this.perna = this.ultimaPerna() ? 'volta' : 'ida';
    this.zap = montaZap(charKey);
    this.poeNoTrajeto(CASA);
    this.estacoes = 0;
    this.dia = 1;
    this.lixo = false; this.sacouNoDia = 0;      // o papel do lanche e o saque do 24 horas
    this.bateria = 100;                           // o celular sai de casa carregado
    this.explorar = false;                        // o modo EXPLORAR liga depois do init
    this.mochila = {};                            // o que você comprou e ainda não usou
    this.pernasFeitas = 0;
    this.atrasos = 0;
    this.ultimoAtraso = 0;
    this.coracoes = CORACOES_POR_PERNA;
    this.pontosDaCorrida = 0;
    this.minutos = this.pernaAtual().saida + Math.floor(Math.random() * 21) - 10;
    this.minutoSaida = this.minutos;
    this.folgaPerna = 0; this._itqCompensado = null;
    this.faixaAnterior = this.faixa().key;
    this.dentroDoSistema = false;
    /* Pular a catraca era uma decisao sem consequencia depois do
       saguao: passou, passou. Agora o trem sabe, porque e no trem que
       existe quem pergunte. */
    this.pulouCatraca = false;
    this.sentado = false;
    this.motivoFim = '';
    this.stats = {
      compromissos: 0,
      cedidos: 0, disfarces: 0, disfarcesOk: 0, recusas: 0,
      catracasPuladas: 0, catracasPagas: 0, causos: 0, baldeacoes: 0,
      minigamesGanhos: 0, minigamesPerdidos: 0,
      caidos: 0, achados: 0
    };
  },
  linhaAtual: function () { return LINHAS[this.linha]; },
  estacaoAtual: function () { return this.linhaAtual().estacoes[this.idx]; },
  proximaEstacaoNome: function () {
    var l = this.linhaAtual(), i = this.idx + this.dir;
    if (i < 0 || i >= l.estacoes.length) i = this.idx - this.dir;
    return l.estacoes[i];
  },

  /* ---------- o trajeto do dia ----------
     Não é mais um loop sem fim: todo dia é ida e volta entre casa e
     trabalho. Como as duas pontas estão em linhas diferentes, o trajeto
     sempre tem uma baldeação na Sé no meio — que é exatamente o trecho
     que a cidade inteira faz.

     O jogo não conduz ninguém pela mão: o trem anda sozinho no sentido
     certo, mas quem tem que descer na estação certa é você. Descer
     antes custa o trem seguinte; passar da sua custa a volta. */
  /* ---------- rotina, compromisso e destino ---------- */
  pernaAtual: function () {
    var r = rotinaDe(this.charKey);
    return r[Math.min(this.pernaIdx, r.length - 1)];
  },
  destinoDaRotina: function () { return this.pernaAtual().estacao; },
  /* O rótulo da perna é o que o jogo diz que você está fazendo. Com
     compromisso aceito é o dele, porque o destino é o dele. */
  rotuloDaPerna: function () {
    return this.compromisso ? this.compromisso.rotulo : this.pernaAtual().rotulo;
  },
  ultimaPerna: function () { return this.pernaIdx >= rotinaDe(this.charKey).length - 1; },

  destinoFinal: function () { return this.destino; },
  origemDaPerna: function () { return this.origem; },

  /* Aceitar um compromisso no ZipZap troca a estação desta perna. É a
     única coisa no jogo que muda o destino, e sai de graça: o preço é o
     caminho ficar mais longo, mais curto, ou mudar de linha. */
  aceitaCompromisso: function (fio) {
    if (!fio || !fio.vai) return;
    fio.aceito = true;
    this.compromisso = { rotulo: fio.vai.rotulo, estacao: fio.vai.estacao, de: fio.nome };
    this.destino = fio.vai.estacao;
    this.apontaPraAlvo();
  },

  // precisa trocar de linha pra chegar no destino?
  faltaBaldear: function () {
    return linhaDaEstacao(this.destinoFinal()) !== this.linha;
  },
  // onde você tem que descer AGORA: a Sé se falta baldear, senão o destino
  alvoAtual: function () {
    return this.faltaBaldear() ? BALDEACAO : this.destinoFinal();
  },
  // quantas estações ainda faltam até esse alvo
  faltamEstacoes: function () {
    var i = this.linhaAtual().estacoes.indexOf(this.alvoAtual());
    return Math.abs(i - this.idx);
  },
  // põe o jogador numa estação, já apontado pro alvo
  poeNoTrajeto: function (estacao) {
    this.linha = linhaDaEstacao(estacao);
    this.idx = this.linhaAtual().estacoes.indexOf(estacao);
    this.apontaPraAlvo();
  },
  /* ---------- o sentido ----------
     Plataforma de metrô não se anuncia pelo nome dela: se anuncia pelo
     TERMINAL pra onde o trem vai. Quem está na Sé não escolhe entre
     "esquerda" e "direita", escolhe entre Barra Funda e Itaquera — e é
     por isso que o nome tem que sair da linha em que você está, e nunca
     ser escrito à mão em lugar nenhum. Na Azul os mesmos dois lados se
     chamam Jabaquara e Tucuruvi.

     dir > 0 anda pro fim da lista, dir < 0 pro começo. */
  terminal: function (dir) {
    var e = this.linhaAtual().estacoes;
    return (dir > 0) ? e[e.length - 1] : e[0];
  },
  sentidoAtual: function () { return this.terminal(this.dir); },
  /* qual dos dois lados leva ao seu alvo — é o que a placa do corredor
     precisa saber pra não virar adivinhação, e o que a rota usa pra
     dizer que você embarcou pro lado errado */
  sentidoCerto: function () {
    var i = this.linhaAtual().estacoes.indexOf(this.alvoAtual());
    return this.terminal(i >= this.idx ? 1 : -1);
  },

  apontaPraAlvo: function () {
    var i = this.linhaAtual().estacoes.indexOf(this.alvoAtual());
    this.dir = (i >= this.idx) ? 1 : -1;
  },

  /* o trem anda uma estação. Na ponta da linha ele volta, e quem ficou
     dentro paga o desvio em minutos. */
  avancaTrem: function () {
    var l = this.linhaAtual();
    var i = this.idx + this.dir;
    var virou = false;
    if (i < 0 || i >= l.estacoes.length) { this.dir *= -1; i = this.idx + this.dir; virou = true; }
    this.idx = i;
    this.estacoes++;
    this.passaTempo(2 + Math.floor(Math.random() * 2));
    return virou;
  },

  // desceu na Sé: troca de linha e reaponta
  baldeia: function () {
    this.linha = (this.linha === 'azul') ? 'vermelha' : 'azul';
    this.idx = this.linhaAtual().estacoes.indexOf(BALDEACAO);
    this.apontaPraAlvo();
    this.stats.baldeacoes++;
  },

  /* chegou no destino da perna. De manhã o relógio pula pro fim do
     expediente; de noite vira o dia. */
  // quanto tempo de porta a porta esta perna já levou
  /* `folgaPerna` são minutos que a perna dá de presente: a caminhada
     extra da Corinthians-Itaquera (estacao-itaquera.js). Nunca negativo:
     subtrair do relógio direto dava -6, e o módulo de 24h transformava
     isso em 1434 minutos de atraso logo na saída de casa. */
  minutosNaPerna: function () {
    var m = (this.minutos - this.minutoSaida + 1440) % 1440;
    return Math.max(0, m - (this.folgaPerna || 0));
  },
  minutosParaOAtraso: function () { return LIMITE_ATRASO - this.minutosNaPerna(); },
  /* A cobrança é uma hora no relógio do jogo, não um cronômetro de
     tempo real: "entrada 07:18" se lê de um olho, "faltam 23 minutos"
     precisa de conta. O minuto continua existindo por baixo. */
  horaLimite: function () { return horaTexto((this.minutoSaida + LIMITE_ATRASO) % 1440); },

  /* Um minigame perdido custa um coração; ganho não devolve nada, senão
     o recurso vira placar e para de doer.

     O quanto passou a variar por causa dos guardinhas: o menorzinho
     tira meio, o do meio um, e o grandão dois. Por isso o contador
     virou fracionário e o HUD desenha meio coração. */
  perdeCoracao: function (quanto) {
    if (this.explorar) return this.coracoes;      // no passeio ninguém perde vida
    this.coracoes = Math.max(0, this.coracoes - (quanto || 1));
    this.stats.minigamesPerdidos++;
    return this.coracoes;
  },
  /* Ganhar dá ponto, e o ponto é gravado na hora: quem morre no minuto
     seguinte não perde o que acabou de ganhar. */
  ganhaMinigame: function (pontos) {
    /* Treino não grava ponto, e devolve ZERO pra quem mostra o prêmio:
       a briga escreve '+0 PONTOS', que é a regra dita na tela em vez de
       um número que não aconteceu. Sem isto a tela de minigames virava
       fazenda de ponto pra destravar o elenco. */
    if (this.treino || this.explorar) { this.stats.minigamesGanhos++; return 0; }
    this.stats.minigamesGanhos++;
    var n = pontos || 5;
    this.pontosDaCorrida = (this.pontosDaCorrida || 0) + n;
    gravaPontos(lePontos() + n);
    return n;
  },

  /* Reiniciar o trajeto devolve a perna ao começo: mesma origem, mesmo
     relógio da saída, corações cheios. Não perdoa o que já foi gasto de
     carisma nem de grana — reiniciar é uma segunda chance no caminho,
     não um apagador da corrida. */
  reiniciaPerna: function () {
    this.minutos = this.minutoSaida;
    this.coracoes = CORACOES_POR_PERNA;
    this.dentroDoSistema = false;
    /* Pular a catraca era uma decisao sem consequencia depois do
       saguao: passou, passou. Agora o trem sabe, porque e no trem que
       existe quem pergunte. */
    this.pulouCatraca = false;
    this.sentado = false;
    this.poeNoTrajeto(this.origemDaPerna());
    this.faixaAnterior = this.faixa().key;
  },

  /* Chegou onde tinha que chegar. A perna que acabou vira a origem da
     próxima, o compromisso é dado por cumprido, e a caixa do ZipZap é
     nova: cada trecho traz a sua própria confusão. */
  /* Sair da estação na ida e não ir: o dia acaba ali. Custa carisma
     (o chefe, a faculdade, quem esperava), mas você passa o resto do dia
     em casa, e acorda descansado no dia seguinte. */
  faltaODia: function () {
    this.faltas = (this.faltas || 0) + 1;
    this.addCarisma(-15);
    this.dentroDoSistema = false; this.folgaPerna = 0; this.pulouCatraca = false;
    this.coracoes = CORACOES_POR_PERNA;
    this.descanso = this.char.descansoMax;
    this.compromisso = null;
    this.pernaIdx = 0;
    this.dia++;
    this.valeRestante = this.char.valeTransporte;
    this.origem = CASA;
    this.destino = this.destinoDaRotina();
    this.perna = this.ultimaPerna() ? 'volta' : 'ida';
    this.minutos = (this.pernaAtual().saida + Math.floor(Math.random() * 21) - 10 + 1440) % 1440;
    this.bateria = 100;
    this.zap = montaZap(this.charKey);
    this.poeNoTrajeto(this.origem);
    this.minutoSaida = this.minutos;
    this.faixaAnterior = this.faixa().key;
  },

  chegouNoDestino: function () {
    // guardado antes de o fôlego novo zerar a conta: é a missão dos 5 corações
    var coracoesAoChegar = this.coracoes;
    this.pernasFeitas++;
    this.dentroDoSistema = false;
    this.folgaPerna = 0;
    /* Pular a catraca era uma decisao sem consequencia depois do
       saguao: passou, passou. Agora o trem sabe, porque e no trem que
       existe quem pergunte. */
    this.pulouCatraca = false;
    this.coracoes = CORACOES_POR_PERNA;      // trajeto novo, fôlego novo
    this.ultimoAtraso = Math.max(0, this.minutosNaPerna() - LIMITE_ATRASO);
    var eraUltima = this.ultimaPerna();
    /* As missões ouvem a chegada: no horário (toda perna que tem prazo, ou
       seja, todas menos a volta) e o dia fechado, com o que ele custou. */
    if (!eraUltima && this.ultimoAtraso === 0) Missoes.conta('noHorario');
    if (eraUltima) {
      Missoes.conta('diaCompleto', { gasto: this.gastoNoDia || 0, multas: this.multasNoDia || 0,
        carisma: this.carisma, coracoes: coracoesAoChegar });
      this.gastoNoDia = 0; this.multasNoDia = 0;
    }

    if (eraUltima) {
      /* ---------- a noite ----------
         Fechar a volta inteira — ida E volta, o dia completo — é a única
         coisa no jogo que devolve o corpo. Antes a noite dava um punhado
         de descanso e mais nada, o que fazia o dia terminar sem nenhuma
         sensação de ter valido: você acordava tão moído quanto dormiu.

         Agora o dia fechado no horário devolve o descanso CHEIO e todos
         os corações. É o prêmio de ter chegado, e é o que faz o trajeto
         ser um ciclo em vez de uma ladeira só pra baixo. */
      this.descanso = this.char.descansoMax;
      this.coracoes = CORACOES_POR_PERNA;
    } else if (this.ultimoAtraso > 0) {
      /* Chegar atrasado leva TODOS os corações de uma vez.
         Eram três avisos antes de doer, e três avisos transformam o
         relógio em sugestão: dava pra atrasar duas vezes de graça e
         seguir jogando igual. O relógio é o antagonista deste jogo —
         ele não pode ser o único que não morde. Agora é uma vez só, e
         cada minuto do letreiro passa a valer o que ele diz que vale. */
      this.atrasos++;
      this.coracoes = 0;
    }
    if (this.compromisso) { this.stats.compromissos++; this.compromisso = null; }

    this.origem = this.destino;
    if (eraUltima) {
      this.pernaIdx = 0;
      this.dia++;
      this.valeRestante = this.char.valeTransporte;
      this.origem = CASA;
    } else {
      this.pernaIdx++;
    }
    this.destino = this.destinoDaRotina();
    this.perna = this.ultimaPerna() ? 'volta' : 'ida';

    /* Sair antes da hora não existe: se você chegou cedo, o relógio
       espera o próximo compromisso; se chegou atrasado, você sai
       atrasado e a próxima perna já começa apertada. */
    var saida = this.pernaAtual().saida + Math.floor(Math.random() * 21) - 10;
    if (eraUltima || saida > this.minutos) this.minutos = (saida + 1440) % 1440;

    this.zap = montaZap(this.charKey);
    this.poeNoTrajeto(this.origem);
    this.minutoSaida = this.minutos;
    this.faixaAnterior = this.faixa().key;
  },

  /* Comer devolve fôlego e custa minutos. O dogão é o único que devolve
     coração — é comida de verdade, e é caro justamente por isso. */
  /* ---------- a mochila ----------
     'Preciso ver meu inventário.' Comprar e usar eram a mesma coisa: o
     dogão era comido no balcão. Agora comprar GUARDA, e o que está
     guardado aparece no app MOCHILA do celular, com a quantidade, pra
     usar quando quiser (e o papel do lanche só vai pra mão quando come). */
  guarda: function (chave) {
    var it = ITENS[chave];
    if (!it) return null;
    if (this.dinheiro < it.preco) return 'falta';
    this.gastar(it.preco, it.nome);
    if (!this.mochila) this.mochila = {};
    this.mochila[chave] = (this.mochila[chave] || 0) + 1;
    this.stats.comprou = (this.stats.comprou || 0) + 1;
    return 'ok';
  },
  usaDaMochila: function (chave) {
    if (!this.mochila || !this.mochila[chave]) return null;
    this.mochila[chave]--;
    if (!this.mochila[chave]) delete this.mochila[chave];
    var it = ITENS[chave];
    if (it.descanso && !it.carisma && !it.sorte && !it.bateria) this.lixo = true;
    return this.aplicaItem(chave);
  },
  consome: function (chave) {
    var it = ITENS[chave];
    if (!it) return null;
    if (this.dinheiro < it.preco) return 'falta';
    this.gastar(it.preco);
    this.stats.comprou = (this.stats.comprou || 0) + 1;
    return this.aplicaItem(chave);
  },
  // o efeito de um item, pago ou tirado da mochila
  aplicaItem: function (chave) {
    var it = ITENS[chave];
    this.passaTempo(it.min || 1);
    var ganho = it.descanso * ((it.noCalor && estaCalor()) ? it.noCalor : 1);
    this.addDescanso(ganho);
    if (it.carisma) this.addCarisma(it.carisma);
    if (it.bateria) {
      this.bateria = Math.min(100, (this.bateria || 0) + it.bateria);
      return 'bateria';
    }
    if (it.sorte) {
      if (Math.random() < it.sorte) { this.dinheiro += it.premio; return 'premio'; }
      return 'nada';
    }
    /* Coração só volta se estiver faltando: comprar dogão com a vida
       cheia é só um dogão. */
    var deuCoracao = false;
    if (it.coracao && this.coracoes < CORACOES_POR_PERNA) {
      this.coracoes++;
      deuCoracao = true;
    }
    return deuCoracao ? 'coracao' : 'ok';
  },

  /* ---------- relógio ---------- */
  passaTempo: function (min) {
    /* EXPLORAR não tem relógio: é o mesmo mundo, sem pressa (o horário
       fica parado no do começo) */
    if (this.explorar) return;
    this.minutos = (this.minutos + min) % 1440;
    // o celular gasta sozinho: uns 5% por hora de rua, parado no bolso
    if (this.bateria !== undefined) this.bateria = Math.max(0, this.bateria - min * 0.09);
  },
  faixa: function () { return faixaDe(this.minutos); },
  hora: function () { return horaTexto(this.minutos); },
  /* 0 = estação deserta, 1 = pico de verdade. Sobe um pouco com a
     dificuldade: quanto mais fundo no loop, mais gente em qualquer horário */
  lotacao: function () {
    var f = this.faixa();
    return Phaser.Math.Clamp(f.lotacao * (0.9 + (this.dificuldade() - 1) * 0.22), 0.1, 1.1);
  },
  /* quem chama devolve true uma vez só, quando a faixa vira */
  virouFaixa: function () {
    var k = this.faixa().key;
    if (k === this.faixaAnterior) return false;
    this.faixaAnterior = k;
    return true;
  },
  /* A dificuldade sobe por trajeto feito, não por estação passada. Com
     trinta estações por dia, contar estação fazia a curva explodir no
     primeiro dia inteiro. */
  dificuldade: function () { return 1 + (this.pernasFeitas * 0.12) + (this.dia - 1) * 0.1; },
  addCarisma: function (n) { this.carisma = Phaser.Math.Clamp(this.carisma + n, 0, 100); },
  addDescanso: function (n) { this.descanso = Phaser.Math.Clamp(this.descanso + n, 0, this.char.descansoMax); },
  gastar: function (n, desc) {
    this.dinheiro = Math.max(0, Math.round((this.dinheiro - n) * 100) / 100);
    if (n > 0) this.gastoNoDia = (this.gastoNoDia || 0) + n;     // a missão do fim do mês
    if (n > 0) this.lanca(desc || 'COMPRA', -n);
  },
  ganhar: function (n, desc) {
    this.dinheiro = Math.round((this.dinheiro + n) * 100) / 100;
    if (n > 0) this.lanca(desc || 'RECEBIDO', n);
  },
  // o extrato do banco do celular: os últimos vinte, o mais novo em cima
  lanca: function (desc, valor) {
    if (!this.extrato) this.extrato = [];
    this.extrato.unshift({ d: desc, v: valor, h: this.hora ? this.hora() : '' });
    if (this.extrato.length > 20) this.extrato.length = 20;
  },
  /* A tela de fim reserva TRÊS linhas pro motivo, e a caixa quebra a 22
     caracteres. Estes textos tinham linha de 24 e de 29: viravam cinco
     linhas e entravam por cima do placar. Cada linha aqui cabe medida —
     e motivo de derrota é melhor curto de qualquer jeito. */
  derrota: function () {
    /* No treino ninguém perde a partida: perder a briga custa o coração
       e o recado, e a tela volta pra lista. Mandar pro placar de fim de
       jogo quem só queria ver um minigame seria punir a curiosidade. */
    if (this.treino || this.explorar) return null;
    /* O atraso vem PRIMEIRO porque ele zera os corações: se a conta do
       coração respondesse antes, quem perdeu por chegar tarde leria que
       o trajeto o moeu, e nunca saberia que quem o matou foi o relógio. */
    if (this.atrasos >= MAX_ATRASOS) {
      return 'Você chegou tarde.\nO RH não quis saber\ndo metrô.';
    }
    if (this.coracoes <= 0) {
      return 'O trajeto te moeu.\nVocê sentou no chão\nnuma estação qualquer.';
    }
    if (this.descanso <= 0) return 'Você dormiu.\nAcordou no fim da\nlinha, sozinho.';
    if (this.carisma <= 0) return 'O vagão fechou na sua\ncara. De novo.';
    return null;
  },
  /* O recorde passou a ser em dias, e por isso mudou de chave: a antiga
     guardava contagem de estação, e um número de lá apareceria aqui
     como um recorde de dias que ninguém fez. */
  recorde: function () {
    var r = 0;
    try { r = parseInt(localStorage.getItem('metrosp_dias') || '0', 10) || 0; } catch (e) { }
    return r;
  },
  salvarRecorde: function () {
    if (this.treino) return;
    try {
      if (this.diasInteiros() > this.recorde()) {
        localStorage.setItem('metrosp_dias', String(this.diasInteiros()));
      }
    } catch (e) { }
  },
  // dia só conta inteiro quando a volta pra casa foi feita
  diasInteiros: function () { return Math.floor(this.pernasFeitas / 2); }
};

/* =========================================================
   PERSONAGEM PLACEHOLDER
   A silhueta é desenhada em 16x24, ampliada para 32x48 e
   sombreada automaticamente: borda de cima e da esquerda
   recebe luz, borda de baixo e da direita recebe sombra.
   É o que dá o volume que 8-bit chapado não tem.

   Só existe um corpo desenhado por inteiro: o CORPO_BASE.
   Todo o resto da população é esse corpo com algumas linhas
   trocadas — cabelo comprido, saia, criança no colo, costas
   curvadas com bengala. Sai muito mais gente diferente do
   que desenhar cada uma do zero, e mantém todo mundo com a
   mesma leitura de silhueta.
   ========================================================= */
var CORPO_BASE = {
  down: [
    '................', '....oooooooo....', '...oaaaaaaaao...', '...oaaaaaaaao...',
    '...oaaaaaaaao...', '...oakkkkkkao...', '...okkkkkkkko...', '...okkokkokko...',
    '...okkkkkkkko...', '....okkkkkko....', '......kkkk......', '..ojjjjjjjjjjo..',
    '.ojjjjjjjjjjjjo.', '.ojjjjjjjjjjjjo.', '.ojjjjjjjjjjjjo.', '.okjjjjjjjjjjko.',
    '.okjjjjjjjjjjko.', '..ojjjjjjjjjjo..', '...oppppppppo...', '....pppppppp....',
    '....ppp..ppp....', '....ppp..ppp....', '....ppp..ppp....', '....sss..sss....'],
  up: [
    '................', '....oooooooo....', '...oaaaaaaaao...', '...oaaaaaaaao...',
    '...oaaaaaaaao...', '...oaaaaaaaao...', '...oaaaaaaaao...', '...oaaaaaaaao...',
    '...oaaaaaaaao...', '....oaaaaaao....', '......kkkk......', '..ojjjjjjjjjjo..',
    '.ojjjjjjjjjjjjo.', '.ojjjjjjjjjjjjo.', '.ojjjjjjjjjjjjo.', '.okjjjjjjjjjjko.',
    '.okjjjjjjjjjjko.', '..ojjjjjjjjjjo..', '...oppppppppo...', '....pppppppp....',
    '....ppp..ppp....', '....ppp..ppp....', '....ppp..ppp....', '....sss..sss....'],
  side: [
    '................', '.....oooooo.....', '....oaaaaaaao...', '....oaaaaaaao...',
    '....oaaaakkko...', '....oaaakkkko...', '....oakokkkko...', '....okkkkkkko...',
    '.....okkkkko....', '......kkkk......', '.....jjjjjj.....', '....ojjjjjjjo...',
    '....ojjjjjjjo...', '....ojjjjjjjo...', '....ojjjjjjjko..', '....ojjjjjjjko..',
    '....ojjjjjjjo...', '.....ojjjjjo....', '.....pppppp.....', '.....pppppp.....',
    '.....ppppp......', '.....pppp.......', '.....ppp........', '.....sss........'],

  /* ---------- as duas vistas de três quartos ----------
     Com WASD e com o manche dá pra andar em oito direções, mas o
     boneco só tinha três vistas: andando na diagonal ele ia de lado
     olhando pra frente.

     O giro é desenhado no mínimo de linhas de propósito. A silhueta
     da cabeça e do tronco fica igual à da frente, e só mudam a
     têmpora, os olhos, o pescoço e a linha do ombro. É isso que faz
     os sete cabelos, a saia, a bengala, a mochila, a bolsa, o colo e
     a barriga valerem na diagonal sem uma linha nova de desenho: o
     que eles trocam continua caindo no mesmo lugar.

     Estas são as versões viradas pra direita. A esquerda é a mesma
     coisa espelhada. */
  diagDown: [
    '................', '....oooooooo....', '...oaaaaaaaao...', '...oaaaaaaaao...',
    '...oaaaaaaaao...', '...oaakkkkkao...', '...okkkkkkkko...', '...okkkokkoko...',
    '...okkkkkkkko...', '....okkkkkko....', '.......kkkk.....', '...ojjjjjjjjo...',
    '..ojjjjjjjjjjo..', '..ojjjjjjjjjjo..', '..ojjjjjjjjjjo..', '..okjjjjjjjjko..',
    '..okjjjjjjjjko..', '...ojjjjjjjjo...', '...oppppppppo...', '....pppppppp....',
    '....ppp..ppp....', '....ppp..ppp....', '....ppp..ppp....', '....sss..sss....'],
  diagUp: [
    '................', '....oooooooo....', '...oaaaaaaaao...', '...oaaaaaaaao...',
    '...oaaaaaaaao...', '...oaaaaaaaao...', '...oaaaaaaaao...', '...oaaaaaaaao...',
    '...oaaaaaaaao...', '....oaaaaaao....', '.......kkkk.....', '...ojjjjjjjjo...',
    '..ojjjjjjjjjjo..', '..ojjjjjjjjjjo..', '..ojjjjjjjjjjo..', '..okjjjjjjjjko..',
    '..okjjjjjjjjko..', '...ojjjjjjjjo...', '...oppppppppo...', '....pppppppp....',
    '....ppp..ppp....', '....ppp..ppp....', '....ppp..ppp....', '....sss..sss....'],

  /* ---------- sentado ----------
     Quem senta usava o boneco em pé virado de lado: de cima ficava um
     sujeito de pé colado no banco. Sentado é a mesma cabeça e o mesmo
     tronco do perfil — por isso as linhas 0 a 17 são idênticas, e os
     sete cabelos, a mochila, a bolsa e o celular caem no lugar sem uma
     linha nova — e pernas que saem pra frente, pro corredor, com o
     joelho dobrando e o pé descendo.

     Desenhado virado pra direita, pra quem senta na baia da esquerda.
     A outra parede é a mesma coisa espelhada. */
  sentado: [
    '................', '.....oooooo.....', '....oaaaaaaao...', '....oaaaaaaao...',
    '....oaaaakkko...', '....oaaakkkko...', '....oakokkkko...', '....okkkkkkko...',
    '.....okkkkko....', '......kkkk......', '.....jjjjjj.....', '....ojjjjjjjo...',
    '....ojjjjjjjo...', '....ojjjjjjjo...', '....ojjjjjjjko..', '....ojjjjjjjko..',
    '....ojjjjjjjo...', '.....ojjjjjo....', '....opppppppo...', '....oppppppppo..',
    '.......opppppo..', '.......opp.ppo..', '.......opp.ppo..', '.......oss.sso..'],

  /* ---------- sentado de frente e sentado de costas ----------
     O banco de perfil dava conta enquanto todo banco era encostado na
     parede. O vagão de verdade não é assim: ele tem os dois bancos
     virados um pro outro, e quem senta neles fica de frente pra outra
     pessoa — olhando pro fundo do vagão ou pra você.

     De frente: a mesma cabeça e o mesmo tronco do boneco de frente
     (linhas 0 a 17 idênticas, e por isso os sete cabelos, a mochila, a
     bolsa e o celular caem no lugar sem uma linha nova), e as coxas
     abrindo em direção a quem olha, com o joelho vindo pra frente e o
     pé aparecendo por baixo.

     De costas: a mesma coisa do boneco de costas, e as pernas somem —
     de cima, quem está sentado de costas pra você mostra o ombro e o
     encosto, não a perna. */
  sentadoFrente: [
    '................', '....oooooooo....', '...oaaaaaaaao...', '...oaaaaaaaao...',
    '...oaaaaaaaao...', '...oakkkkkkao...', '...okkkkkkkko...', '...okkokkokko...',
    '...okkkkkkkko...', '....okkkkkko....', '......kkkk......', '..ojjjjjjjjjjo..',
    '.ojjjjjjjjjjjjo.', '.ojjjjjjjjjjjjo.', '.ojjjjjjjjjjjjo.', '.okjjjjjjjjjjko.',
    '.okjjjjjjjjjjko.', '..ojjjjjjjjjjo..', '...oppppppppo...', '..opppppppppppo.',
    '..opppo..opppo..', '..opppo..opppo..', '..osso....osso..', '................'],
  sentadoCostas: [
    '................', '....oooooooo....', '...oaaaaaaaao...', '...oaaaaaaaao...',
    '...oaaaaaaaao...', '...oaaaaaaaao...', '...oaaaaaaaao...', '...oaaaaaaaao...',
    '...oaaaaaaaao...', '....oaaaaaao....', '......kkkk......', '..ojjjjjjjjjjo..',
    '.ojjjjjjjjjjjjo.', '.ojjjjjjjjjjjjo.', '.ojjjjjjjjjjjjo.', '.okjjjjjjjjjjko.',
    '.okjjjjjjjjjjko.', '..ojjjjjjjjjjo..', '...oppppppppo...', '...oppppppppo...',
    '....pppppppp....', '................', '................', '................']
};

// a pose de segurar parte do de frente; o braço sobe depois das camadas (bracoPraCima)
CORPO_BASE.segurando = CORPO_BASE.down;
CORPO_BASE.segurandoCostas = CORPO_BASE.up;      // segurando de costas: olhando pra onde vai

/* pernas: os quadros de caminhada trocam as últimas linhas do corpo */
var PERNAS_PADRAO = {
  inicio: 20,
  frente: [
    ['...pppp..ppp....', '...ppp....pp....', '..sss.....pp....', '..........sss...'],
    ['....ppp..pppp...', '....pp....ppp...', '....pp.....sss..', '...sss..........']
  ],
  lado: [
    ['....pppppp......', '...ppp..ppp.....', '..ppp....pp.....', '..sss.....ss....'],
    ['.....ppppp......', '.....pppp.......', '....pppp........', '...sss..........']
  ]
};

/* ---------- cabelo comprido ---------- */
var CABELO_LONGO = {
  down: {
    1: '...oooooooooo...', 2: '..oaaaaaaaaaao..', 3: '..oaaaaaaaaaao..',
    4: '..oaaaaaaaaaao..', 5: '..oaakkkkkkaao..', 6: '..oaakkkkkkaao..',
    7: '..oaakokkokaao..', 8: '..oaakkkkkkaao..', 9: '..oaaakkkkaaao..',
    10: '...oaakkkkaao...', 11: '..oajjjjjjjjao..', 12: '.ojajjjjjjjjajo.'
  },
  up: {
    1: '...oooooooooo...', 2: '..oaaaaaaaaaao..', 3: '..oaaaaaaaaaao..',
    4: '..oaaaaaaaaaao..', 5: '..oaaaaaaaaaao..', 6: '..oaaaaaaaaaao..',
    7: '..oaaaaaaaaaao..', 8: '..oaaaaaaaaaao..', 9: '..oaaaaaaaaaao..',
    10: '...oaaaaaaao....', 11: '..oajjjjjjjjao..', 12: '.ojajjjjjjjjajo.'
  },
  side: {
    2: '...oaaaaaaaao...', 3: '...oaaaaaaaao...', 4: '...oaaaaakkko...',
    5: '...oaaaakkkko...', 6: '...oaakokkkko...', 7: '...oaakkkkkko...',
    8: '...oaaakkkko....', 9: '...oaaakkko.....', 10: '....oaajjjjjo...'
  },
  /* de três quartos só muda o rosto virado e o ombro estreito; o resto
     do cabelo comprido vem da vista de frente */
  diagDown: {
    7: '..oaakkokkoaao..', 11: '...oajjjjjjao...', 12: '..ojajjjjjjajo..'
  },
  diagUp: { 11: '...oajjjjjjao...', 12: '..ojajjjjjjajo..' }
};

/* ---------- saia ---------- */
var MOD_SAIA = {
  down: {
    18: '..opppppppppo...', 19: '.opppppppppppo..', 20: '.oppppppppppppo.',
    21: '....kkk..kkk....', 22: '....kkk..kkk....', 23: '....sss..sss....'
  },
  up: {
    18: '..opppppppppo...', 19: '.opppppppppppo..', 20: '.oppppppppppppo.',
    21: '....kkk..kkk....', 22: '....kkk..kkk....', 23: '....sss..sss....'
  },
  side: {
    18: '....opppppo.....', 19: '...opppppppo....', 20: '...opppppppo....',
    21: '....kkk.kk......', 22: '....kk..kk......', 23: '....ss..ss......'
  },
  /* sentada a barra cai sobre a coxa e a perna aparece do joelho pra
     baixo. Sem isto a saia herdava a perna em pé por cima do corpo
     sentado, e virava uma pessoa de pé colada no banco. */
  sentado: {
    18: '...opppppppo....', 19: '...opppppppppo..', 20: '.....oppppppo...',
    21: '.......okk.kko..', 22: '.......okk.kko..', 23: '.......oss.sso..'
  },
  /* Nos bancos virados um pro outro a saia precisa das duas vistas
     dela: de frente a barra cai sobre a coxa e o joelho aparece por
     baixo; de costas ela cobre o banco inteiro e não sobra perna
     nenhuma pra ver. Sem isto a saia herdava a perna EM PÉ do boneco
     de frente por cima do corpo sentado. */
  sentadoFrente: {
    18: '..opppppppppppo.', 19: '.oppppppppppppo.', 20: '..oppppppppppo..',
    21: '...okkk..kkko...', 22: '...osso..osso...', 23: '................'
  },
  sentadoCostas: {
    18: '..opppppppppppo.', 19: '.oppppppppppppo.', 20: '..oppppppppppo..',
    21: '................', 22: '................', 23: '................'
  },
  pernas: {
    inicio: 21,
    frente: [
      ['...kkk....kk....', '..kkk.....kk....', '..sss.....sss...'],
      ['....kk....kkk...', '....kk.....kkk..', '...sss.....sss..']
    ],
    lado: [
      ['....kkkk........', '...kkk..kk......', '..sss....ss.....'],
      ['.....kkkk.......', '.....kkk........', '....sss.........']
    ]
  }
};

/* ---------- criança de colo ---------- */
var MOD_COLO = {
  down: {
    12: '.ojjjowwwwojjjo.', 13: '.ojjowwkkwwojjo.', 14: '.okjowwkkwwojko.',
    15: '.okjowwwwwwojko.', 16: '.ojjjowwwwojjjo.'
  },
  side: {
    12: '....ojjjjowwo...', 13: '....ojjjowkwo...', 14: '....ojjjowwwo...',
    15: '....ojjjjowwo...', 16: '....ojjjjjjko...'
  },
  diagDown: {
    12: '..ojjowwwwojjo..', 13: '..ojowwkkwwojo..', 14: '..okowwkkwwoko..',
    15: '..okowwwwwwoko..', 16: '..ojjowwwwojjo..'
  }
};

/* ---------- barriga de grávida ---------- */
var MOD_BARRIGA = {
  down: {
    15: '.ojjowwwwwwojjo.', 16: '.okjowwwwwwojko.', 17: '..ojjowwwwojjo..'
  },
  side: {
    12: '....ojjjjjjjjo..', 13: '....ojjjjjjjjjo.', 14: '....ojjjjjjjjjo.',
    15: '....okjjjjjjjjo.', 16: '....ojjjjjjjjo..', 17: '.....ojjjjjjo...'
  },
  diagDown: {
    15: '..ojowwwwwwojo..', 16: '..okowwwwwwoko..', 17: '...ojowwwwojo...'
  }
};

/* ---------- costas curvadas e bengala ---------- */
var MOD_BENGALA = {
  down: {
    10: '.....okkkko.....', 13: '.ojjjjjjjjjjjjo.', 14: '.ojjjjjjjjjjjjo.',
    16: '.okjjjjjjjjjjkow', 17: '..ojjjjjjjjjjo.w', 18: '...oppppppppo..w',
    19: '....pppppppp...w', 20: '....ppp..ppp...w', 21: '....ppp..ppp...w',
    22: '....ppp..ppp...w', 23: '....sss..sss...w'
  },
  up: {
    10: '.....okkkko.....', 16: '.okjjjjjjjjjjkow', 17: '..ojjjjjjjjjjo.w',
    18: '...oppppppppo..w', 19: '....pppppppp...w', 20: '....ppp..ppp...w',
    21: '....ppp..ppp...w', 22: '....ppp..ppp...w', 23: '....sss..sss...w'
  },
  side: {
    16: '....ojjjjjjjo.w.', 17: '.....ojjjjjo..w.', 18: '.....pppppp...w.',
    19: '.....pppppp...w.', 20: '.....ppppp....w.', 21: '.....pppp.....w.',
    22: '.....ppp......w.', 23: '.....sss......w.'
  },
  /* sentado ele encosta a bengala no banco, ao lado do corpo */
  sentado: {
    16: '....ojjjjjjjo.w.', 17: '.....ojjjjjo..w.', 18: '....opppppppow..',
    19: '....oppppppppow.', 20: '.......opppppow.', 21: '.......opp.ppow.',
    22: '.......opp.ppow.', 23: '.......oss.ssow.'
  },
  /* nos bancos virados um pro outro a bengala fica encostada na
     lateral, e as pernas são as de quem está sentado */
  sentadoFrente: {
    18: '...oppppppppo..w', 19: '..opppppppppppow', 20: '..opppo..opppo.w',
    21: '..opppo..opppo.w', 22: '..osso....osso.w', 23: '...............w'
  },
  sentadoCostas: {
    18: '...oppppppppo..w', 19: '...oppppppppo..w', 20: '....pppppppp...w',
    21: '...............w', 22: '...............w', 23: '................'
  },
  /* o tronco estreita até a linha da mão e para ali: a bengala é uma
     coluna fixa na beirada, e mão que recua solta a bengala no ar.
     Uma linha de ombro a mais no três-quartos lê como cotovelo. */
  diagDown: {
    10: '......okkkko....', 13: '..ojjjjjjjjjjo..', 14: '..ojjjjjjjjjjo..'
  },
  diagUp: { 10: '......okkkko....' },
  pernas: {
    inicio: 20,
    frente: [
      ['....ppp..ppp...w', '....pp...ppp...w', '...sss...ppp...w', '.........sss...w'],
      ['....ppp..ppp...w', '....ppp...pp...w', '....ppp...sss..w', '...sss.........w']
    ],
    lado: [
      ['....pppppp....w.', '...ppp..ppp...w.', '..ppp....pp...w.', '..sss.....ss..w.'],
      ['.....ppppp....w.', '.....pppp.....w.', '....pppp......w.', '...sss........w.']
    ]
  }
};

/* ---------- formatos de cabelo ----------
   Antes o cabelo era só troca de cor no mesmo capacete, e a multidão
   inteira tinha a mesma cabeça. Cada formato aqui é uma edição das
   linhas do alto da cabeça, então combina com qualquer corpo e com
   qualquer acessório. */

var CABELO_CARECA = {
  down: {
    2: '...okkkkkkkko...', 3: '...okkkkkkkko...', 4: '...oakkkkkkao...'
  },
  up: {
    2: '...okkkkkkkko...', 3: '...okkkkkkkko...', 4: '...okkkkkkkko...',
    5: '...okkkkkkkko...', 6: '...oakkkkkkao...', 7: '...oaakkkkaao...',
    8: '...oaaaaaaaao...'
  },
  side: {
    2: '....okkkkkkko...', 3: '....okkkkkkko...', 4: '....oakkkkkko...',
    5: '....oaakkkkko...'
  }
};

/* cabelo alto e cheio, transbordando a largura da cabeça */
var CABELO_VOLUMOSO = {
  down: {
    0: '...oaaaaaaaao...', 1: '..oaaaaaaaaaao..', 2: '..oaaaaaaaaaao..',
    3: '..oaaaaaaaaaao..', 4: '..oaaaaaaaaaao..', 5: '..oaakkkkkkaao..'
  },
  up: {
    0: '...oaaaaaaaao...', 1: '..oaaaaaaaaaao..', 2: '..oaaaaaaaaaao..',
    3: '..oaaaaaaaaaao..', 4: '..oaaaaaaaaaao..', 5: '..oaaaaaaaaaao..',
    6: '..oaaaaaaaaaao..', 7: '..oaaaaaaaaaao..', 8: '...oaaaaaaaao...'
  },
  side: {
    0: '....oooooo......', 1: '...oaaaaaaao....', 2: '..oaaaaaaaaao...',
    3: '..oaaaaaaaaao...', 4: '..oaaaaaaakkko..', 5: '...oaaaakkkko...'
  }
};

/* coque preso no alto: sobe uma linha inteira acima do crânio, senão
   some no meio do contorno */
var CABELO_COQUE = {
  down: {
    0: '....oaaaaaao....', 1: '...ooaaaaaaoo...'
  },
  up: {
    0: '....oaaaaaao....', 1: '...ooaaaaaaoo...'
  },
  side: {
    0: '...oaaaao.......', 1: '...oaaaaoooo....'
  }
};

/* rabo de cavalo: preso, então de frente sobra só a mecha ao lado da
   orelha; de costas ele desce pela nuca e de perfil fica pra trás.
   Vai sobre o cabelo curto — sobre o comprido não sobraria rabo. */
var CABELO_RABO = {
  down: {
    4: '...oaaaaaaaaoaa.', 5: '...oakkkkkkaoaa.', 6: '...okkkkkkkkoaa.',
    7: '...okkokkokkoaa.', 8: '...okkkkkkkkoaa.', 9: '....okkkkkkoaa..'
  },
  up: {
    10: '......aaaa......', 11: '..ojjjaaaajjjo..', 12: '.ojjjjaaaajjjjo.',
    13: '.ojjjjaaaajjjjo.', 14: '.ojjjjjaajjjjjo.'
  },
  diagDown: { 7: '...okkkokkokoaa.' },
  diagUp: {
    11: '...ojjaaaajjo...', 12: '..ojjjaaaajjjo..',
    13: '..ojjjaaaajjjo..', 14: '..ojjjjaajjjjo..'
  },
  side: {
    4: '..aaoaaaakkko...', 5: '..aaoaaakkkko...', 6: '..aaoakokkkko...',
    7: '..aaokkkkkkko...', 8: '..aa.okkkkko....', 9: '..aa..kkkk......'
  }
};

/* boné, com aba pra frente */
var CABELO_BONE = {
  down: {
    1: '....oooooooo....', 2: '...oaaaaaaaao...', 3: '...oaaaaaaaao...',
    4: '..owwwwwwwwwwo..'
  },
  up: {
    1: '....oooooooo....', 2: '...oaaaaaaaao...', 3: '...oaaaaaaaao...',
    4: '...oaaaaaaaao...', 5: '...oawwwwwwao...'
  },
  side: {
    1: '.....oooooo.....', 2: '....oaaaaaaao...', 3: '....oaaaaaaao...',
    4: '....oaaawwwwwwo.', 5: '....oaaakkkko...'
  }
};

/* ---------- a touca ----------
   Gorro de lã preto com a barra dobrada branca, cobrindo a cabeça até a
   testa: é o corintiano da arquibancada. Ele sobe um pixel acima da
   cabeça (a linha 0), que é o volume da lã. */
var CABELO_TOUCA = {
  down: {
    0: '.....oooooo.....', 1: '....ojjjjjjo....', 2: '...ojjjjjjjjo...', 3: '...ojjjjjjjjo...',
    4: '..owwwwwwwwwwo..'
  },
  up: {
    0: '.....oooooo.....', 1: '....ojjjjjjo....', 2: '...ojjjjjjjjo...', 3: '...ojjjjjjjjo...',
    4: '..owwwwwwwwwwo..'
  },
  side: {
    0: '......oooo......', 1: '.....ojjjjo.....', 2: '....ojjjjjjjo...', 3: '....ojjjjjjjo...',
    4: '...owwwwwwwwo...'
  }
};

/* ---------- o calvo ----------
   A cabeça inteira lisa, sem a coroa de cabelo do careca: é o
   são-paulino, que é pra lembrar o Rogério Ceni. */
var CABELO_CALVO = {
  down: { 2: '...okkkkkkkko...', 3: '...okkkkkkkko...', 4: '...okkkkkkkko...', 5: '...okkkkkkkko...' },
  up: {
    2: '...okkkkkkkko...', 3: '...okkkkkkkko...', 4: '...okkkkkkkko...', 5: '...okkkkkkkko...',
    6: '...okkkkkkkko...', 7: '...okkkkkkkko...', 8: '...okkkkkkkko...', 9: '....okkkkkko....'
  },
  side: {
    2: '....okkkkkkko...', 3: '....okkkkkkko...', 4: '....okkkkkkko...', 5: '....okkkkkkko...',
    6: '....okkokkkko...'
  }
};

/* O magro: o tronco perde uma coluna de cada lado nas vistas de frente
   e de costas (a de lado já é estreita). As mãos ficam uma coluna pra
   dentro. Roda antes da camisa, pra listra e faixa caírem no corpo novo. */
function afina(alvo) {
  var vistas = ['down', 'up', 'diagDown', 'diagUp', 'sentadoFrente', 'sentadoCostas'];
  for (var d = 0; d < vistas.length; d++) {
    var a = alvo[vistas[d]];
    if (!a) continue;
    a = a.slice(0);
    for (var y = 11; y <= 17; y++) {
      var r = a[y], n = '.' + r[0] + r.substr(2, 12) + r[15] + '.';
      var c = n.split('');
      if (c[2] !== '.') c[2] = 'o';
      if (c[13] !== '.') c[13] = 'o';
      if ((y === 15 || y === 16) && c[3] === 'j') { c[3] = 'k'; c[12] = 'k'; }
      a[y] = c.join('');
    }
    alvo[vistas[d]] = a;
  }
}

/* ---------- o moicano ----------
   O do santista, o do Neymar de 2010: crista alta e espetada, escura na
   base ('a') com as pontas douradas ('e'), laterais raspadas (vira pele)
   e o mullet caindo na nuca. De lado a nuca fica à esquerda (o boneco
   de lado olha pra direita), e é por ali que o mullet sai. */
var CABELO_MOICANO = {
  down: {
    0: '.....oeoeoeo....', 1: '....oaeeeeao....', 2: '...oyaaaaaayo...', 3: '...oyyaaaayyo...',
    4: '...oyyyaayyyo...', 5: '...okkkkkkkko...'
  },
  up: {
    0: '.....oeoeoeo....', 1: '....oaeeeeao....', 2: '...oyaaaaaayo...', 3: '...oyyaaaayyo...',
    4: '...oyyaaaayyo...', 5: '...oyyaaaayyo...', 6: '...oyyaaaayyo...', 7: '...oyaaaaaayo...',
    8: '...oaaaaaaaao...', 9: '....oaaaaaao....', 10: '.....oaaaao.....'
  },
  side: {
    0: '.....oeoeoeo....', 1: '....oaeeeeeao...', 2: '....oaayyyyyo...', 3: '....oayyyyyyo...',
    4: '....oayyykkko...', 5: '....oayykkkko...', 7: '...oaakkkkkko...', 8: '....oaokkkko....'
  }
};

/* ---------- acessórios ----------
   Mesma silhueta, gente diferente: quem carrega mochila, quem leva
   bolsa a tiracolo e quem vai o trajeto inteiro no celular. */
var MOD_MOCHILA = {
  down: {
    13: '.ojjwjjjjjjwjjo.', 14: '.ojjwjjjjjjwjjo.', 15: '.okjwjjjjjjwjko.'
  },
  up: {
    12: '.ojjwwwwwwwwjjo.', 13: '.ojjwwwwwwwwjjo.', 14: '.ojjwwwwwwwwjjo.',
    15: '.okjwwwwwwwwjko.'
  },
  side: {
    11: '..wwojjjjjjjo...', 12: '..wwojjjjjjjo...', 13: '..wwojjjjjjjo...',
    14: '..wwojjjjjjjko..', 15: '...wojjjjjjjko..'
  },
  diagDown: {
    13: '..ojwjjjjjjwjo..', 14: '..ojwjjjjjjwjo..', 15: '..okwjjjjjjwko..'
  },
  diagUp: {
    12: '..ojwwwwwwwwjo..', 13: '..ojwwwwwwwwjo..', 14: '..ojwwwwwwwwjo..',
    15: '..okwwwwwwwwko..'
  }
};

var MOD_BOLSA = {
  down: {
    12: '.ojjwjjjjjjjjjo.', 13: '.ojjjwjjjjjjjjo.', 14: '.ojjjjwjjjjjjjo.',
    15: '.okjjjjwjjwwwko.', 16: '.okjjjjjjjwwwko.', 17: '..ojjjjjjjwwwo..'
  },
  up: {
    12: '.ojjjjjjjjjwjjo.', 13: '.ojjjjjjjjwjjjo.', 14: '.ojjjjjjjwjjjjo.',
    15: '.okjwwwjjjjjjko.', 16: '.okjwwwjjjjjjko.', 17: '..ojwwwjjjjjjo..'
  },
  side: {
    13: '....ojjjjjjjo...', 14: '....ojjjjjwwwo..', 15: '....ojjjjjwwwo..',
    16: '....ojjjjjwwwo..'
  },
  diagDown: {
    12: '..ojwjjjjjjjjo..', 13: '..ojjwjjjjjjjo..', 14: '..ojjjwjjjjjjo..',
    15: '..okjjjwjwwwko..', 16: '..okjjjjjwwwko..', 17: '...ojjjjjwwwo...'
  },
  diagUp: {
    12: '..ojjjjjjjjwjo..', 13: '..ojjjjjjjwjjo..', 14: '..ojjjjjjwjjjo..',
    15: '..okwwwjjjjjko..', 16: '..okwwwjjjjjko..', 17: '...owwwjjjjjo...'
  }
};

var MOD_CELULAR = {
  down: { 15: '.ojjjjkwwkjjjjo.', 16: '.ojjjjkwwkjjjjo.' },
  side: { 14: '....ojjjjjkwo...', 15: '....ojjjjjkwo...' },
  diagDown: { 15: '..ojjjkwwkjjjo..', 16: '..ojjjkwwkjjjo..' }
};

/* ---------- pedinte encostado na parede (pose única) ---------- */
var POSE_PEDINTE = [
  '................', '................', '................', '................',
  '................', '....oooooooo....', '...oaaaaaaaao...', '...oaaaaaaaao...',
  '...oakkkkkkao...', '...okkokkokko...', '...okkkkkkkko...', '....okkkkkko....',
  '.....okkkko.....', '...ojjjjjjjjo...', '..ojjjjjjjjjjo..', '..ojjjjjjjjjjo..',
  '..okjjjjjjjjko..', '..okjppppppjko.w', '..ojppppppppjo.w', '...opppppppo....',
  '...osssssso.....', '................', '................', '................'
];

/* o cabelo espetado do Naruto e do Sasuke: as pontas saindo do topo */
var CABELO_ESPETADO = {
  down: { 0: '...oa.oaao.ao...', 1: '..oaaaaaaaaaao..', 2: '..oaaaaaaaaaao..', 3: '..oaaaaaaaaaao..', 4: '..oaaaaaaaaaao..', 5: '..oaakkkkkkaao..' },
  up: { 0: '...oa.oaao.ao...', 1: '..oaaaaaaaaaao..', 2: '..oaaaaaaaaaao..', 3: '..oaaaaaaaaaao..', 4: '..oaaaaaaaaaao..', 5: '..oaaaaaaaaaao..', 6: '..oaaaaaaaaaao..', 7: '..oaaaaaaaaaao..', 8: '...oaaaaaaaao...' },
  side: { 0: '....oa.oa.ao....', 1: '...oaaaaaaaoa...', 2: '..oaaaaaaaaao...', 3: '..oaaaaaaaaao...', 4: '..oaaaaaaakkko..', 5: '...oaaaakkkko...' }
};

/* cada tipo de gente é uma pilha de camadas sobre o corpo base */
var CORPOS = {
  padrao: {},
  longo: CABELO_LONGO,
  saia: { herda: 'longo', mods: [MOD_SAIA] },
  colo: { mods: [MOD_COLO] },
  colo_longo: { herda: 'longo', mods: [MOD_COLO] },
  gestante: { herda: 'longo', mods: [MOD_BARRIGA] },
  senhor: { mods: [CABELO_CARECA, MOD_BENGALA] },
  senhor_grisalho: { mods: [MOD_BENGALA] },
  senhora: { herda: 'longo', mods: [MOD_BENGALA] },
  senhora_coque: { herda: 'longo', mods: [CABELO_COQUE, MOD_BENGALA] },
  careca: { mods: [CABELO_CARECA] },
  volumoso: { mods: [CABELO_VOLUMOSO] },
  volumoso_bolsa: { mods: [CABELO_VOLUMOSO, MOD_BOLSA] },
  coque: { herda: 'longo', mods: [CABELO_COQUE] },
  coque_saia: { herda: 'saia', mods: [CABELO_COQUE] },
  rabo: { mods: [CABELO_RABO] },
  rabo_mochila: { mods: [CABELO_RABO, MOD_MOCHILA] },
  bone: { mods: [CABELO_BONE] },
  bone_mochila: { mods: [CABELO_BONE, MOD_MOCHILA] },
  careca_celular: { mods: [CABELO_CARECA, MOD_CELULAR] },
  mochila: { mods: [MOD_MOCHILA] },
  mochila_longo: { herda: 'longo', mods: [MOD_MOCHILA] },
  bolsa: { herda: 'longo', mods: [MOD_BOLSA] },
  bolsa_curto: { mods: [MOD_BOLSA] },
  celular: { mods: [MOD_CELULAR] },
  celular_longo: { herda: 'longo', mods: [MOD_CELULAR] },
  saia_bolsa: { herda: 'saia', mods: [MOD_BOLSA] },
  pedinte: { poseUnica: true, down: POSE_PEDINTE, up: POSE_PEDINTE, side: POSE_PEDINTE },
  /* ---------- o cadeirante ----------
     Sentado na cadeira de rodas, a cabeça três linhas mais baixa, as
     rodas dos dois lados (pneu 'z', o raio claro 'w', o quadro 'y'). De
     lado, uma roda grande cobre o corpo. Andando, o raio muda de lugar e
     a roda gira. */
  cadeirante: {
    down: ['................', '................', '................', '....oooooooo....', '...oaaaaaaaao...', '...oaaaaaaaao...', '...oakkkkkkao...', '...okkokkokko...', '...okkkkkkkko...', '....okkkkkko....', '......kkkk......', '...ojjjjjjjjo...', '.oooojjjjjjoooo.', 'ozzokjjjjjjkozzo', 'ozwoppppppppowzo', 'ozzoppppppppozzo', 'ozzoyppppppyozzo', 'ozwo.pp..pp.owzo', 'ozzo.pp..pp.ozzo', '.oo..ss..ss..oo.', '....yyyyyyyy....', '................', '................', '................'],
    up: ['................', '................', '................', '....oooooooo....', '...oaaaaaaaao...', '...oaaaaaaaao...', '...oaaaaaaaao...', '...oaaaaaaaao...', '...oaaaaaaaao...', '....oaaaaaao....', '......kkkk......', '..yojjjjjjjjoy..', '.ooyyyyyyyyyyoo.', 'ozzoyyyyyyyyozzo', 'ozwoyyyyyyyyowzo', 'ozzoyyyyyyyyozzo', 'ozzo.yyyyyy.ozzo', 'ozwo........owzo', 'ozzo........ozzo', '.oo..........oo.', '................', '................', '................', '................'],
    side: ['................', '................', '................', '.....oooooo.....', '....oaaaaaaao...', '....oaaaaaaao...', '....oaaaakkko...', '....oaaakkkko...', '....oakokkkko...', '....okkkkkkko...', '.....okkkkko....', '......kkkk......', '....ojjjjjjo....', '...oozzzzzjo....', '..ozzwwwwzzkk...', '..ozwzzzzwzpppo.', '..ozwzzzzwzpppo.', '..ozzwwwwzz.pso.', '...oozzzzoo.sso.', '.....oooo....yy.', '................', '................', '................', '................'],
    pernas: { inicio: 14, frente: [['ozzoppppppppozzo', 'ozwoppppppppowzo', 'ozzoyppppppyozzo', 'ozzo.pp..pp.ozzo', 'ozwo.pp..pp.owzo'], ['ozwoppppppppowzo', 'ozzoppppppppozzo', 'ozwoyppppppyowzo', 'ozzo.pp..pp.ozzo', 'ozzo.pp..pp.ozzo']], lado: [['..ozwwzzwwzkk...', '..ozzzwwzzzpppo.', '..ozzzwwzzzpppo.', '..ozwwzzwwz.pso.', '...oozzzzoo.sso.'], ['..ozzzwwzzzkk...', '..ozwwzzwwzpppo.', '..ozwwzzwwzpppo.', '..ozzzwwzzz.pso.', '...oozzzzoo.sso.']] }
  },
  /* os torcedores, cada um com a camisa do time: o corintiano de touca,
     os outros sem nada na cabeça; e a versão de cabelo comprido de cada um */
  touca_corinthians: { mods: [CABELO_TOUCA], pos: camisaDeTime('corinthians') },
  palmeiras: { pos: camisaDeTime('palmeiras') },
  // o são-paulino: calvo e magro, pra lembrar o Rogério Ceni
  careca_saopaulo: { mods: [CABELO_CALVO], pos: function (a) { afina(a); camisaDeTime('saopaulo')(a); } },
  moicano_santos: { mods: [CABELO_MOICANO], pos: camisaDeTime('santos') },     // o santista, de moicano
  // o uniforme do metrô: azul-marinho, com o crachá amarelo no peito
  atendente: { pos: crachaDoMetro },
  atendente_coque: { herda: 'longo', mods: [CABELO_COQUE], pos: crachaDoMetro },
  longo_corinthians: { herda: 'longo', pos: camisaDeTime('corinthians') },
  longo_palmeiras: { herda: 'longo', pos: camisaDeTime('palmeiras') },
  longo_saopaulo: { herda: 'longo', pos: camisaDeTime('saopaulo') },
  rabo_santos: { mods: [CABELO_RABO], pos: camisaDeTime('santos') },
  // os cosplayers da Liberdade (roupaCosplay)
  cos_marinheira: { herda: 'saia', pos: roupaCosplay('marinheira') },
  cos_akatsuki: { mods: [CABELO_RABO], pos: roupaCosplay('akatsuki') },
  cos_naruto: { mods: [CABELO_ESPETADO], pos: roupaCosplay('naruto') },
  cos_sasuke: { mods: [CABELO_ESPETADO], pos: roupaCosplay('sasuke') },
  cos_sakura: { herda: 'longo', pos: roupaCosplay('sakura') }
};

var DIRS = ['down', 'up', 'side', 'diagDown', 'diagUp', 'sentado', 'sentadoFrente', 'sentadoCostas', 'segurando', 'segurandoCostas'];

/* ---------- segurando a barra do teto ----------
   A pose nasce do boneco de frente DEPOIS de todas as camadas (cabelo,
   saia, mochila, bengala): o braço da direita sobe pelo lado da cabeça
   até a linha 0, com a mão fechada no alto, e a mão que estava do lado
   do corpo some. Feito por cima e não como camada porque o braço tem
   que passar na frente de qualquer cabelo. No quadro de 32x48 a mão
   fica 12px à direita do meio: é essa a distância pra barra. */
var MAO_DA_BARRA = 12;
function bracoPraCima(art) {
  var a = art.slice(0), y;
  function poe(yy, x, ch) { a[yy] = a[yy].substr(0, x) + ch + a[yy].substr(x + 1); }
  poe(0, 12, 'o'); poe(0, 13, 'k'); poe(0, 14, 'k'); poe(0, 15, 'o');
  for (y = 1; y <= 10; y++) {
    if (a[y][12] === '.') poe(y, 12, 'o');
    poe(y, 13, y < 2 ? 'k' : 'j'); poe(y, 14, y < 2 ? 'k' : 'j'); poe(y, 15, 'o');
  }
  poe(11, 13, 'j'); poe(11, 14, 'j'); poe(11, 15, 'o');
  for (y = 13; y <= 17; y++) if (a[y][13] === 'k') poe(y, 13, 'j');
  return a;
}
/* A diagonal parte do que a camada faz de frente (ou de costas) e leva
   por cima só o que é diferente nela. Sem isso, toda camada teria que
   redesenhar as linhas inteiras pra existir na diagonal, e um cabelo
   comprido que só precisa mexer no olho perderia o resto. */
var DIR_HERDA = {
  diagDown: 'down', diagUp: 'up', sentado: 'side',
  sentadoFrente: 'down', sentadoCostas: 'up', segurando: 'down', segurandoCostas: 'up'
};

function aplicaDir(alvo, nome, linhas) {
  if (!linhas) return;
  if (Array.isArray(linhas)) alvo[nome] = linhas.slice(0);   // pose inteira
  else for (var k in linhas) alvo[nome][k | 0] = linhas[k];  // só as linhas trocadas
}

function aplicaCamada(alvo, camada) {
  for (var d = 0; d < DIRS.length; d++) {
    var nome = DIRS[d];
    aplicaDir(alvo, nome, camada[DIR_HERDA[nome]]);
    aplicaDir(alvo, nome, camada[nome]);
  }
  if (camada.pernas) alvo.pernas = camada.pernas;
  if (camada.poseUnica) alvo.poseUnica = true;
}

function resolveCorpo(key) {
  var c = CORPOS[key] || CORPOS.padrao;
  var alvo;
  if (c.herda) {
    alvo = resolveCorpo(c.herda);
  } else {
    alvo = { pernas: PERNAS_PADRAO, poseUnica: false };
    for (var d = 0; d < DIRS.length; d++) alvo[DIRS[d]] = CORPO_BASE[DIRS[d]].slice(0);
  }
  aplicaCamada(alvo, c);
  var mods = c.mods || [];
  for (var i = 0; i < mods.length; i++) aplicaCamada(alvo, mods[i]);
  if (c.pos) c.pos(alvo);
  return alvo;
}

/* ---------- camisa de time ----------
   Troca pixel da camisa ('j') depois de todas as camadas, em todas as
   vistas, porque listra e gola não são linhas inteiras que uma camada
   substitui: são pontos no meio do tronco.
   - Corinthians (a retrô das fotos): preta com listras brancas finas em
     pé, a cada 3 pixels de desenho; gola redonda e punho brancos; o
     escudo vermelho no peito.
   - Palmeiras (a das fotos, sem patrocínio): verde, gola polo branca
     que desce em V, punho branco e o escudo branco no peito.
   - São Paulo (a retrô das fotos): branca, faixa vermelha e preta no
     meio do peito só no tronco, com o escudinho branco em cima da faixa;
     gola em V e punho vermelhos.
   - Santos (a clássica das fotos): toda branca, gola redonda branca, e
     só o escudo preto e branco no peito.
   O escudo fica no peito esquerdo de quem veste, à direita de quem olha.
   As cores moram na paleta ('j' a camisa, 'e' o vermelho, 'z' o preto). */
var VISTA_FRENTE = ['down', 'diagDown', 'sentadoFrente'], VISTA_COSTAS = ['up', 'diagUp', 'sentadoCostas'];
function crachaDoMetro(alvo) {
  for (var d = 0; d < VISTA_FRENTE.length; d++) {
    var a = alvo[VISTA_FRENTE[d]];
    if (!a || a[13][10] !== 'j') continue;
    a = a.slice(0);
    a[13] = a[13].substr(0, 10) + 'w' + a[13].substr(11);
    alvo[VISTA_FRENTE[d]] = a;
  }
}
function camisaDeTime(time) {
  var gola = { corinthians: 'w', palmeiras: 'w', saopaulo: 'e' }[time];
  var escudo = { corinthians: 'e', palmeiras: 'w', santos: 'z' }[time];
  return function (alvo) {
    for (var d = 0; d < DIRS.length; d++) {
      var nome = DIRS[d];
      if (!alvo[nome]) continue;
      var a = alvo[nome].slice(0), x, y;
      var poe = function (yy, xx, ch) {
        if (a[yy] && a[yy][xx] === 'j') a[yy] = a[yy].substr(0, xx) + ch + a[yy].substr(xx + 1);
      };
      if (time === 'corinthians') for (y = 11; y <= 17; y++) for (x = 3; x < 16; x += 3) poe(y, x, 'w');
      if (time === 'saopaulo') {
        for (x = 3; x <= 12; x++) { poe(13, x, 'e'); poe(14, x, 'z'); }
        if (VISTA_FRENTE.indexOf(nome) >= 0) {
          a[13] = a[13].substr(0, 7) + 'ww' + a[13].substr(9);      // o escudo, na faixa
          a[14] = a[14].substr(0, 7) + 'w' + a[14].substr(8);
        }
      }
      var frente = VISTA_FRENTE.indexOf(nome) >= 0, costas = VISTA_COSTAS.indexOf(nome) >= 0;
      if ((frente || costas) && gola) {
        for (x = 6; x <= 9; x++) poe(11, x, gola);     // a gola
        poe(14, 2, gola); poe(14, 13, gola);           // o punho das duas mangas
      }
      if (frente && time === 'palmeiras') { poe(12, 7, 'w'); poe(12, 8, 'w'); }   // o V da gola polo
      if (frente && escudo) poe(13, 10, escudo);                                  // o escudo
      if (frente && time === 'santos') poe(12, 10, 'z');                           // o do Santos é mais alto
      alvo[nome] = a;
    }
  };
}

/* ---------- os cosplayers da Liberdade ----------
   'Na Liberdade tem que aparecer uns cosplayers.' Cinco roupas, das
   fotos que vieram, pintadas pixel a pixel por cima do corpo de sempre,
   como a camisa de time:
   - a estudante de marinheira: blusa branca, gola azul-marinho com o
     lenço azul-claro na frente e o quadrado da gola nas costas, saia
     plissada azul-marinho, cabelo preto comprido de franja;
   - o da Akatsuki: capa preta até a canela, gola alta com o forro
     vermelho, nuvens vermelhas de contorno branco, rabo de cavalo e a
     bandana de metal na testa;
   - o Naruto: macacão laranja com os ombros pretos e o zíper branco,
     cabelo loiro espetado e a bandana azul com a placa de metal;
   - o Sasuke: quimono branco aberto em V, a corda roxa na cintura, o
     avental azul-marinho, os protetores pretos no braço e cabelo preto
     espetado;
   - a Sakura: vestido vermelho com a gola e os punhos brancos, o
     círculo branco nas costas, o short verde, cabelo rosa comprido e a
     faixa azul na cabeça. */
var VISTA_LADO = ['side', 'sentado'];
function roupaCosplay(tipo) {
  return function (alvo) {
    for (var d = 0; d < DIRS.length; d++) {
      var nome = DIRS[d];
      if (!alvo[nome]) continue;
      var a = alvo[nome].slice(0), x, y;
      var frente = VISTA_FRENTE.indexOf(nome) >= 0, costas = VISTA_COSTAS.indexOf(nome) >= 0;
      // troca o pixel (yy, xx) por ch só se ele for um dos de `de`
      var poe = function (yy, xx, ch, de) {
        if (a[yy] && (de || 'j').indexOf(a[yy][xx]) >= 0) a[yy] = a[yy].substr(0, xx) + ch + a[yy].substr(xx + 1);
      };
      var linha = function (yy, x0, x1, ch, de) { for (var xx = x0; xx <= x1; xx++) poe(yy, xx, ch, de); };
      if (tipo === 'marinheira') {
        linha(11, 0, 15, 'z');                                   // a gola nos ombros
        poe(12, 1, 'z'); poe(12, 2, 'z'); poe(12, 13, 'z'); poe(12, 14, 'z');
        poe(14, 1, 'z'); poe(14, 14, 'z');                       // os punhos
        if (frente) {
          // a gola desce em V até o lenço
          poe(12, 3, 'z'); poe(12, 4, 'z'); poe(12, 11, 'z'); poe(12, 12, 'z'); poe(13, 5, 'z'); poe(13, 10, 'z'); poe(14, 6, 'z'); poe(14, 9, 'z');
          poe(12, 7, 'e'); poe(12, 8, 'e'); poe(13, 7, 'e'); poe(13, 8, 'e'); poe(14, 8, 'e');
        }
        if (costas) { linha(12, 4, 11, 'z'); linha(13, 4, 11, 'e'); }
      }
      if (tipo === 'akatsuki') {
        /* 'Ainda tá meio fake': a capa de verdade tem a gola alta que
           tampa o queixo, cai inteira até a canela (sem perna aparecendo
           no meio) e as nuvens são grandes, vermelhas, de contorno branco. */
        var lado = VISTA_LADO.indexOf(nome) >= 0;
        // a capa até a canela, fechada entre as pernas
        for (y = 18; y <= 21; y++) for (x = (lado ? 4 : 2); x <= (lado ? 11 : 13); x++) poe(y, x, 'j', 'p.');
        poe(22, lado ? 5 : 4, 'j', 'p'); poe(22, lado ? 6 : 11, 'j', 'p');
        // a gola alta: pescoço e queixo somem dentro dela, com o forro vermelho na borda
        linha(10, 3, 12, 'j', 'k.');
        if (frente) { linha(9, 4, 11, 'j', 'k'); poe(9, 4, 'e', 'j'); poe(9, 11, 'e', 'j'); poe(10, 4, 'e', 'j'); poe(10, 11, 'e', 'j'); }
        var nuvem = function (x0, y0) {   // 4x3 de vermelho com o contorno branco
          linha(y0, x0 + 1, x0 + 2, 'w'); poe(y0 + 1, x0, 'w'); poe(y0 + 1, x0 + 1, 'e'); poe(y0 + 1, x0 + 2, 'e'); poe(y0 + 1, x0 + 3, 'w');
          poe(y0 + 2, x0, 'w'); linha(y0 + 2, x0 + 1, x0 + 3, 'e'); poe(y0 + 2, x0 + 4, 'w'); linha(y0 + 3, x0 + 1, x0 + 3, 'w');
        };
        if (frente) { nuvem(2, 12); nuvem(8, 17); }
        if (costas) { nuvem(5, 12); nuvem(2, 17); nuvem(9, 18); }
        if (lado) nuvem(5, 13);
        linha(frente ? 4 : 3, 3, 12, 'y', 'a');                  // a bandana de metal
        if (frente) poe(4, 7, 'o', 'y');                         // o risco na placa
      }
      if (tipo === 'naruto') {
        linha(11, 0, 15, 'z'); linha(12, 0, 15, 'z');            // os ombros pretos
        if (frente) { poe(11, 7, 'w', 'z'); poe(11, 8, 'w', 'z'); for (y = 13; y <= 16; y++) poe(y, 7, 'w'); }
        linha(4, 3, 12, 'y', 'a');                               // a bandana azul
        if (frente) { poe(4, 7, 'e', 'y'); poe(4, 8, 'e', 'y'); }   // e a placa de metal
      }
      if (tipo === 'sasuke') {
        if (frente) { linha(11, 5, 10, 'k'); linha(12, 6, 9, 'k'); linha(13, 7, 8, 'k'); }   // o quimono aberto
        linha(16, 0, 15, 'e');                                   // a corda roxa
        if (frente) poe(17, 6, 'e');                             // o nó
        linha(17, 0, 15, 'p');                                   // o avental começa
        for (y = 14; y <= 16; y++) { poe(y, 1, 'z', 'kje'); poe(y, 14, 'z', 'kje'); }   // os protetores do braço
      }
      if (tipo === 'sakura') {
        linha(2, 2, 13, 'y', 'a');                               // a faixa azul na cabeça
        if (frente) linha(11, 6, 9, 'w');                        // a gola
        poe(14, 1, 'w'); poe(14, 14, 'w');                       // os punhos
        if (costas) { poe(13, 7, 'w'); poe(13, 8, 'w'); poe(14, 6, 'w'); poe(14, 9, 'w'); poe(15, 7, 'w'); poe(15, 8, 'w'); }
        linha(18, 0, 15, 'j', 'p');                              // o vestido até a coxa
        for (y = 20; y <= 22; y++) linha(y, 0, 15, 'k', 'p');     // as pernas, do short pra baixo
      }
      alvo[nome] = a;
    }
  };
}
var CACHE_CORPOS = {};
function quadrosDoCorpo(key) {
  key = key || 'padrao';
  if (CACHE_CORPOS[key]) return CACHE_CORPOS[key];
  var r = resolveCorpo(key);
  var out = {};
  for (var d = 0; d < DIRS.length; d++) {
    var nome = DIRS[d], parado = r[nome];
    if (nome === 'segurando' || nome === 'segurandoCostas') {
      /* os três quadros do de frente (ou do de costas) com o braço pra
         cima: dá pra ir andando com a mão correndo na barra, olhando pra
         onde vai */
      var base = nome === 'segurando' ? out.down : out.up;
      out[nome] = r.poseUnica ? base.slice(0) : base.map(bracoPraCima);
      continue;
    }
    var passos = (nome === 'side') ? r.pernas.lado : r.pernas.frente;
    out[nome] = [parado, null, null];
    for (var q = 0; q < 2; q++) {
      // sentado não anda: os três quadros da fileira são o mesmo, e a
      // vida vem do balanço do trem, que é posição e não desenho
      if (r.poseUnica || nome.indexOf('sentado') === 0) { out[nome][q + 1] = parado; continue; }
      var a = parado.slice(0);
      for (var i = 0; i < passos[q].length; i++) a[r.pernas.inicio + i] = passos[q][i];
      out[nome][q + 1] = a;
    }
  }
  CACHE_CORPOS[key] = out;
  return out;
}

function pele(o, k, a, j, p, s, w) { return { o: o, k: k, a: a, j: j, p: p, s: s, w: w }; }
var PELES = {
  estudante: pele('#0a0a12', '#c99a70', '#2a2a30', '#2f7d5e', '#25304d', '#14141c', '#1a1a24'),
  clt: pele('#0a0a12', '#e0b088', '#3a2a22', '#d8d8e8', '#33334a', '#14141c', '#3a6fb0'),
  senhor: pele('#0a0a12', '#f0c8a0', '#d8d8e8', '#8a5a34', '#5c3c22', '#14141c', '#f0eeff'),
  ambulante: pele('#0a0a12', '#8a5a3c', '#e8a33c', '#e8a33c', '#2e2e40', '#14141c', '#f0eeff'),
  idoso: pele('#0a0a12', '#e0b088', '#d8d8e8', '#6b6152', '#4a4438', '#14141c', '#f0eeff'),
  gestante: pele('#0a0a12', '#c99a70', '#3a2a22', '#c85a9a', '#2a2a38', '#14141c', '#e28cc0'),
  /* Os três uniformes do metrô, e cada um é uma patente. Quem joga
     aprende a ler a roupa antes de ler o número: preto todo é o
     grandão, azul com bege é o do meio, azul com azul é o menorzinho. */
  guardinha: pele('#0a0a12', '#b07d52', '#1a2540', '#20325c', '#20325c', '#14141c', '#9fb6dd'),
  guardaMedio: pele('#0a0a12', '#e0b088', '#2a2a30', '#20325c', '#b09a68', '#2a2a30', '#d8e24a'),
  guardaForte: pele('#0a0a12', '#8a5a3c', '#0a0a12', '#15151d', '#15151d', '#0a0a12', '#4a4a5c'),
  /* A outra metade do elenco. Mesma pessoa, mesmo ofício, mesmos
     números — o que muda é cabelo, silhueta e um tom de roupa, que é o
     que basta pra quem joga se reconhecer na tela. */
  /* As femininas trocavam só pele e cabelo, e a roupa era a MESMA cor da
     masculina. Num boneco de 32x48 isso é invisível: quem tocava em
     MULHER via o mesmo boneco e concluía, com razão, que o botão não
     funcionava. Agora a roupa muda junto — sem sair da família de cor do
     personagem, que é como se reconhece um estudante de um turista. */
  estudanteF: pele('#0a0a12', '#8a5a3c', '#3a2418', '#3fa07d', '#3a3f6b', '#14141c', '#e8a33c'),
  cltF: pele('#0a0a12', '#c99a70', '#2a1c14', '#e8dcc0', '#3d2f4a', '#14141c', '#a05ac8'),
  senhoraJog: pele('#0a0a12', '#f0c8a0', '#d8d8e8', '#8a5a9a', '#4a4438', '#14141c', '#f0eeff'),
  ambulanteF: pele('#0a0a12', '#6b4228', '#1a1a22', '#e8623c', '#3a2e34', '#14141c', '#f0eeff'),
  turistaF: pele('#0a0a12', '#e0b088', '#c07a2a', '#7fd0e8', '#d8d8e8', '#14141c', '#e8362c'),
  // os dois que se compram com ponto de minigame
  gestanteJog: pele('#0a0a12', '#e0b088', '#4a2f1e', '#d4548e', '#33334a', '#14141c', '#ffd0e6'),
  turista: pele('#0a0a12', '#f0c8a0', '#e8c96a', '#f2f0ff', '#4a7fc0', '#14141c', '#e8362c'),
  rimador: pele('#0a0a12', '#6b4228', '#0a0a12', '#e8362c', '#1c1c28', '#14141c', '#f0eeff'),
  pedinte: pele('#0a0a12', '#b07d52', '#4a3a2a', '#6b6152', '#4a4438', '#2a2a2a', '#8a8272'),
  ambulanteNpc: pele('#0a0a12', '#8a5a3c', '#e8a33c', '#f2c14e', '#3a3a4d', '#14141c', '#ffffff'),
  pax0: pele('#0a0a12', '#f0c8a0', '#5a3a2a', '#3a6fb0', '#2a2a38', '#14141c', '#f0eeff'),
  pax1: pele('#0a0a12', '#8a5a3c', '#0a0a12', '#c85a9a', '#2a2a38', '#14141c', '#f0eeff'),
  pax2: pele('#0a0a12', '#e0b088', '#c07a2a', '#00b45e', '#33334a', '#14141c', '#f0eeff'),
  pax3: pele('#0a0a12', '#6b4228', '#2a2a30', '#7c3fff', '#22283a', '#14141c', '#f0eeff'),
  pax4: pele('#0a0a12', '#c99a70', '#6a4a2a', '#8a5a34', '#2e2e40', '#14141c', '#f0eeff'),
  pax5: pele('#0a0a12', '#b07d52', '#3a2a22', '#565b6e', '#22283a', '#14141c', '#f0eeff'),
  /* a cidade não é toda do mesmo tom: seis peles, cabelos e roupas
     que se cruzam com os tipos de corpo pra formar a multidão */
  pax6: pele('#0a0a12', '#5a3620', '#1a1a22', '#e8a33c', '#2a2a38', '#14141c', '#6a4a1a'),
  pax7: pele('#0a0a12', '#f0c8a0', '#8a5a2a', '#c0392b', '#33334a', '#14141c', '#5a2a2a'),
  pax8: pele('#0a0a12', '#8a5a3c', '#4a2a1a', '#2f7d5e', '#25304d', '#14141c', '#1a3a2c'),
  pax9: pele('#0a0a12', '#c99a70', '#d8d8e8', '#4a5a7a', '#2e2e40', '#14141c', '#8a5a34'),
  pax10: pele('#0a0a12', '#e0b088', '#2a2a30', '#a05ac8', '#22283a', '#14141c', '#e8e4ff'),
  pax11: pele('#0a0a12', '#b07d52', '#7a4a2a', '#d8d8e8', '#3a3a4d', '#14141c', '#3a6fb0'),
  /* senhoras, mães e pais de criança de colo */
  senhora: pele('#0a0a12', '#f0c8a0', '#d8d8e8', '#8a5a9a', '#4a4438', '#14141c', '#f0eeff'),
  senhorB: pele('#0a0a12', '#8a5a3c', '#c8c8d8', '#4a5a7a', '#3a3a4d', '#14141c', '#f0eeff'),
  colo0: pele('#0a0a12', '#c99a70', '#3a2a22', '#c85a9a', '#2a2a38', '#14141c', '#ffe08a'),
  colo1: pele('#0a0a12', '#8a5a3c', '#1a1a22', '#3a6fb0', '#25304d', '#14141c', '#e8e4f4'),
  colo2: pele('#0a0a12', '#f0c8a0', '#8a5a2a', '#2f7d5e', '#2e2e40', '#14141c', '#8bd0ff'),
  pedinte2: pele('#0a0a12', '#c99a70', '#5a4a3a', '#4a4438', '#3a3a30', '#2a2a2a', '#8a8272'),
  /* os desafiantes: polo bege e jeans; camisa branca e calça social;
     camisa verde de time e boné */
  tiozao: pele('#0a0a12', '#e0b088', '#c8c8d8', '#e3d2a0', '#4a5a7a', '#3a2a22', '#f0eeff'),
  pregador: pele('#0a0a12', '#8a5a3c', '#1a1a22', '#f0eeff', '#14141c', '#14141c', '#14141c'),
  torcedor: pele('#0a0a12', '#c99a70', '#2a2a30', '#0a7a42', '#e8e8f0', '#14141c', '#f0eeff'),
  // camisa preta com detalhe branco, bermuda branca: o do Corinthians
  corintiano: pele('#0a0a12', '#8a5a3c', '#1a1a22', '#1c1c22', '#e8e8f0', '#14141c', '#f0eeff')
};
PELES.corintiano.e = '#d8302a';     // o vermelho do escudo
// o cadeirante e a cadeirante: a cadeira é pneu preto, raio claro e quadro de metal
PELES.cadeirante = pele('#0a0a12', '#c99a70', '#2a2a30', '#3a6fb0', '#33334a', '#14141c', '#c8cad4');
PELES.cadeirante.z = '#1c1c22'; PELES.cadeirante.y = '#8a8c98';
PELES.cadeiranteF = pele('#0a0a12', '#8a5a3c', '#3a2418', '#c85a9a', '#2e2e40', '#14141c', '#c8cad4');
PELES.cadeiranteF.z = '#1c1c22'; PELES.cadeiranteF.y = '#8a8c98';
// quem atende no guichê: uniforme azul-marinho do metrô e o crachá amarelo
PELES.atendente = pele('#0a0a12', '#c99a70', '#2a2a30', '#1c2c54', '#1c2c54', '#14141c', '#f2c14e');
PELES.atendenteF = pele('#0a0a12', '#8a5a3c', '#1a1a22', '#1c2c54', '#1c2c54', '#14141c', '#f2c14e');
PELES.torcedor.j = '#12783c';       // o verde da camisa das fotos
PELES.torcedor.k = '#f0c8a0';       // o palmeirense é branco
PELES.saopaulino = pele('#0a0a12', '#f0c8a0', '#3a2a22', '#f0eeff', '#1c1c22', '#14141c', '#f0eeff');
PELES.saopaulino.e = '#d8302a'; PELES.saopaulino.z = '#1c1c22';
PELES.santista = pele('#0a0a12', '#8a5a3c', '#4a2c18', '#f0eeff', '#f0eeff', '#14141c', '#f0eeff');
PELES.santista.z = '#1c1c22'; PELES.santista.e = '#e8b83c';   // a base escura e a ponta dourada da crista
PELES.santista.y = '#5a3a24';                                 // o cabelo curtinho das laterais raspadas
// os cosplayers: o, pele, cabelo, roupa, calça/saia, sapato, branco; e/z/y são os detalhes de cada um
PELES.cosMarinheira = pele('#0a0a12', '#f0c8a8', '#16161e', '#f4f2f8', '#1c2448', '#2a1c18', '#f4f2f8');
PELES.cosMarinheira.z = '#1c2448'; PELES.cosMarinheira.e = '#8fd8f0';
PELES.cosAkatsuki = pele('#0a0a12', '#e8c8a8', '#101016', '#16161c', '#16161c', '#2a2a30', '#f0eeff');
PELES.cosAkatsuki.e = '#d0282c'; PELES.cosAkatsuki.y = '#9aa0b0';
PELES.cosNaruto = pele('#0a0a12', '#f0c49c', '#f6d04a', '#f08a24', '#f08a24', '#1c2a50', '#f0eeff');
PELES.cosNaruto.z = '#16161e'; PELES.cosNaruto.y = '#2c4a8a'; PELES.cosNaruto.e = '#c8ccd8';
PELES.cosSasuke = pele('#0a0a12', '#f0d0b0', '#14141c', '#f0f0f6', '#2a3470', '#1c1c24', '#f0eeff');
PELES.cosSasuke.e = '#7a4ab0'; PELES.cosSasuke.z = '#16161e';
PELES.cosSakura = pele('#0a0a12', '#f4d0b8', '#f0a2bc', '#c8283c', '#2a5a3a', '#3a2a28', '#f0eeff');
PELES.cosSakura.y = '#3a6fc0';
// o torcedor jogável: pele, cabelo e jeans; a camisa vem do time escolhido
PELES.torcedorJog = pele('#0a0a12', '#6b4228', '#1a1a22', '#1c1c22', '#3a5a8a', '#14141c', '#f0eeff');
PELES.torcedoraJog = pele('#0a0a12', '#c99a70', '#3a2418', '#1c1c22', '#3a5a8a', '#14141c', '#f0eeff');

/* ---------- os quatro times ----------
   O torcedor escolhe o time além do gênero. Cada time tem a cor da
   camisa, o apelido que vai no botão e o desafiante do vagão que é do
   mesmo time (esse não te desafia: te dá força). */
var TIMES = {
  // pele: a do torcedor (homem) de cada time, como o desafiante dele
  corinthians: { nome: 'TIMÃO', desafiante: 'corintiano', j: '#1c1c22', e: '#d8302a', cor: 0x1c1c22, cor2: 0xf0eeff },
  palmeiras: { nome: 'VERDÃO', desafiante: 'palmeirense', j: '#12783c', k: '#f0c8a0', cor: 0x12783c, cor2: 0xf0eeff },
  saopaulo: { nome: 'TRICOLOR', desafiante: 'saopaulino', j: '#f0eeff', e: '#d8302a', z: '#1c1c22', k: '#f0c8a0', cor: 0xf0eeff, cor2: 0xd8302a },
  santos: { nome: 'PEIXE', desafiante: 'santista', j: '#f0eeff', z: '#1c1c22', a: '#4a2c18', e: '#e8b83c', y: '#5a3a24', k: '#b07d52', cor: 0xf0eeff, cor2: 0x1c1c22 }
};
var ORDEM_TIMES = ['corinthians', 'palmeiras', 'saopaulo', 'santos'];
function paletaDoTime(base, t, g) {
  var p = {}, k, T = TIMES[t];
  for (k in base) p[k] = base[k];
  p.j = T.j; if (T.e) p.e = T.e; if (T.z) p.z = T.z;
  if (T.a && g !== 'f') p.a = T.a;   // a crista do santista; a santista, cabelo escuro como a Marta
  if (T.k && g !== 'f') p.k = T.k;   // a pele do torcedor de cada time
  if (T.y) p.y = T.y;
  return p;
}
function corpoDoTorcedor(g, t) {
  // a santista de rabo de cavalo, como a Marta; as outras de cabelo solto
  if (g === 'f') return t === 'santos' ? 'rabo_santos' : 'longo_' + t;
  return { corinthians: 'touca_corinthians', saopaulo: 'careca_saopaulo', santos: 'moicano_santos' }[t] || t;
}
function leTime() {
  try { var t = localStorage.getItem('metrosp_time'); if (TIMES[t]) return t; } catch (e) { }
  return 'corinthians';
}
function gravaTime(t) { try { localStorage.setItem('metrosp_time', t); } catch (e) { } }

/* desenha um quadro 32x48 a partir da silhueta 16x24, com sombreamento */
/* quantos pixels faltam até a beirada da forma, andando numa direção.
   Só interessa 0, 1, 2, 3 ou "longe": passando disso é miolo de chapa,
   e miolo de chapa é cor cheia de qualquer jeito. Parar cedo também
   segura o custo — são 270 quadros pra desenhar na carga.

   O pulo importa. Olho, boca, alça de mochila e botão são detalhes de
   um pixel de arte no meio de uma superfície — marca, não beirada. Sem
   pular por cima deles o rosto vira uma mancha: cada olho ganharia
   faixa escura de um lado e clara do outro, como se fosse quina. O
   contorno de fora não passa nesse teste, porque depois dele vem vazio
   e não o mesmo material. */
var ALCANCE_MAX = 4;
function alcance(m, x, y, dx, dy, mt) {
  for (var i = 1; i <= ALCANCE_MAX; i++) {
    if (m(x + dx * i, y + dy * i) === mt) continue;
    if (m(x + dx * (i + 1), y + dy * (i + 1)) === mt) { i += 1; continue; }
    if (m(x + dx * (i + 2), y + dy * (i + 2)) === mt) { i += 2; continue; }
    return i - 1;
  }
  return ALCANCE_MAX;
}

function desenhaQuadro(c2d, art, pal, ox, oy) {
  var L = 16, A = 24;
  // mapa de material ampliado
  var mat = [];
  for (var y = 0; y < A * 2; y++) {
    mat[y] = [];
    for (var x = 0; x < L * 2; x++) {
      var ch = art[y >> 1][x >> 1];
      mat[y][x] = (ch === '.') ? null : ch;
    }
  }
  function m(x, y) {
    if (x < 0 || y < 0 || x >= L * 2 || y >= A * 2) return null;
    return mat[y][x];
  }
  for (var yy = 0; yy < A * 2; yy++) {
    for (var xx = 0; xx < L * 2; xx++) {
      var mt = mat[yy][xx];
      if (!mt) continue;
      var base = pal[mt];
      if (!base) continue;
      var cor;
      if (mt === 'o') {
        cor = base;                                   // contorno não recebe luz
      } else {
        /* a luz não pinta só a borda: ela desbota com a distância dela.
           Antes era claro / cheio / escuro, e a borda tinha 1 pixel — o
           peito virava uma chapa lisa com um risco em cima e outro
           embaixo, recortada em papel. Medindo quantos pixels faltam
           pra beirada de cima-esquerda (luz) e pra de baixo-direita
           (sombra), a mesma cor rende cinco degraus e o tronco lê como
           cilindro. Como a arte é 16x24 dobrada, cada degrau tem 2
           pixels de tela, que é um pixel de desenho. */
        var dL = Math.min(alcance(m, xx, yy, 0, -1, mt), alcance(m, xx, yy, -1, 0, mt));
        var dS = Math.min(alcance(m, xx, yy, 0, 1, mt), alcance(m, xx, yy, 1, 0, mt));
        if (dL < dS) cor = clarear(base, dL < 2 ? 0.3 : 0.13);
        else if (dS < dL) cor = escurecer(base, dS < 2 ? 0.32 : 0.14);
        else cor = base;
        // faixa de sombra na metade de baixo do corpo, dá volume
        if (dL > 1 && yy > A) cor = escurecer(cor, 0.08);
      }
      c2d.fillStyle = cor;
      c2d.fillRect(ox + xx, oy + yy, 1, 1);
    }
  }
}

function geraSheet(scene, key, pal, corpo) {
  if (scene.textures.exists(key)) return;
  var tex = scene.textures.createCanvas(key, 96, 48 * DIRS.length);
  var c2d = tex.getContext();
  var q = quadrosDoCorpo(corpo);
  for (var l = 0; l < DIRS.length; l++) {
    var linha = q[DIRS[l]];
    for (var c = 0; c < 3; c++) desenhaQuadro(c2d, linha[c], pal, c * 32, l * 48);
  }
  tex.refresh();
  for (var i = 0; i < DIRS.length * 3; i++) {
    tex.add(i, 0, (i % 3) * 32, Math.floor(i / 3) * 48, 32, 48);
  }
}

/* =========================================================
   GENTE OCUPA ESPAÇO

   Cada pessoa é um corpo elíptico rente ao chão — só os pés, não
   o sprite inteiro, que é alto. O jogador não atravessa ninguém.

   E não trava também: ele empurra, devagar. Travar seria pior que
   atravessar, porque bastaria alguém parar bem na porta do trem
   pra corrida acabar ali. Empurrar resolve os dois — a multidão
   pesa, mas sempre cede se você insistir. É como se anda em vagão
   cheio de verdade.
   ========================================================= */
var CORPO_RX = 9, CORPO_RY = 6;      // meios-eixos do corpo, em pixels
var ACHATA = CORPO_RX / CORPO_RY;    // leva a elipse pra um círculo e volta

/* separa dois corpos sobrepostos. peso 1 = anda tudo, 0 = fica no lugar */
function separaCorpos(a, b, pesoA, pesoB) {
  var dx = a.x - b.x;
  var dy = (a.y - b.y) * ACHATA;
  var d2 = dx * dx + dy * dy;
  var r = CORPO_RX * 2;
  if (d2 > r * r) return false;
  var d = Math.sqrt(d2);
  if (d < 0.5) {                     // exatamente em cima: desempata pro lado
    a.x += pesoA > 0 ? 1 : 0;
    b.x -= pesoB > 0 ? 1 : 0;
    return true;
  }
  var sobra = (r - d) / d;
  a.x += dx * sobra * pesoA;
  a.y += dy * sobra * pesoA / ACHATA;
  b.x -= dx * sobra * pesoB;
  b.y -= dy * sobra * pesoB / ACHATA;
  return true;
}

/* ---------- o quanto a multidão te leva ----------
   Era 0,4 pra todo mundo: um esbarrão empurrava o idoso e o ambulante
   exatamente igual. Enquanto a plataforma era uma foto isso não
   aparecia; agora que desce gente do trem e você atravessa contra a
   corrente, o corpo passou a ser o que mais se sente — e corpo é
   justamente o que devia separar um personagem do outro.

   O número sai do `empurraoMult`, que já é "o quanto você empurra
   gente" e até agora só valia pra enfiar na porta do vagão. Duas contas
   da mesma coisa saem de sincronia na primeira mudança, então é uma só.

   Ao quadrado porque a faixa crua (0,65 a 1,15) dá uma diferença que
   não se sente: elevada, o ambulante absorve 0,59 do esbarrão e o idoso
   0,22 — quase três vezes. É o que faz trocar de personagem trocar o
   jogo, e não a roupa.

   Quem tem `abremCaminho` fica fora da conta: o verbo dela é a multidão
   sair da frente, e ser jogada de um lado pro outro seria o contrário
   do que ela é. */
function pesoDaMultidao() {
  var c = GameState.char;
  if (!c) return 0.4;
  if (c.abremCaminho) return 0.62;
  var f = c.empurraoMult / 0.95;      // 0,95 é o meio do elenco
  return Math.max(0.18, Math.min(0.62, 0.4 * f * f));
}

/* Resolve o jogador contra a gente em volta, e a gente entre si.
   `gente` são Atores; quem tem .fixo (sentado, encostado, o guardinha)
   não sai do lugar. `limita` é a regra de parede de cada cena, que é
   diferente em cada uma — sem ela um empurrão poderia jogar alguém
   pra dentro do trilho. */
/* Dois corpos só têm o que resolver se estiverem perto: o corpo tem 6
   pixels de meio-eixo em y, então acima de 16 de distância não existe
   sobreposição possível. O teste é uma subtração, e ele é o que segura
   o custo — o trem de oito carros tem mais de 200 pessoas, e o segundo
   laço aqui é de todos contra todos. Sem esse corte eram 13 mil pares
   de elipse por quadro pra resolver, na prática, nenhum. */
var PERTO_Y = 16;

function resolveCorpos(pl, gente, limitaPl, limitaNpc) {
  var i, j, o, py = pl.sp.y;
  var meuPeso = pesoDaMultidao();
  for (i = 0; i < gente.length; i++) {
    o = gente[i];
    if (!o || !o.sp || !o.sp.active) continue;
    if (Math.abs(o.sp.y - py) > PERTO_Y) continue;
    var peso = o.fixo ? 0 : meuPeso;
    if (separaCorpos(pl.sp, o.sp, 1 - peso, peso)) {
      if (limitaPl) limitaPl(pl.sp);
      if (!o.fixo && limitaNpc) limitaNpc(o.sp);
    }
  }
  // a multidão também não se atravessa, mas com muito menos empenho
  for (i = 0; i < gente.length; i++) {
    if (!gente[i] || !gente[i].sp || gente[i].fixo) continue;
    var yi = gente[i].sp.y;
    for (j = i + 1; j < gente.length; j++) {
      if (!gente[j] || !gente[j].sp) continue;
      if (Math.abs(gente[j].sp.y - yi) > PERTO_Y) continue;
      var pj = gente[j].fixo ? 0 : 0.5;
      if (separaCorpos(gente[i].sp, gente[j].sp, 1 - pj, pj) && limitaNpc) {
        limitaNpc(gente[i].sp);
        if (!gente[j].fixo) limitaNpc(gente[j].sp);
      }
    }
  }
}

/* ---------- ator ---------- */
function Ator(scene, x, y, key) {
  this.sp = scene.add.sprite(x, y, key, 0);
  this.sp.setOrigin(0.5, 1);
  this.key = key;
  this.dir = 'down';
  this.t = 0;
  this.andando = false;
}
/* em que fileira da folha cada direção mora, e quem sai espelhado.
   'left' e 'right' continuam existindo porque meia dúzia de lugares
   posicionam gente parada escrevendo o nome do lado direto. */
var FILEIRA_DIR = {
  down: 0, up: 3, left: 6, right: 6,
  diagDownL: 9, diagDownR: 9, diagUpL: 12, diagUpR: 12,
  sentadoR: 15, sentadoL: 15,
  // quem senta no banco virado pro outro banco: olhando pro fundo do
  // vagão, ou olhando pra quem está do outro lado do joelho
  sentadoFrente: 18, sentadoCostas: 21,
  // de frente, com a mão na barra: à direita dele, ou à esquerda (espelhado)
  segurandoR: 24, segurandoL: 24,
  segurandoCostasR: 27, segurandoCostasL: 27
};
var ESPELHA_DIR = { left: 1, diagDownL: 1, diagUpL: 1, sentadoL: 1, segurandoL: 1, segurandoCostasL: 1 };
var DIAGONAL_MIN = 0.42;   // o eixo fraco precisa disso do forte pra virar diagonal

Ator.prototype.setDir = function (dx, dy) {
  var ax = Math.abs(dx), ay = Math.abs(dy);
  if (!ax && !ay) return;
  if (ax >= ay * DIAGONAL_MIN && ay >= ax * DIAGONAL_MIN) {
    this.dir = (dy < 0 ? 'diagUp' : 'diagDown') + (dx < 0 ? 'L' : 'R');
  } else if (ax > ay) {
    this.dir = dx < 0 ? 'left' : 'right';
  } else {
    this.dir = dy < 0 ? 'up' : 'down';
  }
};
Ator.prototype.anima = function (dt, andando) {
  this.andando = andando;
  if (andando) this.t += dt; else this.t = 0;
  var base = FILEIRA_DIR[this.dir];
  if (base === undefined) base = 0;
  var passo = andando ? (1 + (Math.floor(this.t / 130) % 2)) : 0;
  this.sp.setFrame(base + passo);
  this.sp.setFlipX(!!ESPELHA_DIR[this.dir]);
};
Ator.prototype.pos = function (x, y) { this.sp.x = x; this.sp.y = y; };
Ator.prototype.destroy = function () { this.sp.destroy(); };

/* ---------- áudio ---------- */
/* Painel lateral do desktop. Quando existe, a tarja da hora e a faixa de
   dica saem de cima do jogo e vão pra ele — sobra tela e o canvas fica
   com o jogo e mais nada. No celular ele é nulo e tudo desenha no canvas
   como sempre. Quem preenche é o src/painel.js. */
var PAINEL = null;

var SOM_LIGADO = true;
try {
  SOM_LIGADO = (localStorage.getItem('metrosp_som') !== '0');
} catch (e) { }
function ligaSom(v) {
  SOM_LIGADO = !!v;
  if (!SOM_LIGADO && typeof paraPregao === 'function') paraPregao();
  try { localStorage.setItem('metrosp_som', SOM_LIGADO ? '1' : '0'); } catch (e) { }
  if (SOM_LIGADO) { audioOn(); return; }
  /* SOM: DESLIGADO desligava só o `sfx`: a música roda num relógio
     próprio e só olhava pra `MUSICA_LIGADA`, então o baixo do metrô
     continuava tocando com o som "desligado". O botão do painel é um
     só — ele tem que calar tudo. */
  fechaAudio();
}

/* ---------- música ----------
   Era um baixo de 49Hz alternando duas notas a cada 640ms: "chata e
   grave", foi o veredito. Agora é trilha de jogo de verdade, no molde
   das músicas de rota de RPG portátil — alegre, andando pra frente,
   com a melodia no alto e nada abaixo de 82Hz.

   Quatro vozes, como um chip de console: melodia (quadrada), baixo
   (triângulo, saltando oitava), arpejo do acorde (quadrada baixinha, em
   semicolcheias) e bateria (bumbo de seno que despenca, caixa e chimbal
   de ruído). 128 BPM, dó maior, 16 compassos: A (C Am F G / C Am Dm G)
   e B (F G Em Am / F G C C), e volta.

   As notas são AGENDADAS no relógio do áudio, 150ms à frente, e não
   tocadas por setInterval. setInterval atrasa quando o quadro pesa, e
   música com a batida escorregando soa quebrada; o relógio do áudio não
   escorrega. O intervalo só acorda o agendador.

   Os volumes são medidos, renderizando a volta inteira offline: na
   primeira mixagem o pico da música era 0,155 e o do sfx('ok') 0,047 —
   a trilha tapava o jogo. Agora ela fica por baixo dos efeitos. */
var MUSICA_LIGADA = true;
try {
  MUSICA_LIGADA = (localStorage.getItem('metrosp_musica') !== '0');
} catch (e) { }

var MUS_BPM = 128;
var MUS_COLCHEIA = 60 / MUS_BPM / 2;          // o passo da melodia e do baixo
// melodia em colcheias, 8 por compasso: nota MIDI, 0 pausa, -1 segura a anterior
var MUS_MELODIA = [
  76, 0, 79, 0, 84, -1, 79, 0,     81, -1, 79, 76, -1, -1, 74, 0,
  77, 0, 81, 0, 84, -1, 81, 79,    79, -1, -1, 74, -1, -1, 0, 0,
  76, 0, 79, 0, 84, -1, 86, 84,    81, -1, 79, 76, -1, 74, 76, -1,
  77, -1, 76, 74, -1, 72, 74, -1,  71, -1, 74, -1, 79, -1, 0, 0,
  72, 74, 77, -1, 81, -1, 77, 74,  74, 76, 79, -1, 83, -1, 79, 76,
  76, -1, 79, -1, 83, -1, 79, 76,  81, -1, -1, -1, 79, 76, 74, 72,
  77, -1, 81, -1, 84, -1, 81, 77,  79, -1, 83, -1, 86, -1, 83, 79,
  84, -1, 79, -1, 76, -1, 72, -1,  72, -1, -1, -1, 0, 0, 0, 0
];
// um acorde por compasso: a fundamental (pro baixo) e a tríade (pro arpejo)
var MUS_ACORDES = [
  [48, [60, 64, 67]], [45, [57, 60, 64]], [41, [57, 60, 65]], [43, [55, 59, 62]],
  [48, [60, 64, 67]], [45, [57, 60, 64]], [50, [57, 62, 65]], [43, [55, 59, 62]],
  [41, [57, 60, 65]], [43, [55, 59, 62]], [40, [55, 59, 64]], [45, [57, 60, 64]],
  [41, [57, 60, 65]], [43, [55, 59, 62]], [48, [60, 64, 67]], [48, [60, 64, 67]]
];
// o baixo salta: fundamental, oitava, fundamental, oitava... e a quinta no fim
var MUS_BAIXO = [0, 12, 0, 12, 0, 12, 7, 12];

var _musicaT = null, _musPasso = 0, _musProx = 0;

function hzDe(n) { return 440 * Math.pow(2, (n - 69) / 12); }

/* uma nota com hora marcada: ataque curtinho, e cai até o fim */
function notaEm(t, n, dur, tipo, vol) {
  var o = AC.createOscillator(), g = AC.createGain();
  o.type = tipo; o.frequency.value = hzDe(n);
  g.gain.value = 0.0001;              // nasce mudo (ver ruido)
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.008);
  g.gain.setValueAtTime(vol * 0.8, t + dur * 0.6);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(AC.destination);
  o.start(t); o.stop(t + dur + 0.02);
}

function bumboEm(t) {
  var o = AC.createOscillator(), g = AC.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(150, t);
  o.frequency.exponentialRampToValueAtTime(48, t + 0.11);
  g.gain.value = 0.0001;              // nasce mudo (ver ruido)
  g.gain.setValueAtTime(0.035, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
  o.connect(g); g.connect(AC.destination);
  o.start(t); o.stop(t + 0.16);
}

/* Um passo é uma colcheia. Os dois arpejos de cada colcheia (as
   semicolcheias) saem daqui também, meio passo defasados. */
function tocaPassoMusica(i, t) {
  var c = MUS_COLCHEIA;
  var passoNoCompasso = i % 8, compasso = Math.floor(i / 8) % MUS_ACORDES.length;
  var acorde = MUS_ACORDES[compasso];

  // melodia: conta quantas colcheias ela segura pra saber a duração
  var m = MUS_MELODIA[i % MUS_MELODIA.length];
  if (m > 0) {
    var seg = 1;
    while (MUS_MELODIA[(i + seg) % MUS_MELODIA.length] === -1) seg++;
    notaEm(t, m, c * seg * 0.95, 'square', 0.011);
  }

  // baixo, em triângulo, uma oitava acima do grave de antes
  notaEm(t, acorde[0] + MUS_BAIXO[passoNoCompasso], c * 0.8, 'triangle', 0.030);

  // arpejo: duas notas do acorde por colcheia, sobe e desce
  var tri = acorde[1];
  var k = (i * 2) % 4;
  var ordem = [0, 1, 2, 1];
  notaEm(t, tri[ordem[k]] + 12, c * 0.45, 'square', 0.0035);
  notaEm(t + c / 2, tri[ordem[k + 1]] + 12, c * 0.45, 'square', 0.0035);

  // bateria: bumbo no 1 e no 3, caixa no 2 e no 4, chimbal no contratempo
  var atraso = Math.max(0, t - AC.currentTime);
  if (passoNoCompasso === 0 || passoNoCompasso === 4) bumboEm(t);
  if (passoNoCompasso === 2 || passoNoCompasso === 6) ruido(0.10, 0.012, 1900, 1400, 0.8, 'bandpass', atraso);
  if (passoNoCompasso % 2 === 1) ruido(0.035, 0.006, 9000, 9000, 0.7, 'highpass', atraso);
}

/* ---------- a trilha da luta ----------
   'A música tem que ser mais de luta.' A da luta era a mesma do menu,
   alegre e em dó maior. Esta é outra: 150 BPM, lá menor, oito compassos
   (Am Am F G / Am Am F E) — o mi maior no fim puxa de volta pro começo,
   que é o que faz a luta parecer que não acaba. O baixo bate colcheia
   por colcheia com a oitava em cima (quadrada baixinha junto, pra ter
   grão), o riff sobe em cima dele, e a bateria tem bumbo sincopado
   (1, o "e" do 2 e o 3), caixa no 2 e no 4 e chimbal em toda colcheia. */
var LUTA_COLCHEIA = 60 / 150 / 2;
var LUTA_MELODIA = [
  69, 0, 72, 69, 76, -1, 74, 72,   71, 72, 74, -1, 72, 71, 69, -1,
  65, 0, 69, 65, 72, -1, 71, 69,   67, 69, 71, -1, 74, -1, 71, 67,
  76, -1, 76, 74, 76, -1, 79, 76,  74, -1, 72, 74, 76, -1, 72, 69,
  77, -1, 76, 74, 72, -1, 74, 76,  68, 71, 76, -1, 80, -1, 76, 71
];
var LUTA_ACORDES = [
  [45, [57, 60, 64]], [45, [57, 60, 64]], [41, [57, 60, 65]], [43, [55, 59, 62]],
  [45, [57, 60, 64]], [45, [57, 60, 64]], [41, [57, 60, 65]], [40, [56, 59, 64]]
];
var LUTA_BAIXO = [0, 12, 0, 12, 0, 12, 0, 12];
function tocaPassoLuta(i, t) {
  var c = LUTA_COLCHEIA, n = LUTA_MELODIA.length;
  var pc = i % 8, acorde = LUTA_ACORDES[Math.floor(i / 8) % LUTA_ACORDES.length];
  var m = LUTA_MELODIA[i % n];
  if (m > 0) {
    var seg = 1;
    while (LUTA_MELODIA[(i + seg) % n] === -1) seg++;
    notaEm(t, m, c * seg * 0.92, 'square', 0.012);
  }
  var b = acorde[0] + LUTA_BAIXO[pc];
  notaEm(t, b, c * 0.7, 'triangle', 0.032);
  notaEm(t, b + 12, c * 0.5, 'square', 0.004);
  var tri = acorde[1], ordem = [0, 1, 2, 1], k = (i * 2) % 4;
  notaEm(t, tri[ordem[k]] + 12, c * 0.4, 'square', 0.003);
  notaEm(t + c / 2, tri[ordem[k + 1]] + 12, c * 0.4, 'square', 0.003);
  var atraso = Math.max(0, t - AC.currentTime);
  if (pc === 0 || pc === 3 || pc === 4) bumboEm(t);
  if (pc === 2 || pc === 6) ruido(0.10, 0.014, 2000, 1500, 0.8, 'bandpass', atraso);
  ruido(0.03, pc % 2 ? 0.007 : 0.004, 9000, 9000, 0.7, 'highpass', atraso);
}

/* ---------- o boom bap do rimador ----------
   'Tem que ter uma batida de boom bap quando chega o rimador.' 90 BPM,
   em semicolcheias, dois compassos: bumbo pesado no 1 e no "e" do 3, a
   caixa estalada no 2 e no 4, chimbal com swing (o do contratempo
   atrasado), o baixo em lá menor andando por baixo e um acorde de piano
   empoeirado (lá menor com sétima) no começo de cada compasso. Toca
   enquanto o rimador vem e durante a batalha. */
var BOOMBAP_PASSO = 60 / 90 / 4;
var BOOMBAP_BUMBO = [0, 10, 16, 23, 26];
// o baixo uma oitava abaixo do de antes: é o grave de 808 que dá o peso
var BOOMBAP_BAIXO = { 0: 33, 6: 36, 10: 31, 16: 33, 22: 38, 26: 36 };

/* 'Tem que ser mais pesado.' O bumbo do boom bap desce de 110 a 38Hz
   em 0,26s (o da trilha para em 48 e dura metade), com um estalo de
   ataque em cima; a caixa ganha corpo (um tom de 190Hz embaixo do ruído)
   e dura o dobro. */
function bumboPesado(t) {
  var o = AC.createOscillator(), g = AC.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(110, t);
  o.frequency.exponentialRampToValueAtTime(38, t + 0.26);
  g.gain.value = 0.0001;
  g.gain.setValueAtTime(0.09, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.34);
  o.connect(g); g.connect(AC.destination);
  o.start(t); o.stop(t + 0.36);
  notaEm(t, 57, 0.02, 'square', 0.01);              // o estalo do batedor
}
function caixaPesada(t, atraso) {
  ruido(0.24, 0.04, 1500, 900, 0.6, 'bandpass', atraso);
  ruido(0.06, 0.014, 5200, 5200, 0.8, 'highpass', atraso);
  notaEm(t, 54, 0.12, 'triangle', 0.03);            // o corpo da caixa
}
function tocaPassoBoombap(i, t) {
  var p = i % 32, swing = (p % 4 === 2) ? BOOMBAP_PASSO * 0.28 : 0;
  var atraso = Math.max(0, t - AC.currentTime);
  if (BOOMBAP_BUMBO.indexOf(p) >= 0) bumboPesado(t);
  if (p % 16 === 4 || p % 16 === 12) caixaPesada(t, atraso);
  if (p % 2 === 0) ruido(0.03, p % 4 ? 0.005 : 0.008, 9000, 9000, 0.7, 'highpass', atraso + swing);
  if (BOOMBAP_BAIXO[p]) {
    notaEm(t, BOOMBAP_BAIXO[p], BOOMBAP_PASSO * 5, 'sine', 0.07);
    notaEm(t, BOOMBAP_BAIXO[p] + 12, BOOMBAP_PASSO * 4, 'triangle', 0.02);   // a oitava de cima, pra aparecer em caixinha de celular
  }
  if (p === 0 || p === 16) {
    [57, 60, 64, 67].forEach(function (n, k) { notaEm(t + k * 0.012, n, BOOMBAP_PASSO * 7, 'triangle', 0.006); });
  }
}

/* ---------- as vinhetas de vitória e de derrota ----------
   'Tem que ter uma música de vitória quando ganha e de derrota quando
   perde.' Tocadas no mesmo chip da trilha (quadrada na melodia,
   triângulo no baixo, o bumbo e a caixa de ruído), e com hora marcada no
   relógio do áudio. Enquanto uma toca, a trilha da luta se cala: as duas
   juntas brigavam de tom.
   - Vitória: arpejo subindo até o dó agudo, a escadinha lá-si-dó-ré e o
     mi segurado em cima do acorde de dó, com bumbo marcando. ~2,4s.
   - Derrota: o 'uén uén uén uééén' descendo em semitom (sol, fá#, fá,
     mi), o último tremendo, com o baixo descendo junto. ~2,2s. */
var _jingleAte = 0;
var JINGLES = {
  vitoria: {
    mel: [[67, 0, .1], [72, .1, .1], [76, .2, .1], [79, .3, .1], [84, .4, .36],
      [81, .8, .14], [83, .95, .14], [84, 1.1, .14], [86, 1.25, .14], [88, 1.4, 1.0]],
    baixo: [[48, 0, .38], [53, .4, .38], [55, .8, .58], [48, 1.4, 1.0]],
    acorde: [[76, 1.4, 1.0], [79, 1.4, 1.0], [72, 1.4, 1.0]],
    bumbo: [0, .4, .8, 1.4], caixa: [1.1, 1.25, 1.4], dur: 2.4
  },
  derrota: {
    mel: [[67, 0, .42], [66, .45, .42], [65, .9, .42], [64, 1.35, .85]],
    baixo: [[43, 0, .42], [42, .45, .42], [41, .9, .42], [40, 1.35, .85]],
    acorde: [], bumbo: [1.35], caixa: [], dur: 2.2, treme: true
  }
};
function tocaJingle(nome) {
  var j = JINGLES[nome];
  if (!j || !SOM_LIGADO || !AC || AC.state !== 'running') return false;
  var t0 = AC.currentTime + 0.04, i, n;
  for (i = 0; i < j.mel.length; i++) {
    n = j.mel[i];
    var ultima = j.treme && i === j.mel.length - 1;
    if (!ultima) { notaEm(t0 + n[1], n[0], n[2], 'square', 0.014); continue; }
    // o último "uéén" treme: a nota com vibrato largo, caindo no fim
    var o = AC.createOscillator(), g = AC.createGain(), lfo = AC.createOscillator(), lg = AC.createGain();
    o.type = 'square'; o.frequency.value = hzDe(n[0]);
    lfo.frequency.value = 6; lg.gain.value = hzDe(n[0]) * 0.03;
    lfo.connect(lg); lg.connect(o.frequency);
    var ts = t0 + n[1];
    g.gain.value = 0.0001;
    g.gain.setValueAtTime(0.0001, ts);
    g.gain.linearRampToValueAtTime(0.014, ts + 0.01);
    g.gain.setValueAtTime(0.012, ts + n[2] * 0.7);
    g.gain.exponentialRampToValueAtTime(0.0001, ts + n[2]);
    o.frequency.setValueAtTime(hzDe(n[0]), ts + n[2] * 0.6);
    o.frequency.linearRampToValueAtTime(hzDe(n[0] - 1), ts + n[2]);
    o.connect(g); g.connect(AC.destination);
    o.start(ts); lfo.start(ts); o.stop(ts + n[2] + 0.02); lfo.stop(ts + n[2] + 0.02);
  }
  for (i = 0; i < j.baixo.length; i++) { n = j.baixo[i]; notaEm(t0 + n[1], n[0], n[2], 'triangle', 0.034); }
  for (i = 0; i < j.acorde.length; i++) { n = j.acorde[i]; notaEm(t0 + n[1], n[0], n[2], 'square', 0.005); }
  for (i = 0; i < j.bumbo.length; i++) bumboEm(t0 + j.bumbo[i]);
  for (i = 0; i < j.caixa.length; i++) ruido(0.10, 0.012, 1900, 1400, 0.8, 'bandpass', t0 + j.caixa[i] - AC.currentTime);
  _jingleAte = t0 + j.dur;
  return true;
}

function agendaMusica() {
  if (!SOM_LIGADO || !AC) return;
  // música desligada não cala o mundo: o ambulante continua gritando
  if (!MUSICA_LIGADA) {
    var mm = modoDoSom(), ag = Date.now();
    if (mm !== 'vagao' && mm !== 'estacao') { paraPregao(); return; }
    if (ag - _ultPregaoChk > 1000) { _ultPregaoChk = ag; gritaAmbulante(mm); }
    return;
  }
  /* Rede de seguranca: se por algum motivo nenhum evento avisou que a
     janela saiu de cena, o proprio relogio da musica percebe e se
     desliga. Um `setInterval` continua rodando em aba de fundo — so
     mais devagar — entao ele e o ultimo lugar em que da pra checar. */
  if (document.hidden) { paraMusica(); suspendeAudio(); return; }
  if (AC.state !== 'running') return;
  // ficou pra trás (contexto suspenso, aba voltando): retoma do agora, sem rajada
  if (_musProx < AC.currentTime) _musProx = AC.currentTime + 0.05;
  var modo = modoDoSom();
  if (modo === 'musica' || modo === 'luta' || modo === 'boombap') paraPregao();     // menu, luta e rima calam o ambulante
  // a música volta sempre do começo da frase, não do meio de onde parou
  if ((modo === 'musica' || modo === 'luta' || modo === 'boombap') && _musModo !== modo) _musPasso = 0;
  _musModo = modo;
  var luta = (modo === 'luta'), rap = (modo === 'boombap');
  var passo = rap ? BOOMBAP_PASSO : (luta ? LUTA_COLCHEIA : MUS_COLCHEIA);
  var volta = rap ? 32 : (luta ? LUTA_MELODIA.length : MUS_MELODIA.length);
  while (_musProx < AC.currentTime + 0.15) {
    // durante a vinheta a trilha anda calada, e volta do começo da frase depois
    if (_musProx < _jingleAte) { _musPasso = 0; _musProx += passo; continue; }
    if (rap) tocaPassoBoombap(_musPasso, _musProx);
    else if (luta) tocaPassoLuta(_musPasso, _musProx);
    else if (modo === 'musica') tocaPassoMusica(_musPasso, _musProx);
    else tocaPassoAmbiente(_musPasso, _musProx, modo);
    _musPasso = (_musPasso + 1) % volta;
    _musProx += passo;
  }
}

/* ---------- música só onde é jogo; no mundo, o mundo ----------
   "Não sei se faz sentido música o tempo todo, pode ser barulho de
   pessoas." Faz sentido: no metrô de verdade ninguém ouve trilha, ouve
   gente, trilho e aviso. Então a música fica nos menus (título, treino,
   fim) e na luta, que é o momento "de jogo" — e no mundo toca o mundo. */
var _musModo = null, _gentePerto;
function modoDoSom() {
  var m = window.jogo && jogo.scene;
  if (!m) return 'musica';
  // o rimador chegando, ou a batalha de rima rolando: boom bap
  var vg = m.getScene('Vagao');
  if (vg && (m.isActive('Vagao') || m.isPaused('Vagao')) &&
      (vg.batalha || (vg.encontro && vg.encontro.tipo === 'rima'))) return 'boombap';
  // a luta tem trilha própria, mais rápida e em menor
  if (m.isActive('Desafio') || m.isActive('Briga') || m.isActive('Encarada') || m.isActive('Disputa')) return 'luta';
  if (m.isActive('Title') || m.isActive('Treino') || m.isActive('Fim')) return 'musica';
  if (m.isActive('Vagao') || m.isPaused('Vagao')) return 'vagao';
  return 'estacao';
}

/* O burburinho: gente falando é ruído com cara de voz — faixa estreita
   entre 350 e 900Hz, que é onde mora a vogal, com começo e fim macios.
   Várias dessas se sobrepondo, cada uma de um tom, viram conversa que
   não se entende. Quanto mais lotado, mais vozes. No vagão andando entra
   o ronco do trem e o tá-dum dos trilhos, uma vez por compasso. */
/* Quanta gente está perto de você, agora: o burburinho vem de quem
   está em volta, e não de uma média do horário. Sozinho no fim da
   plataforma é quase silêncio; no meio da fila da catraca é conversa por
   todo lado. 110px é pouco mais que dois bonecos pra cada lado. */
function genteEmVolta(modo) {
  var sc = window.jogo && jogo.scene.getScene(modo === 'vagao' ? 'Vagao' : 'Estacao');
  if (!sc || !sc.pl || !sc.pl.sp || !sc.gente) return 0;
  var px = sc.pl.sp.x, py = sc.pl.sp.y, n = 0;
  for (var i = 0; i < sc.gente.length; i++) {
    var a = sc.gente[i];
    if (!a || !a.sp || !a.sp.active) continue;
    if (Math.abs(a.sp.x - px) < 110 && Math.abs(a.sp.y - py) < 110) n++;
  }
  return n;
}

function tocaPassoAmbiente(i, t, modo) {
  var atraso = Math.max(0, t - AC.currentTime);
  if (i % 4 === 0 || _gentePerto === undefined) _gentePerto = genteEmVolta(modo);
  var perto = Math.min(_gentePerto, 12);
  var vozes = Math.random() < 0.12 + perto * 0.07 ? 1 + Math.floor(Math.random() * (1 + perto / 4)) : 0;
  for (var v = 0; v < vozes; v++) {
    var f0 = 350 + Math.random() * 550;
    ruido(0.22 + Math.random() * 0.35, (0.0022 + Math.random() * 0.003) * (0.6 + perto * 0.09),
      f0, f0 * (0.8 + Math.random() * 0.4), 5, 'bandpass', atraso + Math.random() * 0.1);
  }
  if (i % 8 === 0) gritaAmbulante(modo);
  // de vez em quando alguém ri ou tosse mais perto
  if (Math.random() < 0.025) ruido(0.12, 0.006, 1400, 900, 3, 'bandpass', atraso);

  var vg = window.jogo && jogo.scene.getScene('Vagao');
  if (modo === 'vagao' && vg && vg.estado === 'andando') {
    if (i % 4 === 0) ruido(1.1, 0.014, 110, 85, 0.7, 'lowpass', atraso);
    var p = i % 8;
    if (p === 0 || p === 1) {
      ruido(0.05, 0.016, 2600, 1700, 2, 'bandpass', atraso);
      ruido(0.08, 0.02, 160, 70, 1, 'lowpass', atraso);
    }
  }
}

/* ---------- o aviso da estação ----------
   O "plim" e a voz. As gravações do Metrô são do Metrô: aqui o plim é
   sintetizado e quem fala é a voz em português que o próprio aparelho
   já tem (speechSynthesis). Sem voz em português no aparelho, o aviso é
   só o plim — voz inglesa lendo "Anhangabaú" seria pior que nada. */
var NOME_FALADO = {
  'PÇA. ÁRVORE': 'Praça da Árvore', 'JD.SÃO PAULO': 'Jardim São Paulo', 'PD. INGLESA': 'Parada Inglesa',
  'MAL. DEODORO': 'Marechal Deodoro', 'STA. CECÍLIA': 'Santa Cecília', 'PEDRO II': 'Pedro Segundo',
  'BARRA FUNDA': 'Palmeiras Barra Funda', 'ITAQUERA': 'Corinthians-Itaquera', 'LIBERDADE': 'Japão Liberdade',
  'PORTUGUESA': 'Portuguesa Tietê'
};
function nomeFalado(n) {
  if (NOME_FALADO[n]) return NOME_FALADO[n];
  return String(n).toLowerCase().replace(/(^|\s)(\S)/g, function (m, a, b) { return a + b.toUpperCase(); });
}

/* A musiquinha antes do aviso. Eram três notas descendo, devagar, que
   soavam como erro. Agora são quatro subindo, rápidas, e a última
   segura: sol, dó, mi, sol, com um sino uma oitava acima — o jeito de
   vinheta de estação, que chama a atenção sem assustar. */
function plim() {
  if (!AC || !SOM_LIGADO) return;
  var t = AC.currentTime + 0.02, notas = [67, 72, 76, 79], passo = 0.13;
  for (var i = 0; i < notas.length; i++) {
    var dur = (i === notas.length - 1) ? 0.9 : 0.3;
    notaEm(t + i * passo, notas[i], dur, 'sine', 0.05);
    notaEm(t + i * passo, notas[i] + 12, dur * 0.5, 'triangle', 0.014);
  }
}

/* Duas vozes: a do aviso é FEMININA, como a do metrô; a do ambulante
   e de quem reclama é masculina. O navegador não diz o gênero da voz,
   então vai pelo nome das que existem: Maria, Francisca, Thalita (as do
   Windows e do Edge), a do Google (feminina no Android e no Chrome).
   Daniel e Antonio são as masculinas. Sem uma feminina, o aviso usa a
   que tiver com o tom mais alto. */
var VOZ_FEMININA = /maria|francisca|thalita|luciana|vit[oó]ria|raquel|helo[ií]sa|let[ií]cia|manuela|yara|brenda|elza|leila|google/i;
var VOZ_MASCULINA = /daniel|antonio|ant[oô]nio|fabio|f[aá]bio|donato|humberto|julio|nicolau|valerio/i;
var _vozes = null;
function vozesPt() {
  if (_vozes || !window.speechSynthesis) return _vozes;
  var vs = speechSynthesis.getVoices(), pt = [], i;
  for (i = 0; i < vs.length; i++) {
    var l = (vs[i].lang || '').toLowerCase().replace('_', '-');
    if (l.indexOf('pt') === 0) pt.push(vs[i]);
  }
  if (!pt.length) return null;
  // pt-BR na frente: o de Portugal lê "Sé" de outro jeito
  pt.sort(function (a, b) {
    var ab = /br/i.test(a.lang) ? 0 : 1, bb = /br/i.test(b.lang) ? 0 : 1;
    return ab - bb;
  });
  /* As vozes NEURAIS vêm primeiro: no Edge, 'Francisca Online (Natural)'
     é quase gente; a 'Maria' do Windows é a robótica de sempre. No Chrome
     a do Google é a melhor que tem. Natural > Google > o resto. */
  var nota = function (v) {
    return (/natural|neural|online/i.test(v.name) ? 0 : (/google/i.test(v.name) ? 1 : 2));
  };
  var fem = null, mas = null;
  for (i = 0; i < pt.length; i++) {
    if (VOZ_FEMININA.test(pt[i].name) && (!fem || nota(pt[i]) < nota(fem))) fem = pt[i];
    if (VOZ_MASCULINA.test(pt[i].name) && (!mas || nota(pt[i]) < nota(mas))) mas = pt[i];
  }
  _vozes = { aviso: fem || pt[0], avisoTom: fem ? 1 : 1.35, gente: mas || pt[0], genteTom: mas ? 1 : 0.75 };
  return _vozes;
}
function vozPt() { var v = vozesPt(); return v ? v.aviso : null; }
if (window.speechSynthesis && speechSynthesis.addEventListener) {
  speechSynthesis.addEventListener('voiceschanged', function () { _vozes = null; _vozEn = undefined; vozesPt(); });
}

/* Fala de gente (o ambulante, quem reclama): não passa por cima do
   aviso, e é mais rápida e mais alta, que é como se grita no vagão. */
function falaGente(texto, rapido) {
  if (!SOM_LIGADO || document.hidden || !window.speechSynthesis) return;
  var v = vozesPt();
  if (!v || speechSynthesis.speaking) return;
  try {
    var u = new SpeechSynthesisUtterance(texto);
    u.voice = v.gente; u.lang = v.gente.lang;
    u.rate = rapido || 1.2; u.pitch = v.genteTom; u.volume = 1;
    speechSynthesis.speak(u);
  } catch (e) { }
}

/* O ambulante grita quando está perto: a cada 8 a 14s, se houver um a
   menos de 170px de você. É o pregão do trem de SP. */
var _tPregao = 0;
/* ---------- quem está gritando ----------
   'O ambulante tem que ser destacado quando vem, aparecer uns sons
   sendo emitidos dele.' Enquanto o pregão toca, saem ondas de som dos
   dois lados da cabeça dele e notinhas subindo, e um anel amarelo pulsa
   nos pés: é ele. Cada cena chama isto no update. */
function ondasDoPregao(cena, time) {
  if (!cena._gPregao) cena._gPregao = cena.add.graphics().setDepth(55);
  var g = cena._gPregao; g.clear();
  var sp = _ambFonte;
  if (!_audAmb || _audAmb.paused || !sp || !sp.active || sp.scene !== cena) return;
  var x = sp.x, y = sp.y - 38, k;
  var pulso = 0.5 + 0.5 * Math.sin(time / 180);
  g.lineStyle(2, 0xf2c14e, 0.4 + 0.4 * pulso).strokeEllipse(x, sp.y - 1, 26, 9);
  for (k = 0; k < 3; k++) {
    var f = ((time / 650) + k / 3) % 1, r = 7 + f * 20;
    g.lineStyle(2, 0xf2c14e, (1 - f) * 0.9);
    g.beginPath(); g.arc(x, y, r, -0.7, 0.7); g.strokePath();
    g.beginPath(); g.arc(x, y, r, Math.PI - 0.7, Math.PI + 0.7); g.strokePath();
  }
  // duas notinhas subindo, uma de cada lado
  for (k = 0; k < 2; k++) {
    var fn = ((time / 900) + k / 2) % 1, nx = x + (k ? 14 : -16) + Math.sin(time / 200 + k) * 2, ny = y - 6 - fn * 22;
    g.fillStyle(0xf2c14e, 1 - fn).fillCircle(nx, ny, 2.5).fillRect(nx + 1.5, ny - 8, 1.5, 8).fillRect(nx + 1.5, ny - 8, 4, 1.5);
  }
}

/* ---------- o pregão gravado ----------
   'Usa esses áudios pros ambulantes.' Dois pregões de verdade, em
   assets/audio: tocam quando um ambulante está perto, com o volume caindo
   com a distância, e param quando ele fica pra trás, quando o jogo vai
   pra menu ou luta, e quando o som é desligado. A voz sintetizada de
   antes saiu de vez ('esquece a voz robótica'): sem o arquivo, silêncio. */
var AUDIO_AMBULANTE = ['assets/audio/ambulante_metro.mp3', 'assets/audio/ambulante_vendedor.mp3'];
var _audAmb = null, _ambFonte = null, _ultPregaoChk = 0;
function paraPregao() {
  if (_audAmb) { try { _audAmb.pause(); } catch (e) { } _audAmb = null; }
}
function gritaAmbulante(modo) {
  var agora = Date.now();
  var sc = window.jogo && jogo.scene.getScene(modo === 'vagao' ? 'Vagao' : 'Estacao');
  if (!sc || !sc.pl || !sc.pl.sp || !SOM_LIGADO || document.hidden) { paraPregao(); return; }
  /* Só quem é ambulante de verdade grita: o da plataforma (sc.ambulante)
     ou quem estiver marcado como tal. Pelo desenho não dá: o atendente
     do DOG DO CÃO e o da banca usam os mesmos bonecos de ambulante, e as
     ondas saíam deles ('às vezes não é o ambulante falando'). */
  var lista = [].concat(sc.ambulante ? [sc.ambulante] : [], (sc.gente || []).filter(function (g) { return g && g.ehAmbulante; }));
  var dist = 1e9, fonte = null;
  for (var i = 0; i < lista.length; i++) {
    var a = lista[i];
    if (!a || !a.sp || !a.sp.active) continue;
    var d = Math.hypot(a.sp.x - sc.pl.sp.x, a.sp.y - sc.pl.sp.y);
    if (d < dist) { dist = d; fonte = a.sp; }
  }
  if (fonte) _ambFonte = fonte;
  var vol = Phaser.Math.Clamp(1 - dist / 240, 0, 1) * 0.55;
  if (_audAmb && !_audAmb.paused && !_audAmb.ended) {
    if (vol <= 0.02) paraPregao(); else _audAmb.volume = vol;
    return;
  }
  _audAmb = null;
  if (dist > 170 || agora < _tPregao) return;
  _tPregao = agora + 22000 + Math.random() * 12000;
  try {
    _audAmb = new Audio(AUDIO_AMBULANTE[Math.floor(Math.random() * AUDIO_AMBULANTE.length)]);
    _audAmb.volume = vol;
    var pr = _audAmb.play();
    if (pr && pr.catch) pr.catch(function () { _audAmb = null; });
  } catch (e) {
    _audAmb = null;
  }
}

/* ---------- o som ambiente gravado ----------
   'Som ambiente de transporte público': dois minutos de metrô de
   verdade (gente, freio, porta, aviso ao longe), cortados de uma
   gravação maior e com a emenda fundida em 5 s, pra rodar em laço sem
   pulo. Toca por baixo de tudo na estação e no vagão (no vagão um pouco
   mais alto, que é onde o barulho mora) e cala no menu, na luta, na
   rima, com o som desligado e com a aba escondida. */
var AUDIO_AMBIENTE = 'assets/audio/ambiente_transporte.mp3';
var _audAmbiente = null;
/* 'Tem que ser barulho de pessoas falando no mezanino; só na plataforma
   tem que ter barulho de metrô.' A gravação de metrô toca no vagão e na
   plataforma; no saguão ela some aos poucos e fica só o burburinho de
   gente (o sintetizado, que já vem de quem está em volta). O volume
   desliza, pra subir a escada não ser um corte seco. */
var _volAmbiente = 0;
function ambienteGravado() {
  var modo = modoDoSom(), alvo = 0;
  if (SOM_LIGADO && !document.hidden) {
    if (modo === 'vagao') alvo = 0.42;
    else if (modo === 'estacao') {
      var est = window.jogo && jogo.scene.getScene('Estacao');
      var naPlat = est && est.pl && est.pl.sp && typeof ESC_Y !== 'undefined' && est.pl.sp.y < ESC_Y + 40;
      alvo = naPlat ? 0.34 : 0;
    }
  }
  _volAmbiente += Phaser.Math.Clamp(alvo - _volAmbiente, -0.06, 0.06);
  if (_volAmbiente <= 0.01) { _volAmbiente = 0; if (_audAmbiente && !_audAmbiente.paused) _audAmbiente.pause(); return; }
  try {
    if (!_audAmbiente) { _audAmbiente = new Audio(AUDIO_AMBIENTE); _audAmbiente.loop = true; }
    _audAmbiente.volume = _volAmbiente;
    if (_audAmbiente.paused) {
      var pr = _audAmbiente.play();
      if (pr && pr.catch) pr.catch(function () { });
    }
  } catch (e) { }
}
// relógio próprio: a música pode estar desligada e o mundo continua fazendo barulho
setInterval(ambienteGravado, 250);

/* ---------- o trem chegando, gravado ----------
   'Varia com esse som de metrô chegando.' A gravação de um trem de
   verdade encostando na plataforma, a cada chegada com o tom e a
   velocidade um pouco diferentes (0,9 a 1,1), pra nenhum trem soar igual
   ao anterior. Alto na plataforma, baixinho de quem ainda está no
   saguão. Ele toca SÓ durante a chegada ('é só durante a chegada do
   trem'): quando o trem para e a porta abre, some num fade curto
   (calaTremChegando). Sem o arquivo, volta o trem sintetizado. */
var AUDIO_TREM = 'assets/audio/trem_chegando.mp3', AUDIO_TREM_MS = 20900;
/* Baixado uma vez e tocado da memória: pular pro meio da gravação pede
   um servidor que aceite pedido parcial, e da memória sempre dá. */
var _tremUrl = null;
try {
  fetch(AUDIO_TREM).then(function (r) { return r.ok ? r.blob() : null; })
    .then(function (b) { if (b) _tremUrl = URL.createObjectURL(b); }).catch(function () { });
} catch (e) { }
/* `resta`: quantos ms faltam até a porta abrir. Com espera curta (no
   pico, 3 s), a gravação começa do meio, pra terminar junto com a porta
   em vez de continuar tocando no embarque. */
function tocaTremChegando(cena, vel, resta) {
  if (!SOM_LIGADO || document.hidden) return;
  var naPlat = cena && cena.pl && cena.pl.sp && cena.pl.sp.y < ESC_Y;
  try {
    var a = new Audio(_tremUrl || AUDIO_TREM);
    a.volume = naPlat ? 0.6 : 0.18;
    a.preservesPitch = false; a.mozPreservesPitch = false; a.webkitPreservesPitch = false;
    a.playbackRate = vel || (0.9 + Math.random() * 0.2);
    if (resta) {
      var pula = Math.max(0, (AUDIO_TREM_MS - resta * a.playbackRate) / 1000);
      if (pula > 0) {
        var poe = function () { try { a.currentTime = pula; } catch (e) { } };
        poe(); a.addEventListener('loadedmetadata', poe, { once: true });
      }
    }
    var pr = a.play();
    if (pr && pr.catch) pr.catch(function () { sfx('trem'); });
    if (cena && cena.events) cena.events.once('shutdown', function () { try { a.pause(); } catch (e) { } });
    return a;
  } catch (e) { sfx('trem'); }
  return null;
}
function calaTremChegando(a) {
  if (!a) return;
  var v0 = a.volume, passos = 12, k = 0;
  var id = setInterval(function () {
    k++;
    try { a.volume = Math.max(0, v0 * (1 - k / passos)); } catch (e) { }
    if (k >= passos) { clearInterval(id); try { a.pause(); } catch (e) { } }
  }, 40);
}

/* 'Nas estações falam as duas, primeiro português e depois inglês.' O
   aviso vem em pt-BR e, logo depois, a mesma coisa em inglês, na voz
   inglesa que o aparelho tiver (sem voz inglesa, só o português). */
var _vozEn;
function vozEn() {
  if (_vozEn !== undefined || !window.speechSynthesis) return _vozEn || null;
  var vs = speechSynthesis.getVoices();
  if (!vs.length) return null;
  var en = vs.filter(function (v) { return /^en/i.test(v.lang || ''); });
  // voz de mulher quando dá pra saber pelo nome, que é a do aviso do metrô
  en.sort(function (a, b) {
    var fa = /female|zira|samantha|susan|hazel|google us/i.test(a.name) ? 0 : 1;
    var fb = /female|zira|samantha|susan|hazel|google us/i.test(b.name) ? 0 : 1;
    return fa - fb;
  });
  _vozEn = en[0] || null;
  return _vozEn;
}
function anuncia(texto, ingles) {
  if (!SOM_LIGADO || document.hidden) return;
  if (typeof GameState !== 'undefined' && GameState.treino) return;
  plim();
  var voz = vozPt();
  if (!voz) return;
  setTimeout(function () {
    if (!SOM_LIGADO || document.hidden) return;
    try {
      speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(texto);
      u.voice = voz; u.lang = voz.lang; u.rate = 0.94; u.pitch = vozesPt().avisoTom; u.volume = 0.9;
      speechSynthesis.speak(u);
      var ve = ingles && vozEn();
      if (ve) {
        // a fila da fala toca uma depois da outra: o inglês entra quando o português acaba
        var ue = new SpeechSynthesisUtterance(ingles);
        ue.voice = ve; ue.lang = ve.lang; ue.rate = 0.94; ue.pitch = vozesPt().avisoTom; ue.volume = 0.9;
        speechSynthesis.speak(ue);
      }
    } catch (e) { }
  }, 800);
}
/* "Próxima estação: Sé. Desembarque pelo lado esquerdo do trem." A Sé é
   a única plataforma central do jogo; nas laterais o jogo abre o trem
   sempre do mesmo lado, e o aviso diz qual. */
function avisoDaProxima() {
  var prox = GameState.proximaEstacaoNome();
  var lado = (prox === BALDEACAO) ? 'esquerdo' : 'direito';
  return 'Próxima estação: ' + nomeFalado(prox) + '. Desembarque pelo lado ' + lado + ' do trem.';
}
function avisoDaProximaEn() {
  var prox = GameState.proximaEstacaoNome();
  return 'Next station: ' + nomeFalado(prox) + '. Exit on the ' + (prox === BALDEACAO ? 'left' : 'right') + ' side of the train.';
}
function calaAnuncio() {
  try { if (window.speechSynthesis) speechSynthesis.cancel(); } catch (e) { }
}

function ligaMusica(v) {
  MUSICA_LIGADA = !!v;
  try { localStorage.setItem('metrosp_musica', MUSICA_LIGADA ? '1' : '0'); } catch (e) { }
  if (MUSICA_LIGADA) { audioOn(); comecaMusica(); }
  else paraMusica();
}

function comecaMusica() {
  if (_musicaT || !MUSICA_LIGADA || !SOM_LIGADO) return;
  if (typeof document !== 'undefined' && document.hidden) return;
  _musProx = 0;
  _musicaT = setInterval(agendaMusica, 40);
}

function paraMusica() {
  if (_musicaT) { clearInterval(_musicaT); _musicaT = null; }
}

var AC = null;
/* Declarado junto do contexto porque a vida dele e a mesma: o buffer de
   ruido pertence ao AudioContext que o criou. */
var bufRuido = null;

function suspendeAudio() {
  if (AC && AC.state === 'running' && AC.suspend) {
    try { AC.suspend(); } catch (e) { }
  }
}

/* ---------- desligar o som DESTROI o audio, nao adormece ----------
   Suspender basta pra quem trocou de janela e vai voltar. Nao basta pra
   quem DESLIGOU o som: ali o jogo tem que ficar sem nada capaz de
   emitir, e isso tem que dar pra provar. Contexto fechado nao tem
   estado intermediario — ou existe ou nao existe.

   Serve tambem de resposta a uma duvida que so o aparelho do jogador
   responde: com o som desligado, `AC` e nulo. Se ainda houver barulho,
   ele nao esta saindo desta pagina, e da pra parar de procurar aqui.

   O `bufRuido` morre junto, e isso nao e detalhe: ele e um AudioBuffer
   criado A PARTIR do contexto. Sobrevivendo a um contexto fechado, ele
   seria reusado no contexto novo e estouraria no primeiro freio de
   trem. */
function fechaAudio() {
  paraMusica();
  calaAnuncio();
  bufRuido = null;
  if (AC && AC.close) {
    try { AC.close(); } catch (e) { }
  }
  AC = null;
}

/* ---------- o som para junto com a tela ----------
   A música anda num `setInterval` e o WebAudio não liga a mínima pra
   aba estar em segundo plano: navegador nenhum silencia sozinho uma aba
   que JÁ estava fazendo som. Quem trocava de aba, minimizava a janela ou
   fechava o jogo continuava ouvindo o metrô tocar atrás de tudo.

   Parar o relógio da música não basta, porque o WebAudio agenda nota
   com antecedência e o que já está na fila toca do mesmo jeito.
   Suspender o CONTEXTO cala inclusive o que já foi agendado — é a única
   coisa que silencia de verdade.

   Suspender e não fechar: fechar é definitivo, e a página pode voltar do
   cache de histórico (o botão voltar). Suspenso, ela acorda no
   `pageshow` e o som volta como estava. */
function calaOSom() {
  paraMusica();
  suspendeAudio();
  calaAnuncio();
}

function voltaOSom() {
  if (!SOM_LIGADO || document.hidden) return;
  if (AC && AC.state === 'suspended' && AC.resume) {
    try { AC.resume(); } catch (e) { }
  }
  comecaMusica();
}

function somSegueAJanela() {
  if (document.hidden) calaOSom();
  else voltaOSom();
}

/* ---------- por que NAO basta o visibilitychange ----------
   A primeira versao disto so ouvia `visibilitychange`, e nao resolveu:
   o som continuou tocando em segundo plano. O motivo e que
   `visibilityState` responde a pergunta errada. Ele muda quando a ABA
   vai pro fundo ou a janela e minimizada — e nao muda quando voce
   troca de programa com alt-tab ou poe outra janela na frente. Pro
   navegador a pagina continua "visivel"; pra pessoa o jogo sumiu e
   ficou tocando atras de tudo. Que e exatamente a queixa.

   Quem responde a pergunta certa e o FOCO da janela. Entao os dois
   entram, e nenhum depende do outro estar certo.

   Eu tinha deixado o `blur` de fora achando que clicar num painel
   lateral tiraria o foco da janela. Nao tira: os paineis sao DOM da
   mesma janela, e foco que anda dentro da pagina nao dispara `blur` de
   window. A justificativa estava errada e o buraco era esse.

   E a volta tem tres portas, nao uma. Se algum ambiente nunca mandar
   `focus`, o primeiro toque ou tecla ja religa — porque quem esta
   clicando no jogo esta, sem duvida nenhuma, olhando pra ele. */
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', somSegueAJanela);
  window.addEventListener('blur', calaOSom);
  window.addEventListener('focus', voltaOSom);
  window.addEventListener('pointerdown', voltaOSom, true);
  window.addEventListener('keydown', voltaOSom, true);
  /* `pagehide` cobre fechar a aba, navegar pra fora e o app esconder a
     pagina; `pageshow` traz de volta quem voltou pelo historico. */
  /* Fechar a aba, navegar pra fora, o app matar a pagina: nao ha volta
     esperada, entao aqui e fechar mesmo. `blur` e `visibilitychange`
     seguem suspendendo, porque desses o jogador volta. */
  window.addEventListener('pagehide', fechaAudio);
  window.addEventListener('pageshow', somSegueAJanela);
}

function audioOn() {
  /* Chamado por pausa, celular e pelos botoes de comecar. Sem esta
     guarda ele RESSUSCITAVA o contexto que o proprio `SOM: DESLIGADO`
     tinha acabado de suspender: abrir a pausa com o som desligado
     religava tudo. */
  if (!SOM_LIGADO) return;
  if (!AC && (window.AudioContext || window.webkitAudioContext)) {
    AC = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (AC && AC.state === 'suspended') AC.resume();
  comecaMusica();
}
/* o toque de mensagem: dois bipes rápidos subindo, o 'plim-plim' de zap */
function tocaNotificacao() {
  if (!SOM_LIGADO) return;
  try { tom(1318, 0.07, 'sine', 0.18); setTimeout(function () { tom(1760, 0.1, 'sine', 0.18); }, 110); } catch (e) { }
}

function tom(f, d, tipo, vol) {
  if (!AC) return;
  var o = AC.createOscillator(), g = AC.createGain(), t = AC.currentTime;
  o.type = tipo || 'square'; o.frequency.value = f;
  g.gain.setValueAtTime(vol || 0.05, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + d);
  o.connect(g); g.connect(AC.destination); o.start(t); o.stop(t + d + 0.02);
}
/* ---------- ruído ----------
   Oscilador não faz trem. Freio de metrô é ruído branco passado por um
   filtro estreito que desce de tom, e chiado de ar é ruído agudo sem
   altura nenhuma: as duas coisas são impossíveis com onda periódica,
   por mais camada que se empilhe. O buffer é gerado uma vez e reusado. */
function ruido(dur, vol, f0, f1, q, tipo, atraso) {
  if (!AC) return;
  if (!bufRuido) {
    var n = AC.sampleRate * 2;
    bufRuido = AC.createBuffer(1, n, AC.sampleRate);
    var d = bufRuido.getChannelData(0);
    for (var i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  }
  var t = AC.currentTime + (atraso || 0);
  var src = AC.createBufferSource(); src.buffer = bufRuido; src.loop = true;
  var filtro = AC.createBiquadFilter();
  filtro.type = tipo || 'bandpass';
  filtro.Q.value = (q === undefined) ? 1 : q;
  filtro.frequency.setValueAtTime(f0, t);
  filtro.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur);
  var g = AC.createGain();
  /* Nasce mudo. O ganho vale 1 até o primeiro evento agendado, e com t
     quebrado (0.05 + 3 * 0.2 = 0.6500000000000001) a fonte começava um
     sample antes do evento: um clique de 0,63, dez vezes a música. */
  g.gain.value = 0.0001;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + Math.min(0.12, dur * 0.3));
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(filtro); filtro.connect(g); g.connect(AC.destination);
  src.start(t); src.stop(t + dur + 0.05);
}

/* um tom que escorrega de uma altura pra outra, que é como soa motor */
function glissando(f0, f1, dur, tipo, vol, atraso) {
  if (!AC) return;
  var t = AC.currentTime + (atraso || 0);
  var o = AC.createOscillator(), g = AC.createGain();
  o.type = tipo || 'sawtooth';
  o.frequency.setValueAtTime(f0, t);
  o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.08);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(AC.destination); o.start(t); o.stop(t + dur + 0.05);
}

function sfx(n) {
  if (!SOM_LIGADO) return;
  switch (n) {
    case 'ok': tom(660, .07); setTimeout(function () { tom(880, .09); }, 70); break;
    case 'nao': tom(150, .16, 'sawtooth'); break;
    // o "aff" de quem foi atrapalhado: um tsc e um resmungo descendo
    case 'bravo':
      ruido(0.05, 0.03, 5200, 4200, 2, 'bandpass');
      glissando(230, 130, 0.32, 'sawtooth', 0.03, 0.07);
      break;
    case 'moeda': tom(1046, .05); setTimeout(function () { tom(1568, .1); }, 55); break;
    case 'empurra': tom(110 + Math.random() * 70, .05, 'sawtooth'); break;
    case 'porta': tom(440, .06, 'sine', .06); setTimeout(function () { tom(330, .12, 'sine', .06); }, 70); break;
    case 'apito': tom(2200, .09); setTimeout(function () { tom(2600, .13); }, 90); break;
    case 'trem': tom(65, .6, 'sawtooth', .05); break;
    case 'catraca': tom(880, .04); setTimeout(function () { tom(1320, .06); }, 45); break;
    case 'caixa': tom(96, .11, 'sine', .09); setTimeout(function () { tom(62, .17, 'sine', .07); }, 60); break;
    /* passo: curto e grave, e alterna de altura pra não virar metrônomo */
    case 'passoA': tom(150, .035, 'triangle', .035); break;
    case 'passoB': tom(126, .035, 'triangle', .032); break;
    // o dó-mi do letreiro, antes do nome da estação
    case 'anuncio': tom(784, .1, 'sine', .05); setTimeout(function () { tom(1046, .16, 'sine', .05); }, 110); break;
    /* ---------- o trem entrando na estação ----------
       Três camadas, porque trem é três coisas ao mesmo tempo: o rolamento
       grave desacelerando, o guincho do freio — que é o que faz a pessoa
       reconhecer metrô antes de olhar pra tela — e o chiado do ar no fim.
       O guincho entra depois do rolamento, como na plataforma de verdade.
       Oscilador sozinho não faz nada disso: freio é ruído filtrado. */
    /* Com o burburinho e o trilho tocando o tempo todo, a chegada e a
       saída ficaram baixas demais pra marcar a troca de estação: subiram
       uns 60%, e a chegada ficou mais longa, que é a freada de verdade. */
    case 'chegando':
      glissando(140, 46, 2.4, 'sawtooth', 0.085);           // o rolamento
      ruido(2.4, 0.08, 280, 70, 1.1);                       // rodas no trilho
      ruido(1.3, 0.055, 2900, 1250, 14, 'bandpass', 0.8);   // o guincho do freio
      ruido(0.6, 0.045, 5200, 3400, 0.8, 'highpass', 2.1);  // o ar escapando
      break;
    /* e o trem saindo: o contrário, subindo de tom e sumindo no túnel */
    case 'partindo':
      ruido(0.4, 0.045, 4600, 3000, 0.8, 'highpass', 0);
      glissando(52, 170, 2.2, 'sawtooth', 0.08, 0.25);       // o motor subindo de tom
      glissando(260, 780, 2.2, 'square', 0.012, 0.25);       // o chiado do inversor, agudo
      ruido(2.2, 0.07, 80, 320, 1.1, 'bandpass', 0.25);
      break;
    /* O aviso de porta do metrô de SP: bipe curto e agudo, repetido,
       uns três segundos antes de fechar. E o fechar: o ar da porta
       (chiado que desce) e o baque das duas folhas se encontrando. */
    case 'bipePorta':
      for (var bp = 0; bp < 8; bp++) {
        (function (k) { setTimeout(function () { tom(1180, 0.09, 'square', 0.035); }, k * 190); })(bp);
      }
      break;
    case 'portaFecha':
      ruido(0.45, 0.05, 6000, 2200, 0.9, 'highpass', 0);
      tom(90, 0.14, 'sine', 0.12);
      setTimeout(function () { tom(70, 0.1, 'triangle', 0.08); }, 60);
      break;
    case 'batida': tom(70, .09, 'sine', .09); setTimeout(function () { tom(1300, .03, 'square', .028); }, 95); break;
    case 'erro': tom(200, .1, 'square', .06); setTimeout(function () { tom(120, .22, 'square', .06); }, 100); break;
    case 'fim': [392, 330, 262, 196].forEach(function (f, i) { setTimeout(function () { tom(f, .22, 'triangle', .07); }, i * 160); }); break;
    case 'vitoria':
      if (!tocaJingle('vitoria')) [523, 659, 784, 1046].forEach(function (f, i) { setTimeout(function () { tom(f, .14); }, i * 110); });
      break;
    case 'derrota': if (!tocaJingle('derrota')) tom(150, .4, 'sawtooth'); break;
  }
}

/* ---------- controle (teclado + toque) ---------- */
/* pulso: um toque rápido pode começar e terminar dentro do mesmo quadro.
   Sem guardar o pulso, o dedo aperta e o jogo não vê nada. */
var TOUCH = { up: false, down: false, left: false, right: false, act: false, pulso: false };
var TOQUE_ATIVO = false;

/* ---------- manche flutuante, e a tela dividida ----------
   O direcional fixo comia 108px do rodapé — quase um quinto da tela — e
   ficava aceso mesmo sem ninguém encostar, bem em cima da multidão. Aqui
   não há nada desenhado até o dedo tocar: onde ele tocar nasce o manche,
   e ele some quando o dedo sai. A tela inteira volta a ser jogo.

   Só que "onde tocar nasce o manche" tinha um preço: todo toque pra
   agir começava um manche, e todo começo de caminhada corria o risco de
   virar um agir. As duas coisas disputavam o mesmo gesto, e o jogo
   ficava adivinhando qual era qual pelo tempo que o dedo passou parado.

   Agora a tela é dividida: a metade ESQUERDA anda, a metade DIREITA
   age. Um polegar em cada lado, os dois ao mesmo tempo — dá pra
   atravessar o vagão segurando na barra, que antes era impossível. */
/* A metade direita da tela é o botão de agir, e a esquerda é o
   direcional. Isso resolve mão de celular, onde os dois polegares
   trabalham ao mesmo tempo e não existe cursor.

   No computador é o contrário de ajuda: existe UM cursor, ele aponta
   pra onde quiser, e partir a tela ao meio faz o clique na esquerda
   virar arrasto e o da direita virar ação — duas regras invisíveis
   pra quem tem teclado e mouse. Fora do celular a divisão não existe:
   clique em qualquer lugar é agir, e quem anda é o WASD. */
/* ---------- por que não há mais metade de andar e metade de agir ----------
   A tela era partida em x = 160: esquerda dirigia, direita agia. Medido
   no toque, três toques curtos na metade esquerda davam ZERO ações e
   três na metade direita davam três — um polegar só alcançava metade
   dos verbos do jogo.

   Isso pesa mais aqui do que pesaria em outro jogo, porque quem vai se
   reconhecer neste é justamente quem joga com uma mão na barra e o
   celular na outra. O esquema de duas mãos pedia à pessoa exatamente a
   mão que o assunto do jogo tira dela.

   Agora o papel vem do GESTO e não do lugar: arrastou, é manche; tocou e
   soltou sem arrastar, é agir; segurou parado, é agir segurando. Duas
   mãos continuam iguais — o segundo dedo vira o botão na hora, que é o
   caso do polegar esquerdo dirigindo e o direito agindo. */
function dividirTela() { return TOQUE_ATIVO; }
var TOQUE = {
  ativo: false, id: -1, ox: 0, oy: 0, x: 0, y: 0, dx: 0, dy: 0, arrastando: false, t0: 0
};
var TOQUE_DIR = { ativo: false, id: -1, x: 0, y: 0, t0: 0 };
var MANCHE = {
  zonaMorta: 10,   // menos que isso é dedo tremendo, não direção
  raio: 26,        // passou daqui, o manche desliza junto com o dedo
  espera: 120,     // parado por esse tempo vira "segurando pra agir"
  esperaAndando: 260,  // onde se anda, o dedo tem direito de hesitar antes
  diagonal: 0.45   // o eixo fraco precisa disso do forte pra também contar
};

function atualizaManche(agora) {
  TOUCH.up = TOUCH.down = TOUCH.left = TOUCH.right = TOUCH.act = false;

  // o dedo da direita é o botão: enquanto está encostado, está agindo
  if (TOQUE_DIR.ativo) TOUCH.act = true;

  if (!TOQUE.ativo) return;

  var dx = TOQUE.x - TOQUE.ox, dy = TOQUE.y - TOQUE.oy;
  var d = Math.sqrt(dx * dx + dy * dy);

  /* onde não há pra onde andar (título, resultado) o arrasto não vira
     direção nenhuma: lá o dedo encostado é só o botão de agir */
  if (!CONTROLES_VISIVEIS || d <= MANCHE.zonaMorta) {
    TOQUE.dx = TOQUE.dy = 0;
    /* Dedo parado age em qualquer tela. Era só onde não se anda, e por
       isso um polegar sozinho não conseguia SEGURAR nada: nem a barra no
       solavanco, nem o empurrão pra entrar no vagão.

       A espera é maior onde há pra onde andar: quem põe o dedo pra
       caminhar hesita antes de arrastar, e com 120ms essa hesitação
       viraria ação sem querer — na catraca isso custa dinheiro. Os 260
       são chute educado e precisam do polegar num aparelho de verdade.
       No título e no resultado seguem 120, que lá não se anda. */
    var esp = CONTROLES_VISIVEIS ? MANCHE.esperaAndando : MANCHE.espera;
    if (!TOQUE.arrastando && agora - TOQUE.t0 > esp) TOUCH.act = true;
    return;
  }

  TOQUE.arrastando = true;
  if (d > MANCHE.raio) {                       // o dedo puxa a base junto
    var k = (d - MANCHE.raio) / d;
    TOQUE.ox += dx * k; TOQUE.oy += dy * k;
    dx = TOQUE.x - TOQUE.ox; dy = TOQUE.y - TOQUE.oy;
  }
  var ax = Math.abs(dx), ay = Math.abs(dy), forte = Math.max(ax, ay);
  if (ax >= forte * MANCHE.diagonal) TOUCH[dx < 0 ? 'left' : 'right'] = true;
  if (ay >= forte * MANCHE.diagonal) TOUCH[dy < 0 ? 'up' : 'down'] = true;
  TOQUE.dx = dx; TOQUE.dy = dy;
}
/* O HUD e o direcional não servem em toda tela: no título não tem
   medidor pra mostrar, e no resultado o direcional não leva a lugar
   nenhum — lá o toque em qualquer lugar já é o Z. Esconder o que não
   serve devolve a altura da tela pro texto respirar. */
var HUD_VISIVEL = true;
var CONTROLES_VISIVEIS = true;

/* O comando de agir é o mesmo em toda parte — clique, toque ou espaço —
   mas o nome dele não: quem está no computador clica, quem está no
   celular toca. A dica na tela fala a língua do aparelho. */
/* Abaixo desta fração de descanso o jogo passa a dizer, em todo lugar,
   que a pessoa está caindo de sono: as pálpebras fecham, o medidor
   muda de cor e o rodapé manda sentar. */
var LIMIAR_SONO = 0.32;

/* ---------- o que o sono cobra, e o que NÃO cobra ----------
   As pálpebras fechando tapavam justamente a faixa da tela onde se
   joga: aviso que atrapalha mais do que a coisa avisada não é aviso,
   é castigo dobrado. Saíram, e ficou a moldura vermelha pulsando.

   Depois elas viraram dreno de coração, e isso foi pior: coração é a
   moeda mais cara do jogo e passou a evaporar sozinha, sem ninguém ter
   errado nada. Coração se perde ERRANDO — nos minigames — e chegando
   atrasado. O sono cobra no que sempre foi dele: descanso zerado é
   derrota por dormir, e o caminho até lá já é lento o bastante pra
   doer. Um eixo, uma cobrança. */

/* A cor do medidor de descanso, numa função só: o topo e a legenda da
   pausa precisam mostrar a mesma coisa, senão a legenda ensina uma cor
   que o HUD não usa. */
function corDescanso(pct, time) {
  if (pct > 0.55) return 0x00e676;
  if (pct > LIMIAR_SONO) return 0xf2c14e;
  return (Math.floor(time / 300) % 2 === 0) ? 0xff8a80 : 0xe8362c;
}

/* A faixa da tela que as pálpebras podem fechar. Cada cena estreita a
   sua no create() quando tem placa fixa em cima: dormir escurece o
   vagão, mas não pode esconder a hora de chegar nem a dica de como
   sair do sono — perder pra um relógio tapado não é dificuldade.

   O foco é onde as pálpebras se encontram: elas fecham em direção ao
   aviso do meio da tela, e não ao centro geométrico, senão a fresta
   sobra num lugar vazio e o recado fica embaixo do preto. */
var AREA_JOGO = { topo: 0, base: 0, foco: 0 };
function areaDeJogo(topo, base, foco) {
  AREA_JOGO.topo = topo || HUD_H;
  AREA_JOGO.base = base || (GH - 40);
  AREA_JOGO.foco = foco || Math.round((AREA_JOGO.topo + AREA_JOGO.base) / 2);
}

/* ---------- as três patentes do guardinha ----------
   No metrô de verdade o uniforme diz a patente, e quem anda de metrô
   aprende a ler isso sem pensar. Aqui vale a mesma coisa: a roupa
   avisa quanto custa ser pego, antes de custar.

   O tamanho acompanha: o grandão é desenhado maior, e o menorzinho
   menor. Ninguém precisa ler número nenhum pra saber qual é qual. */
var GUARDAS = {
  fraco: {
    chave: 'fraco', sprite: 'np_guardinha', escala: 0.88, custo: 0.5,
    nome: 'O GUARDINHA', vel: 1.15, cone: 0.85,
    fala: '"Ó o moço aí!"\nDeu bronca e liberou.'
  },
  medio: {
    chave: 'medio', sprite: 'np_guarda_medio', escala: 1, custo: 1,
    nome: 'O FISCAL', vel: 1, cone: 1,
    fala: '"Vem cá você."\nAnotou seu nome e te devolveu\npro fim do saguão.'
  },
  forte: {
    chave: 'forte', sprite: 'np_guarda_forte', escala: 1.25, custo: 2,
    nome: 'O SEGURANÇA', vel: 0.82, cone: 1.25,
    fala: '"Perdeu, playboy."\nEsse não passa a mão na cabeça\nde ninguém.'
  }
};

/* Quem está de plantão hoje. De madrugada sobra o menorzinho; no pico
   a estação chama o grandão, e a dificuldade puxa junto. */
function sorteiaGuarda() {
  /* O peso tem teto: sem ele, no décimo dia de pico o grandão aparecia
     em nove de cada dez partidas, e ser pego custa dois dos cinco
     corações — a catraca virava roleta-russa em vez de decisão. */
  var peso = Math.min(0.55, GameState.lotacao() * 0.45 + (GameState.dificuldade() - 1) * 0.10);
  var r = Math.random();
  if (r < 0.10 + peso * 0.6) return GUARDAS.forte;
  if (r < 0.55 + peso * 0.3) return GUARDAS.medio;
  return GUARDAS.fraco;
}

/* ---------- a muamba do ambulante ----------
   Ele vendia "alguma coisa": uma venda genérica, um número de dinheiro,
   e pronto. Ambulante de metrô não vende alguma coisa — ele vende bala
   de um real anunciando de ponta a ponta do vagão, e vende carregador
   de quinze com a caixa fechada e o olho na porta.

   É a diferença que faz o ofício ter decisão: bala vende sempre, paga
   pouco e o fiscal nem olha; carregador quase não vende, mas uma venda
   paga o dia inteiro — e é o que faz o fiscal vir atrás de você. Água
   entra no meio disso valendo o dobro no calor, que é quando o vagão
   inteiro está querendo. */
var MUAMBA = [
  { nome: 'BALA', grito: 'OLHA A BALA, UM REAL', preco: 1, chance: 0.85, risco: 8 },
  { nome: 'CHOCOLATE', grito: 'OLHA O CHOCOLATE, DOIS REAL', preco: 2, chance: 0.7, risco: 12 },
  { nome: 'PURURUCA', grito: 'PURURUCA, TRÊS REAL', preco: 3, chance: 0.55, risco: 14 },
  { nome: 'ÁGUA', grito: 'ÁGUA GELADA, TRÊS REAL', preco: 3, chance: 0.45, risco: 14, noCalor: 2.1 },
  { nome: 'FONE', grito: 'FONE DE OUVIDO, DEZ', preco: 10, chance: 0.22, risco: 30 },
  { nome: 'CARREGADOR', grito: 'CARREGADOR, QUINZE', preco: 15, chance: 0.14, risco: 38 }
];

/* O que ele tira da caixa agora. Não é sorteio puro: o que o vagão quer
   depende da hora e de quanta gente tem. No calor a água sobe na mão
   dele; no vagão cheio a bala e o chocolate saem sozinhos, e é quando
   vale insistir no barato. */
function tiraDaMuamba() {
  var calor = estaCalor(), lot = GameState.lotacao(), pesos = [], total = 0, i;
  for (i = 0; i < MUAMBA.length; i++) {
    var m = MUAMBA[i], w = m.chance;
    if (m.noCalor && calor) w *= m.noCalor;
    // vagão cheio é freguês, mas freguês de coisa barata
    if (m.preco <= 3) w *= (0.7 + lot * 0.8);
    pesos.push(w); total += w;
  }
  var r = Math.random() * total;
  for (i = 0; i < pesos.length; i++) { r -= pesos[i]; if (r <= 0) return MUAMBA[i]; }
  return MUAMBA[0];
}

function nomeAgir() { return TOQUE_ATIVO ? 'TOQUE' : 'CLIQUE'; }

/* o verbo que só este personagem tem */
function temPoder(p) { return !!GameState.char && GameState.char.poder === p; }

/* ---------- a METRODEX ----------
   'Tem que ter meio que uma pokedex dos personagens pra entender sobre
   eles.' Cada gente do jogo tem uma ficha: quem ainda não passou perto de
   você é uma silhueta com ???; quem já passou mostra o nome e o que faz;
   e o desafiante que você venceu mostra também a fraqueza. Fica gravado
   entre as partidas (metrosp_dex): 1 é visto, 2 é vencido. */
/* ---------- o nível ----------
   'Acho que cabe evolução de nível.' Cada personagem tem o seu XP,
   guardado entre as partidas (metrosp_xp): ganhar um duelo rende mais
   quanto mais alto o nível de quem você venceu. A cada 40 de XP, um
   nível (até o 30). Nível dá paciência e força no duelo (desafio.js), e
   é ele que decide quando dá pra fugir. */
function leXp() {
  try { return JSON.parse(localStorage.getItem('metrosp_xp') || '{}') || {}; } catch (e) { return {}; }
}
function nivelDoXp(x) { return Math.min(30, 1 + Math.floor((x || 0) / 40)); }
function meuNivel() { return nivelDoXp(leXp()[GameState.charKey]); }
// soma o XP e devolve o nível novo quando subiu (0 quando não)
function ganhaXp(n) {
  var d = leXp(), k = GameState.charKey, antes = nivelDoXp(d[k]);
  d[k] = (d[k] || 0) + n;
  try { localStorage.setItem('metrosp_xp', JSON.stringify(d)); } catch (e) { }
  var depois = nivelDoXp(d[k]);
  return depois > antes ? depois : 0;
}
/* Quantas estações da Liberdade (na Azul), ou -1 fora do alcance dos
   cosplayers: 'ficam na Liberdade e até mais 4 estações pra cima ou pra
   baixo na linha azul'. */
function pertoDaLiberdade() {
  if (typeof GameState === 'undefined' || !GameState.char || GameState.linha !== 'azul') return -1;
  var d = Math.abs(GameState.idx - LINHAS.azul.estacoes.indexOf('LIBERDADE'));
  return d <= 4 ? d : -1;
}

var COSPLAYERS = ['np_cos_marinheira', 'np_cos_akatsuki', 'np_cos_naruto', 'np_cos_sasuke', 'np_cos_sakura'];
var DEX = [
  { id: 'tiozao', nome: 'TIOZÃO DO ZAP', sprite: 'np_tiozao', desafio: true, tipo: 'CHATO', onde: 'VAGÃO', desc: 'Manda áudio de 5 minutos. Quer conversar.' },
  { id: 'pregador', nome: 'PREGADOR', sprite: 'np_pregador', desafio: true, tipo: 'CHATO', onde: 'VAGÃO', desc: 'Tem um minutinho? Nunca é um minutinho.' },
  { id: 'corintiano', nome: 'CORINTIANO', sprite: 'np_corintiano', desafio: true, tipo: 'TORCIDA', onde: 'LESTE', desc: 'Da Sé pra Itaquera. Aqui é Corinthians.' },
  { id: 'palmeirense', nome: 'PALMEIRENSE', sprite: 'np_torcedor', desafio: true, tipo: 'TORCIDA', onde: 'OESTE', desc: 'Da Sé pra Barra Funda. Fala meio italiano.' },
  { id: 'saopaulino', nome: 'SÃO-PAULINO', sprite: 'np_saopaulino', desafio: true, tipo: 'TORCIDA', onde: 'CIDADE', desc: 'Soberano. Lembra três mundiais sem ninguém pedir.' },
  { id: 'santista', nome: 'SANTISTA', sprite: 'np_santista', desafio: true, tipo: 'TORCIDA', onde: 'CIDADE', desc: 'Moicano de 2010. O Peixe vai voltar.' },
  { id: 'barra', nome: 'QUER A BARRA', sprite: 'np_pax0', desafio: true, tipo: 'CHATO', onde: 'NA BARRA', desc: 'Aparece quando você segura a barra demais.' },
  { id: 'guardinha', nome: 'GUARDINHA', sprite: 'np_guardinha', desafio: true, tipo: 'GUARDA', onde: 'CATRACA', pega: 'MEIA VIDA', desc: 'Vigia a catraca. Pego no pulo, meio coração.' },
  { id: 'guardaMedio', nome: 'SEGURANÇA', sprite: 'np_guarda_medio', desafio: true, tipo: 'GUARDA', onde: 'CATRACA', pega: '1 VIDA', desc: 'O do meio. Pego no pulo, um coração.' },
  { id: 'guardaForte', nome: 'O GRANDÃO', sprite: 'np_guarda_forte', desafio: true, tipo: 'GUARDA', onde: 'CATRACA', pega: '2 VIDAS', desc: 'Todo de preto. Pego no pulo, dois corações.' },
  { id: 'ambulante', nome: 'AMBULANTE', sprite: 'np_ambulante_a', desafio: true, tipo: 'VENDEDOR', onde: 'VAGÃO', desc: 'Metrô, shopping, trem! Vende no vagão.' },
  { id: 'rimador', nome: 'RIMADOR', sprite: 'np_rimador', tipo: 'RIMADOR', onde: 'VAGÃO', desc: 'Chega no boom bap. Batalha de rima no vagão.' },
  { id: 'pedinte', nome: 'PEDINTE', sprite: 'np_pedinte', tipo: 'GENTE', onde: 'SAGUÃO', desc: 'Fica no saguão. Uma moeda muda o dia dele.' },
  { id: 'atendente', nome: 'ATENDENTE', sprite: 'np_atendente', tipo: 'METRÔ', onde: 'GUICHÊ', desc: 'Na bilheteria. Vende a passagem.' },
  { id: 'gestante', nome: 'GESTANTE', sprite: 'np_gestante', tipo: 'PRIORIDADE', onde: 'BANCO', desc: 'Tem prioridade no banco. Ceda o lugar.' },
  { id: 'idoso', nome: 'IDOSO', sprite: 'np_idoso', tipo: 'PRIORIDADE', onde: 'BANCO', desc: 'Tem prioridade no banco. Ceda o lugar.' },
  // os cinco cosplayers, cada um com o seu jeito de ser derrotado
  { id: 'cosLaranja', nome: 'COSPLAY LARANJA', sprite: 'np_cos_naruto', desafio: true, tipo: 'COSPLAY', onde: 'LIBERDADE', desc: 'Macacão laranja e bandana. Não desiste nunca.' },
  { id: 'cosVingador', nome: 'COSPLAY VINGADOR', sprite: 'np_cos_sasuke', desafio: true, tipo: 'COSPLAY', onde: 'LIBERDADE', desc: 'Quimono branco, cara fechada. Só responde hmph.' },
  { id: 'cosNuvem', nome: 'ACATSUQUI', sprite: 'np_cos_akatsuki', desafio: true, tipo: 'COSPLAY', onde: 'LIBERDADE', desc: 'Capa preta de nuvens vermelhas. O mais forte do evento.' },
  { id: 'cosRosa', nome: 'COSPLAY ROSA', sprite: 'np_cos_sakura', desafio: true, tipo: 'COSPLAY', onde: 'LIBERDADE', desc: 'Cabelo rosa e soco que racha o chão.' },
  { id: 'cosColegial', nome: 'COLEGIAL', sprite: 'np_cos_marinheira', desafio: true, tipo: 'COSPLAY', onde: 'LIBERDADE', desc: 'Uniforme de marinheira. Kawaii, mas brava.' }
];
// a cor de cada tipo: a da bolinha e a da borda da carta
var COR_TIPO = {
  CHATO: 0xf2c14e, TORCIDA: 0x00e676, GUARDA: 0x3a7fd0, VENDEDOR: 0xe8a33c,
  RIMADOR: 0xa47cff, GENTE: 0xb8bccc, 'METRÔ': 0x4fb8ff, PRIORIDADE: 0x7fd6a0, COSPLAY: 0xf08ab8
};
/* Onde cada um costuma aparecer ('coloca em qual estação, pra toda a
   METRODEX'): é o que o jogo faz de verdade, e não enfeite. */
var DEX_APARECE = {
  tiozao: 'QUALQUER VAGÃO', pregador: 'QUALQUER VAGÃO',
  corintiano: 'DA SÉ ATÉ ITAQUERA', palmeirense: 'DA SÉ ATÉ BARRA FUNDA',
  saopaulino: 'TODA A REDE, MENOS ITAQUERA', santista: 'TODA A REDE, MENOS ITAQUERA',
  barra: 'VAGÃO CHEIO, SEGURANDO', guardinha: 'CATRACA DE TODAS', guardaMedio: 'CATRACA DE TODAS',
  guardaForte: 'CATRACA DE TODAS', ambulante: 'PLATAFORMA E VAGÃO', rimador: 'VAGÃO',
  pedinte: 'SAGUÃO DE TODAS', atendente: 'BILHETERIA DE TODAS', gestante: 'BANCO DO VAGÃO', idoso: 'BANCO DO VAGÃO',
  cosLaranja: 'DA ANA ROSA ATÉ TIRADENTES', cosVingador: 'DA ANA ROSA ATÉ TIRADENTES', cosNuvem: 'DA ANA ROSA ATÉ TIRADENTES',
  cosRosa: 'DA ANA ROSA ATÉ TIRADENTES', cosColegial: 'DA ANA ROSA ATÉ TIRADENTES'
};
for (var dxa = 0; dxa < DEX.length; dxa++) DEX[dxa].aparece = DEX_APARECE[DEX[dxa].id] || DEX[dxa].onde;
var DEX_POR_SPRITE = {};
for (var dxi = 0; dxi < DEX.length; dxi++) DEX_POR_SPRITE[DEX[dxi].sprite] = DEX[dxi].id;
DEX_POR_SPRITE.np_pedinte_b = 'pedinte';
DEX_POR_SPRITE.np_atendenteF = 'atendente';
function leDex() {
  try { return JSON.parse(localStorage.getItem('metrosp_dex') || '{}') || {}; } catch (e) { return {}; }
}
function marcaDex(id, nivel) {
  var d = leDex();
  if ((d[id] || 0) >= nivel) return;
  d[id] = nivel;
  try { localStorage.setItem('metrosp_dex', JSON.stringify(d)); } catch (e) { }
}
/* Quem passou a menos de 140px de você entra na METRODEX como visto.
   Conferido duas vezes por segundo, só com quem está na lista de gente. */
function vigiaDex(cena, time) {
  if (!cena.pl || !cena.pl.sp || (cena._tDex && time - cena._tDex < 500)) return;
  cena._tDex = time;
  var lista = [].concat(cena.gente || [], cena.ambulante ? [cena.ambulante] : [], cena.desafiantes || []);
  var px = cena.pl.sp.x, py = cena.pl.sp.y;
  for (var i = 0; i < lista.length; i++) {
    var a = lista[i];
    if (!a || !a.sp || !a.sp.active || !a.sp.texture) continue;
    var id = DEX_POR_SPRITE[a.sp.texture.key];
    if (a.desafio && a.desafio.tipo && a.desafio.tipo !== 'barra') id = a.desafio.tipo;
    if (!id) continue;
    if (Math.abs(a.sp.x - px) < 140 && Math.abs(a.sp.y - py) < 140) marcaDex(id, 1);
  }
}

/* ---------- o lixo na mão ----------
   Quem comeu fica com o papel na mão (GameState.lixo) até achar uma
   lixeira: um papelzinho amassado do lado do boneco, e o rodapé lembra
   quando não tem nada mais importante pra dizer. */
function mostraLixoNaMao(cena, pl) {
  if (!cena._gLixoMao) cena._gLixoMao = cena.add.graphics().setDepth(70);
  var g = cena._gLixoMao; g.clear();
  if (!GameState.lixo || !pl || !pl.sp || !pl.sp.visible) return;
  var x = Math.round(pl.sp.x + (pl.sp.flipX ? -10 : 10)), y = Math.round(pl.sp.y - 18);
  g.fillStyle(0x0a0a12, 1).fillRect(x - 3, y - 3, 7, 6);
  g.fillStyle(0xe8e4d8, 1).fillRect(x - 2, y - 2, 5, 4);
  g.fillStyle(0xe8362c, 1).fillRect(x - 1, y - 1, 2, 1);
}

/* ---------- o coração quebrado ----------
   Perder uma vida acontecia só no alto do HUD: o quinto ícone apagava,
   a nove pixels de altura, longe de onde a pessoa está olhando — que é
   o boneco. Agora a perda sai de cima da cabeça dele: o mesmo coração
   do HUD parte no meio, as duas metades giram pros lados, sobem e
   somem. Quem viu, entendeu, sem precisar conferir o placar.

   As duas listas são o mesmo desenho do HUD cortado na coluna do meio:
   cada retângulo é [x, y, largura, altura] em coordenada local. */
var METADES_CORACAO = [
  [[0, 1, 3, 5], [1, 0, 4, 4], [1, 5, 4, 2], [2, 7, 3, 1], [3, 8, 2, 1]],
  [[1, 1, 3, 5], [0, 0, 3, 4], [0, 5, 3, 2], [0, 7, 2, 1], [0, 8, 1, 1]]
];

function coracaoQuebrado(scene, x, y, quanto) {
  if (!scene || !scene.add || !scene.tweens) return;
  /* Dois corações partindo quando o grandão pega: o número no HUD cai
     dois, e o desenho precisa dizer a mesma coisa. */
  var vezes = (quanto || 1) >= 2 ? 2 : 1;
  for (var v = 0; v < vezes; v++) desenhaCoracaoQuebrado(scene, x + (vezes > 1 ? (v ? 14 : -14) : 0), y);
}

function desenhaCoracaoQuebrado(scene, x, y) {
  for (var m = 0; m < 2; m++) {
    var lado = m ? 1 : -1;
    var g = scene.add.graphics().setDepth(940);
    g.setScale(3);
    g.x = Math.round(x) + (m ? 2 : -14);
    g.y = Math.round(y) - 14;
    var r = METADES_CORACAO[m], i;
    // o contorno escuro primeiro: sem ele o vermelho some no vagão
    g.fillStyle(0x08080e, 1);
    for (i = 0; i < r.length; i++) g.fillRect(r[i][0] - 1, r[i][1] - 1, r[i][2] + 2, r[i][3] + 2);
    g.fillStyle(0xe8362c, 1);
    for (i = 0; i < r.length; i++) g.fillRect(r[i][0], r[i][1], r[i][2], r[i][3]);
    g.fillStyle(0xff8a80, 1).fillRect(m ? 0 : 1, 0, 2, 2);
    /* pouco giro de propósito: a 55 graus o coração de nove pixels
       vira borrão vermelho e ninguém reconhece o desenho */
    scene.tweens.add({
      targets: g, duration: 900, ease: 'Quad.easeOut', delay: 90,
      x: g.x + lado * 17, y: g.y - 30, angle: lado * 22
    });
    /* o sumiço vai num tween separado: junto com o voo, o Quad.easeOut
       apagava o coração nos primeiros trezentos milissegundos e a
       metade do tempo de tela era um fantasma */
    scene.tweens.add({
      targets: g, duration: 320, delay: 680, alpha: 0,
      onComplete: function (tw, alvos) { alvos[0].destroy(); }
    });
  }
}

/* Todo lugar que tira um coração passa por aqui: a perda é a coisa
   mais importante que acontece com o jogador e não podia depender de
   cada minigame lembrar de mostrar. */
/* ---------- devolver as cenas sem devolver o toque ----------
   Um duelo pausa quem está por baixo e, no fim, devolve. Devolver na
   hora deixava o MESMO toque que fechou o duelo chegar à cena de baixo:
   medido no treino, tocar o "PRA SEGUIR" da encarada fechava a encarada
   e abria a PULAR A CATRACA, que era o item da lista sob o dedo. No
   vagão, o mesmo toque vira um passo ou um "agir" que ninguém pediu.
   Então a cena volta a rodar já, mas surda ao toque até o dedo sair da
   tela, e nunca antes de 120ms. O HUD não entra: ele nunca é pausado. */
function devolveCenas(cena, lista) {
  var ms = cena.scene.manager, i, s;
  for (i = 0; i < lista.length; i++) {
    ms.resume(lista[i]);
    s = ms.getScene(lista[i]);
    if (s && s.input) s.input.enabled = false;
  }
  var libera = function () {
    for (var j = 0; j < lista.length; j++) {
      var c = ms.getScene(lista[j]);
      if (c && c.input) c.input.enabled = true;
    }
  };
  var hud = ms.getScene('Hud');
  if (!hud || !hud.time) { libera(); return; }
  var espera = function () {
    var dedo = hud.input.activePointer && hud.input.activePointer.isDown;
    if (dedo || TOQUE.ativo || TOQUE_DIR.ativo) hud.time.delayedCall(60, espera);
    else libera();
  };
  hud.time.delayedCall(120, espera);
}

/* ---------- abrir caminho no braço ----------
   Tocar várias vezes seguidas (três toques em 0,9s) empurra quem está
   colado em você: todo mundo num raio de 44px é afastado 16px, na
   direção contrária à sua. É o que se faz no vagão lotado — e custa:
   carisma, e de vez em quando alguém reclama em voz alta. `limita(sp)`
   é a regra de chão de cada cena (ninguém atravessa parede no empurrão).
   Devolve true quando empurrou. */
var EMPURRA_TOQUES = 3, EMPURRA_JANELA = 900, EMPURRA_RAIO = 44, EMPURRA_PASSO = 16;
function empurraoNaMarra(cena, gente, limita) {
  if (!Ctrl.actJust) return false;
  var agora = cena.time.now;
  cena._toques = (cena._toques || []).filter(function (t) { return agora - t < EMPURRA_JANELA; });
  cena._toques.push(agora);
  if (cena._toques.length < EMPURRA_TOQUES) return false;
  cena._toques = [];
  var px = cena.pl.sp.x, py = cena.pl.sp.y, n = 0;
  for (var i = 0; i < gente.length; i++) {
    var a = gente[i];
    if (!a || !a.sp || !a.sp.active || a.fixo || a.sp.naEscada) continue;
    var dx = a.sp.x - px, dy = a.sp.y - py, d = Math.sqrt(dx * dx + dy * dy);
    if (d > EMPURRA_RAIO) continue;
    if (d < 1) { dx = 1; dy = 0; d = 1; }
    var ax = a.sp.x, ay = a.sp.y;
    a.sp.x += dx / d * EMPURRA_PASSO; a.sp.y += dy / d * EMPURRA_PASSO;
    if (limita && limita(a.sp) === false) { a.sp.x = ax; a.sp.y = ay; }
    n++;
  }
  if (!n) return false;
  sfx('empurra');
  cena.cameras.main.shake(90, 0.004);
  GameState.addCarisma(-1);
  if (Math.random() < 0.35) falaGente(['Ei!', 'Calma aí!', 'Tá empurrando por quê?', 'Ô, devagar!'][Math.floor(Math.random() * 4)], 1.2);
  return true;
}

/* ---------- as lojas, de frente ----------
   Um quiosque é sempre a mesma peça: letreiro em cima, a parede de dentro
   (o que muda de loja pra loja), o atendente, e o balcão na frente com o
   produto à mostra. O estilo diz as cores, a parede e o produto. */
var ESTILO_LOJA = {
  dog: { nome: 'DOG DO CÃO', cor: 0xe8362c, fundo: 0x2a2320, parede: 'geladeira', balcao: 0xe8b21e, produto: 'dog', letra: '#f2c14e', emblema: 0xe8762c, ven: 'np_ambulante_c' },
  banca: { nome: 'BANCA', cor: 0xf2f0ff, fundo: 0x1f3a2a, parede: 'revistas', balcao: 0x2c5a3c, produto: 'revista', letra: '#f2f0ff', ven: 'np_ambulante_b' },
  cafe: { nome: 'CAFÉ', cor: 0xc8752a, fundo: 0x2a1e16, parede: 'maquina', balcao: 0x6b4226, produto: 'xicara', letra: '#f2c14e', ven: 'np_pax5' },
  doceria: { nome: 'DOCERIA', cor: 0xe28cc0, fundo: 0x2a1c26, parede: 'vitrine', balcao: 0xc85a9a, produto: 'bolo', letra: '#f2f0ff', ven: 'np_pax3' },
  padaria: { nome: 'PADARIA', cor: 0xe8a33c, fundo: 0x2a2418, parede: 'paes', balcao: 0xb07a3a, produto: 'pao', letra: '#f2c14e', ven: 'np_pax4' },
  agua: { nome: 'ÁGUA E SUCO', cor: 0x3a7fd0, fundo: 0x16223a, parede: 'geladeira', balcao: 0x2f6fb8, produto: 'garrafa', letra: '#f2f0ff', ven: 'np_pax0' },
  salgados: { nome: 'SALGADOS', cor: 0xe8a33c, fundo: 0x2a2418, parede: 'estufa', balcao: 0xc0392b, produto: 'coxinha', letra: '#f2c14e', ven: 'np_pax2' },
  celular: { nome: 'ACESSÓRIOS', cor: 0x7c3fff, fundo: 0x1a1a2a, parede: 'capinhas', balcao: 0x2a2a3a, produto: 'fone', letra: '#f2f0ff', ven: 'np_pax11' },
  recarga: { nome: 'RECARGA BU', cor: 0x1c6fd0, fundo: 0x16223a, parede: 'cartoes', balcao: 0x1c4a8a, produto: 'cartao', letra: '#f2f0ff', ven: 'np_pax1' },
  // nomes de paródia, que é o que o jogo faz com marca: O BOTICARO (de caro) e LOTODIFÍCIL
  boticario: { nome: 'O BOTICARO', cor: 0x2f7d5e, fundo: 0x14281e, parede: 'frascos', balcao: 0x1f5a40, produto: 'frasco', letra: '#f2f0ff', ven: 'np_pax10' },
  loterica: { nome: 'LOTODIFÍCIL', cor: 0xf2c14e, fundo: 0x14284a, parede: 'bilhetes', balcao: 0x1c4a8a, produto: 'bilhete', letra: '#f2c14e', ven: 'np_pax9' },
  /* as cabines do mezanino: a bilheteria (duas, cada uma com o seu
     atendente) e o achados e perdidos, no mesmo molde das lojas */
  bilheteria: { nome: 'BILHETERIA', cor: 0x1c5ab4, fundo: 0x2a3550, parede: 'guiche', balcao: 0x6a7080, produto: 'bilhete', letra: '#f2f0ff', ven: 'np_atendente' },
  achados: { nome: 'ACHADOS', cor: 0xe8a33c, fundo: 0x2a2418, parede: 'achados', balcao: 0x6b4226, produto: 'caixa', letra: '#f2c14e', ven: 'np_atendente' },
  // o caixa eletrônico: máquina, sem balcão e sem ninguém atrás
  atm: { nome: 'CAIXA 24H', letreiro: '24H', cor: 0xe8362c, fundo: 0x3a3a44, parede: 'atm', maquina: true, letra: '#f2f0ff' }
};

function pintaFundoDaLoja(g, b) {
  var e = ESTILO_LOJA[b.chave] || ESTILO_LOJA.banca, x = b.x, y = b.y, w = b.w, h = b.h, k, r;
  g.fillStyle(0x000000, 0.35).fillRect(x + 4, y + 6, w, h);
  g.fillStyle(e.fundo, 1).fillRect(x, y, w, h);
  g.fillStyle(0x14141a, 1).fillRect(x + 3, y + 12, w - 6, h - 30);
  var py = y + 14, ph = h - 34;
  if (e.maquina) {
    // o caixa eletrônico: gabinete cinza, tela azul, teclado e a boca do dinheiro
    g.fillStyle(0x6a6c78, 1).fillRect(x + 3, y + 12, w - 6, h - 14);
    g.fillStyle(0x1c3a6a, 1).fillRect(x + 7, y + 16, w - 14, 14);
    g.fillStyle(0x6aa0e0, 1).fillRect(x + 9, y + 18, w - 18, 2);
    g.fillStyle(0x2a2a32, 1).fillRect(x + 8, y + 34, w - 16, 10);
    g.fillStyle(0xd8d8e8, 1);
    for (k = 0; k < 3; k++) for (r = 0; r < 2; r++) g.fillRect(x + 10 + k * 6, y + 35 + r * 4, 4, 3);
    g.fillStyle(0x0a0a10, 1).fillRect(x + 8, y + 48, w - 16, 3);
    g.fillStyle(0xf2c14e, 0.1).fillRect(x - 2, y + h, w + 4, 14);
    return;
  }
  if (e.parede === 'guiche') {
    // o vidro do guichê, o painel da tarifa e a maquininha do cartão
    g.fillStyle(0x9ec4dc, 0.35).fillRect(x + 5, py, w - 10, ph);
    g.fillStyle(0xffffff, 0.3).fillRect(x + 7, py + 2, 2, ph - 4);
    g.fillStyle(0x0a0a10, 1).fillRect(x + w - 22, py + 2, 16, 9);
    g.fillStyle(0xf2c14e, 1).fillRect(x + w - 20, py + 4, 12, 2).fillRect(x + w - 20, py + 7, 8, 2);
    g.fillStyle(0x1c5ab4, 1).fillRect(x + 8, py + 2, 12, 5);
  } else if (e.parede === 'achados') {
    // prateleiras com o que ninguém veio buscar: guarda-chuva, bolsa, caixa, mochila, boné
    g.fillStyle(0x5a3f22, 1).fillRect(x + 4, py + 8, w - 8, 2).fillRect(x + 4, py + 18, w - 8, 2);
    var coisas = [[0xe8362c, 8, 5], [0x3a7fd0, 9, 6], [0xf2c14e, 7, 5], [0x7fd6a0, 10, 6], [0xd05a8a, 8, 5], [0xf2f0ff, 9, 5]];
    for (k = 0; k < coisas.length; k++) {
      var cx0 = x + 6 + (k % 3) * Math.floor((w - 12) / 3), cy0 = py + (k < 3 ? 2 : 12);
      g.fillStyle(coisas[k][0], 1).fillRect(cx0, cy0 + 6 - coisas[k][2], coisas[k][1], coisas[k][2]);
    }
    g.lineStyle(1, 0x14141a, 1).lineBetween(x + w - 10, py + 2, x + w - 14, py + 18);   // o guarda-chuva encostado
  } else if (e.parede === 'estufa') {
    // a estufa de vidro com as coxinhas e os pães de queijo
    g.fillStyle(0x9ec4dc, 0.6).fillRect(x + 6, py, w - 12, ph);
    for (r = 0; r < 2; r++) for (k = 0; k < Math.floor((w - 18) / 10); k++) {
      g.fillStyle(r ? 0xe8b85a : 0xd8943a, 1).fillRect(x + 10 + k * 10, py + 3 + r * 9, 6, 6);
    }
    g.fillStyle(0xffffff, 0.35).fillRect(x + 7, py, 2, ph);
  } else if (e.parede === 'capinhas') {
    // a parede de capinhas penduradas, e os fones em cima
    var cc = [0x7c3fff, 0xe8362c, 0x00e676, 0xf2c14e, 0x3a7fd0, 0xe28cc0, 0xf2f0ff];
    for (r = 0; r < 2; r++) for (k = 0; k < Math.floor((w - 12) / 7); k++) {
      g.fillStyle(cc[(k + r * 3) % cc.length], 1).fillRect(x + 6 + k * 7, py + 8 + r * 10, 5, 8);
    }
    g.fillStyle(0xf2f0ff, 1);
    for (k = 0; k < Math.floor((w - 12) / 16); k++) g.fillRect(x + 8 + k * 16, py + 1, 8, 2).fillRect(x + 8 + k * 16, py + 3, 2, 3).fillRect(x + 14 + k * 16, py + 3, 2, 3);
  } else if (e.parede === 'cartoes') {
    // o cartaz do Bilhete Único e a maquininha
    g.fillStyle(0x1c6fd0, 1).fillRect(x + 8, py, 30, ph);
    g.fillStyle(0xf2f0ff, 1).fillRect(x + 12, py + 4, 22, 3).fillRect(x + 12, py + 10, 16, 2);
    g.fillStyle(0xe8762c, 1).fillRect(x + 12, py + 16, 10, 5);
    g.fillStyle(0x9a9ca4, 1).fillRect(x + w - 26, py + 4, 20, 18);
    g.fillStyle(0x00e676, 1).fillRect(x + w - 22, py + 7, 12, 5);
  } else if (e.parede === 'frascos') {
    // prateleiras verdes com os frascos
    for (r = 0; r < 2; r++) {
      g.fillStyle(0x1f5a40, 1).fillRect(x + 5, py + 9 + r * 11, w - 10, 2);
      for (k = 0; k < Math.floor((w - 14) / 8); k++) {
        g.fillStyle(k % 3 ? 0x9ec4dc : 0xe8c96a, 1).fillRect(x + 8 + k * 8, py + 2 + r * 11, 5, 7);
        g.fillStyle(0x2f7d5e, 1).fillRect(x + 9 + k * 8, py + 1 + r * 11, 3, 2);
      }
    }
  } else if (e.parede === 'bilhetes') {
    // o painel azul e amarelo da lotérica, com o número do prêmio
    g.fillStyle(0x1c4a8a, 1).fillRect(x + 6, py, w - 12, ph);
    g.fillStyle(0xf2c14e, 1).fillRect(x + 6, py, w - 12, 5);
    g.fillStyle(0x0a0a10, 1).fillRect(x + 14, py + 9, w - 28, 10);
    g.fillStyle(0x00e676, 1);
    for (k = 0; k < Math.floor((w - 32) / 7); k++) g.fillRect(x + 17 + k * 7, py + 11, 4, 6);
  } else if (e.parede === 'geladeira') {
    for (k = 0; k < 2; k++) {
      var fx = k ? x + w - 21 : x + 5;
      g.fillStyle(0x9ec4dc, 1).fillRect(fx, py, 16, ph);
      g.fillStyle(b.chave === 'agua' ? 0x3a7fd0 : 0xe8362c, 1);
      for (r = 0; r < 3; r++) g.fillRect(fx + 2, py + 3 + r * 8, 12, 4);
      g.fillStyle(0xffffff, 0.4).fillRect(fx + 1, py, 2, ph);
    }
    g.fillStyle(0x0a0a10, 1).fillRect(x + 24, py, w - 48, 14);
    g.fillStyle(0xf2f0ff, 0.7);
    for (r = 0; r < 3; r++) g.fillRect(x + 27, py + 3 + r * 4, w - 54, 1);
  } else if (e.parede === 'revistas') {
    var capas = [0xe8362c, 0xf2c14e, 0x3a7fd0, 0xd05a8a, 0x6ac06a, 0xf2f0ff];
    for (r = 0; r < 3; r++) for (k = 0; k < Math.floor((w - 8) / 10); k++) {
      g.fillStyle(capas[(k + r * 2) % capas.length], 1).fillRect(x + 5 + k * 10, py + r * 9, 8, 7);
    }
  } else if (e.parede === 'maquina') {
    // a máquina de café, prateada, e as xícaras na prateleira
    g.fillStyle(0x9a9ca4, 1).fillRect(x + 8, py, 26, ph);
    g.fillStyle(0x3a3a44, 1).fillRect(x + 12, py + 4, 18, 6);
    g.fillStyle(0xc8752a, 1).fillRect(x + 14, py + 12, 4, 4).fillRect(x + 24, py + 12, 4, 4);
    g.fillStyle(0xf2f0ff, 1);
    for (k = 0; k < 4; k++) g.fillRect(x + 42 + k * 8, py + 4, 6, 5);
    g.fillStyle(0x6b4226, 1).fillRect(x + 40, py + 10, w - 46, 2);
  } else if (e.parede === 'vitrine') {
    // a vitrine de bolos
    g.fillStyle(0x9ec4dc, 0.7).fillRect(x + 6, py, w - 12, ph);
    var bolos = [0xf2f0ff, 0x7a3a1c, 0xe28cc0, 0xf2c14e];
    for (k = 0; k < 4; k++) {
      g.fillStyle(bolos[k], 1).fillCircle(x + 16 + k * 15, py + 7, 5);
      g.fillStyle(0xe8362c, 1).fillRect(x + 15 + k * 15, py + 2, 2, 2);
    }
  } else {
    // pães nas prateleiras
    for (r = 0; r < 2; r++) {
      g.fillStyle(0x5a3f22, 1).fillRect(x + 6, py + 5 + r * 10, w - 12, 2);
      for (k = 0; k < 6; k++) g.fillStyle(0xd99a4e, 1).fillEllipse(x + 12 + k * 11, py + 3 + r * 10, 9, 5);
    }
  }
  g.fillStyle(0xf2c14e, 0.1).fillRect(x - 4, y + h, w + 8, 20);          // a luz no chão da frente
}

function montaFrenteDaLoja(cena, b) {
  var e = ESTILO_LOJA[b.chave] || ESTILO_LOJA.banca, x = b.x, y = b.y, w = b.w, h = b.h, k;
  if (e.maquina) {
    // máquina não tem atendente nem balcão: só o letreiro vermelho em cima
    var gm = cena.add.graphics().setDepth(41);
    gm.fillStyle(e.cor, 1).fillRect(x - 2, y - 8, w + 4, 18);
    gm.fillStyle(0xf2c14e, 1).fillRect(x - 2, y + 8, w + 4, 2);
    txtC(cena, x + w / 2, y - 4, e.letreiro || e.nome, e.letra, 8).setScale(ESCALA_TEXTO / 2).setDepth(42);
    return;
  }
  // o atendente, de frente, com as pernas atrás do balcão
  var ven = new Ator(cena, x + w / 2, y + h - 4, b.ven || e.ven);
  ven.dir = 'down'; ven.anima(0, false); ven.sp.setDepth(39);
  // o balcão
  var gb = cena.add.graphics().setDepth(40), by = y + h - 20;
  gb.fillStyle(0x9a9ca4, 1).fillRect(x - 2, by, w + 4, 4);
  gb.fillStyle(e.balcao, 1).fillRect(x, by + 4, w, 16);
  gb.fillStyle(0x000000, 0.25).fillRect(x, by + 17, w, 3);
  for (k = 0; k < 2; k++) {
    var hx = x + 12 + k * (w - 40), hy = by + 11;
    if (e.produto === 'dog') {
      gb.fillStyle(0xd99a4e, 1).fillEllipse(hx + 8, hy + 1, 18, 8);
      gb.fillStyle(0xa8401c, 1).fillEllipse(hx + 8, hy, 16, 4);
      gb.fillStyle(0xf2c14e, 1).fillRect(hx + 2, hy - 1, 12, 1);
    } else if (e.produto === 'revista') {
      gb.fillStyle(0xf2f0ff, 1).fillRect(hx + 2, hy - 4, 10, 8);
      gb.fillStyle(0xe8362c, 1).fillRect(hx + 4, hy - 2, 6, 2);
    } else if (e.produto === 'xicara') {
      gb.fillStyle(0xf2f0ff, 1).fillRect(hx + 3, hy - 3, 9, 7).fillRect(hx + 12, hy - 1, 2, 3);
      gb.fillStyle(0x6b4226, 1).fillRect(hx + 4, hy - 3, 7, 2);
    } else if (e.produto === 'bolo') {
      gb.fillStyle(0xf2f0ff, 1).fillRect(hx + 2, hy - 2, 12, 6);
      gb.fillStyle(0xe28cc0, 1).fillRect(hx + 2, hy - 4, 12, 2);
    } else if (e.produto === 'coxinha') {
      gb.fillStyle(0xd8943a, 1).fillRect(hx + 4, hy - 4, 6, 3).fillRect(hx + 2, hy - 1, 10, 5);
      gb.fillStyle(0xe8b85a, 1).fillRect(hx + 12, hy - 1, 5, 5);
    } else if (e.produto === 'fone') {
      gb.fillStyle(0xf2f0ff, 1).fillRect(hx + 3, hy - 4, 10, 2).fillRect(hx + 2, hy - 2, 3, 5).fillRect(hx + 11, hy - 2, 3, 5);
    } else if (e.produto === 'cartao') {
      gb.fillStyle(0x1c6fd0, 1).fillRect(hx + 2, hy - 3, 13, 8);
      gb.fillStyle(0xe8762c, 1).fillRect(hx + 4, hy - 1, 4, 3);
    } else if (e.produto === 'frasco') {
      gb.fillStyle(0x9ec4dc, 1).fillRect(hx + 4, hy - 4, 6, 8);
      gb.fillStyle(0x2f7d5e, 1).fillRect(hx + 5, hy - 6, 4, 2);
      gb.fillStyle(0xe8c96a, 1).fillRect(hx + 12, hy - 2, 4, 6);
    } else if (e.produto === 'caixa') {
      gb.fillStyle(0xb07a3a, 1).fillRect(hx + 3, hy - 4, 11, 8);
      gb.fillStyle(0x6b4226, 1).fillRect(hx + 3, hy - 4, 11, 2);
      gb.fillStyle(0xf2c14e, 1).fillRect(hx + 7, hy - 1, 3, 3);
    } else if (e.produto === 'bilhete') {
      gb.fillStyle(0xf2c14e, 1).fillRect(hx + 2, hy - 3, 12, 7);
      gb.fillStyle(0xe8362c, 1).fillRect(hx + 9, hy - 1, 4, 3);
    } else if (e.produto === 'pao') {
      gb.fillStyle(0xd99a4e, 1).fillEllipse(hx + 8, hy, 16, 7);
      gb.fillStyle(0xf2c14e, 0.6).fillRect(hx + 3, hy - 1, 10, 1);
    } else {
      gb.fillStyle(0x9ec4dc, 1).fillRect(hx + 5, hy - 5, 5, 10);
      gb.fillStyle(0x3a7fd0, 1).fillRect(hx + 5, hy - 1, 5, 3);
    }
  }
  // o letreiro em cima, com o nome
  var gl = cena.add.graphics().setDepth(41);
  gl.fillStyle(0x0a0a10, 1).fillRect(x - 3, y - 8, w + 6, 18);
  gl.fillStyle(e.cor, 1).fillRect(x - 3, y + 8, w + 6, 2);
  if (e.emblema) {
    // de 7 pra 5: com as lojas lado a lado, o emblema de 7 encostava no letreiro do vizinho
    gl.fillStyle(e.emblema, 1).fillCircle(x - 5, y + 1, 5).fillCircle(x + w + 5, y + 1, 5);
    gl.fillStyle(0xf2c14e, 1).fillCircle(x - 5, y + 1, 2).fillCircle(x + w + 5, y + 1, 2);
  }
  txtC(cena, x + w / 2, y - 4, e.nome, e.letra, 8).setScale(ESCALA_TEXTO / 2).setDepth(42);
}

function perdeVida(scene, sp, quanto) {
  var n = GameState.perdeCoracao(quanto);
  if (scene && sp) coracaoQuebrado(scene, sp.x, sp.y - 40, quanto);
  if (scene && scene.cameras) scene.cameras.main.shake(220 * Math.min(2, quanto || 1), 0.005 * Math.min(2, quanto || 1));
  return n;
}

var Ctrl = {
  up: false, down: false, left: false, right: false,
  act: false, actJust: false, back: false, backJust: false,
  pausaJust: false,
  leftJust: false, rightJust: false, upJust: false, downJust: false,
  leftN: 0, rightN: 0, upN: 0, downN: 0,
  _pa: false, _pb: false, _pz: false,
  _tl: false, _tr: false, _tu: false, _td: false,
  _nl: 0, _nr: 0, _nu: 0, _nd: 0,
  liga: function (scene) {
    /* ---------- o toque não atravessa a troca de tela ----------
       O pulso de um toque curto vive até o próximo Ctrl.update() da cena
       que o recebeu. Se esse toque TROCA de cena, a cena velha morre sem
       consumir o pulso e a nova o encontra intacto: era isso que fazia o
       ladrilho TROCAR, na tela de fim, levar ao título e o título já
       começar a partida com o mesmo dedo. Um toque, uma tela.

       O _pa vai pra true de propósito: quem chega numa tela com o dedo
       ainda encostado só age depois de soltar e tocar de novo. */
    TOUCH.pulso = false;
    this._pa = true;
    this.actJust = false;
    /* ---------- e a soltura do mesmo dedo, que o _pa não pegava ----------
       O _pa = true só protege se o dedo encostado já contar como "agir".
       No toque curto não conta: quem vira agir é a SOLTURA (TOUCH.pulso,
       no pointerup). A tela nova via nada apertado no primeiro quadro,
       zerava o _pa, e a soltura do dedo que trocou de tela chegava como
       um toque novinho.
       Medido no TREINO do título: o botão troca de tela ao encostar, e a
       soltura abria sozinha a primeira da lista — toda vez, a briga. O
       mesmo vazamento, no treino da catraca, pularia a catraca sozinho, e
       no VOLTAR da lista começaria uma partida no título.
       Agora a tela lembra que chegou com dedo encostado e engole a
       soltura DESSE dedo. É a promessa do comentário acima, cumprida. */
    this._engoleSoltura = !!(TOQUE.ativo || TOQUE_DIR.ativo);

    /* WASD e espaço são o controle principal; setas, Z e enter continuam
       valendo pra quem já pegou o costume. enableCapture segura o espaço
       antes que o navegador role a página com ele. */
    this.k = scene.input.keyboard.addKeys(
      'W,A,S,D,SPACE,UP,DOWN,LEFT,RIGHT,Z,X,P,ENTER,ESC', true, true);

    /* Contador de batidas, não de estado. Olhar se a tecla está
       apertada perde o toque curto; o JustDown do Phaser é um booleano
       e perde a segunda batida do mesmo quadro. Duas batidas têm que
       valer duas — é o que a batalha de rima e a troca de pista da
       baldeação pedem. Repetição de tecla segurada não conta. */
    var self = this;
    scene.input.keyboard.on('keydown', function (ev) {
      if (ev.repeat) return;
      var c = ev.code;
      if (c === 'KeyA' || c === 'ArrowLeft') self._nl++;
      else if (c === 'KeyD' || c === 'ArrowRight') self._nr++;
      else if (c === 'KeyW' || c === 'ArrowUp') self._nu++;
      else if (c === 'KeyS' || c === 'ArrowDown') self._nd++;
    });
  },
  update: function () {
    var k = this.k;
    this.up = k.W.isDown || k.UP.isDown || TOUCH.up;
    this.down = k.S.isDown || k.DOWN.isDown || TOUCH.down;
    this.left = k.A.isDown || k.LEFT.isDown || TOUCH.left;
    this.right = k.D.isDown || k.RIGHT.isDown || TOUCH.right;
    var pulso = TOUCH.pulso;
    if (this._engoleSoltura) {
      pulso = false;
      // o dedo que atravessou a troca de tela soltou: dali pra frente vale tudo
      if (!TOQUE.ativo && !TOQUE_DIR.ativo) this._engoleSoltura = false;
    }
    var a = k.SPACE.isDown || k.Z.isDown || k.ENTER.isDown || TOUCH.act || pulso;
    this.actJust = a && !this._pa; this._pa = a; this.act = a;
    TOUCH.pulso = false;
    var b = k.X.isDown;
    this.backJust = b && !this._pb; this._pb = b; this.back = b;
    /* ESC e P são pausa, não "voltar": no vagão X levanta do banco, e
       misturar os dois fazia a pausa levantar você junto */
    var pz = k.ESC.isDown || k.P.isDown;
    this.pausaJust = pz && !this._pz; this._pz = pz;

    /* Direção apertada e solta entre dois quadros sumia: olhar só o
       estado da tecla perde o toque curto, que é justamente o que a
       batalha de rima e a corrida da baldeação pedem. JustDown lê o
       evento do teclado, não o estado.

       Os dois lados de cada par são lidos sem curto-circuito de
       propósito: com ||, o segundo não seria consumido e voltaria como
       um toque fantasma no quadro seguinte. */
    this.leftN = this._nl + ((TOUCH.left && !this._tl) ? 1 : 0); this._nl = 0;
    this.rightN = this._nr + ((TOUCH.right && !this._tr) ? 1 : 0); this._nr = 0;
    this.upN = this._nu + ((TOUCH.up && !this._tu) ? 1 : 0); this._nu = 0;
    this.downN = this._nd + ((TOUCH.down && !this._td) ? 1 : 0); this._nd = 0;
    this.leftJust = this.leftN > 0; this.rightJust = this.rightN > 0;
    this.upJust = this.upN > 0; this.downJust = this.downN > 0;
    this._tl = TOUCH.left; this._tr = TOUCH.right;
    this._tu = TOUCH.up; this._td = TOUCH.down;
  },

  /* o disfarce quer uma direção só. No teclado a ordem das teclas
     resolve; no manche quem manda é o eixo mais puxado, senão uma
     diagonal involuntária vira resposta errada. */
  dirDominante: function () {
    if (TOQUE.arrastando && (TOQUE.dx || TOQUE.dy)) {
      return Math.abs(TOQUE.dx) >= Math.abs(TOQUE.dy)
        ? (TOQUE.dx < 0 ? 'left' : 'right')
        : (TOQUE.dy < 0 ? 'up' : 'down');
    }
    if (this.up) return 'up';
    if (this.down) return 'down';
    if (this.left) return 'left';
    if (this.right) return 'right';
    return null;
  }
};

/* =========================================================
   FONTE DE BITMAP
   Glifo 5x7, célula 6x10, desenhada pixel a pixel.
   As duas primeiras linhas guardam o acento e a última a
   cedilha, então Á Ã Ç cabem sem cortar.
   ========================================================= */
var GLIFOS = {
  'A': ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  'B': ['####.', '#...#', '#...#', '####.', '#...#', '#...#', '####.'],
  'C': ['.###.', '#...#', '#....', '#....', '#....', '#...#', '.###.'],
  'D': ['####.', '#...#', '#...#', '#...#', '#...#', '#...#', '####.'],
  'E': ['#####', '#....', '#....', '####.', '#....', '#....', '#####'],
  'F': ['#####', '#....', '#....', '####.', '#....', '#....', '#....'],
  'G': ['.###.', '#...#', '#....', '#.###', '#...#', '#...#', '.###.'],
  'H': ['#...#', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  'I': ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '#####'],
  'J': ['..###', '...#.', '...#.', '...#.', '...#.', '#..#.', '.##..'],
  'K': ['#...#', '#..#.', '#.#..', '##...', '#.#..', '#..#.', '#...#'],
  'L': ['#....', '#....', '#....', '#....', '#....', '#....', '#####'],
  'M': ['#...#', '##.##', '#.#.#', '#.#.#', '#...#', '#...#', '#...#'],
  'N': ['#...#', '##..#', '#.#.#', '#..##', '#...#', '#...#', '#...#'],
  'O': ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  'P': ['####.', '#...#', '#...#', '####.', '#....', '#....', '#....'],
  'Q': ['.###.', '#...#', '#...#', '#...#', '#.#.#', '#..#.', '.##.#'],
  'R': ['####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#'],
  'S': ['.####', '#....', '#....', '.###.', '....#', '....#', '####.'],
  'T': ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..'],
  'U': ['#...#', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  'V': ['#...#', '#...#', '#...#', '#...#', '#...#', '.#.#.', '..#..'],
  'W': ['#...#', '#...#', '#...#', '#.#.#', '#.#.#', '##.##', '#...#'],
  'X': ['#...#', '#...#', '.#.#.', '..#..', '.#.#.', '#...#', '#...#'],
  'Y': ['#...#', '#...#', '.#.#.', '..#..', '..#..', '..#..', '..#..'],
  'Z': ['#####', '....#', '...#.', '..#..', '.#...', '#....', '#####'],
  '0': ['.###.', '#...#', '#..##', '#.#.#', '##..#', '#...#', '.###.'],
  '1': ['..#..', '.##..', '..#..', '..#..', '..#..', '..#..', '.###.'],
  '2': ['.###.', '#...#', '....#', '...#.', '..#..', '.#...', '#####'],
  '3': ['####.', '....#', '....#', '.###.', '....#', '....#', '####.'],
  '4': ['...#.', '..##.', '.#.#.', '#..#.', '#####', '...#.', '...#.'],
  '5': ['#####', '#....', '####.', '....#', '....#', '#...#', '.###.'],
  '6': ['.###.', '#....', '#....', '####.', '#...#', '#...#', '.###.'],
  '7': ['#####', '....#', '...#.', '..#..', '..#..', '..#..', '..#..'],
  '8': ['.###.', '#...#', '#...#', '.###.', '#...#', '#...#', '.###.'],
  '9': ['.###.', '#...#', '#...#', '.####', '....#', '....#', '.###.'],
  ' ': ['.....', '.....', '.....', '.....', '.....', '.....', '.....'],
  '.': ['.....', '.....', '.....', '.....', '.....', '.....', '..#..'],
  ',': ['.....', '.....', '.....', '.....', '.....', '..#..', '.#...'],
  '!': ['..#..', '..#..', '..#..', '..#..', '..#..', '.....', '..#..'],
  '?': ['.###.', '#...#', '....#', '...#.', '..#..', '.....', '..#..'],
  ':': ['.....', '..#..', '.....', '.....', '..#..', '.....', '.....'],
  ';': ['.....', '..#..', '.....', '.....', '..#..', '.#...', '.....'],
  "'": ['..#..', '..#..', '.....', '.....', '.....', '.....', '.....'],
  '"': ['.#.#.', '.#.#.', '.....', '.....', '.....', '.....', '.....'],
  '-': ['.....', '.....', '.....', '.###.', '.....', '.....', '.....'],
  '+': ['.....', '..#..', '..#..', '#####', '..#..', '..#..', '.....'],
  '=': ['.....', '.....', '#####', '.....', '#####', '.....', '.....'],
  '/': ['....#', '....#', '...#.', '..#..', '.#...', '#....', '#....'],
  '(': ['...#.', '..#..', '.#...', '.#...', '.#...', '..#..', '...#.'],
  ')': ['.#...', '..#..', '...#.', '...#.', '...#.', '..#..', '.#...'],
  '$': ['..#..', '.####', '#.#..', '.###.', '..#.#', '####.', '..#..'],
  '%': ['##..#', '##.#.', '...#.', '..#..', '.#...', '.#.##', '#..##'],
  '<': ['...#.', '..#..', '.#...', '#....', '.#...', '..#..', '...#.'],
  '>': ['.#...', '..#..', '...#.', '....#', '...#.', '..#..', '.#...'],
  '#': ['.#.#.', '#####', '.#.#.', '#####', '.#.#.', '.....', '.....'],
  '*': ['.....', '#.#.#', '.###.', '#####', '.###.', '#.#.#', '.....'],
  '▲': ['.....', '..#..', '.###.', '#####', '.....', '.....', '.....'],
  '▼': ['.....', '.....', '.....', '#####', '.###.', '..#..', '.....'],
  '◄': ['...#.', '..##.', '.###.', '####.', '.###.', '..##.', '...#.'],
  '►': ['.#...', '.##..', '.###.', '.####', '.###.', '.##..', '.#...']
};
var ACENTOS = {
  agudo: ['...#.', '..#..'],
  grave: ['.#...', '..#..'],
  til: ['.##.#', '#..##'],
  circ: ['..#..', '.#.#.']
};
var CEDILHA = '..#..';
var ACENTUADOS = {
  'Á': ['A', 'agudo'], 'À': ['A', 'grave'], 'Ã': ['A', 'til'], 'Â': ['A', 'circ'],
  'É': ['E', 'agudo'], 'Ê': ['E', 'circ'], 'Í': ['I', 'agudo'],
  'Ó': ['O', 'agudo'], 'Õ': ['O', 'til'], 'Ô': ['O', 'circ'],
  'Ú': ['U', 'agudo'], 'Ç': ['C', 'cedilha']
};
var CHARSET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 .,!?:;\'"-+=/()$%<>#*ÁÀÃÂÉÊÍÓÕÔÚÇ▲▼◄►';
var CEL_W = 6, CEL_H = 10, POR_LINHA = 16;

function geraFonte(scene) {
  if (scene.cache.bitmapFont.has('px')) return;
  var linhas = Math.ceil(CHARSET.length / POR_LINHA);
  var tex = scene.textures.createCanvas('fonte_px', POR_LINHA * CEL_W, linhas * CEL_H);
  var c = tex.getContext();
  c.fillStyle = '#ffffff';
  for (var i = 0; i < CHARSET.length; i++) {
    var ch = CHARSET[i];
    var cx = (i % POR_LINHA) * CEL_W;
    var cy = Math.floor(i / POR_LINHA) * CEL_H;
    var base = ch, ac = null;
    if (ACENTUADOS[ch]) { base = ACENTUADOS[ch][0]; ac = ACENTUADOS[ch][1]; }
    var g = GLIFOS[base];
    if (g) {
      for (var r = 0; r < 7; r++) {
        for (var col = 0; col < 5; col++) {
          if (g[r][col] === '#') c.fillRect(cx + col, cy + 2 + r, 1, 1);
        }
      }
    }
    if (ac === 'cedilha') {
      for (var k = 0; k < 5; k++) if (CEDILHA[k] === '#') c.fillRect(cx + k, cy + 9, 1, 1);
    } else if (ac) {
      var a = ACENTOS[ac];
      for (var r2 = 0; r2 < 2; r2++) {
        for (var c2 = 0; c2 < 5; c2++) {
          if (a[r2][c2] === '#') c.fillRect(cx + c2, cy + r2, 1, 1);
        }
      }
    }
  }
  tex.refresh();
  scene.cache.bitmapFont.add('px', Phaser.GameObjects.RetroFont.Parse(scene, {
    image: 'fonte_px',
    width: CEL_W, height: CEL_H,
    chars: CHARSET, charsPerRow: POR_LINHA,
    offset: { x: 0, y: 0 }, spacing: { x: 0, y: 0 }, lineSpacing: 2
  }));
}

(function remendaBitmapText() {
  var BT = Phaser.GameObjects.BitmapText.prototype;
  var textoOriginal = BT.setText;
  BT.setText = function (v) {
    var s = String(v === null || v === undefined ? '' : v).toUpperCase();
    var limpo = '';
    for (var i = 0; i < s.length; i++) {
      var ch = s[i];
      limpo += (ch === '\n' || CHARSET.indexOf(ch) >= 0) ? ch : ' ';
    }
    return textoOriginal.call(this, limpo);
  };
  BT.setColor = function (cor) {
    this.setTint(Phaser.Display.Color.HexStringToColor(cor).color);
    return this;
  };
  BT.setWordWrapWidth = function (w) {
    this.setMaxWidth(Math.round(w));   // maxWidth já é medido na tela, com a escala aplicada
    return this;
  };
  BT.setResolution = function () { return this; };
  /* Centralizar exige largura máxima definida ANTES: sem ela o Phaser
     calcula o alinhamento com um limite indefinido e o RENDER quebra
     (glTexture null) — não o create nem o update, o que faz o erro não
     aparecer em try/catch nenhum e a tela inteira virar preto. Custou
     duas cenas pra achar. */
  BT.setAlign = function (a) {
    if (a === 'center' && this.setCenterAlign) {
      if (!this._maxWidth) this.setMaxWidth(GW - 16);
      this.setCenterAlign();
    }
    return this;
  };
  if (!BT.setLineSpacing) BT.setLineSpacing = function () { return this; };
})();

/* ---------- utilidades de UI ---------- */
var ESCALA_TEXTO = 2;   // a resolução dobrou, o texto acompanha

function txt(scene, x, y, s, cor, tam) {
  var t = scene.add.bitmapText(Math.round(x), Math.round(y), 'px', '');
  t.setScale(ESCALA_TEXTO * Math.max(1, Math.round((tam || 8) / 8)));
  t.setColor(cor || PAL.branco);
  t.setText(s);
  return t;
}
function txtC(scene, x, y, s, cor, tam) {
  var t = txt(scene, x, y, s, cor, tam);
  t.setOrigin(0.5, 0);
  return t;
}

function caixa(g, x, y, w, h, corBorda) {
  g.fillStyle(0x0a0a14, 0.95); g.fillRect(x, y, w, h);
  g.fillStyle(0x1b1b2a, 1); g.fillRect(x + 2, y + 2, w - 4, 3);
  g.lineStyle(2, corBorda === undefined ? 0xf2f0ff : corBorda, 1);
  g.strokeRect(x + 1, y + 1, w - 2, h - 2);
}
function barra(g, x, y, w, h, pct, cor, corFundo) {
  g.fillStyle(corFundo === undefined ? 0x1e1e2a : corFundo, 1);
  g.fillRect(x, y, w, h);
  var p = Phaser.Math.Clamp(pct, 0, 1);
  var larg = Math.round(w * p);
  g.fillStyle(cor, 1);
  g.fillRect(x, y, larg, h);
  if (larg > 2) {
    g.fillStyle(0xffffff, 0.28);
    g.fillRect(x, y + 1, larg, Math.max(1, Math.floor(h / 3)));
  }
  g.lineStyle(1, 0x08080e, 1);
  g.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
}
/* textura pontilhada: dá granulação de 16 bits sem custo */
function pontilhado(g, x, y, w, h, cor, alpha, passo) {
  passo = passo || 4;
  g.fillStyle(cor, alpha === undefined ? 0.14 : alpha);
  for (var yy = y; yy < y + h; yy += passo) {
    for (var xx = x + ((yy / passo) % 2 ? passo / 2 : 0); xx < x + w; xx += passo) {
      g.fillRect(xx, yy, 2, 2);
    }
  }
}

/* =========================================================
   KIT DE INTERFACE
   Letra solta em cima de piso quadriculado some e deixa a tela
   com cara de rascunho. Tudo que o jogo escreve por cima da
   cena mora numa chapa escura, e as chapas moram sempre nos
   mesmos lugares: aviso no alto, dica na faixa de baixo.
   ========================================================= */

/* chapa que acompanha o tamanho do texto */
function Plaqueta(scene, x, y, cfg) {
  cfg = cfg || {};
  var d = (cfg.depth === undefined) ? 800 : cfg.depth;
  this.x = Math.round(x); this.y = Math.round(y);
  this.centro = (cfg.centro !== false);
  this.filete = cfg.filete || null;
  this.led = !!cfg.led;
  /* ---------- placa de metrô ----------
     A sinalização do Metrô de SP tem gramática fixa, e é ela que faz uma
     placa parecer estação antes de ser lida: chapa PRETA, nome em BRANCO
     centrado, e uma TARJA da cor da linha na base. A tarja é o que diz
     de qual linha aquele acesso é, e é a única cor da peça.
     A preferencial do vagão é o inverso da mesma gramática: chapa AZUL,
     texto e seta em branco. */
  this.metro = !!cfg.metro;
  /* E a placa de DIREÇÃO é o contrário da de identidade: a chapa inteira
     é da cor da linha, e a seta e o texto são brancos. É por isso que numa
     estação você acha a saída sem ler: identidade é preta, caminho é
     colorido. As duas juntas são a sinalização inteira do metrô. */
  this.saida = !!cfg.saida;
  this.pref = !!cfg.pref;
  this.faixaCor = (cfg.faixaCor === undefined) ? num(GameState.linhaAtual().cor) : cfg.faixaCor;
  /* Nada de UI acompanha a câmera. No vagão de oito carros a câmera
     anda com quem joga, e sem isto a placa de rota, a dica e o diálogo
     ficariam pendurados no trilho, saindo da tela junto com o cenário.
     Nas cenas de tela parada isto não faz diferença nenhuma.
     A exceção é a placa pregada na parede: essa é cenário, tem lugar
     no mundo, e some da tela quando a câmera sobe. Quem a pendura pede
     mundo: true. */
  var sf = cfg.mundo ? 1 : 0;
  this.g = scene.add.graphics().setDepth(d).setScrollFactor(sf);
  this.t = txt(scene, this.x, this.y + 5, '', cfg.cor || PAL.branco, cfg.tam || 8)
    .setDepth(d + 1).setScrollFactor(sf);
  if (this.centro) this.t.setOrigin(0.5, 0);
  this.t.setWordWrapWidth(cfg.largura || (GW - 24));
  if (cfg.centro !== false) this.t.setAlign('center');
  /* ---------- o rodapé ----------
     A placa de embarque do metrô tem duas alturas: o destino grande e,
     numa tarja mais escura embaixo, o nome da linha. As duas juntas são
     o que faz a placa dizer "deste lado, por esta linha" numa olhada.
     Sem a tarja, destino sozinho é só uma palavra grande. */
  this.rodape = cfg.rodape || '';
  if (this.rodape) {
    this.tRod = txt(scene, this.x, this.y, '', PAL.branco, 8)
      .setDepth(d + 1).setScrollFactor(sf);
    if (this.centro) this.tRod.setOrigin(0.5, 0);
  }
  this.setText(cfg.texto || '');
}
Plaqueta.prototype.setText = function (txto) {
  if (this.ultimo === txto) return this;
  this.ultimo = txto;
  this.g.clear();
  if (!txto) { this.t.setVisible(false); return this; }
  this.t.setVisible(true).setText(txto);
  var w = Math.round(this.t.width), h = Math.round(this.t.height);
  var x0 = this.centro ? this.x - Math.round(w / 2) : this.x;
  var lx = x0 - 7, ly = this.y, lw = w + 14, lh = h + 10;

  /* ---------- modo letreiro ----------
     O painel de LED do vagão não é uma placa com texto: é uma chapa
     preta com pontinhos acesos. A diferença toda está na grade — sem
     ela, "letreiro" é só uma caixa com letra laranja, que é o que
     qualquer caixa é. */
  if (this.led) {
    this.g.fillStyle(0x0a0a06, 1).fillRect(lx - 6, ly - 4, lw + 12, lh + 8);
    this.g.fillStyle(0x1c1608, 1).fillRect(lx - 4, ly - 2, lw + 8, lh + 4);
    // a grade de LEDs apagados, por baixo da letra
    this.g.fillStyle(0x2a2008, 1);
    for (var gy = ly; gy < ly + lh; gy += 3) {
      for (var gx = lx - 2; gx < lx + lw + 2; gx += 3) this.g.fillRect(gx, gy, 1, 1);
    }
    // a moldura de metal do painel, e o brilho de cima
    this.g.fillStyle(num(PAL.metalSom), 1);
    this.g.fillRect(lx - 6, ly - 4, lw + 12, 2);
    this.g.fillRect(lx - 6, ly + lh + 4, lw + 12, 2);
    this.g.fillStyle(num(PAL.metalLuz), 0.5).fillRect(lx - 6, ly - 4, lw + 12, 1);
    if (this.filete) this.g.fillStyle(this.filete, 1).fillRect(lx - 4, ly + lh + 2, lw + 8, 2);
    return this;
  }

  if (this.metro) {
    this.g.fillStyle(0x000000, 1).fillRect(lx - 5, ly - 4, lw + 10, lh + 13);
    this.g.fillStyle(0x1e1e1e, 1).fillRect(lx - 5, ly - 4, lw + 10, 2);
    // a tarja da linha, na base, com o selo do número à esquerda
    this.g.fillStyle(this.faixaCor, 1).fillRect(lx - 5, ly + lh + 3, lw + 10, 6);
    this.g.fillStyle(0xffffff, 0.9).fillRect(lx - 2, ly + lh + 4, 4, 4);
    return this;
  }
  if (this.saida) {
    var rod = this.rodape ? 22 : 0;
    this.g.fillStyle(this.faixaCor, 1).fillRect(lx - 6, ly - 5, lw + 12, lh + 10);
    // a tarja de cabeçalho, um tom acima, como no 'Saída | Exit' da real
    this.g.fillStyle(0xffffff, 0.22).fillRect(lx - 6, ly - 5, lw + 12, 3);
    if (rod) {
      // a tarja da linha, mais escura, embaixo do destino
      /* Chapa OPACA e depois a cor da linha por cima, e não 42% de preto
         sobre o que estiver atrás: no piso do saguão, que é claro, os
         42% davam uma tarja; no piso da plataforma, que é escuro, davam
         exatamente a cor do piso, e o nome da linha ficava boiando
         solto embaixo da placa como se fosse legenda de outra coisa. */
      this.g.fillStyle(0x0d0d14, 1).fillRect(lx - 6, ly + lh + 5, lw + 12, rod);
      this.g.fillStyle(this.faixaCor, 0.22).fillRect(lx - 6, ly + lh + 5, lw + 12, rod);
      this.g.fillStyle(0xffffff, 0.18).fillRect(lx - 6, ly + lh + 5, lw + 12, 1);
      this.tRod.x = this.x; this.tRod.y = ly + lh + 9;
      this.tRod.setText(this.rodape).setVisible(true);
    } else {
      this.g.fillStyle(0x000000, 0.28).fillRect(lx - 6, ly + lh + 2, lw + 12, 3);
    }
    return this;
  }
  if (this.pref) {
    this.g.fillStyle(0x0b3fa0, 1).fillRect(lx - 5, ly - 4, lw + 10, lh + 8);
    this.g.fillStyle(0x1f5fd0, 1).fillRect(lx - 5, ly - 4, lw + 10, 2);
    this.g.lineStyle(2, 0xffffff, 0.95);
    this.g.strokeRect(lx - 3, ly - 2, lw + 6, lh + 4);
    return this;
  }
  this.g.fillStyle(0x08080e, 0.8).fillRect(lx, ly, lw, lh);
  this.g.fillStyle(0x232336, 0.9).fillRect(lx, ly, lw, 2);
  this.g.fillStyle(0x000000, 0.4).fillRect(lx, ly + lh - 2, lw, 2);
  if (this.filete) this.g.fillStyle(this.filete, 1).fillRect(lx, ly + lh - 2, lw, 2);
  return this;
};
Plaqueta.prototype.setCor = function (c) { this.t.setColor(c); return this; };
Plaqueta.prototype.texto = function () { return this.ultimo || ''; };
Plaqueta.prototype.setY = function (y) {
  if (this.y === y) return this;
  this.y = Math.round(y);
  this.t.y = this.y + 5;
  var atual = this.ultimo; this.ultimo = null;
  return this.setText(atual);
};
Plaqueta.prototype.setFilete = function (c) {
  if (this.filete === c) return this;
  this.filete = c; this.ultimo = null;
  return this.setText(this.t.text);
};

/* a faixa de dica: mesma altura, mesma cor, em todas as cenas.
   É ela que dá o chão pro texto e tira a sensação de letra jogada. */
function FaixaDica(scene, depth) {
  var d = (depth === undefined) ? 860 : depth;
  this.y = GH - 32;
  this.g = scene.add.graphics().setDepth(d).setScrollFactor(0);
  this.t = txtC(scene, GW / 2, this.y + 6, '', PAL.amarelo, 8).setDepth(d + 1).setScrollFactor(0);
  this.setText('');
}
FaixaDica.prototype.setText = function (txto, cor) {
  if (cor) this.t.setColor(cor);
  var chave = txto + (PAINEL ? '|lado' : '') + (cor || '');
  if (this.ultimo === chave) return this;
  this.ultimo = chave;
  this.g.clear();

  if (PAINEL) {                       // a dica vive no painel do desktop
    this.t.setVisible(false);
    PAINEL.dica(txto, cor);
    return this;
  }
  if (!txto) { this.t.setVisible(false); return this; }
  this.t.setVisible(true).setText(txto);
  this.g.fillStyle(0x08080e, 0.82).fillRect(0, this.y, GW, 26);
  this.g.fillStyle(0x232336, 0.9).fillRect(0, this.y, GW, 1);
  this.g.fillStyle(0x000000, 0.45).fillRect(0, this.y + 25, GW, 1);
  return this;
};

/* ---------- achados e perdidos ----------
   Do Crossy Road, e é a ideia dele que mais cabe aqui: lá você NUNCA
   compra um personagem. Você alimenta uma maquininha de prêmio e ela
   cospe um aleatório com fanfarra. A loja daqui era uma tabela de preços
   — 90, 150 — e tabela é transação, não momento.

   O lugar já existia na vida real: toda estação grande de São Paulo tem
   um guichê de achados e perdidos, e o que tem lá dentro é exatamente o
   sortimento de uma máquina de prêmio — guarda-chuva quebrado, carteira,
   molho de chaves, a mochila que alguém esqueceu.

   E ela dá um destino pro PONTO dentro da partida. Antes ele só servia
   na tela de título, entre uma corrida e outra; agora existe a escolha
   de gastar hoje ou guardar pro personagem, que é uma decisão de
   verdade e não uma poupança. */
/* 20 e não 25, e a mochila pesa 18 e não 12: medido em 200 puxadas, o
   preço velho dava uma mochila a cada 233 pontos, e a gestante custa 90
   na tabela — a máquina era estritamente pior que a loja, e máquina que
   não compete com a loja não é escolha, é enfeite. Com 20 e 18 ela sai
   por volta de 130, entre o personagem barato e o caro, e ainda devolve
   grana e ponto pelo caminho. */
var ACHADOS_PRECO = 20;

var ACHADOS = [
  { peso: 20, nome: 'UM GUARDA-CHUVA', fala: 'Quebrado. Você levou mesmo assim.' },
  { peso: 24, nome: 'UMA CARTEIRA', grana: [5, 20], fala: 'Sem documento nenhum dentro.\nSó o dinheiro.' },
  { peso: 18, nome: 'UM VALE VELHO', pontos: [8, 16], fala: 'Ainda tem crédito.' },
  { peso: 14, nome: 'UMA MARMITA', descanso: 22, fala: 'Fria, mas é comida.' },
  { peso: 12, nome: 'UM MOLHO DE CHAVES', carisma: 8, fala: 'Você devolveu no guichê.\nAlguém vai dormir melhor hoje.' },
  { peso: 18, nome: 'A MOCHILA DE ALGUÉM', personagem: true,
    fala: 'Dentro tinha a vida de outra pessoa.' }
];

/* quem ainda está trancado; vazio quando já se abriu todo mundo */
function travadosAgora() {
  var out = [];
  for (var k in CHARS) {
    if (!CHARS.hasOwnProperty(k)) continue;
    if (!destravado(k)) out.push(k);
  }
  return out;
}

/* Sorteia, cobra e entrega. Devolve o que saiu pra tela contar. */
function puxaAchados() {
  if (lePontos() < ACHADOS_PRECO) return { falta: ACHADOS_PRECO - lePontos() };
  gravaPontos(lePontos() - ACHADOS_PRECO);

  var total = 0, i;
  for (i = 0; i < ACHADOS.length; i++) total += ACHADOS[i].peso;
  var r = Math.random() * total, item = ACHADOS[0];
  for (i = 0; i < ACHADOS.length; i++) {
    r -= ACHADOS[i].peso;
    if (r <= 0) { item = ACHADOS[i]; break; }
  }

  var saiu = { nome: item.nome, fala: item.fala };
  if (item.personagem) {
    var t = travadosAgora();
    /* Já abriu todo mundo: a mochila vira o que ela seria de qualquer
       jeito, um punhado de troco. Prêmio que não existe mais não pode
       virar prêmio nenhum. */
    if (!t.length) {
      saiu.nome = 'UMA CARTEIRA';
      saiu.fala = 'Sem documento nenhum dentro.\nSó o dinheiro.';
      item = { grana: [5, 20] };
    } else {
      var k = t[Math.floor(Math.random() * t.length)];
      destrava(k);
      saiu.personagem = k;
      saiu.nomePersonagem = CHARS[k].nome;
    }
  }
  if (item.grana) {
    saiu.grana = Math.round(Phaser.Math.FloatBetween(item.grana[0], item.grana[1]) * 4) / 4;
    GameState.ganhar(saiu.grana);
  }
  if (item.pontos) {
    saiu.pontos = Phaser.Math.Between(item.pontos[0], item.pontos[1]);
    gravaPontos(lePontos() + saiu.pontos);
  }
  if (item.descanso) { saiu.descanso = item.descanso; GameState.addDescanso(item.descanso); }
  if (item.carisma) { saiu.carisma = item.carisma; GameState.addCarisma(item.carisma); }
  GameState.stats.achados = (GameState.stats.achados || 0) + 1;
  return saiu;
}

/* ---------- ir pro fim de jogo ----------
   Era um corte seco pra uma tela preta: você perdia e o lugar onde
   perdeu sumia. O Crossy Road deixa o seu corpo achatado na pista atrás
   do placar, e é isso que faz a morte ter endereço em vez de ser um
   número.

   Em vez de trocar de cena, CONGELA a que está rodando e abre a do fim
   por cima, translúcida: o vagão, o guarda, a plataforma — onde quer que
   tenha acabado — continuam ali atrás. A cena do fim é quem depois mata
   as congeladas, porque quem sai da tela de fim vai pra outro lugar. */
function vaiPraOFim(scene) {
  var congeladas = [];
  scene.scene.manager.getScenes(true).forEach(function (sc) {
    var k = sc.scene.key;
    if (k === 'Fim' || k === 'Hud') return;
    congeladas.push(k);
    scene.scene.pause(k);
  });
  HUD_VISIVEL = false; CONTROLES_VISIVEIS = false;
  scene.scene.launch('Fim', { congeladas: congeladas });
}

/* ---------- ladrilho ----------
   O botão do jogo, e ele é uma coisa só em toda tela: corpo, aba clara
   em cima, sombra embaixo e moldura. É o que faz o olho ver botão sem
   ninguém precisar escrever a palavra "botão". Nasceu na tela de título
   e a de fim de jogo pediu o mesmo — duas cópias do mesmo desenho em
   arquivos diferentes é como duas telas começam a não parecer o mesmo
   jogo. */
function ladrilho(g, x, y, w, h, corpo, aba, borda) {
  g.fillStyle(0x000000, 0.45).fillRect(x + 2, y + 4, w, h);
  g.fillStyle(corpo, 1).fillRect(x, y, w, h);
  g.fillStyle(aba, 1).fillRect(x, y, w, 4);
  g.fillStyle(0x000000, 0.22).fillRect(x, y + h - 5, w, 5);
  g.lineStyle(2, borda, 1).strokeRect(x + 1, y + 1, w - 2, h - 2);
}

/* placa fixa de cenário: nome de setor pintado na estação */
function placa(scene, x, y, texto, cor, depth) {
  var p = new Plaqueta(scene, x, y, { cor: cor, mundo: true, depth: depth === undefined ? 3 : depth });
  p.setText(texto);
  return p;
}

/* a placa de IDENTIDADE: preta, nome branco, tarja da linha na base.
   É a que diz onde você está. */
function placaMetro(scene, x, y, texto, depth) {
  var p = new Plaqueta(scene, x, y, {
    cor: PAL.branco, mundo: true, metro: true,
    depth: depth === undefined ? 3 : depth
  });
  p.setText(texto);
  return p;
}

/* a placa de DIREÇÃO: chapa da cor da linha, seta e texto brancos.
   É a que diz pra onde ir. */
function placaSaida(scene, x, y, texto, depth, rodape) {
  var p = new Plaqueta(scene, x, y, {
    cor: PAL.branco, mundo: true, saida: true, rodape: rodape,
    depth: depth === undefined ? 3 : depth
  });
  p.setText(texto);
  return p;
}

/* véu de luz da hora: a mesma estação de madrugada e às 18h não tem
   a mesma cor. Fica por cima do cenário e por baixo de tudo que é vivo. */
function veuDaHora(scene, depth) {
  var f = GameState.faixa();
  if (!f.luzA) return null;
  var g = scene.add.graphics().setDepth(depth === undefined ? 90 : depth).setScrollFactor(0);
  g.fillStyle(f.luz, f.luzA).fillRect(0, HUD_H, GW, GH - HUD_H);
  return g;
}

/* ---------- cenário que vira imagem ----------
   Um Graphics no Phaser não é uma imagem: é uma lista de comandos que o
   motor repassa inteira a cada quadro. Cenário de estação e de vagão são
   milhares de retângulos que nunca mudam, e num mundo que não cabe na
   tela isso se multiplica pelo número de pedaços. Desenhar uma vez,
   virar textura e pôr imagens na tela troca milhares de comandos por
   quadro por nenhum. */
function texturaDeCena(scene, chave, larg, alt, pinta) {
  if (scene.textures.exists(chave)) scene.textures.remove(chave);
  var g = scene.make.graphics({ add: false });
  pinta(g);
  g.generateTexture(chave, larg, alt);
  g.destroy();
}

/* ---------- o que fica caído no chão ----------
   Metrô de verdade tem coisa no chão, e quem anda olhando pra baixo
   acha. Isso não é enfeite: o trem tem oito carros e a estação tem dois
   andares, e até agora andar até a ponta não pagava nada — você ia
   porque o jogo mandava, não porque tinha algo lá. Moeda no chão é o que
   transforma "atravessar o vagão" em uma escolha sua.

   Quanto mais vazio, mais tem: às seis da manhã ninguém passou ali
   ainda; no pico já veio gente antes de você. É a regra mais justa que
   este jogo podia ter, e ela sozinha dá motivo pra jogar fora do pico.

   O bilhete único é o prêmio raro: vale PONTO, que é a moeda que
   atravessa a corrida e abre personagem. Achar um no chão do vagão é a
   melhor coisa que pode acontecer numa terça-feira. */
var CAIDOS = {
  moeda: {
    peso: 62, nome: 'MOEDA', raio: 6,
    grana: [0.25, 1.50], pontos: 0,
    cor: 0xf2c14e, corSom: 0x9a7420, corLuz: 0xfff3c4
  },
  nota: {
    peso: 26, nome: 'NOTA', raio: 7,
    grana: [2.00, 6.00], pontos: 0,
    cor: 0x7fd6a0, corSom: 0x2f7a52, corLuz: 0xd8ffe8
  },
  bilhete: {
    peso: 12, nome: 'BILHETE ÚNICO', raio: 7,
    grana: [0, 0], pontos: 3,
    cor: 0x4d9bf0, corSom: 0x1d4c86, corLuz: 0xbfe2ff
  }
};

function sorteiaCaido() {
  var total = 0, k;
  for (k in CAIDOS) if (CAIDOS.hasOwnProperty(k)) total += CAIDOS[k].peso;
  var r = Math.random() * total;
  for (k in CAIDOS) {
    if (!CAIDOS.hasOwnProperty(k)) continue;
    r -= CAIDOS[k].peso;
    if (r <= 0) return k;
  }
  return 'moeda';
}

/* o desenho de cada coisa, virado textura uma vez por cena */
function texturasDoChao(scene) {
  for (var k in CAIDOS) {
    if (!CAIDOS.hasOwnProperty(k)) continue;
    (function (chave, c) {
      /* O piso da estação é cinza escuro e o do vagão é cinza claro: sem
         o halo, a moeda some num dos dois. O halo é o que faz ela ser
         achada de longe, que é o ponto inteiro de ter moeda no chão. */
      texturaDeCena(scene, 'caido_' + chave, 20, 20, function (g) {
        g.fillStyle(c.cor, 0.16).fillCircle(10, 9, 9);
        g.fillStyle(c.cor, 0.22).fillCircle(10, 9, 7);
        g.fillStyle(0x000000, 0.4).fillEllipse(10, 15, 13, 5);
        if (chave === 'moeda') {
          g.fillStyle(c.corSom, 1).fillCircle(10, 9, 6);
          g.fillStyle(c.cor, 1).fillCircle(10, 8, 6);
          g.fillStyle(c.corLuz, 1).fillCircle(8, 6, 2);
          g.fillStyle(c.corSom, 1).fillRect(9, 6, 2, 5);
        } else if (chave === 'nota') {
          g.fillStyle(c.corSom, 1).fillRect(3, 5, 14, 9);
          g.fillStyle(c.cor, 1).fillRect(3, 4, 14, 9);
          g.fillStyle(c.corLuz, 1).fillRect(4, 5, 12, 2);
          g.fillStyle(c.corSom, 1).fillRect(8, 7, 4, 4);
        } else {
          g.fillStyle(c.corSom, 1).fillRect(4, 4, 12, 11);
          g.fillStyle(c.cor, 1).fillRect(4, 3, 12, 11);
          g.fillStyle(c.corLuz, 1).fillRect(5, 4, 10, 3);
          g.fillStyle(0xf2f0ff, 1).fillRect(5, 10, 8, 2);
        }
      });
    })(k, CAIDOS[k]);
  }
}

/* Quantas coisas o chão de uma cena guarda. Vazio rende; pico não. */
function quantoCaiNoChao(base) {
  var vazio = 1 - GameState.lotacao();
  return Math.max(0, Math.round(base * (0.35 + 1.15 * vazio) * Phaser.Math.FloatBetween(0.7, 1.3)));
}

/* ---------- o chão de uma cena ----------
   Quem usa entrega uma função que sorteia um ponto pisável; o resto é
   daqui: desenhar, brilhar, ser pego e dizer quanto valeu. */
function Chao(scene, depth) {
  this.scene = scene;
  this.depth = (depth === undefined) ? 5 : depth;
  this.itens = [];
  this.avisos = [];
  texturasDoChao(scene);
}

Chao.prototype.poe = function (x, y, chave) {
  chave = chave || sorteiaCaido();
  var sp = this.scene.add.image(Math.round(x), Math.round(y), 'caido_' + chave)
    .setDepth(this.depth);
  /* Uma coisa parada no chão de um jogo pixelado some no piso. O pulinho
     de dois pixels é o que faz o olho achar sozinho. */
  this.scene.tweens.add({
    targets: sp, y: sp.y - 2, duration: 620, yoyo: true, repeat: -1,
    ease: 'Sine.easeInOut', delay: Math.random() * 620
  });
  var it = { chave: chave, sp: sp, base: Math.round(y) };
  this.itens.push(it);
  return it;
};

/* espalha n coisas usando o sorteador de ponto de quem chamou */
Chao.prototype.semeia = function (n, sorteiaPonto) {
  for (var i = 0; i < n; i++) {
    for (var t = 0; t < 24; t++) {
      var p = sorteiaPonto();
      if (!p) continue;
      if (this.perto(p.x, p.y, 26)) continue;   // nunca duas grudadas
      this.poe(p.x, p.y);
      break;
    }
  }
};

Chao.prototype.perto = function (x, y, r) {
  for (var i = 0; i < this.itens.length; i++) {
    var it = this.itens[i];
    if (Math.abs(it.sp.x - x) < r && Math.abs(it.base - y) < r) return it;
  }
  return null;
};

/* Pegar é passar por cima: nada de botão. O jogo já pede muito do
   polegar, e abaixar pra pegar moeda não é uma decisão — é um desvio. */
Chao.prototype.atualiza = function (dt, px, py) {
  var pego = null;
  for (var i = this.itens.length - 1; i >= 0; i--) {
    var it = this.itens[i];
    /* A caixa de pegar é maior que o desenho: no corredor do trem
       passar a um pixel de uma moeda e não pegar é pior que não ter
       moeda nenhuma. Ainda dá pra passar reto — só não por engano. */
    if (Math.abs(px - it.sp.x) > 19 || Math.abs(py - it.base) > 15) continue;
    pego = this.pega(i);
  }
  for (var j = this.avisos.length - 1; j >= 0; j--) {
    var a = this.avisos[j];
    a.t += dt;
    a.o.y -= dt * 0.022;
    a.o.setAlpha(Math.max(0, 1 - a.t / 900));
    if (a.t > 900) { a.o.destroy(); this.avisos.splice(j, 1); }
  }
  return pego;
};

Chao.prototype.pega = function (i) {
  var it = this.itens[i], c = CAIDOS[it.chave];
  var grana = c.grana[1] > 0
    ? Math.round(Phaser.Math.FloatBetween(c.grana[0], c.grana[1]) * 4) / 4
    : 0;
  if (grana > 0) { GameState.ganhar(grana, 'ACHOU NO CHÃO'); Missoes.conta('moedaDoChao'); }
  if (c.pontos > 0) gravaPontos(lePontos() + c.pontos);
  GameState.stats.caidos = (GameState.stats.caidos || 0) + 1;

  var rotulo = c.pontos > 0
    ? '+' + c.pontos + ' PONTOS'
    : '+' + grana.toFixed(2).replace('.', ',');
  var o = txtC(this.scene, it.sp.x, it.base - 44, rotulo,
    c.pontos > 0 ? PAL.verde : PAL.amarelo, 8).setDepth(420);
  o.setScrollFactor(it.sp.scrollFactorX, it.sp.scrollFactorY);
  this.avisos.push({ o: o, t: 0 });

  this.scene.tweens.killTweensOf(it.sp);
  it.sp.destroy();
  this.itens.splice(i, 1);
  sfx('moeda');
  return { chave: it.chave, grana: grana, pontos: c.pontos, nome: c.nome };
};

Chao.prototype.limpa = function () {
  for (var i = 0; i < this.itens.length; i++) {
    this.scene.tweens.killTweensOf(this.itens[i].sp);
    this.itens[i].sp.destroy();
  }
  this.itens = [];
};

/* ---------- diálogo ---------- */
function Dialog(scene, texto, opcoes, cfg) {
  cfg = cfg || {};
  this.scene = scene;
  this.opcoes = opcoes || [];
  this.sel = 0;
  this.ativo = true;
  this.tempo = cfg.tempo || 0;
  this.restante = this.tempo;
  this.aoExpirar = cfg.aoExpirar || null;

  // mede o texto já quebrado e só então desenha a caixa em volta dele
  this.tTexto = txt(scene, 20, -400, texto, PAL.branco, 8).setDepth(901).setScrollFactor(0);
  /* com contador, a coluna encolhe: o relógio mora na ponta da primeira
     linha, e texto que enche a linha passava por baixo dele. O dilema do
     lugar escapava só porque a primeira linha dele é curta. */
  this.tTexto.setWordWrapWidth(GW - 40 - (this.tempo ? 30 : 0));
  var hTexto = Math.max(48, Math.round(this.tTexto.height));

  var alt = 28 + hTexto + this.opcoes.length * 24 + (this.tempo ? 20 : 0);
  var y = GH - alt - 12;
  this.g = scene.add.graphics().setDepth(900).setScrollFactor(0);
  caixa(this.g, 8, y, GW - 16, alt, cfg.cor === undefined ? 0xf2f0ff : cfg.cor);
  this.y = y; this.alt = alt;
  this.tTexto.setPosition(20, y + 10);

  this.tOps = [];
  for (var i = 0; i < this.opcoes.length; i++) {
    var ty = y + 20 + hTexto + i * 24;
    this.tOps.push(txt(scene, 32, ty, this.opcoes[i].label, PAL.cinza, 8).setDepth(901).setScrollFactor(0));
  }
  this.cursor = txt(scene, 16, y + 20 + hTexto, '>', PAL.amarelo, 8).setDepth(901).setScrollFactor(0);
  if (this.opcoes.length === 0) this.cursor.setVisible(false);
  this.tTimer = null;
  if (this.tempo) {
    this.tTimer = txt(scene, GW - 24, y + 10, '', PAL.vermelho, 8).setDepth(901).setOrigin(1, 0).setScrollFactor(0);
  }
  this.redesenha();
}
Dialog.prototype.redesenha = function () {
  for (var i = 0; i < this.tOps.length; i++) {
    this.tOps[i].setColor(i === this.sel ? PAL.amarelo : PAL.cinza);
  }
  if (this.tOps.length) this.cursor.y = this.tOps[this.sel].y;
};
Dialog.prototype.update = function (dt) {
  if (!this.ativo) return;
  if (this.tempo) {
    this.restante -= dt / 1000;
    if (this.tTimer) this.tTimer.setText(Math.max(0, Math.ceil(this.restante)) + 'S');
    if (this.restante <= 0) {
      var f = this.aoExpirar; this.fecha();
      if (f) f();
      return;
    }
  }
  if (this.opcoes.length) {
    if (Ctrl.up && !this._pu) { this.sel = (this.sel + this.opcoes.length - 1) % this.opcoes.length; sfx('catraca'); this.redesenha(); }
    if (Ctrl.down && !this._pd) { this.sel = (this.sel + 1) % this.opcoes.length; sfx('catraca'); this.redesenha(); }
    this._pu = Ctrl.up; this._pd = Ctrl.down;
    if (Ctrl.actJust) {
      var op = this.opcoes[this.sel];
      this.fecha(); sfx('ok');
      if (op.cb) op.cb();
    }
  } else if (Ctrl.actJust) {
    var cb = this.aoExpirar; this.fecha();
    if (cb) cb();
  }
};
Dialog.prototype.fecha = function () {
  if (!this.ativo) return;
  this.ativo = false;
  this.g.destroy(); this.tTexto.destroy(); this.cursor.destroy();
  if (this.tTimer) this.tTimer.destroy();
  for (var i = 0; i < this.tOps.length; i++) this.tOps[i].destroy();
  if (this.scene.dialog === this) this.scene.dialog = null;
};

/* ---------- comprar ----------
   Barraca de estação, banca ou ambulante andando: muda o cenário e o
   cardápio, não a conversa. Uma função só monta o menu, cobra, e diz o
   que aconteceu — senão cada cena reinventa o troco. */
/* =========================================================
   OS ÍCONES DA BARRACA
   Escolher comida era uma lista de frases — "DOGÃO R$ 12,00" — e lista
   de frases é o jeito mais lento que existe de escolher entre cinco
   coisas: você lê as cinco pra decidir. Ícone se reconhece sem ler, e
   aí o texto passa a servir pra UMA coisa só: descrever o que está
   selecionado.
   24x24 porque é o que cabe cinco na largura da tela com moldura e
   ainda dá pra distinguir um copo de uma garrafa.
   ========================================================= */
function pinta(c, cor, x, y, w, h) { c.fillStyle = cor; c.fillRect(x, y, w, h); }

var ICONES_ITEM = {
  chocolate: function (c) {
    pinta(c, '#7a2230', 3, 5, 18, 15);
    pinta(c, '#a8303f', 3, 5, 18, 2);
    pinta(c, '#5c3a1e', 5, 8, 14, 10);
    pinta(c, '#7a4f2a', 5, 8, 14, 2);
    pinta(c, '#3d2614', 9, 8, 1, 10);
    pinta(c, '#3d2614', 14, 8, 1, 10);
    pinta(c, '#3d2614', 5, 13, 14, 1);
  },
  doce: function (c) {
    pinta(c, '#d84a8c', 8, 8, 8, 8);
    pinta(c, '#f07ab0', 9, 9, 4, 3);
    pinta(c, '#d84a8c', 4, 10, 4, 4);
    pinta(c, '#d84a8c', 16, 10, 4, 4);
    pinta(c, '#a02f68', 4, 12, 4, 2);
    pinta(c, '#a02f68', 16, 12, 4, 2);
  },
  pururuca: function (c) {
    /* A primeira versão era um saco laranja com uma tarja vermelha
       atravessada no meio, e isso é bacon, não pururuca. O que faz um
       saquinho de salgadinho ser reconhecível não é a cor: é a CRIMPAGEM
       — a borda serrilhada em cima e embaixo, onde a máquina sela — e o
       fato de ele ser estufado, mais largo no meio que nas pontas. */
    pinta(c, '#8a8fa3', 6, 3, 12, 2);               // a crimpagem de cima
    pinta(c, '#5a5f74', 7, 4, 2, 1);
    pinta(c, '#5a5f74', 11, 4, 2, 1);
    pinta(c, '#5a5f74', 15, 4, 2, 1);
    pinta(c, '#c9a03a', 6, 5, 12, 2);               // o saco estufando
    pinta(c, '#e8c14e', 4, 7, 16, 9);
    pinta(c, '#f5dc8a', 5, 8, 3, 7);                // o brilho do plástico
    pinta(c, '#c9a03a', 6, 16, 12, 2);
    pinta(c, '#8a8fa3', 6, 18, 12, 2);              // a crimpagem de baixo
    pinta(c, '#5a5f74', 8, 18, 2, 1);
    pinta(c, '#5a5f74', 13, 18, 2, 1);
    pinta(c, '#7a4a1e', 8, 10, 8, 4);               // o rótulo escuro
    pinta(c, '#e8c14e', 9, 11, 2, 2);               // as pururucas no rótulo
    pinta(c, '#e8c14e', 12, 12, 2, 2);
  },
  agua: function (c) {
    pinta(c, '#3a7fd0', 10, 3, 4, 3);
    pinta(c, '#8fd0f0', 9, 6, 6, 2);
    pinta(c, '#8fd0f0', 7, 8, 10, 12);
    pinta(c, '#cdeeff', 8, 9, 3, 10);
    pinta(c, '#3a7fd0', 7, 16, 10, 4);
  },
  cafe: function (c) {
    pinta(c, '#d8d8e8', 6, 8, 12, 11);
    pinta(c, '#f2f0ff', 7, 9, 3, 9);
    pinta(c, '#4a2c18', 7, 9, 10, 3);
    pinta(c, '#b8b8c8', 6, 18, 12, 2);
    pinta(c, '#8b90a6', 9, 3, 2, 4);
    pinta(c, '#8b90a6', 13, 2, 2, 5);
  },
  dogao: function (c) {
    pinta(c, '#c98a4a', 3, 9, 18, 8);
    pinta(c, '#e0a870', 3, 9, 18, 2);
    pinta(c, '#a0682e', 3, 15, 18, 2);
    pinta(c, '#c0402a', 5, 11, 14, 4);
    pinta(c, '#e05a3a', 5, 11, 14, 1);
    pinta(c, '#f2c14e', 6, 12, 3, 1);
    pinta(c, '#f2c14e', 11, 13, 3, 1);
    pinta(c, '#f2c14e', 15, 12, 3, 1);
  },
  coxinha: function (c) {
    pinta(c, '#b8742a', 8, 4, 8, 3);
    pinta(c, '#d8943a', 6, 7, 12, 5);
    pinta(c, '#d8943a', 4, 12, 16, 7);
    pinta(c, '#f0b85a', 6, 8, 3, 9);
    pinta(c, '#9a5a1e', 4, 18, 16, 2);
  },
  paoQueijo: function (c) {
    for (var i = 0; i < 3; i++) {
      pinta(c, '#e8b85a', 3 + i * 6, 9 + (i % 2) * 3, 7, 7);
      pinta(c, '#f5d88a', 4 + i * 6, 10 + (i % 2) * 3, 3, 2);
      pinta(c, '#b8862a', 3 + i * 6, 15 + (i % 2) * 3, 7, 1);
    }
  },
  fone: function (c) {
    pinta(c, '#f2f0ff', 5, 4, 2, 10);
    pinta(c, '#f2f0ff', 17, 4, 2, 10);
    pinta(c, '#f2f0ff', 7, 3, 10, 2);
    pinta(c, '#d8d8e8', 3, 12, 5, 7);
    pinta(c, '#d8d8e8', 16, 12, 5, 7);
    pinta(c, '#8b90a6', 11, 14, 2, 8);
  },
  powerbank: function (c) {
    pinta(c, '#2a2a32', 6, 4, 12, 17);
    pinta(c, '#4a4a58', 7, 5, 10, 15);
    pinta(c, '#00e676', 9, 8, 6, 2); pinta(c, '#00e676', 9, 11, 6, 2); pinta(c, '#00e676', 9, 14, 4, 2);
    pinta(c, '#8b90a6', 10, 20, 4, 2);
  },
  capinha: function (c) {
    pinta(c, '#7c3fff', 7, 3, 11, 19);
    pinta(c, '#a070ff', 8, 4, 3, 17);
    pinta(c, '#1a1a24', 9, 5, 4, 4);
    pinta(c, '#f2f0ff', 10, 6, 2, 2);
  },
  perfume: function (c) {
    pinta(c, '#2f7d5e', 10, 3, 4, 4);
    pinta(c, '#9ec4dc', 6, 7, 12, 14);
    pinta(c, '#cdeeff', 7, 8, 3, 12);
    pinta(c, '#3f9a70', 8, 12, 8, 5);
  },
  desodorante: function (c) {
    pinta(c, '#8b90a6', 9, 2, 6, 4);
    pinta(c, '#3a7fd0', 8, 6, 8, 16);
    pinta(c, '#6aa0e0', 9, 7, 2, 14);
    pinta(c, '#f2f0ff', 8, 11, 8, 3);
  },
  raspadinha: function (c) {
    pinta(c, '#f2c14e', 3, 5, 18, 14);
    pinta(c, '#1c4a8a', 3, 5, 18, 3);
    pinta(c, '#a0a4b4', 5, 10, 14, 6);
    pinta(c, '#e8362c', 12, 10, 7, 6);
    pinta(c, '#f2f0ff', 14, 12, 3, 2);
  },
  jornal: function (c) {
    pinta(c, '#c8c8d4', 4, 5, 16, 15);
    pinta(c, '#e0e0ea', 4, 5, 16, 2);
    pinta(c, '#8b90a6', 6, 8, 12, 2);
    for (var i = 0; i < 4; i++) pinta(c, '#a0a4b4', 6, 12 + i * 2, 12, 1);
    pinta(c, '#8b90a6', 11, 5, 1, 15);
  }
};

function texturaItem(scene, chave) {
  var k = 'it_' + chave;
  if (scene.textures.exists(k)) return k;
  var tex = scene.textures.createCanvas(k, 24, 24);
  var pintor = ICONES_ITEM[chave];
  if (pintor) pintor(tex.getContext());
  tex.refresh();
  return k;
}

/* ---------- o menu de ícones ----------
   Tem a mesma cara de fora que o Dialog (ativo, update, fecha), porque
   todas as cenas fazem `if (this.dialog && this.dialog.ativo)` e não
   deviam precisar saber que existe um segundo tipo de caixa. */
function MenuComida(scene, titulo, cardapio, aoFechar) {
  this.scene = scene;
  this.itens = cardapio.slice(0);
  this.sel = 0;
  this.ativo = true;
  this.aoFechar = aoFechar;

  /* ---------- tamanho de tela, não de tarja ----------
     A primeira versão morava numa faixa de 122px no rodapé, e comprar
     ficava amontoado: o ícone tinha 24px de lado e o nome dividia a
     linha com o preço. Comprar é uma decisão — é onde o dinheiro, que é
     o relógio da partida, vira descanso — e decisão não cabe em tarja.
     Agora a caixa tem 268 de altura, o ícone é desenhado em dobro e o
     nome tem o corpo da tela de fim. */
  var cel = 56, vao = 6;
  /* 290 e não 268: o nome da barraca tem aspas e três produtos — "Jornal,
     bala, pururuca." dá 24 caracteres, 288px, e quebra em duas linhas. A
     faixa de cabeçalho tinha 30px de altura e a segunda linha do título
     saía por baixo dela, em cima dos ícones. Cabeçalho de 44. */
  var alt = 290;
  var larg = this.itens.length * cel + (this.itens.length - 1) * vao;
  this.x0 = Math.round((GW - larg) / 2);
  this.y = GH - alt - 16;
  this.yIcones = this.y + 56;
  this.cel = cel; this.vao = vao;

  this.g = scene.add.graphics().setDepth(900).setScrollFactor(0);
  this.gSel = scene.add.graphics().setDepth(902).setScrollFactor(0);
  caixa(this.g, 8, this.y, GW - 16, alt, 0xf2c14e);
  /* uma tarja no topo, como as placas do metrô: a caixa passa a ter
     cabeça e corpo em vez de ser um retângulo com texto solto */
  this.g.fillStyle(0x3a2f14, 1).fillRect(10, this.y + 2, GW - 20, 44);
  this.g.fillStyle(0xf2c14e, 0.5).fillRect(10, this.y + 46, GW - 20, 1);

  this.tTitulo = txtC(scene, GW / 2, this.y + 10, titulo, PAL.amarelo, 8)
    .setDepth(901).setScrollFactor(0);
  this.tTitulo.setWordWrapWidth(GW - 40);

  this.sprites = [];
  /* ---------- tocar o ícone é escolher o ícone ----------
     A grade só andava de seta, e o toque em qualquer lugar comprava o
     que estivesse selecionado: medido, tocar direto no quarto ícone
     comprava o PRIMEIRO e fechava o menu com o dinheiro já gasto.
     Numa mão só isso é o caminho normal — o polegar não atravessa a
     tela pra arrastar, ele toca no que quer. Mesma gramática das cartas
     do título: no não-selecionado o toque escolhe, no selecionado
     compra. */
  this.zonas = [];
  this.ignora = false;
  for (var i = 0; i < this.itens.length; i++) {
    var cx = this.x0 + i * (cel + vao);
    this.sprites.push(scene.add.image(cx + cel / 2, this.yIcones + cel / 2,
      texturaItem(scene, this.itens[i]))
      .setScale(2).setDepth(903).setScrollFactor(0));
    var z = scene.add.zone(cx, this.yIcones, cel, cel).setOrigin(0, 0)
      .setDepth(904).setScrollFactor(0).setInteractive();
    (function (eu, idx) {
      z.on('pointerdown', function () {
        if (eu.sel === idx) return;         // no já escolhido, o toque compra
        eu.sel = idx;
        /* o mesmo dedo acende o Ctrl.act ao soltar, e sem isto escolher
           e comprar sairiam do mesmo toque */
        eu.ignora = true;
        sfx('catraca');
        eu.redesenha();
      });
    })(this, i);
    this.zonas.push(z);
  }

  this.tNome = txtC(scene, GW / 2, this.y + 124, '', PAL.branco, 16)
    .setDepth(901).setScrollFactor(0);
  this.tPreco = txtC(scene, GW / 2, this.y + 172, '', PAL.verde, 8)
    .setDepth(901).setScrollFactor(0);
  this.tEfeito = txtC(scene, GW / 2, this.y + 200, '', PAL.cinza, 8)
    .setDepth(901).setScrollFactor(0);
  this.tEfeito.setWordWrapWidth(GW - 24).setAlign('center');
  this.tRodape = txtC(scene, GW / 2, this.y + alt - 34,
    nomeAgir() + ': COMPRAR    X: SAIR', PAL.cinzaEsc, 8)
    .setDepth(901).setScrollFactor(0);
  this.redesenha();
}
MenuComida.prototype.redesenha = function () {
  var g = this.gSel; g.clear();
  for (var i = 0; i < this.itens.length; i++) {
    var cx = this.x0 + i * (this.cel + this.vao);
    var aceso = (i === this.sel);
    var it = ITENS[this.itens[i]];
    var pode = GameState.dinheiro >= it.preco;
    g.fillStyle(aceso ? 0x3a2f14 : 0x14141f, 1).fillRect(cx, this.yIcones, this.cel, this.cel);
    g.lineStyle(2, aceso ? 0xf2c14e : 0x39415c, 1);
    g.strokeRect(cx + 1, this.yIcones + 1, this.cel - 2, this.cel - 2);
    /* Quem não pode pagar apaga NA GRADE, e não numa mensagem depois de
       escolher: escolher pra descobrir que não dá é o mesmo erro da
       lista de frases, só que mais lento. */
    this.sprites[i].setAlpha(pode ? 1 : 0.3);
  }
  var sel = ITENS[this.itens[this.sel]];
  var pode = GameState.dinheiro >= sel.preco;
  this.tNome.setText(sel.nome);
  this.tPreco.setText('R$ ' + sel.preco.toFixed(2).replace('.', ','));
  /* o preço fica vermelho quando não dá, e o nome não: nome vermelho lê
     como "produto ruim", preço vermelho lê como "você não tem" */
  this.tPreco.setColor(pode ? PAL.verde : PAL.vermelho);
  var ef = [];
  if (sel.descanso) {
    var d = sel.descanso;
    if (sel.noCalor && estaCalor()) d = Math.round(d * sel.noCalor);
    ef.push('+' + d + ' DESCANSO');
  }
  if (sel.carisma) ef.push('+' + sel.carisma + ' CARISMA');
  if (sel.coracao) ef.push('+1 CORAÇÃO');
  // um efeito por linha: duas frases curtas centradas leem melhor que
  // uma frase longa quebrada no meio de uma palavra
  this.tEfeito.setText(ef.join('\n'));
};
MenuComida.prototype.update = function () {
  if (!this.ativo) return;
  if (Ctrl.leftJust) { this.sel = (this.sel + this.itens.length - 1) % this.itens.length; sfx('catraca'); this.redesenha(); }
  if (Ctrl.rightJust) { this.sel = (this.sel + 1) % this.itens.length; sfx('catraca'); this.redesenha(); }
  if (Ctrl.backJust) { var ao = this.aoFechar; this.fecha(); if (ao) ao(); return; }
  if (Ctrl.actJust) { if (this.ignora) this.ignora = false; else this.compra(); }
};
MenuComida.prototype.compra = function () {
  var it = ITENS[this.itens[this.sel]];
  var r = GameState.guarda(this.itens[this.sel]);
  if (r === 'falta') { sfx('nao'); this.redesenha(); return; }
  sfx('moeda');
  if (this.scene._deAmbulante) Missoes.conta('ambulante', { estacao: GameState.estacaoAtual() });
  var sc = this.scene, ao = this.aoFechar;
  this.fecha();
  var msg = it.nome + ' NA MOCHILA.\nUSE PELO CELULAR.';
  fala(sc, msg, []);
  sc.time.delayedCall(1300, function () { if (sc.dialog) sc.dialog.fecha(); });
  if (ao) ao();
};
MenuComida.prototype.fecha = function () {
  if (!this.ativo) return;
  this.ativo = false;
  this.g.destroy(); this.gSel.destroy();
  /* Cada objeto criado no construtor tem que morrer aqui. O preco e o
     rodape nasceram na versao grande do menu e nao entraram nesta lista:
     a caixa, o titulo, o nome, o efeito e os icones sumiam e esses dois
     ficavam boiando na tela pra sempre — foi o "R$ 12,00 do dogao" que
     aparecia numa barraca que nem vende dogao. */
  this.tTitulo.destroy(); this.tNome.destroy(); this.tEfeito.destroy();
  this.tPreco.destroy(); this.tRodape.destroy();
  for (var i = 0; i < this.sprites.length; i++) this.sprites[i].destroy();
  for (i = 0; i < this.zonas.length; i++) this.zonas[i].destroy();
  if (this.scene.dialog === this) this.scene.dialog = null;
  if (this.scene._menuComida === this) this.scene._menuComida = null;
};

/* ---------- o quadro de mapa da parede ----------
   Toda estacao de verdade tem um: um quadro grande com a rede inteira,
   parado na parede, que ninguem olha andando e todo mundo para pra ler
   quando esta perdido. E isso que ele e aqui — o mapa do bolso responde
   a mesma pergunta, mas o celular custa tempo e atencao, e o quadro esta
   ali de graca pra quem passa do lado.

   O desenho e o MESMO `desenhaMapaRede` do celular. Duas geometrias
   diferentes pro mesmo mapa seria o jogador aprendendo o desenho duas
   vezes, e o quadro da parede e justamente onde ele aprende primeiro.

   A caixa: x de 40 a 280 e y de 150 a 450. Sao os numeros que fazem os
   nomes caberem sem prender — BARRA FUNDA tem 132px comecando em 40, e
   JABAQUARA tem 108 centrado no tronco Azul, que cai em x=110.

   O quadro se fecha no mesmo botao que abriu. Sem o `ignora` o pulso do
   dedo que o abriu chegava no primeiro update e fechava na cara. */
function MapaParede(scene) {
  this.scene = scene;
  this.ativo = true;
  this.ignora = true;
  var l = GameState.linhaAtual();
  var g = scene.add.graphics().setDepth(3200).setScrollFactor(0);
  this.g = g;
  this.textos = [];
  var eu = this;
  function poeTxt(t, x, y, cor, tam) {
    var o = txt(scene, x, y, t, cor, tam || 8).setDepth(3201).setScrollFactor(0);
    eu.textos.push(o);
    return o;
  }

  // o veu: parar pra ler o mapa e parar de olhar pra frente
  g.fillStyle(0x05050a, 0.88).fillRect(0, 0, GW, GH);

  /* A chapa, com a tarja da linha no alto. E a gramatica de placa do
     resto do jogo: chapa escura, tarja da cor em cima. */
  g.fillStyle(0x0d1018, 1).fillRect(16, 56, GW - 32, 470);
  g.lineStyle(2, 0x2a3550, 1).strokeRect(16, 56, GW - 32, 470);
  g.fillStyle(l.num, 1).fillRect(16, 56, GW - 32, 26);
  poeTxt('MAPA DA REDE', 160, 60, PAL.branco).setOrigin(0.5, 0);

  /* 272 de altura e nao 300: com 300 a ponta sul caia em y=450 e o
     JABAQUARA saia em 456, quatro pixels acima do AQUI: — os dois textos
     encostavam e liam-se como uma linha so. Encolher o desenho e o certo
     aqui: o rodape diz onde voce esta, e nao da pra empurrar pra baixo
     sem sair da chapa. */
  desenhaMapaRede(g, 40, 146, 240, 272, {
    eu: GameState.estacaoAtual(),
    linhaEu: GameState.linha,
    alvo: GameState.destinoFinal(),
    lim: [22, GW - 22],
    rotula: function (t, x, y, cor) { poeTxt(t, x, y, cor); }
  });

  /* O rodape do quadro diz as duas coisas que o desenho nao escreve: o
     nome de onde voce esta (o anel branco marca o ponto e nao o nomeia)
     e o que falta pro proximo alvo. */
  poeTxt('AQUI: ' + GameState.estacaoAtual(), 160, 462, PAL.branco).setOrigin(0.5, 0);
  poeTxt(GameState.faltamEstacoes() + ' ATÉ ' + GameState.alvoAtual(), 160, 484, PAL.verde)
    .setOrigin(0.5, 0);
  // dentro da chapa: solto no veu ele parecia texto perdido na tela
  poeTxt(nomeAgir() + ' PRA SAIR', 160, 504, PAL.cinzaEsc).setOrigin(0.5, 0);
}

MapaParede.prototype.update = function () {
  if (!this.ativo) return;
  if (Ctrl.backJust) { this.fecha(); return; }
  if (Ctrl.actJust) { if (this.ignora) this.ignora = false; else this.fecha(); }
};

MapaParede.prototype.fecha = function () {
  if (!this.ativo) return;
  this.ativo = false;
  this.g.destroy();
  for (var i = 0; i < this.textos.length; i++) this.textos[i].destroy();
  if (this.scene.dialog === this) this.scene.dialog = null;
};

function abreMapaParede(scene) {
  if (scene.dialog) scene.dialog.fecha();
  scene.dialog = new MapaParede(scene);
  Missoes.conta('mapaParede');
  sfx('ok');
  return scene.dialog;
}

/* ---------- o treino: saber quando o minigame acabou ----------
   Estação e vagão, abertos pela tela de minigames, montam o minigame e
   vigiam três fases: esperando (armado, ninguém encostou), rodando e
   acabou. Acabou por 1,8s, eles devolvem o jogador pra lista. O 1,8s é
   o tempo de ler o resultado: voltar no mesmo quadro em que o minigame
   fecha apagava o "ENTROU" antes de alguém ler.

   Se durante o "acabou" alguma coisa voltar a rodar — o flagra da
   catraca termina num diálogo depois da animação — a vigia volta pra
   "rodando". O fim é o fim de tudo, não do primeiro pedaço.

   Uma função só pras duas cenas: duas contas da mesma coisa saem de
   sincronia na primeira mudança. */
function vigiaTreino(cena, dt, emCurso) {
  if (!cena.treino || cena.treinoFase === 'voltando') return;
  var rodando = !!emCurso.call(cena);
  if (cena.treinoFase === 'esperando') {
    if (rodando) cena.treinoFase = 'rodando';
  } else if (cena.treinoFase === 'rodando') {
    if (!rodando) { cena.treinoFase = 'acabou'; cena.treinoT = 0; }
  } else if (cena.treinoFase === 'acabou') {
    if (rodando) { cena.treinoFase = 'rodando'; return; }
    cena.treinoT += dt;
    if (cena.treinoT > 1800) voltaProTreino(cena);
  }
}

function voltaProTreino(cena) {
  cena.treinoFase = 'voltando';
  cena.scene.start('Treino', { volta: GameState.treino });
}

/* ---------- o celular sai do bolso ----------
   Abrir o ZipZap era um corte seco: você apertava e a tela do aparelho
   aparecia, sem o boneco ter feito nada. No mundo ninguém tem o celular
   na cara de repente: a mão vai no bolso, o aparelho sobe, a tela acende.
   Agora é isso que acontece ANTES de o ZipZap abrir, e o caminho inverso
   depois que ele fecha: o aparelho desce e volta pro bolso.

   Desenhado e não animado em quadro: a folha de sprites não tem pose de
   celular, e um retângulo de 5x8 com a tela acendendo, subindo do quadril
   até o rosto, já diz "pegou o celular" num boneco de 32x48. A luz da
   tela no rosto, no fim da subida, é o que separa pegar de só segurar.

   380ms pra subir e 300 pra descer: mais que isso e abrir o celular vira
   espera; menos, e o olho não acompanha o aparelho saindo do bolso. */
var CELULAR_SOBE = 380, CELULAR_DESCE = 300;
function celularNoMundo(cena, ator, sobe, aoFim) {
  if (!cena || !cena.tweens || !ator || !ator.sp || !ator.sp.active) { if (aoFim) aoFim(); return; }
  var c = cena._celular;
  if (!c) c = cena._celular = { g: cena.add.graphics(), p: sobe ? 0 : 1, tw: null };
  if (c.tw) { c.tw.stop(); c.tw = null; }
  var desenha = function () {
    var g = c.g, p = c.p;
    if (!g || !g.scene) return;
    g.clear();
    if (!ator.sp || !ator.sp.active) return;
    g.setDepth(ator.sp.depth + 1);
    var x = Math.round(ator.sp.x + 7 - 6 * p);      // do bolso, do lado, pro meio do corpo
    var y = Math.round(ator.sp.y - 16 - 18 * p);    // do quadril pro rosto
    g.fillStyle(0x16161e, 1).fillRect(x - 2, y - 4, 5, 8);
    g.fillStyle(0x6fe3ff, 0.25 + 0.75 * p).fillRect(x - 1, y - 3, 3, 5);
    if (p > 0.85) g.fillStyle(0x6fe3ff, 0.14 * p).fillRect(x - 5, y - 9, 11, 13);
  };
  c.tw = cena.tweens.add({
    targets: c, p: sobe ? 1 : 0,
    duration: sobe ? CELULAR_SOBE : CELULAR_DESCE,
    ease: sobe ? 'Cubic.easeOut' : 'Cubic.easeIn',
    onUpdate: desenha,
    onComplete: function () {
      c.tw = null;
      desenha();
      if (!sobe) { c.g.destroy(); cena._celular = null; }
      if (aoFim) aoFim();
    }
  });
  desenha();
}

function abreBarraca(scene, titulo, cardapio, aoFechar, deAmbulante) {
  // quem vende importa pras missões: barraca é barraca, ambulante é ambulante
  scene._deAmbulante = !!deAmbulante;
  /* ---------- o preço fantasma ----------
     Apareceu R$ 12,00 do dogão por cima do R$ 3,00 da água, numa barraca
     que nem vende dogão: era um menu anterior cujos textos não morreram.
     Fechar pelo `scene.dialog` não basta, porque entre um menu e outro
     esse campo passa por um Dialog comum (a fala do "deu uma segurada") e
     a referência ao menu se perde — os objetos ficam na cena, invisíveis
     pra quem só olha o `dialog`.
     Agora a cena guarda o último menu e mata ESSE, sempre. */
  if (scene.dialog) scene.dialog.fecha();
  if (scene._menuComida) scene._menuComida.fecha();
  scene._menuComida = new MenuComida(scene, titulo, cardapio, aoFechar);
  scene.dialog = scene._menuComida;
  return scene.dialog;
}

function abreBarracaAntiga(scene, titulo, cardapio, aoFechar) {
  var ops = [], i;
  for (i = 0; i < cardapio.length; i++) {
    (function (chave) {
      var it = ITENS[chave];
      var quanto = it.preco.toFixed(2).replace('.', ',');
      var etiqueta = it.nome + '  R$ ' + quanto;
      if (it.noCalor && estaCalor()) etiqueta += '  (CALOR)';
      ops.push({
        label: etiqueta, cb: function () {
          var r = GameState.consome(chave);
          if (r === 'falta') { sfx('nao'); fecha(scene, 'Não dá. Falta grana.'); return; }
          sfx('moeda');
          fecha(scene, r === 'coracao'
            ? it.nome + ' na veia.\nVocê recuperou um coração.'
            : it.nome + '. Deu uma segurada.');
        }
      });
    })(cardapio[i]);
  }
  ops.push({ label: 'Deixa pra lá', cb: function () { if (aoFechar) aoFechar(); } });
  fala(scene, titulo, ops);

  function fecha(sc, msg) {
    fala(sc, msg, []);
    sc.time.delayedCall(1300, function () { if (sc.dialog) sc.dialog.fecha(); });
    if (aoFechar) aoFechar();
  }
}

function fala(scene, texto, opcoes, cfg) {
  if (scene.dialog) scene.dialog.fecha();
  scene.dialog = new Dialog(scene, texto, opcoes, cfg);
  return scene.dialog;
}

/* ---------- HUD ---------- */
/* ---------- o HUD em blocos ----------
   'Tem que ficar mais subdividido.' Era tudo solto numa faixa escura:
   corações, duas barras sem nome, a hora e dois ícones boiando. Agora
   são quatro blocos com moldura, cada um com um assunto: VOCÊ (vida e
   os dois medidores, cada um com o seu ícone), QUANDO (a hora grande, e
   embaixo a faixa do horário e o dia), e os dois botões, pausa e
   celular, cada um no seu quadrado. */
/* Tudo em cima, os quatro blocos numa fileira só: a pausa e o celular
   chegaram a descer pro canto de baixo, e ficou melhor aqui, perto do
   resto ('o HUD localizado em cima, tudo, ficava melhor'). */
/* Redistribuído com a bateria: o bloco de você cresceu 18px pra pilha e
   a porcentagem respirarem depois dos corações; a hora ('06:45', 60px)
   cabe folgada em 86, e os dois botões encolheram 4 cada. */
var HUDB = {
  voce: { x: 4, y: 3, w: 150, h: 43 },
  hora: { x: 158, y: 3, w: 86, h: 43 },
  pausa: { x: 248, y: 3, w: 30, h: 43 },
  zap: { x: 282, y: 3, w: 34, h: 43 }
};
function blocoHud(g, b, aceso) {
  g.fillStyle(0x151522, 1).fillRoundedRect(b.x, b.y, b.w, b.h, 5);
  g.lineStyle(1, aceso ? 0x3d5180 : 0x262638, 1).strokeRoundedRect(b.x + 0.5, b.y + 0.5, b.w - 1, b.h - 1, 5);
  g.fillStyle(0xffffff, 0.04).fillRect(b.x + 3, b.y + 1, b.w - 6, 1);
}

var HudScene = new Phaser.Class({
  Extends: Phaser.Scene,
  initialize: function HudScene() { Phaser.Scene.call(this, { key: 'Hud', active: false }); },

  create: function () {
    /* duas linhas, quatro âncoras fixas: onde está a estação hoje
       fica sempre no mesmo canto, e o número nunca dança de lugar */
    this.g = this.add.graphics().setDepth(1000);
    /* Duas linhas e nada de sobra. O que saiu daqui:

       - o relógio aparecia duas vezes, uma no HUD e outra na tarja de
         faixa logo abaixo, com o mesmo número;
       - o contador '#estações' era placar de quando o jogo não tinha
         destino. Hoje o placar é em dias, e o número não queria dizer
         mais nada;
       - a tarja de faixa era uma terceira barra empilhada. O nome da
         faixa continua aparecendo — só quando ela vira, que é quando
         importa — e a cor dela pinta o relógio.

       Com o espaço que sobrou os dois medidores ficaram 80px em vez de
       54, que é a diferença entre ler e adivinhar. */
    /* Medido, não estimado: com o nome de estação mais longo sobravam 4
       pixels até os corações, e do dia 10 em diante o relógio ganhava um
       dígito ('D10 07:22') e passava 9 pixels POR CIMA do último
       coração. Três coisas disputavam a primeira linha.

       Agora a linha de cima tem duas: onde você está e quando. Os
       corações desceram pra segunda linha, na esquerda, e os dois
       medidores encolheram de 80 pra 66 — ainda bem acima dos 54 de
       antes, que eram os de adivinhar. O botão de pausa subiu pro canto
       de cima, que é onde a mão procura, e liberou o vão que ele
       ocupava entre o medidor e a grana.

       As letras 'C' e 'D' saíram. Uma letra solta de 12 pixels não diz
       carisma nem descanso: lia como um borrão ao lado da barra. Quem
       quiser conferir o que é cada cor tem a legenda na pausa. */
    var eu = this;
    // a zona de toque é maior que o desenho: dedo não acerta 12 pixels
    this.zonaPausa = this.add.zone(HUDB.pausa.x - 2, HUDB.pausa.y - 2, HUDB.pausa.w + 4, HUDB.pausa.h + 4).setOrigin(0, 0).setInteractive();
    this.zonaPausa.on('pointerdown', function () { eu.abrePausa(); });

    /* A alça do celular, no canto direito da segunda linha. Grana e dia
       moravam no topo e foram pra dentro dele: eram as duas coisas que
       não mudam nenhuma decisão no meio de um vagão, e eram justamente
       as que espremiam o resto. */
    this.zonaZap = this.add.zone(HUDB.zap.x - 2, HUDB.zap.y - 2, GW - HUDB.zap.x + 2, HUDB.zap.h + 4).setOrigin(0, 0).setInteractive();
    /* A alça LIGA E DESLIGA. Quem abre o celular tocando aqui tenta
       fechá-lo tocando aqui de novo — é o que qualquer aplicativo faz — e
       antes esse toque não fazia nada, o que dava exatamente a sensação
       de estar preso dentro do aparelho. O ZipZap não põe zona de toque
       em cima da alça justamente pra este toque ter um dono só. */
    this.zonaZap.on('pointerdown', function () {
      var z = eu.scene.manager.getScene('Zap');
      if (z && eu.scene.isActive('Zap')) { z.fecha(); return; }
      eu.abreZap();
    });

    /* A estação saiu daqui. O topo não é lugar de dizer onde você está:
       quem diz é o letreiro do vagão, que é onde se olha na vida real, e
       quem perdeu o letreiro tem o mapinha no celular. Com ela fora, a
       primeira linha ficou com uma coisa só — a hora — e o topo parou de
       ser uma fileira de informação disputando espaço. */
    this.tHora = txtC(this, HUDB.hora.x + HUDB.hora.w / 2, HUDB.hora.y + 1, '', PAL.amarelo, 8).setDepth(1001);
    this.tBatHud = txt(this, HUDB.voce.x + 114, HUDB.voce.y + 3, '', PAL.branco, 8)
      .setScale(ESCALA_TEXTO / 2).setDepth(1001);
    this.tSemBat = txtC(this, HUDB.zap.x - 7, HUDB.zap.y + HUDB.zap.h + 7, 'SEM BATERIA', PAL.branco, 8)
      .setScale(ESCALA_TEXTO / 2).setDepth(1001).setVisible(false);
    this.avisoZap = 0;
    // embaixo da hora, pequeno: a faixa do horário e o dia
    this.tFaixa = txtC(this, HUDB.hora.x + HUDB.hora.w / 2, HUDB.hora.y + 25, '', PAL.cinza, 8)
      .setScale(ESCALA_TEXTO / 2).setDepth(1001);
    /* Frase que não cabe no bloco roda, como letreiro de LED: recortada
       na largura de dentro do bloco, ela passa da direita pra esquerda
       e volta pelo começo. Frase que cabe fica parada, no meio. */
    var mf = this.make.graphics({ add: false });
    mf.fillStyle(0xffffff, 1).fillRect(HUDB.hora.x + 6, HUDB.hora.y + 22, HUDB.hora.w - 12, 18);
    this.tFaixa.setMask(mf.createGeometryMask());
    this._faixaTxt = null;
    this.montaToque();
  },

  /* O letreiro rolante, como o painel de LED do trem: a frase roda
     sempre, da direita pra esquerda ('deixa ela rodando que nem um cartaz
     interativo'). Ela é escrita três vezes com um vão, e desliza um
     comprimento: a volta não pula, e o bloco nunca fica vazio. */
  letreiro: function (t, frase, bloco, time) {
    if (this._faixaTxt !== frase) {
      this._faixaTxt = frase;
      t.setOrigin(0, 0).setText(frase);
      t._passo = t.width + 30;                     // o vão: 5 espaços a 6px
      t.setText(frase + '     ' + frase + '     ' + frase);
    }
    t.setX(bloco.x + 6 - ((time * 0.03) % t._passo));
  },

  /* o toque precisa existir em toda tela, inclusive no título, por isso
     esta cena sobe junto com o jogo e nunca é desligada */
  montaToque: function () {
    TOQUE_ATIVO = this.sys.game.device.input.touch;
    var self = this;

    // dois dedos: um anda e o outro age, ao mesmo tempo
    this.input.addPointer(2);

    this.input.on('pointerdown', function (p) {
      /* O SEGUNDO dedo vira o botão, venha de onde vier. Era
         `p.x >= LADO_ACAO`: o lado da tela mandava, o que de duas mãos
         dava no mesmo e de uma mão tirava metade do jogo. */
      if (dividirTela() && CONTROLES_VISIVEIS && TOQUE.ativo) {
        TOQUE_DIR.ativo = true; TOQUE_DIR.id = p.id;
        TOQUE_DIR.x = p.x; TOQUE_DIR.y = p.y; TOQUE_DIR.t0 = self.time.now;
        return;
      }
      TOQUE.ativo = true; TOQUE.id = p.id; TOQUE.arrastando = false;
      TOQUE.ox = TOQUE.x = p.x; TOQUE.oy = TOQUE.y = p.y;
      TOQUE.dx = TOQUE.dy = 0;
      TOQUE.t0 = self.time.now;
    });
    this.input.on('pointermove', function (p) {
      if (!p.isDown) return;
      if (TOQUE_DIR.ativo && p.id === TOQUE_DIR.id) { TOQUE_DIR.x = p.x; TOQUE_DIR.y = p.y; return; }
      if (TOQUE.ativo && p.id === TOQUE.id) { TOQUE.x = p.x; TOQUE.y = p.y; }
    });
    this.input.on('pointerup', function (p) {
      if (TOQUE_DIR.ativo && p.id === TOQUE_DIR.id) {
        /* quem confirma o toque curto é a soltura: um toque pode nascer
           e morrer dentro do mesmo quadro */
        TOUCH.pulso = true;
        TOQUE_DIR.ativo = false; TOQUE_DIR.id = -1;
        TOUCH.act = false;
        return;
      }
      if (TOQUE.ativo && p.id !== TOQUE.id) return;
      /* Tocou e soltou sem arrastar é o Z, em qualquer lugar da tela.
         A condição exigia a metade direita, e era ela que fazia o toque
         na metade esquerda não valer nada. */
      if (TOQUE.ativo && !TOQUE.arrastando) TOUCH.pulso = true;
      TOQUE.ativo = false; TOQUE.id = -1; TOQUE.arrastando = false;
      TOUCH.up = TOUCH.down = TOUCH.left = TOUCH.right = false;
    });

    this.gManche = this.add.graphics().setDepth(1200);
    this.gSono = this.add.graphics().setDepth(999);
  },

  abrePausa: function () {
    if (this.scene.isActive('Pausa') || this.scene.isActive('Zap')) return;
    if (!HUD_VISIVEL && !GameState.char) return;   // no título não há o que pausar
    audioOn();
    this.scene.launch('Pausa');
  },

  /* Abrir o celular é parar de olhar pra frente: o jogo congela e o
     boneco baixa a cabeça pro aparelho. */
  abreZap: function () {
    if (this.scene.isActive('Zap') || this.scene.isActive('Pausa') || this.pegandoCelular) return;
    if (!GameState.char || !HUD_VISIVEL) return;
    if (GameState.bateria !== undefined && GameState.bateria <= 0) {
      sfx('nao');
      this.avisoZap = 1600;          // o botão pisca "SEM BATERIA"
      return;
    }
    audioOn();
    var cenas = this.scene.manager.getScenes(true), alvo = null;
    for (var i = 0; i < cenas.length; i++) {
      var c = cenas[i];
      if (c.pl && c.pl.sp && c.pl.sp.active) {
        alvo = c;
        if (!c.sentadoEm) { c.pl.dir = 'down'; c.pl.anima(0, false); }
      }
    }
    if (typeof TUTORIAL !== 'undefined') TUTORIAL.viuZap = true;
    if (!alvo) { this.scene.launch('Zap'); return; }
    /* Primeiro o aparelho sai do bolso, no mundo; só então a tela abre.
       Não pega dois celulares ao mesmo tempo. Se a pausa abrir no meio da
       subida, ela congela a subida junto com o jogo, e ao sair da pausa o
       aparelho termina de subir e o ZipZap abre — medido assim, e é o que
       a pessoa tinha pedido. A checagem de Pausa/Zap no fim fica de
       guarda. E se a cena morrer no meio (embarcou, desceu), o relógio do
       HUD libera o celular: senão ele ficaria "sendo pego" pra sempre. */
    var eu = this;
    this.pegandoCelular = true;
    this.time.delayedCall(CELULAR_SOBE + 400, function () { eu.pegandoCelular = false; });
    celularNoMundo(alvo, alvo.pl, true, function () {
      eu.pegandoCelular = false;
      if (eu.scene.isActive('Pausa') || eu.scene.isActive('Zap')) celularNoMundo(alvo, alvo.pl, false);
      else eu.scene.launch('Zap');
    });
  },

  /* ---------- as pálpebras ---------- */
  /* Dormir era um número que zerava e uma tela de fim de jogo: o
     jogador só descobria a regra depois de perder por ela. As
     pálpebras contam a mesma coisa sem texto — quanto menos descanso,
     mais elas descem, e de vez em quando piscam. Moram no HUD porque é
     a única cena que fica por cima de todas as outras, e param acima
     da faixa de dica, que é justamente quem manda sentar. */
  /* Ficou a moldura, não a pálpebra: uma borda vermelha pulsando nas
     quatro beiradas diz 'você está no vermelho' sem tirar um pixel da
     área de jogo. A cobrança de verdade é em coração (ver cobraSono). */
  pintaSono: function (time) {
    var gs = this.gSono; gs.clear();
    if (!GameState.char || !HUD_VISIVEL) return;
    var p = GameState.descanso / GameState.char.descansoMax;
    if (p >= LIMIAR_SONO) return;

    var f = (LIMIAR_SONO - p) / LIMIAR_SONO;         // 0 na marca, 1 no fundo
    var pulso = 0.5 + 0.5 * Math.sin(time / 420);
    var a = (0.12 + 0.3 * f) * (0.55 + 0.45 * pulso);
    var topo = AREA_JOGO.topo || HUD_H, base = AREA_JOGO.base || (GH - 40);
    var esp = 4 + Math.round(8 * f);
    gs.fillStyle(0xe8362c, a);
    gs.fillRect(0, topo, GW, esp);
    gs.fillRect(0, base - esp, GW, esp);
    gs.fillRect(0, topo, esp, base - topo);
    gs.fillRect(GW - esp, topo, esp, base - topo);
    gs.fillStyle(0xe8362c, a * 0.4);
    gs.fillRect(0, topo + esp, GW, 3);
    gs.fillRect(0, base - esp - 3, GW, 3);
  },

  update: function (time) {
    atualizaManche(time);
    if (Ctrl.pausaJust) { Ctrl.pausaJust = false; this.abrePausa(); }

    /* o manche só existe enquanto o dedo está arrastando: parado na tela,
       nada é desenhado, e é isso que devolve o rodapé pro jogo */
    var m = this.gManche; m.clear();
    if (TOQUE.ativo && TOQUE.arrastando && CONTROLES_VISIVEIS) {
      m.fillStyle(0x08080e, 0.3).fillCircle(TOQUE.ox, TOQUE.oy, MANCHE.raio + 7);
      m.lineStyle(2, 0xf2f0ff, 0.2).strokeCircle(TOQUE.ox, TOQUE.oy, MANCHE.raio);
      m.fillStyle(0xf2f0ff, 0.5).fillCircle(TOQUE.ox + TOQUE.dx, TOQUE.oy + TOQUE.dy, 9);
      m.fillStyle(0x08080e, 0.5).fillCircle(TOQUE.ox + TOQUE.dx, TOQUE.oy + TOQUE.dy, 3);
    }
    // e o dedo da direita ganha um anel: sem retorno, toque não parece toque
    if (TOQUE_DIR.ativo) {
      m.lineStyle(2, 0xf2c14e, 0.55).strokeCircle(TOQUE_DIR.x, TOQUE_DIR.y, 15);
      m.fillStyle(0xf2c14e, 0.18).fillCircle(TOQUE_DIR.x, TOQUE_DIR.y, 13);
    }

    this.pintaSono(time);

    var g = this.g; g.clear();
    var temJogo = !!GameState.char && HUD_VISIVEL;
    this.tHora.setVisible(temJogo);
    this.tFaixa.setVisible(temJogo);
    this.tBatHud.setVisible(temJogo);
    if (!temJogo) return;

    var f = GameState.faixa();
    /* o painel do desktop mostra hora e faixa na beirada; era a tarja
       que alimentava essa ponte, e ela saiu do jogo */
    if (PAINEL) PAINEL.hora(GameState.hora(), f);

    var l = GameState.linhaAtual();
    g.fillStyle(0x0a0a12, 1); g.fillRect(0, 0, GW, HUD_H);
    g.fillStyle(l.num, 1); g.fillRect(0, HUD_H - 4, GW, 4);
    g.fillStyle(num(clarear(l.cor, 0.35)), 1); g.fillRect(0, HUD_H - 4, GW, 1);
    blocoHud(g, HUDB.voce); blocoHud(g, HUDB.hora); blocoHud(g, HUDB.pausa, true); blocoHud(g, HUDB.zap, true);

    /* Coração é desenho, não letra: cinco letras 'V' não leem como
       vida, e a fonte não tem o glifo. Eles abrem a segunda linha, que
       é a linha do seu estado — vida, carisma, descanso e grana. */
    for (var c = 0; c < CORACOES_POR_PERNA; c++) {
      // passo 14 e não 12: com 3 pixels entre um e outro os cinco liam
      // como um borrão vermelho só, em vez de cinco vidas
      /* Os corações subiram pra primeira linha. Com a estação fora do
         topo, a linha de cima tinha uma coisa só (a hora) e a de baixo
         tinha tudo — e duas linhas desequilibradas leem tão apertado
         quanto uma linha cheia. Agora é vida em cima, medidores
         embaixo, e um vão de verdade entre elas. */
      var hx = HUDB.voce.x + 6 + c * 14, hy = HUDB.voce.y + 5;
      var sobra = GameState.coracoes - c;
      // o guardinha menorzinho tira meio coração: metade acesa, metade não
      var meio = (sobra > 0 && sobra < 1);
      g.fillStyle(sobra >= 1 || meio ? 0xe8362c : 0x2a2a3c, 1);
      g.fillRect(hx, hy + 1, 3, 5);
      g.fillRect(hx + 1, hy, 4, 4); g.fillRect(hx + 1, hy + 5, 4, 2);
      g.fillRect(hx + 2, hy + 7, 3, 1); g.fillRect(hx + 3, hy + 8, 2, 1);
      g.fillStyle(sobra >= 1 ? 0xe8362c : 0x2a2a3c, 1);
      g.fillRect(hx + 6, hy + 1, 3, 5);
      g.fillRect(hx + 5, hy, 3, 4); g.fillRect(hx + 5, hy + 5, 3, 2);
      g.fillRect(hx + 5, hy + 7, 2, 1); g.fillRect(hx + 5, hy + 8, 1, 1);
      if (sobra >= 1 || meio) g.fillStyle(0xff8a80, 1).fillRect(hx + 1, hy, 2, 2);
    }

    // o ícone de pausa: duas barrinhas no meio do botão dele
    var px = HUDB.pausa.x + HUDB.pausa.w / 2, py = HUDB.pausa.y + HUDB.pausa.h / 2;
    g.fillStyle(0xb8bccc, 1);
    g.fillRect(px - 6, py - 7, 4, 14); g.fillRect(px + 2, py - 7, 4, 14);

    this.tHora.setText(GameState.hora()).setColor(f.cor);
    this.letreiro(this.tFaixa, GameState.explorar ? 'MODO EXPLORAR - SEM PRESSA' : f.nome + ' - DIA ' + (GameState.dia || 1), HUDB.hora, time);

    /* O celular: um retângulo com tela, e a bolinha vermelha de não
       lidas por cima. É a linguagem de qualquer aparelho — quem vê
       bolinha vermelha sabe que tem recado esperando. */
    var zx = HUDB.zap.x + 9, zy = HUDB.zap.y + 10;
    /* ---------- mensagem nova ----------
       'Barulho de celular e o celular vibrando na tela, pro jogador
       entender que tem que acessar o celular.' Chegou mensagem: o toque de
       notificação, o aparelho de verdade vibra (quando o navegador
       deixa), e o celular do HUD treme por um segundo e meio com as
       ondinhas de vibração dos dois lados. */
    if (time - (this._tZapChk || 0) > 500) {
      this._tZapChk = time;
      if (GameState.char && typeof entregaZap === 'function' && entregaZap() > 0) {
        this.vibraZap = 1500;
        tocaNotificacao();
        try { if (navigator.vibrate) navigator.vibrate([120, 80, 120]); } catch (e) { }
      }
    }
    if (this.vibraZap > 0) {
      this.vibraZap -= 16;
      zx += Math.round(Math.sin(time / 22) * 2);
      var ondas = Math.floor(time / 90) % 2;
      g.lineStyle(2, 0xf2c14e, 0.9);
      g.beginPath(); g.arc(zx + 8, zy + 11, 14 + ondas * 3, Math.PI * 0.75, Math.PI * 1.25); g.strokePath();
      g.beginPath(); g.arc(zx + 8, zy + 11, 14 + ondas * 3, -Math.PI * 0.25, Math.PI * 0.25); g.strokePath();
    }
    g.fillStyle(0x2c2c3a, 1).fillRect(zx, zy, 16, 22);
    g.fillStyle(0x0d1a14, 1).fillRect(zx + 2, zy + 3, 12, 15);
    g.fillStyle(0x00e676, 0.75).fillRect(zx + 3, zy + 5, 10, 2);
    g.fillStyle(0x00e676, 0.45).fillRect(zx + 3, zy + 9, 7, 2);
    g.fillStyle(0x4a4a5e, 1).fillRect(zx + 6, zy + 19, 4, 1);
    if (naoLidas(GameState.zap)) {
      g.fillStyle(0xe8362c, 1).fillCircle(zx + 15, zy + 3, 5);
      g.fillStyle(0xffffff, 1).fillRect(zx + 14, zy + 1, 2, 4);
    }
    /* ---------- a bateria ----------
       No bloco de cima, na linha dos corações e à direita deles: é o
       estado do celular junto com o seu estado, onde se olha. Um ícone de
       pilha com a carga e a porcentagem; verde, amarela, e vermelha
       piscando no fim ('tem que ser melhor localizada': no tracinho
       embaixo do botão ninguém achava). */
    var bt = Math.max(0, Math.min(1, (GameState.bateria === undefined ? 100 : GameState.bateria) / 100));
    var corB = bt > 0.5 ? 0x00e676 : (bt > 0.15 ? 0xf2c14e : 0xe8362c);
    var pisca = bt <= 0.15 && Math.floor(time / 300) % 2;
    var bx = HUDB.voce.x + 86, by = HUDB.voce.y + 5;      // depois do quinto coração, com vão
    g.fillStyle(0xb8bccc, 1).fillRect(bx, by, 20, 10).fillRect(bx + 20, by + 3, 2, 4);
    g.fillStyle(0x0a0a12, 1).fillRect(bx + 1, by + 1, 18, 8);
    if (!pisca) g.fillStyle(corB, 1).fillRect(bx + 2, by + 2, Math.max(1, Math.round(16 * bt)), 6);
    this.tBatHud.setText(Math.round(bt * 100) + '%').setColor(bt > 0.15 ? PAL.branco : PAL.vermelho);
    if (this.avisoZap > 0) {
      this.avisoZap -= 16;
      g.fillStyle(0xe8362c, 0.95).fillRoundedRect(HUDB.zap.x - 50, HUDB.zap.y + HUDB.zap.h + 4, 86, 18, 4);
    }
    this.tSemBat.setVisible(this.avisoZap > 0);
    /* ---------- os dois medidores, empilhados ----------
       Lado a lado eles disputavam a largura com os corações e com a
       alça do celular, e o que sobrava pra cada um eram 60 pixels — a
       terceira vez que este HUD ficou apertado.

       Empilhados, cada um ganha 104: quase o dobro de barra pra ler, no
       mesmo espaço. E sobra ar de verdade entre eles e o
       celular, que é o que faltava — "amontoado" nunca foi excesso de
       coisa, foi falta de vão entre as coisas.

       O de cima é sempre o carisma. Quem quiser conferir a cor tem a
       legenda na pausa. */
    /* cada medidor com o seu ícone, desenhado (letra solta lia como
       borrão): a estrela laranja é o carisma, a lua verde o descanso */
    var bx0 = HUDB.voce.x + 20, by0 = HUDB.voce.y + 20, bw0 = HUDB.voce.w - 26;
    var ix = HUDB.voce.x + 8;
    g.fillStyle(0xe8a33c, 1);
    g.fillRect(ix + 2, by0 - 2, 2, 8).fillRect(ix - 1, by0 + 1, 8, 2).fillRect(ix + 1, by0, 4, 4);
    barra(g, bx0, by0 - 1, bw0, 7, GameState.carisma / 100, 0xe8a33c);

    /* O medidor de descanso era verde até o último pixel: cheio e
       quase vazio tinham a mesma cor, e a única diferença era um
       comprimento que ninguém compara de relance. Agora ele esquenta
       conforme baixa, e pisca quando o sono está pra bater. */
    var pd = GameState.descanso / GameState.char.descansoMax;
    var cd = corDescanso(pd, time), my = by0 + 12;
    g.fillStyle(cd, 1).fillCircle(ix + 3, my + 2, 4);
    g.fillStyle(0x151522, 1).fillCircle(ix + 5, my + 1, 3.5);      // a lua: um círculo mordido
    barra(g, bx0, my - 1, bw0, 7, pd, cd);
  }
});
