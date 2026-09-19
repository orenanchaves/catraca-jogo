/* global Phaser */
/* Catraca — tela de título, escolha e loja de personagens */

/* As duas abas de gênero, medidas juntas: 'MULHER' tem 6 letras a 12
   pixels, e a aba precisa caber a palavra com folga de dedo dos dois
   lados. */
var GEN_ABA = { w: 88, h: 24 };

/* ---------- a tela, de cima pra baixo ----------
   Era uma pilha: seis cartas, nome, gênero, poder, descrição, uma ficha
   de cinco linhas e quatro ladrilhos, tudo em cima da plataforma
   ('muito poluído'). Agora é um carrossel: UM personagem grande no
   meio, ◄ e ► dos lados e seis pontinhos dizendo quantos são. A ficha
   virou dois pares lado a lado, e os ladrilhos, um JOGAR largo com as
   três ferramentas pequenas embaixo. Cada número abaixo é o y de uma
   faixa; a tinta do tam 8 começa em y+5 e tem 14px, a do tam 16 vai
   de y+8 a y+44. */
var TIT = {
  placaY: 10, placaH: 52,
  topoY: 70,
  pes: 214, escala: 2,      // o boneco de 48px vira 96: cabeça em 118
  setaY: 150,
  pontosY: 228,
  nomeY: 236,
  genY: 284,
  poderY: 318,
  descY: 340,
  // o torcedor ganha a fileira dos times embaixo do gênero, e o poder desce
  timeY: 314, poderYTime: 346, descYTime: 368,
  fichaY: 392, fichaH: 70
};

/* O JOGAR é o ladrilho largo, sozinho, porque é o que se aperta; as
   três ferramentas (tutorial, treino, som) ficam numa fileira menor
   embaixo dele. TREINO e não JOGOS: "JOGOS" perto de "► JOGAR" é o
   mesmo verbo duas vezes, e o polegar erra entre os dois. */
/* A fileira de baixo ganhou o EXPLORAR: o jogo sem relógio, sem ponto e
   sem missão, pra andar pela estação e pelo trem à toa. 'EXPLORAR' tem 8
   letras, 96px; o botão tem 104. */
var BOT = { yGr: GH - 106, hGr: 44, xGr: 24, gr: GW - 48, y: GH - 54, h: 38, tut: 40, tre: 88, exp: 104, som: 48, vao: 6 };
BOT.x0 = Math.round((GW - (BOT.tut + BOT.tre + BOT.exp + BOT.som + BOT.vao * 3)) / 2);
BOT.xTre = BOT.x0 + BOT.tut + BOT.vao;
BOT.xExp = BOT.xTre + BOT.tre + BOT.vao;
BOT.xDir = BOT.xExp + BOT.exp + BOT.vao;

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
    texturaDeCena(this, 'tit_fundo', GW, PLAT_ALT, function (gp) {
      EstacaoScene.prototype.pintaPlataforma.call(null, gp, null, false);
    });
    this.add.image(0, GH - PLAT_ALT, 'tit_fundo').setOrigin(0, 0).setDepth(-10);
    this.add.image(0, GH - PLAT_ALT * 2, 'tit_fundo').setOrigin(0, 0).setDepth(-10);

    var g = this.add.graphics();
    g.fillStyle(0x05050a, 0.88).fillRect(0, 0, GW, GH);

    // a placa de estação com o nome do jogo: azul em cima, vermelho embaixo
    var y = TIT.placaY, h = TIT.placaH;
    g.fillStyle(0x06060c, 1).fillRect(0, y, GW, h);
    g.fillStyle(0x0b5fae, 1).fillRect(0, y, GW, 5);
    g.fillStyle(0xe8362c, 1).fillRect(0, y + h - 5, GW, 5);
    txtC(this, GW / 2, y + 2, 'CATRACA', PAL.branco, 16);

    /* o recorde à esquerda e os pontos à direita, com a moeda do vagão */
    this.tTopo = txt(this, 12, TIT.topoY, '', PAL.cinzaEsc, 8);
    texturasDoChao(this);
    this.add.image(GW - 70, TIT.topoY + 11, 'caido_moeda').setDepth(1);
    this.tPontos = txt(this, GW - 12, TIT.topoY, '', PAL.amarelo, 8).setOrigin(1, 0);

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

    // as setas: zonas largas, porque o polegar não mira em 12 pixels
    this.tSetas = [
      txtC(this, 40, TIT.setaY, '◄', PAL.branco, 16).setDepth(3),
      txtC(this, GW - 40, TIT.setaY, '►', PAL.branco, 16).setDepth(3)
    ];
    this.add.zone(0, TIT.setaY - 50, 90, 150).setOrigin(0, 0).setInteractive()
      .on('pointerdown', function () { eu.passa(-1); eu.ignoraAct = true; });
    this.add.zone(GW - 90, TIT.setaY - 50, 90, 150).setOrigin(0, 0).setInteractive()
      .on('pointerdown', function () { eu.passa(1); eu.ignoraAct = true; });

    this.tNome = txtC(this, GW / 2, TIT.nomeY, '', PAL.amarelo, 16);

    /* ---------- o gênero ----------
       As duas opções lado a lado, com a escolhida acesa: ver as duas é o
       que diz que há escolha. No teclado a tecla é G. A gestante mostra
       só a dela, apagada e sem toque: o verbo dela é estar grávida. */
    this.gCards = this.add.graphics().setDepth(1);
    this.genY = TIT.genY;
    this.tGen = [
      txtC(this, GW / 2 - GEN_ABA.w / 2, TIT.genY + 5, 'HOMEM', PAL.cinza, 8).setDepth(3),
      txtC(this, GW / 2 + GEN_ABA.w / 2, TIT.genY + 5, 'MULHER', PAL.cinza, 8).setDepth(3)
    ];
    this.zonaGen = [];
    for (i = 0; i < 2; i++) {
      var zg = this.add.zone(GW / 2 - GEN_ABA.w + i * GEN_ABA.w, this.genY, GEN_ABA.w, GEN_ABA.h)
        .setOrigin(0, 0).setInteractive();
      (function (gg) { zg.on('pointerdown', function () { eu.poeGenero(gg); }); })(i ? 'f' : 'm');
      this.zonaGen.push(zg);
    }

    /* ---------- o time ----------
       Só pro torcedor: quatro botões com a cor da camisa e o apelido do
       time. Tocar troca a camisa na hora; no teclado a tecla é T. */
    this.gTimes = this.add.graphics().setDepth(1);
    this.tTimes = []; this.zonaTimes = [];
    for (i = 0; i < ORDEM_TIMES.length; i++) {
      var cx = this.xDoTime(i);
      this.tTimes.push(txtC(this, cx + 32, TIT.timeY + 5, TIMES[ORDEM_TIMES[i]].nome, PAL.branco, 8)
        .setScale(ESCALA_TEXTO / 2).setDepth(3));
      var zt = this.add.zone(cx, TIT.timeY, 64, 22).setOrigin(0, 0);
      (function (t) { zt.on('pointerdown', function () { eu.poeTime(t); }); })(ORDEM_TIMES[i]);
      this.zonaTimes.push(zt);
    }
    this.teclaT = this.input.keyboard.addKey('T');

    // o verbo que só este personagem tem, e como ele funciona
    this.tPoder = txtC(this, GW / 2, TIT.poderY, '', PAL.verde, 8);
    this.tDesc = txtC(this, GW / 2, TIT.descY, '', PAL.cinza, 8);
    this.tDesc.setWordWrapWidth(GW - 56).setAlign('center');

    /* ---------- a ficha ----------
       Dois pares lado a lado em vez de cinco linhas: em cima o que é
       palavra (grana e passo), embaixo o que é medidor (carisma e
       descanso), como barra nas cores do HUD. O rótulo é pequeno e
       cinza; o valor é o que se lê. A tarifa saiu: ela é a mesma pra
       quase todo mundo, e quem não paga tem isso escrito no próprio
       poder. */
    this.gFicha = this.add.graphics().setDepth(1);
    var colX = [40, GW / 2 + 12];
    var rot = [['GRANA', 'PASSO'], ['CARISMA', 'DESCANSO']];
    this.fichaVal = [];
    for (var lin = 0; lin < 2; lin++) {
      for (var col = 0; col < 2; col++) {
        txt(this, colX[col], TIT.fichaY + 6 + lin * 34, rot[lin][col], PAL.cinzaEsc, 8)
          .setScale(ESCALA_TEXTO / 2).setDepth(2);
      }
    }
    this.fichaVal.push(txt(this, colX[0], TIT.fichaY + 14, '', PAL.branco, 8).setDepth(2));
    this.fichaVal.push(txt(this, colX[1], TIT.fichaY + 14, '', PAL.branco, 8).setDepth(2));

    /* ---------- os ladrilhos ---------- */
    this.gBot = this.add.graphics().setDepth(1);
    this.tStart = txtC(this, GW / 2, BOT.yGr + 11, '', PAL.branco, 8).setDepth(3);
    this.tTut = txtC(this, BOT.x0 + BOT.tut / 2, BOT.y + 8, '?', PAL.branco, 8).setDepth(3);
    this.tTre = txtC(this, BOT.xTre + BOT.tre / 2, BOT.y + 8, 'TREINO', PAL.branco, 8).setDepth(3);
    this.tSom = txtC(this, BOT.xDir + BOT.som / 2, BOT.y + 8, 'SOM', PAL.branco, 8).setDepth(3);
    this.tExp = txtC(this, BOT.xExp + BOT.exp / 2, BOT.y + 8, 'EXPLORAR', PAL.verde, 8).setDepth(3);
    this.zonaExp = this.add.zone(BOT.xExp, BOT.y, BOT.exp, BOT.h).setOrigin(0, 0).setInteractive();
    this.zonaExp.on('pointerdown', function () { eu.ignoraAct = true; eu.comeca(true); });

    this.zonaTut = this.add.zone(BOT.x0, BOT.y, BOT.tut, BOT.h).setOrigin(0, 0).setInteractive();
    this.zonaTut.on('pointerdown', function () {
      try { localStorage.removeItem('metrosp_tutorial'); } catch (e) { }
      eu.flashLoja('TUTORIAL LIGADO');
      sfx('ok');
      /* Sem isto o mesmo toque religava o tutorial E começava a partida:
         quem só queria saber o que aquilo fazia já estava na catraca. */
      eu.ignoraAct = true;
      eu.atualiza();
    });
    this.zonaSom = this.add.zone(BOT.xDir, BOT.y, BOT.som, BOT.h).setOrigin(0, 0).setInteractive();
    this.zonaSom.on('pointerdown', function () {
      var liga = !SOM_LIGADO;
      ligaSom(liga); ligaMusica(liga);
      if (liga) sfx('ok');
      eu.ignoraAct = true;
      eu.atualiza();
    });
    /* O TREINO leva quem estiver escolhido. Travado não entra: o treino
       viraria o jeito de jogar de graça com quem ainda não foi comprado;
       aí vai o estudante, que é de todo mundo. */
    this.zonaTre = this.add.zone(BOT.xTre, BOT.y, BOT.tre, BOT.h).setOrigin(0, 0).setInteractive();
    this.zonaTre.on('pointerdown', function () {
      eu.ignoraAct = true;
      var kt = eu.ordem[eu.sel];
      if (!destravado(kt)) kt = 'estudante';
      TREINO_QUEM.k = kt;
      TREINO_QUEM.g = eu.gen[kt];
      audioOn(); sfx('ok');
      eu.scene.start('Treino', {});
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

  // os quatro botões de time: 64 de largura e 4 de vão, 268 no total
  xDoTime: function (i) { return Math.round((GW - (64 * 4 + 4 * 3)) / 2) + i * 68; },

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

    // o palco: a luz no chão e o boneco, ou a silhueta dele com o cadeado
    var gp = this.gPalco; gp.clear();
    gp.fillStyle(0xf2c14e, aberto ? 0.08 : 0.03).fillEllipse(GW / 2, TIT.pes - 40, 150, 130);
    gp.fillStyle(0x000000, 0.45).fillEllipse(GW / 2, TIT.pes - 2, 70, 14);
    this.heroi.setTexture(spriteChar(k, gsel), 0);
    if (aberto) this.heroi.clearTint(); else this.heroi.setTint(0x16161f);
    var gc = this.gCadeado; gc.clear();
    this.tPreco.setText(aberto ? '' : String(precoDe(k)));
    if (!aberto) {
      var lx = GW / 2, ly = TIT.pes - 70;
      gc.lineStyle(4, 0xf2c14e, 1).strokeRoundedRect(lx - 8, ly - 14, 16, 18, 7);
      gc.fillStyle(0xf2c14e, 1).fillRoundedRect(lx - 13, ly - 2, 26, 20, 4);
      gc.fillStyle(0x16161f, 1).fillRect(lx - 1, ly + 4, 3, 8);
      this.tPreco.setPosition(GW / 2, ly + 24);
    }

    // os seis pontinhos: o escolhido aceso e maior, o travado mais apagado
    var n = this.ordem.length, passo = 16, x0 = GW / 2 - (n - 1) * passo / 2;
    for (i = 0; i < n; i++) {
      var aqui = (i === this.sel), livre = destravado(this.ordem[i]);
      gp.fillStyle(aqui ? 0xf2c14e : (livre ? 0x6a6c80 : 0x2e2e3e), 1)
        .fillCircle(x0 + i * passo, TIT.pontosY, aqui ? 4 : 3);
    }

    this.tNome.setText(nomeDoChar(k, gsel)).setColor(aberto ? PAL.amarelo : PAL.cinzaEsc);

    /* As duas abas do gênero, com a escolhida acesa. Quem só tem um
       gênero mostra o dele apagado e sem toque. */
    var g = this.gCards; g.clear();
    var gs = generosDe(k), dois = gs.length > 1;
    for (var q = 0; q < 2; q++) {
      var qg = q ? 'f' : 'm', temEsta = gs.indexOf(qg) >= 0, esta = (gsel === qg);
      this.tGen[q].setVisible(temEsta)
        .setColor(esta ? (aberto ? PAL.bg : PAL.cinzaEsc) : PAL.cinza);
      // quem só tem um gênero mostra a aba dele sozinha, no meio
      var zx = dois ? GW / 2 - GEN_ABA.w + q * GEN_ABA.w : GW / 2 - GEN_ABA.w / 2;
      this.tGen[q].setX(zx + GEN_ABA.w / 2);
      if (temEsta && dois) this.zonaGen[q].setInteractive();
      else this.zonaGen[q].disableInteractive();
      if (!temEsta) continue;
      g.fillStyle(esta ? (aberto ? 0xf2c14e : 0x3a3a4a) : 0x14141e, 1)
        .fillRect(zx, this.genY, GEN_ABA.w, GEN_ABA.h);
      g.lineStyle(2, esta ? (aberto ? 0xffe9a8 : 0x4a4a5c) : 0x2a2a3a, 1)
        .strokeRect(zx + 1, this.genY + 1, GEN_ABA.w - 2, GEN_ABA.h - 2);
    }

    // o time, só pro torcedor
    var gt = this.gTimes; gt.clear();
    var temTime = !!c.times, meuTime = leTime();
    for (i = 0; i < ORDEM_TIMES.length; i++) {
      var T = TIMES[ORDEM_TIMES[i]], tx = this.xDoTime(i), aqui2 = (ORDEM_TIMES[i] === meuTime);
      this.tTimes[i].setVisible(temTime);
      if (temTime) this.zonaTimes[i].setInteractive(); else this.zonaTimes[i].disableInteractive();
      if (!temTime) continue;
      gt.fillStyle(T.cor, 1).fillRect(tx, TIT.timeY, 64, 22);
      gt.fillStyle(T.cor2, 1).fillRect(tx, TIT.timeY + 18, 64, 4);          // a faixa da segunda cor
      gt.lineStyle(2, aqui2 ? 0xf2c14e : 0x2a2a3a, 1).strokeRect(tx + 1, TIT.timeY + 1, 62, 20);
      // camisa clara pede letra escura
      this.tTimes[i].setColor(T.cor === 0xf0eeff ? '#14141c' : PAL.branco).setAlpha(aqui2 ? 1 : 0.7);
    }
    this.tPoder.setY(temTime ? TIT.poderYTime : TIT.poderY);
    this.tDesc.setY(temTime ? TIT.descYTime : TIT.descY);

    /* Dois personagens dividem o mesmo verbo e não jogam igual: quando
       o personagem tem rótulo próprio, é o dele que aparece. */
    var pd = PODERES[c.poder] || {};
    var rotulo = c.poderRotulo || pd.nome;
    this.tPoder.setText(rotulo ? '► ' + rotulo : '').setColor(aberto ? PAL.verde : PAL.cinzaEsc);
    this.tDesc.setText(c.poderComo || pd.como || c.desc);

    this.fichaVal[0].setText('R$ ' + c.dinheiro.toFixed(2).replace('.', ','));
    this.fichaVal[1].setText(nomeDoPasso(c.velocidade));
    var gf = this.gFicha; gf.clear();
    gf.fillStyle(0x0d0d18, 0.92).fillRoundedRect(28, TIT.fichaY, GW - 56, TIT.fichaH, 8);
    var bw = GW / 2 - 52;
    barra(gf, 40, TIT.fichaY + 50, bw, 10, c.carisma / 100, 0xe8a33c);
    barra(gf, GW / 2 + 12, TIT.fichaY + 50, bw, 10, c.descanso / c.descansoMax, 0x00e676);

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
    var rotulo, corpo, aba, borda, cor;
    if (this.aviso) {
      rotulo = this.aviso; corpo = 0x3a3410; aba = 0x5c5320; borda = 0xf2c14e; cor = PAL.amarelo;
    } else if (aberto) {
      rotulo = '► JOGAR'; corpo = 0x14432c; aba = 0x1d6e42; borda = 0x00e676; cor = PAL.verde;
    } else if (falta > 0) {
      rotulo = 'FALTAM ' + falta + ' PONTOS'; corpo = 0x3a1418; aba = 0x5c2028; borda = 0xe8362c; cor = PAL.vermelho;
    } else {
      rotulo = 'ABRIR POR ' + precoDe(k); corpo = 0x3a3410; aba = 0x5c5320; borda = 0xf2c14e; cor = PAL.amarelo;
    }
    ladrilho(g, BOT.xGr, BOT.yGr, BOT.gr, BOT.hGr, corpo, aba, borda);
    // o ladrilho tem 272px, 22 letras de 12: todo recado acima cabe
    this.tStart.setText(rotulo).setColor(cor);
    // só o de jogar pisca: piscar é o convite, e convite só tem um
    this.tStart.setAlpha(1);
    if (this.piscaStart) { this.piscaStart.stop(); this.piscaStart = null; }
    if (aberto && !this.aviso) {
      this.piscaStart = this.tweens.add({ targets: this.tStart, alpha: 0.45,
        duration: 700, yoyo: true, repeat: -1 });
    }

    // as ferramentas, em azul apagado: ajudam, não são o jogo
    ladrilho(g, BOT.x0, BOT.y, BOT.tut, BOT.h, 0x161c2c, 0x222c44, 0x2e3c60);
    ladrilho(g, BOT.xTre, BOT.y, BOT.tre, BOT.h, 0x161c2c, 0x222c44, 0x2e3c60);
    // o EXPLORAR em verde apagado: é jogo, mas sem valer nada
    ladrilho(g, BOT.xExp, BOT.y, BOT.exp, BOT.h, 0x10261c, 0x1a3a2a, 0x2a6a48);
    ladrilho(g, BOT.xDir, BOT.y, BOT.som, BOT.h, SOM_LIGADO ? 0x161c2c : 0x111118,
      SOM_LIGADO ? 0x222c44 : 0x1a1a24, SOM_LIGADO ? 0x2e3c60 : 0x26263a);
    this.tSom.setColor(SOM_LIGADO ? PAL.branco : PAL.cinzaEsc);
    if (!SOM_LIGADO) {
      // o risco por cima, que é como se desenha "sem" desde sempre
      g.lineStyle(2, 0xe8362c, 1);
      g.beginPath();
      g.moveTo(BOT.xDir + 10, BOT.y + 8);
      g.lineTo(BOT.xDir + BOT.som - 10, BOT.y + BOT.h - 8);
      g.strokePath();
    }
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
    GameState.init(this.ordem[this.sel], this.gen[this.ordem[this.sel]]);
    // EXPLORAR: o mesmo começo, mas sem relógio, sem perder e sem valer ponto
    GameState.explorar = !!explorar;
    if (!explorar) Missoes.novaCorrida();   // partida de verdade: zera o que era "numa corrida"
    this.scene.start('Estacao', { onde: 'saguao' });
  },

  update: function (time, delta) {
    Ctrl.update();
    this.tempoAnim += delta;
    if (this.avisoT > 0) {
      this.avisoT -= delta;
      if (this.avisoT <= 0) { this.aviso = null; this.atualiza(); }
    }
    // o escolhido anda no lugar; o travado fica parado
    var k = this.ordem[this.sel];
    this.heroi.setFrame(destravado(k) ? 1 + (Math.floor(this.tempoAnim / 220) % 2) : 0);
    // as setas respiram de leve, pra dizer que dá pra passar
    var a = 0.55 + 0.35 * Math.sin(this.tempoAnim / 300);
    this.tSetas[0].setAlpha(a); this.tSetas[1].setAlpha(a);

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
