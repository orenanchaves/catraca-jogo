/* global Phaser */
/* Catraca — o celular, em primeira pessoa

   O trajeto tinha destino, mas o destino era dado: casa de manhã,
   trabalho de tarde, sempre igual. Aqui é onde a vida entra no meio do
   caminho — a mãe pede a farmácia, o chefe antecipa a reunião, a
   resenha muda de bar — e vira o destino da perna.

   A tela é o celular na sua mão: abre bloqueado, destrava, e mostra a
   tela inicial com quatro apps (ZipZap, Mapa, Banco, Missões). Enquanto ele está aberto o jogo congela,
   igual à pausa: no metrô de verdade também é assim, você para de olhar
   pra onde está indo quando abre o ZipZap.

   Como a cena de jogo fica pausada por baixo, aqui o teclado é ouvido
   direto por evento — cena pausada não atualiza tecla nenhuma. */

var ABAS_ZAP = ['ZIPZAP', 'MAPA', 'BANCO', 'MISSÕES'];

/* ---------- a tela inicial ----------
   As abas embaixo viraram aplicativos: o celular abre bloqueado, o
   cadeado solta, a tela sobe, e o que aparece é a tela inicial com os
   quatro apps, como em qualquer aparelho. Cor, desenho e o lugar de
   cada ícone (2x2, 72px, pra acertar com o dedo). */
var APPS_ZAP = [
  { nome: 'ZIPZAP', cor: 0x1faa59, cab: 0x0f3a2c },
  { nome: 'MAPA', cor: 0xf2f0ff, cab: 0x1c2a4a },
  { nome: 'BANCO', cor: 0x14284a, cab: 0x14284a },
  { nome: 'MISSÕES', cor: 0xf2c14e, cab: 0x3a3014 }
];
var ICONE_APP = 72;
function lugarDoApp(i) {
  return { x: (i % 2 ? 229 : 91) - ICONE_APP / 2, y: 206 + Math.floor(i / 2) * 110 };
}
var DIAS_SEMANA = ['SEGUNDA', 'TERÇA', 'QUARTA', 'QUINTA', 'SEXTA', 'SÁBADO', 'DOMINGO'];

/* A bateria acompanha o dia: cheia às 5h, e perde um pouco a cada hora
   de rua, como a de todo mundo que vive no metrô. */
function bateriaDoCelular() {
  if (!GameState.char) return 0.8;
  var m = GameState.minutos < 300 ? GameState.minutos + 1440 : GameState.minutos;
  return Phaser.Math.Clamp(1 - (m - 300) / (19 * 60), 0.06, 1);
}

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

    /* O aparelho SOBE: ele vem da mão que acabou de tirá-lo do bolso lá
       no mundo. A cena inteira sai de baixo em 220ms, o véu junto, então
       por um instante o mundo aparece em cima, que é o que se vê ao
       levantar o celular. */
    this.saindo = false;
    this.cameras.main.setScroll(0, -Math.round(GH * 0.55));
    this.tweens.add({ targets: this.cameras.main, scrollY: 0, duration: 220, ease: 'Cubic.easeOut' });

    this.g = this.add.graphics().setDepth(2400);
    // a barra de status, o ✕ e as mãos ficam por cima de tudo, até da tela de bloqueio
    this.gTopo = this.add.graphics().setDepth(2412);
    this.gDedo = this.add.graphics().setDepth(2420);
    this.tBat = txt(this, 0, ZAP.y0 + 12, '', PAL.branco, 8).setScale(ESCALA_TEXTO / 2)
      .setOrigin(1, 0).setDepth(2413);
    // a tela inicial: o widget e o nome de cada app
    this.tWHora = txtC(this, GW / 2, 104, '', PAL.branco, 16).setDepth(2402);
    this.tWDia = txtC(this, GW / 2, 146, '', PAL.cinza, 8).setDepth(2402);
    this.tWDest = txtC(this, GW / 2, 174, '', PAL.branco, 8).setDepth(2402).setScale(ESCALA_TEXTO / 2);
    this.tApps = [];
    for (var ia = 0; ia < APPS_ZAP.length; ia++) {
      var la = lugarDoApp(ia);
      this.tApps.push(txtC(this, la.x + ICONE_APP / 2, la.y + ICONE_APP + 6, APPS_ZAP[ia].nome, PAL.branco, 8).setDepth(2402));
    }
    this.tBadge = txtC(this, 0, 0, '', PAL.branco, 8).setDepth(2403);
    this.modo = 'bloqueio';
    this.selApp = 0;
    this.dedo = null;
    this.tStatus = txt(this, ZAP.tx0 + 6, ZAP.status + 4, '', PAL.cinza, 8).setDepth(2402);
    // a hora mora na barrinha de status do aparelho, pequena, como em celular de verdade
    this.tHora = txt(this, ZAP.tx0 + 8, ZAP.y0 + 12, '', PAL.branco, 8).setDepth(2413)
      .setScale(ESCALA_TEXTO / 2);

    /* Um punhado de linhas dá conta das três abas; reaproveitar os
       mesmos objetos evita criar e destruir texto a cada toque, que no
       celular aparece como engasgo. Dezoito é o maior uso: a aba da
       grana gasta duas por item. */
    this.linhas = [];
    // 0..13 conteúdo das abas, 14..17 os nomes das quatro abas, 18 o badge
    for (var i = 0; i < 20; i++) {
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

    this.zonaBotao = this.add.zone(GW / 2 - 60, ZAP.ty1, 120, ZAP.y1 - ZAP.ty1)
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

    // cada app é uma zona de toque na tela inicial
    this.zonas = [];
    for (i = 0; i < APPS_ZAP.length; i++) {
      var lu = lugarDoApp(i);
      var z = this.add.zone(lu.x - 10, lu.y - 6, ICONE_APP + 20, ICONE_APP + 34).setOrigin(0, 0);
      (function (idx) {
        z.on('pointerdown', function () { self.abreApp(idx); });
      })(i);
      this.zonas.push(z);
    }
    // o INÍCIO, na faixa de baixo de cada app
    this.zonaInicio = this.add.zone(ZAP.tx0, ZAP.abas, ZAP.tx1 - ZAP.tx0, 40).setOrigin(0, 0);
    this.zonaInicio.on('pointerdown', function () { self.vaiInicio(); });
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

    /* ---------- a tela de bloqueio ----------
       Relógio grande, o dia, e o cadeado. Ela fica por cima numa caixa
       própria, recortada no formato da tela, porque na hora de abrir ela
       SOBE e não pode passar por cima da borda do aparelho. */
    this.gLock = this.add.graphics();
    this.tRelogio = txtC(this, GW / 2, 150, '', PAL.branco, 16);
    this.tData = txtC(this, GW / 2, 206, '', PAL.cinza, 8);
    this.tAbrir = txtC(this, GW / 2, ZAP.ty1 - 34, '▲ TOQUE PRA ABRIR', PAL.branco, 8).setScale(ESCALA_TEXTO / 2);
    this.cLock = this.add.container(0, 0, [this.gLock, this.tRelogio, this.tData, this.tAbrir]).setDepth(2405);
    var mascara = this.make.graphics({ add: false });
    mascara.fillStyle(0xffffff, 1).fillRoundedRect(ZAP.tx0 - 4, ZAP.y0 + 8, ZAP.tx1 - ZAP.tx0 + 8, ZAP.y1 - ZAP.y0 - 16, 14);
    this.cLock.setMask(mascara.createGeometryMask());
    this.tBloq = 0;
    this.abrindo = false;
    this.pintaBloqueio(false);
    this.zonaLock = this.add.zone(ZAP.tx0, ZAP.y0 + 8, ZAP.tx1 - ZAP.tx0, ZAP.y1 - ZAP.y0 - 16)
      .setOrigin(0, 0).setInteractive();
    this.zonaLock.on('pointerdown', function () { self.desbloqueia(); });

    // o polegar desce onde se toca: é a pessoa mexendo no celular
    this.input.on('pointerdown', function (pt) {
      if (pt.worldX > ZAP.x0 && pt.worldX < ZAP.x1 && pt.worldY > ZAP.y0 && pt.worldY < ZAP.y1) self.toca(pt.worldX, pt.worldY);
    });

    this.input.keyboard.on('keydown', function (ev) {
      var c = ev.code;
      if (c === 'KeyP') { self.fecha(); return; }
      if (self.modo === 'bloqueio') {
        if (c === 'Escape' || c === 'KeyX') self.fecha(); else self.desbloqueia();
        return;
      }
      if (c === 'Escape' || c === 'KeyX') { if (self.modo === 'app') self.vaiInicio(); else self.fecha(); return; }
      if (self.modo === 'inicio') {
        var d = 0;
        if (c === 'KeyA' || c === 'ArrowLeft') d = -1;
        else if (c === 'KeyD' || c === 'ArrowRight') d = 1;
        else if (c === 'KeyW' || c === 'ArrowUp') d = -2;
        else if (c === 'KeyS' || c === 'ArrowDown') d = 2;
        if (d) { self.selApp = (self.selApp + d + 4) % 4; sfx('catraca'); self.pinta(); return; }
        if (c === 'Space' || c === 'Enter' || c === 'KeyZ') self.abreApp(self.selApp);
        return;
      }
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

  /* ---------- bloqueio, início e app ---------- */
  pintaBloqueio: function (aberto) {
    var g = this.gLock; g.clear();
    this.pintaFundoTela(g);
    // o cadeado: corpo e a alça, que sobe quando ele abre
    var cx = GW / 2, cy = 116;
    g.fillStyle(0xf2f0ff, 1).fillRoundedRect(cx - 9, cy, 18, 14, 3);
    g.fillStyle(0x2a2d38, 1).fillRect(cx - 1, cy + 4, 2, 5);
    var ay = aberto ? cy - 16 : cy - 11;
    g.lineStyle(3, 0xf2f0ff, 1);
    g.beginPath(); g.moveTo(cx - 6, cy + (aberto ? -6 : 0)); g.lineTo(cx - 6, ay + 4);
    g.lineTo(cx - 3, ay); g.lineTo(cx + 3, ay); g.lineTo(cx + 6, ay + 4); g.lineTo(cx + 6, cy); g.strokePath();
    // a lanterna e a câmera no pé, como em todo celular
    [[ZAP.tx0 + 30, 0x3a3d4a], [ZAP.tx1 - 30, 0x3a3d4a]].forEach(function (b) {
      g.fillStyle(b[1], 0.9).fillCircle(b[0], ZAP.ty1 - 60, 13);
    });
    g.fillStyle(0xf2f0ff, 1).fillRect(ZAP.tx0 + 28, ZAP.ty1 - 67, 4, 11);
    g.fillStyle(0xf2f0ff, 1).fillRect(ZAP.tx1 - 37, ZAP.ty1 - 64, 14, 9);
    g.fillStyle(0x3a3d4a, 1).fillCircle(ZAP.tx1 - 30, ZAP.ty1 - 60, 3);
    this.tRelogio.setText(GameState.char ? GameState.hora() : '--:--');
    var dia = GameState.dia || 1;
    this.tData.setText(DIAS_SEMANA[(dia - 1) % 7] + ', DIA ' + dia);
  },

  // o papel de parede: neutro, um cinza-azulado que escurece pra baixo
  pintaFundoTela: function (g) {
    var y0 = ZAP.y0 + 8, y1 = ZAP.y1 - 8, passos = 10, h = (y1 - y0) / passos;
    for (var i = 0; i < passos; i++) {
      var k = i / (passos - 1);
      var r = Math.round(0x3a - k * 0x1a), gg = Math.round(0x3e - k * 0x1a), b = Math.round(0x4c - k * 0x1e);
      g.fillStyle((r << 16) | (gg << 8) | b, 1).fillRect(ZAP.tx0 - 4, Math.floor(y0 + i * h), ZAP.tx1 - ZAP.tx0 + 8, Math.ceil(h) + 1);
    }
  },

  desbloqueia: function () {
    if (this.modo !== 'bloqueio' || this.abrindo) return;
    this.abrindo = true;
    this.zonaLock.disableInteractive();
    this.pintaBloqueio(true);
    sfx('ok');
    this.modo = 'inicio';
    this.pinta();
    var self = this;
    this.tweens.add({
      targets: this.cLock, y: -(ZAP.y1 - ZAP.y0), duration: 300, delay: 140, ease: 'Cubic.easeIn',
      onComplete: function () { self.cLock.setVisible(false); }
    });
  },

  abreApp: function (i) {
    if (this.modo !== 'inicio') return;
    var lu = lugarDoApp(i);
    this.toca(lu.x + ICONE_APP / 2, lu.y + ICONE_APP / 2);
    this.selApp = i;
    this.aba = i; this.fio = null; this.sel = 0;
    this.modo = 'app';
    sfx('ok');
    this.pinta();
  },

  vaiInicio: function () {
    if (this.modo !== 'app') return;
    this.toca(GW / 2, ZAP.abas + 20);
    this.fio = null;
    this.modo = 'inicio';
    sfx('catraca');
    this.pinta();
  },

  toca: function (x, y) { this.dedo = { x: x, y: y, t: 0 }; },

  /* O polegar: sai da mão que está mais perto do toque, desce, encosta,
     e volta. Um traço grosso da cor da pele, a ponta redonda e a unha. */
  pintaDedo: function (dt) {
    var g = this.gDedo; g.clear();
    var d = this.dedo;
    if (!d) return;
    d.t += dt;
    var ida = 90, fica = 70, volta = 130, t = d.t, p;
    if (t < ida) p = t / ida;
    else if (t < ida + fica) p = 1;
    else if (t < ida + fica + volta) p = 1 - (t - ida - fica) / volta;
    else { this.dedo = null; return; }
    var dir = d.x > GW / 2;
    var bx = dir ? GW - 24 : 24, by = GH + 18;
    var rx = dir ? GW - 40 : 40, ry = GH - 40;
    var tx = rx + (d.x - rx) * p, ty = ry + (d.y + 10 - ry) * p;
    // grosso como polegar: 24 de largura, e a ponta um pouco mais larga
    g.lineStyle(28, 0xa8744e, 1).lineBetween(bx, by, tx, ty);
    g.lineStyle(24, 0xc98d63, 1).lineBetween(bx, by, tx, ty);
    g.fillStyle(0xa8744e, 1).fillCircle(tx, ty, 14);
    g.fillStyle(0xc98d63, 1).fillCircle(tx, ty, 12);
    var ux = tx + (bx - tx) * 0.07, uy = ty + (by - ty) * 0.07;
    g.fillStyle(0xe8c0a8, 1).fillEllipse(ux, uy + 3, 14, 11);
    g.fillStyle(0xffffff, 0.35).fillEllipse(ux - 2, uy, 5, 3);
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
    var gt = this.gTopo; gt.clear();
    var i;
    // âncora de volta ao padrão: as mesmas linhas são reusadas em abas
    // que alinham à esquerda, à direita e ao centro
    // a largura de quebra também volta: a aba das missões quebra linha, as outras não
    for (i = 0; i < this.linhas.length; i++) this.linhas[i].setVisible(false).setOrigin(0, 0).setMaxWidth(0);
    // toque só no que está na tela: a lista e as respostas voltam ligadas pelo pintaZap
    for (i = 0; i < this.zonasLinha.length; i++) this.zonasLinha[i].disableInteractive();
    for (i = 0; i < this.zonasBotao.length; i++) this.zonasBotao[i].disableInteractive();
    this.zonaVolta.disableInteractive();
    var noInicio = (this.modo !== 'app');
    for (i = 0; i < this.zonas.length; i++) {
      if (this.modo === 'inicio') this.zonas[i].setInteractive(); else this.zonas[i].disableInteractive();
    }
    if (this.modo === 'app') this.zonaInicio.setInteractive(); else this.zonaInicio.disableInteractive();
    this.tRodape.setText('');

    // o mundo lá fora, escurecido: você parou de olhar pra frente
    g.fillStyle(0x05050a, 0.82).fillRect(0, 0, GW, GH);

    /* ---------- cara de celular ----------
       Era uma caixa reta com um risco de alto-falante: lia como painel
       do jogo, não como aparelho ('quero o celular mais cara de
       celular'). O que faz um retângulo virar smartphone, de longe:
       cantos redondos com aro de metal, botões saindo da lateral, tela
       quase sem borda com a câmera em pílula no alto, a barrinha de
       status (hora, sinal, bateria) e o risco de "home" embaixo. E as
       mãos seguram pelas laterais. */
    var X0 = ZAP.x0, X1 = ZAP.x1, Y0 = ZAP.y0, Y1 = ZAP.y1, W = X1 - X0, H = Y1 - Y0;
    g.fillStyle(0x000000, 0.5).fillRoundedRect(X0 + 4, Y0 + 6, W, H, 22);
    g.fillStyle(0x6e7082, 1).fillRect(X0 - 3, Y0 + 96, 4, 34).fillRect(X0 - 3, Y0 + 138, 4, 34);
    g.fillStyle(0x6e7082, 1).fillRect(X1 - 1, Y0 + 116, 4, 46);
    g.fillStyle(0x4a4c5c, 1).fillRoundedRect(X0, Y0, W, H, 22);
    g.fillStyle(0x9a9cb0, 1).fillRoundedRect(X0, Y0, W - 2, H - 2, 22);
    g.fillStyle(0x6e7082, 1).fillRoundedRect(X0 + 2, Y0 + 2, W - 4, H - 4, 20);
    g.fillStyle(0x07070b, 1).fillRoundedRect(X0 + 4, Y0 + 4, W - 8, H - 8, 18);
    var sx0 = ZAP.tx0 - 4, sx1 = ZAP.tx1 + 4, sy0 = Y0 + 8, sy1 = Y1 - 8;
    g.fillStyle(0x0a0a12, 1).fillRoundedRect(sx0, sy0, sx1 - sx0, sy1 - sy0, 14);

    if (noInicio) this.pintaInicio(g);
    else {
      // o cabeçalho do app, na cor dele, com o nome
      g.fillStyle(APPS_ZAP[this.aba].cab, 1).fillRect(ZAP.tx0, ZAP.status, ZAP.tx1 - ZAP.tx0, 22);
      this.tStatus.setText(APPS_ZAP[this.aba].nome).setColor(PAL.branco);
      if (this.aba === 0) this.pintaZap(g);
      else if (this.aba === 1) this.pintaMapa(g);
      else if (this.aba === 2) this.pintaGrana(g);
      else this.pintaMissoes(g);
      this.pintaAbas(g);
    }
    this.pintaTopo(gt, sy0, sy1);
  },

  /* A tela inicial: o widget com a hora, o dia e pra onde você vai, e
     os quatro apps. O ZipZap leva a bolinha vermelha das não lidas. */
  pintaInicio: function (g) {
    var i;
    this.tStatus.setText('');
    this.pintaFundoTela(g);
    var mostra = (this.modo === 'inicio');
    this.tWHora.setVisible(mostra).setText(GameState.char ? GameState.hora() : '--:--');
    var dia = GameState.dia || 1;
    this.tWDia.setVisible(mostra).setText(DIAS_SEMANA[(dia - 1) % 7] + ', DIA ' + dia);
    var dest = GameState.char && GameState.destinoFinal ? GameState.destinoFinal() : null;
    this.tWDest.setVisible(mostra).setText(dest ? 'INDO PRA ' + placaDe(dest) : '');
    g.fillStyle(0xffffff, 0.07).fillRoundedRect(ZAP.tx0 + 8, 94, ZAP.tx1 - ZAP.tx0 - 16, 96, 14);
    for (i = 0; i < APPS_ZAP.length; i++) {
      var a = APPS_ZAP[i], lu = lugarDoApp(i), x = lu.x, y = lu.y, S = ICONE_APP;
      g.fillStyle(0x000000, 0.3).fillRoundedRect(x + 2, y + 4, S, S, 16);
      g.fillStyle(a.cor, 1).fillRoundedRect(x, y, S, S, 16);
      g.fillStyle(0xffffff, 0.18).fillRoundedRect(x + 3, y + 3, S - 6, 10, 6);
      this.desenhoDoApp(g, i, x + S / 2, y + S / 2);
      if (mostra && i === this.selApp) {
        g.lineStyle(2, 0xf2f0ff, 0.9).strokeRoundedRect(x - 5, y - 5, S + 10, S + 10, 19);
      }
      this.tApps[i].setVisible(mostra);
    }
    var n = naoLidas(GameState.zap);
    var zl = lugarDoApp(0);
    if (n && mostra) {
      g.fillStyle(0xe8362c, 1).fillCircle(zl.x + ICONE_APP - 4, zl.y + 4, 11);
      this.tBadge.setVisible(true).setPosition(zl.x + ICONE_APP - 4, zl.y - 6).setText(String(n));
    } else this.tBadge.setVisible(false);
  },

  // o desenho de cada ícone, em volta do centro dele
  desenhoDoApp: function (g, i, cx, cy) {
    if (i === 0) {
      // ZipZap: o balão de conversa branco, com os três pontinhos
      g.fillStyle(0xffffff, 1).fillRoundedRect(cx - 20, cy - 16, 40, 28, 10);
      g.fillTriangle(cx - 12, cy + 8, cx - 18, cy + 20, cx - 2, cy + 10);
      g.fillStyle(0x1faa59, 1).fillCircle(cx - 9, cy - 2, 3).fillCircle(cx, cy - 2, 3).fillCircle(cx + 9, cy - 2, 3);
    } else if (i === 1) {
      // Mapa: a Azul em pé, a Vermelha deitada, e a Sé no cruzamento
      g.fillStyle(0x1c5ab4, 1).fillRect(cx - 12, cy - 24, 7, 48);
      g.fillStyle(0xe8362c, 1).fillRect(cx - 24, cy - 1, 48, 7);
      g.fillStyle(0xffffff, 1).fillCircle(cx - 8, cy + 2, 6);
      g.lineStyle(2, 0x14141c, 1).strokeCircle(cx - 8, cy + 2, 6);
      g.fillStyle(0xffffff, 1).fillCircle(cx + 14, cy + 2, 3).fillCircle(cx - 8, cy - 16, 3);
    } else if (i === 2) {
      // Banco: o cartão verde com o chip, e a moeda por cima
      g.fillStyle(0x2f7d5e, 1).fillRoundedRect(cx - 22, cy - 14, 40, 26, 4);
      g.fillStyle(0x0a0a10, 1).fillRect(cx - 22, cy - 8, 40, 5);
      g.fillStyle(0xe8c96a, 1).fillRect(cx - 16, cy + 1, 8, 6);
      g.fillStyle(0xb8862a, 1).fillCircle(cx + 14, cy + 12, 11);
      g.fillStyle(0xf2c14e, 1).fillCircle(cx + 14, cy + 12, 9);
      g.fillStyle(0xb8862a, 1).fillRect(cx + 13, cy + 6, 2, 12);
    } else {
      // Missões: a prancheta com três itens e os tiques verdes
      g.fillStyle(0x6b4226, 1).fillRoundedRect(cx - 18, cy - 24, 36, 48, 4);
      g.fillStyle(0xf2f0ff, 1).fillRect(cx - 14, cy - 18, 28, 38);
      g.fillStyle(0x9a9ca4, 1).fillRect(cx - 7, cy - 27, 14, 6);
      for (var k = 0; k < 3; k++) {
        var ly = cy - 12 + k * 11;
        g.fillStyle(k < 2 ? 0x1faa59 : 0xc8c8d4, 1).fillRect(cx - 11, ly, 5, 5);
        g.fillStyle(0x6a6c78, 1).fillRect(cx - 3, ly + 1, 14, 3);
      }
    }
  },

  /* O que fica por cima de tudo: a barra de status, o ✕ e as mãos. */
  pintaTopo: function (g, sy0, sy1) {
    this.tHora.setText(GameState.char ? GameState.hora() : '--:--');
    // a câmera em pílula
    g.fillStyle(0x000000, 1).fillRoundedRect(GW / 2 - 20, sy0 + 3, 40, 11, 5);
    g.fillStyle(0x1c2436, 1).fillCircle(GW / 2 + 12, sy0 + 8, 2);
    // a bateria, com a carga do dia; fica amarela e depois vermelha
    var ix = ZAP.tx1 - 6, bat = bateriaDoCelular();
    var corBat = bat > 0.5 ? 0x00e676 : (bat > 0.2 ? 0xf2c14e : 0xe8362c);
    g.fillStyle(0xd8d8e8, 1).fillRect(ix - 16, sy0 + 5, 14, 7);
    g.fillRect(ix - 2, sy0 + 7, 2, 3);
    g.fillStyle(0x0a0a12, 1).fillRect(ix - 15, sy0 + 6, 12, 5);
    g.fillStyle(corBat, 1).fillRect(ix - 14, sy0 + 7, Math.max(1, Math.round(10 * bat)), 3);
    this.tBat.setPosition(ix - 19, sy0 + 4).setText(Math.round(bat * 100) + '%');
    // as quatro barras de sinal
    for (var sb = 0; sb < 4; sb++) {
      g.fillStyle(sb < 3 ? 0xd8d8e8 : 0x4a4a60, 1).fillRect(ix - 64 + sb * 4, sy0 + 11 - (sb + 1) * 2, 3, (sb + 1) * 2);
    }
    /* O ✕ não existe na fonte do jogo, então ele é dois riscos — que é
       tudo que um ✕ é. Com moldura e branco, que é o que separa um
       enfeite de um botão. */
    var xc = ZAP.tx1 - 15, yc = ZAP.status + 11;
    g.fillStyle(0x2a1418, 1).fillRect(xc - 13, yc - 10, 26, 20);
    g.lineStyle(1, 0xe8362c, 1).strokeRect(xc - 13, yc - 10, 26, 20);
    g.lineStyle(2, 0xf2f0ff, 1);
    g.beginPath(); g.moveTo(xc - 5, yc - 5); g.lineTo(xc + 5, yc + 5); g.strokePath();
    g.beginPath(); g.moveTo(xc + 5, yc - 5); g.lineTo(xc - 5, yc + 5); g.strokePath();
    // o risco de "home" no pé da tela
    g.fillStyle(0xd8d8e8, 0.85).fillRoundedRect(GW / 2 - 34, sy1 - 9, 68, 4, 2);

    // as mãos: palma embaixo e os dedos abraçando as laterais do aparelho
    var pele = 0xc98d63, som = 0xa8744e, lado, dd;
    for (lado = 0; lado < 2; lado++) {
      var px = lado ? GW - 44 : 0;
      g.fillStyle(0x2a1e18, 1).fillRect(px, GH - 34, 44, 34);
      g.fillStyle(pele, 1).fillRect(px + 4, GH - 30, 36, 30);
      g.fillStyle(som, 1).fillRect(px + 4, GH - 30, 36, 3);
      for (dd = 0; dd < 3; dd++) {
        var fy = ZAP.y1 - 150 + dd * 22;
        var fx = lado ? ZAP.x1 - 6 : ZAP.x0 - 8;
        g.fillStyle(som, 1).fillRoundedRect(fx, fy, 14, 16, 5);
        g.fillStyle(pele, 1).fillRoundedRect(fx + 1, fy, 12, 14, 5);
      }
    }
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
    // 16 caracteres: a linha começa em 72 e a bolinha de não lida em 272
    return m.length > 16 ? m.slice(0, 13) + '...' : m;
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

  /* ---------- aba 4: as missões ----------
     O Alto põe as três metas na tela de pausa; aqui elas moram no
     celular, que é onde mora a vida de quem anda de metrô. Cada uma é um
     cartão com a caixinha, o texto em até duas linhas e o quanto falta.
     "NUMA CORRIDA" marca as que zeram se você perder. O rodapé diz o que
     subir de nível dá. */
  pintaMissoes: function (g) {
    var e = Missoes.le(), n = NIVEIS[e.nivel];
    var x0 = ZAP.tx0, w = ZAP.tx1 - ZAP.tx0;
    if (!n) {
      this.linha(0, ZAP.topo, 'TODOS OS NÍVEIS', PAL.amarelo);
      this.linha(1, ZAP.topo + 24, 'FEITOS. VOCÊ JÁ', PAL.cinza);
      this.linha(2, ZAP.topo + 44, 'É PAULISTANO.', PAL.cinza);
      this.tRodape.setText('');
      return;
    }
    this.linha(0, ZAP.topo, 'NÍVEL ' + (e.nivel + 1) + ': ' + n.nome, PAL.amarelo);
    for (var i = 0; i < 3; i++) {
      var m = n.missoes[i], feita = !!e.feitas[i];
      var y = ZAP.topo + 30 + i * 104;
      g.fillStyle(feita ? 0x10241a : 0x121820, 1).fillRect(x0, y, w, 96);
      var cx = x0 + 10, cy = y + 10;
      g.lineStyle(2, feita ? 0x00e676 : 0x4f5468, 1).strokeRect(cx, cy, 14, 14);
      if (feita) {
        g.lineStyle(3, 0x00e676, 1);
        g.beginPath(); g.moveTo(cx + 3, cy + 7); g.lineTo(cx + 6, cy + 11); g.lineTo(cx + 12, cy + 3); g.strokePath();
      }
      this.linhas[1 + i * 3].setVisible(true).setOrigin(0, 0).setPosition(x0 + 32, y + 4)
        .setMaxWidth(w - 42).setText(m.txt).setColor(feita ? PAL.verde : PAL.branco);
      this.linhas[2 + i * 3].setVisible(true).setOrigin(1, 0).setPosition(x0 + w - 10, y + 68)
        .setText(Math.min(e.prog[i], m.meta) + '/' + m.meta).setColor(feita ? PAL.verde : PAL.amarelo);
      if (m.corrida && !feita) {
        this.linhas[3 + i * 3].setVisible(true).setOrigin(0, 0).setPosition(x0 + 32, y + 68)
          .setText('NUMA CORRIDA').setColor(PAL.cinzaEsc);
      }
    }
    var quem = PREMIO_NIVEL[e.nivel + 2];
    this.tRodape.setText('SUBINDO: +' + (10 * (e.nivel + 2)) + (quem ? ' E ' + nomeDoChar(quem) : ' PONTOS'));
  },

  // a faixa de baixo de cada app: o botão de voltar pra tela inicial
  pintaAbas: function (g) {
    this.tWHora.setVisible(false); this.tWDia.setVisible(false); this.tWDest.setVisible(false);
    for (var i = 0; i < this.tApps.length; i++) this.tApps[i].setVisible(false);
    this.tBadge.setVisible(false);
    g.fillStyle(0x111119, 1).fillRect(ZAP.tx0, ZAP.abas, ZAP.tx1 - ZAP.tx0, 40);
    g.fillStyle(0x2a2a3a, 1).fillRect(ZAP.tx0, ZAP.abas, ZAP.tx1 - ZAP.tx0, 2);
    this.linhas[14].setVisible(true).setOrigin(0.5, 0).setPosition(GW / 2, ZAP.abas + 12)
      .setText('◄ INÍCIO').setColor(PAL.cinza);
  },

  /* E desce antes de o mundo voltar: o aparelho some por baixo, o jogo
     descongela, e só então o boneco guarda o celular no bolso. O X, o
     botão do aparelho e o toque fora passam todos por aqui. */
  fecha: function () {
    if (this.saindo) return;
    this.saindo = true;
    var self = this;
    sfx('porta');
    this.tweens.add({
      targets: this.cameras.main, scrollY: -Math.round(GH * 0.55), duration: 180, ease: 'Cubic.easeIn',
      onComplete: function () {
        var voltam = self.congeladas.slice(0);
        voltam.forEach(function (k) { self.scene.resume(k); });
        self.congeladas = [];
        voltam.forEach(function (k) {
          var c = self.scene.get(k);
          if (c && c._celular && c.pl) celularNoMundo(c, c.pl, false);
        });
        self.scene.stop('Zap');
      }
    });
  },

  update: function (time, delta) {
    // fechar pelo botão do celular, pelo X, ou tocando fora do aparelho
    if (Ctrl.pausaJust) { Ctrl.pausaJust = false; this.fecha(); }
    var dt = Math.min(delta || 16, 50);
    // bloqueado: o cadeado se abre sozinho logo depois de o aparelho subir
    if (this.modo === 'bloqueio' && !this.abrindo) {
      this.tBloq += dt;
      if (this.tBloq > 620) this.desbloqueia();
    }
    this.pintaDedo(dt);
  }
});
