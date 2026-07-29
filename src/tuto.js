/* =====================================================================
   TUTORIEL — mission scriptée en 8 étapes lors de la toute première partie
   (sélection, tir, vaisseau spécial + son coup spécial, vaisseau rouge,
   action du croiseur, ultime, fin de tour)

   Contrairement à une ancienne version qui pointait vers "n'importe quel
   vaisseau sélectionné", chaque étape cible un vaisseau PRÉCIS, capturé une
   fois au démarrage (le Standard, le vaisseau à coup spécial, le Rouge) —
   ça évite qu'une étape se retrouve associée au mauvais vaisseau (ex : un
   Standard sans coup spécial affiché à l'étape "coup spécial").
   nouvellePartie() garantit qu'un des 3 vaisseaux de départ a bien un coup
   spécial lors de ce tout premier combat, et pré-charge la jauge d'ultime.

   Script précis : l'encart de texte reste toujours ancré dans la bande
   HUD au-dessus de la grille (jamais sur la grille ni sur les boutons
   d'action / FIN DU TOUR), et une ligne le relie à la cible réelle
   (vaisseau, ennemi, case ou bouton), où qu'elle soit sur l'écran.
   ===================================================================== */
import { state, centreCase } from './state.js';
import { analyseTir, peutActiverCapacite } from './combat.js';
import { t } from './i18n.js';

const TUTO_KEY='dc_tuto_vu';

const ETAPES=[
  { cle:'tuto_0', fait:()=>state.selection===refNormal },
  { cle:'tuto_1', fait:(b)=>state.tirsJoueurTotal>b.tirs },
  { cle:'tuto_2', optionnel:()=>!refSpecial, fait:()=>state.selection===refSpecial },
  { cle:'tuto_3', optionnel:()=>!refSpecial, fait:(b)=>state.capacitesJoueurTotal>b.caps },
  { cle:'tuto_4', optionnel:()=>!refRouge, fait:()=>!!(refRouge&&refRouge.used) },
  { cle:'tuto_5', fait:()=>state.actionFaite===true },
  { cle:'tuto_6', fait:(b)=>state.ultimesJoueurTotal>b.ultimes },
  { cle:'tuto_7', fait:(b)=>state.toursJoueurTotal>b.tours },
];

let actif=false, etapeIdx=0, baseline={tirs:0,tours:0,caps:0,ultimes:0};
let alignementFait=false, derniereVague=null;
let refNormal=null, refSpecial=null, refRouge=null;
let halo=null, bar=null, ligne=null, texte=null, skipBtn=null;

function elements(){
  if(halo) return;
  halo=document.getElementById('tutoHalo'); bar=document.getElementById('tutoBar'); ligne=document.getElementById('tutoLine');
  texte=document.getElementById('tutoTexte'); skipBtn=document.getElementById('tutoSkip');
  if(skipBtn) skipBtn.addEventListener('click',()=>terminer());
}

export function tutorielVu(){ try{ return localStorage.getItem(TUTO_KEY)==='1'; }catch(e){ return true; } }
function marquerVu(){ try{ localStorage.setItem(TUTO_KEY,'1'); }catch(e){} }

/* capture une fois pour toutes les 3 vaisseaux de départ, par référence : les étapes
   ciblent toujours LE MÊME vaisseau précis du début à la fin, jamais "la sélection". */
function capturerRoster(){
  refNormal=state.fighters.find(f=>f.type==='normal')||null;
  refRouge=state.fighters.find(f=>f.type==='rouge')||null;
  refSpecial=state.fighters.find(f=>f!==refNormal&&f!==refRouge&&peutActiverCapacite(f))
           ||state.fighters.find(f=>f!==refNormal&&f!==refRouge)||null;
}

export function demarrer(){
  elements();
  actif=true; etapeIdx=0; alignementFait=false; derniereVague=null;
  capturerRoster();
  afficherEtape();
  // la barre n'apparaît qu'une fois le combat commencé (voir mettreAJour) :
  // pendant le choix de la planète de départ (phase 'carte'), on reste masqué.
  bar.classList.remove('visible'); if(halo) halo.classList.remove('visible'); if(ligne) ligne.classList.remove('visible');
}
export function relancer(){ demarrer(); }

function terminer(){
  actif=false; marquerVu();
  if(bar) bar.classList.remove('visible');
  if(halo) halo.classList.remove('visible');
  if(ligne) ligne.classList.remove('visible');
}

function afficherEtape(){
  // saute automatiquement une étape si sa cible n'existe pas ce combat-ci (garde-fou :
  // en temps normal nouvellePartie() garantit toujours un vaisseau à coup spécial et un Rouge).
  while(ETAPES[etapeIdx] && ETAPES[etapeIdx].optionnel && ETAPES[etapeIdx].optionnel()) etapeIdx++;
  const e=ETAPES[etapeIdx];
  if(!e){ terminer(); return; }
  texte.textContent=t(e.cle);
  baseline={tirs:state.tirsJoueurTotal, tours:state.toursJoueurTotal, caps:state.capacitesJoueurTotal, ultimes:state.ultimesJoueurTotal};
}

/* Garantit qu'au moins un vaisseau ait un ennemi réellement accessible.
   Se réarme à chaque nouvelle vague (le combat précédent ne garantit rien
   pour le suivant : sans ça, une vague plus tardive du tutoriel pouvait
   se retrouver sans aucune cible à portée). */
function garantirCibleAccessible(){
  if(state.vague!==derniereVague){ derniereVague=state.vague; alignementFait=false; }
  if(alignementFait) return;
  if(!state.ailes.length || !state.fighters.length) return;   // pas encore prêt : on retentera à la frame suivante
  // ne s'aligne que sur une aile déjà entrée dans la grille (rangée >= 0) : les ailes hors grille
  // (formation en V) sont invisibles et hors de portée, elles ne peuvent pas servir de cible garantie.
  const aile=state.ailes.find(a=>a.r>=0);
  if(!aile) return;   // aucune aile visible encore : on retentera à la frame suivante
  alignementFait=true;
  const dejaOk=state.fighters.some(f=>analyseTir(f).ailesOk.size>0);
  if(dejaOk) return;
  const cible=state.fighters[0];
  aile.c=cible.c; const p=centreCase(aile.c,aile.r); aile.x=p.x;
}

function cibleEtape(idx){
  if(idx===0) return refNormal&&!refNormal.used ? {x:refNormal.x,y:refNormal.y,r:state.CELL*0.55} : null;
  if(idx===1){ const f=state.selection||refNormal; return f?{x:f.x,y:f.y,r:state.CELL*0.55}:null; }
  if(idx===2) return refSpecial&&!refSpecial.used ? {x:refSpecial.x,y:refSpecial.y,r:state.CELL*0.55} : null;
  if(idx===3) return refSpecial ? {x:refSpecial.x,y:refSpecial.y,r:state.CELL*0.55} : null;
  if(idx===4) return refRouge&&!refRouge.used ? {x:refRouge.x,y:refRouge.y,r:state.CELL*0.55} : null;
  // BOUCLIER (index 2) : seule action du croiseur qui s'applique en un seul tap, sans cible à
  // choisir ensuite (contrairement à TOURELLE) — la plus simple à démontrer dans le tutoriel.
  if(idx===5) return state.ACT&&state.ACT[2] ? {rect:state.ACT[2]} : null;
  if(idx===6) return state.ULT ? {rect:state.ULT} : null;
  if(idx===7) return {rect:state.BTN};
  return null;
}

/* Place le halo sur la cible réelle, l'encart de texte dans la bande HUD (toujours
   au-dessus de la grille, jamais sur la grille ni sur les boutons), et trace une
   ligne entre les deux — quelle que soit la position de la cible sur l'écran. */
function positionner(){
  const e=ETAPES[etapeIdx];
  if(!e){ halo.classList.remove('visible'); ligne.classList.remove('visible'); return; }
  const cible=cibleEtape(etapeIdx);
  if(!cible || !state.LARGEUR){ halo.classList.remove('visible'); ligne.classList.remove('visible'); return; }
  const canvas=document.getElementById('jeu'), cb=canvas.getBoundingClientRect();
  const sb=document.getElementById('scene').getBoundingClientRect();
  const sx=cb.width/state.LARGEUR, sy=cb.height/state.HAUTEUR;
  const ox=cb.left-sb.left, oy=cb.top-sb.top;

  // --- halo sur la cible ---
  let tx,ty;
  if(cible.rect){
    const R=cible.rect;
    tx=ox+R.x*sx+(R.w*sx)/2; ty=oy+R.y*sy+(R.h*sy)/2;
    halo.classList.add('rect');
    halo.style.left=tx+'px'; halo.style.top=ty+'px';
    halo.style.width=(R.w*sx+16)+'px'; halo.style.height=(R.h*sy+16)+'px';
  } else {
    tx=ox+cible.x*sx; ty=oy+cible.y*sy;
    halo.classList.remove('rect');
    halo.style.left=tx+'px'; halo.style.top=ty+'px';
    const d=(cible.r*2*Math.max(sx,sy))+10;
    halo.style.width=d+'px'; halo.style.height=d+'px';
  }
  halo.classList.add('visible');

  // --- encart de texte : placé au plus près de la cible réelle (au-dessus, sinon dessous/côté),
  //     sans jamais chevaucher le bouton FIN DU TOUR ni déborder de l'écran. ---
  bar.style.transform='none';   // taille intrinsèque (largeur fixée en CSS) mesurable avant positionnement
  const bw=bar.offsetWidth, bh=bar.offsetHeight, marge=10, gap=14;
  const demiCible= cible.rect ? Math.max(cible.rect.w*sx,cible.rect.h*sy)/2 : cible.r*Math.max(sx,sy);
  const btn=state.BTN, brx=ox+btn.x*sx, bry=oy+btn.y*sy, brw=btn.w*sx, brh=btn.h*sy;
  const chevaucheBouton=(x,y)=> x<brx+brw && x+bw>brx && y<bry+brh && y+bh>bry;
  const horsScene=(x,y)=> x<marge || y<marge || x+bw>sb.width-marge || y+bh>sb.height-marge;
  const candidats=[
    {x:tx-bw/2, y:ty-demiCible-bh-gap},   // au-dessus
    {x:tx-bw/2, y:ty+demiCible+gap},      // en dessous
    {x:tx-demiCible-bw-gap, y:ty-bh/2},   // à gauche
    {x:tx+demiCible+gap, y:ty-bh/2},      // à droite
  ];
  let choix=candidats.find(p=>!chevaucheBouton(p.x,p.y)&&!horsScene(p.x,p.y));
  if(!choix) choix={x:sb.width/2-bw/2, y:oy+Math.max(6,state.GY*0.28*sy)};   // repli : bande HUD
  choix.x=Math.max(marge,Math.min(choix.x,sb.width-bw-marge));
  choix.y=Math.max(marge,Math.min(choix.y,sb.height-bh-marge));
  bar.style.left=choix.x+'px'; bar.style.top=choix.y+'px';

  // --- ligne reliant l'encart à la cible réelle ---
  const lx0=choix.x+bw/2, ly0=choix.y+bh/2;
  const dx=tx-lx0, dy=ty-ly0, dist=Math.hypot(dx,dy), ang=Math.atan2(dy,dx);
  ligne.style.left=lx0+'px'; ligne.style.top=ly0+'px'; ligne.style.width=dist+'px';
  ligne.style.transform='rotate('+ang+'rad)';
  ligne.classList.add('visible');
}

export function mettreAJour(){
  if(!actif) return;
  // Le tutoriel ne s'affiche et n'avance QUE pendant le combat.
  // Sur la carte (choix de planète) ou une scène de planète, on masque tout.
  if(state.phase!=='joueur'){ bar.classList.remove('visible'); halo.classList.remove('visible'); ligne.classList.remove('visible'); return; }
  bar.classList.add('visible');
  if(state.enCombat) garantirCibleAccessible();
  let e=ETAPES[etapeIdx];
  if(e && e.optionnel && e.optionnel()){ etapeIdx++; afficherEtape(); e=ETAPES[etapeIdx]; if(!e) return; }
  if(e && e.fait(baseline)){
    etapeIdx++;
    if(etapeIdx>=ETAPES.length){ terminer(); return; }
    afficherEtape();
  }
  positionner();
}
