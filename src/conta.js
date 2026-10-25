/* global firebase, FIREBASE_CONFIG, jogo, CHARSET */
/* Catraca — a conta do jogador

   Decidido com o Renan em 23/10 (sabatina):
   - entra com Google ou com e-mail e senha (com "esqueci minha senha"),
     pelo Firebase Authentication, num projeto só do Catraca;
   - visitante joga direto; ao fechar a fase 1 o jogo convida a criar a
     conta, e o que a pessoa já jogou passa pra ela;
   - o cadastro guarda o apelido e o aceite de novidades (Firestore,
     coleção `jogadores`), e o Renan vê a lista no painel do Firebase;
   - o SAVE fica no navegador por enquanto, separado por conta. Subir o
     save pra nuvem é a etapa seguinte.

   COMO O SAVE FICA SEPARADO SEM MEXER NO JOGO
   O jogo inteiro grava em chaves `metrosp_*` do localStorage, e são dezenas
   de lugares lendo e gravando direto. Em vez de ensinar cada um a perguntar
   "de quem é este save", o save de cada conta vira um PACOTE dessas chaves:
   trocar de conta é guardar o pacote de quem sai, carregar o de quem entra
   e recarregar a página. As chaves vivas são sempre as de quem está jogando,
   e o resto do jogo nem sabe que existe conta.
   Fora do pacote ficam as preferências do APARELHO (som, música, tremida,
   nitidez): quem troca de conta no mesmo celular não quer o volume mudando.

   O formulário é HTML por cima do canvas, e não desenhado no jogo: o
   celular abre o teclado certo, o gerenciador de senhas preenche sozinho, e
   o texto não esbarra nas 26 letras que cabem na fonte do jogo. */

var CONTA_PREFS = ['metrosp_som', 'metrosp_musica', 'metrosp_tremida', 'metrosp_nitido'];
var CONTA_ATIVO = 'catraca_perfil_ativo';        // de quem são as chaves vivas: 'visitante' ou o uid
var CONTA_PACOTE = 'catraca_perfil_';            // + id: o save guardado de quem não está jogando
var CONTA_CONVITE = 'catraca_convite_visto';     // o convite da fase 1 abre uma vez por aparelho
var CONTA_SDK = 'https://www.gstatic.com/firebasejs/10.14.1/';
var APELIDO_MIN = 2, APELIDO_MAX = 12;           // 12: cabe no rodapé do título com folga

var Conta = {
  usuario: null,        // o usuário do Firebase, ou null
  perfil: null,         // { apelido, novidades } do Firestore
  ocupado: false,       // um fluxo nosso está no meio: a troca de save espera ele acabar
  ouvintes: [],
  auth: null, db: null,

  configurada: function () { return typeof FIREBASE_CONFIG !== 'undefined' && !!FIREBASE_CONFIG; },

  /* ---------- os pacotes de save ---------- */
  ativo: function () {
    try { return localStorage.getItem(CONTA_ATIVO) || 'visitante'; } catch (e) { return 'visitante'; }
  },
  chavesDoSave: function () {
    var out = [], i, k;
    try {
      for (i = 0; i < localStorage.length; i++) {
        k = localStorage.key(i);
        if (k && k.indexOf('metrosp_') === 0 && CONTA_PREFS.indexOf(k) < 0) out.push(k);
      }
    } catch (e) { }
    return out;
  },
  guarda: function (id) {
    var p = {}, ks = this.chavesDoSave(), i;
    for (i = 0; i < ks.length; i++) p[ks[i]] = localStorage.getItem(ks[i]);
    try { localStorage.setItem(CONTA_PACOTE + id, JSON.stringify(p)); } catch (e) { }
  },
  limpaVivas: function () {
    var ks = this.chavesDoSave(), i;
    for (i = 0; i < ks.length; i++) { try { localStorage.removeItem(ks[i]); } catch (e) { } }
  },
  temPacote: function (id) {
    try { return localStorage.getItem(CONTA_PACOTE + id) !== null; } catch (e) { return false; }
  },
  carrega: function (id) {
    this.limpaVivas();
    var p = null;
    try { p = JSON.parse(localStorage.getItem(CONTA_PACOTE + id) || 'null'); } catch (e) { p = null; }
    if (p) for (var k in p) { try { localStorage.setItem(k, p[k]); } catch (e) { } }
    try { localStorage.removeItem(CONTA_PACOTE + id); } catch (e) { }   // o save agora mora nas vivas
    try { localStorage.setItem(CONTA_ATIVO, id); } catch (e) { }
  },
  /* Entrou alguém. Devolve true se as chaves vivas mudaram (aí a página
     recarrega pro jogo ler o save novo do zero).
     - era a mesma conta: nada;
     - era visitante e esta conta JÁ tem save neste navegador: o visitante
       é guardado e o save da conta volta;
     - era visitante e a conta não tem save aqui (conta nova, ou aparelho
       novo): o que o visitante jogou passa pra conta — é o "cadastre-se
       pra não perder seu progresso";
     - era outra conta: guarda a dela, carrega a desta (ou começa do zero). */
  trocaPara: function (uid) {
    var era = this.ativo();
    if (era === uid) return false;
    if (era === 'visitante' && !this.temPacote(uid)) {
      try { localStorage.setItem(CONTA_ATIVO, uid); } catch (e) { }
      return false;
    }
    this.guarda(era);
    this.carrega(uid);
    return true;
  },
  // saiu: o save da conta é guardado e o do visitante (se havia) volta
  voltaAVisitante: function () {
    var era = this.ativo();
    if (era === 'visitante') return false;
    this.guarda(era);
    this.carrega('visitante');
    return true;
  },

  /* ---------- o Firebase, carregado só quando há projeto ---------- */
  inicia: function () {
    if (!this.configurada()) return;
    var eu = this;
    this.injetaEstilo();
    var vai = function () {
      try {
        if (!firebase.apps || !firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
        eu.auth = firebase.auth();
        eu.auth.languageCode = 'pt';
        eu.db = firebase.firestore();
      } catch (e) { if (typeof console !== 'undefined') console.warn('Conta: Firebase não iniciou', e); return; }
      // volta de um login com Google por redirecionamento (popup bloqueado)
      if (eu.auth.getRedirectResult) eu.auth.getRedirectResult().catch(function (e) { eu.erroNoForm(e); });
      eu.auth.onAuthStateChanged(function (u) { eu.mudouUsuario(u); });
    };
    if (typeof firebase !== 'undefined' && firebase.auth) { vai(); return; }
    this.carregaScripts(['firebase-app-compat.js', 'firebase-auth-compat.js', 'firebase-firestore-compat.js'], vai);
  },
  carregaScripts: function (lista, pronto) {
    var eu = this;
    if (!lista.length) { pronto(); return; }
    var s = document.createElement('script');
    s.src = CONTA_SDK + lista[0];
    s.onload = function () { eu.carregaScripts(lista.slice(1), pronto); };
    s.onerror = function () { };     // sem internet: o jogo segue como visitante, sem botão de conta
    document.head.appendChild(s);
  },
  mudouUsuario: function (u) {
    var eu = this;
    this.usuario = u;
    if (!u) { this.perfil = null; this.avisa(); return; }
    if (this.ocupado) return;              // criar conta e Google cuidam do resto sozinhos
    this.lePerfil(u, function (p) {
      eu.perfil = p;
      // conta sem perfil (primeiro login com Google): falta o apelido
      if (!p) { eu.abre('apelido'); return; }
      eu.entrou();
    });
  },
  lePerfil: function (u, fim) {
    this.db.collection('jogadores').doc(u.uid).get()
      .then(function (d) { fim(d.exists ? d.data() : null); })
      .catch(function () { fim(null); });
  },
  gravaPerfil: function (u, dados) {
    var agora = firebase.firestore.FieldValue.serverTimestamp();
    var d = { apelido: dados.apelido, novidades: !!dados.novidades, atualizadoEm: agora };
    if (dados.novo) { d.criadoEm = agora; d.provedor = dados.provedor || 'senha'; }
    return this.db.collection('jogadores').doc(u.uid).set(d, { merge: true });
  },
  // o login terminou de verdade: troca o save se preciso e avisa o título
  entrou: function () {
    this.ocupado = false;
    if (this.trocaPara(this.usuario.uid)) { location.reload(); return; }
    this.fecha();
    this.avisa();
  },

  /* ---------- o que o resto do jogo usa ---------- */
  logado: function () { return !!(this.usuario && this.perfil); },
  // o que o botão do título mostra: só letra que a fonte do jogo tem
  rotulo: function () {
    if (!this.logado()) return 'ENTRAR';
    var a = String(this.perfil.apelido || 'CONTA').toUpperCase(), out = '', i;
    for (i = 0; i < a.length; i++) if (CHARSET.indexOf(a.charAt(i)) >= 0) out += a.charAt(i);
    return out || 'CONTA';
  },
  aoMudar: function (fn) { this.ouvintes.push(fn); },
  // a cena que ouvia morreu: o título renasce a cada volta, e o ouvinte velho apontaria pra texto morto
  tiraOuvinte: function (fn) { var i = this.ouvintes.indexOf(fn); if (i >= 0) this.ouvintes.splice(i, 1); },
  avisa: function () {
    for (var i = 0; i < this.ouvintes.length; i++) { try { this.ouvintes[i](); } catch (e) { } }
  },
  /* O convite: fechou a fase 1 jogando como visitante, uma vez por aparelho.
     Espera o balanço aparecer antes (a pessoa vê o que conquistou, e aí o
     convite pra não perder faz sentido). */
  convida: function (fase) {
    if (!this.configurada() || fase !== 1 || this.logado() || this.ativo() !== 'visitante') return;
    try { if (localStorage.getItem(CONTA_CONVITE)) return; localStorage.setItem(CONTA_CONVITE, '1'); } catch (e) { return; }
    var eu = this;
    setTimeout(function () { eu.abre('convite'); }, 1800);
  },

  /* ---------- as ações ---------- */
  entraComGoogle: function () {
    var eu = this, p = new firebase.auth.GoogleAuthProvider();
    this.ocupado = true;
    this.carregando(true);
    this.auth.signInWithPopup(p).then(function (r) {
      eu.usuario = r.user;
      eu.lePerfil(r.user, function (perfil) {
        eu.perfil = perfil;
        eu.carregando(false);
        if (!perfil) { eu.abre('apelido', { sugestao: (r.user.displayName || '').split(' ')[0] }); return; }
        eu.entrou();
      });
    }).catch(function (e) {
      if (e && (e.code === 'auth/popup-blocked' || e.code === 'auth/operation-not-supported-in-this-environment')) {
        eu.ocupado = false;
        eu.auth.signInWithRedirect(p);
        return;
      }
      eu.ocupado = false;
      eu.carregando(false);
      eu.erroNoForm(e);
    });
  },
  entraComEmail: function (email, senha) {
    var eu = this;
    this.ocupado = true;
    this.carregando(true);
    this.auth.signInWithEmailAndPassword(email, senha).then(function (r) {
      eu.usuario = r.user;
      eu.lePerfil(r.user, function (perfil) {
        eu.perfil = perfil;
        eu.carregando(false);
        if (!perfil) { eu.abre('apelido'); return; }
        eu.entrou();
      });
    }).catch(function (e) { eu.ocupado = false; eu.carregando(false); eu.erroNoForm(e); });
  },
  criaConta: function (apelido, email, senha, novidades) {
    var eu = this;
    this.ocupado = true;
    this.carregando(true);
    this.auth.createUserWithEmailAndPassword(email, senha).then(function (r) {
      eu.usuario = r.user;
      return eu.gravaPerfil(r.user, { apelido: apelido, novidades: novidades, novo: true, provedor: 'senha' })
        .then(function () { eu.perfil = { apelido: apelido, novidades: !!novidades }; eu.carregando(false); eu.entrou(); });
    }).catch(function (e) { eu.ocupado = false; eu.carregando(false); eu.erroNoForm(e); });
  },
  salvaApelido: function (apelido, novidades) {
    var eu = this, u = this.usuario;
    if (!u) return;
    this.carregando(true);
    var novo = !this.perfil;
    var prov = (u.providerData && u.providerData[0] && u.providerData[0].providerId === 'google.com') ? 'google' : 'senha';
    this.gravaPerfil(u, { apelido: apelido, novidades: novidades, novo: novo, provedor: prov }).then(function () {
      eu.perfil = { apelido: apelido, novidades: !!novidades };
      eu.carregando(false);
      eu.entrou();
    }).catch(function (e) { eu.carregando(false); eu.erroNoForm(e); });
  },
  mudaNovidades: function (sim) {
    if (!this.logado()) return;
    this.perfil.novidades = !!sim;
    this.gravaPerfil(this.usuario, { apelido: this.perfil.apelido, novidades: sim }).catch(function () { });
  },
  esqueciSenha: function (email) {
    var eu = this;
    if (!email) { this.mostraErro('Escreva o seu e-mail no campo acima.'); return; }
    this.carregando(true);
    this.auth.sendPasswordResetEmail(email).then(function () {
      eu.carregando(false);
      eu.mostraErro('Se houver uma conta com esse e-mail, o link pra trocar a senha chega em instantes. Olhe o spam também.', true);
    }).catch(function (e) { eu.carregando(false); eu.erroNoForm(e); });
  },
  sai: function () {
    var troca = this.voltaAVisitante();
    this.auth.signOut().then(function () { if (troca) location.reload(); });
    if (!troca) { this.fecha(); this.avisa(); }
  },
  /* Apagar a conta (LGPD): o perfil no Firestore, o login e o save dela
     neste navegador. O que sobra é um visitante zerado. O Firebase pede
     login recente pra apagar: se a sessão for velha, ele recusa e a gente
     explica em vez de fingir que apagou. */
  apaga: function () {
    var eu = this, u = this.usuario;
    if (!u) return;
    this.carregando(true);
    this.db.collection('jogadores').doc(u.uid).delete().catch(function () { }).then(function () {
      return u.delete();
    }).then(function () {
      eu.limpaVivas();
      try { localStorage.removeItem(CONTA_PACOTE + u.uid); } catch (e) { }
      eu.carrega('visitante');
      location.reload();
    }).catch(function (e) {
      eu.carregando(false);
      if (e && e.code === 'auth/requires-recent-login') {
        eu.mostraErro('Por segurança, saia e entre de novo, e então apague a conta.');
      } else eu.erroNoForm(e);
    });
  },

  /* ---------- as mensagens de erro, em português ---------- */
  ERROS: {
    'auth/email-already-in-use': 'Esse e-mail já tem conta. Entre com ele, ou use "esqueci minha senha".',
    'auth/invalid-email': 'Esse e-mail não parece certo. Confira se tem @ e o domínio.',
    'auth/weak-password': 'A senha precisa de pelo menos 6 caracteres.',
    'auth/wrong-password': 'E-mail ou senha não conferem.',
    'auth/user-not-found': 'E-mail ou senha não conferem.',
    'auth/invalid-credential': 'E-mail ou senha não conferem.',
    'auth/invalid-login-credentials': 'E-mail ou senha não conferem.',
    'auth/missing-password': 'Escreva a senha.',
    'auth/too-many-requests': 'Muitas tentativas seguidas. Espere uns minutos e tente de novo.',
    'auth/network-request-failed': 'Sem conexão. Confira a internet e tente de novo.',
    'auth/popup-closed-by-user': 'A janela do Google foi fechada antes de terminar.',
    'auth/cancelled-popup-request': 'A janela do Google foi fechada antes de terminar.',
    'auth/unauthorized-domain': 'Este endereço ainda não está liberado no login. Avise o Renan.',
    'permission-denied': 'Não deu pra salvar o apelido. Tente de novo.'
  },
  erroNoForm: function (e) {
    var c = e && e.code ? e.code : '';
    this.mostraErro(this.ERROS[c] || 'Não deu certo agora. Tente de novo em instantes.');
    if (!this.ERROS[c] && typeof console !== 'undefined') console.warn('Conta:', e);
  },

  /* ---------- o quadro (HTML por cima do jogo) ---------- */
  aberto: false,
  injetaEstilo: function () {
    if (document.getElementById('conta-estilo')) return;
    /* A fonte pixel do jogo fica nos TÍTULOS e BOTÕES, que é onde ela é
       identidade. Texto corrido, rótulo e campo vão na fonte do sistema:
       medido no print de 375px, a pixel em parágrafo encostava uma linha na
       outra (o título do convite quebrava em duas linhas coladas) e a
       caixinha de novidades virava um bloco de letra espaçada. */
    var css = [
      '@font-face{font-family:CatracaPixel;src:url(assets/fonte/CatracaPixel-Regular.ttf) format("truetype");font-display:swap}',
      '#conta{position:fixed;inset:0;z-index:50;display:flex;align-items:center;justify-content:center;',
      'background:rgba(5,5,10,.82);padding:16px;box-sizing:border-box;font:15px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;',
      // o painel lateral do desktop espalha letter-spacing (e tem uma .marca de 6px): nada disso entra aqui
      'letter-spacing:normal;text-align:left}',
      '#conta[hidden]{display:none}',
      // border-box: sem ele o max-height não contava padding e borda, e o quadro alto perdia as bordas no celular
      '#conta .c-cx{position:relative;box-sizing:border-box;width:100%;max-width:360px;max-height:100%;overflow:auto;background:#0b0b12;color:#f2f0ff;',
      'border:3px solid #f2c14e;box-shadow:0 0 0 3px #08080e,6px 6px 0 #08080e;padding:24px 20px 20px}',
      '#conta h2{margin:0 40px 12px 0;font:20px/1.35 CatracaPixel,ui-monospace,Menlo,Consolas,monospace;color:#f2c14e;letter-spacing:.02em}',
      '#conta p{margin:0 0 16px;color:#c9cbe0}',
      '#conta label{display:block;font-size:14px;font-weight:600;margin:14px 0 6px;color:#f2f0ff}',
      '#conta input[type=email],#conta input[type=password],#conta input[type=text]{width:100%;box-sizing:border-box;',
      'font:16px/1.3 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:#f2f0ff;background:#14141f;border:2px solid #5a5f74;padding:11px 12px;border-radius:0}',
      '#conta input:focus{outline:none;border-color:#f2c14e}',
      '#conta .c-marca{display:flex;gap:12px;align-items:flex-start;margin:18px 0 4px;font-size:14px;font-weight:400;line-height:1.45;color:#c9cbe0;cursor:pointer}',
      '#conta .c-marca input{width:22px;height:22px;margin:0;flex:0 0 auto;accent-color:#00e676}',
      // 15px e sem espaçamento extra: medido no print de 375px, ENTRAR COM GOOGLE a 16px encostava nas laterais do botão
      '#conta button{display:block;width:100%;min-height:48px;margin-top:12px;padding:0 12px;font:15px CatracaPixel,ui-monospace,Menlo,Consolas,monospace;letter-spacing:0;',
      'color:#08080e;background:#00e676;border:0;box-shadow:inset 0 -4px 0 rgba(0,0,0,.28);cursor:pointer}',
      '#conta form button[type=submit]{margin-top:18px}',
      '#conta button.c-g{background:#f2f0ff;color:#14141c}',
      '#conta button.c-sec{background:#14141f;color:#f2f0ff;border:2px solid #5a5f74;box-shadow:none}',
      '#conta button.c-perigo{background:#14141f;color:#ff8a80;border:2px solid #e8362c;box-shadow:none}',
      '#conta button:disabled{opacity:.5;cursor:wait}',
      '#conta button:focus-visible,#conta a:focus-visible,#conta .c-x:focus-visible{outline:3px solid #f2c14e;outline-offset:2px}',
      '#conta .c-x{position:absolute;top:12px;right:10px;width:40px;height:40px;min-height:0;margin:0;padding:0;background:none;box-shadow:none;color:#8b90a6;font:22px/1 system-ui,sans-serif}',
      '#conta .c-ou{display:flex;align-items:center;gap:12px;margin:20px 0 4px;font-size:13px;color:#8b90a6}',
      '#conta .c-ou:before,#conta .c-ou:after{content:"";flex:1;height:2px;background:#2a2a3a}',
      '#conta .c-links{display:flex;justify-content:space-between;flex-wrap:wrap;gap:12px;margin-top:18px;font-size:14px}',
      '#conta a{color:#f2c14e;text-underline-offset:3px}',
      '#conta .c-erro{min-height:1.5em;margin:12px 0 0;font-size:14px;color:#ff8a80}',
      '#conta .c-erro:empty{min-height:0;margin:0}',
      '#conta .c-erro.c-ok{color:#00e676}',
      '#conta .c-rodape{margin:18px 0 0;font-size:13px;color:#8b90a6}',
      '#conta .c-quem{font-size:14px;color:#8b90a6;margin:-6px 0 14px;word-break:break-all}'
    ].join('');
    var s = document.createElement('style');
    s.id = 'conta-estilo';
    s.textContent = css;
    document.head.appendChild(s);
  },
  raiz: function () {
    var r = document.getElementById('conta');
    if (r) return r;
    r = document.createElement('div');
    r.id = 'conta';
    r.hidden = true;
    r.setAttribute('role', 'dialog');
    r.setAttribute('aria-modal', 'true');
    r.setAttribute('aria-labelledby', 'conta-titulo');
    document.body.appendChild(r);
    var eu = this;
    // tocar fora do quadro fecha (menos no apelido, que é passo obrigatório)
    r.addEventListener('click', function (ev) { if (ev.target === r && eu.vista !== 'apelido') eu.fecha(); });
    document.addEventListener('keydown', function (ev) {
      if (eu.aberto && ev.key === 'Escape' && eu.vista !== 'apelido') eu.fecha();
    });
    return r;
  },
  esc: function (t) {
    return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  },
  VISTAS: {
    entrar: function (eu) {
      return '<h2 id="conta-titulo">SUA CONTA</h2>' +
        '<p>Entre pra guardar o seu progresso.</p>' +
        '<button type="button" class="c-g" data-faz="google">ENTRAR COM GOOGLE</button>' +
        '<div class="c-ou">OU COM E-MAIL</div>' +
        '<form data-form="entrar" novalidate>' +
        '<label for="c-email">E-mail</label><input id="c-email" type="email" name="email" autocomplete="email" inputmode="email" required>' +
        '<label for="c-senha">Senha</label><input id="c-senha" type="password" name="senha" autocomplete="current-password" required>' +
        '<p class="c-erro" role="alert" aria-live="polite"></p>' +
        '<button type="submit">ENTRAR</button></form>' +
        '<div class="c-links"><a href="#" data-faz="esqueci">Esqueci minha senha</a><a href="#" data-faz="criar">Criar conta</a></div>' +
        eu.rodapePrivacidade();
    },
    criar: function (eu) {
      return '<h2 id="conta-titulo">CRIAR CONTA</h2>' +
        '<p>Leva menos de um minuto.</p>' +
        '<button type="button" class="c-g" data-faz="google">CRIAR COM GOOGLE</button>' +
        '<div class="c-ou">OU COM E-MAIL</div>' +
        '<form data-form="criar" novalidate>' +
        '<label for="c-apelido">Apelido no jogo</label><input id="c-apelido" type="text" name="apelido" autocomplete="nickname" maxlength="' + APELIDO_MAX + '" required>' +
        '<label for="c-email">E-mail</label><input id="c-email" type="email" name="email" autocomplete="email" inputmode="email" required>' +
        '<label for="c-senha">Senha (pelo menos 6 caracteres)</label><input id="c-senha" type="password" name="senha" autocomplete="new-password" minlength="6" required>' +
        eu.caixaNovidades() +
        '<p class="c-erro" role="alert" aria-live="polite"></p>' +
        '<button type="submit">CRIAR CONTA</button></form>' +
        '<div class="c-links"><a href="#" data-faz="entrar">Já tenho conta</a></div>' +
        eu.rodapePrivacidade();
    },
    apelido: function (eu, op) {
      return '<h2 id="conta-titulo">COMO TE CHAMAMOS?</h2>' +
        '<p>É o nome que aparece no jogo. Dá pra trocar depois.</p>' +
        '<form data-form="apelido" novalidate>' +
        '<label for="c-apelido">Apelido no jogo</label><input id="c-apelido" type="text" name="apelido" autocomplete="nickname" maxlength="' + APELIDO_MAX + '" value="' + eu.esc(((op && op.sugestao) || '').slice(0, APELIDO_MAX)) + '" required>' +
        eu.caixaNovidades() +
        '<p class="c-erro" role="alert" aria-live="polite"></p>' +
        '<button type="submit">SALVAR</button></form>' + eu.rodapePrivacidade();
    },
    logado: function (eu) {
      var p = eu.perfil || {}, u = eu.usuario || {};
      return '<button type="button" class="c-x" data-faz="fecha" aria-label="Fechar">✕</button>' +
        '<h2 id="conta-titulo">OI, ' + eu.esc(String(p.apelido || '').toUpperCase()) + '</h2>' +
        '<p class="c-quem">' + eu.esc(u.email || '') + '</p>' +
        '<p>Seu progresso fica guardado neste navegador, na sua conta.</p>' +
        '<label class="c-marca"><input type="checkbox" data-faz="novidades"' + (p.novidades ? ' checked' : '') + '> Quero receber novidades do Catraca por e-mail</label>' +
        '<p class="c-erro" role="alert" aria-live="polite"></p>' +
        '<button type="button" class="c-sec" data-faz="sair">SAIR DA CONTA</button>' +
        '<button type="button" class="c-perigo" data-faz="apagar">APAGAR CONTA</button>' + eu.rodapePrivacidade();
    },
    apagar: function (eu) {
      return '<h2 id="conta-titulo">APAGAR A CONTA?</h2>' +
        '<p>Isso apaga o seu cadastro e o progresso salvo nesta conta. Não dá pra desfazer.</p>' +
        '<p class="c-erro" role="alert" aria-live="polite"></p>' +
        '<button type="button" class="c-perigo" data-faz="apagaMesmo">APAGAR DE VEZ</button>' +
        '<button type="button" class="c-sec" data-faz="logado">VOLTAR</button>';
    },
    convite: function (eu) {
      return '<button type="button" class="c-x" data-faz="fecha" aria-label="Fechar">✕</button>' +
        '<h2 id="conta-titulo">GUARDE SEU PROGRESSO</h2>' +
        '<p>Primeira fase feita. Crie uma conta pra não perder o que você jogou.</p>' +
        '<button type="button" data-faz="criar">CRIAR CONTA</button>' +
        '<button type="button" class="c-sec" data-faz="entrar">JÁ TENHO CONTA</button>' +
        '<button type="button" class="c-sec" data-faz="fecha">AGORA NÃO</button>';
    }
  },
  // desmarcada de saída: aceite de novidade tem que ser escolha (LGPD), não padrão
  caixaNovidades: function () {
    return '<label class="c-marca"><input type="checkbox" name="novidades"> Quero receber novidades do Catraca por e-mail (opcional)</label>';
  },
  rodapePrivacidade: function () {
    return '<p class="c-rodape">Seus dados servem só pra sua conta no jogo. <a href="privacidade.html" target="_blank" rel="noopener">Privacidade</a></p>';
  },
  abre: function (vista, op) {
    if (!this.configurada()) return;
    if (!vista) vista = this.logado() ? 'logado' : 'entrar';
    var r = this.raiz(), eu = this;
    this.vista = vista;
    var fecha = (vista === 'entrar' || vista === 'criar') ? '<button type="button" class="c-x" data-faz="fecha" aria-label="Fechar">✕</button>' : '';
    r.innerHTML = '<div class="c-cx">' + fecha + this.VISTAS[vista](this, op) + '</div>';
    r.hidden = false;
    this.aberto = true;
    this.surdaOJogo(true);
    var liga = function (sel, ev, fn) {
      var l = r.querySelectorAll(sel);
      for (var i = 0; i < l.length; i++) l[i].addEventListener(ev, fn);
    };
    liga('[data-faz]', 'click', function (ev) {
      var f = this.getAttribute('data-faz');
      if (f === 'novidades') { eu.mudaNovidades(this.checked); return; }
      ev.preventDefault();
      eu.age(f);
    });
    liga('form', 'submit', function (ev) { ev.preventDefault(); eu.envia(this); });
    // o foco vai pro primeiro campo (no celular isso já abre o teclado: só no desktop)
    var primeiro = r.querySelector('input[type=text],input[type=email]') || r.querySelector('button');
    if (primeiro && !('ontouchstart' in window)) primeiro.focus();
  },
  age: function (f) {
    if (f === 'fecha') this.fecha();
    else if (f === 'google') this.entraComGoogle();
    else if (f === 'criar' || f === 'entrar' || f === 'logado' || f === 'apagar') this.abre(f);
    else if (f === 'esqueci') { var em = document.getElementById('c-email'); this.esqueciSenha(em ? em.value.trim() : ''); }
    else if (f === 'sair') this.sai();
    else if (f === 'apagaMesmo') this.apaga();
  },
  envia: function (form) {
    var v = function (n) { var c = form.elements[n]; return c ? (c.type === 'checkbox' ? c.checked : c.value.trim()) : ''; };
    var tipo = form.getAttribute('data-form');
    if (tipo === 'entrar') {
      if (!v('email') || !v('senha')) { this.mostraErro('Escreva o e-mail e a senha.'); return; }
      this.entraComEmail(v('email'), form.elements.senha.value);
      return;
    }
    var ap = this.validaApelido(v('apelido'));
    if (ap.erro) { this.mostraErro(ap.erro); return; }
    if (tipo === 'apelido') { this.salvaApelido(ap.ok, v('novidades')); return; }
    if (!v('email')) { this.mostraErro('Escreva o seu e-mail.'); return; }
    if (form.elements.senha.value.length < 6) { this.mostraErro('A senha precisa de pelo menos 6 caracteres.'); return; }
    this.criaConta(ap.ok, v('email'), form.elements.senha.value, v('novidades'));
  },
  /* Apelido aparece na fonte do jogo, que só tem A-Z, números, acentos do
     português e uns sinais. Letra fora dela vira buraco na tela, então a
     regra é a da fonte, e o aviso diz isso em vez de recusar calado. */
  validaApelido: function (a) {
    a = String(a || '').replace(/\s+/g, ' ').trim();
    if (a.length < APELIDO_MIN) return { erro: 'O apelido precisa de pelo menos ' + APELIDO_MIN + ' letras.' };
    if (a.length > APELIDO_MAX) return { erro: 'O apelido pode ter até ' + APELIDO_MAX + ' letras.' };
    var up = a.toUpperCase(), i;
    for (i = 0; i < up.length; i++) {
      if (CHARSET.indexOf(up.charAt(i)) < 0) return { erro: 'Use só letras, números e espaço no apelido.' };
    }
    return { ok: a };
  },
  mostraErro: function (t, bom) {
    var r = document.getElementById('conta'), e = r && r.querySelector('.c-erro');
    if (!e) return;
    e.textContent = t;
    e.className = 'c-erro' + (bom ? ' c-ok' : '');
  },
  carregando: function (sim) {
    var r = document.getElementById('conta');
    if (!r) return;
    var bs = r.querySelectorAll('button:not(.c-x)');
    for (var i = 0; i < bs.length; i++) bs[i].disabled = !!sim;
  },
  fecha: function () {
    var r = document.getElementById('conta');
    if (r) { r.hidden = true; r.innerHTML = ''; }
    this.aberto = false;
    this.vista = null;
    this.surdaOJogo(false);
  },
  /* Com o quadro aberto o jogo fica surdo, teclado E toque.
     - Teclado: o Phaser captura espaço e setas (preventDefault), e o apelido
       não aceitaria espaço.
     - Toque: o Phaser escuta o soltar do dedo na JANELA inteira, não só no
       canvas, e testa o que está embaixo daquele ponto. Medido: o botão
       CRIAR CONTA fica em cima do JOGAR do título, e soltar o dedo nele
       apertava o JOGAR também. A campanha abria por trás do quadro e
       regravava os pontos do visitante (77 viravam 0) antes de eles irem
       pra conta. */
  surdaOJogo: function (sim) {
    try {
      if (typeof jogo === 'undefined' || !jogo.input) return;
      jogo.input.enabled = !sim;
      if (jogo.input.keyboard) jogo.input.keyboard.enabled = !sim;
    } catch (e) { }
  }
};

Conta.inicia();
