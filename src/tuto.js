/* =====================================================================
   TUTORIEL — guide en 4 étapes lors de la toute première partie
   (sélection, tir, déplacement, fin de tour)
   ===================================================================== */
import { state, centreCase } from './state.js';
import { analyseTir, casesMouvement } from './combat.js';

const TUTO_KEY='dc_tuto_vu';

const ETAPES=[
  { texte:"Touche un de tes vaisseaux, en bas de l'écran, pour le sélectionner.", fait:()=>!!state.selection },
  { texte:"Touche un ennemi accessible (viseur rouge) pour tirer dessus.",        fait:(b)=>state.tirsJoueurTotal>b.tirs },
  { texte:"Touche un point bleu pour déplacer ton vaisseau.",                     fait:(b)=>state.deplacementsJoueurTotal>b.deps },
  { texte:"Touche FIN DU TOUR pour terminer ton tour.",                          fait:(b)=>state.toursJoueurTotal>b.tours },
];

let actif=false, etapeIdx=0, baseline={tirs:0,deps:0,tours:0}, alignementFait=false;
let halo=null, bar=null, texte=null, skipBtn=null;

function elements(){
  if(halo) return;
  halo=document.getElementById('tutoHalo'); bar=document.getElementById('tutoBar');
  texte=document.getElementById('tutoTexte'); skipBtn=document.getElementById('tutoSkip');
  if(skipBtn) skipBtn.addEventListener('click',()=>terminer());
}

export function tutorielVu(){ try{ return localStorage.getItem(TUTO_KEY)==='1'; }catch(e){ return true; } }
function marquerVu(){ try{ localStorage.setItem(TUTO_KEY,'1'); }catch(e){} }

export function demarrer(){
  elements();
  actif=true; etapeIdx=0; alignementFait=false;
  afficherEtape();
  // la barre n'apparaît qu'une fois le combat commencé (voir mettreAJour) :
  // pendant le choix de la planète de départ (phase 'carte'), on reste masqué.
  bar.classList.remove('visible'); if(halo) halo.classList.remove('visible');
}
export function relancer(){ demarrer(); }

function terminer(){
  actif=false; marquerVu();
  if(bar) bar.classList.remove('visible');
  if(halo) halo.classList.remove('visible');
}

function afficherEtape(){
  const e=ETAPES[etapeIdx];
  if(!e){ terminer(); return; }
  texte.textContent=e.texte;
  baseline={tirs:state.tirsJoueurTotal, deps:state.deplacementsJoueurTotal, tours:state.toursJoueurTotal};
}

/* Garantit qu'au moins un vaisseau ait un ennemi réellement accessible dès
   le premier combat du tutoriel, sans dépendre de l'aléatoire du spawn. */
function garantirCibleAccessible(){
  if(alignementFait) return;
  alignementFait=true;
  if(!state.ailes.length || !state.fighters.length) return;
  const dejaOk=state.fighters.some(f=>analyseTir(f).ailesOk.size>0);
  if(dejaOk) return;
  const aile=state.ailes[0], cible=state.fighters[0];
  aile.c=cible.c; const p=centreCase(aile.c,aile.r); aile.x=p.x;
}

function cibleEtape(idx){
  if(idx===0){ const f=state.fighters.find(x=>!x.used); if(!f) return null; return {x:f.x,y:f.y,r:state.CELL*0.55}; }
  if(idx===1){ if(!state.selection) return null; const an=analyseTir(state.selection); const a=[...an.ailesOk][0]; return a?{x:a.x,y:a.y,r:state.CELL*0.5}:null; }
  if(idx===2){ if(!state.selection) return null; const cells=casesMouvement(state.selection); if(!cells.length) return null; const c=centreCase(cells[0].c,cells[0].r); return {x:c.x,y:c.y,r:10}; }
  if(idx===3){ return {rect:state.BTN}; }
  return null;
}

function positionnerHalo(){
  const e=ETAPES[etapeIdx];
  if(!e){ halo.classList.remove('visible'); return; }
  const cible=cibleEtape(etapeIdx);
  if(!cible || !state.LARGEUR){ halo.classList.remove('visible'); return; }
  const canvas=document.getElementById('jeu'), cb=canvas.getBoundingClientRect();
  const sb=document.getElementById('scene').getBoundingClientRect();
  const sx=cb.width/state.LARGEUR, sy=cb.height/state.HAUTEUR;
  if(cible.rect){
    const R=cible.rect;
    halo.classList.add('rect');
    halo.style.left=(cb.left-sb.left+R.x*sx+(R.w*sx)/2)+'px';
    halo.style.top=(cb.top-sb.top+R.y*sy+(R.h*sy)/2)+'px';
    halo.style.width=(R.w*sx+16)+'px'; halo.style.height=(R.h*sy+16)+'px';
  } else {
    halo.classList.remove('rect');
    halo.style.left=(cb.left-sb.left+cible.x*sx)+'px';
    halo.style.top=(cb.top-sb.top+cible.y*sy)+'px';
    const d=(cible.r*2*Math.max(sx,sy))+10;
    halo.style.width=d+'px'; halo.style.height=d+'px';
  }
  halo.classList.add('visible');
}

export function mettreAJour(){
  if(!actif) return;
  // Le tutoriel ne s'affiche et n'avance QUE pendant le combat.
  // Sur la carte (choix de planète) ou une scène de planète, on masque tout.
  if(state.phase!=='joueur'){ bar.classList.remove('visible'); halo.classList.remove('visible'); return; }
  bar.classList.add('visible');
  if(state.enCombat) garantirCibleAccessible();
  const e=ETAPES[etapeIdx];
  if(e && e.fait(baseline)){
    etapeIdx++;
    if(etapeIdx>=ETAPES.length){ terminer(); return; }
    afficherEtape();
  }
  positionnerHalo();
}
