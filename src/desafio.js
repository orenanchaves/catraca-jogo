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
      { nome: 'ÁUDIO DE 5 MINUTOS', dano: 12, bloqueia: 'FONE' },
      { nome: 'CORRENTE DO BOM DIA', dano: 10, bloqueia: 'LABIA' },
      { nome: 'NOTÍCIA DUVIDOSA', dano: 14, bloqueia: 'IRONIA' }
    ]
  },
  pregador: {
    nome: 'PREGADOR', sprite: 'np_pregador', pac: 80,
    fraco: 'CALMA', resiste: 'IRONIA',
    chega: 'IRMÃO, VOCÊ TEM\nUM MINUTINHO?',
    sai: 'VOU ORAR POR VOCÊ.',
    golpes: [
      { nome: 'VERSÍCULO NO GRITO', dano: 12, bloqueia: 'FONE' },
      { nome: 'O FIM ESTÁ PRÓXIMO', dano: 14, bloqueia: 'CALMA' },
      { nome: 'AMÉM COLETIVO', dano: 10, bloqueia: 'LABIA' }
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
      { nome: 'VAI CORINTHIANS!', dano: 12, bloqueia: 'LABIA' },
      { nome: 'BANDO DE LOUCOS', dano: 14, bloqueia: 'FONE' },
      { nome: 'CORNETA', dano: 10, bloqueia: 'CALMA' }
    ]
  },
  // o palmeirense fala meio italiano, que é o Palestra de onde o time veio
  palmeirense: {
    nome: 'PALMEIRENSE', sprite: 'np_torcedor', pac: 75,
    fraco: 'IRONIA', resiste: 'CALMA',
    chega: 'E AÍ, BAMBINO?\nÉ PORCO OU NÃO É?',
    sai: 'CIAO, BAMBINO.\nAVANTI, PALESTRA!',
    golpes: [
      { nome: 'AVANTI PALESTRA', dano: 12, bloqueia: 'LABIA' },
      { nome: 'MAMMA MIA, QUE GOL!', dano: 14, bloqueia: 'FONE' },
      { nome: 'MA CHE CORNETA!', dano: 10, bloqueia: 'CALMA' }
    ]
  },
  /* Quem quer a sua barra: não é um tipo de gente, é uma situação. Vem
     de qualquer passageiro em pé quando você está segurando há um tempo
     (scene-vagao, cobicaBarra); o boneco é o dele. */
  barra: {
    nome: 'QUER A SUA BARRA', sprite: 'np_pax0', pac: 60,
    fraco: 'LABIA', resiste: 'IRONIA',
    chega: 'ESSA BARRA É MINHA,\nEU TAVA AQUI ANTES.',
    sai: 'TÁ BOM, FICA COM ELA.',
    golpes: [
      { nome: 'COTOVELADA', dano: 12, bloqueia: 'CALMA' },
      { nome: 'BAFO NO CANGOTE', dano: 10, bloqueia: 'FONE' },
      { nome: 'MÃO POR CIMA DA SUA', dano: 14, bloqueia: 'LABIA' }
    ]
  },
  saopaulino: {
    nome: 'SÃO-PAULINO', sprite: 'np_saopaulino', pac: 75,
    fraco: 'LABIA', resiste: 'FONE',
    chega: 'SOBERANO, MEU CARO.\nTRICOLOR É OUTRO NÍVEL.',
    sai: 'VOU PRO MORUMBI.\nSALVE O TRICOLOR.',
    golpes: [
      { nome: 'TRÊS MUNDIAIS', dano: 14, bloqueia: 'IRONIA' },
      { nome: 'SOBERANO!', dano: 12, bloqueia: 'FONE' },
      { nome: 'CORNETA', dano: 10, bloqueia: 'CALMA' }
    ]
  },
  santista: {
    nome: 'SANTISTA', sprite: 'np_santista', pac: 70,
    fraco: 'CALMA', resiste: 'IRONIA',
    chega: 'O PEIXE VAI VOLTAR,\nPODE ESCREVER.',
    sai: 'VOU DESCER PRA\nVILA BELMIRO.',
    golpes: [
      { nome: 'O REI PELÉ', dano: 12, bloqueia: 'LABIA' },
      { nome: 'SANTOS É PRAIA', dano: 12, bloqueia: 'FONE' },
      { nome: 'CORNETA', dano: 10, bloqueia: 'CALMA' }
    ]
  }
};
var TIPOS_DESAFIO = ['tiozao', 'pregador', 'torcedor'];
var TORCEDORES = ['corintiano', 'palmeirense', 'saopaulino', 'santista'];

/* 'torcedor' vira o time da região. Na Sé e na Azul, qualquer um dos dois. */
function sorteiaDesafiante() {
  var t = TIPOS_DESAFIO[Math.floor(Math.random() * TIPOS_DESAFIO.length)];
  if (t !== 'torcedor') return t;
  // quem joga de torcedor encontra gente do próprio time, que é o que o poder dele usa
  if (temPoder('torcida') && Math.random() < 0.35) return TIMES[leTime()].desafiante;
  // são-paulino e santista andam pela cidade toda
  if (Math.random() < 0.3) return Math.random() < 0.5 ? 'saopaulino' : 'santista';
  var l = GameState.linhaAtual(), se = l.estacoes.indexOf(BALDEACAO);
  if (l === LINHAS.vermelha && GameState.idx > se) return 'corintiano';
  if (l === LINHAS.vermelha && GameState.idx < se) return 'palmeirense';
  return Math.random() < 0.5 ? 'corintiano' : 'palmeirense';
}

/* A vida inteira de quem joga é 100; entrar cansado corta, mas nunca
   abaixo da metade: luta perdida de antemão não é dificuldade. */
var DSF_VIDA = 100;
var DSF_AUTO = 1300;     // ms que uma mensagem espera sozinha antes de seguir

/* ---------- o que deixa a luta viva ----------
   Era escolher, tomar, escolher. Três coisas mudam isso:
   - ELE AVISA o próximo golpe ('VEM AÍ: ...'), e cada golpe tem UMA
     resposta que o corta: contra o áudio de 5 minutos, o fone. Cada
     resposta passa a ser uma escolha entre bater na fraqueza dele e se
     defender do que vem. Descoberta, o bloqueio ganha um escudinho.
   - TEMPO: a vez tem relógio. Estourou, você hesita, e o golpe vem 20%
     mais forte. 4s, menos um pouco a cada dia de semana.
   - ESTADO: abaixo de 35% ele fica NERVOSO (bate 30% mais, mas a
     fraqueza vale o triplo), e a mesma resposta duas vezes seguidas
     rende 60%: ele já esperava. */
var DSF_NERVOSO = 0.35;
function dsfTempo() { return Math.max(2600, 4000 - GameState.dificuldade() * 150); }
// os bloqueios que você já descobriu, por nome de golpe, até o fim da partida
var DSF_SABE = {};

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

/* ---------- a animação de cada ataque ----------
   Texto e tremida não bastavam: o ataque tem que SAIR de alguém e
   CHEGAR no outro. Cada resposta sua tem um desenho (coração da lábia,
   raio da ironia, a respiração da calma, as notas do fone), e cada golpe
   deles também. No impacto o alvo pisca branco, é empurrado pra trás e
   soltam estrelinhas; bloqueado, o golpe para num escudo na sua frente. */
var FX_GOLPE = {
  'ÁUDIO DE 5 MINUTOS': 'audio', 'CORNETA': 'audio',
  'CORRENTE DO BOM DIA': 'balao', 'AMÉM COLETIVO': 'balao',
  'NOTÍCIA DUVIDOSA': 'papel',
  'VERSÍCULO NO GRITO': 'grito', 'O FIM ESTÁ PRÓXIMO': 'sombra',
  'VAI CORINTHIANS!': 'torcida', 'BANDO DE LOUCOS': 'torcida',
  'AVANTI PALESTRA': 'torcida', 'MAMMA MIA, QUE GOL!': 'torcida', 'MA CHE CORNETA!': 'audio',
  'TRÊS MUNDIAIS': 'grito', 'SOBERANO!': 'torcida',
  'O REI PELÉ': 'balao', 'SANTOS É PRAIA': 'torcida',
  'COTOVELADA': 'grito', 'BAFO NO CANGOTE': 'audio', 'MÃO POR CIMA DA SUA': 'papel'
};
// o confete de cada torcida
var CORES_TORCIDA = {
  corintiano: [0xf2f0ff, 0x26262c], palmeirense: [0x12783c, 0xf2f0ff],
  saopaulino: [0xd8302a, 0x1c1c22, 0xf2f0ff], santista: [0xf2f0ff, 0x1c1c22]
};
var FX_CHEGA = 460;      // ms até o ataque chegar no outro

// o nome da resposta (LÁBIA, IRONIA...) pelo tipo, pra quem mostra a fraqueza
function nomeResposta(tipo) {
  for (var i = 0; i < RESPOSTAS.length; i++) if (RESPOSTAS[i].tipo === tipo) return RESPOSTAS[i].nome;
  return tipo;
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
    marcaDex(this.dados.tipo, 1);
    var fol = Math.max(0.5, GameState.descanso / GameState.char.descansoMax);
    this.vc = { pac: Math.round(DSF_VIDA * fol), max: DSF_VIDA, mostra: 0 };
    this.ele = { pac: this.quem.pac, max: this.quem.pac, mostra: this.quem.pac };
    this.vc.mostra = this.vc.pac;
    this.sel = 0;
    this.fila = [];          // as mensagens da vez, uma por toque
    this.fase = 'fala';      // fala, menu, fim
    this.resultado = null;
    this.saindo = false;
    this.proximo = this.sorteiaGolpe();
    this.ultima = null;
    this.nervoso = false;
    this.tempo = 0;

    this.g = this.add.graphics().setDepth(10);
    // os ataques voam por baixo dos painéis, no meio da tela, onde estão os dois
    this.gFx = this.add.graphics().setDepth(5);
    this.fx = [];
    // onde cada um estava: o recuo do golpe é desfeito na saída, mesmo no meio
    this.xPl = this.dados.pl ? this.dados.pl.x : 0;
    this.xEle = this.dados.ele ? this.dados.ele.x : 0;
    /* ---------- de quem é cada ficha ----------
       A ficha de cima é de quem está em cima na tela, e a de baixo de quem
       está embaixo ('tem que mudar a ordem quando muda a posição'). O
       desafiante pode vir de cima ou de baixo; com as fichas fixas, a sua
       ficha ficava longe do seu boneco. Em cima à esquerda, embaixo à
       direita, como no Pokémon; só troca quem mora em cada uma. */
    var voceEmCima = this.dados.pl && this.dados.ele && this.dados.pl.y < this.dados.ele.y;
    var cima = { x: 8, y: 60, w: 204 }, baixo = { x: 108, y: 334, w: 204 };
    this.bEle = voceEmCima ? { x: baixo.x, y: baixo.y, w: baixo.w, h: DSF.ele.h } : { x: cima.x, y: cima.y, w: cima.w, h: DSF.ele.h };
    this.bVc = voceEmCima ? { x: cima.x, y: cima.y, w: cima.w, h: DSF.vc.h } : { x: baixo.x, y: baixo.y, w: baixo.w, h: DSF.vc.h };
    this.eleEmBaixo = voceEmCima;
    this.tEle = txt(this, this.bEle.x + 10, this.bEle.y + 4, this.quem.nome, PAL.branco, 8).setDepth(12);
    this.tVc = txt(this, this.bVc.x + 10, this.bVc.y + 4, nomeDoChar(GameState.charKey, GameState.genero), PAL.branco, 8).setDepth(12);
    this.tVcNum = txt(this, this.bVc.x + this.bVc.w - 10, this.bVc.y + 32, '', PAL.cinza, 8).setOrigin(1, 0).setDepth(12);
    this.tMsg = txt(this, DSF.msg.x + 12, DSF.msg.y + 8, '', PAL.branco, 8).setDepth(12);
    // o aviso do próximo golpe, numa plaquinha embaixo da ficha dele
    // o aviso do golpe fica embaixo da ficha dele, ou em cima quando ela é a de baixo (senão bate na mensagem)
    this.yVem = this.eleEmBaixo ? this.bEle.y - 20 : this.bEle.y + this.bEle.h + 2;
    this.tVem = txt(this, this.bEle.x + 8, this.yVem + 5, '', PAL.branco, 8)
      .setScale(ESCALA_TEXTO / 2).setDepth(12);
    // o NERVOSO do lado de fora da ficha dele: à direita da de cima, à esquerda da de baixo
    this.tNervoso = txt(this, this.eleEmBaixo ? this.bEle.x - 50 : this.bEle.x + this.bEle.w + 6, this.bEle.y + 18, '', PAL.vermelho, 8)
      .setScale(ESCALA_TEXTO / 2).setDepth(12);
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
    this.tempo = dsfTempo();
    this.tMsg.setText('O QUE VOCÊ RESPONDE?').setColor(PAL.cinza);
  },

  sorteiaGolpe: function () {
    var gs = this.quem.golpes;
    return gs[Math.floor(Math.random() * gs.length)];
  },

  // o relógio da vez estourou: você hesitou, e ele não espera
  hesita: function () {
    this.bloqueou = false;
    this.bonus = 1.2;
    this.ultima = null;
    sfx('nao');
    this.poe([{ msg: 'VOCÊ HESITOU...', cor: PAL.cinza }], 'ele');
  },


  usa: function (i) {
    if (this.fase !== 'menu') return;
    var r = RESPOSTAS[i], q = this.quem;
    var mult = multiplicador(r, q);
    if (mult > 1 && this.nervoso) mult = 3;           // nervoso, a fraqueza dói o triplo
    /* torcedor contra torcedor de outro time: a ironia vem com gosto */
    var rival = temPoder('torcida') && r.tipo === 'IRONIA' && TORCEDORES.indexOf(this.dados.tipo) >= 0 &&
      TIMES[leTime()].desafiante !== this.dados.tipo;
    if (rival) mult *= 1.5;
    var repetiu = (this.ultima === r.tipo);
    this.ultima = r.tipo;
    this.bloqueou = (this.proximo && this.proximo.bloqueia === r.tipo);
    this.bonus = 1;
    var na = Math.random() < 1 / 12;
    var dano = Math.round(r.dano * mult * (0.85 + Math.random() * 0.15) * (na ? 1.5 : 1) * (repetiu ? 0.6 : 1));
    // a paciência dele cai já aqui, pra que o NERVOSO entre na mesma fala
    var depois = Math.max(0, this.ele.pac - dano);
    var eu = this;
    var msgs = [{ msg: r.fala, fx: function () {
      eu.ataque(r.tipo, true, false, mult > 1);
      eu.ele.pac = Math.max(0, eu.ele.pac - dano);
      eu.tremeEle = 260;
      sfx(mult > 1 ? 'batida' : 'empurra');
      if (r.cura) eu.vc.pac = Math.min(eu.vc.max, eu.vc.pac + r.cura);
    } }];
    if (na) msgs.push({ msg: 'NA LATA!', cor: PAL.amarelo });
    if (mult > 2) msgs.push({ msg: 'ACABOU COM ELE!', cor: PAL.verde });
    else if (mult > 1) msgs.push({ msg: 'PEGOU EM CHEIO!', cor: PAL.verde });
    else if (mult < 1) msgs.push({ msg: 'NEM FEZ CÓCEGA...', cor: PAL.cinza });
    if (rival) msgs.push({ msg: 'É RIVALIDADE!', cor: PAL.amarelo });
    if (repetiu) msgs.push({ msg: 'DE NOVO? JÁ ESPERAVA.', cor: PAL.cinza });
    if (depois > 0 && !this.nervoso && depois / this.ele.max < DSF_NERVOSO) {
      this.nervoso = true;
      msgs.push({ msg: 'ELE FICOU NERVOSO!', cor: PAL.vermelho, fx: function () { sfx('apito'); } });
    }
    this.poe(msgs, 'ele');
  },

  /* A vez dele é o golpe que ele ANUNCIOU, não um novo sorteio: o aviso
     só vale se for verdade. Cortado, não tira nada, e o jogo lembra
     qual resposta corta aquele golpe. Depois ele já escolhe o próximo. */
  vezDele: function () {
    var q = this.quem, g = this.proximo || this.sorteiaGolpe();
    var bloq = !!this.bloqueou;
    var dano = bloq ? 0 : Math.round(g.dano * (0.85 + Math.random() * 0.3) * (this.nervoso ? 1.3 : 1) * (this.bonus || 1));
    var eu = this;
    var msgs = [{ msg: q.nome + ' USOU\n' + g.nome + '!', fx: function () {
      eu.ataque(FX_GOLPE[g.nome] || 'balao', false, bloq, eu.nervoso);
      if (bloq) { sfx('catraca'); return; }
      eu.vc.pac = Math.max(0, eu.vc.pac - dano);
      eu.tremeVc = 260;
      eu.cameras.main.shake(160, eu.nervoso ? 0.009 : 0.006);
      sfx('erro');
    } }];
    if (bloq) {
      DSF_SABE[g.nome] = g.bloqueia;
      msgs.push({ msg: 'VOCÊ CORTOU NA HORA!', cor: PAL.verde });
    }
    this.bloqueou = false; this.bonus = 1;
    this.proximo = this.sorteiaGolpe();
    this.poe(msgs, 'menu');
  },

  venceu: function () {
    marcaDex(this.dados.tipo, 2);      // vencido: a METRODEX passa a mostrar a fraqueza
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
    sfx('derrota');
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
    // a cena morre com piscada e recuo pela metade: devolve os dois como estavam
    var dp = this.dados.pl, de = this.dados.ele;
    if (dp && dp.active) { dp.clearTint(); dp.x = this.xPl; }
    if (de && de.active) { de.clearTint(); de.x = this.xEle; }
    devolveCenas(this, this.congeladas);
    var cb = this.dados.aoFechar, r = this.resultado;
    this.scene.stop('Desafio');
    if (cb) cb(r);
  },

  update: function (time, delta) {
    var dt = Math.min(delta, 50);
    if (this.tMsg) this.tMsg.t = (this.tMsg.t || 0) + dt;
    if (this.fase === 'fala' && this.tMsg.t > DSF_AUTO) this.mostraProxima();
    if (this.fase === 'menu') {
      this.tempo -= dt;
      if (this.tempo <= 0) this.hesita();
    }
    // as barras escorrem até o valor, que é o que faz o golpe ser visto
    var v = 0.09 * dt;
    this.vc.mostra += Phaser.Math.Clamp(this.vc.pac - this.vc.mostra, -v, v);
    this.ele.mostra += Phaser.Math.Clamp(this.ele.pac - this.ele.mostra, -v, v);
    if (this.tremeEle > 0) this.tremeEle -= dt;
    if (this.tremeVc > 0) this.tremeVc -= dt;
    this.pintaFx(dt);
    this.pinta();
  },

  /* Onde um sprite do vagão aparece na tela, com o zoom da câmera de lá.
     O y é o do peito (22 acima do pé), que é de onde se fala. */
  naTela: function (sp) {
    var cam = this.dados.cam;
    if (!sp || !cam) return { x: GW / 2, y: GH / 2 };
    var m = cam.midPoint, z = cam.zoom;
    return { x: (sp.x - m.x) * z + GW / 2, y: (sp.y - 22 - m.y) * z + GH / 2 };
  },

  // um ataque: de quem sai, pra quem vai, e o que acontece quando chega
  ataque: function (tipo, deVc, bloq, forte) {
    var A = this.naTela(deVc ? this.dados.pl : this.dados.ele);
    var B = this.naTela(deVc ? this.dados.ele : this.dados.pl);
    // bloqueado, o golpe morre num escudo a um quarto do caminho
    var alvo = bloq ? { x: B.x + (A.x - B.x) * 0.25, y: B.y + (A.y - B.y) * 0.25 } : B;
    var f = this.fx, i, eu = this;
    function voa(k, n, passo, extra) {
      for (var j = 0; j < n; j++) {
        var p = { k: k, t: -j * passo, dur: FX_CHEGA, ax: A.x, ay: A.y, bx: alvo.x, by: alvo.y,
          arco: (Math.random() - 0.5) * 50, gira: Math.random() * 6 };
        if (extra) for (var q in extra) p[q] = extra[q];
        f.push(p);
      }
    }
    if (tipo === 'LABIA') voa('coracao', 5, 70);
    else if (tipo === 'IRONIA') { voa('raio', 1, 0, { dur: 300 }); voa('raio', 1, 110, { dur: 260 }); }
    else if (tipo === 'CALMA') {
      voa('respira', 2, 160, { dur: 520, bx: A.x, by: A.y });
      voa('mais', 3, 120, { dur: 600, bx: A.x, by: A.y });
      voa('anel', 3, 110, { cor: 0x4fb8ff });
    } else if (tipo === 'FONE') { voa('nota', 4, 80); voa('anel', 2, 140, { cor: 0x00e676 }); }
    else if (tipo === 'audio') voa('anel', 5, 70, { cor: 0xe8762c });
    else if (tipo === 'balao') voa('balao', 4, 90);
    else if (tipo === 'papel') voa('papel', 5, 70);
    else if (tipo === 'grito') {
      voa('grito', 2, 150, { dur: 520, bx: A.x, by: A.y });
      voa('balao', 2, 120);
    } else if (tipo === 'sombra') {
      voa('sombra', 1, 0, { dur: 700 });
      voa('anel', 3, 120, { cor: 0x6a1a1a });
    } else if (tipo === 'torcida') {
      var cores = CORES_TORCIDA[this.dados.tipo] || [0xf2f0ff, 0x26262c];
      voa('grito', 1, 0, { dur: 480, bx: A.x, by: A.y, cor: cores[0] });
      for (i = 0; i < 16; i++) {
        f.push({ k: 'confete', t: -120, dur: 900, ax: alvo.x, ay: alvo.y - 30, bx: 0, by: 0,
          vx: (Math.random() - 0.5) * 0.22, vy: -0.05 - Math.random() * 0.12, cor: cores[i % cores.length], gira: Math.random() * 6 });
      }
    } else voa('balao', 3, 90);

    // a chegada
    this.time.delayedCall(FX_CHEGA + 40, function () {
      if (bloq) {
        f.push({ k: 'escudo', t: 0, dur: 420, ax: alvo.x, ay: alvo.y, bx: A.x, by: A.y });
        return;
      }
      eu.acerta(deVc ? eu.dados.ele : eu.dados.pl, alvo, A, forte);
    });
  },

  // o alvo pisca branco duas vezes, recua um pouco e solta estrelinhas
  acerta: function (sp, pt, de, forte) {
    var f = this.fx, n = forte ? 10 : 6, eu = this;
    for (var i = 0; i < n; i++) {
      var an = Math.random() * Math.PI * 2, v = 0.06 + Math.random() * 0.08;
      f.push({ k: 'estrela', t: 0, dur: 420, ax: pt.x, ay: pt.y, bx: 0, by: 0,
        vx: Math.cos(an) * v, vy: Math.sin(an) * v, cor: forte ? 0xf2c14e : 0xf2f0ff });
    }
    if (!sp || !sp.active) return;
    sp.setTintFill(0xffffff);
    this.time.delayedCall(70, function () { if (sp.active) sp.clearTint(); });
    this.time.delayedCall(140, function () { if (sp.active) sp.setTintFill(0xffffff); });
    this.time.delayedCall(210, function () { if (sp.active) sp.clearTint(); });
    var x0 = sp.x, dx = (pt.x - de.x) > 0 ? 1 : -1;
    this.tweens.add({ targets: sp, x: x0 + dx * (forte ? 5 : 3), duration: 70, yoyo: true,
      onComplete: function () { if (sp.active) sp.x = x0; } });
  },

  pintaFx: function (dt) {
    var g = this.gFx; g.clear();
    for (var i = this.fx.length - 1; i >= 0; i--) {
      var p = this.fx[i];
      p.t += dt;
      if (p.t < 0) continue;
      var u = p.t / p.dur;
      if (u >= 1) { this.fx.splice(i, 1); continue; }
      // o caminho: de A pra B, com um arco pro lado que cada um sorteou
      var x = p.ax + (p.bx - p.ax) * u, y = p.ay + (p.by - p.ay) * u;
      var nx = -(p.by - p.ay), ny = (p.bx - p.ax), nl = Math.sqrt(nx * nx + ny * ny) || 1;
      var off = Math.sin(u * Math.PI) * p.arco;
      x += nx / nl * off; y += ny / nl * off;
      var al = 1 - u * 0.4;
      switch (p.k) {
        case 'coracao':
          // tudo aqui é desenhado no dobro: os bonecos estão com zoom de 2,2
          g.fillStyle(0xa47cff, al).fillCircle(x - 5, y, 6).fillCircle(x + 5, y, 6);
          g.fillTriangle(x - 11, y + 2, x + 11, y + 2, x, y + 14);
          g.fillStyle(0xffffff, al * 0.6).fillRect(x - 7, y - 3, 3, 3);
          break;
        case 'raio':
          // um zigue-zague novo a cada quadro: é isso que faz ele estalar
          g.lineStyle(6, 0xf2c14e, 1 - u);
          g.beginPath(); g.moveTo(p.ax, p.ay);
          for (var s2 = 1; s2 < 5; s2++) {
            var k2 = s2 / 5;
            g.lineTo(p.ax + (p.bx - p.ax) * k2 + (Math.random() - 0.5) * 18, p.ay + (p.by - p.ay) * k2 + (Math.random() - 0.5) * 18);
          }
          g.lineTo(p.bx, p.by); g.strokePath();
          g.lineStyle(2, 0xffffff, 1 - u).lineBetween(p.ax, p.ay, p.bx, p.by);
          break;
        case 'anel':
          g.lineStyle(4, p.cor, 1 - u).strokeCircle(x, y, 8 + u * 26);
          break;
        case 'respira':
          g.lineStyle(2, 0x4fb8ff, 1 - u).strokeCircle(p.ax, p.ay, 10 + u * 34);
          break;
        case 'mais':
          var my = p.ay - u * 36;
          g.fillStyle(0x00e676, 1 - u).fillRect(p.ax + p.arco * 0.6 - 2, my - 9, 5, 19).fillRect(p.ax + p.arco * 0.6 - 9, my - 2, 19, 5);
          break;
        case 'nota':
          var wy = y + Math.sin(u * 12) * 4;
          g.fillStyle(0x00e676, al).fillCircle(x, wy, 6).fillRect(x + 4, wy - 20, 3, 20).fillRect(x + 4, wy - 20, 11, 5);
          break;
        case 'balao':
          g.fillStyle(0xf2f0ff, al).fillRoundedRect(x - 18, y - 12, 36, 23, 7);
          g.fillTriangle(x - 9, y + 9, x - 2, y + 9, x - 13, y + 18);
          g.fillStyle(0x14141c, al).fillRect(x - 11, y - 2, 4, 4).fillRect(x - 2, y - 2, 4, 4).fillRect(x + 7, y - 2, 4, 4);
          break;
        case 'papel':
          var an = p.gira + u * 9, c = Math.cos(an), sn = Math.sin(an);
          g.fillStyle(0xe8e8f0, al);
          g.fillPoints([{ x: x + (-9 * c - -11 * sn), y: y + (-9 * sn + -11 * c) }, { x: x + (9 * c - -11 * sn), y: y + (9 * sn + -11 * c) },
            { x: x + (9 * c - 11 * sn), y: y + (9 * sn + 11 * c) }, { x: x + (-9 * c - 11 * sn), y: y + (-9 * sn + 11 * c) }], true);
          g.lineStyle(2, 0x6a6c78, al).lineBetween(x - 6 * c, y - 6 * sn, x + 6 * c, y + 6 * sn);
          break;
        case 'grito':
          g.lineStyle(4, p.cor || 0xe8362c, 1 - u).strokeCircle(p.ax, p.ay, 12 + u * 70);
          break;
        case 'sombra':
          g.fillStyle(0x3a0008, Math.sin(u * Math.PI) * 0.45).fillRect(0, 0, GW, GH);
          break;
        case 'confete':
          var cx2 = p.ax + p.vx * p.t, cy2 = p.ay + p.vy * p.t + 0.00018 * p.t * p.t;
          g.fillStyle(p.cor, 1 - u).fillRect(cx2, cy2, 7, 5 + Math.abs(Math.sin(p.gira + p.t / 60)) * 6);
          break;
        case 'estrela':
          var ex = p.ax + p.vx * p.t, ey = p.ay + p.vy * p.t;
          g.fillStyle(p.cor, 1 - u).fillRect(ex - 3, ey - 3, 7, 7);
          break;
        case 'escudo':
          // o escudo verde cresce na frente de quem defendeu, e some
          var sc = 2 + u * 0.8, ex2 = p.ax, ey2 = p.ay;
          g.fillStyle(0x00e676, 0.85 * (1 - u)).fillRect(ex2 - 9 * sc, ey2 - 10 * sc, 18 * sc, 12 * sc);
          g.fillTriangle(ex2 - 9 * sc, ey2 + 2 * sc, ex2 + 9 * sc, ey2 + 2 * sc, ex2, ey2 + 12 * sc);
          g.lineStyle(2, 0xffffff, 1 - u).strokeCircle(ex2, ey2, 10 + u * 20);
          break;
      }
    }
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
    this.ficha(g, this.bEle, this.ele.mostra / this.ele.max, this.tremeEle);
    this.ficha(g, this.bVc, this.vc.mostra / this.vc.max, this.tremeVc);
    this.tVcNum.setText(Math.max(0, Math.round(this.vc.mostra)) + '/' + this.vc.max);

    g.fillStyle(0x0b0b12, 0.95).fillRect(DSF.msg.x, DSF.msg.y, DSF.msg.w, DSF.msg.h);
    g.lineStyle(2, 0xf2f0ff, 1).strokeRect(DSF.msg.x + 1, DSF.msg.y + 1, DSF.msg.w - 2, DSF.msg.h - 2);

    var menu = (this.fase === 'menu');
    // a plaquinha do próximo golpe, só enquanto é a sua vez
    var vem = menu && this.proximo && this.ele.pac > 0;
    this.tVem.setText(vem ? 'VEM AÍ: ' + this.proximo.nome : '');
    if (vem) {
      var vw = Math.round(this.tVem.width) + 16;
      g.fillStyle(0x2a0c10, 0.95).fillRect(this.bEle.x, this.yVem, vw, 18);
      g.lineStyle(1, 0xe8362c, 1).strokeRect(this.bEle.x + 0.5, this.yVem + 0.5, vw - 1, 17);
    }
    this.tNervoso.setText(this.nervoso && this.ele.pac > 0 ? 'NERVOSO' : '');
    // com chapa escura atrás: solto, o vermelho sumia no letreiro do vagão
    if (this.tNervoso.text) {
      g.fillStyle(0x2a0c10, 0.95).fillRect(this.tNervoso.x - 5, this.tNervoso.y - 3, Math.round(this.tNervoso.width) + 10, 18);
      g.lineStyle(1, 0xe8362c, 1).strokeRect(this.tNervoso.x - 4.5, this.tNervoso.y - 2.5, Math.round(this.tNervoso.width) + 9, 17);
    }
    // o relógio da vez: amarelo, e vermelho no último terço
    if (menu) {
      var pt = Math.max(0, this.tempo / dsfTempo());
      barra(g, DSF.msg.x + 12, DSF.msg.y + DSF.msg.h - 12, DSF.msg.w - 24, 5, pt,
        pt > 0.33 ? 0xf2c14e : 0xe8362c, 0x1e1e2a);
    }
    var sabe = vem ? DSF_SABE[this.proximo.nome] : null;
    for (var i = 0; i < 4; i++) {
      var c = dsfCelula(i), r = RESPOSTAS[i], mira = menu && i === this.sel;
      g.fillStyle(menu ? (mira ? 0x1b2438 : 0x11141d) : 0x0b0b12, 0.95).fillRect(c.x, c.y, c.w, c.h);
      g.lineStyle(2, mira ? num(r.cor) : 0x2a2a3a, 1).strokeRect(c.x + 1, c.y + 1, c.w - 2, c.h - 2);
      // o quadradinho do tipo: é por ele que se aprende quem ganha de quem
      g.fillStyle(num(r.cor), menu ? 1 : 0.35).fillRect(c.x + 10, c.y + 15, 10, 10);
      // o escudinho: essa resposta corta o golpe que vem (você já descobriu)
      if (sabe === r.tipo) {
        var ex = c.x + c.w - 22, ey = c.y + 12;
        g.fillStyle(0x00e676, 1).fillRect(ex, ey, 12, 10);
        g.fillTriangle(ex, ey + 10, ex + 12, ey + 10, ex + 6, ey + 17);
        g.fillStyle(0x0b0b12, 1).fillRect(ex + 5, ey + 2, 2, 9);
      }
      this.tMenu[i].setColor(menu ? (mira ? r.cor : PAL.branco) : PAL.cinzaEsc);
    }
  }
});
