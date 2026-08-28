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

    /* a tela é uma pilha só, medida de cima pra baixo. Havia aqui uma
       versão apertada de tudo, pro caso do direcional fixo comer o
       rodapé; o manche flutuante não come nada, então sobrou uma
       medida só, a folgada, e ela vale no celular também. */
    var yb = GH;
    var y = 44;

    // placa de estação com o nome do jogo
    var altPlaca = 104;
    g.fillStyle(0x06060c, 1).fillRect(0, y, GW, altPlaca);
    g.fillStyle(0x0b5fae, 1).fillRect(0, y, GW, 8);
    g.fillStyle(num(clarear('#0b5fae', 0.4)), 1).fillRect(0, y, GW, 2);
    g.fillStyle(0xe8362c, 1).fillRect(0, y + altPlaca - 8, GW, 8);
    g.fillStyle(num(clarear('#e8362c', 0.4)), 1).fillRect(0, y + altPlaca - 8, GW, 2);
    txtC(this, GW / 2, y + 22, 'CATRACA', PAL.branco, 24);
    txtC(this, GW / 2, y + altPlaca - 26, 'METRÔ DE SÃO PAULO', PAL.cinza, 8);
    y += altPlaca + 20;

    /* Os quatro na tela, clicáveis. Antes só dava pra trocar de
       personagem com as setas — quem jogava de mouse clicava uma vez e
       já começava como o primeiro da fila, sem nunca descobrir que
       havia escolha. */
    txtC(this, GW / 2, y, 'ESCOLHA QUEM VOCÊ É', PAL.cinzaEsc, 8);
    y += 26;

    var cardW = 66, cardH = 96, vao = 6;
    var x0 = Math.round((GW - (cardW * 4 + vao * 3)) / 2);
    this.gCards = this.add.graphics().setDepth(1);
    this.cards = [];
    for (var i = 0; i < this.ordem.length; i++) {
      var cx = x0 + i * (cardW + vao);
      var sp = this.add.sprite(cx + cardW / 2, y + cardH - 12,
        'ch_' + this.ordem[i], 0).setOrigin(0.5, 1).setScale(1.5).setDepth(2);
      this.cards.push({ x: cx, y: y, w: cardW, h: cardH, sp: sp });

      // a zona clicável avisa a cena pra escolher em vez de começar
      var zona = this.add.zone(cx, y, cardW, cardH).setOrigin(0, 0).setInteractive();
      (function (self, idx) {
        zona.on('pointerdown', function () {
          self.escolhe(idx);
          self.ignoraAct = true;      // esse clique foi pra escolher, não pra jogar
        });
      })(this, i);
    }
    this.cardY = y; this.cardH = cardH;
    y += cardH + 14;

    this.tNome = txtC(this, GW / 2, y, '', PAL.amarelo, 16);
    y += 42;
    this.tDesc = txtC(this, GW / 2, y, '', PAL.cinza, 8);
    this.tDesc.setWordWrapWidth(GW - 56).setAlign('center');
    y += 54;      // duas linhas de 24 e uma folga

    // ficha do personagem: rótulo à esquerda, número à direita
    var passo = 19;
    this.fichaVal = [];
    var rotulos = ['GRANA', 'TARIFA', 'CARISMA', 'DESCANSO'];
    for (var i = 0; i < 4; i++) {
      var fy = y + i * passo;
      txt(this, 62, fy, rotulos[i], PAL.cinzaEsc, 8);
      this.fichaVal.push(txt(this, GW - 62, fy, '', PAL.branco, 8).setOrigin(1, 0));
    }

    /* como não há mais direcional na tela, é aqui que a pessoa
       descobre que arrastar anda — é a única instrução que o jogo
       precisa dar, e ela cabe numa linha */
    txtC(this, GW / 2, yb - 88,
      TOQUE_ATIVO ? 'ARRASTE PRA ANDAR' : 'CLIQUE NUM DELES', PAL.cinzaEsc, 8);
    this.tStart = txtC(this, GW / 2, yb - 60,
      TOQUE_ATIVO ? 'TOQUE FORA PRA COMEÇAR' : 'CLIQUE FORA PRA COMEÇAR', PAL.verde, 8);
    this.tweens.add({ targets: this.tStart, alpha: 0.25, duration: 600, yoyo: true, repeat: -1 });
    txtC(this, GW / 2, yb - 28,
      'RECORDE: ' + GameState.recorde() + ' ESTAÇÕES', PAL.cinzaEsc, 8);

    this.atualiza();
    this.tempoAnim = 0;
  },

  escolhe: function (i) {
    if (i === this.sel) return;
    this.sel = i;
    sfx('catraca');
    this.atualiza();
  },

  atualiza: function () {
    var k = this.ordem[this.sel], c = CHARS[k];

    var g = this.gCards; g.clear();
    for (var j = 0; j < this.cards.length; j++) {
      var cd = this.cards[j], sel = (j === this.sel);
      g.fillStyle(sel ? 0x1b2438 : 0x12121c, 1).fillRect(cd.x, cd.y, cd.w, cd.h);
      g.fillStyle(sel ? 0x2b3a58 : 0x1a1a26, 1).fillRect(cd.x, cd.y, cd.w, 4);
      g.lineStyle(2, sel ? 0xf2c14e : 0x282838, 1);
      g.strokeRect(cd.x + 1, cd.y + 1, cd.w - 2, cd.h - 2);
      g.fillStyle(0x000000, 0.35).fillEllipse(cd.x + cd.w / 2, cd.y + cd.h - 10, 34, 9);
      cd.sp.setAlpha(sel ? 1 : 0.55);
    }

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
    // só o escolhido anda no lugar; os outros ficam parados, mais apagados
    for (var j = 0; j < this.cards.length; j++) {
      this.cards[j].sp.setFrame(j === this.sel
        ? 1 + (Math.floor(this.tempoAnim / 220) % 2) : 0);
    }

    if (Ctrl.left && !this._pl) this.escolhe((this.sel + this.ordem.length - 1) % this.ordem.length);
    if (Ctrl.right && !this._pr) this.escolhe((this.sel + 1) % this.ordem.length);
    this._pl = Ctrl.left; this._pr = Ctrl.right;

    if (Ctrl.actJust) {
      if (this.ignoraAct) { this.ignoraAct = false; return; }
      audioOn(); sfx('ok');
      GameState.init(this.ordem[this.sel]);
      this.scene.start('Catraca');
    }
  }
});
