/* Catraca — a configuração do projeto Firebase do login

   Enquanto isto for null o jogo roda só como visitante: o botão de conta
   não aparece, o convite do fim da fase 1 não abre e nenhum script do
   Firebase é baixado.

   Pra ligar: no console do Firebase, Configurações do projeto > Seus apps
   > app da Web, copiar o objeto `firebaseConfig` e colar aqui no lugar do
   null. Esses valores NÃO são segredo: o Firebase foi feito pra eles irem
   no navegador. Quem protege os dados são as regras do Firestore
   (`firestore.rules`, na raiz) e os domínios autorizados do login. O passo
   a passo inteiro está em `docs/login-firebase.md`. */
var FIREBASE_CONFIG = null;
