/* global Phaser */
/* Catraca — o celular, em primeira pessoa

   O trajeto tinha destino, mas o destino era dado: casa de manhã,
   trabalho de tarde, sempre igual. Aqui é onde a vida entra no meio do
   caminho — a mãe pede a farmácia, o chefe antecipa a reunião, a
   resenha muda de bar — e vira o destino da perna.

   A tela é o celular na sua mão: moldura, barra de status com a hora do
   jogo, e três abas embaixo. Enquanto ele está aberto o jogo congela,
   igual à pausa: no metrô de verdade também é assim, você para de olhar
   pra onde está indo quando abre o ZipZap.

   Como a cena de jogo fica pausada por baixo, aqui o teclado é ouvido
   direto por evento — cena pausada não atualiza tecla nenhuma. */

var ABAS_ZAP = ['ZAP', 'MAPA', 'GRANA'];

/* a moldura e as faixas: tudo medido uma vez só, e todo mundo lê daqui */
var ZAP = {
  x0: 16, x1: 304, y0: 36, y1: 552,   // moldura
  tx0: 26, tx1: 294,                  // tela útil
  ty0: 62, ty1: 528,
  status: 62, topo: 92, abas: 486
};

var ZapScene = new Phaser.Class({
  Extends: Phaser.Scene,
  initialize: function ZapScene() { Phaser.Scene.call(this, { key: 'Zap', active: false }); },

  create: function () {
    var self = this;
    this.aba = 0;
    this.sel = 0;
    this.fio = null;          // conversa aberta, se alguma
    this.congeladas = [];

    this.scene.manager.getScenes(true).forEach(function (sc) {
      var k = sc.scene.key;
      if (k === 'Zap' || k === 'Hud') return;
      self.congeladas.push(k);
      self.scene.pause(k);
    });

    this.g = this.add.graphics().setDepth(2400);
    this.tStatus = txt(this, ZAP.tx0 + 6, ZAP.status + 4, '', PAL.cinza, 8).setDepth(2402);
    this.tHora = txt(this, ZAP.tx1 - 6, ZAP.status + 4, '', PAL.branco, 8).setDepth(2402).setOrigin(1, 0);

    /* Um punhado de linhas dá conta das três abas; reaproveitar os
       mesmos objetos evita criar e destruir texto a cada toque, que no
       celular aparece como engasgo. Dezoito é o maior uso: a aba da
       grana gasta duas por item. */
    this.linhas = [];
    for (var i = 0; i < 18; i++) {
      this.linhas.push(txt(this, ZAP.tx0 + 10, 0, '', PAL.branco, 8).setDepth(2402).setVisible(false));
    }
    this.tRodape = txtC(this, GW / 2, ZAP.abas - 26, '', PAL.cinzaEsc, 8).setDepth(2402);

    // as três abas são zonas de toque; o resto da tela fecha o celular
    this.zonas = [];
    for (i = 0; i < ABAS_ZAP.length; i++) {
      var largura = Math.floor((ZAP.tx1 - ZAP.tx0) / ABAS_ZAP.length);
      var z = this.add.zone(ZAP.tx0 + i * largura, ZAP.abas, largura, 40).setOrigin(0, 0).setInteractive();
      (function (idx) {
        z.on('pointerdown', function () { self.aba = idx; self.fio = null; self.sel = 0; sfx('catraca'); self.pinta(); });
      })(i);
      this.zonas.push(z);
    }
    // uma zona por linha da lista, pra abrir conversa no toque
    this.zonasLinha = [];
    for (i = 0; i < 6; i++) {
      var zl = this.add.zone(ZAP.tx0, ZAP.topo + i * 62, ZAP.tx1 - ZAP.tx0, 58).setOrigin(0, 0).setInteractive();
      (function (idx) {
        zl.on('pointerdown', function () {
          if (self.aba !== 0 || self.fio) return;
          var caixa = GameState.zap || [];
          if (idx >= caixa.length) return;
          self.sel = idx; self.abre();
        });
      })(i);
      this.zonasLinha.push(zl);
    }
    // botão de aceitar / voltar, dentro da conversa
    this.zonaOk = this.add.zone(ZAP.tx0 + 20, ZAP.abas - 62, (ZAP.tx1 - ZAP.tx0) - 40, 52)
      .setOrigin(0, 0).setInteractive();
    this.zonaOk.on('pointerdown', function () { if (self.fio) self.confirma(); });

    this.input.keyboard.on('keydown', function (ev) {
      var c = ev.code;
      if (c === 'Escape' || c === 'KeyP' || c === 'KeyX') { self.fecha(); return; }
      if (c === 'KeyA' || c === 'ArrowLeft') { self.trocaAba(-1); return; }
      if (c === 'KeyD' || c === 'ArrowRight') { self.trocaAba(1); return; }
      if (c === 'KeyW' || c === 'ArrowUp') { self.move(-1); return; }
      if (c === 'KeyS' || c === 'ArrowDown') { self.move(1); return; }
      if (c === 'Space' || c === 'Enter' || c === 'KeyZ') {
        if (self.fio) self.confirma(); else if (self.aba === 0) self.abre();
      }
    });

    this.pinta();
  },

  trocaAba: function (d) {
    if (this.fio) { this.fio = null; this.pinta(); return; }
    this.aba = (this.aba + d + ABAS_ZAP.length) % ABAS_ZAP.length;
    this.sel = 0;
    sfx('catraca');
    this.pinta();
  },

  move: function (d) {
    if (this.fio) return;
    var n = (GameState.zap || []).length;
    if (this.aba !== 0 || !n) return;
    this.sel = (this.sel + d + n) % n;
    sfx('catraca');
    this.pinta();
  },

  abre: function () {
    var caixa = GameState.zap || [];
    if (this.aba !== 0 || !caixa.length) return;
    this.fio = caixa[Math.min(this.sel, caixa.length - 1)];
    this.fio.lida = true;
    sfx('ok');
    this.pinta();
  },

  /* Dentro da conversa o botão é um só: se tem compromisso e ainda não
     foi aceito, aceitar; senão, voltar pra lista. */
  confirma: function () {
    if (this.fio && this.fio.vai && !this.fio.aceito) {
      GameState.aceitaCompromisso(this.fio);
      sfx('moeda');
      this.pinta();
      return;
    }
    this.fio = null;
    sfx('catraca');
    this.pinta();
  },

  /* ---------- desenho ---------- */
  pinta: function () {
    var g = this.g; g.clear();
    var i;
    // âncora de volta ao padrão: as mesmas linhas são reusadas em abas
    // que alinham à esquerda, à direita e ao centro
    for (i = 0; i < this.linhas.length; i++) this.linhas[i].setVisible(false).setOrigin(0, 0);

    // o mundo lá fora, escurecido: você parou de olhar pra frente
    g.fillStyle(0x05050a, 0.82).fillRect(0, 0, GW, GH);

    // as duas mãos segurando, na base — é o que faz a cena ser primeira pessoa
    g.fillStyle(0x2a1e18, 1);
    g.fillRect(0, GH - 34, 44, 34); g.fillRect(GW - 44, GH - 34, 44, 34);
    g.fillStyle(0xc98d63, 1);
    g.fillRect(4, GH - 30, 38, 30); g.fillRect(GW - 42, GH - 30, 38, 30);
    g.fillStyle(0xb07a55, 1);
    g.fillRect(4, GH - 30, 38, 3); g.fillRect(GW - 42, GH - 30, 38, 3);

    // a moldura do aparelho
    g.fillStyle(0x000000, 0.5).fillRect(ZAP.x0 + 3, ZAP.y0 + 4, ZAP.x1 - ZAP.x0, ZAP.y1 - ZAP.y0);
    g.fillStyle(0x17171f, 1).fillRect(ZAP.x0, ZAP.y0, ZAP.x1 - ZAP.x0, ZAP.y1 - ZAP.y0);
    g.fillStyle(0x2c2c3a, 1).fillRect(ZAP.x0, ZAP.y0, ZAP.x1 - ZAP.x0, 3);
    g.fillStyle(0x0a0a12, 1).fillRect(ZAP.tx0, ZAP.ty0 - 12, ZAP.tx1 - ZAP.tx0, ZAP.ty1 - ZAP.ty0 + 12);
    // alto-falante e botão
    g.fillStyle(0x3a3a4c, 1).fillRect(GW / 2 - 16, ZAP.y0 + 9, 32, 3);
    g.fillStyle(0x3a3a4c, 1).fillRect(GW / 2 - 11, ZAP.y1 - 18, 22, 3);

    // barra de status: a hora do celular é a hora do jogo
    g.fillStyle(0x101a16, 1).fillRect(ZAP.tx0, ZAP.status, ZAP.tx1 - ZAP.tx0, 22);
    this.tStatus.setText('ZIPZAP');
    this.tHora.setText(GameState.char ? GameState.hora() : '--:--');

    if (this.aba === 0) this.pintaZap(g);
    else if (this.aba === 1) this.pintaMapa(g);
    else this.pintaGrana(g);

    this.pintaAbas(g);
  },

  linha: function (i, y, texto, cor) {
    var t = this.linhas[i];
    t.setVisible(true).setPosition(ZAP.tx0 + 10, y).setText(texto).setColor(cor || PAL.branco);
    return t;
  },

  /* ---------- aba 1: as conversas ---------- */
  pintaZap: function (g) {
    var caixa = GameState.zap || [];
    var i;

    if (this.fio) {
      // conversa aberta: o nome no topo e os balões embaixo
      g.fillStyle(0x14231c, 1).fillRect(ZAP.tx0, ZAP.topo - 8, ZAP.tx1 - ZAP.tx0, 26);
      this.linha(0, ZAP.topo - 4, (this.fio.grupo ? '# ' : '') + this.fio.nome, PAL.verde);
      var y = ZAP.topo + 32;
      for (i = 0; i < this.fio.msgs.length && i < 8; i++) {
        var largura = Math.min(ZAP.tx1 - ZAP.tx0 - 24, this.fio.msgs[i].length * 12 + 14);
        g.fillStyle(0x1e2c26, 1).fillRect(ZAP.tx0 + 8, y - 4, largura, 24);
        g.fillStyle(0x2a3d34, 1).fillRect(ZAP.tx0 + 8, y - 4, largura, 2);
        this.linha(i + 1, y, this.fio.msgs[i], PAL.branco);
        y += 30;
      }
      if (this.fio.vai) {
        var jaVai = this.fio.aceito;
        g.fillStyle(jaVai ? 0x16321f : 0x2a2410, 1)
          .fillRect(ZAP.tx0 + 20, ZAP.abas - 62, (ZAP.tx1 - ZAP.tx0) - 40, 52);
        g.lineStyle(2, jaVai ? 0x00e676 : 0xf2c14e, 1)
          .strokeRect(ZAP.tx0 + 20, ZAP.abas - 62, (ZAP.tx1 - ZAP.tx0) - 40, 52);
        this.linha(10, ZAP.abas - 58, jaVai ? '  ✓ VOCÊ VAI PRA' : '  ► TÁ BOM, EU VOU',
          jaVai ? PAL.verde : PAL.amarelo);
        this.linha(11, ZAP.abas - 36, jaVai ? '    ' + this.fio.vai.estacao : '    ' + this.fio.vai.rotulo,
          jaVai ? PAL.verde : PAL.cinza);
      } else {
        this.linha(10, ZAP.abas - 42, '  ' + nomeAgir() + ': VOLTAR', PAL.cinzaEsc);
      }
      this.tRodape.setText('');
      return;
    }

    if (!caixa.length) {
      this.linha(0, ZAP.topo + 40, '  NENHUMA MENSAGEM.', PAL.cinzaEsc);
      this.tRodape.setText('');
      return;
    }

    for (i = 0; i < caixa.length && i < 6; i++) {
      var f = caixa[i], y2 = ZAP.topo + i * 62, sel = (i === this.sel);
      g.fillStyle(sel ? 0x1b2a22 : 0x121820, 1).fillRect(ZAP.tx0, y2, ZAP.tx1 - ZAP.tx0, 58);
      g.fillStyle(0x0a0a12, 1).fillRect(ZAP.tx0, y2 + 58, ZAP.tx1 - ZAP.tx0, 2);
      if (sel) g.lineStyle(2, 0x00e676, 0.9).strokeRect(ZAP.tx0 + 1, y2 + 1, ZAP.tx1 - ZAP.tx0 - 2, 56);
      // a bolinha da foto do contato
      g.fillStyle(f.grupo ? 0x3a5a8a : 0x4a4a5e, 1).fillCircle(ZAP.tx0 + 22, y2 + 28, 15);
      g.fillStyle(0x6a6a80, 1).fillCircle(ZAP.tx0 + 22, y2 + 23, 6);
      g.fillStyle(0x6a6a80, 1).fillRect(ZAP.tx0 + 13, y2 + 31, 18, 10);
      this.linhas[i * 2].setVisible(true).setPosition(ZAP.tx0 + 46, y2 + 6)
        .setText((f.grupo ? '# ' : '') + f.nome).setColor(f.lida ? PAL.cinza : PAL.branco);
      this.linhas[i * 2 + 1].setVisible(true).setPosition(ZAP.tx0 + 46, y2 + 30)
        .setText(this.previa(f)).setColor(f.vai && !f.aceito ? PAL.amarelo : PAL.cinzaEsc);
      if (!f.lida) {
        g.fillStyle(0x00e676, 1).fillCircle(ZAP.tx1 - 16, y2 + 28, 6);
      }
    }
    this.tRodape.setText(naoLidas(caixa) + ' NÃO LIDA(S)');
  },

  // a prévia cabe em 18 caracteres; o resto vira reticências
  previa: function (f) {
    if (f.aceito) return '✓ ' + f.vai.estacao;
    var m = f.msgs[0] || '';
    return m.length > 18 ? m.slice(0, 17) + '...' : m;
  },

  /* ---------- aba 2: o mapa ----------
     Duas linhas verticais lado a lado, uma bolinha por estação, e a Sé
     ligando as duas. É o suficiente pra responder as três perguntas que
     importam: onde estou, pra onde vou, e falta muito. */
  pintaMapa: function (g) {
    if (!GameState.char) return;
    var linhas = ['azul', 'vermelha'];
    var topo = ZAP.topo + 34, alt = ZAP.abas - topo - 78;
    var eu = GameState.estacaoAtual(), alvo = GameState.destinoFinal();

    for (var l = 0; l < 2; l++) {
      var info = LINHAS[linhas[l]], n = info.estacoes.length;
      var cx = ZAP.tx0 + 48 + l * 120;
      g.fillStyle(info.num, 0.5).fillRect(cx - 2, topo, 4, alt);
      for (var i = 0; i < n; i++) {
        var y = topo + Math.round(i * (alt - 1) / (n - 1));
        var est = info.estacoes[i];
        var souEu = (est === eu && GameState.linha === linhas[l]);
        var ehAlvo = (est === alvo);
        var ehSe = (est === BALDEACAO);
        g.fillStyle(ehAlvo ? 0x00e676 : (ehSe ? 0xf2c14e : info.num), 1);
        g.fillCircle(cx, y, ehAlvo || souEu || ehSe ? 5 : 3);
        if (souEu) {
          g.lineStyle(2, 0xffffff, 1).strokeCircle(cx, y, 9);
          this.linhas[12].setVisible(true).setPosition(cx + 14, y - 9)
            .setText('VOCÊ').setColor(PAL.branco);
        }
        if (ehAlvo) {
          // só uma marca: o nome não cabe entre as duas linhas e
          // atravessaria por cima da outra
          g.lineStyle(2, 0x00e676, 1).strokeCircle(cx, y, 9);
          g.fillStyle(0x00e676, 1);
          g.fillTriangle(cx - 16, y - 5, cx - 16, y + 5, cx - 9, y);
        }
      }
      this.linhas[l].setVisible(true).setPosition(cx - 30, ZAP.abas - 56)
        .setText(l ? 'VERMELHA' : 'AZUL').setColor(l ? PAL.vermelho : '#5aa0e0');
    }

    this.linha(2, ZAP.topo, '► ' + GameState.rotuloDaPerna(), PAL.amarelo);
    this.linha(3, ZAP.topo + 18, '  ' + GameState.destinoFinal(), PAL.verde);
    this.tRodape.setText(GameState.faltamEstacoes() + ' ESTAÇÕES ATÉ ' + GameState.alvoAtual());
  },

  /* ---------- aba 3: a grana ----------
     Saiu do topo da tela e veio parar aqui: o HUD tinha quatro coisas
     disputando a segunda linha, e grana e dia são justamente as duas
     que não mudam nenhuma decisão no meio de um vagão. */
  pintaGrana: function (g) {
    if (!GameState.char) return;
    var c = GameState.char;
    var itens = [
      ['SALDO', 'R$ ' + GameState.dinheiro.toFixed(2).replace('.', ',')],
      ['TARIFA', c.tarifa === 0 ? 'GRÁTIS' : 'R$ ' + c.tarifa.toFixed(2).replace('.', ',')],
      ['VALE', GameState.valeRestante > 0 ? GameState.valeRestante + ' PASSAGENS' : 'ACABOU'],
      ['', ''],
      ['DIA', String(GameState.dia)],
      ['HOJE', GameState.rotuloDaPerna()],
      ['PONTOS', String(lePontos())]
    ];
    for (var i = 0; i < itens.length; i++) {
      var y = ZAP.topo + 10 + i * 34;
      if (!itens[i][0]) continue;
      g.fillStyle(0x121820, 1).fillRect(ZAP.tx0, y - 6, ZAP.tx1 - ZAP.tx0, 30);
      this.linhas[i].setVisible(true).setOrigin(0, 0).setPosition(ZAP.tx0 + 10, y)
        .setText(itens[i][0]).setColor(PAL.cinzaEsc);
      // 0..6 são os rótulos, 7..13 os valores, 14..17 as abas e o badge
      this.linhas[i + 7].setVisible(true).setOrigin(1, 0).setPosition(ZAP.tx1 - 10, y)
        .setText(itens[i][1]).setColor(PAL.branco);
    }
    this.tRodape.setText('');
  },

  pintaAbas: function (g) {
    var largura = Math.floor((ZAP.tx1 - ZAP.tx0) / ABAS_ZAP.length);
    g.fillStyle(0x111119, 1).fillRect(ZAP.tx0, ZAP.abas, ZAP.tx1 - ZAP.tx0, 40);
    for (var i = 0; i < ABAS_ZAP.length; i++) {
      var x = ZAP.tx0 + i * largura, sel = (i === this.aba);
      if (sel) {
        g.fillStyle(0x1b2a22, 1).fillRect(x, ZAP.abas, largura, 40);
        g.fillStyle(0x00e676, 1).fillRect(x, ZAP.abas, largura, 3);
      }
      var t = this.linhas[i + 14];
      t.setVisible(true).setOrigin(0.5, 0).setPosition(x + largura / 2, ZAP.abas + 12)
        .setText(ABAS_ZAP[i]).setColor(sel ? PAL.verde : PAL.cinzaEsc);
      // o badge de não lidas, igual ao de aplicativo
      if (i === 0) {
        var n = naoLidas(GameState.zap);
        if (n) {
          // no canto de cima da aba, como em aparelho de verdade
          g.fillStyle(0xe8362c, 1).fillCircle(x + largura - 12, ZAP.abas + 10, 8);
          this.linhas[17].setVisible(true).setOrigin(0.5, 0)
            .setPosition(x + largura - 12, ZAP.abas + 3).setText(String(n)).setColor(PAL.branco);
        }
      }
    }
  },

  fecha: function () {
    var self = this;
    this.congeladas.forEach(function (k) { self.scene.resume(k); });
    this.congeladas = [];
    sfx('porta');
    this.scene.stop('Zap');
  },

  update: function () {
    // fechar pelo botão do celular, pelo X, ou tocando fora do aparelho
    if (Ctrl.pausaJust) { Ctrl.pausaJust = false; this.fecha(); }
  }
});
