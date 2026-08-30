/* global Phaser */
/* Catraca — tela de título, escolha e loja de personagens */

/* As duas abas de gênero, medidas juntas: 'MULHER' tem 6 letras a 12
   pixels, e a aba precisa caber a palavra com folga de dedo dos dois
   lados. */
var GEN_ABA = { w: 88, h: 24 };

/* ---------- a fileira de botões do rodapé ----------
   Do Crossy Road: o menu dele não tem linha de texto nenhuma — tem
   ladrilho, e o ladrilho grande do meio é o que você joga. Aqui as três
   coisas que a tela de título faz (jogar, rever o tutorial, calar o
   som) eram três linhas de texto espalhadas em cantos diferentes, e a
   de jogar era a palavra "toque fora", que é instrução, não botão.

   O ladrilho do meio é o único que muda de assunto: personagem aberto
   diz JOGAR, personagem travado diz o preço, e o aviso de um instante
   toma o lugar dos dois. */
var BOT = { h: 42, y: GH - 50, gr: 168, pq: 46, vao: 8 };
BOT.x0 = Math.round((GW - (BOT.pq * 2 + BOT.gr + BOT.vao * 2)) / 2);
BOT.xGr = BOT.x0 + BOT.pq + BOT.vao;
BOT.xDir = BOT.xGr + BOT.gr + BOT.vao;

var TitleScene = new Phaser.Class({
  Extends: Phaser.Scene,
  initialize: function TitleScene() { Phaser.Scene.call(this, { key: 'Title' }); },

  create: function () {
    Ctrl.liga(this);
    HUD_VISIVEL = false; CONTROLES_VISIVEIS = true;
    this.sel = 0;
    this.ordem = ['estudante', 'clt', 'senhor', 'ambulante', 'gestante', 'turista'];
    // o gênero de cada um, como ficou gravado da última partida
    this.gen = {};
    for (var q = 0; q < this.ordem.length; q++) this.gen[this.ordem[q]] = leGenero(this.ordem[q]);

    var eu = this;

    /* ---------- o fundo é o jogo ----------
       Outra do Crossy Road: lá o menu acontece DENTRO do mundo, com o
       boneco parado na grama. Aqui o fundo é a plataforma de verdade,
       a mesma arte da estação — trilho, faixa tátil, piso quadriculado —
       e não uma cor chapada com pontinhos. Ela é desenhada em faixas
       verticais de ponta a ponta, então duas cópias empilhadas emendam
       sem costura. O véu por cima é o que deixa o texto legível: fundo
       bonito que não dá pra ler é fundo ruim. */
    texturaDeCena(this, 'tit_fundo', GW, PLAT_ALT, function (gp) {
      EstacaoScene.prototype.pintaPlataforma.call(null, gp, null);
    });
    this.add.image(0, GH - PLAT_ALT, 'tit_fundo').setOrigin(0, 0).setDepth(-10);
    this.add.image(0, GH - PLAT_ALT * 2, 'tit_fundo').setOrigin(0, 0).setDepth(-10);

    var g = this.add.graphics();
    g.fillStyle(0x05050a, 0.78).fillRect(0, 0, GW, GH);

    /* A tela é uma pilha só, medida de cima pra baixo. Ela encolheu
       quando o elenco foi de quatro pra seis: a placa perdeu 28px e as
       cartas viraram duas fileiras de três. Carta espremida a 44px de
       largura não mostra boneco nenhum. */
    var y = 20, altPlaca = 78;

    // placa de estação com o nome do jogo
    g.fillStyle(0x06060c, 1).fillRect(0, y, GW, altPlaca);
    g.fillStyle(0x0b5fae, 1).fillRect(0, y, GW, 6);
    g.fillStyle(num(clarear('#0b5fae', 0.4)), 1).fillRect(0, y, GW, 2);
    g.fillStyle(0xe8362c, 1).fillRect(0, y + altPlaca - 6, GW, 6);
    g.fillStyle(num(clarear('#e8362c', 0.4)), 1).fillRect(0, y + altPlaca - 6, GW, 2);
    /* Texto desta fonte ocupa três vezes o tam em altura: 'CATRACA' em
       tam 20 come 60px, e o subtítulo a 38px dele estava entrando por
       baixo das letras. A pilha inteira abaixo é medida assim. */
    txtC(this, GW / 2, y + 2, 'CATRACA', PAL.branco, 20);
    txtC(this, GW / 2, y + 46, 'METRÔ DE SÃO PAULO', PAL.cinza, 8);
    y += altPlaca + 4;

    /* ---------- o placar e a bolsa ----------
       No alto, um de cada lado, como o placar e as moedas do Crossy
       Road: à esquerda o seu recorde, à direita quanto você tem pra
       gastar em personagem — com a moeda desenhada do lado, que é a
       mesma que se cata no chão do vagão. Ponto que não se vê não é
       moeda; é número. */
    this.tTopo = txt(this, 8, y, '', PAL.cinza, 8);
    texturasDoChao(this);
    this.add.image(GW - 74, y + 11, 'caido_moeda').setDepth(1);
    this.tPontos = txt(this, GW - 8, y, '', PAL.amarelo, 8).setOrigin(1, 0);
    y += 22;

    var cardW = 96, cardH = 76, vao = 6, porLinha = 3;
    var x0 = Math.round((GW - (cardW * porLinha + vao * (porLinha - 1))) / 2);
    this.gCards = this.add.graphics().setDepth(1);
    this.cards = [];
    for (var i = 0; i < this.ordem.length; i++) {
      var col = i % porLinha, lin = Math.floor(i / porLinha);
      var cx = x0 + col * (cardW + vao), cy = y + lin * (cardH + vao);
      var sp = this.add.sprite(cx + cardW / 2, cy + cardH - 8,
        spriteChar(this.ordem[i], this.gen[this.ordem[i]]), 0)
        .setOrigin(0.5, 1).setDepth(2);
      this.cards.push({ x: cx, y: cy, w: cardW, h: cardH, sp: sp, k: this.ordem[i] });

      // a zona clicável avisa a cena pra escolher em vez de começar
      var zona = this.add.zone(cx, cy, cardW, cardH).setOrigin(0, 0).setInteractive();
      (function (self, idx) {
        zona.on('pointerdown', function () {
          if (self.sel === idx) self.tentaComprar();
          else { self.escolhe(idx); self.ignoraAct = true; }
        });
      })(this, i);
    }
    y += cardH * 2 + vao + 2;

    this.tNome = txtC(this, GW / 2, y, '', PAL.amarelo, 16);
    /* 44 e não 34: a tinta do nome em tam 16 vai de y+8 a y+44, e as
       abas de gênero entravam por cima dela. Medido, não estimado. */
    y += 44;

    /* ---------- o gênero ----------
       Fica colado no nome porque é parte do nome: quem escolhe a idosa
       está escolhendo a IDOSA, não ligando uma opção.

       Era '◄ HOMEM ►' em cinza, e ninguém achava: no meio de uma pilha
       de texto, uma linha de texto não parece um controle — parece
       legenda. Agora são as DUAS opções lado a lado, num par de abas,
       com a escolhida acesa. Ver as duas é o que diz que há escolha, e
       você toca direto na que quer em vez de adivinhar que aquilo
       alterna. No teclado a tecla é G.

       A gestante mostra só a dela, apagada e sem toque: o verbo dela é
       estar grávida. */
    this.genY = y;
    /* Depth 3: as abas são desenhadas no gCards (depth 1) e as cartas
       são sprites em depth 2. Em depth 0 a palavra ficava por baixo da
       própria aba. */
    this.tGen = [
      txtC(this, GW / 2 - GEN_ABA.w / 2, y + 5, 'HOMEM', PAL.cinza, 8).setDepth(3),
      txtC(this, GW / 2 + GEN_ABA.w / 2, y + 5, 'MULHER', PAL.cinza, 8).setDepth(3)
    ];
    this.zonaGen = [];
    for (i = 0; i < 2; i++) {
      var zg = this.add.zone(GW / 2 - GEN_ABA.w + i * GEN_ABA.w, this.genY, GEN_ABA.w, GEN_ABA.h)
        .setOrigin(0, 0).setInteractive();
      (function (g) { zg.on('pointerdown', function () { eu.poeGenero(g); }); })(i ? 'f' : 'm');
      this.zonaGen.push(zg);
    }
    y += GEN_ABA.h + 4;
    /* O verbo que só este personagem tem. Escolher personagem passou a
       ser escolher como se joga, e isso precisa aparecer na hora da
       escolha — não no meio da terceira viagem. */
    this.tPoder = txtC(this, GW / 2, y, '', PAL.verde, 8);
    y += 21;
    this.tDesc = txtC(this, GW / 2, y, '', PAL.cinza, 8);
    this.tDesc.setWordWrapWidth(GW - 56).setAlign('center');
    /* 48 e não 46: a descrição quebra em duas linhas e a segunda vai
       até y+45. Com 46 ela encostava na primeira linha da ficha — dois
       pixels, que num tipo de 14 de altura é meia letra. */
    y += 48;

    /* Ficha em uma coluna. Em duas, a coluna tinha 136px pra caber
       'DESCANSO' mais '90/100' — 192px de texto — e o rótulo entrava
       no valor: saía 'GRAIR$ 14,00'. */
    /* PASSO entrou porque a velocidade sempre existiu e nunca aparecia
       em lugar nenhum: quem trocava de personagem sentia a diferença e
       não sabia dizer o quê. Agora a faixa vai de 62 (idoso) a 118
       (ambulante) e tem nome. */
    var passo = 17;
    this.fichaVal = [];
    var rotulos = ['GRANA', 'TARIFA', 'PASSO', 'CARISMA', 'DESCANSO'];
    for (i = 0; i < 5; i++) {
      var fy = y + i * passo;
      txt(this, 52, fy, rotulos[i], PAL.cinzaEsc, 8);
      this.fichaVal.push(txt(this, GW - 52, fy, '', PAL.branco, 8).setOrigin(1, 0));
    }
    y += passo * 4 + 20;

    /* ---------- os três ladrilhos ---------- */
    this.gBot = this.add.graphics().setDepth(1);
    this.tTut = txtC(this, BOT.x0 + BOT.pq / 2, BOT.y + 10, '?', PAL.branco, 8).setDepth(3);
    this.tStart = txtC(this, BOT.xGr + BOT.gr / 2, BOT.y + 10, '', PAL.branco, 8).setDepth(3);
    this.tSom = txtC(this, BOT.xDir + BOT.pq / 2, BOT.y + 10, 'SOM', PAL.branco, 8).setDepth(3);

    this.zonaTut = this.add.zone(BOT.x0, BOT.y, BOT.pq, BOT.h).setOrigin(0, 0).setInteractive();
    this.zonaTut.on('pointerdown', function () {
      try { localStorage.removeItem('metrosp_tutorial'); } catch (e) { }
      eu.flashLoja('COM TUTORIAL');
      sfx('ok');
      /* Sem isto o mesmo toque religava o tutorial E começava a partida:
         quem só queria saber o que aquilo fazia já estava na catraca. */
      eu.ignoraAct = true;
      eu.atualiza();
    });
    this.zonaSom = this.add.zone(BOT.xDir, BOT.y, BOT.pq, BOT.h).setOrigin(0, 0).setInteractive();
    this.zonaSom.on('pointerdown', function () {
      var liga = !SOM_LIGADO;
      ligaSom(liga); ligaMusica(liga);
      if (liga) sfx('ok');
      eu.ignoraAct = true;
      eu.atualiza();
    });
    /* O ladrilho do meio é o botão de jogar, e no travado é o de
       comprar: é o mesmo comando que o teclado já dava. */
    this.zonaStart = this.add.zone(BOT.xGr, BOT.y, BOT.gr, BOT.h).setOrigin(0, 0).setInteractive();
    this.zonaStart.on('pointerdown', function () { eu.comeca(); });

    // no teclado, G troca o gênero — a seta já é da escolha de carta
    this.teclaG = this.input.keyboard.addKey('G');

    this.atualiza();
    this.tempoAnim = 0;
  },

  /* Escolher troca a folha da carta na hora: a pessoa tem que VER quem
     vai jogar, não ler o nome de quem vai jogar. */
  poeGenero: function (g) {
    var k = this.ordem[this.sel];
    if (generosDe(k).indexOf(g) < 0) { sfx('nao'); this.ignoraAct = true; return; }
    if (this.gen[k] === g) { this.ignoraAct = true; return; }
    this.gen[k] = g;
    gravaGenero(k, g);
    this.cards[this.sel].sp.setTexture(spriteChar(k, g));
    sfx('catraca');
    this.ignoraAct = true;
    this.atualiza();
  },

  // a tecla G alterna, que é o que uma tecla só sabe fazer
  trocaGenero: function () {
    var k = this.ordem[this.sel];
    if (generosDe(k).length < 2) { sfx('nao'); return; }
    this.poeGenero(outroGenero(k, this.gen[k]));
  },

  escolhe: function (i) {
    if (i === this.sel) return;
    this.sel = i;
    sfx('catraca');
    this.atualiza();
  },

  /* Comprar é o mesmo comando de começar, na carta travada: quem
     escolhe um cadeado está pedindo pra abrir. */
  tentaComprar: function () {
    var k = this.ordem[this.sel];
    if (destravado(k)) return false;
    var r = compraPersonagem(k);
    if (r === 'ok') { sfx('vitoria'); this.flashLoja('DESTRAVADO!'); }
    else { sfx('nao'); this.flashLoja('NÃO DÁ AINDA'); }
    this.ignoraAct = true;
    this.atualiza();
    return true;
  },

  flashLoja: function (m) {
    this.aviso = m;
    this.avisoT = 1400;
  },

  atualiza: function () {
    var k = this.ordem[this.sel], c = CHARS[k], aberto = destravado(k);

    var g = this.gCards; g.clear();
    for (var j = 0; j < this.cards.length; j++) {
      var cd = this.cards[j], sel = (j === this.sel), livre = destravado(cd.k);
      g.fillStyle(sel ? 0x1b2438 : 0x12121c, 1).fillRect(cd.x, cd.y, cd.w, cd.h);
      g.fillStyle(sel ? 0x2b3a58 : 0x1a1a26, 1).fillRect(cd.x, cd.y, cd.w, 4);
      g.lineStyle(2, sel ? 0xf2c14e : 0x282838, 1);
      g.strokeRect(cd.x + 1, cd.y + 1, cd.w - 2, cd.h - 2);
      g.fillStyle(0x000000, 0.35).fillEllipse(cd.x + cd.w / 2, cd.y + cd.h - 8, 30, 8);
      /* O escolhido é maior. Além de dizer qual é o escolhido sem
         depender só da moldura amarela, é o que dá tamanho pro boneco
         na hora em que a pessoa está justamente olhando pra ele —
         inclusive pra decidir entre homem e mulher. */
      cd.sp.setScale(sel ? 1.4 : 1.0).setAlpha(livre ? (sel ? 1 : 0.5) : 0.18);
      if (!livre) {
        // cadeado: corpo e argola, no canto de cima
        var lx = cd.x + cd.w - 20, ly = cd.y + 8;
        g.fillStyle(0xf2c14e, 1).fillRect(lx, ly + 5, 12, 9);
        g.fillStyle(0x12121c, 1).fillRect(lx + 5, ly + 8, 2, 4);
        g.lineStyle(2, 0xf2c14e, 1).strokeRect(lx + 3, ly, 6, 6);
      }
    }

    var gsel = this.gen[k];
    this.tNome.setText(nomeDoChar(k, gsel)).setColor(aberto ? PAL.amarelo : PAL.cinzaEsc);
    /* As duas abas do gênero, com a escolhida acesa. Quem só tem um
       gênero mostra o dele apagado e sem toque. */
    var gs = generosDe(k), dois = gs.length > 1;
    for (var q = 0; q < 2; q++) {
      var qg = q ? 'f' : 'm', temEsta = gs.indexOf(qg) >= 0, aqui = (gsel === qg);
      this.tGen[q].setVisible(temEsta)
        .setColor(aqui ? (aberto ? PAL.bg : PAL.cinzaEsc) : PAL.cinza);
      var zx = GW / 2 - GEN_ABA.w + q * GEN_ABA.w;
      if (temEsta && dois) this.zonaGen[q].setInteractive();
      else this.zonaGen[q].disableInteractive();
      if (!temEsta) continue;
      g.fillStyle(aqui ? (aberto ? 0xf2c14e : 0x3a3a4a) : 0x14141e, 1)
        .fillRect(zx, this.genY, GEN_ABA.w, GEN_ABA.h);
      g.lineStyle(2, aqui ? (aberto ? 0xffe9a8 : 0x4a4a5c) : 0x2a2a3a, 1)
        .strokeRect(zx + 1, this.genY + 1, GEN_ABA.w - 2, GEN_ABA.h - 2);
    }
    /* Dois personagens dividem o mesmo verbo, e não jogam igual: a
       gestante nunca é recusada e a multidão se abre pra ela. Quando o
       personagem tem rótulo próprio, é o dele que aparece. */
    var pd = PODERES[c.poder] || {};
    var rotulo = c.poderRotulo || pd.nome;
    this.tPoder.setText(rotulo ? '► ' + rotulo : '').setColor(aberto ? PAL.verde : PAL.cinzaEsc);
    this.tDesc.setText(c.poderComo || pd.como || c.desc);
    var tarifa = c.tarifa === 0 ? 'GRÁTIS' : ('R$ ' + c.tarifa.toFixed(2).replace('.', ','));
    var vals = [
      'R$ ' + c.dinheiro.toFixed(2).replace('.', ','), tarifa,
      nomeDoPasso(c.velocidade),
      String(c.carisma), c.descanso + '/' + c.descansoMax
    ];
    for (var i = 0; i < vals.length; i++) this.fichaVal[i].setText(vals[i]);

    this.tTopo.setText('RECORDE: ' + GameState.recorde());
    this.tPontos.setText(String(lePontos()));
    this.pintaBotoes(aberto, k);
  },

  /* ---------- os ladrilhos do rodapé ----------
     Ladrilho de verdade: fundo, aba clara em cima, sombra embaixo e
     moldura. É o que faz o olho ver botão sem ninguém escrever "botão".
     O do meio muda de assunto conforme o personagem escolhido. */
  pintaBotoes: function (aberto, k) {
    var g = this.gBot; g.clear();
    function tile(x, w, corpo, aba, borda) {
      ladrilho(g, x, BOT.y, w, BOT.h, corpo, aba, borda);
    }

    /* O '?' aparece sempre, mesmo pra quem nunca jogou. Ele já apareceu
       e sumiu uma vez nesta tela, e some justamente pra quem procura;
       além disso três ladrilhos com um buraco no meio não parecem uma
       fileira, parecem um erro. */
    tile(BOT.x0, BOT.pq, 0x1b2438, 0x2b3a58, 0x3d5180);

    /* Verde é jogar, amarelo é comprar, e vermelho é o preço que você
       ainda não tem. A cor diz o que o toque vai fazer antes de a
       pessoa ler a palavra. */
    var falta = aberto ? 0 : (precoDe(k) - lePontos());
    var rotulo, corpo, aba, borda, cor;
    if (this.aviso) {
      rotulo = this.aviso; corpo = 0x3a3410; aba = 0x5c5320; borda = 0xf2c14e; cor = PAL.amarelo;
    } else if (aberto) {
      rotulo = '► JOGAR'; corpo = 0x14432c; aba = 0x1d6e42; borda = 0x00e676; cor = PAL.verde;
    } else if (falta > 0) {
      rotulo = 'FALTAM ' + falta; corpo = 0x3a1418; aba = 0x5c2028; borda = 0xe8362c; cor = PAL.vermelho;
    } else {
      rotulo = 'ABRIR: ' + precoDe(k); corpo = 0x3a3410; aba = 0x5c5320; borda = 0xf2c14e; cor = PAL.amarelo;
    }
    tile(BOT.xGr, BOT.gr, corpo, aba, borda);
    /* O ladrilho grande tem 168 pixels e a fonte gasta 12 por letra:
       são 14 letras cravadas, 13 com folga. Recado maior que isso
       quebra em duas linhas e sai por cima da moldura. */
    this.tStart.setText(rotulo.length > 13 ? rotulo.slice(0, 13) : rotulo).setColor(cor);
    // só o de jogar pisca: piscar é o convite, e convite só tem um
    this.tStart.setAlpha(1);
    if (this.piscaStart) { this.piscaStart.stop(); this.piscaStart = null; }
    if (aberto && !this.aviso) {
      this.piscaStart = this.tweens.add({ targets: this.tStart, alpha: 0.45,
        duration: 700, yoyo: true, repeat: -1 });
    }

    tile(BOT.xDir, BOT.pq, SOM_LIGADO ? 0x1b2438 : 0x14141e,
      SOM_LIGADO ? 0x2b3a58 : 0x1f1f2c, SOM_LIGADO ? 0x3d5180 : 0x2a2a3a);
    this.tSom.setColor(SOM_LIGADO ? PAL.branco : PAL.cinzaEsc);
    if (!SOM_LIGADO) {
      // o risco por cima, que é como se desenha "sem" desde sempre
      g.lineStyle(2, 0xe8362c, 1);
      g.beginPath();
      g.moveTo(BOT.xDir + 9, BOT.y + 9);
      g.lineTo(BOT.xDir + BOT.pq - 9, BOT.y + BOT.h - 9);
      g.strokePath();
    }
  },

  /* Começar é o mesmo comando em todo lugar: no ladrilho, na tecla e no
     toque fora. Na carta travada ele compra, que é o que a pessoa está
     pedindo ao escolher um cadeado. */
  comeca: function () {
    /* O toque no ladrilho chama isto E acende o Ctrl.act do mesmo dedo,
       que chama de novo no update seguinte: sem a trava o jogo começava
       duas vezes, com dois GameState.init. */
    if (this.saindo) return;
    if (this.tentaComprar()) return;
    this.saindo = true;
    audioOn(); sfx('ok');
    GameState.init(this.ordem[this.sel], this.gen[this.ordem[this.sel]]);
    this.scene.start('Estacao');
  },

  update: function (time, delta) {
    Ctrl.update();
    this.tempoAnim += delta;
    if (this.avisoT > 0) {
      this.avisoT -= delta;
      if (this.avisoT <= 0) { this.aviso = null; this.atualiza(); }
    }
    // só o escolhido anda no lugar; os outros ficam parados, mais apagados
    for (var j = 0; j < this.cards.length; j++) {
      this.cards[j].sp.setFrame(j === this.sel && destravado(this.cards[j].k)
        ? 1 + (Math.floor(this.tempoAnim / 220) % 2) : 0);
    }

    var n = this.ordem.length;
    if (Ctrl.leftJust) this.escolhe((this.sel + n - 1) % n);
    if (Ctrl.rightJust) this.escolhe((this.sel + 1) % n);
    if (Ctrl.upJust) this.escolhe((this.sel + n - 3) % n);
    if (Ctrl.downJust) this.escolhe((this.sel + 3) % n);

    if (this.teclaG && Phaser.Input.Keyboard.JustDown(this.teclaG)) { this.trocaGenero(); return; }

    if (Ctrl.actJust) {
      if (this.ignoraAct) { this.ignoraAct = false; return; }
      this.comeca();
    }
  }
});
