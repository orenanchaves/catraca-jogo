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
  mundoX0: -380, mundoX1: 880,
  fundoY: 1440,                     // o fim do mundo embaixo: passa do estacionamento da Arena
  radialY: 930                      // a Radial Leste corre entre a passarela e a Arena
};
/* ---------- o lado de fora, que dá pra andar ----------
   Da Saída C/D a escada desce pra calçada, a faixa de pedestre atravessa
   a Radial, a SUBIDONA (a rampa comprida dos mapas de acesso) leva à
   esplanada, e a esplanada contorna a Arena até o estacionamento. A rua
   de verdade, pra quem mora pra esse lado, é o pé do estacionamento. */
/* Os trechos se sobrepõem uns pixels de propósito: colados na mesma
   linha, sobrava um fio sem chão entre eles, e o boneco travava ali.
   A calçada continua o braço pra fora e desce pelo lado LESTE da Arena:
   com a Arena grande, a subidona não cabe entre ela e a passarela. */
var FORA = {
  calcada: { x0: 632, x1: 836, y0: 824, y1: 906 },
  descida: { x0: 768, x1: 836, y0: 824, y1: 936 },
  faixa: { x0: 772, x1: 832, y0: 926, y1: 1000 },
  rampa: { x0: 772, x1: 832, y0: 990, y1: 1090 },
  esplanada: { x0: 200, x1: 850, y0: 996, y1: 1430 }
};
function dentroDe(r, x, y) { return x > r.x0 && x < r.x1 && y > r.y0 && y < r.y1; }
/* A Arena, vista de fora e de cima. Fica ABAIXO do braço da Saída C/D,
   do outro lado da Radial, como nos mapas de acesso: andando pelo braço,
   com a câmera presa em você, ela aparece embaixo da tela. */
var ARENA = { x: 250, y: 1040, w: 500, h: 300 };
var ITQ_PISA = 6;                   // o boneco não encosta na parede da passarela
/* ---------- o mezanino largo ----------
   O saguão das outras estações tem 320px, a tela. O da Itaquera é uma
   fileira comprida de catracas, como na foto: 560px (x -120 a 440), com
   doze catracas, a bilheteria e o achados e perdidos na parede da
   esquerda. A escada e a boca da passarela continuam no mesmo lugar. */
var MEZ = { x0: -120, x1: 440 };
/* ---------- a galeria ----------
   Um corredor largo logo embaixo do saguão, atravessando de um lado a
   outro, com as lojas lado a lado na parede de cima (a parede do fim do
   saguão vira a fachada delas), viradas pra galeria. A passarela desce
   do meio dela. Três lojas de cada lado da boca da passarela. */
var GAL = { x0: -300, x1: 592, lojaY: 520, lojaH: 58, piso0: 578, piso1: 668 };
var ITQ_MEIO_X = (ITQ.passX0 + ITQ.passX1) / 2;
var ITQ_MEIO_Y = (ITQ.cruzY0 + ITQ.cruzY1) / 2;

/* As três portas pra rua. `x,y` é onde você aparece ao entrar por ela, já
   do lado de dentro, olhando pra estação. */
var SAIDAS_ITQ = {
  A: { rotulo: 'SAÍDA A', lugar: 'SHOPPING', x: ITQ.bracoX0 + 34, y: ITQ_MEIO_Y, dir: 'right', seta: '◄' },
  B: { rotulo: 'SAÍDA B', lugar: 'CPTM E TERMINAL', x: ITQ_MEIO_X, y: ITQ.passY1 - 34, dir: 'up', seta: '▼' },
  C: { rotulo: 'SAÍDA C/D', lugar: 'RADIAL E ARENA', x: 800, y: 1398, dir: 'up', seta: '►' }
};
/* Pra que lado cada um mora. O estudante vem de ônibus (terminal); o
   senhor e a gestante moram do lado do shopping; o CLT e o ambulante,
   pra Radial; o turista veio ver jogo na Arena. */
var CASA_SAIDA = { estudante: 'B', clt: 'C', senhor: 'A', ambulante: 'C', gestante: 'A', turista: 'C', torcedor: 'C' };
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

/* As seis lojas: o que cada uma vende, e onde fica. Vendem só o que o
   jogo já sabe vender (ITENS do core). */
function lojasDaGaleria() {
  /* O que existe de verdade nas estações grandes: lanche rápido pra quem
     tá com pressa, acessório de celular, banca, caixa 24 horas, recarga
     do Bilhete Único, a perfumaria e a lotérica (na transição pro
     shopping, mas todo mundo conta como "dentro").
     Lado a lado, com 20px de vão entre uma e outra ('redistribui o
     espaçamento'): a galeria cresceu pros dois lados (de -300 a 592)
     pra caber, com 48px de piso antes do dog e depois da lotérica, pra
     nenhuma das duas ficar espremida na ponta. A esquerda termina em 70: dali até 188 é a boca da
     passarela. */
  var L = [
    ['dog', -244, 68, '"DOG DO CÃO, freguês!\nO monstro da estação."', ['dogao', 'agua', 'chocolate']],
    ['salgados', -156, 68, '"Coxinha saindo agora!\nPão de queijo, café."', ['coxinha', 'paoQueijo', 'cafe']],
    ['celular', -68, 68, '"Capinha, película, fone.\nPower bank tem também."', ['powerbank', 'capinha', 'fone']],
    ['atm', 20, 38, null, null, 'saque'],
    ['banca', 204, 68, '"Jornal, bala, pururuca."', ['jornal', 'pururuca', 'doce']],
    ['recarga', 292, 68, null, null, 'recarga'],
    ['boticario', 380, 68, '"Um perfume pro dia render?"', ['perfume', 'desodorante']],
    ['loterica', 468, 68, '"Raspadinha, patrão?\nHoje é seu dia."', ['raspadinha']]
  ];
  var out = [];
  for (var i = 0; i < L.length; i++) {
    var e = ESTILO_LOJA[L[i][0]];
    out.push({ chave: L[i][0], nome: e.nome, cor: e.cor, x: L[i][1], y: GAL.lojaY, w: L[i][2], h: GAL.lojaH,
      lado: 0, titulo: L[i][3], cardapio: L[i][4], acao: L[i][5] || null });
  }
  return out;
}

/* ---------- as lixeiras ----------
   Inox, boca preta e a faixa verde, espalhadas nos cantos: mezanino,
   galeria e plataforma (do lado dos pilares). Lixeira é coisa em que se
   esbarra; e quem comeu alguma coisa pode jogar o papel nela. */
function lixeirasItq() {
  return [
    { x: MEZ.x0 + 36, y: 476 }, { x: MEZ.x1 - 36, y: 476 }, { x: 214, y: 506 },
    { x: -278, y: GAL.piso1 - 10 }, { x: 250, y: GAL.piso1 - 10 }, { x: 566, y: GAL.piso1 - 10 },
    { x: ITQ_PILAR_X - 26, y: PLAT_Y + ITQ_PILARES[0] + 4 },
    { x: ITQ_PILAR_X - 26, y: PLAT_Y + ITQ_PILARES[2] + 4 }
  ];
}
function pintaLixeira(g, x, y) {
  g.fillStyle(0x000000, 0.3).fillEllipse(x + 2, y + 1, 16, 6);
  g.fillStyle(0x7a7c86, 1).fillRect(x - 6, y - 14, 12, 14);
  g.fillStyle(0xb8bac4, 1).fillRect(x - 5, y - 14, 3, 14);
  g.fillStyle(0x2f7d5e, 1).fillRect(x - 6, y - 7, 12, 3);
  g.fillStyle(0x9a9ca4, 1).fillEllipse(x, y - 14, 14, 6);
  g.fillStyle(0x0a0a10, 1).fillEllipse(x, y - 14, 9, 3);
}
EstacaoScene.prototype.bateNaLixeira = function (x, y) {
  if (!this.lixeiras) return false;
  for (var i = 0; i < this.lixeiras.length; i++) {
    var l = this.lixeiras[i];
    if (Math.abs(x - l.x) < 10 && y > l.y - 6 && y < l.y + 4) return true;
  }
  return false;
};
/* ---------- as tomadas ----------
   'Tem que ter tomada pra carregar o celular.' Na parede, na altura do
   chão de quem passa: encosta, toca, e o boneco fica ali carregando, com
   o fio ligado na tomada, 4% por segundo. Andar desliga. */
/* De lado, acompanhando a parede ('tem que ficar meio de lado'): toda
   tomada mora numa parede lateral, e vista de cima ela é uma plaquinha
   estreita em perspectiva, com a boca virada pro corredor. lado 1 é a
   parede da esquerda (a tomada olha pra direita); -1, a da direita. */
function pintaTomada(g, x, y, lado) {
  var d = lado || 1;
  g.fillStyle(0x000000, 0.25).fillRect(x + (d > 0 ? 0 : -3), y - 5, 3, 12);
  g.fillStyle(0xe8e8f0, 1).fillPoints([
    { x: x, y: y - 7 }, { x: x + 4 * d, y: y - 5 }, { x: x + 4 * d, y: y + 5 }, { x: x, y: y + 7 }
  ], true);
  g.fillStyle(0xb8bac4, 1).fillRect(x + (d > 0 ? 3 : -4), y - 5, 1, 10);   // a quina que pega sombra
  g.fillStyle(0x2a2a32, 1).fillRect(x + (d > 0 ? 1 : -3), y - 3, 2, 2).fillRect(x + (d > 0 ? 1 : -3), y + 1, 2, 2);
}
EstacaoScene.prototype.montaTomadas = function (lista) {
  this.tomadas = lista;
  var g = this.add.graphics().setDepth(2.6);
  for (var i = 0; i < lista.length; i++) pintaTomada(g, lista[i].x, lista[i].y, lista[i].lado);
  this.gCabo = this.add.graphics().setDepth(39);
  this.carregando = null;
};
EstacaoScene.prototype.tomadaPerto = function () {
  if (!this.tomadas) return null;
  for (var i = 0; i < this.tomadas.length; i++) {
    var t = this.tomadas[i];
    if (Math.hypot(this.pl.sp.x - t.x, this.pl.sp.y - (t.y + 16)) < 30) return t;
  }
  return null;
};
EstacaoScene.prototype.contextoTomada = function () {
  if (this.carregando) {
    this.dica.setText('CARREGANDO ' + Math.floor(GameState.bateria) + '%', PAL.verde);
    if (Ctrl.actJust) this.carregando = null;
    return true;
  }
  var t = this.tomadaPerto();
  if (!t || GameState.bateria >= 99.5) return false;
  this.dica.setText(nomeAgir() + ': CARREGAR (' + Math.floor(GameState.bateria) + '%)', PAL.amarelo);
  if (Ctrl.actJust) { this.carregando = t; sfx('ok'); }
  return true;
};
EstacaoScene.prototype.atualizaCarga = function (dt, andou) {
  var g = this.gCabo;
  if (!g) return;
  g.clear();
  var t = this.carregando;
  if (!t) return;
  if (andou || GameState.bateria >= 100) { this.carregando = null; if (GameState.bateria >= 100) sfx('moeda'); return; }
  GameState.bateria = Math.min(100, GameState.bateria + dt * 0.004);
  // o fio: da tomada até a mão, caindo um pouco no meio
  var hx = this.pl.sp.x + 8, hy = this.pl.sp.y - 16, mx = (t.x + hx) / 2, my = Math.max(t.y, hy) + 10;
  g.lineStyle(2, 0xf0eeff, 0.9);
  g.beginPath(); g.moveTo(t.x, t.y + 2); g.lineTo(mx, my); g.lineTo(hx, hy); g.strokePath();
  g.fillStyle(0x2a2a32, 1).fillRect(hx - 3, hy - 5, 6, 9);
  g.fillStyle(0x00e676, Math.floor(this.time.now / 400) % 2 ? 1 : 0.4).fillRect(hx - 1, hy - 3, 2, 2);
};

// perto de uma lixeira com o papel na mão: jogar é a única coisa a dizer
EstacaoScene.prototype.contextoLixo = function () {
  if (!GameState.lixo || !this.lixeiraPerto()) return false;
  this.dica.setText(nomeAgir() + ': JOGAR NO LIXO', PAL.verde);
  if (Ctrl.actJust) {
    GameState.lixo = false;
    GameState.addCarisma(1);
    sfx('ok');
    this.alerta.setText('+1 CARISMA. LIXO NO LIXO');
    var al = this.alerta, eu = this;
    this.time.delayedCall(1600, function () { if (eu.alerta === al) al.setText(''); });
  }
  return true;
};
EstacaoScene.prototype.lixeiraPerto = function () {
  if (!this.lixeiras) return null;
  for (var i = 0; i < this.lixeiras.length; i++) {
    var l = this.lixeiras[i];
    if (Math.hypot(this.pl.sp.x - l.x, this.pl.sp.y - l.y) < 24) return l;
  }
  return null;
};

/* ---------- as cabines do mezanino ----------
   Duas bilheterias lado a lado, cada uma com o seu atendente, na
   esquerda do lado de fora das catracas, e o achados e perdidos na
   direita. Mesmo molde das lojas: letreiro, parede de dentro,
   atendente e balcão, e quem compra chega por baixo. */
function cabinesDoMezanino() {
  var y = 300, h = 58;
  return [
    // 24px de vão entre as duas: coladas, os letreiros viravam uma palavra só
    { chave: 'bilheteria', nome: 'BILHETERIA', x: MEZ.x0 + 32, y: y, w: 58, h: h, lado: 0, acao: 'bilheteria', ven: 'np_atendente' },
    { chave: 'bilheteria', nome: 'BILHETERIA', x: MEZ.x0 + 114, y: y, w: 58, h: h, lado: 0, acao: 'bilheteria', ven: 'np_atendenteF' },
    { chave: 'achados', nome: 'ACHADOS', x: MEZ.x1 - 110, y: y, w: 76, h: h, lado: 0, acao: 'achados' }
  ];
}

/* ---------- quem compra passagem ----------
   Uma ou duas pessoas na frente de cada guichê, olhando pro atendente.
   A da frente compra (uns quatro segundos), vira passageiro comum e vai
   pra catraca; outra chega de baixo e entra na fila. */
EstacaoScene.prototype.montaCompradores = function () {
  this.compradores = [];
  this.tComprador = 3000;
  for (var i = 0; i < this.barracas.length; i++) {
    var b = this.barracas[i];
    if (b.acao !== 'bilheteria') continue;
    var n = Math.random() < 0.5 + 0.4 * GameState.lotacao() ? 2 : 1;
    for (var k = 0; k < n; k++) this.novoComprador(b, k, true);
  }
};
EstacaoScene.prototype.novoComprador = function (b, k, jaNaFila) {
  var alvo = { x: b.x + b.w / 2, y: b.y + b.h + 14 + k * 22 };
  var a = new Ator(this, jaNaFila ? alvo.x : alvo.x + (Math.random() - 0.5) * 40, jaNaFila ? alvo.y : 500, sorteiaPax());
  a.sp.setDepth(40);
  a.dir = 'up'; a.anima(0, false);
  this.compradores.push({ a: a, cab: b, t: -Math.random() * 1500 });
};
EstacaoScene.prototype.andaCompradores = function (dt) {
  if (!this.compradores) return;
  var porCab = {}, i;
  for (i = 0; i < this.compradores.length; i++) {
    var c = this.compradores[i], chave = c.cab.x;
    var k = porCab[chave] || 0; porCab[chave] = k + 1;
    var ax = c.cab.x + c.cab.w / 2, ay = c.cab.y + c.cab.h + 14 + k * 22;
    var dx = ax - c.a.sp.x, dy = ay - c.a.sp.y, d = Math.sqrt(dx * dx + dy * dy);
    if (d > 2) {
      var v = 42 * dt / 1000;
      c.a.sp.x += dx / d * Math.min(v, d); c.a.sp.y += dy / d * Math.min(v, d);
      c.a.setDir(dx, dy); c.a.anima(dt, true);
      continue;
    }
    c.a.dir = 'up'; c.a.anima(0, false);
    if (k !== 0) continue;
    c.t += dt;
    if (c.t < 4000) continue;
    // comprou: vira passageiro, e o saguão manda ele pra catraca
    this.compradores.splice(i, 1); i--;
    c.a.indo = null;
    this.plateia.push(c.a);
    this.gente.push(c.a);
  }
  // alguém novo chega, se tiver guichê com fila curta
  this.tComprador -= dt;
  if (this.tComprador > 0) return;
  this.tComprador = 4000 + Math.random() * 3000;
  for (i = 0; i < this.barracas.length; i++) {
    var b = this.barracas[i];
    if (b.acao === 'bilheteria' && (porCab[b.x] || 0) < 2) { this.novoComprador(b, porCab[b.x] || 0, false); return; }
  }
};

/* Quem anda pelo saguão não passa por dentro de cabine nem de loja: o
   passeio deles anda livre, e só esbarrão chamava o limite, então dava
   gente parada atrás do atendente. A cada quadro, quem está dentro de
   uma é empurrado pro lado mais curto. */
EstacaoScene.prototype.tiraDasCabines = function () {
  var gs = this.plateia || [], i, b;
  for (i = 0; i < gs.length; i++) {
    var sp = gs[i].sp;
    if (!sp || !sp.active || sp.naEscada) continue;
    for (b = 0; b < this.barracas.length; b++) {
      var q = this.barracas[b];
      var x0 = q.x - 8, x1 = q.x + q.w + 8, y0 = q.y - 6, y1 = q.y + q.h + 6;
      if (sp.x <= x0 || sp.x >= x1 || sp.y <= y0 || sp.y >= y1) continue;
      var dE = sp.x - x0, dD = x1 - sp.x, dB = y1 - sp.y, dC = sp.y - y0;
      var m = Math.min(dE, dD, dB, dC);
      if (m === dE) sp.x = x0; else if (m === dD) sp.x = x1; else if (m === dB) sp.y = y1; else sp.y = y0;
    }
  }
};

/* ---------- o que é chão ---------- */
EstacaoScene.prototype.naPassarela = function (x, y) {
  var tronco = x > ITQ.passX0 + ITQ_PISA && x < ITQ.passX1 - ITQ_PISA && y >= ITQ.passY0 - 4 && y < ITQ.passY1;
  var braco = y > ITQ.cruzY0 + ITQ_PISA && y < ITQ.cruzY1 - ITQ_PISA && x > ITQ.bracoX0 && x < ITQ.bracoX1 + 12;
  var galeria = x > GAL.x0 + 6 && x < GAL.x1 - 6 && y > GAL.piso0 + 2 && y < GAL.piso1 - 4;
  if (tronco || braco || galeria) return true;
  // lá fora: calçada, faixa, subidona e esplanada — mas a Arena é parede
  if (dentroDe(FORA.calcada, x, y) || dentroDe(FORA.descida, x, y) ||
      dentroDe(FORA.faixa, x, y) || dentroDe(FORA.rampa, x, y)) return true;
  if (dentroDe(FORA.esplanada, x, y)) {
    // o prédio oeste passa 22px pra cima, a fachada leste 12 pra baixo, e os degraus do sul 42 pra direita
    return !(x > ARENA.x - 8 && x < ARENA.x + ARENA.w + 44 && y > ARENA.y - 26 && y < ARENA.y + ARENA.h + 16);
  }
  return false;
};

/* true/false quando a Itaquera decide; null quando vale a regra de sempre */
EstacaoScene.prototype.podeIrItq = function (x, y) {
  if (this.bateNaLixeira(x, y)) return false;
  if (y < ESC_Y) {
    if (x < PLAT_X0 || x > PLAT_X1 || y < platY(80)) return false;
    return !this.bateNaPlataforma(x, y);
  }
  if (y < 116) return null;                          // a escada é a de sempre
  if (y > ITQ.passY0 || x < MEZ.x0 || x > MEZ.x1) return this.naPassarela(x, y);
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

/* O desenho do mezanino, no lugar do saguão de 320px. Mesmas peças
   (azulejo, piso, boca da escada, bilheteria, guichê), mais largas. */
EstacaoScene.prototype.pintaMezanino = function (g, l) {
  var x0 = MEZ.x0, w = MEZ.x1 - MEZ.x0;
  g.translateCanvas(-x0, 0);
  this.azulejo(g, x0, HUD_H, w, 72);
  g.fillStyle(l.num, 1).fillRect(x0, 98, ESC_X0 - 10 - x0, 5);
  g.fillStyle(l.num, 1).fillRect(ESC_X1 + 10, 98, MEZ.x1 - ESC_X1 - 10, 5);
  g.fillStyle(0x000000, 0.3).fillRect(x0, 103, ESC_X0 - 10 - x0, 2).fillRect(ESC_X1 + 10, 103, MEZ.x1 - ESC_X1 - 10, 2);
  this.bocaDaEscada(g, HUD_H, 116);
  this.piso(g, x0, 116, w, 124, 0x4a4a60, 0x565670);
  this.piso(g, x0, 240, w, 280, 0x3f3f52, 0x494960);
  this.azulejo(g, x0, 520, w, 56);
  g.fillStyle(0xffffff, 0.05).fillRect(x0, 240, w, 26);
  g.fillStyle(0xffffff, 0.03).fillRect(x0, 266, w, 26);
  pontilhado(g, x0, 240, w, 280, 0x000000, 0.07, 8);
  g.fillStyle(l.num, 1).fillRect(x0, 536, w, 5);
  g.fillStyle(0x000000, 0.3).fillRect(x0, 541, w, 2);
  quadroDeMapa(g, MAPA_SAG.x, MAPA_SAG.y, MAPA_SAG.w, MAPA_SAG.h);
  // as paredes das pontas
  [x0, MEZ.x1 - 26].forEach(function (px) {
    g.fillStyle(num(PAL.paredeSom), 1).fillRect(px, 116, 26, 404);
    g.fillStyle(num(PAL.parede), 1).fillRect(px + (px === x0 ? 0 : 4), 116, 22, 404);
    g.fillStyle(num(PAL.paredeLuz), 1).fillRect(px + (px === x0 ? 0 : 4), 116, 3, 404);
  });
  /* A bilheteria e o achados e perdidos saíram da parede: eram um vão
     de 50px e um de 30, e não pareciam nada ('pequeno', 'estranho').
     Viraram cabines de frente, no molde das lojas (cabinesDoMezanino). */
  g.translateCanvas(x0, 0);
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
  var x0 = ITQ.mundoX0, y0 = ITQ.passY0 - 60, larg = ITQ.mundoX1 - ITQ.mundoX0, alt = ITQ.fundoY - y0;
  g.translateCanvas(-x0, -y0);

  // lá fora: grama, e o asfalto da Radial correndo por baixo
  g.fillStyle(0x2b3d2c, 1).fillRect(x0, y0, larg, alt);
  pontilhado(g, x0, y0, larg, alt, 0x000000, 0.12, 6);
  g.fillStyle(0x3a3a44, 1).fillRect(x0, ITQ.radialY, larg, 64);
  g.fillStyle(0x2c2c34, 1).fillRect(x0, ITQ.radialY + 30, larg, 4);           // o canteiro do meio
  g.fillStyle(0xf2f0ff, 0.5);
  for (var fx = x0; fx < x0 + larg; fx += 40) {
    g.fillRect(fx, ITQ.radialY + 14, 20, 2);
    g.fillRect(fx + 20, ITQ.radialY + 48, 20, 2);
  }
  pintaFora(g);
  pintaArena(g);

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
  // a galeria: piso claro de shopping, a parede de vidro embaixo e as pontas
  g.fillStyle(0xd9d6cf, 1).fillRect(GAL.x0, GAL.lojaY - 4, GAL.x1 - GAL.x0, GAL.piso1 - GAL.lojaY + 4);
  for (var gy = GAL.piso0; gy < GAL.piso1 - 6; gy += 16) {
    for (var gx = GAL.x0 + 6; gx < GAL.x1 - 6; gx += 16) {
      g.fillStyle((((gx - GAL.x0) / 16 + (gy - GAL.piso0) / 16) % 2) ? 0xbcb8b0 : 0xc8c4bc, 1);
      g.fillRect(gx + 1, gy + 1, Math.min(14, GAL.x1 - 6 - gx - 1), Math.min(14, GAL.piso1 - 6 - gy - 1));
    }
  }
  g.fillStyle(0xffffff, 0.12).fillRect(GAL.x0 + 6, GAL.piso0 + 30, GAL.x1 - GAL.x0 - 12, 8);   // o reflexo das luzes
  g.fillStyle(0x7fa8c8, 0.6).fillRect(GAL.x0, GAL.piso1 - 6, GAL.x1 - GAL.x0, 3);            // o vidro de baixo
  g.fillStyle(0xe8362c, 1).fillRect(GAL.x0, GAL.piso1 - 2, GAL.x1 - GAL.x0, 2);
  // e a passarela continua descendo do meio dela
  g.fillStyle(0x9a948a, 1).fillRect(ITQ.passX0 + 6, GAL.piso1 - 6, ITQ.passX1 - ITQ.passX0 - 12, 8);
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
  // Saída B: a escada que desce pro terminal, e a cobertura branca dos ônibus
  var by = ITQ.passY1;
  for (var db = 0; db < 5; db++) {
    g.fillStyle(db % 2 ? 0x8a857c : 0xa39e94, 1).fillRect(ITQ.passX0 + 6, by + db * 8, ITQ.passX1 - ITQ.passX0 - 12, 8);
  }
  g.fillStyle(0xeceae4, 1).fillRect(ITQ.passX0 - 60, by + 44, ITQ.passX1 - ITQ.passX0 + 120, 26);
  g.fillStyle(0xe8362c, 1).fillRect(ITQ.passX0 + 70, by + 50, 36, 12);                   // um ônibus chegando
  g.translateCanvas(x0, y0);
};

/* ---------- a Arena Corinthians, de fora ----------
   Das fotos aéreas: a cobertura branca de cantos arredondados, com o
   recorte retangular no meio por onde se vê a arquibancada e o gramado;
   o prédio oeste, um bloco branco mais alto; a fachada de vidro do leste;
   a sombra funda debaixo da beira da cobertura; e em volta a esplanada
   de concreto e o estacionamento. Sem nome nem logo de patrocinador. */
function pintaFora(g) {
  var r, i;
  // a esplanada de concreto, e o estacionamento embaixo com as vagas
  r = FORA.esplanada;
  g.fillStyle(0x6f6d66, 1).fillRect(r.x0, r.y0, r.x1 - r.x0, r.y1 - r.y0);
  pontilhado(g, r.x0, r.y0, r.x1 - r.x0, r.y1 - r.y0, 0x000000, 0.08, 8);
  g.fillStyle(0x3e3e46, 1).fillRect(r.x0, ARENA.y + ARENA.h + 14, r.x1 - r.x0, r.y1 - ARENA.y - ARENA.h - 14);
  g.fillStyle(0xf2f0ff, 0.4);
  for (i = r.x0 + 6; i < r.x1; i += 16) g.fillRect(i, ARENA.y + ARENA.h + 20, 1, 22);
  for (i = r.x0 + 6; i < r.x1; i += 16) g.fillRect(i, ARENA.y + ARENA.h + 44, 1, 22);
  g.fillStyle(0xf2c14e, 0.8).fillRect(r.x0, r.y1 - 6, r.x1 - r.x0, 2);           // o meio-fio da rua
  // a calçada que continua o braço e desce até a Radial
  [FORA.calcada, FORA.descida].forEach(function (c) {
    g.fillStyle(0x8a857c, 1).fillRect(c.x0, c.y0, c.x1 - c.x0, c.y1 - c.y0);
    g.fillStyle(0x9d978d, 1);
    for (var cy = c.y0 + 2; cy < c.y1 - 2; cy += 12) g.fillRect(c.x0 + 2, cy, c.x1 - c.x0 - 4, 10);
  });
  // a faixa de pedestre na Radial
  r = FORA.faixa;
  g.fillStyle(0xf2f0ff, 0.85);
  for (i = r.y0 + 4; i < r.y1 - 4; i += 10) g.fillRect(r.x0 + 4, i, r.x1 - r.x0 - 8, 5);
  // a SUBIDONA: rampa comprida, faixas de piso que ficam mais claras subindo, e o guarda-corpo
  r = FORA.rampa;
  for (i = 0; i < r.y1 - r.y0; i += 6) {
    var k = i / (r.y1 - r.y0);
    g.fillStyle(Phaser.Display.Color.GetColor(110 + k * 40, 108 + k * 38, 100 + k * 36), 1).fillRect(r.x0, r.y0 + i, r.x1 - r.x0, 6);
  }
  g.fillStyle(0x2a2a32, 1).fillRect(r.x0 - 3, r.y0, 3, r.y1 - r.y0).fillRect(r.x1, r.y0, 3, r.y1 - r.y0);
  g.fillStyle(0xc9ccd2, 1).fillRect(r.x0 - 3, r.y0, 1, r.y1 - r.y0).fillRect(r.x1, r.y0, 1, r.y1 - r.y0);
}

function pintaArena(g) {
  var a = ARENA, x = a.x, y = a.y, w = a.w, h = a.h, i;
  // a sombra da massa inteira, pra baixo e pra direita
  g.fillStyle(0x000000, 0.4).fillRect(x + 14, y + 18, w, h);

  // PONTA SUL (direita): a esplanada em degraus da arquibancada temporária, pra fora da cobertura
  for (i = 0; i < 6; i++) {
    g.fillStyle(i % 2 ? 0x8f8c84 : 0xa9a69d, 1).fillRect(x + w - 6 + i * 7, y + 70 + i * 6, 7, h - 140 - i * 12);
  }
  // LADO OESTE (em cima): o prédio branco alto, com a faixa de vidro dos camarotes
  g.fillStyle(0xcfd2d6, 1).fillRect(x + 20, y - 22, w - 40, 36);
  g.fillStyle(0xeceef1, 1).fillRect(x + 20, y - 22, w - 40, 26);
  g.fillStyle(0x6f93b3, 1).fillRect(x + 30, y - 12, w - 60, 7);
  g.fillStyle(0x9cc3de, 1);
  for (i = x + 34; i < x + w - 34; i += 12) g.fillRect(i, y - 11, 8, 5);
  // LADO LESTE (embaixo): a fachada de vidro, com os montantes verticais
  g.fillStyle(0x5f84a6, 1).fillRect(x + 16, y + h - 14, w - 32, 26);
  g.fillStyle(0xaccde3, 1);
  for (i = x + 18; i < x + w - 18; i += 6) g.fillRect(i, y + h - 12, 3, 22);

  // a cobertura: branca, cantos redondos, e as bordas compridas curvando um pouco pra fora
  var borda = function (cor, m) {
    g.fillStyle(cor, 1);
    g.fillRoundedRect(x + m, y + m, w - 2 * m, h - 2 * m, 30 - m);
    // o arco das bordas longas: a cobertura ondula, e de cima isso vira uma barriga suave
    g.fillEllipse(x + w / 2, y + m + 4, w - 120, 22 - m);
    g.fillEllipse(x + w / 2, y + h - m - 4, w - 120, 22 - m);
  };
  borda(0xa9adb4, 0);
  borda(0xf1f2f4, 3);
  // as emendas dos painéis da cobertura
  g.fillStyle(0xdcdfe3, 1);
  for (i = x + 28; i < x + w - 24; i += 22) g.fillRect(i, y + 10, 1, h - 20);
  g.fillStyle(0xe6e8eb, 1).fillRect(x + 12, y + h / 2, w - 24, 1);

  // o recorte: a cobertura é mais funda no oeste (camarotes), então o vão fica um pouco pra baixo
  var ox = x + 108, oy = y + 72, ow = w - 216, oh = h - 128;
  g.fillStyle(0x1e1e24, 1).fillRect(ox, oy, ow, oh);
  // a arquibancada: anéis de cadeiras, mais escuro no alto
  for (i = 0; i < 5; i++) {
    g.fillStyle([0x4a4c54, 0x5c5e66, 0x6e7078, 0x5c5e66, 0x7a7c84][i], 1).fillRect(ox + 4 + i * 5, oy + 4 + i * 4, ow - 8 - i * 10, oh - 8 - i * 8);
  }
  // o gramado deitado, com o corte em faixas e as linhas do campo
  var gx = ox + 32, gy = oy + 26, gw = ow - 64, gh = oh - 52;
  g.fillStyle(0x2f8a3a, 1).fillRect(gx, gy, gw, gh);
  g.fillStyle(0x38a045, 1);
  for (i = 0; i < gw; i += 14) g.fillRect(gx + i, gy, 7, gh);
  g.lineStyle(1, 0xf2f0ff, 0.85).strokeRect(gx + 3, gy + 3, gw - 6, gh - 6);
  g.lineBetween(gx + gw / 2, gy + 3, gx + gw / 2, gy + gh - 3);
  g.strokeCircle(gx + gw / 2, gy + gh / 2, 10);
  g.strokeRect(gx + 3, gy + gh / 2 - 16, 16, 32).strokeRect(gx + gw - 19, gy + gh / 2 - 16, 16, 32);
  g.fillStyle(0xf2f0ff, 1).fillRect(gx + 1, gy + gh / 2 - 4, 2, 8).fillRect(gx + gw - 3, gy + gh / 2 - 4, 2, 8);   // as traves
  // o telão, na ponta sul (direita), virado pro campo
  g.fillStyle(0x0a0a10, 1).fillRect(ox + ow - 10, oy + oh / 2 - 22, 6, 44);
  // a sombra que a borda da cobertura joga pra dentro do vão
  g.fillStyle(0x000000, 0.28).fillRect(ox, oy, ow, 8).fillRect(ox, oy, 8, oh);
}

/* ---------- monta tudo, no create ---------- */
EstacaoScene.prototype.montaItaquera = function () {
  var eu = this, l = GameState.linhaAtual(), i;
  // o fundo de fora do mundo de 320px
  var fundo = this.add.graphics().setDepth(-2);
  fundo.fillStyle(num(PAL.bg), 1).fillRect(ITQ.mundoX0, PLAT_Y - 8, ITQ.mundoX1 - ITQ.mundoX0, ITQ.fundoY + 10 - PLAT_Y);

  var y0 = ITQ.passY0 - 60;
  texturaDeCena(this, 'est_itq_passarela', ITQ.mundoX1 - ITQ.mundoX0, ITQ.fundoY - y0,
    function (g) { eu.pintaPassarela(g); });
  this.add.image(ITQ.mundoX0, y0, 'est_itq_passarela').setOrigin(0, 0).setDepth(-1);

  var gLojas = this.add.graphics().setDepth(0.6);
  this.pintaBarracas(gLojas);

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
  /* O nome e a SAÍDA moram na parede da direita, na faixa vermelha, como
     nas fotos. Pendurados sobre o piso eles ficavam por cima de quem
     passava; na parede ninguém anda, e eles vão por baixo de tudo. */
  var xp = ITQ.paredeX + 13;
  placaItq(this, xp, PLAT_Y + 150, placaDe('ITAQUERA'), true, true);
  placaItq(this, xp, PLAT_Y + 560, placaDe('ITAQUERA'), true, true);
  placaItq(this, xp, PLAT_Y + 860, 'SAÍDA ▼', true, true);   // abaixo do mapa (760..816), junto da escada
  // presas na parede de cima do braço, e não soltas no meio do corredor
  placaItq(this, ITQ.bracoX0 + 90, ITQ.cruzY0 - 6, '◄ A  SHOPPING');
  placaItq(this, ITQ.bracoX1 - 90, ITQ.cruzY0 - 6, 'C/D  RADIAL E ARENA ►');
  /* A da saída B mora no fim do corredor, sobre a escada que desce, e por
     baixo de quem passa: pendurada no meio da passarela ela ficava por
     cima das cabeças, e lia como alguém passando por cima da placa. */
  placaItq(this, ITQ_MEIO_X, ITQ.passY1 + 20, '▼ B  CPTM E TERMINAL', false, true);

  // uns assentos já vêm ocupados; no pico, a maioria
  this.assentos = assentosItq();
  this.montaCompradores();
  // os cartazes: nas paredes, por baixo de quem passa (anuncios.js)
  montaAnuncios(this, espacosItaquera(), 3);
  /* tomadas: nas paredes do mezanino e na da plataforma, perto dos
     bancos, e longe das lixeiras ('perde o sentido' carregar o celular
     do lado do lixo) */
  this.montaTomadas([
    { x: MEZ.x0 + 26, y: 396, lado: 1 }, { x: MEZ.x1 - 26, y: 282, lado: -1 },
    { x: ITQ.paredeX, y: PLAT_Y + 300, lado: -1 }, { x: ITQ.paredeX, y: PLAT_Y + 700, lado: -1 }
  ]);
  this.lixeiras = lixeirasItq();
  var gLixo = this.add.graphics().setDepth(2.5);
  for (var li = 0; li < this.lixeiras.length; li++) pintaLixeira(gLixo, this.lixeiras[li].x, this.lixeiras[li].y);
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
function placaItq(cena, x, y, texto, emPe, fundo) {
  // `fundo`: presa na parede do fim do corredor, desenhada por baixo de quem passa
  var prof = fundo ? 3 : 45;
  var t = txtC(cena, x, y, texto, PAL.branco, 8).setScale(ESCALA_TEXTO / 2).setDepth(prof + 1);
  var comp = Math.round(t.width) + 12, esp = 13;
  var w = emPe ? esp : comp, h = emPe ? comp : esp;
  var x0 = Math.round(x - w / 2), y0 = Math.round(y - h / 2);
  if (emPe) t.setOrigin(0.5, 0.5).setAngle(90).setPosition(x, y);
  else t.setOrigin(0.5, 0.5).setPosition(x, y + 1);
  var g = cena.add.graphics().setDepth(prof);
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
  cam.setBounds(ITQ.mundoX0, PLAT_Y - 8, ITQ.mundoX1 - ITQ.mundoX0, ITQ.fundoY - (PLAT_Y - 8));
  cam.startFollow(this.pl.sp, true, 1, 1);
  cam.setFollowOffset(0, -Math.round(HUD_H / 2));
  cam.centerOn(this.pl.sp.x, this.pl.sp.y - Math.round(HUD_H / 2));

  /* O dia começa mais cedo, na medida da caminhada extra: da porta de
     casa até as catracas, contra os 256px do saguão de antes, na
     velocidade de quem está jogando. Uma vez por dia. */
  if (!noAlto && !GameState.treino && GameState.pernaIdx === 0 && GameState._itqCompensado !== GameState.dia) {
    GameState._itqCompensado = GameState.dia;
    var s2 = SAIDAS_ITQ[saidaDeCasa()];
    var dist = (saidaDeCasa() === 'C')
      ? (s2.y - 862) + (s2.x - ITQ_MEIO_X) + (862 - 244)    // subidona, braço, passarela
      : Math.abs(s2.x - ITQ_MEIO_X) + (s2.y - 244);
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
  this._sentouAgora = true;                // o mesmo toque que sentou não levanta
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
    if (!Ctrl.act) this._sentouAgora = false;
    /* levanta andando OU tocando: no celular o toque é "agir", e quem
       sentou pelo toque ficava preso no banco sem achar como sair */
    if (Ctrl.left || Ctrl.right || Ctrl.up || Ctrl.down || (Ctrl.actJust && !this._sentouAgora)) this.levantaPlat();
    else { this.pl.dir = 'sentadoFrente'; this.pl.anima(0, false); }
  }
  this.pintaPSD();
  atualizaAnuncios(this, dt);
  this.tiraDasCabines();
  this.andaPassantes(dt);
  this.andaCompradores(dt);

  // as portas pra rua
  var s = this.saidaSob(this.pl.sp.x, this.pl.sp.y);
  if (s && !this.naSaida) { this.naSaida = true; this.saiPor(s); }
  else if (!s) this.naSaida = false;
};

EstacaoScene.prototype.saidaSob = function (x, y) {
  if (y > ITQ.cruzY0 && y < ITQ.cruzY1 && x < ITQ.bracoX0 + 18) return 'A';
  // a rua do lado da Arena é o pé do estacionamento
  if (y > FORA.esplanada.y1 - 16) return 'C';
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
    /* 'Tenho que conseguir sair da estação quando quiser.' Na ida, sair
       é desistir do dia: pergunta antes, e quem confirma falta hoje. */
    fala(this, 'Sair da estação?\n\nSaindo agora, você falta hoje\n(-15 de carisma).', [
      { label: 'Sair e faltar hoje', cb: function () { eu.faltaHoje(); } },
      { label: 'Voltar pra estação', cb: function () { devolve(porta.x, porta.y); } }
    ]);
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

EstacaoScene.prototype.faltaHoje = function () {
  if (this.fim) return;
  this.fim = true;
  GameState.faltaODia();
  sfx('porta');
  this.scene.start('Estacao', { onde: 'saguao' });           // o dia seguinte, saindo de casa
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
  C: function () { return { x: 780 + Math.random() * 40, y: FORA.esplanada.y1 - 10 }; },
  B: function () { return { x: ITQ_MEIO_X + (Math.random() - 0.5) * 50, y: ITQ.passY1 - 10 }; },
  saguao: function () { return { x: ITQ_MEIO_X + (Math.random() - 0.5) * 50, y: ITQ.passY0 + 6 }; }
};
EstacaoScene.prototype.novoPassante = function (de, para, ator) {
  var p0 = ITQ_PONTOS[de](), p1 = ITQ_PONTOS[para]();
  var a = ator || new Ator(this, p0.x, p0.y, sorteiaPax());
  a.sp.setDepth(40);
  a.sp.passante = true; a.sp.dentro = false; a.sp.naEscada = false;
  var meio = { x: ITQ_MEIO_X + (Math.random() - 0.5) * 50, y: ITQ_MEIO_Y + (Math.random() - 0.5) * 40 };
  // o caminho de fora (estacionamento, subidona, faixa, calçada, fim do braço)
  var fora = [{ x: 800, y: 1110 }, { x: 800, y: 960 }, { x: 800, y: 866 }, { x: 612, y: ITQ_MEIO_Y }];
  var rota = [];
  if (de === 'C') rota = rota.concat(fora.slice(0));
  rota.push(meio);
  if (para === 'C') rota = rota.concat(fora.slice(0).reverse());
  rota.push(p1);
  a.rota = rota;
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
  if (this.contextoLixo()) return true;
  if (y < ESC_Y) {
    if (this.sentadoPlat) { this.dica.setText('SENTADO. ' + nomeAgir() + ': LEVANTAR', PAL.cinza); return true; }
    // a porta aberta e o ambulante mandam mais que o banco
    if (this.tremNaPorta() || this.ambulantePerto()) return false;
    var as = this.assentoPerto();
    if (!as) return false;
    this.dica.setText(nomeAgir() + ': SENTAR', PAL.amarelo);
    if (Ctrl.actJust) this.sentaPlat(as);
    return true;
  }
  if (!(y > ITQ.passY0 || x < MEZ.x0 || x > MEZ.x1) || y < ESC_Y) return false;
  if (this.barracaPerto(x, y)) return false;     // na frente de uma loja, quem fala é a loja
  var dica;
  if (this.praCasa) {
    var c = SAIDAS_ITQ[saidaDeCasa()];
    dica = 'CASA: ' + c.rotulo + ' ' + c.seta;
  } else dica = '▲ CATRACAS E PLATAFORMA';
  this.dica.setText(dica, PAL.amarelo);
  return true;
};
