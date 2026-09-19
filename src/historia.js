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
     save da campanha (src/campanha.js). */

/* ---------- o conteúdo ----------
   Qual missão principal chega em cada dia, por personagem. Por enquanto só
   o dia 1 do estudante, de exemplo do motor; o resto do mês sai da
   sabatina (CAMPANHA.md, 'Em aberto'). */
var HIST_DIAS = {
  estudante: { 1: 'est_d1_estagio' }
};

var HISTORIA = {
  est_d1_estagio: {
    tipo: 'principal', contato: 'SUELI (RH)',
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
        fala: 'Só o documento. E chega no horário, que o gerente repara.',
        escolhas: [{ texto: 'Pode deixar', vai: 'vem' }]
      },
      vem: {
        fala: 'Ótimo. Qualquer coisa me chama aqui.',
        missao: {
          objetivo: { ev: 'chegou', estacao: 'PARAÍSO' },
          recompensa: { xp: 40, carisma: 5 },
          // o recado da chegada muda com o jeito de jogar
          concluida: [
            { se: { fama: ['<', 0] }, vai: 'chegouMalandro' },
            { vai: 'chegou' }
          ]
        },
        fim: true
      },
      chegou: { fala: 'Chegou! Seja bem-vindo à equipe. Amanhã tem mais.', fim: true },
      chegouMalandro: {
        fala: 'Chegou... O segurança do Paraíso comentou de um estagiário pulando catraca. Espero que não seja você.',
        fim: true
      }
    }
  }
};

var Historia = {
  // o que as condições podem olhar
  vars: function () {
    return { fama: GameState.fama || 0, dinheiro: GameState.dinheiro, carisma: GameState.carisma,
      nivel: typeof meuNivel === 'function' ? meuNivel() : 1, dia: GameState.dia || 1, minutos: GameState.minutos };
  },
  cond: function (se) {
    if (!se) return true;
    var v = this.vars();
    for (var k in se) {
      var op = se[k][0], x = se[k][1], a = v[k];
      var ok = op === '<' ? a < x : op === '<=' ? a <= x : op === '>' ? a > x : op === '>=' ? a >= x :
        op === '==' ? a === x : op === '!=' ? a !== x : false;
      if (!ok) return false;
    }
    return true;
  },
  estado: function () {
    if (!GameState.historia) GameState.historia = { ativas: {}, feitas: {}, criadas: {} };
    return GameState.historia;
  },

  /* uma conversa da história vira um fio do ZipZap, com o histórico em
     ordem (`log`), pra conversa ter vários turnos */
  novoFio: function (id, noId) {
    var h = HISTORIA[id];
    var f = { nome: h.contato, grupo: false, principal: h.tipo === 'principal', msgs: [], vai: null,
      enviadas: [], lida: false, aceito: false, respondido: false, hist: { id: id, no: null },
      log: [], diaHist: GameState.dia || 1 };
    this.vaiPara(f, noId || h.inicio);
    return f;
  },
  no: function (f) { return f && f.hist ? HISTORIA[f.hist.id].nos[f.hist.no] : null; },
  vaiPara: function (f, noId) {
    var h = HISTORIA[f.hist.id], n = h.nos[noId];
    f.hist.no = noId;
    f.log.push({ de: 'ele', t: n.fala });
    f.msgs = [n.fala];
    if (n.missao) this.ativa(f.hist.id, noId);
    f.respondido = !!n.fim;
  },
  escolhas: function (f) {
    var n = this.no(f);
    if (!n || n.fim || !n.escolhas) return [];
    var eu = this;
    return n.escolhas.filter(function (e) { return eu.cond(e.se); });
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
    st.ativas[id] = { no: noId, estado: 'ativa' };
  },
  evento: function (ev, d) {
    if (GameState.treino || GameState.explorar || !GameState.char) return;
    d = d || {};
    this.fama(ev, d);
    var st = this.estado();
    for (var id in st.ativas) {
      var a = st.ativas[id], m = HISTORIA[id].nos[a.no].missao, o = m.objetivo;
      if (o.ev !== ev || (o.estacao && o.estacao !== d.estacao)) continue;
      this.entrega(id, m);
    }
  },
  // completa e entrega: a recompensa, e o recado de volta no mesmo fio (chega como mensagem nova)
  entrega: function (id, m) {
    var st = this.estado(), r = m.recompensa || {};
    delete st.ativas[id];
    st.feitas[id] = GameState.dia || 1;
    if (r.xp && typeof ganhaXp === 'function') ganhaXp(r.xp);
    if (r.dinheiro) GameState.ganhar(r.dinheiro, 'MISSÃO');
    if (r.carisma) GameState.addCarisma(r.carisma);
    var f = null, cx = GameState.zap || [];
    for (var i = 0; i < cx.length; i++) if (cx[i].hist && cx[i].hist.id === id) f = cx[i];
    if (!f) return;
    var alvo = null;
    for (var k = 0; k < (m.concluida || []).length; k++) if (this.cond(m.concluida[k].se)) { alvo = m.concluida[k].vai; break; }
    if (!alvo) return;
    this.vaiPara(f, alvo);
    f.lida = false; f.chegou = false; f.base = undefined; f.atraso = 0;     // o HUD entrega com o toque
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
     e a principal do dia chega na primeira perna, com estrela. */
  juntaNaCaixa: function (caixa, charKey, velha) {
    var st = this.estado(), dia = GameState.dia || 1, fica = [], i;
    for (i = 0; i < (velha || []).length; i++) {
      var f = velha[i];
      if (f.hist && (f.diaHist === dia || st.ativas[f.hist.id])) fica.push(f);
    }
    // missão ativa sem fio (voltou de um save): o fio renasce no nó da missão
    for (var id in st.ativas) {
      var tem = fica.some(function (x) { return x.hist && x.hist.id === id; });
      if (!tem && HISTORIA[id]) { var nf = this.novoFio(id, st.ativas[id].no); nf.lida = true; fica.push(nf); }
    }
    var hoje = (HIST_DIAS[charKey] || {})[dia];
    if (hoje && !st.criadas[hoje] && HISTORIA[hoje]) {
      st.criadas[hoje] = dia;
      var p = this.novoFio(hoje);
      p.atraso = 0; p.chegou = false;
      fica.unshift(p);
    }
    return fica.concat(caixa);
  },

  /* ---------- o verificador ----------
     Antes de publicar: todo `vai` aponta pra nó que existe, todo nó
     termina (escolhas ou fim), toda condição olha variável conhecida. */
  valida: function () {
    var prob = [], vs = this.vars();
    for (var id in HISTORIA) {
      var h = HISTORIA[id];
      if (!h.nos[h.inicio]) prob.push(id + ': início ' + h.inicio + ' não existe');
      for (var nid in h.nos) {
        var n = h.nos[nid];
        if (!n.fim && !(n.escolhas && n.escolhas.length)) prob.push(id + '.' + nid + ': nó sem saída');
        (n.escolhas || []).concat((n.missao && n.missao.concluida) || []).forEach(function (e) {
          if (!h.nos[e.vai]) prob.push(id + '.' + nid + ': vai pra ' + e.vai + ', que não existe');
          for (var k in (e.se || {})) if (!(k in vs)) prob.push(id + '.' + nid + ': condição olha ' + k + ', que não existe');
        });
      }
    }
    for (var ck in HIST_DIAS) for (var dd in HIST_DIAS[ck]) if (!HISTORIA[HIST_DIAS[ck][dd]]) prob.push(ck + ' dia ' + dd + ': missão sem conteúdo');
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
