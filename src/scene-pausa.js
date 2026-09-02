/* global Phaser */
/* Catraca — pausa e configurações

   Uma cena por cima de todas, que congela as outras. Fica no ar por
   conta própria porque o jogo tem quatro cenas de jogo e a pausa
   precisa valer nas quatro sem cada uma reimplementar a mesma coisa.

   Ela também não pode depender do Ctrl: o Ctrl mora na cena que está
   jogando, e cena pausada não atualiza tecla nenhuma. Por isso aqui o
   teclado é ouvido direto, por evento. */

var ITENS_PAUSA = [
  { chave: 'voltar', rotulo: function () { return 'CONTINUAR'; } },
  { chave: 'efeitos', rotulo: function () { return 'EFEITOS: ' + (SOM_LIGADO ? 'LIGADO' : 'DESLIGADO'); } },
  { chave: 'musica', rotulo: function () { return 'MÚSICA: ' + (MUSICA_LIGADA ? 'LIGADA' : 'DESLIGADA'); } },
  { chave: 'reiniciar', rotulo: function () { return 'REINICIAR TRAJETO'; } },
  { chave: 'sair', rotulo: function () { return 'SAIR PRO MENU'; } }
];

var PausaScene = new Phaser.Class({
  Extends: Phaser.Scene,
  initialize: function PausaScene() { Phaser.Scene.call(this, { key: 'Pausa', active: false }); },

  create: function () {
    var self = this;
    this.sel = 0;
    this.congeladas = [];

    // congela tudo que estava rodando, menos o HUD e esta cena
    this.scene.manager.getScenes(true).forEach(function (sc) {
      var k = sc.scene.key;
      if (k === 'Pausa' || k === 'Hud') return;
      self.congeladas.push(k);
      self.scene.pause(k);
    });

    this.g = this.add.graphics().setDepth(2000);
    this.tTitulo = txtC(this, GW / 2, 104, 'PAUSA', PAL.branco, 24).setDepth(2002);
    /* Em duas linhas de propósito: 'VILA MATILDE — INDO PRO TRABALHO'
       numa linha só dá 324px numa tela de 320, e sai cortado dos dois
       lados. */
    this.tSub = txtC(this, GW / 2, 162, '', PAL.cinzaEsc, 8).setDepth(2002).setAlign('center');

    this.itens = [];
    this.zonas = [];
    for (var i = 0; i < ITENS_PAUSA.length; i++) {
      var y = 228 + i * 40;
      this.itens.push(txtC(this, GW / 2, y, '', PAL.cinza, 8).setDepth(2002));
      var z = this.add.zone(40, y - 10, GW - 80, 34).setOrigin(0, 0).setInteractive();
      (function (idx) {
        z.on('pointerdown', function () { self.sel = idx; self.pinta(); self.escolhe(); });
      })(i);
      this.zonas.push(z);
    }

    /* As duas barras do HUD perderam as letras 'C' e 'D' — uma letra
       solta de 12 pixels não dizia carisma nem descanso, lia como
       borrão ao lado da barra. A legenda mora aqui, que é onde quem
       ficou na dúvida vai olhar, e são as mesmas barras do topo. */
    this.tLegC = txt(this, 138, 452, 'CARISMA', PAL.cinzaEsc, 8).setDepth(2002);
    this.tLegD = txt(this, 138, 486, 'DESCANSO', PAL.cinzaEsc, 8).setDepth(2002);

    this.input.keyboard.on('keydown', function (ev) {
      var c = ev.code;
      if (c === 'Escape' || c === 'KeyP') { self.fecha(); return; }
      if (c === 'KeyW' || c === 'ArrowUp') { self.move(-1); return; }
      if (c === 'KeyS' || c === 'ArrowDown') { self.move(1); return; }
      if (c === 'Space' || c === 'Enter' || c === 'KeyZ') { self.escolhe(); }
    });

    this.pinta();
  },

  move: function (d) {
    this.sel = (this.sel + d + ITENS_PAUSA.length) % ITENS_PAUSA.length;
    sfx('catraca');
    this.pinta();
  },

  pinta: function () {
    var g = this.g; g.clear();
    g.fillStyle(0x06060c, 0.86).fillRect(0, 0, GW, GH);
    g.fillStyle(0x0b5fae, 1).fillRect(0, 96, GW, 4);
    g.fillStyle(0xe8362c, 1).fillRect(0, 152, GW, 4);

    var dentro = !!GameState.char;
    this.tSub.setText(dentro
      ? GameState.estacaoAtual() + '\n► ' + GameState.rotuloDaPerna()
      : '');

    for (var i = 0; i < ITENS_PAUSA.length; i++) {
      var it = ITENS_PAUSA[i], sel = (i === this.sel);
      var vale = (it.chave !== 'reiniciar') || dentro;
      var y = 228 + i * 40;
      if (sel) {
        g.fillStyle(0x14141f, 1).fillRect(40, y - 10, GW - 80, 34);
        g.lineStyle(2, 0xf2c14e, 1).strokeRect(40, y - 10, GW - 80, 34);
      }
      this.itens[i].setText(it.rotulo())
        .setColor(!vale ? PAL.cinzaEsc : (sel ? PAL.amarelo : PAL.cinza));
    }

    // a legenda das duas barras, com os valores de agora
    this.tLegC.setVisible(dentro); this.tLegD.setVisible(dentro);
    if (!dentro) return;
    g.fillStyle(0x232336, 1).fillRect(88, 440, 168, 1);
    var pd = GameState.descanso / GameState.char.descansoMax;
    barra(g, 88, 458, 40, 9, GameState.carisma / 100, 0xe8a33c);
    // a mesma cor do topo, senão a legenda ensina uma cor que não existe
    barra(g, 88, 492, 40, 9, pd, corDescanso(pd, 0));
  },

  escolhe: function () {
    var it = ITENS_PAUSA[this.sel];
    if (it.chave === 'voltar') { this.fecha(); return; }
    if (it.chave === 'efeitos') { ligaSom(!SOM_LIGADO); sfx('ok'); this.pinta(); return; }
    if (it.chave === 'musica') { ligaMusica(!MUSICA_LIGADA); this.pinta(); return; }
    if (it.chave === 'reiniciar') {
      if (!GameState.char) return;
      sfx('nao');
      GameState.reiniciaPerna();
      this.desmonta();
      this.scene.stop('Pausa');
      this.scene.start('Estacao');
      return;
    }
    if (it.chave === 'sair') {
      sfx('nao');
      this.desmonta();
      this.scene.stop('Pausa');
      this.scene.start('Title');
    }
  },

  /* Descongelar e desmontar são coisas diferentes, e confundir as duas
     custou caro: continuar precisa devolver a cena ao ar, mas reiniciar
     e sair precisam matá-la. Descongelando, a cena antiga do vagão
     ficava rodando por baixo da nova, com dois vagões vivos ao mesmo
     tempo. */
  solta: function () {
    for (var i = 0; i < this.congeladas.length; i++) this.scene.resume(this.congeladas[i]);
    this.congeladas = [];
  },

  desmonta: function () {
    for (var i = 0; i < this.congeladas.length; i++) this.scene.stop(this.congeladas[i]);
    this.congeladas = [];
  },

  fecha: function () {
    sfx('ok');
    this.solta();
    this.scene.stop('Pausa');
  }
});
