/* global Phaser, GameState */
/* Catraca — o CATRAGRAM

   'O Catragram é resultado de um todo.' Uma paródia de rede social no
   celular, no lugar do app MISSÕES (sabatina de 19/09, CAMPANHA.md): ele
   não manda em nada, ele MOSTRA. Missão continua vindo só pelo ZipZap;
   aqui fica o que você já fez e que tipo de passageiro você virou.

   - As CONQUISTAS são as antigas metas do MISSÕES (os dez níveis de três,
     em NIVEIS, missoes.js) mais as novas desta lista. Não andam mais em
     fila de três: todas valem ao mesmo tempo, e cada uma cumprida vira um
     POST seu no feed, com medalha, XP e 10 pontos (20 se for secreta).
   - O MEDIDOR honesto x malandro (GameState.fama, historia.js) mora no
     seu perfil: uma etiqueta que muda conforme você joga e a barra.
   - Os CONTATOS do ZipZap curtem e comentam, e o tom segue o medidor de
     quando o post saiu: quem está malandro ouve da mãe.

   Os personagens que o nível do MISSÕES destravava (a gestante no nível
   5, o turista no 10) agora saem na 12ª e na 27ª conquista, que é o mesmo
   tanto de metas cumpridas. Quem já tinha missões feitas não perde nada:
   na primeira vez o que estava feito vira post (marcado 'ANTES'). */

var CAT_CONQ = {
  honesto: { nome: 'CIDADANIA', cor: 0x1faa59, fundo: 0xd8f5e3 },
  malandro: { nome: 'MALANDRAGEM', cor: 0xe8362c, fundo: 0xfbe0dd },
  rota: { nome: 'NA ROTA', cor: 0x1c5ab4, fundo: 0xdde8fa },
  gente: { nome: 'GENTE', cor: 0xe07a1e, fundo: 0xfcebd8 },
  desafio: { nome: 'DESAFIO', cor: 0x8a3ad6, fundo: 0xeee0fb }
};
// de que família é a meta, pelo acontecimento que ela escuta
var CAT_DO_EV = {
  catraca: 'honesto', cedeu: 'honesto', cedeuCedo: 'honesto', ajudou: 'honesto', achados: 'honesto',
  pulouCatraca: 'malandro', escapouGuarda: 'malandro', moedaDoChao: 'malandro',
  venceuDesafio: 'desafio', rimaGanha: 'desafio', encaradaGanha: 'desafio', disputaGanha: 'desafio',
  ambulante: 'gente', sentou: 'gente',
  chefao: 'desafio', ato: 'rota'
};

/* O que a meta antiga vira no post: a ordem ('Pule a catraca 3 vezes')
   vira o que você conta que fez ('Pulei a catraca 3 vezes'). */
var LEGENDAS_ANTIGAS = [
  ['Cheguei no horário!', 'Passei 3 vezes na catraca', 'Consegui sentar no vagão'],
  ['Venci um desafio no vagão', 'Olhei o mapa da parede', 'Baldeação na Sé: feita'],
  ['Dei o lugar 2 vezes', 'Comprei do ambulante', 'Um dia inteiro, ida e volta'],
  ['Pulei a catraca 3 vezes', 'Escapei do guarda', '5 moedas achadas no chão'],
  ['Entrei no vagão no pico da manhã', 'Embarquei na Sé no pico', '2 dias seguidos'],
  ['Comprei do ambulante no Brás', '3 desafios vencidos', 'Cheguei na Sé sem sentar'],
  ['Ganhei uma batalha de rima', 'Desci em São Bento', 'Venci o pregador'],
  ['Um dia gastando até R$ 5', 'Usei o achados e perdidos', 'Ajudei 2 vezes quem pediu'],
  ['Peguei o último trem', 'Cheguei em casa com 5 corações', 'Um dia sem multa'],
  ['3 dias seguidos', 'Cedi o lugar antes de pedirem', 'Um dia com 80 de carisma']
];

/* As novas: primeira leva, pra cortar ou acrescentar ('faço uma primeira
   versão e você corta'). As secretas aparecem no perfil como ??? até
   saírem. As de `fama` não escutam acontecimento: saem quando o medidor
   chega lá (Catragram.confereFama, chamado pelo historia.js). */
var CONQUISTAS_NOVAS = [
  { id: 'catraca20', txt: 'Passe 20 vezes pagando', legenda: '20 catracas, tudo pago', ev: 'catraca', meta: 20, xp: 25 },
  { id: 'cedeu10', txt: 'Ceda o lugar 10 vezes', legenda: 'Cedi o lugar 10 vezes', ev: 'cedeu', meta: 10, xp: 30 },
  { id: 'ajudou5', txt: 'Ajude 5 vezes quem pede', legenda: 'Ajudei 5 vezes', ev: 'ajudou', meta: 5, xp: 30 },
  { id: 'exemplar', txt: 'Chegue a CIDADÃO EXEMPLAR', legenda: 'Virei CIDADÃO EXEMPLAR', fama: 12, cat: 'honesto', xp: 40 },
  { id: 'pulou10', txt: 'Pule a catraca 10 vezes', legenda: '10 catracas puladas', ev: 'pulouCatraca', meta: 10, xp: 30, secreta: true },
  { id: 'moeda30', txt: 'Pegue 30 moedas do chão', legenda: '30 moedas do chão', ev: 'moedaDoChao', meta: 30, xp: 30, secreta: true },
  { id: 'pulacatraca', txt: 'Vire PULA-CATRACA', legenda: 'Virei PULA-CATRACA', fama: -12, cat: 'malandro', xp: 40, secreta: true },
  { id: 'desafio10', txt: 'Vença 10 desafios', legenda: '10 desafios vencidos', ev: 'venceuDesafio', meta: 10, xp: 40 },
  { id: 'santista', txt: 'Vença o santista', legenda: 'Venci o santista', ev: 'venceuDesafio', meta: 1, xp: 25,
    se: function (d) { return d.tipo === 'santista'; } },
  { id: 'guarda', txt: 'Vença um guarda num duelo', legenda: 'Ganhei do guarda na conversa', ev: 'venceuDesafio', meta: 1, xp: 30,
    se: function (d) { return d.tipo === 'guardinha' || d.tipo === 'guardaMedio' || d.tipo === 'guardaForte'; } },
  { id: 'acatsuqui', txt: 'Vença o ACATSUQUI', legenda: 'Venci o ACATSUQUI', ev: 'venceuDesafio', meta: 1, xp: 40, secreta: true,
    se: function (d) { return d.tipo === 'cosNuvem'; } },
  { id: 'encarada3', txt: 'Ganhe 3 encaradas', legenda: '3 encaradas ganhas', ev: 'encaradaGanha', meta: 3, xp: 25 },
  { id: 'barra', txt: 'Ganhe a disputa da barra', legenda: 'A barra é minha', ev: 'disputaGanha', meta: 1, xp: 20 },
  { id: 'liberdade', txt: 'Desça na Liberdade', legenda: 'Rolê na Liberdade', ev: 'desceu', meta: 1, xp: 15, cat: 'rota',
    se: function (d) { return d.estacao === 'LIBERDADE'; } },
  { id: 'ambulante10', txt: 'Compre 10 vezes de ambulante', legenda: 'Freguês do ambulante', ev: 'ambulante', meta: 10, xp: 20 },
  { id: 'dias5', txt: 'Feche 5 dias', legenda: '5 dias de metrô', ev: 'diaCompleto', meta: 5, xp: 30, cat: 'rota' },
  // a campanha (src/historia.js): o chefão do Ato 1 e a semana fechada
  { id: 'fiscal', txt: 'Vença o FISCAL', legenda: 'O fiscal não me segurou', ev: 'chefao', meta: 1, xp: 60,
    se: function (d) { return d.id === 'fiscal' && d.ok; } },
  { id: 'ato1', txt: 'Feche a primeira semana de estágio', legenda: 'Primeira semana de estágio: feita', ev: 'ato', meta: 1, xp: 50,
    se: function (d) { return d.ato === 1; } }
];

/* ---------- as antigas ficaram fáceis ----------
   'As conquistas muito fáceis também.' Elas nasceram pra sair três por
   vez, uma de cada nível; com todas valendo ao mesmo tempo, metade saía
   no primeiro dia. Aqui os números novos (e o texto acompanha). */
var METAS_DURAS = {
  n0_1: { meta: 10, txt: 'Passe 10 vezes pela catraca', legenda: '10 catracas em ordem' },
  n0_2: { meta: 3, txt: 'Sente 3 vezes no vagão', legenda: 'Achei banco 3 vezes' },
  n1_0: { meta: 3, txt: 'Vença 3 desafios no vagão', legenda: '3 desafios vencidos no vagão' },
  n1_1: { meta: 2, txt: 'Olhe o mapa na parede 2 vezes', legenda: 'Estudei o mapa da parede' },
  n2_0: { meta: 6, txt: 'Dê o lugar 6 vezes', legenda: 'Cedi o lugar 6 vezes' },
  n2_1: { meta: 3, txt: 'Compre 3 vezes de ambulante', legenda: '3 compras no vagão' },
  n3_0: { meta: 8, txt: 'Pule a catraca 8 vezes', legenda: '8 catracas puladas' },
  n3_1: { meta: 3, txt: 'Escape do guarda 3 vezes', legenda: 'Escapei do guarda 3 vezes' },
  n3_2: { meta: 20, txt: 'Pegue 20 moedas do chão', legenda: '20 moedas do chão' },
  n5_1: { meta: 8, txt: 'Vença 8 desafios', legenda: '8 desafios vencidos' },
  n7_2: { meta: 6, txt: 'Ajude 6 vezes quem pede', legenda: 'Ajudei 6 vezes' },
  n9_1: { meta: 6, txt: 'Ceda o lugar antes de pedirem 6 vezes', legenda: 'Cedi antes de pedirem, 6 vezes' }
};

// a lista inteira, montada uma vez: as antigas primeiro, na ordem dos níveis
var CONQUISTAS = (function () {
  var out = [];
  for (var n = 0; n < NIVEIS.length; n++) {
    for (var i = 0; i < NIVEIS[n].missoes.length; i++) {
      var m = NIVEIS[n].missoes[i];
      var id = 'n' + n + '_' + i, dura = METAS_DURAS[id] || {};
      out.push({ id: id, txt: dura.txt || m.txt, legenda: dura.legenda || (LEGENDAS_ANTIGAS[n] || [])[i] || m.txt,
        ev: m.ev, meta: dura.meta || m.meta, se: m.se, corrida: m.corrida,
        xp: dura.meta ? 25 : 15, cat: CAT_DO_EV[m.ev] || 'rota', antiga: [n, i] });
    }
  }
  for (var k = 0; k < CONQUISTAS_NOVAS.length; k++) {
    var c = CONQUISTAS_NOVAS[k];
    if (!c.cat) c.cat = CAT_DO_EV[c.ev] || 'rota';
    out.push(c);
  }
  return out;
})();
var PREMIO_CONQ = { 12: 'gestante', 27: 'turista' };

/* As figuras que comentam além dos contatos: gente do metrô, que é o que
   todo mundo segue sem conhecer. */
var CAT_FIGURAS = ['AMBULANTE DO BRÁS', 'TIOZÃO DO ZAP', 'CATRACA NEWS'];
var CAT_COMENTA = {
  honesto: ['orgulho de você!', 'exemplo de cidadão', 'isso aí, certinho', 'tem que ser assim', 'que bonito'],
  malandro: ['kkkk sem vergonha', 'o guarda viu isso?', 'não conta pra ninguém', 'vai ser pego hein', 'isso não se faz...'],
  rota: ['boa viagem!', 'metrô é vida', 'e o trem, tava cheio?', 'rota de respeito', 'vai com Deus'],
  gente: ['me traz um também', 'kkkk clássico', 'o metrô é uma família', 'quanto tava?', 'amei'],
  desafio: ['amassou!', 'não mexe com essa pessoa', 'kkkk coitado', 'lenda do vagão', 'respeita']
};
// o que se ouve de quem está malandro, venha o post de onde vier
var CAT_INDIRETA = ['hmm, sei...', 'e a passagem, pagou?', 'tô de olho', 'já foi melhor, hein'];

// um número de 0 a n-1 que é sempre o mesmo pro mesmo texto: comentário não muda ao reabrir
function hashCat(s, n) {
  var h = 0;
  for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return n ? h % n : h;
}

/* A etiqueta do perfil: o que os outros veem de você. Cinco degraus do
   medidor, que vai de -20 (malandro) a 20 (honesto). */
function etiquetaFama(f) {
  f = f || 0;
  if (f >= 12) return { t: 'CIDADÃO EXEMPLAR', cor: 0x15803d };
  if (f >= 4) return { t: 'GENTE BOA', cor: 0x3aa05a };
  if (f > -4) return { t: 'PASSAGEIRO COMUM', cor: 0x667781 };
  if (f > -12) return { t: 'ESPERTINHO', cor: 0xe07a1e };
  return { t: 'PULA-CATRACA', cor: 0xe8362c };
}

var Catragram = {
  CHAVE: 'metrosp_catragram',
  estado: null,

  le: function () {
    if (this.estado) return this.estado;
    var e = null;
    try { e = JSON.parse(localStorage.getItem(this.CHAVE) || 'null'); } catch (x) { e = null; }
    if (!e || !e.prog || !e.feitas || !e.ordem) { e = { prog: {}, feitas: {}, ordem: [], vistos: 0 }; this.herda(e); }
    this.estado = e;
    return e;
  },
  grava: function () {
    try { localStorage.setItem(this.CHAVE, JSON.stringify(this.estado)); } catch (x) { }
  },
  /* Quem já tinha subido no MISSÕES: os níveis de baixo estão inteiros,
     e do nível atual vale o que estava marcado. Sai tudo como post antigo,
     sem aviso nem prêmio (o prêmio já foi pago lá). */
  herda: function (e) {
    var m = null;
    try { m = JSON.parse(localStorage.getItem('metrosp_missoes') || 'null'); } catch (x) { m = null; }
    if (!m || typeof m.nivel !== 'number') return;
    for (var i = 0; i < CONQUISTAS.length; i++) {
      var c = CONQUISTAS[i];
      if (!c.antiga) continue;
      var n = c.antiga[0], k = c.antiga[1];
      var feita = n < m.nivel || (n === m.nivel && m.feitas && m.feitas[k]);
      if (feita) { e.feitas[c.id] = { dia: 0, hora: '', fama: 0, antes: true }; e.ordem.push(c.id); }
      else if (n === m.nivel && m.prog) e.prog[c.id] = m.prog[k] || 0;
    }
    e.vistos = e.ordem.length;
    this.estado = e;
    this.grava();
  },

  feita: function (id) { return this.le().feitas[id] || null; },
  quantas: function () { return this.le().ordem.length; },
  naoVistos: function () { var e = this.le(); return Math.max(0, e.ordem.length - (e.vistos || 0)); },
  marcaVistos: function () { var e = this.le(); e.vistos = e.ordem.length; this.grava(); },
  porId: function (id) {
    for (var i = 0; i < CONQUISTAS.length; i++) if (CONQUISTAS[i].id === id) return CONQUISTAS[i];
    return null;
  },
  // o feed: do mais novo pro mais velho
  posts: function () {
    var o = this.le().ordem, out = [];
    for (var i = o.length - 1; i >= 0; i--) { var c = this.porId(o[i]); if (c) out.push(c); }
    return out;
  },

  // partida nova: o que é 'numa corrida' e não saiu volta pro zero
  novaCorrida: function () {
    var e = this.le();
    for (var i = 0; i < CONQUISTAS.length; i++) {
      var c = CONQUISTAS[i];
      if (c.corrida && !e.feitas[c.id]) e.prog[c.id] = 0;
    }
    this.grava();
  },

  conta: function (ev, dados) {
    if (GameState.treino || GameState.explorar) return;
    var e = this.le(), mudou = false;
    dados = dados || {};
    for (var i = 0; i < CONQUISTAS.length; i++) {
      var c = CONQUISTAS[i];
      if (!c.ev || c.ev !== ev || e.feitas[c.id]) continue;
      if (c.se && !c.se(dados)) continue;
      e.prog[c.id] = Math.min(c.meta, (e.prog[c.id] || 0) + (dados.n || 1));
      mudou = true;
      if (e.prog[c.id] >= c.meta) this.conclui(c);
    }
    if (mudou) this.grava();
  },
  // o medidor chegou num degrau que é conquista
  confereFama: function () {
    if (GameState.treino || GameState.explorar) return;
    var f = GameState.fama || 0, e = this.le();
    for (var i = 0; i < CONQUISTAS.length; i++) {
      var c = CONQUISTAS[i];
      if (c.fama === undefined || e.feitas[c.id]) continue;
      if ((c.fama > 0 && f >= c.fama) || (c.fama < 0 && f <= c.fama)) { this.conclui(c); this.grava(); }
    }
  },

  /* Saiu: vira post (com o dia, a hora e o medidor de agora, que decidem
     o tom dos comentários), rende XP pro personagem e pontos, e destrava
     personagem na 12ª e na 27ª. A notificação é a do celular. */
  conclui: function (c) {
    var e = this.le();
    if (e.feitas[c.id]) return;
    e.feitas[c.id] = { dia: GameState.dia || 1, hora: GameState.char ? GameState.hora() : '', fama: GameState.fama || 0,
      char: GameState.charKey || '' };
    e.ordem.push(c.id);
    var xp = c.xp || 15, pts = c.secreta ? 20 : 10, ganhou = '';
    if (GameState.char && typeof ganhaXp === 'function') ganhaXp(xp);
    var quem = PREMIO_CONQ[e.ordem.length];
    if (quem) {
      if (destravado(quem)) pts += precoDe(quem);
      else { destrava(quem); ganhou = nomeDoChar(quem); }
    }
    gravaPontos(lePontos() + pts);
    avisaConquista(c, xp, ganhou);
  },

  /* Quem reage: os contatos do ZipZap desse personagem (sem os grupos),
     mais as figuras do metrô. Tudo sai do id do post, então reabrir o
     feed mostra as mesmas curtidas e os mesmos comentários. */
  quemComenta: function () {
    var l = [];
    try {
      var cs = contatosDe(GameState.charKey || 'estudante');
      for (var i = 0; i < cs.length; i++) if (!cs[i].grupo) l.push(cs[i].nome);
    } catch (x) { }
    if (GameState.charKey === 'estudante') l.push('SUELI (RH)', 'MARCÃO');
    return l.concat(CAT_FIGURAS);
  },
  reacoes: function (c) {
    var info = this.feita(c.id) || { fama: 0 }, gente = this.quemComenta(), s = c.id + (GameState.charKey || '');
    var malandro = (info.fama || 0) < -3;
    var pool = CAT_COMENTA[c.cat] || CAT_COMENTA.rota;
    var com = [];
    var a = gente[hashCat(s + 'a', gente.length)], b = gente[hashCat(s + 'b', gente.length)];
    com.push({ quem: a, t: pool[hashCat(s + 'x', pool.length)] });
    if (b !== a) com.push({ quem: b, t: malandro ? CAT_INDIRETA[hashCat(s + 'y', CAT_INDIRETA.length)] : pool[hashCat(s + 'y', pool.length)] });
    var curt = 3 + hashCat(s + 'c', 30) + this.quantas() + Math.abs(info.fama || 0);
    return { curtidas: curt, primeiro: gente[hashCat(s + 'p', gente.length)], comentarios: com };
  },
  // os números do perfil
  seguidores: function () { return 37 + 11 * this.quantas() + 3 * Math.abs(GameState.fama || 0); },
  seguindo: function () { return this.quemComenta().length + 12; }
};

/* ---------- o aviso de conquista ----------
   'Tem que aparecer de uma forma mais bonita, e notificar no celular pra
   você ir clicar e ver.' Então não é a notificaçãozinha de sempre: é uma
   faixa com a MEDALHA desenhada, o nome da conquista, o XP, e o convite
   pra abrir o Catragram (que já fica com a bolinha vermelha). */
function avisaConquista(c, xp, ganhou) {
  var hud = (window.jogo && jogo.scene) ? jogo.scene.getScene('Hud') : null;
  if (!hud || !hud.sys || !hud.sys.isActive()) { avisaMissao('CATRAGRAM', c.legenda); return; }
  var cx = hud.add.container(0, -110).setDepth(5200);
  var g = hud.add.graphics();
  var cor = (CAT_CONQ[c.cat] || CAT_CONQ.rota).cor;
  g.fillStyle(0x000000, 0.4).fillRect(14, 6, GW - 24, 66);
  g.fillStyle(0x0d1018, 0.98).fillRect(12, 0, GW - 24, 66);
  g.lineStyle(2, cor, 1).strokeRect(12, 0, GW - 24, 66);
  desenhaMedalha(g, 44, 33, 20, c.cat, true);
  var t1 = txt(hud, 76, 8, 'CONQUISTA!', PAL.amarelo, 8).setScale(ESCALA_TEXTO / 2);
  var t2 = txt(hud, 76, 22, c.legenda, PAL.branco, 8).setScale(ESCALA_TEXTO / 2).setMaxWidth((GW - 100) / (ESCALA_TEXTO / 2));
  var t3 = txt(hud, 76, 48, '+' + xp + ' XP' + (ganhou ? '  +' + ganhou : '') + '   VEJA NO CATRAGRAM',
    PAL.verde, 8).setScale(ESCALA_TEXTO / 2);
  cx.add([g, t1, t2, t3]);
  tocaJingle('achou');
  hud.tweens.add({ targets: cx, y: HUD_H + 6, duration: 280, ease: 'Cubic.easeOut', hold: 2600, yoyo: true,
    onComplete: function () { cx.destroy(); } });
}

function arrobaDe(nome) {
  return '@' + String(nome || 'voce').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');
}
function numeroCurto(n) { return n >= 1000 ? (n / 1000).toFixed(1).replace('.', ',') + 'K' : String(n); }

/* ---------- a medalha ----------
   Um círculo de ouro com o miolo na cor da família e o desenho dela
   (visto, raio, trem, coração, estrela), e a fita embaixo. Apagada, é a
   silhueta cinza com o cadeado. Desenhada, não escrita: é o que se lê
   primeiro no grid do perfil. */
function desenhaMedalha(g, cx, cy, r, cat, acesa) {
  var c = CAT_CONQ[cat] || CAT_CONQ.rota, u = r / 10;
  var cor = acesa ? c.cor : 0xb8bcc8, ouro = acesa ? 0xf2c14e : 0xcfd2da, fita = acesa ? c.cor : 0xa4a8b4;
  g.fillStyle(fita, 1);
  g.fillTriangle(cx - 6 * u, cy + 5 * u, cx - 1 * u, cy + 6 * u, cx - 5 * u, cy + 15 * u);
  g.fillTriangle(cx + 6 * u, cy + 5 * u, cx + 1 * u, cy + 6 * u, cx + 5 * u, cy + 15 * u);
  g.fillStyle(0x000000, 0.15).fillCircle(cx + u, cy + u, r);
  g.fillStyle(ouro, 1).fillCircle(cx, cy, r);
  g.fillStyle(cor, 1).fillCircle(cx, cy, r * 0.78);
  g.fillStyle(0xffffff, 0.22).fillCircle(cx - 3 * u, cy - 3 * u, r * 0.3);
  var br = 0xffffff;
  if (!acesa) {
    // o cadeado
    g.fillStyle(br, 1).fillRect(cx - 3 * u, cy - u, 6 * u, 5 * u);
    g.lineStyle(Math.max(1.5, 1.4 * u), br, 1).strokeCircle(cx, cy - 2 * u, 2.2 * u);
    g.fillStyle(cor, 1).fillRect(cx - 0.6 * u, cy + 0.5 * u, 1.2 * u, 2 * u);
    return;
  }
  g.lineStyle(Math.max(2, 1.6 * u), br, 1);
  if (cat === 'honesto') {
    g.beginPath(); g.moveTo(cx - 4 * u, cy); g.lineTo(cx - u, cy + 3 * u); g.lineTo(cx + 4 * u, cy - 3 * u); g.strokePath();
  } else if (cat === 'malandro') {
    g.fillStyle(br, 1).fillPoints([{ x: cx + u, y: cy - 5 * u }, { x: cx - 3 * u, y: cy + u }, { x: cx, y: cy + u },
      { x: cx - u, y: cy + 5 * u }, { x: cx + 3 * u, y: cy - u }, { x: cx, y: cy - u }], true);
  } else if (cat === 'gente') {
    g.fillStyle(br, 1).fillCircle(cx - 2 * u, cy - u, 2.4 * u).fillCircle(cx + 2 * u, cy - u, 2.4 * u);
    g.fillTriangle(cx - 4.3 * u, cy - 0.2 * u, cx + 4.3 * u, cy - 0.2 * u, cx, cy + 4.5 * u);
  } else if (cat === 'desafio') {
    var pts = [];
    for (var k = 0; k < 10; k++) {
      var ang = -Math.PI / 2 + k * Math.PI / 5, rr = (k % 2 ? 2.2 : 5) * u;
      pts.push({ x: cx + Math.cos(ang) * rr, y: cy + Math.sin(ang) * rr });
    }
    g.fillStyle(br, 1).fillPoints(pts, true);
  } else {
    // na rota: a frente do trem, com o para-brisa e os faróis
    g.fillStyle(br, 1).fillRoundedRect(cx - 3.5 * u, cy - 4.5 * u, 7 * u, 8.5 * u, 1.5 * u);
    g.fillStyle(cor, 1).fillRect(cx - 2.5 * u, cy - 3.2 * u, 5 * u, 3 * u);
    g.fillCircle(cx - 1.8 * u, cy + 2 * u, 0.8 * u).fillCircle(cx + 1.8 * u, cy + 2 * u, 0.8 * u);
  }
}

/* O MISSÕES saiu do celular, mas o jogo inteiro ainda anuncia os seus
   acontecimentos em Missoes.conta (e o historia.js escuta por cima): quem
   ouve agora é o Catragram. */
Missoes.conta = function (ev, dados) { Catragram.conta(ev, dados); };
Missoes.novaCorrida = function () { Catragram.novaCorrida(); };
