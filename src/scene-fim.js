/* global Phaser */
/* Catraca — tela de resultado */

var FimScene = new Phaser.Class({
  Extends: Phaser.Scene,
  initialize: function FimScene() { Phaser.Scene.call(this, { key: 'Fim' }); },

  create: function () {
    Ctrl.liga(this);
    // no resultado o direcional não leva a lugar nenhum: toque em qualquer lugar age
    HUD_VISIVEL = false; CONTROLES_VISIVEIS = false;
    sfx('fim');
    var s = GameState.stats;
    var g = this.add.graphics();
    g.fillStyle(num(PAL.bg), 1).fillRect(0, 0, GW, GH);
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
    txtC(this, GW / 2, 212, 'VOCÊ FEZ O TRAJETO', PAL.cinzaEsc, 8);
    txtC(this, GW / 2, 230, String(GameState.diasInteiros()), PAL.branco, 32);
    txtC(this, GW / 2, 312, GameState.diasInteiros() === 1 ? 'DIA INTEIRO' : 'DIAS INTEIROS', PAL.cinza, 8);

    var linhas = [
      ['PAROU EM', GameState.estacaoAtual()],
      ['INDO PRA', GameState.rotuloDaPerna()],
      ['PAROU ÀS', GameState.hora()],
      ['ATRASOS', GameState.atrasos + ' de ' + MAX_ATRASOS],
      ['LUGARES DADOS', String(s.cedidos)],
      ['DISFARCES OK', s.disfarcesOk + '/' + s.disfarces],
      ['CATRACAS PULADAS', String(s.catracasPuladas)],
      ['SALDO', 'R$ ' + GameState.dinheiro.toFixed(2).replace('.', ',')]
    ];
    g.fillStyle(0x11111c, 1).fillRect(24, 338, GW - 48, 8 * 19 + 12);
    g.fillStyle(0x1c1c2c, 1).fillRect(24, 338, GW - 48, 2);
    for (var i = 0; i < linhas.length; i++) {
      var y = 346 + i * 19;
      if (i % 2) g.fillStyle(0xffffff, 0.025).fillRect(26, y - 1, GW - 52, 18);
      txt(this, 36, y, linhas[i][0], PAL.cinza, 8);
      txt(this, GW - 36, y, linhas[i][1], PAL.branco, 8).setOrigin(1, 0);
    }

    txtC(this, GW / 2, 508, this.titulo(s), PAL.amarelo, 8)
      .setWordWrapWidth(GW - 32).setAlign('center');
    txtC(this, GW / 2, 530, 'RECORDE: ' + GameState.recorde(), PAL.cinzaEsc, 8);
    var t = txtC(this, GW / 2, 552, nomeAgir() + ' PRA JOGAR DE NOVO', PAL.verde, 8);
    this.tweens.add({ targets: t, alpha: 0.25, duration: 600, yoyo: true, repeat: -1 });
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
    if (Ctrl.actJust) this.scene.start('Title');
  }
});
