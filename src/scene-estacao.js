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
var ESC_PISTA = [
  { x0: ESC_X0, x1: ESC_MEIO - ESC_DIV / 2, sobe: true },
  { x0: ESC_MEIO + ESC_DIV / 2, x1: ESC_X1, sobe: false }
];
/* o guichê de achados e perdidos, na parede da esquerda do saguão */
/* Desceu de 296 pra 352 depois de medido na tela: a placa dele batia na
   do DOG DO CÃO, que fica na parede de frente na mesma altura. */
var ACH = { y: 352, h: 62, alcance: 64 };

/* a plataforma em coordenadas do mundo: o piso vai da faixa tátil à
   parede da direita */
var PLAT_X0 = 136, PLAT_X1 = 288;
function platY(y) { return y + PLAT_Y - HUD_H; }   // y de tela da plataforma → mundo

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
  init: function (dados) {
    this.entrada = (dados && dados.onde) || 'saguao';
  },

  create: function () {
    areaDeJogo();
    Ctrl.liga(this);
    HUD_VISIVEL = true; CONTROLES_VISIVEIS = true;
    this.dialog = null;
    this.fim = false;

    /* ---------- o saguão ---------- */
    this.liberado = !!GameState.char.gratuidade || this.entrada === 'plataforma';
    this.montaBarracas();
    this.montaGates();
    this.pulo = null;      // o pulo em andamento, que é o que ele pode ver
    this.flagra = null;    // ele te pegou e está vindo falar com você
    this.pulou = false;

    /* ---------- a plataforma ---------- */
    // cinco portas ao longo do trem: sempre tem uma perto de onde você está
    /* As portas nascem do comprimento do trem, de 118 em 118: com a
       plataforma mudando de tamanho, lista fixa deixava metade dela
       sem porta nenhuma. */
    this.portas = [];
    for (var pq = 76; pq + 52 <= PLAT_ALT - 24; pq += 118) this.portas.push(pq);
    this.estado = 'espera';
    this.t = 0;
    this.perdido = false;
    /* Era PLAT_ALT + 80, e os 80 sobravam POR BAIXO da plataforma: o
       trem parado enfiava oitenta pixels de lata dentro da escada
       rolante. Agora ele tem o comprimento exato da plataforma, e o
       desenho ainda é recortado nela (ver pintaTrem) pra que nem
       durante a chegada e a partida ele apareça onde não cabe. */
    this.tremAlt = PLAT_ALT;
    this.tremY = PLAT_Y - this.tremAlt;
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

    this.gTrem = this.add.graphics().setDepth(20);

    /* Duas plateias, uma em cada andar: quem está no saguão anda de um
       lado pro outro, quem está na plataforma espera olhando o trilho. */
    this.plateia = [];
    var quantos = Math.round(1 + 8 * GameState.lotacao()), i;
    for (i = 0; i < quantos; i++) {
      var a = new Ator(this, 40 + Math.random() * 240,
        280 + Math.random() * 230, sorteiaPax());
      a.sp.setDepth(40);
      a.vx = (Math.random() < 0.5 ? -1 : 1) * (20 + Math.random() * 28);
      a.t = Math.random() * 2000;
      this.plateia.push(a);
    }
    this.esperando = [];
    quantos = Math.round(1 + 9 * GameState.lotacao());
    for (i = 0; i < quantos; i++) {
      var e = new Ator(this, PLAT_X0 + 14 + Math.random() * 130,
        platY(100 + Math.random() * (PLAT_ALT - 160)), sorteiaPax());
      e.dir = 'left'; e.sp.setDepth(30); e.anima(0, false);
      this.esperando.push(e);
    }
    this.gente = this.plateia.concat(this.esperando, [this.guarda]);

    /* quem fica. De madrugada e no vazio eles aparecem mais:
       menos gente passando, mais gente que não vai a lugar nenhum */
    var chance = 0.75 - 0.45 * GameState.lotacao();
    for (var q = 0; q < 2; q++) {
      if (Math.random() > chance) continue;
      var pd = new Ator(this, q ? 286 : 34, 300 + Math.random() * 130,
        PEDINTE_KEYS[Math.floor(Math.random() * PEDINTE_KEYS.length)]);
      pd.sp.setDepth(38); pd.anima(0, false);
      pd.fixo = true;                 // quem está agachado não se mexe
      this.gente.push(pd);
    }
    if (Math.random() < 0.6 - 0.35 * GameState.lotacao()) {
      var pp = new Ator(this, 280, platY(120 + Math.random() * (PLAT_ALT - 200)),
        PEDINTE_KEYS[Math.floor(Math.random() * PEDINTE_KEYS.length)]);
      pp.sp.setDepth(28); pp.anima(0, false);
      pp.fixo = true;
      this.gente.push(pp);
    }

    this.montaAmbulante();

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
    cam.setDeadzone(GW, 200);
    cam.startFollow(this.pl.sp, true, 0.16, 0.16);
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
    this.painel = new Plaqueta(this, GW / 2, GH - 98, { cor: PAL.branco, filete: num(GameState.faixa().cor), depth: 80 });
    this.gMini = this.add.graphics().setDepth(500).setScrollFactor(0).setVisible(false);
    this.tMini = txtC(this, GW / 2, GH / 2 - 54, '', PAL.branco, 8).setDepth(501).setScrollFactor(0).setVisible(false);
    this.tMini2 = txtC(this, GW / 2, GH / 2 + 24, '', PAL.amarelo, 8).setDepth(501).setScrollFactor(0).setVisible(false);

    /* O tutorial é uma camada por cima da primeira partida, e a estação
       é onde toda partida começa. Quem já viu (ou pulou) não vê de
       novo; o botão de rever mora no título. */
    if (GameState.dia === 1 && !GameState.dentroDoSistema && !tutorialFeito()
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
      fala(this, msg + '\n' + f.frase, []);
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
    this.barracas = [
      {
        chave: 'dog', nome: 'DOG DO CÃO', cor: 0xe8362c,
        x: 242, y: 300, w: 50, h: 58, lado: -1,
        titulo: '"DOG DO CÃO, freguês!\nO monstro da estação."',
        cardapio: ['dogao', 'agua', 'chocolate']
      },
      {
        chave: 'banca', nome: 'BANCA', cor: 0x3a7fd0,
        x: 242, y: 430, w: 50, h: 54, lado: -1,
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
      var bx = b.lado > 0 ? b.x + b.w : b.x;          // onde fica o balcão
      if (Math.abs(x - bx) < 34 && y > b.y - 10 && y < b.y + b.h + 10) return b;
    }
    return null;
  },

  pintaBarracas: function (g) {
    for (var i = 0; i < this.barracas.length; i++) {
      var b = this.barracas[i];
      g.fillStyle(0x000000, 0.35).fillRect(b.x + 3, b.y + b.h, b.w, 4);
      // o corpo
      g.fillStyle(0x2b2b3a, 1).fillRect(b.x, b.y, b.w, b.h);
      g.fillStyle(0x3d3d50, 1).fillRect(b.x, b.y, b.w, 3);
      // o toldo listrado, virado pro corredor
      var tx = b.lado > 0 ? b.x + b.w - 10 : b.x;
      for (var f = 0; f < b.h; f += 8) {
        g.fillStyle(((f / 8) % 2) ? b.cor : 0xf2f0ff, 1).fillRect(tx, b.y + f, 10, Math.min(8, b.h - f));
      }
      // o balcão, e a luz por cima dele
      var cx = b.lado > 0 ? b.x + b.w : b.x - 4;
      g.fillStyle(0x8a6b3a, 1).fillRect(cx - (b.lado > 0 ? 0 : 0), b.y + 8, 4, b.h - 16);
      g.fillStyle(0xf2c14e, 0.14).fillRect(b.lado > 0 ? cx : cx - 24, b.y + 4, 28, b.h - 8);
      // as caixas na bancada
      g.fillStyle(0xe8a33c, 1).fillRect(b.x + 8, b.y + 12, 10, 8);
      g.fillStyle(0x6ac06a, 1).fillRect(b.x + 8, b.y + 26, 10, 8);
      g.fillStyle(0xd05a8a, 1).fillRect(b.x + 8, b.y + 40, 10, 8);
    }
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

    texturaDeCena(this, 'est_saguao', GW, GH, function (g) { eu.pintaSaguao(g, l); });
    texturaDeCena(this, 'est_plataforma', GW, PLAT_ALT, function (g) { eu.pintaPlataforma(g, l); });
    texturaDeCena(this, 'est_escada', GW, ESCADA_ALT, function (g) { eu.pintaEscada(g); });

    this.add.image(0, 0, 'est_saguao').setOrigin(0, 0).setDepth(0);
    this.add.image(0, PLAT_Y, 'est_plataforma').setOrigin(0, 0).setDepth(0);
    this.add.image(0, ESC_Y, 'est_escada').setOrigin(0, 0).setDepth(0);

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
    var tSag = txt(this, 12, 470, GameState.estacaoAtual(), PAL.branco, 8);
    tSag.setOrigin(0.5, 0.5).setAngle(90).setDepth(1);
    /* A placa da escada fica NO PISO, rente à boca: pendurada no vão
       ela virava parede na frente de quem sobe. */
    placa(this, GW / 2, 126, '▲ PLATAFORMA', PAL.cinza);
    // a placa vertical da plataforma, com o nome da estação
    var t = txt(this, 308, platY(220), GameState.estacaoAtual(), PAL.branco, 8);
    t.setOrigin(0.5, 0.5).setAngle(90).setDepth(1);

    this.gCatracas = this.add.graphics().setDepth(2);
    this.pintaCatracas();

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

    eu.piso(g, 0, 116, GW, 92, 0x4a4a60, 0x565670);
    eu.piso(g, 0, 240, GW, 280, 0x3f3f52, 0x494960);
    eu.azulejo(g, 0, 520, GW, 56);

    // a cor da linha também na parede da entrada, atrás de quem chega
    g.fillStyle(l.num, 1).fillRect(0, 536, GW, 5);
    g.fillStyle(0x000000, 0.3).fillRect(0, 541, GW, 2);

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

    g.fillStyle(num(PAL.metalSom), 1).fillRect(0, 208, GW, 32);
    g.fillStyle(num(PAL.metal), 1).fillRect(0, 208, GW, 22);
    g.fillStyle(num(PAL.metalLuz), 1).fillRect(0, 208, GW, 3);
    g.fillStyle(0x000000, 0.35).fillRect(0, 240, GW, 6);

    g.fillStyle(num(PAL.paredeSom), 1).fillRect(8, 176, 88, 64);
    g.fillStyle(num(PAL.parede), 1).fillRect(8, 176, 88, 48);
    g.fillStyle(num(PAL.paredeLuz), 1).fillRect(8, 176, 88, 4);
    g.fillStyle(0x0a0a12, 1).fillRect(20, 196, 64, 26);
    g.fillStyle(0x1c2436, 1).fillRect(22, 198, 60, 22);
    g.fillStyle(num(PAL.amarelo), 1).fillRect(20, 226, 64, 5);
    g.fillStyle(num(PAL.amareloSom), 1).fillRect(20, 231, 64, 2);

    eu.pintaBarracas(g);
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

  bocaDaEscada: function (g, y0, y1) {
    this.pintaDegraus(g, y0, y1);
    // o pente de metal onde o degrau some no piso
    g.fillStyle(num(PAL.metalSom), 1).fillRect(ESC_X0 - 10, y1 - 8, ESC_X1 - ESC_X0 + 20, 8);
    g.fillStyle(num(PAL.amareloSom), 1).fillRect(ESC_X0 - 10, y1 - 8, ESC_X1 - ESC_X0 + 20, 3);
    g.fillStyle(num(PAL.metal), 1);
    for (var px = ESC_X0 - 8; px < ESC_X1 + 8; px += 4) g.fillRect(px, y1 - 5, 2, 5);
  },

  pintaPlataforma: function (g, l) {
    /* A plataforma é desenhada na origem da própria textura, então tudo
       que era HUD_H vira 0 e o resto acompanha. */
    var GH_ = PLAT_ALT, HUD_H_ = 0;
    // túnel e via
    g.fillStyle(num(PAL.brita), 1).fillRect(0, HUD_H_, 108, GH_ - HUD_H_);
    g.fillStyle(0x1e1e28, 1);
    for (var y = HUD_H_; y < GH_; y += 24) g.fillRect(24, y, 76, 9);
    g.fillStyle(num(PAL.dormente), 1);
    for (var y2 = HUD_H_; y2 < GH_; y2 += 24) g.fillRect(24, y2, 76, 7);
    pontilhado(g, 0, HUD_H_, 108, GH_, 0x000000, 0.25, 6);
    // trilhos com brilho
    g.fillStyle(num(PAL.trilhoSom), 1).fillRect(40, HUD_H_, 8, GH_ - HUD_H_);
    g.fillStyle(num(PAL.trilho), 1).fillRect(40, HUD_H_, 5, GH_ - HUD_H_);
    g.fillStyle(num(PAL.trilhoSom), 1).fillRect(84, HUD_H_, 8, GH_ - HUD_H_);
    g.fillStyle(num(PAL.trilho), 1).fillRect(84, HUD_H_, 5, GH_ - HUD_H_);

    // borda da plataforma
    g.fillStyle(0x000000, 0.6).fillRect(100, HUD_H_, 8, GH_ - HUD_H_);
    // faixa amarela tátil
    g.fillStyle(num(PAL.amareloSom), 1).fillRect(108, HUD_H_, 16, GH_ - HUD_H_);
    g.fillStyle(num(PAL.amarelo), 1).fillRect(108, HUD_H_, 14, GH_ - HUD_H_);
    g.fillStyle(num(PAL.amareloSom), 1);
    for (var yy = HUD_H_ + 4; yy < GH_; yy += 12) g.fillRect(111, yy, 8, 5);
    g.fillStyle(num(PAL.amareloLuz), 1);
    for (var yy2 = HUD_H_ + 4; yy2 < GH_; yy2 += 12) g.fillRect(111, yy2, 8, 2);

    // piso da plataforma
    g.fillStyle(num(PAL.rejunte), 1).fillRect(124, HUD_H_, 172, GH_ - HUD_H_);
    for (var py = HUD_H_; py < GH_; py += 16) {
      for (var px = 124; px < 296; px += 16) {
        g.fillStyle(((px / 16 + py / 16) % 2) ? 0x3f3f52 : 0x494960, 1);
        g.fillRect(px + 1, py + 1, 14, 14);
        g.fillStyle(0xffffff, 0.07).fillRect(px + 1, py + 1, 14, 2);
        g.fillStyle(0x000000, 0.16).fillRect(px + 1, py + 13, 14, 2);
      }
    }
    // reflexo da luz do teto no piso
    g.fillStyle(0xffffff, 0.05).fillRect(150, HUD_H_, 28, GH_ - HUD_H_);
    g.fillStyle(0xffffff, 0.03).fillRect(232, HUD_H_, 20, GH_ - HUD_H_);

    // parede da direita
    g.fillStyle(num(PAL.paredeSom), 1).fillRect(296, HUD_H_, 24, GH_ - HUD_H_);
    g.fillStyle(num(PAL.parede), 1).fillRect(300, HUD_H_, 20, GH_ - HUD_H_);
    g.fillStyle(num(PAL.paredeLuz), 1).fillRect(300, HUD_H_, 3, GH_ - HUD_H_);

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
    var larga = Math.floor(Math.random() * TOTAL);

    var largura = POSTE;
    for (var k = 0; k < TOTAL; k++) largura += (k === larga ? VAO_LARGO : VAO) + POSTE;
    var x = X0 + Math.round(((X1 - X0) - largura) / 2) + POSTE;

    this.gates = [];
    for (var i = 0; i < TOTAL; i++) {
      var vao = (i === larga) ? VAO_LARGO : VAO;
      this.gates.push({ x0: x, x1: x + vao, larga: (i === larga), fechada: false });
      x += vao + POSTE;
    }

    // fora de serviço: a porta larga é a última a fechar
    var abertas = Phaser.Math.Clamp(Math.round(TOTAL * f.catracas), 2, TOTAL);
    var ordem = Phaser.Utils.Array.Shuffle([0, 1, 2, 3]).sort(function (a, b) {
      return (a === larga ? 1 : 0) - (b === larga ? 1 : 0);
    });
    for (var j = 0; j < TOTAL - abertas; j++) this.gates[ordem[j]].fechada = true;
    this.abertas = abertas;
  },

  pintaCatracas: function () {
    var g = this.gCatracas; g.clear();
    for (var i = 0; i < this.gates.length; i++) {
      var t = this.gates[i];
      var w = t.x1 - t.x0;
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

      if (t.larga) {
        // faixa azul no chão marcando a porta larga
        g.fillStyle(0x1c4a8a, 0.5).fillRect(t.x0, 240, w, 5);
        g.fillStyle(0x3a7fd0, 0.6).fillRect(t.x0 + w / 2 - 5, 241, 10, 3);
      }

      if (!this.liberado) {
        g.fillStyle(num(PAL.metalSom), 1).fillRect(t.x0, 218, w, 8);
        g.fillStyle(num(PAL.metal), 1).fillRect(t.x0, 218, w, 5);
        g.fillStyle(num(PAL.metalLuz), 1).fillRect(t.x0, 218, w, 2);
      } else {
        g.fillStyle(0x00e676, 0.22).fillRect(t.x0, 208, w, 32);
        g.fillStyle(0x00e676, 0.5).fillRect(t.x0, 236, w, 2);
      }
    }
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

  /* ---------- áreas caminháveis, nas três faixas ---------- */
  podeIr: function (x, y) {
    // ---- plataforma ----
    if (y < ESC_Y) return x >= PLAT_X0 && x <= PLAT_X1 && y >= platY(80);
    // ---- escada rolante: a única passagem entre os dois andares ----
    if (y < 116) return x > ESC_X0 && x < ESC_X1;
    // ---- saguão ----
    /* 22 e 298: eram 28 e 292. Doze pixels não é muito, mas neste
       saguão o meio é ocupado pelo cone do guardinha e as duas beiradas
       são o único jeito de contornar — cada pixel de beirada é caminho. */
    if (x < 22 || x > 298) return false;
    // o corpo da barraca é parede; o balcão é onde se atende
    for (var b = 0; b < this.barracas.length; b++) {
      var q = this.barracas[b];
      if (x > q.x - 6 && x < q.x + q.w + 6 && y > q.y - 4 && y < q.y + q.h + 4) return false;
    }
    if (y >= 244 && y <= 516) return true;
    if (y >= 116 && y <= 204) return true;
    if (y > 204 && y < 244) {
      if (!this.liberado) return false;
      for (var i = 0; i < this.gates.length; i++) {
        var t = this.gates[i];
        if (t.fechada) continue;
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
      { label: 'Pagar ' + ACHADOS_PRECO + ' e ver', cb: function () { eu.puxa(); } },
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
    av.fillStyle(0xe8362c, (this.gOlhando ? 0.17 : 0.09) + (vendo ? 0.12 : 0));
    av.fillPoints(pontos, true);
    av.lineStyle(1, 0xe8362c, vendo ? 0.85 : 0.3);
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
      if (nx < 60) { nx = 60; this.gVx = 1; }
      if (nx > 286) { nx = 286; this.gVx = -1; }
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
    this.pl.sp.y = p.y1;
    GameState.stats.catracasPuladas++;
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
    this.pulo = null;
    this.pl.sp.y = 252;
    this.pl.dir = 'down';
    this.flagra = { t: 0 };
    sfx('apito');
    perdeVida(this, this.pl.sp, this.patente.custo);
    GameState.addCarisma(-6 * this.patente.custo);
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
    fala(this, this.patente.fala, [
      {
        label: 'Voltar pro começo', cb: function () {
          self.pl.sp.x = 160; self.pl.sp.y = 512; self.pl.dir = 'up';
        }
      }
    ]);
  },

  /* ---------- trem ---------- */
  pintaTrem: function () {
    var g = this.gTrem; g.clear();
    if (this.tremY <= PLAT_Y - this.tremAlt || this.tremY >= PLAT_Y + this.tremAlt) return;
    var y0 = this.tremY, alt = this.tremAlt;
    var l = GameState.linhaAtual();

    /* ---------- o recorte ----------
       O trem só existe na faixa da plataforma. Sem isto, na chegada e
       na partida ele desliza por cima da escada rolante e do saguão,
       que é o andar de baixo: aparecia lata de trem atravessando a
       estação inteira. Recortar é mais simples que máscara e não custa
       nada, porque tudo aqui é retângulo. */
    var topo = Math.max(y0, PLAT_Y), base = Math.min(y0 + alt, ESC_Y);
    if (base <= topo) return;
    var ac = base - topo;

    // corpo com volume
    g.fillStyle(num(PAL.metalSom), 1).fillRect(20, topo, 88, ac);
    g.fillStyle(num(PAL.metal), 1).fillRect(24, topo, 78, ac);
    g.fillStyle(num(PAL.metalLuz), 1).fillRect(28, topo, 10, ac);
    g.fillStyle(0x000000, 0.28).fillRect(92, topo, 16, ac);
    // faixa da linha, só se a testeira do trem estiver na plataforma
    if (y0 >= PLAT_Y && y0 + 12 <= ESC_Y) {
      g.fillStyle(num(escurecer(l.cor, 0.35)), 1).fillRect(24, y0, 78, 12);
      g.fillStyle(l.num, 1).fillRect(24, y0 + 2, 78, 8);
    }

    // janelas: as que caem fora do recorte simplesmente não existem
    for (var y = y0 + 30; y < y0 + alt - 40; y += 80) {
      if (y < topo || y + 48 > base) continue;
      g.fillStyle(0x11161f, 1).fillRect(38, y, 58, 48);
      g.fillStyle(0x1f2a3d, 1).fillRect(40, y + 2, 54, 44);
      g.fillStyle(0x3a4a6a, 0.7).fillRect(42, y + 4, 50, 10);
      g.fillStyle(0xffffff, 0.09).fillRect(42, y + 4, 22, 40);
    }

    // portas
    var ab = (this.estado === 'aberto');
    for (var i = 0; i < this.portas.length; i++) {
      var py = this.portas[i] + y0;
      // porta pela metade não é porta: ou cabe inteira, ou não aparece
      if (py < topo || py + 52 > base) continue;
      if (ab) {
        g.fillStyle(0x07070c, 1).fillRect(76, py, 32, 52);
        g.fillStyle(0x232d42, 1).fillRect(80, py + 4, 24, 44);
        g.fillStyle(0x00e676, 1).fillRect(72, py, 4, 52);
        g.fillStyle(0x00e676, 0.3).fillRect(108, py, 12, 52);
      } else {
        g.fillStyle(num(PAL.metalSom), 1).fillRect(72, py, 36, 52);
        g.fillStyle(0x767c92, 1).fillRect(74, py, 32, 52);
        g.fillStyle(num(PAL.metalLuz), 1).fillRect(74, py, 32, 2);
        g.fillStyle(num(PAL.metalSom), 1).fillRect(88, py, 3, 52);
        g.fillStyle(num(PAL.amarelo), 1).fillRect(72, py + 24, 36, 4);
      }
    }
  },

  portaPerto: function () {
    if (this.estado !== 'aberto') return null;
    var y = this.pl.sp.y, x = this.pl.sp.x;
    if (x > PLAT_X0 + 64) return null;
    for (var i = 0; i < this.portas.length; i++) {
      var py = this.portas[i] + this.tremY + 26;
      if (Math.abs(y - py) < 46) return py;
    }
    return null;
  },

  /* intervalo entre trens: no pico vem um atrás do outro, de madrugada
     você espera de verdade. Depois de perder um, o próximo perdoa. */
  intervalo: function () {
    /* 5600 e não 3400: no pico a espera caía pra 1,9s, que é menos do
       que a porta demora abrindo — o trem parecia estar sempre ali, e
       perder um não custava nada. Agora vai de 3,1s no pico a 11,8s de
       madrugada, e a faixa de horário volta a ser uma escolha: pico é
       cheio mas passa direto, madrugada é vazio mas você espera. */
    var e = 5600 * GameState.faixa().espera;
    return this.perdido ? e * 0.6 : e;
  },

  cicloTrem: function (dt) {
    this.t += dt;
    var dif = GameState.dificuldade();
    switch (this.estado) {
      case 'espera':
        var esp = this.intervalo();
        this.painel.setText('TREM EM ' + Math.max(0, Math.ceil((esp - this.t) / 1000)) + 'S');
        if (this.t > esp) {
          this.estado = 'chegando'; this.t = 0; sfx('trem');
          GameState.passaTempo(Math.round(esp / 1000));
        }
        break;
      case 'chegando':
        this.tremY = PLAT_Y - this.tremAlt + (this.t / 1400) * this.tremAlt;
        if (this.tremY >= PLAT_Y) { this.tremY = PLAT_Y; this.estado = 'aberto'; this.t = 0; sfx('porta'); }
        this.painel.setText('CHEGANDO');
        break;
      case 'aberto':
        var janela = Math.max(4200, 7400 - dif * 280);
        this.painel.setText('EMBARQUE ' + Math.max(0, Math.ceil((janela - this.t) / 1000)) + 'S');
        if (this.t > janela) {
          this.estado = 'partindo'; this.t = 0; sfx('porta');
          if (this.empurrando) this.falhouEmbarque();
        }
        break;
      case 'partindo':
        this.tremY = PLAT_Y + (this.t / 1400) * this.tremAlt;
        if (this.tremY >= PLAT_Y + this.tremAlt) { this.tremY = PLAT_Y - this.tremAlt; this.estado = 'espera'; this.t = 0; }
        this.painel.setText('PERDEU ESSE');
        break;
    }
    this.pintaTrem();
  },

  /* ---------- minigame de entrar ---------- */

  /* quanto de pressão o vagão exige: no pico é uma parede de gente,
     fora do pico é quase só entrar */
  metaEmpurrao: function () {
    return 42 + 58 * GameState.lotacao();
  },

  comecaEmpurrao: function () {
    this.empurrando = true;
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
    GameState.addDescanso(-4 - 5 * GameState.lotacao() - (espremido ? 4 : 0));
    if (espremido) { GameState.addCarisma(-2); this.cameras.main.shake(200, 0.005); }
    sfx('ok');
    this.scene.start('Vagao');
  },

  falhouEmbarque: function () {
    // quase lá conta: a porta fecha nas suas costas e você vai espremido
    if (this.pressao >= this.metaEmpurrao() * 0.62) { this.entrou(true); return; }
    this.fimEmpurrao();
    this.perdido = true;
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
    var a = new Ator(this, 180, platY(200 + Math.random() * (PLAT_ALT - 340)),
      ['np_ambulante_a', 'np_ambulante_b', 'np_ambulante_c'][Math.floor(Math.random() * 3)]);
    a.sp.setDepth(39);
    a.vy = (Math.random() < 0.5 ? -1 : 1) * 26;
    this.ambulante = a;
    this.gente.push(a);
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
    resolveCorpos(this.pl, this.gente,
      function (sp) {
        if (!self.podeIr(sp.x, sp.y)) { sp.x = antes.x; sp.y = antes.y; }
      },
      function (sp) {
        if (sp.y < ESC_Y) { limitaPlataforma(sp); return; }
        sp.x = Phaser.Math.Clamp(sp.x, 34, 288);
        sp.y = Phaser.Math.Clamp(sp.y, 258, 514);
      });
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

    if (this.dialog && this.dialog.ativo) { this.dialog.update(dt); return; }
    if (this.fim) return;

    /* A estação é a primeira cena de cada perna, e é aqui que chega quem
       acabou de ser mandado embora ou de dormir no ponto. Sem esta
       checagem dava pra jogar uma cena inteira já demitido. */
    var morte = GameState.derrota();
    if (morte) { GameState.motivoFim = morte; this.fim = true; GameState.salvarRecorde(); vaiPraOFim(this); return; }

    this.cicloTrem(dt);
    if (this.empurrando) { this.atualizaEmpurrao(dt); return; }

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
    for (i = 0; i < this.plateia.length; i++) {
      var a = this.plateia[i];
      a.t += dt;
      if (a.t > 2400) { a.t = 0; a.vx = -a.vx; }
      var nx = a.sp.x + a.vx * dt / 1000;
      if (nx < 40 || nx > 280) { a.vx = -a.vx; nx = a.sp.x; }
      a.sp.x = nx;
      a.dir = a.vx < 0 ? 'left' : 'right';
      a.anima(dt, true);
    }
    for (i = 0; i < this.esperando.length; i++) this.esperando[i].anima(dt, false);
    this.andaAmbulante(dt);

    var vel = GameState.char.velocidade * (0.6 + 0.4 * (GameState.descanso / GameState.char.descansoMax));
    var dx = (Ctrl.right ? 1 : 0) - (Ctrl.left ? 1 : 0);
    var dy = (Ctrl.down ? 1 : 0) - (Ctrl.up ? 1 : 0);
    var mv = (dx !== 0 || dy !== 0);
    if (mv) {
      var n = Math.sqrt(dx * dx + dy * dy);
      var px = this.pl.sp.x + (dx / n) * vel * dt / 1000;
      var py = this.pl.sp.y + (dy / n) * vel * dt / 1000;
      if (this.podeIr(px, this.pl.sp.y)) this.pl.sp.x = px;
      if (this.podeIr(this.pl.sp.x, py)) this.pl.sp.y = py;
      else if (dy !== 0) this.afunila(py, dx, vel * dt / 1000);
      this.pl.setDir(dx, dy);
    }
    this.pl.anima(dt, mv);
    this.resolveCorpos();
    this.chao.atualiza(dt, this.pl.sp.x, this.pl.sp.y);

    // passar do bloqueio é entrar no sistema, e isso não se desfaz
    if (this.pl.sp.y <= 204) GameState.dentroDoSistema = true;

    this.contexto(vendo);
  },

  /* O rodapé fala do andar em que você está: em cima é porta de trem e
     ambulante, embaixo é bilheteria, barraca e catraca. */
  contexto: function (vendo) {
    var x = this.pl.sp.x, y = this.pl.sp.y, dica = '';

    if (y < ESC_Y) {
      var porta = this.portaPerto();
      var vendedor = this.ambulantePerto();
      /* A porta manda: quem está com o trem aberto na frente não vai
         parar pra comprar bala. O ambulante é pra quem está esperando. */
      if (porta) {
        this.dica.setText(nomeAgir() + ': entrar no vagão', PAL.verde);
        if (Ctrl.actJust) this.comecaEmpurrao();
      } else if (vendedor) {
        // 'COMPRAR DO AMBULANTE' com o prefixo dá 27 caracteres: quatro a
        // mais do que a faixa aguenta, e o fim sai pela borda
        this.dica.setText(nomeAgir() + ': COMPRAR', PAL.amarelo);
        if (Ctrl.actJust) {
          abreBarraca(this, '"Olha o chocolate, a água\ngeladinha, a pururuca!"',
            estaCalor() ? ['agua', 'pururuca', 'chocolate', 'doce'] : ['chocolate', 'pururuca', 'doce', 'agua']);
        }
      } else {
        this.dica.setText(this.estado === 'aberto' ? 'chegue na porta ◄' : '', PAL.amarelo);
      }
      return;
    }

    if (y < 116) { this.dica.setText('▲ PLATAFORMA', PAL.cinza); return; }

    var noGuiche = (x < ACH.alcance && y > ACH.y - 8 && y < ACH.y + ACH.h + 8);
    var naBilheteria = (x < 96 && y > 244 && y < 288 && !this.liberado);
    var gate = this.gateSob(x);
    var perto = (gate && y > 244 && y < 284);
    var naCatraca = (perto && !this.liberado && !gate.fechada);
    /* O cone é a regra inteira: se você está dentro dele, pular é ser
       pego. Fora dele, o risco é ele virar no meio do pulo. */
    var seguro = naCatraca && !vendo;

    var barraca = this.barracaPerto(x, y);
    if (barraca) dica = nomeAgir() + ': ' + barraca.nome;
    /* 'TOQUE: ACHADOS E PERDIDOS' dá 25 caracteres com o prefixo, e a
       faixa cabe 26 justos. O preço é a informação que decide. */
    // sem a placa em cima do guichê, é a dica que diz o que ele é
    else if (noGuiche) dica = nomeAgir() + ': ACHADOS (' + ACHADOS_PRECO + ')';
    else if (naBilheteria) dica = nomeAgir() + ': comprar passagem';
    else if (perto && gate.fechada) dica = 'catraca fora de serviço';
    else if (naCatraca) {
      dica = vendo
        ? 'ELE TÁ TE VENDO — ESPERE'
        : nomeAgir() + (gate.larga ? ': PULAR A LARGA' : ': PULAR AGORA');
    } else if (vendo) dica = 'sai da frente dele';
    else if (this.liberado || this.pulou) dica = 'suba pela escada ▲';
    this.dica.setText(dica, seguro ? PAL.verde : (perto && gate.fechada ? PAL.cinza : PAL.amarelo));

    if (Ctrl.actJust) {
      if (barraca) abreBarraca(this, barraca.titulo, barraca.cardapio);
      else if (noGuiche) this.abreAchados();
      else if (naBilheteria) this.abreMenuBilheteria();
      else if (naCatraca) this.comecaPulo(gate);
    }
  }
});
