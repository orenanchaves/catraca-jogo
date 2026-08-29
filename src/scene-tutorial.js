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
   passa quando a pessoa fez. Sem condição, um toque segue. */
var PASSOS_TUT = [
  {
    txt: 'VOCÊ MORA EM ITAQUERA.\nTEM HORA PRA CHEGAR.',
    dica: 'toque pra seguir'
  },
  {
    txt: 'PRA ANDAR: ARRASTE NA\nMETADE ESQUERDA.',
    dica: 'ande um pouco',
    quando: function (t) { return t.andou > 46; }
  },
  {
    txt: 'PRA AGIR: TOQUE NA\nMETADE DIREITA.\nSEGURAR TAMBÉM VALE.',
    dica: 'toque na direita',
    quando: function (t) { return t.agiu; }
  },
  {
    txt: 'O CELULAR FICA NO\nCANTO DE CIMA. É ELE\nQUE DIZ PRA ONDE IR.',
    dica: 'abra o ZipZap',
    quando: function () { return TUTORIAL.viuZap; }
  },
  {
    txt: 'NA CATRACA: PAGUE, OU\nPULE QUANDO ELE NÃO\nESTIVER OLHANDO.',
    dica: 'toque pra seguir'
  },
  {
    txt: 'CINCO CORAÇÕES POR\nTRAJETO. BOA SORTE.',
    dica: 'toque pra começar'
  }
];

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
    this.tTxt.setText(p.txt);
    this.tDica.setText('► ' + p.dica);
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

  pinta: function () {
    var g = this.g; g.clear();
    var c = TUT_CARTAO;
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
