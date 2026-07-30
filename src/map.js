/* =====================================================================
   CARTE DE SECTEUR — génération, navigation, objectifs de vague,
   événements aléatoires entre les vagues
   ===================================================================== */
import { state, centreCase, sauvegarderPartie } from './state.js';
import { UPGRADES, DIFFICULTES, BOUCLIER_USAGES_MAX } from './config.js';
import { apparaitreEscadrille, aileEn, faireAile, spawnBoss, deployerVaisseau, typeAile, genererObstacles, spawnMimic, appliquerAmeliorationEffet } from './entities.js';
import { setMusicPhase, sonVoix, sonRenfort, sonVague } from './audio.js';
import { demarrerTourJoueur, exploser } from './combat.js';
import { logMsg, ouvrirEvenement, ouvrirAmelioration, ouvrirMission, ouvrirScenePlanete, checkAchievements, montrerToast, ouvrirEtapeBanner } from './ui.js';
import { t, L } from './i18n.js';

export const ICONE={combat:'epee',elite:'crane',event:'point',rest:'cle',tresor:'gemme',hangar:'satellite',forge:'engrenage',boss:'demon'};
const NOEUD_TYPES=['combat','elite','event','rest','tresor','hangar','forge','boss'];
/* getters : le nom/la description affichés dépendent de la langue courante, donc résolus à chaque accès */
export const NOM_NOEUD=Object.fromEntries(NOEUD_TYPES.map(k=>[k,'']));
export const DESC_NOEUD=Object.fromEntries(NOEUD_TYPES.map(k=>[k,'']));
Object.defineProperties(NOM_NOEUD, Object.fromEntries(NOEUD_TYPES.map(k=>[k,{get:()=>t('node_'+k+'_nom'),enumerable:true}])));
Object.defineProperties(DESC_NOEUD, Object.fromEntries(NOEUD_TYPES.map(k=>[k,{get:()=>t('node_'+k+'_desc'),enumerable:true}])));
/* Construit les types des noeuds "intermédiaires" (hors départ/boss) pour tout le secteur en une fois,
   afin de garantir globalement au moins 3 combats (départ inclus) et au plus 2 bonus (relais/trésor/
   hangar/atelier) sur l'ensemble de la carte — un tirage indépendant par noeud ne le garantissait pas. */
const BONUS_TYPES=['rest','tresor','hangar','forge'];
function construireTypesIntermediaires(total){
  const pool=[];
  // au moins 2 combats/élites en plus du départ (qui est déjà un combat garanti) => 3 au total
  for(let i=0;i<2;i++) pool.push(Math.random()<0.8?'combat':'elite');
  // au plus 2 bonus sur tout le secteur
  const nbBonus=Math.min(2,Math.max(0,total-pool.length),1+Math.floor(Math.random()*2));
  for(let i=0;i<nbBonus;i++) pool.push(BONUS_TYPES[Math.floor(Math.random()*BONUS_TYPES.length)]);
  // le reste : mélange combat/élite/événement, toujours pas de bonus supplémentaire
  while(pool.length<total){ const r=Math.random(); pool.push(r<0.55?'combat':r<0.7?'elite':'event'); }
  for(let i=pool.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [pool[i],pool[j]]=[pool[j],pool[i]]; }
  return pool;
}
export const COUL_NOEUD={combat:{c1:'#ff8f6b',c2:'#c94257',d:'#7a2030'},elite:{c1:'#ffe08a',c2:'#ffd23d',d:'#8f6a1f'},event:{c1:'#bfe9ff',c2:'#37a0d6',d:'#215f8f'},rest:{c1:'#8fe89a',c2:'#5fce6a',d:'#256a2f'},tresor:{c1:'#bfe0ff',c2:'#5a8fd6',d:'#3a4aa0'},hangar:{c1:'#bfe9ff',c2:'#5a8fd6',d:'#2f4a86'},forge:{c1:'#ffe08a',c2:'#e0a13d',d:'#8f6a1f'},boss:{c1:'#ff9a9a',c2:'#ff5a5a',d:'#6a1f2f'}};
export function genererCarte(){ const NB=6, cols=[];
  const tailles=[]; for(let c=0;c<NB;c++) tailles.push((c===0||c===NB-1)?1:(2+Math.floor(Math.random()*2)));
  const totalIntermediaire=tailles.slice(1,NB-1).reduce((a,b)=>a+b,0);
  const typesIntermediaires=construireTypesIntermediaires(totalIntermediaire); let curseur=0;
  for(let c=0;c<NB;c++){ const n=tailles[c]; const col=[];
    for(let r=0;r<n;r++){ const type=c===NB-1?'boss':c===0?'combat':typesIntermediaires[curseur++]; col.push({col:c,row:r,n,type,liens:[],visite:false}); }
    cols.push(col); }
  for(let c=0;c<NB-1;c++){ const cur=cols[c], nxt=cols[c+1];
    for(const nd of cur){ const base=Math.round((nd.row/Math.max(1,nd.n-1))*(nxt.length-1));
      const set=new Set([base]); if(Math.random()<0.5) set.add(Math.max(0,Math.min(nxt.length-1,base+(Math.random()<0.5?-1:1))));
      for(const i of set) if(!nd.liens.includes(nxt[i])) nd.liens.push(nxt[i]); }
    for(let i=0;i<nxt.length;i++){ if(!cur.some(nd=>nd.liens.includes(nxt[i]))){ let best=cur[0],bd=9; for(const nd of cur){ const d=Math.abs((nd.row/Math.max(1,nd.n-1))-(i/Math.max(1,nxt.length-1))); if(d<bd){bd=d;best=nd;} } best.liens.push(nxt[i]); } } }
  state.carte=cols; state.noeudActuel=null; }
export function noeudsAtteignables(){ return state.noeudActuel?state.noeudActuel.liens:(state.carte?state.carte[0]:[]); }
export function posNoeud(nd){ const NB=state.carte.length;
  const y=state.HAUTEUR-120-nd.col*((state.HAUTEUR-260)/(NB-1));
  const x=state.LARGEUR*(nd.row+1)/(nd.n+1);
  return {x,y}; }

/* ===== SAUVEGARDE : (dé)sérialisation de la structure du graphe carte ===== */
export function serialiserCarte(){ if(!state.carte) return null;
  const lvls=state.carte.map(l=>l.map(n=>({col:n.col,row:n.row,n:n.n,type:n.type,visite:n.visite,liens:n.liens.map(x=>[x.col,x.row])})));
  return {lvls, cur: state.noeudActuel?[state.noeudActuel.col,state.noeudActuel.row]:null}; }
export function deserialiserCarte(d){ if(!d) { state.carte=null; state.noeudActuel=null; return; }
  state.carte=d.lvls.map(l=>l.map(n=>({col:n.col,row:n.row,n:n.n,type:n.type,visite:n.visite,liens:[]})));
  d.lvls.forEach((l,ci)=>l.forEach((n,ri)=>{ state.carte[ci][ri].liens=n.liens.map(([c,r])=>state.carte[c][r]); }));
  state.noeudActuel = d.cur ? state.carte[d.cur[0]][d.cur[1]] : null; }

export function ouvrirCarte(){ state.phase='carte'; state.scenePlanete=null; sauvegarderPartie(serialiserCarte); }
export function entrerNoeud(nd){ state.noeudActuel=nd; nd.visite=true; const type=nd.type;
  if(type==='combat'||type==='elite'||type==='boss'){ demarrerCombat(type); }
  else { ouvrirScenePlanete(construireScene(type)); } }

/* construit le contenu d'une planète sans combat : décor + choix en haut d'écran */
function construireScene(type){
  const suite=ouvrirCarte;
  if(type==='rest'){ return {kind:'station',titre:t('scene_rest_titre'),suite,choix:[
    {ico:'cle',nom:t('rest_reparation_nom'),desc:t('rest_reparation_desc'),effet:()=>{ state.hpCruiser=Math.min(state.HP_MAX,state.hpCruiser+Math.round(state.HP_MAX*0.30)); state.flashRecharge=1; sonRenfort(); logMsg(t('evt_repare'),'log-grn'); }},
    {ico:'eclair',nom:t('rest_recalibrage_nom'),desc:t('rest_recalibrage_desc'),effet:()=>{ state.hpCruiser=Math.min(state.HP_MAX,state.hpCruiser+Math.round(state.HP_MAX*0.15)); state.ultimeJauge=Math.min(state.ultimeSeuil,state.ultimeJauge+Math.round(state.ultimeSeuil*0.5)); logMsg(t('evt_recalibre'),'log-grn'); }},
  ]}; }
  if(type==='tresor'){ const dispo=UPGRADES.filter(u=>(state.ups[u.id]||0)<(u.max||9) && (!u.id.startsWith('rouge_')||state.fighters.some(f=>f.type==='rouge')));
    const choix=[...dispo].sort(()=>Math.random()-0.5).slice(0,3).map(u=>({ico:u.ico,nom:t('up_'+u.id+'_nom'),desc:t('up_'+u.id+'_desc'),effet:()=>{ state.ups[u.id]=(state.ups[u.id]||0)+1; appliquerAmeliorationEffet(u.id); logMsg('⬆ '+t('up_'+u.id+'_nom'),'log-grn'); }}));
    if(!choix.length) choix.push({ico:'gemme',nom:t('tresor_butin_nom'),desc:t('tresor_butin_desc'),effet:()=>{ state.score+=8; }});
    return {kind:'tresor',titre:t('scene_tresor_titre'),suite,choix}; }
  if(type==='hangar'){ return {kind:'hangar',titre:t('scene_hangar_titre'),suite,choix:[
    {ico:'vaisseau',nom:t('hangar_standard_nom'),desc:t('hangar_standard_desc'),effet:()=>{ deployerVaisseau('normal'); logMsg(t('evt_renfort'),'log-grn'); }},
    {ico:'cible',nom:t('hangar_tireur_nom'),desc:t('hangar_tireur_desc'),effet:()=>{ deployerVaisseau('sniper'); logMsg(t('evt_renfort_tireur'),'log-grn'); }},
    {ico:'bouclier',nom:t('hangar_cuirasse_nom'),desc:t('hangar_cuirasse_desc'),effet:()=>{ deployerVaisseau('bouclier'); logMsg(t('evt_renfort_cuirasse'),'log-grn'); }},
  ]}; }
  if(type==='forge'){ return {kind:'forge',titre:t('scene_forge_titre'),suite,choix:[
    {ico:'fleche_haut',nom:t('forge_ameliorer_nom'),desc:t('forge_ameliorer_desc'),effet:()=>{ ameliorationAleatoire(); }},
    {ico:'eclair',nom:t('forge_surcharger_nom'),desc:t('forge_surcharger_desc'),effet:()=>{ state.ultimeJauge=Math.min(state.ultimeSeuil,state.ultimeJauge+Math.round(state.ultimeSeuil*0.5)); logMsg(t('evt_ultime_recharge'),'log-ylw'); }},
  ]}; }
  // event : événement aléatoire présenté comme une scène
  const ev=EVENEMENTS[Math.floor(Math.random()*EVENEMENTS.length)];
  return {kind:'marche',titre:'✦ '+L(ev.titre),suite,choix:ev.choix.map(ch=>({...ch,nom:L(ch.nom),desc:L(ch.desc)}))};
}
export function demarrerCombat(type){
  const d=DIFFICULTES[state.difficulte]||DIFFICULTES.normal;
  state.ailes=[]; state.asteroides=[]; state.trousNoirs=[]; state.champs=[]; state.menacesWarn=[]; state.bonus=[]; if(type!=='boss') state.boss=null;
  for(const f of state.fighters){ f.capUsed=false; f.provoque=false; }
  state.boucliersRestants=BOUCLIER_USAGES_MAX;
  genererObstacles();
  if(state.vague>=2 && Math.random()<0.4) spawnMimic();   // piège mimic occasionnel
  state.tourCompteur=0; state.prochainAsteroide=Math.max(1,3+Math.floor(Math.random()*2)+d.menaceDelta); state.enCombat=true;
  const diff=state.secteur*0.8+(state.noeudActuel?state.noeudActuel.col:0)*0.5;
  const squads=Math.max(1, 2+Math.round(diff)+(type==='elite'?2:0)+d.squadDelta);
  for(let s=0;s<squads;s++) apparaitreEscadrille();
  if(type==='elite'){ const c=Math.floor(Math.random()*state.COLS); if(!aileEn(c,0)) faireAile(c,0,Math.random()<0.5?'porteur':'brouilleur'); }
  if(type==='boss'){ spawnBoss(); setMusicPhase('boss'); sonVoix('BOSS'); logMsg(t('log_forteresse'),'log-red'); montrerToast('⚠ '+t('toast_forteresse_approche'),'bad'); }
  assignerObjectif(); if(type==='boss') state.objectifVague={type:'boss'};
  annoncerEtape(type);
  demarrerTourJoueur(); }
/* modale animée (bannière + explosion de particules) qui annonce le type d'étape et sa mission,
   au démarrage de chaque combat (combat standard, élite, boss). */
function annoncerEtape(type){
  const titre=t('etape_'+type+'_titre');
  const sousTitre=state.objectifVague?texteObjectif(state.objectifVague):'';
  ouvrirEtapeBanner(titre, sousTitre, t('mission_secteur')+' '+state.secteur);
  const by=state.HAUTEUR*0.3;
  // double salve d'explosions décalée dans le temps : plus spectaculaire qu'une salve unique
  for(let i=0;i<3;i++) exploser(state.LARGEUR*(0.25+0.25*i),by,true);
  setTimeout(()=>{ for(let i=0;i<2;i++) exploser(state.LARGEUR*(0.38+0.24*i),by+18,true); },160);
}
export function gagnerCombat(){ state.enCombat=false;
  const reussi=objectifReussi(); if(state.damageThisWave===0) state.achievements.perfect_wave=true;
  state.hpCruiser=Math.min(state.HP_MAX,state.hpCruiser+Math.round(state.HP_MAX*0.04));
  if(reussi){ state.hpCruiser=Math.min(state.HP_MAX,state.hpCruiser+Math.round(state.HP_MAX*0.12)); state.score+=3; }
  state.vague++; sonVague(); setMusicPhase('calme'); checkAchievements();
  const type=state.noeudActuel?state.noeudActuel.type:'combat';
  state.suiteMission=()=>{ if(type==='boss'){ state.suiteAmelioration=secteurSuivant; ouvrirAmelioration(); }
    else if(type==='elite'){ state.suiteAmelioration=ouvrirCarte; ouvrirAmelioration(); } else ouvrirCarte(); };
  ouvrirMission(type,reussi); }
/* réorganise tous les vaisseaux sur les deux premières lignes (bas de grille) */
export function reorganiserVaisseaux(){
  const r0=state.RANGS-1, r1=state.RANGS-2, libres=[];
  for(let c=0;c<state.COLS;c++){ libres.push({c,r:r0}); }
  for(let c=0;c<state.COLS;c++){ libres.push({c,r:r1}); }
  const centre=(state.COLS-1)/2;
  libres.sort((a,b)=>(Math.abs(a.r-r0)-Math.abs(b.r-r0)) || (Math.abs(a.c-centre)-Math.abs(b.c-centre)));
  state.fighters.forEach((f,i)=>{ const pos=libres[i%libres.length]; f.c=pos.c; f.r=pos.r; const p=centreCase(f.c,f.r); f.x=p.x; f.y=p.y; });
}
export function secteurSuivant(){ state.secteur++; state.hpCruiser=Math.min(state.HP_MAX,state.hpCruiser+Math.round(state.HP_MAX*0.15)); reorganiserVaisseaux(); logMsg('★ '+t('carte_secteur')+' '+state.secteur,'log-ylw'); montrerToast('★ '+t('toast_secteur',{n:state.secteur}),'ok'); genererCarte(); ouvrirCarte(); }

/* ===== OBJECTIFS DE VAGUE ===== */
export function texteObjectif(o){
  if(!o) return '';
  return o.type==='kills' ? t('obj_kills',{n:o.cible}) : t('obj_'+o.type);
}
export function assignerObjectif(){
  const pool=[{type:'sansdegat'},{type:'protege'},{type:'kills',cible:Math.max(6,state.COLS)},{type:'survie'}];
  if(state.boss) pool.push({type:'boss'});
  const o={...pool[Math.floor(Math.random()*pool.length)]};
  state.objectifVague=o; state.killsThisWave=0; state.shipsLostThisWave=0; state.bossKilledThisWave=false; state.damageThisWave=0;
}
export function objectifReussi(){ const o=state.objectifVague; if(!o) return false;
  return o.type==='survie'    ? true
       : o.type==='sansdegat' ? state.damageThisWave===0
       : o.type==='protege'   ? state.shipsLostThisWave===0
       : o.type==='kills'     ? state.killsThisWave>=o.cible
       : o.type==='boss'      ? state.bossKilledThisWave : false; }

/* ===== ÉVÉNEMENTS entre les vagues ===== */
export function ameliorationAleatoire(){ const dispo=UPGRADES.filter(u=>(state.ups[u.id]||0)<(u.max||9) && (!u.id.startsWith('rouge_')||state.fighters.some(f=>f.type==='rouge'))); if(!dispo.length) return; const u=dispo[Math.floor(Math.random()*dispo.length)]; state.ups[u.id]=(state.ups[u.id]||0)+1; appliquerAmeliorationEffet(u.id); logMsg('⬆ '+t('up_'+u.id+'_nom'), 'log-grn'); }
export const EVENEMENTS=[
 {titre:{fr:'MARCHAND',en:'MERCHANT'}, desc:{fr:'Un marchand échange une cache d\'armes contre un peu de coque.',en:'A merchant trades a weapons cache for some of your hull.'}, choix:[
   {ico:'panier', nom:{fr:'Acheter',en:'Buy'}, desc:{fr:'-25% PV, +1 amélioration',en:'-25% HP, +1 upgrade'}, effet:()=>{ state.hpCruiser=Math.max(1,Math.round(state.hpCruiser*0.75)); ameliorationAleatoire(); }},
   {ico:'refuser', nom:{fr:'Refuser',en:'Refuse'}, desc:{fr:'+10% PV',en:'+10% HP'}, effet:()=>{ state.hpCruiser=Math.min(state.HP_MAX,state.hpCruiser+Math.round(state.HP_MAX*0.1)); }} ]},
 {titre:{fr:'ÉPAVE À LA DÉRIVE',en:'DRIFTING WRECK'}, desc:{fr:'Une épave flotte non loin. La fouiller ?',en:'A wreck floats nearby. Search it?'}, choix:[
   {ico:'loupe', nom:{fr:'Fouiller',en:'Search'}, desc:{fr:'Gros butin… ou embuscade',en:'Big loot… or an ambush'}, effet:()=>{ if(Math.random()<0.5){ state.ultimeJauge=Math.min(state.ultimeSeuil,state.ultimeJauge+Math.round(state.ultimeSeuil*0.5)); state.score+=8; logMsg(t('evt_butin_ultime'),'log-ylw'); } else { for(let k=0;k<3;k++){ const c=Math.floor(Math.random()*state.COLS); if(!aileEn(c,0)) faireAile(c,0,typeAile()); } logMsg(t('evt_embuscade'),'log-red'); } }},
   {ico:'aimant', nom:{fr:'Récupérer',en:'Salvage'}, desc:{fr:'+1 vaisseau',en:'+1 ship'}, effet:()=>{ deployerVaisseau('normal'); }} ]},
 {titre:{fr:'DOCK DE FORTUNE',en:'MAKESHIFT DOCK'}, desc:{fr:'Des réparations sont possibles ici.',en:'Repairs are possible here.'}, choix:[
   {ico:'cle', nom:{fr:'Réparer',en:'Repair'}, desc:{fr:'+40% PV',en:'+40% HP'}, effet:()=>{ state.hpCruiser=Math.min(state.HP_MAX,state.hpCruiser+Math.round(state.HP_MAX*0.4)); }},
   {ico:'engrenage', nom:{fr:'Bricoler',en:'Tinker'}, desc:{fr:'+2 améliorations, -15% PV',en:'+2 upgrades, -15% HP'}, effet:()=>{ state.hpCruiser=Math.max(1,Math.round(state.hpCruiser*0.85)); ameliorationAleatoire(); ameliorationAleatoire(); }} ]},
 {titre:{fr:'RENFORTS',en:'REINFORCEMENTS'}, desc:{fr:'La flotte propose du soutien.',en:'The fleet offers support.'}, choix:[
   {ico:'vaisseau', nom:{fr:'Deux chasseurs',en:'Two fighters'}, desc:{fr:'+2 vaisseaux standards',en:'+2 standard ships'}, effet:()=>{ deployerVaisseau('normal'); deployerVaisseau('normal'); }},
   {ico:'bouclier', nom:{fr:'Un cuirassé',en:'One battleship'}, desc:{fr:'+1 cuirassé (3 PV)',en:'+1 battleship (3 HP)'}, effet:()=>{ deployerVaisseau('bouclier'); }} ]},
 {titre:{fr:'PARI RISQUÉ',en:'RISKY BET'}, desc:{fr:'Pile tu gagnes gros, face tu perds ta mise.',en:'Heads you win big, tails you lose your stake.'}, choix:[
   {ico:'de', nom:{fr:'Parier',en:'Bet'}, desc:{fr:'50% : +score & ultime',en:'50%: +score & ultimate'}, effet:()=>{ if(Math.random()<0.5){ state.score+=15; state.ultimeJauge=Math.min(state.ultimeSeuil,state.ultimeJauge+Math.round(state.ultimeSeuil*0.5)); logMsg(t('evt_pari_gagne_ultime'),'log-ylw'); } else logMsg(t('evt_perdu'),'log-red'); }},
   {ico:'main', nom:{fr:'Prudence',en:'Play it safe'}, desc:{fr:'+5 score sûr',en:'+5 guaranteed score'}, effet:()=>{ state.score+=5; }} ]},
 {titre:{fr:'SURTENSION',en:'POWER SURGE'}, desc:{fr:'Le réacteur crache un surplus d\'énergie.',en:'The reactor spits out excess energy.'}, choix:[
   {ico:'eclair', nom:{fr:'Vers l\'ultime',en:'Toward the ultimate'}, desc:{fr:'Jauge d\'ultime pleine',en:'Ultimate gauge full'}, effet:()=>{ state.ultimeJauge=state.ultimeSeuil; }},
   {ico:'bouclier', nom:{fr:'Vers le bouclier',en:'Toward the shield'}, desc:{fr:'+30% PV',en:'+30% HP'}, effet:()=>{ state.hpCruiser=Math.min(state.HP_MAX,state.hpCruiser+Math.round(state.HP_MAX*0.3)); }} ]},
 {titre:{fr:'CHAMP DE DÉBRIS',en:'DEBRIS FIELD'}, desc:{fr:'Un champ de débris bloque la route.',en:'A debris field blocks the way.'}, choix:[
   {ico:'vent', nom:{fr:'Foncer',en:'Push through'}, desc:{fr:'50% : +1 vaisseau, 50% : -15% PV',en:'50%: +1 ship, 50%: -15% HP'}, effet:()=>{ if(Math.random()<0.5){ deployerVaisseau('normal'); logMsg(t('evt_vaisseau_recupere'),'log-grn'); } else { state.hpCruiser=Math.max(1,Math.round(state.hpCruiser*0.85)); logMsg(t('evt_collision'),'log-red'); } }},
   {ico:'refuser', nom:{fr:'Contourner',en:'Go around'}, desc:{fr:'Rien',en:'Nothing'}, effet:()=>{}} ]},
 {titre:{fr:'SIGNAL DE DÉTRESSE',en:'DISTRESS SIGNAL'}, desc:{fr:'Un vaisseau en perdition appelle à l\'aide.',en:'A stricken ship calls for help.'}, choix:[
   {ico:'coeur', nom:{fr:'Secourir',en:'Rescue'}, desc:{fr:'+1 vaisseau, -10% PV',en:'+1 ship, -10% HP'}, effet:()=>{ state.hpCruiser=Math.max(1,Math.round(state.hpCruiser*0.9)); deployerVaisseau('normal'); }},
   {ico:'refuser', nom:{fr:'Ignorer',en:'Ignore'}, desc:{fr:'Rien',en:'Nothing'}, effet:()=>{}} ]},
 {titre:{fr:'CHAMP D\'ASTÉROÏDES RICHE',en:'RICH ASTEROID FIELD'}, desc:{fr:'Des minerais rares scintillent parmi les roches.',en:'Rare minerals glitter among the rocks.'}, choix:[
   {ico:'gemme', nom:{fr:'Miner',en:'Mine'}, desc:{fr:'+5 cristaux, -10% PV',en:'+5 crystals, -10% HP'}, effet:()=>{ state.meta.cristaux=(state.meta.cristaux||0)+5; state.hpCruiser=Math.max(1,Math.round(state.hpCruiser*0.9)); }},
   {ico:'refuser', nom:{fr:'Continuer',en:'Continue'}, desc:{fr:'Rien',en:'Nothing'}, effet:()=>{}} ]},
 {titre:{fr:'CACHE PIRATE',en:'PIRATE CACHE'}, desc:{fr:'Une cache abandonnée flotte dans le vide.',en:'An abandoned cache floats in the void.'}, choix:[
   {ico:'panier', nom:{fr:'Ouvrir',en:'Open'}, desc:{fr:'+10 score, +3 cristaux',en:'+10 score, +3 crystals'}, effet:()=>{ state.score+=10; state.meta.cristaux=(state.meta.cristaux||0)+3; }},
   {ico:'alerte', nom:{fr:'Se méfier',en:'Be wary'}, desc:{fr:'+5% PV (prudence)',en:'+5% HP (caution)'}, effet:()=>{ state.hpCruiser=Math.min(state.HP_MAX,state.hpCruiser+Math.round(state.HP_MAX*0.05)); }} ]},
 {titre:{fr:'SURCHARGE DU BOUCLIER',en:'SHIELD OVERCHARGE'}, desc:{fr:'Le bouclier peut être poussé au-delà de ses limites.',en:'The shield can be pushed beyond its limits.'}, choix:[
   {ico:'satellite', nom:{fr:'Pousser',en:'Push it'}, desc:{fr:'+1 utilisation de bouclier ce combat',en:'+1 shield use this battle'}, effet:()=>{ state.boucliersRestants=(state.boucliersRestants||0)+1; }},
   {ico:'refuser', nom:{fr:'Rester prudent',en:'Stay cautious'}, desc:{fr:'+10% PV',en:'+10% HP'}, effet:()=>{ state.hpCruiser=Math.min(state.HP_MAX,state.hpCruiser+Math.round(state.HP_MAX*0.1)); }} ]},
 {titre:{fr:'TOURELLE ABANDONNÉE',en:'ABANDONED TURRET'}, desc:{fr:'Une tourelle dérive, encore fonctionnelle.',en:'A turret drifts by, still functional.'}, choix:[
   {ico:'cible', nom:{fr:'Récupérer',en:'Salvage'}, desc:{fr:'+2 tirs gratuits',en:'+2 free shots'}, effet:()=>{ state.tirsGratuits=(state.tirsGratuits||0)+2; }},
   {ico:'refuser', nom:{fr:'Laisser',en:'Leave it'}, desc:{fr:'+5 score',en:'+5 score'}, effet:()=>{ state.score+=5; }} ]},
 {titre:{fr:'ESSAIM DE DRONES',en:'DRONE SWARM'}, desc:{fr:'Un essaim inoffensif traverse ta route.',en:'A harmless swarm crosses your path.'}, choix:[
   {ico:'loupe', nom:{fr:'Étudier',en:'Study'}, desc:{fr:'+1 amélioration, embuscade possible',en:'+1 upgrade, possible ambush'}, effet:()=>{ ameliorationAleatoire(); if(Math.random()<0.35){ for(let k=0;k<2;k++){ const c=Math.floor(Math.random()*state.COLS); if(!aileEn(c,0)) faireAile(c,0,typeAile()); } logMsg(t('evt_drones_attaquent'),'log-red'); } }},
   {ico:'refuser', nom:{fr:'Éviter',en:'Avoid'}, desc:{fr:'Rien',en:'Nothing'}, effet:()=>{}} ]},
 {titre:{fr:'RECYCLAGE D\'URGENCE',en:'EMERGENCY RECYCLING'}, desc:{fr:'Convertir un vaisseau en pièces de rechange ?',en:'Convert a ship into spare parts?'}, choix:[
   {ico:'engrenage', nom:{fr:'Recycler',en:'Recycle'}, desc:{fr:'-1 vaisseau, +25% PV',en:'-1 ship, +25% HP'}, effet:()=>{ if(state.fighters.length>1){ state.fighters.pop(); state.hpCruiser=Math.min(state.HP_MAX,state.hpCruiser+Math.round(state.HP_MAX*0.25)); logMsg(t('evt_vaisseau_recycle'),'log-grn'); } else logMsg(t('evt_pas_assez_vaisseaux'),'log-red'); }},
   {ico:'refuser', nom:{fr:'Garder la flotte',en:'Keep the fleet'}, desc:{fr:'Rien',en:'Nothing'}, effet:()=>{}} ]},
 {titre:{fr:'STATION EN RUINE',en:'RUINED STATION'}, desc:{fr:'D\'anciens plans techniques traînent encore ici.',en:'Old technical blueprints still lie here.'}, choix:[
   {ico:'fleche_haut', nom:{fr:'Récupérer les plans',en:'Salvage the plans'}, desc:{fr:'+2 améliorations',en:'+2 upgrades'}, effet:()=>{ ameliorationAleatoire(); ameliorationAleatoire(); }},
   {ico:'refuser', nom:{fr:'Repartir',en:'Leave'}, desc:{fr:'+10% PV',en:'+10% HP'}, effet:()=>{ state.hpCruiser=Math.min(state.HP_MAX,state.hpCruiser+Math.round(state.HP_MAX*0.1)); }} ]},
 {titre:{fr:'ANOMALIE GRAVITATIONNELLE',en:'GRAVITATIONAL ANOMALY'}, desc:{fr:'Une distorsion étrange affecte la zone.',en:'A strange distortion affects the area.'}, choix:[
   {ico:'gel', nom:{fr:'Étudier',en:'Study'}, desc:{fr:'+50% ultime, risque de perdre un vaisseau',en:'+50% ultimate, risk of losing a ship'}, effet:()=>{ state.ultimeJauge=Math.min(state.ultimeSeuil,state.ultimeJauge+Math.round(state.ultimeSeuil*0.5)); if(state.fighters.length>1){ state.fighters.pop(); logMsg(t('evt_vaisseau_aspire'),'log-red'); } }},
   {ico:'refuser', nom:{fr:'S\'éloigner',en:'Move away'}, desc:{fr:'Rien',en:'Nothing'}, effet:()=>{}} ]},
 {titre:{fr:'CONTRAT DE MERCENAIRES',en:'MERCENARY CONTRACT'}, desc:{fr:'Des mercenaires proposent leurs services.',en:'Mercenaries offer their services.'}, choix:[
   {ico:'de', nom:{fr:'Engager (5 cristaux)',en:'Hire (5 crystals)'}, desc:{fr:'+1 cuirassé',en:'+1 battleship'}, effet:()=>{ if((state.meta.cristaux||0)>=5){ state.meta.cristaux-=5; deployerVaisseau('bouclier'); } else logMsg(t('evt_pas_assez_cristaux'),'log-red'); }},
   {ico:'refuser', nom:{fr:'Refuser',en:'Refuse'}, desc:{fr:'Rien',en:'Nothing'}, effet:()=>{}} ]},
 {titre:{fr:'CHAMP DE MINES DÉSAMORCÉ',en:'DEFUSED MINEFIELD'}, desc:{fr:'Les mines semblent inertes… ou pas.',en:'The mines seem inert… or maybe not.'}, choix:[
   {ico:'loupe', nom:{fr:'Récupérer les explosifs',en:'Salvage the explosives'}, desc:{fr:'+1 tir gratuit, 30% : -10% PV',en:'+1 free shot, 30%: -10% HP'}, effet:()=>{ state.tirsGratuits=(state.tirsGratuits||0)+1; if(Math.random()<0.3){ state.hpCruiser=Math.max(1,Math.round(state.hpCruiser*0.9)); logMsg(t('evt_mine_explose'),'log-red'); } }},
   {ico:'refuser', nom:{fr:'Ne pas toucher',en:'Don\'t touch it'}, desc:{fr:'Rien',en:'Nothing'}, effet:()=>{}} ]},
 {titre:{fr:'BALISE ENNEMIE',en:'ENEMY BEACON'}, desc:{fr:'Une balise attire l\'attention ennemie… ou brouille leurs senseurs.',en:'A beacon attracts enemy attention… or jams their sensors.'}, choix:[
   {ico:'demon', nom:{fr:'Détruire',en:'Destroy'}, desc:{fr:'+8 score, embuscade',en:'+8 score, ambush'}, effet:()=>{ state.score+=8; for(let k=0;k<3;k++){ const c=Math.floor(Math.random()*state.COLS); if(!aileEn(c,0)) faireAile(c,0,typeAile()); } logMsg(t('evt_embuscade'),'log-red'); }},
   {ico:'refuser', nom:{fr:'Laisser',en:'Leave it'}, desc:{fr:'Rien',en:'Nothing'}, effet:()=>{}} ]},
 {titre:{fr:'GÉNÉRATEUR INSTABLE',en:'UNSTABLE GENERATOR'}, desc:{fr:'Un générateur abandonné pulse dangereusement.',en:'An abandoned generator pulses dangerously.'}, choix:[
   {ico:'eclair', nom:{fr:'Brancher',en:'Plug in'}, desc:{fr:'Ultime plein, -20% PV',en:'Ultimate full, -20% HP'}, effet:()=>{ state.ultimeJauge=state.ultimeSeuil; state.hpCruiser=Math.max(1,Math.round(state.hpCruiser*0.8)); }},
   {ico:'refuser', nom:{fr:'Débrancher',en:'Unplug'}, desc:{fr:'Rien',en:'Nothing'}, effet:()=>{}} ]},
 {titre:{fr:'CONVOI CIVIL',en:'CIVILIAN CONVOY'}, desc:{fr:'Un convoi demande une escorte.',en:'A convoy asks for an escort.'}, choix:[
   {ico:'bouclier', nom:{fr:'Escorter',en:'Escort it'}, desc:{fr:'+15 score, +1 vaisseau',en:'+15 score, +1 ship'}, effet:()=>{ state.score+=15; deployerVaisseau('normal'); }},
   {ico:'refuser', nom:{fr:'Refuser',en:'Refuse'}, desc:{fr:'+10% PV',en:'+10% HP'}, effet:()=>{ state.hpCruiser=Math.min(state.HP_MAX,state.hpCruiser+Math.round(state.HP_MAX*0.1)); }} ]},
 {titre:{fr:'ARCHIVES PERDUES',en:'LOST ARCHIVES'}, desc:{fr:'D\'anciennes archives techniques sont récupérables.',en:'Old technical archives can be recovered.'}, choix:[
   {ico:'info', nom:{fr:'Télécharger',en:'Download'}, desc:{fr:'+12 score',en:'+12 score'}, effet:()=>{ state.score+=12; }},
   {ico:'gemme', nom:{fr:'Revendre les données',en:'Sell the data'}, desc:{fr:'+4 cristaux',en:'+4 crystals'}, effet:()=>{ state.meta.cristaux=(state.meta.cristaux||0)+4; }} ]},
 {titre:{fr:'RITUEL DE L\'ÉQUIPAGE',en:'CREW RITUAL'}, desc:{fr:'L\'équipage propose un pari amical avant la bataille.',en:'The crew offers a friendly bet before the battle.'}, choix:[
   {ico:'de', nom:{fr:'Parier gros',en:'Bet big'}, desc:{fr:'50% : +20 score, 50% : -10% PV',en:'50%: +20 score, 50%: -10% HP'}, effet:()=>{ if(Math.random()<0.5){ state.score+=20; logMsg(t('evt_pari_gagne'),'log-ylw'); } else { state.hpCruiser=Math.max(1,Math.round(state.hpCruiser*0.9)); logMsg(t('evt_pari_perdu'),'log-red'); } }},
   {ico:'main', nom:{fr:'Ne pas parier',en:'Don\'t bet'}, desc:{fr:'Rien',en:'Nothing'}, effet:()=>{}} ]},
 {titre:{fr:'NUÉE DE PARASITES',en:'PARASITE SWARM'}, desc:{fr:'De petits parasites s\'accrochent à la coque.',en:'Small parasites cling to the hull.'}, choix:[
   {ico:'feu', nom:{fr:'Brûler la coque',en:'Burn the hull'}, desc:{fr:'-5% PV, +1 amélioration',en:'-5% HP, +1 upgrade'}, effet:()=>{ state.hpCruiser=Math.max(1,Math.round(state.hpCruiser*0.95)); ameliorationAleatoire(); }},
   {ico:'refuser', nom:{fr:'Ignorer',en:'Ignore'}, desc:{fr:'Rien',en:'Nothing'}, effet:()=>{}} ]},
 {titre:{fr:'OFFRE DU CONSTRUCTEUR',en:'BUILDER\'S OFFER'}, desc:{fr:'Un constructeur propose un vaisseau d\'occasion.',en:'A builder offers a used ship.'}, choix:[
   {ico:'vaisseau', nom:{fr:'Acheter (5 cristaux)',en:'Buy (5 crystals)'}, desc:{fr:'+1 tireur',en:'+1 sniper'}, effet:()=>{ if((state.meta.cristaux||0)>=5){ state.meta.cristaux-=5; deployerVaisseau('sniper'); } else logMsg(t('evt_pas_assez_cristaux'),'log-red'); }},
   {ico:'refuser', nom:{fr:'Refuser',en:'Refuse'}, desc:{fr:'Rien',en:'Nothing'}, effet:()=>{}} ]},
 {titre:{fr:'CHAMP MAGNÉTIQUE RÉSIDUEL',en:'RESIDUAL MAGNETIC FIELD'}, desc:{fr:'Un champ magnétique traîne encore dans la zone.',en:'A magnetic field still lingers in the area.'}, choix:[
   {ico:'aimant', nom:{fr:'Absorber l\'énergie',en:'Absorb the energy'}, desc:{fr:'+30% ultime',en:'+30% ultimate'}, effet:()=>{ state.ultimeJauge=Math.min(state.ultimeSeuil,state.ultimeJauge+Math.round(state.ultimeSeuil*0.3)); }},
   {ico:'refuser', nom:{fr:'S\'éloigner',en:'Move away'}, desc:{fr:'Rien',en:'Nothing'}, effet:()=>{}} ]},
 {titre:{fr:'DUEL D\'HONNEUR',en:'DUEL OF HONOR'}, desc:{fr:'Un pilote solitaire propose un duel amical.',en:'A lone pilot offers a friendly duel.'}, choix:[
   {ico:'epee', nom:{fr:'Accepter',en:'Accept'}, desc:{fr:'+5 grade à un vaisseau au hasard',en:'+5 rank to a random ship'}, effet:()=>{ if(state.fighters.length){ const f=state.fighters[Math.floor(Math.random()*state.fighters.length)]; f.kills=(f.kills||0)+5; logMsg(t('evt_vaisseau_aguerri'),'log-grn'); } }},
   {ico:'refuser', nom:{fr:'Refuser',en:'Refuse'}, desc:{fr:'+5 score',en:'+5 score'}, effet:()=>{ state.score+=5; }} ]},
 {titre:{fr:'CARGO EN FUITE',en:'FLEEING CARGO SHIP'}, desc:{fr:'Un cargo largue sa cargaison pour fuir plus vite.',en:'A cargo ship dumps its load to flee faster.'}, choix:[
   {ico:'panier', nom:{fr:'Récupérer la cargaison',en:'Salvage the cargo'}, desc:{fr:'+1 vaisseau standard',en:'+1 standard ship'}, effet:()=>{ deployerVaisseau('normal'); }},
   {ico:'refuser', nom:{fr:'Le laisser filer',en:'Let it go'}, desc:{fr:'+6 score',en:'+6 score'}, effet:()=>{ state.score+=6; }} ]},
 {titre:{fr:'INTERFÉRENCES',en:'INTERFERENCE'}, desc:{fr:'Des interférences brouillent tes senseurs.',en:'Interference is jamming your sensors.'}, choix:[
   {ico:'engrenage', nom:{fr:'Recalibrer',en:'Recalibrate'}, desc:{fr:'-10% PV, +1 amélioration',en:'-10% HP, +1 upgrade'}, effet:()=>{ state.hpCruiser=Math.max(1,Math.round(state.hpCruiser*0.9)); ameliorationAleatoire(); }},
   {ico:'refuser', nom:{fr:'Ignorer',en:'Ignore'}, desc:{fr:'Rien',en:'Nothing'}, effet:()=>{}} ]},
 {titre:{fr:'RATION D\'URGENCE',en:'EMERGENCY RATIONS'}, desc:{fr:'Réserves de secours retrouvées à bord.',en:'Emergency supplies found on board.'}, choix:[
   {ico:'coeur', nom:{fr:'Utiliser',en:'Use them'}, desc:{fr:'+20% PV',en:'+20% HP'}, effet:()=>{ state.hpCruiser=Math.min(state.HP_MAX,state.hpCruiser+Math.round(state.HP_MAX*0.2)); }},
   {ico:'gemme', nom:{fr:'Revendre',en:'Sell them'}, desc:{fr:'+3 cristaux',en:'+3 crystals'}, effet:()=>{ state.meta.cristaux=(state.meta.cristaux||0)+3; }} ]},
 {titre:{fr:'VAISSEAU FANTÔME',en:'GHOST SHIP'}, desc:{fr:'Un vaisseau dérive, sans équipage.',en:'A ship drifts, with no crew.'}, choix:[
   {ico:'loupe', nom:{fr:'Investiguer',en:'Investigate'}, desc:{fr:'50% : +1 cuirassé, 50% : embuscade',en:'50%: +1 battleship, 50%: ambush'}, effet:()=>{ if(Math.random()<0.5){ deployerVaisseau('bouclier'); logMsg(t('evt_cuirasse_recupere'),'log-grn'); } else { for(let k=0;k<2;k++){ const c=Math.floor(Math.random()*state.COLS); if(!aileEn(c,0)) faireAile(c,0,typeAile()); } logMsg(t('evt_piege'),'log-red'); } }},
   {ico:'refuser', nom:{fr:'Ignorer',en:'Ignore'}, desc:{fr:'Rien',en:'Nothing'}, effet:()=>{}} ]},
 {titre:{fr:'SURCHAUFFE DES CANONS',en:'CANNON OVERHEAT'}, desc:{fr:'Pousser les canons au maximum ?',en:'Push the cannons to the max?'}, choix:[
   {ico:'explosion', nom:{fr:'Surchauffer',en:'Overheat them'}, desc:{fr:'+3 tirs gratuits, -5% PV',en:'+3 free shots, -5% HP'}, effet:()=>{ state.tirsGratuits=(state.tirsGratuits||0)+3; state.hpCruiser=Math.max(1,Math.round(state.hpCruiser*0.95)); }},
   {ico:'refuser', nom:{fr:'Rester prudent',en:'Stay cautious'}, desc:{fr:'Rien',en:'Nothing'}, effet:()=>{}} ]},
 {titre:{fr:'MARCHÉ NOIR',en:'BLACK MARKET'}, desc:{fr:'Un marché clandestin propose des upgrades... à prix fort.',en:'A clandestine market offers upgrades... at a steep price.'}, choix:[
   {ico:'panier', nom:{fr:'Acheter (8 cristaux)',en:'Buy (8 crystals)'}, desc:{fr:'+2 améliorations',en:'+2 upgrades'}, effet:()=>{ if((state.meta.cristaux||0)>=8){ state.meta.cristaux-=8; ameliorationAleatoire(); ameliorationAleatoire(); } else logMsg(t('evt_pas_assez_cristaux'),'log-red'); }},
   {ico:'refuser', nom:{fr:'Partir',en:'Leave'}, desc:{fr:'Rien',en:'Nothing'}, effet:()=>{}} ]},
 {titre:{fr:'ONDE DE CHOC RÉSIDUELLE',en:'RESIDUAL SHOCKWAVE'}, desc:{fr:'Les restes d\'une bataille passée flottent ici.',en:'The remains of a past battle float here.'}, choix:[
   {ico:'gemme', nom:{fr:'Fouiller l\'épave',en:'Search the wreck'}, desc:{fr:'+2 cristaux, +5 score',en:'+2 crystals, +5 score'}, effet:()=>{ state.meta.cristaux=(state.meta.cristaux||0)+2; state.score+=5; }},
   {ico:'refuser', nom:{fr:'Poursuivre',en:'Move on'}, desc:{fr:'+8% PV',en:'+8% HP'}, effet:()=>{ state.hpCruiser=Math.min(state.HP_MAX,state.hpCruiser+Math.round(state.HP_MAX*0.08)); }} ]},
 {titre:{fr:'PACTE AVEC UN PIRATE',en:'PACT WITH A PIRATE'}, desc:{fr:'Un pirate propose une alliance temporaire.',en:'A pirate offers a temporary alliance.'}, choix:[
   {ico:'de', nom:{fr:'Accepter',en:'Accept'}, desc:{fr:'+1 vaisseau rapide, -5 score (réputation)',en:'+1 fast ship, -5 score (reputation)'}, effet:()=>{ deployerVaisseau('rapide'); state.score=Math.max(0,state.score-5); }},
   {ico:'refuser', nom:{fr:'Refuser',en:'Refuse'}, desc:{fr:'+5 score',en:'+5 score'}, effet:()=>{ state.score+=5; }} ]},
 {titre:{fr:'DERNIÈRE VÉRIFICATION',en:'FINAL CHECK'}, desc:{fr:'L\'équipage propose une dernière vérification avant la suite.',en:'The crew suggests a final check before moving on.'}, choix:[
   {ico:'cle', nom:{fr:'Vérifier la coque',en:'Check the hull'}, desc:{fr:'+12% PV',en:'+12% HP'}, effet:()=>{ state.hpCruiser=Math.min(state.HP_MAX,state.hpCruiser+Math.round(state.HP_MAX*0.12)); }},
   {ico:'eclair', nom:{fr:'Vérifier le réacteur',en:'Check the reactor'}, desc:{fr:'+25% ultime',en:'+25% ultimate'}, effet:()=>{ state.ultimeJauge=Math.min(state.ultimeSeuil,state.ultimeJauge+Math.round(state.ultimeSeuil*0.25)); }} ]},
];
export function apresEvenement(){ const suite=state.suiteEvenement||demarrerTourJoueur; state.suiteEvenement=null; suite(); }
