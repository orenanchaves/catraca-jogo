/* global Phaser, GameState */
/* Catraca — os minigames, um de cada vez

   Todo minigame do jogo acontece por sorteio, no meio de uma corrida.
   A briga é uma situação de carro entre nove: dava pra jogar a noite
   inteira sem ver nenhuma. Esta tela é a vitrine — cada item abre o
   minigame sozinho, montado do jeito que ele aparece no jogo, e volta
   pra lista quando acaba.

   Treino não vale ponto. Sem essa regra a tela virava fazenda: dá pra
   repetir a disputa da barra cem vezes seguidas e destravar o elenco
   inteiro sem pegar um metrô. Também não acaba partida, não abre
   tutorial e não mexe no recorde — tudo isso mora no `GameState.treino`
   e é conferido no core, num lugar só.

   ESTA CENA TEM QUE FICAR LOGO DEPOIS DO TÍTULO na lista do main.js. O
   Phaser desenha as cenas na ordem da lista, e cena pausada continua
   sendo desenhada: no fim da lista, esta tela aparecia POR CIMA da
   briga que ela mesma abriu. */

/* quem joga o treino: o personagem que estava escolhido no título */
var TREINO_QUEM = { k: 'estudante', g: null };

/* Três jeitos de abrir, e o jeito é dado, não código:
   `duelo` abre a cena por cima desta lista (ela pausa a lista e a
   devolve no fim); `cena` + `modo` monta a estação ou o vagão já
   armados pro minigame e volta sozinho quando ele termina. */
var TREINO = [
  { nome: 'A BRIGA', desc: 'rápido, forte e guarda', duelo: 'Briga' },
  { nome: 'A ENCARADA', desc: 'quem desvia, perde', duelo: 'Encarada' },
  { nome: 'A DISPUTA DA BARRA', desc: 'leia o corpo dele', duelo: 'Disputa' },
  { nome: 'BATALHA DE RIMA', desc: 'toque no ritmo', cena: 'Vagao', modo: 'rima' },
  { nome: 'O GUARDA NA RONDA', desc: 'ele procura quem pulou', cena: 'Vagao', modo: 'ronda' },
  { nome: 'DAR O LUGAR', desc: 'carisma ou descanso', cena: 'Vagao', modo: 'lugar' },
  { nome: 'VAGÃO LOTADO', desc: 'aperte sem parar', cena: 'Estacao', modo: 'empurrao', onde: 'plataforma' },
  { nome: 'PULAR A CATRACA', desc: 'sem o guarda te ver', cena: 'Estacao', modo: 'catraca', onde: 'saguao' }
];

/* A lista mede de cima pra baixo. Ladrilho de 46 é o que cabe nome e
   descrição em duas linhas de tinta (y+9..23 e y+27..41); oito deles
   com vão de 6 terminam em 506, e sobra a faixa do VOLTAR antes do fim
   da tela, em 576. A descrição mais longa tem 22 letras, 264px, e o
   ladrilho tem 288 começando o texto 14 pra dentro. */
var TRE = { x: 16, w: GW - 32, y0: 96, h: 46, passo: 52, volta: { y: 520, w: 168, h: 42 } };

var TreinoScene = new Phaser.Class({
  Extends: Phaser.Scene,
  initialize: function TreinoScene() { Phaser.Scene.call(this, { key: 'Treino' }); },

  init: function (dados) {
    this.dados = dados || {};
  },

  create: function () {
    Ctrl.liga(this);
    HUD_VISIVEL = false; CONTROLES_VISIVEIS = true;
    var eu = this, i;
    var d = this.dados;
    var ultimo = d.volta || d.repete;
    this.sel = (ultimo && ultimo.idx >= 0) ? ultimo.idx : 0;
    this.ignoraAct = false;

    // o mesmo fundo do título: a plataforma de verdade, com o véu por cima
    if (this.textures.exists('tit_fundo')) {
      this.add.image(0, GH - PLAT_ALT, 'tit_fundo').setOrigin(0, 0).setDepth(-10);
      this.add.image(0, GH - PLAT_ALT * 2, 'tit_fundo').setOrigin(0, 0).setDepth(-10);
    }
    var veu = this.add.graphics().setDepth(-5);
    veu.fillStyle(0x05050a, 0.86).fillRect(0, 0, GW, GH);

    txt(this, GW / 2, 16, 'MINIGAMES', PAL.branco, 16).setOrigin(0.5, 0).setDepth(3);
    this.tRecado = txt(this, GW / 2, 64, '', PAL.cinza, 8).setOrigin(0.5, 0).setDepth(3);

    this.g = this.add.graphics().setDepth(1);
    this.tNome = []; this.tDesc = [];
    for (i = 0; i < TREINO.length; i++) {
      var y = TRE.y0 + i * TRE.passo;
      this.tNome.push(txt(this, TRE.x + 14, y + 4, TREINO[i].nome, PAL.branco, 8).setDepth(3));
      this.tDesc.push(txt(this, TRE.x + 14, y + 22, TREINO[i].desc, PAL.cinza, 8).setDepth(3));
      var z = this.add.zone(TRE.x, y, TRE.w, TRE.h).setOrigin(0, 0).setInteractive();
      (function (idx) {
        /* Tocar já abre: escolher e depois confirmar é cobrar duas vezes
           pela mesma decisão, a mesma regra do "tocar o lugar já é ir
           até ele" do vagão. O `ignoraAct` engole o pulso do mesmo dedo,
           que senão abria o minigame de novo no quadro seguinte. */
        z.on('pointerdown', function () { eu.ignoraAct = true; eu.abre(idx); });
      })(i);
    }
    var vx = (GW - TRE.volta.w) / 2;
    txt(this, GW / 2, TRE.volta.y + 10, '◄ VOLTAR', PAL.branco, 8).setOrigin(0.5, 0).setDepth(3);
    var zv = this.add.zone(vx, TRE.volta.y, TRE.volta.w, TRE.volta.h).setOrigin(0, 0).setInteractive();
    zv.on('pointerdown', function () { eu.ignoraAct = true; eu.sai(); });

    // de volta, o recado diz qual foi o último; senão, diz a regra do treino
    if (ultimo && TREINO[ultimo.idx]) this.recado(TREINO[ultimo.idx].nome + ': ACABOU', PAL.amarelo);
    else this.recado('treino: não vale ponto', PAL.cinza);

    this.pinta();

    /* REPETIR, na pausa, volta pra cá pedindo o mesmo de novo. A lista
       aparece por um instante e o minigame abre por cima: é o caminho
       mais curto que ainda passa pela mesma porta que o toque, e abrir
       numa cena que acabou de nascer, no mesmo quadro, mata a cena. */
    if (d.repete && TREINO[d.repete.idx]) {
      this.time.delayedCall(60, function () { eu.abre(d.repete.idx); });
    }
  },

  /* 26 letras é o que cabe na largura da tela. O recado mais longo é
     'A DISPUTA DA BARRA: PERDEU', 26 cravadas; o corte é pro caso de
     alguém renomear um minigame e não medir. */
  recado: function (t, cor) {
    this.tRecado.setText(t.length > 26 ? t.slice(0, 26) : t).setColor(cor || PAL.cinza);
  },

  pinta: function () {
    var g = this.g; g.clear();
    for (var i = 0; i < TREINO.length; i++) {
      var y = TRE.y0 + i * TRE.passo, sel = (i === this.sel);
      /* Duelo é vermelho, cenário é azul: a cor diz de antemão se o
         minigame abre por cima desta lista ou te leva pro metrô. */
      var duelo = !!TREINO[i].duelo;
      ladrilho(g, TRE.x, y, TRE.w, TRE.h,
        duelo ? 0x2a1418 : 0x141c2c,
        duelo ? 0x4a2028 : 0x23304a,
        sel ? 0xf2c14e : (duelo ? 0x7a2a30 : 0x344566));
      this.tNome[i].setColor(sel ? PAL.amarelo : PAL.branco);
    }
    ladrilho(g, (GW - TRE.volta.w) / 2, TRE.volta.y, TRE.volta.w, TRE.volta.h,
      0x1b2438, 0x2b3a58, 0x3d5180);
  },

  abre: function (i) {
    var it = TREINO[i];
    if (!it) return;
    this.sel = i;
    this.pinta();
    /* O estado é refeito a cada abertura. Sem isso, perder três brigas
       seguidas deixava o quarto treino começando com dois corações e o
       descanso no chão — e a briga usa o descanso como vida inicial. */
    GameState.init(TREINO_QUEM.k, TREINO_QUEM.g);
    GameState.treino = { idx: i, modo: it.modo || it.duelo, cena: it.cena || null, onde: it.onde || null };
    audioOn(); sfx('ok');
    if (it.duelo) {
      var eu = this;
      var dados = { sprite: sorteiaPax(), aoFechar: function (r) { eu.voltou(i, r); } };
      if (it.duelo === 'Encarada') dados.nome = 'QUEM TAVA AÍ';
      /* A lista SOME enquanto o duelo roda. Cena pausada continua sendo
         desenhada, e os duelos não pintam a faixa de cima da tela — no
         jogo quem mora ali é o HUD. Medido: o 'MINIGAMES' aparecia por
         cima da barra de vida da briga. */
      this.scene.setVisible(false);
      this.scene.launch(it.duelo, dados);
      return;
    }
    var ida = { treino: it.modo };
    if (it.onde) ida.onde = it.onde;
    this.scene.start(it.cena, ida);
  },

  voltou: function (i, r) {
    this.scene.setVisible(true);
    this.ignoraAct = false;
    HUD_VISIVEL = false; CONTROLES_VISIVEIS = true;
    var nomes = { ganhou: 'GANHOU', perdeu: 'PERDEU', apartou: 'APARTARAM' };
    var cor = (r === 'ganhou') ? PAL.verde : (r === 'perdeu' ? PAL.vermelho : PAL.amarelo);
    this.recado(TREINO[i].nome + ': ' + (nomes[r] || 'ACABOU'), cor);
    this.pinta();
  },

  sai: function () {
    sfx('nao');
    this.scene.start('Title');
  },

  update: function () {
    Ctrl.update();
    if (Ctrl.upJust) { this.sel = (this.sel + TREINO.length - 1) % TREINO.length; sfx('catraca'); this.pinta(); }
    if (Ctrl.downJust) { this.sel = (this.sel + 1) % TREINO.length; sfx('catraca'); this.pinta(); }
    if (Ctrl.backJust) { this.sai(); return; }
    if (Ctrl.actJust) {
      if (this.ignoraAct) { this.ignoraAct = false; return; }
      this.abre(this.sel);
    }
  }
});
