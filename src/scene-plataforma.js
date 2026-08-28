/* global Phaser */
/* Catraca — plataforma, chegada do trem e o minigame de entrar no vagão lotado */

/* a plataforma inteira, sem cair no trilho nem entrar na parede */
function limitaPlataforma(sp) {
  sp.x = Phaser.Math.Clamp(sp.x, 136, 288);
  sp.y = Phaser.Math.Clamp(sp.y, 80, 560);
}

var PlataformaScene = new Phaser.Class({
  Extends: Phaser.Scene,
  initialize: function PlataformaScene() { Phaser.Scene.call(this, { key: 'Plataforma' }); },

  create: function () {
    Ctrl.liga(this);
    HUD_VISIVEL = true; CONTROLES_VISIVEIS = true;
    this.dialog = null;
    // cinco portas ao longo do trem: sempre tem uma perto de onde você está
    this.portas = [76, 194, 312, 430, 548];
    this.estado = 'espera';
    this.t = 0;
    this.perdido = false;
    this.tremAlt = GH + 80;
    this.tremY = -this.tremAlt;
    this.empurrando = false;
    this.pressao = 0;

    this.desenhaCenario();

    this.gTrem = this.add.graphics().setDepth(20);
    this.plateia = [];
    var quantos = Math.round(1 + 9 * GameState.lotacao());
    for (var i = 0; i < quantos; i++) {
      var a = new Ator(this, 150 + Math.random() * 130,
        100 + Math.random() * 430, sorteiaPax());
      a.dir = 'left'; a.sp.setDepth(30); a.anima(0, false);
      this.plateia.push(a);
    }
    this.gente = this.plateia.slice(0);

    if (Math.random() < 0.6 - 0.35 * GameState.lotacao()) {
      var pd = new Ator(this, 280, 120 + Math.random() * 380,
        PEDINTE_KEYS[Math.floor(Math.random() * PEDINTE_KEYS.length)]);
      pd.sp.setDepth(28); pd.anima(0, false);
      pd.fixo = true;
      this.gente.push(pd);
    }

    this.pl = new Ator(this, 200, 400, 'ch_' + GameState.charKey);
    this.pl.sp.setDepth(40); this.pl.dir = 'left';

    veuDaHora(this, 60);
    this.tarja = new FaixaHora(this, 72);
    this.dica = new FaixaDica(this);
    // painel do embarque, como o letreiro que fica pendurado na plataforma
    this.painel = new Plaqueta(this, 208, 76, { cor: PAL.branco, filete: num(GameState.faixa().cor), depth: 80 });

    this.gMini = this.add.graphics().setDepth(500).setVisible(false);
    this.tMini = txtC(this, GW / 2, GH / 2 - 54, '', PAL.branco, 8).setDepth(501).setVisible(false);
    this.tMini2 = txtC(this, GW / 2, GH / 2 + 24, '', PAL.amarelo, 8).setDepth(501).setVisible(false);
  },

  desenhaCenario: function () {
    var g = this.add.graphics().setDepth(0);
    g.fillStyle(num(PAL.bg), 1).fillRect(0, 0, GW, GH);

    // túnel e via
    g.fillStyle(num(PAL.brita), 1).fillRect(0, HUD_H, 108, GH - HUD_H);
    g.fillStyle(0x1e1e28, 1);
    for (var y = HUD_H; y < GH; y += 24) g.fillRect(24, y, 76, 9);
    g.fillStyle(num(PAL.dormente), 1);
    for (var y2 = HUD_H; y2 < GH; y2 += 24) g.fillRect(24, y2, 76, 7);
    pontilhado(g, 0, HUD_H, 108, GH, 0x000000, 0.25, 6);
    // trilhos com brilho
    g.fillStyle(num(PAL.trilhoSom), 1).fillRect(40, HUD_H, 8, GH - HUD_H);
    g.fillStyle(num(PAL.trilho), 1).fillRect(40, HUD_H, 5, GH - HUD_H);
    g.fillStyle(num(PAL.trilhoSom), 1).fillRect(84, HUD_H, 8, GH - HUD_H);
    g.fillStyle(num(PAL.trilho), 1).fillRect(84, HUD_H, 5, GH - HUD_H);

    // borda da plataforma
    g.fillStyle(0x000000, 0.6).fillRect(100, HUD_H, 8, GH - HUD_H);
    // faixa amarela tátil
    g.fillStyle(num(PAL.amareloSom), 1).fillRect(108, HUD_H, 16, GH - HUD_H);
    g.fillStyle(num(PAL.amarelo), 1).fillRect(108, HUD_H, 14, GH - HUD_H);
    g.fillStyle(num(PAL.amareloSom), 1);
    for (var yy = HUD_H + 4; yy < GH; yy += 12) g.fillRect(111, yy, 8, 5);
    g.fillStyle(num(PAL.amareloLuz), 1);
    for (var yy2 = HUD_H + 4; yy2 < GH; yy2 += 12) g.fillRect(111, yy2, 8, 2);

    // piso da plataforma
    g.fillStyle(num(PAL.rejunte), 1).fillRect(124, HUD_H, 172, GH - HUD_H);
    for (var py = HUD_H; py < GH; py += 16) {
      for (var px = 124; px < 296; px += 16) {
        g.fillStyle(((px / 16 + py / 16) % 2) ? 0x3f3f52 : 0x494960, 1);
        g.fillRect(px + 1, py + 1, 14, 14);
        g.fillStyle(0xffffff, 0.07).fillRect(px + 1, py + 1, 14, 2);
        g.fillStyle(0x000000, 0.16).fillRect(px + 1, py + 13, 14, 2);
      }
    }
    // reflexo da luz do teto no piso
    g.fillStyle(0xffffff, 0.05).fillRect(150, HUD_H, 28, GH - HUD_H);
    g.fillStyle(0xffffff, 0.03).fillRect(232, HUD_H, 20, GH - HUD_H);

    // parede da direita
    g.fillStyle(num(PAL.paredeSom), 1).fillRect(296, HUD_H, 24, GH - HUD_H);
    g.fillStyle(num(PAL.parede), 1).fillRect(300, HUD_H, 20, GH - HUD_H);
    g.fillStyle(num(PAL.paredeLuz), 1).fillRect(300, HUD_H, 3, GH - HUD_H);

    // placa vertical com o nome da estação
    var l = GameState.linhaAtual();
    g.fillStyle(num(escurecer(l.cor, 0.5)), 1).fillRect(298, 120, 20, 200);
    g.fillStyle(l.num, 1).fillRect(300, 122, 16, 196);
    var t = txt(this, 308, 220, GameState.estacaoAtual(), PAL.branco, 8);
    t.setOrigin(0.5, 0.5).setAngle(90).setDepth(1);
  },

  /* ---------- trem ---------- */
  pintaTrem: function () {
    var g = this.gTrem; g.clear();
    if (this.tremY <= -this.tremAlt || this.tremY >= this.tremAlt) return;
    var y0 = this.tremY, alt = this.tremAlt;
    var l = GameState.linhaAtual();

    // corpo com volume
    g.fillStyle(num(PAL.metalSom), 1).fillRect(20, y0, 88, alt);
    g.fillStyle(num(PAL.metal), 1).fillRect(24, y0, 78, alt);
    g.fillStyle(num(PAL.metalLuz), 1).fillRect(28, y0, 10, alt);
    g.fillStyle(0x000000, 0.28).fillRect(92, y0, 16, alt);
    // faixa da linha
    g.fillStyle(num(escurecer(l.cor, 0.35)), 1).fillRect(24, y0, 78, 12);
    g.fillStyle(l.num, 1).fillRect(24, y0 + 2, 78, 8);

    // janelas
    for (var y = y0 + 30; y < y0 + alt - 40; y += 80) {
      g.fillStyle(0x11161f, 1).fillRect(38, y, 58, 48);
      g.fillStyle(0x1f2a3d, 1).fillRect(40, y + 2, 54, 44);
      g.fillStyle(0x3a4a6a, 0.7).fillRect(42, y + 4, 50, 10);
      g.fillStyle(0xffffff, 0.09).fillRect(42, y + 4, 22, 40);
    }

    // portas
    var ab = (this.estado === 'aberto');
    for (var i = 0; i < this.portas.length; i++) {
      var py = this.portas[i] + y0;
      if (py < -60 || py > GH + 60) continue;
      if (ab) {
        g.fillStyle(0x07070c, 1).fillRect(76, py, 32, 52);
        g.fillStyle(0x232d42, 1).fillRect(80, py + 4, 24, 44);
        g.fillStyle(0x00e676, 1).fillRect(72, py, 4, 52);
        g.fillStyle(0x00e676, 0.3).fillRect(108, py, 12, 52);
      } else {
        g.fillStyle(num(PAL.metalSom), 1).fillRect(72, py, 36, 52);
        g.fillStyle(0x767c92, 1).fillRect(74, py, 32, 52);
        g.fillStyle(num(PAL.metalLuz), 1).fillRect(74, py, 32, 2);
        g.fillStyle(num(PAL.metalSom), 1).fillRect(88, py, 3, 52);
        g.fillStyle(num(PAL.amarelo), 1).fillRect(72, py + 24, 36, 4);
      }
    }
  },

  portaPerto: function () {
    if (this.estado !== 'aberto') return null;
    var y = this.pl.sp.y, x = this.pl.sp.x;
    if (x > 200) return null;
    for (var i = 0; i < this.portas.length; i++) {
      var py = this.portas[i] + this.tremY + 26;
      if (Math.abs(y - py) < 46) return py;
    }
    return null;
  },

  /* intervalo entre trens: no pico vem um atrás do outro, de madrugada
     você espera de verdade. Depois de perder um, o próximo perdoa. */
  intervalo: function () {
    var e = 3400 * GameState.faixa().espera;
    return this.perdido ? e * 0.6 : e;
  },

  cicloTrem: function (dt) {
    this.t += dt;
    var dif = GameState.dificuldade();
    switch (this.estado) {
      case 'espera':
        var esp = this.intervalo();
        this.painel.setText('TREM EM ' + Math.max(0, Math.ceil((esp - this.t) / 1000)) + 'S');
        if (this.t > esp) {
          this.estado = 'chegando'; this.t = 0; sfx('trem');
          GameState.passaTempo(Math.round(esp / 1000));
        }
        break;
      case 'chegando':
        this.tremY = -this.tremAlt + (this.t / 1400) * this.tremAlt;
        if (this.tremY >= 0) { this.tremY = 0; this.estado = 'aberto'; this.t = 0; sfx('porta'); }
        this.painel.setText('CHEGANDO');
        break;
      case 'aberto':
        var janela = Math.max(4200, 7400 - dif * 280);
        this.painel.setText('EMBARQUE ' + Math.max(0, Math.ceil((janela - this.t) / 1000)) + 'S');
        if (this.t > janela) {
          this.estado = 'partindo'; this.t = 0; sfx('porta');
          if (this.empurrando) this.falhouEmbarque();
        }
        break;
      case 'partindo':
        this.tremY = (this.t / 1400) * this.tremAlt;
        if (this.tremY >= this.tremAlt) { this.tremY = -this.tremAlt; this.estado = 'espera'; this.t = 0; }
        this.painel.setText('PERDEU ESSE');
        break;
    }
    this.pintaTrem();
  },

  /* ---------- minigame de entrar ---------- */
  /* quanto de pressão o vagão exige: no pico é uma parede de gente,
     fora do pico é quase só entrar */
  metaEmpurrao: function () {
    return 42 + 58 * GameState.lotacao();
  },

  comecaEmpurrao: function () {
    this.empurrando = true;
    // você não começa do zero: já está com o ombro na porta
    this.pressao = this.metaEmpurrao() * 0.18;
    this.gMini.setVisible(true);
    var lot = GameState.lotacao();
    this.tMini.setVisible(true).setText(
      lot > 0.8 ? 'VAGÃO LOTADO' : (lot > 0.45 ? 'VAGÃO CHEIO' : 'DÁ PRA ENTRAR'));
    this.tMini2.setVisible(true).setText(nomeAgir() + ' SEM PARAR');
    sfx('empurra');
  },

  fimEmpurrao: function () {
    this.empurrando = false;
    this.gMini.setVisible(false).clear();
    this.tMini.setVisible(false);
    this.tMini2.setVisible(false);
  },

  /* entrou: no talo ou espremido na porta fechando */
  entrou: function (espremido) {
    this.fimEmpurrao();
    GameState.addDescanso(-4 - 5 * GameState.lotacao() - (espremido ? 4 : 0));
    if (espremido) { GameState.addCarisma(-2); this.cameras.main.shake(200, 0.005); }
    sfx('ok');
    this.scene.start('Vagao');
  },

  falhouEmbarque: function () {
    // quase lá conta: a porta fecha nas suas costas e você vai espremido
    if (this.pressao >= this.metaEmpurrao() * 0.62) { this.entrou(true); return; }
    this.fimEmpurrao();
    this.perdido = true;
    GameState.addDescanso(-4);
    GameState.addCarisma(-2);
    GameState.passaTempo(3);
    sfx('nao');
    fala(this, 'A porta fechou na sua cara.\nO próximo vem logo.', []);
    var self = this;
    this.time.delayedCall(1500, function () { if (self.dialog) self.dialog.fecha(); });
  },

  atualizaEmpurrao: function (dt) {
    var dif = GameState.dificuldade();
    var c = GameState.char;
    var lot = GameState.lotacao();
    var meta = this.metaEmpurrao();

    var forca = 13 * c.empurraoMult
      * (0.7 + 0.3 * (GameState.descanso / c.descansoMax))
      * (0.9 + GameState.carisma / 400);
    // a multidão empurra de volta, mas só com força de multidão
    var quedaS = (6 + dif * 1.8) * (0.5 + 0.7 * lot);
    this.pressao = Math.max(0, this.pressao - quedaS * (dt / 1000));
    // segurar rende pouco; quem martela entra
    if (Ctrl.act) this.pressao += quedaS * 0.5 * (dt / 1000);
    if (Ctrl.actJust) { this.pressao += forca; sfx('empurra'); this.cameras.main.shake(60, 0.003); }

    var g = this.gMini; g.clear();
    caixa(g, 32, GH / 2 - 68, GW - 64, 124, 0xe8362c);
    barra(g, 48, GH / 2 - 12, GW - 96, 24, this.pressao / meta, 0x00e676, 0x1e1e2a);

    if (this.pressao >= meta) this.entrou(false);
  },

  /* ---------- loop ---------- */
  update: function (time, delta) {
    Ctrl.update();
    var dt = Math.min(delta, 50);

    if (this.dialog && this.dialog.ativo) { this.dialog.update(dt); return; }

    this.tarja.atualiza();
    this.cicloTrem(dt);

    if (this.empurrando) { this.atualizaEmpurrao(dt); return; }

    GameState.addDescanso(-0.0004 * GameState.char.dreno * dt);
    var morte = GameState.derrota();
    if (morte) { GameState.motivoFim = morte; this.fimDeJogo(); return; }

    for (var i = 0; i < this.plateia.length; i++) this.plateia[i].anima(dt, false);

    var vel = GameState.char.velocidade * (0.6 + 0.4 * (GameState.descanso / GameState.char.descansoMax));
    var dx = (Ctrl.right ? 1 : 0) - (Ctrl.left ? 1 : 0);
    var dy = (Ctrl.down ? 1 : 0) - (Ctrl.up ? 1 : 0);
    var mv = (dx !== 0 || dy !== 0);
    if (mv) {
      var n = Math.sqrt(dx * dx + dy * dy);
      this.pl.sp.x = Phaser.Math.Clamp(this.pl.sp.x + (dx / n) * vel * dt / 1000, 136, 288);
      this.pl.sp.y = Phaser.Math.Clamp(this.pl.sp.y + (dy / n) * vel * dt / 1000, 80, 560);
      this.pl.setDir(dx, dy);
    }
    this.pl.anima(dt, mv);
    resolveCorpos(this.pl, this.gente, limitaPlataforma, limitaPlataforma);

    var porta = this.portaPerto();
    this.dica.setText(porta ? nomeAgir() + ': entrar no vagão'
      : (this.estado === 'aberto' ? 'chegue na porta ◄' : ''),
      porta ? PAL.verde : PAL.amarelo);
    if (porta && Ctrl.actJust) this.comecaEmpurrao();
  },

  fimDeJogo: function () {
    GameState.salvarRecorde();
    this.scene.start('Fim');
  }
});
