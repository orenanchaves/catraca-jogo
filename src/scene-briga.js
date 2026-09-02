/* global Phaser */
/* Catraca — a briga, em tempo real

   A primeira versão desta briga era por turnos: ele avisava, você
   escolhia uma de três, resolvia. Foi cortada, e com razão — o jogo já
   lê o corpo do outro na encarada e na disputa da barra. Um terceiro
   duelo de tell-e-escolha seria pele nova em cima do mesmo verbo.

   Briga de vagão não é xadrez, é DISTÂNCIA. Você se aproxima pra
   alcançar e é justamente aí que fica ao alcance dele. Soco rápido pega
   perto e devolve o controle logo; soco forte alcança mais e machuca
   mais, mas te deixa aberto meio segundo — que é tempo pra tomar dois
   rápidos. Defesa segura quase tudo e prende você no lugar.

   Ninguém tem arma, e ninguém devia ter: é briga de metrô, e o que
   existe ali é corpo, espaço e as barras do vagão. */

var BRG = {
  chao: 330,                  // a linha do piso onde os dois pisam
  x0: 40, x1: 280,            // as paredes do vagão: não dá pra fugir
  vida: { x: 16, y: 62, w: GW - 32, h: 16 },
  msg: { x: 12, y: 96, w: GW - 24, h: 34 },
  bot: { y: 404, h: 100, vao: 6 }
};

/* Os três golpes. `alcance` é a distância em que a mão chega, `espera` é
   quanto tempo o braço leva pra sair, e `trava` é quanto tempo você fica
   sem poder fazer nada depois — é a trava que faz o soco forte ser uma
   aposta em vez de o botão certo. */
var GOLPES = {
  rapido: { nome: 'SOCO\nRÁPIDO', cor: 0xf2c14e, dano: 7, alcance: 46, espera: 90, trava: 210 },
  forte: { nome: 'SOCO\nFORTE', cor: 0xe8362c, dano: 16, alcance: 56, espera: 260, trava: 540 },
  defesa: { nome: 'DEFESA', cor: 0x0b9fdd, dano: 0, alcance: 0, espera: 0, trava: 0 }
};

function brigaCelula(i) {
  var b = BRG.bot, larg = Math.floor((GW - 16 - b.vao * 2) / 3);
  return { x: 8 + i * (larg + b.vao), y: b.y, w: larg, h: b.h };
}

var BrigaScene = new Phaser.Class({
  Extends: Phaser.Scene,
  initialize: function BrigaScene() { Phaser.Scene.call(this, { key: 'Briga', active: false }); },

  init: function (dados) {
    this.dados = dados || {};
    this.congeladas = [];
  },

  create: function () {
    var eu = this, i;
    var d = this.dados;

    this.scene.manager.getScenes(true).forEach(function (sc) {
      var k = sc.scene.key;
      if (k === 'Briga' || k === 'Hud') return;
      eu.congeladas.push(k);
      eu.scene.pause(k);
    });

    var dif = GameState.dificuldade();

    /* ---------- descanso É a sua vida aqui ----------
       Você entra na porrada com o corpo que tem. Quem passou o dia em pé
       começa machucado, e é isto que amarra o descanso ao único lugar do
       jogo onde ele não fazia diferença nenhuma. Nunca abaixo de um
       terço: entrar numa briga perdida de antemão não é dificuldade. */
    this.hpVc = Math.max(0.34, GameState.descanso / GameState.char.descansoMax);
    this.hpEle = 1;

    this.xVc = 120; this.xEle = 210;
    this.travaVc = 0; this.travaEle = 0;
    this.golpeVc = null; this.golpeEle = null;
    this.tGolpeVc = 0; this.tGolpeEle = 0;
    this.defendendo = false;
    this.eleDefende = false;
    this.acabou = false;
    this.resultado = null;
    this.t = 0;
    this.msg = 'ELE PARTIU PRA CIMA.';
    this.tremor = 0;

    /* Ele não é burro nem é máquina: pensa de tantos em tantos
       milissegundos e a cabeça dele fica mais rápida conforme a corrida
       anda. É o mesmo aperto do resto do jogo — não fica mais forte,
       fica mais rápido. */
    this.pensa = 0;
    /* 380 e nao 620. Medido: com 620 ele soca a cada 560ms e voce a cada
       300 (espera 90 + trava 210) — quase o dobro. Socar sem parar
       ganhava cinco em cinco. A briga nao precisava que ele batesse mais
       forte, precisava que ele batesse no MESMO ritmo: quem apanha na
       mesma cadencia em que bate tem que escolher a hora, e escolher a
       hora e a briga. */
    this.cadencia = Math.max(200, 380 - dif * 40);

    this.g = this.add.graphics().setDepth(2000);

    this.spVc = this.add.sprite(this.xVc, BRG.chao, spriteJogador(), FILEIRA_DIR.right)
      .setOrigin(0.5, 1).setScale(2.4).setDepth(2002);
    this.spEle = this.add.sprite(this.xEle, BRG.chao, d.sprite || sorteiaPax(), FILEIRA_DIR.left)
      .setOrigin(0.5, 1).setScale(2.4).setDepth(2002).setFlipX(true);

    this.tMsg = txtC(this, GW / 2, BRG.msg.y + 10, this.msg, PAL.branco, 8).setDepth(2004);
    this.tMsg.setWordWrapWidth(BRG.msg.w - 20).setAlign('center');

    /* ---------- os botões ----------
       Semitransparentes de propósito: numa briga em tempo real o dedo
       fica em cima deles a partida inteira, e botão opaco nesse tamanho
       tapa um terço do vagão. Você precisa VER o outro se aproximando
       enquanto aperta. */
    this.tBot = [];
    this.ordem = ['defesa', 'rapido', 'forte'];
    for (i = 0; i < 3; i++) {
      var c = brigaCelula(i);
      this.tBot.push(txtC(this, c.x + c.w / 2, c.y + c.h - 34,
        GOLPES[this.ordem[i]].nome, PAL.branco, 8).setMaxWidth(c.w).setAlign('center').setDepth(2005));
      var z = this.add.zone(c.x, c.y, c.w, c.h).setOrigin(0, 0).setInteractive().setDepth(2006);
      (function (idx) {
        z.on('pointerdown', function () { eu.aperta(idx, true); });
        z.on('pointerup', function () { eu.aperta(idx, false); });
        z.on('pointerout', function () { eu.aperta(idx, false); });
      })(i);
    }

    this.teclas = this.input.keyboard.addKeys('LEFT,RIGHT,A,D,Z,X,C,SPACE', true, true);
    sfx('nao');
  },

  /* defesa é botão de SEGURAR, os socos são de apertar: é o que faz
     defender custar o seu tempo em vez de ser grátis */
  aperta: function (i, apertando) {
    if (this.acabou) return;
    var chave = this.ordem[i];
    if (chave === 'defesa') { this.defendendo = apertando; return; }
    if (apertando) this.soca(chave);
  },

  /* ---------- o soco ANDA com voce ----------
     Medido antes de mexer: numa briga inteira, 70 socos meus e 70 vezes
     'PASSOU LONGE'. A distancia estabilizava em 48 e o soco rapido
     alcanca 46 — dois pixels, pra sempre. Ele parava a 52 porque so
     andava pra frente acima disso, e a 52 o forte DELE (56) alcanca e o
     rapido SEU (46) nao. A briga nao era dificil, era impossivel.

     E no celular nao havia conserto possivel: os tres botoes sao defesa,
     rapido e forte. Nao existe botao de andar. O jogo pedia uma
     aproximacao que o dedo nao tinha como fazer.

     Agora o soco carrega o corpo: se ele esta a ate 26px alem do
     alcance, voce entra junto com o braco. E o que um soco de briga e —
     ninguem soca parado no lugar — e resolve o alcance sem inventar um
     quarto botao. Alem de 26 continua passando longe, e ai a mensagem
     'PASSOU LONGE' vira informacao de verdade em vez de sentenca. */
  soca: function (chave) {
    if (this.travaVc > 0 || this.golpeVc || this.defendendo) return;
    var g = GOLPES[chave];
    var dist = Math.abs(this.xEle - this.xVc);
    if (dist > g.alcance && dist <= g.alcance + 26) {
      this.xVc = Phaser.Math.Clamp(this.xEle - (g.alcance - 4), BRG.x0, this.xEle - 26);
    }
    this.golpeVc = chave;
    this.tGolpeVc = 0;
    sfx('empurra');
  },

  /* o soco só existe no instante em que a mão chega: antes é braço
     saindo, depois é braço voltando */
  resolveGolpe: function (deQuem) {
    var g, alvoLonge, defende;
    if (deQuem === 'vc') {
      g = GOLPES[this.golpeVc];
      alvoLonge = Math.abs(this.xEle - this.xVc) > g.alcance;
      /* ---------- a guarda dele e REACAO, nao plano ----------
         Ela morava no `pensaEle`, que roda a cada 560ms. O soco rapido
         sai em 90. As duas janelas praticamente nunca se cruzavam, e o
         resultado medido foi que socar sem parar ganhava tres em tres,
         em seis segundos, sem o outro encostar. Botao unico apertado no
         talo nao pode ser a resposta certa de uma briga.

         Agora ele decide no instante em que a mao chega, que e quando um
         corpo decide de verdade. E so decide se estiver com as maos
         livres: braco fora ou travado, ele COME. E essa a janela que o
         jogo pede pra voce ler — bater quando ele se comprometeu. */
      if (!alvoLonge) {
        var livre = !(this.golpeEle || this.travaEle > 0);
        this.eleDefende = livre && Math.random() < (this.golpeVc === 'forte' ? 0.5 : 0.34);
      }
      defende = this.eleDefende;
      if (alvoLonge) { this.diz('PASSOU LONGE.'); }
      else {
        var dano = g.dano * (defende ? 0.18 : 1);
        this.hpEle = Math.max(0, this.hpEle - dano / 100);
        this.diz(defende ? 'ELE SEGUROU NA GUARDA.' : 'PEGOU EM CHEIO.');
        if (!defende) { this.tremor = 200; this.xEle = Math.min(BRG.x1, this.xEle + 10); }
        sfx(defende ? 'catraca' : 'batida');
      }
      /* Bater na guarda custa 70% mais tempo parado. Sem isso o soco na
         guarda saia de graca e insistir continuava sendo o certo — a
         guarda tem que doer em QUEM BATE, senao ela nao e guarda. */
      this.travaVc = g.trava * (defende && !alvoLonge ? 1.7 : 1);
      this.golpeVc = null;
    } else {
      g = GOLPES[this.golpeEle];
      alvoLonge = Math.abs(this.xEle - this.xVc) > g.alcance;
      defende = this.defendendo;
      if (!alvoLonge) {
        /* 0,30 no forte e nao 0,18: segurar a guarda o tempo todo era
           empate eterno — ele nao te tirava e voce nao podia socar de
           guarda erguida. Agora o forte atravessa o suficiente pra
           turtle perder devagar, que e o que faz baixar a guarda ser
           uma decisao em vez de um descuido. */
        var d2 = g.dano * (defende ? (this.golpeEle === 'forte' ? 0.30 : 0.18) : 1);
        this.hpVc = Math.max(0, this.hpVc - d2 / 100);
        this.diz(defende ? 'VOCÊ SEGUROU.' : 'ELE TE PEGOU.');
        if (!defende) {
          this.tremor = 260;
          this.xVc = Math.max(BRG.x0, this.xVc - 12);
          this.cameras.main.shake(200, 0.008);
        }
        sfx(defende ? 'catraca' : 'erro');
      }
      this.travaEle = g.trava;
      this.golpeEle = null;
    }
  },

  diz: function (m) { this.msg = m; if (this.tMsg) this.tMsg.setText(m); },

  /* ---------- a cabeça dele ----------
     Longe, ele anda pra cima. Na distância do soco, escolhe: rápido é o
     padrão, forte é aposta e ele só arrisca quando você está travado ou
     quando já está ganhando. E ele defende quando te vê armar. */
  pensaEle: function () {
    var dist = Math.abs(this.xEle - this.xVc);
    // a guarda dele agora e decidida no impacto, no `resolveGolpe`

    /* Ele fecha ate 40, que e DENTRO do rapido dos dois (46). O limite
       era `alcance + 6` = 52, e ali so o forte dele alcancava: ele
       estacionava num ponto em que batia e nao apanhava. Briga em que um
       dos dois escolhe a distancia nao e briga, e cerco.

       E andar nao pode mais custar o pensamento inteiro. Media anterior:
       socar sem parar ganhava OITO em oito, e o motivo nao era dano —
       era que cada soco seu empurra ele 10px pra fora do alcance, o seu
       proximo soco entra de graca (o soco anda com voce) e o dele gasta
       um ciclo so voltando. Um lado pagava o deslocamento e o outro nao.
       Agora ele anda E soca no mesmo pensamento, se o passo bastar. */
    if (dist > GOLPES.rapido.alcance - 6) {
      this.xEle = Math.max(this.xVc + 30, this.xEle - 22);
      dist = Math.abs(this.xEle - this.xVc);
    }
    if (this.travaEle > 0 || this.golpeEle) return;
    if (dist > GOLPES.rapido.alcance) return;
    var podeForte = (this.travaVc > 0) || (this.hpEle > this.hpVc);
    this.golpeEle = (podeForte && Math.random() < 0.4) ? 'forte' : 'rapido';
    this.tGolpeEle = 0;
    this.diz(this.golpeEle === 'forte' ? 'ELE ARMOU O BRAÇO.' : 'ELE VEIO PRA CIMA.');
  },

  ganhou: function () {
    this.acabou = true;
    this.resultado = 'ganhou';
    var pts = GameState.ganhaMinigame(8);
    /* ---------- ganhar briga também é perder ----------
       No metrô quem parte pra briga já perdeu: o vagão inteiro viu, e
       ninguém sai de lá com a razão. Vencer dá ponto e cobra carisma do
       mesmo jeito, e cobra o corpo. Briga que se ganha limpo não é briga
       de vagão, é jogo de luta. */
    GameState.addCarisma(-7);
    GameState.addDescanso(-12);
    GameState.stats.causos++;
    this.diz('ACABOU.\nE O VAGÃO INTEIRO VIU.\n+' + pts + ' PONTOS');
    sfx('vitoria');
  },

  perdeu: function () {
    this.acabou = true;
    this.resultado = 'perdeu';
    GameState.addCarisma(-9);
    GameState.addDescanso(-16);
    GameState.stats.minigamesPerdidos++;
    GameState.stats.causos++;
    perdeVida(this, this.spVc, 1);
    this.diz('VOCÊ FOI PRO CHÃO\nNO MEIO DO VAGÃO.');
    sfx('erro');
  },

  /* ---------- o vagao aparta ----------
     Medido: quem segura a guarda e nao larga fica ali PRA SEMPRE. Aos 48
     segundos de teste a briga continuava — ele nao atravessa a guarda
     rapido o bastante e voce, de guarda erguida, nao pode socar. Empate
     eterno com o jogo inteiro pausado atras.

     A saida nao e mexer no dano: e lembrar onde isso acontece. Briga de
     vagao dura vinte segundos porque o vagao APARTA — sempre teve gente
     em volta, e gente em volta separa. Aos 22s alguem mete o braco no
     meio, e ninguem ganha: os dois pagam o carisma de ter dado o
     espetaculo, ninguem perde coracao. E o unico dos tres fins que nao
     custa vida, porque nao houve nem vitoria nem chao. */
  apartaram: function () {
    this.acabou = true;
    this.resultado = 'apartou';
    GameState.addCarisma(-5);
    GameState.addDescanso(-8);
    GameState.stats.causos++;
    this.diz('O VAGÃO METEU O BRAÇO\nNO MEIO E SEPAROU OS DOIS.');
    sfx('apito');
  },

  fecha: function () {
    var eu = this;
    this.congeladas.forEach(function (k) { eu.scene.resume(k); });
    var cb = this.dados.aoFechar, r = this.resultado;
    this.scene.stop('Briga');
    if (cb) cb(r);
  },

  update: function (time, delta) {
    var dt = Math.min(delta, 50);
    this.t += dt;
    if (this.tremor > 0) this.tremor -= dt;

    if (this.acabou) {
      if (this.t > 900 && (Ctrl.actJust || this.teclas.Z.isDown || this.teclas.SPACE.isDown)) this.fecha();
      Ctrl.update();
      this.pinta();
      return;
    }
    Ctrl.update();

    // andar: aproximar é o que dá alcance, e é o que te põe ao alcance
    var anda = 0;
    if (!this.defendendo && this.travaVc <= 0 && !this.golpeVc) {
      if (Ctrl.left || this.teclas.LEFT.isDown || this.teclas.A.isDown) anda = -1;
      if (Ctrl.right || this.teclas.RIGHT.isDown || this.teclas.D.isDown) anda = 1;
    }
    if (anda) {
      this.xVc = Phaser.Math.Clamp(this.xVc + anda * 78 * dt / 1000, BRG.x0, this.xEle - 26);
    }
    // teclado: Z rápido, X forte, C defesa
    if (this.teclas.Z.isDown) this.soca('rapido');
    if (this.teclas.X.isDown) this.soca('forte');
    this.defendendo = this.defendendo || this.teclas.C.isDown;

    if (this.travaVc > 0) this.travaVc -= dt;
    if (this.travaEle > 0) this.travaEle -= dt;

    if (this.golpeVc) {
      this.tGolpeVc += dt;
      if (this.tGolpeVc >= GOLPES[this.golpeVc].espera) this.resolveGolpe('vc');
    }
    if (this.golpeEle) {
      this.tGolpeEle += dt;
      if (this.tGolpeEle >= GOLPES[this.golpeEle].espera) this.resolveGolpe('ele');
    }

    this.pensa += dt;
    if (this.pensa > this.cadencia) { this.pensa = 0; this.pensaEle(); }

    if (this.hpEle <= 0) this.ganhou();
    else if (this.hpVc <= 0) this.perdeu();
    else if (this.t > 22000) this.apartaram();

    this.pinta();
  },

  pinta: function () {
    var g = this.g; g.clear();
    var tr = this.tremor > 0 ? (Math.random() - 0.5) * 4 : 0;

    // o vagão em corte de lado: piso, parede e as barras de apoio
    g.fillStyle(0x0b0b12, 0.96).fillRect(0, 44, GW, GH - 44);
    g.fillStyle(0x2a3550, 1).fillRect(0, 150, GW, BRG.chao - 150);
    g.fillStyle(0x1e2740, 1).fillRect(0, 150, GW, 6);
    for (var jx = 20; jx < GW; jx += 84) {
      g.fillStyle(0x0d1119, 1).fillRect(jx, 176, 54, 46);
      g.fillStyle(0x161d2b, 1).fillRect(jx + 3, 179, 48, 40);
    }
    for (var bx = 56; bx < GW; bx += 96) {
      g.fillStyle(num(PAL.metalSom), 1).fillRect(bx, 150, 7, BRG.chao - 150);
      g.fillStyle(num(PAL.metal), 1).fillRect(bx, 150, 4, BRG.chao - 150);
    }
    g.fillStyle(0x33333f, 1).fillRect(0, BRG.chao, GW, GH - BRG.chao);
    g.fillStyle(0x3a3a48, 1).fillRect(0, BRG.chao, GW, 3);

    /* ---------- as duas vidas ----------
       A sua cresce da direita pra esquerda e a dele da esquerda pra
       direita, encostando no meio: é como se lê quem está por cima sem
       número nenhum. */
    var v = BRG.vida, meia = Math.round((v.w - 12) / 2);
    var hv = Math.round(meia * Phaser.Math.Clamp(this.hpVc, 0, 1));
    var he = Math.round(meia * Phaser.Math.Clamp(this.hpEle, 0, 1));
    g.fillStyle(0x1e1e2a, 1).fillRect(v.x, v.y, meia, v.h);
    g.fillStyle(0x1e1e2a, 1).fillRect(v.x + meia + 12, v.y, meia, v.h);
    g.fillStyle(0x00e676, 1).fillRect(v.x + meia - hv, v.y, hv, v.h);
    g.fillStyle(0xffffff, 0.25).fillRect(v.x + meia - hv, v.y + 1, hv, 4);
    g.fillStyle(0xe8362c, 1).fillRect(v.x + meia + 12, v.y, he, v.h);
    g.fillStyle(0xffffff, 0.25).fillRect(v.x + meia + 12, v.y + 1, he, 4);
    g.lineStyle(2, 0x08080e, 1).strokeRect(v.x + 1, v.y + 1, meia - 2, v.h - 2);
    g.lineStyle(2, 0x08080e, 1).strokeRect(v.x + meia + 13, v.y + 1, meia - 2, v.h - 2);
    g.fillStyle(0xf2f0ff, 0.8).fillRect(v.x + meia + 5, v.y + 3, 2, v.h - 6);

    caixa(g, BRG.msg.x, BRG.msg.y, BRG.msg.w, BRG.msg.h, 0xf2f0ff);

    // os dois, e o braço que sai quando o golpe está no ar
    this.spVc.x = Math.round(this.xVc + tr);
    this.spEle.x = Math.round(this.xEle - tr);
    this.spVc.setAlpha(this.travaVc > 0 ? 0.6 : 1);

    if (this.golpeVc) {
      var gv = GOLPES[this.golpeVc];
      g.fillStyle(gv.cor, 1);
      g.fillRect(this.xVc + 10, BRG.chao - 62, gv.alcance - 6, 7);
    }
    if (this.golpeEle) {
      var ge = GOLPES[this.golpeEle];
      g.fillStyle(ge.cor, 0.85);
      g.fillRect(this.xEle - ge.alcance + 6, BRG.chao - 66, ge.alcance - 6, 7);
    }
    if (this.defendendo) {
      g.fillStyle(0x0b9fdd, 0.5).fillRect(this.xVc + 14, BRG.chao - 76, 8, 44);
    }
    if (this.eleDefende) {
      g.fillStyle(0x0b9fdd, 0.4).fillRect(this.xEle - 22, BRG.chao - 76, 8, 44);
    }

    /* Os botões: contorno aceso e miolo quase transparente. É briga em
       tempo real, o dedo mora em cima deles, e botão opaco deste tamanho
       tapa um terço do vagão. */
    for (var i = 0; i < 3; i++) {
      var c = brigaCelula(i), k = this.ordem[i];
      var ativo = (k === 'defesa') ? this.defendendo : (this.golpeVc === k);
      var travado = (k !== 'defesa') && (this.travaVc > 0);
      g.fillStyle(GOLPES[k].cor, ativo ? 0.34 : 0.13).fillRect(c.x, c.y, c.w, c.h);
      g.lineStyle(2, GOLPES[k].cor, travado ? 0.25 : (ativo ? 1 : 0.6));
      g.strokeRect(c.x + 1, c.y + 1, c.w - 2, c.h - 2);
      this.tBot[i].setAlpha(travado ? 0.35 : 1);
      this.icone(g, k, c);
    }
    if (this.acabou && this.t > 900) {
      this.tBot[1].setText(nomeAgir() + '\nPRA SEGUIR');
    }
  },

  /* punho fechado pro rápido, punho maior e recuado pro forte, escudo
     pra defesa. Ícone antes da palavra: em briga não dá tempo de ler. */
  icone: function (g, k, c) {
    var cx = c.x + c.w / 2, cy = c.y + 30;
    g.fillStyle(GOLPES[k].cor, 1);
    if (k === 'defesa') {
      g.fillRect(cx - 10, cy - 12, 20, 14);
      g.fillTriangle(cx - 10, cy + 2, cx + 10, cy + 2, cx, cy + 14);
    } else if (k === 'rapido') {
      g.fillRect(cx - 4, cy - 8, 14, 14);
      g.fillRect(cx - 14, cy - 3, 10, 5);
    } else {
      g.fillRect(cx - 2, cy - 11, 18, 20);
      g.fillRect(cx - 16, cy - 4, 14, 7);
    }
  }
});
