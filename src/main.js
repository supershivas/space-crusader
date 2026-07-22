/* =====================================================================
   DÉFENSE DU CROISEUR — BATAILLE SPATIALE (tour par tour)
   Point d'entrée : cycle de vie de la partie, boucle de jeu, démarrage
   ===================================================================== */
import { state, centreCase, loadData, sauvegardeExiste, chargerSauvegarde, effacerSauvegarde,
         chargerDifficultePreferee, definirDifficultePreferee, statsEquilibrage } from './state.js';
import { ULTIME_MAX, DIFFICULTES, BOUCLIER_USAGES_MAX } from './config.js';
import { spread, nouveauVaisseau, deployerVaisseau, faireAile, fighterEn, getImgAster } from './entities.js';
import { genererCarte, deserialiserCarte, ouvrirCarte, ameliorationAleatoire } from './map.js';
import { demarrerTourJoueur, animer } from './combat.js';
import { initAudio, startMusic } from './audio.js';
import { configurer, redimensionner, initEtoiles, dessinerIllustration, dessiner } from './render.js';
import { ouvrirMeta } from './ui.js';
import { tutorielVu, demarrer as demarrerTuto, relancer as relancerTuto, mettreAJour as mettreAJourTuto } from './tuto.js';

/* ===== ÉTAT VIDE / NOUVELLE PARTIE / REPRISE ===== */
function etatVide(){
  state.fighters=[];state.ailes=[];state.asteroides=[];state.bonus=[];state.boss=null;state.explosions=[];state.particules=[];state.lasers=[];state.trails=[];
  state.trousNoirs=[];state.champs=[];state.menacesWarn=[];state.bossVaincus=0;
  state.ups={portee:0,deplacement:0,bouclier:0,tourelleDouble:0,bonusPlus:0,regen:0};
  state.pendingUpgrade=false;state.choixBuild=false;state.killsThisWave=0;state.shipsLostThisWave=0;state.bossKilledThisWave=false;state.objectifVague=null;state.ultimeJauge=0;state.ondeChoc=0;state.pendingEvent=false;state.suiteAmelioration=null;state.suiteEvenement=null;state.carte=null;state.noeudActuel=null;state.secteur=1;state.enCombat=false;state.scenePlanete=null;
  state.hpCruiser=state.HP_MAX;state.score=0;state.phase='attente';state.selection=null;state.vague=1;state.actionFaite=false;state.modeTourelle=false;state.modeCapacite=null;state.hangar=null;state.tirsGratuits=0;state.boucliersRestants=BOUCLIER_USAGES_MAX;state.ultimeSeuil=ULTIME_MAX;
  state.lockTimer=0;state.flashCroiseur=0;state.flashRecharge=0;state.secousse=0;state.tourCompteur=0;state.ambianceT=0;state.prochainAsteroide=99;state.prochainBoss=99;state.banniereTimer=0;
  state.comboCount=0;state.comboTimer=0;state.bestCombo=0;state.undoStack=[];state.paused=false;
}

function nouvellePartie(){
  state.fighters=[]; for(const c of spread(state.STARTF)) state.fighters.push(nouveauVaisseau(c,state.RANGS-1,'normal',false));
  const centre=Math.round((state.COLS-1)/2); let rc=centre; if(fighterEn(rc,state.RANGS-1)){ for(let d=1;d<state.COLS;d++){ if(!fighterEn(centre-d,state.RANGS-1)){rc=centre-d;break;} if(!fighterEn(centre+d,state.RANGS-1)){rc=centre+d;break;} } }
  state.fighters.push(nouveauVaisseau(rc,state.RANGS-1,'rouge',false));
  state.ailes=[]; state.asteroides=[]; state.bonus=[]; state.boss=null; state.explosions=[]; state.particules=[]; state.lasers=[]; state.trails=[];
  state.trousNoirs=[]; state.champs=[]; state.menacesWarn=[]; state.bossVaincus=0;
  state.ups={portee:0,deplacement:0,bouclier:0,tourelleDouble:0,bonusPlus:0,regen:0};
  state.pendingUpgrade=false; state.choixBuild=false; state.killsThisWave=0; state.shipsLostThisWave=0; state.bossKilledThisWave=false;
  state.ultimeJauge=0; state.ondeChoc=0; state.pendingEvent=false; state.suiteAmelioration=null; state.suiteEvenement=null; state.enCombat=false;
  const M=state.meta||{}; const d=DIFFICULTES[state.difficulte]||DIFFICULTES.normal;
  state.HP_MAX=Math.round(Math.round(100*state.COLS/7)*d.hpMult)+(M.pvBonus||0)*10;   // méta + difficulté : PV de départ
  for(let i=0;i<(M.deptAmelio||0);i++) ameliorationAleatoire();          // méta : améliorations de départ
  state.ultimeJauge=Math.min(ULTIME_MAX,(M.ultimeRapide||0)*6);               // méta : ultime pré-chargé
  for(let i=0;i<(M.vaisseauBonus||0);i++) deployerVaisseau('normal');    // méta : vaisseaux de départ
  state.hpCruiser=state.HP_MAX; state.score=0; state.phase='joueur'; state.selection=null; state.vague=1;
  state.actionFaite=false; state.modeTourelle=false; state.modeCapacite=null; state.hangar=null; state.tirsGratuits=0;
  state.boucliersRestants=BOUCLIER_USAGES_MAX; state.ultimeSeuil=ULTIME_MAX;
  state.lockTimer=0; state.flashCroiseur=0; state.flashRecharge=0; state.secousse=0; state.tourCompteur=0; state.ambianceT=0;
  state.prochainAsteroide=3+Math.floor(Math.random()*2); state.prochainBoss=18+Math.floor(Math.random()*6); state.banniereTimer=0;
  state.comboCount=0; state.comboTimer=0; state.bestCombo=0; state.undoStack=[]; state.paused=false;
  state.achievements.asteroid_dodge=(state.achievements.asteroid_dodge||0); state.achievements.boss_slayer=state.achievements.boss_slayer||false; state.achievements.no_turret=state.achievements.no_turret||false; state.achievements.perfect_wave=state.achievements.perfect_wave||false;
  document.getElementById('accueil').classList.add('cache'); document.getElementById('fin').classList.add('cache');
  document.getElementById('log').innerHTML=''; state.secteur=1; state.enCombat=false; genererCarte(); startMusic(); ouvrirCarte();
}

function reprendrePartie(){
  const d=chargerSauvegarde();
  if(!d) return false;
  etatVide(); configurer();
  state.secteur=d.secteur; state.vague=d.vague; state.score=d.score; state.HP_MAX=d.HP_MAX; state.hpCruiser=d.hpCruiser;
  state.ups=d.ups||state.ups; state.ultimeJauge=d.ultimeJauge||0; state.tourCompteur=d.tourCompteur||0; state.prochainAsteroide=d.prochainAsteroide||4;
  state.enCombat=!!d.enCombat; state.objectifVague=d.objectifVague||null; state.killsThisWave=d.killsThisWave||0;
  state.shipsLostThisWave=d.shipsLostThisWave||0; state.bossKilledThisWave=!!d.bossKilledThisWave; state.damageThisWave=d.damageThisWave||0;
  state.hangar=d.hangar||null; state.actionFaite=!!d.actionFaite; state.tirsGratuits=d.tirsGratuits||0; state.bossVaincus=d.bossVaincus||0;
  state.difficulte=d.difficulte||state.difficultePreferee;
  state.boucliersRestants=(d.boucliersRestants!==undefined)?d.boucliersRestants:BOUCLIER_USAGES_MAX;
  state.ultimeSeuil=d.ultimeSeuil||ULTIME_MAX;
  for(const f of d.fighters||[]) state.fighters.push(nouveauVaisseau(f.c,f.r,f.type,false)), Object.assign(state.fighters[state.fighters.length-1],{hp:f.hp,used:f.used,capUsed:!!f.capUsed});
  for(const a of d.ailes||[]){ faireAile(a.c,a.r,a.type); const na=state.ailes[state.ailes.length-1]; na.hp=a.hp; na.maxhp=a.maxhp; na.vitesse=a.vitesse; const p=centreCase(a.c,a.r); na.x=p.x; na.y=p.y; }
  for(const o of d.asteroides||[]){ const p=centreCase(Math.max(0,Math.min(state.COLS-1,o.c)),Math.max(0,Math.min(state.RANGS-1,o.r))); state.asteroides.push({c:o.c,r:o.r,dc:o.dc,dr:o.dr,x:p.x,y:p.y,ang:0,img:getImgAster(),hp:1,maxhp:1,type:'normal'}); }
  for(const b of d.bonus||[]){ const p=centreCase(b.c,b.r); state.bonus.push({c:b.c,r:b.r,type:b.type,ttl:b.ttl,x:p.x,y:p.y}); }
  for(const t of d.trousNoirs||[]){ const p=centreCase(t.c,t.r); state.trousNoirs.push({c:t.c,r:t.r,turns:t.turns,x:p.x,y:p.y,ang:0}); }
  state.champs=(d.champs||[]).map(c=>({...c})); state.menacesWarn=(d.menacesWarn||[]).map(w=>({...w}));
  if(d.boss){ const p=centreCase(d.boss.c+1,d.boss.r); state.boss={c:d.boss.c,r:d.boss.r,w:3,h:2,hp:d.boss.hp,maxhp:d.boss.maxhp,type:d.boss.type,charge:d.boss.charge,x:p.x,y:p.y+state.CELL/2-state.CELL}; }
  deserialiserCarte(d.carte);
  document.getElementById('accueil').classList.add('cache'); document.getElementById('fin').classList.add('cache');
  document.getElementById('log').innerHTML=''; startMusic(); redimensionner();
  if(state.enCombat) demarrerTourJoueur(); else ouvrirCarte();
  return true;
}

/* =====================================================================
   BOUCLE
   ===================================================================== */
let dernier=0;
function boucle(t){ const dt=Math.min((t-dernier)/1000,.05); dernier=t;
  if(!state.paused){ animer(dt); }
  dessiner(t); mettreAJourTuto(); requestAnimationFrame(boucle); }

/* =====================================================================
   PLEIN ÉCRAN + DÉMARRAGE
   ===================================================================== */
document.getElementById('btnMission').addEventListener('click',()=>{ document.getElementById('mission').classList.remove('visible'); const s=state.suiteMission; state.suiteMission=null; if(s) s(); });
document.getElementById('btnJouer').addEventListener('click',()=>{
  initAudio(); loadData(); effacerSauvegarde();
  const premiereFois=!tutorielVu();
  state.difficulte = premiereFois ? 'facile' : state.difficultePreferee;
  nouvellePartie();
  if(premiereFois) demarrerTuto();
});
document.getElementById('btnReprendre').addEventListener('click',()=>{ initAudio(); loadData(); reprendrePartie(); });
document.getElementById('btnInfo').addEventListener('click',()=>{
  const st=statsEquilibrage();
  document.getElementById('infoStats').textContent = st.total>0 ? '📊 Secteur moyen atteint : '+st.moyenneSecteur.toFixed(1)+' ('+st.total+' partie'+(st.total>1?'s':'')+')' : '';
  document.getElementById('info').classList.add('visible');
});
document.getElementById('btnFermerInfo').addEventListener('click',()=>{ document.getElementById('info').classList.remove('visible'); });
document.getElementById('btnRelancerTuto').addEventListener('click',()=>{
  document.getElementById('info').classList.remove('visible');
  initAudio(); loadData(); effacerSauvegarde();
  state.difficulte='facile'; nouvellePartie(); relancerTuto();
});

document.getElementById('btnRejouer').addEventListener('click',()=>{ initAudio(); state.difficulte=state.difficultePreferee; nouvellePartie(); });
document.getElementById('btnMeta').addEventListener('click',()=>{ ouvrirMeta(); });
document.getElementById('btnMeta2').addEventListener('click',()=>{ ouvrirMeta(); });
document.getElementById('btnFermerMeta').addEventListener('click',()=>{ document.getElementById('meta').classList.remove('visible'); });

/* ===== Sélecteur de difficulté (accueil) ===== */
function rafraichirBoutonsDifficulte(){
  document.querySelectorAll('.diff-btn').forEach(b=>{ b.classList.toggle('diff-actif', b.dataset.diff===state.difficultePreferee); });
  const lbl=document.getElementById('diffLabel');
  if(lbl) lbl.textContent='Niveau : '+DIFFICULTES[state.difficultePreferee].label;
}
document.querySelectorAll('.diff-btn').forEach(b=>{
  b.addEventListener('click',()=>{ definirDifficultePreferee(b.dataset.diff); rafraichirBoutonsDifficulte(); });
});

loadData(); chargerDifficultePreferee(); configurer(); initEtoiles(); etatVide(); redimensionner(); dessinerIllustration();
rafraichirBoutonsDifficulte();
if(sauvegardeExiste()) document.getElementById('btnReprendre').style.display='';
// Premier lancement : afficher l'écran d'aide (INFOS) une seule fois
try{ if(!localStorage.getItem('dc_firstLaunch')){ document.getElementById('info').classList.add('visible'); localStorage.setItem('dc_firstLaunch','1'); } }catch(e){}
requestAnimationFrame(boucle);

/* PWA : enregistre le service worker (hors-ligne + installable). Sans effet si ouvert en file:// */
if('serviceWorker' in navigator){ window.addEventListener('load',()=>{ navigator.serviceWorker.register('sw.js').catch(()=>{}); }); }
