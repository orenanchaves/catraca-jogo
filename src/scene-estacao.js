/* global Phaser */
/* Catraca — a estação inteira, de uma ponta à outra

   Ela era duas telas. Você andava até o alto do saguão e o jogo CORTAVA
   pra plataforma; da plataforma não dava pra voltar. Era a mesma queixa
   que gerou o trem de oito carros: o lugar acabava na borda da tela, e o
   que estava do outro lado era outra cena, não outro lugar.

   Agora é um mundo só, e a câmera anda com você. Embaixo o saguão, com a
   bilheteria, as barracas e o bloqueio; em cima a plataforma, com o
   trilho e o trem; e no meio a ESCADA ROLANTE, que é o que emenda os
   dois — o mesmo papel que o fole faz entre dois vagões. Ela é estreita
   de propósito: é onde a estação afunila, e é onde se sente que se está
   passando de um lugar pro outro.

   O saguão ficou exatamente onde estava, nas mesmas coordenadas de
   sempre. Quem se mudou foi a plataforma, que subiu pra cima dele — em y
   negativo, que não custa nada e evitou reescrever a geometria do
   saguão inteiro pra ganhar um zero de presente.

   E tem uma consequência de jogo que não é detalhe: o trem passa a
   chegar e partir ENQUANTO você está lá embaixo comprando bilhete. Dá
   pra ouvir, ver o letreiro contando, e subir correndo. Perder o trem
   por estar na fila da bilheteria é a coisa mais verdadeira que esta
   estação podia fazer. */

/* ---------- a planta da estação ---------- */
/* 900 e não 524. Uma tela de altura fazia a plataforma caber inteira na
   vista: você via a ponta de cima e a de baixo ao mesmo tempo, e andar
   nela não levava a lugar nenhum — era sempre o mesmo trecho. Com 900
   ela tem uma tela e meia larga, a câmera precisa acompanhar, e as duas
   pontas viram lugares diferentes: perto da escada e longe dela. */
var PLAT_ALT = 900;
var ESCADA_ALT = 148;            // a escada rolante entre ela e o saguão
var PLAT_Y = HUD_H - ESCADA_ALT - PLAT_ALT;   // topo da plataforma (negativo)
var ESC_Y = PLAT_Y + PLAT_ALT;                // onde a escada começa
/* o que a escada deixa passar: uma boca estreita no meio da parede do
   fundo do saguão */
/* ---------- a escada rolante ----------
   Era UMA, servindo de subida e descida ao mesmo tempo, o que nenhuma
   estação tem: escada rolante anda pra um lado só. Agora são duas lado
   a lado, a da esquerda subindo e a da direita descendo, separadas pela
   balaustrada do meio.

   O vão passou de 64 pra 96 porque duas pistas de 44 precisam caber um
   boneco de 32 cada uma. De quebra isso alivia o gargalo que obrigou a
   existir o funil: 96 numa parede de 320 ainda é aperto, mas é aperto
   de estação, não de porta de armário. */
var ESC_X0 = 112, ESC_X1 = 208;
var ESC_DIV = 8;                                  // a balaustrada do meio
var ESC_MEIO = (ESC_X0 + ESC_X1) / 2;
/* ---------- a escada ROLA ----------
   Ela era desenho: degrau parado, e subir era andar. Agora os degraus
   andam (36px/s, a 128 BPM da trilha dá um degrau por colcheia e meia) e
   levam quem está em cima, e cada escada tem as duas faixas do metrô:
   parado à DIREITA, andando pela ESQUERDA. A esquerda livre é regra de
   São Paulo, e aqui ela vale: parar nela atrapalha quem vem subindo.
   Cada pista tem 44px, duas faixas de 22: um boneco em cada, ombro com
   ombro, como na escada de verdade. */
var ESC_VEL = 36;
var ESC_BOCA = 116;     // onde o degrau some no piso do saguão
function pistaDaEscada(x) {
  for (var i = 0; i < ESC_PISTA.length; i++) {
    if (x >= ESC_PISTA[i].x0 && x <= ESC_PISTA[i].x1) return ESC_PISTA[i];
  }
  return null;
}
function faixaDaEscada(p, esquerda) { return esquerda ? p.x0 + 11 : p.x1 - 11; }

var ESC_PISTA = [
  { x0: ESC_X0, x1: ESC_MEIO - ESC_DIV / 2, sobe: true },
  { x0: ESC_MEIO + ESC_DIV / 2, x1: ESC_X1, sobe: false }
];
/* o guichê de achados e perdidos, na parede da esquerda do saguão */
/* Desceu de 296 pra 352 depois de medido na tela: a placa dele batia na
   do DOG DO CÃO, que fica na parede de frente na mesma altura. */
var ACH = { y: 352, h: 62, alcance: 64 };
/* A altura do eixo do tripé: o meio da barra que atravessava o vão
   (218..226). Cruzar esta linha andando é passar pela catraca. */
var CATRACA_Y = 222;

/* a plataforma em coordenadas do mundo: o piso vai da faixa tátil à
   parede da direita */
/* ---------- as duas plantas de plataforma ----------
   A maioria das estações é LATERAL: uma via encostada na parede de um
   lado e a plataforma do outro. A Sé não: ela é CENTRAL, você fica no
   meio e o trem vem dos dois lados. Não é enfeite — é o que torna a
   baldeação uma escolha de onde ficar em pé, e é por isso que ela é a
   estação que todo mundo reconhece de olho fechado.

   Central cabe em 320px justamente porque a plataforma some das bordas:
   duas plataformas lado a lado não caberiam, uma no meio cabe. */
var PLAT_X0 = 136, PLAT_X1 = 288;          // lateral: piso 124..296
var PLAT_C_X0 = 104, PLAT_C_X1 = 216;      // central: piso 92..228
/* Onde o par de placas de sentido se repete na plataforma central. 700
   é o pé, que é onde a escada desemboca e onde a escolha de lado
   acontece; 60 é a outra ponta. Os dois fogem do 220 e do 520, que são
   as chapas com o nome da estação. */
var DIR_PLACAS = [700, 60];
/* A gravação do trem chegando tem 20,9 s; os últimos 5 são ele entrando
   na plataforma, freando, e a porta abre quando ela termina. */
var TREM_SOM = 20900, TREM_ENTRA = 5000;
var CENTRAL = false;                        // esta estação é de plataforma central?

/* a via, a faixa tátil e a borda de um lado. lado -1 = via à esquerda do
   piso, lado +1 = via à direita. Uma função só porque a central desenha
   as duas e a lateral desenha uma: duas cópias sairiam de sincronia. */
function pintaVia(g, x0, larg, alt, lado) {
  g.fillStyle(num(PAL.brita), 1).fillRect(x0, 0, larg, alt);
  g.fillStyle(0x1e1e28, 1);
  var d0 = x0 + 16, dw = larg - 32;
  for (var y = 0; y < alt; y += 24) g.fillRect(d0, y, dw, 9);
  g.fillStyle(num(PAL.dormente), 1);
  for (var y2 = 0; y2 < alt; y2 += 24) g.fillRect(d0, y2, dw, 7);
  pontilhado(g, x0, 0, larg, alt, 0x000000, 0.25, 6);
  // dois trilhos, com o brilho de cima
  var t1 = x0 + Math.round(larg * 0.3), t2 = x0 + Math.round(larg * 0.72);
  [t1, t2].forEach(function (tx) {
    g.fillStyle(num(PAL.trilhoSom), 1).fillRect(tx, 0, 8, alt);
    g.fillStyle(num(PAL.trilho), 1).fillRect(tx, 0, 5, alt);
  });
  // a borda escura da plataforma e a faixa tátil, do lado do piso
  var bx = (lado < 0) ? x0 + larg : x0 - 8;
  g.fillStyle(0x000000, 0.6).fillRect(bx, 0, 8, alt);
  var fx = (lado < 0) ? bx + 8 : bx - 16;
  g.fillStyle(num(PAL.amareloSom), 1).fillRect(fx, 0, 16, alt);
  g.fillStyle(num(PAL.amarelo), 1).fillRect(fx + (lado < 0 ? 0 : 2), 0, 14, alt);
  g.fillStyle(num(PAL.amareloSom), 1);
  for (var yy = 4; yy < alt; yy += 12) g.fillRect(fx + 3, yy, 8, 5);
  g.fillStyle(num(PAL.amareloLuz), 1);
  for (var y3 = 4; y3 < alt; y3 += 12) g.fillRect(fx + 3, y3, 8, 2);
}

/* o piso quadriculado com o reflexo do teto */
function pintaPisoPlat(g, x0, x1, alt) {
  g.fillStyle(num(PAL.rejunte), 1).fillRect(x0, 0, x1 - x0, alt);
  for (var py = 0; py < alt; py += 16) {
    for (var px = x0; px < x1; px += 16) {
      g.fillStyle(((px / 16 + py / 16) % 2) ? 0x3f3f52 : 0x494960, 1);
      g.fillRect(px + 1, py + 1, 14, 14);
      g.fillStyle(0xffffff, 0.07).fillRect(px + 1, py + 1, 14, 2);
      g.fillStyle(0x000000, 0.16).fillRect(px + 1, py + 13, 14, 2);
    }
  }
  g.fillStyle(0xffffff, 0.05).fillRect(x0 + 26, 0, 28, alt);
  g.fillStyle(0xffffff, 0.03).fillRect(x1 - 64, 0, 20, alt);
}

/* o círculo de porta pintado no chão, com a seta apontando pra via */
function marcaDePorta(g, cx, cy, lado) {
  g.fillStyle(0x000000, 0.28).fillCircle(cx, cy, 15);
  g.fillStyle(0x000000, 0.4).fillCircle(cx, cy, 11);
  g.lineStyle(2, 0xffffff, 0.3).strokeCircle(cx, cy, 13);
  g.fillStyle(0xffffff, 0.35);
  var p = (lado < 0) ? -1 : 1;
  g.fillTriangle(cx + p * 9, cy, cx + p, cy - 6, cx + p, cy + 6);
  g.fillRect(Math.min(cx + p, cx - p * 7), cy - 2, 7, 4);
}
function platY(y) { return y + PLAT_Y - HUD_H; }   // y de tela da plataforma → mundo

/* Onde as portas do trem param, de 118 em 118. É função pura de propósito:
   a pintura da plataforma precisa das mesmas posições pra marcar o chão, e
   ela é chamada com `this` nulo pela tela de título. Duas contas da mesma
   coisa saem de sincronia na primeira mudança. */
function portasDoTrem() {
  var out = [];
  for (var p = 76; p + 52 <= PLAT_ALT - 24; p += 118) out.push(p);
  return out;
}

/* ---------- um trem por via ----------
   Era um trem só, e todo x dele estava cravado na faixa da esquerda:
   corpo em 20..108, porta em 72..108. Numa plataforma LATERAL isso
   funciona, porque só existe uma via. Na Sé, que é central, existem
   duas — e a da direita ficava com trilho, brita e faixa tátil e nunca
   nada em cima. A plataforma era cenário, não escolha.

   Cada trem sabe o LADO em que corre (-1 esquerda, +1 direita) e pra
   que sentido ele vai. Numa central os dois lados são sentidos opostos,
   e é isso que faz escolher o lado virar escolher o rumo. */
function Trem(cena, lado, dir) {
  this.lado = lado;
  this.dir = dir;
  this.portas = portasDoTrem();
  this.estado = 'espera';
  this.t = 0;
  this.perdido = false;
  this.aviso = '';
  /* Era PLAT_ALT + 80, e os 80 sobravam POR BAIXO da plataforma: o
     trem parado enfiava oitenta pixels de lata dentro da escada
     rolante. Agora ele tem o comprimento exato da plataforma, e o
     desenho ainda é recortado nela (ver pintaTrem) pra que nem durante
     a chegada e a partida ele apareça onde não cabe. */
  this.alt = PLAT_ALT;
  this.y = PLAT_Y - this.alt;
  this.g = cena.add.graphics().setDepth(20);
}

/* A beirada da plataforma deste lado: onde o trem encosta, e de onde
   toda medida do desenho é contada pra trás.

   Não pode ficar cravada em 108 como estava. A via da lateral tem 100px
   de largura e a da central tem 76, então a beirada é 108 numa e 84 na
   outra — e com o número cravado o trem da Sé entrava 24px por cima do
   piso onde se anda e cobria a faixa tátil inteira, que é justamente a
   linha que diz onde não pisar. */
function beiradaDaVia(lado) {
  var larg = CENTRAL ? 76 : 100;
  return (lado < 0) ? larg + 8 : GW - larg - 8;
}

/* Um retângulo do trem, medido em DISTÂNCIA DA BEIRADA em vez de x
   absoluto: `longe` e `perto` são o quanto ele começa e acaba pra
   dentro da via. Assim o mesmo desenho serve os dois lados — o da
   direita é o espelho — e serve as duas larguras de via sem repetir
   conta nenhuma. Distância negativa é o que avança sobre o piso, que é
   o caso do brilho da porta aberta. */
function retTrem(g, b, lado, longe, perto, y, alt) {
  g.fillRect((lado < 0) ? b - longe : b + perto, y, longe - perto, alt);
}

/* ---------- os quadros de mapa da parede ----------
   Toda estacao de verdade tem um: um quadro grande com a rede inteira,
   parado na parede, que ninguem olha andando e todo mundo para pra ler
   quando esta perdido. O celular responde a mesma pergunta, mas custa
   tempo e atencao; o quadro esta ali de graca pra quem passa do lado.

   Na plataforma sao DOIS, a 240 e a 660 dos 900 — pelo mesmo motivo do
   nome repetido na faixa: com um so, metade da plataforma nao tem mapa,
   e andar 400px pra consultar um mapa e o oposto de consultar um mapa.

   No saguao e um, na parede da ENTRADA. E onde ele fica na estacao de
   verdade, e faz sentido de jogo: e a parede que voce encara chegando da
   rua, antes da catraca, que e exatamente quando ainda da pra mudar de
   ideia sobre o caminho. */
/* 300 e 760: o nome da estação corre a mesma faixa, centrado em 150 e
   560, e o maior deles (CORINTHIANS-ITAQUERA) ocupa 240px em pé: 30..270
   e 440..680. O quadro de 660 caía em cima de um nome e cortava as
   letras. Agora cada quadro mora num vão entre nomes. */
var MAPAS_PLAT = [300, 760];
var MAPA_PLAT = { x: 298, w: 20, h: 56 };
var MAPA_SAG = { x: 196, y: 546, w: 84, h: 28 };

function quadroDeMapa(g, x, y, w, h) {
  g.fillStyle(0x000000, 0.4).fillRect(x + 2, y + 3, w, h);
  g.fillStyle(0x0d1018, 1).fillRect(x, y, w, h);
  g.fillStyle(0x2a3550, 1).fillRect(x, y, w, 2);
  g.fillStyle(0x2a3550, 1).fillRect(x, y + h - 2, w, 2);
  /* A cruz la dentro e o que faz o quadro ser um MAPA de longe. Sem ela
     e um retangulo escuro na parede, indistinguivel de porta de servico
     — e o jogador nao chega perto do que nao parece nada. */
  var cx = x + Math.round(w * 0.42), cy = y + Math.round(h * 0.5);
  g.fillStyle(LINHAS.azul.num, 1).fillRect(cx - 1, y + 6, 2, h - 12);
  g.fillStyle(LINHAS.vermelha.num, 1).fillRect(x + 4, cy - 1, w - 8, 2);
  g.fillStyle(0xf2c14e, 1).fillRect(cx - 2, cy - 2, 4, 4);
}

/* a plataforma inteira, sem cair no trilho nem entrar na parede */
function limitaPlataforma(sp) {
  sp.x = Phaser.Math.Clamp(sp.x, PLAT_X0, PLAT_X1);
  sp.y = Phaser.Math.Clamp(sp.y, platY(80), ESC_Y - 16);
}

var EstacaoScene = new Phaser.Class({
  Extends: Phaser.Scene,
  initialize: function EstacaoScene() { Phaser.Scene.call(this, { key: 'Estacao' }); },

  /* Dá pra chegar por baixo (da rua, passando pela catraca) ou por cima
     (da baldeação, ou descendo de um trem na estação errada) — e quem
     chega por cima já está dentro do sistema. */
  /* Toda chamada que abre a estação diz de onde se chega ({ onde: ... }).
     O Phaser guarda os dados do início anterior quando a chamada não traz
     nenhum: sem isto, a perna nova depois de uma baldeação nascia na
     PLATAFORMA (o { onde: 'plataforma' } da Sé ficava valendo), e o dia
     novo da Itaquera herdava o { praCasa } da volta. */
  init: function (dados) {
    this.entrada = (dados && dados.onde) || 'saguao';
    // aberta pela tela de minigames: 'empurrao' ou 'catraca'
    this.treino = (dados && dados.treino) || null;
    // desceu na Itaquera na volta: o dia só acaba na saída de casa (estacao-itaquera.js)
    this.praCasa = !!(dados && dados.praCasa);
  },

  create: function () {
    areaDeJogo();
    Ctrl.liga(this);
    HUD_VISIVEL = true; CONTROLES_VISIVEIS = true;
    this.dialog = null;
    this.fim = false;
    /* A Corinthians-Itaquera tem planta própria (src/estacao-itaquera.js):
       plataforma mais larga, passarela, saídas pra rua e mais catracas. O
       treino usa a estação de sempre, porque os minigames medem o saguão
       antigo. Decidido antes de tudo: até as catracas dependem disso. */
    this.itq = ehItaquera() && !this.treino;
    /* ---------- o mezanino largo, em toda estação ----------
       'Deixa mais largas as estações, como fiz em Itaquera, por padrão.'
       O saguão de 320px virou o mezanino da Itaquera em todas: 560px,
       doze catracas com mão e contramão, as duas bilheterias em cabine
       com fila, os achados em cabine, o gradil até a parede e as placas
       finas (na cor da linha). O treino fica no saguão antigo, porque os
       minigames medem ele. A plataforma de cada estação é a de sempre. */
    this.mez = !this.treino;
    /* a cena é reaproveitada de estação em estação: os bancos e o
       sentado da Itaquera sobravam na seguinte, e sentar ali prendia o
       boneco, porque só a Itaquera sabe levantar dele */
    this.assentos = null; this.sentadoPlat = null;
    this.duelo = false; this.dsfEst = []; this.ambDuelou = false; this.tUltimaLuta = undefined;
    this.elevadores = null; this.noElevador = null;

    /* ---------- o saguão ---------- */
    this.liberado = !!GameState.char.gratuidade || this.entrada === 'plataforma';
    this.montaBarracas();
    this.montaGates();
    /* Cada passagem pela estacao redecide: quem pagou hoje nao carrega o
       pulo de ontem. */
    GameState.pulouCatraca = false;
    this.pulo = null;      // o pulo em andamento, que é o que ele pode ver
    this.flagra = null;    // ele te pegou e está vindo falar com você
    this.pulou = false;

    /* ---------- a plataforma ---------- */
    // cinco portas ao longo do trem: sempre tem uma perto de onde você está
    /* As portas nascem do comprimento do trem, de 118 em 118: com a
       plataforma mudando de tamanho, lista fixa deixava metade dela
       sem porta nenhuma. */
    /* ---------- que planta é esta estação ----------
       A Sé é central: você fica no meio e o trem vem dos dois lados.
       Isso muda o piso caminhável, e por isso é decidido ANTES de
       qualquer coisa ser desenhada ou posicionada. */
    CENTRAL = (GameState.estacaoAtual() === BALDEACAO);
    PLAT_X0 = CENTRAL ? PLAT_C_X0 : 136;
    PLAT_X1 = CENTRAL ? PLAT_C_X1 : 288;
    if (this.itq) PLAT_X1 = ITQ.platX1;
    MAPA_PLAT.x = this.itq ? ITQ.paredeX + 2 : 298;

    /* Numa central a via da esquerda anda pro começo da lista e a da
       direita pro fim — e como o terminal sai da linha em que você
       está, os dois lados se anunciam sozinhos. Numa lateral existe uma
       via só, e ela é a do sentido em que você já está indo: a
       plataforma do outro sentido é outra obra, a do corredor. */
    this.trens = CENTRAL
      ? [new Trem(this, -1, -1), new Trem(this, 1, 1)]
      : [new Trem(this, -1, GameState.dir)];
    /* As portas são as mesmas nos dois trens (portasDoTrem é pura), e a
       fila da plataforma precisa delas sem perguntar de qual trem. */
    this.portas = portasDoTrem();
    /* Os dois não podem chegar juntos: dois trens parados ao mesmo
       tempo fazem a escolha ser "qual está mais perto", que não é
       escolha. Meia espera de defasagem faz um chegar enquanto o outro
       ainda não veio, e aí esperar o de lá custa perder o de cá. */
    if (CENTRAL) this.trens[1].t = -this.intervalo(this.trens[1]) * 0.5;
    /* ---------- quem acabou de descer vê o trem ----------
       Descer trocava de cena na hora, e a plataforma nascia vazia: o
       trem de onde você saiu no segundo anterior simplesmente não
       existia mais. Some a sensação de ter descido — parece que você
       apareceu ali.
       Agora, quando a entrada é pela plataforma, a estação começa com o
       trem PARADO e a porta aberta, e ele parte alguns segundos depois.
       Você vê ele indo embora, que é o que se vê de verdade.

       Numa central é o trem do SEU sentido que fica parado, e não o da
       esquerda: você desceu dele, e ele é o da via cujo rumo bate com o
       que você vinha seguindo. */
    if (this.entrada === 'plataforma') {
      for (var q = 0; q < this.trens.length; q++) {
        if (this.trens[q].dir !== GameState.dir) continue;
        this.trens[q].estado = 'aberto';
        this.trens[q].t = 2200;
        this.trens[q].y = PLAT_Y;
      }
    }
    this.tremEmpurrado = null;
    this.empurrando = false;
    this.pressao = 0;

    this.desenhaCenario();

    /* Quem está de plantão muda a partida inteira: o menorzinho tira
       meio coração, o do meio um, o grandão dois. A roupa avisa antes
       do número, e o tamanho avisa antes da roupa. */
    this.patente = sorteiaGuarda();
    this.guarda = new Ator(this, 80, 194, this.patente.sprite);
    this.guarda.sp.setDepth(50);
    this.guarda.sp.setScale(this.patente.escala);
    this.guarda.fixo = true;          // ninguém empurra o guardinha
    this.gEstado = 'anda';
    this.gTempo = 0;
    this.gVx = 1;
    this.gOlhando = false;

    /* Duas plateias, uma em cada andar: quem está no saguão anda de um
       lado pro outro, quem está na plataforma espera olhando o trilho. */
    this.plateia = [];
    /* ---------- quanta gente ----------
       Eram 9 no saguão e 10 na plataforma no pico, espalhadas por 900px:
       dava uma pessoa a cada noventa pixels, que é o oposto de pico. Pico
       na Sé é parede de gente com uma canaleta livre na faixa amarela,
       e é essa densidade que faz o horário significar alguma coisa —
       sem ela, escolher a madrugada não é escolha, é preferência. */
    var quantos = Math.round(2 + 16 * GameState.lotacao()), i;
    for (i = 0; i < quantos; i++) {
      var a = new Ator(this, 40 + Math.random() * 240,
        280 + Math.random() * 230, sorteiaPax());
      a.sp.setDepth(40);
      a.vx = (Math.random() < 0.5 ? -1 : 1) * (20 + Math.random() * 28);
      a.t = Math.random() * 2000;
      this.plateia.push(a);
    }
    this.esperando = [];
    quantos = Math.round(2 + 34 * GameState.lotacao());
    for (i = 0; i < quantos; i++) {
      /* Ninguém espera espalhado por igual: espera-se ONDE A PORTA PARA.
         Dois terços nascem colados numa porta e o resto fica solto, que é
         o que faz a plataforma ter bolo e vão em vez de chuvisco. */
      var ey, pts = portasDoTrem();
      if (Math.random() < 0.66 && pts.length) {
        var pp = pts[Math.floor(Math.random() * pts.length)];
        ey = platY(pp - HUD_H + 26 + (Math.random() - 0.5) * 90);
      } else {
        ey = platY(100 + Math.random() * (PLAT_ALT - 160));
      }
      /* Dentro da faixa caminhável, e não a partir dela: na plataforma
         central o piso tem 112px e o "+140" jogava metade da fila em
         cima do trilho do outro lado. */
      var e = new Ator(this, PLAT_X0 + 8 + Math.random() * (PLAT_X1 - PLAT_X0 - 16),
        Phaser.Math.Clamp(ey, platY(90), ESC_Y - 30), sorteiaPax());
      /* Numa central metade da plataforma espera o OUTRO lado: quem
         está na metade da direita fica de costas pra via de cá,
         olhando a de lá. Todo mundo virado pro mesmo lado era a
         plataforma inteira dizendo que só existe um trem. */
      e.dir = (CENTRAL && e.sp.x > (PLAT_X0 + PLAT_X1) / 2) ? 'right' : 'left';
      e.sp.setDepth(30); e.anima(0, false);
      this.esperando.push(e);
    }
    /* Quem não é plateia nem fila (os pedintes, o ambulante) mora em
       `fixos`: a lista de gente é refeita toda vez que alguém embarca ou
       desce, e refeita só com plateia e fila ela largava esses de fora, e
       o ambulante sumia ('o ambulante tá desaparecendo'). */
    this.fixos = [];
    this.gente = this.juntaGente();

    /* quem fica. De madrugada e no vazio eles aparecem mais:
       menos gente passando, mais gente que não vai a lugar nenhum */
    var chance = 0.75 - 0.45 * GameState.lotacao();
    for (var q = 0; q < 2; q++) {
      if (Math.random() > chance) continue;
      // na Itaquera as cabines ocupam a altura de 300 a 390: o pedinte senta mais embaixo
      var pd = new Ator(this, q ? (this.mez ? MEZ.x1 - 34 : 286) : (this.mez ? MEZ.x0 + 34 : 34),
        this.mez ? 430 + Math.random() * 50 : 300 + Math.random() * 130,
        PEDINTE_KEYS[Math.floor(Math.random() * PEDINTE_KEYS.length)]);
      pd.sp.setDepth(38); pd.anima(0, false);
      pd.fixo = true;                 // quem está agachado não se mexe
      this.gente.push(pd); this.fixos.push(pd);
    }
    if (Math.random() < 0.6 - 0.35 * GameState.lotacao()) {
      var pp = new Ator(this, 280, platY(120 + Math.random() * (PLAT_ALT - 200)),
        PEDINTE_KEYS[Math.floor(Math.random() * PEDINTE_KEYS.length)]);
      pp.sp.setDepth(28); pp.anima(0, false);
      pp.fixo = true;
      this.gente.push(pp); this.fixos.push(pp);
    }

    this.montaAmbulante();
    this.montaDesafianteDaEstacao();

    /* Onde você aparece: quem vem da rua entra pelo saguão; quem vem da
       baldeação ou desceu na estação errada já está lá em cima. */
    var noAlto = (this.entrada === 'plataforma');
    this.pl = new Ator(this, noAlto ? 200 : 160,
      noAlto ? platY(PLAT_ALT - 140) : 500, spriteJogador());
    this.pl.sp.setDepth(60);
    this.pl.dir = noAlto ? 'left' : 'up';

    /* ---------- a câmera ----------
       A estação tem 1144 pixels de altura e a tela tem 576. Mesma regra
       do trem: zona morta alta, porque câmera que corrige cada passo
       embrulha o estômago. */
    var cam = this.cameras.main;
    cam.setBounds(0, PLAT_Y - 8, GW, (GH - PLAT_Y) + 8);
    this._camX0 = 0; this._camW = GW;
    /* Presa no personagem, sem zona morta e sem atraso: "a câmera tem
       que acompanhar o personagem, não importa onde ele anda". A zona
       morta de 200px deixava você andar meia tela sem a câmera mexer. */
    cam.startFollow(this.pl.sp, true, 1, 1);
    cam.setFollowOffset(0, -Math.round(HUD_H / 2));
    cam.centerOn(GW / 2, this.pl.sp.y);

    /* ---------- o que ficou caído no chão ----------
       Os dois andares inteiros, saguão e plataforma, porque é justamente
       o canto pra onde você não ia que tem que pagar alguma coisa. */
    this.chao = new Chao(this, 24);
    var eu2 = this;
    this.chao.semeia(quantoCaiNoChao(4), function () { return eu2.pontoDoChao(); });

    /* ---------- o que fica preso na tela ---------- */
    this.gAviso = this.add.graphics().setDepth(70);   // o cone é do mundo
    this.dica = new FaixaDica(this);
    this.alerta = new Plaqueta(this, GW / 2, 320, { cor: PAL.vermelho, filete: 0xe8362c, depth: 82 });
    /* O letreiro do embarque acompanha você pela estação inteira: é ele
       que faz valer a pena subir correndo. Fica rente ao rodapé porque
       o alto da tela é da placa da estação, que é do mundo — e as duas
       empilhadas viravam uma tarja só. */
    // o painel do trem mora logo embaixo do HUD: no pé da tela ele ficava no meio do caminho
    this.painel = new Plaqueta(this, GW / 2, HUD_H + 22, { cor: PAL.branco, filete: num(GameState.faixa().cor), depth: 80 });
    this.gMini = this.add.graphics().setDepth(500).setScrollFactor(0).setVisible(false);
    this.tMini = txtC(this, GW / 2, GH / 2 - 54, '', PAL.branco, 8).setDepth(501).setScrollFactor(0).setVisible(false);
    this.tMini2 = txtC(this, GW / 2, GH / 2 + 24, '', PAL.amarelo, 8).setDepth(501).setScrollFactor(0).setVisible(false);
    if (this.itq) this.posicionaItaquera(noAlto);

    /* O tutorial é uma camada por cima da primeira partida, e a estação
       é onde toda partida começa. Quem já viu (ou pulou) não vê de
       novo; o botão de rever mora no título. */
    /* Chegou de trem é "desceu aqui"; chegou da rua é perna nova, e a
       missão de chegar na Sé sem sentar começa a contar de novo. */
    if (this.entrada === 'plataforma') Missoes.conta('desceu', { estacao: GameState.estacaoAtual() });
    else GameState.sentouNaPerna = false;
    if (this.treino) this.montaTreino();
    // treino não abre tutorial: quem veio ver um minigame já sabe andar
    if (!this.treino && GameState.dia === 1 && !GameState.dentroDoSistema && !tutorialFeito()
      && !this.scene.isActive('Tutorial')) {
      this.scene.launch('Tutorial');
    }

    if (!noAlto) {
      var f = GameState.faixa();
      var cabec = GameState.hora() + ', ' + f.nome.toLowerCase() + '.\n';
      var msg = GameState.char.gratuidade
        ? cabec + 'Gratuidade. Você passa, e ninguém discute.'
        : (GameState.valeRestante > 0
          ? cabec + 'Vale-transporte: ' + GameState.valeRestante
            + (GameState.valeRestante > 1 ? ' passagens.' : ' passagem.')
          : cabec + 'Tarifa R$ '
            + GameState.char.tarifa.toFixed(2).replace('.', ',') + '.');
      fala(this, msg + '\n' + fraseDaFaixa(f), []);
      var self = this;
      this.time.delayedCall(2400, function () { if (self.dialog) self.dialog.fecha(); });
    }
  },

  /* ---------- as barracas do saguão ----------
     Toda estação de São Paulo tem as mesmas duas coisas: uma banca e um
     carrinho de dogão. O carrinho é o ponto de encontro da estação, e
     aqui ele se chama DOG DO CÃO — que é como se fala de coisa
     monstruosa por aqui, e não é marca de ninguém.

     As duas encostam na parede DIREITA, e isso não é enfeite: a
     bilheteria fica no canto de cima à esquerda, e o caminho até ela é
     a coluna esquerda do saguão. Barraca ali estrangulava justamente a
     passagem de quem vai comprar passagem. */
  montaBarracas: function () {
    // na Itaquera as lojas moram na galeria, lado a lado (estacao-itaquera.js)
    if (this.itq) { this.barracas = lojasDaGaleria().concat(cabinesDoMezanino()); return; }
    /* No mezanino largo das outras: as cabines da Itaquera (duas
       bilheterias e os achados) e o DOG DO CÃO e a banca lado a lado,
       de frente, embaixo à direita, longe da porta da rua (x 160). */
    if (this.mez) {
      this.barracas = cabinesDoMezanino().concat([
        { chave: 'dog', nome: 'DOG DO CÃO', cor: 0xe8362c, x: 236, y: 420, w: 68, h: 58, lado: 0,
          titulo: '"DOG DO CÃO, freguês!\nO monstro da estação."', cardapio: ['dogao', 'agua', 'chocolate'] },
        { chave: 'banca', nome: 'BANCA', cor: 0x3a7fd0, x: 318, y: 424, w: 68, h: 54, lado: 0,
          titulo: '"Jornal, Ralls, pururuca."', cardapio: ['pururuca', 'ralls', 'jornal', 'agua'] }
      ]);
      return;
    }
    this.barracas = [
      {
        chave: 'dog', nome: 'DOG DO CÃO', cor: 0xe8362c,
        x: 224, y: 352, w: 68, h: 58, lado: 0,
        titulo: '"DOG DO CÃO, freguês!\nO monstro da estação."',
        cardapio: ['dogao', 'agua', 'chocolate']
      },
      {
        chave: 'banca', nome: 'BANCA', cor: 0x3a7fd0,
        x: 224, y: 446, w: 68, h: 54, lado: 0,
        titulo: '"Jornal, bala, pururuca."',
        cardapio: ['pururuca', 'doce', 'jornal', 'agua']
      }
    ];
  },

  /* está na frente do balcão de alguma? o balcão é o lado que dá pro
     corredor, não a parede */
  barracaPerto: function (x, y) {
    for (var i = 0; i < this.barracas.length; i++) {
      var b = this.barracas[i];
      // de frente (lado 0): o balcão dá pra baixo, e se compra chegando por baixo
      if (!b.lado) {
        if (x > b.x - 8 && x < b.x + b.w + 8 && y > b.y + b.h && y < b.y + b.h + 34) return b;
        continue;
      }
      var bx = b.lado > 0 ? b.x + b.w : b.x;          // onde fica o balcão
      if (Math.abs(x - bx) < 34 && y > b.y - 10 && y < b.y + b.h + 10) return b;
    }
    return null;
  },

  /* ---------- o quiosque, de frente ----------
     De lado a barraca não conversava com o jogo: tudo aqui é desenhado
     em 3/4, de frente, como os bonecos. Agora o quiosque encara quem
     passa, como os das estações de verdade (o DOG DO CÃO é o Monster Dog
     das fotos): letreiro preto em cima com o nome colorido e dois
     emblemas redondos; lá dentro as geladeiras de vidro e o cardápio; o
     atendente atrás; e o balcão na frente, cobrindo as pernas dele, com
     a foto do lanche. A banca é a mesma peça em metal verde, com revista
     na parede e no balcão.

     Três camadas, porque o atendente fica ENTRE elas: o fundo vai na
     textura do saguão (0), o atendente em 39, e balcão e letreiro por
     cima dele (40 e 41). */
  pintaBarracas: function (g) {
    for (var i = 0; i < this.barracas.length; i++) pintaFundoDaLoja(g, this.barracas[i]);
  },

  montaVendedores: function () {
    for (var i = 0; i < this.barracas.length; i++) montaFrenteDaLoja(this, this.barracas[i]);
  },

  /* ---------- o cenário, em três faixas ----------
     Saguão embaixo, plataforma em cima, escada rolante entre os dois.
     Cada faixa é desenhada UMA vez e vira textura: o piso quadriculado
     sozinho são mais de mil retângulos, e num mundo de duas telas de
     altura isso seria repassado ao motor sessenta vezes por segundo por
     nada — foi essa conta que derrubou o trem pra 18 quadros antes de
     virar imagem também. */
  desenhaCenario: function () {
    var eu = this, l = GameState.linhaAtual();

    var fundo = this.add.graphics().setDepth(-1);
    fundo.fillStyle(num(PAL.bg), 1).fillRect(0, PLAT_Y - 8, GW, (GH - PLAT_Y) + 16);

    if (this.mez) {
      // fora dos 320px da plataforma, o fundo escuro (a câmera abre pro mezanino)
      fundo.fillRect(MEZ.x0, PLAT_Y - 8, MEZ.x1 - MEZ.x0, (GH - PLAT_Y) + 16);
      texturaDeCena(this, 'est_saguao', MEZ.x1 - MEZ.x0, GH, function (g) { eu.pintaMezanino(g, l); });
    }
    else texturaDeCena(this, 'est_saguao', GW, GH, function (g) { eu.pintaSaguao(g, l); });
    if (this.itq) {
      texturaDeCena(this, 'est_plataforma', ITQ.platX2 - ITQ.outraX0, PLAT_ALT, function (g) { eu.pintaPlataformaItq(g, l); });
    } else {
      texturaDeCena(this, 'est_plataforma', GW, PLAT_ALT, function (g) { eu.pintaPlataforma(g, l, CENTRAL); });
    }
    texturaDeCena(this, 'est_escada', GW, ESCADA_ALT, function (g) { eu.pintaEscada(g); });

    this.add.image(this.mez ? MEZ.x0 : 0, 0, 'est_saguao').setOrigin(0, 0).setDepth(0);
    this.add.image(this.itq ? ITQ.outraX0 : 0, PLAT_Y, 'est_plataforma').setOrigin(0, 0).setDepth(0);
    if (this.itq) this.montaItaquera();
    else if (this.mez) this.montaMezanino();
    // o elevador, em toda plataforma lateral (na central não cabe do lado da escada)
    if (!CENTRAL) this.montaElevadores();
    else if (!this.mez) {
      /* as lixeiras das estações de sempre: duas no saguão, rente à parede
         de baixo, e duas na plataforma, encostadas na parede */
      this.lixeiras = [{ x: 44, y: 506 }, { x: 278, y: 506 },
        { x: PLAT_X1 - 8, y: platY(320) }, { x: PLAT_X1 - 8, y: platY(700) }];
      var gLx = this.add.graphics().setDepth(2.5);
      for (var lx = 0; lx < this.lixeiras.length; lx++) pintaLixeira(gLx, this.lixeiras[lx].x, this.lixeiras[lx].y);
      // e as tomadas: parede da esquerda do saguão e parede da plataforma
      this.montaTomadas([{ x: 26, y: 330, lado: 1 }, { x: PLAT_X1 + 12, y: platY(500), lado: -1 }]);
    }
    this.add.image(0, ESC_Y, 'est_escada').setOrigin(0, 0).setDepth(0);
    this.montaDegraus();

    /* Os letreiros são texto, e texto não entra em textura: eles ficam
       no mundo, cada um na parede a que pertence. */
    /* ---------- por que o saguão não tem mais placa ----------
       Eram sete chapas de texto numa tela só: PLATAFORMA, BILHETES,
       ACHADOS E PERDIDOS, DOG DO CÃO, BANCA, o nome da estação e a
       faixa de baixo. Chapa preta com letra grande é o objeto mais
       pesado que este jogo desenha, e cinco delas empilhadas cobriam
       justamente o caminho por onde se anda.

       E não diziam nada de novo: a faixa de dica JÁ nomeia o que está
       na sua frente quando você chega perto — 'CLIQUE: DOG DO CÃO',
       'CLIQUE: COMPRAR PASSAGEM'. A placa repetia de longe uma coisa
       que o jogo diz de perto, e cobrava a tela inteira por isso.

       Ficou só a da escada: essa não nomeia, ela APONTA, e é a única
       informação do saguão que você precisa ter antes de chegar perto. */

    // o nome da estação desceu: o guichê ocupou a altura em que ele morava
    /* Na Itaquera as placas do mezanino são as mesmas finas e vermelhas
       da passarela e da plataforma ('deixa as placas bem semelhantes'):
       uma família só. O nome vai na parede da direita, que é a vazia. */
    if (this.mez) {
      var cp = this.itq ? null : corDaPlaca();
      placaItq(this, MEZ.x1 - 13, 380, placaDe(GameState.estacaoAtual()), true, true, cp);
      // pendurada, por cima de quem passa ('tem que ficar acima do pessoal')
      placaItq(this, (ESC_X0 + ESC_X1) / 2, 126, '▲ PLATAFORMA', false, false, cp);
    } else {
      var tSag = txt(this, 12, 470, GameState.estacaoAtual(), PAL.branco, 8);
      tSag.setOrigin(0.5, 0.5).setAngle(90).setDepth(1);
      /* A placa da escada fica NO PISO, rente à boca: pendurada no vão
         ela virava parede na frente de quem sobe. */
      placaSaida(this, GW / 2, 126, '▲ PLATAFORMA', 3);
    }
    /* o nome repetido na faixa, de 260 em 260: é assim que a estação se
       identifica de qualquer ponto da plataforma, e é o marco que diz
       quanto você já andou */
    /* Na central não existe parede: o nome não tem onde morar de pé, e
       escrito no ar ele ficaria sobre o trilho. Lá ele vira placa
       pendurada no meio do piso, que é onde ela fica na Sé de verdade. */
    if (CENTRAL) {
      /* 'Placas horríveis, se inspira mais em Itaquera': na central o nome
         e o sentido também são a placa fina, pendurada no meio do piso,
         na cor da linha. Os ganchos e a sombra dizem que ela está no alto. */
      for (var nc = 220; nc < PLAT_ALT - 120; nc += 300) {
        placaItq(this, GW / 2, platY(nc), placaDe(GameState.estacaoAtual()), false, false, corDaPlaca());
      }
    } else {
      /* Duas vezes, em 150 e 560, e não três a cada 260: com o nome
         oficial (CORINTHIANS-ITAQUERA, 240px em pé) três repetições
         encostavam uma na outra e nos quadros de mapa, que agora moram
         nos vãos (300 e 760). */
      // na Itaquera o nome da parede é a placa vermelha (estacao-itaquera.js)
      for (var ny = 150; ny < PLAT_ALT - 80 && !this.itq; ny += 410) {
        var tn = txt(this, this.itq ? ITQ.paredeX + 13 : 309, platY(ny), placaDe(GameState.estacaoAtual()), PAL.branco, 8);
        /* Metade do tamanho (6px por letra, escala 1): a fonte é de pixel
           e só escala inteira fica nítida. Na faixa de 18px o nome do
           tamanho de sempre era um letreiro gritando; na estação de
           verdade é uma letra discreta repetida na parede. */
        tn.setScale(ESCALA_TEXTO / 2);
        tn.setOrigin(0.5, 0.5).setAngle(90).setDepth(1);
      }
    }

    /* ---------- pra que lado este trem vai ----------
       A plataforma dizia só onde VOCÊ está, que é a informação que menos
       falta: o nome da estação já está no alto da tela e no letreiro do
       vagão. O que faltava é a que toda plataforma de metrô grita antes
       de qualquer outra — o TERMINAL pra onde o trem sai daqui.

       Sem isso não existe lado errado, porque não existe lado. Ela sai
       da linha em que você está: na Vermelha é Barra Funda ou Itaquera,
       na Azul é Jabaquara ou Tucuruvi. Nunca escrita à mão. */
    /* Numa central cada via tem o SEU terminal, e uma placa só no meio
       diz pra onde o trem vai sem dizer de que lado ele encosta — que é
       exatamente a informação que falta pra escolher. Elas ficam
       empilhadas e não lado a lado porque a placa tem ~150px de chapa e
       o piso da central tem 112 de largura: as duas não cabem juntas.
       72 é a altura da peça inteira medida no navegador (chapa 44 mais
       tarja 22, mais 6 de respiro), não estimada. */
    if (CENTRAL) {
      /* Depth 45 e não 3: a 3 a multidão (30) andava POR CIMA da placa,
         e placa pendurada com gente andando em cima dela não lê como
         pendurada, lê como pintada no chão. 45 fica acima da gente e
         abaixo do véu da hora (65), que precisa cair sobre tudo.

         E o par se repete em dois pontos, não num só: você desemboca da
         escada no PÉ da plataforma, e uma placa lá em cima no 26 ficava
         a 800px de onde a escolha acontece — placa que não se vê na
         hora de escolher é placa que não existe. 700 é o pé, 60 é a
         outra ponta, e os dois fogem das chapas do nome da estação, que
         moram no 220 e no 520. */
      for (var pc = 0; pc < DIR_PLACAS.length; pc++) {
        placaItq(this, GW / 2, platY(DIR_PLACAS[pc]), '◄ ' + GameState.terminal(-1), false, false, corDaPlaca());
        /* 72 é a altura da peça inteira medida no navegador — chapa 44,
           tarja da linha 22, e 6 de respiro entre uma e outra. Empilhado
           e não lado a lado porque a chapa tem ~150px e o piso da
           central tem 112 de largura: as duas não cabem na mesma linha. */
        placaItq(this, GW / 2, platY(DIR_PLACAS[pc] + 26), GameState.terminal(1) + ' ►', false, false, corDaPlaca());
      }
    } else {
      placaItq(this, GW / 2, platY(30), '► ' + placaDe(GameState.sentidoAtual()), false, true, corDaPlaca());
    }

    this.gCatracas = this.add.graphics().setDepth(2);
    this.pintaCatracas();
    this.montaVendedores();

    veuDaHora(this, 65);
  },

  pintaSaguao: function (g, l) {
    var eu = this;
    var l = GameState.linhaAtual();

    /* O alto do saguão era parede, porque o jogo cortava pra plataforma
       quando você encostava nela. Agora a escada é caminhável e o que
       fica ali é o VÃO dela: a parede sobrou dos dois lados, e os
       degraus descem até o piso. Sem isto o letreiro e a placa ficavam
       pendurados no meio do corredor e dava pra andar por cima da
       parede. */
    eu.azulejo(g, 0, HUD_H, GW, 72);
    g.fillStyle(l.num, 1).fillRect(0, 98, ESC_X0 - 10, 5);
    g.fillStyle(l.num, 1).fillRect(ESC_X1 + 10, 98, GW - ESC_X1 - 10, 5);
    g.fillStyle(0x000000, 0.3).fillRect(0, 103, ESC_X0 - 10, 2);
    g.fillStyle(0x000000, 0.3).fillRect(ESC_X1 + 10, 103, GW - ESC_X1 - 10, 2);
    eu.bocaDaEscada(g, HUD_H, 116);

    // o piso de dentro vai até a linha das catracas (240): no vão entre os gabinetes se vê ladrilho, não buraco
    eu.piso(g, 0, 116, GW, 124, 0x4a4a60, 0x565670);
    eu.piso(g, 0, 240, GW, 280, 0x3f3f52, 0x494960);
    eu.azulejo(g, 0, 520, GW, 56);

    // a cor da linha também na parede da entrada, atrás de quem chega
    g.fillStyle(l.num, 1).fillRect(0, 536, GW, 5);
    g.fillStyle(0x000000, 0.3).fillRect(0, 541, GW, 2);

    // o quadro da rede na parede da entrada, abaixo da faixa da linha
    quadroDeMapa(g, MAPA_SAG.x, MAPA_SAG.y, MAPA_SAG.w, MAPA_SAG.h);

    /* A parede da esquerda: o saguão sempre teve um limite invisível em
       x=28 e nada desenhado ali. Agora ela existe, e é onde mora o nome
       da estação — de pé, como na plataforma, porque deitado ele não
       cabe em parede nenhuma que sobrou. */
    g.fillStyle(num(PAL.paredeSom), 1).fillRect(0, 240, 26, 280);
    g.fillStyle(num(PAL.parede), 1).fillRect(0, 240, 22, 280);
    g.fillStyle(num(PAL.paredeLuz), 1).fillRect(0, 240, 3, 280);
    g.fillStyle(0x000000, 0.35).fillRect(22, 240, 4, 280);

    /* o guichê de achados e perdidos: um vão iluminado na parede, com
       balcão de metal e a prateleira do que ninguém veio buscar */
    g.fillStyle(0x0a0a12, 1).fillRect(0, ACH.y, 30, ACH.h);
    g.fillStyle(0x1c2436, 1).fillRect(2, ACH.y + 4, 26, ACH.h - 12);
    g.fillStyle(0x2a3550, 1).fillRect(2, ACH.y + 4, 26, 2);
    // as coisas na prateleira, cada uma de uma cor
    var coisas = [0xe8362c, 0xf2c14e, 0x3a7fd0, 0x7fd6a0];
    for (var ci = 0; ci < coisas.length; ci++) {
      g.fillStyle(coisas[ci], 0.85).fillRect(5 + (ci % 2) * 12, ACH.y + 12 + Math.floor(ci / 2) * 16, 9, 11);
      g.fillStyle(0x000000, 0.3).fillRect(5 + (ci % 2) * 12, ACH.y + 21 + Math.floor(ci / 2) * 16, 9, 2);
    }
    g.fillStyle(num(PAL.metalSom), 1).fillRect(0, ACH.y + ACH.h - 10, 34, 10);
    g.fillStyle(num(PAL.metal), 1).fillRect(0, ACH.y + ACH.h - 10, 34, 7);
    g.fillStyle(num(PAL.metalLuz), 1).fillRect(0, ACH.y + ACH.h - 10, 34, 2);
    g.fillStyle(num(PAL.amarelo), 0.5).fillRect(0, ACH.y + ACH.h, 40, 3);

    g.fillStyle(0xffffff, 0.05).fillRect(0, 240, GW, 26);
    g.fillStyle(0xffffff, 0.03).fillRect(0, 266, GW, 26);
    pontilhado(g, 0, 240, GW, 280, 0x000000, 0.07, 8);

    /* A faixa de metal que atravessava a tela inteira (y 208..240) saiu:
       atrás dos tripés ela lia como um muro cinza, e catraca de metrô é
       vazada — entre um gabinete e outro você vê o chão do outro lado. O
       que sobra do bloqueio (o gradil das pontas) é desenhado junto com
       as catracas, que sabem onde elas começam e acabam. */

    // na Itaquera a bilheteria encolhe pra caber a fileira de seis catracas
    var bw = eu.itq ? 50 : 88;
    g.fillStyle(num(PAL.paredeSom), 1).fillRect(8, 176, bw, 64);
    g.fillStyle(num(PAL.parede), 1).fillRect(8, 176, bw, 48);
    g.fillStyle(num(PAL.paredeLuz), 1).fillRect(8, 176, bw, 4);
    g.fillStyle(0x0a0a12, 1).fillRect(14, 196, bw - 12, 26);
    g.fillStyle(0x1c2436, 1).fillRect(16, 198, bw - 16, 22);
    g.fillStyle(num(PAL.amarelo), 1).fillRect(14, 226, bw - 12, 5);
    g.fillStyle(num(PAL.amareloSom), 1).fillRect(14, 231, bw - 12, 2);

    if (!eu.itq) eu.pintaBarracas(g);
  },

  /* o vão por onde a escada entra no saguão: mesmo desenho da escada,
     continuado pra baixo até o piso, pra emenda não aparecer */
  /* Os degraus das duas pistas, a balaustrada do meio e os corrimãos.
     Está numa função só porque a escada e a boca dela no saguão são o
     mesmo desenho continuado — duas cópias da mesma conta saem de
     sincronia na primeira mudança. */
  pintaDegraus: function (g, y0, y1) {
    var alt = y1 - y0, p, i;
    g.fillStyle(0x22252f, 1).fillRect(ESC_X0 - 10, y0, ESC_X1 - ESC_X0 + 20, alt);
    for (i = 0; i < ESC_PISTA.length; i++) {
      p = ESC_PISTA[i];
      var larg = p.x1 - p.x0;
      for (var y = y0; y < y1; y += 10) {
        g.fillStyle(0x3d4152, 1).fillRect(p.x0, y, larg, 7);
        g.fillStyle(0x4a4f63, 1).fillRect(p.x0, y, larg, 2);
        g.fillStyle(0x16181f, 1).fillRect(p.x0, y + 7, larg, 3);
      }
      /* A seta é o que diz o sentido, e ela mora NA pista: seta no meio
         do vão não pertence a lado nenhum e não informa nada. */
      var cx = (p.x0 + p.x1) / 2;
      g.fillStyle(p.sobe ? 0x00e676 : 0xe8a33c, 0.32);
      for (var sy = y0 + 22; sy < y1 - 20; sy += 44) {
        if (p.sobe) g.fillTriangle(cx, sy, cx - 11, sy + 13, cx + 11, sy + 13);
        else g.fillTriangle(cx, sy + 13, cx - 11, sy, cx + 11, sy);
      }
    }
    // a balaustrada entre as duas, que é o que faz serem duas
    g.fillStyle(num(PAL.metalSom), 1).fillRect(ESC_MEIO - ESC_DIV / 2, y0, ESC_DIV, alt);
    g.fillStyle(num(PAL.metalLuz), 1).fillRect(ESC_MEIO - ESC_DIV / 2, y0, 2, alt);
    g.fillStyle(0x000000, 0.35).fillRect(ESC_MEIO + ESC_DIV / 2 - 2, y0, 2, alt);
    // corrimão de fora, dos dois lados
    for (var d = 0; d < 2; d++) {
      var hx = d ? ESC_X1 : ESC_X0 - 6;
      g.fillStyle(num(PAL.metalSom), 1).fillRect(hx, y0, 6, alt);
      g.fillStyle(num(PAL.metalLuz), 1).fillRect(hx, y0, 2, alt);
    }
  },

  /* Os degraus que andam: um ladrilho de um degrau (44x10) repetido
     numa TileSprite por pista, e o que anda é só o deslocamento dele —
     nenhum desenho novo por quadro. Por cima, o que não anda: a seta, a
     faixa verde da esquerda livre e o pente onde o degrau some. */
  montaDegraus: function () {
    if (!this.textures.exists('esc_degrau')) {
      var t = this.add.graphics();
      t.fillStyle(0x3d4152, 1).fillRect(0, 0, 44, 7);
      t.fillStyle(0x4a4f63, 1).fillRect(0, 0, 44, 2);
      t.fillStyle(0x16181f, 1).fillRect(0, 7, 44, 3);
      t.generateTexture('esc_degrau', 44, 10);
      t.destroy();
    }
    this.degraus = [];
    var alt = ESC_BOCA - 8 - ESC_Y, i;
    for (i = 0; i < ESC_PISTA.length; i++) {
      var p = ESC_PISTA[i];
      this.degraus.push(this.add.tileSprite(p.x0, ESC_Y, p.x1 - p.x0, alt, 'esc_degrau')
        .setOrigin(0, 0).setDepth(1));
    }
    var g = this.add.graphics().setDepth(1.5);
    for (i = 0; i < ESC_PISTA.length; i++) {
      var q = ESC_PISTA[i], meio = (q.x0 + q.x1) / 2;
      var cx = (q.x0 + q.x1) / 2;
      g.fillStyle(q.sobe ? 0x00e676 : 0xe8a33c, 0.32);
      for (var sy = ESC_Y + 22; sy < ESC_BOCA - 30; sy += 44) {
        if (q.sobe) g.fillTriangle(cx, sy, cx - 11, sy + 13, cx + 11, sy + 13);
        else g.fillTriangle(cx, sy + 13, cx - 11, sy, cx + 11, sy);
      }
    }
    this.gPente = g;
    g.fillStyle(num(PAL.metalSom), 1).fillRect(ESC_X0 - 10, ESC_BOCA - 8, ESC_X1 - ESC_X0 + 20, 8);
    g.fillStyle(num(PAL.amareloSom), 1).fillRect(ESC_X0 - 10, ESC_BOCA - 8, ESC_X1 - ESC_X0 + 20, 3);
    g.fillStyle(num(PAL.metal), 1);
    for (var px = ESC_X0 - 8; px < ESC_X1 + 8; px += 4) g.fillRect(px, ESC_BOCA - 5, 2, 5);
    this.tEsquerda = 0;
  },

  /* A escada anda, e leva quem está nela. Parado na faixa da esquerda,
     você atrapalha: 1,2s parado ali e alguém pede licença, e cada vez
     custa carisma. */
  rodaEscada: function (dt, andou) {
    var i, passo = ESC_VEL * dt / 1000;
    for (i = 0; i < this.degraus.length; i++) {
      this.degraus[i].tilePositionY += ESC_PISTA[i].sobe ? passo : -passo;
    }
    var sp = this.pl.sp;
    if (this.pulo || sp.y < ESC_Y - 4 || sp.y > ESC_BOCA) { this.tEsquerda = 0; return; }
    var p = pistaDaEscada(sp.x);
    if (!p) { this.tEsquerda = 0; return; }
    var ny = sp.y + (p.sobe ? -passo : passo);
    if (this.podeIr(sp.x, ny)) sp.y = ny;
    /* A saída de cima. Na plataforma lateral o piso começa em x 136, e a
       faixa da esquerda da escada vai de 112 a 134: quem subia por ela
       chegava no topo e ficava preso no canto, com a escada empurrando
       contra a parede (medido: parado em y -96, x 124, segurando pra
       cima). No último degrau a escada põe você no piso, de lado, como a
       saída de uma escada de verdade. */
    if (p.sobe && sp.y < ESC_Y + 24 && sp.x < PLAT_X0 + 10) {
      sp.x = Math.min(PLAT_X0 + 10, sp.x + 70 * dt / 1000);
    }
    var naEsquerda = sp.x < (p.x0 + p.x1) / 2;
    if (naEsquerda && !andou) {
      this.tEsquerda += dt;
      if (this.tEsquerda > 1200) {
        this.tEsquerda = -1800;       // a próxima bronca vem 3s depois
        GameState.addCarisma(-2);
        sfx('bravo');
        falaGente(['Licença!', 'Ô, a esquerda é pra andar!', 'Dá licença aí!'][Math.floor(Math.random() * 3)], 1.25);
        var al = this.alerta;
        al.setText('"LICENÇA! A ESQUERDA\nÉ PRA QUEM ANDA."');
        this.time.delayedCall(1800, function () { if (al) al.setText(''); });
      }
    } else if (this.tEsquerda > 0) this.tEsquerda = 0;
  },

  bocaDaEscada: function (g, y0, y1) {
    this.pintaDegraus(g, y0, y1);
    // o pente de metal onde o degrau some no piso
    g.fillStyle(num(PAL.metalSom), 1).fillRect(ESC_X0 - 10, y1 - 8, ESC_X1 - ESC_X0 + 20, 8);
    g.fillStyle(num(PAL.amareloSom), 1).fillRect(ESC_X0 - 10, y1 - 8, ESC_X1 - ESC_X0 + 20, 3);
    g.fillStyle(num(PAL.metal), 1);
    for (var px = ESC_X0 - 8; px < ESC_X1 + 8; px += 4) g.fillRect(px, y1 - 5, 2, 5);
  },

  /* ---------- as duas plataformas ----------
     Lateral: via encostada na parede de um lado, piso do outro, e a
     faixa da linha correndo a parede com o nome repetido.
     Central: piso no meio, via dos DOIS lados, sem parede — que é a Sé.
     As duas usam as mesmas peças (pintaVia, pintaPisoPlat), porque duas
     cópias da mesma via saem de sincronia na primeira mudança. */
  pintaPlataforma: function (g, l, central) {
    /* A tela de título usa este desenho como papel de parede e chama com
       a linha NULA e sem dizer o tipo: sem chão aqui, a faixa da parede
       derrubava o jogo antes da primeira tela. */
    l = l || LINHAS.vermelha;
    var alt = PLAT_ALT;
    var pts = portasDoTrem();

    if (central) {
      // via esquerda, piso no meio, via direita
      pintaVia(g, 0, 76, alt, -1);
      pintaPisoPlat(g, 92, 228, alt);
      pintaVia(g, 244, 76, alt, 1);
      /* Marca de porta dos dois lados: numa plataforma central o mesmo
         chão serve os dois sentidos, e é a seta que diz qual é qual. */
      for (var i = 0; i < pts.length; i++) {
        marcaDePorta(g, 112, pts[i] + 26, -1);
        marcaDePorta(g, 208, pts[i] + 26, 1);
      }
      return;
    }

    pintaVia(g, 0, 100, alt, -1);
    pintaPisoPlat(g, 124, 296, alt);
    for (var j = 0; j < pts.length; j++) marcaDePorta(g, 150, pts[j] + 26, -1);

    // parede da direita
    g.fillStyle(num(PAL.paredeSom), 1).fillRect(296, 0, 24, alt);
    g.fillStyle(num(PAL.parede), 1).fillRect(300, 0, 20, alt);
    g.fillStyle(num(PAL.paredeLuz), 1).fillRect(300, 0, 3, alt);
    /* ---------- a faixa da linha na parede ----------
       Plataforma de metrô não tem uma placa com o nome: tem uma FAIXA da
       cor da linha correndo a parede inteira, com o nome repetido de
       tantos em tantos metros. É o que se lê da janela do trem antes de
       decidir se desce, e é o que dá marco a uma plataforma comprida —
       sem repetição, andar 900px é andar no mesmo lugar. */
    g.fillStyle(num(escurecer(l.cor, 0.45)), 1).fillRect(298, 0, 22, alt);
    g.fillStyle(l.num, 1).fillRect(300, 0, 18, alt);
    g.fillStyle(num(clarear(l.cor, 0.35)), 1).fillRect(300, 0, 18, 2);
    g.fillStyle(0x000000, 0.3).fillRect(300, alt - 2, 18, 2);

    /* Os quadros de mapa vao POR CIMA da faixa: numa estacao eles sao
       pregados na parede, e a faixa passa atras. A tela de titulo pinta
       esta mesma plataforma com altura menor, entao cada um so entra se
       couber — sem isto o papel de parede do titulo ganhava um quadro
       flutuando no vazio embaixo do desenho. */
    for (var q = 0; q < MAPAS_PLAT.length; q++) {
      if (MAPAS_PLAT[q] + MAPA_PLAT.h < alt) {
        quadroDeMapa(g, MAPA_PLAT.x, MAPAS_PLAT[q], MAPA_PLAT.w, MAPA_PLAT.h);
      }
    }
  },

  /* ---------- a escada rolante ----------
     O que emenda os dois andares, e o que faz a estação ser um lugar em
     vez de duas telas. Dois degraus correndo, corrimão dos dois lados e
     a parede fechando o resto: ela é estreita porque é a única passagem,
     e é isso que dá a sensação de estar atravessando. */
  pintaEscada: function (g) {
    // a parede dos dois lados da passagem
    g.fillStyle(num(PAL.paredeSom), 1).fillRect(0, 0, GW, ESCADA_ALT);
    g.fillStyle(num(PAL.parede), 1).fillRect(0, 0, ESC_X0 - 10, ESCADA_ALT);
    g.fillStyle(num(PAL.parede), 1).fillRect(ESC_X1 + 10, 0, GW - ESC_X1 - 10, ESCADA_ALT);
    g.fillStyle(num(PAL.paredeLuz), 1).fillRect(0, 0, ESC_X0 - 10, 3);
    g.fillStyle(num(PAL.paredeLuz), 1).fillRect(ESC_X1 + 10, 0, GW - ESC_X1 - 10, 3);

    // as duas pistas: sobe pela esquerda, desce pela direita
    this.pintaDegraus(g, 0, ESCADA_ALT);
  },

  /* ---------- bloqueio ----------
     Cinco portas lado a lado, como em estação de verdade: uma delas é a
     porta larga (bagagem e cadeirante), e quantas ficam abertas depende
     da hora. De madrugada sobra quase nada; no pico abre tudo. */
  montaGates: function () {
    var f = GameState.faixa();
    // o bloqueio começa depois da bilheteria e vai até a parede da direita
    var X0 = 100, X1 = 292, TOTAL = 4, POSTE = 12, VAO = 30, VAO_LARGO = 38;
    /* Na Itaquera é uma fileira comprida, como na estação de verdade:
       doze catracas de 22 (a larga, 30) no mezanino largo, de x -56 a
       432. 12 + 11x34 + 42 = 428px, centrados: vão de -14 a 390. */
    if (this.mez) { X0 = MEZ.x0 + 64; X1 = MEZ.x1 - 8; TOTAL = 12; VAO = 22; VAO_LARGO = 30; }
    var larga = Math.floor(Math.random() * TOTAL);

    var largura = POSTE;
    for (var k = 0; k < TOTAL; k++) largura += (k === larga ? VAO_LARGO : VAO) + POSTE;
    var x = X0 + Math.round(((X1 - X0) - largura) / 2) + POSTE;

    this.gates = [];
    for (var i = 0; i < TOTAL; i++) {
      var vao = (i === larga) ? VAO_LARGO : VAO;
      this.gates.push({ x0: x, x1: x + vao, larga: (i === larga), fechada: false, giro: 0, alvo: 0 });
      x += vao + POSTE;
    }

    // fora de serviço: a porta larga é a última a fechar
    var abertas = Phaser.Math.Clamp(Math.round(TOTAL * f.catracas), 2, TOTAL);
    if (this.itq) abertas = TOTAL;      // a Itaquera tem as seis abertas, sempre
    var todas = [];
    for (var q = 0; q < TOTAL; q++) todas.push(q);
    var ordem = Phaser.Utils.Array.Shuffle(todas).sort(function (a, b) {
      return (a === larga ? 1 : 0) - (b === larga ? 1 : 0);
    });
    for (var j = 0; j < TOTAL - abertas; j++) this.gates[ordem[j]].fechada = true;
    this.abertas = abertas;
    /* Mão e contramão: na Itaquera as três de cada ponta são só de
       SAÍDA e as seis do meio só de ENTRADA, como o fluxo da estação,
       que entra reto da passarela pra escada e sai pelos lados. A seta
       verde e o X vermelho no chão dizem qual é qual. */
    if (this.mez) {
      for (var m = 0; m < TOTAL; m++) this.gates[m].sentido = (m < 3 || m >= TOTAL - 3) ? 'sai' : 'entra';
    }
    /* A larga é a catraca PCD: nunca fecha e passa nos dois sentidos, que
       quem usa cadeira de rodas não tem outra. */
    this.gates[larga].fechada = false;
    this.gates[larga].sentido = null;
  },

  /* ---------- catraca de braço, e não muro ----------
     Era uma barra de metal atravessando o vão INTEIRO, que sumia quando
     você pagava: de cima, quatro muros que desapareciam. Catraca de metrô
     é um tripé — três braços num eixo preso no gabinete, um deles sempre
     atravessado no vão — e ela GIRA quando alguém passa: o braço da frente
     varre pro lado de dentro e o próximo toma o lugar.

     De cima, cada braço é um risco saindo do eixo, com o y encolhido
     (0,55) porque o eixo do tripé é inclinado: é o que faz o giro parecer
     um braço descendo e não um ponteiro de relógio. Braço virado pra
     dentro do gabinete não é desenhado — com 120° ele passaria 1,5px do
     gabinete e espetaria o vão do lado. E o gabinete vem por cima de tudo,
     que é onde o eixo mora. */
  pintaCatracas: function () {
    var g = this.gCatracas; g.clear();
    var i, t, w, k;
    // o gradil fecha só as pontas: da bilheteria (x 96) ao primeiro gabinete, e do último à parede
    if (this.gates.length) {
      // na Itaquera o gradil vai da parede (a bilheteria saiu dela e virou cabine)
      this.gradil(g, this.mez ? MEZ.x0 + 26 : 96, this.gates[0].x0 - 14);
      this.gradil(g, this.gates[this.gates.length - 1].x1 + 14, this.mez ? MEZ.x1 - 26 : GW);
    }
    for (i = 0; i < this.gates.length; i++) {
      t = this.gates[i]; w = t.x1 - t.x0;
      if (t.fechada) continue;
      if (t.sentido) {
        // fora (embaixo) e dentro (em cima): seta verde de onde se passa, X vermelho de onde não
        var cx = Math.round((t.x0 + t.x1) / 2);
        this.marcaSentido(g, cx, 250, t.sentido === 'entra' ? 'sobe' : 'x');
        this.marcaSentido(g, cx, 186, t.sentido === 'sai' ? 'desce' : 'x');
      }
      if (t.larga) {
        // o símbolo PCD no chão, na frente dela, no tom da estação (a cor da linha) e a cadeira em branco
        var pcx = Math.round((t.x0 + t.x1) / 2);
        g.fillStyle(GameState.linhaAtual().num, 1).fillRect(pcx - 6, 256, 13, 13);
        g.fillStyle(0xf0eeff, 1).fillRect(pcx - 1, 258, 2, 2).fillRect(pcx - 1, 261, 2, 4).fillRect(pcx - 1, 264, 4, 1)
          .fillRect(pcx + 3, 264, 1, 3);
        g.lineStyle(1, 0xf0eeff, 1).strokeCircle(pcx - 1, 265, 3);
        // a faixa no chão marcando a porta larga, também na cor da linha
        g.fillStyle(GameState.linhaAtual().num, 0.5).fillRect(t.x0, 240, w, 5);
        g.fillStyle(0xf0eeff, 0.5).fillRect(t.x0 + w / 2 - 5, 241, 10, 3);
      }
      if (this.liberado) {
        // pago: o chão do vão acende de leve; o braço continua lá, pra girar
        g.fillStyle(0x00e676, 0.12).fillRect(t.x0, 208, w, 32);
        g.fillStyle(0x00e676, 0.45).fillRect(t.x0, 236, w, 2);
      }
      var hx = t.x0 - 2, hy = CATRACA_Y, L = w - 3;
      for (k = 0; k < 3; k++) {
        var ang = (t.giro + k * 120) * Math.PI / 180;
        if (Math.cos(ang) < -0.3) continue;
        var ex = hx + Math.cos(ang) * L, ey = hy - Math.sin(ang) * L * 0.55;
        g.lineStyle(4, num(PAL.metalSom), 1).lineBetween(hx, hy + 1, ex, ey + 1);
        g.lineStyle(2, num(PAL.metal), 1).lineBetween(hx, hy, ex, ey);
        g.lineStyle(1, num(PAL.metalLuz), 1).lineBetween(hx, hy - 1, ex, ey - 1);
      }
    }
    for (i = 0; i < this.gates.length; i++) {
      t = this.gates[i]; w = t.x1 - t.x0;
      var passa = this.liberado && !t.fechada;
      var postes = [t.x0 - 14, t.x1];
      for (var p = 0; p < 2; p++) {
        var px = postes[p];
        g.fillStyle(num(PAL.metalSom), 1).fillRect(px, 198, 14, 48);
        g.fillStyle(num(PAL.metal), 1).fillRect(px, 198, 10, 48);
        g.fillStyle(num(PAL.metalLuz), 1).fillRect(px + 2, 198, 3, 48);
        // lâmpada do painel: verde passa, vermelho barra, apagado fora de serviço
        g.fillStyle(t.fechada ? 0x4f5468 : (passa ? 0x00e676 : 0xe8362c), 1);
        g.fillRect(px + 2, 204, 7, 6);
        g.fillStyle(0xffffff, 0.5).fillRect(px + 2, 204, 7, 2);
      }
      if (t.fechada) {
        // corrente e placa de fora de serviço
        g.fillStyle(num(PAL.metalSom), 1).fillRect(t.x0, 214, w, 16);
        g.fillStyle(0x2a2a3a, 1).fillRect(t.x0, 216, w, 12);
        g.fillStyle(num(PAL.amareloSom), 1);
        for (var d = 0; d < w; d += 8) g.fillRect(t.x0 + d, 216, 4, 12);
        g.fillStyle(0x000000, 0.45).fillRect(t.x0, 230, w, 4);
        continue;
      }
      // o eixo do tripé, na face do gabinete
      g.fillStyle(num(PAL.metalLuz), 1).fillCircle(t.x0 - 2, CATRACA_Y, 3);
      g.fillStyle(num(PAL.metalSom), 1).fillCircle(t.x0 - 2, CATRACA_Y, 1.5);
    }
  },

  /* A marca no chão da catraca: seta de 7px, ou X de 7px */
  marcaSentido: function (g, cx, y, qual) {
    var r, k;
    if (qual === 'x') {
      g.fillStyle(0xe8362c, 0.9);
      for (k = 0; k < 7; k++) { g.fillRect(cx - 3 + k, y + k, 2, 1); g.fillRect(cx + 3 - k, y + k, 2, 1); }
      return;
    }
    g.fillStyle(0x00e676, 0.9);
    for (r = 0; r < 4; r++) {
      var yy = qual === 'sobe' ? y + r : y + 6 - r;
      g.fillRect(cx - r, yy, 2 * r + 1, 1);
    }
    g.fillRect(cx - 1, qual === 'sobe' ? y + 4 : y, 3, 3);
  },

  /* Gradil de metrô: corrimão em cima, travessa embaixo e balaústre a
     cada 8px, com o chão aparecendo entre eles. Barra quem quer passar
     sem virar parede. */
  gradil: function (g, a, b) {
    if (b - a < 2) return;
    g.fillStyle(0x000000, 0.18).fillRect(a, 240, b - a, 3);             // sombra no chão
    for (var x = a + 3; x < b - 1; x += 8) {
      g.fillStyle(num(PAL.metalSom), 1).fillRect(x, 211, 3, 29);
      g.fillStyle(num(PAL.metal), 1).fillRect(x, 211, 2, 29);
    }
    g.fillStyle(num(PAL.metalSom), 1).fillRect(a, 207, b - a, 6);       // corrimão
    g.fillStyle(num(PAL.metal), 1).fillRect(a, 207, b - a, 4);
    g.fillStyle(num(PAL.metalLuz), 1).fillRect(a, 207, b - a, 1);
    g.fillStyle(num(PAL.metalSom), 1).fillRect(a, 232, b - a, 3);       // travessa de baixo
  },

  /* Gira o tripé da catraca debaixo de x. 120° por passagem, pro lado de
     dentro quando entra e pro lado de fora quando sai. Duas passagens
     seguidas somam: a segunda pega o braço no meio do giro, como na
     catraca de verdade quando a fila anda colada. */
  giraCatracaEm: function (x, sentido, som) {
    var t = this.gateSob(x);
    if (!t || t.fechada) return;
    t.alvo += 120 * (sentido < 0 ? -1 : 1);
    if (som) sfx('catraca');
  },

  /* ~0,3s pra completar o giro, aproximando o alvo a cada quadro. O tripé
     é simétrico — 120° depois é o mesmo desenho —, então ao chegar os dois
     voltam pra zero e o ângulo nunca cresce sem fim. Só repinta quando
     algum braço está mexendo. */
  animaCatracas: function (dt) {
    var mexeu = false;
    for (var i = 0; i < this.gates.length; i++) {
      var t = this.gates[i];
      if (t.giro === t.alvo) continue;
      var dif = t.alvo - t.giro;
      if (Math.abs(dif) < 0.8) { t.giro = 0; t.alvo = 0; }
      else t.giro += dif * Math.min(1, dt / 70);
      mexeu = true;
    }
    if (mexeu) this.pintaCatracas();
  },

  azulejo: function (g, x, y, w, h) {
    g.fillStyle(num(PAL.parede), 1).fillRect(x, y, w, h);
    for (var yy = y; yy < y + h; yy += 16) {
      var off = ((yy - y) / 16) % 2 ? 0 : 16;
      for (var xx = x - 32; xx < x + w; xx += 32) {
        g.fillStyle(num(PAL.paredeLuz), 1).fillRect(xx + off + 2, yy + 2, 28, 3);
        g.fillStyle(num(PAL.parede), 1).fillRect(xx + off + 2, yy + 5, 28, 8);
        g.fillStyle(num(PAL.paredeSom), 1).fillRect(xx + off + 2, yy + 13, 28, 2);
      }
    }
    g.fillStyle(0x000000, 0.3).fillRect(x, y + h - 6, w, 6);
  },

  piso: function (g, x, y, w, h, c1, c2) {
    g.fillStyle(num(PAL.rejunte), 1).fillRect(x, y, w, h);
    for (var yy = y; yy < y + h; yy += 16) {
      for (var xx = x; xx < x + w; xx += 16) {
        var c = ((xx / 16 + yy / 16) % 2) ? c1 : c2;
        g.fillStyle(c, 1).fillRect(xx + 1, yy + 1, 14, 14);
        g.fillStyle(0xffffff, 0.07).fillRect(xx + 1, yy + 1, 14, 2);
        g.fillStyle(0x000000, 0.16).fillRect(xx + 1, yy + 13, 14, 2);
      }
    }
  },

  /* ---------- a fila que embarca ----------
     A plataforma tinha trinta e quatro pessoas paradas olhando o trilho,
     e elas continuavam paradas com o trem parado na frente delas de porta
     aberta. Era o detalhe que mais denunciava que aquilo era cenário: o
     mundo não fazia o que o mundo faz.

     Agora, quando a porta abre, parte da fila anda até a porta mais perto
     e entra. Some quem entrou — e some de verdade, porque quem embarcou
     foi embora. Quando o trem parte, chega gente nova pela escada, que é
     por onde chega gente numa estação.

     Não é rotina de IA: é destino e caminhada. Basta isso pra plataforma
     parar de parecer uma foto. */
  andaFila: function (dt) {
    var i, j, a, t;

    /* Cada trem manda na fila do SEU lado. O destino era sempre
       PLAT_X0 - 4, medido pra plataforma lateral: na Sé isso fazia a
       plataforma inteira andar pra esquerda quando a porta abria,
       inclusive quem estava ali esperando o trem da direita. */
    var meio = (PLAT_X0 + PLAT_X1) / 2;
    for (j = 0; j < this.trens.length; j++) {
      t = this.trens[j];
      var abriu = (t.estado === 'aberto');
      // quem abre a porta manda: sorteia quem vai entrar, uma vez só
      if (abriu && !t.mandouEntrar) {
        t.mandouEntrar = true;
        for (i = 0; i < this.esperando.length; i++) {
          a = this.esperando[i];
          if (!a.sp || !a.sp.active || a.indo) continue;
          // quem está na outra metade não é passageiro deste trem
          if (CENTRAL && ((t.lado < 0) !== (a.sp.x < meio))) continue;
          if (Math.random() > 0.55) continue;
          a.indo = { x: (t.lado < 0) ? PLAT_X0 - 4 : PLAT_X1 + 4,
            y: this.portaMaisPerto(a.sp.y) };
        }
      }
      if (!abriu) t.mandouEntrar = false;
    }

    // quem saiu da cena (embarcou, sumiu) sai também da fila da escada
    if (this.filaDesce) {
      for (var fq = 0; fq < 2; fq++) {
        this.filaDesce[fq] = this.filaDesce[fq].filter(function (q) { return q.sp && q.sp.active && q.indo && q.indo.sai; });
      }
    }
    for (i = this.esperando.length - 1; i >= 0; i--) {
      a = this.esperando[i];
      if (!a.sp || !a.sp.active) { this.esperando.splice(i, 1); continue; }
      if (!a.indo) { a.anima(dt, false); continue; }

      /* ---------- a fila pra descer ----------
         Todo mundo que saía do trem mirava o MESMO ponto em cima da
         escada, e a escada deixava um por vez numa faixa só: virava um
         bolo parado no pé da plataforma. Agora são duas filas indianas,
         uma por faixa, subindo a plataforma 20px por pessoa. */
      if (a.indo.sai && this.filaDesce) {
        var fk = this.filaDesce[a.indo.faixa].indexOf(a);
        if (fk >= 0) {
          a.indo.x = faixaDaEscada(ESC_PISTA[1], a.indo.faixa === 0);
          a.indo.y = ESC_Y - 8 - fk * 20;
        }
      }
      var dx = a.indo.x - a.sp.x, dy = a.indo.y - a.sp.y;
      var d = Math.sqrt(dx * dx + dy * dy);
      /* ---------- quem sai, sai pela FAIXA e não pelo ponto ----------
         Chegar a 4px de um alvo exato é fácil sozinho e impossível em
         quinze: eles se empurram na boca da escada, ninguém encosta no
         próprio ponto, e a saída entope — dava uma pilha parada no pé
         da plataforma, que é o oposto de fluir. Quem vai embora some ao
         cruzar a linha da escada, venha de onde vier no x.
         Só vale pra quem SAI: quem chega nasce nessa mesma faixa e
         sobe, e morreria no berço com a regra pelo y sozinha. */
      if (a.indo.sai && a.sp.y >= ESC_Y - 26) {
        // um por vez EM CADA FAIXA: o da frente tem que ter descido um degrau
        var fxa = a.indo.faixa || 0;
        if (!this.ultimoDescendo) this.ultimoDescendo = [null, null];
        var ult = this.ultimoDescendo[fxa];
        var naFrente = this.filaDesce && this.filaDesce[fxa][0] === a;
        if (!naFrente || (ult && ult.sp && ult.sp.active && ult.indo && ult.indo.fase === 'desce' && ult.sp.y < ESC_Y + 12)) {
          a.anima(dt, false);
          continue;
        }
        this.filaDesce[fxa].shift();
        this.ultimoDescendo[fxa] = a;
        // não some: pega a escada que desce, e o saguão cuida dele dali
        this.esperando.splice(i, 1);
        a.sp.naEscada = true;
        a.sp.setDepth(40);
        a.sp.x = faixaDaEscada(ESC_PISTA[1], fxa === 0);
        a.indo = { fase: 'desce', faixa: fxa };
        this.plateia.push(a);
        this.gente = this.juntaGente();
        continue;
      }
      if (d < 4) {
        // chegou na porta: entrou, e quem entrou não está mais aqui
        a.sp.destroy();
        this.esperando.splice(i, 1);
        this.gente = this.juntaGente();
        continue;
      }
      var v = (a.indo.v || 52) * dt / 1000;
      a.sp.x += (dx / d) * v;
      a.sp.y += (dy / d) * v;
      a.setDir(dx, dy);
      a.anima(dt, true);
    }
  },

  /* ---------- a fila da catraca ----------
     O saguão tinha gente andando de um lado pro outro e voltando, pra
     sempre. Isso não é gente indo pra algum lugar, é vaivém — e vaivém
     denuncia cenário mais rápido do que ninguém andar.

     Numa estação as pessoas do saguão estão fazendo UMA coisa: passando
     na catraca. Então elas escolhem uma porta, andam até ela, passam, e
     somem escada acima. Quem some é reposto pela entrada da rua, que é
     por onde entra gente numa estação.

     Elas param na frente da catraca antes de passar. Sem essa parada o
     bloqueio não parece bloqueio: parece um risco no chão. */
  /* ---------- duas filas: a da catraca e a da escada ----------
     Era cada um indo sozinho até a frente de uma catraca e, passando,
     sumindo no meio do saguão (y 150), antes da escada. E quem escolhia
     a mesma porta se embolava no mesmo ponto e travava ali.

     Agora é o que se vê numa estação: fila em cada catraca, um passa
     por vez (0,8s entre um e outro), e depois da catraca outra fila,
     curta, na boca da escada rolante. Na escada entra um por vez em
     cada faixa, com um degrau e meio de folga do da frente, e sobe
     parado na direita ou andando na esquerda. Some lá em cima, na
     plataforma. */
  andaSaguao: function (dt) {
    var i, g;
    for (g = 0; g < this.gates.length; g++) {
      var gt = this.gates[g];
      if (!gt.fila) gt.fila = [];
      if (gt.espera > 0) gt.espera -= dt;
      for (i = gt.fila.length - 1; i >= 0; i--) if (!gt.fila[i].sp || !gt.fila[i].sp.active) gt.fila.splice(i, 1);
    }
    if (!this.filaEsc) this.filaEsc = [[], []];
    if (!this.ultimoNaEscada) this.ultimoNaEscada = [null, null];
    for (var f = 0; f < 2; f++) {
      for (i = this.filaEsc[f].length - 1; i >= 0; i--) if (!this.filaEsc[f][i].sp || !this.filaEsc[f][i].sp.active) this.filaEsc[f].splice(i, 1);
    }
    var sobe = ESC_PISTA[0];

    for (i = this.plateia.length - 1; i >= 0; i--) {
      var a = this.plateia[i];
      if (!a.sp || !a.sp.active) { this.plateia.splice(i, 1); continue; }

      if (!a.indo) {
        // a porta aberta de fila mais curta
        var melhor = null;
        for (g = 0; g < this.gates.length; g++) {
          var cand = this.gates[g];
          if (cand.fechada || cand.sentido === 'sai') continue;
          if (!melhor || cand.fila.length < melhor.fila.length) melhor = cand;
        }
        if (!melhor) { a.anima(dt, false); continue; }
        melhor.fila.push(a);
        a.indo = { fase: 'fila', gate: melhor };
      }

      var alvoX, alvoY, vel = 46, ind = a.indo;
      if (ind.fase === 'fila') {
        var k = ind.gate.fila.indexOf(a);
        alvoX = (ind.gate.x0 + ind.gate.x1) / 2;
        alvoY = 262 + k * 24;
        var dFila = Math.hypot(alvoX - a.sp.x, alvoY - a.sp.y);
        if (k === 0 && dFila < 8 && !(ind.gate.espera > 0)) {
          ind.gate.fila.shift();
          ind.gate.espera = 800;
          a.indo = ind = { fase: 'passou', x: alvoX };
          a.sp.dentro = true;
        } else if (dFila < 3) { a.anima(dt, false); a.dir = 'up'; continue; }
      }
      if (ind.fase === 'passou') {
        alvoX = ind.x; alvoY = CATRACA_Y - 14;
        if (a.sp.y <= CATRACA_Y - 10) {
          // na escada, três em cada dez vão andando pela esquerda
          var faixa = Math.random() < 0.3 ? 0 : 1;
          this.filaEsc[faixa].push(a);
          a.indo = ind = { fase: 'escada', faixa: faixa };
        }
      }
      if (ind.fase === 'escada') {
        var kk = this.filaEsc[ind.faixa].indexOf(a);
        alvoX = faixaDaEscada(sobe, ind.faixa === 0);
        alvoY = ESC_BOCA + 12 + kk * 22;
        var livre = this.ultimoNaEscada[ind.faixa];
        var folga = !livre || !livre.sp || !livre.sp.active || livre.sp.y < ESC_BOCA - 16;
        if (kk === 0 && Math.hypot(alvoX - a.sp.x, alvoY - a.sp.y) < 8 && folga) {
          this.filaEsc[ind.faixa].shift();
          this.ultimoNaEscada[ind.faixa] = a;
          a.indo = ind = { fase: 'sobe', faixa: ind.faixa };
          a.sp.naEscada = true;
          a.sp.x = alvoX;
        }
      }
      if (ind.fase === 'sobe') {
        // o degrau leva; quem está na esquerda ainda anda por cima dele
        var anda = ind.faixa === 0;
        a.sp.y -= (ESC_VEL + (anda ? 40 : 0)) * dt / 1000;
        a.sp.x = faixaDaEscada(sobe, anda);      // o empurra-empurra não tira ninguém da faixa
        a.dir = 'up';
        a.anima(dt, anda);
        /* No topo ele não some: sai do degrau e vira passageiro da
           plataforma, andando até um lugar perto de uma porta. O saguão
           ganha outro pela rua, e a conta de gente fecha. */
        if (a.sp.y < ESC_Y + 6) {
          this.plateia.splice(i, 1);
          a.sp.naEscada = false; a.sp.dentro = false;
          a.sp.setDepth(30);
          a.indo = {
            x: Phaser.Math.Clamp(PLAT_X0 + 8 + Math.random() * (PLAT_X1 - PLAT_X0 - 16), PLAT_X0 + 12, PLAT_X1 - 12),
            y: this.portaMaisPerto(platY(120 + Math.random() * (PLAT_ALT - 240)))
          };
          this.esperando.push(a);
          this.chegaNoSaguao(1);
        }
        continue;
      }
      /* Quem desceu do trem: desce parado na direita da escada da
         direita, sai pela catraca (o braço gira pra fora) e vai embora
         pela rua. Some só lá embaixo, na entrada. */
      if (ind.fase === 'desce') {
        var desce = ESC_PISTA[1], andaD = ind.faixa === 0;
        a.sp.y += (ESC_VEL + (andaD ? 40 : 0)) * dt / 1000;
        a.sp.x = faixaDaEscada(desce, andaD);
        a.dir = 'down';
        a.anima(dt, andaD);
        if (a.sp.y > ESC_BOCA + 6) {
          a.sp.naEscada = false; a.sp.dentro = true;
          var abertas = this.gates.filter(function (q) { return !q.fechada && q.sentido !== 'entra'; });
          var porta = abertas[Math.floor(Math.random() * abertas.length)] || this.gates[0];
          a.indo = ind = { fase: 'saindo', x: (porta.x0 + porta.x1) / 2 };
        }
        continue;
      }
      if (ind.fase === 'saindo') {
        alvoX = ind.x; alvoY = CATRACA_Y + 44;
        if (a.sp.y >= CATRACA_Y + 20) {
          a.sp.dentro = false;
          a.indo = ind = { fase: 'rua', x: 40 + Math.random() * 240 };
        }
      }
      if (ind.fase === 'rua') {
        alvoX = ind.x; alvoY = 560;
        if (this.mez && !this.itq) alvoX = 120 + (ind.x - 40) / 240 * 80;   // a porta da rua é no meio
        if (this.itq) alvoX = ITQ_MEIO_X + (Math.random() - 0.5) * 30;
        if (this.itq && a.sp.y > ITQ.passY0 + 4) {
          this.plateia.splice(i, 1);
          this.novoPassante('saguao', ['A', 'B', 'C'][Math.floor(Math.random() * 3)], a);
          continue;
        }
        if (a.sp.y > 540) {
          a.sp.destroy();
          this.plateia.splice(i, 1);
          continue;
        }
      }

      var dx = alvoX - a.sp.x, dy = alvoY - a.sp.y;
      var d = Math.sqrt(dx * dx + dy * dy);
      if (d < 1) { a.anima(dt, false); continue; }
      var v = Math.min(d, vel * dt / 1000);
      var yA = a.sp.y;
      a.sp.x += (dx / d) * v;
      a.sp.y += (dy / d) * v;
      /* cruzou a linha: é aqui que a catraca gira e faz barulho, e não
         quando ele ainda estava parado na frente dela */
      if (ind.fase === 'passou' && yA > CATRACA_Y && a.sp.y <= CATRACA_Y) {
        this.giraCatracaEm(a.sp.x, 1, Math.abs(a.sp.x - this.pl.sp.x) < 90);
      }
      if (ind.fase === 'saindo' && yA < CATRACA_Y && a.sp.y >= CATRACA_Y) {
        this.giraCatracaEm(a.sp.x, -1, Math.abs(a.sp.x - this.pl.sp.x) < 90);
      }
      a.setDir(dx, dy);
      a.anima(dt, true);
    }
    this.gente = this.juntaGente();
  },

  /* quem entra na estação entra pela rua, que é embaixo */
  chegaNoSaguao: function (quantos) {
    if (this.itq) {
      // na Itaquera ninguém brota no saguão: vem andando de uma das saídas
      for (var k = 0; k < quantos; k++) this.novoPassante(['A', 'B', 'C'][Math.floor(Math.random() * 3)], 'saguao');
      return;
    }
    for (var i = 0; i < quantos; i++) {
      var a = new Ator(this, 60 + Math.random() * 200, 520 + Math.random() * 30, sorteiaPax());
      a.sp.setDepth(40);
      a.indo = null;
      this.plateia.push(a);
    }
  },

  /* ---------- o treino, na estação ----------
     O EMPURRÃO precisa de um trem parado de porta aberta: a estação
     aberta 'na plataforma' já nasce com ele assim. A janela da porta é
     zerada na hora de começar — o trem chegou 2,2s antes, e treinar com
     a janela pela metade seria treinar outro minigame.

     A CATRACA não é disparada: o minigame É escolher a hora, com o
     guarda virando o cone. O jogador nasce na frente de uma catraca
     aberta e o resto é com ele. */
  montaTreino: function () {
    this.treinoFase = 'esperando';
    var eu = this, i;
    if (this.treino === 'catraca') {
      for (i = 0; i < this.gates.length; i++) {
        var g = this.gates[i];
        if (g.fechada) continue;
        this.pl.sp.x = (g.x0 + g.x1) / 2;
        this.pl.sp.y = 266;
        this.pl.dir = 'up';
        break;
      }
      return;
    }
    if (this.treino === 'empurrao') {
      this.time.delayedCall(1600, function () {
        if (!eu.scene.isActive()) return;
        if (eu.dialog) eu.dialog.fecha();
        for (var q = 0; q < eu.trens.length; q++) {
          var t = eu.trens[q];
          if (t.estado !== 'aberto') continue;
          t.t = 0;
          eu.comecaEmpurrao(t);
          eu.treinoFase = 'rodando';
          return;
        }
      });
    }
  },

  /* O diálogo só conta depois que o minigame começou. A fala de chegada
     da estação também é um diálogo, e contá-la devolvia o jogador pra
     lista antes de ele encostar em nada. */
  treinoEmCurso: function () {
    var ativo = false;
    if (this.treino === 'empurrao') ativo = !!this.empurrando;
    else if (this.treino === 'catraca') ativo = !!(this.pulo || this.flagra);
    if (!ativo && this.treinoFase !== 'esperando' && this.dialog && this.dialog.ativo) ativo = true;
    return ativo;
  },

  /* ---------- de frente pro quadro ----------
     Encostar e o gesto: nao ha botao no mundo, ha uma parede e voce perto
     dela. Na plataforma o quadro fica na parede da direita e voce so
     chega ate PLAT_X1, entao o alcance no x e a distancia do piso ate a
     parede — nao da pra pedir que ele encoste de verdade.

     Na central nao existe quadro porque nao existe parede: a Se tem via
     dos dois lados, e o que sobra ali e a placa pendurada. */
  mapaPerto: function (x, y) {
    var i;
    if (y < ESC_Y) {
      if (CENTRAL || x < PLAT_X1 - 18) return false;
      for (i = 0; i < MAPAS_PLAT.length; i++) {
        if (Math.abs(y - platY(MAPAS_PLAT[i] + MAPA_PLAT.h / 2)) < 34) return true;
      }
      return false;
    }
    return (y > 492 && x > MAPA_SAG.x - 16 && x < MAPA_SAG.x + MAPA_SAG.w + 16);
  },

  portaMaisPerto: function (y) {
    var melhor = y, d = 1e9;
    for (var i = 0; i < this.portas.length; i++) {
      var py = platY(this.portas[i] + 26);
      var dd = Math.abs(py - y);
      if (dd < d) { d = dd; melhor = py; }
    }
    return melhor;
  },

  /* ---------- e desce gente do trem ----------
     A fila que embarca resolveu metade: a porta abria, parte da
     plataforma andava até ela e sumia. A outra metade não existia — o
     trem chegava cheio, ficava dez segundos parado e ia embora com a
     mesma gente dentro. Ninguém DESCIA.

     E é a descida que faz a plataforma virar problema em vez de foto.
     Quem desce tem um caminho só, a escada, e ele cruza exatamente o
     caminho de quem quer chegar na porta. No pico você atravessa uma
     corrente andando no sentido contrário, e a separação de corpos que
     já existia — a multidão empurra o jogador com peso 0,4 contra 0,6
     dele — passa a ter o que fazer. O desafio não é um minigame novo:
     é a estação finalmente ocupando o mesmo espaço que você.

     Quantos: a lotação decide, que é a mesma conta que enche o vagão,
     vista do outro lado. De madrugada descem dois; no pico, dezesseis. */
  desembarca: function (t) {
    /* Teto de gente na plataforma. Um trem despeja até 16 e quem desce
       leva até 16s pra atravessar os 900px; no pico vem trem a cada 3s,
       e sem o teto a plataforma cresceria sem parar — em número e em
       conta de colisão. 60 é o dobro do que a estação semeia no pico. */
    if (this.esperando.length > 60) return;
    /* Metade na central, e a razão é densidade e não quadro por segundo:
       lá são DOIS trens despejando num piso de 112px, contra um trem num
       de 152px na lateral. Cheio dos dois lados, a plataforma da Sé
       recebia o dobro de gente na menor largura do jogo, e atravessar
       deixava de ser difícil pra ser impossível. Com metade cada, a soma
       dos dois dá o mesmo tanto que uma lateral recebe.
       (Cheguei aqui achando que era custo de quadro. Não era: medido em
       recarga limpa, com e sem desembarque dá 49 contra 46 na Sé, dentro
       do ruído. O fps desta máquina não serve pra isso — ver CLAUDE.md.) */
    var quantos = Math.round((2 + 14 * GameState.lotacao()) / (CENTRAL ? 2 : 1));
    var bx = (t.lado < 0) ? PLAT_X0 + 6 : PLAT_X1 - 6;
    for (var i = 0; i < quantos; i++) {
      var py = t.portas[Math.floor(Math.random() * t.portas.length)] + t.y + 26;
      var a = new Ator(this, bx, py + (Math.random() - 0.5) * 24, sorteiaPax());
      a.sp.setDepth(30);
      /* Eles moram na mesma lista de quem espera porque dividem a
         caminhada e a física de corpo. O que os separa é já nascerem
         com `indo`, e o sorteio de embarque pular quem já tem destino:
         quem está saindo não entra de novo no trem que acabou de
         largá-lo. */
      /* 74 e não 52: quem desce do trem anda com destino, e quem espera
         anda à toa. E a 52 a travessia dos 900px levava 17s, mais que o
         intervalo entre trens no pico — a plataforma acumulava três
         levas ao mesmo tempo e o rio virava represa. A 74 são 12s, que
         cabe dentro de um ciclo. */
      // três em dez descem andando pela esquerda; o resto, parado na direita
      var fx = Math.random() < 0.3 ? 0 : 1;
      a.indo = { x: faixaDaEscada(ESC_PISTA[1], fx === 0), y: ESC_Y - 8, v: 74, sai: true, faixa: fx };
      if (!this.filaDesce) this.filaDesce = [[], []];
      this.filaDesce[fx].push(a);
      this.esperando.push(a);
    }
    this.gente = this.juntaGente();
  },

  /* ---------- e chega gente nova ----------
     Se só saísse gente, a plataforma esvaziava e não voltava. Quem chega
     numa estação chega pela escada, então é de lá que eles nascem. */
  chegaNaPlataforma: function (quantos) {
    for (var i = 0; i < quantos; i++) {
      var a = new Ator(this, ESC_MEIO + (Math.random() - 0.5) * 60,
        ESC_Y - 20 - Math.random() * 30, sorteiaPax());
      a.sp.setDepth(30);
      a.indo = {
        x: PLAT_X0 + 8 + Math.random() * (PLAT_X1 - PLAT_X0 - 16),
        y: this.portaMaisPerto(platY(120 + Math.random() * (PLAT_ALT - 240)))
      };
      /* Eles param ANTES da porta: quem acabou de chegar espera o
         próximo trem, não entra no que está indo embora. */
      a.indo.x = Phaser.Math.Clamp(a.indo.x, PLAT_X0 + 12, PLAT_X1 - 12);
      this.esperando.push(a);
    }
    this.gente = this.juntaGente();
  },

  /* ---------- áreas caminháveis, nas três faixas ---------- */
  podeIr: function (x, y) {
    if (this.itq) { var itq = this.podeIrItq(x, y); if (itq !== null) return itq; }
    // ---- plataforma ----
    if (y < ESC_Y) return x >= PLAT_X0 && x <= PLAT_X1 && y >= platY(80) && !this.bateNoElevador(x, y);
    // ---- escada rolante: a passagem entre os dois andares (a cadeira de rodas vai de elevador) ----
    if (y < 116) return x > ESC_X0 && x < ESC_X1 && !(temPoder('cadeira') && this.elevadores);
    if (this.bateNaLixeira(x, y)) return false;
    // ---- saguão ----
    /* 22 e 298: eram 28 e 292. Doze pixels não é muito, mas neste
       saguão o meio é ocupado pelo cone do guardinha e as duas beiradas
       são o único jeito de contornar — cada pixel de beirada é caminho. */
    if (this.mez ? (x < MEZ.x0 + 22 || x > MEZ.x1 - 22) : (x < 22 || x > 298)) return false;
    // o corpo da barraca é parede; o balcão é onde se atende
    for (var b = 0; b < this.barracas.length; b++) {
      var q = this.barracas[b];
      if (x > q.x - 6 && x < q.x + q.w + 6 && y > q.y - 4 && y < q.y + q.h + 4) return false;
    }
    if (y >= 244 && y <= 516) return true;
    // a porta da rua, no pé do mezanino (estacao-itaquera.js, portaDaRua)
    if (this.mez && !this.itq && y > 516 && y < 548 && x > PORTA_RUA.x0 + 6 && x < PORTA_RUA.x1 - 6) return true;
    if (y >= 116 && y <= 204) return true;
    if (y > 204 && y < 244) {
      /* sair pela catraca é sempre possível, como na estação de verdade:
         só ENTRAR pede passagem. Quem pulou (e não está liberado) ficava
         preso do lado de dentro, sem conseguir sair nunca mais. */
      var saindo = this._indo > 0 && this._yDe <= 204;
      if (!this.liberado && !saindo) return false;
      for (var i = 0; i < this.gates.length; i++) {
        var t = this.gates[i];
        if (t.fechada) continue;
        // a cadeira de rodas só cabe na larga, a catraca PCD
        if (temPoder('cadeira') && !t.larga) continue;
        /* a contramão só barra quem está ENTRANDO no vão: quem já está
           no meio da catraca pode voltar, senão ficava preso nela */
        if (t.sentido && this._indo && (this._yDe >= 244 || this._yDe <= 204) &&
            (this._indo < 0 ? t.sentido === 'sai' : t.sentido === 'entra')) continue;
        if (x > t.x0 + 2 && x < t.x1 - 2) return true;
      }
      return false;
    }
    return false;
  },

  /* Um ponto pisável qualquer da estação, dos dois andares. Sorteia e
     confere em vez de calcular a área livre: a planta tem barraca,
     bilheteria, catraca e trilho, e listar tudo isso de novo aqui seria
     uma segunda verdade pra sair de sincronia com a primeira. */
  pontoDoChao: function () {
    var naPlataforma = Math.random() < 0.42;
    var x, y;
    if (naPlataforma) {
      x = Phaser.Math.Between(PLAT_X0 + 10, PLAT_X1 - 10);
      y = Phaser.Math.Between(platY(96), ESC_Y - 30);
    } else {
      x = Phaser.Math.Between(36, 286);
      y = Phaser.Math.Between(128, 508);
      // longe do bloqueio: moeda em cima da catraca não dá pra pegar
      if (y > 196 && y < 292) y += 110;
    }
    return this.podeIr(x, y) ? { x: x, y: y } : null;
  },

  /* ---------- o funil ----------
     A estação tem dois gargalos: o bloqueio, que são quatro portas de 30
     pixels numa parede de 320, e a boca da escada, que são 64 numa de
     320. Andar pra cima em qualquer outro lugar batia numa parede
     invisível e parava ali — medido: subindo em linha reta, NOVE de onze
     colunas do saguão morriam sem aviso, e descendo da plataforma,
     quatro de sete. O jogo virava "adivinhe onde é a passagem".

     Agora o corpo procura a porta sozinho: quem empurra na direção do
     gargalo e bate escorrega de lado até a abertura mais próxima, que é
     o que qualquer um faz numa estação que conhece de cor. Escorrega na
     velocidade de andar, e só enquanto você está empurrando — soltar
     para na hora.

     Não é um atalho: onde a linha inteira é parede — a catraca fechada
     de quem não pagou, o fim da plataforma — não existe abertura pra
     achar, e o funil não faz nada. */
  ALCANCE_FUNIL: 132,
  afunila: function (py, dx, passo) {
    var sp = this.pl.sp;
    var alvo = this.aberturaMaisPerto(sp.x, py);
    if (alvo === null) return;
    var d = alvo - sp.x;
    if (Math.abs(d) < 1) return;
    // quem está virando pro outro lado sabe o que quer: o volante é dele
    if (dx !== 0 && (dx > 0) !== (d > 0)) return;
    var nx = sp.x + (d > 0 ? 1 : -1) * Math.min(passo, Math.abs(d));
    if (this.podeIr(nx, sp.y)) sp.x = nx;
  },

  /* o x pisável mais próximo na altura pra onde você está empurrando */
  aberturaMaisPerto: function (x, py) {
    for (var d = 4; d <= this.ALCANCE_FUNIL; d += 4) {
      if (this.podeIr(x + d, py)) return x + d;
      if (this.podeIr(x - d, py)) return x - d;
    }
    return null;
  },

  /* ---------- o guichê ----------
     Comprar personagem era escolher um cadeado numa tabela de preços. A
     máquina é outra coisa: você paga pra ver, e o que sai pode ser a
     mochila de alguém — ou um guarda-chuva quebrado, que é metade da
     graça. */
  abreAchados: function () {
    var eu = this;
    if (lePontos() < ACHADOS_PRECO) {
      sfx('nao');
      fala(this, '"Só com ' + ACHADOS_PRECO + ' pontos, meu querido."\n\nVocê tem ' + lePontos() + '.', []);
      this.time.delayedCall(1600, function () { if (eu.dialog) eu.dialog.fecha(); });
      return;
    }
    fala(this, '"Perdeu alguma coisa?"\n\nO guichê deixa você levar uma\ncaixa fechada por '
      + ACHADOS_PRECO + ' pontos.', [
      { label: 'Pagar ' + ACHADOS_PRECO + ' e ver', cb: function () { eu.puxa(); Missoes.conta('achados'); } },
      { label: 'Deixa pra lá', cb: function () { } }
    ]);
  },

  puxa: function () {
    var eu = this;
    var r = puxaAchados();
    var corpo = r.nome + '.\n' + (r.fala || '');
    if (r.personagem) {
      sfx('vitoria');
      corpo += '\n\n' + r.nomePersonagem + ' DESTRAVADO';
    } else {
      sfx(r.grana || r.pontos || r.descanso || r.carisma ? 'moeda' : 'catraca');
    }
    if (r.grana) corpo += '\n+R$ ' + r.grana.toFixed(2).replace('.', ',');
    if (r.pontos) corpo += '\n+' + r.pontos + ' PONTOS';
    if (r.descanso) corpo += '\n+DESCANSO';
    if (r.carisma) corpo += '\n+CARISMA';
    GameState.passaTempo(2);
    fala(this, corpo, []);
    this.time.delayedCall(r.personagem ? 2800 : 1900, function () { if (eu.dialog) eu.dialog.fecha(); });
  },

  /* a porta que está debaixo do jogador; a larga tem alcance maior */
  gateSob: function (x) {
    var melhor = null, dist = 1e9;
    for (var i = 0; i < this.gates.length; i++) {
      var t = this.gates[i];
      if (x < t.x0 - 7 || x > t.x1 + 7) continue;
      var d = Math.abs(x - (t.x0 + t.x1) / 2);
      if (d < dist) { dist = d; melhor = t; }
    }
    return melhor;
  },

  /* ---------- guardinha ----------
     O guardinha existia, andava e parava — mas nada disso importava. A
     decisão de te pegar era um sorteio no instante do aperto: se ele
     estivesse parado ou perto demais, flagrado; senão, passou. Pular
     não era um ato que ele pudesse ver, era um número comparado com o
     x dele.

     Agora ele tem campo de visão, e o campo é desenhado na tela do
     jeito exato em que é testado — o que está pintado de vermelho é o
     que ele enxerga, nem um pixel a mais. Pular leva quase um segundo,
     com você em cima da catraca o tempo todo: se o cone passar por
     você nesse meio tempo, ele apita, vem falar com você, custa um
     coração e te devolve pro fim do saguão. */

  /* O que ele enxerga: um trapézio que sai dos olhos dele e abre pro
     lado pra onde ele está virado. Parado, o cone aponta pra frente e
     abre mais — é por isso que parar pra olhar é o momento perigoso. */
  cone: function () {
    var g = this.guarda, dif = GameState.dificuldade();
    var o = this.gOlhando;
    // o grandão enxerga mais longe, e o menorzinho menos
    var k = this.patente.cone;
    return {
      ax: g.sp.x,
      ay: g.sp.y - 8,
      cx: g.sp.x + (o ? 0 : this.gVx * 54),
      meia: ((o ? 62 : 38) + dif * 3) * k,
      alc: ((o ? 116 : 94) + dif * 5) * k
    };
  },

  /* O mesmo trapézio, em conta: o meio anda do apex pro alvo e a
     largura abre junto. Desenho e teste saem daqui, senão o jogador
     aprende uma regra e o jogo cobra outra. */
  guardaVe: function (x, y) {
    var c = this.cone();
    if (y < c.ay || y > c.ay + c.alc) return false;
    var k = (y - c.ay) / c.alc;
    var meio = c.ax + (c.cx - c.ax) * k;
    return Math.abs(x - meio) <= c.meia * (0.3 + 0.7 * k);
  },

  pintaCone: function () {
    var av = this.gAviso; av.clear();
    var c = this.cone(), P = Phaser.Geom.Point;
    var vendo = this.guardaVe(this.pl.sp.x, this.pl.sp.y);
    var topo = c.meia * 0.3;
    var pontos = [
      new P(c.ax - topo, c.ay), new P(c.ax + topo, c.ay),
      new P(c.cx + c.meia, c.ay + c.alc), new P(c.cx - c.meia, c.ay + c.alc)
    ];
    /* 'Se eu pagar passagem, o segurança fica mais verdinho e não briga
       comigo': com a passagem paga o cone dele vira verde e claro. Ele
       continua olhando, mas pra você ele não é mais ameaça. */
    var cone = this.liberado ? 0x00e676 : 0xe8362c;
    if (this.liberado) vendo = false;
    av.fillStyle(cone, (this.gOlhando ? 0.17 : 0.09) + (vendo ? 0.12 : 0));
    av.fillPoints(pontos, true);
    av.lineStyle(1, cone, vendo ? 0.85 : 0.3);
    av.strokePoints(pontos, true);
    return vendo;
  },

  atualizaGuarda: function (dt) {
    var dif = GameState.dificuldade();
    var vig = GameState.faixa().guarda;   // no pico ele tem mais o que fazer
    this.gTempo += dt;
    var g = this.guarda;

    if (this.gEstado === 'anda') {
      var v = (52 + dif * 16) * this.patente.vel * this.gVx * (dt / 1000);
      var nx = g.sp.x + v;
      var gx0 = this.mez ? MEZ.x0 + 60 : 60, gx1 = this.mez ? MEZ.x1 - 34 : 286;
      if (nx < gx0) { nx = gx0; this.gVx = 1; }
      if (nx > gx1) { nx = gx1; this.gVx = -1; }
      g.sp.x = nx;
      g.dir = this.gVx < 0 ? 'left' : 'right';
      g.anima(dt, true);
      this.gOlhando = false;
      var limite = Math.max(700, (2200 - dif * 260) / vig);
      if (this.gTempo > limite) {
        this.gEstado = 'olha'; this.gTempo = 0;
        if (Math.random() < 0.5) this.gVx *= -1;
      }
    } else {
      g.dir = 'down';
      g.anima(dt, false);
      this.gOlhando = true;
      var dur = Math.max(500, (1300 - dif * 90) * vig);
      if (this.gTempo > dur) { this.gEstado = 'anda'; this.gTempo = 0; }
    }

    if (this.gEstado === 'anda' && Math.random() < 0.0006 * dif * vig * dt) {
      this.gEstado = 'olha'; this.gTempo = 0;
    }

  },

  /* ---------- ações ---------- */
  abreMenuBilheteria: function () {
    var self = this, c = GameState.char;
    var ops = [];
    if (GameState.valeRestante > 0) {
      ops.push({
        label: 'Usar vale-transporte', cb: function () {
          GameState.valeRestante--;
          self.libera('Passou no vale.\nSobra ' + GameState.valeRestante + '.');
        }
      });
    }
    ops.push({
      label: 'Pagar R$ ' + c.tarifa.toFixed(2).replace('.', ','), cb: function () {
        if (GameState.dinheiro < c.tarifa) {
          sfx('erro');
          fala(self, 'Não dá. Você não tem o valor\nda passagem. Ou pula, ou fica.', []);
          return;
        }
        GameState.gastar(c.tarifa);
        GameState.stats.catracasPagas++;
        GameState.passaTempo(3 + Math.round(4 * GameState.lotacao()));
        self.libera('Bilhete na mão.\nCaro, mas legal.');
      }
    });
    ops.push({ label: 'Deixa pra lá', cb: function () { } });
    fala(this, 'Bilheteria. Quanto custa hoje\njá não importa.', ops);
  },

  /* ---------- o elevador ----------
     De vidro, com a placa azul de acessibilidade: um no mezanino, na
     parede de cima ao lado da escada, e outro na plataforma, logo acima
     da boca da escada. A porta dos dois é a face de baixo, que é a que se
     vê. Qualquer um usa; quem está de cadeira de rodas só sobe por ele. */
  montaElevadores: function () {
    // 60x64: no mezanino ocupa a parede de cima inteira (52 a 116), a 20px da escada
    var x0 = ESC_X1 + 20, w = 60, h = 64;
    this.elevadores = [
      { lugar: 'saguao', x: x0, y: 116 - h, w: w, h: h, porta: { x: x0 + w / 2, y: 132 } },
      { lugar: 'plataforma', x: x0, y: ESC_Y - 24 - h, w: w, h: h, porta: { x: x0 + w / 2, y: ESC_Y - 12 } }
    ];
    this.gElev = this.add.graphics().setDepth(3);
    this.gElevP = this.add.graphics().setDepth(38);
    this.pintaElevadores(0);
  },
  /* Nas cores da estação: a caixa é da parede (o azulejo do mezanino),
     a placa no alto é da cor da linha, com a cadeira de rodas e o
     indicador de andar; e a porta de inox, em duas folhas com a costura
     no meio e a plaquinha azul, toma o resto da caixa ('a porta muito
     pequena'). */
  pintaElevadores: function (fechando) {
    var lst = this.elevadores || [], l = GameState.linhaAtual();
    for (var i = 0; i < lst.length; i++) {
      var e = lst[i], g = i ? this.gElevP : this.gElev, cx = e.x + e.w / 2;
      g.clear();
      g.fillStyle(0x000000, 0.3).fillRect(e.x + 3, e.y + 4, e.w, e.h);
      g.fillStyle(num(PAL.paredeSom), 1).fillRect(e.x - 2, e.y - 2, e.w + 4, e.h + 4);
      g.fillStyle(num(PAL.parede), 1).fillRect(e.x, e.y, e.w, e.h);
      g.fillStyle(num(PAL.paredeLuz), 1).fillRect(e.x, e.y, e.w, 2);
      // a placa na cor da linha no alto, com a cadeira de rodas e o indicador de andar
      g.fillStyle(l.num, 1).fillRect(e.x + 2, e.y + 2, e.w - 4, 11);
      // o símbolo PCD no tom da estação: a cadeira em branco direto na placa da cor da linha
      g.fillStyle(0xf0eeff, 1).fillRect(e.x + 6, e.y + 4, 2, 2).fillRect(e.x + 6, e.y + 6, 2, 3).fillRect(e.x + 6, e.y + 8, 4, 1)
        .fillRect(e.x + 9, e.y + 8, 1, 3);
      g.lineStyle(1, 0xf0eeff, 1).strokeCircle(e.x + 6, e.y + 9, 2);
      g.fillStyle(0xf0eeff, 1).fillRect(e.x + 15, e.y + 5, 22, 2).fillRect(e.x + 15, e.y + 8, 14, 2);
      g.fillStyle(0x14141c, 1).fillRect(e.x + e.w - 14, e.y + 4, 10, 7);
      g.fillStyle(0xf2c14e, 1).fillTriangle(e.x + e.w - 12, e.y + 10, e.x + e.w - 6, e.y + 10, e.x + e.w - 9, e.y + 5);
      // a faixa da linha logo embaixo, e a porta de inox tomando o resto da caixa
      g.fillStyle(0x000000, 0.25).fillRect(e.x, e.y + 13, e.w, 2);
      var py = e.y + 16, ph = e.h - 16, pw = e.w - 10;
      g.fillStyle(num(PAL.metalSom), 1).fillRect(e.x + 4, py, e.w - 8, ph);
      var ab = fechando ? 0 : 16;
      g.fillStyle(0x14141c, 1).fillRect(cx - ab, py + 1, ab * 2, ph - 1);
      g.fillStyle(0xc8cad4, 1).fillRect(e.x + 5, py + 1, pw / 2 - ab, ph - 1)
        .fillRect(cx + ab, py + 1, pw / 2 - ab, ph - 1);
      g.fillStyle(0xe8e8f0, 1).fillRect(e.x + 6, py + 2, 1, ph - 3).fillRect(cx + ab + 1, py + 2, 1, ph - 3);
      if (!ab) g.fillStyle(0x6a6c78, 1).fillRect(cx, py + 1, 1, ph - 1);
      // a plaquinha azul de acessibilidade na folha da esquerda, na altura do olho
      var fx = e.x + 5 + Math.max(2, (pw / 2 - ab) / 2 - 6);
      if (pw / 2 - ab > 12) {
        g.fillStyle(l.num, 1).fillRect(fx, py + 12, 12, 9);
        g.fillStyle(0xf0eeff, 1).fillRect(fx + 2, py + 14, 2, 2).fillRect(fx + 7, py + 14, 2, 4);
      }
    }
  },
  bateNoElevador: function (x, y) {
    var lst = this.elevadores || [];
    for (var i = 0; i < lst.length; i++) {
      var e = lst[i];
      if (x > e.x - 6 && x < e.x + e.w + 6 && y > e.y - 4 && y < e.y + e.h + 4) return true;
    }
    return false;
  },
  contextoElevador: function () {
    var lst = this.elevadores || [];
    for (var i = 0; i < lst.length; i++) {
      var e = lst[i];
      if (Math.abs(this.pl.sp.x - e.porta.x) < 20 && Math.abs(this.pl.sp.y - e.porta.y) < 16) {
        var sobe = (e.lugar === 'saguao');
        this.dica.setText(nomeAgir() + ': ELEVADOR ' + (sobe ? '▲' : '▼'), PAL.amarelo);
        if (Ctrl.actJust) {
          this.noElevador = { t: 0, para: lst[sobe ? 1 : 0] };
          this.pl.sp.setVisible(false);
          this.pintaElevadores(1);
          sfx('porta');
        }
        return true;
      }
    }
    return false;
  },
  // a viagem: porta fecha, 1,4s de elevador, e a porta abre no outro andar
  viajaDeElevador: function (dt) {
    var v = this.noElevador;
    v.t += dt;
    this.dica.setText('ELEVADOR...', PAL.cinza);
    if (v.t < 1400) return;
    this.pl.sp.x = v.para.porta.x; this.pl.sp.y = v.para.porta.y + 4;
    this.pl.dir = 'down'; this.pl.anima(0, false);
    this.pl.sp.setVisible(true);
    this.noElevador = null;
    this.pintaElevadores(0);
    sfx('ok');
  },

  /* A recarga do Bilhete Único é a bilheteria fora da catraca: libera
     a passagem do mesmo jeito. */
  recargaBU: function () {
    if (this.liberado) {
      fala(this, '"Já tá carregado, pode passar."', []);
      var eu = this;
      this.time.delayedCall(1300, function () { if (eu.dialog) eu.dialog.fecha(); });
      return;
    }
    this.abreMenuBilheteria();
  },
  /* O caixa 24 horas: um saque por dia, R$ 20 menos a taxa. Salva quem
     ficou sem grana pra passagem, e custa três minutos na fila. */
  saca24h: function () {
    var eu = this, msg;
    if (GameState.sacouNoDia === GameState.dia) msg = 'LIMITE DE SAQUE DIÁRIO.\nVolte amanhã.';
    else {
      GameState.sacouNoDia = GameState.dia;
      GameState.dinheiro += 14;
      GameState.passaTempo(3);
      sfx('moeda');
      msg = 'Sacou R$ 20,00.\nA taxa comeu R$ 6,00.';
    }
    fala(this, msg, []);
    this.time.delayedCall(1500, function () { if (eu.dialog) eu.dialog.fecha(); });
  },

  libera: function (msg) {
    this.liberado = true;
    this.pintaCatracas();
    sfx('catraca');
    fala(this, msg, []);
    var self = this;
    this.time.delayedCall(1400, function () { if (self.dialog) self.dialog.fecha(); });
  },

  /* ---------- o pulo ----------
     Um segundo em cima da catraca, sem poder desistir. É esse tempo
     que dá ao guardinha a chance de virar e ver — antes, pular era um
     aperto instantâneo e o guardinha era só uma condição no if. */
  comecaPulo: function (gate) {
    if (this.pulo || this.flagra) return;
    GameState.addDescanso(gate.larga ? -4 : -6);
    GameState.passaTempo(2);
    this.pulo = {
      t: 0,
      dur: Math.max(560, 880 - GameState.dificuldade() * 45),
      x: Phaser.Math.Clamp(this.pl.sp.x, gate.x0 + 4, gate.x1 - 4),
      y0: this.pl.sp.y, y1: 196
    };
    this.pl.dir = 'up';
    sfx('empurra');
  },

  atualizaPulo: function (dt) {
    var p = this.pulo;
    p.t += dt;
    var k = Math.min(1, p.t / p.dur);
    // o arco: sobe por cima do bloqueio, não atravessa por dentro
    this.pl.sp.x = p.x;
    this.pl.sp.y = p.y0 + (p.y1 - p.y0) * k - Math.sin(k * Math.PI) * 12;
    this.pl.anima(dt, true);

    if (this.guardaVe(this.pl.sp.x, this.pl.sp.y)) { this.pega(); return; }

    if (k < 1) return;
    this.pulo = null;
    this.pulou = true;
    /* Quem entrou sem pagar entra devendo, e a divida viaja junto: e o
       guardinha em ronda no vagao que vai cobrar. Sem isto, pular a
       catraca era decisao de graca depois de dar certo. */
    GameState.pulouCatraca = true;
    this.pl.sp.y = p.y1;
    GameState.stats.catracasPuladas++;
    Missoes.conta('pulouCatraca'); Missoes.conta('catraca');
    GameState.addCarisma(-2);
    sfx('ok');
    var self = this;
    fala(this, 'Passou.\nO coração bateu, mas passou.', []);
    this.time.delayedCall(1300, function () { if (self.dialog) self.dialog.fecha(); });
  },

  /* Ele apita, larga a ronda e vem falar com você. O castigo é o que
     dói na corrida inteira: um coração a menos e de volta pro fim do
     saguão, com a catraca ainda fechada. */
  pega: function () {
    GameState.multasNoDia = (GameState.multasNoDia || 0) + 1;
    this.pulo = null;
    this.pl.sp.y = 252;
    this.pl.dir = 'down';
    this.flagra = { t: 0 };
    sfx('apito');
    /* 'Tem que ter como batalhar com o guardinha.' Fora do treino, o
       flagra vira duelo (atualizaFlagra): convenceu, ele te deixa passar;
       perdeu, é o castigo da patente dele. No treino da catraca o
       minigame mede o pulo, e o castigo continua na hora. */
    if (this.treino) {
      perdeVida(this, this.pl.sp, this.patente.custo);
      GameState.addCarisma(-6 * this.patente.custo);
    }
    GameState.passaTempo(3);
    this.gEstado = 'olha'; this.gTempo = 0; this.gOlhando = true;
    this.alerta.setText('! ' + this.patente.nome + ' TE VIU !');
  },

  atualizaFlagra: function (dt) {
    var f = this.flagra, g = this.guarda;
    f.t += dt;
    var dx = this.pl.sp.x - g.sp.x;
    if (Math.abs(dx) > 8) {
      g.sp.x += (dx < 0 ? -1 : 1) * 0.15 * dt;
      g.dir = dx < 0 ? 'left' : 'right';
      g.anima(dt, true);
    } else {
      g.dir = 'down';
      g.anima(dt, false);
    }
    this.pl.anima(dt, false);
    if (f.t < 950) return;

    this.flagra = null;
    this.alerta.setText('');
    var self = this;
    if (!this.treino) {
      var tipoG = { fraco: 'guardinha', medio: 'guardaMedio', forte: 'guardaForte' }[this.patente.chave] || 'guardinha';
      this.duelaNaEstacao(g, tipoG, { custo: this.patente.custo }, function (r) {
        if (r === 'ganhou') {
          // convenceu: ele libera a catraca, e você passa sem pagar
          self.liberado = true;
          self.alerta.setText('LIBERADO. PASSA LOGO.');
          self.time.delayedCall(2200, function () { if (self.alerta) self.alerta.setText(''); });
          return;
        }
        if (r !== 'fugiu') GameState.addCarisma(-4 * self.patente.custo);
        self.pl.sp.x = 160; self.pl.sp.y = 512; self.pl.dir = 'up';
      });
      return;
    }
    fala(this, this.patente.fala, [
      {
        label: 'Voltar pro começo', cb: function () {
          self.pl.sp.x = 160; self.pl.sp.y = 512; self.pl.dir = 'up';
        }
      }
    ]);
  },

  /* ---------- trem ---------- */
  pintaTrem: function (t) {
    var g = t.g; g.clear();
    if (t.y <= PLAT_Y - t.alt || t.y >= PLAT_Y + t.alt) return;
    var y0 = t.y, alt = t.alt, lado = t.lado;
    var l = GameState.linhaAtual();
    var b = beiradaDaVia(lado);

    /* ---------- o recorte ----------
       O trem só existe na faixa da plataforma. Sem isto, na chegada e
       na partida ele desliza por cima da escada rolante e do saguão,
       que é o andar de baixo: aparecia lata de trem atravessando a
       estação inteira. Recortar é mais simples que máscara e não custa
       nada, porque tudo aqui é retângulo. */
    var topo = Math.max(y0, PLAT_Y), base = Math.min(y0 + alt, ESC_Y);
    if (base <= topo) return;
    var ac = base - topo;

    /* A luz do jogo vem sempre de cima e da ESQUERDA, e por isso o
       volume não espelha junto com a estrutura: no trem da direita o
       brilho fica na face esquerda e a sombra na direita, ao contrário
       do de cá. Espelhar tudo poria os dois trens da Sé iluminados de
       lados opostos, e a cena passaria a brigar consigo mesma. */
    var luzA = (lado < 0) ? 80 : 10, luzB = (lado < 0) ? 70 : 0;
    var somA = (lado < 0) ? 16 : 88, somB = (lado < 0) ? 0 : 72;
    var briA = (lado < 0) ? 66 : 34, briB = (lado < 0) ? 44 : 12;

    /* ---------- o trem do metrô de SP ----------
       Era um bloco cinza. O trem de verdade é inox, prateado e frisado,
       com uma faixa AZUL correndo o comprimento inteiro, a frente preta
       com o letreiro de LED âmbar e dois faróis, e lanterna vermelha
       atrás. Visto de cima: o teto frisado (as linhas paralelas ao
       trilho), o ar-condicionado de cada carro, a faixa azul na lateral
       que dá pra plataforma, e as divisas entre os carros a cada 150px
       (seis carros em 900). */
    g.fillStyle(0x6d7384, 1); retTrem(g, b, lado, 88, 0, topo, ac);            // contorno
    g.fillStyle(0xb9bfcb, 1); retTrem(g, b, lado, 86, 2, topo, ac);            // inox
    g.fillStyle(0xd9dde6, 1); retTrem(g, b, lado, luzA, luzB, topo, ac);       // o lado da luz
    g.fillStyle(0x000000, 0.16); retTrem(g, b, lado, somA, somB, topo, ac);    // o da sombra
    // os frisos do teto
    g.fillStyle(0x8e95a5, 0.55);
    for (var fr = 44; fr <= 80; fr += 6) retTrem(g, b, lado, fr + 1, fr, topo, ac);
    // a faixa azul, dupla, na lateral da plataforma
    g.fillStyle(0x1f4fb0, 1); retTrem(g, b, lado, 9, 5, topo, ac);
    g.fillStyle(0x4f8fe0, 1); retTrem(g, b, lado, 11, 9, topo, ac);
    /* ---------- divisas e ar-condicionado ----------
       A divisa era a cada 150px e caía em cima de janela: a janela ficava
       metade num carro e metade no outro. Agora a divisa mora num VÃO
       entre duas portas (um a cada três), e aquele vão não tem janela —
       é a ponta do carro. O ar-condicionado vai no meio de cada carro. */
    var vaos = [], ini = 12, k;
    for (k = 0; k < t.portas.length; k++) { vaos.push([ini, t.portas[k]]); ini = t.portas[k] + 52; }
    vaos.push([ini, alt - 22]);
    var divisas = [0];
    for (k = 1; k < vaos.length - 1; k++) {
      if (k % 3 !== 2) continue;
      var dvy = y0 + Math.round((vaos[k][0] + vaos[k][1]) / 2);
      divisas.push(dvy - y0);
      if (dvy - 4 >= topo && dvy + 4 <= base) {
        g.fillStyle(0x2a2d36, 1); retTrem(g, b, lado, 88, 0, dvy - 4, 8);
        g.fillStyle(0x4a4f5c, 1); retTrem(g, b, lado, 86, 2, dvy - 1, 2);
      }
    }
    divisas.push(alt);
    for (k = 0; k < divisas.length - 1; k++) {
      var ay = y0 + Math.round((divisas[k] + divisas[k + 1]) / 2) - 20;
      if (ay >= topo && ay + 40 <= base) {
        g.fillStyle(0x7a8192, 1); retTrem(g, b, lado, 78, 50, ay, 40);
        g.fillStyle(0x9aa1b1, 1); retTrem(g, b, lado, 76, 52, ay + 2, 36);
        g.fillStyle(0x5e6474, 1);
        for (var gr = ay + 6; gr < ay + 36; gr += 5) retTrem(g, b, lado, 74, 54, gr, 1);
      }
    }
    /* A traseira (em cima: o trem chega andando pra baixo) com a
       lanterna vermelha, e a frente (embaixo) preta, com o letreiro âmbar
       e os faróis — é a frente que aparece primeiro quando ele chega. */
    if (y0 >= PLAT_Y && y0 + 10 <= ESC_Y) {
      g.fillStyle(0x16181f, 1); retTrem(g, b, lado, 86, 2, y0, 10);
      g.fillStyle(0xe8362c, 1); retTrem(g, b, lado, 16, 8, y0 + 2, 4);
      g.fillStyle(0xe8362c, 1); retTrem(g, b, lado, 80, 72, y0 + 2, 4);
    }
    var fy0 = y0 + alt - 22;
    if (fy0 >= topo && fy0 + 22 <= base) {
      g.fillStyle(0x16181f, 1); retTrem(g, b, lado, 88, 0, fy0, 22);
      g.fillStyle(0x2a2e3a, 1); retTrem(g, b, lado, 84, 4, fy0 + 2, 10);    // o para-brisa
      g.fillStyle(0xf2a33c, 1);                                              // o letreiro de LED
      for (var lx = 22; lx < 66; lx += 3) retTrem(g, b, lado, lx + 2, lx, fy0 + 4, 3);
      g.fillStyle(0xfff4c2, 1); retTrem(g, b, lado, 18, 10, fy0 + 15, 4);   // faróis
      g.fillStyle(0xfff4c2, 1); retTrem(g, b, lado, 78, 70, fy0 + 15, 4);
      g.fillStyle(0x1f4fb0, 1); retTrem(g, b, lado, 88, 82, fy0, 22);       // a curva azul da frente
      g.fillStyle(0x1f4fb0, 1); retTrem(g, b, lado, 6, 0, fy0, 22);
    }

    /* ---------- janelas: no vão ENTRE as portas ----------
       Eram a cada 80px, e as portas a cada 118: uma não sabia da outra,
       e janela e porta se amontoavam na lateral do carro. Agora cada vão
       entre duas portas (66px) ganha uma janela de 44 centrada nele, e
       as das pontas ficam entre a testeira e a primeira porta. As que
       caem fora do recorte não existem. */
    for (k = 0; k < vaos.length; k++) {
      if (vaos[k][1] - vaos[k][0] < 56) continue;
      if (k > 0 && k < vaos.length - 1 && k % 3 === 2) continue;   // ali é a divisa
      var y = y0 + Math.round((vaos[k][0] + vaos[k][1]) / 2) - 22;
      if (y < topo || y + 44 > base) continue;
      // janela da lateral, com a borracha preta e o reflexo em cima
      g.fillStyle(0x16181f, 1); retTrem(g, b, lado, 38, 12, y, 44);
      g.fillStyle(0x24324a, 1); retTrem(g, b, lado, 36, 14, y + 2, 40);
      g.fillStyle(0x4a5f86, 0.8); retTrem(g, b, lado, 34, 16, y + 4, 9);
    }

    /* ---------- portas que deslizam ----------
       A porta trocava de desenho de uma vez: fechada, e no quadro
       seguinte um buraco verde. Agora são duas folhas que se afastam do
       meio (t.abertura, de 0 a 1, em 380ms) e voltam a se encontrar; o
       verde só acende quando a porta já está quase toda aberta. */
    var a = t.abertura || 0, folha = Math.round(26 * (1 - a));
    for (var i = 0; i < t.portas.length; i++) {
      var py = t.portas[i] + y0;
      // porta pela metade não é porta: ou cabe inteira, ou não aparece
      if (py < topo || py + 52 > base) continue;
      if (a > 0) {
        g.fillStyle(0x07070c, 1); retTrem(g, b, lado, 32, 0, py, 52);
        g.fillStyle(0x232d42, 1); retTrem(g, b, lado, 28, 4, py + 4, 44);
      }
      if (a > 0.6) {
        g.fillStyle(0x00e676, 1); retTrem(g, b, lado, 36, 32, py, 52);
        // a luz da porta cai NO PISO: distância negativa é o que avança
        g.fillStyle(0x00e676, 0.3 * a); retTrem(g, b, lado, 0, -12, py, 52);
      }
      if (folha > 0) {
        var fol = [[py, folha], [py + 52 - folha, folha]];
        for (var f = 0; f < 2; f++) {
          var fy = fol[f][0], fh = fol[f][1];
          g.fillStyle(0x6d7384, 1); retTrem(g, b, lado, 40, 0, fy, fh);
          g.fillStyle(0xc4cad5, 1); retTrem(g, b, lado, 38, 2, fy, fh);
          // o vidro da folha, que anda junto com ela
          if (fh > 10) {
            g.fillStyle(0x24324a, 1); retTrem(g, b, lado, 30, 12, fy + 4, fh - 8);
            g.fillStyle(0x4a5f86, 0.8); retTrem(g, b, lado, 28, 14, fy + 5, 3);
          }
        }
        // a borracha preta onde as folhas se encontram
        g.fillStyle(0x16181f, 1);
        retTrem(g, b, lado, 40, 0, py + folha - 1, 1);
        retTrem(g, b, lado, 40, 0, py + 52 - folha, 1);
        // o losango do metrô, azul, na folha de cima, quando ela está inteira
        if (folha > 20) {
          g.fillStyle(0x1f4fb0, 1); retTrem(g, b, lado, 30, 22, py + 8, 8);
          g.fillStyle(0xffffff, 1); retTrem(g, b, lado, 27, 25, py + 10, 4);
        }
      }
    }
  },

  /* Qual trem tem uma porta ao seu alcance. Numa central são dois, e é
     o LADO em que você está parado que decide qual — é essa a escolha
     que a Sé existe pra cobrar. */
  tremNaPorta: function () {
    for (var i = 0; i < this.trens.length; i++) {
      if (this.portaPerto(this.trens[i]) !== null) return this.trens[i];
    }
    return null;
  },

  // o primeiro trem com a porta aberta, pra dica saber pra onde apontar
  tremAberto: function () {
    for (var i = 0; i < this.trens.length; i++) {
      if (this.trens[i].estado === 'aberto') return this.trens[i];
    }
    return null;
  },

  portaPerto: function (t) {
    if (t.estado !== 'aberto') return null;
    var y = this.pl.sp.y, x = this.pl.sp.x;
    /* Distância até a beirada DESTE lado. Era `x > PLAT_X0 + 64`, que
       só sabia da via da esquerda: na central isso deixava os 48px da
       metade direita do piso sem embarcar em coisa nenhuma — 43% da
       plataforma onde a porta aberta na sua frente não era porta. */
    var d = (t.lado < 0) ? x - PLAT_X0 : PLAT_X1 - x;
    if (d > 64) return null;
    for (var i = 0; i < t.portas.length; i++) {
      var py = t.portas[i] + t.y + 26;
      if (Math.abs(y - py) < 46) return py;
    }
    return null;
  },

  /* intervalo entre trens: no pico vem um atrás do outro, de madrugada
     você espera de verdade. Depois de perder um, o próximo perdoa. */
  intervalo: function (t) {
    /* 5600 e não 3400: no pico a espera caía pra 1,9s, que é menos do
       que a porta demora abrindo — o trem parecia estar sempre ali, e
       perder um não custava nada. Agora vai de 3,1s no pico a 11,8s de
       madrugada, e a faixa de horário volta a ser uma escolha: pico é
       cheio mas passa direto, madrugada é vazio mas você espera. */
    var e = 5600 * GameState.faixa().espera;
    return t.perdido ? e * 0.6 : e;
  },

  /* ---------- o painel ----------
     Numa lateral ele fala do único trem que existe. Numa central ele
     tem que dizer QUAL LADO, senão só se descobre olhando o trilho — e
     o lado é a mecânica inteira da Sé. A seta é o lado; o nome é o
     terminal, que é como plataforma de metrô se anuncia. */
  avisoDoPainel: function () {
    /* Aberto manda, depois chegando, depois a próxima espera — e
       'partindo' fica por ÚLTIMO de propósito. Numa central o trem do
       outro lado indo embora não é uma perda sua, e 'PERDEU ESSE' pra
       quem está esperando o de cá é o painel mentindo. Só passa na
       frente o trem em que você estava de fato tentando entrar.
       Na lateral nada disso muda, porque lá o único trem que existe é
       sempre o escolhido. */
    var ordem = { aberto: 0, fechando: 0, chegando: 1, espera: 2, partindo: 3 };
    var m = null, rm = 9;
    for (var i = 0; i < this.trens.length; i++) {
      var t = this.trens[i];
      var r = (t.estado === 'partindo' && this.tremEmpurrado === t) ? 0 : ordem[t.estado];
      // o mais adiantado manda; empatou, manda o que chega antes
      if (!m || r < rm || (r === rm && t.falta < m.falta)) { m = t; rm = r; }
    }
    return (CENTRAL ? (m.lado < 0 ? '◄ ' : '► ') : '') + m.aviso;
  },

  cicloTrem: function (dt) {
    for (var i = 0; i < this.trens.length; i++) this.andaTrem(this.trens[i], dt);
    this.painel.setText(this.avisoDoPainel());
  },

  andaTrem: function (t, dt) {
    t.t += dt;
    t.falta = 0;
    var dif = GameState.dificuldade();
    switch (t.estado) {
      case 'espera':
        var esp = this.intervalo(t);
        t.falta = Math.max(0, Math.ceil((esp - t.t) / 1000));
        /* Na central o painel diz o TERMINAL, não "trem": com duas vias,
           'TREM EM 6S' não informa qual das duas está contando. */
        t.aviso = CENTRAL ? (GameState.terminal(t.dir) + ' ' + t.falta + 'S')
          : ('TREM EM ' + t.falta + 'S');
        /* 'Talvez o tempo do áudio pra abrir a porta': a gravação do trem
           começa antes de ele aparecer (ouve-se ele vindo no túnel com o
           painel ainda contando) e termina com a porta abrindo. Os últimos
           TREM_ENTRA ms dela são o trem entrando, freando. */
        if (!t.aud && !t.somFoi) {
          t.vel = t.vel || (0.95 + Math.random() * 0.1);
          if (t.t > esp - (TREM_SOM / t.vel - TREM_ENTRA)) {
            t.aud = tocaTremChegando(this, t.vel, esp - t.t + TREM_ENTRA); t.somFoi = true;
          }
        }
        if (t.t > esp) {
          t.estado = 'chegando'; t.t = 0; t.repos = false;
          if (!t.somFoi) t.aud = tocaTremChegando(this, t.vel);
          t.durCheg = TREM_ENTRA;
          /* O relógio anda uma vez por espera, e não uma por trem: com
             dois trens ele andaria em dobro na Sé e a estação sozinha
             comeria o dia. Quem cobra é o da esquerda, que é o único
             que existe nas duas plantas de plataforma. */
          if (t.lado < 0) GameState.passaTempo(Math.round(esp / 1000));
        }
        break;
      case 'chegando':
        /* 'O trem tem que chegar mais lento': 3,4 s em vez de 1,4, e
           freando (a curva desacelera até parar), como trem de verdade
           entrando na plataforma, e não um bloco que desliza e trava. */
        var pc = Math.min(1, t.t / (t.durCheg || TREM_ENTRA));
        t.y = PLAT_Y - t.alt + (1 - Math.pow(1 - pc, 3)) * t.alt;
        if (pc >= 1) {
          t.y = PLAT_Y; t.estado = 'aberto'; t.t = 0; sfx('porta');
          // a gravação acaba com a porta; o fade só apara o que sobrar
          calaTremChegando(t.aud); t.aud = null; t.somFoi = false; t.vel = 0;
          this.desembarca(t);
        }
        t.aviso = 'CHEGANDO';
        break;
      case 'aberto':
        /* 10s e não 7,4: com a porta abrindo, a multidão entrando e você
           tendo que achar uma porta, 7,4s viravam corrida. Embarcar é
           decisão, não reflexo — a pressa tem que estar no fim da janela,
           não no começo dela. */
        // 'esperar 10 segundos pra entrar': a porta fica aberta 10 s, sempre
        var janela = 10000;
        t.falta = Math.max(0, Math.ceil((janela - t.t) / 1000));
        t.aviso = 'EMBARQUE ' + t.falta + 'S';
        if (t.t > janela) {
          /* Antes de partir, as portas fecham: 900ms com o bipe e as
             folhas voltando, e só então o trem anda. Partir com a porta
             escancarada e ela sumir no quadro seguinte era o "fica
             estranho" da chegada e da saída. */
          t.estado = 'fechando'; t.t = 0; sfx('bipePorta');
          // só falha o empurrão de quem estava empurrando ESTE trem
          if (this.empurrando && this.tremEmpurrado === t) this.falhouEmbarque();
        }
        break;
      case 'fechando':
        t.aviso = 'PORTAS FECHANDO';
        if (t.t > 1500) { t.estado = 'partindo'; t.t = 0; sfx('portaFecha'); }
        break;
      case 'partindo':
        /* Chega gente nova pela escada quando o trem parte, que é por
           onde chega gente numa estação. Só o da esquerda repõe: com os
           dois repondo, a Sé encheria no dobro da velocidade num piso
           que tem 112px de largura — mesma razão do relógio. */
        if (!t.repos && t.lado < 0) {
          t.repos = true;
          /* Agora também chega gente de verdade, subindo a escada: a
             reposição só completa até a lotação do horário (a mesma conta
             de quando a plataforma nasce), senão ela só enchia. */
          var teto = Math.round(2 + 34 * GameState.lotacao());
          var falta = teto - this.esperando.length;
          if (falta > 0) this.chegaNaPlataforma(Math.min(falta, Math.round(1 + 4 * GameState.lotacao())));
        }
        t.y = PLAT_Y + (t.t / 1400) * t.alt;
        if (t.y >= PLAT_Y + t.alt) { t.y = PLAT_Y - t.alt; t.estado = 'espera'; t.t = 0; }
        t.aviso = 'PERDEU ESSE';
        break;
    }
    // as folhas correm pro alvo: abertas só com o trem parado e liberado
    var alvo = (t.estado === 'aberto') ? 1 : 0;
    var va = dt / 380;
    t.abertura = Math.max(0, Math.min(1, (t.abertura || 0) + (alvo > (t.abertura || 0) ? va : -va)));
    this.pintaTrem(t);
  },

  /* ---------- minigame de entrar ---------- */

  /* quanto de pressão o vagão exige: no pico é uma parede de gente,
     fora do pico é quase só entrar */
  metaEmpurrao: function () {
    return 42 + 58 * GameState.lotacao();
  },

  comecaEmpurrao: function (t) {
    this.empurrando = true;
    // guardar QUAL trem é o que faz o lado virar sentido lá no entrou()
    this.tremEmpurrado = t;
    // você não começa do zero: já está com o ombro na porta
    this.pressao = this.metaEmpurrao() * 0.18;
    this.gMini.setVisible(true);
    var lot = GameState.lotacao();
    this.tMini.setVisible(true).setText(
      lot > 0.8 ? 'VAGÃO LOTADO' : (lot > 0.45 ? 'VAGÃO CHEIO' : 'DÁ PRA ENTRAR'));
    this.tMini2.setVisible(true).setText(nomeAgir() + ' SEM PARAR');
    sfx('empurra');
  },

  fimEmpurrao: function () {
    this.empurrando = false;
    this.gMini.setVisible(false).clear();
    this.tMini.setVisible(false);
    this.tMini2.setVisible(false);
  },

  /* entrou: no talo ou espremido na porta fechando */
  entrou: function (espremido) {
    this.fimEmpurrao();
    /* No treino, entrar é o fim do minigame e não o começo do vagão:
       sem isto o treino do empurrão te despachava pra uma viagem de
       verdade depois de você só querer ver o empurrão. */
    if (this.treino) {
      var eu = this;
      fala(this, espremido ? 'Espremido na porta,\nmas entrou.' : 'Entrou no vagão.', []);
      this.time.delayedCall(1400, function () { if (eu.dialog) eu.dialog.fecha(); });
      return;
    }
    GameState.addDescanso(-4 - 5 * GameState.lotacao() - (espremido ? 4 : 0));
    if (espremido) { GameState.addCarisma(-2); this.cameras.main.shake(200, 0.005); }
    /* ---------- o lado vira o rumo ----------
       É aqui que a plataforma central deixa de ser desenho. Até agora
       `dir` só era escrito pelo apontaPraAlvo(), que aponta pro alvo
       sozinho — e enquanto ele fosse a única fonte era IMPOSSÍVEL pegar
       o trem errado, ou seja, escolher o lado não escolhia nada. Agora
       quem manda é a via em que você embarcou. Na lateral não muda
       nada, porque lá o trem já nasce com o sentido que você seguia. */
    GameState.dir = this.tremEmpurrado.dir;
    Missoes.conta('embarcou', { faixa: GameState.faixa().key, estacao: GameState.estacaoAtual() });
    sfx('ok');
    this.scene.start('Vagao', {});      // vazio mas explícito: sem dados o Phaser reaproveita os do treino
  },

  falhouEmbarque: function () {
    // quase lá conta: a porta fecha nas suas costas e você vai espremido
    if (this.pressao >= this.metaEmpurrao() * 0.62) { this.entrou(true); return; }
    var t = this.tremEmpurrado;
    this.fimEmpurrao();
    if (t) t.perdido = true;
    GameState.addDescanso(-4);
    GameState.addCarisma(-2);
    GameState.passaTempo(3);
    sfx('nao');
    fala(this, 'A porta fechou na sua cara.\nO próximo vem logo.', []);
    var self = this;
    this.time.delayedCall(1500, function () { if (self.dialog) self.dialog.fecha(); });
  },

  atualizaEmpurrao: function (dt) {
    var dif = GameState.dificuldade();
    var c = GameState.char;
    var lot = GameState.lotacao();
    var meta = this.metaEmpurrao();

    var forca = 13 * c.empurraoMult
      * (0.7 + 0.3 * (GameState.descanso / c.descansoMax))
      * (0.9 + GameState.carisma / 400);
    // a multidão empurra de volta, mas só com força de multidão
    var quedaS = (6 + dif * 1.8) * (0.5 + 0.7 * lot);
    this.pressao = Math.max(0, this.pressao - quedaS * (dt / 1000));
    // segurar rende pouco; quem martela entra
    if (Ctrl.act) this.pressao += quedaS * 0.5 * (dt / 1000);
    if (Ctrl.actJust) { this.pressao += forca; sfx('empurra'); this.cameras.main.shake(60, 0.003); }

    var g = this.gMini; g.clear();
    caixa(g, 32, GH / 2 - 68, GW - 64, 124, 0xe8362c);
    barra(g, 48, GH / 2 - 12, GW - 96, 24, this.pressao / meta, 0x00e676, 0x1e1e2a);

    if (this.pressao >= meta) this.entrou(false);
  },

  /* ---------- loop ---------- */

  /* ---------- o ambulante da plataforma ----------
     O carrinho de dogão fica parado no saguão; na plataforma quem vende
     anda. É a figura mais constante do metrô de São Paulo: a caixa de
     isopor, o preço cantado, e o passo que não para nunca.

     Ele carrega o que dá pra carregar andando — bala, chocolate,
     pururuca e água. E a água é o que ele mais vende quando aperta o
     calor, que é quando ela também vale mais pra quem compra. */
  montaAmbulante: function () {
    this.ambulante = null;
    // de madrugada não tem ninguém vendendo; no movimento, quase sempre
    if (Math.random() > 0.35 + GameState.lotacao() * 0.55) return;
    /* sempre o do isopor e da mochila: os outros dois bonecos de ambulante
       são os atendentes das lojas, e de longe liam como passageiro comum
       ('não é ambulante essa') */
    var a = new Ator(this, 180, platY(200 + Math.random() * (PLAT_ALT - 340)), 'np_ambulante_a');
    a.sp.setDepth(39);
    a.vy = (Math.random() < 0.5 ? -1 : 1) * 26;
    this.ambulante = a;
    this.gente.push(a); this.fixos.push(a);
  },

  andaAmbulante: function (dt) {
    var a = this.ambulante;
    if (!a || !a.sp || !a.sp.active) return;
    var ny = a.sp.y + a.vy * dt / 1000;
    if (ny < platY(150) || ny > platY(PLAT_ALT - 40)) { a.vy = -a.vy; ny = a.sp.y; }
    a.sp.y = ny;
    a.dir = a.vy < 0 ? 'up' : 'down';
    a.anima(dt, true);
  },

  juntaGente: function () {
    var f = (this.fixos || []).filter(function (a) { return a && a.sp && a.sp.active; });
    return this.plateia.concat(this.esperando, [this.guarda], f);
  },

  ambulantePerto: function () {
    var a = this.ambulante;
    if (!a || !a.sp || !a.sp.active) return null;
    return Math.hypot(this.pl.sp.x - a.sp.x, this.pl.sp.y - a.sp.y) < 46 ? a : null;
  },

  /* ninguém atravessa ninguém, e cada andar tem os seus limites: o
     empurrão não pode jogar quem está no saguão pra dentro da parede nem
     quem está na plataforma pra dentro do trilho. */
  resolveCorpos: function () {
    var antes = { x: this.pl.sp.x, y: this.pl.sp.y };
    var self = this;
    /* ---------- só quem está na janela ----------
       A separação de corpos compara todo mundo com todo mundo. Com a
       plataforma cheia de pico — mais de trinta pessoas, mais o saguão —
       isso é pár a pár num mundo de 1572px de altura, sendo que a tela
       mostra 576. Quem está seiscentos pixels acima não pode esbarrar em
       ninguém aqui embaixo, e conferir isso custou 25 quadros por
       segundo. A peneira é O(n) e mata a conta quadrática. */
    var topo = this.cameras.main.scrollY - 80, base = topo + GH + 160;
    var perto = [];
    for (var q = 0; q < this.gente.length; q++) {
      var g = this.gente[q];
      if (g && g.sp && g.sp.y > topo && g.sp.y < base) perto.push(g);
    }
    resolveCorpos(this.pl, perto,
      function (sp) {
        if (!self.podeIr(sp.x, sp.y)) { sp.x = antes.x; sp.y = antes.y; }
      },
      function (sp) {
        if (sp.y < ESC_Y) { limitaPlataforma(sp); return; }
        /* ---------- ninguém anda por cima da barraca ----------
           O jogador já era barrado por `podeIr`, e a multidão não era
           barrada por nada: os passageiros atravessavam o carrinho de
           dogão como se ele fosse chão. Barraca que dá pra atravessar
           não é barraca, é textura.
           Empurra pelo lado mais curto, que é o que faz a pessoa
           contornar em vez de grudar. */
        for (var b = 0; b < self.barracas.length; b++) {
          var q = self.barracas[b];
          if (sp.x > q.x - 10 && sp.x < q.x + q.w + 10 &&
              sp.y > q.y - 6 && sp.y < q.y + q.h + 6) {
            var dEsq = sp.x - (q.x - 10), dDir = (q.x + q.w + 10) - sp.x;
            sp.x = (dEsq < dDir) ? q.x - 10 : q.x + q.w + 10;
          }
        }
        /* A trava era uma só, a do lado de FORA (y 258..514), e valia
           até pra quem já tinha passado a catraca: no primeiro esbarrão
           a pessoa era jogada de volta pra fora, e a fila da escada
           ficava cheia de gente parada em y 258. Quem está na escada não
           tem trava (o degrau manda); quem passou fica do lado de dentro. */
        if (sp.naEscada || sp.passante) return;
        sp.x = self.itq ? Phaser.Math.Clamp(sp.x, MEZ.x0 + 34, MEZ.x1 - 32) : Phaser.Math.Clamp(sp.x, 34, 288);
        if (sp.dentro) { sp.y = Phaser.Math.Clamp(sp.y, ESC_BOCA + 4, 262); return; }
        sp.y = Phaser.Math.Clamp(sp.y, 258, 514);
      });

    /* ---------- quem anda na passarela também é gente ----------
       Os passantes da Itaquera (passarela, braço, galeria e rua) moram
       numa lista própria, fora da de corpos, porque o limite do saguão os
       puxaria de volta pro mezanino. Só que assim o boneco atravessava
       todos eles ('a física sumiu, eu passo por cima das pessoas'), e
       são justamente as primeiras pessoas que se cruza saindo de casa.
       Contra o jogador eles contam: os dois se afastam, e o jogador não
       é empurrado pra fora do chão. Entre eles não, que corredor cheio de
       gente se desviando em fila é o que a rota já faz. */
    if (this.passantes) {
      var meuPeso = pesoDaMultidao();
      var quem = this.passantes.concat((this.compradores || []).map(function (c) { return c.a; }));
      for (var k = 0; k < quem.length; k++) {
        var ps = quem[k];
        if (!ps || !ps.sp || !ps.sp.active) continue;
        if (Math.abs(ps.sp.y - this.pl.sp.y) > PERTO_Y) continue;
        var ax = this.pl.sp.x, ay = this.pl.sp.y;
        if (separaCorpos(this.pl.sp, ps.sp, 1 - meuPeso, meuPeso) && !this.podeIr(this.pl.sp.x, this.pl.sp.y)) {
          // encostado na parede, quem sai do lugar é o passante
          this.pl.sp.x = ax; this.pl.sp.y = ay;
          separaCorpos(this.pl.sp, ps.sp, 0, 1);
        }
      }
    }
  },

  terminaJogo: function () {
    GameState.salvarRecorde();
    vaiPraOFim(this);
  },
  fimDeJogo: function () {
    GameState.salvarRecorde();
    vaiPraOFim(this);
  },

  /* ---------- loop ----------
     Um loop só pra estação inteira, e a ordem importa: o trem anda
     SEMPRE, esteja você em cima ou embaixo. É o que faz o letreiro
     contando lá do saguão significar alguma coisa. */
  update: function (time, delta) {
    Ctrl.update();
    var dt = Math.min(delta, 50);
    /* A vigia do treino roda ANTES das saídas antecipadas: o diálogo que
       fecha o minigame é justamente uma delas, e vigiado depois dele o
       fim nunca seria visto. */
    if (this.treino) vigiaTreino(this, dt, this.treinoEmCurso);
    if (this.gates) this.animaCatracas(dt);

    if (this.dialog && this.dialog.ativo) { this.dialog.update(dt); return; }
    if (this.fim) return;
    if (this.duelo) { this.pl.anima(dt, false); return; }   // o '!' e o zoom antes do duelo

    /* A estação é a primeira cena de cada perna, e é aqui que chega quem
       acabou de ser mandado embora ou de dormir no ponto. Sem esta
       checagem dava pra jogar uma cena inteira já demitido. */
    var morte = GameState.derrota();
    if (morte) { GameState.motivoFim = morte; this.fim = true; GameState.salvarRecorde(); vaiPraOFim(this); return; }

    this.cicloTrem(dt);
    if (this.empurrando) { this.atualizaEmpurrao(dt); return; }
    if (this.noElevador) { this.viajaDeElevador(dt); return; }

    // esperar na estação cansa, esteja você onde estiver dentro dela
    GameState.addDescanso(-0.0004 * GameState.char.dreno * dt);

    /* Flagrado: a ronda para, ele vem até você, e o resto da cena
       espera. Pulando: você não controla mais nada até cair de um dos
       dois lados — é isso que faz o pulo ser uma aposta. */
    if (this.flagra) { this.atualizaFlagra(dt); this.pintaCone(); return; }
    this.atualizaGuarda(dt);
    if (this.pulo) { this.atualizaPulo(dt); if (this.pulo || this.flagra) this.pintaCone(); return; }
    var vendo = this.pintaCone();

    var i;
    this.andaSaguao(dt);
    this.andaFila(dt);
    this.andaAmbulante(dt);
    this.vigiaDuelos();

    var vel = GameState.char.velocidade * (0.6 + 0.4 * (GameState.descanso / GameState.char.descansoMax));
    var dx = (Ctrl.right ? 1 : 0) - (Ctrl.left ? 1 : 0);
    var dy = (Ctrl.down ? 1 : 0) - (Ctrl.up ? 1 : 0);
    var mv = (dx !== 0 || dy !== 0);
    if (mv) {
      var n = Math.sqrt(dx * dx + dy * dy);
      var px = this.pl.sp.x + (dx / n) * vel * dt / 1000;
      var py = this.pl.sp.y + (dy / n) * vel * dt / 1000;
      // pra onde o boneco vai decide a mão da catraca (e o funil acha a certa)
      this._indo = dy; this._yDe = this.pl.sp.y;
      if (this.podeIr(px, this.pl.sp.y)) this.pl.sp.x = px;
      if (this.podeIr(this.pl.sp.x, py)) this.pl.sp.y = py;
      else if (dy !== 0) this.afunila(py, dx, vel * dt / 1000);
      this._indo = 0;
      this.pl.setDir(dx, dy);
    }
    this.pl.anima(dt, mv);
    this.rodaEscada(dt, mv);
    var eu = this;
    empurraoNaMarra(this, this.gente, function (sp) { return eu.podeIr(sp.x, sp.y); });
    this.resolveCorpos();
    this.chao.atualiza(dt, this.pl.sp.x, this.pl.sp.y);
    mostraLixoNaMao(this, this.pl);
    ondasDoPregao(this, time);
    vigiaDex(this, time);
    this.atualizaCarga(dt, mv);
    if (this.itq) { this.atualizaItaquera(dt); if (this.fim) return; }
    else if (this.mez) this.atualizaMezanino(dt);

    // passar do bloqueio é entrar no sistema, e isso não se desfaz
    /* Passou pela catraca andando, o braço gira pra você: pra dentro na
       entrada, pra fora na saída. Pulando não — quem pula passa por cima,
       não pagou, e o braço fica onde estava. */
    var yAgora = this.pl.sp.y;
    var yAntes = (this.yCatraca === undefined) ? yAgora : this.yCatraca;
    if (this.liberado && !this.pulo &&
      ((yAntes > CATRACA_Y && yAgora <= CATRACA_Y) || (yAntes < CATRACA_Y && yAgora >= CATRACA_Y))) {
      this.giraCatracaEm(this.pl.sp.x, yAgora < yAntes ? 1 : -1, true);
      if (yAgora < yAntes) Missoes.conta('catraca');
    }
    this.yCatraca = yAgora;

    if (this.pl.sp.y <= 204) GameState.dentroDoSistema = true;

    this.contexto(vendo);
  },

  /* O rodapé fala do andar em que você está: em cima é porta de trem e
     ambulante, embaixo é bilheteria, barraca e catraca. */
  contexto: function (vendo) {
    var x = this.pl.sp.x, y = this.pl.sp.y, dica = '';
    if (this.contextoLixo()) return;
    if (this.contextoTomada()) return;
    if (this.contextoElevador()) return;
    if (this.itq && this.contextoItq()) return;

    if (y < ESC_Y) {
      var trem = this.tremNaPorta();
      var vendedor = this.ambulantePerto();
      /* A porta manda: quem está com o trem aberto na frente não vai
         parar pra comprar bala. O ambulante é pra quem está esperando. */
      if (trem) {
        this.dica.setText(nomeAgir() + ': entrar no vagão', PAL.verde);
        if (Ctrl.actJust) this.comecaEmpurrao(trem);
      } else if (vendedor) {
        // 'COMPRAR DO AMBULANTE' com o prefixo dá 27 caracteres: quatro a
        // mais do que a faixa aguenta, e o fim sai pela borda
        this.dica.setText(nomeAgir() + ': COMPRAR', PAL.amarelo);
        if (Ctrl.actJust) {
          abreBarraca(this, '"Olha o Ralls, o chocolate,\na água geladinha!"',
            estaCalor() ? ['agua', 'ralls', 'pururuca', 'chocolate'] : ['ralls', 'chocolate', 'pururuca', 'agua'],
            null, true);
        }
      } else if (this.mapaPerto(x, y)) {
        this.dica.setText(nomeAgir() + ': OLHAR O MAPA', PAL.amarelo);
        if (Ctrl.actJust) abreMapaParede(this);
      } else {
        /* A seta aponta pra via de quem está com a porta aberta: numa
           central ◄ e ► são metades diferentes da plataforma, e mandar
           ◄ pra quem está do lado direito era mandar pro trem errado. */
        var ab = this.tremAberto();
        this.dica.setText(ab ? ('chegue na porta ' + (ab.lado < 0 ? '◄' : '►')) : '', PAL.amarelo);
      }
      return;
    }

    if (y < 116) { this.dica.setText('▲ PLATAFORMA', PAL.cinza); return; }

    // na Itaquera os dois são cabines (barracas com acao), e não vãos na parede
    var noGuiche = !this.mez && (x < ACH.alcance && y > ACH.y - 8 && y < ACH.y + ACH.h + 8);
    var naBilheteria = !this.mez && (x < 96 && y > 244 && y < 288 && !this.liberado);
    var gate = this.gateSob(x);
    var perto = (gate && y > 244 && y < 284);
    // na cadeira de rodas não se pula catraca
    var naCatraca = (perto && !this.liberado && !gate.fechada && gate.sentido !== 'sai' && !temPoder('cadeira'));
    var soSaida = (perto && !gate.fechada && gate.sentido === 'sai');
    /* O cone é a regra inteira: se você está dentro dele, pular é ser
       pego. Fora dele, o risco é ele virar no meio do pulo. */
    var seguro = naCatraca && !vendo;

    var noMapa = this.mapaPerto(x, y);
    var barraca = this.barracaPerto(x, y);
    if (barraca) dica = nomeAgir() + ': ' + barraca.nome;
    else if (noMapa) dica = nomeAgir() + ': OLHAR O MAPA';
    /* 'TOQUE: ACHADOS E PERDIDOS' dá 25 caracteres com o prefixo, e a
       faixa cabe 26 justos. O preço é a informação que decide. */
    // sem a placa em cima do guichê, é a dica que diz o que ele é
    else if (noGuiche) dica = nomeAgir() + ': ACHADOS (' + ACHADOS_PRECO + ')';
    else if (naBilheteria) dica = nomeAgir() + ': comprar passagem';
    else if (perto && gate.fechada) dica = 'catraca fora de serviço';
    else if (soSaida && !this.praCasa) dica = 'SÓ SAÍDA. ENTRADA NO MEIO';
    else if (gate && y > 172 && y < 206 && gate.sentido === 'entra') dica = 'ENTRADA. SAIA PELOS LADOS';
    else if (naCatraca) {
      dica = vendo
        ? 'ELE TÁ TE VENDO — ESPERE'
        : nomeAgir() + (gate.larga ? ': PULAR A LARGA' : ': PULAR AGORA');
    } else if (vendo) dica = 'sai da frente dele';
    else if (this.praCasa) dica = 'CASA: ' + SAIDAS_ITQ[saidaDeCasa()].rotulo + ' ▼';
    else if (this.liberado || this.pulou) dica = 'suba pela escada ▲';
    if (!dica && GameState.lixo) dica = 'JOGUE O LIXO NA LIXEIRA';
    this.dica.setText(dica, seguro ? PAL.verde : (perto && gate.fechada ? PAL.cinza : PAL.amarelo));

    if (Ctrl.actJust) {
      if (barraca && barraca.acao === 'bilheteria') this.recargaBU();
      else if (barraca && barraca.acao === 'achados') this.abreAchados();
      else if (barraca && barraca.acao === 'recarga') this.recargaBU();
      else if (barraca && barraca.acao === 'saque') this.saca24h();
      else if (barraca) abreBarraca(this, barraca.titulo, barraca.cardapio);
      else if (noMapa) abreMapaParede(this);
      else if (noGuiche) this.abreAchados();
      else if (naBilheteria) this.abreMenuBilheteria();
      else if (naCatraca) this.comecaPulo(gate);
    }
  }
});
