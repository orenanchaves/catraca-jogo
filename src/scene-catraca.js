/* global Phaser */
/* Catraca — saguão, bilheteria, bloqueio e o minigame de pular */

var CatracaScene = new Phaser.Class({
  Extends: Phaser.Scene,
  initialize: function CatracaScene() { Phaser.Scene.call(this, { key: 'Catraca' }); },

  create: function () {
    Ctrl.liga(this);
    HUD_VISIVEL = true; CONTROLES_VISIVEIS = true;
    this.dialog = null;
    this.liberado = false;
    this.fim = false;
    this.montaGates();

    if (GameState.char.gratuidade) this.liberado = true;

    this.desenhaCenario();

    this.guarda = new Ator(this, 80, 200, 'np_guardinha');
    this.guarda.sp.setDepth(50);
    this.guarda.fixo = true;          // ninguém empurra o guardinha
    this.gEstado = 'anda';
    this.gTempo = 0;
    this.gVx = 1;
    this.gOlhando = false;

    this.plateia = [];
    var quantos = Math.round(1 + 8 * GameState.lotacao());
    for (var i = 0; i < quantos; i++) {
      var a = new Ator(this, 40 + Math.random() * 240,
        280 + Math.random() * 230, sorteiaPax());
      a.sp.setDepth(40);
      a.vx = (Math.random() < 0.5 ? -1 : 1) * (20 + Math.random() * 28);
      a.t = Math.random() * 2000;
      this.plateia.push(a);
    }
    this.gente = this.plateia.concat([this.guarda]);

    /* quem fica. De madrugada e no vazio eles aparecem mais:
       menos gente passando, mais gente que não vai a lugar nenhum */
    var chance = 0.75 - 0.45 * GameState.lotacao();
    for (var q = 0; q < 2; q++) {
      if (Math.random() > chance) continue;
      var pd = new Ator(this, q ? 286 : 34, 300 + Math.random() * 130,
        PEDINTE_KEYS[Math.floor(Math.random() * PEDINTE_KEYS.length)]);
      pd.sp.setDepth(38); pd.anima(0, false);
      pd.fixo = true;                 // quem está agachado não se mexe
      this.gente.push(pd);
    }

    this.pl = new Ator(this, 160, 500, 'ch_' + GameState.charKey);
    this.pl.sp.setDepth(60);
    this.pl.dir = 'up';

    this.gAviso = this.add.graphics().setDepth(70);
    this.dica = new FaixaDica(this);
    this.alerta = new Plaqueta(this, GW / 2, 146, { cor: PAL.vermelho, filete: 0xe8362c, depth: 82 });

    var f = GameState.faixa();
    var cab = GameState.hora() + ', ' + f.nome.toLowerCase() + '.\n';
    var msg = GameState.char.gratuidade
      ? cab + 'Gratuidade. Você passa, e ninguém discute.'
      : (GameState.valeRestante > 0
        ? cab + 'Vale-transporte: ' + GameState.valeRestante
          + (GameState.valeRestante > 1 ? ' passagens.' : ' passagem.')
        : cab + 'Tarifa R$ '
          + GameState.char.tarifa.toFixed(2).replace('.', ',') + '.');
    fala(this, msg + '\n' + f.frase, []);
    var self = this;
    this.time.delayedCall(2400, function () { if (self.dialog) self.dialog.fecha(); });
  },

  /* ---------- cenário ---------- */
  desenhaCenario: function () {
    var g = this.add.graphics().setDepth(0);
    g.fillStyle(num(PAL.bg), 1).fillRect(0, 0, GW, GH);

    this.azulejo(g, 0, HUD_H, GW, 72);

    var l = GameState.linhaAtual();
    g.fillStyle(num(escurecer(l.cor, 0.5)), 1).fillRect(20, 60, GW - 40, 36);
    g.fillStyle(l.num, 1).fillRect(22, 62, GW - 44, 32);
    g.fillStyle(num(clarear(l.cor, 0.4)), 1).fillRect(22, 62, GW - 44, 2);
    g.fillStyle(0x0a0a12, 1).fillRect(28, 68, GW - 56, 20);
    txtC(this, GW / 2, 71, GameState.estacaoAtual(), PAL.branco, 8).setDepth(1);
    placa(this, GW / 2, 104, '▲ PLATAFORMA', PAL.cinza);

    this.piso(g, 0, 116, GW, 92, 0x4a4a60, 0x565670);
    this.piso(g, 0, 240, GW, 304, 0x3f3f52, 0x494960);
    this.azulejo(g, 0, 544, GW, 32);

    g.fillStyle(0xffffff, 0.05).fillRect(0, 240, GW, 26);
    g.fillStyle(0xffffff, 0.03).fillRect(0, 266, GW, 26);
    pontilhado(g, 0, 240, GW, 304, 0x000000, 0.07, 8);

    g.fillStyle(num(PAL.metalSom), 1).fillRect(0, 208, GW, 32);
    g.fillStyle(num(PAL.metal), 1).fillRect(0, 208, GW, 22);
    g.fillStyle(num(PAL.metalLuz), 1).fillRect(0, 208, GW, 3);
    g.fillStyle(0x000000, 0.35).fillRect(0, 240, GW, 6);

    g.fillStyle(num(PAL.paredeSom), 1).fillRect(8, 176, 88, 64);
    g.fillStyle(num(PAL.parede), 1).fillRect(8, 176, 88, 48);
    g.fillStyle(num(PAL.paredeLuz), 1).fillRect(8, 176, 88, 4);
    g.fillStyle(0x0a0a12, 1).fillRect(20, 196, 64, 26);
    g.fillStyle(0x1c2436, 1).fillRect(22, 198, 60, 22);
    g.fillStyle(num(PAL.amarelo), 1).fillRect(20, 226, 64, 5);
    g.fillStyle(num(PAL.amareloSom), 1).fillRect(20, 231, 64, 2);
    placa(this, 52, 246, 'BILHETES', PAL.amarelo);

    this.gCatracas = this.add.graphics().setDepth(2);
    this.pintaCatracas();

    veuDaHora(this, 65);
  },

  /* ---------- bloqueio ----------
     Cinco portas lado a lado, como em estação de verdade: uma delas é a
     porta larga (bagagem e cadeirante), e quantas ficam abertas depende
     da hora. De madrugada sobra quase nada; no pico abre tudo. */
  montaGates: function () {
    var f = GameState.faixa();
    // o bloqueio começa depois da bilheteria e vai até a parede da direita
    var X0 = 100, X1 = 292, TOTAL = 4, POSTE = 12, VAO = 30, VAO_LARGO = 38;
    var larga = Math.floor(Math.random() * TOTAL);

    var largura = POSTE;
    for (var k = 0; k < TOTAL; k++) largura += (k === larga ? VAO_LARGO : VAO) + POSTE;
    var x = X0 + Math.round(((X1 - X0) - largura) / 2) + POSTE;

    this.gates = [];
    for (var i = 0; i < TOTAL; i++) {
      var vao = (i === larga) ? VAO_LARGO : VAO;
      this.gates.push({ x0: x, x1: x + vao, larga: (i === larga), fechada: false });
      x += vao + POSTE;
    }

    // fora de serviço: a porta larga é a última a fechar
    var abertas = Phaser.Math.Clamp(Math.round(TOTAL * f.catracas), 2, TOTAL);
    var ordem = Phaser.Utils.Array.Shuffle([0, 1, 2, 3]).sort(function (a, b) {
      return (a === larga ? 1 : 0) - (b === larga ? 1 : 0);
    });
    for (var j = 0; j < TOTAL - abertas; j++) this.gates[ordem[j]].fechada = true;
    this.abertas = abertas;
  },

  pintaCatracas: function () {
    var g = this.gCatracas; g.clear();
    for (var i = 0; i < this.gates.length; i++) {
      var t = this.gates[i];
      var w = t.x1 - t.x0;
      var passa = this.liberado && !t.fechada;
      var postes = [t.x0 - 14, t.x1];
      for (var p = 0; p < 2; p++) {
        var px = postes[p];
        g.fillStyle(num(PAL.metalSom), 1).fillRect(px, 198, 14, 48);
        g.fillStyle(num(PAL.metal), 1).fillRect(px, 198, 10, 48);
        g.fillStyle(num(PAL.metalLuz), 1).fillRect(px + 2, 198, 3, 48);
        // lâmpada do painel: verde passa, vermelho barra, apagado fora de serviço
        g.fillStyle(t.fechada ? 0x4f5468 : (passa ? 0x00e676 : 0xe8362c), 1);
        g.fillRect(px + 2, 204, 7, 6);
        g.fillStyle(0xffffff, 0.5).fillRect(px + 2, 204, 7, 2);
      }

      if (t.fechada) {
        // corrente e placa de fora de serviço
        g.fillStyle(num(PAL.metalSom), 1).fillRect(t.x0, 214, w, 16);
        g.fillStyle(0x2a2a3a, 1).fillRect(t.x0, 216, w, 12);
        g.fillStyle(num(PAL.amareloSom), 1);
        for (var d = 0; d < w; d += 8) g.fillRect(t.x0 + d, 216, 4, 12);
        g.fillStyle(0x000000, 0.45).fillRect(t.x0, 230, w, 4);
        continue;
      }

      if (t.larga) {
        // faixa azul no chão marcando a porta larga
        g.fillStyle(0x1c4a8a, 0.5).fillRect(t.x0, 240, w, 5);
        g.fillStyle(0x3a7fd0, 0.6).fillRect(t.x0 + w / 2 - 5, 241, 10, 3);
      }

      if (!this.liberado) {
        g.fillStyle(num(PAL.metalSom), 1).fillRect(t.x0, 218, w, 8);
        g.fillStyle(num(PAL.metal), 1).fillRect(t.x0, 218, w, 5);
        g.fillStyle(num(PAL.metalLuz), 1).fillRect(t.x0, 218, w, 2);
      } else {
        g.fillStyle(0x00e676, 0.22).fillRect(t.x0, 208, w, 32);
        g.fillStyle(0x00e676, 0.5).fillRect(t.x0, 236, w, 2);
      }
    }
  },

  azulejo: function (g, x, y, w, h) {
    g.fillStyle(num(PAL.parede), 1).fillRect(x, y, w, h);
    for (var yy = y; yy < y + h; yy += 16) {
      var off = ((yy - y) / 16) % 2 ? 0 : 16;
      for (var xx = x - 32; xx < x + w; xx += 32) {
        g.fillStyle(num(PAL.paredeLuz), 1).fillRect(xx + off + 2, yy + 2, 28, 3);
        g.fillStyle(num(PAL.parede), 1).fillRect(xx + off + 2, yy + 5, 28, 8);
        g.fillStyle(num(PAL.paredeSom), 1).fillRect(xx + off + 2, yy + 13, 28, 2);
      }
    }
    g.fillStyle(0x000000, 0.3).fillRect(x, y + h - 6, w, 6);
  },

  piso: function (g, x, y, w, h, c1, c2) {
    g.fillStyle(num(PAL.rejunte), 1).fillRect(x, y, w, h);
    for (var yy = y; yy < y + h; yy += 16) {
      for (var xx = x; xx < x + w; xx += 16) {
        var c = ((xx / 16 + yy / 16) % 2) ? c1 : c2;
        g.fillStyle(c, 1).fillRect(xx + 1, yy + 1, 14, 14);
        g.fillStyle(0xffffff, 0.07).fillRect(xx + 1, yy + 1, 14, 2);
        g.fillStyle(0x000000, 0.16).fillRect(xx + 1, yy + 13, 14, 2);
      }
    }
  },

  /* ---------- áreas caminháveis ---------- */
  podeIr: function (x, y) {
    if (x < 28 || x > 292) return false;
    if (y >= 244 && y <= 536) return true;
    if (y >= 116 && y <= 204) return true;
    if (y > 204 && y < 244) {
      if (!this.liberado) return false;
      for (var i = 0; i < this.gates.length; i++) {
        var t = this.gates[i];
        if (t.fechada) continue;
        if (x > t.x0 + 2 && x < t.x1 - 2) return true;
      }
      return false;
    }
    return false;
  },

  /* a porta que está debaixo do jogador; a larga tem alcance maior */
  gateSob: function (x) {
    var melhor = null, dist = 1e9;
    for (var i = 0; i < this.gates.length; i++) {
      var t = this.gates[i];
      if (x < t.x0 - 7 || x > t.x1 + 7) continue;
      var d = Math.abs(x - (t.x0 + t.x1) / 2);
      if (d < dist) { dist = d; melhor = t; }
    }
    return melhor;
  },

  /* ---------- guardinha ---------- */
  atualizaGuarda: function (dt) {
    var dif = GameState.dificuldade();
    var vig = GameState.faixa().guarda;   // no pico ele tem mais o que fazer
    this.gTempo += dt;
    var g = this.guarda;

    if (this.gEstado === 'anda') {
      var v = (52 + dif * 16) * this.gVx * (dt / 1000);
      var nx = g.sp.x + v;
      if (nx < 56) { nx = 56; this.gVx = 1; }
      if (nx > 264) { nx = 264; this.gVx = -1; }
      g.sp.x = nx;
      g.dir = this.gVx < 0 ? 'left' : 'right';
      g.anima(dt, true);
      this.gOlhando = false;
      var limite = Math.max(700, (2200 - dif * 260) / vig);
      if (this.gTempo > limite) {
        this.gEstado = 'olha'; this.gTempo = 0;
        if (Math.random() < 0.5) this.gVx *= -1;
      }
    } else {
      g.dir = 'down';
      g.anima(dt, false);
      this.gOlhando = true;
      var dur = Math.max(500, (1300 - dif * 90) * vig);
      if (this.gTempo > dur) { this.gEstado = 'anda'; this.gTempo = 0; }
    }

    if (this.gEstado === 'anda' && Math.random() < 0.0006 * dif * vig * dt) {
      this.gEstado = 'olha'; this.gTempo = 0;
    }

    var av = this.gAviso; av.clear();
    if (this.gOlhando) {
      av.fillStyle(0xe8362c, 0.13);
      av.fillTriangle(g.sp.x, g.sp.y - 16, g.sp.x - 68, g.sp.y + 92, g.sp.x + 68, g.sp.y + 92);
      av.fillStyle(0xe8362c, 0.09);
      av.fillTriangle(g.sp.x, g.sp.y - 16, g.sp.x - 44, g.sp.y + 92, g.sp.x + 44, g.sp.y + 92);
      this.alerta.setText('! OLHANDO !');
    } else {
      this.alerta.setText('');
    }
  },

  /* a porta larga é a que todo mundo pula: dá pra passar mais perto dele.
     Com a estação cheia, ainda tem gente na frente pra te esconder. */
  seguroPraPular: function (x, gate) {
    if (this.gOlhando) return false;
    var margem = (gate && gate.larga) ? 36 : 56;
    margem -= 10 * GameState.lotacao();
    return Math.abs(this.guarda.sp.x - x) > margem;
  },

  /* ---------- ações ---------- */
  abreMenuBilheteria: function () {
    var self = this, c = GameState.char;
    var ops = [];
    if (GameState.valeRestante > 0) {
      ops.push({
        label: 'Usar vale-transporte', cb: function () {
          GameState.valeRestante--;
          self.libera('Passou no vale.\nSobra ' + GameState.valeRestante + '.');
        }
      });
    }
    ops.push({
      label: 'Pagar R$ ' + c.tarifa.toFixed(2).replace('.', ','), cb: function () {
        if (GameState.dinheiro < c.tarifa) {
          sfx('erro');
          fala(self, 'Não dá. Você não tem o valor\nda passagem. Ou pula, ou fica.', []);
          return;
        }
        GameState.gastar(c.tarifa);
        GameState.stats.catracasPagas++;
        GameState.passaTempo(3 + Math.round(4 * GameState.lotacao()));
        self.libera('Bilhete na mão.\nCaro, mas legal.');
      }
    });
    ops.push({ label: 'Deixa pra lá', cb: function () { } });
    fala(this, 'Bilheteria. Quanto custa hoje\njá não importa.', ops);
  },

  libera: function (msg) {
    this.liberado = true;
    this.pintaCatracas();
    sfx('catraca');
    fala(this, msg, []);
    var self = this;
    this.time.delayedCall(1400, function () { if (self.dialog) self.dialog.fecha(); });
  },

  tentaPular: function (gate) {
    var seguro = this.seguroPraPular(this.pl.sp.x, gate);
    GameState.addDescanso(gate && gate.larga ? -4 : -6);
    GameState.passaTempo(2);
    if (seguro) {
      GameState.stats.catracasPuladas++;
      sfx('ok');
      this.libera('Passou.\nO coração bateu, mas passou.');
      return;
    }
    sfx('apito');
    this.cameras.main.shake(220, 0.006);
    var self = this;
    if (GameState.carisma >= 55) {
      GameState.addCarisma(-8);
      this.libera('O guardinha te reconheceu.\n"Da próxima eu não deixo, hein."');
      return;
    }
    if (GameState.dinheiro >= 25) {
      GameState.gastar(25);
      GameState.addCarisma(-6);
      this.libera('Multa de R$ 25,00.\nSaiu mais caro que a passagem.');
      return;
    }
    GameState.motivoFim = 'Sem passagem, sem troco,\nsem argumento.';
    this.fim = true;
    fala(this, 'Flagrado e sem dinheiro pra multa.\nVocê foi retirado da estação.', [
      { label: 'Ver o resultado', cb: function () { self.terminaJogo(); } }
    ]);
  },

  /* ninguém atravessa ninguém. O empurrão não pode jogar o jogador
     pra dentro da parede nem a plateia pra cima do bloqueio. */
  resolveCorpos: function () {
    var antes = { x: this.pl.sp.x, y: this.pl.sp.y };
    var self = this;
    resolveCorpos(this.pl, this.gente,
      function (sp) {
        if (!self.podeIr(sp.x, sp.y)) { sp.x = antes.x; sp.y = antes.y; }
      },
      function (sp) {
        sp.x = Phaser.Math.Clamp(sp.x, 34, 288);
        sp.y = Phaser.Math.Clamp(sp.y, 258, 534);
      });
  },

  terminaJogo: function () {
    GameState.salvarRecorde();
    this.scene.start('Fim');
  },

  /* ---------- loop ---------- */
  update: function (time, delta) {
    Ctrl.update();
    var dt = Math.min(delta, 50);

    if (this.dialog && this.dialog.ativo) { this.dialog.update(dt); return; }
    if (this.fim) return;

    /* A catraca é a primeira cena de cada perna, e é aqui que chega quem
       acabou de ser mandado embora ou de dormir no ponto. Sem esta
       checagem dava pra jogar uma cena inteira já demitido. */
    var morte = GameState.derrota();
    if (morte) { GameState.motivoFim = morte; this.fim = true; GameState.salvarRecorde(); this.scene.start('Fim'); return; }

    this.atualizaGuarda(dt);

    for (var i = 0; i < this.plateia.length; i++) {
      var a = this.plateia[i];
      a.t += dt;
      if (a.t > 2400) { a.t = 0; a.vx = -a.vx; }
      var nx = a.sp.x + a.vx * dt / 1000;
      if (nx < 40 || nx > 280) { a.vx = -a.vx; nx = a.sp.x; }
      a.sp.x = nx;
      a.dir = a.vx < 0 ? 'left' : 'right';
      a.anima(dt, true);
    }

    var vel = GameState.char.velocidade * (0.6 + 0.4 * (GameState.descanso / GameState.char.descansoMax));
    var dx = (Ctrl.right ? 1 : 0) - (Ctrl.left ? 1 : 0);
    var dy = (Ctrl.down ? 1 : 0) - (Ctrl.up ? 1 : 0);
    var mv = (dx !== 0 || dy !== 0);
    if (mv) {
      var n = Math.sqrt(dx * dx + dy * dy);
      var px = this.pl.sp.x + (dx / n) * vel * dt / 1000;
      var py = this.pl.sp.y + (dy / n) * vel * dt / 1000;
      if (this.podeIr(px, this.pl.sp.y)) this.pl.sp.x = px;
      if (this.podeIr(this.pl.sp.x, py)) this.pl.sp.y = py;
      this.pl.setDir(dx, dy);
    }
    this.pl.anima(dt, mv);
    this.resolveCorpos();

    if (this.pl.sp.y <= 124) {
      GameState.dentroDoSistema = true;
      this.scene.start('Plataforma');
      return;
    }

    var x = this.pl.sp.x, y = this.pl.sp.y, dica = '';
    var naBilheteria = (x < 96 && y > 244 && y < 288 && !this.liberado);
    var gate = this.gateSob(x);
    var perto = (gate && y > 244 && y < 284);
    var naCatraca = (perto && !this.liberado && !gate.fechada);
    var seguro = naCatraca && this.seguroPraPular(x, gate);

    if (naBilheteria) dica = nomeAgir() + ': comprar passagem';
    else if (perto && gate.fechada) dica = 'catraca fora de serviço';
    else if (naCatraca) {
      dica = seguro
        ? nomeAgir() + (gate.larga ? ': PULAR A LARGA' : ': PULAR AGORA')
        : 'ele tá olhando pra cá';
    } else if (this.liberado) dica = 'suba para a plataforma';
    this.dica.setText(dica, seguro ? PAL.verde : (perto && gate.fechada ? PAL.cinza : PAL.amarelo));

    if (Ctrl.actJust) {
      if (naBilheteria) this.abreMenuBilheteria();
      else if (naCatraca) this.tentaPular(gate);
    }
  }
});
