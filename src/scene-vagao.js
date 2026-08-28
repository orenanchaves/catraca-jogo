/* global Phaser */
/* Catraca — dentro do vagão: banco, equilíbrio, eventos e o dilema do lugar */

/* Baias de banco: três de cada lado, alternadas, como no vagão de verdade.
   x é a quina da baia na parede; quem senta fica no meio dela. */
var BAIA_FUNDO = 22, BAIA_COMP = 58;   // raso na parede, comprido ao longo dela
var BAIAS = [
  { x: 28, y: 80, dir: 1 }, { x: 28, y: 240, dir: 1 }, { x: 28, y: 400, dir: 1 },
  { x: 270, y: 160, dir: -1 }, { x: 270, y: 320, dir: -1 }, { x: 270, y: 480, dir: -1 }
];

/* guarda onde a pessoa está e com que fase ela balança, pra cada uma
   respirar no seu tempo em vez de o vagão inteiro pulsar junto */
function sentaAnimado(a) {
  a.bx = a.sp.x;
  a.by = a.sp.y;
  a.fase = Math.random() * Math.PI * 2;
  a.olhaT = Math.random() * 2000;
  a.proxOlhada = 2200 + Math.random() * 4500;
}

/* ---------- o repertório do rimador ----------
   Ele fecha citando quem está jogando, e é por isso que "ele te citou
   na rima" faz sentido depois: a rima citou mesmo. Nome de papel, não
   pronome — o jogo nunca disse o gênero de ninguém. */
/* Duas linhas, nenhuma passando de 22 caracteres: na largura da tela
   isso é o limite antes de a placa quebrar em três e ir parar em cima
   do aviso de solavanco. */
var VERSOS_RIMADOR = [
  'LICENÇA, SENHORAS\nE SENHORES',
  'NÃO É ESMOLA NÃO,\nÉ TRABALHO NA LINHA',
  null,                                  // aqui entra o verso do personagem
  'GOSTOU, COLABORA.\nNÃO GOSTOU, DESCULPA'
];
var VERSO_DO_JOGADOR = {
  estudante: 'O ESTUDANTE PAGA MEIA\nE CARREGA O MUNDO',
  clt: 'O CLT ACORDA CEDO\nPRA CHEGAR ATRASADO',
  senhor: 'ESSE AÍ NÃO PAGA:\nJÁ PAGOU A VIDA TODA',
  ambulante: 'ESSE AÍ É DA ÁREA,\nRESPEITO ENTRE COLEGA'
};

/* o corredor do vagão, entre os bancos */
function limitaVagao(sp) {
  sp.x = Phaser.Math.Clamp(sp.x, 70, 250);
  sp.y = Phaser.Math.Clamp(sp.y, 84, 556);
}

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
    this.gente = [];
    this.portas = [140, 300, 460];
    this.npcExtra = [];

    this.desenhaCenario();
    this.montaBancos();
    veuDaHora(this, 90);
    this.tarja = new FaixaHora(this, 510);

    this.pl = new Ator(this, 160, 500, 'ch_' + GameState.charKey);
    this.pl.sp.setDepth(60);
    this.pl.dir = 'up';

    // a caixinha fica no chão à frente dele: desenha por cima de quem a
    // largou, por baixo de quem está jogando
    this.gCaixa = this.add.graphics().setDepth(57);
    this.rimador = null;
    this.encena = false;

    this.gUI = this.add.graphics().setDepth(500);
    this.rima = new Plaqueta(this, GW / 2, 104, { cor: PAL.amarelo, filete: 0xe8362c, depth: 510 });
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

    /* O vagão de verdade é quase todo espaço em pé: os bancos são baias
       curtas e azuis, encostadas na parede, com vão grande entre uma e
       outra. Piso azul de borracha canelada, painel claro na parede na
       altura do ombro e poste vertical na ponta de cada baia. */

    // piso
    g.fillStyle(0x2b3648, 1).fillRect(28, HUD_H, 264, GH - HUD_H);
    g.fillStyle(0x33405a, 1);
    for (var y = HUD_H; y < GH; y += 8) g.fillRect(66, y, 188, 4);
    pontilhado(g, 66, HUD_H, 188, GH, 0x000000, 0.1, 6);

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

    // painel claro da parede, atrás e acima dos bancos
    for (var s = 0; s < 2; s++) {
      var px = s ? 270 : 28;
      g.fillStyle(0x767f96, 1).fillRect(px, HUD_H, 22, GH - HUD_H);
      g.fillStyle(0x868fa6, 1).fillRect(px, HUD_H, 22, 2);
      g.fillStyle(0x4e5468, 1).fillRect(px + (s ? 0 : 20), HUD_H, 2, GH - HUD_H);
    }

    /* baias de banco: encosto colado na parede, assento pra fora, e o
       vão entre uma e outra sendo maior que a própria baia */
    for (var b = 0; b < BAIAS.length; b++) {
      var bx = BAIAS[b].x, by = BAIAS[b].y, ld = BAIAS[b].dir;
      var enc = ld > 0 ? bx : bx + BAIA_FUNDO - 6;          // encosto, na parede
      var ass = ld > 0 ? bx + 6 : bx;                        // assento, pro corredor
      g.fillStyle(0x000000, 0.3).fillRect(bx, by + BAIA_COMP, BAIA_FUNDO, 3);
      g.fillStyle(0x1c5288, 1).fillRect(enc, by - 3, 6, BAIA_COMP + 3);
      g.fillStyle(0x2f7fc4, 1).fillRect(ass, by, BAIA_FUNDO - 6, BAIA_COMP);
      g.fillStyle(0x63aee8, 1).fillRect(ass, by, BAIA_FUNDO - 6, 3);
      g.fillStyle(0x123a63, 1).fillRect(ass, by + BAIA_COMP - 3, BAIA_FUNDO - 6, 3);
      g.fillStyle(0x1c5288, 0.5);                            // três lugares por baia
      g.fillRect(ass, by + Math.round(BAIA_COMP / 3), BAIA_FUNDO - 6, 1);
      g.fillRect(ass, by + Math.round(BAIA_COMP * 2 / 3), BAIA_FUNDO - 6, 1);
      // poste vertical em cada ponta
      for (var e = 0; e < 2; e++) {
        var ex = ld > 0 ? bx + BAIA_FUNDO - 4 : bx;
        var ey = e ? by + BAIA_COMP - 4 : by - 4;
        g.fillStyle(num(PAL.metalSom), 1).fillRect(ex, ey, 4, 8);
        g.fillStyle(num(PAL.metalLuz), 1).fillRect(ex, ey, 2, 8);
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
    this.bancos = [];
    for (var k = 0; k < BAIAS.length; k++) {
      this.bancos.push({ x: BAIAS[k].x + BAIA_FUNDO / 2, y: BAIAS[k].y + 4, npc: null });
    }
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
      a.fixo = true;                  // sentado não é empurrado
      sentaAnimado(a);
      b.npc = a;
      this.gente.push(a);
    }
    var emPe = Phaser.Math.Clamp(Math.round(8 * lot), 0, 8);
    for (var j = 0; j < emPe; j++) {
      var p = new Ator(this, 82 + Math.random() * 156,
        120 + Math.random() * 400, sorteiaPax());
      p.dir = Math.random() < 0.5 ? 'left' : 'right';
      p.anima(0, false); p.sp.setDepth(35);
      sentaAnimado(p);                // em pé também olha em volta
      this.npcExtra.push(p);
      this.gente.push(p);
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
    sentaAnimado(this.pl);
    this.pl.dir = b.x < 160 ? 'right' : 'left';
    this.pl.anima(0, false);
    GameState.sentado = true;
    sfx('ok');
  },

  levanta: function () {
    if (!this.sentadoEm) return;
    this.sentadoEm.npc = null;
    this.pl.pos(this.sentadoEm.x < 160 ? 84 : 236, this.sentadoEm.y + 24);
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

  /* Vagão andando não tem ninguém parado de verdade: quem está sentado
     balança junto com o trem e olha em volta de vez em quando. Sem isso
     o banco vira um móvel com gente pintada em cima.

     Só quem está sentado balança de posição — quem está em pé é
     empurrado pelos outros, e mexer no x deles brigaria com a física. */
  animaGente: function (dt) {
    this.tBalanco = (this.tBalanco || 0) + dt;
    var andando = (this.estado === 'andando');
    var amp = andando ? 1.2 : 0.35;
    var i, a;

    for (i = 0; i < this.bancos.length; i++) {
      a = this.bancos[i].npc;
      if (!a || a === 'player' || !a.sp || !a.sp.active) continue;
      a.sp.x = a.bx + Math.sin(this.tBalanco / 520 + a.fase) * amp;
      a.sp.y = a.by + Math.sin(this.tBalanco / 880 + a.fase * 1.7) * amp * 0.5;
      this.olhaEmVolta(a, dt);
    }
    for (i = 0; i < this.npcExtra.length; i++) this.olhaEmVolta(this.npcExtra[i], dt);

    // o jogador sentado balança junto
    if (this.sentadoEm && this.pl.bx !== undefined) {
      this.pl.sp.x = this.pl.bx + Math.sin(this.tBalanco / 520 + this.pl.fase) * amp;
      this.pl.sp.y = this.pl.by + Math.sin(this.tBalanco / 880 + this.pl.fase * 1.7) * amp * 0.5;
    }
  },

  olhaEmVolta: function (a, dt) {
    if (!a || !a.sp || !a.sp.active) return;
    a.olhaT += dt;
    if (a.olhaT > a.proxOlhada) {
      a.olhaT = 0;
      a.proxOlhada = 2200 + Math.random() * 4500;
      var lados = (a.sp.x < 160) ? ['right', 'down', 'up'] : ['left', 'down', 'up'];
      a.dir = lados[Math.floor(Math.random() * lados.length)];
    }
    a.anima(dt, false);
  },

  /* ---------- o rimador ----------
     Antes ele era uma linha de diálogo: "O rimador começa." Só que o
     rimador do metrô tem um ritual, e o ritual é metade da graça — ele
     atravessa o corredor, escolhe o lugar, agacha, põe a caixinha no
     chão, liga, e só então abre a boca. Pular isso é contar a piada
     sem a pausa.

     E nada disso é caixa de diálogo: a cena continua rodando enquanto
     ele monta o barraco, então dá pra andar, sentar ou sair de perto
     antes de ele terminar. A escolha só aparece depois da última rima,
     que é quando a pessoa já decidiu se vai fingir que dorme. */
  comecaRimador: function () {
    this.encena = true;
    var lado = (this.pl.sp.x < 160) ? 1 : -1;      // arma do lado oposto ao seu
    var x = 160 + lado * 24;
    var a = new Ator(this, x, 92, 'np_rimador');
    a.dir = 'down';
    a.sp.setDepth(56);
    a.fixo = true;                                  // ninguém empurra quem trabalha
    this.gente.push(a);
    this.rimador = {
      a: a, lado: lado, alvo: 296, fase: 'entra', t: 0,
      verso: -1, batida: 0, caixa: false, caixaX: x - lado * 26, caixaY: 302
    };
    sfx('porta');
  },

  animaRimador: function (dt) {
    var r = this.rimador;
    if (!r) return;
    r.t += dt;
    var a = r.a;

    if (r.fase === 'entra') {
      a.sp.y = Math.min(r.alvo, a.sp.y + 0.075 * dt);
      a.anima(dt, true);
      if (a.sp.y >= r.alvo) { r.fase = 'abaixa'; r.t = 0; }

    } else if (r.fase === 'abaixa') {
      // vira pro lado da caixa e dobra o joelho antes de largar
      a.dir = r.lado > 0 ? 'left' : 'right';
      a.sp.y = r.alvo + Math.min(3, r.t / 130);
      a.anima(dt, false);
      if (r.t > 440) {
        r.fase = 'liga'; r.t = 0; r.caixa = true;
        a.sp.y = r.alvo;
        sfx('caixa');
      }

    } else if (r.fase === 'liga') {
      a.anima(dt, false);
      if (r.t > 520) { r.fase = 'rima'; r.t = 99999; a.dir = 'down'; }

    } else if (r.fase === 'rima') {
      r.batida += dt;
      // rebolado no ritmo: sobe e desce no compasso da caixinha
      a.sp.y = r.alvo - Math.abs(Math.sin(r.batida / 240)) * 2;
      a.anima(dt, true);
      if (r.t > 1500) {
        r.t = 0; r.verso++;
        if (r.verso >= VERSOS_RIMADOR.length) { this.fechaRimador(); return; }
        this.rima.setText(VERSOS_RIMADOR[r.verso] || VERSO_DO_JOGADOR[GameState.charKey]);
        sfx('batida');
      }

    } else if (r.fase === 'sai') {
      a.sp.y += 0.08 * dt;
      a.dir = 'down';
      a.anima(dt, true);
      if (a.sp.y > GH + 60) {
        var i = this.gente.indexOf(a);
        if (i >= 0) this.gente.splice(i, 1);
        a.destroy();
        this.rimador = null;
      }
    }
  },

  /* a caixinha no chão: corpo, dois alto-falantes, o LED e as ondas,
     que só saem enquanto ele está rimando */
  pintaCaixinha: function () {
    var g = this.gCaixa; g.clear();
    var r = this.rimador;
    if (!r || !r.caixa) return;
    var x = r.caixaX, y = r.caixaY;
    var tocando = (r.fase === 'rima' || r.fase === 'espera');

    g.fillStyle(0x000000, 0.35).fillEllipse(x, y + 1, 24, 7);
    g.fillStyle(0x3a3a4e, 1).fillRect(x - 5, y - 14, 10, 2);     // alça
    g.fillStyle(0x14141c, 1).fillRect(x - 10, y - 12, 20, 12);   // corpo
    g.fillStyle(0x2e2e40, 1).fillRect(x - 10, y - 12, 20, 2);
    g.fillStyle(0x08080e, 1).fillRect(x - 10, y - 2, 20, 2);
    for (var i = 0; i < 2; i++) {
      var cx = x - 5 + i * 10;
      g.fillStyle(0x08080e, 1).fillCircle(cx, y - 6, 3);
      g.fillStyle(tocando ? 0x454560 : 0x22222e, 1).fillCircle(cx, y - 6, 2);
    }
    g.fillStyle(tocando ? 0xe8362c : 0x3a1a18, 1).fillRect(x - 1, y - 10, 2, 2);
    if (!tocando) return;

    var p = (Math.sin(r.batida / 240) + 1) / 2;
    for (var k = 1; k <= 2; k++) {
      g.lineStyle(1, 0xf2c14e, (0.34 - k * 0.09) + 0.18 * p);
      var raio = 13 + k * 6 + p * 2;
      g.beginPath(); g.arc(x, y - 6, raio, -0.85, 0.85); g.strokePath();
      g.beginPath(); g.arc(x, y - 6, raio, Math.PI - 0.85, Math.PI + 0.85); g.strokePath();
    }
  },

  /* a escolha só entra depois da última rima */
  fechaRimador: function () {
    var self = this;
    this.rimador.fase = 'espera';
    this.rima.setText('');
    fala(this, 'Ele encerra e passa o chapéu.', [
      {
        label: 'Dar uma moeda (R$ 1,00)', cb: function () {
          if (GameState.dinheiro < 1) { sfx('nao'); self.flash('Nem moeda você tem.'); return; }
          GameState.gastar(1); GameState.addCarisma(6); GameState.stats.causos++;
          sfx('moeda'); self.flash('Ele agradeceu pelo nome.');
          self.saiRimador();
        }
      },
      {
        label: 'Fingir que dorme', cb: function () {
          GameState.addCarisma(-4); GameState.stats.causos++;
          self.flash('Ele rimou com a sua cara.');
          self.saiRimador();
        }
      }
    ], { tempo: 7, aoExpirar: function () { GameState.addCarisma(-1); self.saiRimador(); } });
  },

  /* pega a caixinha de volta e segue pro próximo vagão */
  saiRimador: function () {
    this.encena = false;
    if (!this.rimador) return;
    this.rimador.caixa = false;
    this.rimador.fase = 'sai';
    sfx('caixa');
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
      function () { self.comecaRimador(); },
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

    this.idoso = new Ator(this, this.sentadoEm.x < 160 ? 80 : 240, this.sentadoEm.y + 24, 'np_idoso');
    this.idoso.dir = this.sentadoEm.x < 160 ? 'left' : 'right';
    this.idoso.anima(0, false);
    this.idoso.sp.setDepth(55);
    this.idoso.fixo = true;
    this.gente.push(this.idoso);
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
      var p = Ctrl.dirDominante();
      if (p) { if (p === d.olhar) acertou = true; else errou = true; }
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
    // chegou a estação: o rimador recolhe a caixinha e vai embora também
    if (this.rimador && this.rimador.fase !== 'sai') { if (this.dialog) this.dialog.fecha(); this.saiRimador(); }
    this.rima.setText('');
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
      if (!this.dilemaFeito && !this.encena && this.t > 9000) { this.dilemaDoLugar(); this.pintaUI(); return; }
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
        this.pl.sp.x = Phaser.Math.Clamp(this.pl.sp.x + (dx / n) * vel * dt / 1000, 70, 250);
        this.pl.sp.y = Phaser.Math.Clamp(this.pl.sp.y + (dy / n) * vel * dt / 1000, 84, 556);
        this.pl.setDir(dx, dy);
      }
      this.pl.anima(dt, mv);
      resolveCorpos(this.pl, this.gente, limitaVagao, limitaVagao);
    }

    this.animaGente(dt);
    this.animaRimador(dt);
    this.pintaCaixinha();
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
