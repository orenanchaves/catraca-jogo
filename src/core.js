/* global Phaser */
/* =========================================================
   CATRACA — núcleo (16-bit)
   Resolução 320x576 · tile 32 · personagem 32x48
   Cada material tem rampa de 3 tons: luz, base e sombra.
   ========================================================= */

/* O HUD cresceu de 44 pra 52. Não era só o aperto lateral: as duas
   linhas tinham 6 pixels entre uma tinta e outra, e duas fileiras de
   coisa colada lê como um bloco só. Com 52 a distância vai pra 12, que
   é o que separa "duas linhas" de "uma linha grossa". Custa oito
   pixels de jogo, e todas as cenas desenham a partir de HUD_H. */
var GW = 320, GH = 576, HUD_H = 52;

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

/* As duas linhas inteiras, na ordem real, e a Sé no meio das duas — que
   é o que faz a baldeação existir. A vermelha só ia da Sé pra oeste; sem
   a metade leste não dava pra morar em Itaquera, que é de onde a maior
   parte da cidade pega esse trem.

   Nome de placa, não nome de portaria: 'ITAQUERA' e não
   'CORINTHIANS-ITAQUERA', porque a barra do HUD tem 320px e o relógio
   mora na outra ponta dela. */
var LINHAS = {
  azul: {
    nome: 'LINHA 1-AZUL', cor: '#0b5fae', num: 0x0b5fae,
    estacoes: ['JABAQUARA', 'CONCEIÇÃO', 'SÃO JUDAS', 'SAÚDE', 'PÇA. ÁRVORE',
      'SANTA CRUZ', 'VILA MARIANA', 'ANA ROSA', 'PARAÍSO', 'VERGUEIRO',
      'SÃO JOAQUIM', 'LIBERDADE', 'SÉ', 'SÃO BENTO', 'LUZ', 'TIRADENTES',
      'ARMÊNIA', 'PORTUGUESA', 'CARANDIRU', 'SANTANA', 'JD.SÃO PAULO',
      'PD. INGLESA', 'TUCURUVI']
  },
  vermelha: {
    nome: 'LINHA 3-VERMELHA', cor: '#e8362c', num: 0xe8362c,
    estacoes: ['BARRA FUNDA', 'MAL. DEODORO', 'STA. CECÍLIA', 'REPÚBLICA',
      'ANHANGABAÚ', 'SÉ', 'PEDRO II', 'BRÁS', 'BRESSER', 'BELÉM', 'TATUAPÉ',
      'CARRÃO', 'PENHA', 'VILA MATILDE', 'GUILHERMINA', 'PATRIARCA',
      'ARTUR ALVIM', 'ITAQUERA']
  }
};

/* ---------- o que faz perder ----------
   Carisma e descanso zerados já matavam, mas nenhum dos dois falava com
   o trajeto. Com destino e relógio existe a perda que a cidade cobra de
   verdade: chegar atrasado. Descer na estação errada, dormir e passar
   da sua, ficar no trem até a ponta da linha — tudo isso custa minutos,
   e minuto demais vira atraso. Um atraso e você é mandado embora.

   A volta não tem hora pra chegar, mas tem preço: quem chega tarde em
   casa dorme menos, e começa o dia seguinte com menos descanso. */
/* 68 minutos: medido em 200 trajetos por faixa de horário. Trajeto
   limpo leva de 39 a 58 e chega sempre; um erro é perdoado em 98% dos
   casos; três erros chegam no prazo em 13%. É a curva que queria — a
   cidade perdoa o tropeço e cobra o descuido. */
/* ---------- corações ----------
   Carisma e descanso são o desgaste longo da corrida; os corações são o
   fôlego de um trajeto só. Cinco por perna, um por minigame perdido, e
   voltam cheios quando você chega — porque cada trajeto é um dia novo,
   e o que quebra a pessoa é o dia, não a semana. Zerar é acabar. */
var CORACOES_POR_PERNA = 5;

var LIMITE_ATRASO = 68;
/* Um. Era tres, e tres avisos fazem do relogio uma sugestao: dava pra
   atrasar duas vezes de graca. Agora o primeiro atraso e o ultimo. */
var MAX_ATRASOS = 1;

/* onde as duas se cruzam, e o par fixo da corrida */
var BALDEACAO = 'SÉ';
var CASA = 'ITAQUERA';         // linha vermelha, ponta leste
var TRABALHO = 'VERGUEIRO';    // linha azul, quatro estações ao sul da Sé

function linhaDaEstacao(nome) {
  return LINHAS.azul.estacoes.indexOf(nome) >= 0 ? 'azul' : 'vermelha';
}

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

/* A hora de sair era uma lista fixa, uma por dia: dia 1 no pico da
   manhã, dia 2 de madrugada, e assim por diante. Isso dava variedade
   ENTRE os dias, mas o dia de dentro era sempre igual — sai, volta, e
   as duas pontas na mesma São Paulo.

   Agora quem diz a hora de cada perna é a rotina do personagem (ver
   ROTINAS em zipzap.js), e a variedade mudou de lugar: o estudante sai
   6h50 no pico, volta da faculdade 13h10 no entre-pico e pega o último
   trem às 22h40 — três São Paulos no mesmo dia. */

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
/* ---------- o que cada um sabe fazer ----------
   Os seis personagens diferiam só em número: tarifa, velocidade, dreno,
   quanto empurra. Trocar de personagem mudava a dificuldade, não o
   jogo — as mesmas ações, na mesma ordem, com os medidores andando mais
   rápido ou mais devagar.

   Agora cada um tem um verbo que só ele tem, e todos os seis mexem nos
   sistemas que já estavam de pé: o banco, o sono, a barra, a rota e o
   dinheiro. Escolher personagem passou a ser escolher como se joga o
   trajeto, não em que dificuldade. */
var PODERES = {
  chao: {
    nome: 'SENTAR NO CHÃO',
    como: 'No chão, fora do pico.'
  },
  cochilo: {
    nome: 'COCHILAR NA BARRA',
    como: 'Dorme em pé. Perde a rota.'
  },
  pedeLugar: {
    nome: 'PEDIR O LUGAR',
    como: 'Pede o banco dos outros.'
  },
  vende: {
    nome: 'VENDER NO VAGÃO',
    como: 'Vende no vagão. Tem risco.'
  },
  perdido: {
    nome: 'NÃO SABE A LINHA',
    como: 'Só vê a rota de perto.'
  }
};

var CHARS = {
  estudante: {
    nome: 'ESTUDANTE', asset: 'estudante',
    desc: 'Meia passagem. Mochila atrapalha.',
    tarifa: 2.60, dinheiro: 14.00, carisma: 55, descanso: 90, descansoMax: 100,
    dreno: 0.9, velocidade: 108, empurraoMult: 0.8, gratuidade: false, valeTransporte: 0,
    poder: 'chao',
    visual: { m: { corpo: 'bone_mochila', pal: 'estudante' }, f: { corpo: 'rabo_mochila', pal: 'estudanteF' } }
  },
  clt: {
    nome: 'CLT', asset: 'clt',
    desc: 'Vale-transporte. Já sai cansado.',
    tarifa: 5.20, dinheiro: 9.00, carisma: 60, descanso: 55, descansoMax: 100,
    dreno: 1.35, velocidade: 92, empurraoMult: 1.0, gratuidade: false, valeTransporte: 2,
    poder: 'cochilo',
    visual: { m: { corpo: 'padrao', pal: 'clt' }, f: { corpo: 'bolsa', pal: 'cltF' } }
  },
  senhor: {
    nome: 'IDOSO', asset: 'senhor',
    desc: 'Passa de graça. Recebe o lugar.',
    tarifa: 0, dinheiro: 20.00, carisma: 75, descanso: 70, descansoMax: 70,
    dreno: 1.1, velocidade: 62, empurraoMult: 0.7, gratuidade: true, valeTransporte: 0,
    poder: 'pedeLugar', nomeF: 'IDOSA',
    visual: { m: { corpo: 'senhor', pal: 'senhor' }, f: { corpo: 'senhora_coque', pal: 'senhoraJog' } }
  },
  ambulante: {
    nome: 'AMBULANTE', asset: 'ambulante',
    desc: 'Vende no vagão. Guardinha persegue.',
    tarifa: 5.20, dinheiro: 6.00, carisma: 50, descanso: 80, descansoMax: 100,
    dreno: 1.0, velocidade: 118, empurraoMult: 1.15, gratuidade: false, valeTransporte: 0,
    poder: 'vende',
    visual: { m: { corpo: 'bone', pal: 'ambulante' }, f: { corpo: 'rabo', pal: 'ambulanteF' } }
  },
  gestante: {
    nome: 'GESTANTE', asset: 'gestante',
    desc: 'Recebe o lugar. Cansa em dobro.',
    tarifa: 5.20, dinheiro: 12.00, carisma: 80, descanso: 60, descansoMax: 80,
    dreno: 1.5, velocidade: 74, empurraoMult: 0.65, gratuidade: false, valeTransporte: 0,
    /* Ela também pede o lugar, e pra ela ninguém recusa. O que a separa
       do idoso é o resto: cansa em dobro, e a multidão abre caminho. */
    poder: 'pedeLugar', abremCaminho: true, nuncaRecusam: true,
    poderRotulo: 'ABREM CAMINHO',
    poderComo: 'Ninguém recusa a ela.',
    /* a única sem escolha de gênero, e por causa do próprio verbo: o
       dela é estar grávida */
    visual: { f: { corpo: 'gestante', pal: 'gestanteJog' } },
    preco: 90
  },
  turista: {
    nome: 'TURISTA', asset: 'turista',
    desc: 'Grana sobrando. Se perde fácil.',
    tarifa: 5.20, dinheiro: 40.00, carisma: 45, descanso: 100, descansoMax: 100,
    dreno: 1.25, velocidade: 98, empurraoMult: 0.9, gratuidade: false, valeTransporte: 0,
    poder: 'perdido',
    visual: { m: { corpo: 'bone_mochila', pal: 'turista' }, f: { corpo: 'mochila_longo', pal: 'turistaF' } },
    preco: 150
  }
};

/* ---------- gênero, e o passo de cada um ----------
   Quem joga escolhe um personagem pra ser. O elenco vinha com um gênero
   decidido de fábrica em cada carta, e metade de quem pega esse trem
   toda manhã não tinha onde se reconhecer.

   Gênero aqui é ARTE e NOME, nunca número: o mesmo estudante corre o
   mesmo tanto, cansa o mesmo tanto e paga a mesma meia passagem nas duas
   versões. Amarrar estatística a gênero seria inventar uma diferença
   que não existe, e o jogo não tem nada a ganhar com isso. O que muda é
   o corpo (cabelo, silhueta, o que carrega), o tom da roupa e, quando o
   português pede, o nome: IDOSO e IDOSA.

   A gestante é a única sem escolha, e por um motivo que é do próprio
   personagem: o verbo dela é estar grávida. */
var GENEROS = ['m', 'f'];

function generosDe(k) {
  var v = CHARS[k] && CHARS[k].visual, out = [];
  for (var i = 0; i < GENEROS.length; i++) if (v && v[GENEROS[i]]) out.push(GENEROS[i]);
  return out;
}
/* o gênero válido mais próximo do pedido: personagem de um gênero só
   devolve o dele, e não uma carta em branco */
function generoValido(k, g) {
  var l = generosDe(k);
  return l.indexOf(g) >= 0 ? g : (l[0] || 'm');
}
function outroGenero(k, g) {
  var l = generosDe(k);
  if (l.length < 2) return g;
  return l[(l.indexOf(generoValido(k, g)) + 1) % l.length];
}
function spriteChar(k, g) { return 'ch_' + k + '_' + generoValido(k, g); }
function spriteJogador() { return spriteChar(GameState.charKey, GameState.genero); }
function nomeDoChar(k, g) {
  var c = CHARS[k];
  return (generoValido(k, g) === 'f' && c.nomeF) ? c.nomeF : c.nome;
}

/* a escolha fica gravada por personagem: quem joga de estudante mulher
   não quer reescolher isso toda partida */
function leGenero(k) {
  try { return generoValido(k, localStorage.getItem('metrosp_genero_' + k) || 'm'); }
  catch (e) { return generoValido(k, 'm'); }
}
function gravaGenero(k, g) {
  try { localStorage.setItem('metrosp_genero_' + k, generoValido(k, g)); } catch (e) { }
}

/* ---------- o passo ----------
   A velocidade sempre existiu na ficha e nunca apareceu em lugar
   nenhum: nem na tela de escolha, nem em palavra dentro do jogo. Quem
   trocava de personagem sentia alguma coisa diferente e não sabia
   dizer o quê. Agora a faixa é larga o bastante pra sentir (o ambulante
   anda quase o dobro do idoso) e tem nome na tela de escolha. */
var PASSOS = [
  { ate: 70, nome: 'DEVAGAR' },
  { ate: 84, nome: 'SEM PRESSA' },
  { ate: 100, nome: 'NORMAL' },
  { ate: 112, nome: 'LIGEIRO' },
  { ate: 999, nome: 'CORRIDO' }
];
function nomeDoPasso(v) {
  for (var i = 0; i < PASSOS.length; i++) if (v <= PASSOS[i].ate) return PASSOS[i].nome;
  return PASSOS[PASSOS.length - 1].nome;
}

/* ---------- o que se come na estação ----------
   Não existia jeito de recuperar fôlego dentro de uma partida: descanso
   só subia sentado no vagão, e coração só voltava no trajeto seguinte.
   Quem começava mal, terminava pior.

   Comprar comida na estação é a saída, e é a mais são-paulina que tem:
   a banca, o carrinho de dogão, o ambulante com a caixa de isopor. Cada
   compra custa dinheiro e alguns minutos do relógio — quem está
   adiantado come, quem está atrasado passa reto. É o mesmo relógio que
   decide tudo no jogo.

   A água vale mais no calor: no pico e nas faixas quentes o corpo pede
   mais, e é quando ela salva. */
var ITENS = {
  chocolate: { nome: 'CHOCOLATE', preco: 2.00, descanso: 8, min: 1 },
  doce: { nome: 'DOCE', preco: 1.00, descanso: 5, min: 1 },
  pururuca: { nome: 'PURURUCA', preco: 3.00, descanso: 10, min: 1, carisma: 1 },
  agua: { nome: 'ÁGUA', preco: 3.00, descanso: 12, min: 1, noCalor: 1.6 },
  cafe: { nome: 'CAFÉ', preco: 4.00, descanso: 16, min: 2 },
  dogao: { nome: 'DOGÃO', preco: 12.00, descanso: 26, min: 4, coracao: true },
  jornal: { nome: 'JORNAL', preco: 4.00, descanso: 4, min: 1, carisma: 5 }
};

/* Calor é o que faz a água valer o preço: as faixas de mais movimento
   são as mais abafadas, e o vagão cheio é uma sauna. */
function estaCalor() {
  return GameState.lotacao() > 0.55 ||
    (GameState.minutos > 11 * 60 && GameState.minutos < 17 * 60);
}

/* ---------- pontos e personagens destravados ----------
   Os minigames deixaram de ser só um susto no meio da viagem: ganhar dá
   ponto, e ponto atravessa a corrida — fica guardado mesmo quando a
   cidade te quebra. É o que faz valer a pena encarar o rimador numa
   segunda-feira já sabendo que a semana vai acabar mal.

   O elenco que já existia continua aberto. Cobrar por ele seria tirar
   de quem já jogava, e comprar tem que abrir coisa nova, não retirar o
   que estava lá. Os pontos abrem os dois que entraram junto com eles. */
var LIVRES_DE_SAIDA = ['estudante', 'clt', 'senhor', 'ambulante'];

function lePontos() {
  try { return parseInt(localStorage.getItem('metrosp_pontos') || '0', 10) || 0; } catch (e) { return 0; }
}
function gravaPontos(n) {
  try { localStorage.setItem('metrosp_pontos', String(Math.max(0, n))); } catch (e) { }
}
function leDestravados() {
  var l = LIVRES_DE_SAIDA.slice(0);
  try {
    var g = (localStorage.getItem('metrosp_destravados') || '').split(',');
    for (var i = 0; i < g.length; i++) if (CHARS[g[i]] && l.indexOf(g[i]) < 0) l.push(g[i]);
  } catch (e) { }
  return l;
}
function destravado(k) { return leDestravados().indexOf(k) >= 0; }
function destrava(k) {
  if (destravado(k)) return;
  var l = leDestravados();
  l.push(k);
  try { localStorage.setItem('metrosp_destravados', l.join(',')); } catch (e) { }
}
function precoDe(k) { return CHARS[k] && CHARS[k].preco ? CHARS[k].preco : 0; }

/* compra se der: devolve o que aconteceu, pra tela dizer o porquê */
function compraPersonagem(k) {
  if (destravado(k)) return 'ja';
  var p = lePontos(), c = precoDe(k);
  if (p < c) return 'falta';
  gravaPontos(p - c);
  destrava(k);
  return 'ok';
}

/* ---------- estado global ---------- */
var GameState = {
  init: function (charKey, genero) {
    var c = CHARS[charKey];
    this.charKey = charKey;
    this.char = c;
    /* Gênero é arte e nome, não número: nada abaixo desta linha olha
       pra ele. Sem argumento, vale o que ficou gravado da última vez. */
    this.genero = genero ? generoValido(charKey, genero) : leGenero(charKey);
    this.nome = nomeDoChar(charKey, this.genero);
    this.carisma = c.carisma;
    this.descanso = c.descanso;
    this.dinheiro = c.dinheiro;
    this.valeRestante = c.valeTransporte;
    /* O dia deixou de ser ida-e-volta: agora é a lista de pernas da
       rotina deste personagem (ver zipzap.js). A perna 0 sai de casa, e
       a última sempre volta pra casa. */
    this.pernaIdx = 0;
    this.origem = CASA;
    this.compromisso = null;
    this.destino = this.destinoDaRotina();
    this.perna = this.ultimaPerna() ? 'volta' : 'ida';
    this.zap = montaZap(charKey);
    this.poeNoTrajeto(CASA);
    this.estacoes = 0;
    this.dia = 1;
    this.pernasFeitas = 0;
    this.atrasos = 0;
    this.ultimoAtraso = 0;
    this.coracoes = CORACOES_POR_PERNA;
    this.pontosDaCorrida = 0;
    this.minutos = this.pernaAtual().saida + Math.floor(Math.random() * 21) - 10;
    this.minutoSaida = this.minutos;
    this.faixaAnterior = this.faixa().key;
    this.dentroDoSistema = false;
    this.sentado = false;
    this.motivoFim = '';
    this.stats = {
      compromissos: 0,
      cedidos: 0, disfarces: 0, disfarcesOk: 0, recusas: 0,
      catracasPuladas: 0, catracasPagas: 0, causos: 0, baldeacoes: 0,
      minigamesGanhos: 0, minigamesPerdidos: 0,
      caidos: 0, achados: 0
    };
  },
  linhaAtual: function () { return LINHAS[this.linha]; },
  estacaoAtual: function () { return this.linhaAtual().estacoes[this.idx]; },
  proximaEstacaoNome: function () {
    var l = this.linhaAtual(), i = this.idx + this.dir;
    if (i < 0 || i >= l.estacoes.length) i = this.idx - this.dir;
    return l.estacoes[i];
  },

  /* ---------- o trajeto do dia ----------
     Não é mais um loop sem fim: todo dia é ida e volta entre casa e
     trabalho. Como as duas pontas estão em linhas diferentes, o trajeto
     sempre tem uma baldeação na Sé no meio — que é exatamente o trecho
     que a cidade inteira faz.

     O jogo não conduz ninguém pela mão: o trem anda sozinho no sentido
     certo, mas quem tem que descer na estação certa é você. Descer
     antes custa o trem seguinte; passar da sua custa a volta. */
  /* ---------- rotina, compromisso e destino ---------- */
  pernaAtual: function () {
    var r = rotinaDe(this.charKey);
    return r[Math.min(this.pernaIdx, r.length - 1)];
  },
  destinoDaRotina: function () { return this.pernaAtual().estacao; },
  /* O rótulo da perna é o que o jogo diz que você está fazendo. Com
     compromisso aceito é o dele, porque o destino é o dele. */
  rotuloDaPerna: function () {
    return this.compromisso ? this.compromisso.rotulo : this.pernaAtual().rotulo;
  },
  ultimaPerna: function () { return this.pernaIdx >= rotinaDe(this.charKey).length - 1; },

  destinoFinal: function () { return this.destino; },
  origemDaPerna: function () { return this.origem; },

  /* Aceitar um compromisso no ZipZap troca a estação desta perna. É a
     única coisa no jogo que muda o destino, e sai de graça: o preço é o
     caminho ficar mais longo, mais curto, ou mudar de linha. */
  aceitaCompromisso: function (fio) {
    if (!fio || !fio.vai) return;
    fio.aceito = true;
    this.compromisso = { rotulo: fio.vai.rotulo, estacao: fio.vai.estacao, de: fio.nome };
    this.destino = fio.vai.estacao;
    this.apontaPraAlvo();
  },

  // precisa trocar de linha pra chegar no destino?
  faltaBaldear: function () {
    return linhaDaEstacao(this.destinoFinal()) !== this.linha;
  },
  // onde você tem que descer AGORA: a Sé se falta baldear, senão o destino
  alvoAtual: function () {
    return this.faltaBaldear() ? BALDEACAO : this.destinoFinal();
  },
  // quantas estações ainda faltam até esse alvo
  faltamEstacoes: function () {
    var i = this.linhaAtual().estacoes.indexOf(this.alvoAtual());
    return Math.abs(i - this.idx);
  },
  // põe o jogador numa estação, já apontado pro alvo
  poeNoTrajeto: function (estacao) {
    this.linha = linhaDaEstacao(estacao);
    this.idx = this.linhaAtual().estacoes.indexOf(estacao);
    this.apontaPraAlvo();
  },
  apontaPraAlvo: function () {
    var i = this.linhaAtual().estacoes.indexOf(this.alvoAtual());
    this.dir = (i >= this.idx) ? 1 : -1;
  },

  /* o trem anda uma estação. Na ponta da linha ele volta, e quem ficou
     dentro paga o desvio em minutos. */
  avancaTrem: function () {
    var l = this.linhaAtual();
    var i = this.idx + this.dir;
    var virou = false;
    if (i < 0 || i >= l.estacoes.length) { this.dir *= -1; i = this.idx + this.dir; virou = true; }
    this.idx = i;
    this.estacoes++;
    this.passaTempo(2 + Math.floor(Math.random() * 2));
    return virou;
  },

  // desceu na Sé: troca de linha e reaponta
  baldeia: function () {
    this.linha = (this.linha === 'azul') ? 'vermelha' : 'azul';
    this.idx = this.linhaAtual().estacoes.indexOf(BALDEACAO);
    this.apontaPraAlvo();
    this.stats.baldeacoes++;
  },

  /* chegou no destino da perna. De manhã o relógio pula pro fim do
     expediente; de noite vira o dia. */
  // quanto tempo de porta a porta esta perna já levou
  minutosNaPerna: function () {
    return (this.minutos - this.minutoSaida + 1440) % 1440;
  },
  minutosParaOAtraso: function () { return LIMITE_ATRASO - this.minutosNaPerna(); },
  /* A cobrança é uma hora no relógio do jogo, não um cronômetro de
     tempo real: "entrada 07:18" se lê de um olho, "faltam 23 minutos"
     precisa de conta. O minuto continua existindo por baixo. */
  horaLimite: function () { return horaTexto((this.minutoSaida + LIMITE_ATRASO) % 1440); },

  /* Um minigame perdido custa um coração; ganho não devolve nada, senão
     o recurso vira placar e para de doer.

     O quanto passou a variar por causa dos guardinhas: o menorzinho
     tira meio, o do meio um, e o grandão dois. Por isso o contador
     virou fracionário e o HUD desenha meio coração. */
  perdeCoracao: function (quanto) {
    this.coracoes = Math.max(0, this.coracoes - (quanto || 1));
    this.stats.minigamesPerdidos++;
    return this.coracoes;
  },
  /* Ganhar dá ponto, e o ponto é gravado na hora: quem morre no minuto
     seguinte não perde o que acabou de ganhar. */
  ganhaMinigame: function (pontos) {
    this.stats.minigamesGanhos++;
    var n = pontos || 5;
    this.pontosDaCorrida = (this.pontosDaCorrida || 0) + n;
    gravaPontos(lePontos() + n);
    return n;
  },

  /* Reiniciar o trajeto devolve a perna ao começo: mesma origem, mesmo
     relógio da saída, corações cheios. Não perdoa o que já foi gasto de
     carisma nem de grana — reiniciar é uma segunda chance no caminho,
     não um apagador da corrida. */
  reiniciaPerna: function () {
    this.minutos = this.minutoSaida;
    this.coracoes = CORACOES_POR_PERNA;
    this.dentroDoSistema = false;
    this.sentado = false;
    this.poeNoTrajeto(this.origemDaPerna());
    this.faixaAnterior = this.faixa().key;
  },

  /* Chegou onde tinha que chegar. A perna que acabou vira a origem da
     próxima, o compromisso é dado por cumprido, e a caixa do ZipZap é
     nova: cada trecho traz a sua própria confusão. */
  chegouNoDestino: function () {
    this.pernasFeitas++;
    this.dentroDoSistema = false;
    this.coracoes = CORACOES_POR_PERNA;      // trajeto novo, fôlego novo
    this.ultimoAtraso = Math.max(0, this.minutosNaPerna() - LIMITE_ATRASO);
    var eraUltima = this.ultimaPerna();

    if (eraUltima) {
      // dormir: quanto mais tarde chega em casa, menos noite sobra
      this.addDescanso(Phaser.Math.Clamp(30 - this.ultimoAtraso * 0.4, 6, 30));
    } else if (this.ultimoAtraso > 0) {
      /* Chegar atrasado leva TODOS os corações de uma vez.
         Eram três avisos antes de doer, e três avisos transformam o
         relógio em sugestão: dava pra atrasar duas vezes de graça e
         seguir jogando igual. O relógio é o antagonista deste jogo —
         ele não pode ser o único que não morde. Agora é uma vez só, e
         cada minuto do letreiro passa a valer o que ele diz que vale. */
      this.atrasos++;
      this.coracoes = 0;
    }
    if (this.compromisso) { this.stats.compromissos++; this.compromisso = null; }

    this.origem = this.destino;
    if (eraUltima) {
      this.pernaIdx = 0;
      this.dia++;
      this.valeRestante = this.char.valeTransporte;
      this.origem = CASA;
    } else {
      this.pernaIdx++;
    }
    this.destino = this.destinoDaRotina();
    this.perna = this.ultimaPerna() ? 'volta' : 'ida';

    /* Sair antes da hora não existe: se você chegou cedo, o relógio
       espera o próximo compromisso; se chegou atrasado, você sai
       atrasado e a próxima perna já começa apertada. */
    var saida = this.pernaAtual().saida + Math.floor(Math.random() * 21) - 10;
    if (eraUltima || saida > this.minutos) this.minutos = (saida + 1440) % 1440;

    this.zap = montaZap(this.charKey);
    this.poeNoTrajeto(this.origem);
    this.minutoSaida = this.minutos;
    this.faixaAnterior = this.faixa().key;
  },

  /* Comer devolve fôlego e custa minutos. O dogão é o único que devolve
     coração — é comida de verdade, e é caro justamente por isso. */
  consome: function (chave) {
    var it = ITENS[chave];
    if (!it) return null;
    if (this.dinheiro < it.preco) return 'falta';
    this.gastar(it.preco);
    this.passaTempo(it.min || 1);
    var ganho = it.descanso * ((it.noCalor && estaCalor()) ? it.noCalor : 1);
    this.addDescanso(ganho);
    if (it.carisma) this.addCarisma(it.carisma);
    /* Coração só volta se estiver faltando: comprar dogão com a vida
       cheia é só um dogão. */
    var deuCoracao = false;
    if (it.coracao && this.coracoes < CORACOES_POR_PERNA) {
      this.coracoes++;
      deuCoracao = true;
    }
    this.stats.comprou = (this.stats.comprou || 0) + 1;
    return deuCoracao ? 'coracao' : 'ok';
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
  /* A dificuldade sobe por trajeto feito, não por estação passada. Com
     trinta estações por dia, contar estação fazia a curva explodir no
     primeiro dia inteiro. */
  dificuldade: function () { return 1 + (this.pernasFeitas * 0.12) + (this.dia - 1) * 0.1; },
  addCarisma: function (n) { this.carisma = Phaser.Math.Clamp(this.carisma + n, 0, 100); },
  addDescanso: function (n) { this.descanso = Phaser.Math.Clamp(this.descanso + n, 0, this.char.descansoMax); },
  gastar: function (n) { this.dinheiro = Math.max(0, Math.round((this.dinheiro - n) * 100) / 100); },
  ganhar: function (n) { this.dinheiro = Math.round((this.dinheiro + n) * 100) / 100; },
  /* A tela de fim reserva TRÊS linhas pro motivo, e a caixa quebra a 22
     caracteres. Estes textos tinham linha de 24 e de 29: viravam cinco
     linhas e entravam por cima do placar. Cada linha aqui cabe medida —
     e motivo de derrota é melhor curto de qualquer jeito. */
  derrota: function () {
    if (this.coracoes <= 0) {
      return 'O trajeto te moeu.\nVocê sentou no chão\nnuma estação qualquer.';
    }
    if (this.atrasos >= MAX_ATRASOS) {
      return 'Terceiro atraso.\nO RH não quis saber\ndo metrô.';
    }
    if (this.descanso <= 0) return 'Você dormiu.\nAcordou no fim da\nlinha, sozinho.';
    if (this.carisma <= 0) return 'O vagão fechou na sua\ncara. De novo.';
    return null;
  },
  /* O recorde passou a ser em dias, e por isso mudou de chave: a antiga
     guardava contagem de estação, e um número de lá apareceria aqui
     como um recorde de dias que ninguém fez. */
  recorde: function () {
    var r = 0;
    try { r = parseInt(localStorage.getItem('metrosp_dias') || '0', 10) || 0; } catch (e) { }
    return r;
  },
  salvarRecorde: function () {
    try {
      if (this.diasInteiros() > this.recorde()) {
        localStorage.setItem('metrosp_dias', String(this.diasInteiros()));
      }
    } catch (e) { }
  },
  // dia só conta inteiro quando a volta pra casa foi feita
  diasInteiros: function () { return Math.floor(this.pernasFeitas / 2); }
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
    '.....ppppp......', '.....pppp.......', '.....ppp........', '.....sss........'],

  /* ---------- as duas vistas de três quartos ----------
     Com WASD e com o manche dá pra andar em oito direções, mas o
     boneco só tinha três vistas: andando na diagonal ele ia de lado
     olhando pra frente.

     O giro é desenhado no mínimo de linhas de propósito. A silhueta
     da cabeça e do tronco fica igual à da frente, e só mudam a
     têmpora, os olhos, o pescoço e a linha do ombro. É isso que faz
     os sete cabelos, a saia, a bengala, a mochila, a bolsa, o colo e
     a barriga valerem na diagonal sem uma linha nova de desenho: o
     que eles trocam continua caindo no mesmo lugar.

     Estas são as versões viradas pra direita. A esquerda é a mesma
     coisa espelhada. */
  diagDown: [
    '................', '....oooooooo....', '...oaaaaaaaao...', '...oaaaaaaaao...',
    '...oaaaaaaaao...', '...oaakkkkkao...', '...okkkkkkkko...', '...okkkokkoko...',
    '...okkkkkkkko...', '....okkkkkko....', '.......kkkk.....', '...ojjjjjjjjo...',
    '..ojjjjjjjjjjo..', '..ojjjjjjjjjjo..', '..ojjjjjjjjjjo..', '..okjjjjjjjjko..',
    '..okjjjjjjjjko..', '...ojjjjjjjjo...', '...oppppppppo...', '....pppppppp....',
    '....ppp..ppp....', '....ppp..ppp....', '....ppp..ppp....', '....sss..sss....'],
  diagUp: [
    '................', '....oooooooo....', '...oaaaaaaaao...', '...oaaaaaaaao...',
    '...oaaaaaaaao...', '...oaaaaaaaao...', '...oaaaaaaaao...', '...oaaaaaaaao...',
    '...oaaaaaaaao...', '....oaaaaaao....', '.......kkkk.....', '...ojjjjjjjjo...',
    '..ojjjjjjjjjjo..', '..ojjjjjjjjjjo..', '..ojjjjjjjjjjo..', '..okjjjjjjjjko..',
    '..okjjjjjjjjko..', '...ojjjjjjjjo...', '...oppppppppo...', '....pppppppp....',
    '....ppp..ppp....', '....ppp..ppp....', '....ppp..ppp....', '....sss..sss....'],

  /* ---------- sentado ----------
     Quem senta usava o boneco em pé virado de lado: de cima ficava um
     sujeito de pé colado no banco. Sentado é a mesma cabeça e o mesmo
     tronco do perfil — por isso as linhas 0 a 17 são idênticas, e os
     sete cabelos, a mochila, a bolsa e o celular caem no lugar sem uma
     linha nova — e pernas que saem pra frente, pro corredor, com o
     joelho dobrando e o pé descendo.

     Desenhado virado pra direita, pra quem senta na baia da esquerda.
     A outra parede é a mesma coisa espelhada. */
  sentado: [
    '................', '.....oooooo.....', '....oaaaaaaao...', '....oaaaaaaao...',
    '....oaaaakkko...', '....oaaakkkko...', '....oakokkkko...', '....okkkkkkko...',
    '.....okkkkko....', '......kkkk......', '.....jjjjjj.....', '....ojjjjjjjo...',
    '....ojjjjjjjo...', '....ojjjjjjjo...', '....ojjjjjjjko..', '....ojjjjjjjko..',
    '....ojjjjjjjo...', '.....ojjjjjo....', '....opppppppo...', '....oppppppppo..',
    '.......opppppo..', '.......opp.ppo..', '.......opp.ppo..', '.......oss.sso..'],

  /* ---------- sentado de frente e sentado de costas ----------
     O banco de perfil dava conta enquanto todo banco era encostado na
     parede. O vagão de verdade não é assim: ele tem os dois bancos
     virados um pro outro, e quem senta neles fica de frente pra outra
     pessoa — olhando pro fundo do vagão ou pra você.

     De frente: a mesma cabeça e o mesmo tronco do boneco de frente
     (linhas 0 a 17 idênticas, e por isso os sete cabelos, a mochila, a
     bolsa e o celular caem no lugar sem uma linha nova), e as coxas
     abrindo em direção a quem olha, com o joelho vindo pra frente e o
     pé aparecendo por baixo.

     De costas: a mesma coisa do boneco de costas, e as pernas somem —
     de cima, quem está sentado de costas pra você mostra o ombro e o
     encosto, não a perna. */
  sentadoFrente: [
    '................', '....oooooooo....', '...oaaaaaaaao...', '...oaaaaaaaao...',
    '...oaaaaaaaao...', '...oakkkkkkao...', '...okkkkkkkko...', '...okkokkokko...',
    '...okkkkkkkko...', '....okkkkkko....', '......kkkk......', '..ojjjjjjjjjjo..',
    '.ojjjjjjjjjjjjo.', '.ojjjjjjjjjjjjo.', '.ojjjjjjjjjjjjo.', '.okjjjjjjjjjjko.',
    '.okjjjjjjjjjjko.', '..ojjjjjjjjjjo..', '...oppppppppo...', '..opppppppppppo.',
    '..opppo..opppo..', '..opppo..opppo..', '..osso....osso..', '................'],
  sentadoCostas: [
    '................', '....oooooooo....', '...oaaaaaaaao...', '...oaaaaaaaao...',
    '...oaaaaaaaao...', '...oaaaaaaaao...', '...oaaaaaaaao...', '...oaaaaaaaao...',
    '...oaaaaaaaao...', '....oaaaaaao....', '......kkkk......', '..ojjjjjjjjjjo..',
    '.ojjjjjjjjjjjjo.', '.ojjjjjjjjjjjjo.', '.ojjjjjjjjjjjjo.', '.okjjjjjjjjjjko.',
    '.okjjjjjjjjjjko.', '..ojjjjjjjjjjo..', '...oppppppppo...', '...oppppppppo...',
    '....pppppppp....', '................', '................', '................']
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
  },
  /* de três quartos só muda o rosto virado e o ombro estreito; o resto
     do cabelo comprido vem da vista de frente */
  diagDown: {
    7: '..oaakkokkoaao..', 11: '...oajjjjjjao...', 12: '..ojajjjjjjajo..'
  },
  diagUp: { 11: '...oajjjjjjao...', 12: '..ojajjjjjjajo..' }
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
  /* sentada a barra cai sobre a coxa e a perna aparece do joelho pra
     baixo. Sem isto a saia herdava a perna em pé por cima do corpo
     sentado, e virava uma pessoa de pé colada no banco. */
  sentado: {
    18: '...opppppppo....', 19: '...opppppppppo..', 20: '.....oppppppo...',
    21: '.......okk.kko..', 22: '.......okk.kko..', 23: '.......oss.sso..'
  },
  /* Nos bancos virados um pro outro a saia precisa das duas vistas
     dela: de frente a barra cai sobre a coxa e o joelho aparece por
     baixo; de costas ela cobre o banco inteiro e não sobra perna
     nenhuma pra ver. Sem isto a saia herdava a perna EM PÉ do boneco
     de frente por cima do corpo sentado. */
  sentadoFrente: {
    18: '..opppppppppppo.', 19: '.oppppppppppppo.', 20: '..oppppppppppo..',
    21: '...okkk..kkko...', 22: '...osso..osso...', 23: '................'
  },
  sentadoCostas: {
    18: '..opppppppppppo.', 19: '.oppppppppppppo.', 20: '..oppppppppppo..',
    21: '................', 22: '................', 23: '................'
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
  },
  diagDown: {
    12: '..ojjowwwwojjo..', 13: '..ojowwkkwwojo..', 14: '..okowwkkwwoko..',
    15: '..okowwwwwwoko..', 16: '..ojjowwwwojjo..'
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
  },
  diagDown: {
    15: '..ojowwwwwwojo..', 16: '..okowwwwwwoko..', 17: '...ojowwwwojo...'
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
  /* sentado ele encosta a bengala no banco, ao lado do corpo */
  sentado: {
    16: '....ojjjjjjjo.w.', 17: '.....ojjjjjo..w.', 18: '....opppppppow..',
    19: '....oppppppppow.', 20: '.......opppppow.', 21: '.......opp.ppow.',
    22: '.......opp.ppow.', 23: '.......oss.ssow.'
  },
  /* nos bancos virados um pro outro a bengala fica encostada na
     lateral, e as pernas são as de quem está sentado */
  sentadoFrente: {
    18: '...oppppppppo..w', 19: '..opppppppppppow', 20: '..opppo..opppo.w',
    21: '..opppo..opppo.w', 22: '..osso....osso.w', 23: '...............w'
  },
  sentadoCostas: {
    18: '...oppppppppo..w', 19: '...oppppppppo..w', 20: '....pppppppp...w',
    21: '...............w', 22: '...............w', 23: '................'
  },
  /* o tronco estreita até a linha da mão e para ali: a bengala é uma
     coluna fixa na beirada, e mão que recua solta a bengala no ar.
     Uma linha de ombro a mais no três-quartos lê como cotovelo. */
  diagDown: {
    10: '......okkkko....', 13: '..ojjjjjjjjjjo..', 14: '..ojjjjjjjjjjo..'
  },
  diagUp: { 10: '......okkkko....' },
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
  diagDown: { 7: '...okkkokkokoaa.' },
  diagUp: {
    11: '...ojjaaaajjo...', 12: '..ojjjaaaajjjo..',
    13: '..ojjjaaaajjjo..', 14: '..ojjjjaajjjjo..'
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
  },
  diagDown: {
    13: '..ojwjjjjjjwjo..', 14: '..ojwjjjjjjwjo..', 15: '..okwjjjjjjwko..'
  },
  diagUp: {
    12: '..ojwwwwwwwwjo..', 13: '..ojwwwwwwwwjo..', 14: '..ojwwwwwwwwjo..',
    15: '..okwwwwwwwwko..'
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
  },
  diagDown: {
    12: '..ojwjjjjjjjjo..', 13: '..ojjwjjjjjjjo..', 14: '..ojjjwjjjjjjo..',
    15: '..okjjjwjwwwko..', 16: '..okjjjjjwwwko..', 17: '...ojjjjjwwwo...'
  },
  diagUp: {
    12: '..ojjjjjjjjwjo..', 13: '..ojjjjjjjwjjo..', 14: '..ojjjjjjwjjjo..',
    15: '..okwwwjjjjjko..', 16: '..okwwwjjjjjko..', 17: '...owwwjjjjjo...'
  }
};

var MOD_CELULAR = {
  down: { 15: '.ojjjjkwwkjjjjo.', 16: '.ojjjjkwwkjjjjo.' },
  side: { 14: '....ojjjjjkwo...', 15: '....ojjjjjkwo...' },
  diagDown: { 15: '..ojjjkwwkjjjo..', 16: '..ojjjkwwkjjjo..' }
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

var DIRS = ['down', 'up', 'side', 'diagDown', 'diagUp', 'sentado', 'sentadoFrente', 'sentadoCostas'];
/* A diagonal parte do que a camada faz de frente (ou de costas) e leva
   por cima só o que é diferente nela. Sem isso, toda camada teria que
   redesenhar as linhas inteiras pra existir na diagonal, e um cabelo
   comprido que só precisa mexer no olho perderia o resto. */
var DIR_HERDA = {
  diagDown: 'down', diagUp: 'up', sentado: 'side',
  sentadoFrente: 'down', sentadoCostas: 'up'
};

function aplicaDir(alvo, nome, linhas) {
  if (!linhas) return;
  if (Array.isArray(linhas)) alvo[nome] = linhas.slice(0);   // pose inteira
  else for (var k in linhas) alvo[nome][k | 0] = linhas[k];  // só as linhas trocadas
}

function aplicaCamada(alvo, camada) {
  for (var d = 0; d < DIRS.length; d++) {
    var nome = DIRS[d];
    aplicaDir(alvo, nome, camada[DIR_HERDA[nome]]);
    aplicaDir(alvo, nome, camada[nome]);
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
    alvo = { pernas: PERNAS_PADRAO, poseUnica: false };
    for (var d = 0; d < DIRS.length; d++) alvo[DIRS[d]] = CORPO_BASE[DIRS[d]].slice(0);
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
  var out = {};
  for (var d = 0; d < DIRS.length; d++) {
    var nome = DIRS[d], parado = r[nome];
    var passos = (nome === 'side') ? r.pernas.lado : r.pernas.frente;
    out[nome] = [parado, null, null];
    for (var q = 0; q < 2; q++) {
      // sentado não anda: os três quadros da fileira são o mesmo, e a
      // vida vem do balanço do trem, que é posição e não desenho
      if (r.poseUnica || nome.indexOf('sentado') === 0) { out[nome][q + 1] = parado; continue; }
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
  /* Os três uniformes do metrô, e cada um é uma patente. Quem joga
     aprende a ler a roupa antes de ler o número: preto todo é o
     grandão, azul com bege é o do meio, azul com azul é o menorzinho. */
  guardinha: pele('#0a0a12', '#b07d52', '#1a2540', '#20325c', '#20325c', '#14141c', '#9fb6dd'),
  guardaMedio: pele('#0a0a12', '#e0b088', '#2a2a30', '#20325c', '#b09a68', '#2a2a30', '#d8e24a'),
  guardaForte: pele('#0a0a12', '#8a5a3c', '#0a0a12', '#15151d', '#15151d', '#0a0a12', '#4a4a5c'),
  /* A outra metade do elenco. Mesma pessoa, mesmo ofício, mesmos
     números — o que muda é cabelo, silhueta e um tom de roupa, que é o
     que basta pra quem joga se reconhecer na tela. */
  /* As femininas trocavam só pele e cabelo, e a roupa era a MESMA cor da
     masculina. Num boneco de 32x48 isso é invisível: quem tocava em
     MULHER via o mesmo boneco e concluía, com razão, que o botão não
     funcionava. Agora a roupa muda junto — sem sair da família de cor do
     personagem, que é como se reconhece um estudante de um turista. */
  estudanteF: pele('#0a0a12', '#8a5a3c', '#3a2418', '#3fa07d', '#3a3f6b', '#14141c', '#e8a33c'),
  cltF: pele('#0a0a12', '#c99a70', '#2a1c14', '#e8dcc0', '#3d2f4a', '#14141c', '#a05ac8'),
  senhoraJog: pele('#0a0a12', '#f0c8a0', '#d8d8e8', '#8a5a9a', '#4a4438', '#14141c', '#f0eeff'),
  ambulanteF: pele('#0a0a12', '#6b4228', '#1a1a22', '#e8623c', '#3a2e34', '#14141c', '#f0eeff'),
  turistaF: pele('#0a0a12', '#e0b088', '#c07a2a', '#7fd0e8', '#d8d8e8', '#14141c', '#e8362c'),
  // os dois que se compram com ponto de minigame
  gestanteJog: pele('#0a0a12', '#e0b088', '#4a2f1e', '#d4548e', '#33334a', '#14141c', '#ffd0e6'),
  turista: pele('#0a0a12', '#f0c8a0', '#e8c96a', '#f2f0ff', '#4a7fc0', '#14141c', '#e8362c'),
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
/* quantos pixels faltam até a beirada da forma, andando numa direção.
   Só interessa 0, 1, 2, 3 ou "longe": passando disso é miolo de chapa,
   e miolo de chapa é cor cheia de qualquer jeito. Parar cedo também
   segura o custo — são 270 quadros pra desenhar na carga.

   O pulo importa. Olho, boca, alça de mochila e botão são detalhes de
   um pixel de arte no meio de uma superfície — marca, não beirada. Sem
   pular por cima deles o rosto vira uma mancha: cada olho ganharia
   faixa escura de um lado e clara do outro, como se fosse quina. O
   contorno de fora não passa nesse teste, porque depois dele vem vazio
   e não o mesmo material. */
var ALCANCE_MAX = 4;
function alcance(m, x, y, dx, dy, mt) {
  for (var i = 1; i <= ALCANCE_MAX; i++) {
    if (m(x + dx * i, y + dy * i) === mt) continue;
    if (m(x + dx * (i + 1), y + dy * (i + 1)) === mt) { i += 1; continue; }
    if (m(x + dx * (i + 2), y + dy * (i + 2)) === mt) { i += 2; continue; }
    return i - 1;
  }
  return ALCANCE_MAX;
}

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
        /* a luz não pinta só a borda: ela desbota com a distância dela.
           Antes era claro / cheio / escuro, e a borda tinha 1 pixel — o
           peito virava uma chapa lisa com um risco em cima e outro
           embaixo, recortada em papel. Medindo quantos pixels faltam
           pra beirada de cima-esquerda (luz) e pra de baixo-direita
           (sombra), a mesma cor rende cinco degraus e o tronco lê como
           cilindro. Como a arte é 16x24 dobrada, cada degrau tem 2
           pixels de tela, que é um pixel de desenho. */
        var dL = Math.min(alcance(m, xx, yy, 0, -1, mt), alcance(m, xx, yy, -1, 0, mt));
        var dS = Math.min(alcance(m, xx, yy, 0, 1, mt), alcance(m, xx, yy, 1, 0, mt));
        if (dL < dS) cor = clarear(base, dL < 2 ? 0.3 : 0.13);
        else if (dS < dL) cor = escurecer(base, dS < 2 ? 0.32 : 0.14);
        else cor = base;
        // faixa de sombra na metade de baixo do corpo, dá volume
        if (dL > 1 && yy > A) cor = escurecer(cor, 0.08);
      }
      c2d.fillStyle = cor;
      c2d.fillRect(ox + xx, oy + yy, 1, 1);
    }
  }
}

function geraSheet(scene, key, pal, corpo) {
  if (scene.textures.exists(key)) return;
  var tex = scene.textures.createCanvas(key, 96, 48 * DIRS.length);
  var c2d = tex.getContext();
  var q = quadrosDoCorpo(corpo);
  for (var l = 0; l < DIRS.length; l++) {
    var linha = q[DIRS[l]];
    for (var c = 0; c < 3; c++) desenhaQuadro(c2d, linha[c], pal, c * 32, l * 48);
  }
  tex.refresh();
  for (var i = 0; i < DIRS.length * 3; i++) {
    tex.add(i, 0, (i % 3) * 32, Math.floor(i / 3) * 48, 32, 48);
  }
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
/* Dois corpos só têm o que resolver se estiverem perto: o corpo tem 6
   pixels de meio-eixo em y, então acima de 16 de distância não existe
   sobreposição possível. O teste é uma subtração, e ele é o que segura
   o custo — o trem de oito carros tem mais de 200 pessoas, e o segundo
   laço aqui é de todos contra todos. Sem esse corte eram 13 mil pares
   de elipse por quadro pra resolver, na prática, nenhum. */
var PERTO_Y = 16;

function resolveCorpos(pl, gente, limitaPl, limitaNpc) {
  var i, j, o, py = pl.sp.y;
  for (i = 0; i < gente.length; i++) {
    o = gente[i];
    if (!o || !o.sp || !o.sp.active) continue;
    if (Math.abs(o.sp.y - py) > PERTO_Y) continue;
    var peso = o.fixo ? 0 : 0.4;
    if (separaCorpos(pl.sp, o.sp, 1 - peso, peso)) {
      if (limitaPl) limitaPl(pl.sp);
      if (!o.fixo && limitaNpc) limitaNpc(o.sp);
    }
  }
  // a multidão também não se atravessa, mas com muito menos empenho
  for (i = 0; i < gente.length; i++) {
    if (!gente[i] || !gente[i].sp || gente[i].fixo) continue;
    var yi = gente[i].sp.y;
    for (j = i + 1; j < gente.length; j++) {
      if (!gente[j] || !gente[j].sp) continue;
      if (Math.abs(gente[j].sp.y - yi) > PERTO_Y) continue;
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
/* em que fileira da folha cada direção mora, e quem sai espelhado.
   'left' e 'right' continuam existindo porque meia dúzia de lugares
   posicionam gente parada escrevendo o nome do lado direto. */
var FILEIRA_DIR = {
  down: 0, up: 3, left: 6, right: 6,
  diagDownL: 9, diagDownR: 9, diagUpL: 12, diagUpR: 12,
  sentadoR: 15, sentadoL: 15,
  // quem senta no banco virado pro outro banco: olhando pro fundo do
  // vagão, ou olhando pra quem está do outro lado do joelho
  sentadoFrente: 18, sentadoCostas: 21
};
var ESPELHA_DIR = { left: 1, diagDownL: 1, diagUpL: 1, sentadoL: 1 };
var DIAGONAL_MIN = 0.42;   // o eixo fraco precisa disso do forte pra virar diagonal

Ator.prototype.setDir = function (dx, dy) {
  var ax = Math.abs(dx), ay = Math.abs(dy);
  if (!ax && !ay) return;
  if (ax >= ay * DIAGONAL_MIN && ay >= ax * DIAGONAL_MIN) {
    this.dir = (dy < 0 ? 'diagUp' : 'diagDown') + (dx < 0 ? 'L' : 'R');
  } else if (ax > ay) {
    this.dir = dx < 0 ? 'left' : 'right';
  } else {
    this.dir = dy < 0 ? 'up' : 'down';
  }
};
Ator.prototype.anima = function (dt, andando) {
  this.andando = andando;
  if (andando) this.t += dt; else this.t = 0;
  var base = FILEIRA_DIR[this.dir];
  if (base === undefined) base = 0;
  var passo = andando ? (1 + (Math.floor(this.t / 130) % 2)) : 0;
  this.sp.setFrame(base + passo);
  this.sp.setFlipX(!!ESPELHA_DIR[this.dir]);
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

/* ---------- música ----------
   Não havia música nenhuma: desligar "música" no menu não desligaria
   coisa nenhuma, e botão que não faz nada é pior que botão que falta.
   Então entrou o mínimo honesto — um baixo de metrô, duas notas
   alternando no compasso do trem, baixo o bastante pra não brigar com
   os efeitos. É ambiente, não trilha. */
var MUSICA_LIGADA = true;
try {
  MUSICA_LIGADA = (localStorage.getItem('metrosp_musica') !== '0');
} catch (e) { }

var BAIXO_METRO = [49.0, 49.0, 58.3, 49.0, 43.7, 43.7, 51.9, 43.7];
var _musicaT = null, _musicaI = 0;

function passoDaMusica() {
  if (!MUSICA_LIGADA || !AC) return;
  var f = BAIXO_METRO[_musicaI % BAIXO_METRO.length];
  _musicaI++;
  tom(f, 0.55, 'triangle', 0.028);
  if (_musicaI % 4 === 2) tom(f * 4, 0.10, 'sine', 0.012);
}

function ligaMusica(v) {
  MUSICA_LIGADA = !!v;
  try { localStorage.setItem('metrosp_musica', MUSICA_LIGADA ? '1' : '0'); } catch (e) { }
  if (MUSICA_LIGADA) { audioOn(); comecaMusica(); }
  else if (_musicaT) { clearInterval(_musicaT); _musicaT = null; }
}

function comecaMusica() {
  if (_musicaT || !MUSICA_LIGADA) return;
  _musicaT = setInterval(passoDaMusica, 640);
}

var AC = null;
function audioOn() {
  if (!AC && (window.AudioContext || window.webkitAudioContext)) {
    AC = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (AC && AC.state === 'suspended') AC.resume();
  comecaMusica();
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
    case 'caixa': tom(96, .11, 'sine', .09); setTimeout(function () { tom(62, .17, 'sine', .07); }, 60); break;
    /* passo: curto e grave, e alterna de altura pra não virar metrônomo */
    case 'passoA': tom(150, .035, 'triangle', .035); break;
    case 'passoB': tom(126, .035, 'triangle', .032); break;
    // o dó-mi do letreiro, antes do nome da estação
    case 'anuncio': tom(784, .1, 'sine', .05); setTimeout(function () { tom(1046, .16, 'sine', .05); }, 110); break;
    // o trem entrando na estação: rugido caindo de tom
    case 'chegando': tom(120, .5, 'sawtooth', .05); setTimeout(function () { tom(80, .45, 'sawtooth', .045); }, 260); break;
    case 'batida': tom(70, .09, 'sine', .09); setTimeout(function () { tom(1300, .03, 'square', .028); }, 95); break;
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

/* ---------- manche flutuante, e a tela dividida ----------
   O direcional fixo comia 108px do rodapé — quase um quinto da tela — e
   ficava aceso mesmo sem ninguém encostar, bem em cima da multidão. Aqui
   não há nada desenhado até o dedo tocar: onde ele tocar nasce o manche,
   e ele some quando o dedo sai. A tela inteira volta a ser jogo.

   Só que "onde tocar nasce o manche" tinha um preço: todo toque pra
   agir começava um manche, e todo começo de caminhada corria o risco de
   virar um agir. As duas coisas disputavam o mesmo gesto, e o jogo
   ficava adivinhando qual era qual pelo tempo que o dedo passou parado.

   Agora a tela é dividida: a metade ESQUERDA anda, a metade DIREITA
   age. Um polegar em cada lado, os dois ao mesmo tempo — dá pra
   atravessar o vagão segurando na barra, que antes era impossível. */
var LADO_ACAO = GW / 2;
var TOQUE = {
  ativo: false, id: -1, ox: 0, oy: 0, x: 0, y: 0, dx: 0, dy: 0, arrastando: false, t0: 0
};
var TOQUE_DIR = { ativo: false, id: -1, x: 0, y: 0, t0: 0 };
var MANCHE = {
  zonaMorta: 10,   // menos que isso é dedo tremendo, não direção
  raio: 26,        // passou daqui, o manche desliza junto com o dedo
  espera: 120,     // parado por esse tempo vira "segurando pra agir"
  diagonal: 0.45   // o eixo fraco precisa disso do forte pra também contar
};

function atualizaManche(agora) {
  TOUCH.up = TOUCH.down = TOUCH.left = TOUCH.right = TOUCH.act = false;

  // o dedo da direita é o botão: enquanto está encostado, está agindo
  if (TOQUE_DIR.ativo) TOUCH.act = true;

  if (!TOQUE.ativo) return;

  var dx = TOQUE.x - TOQUE.ox, dy = TOQUE.y - TOQUE.oy;
  var d = Math.sqrt(dx * dx + dy * dy);

  /* onde não há pra onde andar (título, resultado) o arrasto não vira
     direção nenhuma: lá o dedo encostado é só o botão de agir */
  if (!CONTROLES_VISIVEIS || d <= MANCHE.zonaMorta) {
    TOQUE.dx = TOQUE.dy = 0;
    /* Onde não há pra onde andar (título, resultado) a tela inteira é
       botão, e o dedo parado age. Onde há, agir é coisa da direita: o
       dedo esquerdo parado é só um dedo parado. */
    if (!CONTROLES_VISIVEIS && !TOQUE.arrastando && agora - TOQUE.t0 > MANCHE.espera) TOUCH.act = true;
    return;
  }

  TOQUE.arrastando = true;
  if (d > MANCHE.raio) {                       // o dedo puxa a base junto
    var k = (d - MANCHE.raio) / d;
    TOQUE.ox += dx * k; TOQUE.oy += dy * k;
    dx = TOQUE.x - TOQUE.ox; dy = TOQUE.y - TOQUE.oy;
  }
  var ax = Math.abs(dx), ay = Math.abs(dy), forte = Math.max(ax, ay);
  if (ax >= forte * MANCHE.diagonal) TOUCH[dx < 0 ? 'left' : 'right'] = true;
  if (ay >= forte * MANCHE.diagonal) TOUCH[dy < 0 ? 'up' : 'down'] = true;
  TOQUE.dx = dx; TOQUE.dy = dy;
}
/* O HUD e o direcional não servem em toda tela: no título não tem
   medidor pra mostrar, e no resultado o direcional não leva a lugar
   nenhum — lá o toque em qualquer lugar já é o Z. Esconder o que não
   serve devolve a altura da tela pro texto respirar. */
var HUD_VISIVEL = true;
var CONTROLES_VISIVEIS = true;

/* O comando de agir é o mesmo em toda parte — clique, toque ou espaço —
   mas o nome dele não: quem está no computador clica, quem está no
   celular toca. A dica na tela fala a língua do aparelho. */
/* Abaixo desta fração de descanso o jogo passa a dizer, em todo lugar,
   que a pessoa está caindo de sono: as pálpebras fecham, o medidor
   muda de cor e o rodapé manda sentar. */
var LIMIAR_SONO = 0.32;

/* ---------- o que o sono cobra, e o que NÃO cobra ----------
   As pálpebras fechando tapavam justamente a faixa da tela onde se
   joga: aviso que atrapalha mais do que a coisa avisada não é aviso,
   é castigo dobrado. Saíram, e ficou a moldura vermelha pulsando.

   Depois elas viraram dreno de coração, e isso foi pior: coração é a
   moeda mais cara do jogo e passou a evaporar sozinha, sem ninguém ter
   errado nada. Coração se perde ERRANDO — nos minigames — e chegando
   atrasado. O sono cobra no que sempre foi dele: descanso zerado é
   derrota por dormir, e o caminho até lá já é lento o bastante pra
   doer. Um eixo, uma cobrança. */

/* A cor do medidor de descanso, numa função só: o topo e a legenda da
   pausa precisam mostrar a mesma coisa, senão a legenda ensina uma cor
   que o HUD não usa. */
function corDescanso(pct, time) {
  if (pct > 0.55) return 0x00e676;
  if (pct > LIMIAR_SONO) return 0xf2c14e;
  return (Math.floor(time / 300) % 2 === 0) ? 0xff8a80 : 0xe8362c;
}

/* A faixa da tela que as pálpebras podem fechar. Cada cena estreita a
   sua no create() quando tem placa fixa em cima: dormir escurece o
   vagão, mas não pode esconder a hora de chegar nem a dica de como
   sair do sono — perder pra um relógio tapado não é dificuldade.

   O foco é onde as pálpebras se encontram: elas fecham em direção ao
   aviso do meio da tela, e não ao centro geométrico, senão a fresta
   sobra num lugar vazio e o recado fica embaixo do preto. */
var AREA_JOGO = { topo: 0, base: 0, foco: 0 };
function areaDeJogo(topo, base, foco) {
  AREA_JOGO.topo = topo || HUD_H;
  AREA_JOGO.base = base || (GH - 40);
  AREA_JOGO.foco = foco || Math.round((AREA_JOGO.topo + AREA_JOGO.base) / 2);
}

/* ---------- as três patentes do guardinha ----------
   No metrô de verdade o uniforme diz a patente, e quem anda de metrô
   aprende a ler isso sem pensar. Aqui vale a mesma coisa: a roupa
   avisa quanto custa ser pego, antes de custar.

   O tamanho acompanha: o grandão é desenhado maior, e o menorzinho
   menor. Ninguém precisa ler número nenhum pra saber qual é qual. */
var GUARDAS = {
  fraco: {
    chave: 'fraco', sprite: 'np_guardinha', escala: 0.88, custo: 0.5,
    nome: 'O GUARDINHA', vel: 1.15, cone: 0.85,
    fala: '"Ó o moço aí!"\nDeu bronca e liberou.'
  },
  medio: {
    chave: 'medio', sprite: 'np_guarda_medio', escala: 1, custo: 1,
    nome: 'O FISCAL', vel: 1, cone: 1,
    fala: '"Vem cá você."\nAnotou seu nome e te devolveu\npro fim do saguão.'
  },
  forte: {
    chave: 'forte', sprite: 'np_guarda_forte', escala: 1.25, custo: 2,
    nome: 'O SEGURANÇA', vel: 0.82, cone: 1.25,
    fala: '"Perdeu, playboy."\nEsse não passa a mão na cabeça\nde ninguém.'
  }
};

/* Quem está de plantão hoje. De madrugada sobra o menorzinho; no pico
   a estação chama o grandão, e a dificuldade puxa junto. */
function sorteiaGuarda() {
  /* O peso tem teto: sem ele, no décimo dia de pico o grandão aparecia
     em nove de cada dez partidas, e ser pego custa dois dos cinco
     corações — a catraca virava roleta-russa em vez de decisão. */
  var peso = Math.min(0.55, GameState.lotacao() * 0.45 + (GameState.dificuldade() - 1) * 0.10);
  var r = Math.random();
  if (r < 0.10 + peso * 0.6) return GUARDAS.forte;
  if (r < 0.55 + peso * 0.3) return GUARDAS.medio;
  return GUARDAS.fraco;
}

/* ---------- a muamba do ambulante ----------
   Ele vendia "alguma coisa": uma venda genérica, um número de dinheiro,
   e pronto. Ambulante de metrô não vende alguma coisa — ele vende bala
   de um real anunciando de ponta a ponta do vagão, e vende carregador
   de quinze com a caixa fechada e o olho na porta.

   É a diferença que faz o ofício ter decisão: bala vende sempre, paga
   pouco e o fiscal nem olha; carregador quase não vende, mas uma venda
   paga o dia inteiro — e é o que faz o fiscal vir atrás de você. Água
   entra no meio disso valendo o dobro no calor, que é quando o vagão
   inteiro está querendo. */
var MUAMBA = [
  { nome: 'BALA', grito: 'OLHA A BALA, UM REAL', preco: 1, chance: 0.85, risco: 8 },
  { nome: 'CHOCOLATE', grito: 'OLHA O CHOCOLATE, DOIS REAL', preco: 2, chance: 0.7, risco: 12 },
  { nome: 'PURURUCA', grito: 'PURURUCA, TRÊS REAL', preco: 3, chance: 0.55, risco: 14 },
  { nome: 'ÁGUA', grito: 'ÁGUA GELADA, TRÊS REAL', preco: 3, chance: 0.45, risco: 14, noCalor: 2.1 },
  { nome: 'FONE', grito: 'FONE DE OUVIDO, DEZ', preco: 10, chance: 0.22, risco: 30 },
  { nome: 'CARREGADOR', grito: 'CARREGADOR, QUINZE', preco: 15, chance: 0.14, risco: 38 }
];

/* O que ele tira da caixa agora. Não é sorteio puro: o que o vagão quer
   depende da hora e de quanta gente tem. No calor a água sobe na mão
   dele; no vagão cheio a bala e o chocolate saem sozinhos, e é quando
   vale insistir no barato. */
function tiraDaMuamba() {
  var calor = estaCalor(), lot = GameState.lotacao(), pesos = [], total = 0, i;
  for (i = 0; i < MUAMBA.length; i++) {
    var m = MUAMBA[i], w = m.chance;
    if (m.noCalor && calor) w *= m.noCalor;
    // vagão cheio é freguês, mas freguês de coisa barata
    if (m.preco <= 3) w *= (0.7 + lot * 0.8);
    pesos.push(w); total += w;
  }
  var r = Math.random() * total;
  for (i = 0; i < pesos.length; i++) { r -= pesos[i]; if (r <= 0) return MUAMBA[i]; }
  return MUAMBA[0];
}

function nomeAgir() { return TOQUE_ATIVO ? 'TOQUE' : 'CLIQUE'; }

/* o verbo que só este personagem tem */
function temPoder(p) { return !!GameState.char && GameState.char.poder === p; }

/* ---------- o coração quebrado ----------
   Perder uma vida acontecia só no alto do HUD: o quinto ícone apagava,
   a nove pixels de altura, longe de onde a pessoa está olhando — que é
   o boneco. Agora a perda sai de cima da cabeça dele: o mesmo coração
   do HUD parte no meio, as duas metades giram pros lados, sobem e
   somem. Quem viu, entendeu, sem precisar conferir o placar.

   As duas listas são o mesmo desenho do HUD cortado na coluna do meio:
   cada retângulo é [x, y, largura, altura] em coordenada local. */
var METADES_CORACAO = [
  [[0, 1, 3, 5], [1, 0, 4, 4], [1, 5, 4, 2], [2, 7, 3, 1], [3, 8, 2, 1]],
  [[1, 1, 3, 5], [0, 0, 3, 4], [0, 5, 3, 2], [0, 7, 2, 1], [0, 8, 1, 1]]
];

function coracaoQuebrado(scene, x, y, quanto) {
  if (!scene || !scene.add || !scene.tweens) return;
  /* Dois corações partindo quando o grandão pega: o número no HUD cai
     dois, e o desenho precisa dizer a mesma coisa. */
  var vezes = (quanto || 1) >= 2 ? 2 : 1;
  for (var v = 0; v < vezes; v++) desenhaCoracaoQuebrado(scene, x + (vezes > 1 ? (v ? 14 : -14) : 0), y);
}

function desenhaCoracaoQuebrado(scene, x, y) {
  for (var m = 0; m < 2; m++) {
    var lado = m ? 1 : -1;
    var g = scene.add.graphics().setDepth(940);
    g.setScale(3);
    g.x = Math.round(x) + (m ? 2 : -14);
    g.y = Math.round(y) - 14;
    var r = METADES_CORACAO[m], i;
    // o contorno escuro primeiro: sem ele o vermelho some no vagão
    g.fillStyle(0x08080e, 1);
    for (i = 0; i < r.length; i++) g.fillRect(r[i][0] - 1, r[i][1] - 1, r[i][2] + 2, r[i][3] + 2);
    g.fillStyle(0xe8362c, 1);
    for (i = 0; i < r.length; i++) g.fillRect(r[i][0], r[i][1], r[i][2], r[i][3]);
    g.fillStyle(0xff8a80, 1).fillRect(m ? 0 : 1, 0, 2, 2);
    /* pouco giro de propósito: a 55 graus o coração de nove pixels
       vira borrão vermelho e ninguém reconhece o desenho */
    scene.tweens.add({
      targets: g, duration: 900, ease: 'Quad.easeOut', delay: 90,
      x: g.x + lado * 17, y: g.y - 30, angle: lado * 22
    });
    /* o sumiço vai num tween separado: junto com o voo, o Quad.easeOut
       apagava o coração nos primeiros trezentos milissegundos e a
       metade do tempo de tela era um fantasma */
    scene.tweens.add({
      targets: g, duration: 320, delay: 680, alpha: 0,
      onComplete: function (tw, alvos) { alvos[0].destroy(); }
    });
  }
}

/* Todo lugar que tira um coração passa por aqui: a perda é a coisa
   mais importante que acontece com o jogador e não podia depender de
   cada minigame lembrar de mostrar. */
function perdeVida(scene, sp, quanto) {
  var n = GameState.perdeCoracao(quanto);
  if (scene && sp) coracaoQuebrado(scene, sp.x, sp.y - 40, quanto);
  if (scene && scene.cameras) scene.cameras.main.shake(220 * Math.min(2, quanto || 1), 0.005 * Math.min(2, quanto || 1));
  return n;
}

var Ctrl = {
  up: false, down: false, left: false, right: false,
  act: false, actJust: false, back: false, backJust: false,
  pausaJust: false,
  leftJust: false, rightJust: false, upJust: false, downJust: false,
  leftN: 0, rightN: 0, upN: 0, downN: 0,
  _pa: false, _pb: false, _pz: false,
  _tl: false, _tr: false, _tu: false, _td: false,
  _nl: 0, _nr: 0, _nu: 0, _nd: 0,
  liga: function (scene) {
    /* ---------- o toque não atravessa a troca de tela ----------
       O pulso de um toque curto vive até o próximo Ctrl.update() da cena
       que o recebeu. Se esse toque TROCA de cena, a cena velha morre sem
       consumir o pulso e a nova o encontra intacto: era isso que fazia o
       ladrilho TROCAR, na tela de fim, levar ao título e o título já
       começar a partida com o mesmo dedo. Um toque, uma tela.

       O _pa vai pra true de propósito: quem chega numa tela com o dedo
       ainda encostado só age depois de soltar e tocar de novo. */
    TOUCH.pulso = false;
    this._pa = true;
    this.actJust = false;

    /* WASD e espaço são o controle principal; setas, Z e enter continuam
       valendo pra quem já pegou o costume. enableCapture segura o espaço
       antes que o navegador role a página com ele. */
    this.k = scene.input.keyboard.addKeys(
      'W,A,S,D,SPACE,UP,DOWN,LEFT,RIGHT,Z,X,P,ENTER,ESC', true, true);

    /* Contador de batidas, não de estado. Olhar se a tecla está
       apertada perde o toque curto; o JustDown do Phaser é um booleano
       e perde a segunda batida do mesmo quadro. Duas batidas têm que
       valer duas — é o que a batalha de rima e a troca de pista da
       baldeação pedem. Repetição de tecla segurada não conta. */
    var self = this;
    scene.input.keyboard.on('keydown', function (ev) {
      if (ev.repeat) return;
      var c = ev.code;
      if (c === 'KeyA' || c === 'ArrowLeft') self._nl++;
      else if (c === 'KeyD' || c === 'ArrowRight') self._nr++;
      else if (c === 'KeyW' || c === 'ArrowUp') self._nu++;
      else if (c === 'KeyS' || c === 'ArrowDown') self._nd++;
    });
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
    var b = k.X.isDown;
    this.backJust = b && !this._pb; this._pb = b; this.back = b;
    /* ESC e P são pausa, não "voltar": no vagão X levanta do banco, e
       misturar os dois fazia a pausa levantar você junto */
    var pz = k.ESC.isDown || k.P.isDown;
    this.pausaJust = pz && !this._pz; this._pz = pz;

    /* Direção apertada e solta entre dois quadros sumia: olhar só o
       estado da tecla perde o toque curto, que é justamente o que a
       batalha de rima e a corrida da baldeação pedem. JustDown lê o
       evento do teclado, não o estado.

       Os dois lados de cada par são lidos sem curto-circuito de
       propósito: com ||, o segundo não seria consumido e voltaria como
       um toque fantasma no quadro seguinte. */
    this.leftN = this._nl + ((TOUCH.left && !this._tl) ? 1 : 0); this._nl = 0;
    this.rightN = this._nr + ((TOUCH.right && !this._tr) ? 1 : 0); this._nr = 0;
    this.upN = this._nu + ((TOUCH.up && !this._tu) ? 1 : 0); this._nu = 0;
    this.downN = this._nd + ((TOUCH.down && !this._td) ? 1 : 0); this._nd = 0;
    this.leftJust = this.leftN > 0; this.rightJust = this.rightN > 0;
    this.upJust = this.upN > 0; this.downJust = this.downN > 0;
    this._tl = TOUCH.left; this._tr = TOUCH.right;
    this._tu = TOUCH.up; this._td = TOUCH.down;
  },

  /* o disfarce quer uma direção só. No teclado a ordem das teclas
     resolve; no manche quem manda é o eixo mais puxado, senão uma
     diagonal involuntária vira resposta errada. */
  dirDominante: function () {
    if (TOQUE.arrastando && (TOQUE.dx || TOQUE.dy)) {
      return Math.abs(TOQUE.dx) >= Math.abs(TOQUE.dy)
        ? (TOQUE.dx < 0 ? 'left' : 'right')
        : (TOQUE.dy < 0 ? 'up' : 'down');
    }
    if (this.up) return 'up';
    if (this.down) return 'down';
    if (this.left) return 'left';
    if (this.right) return 'right';
    return null;
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
  this.led = !!cfg.led;
  /* Nada de UI acompanha a câmera. No vagão de oito carros a câmera
     anda com quem joga, e sem isto a placa de rota, a dica e o diálogo
     ficariam pendurados no trilho, saindo da tela junto com o cenário.
     Nas cenas de tela parada isto não faz diferença nenhuma.
     A exceção é a placa pregada na parede: essa é cenário, tem lugar
     no mundo, e some da tela quando a câmera sobe. Quem a pendura pede
     mundo: true. */
  var sf = cfg.mundo ? 1 : 0;
  this.g = scene.add.graphics().setDepth(d).setScrollFactor(sf);
  this.t = txt(scene, this.x, this.y + 5, '', cfg.cor || PAL.branco, cfg.tam || 8)
    .setDepth(d + 1).setScrollFactor(sf);
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

  /* ---------- modo letreiro ----------
     O painel de LED do vagão não é uma placa com texto: é uma chapa
     preta com pontinhos acesos. A diferença toda está na grade — sem
     ela, "letreiro" é só uma caixa com letra laranja, que é o que
     qualquer caixa é. */
  if (this.led) {
    this.g.fillStyle(0x0a0a06, 1).fillRect(lx - 6, ly - 4, lw + 12, lh + 8);
    this.g.fillStyle(0x1c1608, 1).fillRect(lx - 4, ly - 2, lw + 8, lh + 4);
    // a grade de LEDs apagados, por baixo da letra
    this.g.fillStyle(0x2a2008, 1);
    for (var gy = ly; gy < ly + lh; gy += 3) {
      for (var gx = lx - 2; gx < lx + lw + 2; gx += 3) this.g.fillRect(gx, gy, 1, 1);
    }
    // a moldura de metal do painel, e o brilho de cima
    this.g.fillStyle(num(PAL.metalSom), 1);
    this.g.fillRect(lx - 6, ly - 4, lw + 12, 2);
    this.g.fillRect(lx - 6, ly + lh + 4, lw + 12, 2);
    this.g.fillStyle(num(PAL.metalLuz), 0.5).fillRect(lx - 6, ly - 4, lw + 12, 1);
    if (this.filete) this.g.fillStyle(this.filete, 1).fillRect(lx - 4, ly + lh + 2, lw + 8, 2);
    return this;
  }

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
  this.y = GH - 32;
  this.g = scene.add.graphics().setDepth(d).setScrollFactor(0);
  this.t = txtC(scene, GW / 2, this.y + 6, '', PAL.amarelo, 8).setDepth(d + 1).setScrollFactor(0);
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

/* ---------- achados e perdidos ----------
   Do Crossy Road, e é a ideia dele que mais cabe aqui: lá você NUNCA
   compra um personagem. Você alimenta uma maquininha de prêmio e ela
   cospe um aleatório com fanfarra. A loja daqui era uma tabela de preços
   — 90, 150 — e tabela é transação, não momento.

   O lugar já existia na vida real: toda estação grande de São Paulo tem
   um guichê de achados e perdidos, e o que tem lá dentro é exatamente o
   sortimento de uma máquina de prêmio — guarda-chuva quebrado, carteira,
   molho de chaves, a mochila que alguém esqueceu.

   E ela dá um destino pro PONTO dentro da partida. Antes ele só servia
   na tela de título, entre uma corrida e outra; agora existe a escolha
   de gastar hoje ou guardar pro personagem, que é uma decisão de
   verdade e não uma poupança. */
/* 20 e não 25, e a mochila pesa 18 e não 12: medido em 200 puxadas, o
   preço velho dava uma mochila a cada 233 pontos, e a gestante custa 90
   na tabela — a máquina era estritamente pior que a loja, e máquina que
   não compete com a loja não é escolha, é enfeite. Com 20 e 18 ela sai
   por volta de 130, entre o personagem barato e o caro, e ainda devolve
   grana e ponto pelo caminho. */
var ACHADOS_PRECO = 20;

var ACHADOS = [
  { peso: 20, nome: 'UM GUARDA-CHUVA', fala: 'Quebrado. Você levou mesmo assim.' },
  { peso: 24, nome: 'UMA CARTEIRA', grana: [5, 20], fala: 'Sem documento nenhum dentro.\nSó o dinheiro.' },
  { peso: 18, nome: 'UM VALE VELHO', pontos: [8, 16], fala: 'Ainda tem crédito.' },
  { peso: 14, nome: 'UMA MARMITA', descanso: 22, fala: 'Fria, mas é comida.' },
  { peso: 12, nome: 'UM MOLHO DE CHAVES', carisma: 8, fala: 'Você devolveu no guichê.\nAlguém vai dormir melhor hoje.' },
  { peso: 18, nome: 'A MOCHILA DE ALGUÉM', personagem: true,
    fala: 'Dentro tinha a vida de outra pessoa.' }
];

/* quem ainda está trancado; vazio quando já se abriu todo mundo */
function travadosAgora() {
  var out = [];
  for (var k in CHARS) {
    if (!CHARS.hasOwnProperty(k)) continue;
    if (!destravado(k)) out.push(k);
  }
  return out;
}

/* Sorteia, cobra e entrega. Devolve o que saiu pra tela contar. */
function puxaAchados() {
  if (lePontos() < ACHADOS_PRECO) return { falta: ACHADOS_PRECO - lePontos() };
  gravaPontos(lePontos() - ACHADOS_PRECO);

  var total = 0, i;
  for (i = 0; i < ACHADOS.length; i++) total += ACHADOS[i].peso;
  var r = Math.random() * total, item = ACHADOS[0];
  for (i = 0; i < ACHADOS.length; i++) {
    r -= ACHADOS[i].peso;
    if (r <= 0) { item = ACHADOS[i]; break; }
  }

  var saiu = { nome: item.nome, fala: item.fala };
  if (item.personagem) {
    var t = travadosAgora();
    /* Já abriu todo mundo: a mochila vira o que ela seria de qualquer
       jeito, um punhado de troco. Prêmio que não existe mais não pode
       virar prêmio nenhum. */
    if (!t.length) {
      saiu.nome = 'UMA CARTEIRA';
      saiu.fala = 'Sem documento nenhum dentro.\nSó o dinheiro.';
      item = { grana: [5, 20] };
    } else {
      var k = t[Math.floor(Math.random() * t.length)];
      destrava(k);
      saiu.personagem = k;
      saiu.nomePersonagem = CHARS[k].nome;
    }
  }
  if (item.grana) {
    saiu.grana = Math.round(Phaser.Math.FloatBetween(item.grana[0], item.grana[1]) * 4) / 4;
    GameState.ganhar(saiu.grana);
  }
  if (item.pontos) {
    saiu.pontos = Phaser.Math.Between(item.pontos[0], item.pontos[1]);
    gravaPontos(lePontos() + saiu.pontos);
  }
  if (item.descanso) { saiu.descanso = item.descanso; GameState.addDescanso(item.descanso); }
  if (item.carisma) { saiu.carisma = item.carisma; GameState.addCarisma(item.carisma); }
  GameState.stats.achados = (GameState.stats.achados || 0) + 1;
  return saiu;
}

/* ---------- ir pro fim de jogo ----------
   Era um corte seco pra uma tela preta: você perdia e o lugar onde
   perdeu sumia. O Crossy Road deixa o seu corpo achatado na pista atrás
   do placar, e é isso que faz a morte ter endereço em vez de ser um
   número.

   Em vez de trocar de cena, CONGELA a que está rodando e abre a do fim
   por cima, translúcida: o vagão, o guarda, a plataforma — onde quer que
   tenha acabado — continuam ali atrás. A cena do fim é quem depois mata
   as congeladas, porque quem sai da tela de fim vai pra outro lugar. */
function vaiPraOFim(scene) {
  var congeladas = [];
  scene.scene.manager.getScenes(true).forEach(function (sc) {
    var k = sc.scene.key;
    if (k === 'Fim' || k === 'Hud') return;
    congeladas.push(k);
    scene.scene.pause(k);
  });
  HUD_VISIVEL = false; CONTROLES_VISIVEIS = false;
  scene.scene.launch('Fim', { congeladas: congeladas });
}

/* ---------- ladrilho ----------
   O botão do jogo, e ele é uma coisa só em toda tela: corpo, aba clara
   em cima, sombra embaixo e moldura. É o que faz o olho ver botão sem
   ninguém precisar escrever a palavra "botão". Nasceu na tela de título
   e a de fim de jogo pediu o mesmo — duas cópias do mesmo desenho em
   arquivos diferentes é como duas telas começam a não parecer o mesmo
   jogo. */
function ladrilho(g, x, y, w, h, corpo, aba, borda) {
  g.fillStyle(0x000000, 0.45).fillRect(x + 2, y + 4, w, h);
  g.fillStyle(corpo, 1).fillRect(x, y, w, h);
  g.fillStyle(aba, 1).fillRect(x, y, w, 4);
  g.fillStyle(0x000000, 0.22).fillRect(x, y + h - 5, w, 5);
  g.lineStyle(2, borda, 1).strokeRect(x + 1, y + 1, w - 2, h - 2);
}

/* placa fixa de cenário: nome de setor pintado na estação */
function placa(scene, x, y, texto, cor, depth) {
  var p = new Plaqueta(scene, x, y, { cor: cor, mundo: true, depth: depth === undefined ? 3 : depth });
  p.setText(texto);
  return p;
}

/* véu de luz da hora: a mesma estação de madrugada e às 18h não tem
   a mesma cor. Fica por cima do cenário e por baixo de tudo que é vivo. */
function veuDaHora(scene, depth) {
  var f = GameState.faixa();
  if (!f.luzA) return null;
  var g = scene.add.graphics().setDepth(depth === undefined ? 90 : depth).setScrollFactor(0);
  g.fillStyle(f.luz, f.luzA).fillRect(0, HUD_H, GW, GH - HUD_H);
  return g;
}

/* ---------- cenário que vira imagem ----------
   Um Graphics no Phaser não é uma imagem: é uma lista de comandos que o
   motor repassa inteira a cada quadro. Cenário de estação e de vagão são
   milhares de retângulos que nunca mudam, e num mundo que não cabe na
   tela isso se multiplica pelo número de pedaços. Desenhar uma vez,
   virar textura e pôr imagens na tela troca milhares de comandos por
   quadro por nenhum. */
function texturaDeCena(scene, chave, larg, alt, pinta) {
  if (scene.textures.exists(chave)) scene.textures.remove(chave);
  var g = scene.make.graphics({ add: false });
  pinta(g);
  g.generateTexture(chave, larg, alt);
  g.destroy();
}

/* ---------- o que fica caído no chão ----------
   Metrô de verdade tem coisa no chão, e quem anda olhando pra baixo
   acha. Isso não é enfeite: o trem tem oito carros e a estação tem dois
   andares, e até agora andar até a ponta não pagava nada — você ia
   porque o jogo mandava, não porque tinha algo lá. Moeda no chão é o que
   transforma "atravessar o vagão" em uma escolha sua.

   Quanto mais vazio, mais tem: às seis da manhã ninguém passou ali
   ainda; no pico já veio gente antes de você. É a regra mais justa que
   este jogo podia ter, e ela sozinha dá motivo pra jogar fora do pico.

   O bilhete único é o prêmio raro: vale PONTO, que é a moeda que
   atravessa a corrida e abre personagem. Achar um no chão do vagão é a
   melhor coisa que pode acontecer numa terça-feira. */
var CAIDOS = {
  moeda: {
    peso: 62, nome: 'MOEDA', raio: 6,
    grana: [0.25, 1.50], pontos: 0,
    cor: 0xf2c14e, corSom: 0x9a7420, corLuz: 0xfff3c4
  },
  nota: {
    peso: 26, nome: 'NOTA', raio: 7,
    grana: [2.00, 6.00], pontos: 0,
    cor: 0x7fd6a0, corSom: 0x2f7a52, corLuz: 0xd8ffe8
  },
  bilhete: {
    peso: 12, nome: 'BILHETE ÚNICO', raio: 7,
    grana: [0, 0], pontos: 3,
    cor: 0x4d9bf0, corSom: 0x1d4c86, corLuz: 0xbfe2ff
  }
};

function sorteiaCaido() {
  var total = 0, k;
  for (k in CAIDOS) if (CAIDOS.hasOwnProperty(k)) total += CAIDOS[k].peso;
  var r = Math.random() * total;
  for (k in CAIDOS) {
    if (!CAIDOS.hasOwnProperty(k)) continue;
    r -= CAIDOS[k].peso;
    if (r <= 0) return k;
  }
  return 'moeda';
}

/* o desenho de cada coisa, virado textura uma vez por cena */
function texturasDoChao(scene) {
  for (var k in CAIDOS) {
    if (!CAIDOS.hasOwnProperty(k)) continue;
    (function (chave, c) {
      /* O piso da estação é cinza escuro e o do vagão é cinza claro: sem
         o halo, a moeda some num dos dois. O halo é o que faz ela ser
         achada de longe, que é o ponto inteiro de ter moeda no chão. */
      texturaDeCena(scene, 'caido_' + chave, 20, 20, function (g) {
        g.fillStyle(c.cor, 0.16).fillCircle(10, 9, 9);
        g.fillStyle(c.cor, 0.22).fillCircle(10, 9, 7);
        g.fillStyle(0x000000, 0.4).fillEllipse(10, 15, 13, 5);
        if (chave === 'moeda') {
          g.fillStyle(c.corSom, 1).fillCircle(10, 9, 6);
          g.fillStyle(c.cor, 1).fillCircle(10, 8, 6);
          g.fillStyle(c.corLuz, 1).fillCircle(8, 6, 2);
          g.fillStyle(c.corSom, 1).fillRect(9, 6, 2, 5);
        } else if (chave === 'nota') {
          g.fillStyle(c.corSom, 1).fillRect(3, 5, 14, 9);
          g.fillStyle(c.cor, 1).fillRect(3, 4, 14, 9);
          g.fillStyle(c.corLuz, 1).fillRect(4, 5, 12, 2);
          g.fillStyle(c.corSom, 1).fillRect(8, 7, 4, 4);
        } else {
          g.fillStyle(c.corSom, 1).fillRect(4, 4, 12, 11);
          g.fillStyle(c.cor, 1).fillRect(4, 3, 12, 11);
          g.fillStyle(c.corLuz, 1).fillRect(5, 4, 10, 3);
          g.fillStyle(0xf2f0ff, 1).fillRect(5, 10, 8, 2);
        }
      });
    })(k, CAIDOS[k]);
  }
}

/* Quantas coisas o chão de uma cena guarda. Vazio rende; pico não. */
function quantoCaiNoChao(base) {
  var vazio = 1 - GameState.lotacao();
  return Math.max(0, Math.round(base * (0.35 + 1.15 * vazio) * Phaser.Math.FloatBetween(0.7, 1.3)));
}

/* ---------- o chão de uma cena ----------
   Quem usa entrega uma função que sorteia um ponto pisável; o resto é
   daqui: desenhar, brilhar, ser pego e dizer quanto valeu. */
function Chao(scene, depth) {
  this.scene = scene;
  this.depth = (depth === undefined) ? 5 : depth;
  this.itens = [];
  this.avisos = [];
  texturasDoChao(scene);
}

Chao.prototype.poe = function (x, y, chave) {
  chave = chave || sorteiaCaido();
  var sp = this.scene.add.image(Math.round(x), Math.round(y), 'caido_' + chave)
    .setDepth(this.depth);
  /* Uma coisa parada no chão de um jogo pixelado some no piso. O pulinho
     de dois pixels é o que faz o olho achar sozinho. */
  this.scene.tweens.add({
    targets: sp, y: sp.y - 2, duration: 620, yoyo: true, repeat: -1,
    ease: 'Sine.easeInOut', delay: Math.random() * 620
  });
  var it = { chave: chave, sp: sp, base: Math.round(y) };
  this.itens.push(it);
  return it;
};

/* espalha n coisas usando o sorteador de ponto de quem chamou */
Chao.prototype.semeia = function (n, sorteiaPonto) {
  for (var i = 0; i < n; i++) {
    for (var t = 0; t < 24; t++) {
      var p = sorteiaPonto();
      if (!p) continue;
      if (this.perto(p.x, p.y, 26)) continue;   // nunca duas grudadas
      this.poe(p.x, p.y);
      break;
    }
  }
};

Chao.prototype.perto = function (x, y, r) {
  for (var i = 0; i < this.itens.length; i++) {
    var it = this.itens[i];
    if (Math.abs(it.sp.x - x) < r && Math.abs(it.base - y) < r) return it;
  }
  return null;
};

/* Pegar é passar por cima: nada de botão. O jogo já pede muito do
   polegar, e abaixar pra pegar moeda não é uma decisão — é um desvio. */
Chao.prototype.atualiza = function (dt, px, py) {
  var pego = null;
  for (var i = this.itens.length - 1; i >= 0; i--) {
    var it = this.itens[i];
    /* A caixa de pegar é maior que o desenho: no corredor do trem
       passar a um pixel de uma moeda e não pegar é pior que não ter
       moeda nenhuma. Ainda dá pra passar reto — só não por engano. */
    if (Math.abs(px - it.sp.x) > 19 || Math.abs(py - it.base) > 15) continue;
    pego = this.pega(i);
  }
  for (var j = this.avisos.length - 1; j >= 0; j--) {
    var a = this.avisos[j];
    a.t += dt;
    a.o.y -= dt * 0.022;
    a.o.setAlpha(Math.max(0, 1 - a.t / 900));
    if (a.t > 900) { a.o.destroy(); this.avisos.splice(j, 1); }
  }
  return pego;
};

Chao.prototype.pega = function (i) {
  var it = this.itens[i], c = CAIDOS[it.chave];
  var grana = c.grana[1] > 0
    ? Math.round(Phaser.Math.FloatBetween(c.grana[0], c.grana[1]) * 4) / 4
    : 0;
  if (grana > 0) GameState.ganhar(grana);
  if (c.pontos > 0) gravaPontos(lePontos() + c.pontos);
  GameState.stats.caidos = (GameState.stats.caidos || 0) + 1;

  var rotulo = c.pontos > 0
    ? '+' + c.pontos + ' PONTOS'
    : '+' + grana.toFixed(2).replace('.', ',');
  var o = txtC(this.scene, it.sp.x, it.base - 44, rotulo,
    c.pontos > 0 ? PAL.verde : PAL.amarelo, 8).setDepth(420);
  o.setScrollFactor(it.sp.scrollFactorX, it.sp.scrollFactorY);
  this.avisos.push({ o: o, t: 0 });

  this.scene.tweens.killTweensOf(it.sp);
  it.sp.destroy();
  this.itens.splice(i, 1);
  sfx('moeda');
  return { chave: it.chave, grana: grana, pontos: c.pontos, nome: c.nome };
};

Chao.prototype.limpa = function () {
  for (var i = 0; i < this.itens.length; i++) {
    this.scene.tweens.killTweensOf(this.itens[i].sp);
    this.itens[i].sp.destroy();
  }
  this.itens = [];
};

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
  this.tTexto = txt(scene, 20, -400, texto, PAL.branco, 8).setDepth(901).setScrollFactor(0);
  /* com contador, a coluna encolhe: o relógio mora na ponta da primeira
     linha, e texto que enche a linha passava por baixo dele. O dilema do
     lugar escapava só porque a primeira linha dele é curta. */
  this.tTexto.setWordWrapWidth(GW - 40 - (this.tempo ? 30 : 0));
  var hTexto = Math.max(48, Math.round(this.tTexto.height));

  var alt = 28 + hTexto + this.opcoes.length * 24 + (this.tempo ? 20 : 0);
  var y = GH - alt - 12;
  this.g = scene.add.graphics().setDepth(900).setScrollFactor(0);
  caixa(this.g, 8, y, GW - 16, alt, cfg.cor === undefined ? 0xf2f0ff : cfg.cor);
  this.y = y; this.alt = alt;
  this.tTexto.setPosition(20, y + 10);

  this.tOps = [];
  for (var i = 0; i < this.opcoes.length; i++) {
    var ty = y + 20 + hTexto + i * 24;
    this.tOps.push(txt(scene, 32, ty, this.opcoes[i].label, PAL.cinza, 8).setDepth(901).setScrollFactor(0));
  }
  this.cursor = txt(scene, 16, y + 20 + hTexto, '>', PAL.amarelo, 8).setDepth(901).setScrollFactor(0);
  if (this.opcoes.length === 0) this.cursor.setVisible(false);
  this.tTimer = null;
  if (this.tempo) {
    this.tTimer = txt(scene, GW - 24, y + 10, '', PAL.vermelho, 8).setDepth(901).setOrigin(1, 0).setScrollFactor(0);
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

/* ---------- comprar ----------
   Barraca de estação, banca ou ambulante andando: muda o cenário e o
   cardápio, não a conversa. Uma função só monta o menu, cobra, e diz o
   que aconteceu — senão cada cena reinventa o troco. */
function abreBarraca(scene, titulo, cardapio, aoFechar) {
  var ops = [], i;
  for (i = 0; i < cardapio.length; i++) {
    (function (chave) {
      var it = ITENS[chave];
      var quanto = it.preco.toFixed(2).replace('.', ',');
      var etiqueta = it.nome + '  R$ ' + quanto;
      if (it.noCalor && estaCalor()) etiqueta += '  (CALOR)';
      ops.push({
        label: etiqueta, cb: function () {
          var r = GameState.consome(chave);
          if (r === 'falta') { sfx('nao'); fecha(scene, 'Não dá. Falta grana.'); return; }
          sfx('moeda');
          fecha(scene, r === 'coracao'
            ? it.nome + ' na veia.\nVocê recuperou um coração.'
            : it.nome + '. Deu uma segurada.');
        }
      });
    })(cardapio[i]);
  }
  ops.push({ label: 'Deixa pra lá', cb: function () { if (aoFechar) aoFechar(); } });
  fala(scene, titulo, ops);

  function fecha(sc, msg) {
    fala(sc, msg, []);
    sc.time.delayedCall(1300, function () { if (sc.dialog) sc.dialog.fecha(); });
    if (aoFechar) aoFechar();
  }
}

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
    /* Duas linhas e nada de sobra. O que saiu daqui:

       - o relógio aparecia duas vezes, uma no HUD e outra na tarja de
         faixa logo abaixo, com o mesmo número;
       - o contador '#estações' era placar de quando o jogo não tinha
         destino. Hoje o placar é em dias, e o número não queria dizer
         mais nada;
       - a tarja de faixa era uma terceira barra empilhada. O nome da
         faixa continua aparecendo — só quando ela vira, que é quando
         importa — e a cor dela pinta o relógio.

       Com o espaço que sobrou os dois medidores ficaram 80px em vez de
       54, que é a diferença entre ler e adivinhar. */
    /* Medido, não estimado: com o nome de estação mais longo sobravam 4
       pixels até os corações, e do dia 10 em diante o relógio ganhava um
       dígito ('D10 07:22') e passava 9 pixels POR CIMA do último
       coração. Três coisas disputavam a primeira linha.

       Agora a linha de cima tem duas: onde você está e quando. Os
       corações desceram pra segunda linha, na esquerda, e os dois
       medidores encolheram de 80 pra 66 — ainda bem acima dos 54 de
       antes, que eram os de adivinhar. O botão de pausa subiu pro canto
       de cima, que é onde a mão procura, e liberou o vão que ele
       ocupava entre o medidor e a grana.

       As letras 'C' e 'D' saíram. Uma letra solta de 12 pixels não diz
       carisma nem descanso: lia como um borrão ao lado da barra. Quem
       quiser conferir o que é cada cor tem a legenda na pausa. */
    var eu = this;
    // a zona de toque é maior que o desenho: dedo não acerta 12 pixels
    this.zonaPausa = this.add.zone(286, 0, 34, 26).setOrigin(0, 0).setInteractive();
    this.zonaPausa.on('pointerdown', function () { eu.abrePausa(); });

    /* A alça do celular, no canto direito da segunda linha. Grana e dia
       moravam no topo e foram pra dentro dele: eram as duas coisas que
       não mudam nenhuma decisão no meio de um vagão, e eram justamente
       as que espremiam o resto. */
    this.zonaZap = this.add.zone(268, 26, 52, 26).setOrigin(0, 0).setInteractive();
    /* A alça LIGA E DESLIGA. Quem abre o celular tocando aqui tenta
       fechá-lo tocando aqui de novo — é o que qualquer aplicativo faz — e
       antes esse toque não fazia nada, o que dava exatamente a sensação
       de estar preso dentro do aparelho. O ZipZap não põe zona de toque
       em cima da alça justamente pra este toque ter um dono só. */
    this.zonaZap.on('pointerdown', function () {
      var z = eu.scene.manager.getScene('Zap');
      if (z && eu.scene.isActive('Zap')) { z.fecha(); return; }
      eu.abreZap();
    });

    /* A estação saiu daqui. O topo não é lugar de dizer onde você está:
       quem diz é o letreiro do vagão, que é onde se olha na vida real, e
       quem perdeu o letreiro tem o mapinha no celular. Com ela fora, a
       primeira linha ficou com uma coisa só — a hora — e o topo parou de
       ser uma fileira de informação disputando espaço. */
    this.tHora = txt(this, 284, 4, '', PAL.amarelo, 8).setDepth(1001).setOrigin(1, 0);
    this.montaToque();
  },

  /* o toque precisa existir em toda tela, inclusive no título, por isso
     esta cena sobe junto com o jogo e nunca é desligada */
  montaToque: function () {
    TOQUE_ATIVO = this.sys.game.device.input.touch;
    var self = this;

    // dois dedos: um anda e o outro age, ao mesmo tempo
    this.input.addPointer(2);

    this.input.on('pointerdown', function (p) {
      if (CONTROLES_VISIVEIS && p.x >= LADO_ACAO) {
        TOQUE_DIR.ativo = true; TOQUE_DIR.id = p.id;
        TOQUE_DIR.x = p.x; TOQUE_DIR.y = p.y; TOQUE_DIR.t0 = self.time.now;
        return;
      }
      TOQUE.ativo = true; TOQUE.id = p.id; TOQUE.arrastando = false;
      TOQUE.ox = TOQUE.x = p.x; TOQUE.oy = TOQUE.y = p.y;
      TOQUE.dx = TOQUE.dy = 0;
      TOQUE.t0 = self.time.now;
    });
    this.input.on('pointermove', function (p) {
      if (!p.isDown) return;
      if (TOQUE_DIR.ativo && p.id === TOQUE_DIR.id) { TOQUE_DIR.x = p.x; TOQUE_DIR.y = p.y; return; }
      if (TOQUE.ativo && p.id === TOQUE.id) { TOQUE.x = p.x; TOQUE.y = p.y; }
    });
    this.input.on('pointerup', function (p) {
      if (TOQUE_DIR.ativo && p.id === TOQUE_DIR.id) {
        /* quem confirma o toque curto é a soltura: um toque pode nascer
           e morrer dentro do mesmo quadro */
        TOUCH.pulso = true;
        TOQUE_DIR.ativo = false; TOQUE_DIR.id = -1;
        TOUCH.act = false;
        return;
      }
      if (TOQUE.ativo && p.id !== TOQUE.id) return;
      // sem direcional na tela, o toque solto de qualquer lado é o Z
      if (TOQUE.ativo && !TOQUE.arrastando && !CONTROLES_VISIVEIS) TOUCH.pulso = true;
      TOQUE.ativo = false; TOQUE.id = -1; TOQUE.arrastando = false;
      TOUCH.up = TOUCH.down = TOUCH.left = TOUCH.right = false;
    });

    this.gManche = this.add.graphics().setDepth(1200);
    this.gSono = this.add.graphics().setDepth(999);
  },

  abrePausa: function () {
    if (this.scene.isActive('Pausa') || this.scene.isActive('Zap')) return;
    if (!HUD_VISIVEL && !GameState.char) return;   // no título não há o que pausar
    audioOn();
    this.scene.launch('Pausa');
  },

  /* Abrir o celular é parar de olhar pra frente: o jogo congela e o
     boneco baixa a cabeça pro aparelho. */
  abreZap: function () {
    if (this.scene.isActive('Zap') || this.scene.isActive('Pausa')) return;
    if (!GameState.char || !HUD_VISIVEL) return;
    audioOn();
    var cenas = this.scene.manager.getScenes(true);
    for (var i = 0; i < cenas.length; i++) {
      var c = cenas[i];
      if (c.pl && c.pl.sp && c.pl.sp.active && !c.sentadoEm) {
        c.pl.dir = 'down';
        c.pl.anima(0, false);
      }
    }
    if (typeof TUTORIAL !== 'undefined') TUTORIAL.viuZap = true;
    this.scene.launch('Zap');
  },

  /* ---------- as pálpebras ---------- */
  /* Dormir era um número que zerava e uma tela de fim de jogo: o
     jogador só descobria a regra depois de perder por ela. As
     pálpebras contam a mesma coisa sem texto — quanto menos descanso,
     mais elas descem, e de vez em quando piscam. Moram no HUD porque é
     a única cena que fica por cima de todas as outras, e param acima
     da faixa de dica, que é justamente quem manda sentar. */
  /* Ficou a moldura, não a pálpebra: uma borda vermelha pulsando nas
     quatro beiradas diz 'você está no vermelho' sem tirar um pixel da
     área de jogo. A cobrança de verdade é em coração (ver cobraSono). */
  pintaSono: function (time) {
    var gs = this.gSono; gs.clear();
    if (!GameState.char || !HUD_VISIVEL) return;
    var p = GameState.descanso / GameState.char.descansoMax;
    if (p >= LIMIAR_SONO) return;

    var f = (LIMIAR_SONO - p) / LIMIAR_SONO;         // 0 na marca, 1 no fundo
    var pulso = 0.5 + 0.5 * Math.sin(time / 420);
    var a = (0.12 + 0.3 * f) * (0.55 + 0.45 * pulso);
    var topo = AREA_JOGO.topo || HUD_H, base = AREA_JOGO.base || (GH - 40);
    var esp = 4 + Math.round(8 * f);
    gs.fillStyle(0xe8362c, a);
    gs.fillRect(0, topo, GW, esp);
    gs.fillRect(0, base - esp, GW, esp);
    gs.fillRect(0, topo, esp, base - topo);
    gs.fillRect(GW - esp, topo, esp, base - topo);
    gs.fillStyle(0xe8362c, a * 0.4);
    gs.fillRect(0, topo + esp, GW, 3);
    gs.fillRect(0, base - esp - 3, GW, 3);
  },

  update: function (time) {
    atualizaManche(time);
    if (Ctrl.pausaJust) { Ctrl.pausaJust = false; this.abrePausa(); }

    /* o manche só existe enquanto o dedo está arrastando: parado na tela,
       nada é desenhado, e é isso que devolve o rodapé pro jogo */
    var m = this.gManche; m.clear();
    if (TOQUE.ativo && TOQUE.arrastando && CONTROLES_VISIVEIS) {
      m.fillStyle(0x08080e, 0.3).fillCircle(TOQUE.ox, TOQUE.oy, MANCHE.raio + 7);
      m.lineStyle(2, 0xf2f0ff, 0.2).strokeCircle(TOQUE.ox, TOQUE.oy, MANCHE.raio);
      m.fillStyle(0xf2f0ff, 0.5).fillCircle(TOQUE.ox + TOQUE.dx, TOQUE.oy + TOQUE.dy, 9);
      m.fillStyle(0x08080e, 0.5).fillCircle(TOQUE.ox + TOQUE.dx, TOQUE.oy + TOQUE.dy, 3);
    }
    // e o dedo da direita ganha um anel: sem retorno, toque não parece toque
    if (TOQUE_DIR.ativo) {
      m.lineStyle(2, 0xf2c14e, 0.55).strokeCircle(TOQUE_DIR.x, TOQUE_DIR.y, 15);
      m.fillStyle(0xf2c14e, 0.18).fillCircle(TOQUE_DIR.x, TOQUE_DIR.y, 13);
    }

    this.pintaSono(time);

    var g = this.g; g.clear();
    var temJogo = !!GameState.char && HUD_VISIVEL;
    this.tHora.setVisible(temJogo);
    if (!temJogo) return;

    var f = GameState.faixa();
    /* o painel do desktop mostra hora e faixa na beirada; era a tarja
       que alimentava essa ponte, e ela saiu do jogo */
    if (PAINEL) PAINEL.hora(GameState.hora(), f);

    var l = GameState.linhaAtual();
    g.fillStyle(0x0e0e18, 1); g.fillRect(0, 0, GW, HUD_H);
    g.fillStyle(0x1c1c2c, 1); g.fillRect(0, 0, GW, 2);
    g.fillStyle(0x000000, 0.35); g.fillRect(0, 25, GW, 1);        // separa as duas linhas
    g.fillStyle(l.num, 1); g.fillRect(0, HUD_H - 4, GW, 4);
    g.fillStyle(num(clarear(l.cor, 0.35)), 1); g.fillRect(0, HUD_H - 4, GW, 1);

    /* Coração é desenho, não letra: cinco letras 'V' não leem como
       vida, e a fonte não tem o glifo. Eles abrem a segunda linha, que
       é a linha do seu estado — vida, carisma, descanso e grana. */
    for (var c = 0; c < CORACOES_POR_PERNA; c++) {
      // passo 14 e não 12: com 3 pixels entre um e outro os cinco liam
      // como um borrão vermelho só, em vez de cinco vidas
      /* Os corações subiram pra primeira linha. Com a estação fora do
         topo, a linha de cima tinha uma coisa só (a hora) e a de baixo
         tinha tudo — e duas linhas desequilibradas leem tão apertado
         quanto uma linha cheia. Agora é vida em cima, medidores
         embaixo, e um vão de verdade entre elas. */
      var hx = 8 + c * 14, hy = 7;
      var sobra = GameState.coracoes - c;
      // o guardinha menorzinho tira meio coração: metade acesa, metade não
      var meio = (sobra > 0 && sobra < 1);
      g.fillStyle(sobra >= 1 || meio ? 0xe8362c : 0x2a2a3c, 1);
      g.fillRect(hx, hy + 1, 3, 5);
      g.fillRect(hx + 1, hy, 4, 4); g.fillRect(hx + 1, hy + 5, 4, 2);
      g.fillRect(hx + 2, hy + 7, 3, 1); g.fillRect(hx + 3, hy + 8, 2, 1);
      g.fillStyle(sobra >= 1 ? 0xe8362c : 0x2a2a3c, 1);
      g.fillRect(hx + 6, hy + 1, 3, 5);
      g.fillRect(hx + 5, hy, 3, 4); g.fillRect(hx + 5, hy + 5, 3, 2);
      g.fillRect(hx + 5, hy + 7, 2, 1); g.fillRect(hx + 5, hy + 8, 1, 1);
      if (sobra >= 1 || meio) g.fillStyle(0xff8a80, 1).fillRect(hx + 1, hy, 2, 2);
    }

    // o ícone de pausa: duas barrinhas, no canto de cima à direita
    g.fillStyle(0x5a5f74, 1);
    g.fillRect(300, 6, 3, 12); g.fillRect(306, 6, 3, 12);

    this.tHora.setText(GameState.hora()).setColor(f.cor);

    /* O celular: um retângulo com tela, e a bolinha vermelha de não
       lidas por cima. É a linguagem de qualquer aparelho — quem vê
       bolinha vermelha sabe que tem recado esperando. */
    var zx = 286, zy = 29;
    g.fillStyle(0x2c2c3a, 1).fillRect(zx, zy, 16, 22);
    g.fillStyle(0x0d1a14, 1).fillRect(zx + 2, zy + 3, 12, 15);
    g.fillStyle(0x00e676, 0.75).fillRect(zx + 3, zy + 5, 10, 2);
    g.fillStyle(0x00e676, 0.45).fillRect(zx + 3, zy + 9, 7, 2);
    g.fillStyle(0x4a4a5e, 1).fillRect(zx + 6, zy + 19, 4, 1);
    if (naoLidas(GameState.zap)) {
      g.fillStyle(0xe8362c, 1).fillCircle(zx + 15, zy + 3, 5);
      g.fillStyle(0xffffff, 1).fillRect(zx + 14, zy + 1, 2, 4);
    }
    /* ---------- os dois medidores, empilhados ----------
       Lado a lado eles disputavam a largura com os corações e com a
       alça do celular, e o que sobrava pra cada um eram 60 pixels — a
       terceira vez que este HUD ficou apertado.

       Empilhados, cada um ganha 104: quase o dobro de barra pra ler, no
       mesmo espaço. E sobra ar de verdade entre eles e o
       celular, que é o que faltava — "amontoado" nunca foi excesso de
       coisa, foi falta de vão entre as coisas.

       O de cima é sempre o carisma. Quem quiser conferir a cor tem a
       legenda na pausa. */
    barra(g, 8, 29, 104, 8, GameState.carisma / 100, 0xe8a33c);

    /* O medidor de descanso era verde até o último pixel: cheio e
       quase vazio tinham a mesma cor, e a única diferença era um
       comprimento que ninguém compara de relance. Agora ele esquenta
       conforme baixa, e pisca quando o sono está pra bater. */
    var pd = GameState.descanso / GameState.char.descansoMax;
    barra(g, 8, 40, 104, 8, pd, corDescanso(pd, time));
  }
});
