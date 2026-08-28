/* global Phaser */
/* Catraca — tela de título, escolha e loja de personagens */

var TitleScene = new Phaser.Class({
  Extends: Phaser.Scene,
  initialize: function TitleScene() { Phaser.Scene.call(this, { key: 'Title' }); },

  create: function () {
    Ctrl.liga(this);
    HUD_VISIVEL = false; CONTROLES_VISIVEIS = true;
    this.sel = 0;
    this.ordem = ['estudante', 'clt', 'senhor', 'ambulante', 'gestante', 'turista'];

    var g = this.add.graphics();
    g.fillStyle(num(PAL.bg), 1).fillRect(0, 0, GW, GH);
    pontilhado(g, 0, 0, GW, GH, 0xffffff, 0.03, 8);

    /* A tela é uma pilha só, medida de cima pra baixo. Ela encolheu
       quando o elenco foi de quatro pra seis: a placa perdeu 28px e as
       cartas viraram duas fileiras de três. Carta espremida a 44px de
       largura não mostra boneco nenhum. */
    var y = 44, altPlaca = 84;

    // placa de estação com o nome do jogo
    g.fillStyle(0x06060c, 1).fillRect(0, y, GW, altPlaca);
    g.fillStyle(0x0b5fae, 1).fillRect(0, y, GW, 6);
    g.fillStyle(num(clarear('#0b5fae', 0.4)), 1).fillRect(0, y, GW, 2);
    g.fillStyle(0xe8362c, 1).fillRect(0, y + altPlaca - 6, GW, 6);
    g.fillStyle(num(clarear('#e8362c', 0.4)), 1).fillRect(0, y + altPlaca - 6, GW, 2);
    /* Texto desta fonte ocupa três vezes o tam em altura: 'CATRACA' em
       tam 20 come 60px, e o subtítulo a 38px dele estava entrando por
       baixo das letras. A pilha inteira abaixo é medida assim. */
    txtC(this, GW / 2, y + 4, 'CATRACA', PAL.branco, 20);
    txtC(this, GW / 2, y + 56, 'METRÔ DE SÃO PAULO', PAL.cinza, 8);
    y += altPlaca + 8;

    this.tTopo = txtC(this, GW / 2, y, '', PAL.cinzaEsc, 8);
    y += 28;

    var cardW = 96, cardH = 76, vao = 6, porLinha = 3;
    var x0 = Math.round((GW - (cardW * porLinha + vao * (porLinha - 1))) / 2);
    this.gCards = this.add.graphics().setDepth(1);
    this.cards = [];
    for (var i = 0; i < this.ordem.length; i++) {
      var col = i % porLinha, lin = Math.floor(i / porLinha);
      var cx = x0 + col * (cardW + vao), cy = y + lin * (cardH + vao);
      var sp = this.add.sprite(cx + cardW / 2, cy + cardH - 8,
        'ch_' + this.ordem[i], 0).setOrigin(0.5, 1).setScale(1.15).setDepth(2);
      this.cards.push({ x: cx, y: cy, w: cardW, h: cardH, sp: sp, k: this.ordem[i] });

      // a zona clicável avisa a cena pra escolher em vez de começar
      var zona = this.add.zone(cx, cy, cardW, cardH).setOrigin(0, 0).setInteractive();
      (function (self, idx) {
        zona.on('pointerdown', function () {
          if (self.sel === idx) self.tentaComprar();
          else { self.escolhe(idx); self.ignoraAct = true; }
        });
      })(this, i);
    }
    y += cardH * 2 + vao + 10;

    this.tNome = txtC(this, GW / 2, y, '', PAL.amarelo, 16);
    y += 50;
    this.tDesc = txtC(this, GW / 2, y, '', PAL.cinza, 8);
    this.tDesc.setWordWrapWidth(GW - 56).setAlign('center');
    y += 52;

    /* Ficha em uma coluna. Em duas, a coluna tinha 136px pra caber
       'DESCANSO' mais '90/100' — 192px de texto — e o rótulo entrava
       no valor: saía 'GRAIR$ 14,00'. */
    var passo = 18;
    this.fichaVal = [];
    var rotulos = ['GRANA', 'TARIFA', 'CARISMA', 'DESCANSO'];
    for (i = 0; i < 4; i++) {
      var fy = y + i * passo;
      txt(this, 52, fy, rotulos[i], PAL.cinzaEsc, 8);
      this.fichaVal.push(txt(this, GW - 52, fy, '', PAL.branco, 8).setOrigin(1, 0));
    }
    y += passo * 3 + 26;

    // a linha da loja: preço de quem está travado, ou nada
    this.tLoja = txtC(this, GW / 2, y, '', PAL.verde, 8);

    this.tStart = txtC(this, GW / 2, GH - 28,
      TOQUE_ATIVO ? 'TOQUE FORA PRA COMEÇAR' : 'CLIQUE FORA PRA COMEÇAR', PAL.verde, 8);
    this.tweens.add({ targets: this.tStart, alpha: 0.25, duration: 600, yoyo: true, repeat: -1 });

    this.atualiza();
    this.tempoAnim = 0;
  },

  escolhe: function (i) {
    if (i === this.sel) return;
    this.sel = i;
    sfx('catraca');
    this.atualiza();
  },

  /* Comprar é o mesmo comando de começar, na carta travada: quem
     escolhe um cadeado está pedindo pra abrir. */
  tentaComprar: function () {
    var k = this.ordem[this.sel];
    if (destravado(k)) return false;
    var r = compraPersonagem(k);
    if (r === 'ok') { sfx('vitoria'); this.flashLoja('DESTRAVADO!'); }
    else { sfx('nao'); this.flashLoja('FALTAM ' + (precoDe(k) - lePontos()) + ' PONTOS'); }
    this.ignoraAct = true;
    this.atualiza();
    return true;
  },

  flashLoja: function (m) {
    this.aviso = m;
    this.avisoT = 1400;
  },

  atualiza: function () {
    var k = this.ordem[this.sel], c = CHARS[k], aberto = destravado(k);

    var g = this.gCards; g.clear();
    for (var j = 0; j < this.cards.length; j++) {
      var cd = this.cards[j], sel = (j === this.sel), livre = destravado(cd.k);
      g.fillStyle(sel ? 0x1b2438 : 0x12121c, 1).fillRect(cd.x, cd.y, cd.w, cd.h);
      g.fillStyle(sel ? 0x2b3a58 : 0x1a1a26, 1).fillRect(cd.x, cd.y, cd.w, 4);
      g.lineStyle(2, sel ? 0xf2c14e : 0x282838, 1);
      g.strokeRect(cd.x + 1, cd.y + 1, cd.w - 2, cd.h - 2);
      g.fillStyle(0x000000, 0.35).fillEllipse(cd.x + cd.w / 2, cd.y + cd.h - 8, 30, 8);
      cd.sp.setAlpha(livre ? (sel ? 1 : 0.55) : 0.18);
      if (!livre) {
        // cadeado: corpo e argola, no canto de cima
        var lx = cd.x + cd.w - 20, ly = cd.y + 8;
        g.fillStyle(0xf2c14e, 1).fillRect(lx, ly + 5, 12, 9);
        g.fillStyle(0x12121c, 1).fillRect(lx + 5, ly + 8, 2, 4);
        g.lineStyle(2, 0xf2c14e, 1).strokeRect(lx + 3, ly, 6, 6);
      }
    }

    this.tNome.setText(c.nome).setColor(aberto ? PAL.amarelo : PAL.cinzaEsc);
    this.tDesc.setText(c.desc);
    var tarifa = c.tarifa === 0 ? 'GRÁTIS' : ('R$ ' + c.tarifa.toFixed(2).replace('.', ','));
    var vals = [
      'R$ ' + c.dinheiro.toFixed(2).replace('.', ','), tarifa,
      String(c.carisma), c.descanso + '/' + c.descansoMax
    ];
    for (var i = 0; i < vals.length; i++) this.fichaVal[i].setText(vals[i]);

    this.tTopo.setText('SEUS PONTOS: ' + lePontos());
    if (this.aviso) this.tLoja.setText(this.aviso).setColor(PAL.amarelo);
    else if (aberto) this.tLoja.setText('');
    else {
      var falta = precoDe(k) - lePontos();
      this.tLoja.setText((TOQUE_ATIVO ? 'TOQUE' : 'CLIQUE') + ' DE NOVO: ABRIR POR ' + precoDe(k))
        .setColor(falta > 0 ? PAL.vermelho : PAL.verde);
    }
    this.tStart.setVisible(aberto);
  },

  update: function (time, delta) {
    Ctrl.update();
    this.tempoAnim += delta;
    if (this.avisoT > 0) {
      this.avisoT -= delta;
      if (this.avisoT <= 0) { this.aviso = null; this.atualiza(); }
    }
    // só o escolhido anda no lugar; os outros ficam parados, mais apagados
    for (var j = 0; j < this.cards.length; j++) {
      this.cards[j].sp.setFrame(j === this.sel && destravado(this.cards[j].k)
        ? 1 + (Math.floor(this.tempoAnim / 220) % 2) : 0);
    }

    var n = this.ordem.length;
    if (Ctrl.left && !this._pl) this.escolhe((this.sel + n - 1) % n);
    if (Ctrl.right && !this._pr) this.escolhe((this.sel + 1) % n);
    if (Ctrl.up && !this._pu) this.escolhe((this.sel + n - 3) % n);
    if (Ctrl.down && !this._pd) this.escolhe((this.sel + 3) % n);
    this._pl = Ctrl.left; this._pr = Ctrl.right;
    this._pu = Ctrl.up; this._pd = Ctrl.down;

    if (Ctrl.actJust) {
      if (this.ignoraAct) { this.ignoraAct = false; return; }
      if (this.tentaComprar()) return;      // travado: o comando compra
      audioOn(); sfx('ok');
      GameState.init(this.ordem[this.sel]);
      this.scene.start('Catraca');
    }
  }
});
