/* =====================================================================
   DÉFENSE DU CROISEUR — BATAILLE SPATIALE (tour par tour)
   Point d'entrée : cycle de vie de la partie, boucle de jeu, démarrage
   ===================================================================== */
import { state, centreCase, loadData, sauvegardeExiste, chargerSauvegarde, effacerSauvegarde,
         chargerDifficultePreferee, definirDifficultePreferee, statsEquilibrage } from './state.js';
import { ULTIME_MAX, DIFFICULTES, BOUCLIER_USAGES_MAX, OBSTACLES, SHIPS, CAPACITES } from './config.js';
import { spread, nouveauVaisseau, deployerVaisseau, faireAile, fighterEn, getImgAster } from './entities.js';
import { genererCarte, deserialiserCarte, ouvrirCarte, ameliorationAleatoire } from './map.js';
import { demarrerTourJoueur, animer } from './combat.js';
import { initAudio, startMusic } from './audio.js';
import { configurer, redimensionner, initEtoiles, dessinerIllustration, dessiner, randomiserAccueil } from './render.js';
import { ouvrirMeta, togglePause, retourAccueil, abandonnerPartie, montrerToast, ouvrirMaj, ouvrirGuide, demanderConfirmation, majMeilleurScoreAccueil } from './ui.js';
import { cuireFit, JOUEUR, iconCanvas } from './sprites.js';
import { t, chargerLangue, langueSuivante, appliquerLangue } from './i18n.js';
import { tutorielVu, demarrer as demarrerTuto, relancer as relancerTuto, mettreAJour as mettreAJourTuto } from './tuto.js';
import { VERSION } from './version.js';

/* ===== ÉTAT VIDE / NOUVELLE PARTIE / REPRISE ===== */
function etatVide(){
  state.fighters=[];state.ailes=[];state.asteroides=[];state.bonus=[];state.boss=null;state.explosions=[];state.particules=[];state.lasers=[];state.trails=[];state.dmgTexts=[];
  state.trousNoirs=[];state.champs=[];state.menacesWarn=[];state.obstacles=[];state.bossVaincus=0;
  state.ups={portee:0,deplacement:0,bouclier:0,tourelleDouble:0,bonusPlus:0,regen:0};
  state.pendingUpgrade=false;state.choixBuild=false;state.killsThisWave=0;state.shipsLostThisWave=0;state.bossKilledThisWave=false;state.scoreAvantVague=0;state.objectifVague=null;state.ultimeJauge=0;state.ondeChoc=0;state.pendingEvent=false;state.suiteAmelioration=null;state.suiteEvenement=null;state.carte=null;state.noeudActuel=null;state.secteur=1;state.enCombat=false;state.scenePlanete=null;
  state.hpCruiser=state.HP_MAX;state.score=0;state.phase='attente';state.selection=null;state.vague=1;state.actionFaite=false;state.modeTourelle=false;state.modeCapacite=null;state.hangar=null;state.tirsGratuits=0;state.boucliersRestants=BOUCLIER_USAGES_MAX;state.ultimeSeuil=ULTIME_MAX;
  state.lockTimer=0;state.flashCroiseur=0;state.flashRecharge=0;state.secousse=0;state.tourCompteur=0;state.ambianceT=0;state.prochainAsteroide=99;state.prochainBoss=99;state.enFeu=0;state.rerollsRestants=0;
  state.comboCount=0;state.comboTimer=0;state.bestCombo=0;state.undoStack=[];state.paused=false;
  // héros du Vaisseau Rouge : pas encore d'écran de choix (lot 3 de la roadmap "Héros du
  // Vaisseau Rouge") — androïde neutre par défaut en attendant.
  state.heroActif='androide';
  randomiserAccueil();
}

function nouvellePartie(){
  // pool de départ : le Vaisseau Rouge + 1 Standard + 1 vaisseau spécial tiré au hasard (parmi les vaisseaux débloqués)
  // lors du tout premier combat (tutoriel), on restreint le tirage aux vaisseaux qui ont un coup spécial
  // (CAPACITES) : le script du tutoriel a besoin qu'un des 3 vaisseaux de départ en ait toujours un.
  let speciaux=SHIPS.filter(s=>s.id!=='normal'&&(!s.metaRequis||(state.meta[s.metaRequis]||0)>0));
  if(!tutorielVu()){ const avecCapacite=speciaux.filter(s=>CAPACITES[s.id]); if(avecCapacite.length) speciaux=avecCapacite; }
  const special=speciaux[Math.floor(Math.random()*speciaux.length)].id;
  const [cN,cS,cR]=spread(3);
  state.fighters=[nouveauVaisseau(cN,state.RANGS-1,'normal',false), nouveauVaisseau(cS,state.RANGS-1,special,false), nouveauVaisseau(cR,state.RANGS-1,'rouge',false)];
  state.ailes=[]; state.asteroides=[]; state.bonus=[]; state.boss=null; state.explosions=[]; state.particules=[]; state.lasers=[]; state.trails=[]; state.dmgTexts=[];
  state.trousNoirs=[]; state.champs=[]; state.menacesWarn=[]; state.obstacles=[]; state.bossVaincus=0; state.enFeu=0;
  state.ups={portee:0,deplacement:0,bouclier:0,tourelleDouble:0,bonusPlus:0,regen:0};
  state.pendingUpgrade=false; state.choixBuild=false; state.killsThisWave=0; state.shipsLostThisWave=0; state.bossKilledThisWave=false; state.scoreAvantVague=0;
  state.ultimeJauge=0; state.ondeChoc=0; state.pendingEvent=false; state.suiteAmelioration=null; state.suiteEvenement=null; state.enCombat=false;
  const M=state.meta||{}; const d=DIFFICULTES[state.difficulte]||DIFFICULTES.normal;
  state.HP_MAX=Math.round(Math.round(100*state.COLS/7)*d.hpMult)+(M.pvBonus||0)*10;   // méta + difficulté : PV de départ
  for(let i=0;i<(M.deptAmelio||0);i++) ameliorationAleatoire();          // méta : améliorations de départ
  state.ultimeJauge=Math.min(ULTIME_MAX,(M.ultimeRapide||0)*6);               // méta : ultime pré-chargé
  for(let i=0;i<(M.vaisseauBonus||0);i++) deployerVaisseau('normal');    // méta : vaisseaux de départ
  state.rerollsRestants=M.reroll||0;                                    // méta : rerolls gratuits sur les propositions
  state.hpCruiser=state.HP_MAX; state.score=0; state.phase='joueur'; state.selection=null; state.vague=1;
  state.actionFaite=false; state.modeTourelle=false; state.modeCapacite=null; state.hangar=null; state.tirsGratuits=0;
  state.boucliersRestants=BOUCLIER_USAGES_MAX; state.ultimeSeuil=ULTIME_MAX;
  state.lockTimer=0; state.flashCroiseur=0; state.flashRecharge=0; state.secousse=0; state.tourCompteur=0; state.ambianceT=0;
  state.prochainAsteroide=3+Math.floor(Math.random()*2); state.prochainBoss=18+Math.floor(Math.random()*6);
  state.comboCount=0; state.comboTimer=0; state.bestCombo=0; state.undoStack=[]; state.paused=false;
  state.achievements.asteroid_dodge=(state.achievements.asteroid_dodge||0); state.achievements.boss_slayer=state.achievements.boss_slayer||false; state.achievements.no_turret=state.achievements.no_turret||false; state.achievements.perfect_wave=state.achievements.perfect_wave||false;
  // tutoriel : jauge d'ultime déjà pleine, pour pouvoir démontrer l'ultime sans attendre plusieurs tours de kills
  if(!tutorielVu()) state.ultimeJauge=state.ultimeSeuil;
  document.getElementById('accueil').classList.add('cache'); document.getElementById('fin').classList.add('cache');
  document.getElementById('pause').classList.remove('visible'); document.getElementById('pauseBtn').style.display='block';
  document.getElementById('log').innerHTML=''; state.secteur=1; state.enCombat=false; genererCarte(); startMusic(); ouvrirCarte();
}

function reprendrePartie(){
  const d=chargerSauvegarde();
  if(!d) return false;
  etatVide(); configurer();
  state.secteur=d.secteur; state.vague=d.vague; state.score=d.score; state.HP_MAX=d.HP_MAX; state.hpCruiser=d.hpCruiser;
  state.ups=d.ups||state.ups; state.ultimeJauge=d.ultimeJauge||0; state.tourCompteur=d.tourCompteur||0; state.prochainAsteroide=d.prochainAsteroide||4; state.heroActif=d.heroActif;
  state.enCombat=!!d.enCombat; state.objectifVague=d.objectifVague||null; state.killsThisWave=d.killsThisWave||0;
  state.shipsLostThisWave=d.shipsLostThisWave||0; state.bossKilledThisWave=!!d.bossKilledThisWave; state.damageThisWave=d.damageThisWave||0;
  state.scoreAvantVague=(d.scoreAvantVague!==undefined)?d.scoreAvantVague:state.score;
  state.hangar=d.hangar||null; state.actionFaite=!!d.actionFaite; state.tirsGratuits=d.tirsGratuits||0; state.bossVaincus=d.bossVaincus||0;
  state.difficulte=d.difficulte||state.difficultePreferee;
  state.boucliersRestants=(d.boucliersRestants!==undefined)?d.boucliersRestants:BOUCLIER_USAGES_MAX;
  state.ultimeSeuil=d.ultimeSeuil||ULTIME_MAX; state.enFeu=d.enFeu||0;
  state.rerollsRestants=(d.rerollsRestants!==undefined)?d.rerollsRestants:(state.meta.reroll||0);
  for(const f of d.fighters||[]) state.fighters.push(nouveauVaisseau(f.c,f.r,f.type,false)), Object.assign(state.fighters[state.fighters.length-1],{hp:f.hp,maxhp:f.maxhp||f.hp,used:f.used,capUsed:!!f.capUsed,kills:f.kills||0,gele:f.gele||0});
  for(const a of d.ailes||[]){ faireAile(a.c,a.r,a.type); const na=state.ailes[state.ailes.length-1]; na.hp=a.hp; na.maxhp=a.maxhp; na.vitesse=a.vitesse; const p=centreCase(a.c,a.r); na.x=p.x; na.y=p.y; }
  for(const o of d.asteroides||[]){ const p=centreCase(Math.max(0,Math.min(state.COLS-1,o.c)),Math.max(0,Math.min(state.RANGS-1,o.r))); state.asteroides.push({c:o.c,r:o.r,dc:o.dc,dr:o.dr,x:p.x,y:p.y,ang:0,img:getImgAster(),hp:o.hp||1,maxhp:o.maxhp||1,type:o.type||'normal'}); }
  for(const b of d.bonus||[]){ const p=centreCase(b.c,b.r); state.bonus.push({c:b.c,r:b.r,type:b.type,ttl:b.ttl,x:p.x,y:p.y}); }
  for(const t of d.trousNoirs||[]){ const p=centreCase(t.c,t.r); state.trousNoirs.push({c:t.c,r:t.r,turns:t.turns,x:p.x,y:p.y,ang:0}); }
  state.champs=(d.champs||[]).map(c=>({...c})); state.menacesWarn=(d.menacesWarn||[]).map(w=>({...w}));
  for(const o of d.obstacles||[]){ const p=centreCase(o.c,o.r); state.obstacles.push({c:o.c,r:o.r,type:o.type,hp:o.hp,maxhp:(OBSTACLES[o.type]?OBSTACLES[o.type].hp:o.hp),x:p.x,y:p.y,variante:Math.random()<0.5,ang:0}); }
  if(d.boss){ const p=centreCase(d.boss.c+1,d.boss.r); state.boss={c:d.boss.c,r:d.boss.r,w:3,h:2,hp:d.boss.hp,maxhp:d.boss.maxhp,type:d.boss.type,charge:d.boss.charge,x:p.x,y:p.y+state.CELL/2-state.CELL}; }
  deserialiserCarte(d.carte);
  document.getElementById('accueil').classList.add('cache'); document.getElementById('fin').classList.add('cache');
  document.getElementById('pause').classList.remove('visible'); document.getElementById('pauseBtn').style.display='block';
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
  if(state.phase==='accueil'||state.phase==='attente') dessinerIllustration(t); else dessiner(t);
  mettreAJourTuto(); requestAnimationFrame(boucle); }

/* =====================================================================
   PLEIN ÉCRAN + DÉMARRAGE
   ===================================================================== */
document.getElementById('btnMission').addEventListener('click',()=>{ document.getElementById('mission').classList.remove('visible'); const s=state.suiteMission; state.suiteMission=null; if(s) s(); });

/* ===== Choix de la difficulté (après « Jouer ») ===== */
const ICO_DIFF={facile:'sourire_facile',normal:'sourire_normal',difficile:'sourire_difficile'};
function ouvrirDifficulte(){
  document.getElementById('tooltip').classList.remove('visible');
  const cont=document.getElementById('difficulteCards'); cont.innerHTML='';
  for(const id of ['facile','normal','difficile']){
    const card=document.createElement('div'); card.className='card';
    if(id===state.difficultePreferee) card.style.borderColor='#ffd23d';
    const emo=document.createElement('div'); emo.className='emo'; emo.appendChild(iconCanvas(ICO_DIFF[id],26)); card.appendChild(emo);
    const t2=document.createElement('div'); t2.innerHTML='<div class="nom">'+t('diff_'+id)+'</div><div class="desc">'+t('diff_'+id+'_d')+'</div>'; card.appendChild(t2);
    card.addEventListener('click',()=>demarrerAvecDifficulte(id));
    cont.appendChild(card);
  }
  document.getElementById('difficulte').classList.add('visible');
}
function demarrerAvecDifficulte(diff){
  document.getElementById('difficulte').classList.remove('visible');
  initAudio(); loadData(); effacerSauvegarde();
  const premiereFois=!tutorielVu();
  definirDifficultePreferee(diff);
  nouvellePartie();
  if(premiereFois) demarrerTuto();
}
document.getElementById('btnJouer').addEventListener('click',()=>{ initAudio(); ouvrirDifficulte(); });
document.getElementById('btnDiffAnnuler').addEventListener('click',()=>{ document.getElementById('difficulte').classList.remove('visible'); });
document.getElementById('btnReprendre').addEventListener('click',()=>{ initAudio(); loadData(); reprendrePartie(); });

/* ===== Paramètres (menu) ===== */
function ouvrirParams(){ document.getElementById('tooltip').classList.remove('visible'); document.getElementById('params').classList.add('visible'); }
function ouvrirInfos(){
  document.getElementById('tooltip').classList.remove('visible');
  const st=statsEquilibrage();
  document.getElementById('infoStats').textContent = st.total>0 ? '📊 Secteur moyen atteint : '+st.moyenneSecteur.toFixed(1)+' ('+st.total+' partie'+(st.total>1?'s':'')+')' : '';
  document.getElementById('info').classList.add('visible');
}
document.getElementById('btnInfo').addEventListener('click',ouvrirParams);
document.getElementById('btnParamsInfos').addEventListener('click',ouvrirInfos);
document.getElementById('btnParamsLangue').addEventListener('click',()=>{ langueSuivante(); ajusterTitreAccueil(); majMeilleurScoreAccueil(); });
document.getElementById('btnParamsFermer').addEventListener('click',()=>{ document.getElementById('params').classList.remove('visible'); });
/* Force un rechargement complet (déchargement des caches connus + reload) pour récupérer
   la dernière version du jeu sans que le joueur ait à vider manuellement le cache du navigateur. */
document.getElementById('btnCheckUpdate').addEventListener('click', async ()=>{
  montrerToast(t('params_checkupdate_recherche'),'ok');
  try{
    if('serviceWorker' in navigator){ const regs=await navigator.serviceWorker.getRegistrations(); await Promise.all(regs.map(r=>r.unregister())); }
    if('caches' in window){ const keys=await caches.keys(); await Promise.all(keys.map(k=>caches.delete(k))); }
  }catch(e){}
  // recharge sur une URL jamais mise en cache (paramètre unique) : sur certains navigateurs
  // (Safari/Firefox mobile), un simple location.reload() peut encore repartir d'une page
  // gardée en mémoire/cache malgré le service worker désinscrit et les caches vidés juste avant.
  setTimeout(()=>{ location.replace(location.pathname+'?maj='+Date.now()); }, 300);
});
document.getElementById('btnFermerInfo').addEventListener('click',()=>{ document.getElementById('info').classList.remove('visible'); });
document.getElementById('btnRelancerTuto').addEventListener('click',()=>{
  document.getElementById('info').classList.remove('visible'); document.getElementById('params').classList.remove('visible');
  initAudio(); loadData(); effacerSauvegarde();
  definirDifficultePreferee('facile'); nouvellePartie(); relancerTuto();
});

/* ===== Menu pause ===== */
document.getElementById('btnPauseReprendre').addEventListener('click',()=>{ if(state.paused) togglePause(); });
document.getElementById('btnPauseOptions').addEventListener('click',ouvrirParams);
document.getElementById('btnPauseGuide').addEventListener('click',()=>{ ouvrirGuide(); });
document.getElementById('btnPauseAccueil').addEventListener('click',()=>{ retourAccueil(); });
document.getElementById('btnPauseAbandonner').addEventListener('click',()=>{ demanderConfirmation(t('pause_abandonner_confirm'),abandonnerPartie); });
document.getElementById('pauseBtn').addEventListener('click',()=>{ if(state.phase!=='accueil'&&state.phase!=='fin'&&state.phase!=='attente') togglePause(); });

document.getElementById('btnRejouer').addEventListener('click',()=>{ initAudio(); state.difficulte=state.difficultePreferee; nouvellePartie(); });
document.getElementById('btnMeta').addEventListener('click',()=>{ ouvrirMeta(); });
document.getElementById('btnMeta2').addEventListener('click',()=>{ ouvrirMeta(); });
document.getElementById('btnFinAccueil').addEventListener('click',()=>{ retourAccueil(); });
document.getElementById('btnFermerMeta').addEventListener('click',()=>{ document.getElementById('meta').classList.remove('visible'); });
document.getElementById('btnGuide').addEventListener('click',()=>{ ouvrirGuide(); });
document.getElementById('btnFermerGuide').addEventListener('click',()=>{ document.getElementById('guide').classList.remove('visible'); });

/* ===== Favicon généré depuis le sprite du vaisseau (pixel-art) ===== */
function genererFavicon(){
  try{
    const S=64, cv=document.createElement('canvas'); cv.width=S; cv.height=S;
    const cx=cv.getContext('2d'); cx.imageSmoothingEnabled=false;
    cx.fillStyle='#070b18'; cx.fillRect(0,0,S,S);
    const ship=cuireFit(JOUEUR,S);
    cx.drawImage(ship,Math.round((S-ship.width)/2),Math.round((S-ship.height)/2));
    const lien=document.getElementById('favicon'); if(lien) lien.href=cv.toDataURL('image/png');
  }catch(e){}
}

/* remplace les emplacements <span class="ico-slot" data-ico="..."> par leur icône pixel-art */
function poserIcones(){ document.querySelectorAll('[data-ico]').forEach(el=>{ el.innerHTML=''; el.appendChild(iconCanvas(el.dataset.ico,16)); }); }

/* Garantit que le titre de l'accueil ne déborde ni ne se coupe jamais : la taille CSS (container
   query) suffit dans l'immense majorité des cas, mais ne connaît pas le padding de l'écran ni les
   valeurs exactes de rendu de la police — on mesure ici le rendu réel et on réduit encore la
   taille si besoin, plutôt que de risquer un débordement ou une coupure. Une seule ligne, toujours. */
function ajusterTitreAccueil(){
  const h1=document.querySelector('#accueil h1'); if(!h1) return;
  const accueil=document.getElementById('accueil');
  h1.style.fontSize='';
  // largeur de référence : #accueil lui-même (son padding fixe), jamais .accueil-contenu —
  // ce dernier n'a pas de largeur propre (il s'ajuste à son contenu le plus large), donc s'y
  // référencer rendait le calcul circulaire et désactivait le rétrécissement.
  const disponible=accueil.clientWidth - 2*20 - 6;   // moins le padding de #accueil + marge de sécurité
  if(h1.scrollWidth>disponible && disponible>0){
    const taille=parseFloat(getComputedStyle(h1).fontSize);
    h1.style.fontSize=Math.max(14, Math.floor(taille*disponible/h1.scrollWidth))+'px';
  }
}
window.addEventListener('resize',ajusterTitreAccueil);
if(window.visualViewport) window.visualViewport.addEventListener('resize',ajusterTitreAccueil);

/* Signale au joueur qu'une mise à jour a été appliquée depuis sa dernière visite sur cet appareil
   (numéro de version différent de celui stocké) : modale d'info + numéro de version + bouton OK.
   Ne s'affiche jamais lors de la toute première visite (rien à comparer). */
const VERSION_KEY='dc_version';
function verifierMiseAJour(){
  let precedente=null;
  try{ precedente=localStorage.getItem(VERSION_KEY); }catch(e){}
  try{ localStorage.setItem(VERSION_KEY,VERSION); }catch(e){}
  if(precedente && precedente!==VERSION) ouvrirMaj(VERSION);
}

loadData(); chargerDifficultePreferee(); chargerLangue(); configurer(); initEtoiles(); etatVide(); redimensionner();
genererFavicon();
poserIcones();
appliquerLangue();
ajusterTitreAccueil();
// la police pixel charge en arrière-plan (font-display:swap) : tant qu'elle n'est pas prête,
// le titre se mesure avec la police de repli (métriques différentes, souvent plus étroite) —
// sans ce réajustement une fois la vraie police en place, le titre peut déborder de l'écran.
if(document.fonts&&document.fonts.ready) document.fonts.ready.then(ajusterTitreAccueil);
majMeilleurScoreAccueil();
document.getElementById('paramsVersion').textContent='Version '+VERSION;
if(sauvegardeExiste()) document.getElementById('btnReprendre').style.display='';
// Au démarrage, on va directement à l'accueil : le tutoriel guidé (voir tuto.js) suffit à
// apprendre à jouer dès la première partie, plus besoin d'imposer l'écran d'aide en premier.
verifierMiseAJour();
requestAnimationFrame(boucle);

/* PWA : enregistre le service worker (hors-ligne + installable). Sans effet si ouvert en file:// */
if('serviceWorker' in navigator){ window.addEventListener('load',()=>{ navigator.serviceWorker.register('sw.js').catch(()=>{}); }); }
