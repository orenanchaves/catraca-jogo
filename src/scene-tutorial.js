/* global Phaser */
/* Catraca — o tutorial da primeira partida

   O jogo tem seis personagens com verbos diferentes, tela dividida em
   dois polegares, catraca com campo de visão, celular que troca o
   destino e hora pra chegar. Nada disso se descobre sozinho no meio de
   um vagão lotado.

   Duas regras aqui:

   1. É uma camada POR CIMA do jogo, não uma tela antes dele. Ninguém
      aprende a andar lendo sobre andar: os passos que dá pra cobrar de
      verdade só passam quando a pessoa faz. O jogo continua rodando por
      baixo o tempo todo.

   2. Dá pra pular a qualquer momento, e o botão fica na tela o tempo
      todo. Tutorial que prende é o que faz a segunda partida começar
      mal. Quem pulou não vê de novo — e quem quiser rever, o botão está
      na tela de título. */

/* O cartão cabe três linhas de 22 caracteres, que é o que a fonte dá
   em 264 pixels. As quebras são escritas à mão: com quebra automática
   por cima das minhas, o texto virava cinco linhas e passava por cima
   do botão de pular. */
var TUT_CARTAO = { x: 16, y: 326, w: GW - 32, h: 140 };

/* Cada passo tem o texto e, quando dá, uma condição de verdade: só
   passa quando a pessoa fez. Sem condição, um toque segue.

   E cada passo de comando tem DOIS textos, porque são dois jogos
   diferentes de comando. No celular a tela é dividida em duas metades;
   no computador não existe metade nenhuma — existe WASD e o mouse. Um
   tutorial que ensina arrastar a metade esquerda pra quem está no
   teclado não ensina nada, ensina a desconfiar do tutorial.

   'arte' é o desenho que acompanha o passo: a tela partida ao meio, ou
   o teclado com o mouse ao lado. Ler que a metade esquerda anda é uma
   coisa; ver a metade esquerda acesa com o boneco andando dentro é
   outra. */
var PASSOS_TUT = [
  {
    txt: 'VOCÊ MORA EM ITAQUERA.\nTEM HORA PRA CHEGAR.',
    dica: 'toque pra seguir', dicaPc: 'clique pra seguir'
  },
  {
    txt: 'A METADE ESQUERDA DA\nTELA ANDA: ARRASTE O\nDEDO COMO ANALÓGICO.',
    txtPc: 'W A S D OU AS SETAS\nPRA ANDAR.',
    arte: 'comando',
    dica: 'arraste na esquerda', dicaPc: 'ande um pouco',
    quando: function (t) { return t.andou > 46; }
  },
  {
    txt: 'A METADE DIREITA AGE:\nTOQUE PRA FALAR,\nPAGAR, SENTAR.',
    txtPc: 'CLIQUE PRA AGIR:\nFALAR, PAGAR, SENTAR.\nESPAÇO TAMBÉM VALE.',
    arte: 'comando',
    dica: 'toque na direita', dicaPc: 'clique na tela',
    quando: function (t) { return t.agiu; }
  },
  {
    txt: 'OS DOIS AO MESMO\nTEMPO: UM POLEGAR EM\nCADA METADE.',
    txtPc: 'OS DOIS AO MESMO\nTEMPO: TECLADO NUMA\nMÃO, MOUSE NA OUTRA.',
    arte: 'comando',
    dica: 'toque pra seguir', dicaPc: 'clique pra seguir'
  },
  {
    txt: 'O CELULAR FICA NO\nCANTO DE CIMA. É ELE\nQUE DIZ PRA ONDE IR.',
    dica: 'abra o ZipZap', dicaPc: 'abra o ZipZap',
    quando: function () { return TUTORIAL.viuZap; }
  },
  {
    txt: 'NA CATRACA: PAGUE, OU\nPULE QUANDO ELE NÃO\nESTIVER OLHANDO.',
    dica: 'toque pra seguir', dicaPc: 'clique pra seguir'
  },
  {
    txt: 'CINCO CORAÇÕES POR\nTRAJETO. BOA SORTE.',
    dica: 'toque pra começar', dicaPc: 'clique pra começar'
  }
];

/* o texto e a dica deste aparelho */
function textoDoPasso(p) { return (!TOQUE_ATIVO && p.txtPc) ? p.txtPc : p.txt; }
function dicaDoPasso(p) { return (!TOQUE_ATIVO && p.dicaPc) ? p.dicaPc : p.dica; }

/* Um punhado de sinais que o tutorial precisa saber e que nenhuma cena
   tem motivo pra guardar. Fica aqui fora porque quem liga o sinal é o
   HUD (o celular) e quem lê é esta cena. */
var TUTORIAL = { viuZap: false };

function tutorialFeito() {
  try { return localStorage.getItem('metrosp_tutorial') === '1'; } catch (e) { return true; }
}
function marcaTutorial() {
  try { localStorage.setItem('metrosp_tutorial', '1'); } catch (e) { }
}

/* O desenho que acompanha os passos de comando. Uma faixa entre o HUD
   e o cartão, partida ao meio igual à tela de verdade: à esquerda o que
   anda, à direita o que age. No computador as mesmas duas metades viram
   as duas mãos — teclado de um lado, mouse do outro. */
var ART_TUT = { x: 10, y: 150, w: GW - 20, h: 156, cxE: 84, cxD: 236, cy: 232 };
/* W em cima, A S D embaixo — o mesmo desenho que a mão faz no teclado */
var TECLAS_TUT = [
  [ART_TUT.cxE, ART_TUT.cy - 22, 'W'], [ART_TUT.cxE - 22, ART_TUT.cy, 'A'],
  [ART_TUT.cxE, ART_TUT.cy, 'S'], [ART_TUT.cxE + 22, ART_TUT.cy, 'D']
];

var TutorialScene = new Phaser.Class({
  Extends: Phaser.Scene,
  initialize: function TutorialScene() { Phaser.Scene.call(this, { key: 'Tutorial', active: false }); },

  create: function () {
    var self = this;
    this.passo = 0;
    this.andou = 0;
    this.agiu = false;
    this.t = 0;
    this.ondeEstava = null;
    TUTORIAL.viuZap = false;

    this.g = this.add.graphics().setDepth(1600);
    this.tTxt = txt(this, TUT_CARTAO.x + 12, TUT_CARTAO.y + 30, '', PAL.branco, 8).setDepth(1602);
    this.tDica = txt(this, TUT_CARTAO.x + 12, TUT_CARTAO.y + TUT_CARTAO.h - 26, '', PAL.amarelo, 8).setDepth(1602);
    this.tPular = txt(this, TUT_CARTAO.x + TUT_CARTAO.w - 12, TUT_CARTAO.y + 2,
      'PULAR ►', PAL.cinzaEsc, 8).setDepth(1602).setOrigin(1, 0);

    /* Os rótulos do desenho de comando. Ficam prontos e invisíveis: só
       o passo do comando acende os quatro. */
    this.tArte = [
      txtC(this, ART_TUT.cxE, ART_TUT.y + 8, '', PAL.verde, 8).setDepth(1602),
      txtC(this, ART_TUT.cxD, ART_TUT.y + 8, '', PAL.amarelo, 8).setDepth(1602),
      txtC(this, ART_TUT.cxE, ART_TUT.y + ART_TUT.h - 22, '', PAL.cinza, 8).setDepth(1602),
      txtC(this, ART_TUT.cxD, ART_TUT.y + ART_TUT.h - 22, '', PAL.cinza, 8).setDepth(1602)
    ];
    for (var a = 0; a < 4; a++) this.tArte[a].setVisible(false);

    /* As quatro teclas do desenho do computador. Caixa é graphics, letra
       é texto: não dá pra escrever com fillRect. */
    this.tTeclas = [];
    for (a = 0; a < 4; a++) {
      this.tTeclas.push(txtC(this, TECLAS_TUT[a][0], TECLAS_TUT[a][1] - 7,
        TECLAS_TUT[a][2], PAL.branco, 8).setDepth(1603).setVisible(false));
    }

    /* Pular fica na tela o tempo todo, no alto à direita do cartão: na
       mesma linha da dica os dois textos se encostavam. */
    this.zonaPular = this.add.zone(TUT_CARTAO.x + TUT_CARTAO.w - 104, TUT_CARTAO.y,
      104, 28).setOrigin(0, 0).setInteractive();
    this.zonaPular.on('pointerdown', function () { self.pula(); });

    // e o resto do cartão segue o passo, quando o passo é de leitura
    this.zonaSegue = this.add.zone(TUT_CARTAO.x, TUT_CARTAO.y + 28, TUT_CARTAO.w, TUT_CARTAO.h - 28)
      .setOrigin(0, 0).setInteractive();
    this.zonaSegue.on('pointerdown', function () { self.tentaSeguir(); });

    this.input.keyboard.on('keydown', function (ev) {
      if (ev.code === 'KeyX' || ev.code === 'Escape') { self.pula(); return; }
      if (ev.code === 'Space' || ev.code === 'Enter' || ev.code === 'KeyZ') self.tentaSeguir();
    });

    this.mostra();
  },

  mostra: function () {
    var p = PASSOS_TUT[this.passo];
    if (!p) { this.termina(); return; }
    this.tTxt.setText(textoDoPasso(p));
    this.tDica.setText('► ' + dicaDoPasso(p));
    var arte = p.arte === 'comando';
    var rot = TOQUE_ATIVO
      ? ['ANDAR', 'AGIR', 'ARRASTE', 'TOQUE']
      : ['ANDAR', 'AGIR', 'W A S D', 'CLIQUE'];
    for (var i = 0; i < 4; i++) this.tArte[i].setVisible(arte).setText(arte ? rot[i] : '');
    for (i = 0; i < 4; i++) this.tTeclas[i].setVisible(arte && !TOQUE_ATIVO);
    this.t = 0;
  },

  /* Passo com condição não anda no toque: quem faz é a pessoa. O toque
     só serve pros passos de leitura. */
  tentaSeguir: function () {
    var p = PASSOS_TUT[this.passo];
    if (!p || p.quando) return;
    this.segue();
  },

  segue: function () {
    this.passo++;
    sfx('ok');
    if (this.passo >= PASSOS_TUT.length) { this.termina(); return; }
    this.mostra();
  },

  pula: function () {
    sfx('catraca');
    this.termina();
  },

  termina: function () {
    for (var i = 0; i < 4; i++) { this.tArte[i].setVisible(false); this.tTeclas[i].setVisible(false); }
    marcaTutorial();
    this.scene.stop('Tutorial');
  },

  update: function (time, delta) {
    var dt = Math.min(delta, 50);
    this.t += dt;

    /* O quanto a pessoa já andou, somado em qualquer cena que tenha
       jogador. É o que faz o passo de andar passar por mérito. */
    var cenas = this.scene.manager.getScenes(true), pl = null, i;
    for (i = 0; i < cenas.length; i++) {
      if (cenas[i].pl && cenas[i].pl.sp && cenas[i].pl.sp.active) { pl = cenas[i].pl.sp; break; }
    }
    if (pl) {
      if (this.ondeEstava) {
        this.andou += Math.abs(pl.x - this.ondeEstava.x) + Math.abs(pl.y - this.ondeEstava.y);
      }
      this.ondeEstava = { x: pl.x, y: pl.y };
    }
    if (Ctrl.actJust) this.agiu = true;

    var p = PASSOS_TUT[this.passo];
    if (p && p.quando && this.t > 400 && p.quando(this)) this.segue();

    this.pinta();
  },

  /* ---------- o desenho das duas metades ---------- */
  pintaArte: function (g) {
    var A = ART_TUT, meia = (A.w - 12) / 2;
    var xE = A.x, xD = A.x + meia + 12;
    var pulso = (this.t % 1200) / 1200;

    g.fillStyle(0x000000, 0.62).fillRect(A.x, A.y, A.w, A.h);
    // a metade que anda, e a metade que age — cada uma com a sua cor
    g.fillStyle(0x14243c, 0.95).fillRect(xE, A.y, meia, A.h);
    g.fillStyle(0x2e2413, 0.95).fillRect(xD, A.y, meia, A.h);
    g.lineStyle(2, 0x00e676, 0.8).strokeRect(xE + 1, A.y + 1, meia - 2, A.h - 2);
    g.lineStyle(2, 0xf2c14e, 0.8).strokeRect(xD + 1, A.y + 1, meia - 2, A.h - 2);

    if (TOQUE_ATIVO) {
      /* manche: a base parada e o dedo girando em volta, que é o gesto
         que o jogo espera — arrastar, não bater */
      var ang = pulso * Math.PI * 2;
      g.lineStyle(2, 0x00e676, 0.5).strokeCircle(A.cxE, A.cy, 26);
      g.fillStyle(0x00e676, 0.9).fillCircle(A.cxE + Math.cos(ang) * 18, A.cy + Math.sin(ang) * 18, 10);
      // toque: o dedo encosta e a onda abre
      var r = 6 + pulso * 22;
      g.lineStyle(2, 0xf2c14e, 1 - pulso).strokeCircle(A.cxD, A.cy, r);
      g.fillStyle(0xf2c14e, 0.9).fillCircle(A.cxD, A.cy, 9);
    } else {
      /* teclado e mouse: as mesmas duas metades, só que aqui a divisão
         é entre as duas mãos e não entre os dois lados do vidro */
      var aceso = Math.floor(pulso * 4);
      for (var i = 0; i < 4; i++) {
        var on = (i === aceso);
        g.fillStyle(on ? 0x1d6e42 : 0x1e3350, 1)
          .fillRect(TECLAS_TUT[i][0] - 9, TECLAS_TUT[i][1] - 9, 18, 18);
        g.lineStyle(1, on ? 0x00e676 : 0x3d5170, 1)
          .strokeRect(TECLAS_TUT[i][0] - 8.5, TECLAS_TUT[i][1] - 8.5, 17, 17);
        this.tTeclas[i].setTint(on ? 0xffffff : 0x8b90a6);
      }
      // o mouse, com o botão da esquerda piscando
      g.fillStyle(0x3a3a4d, 1).fillRect(A.cxD - 13, A.cy - 20, 26, 38);
      g.fillStyle(0x1a1a26, 1).fillRect(A.cxD - 11, A.cy - 18, 22, 34);
      g.fillStyle(pulso < 0.5 ? 0xf2c14e : 0x4a4a5c, 1).fillRect(A.cxD - 11, A.cy - 18, 10, 14);
      g.fillStyle(0x4a4a5c, 1).fillRect(A.cxD + 1, A.cy - 18, 10, 14);
    }
  },

  pinta: function () {
    var g = this.g; g.clear();
    var c = TUT_CARTAO;
    var pa = PASSOS_TUT[this.passo];
    if (pa && pa.arte === 'comando') this.pintaArte(g);
    g.fillStyle(0x000000, 0.55).fillRect(c.x + 3, c.y + 4, c.w, c.h);
    g.fillStyle(0x0b1220, 0.96).fillRect(c.x, c.y, c.w, c.h);
    g.fillStyle(0x1c3a5e, 1).fillRect(c.x, c.y, c.w, 3);
    g.fillStyle(0xf2c14e, 1).fillRect(c.x, c.y + c.h - 3, c.w, 3);
    // o traço de "toque aqui" atrás do PULAR
    g.fillStyle(0x1a1a26, 1).fillRect(c.x + c.w - 100, c.y + 2, 88, 24);

    /* Uma barrinha de progresso: quem sabe quanto falta aguenta mais do
       que quem não faz ideia. Fica no alto à esquerda, na linha do
       botão de pular. */
    var n = PASSOS_TUT.length;
    for (var i = 0; i < n; i++) {
      g.fillStyle(i <= this.passo ? 0xf2c14e : 0x2a2a3a, 1)
        .fillRect(c.x + 12 + i * 14, c.y + 12, 10, 4);
    }
  }
});
