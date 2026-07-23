/* =====================================================================
   ÉTAT PARTAGÉ — état mutable du jeu, achievements, highscores, undo
   ===================================================================== */
import { DIFFICULTES } from './config.js';

/* Objet unique et partagé : tous les modules importent `state` et lisent/
   écrivent directement ses propriétés (équivalent des `let` globaux du
   script original, mais sans polluer le scope global). */
export const state = {
  // disposition / config dérivée (calculée par render.configurer())
  LARGEUR:undefined, HAUTEUR:undefined, COLS:undefined, RANGS:undefined, CELL:undefined,
  PORTEE_DEP:undefined, GX:undefined, GY:undefined, GRID_BAS:undefined, cruiserY:undefined,
  HP_MAX:undefined, MAX_VAISSEAUX:undefined, AILES_MAX:undefined, STARTF:undefined, STARTA:undefined,
  RANG_TIR:undefined, RECHARGE:undefined,
  BTN:undefined, ACT:undefined, ULT:undefined,
  nebuleuses:undefined,
  grandChamp:false,

  // entités
  fighters:undefined, ailes:undefined, asteroides:undefined, bonus:undefined, boss:undefined,
  explosions:undefined, particules:undefined, lasers:undefined, trails:undefined,
  trousNoirs:undefined, champs:undefined, menacesWarn:undefined, bossVaincus:undefined,
  obstacles:undefined,

  // progression de la partie en cours
  ups:undefined, objectifVague:undefined, killsThisWave:undefined, shipsLostThisWave:undefined,
  bossKilledThisWave:undefined, pendingUpgrade:undefined, choixBuild:undefined, pendingEvent:undefined,
  suiteAmelioration:undefined, suiteEvenement:undefined, suiteMission:null,
  carte:undefined, noeudActuel:undefined, secteur:undefined, enCombat:undefined,
  scenePlanete:null,

  ultimeJauge:undefined, ondeChoc:undefined,
  hpCruiser:undefined, score:undefined, phase:undefined, selection:undefined, vague:undefined,
  actionFaite:undefined, modeTourelle:undefined, modeCapacite:null, hangar:undefined, tirsGratuits:undefined,
  boucliersRestants:undefined, ultimeSeuil:undefined,

  lockTimer:undefined, flashCroiseur:undefined, flashRecharge:undefined, secousse:undefined,
  tourCompteur:undefined, prochainAsteroide:undefined, prochainBoss:undefined,
  banniereTxt:undefined, banniereTimer:undefined, ambianceT:undefined,

  comboCount:undefined, comboTimer:undefined, bestCombo:undefined,
  undoStack:[], paused:false,

  // persistant (localStorage)
  achievements:{}, highscores:[],
  meta:{cristaux:0,pvBonus:0,deptAmelio:0,ultimeRapide:0,vaisseauBonus:0},

  damageThisWave:0,
  hoverCell:null, hoverTime:0,

  // difficulté (préférence mémorisée + difficulté active de la partie en cours)
  difficultePreferee:'normal', difficulte:'normal',

  // compteurs de session (utilisés par le tutoriel pour détecter les actions du joueur)
  tirsJoueurTotal:0, deplacementsJoueurTotal:0, toursJoueurTotal:0,
};

export function centreCase(c,r){ return {x:state.GX+c*state.CELL+state.CELL/2, y:state.GY+r*state.CELL+state.CELL/2}; }

/* =====================================================================
   ACHIEVEMENTS + HIGHSCORES + SAUVEGARDE (localStorage)
   ===================================================================== */
export const ACHIEVEMENTS_DEF = {
  'first_blood': {name:'Premier Sang', desc:'Détruire 1 ennemi', check:()=>state.score>=1},
  'combo_3': {name:'Enchaînement', desc:'3 kills en 1 tour', check:()=>state.bestCombo>=3},
  'combo_5': {name:'Massacre', desc:'5 kills en 1 tour', check:()=>state.bestCombo>=5},
  'survivor_5': {name:'Survivant', desc:'Atteindre la vague 5', check:()=>state.vague>=5},
  'survivor_10': {name:'Vétéran', desc:'Atteindre la vague 10', check:()=>state.vague>=10},
  'boss_slayer': {name:'Chasseur de Boss', desc:'Détruire un boss', check:()=>state.achievements.boss_slayer},
  'no_turret': {name:'Sans Tourelle', desc:'Tuer un boss sans tourelle', check:()=>state.achievements.no_turret},
  'perfect_wave': {name:'Vague Parfaite', desc:'Vague sans dégât', check:()=>state.achievements.perfect_wave},
  'asteroid_dodge': {name:'Esquive', desc:'Survivre à 5 astéroïdes', check:()=>state.achievements.asteroid_dodge>=5},
};

export function loadData(){ try{ const h=localStorage.getItem('dc_highscores'); if(h) state.highscores=JSON.parse(h); const a=localStorage.getItem('dc_achievements'); if(a) state.achievements=JSON.parse(a); const m=localStorage.getItem('dc_meta'); if(m) state.meta={...state.meta,...JSON.parse(m)}; }catch(e){} }
export function saveData(){ try{ localStorage.setItem('dc_highscores',JSON.stringify(state.highscores)); localStorage.setItem('dc_achievements',JSON.stringify(state.achievements)); localStorage.setItem('dc_meta',JSON.stringify(state.meta)); }catch(e){} }

/* =====================================================================
   DIFFICULTÉ (préférence mémorisée depuis l'accueil)
   ===================================================================== */
const DIFF_KEY='dc_difficulte';
export function chargerDifficultePreferee(){
  try{ const d=localStorage.getItem(DIFF_KEY); if(d && DIFFICULTES[d]) state.difficultePreferee=d; }catch(e){}
  state.difficulte=state.difficultePreferee;
}
export function definirDifficultePreferee(d){
  if(!DIFFICULTES[d]) return;
  state.difficultePreferee=d; state.difficulte=d;
  try{ localStorage.setItem(DIFF_KEY,d); }catch(e){}
}

/* =====================================================================
   UNDO (snapshot / restauration de l'état du tour)
   ===================================================================== */
export function saveState(){
  state.undoStack.push({
    fighters: state.fighters.map(f=>({...f})),
    ailes: state.ailes.map(a=>({...a})),
    asteroides: state.asteroides.map(a=>({...a})),
    bonus: state.bonus.map(b=>({...b})),
    boss: state.boss?{...state.boss}:null,
    trousNoirs: state.trousNoirs.map(t=>({...t})), champs: state.champs.map(c=>({...c})), menacesWarn: state.menacesWarn.map(w=>({...w})), obstacles: state.obstacles.map(o=>({...o})), bossVaincus: state.bossVaincus, killsThisWave: state.killsThisWave, shipsLostThisWave: state.shipsLostThisWave, bossKilledThisWave: state.bossKilledThisWave, ultimeJauge: state.ultimeJauge,
    hpCruiser: state.hpCruiser, score: state.score, vague: state.vague, actionFaite: state.actionFaite, tirsGratuits: state.tirsGratuits, hangar: state.hangar?{...state.hangar}:null,
    tourCompteur: state.tourCompteur, prochainAsteroide: state.prochainAsteroide, prochainBoss: state.prochainBoss
  });
  if(state.undoStack.length>5) state.undoStack.shift();
}

/* =====================================================================
   SAUVEGARDE AUTOMATIQUE (reprise de partie)
   ===================================================================== */
const SAVE_KEY='dc_partie';
export function sauvegarderPartie(serialiserCarte){
  if(state.phase==='fin'||state.phase==='accueil') return;
  try{ localStorage.setItem(SAVE_KEY, JSON.stringify({
    v:1, secteur:state.secteur, vague:state.vague, score:state.score, hpCruiser:state.hpCruiser, HP_MAX:state.HP_MAX, ups:state.ups, ultimeJauge:state.ultimeJauge, tourCompteur:state.tourCompteur, prochainAsteroide:state.prochainAsteroide,
    enCombat:state.enCombat, objectifVague:state.objectifVague, killsThisWave:state.killsThisWave, shipsLostThisWave:state.shipsLostThisWave, bossKilledThisWave:state.bossKilledThisWave, damageThisWave:state.damageThisWave,
    hangar:state.hangar, actionFaite:state.actionFaite, tirsGratuits:state.tirsGratuits, bossVaincus:state.bossVaincus, difficulte:state.difficulte,
    boucliersRestants:state.boucliersRestants, ultimeSeuil:state.ultimeSeuil,
    fighters: state.fighters.map(f=>({c:f.c,r:f.r,type:f.type,hp:f.hp,used:f.used,capUsed:f.capUsed||false,kills:f.kills||0})),
    ailes: state.ailes.map(a=>({c:a.c,r:a.r,type:a.type,hp:a.hp,maxhp:a.maxhp,vitesse:a.vitesse})),
    asteroides: state.asteroides.map(o=>({c:o.c,r:o.r,dc:o.dc,dr:o.dr,type:o.type,hp:o.hp,maxhp:o.maxhp})),
    bonus: state.bonus.map(b=>({c:b.c,r:b.r,type:b.type,ttl:b.ttl})),
    trousNoirs: state.trousNoirs.map(t=>({c:t.c,r:t.r,turns:t.turns})),
    champs: state.champs.map(c=>({c0:c.c0,c1:c.c1,turns:c.turns})),
    obstacles: state.obstacles.map(o=>({c:o.c,r:o.r,type:o.type,hp:o.hp})),
    menacesWarn:state.menacesWarn, boss: state.boss?{c:state.boss.c,r:state.boss.r,hp:state.boss.hp,maxhp:state.boss.maxhp,type:state.boss.type,charge:state.boss.charge}:null,
    carte: serialiserCarte()
  })); }catch(e){}
}
export function effacerSauvegarde(){ try{ localStorage.removeItem(SAVE_KEY); }catch(e){} }
export function sauvegardeExiste(){ try{ return !!localStorage.getItem(SAVE_KEY); }catch(e){ return false; } }
export function chargerSauvegarde(){ try{ return JSON.parse(localStorage.getItem(SAVE_KEY)); }catch(e){ return null; } }

/* =====================================================================
   STATISTIQUES ANONYMES (mesure de l'équilibrage)
   ===================================================================== */
const STATS_KEY='dc_stats';
export function enregistrerStat(secteur,vague,score){
  try{
    const stats=JSON.parse(localStorage.getItem(STATS_KEY))||[];
    stats.push({secteur,vague,score});
    localStorage.setItem(STATS_KEY,JSON.stringify(stats));
  }catch(e){}
}
export function statsEquilibrage(){
  try{
    const stats=JSON.parse(localStorage.getItem(STATS_KEY))||[];
    if(!stats.length) return {moyenneSecteur:0,total:0};
    return {moyenneSecteur:stats.reduce((s,x)=>s+x.secteur,0)/stats.length, total:stats.length};
  }catch(e){ return {moyenneSecteur:0,total:0}; }
}
