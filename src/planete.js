/* =====================================================================
   MISSIONS PLANÈTE — entités (base, tourelles, garnison)
   Étape 3/9 de la roadmap : création des entités uniquement. La boucle de
   tour dédiée (avance de l'escadrille, tirs des tourelles, cadence de
   production de la garnison, conditions de victoire/échec) arrive à
   l'étape 4 — rien ici n'est encore relié au flux de jeu.
   ===================================================================== */
import { state, centreCase } from './state.js';
import { DIFFICULTES, TOURELLES, basePvMax } from './config.js';
import { faireAile, aileEn } from './entities.js';

/* base ennemie : PV proportionnels au secteur/difficulté (comme HP_MAX du croiseur), position
   fixe sur les 2 rangées du haut, centrée sur la largeur de la grille — même convention de
   placement que spawnBoss() (entities.js) pour rester cohérent visuellement. */
export function creerBase(secteur,difficulte){
  const w=3,h=2;
  const c=Math.max(0,Math.min(state.COLS-w,Math.round((state.COLS-w)/2)));
  const hp=basePvMax(secteur,difficulte);
  const p=centreCase(c+1,0);
  return {c,r:0,w,h,hp,maxhp:hp,x:p.x,y:p.y+state.CELL/2-state.CELL};
}

/* tourelles fixes défendant l'approche de la base : réparties entre la base (rangées 0-1) et
   la zone d'arrivée de l'escadrille (2 dernières rangées), jamais deux sur la même case.
   camouflee : réservé au biome Villes anciennes (mécanique de l'étape 5) — sans effet ici tant
   que rien ne s'appuie encore sur ce champ. */
export function creerTourelles(biome,secteur,difficulte){
  const d=DIFFICULTES[difficulte]||DIFFICULTES.normal;
  const nb=Math.max(2,2+Math.floor(secteur/2)+(d.squadDelta||0));
  const rMin=2, rMax=Math.max(rMin,state.RANGS-4);
  const tourelles=[]; let tries=0;
  while(tourelles.length<nb && tries<60){
    tries++;
    const c=Math.floor(Math.random()*state.COLS), r=rMin+Math.floor(Math.random()*(rMax-rMin+1));
    if(tourelles.some(t=>t.c===c&&t.r===r)) continue;
    const modele=TOURELLES[Math.floor(Math.random()*TOURELLES.length)];
    const camouflee=biome==='villes_anciennes'&&Math.random()<0.5;
    const p=centreCase(c,r);
    tourelles.push({id:modele.id,ico:modele.ico,c,r,hp:modele.hp,maxhp:modele.hp,portee:modele.portee,
      degats:Math.round(modele.degats*d.tourelleDmgMult),camouflee,x:p.x,y:p.y});
  }
  return tourelles;
}

/* production d'un vaisseau de garnison par la base : réutilise faireAile() (même catalogue de
   PV/vitesse/sprite que les ailes du combat spatial) sur une case libre juste sous la base.
   L'avance de ce vaisseau vers l'escadrille (et son arrêt en ligne de défense devant la base,
   sans percée façon éperonnage puisqu'il n'y a pas de croiseur à percuter) est gérée par la
   boucle de tour dédiée de l'étape 4, pas ici. */
export function produireGarnison(base){
  if(state.ailes.length>=state.AILES_MAX) return null;
  const r=base.r+base.h, opts=[];
  for(let c=base.c;c<base.c+base.w;c++){ if(!aileEn(c,r)) opts.push(c); }
  if(!opts.length) return null;
  const c=opts[Math.floor(Math.random()*opts.length)];
  faireAile(c,r,'normal');
  return aileEn(c,r);
}
