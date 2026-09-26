/* global Phaser */
/* Catraca — tela de título, escolha e loja de personagens */

/* As duas abas de gênero, medidas juntas: 'MULHER' tem 6 letras a 12
   pixels, e a aba precisa caber a palavra com folga de dedo dos dois
   lados. */
/* ---------- a regra de cor do título ----------
   'Ainda tá muita coisa, muita cor. Talvez dá pra deixar mais
   monocromático. A cor é mais importante ali pra linha que começa. E o
   jogar.' Então: a tela é cinza e branco, e COR só em dois lugares, que
   são os dois que significam alguma coisa — a tarja da linha na placa da
   estação de casa (vermelha ou azul, é informação) e o ladrilho do JOGAR
   (verde, é a ação). O que era amarelo, laranja e verde virou cinza: cor
   em oito lugares não destaca nenhum. */
var TIT_CINZA = 0x8a8fa3;

/* ---------- o logo ----------
   'Esse vai ser o logo do CATRACA.' Na referência ele está em VCR OSD
   Mono, que não é a fonte do jogo e não vai virar fonte do jogo: logo é
   arte, não texto. As sete letras são desenhadas com barras, que é como
   a VCR é feita — haste de espessura única, terminação reta, sem curva.
   Desenhar em vez de escrever também resolve o tamanho: a fonte do jogo
   nesse corpo ficaria fina demais dentro da faixa colorida.

   A haste é um décimo da altura e a letra tem meia altura de largura,
   que é a proporção medida na referência (63 de altura, 37 de passo). */
var LOGO_TXT = 'CATRACA';

function letraDoLogo(g, ch, x, y, w, h, s) {
  var meio = Math.round((h - s) / 2);
  if (ch === 'C') {
    g.fillRect(x, y, s, h); g.fillRect(x, y, w, s); g.fillRect(x, y + h - s, w, s);
  } else if (ch === 'A') {
    g.fillRect(x, y, s, h); g.fillRect(x + w - s, y, s, h);
    g.fillRect(x, y, w, s); g.fillRect(x, y + meio, w, s);
  } else if (ch === 'T') {
    g.fillRect(x, y, w, s); g.fillRect(x + Math.round((w - s) / 2), y, s, h);
  } else if (ch === 'R') {
    g.fillRect(x, y, s, h); g.fillRect(x, y, w, s);
    g.fillRect(x + w - s, y, s, meio + s); g.fillRect(x, y + meio, w, s);
    // a perna do R: diagonal em arte de pixel é degrau, nunca linha torta
    var alt = h - meio - s, n = 4, k;
    for (k = 0; k < n; k++) {
      g.fillRect(x + s + Math.round(k * (w - s * 2) / n),
        y + meio + s + Math.round(k * alt / n), s + 1, Math.ceil(alt / n) + 1);
    }
  }
}

function desenhaLogo(g, cx, cy, h, cor) {
  var s = Math.max(2, Math.round(h * 0.1));       // a haste
  var w = Math.round(h * 0.5);                    // a letra
  var passo = w + s;
  var x0 = Math.round(cx - (LOGO_TXT.length * passo - s) / 2), y0 = Math.round(cy - h / 2);
  g.fillStyle(cor, 1);
  for (var i = 0; i < LOGO_TXT.length; i++) {
    letraDoLogo(g, LOGO_TXT.charAt(i), x0 + i * passo, y0, w, h, s);
  }
}

/* ---------- a seta em escada ----------
   Na referência as setas (do carrossel e do JOGAR) não são o caractere
   ► da fonte: são quatro barras de altura decrescente, que é o
   triângulo como arte de pixel o desenha. Em 16 pixels de largura o
   glifo da fonte fica com a ponta serrilhada; a escada não tem ponta
   pra serrilhar. As alturas são as da referência (1, 0,73, 0,45, 0,27). */
var ESCADA = [1, 0.727, 0.4545, 0.2727];
function setaEscada(g, cx, cy, larg, alt, dir, cor, alfa) {
  var bw = larg / ESCADA.length, i;
  g.fillStyle(cor, alfa === undefined ? 1 : alfa);
  for (i = 0; i < ESCADA.length; i++) {
    var h = Math.round(alt * ESCADA[i]);
    var x = dir > 0 ? cx - larg / 2 + i * bw : cx + larg / 2 - (i + 1) * bw;
    g.fillRect(Math.round(x), Math.round(cy - h / 2), Math.ceil(bw), h);
  }
}

/* Um botão só pro gênero, com o SÍMBOLO no lugar da palavra: duas abas
   com HOMEM e MULHER eram duas palavras grandes no meio da tela pra uma
   escolha de dois estados que não muda regra nenhuma, só a estética do
   boneco. Na planta nova ele é um quadrado de 42 na ponta direita da
   linha do nome, que é o que a referência desenhou: o nome ocupa a
   linha e o símbolo fecha ela. */
var GEN_ABA = { w: 42, h: 42 };

/* O símbolo é desenhado e não escrito: o CHARSET da fonte não tem as duas
   figuras, e caractere fora da lista vira buraco silencioso. Círculo com
   haste: cruz embaixo pro feminino, flecha pra cima e pra direita no
   masculino. O centro do CÍRCULO desce um pouco no feminino e sobe no
   masculino, senão o conjunto fica torto dentro do botão. */
function simboloGenero(g, cx, cy, gen, cor, k) {
  k = k || 1;                       // o botão cresceu de 26 pra 42 de altura
  var r = 5 * k, e = Math.max(2, Math.round(2 * k));
  g.lineStyle(e, cor, 1);
  if (gen === 'f') {
    g.strokeCircle(cx, cy - 3 * k, r);
    g.beginPath(); g.moveTo(cx, cy + 2 * k); g.lineTo(cx, cy + 10 * k); g.strokePath();
    g.beginPath(); g.moveTo(cx - 4 * k, cy + 6 * k); g.lineTo(cx + 4 * k, cy + 6 * k); g.strokePath();
  } else {
    g.strokeCircle(cx - 2 * k, cy + 3 * k, r);
    g.beginPath(); g.moveTo(cx + 2 * k, cy - 1 * k); g.lineTo(cx + 8 * k, cy - 7 * k); g.strokePath();
    g.beginPath(); g.moveTo(cx + 3 * k, cy - 7 * k); g.lineTo(cx + 8 * k, cy - 7 * k);
    g.lineTo(cx + 8 * k, cy - 2 * k); g.strokePath();
  }
}

/* ---------- a tela, de cima pra baixo ----------
   Era uma pilha: seis cartas, nome, gênero, poder, descrição, uma ficha
   de cinco linhas e quatro ladrilhos, tudo em cima da plataforma
   ('muito poluído'). Agora é um carrossel: UM personagem grande no
   meio, ◄ e ► dos lados e seis pontinhos dizendo quantos são. A ficha
   virou dois pares lado a lado, e os ladrilhos, um JOGAR largo com as
   três ferramentas pequenas embaixo. Cada número abaixo é o y de uma
   faixa; a tinta do tam 8 começa em y+5 e tem 14px, a do tam 16 vai
   de y+8 a y+44. */
/* ---------- a planta, refeita do zero (20/09) ----------
   'Muito espaçamento desnecessário, letras pequenas, momentos
   desnecessários. Não tá bem diagramado.' Estava certo: eram sete blocos
   com a MESMA folga entre todos, e folga igual não agrupa nada — a tela
   virava uma pilha de coisas soltas com um boneco pequeno no meio.

   A planta nova tem três decisões:

   1. UMA COLUNA, UMA MARGEM. Tudo que é informação começa em x=16 e
      termina em x=304. O que era centralizado (nome, verbo, nota) ficava
      com a borda esquerda irregular, e borda irregular lê como bagunça.
   2. BLOCO COLADO, VÃO ENTRE BLOCOS. Dentro de um assunto as linhas
      encostam (6 a 10px); entre assuntos o vão é 16. Antes era ~24 em
      toda parte.
   3. O BONECO É O HERÓI. Ele foi de 96 pra 120px de altura e ganhou o
      espaço que sobrou do resto. Quem escolhe personagem está olhando
      pra ele, não pra ficha.

   E o que era do topo desceu: recorde e moedas são o que você trouxe da
   última vez, não o que decide agora, então viraram rodapé. O topo ficou
   só com o logo e a placa da estação de casa. */
/* ---------- a planta desenhada pelo Renan (20/09) ----------
   Ele desenhou a tela no Figma, em 495x874, e mandou o CSS. A escala
   pro jogo é 0,6465 e a altura cai em 565: sobram 11 pixels, e eles
   fazem a margem de baixo virar 44, que é exatamente a margem lateral
   dele. Ou seja, a tela é UMA COLUNA DE 232 COM 44 DE MARGEM DOS QUATRO
   LADOS, e só a faixa do topo sangra de ponta a ponta. A margem era 16;
   triplicar o ar é a mudança estrutural do desenho, não um detalhe.

   Os números abaixo são a conversão direta da referência. Onde ela dá
   porcentagem eu converti pelo mesmo 0,6465.

   A faixa do topo é a LINHA DA CASA do personagem ('muda de acordo com
   a estação'): vermelha em Itaquera, azul em Jabaquara, e a mesma cor
   volta na tarja da placa da estação lá embaixo. É o que dá identidade
   ao personagem sem escrever nada. */
var TIT = {
  margem: 44, col: GW - 88,   // 232 de coluna útil
  faixaH: 72,                 // a faixa da linha, sangrando
  riscoY: 62, riscoH: 3,      // o risco branco dentro dela, como na placa do metrô
  logoCy: 32, logoH: 40,      // o logo, centrado na faixa acima do risco
  nomeCy: 102,                // o nome e o botão do gênero dividem a linha
  caixaY: 138, caixaH: 151,   // a caixa do boneco
  pes: 277, escala: 2.5,      // 48 x 2,5 = 120 de boneco dentro dos 151 da caixa
  setaCy: 214,                // as setas no meio da caixa, nas bordas da tela
  setaW: 16, setaH: 27, setaX: 12,
  placaY: 294, placaH: 30, tarjaH: 4,
  chipY: 335, chipY2: 382, chipW: 91, chipH: 42,
  dirX: 148, dirW: 127,       // a coluna da direita: poder, descrição e medidores
  poderY: 334,
  barraY: 400,
  jogarY: 434, jogarH: 52,
  botY: 493, botH: 40,
  rodapeY: 548                // recorde e pontos, na folga que sobrou embaixo
};

// as quatro camisas do torcedor, na largura da coluna da direita
var CAMISA = { w: 28, h: 20, vao: 5 };

/* ---------- a régua de texto ----------
   O `txt` do core não recebe corpo, recebe ESCALA: a célula da fonte tem
   6 pixels de largura, então cada letra ocupa 6 x escala. A régua crua
   é 6, 12, 18, 24, e só escala inteira dá pixel quadrado.

   A referência pede 9, 10, 15, 18 e 21 pixels por letra. Onde dava eu
   subi ou desci pro degrau inteiro mais perto; onde não dava, ficou a
   escala 1,5 (9 por letra), que é o caso do nome da estação: em 12 a
   'CORINTHIANS-ITAQUERA' pede 240 e a coluna tem 232, e em 6 a placa
   fica com o nome perdido no meio dela. Nove é o número da referência e
   é o único que cabe. */
var TXT_ESTACAO = 1.5, TXT_NOME = 3, TXT_FICHA = 1.5;
// a tinta do glifo mora nas fileiras 2 a 8 da célula de 10: o meio dela cai em 5,5
function poeTintaNoMeio(t, cy, k) { t.setY(Math.round(cy - 5.5 * k)); }

/* O JOGAR é o ladrilho largo, sozinho, porque é o que se aperta; embaixo
   dele uma fileira de três: EXPLORAR, a ajuda e o som.

   O TREINO saiu daqui. Ele era o quarto botão de uma fileira de quatro,
   e a fileira da referência tem três. Treinar minijogo não é irmão de
   começar o mês: é uma coisa que se faz andando à toa, então virou uma
   porta dentro do EXPLORAR. */
var BOT = {
  xGr: TIT.margem, yGr: TIT.jogarY, gr: TIT.col, hGr: TIT.jogarH,
  y: TIT.botY, h: TIT.botH,
  xExp: TIT.margem, exp: 117,
  xTut: 169, tut: 49,
  xSom: 226, som: 49
};

var TitleScene = new Phaser.Class({
  Extends: Phaser.Scene,
  initialize: function TitleScene() { Phaser.Scene.call(this, { key: 'Title' }); },

  create: function () {
    Ctrl.liga(this);
    HUD_VISIVEL = false; CONTROLES_VISIVEIS = true;
    this.sel = 0;
    this.saindo = false;
    this.ordem = ['estudante', 'clt', 'senhor', 'ambulante', 'torcedor', 'cadeirante', 'gestante', 'turista'];
    // o gênero de cada um, como ficou gravado da última partida
    this.gen = {};
    for (var q = 0; q < this.ordem.length; q++) this.gen[this.ordem[q]] = leGenero(this.ordem[q]);

    var eu = this, i;

    /* ---------- o fundo é o jogo ----------
       Do Crossy Road: o menu acontece dentro do mundo. O fundo é a
       plataforma de verdade, a mesma arte da estação, e o véu por cima
       ficou mais fechado (0,88): atrás de um carrossel limpo, trilho e
       piso aparecendo demais eram mais uma coisa pra ler. */
    /* A plataforma de verdade servia de papel de parede, com um véu de
       0,94 por cima. Na referência o fundo é chapado, e é melhor: o véu
       já dizia que o cenário não devia ser lido, e cenário que não deve
       ser lido é cenário que não precisa estar ali. Perda consciente. */
    var g = this.add.graphics();
    g.fillStyle(0x09090e, 1).fillRect(0, 0, GW, GH);

    /* A faixa do topo e o logo são repintados em `atualiza`, porque a
       cor deles é a da linha de quem está escolhido. */
    this.gTopo = this.add.graphics().setDepth(1);

    /* ---------- a régua de tamanhos ----------
       'Muitos textos com tamanhos diferentes nesse menu inicial.' Eram só
       três tamanhos, e esse era o problema: quase tudo estava no MESMO
       (o 8 cheio), então nada se lia primeiro. A régua agora tem papel:

         16 cheio ... identidade (CATRACA, o nome do personagem)
         8 cheio .... o que se APERTA e os valores da ficha
         8 meio ..... rótulo, nota e placar

       O recorde e as moedas desceram pro meio: não decidem nada na hora
       de escolher quem jogar, e no cheio disputavam com o JOGAR. */
    this.tTopo = txt(this, TIT.margem, TIT.rodapeY, '', PAL.cinzaEsc, 8).setScale(ESCALA_TEXTO / 2);
    texturasDoChao(this);
    this.add.image(GW - TIT.margem - 34, TIT.rodapeY + 5, 'caido_moeda').setDepth(1).setScale(0.8);
    this.tPontos = txt(this, GW - TIT.margem, TIT.rodapeY, '', PAL.cinza, 8)
      .setOrigin(1, 0).setScale(ESCALA_TEXTO / 2);

    /* ---------- o palco ----------
       Um boneco só, grande. A luz no chão é o que o põe num lugar; o
       travado vira silhueta com o cadeado e o preço, que é o que ele é
       até ser comprado. */
    this.gPalco = this.add.graphics().setDepth(1);
    this.heroi = this.add.sprite(GW / 2, TIT.pes, spriteChar(this.ordem[0], this.gen[this.ordem[0]]), 0)
      .setOrigin(0.5, 1).setScale(TIT.escala).setDepth(2);
    this.gCadeado = this.add.graphics().setDepth(3);
    this.tPreco = txtC(this, GW / 2, TIT.pes - 44, '', PAL.amarelo, 8).setDepth(4);
    // tocar no boneco travado é pedir pra comprar
    this.add.zone(GW / 2 - 50, TIT.pes - 110, 100, 116).setOrigin(0, 0).setInteractive()
      .on('pointerdown', function () { eu.tentaComprar(); });

    /* As setas moraram na caixa do boneco e agora moram FORA dela, na
       borda da tela, que é onde a referência as pôs: dentro da caixa
       elas competiam com o boneco, que é o que se olha. A zona de toque
       continua larga, porque o polegar não mira em 16 pixels. */
    this.gSetas = this.add.graphics().setDepth(3);
    this.add.zone(0, TIT.caixaY, TIT.margem, TIT.caixaH).setOrigin(0, 0).setInteractive()
      .on('pointerdown', function () { eu.passa(-1); eu.ignoraAct = true; });
    this.add.zone(GW - TIT.margem, TIT.caixaY, TIT.margem, TIT.caixaH).setOrigin(0, 0).setInteractive()
      .on('pointerdown', function () { eu.passa(1); eu.ignoraAct = true; });

    /* ---------- onde ele mora ----------
       'Importante mostrar em que estação começa o jogo do personagem.'
       Uma placa de metrô em cima do boneco, na cor da linha da casa
       dele: é a primeira coisa que se lê antes de escolher.

       'Poluído ainda': a placa vinha com um rótulo COMEÇA EM em cima
       dela, e o rótulo caía na mesma linha do RECORDE. Placa de metrô
       não precisa de legenda dizendo que é uma estação: quem lê a chapa
       preta com a tarja colorida já sabe. Ficou a chapa, e ela desceu
       pra ter ar entre ela e a linha do recorde. */
    /* A placa desceu pra DEBAIXO do boneco e ficou da largura da coluna
       inteira, com a tarja da linha na base: na referência ela é o
       rodapé da caixa do personagem, não um chapéu em cima dele. */
    this.gCasa = this.add.graphics().setDepth(1);
    this.tCasa = txtC(this, GW / 2, 0, '', PAL.branco, 8).setScale(TXT_ESTACAO).setDepth(2);
    // a tinta no meio da parte da chapa que fica acima da tarja da linha
    poeTintaNoMeio(this.tCasa, TIT.placaY + (TIT.placaH - TIT.tarjaH) / 2, TXT_ESTACAO);
    // o nome encosta na margem da esquerda: o botão do gênero fecha a linha
    this.tNome = txt(this, TIT.margem, 0, '', PAL.branco, 8).setScale(TXT_NOME);

    /* ---------- o gênero, num botão que alterna ----------
       No teclado continua sendo a tecla G. A gestante mostra o dela
       apagado e sem toque: o verbo dela é estar grávida. */
    this.gCards = this.add.graphics().setDepth(1);
    this.genY = TIT.nomeCy - GEN_ABA.h / 2;
    this.zonaGen = this.add.zone(GW - TIT.margem - GEN_ABA.w, this.genY, GEN_ABA.w, GEN_ABA.h)
      .setOrigin(0, 0).setInteractive();
    this.zonaGen.on('pointerdown', function () {
      var kk = eu.ordem[eu.sel];
      if (generosDe(kk).length > 1) eu.poeGenero(outroGenero(kk, eu.gen[kk]));
    });

    /* ---------- o time ----------
       Só pro torcedor. Eram quatro botões com o apelido escrito, e o
       apelido não cabe mais: a coluna da direita tem 127 pixels e
       'TRICOLOR' sozinho pede 48. Ficaram quatro camisas, que é o que a
       fileira sempre disse de verdade, e o apelido de quem está
       escolhido aparece na linha do poder, em cima delas. Tocar troca a
       camisa na hora; no teclado a tecla é T. */
    this.gTimes = this.add.graphics().setDepth(1);
    this.zonaTimes = [];
    for (i = 0; i < ORDEM_TIMES.length; i++) {
      var zt = this.add.zone(this.xDoTime(i), TIT.poderY + 20, CAMISA.w, CAMISA.h).setOrigin(0, 0);
      (function (t) { zt.on('pointerdown', function () { eu.poeTime(t); }); })(ORDEM_TIMES[i]);
      this.zonaTimes.push(zt);
    }
    this.teclaT = this.input.keyboard.addKey('T');

    /* ---------- a coluna da direita ----------
       O verbo que só este personagem tem, e como ele funciona. Na
       referência isto é um bloco de duas linhas ao lado das fichas, e
       não uma faixa de tela inteira: com 127 de largura o verbo quebra
       sozinho, e por isso ele tem `setMaxWidth` em vez de uma linha só.
       A explicação continua em meia escala, porque duas linhas do mesmo
       corpo brigam em vez de se completarem. */
    this.tPoder = txt(this, TIT.dirX, TIT.poderY, '', PAL.branco, 8).setScale(TXT_ESTACAO);
    this.tPoder.setMaxWidth(Math.floor(TIT.dirW / TXT_ESTACAO));
    this.tDesc = txt(this, TIT.dirX, TIT.poderY + 20, '', PAL.cinza, 8).setScale(ESCALA_TEXTO / 2);
    this.tDesc.setMaxWidth(TIT.dirW);

    /* ---------- a ficha ----------
       Dois pares lado a lado em vez de cinco linhas: em cima o que é
       palavra (grana e passo), embaixo o que é medidor (carisma e
       descanso), como barra nas cores do HUD. O rótulo é pequeno e
       cinza; o valor é o que se lê. A tarifa saiu: ela é a mesma pra
       quase todo mundo, e quem não paga tem isso escrito no próprio
       poder. */
    this.gFicha = this.add.graphics().setDepth(1);
    this.fichaVal = [];
    var rot = ['GRANA', 'PASSO'], chipY = [TIT.chipY, TIT.chipY2];
    for (var lin = 0; lin < 2; lin++) {
      // #515151 na referência dá 2,4:1 em cima da chapa; clareei pra ler
      txt(this, TIT.margem + 9, chipY[lin] + 3, rot[lin], '#7a7e92', 8)
        .setScale(TXT_FICHA).setDepth(2);
      this.fichaVal.push(txt(this, TIT.margem + 9, chipY[lin] + 19, '', PAL.branco, 8)
        .setScale(TXT_FICHA).setDepth(2));
    }

    /* ---------- os ladrilhos ---------- */
    this.gBot = this.add.graphics().setDepth(1);
    // o rótulo do JOGAR fica à direita da seta em escada, e o par é que é centrado
    this.tStart = txtC(this, GW / 2 + 14, 0, '', PAL.branco, 8).setDepth(3);
    this.tTut = txtC(this, BOT.xTut + BOT.tut / 2, 0, '?', PAL.branco, 8).setScale(3).setDepth(3);
    poeTintaNoMeio(this.tTut, BOT.y + BOT.h / 2, 3);
    this.tSom = txtC(this, BOT.xSom + BOT.som / 2, 0, '', PAL.branco, 8).setDepth(3);
    this.tExp = txtC(this, BOT.xExp + BOT.exp / 2, 0, 'EXPLORAR', PAL.branco, 8).setDepth(3);
    poeTintaNoMeio(this.tExp, BOT.y + BOT.h / 2, 2);
    this.zonaExp = this.add.zone(BOT.xExp, BOT.y, BOT.exp, BOT.h).setOrigin(0, 0).setInteractive();
    this.zonaExp.on('pointerdown', function () { eu.ignoraAct = true; eu.abreExplorar(); });

    this.zonaTut = this.add.zone(BOT.xTut, BOT.y, BOT.tut, BOT.h).setOrigin(0, 0).setInteractive();
    this.zonaTut.on('pointerdown', function () {
      try { localStorage.removeItem('metrosp_tutorial'); } catch (e) { }
      eu.flashLoja('TUTORIAL LIGADO');
      sfx('ok');
      /* Sem isto o mesmo toque religava o tutorial E começava a partida:
         quem só queria saber o que aquilo fazia já estava na catraca. */
      eu.ignoraAct = true;
      eu.atualiza();
    });
    this.zonaSom = this.add.zone(BOT.xSom, BOT.y, BOT.som, BOT.h).setOrigin(0, 0).setInteractive();
    this.zonaSom.on('pointerdown', function () {
      var liga = !SOM_LIGADO;
      ligaSom(liga); ligaMusica(liga);
      if (liga) sfx('ok');
      eu.ignoraAct = true;
      eu.atualiza();
    });
    // o ladrilho grande é jogar, e no travado é comprar: o mesmo comando do teclado
    this.zonaStart = this.add.zone(BOT.xGr, BOT.yGr, BOT.gr, BOT.hGr).setOrigin(0, 0).setInteractive();
    this.zonaStart.on('pointerdown', function () { eu.comeca(); });

    // no teclado, G troca o gênero — as setas já são do carrossel
    this.teclaG = this.input.keyboard.addKey('G');

    this.atualiza();
    this.tempoAnim = 0;
  },

  /* Escolher troca a folha na hora: a pessoa tem que VER quem vai
     jogar, não ler o nome de quem vai jogar. */
  poeGenero: function (g) {
    var k = this.ordem[this.sel];
    if (generosDe(k).indexOf(g) < 0) { sfx('nao'); this.ignoraAct = true; return; }
    if (this.gen[k] === g) { this.ignoraAct = true; return; }
    this.gen[k] = g;
    gravaGenero(k, g);
    sfx('catraca');
    this.ignoraAct = true;
    this.atualiza();
  },

  // as quatro camisas: 28 de largura e 5 de vão, 127 no total, que é a coluna
  xDoTime: function (i) { return TIT.dirX + i * (CAMISA.w + CAMISA.vao); },

  poeTime: function (t) {
    this.ignoraAct = true;
    if (leTime() === t) return;
    gravaTime(t);
    sfx('catraca');
    this.atualiza();
  },

  // a tecla G alterna, que é o que uma tecla só sabe fazer
  trocaGenero: function () {
    var k = this.ordem[this.sel];
    if (generosDe(k).length < 2) { sfx('nao'); return; }
    this.poeGenero(outroGenero(k, this.gen[k]));
  },

  /* Passar pro lado: o novo entra deslizando de onde a seta aponta, que
     é o que faz o carrossel parecer uma fila de gente e não uma troca
     de figurinha. */
  passa: function (d) {
    var n = this.ordem.length;
    this.escolhe((this.sel + d + n) % n, d);
  },

  escolhe: function (i, d) {
    if (i === this.sel) return;
    this.sel = i;
    sfx('catraca');
    this.atualiza();
    var sp = this.heroi;
    this.tweens.killTweensOf(sp);
    sp.x = GW / 2 + (d || 1) * 36; sp.setAlpha(0);
    this.tweens.add({ targets: sp, x: GW / 2, alpha: 1, duration: 160, ease: 'Cubic.easeOut' });
  },

  /* Comprar é o mesmo comando de começar, no travado: quem escolhe um
     cadeado está pedindo pra abrir. */
  tentaComprar: function () {
    var k = this.ordem[this.sel];
    if (destravado(k)) return false;
    var r = compraPersonagem(k);
    if (r === 'ok') { sfx('vitoria'); this.flashLoja('DESTRAVOU!'); }
    else if (r === 'trancado') { sfx('nao'); this.flashLoja('VOCÊ AINDA NÃO CONHECE'); }
    else { sfx('nao'); this.flashLoja('AINDA NÃO'); }
    this.ignoraAct = true;
    this.atualiza();
    return true;
  },

  flashLoja: function (m) {
    this.aviso = m;
    this.avisoT = 1400;
  },

  atualiza: function () {
    var k = this.ordem[this.sel], c = CHARS[k], aberto = destravado(k), i;
    var gsel = this.gen[k];

    /* ---------- a faixa e o logo ----------
       A cor é a da linha da casa de quem está escolhido, e o risco
       branco dentro dela é o da placa do metrô. Personagem travado
       apaga a faixa: a cor é dele, e ele ainda não é seu. */
    var casaK = casaDe(k), lk = LINHAS[linhaDaEstacao(casaK)];
    var gt2 = this.gTopo; gt2.clear();
    gt2.fillStyle(aberto ? lk.num : 0x24242e, 1).fillRect(0, 0, GW, TIT.faixaH);
    gt2.fillStyle(0xffffff, 1).fillRect(0, TIT.riscoY, GW, TIT.riscoH);
    desenhaLogo(gt2, GW / 2, TIT.logoCy, TIT.logoH, 0xffffff);

    // o palco: a caixa do boneco e a sombra dele no chão dela
    var gp = this.gPalco; gp.clear();
    /* A caixa é chapa lisa, como na referência. Tinha um halo de luz
       atrás do boneco, e numa caixa que já é mais clara que o fundo ele
       virava uma mancha redonda no meio do retângulo. */
    gp.fillStyle(0x151519, 1).fillRect(TIT.margem, TIT.caixaY, TIT.col, TIT.caixaH);
    gp.fillStyle(0x000000, 0.45).fillEllipse(GW / 2, TIT.pes - 2, 70, 14);

    // as setas, fora da caixa, na borda da tela
    var gse = this.gSetas; gse.clear();
    setaEscada(gse, TIT.setaX + TIT.setaW / 2, TIT.setaCy, TIT.setaW, TIT.setaH, -1, 0xd2d0de, this.alfaSeta || 0.8);
    setaEscada(gse, GW - TIT.setaX - TIT.setaW / 2, TIT.setaCy, TIT.setaW, TIT.setaH, 1, 0xd2d0de, this.alfaSeta || 0.8);
    this.heroi.setTexture(spriteChar(k, gsel), 0);
    if (aberto) this.heroi.clearTint(); else this.heroi.setTint(0x16161f);
    var gc = this.gCadeado; gc.clear();
    /* Quem a história ainda não apresentou não tem preço: tem '???'. Só
       depois de você cruzar com a pessoa (ou fechar o mês de quem a
       apresenta) ela entra na loja (CAMPANHA.md). */
    this.tPreco.setText(aberto ? '' : (apresentado(k) ? String(precoDe(k)) : '???'));
    if (!aberto) {
      var lx = GW / 2, ly = TIT.pes - 70;
      gc.lineStyle(4, 0xf2c14e, 1).strokeRoundedRect(lx - 8, ly - 14, 16, 18, 7);
      gc.fillStyle(0xf2c14e, 1).fillRoundedRect(lx - 13, ly - 2, 26, 20, 4);
      gc.fillStyle(0x16161f, 1).fillRect(lx - 1, ly + 4, 3, 8);
      this.tPreco.setPosition(GW / 2, ly + 24);
    }

    /* Os pontinhos que contavam quantos personagens existem saíram: as
       setas já dizem que tem mais gente, e oito bolinhas no meio da tela
       eram oito coisas a mais pra ler numa tela que o desenho novo
       justamente esvaziou. */

    /* O nome divide a linha com o botão do gênero, então ele tem uma
       largura fixa: 'CADEIRANTE' são 10 letras, e em corpo 18 dá 180
       num vão de 181. Cabe raspando, e nome maior encolhe sozinho em
       vez de passar por baixo do botão. */
    var nome = nomeDoChar(k, gsel), vao = GW - TIT.margem * 2 - GEN_ABA.w - 8;
    var kn = Math.max(1, Math.min(TXT_NOME, Math.floor(vao / (nome.length * 6))));
    this.tNome.setScale(kn);
    poeTintaNoMeio(this.tNome, TIT.nomeCy, kn);
    this.tNome.setText(nome).setColor(aberto ? PAL.branco : PAL.cinzaEsc);

    /* O botão do gênero: a chapa, o símbolo de quem está escolhido e,
       quando há os dois, duas setinhas dizendo que ele alterna. */
    var g = this.gCards; g.clear();
    var gs = generosDe(k), dois = gs.length > 1;
    var zx = GW - TIT.margem - GEN_ABA.w, zcy = this.genY + GEN_ABA.h / 2;
    if (dois) this.zonaGen.setInteractive(); else this.zonaGen.disableInteractive();
    // chapa cinza e símbolo branco, como na referência: sem borda, sem setinha
    g.fillStyle(aberto ? 0x3e3e3e : 0x24242a, 1)
      .fillRoundedRect(zx, this.genY, GEN_ABA.w, GEN_ABA.h, 4);
    simboloGenero(g, zx + GEN_ABA.w / 2, zcy, gsel, aberto ? 0xffffff : 0x5a5f74, 1.5);

    /* ---------- o verbo, e o que vem debaixo dele ----------
       Dois personagens dividem o mesmo verbo e não jogam igual: quando o
       personagem tem rótulo próprio, é o dele que aparece.

       Na coluna estreita o verbo quebra em duas linhas quando é comprido
       ('SENTAR NO CHÃO' não cabe em 14 letras), então o que vem embaixo
       dele não pode ter altura cravada: sai da altura real do texto. */
    var temTime = !!c.times, meuTime = leTime();
    var pd = PODERES[c.poder] || {};
    var rotulo = c.poderRotulo || pd.nome;
    // no torcedor a linha do verbo vira o apelido do time, que é o que a camisa não escreve
    if (temTime) rotulo = TIMES[meuTime].nome;
    this.tPoder.setText(rotulo ? '► ' + rotulo : '').setColor(aberto ? PAL.branco : PAL.cinzaEsc);
    var abaixo = TIT.poderY + this.tPoder.height + 4;

    /* O torcedor troca a descrição pela fileira de camisas: elas dizem o
       que a descrição dele diria. Eram quatro botões com o apelido
       escrito, e o apelido não cabe nos 127 da coluna. */
    this.tDesc.setVisible(!temTime);
    this.tDesc.setText(c.poderComo || pd.como || c.desc).setPosition(TIT.dirX, abaixo);

    var gt = this.gTimes; gt.clear();
    for (i = 0; i < ORDEM_TIMES.length; i++) {
      var T = TIMES[ORDEM_TIMES[i]], tx = this.xDoTime(i), aqui2 = (ORDEM_TIMES[i] === meuTime);
      if (temTime) this.zonaTimes[i].setInteractive(); else this.zonaTimes[i].disableInteractive();
      this.zonaTimes[i].setPosition(tx, abaixo);
      if (!temTime) continue;
      gt.fillStyle(T.cor, 1).fillRect(tx, abaixo, CAMISA.w, CAMISA.h);
      gt.fillStyle(T.cor2, 1).fillRect(tx, abaixo + CAMISA.h - 4, CAMISA.w, 4);   // a segunda cor
      gt.lineStyle(2, aqui2 ? 0xf2c14e : 0x2a2a3a, 1)
        .strokeRect(tx + 1, abaixo + 1, CAMISA.w - 2, CAMISA.h - 2);
    }

    /* ---------- as duas fichas e os dois medidores ----------
       Na referência as fichas são duas chapas empilhadas na coluna da
       esquerda, e os medidores ficam na coluna da direita, embaixo da
       descrição. Não é enfeite: grana e passo são NÚMERO (leitura), e
       carisma e descanso são QUANTIDADE (comparação), e cada tipo pede
       uma forma. Antes os quatro estavam na mesma chapa. */
    this.fichaVal[0].setText('R$ ' + c.dinheiro.toFixed(2).replace('.', ','));
    this.fichaVal[1].setText(nomeDoPasso(c.velocidade));
    var gf = this.gFicha; gf.clear();
    gf.fillStyle(0x14141c, 1).fillRect(TIT.margem, TIT.chipY, TIT.chipW, TIT.chipH);
    gf.fillStyle(0x14141c, 1).fillRect(TIT.margem, TIT.chipY2, TIT.chipW, TIT.chipH);
    // o ícone de cada medidor, nas cores do HUD, e a barra no resto da coluna
    var bx = TIT.dirX + 16, bw = TIT.dirW - 16;
    gf.fillStyle(0xe8a33c, 1).fillRect(TIT.dirX, TIT.barraY + 1, 10, 4).fillRect(TIT.dirX + 3, TIT.barraY - 2, 4, 10);
    barra(gf, bx, TIT.barraY, bw, 6, c.carisma / 100, 0xe8a33c);
    gf.fillStyle(0x00e676, 1).fillCircle(TIT.dirX + 5, TIT.barraY + 17, 5);
    gf.fillStyle(0x09090e, 1).fillCircle(TIT.dirX + 8, TIT.barraY + 15, 5);
    barra(gf, bx, TIT.barraY + 14, bw, 6, c.descanso / c.descansoMax, 0x00e676);

    /* A placa da estação de casa é o rodapé da caixa do boneco: chapa da
       largura da coluna, nome centrado e a tarja da linha na base, a
       mesma cor da faixa lá em cima. */
    var nomeCasa = placaDe(casaK);
    this.tCasa.setText(nomeCasa).setColor(aberto ? PAL.branco : PAL.cinzaEsc);
    var gc = this.gCasa; gc.clear();
    gc.fillStyle(aberto ? 0x14141c : 0x101018, 1).fillRect(TIT.margem, TIT.placaY, TIT.col, TIT.placaH);
    gc.fillStyle(aberto ? lk.num : 0x2a2a3a, 1)
      .fillRect(TIT.margem, TIT.placaY + TIT.placaH - TIT.tarjaH, TIT.col, TIT.tarjaH);

    this.tTopo.setText('RECORDE ' + GameState.recorde());
    this.tPontos.setText(String(lePontos()));
    this.pintaBotoes(aberto, k);
  },

  /* ---------- os ladrilhos ----------
     Verde é jogar, amarelo é comprar, vermelho é o preço que você ainda
     não tem: a cor diz o que o toque vai fazer antes da palavra. */
  pintaBotoes: function (aberto, k) {
    var g = this.gBot; g.clear();
    var falta = aberto ? 0 : (precoDe(k) - lePontos());
    var rotulo, corpo, borda, cor, seta = false;
    if (this.aviso) {
      rotulo = this.aviso; corpo = 0x3a3410; borda = 0xf2c14e; cor = PAL.amarelo;
    } else if (aberto) {
      rotulo = 'JOGAR'; corpo = 0x14432c; borda = 0x00e676; cor = PAL.branco; seta = true;
    } else if (falta > 0) {
      rotulo = 'FALTAM ' + falta + ' PONTOS'; corpo = 0x3a1418; borda = 0xe8362c; cor = PAL.vermelho;
    } else {
      rotulo = 'ABRIR POR ' + precoDe(k); corpo = 0x3a3410; borda = 0xf2c14e; cor = PAL.amarelo;
    }
    /* O botão grande não é mais um ladrilho com aba: a referência o
       desenhou como chapa lisa com borda de 2, e é isso que o separa
       dos três pequenos embaixo, que continuam ladrilho. */
    g.fillStyle(corpo, 1).fillRect(BOT.xGr, BOT.yGr, BOT.gr, BOT.hGr);
    g.lineStyle(2, borda, 1).strokeRect(BOT.xGr + 1, BOT.yGr + 1, BOT.gr - 2, BOT.hGr - 2);
    /* O ► do JOGAR é a escada, e não o caractere: em 25 pixels de
       largura o glifo da fonte fica com a ponta serrilhada. Ele e a
       palavra são um par centrado, não duas coisas centradas. */
    var kb = Math.max(1, Math.min(4, Math.floor((BOT.gr - 12) / (rotulo.length * 6))));
    this.tStart.setScale(kb);
    /* A seta e a palavra são UM par centrado, e não duas coisas cada uma
       centrada no seu jeito: com o meio da tela dividindo os dois, o ►
       encostava no J. A conta é a largura do par. */
    var lp = rotulo.length * 6 * kb, cy = BOT.yGr + BOT.hGr / 2;
    var x0 = Math.round((GW - (seta ? 25 + 10 + lp : lp)) / 2);
    this.tStart.setX(seta ? x0 + 35 + lp / 2 : GW / 2);
    poeTintaNoMeio(this.tStart, cy, kb);
    if (seta) setaEscada(g, x0 + 12, cy, 25, 32, 1, 0x00e676);
    this.tStart.setText(rotulo).setColor(cor);
    // só o de jogar pisca: piscar é o convite, e convite só tem um
    this.tStart.setAlpha(1);
    if (this.piscaStart) { this.piscaStart.stop(); this.piscaStart = null; }
    if (aberto && !this.aviso) {
      this.piscaStart = this.tweens.add({ targets: this.tStart, alpha: 0.45,
        duration: 700, yoyo: true, repeat: -1 });
    }

    /* As três ferramentas, em azul apagado: ajudam, não são o jogo. As
       cores são as da referência, e por sorte são as que o `ladrilho`
       já usava. */
    ladrilho(g, BOT.xExp, BOT.y, BOT.exp, BOT.h, 0x161c2c, 0x222c44, 0x2e3c60);
    ladrilho(g, BOT.xTut, BOT.y, BOT.tut, BOT.h, 0x161c2c, 0x222c44, 0x2e3c60);
    ladrilho(g, BOT.xSom, BOT.y, BOT.som, BOT.h, SOM_LIGADO ? 0x161c2c : 0x111118,
      SOM_LIGADO ? 0x222c44 : 0x1a1a24, SOM_LIGADO ? 0x2e3c60 : 0x26263a);
    /* O som virou desenho de alto-falante, como na referência: a palavra
       SOM num botão de 49 sobrava pouco, e o ícone diz ligado e
       desligado com a mesma forma mais o risco. */
    this.tSom.setText('');
    var sx = BOT.xSom + BOT.som / 2, sy = BOT.y + BOT.h / 2;
    var cs = SOM_LIGADO ? 0xffffff : 0x6a6e80;
    g.fillStyle(cs, 1).fillRect(sx - 9, sy - 4, 4, 8);
    g.fillTriangle(sx - 6, sy, sx + 1, sy - 9, sx + 1, sy + 9);
    if (SOM_LIGADO) {
      // as duas ondas, em degrau, porque arco de um pixel some
      g.fillRect(sx + 4, sy - 4, 2, 8).fillRect(sx + 8, sy - 7, 2, 14);
    } else {
      g.lineStyle(2, cs, 1);
      g.beginPath(); g.moveTo(sx + 4, sy - 5); g.lineTo(sx + 11, sy + 5); g.strokePath();
      g.beginPath(); g.moveTo(sx + 11, sy - 5); g.lineTo(sx + 4, sy + 5); g.strokePath();
    }
  },

  /* ---------- a porta do treino ----------
     O TREINO era o quarto botão da fileira de baixo, e a fileira nova
     tem três. Ele não é irmão de 'começar o mês': é o que se faz com
     tempo livre, e tempo livre neste jogo se chama EXPLORAR. Então o
     EXPLORAR pergunta, em vez de ter um botão a mais na tela.

     Travado não entra no treino: seria o jeito de jogar de graça com
     quem ainda não foi comprado. Aí vai o estudante, que é de todo mundo. */
  abreExplorar: function () {
    if (this.saindo) return;
    var eu = this;
    fala(this, 'Tempo livre.\n\nO que você quer fazer?', [
      { label: 'Andar pela estação', cb: function () { eu.comeca(true); } },
      { label: 'Treinar um minijogo', cb: function () { eu.vaiPraOTreino(); } }
    ]);
  },

  vaiPraOTreino: function () {
    var kt = this.ordem[this.sel];
    if (!destravado(kt)) kt = 'estudante';
    TREINO_QUEM.k = kt;
    TREINO_QUEM.g = this.gen[kt];
    audioOn(); sfx('ok');
    this.scene.start('Treino', {});
  },

  /* Começar é o mesmo comando em todo lugar: no ladrilho, na tecla e no
     toque fora. No travado ele compra. */
  comeca: function (explorar) {
    /* O toque no ladrilho chama isto E acende o Ctrl.act do mesmo dedo,
       que chama de novo no update seguinte: sem a trava o jogo começava
       duas vezes, com dois GameState.init. */
    if (this.saindo) return;
    if (this.tentaComprar()) return;
    this.saindo = true;
    audioOn(); sfx('ok');
    var k = this.ordem[this.sel];
    /* Tem checkpoint deste personagem: pergunta se continua de onde parou
       ou se começa a campanha de novo, do dia 1 (src/campanha.js). */
    var salvo = !explorar && Campanha.tem(k);
    /* JOGAR não entra mais direto no dia: abre a LISTA DE FASES
       (docs/gdd/01-game-design-mestre.md §3 — "ao clicar em JOGAR o
       jogador visualiza a lista corrida das fases"). A tela já existia
       como atalho escondido atrás de um diálogo de checkpoint; agora ela
       é a porta da campanha, que é o lugar dela: é ali que se vê a nota
       de cada fase, o que está trancado e o que dá pra refazer.

       Vale pra TODO MUNDO, inclusive quem ainda não tem campanha escrita:
       lá a lista abre com a primeira jogável e as outras nove trancadas.
       É de propósito — a temporada trancada diz que existe história por
       vir sem prometer texto que ainda não foi escrito. Decidido com o
       Renan em 25/09 ("deixa trancado e misterioso"), depois de ele
       reparar que o botão JOGAR se comportava de dois jeitos. */
    if (!explorar) {
      // o save precisa estar APLICADO antes de abrir, senão o diário não sabe de quem é a temporada
      if (salvo) {
        GameState.init(k, salvo.genero);
        GameState.explorar = false;
        Campanha.aplica(salvo);
      } else {
        GameState.init(k, this.gen[k]);
        GameState.explorar = false;
        Missoes.novaCorrida();
        Campanha.salva('inicio');
      }
      this.scene.start('Fim', { vista: 'temporada' });
      return;
    }
    GameState.init(k, this.gen[k]);
    // EXPLORAR: o mesmo começo, mas sem relógio, sem perder e sem valer ponto
    GameState.explorar = !!explorar;
    if (!explorar) { Missoes.novaCorrida(); Campanha.salva('inicio'); }   // o primeiro checkpoint é a porta de casa
    this.scene.start('Estacao', { onde: 'saguao' });
  },

  update: function (time, delta) {
    Ctrl.update();
    // ?teste= no endereço: pula o título e abre a sala de teste (src/teste.js)
    if (TESTE && !abreSalaDeTeste.feito && this.ordem) { abreSalaDeTeste(this); return; }
    // a pergunta do checkpoint (continuar ou começar de novo) é uma fala
    if (this.dialog && this.dialog.ativo) { this.dialog.update(delta); return; }
    this.tempoAnim += delta;
    if (this.avisoT > 0) {
      this.avisoT -= delta;
      if (this.avisoT <= 0) { this.aviso = null; this.atualiza(); }
    }
    // o escolhido anda no lugar; o travado fica parado
    var k = this.ordem[this.sel];
    this.heroi.setFrame(destravado(k) ? 1 + (Math.floor(this.tempoAnim / 220) % 2) : 0);
    /* As setas respiram de leve, pra dizer que dá pra passar. Elas são
       desenho agora, e desenho não tem alpha próprio: quem guarda o
       valor é a cena, e o `atualiza` repinta com ele. */
    this.alfaSeta = 0.55 + 0.35 * Math.sin(this.tempoAnim / 300);
    if (this.gSetas) {
      this.gSetas.clear();
      setaEscada(this.gSetas, TIT.setaX + TIT.setaW / 2, TIT.setaCy, TIT.setaW, TIT.setaH, -1, 0xd2d0de, this.alfaSeta);
      setaEscada(this.gSetas, GW - TIT.setaX - TIT.setaW / 2, TIT.setaCy, TIT.setaW, TIT.setaH, 1, 0xd2d0de, this.alfaSeta);
    }

    if (Ctrl.leftJust) this.passa(-1);
    if (Ctrl.rightJust) this.passa(1);

    if (this.teclaG && Phaser.Input.Keyboard.JustDown(this.teclaG)) { this.trocaGenero(); return; }
    if (this.teclaT && Phaser.Input.Keyboard.JustDown(this.teclaT) && CHARS[this.ordem[this.sel]].times) {
      this.poeTime(ORDEM_TIMES[(ORDEM_TIMES.indexOf(leTime()) + 1) % ORDEM_TIMES.length]);
      return;
    }

    if (Ctrl.actJust) {
      if (this.ignoraAct) { this.ignoraAct = false; return; }
      this.comeca();
    }
  }
});
