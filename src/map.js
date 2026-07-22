/* =====================================================================
   CARTE DE SECTEUR — génération, navigation, objectifs de vague,
   événements aléatoires entre les vagues
   ===================================================================== */
import { state, sauvegarderPartie } from './state.js';
import { UPGRADES, DIFFICULTES, BOUCLIER_USAGES_MAX } from './config.js';
import { apparaitreEscadrille, aileEn, faireAile, spawnBoss, deployerVaisseau, typeAile } from './entities.js';
import { setMusicPhase, sonVoix, sonRenfort, sonVague } from './audio.js';
import { demarrerTourJoueur } from './combat.js';
import { logMsg, ouvrirEvenement, ouvrirAmelioration, ouvrirMission, checkAchievements } from './ui.js';

export const ICONE={combat:'⚔️',elite:'☠️',event:'❓',rest:'🛠️',tresor:'💎',boss:'👹'};
export const NOM_NOEUD={combat:'Combat',elite:'Élite',event:'Signal',rest:'Relais',tresor:'Trésor',boss:'BOSS'};
export const DESC_NOEUD={combat:'Vague standard',elite:'Plus dur · plus de butin',event:'Événement à choix',rest:'Répare +25% PV',tresor:'Amélioration gratuite',boss:"Un boss t'attend !"};
function planeteAleatoire(){ const pool=['combat','combat','combat','event','rest','elite','tresor']; return pool[Math.floor(Math.random()*pool.length)]; }
export const COUL_NOEUD={combat:{c1:'#ff8f6b',c2:'#c94257',d:'#7a2030'},elite:{c1:'#ffe08a',c2:'#ffd23d',d:'#8f6a1f'},event:{c1:'#bfe9ff',c2:'#37a0d6',d:'#215f8f'},rest:{c1:'#8fe89a',c2:'#5fce6a',d:'#256a2f'},tresor:{c1:'#bfe0ff',c2:'#5a8fd6',d:'#3a4aa0'},boss:{c1:'#ff9a9a',c2:'#ff5a5a',d:'#6a1f2f'}};
export function genererCarte(){ const NB=6, cols=[];
  for(let c=0;c<NB;c++){ const n=(c===0||c===NB-1)?1:(2+Math.floor(Math.random()*2)); const col=[];
    for(let r=0;r<n;r++){ const type=c===NB-1?'boss':c===0?'combat':planeteAleatoire(); col.push({col:c,row:r,n,type,liens:[],visite:false}); }
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

export function ouvrirCarte(){ state.phase='carte'; sauvegarderPartie(serialiserCarte); }
export function entrerNoeud(nd){ state.noeudActuel=nd; nd.visite=true; const type=nd.type;
  if(type==='combat'||type==='elite'||type==='boss'){ demarrerCombat(type); }
  else if(type==='rest'){ state.hpCruiser=Math.min(state.HP_MAX,state.hpCruiser+Math.round(state.HP_MAX*0.25)); state.flashRecharge=1; sonRenfort(); logMsg('Relais : réparation','log-grn'); ouvrirCarte(); }
  else if(type==='event'){ state.suiteEvenement=ouvrirCarte; ouvrirEvenement(); }
  else if(type==='tresor'){ state.suiteAmelioration=ouvrirCarte; ouvrirAmelioration(); } }
export function demarrerCombat(type){
  const d=DIFFICULTES[state.difficulte]||DIFFICULTES.normal;
  state.ailes=[]; state.asteroides=[]; state.trousNoirs=[]; state.champs=[]; state.menacesWarn=[]; state.bonus=[]; if(type!=='boss') state.boss=null;
  for(const f of state.fighters){ f.capUsed=false; f.provoque=false; }
  state.boucliersRestants=BOUCLIER_USAGES_MAX;
  state.tourCompteur=0; state.prochainAsteroide=Math.max(1,3+Math.floor(Math.random()*2)+d.menaceDelta); state.enCombat=true;
  const diff=state.secteur*0.8+(state.noeudActuel?state.noeudActuel.col:0)*0.5;
  const squads=Math.max(1, 2+Math.round(diff)+(type==='elite'?2:0)+d.squadDelta);
  for(let s=0;s<squads;s++) apparaitreEscadrille();
  if(type==='elite'){ const c=Math.floor(Math.random()*state.COLS); if(!aileEn(c,0)) faireAile(c,0,Math.random()<0.5?'porteur':'brouilleur'); }
  if(type==='boss'){ spawnBoss(); setMusicPhase('boss'); sonVoix('BOSS'); logMsg('FORTERESSE !','log-red'); }
  assignerObjectif(); if(type==='boss') state.objectifVague={type:'boss',texte:'Détruis le boss'};
  demarrerTourJoueur(); }
export function gagnerCombat(){ state.enCombat=false;
  const reussi=objectifReussi(); if(state.damageThisWave===0) state.achievements.perfect_wave=true;
  state.hpCruiser=Math.min(state.HP_MAX,state.hpCruiser+Math.round(state.HP_MAX*0.04));
  if(reussi){ state.hpCruiser=Math.min(state.HP_MAX,state.hpCruiser+Math.round(state.HP_MAX*0.12)); state.score+=3; }
  state.vague++; sonVague(); setMusicPhase('calme'); checkAchievements();
  const type=state.noeudActuel?state.noeudActuel.type:'combat';
  state.suiteMission=()=>{ if(type==='boss'){ state.suiteAmelioration=secteurSuivant; ouvrirAmelioration(); }
    else if(type==='elite'){ state.suiteAmelioration=ouvrirCarte; ouvrirAmelioration(); } else ouvrirCarte(); };
  ouvrirMission(type,reussi); }
export function secteurSuivant(){ state.secteur++; state.hpCruiser=Math.min(state.HP_MAX,state.hpCruiser+Math.round(state.HP_MAX*0.15)); logMsg('★ SECTEUR '+state.secteur,'log-ylw'); genererCarte(); ouvrirCarte(); }

/* ===== OBJECTIFS DE VAGUE ===== */
export function assignerObjectif(){
  const pool=[{type:'sansdegat',texte:'Aucun dégât au croiseur'},{type:'protege',texte:'Ne perds aucun vaisseau'},
    {type:'kills',cible:Math.max(6,state.COLS),texte:''},{type:'survie',texte:'Survis à la vague'}];
  if(state.boss) pool.push({type:'boss',texte:'Détruis le boss'});
  const o={...pool[Math.floor(Math.random()*pool.length)]}; if(o.type==='kills') o.texte='Détruis '+o.cible+' ennemis';
  state.objectifVague=o; state.killsThisWave=0; state.shipsLostThisWave=0; state.bossKilledThisWave=false; state.damageThisWave=0;
}
export function objectifReussi(){ const o=state.objectifVague; if(!o) return false;
  return o.type==='survie'    ? true
       : o.type==='sansdegat' ? state.damageThisWave===0
       : o.type==='protege'   ? state.shipsLostThisWave===0
       : o.type==='kills'     ? state.killsThisWave>=o.cible
       : o.type==='boss'      ? state.bossKilledThisWave : false; }

/* ===== ÉVÉNEMENTS entre les vagues ===== */
export function ameliorationAleatoire(){ const dispo=UPGRADES.filter(u=>(state.ups[u.id]||0)<(u.max||9)); if(!dispo.length) return; const u=dispo[Math.floor(Math.random()*dispo.length)]; state.ups[u.id]=(state.ups[u.id]||0)+1; logMsg('⬆ '+u.nom,'log-grn'); }
export const EVENEMENTS=[
 {titre:'MARCHAND', desc:'Un marchand échange une cache d\'armes contre un peu de coque.', choix:[
   {emo:'🛒', nom:'Acheter', desc:'-25% PV, +1 amélioration', effet:()=>{ state.hpCruiser=Math.max(1,Math.round(state.hpCruiser*0.75)); ameliorationAleatoire(); }},
   {emo:'🚫', nom:'Refuser', desc:'+10% PV', effet:()=>{ state.hpCruiser=Math.min(state.HP_MAX,state.hpCruiser+Math.round(state.HP_MAX*0.1)); }} ]},
 {titre:'ÉPAVE À LA DÉRIVE', desc:'Une épave flotte non loin. La fouiller ?', choix:[
   {emo:'🔦', nom:'Fouiller', desc:'Gros butin… ou embuscade', effet:()=>{ if(Math.random()<0.5){ state.ultimeJauge=Math.min(state.ultimeSeuil,state.ultimeJauge+Math.round(state.ultimeSeuil*0.5)); state.score+=8; logMsg('Butin ! +50% ultime','log-ylw'); } else { for(let k=0;k<3;k++){ const c=Math.floor(Math.random()*state.COLS); if(!aileEn(c,0)) faireAile(c,0,typeAile()); } logMsg('Embuscade !','log-red'); } }},
   {emo:'🧲', nom:'Récupérer', desc:'+1 vaisseau', effet:()=>{ deployerVaisseau('normal'); }} ]},
 {titre:'DOCK DE FORTUNE', desc:'Des réparations sont possibles ici.', choix:[
   {emo:'🔧', nom:'Réparer', desc:'+40% PV', effet:()=>{ state.hpCruiser=Math.min(state.HP_MAX,state.hpCruiser+Math.round(state.HP_MAX*0.4)); }},
   {emo:'⚙️', nom:'Bricoler', desc:'+2 améliorations, -15% PV', effet:()=>{ state.hpCruiser=Math.max(1,Math.round(state.hpCruiser*0.85)); ameliorationAleatoire(); ameliorationAleatoire(); }} ]},
 {titre:'RENFORTS', desc:'La flotte propose du soutien.', choix:[
   {emo:'🚀', nom:'Deux chasseurs', desc:'+2 vaisseaux standards', effet:()=>{ deployerVaisseau('normal'); deployerVaisseau('normal'); }},
   {emo:'🛡', nom:'Un cuirassé', desc:'+1 cuirassé (3 PV)', effet:()=>{ deployerVaisseau('bouclier'); }} ]},
 {titre:'PARI RISQUÉ', desc:'Pile tu gagnes gros, face tu perds ta mise.', choix:[
   {emo:'🎲', nom:'Parier', desc:'50% : +score & ultime', effet:()=>{ if(Math.random()<0.5){ state.score+=15; state.ultimeJauge=Math.min(state.ultimeSeuil,state.ultimeJauge+Math.round(state.ultimeSeuil*0.5)); logMsg('Gagné ! +50% ultime','log-ylw'); } else logMsg('Perdu…','log-red'); }},
   {emo:'✋', nom:'Prudence', desc:'+5 score sûr', effet:()=>{ state.score+=5; }} ]},
 {titre:'SURTENSION', desc:'Le réacteur crache un surplus d\'énergie.', choix:[
   {emo:'⚡', nom:'Vers l\'ultime', desc:'Jauge d\'ultime pleine', effet:()=>{ state.ultimeJauge=state.ultimeSeuil; }},
   {emo:'🛡', nom:'Vers le bouclier', desc:'+30% PV', effet:()=>{ state.hpCruiser=Math.min(state.HP_MAX,state.hpCruiser+Math.round(state.HP_MAX*0.3)); }} ]},
];
export function apresEvenement(){ const suite=state.suiteEvenement||demarrerTourJoueur; state.suiteEvenement=null; suite(); }
