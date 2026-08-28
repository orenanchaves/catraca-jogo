/* global Phaser */
/* Catraca — tela de título e escolha de personagem */

var TitleScene = new Phaser.Class({
  Extends: Phaser.Scene,
  initialize: function TitleScene() { Phaser.Scene.call(this, { key: 'Title' }); },

  create: function () {
    Ctrl.liga(this);
    HUD_VISIVEL = false; CONTROLES_VISIVEIS = true;
    this.sel = 0;
    this.ordem = ['estudante', 'clt', 'senhor', 'ambulante'];

    var g = this.add.graphics();
    g.fillStyle(num(PAL.bg), 1).fillRect(0, 0, GW, GH);
    pontilhado(g, 0, 0, GW, GH, 0xffffff, 0.03, 8);

    /* a tela é uma pilha só, medida a partir do que sobra: com o
       direcional ocupando o rodapé o espaço encolhe, e cada bloco
       encolhe junto em vez de um texto ir parar em cima do outro. */
    var yb = GH - alturaControles();
    var largo = (yb >= 520);
    var y = 44;

    // placa de estação com o nome do jogo
    var altPlaca = largo ? 104 : 80;
    g.fillStyle(0x06060c, 1).fillRect(0, y, GW, altPlaca);
    g.fillStyle(0x0b5fae, 1).fillRect(0, y, GW, 8);
    g.fillStyle(num(clarear('#0b5fae', 0.4)), 1).fillRect(0, y, GW, 2);
    g.fillStyle(0xe8362c, 1).fillRect(0, y + altPlaca - 8, GW, 8);
    g.fillStyle(num(clarear('#e8362c', 0.4)), 1).fillRect(0, y + altPlaca - 8, GW, 2);
    txtC(this, GW / 2, y + (largo ? 22 : 10), 'CATRACA', PAL.branco, largo ? 24 : 16);
    txtC(this, GW / 2, y + altPlaca - (largo ? 26 : 24), 'METRÔ DE SÃO PAULO', PAL.cinza, 8);
    y += altPlaca + (largo ? 20 : 10);

    // vitrine do personagem
    var altVit = largo ? 124 : 96;
    g.fillStyle(0x14141f, 1).fillRect(40, y, GW - 80, altVit);
    g.fillStyle(0x1d1d2c, 1).fillRect(40, y, GW - 80, 6);
    g.lineStyle(2, 0x39415c, 1).strokeRect(41, y + 1, GW - 82, altVit - 2);
    g.fillStyle(0x000000, 0.35).fillEllipse(GW / 2, y + altVit - 12, 60, 14);
    this.ator = this.add.sprite(GW / 2, y + altVit - 8, 'ch_estudante', 0)
      .setOrigin(0.5, 1).setScale(largo ? 2 : 1.6);
    y += altVit + (largo ? 12 : 8);

    this.tNome = txtC(this, GW / 2, y, '', PAL.amarelo, 16);
    y += largo ? 42 : 36;
    this.tDesc = txtC(this, GW / 2, y, '', PAL.cinza, 8);
    this.tDesc.setWordWrapWidth(GW - 56).setAlign('center');
    y += largo ? 54 : 50;      // duas linhas de 24 e uma folga

    // ficha do personagem: rótulo à esquerda, número à direita
    var passo = largo ? 19 : 15;
    this.fichaVal = [];
    var rotulos = ['GRANA', 'TARIFA', 'CARISMA', 'DESCANSO'];
    for (var i = 0; i < 4; i++) {
      var fy = y + i * passo;
      txt(this, 62, fy, rotulos[i], PAL.cinzaEsc, 8);
      this.fichaVal.push(txt(this, GW - 62, fy, '', PAL.branco, 8).setOrigin(1, 0));
    }

    // no celular as setas já estão desenhadas no direcional
    if (largo) txtC(this, GW / 2, yb - 96, '◄ A   D ►', PAL.cinzaEsc, 8);
    this.tStart = txtC(this, GW / 2, yb - (largo ? 68 : 56),
      TOQUE_ATIVO ? 'TOQUE NO OK PRA COMEÇAR' : 'CLIQUE PRA COMEÇAR', PAL.verde, 8);
    this.tweens.add({ targets: this.tStart, alpha: 0.25, duration: 600, yoyo: true, repeat: -1 });
    txtC(this, GW / 2, yb - (largo ? 36 : 28),
      'RECORDE: ' + GameState.recorde() + ' ESTAÇÕES', PAL.cinzaEsc, 8);

    this.atualiza();
    this.tempoAnim = 0;
  },

  atualiza: function () {
    var k = this.ordem[this.sel], c = CHARS[k];
    this.ator.setTexture('ch_' + k);
    this.tNome.setText(c.nome);
    this.tDesc.setText(c.desc);
    var tarifa = c.tarifa === 0 ? 'GRÁTIS' : ('R$ ' + c.tarifa.toFixed(2).replace('.', ','));
    var vals = [
      'R$ ' + c.dinheiro.toFixed(2).replace('.', ','), tarifa,
      String(c.carisma), c.descanso + '/' + c.descansoMax
    ];
    for (var i = 0; i < vals.length; i++) this.fichaVal[i].setText(vals[i]);
  },

  update: function (time, delta) {
    Ctrl.update();
    this.tempoAnim += delta;
    this.ator.setFrame(1 + (Math.floor(this.tempoAnim / 220) % 2));

    if (Ctrl.left && !this._pl) { this.sel = (this.sel + this.ordem.length - 1) % this.ordem.length; sfx('catraca'); this.atualiza(); }
    if (Ctrl.right && !this._pr) { this.sel = (this.sel + 1) % this.ordem.length; sfx('catraca'); this.atualiza(); }
    this._pl = Ctrl.left; this._pr = Ctrl.right;

    if (Ctrl.actJust) {
      audioOn(); sfx('ok');
      GameState.init(this.ordem[this.sel]);
      this.scene.start('Catraca');
    }
  }
});
