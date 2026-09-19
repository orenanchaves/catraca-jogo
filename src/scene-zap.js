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

var ABAS_ZAP = ['ZIPZAP', 'MAPA', 'BANCO', 'MISSÕES', 'MOCHILA', 'METRODEX'];

/* ---------- a tela inicial ----------
   As abas embaixo viraram aplicativos: o celular abre bloqueado, o
   cadeado solta, a tela sobe, e o que aparece é a tela inicial com os
   apps, como em qualquer aparelho. Cor, desenho e o lugar de cada
   ícone (ver lugarDoApp). O polegar que descia a cada toque saiu:
   cobria a tela bem na hora de ler ('o dedo atrapalha'). */
var APPS_ZAP = [
  { nome: 'ZIPZAP', cor: 0x1faa59, cab: 0x0f3a2c },
  { nome: 'MAPA', cor: 0xf2f0ff, cab: 0x1c2a4a },
  { nome: 'BANCO', cor: 0x14284a, cab: 0x14284a },
  { nome: 'MISSÕES', cor: 0xf2c14e, cab: 0x3a3014 },
  { nome: 'MOCHILA', cor: 0xb07a3a, cab: 0x3a2814 },
  { nome: 'METRODEX', cor: 0xe8362c, cab: 0x5a1414 }
];
/* Com a MOCHILA são cinco: três por fileira, ícones de 60 (os de 72 em
   2x2 não cabiam mais). 'MISSÕES' e 'MOCHILA' têm 84px de nome, e as
   colunas ficam a 89 uma da outra. */
var ICONE_APP = 60;
function lugarDoApp(i) {
  return { x: [71, 160, 249][i % 3] - ICONE_APP / 2, y: 206 + Math.floor(i / 3) * 112 };
}
var DIAS_SEMANA = ['SEGUNDA', 'TERÇA', 'QUARTA', 'QUINTA', 'SEXTA', 'SÁBADO', 'DOMINGO'];

/* A bateria acompanha o dia: cheia às 5h, e perde um pouco a cada hora
   de rua, como a de todo mundo que vive no metrô. */
function bateriaDoCelular() {
  if (!GameState.char || GameState.bateria === undefined) return 0.8;
  return Phaser.Math.Clamp(GameState.bateria / 100, 0, 1);
}

/* a moldura e as faixas: tudo medido uma vez só, e todo mundo lê daqui */
/* O botão da resposta ocupa quase toda a largura útil da tela do
   celular: com a caixa estreita, "hj tô na correria" saía por cima da
   moldura do aparelho — e a moldura é a única coisa da tela que não
   pode ser atravessada. */
var ZAP_BOTAO = { dx: 8, dy: -92, alt: 30, altNota: 40, passo: 44, texto: 18 };

/* As cartas da METRODEX: duas por fileira, duas fileiras. A medida mora
   aqui porque o recorte do nome de cada carta é feito uma vez só, no create. */
var DEXC = { W: 128, H: 156, VAO: 8 };
DEXC.x0 = 0; DEXC.y0 = 0;   // acertados logo abaixo do ZAP
/* ---------- o mapa do celular, fiel ao do Metrô ----------
   'Tentar mais fiel a esse mapa, focando na azul e na vermelha.' A Azul
   em pé, com todas as estações a 14px; a Vermelha sai da Barra Funda na
   altura da Luz, desce inclinada pela Santa Cecília até a República,
   cruza a Sé, e depois do Pedro II sobe de novo até o Brás, de onde
   corre reta até Itaquera, como no mapa da parede do metrô. */
var MAPA_CEL = { BX: 150, Y0: 144, PASSO: 14 };
MAPA_CEL.yDe = function (i) { return MAPA_CEL.Y0 + (LINHAS.azul.estacoes.length - 1 - i) * MAPA_CEL.PASSO; };
(function () {
  var M = MAPA_CEL, yL = M.yDe(LINHAS.azul.estacoes.indexOf('LUZ')), yS = M.yDe(LINHAS.azul.estacoes.indexOf('SÉ'));
  M.rota = [[40, yL], [70, yL], [98, yS], [200, yS], [218, yL], [286, yL]];
  M.verm = {
    'BARRA FUNDA': [40, yL], 'MAL. DEODORO': [62, yL], 'STA. CECÍLIA': [84, yL + 14],
    'REPÚBLICA': [106, yS], 'ANHANGABAÚ': [128, yS], 'SÉ': [150, yS], 'PEDRO II': [174, yS]
  };
  var leste = LINHAS.vermelha.estacoes.slice(LINHAS.vermelha.estacoes.indexOf('BRÁS'));
  for (var i = 0; i < leste.length; i++) M.verm[leste[i]] = [Math.round(218 + i * 6.8), yL];
})();
MAPA_CEL.pos = function (linha, nome) {
  if (linha === 'vermelha' && MAPA_CEL.verm[nome]) return { x: MAPA_CEL.verm[nome][0], y: MAPA_CEL.verm[nome][1] };
  var i = LINHAS.azul.estacoes.indexOf(nome);
  if (i < 0) return MAPA_CEL.pos('vermelha', nome);
  return { x: MAPA_CEL.BX, y: MAPA_CEL.yDe(i) };
};

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
    this.tBat = txt(this, 0, ZAP.y0 + 12, '', PAL.branco, 8).setScale(ESCALA_TEXTO / 2)
      .setOrigin(1, 0).setDepth(2413);
    // a tela inicial: o widget e o nome de cada app
    this.tWHora = txtC(this, GW / 2, 104, '', PAL.branco, 16).setDepth(2402);
    this.tWDia = txtC(this, GW / 2, 146, '', PAL.cinza, 8).setDepth(2402);
    this.tWDest = txtC(this, GW / 2, 174, '', PAL.branco, 8).setDepth(2402).setScale(ESCALA_TEXTO / 2);
    this.tApps = [];
    for (var ia = 0; ia < APPS_ZAP.length; ia++) {
      var la = lugarDoApp(ia);
      // o nome em meia escala (6px por letra), como nome de app de verdade: 'METRODEX' cheio tinha 96px
      this.tApps.push(txtC(this, la.x + ICONE_APP / 2, la.y + ICONE_APP + 6, APPS_ZAP[ia].nome, PAL.branco, 8)
        .setScale(ESCALA_TEXTO / 2).setDepth(2402));
    }
    this.tBadge = txtC(this, 0, 0, '', PAL.branco, 8).setDepth(2403);
    this.modo = 'bloqueio';
    this.selApp = 0;
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
    // o botão do celular (que liga e desliga) fica de fora: é a alça do aparelho
    var fora = [
      [0, 0, HUDB.zap.x - 2, ZAP.y0],
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
    this.zonaInicio.on('pointerdown', function () { if (self.dexAberta >= 0) self.fechaFicha(); else self.vaiInicio(); });
    // o cabeçalho da conversa volta pra lista
    this.zonaVolta = this.add.zone(ZAP.tx0, ZAP.topo - 10, ZAP.tx1 - ZAP.tx0, 30)
      .setOrigin(0, 0).setInteractive();
    this.zonaVolta.on('pointerdown', function () {
      if (!self.fio) return;
      self.fio = null; self.opBotao = 0; sfx('catraca'); self.pinta();
    });

    /* a mochila: uma linha por item, com a figurinha dele e o toque que usa */
    /* as cartas da METRODEX: quatro na tela, cada uma com seis textos e
       uma zona de toque (o boneco vem da reserva de figurinhas da mochila) */
    this.cartasDex = [];
    DEXC.x0 = ZAP.tx0 + (ZAP.tx1 - ZAP.tx0 - (DEXC.W * 2 + DEXC.VAO)) / 2; DEXC.y0 = ZAP.topo + 4;
    this.dexAberta = -1;
    for (var cd = 0; cd < 4; cd++) {
      var meia = function (s) { return s.setScale(ESCALA_TEXTO / 2).setDepth(2404).setVisible(false); };
      var ct = {
        num: meia(txt(this, 0, 0, '', PAL.cinza, 8)),
        nome: txtC(this, 0, 0, '', PAL.branco, 8).setDepth(2404).setVisible(false),
        r1: meia(txtC(this, 0, 0, '', PAL.cinzaEsc, 8)), v1: meia(txtC(this, 0, 0, '', PAL.branco, 8)),
        r2: meia(txtC(this, 0, 0, '', PAL.cinzaEsc, 8)), v2: meia(txtC(this, 0, 0, '', PAL.branco, 8)),
        tipo: meia(txtC(this, 0, 0, '', PAL.cinza, 8))
      };
      /* Nome é sempre do mesmo tamanho ('tem que ter padrão no nome'): o
         que não cabe na carta roda, como o letreiro do HUD, recortado na
         largura de dentro dela. */
      var mx = DEXC.x0 + (cd % 2) * (DEXC.W + DEXC.VAO), my = DEXC.y0 + Math.floor(cd / 2) * (DEXC.H + DEXC.VAO);
      var mn = this.make.graphics({ add: false });
      mn.fillStyle(0xffffff, 1).fillRect(mx + 6, my + 88, DEXC.W - 12, 22);
      ct.nome.setMask(mn.createGeometryMask());
      ct.zona = this.add.zone(0, 0, 10, 10).setOrigin(0, 0);
      // tocar na carta abre a ficha dela, com tudo o que se sabe da pessoa
      (function (idx) { ct.zona.on('pointerdown', function () {
        if (self.modo === 'app' && self.aba === 5 && self.dexAberta < 0) self.abreFicha(self.topoDex + idx);
      }); })(cd);
      this.cartasDex.push(ct);
    }
    this.rotMapa = [];
    for (var rm = 0; rm < 44; rm++) this.rotMapa.push(txt(this, 0, 0, '', PAL.cinza, 8).setDepth(2403).setVisible(false));
    this.zonaMapa = this.add.zone(ZAP.tx0, ZAP.topo + 36, ZAP.tx1 - ZAP.tx0, ZAP.abas - ZAP.topo - 60).setOrigin(0, 0);
    this.zonaMapa.on('pointerdown', function (pt) { self.tocaMapa(pt.x, pt.y + self.cameras.main.scrollY); });
    this.zonaFicha = this.add.zone(ZAP.tx0, ZAP.status, ZAP.tx1 - ZAP.tx0, ZAP.abas - ZAP.status).setOrigin(0, 0);
    this.zonaFicha.on('pointerdown', function () { self.fechaFicha(); });
    this.figMochila = []; this.zonasMochila = [];
    for (i = 0; i < 6; i++) {
      this.figMochila.push(this.add.image(ZAP.tx0 + 24, ZAP.topo + i * 56 + 26, '__DEFAULT').setDepth(2403).setVisible(false).setScale(1.2));
      var zm = this.add.zone(ZAP.tx0, ZAP.topo + i * 56, ZAP.tx1 - ZAP.tx0, 52).setOrigin(0, 0);
      (function (idx) {
        zm.on('pointerdown', function () {
          if (self.modo !== 'app') return;
          if (self.aba === 4) self.usaItem(idx);
          else if (self.aba === 5 && self.dexAberta < 0) self.abreFicha(self.topoDex + idx);
        });
      })(i);
      this.zonasMochila.push(zm);
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


    this.input.keyboard.on('keydown', function (ev) {
      var c = ev.code;
      if (c === 'KeyP') { self.fecha(); return; }
      if (self.modo === 'bloqueio') {
        if (c === 'Escape' || c === 'KeyX') self.fecha(); else self.desbloqueia();
        return;
      }
      if (self.modo === 'app' && self.dexAberta >= 0) {
        // na ficha: as setas passam pra pessoa do lado; o resto volta pras cartas
        var df = (c === 'KeyA' || c === 'ArrowLeft') ? -1 : ((c === 'KeyD' || c === 'ArrowRight') ? 1 : 0);
        if (df) { self.dexAberta = self.sel = (self.dexAberta + df + DEX.length) % DEX.length; sfx('catraca'); self.pinta(); }
        else self.fechaFicha();
        return;
      }
      if (c === 'Escape' || c === 'KeyX') { if (self.modo === 'app') self.vaiInicio(); else self.fecha(); return; }
      if (self.modo === 'inicio') {
        var d = 0;
        if (c === 'KeyA' || c === 'ArrowLeft') d = -1;
        else if (c === 'KeyD' || c === 'ArrowRight') d = 1;
        else if (c === 'KeyW' || c === 'ArrowUp') d = -3;
        else if (c === 'KeyS' || c === 'ArrowDown') d = 3;
        var nA = APPS_ZAP.length;
        if (d) { self.selApp = (self.selApp + d + nA * 2) % nA; sfx('catraca'); self.pinta(); return; }
        if (c === 'Space' || c === 'Enter' || c === 'KeyZ') self.abreApp(self.selApp);
        return;
      }
      if (self.aba === 5) {
        var dd = 0;
        if (c === 'KeyA' || c === 'ArrowLeft') dd = -1;
        else if (c === 'KeyD' || c === 'ArrowRight') dd = 1;
        else if (c === 'KeyW' || c === 'ArrowUp') dd = -2;
        else if (c === 'KeyS' || c === 'ArrowDown') dd = 2;
        if (dd) { self.sel = Phaser.Math.Clamp(self.sel + dd, 0, DEX.length - 1); sfx('catraca'); self.pinta(); return; }
        if (c === 'Space' || c === 'Enter' || c === 'KeyZ') { self.abreFicha(self.sel); return; }
      }
      if (c === 'KeyA' || c === 'ArrowLeft') { self.trocaAba(-1); return; }
      if (c === 'KeyD' || c === 'ArrowRight') { self.trocaAba(1); return; }
      if (c === 'KeyW' || c === 'ArrowUp') { self.move(-1); return; }
      if (c === 'KeyS' || c === 'ArrowDown') { self.move(1); return; }
      if (c === 'Space' || c === 'Enter' || c === 'KeyZ') {
        if (self.fio) self.confirma(); else if (self.aba === 0) self.abre(); else if (self.aba === 4) self.usaItem(self.sel);
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
    this.selApp = i;
    this.aba = i; this.fio = null; this.sel = 0;
    this.modo = 'app';
    sfx('ok');
    this.pinta();
  },

  abreFicha: function (k) {
    this.sel = this.dexAberta = k;
    sfx('ok');
    this.pinta();
  },
  fechaFicha: function () {
    if (this.dexAberta < 0) return;
    this.dexAberta = -1;
    sfx('catraca');
    this.pinta();
  },

  vaiInicio: function () {
    if (this.modo !== 'app') return;
    this.fio = null; this.dexAberta = -1;
    this.modo = 'inicio';
    sfx('catraca');
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
    var n = this.aba === 4 ? this.itensDaMochila().length : (this.aba === 5 ? DEX.length : (GameState.zap || []).length);
    if ((this.aba !== 0 && this.aba !== 4 && this.aba !== 5) || !n) return;
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
    for (i = 0; i < this.linhas.length; i++) this.linhas[i].setVisible(false).setOrigin(0, 0).setMaxWidth(0).setScale(ESCALA_TEXTO).setLeftAlign();
    // toque só no que está na tela: a lista e as respostas voltam ligadas pelo pintaZap
    for (i = 0; i < this.zonasLinha.length; i++) this.zonasLinha[i].disableInteractive();
    for (i = 0; i < this.zonasBotao.length; i++) this.zonasBotao[i].disableInteractive();
    this.zonaVolta.disableInteractive();
    for (i = 0; i < this.zonasMochila.length; i++) { this.zonasMochila[i].disableInteractive(); this.figMochila[i].setVisible(false); }
    for (i = 0; i < this.cartasDex.length; i++) {
      var cc = this.cartasDex[i];
      cc.num.setVisible(false); cc.nome.setVisible(false); cc.r1.setVisible(false); cc.v1.setVisible(false);
      cc.r2.setVisible(false); cc.v2.setVisible(false); cc.tipo.setVisible(false); cc.zona.disableInteractive();
      cc._rola = null;
    }
    this.zonaFicha.disableInteractive();
    this.zonaMapa.disableInteractive();
    for (i = 0; i < this.rotMapa.length; i++) this.rotMapa[i].setVisible(false).setAngle(0);
    if (this.fichaFig) this.fichaFig.setVisible(false);
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
      else if (this.aba === 3) this.pintaMissoes(g);
      else if (this.aba === 4) this.pintaMochila(g);
      else if (this.dexAberta >= 0) this.pintaFicha(g);
      else this.pintaDex(g);
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
    } else if (i === 5) {
      // Metrodex: o aparelho vermelho, a lente azul grande e as três luzinhas
      g.fillStyle(0xa8201a, 1).fillRoundedRect(cx - 18, cy - 22, 36, 44, 6);
      g.fillStyle(0xf0eeff, 1).fillCircle(cx - 8, cy - 12, 8);
      g.fillStyle(0x3a9ae8, 1).fillCircle(cx - 8, cy - 12, 6);
      g.fillStyle(0xcfe8ff, 1).fillCircle(cx - 10, cy - 14, 2);
      g.fillStyle(0xf2c14e, 1).fillCircle(cx + 5, cy - 16, 2.5);
      g.fillStyle(0x00e676, 1).fillCircle(cx + 12, cy - 16, 2.5);
      g.fillStyle(0x14141c, 1).fillRect(cx - 12, cy + 2, 24, 14);
      g.fillStyle(0x00e676, 0.8).fillRect(cx - 9, cy + 5, 12, 2).fillRect(cx - 9, cy + 9, 8, 2);
    } else if (i === 4) {
      // Mochila: o corpo marrom, o bolso da frente e as alças
      g.fillStyle(0x6b4226, 1).fillRoundedRect(cx - 16, cy - 18, 32, 38, 8);
      g.fillStyle(0x8a5a34, 1).fillRoundedRect(cx - 14, cy - 16, 28, 16, 6);
      g.fillStyle(0x5a3a1e, 1).fillRoundedRect(cx - 10, cy + 2, 20, 14, 4);
      g.fillStyle(0xf2c14e, 1).fillRect(cx - 2, cy + 6, 4, 3);
      g.fillStyle(0x3a2814, 1).fillRect(cx - 8, cy - 24, 16, 5);
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

    /* A mão, como na foto ('a pessoa segura o celular assim'): uma mão
       só, a esquerda, e só o que aparece dela. A palma fica atrás do
       canto de baixo e sai da tela pela esquerda; o polegar, curto, sobe
       inclinado e deita a ponta na moldura esquerda, na altura do meio;
       do outro lado aparecem só as pontas dos quatro dedos, que dão a
       volta por trás. Nada entra na tela. */
    var pele = 0xc98d63, som = 0xa8744e, unha = 0xe8b894, dd, X = ZAP.x0, Y = ZAP.y1;
    /* O polegar, só ele ('ainda quebrado'): o celular encosta na borda
       da tela, e uma palma à esquerda dele saía cortada, parecendo um
       toco. Fica o que se vê de quem segura: o polegar entrando pela
       borda, inclinado, com a ponta e a unha deitadas na moldura. A mão
       está fora da tela, como na foto. */
    /* Dedão é dedão ('não tá com cara de dedão'): grosso (18px, o dobro
       das pontas do outro lado), comprido, quase em pé como quem segura,
       a ponta redonda e a unha oval grande e clara, com a dobra da junta. */
    var ty = Y - 236, ang = -1.1, cs = Math.cos(ang), sn = Math.sin(ang);
    var gira = function (px, py) { return { x: X + 8 + px * cs - py * sn, y: ty + px * sn + py * cs }; };
    var forma = function (d) {
      var pts = [], k;
      for (k = 0; k <= 10; k++) { var a = -Math.PI / 2 + k * Math.PI / 10; pts.push(gira(-10 + Math.cos(a) * (10 + d), Math.sin(a) * (9 + d))); }
      pts.push(gira(-80, 11 + d)); pts.push(gira(-80, -11 - d));
      return pts;
    };
    var oval = function (cx, cy, rx, ry) {
      var pts = [];
      for (var k = 0; k < 12; k++) { var a = k * Math.PI / 6; pts.push(gira(cx + Math.cos(a) * rx, cy + Math.sin(a) * ry)); }
      return pts;
    };
    g.fillStyle(som, 1).fillPoints(forma(1), true);
    g.fillStyle(pele, 1).fillPoints(forma(0), true);
    /* A unha como na foto: larga, quase da largura do dedo, acompanhando
       a ponta redonda e reta embaixo, com a meia-lua clara na base. */
    var unhaPts = function (enc) {
      var pts = [], k;
      for (k = 0; k <= 10; k++) { var an = -Math.PI / 2 + k * Math.PI / 10; pts.push(gira(-10 + Math.cos(an) * (8 - enc), Math.sin(an) * (7 - enc))); }
      pts.push(gira(-22 + enc, 7 - enc)); pts.push(gira(-22 + enc, -7 + enc));
      return pts;
    };
    g.fillStyle(0xb67c55, 1).fillPoints(unhaPts(0), true);               // a borda da unha
    g.fillStyle(0xe7b8a6, 1).fillPoints(unhaPts(1), true);               // a unha, rosada
    var lu = [gira(-21, -5), gira(-18, 0), gira(-21, 5)];
    g.fillStyle(0xf4dcd0, 1).fillTriangle(lu[0].x, lu[0].y, lu[1].x, lu[1].y, lu[2].x, lu[2].y);   // a meia-lua
    g.fillStyle(0xfbeee6, 0.8).fillPoints(oval(-8, -3, 2.5, 1.5), true); // o brilho
    // as rugas da junta, um pouco abaixo da unha
    var rugas = [[-32, 7], [-35, 8], [-38, 6]];
    g.lineStyle(1, som, 1);
    rugas.forEach(function (r) { var u0 = gira(r[0], -r[1]), u1 = gira(r[0], r[1]); g.lineBetween(u0.x, u0.y, u1.x, u1.y); });
    // as pontas dos quatro dedos, do lado direito, o mindinho menor
    for (dd = 0; dd < 4; dd++) {
      var fy = Y - 330 + dd * 26, larg = dd === 3 ? 8 : 11;
      g.fillStyle(som, 1).fillRoundedRect(ZAP.x1 - 3, fy, larg + 1, 19, 6);
      g.fillStyle(pele, 1).fillRoundedRect(ZAP.x1 - 3, fy, larg, 17, 6);
      g.fillStyle(unha, 0.7).fillRoundedRect(ZAP.x1 - 4 + larg - 4, fy + 4, 3, 8, 2);
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
    var M = MAPA_CEL, eu = GameState.estacaoAtual(), alvo = GameState.alvoAtual(), fim = GameState.destinoFinal();
    var n = 0, self = this;
    // um rótulo da reserva: rodado (os da Vermelha, como no mapa oficial) ou reto
    function rot(t, x, y, cor, ox, oy, ang) {
      if (n >= self.rotMapa.length) return null;
      return self.rotMapa[n++].setVisible(true).setOrigin(ox, oy).setAngle(ang || 0)
        .setPosition(Math.round(x), Math.round(y)).setText(t).setColor(cor);
    }
    function corDe(nome, base) {
      return nome === eu ? PAL.branco : (nome === fim || nome === alvo ? PAL.verde : base);
    }
    var az = LINHAS.azul.estacoes, vm = LINHAS.vermelha.estacoes, i, p;

    // as duas linhas, grossas, com os pontinhos brancos das estações por dentro
    g.fillStyle(0x0b5fae, 1).fillRect(M.BX - 2, M.yDe(az.length - 1), 5, M.yDe(0) - M.yDe(az.length - 1));
    g.lineStyle(5, 0xe8362c, 1);
    g.beginPath(); g.moveTo(M.rota[0][0], M.rota[0][1]);
    for (i = 1; i < M.rota.length; i++) g.lineTo(M.rota[i][0], M.rota[i][1]);
    g.strokePath();
    for (i = 0; i < az.length; i++) { p = M.pos('azul', az[i]); g.fillStyle(0xf2f0ff, 1).fillRect(p.x - 1, p.y - 1, 2, 2); }
    for (i = 0; i < vm.length; i++) { p = M.pos('vermelha', vm[i]); g.fillStyle(0xf2f0ff, 1).fillRect(p.x - 1, p.y - 1, 2, 2); }
    // a Sé, baldeação: a cápsula branca das estações de troca
    p = M.pos('azul', 'SÉ');
    g.fillStyle(0x0a0a12, 1).fillCircle(p.x, p.y, 6);
    g.fillStyle(0xf2f0ff, 1).fillCircle(p.x, p.y, 4.5);
    g.fillStyle(0x0a0a12, 1).fillCircle(p.x, p.y, 2);

    // os números das linhas, nos quadradinhos da cor delas
    g.fillStyle(0x0b5fae, 1).fillRect(M.BX - 20, M.yDe(az.length - 1) - 6, 12, 12);
    rot('1', M.BX - 14, M.yDe(az.length - 1) - 3, PAL.branco, 0.5, 0).setScale(ESCALA_TEXTO / 2);
    var pi = M.pos('vermelha', 'ITAQUERA');
    g.fillStyle(0xe8362c, 1).fillRect(pi.x - 6, pi.y - 24, 12, 12);
    rot('3', pi.x, pi.y - 21, PAL.branco, 0.5, 0).setScale(ESCALA_TEXTO / 2);

    /* Os nomes da Azul, todos, na vertical: do Tucuruvi até a Luz do lado
       direito, como no mapa; da Sé pra baixo do lado esquerdo, porque o
       lado direito de baixo é dos nomes da Vermelha que descem inclinados. */
    for (i = 0; i < az.length; i++) {
      var nm = az[i]; p = M.pos('azul', nm);
      if (nm === 'SÉ') { rot('SÉ', p.x + 6, p.y + 4, nm === eu ? PAL.branco : PAL.amarelo, 0, 0).setScale(ESCALA_TEXTO / 2); continue; }
      /* São Bento também à direita (à esquerda ela batia no nome da
         República), abreviada pra acabar antes da subida da Vermelha */
      var direita = i >= az.indexOf('SÃO BENTO');
      var t = rot(nm === 'SÃO BENTO' ? 'S. BENTO' : nm, p.x + (direita ? 7 : -7), p.y, corDe(nm, '#8fb4e0'), direita ? 0 : 1, 0.5);
      if (t) t.setScale(ESCALA_TEXTO / 2);
    }
    /* Os da Vermelha inclinados a 45 graus, como no mapa oficial: os do
       oeste sobem pra direita saindo da estação; os do leste terminam na
       estação e descem pra esquerda. No leste as estações ficam a 7px uma
       da outra: vão só as que todo mundo conhece (a sua e a do destino sempre). */
    var LESTE_COM_NOME = { 'BRÁS': 1, 'TATUAPÉ': 1, 'PENHA': 1, 'ITAQUERA': 1 };
    for (i = 0; i < vm.length; i++) {
      var nv = vm[i], pv = M.pos('vermelha', nv), leste = i > vm.indexOf('SÉ'), oeste = i < vm.indexOf('ANHANGABAÚ');
      var mostra = oeste || (leste && LESTE_COM_NOME[nv]) || nv === eu || nv === fim || nv === alvo;
      if (!mostra || nv === 'SÉ' || nv === 'PEDRO II' && nv !== eu && nv !== fim) continue;
      var tv = leste ? rot(nv, pv.x - 2, pv.y + 5, corDe(nv, '#eca09a'), 1, 0.5, -45)
                     : rot(nv, pv.x + 2, pv.y - 5, corDe(nv, '#eca09a'), 0, 0.5, -45);
      if (tv) tv.setScale(ESCALA_TEXTO / 2);
    }

    // onde você está: o anel branco; pra onde vai: o anel verde
    var pe = M.pos(GameState.linha, eu);
    g.lineStyle(2, 0xf2f0ff, 1).strokeCircle(pe.x, pe.y, 6);
    g.fillStyle(0xf2f0ff, 1).fillCircle(pe.x, pe.y, 2.5);
    var pa = M.pos(linhaDaEstacao(alvo) === 'azul' || alvo === 'SÉ' ? 'azul' : 'vermelha', alvo);
    if (pa && alvo !== eu) { g.lineStyle(2, 0x00e676, 1).strokeCircle(pa.x, pa.y, 7); }

    this.linha(0, ZAP.topo, '► ' + GameState.rotuloDaPerna(), PAL.amarelo).setOrigin(0, 0);
    this.linha(1, ZAP.topo + 18, '  ' + GameState.faltamEstacoes() + ' ATÉ ' + alvo, PAL.cinza).setOrigin(0, 0);
    // no EXPLORAR o mapa é um teletransporte: tocar numa estação leva até ela
    if (GameState.explorar) {
      this.linhas[1].setText('  TOQUE NUMA ESTAÇÃO').setColor(PAL.verde);
      this.zonaMapa.setInteractive();
    }
    this.tRodape.setText('AQUI: ' + eu);
  },

  /* ---------- ir de estação em estação, no EXPLORAR ----------
     'No modo explorar, clicou no mapa, você vai pra lá.' A estação mais
     perto do toque (até 10px) vira o lugar: o que estava rodando por
     baixo do celular (estação, vagão, luta) é desligado e você aparece
     na plataforma dela. */
  tocaMapa: function (px, py) {
    if (!GameState.explorar || this.modo !== 'app' || this.aba !== 1) return;
    var M = MAPA_CEL, melhor = null, dm = 10;
    ['azul', 'vermelha'].forEach(function (l) {
      LINHAS[l].estacoes.forEach(function (nm) {
        var p = M.pos(l, nm), d = Math.hypot(p.x - px, p.y - py);
        if (d < dm) { dm = d; melhor = nm; }
      });
    });
    if (!melhor) return;
    if (melhor === GameState.estacaoAtual()) { sfx('nao'); return; }
    sfx('ok');
    var self = this;
    ['Estacao', 'Vagao', 'Baldeacao', 'Desafio', 'Briga', 'Encarada', 'Disputa'].forEach(function (k) {
      if (self.scene.isActive(k) || self.scene.isPaused(k)) self.scene.stop(k);
    });
    this.congeladas = [];
    GameState.poeNoTrajeto(melhor);
    this.scene.start('Estacao', { onde: 'plataforma' });
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

  /* ---------- o app da mochila ----------
     Uma linha por coisa guardada: a figurinha, o nome com a quantidade e
     o que ela faz. Tocar usa. */
  itensDaMochila: function () {
    var m = GameState.mochila || {}, out = [];
    for (var k in m) if (m.hasOwnProperty(k) && m[k] > 0 && ITENS[k]) out.push(k);
    return out;
  },
  pintaMochila: function (g) {
    var itens = this.itensDaMochila(), i;
    if (!itens.length) {
      this.linha(0, ZAP.topo + 40, '  MOCHILA VAZIA.', PAL.cinzaEsc);
      this.linha(1, ZAP.topo + 70, '  COMPRE NAS LOJAS', PAL.cinzaEsc);
      this.tRodape.setText('');
      return;
    }
    if (this.sel >= itens.length) this.sel = 0;
    for (i = 0; i < itens.length && i < 6; i++) {
      var k = itens[i], it = ITENS[k], y = ZAP.topo + i * 56, sel = (i === this.sel);
      g.fillStyle(sel ? 0x2a2014 : 0x16161f, 1).fillRect(ZAP.tx0, y, ZAP.tx1 - ZAP.tx0, 52);
      if (sel) g.lineStyle(2, 0xf2c14e, 0.9).strokeRect(ZAP.tx0 + 1, y + 1, ZAP.tx1 - ZAP.tx0 - 2, 50);
      g.fillStyle(0x0a0a12, 1).fillRect(ZAP.tx0 + 8, y + 10, 32, 32);
      this.figMochila[i].setTexture(texturaItem(this, k)).clearTint().setScale(1.2)
        .setPosition(ZAP.tx0 + 24, y + 26).setVisible(true);
      this.zonasMochila[i].setInteractive();
      var ef = [];
      if (it.descanso) ef.push('+' + it.descanso + ' DESC');
      if (it.carisma) ef.push('+' + it.carisma + ' CAR');
      if (it.coracao) ef.push('+1 CORAÇÃO');
      if (it.bateria) ef.push('+' + it.bateria + '% BATERIA');
      if (it.sorte) ef.push('RASPE PRA VER');
      this.linhas[i * 2].setVisible(true).setPosition(ZAP.tx0 + 50, y + 6)
        .setText(it.nome.length > 13 ? it.nome.slice(0, 12) + '.' : it.nome).setColor(PAL.branco);
      // a linha de baixo cabe 18 letras (218px a 12 cada): se os efeitos não cabem, vai o primeiro
      var linhaEf = 'x' + GameState.mochila[k] + '  ' + ef.join(' ');
      if (linhaEf.length > 18) linhaEf = 'x' + GameState.mochila[k] + '  ' + ef[0];
      this.linhas[i * 2 + 1].setVisible(true).setPosition(ZAP.tx0 + 50, y + 28)
        .setText(linhaEf).setColor(PAL.cinza);
    }
    this.tRodape.setText(nomeAgir() + ': USAR');
  },
  usaItem: function (idx) {
    var itens = this.itensDaMochila();
    if (idx >= itens.length) return;
    var k = itens[idx], it = ITENS[k];
    this.sel = idx;
    var r = GameState.usaDaMochila(k);
    var msg = 'USOU: ' + it.nome;
    if (r === 'coracao') msg = '+1 CORAÇÃO';
    else if (r === 'premio') msg = 'RASPOU: +R$ ' + it.premio;
    else if (r === 'nada') msg = 'RASPOU... E NADA';
    else if (r === 'bateria') msg = 'BATERIA: ' + Math.round(GameState.bateria) + '%';
    sfx(r === 'nada' ? 'nao' : 'moeda');
    this.pinta();
    this.tRodape.setText(msg);
  },

  /* ---------- o app da METRODEX ----------
     Em cartas, como uma pokédex ('tem que ser algo mais assim'): duas por
     fileira, duas fileiras na tela. Cada carta tem o número numa pílula,
     a bolinha e a borda na cor do tipo, o boneco grande num círculo
     escuro, o nome, dois números e o tipo. Do desafiante: a paciência e a
     fraqueza (que só aparece depois de vencer); dos outros: onde aparece e
     se já foi visto. Quem nunca passou perto é silhueta com ???. */
  pintaDex: function (g) {
    var dex = leDex(), n = DEX.length, vistos = 0, i;
    for (i = 0; i < n; i++) if (dex[DEX[i].id]) vistos++;
    if (this.sel >= n) this.sel = 0;
    var fileiras = Math.ceil(n / 2);
    this.topoDex = Math.min(Math.floor(this.sel / 2), fileiras - 2) * 2;
    var W = DEXC.W, H = DEXC.H, VAO = DEXC.VAO, x0 = DEXC.x0, y0 = DEXC.y0;
    for (i = 0; i < 4; i++) {
      var k = this.topoDex + i, ct = this.cartasDex[i], fig = this.figMochila[i];
      if (k >= n) continue;
      var e = DEX[k], nivel = dex[e.id] || 0, sel = (k === this.sel);
      var x = x0 + (i % 2) * (W + VAO), y = y0 + Math.floor(i / 2) * (H + VAO), cx = x + W / 2;
      var cor = nivel ? (COR_TIPO[e.tipo] || 0xb8bccc) : 0x3a3a4a;
      // a carta: fundo, borda do tipo (mais grossa na escolhida)
      g.fillStyle(0x1c1c24, 1).fillRoundedRect(x, y, W, H, 8);
      g.lineStyle(sel ? 3 : 1.5, cor, sel ? 1 : 0.85).strokeRoundedRect(x + 1, y + 1, W - 2, H - 2, 8);
      // a pílula do número e a bolinha do tipo
      g.fillStyle(0x0a0a10, 0.9).fillRoundedRect(x + 5, y + 5, 30, 12, 6);
      g.fillStyle(cor, 1).fillCircle(x + W - 12, y + 11, 5);
      // o círculo escuro com o boneco
      g.fillStyle(0x2a2a34, 1).fillCircle(cx, y + 52, 36);
      g.fillStyle(0x34343f, 1).fillCircle(cx - 4, y + 46, 28);
      fig.setTexture(e.sprite, 0).setScale(1.4).setPosition(cx, y + 54).setVisible(true);
      if (nivel) fig.clearTint(); else fig.setTintFill(0x14141c);
      ct.num.setVisible(true).setPosition(x + 10, y + 7).setText('#' + (k + 1 < 10 ? '00' : '0') + (k + 1));
      // o nome, sempre no tamanho cheio; o que passa da carta vira letreiro (ver update)
      var nome = nivel ? e.nome : '???';
      ct.nome.setVisible(true).setOrigin(0.5, 0).setPosition(cx, y + 91).setText(nome)
        .setScale(ESCALA_TEXTO).setColor(nivel ? PAL.branco : PAL.cinzaEsc);
      if (ct.nome.width > W - 14) {
        // três vezes com vão de três espaços: a volta não pula e a faixa nunca fica vazia
        ct._rola = { x: x + 6, passo: ct.nome.width + 36 };
        ct.nome.setOrigin(0, 0).setText(nome + '   ' + nome + '   ' + nome);
      }
      var r1, v1, r2, v2;
      if (e.desafio && DESAFIANTES[e.id]) {
        var d = DESAFIANTES[e.id];
        r1 = 'PACIÊNCIA'; v1 = nivel ? String(d.pac) : '???';
        r2 = 'FRACO'; v2 = nivel === 2 ? nomeResposta(d.fraco) : '???';
      } else {
        r1 = 'ONDE'; v1 = nivel ? e.onde : '???';
        r2 = e.pega ? 'PEGA' : 'VISTO'; v2 = nivel ? (e.pega || 'SIM') : 'NÃO';
      }
      ct.r1.setVisible(true).setPosition(x + W * 0.28, y + 112).setText(r1);
      ct.v1.setVisible(true).setPosition(x + W * 0.28, y + 122).setText(v1);
      ct.r2.setVisible(true).setPosition(x + W * 0.72, y + 112).setText(r2);
      ct.v2.setVisible(true).setPosition(x + W * 0.72, y + 122).setText(v2).setColor(nivel === 2 ? PAL.verde : PAL.branco);
      ct.tipo.setVisible(true).setPosition(cx, y + 138).setText('TIPO: ' + (nivel ? e.tipo : '???'));
      ct.zona.setPosition(x, y).setSize(W, H).setInteractive();
    }
    // a carta escolhida conta o que ela faz no rodapé
    var es = DEX[this.sel], ns = dex[es.id] || 0;
    this.tRodape.setText('VISTOS ' + vistos + ' DE ' + n);
  },

  /* ---------- a ficha ----------
     'Quando clica no personagem, expande e tem mais detalhes dele.' A
     carta cresce pra tela inteira: o boneco grande, o nome, o tipo, o que
     ele faz, e do desafiante a paciência, o que ele usa contra você, a
     fraqueza e o que não adianta (os dois últimos só depois de vencer).
     Tocar em qualquer lugar volta pras cartas; as setas passam pro lado. */
  pintaFicha: function (g) {
    var k = this.dexAberta, e = DEX[k], dex = leDex(), nivel = dex[e.id] || 0;
    var cor = nivel ? (COR_TIPO[e.tipo] || 0xb8bccc) : 0x3a3a4a, corTxt = '#' + ('00000' + cor.toString(16)).slice(-6);
    var x = ZAP.tx0 + 6, y = ZAP.topo + 2, W = ZAP.tx1 - ZAP.tx0 - 12, H = ZAP.abas - ZAP.topo - 36, cx = x + W / 2;
    g.fillStyle(0x1c1c24, 1).fillRoundedRect(x, y, W, H, 10);
    g.lineStyle(3, cor, 1).strokeRoundedRect(x + 1, y + 1, W - 2, H - 2, 10);
    // faixa do tipo em cima, com o número
    g.fillStyle(cor, nivel ? 0.22 : 0.4).fillRoundedRect(x + 8, y + 8, W - 16, 20, 6);
    this.linha(0, y + 10, '#' + (k + 1 < 10 ? '00' : '0') + (k + 1), PAL.cinza);
    this.linhas[0].setScale(ESCALA_TEXTO / 2).setPosition(x + 16, y + 14);
    this.linha(1, y + 10, nivel ? e.tipo : '???', nivel ? corTxt : PAL.cinzaEsc);
    this.linhas[1].setScale(ESCALA_TEXTO / 2).setOrigin(1, 0).setPosition(x + W - 16, y + 14);
    // o boneco grande, de pé num círculo
    g.fillStyle(0x2a2a34, 1).fillCircle(cx, y + 80, 46);
    g.fillStyle(0x34343f, 1).fillCircle(cx - 5, y + 74, 36);
    g.fillStyle(0x000000, 0.35).fillEllipse(cx, y + 114, 38, 7);
    if (!this.fichaFig) this.fichaFig = this.add.image(0, 0, '__DEFAULT').setDepth(2403);
    this.fichaFig.setTexture(e.sprite, 0).setScale(2.2).setPosition(cx, y + 80).setVisible(true);
    if (nivel) this.fichaFig.clearTint(); else this.fichaFig.setTintFill(0x14141c);
    // o nome: aqui a carta é larga, cabe inteiro
    this.linha(2, y + 134, nivel ? e.nome : '???', nivel ? PAL.branco : PAL.cinzaEsc);
    this.linhas[2].setOrigin(0.5, 0).setPosition(cx, y + 134);
    var estado = nivel === 2 ? 'VENCIDO' : (nivel ? 'VISTO' : 'NUNCA VISTO');
    this.linha(3, y + 156, estado + (nivel ? '  -  ' + e.onde : ''), nivel === 2 ? PAL.verde : PAL.cinza);
    this.linhas[3].setScale(ESCALA_TEXTO / 2).setOrigin(0.5, 0).setPosition(cx, y + 156);
    // o que ele faz
    g.fillStyle(0x121218, 1).fillRoundedRect(x + 10, y + 172, W - 20, 36, 6);
    this.linha(4, y + 178, nivel ? e.desc : 'Passe perto dessa pessoa pra saber quem é.', nivel ? PAL.branco : PAL.cinzaEsc);
    this.linhas[4].setScale(ESCALA_TEXTO / 2).setMaxWidth((W - 36) / (ESCALA_TEXTO / 2)).setPosition(x + 18, y + 179);
    // os números
    var linhasStat = [];
    if (e.desafio && DESAFIANTES[e.id]) {
      var d = DESAFIANTES[e.id], golpes = (d.golpes || []).map(function (o) { return o.nome; });
      linhasStat.push(['PACIÊNCIA', nivel ? String(d.pac) : '???']);
      linhasStat.push(['ATACA COM', nivel ? golpes.join('\n') : '???']);
      linhasStat.push(['FRACO A', nivel === 2 ? nomeResposta(d.fraco) : 'VENÇA PRA VER']);
      linhasStat.push(['NÃO ADIANTA', nivel === 2 && d.resiste ? nomeResposta(d.resiste) : (nivel === 2 ? '-' : 'VENÇA PRA VER')]);
    } else {
      linhasStat.push(['ONDE', nivel ? e.onde : '???']);
      if (e.pega) linhasStat.push(['SE TE PEGA', nivel ? e.pega : '???']);
      linhasStat.push(['DUELA', 'NÃO']);
    }
    // uma linha por golpe: a lista inteira numa linha só quebrava por cima do FRACO A
    var ly = y + 218;
    for (var i = 0; i < linhasStat.length; i++) {
      var nl = linhasStat[i][1].split('\n').length, alt = 12 + nl * 10;
      g.fillStyle(0x2a2a34, 1).fillRect(x + 12, ly + alt, W - 24, 1);
      this.linha(5 + i * 2, ly, linhasStat[i][0], PAL.cinzaEsc);
      this.linhas[5 + i * 2].setScale(ESCALA_TEXTO / 2).setPosition(x + 14, ly + 4);
      this.linha(6 + i * 2, ly, linhasStat[i][1], PAL.branco);
      this.linhas[6 + i * 2].setScale(ESCALA_TEXTO / 2).setOrigin(1, 0).setPosition(x + W - 14, ly + 4).setRightAlign();
      ly += alt + 5;
    }
    this.zonaFicha.setInteractive();
    this.tRodape.setText('TOQUE PRA VOLTAR');
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
    // tela acesa gasta: 1% a cada 3 segundos com o celular aberto, e apaga no zero
    if (GameState.bateria !== undefined && !this.saindo) {
      GameState.bateria = Math.max(0, GameState.bateria - dt / 3000);
      if (GameState.bateria <= 0) { sfx('nao'); this.fecha(); return; }
    }
    // o nome comprido das cartas da METRODEX roda da direita pra esquerda
    if (this.modo === 'app' && this.aba === 5 && this.cartasDex) {
      for (var ci = 0; ci < this.cartasDex.length; ci++) {
        var cr = this.cartasDex[ci]._rola;
        if (cr) this.cartasDex[ci].nome.setX(cr.x - ((time * 0.03) % cr.passo));
      }
    }
    // bloqueado: o cadeado se abre sozinho logo depois de o aparelho subir
    if (this.modo === 'bloqueio' && !this.abrindo) {
      this.tBloq += dt;
      if (this.tBloq > 620) this.desbloqueia();
    }
  }
});
