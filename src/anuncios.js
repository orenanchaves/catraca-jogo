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
  ond: { linhas: ['OND VIAJAR', 'VIAJE MAIS.', 'PLANEJE MENOS.'], fundo: 0x0d0d14, borda: 0x7c3fff, titulo: '#00e676', letra: '#f0eeff' },
  anuncie: { linhas: ['ANUNCIE AQUI', 'ESTE ESPAÇO', 'ESTÁ LIVRE'], fundo: 0xf2c14e, borda: 0x14141c, titulo: '#14141c', letra: '#3a2a10' },
  dog: { linhas: ['DOG DO CÃO', 'O MONSTRO', 'DA ESTAÇÃO'], fundo: 0x2a2320, borda: 0xe8362c, titulo: '#f2c14e', letra: '#f0eeff' },
  loto: { linhas: ['LOTODIFÍCIL', 'ACUMULOU:', 'R$ 3 MILHÕES'], fundo: 0x1c4a8a, borda: 0xf2c14e, titulo: '#f2c14e', letra: '#f0eeff' },
  ceda: { linhas: ['METRÔ', 'CEDA O LUGAR', 'A QUEM PRECISA'], fundo: 0x0b5fae, borda: 0xf0eeff, titulo: '#f0eeff', letra: '#cfe0f5' },
  esquerda: { linhas: ['METRÔ', 'NA ESCADA,', 'ESQUERDA LIVRE'], fundo: 0x0b5fae, borda: 0xf0eeff, titulo: '#f0eeff', letra: '#cfe0f5' },
  ingles: { linhas: ['INGLÊS JÁ!', 'FLUENTE EM', '3 MESES*'], fundo: 0xe8362c, borda: 0xf0eeff, titulo: '#f0eeff', letra: '#ffe0dc' },
  pastel: { linhas: ['PASTELARIA', 'O DE CARNE É', 'O MAIS PEDIDO'], fundo: 0xf2c14e, borda: 0xb07a3a, titulo: '#8a2a10', letra: '#3a2a10' },
  boticaro: { linhas: ['O BOTICARO', 'PERFUME QUE', 'DURA O DIA'], fundo: 0x14281e, borda: 0x2f7d5e, titulo: '#7fd6a0', letra: '#f0eeff' }
};

/* Os espaços da Corinthians-Itaquera. x e y são o MEIO do cartaz; em pé
   ('vertical') ele é girado 90 graus pra caber na parede da plataforma. */
function espacosItaquera() {
  return [
    // na parede de cima do mezanino, dos dois lados da boca da escada
    { id: 'ITQ-MEZ-1', x: MEZ.x0 + 60, y: 78, tipo: 'estatico', anuncios: ['ceda'] },
    { id: 'ITQ-MEZ-2', x: 54, y: 78, tipo: 'digital', anuncios: ['ond', 'loto', 'ingles'] },
    { id: 'ITQ-MEZ-3', x: 266, y: 78, tipo: 'digital', anuncios: ['dog', 'boticaro', 'ond'] },
    { id: 'ITQ-MEZ-4', x: 360, y: 78, tipo: 'estatico', anuncios: ['anuncie'] },
    // na parede da plataforma, em pé, nos vãos entre as placas e os mapas
    { id: 'ITQ-PLAT-1', x: ITQ.paredeX + 14, y: PLAT_Y + 440, tipo: 'digital', vertical: true, anuncios: ['ond', 'pastel', 'esquerda'] },
    { id: 'ITQ-PLAT-2', x: ITQ.paredeX + 14, y: PLAT_Y + 670, tipo: 'estatico', vertical: true, anuncios: ['anuncie'] }
  ];
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
