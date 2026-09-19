/* global Phaser */
/* Catraca — o celular, em primeira pessoa

   O trajeto tinha destino, mas o destino era dado: casa de manhã,
   trabalho de tarde, sempre igual. Aqui é onde a vida entra no meio do
   caminho — a mãe pede a farmácia, o chefe antecipa a reunião, a
   resenha muda de bar — e vira o destino da perna.

   A tela é o celular na sua mão: abre bloqueado, destrava, e mostra a
   tela inicial com os apps (ZipZap, Mapa, Banco, Catragram...). Enquanto ele está aberto o jogo congela,
   igual à pausa: no metrô de verdade também é assim, você para de olhar
   pra onde está indo quando abre o ZipZap.

   Como a cena de jogo fica pausada por baixo, aqui o teclado é ouvido
   direto por evento — cena pausada não atualiza tecla nenhuma. */

var ABAS_ZAP = ['ZIPZAP', 'MAPA', 'BANCO', 'CATRAGRAM', 'MOCHILA', 'METRODEX'];

/* ---------- a tela inicial ----------
   As abas embaixo viraram aplicativos: o celular abre bloqueado, o
   cadeado solta, a tela sobe, e o que aparece é a tela inicial com os
   apps, como em qualquer aparelho. Cor, desenho e o lugar de cada
   ícone (ver lugarDoApp). O polegar que descia a cada toque saiu:
   cobria a tela bem na hora de ler ('o dedo atrapalha'). */
var APPS_ZAP = [
  { nome: 'ZIPZAP', cor: 0x1faa59, cab: 0x0f3a2c },
  { nome: 'MAPA', cor: 0xf2f0ff, cab: 0x1c2a4a },
  { nome: 'BANCO', cor: 0x14284a, cab: 0xec7000 },
  // o MISSÕES virou o CATRAGRAM (src/catragram.js): cabeçalho claro, como o do ZipZap
  { nome: 'CATRAGRAM', cor: 0xd6307a, cab: 0xffffff },
  { nome: 'MOCHILA', cor: 0xb07a3a, cab: 0x3a2814 },
  { nome: 'METRODEX', cor: 0xe8362c, cab: 0x5a1414 }
];
/* Com a MOCHILA são cinco: três por fileira, ícones de 60 (os de 72 em
   2x2 não cabiam mais). 'CATRAGRAM' e 'MOCHILA' são os nomes compridos, e as
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
var DEXC = { W: 128, H: 148, VAO: 8 };
function semAcentoDex(t) { return String(t).toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''); }
DEXC.x0 = 0; DEXC.y0 = 0;   // acertados logo abaixo do ZAP
/* ---------- o mapa do celular, fiel ao do Metrô ----------
   'Tentar mais fiel a esse mapa, focando na azul e na vermelha.' A Azul
   em pé, com todas as estações a 14px; a Vermelha sai da Barra Funda na
   altura da Luz, desce inclinada pela Santa Cecília até a República,
   cruza a Sé, e depois do Pedro II sobe de novo até o Brás, de onde
   corre reta até Itaquera, como no mapa da parede do metrô. */
var MAPA_CEL = { BX: 150, Y0: 144, PASSO: 14 };
var MAPA_AREA = { y0: 130, y1: 458 };   // a área do desenho da rede, abaixo das abas e acima do rodapé
MAPA_CEL.yDe = function (i) { return MAPA_CEL.Y0 + (LINHAS.azul.estacoes.length - 1 - i) * MAPA_CEL.PASSO; };
(function () {
  /* As posições seguem o mapa oficial ('seja mais fiel ao posicionamento'):
     a Barra Funda na altura da Luz, a Vermelha descendo em diagonal por
     Deodoro, Santa Cecília e República, reta pelo Anhangabaú até a Sé e o
     Pedro II; sobe até o Brás e corre reta pro leste na altura de São
     Bento, até Itaquera. */
  var M = MAPA_CEL, az = LINHAS.azul.estacoes;
  var yL = M.yDe(az.indexOf('LUZ')), ySB = M.yDe(az.indexOf('SÃO BENTO')), yS = M.yDe(az.indexOf('SÉ'));
  M.yL = yL; M.ySB = ySB; M.yS = yS;
  M.rota = [[98, yL], [126, yS], [168, yS], [186, yL + 10], [196, ySB], [290, ySB]];
  M.verm = {
    'BARRA FUNDA': [98, yL], 'MAL. DEODORO': [105, yL + 7], 'STA. CECÍLIA': [112, yL + 14],
    'REPÚBLICA': [119, yL + 21], 'ANHANGABAÚ': [137, yS], 'SÉ': [150, yS], 'PEDRO II': [168, yS], 'BRÁS': [186, yL + 10]
  };
  var leste = LINHAS.vermelha.estacoes.slice(LINHAS.vermelha.estacoes.indexOf('BRÁS') + 1);
  for (var i = 0; i < leste.length; i++) M.verm[leste[i]] = [198 + i * 10, ySB];
})();
MAPA_CEL.pos = function (linha, nome) {
  if (linha === 'vermelha' && MAPA_CEL.verm[nome]) return { x: MAPA_CEL.verm[nome][0], y: MAPA_CEL.verm[nome][1] };
  var i = LINHAS.azul.estacoes.indexOf(nome);
  if (i < 0) return MAPA_CEL.pos('vermelha', nome);
  return { x: MAPA_CEL.BX, y: MAPA_CEL.yDe(i) };
};

/* A lista do ZipZap no desenho do zap claro: a pesquisa, os filtros, e
   as conversas começando em `topo`, de 52 em 52. */
var ZAP_LISTA = { buscaY: 0, chipY: 28, topo: 54, alt: 52 };
var ZAP_FILTROS = [{ x: 34, w: 56, t: 'TODAS' }, { x: 96, w: 80, t: 'NÃO LIDAS' }, { x: 182, w: 62, t: 'GRUPOS' }];
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
    this.tBadgeCat = txtC(this, 0, 0, '', PAL.branco, 8).setDepth(2403);
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
    /* 'Inverte o X e o início' e 'tem que ser um botão de voltar': em
       cima, onde era o ✕, mora o ◄ VOLTAR (um passo pra trás: da conversa
       pra lista, da ficha pras cartas, do app pra tela inicial); o ✕
       FECHAR desceu pra barra de baixo, que era do INÍCIO. */
    this.zonaX = this.add.zone(ZAP.tx1 - 76, ZAP.status - 2, 80, 26)
      .setOrigin(0, 0).setInteractive();
    this.zonaX.on('pointerdown', function () { if (self.modo === 'app') self.voltar(); });
    this.tVoltar = txtC(this, ZAP.tx1 - 38, ZAP.status + 7, '◄ VOLTAR', PAL.branco, 8).setScale(ESCALA_TEXTO / 2).setDepth(2413).setVisible(false);

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
    this.zonaInicio.on('pointerdown', function () { if (self.modo !== 'bloqueio') self.fecha(); });
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
    DEXC.x0 = ZAP.tx0 + (ZAP.tx1 - ZAP.tx0 - (DEXC.W * 2 + DEXC.VAO)) / 2; DEXC.y0 = ZAP.topo + 50;
    this.montaBuscaDex();
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
      mn.fillStyle(0xffffff, 1).fillRect(mx + 6, my + 78, DEXC.W - 12, 22);
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
    this.mapaVista = GameState.explorar ? 'rede' : 'caminho';
    this.mapaZoom = 1; this.mapaPan = { x: 0, y: 0 };
    this.gMapa = this.add.graphics().setDepth(2401);
    var mm = this.make.graphics({ add: false });
    mm.fillStyle(0xffffff, 1).fillRect(ZAP.tx0, MAPA_AREA.y0, ZAP.tx1 - ZAP.tx0, MAPA_AREA.y1 - MAPA_AREA.y0);
    this.mascMapa = mm.createGeometryMask();
    this.gMapa.setMask(this.mascMapa);
    // a roda do mouse aproxima e afasta
    this.input.on('wheel', function (pt, objs, dx, dy) {
      if (self.modo === 'app' && self.aba === 3) {
        if (self.catVista === 'feed') self.passaPost(dy > 0 ? 1 : -1);
        else { self.catRolo = self.limitaRoloCat(self.catRolo + (dy > 0 ? 1 : -1)); self.pinta(); }
        return;
      }
      if (self.modo === 'app' && self.aba === 1 && self.mapaVista === 'rede') self.zoomMapa(dy < 0 ? 0.5 : -0.5);
    });
    this.zonaAbasMapa = this.add.zone(ZAP.tx0, ZAP.topo - 8, ZAP.tx1 - ZAP.tx0, 24).setOrigin(0, 0);
    this.zonaAbasMapa.on('pointerdown', function (pt) {
      if (self.modo !== 'app' || self.aba !== 1) return;
      var v = (pt.x - ZAP.tx0) < (ZAP.tx1 - ZAP.tx0) / 2 ? 'caminho' : 'rede';
      if (v !== self.mapaVista) { self.mapaVista = v; sfx('catraca'); self.pinta(); }
    });
    this.zonaMapa = this.add.zone(ZAP.tx0, MAPA_AREA.y0, ZAP.tx1 - ZAP.tx0, MAPA_AREA.y1 - MAPA_AREA.y0).setOrigin(0, 0);
    this.zonaMapa.on('pointerdown', function (pt) {
      self._arrasto = { x: pt.x, y: pt.y, px: self.mapaPan.x, py: self.mapaPan.y, andou: false };
    });
    this.input.on('pointermove', function (pt) {
      var a = self._arrasto;
      if (!a || !pt.isDown || self.aba !== 1 || self.mapaVista !== 'rede') return;
      if (Math.abs(pt.x - a.x) + Math.abs(pt.y - a.y) > 6) a.andou = true;
      if (!a.andou || self.mapaZoom <= 1) return;
      self.mapaPan.x = a.px + (pt.x - a.x); self.mapaPan.y = a.py + (pt.y - a.y);
      self.limitaPan(); self.pinta();
    });
    this.input.on('pointerup', function (pt) {
      var a = self._arrasto; self._arrasto = null;
      if (!a || a.andou || self.aba !== 1 || self.mapaVista !== 'rede' || self.modo !== 'app') return;
      var bx = ZAP.tx1 - 30;
      if (Math.hypot(pt.x - bx, pt.y - (MAPA_AREA.y1 - 62)) < 14) { self.zoomMapa(0.75); return; }
      if (Math.hypot(pt.x - bx, pt.y - (MAPA_AREA.y1 - 30)) < 14) { self.zoomMapa(-0.75); return; }
      self.tocaMapa(pt.x, pt.y);
    });
    /* o CATRAGRAM: as duas abas no alto e a área do conteúdo, que se
       toca (abre o post, mostra o que falta) e se arrasta (rola o grid,
       passa o post) */
    this.catVista = 'perfil'; this.catRolo = 0; this.catSel = 0; this.catPost = 0; this.catInfo = null;
    this.zonaAbasCat = this.add.zone(ZAP.tx0, ZAP.topo - 8, ZAP.tx1 - ZAP.tx0, 24).setOrigin(0, 0);
    this.zonaAbasCat.on('pointerdown', function (pt) {
      if (self.modo !== 'app' || self.aba !== 3) return;
      var v = (pt.x - ZAP.tx0) < (ZAP.tx1 - ZAP.tx0) / 2 ? 'perfil' : 'feed';
      if (v !== self.catVista) { self.catVista = v; self.catInfo = null; sfx('catraca'); self.pinta(); }
    });
    this.zonaCat = this.add.zone(ZAP.tx0, ZAP.topo + 16, ZAP.tx1 - ZAP.tx0, ZAP.abas - ZAP.topo - 16).setOrigin(0, 0);
    this.zonaCat.on('pointerdown', function (pt) {
      self._arrCat = { x: pt.x, y: pt.y, rolo: self.catRolo, andou: false };
    });
    this.input.on('pointermove', function (pt) {
      var a = self._arrCat;
      if (!a || !pt.isDown || self.aba !== 3 || self.modo !== 'app') return;
      if (Math.abs(pt.y - a.y) > 8) a.andou = true;
      if (a.andou && self.catVista === 'perfil') {
        var r = self.limitaRoloCat(a.rolo - Math.round((pt.y - a.y) / 66));
        if (r !== self.catRolo) { self.catRolo = r; self.pinta(); }
      }
    });
    this.input.on('pointerup', function (pt) {
      var a = self._arrCat; self._arrCat = null;
      if (!a || self.aba !== 3 || self.modo !== 'app') return;
      if (!a.andou) { self.tocaCat(pt.x, pt.y); return; }
      if (self.catVista === 'feed' && Math.abs(pt.y - a.y) > 40) self.passaPost(pt.y < a.y ? 1 : -1);
    });
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
    this.filtroZap = 'todas';
    this.zonasFiltro = [];
    ['todas', 'naolidas', 'grupos'].forEach(function (fz, k) {
      var zf = self.add.zone(ZAP_FILTROS[k].x, ZAP.topo + ZAP_LISTA.chipY, ZAP_FILTROS[k].w, 18).setOrigin(0, 0);
      zf.on('pointerdown', function () {
        if (self.aba !== 0 || self.fio || self.modo !== 'app') return;
        self.filtroZap = fz; self.sel = 0; sfx('catraca'); self.pinta();
      });
      self.zonasFiltro.push(zf);
    });
    this.zonasLinha = [];
    for (i = 0; i < 6; i++) {
      var zl = this.add.zone(ZAP.tx0, ZAP.topo + i * 62, ZAP.tx1 - ZAP.tx0, 58).setOrigin(0, 0).setInteractive();
      (function (idx) {
        zl.on('pointerdown', function () {
          if (self.aba !== 0 || self.fio) return;
          var caixa = self.caixaZap();
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
        if (df) {
          var ld = self.dexLista();
          self.sel = (self.sel + df + ld.length) % ld.length; self.dexAberta = ld[self.sel];
          sfx('catraca'); self.pinta();
        }
        else self.fechaFicha();
        return;
      }
      if (self.modo === 'app' && self.aba === 3 && self.teclaCat(c)) return;
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
      if (self.aba === 1 && self.mapaVista === 'rede' && (c === 'Equal' || c === 'NumpadAdd' || c === 'Minus' || c === 'NumpadSubtract')) {
        self.zoomMapa(c === 'Equal' || c === 'NumpadAdd' ? 0.5 : -0.5); return;
      }
      if (self.aba === 5) {
        var dd = 0;
        if (c === 'KeyA' || c === 'ArrowLeft') dd = -1;
        else if (c === 'KeyD' || c === 'ArrowRight') dd = 1;
        else if (c === 'KeyW' || c === 'ArrowUp') dd = -2;
        else if (c === 'KeyS' || c === 'ArrowDown') dd = 2;
        if (dd) { self.sel = Phaser.Math.Clamp(self.sel + dd, 0, Math.max(0, self.dexLista().length - 1)); sfx('catraca'); self.pinta(); return; }
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
      /* a primeira e a última faixa têm os cantos redondos da tela: retas,
         elas vazavam pelos cantos do aparelho ('tá vazando o retângulo') */
      var raio = { tl: i === 0 ? 14 : 0, tr: i === 0 ? 14 : 0, bl: i === passos - 1 ? 14 : 0, br: i === passos - 1 ? 14 : 0 };
      g.fillStyle((r << 16) | (gg << 8) | b, 1)
        .fillRoundedRect(ZAP.tx0 - 4, Math.floor(y0 + i * h), ZAP.tx1 - ZAP.tx0 + 8, Math.ceil(h) + (i === passos - 1 ? 0 : 1), raio);
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
    if (i === 3) { this.catVista = 'perfil'; this.catRolo = 0; this.catSel = 0; this.catPost = 0; this.catInfo = null; Catragram.marcaVistos(); }
    sfx('ok');
    this.pinta();
  },

  abreFicha: function (pos) {
    var l = this.dexLista();
    if (!l.length || pos >= l.length) return;
    this.sel = pos; this.dexAberta = l[pos];
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
    if (this.inpDex) this.inpDex.blur();
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
    var n = this.aba === 4 ? this.itensDaMochila().length : (this.aba === 5 ? DEX.length : this.caixaZap().length);
    if ((this.aba !== 0 && this.aba !== 4 && this.aba !== 5) || !n) return;
    this.sel = (this.sel + d + n) % n;
    sfx('catraca');
    this.pinta();
  },

  /* os filtros de cima da lista, como os do zap: TODAS, NÃO LIDAS, GRUPOS */
  caixaZap: function () {
    var c = chegaram(GameState.zap), f = this.filtroZap || 'todas';
    if (f === 'todas') return c;
    return c.filter(function (m) { return f === 'grupos' ? !!m.grupo : !m.lida; });
  },

  abre: function () {
    var caixa = this.caixaZap();
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
    if (f.hist) {
      var es = f.respondido ? [] : Historia.escolhas(f);
      if (!es.length) return [{ rotulo: nomeAgir() + ': VOLTAR', cor: PAL.cinzaEsc, acao: 'volta' }];
      return es.map(function (e) { return { rotulo: e.texto, cor: PAL.verde, acao: 'hist', e: e }; });
    }
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
    if (op.acao === 'hist') { Historia.escolhe(f, op.e); this.opBotao = 0; sfx('ok'); this.pinta(); return; }

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
    for (i = 0; i < this.zonasFiltro.length; i++) this.zonasFiltro[i].disableInteractive();
    for (i = 0; i < this.zonasBotao.length; i++) this.zonasBotao[i].disableInteractive();
    this.zonaVolta.disableInteractive();
    for (i = 0; i < this.zonasMochila.length; i++) { this.zonasMochila[i].disableInteractive(); this.figMochila[i].setVisible(false).setCrop(); }
    this.zonaCat.disableInteractive(); this.zonaAbasCat.disableInteractive();
    for (i = 0; i < this.cartasDex.length; i++) {
      var cc = this.cartasDex[i];
      cc.num.setVisible(false); cc.nome.setVisible(false); cc.r1.setVisible(false); cc.v1.setVisible(false);
      cc.r2.setVisible(false); cc.v2.setVisible(false); cc.tipo.setVisible(false); cc.zona.disableInteractive();
      cc._rola = null;
    }
    this.zonaFicha.disableInteractive();
    if (this.tChipsDex) {
      this.tChipsDex.forEach(function (t) { t.setVisible(false); });
      this.tBuscaDex.setVisible(false); this.gChipsDex.clear();
      this.zBuscaDex.disableInteractive(); this.zChipsDex.disableInteractive();
    }
    this.zonaMapa.disableInteractive();
    this.zonaAbasMapa.disableInteractive();
    for (i = 0; i < this.rotMapa.length; i++) this.rotMapa[i].setVisible(false).setAngle(0).clearMask().setMaxWidth(0);
    if (this.gMapa) this.gMapa.clear();
    if (this.fichaFig) this.fichaFig.setVisible(false);
    var noInicio = (this.modo !== 'app');
    for (i = 0; i < this.zonas.length; i++) {
      if (this.modo === 'inicio') this.zonas[i].setInteractive(); else this.zonas[i].disableInteractive();
    }
    if (this.modo !== 'bloqueio') this.zonaInicio.setInteractive(); else this.zonaInicio.disableInteractive();
    if (this.modo === 'app') this.zonaX.setInteractive(); else this.zonaX.disableInteractive();
    this.tRodape.setText('').setColor(PAL.cinzaEsc);

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

    if (noInicio) { this.pintaInicio(g); if (this.modo === 'inicio') this.barraFechar(g); }
    else {
      // o cabeçalho do app, na cor dele, com o nome
      var zapClaro = this.aba === 0 && !this.fio, catClaro = this.aba === 3;
      g.fillStyle(zapClaro ? 0xffffff : APPS_ZAP[this.aba].cab, 1).fillRect(ZAP.tx0, ZAP.status, ZAP.tx1 - ZAP.tx0, 22);
      this.tStatus.setText(zapClaro ? 'ZipZap' : (catClaro ? 'Catragram' : APPS_ZAP[this.aba].nome))
        .setColor(zapClaro ? '#1da851' : (catClaro ? '#d6307a' : PAL.branco));
      if (this.aba === 0) this.pintaZap(g);
      else if (this.aba === 1) this.pintaMapa(g);
      else if (this.aba === 2) this.pintaGrana(g);
      else if (this.aba === 3) this.pintaCatragram(g);
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
    // e o Catragram, a bolinha dos posts que você ainda não viu
    var nc = Catragram.naoVistos(), cl = lugarDoApp(3);
    if (nc && mostra) {
      g.fillStyle(0xe8362c, 1).fillCircle(cl.x + ICONE_APP - 4, cl.y + 4, 11);
      this.tBadgeCat.setVisible(true).setPosition(cl.x + ICONE_APP - 4, cl.y - 6).setText(String(Math.min(nc, 9)));
    } else this.tBadgeCat.setVisible(false);
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
      // Catragram: o brilho laranja no canto, e a câmera de contorno branco
      g.fillStyle(0xf2a03c, 0.85).fillCircle(cx - 14, cy + 14, 14);
      g.fillStyle(0xf7c04a, 0.7).fillCircle(cx - 18, cy + 18, 8);
      g.lineStyle(4, 0xffffff, 1).strokeRoundedRect(cx - 17, cy - 17, 34, 34, 10);
      g.lineStyle(4, 0xffffff, 1).strokeCircle(cx, cy, 8);
      g.fillStyle(0xffffff, 1).fillCircle(cx + 10, cy - 10, 2.5);
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
    // o ◄ VOLTAR, no canto de cima, só dentro de um app
    this.tVoltar.setVisible(this.modo === 'app');
    if (this.modo === 'app') {
      g.fillStyle(0x0a0a12, 0.55).fillRoundedRect(ZAP.tx1 - 74, ZAP.status + 1, 72, 20, 6);
      g.lineStyle(1, 0xf2f0ff, 0.8).strokeRoundedRect(ZAP.tx1 - 73.5, ZAP.status + 1.5, 71, 19, 6);
    }
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
      /* ---------- a conversa, com cara de zap ----------
         'Melhora os diálogos do celular no ZipZap.' Era uma linha de
         texto grande por balão, que passava da borda da tela, e o
         destino da resposta encavalava no botão. Agora é o que todo
         mundo reconhece: o cabeçalho com a foto, o nome e o 'online'; o
         fundo escuro de conversa; UMA mensagem por balão, quebrando a
         linha dentro dele, com o biquinho e a hora no canto; a sua
         resposta à direita em verde, com o ✓✓; e as respostas possíveis
         como botões, com o destino numa linha menor embaixo. */
      var f0 = this.fio, x0 = ZAP.tx0, x1 = ZAP.tx1, W = x1 - x0;
      // o fundo da conversa, com os pontinhos do papel de parede
      g.fillStyle(0x0b141a, 1).fillRect(x0, ZAP.topo - 8, W, ZAP.abas - ZAP.topo + 8);
      g.fillStyle(0x16222a, 1);
      for (var py = ZAP.topo + 30; py < ZAP.abas - 100; py += 18) {
        for (var px = x0 + 10 + ((py / 18) % 2) * 9; px < x1 - 6; px += 18) g.fillRect(px, py, 2, 2);
      }
      // o cabeçalho claro, como o da foto: voltar, a foto, o nome e o online
      g.fillStyle(0xf0f2f5, 1).fillRect(x0, ZAP.topo - 8, W, 34);
      g.fillStyle(0xd1d7db, 1).fillRect(x0, ZAP.topo + 25, W, 1);
      g.fillStyle(f0.grupo ? 0x3a5a8a : 0x4a4a5e, 1).fillCircle(x0 + 30, ZAP.topo + 9, 11);
      g.fillStyle(0x7a7a90, 1).fillCircle(x0 + 30, ZAP.topo + 5, 4).fillRect(x0 + 24, ZAP.topo + 11, 12, 6);
      this.linha(0, ZAP.topo - 6, '◄', '#3b4a54').setPosition(x0 + 4, ZAP.topo + 1);
      this.linha(1, ZAP.topo - 6, (f0.grupo ? '# ' : '') + f0.nome, '#111b21').setPosition(x0 + 48, ZAP.topo - 5);
      this.linha(2, ZAP.topo, f0.grupo ? 'GRUPO' : 'ONLINE', '#667781').setScale(ESCALA_TEXTO / 2).setPosition(x0 + 48, ZAP.topo + 13);
      // a pílula do dia, no alto da conversa
      g.fillStyle(0x1f2c34, 1).fillRoundedRect(x0 + W / 2 - 22, ZAP.topo + 32, 44, 14, 5);
      this.linha(9, ZAP.topo + 35, 'HOJE', '#8696a0').setScale(ESCALA_TEXTO / 2).setOrigin(0.5, 0).setPosition(x0 + W / 2, ZAP.topo + 35);

      var hora = GameState.hora ? GameState.hora() : '';
      var y = ZAP.topo + 56, eu = this;
      // um balão: o texto quebra dentro dele; a hora (e o ✓✓ no seu) no canto de baixo
      var bal = function (iTxt, iHora, texto, meu) { balLivre(eu.linhas[iTxt], eu.linhas[iHora], texto, meu); };
      var balLivre = function (t, th, texto, meu) {
        var esc = ESCALA_TEXTO / 2, maxW = W - 64;
        t.clearMask && t.clearMask(); th.clearMask && th.clearMask(); t.setAngle(0); th.setAngle(0);
        t.setVisible(true).setOrigin(0, 0).setScale(esc).setMaxWidth(maxW / esc).setText(texto).setColor('#111b21');
        var tw = Math.min(maxW, Math.ceil(t.width)), tHt = Math.ceil(t.height);
        th.setVisible(true).setOrigin(1, 0).setScale(esc).setText(hora + (meu ? ' ✓✓' : '')).setColor(meu ? '#2f8fd0' : '#667781');
        var bw = Math.max(tw, Math.ceil(th.width) + 4) + 16, bh = tHt + 22;
        var bx = meu ? x1 - 10 - bw : x0 + 10;
        // o recebido branco, o seu verde-clarinho (as cores da foto)
        g.fillStyle(meu ? 0xd9fdd3 : 0xffffff, 1).fillRoundedRect(bx, y, bw, bh, 6);
        // o biquinho, no canto de cima do lado de quem fala
        if (meu) g.fillTriangle(bx + bw - 6, y, bx + bw + 6, y, bx + bw - 6, y + 10);
        else g.fillTriangle(bx + 6, y, bx - 6, y, bx + 6, y + 10);
        t.setPosition(bx + 8, y + 6);
        th.setPosition(bx + bw - 6, y + bh - 12);
        y += bh + 8;
      };
      if (f0.log) {
        // conversa da história: os últimos balões, em ordem, cada um com a sua vez
        var ult = f0.log.slice(-4), iTx = 0;
        for (i = 0; i < ult.length; i++) {
          var par = [this.rotMapa[iTx], this.rotMapa[iTx + 1]]; iTx += 2;
          balLivre(par[0], par[1], ult[i].t, ult[i].de === 'eu');
        }
      } else {
        bal(3, 4, f0.msgs.join(' '), false);
        for (i = 0; i < f0.enviadas.length && i < 2; i++) bal(5 + i * 2, 6 + i * 2, f0.enviadas[i], true);
      }

      // as respostas possíveis: botões arredondados, o destino numa linha menor embaixo
      var ops = this.respostasDoFio();
      for (i = 0; i < ops.length; i++) {
        var by = ZAP.abas + ZAP_BOTAO.dy + i * ZAP_BOTAO.passo;
        var mira = (i === Math.min(this.opBotao, ops.length - 1));
        var cor = num(ops[i].cor);
        var bx = x0 + ZAP_BOTAO.dx, bw = W - ZAP_BOTAO.dx * 2;
        var bh = ops[i].nota ? ZAP_BOTAO.altNota : ZAP_BOTAO.alt;
        g.fillStyle(mira ? 0x10332a : 0x1f2c34, 1).fillRoundedRect(bx, by, bw, bh, 8);
        g.lineStyle(2, mira ? cor : 0x2f3f48, 1).strokeRoundedRect(bx + 1, by + 1, bw - 2, bh - 2, 8);
        this.linha(10 + i * 2, by + 5, ops[i].rotulo, mira ? ops[i].cor : PAL.branco)
          .setPosition(bx + 10, by + 5);
        if (ops[i].nota) {
          this.linha(11 + i * 2, by + 25, 'VAI PRA: ' + ops[i].nota, PAL.amarelo)
            .setScale(ESCALA_TEXTO / 2).setPosition(bx + 12, by + 25);
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

    /* ---------- a lista, no zap claro ----------
       As fotos que vieram: fundo branco, a pesquisa, os filtros em
       pílula (o escolhido em verde-clarinho), e cada conversa com a foto
       redonda colorida com a inicial, o nome escuro, a prévia cinza, a
       hora à direita e a bolinha verde com o número de não lidas. */
    var X0 = ZAP.tx0, X1 = ZAP.tx1, W = X1 - X0, T = ZAP.topo, eu = this;
    g.fillStyle(0xffffff, 1).fillRect(X0, T - 8, W, ZAP.abas - T + 8);
    for (i = 0; i < this.zonasBotao.length; i++) this.zonasBotao[i].disableInteractive();
    this.zonaVolta.disableInteractive();
    // a pesquisa
    g.fillStyle(0xf0f2f5, 1).fillRoundedRect(X0 + 8, T + ZAP_LISTA.buscaY - 4, W - 16, 22, 11);
    g.lineStyle(2, 0x667781, 1).strokeCircle(X0 + 22, T + ZAP_LISTA.buscaY + 6, 4);
    g.lineBetween(X0 + 25, T + ZAP_LISTA.buscaY + 9, X0 + 29, T + ZAP_LISTA.buscaY + 13);
    this.linhas[19].setVisible(true).setScale(ESCALA_TEXTO / 2).setPosition(X0 + 36, T + ZAP_LISTA.buscaY + 3)
      .setText('PESQUISAR').setColor('#8696a0');
    // os filtros
    var filtros = ['todas', 'naolidas', 'grupos'];
    for (i = 0; i < 3; i++) {
      var ff = ZAP_FILTROS[i], on = (this.filtroZap === filtros[i]);
      g.fillStyle(on ? 0xd9fdd3 : 0xf0f2f5, 1).fillRoundedRect(ff.x, T + ZAP_LISTA.chipY, ff.w, 18, 9);
      this.linhas[16 + i].setVisible(true).setScale(ESCALA_TEXTO / 2).setOrigin(0.5, 0)
        .setPosition(ff.x + ff.w / 2, T + ZAP_LISTA.chipY + 5).setText(ff.t).setColor(on ? '#15803d' : '#54656f');
      this.zonasFiltro[i].setInteractive();
    }

    var caixa = this.caixaZap();
    for (i = 0; i < this.zonasLinha.length; i++) {
      this.zonasLinha[i].setPosition(X0, T + ZAP_LISTA.topo + i * ZAP_LISTA.alt).setSize(W, ZAP_LISTA.alt);
      if (i < caixa.length) this.zonasLinha[i].setInteractive(); else this.zonasLinha[i].disableInteractive();
    }
    if (!caixa.length) {
      this.linha(0, T + ZAP_LISTA.topo + 20, 'NENHUMA CONVERSA', '#8696a0').setOrigin(0.5, 0).setPosition(X0 + W / 2, T + ZAP_LISTA.topo + 20);
      this.tRodape.setText('');
      return;
    }
    var CORES_FOTO = [0x25d366, 0x34b7f1, 0xf15c6d, 0xa47cff, 0xf2a93b, 0x00a884];
    var hora = GameState.hora ? GameState.hora() : '';
    if (this.sel >= caixa.length) this.sel = 0;
    for (i = 0; i < caixa.length && i < 5; i++) {
      var f = caixa[i], y2 = T + ZAP_LISTA.topo + i * ZAP_LISTA.alt, sel = (i === this.sel);
      if (sel) g.fillStyle(0xf0f2f5, 1).fillRect(X0, y2, W, ZAP_LISTA.alt);
      // a foto: a cor sai do nome, e a inicial vai no meio (grupo leva o desenho de gente)
      var cf = CORES_FOTO[(f.nome.charCodeAt(0) + f.nome.length) % CORES_FOTO.length], fx = X0 + 24, fy = y2 + 26;
      g.fillStyle(f.grupo ? 0xdfe5e7 : cf, 1).fillCircle(fx, fy, 17);
      if (f.grupo) {
        g.fillStyle(0xffffff, 1).fillCircle(fx - 5, fy - 4, 4).fillCircle(fx + 6, fy - 3, 3.5)
          .fillRoundedRect(fx - 12, fy + 2, 14, 8, 3).fillRoundedRect(fx + 1, fy + 3, 11, 7, 3);
      }
      // a missão principal do dia leva a estrela amarela no canto da foto (src/historia.js)
      if (f.principal) {
        var sx0 = fx + 13, sy0 = fy - 12, pts = [];
        for (var sk = 0; sk < 10; sk++) { var ang = -Math.PI / 2 + sk * Math.PI / 5, rr = sk % 2 ? 3 : 7; pts.push({ x: sx0 + Math.cos(ang) * rr, y: sy0 + Math.sin(ang) * rr }); }
        g.fillStyle(0xffffff, 1).fillCircle(sx0, sy0, 8);
        g.fillStyle(0xf2c14e, 1).fillPoints(pts, true);
      }
      var ini = this.linhas[12 + (i % 4)];
      if (!f.grupo && i < 4) ini.setVisible(true).setScale(ESCALA_TEXTO).setOrigin(0.5, 0.5).setPosition(fx, fy + 1)
        .setText(f.nome.replace(/[^A-ZÀ-Ú]/g, '').charAt(0) || '?').setColor('#ffffff');
      // o nome e a prévia
      this.linhas[i * 2].setVisible(true).setPosition(X0 + 48, y2 + 8)
        .setText((f.grupo ? '# ' : '') + f.nome).setColor('#111b21');
      var prev = this.previa(f);
      this.linhas[i * 2 + 1].setVisible(true).setScale(ESCALA_TEXTO / 2).setPosition(X0 + 48, y2 + 30)
        .setText(prev).setColor(f.vai && !f.aceito ? '#15803d' : '#667781');
      // a hora e a bolinha das não lidas
      if (!f.lida) {
        g.fillStyle(0x25d366, 1).fillCircle(X1 - 16, y2 + 32, 7);
        g.fillStyle(0xffffff, 1).fillRect(X1 - 17, y2 + 28, 2, 8);    // o '1'
      }
      g.fillStyle(0xe9edef, 1).fillRect(X0 + 48, y2 + ZAP_LISTA.alt - 1, W - 48, 1);
    }
    this.tRodape.setText('');
    // a hora da mais recente, no canto da primeira
    this.linhas[11].setVisible(true).setScale(ESCALA_TEXTO / 2).setOrigin(1, 0)
      .setPosition(X1 - 8, T + ZAP_LISTA.topo + 10).setText(hora).setColor(!caixa[0].lida ? '#1da851' : '#667781');
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
    // em letra pequena cabem 30: a linha começa em 74 e a bolinha de não lida em 270
    return m.length > 30 ? m.slice(0, 27) + '...' : m;
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
  /* ---------- as duas vistas do mapa ----------
     'Ainda tá bem ruim o mapa.' A rede inteira, com 41 estações, num
     celular de 268px, não lê bem de jeito nenhum. Então o mapa abre no
     SEU CAMINHO, como o painel do trem: as estações do trajeto em letra
     grande, a baldeação na Sé dizendo pra que lado ir, o destino em
     verde, e os trechos longos resumidos. A REDE (o desenho da rede) fica
     na outra aba, e é nela que o EXPLORAR teleporta. */
  pintaAbasMapa: function (g) {
    var x0 = ZAP.tx0, W = ZAP.tx1 - ZAP.tx0, y = ZAP.topo - 8, eu = this;
    var abas = [['caminho', 'SEU CAMINHO'], ['rede', 'REDE']];
    g.fillStyle(0xffffff, 1).fillRect(x0, y, W, 24);
    for (var i = 0; i < 2; i++) {
      var on = this.mapaVista === abas[i][0], ax = x0 + i * W / 2;
      var t = this.rotMapa[43 - i].setVisible(true).setAngle(0).setOrigin(0.5, 0).setScale(ESCALA_TEXTO / 2)
        .setPosition(Math.round(ax + W / 4), y + 8).setText(abas[i][1]).setColor(on ? '#15803d' : '#667781');
      if (on) g.fillStyle(0x15803d, 1).fillRect(ax + 10, y + 21, W / 2 - 20, 3);
    }
    g.fillStyle(0xe9edef, 1).fillRect(x0, y + 24, W, 1);
    this.zonaAbasMapa.setInteractive();
  },

  pintaCaminho: function (g) {
    var x0 = ZAP.tx0, W = ZAP.tx1 - ZAP.tx0, n = 0, eu = this;
    g.fillStyle(0xffffff, 1).fillRect(x0, ZAP.topo - 8, W, ZAP.abas - ZAP.topo + 8);
    this.pintaAbasMapa(g);
    function tx(t, x, y, cor, esc, ox) {
      if (n >= 41) return null;
      return eu.rotMapa[n++].setVisible(true).setAngle(0).setOrigin(ox || 0, 0).setScale(esc || ESCALA_TEXTO)
        .setPosition(Math.round(x), Math.round(y)).setText(t).setColor(cor);
    }
    // as pernas: a linha em que você está até o alvo, e a outra depois da Sé
    var pernas = [], fim = GameState.destinoFinal();
    var l1 = GameState.linha, e1 = LINHAS[l1].estacoes, a1 = e1.indexOf(GameState.alvoAtual());
    pernas.push({ linha: l1, de: GameState.idx, ate: a1 });
    if (GameState.faltaBaldear()) {
      var l2 = linhaDaEstacao(fim) === 'azul' && fim !== BALDEACAO ? 'azul' : 'vermelha';
      if (l2 === l1) l2 = l1 === 'azul' ? 'vermelha' : 'azul';
      var e2 = LINHAS[l2].estacoes;
      pernas.push({ linha: l2, de: e2.indexOf(BALDEACAO), ate: e2.indexOf(fim) });
    }
    var y = ZAP.topo + 26, XL = x0 + 26;
    for (var pi = 0; pi < pernas.length; pi++) {
      var pp = pernas[pi], L = LINHAS[pp.linha], est = L.estacoes, dir = pp.ate >= pp.de ? 1 : -1;
      var cor = L.num, corTxt = L.cor;
      // a cabeça da perna: a linha e o sentido
      g.fillStyle(cor, 1).fillRoundedRect(x0 + 8, y, W - 16, 18, 5);
      tx(L.nome + '  SENTIDO ' + placaDe(est[dir > 0 ? est.length - 1 : 0]), x0 + 14, y + 5, '#ffffff', ESCALA_TEXTO / 2);
      y += 24;
      // as estações, com o miolo resumido quando a perna é comprida
      var lista = [], i;
      for (i = pp.de; dir > 0 ? i <= pp.ate : i >= pp.ate; i += dir) lista.push(est[i]);
      var rows = lista.length <= 6 ? lista.map(function (e) { return { e: e }; })
        : [{ e: lista[0] }, { e: lista[1] }, { pula: lista.length - 4 }, { e: lista[lista.length - 2] }, { e: lista[lista.length - 1] }];
      var yAntes = null;
      for (i = 0; i < rows.length; i++) {
        var r = rows[i], ry = y + 10;
        if (r.pula) {
          tx('... MAIS ' + r.pula + ' ESTAÇÕES', XL + 18, y + 5, '#667781', ESCALA_TEXTO / 2);
          y += 20;
          continue;
        }
        var aqui = pi === 0 && i === 0, destino = r.e === fim && i === rows.length - 1 && pi === pernas.length - 1;
        var bald = r.e === BALDEACAO && pernas.length > 1 && ((pi === 0 && i === rows.length - 1) || (pi === 1 && i === 0));
        // o trecho da linha até aqui, por baixo do nó
        if (yAntes !== null) g.fillStyle(cor, 1).fillRect(XL - 2, yAntes, 4, ry - yAntes);
        yAntes = ry;
        // o nó da estação na linha
        g.fillStyle(aqui ? 0x111b21 : (destino ? 0x15803d : 0xffffff), 1).fillCircle(XL, ry, aqui || destino ? 7 : 5);
        g.lineStyle(2, destino ? 0x15803d : cor, 1).strokeCircle(XL, ry, aqui || destino ? 7 : 5);
        tx(r.e, XL + 18, y + 3, destino ? '#15803d' : '#111b21');
        var tag = aqui ? 'VOCÊ ESTÁ AQUI' : (destino ? 'DESTINO' : (bald ? (pi === 0 ? 'DESÇA E TROQUE DE LINHA' : '') : ''));
        if (tag) tx(tag, XL + 18, y + 22, aqui ? '#111b21' : (destino ? '#15803d' : '#b45309'), ESCALA_TEXTO / 2);
        y += tag ? 34 : 24;
      }
      y += 6;
    }
    this.tRodape.setText(GameState.faltamEstacoes() + ' ATÉ ' + GameState.alvoAtual()).setColor('#111b21');
  },

  pintaMapa: function (g) {
    if (!GameState.char) return;
    if (this.mapaVista !== 'rede') { this.pintaCaminho(g); return; }
    this.pintaRede(g);
  },

  /* ---------- a rede, com zoom ----------
     'Tem que ter como dar zoom out e zoom in e aparecer todas as
     estações.' O desenho da rede é o mesmo (MAPA_CEL), passado por uma
     lente: z de 1 a 4 e um deslocamento, que o dedo arrasta. Tudo o que
     é mapa (linhas, pontos, nomes) é recortado na área dele. Com z até
     1,7 os nomes da Vermelha são os principais, retos; a partir daí
     aparecem TODOS, em pé (a 90 graus a letra de pixel fica nítida,
     inclinada não), subindo no oeste e descendo no leste. O + e o −
     ficam no canto; a roda do mouse e as teclas + e − também servem. */
  lenteMapa: function () {
    var z = this.mapaZoom || 1, cx = (ZAP.tx0 + ZAP.tx1) / 2, cy = (MAPA_AREA.y0 + MAPA_AREA.y1) / 2, pan = this.mapaPan;
    return function (x, y) { return { x: cx + (x - cx) * z + pan.x, y: cy + (y - cy) * z + pan.y }; };
  },
  zoomMapa: function (d) {
    var z0 = this.mapaZoom, z1 = Phaser.Math.Clamp(z0 + d, 1, 4);
    if (z1 === z0) return;
    // o que estava no meio continua no meio
    this.mapaPan.x *= z1 / z0; this.mapaPan.y *= z1 / z0;
    this.mapaZoom = z1;
    this.limitaPan();
    sfx('catraca');
    this.pinta();
  },
  limitaPan: function () {
    var z = this.mapaZoom, mx = (ZAP.tx1 - ZAP.tx0) / 2 * (z - 1) + 40, my = (MAPA_AREA.y1 - MAPA_AREA.y0) / 2 * (z - 1) + 40;
    if (z <= 1) { this.mapaPan.x = 0; this.mapaPan.y = 0; return; }
    this.mapaPan.x = Phaser.Math.Clamp(this.mapaPan.x, -mx, mx);
    this.mapaPan.y = Phaser.Math.Clamp(this.mapaPan.y, -my, my);
  },

  pintaRede: function (g) {
    var M = MAPA_CEL, eu = GameState.estacaoAtual(), alvo = GameState.alvoAtual(), fim = GameState.destinoFinal();
    var n = 0, self = this, T = this.lenteMapa(), z = this.mapaZoom, gm = this.gMapa;
    gm.clear();
    function rot(t, x, y, cor, ox, oy, ang) {
      if (n >= 42) return null;
      return self.rotMapa[n++].setVisible(true).setOrigin(ox, oy).setAngle(ang || 0).setMask(self.mascMapa)
        .setPosition(Math.round(x), Math.round(y)).setText(t).setColor(cor).setScale(ESCALA_TEXTO / 2);
    }
    function corDe(nome, base) {
      return nome === eu ? '#ffffff' : (nome === fim || nome === alvo ? '#15803d' : base);
    }
    var az = LINHAS.azul.estacoes, vm = LINHAS.vermelha.estacoes, i, p, q;

    g.fillStyle(0xffffff, 1).fillRect(ZAP.tx0, ZAP.topo - 8, ZAP.tx1 - ZAP.tx0, ZAP.abas - ZAP.topo + 8);
    g.fillStyle(0xf0f2f5, 1).fillRect(ZAP.tx0, ZAP.topo + 16, ZAP.tx1 - ZAP.tx0, 22);
    var esp = Math.round(6 + z * 1.5);                              // a grossura das linhas cresce um pouco
    // a Azul
    var a0 = T(M.BX, M.yDe(az.length - 1)), a1 = T(M.BX, M.yDe(0));
    gm.fillStyle(0x0b5fae, 1).fillRect(a0.x - esp / 2, a0.y, esp, a1.y - a0.y);
    // a Vermelha
    gm.lineStyle(esp, 0xe8362c, 1).beginPath();
    q = T(M.rota[0][0], M.rota[0][1]); gm.moveTo(q.x, q.y);
    for (i = 1; i < M.rota.length; i++) { q = T(M.rota[i][0], M.rota[i][1]); gm.lineTo(q.x, q.y); }
    gm.strokePath();
    var ponto = Math.max(2, Math.round(z * 1.5));
    for (i = 0; i < az.length; i++) { q = T(M.BX, M.yDe(i)); gm.fillStyle(0xffffff, 1).fillRect(q.x - ponto / 2, q.y - ponto / 2, ponto, ponto); }
    for (i = 0; i < vm.length; i++) { p = M.pos('vermelha', vm[i]); q = T(p.x, p.y); gm.fillStyle(0xffffff, 1).fillRect(q.x - ponto / 2, q.y - ponto / 2, ponto, ponto); }
    // a Sé, baldeação
    p = M.pos('azul', 'SÉ'); q = T(p.x, p.y);
    gm.fillStyle(0x111b21, 1).fillCircle(q.x, q.y, 6 + z);
    gm.fillStyle(0xffffff, 1).fillCircle(q.x, q.y, 4 + z * 0.7);
    // os números das linhas
    q = T(M.BX, M.yDe(az.length - 1));
    gm.fillStyle(0x0b5fae, 1).fillRect(q.x - 20, q.y - 6, 12, 12);
    rot('1', q.x - 14, q.y - 3, '#ffffff', 0.5, 0);
    var pi = M.pos('vermelha', 'ITAQUERA'); q = T(pi.x, pi.y);
    gm.fillStyle(0xe8362c, 1).fillRect(q.x - 6, q.y + 8, 12, 12);
    rot('3', q.x, q.y + 11, '#ffffff', 0.5, 0);

    // a Azul: todos os nomes, à direita até São Bento e à esquerda da Sé pra baixo
    for (i = 0; i < az.length; i++) {
      var nm = az[i]; p = M.pos('azul', nm); q = T(p.x, p.y);
      if (nm === 'SÉ') { rot('SÉ', q.x + 8 + z, q.y + 5 + z, nm === eu ? '#ffffff' : '#111b21', 0, 0); continue; }
      var direita = i >= az.indexOf('SÃO BENTO');
      // sem zoom o nome de São Bento bate na subida da Vermelha: só com zoom (ou se for a sua / o destino)
      if (nm === 'SÃO BENTO' && z < 1.7 && nm !== eu && nm !== fim && nm !== alvo) continue;
      var curto = nm;
      var t = rot(curto, q.x + (direita ? 8 : -8), q.y, corDe(nm, '#2b3440'), direita ? 0 : 1, 0.5);
      if (t && nm === eu) this.pilula(gm, t);
    }
    // a Vermelha
    var yL = M.yL, yS = M.yS;
    var todos = z >= 1.7;
    // sem zoom, os principais: [x, y, alinhamento] do nome (em pontos do mapa)
    var NOMES_VERM = {
      'BARRA FUNDA': [ZAP.tx0 + 4, yL - 14, 0], 'BRÁS': [182, yL + 4, 1],
      'TATUAPÉ': [218, M.ySB + 6, 0.5], 'PENHA': [238, M.ySB + 18, 0.5], 'ITAQUERA': [ZAP.tx1 - 4, M.ySB - 14, 1]
    };
    var iSe = vm.indexOf('SÉ');
    for (i = 0; i < vm.length; i++) {
      var nv = vm[i], pv = M.pos('vermelha', nv), qv = T(pv.x, pv.y), tv;
      if (nv === 'SÉ') continue;
      if (todos) {
        // em pé: o oeste sobe da estação, o leste desce
        var leste = i > iSe;
        tv = rot(nv, qv.x + 1, qv.y + (leste ? 6 : -6), corDe(nv, '#111b21'), 0, 0.5, leste ? 90 : -90);
      } else {
        var onde = NOMES_VERM[nv];
        if (!onde && (nv === eu || nv === fim || nv === alvo)) onde = [pv.x, (pv.y === yS ? yS + 9 : pv.y + 33), 0.5];
        if (!onde) continue;
        var oq = T(onde[0], onde[1]);
        tv = rot(nv, oq.x, oq.y, corDe(nv, '#111b21'), onde[2], 0);
        if (onde[2] === 0.5) gm.lineStyle(1, 0x9aa3ab, 1).lineBetween(qv.x, qv.y + 4, oq.x, oq.y - 1);
      }
      if (tv && nv === eu) this.pilula(gm, tv);
    }

    // você (o ponto escuro) e o alvo (o anel verde)
    var pe = M.pos(GameState.linha, eu); q = T(pe.x, pe.y);
    gm.fillStyle(0x111b21, 1).fillCircle(q.x, q.y, 7);
    gm.fillStyle(0xffffff, 1).fillCircle(q.x, q.y, 3.5);
    var pa = M.pos(linhaDaEstacao(alvo) === 'azul' || alvo === 'SÉ' ? 'azul' : 'vermelha', alvo);
    if (pa && alvo !== eu) { q = T(pa.x, pa.y); gm.lineStyle(3, 0x15803d, 1).strokeCircle(q.x, q.y, 8); }

    // o + e o −, no canto de baixo
    var bx = ZAP.tx1 - 30, b1 = MAPA_AREA.y1 - 62, b2 = MAPA_AREA.y1 - 30;
    [[b1, '+'], [b2, '-']].forEach(function (b, k) {
      gm.fillStyle(0xffffff, 1).fillCircle(bx, b[0], 12);
      gm.lineStyle(2, 0xd1d7db, 1).strokeCircle(bx, b[0], 12);
      gm.fillStyle(0x111b21, 1).fillRect(bx - 5, b[0] - 1, 11, 3);
      if (k === 0) gm.fillRect(bx - 1, b[0] - 5, 3, 11);
    });

    this.pintaAbasMapa(g);
    this.linha(1, ZAP.topo + 22, GameState.faltamEstacoes() + ' ESTAÇÕES ATÉ ' + alvo, '#15803d').setOrigin(0, 0)
      .setScale(ESCALA_TEXTO / 2).setPosition(ZAP.tx0 + 10, ZAP.topo + 23);
    if (GameState.explorar) this.linhas[1].setText('TOQUE NUMA ESTAÇÃO PRA IR').setColor('#15803d');
    this.zonaMapa.setInteractive();
    this.tRodape.setText(z > 1 ? 'ARRASTE PRA ANDAR' : 'AQUI: ' + eu).setColor('#111b21');
  },

  // a pílula escura atrás do nome da sua estação, pra ele saltar do mapa
  pilula: function (g, t) {
    var b = t.getBounds();
    g.fillStyle(0x111b21, 1).fillRoundedRect(b.x - 4, b.y - 2, b.width + 8, b.height + 4, 4);
  },

  /* ---------- ir de estação em estação, no EXPLORAR ----------
     'No modo explorar, clicou no mapa, você vai pra lá.' A estação mais
     perto do toque (até 10px) vira o lugar: o que estava rodando por
     baixo do celular (estação, vagão, luta) é desligado e você aparece
     na plataforma dela. */
  tocaMapa: function (px, py) {
    if (!GameState.explorar || this.modo !== 'app' || this.aba !== 1) return;
    var M = MAPA_CEL, melhor = null, dm = 10 + this.mapaZoom * 2, lente = this.lenteMapa();
    ['azul', 'vermelha'].forEach(function (l) {
      LINHAS[l].estacoes.forEach(function (nm) {
        var p0 = M.pos(l, nm), p = lente(p0.x, p0.y), d = Math.hypot(p.x - px, p.y - py);
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
  /* ---------- o banco ----------
     'Pro banco' (as fotos do app laranja): o BANCO LARANJINHA, de nome
     inventado. A faixa laranja com o olá, a agência e a conta; três
     atalhos em cartão branco (PIX, BILHETE, EXTRATO); o cartão do saldo,
     com o vale-transporte e a tarifa; e os últimos lançamentos, que são
     os gastos e ganhos de verdade da partida (GameState.extrato). */
  pintaGrana: function (g) {
    if (!GameState.char) return;
    var c = GameState.char, x0 = ZAP.tx0, W = ZAP.tx1 - ZAP.tx0, T = ZAP.topo, n = 0, eu = this, i;
    var LAR = 0xec7000, ESC = '#1f2328', CIN = '#6b7280';
    function tx(t, x, y, cor, esc, ox) {
      if (n >= 44) return null;
      return eu.rotMapa[n++].setVisible(true).setAngle(0).setOrigin(ox || 0, 0).setScale(esc || ESCALA_TEXTO / 2)
        .setPosition(Math.round(x), Math.round(y)).setText(t).setColor(cor);
    }
    function reais(v) { return 'R$ ' + Math.abs(v).toFixed(2).replace('.', ','); }
    this.tStatus.setText('LARANJINHA');
    g.fillStyle(0xf2f2f4, 1).fillRect(x0, T - 8, W, ZAP.abas - T + 8);
    // a faixa laranja: o olá, a agência e a conta
    g.fillStyle(LAR, 1).fillRect(x0, T - 8, W, 44);
    g.fillStyle(0xffffff, 1).fillCircle(x0 + 20, T + 12, 11);
    var nome = nomeDoChar(GameState.charKey, GameState.genero);
    tx(nome.charAt(0), x0 + 20, T + 5, '#ec7000', ESCALA_TEXTO, 0.5);
    tx('OLÁ, ' + nome, x0 + 38, T - 2, '#ffffff', ESCALA_TEXTO);
    tx('AG 0277  CC 40028-2', x0 + 38, T + 17, '#ffe2c2');
    // os três atalhos
    var at = [['PIX', 'pix'], ['BILHETE', 'bilhete'], ['EXTRATO', 'extrato']], tw = (W - 32) / 3;
    for (i = 0; i < 3; i++) {
      var ax = x0 + 8 + i * (tw + 8), ay = T + 44;
      g.fillStyle(0xffffff, 1).fillRoundedRect(ax, ay, tw, 44, 8);
      g.fillStyle(LAR, 1);
      if (at[i][1] === 'pix') g.fillPoints([{ x: ax + 16, y: ay + 8 }, { x: ax + 23, y: ay + 15 }, { x: ax + 16, y: ay + 22 }, { x: ax + 9, y: ay + 15 }], true);
      else if (at[i][1] === 'bilhete') { g.fillRoundedRect(ax + 8, ay + 9, 18, 12, 2); g.fillStyle(0xffffff, 1).fillRect(ax + 10, ay + 12, 6, 2); }
      else { g.fillRect(ax + 9, ay + 9, 14, 2).fillRect(ax + 9, ay + 14, 14, 2).fillRect(ax + 9, ay + 19, 10, 2); }
      tx(at[i][0], ax + 8, ay + 29, ESC);
    }
    // o saldo
    var sy = T + 96;
    g.fillStyle(0xffffff, 1).fillRoundedRect(x0 + 8, sy, W - 16, 62, 8);
    tx('SALDO DISPONÍVEL', x0 + 18, sy + 8, CIN);
    tx(reais(GameState.dinheiro), x0 + W - 18, sy + 4, ESC, ESCALA_TEXTO, 1);
    g.fillStyle(0xe5e7eb, 1).fillRect(x0 + 18, sy + 26, W - 36, 1);
    tx('VALE-TRANSPORTE', x0 + 18, sy + 32, CIN);
    tx(GameState.valeRestante > 0 ? GameState.valeRestante + ' PASSAGENS' : 'ACABOU', x0 + W - 18, sy + 32, ESC, 0, 1);
    tx('TARIFA', x0 + 18, sy + 46, CIN);
    tx(c.tarifa === 0 ? 'GRÁTIS' : reais(c.tarifa), x0 + W - 18, sy + 46, ESC, 0, 1);
    // os últimos lançamentos
    var ly = sy + 70, ext = GameState.extrato || [];
    g.fillStyle(0xffffff, 1).fillRoundedRect(x0 + 8, ly, W - 16, ZAP.abas - ly - 30, 8);
    tx('ÚLTIMOS LANÇAMENTOS', x0 + 18, ly + 8, ESC);
    if (!ext.length) tx('NENHUM AINDA HOJE', x0 + 18, ly + 28, CIN);
    for (i = 0; i < ext.length && i < 5; i++) {
      var e = ext[i], ry = ly + 26 + i * 30;
      // o ícone: seta pra baixo (entrou) ou pra cima (saiu)
      g.fillStyle(e.v < 0 ? 0xfde8d7 : 0xdcfce7, 1).fillCircle(x0 + 26, ry + 8, 8);
      g.fillStyle(e.v < 0 ? LAR : 0x15803d, 1)
        .fillTriangle(x0 + 22, ry + (e.v < 0 ? 10 : 6), x0 + 30, ry + (e.v < 0 ? 10 : 6), x0 + 26, ry + (e.v < 0 ? 4 : 12));
      tx(e.d.length > 22 ? e.d.slice(0, 21) + '.' : e.d, x0 + 40, ry + 1, ESC);
      tx(e.h, x0 + 40, ry + 11, CIN);
      tx((e.v < 0 ? '- ' : '+ ') + reais(e.v), x0 + W - 18, ry + 5, e.v < 0 ? ESC : '#15803d', 0, 1);
      if (i < 4) g.fillStyle(0xf1f1f3, 1).fillRect(x0 + 40, ry + 24, W - 58, 1);
    }
    this.tRodape.setText('DIA ' + GameState.dia + '  -  ' + lePontos() + ' PONTOS').setColor('#6b7280');
  },

  /* ---------- aba 4: o CATRAGRAM ----------
     Claro como o ZipZap, porque é rede social e não painel do jogo. Duas
     abas: PERFIL (você, os números, a etiqueta e a barra do medidor, e o
     grid das medalhas: as que saíram, as que faltam e as ??? secretas) e
     FEED (um post por tela, com a medalha grande, as curtidas e o que os
     seus contatos comentaram). Os textos vêm da reserva do mapa
     (rotMapa): 0..41 aqui, 42 e 43 as abas. */
  pintaCatragram: function (g) {
    var x0 = ZAP.tx0, W = ZAP.tx1 - ZAP.tx0;
    g.fillStyle(0xffffff, 1).fillRect(x0, ZAP.topo - 8, W, ZAP.abas - ZAP.topo + 8);
    this._nTx = 0;
    this.pintaAbasCat(g);
    if (this.catVista === 'feed') this.pintaFeedCat(g); else this.pintaPerfilCat(g);
    if (this.catInfo) this.pintaInfoCat(g);
    this.zonaCat.setInteractive();
    this.zonaAbasCat.setInteractive();
  },
  txCat: function (t, x, y, cor, meia, ox, larg) {
    if (this._nTx >= 42) return null;
    return this.rotMapa[this._nTx++].setVisible(true).setAngle(0).setOrigin(ox || 0, 0)
      .setScale(meia ? ESCALA_TEXTO / 2 : ESCALA_TEXTO).setMaxWidth(larg || 0)
      .setPosition(Math.round(x), Math.round(y)).setText(t).setColor(cor);
  },
  pintaAbasCat: function (g) {
    var x0 = ZAP.tx0, W = ZAP.tx1 - ZAP.tx0, y = ZAP.topo - 8;
    var abas = [['perfil', 'PERFIL'], ['feed', 'FEED']];
    for (var i = 0; i < 2; i++) {
      var on = this.catVista === abas[i][0], ax = x0 + i * W / 2;
      this.rotMapa[43 - i].setVisible(true).setAngle(0).setOrigin(0.5, 0).setScale(ESCALA_TEXTO / 2).setMaxWidth(0)
        .setPosition(Math.round(ax + W / 4), y + 8).setText(abas[i][1]).setColor(on ? '#111b21' : '#8a939b');
      if (on) g.fillStyle(0xd6307a, 1).fillRect(ax + 10, y + 21, W / 2 - 20, 3);
    }
    g.fillStyle(0xe9edef, 1).fillRect(x0, y + 24, W, 1);
  },

  // o avatar redondo com o anel rosa e laranja; o boneco é recortado na altura do peito
  avatarCat: function (g, fig, cx, cy, r, esc) {
    g.fillStyle(0xf2a03c, 1).fillCircle(cx, cy, r + 3);
    g.fillStyle(0xd6307a, 1).fillCircle(cx + 2, cy - 2, r + 2);
    g.fillStyle(0xffffff, 1).fillCircle(cx, cy, r + 1);
    g.fillStyle(0xe9edef, 1).fillCircle(cx, cy, r - 1);
    if (!GameState.char) return;
    fig.setTexture(spriteJogador(), 0).clearTint().setScale(esc).setCrop(0, 0, 32, 30)
      .setPosition(cx, cy + Math.round(13 * esc)).setVisible(true);
  },

  // o grid do perfil: posts (do mais novo), depois o que falta, e as secretas por último
  gradeCat: function () {
    var e = Catragram.le(), out = Catragram.posts().slice(), sec = [];
    for (var i = 0; i < CONQUISTAS.length; i++) {
      var c = CONQUISTAS[i];
      if (!e.feitas[c.id]) (c.secreta ? sec : out).push(c);
    }
    return out.concat(sec);
  },
  limitaRoloCat: function (r) {
    var fileiras = Math.ceil(this.gradeCat().length / 4);
    return Phaser.Math.Clamp(r, 0, Math.max(0, fileiras - 3));
  },

  pintaPerfilCat: function (g) {
    var x0 = ZAP.tx0, x1 = ZAP.tx1, W = x1 - x0, e = Catragram.le(), i;
    var nome = GameState.nome || 'VOCÊ';
    this.avatarCat(g, this.figMochila[0], x0 + 36, 146, 24, 1);
    // os três números, cheios, com o rótulo miúdo embaixo
    var cols = [[134, Catragram.quantas(), 'POSTS'], [200, Catragram.seguidores(), 'SEGUIDORES'], [262, Catragram.seguindo(), 'SEGUINDO']];
    for (i = 0; i < 3; i++) {
      this.txCat(numeroCurto(cols[i][1]), cols[i][0], 122, '#111b21', false, 0.5);
      this.txCat(cols[i][2], cols[i][0], 148, '#667781', true, 0.5);
    }
    // o @ e o nível; @ comprido cai pra meia escala (a pílula do nível mora à direita)
    var arroba = arrobaDe(nome);
    this.txCat(arroba, x0 + 8, arroba.length > 16 ? 184 : 178, '#111b21', arroba.length > 16);
    g.fillStyle(0x111b21, 1).fillRoundedRect(x1 - 52, 181, 44, 16, 8);
    this.txCat('NV ' + meuNivel(), x1 - 30, 184, '#f2c14e', true, 0.5);
    this.txCat('MORA PERTO DA ' + placaDe(CASA), x0 + 8, 204, '#667781', true);
    // a etiqueta: o que os outros veem de você
    var et = etiquetaFama(GameState.fama);
    g.fillStyle(et.cor, 1).fillRoundedRect(x0 + 8, 218, et.t.length * 12 + 18, 22, 11);
    this.txCat(et.t, x0 + 17, 218, '#ffffff');
    // a barra do medidor: honesto à esquerda, malandro à direita
    this.txCat('HONESTO', x0 + 8, 248, '#15803d', true);
    this.txCat('MALANDRO', x1 - 8, 248, '#e8362c', true, 1);
    var bx0 = x0 + 8, bw = W - 16, by = 262, seg = 12;
    for (i = 0; i < seg; i++) {
      var k = i / (seg - 1), cor = k < 0.5
        ? Phaser.Display.Color.Interpolate.ColorWithColor(Phaser.Display.Color.ValueToColor(0x1faa59), Phaser.Display.Color.ValueToColor(0xf2c14e), 100, k * 200)
        : Phaser.Display.Color.Interpolate.ColorWithColor(Phaser.Display.Color.ValueToColor(0xf2c14e), Phaser.Display.Color.ValueToColor(0xe8362c), 100, (k - 0.5) * 200);
      g.fillStyle(Phaser.Display.Color.GetColor(cor.r, cor.g, cor.b), 1).fillRect(bx0 + Math.floor(i * bw / seg), by, Math.ceil(bw / seg), 8);
    }
    var mx = bx0 + (20 - Phaser.Math.Clamp(GameState.fama || 0, -20, 20)) / 40 * bw;
    g.fillStyle(0xffffff, 1).fillCircle(mx, by + 4, 7);
    g.lineStyle(2, 0x111b21, 1).strokeCircle(mx, by + 4, 7);
    g.fillStyle(0xe9edef, 1).fillRect(x0, 280, W, 1);

    // o grid: quatro por fileira, três fileiras na tela
    var lista = this.gradeCat(), n = lista.length;
    this.catRolo = this.limitaRoloCat(this.catRolo);
    this.catSel = Phaser.Math.Clamp(this.catSel, 0, n - 1);
    for (var f = 0; f < 3; f++) {
      for (var cI = 0; cI < 4; cI++) {
        var idx = (this.catRolo + f) * 4 + cI;
        if (idx >= n) continue;
        var c = lista[idx], feita = !!e.feitas[c.id], tx = x0 + 1 + cI * 67, ty = 284 + f * 66;
        g.fillStyle(feita ? CAT_CONQ[c.cat].fundo : 0xf0f2f5, 1).fillRect(tx, ty, 65, 64);
        if (feita) desenhaMedalha(g, tx + 32, ty + 26, 15, c.cat, true);
        /* texto fica acima de qualquer desenho do celular: com a caixinha do
           que falta aberta (ela cobre a 3ª fileira), os da 3ª não entram */
        var tapado = this.catInfo && f === 2;
        if (!feita && c.secreta) { if (!tapado) this.txCat('???', tx + 33, ty + 22, '#9aa0a8', false, 0.5); }
        else if (!feita) {
          desenhaMedalha(g, tx + 32, ty + 22, 12, c.cat, false);
          if (!tapado) this.txCat(Math.min(e.prog[c.id] || 0, c.meta) + '/' + c.meta, tx + 33, ty + 48, '#667781', true, 0.5);
        }
        if (idx === this.catSel && this.teclouCat) g.lineStyle(2, 0xd6307a, 1).strokeRect(tx + 1, ty + 1, 63, 62);
      }
    }
    // a barrinha de rolagem, quando o grid não cabe
    var fileiras = Math.ceil(n / 4);
    if (fileiras > 3) {
      var hb = Math.max(20, 198 * 3 / fileiras), yb = 284 + (198 - hb) * this.catRolo / (fileiras - 3);
      g.fillStyle(0x111b21, 0.25).fillRoundedRect(x1 - 3, yb, 3, hb, 1.5);
    }
  },

  pintaFeedCat: function (g) {
    var x0 = ZAP.tx0, x1 = ZAP.tx1, W = x1 - x0, posts = Catragram.posts(), n = posts.length;
    if (!n) {
      this.txCat('NENHUM POST AINDA', GW / 2, 220, '#667781', false, 0.5);
      this.txCat('CADA CONQUISTA VIRA UM POST', GW / 2, 250, '#9aa0a8', true, 0.5);
      return;
    }
    this.catPost = Phaser.Math.Clamp(this.catPost, 0, n - 1);
    var c = posts[this.catPost], info = Catragram.feita(c.id) || {}, cat = CAT_CONQ[c.cat], r = Catragram.reacoes(c);
    var arroba = arrobaDe(GameState.nome);
    // o cabeçalho do post
    var hy = 112;
    this.avatarCat(g, this.figMochila[1], x0 + 16, hy + 12, 11, 0.55);
    this.txCat(arroba, x0 + 34, hy + 1, '#111b21', true);
    this.txCat(info.antes ? 'ANTES DO CATRAGRAM' : 'DIA ' + info.dia + (info.hora ? ', ' + info.hora : ''), x0 + 34, hy + 13, '#667781', true);
    g.fillStyle(0x111b21, 1).fillCircle(x1 - 18, hy + 12, 1.6).fillCircle(x1 - 12, hy + 12, 1.6).fillCircle(x1 - 6, hy + 12, 1.6);
    // a foto: a medalha grande no fundo da família dela
    var iy = hy + 30, ih = 196;
    g.fillStyle(cat.fundo, 1).fillRect(x0, iy, W, ih);
    g.fillStyle(0xffffff, 0.4).fillCircle(x0 + W / 2, iy + 78, 72);
    desenhaMedalha(g, x0 + W / 2, iy + 76, 42, c.cat, true);
    this.txCat(cat.nome, x0 + W / 2, iy + 158, '#' + ('00000' + cat.cor.toString(16)).slice(-6), false, 0.5);
    g.fillStyle(0x111b21, 0.8).fillRoundedRect(x1 - 60, iy + 8, 52, 16, 8);
    this.txCat('+' + (c.xp || 15) + ' XP', x1 - 34, iy + 11, '#f2c14e', true, 0.5);
    if (c.secreta) {
      g.fillStyle(0x111b21, 0.8).fillRoundedRect(x0 + 8, iy + 8, 58, 16, 8);
      this.txCat('SECRETA', x0 + 37, iy + 11, '#ffffff', true, 0.5);
    }
    // as ações: a curtida (vermelha, alguém sempre curte), o balão e o avião
    var ay = iy + ih + 12;
    g.fillStyle(0xe8362c, 1).fillCircle(x0 + 11, ay, 4.2).fillCircle(x0 + 18, ay, 4.2)
      .fillTriangle(x0 + 6.5, ay + 1.5, x0 + 22.5, ay + 1.5, x0 + 14.5, ay + 10);
    g.lineStyle(2, 0x111b21, 1).strokeCircle(x0 + 40, ay + 3, 7);
    g.fillStyle(0x111b21, 1).fillTriangle(x0 + 33, ay + 8, x0 + 36, ay + 12, x0 + 38, ay + 8);
    g.lineStyle(2, 0x111b21, 1);
    g.beginPath(); g.moveTo(x0 + 56, ay - 3); g.lineTo(x0 + 72, ay - 5); g.lineTo(x0 + 64, ay + 10); g.lineTo(x0 + 62, ay + 2); g.closePath(); g.strokePath();
    // quem curtiu, a legenda e os comentários
    var ty = ay + 16, mw = W - 12;
    this.txCat('CURTIDO POR ' + r.primeiro + ' E OUTRAS ' + (r.curtidas - 1), x0 + 6, ty, '#111b21', true, 0, mw);
    this.txCat(arroba + ' ' + c.legenda, x0 + 6, ty + 16, '#111b21', true, 0, mw);
    for (var k = 0; k < r.comentarios.length; k++) {
      this.txCat(r.comentarios[k].quem + ': ' + r.comentarios[k].t, x0 + 6, ty + 38 + k * 14, '#4a5560', true, 0, mw);
    }
    // o pé: passar de post (o toque na esquerda volta, na direita avança)
    g.fillStyle(0xe9edef, 1).fillRect(x0, ZAP.abas - 24, W, 1);
    if (this.catPost > 0) this.txCat('◄ MAIS NOVO', x0 + 8, ZAP.abas - 17, '#d6307a', true);
    this.txCat((this.catPost + 1) + ' DE ' + n, GW / 2, ZAP.abas - 17, '#8a939b', true, 0.5);
    if (this.catPost < n - 1) this.txCat('MAIS VELHO ►', x1 - 8, ZAP.abas - 17, '#d6307a', true, 1);
  },

  // a caixinha do que falta, por cima do grid
  pintaInfoCat: function (g) {
    var c = this.catInfo, e = Catragram.le(), x0 = ZAP.tx0 + 8, W = ZAP.tx1 - ZAP.tx0 - 16, y = 408;
    g.fillStyle(0x000000, 0.25).fillRoundedRect(x0 + 2, y + 3, W, 64, 10);
    g.fillStyle(0x111b21, 0.96).fillRoundedRect(x0, y, W, 64, 10);
    if (c.secreta) {
      this.txCat('CONQUISTA SECRETA', x0 + 12, y + 10, '#f2c14e', true);
      this.txCat('CONTINUE JOGANDO PRA DESCOBRIR.', x0 + 12, y + 28, '#ffffff', true, 0, W - 24);
    } else {
      this.txCat('FALTA ' + Math.min(e.prog[c.id] || 0, c.meta) + ' DE ' + c.meta, x0 + 12, y + 10, '#f2c14e', true);
      this.txCat(c.txt, x0 + 12, y + 28, '#ffffff', true, 0, W - 24);
    }
    this.txCat('+' + (c.xp || 15) + ' XP', x0 + W - 12, y + 10, '#8a939b', true, 1);
  },

  tocaCat: function (x, y) {
    if (this.catInfo) { this.catInfo = null; sfx('catraca'); this.pinta(); return; }
    if (this.catVista === 'feed') {
      if (y > ZAP.abas - 26) this.passaPost(x < GW / 2 ? -1 : 1);
      return;
    }
    if (y < 284) return;
    var col = Math.floor((x - ZAP.tx0 - 1) / 67), fil = Math.floor((y - 284) / 66);
    if (col < 0 || col > 3 || fil > 2) return;
    this.teclouCat = false;
    this.abreDoGrid((this.catRolo + fil) * 4 + col);
  },
  // do grid: a que saiu abre o post no feed; a que falta mostra o que falta
  abreDoGrid: function (idx) {
    var lista = this.gradeCat();
    if (idx < 0 || idx >= lista.length) return;
    var c = lista[idx];
    if (Catragram.feita(c.id)) { this.catVista = 'feed'; this.catPost = idx; }
    else this.catInfo = c;
    sfx('ok');
    this.pinta();
  },
  passaPost: function (d) {
    var n = Catragram.posts().length, p = Phaser.Math.Clamp(this.catPost + d, 0, Math.max(0, n - 1));
    if (p === this.catPost) return;
    this.catPost = p; sfx('catraca'); this.pinta();
  },
  /* O teclado no Catragram: no perfil as setas andam no grid (e a moldura
     rosa só aparece pra quem está no teclado); no feed passam o post; Esc
     e X voltam do feed pro perfil. Devolve true quando a tecla era dele. */
  teclaCat: function (c) {
    var esq = c === 'KeyA' || c === 'ArrowLeft', dir = c === 'KeyD' || c === 'ArrowRight';
    var cima = c === 'KeyW' || c === 'ArrowUp', baixo = c === 'KeyS' || c === 'ArrowDown';
    var ok = c === 'Space' || c === 'Enter' || c === 'KeyZ';
    if (this.catInfo) {
      if (esq || dir || cima || baixo || ok || c === 'Escape' || c === 'KeyX') { this.catInfo = null; this.pinta(); return true; }
      return false;
    }
    if (this.catVista === 'feed') {
      if (esq || cima) { this.passaPost(-1); return true; }
      if (dir || baixo) { this.passaPost(1); return true; }
      if (c === 'Escape' || c === 'KeyX') { this.catVista = 'perfil'; sfx('catraca'); this.pinta(); return true; }
      return ok;
    }
    var d = esq ? -1 : (dir ? 1 : (cima ? -4 : (baixo ? 4 : 0)));
    if (d) {
      var n = this.gradeCat().length;
      this.teclouCat = true;
      this.catSel = Phaser.Math.Clamp(this.catSel + d, 0, n - 1);
      var fil = Math.floor(this.catSel / 4);
      if (fil < this.catRolo) this.catRolo = fil;
      if (fil > this.catRolo + 2) this.catRolo = fil - 2;
      sfx('catraca'); this.pinta();
      return true;
    }
    if (ok) { this.abreDoGrid(this.catSel); return true; }
    return false;
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
    var dex = leDex(), lista = this.dexLista(), n = lista.length, vistos = 0, i;
    for (i = 0; i < DEX.length; i++) if (dex[DEX[i].id]) vistos++;
    this.pintaBuscaDex(g);
    if (this.sel >= n) this.sel = 0;
    if (!n) {
      this.linha(0, DEXC.y0 + 60, 'NADA ENCONTRADO', PAL.cinzaEsc).setOrigin(0.5, 0).setPosition(GW / 2, DEXC.y0 + 60);
      this.tRodape.setText('VISTOS ' + vistos + ' DE ' + DEX.length);
      return;
    }
    var fileiras = Math.ceil(n / 2);
    this.topoDex = Math.max(0, Math.min(Math.floor(this.sel / 2), fileiras - 2) * 2);
    var W = DEXC.W, H = DEXC.H, VAO = DEXC.VAO, x0 = DEXC.x0, y0 = DEXC.y0;
    for (i = 0; i < 4; i++) {
      var k = this.topoDex + i, ct = this.cartasDex[i], fig = this.figMochila[i];
      if (k >= n) continue;
      var kd = lista[k], e = DEX[kd], nivel = dex[e.id] || 0, sel = (k === this.sel);
      var x = x0 + (i % 2) * (W + VAO), y = y0 + Math.floor(i / 2) * (H + VAO), cx = x + W / 2;
      var cor = nivel ? (COR_TIPO[e.tipo] || 0xb8bccc) : 0x3a3a4a;
      // a carta: fundo, borda do tipo (mais grossa na escolhida)
      g.fillStyle(0x1c1c24, 1).fillRoundedRect(x, y, W, H, 8);
      g.lineStyle(sel ? 3 : 1.5, cor, sel ? 1 : 0.85).strokeRoundedRect(x + 1, y + 1, W - 2, H - 2, 8);
      // a pílula do número e a bolinha do tipo
      g.fillStyle(0x0a0a10, 0.9).fillRoundedRect(x + 5, y + 5, 30, 12, 6);
      g.fillStyle(cor, 1).fillCircle(x + W - 12, y + 11, 5);
      // o círculo escuro com o boneco
      g.fillStyle(0x2a2a34, 1).fillCircle(cx, y + 46, 31);
      g.fillStyle(0x34343f, 1).fillCircle(cx - 4, y + 41, 24);
      fig.setTexture(e.sprite, 0).setScale(1.3).setPosition(cx, y + 48).setVisible(true);
      if (nivel) fig.clearTint(); else fig.setTintFill(0x14141c);
      ct.num.setVisible(true).setPosition(x + 10, y + 7).setText('#' + (kd + 1 < 10 ? '00' : '0') + (kd + 1));
      // o nome, sempre no tamanho cheio; o que passa da carta vira letreiro (ver update)
      var nome = nivel ? e.nome : '???';
      ct.nome.setVisible(true).setOrigin(0.5, 0).setPosition(cx, y + 81).setText(nome)
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
      ct.r1.setVisible(true).setPosition(x + W * 0.28, y + 104).setText(r1);
      ct.v1.setVisible(true).setPosition(x + W * 0.28, y + 115).setText(v1);
      ct.r2.setVisible(true).setPosition(x + W * 0.72, y + 104).setText(r2);
      ct.v2.setVisible(true).setPosition(x + W * 0.72, y + 115).setText(v2).setColor(nivel === 2 ? PAL.verde : PAL.branco);
      ct.tipo.setVisible(true).setPosition(cx, y + 132).setText('TIPO: ' + (nivel ? e.tipo : '???'));
      ct.zona.setPosition(x, y).setSize(W, H).setInteractive();
    }
    this.tRodape.setText('VISTOS ' + vistos + ' DE ' + DEX.length);
  },

  /* ---------- a pesquisa e as tags da METRODEX ----------
     'Tem que ter tags e barra de pesquisa no METRODEX também.' Em cima
     das cartas, a pesquisa (um campo de texto de verdade, invisível, pra
     o teclado do celular abrir) e a fileira de tags por tipo, que se
     arrasta pro lado como os filtros do zap. A pesquisa procura no tipo,
     no lugar e, de quem você já viu, no nome: quem é ??? continua ???. */
  montaBuscaDex: function () {
    var self = this, W = ZAP.tx1 - ZAP.tx0;
    this.dexTag = 'TODOS'; this.dexBusca = ''; this.dexChipX = 0;
    var tipos = ['TODOS'];
    DEX.forEach(function (e) { if (tipos.indexOf(e.tipo) < 0) tipos.push(e.tipo); });
    this.tagsDex = tipos;
    this.gChipsDex = this.add.graphics().setDepth(2401);
    var mk = this.make.graphics({ add: false });
    mk.fillStyle(0xffffff, 1).fillRect(ZAP.tx0, ZAP.topo + 21, W, 20);
    this.mascChips = mk.createGeometryMask();
    this.gChipsDex.setMask(this.mascChips);
    this.tChipsDex = tipos.map(function () {
      return txtC(self, 0, 0, '', PAL.branco, 8).setScale(ESCALA_TEXTO / 2).setDepth(2403).setVisible(false).setMask(self.mascChips);
    });
    this.tBuscaDex = txt(this, ZAP.tx0 + 30, ZAP.topo - 1, '', PAL.cinza, 8).setScale(ESCALA_TEXTO / 2).setDepth(2403).setVisible(false);
    // o campo de texto de verdade, fora da vista
    var inp = document.getElementById('buscaDex');
    if (!inp) {
      inp = document.createElement('input');
      inp.id = 'buscaDex'; inp.type = 'text'; inp.autocomplete = 'off'; inp.setAttribute('autocapitalize', 'characters');
      inp.style.cssText = 'position:fixed;left:0;top:0;width:1px;height:1px;opacity:0;font-size:16px;border:0;padding:0;';
      document.body.appendChild(inp);
    }
    inp.value = '';
    this.inpDex = inp;
    var teclado = function (liga) {
      self.scene.manager.getScenes(true).forEach(function (sc) {
        if (sc.input && sc.input.keyboard) { sc.input.keyboard.enabled = liga; if (liga) sc.input.keyboard.enableGlobalCapture(); else sc.input.keyboard.disableGlobalCapture(); }
      });
    };
    inp.oninput = function () {
      if (!self.sys.isActive()) return;
      self.dexBusca = inp.value.toUpperCase(); self.sel = 0; self.pinta();
    };
    inp.onfocus = function () { teclado(false); self.buscaAtiva = true; if (self.sys.isActive()) self.pinta(); };
    inp.onblur = function () { teclado(true); self.buscaAtiva = false; if (self.sys.isActive()) self.pinta(); };
    inp.onkeydown = function (ev) { if (ev.key === 'Enter' || ev.key === 'Escape') inp.blur(); };
    this.events.once('shutdown', function () { try { inp.blur(); } catch (e) { } });
    // tocar na pesquisa abre o teclado
    this.zBuscaDex = this.add.zone(ZAP.tx0 + 6, ZAP.topo - 6, W - 12, 22).setOrigin(0, 0);
    this.zBuscaDex.on('pointerdown', function () { if (self.modo === 'app' && self.aba === 5 && self.dexAberta < 0) inp.focus(); });
    // as tags: arrastar rola, tocar escolhe
    this.zChipsDex = this.add.zone(ZAP.tx0, ZAP.topo + 21, W, 20).setOrigin(0, 0);
    this.zChipsDex.on('pointerdown', function (pt) { self._arrChip = { x: pt.x, x0: self.dexChipX, andou: false }; });
    this.input.on('pointermove', function (pt) {
      var a = self._arrChip;
      if (!a || !pt.isDown || self.aba !== 5) return;
      if (Math.abs(pt.x - a.x) > 5) a.andou = true;
      if (a.andou) { self.dexChipX = Phaser.Math.Clamp(a.x0 - (pt.x - a.x), 0, Math.max(0, self._larguraChips - W + 16)); self.pinta(); }
    });
    this.input.on('pointerup', function (pt) {
      var a = self._arrChip; self._arrChip = null;
      if (!a || a.andou || self.aba !== 5) return;
      var pos = self._posChips || [];
      for (var i = 0; i < pos.length; i++) {
        if (pt.x >= pos[i].x && pt.x <= pos[i].x + pos[i].w) {
          self.dexTag = self.tagsDex[i]; self.sel = 0; sfx('catraca'); self.pinta(); return;
        }
      }
    });
  },
  // os índices de DEX que passam pela tag e pela pesquisa
  dexLista: function () {
    var tag = this.dexTag || 'TODOS', b = semAcentoDex((this.dexBusca || '').trim()), dex = leDex(), out = [];
    for (var i = 0; i < DEX.length; i++) {
      var e = DEX[i];
      if (tag !== 'TODOS' && e.tipo !== tag) continue;
      if (b) {
        var onde = semAcentoDex((dex[e.id] ? e.nome + ' ' : '') + e.tipo + ' ' + e.onde);
        if (onde.indexOf(b) < 0) continue;
      }
      out.push(i);
    }
    return out;
  },
  pintaBuscaDex: function (g) {
    var x0 = ZAP.tx0, W = ZAP.tx1 - ZAP.tx0, gc = this.gChipsDex, T = ZAP.topo, i;
    // a pesquisa
    g.fillStyle(this.buscaAtiva ? 0x2a3440 : 0x1c1c24, 1).fillRoundedRect(x0 + 6, T - 6, W - 12, 20, 10);
    if (this.buscaAtiva) g.lineStyle(1, 0x00e676, 1).strokeRoundedRect(x0 + 6.5, T - 5.5, W - 13, 19, 10);
    g.lineStyle(2, 0x8b90a6, 1).strokeCircle(x0 + 19, T + 3, 4);
    g.lineBetween(x0 + 22, T + 6, x0 + 26, T + 10);
    var cursor = this.buscaAtiva && Math.floor(Date.now() / 500) % 2 ? '_' : '';
    this.tBuscaDex.setVisible(true).setText(this.dexBusca ? this.dexBusca + cursor : (this.buscaAtiva ? cursor : 'PESQUISAR NA METRODEX'))
      .setColor(this.dexBusca ? PAL.branco : PAL.cinzaEsc);
    // as tags
    gc.clear();
    var x = x0 + 8 - this.dexChipX, pos = [];
    for (i = 0; i < this.tagsDex.length; i++) {
      var tg = this.tagsDex[i], on = tg === this.dexTag, w = tg.length * 6 + 16;
      var cor = tg === 'TODOS' ? 0x00e676 : (COR_TIPO[tg] || 0xb8bccc);
      gc.fillStyle(on ? cor : 0x1c1c24, 1).fillRoundedRect(x, T + 22, w, 17, 8);
      if (!on) gc.lineStyle(1, cor, 0.8).strokeRoundedRect(x + 0.5, T + 22.5, w - 1, 16, 8);
      this.tChipsDex[i].setVisible(true).setPosition(x + w / 2, T + 27).setText(tg).setColor(on ? '#0a0a12' : PAL.branco);
      pos.push({ x: x, w: w });
      x += w + 5;
    }
    this._posChips = pos;
    this._larguraChips = x + this.dexChipX - x0;
    this.zBuscaDex.setInteractive(); this.zChipsDex.setInteractive();
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
    // embaixo do nome: se já viu, e onde costuma aparecer (isso a METRODEX conta sempre)
    this.linha(3, y + 156, estado + '  -  ' + e.aparece, nivel === 2 ? PAL.verde : PAL.cinza);
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
    this.tBadge.setVisible(false); this.tBadgeCat.setVisible(false);
    this.barraFechar(g);
  },
  // a barra de baixo: o ✕ FECHAR (guarda o celular)
  barraFechar: function (g) {
    g.fillStyle(0x111119, 1).fillRect(ZAP.tx0, ZAP.abas, ZAP.tx1 - ZAP.tx0, 40);
    g.fillStyle(0x2a2a3a, 1).fillRect(ZAP.tx0, ZAP.abas, ZAP.tx1 - ZAP.tx0, 2);
    var xc = GW / 2 - 44, yc = ZAP.abas + 20;
    g.lineStyle(2, 0xe8362c, 1);
    g.beginPath(); g.moveTo(xc - 5, yc - 5); g.lineTo(xc + 5, yc + 5); g.strokePath();
    g.beginPath(); g.moveTo(xc + 5, yc - 5); g.lineTo(xc - 5, yc + 5); g.strokePath();
    this.linhas[14].setVisible(true).setOrigin(0.5, 0).setPosition(GW / 2 + 10, ZAP.abas + 12)
      .setText('FECHAR').setColor(PAL.cinza);
  },
  voltar: function () {
    if (this.fio) { this.fio = null; sfx('catraca'); this.pinta(); return; }
    if (this.dexAberta >= 0) { this.fechaFicha(); return; }
    if (this.aba === 3 && this.modo === 'app' && (this.catInfo || this.catVista === 'feed')) {
      if (this.catInfo) this.catInfo = null; else this.catVista = 'perfil';
      sfx('catraca'); this.pinta(); return;
    }
    this.vaiInicio();
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
    if (this.buscaAtiva && this.aba === 5 && time - (this._tCursor || 0) > 500) { this._tCursor = time; this.pinta(); }
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
