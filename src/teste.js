/* global Phaser, GameState */
/* Catraca — as salas de teste

   Abrir o jogo direto no ponto que se quer ver, pelo endereço, sem passar
   pelo título, pela escada e pela espera do trem toda vez. É pra quem
   testa (o Renan no celular, o Claude no navegador), e não pra quem joga:
   sem ?teste= no endereço nada disto roda.

     ?teste=estacao:LIBERDADE      a estação, no saguão (qualquer nome da rede)
     ?teste=plataforma:SÉ          a estação, já na plataforma
     ?teste=vagao                  dentro do trem
     ?teste=duelo:cosNuvem         um duelo na estação (tipo de DESAFIANTES)
     ?teste=app:METRODEX           o celular aberto num app (nome do APPS_ZAP)
     &char=estudante&g=f           o personagem e o gênero (padrão: o primeiro)

   Tudo em modo EXPLORAR (sem relógio, sem perder), pra sala de teste não
   gastar coração nem estragar recorde. A ideia é das salas de teste
   ("gyms") dos kits de gamedev: cada mecânica com a sua porta. */
var TESTE = (function () {
  try {
    var q = new URLSearchParams(location.search), t = q.get('teste');
    if (!t) return null;
    var p = t.split(':');
    return { tipo: p[0], arg: p.slice(1).join(':') ? decodeURIComponent(p.slice(1).join(':')).toUpperCase() : '',
      argCru: p.slice(1).join(':'), char: q.get('char'), g: q.get('g') };
  } catch (e) { return null; }
})();

// chamado pelo título quando ele fica pronto
function abreSalaDeTeste(title) {
  if (!TESTE || abreSalaDeTeste.feito) return;
  abreSalaDeTeste.feito = true;
  if (TESTE.char && title.ordem.indexOf(TESTE.char) >= 0) title.sel = title.ordem.indexOf(TESTE.char);
  if (TESTE.g) title.gen[title.ordem[title.sel]] = TESTE.g;
  title.ignoraAct = false; title.saindo = false;
  title.comeca(true);
  var m = title.game.scene;
  var espera = function (chave, fn) {
    var sc = m.getScene(chave);
    if (sc && sc.sys.isActive() && sc.pl) fn(sc); else setTimeout(function () { espera(chave, fn); }, 100);
  };
  espera('Estacao', function (est) {
    var nome = TESTE.arg;
    if (TESTE.tipo === 'estacao' || TESTE.tipo === 'plataforma') {
      if (nome && (LINHAS.azul.estacoes.indexOf(nome) >= 0 || LINHAS.vermelha.estacoes.indexOf(nome) >= 0)) GameState.poeNoTrajeto(nome);
      est.scene.start('Estacao', { onde: TESTE.tipo === 'plataforma' ? 'plataforma' : 'saguao' });
    } else if (TESTE.tipo === 'vagao') {
      est.scene.stop('Estacao');
      est.scene.start('Vagao', {});
    } else if (TESTE.tipo === 'duelo') {
      var tipo = DESAFIANTES[TESTE.argCru] ? TESTE.argCru : sorteiaDesafiante();
      var a = new Ator(est, est.pl.sp.x, est.pl.sp.y - 70, spriteDoDesafiante(tipo));
      a.sp.setDepth(40); a.fixo = true;
      est.fixos.push(a); est.gente.push(a);
      setTimeout(function () { est.duelaNaEstacao(a, tipo, null, null); }, 400);
    } else if (TESTE.tipo === 'app') {
      est.scene.launch('Zap');
      var tentaApp = function () {
        var z = m.getScene('Zap');
        if (!z || !z.sys.isActive() || z.modo !== 'inicio') { setTimeout(tentaApp, 150); return; }
        for (var i = 0; i < APPS_ZAP.length; i++) if (APPS_ZAP[i].nome === nome) { z.abreApp(i); return; }
      };
      setTimeout(tentaApp, 300);
    }
  });
}
