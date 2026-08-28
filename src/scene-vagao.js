/* global Phaser */
/* Catraca — dentro do vagão: banco, equilíbrio, eventos e o dilema do lugar */

var VagaoScene = new Phaser.Class({
  Extends: Phaser.Scene,
  initialize: function VagaoScene() { Phaser.Scene.call(this, { key: 'Vagao' }); },

  create: function () {
    Ctrl.liga(this);
    HUD_VISIVEL = true; CONTROLES_VISIVEIS = true;
    this.dialog = null;
    this.estado = 'andando';
    this.t = 0;
    this.duracao = 17000;
    this.eventoFeito = false;
    this.dilemaFeito = false;
    this.sentadoEm = null;
    this.disfarce = null;
    this.solavanco = { fase: 'off', t: 0, proximo: 2600 };
    this.portas = [140, 300, 460];
    this.npcExtra = [];

    this.desenhaCenario();
    this.montaBancos();
    veuDaHora(this, 90);
    this.tarja = new FaixaHora(this, 510);

    this.pl = new Ator(this, 160, 500, 'ch_' + GameState.charKey);
    this.pl.sp.setDepth(60);
    this.pl.dir = 'up';

    this.gUI = this.add.graphics().setDepth(500);
    this.dica = new FaixaDica(this, 520);
    this.centro = new Plaqueta(this, GW / 2, 232, { cor: PAL.branco, depth: 522 });
    this.tSeta = txtC(this, GW / 2, 280, '', PAL.amarelo, 24).setDepth(520);

    var self = this;
    fala(this, GameState.hora() + '. Próxima:\n' + GameState.proximaEstacaoNome(), []);
    this.time.delayedCall(1300, function () { if (self.dialog) self.dialog.fecha(); });
  },

  /* ---------- cenário ---------- */
  desenhaCenario: function () {
    var g = this.add.graphics().setDepth(0);
    var l = GameState.linhaAtual();
    g.fillStyle(num(PAL.bg), 1).fillRect(0, 0, GW, GH);

    // piso de borracha canelada
    g.fillStyle(0x30303e, 1).fillRect(28, HUD_H, 264, GH - HUD_H);
    g.fillStyle(0x373747, 1);
    for (var y = HUD_H; y < GH; y += 8) g.fillRect(72, y, 176, 4);
    pontilhado(g, 72, HUD_H, 176, GH, 0x000000, 0.1, 6);

    // paredes laterais com volume
    g.fillStyle(num(PAL.metalSom), 1).fillRect(0, HUD_H, 28, GH - HUD_H);
    g.fillStyle(0x646a80, 1).fillRect(4, HUD_H, 24, GH - HUD_H);
    g.fillStyle(num(PAL.metalSom), 1).fillRect(292, HUD_H, 28, GH - HUD_H);
    g.fillStyle(0x646a80, 1).fillRect(292, HUD_H, 24, GH - HUD_H);
    g.fillStyle(l.num, 1).fillRect(0, HUD_H, 5, GH - HUD_H);
    g.fillStyle(l.num, 1).fillRect(315, HUD_H, 5, GH - HUD_H);

    // janelas da parede esquerda, com o túnel passando
    for (var wy = 80; wy < GH - 60; wy += 92) {
      g.fillStyle(0x0d1119, 1).fillRect(4, wy, 22, 60);
      g.fillStyle(0x161d2b, 1).fillRect(6, wy + 2, 18, 56);
      g.fillStyle(0xffffff, 0.07).fillRect(6, wy + 2, 18, 14);
    }

    // bancos estofados dos dois lados
    for (var s = 0; s < 2; s++) {
      var bx = s ? 248 : 28;
      g.fillStyle(0x1e2740, 1).fillRect(bx, HUD_H, 44, GH - HUD_H);
      for (var by = HUD_H + 8; by < GH - 16; by += 72) {
        g.fillStyle(0x2a3550, 1).fillRect(bx + 2, by, 40, 62);
        g.fillStyle(0x3b4a70, 1).fillRect(bx + 2, by, 40, 6);
        g.fillStyle(0x141a2c, 1).fillRect(bx + 2, by + 58, 40, 4);
        // textura do estofado
        g.fillStyle(0x46578a, 0.35);
        for (var d = 0; d < 3; d++) g.fillRect(bx + 8 + d * 12, by + 12, 4, 40);
      }
    }

    this.gPortas = this.add.graphics().setDepth(2);
    this.pintaPortas(false);

    // barras de apoio do corredor
    for (var i = 0; i < 2; i++) {
      var px = i ? 226 : 90;
      g.fillStyle(num(PAL.metalSom), 1).fillRect(px, HUD_H, 8, GH - HUD_H);
      g.fillStyle(num(PAL.metal), 1).fillRect(px, HUD_H, 5, GH - HUD_H);
      g.fillStyle(num(PAL.metalLuz), 1).fillRect(px + 1, HUD_H, 2, GH - HUD_H);
      // alças penduradas
      g.fillStyle(num(PAL.metalSom), 1);
      for (var ay = 96; ay < GH - 40; ay += 64) {
        g.fillRect(px + (i ? -12 : 8), ay, 12, 3);
        g.fillRect(px + (i ? -12 : 18), ay, 3, 14);
      }
    }
  },

  pintaPortas: function (aberto) {
    var g = this.gPortas; g.clear();
    for (var i = 0; i < this.portas.length; i++) {
      var y = this.portas[i];
      if (aberto) {
        g.fillStyle(0x07070c, 1).fillRect(292, y, 28, 60);
        g.fillStyle(0x3f3f52, 1).fillRect(296, y + 4, 20, 52);
        g.fillStyle(0x00e676, 1).fillRect(288, y, 4, 60);
        g.fillStyle(0x00e676, 0.22).fillRect(258, y, 34, 60);
      } else {
        g.fillStyle(num(PAL.metalSom), 1).fillRect(292, y, 28, 60);
        g.fillStyle(0x767c92, 1).fillRect(292, y + 2, 26, 56);
        g.fillStyle(num(PAL.metalLuz), 1).fillRect(292, y + 2, 26, 2);
        g.fillStyle(num(PAL.metalSom), 1).fillRect(292, y + 28, 28, 3);
        g.fillStyle(num(PAL.amarelo), 1).fillRect(288, y, 3, 60);
      }
    }
  },

  /* ---------- bancos ---------- */
  montaBancos: function () {
    var dif = GameState.dificuldade();
    this.bancos = [
      { x: 50, y: 136, npc: null }, { x: 50, y: 208, npc: null },
      { x: 50, y: 280, npc: null }, { x: 50, y: 352, npc: null },
      { x: 270, y: 220, npc: null }, { x: 270, y: 380, npc: null }
    ];
    // de madrugada o vagão está vazio e sentar é fácil; no pico, esquece
    var lot = GameState.lotacao();
    var livres = Phaser.Math.Clamp(Math.round(6 - 5.2 * lot - (dif - 1) * 0.6), 0, 5);
    var idx = Phaser.Utils.Array.Shuffle([0, 1, 2, 3, 4, 5]);
    for (var i = 0; i < idx.length - livres; i++) {
      var b = this.bancos[idx[i]];
      var a = new Ator(this, b.x, b.y + 24, sorteiaPax());
      a.dir = b.x < 160 ? 'right' : 'left';
      a.anima(0, false);
      a.sp.setDepth(30);
      b.npc = a;
    }
    var emPe = Phaser.Math.Clamp(Math.round(8 * lot), 0, 8);
    for (var j = 0; j < emPe; j++) {
      var p = new Ator(this, 116 + Math.random() * 88,
        120 + Math.random() * 400, sorteiaPax());
      p.dir = Math.random() < 0.5 ? 'left' : 'right';
      p.anima(0, false); p.sp.setDepth(35);
      this.npcExtra.push(p);
    }
  },

  bancoLivrePerto: function () {
    for (var i = 0; i < this.bancos.length; i++) {
      var b = this.bancos[i];
      if (b.npc) continue;
      if (Math.abs(this.pl.sp.x - b.x) < 54 && Math.abs(this.pl.sp.y - (b.y + 24)) < 42) return b;
    }
    return null;
  },

  senta: function (b) {
    this.sentadoEm = b;
    b.npc = 'player';
    this.pl.pos(b.x, b.y + 24);
    this.pl.dir = b.x < 160 ? 'right' : 'left';
    this.pl.anima(0, false);
    GameState.sentado = true;
    sfx('ok');
  },

  levanta: function () {
    if (!this.sentadoEm) return;
    this.sentadoEm.npc = null;
    this.pl.pos(this.sentadoEm.x < 160 ? 116 : 204, this.sentadoEm.y + 24);
    this.sentadoEm = null;
    GameState.sentado = false;
  },

  /* ---------- solavanco / segurar na barra ---------- */
  atualizaSolavanco: function (dt) {
    if (this.sentadoEm || this.estado !== 'andando') { this.solavanco.fase = 'off'; return; }
    var s = this.solavanco, dif = GameState.dificuldade();
    s.t += dt;
    if (s.fase === 'off') {
      if (s.t > s.proximo) {
        s.fase = 'aviso'; s.t = 0;
        s.dur = Math.max(500, 1100 - dif * 70);
        sfx('empurra');
      }
    } else if (s.fase === 'aviso') {
      this.cameras.main.shake(60, 0.0015);
      if (s.t > s.dur) {
        s.fase = 'off'; s.t = 0;
        s.proximo = 2200 + Math.random() * 2600 - dif * 200;
        if (Ctrl.act) {
          sfx('catraca');
        } else {
          GameState.addCarisma(-3);
          GameState.addDescanso(-3);
          this.cameras.main.shake(320, 0.008);
          sfx('nao');
          this.flash('VOCÊ TROMBOU EM ALGUÉM');
        }
      }
    }
  },

  flash: function (msg) {
    this.centro.setText(msg);
    var self = this;
    this.time.delayedCall(900, function () { if (self.centro) self.centro.setText(''); });
  },

  /* ---------- eventos de vagão ---------- */
  sorteiaEvento: function () {
    var self = this;
    var baralho = [
      function () {
        fala(self, '"Olha o chocolate, dois real,\ndois real o chocolate."', [
          {
            label: 'Comprar (R$ 2,00)', cb: function () {
              if (GameState.dinheiro < 2) { sfx('nao'); self.flash('Sem troco.'); return; }
              GameState.gastar(2); GameState.addCarisma(4); GameState.addDescanso(2);
              GameState.stats.causos++; sfx('moeda'); self.flash('O chocolate salva.');
            }
          },
          { label: 'Fazer que não ouviu', cb: function () { GameState.addCarisma(-2); GameState.stats.causos++; } }
        ]);
      },
      function () {
        fala(self, 'O rimador começa.\n"Senhoras e senhores, licença..."', [
          {
            label: 'Dar uma moeda (R$ 1,00)', cb: function () {
              if (GameState.dinheiro < 1) { sfx('nao'); self.flash('Nem moeda você tem.'); return; }
              GameState.gastar(1); GameState.addCarisma(6); GameState.stats.causos++;
              sfx('moeda'); self.flash('Ele te citou na rima.');
            }
          },
          {
            label: 'Fingir que dorme', cb: function () {
              GameState.addCarisma(-4); GameState.stats.causos++;
              self.flash('Ele rimou com a sua cara.');
            }
          }
        ]);
      },
      function () {
        fala(self, 'Alguém pede ajuda no corredor.', [
          {
            label: 'Ajudar (R$ 2,00)', cb: function () {
              if (GameState.dinheiro < 2) { sfx('nao'); self.flash('Você não tem.'); return; }
              GameState.gastar(2); GameState.addCarisma(7); GameState.stats.causos++; sfx('moeda');
            }
          },
          { label: 'Olhar o celular', cb: function () { GameState.addCarisma(-5); GameState.stats.causos++; } }
        ]);
      },
      function () {
        fala(self, 'O guardinha entra no vagão e passa\ndevagar olhando todo mundo.', [
          {
            label: 'Ficar quieto', cb: function () {
              if (GameState.charKey === 'ambulante' && Math.random() < 0.4) {
                GameState.gastar(10); GameState.addCarisma(-5);
                self.flash('Te viu vendendo. R$ 10 de multa.');
              } else { self.flash('Passou reto.'); }
              GameState.stats.causos++;
            }
          }
        ]);
      },
      function () {
        fala(self, 'O ar-condicionado do vagão\nparou de funcionar.', [
          {
            label: 'Aguentar', cb: function () {
              GameState.addDescanso(-5); GameState.stats.causos++;
              self.flash('Calor de rachar.');
            }
          }
        ]);
      }
    ];
    baralho[Math.floor(Math.random() * baralho.length)]();
  },

  /* ---------- o dilema do lugar ---------- */
  dilemaDoLugar: function () {
    var self = this;
    this.dilemaFeito = true;
    var quem = ['um senhor de bengala', 'uma gestante', 'uma mãe com bebê no colo'][Math.floor(Math.random() * 3)];

    if (GameState.charKey === 'senhor' && !this.sentadoEm) {
      fala(this, 'Uma moça levanta e oferece\no lugar para você.', [
        {
          label: 'Aceitar', cb: function () {
            var b = null;
            for (var i = 0; i < self.bancos.length; i++) if (!self.bancos[i].npc) { b = self.bancos[i]; break; }
            if (!b) { b = self.bancos[0]; if (b.npc && b.npc !== 'player') b.npc.destroy(); b.npc = null; }
            self.senta(b);
            GameState.addDescanso(16); GameState.addCarisma(-3);
            self.flash('"Obrigado, viu, filha."');
          }
        },
        {
          label: 'Recusar, tô bem', cb: function () {
            GameState.addCarisma(8); GameState.addDescanso(-6);
            self.flash('Orgulho custa caro.');
          }
        }
      ], { tempo: 6, aoExpirar: function () { GameState.addCarisma(-2); } });
      return;
    }

    if (!this.sentadoEm) return;

    this.idoso = new Ator(this, this.sentadoEm.x < 160 ? 112 : 208, this.sentadoEm.y + 24, 'np_idoso');
    this.idoso.dir = this.sentadoEm.x < 160 ? 'left' : 'right';
    this.idoso.anima(0, false);
    this.idoso.sp.setDepth(55);
    sfx('porta');

    fala(this, 'Entra ' + quem + '\ne para bem na sua frente.', [
      {
        label: 'Dar o lugar', cb: function () {
          GameState.addCarisma(9); GameState.addDescanso(-9);
          GameState.stats.cedidos++; GameState.stats.causos++;
          self.levanta(); sfx('ok');
          self.flash('O vagão inteiro viu.');
        }
      },
      { label: 'Disfarçar', cb: function () { self.comecaDisfarce(); } },
      {
        label: 'Não dar', cb: function () {
          GameState.addCarisma(-9); GameState.addDescanso(5);
          GameState.stats.recusas++; GameState.stats.causos++;
          sfx('nao');
          self.flash('Todo mundo te encarou.');
        }
      }
    ], {
      tempo: 6,
      cor: 0xe8a33c,
      aoExpirar: function () {
        GameState.addCarisma(-6); GameState.stats.recusas++;
        self.flash('Você travou. Isso conta como não.');
      }
    });
  },

  /* ---------- minigame do disfarce ---------- */
  comecaDisfarce: function () {
    GameState.stats.disfarces++;
    this.disfarce = { suspeita: 30, t: 0, dur: 8000, olhar: null, olharT: 0, proxOlhar: 900 };
    this.centro.setText('DISFARCE: OLHANDO O CELULAR');
  },

  atualizaDisfarce: function (dt) {
    var d = this.disfarce, dif = GameState.dificuldade();
    d.t += dt;
    d.suspeita += (5.5 + dif * 1.6) * dt / 1000;

    if (d.olhar) {
      d.olharT += dt;
      var acertou = false, errou = false;
      if (Ctrl.up || Ctrl.down || Ctrl.left || Ctrl.right) {
        var p = Ctrl.up ? 'up' : (Ctrl.down ? 'down' : (Ctrl.left ? 'left' : 'right'));
        if (p === d.olhar) acertou = true; else errou = true;
      }
      if (acertou) { d.suspeita -= 16; d.olhar = null; d.proxOlhar = 700 + Math.random() * 900; d.olharT = 0; sfx('catraca'); }
      else if (errou || d.olharT > Math.max(450, 950 - dif * 60)) {
        d.suspeita += 22; d.olhar = null; d.proxOlhar = 800 + Math.random() * 900; d.olharT = 0; sfx('nao');
      }
    } else {
      d.olharT += dt;
      if (d.olharT > d.proxOlhar) {
        var dirs = ['up', 'down', 'left', 'right'];
        d.olhar = dirs[Math.floor(Math.random() * 4)];
        d.olharT = 0;
      }
    }

    this.tSeta.setText(d.olhar ? ({ up: '▲', down: '▼', left: '◄', right: '►' })[d.olhar] : '');

    if (d.suspeita >= 100) {
      this.tSeta.setText(''); this.centro.setText('');
      this.disfarce = null;
      GameState.addCarisma(-14);
      this.levanta();
      sfx('erro');
      fala(this, '"Moço, o senhor não vai\nlevantar não?"', []);
      var self = this;
      this.time.delayedCall(1800, function () { if (self.dialog) self.dialog.fecha(); });
      return;
    }
    if (d.t >= d.dur) {
      this.tSeta.setText(''); this.centro.setText('');
      this.disfarce = null;
      GameState.addCarisma(-4);
      GameState.stats.disfarcesOk++;
      if (this.idoso) { this.idoso.destroy(); this.idoso = null; }
      sfx('ok');
      this.flash('Ele desceu. Você segue sentado.');
    }
  },

  /* ---------- chegada ---------- */
  chega: function () {
    this.estado = 'parado';
    this.t = 0;
    this.pintaPortas(true);
    sfx('porta');
    if (this.idoso) { this.idoso.destroy(); this.idoso = null; }
    if (this.sentadoEm) this.levanta();
    if (GameState.virouFaixa()) {
      var f = GameState.faixa();
      this.flash(GameState.hora() + ' ' + f.nome);
    } else {
      this.flash('CHEGOU: ' + GameState.proximaEstacaoNome());
    }
  },

  desce: function () {
    var r = GameState.avancar();
    GameState.sentado = false;
    var viraDia = GameState.trechosNoDia >= 6;
    if (viraDia) GameState.viraDia();
    this.scene.start(viraDia ? 'Catraca' : (r === 'baldeacao' ? 'Catraca' : 'Plataforma'));
  },

  fimDeJogo: function () {
    GameState.salvarRecorde();
    this.scene.start('Fim');
  },

  /* ---------- loop ---------- */
  update: function (time, delta) {
    Ctrl.update();
    var dt = Math.min(delta, 50);

    if (this.dialog && this.dialog.ativo) { this.dialog.update(dt); return; }
    if (this.disfarce) { this.atualizaDisfarce(dt); this.pintaUI(); return; }

    this.t += dt;

    if (this.sentadoEm) GameState.addDescanso(0.0018 * dt);
    else GameState.addDescanso(-0.00082 * GameState.char.dreno * dt);

    var morte = GameState.derrota();
    if (morte) { GameState.motivoFim = morte; this.fimDeJogo(); return; }

    if (this.estado === 'andando') {
      this.atualizaSolavanco(dt);
      if (!this.eventoFeito && this.t > 3800) { this.eventoFeito = true; this.sorteiaEvento(); this.pintaUI(); return; }
      if (!this.dilemaFeito && this.t > 9000) { this.dilemaDoLugar(); this.pintaUI(); return; }
      if (this.t > this.duracao) this.chega();
    } else if (this.estado === 'parado') {
      if (this.t > 6500) {
        this.estado = 'andando'; this.t = 0;
        this.eventoFeito = false; this.dilemaFeito = false;
        this.pintaPortas(false);
        GameState.addDescanso(-6);
        sfx('nao');
        this.flash('PASSOU DA ESTAÇÃO');
      }
    }

    if (!this.sentadoEm) {
      var vel = GameState.char.velocidade * (0.55 + 0.45 * (GameState.descanso / GameState.char.descansoMax));
      if (Ctrl.act) vel *= 0.35;
      var dx = (Ctrl.right ? 1 : 0) - (Ctrl.left ? 1 : 0);
      var dy = (Ctrl.down ? 1 : 0) - (Ctrl.up ? 1 : 0);
      var mv = (dx !== 0 || dy !== 0);
      if (mv) {
        var n = Math.sqrt(dx * dx + dy * dy);
        this.pl.sp.x = Phaser.Math.Clamp(this.pl.sp.x + (dx / n) * vel * dt / 1000, 84, 236);
        this.pl.sp.y = Phaser.Math.Clamp(this.pl.sp.y + (dy / n) * vel * dt / 1000, 84, 556);
        this.pl.setDir(dx, dy);
      }
      this.pl.anima(dt, mv);
    }

    this.pintaUI();
    this.contexto();
  },

  contexto: function () {
    var dica = '';
    if (this.estado === 'parado') {
      var perto = false;
      for (var i = 0; i < this.portas.length; i++) {
        if (this.pl.sp.x > 200 && Math.abs(this.pl.sp.y - (this.portas[i] + 30)) < 42) perto = true;
      }
      dica = perto ? nomeAgir() + ': descer' : 'vá até uma porta ►';
      if (perto && Ctrl.actJust) { this.desce(); return; }
    } else if (this.sentadoEm) {
      // no celular não existe tecla X: agir de novo levanta
      dica = nomeAgir() + ' pra levantar';
      if (Ctrl.backJust || Ctrl.actJust) this.levanta();
    } else {
      var b = this.bancoLivrePerto();
      if (b) {
        dica = nomeAgir() + ': sentar';
        if (Ctrl.actJust) this.senta(b);
      } else {
        dica = 'SEGURE PRA NÃO CAIR';
      }
    }
    this.dica.setText(dica);
  },

  pintaUI: function () {
    var g = this.gUI; g.clear();

    if (this.estado === 'andando') {
      barra(g, 8, HUD_H + 25, GW - 16, 8, this.t / this.duracao, GameState.linhaAtual().num, 0x15151f);
    }

    if (this.solavanco.fase === 'aviso') {
      var p = 1 - (this.solavanco.t / this.solavanco.dur);
      caixa(g, 68, 192, 184, 60, 0xe8362c);
      barra(g, 80, 232, 160, 10, p, 0xe8362c, 0x1e1e2a);
      this.centro.setY(200).setCor(Ctrl.act ? PAL.verde : PAL.vermelho);
      this.centro.setText(Ctrl.act ? 'SEGURANDO' : 'SEGURE!');
    } else if (this.centro.texto() === 'SEGURE!' || this.centro.texto() === 'SEGURANDO') {
      this.centro.setText('');
      this.centro.setCor(PAL.branco).setY(232);
    }

    if (this.disfarce) {
      caixa(g, 40, 192, 240, 92, 0xe8a33c);
      barra(g, 52, 256, 216, 14, this.disfarce.suspeita / 100, 0xe8362c, 0x1e1e2a);
    }
  }
});
