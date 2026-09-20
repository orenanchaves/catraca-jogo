/* global Phaser, GameState, Diario, nomeDaFase, faseDe */
/* Catraca — o balanço da fase (e o fim de jogo, que é a mesma tela)

   Sabatina de 20/09. A fase acabava em silêncio: a última perna fechava,
   o contador subia e amanhecia. Agora ela tem fecho, e o fecho é ESTA
   tela, com dois humores:

   - verde, quando você chegou em casa: o que a fase rendeu;
   - vermelho, quando o dia acabou mal: por que acabou.

   Uma tela só para os dois porque o jogador aprende um lugar onde a fase
   é julgada, e porque o mesmo formulário é o que deixa comparar um dia
   bom com um ruim. Duas telas parecidas fariam o contrário.

   Ela CONTA e ENTREGA: cada linha cumprida já virou XP antes de a tela
   abrir (src/diario.js, `Diario.fecha`), e o total vira nota. Balanço
   sem consequência vira recibo, lido uma vez e pulado na segunda.

   E ela é a porta da LINHA DO TEMPO: a fileira de pastilhas embaixo é a
   temporada inteira, uma por fase, com a nota de cada uma. Tocar numa
   pastilha antiga é repetir aquela fase — e repetir DESFAZ as seguintes,
   porque o que veio depois era consequência dela. A tela diz o preço
   antes de o dedo chegar no botão. */

/* a mesma fileira de três da tela de título, medida do mesmo jeito */
/* Aqui são dois e não três, então o par é que fica centrado. E o pequeno
   tem 80 e não 46: 'TROCAR' são seis letras a 12 pixels, e no ladrilho
   do título cabia um '?'. */
var FIM_BOT = { h: 42, y: GH - 50, gr: 146, pq: 80, vao: 8 };
FIM_BOT.xGr = Math.round((GW - (FIM_BOT.gr + FIM_BOT.vao + FIM_BOT.pq)) / 2);
FIM_BOT.xDir = FIM_BOT.xGr + FIM_BOT.gr + FIM_BOT.vao;

/* A pastilha da linha do tempo: 34 de passo porque 'DIA 10' não cabe e o
   que se lê é o número e a nota, um em cima do outro. Oito por fileira
   dá 272 de 320, com margem dos dois lados. */
var TL = { x0: 24, y: 396, w: 30, h: 30, passo: 34, porFila: 8 };

var FimScene = new Phaser.Class({
  Extends: Phaser.Scene,
  initialize: function FimScene() { Phaser.Scene.call(this, { key: 'Fim' }); },

  /* quem congelou a cena de trás é quem a abriu; matar é serviço daqui */
  init: function (dados) {
    this.congeladas = (dados && dados.congeladas) || [];
    this.saindo = false;
    this.bal = (dados && dados.balanco) || null;
    /* 'temporada' abre a MESMA tela em modo de leitura, sem balanço: é o
       atalho do título, pra olhar a campanha e repetir uma fase sem
       precisar terminar um dia primeiro. */
    this.vista = (dados && dados.vista) || null;
    this.escolhida = 0;      // a fase marcada na linha do tempo (0 = nenhuma)
  },

  create: function () {
    Ctrl.liga(this);
    // no resultado o direcional não leva a lugar nenhum: toque em qualquer lugar age
    HUD_VISIVEL = false; CONTROLES_VISIVEIS = false;
    var b = this.bal, so = this.vista === 'temporada', bom = so || !!(b && b.bom);
    sfx(so ? 'ok' : (bom ? 'vitoria' : 'fim'));
    var corN = so ? 0xf2c14e : (bom ? 0x1faa59 : 0xe8362c);
    var corT = so ? PAL.amarelo : (bom ? PAL.verde : PAL.vermelho);
    var g = this.add.graphics();
    /* Escuro, não opaco: o lugar onde a fase acabou continua atrás,
       parado. Sem isso a tela é um número sem endereço. */
    g.fillStyle(0x05050a, this.congeladas.length ? 0.9 : 1).fillRect(0, 0, GW, GH);
    pontilhado(g, 0, 0, GW, GH, 0xffffff, 0.03, 8);

    /* uma coluna só, de cima pra baixo, sempre na mesma ordem:
       manchete, que fase era, o que aconteceu, as linhas, a nota, a
       linha do tempo, os botões. */
    g.fillStyle(0x06060c, 1).fillRect(0, 52, GW, 72);
    g.fillStyle(corN, 1).fillRect(0, 52, GW, 5);
    g.fillStyle(corN, 1).fillRect(0, 119, GW, 5);
    txtC(this, GW / 2, 68, so ? 'A TEMPORADA' : (bom ? 'FASE CUMPRIDA' : 'FIM DE LINHA'), corT, 16);

    var n = (b && b.dia) || GameState.dia || 1;
    var nome = (typeof nomeDaFase === 'function') ? nomeDaFase(GameState.charKey, n) : ('DIA ' + n);
    txtC(this, GW / 2, 104, so ? (GameState.nome || '') : nome, PAL.cinza, 8).setScale(ESCALA_TEXTO / 2);

    var recado = so
      ? 'Toque numa fase pra repetir. O que veio depois dela se desfaz.'
      : (bom
        ? ((typeof faseDe === 'function' && faseDe(GameState.charKey, n)) ? faseDe(GameState.charKey, n).premissa : 'Você chegou em casa.')
        : (GameState.motivoFim || 'A cidade venceu hoje.'));
    /* BitmapText quebra linha por `setMaxWidth`, nunca por
       `setWordWrapWidth` — com o segundo a frase saía numa linha só,
       cortada nas duas pontas. E a medida é em unidade de fonte, antes
       da escala: MEIA escala aqui é `ESCALA_TEXTO / 2`, que dá 1, então
       uma unidade é um pixel de tela e o limite é a largura mesmo. Medi:
       71 caracteres deram 426 de largura, e o limite estava em 544. */
    txtC(this, GW / 2, 134, recado, PAL.cinza, 8)
      .setScale(ESCALA_TEXTO / 2).setMaxWidth(GW - 48).setAlign('center');

    if (so) this.pintaListaDeFases();
    else if (b) this.pintaBalanco(g, b, corN);
    else this.pintaPlacarAntigo(g);
    /* 'O bonequinho tem que aparecer o tempo todo.' Ele é de quem é a
       temporada, com o gênero escolhido no título, e fica no vão que
       sobra entre o conteúdo e os botões: grande na temporada, onde há
       espaço, e menor no balanço, que é uma tela cheia. */
    this.poeBoneco(so ? 62 : 46, so ? 500 : 510, so ? 2 : 1.2,
      so ? 'parado' : (bom ? 'danca' : 'caido'));
    this.pintaLinhaDoTempo();
    this.montaBotoes(bom);
  },

  /* ---------- o balanço, linha por linha ----------
     Verde com tique é o que a fase pediu e você fez; cinza com X é o que
     ficou. O que ficou não vem só como ausência: vem com o número que
     explica (quanto de carisma foi embora, quanto o dia custou). */
  pintaBalanco: function (g, b, corN) {
    var y0 = 168, i;
    g.fillStyle(0x11111c, 1).fillRect(20, y0 - 8, GW - 40, b.linhas.length * 20 + 14);
    for (i = 0; i < b.linhas.length; i++) {
      var L = b.linhas[i], y = y0 + i * 20;
      txt(this, 30, y, L.ok ? '✓' : 'X', L.ok ? PAL.verde : PAL.vermelho, 8).setScale(ESCALA_TEXTO / 2);
      txt(this, 46, y, L.rot, L.ok ? PAL.branco : PAL.cinzaEsc, 8).setScale(ESCALA_TEXTO / 2);
      txt(this, GW - 30, y, L.ok ? '+' + L.xp : (L.nota || ''), L.ok ? PAL.amarelo : PAL.cinzaEsc, 8)
        .setOrigin(1, 0).setScale(ESCALA_TEXTO / 2);
    }
    var yf = y0 + b.linhas.length * 20 + 12;
    txt(this, 30, yf + 6, 'XP DA FASE', PAL.cinzaEsc, 8).setScale(ESCALA_TEXTO / 2);
    txt(this, 30, yf + 20, '+' + b.xp, PAL.amarelo, 16);
    // a nota, grande, do lado direito: é o que se olha primeiro na segunda vez
    /* A caixa da fonte tem três vezes o tamanho pedido: no 32 a letra
       tem 96 de altura e vazava a chapa de 52 pelos dois lados. No 16 a
       tinta vai de +8 a +44, que é o que a chapa comporta. */
    g.fillStyle(corN, 0.14).fillRoundedRect(GW - 86, yf, 60, 52, 8);
    g.lineStyle(1, corN, 0.7).strokeRoundedRect(GW - 85.5, yf + 0.5, 59, 51, 8);
    txtC(this, GW - 56, yf + 2, b.notaLetra, PAL.branco, 16);
    if (b.subiu) txtC(this, GW / 2, yf + 58, 'SUBIU PRO NÍVEL ' + b.subiu + '!', PAL.verde, 8)
      .setScale(ESCALA_TEXTO / 2);
  },

  /* ---------- a temporada por extenso ----------
     As pastilhas dizem a nota; esta lista diz o NOME, que é o que faz a
     fileira virar a história do personagem em vez de um calendário. */
  pintaListaDeFases: function () {
    /* A temporada inteira, uma fase por linha, e cada linha se toca. É a
       tela de ESCOLHER fase: 'não tô conseguindo jogar as missões de
       forma separada'. Mostra também a que você ainda não alcançou, que é
       o que faz a lista ser um caminho e não um extrato.

       Quatro estados, e cada um diz o que dá pra fazer:
         ▶ atual     — a fase de agora; o botão joga ela
         ✓ feita     — já fechada, com nota; tocar repete
           pulada    — passou sem nota (caiu, ou save antigo sem foto)
           trancada  — a história ainda não chegou; não abre */
    var temporada = (typeof temporadaDe === 'function') ? temporadaDe(GameState.charKey) : [];
    var feitas = {}, i;
    if (typeof Diario !== 'undefined') {
      var l = Diario.lista();
      for (i = 0; i < l.length; i++) feitas[l[i].n] = l[i];
    }
    var atual = GameState.dia || 1;
    var quantas = Math.max(temporada.length, atual);
    var y0 = 170, alt = 26, eu = this, g = this.add.graphics().setDepth(1);
    this.zonasFase = [];
    for (i = 1; i <= quantas && i <= 10; i++) {
      var y = y0 + (i - 1) * alt, d = feitas[i];
      var estado = (i === atual) ? 'atual'
        : (d && d.nota ? 'feita' : (i < atual ? 'pulada' : 'trancada'));
      var podeIr = estado !== 'trancada';
      var nomeF = (typeof nomeDaFase === 'function') ? nomeDaFase(GameState.charKey, i) : ('FASE ' + i);
      if (estado === 'trancada') nomeF = '- - -';
      g.fillStyle(estado === 'atual' ? 0x2a2418 : 0x11111c, 1).fillRect(20, y, GW - 40, alt - 4);
      g.fillStyle(estado === 'atual' ? 0xf2c14e : (estado === 'feita' ? 0x1faa59 : 0x2a2a3a), 1)
        .fillRect(20, y, 3, alt - 4);
      txt(this, 30, y + 5, String(i), estado === 'atual' ? PAL.amarelo : PAL.cinzaEsc, 8)
        .setScale(ESCALA_TEXTO / 2).setDepth(2);
      txt(this, 46, y + 5, nomeF,
        estado === 'atual' ? PAL.branco : (podeIr ? PAL.cinza : PAL.cinzaEsc), 8)
        .setScale(ESCALA_TEXTO / 2).setDepth(2).setMaxWidth(GW - 100);
      txt(this, GW - 30, y + 3, (d && d.nota) || (estado === 'atual' ? '►' : '-'),
        (d && d.nota) ? PAL.verde : PAL.cinzaEsc, 8).setOrigin(1, 0).setDepth(2);
      var z = this.add.zone(20, y, GW - 40, alt - 4).setOrigin(0, 0).setInteractive();
      (function (num, pode) {
        z.on('pointerdown', function () { eu.marca(pode ? num : 0, !pode); });
      })(i, podeIr);
      this.zonasFase.push(z);
    }
    this.gFases = g;
    this.tPreco = txtC(this, GW / 2, y0 + Math.min(quantas, 10) * alt + 6, '', PAL.cinzaEsc, 8)
      .setScale(ESCALA_TEXTO / 2).setDepth(2);
  },

  /* O personagem em pé, com a sombra no chão que o põe num lugar (é a
     mesma ideia do palco do título: sem a sombra ele flutua). */
  poeBoneco: function (x, pes, escala, humor) {
    if (!GameState.charKey || typeof spriteChar !== 'function') return;
    var ch = spriteChar(GameState.charKey, GameState.genero);
    if (!ch || !this.textures.exists(ch)) return;
    var g = this.add.graphics().setDepth(1);
    g.fillStyle(0x000000, 0.4).fillEllipse(x, pes - 2, 34 * escala, 8 * escala);
    var sp = this.add.sprite(x, pes, ch, 0).setOrigin(0.5, 1).setScale(escala).setDepth(2);
    /* ---------- o humor do boneco ----------
       'Faz ele dançando quando ganha, triste quando perde, caído no
       chão.' O boneco não tem pose de dança nem de derrota desenhadas, e
       nem precisa: as fileiras que existem já dizem isso quando ANIMADAS.

       Dançar é alternar os dois quadros de andar (fileira `down`, 1 e 2)
       sem sair do lugar, com o corpo pulando e girando um pouco. Perder é
       a fileira de SENTADO, que é a mesma imagem que o jogo usa quando
       você cai no vagão, inclinada pra frente: o texto de derrota já diz
       'você sentou no chão numa estação qualquer'.

       A origem do sprite é o PÉ, então girar inclina o corpo a partir do
       chão, que é o que faz parecer desabado e não flutuando torto. */
    var base = (typeof FILEIRA_DIR !== 'undefined') ? FILEIRA_DIR : { down: 0, sentadoFrente: 18 };
    if (humor === 'danca') {
      var q = 1, eu = this;
      sp.setFrame(base.down + 1);
      this.time.addEvent({
        delay: 170, loop: true,
        callback: function () { q = q === 1 ? 2 : 1; if (sp.active) sp.setFrame(base.down + q); }
      });
      this.tweens.add({
        targets: sp, y: pes - 5 * escala, duration: 170, yoyo: true, repeat: -1, ease: 'Quad.easeOut'
      });
      this.tweens.add({
        targets: sp, angle: 7, duration: 340, yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
      });
    } else if (humor === 'caido') {
      sp.setFrame(base.sentadoFrente);
      sp.setAngle(-8);
      // o suspiro de quem sentou no chão: quase nada, mas não é estátua
      this.tweens.add({
        targets: sp, scaleY: escala * 0.97, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
      });
    } else {
      sp.setFrame(base.down);
      this.tweens.add({
        targets: sp, scaleY: escala * 1.02, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
      });
    }
  },

  /* sem balanço (partida de treino, save antigo): o placar de sempre */
  pintaPlacarAntigo: function (g) {
    var dias = GameState.diasInteiros();
    txtC(this, GW / 2, 200, String(dias), PAL.branco, 32);
    txtC(this, GW / 2, 280, dias === 1 ? 'DIA INTEIRO' : 'DIAS INTEIROS', PAL.cinza, 8);
    txtC(this, GW / 2, 300, 'RECORDE: ' + GameState.recorde(), PAL.cinzaEsc, 8);
    txtC(this, GW / 2, 336, this.titulo(GameState.stats), PAL.amarelo, 8)
      .setWordWrapWidth(GW - 32).setAlign('center');
  },

  /* ---------- a linha do tempo ----------
     A temporada numa fileira: número em cima, nota embaixo. A fase da vez
     tem contorno. Tocar numa antiga MARCA ela, e o botão grande vira
     REPETIR — marcar não faz nada sozinho, justamente porque repetir
     desfaz o que veio depois. */
  pintaLinhaDoTempo: function () {
    if (typeof Diario === 'undefined' || this.vista === 'temporada') return;
    var lista = Diario.lista();
    if (!lista.length) return;
    // só as últimas oito: a fase da vez é sempre a que tem que aparecer
    if (lista.length > TL.porFila) lista = lista.slice(lista.length - TL.porFila);
    var g = this.add.graphics().setDepth(1), eu = this, i;
    this.pastilhas = [];
    txt(this, TL.x0, TL.y - 16, 'A TEMPORADA', PAL.cinzaEsc, 8).setScale(ESCALA_TEXTO / 2).setDepth(2);
    for (i = 0; i < lista.length; i++) {
      var d = lista[i], x = TL.x0 + i * TL.passo;
      var atual = d.n === (GameState.dia || 1) || (this.bal && d.n === this.bal.dia);
      var cor = d.nota ? 0x1b2438 : 0x101018;
      g.fillStyle(cor, 1).fillRoundedRect(x, TL.y, TL.w, TL.h, 4);
      g.lineStyle(1, atual ? 0xf2c14e : 0x2a2a3a, 1).strokeRoundedRect(x + 0.5, TL.y + 0.5, TL.w - 1, TL.h - 1, 4);
      /* depth 2: o desenho da pastilha é depth 1, e texto sem depth
         nasce em 0 — a fileira aparecia vazia, com as chapas por cima
         dos próprios números. */
      txtC(this, x + TL.w / 2, TL.y + 3, String(d.n), PAL.cinza, 8)
        .setScale(ESCALA_TEXTO / 2).setDepth(2);
      txtC(this, x + TL.w / 2, TL.y + 11, d.nota || '-', d.nota ? PAL.branco : PAL.cinzaEsc, 8)
        .setDepth(2);
      var z = this.add.zone(x - 2, TL.y - 2, TL.w + 4, TL.h + 4).setOrigin(0, 0).setInteractive();
      (function (num) { z.on('pointerdown', function () { eu.marca(num); }); })(d.n);
      this.pastilhas.push({ n: d.n, x: x });
    }
    this.gTL = g;
    // a linha que diz o preço de repetir, escrita só quando há preço
    this.tPreco = txtC(this, GW / 2, TL.y + TL.h + 8, '', PAL.cinzaEsc, 8)
      .setScale(ESCALA_TEXTO / 2).setDepth(2);
  },

  marca: function (n, trancada) {
    if (this.saindo || typeof Diario === 'undefined') return;
    if (trancada) {
      this.tPreco.setText('A HISTÓRIA AINDA NÃO CHEGOU AQUI').setColor(PAL.cinzaEsc);
      return;
    }
    var atual = (GameState.dia || 1);
    // a fase de agora não precisa de foto: ela já é o estado do jogo
    if (n !== atual && !Diario.podeRepetir(n)) {
      this.tPreco.setText('FASE SEM REGISTRO: NÃO DÁ PRA VOLTAR').setColor(PAL.cinzaEsc);
      return;
    }
    this.escolhida = (this.escolhida === n) ? 0 : n;
    sfx('catraca');
    var q = (this.escolhida && this.escolhida !== atual) ? Diario.quantosDesfaz(this.escolhida) : 0;
    this.tPreco.setText(!this.escolhida ? ''
      : (q ? 'VOLTAR PRA ' + this.escolhida + ' DESFAZ ' + q + (q > 1 ? ' FASES' : ' FASE')
        : (this.escolhida === atual ? 'A FASE DE AGORA' : 'REPETIR A FASE ' + this.escolhida)))
      .setColor(q ? PAL.vermelho : PAL.cinza);
    this.pintaBotaoGrande();
  },

  montaBotoes: function (bom) {
    this.gBot = this.add.graphics().setDepth(1);
    this.bom = bom;
    this.tGr = txtC(this, FIM_BOT.xGr + FIM_BOT.gr / 2, FIM_BOT.y + 10, '', PAL.verde, 8).setDepth(3);
    txtC(this, FIM_BOT.xDir + FIM_BOT.pq / 2, FIM_BOT.y + 10, 'TROCAR', PAL.branco, 8).setDepth(3);
    this.tweens.add({ targets: this.tGr, alpha: 0.45, duration: 700, yoyo: true, repeat: -1 });
    this.pintaBotaoGrande();
    var eu = this;
    this.add.zone(FIM_BOT.xGr, FIM_BOT.y, FIM_BOT.gr, FIM_BOT.h)
      .setOrigin(0, 0).setInteractive().on('pointerdown', function () { eu.grande(); });
    this.add.zone(FIM_BOT.xDir, FIM_BOT.y, FIM_BOT.pq, FIM_BOT.h)
      .setOrigin(0, 0).setInteractive().on('pointerdown', function () { eu.trocar(); });
  },

  /* o botão grande muda de nome conforme o que está na mesa: seguir a
     campanha, tentar a fase de novo, ou voltar numa fase antiga */
  pintaBotaoGrande: function () {
    var g = this.gBot; g.clear();
    var repetir = !!this.escolhida;
    ladrilho(g, FIM_BOT.xGr, FIM_BOT.y, FIM_BOT.gr, FIM_BOT.h,
      repetir ? 0x43301b : 0x14432c, repetir ? 0x6e4d1d : 0x1d6e42, repetir ? 0xf2c14e : 0x00e676);
    ladrilho(g, FIM_BOT.xDir, FIM_BOT.y, FIM_BOT.pq, FIM_BOT.h, 0x1b2438, 0x2b3a58, 0x3d5180);
    /* 'REPETIR A 2' tem 13 caracteres e o ladrilho tem 146 pixels: a 12
       por letra são 156, e o texto encostava no TROCAR do lado. */
    var atual = this.escolhida === (GameState.dia || 1);
    this.tGr.setText(repetir
      ? (atual ? '► JOGAR A ' + this.escolhida : '► VOLTAR PRA ' + this.escolhida)
      : (this.bom ? '► CONTINUAR' : '► DE NOVO'))
      .setColor(repetir && !atual ? PAL.amarelo : PAL.verde);
  },

  grande: function () {
    // a fase de agora se joga direto; qualquer outra passa pelo diário
    if (this.escolhida && this.escolhida === (GameState.dia || 1)) this.continua();
    else if (this.escolhida) this.repete(this.escolhida);
    else if (this.bom) this.continua();
    else this.deNovo();
  },

  /* as cenas de trás ficaram paradas só pra servir de fundo */
  descongela: function () {
    var eu = this;
    this.congeladas.forEach(function (k) { eu.scene.stop(k); });
    this.congeladas = [];
  },

  // fase cumprida: a próxima já está montada, é só sair de casa
  continua: function () {
    if (this.saindo) return;
    this.saindo = true;
    audioOn(); sfx('ok');
    this.descongela();
    this.scene.start('Estacao', { onde: 'saguao' });
  },

  /* volta pra foto do começo daquela fase e apaga as seguintes
     (src/diario.js). O init vem antes porque o `aplica` escreve por cima
     de um personagem já montado. */
  repete: function (n) {
    if (this.saindo || typeof Diario === 'undefined') return;
    this.saindo = true;
    audioOn(); sfx('ok');
    this.descongela();
    GameState.init(GameState.charKey, GameState.genero);
    if (!Diario.volta(n)) { this.scene.start('Title'); return; }
    this.scene.start('Estacao', { onde: 'saguao' });
  },

  /* mesma pessoa, mesma fase, do começo */
  deNovo: function () {
    if (this.saindo) return;
    this.saindo = true;
    audioOn(); sfx('ok');
    this.descongela();
    var n = (this.bal && this.bal.dia) || GameState.dia || 1;
    GameState.init(GameState.charKey, GameState.genero);
    // com registro da fase, 'de novo' é repetir ELA, e não recomeçar a vida
    if (typeof Diario !== 'undefined' && Diario.podeRepetir(n)) Diario.volta(n);
    this.scene.start('Estacao', { onde: 'saguao' });
  },

  trocar: function () {
    if (this.saindo) return;
    this.saindo = true;
    sfx('catraca');
    this.descongela();
    this.scene.start('Title');
  },

  titulo: function (s) {
    if (GameState.diasInteiros() >= 5) return '"PASSE LIVRE VITALÍCIO"';
    if (GameState.diasInteiros() === 0) return '"NEM O PRIMEIRO DIA"';
    if (s.catracasPuladas > s.catracasPagas && s.catracasPuladas > 1) return '"BILHETE ÚNICO: O CORPO"';
    if (s.cedidos >= 4 && s.cedidos > s.recusas) return '"O SANTO DO VAGÃO"';
    if (s.disfarcesOk >= 3) return '"MESTRE DO CELULAR"';
    if (s.recusas >= 4) return '"SÃO PAULO VENCEU HOJE"';
    return '"PAULISTANO NÍVEL HARD"';
  },

  update: function () {
    Ctrl.update();
    // o comando de agir é o do botão grande: trocar tem que ser pedido
    if (Ctrl.actJust) this.grande();
  }
});
