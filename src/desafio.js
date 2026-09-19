/* global Phaser, GameState */
/* Catraca — o desafio, no molde do Pokémon

   A encarada e a disputa da barra falharam pelo mesmo motivo: o outro
   era sempre o mesmo. O que segura o Pokémon é GENTE diferente pra
   enfrentar, e um tipo que ganha de outro. Então aqui:

   - Passageiros com TIPO. Cada um fica parado no vagão olhando pra um
     lado; passou na frente dele, sobe o "!", ele vem até você e puxa
     conversa. Dá pra desviar escolhendo por onde andar.
   - A luta é por turnos e a vida é a PACIÊNCIA. Quem zera, desiste e
     sai de perto.
   - Suas quatro respostas têm tipo, e cada passageiro tem uma que o
     derruba e uma que nem faz cócega. Descobrir qual é qual é o jogo.

   A luta acontece NO VAGÃO: a câmera dá um zoom nos dois e esta cena
   desenha só o painel por cima. Nada de trocar pra outra tela — o
   pedido foi "um zoom momentâneo".

   Protótipo com três passageiros. Mais tipos, o elenco de cada linha e
   as insígnias (uma por linha de metrô) vêm depois de a luta provar que
   é divertida. */

/* As suas quatro respostas. `cura` devolve paciência pra você. */
var RESPOSTAS = [
  { tipo: 'LABIA', nome: 'LÁBIA', cor: '#a47cff', dano: 18, fala: 'VOCÊ JOGOU UMA LÁBIA!' },
  { tipo: 'IRONIA', nome: 'IRONIA', cor: '#f2c14e', dano: 18, fala: 'VOCÊ SOLTOU UMA IRONIA!' },
  { tipo: 'CALMA', nome: 'CALMA', cor: '#4fb8ff', dano: 14, cura: 8, fala: 'VOCÊ RESPIROU FUNDO.' },
  { tipo: 'FONE', nome: 'FONE', cor: '#00e676', dano: 16, fala: 'VOCÊ PÔS O FONE.' }
];

/* Os passageiros. Cada um: uma fraqueza (dano x2) e uma resistência
   (dano pela metade). 70 a 80 de paciência: no neutro são quatro ou
   cinco respostas, acertando a fraqueza são duas ou três. */
var DESAFIANTES = {
  tiozao: {
    nome: 'TIOZÃO DO ZAP', sprite: 'np_tiozao', pac: 70,
    fraco: 'FONE', resiste: 'LABIA',
    chega: 'VOCÊ VIU O VÍDEO\nQUE EU MANDEI?',
    sai: 'VOU MANDAR NO GRUPO\nDA FAMÍLIA, ENTÃO.',
    golpes: [
      { nome: 'ÁUDIO DE 5 MINUTOS', dano: 12 },
      { nome: 'CORRENTE DO BOM DIA', dano: 10 },
      { nome: 'NOTÍCIA DUVIDOSA', dano: 14 }
    ]
  },
  pregador: {
    nome: 'PREGADOR', sprite: 'np_pregador', pac: 80,
    fraco: 'CALMA', resiste: 'IRONIA',
    chega: 'IRMÃO, VOCÊ TEM\nUM MINUTINHO?',
    sai: 'VOU ORAR POR VOCÊ.',
    golpes: [
      { nome: 'VERSÍCULO NO GRITO', dano: 12 },
      { nome: 'O FIM ESTÁ PRÓXIMO', dano: 14 },
      { nome: 'AMÉM COLETIVO', dano: 10 }
    ]
  },
  /* O torcedor depende de onde o trem está: na Vermelha, da Sé até
     Itaquera é Corinthians (a Arena fica colada na estação); da Sé até
     a Barra Funda é Palmeiras (o Allianz fica do lado). Mesmo tipo de
     briga — ironia derruba, calma nem arranha —, time diferente. */
  corintiano: {
    nome: 'CORINTIANO', sprite: 'np_corintiano', pac: 75,
    fraco: 'IRONIA', resiste: 'CALMA',
    chega: 'AQUI É CORINTHIANS,\nTÁ LIGADO?',
    sai: 'DOMINGO TEM JOGO\nNA ARENA, HEIN.',
    golpes: [
      { nome: 'VAI CORINTHIANS!', dano: 12 },
      { nome: 'BANDO DE LOUCOS', dano: 14 },
      { nome: 'CORNETA', dano: 10 }
    ]
  },
  palmeirense: {
    nome: 'PALMEIRENSE', sprite: 'np_torcedor', pac: 75,
    fraco: 'IRONIA', resiste: 'CALMA',
    chega: 'E AÍ, É PORCO\nOU NÃO É?',
    sai: 'AVANTI, PALESTRA.',
    golpes: [
      { nome: 'AVANTI PALESTRA', dano: 12 },
      { nome: 'GRITO DE GOL', dano: 14 },
      { nome: 'CORNETA', dano: 10 }
    ]
  }
};
var TIPOS_DESAFIO = ['tiozao', 'pregador', 'torcedor'];

/* 'torcedor' vira o time da região. Na Sé e na Azul, qualquer um dos dois. */
function sorteiaDesafiante() {
  var t = TIPOS_DESAFIO[Math.floor(Math.random() * TIPOS_DESAFIO.length)];
  if (t !== 'torcedor') return t;
  var l = GameState.linhaAtual(), se = l.estacoes.indexOf(BALDEACAO);
  if (l === LINHAS.vermelha && GameState.idx > se) return 'corintiano';
  if (l === LINHAS.vermelha && GameState.idx < se) return 'palmeirense';
  return Math.random() < 0.5 ? 'corintiano' : 'palmeirense';
}

/* A vida inteira de quem joga é 100; entrar cansado corta, mas nunca
   abaixo da metade: luta perdida de antemão não é dificuldade. */
var DSF_VIDA = 100;
var DSF_AUTO = 1300;     // ms que uma mensagem espera sozinha antes de seguir

/* A planta do painel. O mundo aparece no meio, com zoom; o painel mora
   nas bordas, como no Pokémon: o outro em cima à esquerda, você embaixo
   à direita, a mensagem e o menu no pé da tela. */
var DSF = {
  ele: { x: 8, y: 60, w: 204, h: 52 },
  vc: { x: 108, y: 334, w: 204, h: 58 },
  msg: { x: 8, y: 400, w: GW - 16, h: 62 },
  menu: { x: 8, y: 468, w: 150, h: 44, vaoX: 4, vaoY: 4 }
};
function dsfCelula(i) {
  var m = DSF.menu;
  return { x: m.x + (i % 2) * (m.w + m.vaoX), y: m.y + Math.floor(i / 2) * (m.h + m.vaoY), w: m.w, h: m.h };
}

function multiplicador(resp, quem) {
  if (quem.fraco === resp.tipo) return 2;
  if (quem.resiste === resp.tipo) return 0.5;
  return 1;
}

var DesafioScene = new Phaser.Class({
  Extends: Phaser.Scene,
  initialize: function DesafioScene() { Phaser.Scene.call(this, { key: 'Desafio', active: false }); },

  init: function (dados) {
    this.dados = dados || {};
    this.congeladas = [];
  },

  create: function () {
    var eu = this, i;
    this.scene.manager.getScenes(true).forEach(function (sc) {
      var k = sc.scene.key;
      if (k === 'Desafio' || k === 'Hud') return;
      eu.congeladas.push(k);
      eu.scene.pause(k);
    });

    this.quem = DESAFIANTES[this.dados.tipo] || DESAFIANTES.tiozao;
    var fol = Math.max(0.5, GameState.descanso / GameState.char.descansoMax);
    this.vc = { pac: Math.round(DSF_VIDA * fol), max: DSF_VIDA, mostra: 0 };
    this.ele = { pac: this.quem.pac, max: this.quem.pac, mostra: this.quem.pac };
    this.vc.mostra = this.vc.pac;
    this.sel = 0;
    this.fila = [];          // as mensagens da vez, uma por toque
    this.fase = 'fala';      // fala, menu, fim
    this.resultado = null;
    this.saindo = false;

    this.g = this.add.graphics().setDepth(10);
    this.tEle = txt(this, DSF.ele.x + 10, DSF.ele.y + 4, this.quem.nome, PAL.branco, 8).setDepth(12);
    this.tVc = txt(this, DSF.vc.x + 10, DSF.vc.y + 4, nomeDoChar(GameState.charKey, GameState.genero), PAL.branco, 8).setDepth(12);
    this.tVcNum = txt(this, DSF.vc.x + DSF.vc.w - 10, DSF.vc.y + 32, '', PAL.cinza, 8).setOrigin(1, 0).setDepth(12);
    this.tMsg = txt(this, DSF.msg.x + 12, DSF.msg.y + 8, '', PAL.branco, 8).setDepth(12);
    this.tMenu = [];
    for (i = 0; i < 4; i++) {
      var c = dsfCelula(i);
      this.tMenu.push(txt(this, c.x + 26, c.y + 10, RESPOSTAS[i].nome, PAL.branco, 8).setDepth(12));
      var z = this.add.zone(c.x, c.y, c.w, c.h).setOrigin(0, 0).setInteractive().setDepth(13);
      (function (idx) {
        z.on('pointerdown', function () {
          if (eu.fase === 'menu') { eu.sel = idx; eu.usa(idx); }
          else eu.avanca();
        });
      })(i);
    }
    // toque fora do menu passa a mensagem; embaixo das zonas do menu
    this.add.zone(0, 0, GW, GH).setOrigin(0, 0).setInteractive().setDepth(1)
      .on('pointerdown', function () { if (eu.fase !== 'menu') eu.avanca(); });

    this.input.keyboard.on('keydown', function (ev) {
      var k = ev.code;
      if (eu.fase === 'menu') {
        if (k === 'KeyA' || k === 'ArrowLeft') eu.move(-1);
        else if (k === 'KeyD' || k === 'ArrowRight') eu.move(1);
        else if (k === 'KeyW' || k === 'ArrowUp') eu.move(-2);
        else if (k === 'KeyS' || k === 'ArrowDown') eu.move(2);
        else if (k === 'Space' || k === 'Enter' || k === 'KeyZ') eu.usa(eu.sel);
      } else if (k === 'Space' || k === 'Enter' || k === 'KeyZ') eu.avanca();
    });

    this.poe([{ msg: this.quem.nome + '\nQUER CONVERSAR.' }], 'menu');
    sfx('apito');
  },

  move: function (d) {
    this.sel = (this.sel + d + 4) % 4;
    sfx('catraca');
  },

  /* Enfileira mensagens e diz pra que fase ir quando acabarem. Cada
     mensagem pode trazer um efeito, que acontece quando ELA aparece: o
     dano cai junto com a frase que o anuncia, não antes. */
  poe: function (msgs, depois) {
    this.fila = msgs;
    this.depois = depois;
    this.fase = 'fala';
    this.mostraProxima();
  },

  mostraProxima: function () {
    var m = this.fila.shift();
    if (!m) { this.fimDaFila(); return; }
    this.tMsg.setText(m.msg).setColor(m.cor || PAL.branco);
    if (m.fx) m.fx.call(this);
    this.tMsg.t = 0;
  },

  avanca: function () {
    if (this.fase !== 'fala' || this.tMsg.t < 250) return;
    this.mostraProxima();
  },

  fimDaFila: function () {
    if (this.depois === 'sai') { this.fecha(); return; }
    if (this.ele.pac <= 0) { this.venceu(); return; }
    if (this.vc.pac <= 0) { this.perdeu(); return; }
    if (this.depois === 'ele') { this.vezDele(); return; }
    this.fase = 'menu';
    this.tMsg.setText('O QUE VOCÊ RESPONDE?').setColor(PAL.cinza);
  },

  usa: function (i) {
    if (this.fase !== 'menu') return;
    var r = RESPOSTAS[i], q = this.quem;
    var mult = multiplicador(r, q);
    var na = Math.random() < 1 / 12;
    var dano = Math.round(r.dano * mult * (0.85 + Math.random() * 0.15) * (na ? 1.5 : 1));
    var eu = this;
    var msgs = [{ msg: r.fala, fx: function () {
      eu.ele.pac = Math.max(0, eu.ele.pac - dano);
      eu.tremeEle = 260;
      sfx(mult > 1 ? 'batida' : 'empurra');
      if (r.cura) eu.vc.pac = Math.min(eu.vc.max, eu.vc.pac + r.cura);
    } }];
    if (na) msgs.push({ msg: 'NA LATA!', cor: PAL.amarelo });
    if (mult > 1) msgs.push({ msg: 'PEGOU EM CHEIO!', cor: PAL.verde });
    else if (mult < 1) msgs.push({ msg: 'NEM FEZ CÓCEGA...', cor: PAL.cinza });
    this.poe(msgs, 'ele');
  },

  vezDele: function () {
    var q = this.quem, g = q.golpes[Math.floor(Math.random() * q.golpes.length)];
    var dano = Math.round(g.dano * (0.85 + Math.random() * 0.3));
    var eu = this;
    this.poe([{ msg: q.nome + ' USOU\n' + g.nome + '!', fx: function () {
      eu.vc.pac = Math.max(0, eu.vc.pac - dano);
      eu.tremeVc = 260;
      eu.cameras.main.shake(160, 0.006);
      sfx('erro');
    } }], 'menu');
  },

  venceu: function () {
    this.resultado = 'ganhou';
    var pts = GameState.ganhaMinigame(6);
    GameState.addCarisma(6);
    GameState.stats.causos++;
    Missoes.conta('venceuDesafio', { tipo: this.dados.tipo });
    var fim = [{ msg: '"' + this.quem.sai + '"' }, { msg: this.quem.nome + '\nDESISTIU DE VOCÊ.', cor: PAL.verde }];
    if (pts) fim.push({ msg: '+' + pts + ' PONTOS', cor: PAL.amarelo });
    sfx('vitoria');
    this.poe(fim, 'sai');
  },

  perdeu: function () {
    this.resultado = 'perdeu';
    GameState.addCarisma(-8);
    GameState.addDescanso(-8);
    GameState.stats.causos++;
    sfx('nao');
    var msgs = [{ msg: 'VOCÊ PERDEU\nA PACIÊNCIA.', cor: PAL.vermelho }, { msg: 'O VAGÃO INTEIRO VIU.' }];
    /* perder o desafio custa um coração, como perder qualquer outro
       minigame; no treino não, que treino não vale nada */
    if (!GameState.treino) {
      GameState.perdeCoracao(1);
      msgs.push({ msg: '-1 CORAÇÃO', cor: PAL.vermelho });
    }
    this.poe(msgs, 'sai');
  },

  fecha: function () {
    if (this.saindo) return;
    this.saindo = true;
    devolveCenas(this, this.congeladas);
    var cb = this.dados.aoFechar, r = this.resultado;
    this.scene.stop('Desafio');
    if (cb) cb(r);
  },

  update: function (time, delta) {
    var dt = Math.min(delta, 50);
    if (this.tMsg) this.tMsg.t = (this.tMsg.t || 0) + dt;
    if (this.fase === 'fala' && this.tMsg.t > DSF_AUTO) this.mostraProxima();
    // as barras escorrem até o valor, que é o que faz o golpe ser visto
    var v = 0.09 * dt;
    this.vc.mostra += Phaser.Math.Clamp(this.vc.pac - this.vc.mostra, -v, v);
    this.ele.mostra += Phaser.Math.Clamp(this.ele.pac - this.ele.mostra, -v, v);
    if (this.tremeEle > 0) this.tremeEle -= dt;
    if (this.tremeVc > 0) this.tremeVc -= dt;
    this.pinta();
  },

  ficha: function (g, cx, prop, treme, cor) {
    var dx = treme > 0 ? Math.round((Math.random() - 0.5) * 4) : 0;
    g.fillStyle(0x0b0b12, 0.92).fillRect(cx.x + dx, cx.y, cx.w, cx.h);
    g.lineStyle(2, 0xf2f0ff, 1).strokeRect(cx.x + dx + 1, cx.y + 1, cx.w - 2, cx.h - 2);
    barra(g, cx.x + dx + 10, cx.y + 30, cx.w - 20, 8, prop,
      prop > 0.5 ? 0x00e676 : (prop > 0.2 ? 0xf2c14e : 0xe8362c), 0x1e1e2a);
  },

  pinta: function () {
    var g = this.g; g.clear();
    this.ficha(g, DSF.ele, this.ele.mostra / this.ele.max, this.tremeEle);
    this.ficha(g, DSF.vc, this.vc.mostra / this.vc.max, this.tremeVc);
    this.tVcNum.setText(Math.max(0, Math.round(this.vc.mostra)) + '/' + this.vc.max);

    g.fillStyle(0x0b0b12, 0.95).fillRect(DSF.msg.x, DSF.msg.y, DSF.msg.w, DSF.msg.h);
    g.lineStyle(2, 0xf2f0ff, 1).strokeRect(DSF.msg.x + 1, DSF.msg.y + 1, DSF.msg.w - 2, DSF.msg.h - 2);

    var menu = (this.fase === 'menu');
    for (var i = 0; i < 4; i++) {
      var c = dsfCelula(i), r = RESPOSTAS[i], mira = menu && i === this.sel;
      g.fillStyle(menu ? (mira ? 0x1b2438 : 0x11141d) : 0x0b0b12, 0.95).fillRect(c.x, c.y, c.w, c.h);
      g.lineStyle(2, mira ? num(r.cor) : 0x2a2a3a, 1).strokeRect(c.x + 1, c.y + 1, c.w - 2, c.h - 2);
      // o quadradinho do tipo: é por ele que se aprende quem ganha de quem
      g.fillStyle(num(r.cor), menu ? 1 : 0.35).fillRect(c.x + 10, c.y + 15, 10, 10);
      this.tMenu[i].setColor(menu ? (mira ? r.cor : PAL.branco) : PAL.cinzaEsc);
    }
  }
});
