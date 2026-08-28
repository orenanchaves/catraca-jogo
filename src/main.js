/* global Phaser */
/* Catraca — boot, carga de arte e configuração do jogo */

var ASSETS = {
  chars: [
    { key: 'ch_estudante', file: 'assets/chars/estudante.png', pal: PELES.estudante, corpo: 'bone_mochila' },
    { key: 'ch_clt', file: 'assets/chars/clt.png', pal: PELES.clt, corpo: 'padrao' },
    { key: 'ch_senhor', file: 'assets/chars/senhor.png', pal: PELES.senhor, corpo: 'senhor' },
    { key: 'ch_ambulante', file: 'assets/chars/ambulante.png', pal: PELES.ambulante, corpo: 'bone' },
    { key: 'ch_gestante', file: 'assets/chars/gestante.png', pal: PELES.gestanteJog, corpo: 'gestante' },
    { key: 'ch_turista', file: 'assets/chars/turista.png', pal: PELES.turista, corpo: 'bone_mochila' }
  ],
  npcs: [
    { key: 'np_idoso', file: 'assets/npcs/idoso.png', pal: PELES.idoso, corpo: 'senhor' },
    { key: 'np_gestante', file: 'assets/npcs/gestante.png', pal: PELES.gestante, corpo: 'gestante' },
    { key: 'np_mae_bebe', file: 'assets/npcs/mae_bebe.png', pal: PELES.colo0, corpo: 'colo_longo' },
    { key: 'np_guardinha', file: 'assets/npcs/guardinha.png', pal: PELES.guardinha, corpo: 'padrao' },
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
    { key: 'np_colo_b', file: 'assets/npcs/colo_b.png', pal: PELES.colo2, corpo: 'colo_longo' }
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
  scene: [BootScene, TitleScene, CatracaScene, PlataformaScene, VagaoScene, BaldeacaoScene, FimScene, HudScene, PausaScene]
};

window.addEventListener('load', function () {
  window.jogo = new Phaser.Game(config);
});
