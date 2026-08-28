/* global Phaser */
/* Catraca — a baldeação da Sé

   Baldear era uma troca de cena: você descia e aparecia na outra
   plataforma. Só que a baldeação da Sé é o corredor mais disputado da
   cidade, e é onde o trajeto se ganha ou se perde no relógio.

   Agora é uma corrida no túnel de transferência: três pistas, gente
   parada e gente andando no caminho, e um passageiro correndo do seu
   lado pela mesma escada. Cada trombada custa segundo e fôlego; chegar
   antes dele vale ponto. */

var BALD_PISTAS = [80, 160, 240];
var BALD_JOGADOR_Y = 452;
var BALD_DISTANCIA = 2600;        // "metros" de corredor até a outra linha

var BaldeacaoScene = new Phaser.Class({
  Extends: Phaser.Scene,
  initialize: function BaldeacaoScene() { Phaser.Scene.call(this, { key: 'Baldeacao' }); },

  create: function () {
    areaDeJogo();
    Ctrl.liga(this);
    HUD_VISIVEL = true; CONTROLES_VISIVEIS = true;

    var dif = GameState.dificuldade();
    this.pista = 1;
    this.x = BALD_PISTAS[1];
    this.andado = 0;
    this.vel = 300;                        // "metros" por segundo
    this.velBase = 300 + dif * 18;
    this.trombadas = 0;
    this.rolagem = 0;
    this.obst = [];
    this.proxObst = 0;
    this.acabou = false;
    this.tempo = 0;

    // o rival corre a um passo constante: dá pra ganhar dele, mas não sobra
    this.rival = { andado: 0, vel: 268 + dif * 20, pista: 0 };

    this.gFundo = this.add.graphics().setDepth(0);
    this.gUI = this.add.graphics().setDepth(500);

    this.pl = new Ator(this, this.x, BALD_JOGADOR_Y, 'ch_' + GameState.charKey);
    this.pl.sp.setDepth(60);
    this.pl.dir = 'up';

    this.spRival = new Ator(this, BALD_PISTAS[0], BALD_JOGADOR_Y + 26, 'np_pax4');
    this.spRival.sp.setDepth(58);
    this.spRival.dir = 'up';

    this.dica = new FaixaDica(this, 520);
    this.centro = new Plaqueta(this, GW / 2, 150, { cor: PAL.branco, depth: 522 });

    var self = this;
    fala(this, 'SÉ. Baldeação pra ' + LINHAS[GameState.linha].nome + '.\nCorre que o trem não espera.', []);
    this.time.delayedCall(1500, function () { if (self.dialog) self.dialog.fecha(); });
  },

  /* O túnel: piso correndo, paredes, e a faixa tátil no meio de cada
     pista. Tudo desenhado com deslocamento, que é o que dá a sensação
     de andar sem mover o boneco do lugar. */
  pintaTunel: function () {
    var g = this.gFundo; g.clear();
    var r = this.rolagem % 48;
    g.fillStyle(0x1a2030, 1).fillRect(0, HUD_H, GW, GH - HUD_H);
    g.fillStyle(0x2b3648, 1).fillRect(40, HUD_H, GW - 80, GH - HUD_H);

    // piso em faixas, correndo pra baixo
    for (var y = HUD_H - 48 + r; y < GH; y += 48) {
      g.fillStyle(0x33405a, 1).fillRect(40, y, GW - 80, 24);
      g.fillStyle(0x000000, 0.12).fillRect(40, y + 24, GW - 80, 2);
    }
    // paredes com azulejo
    for (var s = 0; s < 2; s++) {
      var px = s ? GW - 40 : 0;
      g.fillStyle(0x646a80, 1).fillRect(px, HUD_H, 40, GH - HUD_H);
      g.fillStyle(0x767f96, 1).fillRect(px + (s ? 0 : 34), HUD_H, 6, GH - HUD_H);
      for (var wy = HUD_H - 40 + (this.rolagem % 40); wy < GH; wy += 40) {
        g.fillStyle(0x000000, 0.16).fillRect(px, wy, 40, 2);
        g.fillStyle(0xffe9a8, 0.10).fillRect(px + (s ? 4 : 12), wy + 6, 24, 10);
      }
    }
    // divisórias das pistas
    g.fillStyle(0xffffff, 0.05);
    for (var i = 0; i < 2; i++) {
      var lx = (BALD_PISTAS[i] + BALD_PISTAS[i + 1]) / 2;
      for (var ly = HUD_H - 32 + (this.rolagem % 32); ly < GH; ly += 32) g.fillRect(lx - 1, ly, 2, 16);
    }
  },

  /* Gente no caminho. Uns parados, uns andando devagar na sua direção —
     e o que anda é pior, porque muda de pista. */
  soltaObstaculo: function () {
    var dif = GameState.dificuldade();
    var p = Math.floor(Math.random() * 3);
    var anda = Math.random() < Math.min(0.5, 0.18 + dif * 0.07);
    var a = new Ator(this, BALD_PISTAS[p], HUD_H - 20, sorteiaPax());
    a.sp.setDepth(40);
    a.dir = anda ? 'down' : (Math.random() < 0.5 ? 'left' : 'right');
    this.obst.push({ a: a, pista: p, anda: anda, vagar: 0, y: HUD_H - 20 });
  },

  update: function (time, delta) {
    Ctrl.update();
    var dt = Math.min(delta, 50);
    if (this.dialog && this.dialog.ativo) { this.dialog.update(dt); return; }
    if (this.acabou) return;

    this.tempo += dt;

    // troca de pista: uma por toque, com o corpo escorregando pra lá
    // duas batidas trocam duas pistas: o contador é de batidas, não de estado
    this.pista = Phaser.Math.Clamp(this.pista - Ctrl.leftN + Ctrl.rightN, 0, 2);
    this.x += (BALD_PISTAS[this.pista] - this.x) * Math.min(1, dt / 90);
    this.pl.sp.x = Math.round(this.x);

    // a velocidade volta ao normal depois de uma trombada
    this.vel += (this.velBase - this.vel) * Math.min(1, dt / 700);
    this.andado += this.vel * dt / 1000;
    this.rival.andado += this.rival.vel * dt / 1000;
    this.rolagem += this.vel * dt / 1000 * 0.22;

    this.proxObst -= this.vel * dt / 1000;
    if (this.proxObst <= 0) {
      this.soltaObstaculo();
      this.proxObst = 260 + Math.random() * 320 - GameState.dificuldade() * 18;
    }

    this.moveObstaculos(dt);
    this.pl.anima(dt, true);

    // o rival aparece na beirada, à frente ou atrás de você
    var dRival = (this.rival.andado - this.andado) * 0.28;
    this.spRival.sp.x = BALD_PISTAS[this.pista === 0 ? 2 : 0];
    this.spRival.sp.y = Phaser.Math.Clamp(BALD_JOGADOR_Y - dRival, HUD_H + 40, GH - 30);
    this.spRival.anima(dt, true);

    if (this.andado >= BALD_DISTANCIA) this.chegou();
    this.pintaTunel();
    this.pintaUI();
  },

  moveObstaculos: function (dt) {
    for (var i = this.obst.length - 1; i >= 0; i--) {
      var o = this.obst[i];
      // eles vêm na sua direção: a velocidade do corredor mais a deles
      o.y += (this.vel * 0.30 + (o.anda ? 26 : 0)) * dt / 1000;
      if (o.anda) {
        o.vagar += dt;
        if (o.vagar > 900) {                 // quem anda muda de pista
          o.vagar = 0;
          o.pista = Phaser.Math.Clamp(o.pista + (Math.random() < 0.5 ? -1 : 1), 0, 2);
        }
        o.a.sp.x += (BALD_PISTAS[o.pista] - o.a.sp.x) * Math.min(1, dt / 200);
      }
      o.a.sp.y = Math.round(o.y);
      o.a.anima(dt, o.anda);

      if (!o.batido && o.pista === this.pista && Math.abs(o.y - BALD_JOGADOR_Y) < 26
        && Math.abs(o.a.sp.x - this.pl.sp.x) < 22) {
        o.batido = true;
        this.tromba();
      }
      if (o.y > GH + 40) { o.a.destroy(); this.obst.splice(i, 1); }
    }
  },

  tromba: function () {
    this.trombadas++;
    this.vel = this.velBase * 0.32;
    GameState.addDescanso(-2);
    GameState.passaTempo(1);
    this.cameras.main.shake(220, 0.006);
    sfx('empurra');
  },

  pintaUI: function () {
    var g = this.gUI; g.clear();
    // a corrida: você e ele na mesma régua
    var larg = GW - 64;
    barra(g, 32, HUD_H + 14, larg, 10, this.andado / BALD_DISTANCIA, 0x00e676, 0x1e1e2a);
    var rx = 32 + larg * Math.min(1, this.rival.andado / BALD_DISTANCIA);
    g.fillStyle(0xe8362c, 1).fillRect(Math.round(rx) - 1, HUD_H + 10, 3, 18);
    this.dica.setText(this.andado > this.rival.andado ? 'NA FRENTE DELE' : 'ELE ESTÁ NA FRENTE',
      this.andado > this.rival.andado ? PAL.verde : PAL.vermelho);
  },

  chegou: function () {
    this.acabou = true;
    var ganhou = this.andado >= this.rival.andado;
    var self = this;
    // o corredor custa tempo de qualquer jeito; trombada custa mais
    GameState.passaTempo(2 + Math.round(this.trombadas * 0.5));

    var texto;
    if (ganhou) {
      texto = 'VOCÊ PEGOU O TREM ANTES DELE.\n' + this.trombadas + ' trombada(s).\n+'
        + GameState.ganhaMinigame(6) + ' PONTOS.';
      sfx('vitoria');
    } else {
      perdeVida(this, this.pl.sp);
      GameState.addCarisma(-3);
      texto = 'ELE PASSOU NA SUA FRENTE.\n' + this.trombadas + ' trombada(s).\nVocê pega o próximo.';
      sfx('nao');
    }
    fala(this, texto, [{
      label: 'Seguir', cb: function () {
        var morte = GameState.derrota();
        if (morte) { GameState.motivoFim = morte; GameState.salvarRecorde(); self.scene.start('Fim'); return; }
        self.scene.start('Plataforma');
      }
    }]);
  }
});
