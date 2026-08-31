/* global Phaser */
/* Catraca — dentro do vagão: banco, equilíbrio, eventos e o dilema do lugar */

/* O comprimento do vagão é uma alternância: porta, baia, porta, baia.
   Antes não era — as portas e as baias da direita moravam na mesma
   faixa de parede e se sobrepunham 40px cada, três vezes. O banco
   ficava bem no meio do vão da porta, e como o corredor parava em
   x=250 dava pra encostar no banco mas nunca na porta. O vagão virava
   uma gaiola com saída pintada na parede.

   Agora cada coisa tem a sua faixa, e as duas paredes usam as mesmas:
   baia de frente pra baia, porta de frente pra janela. */
/* Ritmo da viagem. Antes uma cena de vagão era uma estação e durava
   17s; agora ela é a perna inteira, quinze estações de Itaquera até a
   Sé, então cada trecho precisa ser curto o bastante pra a perna não
   virar uma novela. */
/* 14000 e não 8200: em 8,2s não dá tempo de atravessar dois carros num
   trem de oito, e o trecho entre estações é justamente onde tudo
   acontece — a situação do carro, o ambulante, a encarada, o dilema
   do lugar. O jogador chegava antes de decidir qualquer coisa.
   Medido andando de ponta a ponta: 14s dão dois carros e uma decisão. */
var TEMPO_ENTRE_ESTACOES = 18000;
/* ---------- a viagem tem que durar mais que a parada ----------
   Ficou invertido por um tempo: 14s de viagem e 30s de porta aberta. A
   parada era o DOBRO da viagem, e a viagem é onde o jogo acontece — o
   evento, o dilema, o equilíbrio, atravessar carro. Parada é tempo morto
   pra quem não vai descer, e um dia de trinta estações virava 22 minutos
   de jogo com metade parado.

   Mas 4,2s também não servia: não dá pra atravessar um carro até a porta
   nesse tempo, e descer virava reflexo em vez de decisão.

   As duas coisas cabem porque a parada longa só faz falta na SUA
   estação. Nas de passagem são 7s — o bastante pra ver quem entrou e
   pra mudar de ideia. Na sua (ou na baldeação) são 15, que é o tempo de
   ler o letreiro, levantar e caminhar. E a viagem, 18, continua maior
   que qualquer uma das duas. */
var TEMPO_PARADO = 7000;
var TEMPO_PARADO_SUA = 15000;

/* As barras saíam de dentro dos módulos agora que eles avançam 62px
   pra dentro do carro: elas recuaram pro corredor, que é onde a mão
   alcança em pé. */
var BARRAS_X = [104, 212];  // as duas barras de apoio do corredor
var ALCANCE_BARRA = 34;     // até onde o braço chega

var PORTA_ALT = 60;
/* Baia, porta, baia, porta, baia. Eram três portas e três baias de 58,
   mas baia de 58 só cabe uma pessoa: pra caber duas ela precisa de 88,
   e três baias de 88 mais três portas não cabem na altura da tela sem
   empurrar a primeira porta pra debaixo da placa de rota, que é onde
   ela ficava meio escondida. Uma porta a menos, e as duas que sobram
   caem no terço e nos dois terços — bem no meio da tela, que é onde a
   mão alcança. */
var PORTAS_Y = [222, 384];             // faixas de porta, na parede direita

/* ---------- a planta do carro, do jeito que ela é ----------
   O vagão tinha seis baias compridas encostadas nas paredes, e todo
   mundo sentado de perfil olhando pro corredor. Não é assim que o metrô
   de São Paulo é por dentro.

   Na foto o que tem é MÓDULO: dois bancos virados um pro outro, com o
   vão das pernas no meio — quem senta num olha na cara de quem senta no
   outro. E, separada deles, uma cadeira virada pro vagão, de lado: a
   PREFERENCIAL.

   São duas coisas diferentes, e a diferença importa pro jogo. O módulo
   é banco comum, primeiro que chega senta. A preferencial não é: ela é
   de quem precisa, e é ali que mora o dilema que o jogo inteiro gira em
   volta. Desenhar as duas iguais era apagar essa diferença. */
var MODULO_ALT = 88, MODULO_FUNDO = 62;   // 62 de profundidade: dois assentos lado a lado
/* Um módulo em cima e um embaixo; as portas e a preferencial ficam
   entre eles. Eles são afastados das portas de propósito: a parede
   salta 58px do módulo pro vestíbulo, e sem espaço pra essa transição
   quem caminhasse rente à parede era arrancado pro corredor de uma vez
   só — parecia teleporte, não parede. */
var MODULOS_Y = [106, 458];
var BANCO_ENCOSTO = 6, BANCO_ASSENTO = 26;
/* o vão das pernas: 24px entre os dois assentos. Menos que isso e os
   dois bonecos se encostam; mais e o módulo não cabe entre as portas */
var MODULO_VAO = 24;
var MODULO_X = [30, 228];                 // borda de fora do módulo, parede esquerda e direita
var MODULO_ASSENTOS = [16, 46];           // centro de cada assento, a partir da borda de fora

/* A preferencial mora entre as duas portas, encostada na parede e
   virada pro corredor — a única cadeira do carro de lado, que é
   exatamente o que ela é na vida. Uma de cada lado. */
/* Era UM lugar por lado, e um banco comprido com uma pessoa só nele lê
   como banco quebrado. Entre as duas portas sobram 102px livres (a de
   cima acaba em 282, a de baixo começa em 384) e cada assento ocupa 44,
   então cabem dois por lado com 7px de folga em cada ponta: quatro
   preferenciais por carro, que é o que um carro tem. */
var PREF_PASSO = 44, PREF_LUGARES = 2;
var PREF_Y = 289, PREF_ALT = PREF_PASSO * PREF_LUGARES, PREF_FUNDO = 28;
var PREF_X = [30, 262];

var LUGAR_ALT = 40;

/* O corredor aperta na altura dos módulos e abre onde não tem banco
   nenhum: é o que faz o carro ter forma em vez de ser um corredor reto
   com desenho nas beiradas. */
var CORREDOR_ESQ = 70, CORREDOR_ESQ_MOD = 98, RAMPA_MODULO = 40;
function fatorModulo(y) {
  var yl = yNoCarro(y), k = 0;
  for (var i = 0; i < MODULOS_Y.length; i++) {
    var d = Math.max(MODULOS_Y[i] - yl, yl - (MODULOS_Y[i] + MODULO_ALT), 0);
    if (d <= 0) return 1;
    if (d < RAMPA_MODULO) k = Math.max(k, 1 - d / RAMPA_MODULO);
  }
  return k;
}
/* ---------- e a preferencial também é móvel ----------
   O corredor sabia dos módulos e das portas e NUNCA soube da
   preferencial. Dava pra encostar nela: o corredor começa em 70, o banco
   acaba em 58, e o boneco tem 32 de largura com origem no meio — a
   metade esquerda dele entrava quatro pixels dentro do estofado. Era o
   bug do cara flutuando em cima do banco.

   Passou despercebido enquanto o banco tinha 44px de altura. Quando ele
   virou dois lugares e foi pra 88, o mesmo erro passou a acontecer no
   dobro do caminho, e aí ficou impossível não ver.

   RAMPA_PREF existe pelo mesmo motivo da RAMPA_MODULO: parede que salta
   de uma vez arranca quem anda rente a ela, e parece teleporte. */
var CORREDOR_ESQ_PREF = 80, CORREDOR_DIR_PREF = 240, RAMPA_PREF = 26;
function fatorPref(y) {
  var yl = yNoCarro(y);
  var d = Math.max(PREF_Y - yl, yl - (PREF_Y + PREF_ALT), 0);
  if (d <= 0) return 1;
  return (d < RAMPA_PREF) ? 1 - d / RAMPA_PREF : 0;
}
function bordaEsqVagao(y) {
  var x = CORREDOR_ESQ + (CORREDOR_ESQ_MOD - CORREDOR_ESQ) * fatorModulo(y);
  return Math.max(x, CORREDOR_ESQ + (CORREDOR_ESQ_PREF - CORREDOR_ESQ) * fatorPref(y));
}

/* Uma janela: caixilho escuro, vidro, e o brilho de cima onde o túnel
   passa. Serve nas duas paredes. */
function janelaVagao(g, x, y, alt) {
  g.fillStyle(0x0d1119, 1).fillRect(x, y, 22, alt);
  g.fillStyle(0x161d2b, 1).fillRect(x + 2, y + 2, 18, alt - 4);
  g.fillStyle(0xffffff, 0.07).fillRect(x + 2, y + 2, 18, 14);
}

/* está na altura de alguma porta? é o que abre o vestíbulo e o que
   corta a barra de apoio */
function naPorta(y, folga) {
  folga = folga || 0;
  var yl = yNoCarro(y);
  for (var i = 0; i < PORTAS_Y.length; i++) {
    if (yl > PORTAS_Y[i] - folga && yl < PORTAS_Y[i] + PORTA_ALT + folga) return true;
  }
  return false;
}

/* guarda onde a pessoa está e com que fase ela balança, pra cada uma
   respirar no seu tempo em vez de o vagão inteiro pulsar junto */
function sentaAnimado(a) {
  a.bx = a.sp.x;
  a.by = a.sp.y;
  a.fase = Math.random() * Math.PI * 2;
  a.olhaT = Math.random() * 2000;
  a.proxOlhada = 2200 + Math.random() * 4500;
}

/* ---------- o repertório do rimador ----------
   Ele fecha citando quem está jogando, e é por isso que "ele te citou
   na rima" faz sentido depois: a rima citou mesmo. Nome de papel, não
   pronome — o jogo nunca disse o gênero de ninguém. */
/* Duas linhas, nenhuma passando de 22 caracteres: na largura da tela
   isso é o limite antes de a placa quebrar em três e ir parar em cima
   do aviso de solavanco. */
var VERSOS_RIMADOR = [
  'LICENÇA, SENHORAS\nE SENHORES',
  'NÃO É ESMOLA NÃO,\nÉ TRABALHO NA LINHA',
  null,                                  // aqui entra o verso do personagem
  'GOSTOU, COLABORA.\nNÃO GOSTOU, DESCULPA'
];
var VERSO_DO_JOGADOR = {
  estudante: 'O ESTUDANTE PAGA MEIA\nE CARREGA O MUNDO',
  clt: 'O CLT ACORDA CEDO\nPRA CHEGAR ATRASADO',
  senhor: 'ESSE AÍ NÃO PAGA:\nJÁ PAGOU A VIDA TODA',
  ambulante: 'ESSE AÍ É DA ÁREA,\nRESPEITO ENTRE COLEGA'
};

/* ---------- batalha de rima ----------
   O rimador já entrava, montava a caixinha e mandava quatro versos. O
   que faltava era o outro lado do microfone.

   Quatro pistas, uma pra cada direção, e as sílabas descendo até a
   linha de acerto.

   A direção parecia o comando óbvio: é o que o jogo já ensina no
   disfarce e no andar. No teclado é. No celular, não — lá direção sai
   do manche, e manche é um polegar ARRASTANDO. Ninguém bate sílaba no
   tempo arrastando: a batalha era derrota marcada em qualquer celular,
   por mais que a pessoa jogasse bem.

   Então a pista é um botão. Cada uma é uma coluna clicável da altura
   do painel, e o dedo cai em cima da sílaba que está chegando — que é
   como se joga isso em celular desde sempre. As setas continuam
   valendo no teclado; não substituem, convivem. */
var BATALHA_DIRS = ['left', 'up', 'down', 'right'];
var BATALHA_SETAS = ['◄', '▲', '▼', '►'];
var BATALHA_CORES = [0xe8362c, 0xf2c14e, 0x00e676, 0x0b9fdd];
/* O painel mora abaixo da placa de rota (que vai até y=120) e acima da
   barra de dica. A seta de cada pista fica embaixo da sua caixa de
   acerto, não no meio da pista: no meio ela virava obstáculo visual em
   cima das sílabas caindo. */
var BAT_TOPO = 178, BAT_LINHA = 432, BAT_X0 = 52, BAT_LARG = 54;
function batalhaX(lane) { return BAT_X0 + lane * BAT_LARG + BAT_LARG / 2; }

/* O corredor tem a largura do vão entre as baias e abre até a parede na
   altura de cada porta. É esse vestíbulo que faz descer virar um
   movimento: sem ele dá pra encostar na baia e nunca na porta.

   A abertura não é um degrau, é uma rampa: com corte seco, quem saísse
   da faixa da porta encostado na parede era arrancado 30px de uma vez,
   e parecia teleporte. Assim a pessoa escorrega pra dentro e pra fora
   da boca do vestíbulo. */
var CORREDOR_DIR = 250, VESTIBULO_DIR = 280, RAMPA_VESTIBULO = 20;
var CORREDOR_DIR_MOD = 222;   // na altura do módulo o corredor aperta

/* ---------- o trem inteiro, e não um vagão só ----------
   O vagão era uma tela: cabia inteiro no vidro, e o fim dele era o fim
   do mundo. Isso fazia o metrô parecer um cenário de fundo pintado
   atrás de você em vez de um lugar — e um trem de um vagão só não é
   trem, é um ônibus quadrado.

   Agora são OITO carros emendados, e a câmera anda com você. Ninguém
   corta pra lugar nenhum: você caminha, o carro de cima entra pela
   borda de cima, e no meio dos dois tem o fole — aquele corredor
   estreito de lona sanfonada que balança e que todo mundo atravessa
   correndo. É ele que vende a continuidade, porque é o único pedaço do
   trem que só existe POR SER a emenda entre duas coisas.

   O corpo de cada carro tem a altura do que cabia na tela (524px), e é
   de propósito: a geometria de dentro — portas, baias, barras — não
   mudou uma linha. O carro 0 continua exatamente onde estava; o carro i
   é o mesmo desenho PASSO_CARRO pixels abaixo. Tudo que sabia calcular
   'em que altura da tela isso está' continua valendo, contanto que
   pergunte primeiro em que carro está. */
var CARROS = 8;
var CARRO_ALT = GH - HUD_H;                     // 524, o corpo de um carro
var SANFONA_ALT = 56;                           // o fole entre dois carros
var PASSO_CARRO = CARRO_ALT + SANFONA_ALT;      // 580, de topo a topo
/* o fole é estreito de propósito: é onde o trem afunila, e onde dá pra
   sentir que se está passando de um lugar pro outro */
var SANFONA_X0 = 116, SANFONA_X1 = 206, RAMPA_SANFONA = 26;

function topoDoCarro(i) { return HUD_H + i * PASSO_CARRO; }
function fundoDoTrem() { return topoDoCarro(CARROS - 1) + CARRO_ALT; }
function carroDe(y) {
  return Phaser.Math.Clamp(Math.floor((y - HUD_H) / PASSO_CARRO), 0, CARROS - 1);
}
/* A mesma altura, trazida de volta pro carro 0. É isto que deixa toda a
   geometria de dentro do carro (PORTAS_Y, MODULOS_Y, BARRAS_X) valer
   igual nos oito sem reescrever nada. */
function yNoCarro(y) { return y - carroDe(y) * PASSO_CARRO; }
function yDoCarro(i, y0) { return y0 + i * PASSO_CARRO; }

/* O quanto o trem está apertado nesta altura: 0 no meio do carro, 1
   dentro do fole, e uma rampa entre os dois — com corte seco a pessoa
   era arrancada pro meio do corredor de uma vez, e parecia teleporte.
   O primeiro e o último carro não têm fole nas pontas de fora: lá é a
   cabine, e a parede é o fim do trem mesmo. */
function apertoSanfona(y) {
  var meia = SANFONA_ALT / 2, perto = 1e9;
  for (var i = 0; i < CARROS - 1; i++) {
    perto = Math.min(perto, Math.abs(y - (topoDoCarro(i) + CARRO_ALT + meia)));
  }
  if (perto <= meia) return 1;
  if (perto >= meia + RAMPA_SANFONA) return 0;
  return (meia + RAMPA_SANFONA - perto) / RAMPA_SANFONA;
}

function bordaVagao(y) {
  var yl = yNoCarro(y), meia = PORTA_ALT / 2, perto = 9999;
  for (var i = 0; i < PORTAS_Y.length; i++) {
    perto = Math.min(perto, Math.abs(yl - (PORTAS_Y[i] + meia)));
  }
  var base;
  if (perto <= meia) base = VESTIBULO_DIR;
  else if (perto >= meia + RAMPA_VESTIBULO) base = CORREDOR_DIR;
  else base = VESTIBULO_DIR - (VESTIBULO_DIR - CORREDOR_DIR) * (perto - meia) / RAMPA_VESTIBULO;
  // e recua na altura do módulo, que avança 62px pra dentro do carro
  var x = base - (base - CORREDOR_DIR_MOD) * fatorModulo(y);
  // e na altura da preferencial, pelo mesmo motivo
  return Math.min(x, base - (base - CORREDOR_DIR_PREF) * fatorPref(y));
}
function limitaVagao(sp) {
  var k = apertoSanfona(sp.y), dir = bordaVagao(sp.y), esq = bordaEsqVagao(sp.y);
  sp.x = Phaser.Math.Clamp(sp.x, esq + (SANFONA_X0 - esq) * k, dir + (SANFONA_X1 - dir) * k);
  sp.y = Phaser.Math.Clamp(sp.y, 84, fundoDoTrem() - 20);
}

/* ---------- o que cada carro guarda ----------
   Oito carros iguais só valem a pena se não forem iguais por dentro.
   Cada carro sorteia uma situação no embarque, e ela só acontece quando
   você entra ali: o trem deixa de ser um corredor comprido e vira oito
   lugares com histórias diferentes, e caminhar passa a ser uma escolha
   com risco — o vagão do lado pode ter um banco vago, e pode ter o
   fiscal.

   Quantos carros têm alguma coisa acontecendo cresce com a corrida: no
   primeiro dia são dois ou três, e lá pelo décimo é quase o trem
   inteiro. A dificuldade não vem de os eventos ficarem piores, vem de
   não sobrar carro sossegado pra onde fugir. */
var SITUACOES = [
  { nome: 'TEM RIMADOR AQUI', roda: function (v) { v.comecaRimador(); } },
  { nome: 'ALGUÉM QUER SUA BARRA', roda: function (v) { v.desafioDeBarra(); } },
  { nome: 'DESAFIO DE RIMA', roda: function (v) { v.desafioDeRima(); } },
  { nome: 'TEM GENTE TE ENCARANDO', roda: function (v) { v.comecaEncarada(); } },
  { nome: 'ALGUMA COISA ROLANDO', roda: function (v) { v.sorteiaEvento(); } },
  { nome: 'ALGUMA COISA ROLANDO', roda: function (v) { v.sorteiaEvento(); } }
];

var VagaoScene = new Phaser.Class({
  Extends: Phaser.Scene,
  initialize: function VagaoScene() { Phaser.Scene.call(this, { key: 'Vagao' }); },

  create: function () {
    Ctrl.liga(this);
    HUD_VISIVEL = true; CONTROLES_VISIVEIS = true;
    this.dialog = null;
    this.estado = 'andando';
    this.t = 0;
    this.duracao = TEMPO_ENTRE_ESTACOES;
    this.eventoPendente = false;
    this.dilemaPendente = false;
    this.tEvento = 0; this.tDilema = 0;
    this.falha = null;
    this.sorteouFalha = false;
    this.duelando = false;
    this.encontro = null;
    this.tPasso = 0;
    this.sentadoEm = null;
    this.nivelSono = 0;
    this.noChao = false;      // estudante
    this.cochilo = 0;         // clt: quanto tempo já está cochilando na barra
    this.pediu = false;       // idoso/gestante: um pedido por estação
    this.vendas = 0;          // ambulante: quantas vendas nesta perna
    this.fiscal = 0;          // ...e o quanto o fiscal já reparou
    this.fuga = null;         // ...e o fiscal em cima de você, quando vem
    this.encarando = false;   // encarada por turnos rolando por cima desta cena
    this.sabeARota = false;   // turista: pagou alguém pra se situar
    this.disfarce = null;
    this.solavanco = { fase: 'off', t: 0, proximo: 2600 };
    this.gente = [];
    /* Todas as portas do trem, não as de um carro só: são elas que a
       cena abre na estação, e você desce pela que estiver mais perto. */
    this.portas = [];
    for (var pc = 0; pc < CARROS; pc++) {
      for (var pp = 0; pp < PORTAS_Y.length; pp++) this.portas.push(yDoCarro(pc, PORTAS_Y[pp]));
    }
    this.npcExtra = [];

    this.desenhaCenario();
    this.montaBancos();
    veuDaHora(this, 90);

    /* Você embarca num carro qualquer, como na vida: não existe 'o
       primeiro vagão' pra quem chega correndo na plataforma. Entra
       pelo vestíbulo de uma das portas do carro sorteado. */
    this.carroEntrada = Phaser.Math.Between(0, CARROS - 1);
    this.pl = new Ator(this, 160,
      yDoCarro(this.carroEntrada, PORTAS_Y[1] + PORTA_ALT / 2), spriteJogador());
    this.pl.sp.setDepth(60);
    this.pl.dir = 'up';

    /* ---------- a câmera ----------
       O trem tem 4640px de altura e a tela tem 576: a câmera anda com
       você. A zona morta é alta de propósito — câmera que corrige cada
       passo embrulha o estômago, e num jogo em que se anda pra frente e
       pra trás o tempo todo isso apareceria rápido. Ela só começa a
       seguir quando você sai da faixa do meio.

       A UI toda (placa de rota, dica, diálogo, painel da batalha) fica
       com scrollFactor 0, presa na tela; quem anda é só o mundo. */
    var cam = this.cameras.main;
    cam.setBounds(0, 0, GW, fundoDoTrem() + 20);
    cam.setDeadzone(GW, 200);
    cam.startFollow(this.pl.sp, true, 0.16, 0.16);
    // o centro da área jogável fica abaixo do HUD, não no meio da tela
    cam.setFollowOffset(0, -Math.round(HUD_H / 2));
    cam.centerOn(GW / 2, this.pl.sp.y);

    this.carroAtual = carroDe(this.pl.sp.y);
    this.montaSituacoes();

    /* ---------- o que ficou caído no chão ----------
       Oito carros só valem a pena se houver motivo pra ir até o oitavo.
       A situação de cada carro é um motivo; a moeda no chão é o outro, e
       é o que faz o passeio valer mesmo quando a situação do carro do
       lado não é pra você. Semeia o trem inteiro, não o carro em que
       você entrou. */
    this.chao = new Chao(this, 26);
    var euC = this;
    this.chao.semeia(quantoCaiNoChao(CARROS * 0.9), function () { return euC.pontoDoChao(); });

    // a caixinha fica no chão à frente dele: desenha por cima de quem a
    // largou, por baixo de quem está jogando
    this.gCaixa = this.add.graphics().setDepth(57);
    this.rimador = null;
    this.encena = false;

    /* Duas camadas, e não uma: com a câmera andando, "UI" deixou de ser
       uma coisa só. O verde do banco livre e o anel do banco em disputa
       são MUNDO — eles moram em cima de um banco, e têm que andar junto
       com ele. O resto (painel da batalha, barra de tempo, caixa do
       solavanco) é TELA, e fica parado. Numa camada só, ou o banco
       ficava para trás ou o painel saía voando pelo teto. */
    this.gMundoUI = this.add.graphics().setDepth(45);
    this.gUI = this.add.graphics().setDepth(500).setScrollFactor(0);
    /* A placa de rota subiu de 62 pra 48, encostada no HUD: com a baia
       de cima começando em 116, os catorze pixels que ela devolveu são
       a diferença entre ver e não ver quem está sentado no primeiro
       lugar. */
    /* ---------- o letreiro ----------
       A estação saiu do topo da tela e veio pra cá, que é onde ela mora
       de verdade: no painel de LED em cima da porta. O topo não é lugar
       de dizer onde você está — o vagão diz, e quem não estiver olhando
       pro letreiro tem o mapinha no celular, como na vida.

       Amarelo âmbar sobre chapa preta, com a grade de LED apagado por
       baixo da letra: é o painel do metrô, e ele é reconhecível antes
       de ser lido. */
    this.rota = new Plaqueta(this, GW / 2, 58, { cor: PAL.amarelo, depth: 505, led: true });
    /* ---------- o letreiro é aviso, não moldura ----------
       Ele ficava aceso o tempo todo, três ou quatro linhas encostadas
       no HUD, bem em cima da faixa do vagão onde se joga. No metrô de
       verdade o painel também fica aceso, mas ali ele é ambiente; na
       tela vira tarja fixa na frente do jogo.

       Agora ele desce quando a informação MUDA, fica o tempo de ler e
       sobe, como notificação de celular. Quem quiser consultar fora
       da hora tem o mapinha no Zap, como na vida. */
    this.rotaVis = 0;       // 0 escondido atrás do HUD, 1 aberto
    this.rotaAte = 0;       // até quando fica aberto
    this.rotaChave = null;  // o que estava escrito da última vez
    // a placa de rota e a faixa de dica ficam fora do alcance do sono, e
    // a fresta que sobra é justo a do aviso do meio da tela
    areaDeJogo(126, GH - 40, 258);
    this.rima = new Plaqueta(this, GW / 2, 126, { cor: PAL.amarelo, filete: 0xe8362c, depth: 510 });
    this.dica = new FaixaDica(this, 520);
    this.centro = new Plaqueta(this, GW / 2, 232, { cor: PAL.branco, depth: 522 });
    this.tSeta = txtC(this, GW / 2, 280, '', PAL.amarelo, 24).setDepth(520).setScrollFactor(0);
    // o nome de quem te aborda, flutuando em cima da cabeça dele
    this.tagEncontro = txtC(this, 0, 0, '', PAL.amarelo, 8).setDepth(530).setVisible(false);
    // uma seta por pista, cada uma debaixo da sua caixa de acerto
    this.setasBatalha = [];
    for (var q = 0; q < 4; q++) {
      this.setasBatalha.push(
        txtC(this, batalhaX(q), BAT_LINHA + 22, BATALHA_SETAS[q], PAL.branco, 16)
          .setDepth(521).setVisible(false).setScrollFactor(0));
    }
    /* Uma coluna clicável por pista, da altura do painel. Só ligam
       durante a batalha: fora dela seriam quatro buracos no meio do
       vagão engolindo toque de quem só queria andar. */
    this.zonasBatalha = [];
    for (q = 0; q < 4; q++) {
      var zb = this.add.zone(batalhaX(q) - BAT_LARG / 2, BAT_TOPO,
        BAT_LARG, BAT_LINHA + 44 - BAT_TOPO).setOrigin(0, 0).setDepth(524).setScrollFactor(0);
      (function (eu, pista) {
        zb.on('pointerdown', function () { if (eu.batalha) eu.bateNota(pista); });
      })(this, q);
      this.zonasBatalha.push(zb);
    }
    this.batalha = null;

    this.sorteiaRitmo();

    var self = this;
    fala(this, GameState.hora() + '. Próxima:\n' + GameState.proximaEstacaoNome(), []);
    this.time.delayedCall(1300, function () { if (self.dialog) self.dialog.fecha(); });
  },

  /* ---------- cenário ---------- */
  /* ---------- o cenário dos oito carros ----------
     Um Graphics no Phaser não é uma imagem: é uma LISTA DE COMANDOS que
     o motor repassa inteira a cada quadro. A barra de apoio sozinha é
     desenhada linha de pixel por linha de pixel, quatro retângulos
     cada — 4 mil comandos num carro, 33 mil em oito. Pintar os oito
     carros como desenho derrubou o jogo pra 18 quadros por segundo.

     Como os oito carros são idênticos, o carro é desenhado UMA vez, sai
     de lá como textura, e o que vai pra tela são oito imagens da mesma
     textura. Três texturas no total (carro, barras, fole), quinze
     imagens, e nenhum comando de desenho por quadro. */
  textura: function (chave, alt, pinta) {
    var eu = this;
    texturaDeCena(this, chave, GW, alt, function (g) { pinta.call(eu, g); });
  },

  desenhaCenario: function () {
    var l = GameState.linhaAtual();
    var fundo = this.add.graphics().setDepth(-1);
    fundo.fillStyle(num(PAL.bg), 1).fillRect(0, 0, GW, fundoDoTrem() + 40);

    /* A cor da linha entra na parede do carro, então a textura tem que
       ser refeita quando se troca de linha — daí o remove() antes. */
    var eu = this;
    this.textura('vg_carro', GH, function (g) { eu.desenhaCarro(g, l); });
    this.textura('vg_barras', GH, function (g) { eu.desenhaBarrasDoCarro(g); });
    this.textura('vg_sanfona', SANFONA_ALT + 8, function (g) { eu.desenhaSanfona(g, 4); });

    for (var carro = 0; carro < CARROS; carro++) {
      var topo = topoDoCarro(carro) - HUD_H;
      this.add.image(0, topo, 'vg_carro').setOrigin(0, 0).setDepth(0);
      /* A barra vai do chão ao teto: vista de cima ela passa ACIMA das
         cabeças, e desenhada no fundo dava a impressão de que a pessoa
         andava por cima dela. */
      this.add.image(0, topo, 'vg_barras').setOrigin(0, 0).setDepth(70);
      if (carro < CARROS - 1) {
        this.add.image(0, topoDoCarro(carro) + CARRO_ALT - 4, 'vg_sanfona')
          .setOrigin(0, 0).setDepth(0);
      }
    }

    this.gPortas = this.add.graphics().setDepth(2);
    this.pintaPortas(false);
    // o que muda de quadro pra quadro é só a mão agarrada na barra
    this.gMao = this.add.graphics().setDepth(71);
  },

  /* Um módulo: banco de cima com o encosto em cima, banco de baixo com
     o encosto embaixo, e o vão das pernas no meio. Dois assentos em
     cada, com o risco da divisa. */
  desenhaModulo: function (g, x, y, esquerda) {
    var larg = MODULO_FUNDO;
    var yA = y, yB = y + BANCO_ENCOSTO + BANCO_ASSENTO + MODULO_VAO;
    // o piso do vão, mais escuro: é buraco, não banco
    g.fillStyle(0x25303f, 1).fillRect(x, y + BANCO_ENCOSTO + BANCO_ASSENTO, larg, MODULO_VAO);

    var bancos = [
      { enc: yA, ass: yA + BANCO_ENCOSTO },                       // encosto em cima
      { enc: yB + BANCO_ASSENTO, ass: yB }                        // encosto embaixo
    ];
    for (var i = 0; i < 2; i++) {
      var enc = bancos[i].enc, ass = bancos[i].ass;
      g.fillStyle(0x000000, 0.3).fillRect(x + 2, ass + BANCO_ASSENTO, larg, 3);
      g.fillStyle(0x1c5288, 1).fillRect(x, enc, larg, BANCO_ENCOSTO);
      g.fillStyle(0x2f7fc4, 1).fillRect(x, ass, larg, BANCO_ASSENTO);
      g.fillStyle(0x63aee8, 1).fillRect(x, ass, larg, 3);
      g.fillStyle(0x123a63, 1).fillRect(x, ass + BANCO_ASSENTO - 3, larg, 3);
      // o risco entre os dois assentos
      g.fillStyle(0x1c5288, 0.6).fillRect(x + larg / 2, ass, 1, BANCO_ASSENTO);
    }
    // poste vertical na ponta que dá pro corredor
    var px = esquerda ? x + larg - 4 : x;
    g.fillStyle(num(PAL.metalSom), 1).fillRect(px, y - 4, 4, MODULO_ALT + 8);
    g.fillStyle(num(PAL.metalLuz), 1).fillRect(px, y - 4, 2, MODULO_ALT + 8);
  },

  /* A preferencial: banco encostado na parede e virado pro corredor,
     o único do carro nessa direção, e de propósito — quem olha o vagão
     de cima vê logo qual é o diferente. O azul é mais claro e a faixa
     do encosto é amarela, que é como o metrô marca.

     A costura entre as almofadas é o que faz o banco ter LUGARES em
     vez de ser uma tira azul: sem ela, dois sentados no mesmo banco
     parecem dois bonecos empilhados num móvel só. */
  desenhaPreferencial: function (g, x, y, esquerda) {
    var enc = esquerda ? x : x + PREF_FUNDO - 6;      // encosto na parede
    var ass = esquerda ? x + 6 : x;                    // assento pro corredor
    g.fillStyle(0x000000, 0.3).fillRect(x, y + PREF_ALT, PREF_FUNDO, 3);
    g.fillStyle(0x1c5288, 1).fillRect(enc, y - 3, 6, PREF_ALT + 3);
    for (var q = 0; q < PREF_LUGARES; q++) {
      var qy = y + q * PREF_PASSO;
      g.fillStyle(0x3f93d8, 1).fillRect(ass, qy, PREF_FUNDO - 6, PREF_PASSO);
      g.fillStyle(0x7cc0f0, 1).fillRect(ass, qy, PREF_FUNDO - 6, 3);
      g.fillStyle(0x123a63, 1).fillRect(ass, qy + PREF_PASSO - 3, PREF_FUNDO - 6, 3);
      // costura entre um lugar e o outro
      if (q) g.fillStyle(0x1c5288, 1).fillRect(ass, qy - 1, PREF_FUNDO - 6, 2);
    }
    // a marca amarela do encosto
    g.fillStyle(num(PAL.amarelo), 0.85).fillRect(enc + 1, y + 8, 4, PREF_ALT - 16);
    for (var e = 0; e < 2; e++) {
      var ex = esquerda ? x + PREF_FUNDO - 4 : x;
      g.fillStyle(num(PAL.metalSom), 1).fillRect(ex, e ? y + PREF_ALT - 4 : y - 4, 4, 8);
      g.fillStyle(num(PAL.metalLuz), 1).fillRect(ex, e ? y + PREF_ALT - 4 : y - 4, 2, 8);
    }
  },

  /* ---------- o fole entre dois carros ----------
     Lona sanfonada dos dois lados, chapa de piso articulada no meio, e
     o corrimão. É estreito porque é estreito de verdade, e é o pedaço
     do trem que existe só por ser a emenda entre duas coisas. */
  desenhaSanfona: function (g, y) {
    g.fillStyle(0x0a0a10, 1).fillRect(0, y, GW, SANFONA_ALT);
    // a chapa de piso, com a junta no meio
    g.fillStyle(0x3d4152, 1).fillRect(SANFONA_X0 - 6, y, SANFONA_X1 - SANFONA_X0 + 12, SANFONA_ALT);
    g.fillStyle(0x4a4f63, 1);
    for (var fx = SANFONA_X0 - 4; fx < SANFONA_X1 + 8; fx += 6) g.fillRect(fx, y, 3, SANFONA_ALT);
    g.fillStyle(0x22252f, 1).fillRect(SANFONA_X0 - 6, y + SANFONA_ALT / 2 - 1, SANFONA_X1 - SANFONA_X0 + 12, 3);
    // a lona dos dois lados: dobra clara, dobra escura
    for (var d = 0; d < 2; d++) {
      var x0 = d ? SANFONA_X1 + 6 : 0, larg = d ? GW - SANFONA_X1 - 6 : SANFONA_X0 - 6;
      for (var ly = y; ly < y + SANFONA_ALT; ly += 6) {
        g.fillStyle(0x1a1c26, 1).fillRect(x0, ly, larg, 4);
        g.fillStyle(0x2a2d3a, 1).fillRect(x0, ly, larg, 2);
      }
    }
    // corrimão dos dois lados da passagem
    for (d = 0; d < 2; d++) {
      var hx = d ? SANFONA_X1 + 1 : SANFONA_X0 - 5;
      g.fillStyle(num(PAL.metalSom), 1).fillRect(hx, y - 4, 4, SANFONA_ALT + 8);
      g.fillStyle(num(PAL.metalLuz), 1).fillRect(hx, y - 4, 2, SANFONA_ALT + 8);
    }
  },

  desenhaCarro: function (g, l) {

    /* O vagão de verdade é quase todo espaço em pé: os bancos são baias
       curtas e azuis, encostadas na parede, com vão grande entre uma e
       outra. Piso azul de borracha canelada, painel claro na parede na
       altura do ombro e poste vertical na ponta de cada baia. */

    // piso
    g.fillStyle(0x2b3648, 1).fillRect(28, HUD_H, 264, GH - HUD_H);
    g.fillStyle(0x33405a, 1);
    for (var y = HUD_H; y < GH; y += 8) g.fillRect(66, y, 188, 4);
    pontilhado(g, 66, HUD_H, 188, GH, 0x000000, 0.1, 6);

    // paredes laterais com volume
    g.fillStyle(num(PAL.metalSom), 1).fillRect(0, HUD_H, 28, GH - HUD_H);
    g.fillStyle(0x646a80, 1).fillRect(4, HUD_H, 24, GH - HUD_H);
    g.fillStyle(num(PAL.metalSom), 1).fillRect(292, HUD_H, 28, GH - HUD_H);
    g.fillStyle(0x646a80, 1).fillRect(292, HUD_H, 24, GH - HUD_H);
    g.fillStyle(l.num, 1).fillRect(0, HUD_H, 5, GH - HUD_H);
    g.fillStyle(l.num, 1).fillRect(315, HUD_H, 5, GH - HUD_H);

    /* Janelas nas duas faixas: a parede esquerda não tem porta nenhuma,
       então é janela de ponta a ponta; a direita só tem janela onde não
       tem porta, porque lá o vidro é a própria folha da porta. */
    var d, w;
    for (d = 0; d < PORTAS_Y.length; d++) janelaVagao(g, 4, PORTAS_Y[d], PORTA_ALT);
    for (w = 0; w < MODULOS_Y.length; w++) {
      janelaVagao(g, 4, MODULOS_Y[w], MODULO_ALT);
      janelaVagao(g, 294, MODULOS_Y[w], MODULO_ALT);
    }
    janelaVagao(g, 4, PREF_Y - 6, PREF_ALT + 12);
    janelaVagao(g, 294, PREF_Y - 6, PREF_ALT + 12);

    // painel claro da parede, atrás e acima dos bancos
    g.fillStyle(0x767f96, 1).fillRect(28, HUD_H, 22, GH - HUD_H);
    g.fillStyle(0x868fa6, 1).fillRect(28, HUD_H, 22, 2);
    g.fillStyle(0x4e5468, 1).fillRect(48, HUD_H, 2, GH - HUD_H);
    // do lado direito o painel abre em cada porta, senão tapa o vestíbulo
    var faixasDir = [];
    for (w = 0; w < MODULOS_Y.length; w++) faixasDir.push([MODULOS_Y[w] - 8, MODULO_ALT + 16]);
    faixasDir.push([PREF_Y - 10, PREF_ALT + 20]);
    for (w = 0; w < faixasDir.length; w++) {
      g.fillStyle(0x767f96, 1).fillRect(270, faixasDir[w][0], 22, faixasDir[w][1]);
      g.fillStyle(0x868fa6, 1).fillRect(270, faixasDir[w][0], 22, 2);
      g.fillStyle(0x4e5468, 1).fillRect(270, faixasDir[w][0], 2, faixasDir[w][1]);
    }

    /* Vestíbulo: o pedaço de piso na frente de cada porta. É ele que
       diz, sem texto, onde se desce — e é o único lugar do vagão onde
       dá pra chegar até a parede. */
    for (d = 0; d < PORTAS_Y.length; d++) {
      var dy = PORTAS_Y[d];
      g.fillStyle(0x3a485f, 1).fillRect(250, dy - 6, 42, PORTA_ALT + 12);
      g.fillStyle(0x2b3648, 1).fillRect(250, dy - 6, 2, PORTA_ALT + 12);
      g.fillStyle(0x46566f, 1).fillRect(252, dy - 6, 40, 2);
      g.fillStyle(0x2b3648, 1).fillRect(252, dy + PORTA_ALT + 4, 40, 2);
      // faixa tátil rente à porta
      g.fillStyle(num(PAL.amarelo), 0.4).fillRect(285, dy + 3, 4, PORTA_ALT - 6);
    }

    /* Os módulos: dois bancos virados um pro outro, com o vão das
       pernas entre eles. O encosto do de cima fica em cima, o do de
       baixo fica embaixo — é o encosto que diz pra que lado a pessoa
       está olhando, antes de o boneco dizer. */
    for (var m = 0; m < MODULOS_Y.length; m++) {
      for (var lado = 0; lado < 2; lado++) {
        this.desenhaModulo(g, MODULO_X[lado], MODULOS_Y[m], lado === 0);
      }
    }
    // e a preferencial, de lado, entre as duas portas
    for (lado = 0; lado < 2; lado++) this.desenhaPreferencial(g, PREF_X[lado], PREF_Y, lado === 0);

  },

  /* As duas barras de apoio de um carro, do jeito que sempre foram —
     só que agora isto roda uma vez, pra virar textura, e não sessenta
     vezes por segundo.

     A da direita é cortada na altura de cada porta: barra atravessando
     a saída é o que mais fazia o vagão parecer trancado, e no vagão de
     verdade ela também não passa ali. */
  desenhaBarrasDoCarro: function (g) {
    for (var i = 0; i < 2; i++) {
      var px = BARRAS_X[i];
      for (var by = HUD_H; by < GH; by++) {
        if (i && naPorta(by, 8)) continue;
        g.fillStyle(0x000000, 0.25).fillRect(px + 8, by, 3, 1);   // sombra no chão
        g.fillStyle(num(PAL.metalSom), 1).fillRect(px, by, 8, 1);
        g.fillStyle(num(PAL.metal), 1).fillRect(px, by, 5, 1);
        g.fillStyle(num(PAL.metalLuz), 1).fillRect(px + 1, by, 2, 1);
      }
      // alças penduradas
      g.fillStyle(num(PAL.metalSom), 1);
      for (var ay = 96; ay < GH - 40; ay += 64) {
        if (i && naPorta(ay, 8)) continue;
        g.fillRect(px + (i ? -12 : 8), ay, 12, 3);
        g.fillRect(px + (i ? -12 : 18), ay, 3, 14);
      }
    }
  },

  /* A mão de quem está segurando. Sem isto, "segurar" era só o texto
     na barra de baixo mudando de cor — não havia nada na tela que
     dissesse que aquele boneco está agarrado em alguma coisa. Ela é a
     única parte da barra que muda de quadro pra quadro, e por isso tem
     gráfico só dela. */
  pintaMao: function () {
    var g = this.gMao; g.clear();
    if (!this.segurando) return;
    var m = this.segurando;
    g.fillStyle(0xf2c14e, 1).fillRect(m.bx - 1, m.y - 3, 11, 6);
    g.fillStyle(0xffe9a8, 1).fillRect(m.bx - 1, m.y - 3, 11, 2);
    g.fillStyle(num(PAL.metalLuz), 1).fillRect(m.bx + 1, m.y - 6, 2, 12);
    // o braço, do ombro até a barra
    g.lineStyle(3, 0xf2c14e, 0.9);
    g.beginPath(); g.moveTo(m.px, m.y + 2); g.lineTo(m.bx + 4, m.y); g.strokePath();
  },

  /* A mão só aparece quando há mão: apertando, com barra ao alcance, e
     de pé. Guardo o ponto do ombro e o ponto da barra pra desenhar o
     braço entre os dois. */
  atualizaMao: function () {
    this.segurando = null;
    if (this.sentadoEm || !Ctrl.act) return;
    var b = this.barraPerto();
    if (b.d > ALCANCE_BARRA) return;
    this.segurando = { px: this.pl.sp.x, bx: b.x - 4, y: this.pl.sp.y - 26 };
  },

  /* Quem é a barra mais perto, e a que distância. É o que decide se dá
     pra segurar e onde a mão vai parar. */
  barraPerto: function () {
    var melhor = null, d = 1e9;
    for (var i = 0; i < BARRAS_X.length; i++) {
      var bx = BARRAS_X[i] + 4;
      if (i && naPorta(this.pl.sp.y, 8)) continue;   // ali a barra não existe
      var dd = Math.abs(this.pl.sp.x - bx);
      if (dd < d) { d = dd; melhor = bx; }
    }
    return { x: melhor, d: d };
  },

  /* As duas portas de um carro. Quem entra em cena entra pela porta
     DESTE carro: a mais longe dentro dele, não a mais longe do trem. */
  portasDoCarro: function (c) {
    var out = [];
    for (var i = 0; i < PORTAS_Y.length; i++) out.push(yDoCarro(c, PORTAS_Y[i]));
    return out;
  },

  pintaPortas: function (aberto) {
    var g = this.gPortas; g.clear();
    var meia = PORTA_ALT / 2;
    for (var i = 0; i < this.portas.length; i++) {
      var y = this.portas[i];
      // as duas folhas, o vão e a plataforma lá fora — em cada carro
      if (aberto) {
        // o vão, a plataforma lá fora, e a luz caindo no vestíbulo
        g.fillStyle(0x07070c, 1).fillRect(292, y, 28, PORTA_ALT);
        g.fillStyle(0x3f3f52, 1).fillRect(296, y + 4, 20, PORTA_ALT - 8);
        g.fillStyle(0x00e676, 1).fillRect(289, y, 3, PORTA_ALT);
        g.fillStyle(0x00e676, 0.16).fillRect(250, y, 42, PORTA_ALT);
      } else {
        // duas folhas encostadas, cada uma com o seu vidro
        g.fillStyle(num(PAL.metalSom), 1).fillRect(292, y, 28, PORTA_ALT);
        for (var f = 0; f < 2; f++) {
          var fy = y + 1 + f * meia;
          g.fillStyle(0x767c92, 1).fillRect(293, fy, 26, meia - 2);
          g.fillStyle(num(PAL.metalLuz), 1).fillRect(293, fy, 26, 2);
          g.fillStyle(0x101725, 1).fillRect(297, fy + 6, 18, meia - 14);
          g.fillStyle(0xffffff, 0.06).fillRect(297, fy + 6, 18, 5);
        }
        g.fillStyle(num(PAL.amarelo), 1).fillRect(289, y, 3, PORTA_ALT);
      }
    }
  },

  /* ---------- bancos ---------- */
  /* Os bancos dos oito carros de uma vez: 96 lugares no trem inteiro,
     doze por carro. Quem procura banco livre continua procurando o mais
     perto, que agora pode estar dois carros adiante — e é exatamente
     isso que faz andar pelo trem valer a pena. */
  /* Cada lugar sabe pra que lado quem senta nele fica olhando. É o
     encosto que decide: banco de cima, encosto em cima, a pessoa olha
     pra baixo e você vê o rosto dela; banco de baixo, você vê as
     costas. A preferencial é a única de perfil. */
  lugaresDoCarro: function (c) {
    var out = [], m, lado, i;
    for (m = 0; m < MODULOS_Y.length; m++) {
      for (lado = 0; lado < 2; lado++) {
        var x0 = MODULO_X[lado], y0 = MODULOS_Y[m];
        var yCima = y0 + BANCO_ENCOSTO;
        var yBaixo = y0 + BANCO_ENCOSTO + BANCO_ASSENTO + MODULO_VAO;
        for (i = 0; i < MODULO_ASSENTOS.length; i++) {
          var x = x0 + (lado === 0 ? MODULO_ASSENTOS[i] : MODULO_FUNDO - MODULO_ASSENTOS[i]);
          out.push({
            x: x0 + MODULO_ASSENTOS[i], y: yDoCarro(c, yCima), carro: c,
            w: 28, h: BANCO_ASSENTO, pose: 'sentadoFrente', npc: null
          });
          out.push({
            x: x0 + MODULO_ASSENTOS[i], y: yDoCarro(c, yBaixo), carro: c,
            w: 28, h: BANCO_ASSENTO, pose: 'sentadoCostas', npc: null
          });
        }
      }
    }
    for (lado = 0; lado < 2; lado++) {
      for (var q = 0; q < PREF_LUGARES; q++) {
        out.push({
          x: PREF_X[lado] + PREF_FUNDO / 2,
          y: yDoCarro(c, PREF_Y + q * PREF_PASSO), carro: c,
          w: PREF_FUNDO - 6, h: PREF_PASSO,
          pose: lado === 0 ? 'sentadoR' : 'sentadoL', pref: true, npc: null
        });
      }
    }
    return out;
  },

  montaBancos: function () {
    var dif = GameState.dificuldade();
    this.bancos = [];
    for (var c = 0; c < CARROS; c++) {
      this.bancos = this.bancos.concat(this.lugaresDoCarro(c));
    }
    // de madrugada o vagão está vazio e sentar é fácil; no pico, esquece
    var lot = GameState.lotacao();
    var total = this.bancos.length;
    var livres = Phaser.Math.Clamp(Math.round(total * (1 - lot * 0.88) - (dif - 1) * 1.2), 0, total - 1);
    var idx = [];
    for (var n = 0; n < total; n++) idx.push(n);
    Phaser.Utils.Array.Shuffle(idx);
    for (var i = 0; i < idx.length - livres; i++) {
      var b = this.bancos[idx[i]];
      var a = new Ator(this, b.x, b.y + 24, sorteiaPax());
      a.dir = b.pose;
      a.anima(0, false);
      a.sp.setDepth(30);
      a.fixo = true;                  // sentado não é empurrado
      sentaAnimado(a);
      b.npc = a;
      this.gente.push(a);
    }
    // e a gente em pé, carro por carro: um trem cheio é cheio inteiro
    var emPe = Phaser.Math.Clamp(Math.round(8 * lot), 0, 8);
    for (var c2 = 0; c2 < CARROS; c2++) {
      for (var j = 0; j < emPe; j++) {
        var p = new Ator(this, 108 + Math.random() * 104,
          yDoCarro(c2, 120 + Math.random() * 400), sorteiaPax());
        p.dir = Math.random() < 0.5 ? 'left' : 'right';
        p.anima(0, false); p.sp.setDepth(35);
        sentaAnimado(p);                // em pé também olha em volta
        this.npcExtra.push(p);
        this.gente.push(p);
      }
    }
  },

  /* ---------- os poderes ----------
     Cada personagem tem um verbo que só ele tem, e todos eles entram
     por aqui: a dica do rodapé pergunta primeiro o que este personagem
     sabe fazer, e só depois cai nas ações que valem pra todo mundo. */

  /* ESTUDANTE — senta no chão. Não precisa de banco, mas precisa de
     espaço: no pico não tem chão sobrando, e sentar no chão custa
     carisma toda vez (o vagão inteiro olha). */
  podeSentarNoChao: function () {
    if (!temPoder('chao') || this.sentadoEm || this.noChao) return false;
    if (GameState.lotacao() > 0.62) return false;
    return this.pl.sp.x > 96 && this.pl.sp.x < 240 && !naPorta(this.pl.sp.y, -8);
  },

  sentaNoChao: function () {
    this.noChao = true;
    GameState.addCarisma(-3);
    GameState.sentado = true;
    this.pl.dir = this.pl.sp.x < 160 ? 'sentadoR' : 'sentadoL';
    this.pl.anima(0, false);
    sentaAnimado(this.pl);
    sfx('caixa');
    this.flash('SENTOU NO CHÃO.\nNINGUÉM ACHOU BONITO.');
  },

  levantaDoChao: function () {
    this.noChao = false;
    GameState.sentado = false;
    this.pl.dir = 'down';
  },

  /* CLT — cochila em pé, segurando a barra. Descansa de graça, e o
     preço é a rota: de olho fechado você não vê a estação passar. */
  atualizaCochilo: function (dt) {
    if (!temPoder('cochilo') || this.sentadoEm) { this.cochilo = 0; return; }
    // com teto: sem ele o contador cresce a viagem inteira e soltar a
    // barra levaria segundos pra acordar
    if (this.segurando && !this.andandoAgora) this.cochilo = Math.min(1900, this.cochilo + dt);
    else this.cochilo = Math.max(0, this.cochilo - dt * 3);
  },

  cochilando: function () { return this.cochilo > 1100; },

  /* IDOSO e GESTANTE — pedem o lugar. Pra ela ninguém recusa; pra ele,
     um em cada seis finge que dorme, e isso custa a vergonha. */
  bancoOcupadoPerto: function () {
    if (!temPoder('pedeLugar') || this.sentadoEm || this.pediu) return null;
    var melhor = null, dist = 1e9;
    for (var i = 0; i < this.bancos.length; i++) {
      var b = this.bancos[i];
      if (!b.npc || b.npc === 'player') continue;
      var dx = Math.abs(this.pl.sp.x - b.x), dy = Math.abs(this.pl.sp.y - (b.y + 24));
      if (dx >= 54 || dy >= 30) continue;
      var d = dx + dy * 2;
      if (d < dist) { dist = d; melhor = b; }
    }
    return melhor;
  },

  pedeOLugar: function (b) {
    this.pediu = true;
    /* Na preferencial ninguém recusa. Não é bondade: está escrito no
       encosto, e quem senta ali sabe que vai ter que levantar. É o
       lugar em que o idoso e a gestante nunca ouvem não. */
    if (!b.pref && !GameState.char.nuncaRecusam && Math.random() < 0.17) {
      GameState.addCarisma(-4);
      sfx('nao');
      this.flash('ELE FINGIU QUE DORMIU.');
      return;
    }
    var a = b.npc, k = this.gente.indexOf(a);
    if (k >= 0) this.gente.splice(k, 1);
    a.destroy();
    b.npc = null;
    GameState.addCarisma(2);
    this.senta(b);
    this.flash(b.pref ? 'A PREFERENCIAL É SUA.' : 'CEDERAM O LUGAR.');
  },

  /* ---------- AMBULANTE ----------
     A única fonte de renda do jogo, e o único personagem que tem alguém
     atrás dele. Cada venda paga e chama o fiscal — e quanto mais cara a
     muamba, mais ela chama.

     O fiscal era um número: a barra enchia, aparecia uma caixa de
     diálogo dizendo que você tinha sido multado, e acabou. Não havia
     fiscal nenhum, havia um contador com nome de gente. Agora ele ENTRA
     no vagão pela porta e vem andando atrás de você, com uma das três
     patentes — e o trem tem oito carros pra você atravessar. Fugir
     virou o que sempre devia ter sido: correr. */
  podeVender: function () {
    return temPoder('vende') && !this.sentadoEm && !this.noChao && !this.fuga &&
      this.estado === 'andando' && this.pl.sp.x > 100 && this.pl.sp.x < 224;
  },

  vende: function () {
    var lot = GameState.lotacao();
    var m = tiraDaMuamba();
    this.vendas++;
    this.fiscal += m.risco + this.vendas * 3;
    GameState.addDescanso(-3);
    /* O grito vai na mesma placa em que o rimador manda os versos —
       eles nunca dividem o vagão, mas se dividirem, quem está com o
       microfone é ele. */
    var eu = this;
    if (!this.rimador) {
      this.rima.setText('"' + m.grito + '"');
      this.time.delayedCall(1500, function () { if (eu.rima && !eu.rimador) eu.rima.setText(''); });
    }

    var quer = m.chance * (0.6 + lot * 0.7);
    if (m.noCalor && estaCalor()) quer *= 1.4;
    if (Math.random() > quer) {
      GameState.addCarisma(-1);
      sfx('nao');
      this.flash('NINGUÉM QUIS ' + m.nome + '.');
    } else {
      GameState.ganhar(m.preco);
      GameState.addCarisma(2);
      sfx('moeda');
      this.flash('VENDEU ' + m.nome + '\n+R$ ' + m.preco.toFixed(2).replace('.', ','));
    }

    if (this.fiscal >= 100) { this.fiscal = 0; this.chamaFiscal(); }
  },

  /* ---------- a encarada ----------
     A quarta situação de vagão, e a única por turnos. Quem encara é
     alguém que já estava neste carro — não entra ninguém pela porta,
     porque encarada não é visita, é a pessoa que estava do seu lado o
     tempo todo e cansou. Por isso ela sai da gente em pé mais perto de
     você: o jogo já mostrou essa pessoa, e agora ela vira o assunto. */
  comecaEncarada: function () {
    if (this.encarando || this.batalha || this.duelando) return;
    var meu = carroDe(this.pl.sp.y), perto = null, dist = 1e9;
    for (var i = 0; i < this.npcExtra.length; i++) {
      var a = this.npcExtra[i];
      if (!a || !a.sp || !a.sp.active) continue;
      if (carroDe(a.sp.y) !== meu) continue;
      var d = Math.abs(a.sp.y - this.pl.sp.y) + Math.abs(a.sp.x - this.pl.sp.x);
      if (d < dist) { dist = d; perto = a; }
    }
    var eu = this;
    this.encarando = true;
    this.scene.launch('Encarada', {
      sprite: perto ? perto.sp.texture.key : sorteiaPax(),
      /* Doze caracteres: é o que cabe na ficha antes de o nome passar
         por cima de quem está encarando. */
      nome: 'QUEM TAVA AÍ',
      aoFechar: function (r) {
        eu.encarando = false;
        /* Ganhar tira essa pessoa do vagão: ela desce na próxima, e o
           lugar dela no corredor abre. Perder deixa ela aí. */
        if (r === 'ganhou' && perto) {
          var k = eu.gente.indexOf(perto); if (k >= 0) eu.gente.splice(k, 1);
          var j = eu.npcExtra.indexOf(perto); if (j >= 0) eu.npcExtra.splice(j, 1);
          perto.destroy();
        }
        var morte = GameState.derrota();
        if (morte) { GameState.motivoFim = morte; eu.fimDeJogo(); }
      }
    });
    sfx('apito');
  },

  /* ---------- o fiscal entra no vagão ----------
     Ele entra pela porta mais longe de você — a mesma regra do rimador,
     e pelo mesmo motivo: dar tempo de ver antes de ter que reagir. Daí
     em diante ele vem na sua direção, e a única saída é distância.

     Duas maneiras de escapar, e as duas são de verdade: passar pro
     outro vagão, ou sentar. Trocar de carro funciona porque é isso que
     um ambulante faz — atravessa o fole e some no vagão seguinte, e
     quando o fiscal chega lá ele já é outra pessoa. Sentar funciona
     porque ambulante sentado é passageiro, e só serve se ele ainda não
     estiver em cima de você.

     A distância exigida foi medida: o fiscal corria a 96 e o ambulante
     descansado a 106, o que dava dez pixels por segundo de vantagem —
     um vagão inteiro de distância levaria um minuto de corrida em linha
     reta, que não é fuga, é esteira. Agora ele corre a 78 e o que se
     pede é o fole, não o vagão. */
  chamaFiscal: function () {
    if (this.fuga) return;
    var patente = sorteiaGuarda();
    var portas = this.portasDoCarro(carroDe(this.pl.sp.y));
    var porta = portas[0], melhor = -1, i;
    for (i = 0; i < portas.length; i++) {
      var d = Math.abs(portas[i] + PORTA_ALT / 2 - this.pl.sp.y);
      if (d > melhor) { melhor = d; porta = portas[i]; }
    }
    var a = new Ator(this, 240, porta + PORTA_ALT / 2, patente.sprite);
    a.sp.setScale(patente.escala).setDepth(58);
    a.dir = 'down';
    a.fixo = true;
    this.gente.push(a);
    this.fuga = { a: a, patente: patente, t: 0, longe: 0 };
    sfx('apito');
    this.flash(patente.nome + ' TE VIU\nCORRA!');
  },

  atualizaFuga: function (dt) {
    var f = this.fuga;
    if (!f || !f.a || !f.a.sp || !f.a.sp.active) return;
    f.t += dt;

    var dx = this.pl.sp.x - f.a.sp.x, dy = this.pl.sp.y - f.a.sp.y;
    var dist = Math.sqrt(dx * dx + dy * dy);

    /* Ele é mais devagar que o ambulante descansado e mais rápido que o
       ambulante acabado: fugir custa fôlego, e quem vendeu demais sem
       descansar não corre mais. */
    var vel = 78 * f.patente.vel;
    if (dist > 1) {
      f.a.sp.x += (dx / dist) * vel * dt / 1000;
      f.a.sp.y += (dy / dist) * vel * dt / 1000;
      limitaVagao(f.a.sp);
      f.a.setDir(dx, dy);
    }
    f.a.anima(dt, true);

    if (dist < 20) { this.fiscalPegou(); return; }

    // o fole entre vocês, por meio segundo, e ele te perde
    var trocouDeCarro = carroDe(this.pl.sp.y) !== carroDe(f.a.sp.y);
    if (trocouDeCarro && dist > 150) {
      f.longe += dt;
      if (f.longe > 600) { this.escapouDoFiscal('CORRENDO'); return; }
    } else f.longe = 0;

    // ou você senta e vira passageiro — se ele ainda não estiver colado
    if (this.sentadoEm && dist > 150) { this.escapouDoFiscal('SENTADO'); return; }

    /* E ele cansa. Sem isto, ambulante sem fôlego e sem banco vago
       ficava preso numa perseguição que não tinha como acabar: ele não
       corre mais que o fiscal, e não tem onde sentar. */
    if (f.t > 30000) this.escapouDoFiscal('DESISTIU');
  },

  escapouDoFiscal: function (como) {
    var f = this.fuga;
    if (!f) return;
    this.fuga = null;
    var k = this.gente.indexOf(f.a);
    if (k >= 0) this.gente.splice(k, 1);
    f.a.destroy();
    this.vendas = 0;
    var pts = GameState.ganhaMinigame(6 + Math.round(f.patente.custo * 4));
    GameState.addCarisma(3);
    sfx('vitoria');
    var msg = como === 'SENTADO' ? 'ELE PASSOU DIRETO.'
      : (como === 'DESISTIU' ? 'ELE CANSOU DE TE SEGUIR.' : 'OUTRO VAGÃO. VOCÊ SUMIU.');
    this.flash(msg + '\n+' + pts + ' PONTOS');
  },

  fiscalPegou: function () {
    var f = this.fuga;
    if (!f) return;
    this.fuga = null;
    var k = this.gente.indexOf(f.a);
    if (k >= 0) this.gente.splice(k, 1);
    f.a.destroy();
    this.vendas = 0;
    var multa = Math.min(GameState.dinheiro, 6 + f.patente.custo * 6);
    GameState.gastar(multa);
    GameState.addCarisma(-5);
    perdeVida(this, this.pl.sp, f.patente.custo);
    sfx('erro');
    var eu = this;
    fala(this, '"Vendendo no vagão de novo?"\n' + f.patente.nome +
      ' recolheu a caixa.\nR$ ' + multa.toFixed(2).replace('.', ',') + ' e ' +
      (f.patente.custo === 0.5 ? 'meio coração' :
        (f.patente.custo === 1 ? 'um coração' : 'dois corações')) + '.', []);
    this.time.delayedCall(2400, function () { if (eu.dialog) eu.dialog.fecha(); });
  },

  encerraFuga: function () {
    if (!this.fuga) return;
    var k = this.gente.indexOf(this.fuga.a);
    if (k >= 0) this.gente.splice(k, 1);
    if (this.fuga.a) this.fuga.a.destroy();
    this.fuga = null;
  },

  /* TURISTA — não sabe a linha. A rota só aparece quando já está
     colada, e o jeito de enxergar longe é pagar alguém pra explicar. */
  passageiroPerto: function () {
    if (!temPoder('perdido') || this.sabeARota) return null;
    for (var i = 0; i < this.npcExtra.length; i++) {
      var a = this.npcExtra[i];
      if (!a.sp || !a.sp.active) continue;
      if (Math.hypot(this.pl.sp.x - a.sp.x, this.pl.sp.y - a.sp.y) < 44) return a;
    }
    return null;
  },

  perguntaARota: function () {
    if (GameState.dinheiro < 2) { sfx('nao'); this.flash('SEM TROCO PRA PERGUNTAR.'); return; }
    GameState.gastar(2);
    GameState.addCarisma(3);
    this.sabeARota = true;
    sfx('moeda');
    this.flash('ELE EXPLICOU O CAMINHO.');
  },

  /* "Tem lugar vago" passou a querer dizer "NESTE carro". Num trem de
     oito, quase sempre existe um lugar livre em algum lugar — e mandar
     sentar num banco a três vagões daqui não é dica, é piada. */
  temLugarVago: function () {
    var c = carroDe(this.pl.sp.y);
    for (var i = 0; i < this.bancos.length; i++) {
      if (!this.bancos[i].npc && this.bancos[i].carro === c) return true;
    }
    return false;
  },

  /* ...mas o lugar de outro carro não deixa de existir: ele vira
     direção. Este é o carro vago mais perto, e é o que faz andar pelo
     trem ser a resposta pro sono em vez de um passeio. */
  carroComLugar: function () {
    var meu = carroDe(this.pl.sp.y), melhor = -1, dist = 99;
    for (var i = 0; i < this.bancos.length; i++) {
      var b = this.bancos[i];
      if (b.npc) continue;
      var d = Math.abs(b.carro - meu);
      if (d < dist) { dist = d; melhor = b.carro; }
    }
    return melhor;
  },

  comSono: function () { return GameState.descanso / GameState.char.descansoMax <= LIMIAR_SONO; },

  /* O sono não pode chegar de surpresa: até aqui o descanso zerava e a
     tela de fim de jogo dizia que você tinha dormido — a primeira e
     única notícia. Agora ele avisa ao cruzar cada marca, e as
     pálpebras do HUD vão fechando junto. */
  atualizaSono: function () {
    var p = GameState.descanso / GameState.char.descansoMax;
    var nivel = p <= 0.14 ? 2 : (p <= LIMIAR_SONO ? 1 : 0);
    if (nivel > this.nivelSono) {
      if (nivel === 2) { sfx('nao'); this.flash('VOCÊ VAI DORMIR!\nSENTE AGORA'); }
      else { sfx('empurra'); this.flash('BATEU O SONO\nSENTE NUM LUGAR VERDE'); }
    }
    this.nivelSono = nivel;
  },

  bancoLivrePerto: function () {
    var melhor = null, dist = 1e9;
    for (var i = 0; i < this.bancos.length; i++) {
      var b = this.bancos[i];
      if (b.npc) continue;
      var dx = Math.abs(this.pl.sp.x - b.x), dy = Math.abs(this.pl.sp.y - (b.y + 24));
      if (dx >= 54 || dy >= 30) continue;
      // dois lugares na mesma baia ficam a 44 de distância: pegar o
      // primeiro da lista sentava sempre no de cima, mesmo com o
      // jogador colado no de baixo
      var d = dx + dy * 2;
      if (d < dist) { dist = d; melhor = b; }
    }
    return melhor;
  },

  senta: function (b) {
    this.sentadoEm = b;
    b.npc = 'player';
    this.pl.pos(b.x, b.y + 24);
    sentaAnimado(this.pl);
    this.pl.dir = b.pose;
    this.pl.anima(0, false);
    GameState.sentado = true;
    sfx('ok');
    // a primeira vez que senta é quando dá pra ensinar pra que serve
    if (this.comSono()) this.flash('SENTOU — O SONO PASSA ▲');
  },

  levanta: function () {
    if (!this.sentadoEm) return;
    this.sentadoEm.npc = null;
    var yL = this.sentadoEm.y + 24;
    this.pl.pos(this.sentadoEm.x < 160 ? bordaEsqVagao(yL) + 8 : bordaVagao(yL) - 8, yL);
    this.sentadoEm = null;
    GameState.sentado = false;
  },

  /* ---------- solavanco / segurar na barra ---------- */
  atualizaSolavanco: function (dt) {
    if (this.sentadoEm || this.estado !== 'andando') { this.solavanco.fase = 'off'; return; }
    var s = this.solavanco, dif = GameState.dificuldade();
    s.t += dt;
    if (s.fase === 'off') {
      if (s.t > s.proximo) {
        s.fase = 'aviso'; s.t = 0;
        s.dur = Math.max(500, 1100 - dif * 70);
        sfx('empurra');
      }
    } else if (s.fase === 'aviso') {
      this.cameras.main.shake(60, 0.0015);
      if (s.t > s.dur) {
        s.fase = 'off'; s.t = 0;
        s.proximo = 2200 + Math.random() * 2600 - dif * 200;
        /* Segurar deixou de ser só apertar: tem que ter barra ao
           alcance do braço. Antes dava pra "segurar" no meio do
           corredor, agarrado no ar. */
        if (Ctrl.act && this.barraPerto().d <= ALCANCE_BARRA) {
          sfx('catraca');
        } else {
          GameState.addCarisma(-3);
          GameState.addDescanso(-3);
          this.cameras.main.shake(320, 0.008);
          sfx('nao');
          this.flash('VOCÊ TROMBOU EM ALGUÉM');
        }
      }
    }
  },

  /* Vagão andando não tem ninguém parado de verdade: quem está sentado
     balança junto com o trem e olha em volta de vez em quando. Sem isso
     o banco vira um móvel com gente pintada em cima.

     Só quem está sentado balança de posição — quem está em pé é
     empurrado pelos outros, e mexer no x deles brigaria com a física. */
  animaGente: function (dt) {
    this.tBalanco = (this.tBalanco || 0) + dt;
    var andando = (this.estado === 'andando');
    var amp = andando ? 1.2 : 0.35;
    var i, a;

    /* O trem tem oito carros e mais de duzentas pessoas. Balançar e
       animar quem está a cinco vagões daqui é trabalho por quadro que
       ninguém vê: só balança e olha em volta quem está na janela da
       câmera, com uma folga pra ninguém aparecer congelado na borda. */
    var topo = this.cameras.main.scrollY - 80, base = topo + GH + 160;
    for (i = 0; i < this.bancos.length; i++) {
      a = this.bancos[i].npc;
      if (!a || a === 'player' || !a.sp || !a.sp.active) continue;
      if (a.by < topo || a.by > base) continue;
      a.sp.x = a.bx + Math.sin(this.tBalanco / 520 + a.fase) * amp;
      a.sp.y = a.by + Math.sin(this.tBalanco / 880 + a.fase * 1.7) * amp * 0.5;
      this.olhaEmVolta(a, dt);
    }
    for (i = 0; i < this.npcExtra.length; i++) {
      a = this.npcExtra[i];
      if (a && a.sp && (a.sp.y < topo || a.sp.y > base)) continue;
      this.olhaEmVolta(a, dt);
    }
    this.abremCaminho(dt);

    // o jogador sentado balança junto
    if (this.sentadoEm && this.pl.bx !== undefined) {
      this.pl.sp.x = this.pl.bx + Math.sin(this.tBalanco / 520 + this.pl.fase) * amp;
      this.pl.sp.y = this.pl.by + Math.sin(this.tBalanco / 880 + this.pl.fase * 1.7) * amp * 0.5;
    }
  },

  /* GESTANTE — a multidão abre caminho. Ninguém empurra grávida, e no
     vagão de verdade as pessoas se encolhem quando ela passa. É o
     contrário do resto do elenco, que tem que abrir espaço no braço:
     ela atravessa o pico andando, e paga por isso cansando em dobro. */
  abremCaminho: function (dt) {
    if (!GameState.char.abremCaminho || this.sentadoEm) return;
    var px = this.pl.sp.x, py = this.pl.sp.y;
    for (var i = 0; i < this.npcExtra.length; i++) {
      var a = this.npcExtra[i];
      if (!a.sp || !a.sp.active || a.fixo) continue;
      var dx = a.sp.x - px, dy = a.sp.y - py;
      var d = Math.hypot(dx, dy);
      if (d > 46 || d < 0.5) continue;
      var vel = (52 * (1 - d / 46)) * dt / 1000;
      a.sp.x += (dx / d) * vel;
      a.sp.y += (dy / d) * vel;
      limitaVagao(a.sp);
      a.setDir(dx, dy);
      a.anima(dt, true);
    }
  },

  /* Quem está em pé olha em volta virando o corpo. Quem está sentado
     não: sentado tem pose própria, e trocar de direção levantaria a
     pessoa do banco. A vida de quem senta vem do balanço do trem. */
  olhaEmVolta: function (a, dt) {
    if (!a || !a.sp || !a.sp.active) return;
    a.olhaT += dt;
    if (a.olhaT > a.proxOlhada && String(a.dir).indexOf('sentado') !== 0) {
      a.olhaT = 0;
      a.proxOlhada = 2200 + Math.random() * 4500;
      var lados = (a.sp.x < 160) ? ['right', 'down', 'up'] : ['left', 'down', 'up'];
      a.dir = lados[Math.floor(Math.random() * lados.length)];
    }
    a.anima(dt, false);
  },

  /* ---------- o rimador ----------
     Antes ele era uma linha de diálogo: "O rimador começa." Só que o
     rimador do metrô tem um ritual, e o ritual é metade da graça — ele
     atravessa o corredor, escolhe o lugar, agacha, põe a caixinha no
     chão, liga, e só então abre a boca. Pular isso é contar a piada
     sem a pausa.

     E nada disso é caixa de diálogo: a cena continua rodando enquanto
     ele monta o barraco, então dá pra andar, sentar ou sair de perto
     antes de ele terminar. A escolha só aparece depois da última rima,
     que é quando a pessoa já decidiu se vai fingir que dorme. */
  comecaRimador: function () {
    /* um rimador de cada vez: o que está indo embora ainda é o
       this.rimador, e montar outro por cima deixa o primeiro plantado
       no vagão pro resto da viagem */
    if (this.rimador || this.encena) return;
    this.encena = true;
    var lado = (this.pl.sp.x < 160) ? 1 : -1;      // arma do lado oposto ao seu
    var x = 160 + lado * 24;
    /* Tudo acontece NO SEU CARRO. Com oito deles, uma altura fixa como
       92 punha o rimador a três vagões de distância, e a cena que ele
       encena era pra outra pessoa. */
    var topo = topoDoCarro(carroDe(this.pl.sp.y));
    var a = new Ator(this, x, topo + 40, 'np_rimador');
    a.dir = 'down';
    a.sp.setDepth(56);
    a.fixo = true;                                  // ninguém empurra quem trabalha
    this.gente.push(a);
    this.rimador = {
      a: a, lado: lado, alvo: topo + 244, fase: 'entra', t: 0,
      verso: -1, batida: 0, caixa: false, caixaX: x - lado * 26, caixaY: topo + 250
    };
    sfx('porta');
  },

  animaRimador: function (dt) {
    var r = this.rimador;
    if (!r) return;
    r.t += dt;
    var a = r.a;

    if (r.fase === 'entra') {
      a.sp.y = Math.min(r.alvo, a.sp.y + 0.075 * dt);
      a.anima(dt, true);
      if (a.sp.y >= r.alvo) { r.fase = 'abaixa'; r.t = 0; }

    } else if (r.fase === 'abaixa') {
      // vira pro lado da caixa e dobra o joelho antes de largar
      a.dir = r.lado > 0 ? 'left' : 'right';
      a.sp.y = r.alvo + Math.min(3, r.t / 130);
      a.anima(dt, false);
      if (r.t > 440) {
        r.fase = 'liga'; r.t = 0; r.caixa = true;
        a.sp.y = r.alvo;
        sfx('caixa');
      }

    } else if (r.fase === 'liga') {
      a.anima(dt, false);
      if (r.t > 520) { r.fase = 'rima'; r.t = 99999; a.dir = 'down'; }

    } else if (r.fase === 'rima') {
      r.batida += dt;
      // rebolado no ritmo: sobe e desce no compasso da caixinha
      a.sp.y = r.alvo - Math.abs(Math.sin(r.batida / 240)) * 2;
      a.anima(dt, true);
      if (r.t > 1500) {
        r.t = 0; r.verso++;
        if (r.verso >= VERSOS_RIMADOR.length) { this.fechaRimador(); return; }
        this.rima.setText(VERSOS_RIMADOR[r.verso] || VERSO_DO_JOGADOR[GameState.charKey]);
        sfx('batida');
      }

    } else if (r.fase === 'sai') {
      a.sp.y += 0.08 * dt;
      a.dir = 'down';
      a.anima(dt, true);
      if (a.sp.y > GH + 60) {
        var i = this.gente.indexOf(a);
        if (i >= 0) this.gente.splice(i, 1);
        a.destroy();
        this.rimador = null;
      }
    }
  },

  /* a caixinha no chão: corpo, dois alto-falantes, o LED e as ondas,
     que só saem enquanto ele está rimando */
  pintaCaixinha: function () {
    var g = this.gCaixa; g.clear();
    var r = this.rimador;
    if (!r || !r.caixa) return;
    var x = r.caixaX, y = r.caixaY;
    var tocando = (r.fase === 'rima' || r.fase === 'espera');

    g.fillStyle(0x000000, 0.35).fillEllipse(x, y + 1, 24, 7);
    g.fillStyle(0x3a3a4e, 1).fillRect(x - 5, y - 14, 10, 2);     // alça
    g.fillStyle(0x14141c, 1).fillRect(x - 10, y - 12, 20, 12);   // corpo
    g.fillStyle(0x2e2e40, 1).fillRect(x - 10, y - 12, 20, 2);
    g.fillStyle(0x08080e, 1).fillRect(x - 10, y - 2, 20, 2);
    for (var i = 0; i < 2; i++) {
      var cx = x - 5 + i * 10;
      g.fillStyle(0x08080e, 1).fillCircle(cx, y - 6, 3);
      g.fillStyle(tocando ? 0x454560 : 0x22222e, 1).fillCircle(cx, y - 6, 2);
    }
    g.fillStyle(tocando ? 0xe8362c : 0x3a1a18, 1).fillRect(x - 1, y - 10, 2, 2);
    if (!tocando) return;

    var p = (Math.sin(r.batida / 240) + 1) / 2;
    for (var k = 1; k <= 2; k++) {
      g.lineStyle(1, 0xf2c14e, (0.34 - k * 0.09) + 0.18 * p);
      var raio = 13 + k * 6 + p * 2;
      g.beginPath(); g.arc(x, y - 6, raio, -0.85, 0.85); g.strokePath();
      g.beginPath(); g.arc(x, y - 6, raio, Math.PI - 0.85, Math.PI + 0.85); g.strokePath();
    }
  },

  /* a escolha só entra depois da última rima */
  fechaRimador: function () {
    var self = this;
    this.rimador.fase = 'espera';
    this.rima.setText('');
    fala(this, 'Ele encerra e passa o chapéu.', [
      {
        label: 'Dar uma moeda (R$ 1,00)', cb: function () {
          if (GameState.dinheiro < 1) { sfx('nao'); self.flash('Nem moeda você tem.'); return; }
          GameState.gastar(1); GameState.addCarisma(6); GameState.stats.causos++;
          sfx('moeda'); self.flash('Ele agradeceu pelo nome.');
          self.saiRimador();
        }
      },
      {
        label: 'Mandar uma rima', cb: function () {
          self.rima.setText('');
          self.comecaBatalha();
        }
      },
      {
        label: 'Fingir que dorme', cb: function () {
          GameState.addCarisma(-4); GameState.stats.causos++;
          self.flash('Ele rimou com a sua cara.');
          self.saiRimador();
        }
      }
    ], { tempo: 9, aoExpirar: function () { GameState.addCarisma(-1); self.saiRimador(); } });
  },

  /* pega a caixinha de volta e segue pro próximo vagão */
  saiRimador: function () {
    this.encena = false;
    if (!this.rimador) return;
    this.rimador.caixa = false;
    this.rimador.fase = 'sai';
    sfx('caixa');
  },

  /* ---------- a batida da estação ----------
     A corrida do Crossy Road dura um minuto e cada pulinho conta um
     ponto na tela: é isso que faz querer mais um. A daqui dura um dia
     inteiro, e encurtá-la destruiria a premissa — o trajeto ser longo É
     o jogo. Mas a lição não era "corrida curta": era que a corrida longa
     precisa de uma batida CURTA dentro dela, e a daqui já existia e era
     muda. A estação é essa batida: uma a cada vinte minutos de relógio,
     trinta por dia.

     Não virou contador fixo no HUD de propósito. Dia e grana já moraram
     lá em cima e saíram por um motivo que continua valendo: não mudam
     decisão nenhuma no meio de um vagão, e espremiam o que muda. Um
     número que aparece na hora em que ele muda e some depois diz a mesma
     coisa sem cobrar aluguel na tela. */
  marcaEstacao: function () {
    /* Nem '·' nem 'ª' existem na fonte do jogo: saíam como buraco, e o
       aviso lia "+1     1  ESTAÇÃO". Só o que está no CHARSET. */
    /* Abaixo do letreiro, não em cima dele: o letreiro tem três linhas e
       vai até y=148, e o aviso nascia dentro do nome da estação. */
    var t = txtC(this, GW / 2, 186, '+1   ESTAÇÕES: ' + GameState.estacoes,
      PAL.verde, 8).setDepth(920).setScrollFactor(0);
    this.tweens.add({
      targets: t, y: t.y - 22, alpha: 0, duration: 1500, ease: 'Quad.easeOut',
      onComplete: function () { t.destroy(); }
    });
  },

  flash: function (msg) {
    // cena parada no meio de um aviso: o objeto ainda existe, mas o
    // texto dele já foi destruído junto com a cena
    if (!this.centro || !this.scene.isActive()) return;
    this.centro.setText(msg);
    var self = this;
    this.time.delayedCall(900, function () { if (self.centro) self.centro.setText(''); });
  },

  /* ---------- as situações de cada carro ---------- */
  /* Um ponto pisável de qualquer um dos oito carros. Usa o mesmo
     limitador do jogador em vez de recalcular a planta: o corredor
     estreita na frente do módulo, abre na frente da porta e afunila no
     fole, e uma segunda conta disso aqui sairia de sincronia na primeira
     vez que a geometria mudasse. */
  pontoDoChao: function () {
    var c = Phaser.Math.Between(0, CARROS - 1);
    var alvo = {
      x: Phaser.Math.Between(SANFONA_X0 - 10, SANFONA_X1 + 10),
      y: yDoCarro(c, Phaser.Math.Between(40, CARRO_ALT - 40))
    };
    var antes = { x: alvo.x, y: alvo.y };
    limitaVagao(alvo);
    // caiu fora do corredor: o limitador puxou pra parede, não serve
    if (Math.abs(alvo.x - antes.x) > 2 || Math.abs(alvo.y - antes.y) > 2) return null;
    // nem em cima de quem está sentado ou em pé
    for (var i = 0; i < this.gente.length; i++) {
      var g = this.gente[i];
      if (Math.abs(g.sp.x - alvo.x) < 18 && Math.abs(g.sp.y - alvo.y) < 16) return null;
    }
    return alvo;
  },

  montaSituacoes: function () {
    var dif = GameState.dificuldade();
    /* Quantos carros têm coisa acontecendo. Nunca todos: um trem sem
       nenhum carro sossegado tira do jogo a decisão de andar. */
    var quantos = Phaser.Math.Clamp(Math.round(1.5 + dif * 1.6), 2, CARROS - 1);
    var idx = [], i;
    for (i = 0; i < CARROS; i++) idx.push(i);
    Phaser.Utils.Array.Shuffle(idx);
    this.situacoes = [];
    for (i = 0; i < CARROS; i++) this.situacoes.push(null);
    for (i = 0; i < quantos; i++) {
      // o carro em que você embarcou fica de fora: você acabou de entrar
      if (idx[i] === this.carroEntrada) continue;
      this.situacoes[idx[i]] = SITUACOES[Math.floor(Math.random() * SITUACOES.length)];
    }
  },

  /* Passou a emenda: o carro novo se apresenta. O número do vagão é o
     que dá tamanho ao trem — sem ele, andar oito telas parece andar em
     círculo no mesmo lugar. */
  entraNoCarro: function (c) {
    var s = this.situacoes[c], eu = this;
    this.flash('VAGÃO ' + (c + 1) + ' DE ' + CARROS + (s ? '\n' + s.nome : ''));
    sfx('porta');
    if (!s) return;
    this.situacoes[c] = null;                 // cada carro entrega a sua uma vez
    this.time.delayedCall(800, function () {
      if (!eu.scene.isActive()) return;
      // nada por cima de coisa já acontecendo
      if (eu.dialog || eu.encontro || eu.rimador || eu.batalha || eu.duelando || eu.disfarce) return;
      if (carroDe(eu.pl.sp.y) !== c) return;  // já foi embora, deixa quieto
      s.roda(eu);
    });
  },

  /* ---------- eventos de vagão ---------- */
  sorteiaEvento: function () {
    var self = this;
    var baralho = [
      function () {
        fala(self, '"Olha o chocolate, dois real,\ndois real o chocolate."', [
          {
            label: 'Comprar (R$ 2,00)', cb: function () {
              if (GameState.dinheiro < 2) { sfx('nao'); self.flash('Sem troco.'); return; }
              GameState.gastar(2); GameState.addCarisma(4); GameState.addDescanso(2);
              GameState.stats.causos++; sfx('moeda'); self.flash('O chocolate salva.');
            }
          },
          { label: 'Fazer que não ouviu', cb: function () { GameState.addCarisma(-2); GameState.stats.causos++; } }
        ]);
      },
      function () { self.comecaRimador(); },
      function () {
        fala(self, 'Alguém pede ajuda no corredor.', [
          {
            label: 'Ajudar (R$ 2,00)', cb: function () {
              if (GameState.dinheiro < 2) { sfx('nao'); self.flash('Você não tem.'); return; }
              GameState.gastar(2); GameState.addCarisma(7); GameState.stats.causos++; sfx('moeda');
            }
          },
          { label: 'Olhar o celular', cb: function () { GameState.addCarisma(-5); GameState.stats.causos++; } }
        ]);
      },
      function () {
        fala(self, 'O guardinha entra no vagão e passa\ndevagar olhando todo mundo.', [
          {
            label: 'Ficar quieto', cb: function () {
              if (GameState.charKey === 'ambulante' && Math.random() < 0.4) {
                GameState.gastar(10); GameState.addCarisma(-5);
                self.flash('Te viu vendendo. R$ 10 de multa.');
              } else { self.flash('Passou reto.'); }
              GameState.stats.causos++;
            }
          }
        ]);
      },
      function () {
        fala(self, 'O ar-condicionado do vagão\nparou de funcionar.', [
          {
            label: 'Aguentar', cb: function () {
              GameState.addDescanso(-5); GameState.stats.causos++;
              self.flash('Calor de rachar.');
            }
          }
        ]);
      }
    ];
    baralho[Math.floor(Math.random() * baralho.length)]();
  },

  /* A linha envelhece junto com a corrida. A multidão satura — o vagão
     só cabe tanta gente, e a partir do quarto dia ela para de piorar.
     A falha não satura: quanto mais fundo na corrida, mais o trem para
     entre estações, e mais tempo ele fica parado. Como a derrota agora
     é chegar atrasado, é isso que aperta pra sempre. */
  atualizaFalha: function (dt) {
    var dif = GameState.dificuldade();
    if (this.falha) {
      this.falha.t += dt;
      if (this.falha.t > this.falha.dur) {
        this.falha = null;
        this.centro.setText('');
        sfx('trem');
      } else {
        this.centro.setCor(PAL.vermelho).setText('TREM PARADO\nFALHA NO SINAL');
      }
      return;
    }
    if (this.sorteouFalha) return;
    this.sorteouFalha = true;
    if (Math.random() < Math.min(0.42, 0.05 * dif)) {
      var perde = Math.round(2 + dif * 1.4);
      this.falha = { t: 0, dur: 1600 + dif * 260 };
      GameState.passaTempo(perde);
      GameState.addDescanso(-2);
      sfx('erro');
    }
  },

  /* Em cada parada o vagão troca de gente. Sem isso a perna inteira —
     quinze estações — seria a mesma multidão congelada, e o vagão
     viraria um cenário pintado. Quem está em pé desce e sobe conforme a
     lotação da hora; banco que vaga pode ser ocupado, e é assim que
     aparece a chance de sentar no meio do caminho. */
  trocaPassageiros: function () {
    var lot = GameState.lotacao(), i, a, vagou = 0;
    for (i = 0; i < this.bancos.length; i++) this.bancos[i].vagou = false;

    // desce quem estava em pé
    var saem = Math.min(this.npcExtra.length, Math.floor(Math.random() * 3));
    for (i = 0; i < saem; i++) {
      a = this.npcExtra.pop();
      var k = this.gente.indexOf(a);
      if (k >= 0) this.gente.splice(k, 1);
      a.destroy();
    }
    // e alguns sentados também descem
    for (i = 0; i < this.bancos.length; i++) {
      var b = this.bancos[i];
      if (!b.npc || b.npc === 'player' || Math.random() > 0.18) continue;
      var j = this.gente.indexOf(b.npc);
      if (j >= 0) this.gente.splice(j, 1);
      b.npc.destroy();
      b.npc = null;
      b.vagou = true; vagou++;
    }

    // sobe gente nova, na medida da hora
    var querEmPe = Phaser.Math.Clamp(Math.round(8 * lot), 0, 8);
    var entram = Math.min(3, Math.max(0, querEmPe - this.npcExtra.length));
    for (i = 0; i < entram; i++) {
      var p = new Ator(this, 108 + Math.random() * 104,
        yDoCarro(Phaser.Math.Between(0, CARROS - 1), 120 + Math.random() * 400), sorteiaPax());
      p.dir = Math.random() < 0.5 ? 'left' : 'right';
      p.anima(0, false); p.sp.setDepth(35);
      sentaAnimado(p);
      this.npcExtra.push(p);
      this.gente.push(p);
    }
    // e quem entra no pico não fica de pé se tem banco vago
    for (i = 0; i < this.bancos.length; i++) {
      var v = this.bancos[i];
      /* quem entra não senta no banco que acabou de vagar: no pico esse
         banco era retomado no mesmo quadro em que abria, e a única
         forma de sentar sumia antes de aparecer. O lugar fica seu até
         a próxima estação — depois disso, alguém senta. */
      if (v.npc || v.vagou || Math.random() > lot * 0.7) continue;
      var n = new Ator(this, v.x, v.y + 24, sorteiaPax());
      n.dir = v.pose;
      n.anima(0, false); n.sp.setDepth(30); n.fixo = true;
      sentaAnimado(n);
      v.npc = n;
      this.gente.push(n);
    }

    /* Vagar um lugar é a chance que o jogo dá de descansar, e ela
       passava calada. Agora avisa, e a seta verde no banco diz qual. */
    if (vagou && !this.sentadoEm) { sfx('ok'); this.flash('VAGOU UM LUGAR ►'); }
  },

  /* O passo sai no compasso da perna, não do quadro: o mesmo 130ms que
     troca o desenho da caminhada. Alterna de altura pra não virar
     metrônomo, e cala quando você para. */
  passos: function (dt, andando) {
    if (!andando) { this.tPasso = 0; return; }
    this.tPasso = (this.tPasso || 0) + dt;
    if (this.tPasso > 260) {
      this.tPasso = 0;
      this.pePar = !this.pePar;
      sfx(this.pePar ? 'passoA' : 'passoB');
    }
  },

  /* ---------- batalha de rima ----------
     Sai da escolha do jogador, não de sorteio: encarar o rimador é uma
     opção do chapéu, ao lado de dar a moeda e de fingir que dorme. Quem
     não quer minigame nunca é obrigado a jogar um.

     As sílabas caem no compasso da caixinha — o intervalo entre elas é
     a batida de verdade, e é por isso que dá pra sentir o ritmo em vez
     de só reagir. Quanto mais fundo na corrida, mais rápido o rimador
     manda.

     Os números aqui já foram outros, e eram impossíveis: 99 BPM com
     janela de 141ms, 19 sílabas, e no celular sem botão nenhum. Perder
     não era jogar mal, era ter um celular. Agora a janela abre 218ms no
     primeiro dia e só fecha até 150 — quem sente a batida acerta, quem
     não sente ainda empata. O aperto vem do BPM e da quantidade, que é
     onde aperto é ritmo; não da precisão do milissegundo, que é onde
     aperto é só castigo. */
  comecaBatalha: function () {
    var dif = GameState.dificuldade();
    var bpm = 84 + dif * 5;
    var batida = 60000 / bpm;
    var dur = 10000;
    var notas = [];
    var t = 1500, ultima = -1;
    // a sílaba fora do compasso é tempero, não regra: começa rara e só
    // fica comum lá no fim da corrida
    var dobra = Math.min(0.30, 0.08 + dif * 0.05);
    while (t < dur - 1600) {
      var lane;
      do { lane = Math.floor(Math.random() * 4); } while (lane === ultima && Math.random() < 0.6);
      ultima = lane;
      notas.push({ lane: lane, t: t, feita: false, errada: false });
      t += batida * (Math.random() < dobra ? 0.5 : 1);
    }
    this.batalha = {
      notas: notas, t: 0, dur: dur, acertos: 0, erros: 0, combo: 0, maiorCombo: 0,
      queda: Math.max(1100, 1700 - dif * 60),
      janela: Math.max(150, 230 - dif * 12),
      ant: { left: false, up: false, down: false, right: false },
      /* a pista que acabou de ser tocada acende por um instante: no
         dedo não há tecla pra ficar segurada, e sem esse aceso não dá
         pra saber se o toque entrou */
      acesa: [0, 0, 0, 0]
    };
    for (var z = 0; z < 4; z++) this.zonasBatalha[z].setInteractive();
    /* A faixa de dica é onde este jogo diz o comando em toda tela, e é
       lá que ele diz o desta também. No celular a seta embaixo da pista
       seria mentira — não existe seta pra apertar. */
    this.dica.setText(TOQUE_ATIVO ? 'TOQUE NA PISTA DA SÍLABA'
      : 'SETAS, OU CLIQUE NA PISTA', PAL.amarelo);
    /* Enquanto a batalha corre não há pra onde andar, e o manche só
       atrapalharia: um arrasto desleixado na metade esquerda viraria
       sílaba tocada sem querer. */
    this.mancheAntes = CONTROLES_VISIVEIS;
    CONTROLES_VISIVEIS = false;
    sfx('batida');
  },

  atualizaBatalha: function (dt) {
    var b = this.batalha, i, n;
    b.t += dt;

    // a batida da caixinha continua tocando por baixo
    if (this.rimador) { this.rimador.batida += dt; this.rimador.a.anima(dt, true); }

    /* uma direção vale quando é apertada, não enquanto está apertada:
       segurar pra esquerda não pode varrer a pista inteira */
    for (i = 0; i < 4; i++) {
      var d = BATALHA_DIRS[i];
      // duas batidas na mesma pista valem duas sílabas
      for (var n = Ctrl[d + 'N']; n > 0; n--) this.bateNota(i);
      b.ant[d] = !!Ctrl[d];       // só pra acender a caixa de acerto
      if (b.acesa[i] > 0) b.acesa[i] -= dt;
    }

    // sílaba que passou da janela sem ser tocada é erro
    for (i = 0; i < b.notas.length; i++) {
      n = b.notas[i];
      if (!n.feita && !n.errada && b.t > n.t + b.janela) {
        n.errada = true; b.erros++; b.combo = 0;
      }
    }
    if (b.t > b.dur) this.fimDaBatalha();
  },

  /* Bater no vazio não conta erro. Contava, e o efeito era o oposto do
     que se quer de um jogo de ritmo: batucar junto virava o jeito mais
     rápido de perder, e a pessoa aprendia a NÃO tocar. Agora só a
     sílaba que passou sem ninguém pegar é erro — o placar mede o que
     você deixou passar, não o quanto você tentou. */
  bateNota: function (lane) {
    var b = this.batalha, melhor = null, dist = 1e9;
    if (!b) return;
    b.acesa[lane] = 110;
    for (var i = 0; i < b.notas.length; i++) {
      var n = b.notas[i];
      if (n.feita || n.errada || n.lane !== lane) continue;
      var d = Math.abs(n.t - b.t);
      if (d < dist) { dist = d; melhor = n; }
    }
    if (melhor && dist <= b.janela) {
      melhor.feita = true;
      b.acertos++; b.combo++;
      if (b.combo > b.maiorCombo) b.maiorCombo = b.combo;
      sfx('catraca');
    } else {
      sfx('passoB');   // o toque no vazio faz barulho, mas não conta erro
    }
  },

  fimDaBatalha: function () {
    var b = this.batalha, self = this;
    var total = Math.max(1, b.acertos + b.erros);
    var taxa = b.acertos / total;
    this.batalha = null;
    this.centro.setText('');
    this.centro.setY(232).setCor(PAL.branco);
    for (var q = 0; q < 4; q++) {
      this.setasBatalha[q].setVisible(false);
      this.zonasBatalha[q].disableInteractive();
    }
    CONTROLES_VISIVEIS = this.mancheAntes !== false;
    GameState.stats.causos++;

    var texto, cor;
    if (taxa >= 0.62) {
      var troco = 2 + Math.round(b.maiorCombo / 6);
      GameState.addCarisma(12); GameState.ganhar(troco);
      // rima boa vale mais ponto: é o minigame mais difícil dos três
      var pts = 8 + b.maiorCombo * 2;
      texto = 'O VAGÃO VEIO ABAIXO.\n' + b.acertos + ' de ' + total + ', combo ' + b.maiorCombo +
        '.\nR$ ' + troco.toFixed(2).replace('.', ',') + ' e ' + pts + ' PONTOS.';
      cor = PAL.verde; sfx('vitoria');
      GameState.ganhaMinigame(pts);
    } else if (taxa >= 0.35) {
      GameState.addCarisma(4);
      texto = 'EMPATE TÉCNICO.\n' + b.acertos + ' de ' + total +
        '.\nEle respeitou. +' + GameState.ganhaMinigame(6) + ' PONTOS.';
      cor = PAL.amarelo; sfx('ok');
    } else {
      perdeVida(this, this.pl.sp);
      GameState.addCarisma(-7);
      texto = 'ELE TE ATROPELOU.\n' + b.acertos + ' de ' + total + '.\nO vagão inteiro riu.';
      cor = PAL.vermelho; sfx('erro');
    }
    fala(this, texto, [{ label: 'Ir embora', cb: function () { self.saiRimador(); } }]);
  },

  /* as quatro pistas, as sílabas caindo e a linha de acerto */
  pintaBatalha: function (g) {
    var b = this.batalha, i, n, cx;
    caixa(g, 40, 150, GW - 80, 380, 0xf2c14e);

    for (i = 0; i < 4; i++) {
      cx = batalhaX(i);
      g.fillStyle(0x000000, 0.3).fillRect(cx - 24, BAT_TOPO, 48, BAT_LINHA - BAT_TOPO + 16);
      // caixa de acerto: é onde a sílaba tem que estar quando você aperta
      var viva = b.ant[BATALHA_DIRS[i]] || b.acesa[i] > 0;
      g.fillStyle(BATALHA_CORES[i], viva ? 0.7 : 0.28).fillRect(cx - 24, BAT_LINHA, 48, 16);
      g.lineStyle(2, BATALHA_CORES[i], 0.9).strokeRect(cx - 24, BAT_LINHA, 48, 16);
      this.setasBatalha[i].setVisible(!TOQUE_ATIVO).setTint(viva ? 0xffffff : 0x8b90a6);
    }

    for (i = 0; i < b.notas.length; i++) {
      n = b.notas[i];
      if (n.feita || n.errada) continue;
      var p = 1 - (n.t - b.t) / b.queda;
      if (p < 0 || p > 1.1) continue;
      var y = BAT_TOPO + p * (BAT_LINHA - BAT_TOPO);
      cx = batalhaX(n.lane);
      g.fillStyle(BATALHA_CORES[n.lane], 1).fillRect(cx - 20, y, 40, 13);
      g.fillStyle(0xffffff, 0.5).fillRect(cx - 20, y, 40, 3);
      g.fillStyle(0x08080e, 0.55).fillRect(cx - 20, y + 10, 40, 3);
    }

    barra(g, 52, 504, GW - 104, 8, b.t / b.dur, 0xf2c14e, 0x1e1e2a);
    // o placar mora no alto do painel: embaixo ele tapava as setas do meio
    this.centro.setY(152).setCor(b.combo >= 4 ? PAL.verde : PAL.branco)
      .setText(b.combo >= 2 ? 'COMBO ' + b.combo
        : (b.acertos + b.erros ? b.acertos + ' DE ' + (b.acertos + b.erros) : 'MANDA!'));
  },

  /* ---------- disputa pela barra ----------
     O solavanco sempre foi solitário: vinha o tranco e você segurava.
     Só que barra de vagão cheio tem fila, e é aí que a coisa vira
     disputa — dois braços na mesma barra, e um dos dois vai pro chão.

     Era um botão só: a barra enchia enquanto você martelava a tela e
     esvaziava sozinha. Ou seja, não havia adversário — havia um
     cronômetro com sprite, e martelar mais rápido era a única jogada.

     Agora é duelo, em tela própria (ver scene-disputa.js): três botões
     grandes num triângulo, e ele avisa com o corpo o que vem antes de
     vir. Ler o outro passou a valer mais que a velocidade do polegar,
     que é o que uma disputa de barra é na vida. */
  comecaDisputa: function (a) {
    if (this.duelando) return;
    var eu = this;
    this.duelando = true;
    this.scene.launch('Disputa', {
      sprite: (a && a.sp && a.sp.active) ? a.sp.texture.key : sorteiaPax(),
      aoFechar: function (r) {
        eu.duelando = false;
        if (a) a.fixo = true;
        /* Ganhou, ele desencosta e vai pra outra ponta do vagão. Não é
           prêmio: é o que acontece quando alguém perde a barra. */
        if (r === 'ganhou' && a && a.sp && a.sp.active) {
          a.sp.y += (a.sp.y < eu.pl.sp.y ? -70 : 70);
          limitaVagao(a.sp);
        }
        var morte = GameState.derrota();
        if (morte) { GameState.motivoFim = morte; eu.fimDeJogo(); }
      }
    });
  },

  /* ---------- encontro ----------
     Os minigames apareciam por sorteio, sem aviso e sem cara. Agora eles
     têm dono: um passageiro decide te abordar, vem andando, e leva um
     tempo carregando antes de a coisa começar.

     Esse tempo é de propósito. É a janela pra fugir: se você se afastar
     antes de a carga encher, ele desiste. Ou você mesmo pode abordar
     primeiro — quem chega junto e aperta começa na hora. */
  sorteiaEncontro: function () {
    if (this.encontro || this.batalha || this.duelando || this.disfarce || this.encena) return;
    // um rimador de cada vez: dois barracos montados e a caixinha que
    // sai no fim da batalha é a do outro
    if (this.rimador) return;
    if (this.estado !== 'andando' || !this.npcExtra.length) return;
    if (Math.random() > Math.min(0.5, 0.14 + GameState.dificuldade() * 0.05)) return;

    /* Quanto mais cheio o vagão, mais a briga é por barra: no pico
       ninguém disputa rima, disputa lugar pra segurar. Sentado nunca
       disputa barra — quem senta não segura em nada. */
    var lot = GameState.lotacao();
    if (!this.sentadoEm && Math.random() < 0.25 + lot * 0.5) return this.desafioDeBarra();
    return this.desafioDeRima();
  },

  /* Quem quer a sua barra é um passageiro qualquer, porque é isso que
     ele é: gente que também precisa se segurar. */
  desafioDeBarra: function () {
    var a = this.npcExtra[Math.floor(Math.random() * this.npcExtra.length)];
    if (!a.sp || !a.sp.active) return;
    this.encontro = { a: a, tipo: 'barra', fase: 'vem', t: 0, carga: 0 };
    a.fixo = false;
    sfx('apito');
  },

  /* ---------- o desafio de rima ----------
     A batalha vinha de um passageiro sorteado, e o vagão inteiro tem a
     mesma cara: quem te desafiava podia ser a senhora do banco. Rima é
     ofício, e quem rima no metrô tem uniforme — boné e caixinha. Agora
     o desafiante é sempre um rimador, entra pela porta, vem com a
     moldura amarela e o nome em cima da cabeça, e dá pra ver de longe
     o que ele quer antes de ele chegar em você. */
  desafioDeRima: function () {
    var lado = (this.pl.sp.x < 160) ? 1 : -1;
    /* entra pela porta mais longe de você: o desafio tem que dar tempo
       de ser visto atravessando o vagão, senão ele aparece colado em
       quem joga e vira susto em vez de aviso */
    var portas = this.portasDoCarro(carroDe(this.pl.sp.y));
    var porta = portas[0], melhor = -1;
    for (var i = 0; i < portas.length; i++) {
      var d = Math.abs(portas[i] + PORTA_ALT / 2 - this.pl.sp.y);
      if (d > melhor) { melhor = d; porta = portas[i]; }
    }
    var a = new Ator(this, 160 + lado * 46, porta + PORTA_ALT / 2, 'np_rimador');
    a.dir = 'down';
    a.sp.setDepth(56);
    a.fixo = false;
    this.gente.push(a);
    this.encontro = { a: a, tipo: 'rima', fase: 'vem', t: 0, carga: 0, convidado: true };
    sfx('apito');
  },

  /* Aceita a batalha e ele monta o barraco ali mesmo: a caixinha desce,
     a batida entra, e daí em diante é o mesmo rimador do ritual — é o
     que faz o fim da batalha saber mandar ele embora. */
  montaRimadorDoDesafio: function (a) {
    if (this.rimador) return;
    var lado = a.sp.x < 160 ? 1 : -1;
    this.rimador = {
      a: a, lado: lado, alvo: a.sp.y, fase: 'espera', t: 0, verso: 99, batida: 0,
      caixa: true, caixaX: a.sp.x + lado * 24, caixaY: a.sp.y + 12
    };
    a.fixo = true;
    this.encena = true;
    sfx('caixa');
  },

  atualizaEncontro: function (dt) {
    var e = this.encontro;
    if (!e) return;
    var a = e.a;
    if (!a.sp || !a.sp.active) { this.encerraEncontro(); return; }
    e.t += dt;

    var dx = this.pl.sp.x - a.sp.x, dy = this.pl.sp.y - a.sp.y;
    var d = Math.sqrt(dx * dx + dy * dy);

    if (e.fase === 'vem') {
      if (e.t > 9000) { this.encerraEncontro(); return; }   // desistiu de te achar
      if (d > 26) {
        // atravessar o vagão inteiro a 40px/s levava cinco segundos e a
        // abordagem morria de tédio antes de chegar
        var vel = (62 + GameState.dificuldade() * 9) * dt / 1000;
        a.sp.x += (dx / d) * vel; a.sp.y += (dy / d) * vel;
        limitaVagao(a.sp);
        a.setDir(dx, dy);
        a.anima(dt, true);
      } else {
        e.fase = 'carrega'; e.t = 0;
      }
      return;
    }

    // carregando: encheu, começa. Andou pra longe, escapou.
    a.setDir(dx, dy); a.anima(dt, false);
    if (d > 92) { this.encerraEncontro(); this.flash('VOCÊ ESCAPOU'); return; }
    e.carga = Math.min(1, e.carga + dt / 1500);
    if (e.carga >= 1) {
      var tipo = e.tipo, quem = e.a;
      this.encontro = null;
      this.tagEncontro.setVisible(false);
      if (tipo === 'rima') { this.montaRimadorDoDesafio(quem); this.comecaBatalha(); }
      else this.comecaDisputa(quem);
    }
  },

  encerraEncontro: function () {
    if (!this.encontro) return;
    var a = this.encontro.a, convidado = this.encontro.convidado;
    this.encontro = null;
    this.tagEncontro.setVisible(false);
    if (!a || !a.sp || !a.sp.active) return;
    // o rimador só existia pra esse desafio: sem desafio, ele vai embora
    if (convidado) {
      var i = this.gente.indexOf(a);
      if (i >= 0) this.gente.splice(i, 1);
      a.destroy();
      return;
    }
    a.fixo = false;
    sentaAnimado(a);
  },

  pintaEncontro: function (g) {
    var e = this.encontro;
    if (!e || !e.a.sp || !e.a.sp.active) { this.tagEncontro.setVisible(false); return; }
    var x = Math.round(e.a.sp.x), py = e.a.sp.y;
    var rima = (e.tipo === 'rima');
    var cor = rima ? 0xf2c14e : 0xe8362c;

    /* Um "!" solto em cima de um passageiro qualquer não dizia quem
       era nem o que ele queria: num vagão de doze pessoas iguais, a
       moldura é o que separa o desafiante do resto, e o nome é o que
       diz por que ele veio. */
    /* o boneco tem o pé no sp.y e quarenta e oito de altura: a moldura
       é o corpo dele, não um quadrado em volta do chão */
    var topo = py - 50, alt = 54;
    var pulso = 0.55 + 0.45 * Math.sin(this.time.now / 190);
    g.fillStyle(cor, 0.14 + 0.1 * pulso).fillRect(x - 14, topo, 28, alt);
    g.lineStyle(2, cor, 0.55 + 0.45 * pulso);
    g.strokeRect(x - 14, topo, 28, alt);
    // cantoneiras: o retângulo fino sumia no meio da multidão
    g.fillStyle(cor, 1);
    for (var c = 0; c < 4; c++) {
      var cx = x - 15 + (c % 2) * 28, cy = topo - 1 + (c > 1 ? alt : 0);
      g.fillRect(cx, cy, 2, 6); g.fillRect(cx, cy, 6, 2);
      if (c % 2) g.fillRect(cx - 4, cy, 6, 2);
      if (c > 1) g.fillRect(cx, cy - 4, 2, 6);
    }

    /* A etiqueta mora acima da moldura. Quando ele está tão no alto que
       não sobra espaço — e ali em cima mora a placa de rota — ela desce
       pros pés dele em vez de brigar pelo mesmo pixel. */
    var acima = (py - 82 >= 140);
    var ty = acima ? py - 82 : py + 6;
    var tx = Phaser.Math.Clamp(x, 48, GW - 48);
    this.tagEncontro.setVisible(true).setText(rima ? 'RIMADOR' : 'QUER A BARRA');
    this.tagEncontro.setPosition(tx, ty);
    var lw = Math.round(this.tagEncontro.width) + 8, lh = Math.round(this.tagEncontro.height) + 4;
    g.fillStyle(0x08080e, 0.85).fillRect(tx - lw / 2, ty - 2, lw, lh);
    g.fillStyle(cor, 1).fillRect(tx - lw / 2, ty + lh - 4, lw, 2);

    if (e.fase !== 'carrega') return;
    // e a carga, que é o tempo que sobra pra fugir
    var by = acima ? ty - 12 : ty + lh + 4;
    g.fillStyle(0x08080e, 0.7).fillRect(x - 20, by, 40, 7);
    g.fillStyle(0xe8362c, 1).fillRect(x - 19, by + 1, Math.round(38 * e.carga), 5);
  },


  /* Antes uma cena de vagão era uma estação, e cabia certinho um evento
     e um dilema por cena. Agora a cena é a perna inteira, quinze
     estações: com a mesma regra sairia um ambulante por estação e o
     vagão viraria um circo. Cada trecho sorteia se tem alguma coisa — e
     o dilema do lugar, que é o coração do jogo, pesa muito mais quando
     você está sentado, porque é aí que ele dói. */
  sorteiaRitmo: function () {
    this.sorteiaEncontro();
    this.eventoPendente = Math.random() < 0.28;
    this.dilemaPendente = Math.random() < (this.sentadoEm ? 0.45 : 0.10);
    this.tEvento = 2200 + Math.random() * 1400;
    this.tDilema = 4600 + Math.random() * 1400;
  },

  /* ---------- o dilema do lugar ---------- */
  dilemaDoLugar: function () {
    var self = this;
    this.dilemaPendente = false;
    var quem = ['um senhor de bengala', 'uma gestante', 'uma mãe com bebê no colo'][Math.floor(Math.random() * 3)];

    if (GameState.charKey === 'senhor' && !this.sentadoEm) {
      fala(this, 'Uma moça levanta e oferece\no lugar para você.', [
        {
          label: 'Aceitar', cb: function () {
            /* o lugar que te ofereceram é o do lado, não um livre a
               três vagões daqui */
            var b = null, meu = carroDe(self.pl.sp.y), dist = 1e9, i;
            for (i = 0; i < self.bancos.length; i++) {
              var cand = self.bancos[i];
              if (cand.npc || cand.carro !== meu) continue;
              var dd = Math.abs(cand.y + 24 - self.pl.sp.y);
              if (dd < dist) { dist = dd; b = cand; }
            }
            if (!b) {
              // vagão lotado: a moça levanta do banco mais perto de você
              for (i = 0; i < self.bancos.length; i++) {
                var oc = self.bancos[i];
                if (oc.carro !== meu || oc.npc === 'player') continue;
                var od = Math.abs(oc.y + 24 - self.pl.sp.y);
                if (od < dist) { dist = od; b = oc; }
              }
              if (b && b.npc) { b.npc.destroy(); b.npc = null; }
            }
            if (!b) b = self.bancos[0];
            self.senta(b);
            GameState.addDescanso(16); GameState.addCarisma(-3);
            self.flash('"Obrigado, viu, filha."');
          }
        },
        {
          label: 'Recusar, tô bem', cb: function () {
            GameState.addCarisma(8); GameState.addDescanso(-6);
            self.flash('Orgulho custa caro.');
          }
        }
      ], { tempo: 6, aoExpirar: function () { GameState.addCarisma(-2); } });
      return;
    }

    if (!this.sentadoEm) return;

    var yD = this.sentadoEm.y + 24;
    this.idoso = new Ator(this, this.sentadoEm.x < 160 ? bordaEsqVagao(yD) + 6 : bordaVagao(yD) - 6,
      yD, 'np_idoso');
    this.idoso.dir = this.sentadoEm.x < 160 ? 'left' : 'right';
    this.idoso.anima(0, false);
    this.idoso.sp.setDepth(55);
    this.idoso.fixo = true;
    this.gente.push(this.idoso);
    sfx('porta');

    /* Na preferencial não é o mesmo dilema. Ali o lugar não é seu, é
       de quem precisa — e o vagão inteiro sabe disso, porque está
       escrito no encosto. Ceder rende mais, e não ceder custa o dobro:
       recusar num banco comum é ser grosso, recusar na preferencial é
       estar errado na frente de todo mundo. */
    var pref = !!this.sentadoEm.pref;
    var bonus = pref ? 14 : 9, perda = pref ? -18 : -9;
    fala(this, pref
      ? 'Entra ' + quem + '.\nVocê está na preferencial.'
      : 'Entra ' + quem + '\ne para bem na sua frente.', [
      {
        label: 'Dar o lugar', cb: function () {
          GameState.addCarisma(bonus); GameState.addDescanso(-9);
          GameState.stats.cedidos++; GameState.stats.causos++;
          self.levanta(); sfx('ok');
          self.flash(pref ? 'Era o lugar dele mesmo.' : 'O vagão inteiro viu.');
        }
      },
      { label: 'Disfarçar', cb: function () { self.comecaDisfarce(); } },
      {
        label: 'Não dar', cb: function () {
          GameState.addCarisma(perda); GameState.addDescanso(5);
          GameState.stats.recusas++; GameState.stats.causos++;
          sfx('nao');
          self.flash(pref ? 'Na preferencial. Todo mundo viu.' : 'Todo mundo te encarou.');
        }
      }
    ], {
      tempo: 6,
      cor: pref ? 0xe8362c : 0xe8a33c,
      aoExpirar: function () {
        GameState.addCarisma(pref ? -12 : -6); GameState.stats.recusas++;
        self.flash('Você travou. Isso conta como não.');
      }
    });
  },

  /* ---------- minigame do disfarce ---------- */
  comecaDisfarce: function () {
    GameState.stats.disfarces++;
    this.disfarce = { suspeita: 30, t: 0, dur: 8000, olhar: null, olharT: 0, proxOlhar: 900 };
    this.centro.setText('DISFARCE: OLHANDO O CELULAR');
  },

  atualizaDisfarce: function (dt) {
    var d = this.disfarce, dif = GameState.dificuldade();
    d.t += dt;
    d.suspeita += (5.5 + dif * 1.6) * dt / 1000;

    if (d.olhar) {
      d.olharT += dt;
      var acertou = false, errou = false;
      var p = Ctrl.dirDominante();
      if (p) { if (p === d.olhar) acertou = true; else errou = true; }
      if (acertou) { d.suspeita -= 16; d.olhar = null; d.proxOlhar = 700 + Math.random() * 900; d.olharT = 0; sfx('catraca'); }
      else if (errou || d.olharT > Math.max(450, 950 - dif * 60)) {
        d.suspeita += 22; d.olhar = null; d.proxOlhar = 800 + Math.random() * 900; d.olharT = 0; sfx('nao');
      }
    } else {
      d.olharT += dt;
      if (d.olharT > d.proxOlhar) {
        var dirs = ['up', 'down', 'left', 'right'];
        d.olhar = dirs[Math.floor(Math.random() * 4)];
        d.olharT = 0;
      }
    }

    this.tSeta.setText(d.olhar ? ({ up: '▲', down: '▼', left: '◄', right: '►' })[d.olhar] : '');

    if (d.suspeita >= 100) {
      this.tSeta.setText(''); this.centro.setText('');
      this.disfarce = null;
      perdeVida(this, this.pl.sp);
      GameState.addCarisma(-14);
      this.levanta();
      sfx('erro');
      fala(this, '"Moço, o senhor não vai\nlevantar não?"', []);
      var self = this;
      this.time.delayedCall(1800, function () { if (self.dialog) self.dialog.fecha(); });
      return;
    }
    if (d.t >= d.dur) {
      this.tSeta.setText(''); this.centro.setText('');
      this.disfarce = null;
      GameState.addCarisma(-4);
      GameState.stats.disfarcesOk++;
      if (this.idoso) { this.idoso.destroy(); this.idoso = null; }
      sfx('ok');
      this.flash('Ele desceu. Você segue sentado.');
    }
  },

  /* ---------- chegada ---------- */
  /* O trem para. Antes cada parada era o fim da cena e descer era
     obrigatório; agora a parada é só uma parada — quem tem destino fica
     dentro até a estação certa. Sentado ninguém é levantado à força. */
  chega: function () {
    this.estado = 'parado';
    this.t = 0;
    this.avisouPorta = false;
    this.pintaPortas(true);
    sfx('chegando');
    var eu = this;
    this.time.delayedCall(420, function () { sfx('porta'); });
    this.time.delayedCall(700, function () { if (eu.scene && eu.scene.isActive()) sfx('anuncio'); });
    if (this.idoso) { this.idoso.destroy(); this.idoso = null; }
    /* Um pedido de lugar por estação: pedir sem parar transformaria o
       idoso num botão de sentar. O cochilo NÃO é zerado aqui de
       propósito — se a parada acordasse, cochilar não custaria nada e
       passar da estação nunca aconteceria. */
    this.pediu = false;
    if (this.noChao) { this.levantaDoChao(); this.flash('O TREM PAROU. VOCÊ LEVANTOU.'); }
    // chegou a estação: o rimador recolhe a caixinha e vai embora também
    if (this.rimador && this.rimador.fase !== 'sai') { if (this.dialog) this.dialog.fecha(); this.saiRimador(); }
    this.rima.setText('');

    var virou = GameState.avancaTrem();
    var aqui = GameState.estacaoAtual();
    this.marcaEstacao();
    this.encerraEncontro();
    /* Na estação o fiscal desce. Não é misericórdia: perseguição que
       atravessa a parada vira perseguição sem fim, e o vagão que para é
       exatamente onde um ambulante troca de carro na vida real. */
    if (this.fuga) { this.encerraFuga(); this.flash('O FISCAL DESCEU.'); }
    this.trocaPassageiros();
    if (virou) {
      // ficou no trem até a ponta da linha: ele volta, e o desvio custa
      GameState.passaTempo(4);
      GameState.addDescanso(-5);
      sfx('nao');
      this.flash('FIM DA LINHA. O TREM VOLTOU');
    } else if (aqui === GameState.alvoAtual()) {
      sfx('apito');
      this.flash(GameState.faltaBaldear() ? 'SÉ: DESÇA PRA BALDEAR' : 'SUA ESTAÇÃO: ' + aqui);
    } else if (GameState.virouFaixa()) {
      this.flash(GameState.hora() + ' ' + GameState.faixa().nome);
    } else {
      this.flash(aqui);
    }
  },

  /* Descer. Se é a sua estação, a perna anda; se não é, você pagou por
     um trem a mais e vai esperar o próximo na plataforma errada. */
  desce: function () {
    GameState.sentado = false;
    var aqui = GameState.estacaoAtual();
    if (aqui !== GameState.alvoAtual()) {
      GameState.addDescanso(-6);
      GameState.passaTempo(4);
      sfx('nao');
      // desceu na estação errada: volta pra plataforma, do lado de dentro
      this.scene.start('Estacao', { onde: 'plataforma' });
      return;
    }
    if (GameState.faltaBaldear()) {
      GameState.baldeia();
      sfx('ok');
      // baldear não passa por catraca, mas passa pelo corredor da Sé
      this.scene.start('Baldeacao');
      return;
    }
    var atrasado = GameState.minutosNaPerna() > LIMITE_ATRASO && GameState.perna === 'ida';
    GameState.chegouNoDestino();
    var morte = GameState.derrota();
    if (morte) { GameState.motivoFim = morte; this.fimDeJogo(); return; }
    sfx(atrasado ? 'erro' : 'vitoria');
    this.scene.start('Estacao');            // nova perna: entra no sistema de novo
  },

  fimDeJogo: function () {
    GameState.salvarRecorde();
    vaiPraOFim(this);
  },

  /* ---------- loop ---------- */
  update: function (time, delta) {
    Ctrl.update();
    var dt = Math.min(delta, 50);
    // a descida roda antes de qualquer saída antecipada, senão o painel
    // congela no meio do caminho durante um diálogo ou uma briga
    this.aplicaRota(dt);

    if (this.dialog && this.dialog.ativo) { this.dialog.update(dt); return; }
    if (this.batalha) { this.atualizaBatalha(dt); this.pintaCaixinha(); this.pintaUI(); return; }
    if (this.disfarce) { this.atualizaDisfarce(dt); this.pintaUI(); return; }

    this.t += dt;

    this.atualizaSono();
    this.atualizaCochilo(dt);
    if (this.sentadoEm) GameState.addDescanso(0.0018 * dt);
    // o chão descansa menos que o banco, e o cochilo em pé menos ainda
    else if (this.noChao) GameState.addDescanso(0.0011 * dt);
    else if (this.cochilando()) GameState.addDescanso(0.0008 * dt);
    // o cansaço é o eixo que nunca satura: a lotação bate no teto no
    // quarto dia, mas ficar em pé cansa cada vez mais
    else GameState.addDescanso(-0.00082 * GameState.char.dreno * dt * (0.8 + GameState.dificuldade() * 0.2));

    var morte = GameState.derrota();
    if (morte) { GameState.motivoFim = morte; this.fimDeJogo(); return; }

    if (this.estado === 'andando') {
      this.atualizaSolavanco(dt);
      this.atualizaFalha(dt);
      if (this.falha) { this.animaGente(dt); this.pintaUI(); this.contexto(); return; }
      if (this.eventoPendente && this.t > this.tEvento) { this.eventoPendente = false; this.sorteiaEvento(); this.pintaUI(); return; }
      if (this.dilemaPendente && !this.encena && this.t > this.tDilema) { this.dilemaDoLugar(); this.pintaUI(); return; }
      if (this.t > this.duracao) this.chega();
    } else if (this.estado === 'parado') {
      /* Trinta segundos de porta aberta sem aviso viram trinta segundos
         de nada seguidos de um susto. O apito de fechar entra a seis do
         fim, que é o tempo de correr até a porta de onde quer que você
         esteja no carro — é assim que a estação avisa, e é a única
         parte da parada que precisa de pressa. */
      /* a sua estação ganha o dobro de porta aberta, e é a única em que
         faz diferença: nas outras você não ia descer mesmo */
      var espera = this.eraSuaEstacao ? TEMPO_PARADO_SUA : TEMPO_PARADO;
      if (!this.avisouPorta && this.t > espera - 4000) {
        this.avisouPorta = true;
        sfx('apito');
        this.flash('PORTAS FECHANDO');
      }
      if (this.t > espera) {
        this.estado = 'andando'; this.t = 0;
        this.sorteiaRitmo();
        this.sorteouFalha = false;
        this.pintaPortas(false);
        sfx('porta');
        /* a porta fecha e o trem sai: o som de partir e o de chegar ao
           contrario, e e ele que diz 'acabou o tempo de descer' pra quem
           nao estava olhando pro letreiro */
        var euP = this;
        this.time.delayedCall(380, function () { if (euP.scene && euP.scene.isActive()) sfx('partindo'); });
        // deixar a sua estação passar é o erro caro: agora tem que voltar
        if (this.eraSuaEstacao) {
          GameState.addDescanso(-8);
          GameState.addCarisma(-2);
          GameState.apontaPraAlvo();
          sfx('erro');
          this.flash('PASSOU DA SUA ESTAÇÃO');
        }
      }
    }
    this.eraSuaEstacao = (this.estado === 'parado')
      && GameState.estacaoAtual() === GameState.alvoAtual();

    if (!this.sentadoEm && !this.noChao) {
      var vel = GameState.char.velocidade * (0.55 + 0.45 * (GameState.descanso / GameState.char.descansoMax));
      if (Ctrl.act) vel *= 0.35;
      var dx = (Ctrl.right ? 1 : 0) - (Ctrl.left ? 1 : 0);
      var dy = (Ctrl.down ? 1 : 0) - (Ctrl.up ? 1 : 0);
      var mv = (dx !== 0 || dy !== 0);
      // quem anda acorda: o cochilo só conta com o corpo parado
      this.andandoAgora = mv;
      if (mv) {
        var n = Math.sqrt(dx * dx + dy * dy);
        this.pl.sp.x += (dx / n) * vel * dt / 1000;
        this.pl.sp.y += (dy / n) * vel * dt / 1000;
        limitaVagao(this.pl.sp);        // o corredor abre na frente das portas
        this.pl.setDir(dx, dy);
      }
      this.pl.anima(dt, mv);
      this.passos(dt, mv);
      resolveCorpos(this.pl, this.gente, limitaVagao, limitaVagao);
    }
    // quem está sentado não cata moeda: pegar é passar por cima andando
    if (this.chao && !this.sentadoEm) this.chao.atualiza(dt, this.pl.sp.x, this.pl.sp.y);

    if (this.fuga) this.atualizaFuga(dt);

    // cruzou o fole: outro carro, outra situação
    var carroAgora = carroDe(this.pl.sp.y);
    if (carroAgora !== this.carroAtual) {
      this.carroAtual = carroAgora;
      this.entraNoCarro(carroAgora);
    }

    this.atualizaMao();
    this.pintaMao();
    this.atualizaEncontro(dt);
    this.animaGente(dt);
    this.animaRimador(dt);
    this.pintaCaixinha();
    this.pintaUI();
    this.contexto();
  },

  contexto: function () {
    var dica = '';

    /* De olho fechado não se vê nada — nem a placa de rota, nem o aviso
       de que a sua estação é esta. Cochilar devolve descanso de graça, e
       o preço é esse: quem dorme em pé passa da estação. Soltar a barra
       acorda na hora. */
    if (this.cochilando()) {
      this.dica.setText('COCHILANDO ▲   SOLTE PRA ACORDAR', PAL.cinza);
      this.pintaRota();
      return;
    }

    /* "ou a gente aborda, ou ele te ataca": se ele está vindo e você
       chega junto, dá pra encarar na hora em vez de esperar. */
    if (this.encontro) {
      var ea = this.encontro.a;
      if (ea.sp && ea.sp.active &&
        Math.hypot(this.pl.sp.x - ea.sp.x, this.pl.sp.y - ea.sp.y) < 62) {
        this.dica.setText(nomeAgir() + (this.encontro.tipo === 'rima'
          ? ': ACEITAR A RIMA' : ': ENCARAR'), PAL.vermelho);
        /* Aceitar vale nas duas fases: enquanto ele vem, encarar é ir
           pra cima; enquanto ele carrega, é dizer que não precisa
           esperar a barra encher. Quem não quer, anda pra longe. */
        if (Ctrl.actJust) {
          if (this.encontro.fase === 'vem') { this.encontro.fase = 'carrega'; this.encontro.t = 0; }
          else this.encontro.carga = 1;
          sfx('empurra');
        }
        this.pintaRota();
        return;
      }
    }

    if (this.estado === 'parado') {
      // descer é chegar no vestíbulo, não só estar na altura da porta
      var perto = false;
      for (var i = 0; i < this.portas.length; i++) {
        if (this.pl.sp.x > 258 && Math.abs(this.pl.sp.y - (this.portas[i] + PORTA_ALT / 2)) < 34) perto = true;
      }
      var minha = (GameState.estacaoAtual() === GameState.alvoAtual());
      /* Descer é a ação da parada, mas só engole o comando quando você
         está no vestíbulo. Fora dele a viagem continua normal — sentar
         em banco que vagou na parada é metade da graça de parar. */
      if (perto) {
        dica = nomeAgir() + (minha ? ': DESCER' : ': descer (não é a sua)');
        if (Ctrl.actJust) { this.desce(); return; }
      } else if (minha) {
        dica = 'DESÇA AQUI ►';
      }
    }
    if (!dica && this.noChao) {
      dica = 'NO CHÃO ▲  ' + nomeAgir() + ' PRA LEVANTAR';
      if (Ctrl.backJust || Ctrl.actJust) this.levantaDoChao();
    }
    if (!dica && this.fuga && this.fuga.a && this.fuga.a.sp) {
      /* Enquanto ele vem, o rodapé não tem outra coisa pra dizer. A
         seta é a direção DELE, que é a direção contrária à sua. */
      var df = this.fuga.a.sp.y - this.pl.sp.y;
      dica = this.fuga.patente.nome + ' ' + (df < 0 ? '▲' : '▼') + ' CORRA!';
    }
    if (!dica) {
      if (this.sentadoEm) {
        // no celular não existe tecla X: agir de novo levanta
        dica = this.sentadoEm.pref && !temPoder('pedeLugar')
          ? 'NA PREFERENCIAL ▲'
          : (GameState.descanso < GameState.char.descansoMax - 1
            ? 'DESCANSANDO ▲' : nomeAgir() + ' pra levantar');
        if (Ctrl.backJust || Ctrl.actJust) this.levanta();
      } else {
        var b = this.bancoLivrePerto();
        if (b) {
          /* O rodapé avisa ANTES: quem senta na preferencial sem
             precisar dela escolheu isso, não tropeçou nisso. */
          dica = nomeAgir() + (b.pref ? ': PREFERENCIAL' : ': SENTAR');
          if (Ctrl.actJust) this.senta(b);
        } else if (this.bancoOcupadoPerto()) {
          // o idoso e a gestante não caçam banco vago: eles pedem
          dica = nomeAgir() + ': PEDIR O LUGAR';
          if (Ctrl.actJust) this.pedeOLugar(this.bancoOcupadoPerto());
        } else if (this.passageiroPerto()) {
          dica = nomeAgir() + ': PERGUNTAR (R$ 2)';
          if (Ctrl.actJust) this.perguntaARota();
        } else if (this.podeSentarNoChao() && (this.comSono() || !this.temLugarVago())) {
          dica = nomeAgir() + ': SENTAR NO CHÃO';
          if (Ctrl.actJust) this.sentaNoChao();
        } else if (this.podeVender()) {
          dica = nomeAgir() + ': VENDER  (FISCAL ' + Math.round(this.fiscal) + '%)';
          if (Ctrl.actJust) this.vende();
        } else if (this.comSono() && this.temLugarVago()) {
          /* Com sono, mandar segurar na barra é mandar pro lugar
             errado: barra não descansa ninguém. Enquanto houver lugar
             vago, o rodapé aponta pra ele. */
          dica = 'SONO! SENTE NO VERDE ►';
        } else if (this.comSono() && this.carroComLugar() >= 0) {
          /* Neste carro não tem, mas o trem tem oito. A dica deixa de
             ser um beco sem saída e vira um caminho: quantos vagões, e
             pra que lado. */
          var meuC = carroDe(this.pl.sp.y), comC = this.carroComLugar();
          var quantos = Math.abs(comC - meuC);
          dica = 'SONO! LUGAR ' + (comC < meuC ? '▲' : '▼') + ' ' + quantos +
            (quantos === 1 ? ' VAGÃO' : ' VAGÕES');
        } else if (this.barraPerto().d <= ALCANCE_BARRA) {
          dica = this.segurando ? 'SEGURANDO' : 'SEGURE PRA NÃO CAIR';
        } else {
          dica = 'VÁ ATÉ UMA BARRA';
        }
      }
    }
    this.dica.setText(dica);
    this.pintaRota();
  },

  /* Onde descer não cabe na barra de baixo: lá moram as ações, e a
     viagem passa por doze estações que não são a sua. A rota mora numa
     placa própria, debaixo do HUD, e vira verde quando a próxima é a
     sua. */
  pintaRota: function () {
    var falta = GameState.faltamEstacoes(), alvo = GameState.alvoAtual();
    var txto, cor;

    /* De olho fechado ninguém lê placa. O CLT cochila de graça, e o
       preço é este: a rota some enquanto ele dorme em pé. */
    if (this.cochilando()) {
      this.poeNoLetreiro(PAL.cinzaEsc, 'ZZZ...', 'zzz');
      return;
    }
    /* O turista não conhece a linha: a placa só serve de perto. De
       longe ele tem que perguntar — e perguntar custa. */
    if (temPoder('perdido') && !this.sabeARota && falta > 1) {
      this.poeNoLetreiro(PAL.cinzaEsc, 'VOCÊ NÃO SABE\nONDE DESCER', 'perdido');
      return;
    }

    /* A primeira linha do letreiro é a estação — parada, é onde você
       está; andando, é a próxima. É a informação que saiu do topo da
       tela, e ela vem antes de tudo. */
    var aqui = GameState.estacaoAtual();
    var parado = (this.estado === 'parado');
    txto = (parado ? aqui : '► ' + GameState.proximaEstacaoNome()) + '\n';

    if (falta <= 0) { txto += 'DESÇA NA ' + alvo; cor = PAL.verde; }
    else if (falta === 1) { txto += 'PRÓXIMA É A SUA: ' + alvo; cor = PAL.verde; }
    else { txto += alvo + ' EM ' + falta + ' ESTAÇÕES'; cor = PAL.amarelo; }
    /* Onde descer não diz o que você vai fazer lá, e agora o destino
       muda todo dia: a linha do compromisso é o que dá sentido à
       estação. */
    if (!GameState.faltaBaldear()) txto += '\n► ' + GameState.rotuloDaPerna();

    /* Na ida existe hora de entrada, e atraso que a pessoa não vê
       chegando é injusto: a hora aparece junto com a rota, com os
       minutos que sobram, e fica vermelha quando aperta. */
    if (GameState.perna === 'ida') {
      var folga = GameState.minutosParaOAtraso();
      txto += '\nENTRADA ' + GameState.horaLimite() +
        (folga > 0 ? ' (' + folga + ' MIN)' : ' — ATRASADO');
      if (folga <= 12) cor = PAL.vermelho;
    }
    /* A chave NÃO inclui os minutos que faltam. Eles andam sozinhos, e
       um painel que desce a cada minuto é metade do que incomodava.
       Ela guarda só o que é notícia: onde estou, quantas faltam, pra
       que serve a perna, e se entrei no vermelho do atraso. */
    var chave = (parado ? 'p' : 'a') + '|' + aqui + '|' + falta +
      '|' + GameState.rotuloDaPerna() + '|' + (cor === PAL.vermelho ? 1 : 0);
    this.poeNoLetreiro(cor, txto, chave);
  },

  poeNoLetreiro: function (cor, txto, chave) {
    if (chave !== this.rotaChave) { this.rotaChave = chave; this.mostraRota(3400); }
    /* Parado é a hora de decidir descer: enquanto a porta está aberta
       o painel fica, e some sozinho quando o trem volta a andar. */
    if (this.estado === 'parado') this.mostraRota(500);
    this.rota.setCor(cor).setText(txto);
  },

  mostraRota: function (ms) {
    var ate = this.time.now + ms;
    if (ate > this.rotaAte) this.rotaAte = ate;
  },

  /* Sobe atrás do HUD, que tem depth maior e o engole. 96 é o painel
     de quatro linhas mais a folga da moldura — medido no letreiro
     cheio, que é o caso pior. Mexe no g.y e no t.y em vez de chamar
     setY porque setY redesenha a chapa inteira, e isto roda todo
     quadro durante a descida. */
  aplicaRota: function (dt) {
    var alvo = (this.time.now < this.rotaAte) ? 1 : 0;
    var passo = dt / 180;
    if (this.rotaVis < alvo) this.rotaVis = Math.min(alvo, this.rotaVis + passo);
    else if (this.rotaVis > alvo) this.rotaVis = Math.max(alvo, this.rotaVis - passo);
    var desloc = -Math.round((1 - this.rotaVis) * 96);
    this.rota.g.y = desloc;
    this.rota.t.y = this.rota.y + 5 + desloc;
    this.rota.g.alpha = this.rotaVis;
    this.rota.t.alpha = this.rotaVis;
  },

  /* Sentar é a única coisa que devolve descanso, e até aqui o banco
     livre era um retângulo azul idêntico ao banco ocupado — quem não
     sabia procurar, não sentava, e dormia em pé. Agora todo lugar vago
     acende verde e chama com uma seta, de qualquer canto do vagão; o
     que está ao alcance acende de vez, que é o convite pra apertar. */
  pintaLugares: function (g) {
    var perto = this.sentadoEm ? null : this.bancoLivrePerto();
    var pulso = 0.5 + 0.5 * Math.sin(this.time.now / 260);
    /* Com 96 lugares no trem, marcar todos era pintar oito telas que
       ninguém está vendo. Só o que está na janela da câmera. */
    var topo = this.cameras.main.scrollY - 60, base = topo + GH + 120;
    for (var i = 0; i < this.bancos.length; i++) {
      var b = this.bancos[i];
      if (b.y < topo || b.y > base) continue;
      if (b.npc) continue;
      var aqui = (b === perto);
      var a = aqui ? 0.95 : 0.3 + 0.25 * pulso;
      /* A preferencial é amarela, não verde: é a cor com que o metrô
         marca o lugar de quem precisa, e o jogo não devia prometer que
         ela é um banco livre como qualquer outro. */
      var cor = b.pref ? 0xf2c14e : 0x00e676;
      var w = b.w || 16, h = b.h || (LUGAR_ALT - 4);
      g.fillStyle(cor, aqui ? 0.24 : 0.08 + 0.06 * pulso);
      g.fillRect(b.x - w / 2, b.y, w, h);
      g.lineStyle(2, cor, a);
      g.strokeRect(b.x - w / 2 - 1, b.y - 1, w + 2, h + 2);
      // a seta nasce no corredor e aponta pro assento
      var lado = b.x < 160 ? 1 : -1, sx = b.x + lado * (w / 2 + 7), sy = b.y + h / 2;
      g.fillStyle(cor, a);
      g.fillTriangle(sx, sy - 5, sx, sy + 5, sx - lado * 7, sy);
    }
  },

  pintaUI: function () {
    var g = this.gUI; g.clear();
    var gm = this.gMundoUI; gm.clear();

    this.pintaLugares(gm);

    /* O quanto falta pra próxima estação era uma barra em HUD_H+25, ou
       seja, por baixo da placa de rota: aparecia como um risco vermelho
       cortando o texto. Desceu pro rodapé, rente à faixa de dica, onde
       tem a tela inteira pra si e não briga com nada. */
    if (this.estado === 'andando') {
      barra(g, 8, GH - 41, GW - 16, 6, this.t / this.duracao, GameState.linhaAtual().num, 0x15151f);
    }

    if (this.solavanco.fase === 'aviso') {
      var p = 1 - (this.solavanco.t / this.solavanco.dur);
      caixa(g, 68, 192, 184, 60, 0xe8362c);
      barra(g, 80, 232, 160, 10, p, 0xe8362c, 0x1e1e2a);
      this.centro.setY(200).setCor(Ctrl.act ? PAL.verde : PAL.vermelho);
      this.centro.setText(Ctrl.act ? 'SEGURANDO' : 'SEGURE!');
    } else if (this.centro.texto() === 'SEGURE!' || this.centro.texto() === 'SEGURANDO') {
      this.centro.setText('');
      this.centro.setCor(PAL.branco).setY(232);
    }

    if (this.disfarce) {
      caixa(g, 40, 192, 240, 92, 0xe8a33c);
      barra(g, 52, 256, 216, 14, this.disfarce.suspeita / 100, 0xe8362c, 0x1e1e2a);
    }

    if (this.batalha) this.pintaBatalha(g);
    if (this.encontro) this.pintaEncontro(g); else this.tagEncontro.setVisible(false);
  }
});
