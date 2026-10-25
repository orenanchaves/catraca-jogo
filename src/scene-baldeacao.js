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

/* ---------- os trombadinhas ----------
   docs/gdd/01-game-design-mestre.md §11: "operam em duplas nas escadarias
   e baldeações caóticas (Sé, Brás e Luz). Um elemento aplica encontrão
   simulado enquanto o comparsa abre a mochila ou furta a carteira."

   O que faz deles trombadinha e não obstáculo é serem DOIS. O da frente
   não quer passar, quer que você bata nele: ele corrige de pista atrás de
   você, coisa que passageiro nenhum faz. O de trás não encosta em você —
   ele só cobra quando o primeiro acerta.

   Por isso eles são anunciados: vêm marcados em vermelho, e o corredor
   tem três pistas justamente pra dar pra desviar. Punga que cai do céu
   sem aviso não é dificuldade, é imposto. A defesa boa (a mochila na
   frente, do §5 do GDD) ainda não existe — é Tier 2 do roadmap; até lá a
   defesa é a perna. */
var PUNGA_CHANCE = 0.22;          // uma dupla a cada quatro ou cinco aparições
var PUNGA_MIRA = 0.55;            // o quanto o da frente corrige de pista por segundo
var COR_PUNGA = 0xe8362c;
/* O ponto de não-retorno, em pixels de distância do jogador. Enquanto ele
   está longe, ele te MIRA: trocar de pista cedo só faz ele corrigir junto.
   De 150px pra baixo ele já jogou o ombro e não muda mais de ideia — e aí
   o desvio ganha.

   Isto não é detalhe de balanço, é o minigame inteiro. Sem a trava ele
   acertava SEMPRE (medido: desviar a 200px, a 60px ou não desviar davam o
   mesmo resultado), e punga que não se evita não é risco, é pedágio. O
   preço do desvio é o certo: você tem que segurar o nervo e sair tarde. */
var PUNGA_TRAVA = 150;

var BaldeacaoScene = new Phaser.Class({
  Extends: Phaser.Scene,
  initialize: function BaldeacaoScene() { Phaser.Scene.call(this, { key: 'Baldeacao' }); },

  create: function () {
    // chegou na Sé pra baldear: se não sentou nenhuma vez desde a rua, conta
    if (!GameState.sentouNaPerna) Missoes.conta('seSemSentar');
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
    this.pungaNoAr = false;       // uma dupla por vez, e ela não atravessa baldeação
    this.avisouPunga = false;     // o aviso é uma vez por corredor, não a cada dupla
    this.proxObst = 0;
    this.acabou = false;
    this.tempo = 0;

    // o rival corre a um passo constante: dá pra ganhar dele, mas não sobra
    this.rival = { andado: 0, vel: 268 + dif * 20, pista: 0 };

    this.gFundo = this.add.graphics().setDepth(0);
    this.gUI = this.add.graphics().setDepth(500);

    this.pl = new Ator(this, this.x, BALD_JOGADOR_Y, spriteJogador());
    this.pl.sp.setDepth(60);
    this.pl.dir = 'up';

    this.spRival = new Ator(this, BALD_PISTAS[0], BALD_JOGADOR_Y + 26, 'np_pax4');
    this.spRival.sp.setDepth(58);
    this.spRival.dir = 'up';

    this.dica = new FaixaDica(this, 520);
    this.centro = new Plaqueta(this, GW / 2, 150, { cor: PAL.branco, depth: 522 });

    /* A estação saiu do topo da tela, e aqui ela só existia na fala de
       abertura — que some em um segundo e meio. O corredor da Sé é a
       única cena sem placa própria, então ganhou a dela: a mesma placa
       de saguão da catraca, com o nome da estação e a linha pra onde
       este corredor leva. */
    var gPlaca = this.add.graphics().setDepth(504);
    gPlaca.fillStyle(0x06060c, 1).fillRect(0, HUD_H, GW, 30);
    gPlaca.fillStyle(num(LINHAS[GameState.linha].cor), 1).fillRect(0, HUD_H + 27, GW, 3);
    txtC(this, GW / 2, HUD_H + 5, 'SÉ  ►  ' + LINHAS[GameState.linha].nome,
      PAL.branco, 8).setDepth(505);

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
    // de vez em quando não é passageiro: é dupla (e ela já vem na SUA pista)
    if (!this.pungaNoAr && Math.random() < PUNGA_CHANCE) { this.soltaDupla(); return; }
    var anda = Math.random() < Math.min(0.5, 0.18 + dif * 0.07);
    var a = new Ator(this, BALD_PISTAS[p], HUD_H - 20, sorteiaPax());
    a.sp.setDepth(40);
    a.dir = anda ? 'down' : (Math.random() < 0.5 ? 'left' : 'right');
    this.obst.push({ a: a, pista: p, anda: anda, vagar: 0, y: HUD_H - 20 });
  },

  /* A dupla: o batedor na sua pista e o comparsa um passo atrás. Só uma
     por vez no corredor — duas duplas ao mesmo tempo viram parede, e
     parede não se desvia, se aceita. */
  soltaDupla: function () {
    this.pungaNoAr = true;
    var p = this.pista;
    var bat = new Ator(this, BALD_PISTAS[p], HUD_H - 20, sorteiaPax());
    bat.sp.setDepth(41);
    bat.dir = 'down';
    var cmp = new Ator(this, BALD_PISTAS[p] + 14, HUD_H - 44, sorteiaPax());
    cmp.sp.setDepth(41);
    cmp.dir = 'down';
    this.obst.push({ a: bat, pista: p, anda: true, vagar: 0, y: HUD_H - 20, punga: 'batedor', comparsa: cmp });
    this.obst.push({ a: cmp, pista: p, anda: true, vagar: 0, y: HUD_H - 44, punga: 'comparsa', passa: true });
    if (!this.avisouPunga) {
      this.avisouPunga = true;
      this.dica.setText('DOIS VINDO JUNTOS. DESVIA.', PAL.vermelho);
    }
  },

  /* O furto, quando o encontrão acerta. Primeiro a carteira, que é o que
     o documento diz; sem dinheiro no bolso, levam alguma coisa da mochila.
     Sem nada pra levar, fica no encontrão mesmo — punir quem já não tem
     nada é só crueldade sem jogo. */
  pungaLeva: function () {
    /* Mochila na frente é imunidade a furto (GDD §5). O encontrão dói
       igual — quem trombou, trombou —, mas a mão do comparsa não acha
       nada. É a defesa que o documento desenhou pra eles, e é o que faz
       a postura valer o passo mais curto. A regra do que levam mora no
       core (`furtaDoBolso`), porque a contramão da escada rouba também. */
    var r = furtaDoBolso();
    if (r === null) {
      this.dica.setText('MÃO NA MOCHILA. NÃO LEVARAM NADA.', PAL.verde);
      sfx('ok');
      return;
    }
    this.flashPunga(r);
  },

  flashPunga: function (txt) {
    this.dica.setText(txt, PAL.vermelho);
    sfx('nao');
    this.cameras.main.shake(260, 0.009);
  },

  update: function (time, delta) {
    Ctrl.update();
    ouveMochila(this);
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
      /* O batedor MIRA: em vez de vagar por aí, corrige pra sua pista.
         É o que denuncia que ele não está indo a lugar nenhum. O comparsa
         cola nele, meio passo atrás e de lado. */
      if (o.punga === 'batedor') {
        // longe, ele mira; perto, já comprometeu o corpo e não corrige mais
        if (BALD_JOGADOR_Y - o.y > PUNGA_TRAVA) o.pista = this.pista;
        o.a.sp.x += (BALD_PISTAS[o.pista] - o.a.sp.x) * Math.min(1, dt / 1000 * PUNGA_MIRA * 4);
        if (o.comparsa && o.comparsa.sp && o.comparsa.sp.active) {
          o.comparsa.sp.x += (o.a.sp.x + 14 - o.comparsa.sp.x) * Math.min(1, dt / 220);
        }
      } else if (o.punga === 'comparsa') {
        o.a.sp.y = Math.round(o.y);          // o x dele é o batedor quem manda
      } else if (o.anda) {
        o.vagar += dt;
        if (o.vagar > 900) {                 // quem anda muda de pista
          o.vagar = 0;
          o.pista = Phaser.Math.Clamp(o.pista + (Math.random() < 0.5 ? -1 : 1), 0, 2);
        }
        o.a.sp.x += (BALD_PISTAS[o.pista] - o.a.sp.x) * Math.min(1, dt / 200);
      }
      o.a.sp.y = Math.round(o.y);
      o.a.anima(dt, o.anda);

      // o comparsa não trombá: ele só passa do lado e cobra o que o outro abriu
      if (!o.batido && !o.passa && o.pista === this.pista && Math.abs(o.y - BALD_JOGADOR_Y) < 26
        && Math.abs(o.a.sp.x - this.pl.sp.x) < 22) {
        o.batido = true;
        this.tromba();
        if (o.punga === 'batedor') this.pungaLeva();
      }
      if (o.y > GH + 40) {
        if (o.punga === 'batedor') this.pungaNoAr = false;   // a dupla saiu: pode vir outra
        o.a.destroy();
        this.obst.splice(i, 1);
      }
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

  /* A marca da dupla: moldura vermelha nos dois e um traço ligando um ao
     outro. O traço é o que conta a história — são dois, e estão juntos.
     Forma antes de palavra: sem ele, o jogador vê dois passageiros
     vermelhos e não uma dupla. */
  pintaPunga: function (g) {
    var i, bat = null, cmp = null;
    for (i = 0; i < this.obst.length; i++) {
      if (this.obst[i].punga === 'batedor') bat = this.obst[i];
      else if (this.obst[i].punga === 'comparsa') cmp = this.obst[i];
    }
    if (!bat || !bat.a.sp || !bat.a.sp.active) return;
    var pulso = 0.55 + 0.45 * Math.sin(this.time.now / 140);
    var caixa = function (a) {
      if (!a || !a.sp || !a.sp.active) return;
      var x = Math.round(a.sp.x), y = Math.round(a.sp.y);
      g.lineStyle(2, COR_PUNGA, 0.5 + 0.5 * pulso);
      g.strokeRect(x - 15, y - 46, 30, 50);
    };
    if (cmp && cmp.a.sp && cmp.a.sp.active) {
      g.lineStyle(2, COR_PUNGA, 0.35 * pulso);
      g.lineBetween(bat.a.sp.x, bat.a.sp.y - 22, cmp.a.sp.x, cmp.a.sp.y - 22);
      caixa(cmp.a);
    }
    caixa(bat.a);
  },

  pintaUI: function () {
    var g = this.gUI; g.clear();
    this.pintaPunga(g);
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
        if (morte) { GameState.motivoFim = morte; GameState.salvarRecorde(); vaiPraOFim(self); return; }
        /* Sai da baldeação direto na plataforma: quem baldeia já está
           dentro do sistema, e não passa por catraca nenhuma. */
        Missoes.conta('baldeacao');
        self.scene.start('Estacao', { onde: 'plataforma' });
      }
    }]);
  }
});
