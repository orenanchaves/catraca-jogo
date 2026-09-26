/* global Phaser, GameState */
/* Catraca — o chefão do Ato 1 do estudante: O FISCAL

   Da sabatina (CAMPANHA.md): no dia 5, na primeira catraca do dia, o
   Bilhete Único dá BLOQUEADO e o fiscal acusa todo mundo, honesto ou
   malandro ('esse bilhete tá na lista de clonados'). A multidão de trás te
   empurra pra dentro, e começa a FASE DE AÇÃO: a fuga.

   - Chegar num trem em 60 segundos. Entrou no vagão (o empurrão da porta
     conta), escapou: chefão vencido, sem duelo.
   - O fiscal tem um cone de visão pra onde anda. Viu, corre atrás; perdeu
     de vista por 1,8 s, vai até onde te viu por último e fica rodando.
   - Três pessoas juntas no caminho tapam o cone: a multidão esconde.
   - Colou em você, ou acabou o tempo: te alcançou, e é DUELO (desafio.js).
     O honesto tem o EXTRATO (o LARANJINHA prova a recarga); o malandro
     pega o FISCAL DURO. Ganhou, ele libera; perdeu, multa de R$ 20, 10 de
     carisma e meia hora de sermão. Nos dois casos a viagem segue: escolha
     nenhuma trava história.

   O fim vai pra história (Historia.fechaChefao), que muda o recado do
   Marcão na chegada e solta a conquista do Catragram. */

var FISCAL = {
  vel: 84,               // o seu passo cheio é 108; cansado, 65: fugir cansado é mais difícil
  alcance: 130,          // o comprimento do cone
  meia: 0.62,            // metade da abertura, em radianos (uns 35 graus)
  tempo: 60000,
  pega: 18,              // a essa distância, ele te segurou
  perde: 1800            // sem te ver por esse tanto, ele perde o rastro
};

// o chefão só existe no dia dele, na primeira catraca do dia, entrando da rua
EstacaoScene.prototype.montaChefao = function () {
  this.chefao = null;
  if (this.treino || !this.mez || GameState.explorar || !GameState.char || typeof Historia === 'undefined') return;
  if (!Historia.chefaoArmado('fiscal') || GameState.pernaIdx !== 0 || GameState.dentroDoSistema) return;
  // ele espera do lado de fora, perto das bilheterias: é por trás que ele vem
  var f = new Ator(this, (MEZ.x0 + MEZ.x1) / 2 - 110, CATRACA_Y + 70, 'np_fiscal');
  f.sp.setDepth(40); f.dir = 'up'; f.anima(0, false); f.fixo = true;
  this.gente.push(f); this.fixos.push(f);
  this.chefao = { fase: 'espera', f: f, t: 0, estado: 'caca', semVer: 0, olhar: -Math.PI / 2 };
  this.gFiscal = this.add.graphics().setDepth(2.6);
  // o contador mora embaixo da faixa de dica (que acaba em ~130), numa pílula escura
  this.gFuga = this.add.graphics().setScrollFactor(0).setDepth(599);
  this.tFuga = txtC(this, GW / 2, 146, '', PAL.amarelo, 8).setScrollFactor(0).setDepth(600).setVisible(false);
};

/* Chamado todo quadro, antes do empurrão da porta (o fiscal corre até
   enquanto você empurra). Devolve true quando a cena é dele e você não
   anda (o bloqueio e o momento em que ele te segura). */
EstacaoScene.prototype.atualizaChefao = function (dt) {
  var c = this.chefao;
  if (!c || c.fase === 'fim') return false;
  if (c.fase === 'espera') {
    var sp = this.pl.sp;
    if (sp.y < CATRACA_Y + 44 && sp.y > CATRACA_Y - 4) this.bloqueiaBilhete();
    return false;
  }
  if (c.fase === 'fuga') { this.fogeDoFiscal(dt); return false; }
  return c.fase === 'cena' || c.fase === 'pego';
};

EstacaoScene.prototype.bloqueiaBilhete = function () {
  var c = this.chefao, eu = this, f = c.f;
  c.fase = 'cena';
  sfx('nao');
  this.cameras.main.shake(140, 0.005 * TREMIDA);
  fala(this, 'BLOQUEADO.\nO Bilhete Único não passou.', []);
  this.time.delayedCall(1500, function () {
    if (eu.dialog) eu.dialog.fecha();
    sfx('apito');
    var ex = txtC(eu, f.sp.x, f.sp.y - 62, '!', PAL.amarelo, 16).setDepth(90);
    fala(eu, 'FISCAL: Parado aí! Esse bilhete tá na lista de clonados.', []);
    eu.time.delayedCall(2100, function () {
      ex.destroy();
      if (eu.dialog) eu.dialog.fecha();
      // a multidão de trás te empurra pra dentro, pela catraca mais perto
      var g = null, melhor = 1e9;
      for (var i = 0; i < eu.gates.length; i++) {
        var gx = (eu.gates[i].x0 + eu.gates[i].x1) / 2;
        if (Math.abs(gx - eu.pl.sp.x) < melhor) { melhor = Math.abs(gx - eu.pl.sp.x); g = eu.gates[i]; }
      }
      sfx('empurra');
      eu.pl.dir = 'up';
      eu.tweens.add({ targets: eu.pl.sp, x: g ? (g.x0 + g.x1) / 2 : eu.pl.sp.x, y: CATRACA_Y - 36, duration: 520, ease: 'Quad.easeOut',
        onComplete: function () {
          eu.liberado = true;
          if (eu.pintaCatracas) eu.pintaCatracas();
          fala(eu, 'A multidão te empurrou pra dentro.\nFOGE! Pega um trem em 60 segundos.', []);
          eu.time.delayedCall(1900, function () {
            if (eu.dialog) eu.dialog.fecha();
            c.fase = 'fuga'; c.t = 0; c.estado = 'caca'; c.semVer = 0; c.ultimo = null;
            // ele atravessa a catraca atrás de você
            f.sp.x = eu.pl.sp.x - 20; f.sp.y = CATRACA_Y + 30;
            eu.tFuga.setVisible(true);
          });
        } });
    });
  });
};

EstacaoScene.prototype.fogeDoFiscal = function (dt) {
  var c = this.chefao, f = c.f, sp = this.pl.sp;
  c.t += dt;
  var resta = Math.max(0, FISCAL.tempo - c.t);
  this.tFuga.setText('FUJA DO FISCAL: ' + Math.ceil(resta / 1000) + 'S').setColor(resta < 15000 ? PAL.vermelho : PAL.amarelo);
  var lw = Math.ceil(this.tFuga.width) + 20;
  this.gFuga.clear().fillStyle(0x0a0a12, 0.85).fillRoundedRect(GW / 2 - lw / 2, 144, lw, 26, 8);
  if (this.entrandoAnim) { this.pintaConeFiscal(false); return; }      // já está entrando no vagão
  if (resta <= 0) { this.fiscalAlcanca(true); return; }
  var ve = this.fiscalVe(sp.x, sp.y);
  if (ve) { c.estado = 'caca'; c.ultimo = { x: sp.x, y: sp.y }; c.semVer = 0; }
  else {
    c.semVer += dt;
    if (c.estado === 'caca' && c.semVer > FISCAL.perde) { c.estado = 'procura'; c.passeio = 0; }
  }
  var alvo;
  if (c.estado === 'caca') alvo = c.ultimo || { x: sp.x, y: sp.y };
  else if (c.ultimo && Math.hypot(c.ultimo.x - f.sp.x, c.ultimo.y - f.sp.y) > 10) alvo = c.ultimo;
  else {
    // chegou onde te viu e você não está: roda por perto
    c.ultimo = null;
    c.passeio -= dt;
    if (!c.rumo || c.passeio <= 0) {
      c.passeio = 1400;
      var a = Math.random() * Math.PI * 2;
      c.rumo = { x: f.sp.x + Math.cos(a) * 80, y: f.sp.y + Math.sin(a) * 80 };
    }
    alvo = c.rumo;
  }
  this.andaFiscal(alvo, (c.estado === 'caca' ? FISCAL.vel : FISCAL.vel * 0.6) * dt / 1000, dt);
  if (Math.hypot(sp.x - f.sp.x, sp.y - f.sp.y) < FISCAL.pega) { this.fiscalAlcanca(false); return; }
  this.pintaConeFiscal(ve);
};

// ele tem a chave da catraca; no resto, anda por onde qualquer um anda
EstacaoScene.prototype.podeIrFiscal = function (x, y) {
  if (Math.abs(y - CATRACA_Y) < 18) return x > MEZ.x0 + 22 && x < MEZ.x1 - 22;
  return this.podeIr(x, y);
};
EstacaoScene.prototype.andaFiscal = function (alvo, v, dt) {
  var c = this.chefao, f = c.f, eu = this;
  var ax = alvo.x - f.sp.x, ay = alvo.y - f.sp.y, d = Math.hypot(ax, ay);
  if (d < 1) { f.anima(dt, false); return; }
  var nx = f.sp.x + ax / d * v, ny = f.sp.y + ay / d * v;
  var pode = function (x, y) { return eu.podeIrFiscal(x, y); };
  if (pode(nx, ny)) { f.sp.x = nx; f.sp.y = ny; }
  else if (pode(nx, f.sp.y)) f.sp.x = nx;
  else if (pode(f.sp.x, ny)) f.sp.y = ny;
  else {
    // parede na frente: escorrega pro vão mais perto, como o funil faz com você
    for (var k = 4; k <= 64; k += 4) {
      if (pode(f.sp.x + k, ny)) { f.sp.x += Math.min(v, k); break; }
      if (pode(f.sp.x - k, ny)) { f.sp.x -= Math.min(v, k); break; }
    }
  }
  f.setDir(ax, ay);
  c.olhar = Math.atan2(ay, ax);
  f.anima(dt, true);
};

/* O cone: pra onde ele anda, 130px, uns 35 graus pra cada lado. Colado
   (34px) ele te vê de qualquer jeito. E três pessoas no caminho, a menos
   de 12px da linha entre vocês, tapam a vista. */
EstacaoScene.prototype.fiscalVe = function (x, y) {
  var c = this.chefao, f = c.f, dx = x - f.sp.x, dy = y - f.sp.y, d = Math.hypot(dx, dy);
  if (d < 34) return true;
  if (d > FISCAL.alcance) return false;
  if (Math.abs(Phaser.Math.Angle.Wrap(Math.atan2(dy, dx) - c.olhar)) > FISCAL.meia) return false;
  // totem e backlight no meio: a vista acaba neles (docs/gdd/04 §2.D)
  if (this.vistaTapada(f.sp.x, f.sp.y - 6, x, y)) return false;
  var n = 0;
  for (var i = 0; i < this.gente.length; i++) {
    var a = this.gente[i];
    if (!a || !a.sp || !a.sp.active || a === f) continue;
    var t = ((a.sp.x - f.sp.x) * dx + (a.sp.y - f.sp.y) * dy) / (d * d);
    if (t <= 0.05 || t >= 0.95) continue;
    var px = f.sp.x + dx * t, py = f.sp.y + dy * t;
    if (Math.hypot(a.sp.x - px, a.sp.y - py) < 12 && ++n >= 3) return false;
  }
  return true;
};
EstacaoScene.prototype.pintaConeFiscal = function (ve) {
  var c = this.chefao, f = c.f, g = this.gFiscal;
  g.clear();
  if (!c || c.fase !== 'fuga') return;
  /* Cada raio do leque vai até o alcance ou até o primeiro totem, o que
     vier antes: a sombra atrás do totem é a mesma conta do `fiscalVe`.
     24 raios e não 8. Conta: a abertura é de 71°, e com 8 raios eles
     ficam a 15px um do outro a 100px do fiscal, então a sombra de um
     totem de 16px podia cair inteira entre dois raios e sumir do
     desenho. Com 24, 5px. */
  var pts = [{ x: f.sp.x, y: f.sp.y - 6 }], RAIOS = 24;
  for (var k = 0; k <= RAIOS; k++) {
    var a = c.olhar - FISCAL.meia + (2 * FISCAL.meia) * k / RAIOS;
    var bx = f.sp.x + Math.cos(a) * FISCAL.alcance, by = f.sp.y - 6 + Math.sin(a) * FISCAL.alcance, t = 1;
    var cobs = this.coberturas || [];
    for (var q = 0; q < cobs.length; q++) {
      var tq = cortaCaixa(f.sp.x, f.sp.y - 6, bx, by, cobs[q]);
      if (tq >= 0 && tq < t) t = tq;
    }
    pts.push({ x: f.sp.x + (bx - f.sp.x) * t, y: f.sp.y - 6 + (by - f.sp.y + 6) * t });
  }
  var cor = 0xec7000;
  g.fillStyle(cor, ve ? 0.26 : (c.estado === 'caca' ? 0.16 : 0.1)).fillPoints(pts, true);
  g.lineStyle(1, cor, ve ? 0.9 : 0.4).strokePoints(pts, true);
};

// te segurou (ou acabou o tempo e ele te achou): o duelo
EstacaoScene.prototype.fiscalAlcanca = function (porTempo) {
  var c = this.chefao, f = c.f, eu = this;
  if (c.fase !== 'fuga') return;
  c.fase = 'pego';
  this.tFuga.setVisible(false); if (this.gFuga) this.gFuga.clear();
  this.gFiscal.clear();
  if (this.empurrando) this.fimEmpurrao(true);
  if (porTempo) {
    // o tempo acabou: ele aparece do seu lado, sem fôlego
    f.sp.x = this.pl.sp.x + (this.podeIr(this.pl.sp.x - 30, this.pl.sp.y) ? -30 : 30);
    f.sp.y = this.pl.sp.y;
  }
  var honesto = (GameState.fama || 0) >= 0;
  fala(this, porTempo ? 'FISCAL: Te achei!' : 'FISCAL: Peguei!', []);
  this.time.delayedCall(900, function () {
    if (eu.dialog) eu.dialog.fecha();
    eu.duelaNaEstacao(f, honesto ? 'fiscal' : 'fiscalDuro',
      { dexId: 'fiscal', respostas: honesto ? respostasComExtrato() : null },
      function (r) { eu.fimDoChefao(r === 'ganhou'); });
  });
};

EstacaoScene.prototype.fimDoChefao = function (ganhou) {
  var c = this.chefao, eu = this;
  c.fase = 'fim';
  Historia.fechaChefao('fiscal', ganhou, 'duelo');
  if (ganhou && typeof ganhaXp === 'function') ganhaXp(100);      // chefão vale um nível inteiro
  if (!ganhou) {
    var multa = Math.min(20, GameState.dinheiro);
    if (multa > 0) GameState.gastar(multa, 'MULTA DO FISCAL');
    GameState.addCarisma(-10);
    GameState.passaTempo(30);
  }
  fala(this, ganhou ? 'O fiscal guardou o bloquinho.\nPode seguir viagem.' : 'Multa de R$ 20 e meia hora de sermão.\nMas pode seguir viagem.', []);
  this.time.delayedCall(2600, function () { if (eu.dialog) eu.dialog.fecha(); });
  this.saiFiscal();
};

// entrou no vagão com ele atrás: escapou, e isso é vencer
EstacaoScene.prototype.escapouDoFiscal = function () {
  var c = this.chefao;
  if (!c || c.fase !== 'fuga') return;
  c.fase = 'fim';
  this.tFuga.setVisible(false); if (this.gFuga) this.gFuga.clear();
  this.gFiscal.clear();
  Historia.fechaChefao('fiscal', true, 'fuga');
  if (typeof ganhaXp === 'function') ganhaXp(100);
  if (typeof avisaMissao === 'function') avisaMissao('CHEFÃO VENCIDO', 'Você escapou do FISCAL.');
};

EstacaoScene.prototype.saiFiscal = function () {
  var c = this.chefao, f = c.f, eu = this;
  this.tFuga.setVisible(false); if (this.gFuga) this.gFuga.clear();
  this.gFiscal.clear();
  this.tweens.add({ targets: f.sp, alpha: 0, y: f.sp.y + 30, duration: 900, delay: 800,
    onComplete: function () {
      var i = eu.fixos.indexOf(f); if (i >= 0) eu.fixos.splice(i, 1);
      f.sp.destroy();
      eu.gente = eu.juntaGente();
    } });
};

/* ---------- o vulto ----------
   Nos dias 3 e 4 o fiscal está parado no mezanino do Paraíso, do lado de
   dentro das catracas, olhando quem passa. Não faz nada: é pra você
   conhecer a cara dele antes do dia 5 (e ele já entra na METRODEX). */
EstacaoScene.prototype.montaVulto = function () {
  if (this.treino || !this.mez || typeof Historia === 'undefined') return;
  var v = Historia.vultoAqui(GameState.estacaoAtual());
  if (!v) return;
  var a = new Ator(this, (MEZ.x0 + MEZ.x1) / 2 + 96, CATRACA_Y - 38, v.sprite);
  a.sp.setDepth(30); a.fixo = true; a.dir = 'down'; a.anima(0, false);
  this.gente.push(a); this.fixos.push(a);
};

/* ---------- quem te recebe na saída ----------
   A missão fechou na estação de quem mandou: a Sueli ou o Marcão está ali
   do seu lado quando você sai do trem, fala a frase (que muda com atraso
   e com o medidor) e vai embora pela rua. A missão termina num rosto. */
EstacaoScene.prototype.recebeNaSaida = function (r) {
  var sp = this.pl.sp, eu = this;
  /* você entra pela porta da rua (y 500), e a caixa do diálogo cobre o pé
     da tela: a conversa acontece uns passos pra dentro, acima dela */
  if (sp.y > 430 && this.podeIr(sp.x, 430)) sp.y = 430;
  var lado = this.podeIr(sp.x + 34, sp.y) ? 34 : -34;
  var a = new Ator(this, sp.x + lado, sp.y, r.sprite);
  a.sp.setDepth(40); a.fixo = true; a.dir = lado > 0 ? 'left' : 'right'; a.anima(0, false);
  this.pl.dir = lado > 0 ? 'right' : 'left'; this.pl.anima(0, false);
  this.gente.push(a); this.fixos.push(a);
  if (DEX_POR_SPRITE[r.sprite]) marcaDex(DEX_POR_SPRITE[r.sprite], 1);
  fala(this, r.nome + ': ' + r.fala, []);
  this.time.delayedCall(4600, function () {
    if (eu.dialog) eu.dialog.fecha();
    a.dir = 'down';
    eu.tweens.add({ targets: a.sp, y: a.sp.y + 120, alpha: 0, duration: 1600,
      onUpdate: function () { a.anima(16, true); },
      onComplete: function () {
        var i = eu.fixos.indexOf(a); if (i >= 0) eu.fixos.splice(i, 1);
        a.sp.destroy();
        eu.gente = eu.juntaGente();
      } });
  });
};
