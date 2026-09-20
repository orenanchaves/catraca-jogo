/* global Phaser */
/* Catraca — os espaços de propaganda das estações

   Estação de verdade é forrada de cartaz: os parados, de papel, e os
   painéis digitais que trocam de anúncio sozinhos. Aqui é igual, e com
   uma ideia de negócio junto: cada ESPAÇO tem nome (ITQ-MEZ-1,
   ITQ-PLAT-2...) e o que aparece nele é só um dado desta lista. Vender
   um espaço pra uma empresa é trocar os anúncios dele; espaço sem dono
   mostra ANUNCIE AQUI.

   Um anúncio são três linhas curtas (14 letras cabem na chapa de 90px,
   a 6px por letra) e três cores. Quando existir arte de verdade, ela
   entra como imagem pelo mesmo id, sem mexer em espaço nenhum. */

var ANUNCIOS = {
  // url: tocar no cartaz (quando é ele que está na tela) abre o site numa aba nova
  ond: { linhas: ['OND VIAJAR', 'VIAJE MAIS.', 'PLANEJE MENOS.'], fundo: 0x0d0d14, borda: 0x7c3fff, titulo: '#00e676', letra: '#f0eeff',
    url: 'https://ondviajar.com.br/' },
  anuncie: { linhas: ['ANUNCIE AQUI', 'ESTE ESPAÇO', 'ESTÁ LIVRE'], fundo: 0xf2c14e, borda: 0x14141c, titulo: '#14141c', letra: '#3a2a10' },
  dog: { linhas: ['DOG DO CÃO', 'O MONSTRO', 'DA ESTAÇÃO'], fundo: 0x2a2320, borda: 0xe8362c, titulo: '#f2c14e', letra: '#f0eeff' },
  loto: { linhas: ['LOTODIFÍCIL', 'ACUMULOU:', 'R$ 3 MILHÕES'], fundo: 0x1c4a8a, borda: 0xf2c14e, titulo: '#f2c14e', letra: '#f0eeff' },
  ceda: { linhas: ['METRÔ', 'CEDA O LUGAR', 'A QUEM PRECISA'], fundo: 0x0b5fae, borda: 0xf0eeff, titulo: '#f0eeff', letra: '#cfe0f5' },
  esquerda: { linhas: ['METRÔ', 'NA ESCADA,', 'ESQUERDA LIVRE'], fundo: 0x0b5fae, borda: 0xf0eeff, titulo: '#f0eeff', letra: '#cfe0f5' },
  ingles: { linhas: ['INGLÊS JÁ!', 'FLUENTE EM', '3 MESES*'], fundo: 0xe8362c, borda: 0xf0eeff, titulo: '#f0eeff', letra: '#ffe0dc' },
  pastel: { linhas: ['PASTELARIA', 'O DE CARNE É', 'O MAIS PEDIDO'], fundo: 0xf2c14e, borda: 0xb07a3a, titulo: '#8a2a10', letra: '#3a2a10' },
  boticaro: { linhas: ['O BOTICARO', 'PERFUME QUE', 'DURA O DIA'], fundo: 0x14281e, borda: 0x2f7d5e, titulo: '#7fd6a0', letra: '#f0eeff' }
};

/* ---------- os espaços da Corinthians-Itaquera ----------
   x e y são o MEIO do cartaz.

   'A placa tá sobrepondo.' Eram duas posições escritas à mão, e o
   comentário de então dizia que o elevador ia de 262 a 322. Ele mudou de
   lugar quando a escada fixa virou dupla (hoje 287..353), e o cartaz da
   direita, que vai de 327 a 417, passou a cobrir 26 pixels da caixa do
   elevador. Número cravado à mão envelhece calado.

   Agora o lugar é DERIVADO da parede: pega os pedaços de parede de cima
   (da quina até a boca da escada, e da escada até a outra quina), tira o
   que o elevador ocupa (`cortaVaos`, o mesmo corte que a faixa da linha
   usa) e pendura um cartaz em cada pedaço que comporte um. Hoje só o da
   esquerda comporta: à direita do elevador sobram 61 pixels, e o cartaz
   tem 90. Mudou a planta, o cartaz volta sozinho.

   Na parede da plataforma não vai nenhum: em pé, girado, o cartaz brigava
   com a faixa do nome e com o mapa, e ficava feio ('não rola tanto'). */
function espacosItaquera() {
  var LISTAS = [
    ['ond', 'ceda', 'loto', 'ingles'],
    ['dog', 'boticaro', 'ond', 'anuncie']
  ];
  var esq = MEZ.x0 + 26, dir = MEZ.x1 - 26;
  var direita = (typeof ESCADA_FIXA !== 'undefined' && ESCADA_FIXA ? ESCF_X1 : ESC_X1) + 10;
  var pedacos = [[esq, ESC_X0 - 10], [direita, dir]];
  if (typeof cortaVaos === 'function' && typeof vaosDoElevador === 'function') {
    pedacos = cortaVaos(pedacos, vaosDoElevador());
  }
  var out = [], i;
  for (i = 0; i < pedacos.length && out.length < LISTAS.length; i++) {
    var larg = pedacos[i][1] - pedacos[i][0];
    if (larg < CARTAZ.w + 8) continue;               // não cabe: nada pendurado
    out.push({
      id: 'ITQ-MEZ-' + (out.length + 1), y: 78, tipo: 'digital',
      x: Math.round((pedacos[i][0] + pedacos[i][1]) / 2),
      anuncios: LISTAS[out.length]
    });
  }
  return out;
}

var CARTAZ = { w: 90, h: 36 };   // 14 letras de 6px são 84: 3px de folga de cada lado

/* Monta os cartazes de uma estação. Cada um é um container (a chapa e as
   três linhas), girado quando é em pé. Os digitais ficam guardados na
   cena pra trocar de anúncio. */
function montaAnuncios(cena, espacos, prof) {
  cena.cartazes = [];
  for (var i = 0; i < espacos.length; i++) {
    var e = espacos[i];
    var g = cena.add.graphics();
    var ts = [];
    for (var l = 0; l < 3; l++) {
      ts.push(txtC(cena, 0, -CARTAZ.h / 2 + 3 + l * 10, '', PAL.branco, 8).setScale(ESCALA_TEXTO / 2));
    }
    var c = cena.add.container(e.x, e.y, [g].concat(ts)).setDepth(prof);
    if (e.vertical) c.setRotation(-Math.PI / 2);
    var cz = { e: e, g: g, ts: ts, c: c, idx: 0, t: Math.random() * 4000 };
    c.setSize(CARTAZ.w, CARTAZ.h).setInteractive();
    (function (cz) {
      cz.c.on('pointerdown', function () {
        var a = ANUNCIOS[cz.e.anuncios[cz.idx % cz.e.anuncios.length]];
        if (a && a.url) { try { window.open(a.url, '_blank', 'noopener'); } catch (err) { } }
      });
    })(cz);
    pintaCartaz(cz, 1);
    cena.cartazes.push(cz);
  }
}

function pintaCartaz(cz, brilho) {
  var a = ANUNCIOS[cz.e.anuncios[cz.idx % cz.e.anuncios.length]] || ANUNCIOS.anuncie;
  var g = cz.g, w = CARTAZ.w, h = CARTAZ.h, dig = cz.e.tipo === 'digital';
  g.clear();
  // a moldura: metal no estático, preta de tela no digital (com o LED aceso em cima)
  g.fillStyle(0x000000, 0.35).fillRect(-w / 2 + 2, -h / 2 + 3, w, h);
  g.fillStyle(dig ? 0x0a0a10 : num(PAL.metalSom), 1).fillRect(-w / 2 - 2, -h / 2 - 2, w + 4, h + 4);
  g.fillStyle(a.fundo, 1).fillRect(-w / 2, -h / 2, w, h);
  g.fillStyle(a.borda, 1).fillRect(-w / 2, -h / 2, w, 2).fillRect(-w / 2, h / 2 - 2, w, 2);
  if (dig) {
    // a tela brilha um pouco e tem as linhas de varredura
    g.fillStyle(0xffffff, 0.06 * brilho).fillRect(-w / 2, -h / 2, w, h / 2);
    g.fillStyle(0x000000, 0.12);
    for (var y = -h / 2 + 1; y < h / 2; y += 3) g.fillRect(-w / 2, y, w, 1);
    g.fillStyle(0x00e676, 1).fillRect(w / 2 - 5, -h / 2 - 2, 3, 1);
  }
  for (var l = 0; l < 3; l++) cz.ts[l].setText(a.linhas[l] || '').setColor(l ? a.letra : a.titulo);
}

/* O digital troca de anúncio a cada 4 segundos, com um piscar de tela
   (80ms) no meio da troca, que é como painel de LED muda. */
function atualizaAnuncios(cena, dt) {
  if (!cena.cartazes) return;
  for (var i = 0; i < cena.cartazes.length; i++) {
    var cz = cena.cartazes[i];
    if (cz.e.tipo !== 'digital' || cz.e.anuncios.length < 2) continue;
    cz.t += dt;
    if (cz.t > 4000) {
      cz.t = 0; cz.idx++;
      pintaCartaz(cz, 1);
      cz.c.setAlpha(0.3);
      cz.piscou = 80;
    } else if (cz.piscou > 0) {
      cz.piscou -= dt;
      if (cz.piscou <= 0) cz.c.setAlpha(1);
    }
  }
}
