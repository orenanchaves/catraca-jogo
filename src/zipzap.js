/* global Phaser */
/* Catraca — a rotina de cada um, e o ZipZap que a bagunça

   O dia era sempre o mesmo: casa → trabalho → casa. Duas pernas, dois
   horários, um destino cada, iguais pros seis personagens. Quem você
   escolhia mudava a dificuldade do caminho, nunca o caminho.

   Aqui o dia vira uma lista de pernas, uma por personagem: o estudante
   tem estágio de manhã, faculdade à tarde e volta pra casa quase na
   hora de fechar o metrô; o ambulante compra muamba no Brás antes de
   vender no centro; o idoso vai ao banco, à casa do neto e volta.

   E por cima disso vem o ZipZap, que é onde a vida atrapalha o
   trajeto: a mãe pede pra passar na farmácia, o chefe antecipa a
   reunião, a resenha muda de bar. Cada conversa que você aceita troca
   o destino da perna — e é isso que faz o trajeto variar. */

/* ---------- a rotina ----------
   Cada perna tem um rótulo (o que você vai fazer), uma estação e a
   hora de sair. A última perna do dia é sempre casa: o jogo é sobre
   voltar. */
var ROTINAS = {
  estudante: [
    { rotulo: 'O ESTÁGIO', estacao: 'PARAÍSO', saida: 6 * 60 + 50 },
    { rotulo: 'A FACULDADE', estacao: 'VERGUEIRO', saida: 13 * 60 + 10 },
    { rotulo: 'CASA', estacao: CASA, saida: 22 * 60 + 40 }
  ],
  clt: [
    { rotulo: 'O TRABALHO', estacao: TRABALHO, saida: 6 * 60 + 20 },
    { rotulo: 'CASA', estacao: CASA, saida: 18 * 60 + 40 }
  ],
  senhor: [
    { rotulo: 'O BANCO', estacao: 'SANTANA', saida: 8 * 60 + 40 },
    { rotulo: 'A CASA DO NETO', estacao: 'PENHA', saida: 14 * 60 + 20 },
    { rotulo: 'CASA', estacao: CASA, saida: 19 * 60 }
  ],
  ambulante: [
    { rotulo: 'COMPRAR MUAMBA', estacao: 'BRÁS', saida: 6 * 60 },
    { rotulo: 'VENDER NO CENTRO', estacao: 'REPÚBLICA', saida: 10 * 60 + 30 },
    { rotulo: 'CASA', estacao: CASA, saida: 19 * 60 + 30 }
  ],
  gestante: [
    { rotulo: 'O TRABALHO', estacao: 'ANA ROSA', saida: 7 * 60 + 10 },
    { rotulo: 'A CONSULTA', estacao: 'SANTA CRUZ', saida: 15 * 60 },
    { rotulo: 'CASA', estacao: CASA, saida: 18 * 60 + 50 }
  ],
  turista: [
    { rotulo: 'A PINACOTECA', estacao: 'LUZ', saida: 9 * 60 + 30 },
    { rotulo: 'O MERCADÃO', estacao: 'PEDRO II', saida: 14 * 60 },
    { rotulo: 'CASA', estacao: CASA, saida: 20 * 60 }
  ]
};

function rotinaDe(k) { return ROTINAS[k] || ROTINAS.clt; }

/* ---------- os contatos ----------
   Cada personagem tem a sua gente, e a gente dele fala do jeito dele.
   O que muda o jogo é o campo `vai`: conversa com `vai` traz um
   compromisso, e aceitar troca a estação de destino da perna.

   As mensagens são curtas de propósito: a tela do celular tem 240
   pixels de largura útil, e a fonte gasta 12 por caractere. */
var CONTATOS = {
  estudante: [
    {
      nome: 'MÃE', conversas: [
        { msgs: ['Filho, passa na farmácia', 'da Vila Mariana e traz', 'o remédio do seu pai'],
          vai: { rotulo: 'A FARMÁCIA', estacao: 'VILA MARIANA' } },
        { msgs: ['Ta chegando que horas?', 'Deixei comida no fogão'] },
        { msgs: ['Vc almoçou??', 'Responde a mãe'] }
      ]
    },
    {
      nome: 'PAI', conversas: [
        { msgs: ['Vem no Tatuapé depois', 'que eu te dou carona', 'pra casa'],
          vai: { rotulo: 'A CARONA DO PAI', estacao: 'TATUAPÉ' } },
        { msgs: ['Bom dia', 'Bom dia'] }
      ]
    },
    {
      nome: 'BIA ❤', conversas: [
        { msgs: ['Amor, me encontra na', 'Santa Cruz? To saindo', 'do cursinho agora'],
          vai: { rotulo: 'ENCONTRAR A BIA', estacao: 'SANTA CRUZ' } },
        { msgs: ['Boa sorte no estágio!'] },
        { msgs: ['Vc sumiu hein'] }
      ]
    },
    {
      nome: 'ROLÊ DA FACUL', grupo: true, conversas: [
        { msgs: ['Alguém topa Liberdade', 'depois da aula?', 'Tem pastel de feira'],
          vai: { rotulo: 'O ROLÊ', estacao: 'LIBERDADE' } },
        { msgs: ['Prova adiada!!!', 'GRAÇAS A DEUS'] }
      ]
    }
  ],

  clt: [
    {
      nome: 'ESPOSA', conversas: [
        { msgs: ['Amor, passa no mercado', 'do Belém na volta?', 'Acabou o café'],
          vai: { rotulo: 'O MERCADO', estacao: 'BELÉM' } },
        { msgs: ['Chega que horas hj?'] },
        { msgs: ['Te amo', 'Tbm te amo'] }
      ]
    },
    {
      nome: 'CHEFE', conversas: [
        { msgs: ['Reunião antecipada.', 'Preciso de vc na São', 'Joaquim às 9h'],
          vai: { rotulo: 'A REUNIÃO', estacao: 'SÃO JOAQUIM' } },
        { msgs: ['Manda o relatório hj'] }
      ]
    },
    {
      nome: 'FAMÍLIA ❤', grupo: true, conversas: [
        { msgs: ['BOM DIAAA FAMÍLIA', 'Bom dia', 'Bom dia', '(mais 14 mensagens)'] },
        { msgs: ['Almoço domingo na', 'casa da tia, Carrão'],
          vai: { rotulo: 'O ALMOÇO', estacao: 'CARRÃO' } }
      ]
    },
    {
      nome: 'TIO ZEZÉ', conversas: [
        { msgs: ['sobrinho vc viu aquilo', 'do vídeo que eu mandei'] },
        { msgs: ['me busca na Penha?', 'meu carro quebrou'],
          vai: { rotulo: 'BUSCAR O TIO', estacao: 'PENHA' } }
      ]
    },
    {
      nome: 'PRIMO DISTANTE', conversas: [
        { msgs: ['fala primo', 'tudo bem?', 'preciso de um favor'] }
      ]
    }
  ],

  senhor: [
    {
      nome: 'BAILE FLASHBACK', grupo: true, conversas: [
        { msgs: ['Hoje tem baile no', 'salão da Santana!', 'Chega 7h em ponto'],
          vai: { rotulo: 'O BAILE', estacao: 'SANTANA' } },
        { msgs: ['Foto do baile passado', '(imagem)'] }
      ]
    },
    {
      nome: 'FILHA', conversas: [
        { msgs: ['Pai, o senhor tomou', 'o remédio?'] },
        { msgs: ['Vem almoçar aqui na', 'Vila Matilde hoje?'],
          vai: { rotulo: 'O ALMOÇO NA FILHA', estacao: 'VILA MATILDE' } }
      ]
    },
    {
      nome: 'TURMA DA FACUL 68', grupo: true, conversas: [
        { msgs: ['Reunião da turma!', 'Bar de sempre, Liberdade'],
          vai: { rotulo: 'A TURMA', estacao: 'LIBERDADE' } },
        { msgs: ['O Nelson faleceu', 'Que Deus o tenha'] }
      ]
    },
    {
      nome: 'IRMÃO', conversas: [
        { msgs: ['Tá vivo?', 'Tô'] },
        { msgs: ['Me encontra no Brás', 'que eu te mostro uma', 'coisa'],
          vai: { rotulo: 'O IRMÃO', estacao: 'BRÁS' } }
      ]
    },
    {
      nome: 'NETO', conversas: [
        { msgs: ['vô vem me buscar', 'na escola da Penha'],
          vai: { rotulo: 'BUSCAR O NETO', estacao: 'PENHA' } },
        { msgs: ['vô o senhor sabe jogar', 'videogame?'] }
      ]
    }
  ],

  ambulante: [
    {
      nome: 'FORNECEDOR', conversas: [
        { msgs: ['Chegou carregamento', 'novo. Te espero no Brás', 'até meio-dia'],
          vai: { rotulo: 'A MUAMBA', estacao: 'BRÁS' } },
        { msgs: ['Acabou o chocolate', 'Só tem bala'] }
      ]
    },
    {
      nome: 'RESENHA DA QUEBRADA', grupo: true, conversas: [
        { msgs: ['Resenha hoje no', 'Belém, colou?'],
          vai: { rotulo: 'A RESENHA', estacao: 'BELÉM' } },
        { msgs: ['tá osso hj', 'tá osso todo dia'] }
      ]
    },
    {
      nome: 'PARCEIRO DE VAGÃO', conversas: [
        { msgs: ['fiscal tá na Sé hj', 'passa longe'] },
        { msgs: ['me arruma 20 conto?', 'te pago sexta'] }
      ]
    },
    {
      nome: 'MÃE', conversas: [
        { msgs: ['meu filho vc comeu?'] },
        { msgs: ['passa aqui na Penha', 'antes de ir pra casa'],
          vai: { rotulo: 'A CASA DA MÃE', estacao: 'PENHA' } }
      ]
    }
  ],

  gestante: [
    {
      nome: 'MARIDO', conversas: [
        { msgs: ['Amor, te busco na', 'Ana Rosa às 6?'],
          vai: { rotulo: 'O MARIDO', estacao: 'ANA ROSA' } },
        { msgs: ['Como vc tá se sentindo?'] }
      ]
    },
    {
      nome: 'DRA. HELENA', conversas: [
        { msgs: ['Consulta remarcada pra', 'hoje, Santa Cruz, 15h'],
          vai: { rotulo: 'A CONSULTA', estacao: 'SANTA CRUZ' } }
      ]
    },
    {
      nome: 'CHÁ DE BEBÊ', grupo: true, conversas: [
        { msgs: ['Meninas, decidimos:', 'chá no Tatuapé sábado'],
          vai: { rotulo: 'O CHÁ DE BEBÊ', estacao: 'TATUAPÉ' } },
        { msgs: ['que fofoooo', '(imagem)'] }
      ]
    }
  ],

  turista: [
    {
      nome: 'HOSTEL SP', conversas: [
        { msgs: ['Check-out is at 11!', 'Sua mochila tá aqui'] },
        { msgs: ['Tem festa na', 'República hoje'],
          vai: { rotulo: 'A FESTA', estacao: 'REPÚBLICA' } }
      ]
    },
    {
      nome: 'GUIA DO ROLÊ', conversas: [
        { msgs: ['Mercadão é PEDRO II,', 'não é Sé! Todo mundo', 'erra isso'],
          vai: { rotulo: 'O MERCADÃO', estacao: 'PEDRO II' } },
        { msgs: ['Cuidado com o celular'] }
      ]
    },
    {
      nome: 'MOM', conversas: [
        { msgs: ['Are you safe?', 'Call me please'] },
        { msgs: ['I saw the news', 'Please come home'] }
      ]
    }
  ]
};

function contatosDe(k) { return CONTATOS[k] || CONTATOS.clt; }

/* ---------- a caixa de entrada de uma perna ----------
   Uma perna começa com um punhado de conversas. No máximo uma delas
   traz compromisso: duas mudanças de destino na mesma viagem viraria
   sorteio, não decisão. */
function montaZap(charKey) {
  var lista = contatosDe(charKey);
  var caixa = [];
  var comVai = [], semVai = [], i, j;

  for (i = 0; i < lista.length; i++) {
    for (j = 0; j < lista[i].conversas.length; j++) {
      var item = { contato: lista[i], conversa: lista[i].conversas[j] };
      if (lista[i].conversas[j].vai) comVai.push(item); else semVai.push(item);
    }
  }
  Phaser.Utils.Array.Shuffle(comVai);
  Phaser.Utils.Array.Shuffle(semVai);

  /* Um contato por caixa: a mesma pessoa aparecendo duas vezes na lista
     lê como defeito, não como duas conversas. */
  var usados = {};
  var quantasFiadas = 2 + Math.floor(Math.random() * 2);

  // 55% das pernas trazem um compromisso; o resto é só conversa fiada
  if (comVai.length && Math.random() < 0.55) {
    caixa.push(novoFio(comVai[0], true));
    usados[comVai[0].contato.nome] = true;
  }
  for (i = 0; i < semVai.length && caixa.length <= quantasFiadas; i++) {
    if (usados[semVai[i].contato.nome]) continue;
    usados[semVai[i].contato.nome] = true;
    caixa.push(novoFio(semVai[i], false));
  }

  Phaser.Utils.Array.Shuffle(caixa);
  return caixa;
}

function novoFio(item, temVai) {
  return {
    nome: item.contato.nome,
    grupo: !!item.contato.grupo,
    msgs: item.conversa.msgs.slice(0),
    vai: temVai ? item.conversa.vai : null,
    lida: false,
    aceito: false
  };
}

function naoLidas(caixa) {
  var n = 0;
  for (var i = 0; i < (caixa || []).length; i++) if (!caixa[i].lida) n++;
  return n;
}
