/* global Phaser */
/* Catraca — boot, carga de arte e configuração do jogo */

/* A ficha de arte de cada jogável sai do próprio elenco, não de uma
   lista à parte: cada personagem tem uma versão por gênero (ver
   CHARS[k].visual), e manter as duas listas em dia à mão seria pedir
   pra elas discordarem. Sai uma folha por versão — 'ch_estudante_m',
   'ch_estudante_f' — e quem só tem um gênero só gera uma. */
function fichasDosJogaveis() {
  var out = [], k, g;
  for (k in CHARS) {
    var gs = generosDe(k);
    for (var i = 0; i < gs.length; i++) {
      g = gs[i];
      var v = CHARS[k].visual[g];
      if (CHARS[k].times) {
        for (var t in TIMES) {
          out.push({
            key: 'ch_' + k + '_' + g + '_' + t,
            file: 'assets/chars/' + k + '_' + g + '_' + t + '.png',
            pal: paletaDoTime(PELES[v.pal], t, g), corpo: corpoDoTorcedor(g, t)
          });
        }
        continue;
      }
      out.push({
        key: 'ch_' + k + '_' + g,
        file: 'assets/chars/' + k + '_' + g + '.png',
        pal: PELES[v.pal], corpo: v.corpo
      });
    }
  }
  return out;
}

var ASSETS = {
  chars: fichasDosJogaveis(),
  npcs: [
    { key: 'np_idoso', file: 'assets/npcs/idoso.png', pal: PELES.idoso, corpo: 'senhor' },
    { key: 'np_gestante', file: 'assets/npcs/gestante.png', pal: PELES.gestante, corpo: 'gestante' },
    { key: 'np_mae_bebe', file: 'assets/npcs/mae_bebe.png', pal: PELES.colo0, corpo: 'colo_longo' },
    /* Os três uniformes do metrô: azul com azul é o menorzinho, azul
       com bege é o do meio, e preto todo é o grandão. */
    { key: 'np_guardinha', file: 'assets/npcs/guardinha.png', pal: PELES.guardinha, corpo: 'padrao' },
    { key: 'np_guarda_medio', file: 'assets/npcs/guarda_medio.png', pal: PELES.guardaMedio, corpo: 'careca' },
    { key: 'np_guarda_forte', file: 'assets/npcs/guarda_forte.png', pal: PELES.guardaForte, corpo: 'volumoso' },
    { key: 'np_rimador', file: 'assets/npcs/rimador.png', pal: PELES.rimador, corpo: 'bone' },
    { key: 'np_pedinte', file: 'assets/npcs/pedinte.png', pal: PELES.pedinte, corpo: 'pedinte' },
    { key: 'np_pedinte_b', file: 'assets/npcs/pedinte_b.png', pal: PELES.pedinte2, corpo: 'pedinte' },
    { key: 'np_ambulante_a', file: 'assets/npcs/ambulante_npc_a.png', pal: PELES.ambulanteNpc, corpo: 'mochila' },
    { key: 'np_ambulante_b', file: 'assets/npcs/ambulante_npc_b.png', pal: PELES.gestante, corpo: 'longo' },
    { key: 'np_ambulante_c', file: 'assets/npcs/ambulante_npc_c.png', pal: PELES.pax2, corpo: 'volumoso' },

    /* a multidão: mesmo corpo base, gente diferente.
       Homens e mulheres, de saia e de calça, com criança de colo,
       senhores de bengala, estudante de mochila e grávida. */
    { key: 'np_pax0', file: 'assets/npcs/pax_01.png', pal: PELES.pax0, corpo: 'careca_celular' },
    { key: 'np_pax1', file: 'assets/npcs/pax_02.png', pal: PELES.pax1, corpo: 'bolsa' },
    { key: 'np_pax2', file: 'assets/npcs/pax_03.png', pal: PELES.pax2, corpo: 'volumoso' },
    { key: 'np_pax3', file: 'assets/npcs/pax_04.png', pal: PELES.pax3, corpo: 'coque_saia' },
    { key: 'np_pax4', file: 'assets/npcs/pax_05.png', pal: PELES.pax4, corpo: 'bolsa_curto' },
    { key: 'np_pax5', file: 'assets/npcs/pax_06.png', pal: PELES.pax5, corpo: 'rabo' },
    { key: 'np_pax6', file: 'assets/npcs/pax_07.png', pal: PELES.pax6, corpo: 'bone_mochila' },
    { key: 'np_pax7', file: 'assets/npcs/pax_08.png', pal: PELES.pax7, corpo: 'saia_bolsa' },
    { key: 'np_pax8', file: 'assets/npcs/pax_09.png', pal: PELES.pax8, corpo: 'volumoso_bolsa' },
    { key: 'np_pax9', file: 'assets/npcs/pax_10.png', pal: PELES.pax9, corpo: 'rabo_mochila' },
    { key: 'np_pax10', file: 'assets/npcs/pax_11.png', pal: PELES.pax10, corpo: 'careca' },
    { key: 'np_pax11', file: 'assets/npcs/pax_12.png', pal: PELES.pax11, corpo: 'coque' },
    { key: 'np_senhora', file: 'assets/npcs/senhora.png', pal: PELES.senhora, corpo: 'senhora_coque' },
    { key: 'np_senhor_b', file: 'assets/npcs/senhor_b.png', pal: PELES.senhorB, corpo: 'senhor_grisalho' },
    { key: 'np_colo_a', file: 'assets/npcs/colo_a.png', pal: PELES.colo1, corpo: 'colo' },
    { key: 'np_colo_b', file: 'assets/npcs/colo_b.png', pal: PELES.colo2, corpo: 'colo_longo' },

    /* Os desafiantes: a roupa diz o tipo antes de ele abrir a boca, que é
       como se aprende a ler treinador no Pokémon. Provisórios até a arte. */
    { key: 'np_tiozao', file: 'assets/npcs/tiozao.png', pal: PELES.tiozao, corpo: 'careca_celular' },
    { key: 'np_pregador', file: 'assets/npcs/pregador.png', pal: PELES.pregador, corpo: 'padrao' },
    { key: 'np_torcedor', file: 'assets/npcs/torcedor.png', pal: PELES.torcedor, corpo: 'palmeiras' },
    { key: 'np_corintiano', file: 'assets/npcs/corintiano.png', pal: PELES.corintiano, corpo: 'touca_corinthians' },
    { key: 'np_atendente', file: 'assets/npcs/atendente.png', pal: PELES.atendente, corpo: 'atendente' },
    { key: 'np_atendenteF', file: 'assets/npcs/atendente_f.png', pal: PELES.atendenteF, corpo: 'atendente_coque' },
    { key: 'np_saopaulino', file: 'assets/npcs/saopaulino.png', pal: PELES.saopaulino, corpo: 'careca_saopaulo' },
    { key: 'np_santista', file: 'assets/npcs/santista.png', pal: PELES.santista, corpo: 'moicano_santos' },
    // os cosplayers da Liberdade
    { key: 'np_cos_marinheira', file: 'assets/npcs/cos_marinheira.png', pal: PELES.cosMarinheira, corpo: 'cos_marinheira' },
    { key: 'np_cos_akatsuki', file: 'assets/npcs/cos_akatsuki.png', pal: PELES.cosAkatsuki, corpo: 'cos_akatsuki' },
    { key: 'np_cos_naruto', file: 'assets/npcs/cos_naruto.png', pal: PELES.cosNaruto, corpo: 'cos_naruto' },
    { key: 'np_cos_sasuke', file: 'assets/npcs/cos_sasuke.png', pal: PELES.cosSasuke, corpo: 'cos_sasuke' },
    { key: 'np_cos_sakura', file: 'assets/npcs/cos_sakura.png', pal: PELES.cosSakura, corpo: 'cos_sakura' }
  ]
};

/* quem aparece na multidão, e com que frequência.
   Peso alto = gente comum de passagem; peso baixo = quem chama atenção. */
var MULTIDAO = [
  { key: 'np_pax0', peso: 10 }, { key: 'np_pax1', peso: 10 },
  { key: 'np_pax2', peso: 10 }, { key: 'np_pax3', peso: 8 },
  { key: 'np_pax4', peso: 10 }, { key: 'np_pax5', peso: 10 },
  { key: 'np_pax6', peso: 9 }, { key: 'np_pax7', peso: 8 },
  { key: 'np_pax8', peso: 7 }, { key: 'np_pax9', peso: 9 },
  { key: 'np_pax10', peso: 9 }, { key: 'np_pax11', peso: 9 },
  { key: 'np_senhora', peso: 5 }, { key: 'np_senhor_b', peso: 5 },
  { key: 'np_colo_a', peso: 4 }, { key: 'np_colo_b', peso: 4 },
  { key: 'np_gestante', peso: 3 }, { key: 'np_idoso', peso: 3 }
];
var PESO_TOTAL = 0;
(function somaPesos() {
  for (var i = 0; i < MULTIDAO.length; i++) PESO_TOTAL += MULTIDAO[i].peso;
})();

/* sorteia um passageiro respeitando os pesos */
function sorteiaPax() {
  /* Na Liberdade, um em cada quatro é cosplayer indo pro evento: na
     estação e no vagão parado nela */
  if (typeof GameState !== 'undefined' && GameState.char && GameState.estacaoAtual() === 'LIBERDADE' && Math.random() < 0.25) {
    return COSPLAYERS[Math.floor(Math.random() * COSPLAYERS.length)];
  }
  var r = Math.random() * PESO_TOTAL;
  for (var i = 0; i < MULTIDAO.length; i++) {
    r -= MULTIDAO[i].peso;
    if (r <= 0) return MULTIDAO[i].key;
  }
  return MULTIDAO[0].key;
}

var PEDINTE_KEYS = ['np_pedinte', 'np_pedinte_b'];

var BootScene = new Phaser.Class({
  Extends: Phaser.Scene,
  initialize: function BootScene() { Phaser.Scene.call(this, { key: 'Boot' }); },

  preload: function () {
    // A arte é opcional: se o PNG não existir, o jogo gera um placeholder.
    geraFonte(this);
    this.load.on('loaderror', function () { /* silêncio proposital */ });
    var todos = ASSETS.chars.concat(ASSETS.npcs);
    for (var i = 0; i < todos.length; i++) {
      this.load.spritesheet(todos[i].key, todos[i].file, { frameWidth: 32, frameHeight: 48 });
    }
    var g = this.add.graphics();
    g.fillStyle(0x0b5fae, 1).fillRect(GW / 2 - 60, GH / 2, 120, 6);
    txtC(this, GW / 2, GH / 2 - 40, 'CATRACA', PAL.branco, 24);
  },

  create: function () {
    var todos = ASSETS.chars.concat(ASSETS.npcs);
    var geradas = 0;
    for (var i = 0; i < todos.length; i++) {
      if (!this.textures.exists(todos[i].key)) {
        geraSheet(this, todos[i].key, todos[i].pal, todos[i].corpo);
        geradas++;
      }
    }
    console.log('[Catraca] arte: ' + (todos.length - geradas) + ' PNG · ' + geradas + ' placeholder');
    this.scene.launch('Hud');
    this.scene.start('Title');
  }
});

var config = {
  type: Phaser.AUTO,
  width: GW,
  height: GH,
  parent: 'game',
  backgroundColor: PAL.bg,
  pixelArt: true,
  roundPixels: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  /* A ordem aqui é a ordem de DESENHO, e cena pausada continua sendo
     desenhada: o treino fica logo depois do título, senão a lista dele
     aparece por cima da briga que ela mesma abriu. */
  scene: [BootScene, TitleScene, TreinoScene, EstacaoScene, VagaoScene, BaldeacaoScene, FimScene,
    HudScene, TutorialScene, PausaScene, ZapScene, EncaradaScene, DisputaScene, BrigaScene,
    // o desafio desenha só o painel, por cima do vagão com zoom: tem que vir por último
    DesafioScene]
};

window.addEventListener('load', function () {
  window.jogo = new Phaser.Game(config);
});
