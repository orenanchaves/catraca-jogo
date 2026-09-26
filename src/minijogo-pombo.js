/* global Phaser, GameState */
/* Catraca — o minijogo do celular: POMBO

   'Coloca um minigame tipo flappy bird no celular.' É um jogo dentro do
   jogo, e a regra dele é ser FÁCIL ('só jogos fáceis, pra não ficar
   melhor que o jogo original'): o vão é largo, a queda é lenta e cada
   toque dá um impulso generoso.

   Quem voa é um POMBO de estação, e o que ele desvia é o que existe na
   estação: os braços da catraca, de cima e de baixo, com o vão no meio.
   Não vale ponto de jogo nem XP: vale o recorde, que fica no aparelho
   (metrosp_pombo), como todo joguinho de celular.

   Mora no app POMBO, e desenha no mesmo espaço de tela dos outros: de
   ZAP.topo-8 até ZAP.abas. */

var POMBO = {
  grav: 460, impulso: -168, vel: 66,      // fácil: cai devagar e sobe fácil
  vao: 118, larg: 26, passo: 150,         // o vão entre as catracas
  x: 96, r: 7
};

function recordePombo() {
  try { return parseInt(localStorage.getItem('metrosp_pombo') || '0', 10) || 0; } catch (e) { return 0; }
}
function gravaRecordePombo(n) {
  try { localStorage.setItem('metrosp_pombo', String(n)); } catch (e) { }
}

ZapScene.prototype.comecaPombo = function (reinicia) {
  var y0 = (ZAP.topo - 8 + ZAP.abas) / 2;
  this.pombo = { y: y0, vy: 0, t: 0, pontos: 0, morto: false, esperando: !reinicia, obs: [] };
  var x = ZAP.tx1 + 40;
  for (var i = 0; i < 4; i++) { this.pombo.obs.push({ x: x + i * POMBO.passo, vao: this.vaoPombo(), passou: false }); }
};
ZapScene.prototype.vaoPombo = function () {
  var y0 = ZAP.topo + 26, y1 = ZAP.abas - 46;
  return y0 + Math.random() * (y1 - y0 - POMBO.vao);
};

ZapScene.prototype.rodaPombo = function (dt) {
  var p = this.pombo;
  if (!p) { this.comecaPombo(false); p = this.pombo; }
  var toque = Ctrl.actJust || this._tocouPombo;
  this._tocouPombo = false;
  if (p.esperando) {
    // parado no ar, esperando o primeiro toque
    p.t += dt;
    p.y += Math.sin(p.t / 260) * 0.2;
    if (toque) { p.esperando = false; p.vy = POMBO.impulso; }
    this.pintaPombo();
    return;
  }
  if (p.morto) {
    p.t += dt;
    if (toque && p.t > 700) this.comecaPombo(true);
    this.pintaPombo();
    return;
  }
  if (toque) { p.vy = POMBO.impulso; sfx('catraca'); }
  p.vy += POMBO.grav * dt / 1000;
  p.y += p.vy * dt / 1000;
  var topo = ZAP.topo - 4, base = ZAP.abas - 6;
  if (p.y < topo + POMBO.r) { p.y = topo + POMBO.r; p.vy = 0; }
  if (p.y > base - POMBO.r) { this.morrePombo(); return; }
  for (var i = 0; i < p.obs.length; i++) {
    var o = p.obs[i];
    o.x -= POMBO.vel * dt / 1000;
    if (o.x + POMBO.larg < ZAP.tx0 - 20) { o.x += POMBO.passo * p.obs.length; o.vao = this.vaoPombo(); o.passou = false; }
    if (!o.passou && o.x + POMBO.larg < POMBO.x - POMBO.r) {
      o.passou = true; p.pontos++;
      sfx('moeda');
    }
    // bateu na catraca?
    if (POMBO.x + POMBO.r > o.x && POMBO.x - POMBO.r < o.x + POMBO.larg &&
      (p.y - POMBO.r < o.vao || p.y + POMBO.r > o.vao + POMBO.vao)) { this.morrePombo(); return; }
  }
  this.pintaPombo();
};

ZapScene.prototype.morrePombo = function () {
  var p = this.pombo;
  if (!p || p.morto) return;
  p.morto = true; p.t = 0;
  sfx('nao');
  if (p.pontos > recordePombo()) { gravaRecordePombo(p.pontos); p.recorde = true; }
  this.pintaPombo();
};

ZapScene.prototype.pintaPombo = function () {
  var p = this.pombo, g = this.gPombo, x0 = ZAP.tx0, x1 = ZAP.tx1, W = x1 - x0;
  if (!g) return;
  var topo = ZAP.topo - 8, base = ZAP.abas;
  g.clear();
  // o céu da estação: azulejo claro com a faixa da linha lá no fundo
  g.fillStyle(0x1b2430, 1).fillRect(x0, topo, W, base - topo);
  g.fillStyle(0x223044, 1);
  for (var l = topo + 12; l < base; l += 26) g.fillRect(x0, l, W, 2);
  g.fillStyle(0x2f7d5e, 0.35).fillRect(x0, base - 26, W, 26);
  // as catracas
  for (var i = 0; i < p.obs.length; i++) {
    var o = p.obs[i];
    if (o.x > x1 || o.x + POMBO.larg < x0) continue;
    var cima = { y: topo, h: o.vao - topo }, baixo = { y: o.vao + POMBO.vao, h: base - (o.vao + POMBO.vao) };
    [cima, baixo].forEach(function (q) {
      if (q.h <= 0) return;
      g.fillStyle(0x3a4152, 1).fillRect(o.x, q.y, POMBO.larg, q.h);
      g.fillStyle(0x4a5264, 1).fillRect(o.x, q.y, 3, q.h);
      g.fillStyle(0x14141c, 1).fillRect(o.x + POMBO.larg - 3, q.y, 3, q.h);
      // o braço da catraca na ponta que dá pro vão
      g.fillStyle(0xf2c14e, 1);
      if (q === cima) g.fillRect(o.x - 4, q.y + q.h - 8, POMBO.larg + 8, 8);
      else g.fillRect(o.x - 4, q.y, POMBO.larg + 8, 8);
    });
  }
  // o pombo: corpo, cabeça, bico e a asa que bate quando sobe
  var py = Math.round(p.y), subindo = p.vy < 0;
  g.fillStyle(0x0a0a12, 0.3).fillEllipse(POMBO.x + 3, py + 10, 16, 5);
  g.fillStyle(0x6a7a8c, 1).fillEllipse(POMBO.x, py, 18, 13);
  g.fillStyle(0x8a99aa, 1).fillEllipse(POMBO.x - 2, py - 2, 12, 8);
  g.fillStyle(0x4a5a6c, 1).fillEllipse(POMBO.x - 1, py + (subindo ? -6 : 4), 12, 6);
  g.fillStyle(0x2e3a48, 1).fillCircle(POMBO.x + 7, py - 4, 5);
  g.fillStyle(0xf2f0ff, 1).fillCircle(POMBO.x + 9, py - 5, 1.5);
  g.fillStyle(0xe8a33c, 1).fillTriangle(POMBO.x + 11, py - 5, POMBO.x + 18, py - 3, POMBO.x + 11, py - 1);
  // o verdinho do pescoço
  g.fillStyle(0x3fa07d, 0.7).fillCircle(POMBO.x + 4, py - 1, 3);
};

/* Os textos do jogo (pontos, recorde, o convite pra tocar) usam a mesma
   reserva do mapa, como as outras telas do celular. */
ZapScene.prototype.textosDoPombo = function () {
  var p = this.pombo, n = 0, eu = this;
  var tx = function (t, x, y, cor, meia) {
    if (n >= 8) return;
    eu.rotMapa[n++].setVisible(true).setAngle(0).setOrigin(0.5, 0).setMaxWidth(0)
      .setScale(meia ? ESCALA_TEXTO / 2 : ESCALA_TEXTO).setPosition(Math.round(x), Math.round(y))
      .setText(t).setColor(cor);
  };
  var meio = (ZAP.tx0 + ZAP.tx1) / 2;
  tx(String(p.pontos), meio, ZAP.topo + 6, PAL.branco);
  tx('RECORDE ' + recordePombo(), meio, ZAP.abas - 20, PAL.cinzaEsc, true);
  if (p.esperando) {
    tx(nomeAgir() + ' PRA VOAR', meio, ZAP.abas - 70, PAL.amarelo, true);
    tx('DESVIE DAS CATRACAS', meio, ZAP.abas - 56, PAL.cinza, true);
  } else if (p.morto) {
    tx(p.recorde ? 'RECORDE NOVO!' : 'BATEU NA CATRACA', meio, ZAP.abas - 84, p.recorde ? PAL.verde : PAL.vermelho);
    tx(nomeAgir() + ' PRA VOAR DE NOVO', meio, ZAP.abas - 56, PAL.cinza, true);
  }
  /* o jogo reescreve o texto a cada quadro sem passar pelo `pinta`, que é
     quem apaga a reserva inteira — sem apagar aqui, o BATEU NA CATRACA da
     partida anterior fica na tela durante a partida nova */
  for (var s = n; s < 8; s++) this.rotMapa[s].setVisible(false);
};
