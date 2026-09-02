/* global Phaser */
/* Catraca — a encarada, por turnos

   O vagão já tinha três brigas, e as três eram de reflexo: a barra que
   enche, a sílaba que cai, o disfarce que estoura. Faltava a briga que
   de fato acontece num vagão lotado, que é lenta — duas pessoas paradas
   a vinte centímetros uma da outra, cada uma esperando a outra ceder.

   Isso não é reflexo, é turno. E turno tem tela própria: quem está
   encarando você em cima, você de costas embaixo, um medidor pra cada
   um e um menu de quatro opções. É a tela de batalha de RPG, e ela
   serve aqui porque a encarada de metrô É um combate por turnos —
   ninguém encosta em ninguém, e mesmo assim alguém perde.

   O que se mede não é vida, é PACIÊNCIA. E o que decide não é quem bate
   mais forte: é quem estoura primeiro. Quem estoura, no vagão, é quem
   está errado — não importa quem começou. É a mesma regra do carisma,
   que é o eixo do jogo inteiro, só que numa briga só. */

/* O menu é dois por dois, como em todo RPG que se preze, e cada opção é
   um jeito paulistano de responder a uma encarada.

   ENCARAR é o golpe forte e é o mais caro: encarar de volta cansa você
   também. IRONIA vale o que o seu carisma vale — quem tem lábia
   desmonta o outro sem levantar a voz, quem não tem só piora. RESPIRAR
   não machuca ninguém: ela te SEGURA. VAZAR sempre está lá, porque no
   metrô sempre está.

   A decisão de cada turno não vem da conta, vem dele. Antes de vir com
   tudo, ele avisa — enche o peito, dá um passo, respira fundo —, e é aí
   que RESPIRAR vale: quem se preparou leva metade. Sem esse aviso a
   briga virava apertar o mesmo botão até acabar, que é o defeito de
   todo combate por turnos mal feito. */
var GOLPES = [
  {
    nome: 'ENCARAR', cor: '#e8362c',
    txt: 'VOCÊ ENCAROU DE VOLTA,\nSEM PISCAR.',
    dano: [20, 26], custo: [6, 9]
  },
  {
    nome: 'IRONIA', cor: '#f2c14e',
    txt: '"IMAGINA, FIQUE\nÀ VONTADE."',
    ironia: true
  },
  {
    /* RESPIRAR não machuca ninguém, e é de propósito: quem só respira
       não ganha briga nenhuma. Ela serve pra AGUENTAR — o próximo
       golpe dele vem pela metade —, e cada vez que você conta até dez
       conta menos que a anterior. Dá pra fazer isso duas vezes numa
       briga, não dez. */
    nome: 'RESPIRAR', cor: '#00e676',
    txt: 'VOCÊ CONTOU ATÉ DEZ\nE SEGUROU A ONDA.',
    dano: [0, 0], cura: [14, 19], decai: 0.7, guarda: true
  },
  {
    nome: 'VAZAR', cor: '#8b90a6',
    txt: 'VOCÊ FOI PRO OUTRO\nVAGÃO E ACABOU.',
    fuga: true
  }
];

/* O repertório dele. Nenhum encosta em ninguém: é tudo cotovelo,
   mochila e volume de celular, que é como a briga de vagão acontece de
   verdade. */
var PROVOCACOES = [
  { txt: 'ELE ENCOSTOU A MOCHILA\nNA SUA CARA.', dano: [6, 9] },
  { txt: 'ELE PÔS O VIVA-VOZ\nNO ÚLTIMO VOLUME.', dano: [6, 10] },
  { txt: 'ELE PISOU NO SEU PÉ\nE NÃO PEDIU DESCULPA.', dano: [6, 10] },
  { txt: 'ELE ABRIU AS PERNAS\nE TOMOU DOIS LUGARES.', dano: [5, 8] },
  { txt: '"TÁ OLHANDO O QUÊ?"', dano: [7, 11] },
  { txt: 'ELE SUSPIROU ALTO,\nOLHANDO BEM PRA VOCÊ.', dano: [4, 8] },
  { txt: 'ELE ENCOSTOU NA PORTA\nE NÃO SAIU DE LÁ.', dano: [5, 9] }
];

/* A tela, medida de uma vez só. O adversário mora em cima à direita e
   você embaixo à esquerda — é a diagonal que todo RPG usa, e ela
   funciona porque separa os dois sem precisar de linha divisória. */
var ENC = {
  arena: { x: 8, y: 60, w: GW - 16, h: 262 },
  eleSp: { x: 236, y: 190, escala: 2.2 },
  vcSp: { x: 92, y: 310, escala: 2.6 },
  /* A ficha tem três fileiras de 24 — nome, rótulo, medidor —, e 24 é
     a altura da CAIXA do texto, não a da tinta dele. Medido pela tinta
     (14px), o medidor entrava por cima da palavra PACIÊNCIA. */
  eleCx: { x: 16, y: 66, w: 176, h: 58 },
  vcCx: { x: 132, y: 234, w: 176, h: 58 },
  msg: { x: 8, y: 330, w: GW - 16, h: 70 },
  menu: { x: 10, y: 408, w: 148, h: 42, vaoX: 4, vaoY: 4 }
};
function menuCelula(i) {
  var m = ENC.menu;
  return {
    x: m.x + (i % 2) * (m.w + m.vaoX),
    y: m.y + Math.floor(i / 2) * (m.h + m.vaoY),
    w: m.w, h: m.h
  };
}

function sorteia(faixa) {
  return faixa[0] + Math.random() * (faixa[1] - faixa[0]);
}

var EncaradaScene = new Phaser.Class({
  Extends: Phaser.Scene,
  initialize: function EncaradaScene() { Phaser.Scene.call(this, { key: 'Encarada', active: false }); },

  /* Quem chama passa o sprite e o nome de quem está encarando, e o que
     fazer quando acabar. A cena de baixo fica pausada: encarada não é
     coisa que se resolve andando. */
  init: function (dados) {
    this.dados = dados || {};
    this.congeladas = [];
  },

  create: function () {
    var self = this, i;
    var d = this.dados;

    this.scene.manager.getScenes(true).forEach(function (sc) {
      var k = sc.scene.key;
      if (k === 'Encarada' || k === 'Hud') return;
      self.congeladas.push(k);
      self.scene.pause(k);
    });

    /* A paciência dele cresce com a corrida: no décimo dia o vagão está
       mais cheio e as pessoas menos dispostas. A sua sai do carisma —
       quem tem o vagão do lado dele aguenta mais tempo antes de
       estourar, porque não está sozinho. */
    var dif = GameState.dificuldade();
    this.ele = { max: 100, pac: 100, nome: d.nome || 'PASSAGEIRO' };
    this.ele.max = this.ele.pac = Math.round(86 + dif * 10);
    this.vc = { max: 100, pac: 100, nome: nomeDoChar(GameState.charKey, GameState.genero) };
    this.vc.max = this.vc.pac = Math.round(55 + GameState.carisma * 0.25);
    // o que a barra mostra agora: ela escorre até o valor, não pula
    this.mostraEle = this.ele.pac;
    this.mostraVc = this.vc.pac;

    this.sel = 0;
    this.fase = 'menu';
    this.t = 0;
    this.turnos = 0;
    this.acabou = false;
    this.querSair = false;
    this.respiros = 0;
    this.avisado = false;    // ele avisou que vem com tudo no próximo
    this.guardando = false;  // e você se preparou pra isso
    // sem isto o resultado da briga anterior sobrevive ao relaunch e o
    // vagão recebe de volta o desfecho de outra pessoa
    this.resultado = null;

    this.g = this.add.graphics().setDepth(2000);

    this.spEle = this.add.sprite(ENC.eleSp.x, ENC.eleSp.y, d.sprite || 'np_pax2', FILEIRA_DIR.down)
      .setOrigin(0.5, 1).setScale(ENC.eleSp.escala).setDepth(2002);
    /* Você aparece de costas, que é como todo RPG põe quem está
       jogando — e aqui sai de graça: a vista de costas do boneco já
       existe desde o primeiro dia, é a de andar pra cima. */
    this.spVc = this.add.sprite(ENC.vcSp.x, ENC.vcSp.y, spriteJogador(), FILEIRA_DIR.up)
      .setOrigin(0.5, 1).setScale(ENC.vcSp.escala).setDepth(2002);

    this.tEleNome = txt(this, ENC.eleCx.x + 10, ENC.eleCx.y + 2, this.ele.nome, PAL.branco, 8).setDepth(2004);
    this.tVcNome = txt(this, ENC.vcCx.x + 10, ENC.vcCx.y + 2, this.vc.nome, PAL.branco, 8).setDepth(2004);
    /* O rótulo do medidor, um de cada lado. Ele não muda nunca, mas
       precisa estar escrito: o que está em jogo aqui não é vida, e uma
       barra sem nome seria lida como vida. */
    this.tPac = [
      txt(this, ENC.eleCx.x + 10, ENC.eleCx.y + 24, 'PACIÊNCIA', PAL.cinzaEsc, 8).setDepth(2004),
      txt(this, ENC.vcCx.x + 10, ENC.vcCx.y + 24, 'PACIÊNCIA', PAL.cinzaEsc, 8).setDepth(2004)
    ];
    this.tMsg = txt(this, ENC.msg.x + 14, ENC.msg.y + 14, '', PAL.branco, 8).setDepth(2004);

    this.tGolpes = [];
    for (i = 0; i < GOLPES.length; i++) {
      var c = menuCelula(i);
      this.tGolpes.push(txt(this, c.x + 22, c.y + 12, GOLPES[i].nome, PAL.branco, 8).setDepth(2004));
      var z = this.add.zone(c.x, c.y, c.w, c.h).setOrigin(0, 0).setInteractive().setDepth(2005);
      (function (idx) {
        z.on('pointerdown', function () {
          if (self.fase !== 'menu') return;
          self.sel = idx;
          self.usa(idx);
        });
      })(i);
    }

    this.input.keyboard.on('keydown', function (ev) {
      if (self.fase !== 'menu') return;
      var c = ev.code;
      if (c === 'KeyA' || c === 'ArrowLeft') { self.move(-1); return; }
      if (c === 'KeyD' || c === 'ArrowRight') { self.move(1); return; }
      if (c === 'KeyW' || c === 'ArrowUp') { self.move(-2); return; }
      if (c === 'KeyS' || c === 'ArrowDown') { self.move(2); return; }
      if (c === 'Space' || c === 'Enter' || c === 'KeyZ') self.usa(self.sel);
    });
    // e o toque/clique que fecha a tela quando a briga acabou
    this.input.keyboard.on('keydown', function (ev) {
      if (self.fase !== 'fim' || self.t < 1600) return;
      if (ev.code === 'Space' || ev.code === 'Enter' || ev.code === 'KeyZ' || ev.code === 'Escape') self.querSair = true;
    });
    this.zonaSair = this.add.zone(0, 0, GW, GH).setOrigin(0, 0).setInteractive().setDepth(1999);
    this.zonaSair.on('pointerdown', function () {
      if (self.fase === 'fim' && self.t >= 1600) self.querSair = true;
    });

    this.diz(this.ele.nome + ' PAROU\nNA SUA FRENTE.');
    sfx('apito');
    this.pinta();
  },

  move: function (d) {
    this.sel = (this.sel + d + GOLPES.length) % GOLPES.length;
    sfx('catraca');
    this.pinta();
  },

  diz: function (m) { this.msg = m; if (this.tMsg) this.tMsg.setText(m); },

  /* ---------- um turno ----------
     Você age, ele responde. Entre uma coisa e outra a tela espera, e a
     espera é metade do que faz turno parecer turno: sem ela os dois
     golpes viram um só. */
  usa: function (i) {
    if (this.fase !== 'menu' || this.acabou) return;
    var g = GOLPES[i];
    this.turnos++;

    if (g.fuga) {
      this.acabou = true;
      this.diz(g.txt);
      GameState.addCarisma(-4);
      sfx('porta');
      this.fase = 'fim';
      this.t = 0;
      this.resultado = 'fugiu';
      this.pinta();
      return;
    }

    var dano;
    if (g.ironia) {
      /* A ironia vale o que o seu carisma vale. Com carisma baixo ela
         sai pela culatra, e é justo: quem não tem lábia e tenta ter
         piora a própria situação. */
      var car = GameState.carisma;
      if (car < 35 && Math.random() < 0.45) {
        this.diz('NÃO TEVE GRAÇA.\nO VAGÃO OLHOU PRA VOCÊ.');
        this.vc.pac -= 7;
        sfx('nao');
        this.fase = 'ele'; this.t = 0; this.pinta();
        return;
      }
      dano = 8 + car * 0.16;
    } else {
      dano = sorteia(g.dano);
    }

    this.ele.pac -= dano;
    if (g.custo) this.vc.pac -= sorteia(g.custo);
    if (g.cura) {
      var cura = sorteia(g.cura) * Math.pow(g.decai || 1, this.respiros);
      this.respiros++;
      this.vc.pac = Math.min(this.vc.max, this.vc.pac + cura);
    }
    this.guardando = !!g.guarda;
    this.diz(g.txt);
    sfx(g.cura ? 'ok' : 'empurra');

    this.fase = 'voce';
    this.t = 0;
    this.pinta();
  },

  vezDele: function () {
    /* Ele aperta quando está perdendo: encurralado, o sujeito do vagão
       não fica mais educado. */
    var mult = this.ele.pac < this.ele.max * 0.4 ? 1.25 : 1;
    var txto;

    if (this.avisado) {
      // o golpe que ele avisou. Quem respirou leva metade.
      this.avisado = false;
      var forte = sorteia([16, 22]) * mult * (this.guardando ? 0.45 : 1);
      this.vc.pac -= forte;
      txto = this.guardando
        ? 'ELE VEIO COM TUDO,\nMAS VOCÊ TAVA PRONTO.'
        : 'ELE VEIO COM TUDO\nE VOCÊ NÃO ESPERAVA.';
      sfx(this.guardando ? 'caixa' : 'erro');
    } else {
      var p = PROVOCACOES[Math.floor(Math.random() * PROVOCACOES.length)];
      this.vc.pac -= sorteia(p.dano) * mult * (this.guardando ? 0.6 : 1);
      txto = p.txt;
      sfx('empurra');
      /* E de vez em quando ele avisa. O aviso é o que faz o turno ser
         uma decisão: dá pra atacar assim mesmo e apanhar, ou parar um
         turno pra aguentar. */
      if (Math.random() < 0.42) {
        this.avisado = true;
        txto = txto.split('\n')[0] + '\nE ENCHEU O PEITO...';
      }
    }
    this.guardando = false;
    this.diz(txto);
    this.fase = 'ele';
    this.t = 0;
  },

  ganhou: function () {
    this.acabou = true;
    this.resultado = 'ganhou';
    var pts = GameState.ganhaMinigame(7 + Math.max(0, 8 - this.turnos));
    GameState.addCarisma(10);
    GameState.stats.causos++;
    this.diz('ELE DESVIOU O OLHO\nE FOI PRO OUTRO VAGÃO.\n+' + pts + ' PONTOS');
    sfx('vitoria');
    this.fase = 'fim';
    this.t = 0;
  },

  empatou: function () {
    this.acabou = true;
    this.resultado = 'empatou';
    GameState.addCarisma(3);
    GameState.stats.causos++;
    this.diz('O TREM PAROU E ELE\nDESCEU SEM DIZER NADA.');
    sfx('porta');
    this.fase = 'fim';
    this.t = 0;
  },

  perdeu: function () {
    this.acabou = true;
    this.resultado = 'perdeu';
    GameState.addCarisma(-12);
    GameState.addDescanso(-8);
    GameState.stats.causos++;
    /* Meio coração, o mesmo do guardinha menorzinho: perder a encarada
       não é ser preso, é sair mal da história. */
    perdeVida(this, this.spVc, 0.5);
    this.diz('VOCÊ ESTOUROU.\nO VAGÃO INTEIRO VIU,\nE O ERRADO VIROU VOCÊ.');
    sfx('erro');
    this.fase = 'fim';
    this.t = 0;
  },

  fecha: function () {
    var self = this;
    this.congeladas.forEach(function (k) { self.scene.resume(k); });
    var cb = this.dados.aoFechar, r = this.resultado;
    this.scene.stop('Encarada');
    if (cb) cb(r);
  },

  update: function (time, delta) {
    var dt = Math.min(delta, 50);
    this.t += dt;

    // as barras escorrem até o valor, em vez de pular
    var vel = 0.06 * dt;
    this.mostraEle += Phaser.Math.Clamp(this.ele.pac - this.mostraEle, -vel * 60, vel * 60);
    this.mostraVc += Phaser.Math.Clamp(this.vc.pac - this.mostraVc, -vel * 60, vel * 60);

    if (this.fase === 'voce' && this.t > 800) {
      if (this.ele.pac <= 0) { this.ganhou(); }
      else this.vezDele();
    } else if (this.fase === 'ele' && this.t > 800) {
      if (this.vc.pac <= 0) this.perdeu();
      /* Doze turnos e o trem chegou em alguma estação. Sem este teto,
         quem só respira fica ali pra sempre: RESPIRAR não tira paciência
         de ninguém, então a briga nunca acabaria sozinha. */
      else if (this.turnos >= 12) this.empatou();
      else { this.fase = 'menu'; this.diz('O QUE VOCÊ FAZ?'); }
    } else if (this.fase === 'fim' && this.t > 1600) {
      /* Cena por cima de cena pausada não recebe Ctrl atualizado, então
         o "toque pra seguir" tem tratador próprio (ver create). O tempo
         limite existe pra ninguém ficar preso numa tela sem menu. */
      if (this.querSair || this.t > 4200) { this.fecha(); return; }
    }

    this.pinta();
  },

  pinta: function () {
    var g = this.g; g.clear();
    var i;

    // o vagão lá fora, apagado: na encarada não existe mais nada
    g.fillStyle(0x05050a, 0.9).fillRect(0, 0, GW, GH);

    // a arena, com o piso do vagão sugerido em duas faixas
    var a = ENC.arena;
    caixa(g, a.x, a.y, a.w, a.h, 0x2b3648);
    g.fillStyle(0x141b28, 1).fillRect(a.x + 3, a.y + 3, a.w - 6, a.h - 6);
    g.fillStyle(0x1b2536, 1);
    for (var fy = a.y + 12; fy < a.y + a.h - 6; fy += 10) g.fillRect(a.x + 6, fy, a.w - 12, 4);
    // a sombra de cada um no chão: sem ela os dois flutuam
    g.fillStyle(0x000000, 0.4).fillEllipse(ENC.eleSp.x, ENC.eleSp.y - 2, 44, 12);
    g.fillStyle(0x000000, 0.4).fillEllipse(ENC.vcSp.x, ENC.vcSp.y - 2, 52, 14);

    this.pintaFicha(g, ENC.eleCx, this.mostraEle / this.ele.max);
    this.pintaFicha(g, ENC.vcCx, this.mostraVc / this.vc.max);

    caixa(g, ENC.msg.x, ENC.msg.y, ENC.msg.w, ENC.msg.h, 0xf2f0ff);

    /* No fim da briga o menu some: escolher golpe depois que acabou é
       oferecer uma decisão que não existe mais. */
    var mostraMenu = (this.fase === 'menu');
    for (i = 0; i < GOLPES.length; i++) {
      var c = menuCelula(i), mira = (i === this.sel);
      this.tGolpes[i].setVisible(mostraMenu)
        .setColor(mira ? GOLPES[i].cor : PAL.cinza);
      if (!mostraMenu) continue;
      g.fillStyle(mira ? 0x1b2438 : 0x11141d, 1).fillRect(c.x, c.y, c.w, c.h);
      g.lineStyle(2, mira ? num(GOLPES[i].cor) : 0x2a2a3a, 1)
        .strokeRect(c.x + 1, c.y + 1, c.w - 2, c.h - 2);
      if (mira) {
        g.fillStyle(num(GOLPES[i].cor), 1);
        g.fillTriangle(c.x + 9, c.y + 13, c.x + 9, c.y + 25, c.x + 17, c.y + 19);
      }
    }
    if (!mostraMenu && this.fase === 'fim' && this.t > 1600) {
      // e no lugar dele, como sair
      this.tGolpes[0].setVisible(true).setColor(PAL.cinzaEsc).setText(nomeAgir() + ' PRA SEGUIR');
      this.tGolpes[0].setPosition(ENC.menu.x + 22, ENC.menu.y + 12);
    } else if (this.tGolpes[0]) {
      this.tGolpes[0].setText(GOLPES[0].nome)
        .setPosition(menuCelula(0).x + 22, menuCelula(0).y + 12);
    }
  },

  /* Nome em cima, medidor embaixo. A cor do medidor conta a história
     sozinha: verde é quem está tranquilo, vermelho é quem está a um
     empurrão de estourar. */
  pintaFicha: function (g, cx, pct) {
    caixa(g, cx.x, cx.y, cx.w, cx.h, 0x8b90a6);
    var cor = pct > 0.5 ? 0x00e676 : (pct > 0.22 ? 0xf2c14e : 0xe8362c);
    /* O medidor ocupa a largura da ficha, embaixo do rótulo. Espremido
       ao lado da palavra PACIÊNCIA ele tinha 42 pixels, e um medidor de
       42 pixels não conta história nenhuma. */
    barra(g, cx.x + 10, cx.y + 46, cx.w - 20, 9, pct, cor, 0x1e1e2a);
  }
});
