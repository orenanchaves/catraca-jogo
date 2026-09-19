/* global Phaser, GameState */
/* Catraca — as missões

   No modelo do Alto's Adventure: a corrida é infinita, e por cima dela
   sempre tem TRÊS missões. Cumpriu as três, sobe de nível e vêm três
   novas. O loop continua sendo o jogo; as missões são o motivo de voltar
   pra ele, e são também o tutorial que não parece tutorial — cada uma
   empurra o jogador pra uma coisa que ele talvez nunca descobrisse
   sozinho (o mapa da parede, o ambulante, a correnteza da Sé).

   Toda missão ACUMULA entre partidas, menos as marcadas `corrida`, que
   têm que sair numa partida só e zeram quando uma nova começa. Treino não
   conta: a tela de minigames é pra ver, não pra subir.

   Cada missão escuta UM acontecimento (`ev`), que o jogo anuncia com
   `Missoes.conta(ev, dados)`. Algumas filtram pelos dados (`se`): comprar
   de ambulante conta em qualquer lugar; comprar do ambulante no Brás, só
   no Brás. Dados, não código: trocar uma missão é trocar uma linha aqui.

   Os textos cabem em DUAS linhas da tela do celular, que quebra a 18
   letras. "Escape do guarda da ronda, sentando ou trocando de carro" dava
   quatro. */

var NIVEIS = [
  { nome: 'PRIMEIRO DIA', missoes: [
    { txt: 'Chegue no horário', ev: 'noHorario', meta: 1, corrida: true },
    { txt: 'Passe 3 vezes pela catraca', ev: 'catraca', meta: 3 },
    { txt: 'Sente num banco do vagão', ev: 'sentou', meta: 1 }
  ] },
  { nome: 'O CAMINHO', missoes: [
    // era segurar a barra no solavanco, que saiu do jogo em 18/09
    { txt: 'Vença um desafio no vagão', ev: 'venceuDesafio', meta: 1 },
    { txt: 'Olhe o mapa na parede', ev: 'mapaParede', meta: 1 },
    { txt: 'Faça a baldeação na Sé', ev: 'baldeacao', meta: 1 }
  ] },
  { nome: 'GENTE', missoes: [
    { txt: 'Dê o lugar 2 vezes', ev: 'cedeu', meta: 2 },
    { txt: 'Compre de um ambulante', ev: 'ambulante', meta: 1 },
    { txt: 'Feche um dia, ida e volta', ev: 'diaCompleto', meta: 1, corrida: true }
  ] },
  { nome: 'MALANDRAGEM', missoes: [
    // só o pulo que deu certo: quem foi pego não pulou, foi pego
    { txt: 'Pule a catraca 3 vezes', ev: 'pulouCatraca', meta: 3 },
    { txt: 'Escape do guarda', ev: 'escapouGuarda', meta: 1 },
    { txt: 'Pegue 5 moedas do chão', ev: 'moedaDoChao', meta: 5 }
  ] },
  { nome: 'HORA DO PICO', missoes: [
    { txt: 'Entre num vagão no pico da manhã', ev: 'embarcou', meta: 1,
      se: function (d) { return d.faixa === 'picoManha'; } },
    { txt: 'Embarque na Sé no pico', ev: 'embarcou', meta: 1,
      se: function (d) { return d.estacao === 'SÉ' && (d.faixa === 'picoManha' || d.faixa === 'picoTarde'); } },
    // atraso é fim de partida (MAX_ATRASOS = 1): dia fechado já é dia no horário
    { txt: 'Feche 2 dias seguidos', ev: 'diaCompleto', meta: 2, corrida: true }
  ] },
  { nome: 'VERMELHA', missoes: [
    { txt: 'Compre do ambulante no Brás', ev: 'ambulante', meta: 1,
      se: function (d) { return d.estacao === 'BRÁS'; } },
    { txt: 'Vença 3 desafios', ev: 'venceuDesafio', meta: 3 },
    { txt: 'Chegue na Sé sem sentar', ev: 'seSemSentar', meta: 1, corrida: true }
  ] },
  { nome: 'AZUL', missoes: [
    { txt: 'Ganhe uma batalha de rima', ev: 'rimaGanha', meta: 1 },
    // fora do caminho de quem vai pro sul: sentido Tucuruvi, custa minutos
    { txt: 'Desça em São Bento', ev: 'desceu', meta: 1,
      se: function (d) { return d.estacao === 'SÃO BENTO'; } },
    { txt: 'Vença um pregador', ev: 'venceuDesafio', meta: 1,
      se: function (d) { return d.tipo === 'pregador'; } }
  ] },
  { nome: 'FIM DO MÊS', missoes: [
    { txt: 'Gaste até R$ 5 num dia inteiro', ev: 'diaCompleto', meta: 1, corrida: true,
      se: function (d) { return d.gasto <= 5; } },
    { txt: 'Use o achados e perdidos', ev: 'achados', meta: 1 },
    { txt: 'Ajude 2 vezes quem pede', ev: 'ajudou', meta: 2 }
  ] },
  { nome: 'ÚLTIMO TREM', missoes: [
    { txt: 'Embarque no último trem', ev: 'embarcou', meta: 1,
      se: function (d) { return d.faixa === 'ultimo'; } },
    { txt: 'Chegue em casa com 5 corações', ev: 'diaCompleto', meta: 1, corrida: true,
      se: function (d) { return d.coracoes >= CORACOES_POR_PERNA; } },
    { txt: 'Feche um dia sem multa', ev: 'diaCompleto', meta: 1, corrida: true,
      se: function (d) { return d.multas === 0; } }
  ] },
  { nome: 'PAULISTANO', missoes: [
    { txt: 'Feche 3 dias seguidos', ev: 'diaCompleto', meta: 3, corrida: true },
    { txt: 'Ceda o lugar antes de pedirem', ev: 'cedeuCedo', meta: 3 },
    { txt: 'Feche um dia com 80 de carisma', ev: 'diaCompleto', meta: 1, corrida: true,
      se: function (d) { return d.carisma >= 80; } }
  ] }
];

/* O prêmio de subir: pontos sempre, 10 por nível (subir pro 3 dá 30), e
   dois níveis destravam personagem. Só existem dois trancados — a
   gestante (90 pontos) e o turista (150) —, então são dois e não três.
   Quem já comprou recebe o preço em pontos: ninguém perde por ter pago. */
var PREMIO_NIVEL = { 5: 'gestante', 10: 'turista' };

var Missoes = {
  CHAVE: 'metrosp_missoes',
  estado: null,

  le: function () {
    if (this.estado) return this.estado;
    var e = null;
    try { e = JSON.parse(localStorage.getItem(this.CHAVE) || 'null'); } catch (x) { e = null; }
    if (!e || typeof e.nivel !== 'number' || !e.prog || !e.feitas) {
      e = { nivel: 0, prog: [0, 0, 0], feitas: [false, false, false] };
    }
    this.estado = e;
    return e;
  },

  grava: function () {
    try { localStorage.setItem(this.CHAVE, JSON.stringify(this.estado)); } catch (x) { }
  },

  /* Partida de verdade começando: zera o que é "numa corrida" e ainda não
     saiu. O que já saiu fica — cumprir não se desfaz. */
  novaCorrida: function () {
    var e = this.le(), n = NIVEIS[e.nivel];
    if (!n) return;
    for (var i = 0; i < 3; i++) if (n.missoes[i].corrida && !e.feitas[i]) e.prog[i] = 0;
    this.grava();
  },

  conta: function (ev, dados) {
    if (GameState.treino || GameState.explorar) return;
    var e = this.le(), n = NIVEIS[e.nivel];
    if (!n) return;
    dados = dados || {};
    var mudou = false;
    for (var i = 0; i < 3; i++) {
      var m = n.missoes[i];
      if (e.feitas[i] || m.ev !== ev) continue;
      if (m.se && !m.se(dados)) continue;
      e.prog[i] = Math.min(m.meta, e.prog[i] + (dados.n || 1));
      mudou = true;
      if (e.prog[i] >= m.meta) {
        e.feitas[i] = true;
        avisaMissao('MISSÃO CUMPRIDA', m.txt);
      }
    }
    if (!mudou) return;
    if (e.feitas[0] && e.feitas[1] && e.feitas[2]) this.sobe();
    this.grava();
  },

  sobe: function () {
    var e = this.le(), chegou = e.nivel + 2;       // o nível novo, contado de 1
    var pts = 10 * chegou, quem = PREMIO_NIVEL[chegou], ganhou = '';
    if (quem) {
      if (destravado(quem)) pts += precoDe(quem);
      else { destrava(quem); ganhou = nomeDoChar(quem); }
    }
    gravaPontos(lePontos() + pts);
    e.nivel++;
    e.prog = [0, 0, 0];
    e.feitas = [false, false, false];
    var prox = NIVEIS[e.nivel];
    avisaMissao(prox ? 'NÍVEL ' + (e.nivel + 1) + ': ' + prox.nome : 'TODOS OS NÍVEIS',
      '+' + pts + ' PONTOS' + (ganhou ? ' + ' + ganhou : ''));
    sfx('vitoria');
  }
};

/* ---------- a notificação ----------
   Chega como notificação de celular, que foi o formato pedido pro
   letreiro: desce do topo, fica dois segundos e sobe de volta, sem
   parar o jogo. Mora no HUD, que nunca é pausado, então aparece até com
   o ZipZap aberto. Duas de uma vez (a missão e o nível que ela fechou)
   entram em fila, uma depois da outra. */
var AVISOS = [], AVISO_ATIVO = false;

/* ---------- em que cena o aviso aparece ----------
   O HUD é a cena de cima na maioria das telas, mas não em todas: o
   DESAFIO (e as outras lutas) desenham DEPOIS dele, porque pintam o
   painel por cima do mundo com zoom. Aviso no HUD durante o duelo ficava
   ATRÁS da ficha ('isso tem que sobrepor'). Então o aviso procura a cena
   mais de cima que está no ar. */
function cenaDoAviso() {
  var ordem = ['Desafio', 'Briga', 'Disputa', 'Encarada', 'Hud'];
  for (var i = 0; i < ordem.length; i++) {
    var c = (window.jogo && jogo.scene) ? jogo.scene.getScene(ordem[i]) : null;
    if (c && c.sys && c.sys.isActive()) return c;
  }
  return null;
}

/* ---------- a ordem da missão, em letra grande ----------
   'Depois de responder a mensagem e voltar pro jogo, aparecer um textão
   na tela: vá até o estágio na estação tal.' Mora no HUD, que nunca é
   pausado, e some sozinho em 3,4 s. */
function bannerObjetivo(texto) {
  var hud = cenaDoAviso();
  if (!hud || !hud.sys || !hud.sys.isActive() || !texto) return;
  var c = hud.add.container(0, 0).setDepth(4800);
  var g = hud.add.graphics();
  var t1 = txtC(hud, GW / 2, GH / 2 - 34, 'AGORA', PAL.amarelo, 8).setScale(ESCALA_TEXTO / 2);
  var t2 = txtC(hud, GW / 2, GH / 2 - 16, texto, PAL.branco, 8).setMaxWidth(GW - 48);
  var alt = 40 + Math.round(t2.height);
  g.fillStyle(0x05050a, 0.86).fillRect(0, GH / 2 - 44, GW, alt);
  g.fillStyle(0xf2c14e, 1).fillRect(0, GH / 2 - 44, GW, 2).fillRect(0, GH / 2 - 44 + alt - 2, GW, 2);
  c.add([g, t1, t2]);
  c.setAlpha(0);
  guardaBanner(c);
  hud.tweens.add({ targets: c, alpha: 1, duration: 220, hold: 3000, yoyo: true,
    onComplete: function () { c.destroy(); } });
  sfx('ok');
}

/* A faixa de chegada: grande, no meio, verde quando deu tempo e vermelha
   quando não deu. É o aviso de que a perna acabou. */
function bannerChegada(titulo, sub, ruim) {
  var hud = cenaDoAviso();
  if (!hud || !hud.sys || !hud.sys.isActive()) return;
  var c = hud.add.container(0, 0).setDepth(4900), g = hud.add.graphics();
  var cor = ruim ? 0xe8362c : 0x00e676, y0 = GH / 2 - 56;
  /* O título é medido ANTES de o resto ser posto: 'CHEGOU: O ESTÁGIO' em
     corpo 16 quebra em duas linhas, e com o sub em y fixo as duas
     encavalavam. */
  var t1 = txtC(hud, GW / 2, y0 + 16, titulo, ruim ? PAL.vermelho : PAL.verde, 16).setMaxWidth(GW - 24);
  var t2 = txtC(hud, GW / 2, y0 + 24 + Math.round(t1.height), sub, PAL.branco, 8)
    .setScale(ESCALA_TEXTO / 2).setMaxWidth((GW - 40) / (ESCALA_TEXTO / 2));
  var alt = 40 + Math.round(t1.height) + Math.round(t2.height);
  g.fillStyle(0x05050a, 0.9).fillRect(0, y0, GW, alt);
  g.fillStyle(cor, 1).fillRect(0, y0, GW, 3).fillRect(0, y0 + alt - 3, GW, 3);
  c.add([g, t1, t2]);
  c.setAlpha(0);
  guardaBanner(c);
  hud.tweens.add({ targets: c, alpha: 1, duration: 200, hold: 2200, yoyo: true, onComplete: function () { c.destroy(); } });
}

/* Uma faixa grande por vez: a de chegada em cima da de objetivo virava
   duas frases uma por cima da outra. */
var BANNER_ATIVO = null;
function guardaBanner(c) {
  if (BANNER_ATIVO && BANNER_ATIVO.scene) BANNER_ATIVO.destroy();
  BANNER_ATIVO = c;
}

function avisaMissao(titulo, texto) {
  AVISOS.push([titulo, texto]);
  if (!AVISO_ATIVO) proximoAviso();
}

function proximoAviso() {
  var hud = cenaDoAviso();
  var a = AVISOS.shift();
  if (!a || !hud || !hud.sys || !hud.sys.isActive()) { AVISO_ATIVO = false; AVISOS.length = 0; return; }
  AVISO_ATIVO = true;
  sfx('moeda');
  var caixa = hud.add.container(0, -90).setDepth(5000);
  var g = hud.add.graphics();
  var t1 = txt(hud, 40, 3, a[0], PAL.verde, 8);
  var t2 = txt(hud, 20, 24, a[1], PAL.branco, 8).setMaxWidth(GW - 44);
  /* A altura segue o texto: "+20 PONTOS" é uma linha e "Chegue em casa
     com 5 corações" são duas (23 letras por linha aqui). Com a caixa fixa
     no tamanho de duas, a de uma linha ficava com 20px de vazio embaixo. */
  var alt = 24 + Math.round(t2.height) + 4;
  caixa.y = -alt - 8;
  g.fillStyle(0x000000, 0.4).fillRect(14, 4, GW - 24, alt);
  g.fillStyle(0x0d1018, 0.97).fillRect(12, 0, GW - 24, alt);
  g.lineStyle(1, 0x2a3550, 1).strokeRect(12, 0, GW - 24, alt);
  // o ícone do ZipZap: o quadradinho verde de aplicativo
  g.fillStyle(0x00e676, 1).fillRect(20, 8, 12, 12);
  g.fillStyle(0x0d1018, 1).fillRect(23, 11, 6, 4);
  caixa.add([g, t1, t2]);
  hud.tweens.add({
    targets: caixa, y: HUD_H + 6, duration: 260, ease: 'Cubic.easeOut',
    hold: 1900, yoyo: true,
    onComplete: function () { caixa.destroy(); proximoAviso(); }
  });
}
