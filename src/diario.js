/* global GameState, Campanha, Historia, HISTORIA, CHARS, leXp, gravaXp, ganhaXp */
/* Catraca — o diário da campanha: o balanço de cada dia e a volta pra ele

   Sabatina de 20/09. O dia acabava em silêncio: a última perna fechava,
   o contador subia e amanhecia. Agora o dia é uma FASE, com fim, nota e
   direito a segunda tentativa.

   As cinco decisões, e o porquê de cada uma:

   1. O balanço aparece SÓ quando o dia acaba, nunca a cada perna. A
      volta pra casa é o fecho natural: é nela que o cansaço e o dinheiro
      apertam, e fechar no meio tiraria esse peso.
   2. Ele é a MESMA tela de fim que já existia, com dois humores: verde
      quando você chegou em casa, vermelho quando o dia acabou mal. Um
      lugar só onde o dia é julgado, e o mesmo formulário nos dois casos,
      que é o que deixa comparar um dia bom com um ruim.
   3. Ele CONTA e ENTREGA: cada linha cumprida vira XP na hora, e o total
      vira uma nota. Balanço sem consequência vira recibo, lido uma vez.
      De quebra, o ganho migra do duelo achado pro dia bem feito.
   4. Dá pra repetir QUALQUER dia, e a nota nova SUBSTITUI a antiga. Nada
      acumula, então não existe farmar o dia fácil; e o dia vira fase com
      recorde próprio.
   5. Repetir um dia antigo DESFAZ os seguintes. O dia 4 é consequência
      do 3: guardar o 4 seria guardar a resposta de uma pergunta que não
      existe mais.

   O preço de (4) é este arquivo: pra voltar ao dia 3 é preciso ter a
   foto do estado no começo dele, e não só o checkpoint da vez. A foto é
   a mesma que a campanha já sabe tirar (`Campanha.captura`), uma por
   dia, guardada em `metrosp_diario`. */

var DIARIO_CHAVE = 'metrosp_diario';
var DIARIO_MAX = 40;        // uma temporada é um mês; 40 dias é folga com teto

/* ---------- as linhas do balanço ----------
   O que o dia cobra, em ordem de importância. Cada uma sabe se foi
   cumprida (`fez`) e quanto vale. O XP grande está na missão de
   propósito: é ela que o jogo quer que você persiga. */
var LINHAS_BALANCO = [
  {
    chave: 'missao', rot: 'A MISSÃO DO DIA', xp: 40,
    fez: function (b) { return b.missaoOk; },
    falhou: 'NÃO FECHOU'
  },
  {
    chave: 'hora', rot: 'CHEGOU NO HORÁRIO', xp: 25,
    fez: function (b) { return b.atrasos === 0; },
    falhou: 'CHEGOU TARDE'
  },
  {
    chave: 'pe', rot: 'TERMINOU DE PÉ', xp: 15,
    fez: function (b) { return b.bom; },
    falhou: 'O DIA TE DERRUBOU'
  },
  {
    chave: 'carisma', rot: 'NÃO PERDEU CARISMA', xp: 15,
    fez: function (b) { return b.carisma >= 0; },
    falhou: function (b) { return b.carisma + ' DE CARISMA'; }
  },
  {
    chave: 'grana', rot: 'FECHOU NO AZUL', xp: 10,
    fez: function (b) { return b.grana >= 0; },
    falhou: function (b) { return 'R$ ' + b.grana.toFixed(2).replace('.', ',').replace('-', '-'); }
  },
  {
    chave: 'duelos', rot: 'GANHOU DISCUSSÃO', xp: 5, porVez: true,
    fez: function (b) { return b.duelos > 0; },
    falhou: 'NENHUMA HOJE'
  }
];

/* ---------- a nota da fase: os 4 pilares do GDD ----------
   docs/gdd/01-game-design-mestre.md §3: Nota Final = Pontualidade×0,35 +
   Descanso×0,25 + Carisma×0,25 + Economia×0,15, corte de aprovação em
   6,0. As LINHAS_BALANCO acima continuam de pé (dão XP e o porquê,
   linha a linha), mas quem decide se a fase passa ou repete agora é
   esta conta — sem ela, o dia sempre "passava" contanto que você
   chegasse em casa vivo, e reprovar não existia.

   Cada pilar já nasce no orçamento de pontos que o peso dele permite
   (3,5 / 2,5 / 2,5 / 1,5 — a soma dos quatro cheios fecha os 10,0), e o
   pilar só decide QUANTO do próprio teto ele guarda:

   - Pontualidade usa `GameState.ultimoAtraso` (minutos acima da
     tolerância na ÚLTIMA perna com prazo do dia): a maioria das fases
     só tem um compromisso com hora marcada, e é essa perna que interessa.
   - Descanso é a barra JÁ NO FIM DO DIA, antes do prêmio de chegar em
     casa (que enche ela de novo) — por isso é calculado dentro de
     `fecha`, sempre ANTES de `GameState.chegouNoDestino()` rodar.
   - Carisma e Economia usam o que sobrou/faltou NESTE DIA (`b.carisma`,
     `b.grana`), não o total acumulado da campanha inteira. */
function pilaresDoDia(b) {
  var pontualidade = b.atrasos > 0 ? Math.max(0, 3.5 - (GameState.ultimoAtraso || 0) * 0.15) : 3.5;
  var descansoPct = (GameState.char && GameState.char.descansoMax) ? (GameState.descanso / GameState.char.descansoMax) : 1;
  var descanso = descansoPct >= 0.6 ? 2.5 : (descansoPct >= 0.2 ? 1.5 : 0.5);
  var carisma = b.carisma >= 0 ? 2.5 : Math.max(0, 2.5 + b.carisma * 0.15);
  var economia = b.grana >= 0 ? 1.5 : Math.max(0, 1.5 + b.grana * 0.03);
  return { pontualidade: pontualidade, descanso: descanso, carisma: carisma, economia: economia };
}
var NOTA_DE_CORTE = 6;

var Diario = {
  /* ---------- o arquivo ---------- */
  le: function () {
    try {
      var raw = localStorage.getItem(DIARIO_CHAVE);
      var d = raw ? JSON.parse(raw) : null;
      if (!d || !d.dias || d.charKey !== GameState.charKey) return { charKey: GameState.charKey, dias: [] };
      return d;
    } catch (e) { return { charKey: GameState.charKey, dias: [] }; }
  },
  grava: function (d) {
    try { localStorage.setItem(DIARIO_CHAVE, JSON.stringify(d)); } catch (e) { }
  },
  apaga: function () { try { localStorage.removeItem(DIARIO_CHAVE); } catch (e) { } },

  /* ---------- começou um dia ----------
     Tira a foto do estado AGORA e zera os contadores do dia. Chamado no
     init do personagem e toda vez que o relógio vira o dia. Foto de um
     dia que já tem foto não é refeita: repetir o dia 3 tem que cair no
     mesmo dia 3, e não num dia 3 já mexido. */
  abre: function () {
    if (!GameState.char || GameState.treino || GameState.explorar) return;
    var n = GameState.dia || 1;
    GameState.diaBase = {
      dia: n,
      carisma: GameState.carisma,
      dinheiro: GameState.dinheiro,
      atrasos: GameState.atrasos || 0
    };
    GameState.diaConta = { duelos: 0, entregas: 0 };
    var d = this.le(), i;
    for (i = 0; i < d.dias.length; i++) if (d.dias[i].n === n) return;
    if (typeof Campanha === 'undefined') return;
    d.dias.push({ n: n, foto: Campanha.captura(), nota: null, xp: 0, linhas: null, bom: null });
    while (d.dias.length > DIARIO_MAX) d.dias.shift();
    this.grava(d);
  },

  /* Quem ganhou uma discussão ou entregou algo avisa aqui, e o balanço
     lê no fim. Contador do dia, não da campanha: ele zera no `abre`. */
  conta: function (ev) {
    if (!GameState.diaConta) GameState.diaConta = { duelos: 0, entregas: 0 };
    if (GameState.diaConta[ev] === undefined) GameState.diaConta[ev] = 0;
    GameState.diaConta[ev]++;
  },

  /* ---------- o que a fase guardou ----------
     'Vai aparecendo o que foi preenchido em cada fase: lista inimigos,
     itens especiais e etc.' Não é contador, é LISTA: quem você encontrou
     e o que você achou, sem repetir. É ela que dá motivo pra repetir uma
     fase depois de já ter tirado nota boa — voltar pra pegar o que
     faltou. */
  anota: function (tipo, chave) {
    if (!chave || GameState.treino || GameState.explorar) return;
    if (!GameState.diaConta) GameState.diaConta = { duelos: 0, entregas: 0 };
    var l = GameState.diaConta[tipo] || (GameState.diaConta[tipo] = []);
    if (l.indexOf(chave) < 0) l.push(chave);
  },
  /* o resumo de uma fase já fechada, pra linha do tempo */
  resumoDaFase: function (n) {
    var l = this.lista(), i;
    for (i = 0; i < l.length; i++) if (l[i].n === n) {
      return { inimigos: (l[i].inimigos || []).length, itens: (l[i].itens || []).length };
    }
    return null;
  },

  /* ---------- o balanço ----------
     `bom` é true quando você chegou em casa e false quando o dia acabou
     mal. Devolve o objeto que a tela de fim desenha, e já credita o XP:
     a tela só mostra o que já aconteceu. */
  fecha: function (bom) {
    var base = GameState.diaBase || { dia: GameState.dia || 1, carisma: GameState.carisma, dinheiro: GameState.dinheiro, atrasos: 0 };
    var cont = GameState.diaConta || { duelos: 0, entregas: 0 };
    var b = {
      dia: base.dia,
      bom: !!bom,
      inimigos: (cont.inimigos || []).slice(0),
      itens: (cont.itens || []).slice(0),
      carisma: Math.round(GameState.carisma - base.carisma),
      grana: GameState.dinheiro - base.dinheiro,
      atrasos: (GameState.atrasos || 0) - (base.atrasos || 0),
      duelos: cont.duelos || 0,
      entregas: cont.entregas || 0,
      missaoOk: this.missaoDoDiaFeita(base.dia),
      motivo: bom ? '' : (GameState.motivoFim || '')
    };
    var linhas = [], ganho = 0, total = 0, i;
    for (i = 0; i < LINHAS_BALANCO.length; i++) {
      var L = LINHAS_BALANCO[i], fez = !!L.fez(b);
      var vale = L.porVez ? L.xp * Math.max(1, b.duelos) : L.xp;
      total += L.porVez ? L.xp : L.xp;
      if (fez) ganho += vale;
      linhas.push({
        rot: L.rot, ok: fez, xp: fez ? vale : 0,
        nota: fez ? '' : (typeof L.falhou === 'function' ? L.falhou(b) : L.falhou)
      });
    }
    b.linhas = linhas;
    b.xp = ganho;
    b.total = total;
    /* os 4 pilares rodam SEMPRE antes de `GameState.chegouNoDestino()`
       (é a própria ordem que `chegouEmCasa`/`vaiPraOFim` já seguem: o
       balanço fecha antes de o dia virar e o descanso ser reposto). */
    b.pilares = pilaresDoDia(b);
    b.notaFinal = Math.round((b.pilares.pontualidade + b.pilares.descanso + b.pilares.carisma + b.pilares.economia) * 10) / 10;
    // sem casa decimal quando é redondo ('10', não '10,0'): é o único caso de 4 caracteres, e a chapa da nota (32px) só tem espaço confortável pra 3
    b.notaTexto = (b.notaFinal % 1 === 0) ? String(b.notaFinal) : b.notaFinal.toFixed(1).replace('.', ',');
    // não chegar em casa (`bom` falso) nunca aprova, por pior ou melhor que a nota tivesse saído
    b.aprovado = !!bom && b.notaFinal >= NOTA_DE_CORTE;
    if (typeof ganhaXp === 'function' && ganho > 0) b.subiu = ganhaXp(ganho);
    this.guardaResultado(b);
    return b;
  },

  /* a principal daquele dia foi fechada com sucesso? */
  missaoDoDiaFeita: function (dia) {
    if (typeof Historia === 'undefined' || !Historia.estado) return false;
    var st = Historia.estado(), id;
    if (!st || !st.feitas) return false;
    for (id in st.feitas) {
      var f = st.feitas[id], h = HISTORIA[id];
      if (!f || !h || h.tipo !== 'principal') continue;
      if (f.dia === dia && f.ok) return true;
    }
    return false;
  },

  guardaResultado: function (b) {
    var d = this.le(), i, achou = null;
    for (i = 0; i < d.dias.length; i++) if (d.dias[i].n === b.dia) achou = d.dias[i];
    if (!achou) { achou = { n: b.dia, foto: null }; d.dias.push(achou); }
    /* a nota nova toma o lugar da antiga: repetir não soma, substitui */
    achou.nota = b.notaTexto;
    achou.aprovado = b.aprovado;
    achou.xp = b.xp;
    achou.bom = b.bom;
    achou.linhas = b.linhas.length;
    achou.inimigos = b.inimigos;
    achou.itens = b.itens;
    this.grava(d);
  },

  /* ---------- a timeline ----------
     A lista que a tela de fim desenha: um dia por pastilha, com a nota.
     O dia da vez é o último, e é o único que ainda pode não ter nota. */
  lista: function () {
    var d = this.le(), vistos = {}, out = [], i;
    d.dias.sort(function (a, b) { return a.n - b.n; });
    // uma pastilha por fase: fase repetida na lista é defeito, e defeito
    // não pode aparecer como duas pastilhas com o mesmo número
    for (i = 0; i < d.dias.length; i++) {
      var f = d.dias[i];
      if (vistos[f.n]) { out[vistos[f.n] - 1] = f; continue; }
      out.push(f); vistos[f.n] = out.length;
    }
    return out;
  },
  podeRepetir: function (n) {
    var l = this.lista(), i;
    for (i = 0; i < l.length; i++) if (l[i].n === n && l[i].foto) return true;
    return false;
  },
  /* quantos dias somem se você voltar pra este: é o preço, e a tela diz
     ele antes de o dedo encostar no botão */
  quantosDesfaz: function (n) {
    var l = this.lista(), q = 0, i;
    for (i = 0; i < l.length; i++) if (l[i].n > n) q++;
    return q;
  },

  /* ---------- repetir o dia ----------
     Devolve o estado à foto do começo daquele dia e APAGA os seguintes,
     porque o que veio depois era consequência dele. Devolve false quando
     não há foto (campanha velha, salva antes deste arquivo existir). */
  volta: function (n) {
    var d = this.le(), i, alvo = null;
    for (i = 0; i < d.dias.length; i++) if (d.dias[i].n === n) alvo = d.dias[i];
    if (!alvo || !alvo.foto || typeof Campanha === 'undefined') return false;
    Campanha.aplica(alvo.foto);
    /* A foto manda em tudo menos no número da fase: ela é, por
       construção, o estado do começo da fase `n`, e quem pergunta "que
       fase é esta" é o `GameState.dia` (é ele que escolhe as pernas em
       fases.js). Foto de campanha antiga pode trazer outro número, e aí
       a fase jogada não seria a fase escolhida. */
    GameState.dia = n;
    GameState.poeNoTrajeto(GameState.origem);
    /* a campanha guarda o checkpoint dela à parte: sem reescrever, o
       primeiro tombo no dia repetido jogaria você de volta pro futuro */
    Campanha.salva('repete');
    var fica = [];
    for (i = 0; i < d.dias.length; i++) if (d.dias[i].n <= n) fica.push(d.dias[i]);
    alvo.nota = null; alvo.xp = 0; alvo.bom = null;
    d.dias = fica;
    this.grava(d);
    GameState.diaBase = {
      dia: n, carisma: GameState.carisma, dinheiro: GameState.dinheiro, atrasos: GameState.atrasos || 0
    };
    GameState.diaConta = { duelos: 0, entregas: 0 };
    return true;
  }
};
