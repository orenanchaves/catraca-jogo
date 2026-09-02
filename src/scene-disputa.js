/* global Phaser */
/* Catraca — a disputa da barra, cara a cara

   Barra de vagão cheio tem fila, e é aí que vira disputa: dois braços na
   mesma barra e um dos dois vai pro chão.

   Isso já existia, e era um botão só. A barra enchia enquanto você
   martelava a tela e esvaziava sozinha — ou seja, não havia adversário,
   havia um cronômetro com sprite. Duelo não é isso. Duelo é ler o outro.

   Agora são três botões grandes, do tamanho do polegar, e um triângulo
   entre eles:

       PUXAR vence FIRMAR · FIRMAR vence COTOVELO · COTOVELO vence PUXAR

   Quem está firme não ganha terreno, então quem puxa toma. Quem puxa
   está com o corpo aberto, então o cotovelo pega. E quem firma aguenta
   cotovelada. É a mesma lógica de qualquer briga de espaço, e ela é
   verdadeira antes de ser mecânica.

   O que faz isso ser jogo e não moeda é que ELE AVISA. Antes de cada
   rodada o corpo dele entrega o que vem — firma o pé, olha pro seu
   braço, arma o ombro — e você tem pouco mais de um segundo pra
   responder. Às vezes ele finge, e fingir fica mais comum conforme a
   corrida aperta. */

/* ---------- o duelo como dado ----------
   Os golpes, o triângulo de quem-vence-quem e o preço da vitória são
   DADO, não código. Isso nasceu de uma briga de porrada que chegou a
   existir aqui e foi cortada — ela virava um terceiro duelo de três
   botões com outro vocabulário, e o jogo já lê o corpo do outro na
   encarada e na disputa da barra. Pele nova, verbo repetido.

   A separação ficou porque é boa por si: quem quiser um duelo novo
   escreve dados, não uma cópia desta cena. */
var MODOS = {
  barra: {
    rotulo: 'A BARRA',
    golpes: [
      {
        chave: 'firmar', nome: 'FIRMAR', cor: '#0b9fdd',
        /* o que o corpo dele mostra quando é isto que vem */
        tel: 'ELE FIRMOU O PÉ.',
        fez: 'ELE SÓ SEGUROU.',
        /* dx é pra dentro da briga (negativo afasta da barra), esmaga é
           o corpo agachando. Firmar é baixar o centro de gravidade. */
        pose: { dx: 0, esmaga: 0.92, marca: 'pe' }
      },
      {
        chave: 'puxar', nome: 'PUXAR', cor: '#00e676',
        tel: 'ELE PEGOU A BARRA\nCOM AS DUAS MÃOS.',
        fez: 'ELE PUXOU A BARRA.',
        // puxar é ir pra cima da barra: o corpo avança e as mãos aparecem nela
        pose: { dx: 9, esmaga: 1, marca: 'maos' }
      },
      {
        chave: 'cotovelo', nome: 'COTOVELO', cor: '#e8362c',
        tel: 'ELE ARMOU O OMBRO.',
        fez: 'ELE METEU O COTOVELO.',
        // armar o ombro é recuar pra ganhar impulso, e a ponta aparece
        pose: { dx: -7, esmaga: 1, marca: 'ombro' }
      }
    ],
    /* puxar > firmar > cotovelo > puxar */
    vence: { puxar: 'firmar', firmar: 'cotovelo', cotovelo: 'puxar' },
    sujo: 'cotovelo',
    perder: 'VOCÊ SOLTOU A BARRA\nE FOI PRO CHÃO.'
  }
};

var DIS = {
  arena: { x: 8, y: 60, w: GW - 16, h: 268 },
  medidor: { x: 24, y: 76, w: GW - 48, h: 16 },
  vcSp: { x: 92, y: 262, escala: 2.4 },
  eleSp: { x: 228, y: 262, escala: 2.4 },
  msg: { x: 8, y: 336, w: GW - 16, h: 58 },
  bot: { y: 402, w: 100, h: 96, vao: 4 }   /* 100 porque COTOVELO tem 96px de texto */
};
function duelaCelula(i) {
  var b = DIS.bot, x0 = Math.round((GW - (b.w * 3 + b.vao * 2)) / 2);
  return { x: x0 + i * (b.w + b.vao), y: b.y, w: b.w, h: b.h };
}

var DisputaScene = new Phaser.Class({
  Extends: Phaser.Scene,
  initialize: function DisputaScene() { Phaser.Scene.call(this, { key: 'Disputa', active: false }); },

  init: function (dados) {
    this.dados = dados || {};
    this.congeladas = [];
  },

  create: function () {
    var self = this, i;
    var d = this.dados;

    this.scene.manager.getScenes(true).forEach(function (sc) {
      var k = sc.scene.key;
      if (k === 'Disputa' || k === 'Hud') return;
      self.congeladas.push(k);
      self.scene.pause(k);
    });

    /* o modo é o que separa a briga da disputa de barra, e é a única
       coisa que quem chama precisa dizer */
    this.modo = MODOS[d.modo] || MODOS.barra;
    this.golpes = this.modo.golpes;

    var dif = GameState.dificuldade();
    this.pos = 0.5;                 // 1 = a barra é sua, 0 = você foi pro chão
    /* ---------- descanso É a sua vida na briga ----------
       Você entra na porrada com o corpo que tem. Quem passou o dia em pé
       começa a briga já machucado, e é isso que amarra o eixo do
       descanso ao único lugar do jogo onde ele não fazia diferença
       nenhuma. Nunca abaixo de um terço: entrar numa briga perdida de
       antemão não é dificuldade, é castigo. */
    this.hpVc = Math.max(0.34, GameState.descanso / GameState.char.descansoMax);
    this.hpEle = 1;
    this.mostra = 0.5;
    /* A janela de resposta fecha conforme a corrida anda, e a chance de
       ele fingir sobe junto. É o mesmo aperto do resto do jogo: não fica
       mais forte, fica mais rápido. */
    this.janela = Math.max(620, 1250 - dif * 130);
    this.finta = Math.min(0.4, 0.08 + dif * 0.1);
    this.fase = 'avisa';
    this.t = 0;
    this.rodada = 0;
    this.sujeira = 0;   // quantas vezes ganhou no golpe feio
    this.acabou = false;
    this.resultado = null;
    this.querSair = false;
    this.escolha = null;
    this.dele = null;

    this.g = this.add.graphics().setDepth(2000);
    /* A marca do aviso mora ACIMA dos bonecos (2002). No mesmo Graphics
       do fundo ela ficava ATRÁS dele: o ombro armado saía como uma
       lasca branca de dois pixels espiando pelo lado da cabeça, que é o
       mesmo que não existir. */
    this.gMarca = this.add.graphics().setDepth(2003);

    this.spVc = this.add.sprite(DIS.vcSp.x, DIS.vcSp.y, spriteJogador(), FILEIRA_DIR.right)
      .setOrigin(0.5, 1).setScale(DIS.vcSp.escala).setDepth(2002);
    this.spEle = this.add.sprite(DIS.eleSp.x, DIS.eleSp.y, d.sprite || 'np_pax2', FILEIRA_DIR.left)
      .setOrigin(0.5, 1).setScale(DIS.eleSp.escala).setDepth(2002).setFlipX(true);

    this.tMsg = txt(this, DIS.msg.x + 14, DIS.msg.y + 12, '', PAL.branco, 8).setDepth(2004);
    // o rótulo desce pra não ficar embaixo do cursor do medidor
    this.tTopo = txtC(this, GW / 2, DIS.medidor.y + 28, this.modo.rotulo, PAL.cinzaEsc, 8).setDepth(2004);

    this.tBot = [];
    for (i = 0; i < this.golpes.length; i++) {
      var c = duelaCelula(i);
      /* -34 e não -22: os golpes da briga têm nome de duas linhas ('SOCO /
         FORTE'), e a 22 do fundo a segunda linha saía por baixo do botão. */
      this.tBot.push(txtC(this, c.x + c.w / 2, c.y + c.h - 34, this.golpes[i].nome, PAL.cinza, 8)
        .setMaxWidth(c.w).setAlign('center').setDepth(2004));
      var z = this.add.zone(c.x, c.y, c.w, c.h).setOrigin(0, 0).setInteractive().setDepth(2005);
      (function (idx) { z.on('pointerdown', function () { self.escolhe(idx); }); })(i);
    }

    this.input.keyboard.on('keydown', function (ev) {
      var c = ev.code;
      if (self.fase === 'fim') {
        if (c === 'Space' || c === 'Enter' || c === 'KeyZ' || c === 'Escape') self.querSair = true;
        return;
      }
      if (c === 'KeyA' || c === 'ArrowLeft' || c === 'Digit1') self.escolhe(0);
      else if (c === 'KeyW' || c === 'ArrowUp' || c === 'Space' || c === 'KeyZ' || c === 'Digit2') self.escolhe(1);
      else if (c === 'KeyD' || c === 'ArrowRight' || c === 'Digit3') self.escolhe(2);
    });
    this.zonaSair = this.add.zone(0, 0, GW, GH).setOrigin(0, 0).setInteractive().setDepth(1999);
    this.zonaSair.on('pointerdown', function () {
      if (self.fase === 'fim' && self.t >= 1200) self.querSair = true;
    });

    this.novaRodada();
    sfx('empurra');
  },

  /* ---------- uma rodada ----------
     Ele mostra o corpo, você responde dentro da janela, e o triângulo
     resolve. Não responder é perder a rodada: na barra, quem hesita
     solta. */
  novaRodada: function () {
    this.rodada++;
    this.dele = this.golpes[Math.floor(Math.random() * this.golpes.length)];
    /* A finta é o aviso mentindo. Sem ela o duelo vira tabela: bastava
       decorar três respostas e nunca mais errar. */
    this.vaiFingir = Math.random() < this.finta;
    this.telegrafado = this.vaiFingir
      ? this.golpes[Math.floor(Math.random() * this.golpes.length)]
      : this.dele;
    this.escolha = null;
    this.fase = 'avisa';
    this.t = 0;
    this.diz(this.telegrafado.tel);
  },

  diz: function (m) { this.msg = m; if (this.tMsg) this.tMsg.setText(m); },

  escolhe: function (i) {
    if (this.fase !== 'avisa' || this.escolha) return;
    this.escolha = this.golpes[i];
    if (this.modo.sujo && this.escolha.chave === this.modo.sujo) this.sujeira++;
    this.resolve();
  },

  resolve: function () {
    var meu = this.escolha, dele = this.dele, txto;

    if (!meu) {
      // não respondeu a tempo: na barra, quem hesita solta
      this.leva(0.15);
      txto = dele.fez + '\nVOCÊ NEM REAGIU.';
      sfx('nao');
    } else if (meu.chave === dele.chave) {
      txto = dele.fez + '\nOS DOIS TRAVARAM.';
      sfx('empurra');
    } else if (this.modo.vence[meu.chave] === dele.chave) {
      this.acerta(0.17);
      txto = dele.fez + '\nE VOCÊ LEVOU A MELHOR.';
      sfx('ok');
    } else {
      this.leva(0.17);
      txto = dele.fez + '\nE VOCÊ PERDEU O APOIO.';
      sfx('empurra');
    }
    if (this.vaiFingir && meu) txto = 'ERA FINTA. ' + txto.split('\n')[1];

    this.diz(txto);
    this.fase = 'mostra';
    this.t = 0;
  },

  /* Uma rodada ganha: no cabo de guerra a barra anda pro seu lado; na
     briga o soco entra nele, e é a vida DELE que desce. */
  acerta: function (q) {
    if (this.modo.vida) this.hpEle = Math.max(0, this.hpEle - (this.modo.dano || q));
    else this.pos += q;
  },
  leva: function (q) {
    if (this.modo.vida) this.hpVc = Math.max(0, this.hpVc - (this.modo.dano || q) * 0.9);
    else this.pos -= q;
  },

  ganhou: function () {
    this.acabou = true;
    this.resultado = 'ganhou';
    /* Cotovelada ganha rodada e custa reputação: o vagão inteiro vê.
       É o que impede o cotovelo de ser só o botão certo. */
    var pts = GameState.ganhaMinigame(7 + Math.max(0, 6 - this.rodada));
    GameState.stats.causos++;
    if (this.modo.vida) {
      /* ---------- ganhar briga também é perder ----------
         No metrô quem parte pra briga já perdeu: o vagão inteiro viu, e
         ninguém sai de lá com a razão. Vencer dá ponto e custa carisma
         do mesmo jeito, e ainda cobra o corpo. Briga que se ganha limpo
         não é briga de vagão, é jogo de luta. */
      GameState.addDescanso(-10);
      GameState.addCarisma(-7);
      this.diz('VOCÊ GANHOU.\nE O VAGÃO INTEIRO VIU.\n+' + pts + ' PONTOS');
    } else {
      GameState.addDescanso(3);
      GameState.addCarisma(4 - this.sujeira * 2);
      this.diz('A BARRA É SUA.\n+' + pts + ' PONTOS' +
        (this.sujeira ? '\n(E ' + this.sujeira + ' COTOVELADA' +
          (this.sujeira > 1 ? 'S' : '') + ')' : ''));
    }
    sfx('vitoria');
    this.fase = 'fim';
    this.t = 0;
  },

  perdeu: function () {
    this.acabou = true;
    this.resultado = 'perdeu';
    GameState.addDescanso(this.modo.vida ? -14 : -6);
    GameState.addCarisma(this.modo.vida ? -9 : -4);
    GameState.stats.minigamesPerdidos++;
    GameState.stats.causos++;
    perdeVida(this, this.spVc, 1);
    this.diz(this.modo.perder);
    sfx('erro');
    this.fase = 'fim';
    this.t = 0;
  },

  fecha: function () {
    var self = this;
    this.congeladas.forEach(function (k) { self.scene.resume(k); });
    var cb = this.dados.aoFechar, r = this.resultado;
    this.scene.stop('Disputa');
    if (cb) cb(r);
  },

  update: function (time, delta) {
    var dt = Math.min(delta, 50);
    this.t += dt;
    this.mostra += Phaser.Math.Clamp(this.pos - this.mostra, -0.004 * dt, 0.004 * dt);

    if (this.fase === 'avisa' && this.t > this.janela) { this.resolve(); }
    else if (this.fase === 'mostra' && this.t > 850) {
      if (this.modo.vida) {
        if (this.hpEle <= 0) this.ganhou();
        else if (this.hpVc <= 0) this.perdeu();
      } else if (this.pos >= 1) this.ganhou();
      else if (this.pos <= 0) this.perdeu();
      else this.novaRodada();
    } else if (this.fase === 'fim' && this.t > 1200) {
      if (this.querSair || this.t > 3800) { this.fecha(); return; }
    }

    this.pinta();
  },

  /* ---------- o aviso vira FORMA ----------
     O aviso era só a frase. Medido: o boneco dele ficava no quadro 6 em
     todas as fases, sempre, e o que se pedia era ler até 35 caracteres
     em duas linhas, decodificar qual golpe é esse, lembrar o triângulo e
     achar o botão — em 1120ms no primeiro dia e 620ms no fim. Isso não é
     ler o outro, é prova de leitura com cronômetro; e o CLAUDE.md já
     tinha a regra que isso quebra, que é forma antes de palavra.

     Agora o corpo dele faz a coisa: firmar agacha, puxar avança pra
     cima da barra, cotovelo recua pra armar. A frase continua embaixo
     porque ela ENSINA — na primeira vez você lê, depois só vê.

     A finta continua sendo o aviso mentindo, e agora mente com o corpo,
     que é o que uma finta é. */
  poseDoAviso: function () {
    var mostra = (this.fase === 'avisa') && this.telegrafado && this.telegrafado.pose;
    var q = mostra ? this.telegrafado.pose : null;
    // ele está à direita da barra, então avançar é ir pro x menor
    this.spEle.x = DIS.eleSp.x - (q ? q.dx : 0);
    this.spEle.setScale(DIS.eleSp.escala, DIS.eleSp.escala * (q ? q.esmaga : 1));
    return q;
  },

  /* a marca que o corpo dele deixa: pé plantado, mãos na barra, ombro
     armado. Desenhada e não escrita — é ela que chega antes da frase. */
  pintaMarca: function (g, q) {
    if (!q) return;
    /* ---------- a marca NÃO tem a cor do golpe ----------
       Tinha, e era uma armadilha: as mãos na barra saíam verdes, que é a
       cor do botão PUXAR — só que quem vence PUXAR é COTOVELO, o
       vermelho. O jogo pintava o aviso com a cor do botão errado, e em
       620ms o polegar vai na cor antes de a cabeça aplicar o triângulo.
       A cor pertence à SUA resposta; o corpo dele é só corpo. Quem
       identifica o golpe aqui é a FORMA — pé plantado, mãos na barra,
       ombro armado — que é o que se lê num relance. */
    var c = num(PAL.branco);
    var ex = this.spEle.x, ey = DIS.eleSp.y;
    if (q.marca === 'pe') {
      // os dois pés plantados: uma base larga embaixo dele
      g.fillStyle(c, 0.9).fillRect(ex - 22, ey - 3, 44, 5);
      g.fillStyle(c, 0.35).fillRect(ex - 30, ey + 3, 60, 3);
    } else if (q.marca === 'maos') {
      // as duas mãos fechadas na barra, uma acima da outra
      var bx = GW / 2 - 5;
      g.fillStyle(c, 1).fillRect(bx - 6, ey - 96, 22, 9);
      g.fillStyle(c, 1).fillRect(bx - 6, ey - 74, 22, 9);
    } else if (q.marca === 'ombro') {
      /* A ponta do ombro sai NA FRENTE dele, entre o corpo e a barra:
         é pra lá que ela vai. Em cima do corpo ela lia como enfeite. */
      g.fillStyle(c, 0.95);
      g.fillTriangle(ex - 44, ey - 82, ex - 20, ey - 95, ex - 20, ey - 69);
      g.fillStyle(c, 0.45).fillRect(ex - 20, ey - 92, 16, 20);
    }
  },

  pinta: function () {
    var g = this.g; g.clear();
    var i, a = DIS.arena;
    var pose = this.poseDoAviso();

    g.fillStyle(0x05050a, 0.9).fillRect(0, 0, GW, GH);
    caixa(g, a.x, a.y, a.w, a.h, 0x2b3648);
    g.fillStyle(0x141b28, 1).fillRect(a.x + 3, a.y + 3, a.w - 6, a.h - 6);

    /* A barra em disputa, no meio dos dois e do tamanho da briga: é o
       objeto do jogo, então ela é o que está no centro da tela. */
    var bx = GW / 2 - 5;
    g.fillStyle(0x000000, 0.35).fillRect(bx + 9, a.y + 30, 4, a.h - 50);
    g.fillStyle(num(PAL.metalSom), 1).fillRect(bx, a.y + 30, 10, a.h - 50);
    g.fillStyle(num(PAL.metal), 1).fillRect(bx, a.y + 30, 6, a.h - 50);
    g.fillStyle(num(PAL.metalLuz), 1).fillRect(bx + 1, a.y + 30, 2, a.h - 50);
    this.gMarca.clear();
    this.pintaMarca(this.gMarca, pose);

    var m = DIS.medidor;
    if (this.modo.vida) {
      /* ---------- duas vidas, e não um cabo de guerra ----------
         Cabo de guerra é um medidor só, e o que um ganha o outro perde.
         Numa briga os dois se machucam: dá pra ganhar acabado, e dá pra
         perder tendo quase ganhado. Isso só aparece com DUAS barras que
         descem independentes.
         A sua é verde e cresce da esquerda pra direita; a dele é
         vermelha e cresce da direita pra esquerda, encostando uma na
         outra — é como se lê "quem está por cima" sem número nenhum. */
      var meia = Math.round((m.w - 10) / 2);
      var hv = Math.round(meia * Phaser.Math.Clamp(this.hpVc, 0, 1));
      var he = Math.round(meia * Phaser.Math.Clamp(this.hpEle, 0, 1));
      g.fillStyle(0x1e1e2a, 1).fillRect(m.x, m.y, meia, m.h);
      g.fillStyle(0x1e1e2a, 1).fillRect(m.x + meia + 10, m.y, meia, m.h);
      g.fillStyle(0x00e676, 1).fillRect(m.x + meia - hv, m.y, hv, m.h);
      g.fillStyle(0xffffff, 0.25).fillRect(m.x + meia - hv, m.y + 1, hv, 4);
      g.fillStyle(0xe8362c, 1).fillRect(m.x + meia + 10, m.y, he, m.h);
      g.fillStyle(0xffffff, 0.25).fillRect(m.x + meia + 10, m.y + 1, he, 4);
      g.lineStyle(2, 0x08080e, 1).strokeRect(m.x + 1, m.y + 1, meia - 2, m.h - 2);
      g.lineStyle(2, 0x08080e, 1).strokeRect(m.x + meia + 11, m.y + 1, meia - 2, m.h - 2);
      // o VS no vão entre as duas
      g.fillStyle(0xf2f0ff, 0.8).fillRect(m.x + meia + 4, m.y + 4, 2, m.h - 8);
    } else {
      // o medidor: quanto da barra é sua
      g.fillStyle(0x1e1e2a, 1).fillRect(m.x, m.y, m.w, m.h);
      var meu = Math.round(m.w * Phaser.Math.Clamp(this.mostra, 0, 1));
      g.fillStyle(0x00e676, 1).fillRect(m.x, m.y, meu, m.h);
      g.fillStyle(0xe8362c, 1).fillRect(m.x + meu, m.y, m.w - meu, m.h);
      g.fillStyle(0xf2f0ff, 1).fillRect(m.x + meu - 1, m.y - 4, 3, m.h + 8);
      g.lineStyle(2, 0x08080e, 1).strokeRect(m.x + 1, m.y + 1, m.w - 2, m.h - 2);
    }

    // as duas mãos na barra, uma de cada lado, na altura do ombro.
    // Na briga não existe barra pra segurar: as mãos somem com ela.
    if (!this.modo.vida) {
      g.fillStyle(0xf2c14e, 1).fillRect(bx - 12, DIS.vcSp.y - 40, 14, 7);
      g.fillStyle(0xc98d63, 1).fillRect(bx + 8, DIS.eleSp.y - 46, 14, 7);
    }

    caixa(g, DIS.msg.x, DIS.msg.y, DIS.msg.w, DIS.msg.h, 0xf2f0ff);

    /* Os três botões. Grandes de propósito: é duelo de reação, e reação
       com botão pequeno é sorteio. Enquanto a janela corre, o contorno
       do botão escolhido acende e uma fita embaixo mostra o tempo. */
    var vivo = (this.fase === 'avisa');
    for (i = 0; i < this.golpes.length; i++) {
      var c = duelaCelula(i), sel = (this.escolha === this.golpes[i]);
      var cor = num(this.golpes[i].cor);
      this.tBot[i].setVisible(this.fase !== 'fim')
        .setColor(sel || vivo ? this.golpes[i].cor : PAL.cinzaEsc);
      if (this.fase === 'fim') continue;
      g.fillStyle(sel ? 0x1b2438 : 0x11141d, 1).fillRect(c.x, c.y, c.w, c.h);
      g.lineStyle(2, sel || vivo ? cor : 0x2a2a3a, 1).strokeRect(c.x + 1, c.y + 1, c.w - 2, c.h - 2);
      this.icone(g, i, c, sel || vivo ? cor : 0x3a3a4a);
    }
    if (vivo && !this.escolha) {
      // a fita do tempo, embaixo dos três: some conforme a janela fecha
      var b = DIS.bot, x0 = duelaCelula(0).x, larg = duelaCelula(2).x + b.w - x0;
      barra(g, x0, b.y + b.h + 6, larg, 6, 1 - this.t / this.janela, 0xf2c14e, 0x1e1e2a);
    }
    if (this.fase === 'fim' && this.t > 1200) {
      this.tBot[1].setVisible(true).setColor(PAL.cinzaEsc)
        .setText(nomeAgir() + ' PRA SEGUIR')
        .setPosition(GW / 2, DIS.bot.y + 30);
    } else if (this.tBot[1]) {
      this.tBot[1].setText(this.golpes[1].nome)
        .setPosition(duelaCelula(1).x + DIS.bot.w / 2, DIS.bot.y + DIS.bot.h - 34);
    }
  },

  /* Os três ícones, desenhados: escudo pra firmar, seta pra cima pra
     puxar, cunha apontando pro outro pra cotovelada. Ícone antes da
     palavra, porque em duelo não dá tempo de ler. */
  icone: function (g, i, c, cor) {
    var cx = c.x + c.w / 2, cy = c.y + 34;
    g.fillStyle(cor, 1);
    if (i === 0) {
      // escudo
      g.fillRect(cx - 15, cy - 18, 30, 20);
      g.fillTriangle(cx - 15, cy + 2, cx + 15, cy + 2, cx, cy + 18);
      g.fillStyle(0x11141d, 1);
      g.fillRect(cx - 9, cy - 12, 18, 12);
      g.fillTriangle(cx - 9, cy, cx + 9, cy, cx, cy + 10);
    } else if (i === 1) {
      // seta pra cima
      g.fillTriangle(cx, cy - 20, cx - 18, cy - 2, cx + 18, cy - 2);
      g.fillRect(cx - 7, cy - 2, 14, 20);
    } else {
      // cotovelo: o braço dobrado, apontando pro outro
      g.fillRect(cx - 16, cy - 16, 10, 24);
      g.fillRect(cx - 16, cy + 2, 26, 10);
      g.fillTriangle(cx + 8, cy - 6, cx + 8, cy + 20, cx + 20, cy + 7);
    }
  }
});
