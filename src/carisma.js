/* global Phaser, GameState */
/* Catraca — o carisma como moeda social

   'Pra que se usa o carisma? Ele tá meio solto ali.' Estava mesmo: zerar
   matava, e ele dava uma forcinha no empurrão da porta. Agora ele é o que
   faz os outros te darem passagem, e gastar carisma é PEDIR FAVOR:

   - o guarda da ronda deixa passar, se você souber pedir (-20);
   - alguém cede o lugar quando você está acabado (-12);
   - o ambulante fia o lanche quando falta grana (-15);
   - e, sem gastar nada, quem tem carisma começa o duelo com mais fôlego:
     a conversa já começa do seu lado.

   A regra é sempre a mesma: precisa TER, e usar CUSTA. Carisma alto não
   é escudo, é crédito — e crédito acaba. */

var FAVORES = { guarda: { pede: 45, custa: 20 }, lugar: { pede: 60, custa: 12 }, fiado: { pede: 40, custa: 15 } };

// dá pra pedir esse favor agora?
function podePedir(qual) {
  var f = FAVORES[qual];
  return !!f && GameState.carisma >= f.pede;
}
// pediu: cobra o carisma e devolve true
function pedeFavor(qual) {
  if (!podePedir(qual)) return false;
  GameState.addCarisma(-FAVORES[qual].custa);
  GameState.stats.favores = (GameState.stats.favores || 0) + 1;
  sfx('ok');
  return true;
}
/* No duelo, o carisma vira fôlego: cada ponto acima de 50 rende 0,4 de
   paciência, até +20. Quem é bem quisto começa a conversa ganhando. */
function folegoDoCarisma() {
  return Math.max(0, Math.min(20, Math.round((GameState.carisma - 50) * 0.4)));
}

/* ---------- alguém cede o lugar ----------
   Você acabado (descanso no fim) e bem quisto: uma vez por viagem,
   alguém sentado levanta e te chama. É o inverso do 'ceda o lugar' que o
   jogo já cobra de você, e é o que faz o carisma valer a pena. */
VagaoScene.prototype.vigiaOfertaDeLugar = function (dt) {
  if (this.ofertou || this.sentadoEm || this.dialog || this.batalha || this.ronda || this.treino) return;
  if (GameState.descanso > GameState.char.descansoMax * 0.22 || !podePedir('lugar')) return;
  this._tOferta = (this._tOferta || 0) + dt;
  if (this._tOferta < 2500) return;
  this.ofertou = true;
  var b = null, i, dist = 1e9;
  for (i = 0; i < (this.bancos || []).length; i++) {
    var q = this.bancos[i];
    if (q.npc && q.npc !== 'player' && Math.abs(q.y - this.pl.sp.y) < dist) { dist = Math.abs(q.y - this.pl.sp.y); b = q; }
  }
  if (!b || dist > 200) return;
  var eu = this;
  fala(this, noGenero('"Senta aqui, moç{o|a}. Você tá branc{o|a}."\nAlguém levantou pra você.'), [
    { label: 'Aceitar (-12 carisma)', cb: function () {
      if (!pedeFavor('lugar')) return;
      var a = b.npc, k = eu.gente.indexOf(a);
      if (k >= 0) eu.gente.splice(k, 1);
      if (a && a.destroy) a.destroy();
      b.npc = null;
      eu.senta(b);
      eu.flash('SENTOU. AGRADECE COM O OLHO.');
    } },
    { label: noGenero('Obrigad{o|a}, pode ficar'), cb: function () { GameState.addCarisma(2); } }
  ]);
};
