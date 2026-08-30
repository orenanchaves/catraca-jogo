/* global Phaser */
/* Catraca — tela de resultado */

/* a mesma fileira de três da tela de título, medida do mesmo jeito */
/* Aqui são dois e não três, então o par é que fica centrado. E o pequeno
   tem 80 e não 46: 'TROCAR' são seis letras a 12 pixels, e no ladrilho
   do título cabia um '?'. */
var FIM_BOT = { h: 42, y: GH - 50, gr: 146, pq: 80, vao: 8 };
FIM_BOT.xGr = Math.round((GW - (FIM_BOT.gr + FIM_BOT.vao + FIM_BOT.pq)) / 2);
FIM_BOT.xDir = FIM_BOT.xGr + FIM_BOT.gr + FIM_BOT.vao;

var FimScene = new Phaser.Class({
  Extends: Phaser.Scene,
  initialize: function FimScene() { Phaser.Scene.call(this, { key: 'Fim' }); },

  /* quem congelou a cena de trás é quem a abriu; matar é serviço daqui */
  init: function (dados) {
    this.congeladas = (dados && dados.congeladas) || [];
    this.saindo = false;
  },

  create: function () {
    Ctrl.liga(this);
    // no resultado o direcional não leva a lugar nenhum: toque em qualquer lugar age
    HUD_VISIVEL = false; CONTROLES_VISIVEIS = false;
    sfx('fim');
    var s = GameState.stats;
    var g = this.add.graphics();
    /* Escuro, não opaco: o lugar onde você perdeu continua atrás, parado.
       Sem isso a tela de fim é um número sem endereço. */
    g.fillStyle(0x05050a, this.congeladas.length ? 0.9 : 1).fillRect(0, 0, GW, GH);
    pontilhado(g, 0, 0, GW, GH, 0xffffff, 0.03, 8);

    /* uma coluna só, de cima pra baixo, com os blocos sempre na mesma
       ordem: manchete, motivo, placar, ficha, rodapé. */
    g.fillStyle(0x06060c, 1).fillRect(0, 52, GW, 72);
    g.fillStyle(0xe8362c, 1).fillRect(0, 52, GW, 5);
    g.fillStyle(0xe8362c, 1).fillRect(0, 119, GW, 5);
    txtC(this, GW / 2, 70, 'FIM DE LINHA', PAL.vermelho, 16);

    var m = txtC(this, GW / 2, 134, GameState.motivoFim || 'A cidade venceu hoje.', PAL.cinza, 8);
    m.setWordWrapWidth(GW - 48).setAlign('center');

    /* O placar é em dias inteiros — ida e volta feitas. Estação virou
       coisa de trajeto, não de placar: são trinta por dia. */
    txtC(this, GW / 2, 206, 'VOCÊ FEZ O TRAJETO', PAL.cinzaEsc, 8);
    txtC(this, GW / 2, 220, String(GameState.diasInteiros()), PAL.branco, 32);
    txtC(this, GW / 2, 296, GameState.diasInteiros() === 1 ? 'DIA INTEIRO' : 'DIAS INTEIROS', PAL.cinza, 8);
    /* O recorde mora colado no placar, como o TOP do Crossy Road mora
       embaixo do número da vez. Ele estava lá embaixo, na altura em que
       depois nasceram os ladrilhos, e sumiu por baixo deles. */
    txtC(this, GW / 2, 316, 'RECORDE: ' + GameState.recorde(), PAL.cinzaEsc, 8);

    var linhas = [
      ['PAROU EM', GameState.estacaoAtual()],
      ['INDO PRA', GameState.rotuloDaPerna()],
      ['PAROU ÀS', GameState.hora()],
      ['ATRASOS', GameState.atrasos + ' de ' + MAX_ATRASOS],
      ['LUGARES DADOS', String(s.cedidos)],
      ['DISFARCES OK', s.disfarcesOk + '/' + s.disfarces],
      ['CATRACAS PULADAS', String(s.catracasPuladas)],
      ['ACHADO NO CHÃO', String(s.caidos || 0)],
      ['SALDO', 'R$ ' + GameState.dinheiro.toFixed(2).replace('.', ',')]
    ];
    /* Nove linhas no lugar de oito: o passo caiu de 19 pra 17 pra a
       tabela não encostar no título lá embaixo. */
    g.fillStyle(0x11111c, 1).fillRect(24, 340, GW - 48, linhas.length * 17 + 12);
    g.fillStyle(0x1c1c2c, 1).fillRect(24, 340, GW - 48, 2);
    for (var i = 0; i < linhas.length; i++) {
      var y = 348 + i * 17;
      if (i % 2) g.fillStyle(0xffffff, 0.025).fillRect(26, y - 1, GW - 52, 16);
      txt(this, 36, y, linhas[i][0], PAL.cinza, 8);
      txt(this, GW - 36, y, linhas[i][1], PAL.branco, 8).setOrigin(1, 0);
    }

    txtC(this, GW / 2, 504, this.titulo(s), PAL.amarelo, 8)
      .setWordWrapWidth(GW - 32).setAlign('center');

    /* ---------- voltar sem passar pelo menu ----------
       Isto era uma linha de texto que levava pro título, e de lá você
       ainda escolhia personagem e tocava em JOGAR: três toques e uma
       fala de abertura entre morrer e jogar de novo. É a distância que
       decide quantas partidas cabem numa sessão, e num jogo que se perde
       rápido ela tem que ser um toque.

       ► DE NOVO recomeça com o MESMO personagem, que é quase sempre o
       que se quer depois de perder. Quem quer trocar tem o ladrilho do
       lado — mesma fileira de três da tela de título, e as duas telas
       passam a ter a mesma gramática. */
    this.gBot = this.add.graphics().setDepth(1);
    ladrilho(this.gBot, FIM_BOT.xGr, FIM_BOT.y, FIM_BOT.gr, FIM_BOT.h, 0x14432c, 0x1d6e42, 0x00e676);
    ladrilho(this.gBot, FIM_BOT.xDir, FIM_BOT.y, FIM_BOT.pq, FIM_BOT.h, 0x1b2438, 0x2b3a58, 0x3d5180);

    var t = txtC(this, FIM_BOT.xGr + FIM_BOT.gr / 2, FIM_BOT.y + 10, '► DE NOVO', PAL.verde, 8).setDepth(3);
    txtC(this, FIM_BOT.xDir + FIM_BOT.pq / 2, FIM_BOT.y + 10, 'TROCAR', PAL.branco, 8).setDepth(3);
    this.tweens.add({ targets: t, alpha: 0.45, duration: 700, yoyo: true, repeat: -1 });

    var eu = this;
    this.add.zone(FIM_BOT.xGr, FIM_BOT.y, FIM_BOT.gr, FIM_BOT.h)
      .setOrigin(0, 0).setInteractive().on('pointerdown', function () { eu.deNovo(); });
    this.add.zone(FIM_BOT.xDir, FIM_BOT.y, FIM_BOT.pq, FIM_BOT.h)
      .setOrigin(0, 0).setInteractive().on('pointerdown', function () { eu.trocar(); });
  },

  /* as cenas de trás ficaram paradas só pra servir de fundo */
  descongela: function () {
    var eu = this;
    this.congeladas.forEach(function (k) { eu.scene.stop(k); });
    this.congeladas = [];
  },

  /* mesma pessoa, mesmo trajeto, do começo */
  deNovo: function () {
    if (this.saindo) return;
    this.saindo = true;
    audioOn(); sfx('ok');
    this.descongela();
    GameState.init(GameState.charKey, GameState.genero);
    this.scene.start('Estacao');
  },

  trocar: function () {
    if (this.saindo) return;
    this.saindo = true;
    sfx('catraca');
    this.descongela();
    this.scene.start('Title');
  },

  titulo: function (s) {
    if (GameState.diasInteiros() >= 5) return '"PASSE LIVRE VITALÍCIO"';
    if (GameState.diasInteiros() === 0) return '"NEM O PRIMEIRO DIA"';
    if (s.catracasPuladas > s.catracasPagas && s.catracasPuladas > 1) return '"BILHETE ÚNICO: O CORPO"';
    if (s.cedidos >= 4 && s.cedidos > s.recusas) return '"O SANTO DO VAGÃO"';
    if (s.disfarcesOk >= 3) return '"MESTRE DO CELULAR"';
    if (s.recusas >= 4) return '"SÃO PAULO VENCEU HOJE"';
    return '"PAULISTANO NÍVEL HARD"';
  },

  update: function () {
    Ctrl.update();
    // o comando de agir é o de jogar de novo: trocar tem que ser pedido
    if (Ctrl.actJust) this.deNovo();
  }
});
