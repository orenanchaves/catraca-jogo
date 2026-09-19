/* global Phaser, GameState */
/* Catraca — a história: missões como dados, pelo ZipZap

   Da sabatina (CAMPANHA.md): as missões só chegam pelo ZipZap; a
   principal do dia vem de um contato fixo, com estrela, e não dá pra
   recusar; o jeito de jogar (HONESTO x MALANDRO) muda as mensagens.

   Feito no molde das skills dialogue-systems e rpg (.claude/skills):
   - a conversa é um GRAFO de dados: cada nó tem a fala, as escolhas (cada
     uma pode ter condição `se` e o que ela `muda`) e pra onde vai; nó com
     `missao` liga uma missão; nó com `fim` encerra;
   - condição é OBJETO, não texto avaliado: { fama: ['<', 0] }. Nada de
     eval, e dá pra conferir tudo antes de publicar (Historia.valida);
   - a missão é uma máquina de estados (ativa -> completa -> entregue) que
     anda com os eventos que o jogo já anuncia em Missoes.conta, mais o
     'chegou' (chegada no destino);
   - o estado (fama, missões ativas e feitas) mora no GameState e vai no
     save da campanha (src/campanha.js).

   Regras da campanha que moram aqui (CAMPANHA.md):
   - escolha nenhuma trava história: recusar só muda o tom;
   - falhar a principal não trava nada: fecha como 'não deu', sem prêmio e
     sem o ponto de estágio, com a reação de quem mandou (`falhou`);
   - o gênero muda o jeito de falar, não a história: todo texto aceita
     {masculino|feminino}, e o contato pode ser { m: ..., f: ... }. */

/* ---------- o conteúdo ----------
   As conversas de cada dia, por personagem: a primeira é a principal (com
   estrela); as outras, secundárias, chegam um pouco depois. O Ato 1 do
   estudante é o dos dias 1 a 5 (CAMPANHA.md). */
var HIST_DIAS = {
  estudante: {
    1: ['est_d1_estagio', 'est_d1_bateria'],
    2: ['est_d2_reuniao', 'est_d2_mae'],
    3: ['est_d3_cracha', 'est_d3_bia'],
    4: ['est_d4_cafe', 'est_d4_ralls'],
    5: ['est_d5_fechamento']
  }
};

/* Quem te recebe em pessoa na saída quando a missão fecha (a cena mora no
   scene-estacao.js, `recebeNaSaida`), e o vulto do fiscal nos dias antes
   do chefão: aparecer de relance é o que faz o chefão não vir do nada. */
var RECEPCAO = {
  sueli: { sprite: 'np_sueli', nome: 'SUELI' },
  marcao: { sprite: 'np_marcao', nome: 'MARCÃO' }
};
var VULTOS = { estudante: { 3: { estacao: 'PARAÍSO', sprite: 'np_fiscal' }, 4: { estacao: 'PARAÍSO', sprite: 'np_fiscal' } } };

var HISTORIA = {
  /* ---------- Ato 1 do estudante: a primeira semana de estágio ---------- */
  est_d1_estagio: {
    tipo: 'principal', contato: 'SUELI (RH)', foto: 'np_sueli',
    inicio: 'oi',
    nos: {
      oi: {
        fala: 'Bom dia! Aqui é a Sueli, do RH. Hoje é seu primeiro dia de estágio. Te espero no Paraíso.',
        escolhas: [
          { texto: 'Bom dia! Tô indo', vai: 'vem' },
          { texto: 'Levo alguma coisa?', vai: 'leva' }
        ]
      },
      leva: {
        fala: 'Só o documento. E chega no horário, que o gestor repara.',
        escolhas: [{ texto: 'Pode deixar', vai: 'vem' }]
      },
      vem: {
        fala: 'Ótimo. Qualquer coisa me chama aqui.',
        missao: {
          objetivo: { ev: 'chegou', estacao: 'PARAÍSO' },
          recompensa: { xp: 40, carisma: 5 },
          recebe: 'sueli',
          // o recado da chegada muda com o jeito de jogar
          concluida: [
            { se: { fama: ['<', 0] }, vai: 'chegouMalandro' },
            { vai: 'chegou' }
          ],
          falhou: [{ vai: 'faltou' }]
        },
        fim: true
      },
      chegou: { fala: 'Chegou! Seja bem-{vindo|vinda} à equipe. Amanhã tem mais.', fim: true },
      chegouMalandro: {
        fala: 'Chegou... O segurança comentou de {um estagiário|uma estagiária} pulando catraca. Espero que não seja você.',
        fim: true
      },
      faltou: { fala: 'Você não apareceu no primeiro dia. Amanhã não falha, tá?', fim: true }
    }
  },

  /* A Bia lembrando do celular: é o tutorial da tomada dito por gente, e
     não por cartão de tutorial ('a namorada recomenda: não esquece de
     carregar o celular, hein'). */
  est_d1_bateria: {
    tipo: 'secundaria', contato: 'BIA ❤',
    // ela só cobra quando o celular está pela metade: cobrar com ele cheio não faz sentido
    se: { bateria: ['<=', 50] },
    inicio: 'oi',
    nos: {
      oi: {
        fala: 'Amor, não esquece de carregar esse celular, hein? Tem tomada na parede do mezanino: encosta nela e fica parad{o|a} que ele carrega.',
        escolhas: [
          { texto: 'Vou carregar agora', vai: 'vai' },
          { texto: 'Tá cheio, relaxa', vai: 'nao' }
        ]
      },
      vai: {
        fala: 'Isso. Sem bateria você não vê nem a minha mensagem.',
        missao: {
          objetivo: { ev: 'carregou' },
          recompensa: { xp: 15, carisma: 5 },
          concluida: [{ vai: 'obrigada' }]
        },
        fim: true
      },
      obrigada: { fala: 'Pronto! Agora você não some no meio do dia.', fim: true },
      nao: { fala: 'Tá bom... depois não vem reclamar que descarregou.', fim: true }
    }
  },

  est_d2_reuniao: {
    tipo: 'principal', contato: 'MARCÃO', foto: 'np_marcao',
    inicio: 'oi',
    nos: {
      oi: {
        fala: 'Marcão aqui, seu gestor. Reunião de equipe às 8h em ponto. Quem chega depois fica do lado de fora.',
        escolhas: [
          { texto: 'Chego antes!', vai: 'vem' },
          { texto: 'E se o metrô atrasar?', vai: 'desculpa' }
        ]
      },
      desculpa: {
        fala: 'O metrô atrasa pra todo mundo. Sai mais cedo.',
        escolhas: [{ texto: 'Beleza', vai: 'vem' }]
      },
      vem: {
        fala: 'Te vejo às 8.',
        missao: {
          objetivo: { ev: 'chegou', estacao: 'PARAÍSO', ate: 8 * 60 },
          recompensa: { xp: 40, carisma: 5 },
          recebe: 'marcao',
          concluida: [
            { se: { fama: ['<', 0] }, vai: 'okMalandro' },
            { vai: 'ok' }
          ],
          falhou: [{ vai: 'atrasou' }]
        },
        fim: true
      },
      ok: { fala: 'Pontual. Gostei. Pega um café e senta aí.', fim: true },
      okMalandro: { fala: 'Chegou no horário. Agora, o segurança lá embaixo tava falando de você...', fim: true },
      atrasou: { fala: 'A reunião já acabou. Amanhã, antes das 8, combinado?', fim: true }
    }
  },

  est_d2_mae: {
    tipo: 'secundaria', contato: 'MÃE',
    inicio: 'oi',
    nos: {
      oi: {
        fala: 'Filh{o|a}, passa na farmácia do Brás? O remédio da pressão acabou. Te mando o dinheiro.',
        escolhas: [
          { texto: 'Passo sim, mãe', vai: 'vai' },
          { texto: 'Hoje não dá, mãe', vai: 'nao' }
        ]
      },
      vai: {
        fala: 'Deus te abençoe. É só descer no Brás.',
        missao: {
          objetivo: { ev: 'desceu', estacao: 'BRÁS' },
          recompensa: { dinheiro: 10, carisma: 5, xp: 15 },
          concluida: [{ vai: 'obrigada' }]
        },
        fim: true
      },
      obrigada: { fala: 'Chegou o remédio! Obrigada, meu amor. O dinheiro tá no seu LARANJINHA.', fim: true },
      nao: { fala: 'Tudo bem, peço pra vizinha.', fim: true }
    }
  },

  est_d3_cracha: {
    tipo: 'principal', contato: 'SUELI (RH)', foto: 'np_sueli',
    inicio: 'oi',
    nos: {
      oi: {
        fala: 'Oi! Seu crachá novo ficou pronto. Tá no balcão do corredor da baldeação da Sé. Pega no caminho?',
        escolhas: [
          { texto: 'Pego sim', vai: 'vem' },
          { texto: 'Preciso mesmo dele?', vai: 'precisa' }
        ]
      },
      precisa: {
        fala: 'Sem crachá a catraca do prédio não abre. Pega, por favor.',
        escolhas: [{ texto: 'Tá bom', vai: 'vem' }]
      },
      vem: {
        fala: 'Obrigada! Te espero aqui.',
        missao: {
          // primeiro o corredor da Sé, depois o Paraíso
          passos: [
            { ev: 'baldeacao', aviso: ['CRACHÁ RETIRADO', 'Agora é o Paraíso.'] },
            { ev: 'chegou', estacao: 'PARAÍSO' }
          ],
          recompensa: { xp: 40, carisma: 5 },
          recebe: 'sueli',
          concluida: [
            { se: { fama: ['<', 0] }, vai: 'okMalandro' },
            { vai: 'ok' }
          ],
          falhou: [{ vai: 'semCracha' }]
        },
        fim: true
      },
      ok: { fala: 'Crachá na mão! Agora você é oficialmente da equipe.', fim: true },
      okMalandro: { fala: 'Tá com o crachá. Só não usa ele pra pular catraca, hein.', fim: true },
      semCracha: { fala: 'Veio sem o crachá? Vou ter que te liberar na portaria de novo...', fim: true }
    }
  },

  est_d3_bia: {
    tipo: 'secundaria', contato: 'BIA ❤',
    inicio: 'oi',
    nos: {
      oi: {
        fala: 'Oi, sumid{o|a}! Hoje tem feirinha na Liberdade à noite. Me encontra lá depois da Unipa?',
        escolhas: [
          { texto: 'Encontro sim!', vai: 'vai' },
          { texto: 'Hoje não vai dar', vai: 'nao' }
        ]
      },
      vai: {
        fala: 'Te espero lá depois das 18h!',
        missao: {
          objetivo: { ev: 'desceu', estacao: 'LIBERDADE', depois: 18 * 60 },
          recompensa: { xp: 30, carisma: 8 },
          concluida: [{ vai: 'encontrou' }]
        },
        fim: true
      },
      encontrou: { fala: 'Que bom que você veio! Semana que vem tem evento de cosplay aqui, bora?', fim: true },
      // recusar não trava nada: ela só brinca que você sumiu (o Ato 3 acontece igual)
      nao: { fala: 'Poxa. Fica pra próxima então, sumid{o|a}.', fim: true }
    }
  },

  est_d4_cafe: {
    tipo: 'principal', contato: 'MARCÃO', foto: 'np_marcao',
    // quem chegou atrasado na reunião ouve disso no dia 4
    inicio: [{ se: { falhou: 'est_d2_reuniao' }, vai: 'oiAtraso' }, { vai: 'oi' }],
    nos: {
      oi: {
        fala: 'Bom dia! Hoje eu tô sem tempo nem pra café. Me traz um do metrô? Te pago depois.',
        escolhas: [
          { texto: 'Levo sim!', vai: 'vem' },
          { texto: 'Puro ou com leite?', vai: 'leite' }
        ]
      },
      oiAtraso: {
        fala: 'Bom dia. Depois daquela reunião perdida, que tal chegar com um café? Me traz um do metrô.',
        escolhas: [
          { texto: 'Levo sim!', vai: 'vem' },
          { texto: 'Puro ou com leite?', vai: 'leite' }
        ]
      },
      leite: {
        fala: 'Puro, sem açúcar. Tem no DOG DO CÃO e na barraca de salgados.',
        escolhas: [{ texto: 'Anotado', vai: 'vem' }]
      },
      vem: {
        fala: 'Valeu. Te espero.',
        missao: {
          objetivo: { ev: 'chegou', estacao: 'PARAÍSO', item: 'cafe' },
          recompensa: { xp: 40, carisma: 5, dinheiro: 6 },
          recebe: 'marcao',
          concluida: [
            { se: { fama: ['<', 0] }, vai: 'okMalandro' },
            { vai: 'ok' }
          ],
          falhou: [{ vai: 'semCafe' }]
        },
        fim: true
      },
      ok: { fala: 'Café! Você salvou minha manhã. Tá aqui o dinheiro.', fim: true },
      okMalandro: { fala: 'Valeu pelo café. Pagou por ele, né?', fim: true },
      semCafe: { fala: 'Sem café? Tá bom... eu sobrevivo.', fim: true }
    }
  },

  est_d4_ralls: {
    tipo: 'secundaria', contato: 'ROLÊ DA UNIPA', grupo: true,
    inicio: 'oi',
    nos: {
      oi: {
        fala: 'GENTE, alguém tem RALLS? A aula de hoje vai ser longa.',
        escolhas: [
          { texto: 'Levo um pra facul', vai: 'vai' },
          { texto: 'Tô sem, foi mal', vai: 'nao' }
        ]
      },
      vai: {
        fala: 'Salvou a turma! Traz na aula da Unipa.',
        missao: {
          objetivo: { ev: 'chegou', estacao: 'VERGUEIRO', item: 'ralls' },
          recompensa: { dinheiro: 5, xp: 20 },
          concluida: [{ vai: 'chegou' }],
          falhou: [{ vai: 'esqueceu' }]
        },
        fim: true
      },
      chegou: { fala: 'O RALLS chegou! Toma aí os 5 conto.', fim: true },
      esqueceu: { fala: 'Cadê o RALLS? Esqueceu, né...', fim: true },
      nao: { fala: 'Alguém mais?', fim: true }
    }
  },

  /* O dia 5: o fechamento da semana, e o chefão. `chefao` arma o FISCAL na
     primeira catraca do dia (src/chefao-fiscal.js). */
  est_d5_fechamento: {
    tipo: 'principal', contato: 'MARCÃO', foto: 'np_marcao', chefao: 'fiscal',
    inicio: 'oi',
    nos: {
      oi: {
        fala: 'Sexta é dia de fechamento. Chega cedo que hoje o bicho pega.',
        escolhas: [
          { texto: 'Tô a caminho!', vai: 'vem' },
          { texto: 'Fechamento de quê?', vai: 'que' }
        ]
      },
      que: {
        fala: 'Do mês, das planilhas, de tudo. Só vem.',
        escolhas: [{ texto: 'Tá bom', vai: 'vem' }]
      },
      vem: {
        fala: 'Até já.',
        missao: {
          objetivo: { ev: 'chegou', estacao: 'PARAÍSO' },
          recompensa: { xp: 60, carisma: 10 },
          recebe: 'marcao',
          fimDeAto: 1,
          concluida: [
            { se: { venceu: 'fiscal' }, vai: 'okFiscal' },
            { vai: 'ok' }
          ],
          falhou: [{ vai: 'faltou' }]
        },
        fim: true
      },
      okFiscal: { fala: 'Soube que deu problema no seu bilhete e você se virou. Primeira semana fechada. Bom trabalho.', fim: true },
      ok: { fala: 'Soube do fiscal... Resolve isso do bilhete, tá? Mas a primeira semana tá fechada.', fim: true },
      faltou: { fala: 'Você não veio no fechamento. Segunda a gente conversa.', fim: true }
    }
  }
};

// o texto no gênero de quem joga: 'bem-{vindo|vinda}'
function noGenero(t) {
  var f = GameState.genero === 'f';
  return String(t || '').replace(/\{([^{}|]*)\|([^{}]*)\}/g, function (m, a, b) { return f ? b : a; });
}

var Historia = {
  // o que as condições podem olhar
  vars: function () {
    return { fama: GameState.fama || 0, dinheiro: GameState.dinheiro, carisma: GameState.carisma,
      nivel: typeof meuNivel === 'function' ? meuNivel() : 1, dia: GameState.dia || 1, minutos: GameState.minutos,
      bateria: GameState.bateria === undefined ? 100 : GameState.bateria, descanso: GameState.descanso };
  },
  /* As chaves especiais não comparam número: `tem` pergunta pela mochila
     ('ralls'), `falhou` por uma missão que fechou como não deu, `venceu`
     por um chefão vencido. */
  ESPECIAIS: { tem: 1, falhou: 1, venceu: 1 },
  cond: function (se) {
    if (!se) return true;
    var v = this.vars(), st = this.estado();
    for (var k in se) {
      if (k === 'tem') { if (!((GameState.mochila || {})[se.tem] > 0)) return false; continue; }
      if (k === 'falhou') { var fe = st.feitas[se.falhou]; if (!fe || fe.ok !== false) return false; continue; }
      if (k === 'venceu') { var ch = st.chefoes && st.chefoes[se.venceu]; if (!ch || !ch.ok) return false; continue; }
      var op = se[k][0], x = se[k][1], a = v[k];
      var ok = op === '<' ? a < x : op === '<=' ? a <= x : op === '>' ? a > x : op === '>=' ? a >= x :
        op === '==' ? a === x : op === '!=' ? a !== x : false;
      if (!ok) return false;
    }
    return true;
  },
  estado: function () {
    if (!GameState.historia) GameState.historia = { ativas: {}, feitas: {}, criadas: {} };
    var st = GameState.historia;
    // o save de antes guardava o dia (número) em `feitas`: vale como cumprida
    for (var id in st.feitas) if (typeof st.feitas[id] === 'number') st.feitas[id] = { dia: st.feitas[id], ok: true };
    if (!st.chefoes) st.chefoes = {};
    return st;
  },
  contatoDe: function (h) {
    return typeof h.contato === 'object' ? (GameState.genero === 'f' ? h.contato.f : h.contato.m) : h.contato;
  },
  // o primeiro nó: fixo, ou o primeiro da lista cuja condição vale
  inicioDe: function (h) {
    if (typeof h.inicio === 'string') return h.inicio;
    for (var i = 0; i < h.inicio.length; i++) if (this.cond(h.inicio[i].se)) return h.inicio[i].vai;
    return h.inicio[h.inicio.length - 1].vai;
  },

  /* uma conversa da história vira um fio do ZipZap, com o histórico em
     ordem (`log`), pra conversa ter vários turnos */
  novoFio: function (id, noId) {
    var h = HISTORIA[id];
    var nomeC = this.contatoDe(h), perfil = typeof perfilDoContato === 'function' ? perfilDoContato(GameState.charKey, nomeC) : null;
    var f = { nome: nomeC, grupo: !!h.grupo, foto: h.foto || (perfil && perfil.foto) || null, icone: (perfil && perfil.icone) || null,
      principal: h.tipo === 'principal',
      msgs: [], vai: null, enviadas: [], lida: false, aceito: false, respondido: false, hist: { id: id, no: null },
      log: [], diaHist: GameState.dia || 1 };
    this.vaiPara(f, noId || this.inicioDe(h));
    // o chefão do dia fica armado desde a mensagem
    if (h.chefao) { var st = this.estado(); if (!st.chefoes[h.chefao]) st.chefoes[h.chefao] = { dia: GameState.dia || 1, estado: 'armado' }; }
    return f;
  },
  no: function (f) { return f && f.hist ? HISTORIA[f.hist.id].nos[f.hist.no] : null; },
  vaiPara: function (f, noId) {
    var h = HISTORIA[f.hist.id], n = h.nos[noId];
    f.hist.no = noId;
    var t = noGenero(n.fala);
    f.log.push({ de: 'ele', t: t });
    f.msgs = [t];
    if (n.missao) this.ativa(f.hist.id, noId);
    f.respondido = !!n.fim;
  },
  escolhas: function (f) {
    var n = this.no(f);
    if (!n || n.fim || !n.escolhas) return [];
    var eu = this;
    return n.escolhas.filter(function (e) { return eu.cond(e.se); })
      .map(function (e) { return { texto: noGenero(e.texto), vai: e.vai, muda: e.muda, se: e.se }; });
  },
  escolhe: function (f, e) {
    f.log.push({ de: 'eu', t: e.texto });
    f.enviadas.push(e.texto);
    if (e.muda) for (var k in e.muda) GameState[k] = (GameState[k] || 0) + e.muda[k];
    this.vaiPara(f, e.vai);
  },

  // ---------- as missões ----------
  ativa: function (id, noId) {
    var st = this.estado();
    if (st.ativas[id] || st.feitas[id]) return;
    st.ativas[id] = { no: noId, estado: 'ativa', dia: GameState.dia || 1, passo: 0 };
    // e o que fazer aparece em letra grande quando você guarda o celular
    GameState.avisoObjetivo = this.ordemDe(HISTORIA[id].nos[noId].missao);
  },
  /* A missão dita em uma frase, do jeito que se fala: 'VÁ ATÉ O PARAÍSO
     ANTES DAS 8:00'. É o que aparece na tela ao sair do ZipZap, pra nunca
     restar dúvida do que fazer agora. */
  ordemDe: function (m) {
    if (!m) return '';
    var p = (m.passos || [m.objetivo])[0], onde = p.estacao ? placaDe(p.estacao) : '';
    var t = '';
    if (p.ev === 'carregou') t = 'CARREGUE O CELULAR NA TOMADA DO MEZANINO';
    else if (p.ev === 'chegou') t = 'VÁ ATÉ ' + onde;
    else if (p.ev === 'desceu') t = 'DESÇA EM ' + onde;
    else if (p.ev === 'baldeacao') t = 'PASSE PELA BALDEAÇÃO DA SÉ';
    else t = 'SIGA O QUE PEDIRAM';
    if (p.item && ITENS[p.item]) t += ' COM ' + ITENS[p.item].nome;
    if (p.ate !== undefined) t += ' ANTES DAS ' + Math.floor(p.ate / 60) + ':' + ('0' + (p.ate % 60)).slice(-2);
    if (p.depois !== undefined) t += ' DEPOIS DAS ' + Math.floor(p.depois / 60) + 'H';
    return t;
  },
  missaoDe: function (id) {
    var a = this.estado().ativas[id];
    return a ? HISTORIA[id].nos[a.no].missao : null;
  },
  /* O acontecimento anda a missão. Objetivo de um passo (`objetivo`) ou de
     vários (`passos`, em ordem). O último passo pode pedir prazo (`ate`, em
     minutos do dia), hora mínima (`depois`) e um item levado na mochila
     (`item`, que é entregue). Chegar no lugar do último passo sem ter feito
     os de antes, ou fora do prazo, ou sem o item, é falhar. */
  evento: function (ev, d) {
    if (GameState.treino || GameState.explorar || !GameState.char) return;
    d = d || {};
    this.fama(ev, d);
    var st = this.estado();
    for (var id in st.ativas) {
      var a = st.ativas[id], m = this.missaoDe(id), passos = m.passos || [m.objetivo];
      var ult = passos[passos.length - 1], p = passos[a.passo || 0];
      var bate = function (q) { return q.ev === ev && (!q.estacao || q.estacao === d.estacao) && (!q.id || q.id === d.id); };
      if (!bate(p)) {
        // chegou no fim sem passar pelos passos de antes
        if ((a.passo || 0) < passos.length - 1 && bate(ult)) this.entrega(id, m, false, d);
        continue;
      }
      if (p.depois !== undefined && GameState.minutos < p.depois) continue;
      if ((a.passo || 0) < passos.length - 1) {
        a.passo = (a.passo || 0) + 1;
        if (p.aviso && typeof avisaMissao === 'function') avisaMissao(p.aviso[0], p.aviso[1]);
        sfx('moeda');
        continue;
      }
      var ok = true;
      if (p.ate !== undefined && GameState.minutos > p.ate) ok = false;
      if (p.item) {
        var mo = GameState.mochila || {};
        if (mo[p.item] > 0) { mo[p.item]--; } else ok = false;
      }
      this.entrega(id, m, ok, d);
    }
  },
  /* completa e entrega (ou fecha como não deu): a recompensa, o recado de
     volta no mesmo fio (chega como mensagem nova), e quem manda te recebe
     em pessoa na saída quando a missão fecha na estação dela */
  entrega: function (id, m, ok, d) {
    var st = this.estado(), r = m.recompensa || {}, h = HISTORIA[id];
    delete st.ativas[id];
    st.feitas[id] = { dia: GameState.dia || 1, ok: !!ok };
    if (ok) {
      if (r.xp && typeof ganhaXp === 'function') ganhaXp(r.xp);
      if (r.dinheiro) GameState.ganhar(r.dinheiro, 'MISSÃO');
      if (r.carisma) GameState.addCarisma(r.carisma);
    }
    var lista = ok ? (m.concluida || []) : (m.falhou || []), alvo = null;
    for (var k = 0; k < lista.length; k++) if (this.cond(lista[k].se)) { alvo = lista[k].vai; break; }
    if (alvo && m.recebe && RECEPCAO[m.recebe] && d && d.estacao) {
      GameState.recepcao = { sprite: RECEPCAO[m.recebe].sprite, nome: RECEPCAO[m.recebe].nome, fala: noGenero(h.nos[alvo].fala), ok: !!ok };
    }
    if (m.fimDeAto) {
      if (typeof avisaMissao === 'function') avisaMissao('FIM DO ATO ' + m.fimDeAto, 'A primeira semana acabou.');
      Missoes.conta('ato', { ato: m.fimDeAto });
    }
    var f = null, cx = GameState.zap || [];
    for (var i = 0; i < cx.length; i++) if (cx[i].hist && cx[i].hist.id === id) f = cx[i];
    if (!f || !alvo) return;
    this.vaiPara(f, alvo);
    f.lida = false; f.chegou = false; f.base = undefined; f.atraso = 0;     // o HUD entrega com o toque
  },
  // os pontos de estágio: cada principal cumprida vale um (a efetivação do Ato 4 olha isso)
  pontosEstagio: function () {
    var st = this.estado(), n = 0;
    for (var id in st.feitas) if (HISTORIA[id] && HISTORIA[id].tipo === 'principal' && st.feitas[id].ok) n++;
    return n;
  },

  /* ---------- o chefão ----------
     Armado pela mensagem do dia (`chefao` na conversa); a cena da estação
     pergunta se é hoje, e avisa quando acabou. Vencer é escapar da fuga ou
     ganhar o duelo; perder é o duelo perdido. */
  chefaoArmado: function (id) {
    var c = this.estado().chefoes[id];
    return !!(c && c.estado === 'armado' && c.dia === (GameState.dia || 1));
  },
  fechaChefao: function (id, ok, como) {
    var st = this.estado();
    st.chefoes[id] = { dia: GameState.dia || 1, estado: 'feito', ok: !!ok, como: como || '' };
    Missoes.conta('chefao', { id: id, ok: !!ok, como: como || '' });
  },
  // o vulto de hoje nesta estação (o fiscal, nos dias antes do chefão)
  vultoAqui: function (estacao) {
    if (!GameState.char) return null;
    var v = (VULTOS[GameState.charKey] || {})[GameState.dia || 1];
    return v && v.estacao === estacao ? v : null;
  },

  /* ---------- HONESTO x MALANDRO ----------
     O medidor anda com o que o jogo já anuncia: passar a catraca pagando,
     ceder o lugar e ajudar puxam pro honesto; pular a catraca e fugir do
     guarda puxam pro malandro. Vai de -20 a 20. */
  FAMA: { catraca: 1, cedeu: 2, ajudou: 2, pulouCatraca: -3, escapouGuarda: -2 },
  fama: function (ev) {
    var d = this.FAMA[ev];
    if (!d) return;
    GameState.fama = Math.max(-20, Math.min(20, (GameState.fama || 0) + d));
    // o medidor mora no CATRAGRAM, e dois degraus dele são conquista
    if (typeof Catragram !== 'undefined') Catragram.confereFama();
  },

  /* ---------- a caixa do ZipZap ----------
     O montaZap refaz a caixa a cada perna. A história entra nela: as
     conversas da história do dia (e as que ainda têm missão ativa) ficam,
     a principal do dia chega na primeira perna, com estrela, e as
     secundárias um pouco depois. Virou o dia com missão aberta: a
     principal fecha como não deu, a secundária só expira. */
  juntaNaCaixa: function (caixa, charKey, velha) {
    var st = this.estado(), dia = GameState.dia || 1, fica = [], i, id;
    for (id in st.ativas) {
      if ((st.ativas[id].dia || dia) >= dia || !HISTORIA[id]) continue;
      if (HISTORIA[id].tipo === 'principal') this.entrega(id, this.missaoDe(id), false, null);
      else { delete st.ativas[id]; st.feitas[id] = { dia: dia - 1, ok: false }; }
    }
    for (i = 0; i < (velha || []).length; i++) {
      var f = velha[i];
      if (f.hist && (f.diaHist === dia || st.ativas[f.hist.id])) fica.push(f);
    }
    // missão ativa sem fio (voltou de um save): o fio renasce no nó da missão
    for (id in st.ativas) {
      var tem = fica.some(function (x) { return x.hist && x.hist.id === id; });
      if (!tem && HISTORIA[id]) { var nf = this.novoFio(id, st.ativas[id].no); nf.lida = true; fica.push(nf); }
    }
    var hoje = (HIST_DIAS[charKey] || {})[dia] || [];
    if (typeof hoje === 'string') hoje = [hoje];
    var novos = [];
    for (i = 0; i < hoje.length; i++) {
      if (st.criadas[hoje[i]] || !HISTORIA[hoje[i]]) continue;
      /* a conversa pode ter hora certa: a Bia só cobra o carregador com o
         celular pela metade. Sem a condição, ela espera a próxima perna. */
      if (HISTORIA[hoje[i]].se && !this.cond(HISTORIA[hoje[i]].se)) continue;
      st.criadas[hoje[i]] = dia;
      var p = this.novoFio(hoje[i]);
      p.chegou = false;
      p.atraso = HISTORIA[hoje[i]].tipo === 'principal' ? 0 : 18 + novos.length * 14;
      if (p.principal) fica.unshift(p); else novos.push(p);
    }
    fica = fica.concat(novos);
    /* a conversa da história toma o lugar da conversa solta do mesmo
       contato: duas 'MÃE' na lista era a mãe em dois celulares */
    var nomes = fica.map(function (x) { return x.nome; });
    return fica.concat(caixa.filter(function (c) { return nomes.indexOf(c.nome) < 0; }));
  },

  /* ---------- o verificador ----------
     Antes de publicar: todo `vai` aponta pra nó que existe, todo nó
     termina (escolhas ou fim), toda condição olha variável conhecida. */
  valida: function () {
    var prob = [], vs = this.vars(), eu = this;
    var olha = function (id, nid, e, h) {
      if (!h.nos[e.vai]) prob.push(id + '.' + nid + ': vai pra ' + e.vai + ', que não existe');
      for (var k in (e.se || {})) if (!(k in vs) && !eu.ESPECIAIS[k]) prob.push(id + '.' + nid + ': condição olha ' + k + ', que não existe');
    };
    for (var id in HISTORIA) {
      var h = HISTORIA[id];
      if (typeof h.inicio === 'string') { if (!h.nos[h.inicio]) prob.push(id + ': início ' + h.inicio + ' não existe'); }
      else h.inicio.forEach(function (e) { olha(id, 'inicio', e, h); });
      for (var nid in h.nos) {
        var n = h.nos[nid];
        if (!n.fim && !(n.escolhas && n.escolhas.length)) prob.push(id + '.' + nid + ': nó sem saída');
        (n.escolhas || []).concat((n.missao && n.missao.concluida) || []).concat((n.missao && n.missao.falhou) || [])
          .forEach(function (e) { olha(id, nid, e, h); });
        if (n.missao && n.missao.recebe && !RECEPCAO[n.missao.recebe]) prob.push(id + '.' + nid + ': recebe ' + n.missao.recebe + ', que não existe');
      }
    }
    for (var ck in HIST_DIAS) for (var dd in HIST_DIAS[ck]) {
      [].concat(HIST_DIAS[ck][dd]).forEach(function (x) { if (!HISTORIA[x]) prob.push(ck + ' dia ' + dd + ': ' + x + ' sem conteúdo'); });
    }
    return prob;
  }
};

// os eventos do jogo alimentam a história (e o medidor), além das missões de sempre
(function () {
  var contaOriginal = Missoes.conta;
  Missoes.conta = function (ev, d) {
    var r = contaOriginal.apply(Missoes, arguments);
    try { Historia.evento(ev, d); } catch (e) { }
    return r;
  };
  // conteúdo quebrado aparece no console, antes de alguém ficar preso numa conversa
  try { var p = Historia.valida(); if (p.length) console.warn('HISTÓRIA:', p.join(' | ')); } catch (e) { }
})();
