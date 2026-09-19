/* global Phaser, GameState */
/* Catraca — o save da campanha e o checkpoint

   'Tem que ter um jeito de checkpoint pra salvar em alguns lugares, talvez
   quando chega no destino.' E, da sabatina: sem fim de jogo que apaga
   tudo; acabou o fôlego, você volta pro último checkpoint pagando um preço
   (CAMPANHA.md).

   Feito no molde da skill save-systems (.claude/skills/save-systems):
   - salva DADO, nunca objeto de cena: o que o GameState precisa pra
     recomeçar a perna, e nada que dê pra recalcular (a linha e o índice
     saem do poeNoTrajeto; o ZipZap sai do montaZap);
   - todo save carrega a VERSAO, e sobe pela cadeia de MIGRACOES quando o
     jogo mudar, pra atualização nenhuma quebrar a partida de ninguém; save
     de versão mais nova que o jogo é recusado, não adivinhado;
   - antes de gravar, o save anterior vira a cópia de segurança (_bak), e
     quem não lê o principal tenta a cópia;
   - grava só em fronteira segura: ao começar a campanha e ao chegar num
     destino sem ter caído, nunca no meio de uma luta. */

var Campanha = {
  VERSAO: 1,
  CHAVE: 'metrosp_campanha',
  // vN -> vN+1, em ordem; nenhuma ainda (a v1 é a primeira)
  MIGRACOES: {},
  CAMPOS: ['charKey', 'genero', 'dia', 'pernaIdx', 'perna', 'origem', 'destino', 'minutos',
    'dinheiro', 'carisma', 'descanso', 'coracoes', 'valeRestante', 'mochila', 'extrato', 'bateria',
    'atrasos', 'ultimoAtraso', 'pernasFeitas', 'estacoes', 'pontosDaCorrida', 'stats', 'lixo',
    'sacouNoDia', 'gastoNoDia', 'multasNoDia', 'fama', 'historia'],

  captura: function () {
    var d = { versao: this.VERSAO, quando: Date.now() };
    for (var i = 0; i < this.CAMPOS.length; i++) {
      var v = GameState[this.CAMPOS[i]];
      d[this.CAMPOS[i]] = (v && typeof v === 'object') ? JSON.parse(JSON.stringify(v)) : v;
    }
    return d;
  },

  salva: function (motivo) {
    if (!GameState.char || GameState.treino || GameState.explorar) return;
    try {
      var velho = localStorage.getItem(this.CHAVE);
      if (velho) localStorage.setItem(this.CHAVE + '_bak', velho);
      var d = this.captura(); d.motivo = motivo || '';
      localStorage.setItem(this.CHAVE, JSON.stringify(d));
    } catch (e) { }
  },

  // lê, sobe a versão e confere; se o principal falhar, tenta a cópia
  carrega: function () {
    var chaves = [this.CHAVE, this.CHAVE + '_bak'];
    for (var i = 0; i < chaves.length; i++) {
      try {
        var raw = localStorage.getItem(chaves[i]);
        if (!raw) continue;
        var d = this.sobe(JSON.parse(raw));
        if (d && this.valido(d)) return d;
      } catch (e) { }
    }
    return null;
  },
  sobe: function (d) {
    var v = d.versao || 1;
    if (v > this.VERSAO) return null;               // de um jogo mais novo: não adivinha
    while (v < this.VERSAO) { d = this.MIGRACOES[v](d); v++; d.versao = v; }
    return d;
  },
  valido: function (d) {
    return !!(d.charKey && CHARS[d.charKey] && typeof d.dia === 'number' && d.dia >= 1 &&
      typeof d.dinheiro === 'number' && isFinite(d.dinheiro) &&
      (LINHAS.azul.estacoes.indexOf(d.origem) >= 0 || LINHAS.vermelha.estacoes.indexOf(d.origem) >= 0));
  },
  tem: function (charKey) { var d = this.carrega(); return d && d.charKey === charKey ? d : null; },
  apaga: function () {
    try { localStorage.removeItem(this.CHAVE); localStorage.removeItem(this.CHAVE + '_bak'); } catch (e) { }
  },

  // devolve o GameState pro ponto salvo (depois de um init do mesmo personagem)
  aplica: function (d) {
    for (var i = 0; i < this.CAMPOS.length; i++) {
      var k = this.CAMPOS[i];
      if (d[k] !== undefined) GameState[k] = (d[k] && typeof d[k] === 'object') ? JSON.parse(JSON.stringify(d[k])) : d[k];
    }
    GameState.char = CHARS[d.charKey];
    GameState.nome = nomeDoChar(d.charKey, d.genero);
    CASA = casaDe(d.charKey);
    GameState.compromisso = null;
    GameState.dentroDoSistema = false; GameState.pulouCatraca = false; GameState.sentado = false;
    GameState.folgaPerna = 0; GameState.motivoFim = '';
    GameState.zap = [];                          // a caixa do init não vale: a história refaz a dela
    GameState.zap = montaZap(d.charKey);
    GameState.poeNoTrajeto(d.origem);
    GameState.minutoSaida = GameState.minutos;
    GameState.faixaAnterior = GameState.faixa().key;
  }
};

/* ---------- caiu: volta pro checkpoint ----------
   Chamado pelo vaiPraOFim antes de abrir o placar. Com checkpoint deste
   personagem, a partida não acaba: o estado volta pro último destino
   alcançado, com o fôlego cheio e a conta da queda (R$ 5, 10 de carisma e
   meia hora), e a estação dele abre com o recado. */
var CUSTO_CHECKPOINT = { dinheiro: 5, carisma: 10, minutos: 30 };
function voltaAoCheckpoint(scene) {
  if (GameState.treino || GameState.explorar || !GameState.char) return false;
  var d = Campanha.tem(GameState.charKey);
  if (!d) return false;
  var motivo = GameState.motivoFim || '';
  Campanha.aplica(d);
  GameState.coracoes = CORACOES_POR_PERNA;
  GameState.descanso = Math.max(GameState.descanso, Math.round(GameState.char.descansoMax * 0.5));
  var multa = Math.min(CUSTO_CHECKPOINT.dinheiro, GameState.dinheiro);
  if (multa > 0) GameState.gastar(multa, 'VOLTA AO CHECKPOINT');
  GameState.carisma = Math.max(10, GameState.carisma - CUSTO_CHECKPOINT.carisma);
  GameState.minutos = (GameState.minutos + CUSTO_CHECKPOINT.minutos) % 1440;
  GameState.minutoSaida = GameState.minutos;
  GameState.checkpointAviso = motivo.split('\n')[0] + '\nVocê voltou pra ' + placaDe(d.origem) + '.\n-R$ ' +
    multa.toFixed(2).replace('.', ',') + ', -' + CUSTO_CHECKPOINT.carisma + ' de carisma, +30 min.';
  // desliga o que estiver no ar e abre a estação do checkpoint
  var m = scene.scene.manager;
  ['Vagao', 'Baldeacao', 'Desafio', 'Briga', 'Encarada', 'Disputa', 'Zap', 'Pausa', 'Fim'].forEach(function (k) {
    if (k !== scene.scene.key && (m.isActive(k) || m.isPaused(k))) m.stop(k);
  });
  HUD_VISIVEL = true; CONTROLES_VISIVEIS = true;
  scene.scene.start('Estacao', { onde: 'saguao' });
  return true;
}
