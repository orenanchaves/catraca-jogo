/* global Phaser, GameState */
/* Catraca — o que se acha no caminho, a mochila por bolsos e as missões
   terciárias

   Da sabatina de 19/09 (CAMPANHA.md, parte 3):
   - ITENS ESCONDIDOS NOS VAGÕES: no fole ou num canto do corredor. Só
     brilham de perto (a uns três passos), e o trem avisa quando tem algo:
     'ALGUÉM ESQUECEU ALGO NESTE TREM'. Andar pelos oito carros procurando
     é a graça. O que se acha fica GUARDADO (não se gasta).
   - A MOCHILA POR BOLSOS: lateral (1 garrafa), bolsinho da frente (4
     pequenos), compartimento grande (6: o lanche e as coisas maiores) e a
     divisória do notebook (1). Bolso cheio: larga um ou deixa o achado
     onde está. Item de missão nunca some sozinho.
   - MISSÕES TERCIÁRIAS: ações rápidas no mundo, sem história, e a única
     exceção ao 'missão só pelo ZipZap'. Nascem do que você encontra, e
     cada uma completa é checkpoint.
   - CROSSOVER: quem pede ajuda nas terciárias são os jogáveis (o SENHOR
     das compras, o AMBULANTE da mercadoria): você conhece a cara deles
     antes do mês deles.
   - VIDA: o descanso devolve coração (sentado no vagão, um a cada 30 s),
     além do que a comida já devolvia. */

var BOLSOS = {
  lateral: { nome: 'BOLSO DA LATERAL', cabe: 1 },
  frente: { nome: 'BOLSINHO DA FRENTE', cabe: 4 },
  grande: { nome: 'COMPARTIMENTO GRANDE', cabe: 6 },
  notebook: { nome: 'DIVISÓRIA DO NOTEBOOK', cabe: 1 }
};
var ORDEM_BOLSOS = ['grande', 'frente', 'lateral', 'notebook'];

/* O que se acha. `entrega`: o achados e perdidos aceita, e isso é a
   terciária dele (quanto rende). A carteira tem terciária própria: na
   hora de pegar você decide se devolve ou fica com o dinheiro. */
var GUARDADOS = {
  isqueiro: { nome: 'ISQUEIRO', bolso: 'frente', dica: 'Achado no trem. Um dia alguém vai precisar de fogo.' },
  guardachuva: { nome: 'GUARDA-CHUVA', bolso: 'grande', dica: 'Esquecido no fole. O achados e perdidos aceita.', entrega: { carisma: 3, xp: 10 } },
  carteira: { nome: 'CARTEIRA', bolso: 'frente', dica: 'Tem documento dentro. Leve ao achados e perdidos.', entrega: { carisma: 6, xp: 20, ajudou: true } },
  chaveiro: { nome: 'CHAVEIRO', bolso: 'frente', dica: 'Três chaves e um chaveiro de time. Alguém tá sem entrar em casa.', entrega: { carisma: 4, xp: 12 } },
  fone: { nome: 'FONE PERDIDO', bolso: 'frente', dica: 'Ainda funciona. O achados e perdidos aceita.', entrega: { carisma: 3, xp: 10 } },
  notebook: { nome: 'NOTEBOOK DA EMPRESA', bolso: 'notebook', missao: true, dica: 'Da empresa. Não pode perder de jeito nenhum.' }
};
// os que o trem esconde (o notebook vem de missão, não do chão)
var ACHAVEIS = ['isqueiro', 'guardachuva', 'carteira', 'chaveiro', 'fone'];

// de que bolso é cada coisa: a água vai na lateral; o resto do lanche, no grande
function bolsoDe(chave) {
  if (GUARDADOS[chave]) return GUARDADOS[chave].bolso;
  return chave === 'agua' ? 'lateral' : 'grande';
}
// o que está num bolso: [{ chave, n, guardado }]
function conteudoDoBolso(b) {
  var out = [], k, mo = GameState.mochila || {}, gu = GameState.guardados || {};
  for (k in mo) if (mo.hasOwnProperty(k) && mo[k] > 0 && ITENS[k] && bolsoDe(k) === b) out.push({ chave: k, n: mo[k], guardado: false });
  for (k in gu) if (gu.hasOwnProperty(k) && gu[k] > 0 && GUARDADOS[k] && bolsoDe(k) === b) out.push({ chave: k, n: gu[k], guardado: true });
  return out;
}
function ocupadoNoBolso(b) {
  return conteudoDoBolso(b).reduce(function (s, c) { return s + c.n; }, 0);
}
function cabeNaMochila(chave) {
  var b = bolsoDe(chave);
  return ocupadoNoBolso(b) < BOLSOS[b].cabe;
}
function temGuardado(id) { return !!(GameState.guardados && GameState.guardados[id] > 0); }
function poeGuardado(id) {
  if (!GameState.guardados) GameState.guardados = {};
  GameState.guardados[id] = (GameState.guardados[id] || 0) + 1;
}
function tiraGuardado(id) {
  if (!temGuardado(id)) return;
  GameState.guardados[id]--;
  if (!GameState.guardados[id]) delete GameState.guardados[id];
}
// o que o lanche faz, em duas palavras, pro lado direito da linha
function efeitoCurto(chave) {
  var it = ITENS[chave];
  if (!it) return '';
  if (it.coracao) return '+1 CORAÇÃO';
  if (it.bateria) return '+' + it.bateria + '% BAT';
  if (it.sorte) return 'RASPADINHA';
  if (it.descanso) return '+' + it.descanso + ' DESC';
  if (it.carisma) return '+' + it.carisma + ' CAR';
  return '';
}
function nomeDaCoisa(chave) { return GUARDADOS[chave] ? GUARDADOS[chave].nome : (ITENS[chave] ? ITENS[chave].nome : chave); }

/* O medidor mexido direto (a carteira): o historia.js só mexe pelos
   acontecimentos, e ficar com o dinheiro dos outros não é um deles. */
function mexeFama(d) {
  GameState.fama = Math.max(-20, Math.min(20, (GameState.fama || 0) + d));
  if (typeof Catragram !== 'undefined') Catragram.confereFama();
}

/* ---------- o fim de uma terciária ----------
   Recompensa pequena, o aviso de celular, e checkpoint ('cada missão
   completa vira um checkpoint'). */
function fechaTerciaria(titulo, r) {
  r = r || {};
  if (r.xp && typeof ganhaXp === 'function') ganhaXp(r.xp);
  if (r.carisma) GameState.addCarisma(r.carisma);
  if (r.dinheiro) GameState.ganhar(r.dinheiro, 'AJUDA');
  if (r.ajudou) Missoes.conta('ajudou');
  GameState.stats.terciarias = (GameState.stats.terciarias || 0) + 1;
  if (typeof avisaMissao === 'function') avisaMissao('TERCIÁRIA: ' + titulo, (r.xp ? '+' + r.xp + ' XP' : '') + (r.carisma ? '  +' + r.carisma + ' CARISMA' : ''));
  salvaCheckpointDeMissao();
}
function salvaCheckpointDeMissao() {
  if (typeof Campanha !== 'undefined' && GameState.derrota && !GameState.derrota()) Campanha.salva('missao');
}

/* Guardar o que achou. Bolso cheio: pergunta o que largar, ou deixa o
   achado onde está (ele continua lá, dá pra voltar). `aoGuardar` roda só
   se guardou. */
function guardaAchado(cena, id, aoGuardar) {
  var b = bolsoDe(id), g = GUARDADOS[id];
  var fechaSo = function (msg) {
    fala(cena, msg, []);
    cena.time.delayedCall(1700, function () { if (cena.dialog) cena.dialog.fecha(); });
  };
  if (cabeNaMochila(id)) {
    poeGuardado(id); sfx('moeda');
    fechaSo('ACHOU: ' + g.nome + '!\nGuardou no ' + BOLSOS[b].nome.toLowerCase() + '.');
    if (aoGuardar) aoGuardar();
    return;
  }
  var ops = [];
  conteudoDoBolso(b).forEach(function (c) {
    if (c.guardado && GUARDADOS[c.chave].missao) return;          // item de missão nunca sai
    ops.push({ label: 'Largar ' + nomeDaCoisa(c.chave).toLowerCase(), cb: function () {
      if (c.guardado) tiraGuardado(c.chave);
      else { GameState.mochila[c.chave]--; if (!GameState.mochila[c.chave]) delete GameState.mochila[c.chave]; }
      poeGuardado(id); sfx('moeda');
      if (aoGuardar) aoGuardar();
    } });
  });
  ops = ops.slice(0, 3);
  ops.push({ label: 'Deixar aí', cb: function () { } });
  fala(cena, 'Achou: ' + g.nome + '.\nO ' + BOLSOS[b].nome.toLowerCase() + ' tá cheio.', ops);
}

/* ==================== no vagão ==================== */

var ACHADO_CHANCE = 0.45;       // quase metade dos trens tem alguma coisa esquecida

VagaoScene.prototype.escondeAchado = function () {
  this.achado = null;
  if (this.treino || Math.random() > ACHADO_CHANCE) return;
  var id = ACHAVEIS[Math.floor(Math.random() * ACHAVEIS.length)];
  var p = null, onde = '';
  for (var t = 0; t < 30 && !p; t++) {
    if (Math.random() < 0.4) {
      // no fole entre dois carros
      var c = Phaser.Math.Between(0, CARROS - 2);
      var alvo = { x: Phaser.Math.Between(SANFONA_X0 + 14, SANFONA_X1 - 14), y: yDoCarro(c, HUD_H) + CARRO_ALT + SANFONA_ALT / 2 };
      var antes = { x: alvo.x, y: alvo.y };
      limitaVagao(alvo);
      if (Math.abs(alvo.x - antes.x) < 2 && Math.abs(alvo.y - antes.y) < 2) { p = alvo; onde = 'no fole'; }
    } else {
      p = this.pontoDoChao(); onde = 'num canto';
    }
  }
  if (!p) return;
  this.achado = { id: id, x: p.x, y: p.y, onde: onde, t: 0 };
  this.gAchado = this.add.graphics().setDepth(27);
  var eu = this;
  this.time.delayedCall(1800, function () {
    if (eu.achado && typeof avisaMissao === 'function') avisaMissao('NO TREM', 'Alguém esqueceu algo neste trem.');
  });
};

// o brilho: só de perto, piscando
VagaoScene.prototype.vigiaAchado = function (dt) {
  var a = this.achado, g = this.gAchado;
  if (!a || !g) return;
  a.t += dt;
  g.clear();
  var d = Math.hypot(this.pl.sp.x - a.x, this.pl.sp.y - a.y);
  if (d > 60) return;
  var k = 0.5 + 0.5 * Math.sin(a.t / 140), al = Math.min(1, (60 - d) / 30) * (0.55 + 0.45 * k), r = 3 + 2 * k;
  g.fillStyle(0xfff4c0, al);
  g.fillTriangle(a.x - r, a.y - 6, a.x + r, a.y - 6, a.x, a.y - 6 - 3 * r);
  g.fillTriangle(a.x - r, a.y - 6, a.x + r, a.y - 6, a.x, a.y - 6 + 3 * r);
  g.fillTriangle(a.x, a.y - 6 - r, a.x, a.y - 6 + r, a.x - 3 * r, a.y - 6);
  g.fillTriangle(a.x, a.y - 6 - r, a.x, a.y - 6 + r, a.x + 3 * r, a.y - 6);
  g.fillStyle(0xffffff, al).fillCircle(a.x, a.y - 6, 1.5);
};

// no contexto: encostou no brilho, pega
VagaoScene.prototype.contextoAchado = function () {
  var a = this.achado;
  if (!a || this.sentadoEm || Math.hypot(this.pl.sp.x - a.x, this.pl.sp.y - a.y) > 24) return false;
  this.dica.setText(nomeAgir() + ': PEGAR O QUE BRILHA', PAL.amarelo);
  if (Ctrl.actJust) this.pegaAchado();
  return true;
};

VagaoScene.prototype.pegaAchado = function () {
  var a = this.achado, eu = this;
  if (!a) return;
  var some = function () { eu.achado = null; if (eu.gAchado) eu.gAchado.clear(); };
  if (a.id === 'carteira') {
    // a terciária da carteira: devolver ou ficar com o dinheiro (o medidor)
    fala(this, 'Uma CARTEIRA, ' + a.onde + '.\nTem documento e R$ 15 dentro.', [
      { label: 'Guardar pra devolver', cb: function () {
        guardaAchado(eu, 'carteira', function () {
          some();
          if (typeof avisaMissao === 'function') avisaMissao('TERCIÁRIA: A CARTEIRA', 'Leve ao achados e perdidos de uma estação.');
        });
      } },
      { label: 'Pegar o dinheiro', cb: function () {
        some();
        GameState.ganhar(15, 'CARTEIRA ACHADA');
        mexeFama(-3);
        sfx('moeda');
        eu.flash('R$ 15 NO BOLSO.\nE A CONSCIÊNCIA?');
      } },
      { label: 'Deixar aí', cb: function () { } }
    ]);
    return;
  }
  guardaAchado(this, a.id, some);
};

/* ---------- a mercadoria do ambulante ----------
   O guardinha da ronda entrou no seu carro, e o AMBULANTE (o jogável, de
   passagem no mês dos outros) corre até você: 'segura minha caixa e senta
   em cima'. Você sentado, com o isopor, é passageiro; em pé com a caixa, o
   guarda leva. Não mexe no medidor (é ajudar um trabalhador, e é esconder
   do guarda): dá carisma, um RALLS, e ele passa a vender mais barato. */
VagaoScene.prototype.talvezIsopor = function () {
  if (this.isopor || this.treino || GameState.charKey === 'ambulante' || Math.random() > 0.5) return;
  var eu = this, lado = this.pl.sp.x < 160 ? 26 : -26;
  var a = new Ator(this, this.pl.sp.x + lado, this.pl.sp.y + 18, spriteChar('ambulante', 'm'));
  a.sp.setDepth(56); a.fixo = true; a.dir = 'up'; a.anima(0, false);
  this.gente.push(a);
  marcaDex('j_ambulante', 1);
  this.isopor = { a: a, fase: 'pede' };
  fala(this, 'AMBULANTE: Ô, segura minha caixa e senta em cima dela! Rapidinho!', [
    { label: 'Seguro, vai!', cb: function () {
      eu.isopor.fase = 'segura';
      eu.flash('SENTE ANTES DO GUARDA\nCHEGAR EM VOCÊ.');
      eu.ambulanteSome(a);
    } },
    { label: 'Não me mete nisso', cb: function () { eu.isopor = null; eu.ambulanteSome(a); } }
  ]);
};
VagaoScene.prototype.ambulanteSome = function (a) {
  var eu = this;
  this.tweens.add({ targets: a.sp, y: a.sp.y + 140, alpha: 0, duration: 1200,
    onUpdate: function () { a.dir = 'down'; a.anima(16, true); },
    onComplete: function () { var k = eu.gente.indexOf(a); if (k >= 0) eu.gente.splice(k, 1); a.sp.destroy(); } });
};
// o guarda chegou em você: sentado com a caixa passa; em pé, ele leva a caixa
VagaoScene.prototype.revistaIsopor = function () {
  var s = this.isopor;
  if (!s || s.fase !== 'segura') return;
  if (this.sentadoEm) { s.passou = true; return; }
  s.fase = 'perdeu';
  GameState.addCarisma(-2);
  this.flash('O GUARDA LEVOU A CAIXA\nDO AMBULANTE.');
  sfx('nao');
};
// a ronda acabou: se a caixa ficou, o ambulante volta pra buscar
VagaoScene.prototype.fimDaRondaIsopor = function () {
  var s = this.isopor;
  if (!s) return;
  this.isopor = null;
  if (s.fase !== 'segura') return;
  GameState.amigoDoAmbulante = true;
  apresenta('ambulante');          // conheceu: ele entra na roda de personagens
  if (cabeNaMochila('ralls')) { if (!GameState.mochila) GameState.mochila = {}; GameState.mochila.ralls = (GameState.mochila.ralls || 0) + 1; }
  var eu = this;
  this.time.delayedCall(600, function () {
    fala(eu, 'AMBULANTE: Valeu, parceiro! Toma um RALLS. E pra você agora é desconto.', []);
    eu.time.delayedCall(2600, function () { if (eu.dialog) eu.dialog.fecha(); });
  });
  fechaTerciaria('A MERCADORIA', { carisma: 6, xp: 20 });
};

// o descanso devolve vida: sentado, um coração a cada 30 s
var REGENERA_SENTADO = 30000;
VagaoScene.prototype.regeneraSentado = function (dt) {
  if (!this.sentadoEm || GameState.coracoes >= CORACOES_POR_PERNA) { this._tRegen = 0; return; }
  this._tRegen = (this._tRegen || 0) + dt;
  if (this._tRegen < REGENERA_SENTADO) return;
  this._tRegen = 0;
  GameState.coracoes = Math.min(CORACOES_POR_PERNA, GameState.coracoes + 1);
  sfx('moeda');
  this.flash('+1 CORAÇÃO\nDESCANSOU SENTADO.');
};

/* ---------- a dica de quem fica parado ----------
   'Se a pessoa ficar muito parada, fala: ande pelo local pra encontrar
   coisas.' Doze segundos sem andar e o jogo cutuca, sem parar nada, e
   troca a dica a cada vez. */
var DICAS_PARADO = [
  'ANDE PELO LOCAL: TEM COISA ESCONDIDA',
  'EXPLORE OS OITO CARROS: O ITEM RARO TÁ NUM DELES',
  'QUEM PEDE AJUDA RENDE MISSÃO E CARISMA',
  'SENTADO VOCÊ DESCANSA E RECUPERA CORAÇÃO',
  'O CELULAR TRAZ A MISSÃO DO DIA',
  'O QUE VOCÊ ACHA NO CHÃO VAI PRA MOCHILA'
];
function dicaDeParado(cena, dt, andou, mostra) {
  if (cena.dialog || GameState.treino) { cena._parado = 0; return; }
  if (andou) { cena._parado = 0; return; }
  cena._parado = (cena._parado || 0) + dt;
  if (cena._parado < 12000) return;
  cena._parado = 0;
  cena._dicaN = ((cena._dicaN || 0) + 1) % DICAS_PARADO.length;
  mostra(DICAS_PARADO[cena._dicaN]);
}

/* ==================== na estação ==================== */

/* ---------- as compras do senhorzinho ----------
   O SENHOR (o jogável) no saguão, do lado de fora das catracas, com duas
   sacolas de feira. Ajudar é carregar as sacolas NAS MÃOS até a
   plataforma: você anda mais devagar, e ele vem atrás. Entregou, é
   terciária cumprida, e ajudar puxa o medidor pro honesto. */
EstacaoScene.prototype.montaSenhorzinho = function () {
  this.senhorz = null; this.maosCheias = null;
  if (this.treino || !this.mez || this.chefao || this.entrada !== 'saguao' || GameState.dentroDoSistema) return;
  if (GameState.charKey === 'senhor' || Math.random() > 0.3) return;
  var a = new Ator(this, (MEZ.x0 + MEZ.x1) / 2 + 70, CATRACA_Y + 118, spriteChar('senhor', 'm'));
  a.sp.setDepth(40); a.fixo = true; a.dir = 'down'; a.anima(0, false);
  this.gente.push(a); this.fixos.push(a);
  this.senhorz = { a: a, fase: 'espera' };
  this.gSacolas = this.add.graphics().setDepth(61);
};
EstacaoScene.prototype.contextoSenhorzinho = function () {
  var s = this.senhorz;
  if (!s || s.fase !== 'espera' || Math.hypot(this.pl.sp.x - s.a.sp.x, this.pl.sp.y - s.a.sp.y) > 38) return false;
  this.dica.setText(nomeAgir() + ': AJUDAR COM AS SACOLAS', PAL.verde);
  if (!Ctrl.actJust) return true;
  var eu = this;
  marcaDex('j_senhor', 1);
  fala(this, 'SENHOR: Me ajuda com essas sacolas até a plataforma? A escada acaba comigo.', [
    { label: 'Ajudo sim', cb: function () {
      s.fase = 'leva'; eu.maosCheias = 'sacolas';
      if (typeof avisaMissao === 'function') avisaMissao('TERCIÁRIA: AS COMPRAS', 'Leve as sacolas até a plataforma.');
    } },
    { label: 'Hoje não dá', cb: function () { s.fase = 'recusou'; } }
  ]);
  return true;
};
// ele vem atrás; as sacolas nas suas mãos; chegou na plataforma, entregou
EstacaoScene.prototype.atualizaSenhorzinho = function (dt) {
  var s = this.senhorz, g = this.gSacolas;
  if (!s) return;
  if (g) g.clear();
  if (s.fase !== 'leva') return;
  var pl = this.pl.sp, a = s.a;
  var ax = pl.x - 22 - a.sp.x, ay = pl.y + 16 - a.sp.y, d = Math.hypot(ax, ay);
  if (d > 150) { a.sp.x = pl.x - 22; a.sp.y = pl.y + 16; }           // ficou longe: ele alcança (a escada é sua)
  else if (d > 4) {
    var v = Math.min(d, 62 * dt / 1000);
    a.sp.x += ax / d * v; a.sp.y += ay / d * v;
    a.setDir(ax, ay); a.anima(dt, true);
  } else a.anima(dt, false);
  // as duas sacolas, uma em cada mão
  g.fillStyle(0xe9e0c8, 1).fillRect(pl.x - 15, pl.y - 20, 8, 10).fillRect(pl.x + 7, pl.y - 20, 8, 10);
  g.fillStyle(0x3fa07d, 1).fillRect(pl.x - 14, pl.y - 17, 6, 2).fillRect(pl.x + 8, pl.y - 17, 6, 2);
  g.lineStyle(1, 0x8a8070, 1).strokeRect(pl.x - 15, pl.y - 20, 8, 10).strokeRect(pl.x + 7, pl.y - 20, 8, 10);
  if (pl.y < ESC_Y - 8) {
    s.fase = 'fim'; this.maosCheias = null; g.clear();
    var eu = this;
    fala(this, 'SENHOR: Deus te pague! Toma um trocado pro café.', []);
    this.time.delayedCall(2200, function () { if (eu.dialog) eu.dialog.fecha(); });
    fechaTerciaria('AS COMPRAS', { carisma: 6, xp: 20, dinheiro: 3, ajudou: true });
    apresenta('senhor');          // conheceu: ele entra na roda de personagens
    this.tweens.add({ targets: a.sp, alpha: 0, duration: 900, delay: 2600,
      onComplete: function () { var k = eu.fixos.indexOf(a); if (k >= 0) eu.fixos.splice(k, 1); a.sp.destroy(); eu.gente = eu.juntaGente(); } });
  }
};

/* O achados e perdidos também RECEBE: tudo que você achou e é de alguém
   dá pra entregar ali, e cada entrega é uma terciária. */
EstacaoScene.prototype.opcoesDeEntrega = function () {
  var ops = [], eu = this;
  Object.keys(GameState.guardados || {}).forEach(function (id) {
    var g = GUARDADOS[id];
    if (!g || !g.entrega || !temGuardado(id)) return;
    ops.push({ label: 'Entregar ' + g.nome.toLowerCase(), cb: function () {
      tiraGuardado(id);
      sfx('ok');
      fala(eu, '"Obrigado! Vou achar o dono."\n' + g.nome + ' entregue.', []);
      eu.time.delayedCall(1800, function () { if (eu.dialog) eu.dialog.fecha(); });
      fechaTerciaria(g.nome, g.entrega);
    } });
  });
  return ops;
};
