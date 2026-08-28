/* global Phaser, GameState, PAINEL, LINHAS, FAIXAS, ligaSom, SOM_LIGADO */
/* =========================================================
   CATRACA — painel lateral (só no desktop)

   Num monitor sobra tela dos dois lados de um canvas de 320px.
   Em vez de deixar o preto, o que é contexto sai de cima do jogo
   e vai pra beirada: relógio, linha, próxima estação, dica do
   momento, controles e as configurações. O canvas fica com o
   jogo e o HUD, e mais nada.

   No celular e em janela estreita nada disso existe: a variável
   PAINEL fica nula e o jogo desenha tudo dentro do canvas como
   sempre desenhou.
   ========================================================= */

(function painelLateral() {
  var LARGURA_MINIMA = 1000;   // menos que isso, o painel não cabe sem apertar o jogo
  var el = {};
  var ligado = false;

  function $(id) { return document.getElementById(id); }

  function montaLinha(pai, rotulo) {
    var d = document.createElement('div');
    d.className = 'linha';
    var r = document.createElement('span');
    r.className = 'rot';
    r.textContent = rotulo;
    var v = document.createElement('span');
    v.className = 'val';
    d.appendChild(r); d.appendChild(v); pai.appendChild(d);
    return v;
  }

  function monta() {
    var esq = $('esq'), dir = $('dir');

    /* ---------- esquerda: identidade, controles, configurações ---------- */
    esq.innerHTML =
      '<div class="marca">CATRACA</div>' +
      '<div class="sub">METRÔ DE SÃO PAULO</div>' +
      '<div class="bloco"><h2>CONTROLES</h2>' +
      '<div class="tecla"><b>CLIQUE</b><span>agir, confirmar</span></div>' +
      '<div class="tecla"><b>W A S D</b><span>andar</span></div>' +
      '<div class="tecla"><b>ESPAÇO</b><span>o mesmo que clicar</span></div>' +
      '<div class="tecla"><b>X</b><span>voltar</span></div>' +
      '<div class="obs">segurar o clique conta como segurar. ' +
      'setas, Z e enter também valem</div></div>' +
      '<div class="bloco"><h2>CONFIGURAÇÕES</h2>' +
      '<button id="btSom" class="bt"></button>' +
      '<button id="btNitido" class="bt"></button>' +
      '<div class="obs" id="obsNitido"></div></div>';

    el.btSom = $('btSom');
    el.btNitido = $('btNitido');
    el.obsNitido = $('obsNitido');
    el.btSom.onclick = function () { ligaSom(!SOM_LIGADO); pintaSom(); };
    el.btNitido.onclick = function () { trocaEscala(!nitido); };

    /* ---------- direita: onde você está e o que dá pra fazer ---------- */
    dir.innerHTML = '<div class="bloco"><h2>TRAJETO</h2></div>';
    var b1 = dir.querySelector('.bloco');
    el.linha = montaLinha(b1, 'LINHA');
    el.estacao = montaLinha(b1, 'ESTAÇÃO');
    el.proxima = montaLinha(b1, 'PRÓXIMA');

    var b2 = document.createElement('div');
    b2.className = 'bloco';
    b2.innerHTML = '<h2>HORÁRIO</h2>';
    dir.appendChild(b2);
    el.hora = montaLinha(b2, 'HORA');
    el.faixa = montaLinha(b2, 'FAIXA');
    el.frase = document.createElement('div');
    el.frase.className = 'frase';
    b2.appendChild(el.frase);

    var b3 = document.createElement('div');
    b3.className = 'bloco dica';
    b3.innerHTML = '<h2>O QUE FAZER</h2>';
    dir.appendChild(b3);
    el.dica = document.createElement('div');
    el.dica.className = 'dicaTxt';
    b3.appendChild(el.dica);

    var b4 = document.createElement('div');
    b4.className = 'bloco';
    b4.innerHTML = '<h2>CORRIDA</h2>';
    dir.appendChild(b4);
    el.dia = montaLinha(b4, 'DIA');
    el.estacoes = montaLinha(b4, 'ESTAÇÕES');
    el.recorde = montaLinha(b4, 'RECORDE');

    pintaSom();
    pintaNitido();
  }

  /* ---------- som ---------- */
  function pintaSom() {
    el.btSom.textContent = SOM_LIGADO ? 'SOM: LIGADO' : 'SOM: DESLIGADO';
    el.btSom.className = 'bt' + (SOM_LIGADO ? ' on' : '');
  }

  /* ---------- escala ----------
     FIT estica o canvas até a altura da janela, e quase nunca dá um número
     inteiro: cada pixel do jogo vira 2,7 pixels de tela e a arte fica com
     as bordas tremidas. No modo nítido a escala é inteira — o jogo fica
     menor, mas cada pixel é um quadrado exato. */
  var nitido = false;
  try { nitido = (localStorage.getItem('metrosp_nitido') === '1'); } catch (e) { }

  function zoomInteiro() {
    var alt = window.innerHeight;
    return Math.max(1, Math.floor(alt / 576));
  }

  function trocaEscala(v) {
    nitido = !!v;
    try { localStorage.setItem('metrosp_nitido', nitido ? '1' : '0'); } catch (e) { }
    aplicaEscala();
    pintaNitido();
  }

  function aplicaEscala() {
    if (!window.jogo || !window.jogo.scale) return;
    var s = window.jogo.scale;
    if (ligado && nitido) {
      s.scaleMode = Phaser.Scale.NONE;
      s.setZoom(zoomInteiro());
    } else {
      s.scaleMode = Phaser.Scale.FIT;
      s.setZoom(1);
    }
    s.refresh();
  }

  function pintaNitido() {
    el.btNitido.textContent = nitido ? 'TELA: PIXEL EXATO' : 'TELA: AJUSTADA';
    el.btNitido.className = 'bt' + (nitido ? ' on' : '');
    el.obsNitido.textContent = nitido
      ? ('escala ' + zoomInteiro() + 'x, sem pixel torto')
      : 'preenche a altura da janela';
  }

  /* ---------- ponte com o jogo ---------- */
  var ponte = {
    hora: function (h, f) {
      el.hora.textContent = h;
      el.hora.style.color = f.cor;
      el.faixa.textContent = f.nome;
      el.frase.textContent = f.frase;
    },
    dica: function (txto, cor) {
      el.dica.textContent = txto || '—';
      el.dica.style.color = txto ? (cor || '#f2c14e') : '#3a3f52';
    }
  };

  /* o resto o painel lê sozinho do estado do jogo, quadro a quadro */
  function atualiza() {
    if (ligado && GameState.char) {
      var l = GameState.linhaAtual();
      el.linha.textContent = l.nome;
      el.linha.style.color = l.cor;
      el.estacao.textContent = GameState.estacaoAtual();
      el.proxima.textContent = GameState.proximaEstacaoNome();
      el.dia.textContent = String(GameState.dia);
      el.estacoes.textContent = String(GameState.estacoes);
      el.recorde.textContent = String(GameState.recorde());
    } else if (ligado) {
      el.linha.textContent = '—';
      el.estacao.textContent = 'ESCOLHENDO';
      el.proxima.textContent = '—';
      el.hora.textContent = '—';
      el.faixa.textContent = '—';
      el.frase.textContent = '';
      el.dia.textContent = '—';
      el.estacoes.textContent = '—';
      el.recorde.textContent = String(GameState.recorde ? GameState.recorde() : 0);
    }
    requestAnimationFrame(atualiza);
  }

  /* ---------- liga e desliga conforme o tamanho da janela ---------- */
  function confere() {
    var cabe = window.innerWidth >= LARGURA_MINIMA
      && window.matchMedia('(pointer: fine)').matches;
    if (cabe === ligado) { if (ligado) aplicaEscala(); return; }
    ligado = cabe;
    document.body.classList.toggle('comPainel', ligado);
    PAINEL = ligado ? ponte : null;
    if (ligado) ponte.dica('', null);
    aplicaEscala();
  }

  window.addEventListener('load', function () {
    monta();
    confere();
    atualiza();
  });
  window.addEventListener('resize', confere);
})();
