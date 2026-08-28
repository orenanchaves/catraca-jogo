/* global Phaser */
/* =========================================================
   CATRACA — núcleo (16-bit)
   Resolução 320x576 · tile 32 · personagem 32x48
   Cada material tem rampa de 3 tons: luz, base e sombra.
   ========================================================= */

var GW = 320, GH = 576, HUD_H = 44;

/* ---------- cor ---------- */
function hex2rgb(h) {
  h = h.replace('#', '');
  return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)];
}
function rgb2hex(r, g, b) {
  function p(v) { v = Math.max(0, Math.min(255, Math.round(v))); return (v < 16 ? '0' : '') + v.toString(16); }
  return '#' + p(r) + p(g) + p(b);
}
function mistura(a, b, t) {
  var x = hex2rgb(a), y = hex2rgb(b);
  return rgb2hex(x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t);
}
function clarear(c, t) { return mistura(c, '#ffffff', t); }
function escurecer(c, t) { return mistura(c, '#0a0a12', t); }
function num(c) { return parseInt(c.replace('#', ''), 16); }

var PAL = {
  bg: '#0b0b12', preto: '#08080e',
  piso: '#3f3f52', pisoLuz: '#50506a', pisoSom: '#2c2c3b', rejunte: '#242430',
  parede: '#5f6c8f', paredeLuz: '#7f8cb0', paredeSom: '#39415f',
  amarelo: '#f2c14e', amareloLuz: '#ffe08a', amareloSom: '#a87a24',
  trilho: '#a3a9be', trilhoSom: '#6a7085', brita: '#14141c', dormente: '#332e28',
  metal: '#8d92a6', metalLuz: '#b3b8cb', metalSom: '#4f5468',
  madeira: '#8a5a34', madeiraSom: '#5c3c22',
  branco: '#f2f0ff', cinza: '#8b90a6', cinzaEsc: '#5a5f74',
  verde: '#00e676', roxo: '#7c3fff', vermelho: '#e8362c', azul: '#0b5fae',
  laranja: '#e8a33c'
};

var LINHAS = {
  azul: {
    nome: 'LINHA 1-AZUL', cor: '#0b5fae', num: 0x0b5fae,
    estacoes: ['JABAQUARA', 'CONCEIÇÃO', 'SÃO JUDAS', 'SAÚDE', 'PÇA DA ÁRVORE',
      'SANTA CRUZ', 'VILA MARIANA', 'ANA ROSA', 'PARAÍSO', 'VERGUEIRO',
      'SÃO JOAQUIM', 'LIBERDADE', 'SÉ']
  },
  vermelha: {
    nome: 'LINHA 3-VERMELHA', cor: '#e8362c', num: 0xe8362c,
    estacoes: ['SÉ', 'ANHANGABAÚ', 'REPÚBLICA', 'SANTA CECÍLIA',
      'MAL. DEODORO', 'BARRA FUNDA']
  }
};

/* ---------- relógio e faixas de horário ----------
   O metrô não é o mesmo o dia inteiro. Cada faixa muda a lotação, a
   espera do trem, quantas catracas ficam abertas e o humor do guardinha.
   É o mesmo trajeto, mas em outra São Paulo. */
var FAIXAS = [
  {
    key: 'madrugada', nome: 'MADRUGADA', ini: 0, fim: 5 * 60 + 29,
    lotacao: 0.15, espera: 1.85, guarda: 1.2, catracas: 0.35,
    cor: '#7c8ac4', luz: 0x0a0c1e, luzA: 0.34,
    frase: 'Estação vazia. O guardinha só tem você pra olhar.'
  },
  {
    key: 'picoManha', nome: 'PICO DA MANHÃ', ini: 5 * 60 + 30, fim: 9 * 60 + 29,
    lotacao: 1.0, espera: 0.55, guarda: 0.75, catracas: 1.0,
    cor: '#f2c14e', luz: 0x2a1e08, luzA: 0.1,
    frase: 'Todo mundo indo pro mesmo lugar na mesma hora.'
  },
  {
    key: 'entrePico', nome: 'ENTRE-PICO', ini: 9 * 60 + 30, fim: 15 * 60 + 59,
    lotacao: 0.4, espera: 1.25, guarda: 1.0, catracas: 0.7,
    cor: '#8bd0ff', luz: 0x101a2c, luzA: 0.1,
    frase: 'Meio da tarde. Dá até pra sentar.'
  },
  {
    key: 'picoTarde', nome: 'PICO DA TARDE', ini: 16 * 60, fim: 19 * 60 + 59,
    lotacao: 1.0, espera: 0.6, guarda: 0.8, catracas: 1.0,
    cor: '#e8a33c', luz: 0x2c1408, luzA: 0.13,
    frase: 'A cidade inteira voltando pra casa junto.'
  },
  {
    key: 'noite', nome: 'NOITE', ini: 20 * 60, fim: 22 * 60 + 59,
    lotacao: 0.35, espera: 1.4, guarda: 1.05, catracas: 0.55,
    cor: '#9f8ce0', luz: 0x0c0c22, luzA: 0.2,
    frase: 'O vagão esvaziou. A estação também.'
  },
  {
    key: 'ultimo', nome: 'ÚLTIMO TREM', ini: 23 * 60, fim: 24 * 60 - 1,
    lotacao: 0.22, espera: 2.1, guarda: 1.15, catracas: 0.35,
    cor: '#e8362c', luz: 0x0a0a1c, luzA: 0.28,
    frase: 'Se perder esse, dormiu na estação.'
  }
];

/* cada dia começa numa hora diferente: o jogo é sempre o mesmo trajeto,
   mas nunca no mesmo horário */
var HORAS_INICIO = [
  6 * 60 + 10,        // dia 1: pico da manhã, o batismo
  4 * 60 + 20,        // madrugada, estação abrindo
  16 * 60 + 20,       // pico da tarde virando noite
  9 * 60 + 50,        // entre-pico, o dia inteiro morno
  22 * 60 + 20,       // noite virando último trem e madrugada
  13 * 60 + 30        // tarde engrossando pro pico
];

function faixaDe(min) {
  var m = ((min % 1440) + 1440) % 1440;
  for (var i = 0; i < FAIXAS.length; i++) {
    if (m >= FAIXAS[i].ini && m <= FAIXAS[i].fim) return FAIXAS[i];
  }
  return FAIXAS[0];
}
function horaTexto(min) {
  var m = ((min % 1440) + 1440) % 1440;
  var h = Math.floor(m / 60), mm = m % 60;
  return (h < 10 ? '0' : '') + h + ':' + (mm < 10 ? '0' : '') + mm;
}

/* ---------- personagens jogáveis ---------- */
var CHARS = {
  estudante: {
    nome: 'ESTUDANTE', asset: 'estudante',
    desc: 'Meia passagem. Mochila atrapalha.',
    tarifa: 2.60, dinheiro: 14.00, carisma: 55, descanso: 90, descansoMax: 100,
    dreno: 0.9, velocidade: 92, empurraoMult: 0.8, gratuidade: false, valeTransporte: 0
  },
  clt: {
    nome: 'CLT', asset: 'clt',
    desc: 'Vale-transporte. Já sai cansado.',
    tarifa: 5.20, dinheiro: 9.00, carisma: 60, descanso: 55, descansoMax: 100,
    dreno: 1.35, velocidade: 100, empurraoMult: 1.0, gratuidade: false, valeTransporte: 2
  },
  senhor: {
    nome: 'IDOSO', asset: 'senhor',
    desc: 'Passa de graça. Recebe o lugar.',
    tarifa: 0, dinheiro: 20.00, carisma: 75, descanso: 70, descansoMax: 70,
    dreno: 1.1, velocidade: 72, empurraoMult: 0.7, gratuidade: true, valeTransporte: 0
  },
  ambulante: {
    nome: 'AMBULANTE', asset: 'ambulante',
    desc: 'Vende no vagão. Guardinha persegue.',
    tarifa: 5.20, dinheiro: 6.00, carisma: 50, descanso: 80, descansoMax: 100,
    dreno: 1.0, velocidade: 104, empurraoMult: 1.15, gratuidade: false, valeTransporte: 0
  }
};

/* ---------- estado global ---------- */
var GameState = {
  init: function (charKey) {
    var c = CHARS[charKey];
    this.charKey = charKey;
    this.char = c;
    this.carisma = c.carisma;
    this.descanso = c.descanso;
    this.dinheiro = c.dinheiro;
    this.valeRestante = c.valeTransporte;
    this.linha = 'azul';
    this.idx = 7;
    this.dir = 1;
    this.estacoes = 0;
    this.dia = 1;
    this.trechosNoDia = 0;
    this.minutos = HORAS_INICIO[0];
    this.faixaAnterior = this.faixa().key;
    this.dentroDoSistema = false;
    this.sentado = false;
    this.motivoFim = '';
    this.stats = {
      cedidos: 0, disfarces: 0, disfarcesOk: 0, recusas: 0,
      catracasPuladas: 0, catracasPagas: 0, causos: 0, baldeacoes: 0
    };
  },
  linhaAtual: function () { return LINHAS[this.linha]; },
  estacaoAtual: function () { return this.linhaAtual().estacoes[this.idx]; },
  proximaEstacaoNome: function () {
    var l = this.linhaAtual(), i = this.idx + this.dir;
    if (i < 0 || i >= l.estacoes.length) i = this.idx - this.dir;
    return l.estacoes[i];
  },
  avancar: function () {
    var l = this.linhaAtual();
    var i = this.idx + this.dir;
    if (i < 0 || i >= l.estacoes.length) { this.dir *= -1; i = this.idx + this.dir; }
    this.idx = i;
    this.estacoes++;
    this.trechosNoDia++;
    this.passaTempo(18 + Math.floor(Math.random() * 13));
    if (this.estacaoAtual() === 'SÉ' && Math.random() < 0.75) {
      this.linha = (this.linha === 'azul') ? 'vermelha' : 'azul';
      var nl = LINHAS[this.linha];
      this.idx = nl.estacoes.indexOf('SÉ');
      this.dir = (this.idx === 0) ? 1 : -1;
      this.stats.baldeacoes++;
      return 'baldeacao';
    }
    return 'ok';
  },
  viraDia: function () {
    this.dia++; this.trechosNoDia = 0; this.dentroDoSistema = false;
    this.valeRestante = this.char.valeTransporte;
    var h = HORAS_INICIO[(this.dia - 1) % HORAS_INICIO.length];
    this.minutos = h + Math.floor(Math.random() * 25) - 12;
    this.faixaAnterior = this.faixa().key;
  },

  /* ---------- relógio ---------- */
  passaTempo: function (min) {
    this.minutos = (this.minutos + min) % 1440;
  },
  faixa: function () { return faixaDe(this.minutos); },
  hora: function () { return horaTexto(this.minutos); },
  /* 0 = estação deserta, 1 = pico de verdade. Sobe um pouco com a
     dificuldade: quanto mais fundo no loop, mais gente em qualquer horário */
  lotacao: function () {
    var f = this.faixa();
    return Phaser.Math.Clamp(f.lotacao * (0.9 + (this.dificuldade() - 1) * 0.22), 0.1, 1.1);
  },
  /* quem chama devolve true uma vez só, quando a faixa vira */
  virouFaixa: function () {
    var k = this.faixa().key;
    if (k === this.faixaAnterior) return false;
    this.faixaAnterior = k;
    return true;
  },
  dificuldade: function () { return 1 + (this.estacoes * 0.045) + (this.dia - 1) * 0.15; },
  addCarisma: function (n) { this.carisma = Phaser.Math.Clamp(this.carisma + n, 0, 100); },
  addDescanso: function (n) { this.descanso = Phaser.Math.Clamp(this.descanso + n, 0, this.char.descansoMax); },
  gastar: function (n) { this.dinheiro = Math.max(0, Math.round((this.dinheiro - n) * 100) / 100); },
  ganhar: function (n) { this.dinheiro = Math.round((this.dinheiro + n) * 100) / 100; },
  derrota: function () {
    if (this.descanso <= 0) return 'Você dormiu. Acordou no fim da linha.\nTodo mundo já desceu.';
    if (this.carisma <= 0) return 'O vagão fechou na sua cara.\nDe novo. E de novo.';
    return null;
  },
  recorde: function () {
    var r = 0;
    try { r = parseInt(localStorage.getItem('metrosp_best') || '0', 10) || 0; } catch (e) { }
    return r;
  },
  salvarRecorde: function () {
    try {
      if (this.estacoes > this.recorde()) localStorage.setItem('metrosp_best', String(this.estacoes));
    } catch (e) { }
  }
};

/* =========================================================
   PERSONAGEM PLACEHOLDER
   A silhueta é desenhada em 16x24, ampliada para 32x48 e
   sombreada automaticamente: borda de cima e da esquerda
   recebe luz, borda de baixo e da direita recebe sombra.
   É o que dá o volume que 8-bit chapado não tem.

   Só existe um corpo desenhado por inteiro: o CORPO_BASE.
   Todo o resto da população é esse corpo com algumas linhas
   trocadas — cabelo comprido, saia, criança no colo, costas
   curvadas com bengala. Sai muito mais gente diferente do
   que desenhar cada uma do zero, e mantém todo mundo com a
   mesma leitura de silhueta.
   ========================================================= */
var CORPO_BASE = {
  down: [
    '................', '....oooooooo....', '...oaaaaaaaao...', '...oaaaaaaaao...',
    '...oaaaaaaaao...', '...oakkkkkkao...', '...okkkkkkkko...', '...okkokkokko...',
    '...okkkkkkkko...', '....okkkkkko....', '......kkkk......', '..ojjjjjjjjjjo..',
    '.ojjjjjjjjjjjjo.', '.ojjjjjjjjjjjjo.', '.ojjjjjjjjjjjjo.', '.okjjjjjjjjjjko.',
    '.okjjjjjjjjjjko.', '..ojjjjjjjjjjo..', '...oppppppppo...', '....pppppppp....',
    '....ppp..ppp....', '....ppp..ppp....', '....ppp..ppp....', '....sss..sss....'],
  up: [
    '................', '....oooooooo....', '...oaaaaaaaao...', '...oaaaaaaaao...',
    '...oaaaaaaaao...', '...oaaaaaaaao...', '...oaaaaaaaao...', '...oaaaaaaaao...',
    '...oaaaaaaaao...', '....oaaaaaao....', '......kkkk......', '..ojjjjjjjjjjo..',
    '.ojjjjjjjjjjjjo.', '.ojjjjjjjjjjjjo.', '.ojjjjjjjjjjjjo.', '.okjjjjjjjjjjko.',
    '.okjjjjjjjjjjko.', '..ojjjjjjjjjjo..', '...oppppppppo...', '....pppppppp....',
    '....ppp..ppp....', '....ppp..ppp....', '....ppp..ppp....', '....sss..sss....'],
  side: [
    '................', '.....oooooo.....', '....oaaaaaaao...', '....oaaaaaaao...',
    '....oaaaakkko...', '....oaaakkkko...', '....oakokkkko...', '....okkkkkkko...',
    '.....okkkkko....', '......kkkk......', '.....jjjjjj.....', '....ojjjjjjjo...',
    '....ojjjjjjjo...', '....ojjjjjjjo...', '....ojjjjjjjko..', '....ojjjjjjjko..',
    '....ojjjjjjjo...', '.....ojjjjjo....', '.....pppppp.....', '.....pppppp.....',
    '.....ppppp......', '.....pppp.......', '.....ppp........', '.....sss........']
};

/* pernas: os quadros de caminhada trocam as últimas linhas do corpo */
var PERNAS_PADRAO = {
  inicio: 20,
  frente: [
    ['...pppp..ppp....', '...ppp....pp....', '..sss.....pp....', '..........sss...'],
    ['....ppp..pppp...', '....pp....ppp...', '....pp.....sss..', '...sss..........']
  ],
  lado: [
    ['....pppppp......', '...ppp..ppp.....', '..ppp....pp.....', '..sss.....ss....'],
    ['.....ppppp......', '.....pppp.......', '....pppp........', '...sss..........']
  ]
};

/* ---------- cabelo comprido ---------- */
var CABELO_LONGO = {
  down: {
    1: '...oooooooooo...', 2: '..oaaaaaaaaaao..', 3: '..oaaaaaaaaaao..',
    4: '..oaaaaaaaaaao..', 5: '..oaakkkkkkaao..', 6: '..oaakkkkkkaao..',
    7: '..oaakokkokaao..', 8: '..oaakkkkkkaao..', 9: '..oaaakkkkaaao..',
    10: '...oaakkkkaao...', 11: '..oajjjjjjjjao..', 12: '.ojajjjjjjjjajo.'
  },
  up: {
    1: '...oooooooooo...', 2: '..oaaaaaaaaaao..', 3: '..oaaaaaaaaaao..',
    4: '..oaaaaaaaaaao..', 5: '..oaaaaaaaaaao..', 6: '..oaaaaaaaaaao..',
    7: '..oaaaaaaaaaao..', 8: '..oaaaaaaaaaao..', 9: '..oaaaaaaaaaao..',
    10: '...oaaaaaaao....', 11: '..oajjjjjjjjao..', 12: '.ojajjjjjjjjajo.'
  },
  side: {
    2: '...oaaaaaaaao...', 3: '...oaaaaaaaao...', 4: '...oaaaaakkko...',
    5: '...oaaaakkkko...', 6: '...oaakokkkko...', 7: '...oaakkkkkko...',
    8: '...oaaakkkko....', 9: '...oaaakkko.....', 10: '....oaajjjjjo...'
  }
};

/* ---------- saia ---------- */
var MOD_SAIA = {
  down: {
    18: '..opppppppppo...', 19: '.opppppppppppo..', 20: '.oppppppppppppo.',
    21: '....kkk..kkk....', 22: '....kkk..kkk....', 23: '....sss..sss....'
  },
  up: {
    18: '..opppppppppo...', 19: '.opppppppppppo..', 20: '.oppppppppppppo.',
    21: '....kkk..kkk....', 22: '....kkk..kkk....', 23: '....sss..sss....'
  },
  side: {
    18: '....opppppo.....', 19: '...opppppppo....', 20: '...opppppppo....',
    21: '....kkk.kk......', 22: '....kk..kk......', 23: '....ss..ss......'
  },
  pernas: {
    inicio: 21,
    frente: [
      ['...kkk....kk....', '..kkk.....kk....', '..sss.....sss...'],
      ['....kk....kkk...', '....kk.....kkk..', '...sss.....sss..']
    ],
    lado: [
      ['....kkkk........', '...kkk..kk......', '..sss....ss.....'],
      ['.....kkkk.......', '.....kkk........', '....sss.........']
    ]
  }
};

/* ---------- criança de colo ---------- */
var MOD_COLO = {
  down: {
    12: '.ojjjowwwwojjjo.', 13: '.ojjowwkkwwojjo.', 14: '.okjowwkkwwojko.',
    15: '.okjowwwwwwojko.', 16: '.ojjjowwwwojjjo.'
  },
  side: {
    12: '....ojjjjowwo...', 13: '....ojjjowkwo...', 14: '....ojjjowwwo...',
    15: '....ojjjjowwo...', 16: '....ojjjjjjko...'
  }
};

/* ---------- barriga de grávida ---------- */
var MOD_BARRIGA = {
  down: {
    15: '.ojjowwwwwwojjo.', 16: '.okjowwwwwwojko.', 17: '..ojjowwwwojjo..'
  },
  side: {
    12: '....ojjjjjjjjo..', 13: '....ojjjjjjjjjo.', 14: '....ojjjjjjjjjo.',
    15: '....okjjjjjjjjo.', 16: '....ojjjjjjjjo..', 17: '.....ojjjjjjo...'
  }
};

/* ---------- costas curvadas e bengala ---------- */
var MOD_BENGALA = {
  down: {
    10: '.....okkkko.....', 13: '.ojjjjjjjjjjjjo.', 14: '.ojjjjjjjjjjjjo.',
    16: '.okjjjjjjjjjjkow', 17: '..ojjjjjjjjjjo.w', 18: '...oppppppppo..w',
    19: '....pppppppp...w', 20: '....ppp..ppp...w', 21: '....ppp..ppp...w',
    22: '....ppp..ppp...w', 23: '....sss..sss...w'
  },
  up: {
    10: '.....okkkko.....', 16: '.okjjjjjjjjjjkow', 17: '..ojjjjjjjjjjo.w',
    18: '...oppppppppo..w', 19: '....pppppppp...w', 20: '....ppp..ppp...w',
    21: '....ppp..ppp...w', 22: '....ppp..ppp...w', 23: '....sss..sss...w'
  },
  side: {
    16: '....ojjjjjjjo.w.', 17: '.....ojjjjjo..w.', 18: '.....pppppp...w.',
    19: '.....pppppp...w.', 20: '.....ppppp....w.', 21: '.....pppp.....w.',
    22: '.....ppp......w.', 23: '.....sss......w.'
  },
  pernas: {
    inicio: 20,
    frente: [
      ['....ppp..ppp...w', '....pp...ppp...w', '...sss...ppp...w', '.........sss...w'],
      ['....ppp..ppp...w', '....ppp...pp...w', '....ppp...sss..w', '...sss.........w']
    ],
    lado: [
      ['....pppppp....w.', '...ppp..ppp...w.', '..ppp....pp...w.', '..sss.....ss..w.'],
      ['.....ppppp....w.', '.....pppp.....w.', '....pppp......w.', '...sss........w.']
    ]
  }
};

/* ---------- formatos de cabelo ----------
   Antes o cabelo era só troca de cor no mesmo capacete, e a multidão
   inteira tinha a mesma cabeça. Cada formato aqui é uma edição das
   linhas do alto da cabeça, então combina com qualquer corpo e com
   qualquer acessório. */

var CABELO_CARECA = {
  down: {
    2: '...okkkkkkkko...', 3: '...okkkkkkkko...', 4: '...oakkkkkkao...'
  },
  up: {
    2: '...okkkkkkkko...', 3: '...okkkkkkkko...', 4: '...okkkkkkkko...',
    5: '...okkkkkkkko...', 6: '...oakkkkkkao...', 7: '...oaakkkkaao...',
    8: '...oaaaaaaaao...'
  },
  side: {
    2: '....okkkkkkko...', 3: '....okkkkkkko...', 4: '....oakkkkkko...',
    5: '....oaakkkkko...'
  }
};

/* cabelo alto e cheio, transbordando a largura da cabeça */
var CABELO_VOLUMOSO = {
  down: {
    0: '...oaaaaaaaao...', 1: '..oaaaaaaaaaao..', 2: '..oaaaaaaaaaao..',
    3: '..oaaaaaaaaaao..', 4: '..oaaaaaaaaaao..', 5: '..oaakkkkkkaao..'
  },
  up: {
    0: '...oaaaaaaaao...', 1: '..oaaaaaaaaaao..', 2: '..oaaaaaaaaaao..',
    3: '..oaaaaaaaaaao..', 4: '..oaaaaaaaaaao..', 5: '..oaaaaaaaaaao..',
    6: '..oaaaaaaaaaao..', 7: '..oaaaaaaaaaao..', 8: '...oaaaaaaaao...'
  },
  side: {
    0: '....oooooo......', 1: '...oaaaaaaao....', 2: '..oaaaaaaaaao...',
    3: '..oaaaaaaaaao...', 4: '..oaaaaaaakkko..', 5: '...oaaaakkkko...'
  }
};

/* coque preso no alto: sobe uma linha inteira acima do crânio, senão
   some no meio do contorno */
var CABELO_COQUE = {
  down: {
    0: '....oaaaaaao....', 1: '...ooaaaaaaoo...'
  },
  up: {
    0: '....oaaaaaao....', 1: '...ooaaaaaaoo...'
  },
  side: {
    0: '...oaaaao.......', 1: '...oaaaaoooo....'
  }
};

/* rabo de cavalo: preso, então de frente sobra só a mecha ao lado da
   orelha; de costas ele desce pela nuca e de perfil fica pra trás.
   Vai sobre o cabelo curto — sobre o comprido não sobraria rabo. */
var CABELO_RABO = {
  down: {
    4: '...oaaaaaaaaoaa.', 5: '...oakkkkkkaoaa.', 6: '...okkkkkkkkoaa.',
    7: '...okkokkokkoaa.', 8: '...okkkkkkkkoaa.', 9: '....okkkkkkoaa..'
  },
  up: {
    10: '......aaaa......', 11: '..ojjjaaaajjjo..', 12: '.ojjjjaaaajjjjo.',
    13: '.ojjjjaaaajjjjo.', 14: '.ojjjjjaajjjjjo.'
  },
  side: {
    4: '..aaoaaaakkko...', 5: '..aaoaaakkkko...', 6: '..aaoakokkkko...',
    7: '..aaokkkkkkko...', 8: '..aa.okkkkko....', 9: '..aa..kkkk......'
  }
};

/* boné, com aba pra frente */
var CABELO_BONE = {
  down: {
    1: '....oooooooo....', 2: '...oaaaaaaaao...', 3: '...oaaaaaaaao...',
    4: '..owwwwwwwwwwo..'
  },
  up: {
    1: '....oooooooo....', 2: '...oaaaaaaaao...', 3: '...oaaaaaaaao...',
    4: '...oaaaaaaaao...', 5: '...oawwwwwwao...'
  },
  side: {
    1: '.....oooooo.....', 2: '....oaaaaaaao...', 3: '....oaaaaaaao...',
    4: '....oaaawwwwwwo.', 5: '....oaaakkkko...'
  }
};

/* ---------- acessórios ----------
   Mesma silhueta, gente diferente: quem carrega mochila, quem leva
   bolsa a tiracolo e quem vai o trajeto inteiro no celular. */
var MOD_MOCHILA = {
  down: {
    13: '.ojjwjjjjjjwjjo.', 14: '.ojjwjjjjjjwjjo.', 15: '.okjwjjjjjjwjko.'
  },
  up: {
    12: '.ojjwwwwwwwwjjo.', 13: '.ojjwwwwwwwwjjo.', 14: '.ojjwwwwwwwwjjo.',
    15: '.okjwwwwwwwwjko.'
  },
  side: {
    11: '..wwojjjjjjjo...', 12: '..wwojjjjjjjo...', 13: '..wwojjjjjjjo...',
    14: '..wwojjjjjjjko..', 15: '...wojjjjjjjko..'
  }
};

var MOD_BOLSA = {
  down: {
    12: '.ojjwjjjjjjjjjo.', 13: '.ojjjwjjjjjjjjo.', 14: '.ojjjjwjjjjjjjo.',
    15: '.okjjjjwjjwwwko.', 16: '.okjjjjjjjwwwko.', 17: '..ojjjjjjjwwwo..'
  },
  up: {
    12: '.ojjjjjjjjjwjjo.', 13: '.ojjjjjjjjwjjjo.', 14: '.ojjjjjjjwjjjjo.',
    15: '.okjwwwjjjjjjko.', 16: '.okjwwwjjjjjjko.', 17: '..ojwwwjjjjjjo..'
  },
  side: {
    13: '....ojjjjjjjo...', 14: '....ojjjjjwwwo..', 15: '....ojjjjjwwwo..',
    16: '....ojjjjjwwwo..'
  }
};

var MOD_CELULAR = {
  down: { 15: '.ojjjjkwwkjjjjo.', 16: '.ojjjjkwwkjjjjo.' },
  side: { 14: '....ojjjjjkwo...', 15: '....ojjjjjkwo...' }
};

/* ---------- pedinte encostado na parede (pose única) ---------- */
var POSE_PEDINTE = [
  '................', '................', '................', '................',
  '................', '....oooooooo....', '...oaaaaaaaao...', '...oaaaaaaaao...',
  '...oakkkkkkao...', '...okkokkokko...', '...okkkkkkkko...', '....okkkkkko....',
  '.....okkkko.....', '...ojjjjjjjjo...', '..ojjjjjjjjjjo..', '..ojjjjjjjjjjo..',
  '..okjjjjjjjjko..', '..okjppppppjko.w', '..ojppppppppjo.w', '...opppppppo....',
  '...osssssso.....', '................', '................', '................'
];

/* cada tipo de gente é uma pilha de camadas sobre o corpo base */
var CORPOS = {
  padrao: {},
  longo: CABELO_LONGO,
  saia: { herda: 'longo', mods: [MOD_SAIA] },
  colo: { mods: [MOD_COLO] },
  colo_longo: { herda: 'longo', mods: [MOD_COLO] },
  gestante: { herda: 'longo', mods: [MOD_BARRIGA] },
  senhor: { mods: [CABELO_CARECA, MOD_BENGALA] },
  senhor_grisalho: { mods: [MOD_BENGALA] },
  senhora: { herda: 'longo', mods: [MOD_BENGALA] },
  senhora_coque: { herda: 'longo', mods: [CABELO_COQUE, MOD_BENGALA] },
  careca: { mods: [CABELO_CARECA] },
  volumoso: { mods: [CABELO_VOLUMOSO] },
  volumoso_bolsa: { mods: [CABELO_VOLUMOSO, MOD_BOLSA] },
  coque: { herda: 'longo', mods: [CABELO_COQUE] },
  coque_saia: { herda: 'saia', mods: [CABELO_COQUE] },
  rabo: { mods: [CABELO_RABO] },
  rabo_mochila: { mods: [CABELO_RABO, MOD_MOCHILA] },
  bone: { mods: [CABELO_BONE] },
  bone_mochila: { mods: [CABELO_BONE, MOD_MOCHILA] },
  careca_celular: { mods: [CABELO_CARECA, MOD_CELULAR] },
  mochila: { mods: [MOD_MOCHILA] },
  mochila_longo: { herda: 'longo', mods: [MOD_MOCHILA] },
  bolsa: { herda: 'longo', mods: [MOD_BOLSA] },
  bolsa_curto: { mods: [MOD_BOLSA] },
  celular: { mods: [MOD_CELULAR] },
  celular_longo: { herda: 'longo', mods: [MOD_CELULAR] },
  saia_bolsa: { herda: 'saia', mods: [MOD_BOLSA] },
  pedinte: { poseUnica: true, down: POSE_PEDINTE, up: POSE_PEDINTE, side: POSE_PEDINTE }
};

function aplicaCamada(alvo, camada) {
  var dirs = ['down', 'up', 'side'];
  for (var d = 0; d < dirs.length; d++) {
    var linhas = camada[dirs[d]];
    if (!linhas) continue;
    if (Array.isArray(linhas)) alvo[dirs[d]] = linhas.slice(0);   // pose inteira
    else for (var k in linhas) alvo[dirs[d]][k | 0] = linhas[k];  // só as linhas trocadas
  }
  if (camada.pernas) alvo.pernas = camada.pernas;
  if (camada.poseUnica) alvo.poseUnica = true;
}

function resolveCorpo(key) {
  var c = CORPOS[key] || CORPOS.padrao;
  var alvo;
  if (c.herda) {
    alvo = resolveCorpo(c.herda);
  } else {
    alvo = {
      down: CORPO_BASE.down.slice(0), up: CORPO_BASE.up.slice(0),
      side: CORPO_BASE.side.slice(0), pernas: PERNAS_PADRAO, poseUnica: false
    };
  }
  aplicaCamada(alvo, c);
  var mods = c.mods || [];
  for (var i = 0; i < mods.length; i++) aplicaCamada(alvo, mods[i]);
  return alvo;
}

var CACHE_CORPOS = {};
function quadrosDoCorpo(key) {
  key = key || 'padrao';
  if (CACHE_CORPOS[key]) return CACHE_CORPOS[key];
  var r = resolveCorpo(key);
  var dirs = ['down', 'up', 'side'];
  var out = {};
  for (var d = 0; d < dirs.length; d++) {
    var nome = dirs[d], parado = r[nome];
    var passos = (nome === 'side') ? r.pernas.lado : r.pernas.frente;
    out[nome] = [parado, null, null];
    for (var q = 0; q < 2; q++) {
      if (r.poseUnica) { out[nome][q + 1] = parado; continue; }
      var a = parado.slice(0);
      for (var i = 0; i < passos[q].length; i++) a[r.pernas.inicio + i] = passos[q][i];
      out[nome][q + 1] = a;
    }
  }
  CACHE_CORPOS[key] = out;
  return out;
}

function pele(o, k, a, j, p, s, w) { return { o: o, k: k, a: a, j: j, p: p, s: s, w: w }; }
var PELES = {
  estudante: pele('#0a0a12', '#c99a70', '#2a2a30', '#2f7d5e', '#25304d', '#14141c', '#1a1a24'),
  clt: pele('#0a0a12', '#e0b088', '#3a2a22', '#d8d8e8', '#33334a', '#14141c', '#3a6fb0'),
  senhor: pele('#0a0a12', '#f0c8a0', '#d8d8e8', '#8a5a34', '#5c3c22', '#14141c', '#f0eeff'),
  ambulante: pele('#0a0a12', '#8a5a3c', '#e8a33c', '#e8a33c', '#2e2e40', '#14141c', '#f0eeff'),
  idoso: pele('#0a0a12', '#e0b088', '#d8d8e8', '#6b6152', '#4a4438', '#14141c', '#f0eeff'),
  gestante: pele('#0a0a12', '#c99a70', '#3a2a22', '#c85a9a', '#2a2a38', '#14141c', '#e28cc0'),
  guardinha: pele('#0a0a12', '#b07d52', '#1a2540', '#20325c', '#20325c', '#14141c', '#9fb6dd'),
  rimador: pele('#0a0a12', '#6b4228', '#0a0a12', '#e8362c', '#1c1c28', '#14141c', '#f0eeff'),
  pedinte: pele('#0a0a12', '#b07d52', '#4a3a2a', '#6b6152', '#4a4438', '#2a2a2a', '#8a8272'),
  ambulanteNpc: pele('#0a0a12', '#8a5a3c', '#e8a33c', '#f2c14e', '#3a3a4d', '#14141c', '#ffffff'),
  pax0: pele('#0a0a12', '#f0c8a0', '#5a3a2a', '#3a6fb0', '#2a2a38', '#14141c', '#f0eeff'),
  pax1: pele('#0a0a12', '#8a5a3c', '#0a0a12', '#c85a9a', '#2a2a38', '#14141c', '#f0eeff'),
  pax2: pele('#0a0a12', '#e0b088', '#c07a2a', '#00b45e', '#33334a', '#14141c', '#f0eeff'),
  pax3: pele('#0a0a12', '#6b4228', '#2a2a30', '#7c3fff', '#22283a', '#14141c', '#f0eeff'),
  pax4: pele('#0a0a12', '#c99a70', '#6a4a2a', '#8a5a34', '#2e2e40', '#14141c', '#f0eeff'),
  pax5: pele('#0a0a12', '#b07d52', '#3a2a22', '#565b6e', '#22283a', '#14141c', '#f0eeff'),
  /* a cidade não é toda do mesmo tom: seis peles, cabelos e roupas
     que se cruzam com os tipos de corpo pra formar a multidão */
  pax6: pele('#0a0a12', '#5a3620', '#1a1a22', '#e8a33c', '#2a2a38', '#14141c', '#6a4a1a'),
  pax7: pele('#0a0a12', '#f0c8a0', '#8a5a2a', '#c0392b', '#33334a', '#14141c', '#5a2a2a'),
  pax8: pele('#0a0a12', '#8a5a3c', '#4a2a1a', '#2f7d5e', '#25304d', '#14141c', '#1a3a2c'),
  pax9: pele('#0a0a12', '#c99a70', '#d8d8e8', '#4a5a7a', '#2e2e40', '#14141c', '#8a5a34'),
  pax10: pele('#0a0a12', '#e0b088', '#2a2a30', '#a05ac8', '#22283a', '#14141c', '#e8e4ff'),
  pax11: pele('#0a0a12', '#b07d52', '#7a4a2a', '#d8d8e8', '#3a3a4d', '#14141c', '#3a6fb0'),
  /* senhoras, mães e pais de criança de colo */
  senhora: pele('#0a0a12', '#f0c8a0', '#d8d8e8', '#8a5a9a', '#4a4438', '#14141c', '#f0eeff'),
  senhorB: pele('#0a0a12', '#8a5a3c', '#c8c8d8', '#4a5a7a', '#3a3a4d', '#14141c', '#f0eeff'),
  colo0: pele('#0a0a12', '#c99a70', '#3a2a22', '#c85a9a', '#2a2a38', '#14141c', '#ffe08a'),
  colo1: pele('#0a0a12', '#8a5a3c', '#1a1a22', '#3a6fb0', '#25304d', '#14141c', '#e8e4f4'),
  colo2: pele('#0a0a12', '#f0c8a0', '#8a5a2a', '#2f7d5e', '#2e2e40', '#14141c', '#8bd0ff'),
  pedinte2: pele('#0a0a12', '#c99a70', '#5a4a3a', '#4a4438', '#3a3a30', '#2a2a2a', '#8a8272')
};

/* desenha um quadro 32x48 a partir da silhueta 16x24, com sombreamento */
function desenhaQuadro(c2d, art, pal, ox, oy) {
  var L = 16, A = 24;
  // mapa de material ampliado
  var mat = [];
  for (var y = 0; y < A * 2; y++) {
    mat[y] = [];
    for (var x = 0; x < L * 2; x++) {
      var ch = art[y >> 1][x >> 1];
      mat[y][x] = (ch === '.') ? null : ch;
    }
  }
  function m(x, y) {
    if (x < 0 || y < 0 || x >= L * 2 || y >= A * 2) return null;
    return mat[y][x];
  }
  for (var yy = 0; yy < A * 2; yy++) {
    for (var xx = 0; xx < L * 2; xx++) {
      var mt = mat[yy][xx];
      if (!mt) continue;
      var base = pal[mt];
      if (!base) continue;
      var cor;
      if (mt === 'o') {
        cor = base;                                   // contorno não recebe luz
      } else {
        var luz = (m(xx, yy - 1) !== mt) || (m(xx - 1, yy) !== mt);
        var som = (m(xx, yy + 1) !== mt) || (m(xx + 1, yy) !== mt);
        if (luz && !som) cor = clarear(base, 0.28);
        else if (som && !luz) cor = escurecer(base, 0.3);
        else cor = base;
        // faixa de sombra na metade de baixo do corpo, dá volume
        if (!luz && yy > A) cor = escurecer(cor, 0.08);
      }
      c2d.fillStyle = cor;
      c2d.fillRect(ox + xx, oy + yy, 1, 1);
    }
  }
}

function geraSheet(scene, key, pal, corpo) {
  if (scene.textures.exists(key)) return;
  var tex = scene.textures.createCanvas(key, 96, 144);
  var c2d = tex.getContext();
  var q = quadrosDoCorpo(corpo);
  var linhas = [q.down, q.up, q.side];
  for (var l = 0; l < 3; l++) {
    for (var c = 0; c < 3; c++) desenhaQuadro(c2d, linhas[l][c], pal, c * 32, l * 48);
  }
  tex.refresh();
  for (var i = 0; i < 9; i++) tex.add(i, 0, (i % 3) * 32, Math.floor(i / 3) * 48, 32, 48);
}

/* =========================================================
   GENTE OCUPA ESPAÇO

   Cada pessoa é um corpo elíptico rente ao chão — só os pés, não
   o sprite inteiro, que é alto. O jogador não atravessa ninguém.

   E não trava também: ele empurra, devagar. Travar seria pior que
   atravessar, porque bastaria alguém parar bem na porta do trem
   pra corrida acabar ali. Empurrar resolve os dois — a multidão
   pesa, mas sempre cede se você insistir. É como se anda em vagão
   cheio de verdade.
   ========================================================= */
var CORPO_RX = 9, CORPO_RY = 6;      // meios-eixos do corpo, em pixels
var ACHATA = CORPO_RX / CORPO_RY;    // leva a elipse pra um círculo e volta

/* separa dois corpos sobrepostos. peso 1 = anda tudo, 0 = fica no lugar */
function separaCorpos(a, b, pesoA, pesoB) {
  var dx = a.x - b.x;
  var dy = (a.y - b.y) * ACHATA;
  var d2 = dx * dx + dy * dy;
  var r = CORPO_RX * 2;
  if (d2 > r * r) return false;
  var d = Math.sqrt(d2);
  if (d < 0.5) {                     // exatamente em cima: desempata pro lado
    a.x += pesoA > 0 ? 1 : 0;
    b.x -= pesoB > 0 ? 1 : 0;
    return true;
  }
  var sobra = (r - d) / d;
  a.x += dx * sobra * pesoA;
  a.y += dy * sobra * pesoA / ACHATA;
  b.x -= dx * sobra * pesoB;
  b.y -= dy * sobra * pesoB / ACHATA;
  return true;
}

/* Resolve o jogador contra a gente em volta, e a gente entre si.
   `gente` são Atores; quem tem .fixo (sentado, encostado, o guardinha)
   não sai do lugar. `limita` é a regra de parede de cada cena, que é
   diferente em cada uma — sem ela um empurrão poderia jogar alguém
   pra dentro do trilho. */
function resolveCorpos(pl, gente, limitaPl, limitaNpc) {
  var i, j, o;
  for (i = 0; i < gente.length; i++) {
    o = gente[i];
    if (!o || !o.sp || !o.sp.active) continue;
    var peso = o.fixo ? 0 : 0.4;
    if (separaCorpos(pl.sp, o.sp, 1 - peso, peso)) {
      if (limitaPl) limitaPl(pl.sp);
      if (!o.fixo && limitaNpc) limitaNpc(o.sp);
    }
  }
  // a multidão também não se atravessa, mas com muito menos empenho
  for (i = 0; i < gente.length; i++) {
    if (!gente[i] || !gente[i].sp || gente[i].fixo) continue;
    for (j = i + 1; j < gente.length; j++) {
      if (!gente[j] || !gente[j].sp) continue;
      var pj = gente[j].fixo ? 0 : 0.5;
      if (separaCorpos(gente[i].sp, gente[j].sp, 1 - pj, pj) && limitaNpc) {
        limitaNpc(gente[i].sp);
        if (!gente[j].fixo) limitaNpc(gente[j].sp);
      }
    }
  }
}

/* ---------- ator ---------- */
function Ator(scene, x, y, key) {
  this.sp = scene.add.sprite(x, y, key, 0);
  this.sp.setOrigin(0.5, 1);
  this.key = key;
  this.dir = 'down';
  this.t = 0;
  this.andando = false;
}
Ator.prototype.setDir = function (dx, dy) {
  if (Math.abs(dx) > Math.abs(dy)) this.dir = dx < 0 ? 'left' : 'right';
  else if (dy !== 0) this.dir = dy < 0 ? 'up' : 'down';
};
Ator.prototype.anima = function (dt, andando) {
  this.andando = andando;
  if (andando) this.t += dt; else this.t = 0;
  var base = (this.dir === 'up') ? 3 : (this.dir === 'down' ? 0 : 6);
  var passo = andando ? (1 + (Math.floor(this.t / 130) % 2)) : 0;
  this.sp.setFrame(base + passo);
  this.sp.setFlipX(this.dir === 'left');
};
Ator.prototype.pos = function (x, y) { this.sp.x = x; this.sp.y = y; };
Ator.prototype.destroy = function () { this.sp.destroy(); };

/* ---------- áudio ---------- */
/* Painel lateral do desktop. Quando existe, a tarja da hora e a faixa de
   dica saem de cima do jogo e vão pra ele — sobra tela e o canvas fica
   com o jogo e mais nada. No celular ele é nulo e tudo desenha no canvas
   como sempre. Quem preenche é o src/painel.js. */
var PAINEL = null;

var SOM_LIGADO = true;
try {
  SOM_LIGADO = (localStorage.getItem('metrosp_som') !== '0');
} catch (e) { }
function ligaSom(v) {
  SOM_LIGADO = !!v;
  try { localStorage.setItem('metrosp_som', SOM_LIGADO ? '1' : '0'); } catch (e) { }
  if (SOM_LIGADO) audioOn();
}

var AC = null;
function audioOn() {
  if (!AC && (window.AudioContext || window.webkitAudioContext)) {
    AC = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (AC && AC.state === 'suspended') AC.resume();
}
function tom(f, d, tipo, vol) {
  if (!AC) return;
  var o = AC.createOscillator(), g = AC.createGain(), t = AC.currentTime;
  o.type = tipo || 'square'; o.frequency.value = f;
  g.gain.setValueAtTime(vol || 0.05, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + d);
  o.connect(g); g.connect(AC.destination); o.start(t); o.stop(t + d + 0.02);
}
function sfx(n) {
  if (!SOM_LIGADO) return;
  switch (n) {
    case 'ok': tom(660, .07); setTimeout(function () { tom(880, .09); }, 70); break;
    case 'nao': tom(150, .16, 'sawtooth'); break;
    case 'moeda': tom(1046, .05); setTimeout(function () { tom(1568, .1); }, 55); break;
    case 'empurra': tom(110 + Math.random() * 70, .05, 'sawtooth'); break;
    case 'porta': tom(440, .06, 'sine', .06); setTimeout(function () { tom(330, .12, 'sine', .06); }, 70); break;
    case 'apito': tom(2200, .09); setTimeout(function () { tom(2600, .13); }, 90); break;
    case 'trem': tom(65, .6, 'sawtooth', .05); break;
    case 'catraca': tom(880, .04); setTimeout(function () { tom(1320, .06); }, 45); break;
    case 'erro': tom(200, .1, 'square', .06); setTimeout(function () { tom(120, .22, 'square', .06); }, 100); break;
    case 'fim': [392, 330, 262, 196].forEach(function (f, i) { setTimeout(function () { tom(f, .22, 'triangle', .07); }, i * 160); }); break;
    case 'vitoria': [523, 659, 784, 1046].forEach(function (f, i) { setTimeout(function () { tom(f, .14); }, i * 110); }); break;
  }
}

/* ---------- controle (teclado + toque) ---------- */
/* pulso: um toque rápido pode começar e terminar dentro do mesmo quadro.
   Sem guardar o pulso, o dedo aperta e o jogo não vê nada. */
var TOUCH = { up: false, down: false, left: false, right: false, act: false, pulso: false };
var TOQUE_ATIVO = false;
/* O HUD e o direcional não servem em toda tela: no título não tem
   medidor pra mostrar, e no resultado o direcional não leva a lugar
   nenhum — lá o toque em qualquer lugar já é o Z. Esconder o que não
   serve devolve a altura da tela pro texto respirar. */
var HUD_VISIVEL = true;
var CONTROLES_VISIVEIS = true;

/* O comando de agir é o mesmo em toda parte — clique, toque ou espaço —
   mas o nome dele não: quem está no computador clica, quem está no
   celular toca. A dica na tela fala a língua do aparelho. */
function nomeAgir() { return TOQUE_ATIVO ? 'TOQUE' : 'CLIQUE'; }
function alturaControles() { return (TOQUE_ATIVO && CONTROLES_VISIVEIS) ? 108 : 0; }

var Ctrl = {
  up: false, down: false, left: false, right: false,
  act: false, actJust: false, back: false, backJust: false,
  _pa: false, _pb: false,
  liga: function (scene) {
    /* WASD e espaço são o controle principal; setas, Z e enter continuam
       valendo pra quem já pegou o costume. enableCapture segura o espaço
       antes que o navegador role a página com ele. */
    this.k = scene.input.keyboard.addKeys(
      'W,A,S,D,SPACE,UP,DOWN,LEFT,RIGHT,Z,X,ENTER,ESC', true, true);
  },
  update: function () {
    var k = this.k;
    this.up = k.W.isDown || k.UP.isDown || TOUCH.up;
    this.down = k.S.isDown || k.DOWN.isDown || TOUCH.down;
    this.left = k.A.isDown || k.LEFT.isDown || TOUCH.left;
    this.right = k.D.isDown || k.RIGHT.isDown || TOUCH.right;
    var a = k.SPACE.isDown || k.Z.isDown || k.ENTER.isDown || TOUCH.act || TOUCH.pulso;
    this.actJust = a && !this._pa; this._pa = a; this.act = a;
    TOUCH.pulso = false;
    var b = k.X.isDown || k.ESC.isDown;
    this.backJust = b && !this._pb; this._pb = b; this.back = b;
  }
};

/* =========================================================
   FONTE DE BITMAP
   Glifo 5x7, célula 6x10, desenhada pixel a pixel.
   As duas primeiras linhas guardam o acento e a última a
   cedilha, então Á Ã Ç cabem sem cortar.
   ========================================================= */
var GLIFOS = {
  'A': ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  'B': ['####.', '#...#', '#...#', '####.', '#...#', '#...#', '####.'],
  'C': ['.###.', '#...#', '#....', '#....', '#....', '#...#', '.###.'],
  'D': ['####.', '#...#', '#...#', '#...#', '#...#', '#...#', '####.'],
  'E': ['#####', '#....', '#....', '####.', '#....', '#....', '#####'],
  'F': ['#####', '#....', '#....', '####.', '#....', '#....', '#....'],
  'G': ['.###.', '#...#', '#....', '#.###', '#...#', '#...#', '.###.'],
  'H': ['#...#', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  'I': ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '#####'],
  'J': ['..###', '...#.', '...#.', '...#.', '...#.', '#..#.', '.##..'],
  'K': ['#...#', '#..#.', '#.#..', '##...', '#.#..', '#..#.', '#...#'],
  'L': ['#....', '#....', '#....', '#....', '#....', '#....', '#####'],
  'M': ['#...#', '##.##', '#.#.#', '#.#.#', '#...#', '#...#', '#...#'],
  'N': ['#...#', '##..#', '#.#.#', '#..##', '#...#', '#...#', '#...#'],
  'O': ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  'P': ['####.', '#...#', '#...#', '####.', '#....', '#....', '#....'],
  'Q': ['.###.', '#...#', '#...#', '#...#', '#.#.#', '#..#.', '.##.#'],
  'R': ['####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#'],
  'S': ['.####', '#....', '#....', '.###.', '....#', '....#', '####.'],
  'T': ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..'],
  'U': ['#...#', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  'V': ['#...#', '#...#', '#...#', '#...#', '#...#', '.#.#.', '..#..'],
  'W': ['#...#', '#...#', '#...#', '#.#.#', '#.#.#', '##.##', '#...#'],
  'X': ['#...#', '#...#', '.#.#.', '..#..', '.#.#.', '#...#', '#...#'],
  'Y': ['#...#', '#...#', '.#.#.', '..#..', '..#..', '..#..', '..#..'],
  'Z': ['#####', '....#', '...#.', '..#..', '.#...', '#....', '#####'],
  '0': ['.###.', '#...#', '#..##', '#.#.#', '##..#', '#...#', '.###.'],
  '1': ['..#..', '.##..', '..#..', '..#..', '..#..', '..#..', '.###.'],
  '2': ['.###.', '#...#', '....#', '...#.', '..#..', '.#...', '#####'],
  '3': ['####.', '....#', '....#', '.###.', '....#', '....#', '####.'],
  '4': ['...#.', '..##.', '.#.#.', '#..#.', '#####', '...#.', '...#.'],
  '5': ['#####', '#....', '####.', '....#', '....#', '#...#', '.###.'],
  '6': ['.###.', '#....', '#....', '####.', '#...#', '#...#', '.###.'],
  '7': ['#####', '....#', '...#.', '..#..', '..#..', '..#..', '..#..'],
  '8': ['.###.', '#...#', '#...#', '.###.', '#...#', '#...#', '.###.'],
  '9': ['.###.', '#...#', '#...#', '.####', '....#', '....#', '.###.'],
  ' ': ['.....', '.....', '.....', '.....', '.....', '.....', '.....'],
  '.': ['.....', '.....', '.....', '.....', '.....', '.....', '..#..'],
  ',': ['.....', '.....', '.....', '.....', '.....', '..#..', '.#...'],
  '!': ['..#..', '..#..', '..#..', '..#..', '..#..', '.....', '..#..'],
  '?': ['.###.', '#...#', '....#', '...#.', '..#..', '.....', '..#..'],
  ':': ['.....', '..#..', '.....', '.....', '..#..', '.....', '.....'],
  ';': ['.....', '..#..', '.....', '.....', '..#..', '.#...', '.....'],
  "'": ['..#..', '..#..', '.....', '.....', '.....', '.....', '.....'],
  '"': ['.#.#.', '.#.#.', '.....', '.....', '.....', '.....', '.....'],
  '-': ['.....', '.....', '.....', '.###.', '.....', '.....', '.....'],
  '+': ['.....', '..#..', '..#..', '#####', '..#..', '..#..', '.....'],
  '=': ['.....', '.....', '#####', '.....', '#####', '.....', '.....'],
  '/': ['....#', '....#', '...#.', '..#..', '.#...', '#....', '#....'],
  '(': ['...#.', '..#..', '.#...', '.#...', '.#...', '..#..', '...#.'],
  ')': ['.#...', '..#..', '...#.', '...#.', '...#.', '..#..', '.#...'],
  '$': ['..#..', '.####', '#.#..', '.###.', '..#.#', '####.', '..#..'],
  '%': ['##..#', '##.#.', '...#.', '..#..', '.#...', '.#.##', '#..##'],
  '<': ['...#.', '..#..', '.#...', '#....', '.#...', '..#..', '...#.'],
  '>': ['.#...', '..#..', '...#.', '....#', '...#.', '..#..', '.#...'],
  '#': ['.#.#.', '#####', '.#.#.', '#####', '.#.#.', '.....', '.....'],
  '*': ['.....', '#.#.#', '.###.', '#####', '.###.', '#.#.#', '.....'],
  '▲': ['.....', '..#..', '.###.', '#####', '.....', '.....', '.....'],
  '▼': ['.....', '.....', '.....', '#####', '.###.', '..#..', '.....'],
  '◄': ['...#.', '..##.', '.###.', '####.', '.###.', '..##.', '...#.'],
  '►': ['.#...', '.##..', '.###.', '.####', '.###.', '.##..', '.#...']
};
var ACENTOS = {
  agudo: ['...#.', '..#..'],
  grave: ['.#...', '..#..'],
  til: ['.##.#', '#..##'],
  circ: ['..#..', '.#.#.']
};
var CEDILHA = '..#..';
var ACENTUADOS = {
  'Á': ['A', 'agudo'], 'À': ['A', 'grave'], 'Ã': ['A', 'til'], 'Â': ['A', 'circ'],
  'É': ['E', 'agudo'], 'Ê': ['E', 'circ'], 'Í': ['I', 'agudo'],
  'Ó': ['O', 'agudo'], 'Õ': ['O', 'til'], 'Ô': ['O', 'circ'],
  'Ú': ['U', 'agudo'], 'Ç': ['C', 'cedilha']
};
var CHARSET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 .,!?:;\'"-+=/()$%<>#*ÁÀÃÂÉÊÍÓÕÔÚÇ▲▼◄►';
var CEL_W = 6, CEL_H = 10, POR_LINHA = 16;

function geraFonte(scene) {
  if (scene.cache.bitmapFont.has('px')) return;
  var linhas = Math.ceil(CHARSET.length / POR_LINHA);
  var tex = scene.textures.createCanvas('fonte_px', POR_LINHA * CEL_W, linhas * CEL_H);
  var c = tex.getContext();
  c.fillStyle = '#ffffff';
  for (var i = 0; i < CHARSET.length; i++) {
    var ch = CHARSET[i];
    var cx = (i % POR_LINHA) * CEL_W;
    var cy = Math.floor(i / POR_LINHA) * CEL_H;
    var base = ch, ac = null;
    if (ACENTUADOS[ch]) { base = ACENTUADOS[ch][0]; ac = ACENTUADOS[ch][1]; }
    var g = GLIFOS[base];
    if (g) {
      for (var r = 0; r < 7; r++) {
        for (var col = 0; col < 5; col++) {
          if (g[r][col] === '#') c.fillRect(cx + col, cy + 2 + r, 1, 1);
        }
      }
    }
    if (ac === 'cedilha') {
      for (var k = 0; k < 5; k++) if (CEDILHA[k] === '#') c.fillRect(cx + k, cy + 9, 1, 1);
    } else if (ac) {
      var a = ACENTOS[ac];
      for (var r2 = 0; r2 < 2; r2++) {
        for (var c2 = 0; c2 < 5; c2++) {
          if (a[r2][c2] === '#') c.fillRect(cx + c2, cy + r2, 1, 1);
        }
      }
    }
  }
  tex.refresh();
  scene.cache.bitmapFont.add('px', Phaser.GameObjects.RetroFont.Parse(scene, {
    image: 'fonte_px',
    width: CEL_W, height: CEL_H,
    chars: CHARSET, charsPerRow: POR_LINHA,
    offset: { x: 0, y: 0 }, spacing: { x: 0, y: 0 }, lineSpacing: 2
  }));
}

(function remendaBitmapText() {
  var BT = Phaser.GameObjects.BitmapText.prototype;
  var textoOriginal = BT.setText;
  BT.setText = function (v) {
    var s = String(v === null || v === undefined ? '' : v).toUpperCase();
    var limpo = '';
    for (var i = 0; i < s.length; i++) {
      var ch = s[i];
      limpo += (ch === '\n' || CHARSET.indexOf(ch) >= 0) ? ch : ' ';
    }
    return textoOriginal.call(this, limpo);
  };
  BT.setColor = function (cor) {
    this.setTint(Phaser.Display.Color.HexStringToColor(cor).color);
    return this;
  };
  BT.setWordWrapWidth = function (w) {
    this.setMaxWidth(Math.round(w));   // maxWidth já é medido na tela, com a escala aplicada
    return this;
  };
  BT.setResolution = function () { return this; };
  BT.setAlign = function (a) {
    if (a === 'center' && this.setCenterAlign) this.setCenterAlign();
    return this;
  };
  if (!BT.setLineSpacing) BT.setLineSpacing = function () { return this; };
})();

/* ---------- utilidades de UI ---------- */
var ESCALA_TEXTO = 2;   // a resolução dobrou, o texto acompanha

function txt(scene, x, y, s, cor, tam) {
  var t = scene.add.bitmapText(Math.round(x), Math.round(y), 'px', '');
  t.setScale(ESCALA_TEXTO * Math.max(1, Math.round((tam || 8) / 8)));
  t.setColor(cor || PAL.branco);
  t.setText(s);
  return t;
}
function txtC(scene, x, y, s, cor, tam) {
  var t = txt(scene, x, y, s, cor, tam);
  t.setOrigin(0.5, 0);
  return t;
}

function caixa(g, x, y, w, h, corBorda) {
  g.fillStyle(0x0a0a14, 0.95); g.fillRect(x, y, w, h);
  g.fillStyle(0x1b1b2a, 1); g.fillRect(x + 2, y + 2, w - 4, 3);
  g.lineStyle(2, corBorda === undefined ? 0xf2f0ff : corBorda, 1);
  g.strokeRect(x + 1, y + 1, w - 2, h - 2);
}
function barra(g, x, y, w, h, pct, cor, corFundo) {
  g.fillStyle(corFundo === undefined ? 0x1e1e2a : corFundo, 1);
  g.fillRect(x, y, w, h);
  var p = Phaser.Math.Clamp(pct, 0, 1);
  var larg = Math.round(w * p);
  g.fillStyle(cor, 1);
  g.fillRect(x, y, larg, h);
  if (larg > 2) {
    g.fillStyle(0xffffff, 0.28);
    g.fillRect(x, y + 1, larg, Math.max(1, Math.floor(h / 3)));
  }
  g.lineStyle(1, 0x08080e, 1);
  g.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
}
/* textura pontilhada: dá granulação de 16 bits sem custo */
function pontilhado(g, x, y, w, h, cor, alpha, passo) {
  passo = passo || 4;
  g.fillStyle(cor, alpha === undefined ? 0.14 : alpha);
  for (var yy = y; yy < y + h; yy += passo) {
    for (var xx = x + ((yy / passo) % 2 ? passo / 2 : 0); xx < x + w; xx += passo) {
      g.fillRect(xx, yy, 2, 2);
    }
  }
}

/* =========================================================
   KIT DE INTERFACE
   Letra solta em cima de piso quadriculado some e deixa a tela
   com cara de rascunho. Tudo que o jogo escreve por cima da
   cena mora numa chapa escura, e as chapas moram sempre nos
   mesmos lugares: aviso no alto, dica na faixa de baixo.
   ========================================================= */

/* chapa que acompanha o tamanho do texto */
function Plaqueta(scene, x, y, cfg) {
  cfg = cfg || {};
  var d = (cfg.depth === undefined) ? 800 : cfg.depth;
  this.x = Math.round(x); this.y = Math.round(y);
  this.centro = (cfg.centro !== false);
  this.filete = cfg.filete || null;
  this.g = scene.add.graphics().setDepth(d);
  this.t = txt(scene, this.x, this.y + 5, '', cfg.cor || PAL.branco, cfg.tam || 8).setDepth(d + 1);
  if (this.centro) this.t.setOrigin(0.5, 0);
  this.t.setWordWrapWidth(cfg.largura || (GW - 24));
  if (cfg.centro !== false) this.t.setAlign('center');
  this.setText(cfg.texto || '');
}
Plaqueta.prototype.setText = function (txto) {
  if (this.ultimo === txto) return this;
  this.ultimo = txto;
  this.g.clear();
  if (!txto) { this.t.setVisible(false); return this; }
  this.t.setVisible(true).setText(txto);
  var w = Math.round(this.t.width), h = Math.round(this.t.height);
  var x0 = this.centro ? this.x - Math.round(w / 2) : this.x;
  var lx = x0 - 7, ly = this.y, lw = w + 14, lh = h + 10;
  this.g.fillStyle(0x08080e, 0.8).fillRect(lx, ly, lw, lh);
  this.g.fillStyle(0x232336, 0.9).fillRect(lx, ly, lw, 2);
  this.g.fillStyle(0x000000, 0.4).fillRect(lx, ly + lh - 2, lw, 2);
  if (this.filete) this.g.fillStyle(this.filete, 1).fillRect(lx, ly + lh - 2, lw, 2);
  return this;
};
Plaqueta.prototype.setCor = function (c) { this.t.setColor(c); return this; };
Plaqueta.prototype.texto = function () { return this.ultimo || ''; };
Plaqueta.prototype.setY = function (y) {
  if (this.y === y) return this;
  this.y = Math.round(y);
  this.t.y = this.y + 5;
  var atual = this.ultimo; this.ultimo = null;
  return this.setText(atual);
};
Plaqueta.prototype.setFilete = function (c) {
  if (this.filete === c) return this;
  this.filete = c; this.ultimo = null;
  return this.setText(this.t.text);
};

/* a faixa de dica: mesma altura, mesma cor, em todas as cenas.
   É ela que dá o chão pro texto e tira a sensação de letra jogada. */
function FaixaDica(scene, depth) {
  var d = (depth === undefined) ? 860 : depth;
  this.y = GH - 32 - alturaControles();
  this.g = scene.add.graphics().setDepth(d);
  this.t = txtC(scene, GW / 2, this.y + 6, '', PAL.amarelo, 8).setDepth(d + 1);
  this.setText('');
}
FaixaDica.prototype.setText = function (txto, cor) {
  if (cor) this.t.setColor(cor);
  var chave = txto + (PAINEL ? '|lado' : '') + (cor || '');
  if (this.ultimo === chave) return this;
  this.ultimo = chave;
  this.g.clear();

  if (PAINEL) {                       // a dica vive no painel do desktop
    this.t.setVisible(false);
    PAINEL.dica(txto, cor);
    return this;
  }
  if (!txto) { this.t.setVisible(false); return this; }
  this.t.setVisible(true).setText(txto);
  this.g.fillStyle(0x08080e, 0.82).fillRect(0, this.y, GW, 26);
  this.g.fillStyle(0x232336, 0.9).fillRect(0, this.y, GW, 1);
  this.g.fillStyle(0x000000, 0.45).fillRect(0, this.y + 25, GW, 1);
  return this;
};

/* tarja da hora, colada embaixo do HUD: é o letreiro da estação.
   Ocupa a largura toda de propósito — vira moldura da tela em vez
   de mais um texto solto no meio do cenário. */
function FaixaHora(scene, depth) {
  var d = (depth === undefined) ? 70 : depth;
  this.g = scene.add.graphics().setDepth(d);
  this.tHora = txt(scene, 10, HUD_H + 1, '', PAL.branco, 8).setDepth(d + 1);
  this.tFaixa = txt(scene, GW - 14, HUD_H + 1, '', PAL.cinza, 8).setDepth(d + 1).setOrigin(1, 0);
  this.chave = null;
  this.atualiza();
}
/* o relógio anda enquanto você espera o trem: a tarja acompanha */
FaixaHora.prototype.atualiza = function () {
  var f = GameState.faixa(), h = GameState.hora();
  var chave = f.key + h + (PAINEL ? '|lado' : '');
  if (this.chave === chave) return;
  this.chave = chave;

  if (PAINEL) {                       // o painel do desktop mostra a hora
    this.g.clear();
    this.tHora.setVisible(false);
    this.tFaixa.setVisible(false);
    PAINEL.hora(h, f);
    return;
  }
  this.tHora.setVisible(true).setText(h).setColor(f.cor);
  this.tFaixa.setVisible(true).setText(f.nome);
  this.g.clear();
  this.g.fillStyle(0x0a0a14, 0.9).fillRect(0, HUD_H, GW, 19);
  this.g.fillStyle(0x000000, 0.5).fillRect(0, HUD_H + 18, GW, 1);
  this.g.fillStyle(num(f.cor), 1).fillRect(0, HUD_H, 3, 19);
};

/* placa fixa de cenário: nome de setor pintado na estação */
function placa(scene, x, y, texto, cor, depth) {
  var p = new Plaqueta(scene, x, y, { cor: cor, depth: depth === undefined ? 3 : depth });
  p.setText(texto);
  return p;
}

/* véu de luz da hora: a mesma estação de madrugada e às 18h não tem
   a mesma cor. Fica por cima do cenário e por baixo de tudo que é vivo. */
function veuDaHora(scene, depth) {
  var f = GameState.faixa();
  if (!f.luzA) return null;
  var g = scene.add.graphics().setDepth(depth === undefined ? 90 : depth);
  g.fillStyle(f.luz, f.luzA).fillRect(0, HUD_H, GW, GH - HUD_H);
  return g;
}

/* ---------- diálogo ---------- */
function Dialog(scene, texto, opcoes, cfg) {
  cfg = cfg || {};
  this.scene = scene;
  this.opcoes = opcoes || [];
  this.sel = 0;
  this.ativo = true;
  this.tempo = cfg.tempo || 0;
  this.restante = this.tempo;
  this.aoExpirar = cfg.aoExpirar || null;

  // mede o texto já quebrado e só então desenha a caixa em volta dele
  this.tTexto = txt(scene, 20, -400, texto, PAL.branco, 8).setDepth(901);
  this.tTexto.setWordWrapWidth(GW - 40);
  var hTexto = Math.max(48, Math.round(this.tTexto.height));

  var alt = 28 + hTexto + this.opcoes.length * 24 + (this.tempo ? 20 : 0);
  var y = GH - alt - 12 - alturaControles();
  this.g = scene.add.graphics().setDepth(900);
  caixa(this.g, 8, y, GW - 16, alt, cfg.cor === undefined ? 0xf2f0ff : cfg.cor);
  this.y = y; this.alt = alt;
  this.tTexto.setPosition(20, y + 10);

  this.tOps = [];
  for (var i = 0; i < this.opcoes.length; i++) {
    var ty = y + 20 + hTexto + i * 24;
    this.tOps.push(txt(scene, 32, ty, this.opcoes[i].label, PAL.cinza, 8).setDepth(901));
  }
  this.cursor = txt(scene, 16, y + 20 + hTexto, '>', PAL.amarelo, 8).setDepth(901);
  if (this.opcoes.length === 0) this.cursor.setVisible(false);
  this.tTimer = null;
  if (this.tempo) {
    this.tTimer = txt(scene, GW - 24, y + 10, '', PAL.vermelho, 8).setDepth(901).setOrigin(1, 0);
  }
  this.redesenha();
}
Dialog.prototype.redesenha = function () {
  for (var i = 0; i < this.tOps.length; i++) {
    this.tOps[i].setColor(i === this.sel ? PAL.amarelo : PAL.cinza);
  }
  if (this.tOps.length) this.cursor.y = this.tOps[this.sel].y;
};
Dialog.prototype.update = function (dt) {
  if (!this.ativo) return;
  if (this.tempo) {
    this.restante -= dt / 1000;
    if (this.tTimer) this.tTimer.setText(Math.max(0, Math.ceil(this.restante)) + 'S');
    if (this.restante <= 0) {
      var f = this.aoExpirar; this.fecha();
      if (f) f();
      return;
    }
  }
  if (this.opcoes.length) {
    if (Ctrl.up && !this._pu) { this.sel = (this.sel + this.opcoes.length - 1) % this.opcoes.length; sfx('catraca'); this.redesenha(); }
    if (Ctrl.down && !this._pd) { this.sel = (this.sel + 1) % this.opcoes.length; sfx('catraca'); this.redesenha(); }
    this._pu = Ctrl.up; this._pd = Ctrl.down;
    if (Ctrl.actJust) {
      var op = this.opcoes[this.sel];
      this.fecha(); sfx('ok');
      if (op.cb) op.cb();
    }
  } else if (Ctrl.actJust) {
    var cb = this.aoExpirar; this.fecha();
    if (cb) cb();
  }
};
Dialog.prototype.fecha = function () {
  if (!this.ativo) return;
  this.ativo = false;
  this.g.destroy(); this.tTexto.destroy(); this.cursor.destroy();
  if (this.tTimer) this.tTimer.destroy();
  for (var i = 0; i < this.tOps.length; i++) this.tOps[i].destroy();
  if (this.scene.dialog === this) this.scene.dialog = null;
};

function fala(scene, texto, opcoes, cfg) {
  if (scene.dialog) scene.dialog.fecha();
  scene.dialog = new Dialog(scene, texto, opcoes, cfg);
  return scene.dialog;
}

/* ---------- HUD ---------- */
var HudScene = new Phaser.Class({
  Extends: Phaser.Scene,
  initialize: function HudScene() { Phaser.Scene.call(this, { key: 'Hud', active: false }); },

  create: function () {
    /* duas linhas, quatro âncoras fixas: onde está a estação hoje
       fica sempre no mesmo canto, e o número nunca dança de lugar */
    this.g = this.add.graphics().setDepth(1000);
    this.tEst = txt(this, 8, 4, '', PAL.branco, 8).setDepth(1001);
    this.tHora = txt(this, GW - 8, 4, '', PAL.amarelo, 8).setDepth(1001).setOrigin(1, 0);
    this.tCar = txt(this, 6, 26, 'C', PAL.cinzaEsc, 8).setDepth(1001);
    this.tDes = txt(this, 80, 26, 'D', PAL.cinzaEsc, 8).setDepth(1001);
    this.tNum = txt(this, 158, 26, '', PAL.cinza, 8).setDepth(1001);
    this.tGrana = txt(this, GW - 8, 26, '', PAL.verde, 8).setDepth(1001).setOrigin(1, 0);
    this.montaToque();
  },

  /* os controles precisam existir em toda tela, inclusive no título,
     por isso esta cena sobe junto com o jogo e nunca é desligada */
  montaToque: function () {
    var self = this;
    TOQUE_ATIVO = this.sys.game.device.input.touch;

    this.input.on('pointerdown', function (p) { self.toque(p); TOUCH.pulso = true; });
    this.input.on('pointermove', function (p) { if (p.isDown) self.toque(p); });
    this.input.on('pointerup', function () {
      TOUCH.up = TOUCH.down = TOUCH.left = TOUCH.right = TOUCH.act = false;
    });

    if (!TOQUE_ATIVO) return;

    var bx = 68, by = GH - 60, d = 36;
    this.bx = bx; this.by = by; this.d = d;
    this.zonas = [
      { x: bx, y: by - d, k: 'up' }, { x: bx, y: by + d, k: 'down' },
      { x: bx - d, y: by, k: 'left' }, { x: bx + d, y: by, k: 'right' }
    ];
    this.raio = 30;

    var gd = this.add.graphics().setDepth(1200);
    this.gControles = gd;
    gd.fillStyle(0x08080e, 0.5).fillRect(0, GH - alturaControles(), GW, alturaControles());
    gd.fillStyle(0xf2f0ff, 0.42);
    gd.fillRect(bx - 16, by - d - 18, 33, 33);
    gd.fillRect(bx - 16, by + d - 15, 33, 33);
    gd.fillRect(bx - d - 18, by - 16, 33, 33);
    gd.fillRect(bx + d - 15, by - 16, 33, 33);
    gd.fillStyle(0x08080e, 0.65);
    gd.fillTriangle(bx, by - d - 10, bx - 8, by - d + 6, bx + 8, by - d + 6);
    gd.fillTriangle(bx, by + d + 10, bx - 8, by + d - 6, bx + 8, by + d - 6);
    gd.fillTriangle(bx - d - 10, by, bx - d + 6, by - 8, bx - d + 6, by + 8);
    gd.fillTriangle(bx + d + 10, by, bx + d - 6, by - 8, bx + d - 6, by + 8);
    gd.fillStyle(0x00e676, 0.45).fillCircle(GW - 66, GH - 56, 36);
    gd.fillStyle(0x00e676, 0.25).fillCircle(GW - 66, GH - 56, 44);
    this.tZ = txtC(this, GW - 66, GH - 66, 'OK', PAL.branco, 16).setDepth(1201).setAlpha(0.85);
  },

  toque: function (p) {
    TOUCH.up = TOUCH.down = TOUCH.left = TOUCH.right = false;
    var noDpad = false;
    if (this.zonas && CONTROLES_VISIVEIS) {
      for (var i = 0; i < this.zonas.length; i++) {
        var z = this.zonas[i];
        if (Math.abs(p.x - z.x) < this.raio && Math.abs(p.y - z.y) < this.raio) {
          TOUCH[z.k] = true; noDpad = true;
        }
      }
    }
    TOUCH.act = !noDpad;
  },

  update: function () {
    var g = this.g; g.clear();
    if (this.gControles) {
      this.gControles.setVisible(CONTROLES_VISIVEIS);
      this.tZ.setVisible(CONTROLES_VISIVEIS);
    }
    var temJogo = !!GameState.char && HUD_VISIVEL;
    this.tEst.setVisible(temJogo); this.tNum.setVisible(temJogo);
    this.tGrana.setVisible(temJogo); this.tCar.setVisible(temJogo); this.tDes.setVisible(temJogo);
    this.tHora.setVisible(temJogo);
    if (!temJogo) return;

    var l = GameState.linhaAtual();
    g.fillStyle(0x0e0e18, 1); g.fillRect(0, 0, GW, HUD_H);
    g.fillStyle(0x1c1c2c, 1); g.fillRect(0, 0, GW, 2);
    g.fillStyle(0x000000, 0.35); g.fillRect(0, 22, GW, 1);        // separa as duas linhas
    g.fillStyle(l.num, 1); g.fillRect(0, HUD_H - 4, GW, 4);
    g.fillStyle(num(clarear(l.cor, 0.35)), 1); g.fillRect(0, HUD_H - 4, GW, 1);
    g.fillStyle(0x2a2a3c, 1); g.fillRect(150, 27, 1, 12);         // separa medidores de números

    var f = GameState.faixa();
    this.tEst.setText(GameState.estacaoAtual());
    this.tNum.setText('#' + GameState.estacoes);
    this.tGrana.setText('R$' + GameState.dinheiro.toFixed(2).replace('.', ','));
    this.tHora.setText('D' + GameState.dia + ' ' + GameState.hora()).setColor(f.cor);
    barra(g, 18, 29, 54, 10, GameState.carisma / 100, 0xe8a33c);
    barra(g, 92, 29, 54, 10, GameState.descanso / GameState.char.descansoMax, 0x00e676);
  }
});
