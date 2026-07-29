/* =====================================================================
   TUTORIEL — guide en 4 étapes lors de la toute première partie
   (sélection, tir, déplacement, fin de tour)

   Script précis : l'encart de texte reste toujours ancré dans la bande
   HUD au-dessus de la grille (jamais sur la grille ni sur les boutons
   d'action / FIN DU TOUR), et une ligne le relie à la cible réelle
   (vaisseau, ennemi, case ou bouton), où qu'elle soit sur l'écran.
   ===================================================================== */
import { state, centreCase } from './state.js';
import { analyseTir, casesMouvement, peutActiverCapacite } from './combat.js';
import { t } from './i18n.js';

const TUTO_KEY='dc_tuto_vu';

const ETAPES=[
  { cle:'tuto_0', fait:()=>!!state.selection },
  { cle:'tuto_1',
    optionnel:()=>!state.fighters.some(f=>peutActiverCapacite(f)),
    fait:(b)=>state.capacitesJoueurTotal>b.caps },
  { cle:'tuto_2', fait:(b)=>state.tirsJoueurTotal>b.tirs },
  { cle:'tuto_3', fait:(b)=>state.deplacementsJoueurTotal>b.deps },
  { cle:'tuto_4', fait:(b)=>state.toursJoueurTotal>b.tours },
];

let actif=false, etapeIdx=0, baseline={tirs:0,deps:0,tours:0,caps:0};
let alignementFait=false, derniereVague=null;
let halo=null, bar=null, ligne=null, texte=null, skipBtn=null;

function elements(){
  if(halo) return;
  halo=document.getElementById('tutoHalo'); bar=document.getElementById('tutoBar'); ligne=document.getElementById('tutoLine');
  texte=document.getElementById('tutoTexte'); skipBtn=document.getElementById('tutoSkip');
  if(skipBtn) skipBtn.addEventListener('click',()=>terminer());
}

export function tutorielVu(){ try{ return localStorage.getItem(TUTO_KEY)==='1'; }catch(e){ return true; } }
function marquerVu(){ try{ localStorage.setItem(TUTO_KEY,'1'); }catch(e){} }

export function demarrer(){
  elements();
  actif=true; etapeIdx=0; alignementFait=false; derniereVague=null;
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
  // saute automatiquement les étapes optionnelles hors de propos ce tour-ci
  // (ex : aucun vaisseau n'a de coup spécial disponible)
  while(ETAPES[etapeIdx] && ETAPES[etapeIdx].optionnel && ETAPES[etapeIdx].optionnel()) etapeIdx++;
  const e=ETAPES[etapeIdx];
  if(!e){ terminer(); return; }
  texte.textContent=t(e.cle);
  baseline={tirs:state.tirsJoueurTotal, deps:state.deplacementsJoueurTotal, tours:state.toursJoueurTotal, caps:state.capacitesJoueurTotal};
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
  if(idx===0){ const f=state.fighters.find(x=>!x.used); if(!f) return null; return {x:f.x,y:f.y,r:state.CELL*0.55}; }
  if(idx===1){ const f=state.selection||state.fighters.find(x=>peutActiverCapacite(x)); if(!f) return null; return {x:f.x,y:f.y,r:state.CELL*0.55}; }
  if(idx===2){ if(!state.selection) return null; const an=analyseTir(state.selection); const a=[...an.ailesOk][0]; return a?{x:a.x,y:a.y,r:state.CELL*0.5}:null; }
  if(idx===3){ if(!state.selection) return null; const cells=casesMouvement(state.selection); if(!cells.length) return null; const c=centreCase(cells[0].c,cells[0].r); return {x:c.x,y:c.y,r:10}; }
  if(idx===4){ return {rect:state.BTN}; }
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
