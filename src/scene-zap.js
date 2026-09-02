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
/* O botão da resposta ocupa quase toda a largura útil da tela do
   celular: com a caixa estreita, "hj tô na correria" saía por cima da
   moldura do aparelho — e a moldura é a única coisa da tela que não
   pode ser atravessada. */
var ZAP_BOTAO = { dx: 8, dy: -92, alt: 30, altNota: 40, passo: 44, texto: 18 };

var ZAP = {
  x0: 16, x1: 304, y0: 36, y1: 552,   // moldura
  tx0: 26, tx1: 294,                  // tela útil
  ty0: 62, ty1: 528,
  status: 62, topo: 92, abas: 486
};

/* O botão da resposta tem 236 pixels úteis a 12 por caractere: dezessete
   letras depois da seta. Resposta escrita à mão maior que isso saía pela
   borda do celular, e a moldura do aparelho é a única coisa na tela que
   não pode ser atravessada. */
function rotuloResposta(t) {
  return '► ' + (t.length > 17 ? t.slice(0, 16) + '.' : t);
}

var ZapScene = new Phaser.Class({
  Extends: Phaser.Scene,
  initialize: function ZapScene() { Phaser.Scene.call(this, { key: 'Zap', active: false }); },

  create: function () {
    var self = this;
    this.aba = 0;
    this.sel = 0;
    this.fio = null;          // conversa aberta, se alguma
    this.opBotao = 0;         // qual das respostas está na mira
    this.congeladas = [];

    this.scene.manager.getScenes(true).forEach(function (sc) {
      var k = sc.scene.key;
      if (k === 'Zap' || k === 'Hud') return;
      self.congeladas.push(k);
      self.scene.pause(k);
    });

    this.g = this.add.graphics().setDepth(2400);
    this.tStatus = txt(this, ZAP.tx0 + 6, ZAP.status + 4, '', PAL.cinza, 8).setDepth(2402);
    this.tHora = txt(this, ZAP.tx1 - 34, ZAP.status + 4, '', PAL.branco, 8).setDepth(2402).setOrigin(1, 0);

    /* Um punhado de linhas dá conta das três abas; reaproveitar os
       mesmos objetos evita criar e destruir texto a cada toque, que no
       celular aparece como engasgo. Dezoito é o maior uso: a aba da
       grana gasta duas por item. */
    this.linhas = [];
    for (var i = 0; i < 18; i++) {
      this.linhas.push(txt(this, ZAP.tx0 + 10, 0, '', PAL.branco, 8).setDepth(2402).setVisible(false));
    }
    this.tRodape = txtC(this, GW / 2, ZAP.abas - 26, '', PAL.cinzaEsc, 8).setDepth(2402);

    /* A saída precisa estar ESCRITA. O aparelho ocupa a tela quase
       inteira, e as portas que ele tinha — o ✕, o botão de baixo, a
       faixa de fora — eram todas pequenas e mudas: quem não adivinhava
       ficava preso lá dentro. Esta linha mora na faixa de fora de baixo,
       que é ela própria uma das portas, entre as duas mãos. */
    this.tSaida = txtC(this, GW / 2, ZAP.y1 + 2, '▼ TOQUE PRA SAIR ▼', PAL.amarelo, 8)
      .setDepth(2402);

    /* ---------- guardar o celular ----------
       Isto não existia, e no celular não havia saída nenhuma: fechar
       dependia de Esc, P ou X, que são teclas — num aparelho de toque
       o ZipZap era uma sala sem porta. Agora há três portas, e todas
       são as que a pessoa já procuraria sozinha: o ✕ na barra de
       status, o botão embaixo do aparelho, e tocar fora dele. */
    this.zonaX = this.add.zone(ZAP.tx1 - 34, ZAP.status - 2, 38, 28)
      .setOrigin(0, 0).setInteractive();
    this.zonaX.on('pointerdown', function () { self.fecha(); });

    this.zonaBotao = this.add.zone(GW / 2 - 60, ZAP.y1 - 28, 120, 30)
      .setOrigin(0, 0).setInteractive();
    this.zonaBotao.on('pointerdown', function () { self.fecha(); });

    /* Fora do aparelho são quatro faixas, e não uma tela inteira por
       baixo: com a tela inteira, qualquer toque no meio de uma conversa
       vazia guardaria o celular sem querer.

       A faixa de cima abre um buraco na alça do celular do HUD (268..320,
       y até 26): aquele retângulo é da alça, que agora liga e desliga.
       Duas cenas ouvindo o mesmo toque fechavam e reabriam o aparelho no
       mesmo quadro. */
    var fora = [
      [0, 0, 268, ZAP.y0], [268, 0, GW - 268, 26],
      [0, ZAP.y1, GW, GH - ZAP.y1],
      [0, ZAP.y0, ZAP.x0, ZAP.y1 - ZAP.y0], [ZAP.x1, ZAP.y0, GW - ZAP.x1, ZAP.y1 - ZAP.y0]
    ];
    for (i = 0; i < fora.length; i++) {
      this.add.zone(fora[i][0], fora[i][1], fora[i][2], fora[i][3])
        .setOrigin(0, 0).setInteractive()
        .on('pointerdown', function () { self.fecha(); });
    }

    // as três abas são zonas de toque
    this.zonas = [];
    for (i = 0; i < ABAS_ZAP.length; i++) {
      var largura = Math.floor((ZAP.tx1 - ZAP.tx0) / ABAS_ZAP.length);
      var z = this.add.zone(ZAP.tx0 + i * largura, ZAP.abas, largura, 40).setOrigin(0, 0).setInteractive();
      (function (idx) {
        z.on('pointerdown', function () { self.aba = idx; self.fio = null; self.sel = 0; sfx('catraca'); self.pinta(); });
      })(i);
      this.zonas.push(z);
    }
    // o cabeçalho da conversa volta pra lista
    this.zonaVolta = this.add.zone(ZAP.tx0, ZAP.topo - 10, ZAP.tx1 - ZAP.tx0, 30)
      .setOrigin(0, 0).setInteractive();
    this.zonaVolta.on('pointerdown', function () {
      if (!self.fio) return;
      self.fio = null; self.opBotao = 0; sfx('catraca'); self.pinta();
    });

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
    /* Dois botões dentro da conversa, um em cima do outro: responder
       indo e responder que hoje não dá. Fora do compromisso, só um. */
    this.zonasBotao = [];
    for (i = 0; i < 2; i++) {
      var zb = this.add.zone(ZAP.tx0 + ZAP_BOTAO.dx, ZAP.abas + ZAP_BOTAO.dy + i * ZAP_BOTAO.passo,
        (ZAP.tx1 - ZAP.tx0) - ZAP_BOTAO.dx * 2, ZAP_BOTAO.altNota).setOrigin(0, 0).setInteractive();
      (function (idx) {
        zb.on('pointerdown', function () { if (self.fio) { self.opBotao = idx; self.confirma(); } });
      })(i);
      this.zonasBotao.push(zb);
    }

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
    if (this.fio) {
      var n = this.respostasDoFio().length;
      if (n < 2) return;
      this.opBotao = (this.opBotao + d + n) % n;
      sfx('catraca');
      this.pinta();
      return;
    }
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
    this.opBotao = 0;
    sfx('ok');
    this.pinta();
  },

  /* ---------- responder ----------
     O ZipZap era um mural: a mensagem chegava, você aceitava, e a sua
     resposta nunca existia — o que fazia a conversa parecer um aviso
     do sistema com nome de gente. Agora você responde, e o que você
     mandou fica no fio, do seu lado, em verde.

     Compromisso tem duas respostas, e as duas mudam o dia: dizer que
     vai troca o destino da perna; dizer que hoje não dá encerra o
     assunto e o dia segue a rotina. Conversa fiada tem uma só, que não
     muda nada além da conversa — e é justamente por isso que ela
     importa. */
  respostasDoFio: function () {
    var f = this.fio;
    if (!f) return [];
    if (f.respondido) return [{ rotulo: nomeAgir() + ': VOLTAR', cor: PAL.cinzaEsc, acao: 'volta' }];
    if (f.vai) {
      return [
        { rotulo: rotuloResposta(f.resSim), cor: PAL.verde, acao: 'sim', nota: f.vai.rotulo },
        { rotulo: rotuloResposta(f.resNao), cor: PAL.cinza, acao: 'nao' }
      ];
    }
    return [{ rotulo: rotuloResposta(f.resOk), cor: PAL.verde, acao: 'ok' }];
  },

  confirma: function () {
    var f = this.fio;
    if (!f) return;
    var ops = this.respostasDoFio();
    var op = ops[Math.min(this.opBotao, ops.length - 1)];

    if (op.acao === 'volta') { this.fio = null; sfx('catraca'); this.pinta(); return; }

    f.enviadas.push(op.acao === 'sim' ? f.resSim : (op.acao === 'nao' ? f.resNao : f.resOk));
    f.respondido = true;
    this.opBotao = 0;
    if (op.acao === 'sim') { GameState.aceitaCompromisso(f); sfx('moeda'); }
    else sfx('ok');
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
    // alto-falante, e o botão de guardar o celular
    g.fillStyle(0x3a3a4c, 1).fillRect(GW / 2 - 16, ZAP.y0 + 9, 32, 3);
    g.fillStyle(0x4a4a60, 1).fillRect(GW / 2 - 34, ZAP.y1 - 20, 68, 7);
    g.fillStyle(0x6e6e88, 1).fillRect(GW / 2 - 34, ZAP.y1 - 20, 68, 2);

    // barra de status: a hora do celular é a hora do jogo
    g.fillStyle(0x101a16, 1).fillRect(ZAP.tx0, ZAP.status, ZAP.tx1 - ZAP.tx0, 22);
    this.tStatus.setText('ZIPZAP');
    this.tHora.setText(GameState.char ? GameState.hora() : '--:--');
    /* O ✕ não existe na fonte do jogo, então ele é dois riscos — que é
       tudo que um ✕ é. Dois riscos cinza soltos na barra, porém, não
       pareciam clicáveis: ele ganhou moldura e ficou branco, que é o que
       separa um enfeite de um botão. */
    var xc = ZAP.tx1 - 15, yc = ZAP.status + 11;
    g.fillStyle(0x2a1418, 1).fillRect(xc - 13, yc - 10, 26, 20);
    g.lineStyle(1, 0xe8362c, 1).strokeRect(xc - 13, yc - 10, 26, 20);
    g.lineStyle(2, 0xf2f0ff, 1);
    g.beginPath(); g.moveTo(xc - 5, yc - 5); g.lineTo(xc + 5, yc + 5); g.strokePath();
    g.beginPath(); g.moveTo(xc + 5, yc - 5); g.lineTo(xc - 5, yc + 5); g.strokePath();

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
      /* A seta de voltar mora no nome, como em qualquer aplicativo de
         mensagem. Sem ela, a conversa com compromisso não tinha saída
         que não fosse responder: as duas opções eram sim e não, e
         nenhuma delas era "depois eu vejo". */
      this.linha(0, ZAP.topo - 4, '◄ ' + (this.fio.grupo ? '# ' : '') + this.fio.nome, PAL.verde);

      /* Os balões: o que chegou fica à esquerda, cinza; o que VOCÊ
         mandou fica à direita, verde. É a única coisa que faz uma tela
         de mensagens parecer uma conversa em vez de um mural. */
      var y = ZAP.topo + 32, n = 0;
      for (i = 0; i < this.fio.msgs.length && n < 9; i++, n++) {
        this.balao(g, n + 1, y, this.fio.msgs[i], false);
        y += 30;
      }
      for (i = 0; i < this.fio.enviadas.length && n < 9; i++, n++) {
        this.balao(g, n + 1, y, this.fio.enviadas[i], true);
        y += 30;
      }

      // e as respostas possíveis, uma por linha, com a mira na escolhida
      var ops = this.respostasDoFio();
      for (i = 0; i < ops.length; i++) {
        var by = ZAP.abas + ZAP_BOTAO.dy + i * ZAP_BOTAO.passo;
        var mira = (i === Math.min(this.opBotao, ops.length - 1));
        var cor = num(ops[i].cor);
        var bx = ZAP.tx0 + ZAP_BOTAO.dx, bw = (ZAP.tx1 - ZAP.tx0) - ZAP_BOTAO.dx * 2;
        var bh = ops[i].nota ? ZAP_BOTAO.altNota : ZAP_BOTAO.alt;
        g.fillStyle(mira ? 0x1b2a22 : 0x11161d, 1).fillRect(bx, by, bw, bh);
        g.lineStyle(2, mira ? cor : 0x2a2a3a, 1).strokeRect(bx, by, bw, bh);
        /* o texto começa dentro da caixa do botão, não na margem da
           tela: com o recuo em espaços a resposta longa encostava na
           borda direita da moldura */
        this.linha(10 + i * 2, by + 5, ops[i].rotulo, mira ? ops[i].cor : PAL.cinzaEsc)
          .setPosition(bx + 10, by + 5);
        if (ops[i].nota) {
          this.linha(11 + i * 2, by + 24, '► ' + ops[i].nota, PAL.cinza)
            .setPosition(bx + 24, by + 24);
        }
      }
      /* Zona de toque só onde há coisa desenhada. Dentro da conversa a
         lista não existe, e o cabeçalho é o botão de voltar; na lista é
         o contrário. As duas se sobrepõem no alto da tela, e deixar as
         duas ligadas fazia a primeira conversa da lista não abrir. */
      for (i = 0; i < this.zonasBotao.length; i++) {
        if (i < ops.length) this.zonasBotao[i].setInteractive();
        else this.zonasBotao[i].disableInteractive();
      }
      this.zonaVolta.setInteractive();
      for (i = 0; i < this.zonasLinha.length; i++) this.zonasLinha[i].disableInteractive();
      this.tRodape.setText('');
      return;
    }

    for (i = 0; i < this.zonasBotao.length; i++) this.zonasBotao[i].disableInteractive();
    this.zonaVolta.disableInteractive();
    for (i = 0; i < this.zonasLinha.length; i++) this.zonasLinha[i].setInteractive();

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

  /* Um balão. Recebido nasce na margem esquerda; enviado é empurrado
     pra direita e vem em verde, que é como todo mundo já sabe ler uma
     conversa antes de ler o texto. */
  balao: function (g, idx, y, texto, meu) {
    var larg = Math.min(ZAP.tx1 - ZAP.tx0 - 24, texto.length * 12 + 14);
    var x = meu ? (ZAP.tx1 - 8 - larg) : (ZAP.tx0 + 8);
    g.fillStyle(meu ? 0x14432c : 0x1e2c26, 1).fillRect(x, y - 4, larg, 24);
    g.fillStyle(meu ? 0x1d6e42 : 0x2a3d34, 1).fillRect(x, y - 4, larg, 2);
    var t = this.linhas[idx];
    t.setVisible(true).setOrigin(0, 0).setPosition(x + 7, y)
      .setText(texto).setColor(meu ? PAL.verde : PAL.branco);
  },

  // a prévia cabe em 18 caracteres; o resto vira reticências
  previa: function (f) {
    if (f.aceito) return '✓ ' + f.vai.estacao;
    // já respondida: a prévia é o que VOCÊ mandou, como em qualquer zap
    var m = f.respondido && f.enviadas.length
      ? '► ' + f.enviadas[f.enviadas.length - 1]
      : (f.msgs[0] || '');
    return m.length > 18 ? m.slice(0, 17) + '...' : m;
  },

  /* ---------- aba 2: o mapa ----------
     Eram duas linhas verticais paralelas com a Se ligando as duas por
     fora. A rede nao e assim e ninguem a tem na cabeca assim: a Azul
     desce, a Vermelha atravessa, e elas se cruzam na Se. Agora o desenho
     mora no `desenhaMapaRede`, que a parede da estacao usa igual — mapa
     em dois lugares com duas geometrias diferentes seria o jogador
     aprendendo o mesmo desenho duas vezes.

     A caixa: x de 34 a 278 e y de 162 a 420. Sao os numeros que fazem os
     nomes das pontas caberem — JABAQUARA tem 9 letras, 108px, centrado
     no tronco Azul que cai em x=106, entao ele comeca em 52 e a tela
     util comeca em 26. Dois pixels a esquerda e ele encosta na moldura.

     O cabecalho perdeu uma linha. Eram tres, e a do meio dizia o destino
     — que o mapa agora aponta com o triangulo verde. Texto que repete o
     desenho logo abaixo dele e texto que cabe cortar. */
  pintaMapa: function (g) {
    if (!GameState.char) return;
    var eu = this, n = 2;

    /* Os rotulos saem de uma reserva de BitmapText. O indice 0 e 1 sao o
       cabecalho, entao os do mapa comecam no 2 — e a origem e escrita
       toda vez, porque a mesma reserva serve a aba da grana, que alinha
       pela direita, e origem herdada de outro quadro desalinha tudo. */
    desenhaMapaRede(g, 34, 162, 244, 258, {
      eu: GameState.estacaoAtual(),
      linhaEu: GameState.linha,
      alvo: GameState.destinoFinal(),
      // o limite e a tela util do aparelho, nao a caixa do desenho: os
      // nomes das pontas podem passar do tronco, mas nunca da moldura
      lim: [ZAP.tx0, ZAP.tx1],
      rotula: function (t, x, y, cor) {
        if (n >= 14) return;
        eu.linhas[n++].setVisible(true).setOrigin(0, 0)
          .setPosition(x, y).setText(t).setColor(cor);
      }
    });

    this.linha(0, ZAP.topo, '► ' + GameState.rotuloDaPerna(), PAL.amarelo)
      .setOrigin(0, 0);
    this.linha(1, ZAP.topo + 18, '  ' + GameState.faltamEstacoes() +
      ' ATÉ ' + GameState.alvoAtual(), PAL.cinza).setOrigin(0, 0);
    /* O rodape diz o NOME do onde: a bolinha e o anel branco dizem o
       ponto, mas so as quatro pontas tem nome escrito no desenho, e no
       meio da linha o anel sozinho nao responde "que estacao e esta".

       Com o nome pelado ele parecia mais um rotulo do mapa — ficava logo
       abaixo de JABAQUARA, na mesma coluna, e lia-se como uma estacao a
       mais pendurada no fim da linha. O 'AQUI:' resolve por ser legenda
       e nao topônimo. Curto de proposito: 'VOCÊ ESTÁ EM PÇA. ÁRVORE' da
       24 caracteres, 288px, e a tela util do aparelho tem 268. */
    this.tRodape.setText('AQUI: ' + GameState.estacaoAtual());
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
