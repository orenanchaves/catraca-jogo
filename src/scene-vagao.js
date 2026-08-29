/* global Phaser */
/* Catraca — dentro do vagão: banco, equilíbrio, eventos e o dilema do lugar */

/* O comprimento do vagão é uma alternância: porta, baia, porta, baia.
   Antes não era — as portas e as baias da direita moravam na mesma
   faixa de parede e se sobrepunham 40px cada, três vezes. O banco
   ficava bem no meio do vão da porta, e como o corredor parava em
   x=250 dava pra encostar no banco mas nunca na porta. O vagão virava
   uma gaiola com saída pintada na parede.

   Agora cada coisa tem a sua faixa, e as duas paredes usam as mesmas:
   baia de frente pra baia, porta de frente pra janela. */
/* Ritmo da viagem. Antes uma cena de vagão era uma estação e durava
   17s; agora ela é a perna inteira, quinze estações de Itaquera até a
   Sé, então cada trecho precisa ser curto o bastante pra a perna não
   virar uma novela. */
var TEMPO_ENTRE_ESTACOES = 8200;
var TEMPO_PARADO = 4200;

var BARRAS_X = [90, 226];   // as duas barras de apoio do corredor
var ALCANCE_BARRA = 34;     // até onde o braço chega

var PORTA_ALT = 60;
/* Baia, porta, baia, porta, baia. Eram três portas e três baias de 58,
   mas baia de 58 só cabe uma pessoa: pra caber duas ela precisa de 88,
   e três baias de 88 mais três portas não cabem na altura da tela sem
   empurrar a primeira porta pra debaixo da placa de rota, que é onde
   ela ficava meio escondida. Uma porta a menos, e as duas que sobram
   caem no terço e nos dois terços — bem no meio da tela, que é onde a
   mão alcança. */
var PORTAS_Y = [222, 384];             // faixas de porta, na parede direita
var BAIA_FUNDO = 22, BAIA_COMP = 88;   // raso na parede, comprido ao longo dela
var BAIAS_Y = [126, 288, 450];         // faixas de baia, nos vãos entre as portas

/* Quantos lugares cabem numa baia, e onde cada um começa.

   A baia já era desenhada com dois riscos separando três lugares, mas
   só existia um: quem chegava sentava no meio e ocupava o banco
   inteiro, e os outros dois lugares eram pintura. Agora a baia tem 88
   de comprimento (era 58) e dois lugares de verdade, cada um com o seu
   ocupante — o vagão passa de seis assentos pra doze, que é o que a
   folga entre as faixas dava pra pagar sem espremer as portas. */
var LUGARES = [4, 48];                 // topo de cada lugar, a partir do topo da baia
var LUGAR_ALT = 40;
var BAIAS = [
  { x: 28, y: BAIAS_Y[0], dir: 1 }, { x: 28, y: BAIAS_Y[1], dir: 1 }, { x: 28, y: BAIAS_Y[2], dir: 1 },
  { x: 270, y: BAIAS_Y[0], dir: -1 }, { x: 270, y: BAIAS_Y[1], dir: -1 }, { x: 270, y: BAIAS_Y[2], dir: -1 }
];

/* Uma janela: caixilho escuro, vidro, e o brilho de cima onde o túnel
   passa. Serve nas duas paredes. */
function janelaVagao(g, x, y, alt) {
  g.fillStyle(0x0d1119, 1).fillRect(x, y, 22, alt);
  g.fillStyle(0x161d2b, 1).fillRect(x + 2, y + 2, 18, alt - 4);
  g.fillStyle(0xffffff, 0.07).fillRect(x + 2, y + 2, 18, 14);
}

/* está na altura de alguma porta? é o que abre o vestíbulo e o que
   corta a barra de apoio */
function naPorta(y, folga) {
  folga = folga || 0;
  for (var i = 0; i < PORTAS_Y.length; i++) {
    if (y > PORTAS_Y[i] - folga && y < PORTAS_Y[i] + PORTA_ALT + folga) return true;
  }
  return false;
}

/* guarda onde a pessoa está e com que fase ela balança, pra cada uma
   respirar no seu tempo em vez de o vagão inteiro pulsar junto */
function sentaAnimado(a) {
  a.bx = a.sp.x;
  a.by = a.sp.y;
  a.fase = Math.random() * Math.PI * 2;
  a.olhaT = Math.random() * 2000;
  a.proxOlhada = 2200 + Math.random() * 4500;
}

/* ---------- o repertório do rimador ----------
   Ele fecha citando quem está jogando, e é por isso que "ele te citou
   na rima" faz sentido depois: a rima citou mesmo. Nome de papel, não
   pronome — o jogo nunca disse o gênero de ninguém. */
/* Duas linhas, nenhuma passando de 22 caracteres: na largura da tela
   isso é o limite antes de a placa quebrar em três e ir parar em cima
   do aviso de solavanco. */
var VERSOS_RIMADOR = [
  'LICENÇA, SENHORAS\nE SENHORES',
  'NÃO É ESMOLA NÃO,\nÉ TRABALHO NA LINHA',
  null,                                  // aqui entra o verso do personagem
  'GOSTOU, COLABORA.\nNÃO GOSTOU, DESCULPA'
];
var VERSO_DO_JOGADOR = {
  estudante: 'O ESTUDANTE PAGA MEIA\nE CARREGA O MUNDO',
  clt: 'O CLT ACORDA CEDO\nPRA CHEGAR ATRASADO',
  senhor: 'ESSE AÍ NÃO PAGA:\nJÁ PAGOU A VIDA TODA',
  ambulante: 'ESSE AÍ É DA ÁREA,\nRESPEITO ENTRE COLEGA'
};

/* ---------- batalha de rima ----------
   O rimador já entrava, montava a caixinha e mandava quatro versos. O
   que faltava era o outro lado do microfone.

   Quatro pistas, uma pra cada direção, e as sílabas descendo até a
   linha de acerto. Direção é o comando que este jogo já ensina duas
   vezes — no disfarce e no andar — e funciona igual no teclado e no
   manche do celular, que foi o motivo de não usar botão nenhum novo. */
var BATALHA_DIRS = ['left', 'up', 'down', 'right'];
var BATALHA_SETAS = ['◄', '▲', '▼', '►'];
var BATALHA_CORES = [0xe8362c, 0xf2c14e, 0x00e676, 0x0b9fdd];
/* O painel mora abaixo da placa de rota (que vai até y=120) e acima da
   barra de dica. A seta de cada pista fica embaixo da sua caixa de
   acerto, não no meio da pista: no meio ela virava obstáculo visual em
   cima das sílabas caindo. */
var BAT_TOPO = 178, BAT_LINHA = 432, BAT_X0 = 52, BAT_LARG = 54;
function batalhaX(lane) { return BAT_X0 + lane * BAT_LARG + BAT_LARG / 2; }

/* O corredor tem a largura do vão entre as baias e abre até a parede na
   altura de cada porta. É esse vestíbulo que faz descer virar um
   movimento: sem ele dá pra encostar na baia e nunca na porta.

   A abertura não é um degrau, é uma rampa: com corte seco, quem saísse
   da faixa da porta encostado na parede era arrancado 30px de uma vez,
   e parecia teleporte. Assim a pessoa escorrega pra dentro e pra fora
   da boca do vestíbulo. */
var CORREDOR_DIR = 250, VESTIBULO_DIR = 280, RAMPA_VESTIBULO = 20;
function bordaVagao(y) {
  var meia = PORTA_ALT / 2, perto = 9999;
  for (var i = 0; i < PORTAS_Y.length; i++) {
    perto = Math.min(perto, Math.abs(y - (PORTAS_Y[i] + meia)));
  }
  if (perto <= meia) return VESTIBULO_DIR;
  if (perto >= meia + RAMPA_VESTIBULO) return CORREDOR_DIR;
  return VESTIBULO_DIR - (VESTIBULO_DIR - CORREDOR_DIR) * (perto - meia) / RAMPA_VESTIBULO;
}
function limitaVagao(sp) {
  sp.x = Phaser.Math.Clamp(sp.x, 70, bordaVagao(sp.y));
  sp.y = Phaser.Math.Clamp(sp.y, 84, 556);
}

var VagaoScene = new Phaser.Class({
  Extends: Phaser.Scene,
  initialize: function VagaoScene() { Phaser.Scene.call(this, { key: 'Vagao' }); },

  create: function () {
    Ctrl.liga(this);
    HUD_VISIVEL = true; CONTROLES_VISIVEIS = true;
    this.dialog = null;
    this.estado = 'andando';
    this.t = 0;
    this.duracao = TEMPO_ENTRE_ESTACOES;
    this.eventoPendente = false;
    this.dilemaPendente = false;
    this.tEvento = 0; this.tDilema = 0;
    this.falha = null;
    this.sorteouFalha = false;
    this.corrida = null;
    this.disputa = null;
    this.encontro = null;
    this.tPasso = 0;
    this.sentadoEm = null;
    this.nivelSono = 0;
    this.noChao = false;      // estudante
    this.cochilo = 0;         // clt: quanto tempo já está cochilando na barra
    this.pediu = false;       // idoso/gestante: um pedido por estação
    this.vendas = 0;          // ambulante: quantas vendas nesta perna
    this.fiscal = 0;          // ...e o quanto o fiscal já reparou
    this.sabeARota = false;   // turista: pagou alguém pra se situar
    this.disfarce = null;
    this.solavanco = { fase: 'off', t: 0, proximo: 2600 };
    this.gente = [];
    this.portas = PORTAS_Y;
    this.npcExtra = [];

    this.desenhaCenario();
    this.montaBancos();
    veuDaHora(this, 90);

    this.pl = new Ator(this, 160, 500, 'ch_' + GameState.charKey);
    this.pl.sp.setDepth(60);
    this.pl.dir = 'up';

    // a caixinha fica no chão à frente dele: desenha por cima de quem a
    // largou, por baixo de quem está jogando
    this.gCaixa = this.add.graphics().setDepth(57);
    this.rimador = null;
    this.encena = false;

    this.gUI = this.add.graphics().setDepth(500);
    /* A placa de rota subiu de 62 pra 48, encostada no HUD: com a baia
       de cima começando em 116, os catorze pixels que ela devolveu são
       a diferença entre ver e não ver quem está sentado no primeiro
       lugar. */
    this.rota = new Plaqueta(this, GW / 2, 56, { cor: PAL.amarelo, depth: 505 });
    // a placa de rota e a faixa de dica ficam fora do alcance do sono, e
    // a fresta que sobra é justo a do aviso do meio da tela
    areaDeJogo(126, GH - 40, 258);
    this.rima = new Plaqueta(this, GW / 2, 126, { cor: PAL.amarelo, filete: 0xe8362c, depth: 510 });
    this.dica = new FaixaDica(this, 520);
    this.centro = new Plaqueta(this, GW / 2, 232, { cor: PAL.branco, depth: 522 });
    this.tSeta = txtC(this, GW / 2, 280, '', PAL.amarelo, 24).setDepth(520);
    // o nome de quem te aborda, flutuando em cima da cabeça dele
    this.tagEncontro = txtC(this, 0, 0, '', PAL.amarelo, 8).setDepth(530).setVisible(false);
    // uma seta por pista, cada uma debaixo da sua caixa de acerto
    this.setasBatalha = [];
    for (var q = 0; q < 4; q++) {
      this.setasBatalha.push(
        txtC(this, batalhaX(q), BAT_LINHA + 22, BATALHA_SETAS[q], PAL.branco, 16)
          .setDepth(521).setVisible(false));
    }
    this.batalha = null;

    this.sorteiaRitmo();

    var self = this;
    fala(this, GameState.hora() + '. Próxima:\n' + GameState.proximaEstacaoNome(), []);
    this.time.delayedCall(1300, function () { if (self.dialog) self.dialog.fecha(); });
  },

  /* ---------- cenário ---------- */
  desenhaCenario: function () {
    var g = this.add.graphics().setDepth(0);
    var l = GameState.linhaAtual();
    g.fillStyle(num(PAL.bg), 1).fillRect(0, 0, GW, GH);

    /* O vagão de verdade é quase todo espaço em pé: os bancos são baias
       curtas e azuis, encostadas na parede, com vão grande entre uma e
       outra. Piso azul de borracha canelada, painel claro na parede na
       altura do ombro e poste vertical na ponta de cada baia. */

    // piso
    g.fillStyle(0x2b3648, 1).fillRect(28, HUD_H, 264, GH - HUD_H);
    g.fillStyle(0x33405a, 1);
    for (var y = HUD_H; y < GH; y += 8) g.fillRect(66, y, 188, 4);
    pontilhado(g, 66, HUD_H, 188, GH, 0x000000, 0.1, 6);

    // paredes laterais com volume
    g.fillStyle(num(PAL.metalSom), 1).fillRect(0, HUD_H, 28, GH - HUD_H);
    g.fillStyle(0x646a80, 1).fillRect(4, HUD_H, 24, GH - HUD_H);
    g.fillStyle(num(PAL.metalSom), 1).fillRect(292, HUD_H, 28, GH - HUD_H);
    g.fillStyle(0x646a80, 1).fillRect(292, HUD_H, 24, GH - HUD_H);
    g.fillStyle(l.num, 1).fillRect(0, HUD_H, 5, GH - HUD_H);
    g.fillStyle(l.num, 1).fillRect(315, HUD_H, 5, GH - HUD_H);

    /* Janelas nas duas faixas: a parede esquerda não tem porta nenhuma,
       então é janela de ponta a ponta; a direita só tem janela onde não
       tem porta, porque lá o vidro é a própria folha da porta. */
    var d, w;
    for (d = 0; d < PORTAS_Y.length; d++) janelaVagao(g, 4, PORTAS_Y[d], PORTA_ALT);
    for (w = 0; w < BAIAS_Y.length; w++) {
      janelaVagao(g, 4, BAIAS_Y[w], BAIA_COMP);
      janelaVagao(g, 294, BAIAS_Y[w], BAIA_COMP);
    }

    // painel claro da parede, atrás e acima dos bancos
    g.fillStyle(0x767f96, 1).fillRect(28, HUD_H, 22, GH - HUD_H);
    g.fillStyle(0x868fa6, 1).fillRect(28, HUD_H, 22, 2);
    g.fillStyle(0x4e5468, 1).fillRect(48, HUD_H, 2, GH - HUD_H);
    // do lado direito o painel abre em cada porta, senão tapa o vestíbulo
    for (w = 0; w < BAIAS_Y.length; w++) {
      g.fillStyle(0x767f96, 1).fillRect(270, BAIAS_Y[w] - 8, 22, BAIA_COMP + 16);
      g.fillStyle(0x868fa6, 1).fillRect(270, BAIAS_Y[w] - 8, 22, 2);
      g.fillStyle(0x4e5468, 1).fillRect(270, BAIAS_Y[w] - 8, 2, BAIA_COMP + 16);
    }

    /* Vestíbulo: o pedaço de piso na frente de cada porta. É ele que
       diz, sem texto, onde se desce — e é o único lugar do vagão onde
       dá pra chegar até a parede. */
    for (d = 0; d < PORTAS_Y.length; d++) {
      var dy = PORTAS_Y[d];
      g.fillStyle(0x3a485f, 1).fillRect(250, dy - 6, 42, PORTA_ALT + 12);
      g.fillStyle(0x2b3648, 1).fillRect(250, dy - 6, 2, PORTA_ALT + 12);
      g.fillStyle(0x46566f, 1).fillRect(252, dy - 6, 40, 2);
      g.fillStyle(0x2b3648, 1).fillRect(252, dy + PORTA_ALT + 4, 40, 2);
      // faixa tátil rente à porta
      g.fillStyle(num(PAL.amarelo), 0.4).fillRect(285, dy + 3, 4, PORTA_ALT - 6);
    }

    /* baias de banco: encosto colado na parede, assento pra fora, e o
       vão entre uma e outra sendo maior que a própria baia */
    for (var b = 0; b < BAIAS.length; b++) {
      var bx = BAIAS[b].x, by = BAIAS[b].y, ld = BAIAS[b].dir;
      var enc = ld > 0 ? bx : bx + BAIA_FUNDO - 6;          // encosto, na parede
      var ass = ld > 0 ? bx + 6 : bx;                        // assento, pro corredor
      g.fillStyle(0x000000, 0.3).fillRect(bx, by + BAIA_COMP, BAIA_FUNDO, 3);
      g.fillStyle(0x1c5288, 1).fillRect(enc, by - 3, 6, BAIA_COMP + 3);
      g.fillStyle(0x2f7fc4, 1).fillRect(ass, by, BAIA_FUNDO - 6, BAIA_COMP);
      g.fillStyle(0x63aee8, 1).fillRect(ass, by, BAIA_FUNDO - 6, 3);
      g.fillStyle(0x123a63, 1).fillRect(ass, by + BAIA_COMP - 3, BAIA_FUNDO - 6, 3);
      /* um risco por divisa entre lugares, e só. Antes eram dois riscos
         pra três lugares que não existiam: o desenho prometia o que o
         banco não entregava. */
      g.fillStyle(0x1c5288, 0.5);
      for (var v = 1; v < LUGARES.length; v++) {
        g.fillRect(ass, by + LUGARES[v] - 4, BAIA_FUNDO - 6, 1);
      }
      // poste vertical em cada ponta
      for (var e = 0; e < 2; e++) {
        var ex = ld > 0 ? bx + BAIA_FUNDO - 4 : bx;
        var ey = e ? by + BAIA_COMP - 4 : by - 4;
        g.fillStyle(num(PAL.metalSom), 1).fillRect(ex, ey, 4, 8);
        g.fillStyle(num(PAL.metalLuz), 1).fillRect(ex, ey, 2, 8);
      }
    }

    this.gPortas = this.add.graphics().setDepth(2);
    this.pintaPortas(false);

    /* Barras de apoio. Elas saem do cenário e vão pra um gráfico
       próprio, desenhado POR CIMA de todo mundo: a barra vai do chão ao
       teto, e visto de cima ela passa acima das cabeças. Desenhada no
       fundo, dava a impressão de que a pessoa andava por cima da barra
       em vez de por baixo dela.

       A da direita é cortada na altura de cada porta: barra
       atravessando a saída é o que mais fazia o vagão parecer trancado,
       e no vagão de verdade ela também não passa ali. */
    this.gBarras = this.add.graphics().setDepth(70);
    this.pintaBarras();
  },

  pintaBarras: function () {
    var g = this.gBarras; g.clear();
    for (var i = 0; i < 2; i++) {
      var px = BARRAS_X[i];
      for (var by = HUD_H; by < GH; by++) {
        if (i && naPorta(by, 8)) continue;
        g.fillStyle(0x000000, 0.25).fillRect(px + 8, by, 3, 1);   // sombra no chão
        g.fillStyle(num(PAL.metalSom), 1).fillRect(px, by, 8, 1);
        g.fillStyle(num(PAL.metal), 1).fillRect(px, by, 5, 1);
        g.fillStyle(num(PAL.metalLuz), 1).fillRect(px + 1, by, 2, 1);
      }
      // alças penduradas
      g.fillStyle(num(PAL.metalSom), 1);
      for (var ay = 96; ay < GH - 40; ay += 64) {
        if (i && naPorta(ay, 8)) continue;
        g.fillRect(px + (i ? -12 : 8), ay, 12, 3);
        g.fillRect(px + (i ? -12 : 18), ay, 3, 14);
      }
    }

    /* A mão de quem está segurando. Sem isto, "segurar" era só o texto
       na barra de baixo mudando de cor — não havia nada na tela que
       dissesse que aquele boneco está agarrado em alguma coisa. */
    if (this.segurando) {
      var m = this.segurando;
      g.fillStyle(0xf2c14e, 1).fillRect(m.bx - 1, m.y - 3, 11, 6);
      g.fillStyle(0xffe9a8, 1).fillRect(m.bx - 1, m.y - 3, 11, 2);
      g.fillStyle(num(PAL.metalLuz), 1).fillRect(m.bx + 1, m.y - 6, 2, 12);
      // o braço, do ombro até a barra
      g.lineStyle(3, 0xf2c14e, 0.9);
      g.beginPath(); g.moveTo(m.px, m.y + 2); g.lineTo(m.bx + 4, m.y); g.strokePath();
    }
  },

  /* A mão só aparece quando há mão: apertando, com barra ao alcance, e
     de pé. Guardo o ponto do ombro e o ponto da barra pra desenhar o
     braço entre os dois. */
  atualizaMao: function () {
    this.segurando = null;
    if (this.sentadoEm || !Ctrl.act) return;
    var b = this.barraPerto();
    if (b.d > ALCANCE_BARRA) return;
    this.segurando = { px: this.pl.sp.x, bx: b.x - 4, y: this.pl.sp.y - 26 };
  },

  /* Quem é a barra mais perto, e a que distância. É o que decide se dá
     pra segurar e onde a mão vai parar. */
  barraPerto: function () {
    var melhor = null, d = 1e9;
    for (var i = 0; i < BARRAS_X.length; i++) {
      var bx = BARRAS_X[i] + 4;
      if (i && naPorta(this.pl.sp.y, 8)) continue;   // ali a barra não existe
      var dd = Math.abs(this.pl.sp.x - bx);
      if (dd < d) { d = dd; melhor = bx; }
    }
    return { x: melhor, d: d };
  },

  pintaPortas: function (aberto) {
    var g = this.gPortas; g.clear();
    var meia = PORTA_ALT / 2;
    for (var i = 0; i < this.portas.length; i++) {
      var y = this.portas[i];
      if (aberto) {
        // o vão, a plataforma lá fora, e a luz caindo no vestíbulo
        g.fillStyle(0x07070c, 1).fillRect(292, y, 28, PORTA_ALT);
        g.fillStyle(0x3f3f52, 1).fillRect(296, y + 4, 20, PORTA_ALT - 8);
        g.fillStyle(0x00e676, 1).fillRect(289, y, 3, PORTA_ALT);
        g.fillStyle(0x00e676, 0.16).fillRect(250, y, 42, PORTA_ALT);
      } else {
        // duas folhas encostadas, cada uma com o seu vidro
        g.fillStyle(num(PAL.metalSom), 1).fillRect(292, y, 28, PORTA_ALT);
        for (var f = 0; f < 2; f++) {
          var fy = y + 1 + f * meia;
          g.fillStyle(0x767c92, 1).fillRect(293, fy, 26, meia - 2);
          g.fillStyle(num(PAL.metalLuz), 1).fillRect(293, fy, 26, 2);
          g.fillStyle(0x101725, 1).fillRect(297, fy + 6, 18, meia - 14);
          g.fillStyle(0xffffff, 0.06).fillRect(297, fy + 6, 18, 5);
        }
        g.fillStyle(num(PAL.amarelo), 1).fillRect(289, y, 3, PORTA_ALT);
      }
    }
  },

  /* ---------- bancos ---------- */
  montaBancos: function () {
    var dif = GameState.dificuldade();
    this.bancos = [];
    for (var k = 0; k < BAIAS.length; k++) {
      for (var l = 0; l < LUGARES.length; l++) {
        this.bancos.push({
          x: BAIAS[k].x + BAIA_FUNDO / 2,
          y: BAIAS[k].y + LUGARES[l],
          npc: null
        });
      }
    }
    // de madrugada o vagão está vazio e sentar é fácil; no pico, esquece
    var lot = GameState.lotacao();
    var total = this.bancos.length;
    var livres = Phaser.Math.Clamp(Math.round(total * (1 - lot * 0.88) - (dif - 1) * 1.2), 0, total - 1);
    var idx = [];
    for (var n = 0; n < total; n++) idx.push(n);
    Phaser.Utils.Array.Shuffle(idx);
    for (var i = 0; i < idx.length - livres; i++) {
      var b = this.bancos[idx[i]];
      var a = new Ator(this, b.x, b.y + 24, sorteiaPax());
      a.dir = b.x < 160 ? 'sentadoR' : 'sentadoL';
      a.anima(0, false);
      a.sp.setDepth(30);
      a.fixo = true;                  // sentado não é empurrado
      sentaAnimado(a);
      b.npc = a;
      this.gente.push(a);
    }
    var emPe = Phaser.Math.Clamp(Math.round(8 * lot), 0, 8);
    for (var j = 0; j < emPe; j++) {
      var p = new Ator(this, 82 + Math.random() * 156,
        120 + Math.random() * 400, sorteiaPax());
      p.dir = Math.random() < 0.5 ? 'left' : 'right';
      p.anima(0, false); p.sp.setDepth(35);
      sentaAnimado(p);                // em pé também olha em volta
      this.npcExtra.push(p);
      this.gente.push(p);
    }
  },

  /* ---------- os poderes ----------
     Cada personagem tem um verbo que só ele tem, e todos eles entram
     por aqui: a dica do rodapé pergunta primeiro o que este personagem
     sabe fazer, e só depois cai nas ações que valem pra todo mundo. */

  /* ESTUDANTE — senta no chão. Não precisa de banco, mas precisa de
     espaço: no pico não tem chão sobrando, e sentar no chão custa
     carisma toda vez (o vagão inteiro olha). */
  podeSentarNoChao: function () {
    if (!temPoder('chao') || this.sentadoEm || this.noChao) return false;
    if (GameState.lotacao() > 0.62) return false;
    return this.pl.sp.x > 96 && this.pl.sp.x < 240 && !naPorta(this.pl.sp.y, -8);
  },

  sentaNoChao: function () {
    this.noChao = true;
    GameState.addCarisma(-3);
    GameState.sentado = true;
    this.pl.dir = this.pl.sp.x < 160 ? 'sentadoR' : 'sentadoL';
    this.pl.anima(0, false);
    sentaAnimado(this.pl);
    sfx('caixa');
    this.flash('SENTOU NO CHÃO.\nNINGUÉM ACHOU BONITO.');
  },

  levantaDoChao: function () {
    this.noChao = false;
    GameState.sentado = false;
    this.pl.dir = 'down';
  },

  /* CLT — cochila em pé, segurando a barra. Descansa de graça, e o
     preço é a rota: de olho fechado você não vê a estação passar. */
  atualizaCochilo: function (dt) {
    if (!temPoder('cochilo') || this.sentadoEm) { this.cochilo = 0; return; }
    // com teto: sem ele o contador cresce a viagem inteira e soltar a
    // barra levaria segundos pra acordar
    if (this.segurando && !this.andandoAgora) this.cochilo = Math.min(1900, this.cochilo + dt);
    else this.cochilo = Math.max(0, this.cochilo - dt * 3);
  },

  cochilando: function () { return this.cochilo > 1100; },

  /* IDOSO e GESTANTE — pedem o lugar. Pra ela ninguém recusa; pra ele,
     um em cada seis finge que dorme, e isso custa a vergonha. */
  bancoOcupadoPerto: function () {
    if (!temPoder('pedeLugar') || this.sentadoEm || this.pediu) return null;
    var melhor = null, dist = 1e9;
    for (var i = 0; i < this.bancos.length; i++) {
      var b = this.bancos[i];
      if (!b.npc || b.npc === 'player') continue;
      var dx = Math.abs(this.pl.sp.x - b.x), dy = Math.abs(this.pl.sp.y - (b.y + 24));
      if (dx >= 54 || dy >= 30) continue;
      var d = dx + dy * 2;
      if (d < dist) { dist = d; melhor = b; }
    }
    return melhor;
  },

  pedeOLugar: function (b) {
    this.pediu = true;
    if (!GameState.char.nuncaRecusam && Math.random() < 0.17) {
      GameState.addCarisma(-4);
      sfx('nao');
      this.flash('ELE FINGIU QUE DORMIU.');
      return;
    }
    var a = b.npc, k = this.gente.indexOf(a);
    if (k >= 0) this.gente.splice(k, 1);
    a.destroy();
    b.npc = null;
    GameState.addCarisma(2);
    this.senta(b);
    this.flash('CEDERAM O LUGAR.');
  },

  /* AMBULANTE — a única fonte de renda do jogo. Cada venda paga pouco e
     chama mais o fiscal; a quinta é quase certeza de encrenca. */
  podeVender: function () {
    return temPoder('vende') && !this.sentadoEm && !this.noChao &&
      this.estado === 'andando' && this.pl.sp.x > 90 && this.pl.sp.x < 240;
  },

  vende: function () {
    var lot = GameState.lotacao();
    this.vendas++;
    this.fiscal += 16 + this.vendas * 5;
    GameState.addDescanso(-3);

    if (Math.random() > 0.35 + lot * 0.5) {
      GameState.addCarisma(-2);
      sfx('nao');
      this.flash('NINGUÉM QUIS.');
    } else {
      var ganho = 1 + Math.round(Math.random() * 3);
      GameState.ganhar(ganho);
      GameState.addCarisma(2);
      sfx('moeda');
      this.flash('VENDEU. +R$ ' + ganho.toFixed(2).replace('.', ','));
    }

    if (this.fiscal >= 100) {
      this.fiscal = 0;
      var multa = Math.min(GameState.dinheiro, 12);
      GameState.gastar(multa);
      perdeVida(this, this.pl.sp);
      sfx('apito');
      fala(this, '"Vendendo no vagão de novo?"\nO fiscal recolheu a mercadoria.\nR$ ' +
        multa.toFixed(2).replace('.', ',') + ' e um coração.', []);
      var eu = this;
      this.time.delayedCall(2200, function () { if (eu.dialog) eu.dialog.fecha(); });
    }
  },

  /* TURISTA — não sabe a linha. A rota só aparece quando já está
     colada, e o jeito de enxergar longe é pagar alguém pra explicar. */
  passageiroPerto: function () {
    if (!temPoder('perdido') || this.sabeARota) return null;
    for (var i = 0; i < this.npcExtra.length; i++) {
      var a = this.npcExtra[i];
      if (!a.sp || !a.sp.active) continue;
      if (Math.hypot(this.pl.sp.x - a.sp.x, this.pl.sp.y - a.sp.y) < 44) return a;
    }
    return null;
  },

  perguntaARota: function () {
    if (GameState.dinheiro < 2) { sfx('nao'); this.flash('SEM TROCO PRA PERGUNTAR.'); return; }
    GameState.gastar(2);
    GameState.addCarisma(3);
    this.sabeARota = true;
    sfx('moeda');
    this.flash('ELE EXPLICOU O CAMINHO.');
  },

  temLugarVago: function () {
    for (var i = 0; i < this.bancos.length; i++) if (!this.bancos[i].npc) return true;
    return false;
  },

  comSono: function () { return GameState.descanso / GameState.char.descansoMax <= LIMIAR_SONO; },

  /* O sono não pode chegar de surpresa: até aqui o descanso zerava e a
     tela de fim de jogo dizia que você tinha dormido — a primeira e
     única notícia. Agora ele avisa ao cruzar cada marca, e as
     pálpebras do HUD vão fechando junto. */
  atualizaSono: function () {
    var p = GameState.descanso / GameState.char.descansoMax;
    var nivel = p <= 0.14 ? 2 : (p <= LIMIAR_SONO ? 1 : 0);
    if (nivel > this.nivelSono) {
      if (nivel === 2) { sfx('nao'); this.flash('VOCÊ VAI DORMIR!\nSENTE AGORA'); }
      else { sfx('empurra'); this.flash('BATEU O SONO\nSENTE NUM LUGAR VERDE'); }
    }
    this.nivelSono = nivel;
  },

  bancoLivrePerto: function () {
    var melhor = null, dist = 1e9;
    for (var i = 0; i < this.bancos.length; i++) {
      var b = this.bancos[i];
      if (b.npc) continue;
      var dx = Math.abs(this.pl.sp.x - b.x), dy = Math.abs(this.pl.sp.y - (b.y + 24));
      if (dx >= 54 || dy >= 30) continue;
      // dois lugares na mesma baia ficam a 44 de distância: pegar o
      // primeiro da lista sentava sempre no de cima, mesmo com o
      // jogador colado no de baixo
      var d = dx + dy * 2;
      if (d < dist) { dist = d; melhor = b; }
    }
    return melhor;
  },

  senta: function (b) {
    this.sentadoEm = b;
    b.npc = 'player';
    this.pl.pos(b.x, b.y + 24);
    sentaAnimado(this.pl);
    this.pl.dir = b.x < 160 ? 'sentadoR' : 'sentadoL';
    this.pl.anima(0, false);
    GameState.sentado = true;
    sfx('ok');
    // a primeira vez que senta é quando dá pra ensinar pra que serve
    if (this.comSono()) this.flash('SENTOU — O SONO PASSA ▲');
  },

  levanta: function () {
    if (!this.sentadoEm) return;
    this.sentadoEm.npc = null;
    this.pl.pos(this.sentadoEm.x < 160 ? 84 : 236, this.sentadoEm.y + 24);
    this.sentadoEm = null;
    GameState.sentado = false;
  },

  /* ---------- solavanco / segurar na barra ---------- */
  atualizaSolavanco: function (dt) {
    if (this.sentadoEm || this.estado !== 'andando') { this.solavanco.fase = 'off'; return; }
    var s = this.solavanco, dif = GameState.dificuldade();
    s.t += dt;
    if (s.fase === 'off') {
      if (s.t > s.proximo) {
        s.fase = 'aviso'; s.t = 0;
        s.dur = Math.max(500, 1100 - dif * 70);
        sfx('empurra');
      }
    } else if (s.fase === 'aviso') {
      this.cameras.main.shake(60, 0.0015);
      if (s.t > s.dur) {
        s.fase = 'off'; s.t = 0;
        s.proximo = 2200 + Math.random() * 2600 - dif * 200;
        /* Segurar deixou de ser só apertar: tem que ter barra ao
           alcance do braço. Antes dava pra "segurar" no meio do
           corredor, agarrado no ar. */
        if (Ctrl.act && this.barraPerto().d <= ALCANCE_BARRA) {
          sfx('catraca');
        } else {
          GameState.addCarisma(-3);
          GameState.addDescanso(-3);
          this.cameras.main.shake(320, 0.008);
          sfx('nao');
          this.flash('VOCÊ TROMBOU EM ALGUÉM');
        }
      }
    }
  },

  /* Vagão andando não tem ninguém parado de verdade: quem está sentado
     balança junto com o trem e olha em volta de vez em quando. Sem isso
     o banco vira um móvel com gente pintada em cima.

     Só quem está sentado balança de posição — quem está em pé é
     empurrado pelos outros, e mexer no x deles brigaria com a física. */
  animaGente: function (dt) {
    this.tBalanco = (this.tBalanco || 0) + dt;
    var andando = (this.estado === 'andando');
    var amp = andando ? 1.2 : 0.35;
    var i, a;

    for (i = 0; i < this.bancos.length; i++) {
      a = this.bancos[i].npc;
      if (!a || a === 'player' || !a.sp || !a.sp.active) continue;
      a.sp.x = a.bx + Math.sin(this.tBalanco / 520 + a.fase) * amp;
      a.sp.y = a.by + Math.sin(this.tBalanco / 880 + a.fase * 1.7) * amp * 0.5;
      this.olhaEmVolta(a, dt);
    }
    for (i = 0; i < this.npcExtra.length; i++) this.olhaEmVolta(this.npcExtra[i], dt);
    this.abremCaminho(dt);

    // o jogador sentado balança junto
    if (this.sentadoEm && this.pl.bx !== undefined) {
      this.pl.sp.x = this.pl.bx + Math.sin(this.tBalanco / 520 + this.pl.fase) * amp;
      this.pl.sp.y = this.pl.by + Math.sin(this.tBalanco / 880 + this.pl.fase * 1.7) * amp * 0.5;
    }
  },

  /* GESTANTE — a multidão abre caminho. Ninguém empurra grávida, e no
     vagão de verdade as pessoas se encolhem quando ela passa. É o
     contrário do resto do elenco, que tem que abrir espaço no braço:
     ela atravessa o pico andando, e paga por isso cansando em dobro. */
  abremCaminho: function (dt) {
    if (!GameState.char.abremCaminho || this.sentadoEm) return;
    var px = this.pl.sp.x, py = this.pl.sp.y;
    for (var i = 0; i < this.npcExtra.length; i++) {
      var a = this.npcExtra[i];
      if (!a.sp || !a.sp.active || a.fixo) continue;
      var dx = a.sp.x - px, dy = a.sp.y - py;
      var d = Math.hypot(dx, dy);
      if (d > 46 || d < 0.5) continue;
      var vel = (52 * (1 - d / 46)) * dt / 1000;
      a.sp.x += (dx / d) * vel;
      a.sp.y += (dy / d) * vel;
      limitaVagao(a.sp);
      a.setDir(dx, dy);
      a.anima(dt, true);
    }
  },

  /* Quem está em pé olha em volta virando o corpo. Quem está sentado
     não: sentado tem pose própria, e trocar de direção levantaria a
     pessoa do banco. A vida de quem senta vem do balanço do trem. */
  olhaEmVolta: function (a, dt) {
    if (!a || !a.sp || !a.sp.active) return;
    a.olhaT += dt;
    if (a.olhaT > a.proxOlhada && String(a.dir).indexOf('sentado') !== 0) {
      a.olhaT = 0;
      a.proxOlhada = 2200 + Math.random() * 4500;
      var lados = (a.sp.x < 160) ? ['right', 'down', 'up'] : ['left', 'down', 'up'];
      a.dir = lados[Math.floor(Math.random() * lados.length)];
    }
    a.anima(dt, false);
  },

  /* ---------- o rimador ----------
     Antes ele era uma linha de diálogo: "O rimador começa." Só que o
     rimador do metrô tem um ritual, e o ritual é metade da graça — ele
     atravessa o corredor, escolhe o lugar, agacha, põe a caixinha no
     chão, liga, e só então abre a boca. Pular isso é contar a piada
     sem a pausa.

     E nada disso é caixa de diálogo: a cena continua rodando enquanto
     ele monta o barraco, então dá pra andar, sentar ou sair de perto
     antes de ele terminar. A escolha só aparece depois da última rima,
     que é quando a pessoa já decidiu se vai fingir que dorme. */
  comecaRimador: function () {
    /* um rimador de cada vez: o que está indo embora ainda é o
       this.rimador, e montar outro por cima deixa o primeiro plantado
       no vagão pro resto da viagem */
    if (this.rimador || this.encena) return;
    this.encena = true;
    var lado = (this.pl.sp.x < 160) ? 1 : -1;      // arma do lado oposto ao seu
    var x = 160 + lado * 24;
    var a = new Ator(this, x, 92, 'np_rimador');
    a.dir = 'down';
    a.sp.setDepth(56);
    a.fixo = true;                                  // ninguém empurra quem trabalha
    this.gente.push(a);
    this.rimador = {
      a: a, lado: lado, alvo: 296, fase: 'entra', t: 0,
      verso: -1, batida: 0, caixa: false, caixaX: x - lado * 26, caixaY: 302
    };
    sfx('porta');
  },

  animaRimador: function (dt) {
    var r = this.rimador;
    if (!r) return;
    r.t += dt;
    var a = r.a;

    if (r.fase === 'entra') {
      a.sp.y = Math.min(r.alvo, a.sp.y + 0.075 * dt);
      a.anima(dt, true);
      if (a.sp.y >= r.alvo) { r.fase = 'abaixa'; r.t = 0; }

    } else if (r.fase === 'abaixa') {
      // vira pro lado da caixa e dobra o joelho antes de largar
      a.dir = r.lado > 0 ? 'left' : 'right';
      a.sp.y = r.alvo + Math.min(3, r.t / 130);
      a.anima(dt, false);
      if (r.t > 440) {
        r.fase = 'liga'; r.t = 0; r.caixa = true;
        a.sp.y = r.alvo;
        sfx('caixa');
      }

    } else if (r.fase === 'liga') {
      a.anima(dt, false);
      if (r.t > 520) { r.fase = 'rima'; r.t = 99999; a.dir = 'down'; }

    } else if (r.fase === 'rima') {
      r.batida += dt;
      // rebolado no ritmo: sobe e desce no compasso da caixinha
      a.sp.y = r.alvo - Math.abs(Math.sin(r.batida / 240)) * 2;
      a.anima(dt, true);
      if (r.t > 1500) {
        r.t = 0; r.verso++;
        if (r.verso >= VERSOS_RIMADOR.length) { this.fechaRimador(); return; }
        this.rima.setText(VERSOS_RIMADOR[r.verso] || VERSO_DO_JOGADOR[GameState.charKey]);
        sfx('batida');
      }

    } else if (r.fase === 'sai') {
      a.sp.y += 0.08 * dt;
      a.dir = 'down';
      a.anima(dt, true);
      if (a.sp.y > GH + 60) {
        var i = this.gente.indexOf(a);
        if (i >= 0) this.gente.splice(i, 1);
        a.destroy();
        this.rimador = null;
      }
    }
  },

  /* a caixinha no chão: corpo, dois alto-falantes, o LED e as ondas,
     que só saem enquanto ele está rimando */
  pintaCaixinha: function () {
    var g = this.gCaixa; g.clear();
    var r = this.rimador;
    if (!r || !r.caixa) return;
    var x = r.caixaX, y = r.caixaY;
    var tocando = (r.fase === 'rima' || r.fase === 'espera');

    g.fillStyle(0x000000, 0.35).fillEllipse(x, y + 1, 24, 7);
    g.fillStyle(0x3a3a4e, 1).fillRect(x - 5, y - 14, 10, 2);     // alça
    g.fillStyle(0x14141c, 1).fillRect(x - 10, y - 12, 20, 12);   // corpo
    g.fillStyle(0x2e2e40, 1).fillRect(x - 10, y - 12, 20, 2);
    g.fillStyle(0x08080e, 1).fillRect(x - 10, y - 2, 20, 2);
    for (var i = 0; i < 2; i++) {
      var cx = x - 5 + i * 10;
      g.fillStyle(0x08080e, 1).fillCircle(cx, y - 6, 3);
      g.fillStyle(tocando ? 0x454560 : 0x22222e, 1).fillCircle(cx, y - 6, 2);
    }
    g.fillStyle(tocando ? 0xe8362c : 0x3a1a18, 1).fillRect(x - 1, y - 10, 2, 2);
    if (!tocando) return;

    var p = (Math.sin(r.batida / 240) + 1) / 2;
    for (var k = 1; k <= 2; k++) {
      g.lineStyle(1, 0xf2c14e, (0.34 - k * 0.09) + 0.18 * p);
      var raio = 13 + k * 6 + p * 2;
      g.beginPath(); g.arc(x, y - 6, raio, -0.85, 0.85); g.strokePath();
      g.beginPath(); g.arc(x, y - 6, raio, Math.PI - 0.85, Math.PI + 0.85); g.strokePath();
    }
  },

  /* a escolha só entra depois da última rima */
  fechaRimador: function () {
    var self = this;
    this.rimador.fase = 'espera';
    this.rima.setText('');
    fala(this, 'Ele encerra e passa o chapéu.', [
      {
        label: 'Dar uma moeda (R$ 1,00)', cb: function () {
          if (GameState.dinheiro < 1) { sfx('nao'); self.flash('Nem moeda você tem.'); return; }
          GameState.gastar(1); GameState.addCarisma(6); GameState.stats.causos++;
          sfx('moeda'); self.flash('Ele agradeceu pelo nome.');
          self.saiRimador();
        }
      },
      {
        label: 'Mandar uma rima', cb: function () {
          self.rima.setText('');
          self.comecaBatalha();
        }
      },
      {
        label: 'Fingir que dorme', cb: function () {
          GameState.addCarisma(-4); GameState.stats.causos++;
          self.flash('Ele rimou com a sua cara.');
          self.saiRimador();
        }
      }
    ], { tempo: 9, aoExpirar: function () { GameState.addCarisma(-1); self.saiRimador(); } });
  },

  /* pega a caixinha de volta e segue pro próximo vagão */
  saiRimador: function () {
    this.encena = false;
    if (!this.rimador) return;
    this.rimador.caixa = false;
    this.rimador.fase = 'sai';
    sfx('caixa');
  },

  flash: function (msg) {
    // cena parada no meio de um aviso: o objeto ainda existe, mas o
    // texto dele já foi destruído junto com a cena
    if (!this.centro || !this.scene.isActive()) return;
    this.centro.setText(msg);
    var self = this;
    this.time.delayedCall(900, function () { if (self.centro) self.centro.setText(''); });
  },

  /* ---------- eventos de vagão ---------- */
  sorteiaEvento: function () {
    var self = this;
    var baralho = [
      function () {
        fala(self, '"Olha o chocolate, dois real,\ndois real o chocolate."', [
          {
            label: 'Comprar (R$ 2,00)', cb: function () {
              if (GameState.dinheiro < 2) { sfx('nao'); self.flash('Sem troco.'); return; }
              GameState.gastar(2); GameState.addCarisma(4); GameState.addDescanso(2);
              GameState.stats.causos++; sfx('moeda'); self.flash('O chocolate salva.');
            }
          },
          { label: 'Fazer que não ouviu', cb: function () { GameState.addCarisma(-2); GameState.stats.causos++; } }
        ]);
      },
      function () { self.comecaRimador(); },
      function () {
        fala(self, 'Alguém pede ajuda no corredor.', [
          {
            label: 'Ajudar (R$ 2,00)', cb: function () {
              if (GameState.dinheiro < 2) { sfx('nao'); self.flash('Você não tem.'); return; }
              GameState.gastar(2); GameState.addCarisma(7); GameState.stats.causos++; sfx('moeda');
            }
          },
          { label: 'Olhar o celular', cb: function () { GameState.addCarisma(-5); GameState.stats.causos++; } }
        ]);
      },
      function () {
        fala(self, 'O guardinha entra no vagão e passa\ndevagar olhando todo mundo.', [
          {
            label: 'Ficar quieto', cb: function () {
              if (GameState.charKey === 'ambulante' && Math.random() < 0.4) {
                GameState.gastar(10); GameState.addCarisma(-5);
                self.flash('Te viu vendendo. R$ 10 de multa.');
              } else { self.flash('Passou reto.'); }
              GameState.stats.causos++;
            }
          }
        ]);
      },
      function () {
        fala(self, 'O ar-condicionado do vagão\nparou de funcionar.', [
          {
            label: 'Aguentar', cb: function () {
              GameState.addDescanso(-5); GameState.stats.causos++;
              self.flash('Calor de rachar.');
            }
          }
        ]);
      }
    ];
    baralho[Math.floor(Math.random() * baralho.length)]();
  },

  /* A linha envelhece junto com a corrida. A multidão satura — o vagão
     só cabe tanta gente, e a partir do quarto dia ela para de piorar.
     A falha não satura: quanto mais fundo na corrida, mais o trem para
     entre estações, e mais tempo ele fica parado. Como a derrota agora
     é chegar atrasado, é isso que aperta pra sempre. */
  atualizaFalha: function (dt) {
    var dif = GameState.dificuldade();
    if (this.falha) {
      this.falha.t += dt;
      if (this.falha.t > this.falha.dur) {
        this.falha = null;
        this.centro.setText('');
        sfx('trem');
      } else {
        this.centro.setCor(PAL.vermelho).setText('TREM PARADO\nFALHA NO SINAL');
      }
      return;
    }
    if (this.sorteouFalha) return;
    this.sorteouFalha = true;
    if (Math.random() < Math.min(0.42, 0.05 * dif)) {
      var perde = Math.round(2 + dif * 1.4);
      this.falha = { t: 0, dur: 1600 + dif * 260 };
      GameState.passaTempo(perde);
      GameState.addDescanso(-2);
      sfx('erro');
    }
  },

  /* Em cada parada o vagão troca de gente. Sem isso a perna inteira —
     quinze estações — seria a mesma multidão congelada, e o vagão
     viraria um cenário pintado. Quem está em pé desce e sobe conforme a
     lotação da hora; banco que vaga pode ser ocupado, e é assim que
     aparece a chance de sentar no meio do caminho. */
  trocaPassageiros: function () {
    var lot = GameState.lotacao(), i, a, vagou = 0;
    for (i = 0; i < this.bancos.length; i++) this.bancos[i].vagou = false;

    // desce quem estava em pé
    var saem = Math.min(this.npcExtra.length, Math.floor(Math.random() * 3));
    for (i = 0; i < saem; i++) {
      a = this.npcExtra.pop();
      var k = this.gente.indexOf(a);
      if (k >= 0) this.gente.splice(k, 1);
      a.destroy();
    }
    // e alguns sentados também descem
    for (i = 0; i < this.bancos.length; i++) {
      var b = this.bancos[i];
      if (!b.npc || b.npc === 'player' || Math.random() > 0.18) continue;
      var j = this.gente.indexOf(b.npc);
      if (j >= 0) this.gente.splice(j, 1);
      b.npc.destroy();
      b.npc = null;
      b.vagou = true; vagou++;
    }

    // sobe gente nova, na medida da hora
    var querEmPe = Phaser.Math.Clamp(Math.round(8 * lot), 0, 8);
    var entram = Math.min(3, Math.max(0, querEmPe - this.npcExtra.length));
    for (i = 0; i < entram; i++) {
      var p = new Ator(this, 82 + Math.random() * 156, 120 + Math.random() * 400, sorteiaPax());
      p.dir = Math.random() < 0.5 ? 'left' : 'right';
      p.anima(0, false); p.sp.setDepth(35);
      sentaAnimado(p);
      this.npcExtra.push(p);
      this.gente.push(p);
    }
    // e quem entra no pico não fica de pé se tem banco vago
    for (i = 0; i < this.bancos.length; i++) {
      var v = this.bancos[i];
      /* quem entra não senta no banco que acabou de vagar: no pico esse
         banco era retomado no mesmo quadro em que abria, e a única
         forma de sentar sumia antes de aparecer. O lugar fica seu até
         a próxima estação — depois disso, alguém senta. */
      if (v.npc || v.vagou || Math.random() > lot * 0.7) continue;
      var n = new Ator(this, v.x, v.y + 24, sorteiaPax());
      n.dir = v.x < 160 ? 'sentadoR' : 'sentadoL';
      n.anima(0, false); n.sp.setDepth(30); n.fixo = true;
      sentaAnimado(n);
      v.npc = n;
      this.gente.push(n);
    }

    /* Vagar um lugar é a chance que o jogo dá de descansar, e ela
       passava calada. Agora avisa, e a seta verde no banco diz qual. */
    if (vagou && !this.sentadoEm) { sfx('ok'); this.flash('VAGOU UM LUGAR ►'); }
  },

  /* O passo sai no compasso da perna, não do quadro: o mesmo 130ms que
     troca o desenho da caminhada. Alterna de altura pra não virar
     metrônomo, e cala quando você para. */
  passos: function (dt, andando) {
    if (!andando) { this.tPasso = 0; return; }
    this.tPasso = (this.tPasso || 0) + dt;
    if (this.tPasso > 260) {
      this.tPasso = 0;
      this.pePar = !this.pePar;
      sfx(this.pePar ? 'passoA' : 'passoB');
    }
  },

  /* ---------- batalha de rima ----------
     Sai da escolha do jogador, não de sorteio: encarar o rimador é uma
     opção do chapéu, ao lado de dar a moeda e de fingir que dorme. Quem
     não quer minigame nunca é obrigado a jogar um.

     As sílabas caem no compasso da caixinha — o intervalo entre elas é
     a batida de verdade, e é por isso que dá pra sentir o ritmo em vez
     de só reagir. Quanto mais fundo na corrida, mais rápido o rimador
     manda. */
  comecaBatalha: function () {
    var dif = GameState.dificuldade();
    var bpm = 92 + dif * 7;
    var batida = 60000 / bpm;
    var dur = 13000;
    var notas = [];
    var t = 1400, ultima = -1;
    while (t < dur - 1600) {
      var lane;
      do { lane = Math.floor(Math.random() * 4); } while (lane === ultima && Math.random() < 0.6);
      ultima = lane;
      notas.push({ lane: lane, t: t, feita: false, errada: false });
      t += batida * (Math.random() < 0.28 ? 0.5 : 1);
    }
    this.batalha = {
      notas: notas, t: 0, dur: dur, acertos: 0, erros: 0, combo: 0, maiorCombo: 0,
      queda: Math.max(900, 1500 - dif * 70),
      janela: Math.max(95, 150 - dif * 9),
      ant: { left: false, up: false, down: false, right: false }
    };
    GameState.stats.disfarces = GameState.stats.disfarces;   // não mexe no disfarce
    sfx('batida');
  },

  atualizaBatalha: function (dt) {
    var b = this.batalha, i, n;
    b.t += dt;

    // a batida da caixinha continua tocando por baixo
    if (this.rimador) { this.rimador.batida += dt; this.rimador.a.anima(dt, true); }

    /* uma direção vale quando é apertada, não enquanto está apertada:
       segurar pra esquerda não pode varrer a pista inteira */
    for (i = 0; i < 4; i++) {
      var d = BATALHA_DIRS[i];
      // duas batidas na mesma pista valem duas sílabas
      for (var n = Ctrl[d + 'N']; n > 0; n--) this.bateNota(i);
      b.ant[d] = !!Ctrl[d];       // só pra acender a caixa de acerto
    }

    // sílaba que passou da janela sem ser tocada é erro
    for (i = 0; i < b.notas.length; i++) {
      n = b.notas[i];
      if (!n.feita && !n.errada && b.t > n.t + b.janela) {
        n.errada = true; b.erros++; b.combo = 0;
      }
    }
    if (b.t > b.dur) this.fimDaBatalha();
  },

  bateNota: function (lane) {
    var b = this.batalha, melhor = null, dist = 1e9;
    for (var i = 0; i < b.notas.length; i++) {
      var n = b.notas[i];
      if (n.feita || n.errada || n.lane !== lane) continue;
      var d = Math.abs(n.t - b.t);
      if (d < dist) { dist = d; melhor = n; }
    }
    if (melhor && dist <= b.janela) {
      melhor.feita = true;
      b.acertos++; b.combo++;
      if (b.combo > b.maiorCombo) b.maiorCombo = b.combo;
      sfx('catraca');
    } else {
      b.erros++; b.combo = 0;
      sfx('nao');
    }
  },

  fimDaBatalha: function () {
    var b = this.batalha, self = this;
    var total = Math.max(1, b.acertos + b.erros);
    var taxa = b.acertos / total;
    this.batalha = null;
    this.centro.setText('');
    this.centro.setY(232).setCor(PAL.branco);
    for (var q = 0; q < 4; q++) this.setasBatalha[q].setVisible(false);
    GameState.stats.causos++;

    var texto, cor;
    if (taxa >= 0.7) {
      var troco = 2 + Math.round(b.maiorCombo / 6);
      GameState.addCarisma(12); GameState.ganhar(troco);
      // rima boa vale mais ponto: é o minigame mais difícil dos três
      var pts = 8 + b.maiorCombo * 2;
      texto = 'O VAGÃO VEIO ABAIXO.\n' + b.acertos + ' de ' + total + ', combo ' + b.maiorCombo +
        '.\nR$ ' + troco.toFixed(2).replace('.', ',') + ' e ' + pts + ' PONTOS.';
      cor = PAL.verde; sfx('vitoria');
      GameState.ganhaMinigame(pts);
    } else if (taxa >= 0.45) {
      GameState.addCarisma(4);
      texto = 'EMPATE TÉCNICO.\n' + b.acertos + ' de ' + total +
        '.\nEle respeitou. +' + GameState.ganhaMinigame(6) + ' PONTOS.';
      cor = PAL.amarelo; sfx('ok');
    } else {
      perdeVida(this, this.pl.sp);
      GameState.addCarisma(-7);
      texto = 'ELE TE ATROPELOU.\n' + b.acertos + ' de ' + total + '.\nO vagão inteiro riu.';
      cor = PAL.vermelho; sfx('erro');
    }
    fala(this, texto, [{ label: 'Ir embora', cb: function () { self.saiRimador(); } }]);
  },

  /* as quatro pistas, as sílabas caindo e a linha de acerto */
  pintaBatalha: function (g) {
    var b = this.batalha, i, n, cx;
    caixa(g, 40, 150, GW - 80, 380, 0xf2c14e);

    for (i = 0; i < 4; i++) {
      cx = batalhaX(i);
      g.fillStyle(0x000000, 0.3).fillRect(cx - 24, BAT_TOPO, 48, BAT_LINHA - BAT_TOPO + 16);
      // caixa de acerto: é onde a sílaba tem que estar quando você aperta
      var viva = b.ant[BATALHA_DIRS[i]];
      g.fillStyle(BATALHA_CORES[i], viva ? 0.7 : 0.28).fillRect(cx - 24, BAT_LINHA, 48, 16);
      g.lineStyle(2, BATALHA_CORES[i], 0.9).strokeRect(cx - 24, BAT_LINHA, 48, 16);
      this.setasBatalha[i].setVisible(true).setTint(viva ? 0xffffff : 0x8b90a6);
    }

    for (i = 0; i < b.notas.length; i++) {
      n = b.notas[i];
      if (n.feita || n.errada) continue;
      var p = 1 - (n.t - b.t) / b.queda;
      if (p < 0 || p > 1.1) continue;
      var y = BAT_TOPO + p * (BAT_LINHA - BAT_TOPO);
      cx = batalhaX(n.lane);
      g.fillStyle(BATALHA_CORES[n.lane], 1).fillRect(cx - 20, y, 40, 13);
      g.fillStyle(0xffffff, 0.5).fillRect(cx - 20, y, 40, 3);
      g.fillStyle(0x08080e, 0.55).fillRect(cx - 20, y + 10, 40, 3);
    }

    barra(g, 52, 504, GW - 104, 8, b.t / b.dur, 0xf2c14e, 0x1e1e2a);
    // o placar mora no alto do painel: embaixo ele tapava as setas do meio
    this.centro.setY(152).setCor(b.combo >= 4 ? PAL.verde : PAL.branco)
      .setText(b.combo >= 2 ? 'COMBO ' + b.combo
        : (b.acertos + b.erros ? b.acertos + ' DE ' + (b.acertos + b.erros) : 'MANDA!'));
  },

  /* ---------- disputa pela barra ----------
     O solavanco sempre foi solitário: vinha o tranco e você segurava.
     Só que barra de vagão cheio tem fila, e é aí que a coisa vira
     disputa — dois braços na mesma barra, e um dos dois vai pro chão.

     Uma barra só, com o divisor no meio: cada toque seu empurra pra
     direita, e o outro empurra pra esquerda sozinho, mais forte quanto
     mais fundo na corrida. Quem chegar na ponta leva. */
  comecaDisputa: function (a) {
    var dif = GameState.dificuldade();
    this.disputa = {
      a: a, pos: 0.5, t: 0, dur: 11000,
      forca: 0.075 + dif * 0.016,       // o quanto ele empurra por segundo
      empurrao: 0.05                    // o quanto cada toque seu devolve
    };
    sfx('empurra');
  },

  atualizaDisputa: function (dt) {
    var d = this.disputa;
    d.t += dt;
    if (Ctrl.actJust) { d.pos += d.empurrao; sfx('passoA'); }
    d.pos -= d.forca * dt / 1000;
    if (d.a && d.a.sp && d.a.sp.active) d.a.anima(dt, true);

    if (d.pos >= 1) { this.fimDaDisputa(true); return; }
    if (d.pos <= 0 || d.t > d.dur) { this.fimDaDisputa(false); return; }
  },

  fimDaDisputa: function (ganhou) {
    var d = this.disputa;
    this.disputa = null;
    this.centro.setText('');
    this.centro.setY(232).setCor(PAL.branco);
    if (d.a) d.a.fixo = true;
    if (ganhou) {
      GameState.addDescanso(3);
      GameState.addCarisma(2);
      sfx('ok');
      this.flash('A BARRA É SUA  +' + GameState.ganhaMinigame(7) + ' PONTOS');
    } else {
      perdeVida(this, this.pl.sp);
      GameState.addDescanso(-6);
      GameState.addCarisma(-4);
      this.cameras.main.shake(320, 0.008);
      sfx('nao');
      this.flash('VOCÊ FOI PRO CHÃO');
    }
  },

  pintaDisputa: function (g) {
    var d = this.disputa;
    caixa(g, 34, 196, GW - 68, 96, 0x0b9fdd);
    // a barra da disputa: você empurra pra direita, ele pra esquerda
    var x0 = 48, larg = GW - 96, y = 244;
    g.fillStyle(0x1e1e2a, 1).fillRect(x0, y, larg, 16);
    g.fillStyle(0x00e676, 1).fillRect(x0, y, Math.round(larg * d.pos), 16);
    g.fillStyle(0xe8362c, 1).fillRect(x0 + Math.round(larg * d.pos), y, Math.round(larg * (1 - d.pos)), 16);
    g.fillStyle(0xf2f0ff, 1).fillRect(x0 + Math.round(larg * d.pos) - 1, y - 4, 3, 24);
    this.centro.setY(206).setCor(PAL.branco).setText(nomeAgir().toUpperCase() + ' SEM PARAR!');
  },

  /* ---------- encontro ----------
     Os minigames apareciam por sorteio, sem aviso e sem cara. Agora eles
     têm dono: um passageiro decide te abordar, vem andando, e leva um
     tempo carregando antes de a coisa começar.

     Esse tempo é de propósito. É a janela pra fugir: se você se afastar
     antes de a carga encher, ele desiste. Ou você mesmo pode abordar
     primeiro — quem chega junto e aperta começa na hora. */
  sorteiaEncontro: function () {
    if (this.encontro || this.batalha || this.disputa || this.disfarce || this.encena) return;
    // um rimador de cada vez: dois barracos montados e a caixinha que
    // sai no fim da batalha é a do outro
    if (this.rimador) return;
    if (this.estado !== 'andando' || !this.npcExtra.length) return;
    if (Math.random() > Math.min(0.5, 0.14 + GameState.dificuldade() * 0.05)) return;

    /* Quanto mais cheio o vagão, mais a briga é por barra: no pico
       ninguém disputa rima, disputa lugar pra segurar. Sentado nunca
       disputa barra — quem senta não segura em nada. */
    var lot = GameState.lotacao();
    if (!this.sentadoEm && Math.random() < 0.25 + lot * 0.5) return this.desafioDeBarra();
    return this.desafioDeRima();
  },

  /* Quem quer a sua barra é um passageiro qualquer, porque é isso que
     ele é: gente que também precisa se segurar. */
  desafioDeBarra: function () {
    var a = this.npcExtra[Math.floor(Math.random() * this.npcExtra.length)];
    if (!a.sp || !a.sp.active) return;
    this.encontro = { a: a, tipo: 'barra', fase: 'vem', t: 0, carga: 0 };
    a.fixo = false;
    sfx('apito');
  },

  /* ---------- o desafio de rima ----------
     A batalha vinha de um passageiro sorteado, e o vagão inteiro tem a
     mesma cara: quem te desafiava podia ser a senhora do banco. Rima é
     ofício, e quem rima no metrô tem uniforme — boné e caixinha. Agora
     o desafiante é sempre um rimador, entra pela porta, vem com a
     moldura amarela e o nome em cima da cabeça, e dá pra ver de longe
     o que ele quer antes de ele chegar em você. */
  desafioDeRima: function () {
    var lado = (this.pl.sp.x < 160) ? 1 : -1;
    /* entra pela porta mais longe de você: o desafio tem que dar tempo
       de ser visto atravessando o vagão, senão ele aparece colado em
       quem joga e vira susto em vez de aviso */
    var porta = this.portas[0], melhor = -1;
    for (var i = 0; i < this.portas.length; i++) {
      var d = Math.abs(this.portas[i] + PORTA_ALT / 2 - this.pl.sp.y);
      if (d > melhor) { melhor = d; porta = this.portas[i]; }
    }
    var a = new Ator(this, 160 + lado * 46, porta + PORTA_ALT / 2, 'np_rimador');
    a.dir = 'down';
    a.sp.setDepth(56);
    a.fixo = false;
    this.gente.push(a);
    this.encontro = { a: a, tipo: 'rima', fase: 'vem', t: 0, carga: 0, convidado: true };
    sfx('apito');
  },

  /* Aceita a batalha e ele monta o barraco ali mesmo: a caixinha desce,
     a batida entra, e daí em diante é o mesmo rimador do ritual — é o
     que faz o fim da batalha saber mandar ele embora. */
  montaRimadorDoDesafio: function (a) {
    if (this.rimador) return;
    var lado = a.sp.x < 160 ? 1 : -1;
    this.rimador = {
      a: a, lado: lado, alvo: a.sp.y, fase: 'espera', t: 0, verso: 99, batida: 0,
      caixa: true, caixaX: a.sp.x + lado * 24, caixaY: a.sp.y + 12
    };
    a.fixo = true;
    this.encena = true;
    sfx('caixa');
  },

  atualizaEncontro: function (dt) {
    var e = this.encontro;
    if (!e) return;
    var a = e.a;
    if (!a.sp || !a.sp.active) { this.encerraEncontro(); return; }
    e.t += dt;

    var dx = this.pl.sp.x - a.sp.x, dy = this.pl.sp.y - a.sp.y;
    var d = Math.sqrt(dx * dx + dy * dy);

    if (e.fase === 'vem') {
      if (e.t > 9000) { this.encerraEncontro(); return; }   // desistiu de te achar
      if (d > 26) {
        // atravessar o vagão inteiro a 40px/s levava cinco segundos e a
        // abordagem morria de tédio antes de chegar
        var vel = (62 + GameState.dificuldade() * 9) * dt / 1000;
        a.sp.x += (dx / d) * vel; a.sp.y += (dy / d) * vel;
        limitaVagao(a.sp);
        a.setDir(dx, dy);
        a.anima(dt, true);
      } else {
        e.fase = 'carrega'; e.t = 0;
      }
      return;
    }

    // carregando: encheu, começa. Andou pra longe, escapou.
    a.setDir(dx, dy); a.anima(dt, false);
    if (d > 92) { this.encerraEncontro(); this.flash('VOCÊ ESCAPOU'); return; }
    e.carga = Math.min(1, e.carga + dt / 1500);
    if (e.carga >= 1) {
      var tipo = e.tipo, quem = e.a;
      this.encontro = null;
      this.tagEncontro.setVisible(false);
      if (tipo === 'rima') { this.montaRimadorDoDesafio(quem); this.comecaBatalha(); }
      else this.comecaDisputa(quem);
    }
  },

  encerraEncontro: function () {
    if (!this.encontro) return;
    var a = this.encontro.a, convidado = this.encontro.convidado;
    this.encontro = null;
    this.tagEncontro.setVisible(false);
    if (!a || !a.sp || !a.sp.active) return;
    // o rimador só existia pra esse desafio: sem desafio, ele vai embora
    if (convidado) {
      var i = this.gente.indexOf(a);
      if (i >= 0) this.gente.splice(i, 1);
      a.destroy();
      return;
    }
    a.fixo = false;
    sentaAnimado(a);
  },

  pintaEncontro: function (g) {
    var e = this.encontro;
    if (!e || !e.a.sp || !e.a.sp.active) { this.tagEncontro.setVisible(false); return; }
    var x = Math.round(e.a.sp.x), py = e.a.sp.y;
    var rima = (e.tipo === 'rima');
    var cor = rima ? 0xf2c14e : 0xe8362c;

    /* Um "!" solto em cima de um passageiro qualquer não dizia quem
       era nem o que ele queria: num vagão de doze pessoas iguais, a
       moldura é o que separa o desafiante do resto, e o nome é o que
       diz por que ele veio. */
    /* o boneco tem o pé no sp.y e quarenta e oito de altura: a moldura
       é o corpo dele, não um quadrado em volta do chão */
    var topo = py - 50, alt = 54;
    var pulso = 0.55 + 0.45 * Math.sin(this.time.now / 190);
    g.fillStyle(cor, 0.14 + 0.1 * pulso).fillRect(x - 14, topo, 28, alt);
    g.lineStyle(2, cor, 0.55 + 0.45 * pulso);
    g.strokeRect(x - 14, topo, 28, alt);
    // cantoneiras: o retângulo fino sumia no meio da multidão
    g.fillStyle(cor, 1);
    for (var c = 0; c < 4; c++) {
      var cx = x - 15 + (c % 2) * 28, cy = topo - 1 + (c > 1 ? alt : 0);
      g.fillRect(cx, cy, 2, 6); g.fillRect(cx, cy, 6, 2);
      if (c % 2) g.fillRect(cx - 4, cy, 6, 2);
      if (c > 1) g.fillRect(cx, cy - 4, 2, 6);
    }

    /* A etiqueta mora acima da moldura. Quando ele está tão no alto que
       não sobra espaço — e ali em cima mora a placa de rota — ela desce
       pros pés dele em vez de brigar pelo mesmo pixel. */
    var acima = (py - 82 >= 140);
    var ty = acima ? py - 82 : py + 6;
    var tx = Phaser.Math.Clamp(x, 48, GW - 48);
    this.tagEncontro.setVisible(true).setText(rima ? 'RIMADOR' : 'QUER A BARRA');
    this.tagEncontro.setPosition(tx, ty);
    var lw = Math.round(this.tagEncontro.width) + 8, lh = Math.round(this.tagEncontro.height) + 4;
    g.fillStyle(0x08080e, 0.85).fillRect(tx - lw / 2, ty - 2, lw, lh);
    g.fillStyle(cor, 1).fillRect(tx - lw / 2, ty + lh - 4, lw, 2);

    if (e.fase !== 'carrega') return;
    // e a carga, que é o tempo que sobra pra fugir
    var by = acima ? ty - 12 : ty + lh + 4;
    g.fillStyle(0x08080e, 0.7).fillRect(x - 20, by, 40, 7);
    g.fillStyle(0xe8362c, 1).fillRect(x - 19, by + 1, Math.round(38 * e.carga), 5);
  },

  /* ---------- corrida pelo banco ----------
     Sentar era só chegar perto e apertar: o banco vago esperava por
     você. No vagão de verdade o banco vago tem dono em dois segundos —
     e é justamente na parada, quando alguém desce, que a disputa
     acontece.

     Não precisou de mecânica nova: é um passageiro com vontade, andando
     pro mesmo lugar, usando a mesma física de corpo que já empurra todo
     mundo. Quem chegar primeiro senta. Perder não tira nada de você —
     só te deixa em pé, que já é o castigo. */
  sorteiaCorrida: function () {
    if (this.sentadoEm || this.corrida) return;
    var livres = [], i;
    for (i = 0; i < this.bancos.length; i++) if (!this.bancos[i].npc) livres.push(this.bancos[i]);
    if (!livres.length || !this.npcExtra.length) return;
    if (Math.random() > 0.55) return;

    var b = livres[Math.floor(Math.random() * livres.length)];
    // escolhe quem disputa: o passageiro em pé mais perto do banco
    var quem = null, melhor = 1e9;
    for (i = 0; i < this.npcExtra.length; i++) {
      var a = this.npcExtra[i];
      if (!a.sp || !a.sp.active) continue;
      var d = Math.abs(a.sp.x - b.x) + Math.abs(a.sp.y - (b.y + 24));
      if (d < melhor) { melhor = d; quem = a; }
    }
    if (!quem) return;
    // se ele já está em cima do banco não é corrida, é sorte dele
    if (melhor < 40) return;
    this.corrida = { b: b, a: quem, t: 0 };
    quem.fixo = false;
    this.flash('CORRA PRO BANCO');
  },

  atualizaCorrida: function (dt) {
    var c = this.corrida;
    if (!c) return;
    var a = c.a;
    // acabou: alguém sentou, o passageiro sumiu, ou o trem parou de novo
    if (!a.sp || !a.sp.active || c.b.npc || this.sentadoEm === c.b) { this.encerraCorrida(); return; }
    c.t += dt;
    if (c.t > 9000) { this.encerraCorrida(); return; }

    var alvoX = c.b.x, alvoY = c.b.y + 24;
    var dx = alvoX - a.sp.x, dy = alvoY - a.sp.y;
    var d = Math.sqrt(dx * dx + dy * dy);
    if (d < 6) {                       // chegou: senta e a corrida acabou
      a.sp.x = alvoX; a.sp.y = alvoY;
      a.dir = alvoX < 160 ? 'sentadoR' : 'sentadoL';
      a.sp.setDepth(30); a.fixo = true;
      sentaAnimado(a);
      c.b.npc = a;
      var k = this.npcExtra.indexOf(a);
      if (k >= 0) this.npcExtra.splice(k, 1);
      this.corrida = null;
      perdeVida(this, this.pl.sp);
      sfx('nao');
      this.flash('SENTARAM NO SEU LUGAR');
      return;
    }
    var vel = (46 + GameState.dificuldade() * 7) * dt / 1000;
    a.sp.x += (dx / d) * vel;
    a.sp.y += (dy / d) * vel;
    a.setDir(dx, dy);
    a.anima(dt, true);
  },

  encerraCorrida: function () {
    if (!this.corrida) return;
    var a = this.corrida.a;
    if (a && a.sp && a.sp.active && !a.fixo) sentaAnimado(a);
    this.corrida = null;
  },

  /* Antes uma cena de vagão era uma estação, e cabia certinho um evento
     e um dilema por cena. Agora a cena é a perna inteira, quinze
     estações: com a mesma regra sairia um ambulante por estação e o
     vagão viraria um circo. Cada trecho sorteia se tem alguma coisa — e
     o dilema do lugar, que é o coração do jogo, pesa muito mais quando
     você está sentado, porque é aí que ele dói. */
  sorteiaRitmo: function () {
    this.sorteiaEncontro();
    this.eventoPendente = Math.random() < 0.28;
    this.dilemaPendente = Math.random() < (this.sentadoEm ? 0.45 : 0.10);
    this.tEvento = 2200 + Math.random() * 1400;
    this.tDilema = 4600 + Math.random() * 1400;
  },

  /* ---------- o dilema do lugar ---------- */
  dilemaDoLugar: function () {
    var self = this;
    this.dilemaPendente = false;
    var quem = ['um senhor de bengala', 'uma gestante', 'uma mãe com bebê no colo'][Math.floor(Math.random() * 3)];

    if (GameState.charKey === 'senhor' && !this.sentadoEm) {
      fala(this, 'Uma moça levanta e oferece\no lugar para você.', [
        {
          label: 'Aceitar', cb: function () {
            var b = null;
            for (var i = 0; i < self.bancos.length; i++) if (!self.bancos[i].npc) { b = self.bancos[i]; break; }
            if (!b) { b = self.bancos[0]; if (b.npc && b.npc !== 'player') b.npc.destroy(); b.npc = null; }
            self.senta(b);
            GameState.addDescanso(16); GameState.addCarisma(-3);
            self.flash('"Obrigado, viu, filha."');
          }
        },
        {
          label: 'Recusar, tô bem', cb: function () {
            GameState.addCarisma(8); GameState.addDescanso(-6);
            self.flash('Orgulho custa caro.');
          }
        }
      ], { tempo: 6, aoExpirar: function () { GameState.addCarisma(-2); } });
      return;
    }

    if (!this.sentadoEm) return;

    this.idoso = new Ator(this, this.sentadoEm.x < 160 ? 80 : 240, this.sentadoEm.y + 24, 'np_idoso');
    this.idoso.dir = this.sentadoEm.x < 160 ? 'left' : 'right';
    this.idoso.anima(0, false);
    this.idoso.sp.setDepth(55);
    this.idoso.fixo = true;
    this.gente.push(this.idoso);
    sfx('porta');

    fala(this, 'Entra ' + quem + '\ne para bem na sua frente.', [
      {
        label: 'Dar o lugar', cb: function () {
          GameState.addCarisma(9); GameState.addDescanso(-9);
          GameState.stats.cedidos++; GameState.stats.causos++;
          self.levanta(); sfx('ok');
          self.flash('O vagão inteiro viu.');
        }
      },
      { label: 'Disfarçar', cb: function () { self.comecaDisfarce(); } },
      {
        label: 'Não dar', cb: function () {
          GameState.addCarisma(-9); GameState.addDescanso(5);
          GameState.stats.recusas++; GameState.stats.causos++;
          sfx('nao');
          self.flash('Todo mundo te encarou.');
        }
      }
    ], {
      tempo: 6,
      cor: 0xe8a33c,
      aoExpirar: function () {
        GameState.addCarisma(-6); GameState.stats.recusas++;
        self.flash('Você travou. Isso conta como não.');
      }
    });
  },

  /* ---------- minigame do disfarce ---------- */
  comecaDisfarce: function () {
    GameState.stats.disfarces++;
    this.disfarce = { suspeita: 30, t: 0, dur: 8000, olhar: null, olharT: 0, proxOlhar: 900 };
    this.centro.setText('DISFARCE: OLHANDO O CELULAR');
  },

  atualizaDisfarce: function (dt) {
    var d = this.disfarce, dif = GameState.dificuldade();
    d.t += dt;
    d.suspeita += (5.5 + dif * 1.6) * dt / 1000;

    if (d.olhar) {
      d.olharT += dt;
      var acertou = false, errou = false;
      var p = Ctrl.dirDominante();
      if (p) { if (p === d.olhar) acertou = true; else errou = true; }
      if (acertou) { d.suspeita -= 16; d.olhar = null; d.proxOlhar = 700 + Math.random() * 900; d.olharT = 0; sfx('catraca'); }
      else if (errou || d.olharT > Math.max(450, 950 - dif * 60)) {
        d.suspeita += 22; d.olhar = null; d.proxOlhar = 800 + Math.random() * 900; d.olharT = 0; sfx('nao');
      }
    } else {
      d.olharT += dt;
      if (d.olharT > d.proxOlhar) {
        var dirs = ['up', 'down', 'left', 'right'];
        d.olhar = dirs[Math.floor(Math.random() * 4)];
        d.olharT = 0;
      }
    }

    this.tSeta.setText(d.olhar ? ({ up: '▲', down: '▼', left: '◄', right: '►' })[d.olhar] : '');

    if (d.suspeita >= 100) {
      this.tSeta.setText(''); this.centro.setText('');
      this.disfarce = null;
      perdeVida(this, this.pl.sp);
      GameState.addCarisma(-14);
      this.levanta();
      sfx('erro');
      fala(this, '"Moço, o senhor não vai\nlevantar não?"', []);
      var self = this;
      this.time.delayedCall(1800, function () { if (self.dialog) self.dialog.fecha(); });
      return;
    }
    if (d.t >= d.dur) {
      this.tSeta.setText(''); this.centro.setText('');
      this.disfarce = null;
      GameState.addCarisma(-4);
      GameState.stats.disfarcesOk++;
      if (this.idoso) { this.idoso.destroy(); this.idoso = null; }
      sfx('ok');
      this.flash('Ele desceu. Você segue sentado.');
    }
  },

  /* ---------- chegada ---------- */
  /* O trem para. Antes cada parada era o fim da cena e descer era
     obrigatório; agora a parada é só uma parada — quem tem destino fica
     dentro até a estação certa. Sentado ninguém é levantado à força. */
  chega: function () {
    this.estado = 'parado';
    this.t = 0;
    this.pintaPortas(true);
    sfx('chegando');
    var eu = this;
    this.time.delayedCall(420, function () { sfx('porta'); });
    this.time.delayedCall(700, function () { if (eu.scene && eu.scene.isActive()) sfx('anuncio'); });
    if (this.idoso) { this.idoso.destroy(); this.idoso = null; }
    /* Um pedido de lugar por estação: pedir sem parar transformaria o
       idoso num botão de sentar. O cochilo NÃO é zerado aqui de
       propósito — se a parada acordasse, cochilar não custaria nada e
       passar da estação nunca aconteceria. */
    this.pediu = false;
    if (this.noChao) { this.levantaDoChao(); this.flash('O TREM PAROU. VOCÊ LEVANTOU.'); }
    // chegou a estação: o rimador recolhe a caixinha e vai embora também
    if (this.rimador && this.rimador.fase !== 'sai') { if (this.dialog) this.dialog.fecha(); this.saiRimador(); }
    this.rima.setText('');

    var virou = GameState.avancaTrem();
    var aqui = GameState.estacaoAtual();
    this.encerraCorrida();
    this.encerraEncontro();
    this.trocaPassageiros();
    this.sorteiaCorrida();
    if (virou) {
      // ficou no trem até a ponta da linha: ele volta, e o desvio custa
      GameState.passaTempo(4);
      GameState.addDescanso(-5);
      sfx('nao');
      this.flash('FIM DA LINHA. O TREM VOLTOU');
    } else if (aqui === GameState.alvoAtual()) {
      sfx('apito');
      this.flash(GameState.faltaBaldear() ? 'SÉ: DESÇA PRA BALDEAR' : 'SUA ESTAÇÃO: ' + aqui);
    } else if (GameState.virouFaixa()) {
      this.flash(GameState.hora() + ' ' + GameState.faixa().nome);
    } else {
      this.flash(aqui);
    }
  },

  /* Descer. Se é a sua estação, a perna anda; se não é, você pagou por
     um trem a mais e vai esperar o próximo na plataforma errada. */
  desce: function () {
    GameState.sentado = false;
    var aqui = GameState.estacaoAtual();
    if (aqui !== GameState.alvoAtual()) {
      GameState.addDescanso(-6);
      GameState.passaTempo(4);
      sfx('nao');
      this.scene.start('Plataforma');
      return;
    }
    if (GameState.faltaBaldear()) {
      GameState.baldeia();
      sfx('ok');
      // baldear não passa por catraca, mas passa pelo corredor da Sé
      this.scene.start('Baldeacao');
      return;
    }
    var atrasado = GameState.minutosNaPerna() > LIMITE_ATRASO && GameState.perna === 'ida';
    GameState.chegouNoDestino();
    var morte = GameState.derrota();
    if (morte) { GameState.motivoFim = morte; this.fimDeJogo(); return; }
    sfx(atrasado ? 'erro' : 'vitoria');
    this.scene.start('Catraca');            // nova perna: entra no sistema de novo
  },

  fimDeJogo: function () {
    GameState.salvarRecorde();
    this.scene.start('Fim');
  },

  /* ---------- loop ---------- */
  update: function (time, delta) {
    Ctrl.update();
    var dt = Math.min(delta, 50);

    if (this.dialog && this.dialog.ativo) { this.dialog.update(dt); return; }
    if (this.batalha) { this.atualizaBatalha(dt); this.pintaCaixinha(); this.pintaUI(); return; }
    if (this.disputa) { this.atualizaDisputa(dt); this.pintaUI(); return; }
    if (this.disfarce) { this.atualizaDisfarce(dt); this.pintaUI(); return; }

    this.t += dt;

    this.atualizaSono();
    this.atualizaCochilo(dt);
    if (this.sentadoEm) GameState.addDescanso(0.0018 * dt);
    // o chão descansa menos que o banco, e o cochilo em pé menos ainda
    else if (this.noChao) GameState.addDescanso(0.0011 * dt);
    else if (this.cochilando()) GameState.addDescanso(0.0008 * dt);
    // o cansaço é o eixo que nunca satura: a lotação bate no teto no
    // quarto dia, mas ficar em pé cansa cada vez mais
    else GameState.addDescanso(-0.00082 * GameState.char.dreno * dt * (0.8 + GameState.dificuldade() * 0.2));

    var morte = GameState.derrota();
    if (morte) { GameState.motivoFim = morte; this.fimDeJogo(); return; }

    if (this.estado === 'andando') {
      this.atualizaSolavanco(dt);
      this.atualizaFalha(dt);
      if (this.falha) { this.animaGente(dt); this.pintaUI(); this.contexto(); return; }
      if (this.eventoPendente && this.t > this.tEvento) { this.eventoPendente = false; this.sorteiaEvento(); this.pintaUI(); return; }
      if (this.dilemaPendente && !this.encena && this.t > this.tDilema) { this.dilemaDoLugar(); this.pintaUI(); return; }
      if (this.t > this.duracao) this.chega();
    } else if (this.estado === 'parado') {
      if (this.t > TEMPO_PARADO) {
        this.estado = 'andando'; this.t = 0;
        this.sorteiaRitmo();
        this.sorteouFalha = false;
        this.pintaPortas(false);
        sfx('porta');
        // deixar a sua estação passar é o erro caro: agora tem que voltar
        if (this.eraSuaEstacao) {
          GameState.addDescanso(-8);
          GameState.addCarisma(-2);
          GameState.apontaPraAlvo();
          sfx('erro');
          this.flash('PASSOU DA SUA ESTAÇÃO');
        }
      }
    }
    this.eraSuaEstacao = (this.estado === 'parado')
      && GameState.estacaoAtual() === GameState.alvoAtual();

    if (!this.sentadoEm && !this.noChao) {
      var vel = GameState.char.velocidade * (0.55 + 0.45 * (GameState.descanso / GameState.char.descansoMax));
      if (Ctrl.act) vel *= 0.35;
      var dx = (Ctrl.right ? 1 : 0) - (Ctrl.left ? 1 : 0);
      var dy = (Ctrl.down ? 1 : 0) - (Ctrl.up ? 1 : 0);
      var mv = (dx !== 0 || dy !== 0);
      // quem anda acorda: o cochilo só conta com o corpo parado
      this.andandoAgora = mv;
      if (mv) {
        var n = Math.sqrt(dx * dx + dy * dy);
        this.pl.sp.x += (dx / n) * vel * dt / 1000;
        this.pl.sp.y += (dy / n) * vel * dt / 1000;
        limitaVagao(this.pl.sp);        // o corredor abre na frente das portas
        this.pl.setDir(dx, dy);
      }
      this.pl.anima(dt, mv);
      this.passos(dt, mv);
      resolveCorpos(this.pl, this.gente, limitaVagao, limitaVagao);
    }

    this.atualizaMao();
    this.pintaBarras();
    this.atualizaCorrida(dt);
    this.atualizaEncontro(dt);
    this.animaGente(dt);
    this.animaRimador(dt);
    this.pintaCaixinha();
    this.pintaUI();
    this.contexto();
  },

  contexto: function () {
    var dica = '';

    /* De olho fechado não se vê nada — nem a placa de rota, nem o aviso
       de que a sua estação é esta. Cochilar devolve descanso de graça, e
       o preço é esse: quem dorme em pé passa da estação. Soltar a barra
       acorda na hora. */
    if (this.cochilando()) {
      this.dica.setText('COCHILANDO ▲   SOLTE PRA ACORDAR', PAL.cinza);
      this.pintaRota();
      return;
    }

    /* "ou a gente aborda, ou ele te ataca": se ele está vindo e você
       chega junto, dá pra encarar na hora em vez de esperar. */
    if (this.encontro) {
      var ea = this.encontro.a;
      if (ea.sp && ea.sp.active &&
        Math.hypot(this.pl.sp.x - ea.sp.x, this.pl.sp.y - ea.sp.y) < 62) {
        this.dica.setText(nomeAgir() + (this.encontro.tipo === 'rima'
          ? ': ACEITAR A RIMA' : ': ENCARAR'), PAL.vermelho);
        /* Aceitar vale nas duas fases: enquanto ele vem, encarar é ir
           pra cima; enquanto ele carrega, é dizer que não precisa
           esperar a barra encher. Quem não quer, anda pra longe. */
        if (Ctrl.actJust) {
          if (this.encontro.fase === 'vem') { this.encontro.fase = 'carrega'; this.encontro.t = 0; }
          else this.encontro.carga = 1;
          sfx('empurra');
        }
        this.pintaRota();
        return;
      }
    }

    if (this.estado === 'parado') {
      // descer é chegar no vestíbulo, não só estar na altura da porta
      var perto = false;
      for (var i = 0; i < this.portas.length; i++) {
        if (this.pl.sp.x > 258 && Math.abs(this.pl.sp.y - (this.portas[i] + PORTA_ALT / 2)) < 34) perto = true;
      }
      var minha = (GameState.estacaoAtual() === GameState.alvoAtual());
      /* Descer é a ação da parada, mas só engole o comando quando você
         está no vestíbulo. Fora dele a viagem continua normal — sentar
         em banco que vagou na parada é metade da graça de parar. */
      if (perto) {
        dica = nomeAgir() + (minha ? ': DESCER' : ': descer (não é a sua)');
        if (Ctrl.actJust) { this.desce(); return; }
      } else if (minha) {
        dica = 'DESÇA AQUI ►';
      }
    }
    if (!dica && this.noChao) {
      dica = 'NO CHÃO ▲  ' + nomeAgir() + ' PRA LEVANTAR';
      if (Ctrl.backJust || Ctrl.actJust) this.levantaDoChao();
    }
    if (!dica) {
      if (this.sentadoEm) {
        // no celular não existe tecla X: agir de novo levanta
        dica = GameState.descanso < GameState.char.descansoMax - 1
          ? 'DESCANSANDO ▲' : nomeAgir() + ' pra levantar';
        if (Ctrl.backJust || Ctrl.actJust) this.levanta();
      } else {
        var b = this.bancoLivrePerto();
        if (b) {
          dica = nomeAgir() + ': SENTAR';
          if (Ctrl.actJust) {
            // sentar no banco em disputa é ganhar a corrida
            var disputado = this.corrida && this.corrida.b === b;
            this.senta(b);
            if (disputado) {
              this.encerraCorrida();
              this.flash('O BANCO É SEU  +' + GameState.ganhaMinigame(5) + ' PONTOS');
            }
          }
        } else if (this.bancoOcupadoPerto()) {
          // o idoso e a gestante não caçam banco vago: eles pedem
          dica = nomeAgir() + ': PEDIR O LUGAR';
          if (Ctrl.actJust) this.pedeOLugar(this.bancoOcupadoPerto());
        } else if (this.passageiroPerto()) {
          dica = nomeAgir() + ': PERGUNTAR (R$ 2)';
          if (Ctrl.actJust) this.perguntaARota();
        } else if (this.podeSentarNoChao() && (this.comSono() || !this.temLugarVago())) {
          dica = nomeAgir() + ': SENTAR NO CHÃO';
          if (Ctrl.actJust) this.sentaNoChao();
        } else if (this.podeVender()) {
          dica = nomeAgir() + ': VENDER  (FISCAL ' + Math.round(this.fiscal) + '%)';
          if (Ctrl.actJust) this.vende();
        } else if (this.comSono() && this.temLugarVago()) {
          /* Com sono, mandar segurar na barra é mandar pro lugar
             errado: barra não descansa ninguém. Enquanto houver lugar
             vago, o rodapé aponta pra ele. */
          dica = 'SONO! SENTE NO VERDE ►';
        } else if (this.barraPerto().d <= ALCANCE_BARRA) {
          dica = this.segurando ? 'SEGURANDO' : 'SEGURE PRA NÃO CAIR';
        } else {
          dica = 'VÁ ATÉ UMA BARRA';
        }
      }
    }
    this.dica.setText(dica);
    this.pintaRota();
  },

  /* Onde descer não cabe na barra de baixo: lá moram as ações, e a
     viagem passa por doze estações que não são a sua. A rota mora numa
     placa própria, debaixo do HUD, e vira verde quando a próxima é a
     sua. */
  pintaRota: function () {
    var falta = GameState.faltamEstacoes(), alvo = GameState.alvoAtual();
    var txto, cor;

    /* De olho fechado ninguém lê placa. O CLT cochila de graça, e o
       preço é este: a rota some enquanto ele dorme em pé. */
    if (this.cochilando()) {
      this.rota.setCor(PAL.cinzaEsc).setText('ZZZ...');
      return;
    }
    /* O turista não conhece a linha: a placa só serve de perto. De
       longe ele tem que perguntar — e perguntar custa. */
    if (temPoder('perdido') && !this.sabeARota && falta > 1) {
      this.rota.setCor(PAL.cinzaEsc).setText('VOCÊ NÃO SABE\nONDE DESCER');
      return;
    }

    if (falta <= 0) { txto = 'DESÇA NA ' + alvo; cor = PAL.verde; }
    else if (falta === 1) { txto = 'PRÓXIMA É A SUA: ' + alvo; cor = PAL.verde; }
    else { txto = alvo + ' EM ' + falta + ' ESTAÇÕES'; cor = PAL.amarelo; }

    /* Na ida existe hora de entrada, e atraso que a pessoa não vê
       chegando é injusto: a hora aparece junto com a rota, com os
       minutos que sobram, e fica vermelha quando aperta. */
    if (GameState.perna === 'ida') {
      var folga = GameState.minutosParaOAtraso();
      txto += '\nENTRADA ' + GameState.horaLimite() +
        (folga > 0 ? ' (' + folga + ' MIN)' : ' — ATRASADO');
      if (folga <= 12) cor = PAL.vermelho;
    }
    this.rota.setCor(cor).setText(txto);
  },

  /* Sentar é a única coisa que devolve descanso, e até aqui o banco
     livre era um retângulo azul idêntico ao banco ocupado — quem não
     sabia procurar, não sentava, e dormia em pé. Agora todo lugar vago
     acende verde e chama com uma seta, de qualquer canto do vagão; o
     que está ao alcance acende de vez, que é o convite pra apertar. */
  pintaLugares: function (g) {
    var perto = this.sentadoEm ? null : this.bancoLivrePerto();
    var pulso = 0.5 + 0.5 * Math.sin(this.time.now / 260);
    for (var i = 0; i < this.bancos.length; i++) {
      var b = this.bancos[i];
      // o banco em disputa já tem a moldura amarela da corrida: duas
      // marcas no mesmo lugar não dizem duas coisas, dizem nenhuma
      if (b.npc || (this.corrida && this.corrida.b === b)) continue;
      var aqui = (b === perto);
      var a = aqui ? 0.95 : 0.3 + 0.25 * pulso;
      g.fillStyle(0x00e676, aqui ? 0.24 : 0.08 + 0.06 * pulso);
      g.fillRect(b.x - 8, b.y - 2, 16, LUGAR_ALT - 4);
      g.lineStyle(2, 0x00e676, a);
      g.strokeRect(b.x - 9, b.y - 3, 18, LUGAR_ALT - 2);
      // a seta nasce no corredor e aponta pro assento
      var lado = b.x < 160 ? 1 : -1, sx = b.x + lado * 15, sy = b.y + 22;
      g.fillStyle(0x00e676, a);
      g.fillTriangle(sx, sy - 5, sx, sy + 5, sx - lado * 7, sy);
    }
  },

  pintaUI: function () {
    var g = this.gUI; g.clear();

    this.pintaLugares(g);

    // o banco em disputa pisca: correr sem saber pra onde não é corrida
    if (this.corrida) {
      var b = this.corrida.b;
      var pulso = 0.35 + 0.3 * Math.sin(this.corrida.t / 110);
      g.lineStyle(2, 0xf2c14e, pulso);
      g.strokeRect(b.x - 13, b.y - 2, 26, LUGAR_ALT - 4);
      g.fillStyle(0xf2c14e, pulso).fillRect(b.x - 3, b.y - 12, 6, 5);
    }

    /* O quanto falta pra próxima estação era uma barra em HUD_H+25, ou
       seja, por baixo da placa de rota: aparecia como um risco vermelho
       cortando o texto. Desceu pro rodapé, rente à faixa de dica, onde
       tem a tela inteira pra si e não briga com nada. */
    if (this.estado === 'andando') {
      barra(g, 8, GH - 41, GW - 16, 6, this.t / this.duracao, GameState.linhaAtual().num, 0x15151f);
    }

    if (this.solavanco.fase === 'aviso') {
      var p = 1 - (this.solavanco.t / this.solavanco.dur);
      caixa(g, 68, 192, 184, 60, 0xe8362c);
      barra(g, 80, 232, 160, 10, p, 0xe8362c, 0x1e1e2a);
      this.centro.setY(200).setCor(Ctrl.act ? PAL.verde : PAL.vermelho);
      this.centro.setText(Ctrl.act ? 'SEGURANDO' : 'SEGURE!');
    } else if (this.centro.texto() === 'SEGURE!' || this.centro.texto() === 'SEGURANDO') {
      this.centro.setText('');
      this.centro.setCor(PAL.branco).setY(232);
    }

    if (this.disfarce) {
      caixa(g, 40, 192, 240, 92, 0xe8a33c);
      barra(g, 52, 256, 216, 14, this.disfarce.suspeita / 100, 0xe8362c, 0x1e1e2a);
    }

    if (this.batalha) this.pintaBatalha(g);
    if (this.disputa) this.pintaDisputa(g);
    if (this.encontro) this.pintaEncontro(g); else this.tagEncontro.setVisible(false);
  }
});
