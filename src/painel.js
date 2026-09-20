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
  var LARGURA_PAINEL = 236;    // igual ao CSS: os dois não podem divergir
  var VAO = 28;                // o `gap` do #palco, também igual ao CSS
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
      '<div class="tecla"><b>ARRASTAR</b><span>andar sem tirar do mouse</span></div>' +
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

    /* ---------- direita: em que missão você está, e onde ----------
       'Tá muito poluído e difícil de entender' / 'E como sei em que
       missão tô?'. Eram treze linhas de rótulo e valor, todas do mesmo
       tamanho e do mesmo peso: LINHA, ESTAÇÃO, PRÓXIMA, DESCER EM, INDO
       PRA, ENTRADA, ATRASOS, HORA, FAIXA, DIA, ESTAÇÕES, RECORDE. Ler
       aquilo era procurar, e a pergunta mais importante — o que eu tenho
       que fazer agora — não estava lá: o único bloco que responderia
       ('O QUE FAZER') só ecoava a faixa de dica do chão, que fica vazia
       a maior parte do tempo.

       A ordem agora é a das perguntas: O QUE, ONDE, QUANDO. A missão
       aberta vem primeiro e por extenso, com quem mandou e o prazo; a
       estação vira título em vez de valor de linha; o relógio ganha o
       tamanho que ele tem no jogo (é o antagonista); e o placar da
       corrida, que não muda nada do que você faz agora, virou uma linha
       só no rodapé. */
    dir.innerHTML =
      '<div class="bloco missao"><h2>MISSÃO</h2>' +
      '<div class="mQuem" id="mQuem"></div>' +
      '<div class="mOrdem" id="mOrdem"></div>' +
      '<div class="mPrazo" id="mPrazo"></div></div>' +
      '<div class="bloco"><h2>ONDE VOCÊ ESTÁ</h2>' +
      '<div class="ondeNome" id="ondeNome"></div>' +
      '<div class="ondeLinha" id="ondeLinha"></div>' +
      '<div class="sep"></div></div>' +
      '<div class="bloco"><h2>RELÓGIO</h2>' +
      '<div class="horaGr" id="horaGr"></div>' +
      '<div class="faixaNome" id="faixaNome"></div>' +
      '<div class="frase" id="frase"></div></div>' +
      '<div class="bloco dica"><h2>O QUE FAZER AQUI</h2>' +
      '<div class="dicaTxt" id="dicaTxt"></div></div>' +
      '<div class="rodape" id="rodape"></div>';

    el.mQuem = $('mQuem'); el.mOrdem = $('mOrdem'); el.mPrazo = $('mPrazo');
    el.ondeNome = $('ondeNome'); el.ondeLinha = $('ondeLinha');
    el.hora = $('horaGr'); el.faixa = $('faixaNome'); el.frase = $('frase');
    el.dica = $('dicaTxt'); el.rodape = $('rodape');
    // as duas linhas de rota moram no fim do bloco ONDE
    var sep = dir.querySelector('.sep');
    el.proxima = montaLinha(sep.parentNode, 'PRÓXIMA');
    el.destino = montaLinha(sep.parentNode, 'DESCER EM');

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

  /* Quanto sobra pro jogo depois dos dois painéis e dos dois vãos. */
  function sobraDaJanela() {
    return window.innerWidth - (LARGURA_PAINEL + VAO) * 2;
  }

  function zoomInteiro() {
    var z = Math.floor(window.innerHeight / 576);
    /* Com o painel ligado a largura também limita: sem isto o zoom 3x
       numa janela baixa e estreita fazia um canvas de 960px numa coluna
       de 400 e o jogo saía por baixo dos painéis. */
    if (ligado) z = Math.min(z, Math.floor(sobraDaJanela() / 320));
    return Math.max(1, z);
  }

  /* ---------- pixel exato só quando cabe ----------
     O zoom inteiro mínimo é 1, e 1 já são 576px de altura. Numa janela
     de 540 o canvas ficava mais alto que a tela e o jogo saía por baixo
     — medido: coluna de 576 numa janela de 540. Não dá pra resolver com
     número: em tela mais baixa que 576, pixel exato e caber são coisas
     que se excluem. Então ele cai pra ajustada sozinho e o painel diz o
     porquê, em vez de entregar um jogo cortado. */
  function cabeNitido() {
    return 576 * zoomInteiro() <= window.innerHeight;
  }

  function usaNitido() {
    return nitido && cabeNitido();
  }

  /* ---------- o tamanho da coluna do jogo ----------
     Este é o conserto do jogo que "ficava mexendo no tamanho" no
     desktop. A coluna era dimensionada pelo conteúdo (o canvas) e o
     canvas era dimensionado pela coluna: cada `refresh` do Phaser movia
     os dois. Medido a 1280×720, a coluna pedia 894px pra um canvas de
     400 e os painéis encolhiam de 236 pra 165 pra pagar a conta.

     Agora a conta sai da JANELA e vai numa direção só. Uma medida por
     resize, em pixel inteiro — o Phaser lê um número que não depende
     dele, e ninguém realimenta ninguém. */
  function dimensiona() {
    var g = $('game');
    if (!g) return;
    if (!ligado) { g.style.width = ''; g.style.height = ''; return; }
    var larg, alt;
    if (usaNitido()) {
      var z = zoomInteiro();
      larg = 320 * z; alt = 576 * z;
    } else {
      alt = window.innerHeight;
      larg = Math.floor(alt * 320 / 576);
      /* Monitor em pé: a altura daria uma coluna mais larga do que a que
         cabe entre os painéis. Aí quem manda é a largura. */
      var sobra = sobraDaJanela();
      if (larg > sobra) { larg = Math.max(160, sobra); alt = Math.floor(larg * 576 / 320); }
    }
    g.style.width = larg + 'px';
    g.style.height = alt + 'px';
  }

  function trocaEscala(v) {
    nitido = !!v;
    try { localStorage.setItem('metrosp_nitido', nitido ? '1' : '0'); } catch (e) { }
    aplicaEscala();
    pintaNitido();
  }

  function aplicaEscala() {
    /* A coluna primeiro, o canvas depois: o Phaser mede o pai, então o
       pai tem que já estar do tamanho certo quando ele medir. */
    dimensiona();
    if (!window.jogo || !window.jogo.scale) return;
    var s = window.jogo.scale;
    if (ligado && usaNitido()) {
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
    el.btNitido.className = 'bt' + (usaNitido() ? ' on' : '');
    el.obsNitido.textContent = !nitido
      ? 'preenche a altura da janela'
      : (cabeNitido()
        ? ('escala ' + zoomInteiro() + 'x, sem pixel torto')
        : 'janela baixa demais: usando ajustada');
  }

  var faixaNoPainel = null;   // qual faixa ja tem frase escrita no painel

  /* ---------- ponte com o jogo ---------- */
  var ponte = {
    hora: function (h, f) {
      el.hora.textContent = h;
      el.hora.style.color = f.cor;
      el.faixa.textContent = f.nome;
      /* A frase e sorteada, e isto roda todo quadro: sem guardar a faixa
         anterior o painel sorteava sessenta frases por segundo e o texto
         virava chuvisco. Troca quando a faixa troca, que e quando ela tem
         o que dizer de novo. */
      if (faixaNoPainel !== f.key) {
        faixaNoPainel = f.key;
        el.frase.textContent = fraseDaFaixa(f);
      }
    },
    dica: function (txto, cor) {
      el.dica.textContent = txto || '—';
      el.dica.style.color = txto ? (cor || '#f2c14e') : '#3a3f52';
    }
  };

  /* ---------- a missão aberta, por extenso ----------
     Mesma fonte do app MISSÕES do celular (o grafo da história): a
     principal primeiro, e o rótulo da perna como rede — no dia em que
     nenhuma conversa está aberta, o compromisso do trajeto ainda é uma
     resposta ('você está indo pro estágio'). */
  function missaoAgora() {
    var st = (typeof Historia !== 'undefined' && Historia.estado) ? Historia.estado() : null;
    var achou = null, id;
    /* o painel roda a cada quadro e não é dono de nada: um save meio
       velho, com uma conversa que não existe mais, não pode derrubar a
       tela inteira — sem missão ele cai no rótulo da perna, que sempre
       existe */
    if (st && st.ativas) try {
      for (id in st.ativas) {
        var h = HISTORIA[id];
        if (!h) continue;
        var m = Historia.missaoDe(id);
        if (!m) continue;
        var item = { quem: Historia.contatoDe(h), ordem: Historia.ordemDe(m) };
        if (h.tipo === 'principal') return item;      // a principal sempre ganha
        if (!achou) achou = item;
      }
    } catch (e) { achou = achou || null; }
    if (achou) return achou;
    // o rótulo já vem com artigo ('O ESTÁGIO'), então a preposição contrai
    var rot = GameState.rotuloDaPerna ? GameState.rotuloDaPerna() : '';
    if (!rot) return { quem: '', ordem: '' };
    var ind = rot.indexOf('O ') === 0 ? 'INDO PRO ' + rot.slice(2)
      : (rot.indexOf('A ') === 0 ? 'INDO PRA ' + rot.slice(2) : 'INDO PRA ' + rot);
    return { quem: '', ordem: ind };
  }

  /* o resto o painel lê sozinho do estado do jogo, quadro a quadro */
  function atualiza() {
    if (ligado && GameState.char) {
      var l = GameState.linhaAtual();
      el.ondeNome.textContent = placaDe(GameState.estacaoAtual());
      el.ondeLinha.textContent = l.nome;
      el.ondeLinha.style.color = l.cor;
      el.proxima.textContent = placaDe(GameState.proximaEstacaoNome());
      var falta = GameState.faltamEstacoes();
      el.destino.textContent = GameState.alvoAtual() + (falta > 0 ? ' · ' + falta : '');
      el.destino.style.color = falta <= 1 ? '#00e676' : '#f2f0ff';

      var mi = missaoAgora();
      el.mQuem.textContent = mi.quem;
      el.mQuem.style.display = mi.quem ? '' : 'none';
      el.mOrdem.textContent = mi.ordem || 'NADA MARCADO AGORA.';
      el.mOrdem.style.color = mi.ordem ? '#f2f0ff' : '#5a5f74';
      if (GameState.perna === 'ida') {
        var fg = GameState.minutosParaOAtraso();
        el.mPrazo.textContent = fg > 0
          ? 'ATÉ ' + GameState.horaLimite() + ' · FALTAM ' + fg + ' MIN'
          : 'ATRASADO. ' + GameState.atrasos + ' DE ' + MAX_ATRASOS;
        el.mPrazo.style.color = fg <= 0 ? '#e8362c' : (fg <= 12 ? '#e8a33c' : '#6a6f84');
      } else {
        el.mPrazo.textContent = 'VOLTA, SEM HORA MARCADA';
        el.mPrazo.style.color = '#6a6f84';
      }

      el.rodape.textContent = 'DIA ' + GameState.dia + ' · ' + GameState.estacoes +
        ' ESTAÇÕES · RECORDE ' + GameState.recorde();
    } else if (ligado) {
      el.mQuem.style.display = 'none';
      el.mOrdem.textContent = 'ESCOLHENDO QUEM VOCÊ É.';
      el.mOrdem.style.color = '#5a5f74';
      el.mPrazo.textContent = '';
      el.ondeNome.textContent = '—';
      el.ondeLinha.textContent = '';
      el.proxima.textContent = '—';
      el.destino.textContent = '—';
      el.hora.textContent = '—';
      el.faixa.textContent = '';
      el.frase.textContent = '';
      el.rodape.textContent = 'RECORDE ' + (GameState.recorde ? GameState.recorde() : 0);
    }
    requestAnimationFrame(atualiza);
  }

  /* ---------- liga e desliga conforme o tamanho da janela ---------- */
  function confere() {
    var cabe = window.innerWidth >= LARGURA_MINIMA
      && window.matchMedia('(pointer: fine)').matches;
    /* O rótulo do botão depende do tamanho da janela (o pixel exato
       pode deixar de caber), então ele é repintado a cada resize e não
       só quando o painel liga ou desliga. */
    if (cabe === ligado) { aplicaEscala(); pintaNitido(); return; }
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
