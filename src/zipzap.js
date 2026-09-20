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
    { rotulo: 'A UNIPA', estacao: 'VERGUEIRO', saida: 13 * 60 + 10 },
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
  cadeirante: [
    { rotulo: 'O TRABALHO', estacao: 'REPÚBLICA', saida: 7 * 60 + 10 },
    { rotulo: 'O BASQUETE', estacao: 'TATUAPÉ', saida: 17 * 60 },
    { rotulo: 'CASA', estacao: CASA, saida: 21 * 60 }
  ],
  torcedor: [
    { rotulo: 'O TRAMPO', estacao: 'BRÁS', saida: 7 * 60 },
    { rotulo: 'O BAR DO JOGO', estacao: 'TATUAPÉ', saida: 17 * 60 + 30 },
    { rotulo: 'CASA', estacao: CASA, saida: 22 * 60 }
  ],
  turista: [
    { rotulo: 'A PINACOTECA', estacao: 'LUZ', saida: 9 * 60 + 30 },
    { rotulo: 'O MERCADÃO', estacao: 'PEDRO II', saida: 14 * 60 },
    { rotulo: 'CASA', estacao: CASA, saida: 20 * 60 }
  ]
};

/* A perna 'CASA' vai pra casa de quem joga (CASA muda com o personagem:
   o palmeirense mora na Barra Funda), e não pra que era casa quando a
   lista foi escrita. */
function rotinaDe(k) {
  return (ROTINAS[k] || ROTINAS.clt).map(function (p) {
    return p.rotulo === 'CASA' ? { rotulo: 'CASA', estacao: CASA, saida: p.saida } : p;
  });
}

/* ---------- os contatos ----------
   Cada personagem tem a sua gente, e a gente dele fala do jeito dele.
   O que muda o jogo é o campo `vai`: conversa com `vai` traz um
   compromisso, e aceitar troca a estação de destino da perna.

   As mensagens são curtas de propósito: a tela do celular tem 240
   pixels de largura útil, e a fonte gasta 12 por caractere. */
/* O que VOCÊ manda de volta. O ZipZap era um mural: a mensagem chegava,
   você aceitava, e a sua resposta nunca existia — o que fazia a
   conversa parecer um aviso do sistema com nome de gente.

   Toda conversa tem resposta, e conversa com compromisso tem as duas: a
   de quem vai e a de quem não vai. Cada personagem responde do jeito
   dele, e quando a conversa não diz qual é, cai numa destas. */
/* Curtas por obrigação: o botão da resposta tem 236 pixels úteis, e a
   fonte gasta 12 por caractere — dezessete letras, contando a seta. */
var RESPOSTA_PADRAO = {
  estudante: { sim: 'blz, tô indo', nao: 'hj não dá', ok: 'kkkk' },
  clt: { sim: 'Ok, estou indo', nao: 'Hoje não dá', ok: 'Certo' },
  senhor: { sim: 'Pode deixar', nao: 'Hoje não, filho', ok: 'Que bom' },
  ambulante: { sim: 'tamo junto', nao: 'hj tô na correria', ok: 'salve salve' },
  gestante: { sim: 'Tá bom, eu vou', nao: 'Hoje não dá, amor', ok: 'Obrigada' },
  turista: { sim: 'Ok! I go there', nao: 'Not today, sorry', ok: 'Nice!' },
  torcedor: { sim: 'bora, tô indo', nao: 'hj não, mano', ok: 'é nóis' },
  cadeirante: { sim: 'Beleza, tô indo', nao: 'Hoje não rola', ok: 'Valeu!' }
};
function respostaPadrao(k) { return RESPOSTA_PADRAO[k] || RESPOSTA_PADRAO.clt; }

var CONTATOS = {
  estudante: [
    {
      nome: 'MÃE', foto: 'np_mae_est', conversas: [
        { msgs: ['Filh{o|a}, passa na farmácia', 'da Vila Mariana e traz', 'o remédio do seu pai'],
          vai: { rotulo: 'A FARMÁCIA', estacao: 'VILA MARIANA' }, resSim: 'passo lá, mãe', resNao: 'hj não dá, mãe' },
        { msgs: ['Ta chegando que horas?', 'Deixei comida no fogão'], resOk: 'lá pelas 23h', hora: [17 * 60, 23 * 60] },
        { msgs: ['Vc almoçou??', 'Responde a mãe'], resOk: 'almocei sim, mãe', hora: [12 * 60, 16 * 60] }
      ]
    },
    {
      nome: 'PAI', foto: 'np_pai_est', conversas: [
        { msgs: ['Vem no Tatuapé depois', 'que eu te dou carona', 'pra casa'],
          vai: { rotulo: 'A CARONA DO PAI', estacao: 'TATUAPÉ' }, resSim: 'fechou, pai!', resNao: 'hj não, pai' },
        { msgs: ['Bom dia', 'Bom dia'], resOk: 'bom dia, pai', hora: [4 * 60, 10 * 60] }
      ]
    },
    {
      nome: 'BIA ❤', foto: 'np_bia', conversas: [
        { msgs: ['Amor, me encontra na', 'Santa Cruz? To saindo', 'do cursinho agora'],
          vai: { rotulo: 'ENCONTRAR A BIA', estacao: 'SANTA CRUZ' }, resSim: 'tô indo, amor', resNao: 'hj não dá, amor' },
        { msgs: ['Boa sorte no estágio!'], resOk: 'valeu, amor! ❤' },
        { msgs: ['Vc sumiu hein'], resOk: 'correria, amor' }
      ]
    },
    {
      // a faculdade do estudante é a UNIPA (a referência é a Unip)
      nome: 'ROLÊ DA UNIPA', grupo: true, icone: 'capelo', conversas: [
        { msgs: ['Alguém topa Liberdade', 'depois da aula?', 'Tem pastel de feira'],
          vai: { rotulo: 'O ROLÊ', estacao: 'LIBERDADE' }, resSim: 'bora! tô dentro', resNao: 'hj não rola' },
        { msgs: ['Prova adiada!!!', 'GRAÇAS A DEUS'], resOk: 'AMÉM!!!' }
      ]
    }
  ],

  clt: [
    {
      nome: { m: 'ESPOSA', f: 'MARIDO' }, conversas: [
        { msgs: ['Amor, passa no mercado', 'do Belém na volta?', 'Acabou o café'],
          vai: { rotulo: 'O MERCADO', estacao: 'BELÉM' }, resSim: 'Passo lá, amor', resNao: 'Hoje não dá' },
        { msgs: ['Chega que horas hj?'], resOk: 'Lá pelas 19h', hora: [16 * 60, 23 * 60] },
        { msgs: ['Te amo', 'Tbm te amo'], resOk: 'Te amo mais ❤' }
      ]
    },
    {
      nome: 'CHEFE', conversas: [
        { msgs: ['Reunião antecipada.', 'Preciso de vc na São', 'Joaquim às 9h'],
          vai: { rotulo: 'A REUNIÃO', estacao: 'SÃO JOAQUIM' }, resSim: 'Estarei lá', resNao: 'Hoje não consigo' },
        { msgs: ['Manda o relatório hj'], resOk: 'Mando até as 18h' }
      ]
    },
    {
      nome: 'FAMÍLIA ❤', grupo: true, icone: 'casa', conversas: [
        { msgs: ['BOM DIAAA FAMÍLIA', 'Bom dia', 'Bom dia', '(mais 14 mensagens)'], resOk: 'Bom dia, família' },
        { msgs: ['Almoço domingo na', 'casa da tia, Carrão'],
          vai: { rotulo: 'O ALMOÇO', estacao: 'CARRÃO' }, resSim: 'Vou sim!', resNao: 'Domingo não dá' }
      ]
    },
    {
      nome: 'TIO ZEZÉ', conversas: [
        { msgs: ['sobrinh{o|a} vc viu aquilo', 'do vídeo que eu mandei'], resOk: 'Vi sim, tio kkkk' },
        { msgs: ['me busca na Penha?', 'meu carro quebrou'],
          vai: { rotulo: 'BUSCAR O TIO', estacao: 'PENHA' }, resSim: 'Te busco, tio', resNao: 'Hoje não dá, tio' }
      ]
    },
    {
      nome: 'PRIMO DISTANTE', conversas: [
        { msgs: ['fala prim{o|a}', 'tudo bem?', 'preciso de um favor'], resOk: 'Que favor?' }
      ]
    }
  ],

  senhor: [
    {
      nome: 'BAILE FLASHBACK', grupo: true, icone: 'nota', conversas: [
        { msgs: ['Hoje tem baile no', 'salão da Santana!', 'Chega 7h em ponto'],
          vai: { rotulo: 'O BAILE', estacao: 'SANTANA' }, resSim: 'Estarei lá!', resNao: 'Hoje não vou' },
        { msgs: ['Foto do baile passado', '(imagem)'], resOk: 'Que saudade!' }
      ]
    },
    {
      nome: 'FILHA', conversas: [
        { msgs: ['{Pai|Mãe}, {o senhor|a senhora} tomou', 'o remédio?'], resOk: 'Tomei, filha' },
        { msgs: ['Vem almoçar aqui na', 'Vila Matilde hoje?'],
          vai: { rotulo: 'O ALMOÇO NA FILHA', estacao: 'VILA MATILDE' }, resSim: 'Vou sim, filha', resNao: 'Hoje não, filha' }
      ]
    },
    {
      nome: 'TURMA DA FACUL 68', grupo: true, icone: 'capelo', conversas: [
        { msgs: ['Reunião da turma!', 'Bar de sempre, Liberdade'],
          vai: { rotulo: 'A TURMA', estacao: 'LIBERDADE' }, resSim: 'Lá estarei', resNao: 'Dessa vez não' },
        { msgs: ['O Nelson faleceu', 'Que Deus o tenha'], resOk: 'Descanse em paz' }
      ]
    },
    {
      nome: 'IRMÃO', conversas: [
        { msgs: ['Tá vivo?', 'Tô'], resOk: 'Vivinho da silva' },
        { msgs: ['Me encontra no Brás', 'que eu te mostro uma', 'coisa'],
          vai: { rotulo: 'O IRMÃO', estacao: 'BRÁS' }, resSim: 'Tô indo, mano', resNao: 'Hoje não, mano' }
      ]
    },
    {
      nome: 'NETO', conversas: [
        { msgs: ['{vô|vó} vem me buscar', 'na escola da Penha'],
          vai: { rotulo: 'BUSCAR O NETO', estacao: 'PENHA' }, resSim: '{O vô|A vó} tá indo!', resNao: 'Hoje não, meu bem' },
        { msgs: ['{vô|vó}, {o senhor|a senhora} sabe jogar', 'videogame?'], resOk: 'Me ensina?' }
      ]
    }
  ],

  ambulante: [
    {
      nome: 'FORNECEDOR', conversas: [
        { msgs: ['Chegou carregamento', 'novo. Te espero no Brás', 'até meio-dia'],
          vai: { rotulo: 'A MUAMBA', estacao: 'BRÁS' }, resSim: 'tô colando', resNao: 'hj não dá' },
        { msgs: ['Acabou o chocolate', 'Só tem bala'], resOk: 'manda bala então' }
      ]
    },
    {
      nome: 'RESENHA DA QUEBRADA', grupo: true, icone: 'copo', conversas: [
        { msgs: ['Resenha hoje no', 'Belém, colou?'],
          vai: { rotulo: 'A RESENHA', estacao: 'BELÉM' }, resSim: 'colo sim', resNao: 'hj não, mano' },
        { msgs: ['tá osso hj', 'tá osso todo dia'], resOk: 'nem me fala' }
      ]
    },
    {
      nome: 'PARCEIRO DE VAGÃO', conversas: [
        { msgs: ['fiscal tá na Sé hj', 'passa longe'], resOk: 'valeu o toque' },
        { msgs: ['me arruma 20 conto?', 'te pago sexta'], resOk: 'tô liso também' }
      ]
    },
    {
      nome: 'MÃE', conversas: [
        { msgs: ['meu filh{o|a} vc comeu?'], resOk: 'comi, mãe' },
        { msgs: ['passa aqui na Penha', 'antes de ir pra casa'],
          vai: { rotulo: 'A CASA DA MÃE', estacao: 'PENHA' }, resSim: 'passo aí, mãe', resNao: 'hj não, mãe' }
      ]
    }
  ],

  gestante: [
    {
      nome: 'MARIDO', conversas: [
        { msgs: ['Amor, te busco na', 'Ana Rosa às 6?'],
          vai: { rotulo: 'O MARIDO', estacao: 'ANA ROSA' }, resSim: 'Me busca sim ❤', resNao: 'Hoje vou sozinha' },
        { msgs: ['Como vc tá se sentindo?'], resOk: 'Bem, só cansada' }
      ]
    },
    {
      nome: 'DRA. HELENA', conversas: [
        { msgs: ['Consulta remarcada pra', 'hoje, Santa Cruz, 15h'],
          vai: { rotulo: 'A CONSULTA', estacao: 'SANTA CRUZ' }, resSim: 'Estarei lá', resNao: 'Não consigo hoje' }
      ]
    },
    {
      nome: 'CHÁ DE BEBÊ', grupo: true, icone: 'mamadeira', conversas: [
        { msgs: ['Meninas, decidimos:', 'chá no Tatuapé sábado'],
          vai: { rotulo: 'O CHÁ DE BEBÊ', estacao: 'TATUAPÉ' }, resSim: 'Vou sim!', resNao: 'Sábado não dá' },
        { msgs: ['que fofoooo', '(imagem)'], resOk: 'Que lindo!!' }
      ]
    }
  ],

  torcedor: [
    {
      nome: 'A TORCIDA', grupo: true, icone: 'bola', conversas: [
        { msgs: ['Domingo tem jogo!', 'Concentração no bar'],
          vai: { rotulo: 'O BAR', estacao: 'TATUAPÉ' }, resSim: 'tô dentro!', resNao: 'hj não, mano' },
        { msgs: ['Quem vai de camisa?', 'Todo mundo de camisa'], resOk: 'eu, sempre' }
      ]
    },
    {
      nome: 'MÃE', conversas: [
        { msgs: ['Lava essa camisa', 'antes do jogo, hein'], resOk: 'já lavei, mãe' },
        { msgs: ['Passa na Sé e traz', 'pão de queijo'],
          vai: { rotulo: 'A SÉ', estacao: 'SÉ' }, resSim: 'levo sim, mãe', resNao: 'hj não dá' }
      ]
    },
    {
      nome: 'CHEFE', conversas: [
        { msgs: ['Hoje não é dia de', 'camisa de time'], resOk: 'é dia de jogo!' }
      ]
    }
  ],

  turista: [
    {
      nome: 'HOSTEL SP', conversas: [
        { msgs: ['Check-out is at 11!', 'Sua mochila tá aqui'], resOk: 'Ok, thanks!' },
        { msgs: ['Tem festa na', 'República hoje'],
          vai: { rotulo: 'A FESTA', estacao: 'REPÚBLICA' }, resSim: 'I go!', resNao: 'Not tonight' }
      ]
    },
    {
      nome: 'GUIA DO ROLÊ', conversas: [
        { msgs: ['Mercadão é PEDRO II,', 'não é Sé! Todo mundo', 'erra isso'],
          vai: { rotulo: 'O MERCADÃO', estacao: 'PEDRO II' }, resSim: 'Pedro II, ok!', resNao: 'Maybe later' },
        { msgs: ['Cuidado com o celular'], resOk: '{Obrigado|Obrigada}!' }
      ]
    },
    {
      nome: 'MOM', conversas: [
        { msgs: ['Are you safe?', 'Call me please'], resOk: 'I\'m fine, mom' },
        { msgs: ['I saw the news', 'Please come home'], resOk: 'Don\'t worry, mom' }
      ]
    }
  ]
};

/* o grupo do torcedor é a organizada do time dele */
var ORGANIZADA = { corinthians: 'GAVIÕES', palmeiras: 'MANCHA', saopaulo: 'INDEPENDENTE', santos: 'CAMISA 12' };
// a ficha do contato pelo nome: a conversa da história pega a foto e o ícone daqui
function perfilDoContato(charKey, nome) {
  var l = contatosDe(charKey);
  for (var i = 0; i < l.length; i++) if (l[i].nome === nome) return l[i];
  return null;
}
/* O nome pode depender do gênero de quem joga ({ m: 'ESPOSA', f: 'MARIDO' }:
   'o gênero muda interações e alguns personagens', CAMPANHA.md), e o grupo
   da torcida é a organizada do seu time. Daqui pra frente todo mundo lê
   o nome já resolvido. */
function contatosDe(k) {
  var l = CONTATOS[k] || CONTATOS.clt, fem = typeof GameState !== 'undefined' && GameState.genero === 'f';
  return l.map(function (c) {
    var nome = typeof c.nome === 'object' ? (fem ? c.nome.f : c.nome.m) : c.nome;
    if (k === 'torcedor' && nome === 'A TORCIDA') nome = ORGANIZADA[leTime()] || nome;
    if (nome === c.nome) return c;
    var copia = {}; for (var q in c) copia[q] = c[q];
    copia.nome = nome;
    return copia;
  });
}

/* ---------- a caixa de entrada de uma perna ----------
   Uma perna começa com um punhado de conversas. No máximo uma delas
   traz compromisso: duas mudanças de destino na mesma viagem viraria
   sorteio, não decisão. */
/* ---------- conversa tem hora ----------
   'A mãe tá perguntando sobre almoço bem de manhã, não faz sentido.'
   Almoço é meio-dia, 'chega que horas?' é de noite, 'bom dia' é de
   manhã. `hora: [de, ate]` em minutos do dia; conversa sem `hora` cabe
   em qualquer uma. O relógio que vale é o do começo da perna, que é
   quando a caixa é montada — a mensagem pinga até uma hora depois, e
   por isso as janelas são folgadas. */
function naHora(c) {
  if (!c.hora) return true;
  var m = (typeof GameState === 'undefined' || GameState.minutos === undefined) ? 8 * 60 : GameState.minutos;
  return c.hora[0] <= c.hora[1]
    ? (m >= c.hora[0] && m <= c.hora[1])
    : (m >= c.hora[0] || m <= c.hora[1]);     // janela que atravessa a meia-noite
}

function montaZap(charKey) {
  var lista = contatosDe(charKey);
  FIO_VOZ = respostaPadrao(charKey);
  var caixa = [];
  var comVai = [], semVai = [], i, j;

  for (i = 0; i < lista.length; i++) {
    for (j = 0; j < lista[i].conversas.length; j++) {
      if (!naHora(lista[i].conversas[j])) continue;
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
  /* 'As mensagens têm que ir aparecendo de acordo com o horário.' A
     primeira chega logo que a perna começa; as outras vão pingando ao
     longo do trajeto, de 12 a 30 minutos de jogo uma da outra. Cada uma
     sabe quantos minutos depois do começo ela chega (`atraso`); o HUD
     marca o começo (`base`) na primeira vez que olha. */
  var soma = 0;
  for (i = 0; i < caixa.length; i++) {
    caixa[i].atraso = i === 0 ? 0 : (soma += 12 + Math.floor(Math.random() * 19));
    caixa[i].chegou = false;
  }
  /* a história (src/historia.js) entra na caixa: a principal do dia chega
     primeiro, e as conversas da história que seguem vivas ficam. Com a
     principal, as conversas soltas atrasam 10 minutos, pra ela ser a
     primeira a tocar. */
  if (typeof Historia !== 'undefined' && typeof GameState !== 'undefined') {
    var antes = caixa.length;
    caixa = Historia.juntaNaCaixa(caixa, charKey, GameState.zap);
    if (caixa.length > antes && caixa[0].principal) for (i = 1; i < caixa.length; i++) if (!caixa[i].hist) caixa[i].atraso += 10;
  }
  return caixa;
}
/* as que já chegaram (as antigas, sem hora marcada, contam como chegadas) */
function chegaram(caixa) {
  return (caixa || []).filter(function (f) { return f.chegou !== false; });
}
/* confere quem chegou agora; devolve quantas chegaram nesta conferida */
function entregaZap() {
  var caixa = GameState.zap || [], novas = 0;
  for (var i = 0; i < caixa.length; i++) {
    var f = caixa[i];
    if (f.chegou !== false) continue;
    if (f.base === undefined) f.base = GameState.minutos;
    var passou = (GameState.minutos - f.base + 1440) % 1440;
    // no EXPLORAR o relógio não anda: chega tudo de uma vez
    if (passou >= f.atraso || GameState.explorar) { f.chegou = true; f.lida = false; novas++; }
  }
  return novas;
}

/* a voz do personagem da vez, pra quando a conversa não traz resposta
   escrita à mão */
var FIO_VOZ = RESPOSTA_PADRAO.clt;

function generoDoZap(t) { return typeof noGenero === 'function' ? noGenero(t) : t; }
function novoFio(item, temVai) {
  var c = item.conversa;
  return {
    nome: item.contato.nome,
    grupo: !!item.contato.grupo,
    // quem tem rosto no jogo leva a foto; grupo leva o ícone dele
    foto: item.contato.foto || null,
    icone: item.contato.icone || null,
    // no gênero de quem joga ('Filh{o|a}'): o noGenero mora no historia.js
    msgs: c.msgs.map(generoDoZap),
    vai: temVai ? c.vai : null,
    /* o que você manda de volta: uma resposta pra cada saída, e a
       conversa fiada também tem a dela — responder "kkkk" pra piada da
       resenha é metade do que faz o ZipZap parecer um ZipZap */
    resSim: generoDoZap(c.resSim || FIO_VOZ.sim),
    resNao: generoDoZap(c.resNao || FIO_VOZ.nao),
    resOk: generoDoZap(c.resOk || FIO_VOZ.ok),
    enviadas: [],
    lida: false,
    aceito: false,
    respondido: false
  };
}

function naoLidas(caixa) {
  var n = 0;
  for (var i = 0; i < (caixa || []).length; i++) if (caixa[i].chegou !== false && !caixa[i].lida) n++;
  return n;
}
