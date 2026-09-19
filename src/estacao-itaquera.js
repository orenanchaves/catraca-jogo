/* global Phaser, GameState, EstacaoScene */
/* Catraca — a planta da Corinthians-Itaquera

   Toda estação usa a mesma planta: plataforma em cima, escada, saguão
   com catracas embaixo, e o mundo em 320px de largura. A Itaquera é a
   casa — é onde todo dia começa e termina — e ganhou a planta dela, a
   partir das fotos e do mapa do entorno:

   - a plataforma é LATERAL e mais LARGA (piso até x 420), com PORTAS DE
     PLATAFORMA bege entre o piso e o trem, pilares, bancos laranja, as
     placas vermelhas penduradas e, do outro lado da via, a plataforma
     vizinha cheia de gente (cenário: dá pra ver, não dá pra ir);
   - o saguão das catracas vira o mezanino, e embaixo dele desce uma
     PASSARELA comprida;
   - no meio da passarela, a CRUZ: um braço pra cada lado. O mapa real
     tem os trilhos deitados; aqui ele foi girado 90° pra caber no jogo
     em pé, com as vizinhanças de verdade: Saída A (Shopping Metrô
     Itaquera) num braço, Saídas C/D (Radial Leste e Arena Corinthians)
     no outro, e a Saída B (CPTM e terminal de ônibus) no pé.

   As saídas mudam o jogo pouco, e de propósito: cada personagem mora
   pra um lado. Na IDA ele entra pela porta de casa; na VOLTA precisa
   sair pela mesma — a errada custa minutos e fôlego, e devolve você pro
   cruzamento.

   Tudo aqui é pendurado no EstacaoScene por protótipo: a cena chama
   `this.itq` nos pontos em que a planta muda, e o resto do jogo não
   sabe que a Itaquera é diferente. Coordenadas de MUNDO, com o mesmo
   saguão de sempre em x 0..320; os braços vão pra x negativo e além
   de 320. */

var ITQ = {
  outraX0: -150, outraX1: -8,       // a plataforma vizinha, do outro lado da via
  platX1: 420, paredeX: 432,        // o piso vai até 420; a parede, de 432 a 460
  platX2: 460,
  passX0: 100, passX1: 188,         // o vão da passarela (88 de largura)
  passY0: 516, passY1: 1150,        // do pé do saguão até a Saída B
  cruzY0: 820, cruzY1: 904,         // a faixa dos dois braços
  bracoX0: -340, bracoX1: 628,      // até onde os braços vão
  mundoX0: -380, mundoX1: 680
};
var ITQ_PISA = 6;                   // o boneco não encosta na parede da passarela
var ITQ_MEIO_X = (ITQ.passX0 + ITQ.passX1) / 2;
var ITQ_MEIO_Y = (ITQ.cruzY0 + ITQ.cruzY1) / 2;

/* As três portas pra rua. `x,y` é onde você aparece ao entrar por ela, já
   do lado de dentro, olhando pra estação. */
var SAIDAS_ITQ = {
  A: { rotulo: 'SAÍDA A', lugar: 'SHOPPING', x: ITQ.bracoX0 + 34, y: ITQ_MEIO_Y, dir: 'right', seta: '◄' },
  B: { rotulo: 'SAÍDA B', lugar: 'CPTM E TERMINAL', x: ITQ_MEIO_X, y: ITQ.passY1 - 34, dir: 'up', seta: '▼' },
  C: { rotulo: 'SAÍDA C/D', lugar: 'RADIAL E ARENA', x: ITQ.bracoX1 - 34, y: ITQ_MEIO_Y, dir: 'left', seta: '►' }
};
/* Pra que lado cada um mora. O estudante vem de ônibus (terminal); o
   senhor e a gestante moram do lado do shopping; o CLT e o ambulante,
   pra Radial; o turista veio ver jogo na Arena. */
var CASA_SAIDA = { estudante: 'B', clt: 'C', senhor: 'A', ambulante: 'C', gestante: 'A', turista: 'C' };
function saidaDeCasa() { return CASA_SAIDA[GameState.charKey] || 'B'; }
function ehItaquera() { return GameState.estacaoAtual() === 'ITAQUERA'; }

/* Os pilares e os bancos da plataforma: coisa em que se esbarra, e onde
   se senta. O banco era uma tirinha de 13px, pequeno demais pra alguém
   caber ('não tá pra sentar'). Agora são quatro assentos de 18px, da
   largura de um boneco, com encosto, colados à direita de cada pilar. */
var ITQ_PILARES = [180, 410, 640];              // y da textura da plataforma
var ITQ_PILAR_X = 318, ITQ_PILAR_R = 11;
var ITQ_BANCO = { x0: ITQ_PILAR_X + 16, assento: 20, n: 4, prof: 16 };
// o centro de cada assento, em coordenadas do mundo
function assentosItq() {
  var out = [];
  for (var i = 0; i < ITQ_PILARES.length; i++) {
    for (var k = 0; k < ITQ_BANCO.n; k++) {
      out.push({ x: ITQ_BANCO.x0 + k * ITQ_BANCO.assento + ITQ_BANCO.assento / 2, y: PLAT_Y + ITQ_PILARES[i], npc: null });
    }
  }
  return out;
}

/* ---------- o que é chão ---------- */
EstacaoScene.prototype.naPassarela = function (x, y) {
  var tronco = x > ITQ.passX0 + ITQ_PISA && x < ITQ.passX1 - ITQ_PISA && y >= ITQ.passY0 - 4 && y < ITQ.passY1;
  var braco = y > ITQ.cruzY0 + ITQ_PISA && y < ITQ.cruzY1 - ITQ_PISA && x > ITQ.bracoX0 && x < ITQ.bracoX1;
  return tronco || braco;
};

/* true/false quando a Itaquera decide; null quando vale a regra de sempre */
EstacaoScene.prototype.podeIrItq = function (x, y) {
  if (y < ESC_Y) {
    if (x < PLAT_X0 || x > PLAT_X1 || y < platY(80)) return false;
    return !this.bateNaPlataforma(x, y);
  }
  if (y < 116) return null;                          // a escada é a de sempre
  if (y > ITQ.passY0 || x < 0 || x > GW) return this.naPassarela(x, y);
  return null;                                       // o mezanino é o saguão de sempre
};

EstacaoScene.prototype.bateNaPlataforma = function (x, y) {
  for (var i = 0; i < ITQ_PILARES.length; i++) {
    var py = PLAT_Y + ITQ_PILARES[i];      // y da textura da plataforma → mundo
    // o pilar, e o banco colado nele (à direita): de pé, contorna-se
    if (Math.hypot(x - ITQ_PILAR_X, y - py) < ITQ_PILAR_R + 7) return true;
    if (x > ITQ_BANCO.x0 - 4 && x < ITQ_BANCO.x0 + ITQ_BANCO.n * ITQ_BANCO.assento + 4 &&
        y > py - 12 && y < py + ITQ_BANCO.prof + 4) return true;
  }
  return false;
};

/* ---------- a plataforma larga ---------- */
EstacaoScene.prototype.pintaPlataformaItq = function (g, l) {
  var alt = PLAT_ALT, pts = portasDoTrem(), i;
  g.translateCanvas(-ITQ.outraX0, 0);

  // a plataforma vizinha: parede vermelha lá no fundo, piso, faixa tátil na beira
  g.fillStyle(num(PAL.paredeSom), 1).fillRect(ITQ.outraX0, 0, 26, alt);
  g.fillStyle(l.num, 1).fillRect(ITQ.outraX0, 0, 20, alt);
  pintaPisoPlat(g, ITQ.outraX0 + 26, ITQ.outraX1 - 16, alt);
  g.fillStyle(num(PAL.amareloSom), 1).fillRect(ITQ.outraX1 - 16, 0, 16, alt);
  g.fillStyle(num(PAL.amarelo), 1).fillRect(ITQ.outraX1 - 16, 0, 14, alt);
  g.fillStyle(0x000000, 0.6).fillRect(ITQ.outraX1, 0, 8, alt);

  // a nossa via, com a borda e a faixa tátil de sempre (as portas de plataforma cobrem a faixa)
  pintaVia(g, 0, 100, alt, -1);
  pintaPisoPlat(g, 124, ITQ.paredeX, alt);
  for (i = 0; i < pts.length; i++) marcaDePorta(g, 150, pts[i] + 26, -1);

  // o piso tátil de guia, que corre a plataforma e cruza na frente de cada porta
  g.fillStyle(0x8a93ad, 0.45).fillRect(226, 0, 10, alt);
  g.fillStyle(0xffffff, 0.12);
  for (var ty = 2; ty < alt; ty += 6) g.fillRect(228, ty, 6, 2);
  for (i = 0; i < pts.length; i++) {
    g.fillStyle(0x8a93ad, 0.45).fillRect(160, pts[i] + 22, 66, 8);
  }

  // pilares de concreto e os bancos laranja colados neles
  for (i = 0; i < ITQ_PILARES.length; i++) {
    var py = ITQ_PILARES[i];
    g.fillStyle(0x000000, 0.3).fillCircle(ITQ_PILAR_X + 3, py + 4, ITQ_PILAR_R + 2);
    g.fillStyle(0x9d9a92, 1).fillCircle(ITQ_PILAR_X, py, ITQ_PILAR_R);
    g.fillStyle(0xc9c6bd, 1).fillCircle(ITQ_PILAR_X - 3, py - 3, ITQ_PILAR_R - 5);
    // o banco: a base de metal e quatro assentos laranja com encosto (o encosto em cima)
    var bw = ITQ_BANCO.n * ITQ_BANCO.assento;
    g.fillStyle(0x000000, 0.3).fillRect(ITQ_BANCO.x0 + 3, py - 6, bw, ITQ_BANCO.prof + 6);
    g.fillStyle(0x3a3a44, 1).fillRect(ITQ_BANCO.x0, py - 8, bw, ITQ_BANCO.prof + 4);
    for (var s = 0; s < ITQ_BANCO.n; s++) {
      var sx = ITQ_BANCO.x0 + s * ITQ_BANCO.assento + 1;
      g.fillStyle(0xa8410f, 1).fillRect(sx, py - 10, ITQ_BANCO.assento - 2, 6);                  // o encosto
      g.fillStyle(0xd9601c, 1).fillRect(sx + 1, py - 9, ITQ_BANCO.assento - 4, 3);
      g.fillStyle(0xb04a14, 1).fillRect(sx, py - 3, ITQ_BANCO.assento - 2, ITQ_BANCO.prof - 2);  // o assento
      g.fillStyle(0xf07a2a, 1).fillRect(sx + 1, py - 3, ITQ_BANCO.assento - 4, ITQ_BANCO.prof - 5);
      g.fillStyle(0xffb070, 0.7).fillRect(sx + 2, py - 2, ITQ_BANCO.assento - 6, 2);
    }
  }

  // a parede da direita, com a faixa vermelha e os quadros de mapa
  g.fillStyle(num(PAL.paredeSom), 1).fillRect(ITQ.paredeX, 0, ITQ.platX2 - ITQ.paredeX, alt);
  g.fillStyle(num(PAL.parede), 1).fillRect(ITQ.paredeX + 4, 0, ITQ.platX2 - ITQ.paredeX - 4, alt);
  g.fillStyle(num(escurecer(l.cor, 0.45)), 1).fillRect(ITQ.paredeX + 2, 0, 22, alt);
  g.fillStyle(l.num, 1).fillRect(ITQ.paredeX + 4, 0, 18, alt);
  for (i = 0; i < MAPAS_PLAT.length; i++) {
    if (MAPAS_PLAT[i] + MAPA_PLAT.h < alt) quadroDeMapa(g, MAPA_PLAT.x, MAPAS_PLAT[i], MAPA_PLAT.w, MAPA_PLAT.h);
  }
  g.translateCanvas(ITQ.outraX0, 0);
};

/* ---------- a passarela e os braços ---------- */
EstacaoScene.prototype.pintaPassarela = function (g) {
  var x0 = ITQ.mundoX0, y0 = ITQ.passY0 - 60, larg = ITQ.mundoX1 - ITQ.mundoX0, alt = ITQ.passY1 + 90 - y0;
  g.translateCanvas(-x0, -y0);

  // lá fora: grama, e o asfalto da Radial correndo por baixo
  g.fillStyle(0x2b3d2c, 1).fillRect(x0, y0, larg, alt);
  pontilhado(g, x0, y0, larg, alt, 0x000000, 0.12, 6);
  g.fillStyle(0x3a3a44, 1).fillRect(x0, ITQ.cruzY1 + 70, larg, 90);
  g.fillStyle(0xf2f0ff, 0.5);
  for (var fx = x0; fx < x0 + larg; fx += 40) g.fillRect(fx, ITQ.cruzY1 + 113, 20, 3);

  // um trecho de corredor coberto: piso claro, parede branca, a viga vermelha em cima
  var corredor = function (x, y, w, h, deitado) {
    g.fillStyle(0x000000, 0.35).fillRect(x + 4, y + 6, w, h);                 // sombra no chão
    g.fillStyle(0xd9d6cf, 1).fillRect(x, y, w, h);                            // a estrutura
    var m = 6;
    g.fillStyle(0x9a948a, 1).fillRect(x + m, y + m, w - 2 * m, h - 2 * m);    // o piso
    for (var ly = y + m; ly < y + h - m; ly += 16) {
      for (var lx = x + m; lx < x + w - m; lx += 16) {
        g.fillStyle((((lx - x) / 16 + (ly - y) / 16) % 2) ? 0x8f897f : 0x9d978d, 1);
        g.fillRect(lx + 1, ly + 1, Math.min(14, x + w - m - lx - 1), Math.min(14, y + h - m - ly - 1));
      }
    }
    // o vidro dos dois lados e a viga vermelha, que é o que se vê da passarela de fora
    g.fillStyle(0x7fa8c8, 0.55);
    if (deitado) { g.fillRect(x, y + 2, w, 3); g.fillRect(x, y + h - 5, w, 3); }
    else { g.fillRect(x + 2, y, 3, h); g.fillRect(x + w - 5, y, 3, h); }
    g.fillStyle(0xe8362c, 1);
    if (deitado) { g.fillRect(x, y, w, 2); g.fillRect(x, y + h - 2, w, 2); }
    else { g.fillRect(x, y, 2, h); g.fillRect(x + w - 2, y, 2, h); }
  };
  corredor(ITQ.passX0, ITQ.passY0 - 4, ITQ.passX1 - ITQ.passX0, ITQ.passY1 - ITQ.passY0 + 4, false);
  corredor(ITQ.bracoX0, ITQ.cruzY0, ITQ.passX0 - ITQ.bracoX0 + 6, ITQ.cruzY1 - ITQ.cruzY0, true);
  corredor(ITQ.passX1 - 6, ITQ.cruzY0, ITQ.bracoX1 - ITQ.passX1 + 6, ITQ.cruzY1 - ITQ.cruzY0, true);
  // o cruzamento: o piso passa por cima da emenda
  g.fillStyle(0x9a948a, 1).fillRect(ITQ.passX0 + 6, ITQ.cruzY0 + 6, ITQ.passX1 - ITQ.passX0 - 12, ITQ.cruzY1 - ITQ.cruzY0 - 12);
  g.fillStyle(0xe8362c, 0.25).fillCircle(ITQ_MEIO_X, ITQ_MEIO_Y, 24);

  // Saída A: a fachada do shopping, bege, com as portas de vidro
  var ax = ITQ.bracoX0 - 34;
  g.fillStyle(0xcdbf9f, 1).fillRect(ax, ITQ.cruzY0 - 40, 40, ITQ.cruzY1 - ITQ.cruzY0 + 80);
  g.fillStyle(0xe6dcc4, 1).fillRect(ax + 4, ITQ.cruzY0 - 36, 30, ITQ.cruzY1 - ITQ.cruzY0 + 72);
  g.fillStyle(0x6f93b3, 1).fillRect(ax + 30, ITQ.cruzY0 + 10, 10, ITQ.cruzY1 - ITQ.cruzY0 - 20);
  // Saída C/D: a escada que desce pra Radial, com a Arena lá atrás
  var cx = ITQ.bracoX1;
  for (var dg = 0; dg < 6; dg++) {
    g.fillStyle(dg % 2 ? 0x8a857c : 0xa39e94, 1).fillRect(cx + dg * 8, ITQ.cruzY0 + 6, 8, ITQ.cruzY1 - ITQ.cruzY0 - 12);
  }
  g.fillStyle(0xe6e6ea, 1).fillRect(cx + 50, ITQ.cruzY0 - 120, 50, 90);                 // a Arena, de longe
  g.fillStyle(0x1a1a1e, 1).fillRect(cx + 54, ITQ.cruzY0 - 112, 42, 6);
  // Saída B: a escada que desce pro terminal, e a cobertura branca dos ônibus
  var by = ITQ.passY1;
  for (var db = 0; db < 5; db++) {
    g.fillStyle(db % 2 ? 0x8a857c : 0xa39e94, 1).fillRect(ITQ.passX0 + 6, by + db * 8, ITQ.passX1 - ITQ.passX0 - 12, 8);
  }
  g.fillStyle(0xeceae4, 1).fillRect(ITQ.passX0 - 60, by + 44, ITQ.passX1 - ITQ.passX0 + 120, 26);
  g.fillStyle(0xe8362c, 1).fillRect(ITQ.passX0 + 70, by + 50, 36, 12);                   // um ônibus chegando
  g.translateCanvas(x0, y0);
};

/* ---------- monta tudo, no create ---------- */
EstacaoScene.prototype.montaItaquera = function () {
  var eu = this, l = GameState.linhaAtual(), i;
  // o fundo de fora do mundo de 320px
  var fundo = this.add.graphics().setDepth(-2);
  fundo.fillStyle(num(PAL.bg), 1).fillRect(ITQ.mundoX0, PLAT_Y - 8, ITQ.mundoX1 - ITQ.mundoX0, ITQ.passY1 + 100 - PLAT_Y);

  var y0 = ITQ.passY0 - 60;
  texturaDeCena(this, 'est_itq_passarela', ITQ.mundoX1 - ITQ.mundoX0, ITQ.passY1 + 90 - y0,
    function (g) { eu.pintaPassarela(g); });
  this.add.image(ITQ.mundoX0, y0, 'est_itq_passarela').setOrigin(0, 0).setDepth(-1);

  // a boca da passarela na parede de baixo do saguão
  var boca = this.add.graphics().setDepth(0.5);
  boca.fillStyle(0xd9d6cf, 1).fillRect(ITQ.passX0, 512, ITQ.passX1 - ITQ.passX0, 64);
  boca.fillStyle(0x9a948a, 1).fillRect(ITQ.passX0 + 6, 512, ITQ.passX1 - ITQ.passX0 - 12, 64);
  boca.fillStyle(0xe8362c, 1).fillRect(ITQ.passX0, 512, 2, 64).fillRect(ITQ.passX1 - 2, 512, 2, 64);

  // a plataforma vizinha, com a gente esperando do outro lado da via
  var n = Math.round(6 + 22 * GameState.lotacao());
  for (i = 0; i < n; i++) {
    var v = new Ator(this, ITQ.outraX0 + 40 + Math.random() * (ITQ.outraX1 - ITQ.outraX0 - 64),
      platY(80 + Math.random() * (PLAT_ALT - 140)), sorteiaPax());
    v.dir = 'right'; v.anima(0, false); v.sp.setDepth(25);
  }

  // as placas: finas, vermelhas, penduradas, como nas fotos
  // o nome corre ao longo da plataforma, pendurado sobre o piso perto dos pilares
  placaItq(this, 300, platY(300), placaDe('ITAQUERA'), true);
  placaItq(this, 300, platY(560), placaDe('ITAQUERA'), true);
  placaItq(this, 250, platY(740), 'SAÍDA ▼');
  placaItq(this, ITQ_MEIO_X, ITQ.passY0 + 40, '▲ CATRACAS');
  // presas na parede de cima do braço, e não soltas no meio do corredor
  placaItq(this, ITQ.bracoX0 + 90, ITQ.cruzY0 - 6, '◄ A  SHOPPING');
  placaItq(this, ITQ.bracoX1 - 90, ITQ.cruzY0 - 6, 'C/D  RADIAL E ARENA ►');
  placaItq(this, ITQ_MEIO_X, ITQ.passY1 - 90, '▼ B  CPTM E TERMINAL');

  // uns assentos já vêm ocupados; no pico, a maioria
  this.assentos = assentosItq();
  for (i = 0; i < this.assentos.length; i++) {
    var as = this.assentos[i];
    if (Math.random() > 0.25 + 0.5 * GameState.lotacao()) continue;
    var sn = new Ator(this, as.x, as.y + 10, sorteiaPax());
    sn.dir = 'sentadoFrente'; sn.anima(0, false); sn.sp.setDepth(29); sn.fixo = true;
    as.npc = sn;
  }
  this.sentadoPlat = null;

  // as portas de plataforma: redesenhadas a cada quadro, porque abrem junto com o trem
  this.gPSD = this.add.graphics().setDepth(21);
  this.passantes = [];
  this.tPassante = 0;
};

/* ---------- a placa do metrô, fina ----------
   A placaSaida do resto do jogo é chapa grossa, de letra de 12px: na
   passarela de 88px ela tampava o corredor inteiro ('muito grosseiras',
   foi o veredito). A da Itaquera é a das fotos: chapa vermelha baixa, com
   friso branco em cima e letra de 6px (escala 1, a menor nítida). */
/* `emPe`: a placa corre paralela aos trilhos (a do nome da estação, nas
   fotos); deitada, ela atravessa o caminho (a de SAÍDA). Pendurada, ela
   mostra os dois ganchos e a sombra cai deslocada no chão: solta no meio
   do piso, sem nada, lia como jogada ali. */
function placaItq(cena, x, y, texto, emPe) {
  var t = txtC(cena, x, y, texto, PAL.branco, 8).setScale(ESCALA_TEXTO / 2).setDepth(46);
  var comp = Math.round(t.width) + 12, esp = 13;
  var w = emPe ? esp : comp, h = emPe ? comp : esp;
  var x0 = Math.round(x - w / 2), y0 = Math.round(y - h / 2);
  if (emPe) t.setOrigin(0.5, 0.5).setAngle(90).setPosition(x, y);
  else t.setOrigin(0.5, 0.5).setPosition(x, y + 1);
  var g = cena.add.graphics().setDepth(45);
  g.fillStyle(0x000000, 0.28).fillRect(x0 + 6, y0 + 8, w, h);               // a sombra, longe: está no alto
  // os cabos, dos ganchos até o teto (pra cima na tela)
  g.fillStyle(0x2a2a32, 1);
  if (emPe) { g.fillRect(x - 1, y0 + 3, 2, 3).fillRect(x - 1, y0 + h - 6, 2, 3); }
  else { g.fillRect(x0 + 4, y0 - 6, 2, 6).fillRect(x0 + w - 6, y0 - 6, 2, 6); }
  g.fillStyle(0x8e1c16, 1).fillRect(x0, y0, w, h);
  g.fillStyle(0xd9332a, 1).fillRect(x0 + 1, y0 + 1, w - 2, h - 2);
  g.fillStyle(0xffffff, 0.85);                                                // o friso
  if (emPe) g.fillRect(x0 + 1, y0 + 3, 1, h - 6); else g.fillRect(x0 + 3, y0 + 1, w - 6, 1);
  return t;
}

/* Onde você aparece, e a câmera presa em você nos dois eixos. */
EstacaoScene.prototype.posicionaItaquera = function (noAlto) {
  if (!noAlto) {
    var s = SAIDAS_ITQ[saidaDeCasa()];
    this.pl.sp.x = s.x; this.pl.sp.y = s.y; this.pl.dir = s.dir; this.pl.anima(0, false);
  }
  // a câmera presa no personagem, nos dois eixos (o mundo aqui é mais largo que a tela)
  var cam = this.cameras.main;
  cam.setBounds(ITQ.mundoX0, PLAT_Y - 8, ITQ.mundoX1 - ITQ.mundoX0, ITQ.passY1 + 90 - (PLAT_Y - 8));
  cam.startFollow(this.pl.sp, true, 1, 1);
  cam.setFollowOffset(0, -Math.round(HUD_H / 2));
  cam.centerOn(this.pl.sp.x, this.pl.sp.y - Math.round(HUD_H / 2));

  /* O dia começa mais cedo, na medida da caminhada extra: da porta de
     casa até as catracas, contra os 256px do saguão de antes, na
     velocidade de quem está jogando. Uma vez por dia. */
  if (!noAlto && !GameState.treino && GameState.pernaIdx === 0 && GameState._itqCompensado !== GameState.dia) {
    GameState._itqCompensado = GameState.dia;
    var s2 = SAIDAS_ITQ[saidaDeCasa()];
    var dist = Math.abs(s2.x - ITQ_MEIO_X) + (s2.y - 244);
    var extra = Math.max(0, Math.round((dist - 256) / GameState.char.velocidade));
    // o relógio e a saída voltam juntos, e a perna ganha a folga do caminho
    GameState.minutos = (GameState.minutos - extra + 1440) % 1440;
    GameState.minutoSaida = (GameState.minutoSaida - extra + 1440) % 1440;
    GameState.folgaPerna = extra;
  }
  if (this.praCasa) {
    var c = SAIDAS_ITQ[saidaDeCasa()];
    var al = this.alerta, eu = this;
    al.setText('CASA: ' + c.rotulo + '\n' + c.lugar);
    this.time.delayedCall(3200, function () { if (eu.alerta === al) al.setText(''); });
  }
};

/* ---------- sentar no banco da plataforma ----------
   O mesmo gesto do vagão: toca perto de um assento livre, senta de
   frente e o descanso volta no mesmo ritmo de lá (0,0018 por ms).
   Qualquer direção levanta, e você fica de pé na frente do banco. */
EstacaoScene.prototype.assentoPerto = function () {
  if (!this.assentos) return null;
  var melhor = null, dm = 24;
  for (var i = 0; i < this.assentos.length; i++) {
    var a = this.assentos[i];
    if (a.npc) continue;
    var d = Math.hypot(this.pl.sp.x - a.x, this.pl.sp.y - (a.y + ITQ_BANCO.prof + 8));
    if (d < dm) { dm = d; melhor = a; }
  }
  return melhor;
};
EstacaoScene.prototype.sentaPlat = function (a) {
  this.sentadoPlat = a;
  a.npc = 'player';
  this.pl.sp.x = a.x; this.pl.sp.y = a.y + 10;
  this.pl.dir = 'sentadoFrente'; this.pl.anima(0, false);
  GameState.sentado = true;
  sfx('ok');
};
EstacaoScene.prototype.levantaPlat = function () {
  var a = this.sentadoPlat;
  if (!a) return;
  a.npc = null;
  this.pl.sp.x = a.x; this.pl.sp.y = a.y + ITQ_BANCO.prof + 10;
  this.pl.dir = 'down'; this.pl.anima(0, false);
  this.sentadoPlat = null;
  GameState.sentado = false;
};

/* ---------- a cada quadro ---------- */
EstacaoScene.prototype.atualizaItaquera = function (dt) {
  if (this.sentadoPlat) {
    GameState.addDescanso(0.0018 * dt);
    if (Ctrl.left || Ctrl.right || Ctrl.up || Ctrl.down) this.levantaPlat();
    else { this.pl.dir = 'sentadoFrente'; this.pl.anima(0, false); }
  }
  this.pintaPSD();
  this.andaPassantes(dt);

  // as portas pra rua
  var s = this.saidaSob(this.pl.sp.x, this.pl.sp.y);
  if (s && !this.naSaida) { this.naSaida = true; this.saiPor(s); }
  else if (!s) this.naSaida = false;
};

EstacaoScene.prototype.saidaSob = function (x, y) {
  if (y > ITQ.cruzY0 && y < ITQ.cruzY1) {
    if (x < ITQ.bracoX0 + 18) return 'A';
    if (x > ITQ.bracoX1 - 18) return 'C';
  }
  if (y > ITQ.passY1 - 18 && x > ITQ.passX0 && x < ITQ.passX1) return 'B';
  return null;
};

EstacaoScene.prototype.saiPor = function (s) {
  var eu = this, al = this.alerta;
  var devolve = function (x, y) {
    eu.pl.sp.x = x; eu.pl.sp.y = y;
    eu.time.delayedCall(2600, function () { if (eu.alerta === al) al.setText(''); });
  };
  var porta = SAIDAS_ITQ[s];
  if (!this.praCasa) {
    // na ida não se volta pra rua: o dia é pro outro lado
    sfx('nao');
    al.setText('O TRABALHO É PRO\nOUTRO LADO ▲');
    devolve(porta.x, porta.y);
    return;
  }
  var casa = saidaDeCasa();
  if (s !== casa) {
    /* Na volta não tem prazo, e o dia seguinte zera o relógio: os seis
       minutos sozinhos não custariam nada. Custa o fôlego da volta a pé. */
    GameState.passaTempo(6);
    GameState.addDescanso(-6);
    sfx('nao');
    al.setText('RUA ERRADA. CASA É\n' + SAIDAS_ITQ[casa].rotulo);
    devolve(ITQ_MEIO_X, ITQ_MEIO_Y);
    return;
  }
  this.chegouEmCasa();
};

EstacaoScene.prototype.chegouEmCasa = function () {
  if (this.fim) return;
  this.fim = true;
  GameState.chegouNoDestino();
  var morte = GameState.derrota();
  if (morte) { GameState.motivoFim = morte; this.fim = true; GameState.salvarRecorde(); vaiPraOFim(this); return; }
  sfx('vitoria');
  this.scene.start('Estacao', { onde: 'saguao' });           // dia novo: sai de casa pela mesma porta
};

/* ---------- as portas de plataforma ----------
   Um paredão bege na beirada (x 108..122), com vidro, e uma porta na
   frente de cada porta do trem. Elas abrem junto com as dele (a mesma
   `abertura`, de 0 a 1), então só se embarca por elas. */
EstacaoScene.prototype.pintaPSD = function () {
  var g = this.gPSD; g.clear();
  var t = this.trens[0], a = t ? (t.abertura || 0) : 0;
  var pts = portasDoTrem(), x0 = 108, w = 14, i;
  var y = PLAT_Y, fimY = ESC_Y;
  var painel = function (ya, yb) {
    if (yb - ya < 4) return;
    g.fillStyle(0x8f8672, 1).fillRect(x0, ya, w, yb - ya);
    g.fillStyle(0xe2d8bc, 1).fillRect(x0 + 1, ya, w - 3, yb - ya);
    g.fillStyle(0x7fa8c8, 0.55).fillRect(x0 + 4, ya + 3, 5, yb - ya - 6);
  };
  var ini = y;
  for (i = 0; i < pts.length; i++) {
    var py = platY(pts[i] + HUD_H), fim = py + 52;
    painel(ini, py);
    // as duas folhas de vidro, que correm pra dentro do paredão
    var folha = Math.round(26 * (1 - a));
    if (folha > 0) {
      g.fillStyle(0x8f8672, 1).fillRect(x0 + 2, py, w - 5, folha).fillRect(x0 + 2, fim - folha, w - 5, folha);
      g.fillStyle(0x9cc3de, 0.8).fillRect(x0 + 4, py + 1, w - 9, folha - 2).fillRect(x0 + 4, fim - folha + 1, w - 9, folha - 2);
      // a faixa amarela e preta de aviso, na altura do meio
      g.fillStyle(0xf2c14e, 1).fillRect(x0 + 2, py + folha - 3, w - 5, 2).fillRect(x0 + 2, fim - folha + 1, w - 5, 2);
    }
    if (a > 0.6) g.fillStyle(0x00e676, 0.35).fillRect(x0 + w, py, 6, 52);    // a luz verde no chão
    ini = fim;
  }
  painel(ini, fimY);
};

/* ---------- quem anda pela passarela ----------
   Gente que vem da rua e vai pro mezanino, e gente que atravessa de uma
   saída pra outra (do terminal pro shopping, da Radial pra CPTM). Não
   some no meio: nasce numa porta e morre noutra, ou vira gente do
   saguão quando chega nele. */
var ITQ_PONTOS = {
  A: function () { return { x: ITQ.bracoX0 + 14, y: ITQ_MEIO_Y + (Math.random() - 0.5) * 40 }; },
  C: function () { return { x: ITQ.bracoX1 - 14, y: ITQ_MEIO_Y + (Math.random() - 0.5) * 40 }; },
  B: function () { return { x: ITQ_MEIO_X + (Math.random() - 0.5) * 50, y: ITQ.passY1 - 10 }; },
  saguao: function () { return { x: ITQ_MEIO_X + (Math.random() - 0.5) * 50, y: ITQ.passY0 + 6 }; }
};
EstacaoScene.prototype.novoPassante = function (de, para, ator) {
  var p0 = ITQ_PONTOS[de](), p1 = ITQ_PONTOS[para]();
  var a = ator || new Ator(this, p0.x, p0.y, sorteiaPax());
  a.sp.setDepth(40);
  a.sp.passante = true; a.sp.dentro = false; a.sp.naEscada = false;
  var meio = { x: ITQ_MEIO_X + (Math.random() - 0.5) * 50, y: ITQ_MEIO_Y + (Math.random() - 0.5) * 40 };
  a.rota = [meio, p1];
  a.destinoItq = para;
  a.vel = 48 + Math.random() * 24;
  // fora da lista de corpos: a passarela é corredor, e o limite do saguão os puxaria de volta
  this.passantes.push(a);
  return a;
};
EstacaoScene.prototype.andaPassantes = function (dt) {
  var alvoN = Math.round(3 + 9 * GameState.lotacao());
  this.tPassante -= dt;
  if (this.passantes.length < alvoN && this.tPassante <= 0) {
    this.tPassante = 900 + Math.random() * 1400;
    var portas = ['A', 'B', 'C'], de = portas[Math.floor(Math.random() * 3)];
    var para = portas[Math.floor(Math.random() * 3)];
    if (para === de) para = 'saguao';
    this.novoPassante(de, para);
  }
  for (var i = this.passantes.length - 1; i >= 0; i--) {
    var a = this.passantes[i];
    if (!a.sp || !a.sp.active) { this.passantes.splice(i, 1); continue; }
    var alvo = a.rota[0];
    var dx = alvo.x - a.sp.x, dy = alvo.y - a.sp.y, d = Math.sqrt(dx * dx + dy * dy);
    if (d < 6) {
      a.rota.shift();
      if (!a.rota.length) {
        this.passantes.splice(i, 1);
        if (a.destinoItq === 'saguao') {
          // chegou no mezanino: vira gente do saguão, que vai pra fila da catraca
          a.sp.passante = false; a.indo = null;
          this.plateia.push(a);
        } else {
          a.sp.destroy();
        }
      }
      continue;
    }
    var v = Math.min(d, a.vel * dt / 1000);
    a.sp.x += dx / d * v; a.sp.y += dy / d * v;
    a.setDir(dx, dy);
    a.anima(dt, true);
  }
};

/* ---------- o rodapé, fora do mezanino ---------- */
EstacaoScene.prototype.contextoItq = function () {
  var x = this.pl.sp.x, y = this.pl.sp.y;
  if (y < ESC_Y) {
    if (this.sentadoPlat) { this.dica.setText('SENTADO. ANDE PRA LEVANTAR', PAL.cinza); return true; }
    // a porta aberta e o ambulante mandam mais que o banco
    if (this.tremNaPorta() || this.ambulantePerto()) return false;
    var as = this.assentoPerto();
    if (!as) return false;
    this.dica.setText(nomeAgir() + ': SENTAR', PAL.amarelo);
    if (Ctrl.actJust) this.sentaPlat(as);
    return true;
  }
  if (!(y > ITQ.passY0 || x < 0 || x > GW) || y < ESC_Y) return false;
  var dica;
  if (this.praCasa) {
    var c = SAIDAS_ITQ[saidaDeCasa()];
    dica = 'CASA: ' + c.rotulo + ' ' + c.seta;
  } else dica = '▲ CATRACAS E PLATAFORMA';
  this.dica.setText(dica, PAL.amarelo);
  return true;
};
