/* =====================================================================
   MISSIONS PLANÈTE — entités, boucle de tour dédiée, victoire/échec
   ===================================================================== */
import { state, centreCase } from './state.js';
import { DIFFICULTES, TOURELLES, BIOMES, OBSTACLES, basePvMax } from './config.js';
import { faireAile, aileEn, tourelleEn, fighterEn, blesser, tuerFighter,
         champObstacleEn, champEn, obstacleEn, dansGrille, occupe } from './entities.js';
import { exploser } from './combat.js';
import { sonBoom, sonTirEnnemi, setMusicPhase } from './audio.js';
import { ouvrirMission, ouvrirAmelioration, montrerToast } from './ui.js';
import { ouvrirCarte, reorganiserVaisseaux } from './map.js';
import { t } from './i18n.js';

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
   camouflee (biome Villes anciennes) : la tourelle démarre non révélée, cachée par une ruine
   posée à proximité (voir genererRuines) — reveillee pilote sa visibilité/ciblabilité réelle
   (voir analyseTir dans combat.js), le biome Grotte le force aussi à false pour toutes les
   tourelles (voir appliquerMecaniqueBiome). */
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
      degats:Math.round(modele.degats*d.tourelleDmgMult),camouflee,reveillee:!camouflee,x:p.x,y:p.y});
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
  for(let c=base.c;c<base.c+base.w;c++){ if(!aileEn(c,r)&&!tourelleEn(c,r)) opts.push(c); }
  if(!opts.length) return null;
  const c=opts[Math.floor(Math.random()*opts.length)];
  faireAile(c,r,'normal');
  return aileEn(c,r);
}

/* ===== MÉCANIQUES DE BIOME (étape 5) ===== */

/* distance de Chebyshev entre un vaisseau et le rectangle occupé par une entité w×h (tourelle :
   w=h=1 ; base : w=3,h=2) — sert au réveil des tourelles/de la base endormies (biome Grotte). */
function distanceRect(f,c,r,w,h){
  const dc=Math.max(0,f.c-(c+w-1),c-f.c), dr=Math.max(0,f.r-(r+h-1),r-f.r);
  return Math.max(dc,dr);
}

/* biome Désert : place quelques plaques de verglas... non, sable — voir genererGlace() pour la
   glace. Ici : programme la première tempête de sable (voir gererTempeteDesert, appelée chaque
   tour depuis finDuTourPlanete). */
function initDesert(pl){ pl.prochaineTempete=2+Math.floor(Math.random()*2); }

/* biome Glace : quelques plaques de verglas (OBSTACLES.glace, traversable) dans la zone de
   combat — l'effet de glissade est appliqué au moment du déplacement (ui.js pour l'escadrille,
   finDuTourPlanete ci-dessous pour la garnison), pas ici. */
function genererGlace(){
  const nb=3+Math.floor(Math.random()*3);
  let tries=0;
  while(state.obstacles.length<nb && tries<60){
    tries++;
    const c=Math.floor(Math.random()*state.COLS), r=2+Math.floor(Math.random()*Math.max(1,state.RANGS-5));
    if(occupe(c,r)||obstacleEn(c,r)) continue;
    const p=centreCase(c,r);
    state.obstacles.push({c,r,type:'glace',hp:0,maxhp:0,x:p.x,y:p.y,variante:Math.random()<0.5,ang:0});
  }
}

/* biome Villes anciennes : ruines destructibles denses (couverture, bloquent les tirs directs)
   + une ruine-cachette adjacente pour chaque tourelle camouflée (détruite => tourelle révélée,
   voir verifierCamouflage). */
function placerRuine(c,r){ const p=centreCase(c,r); const o={c,r,type:'ruine',hp:OBSTACLES.ruine.hp,maxhp:OBSTACLES.ruine.hp,x:p.x,y:p.y,variante:Math.random()<0.5,ang:0}; state.obstacles.push(o); return o; }
function genererRuines(pl){
  const nb=2+Math.floor(Math.random()*2), depart=state.obstacles.length;
  let tries=0;
  while(state.obstacles.length<depart+nb && tries<60){
    tries++;
    const c=Math.floor(Math.random()*state.COLS), r=2+Math.floor(Math.random()*Math.max(1,state.RANGS-5));
    if(occupe(c,r)||obstacleEn(c,r)) continue;
    placerRuine(c,r);
  }
  for(const tr of pl.tourelles){
    if(!tr.camouflee) continue;
    const adj=[[0,-1],[0,1],[-1,0],[1,0]]
      .map(([dc,dr])=>({c:tr.c+dc,r:tr.r+dr}))
      .filter(p=>dansGrille(p.c,p.r)&&!occupe(p.c,p.r)&&!obstacleEn(p.c,p.r));
    if(adj.length){ const pos=adj[Math.floor(Math.random()*adj.length)]; tr.cachette=placerRuine(pos.c,pos.r); }
  }
}
/* révèle une tourelle camouflée (biome Villes anciennes) : approche à 1 case ou destruction de
   sa ruine-cachette. Appelée après chaque déplacement du joueur (ui.js) et via le callback
   state.onObstacleDetruit posé par appliquerMecaniqueBiome (combat.js: frapperObstacle). */
export function verifierCamouflage(){
  if(!state.planete) return;
  for(const tr of state.planete.tourelles){
    if(!tr.camouflee||tr.reveillee) continue;
    const detruite=tr.cachette&&!state.obstacles.includes(tr.cachette);
    const proche=state.fighters.some(f=>distanceRect(f,tr.c,tr.r,1,1)<=1);
    if(detruite||proche){ tr.reveillee=true; montrerToast(t('toast_tourelle_reveleee'),'bad'); }
  }
}
/* biome Grotte : tourelles/base endormies (invisibles, inactives) tant qu'aucun vaisseau n'est
   à 2 cases ou moins ; le réveil détecté ce tour ne prend effet qu'au tour suivant — appelé en
   toute fin de finDuTourPlanete, après la passe de tir de ce tour-ci. */
function verifierReveilGrotte(pl){
  if(pl.biome!=='grotte') return;
  for(const tr of pl.tourelles){ if(!tr.reveillee&&state.fighters.some(f=>distanceRect(f,tr.c,tr.r,1,1)<=2)) tr.reveillee=true; }
  if(!pl.base.reveillee&&state.fighters.some(f=>distanceRect(f,pl.base.c,pl.base.r,pl.base.w,pl.base.h)<=2)) pl.base.reveillee=true;
}
/* biome Désert : tempête de sable périodique sur 1-2 colonnes, réutilise state.champs/champEn
   (même mécanique que le "champ magnétique" du combat spatial) — bloque le tir du joueur ET des
   tourelles à travers les colonnes touchées tant qu'elle dure. */
function gererTempeteDesert(pl){
  for(let i=state.champs.length-1;i>=0;i--){ state.champs[i].turns--; if(state.champs[i].turns<=0) state.champs.splice(i,1); }
  if(pl.biome!=='desert') return;
  if(pl.tourCompteur<pl.prochaineTempete) return;
  const c0=Math.floor(Math.random()*Math.max(1,state.COLS-1));
  const c1=Math.min(state.COLS-1,c0+(Math.random()<0.5?0:1));
  state.champs.push({c0,c1,turns:3});
  montrerToast(t('toast_tempete_sable'),'bad');
  pl.prochaineTempete=pl.tourCompteur+3+Math.floor(Math.random()*3);
}
/* biome Glace : fait glisser une entité d'une case de plus dans la direction de son dernier
   déplacement si elle atterrit sur une plaque de verglas et que la case suivante est libre. */
export function appliquerGlissade(entite,dc,dr){
  if(champObstacleEn(entite.c,entite.r)!=='glace') return;
  const nc=entite.c+dc, nr=entite.r+dr;
  if(dansGrille(nc,nr)&&!occupe(nc,nr)) { entite.c=nc; entite.r=nr; }
}
function appliquerMecaniqueBiome(biomeId){
  const pl=state.planete;
  if(biomeId==='desert') initDesert(pl);
  else if(biomeId==='grotte'){ for(const tr of pl.tourelles) tr.reveillee=false; pl.base.reveillee=false; }
  else if(biomeId==='glace') genererGlace();
  else if(biomeId==='villes_anciennes'){ genererRuines(pl); state.onObstacleDetruit=(o)=>{ if(o.type==='ruine') verifierCamouflage(); }; }
}

/* ===== FLUX DE MISSION ===== */

/* démarrage d'une mission planète : tire un biome, crée la base et les tourelles, repositionne
   l'escadrille sur les 2 dernières rangées (reorganiserVaisseaux, comme secteurSuivant()) et
   ouvre le premier tour joueur. state.enCombat reste volontairement à false pendant toute la
   mission : le check de victoire automatique de combat.js (gagnerCombat) est réservé au combat
   spatial (ailes.length===0), ce qui n'a pas de sens ici (les ailes sont la garnison, produite
   progressivement, pas une vague fixe à épuiser). */
export function demarrerMissionPlanete(){
  const biome=BIOMES[Math.floor(Math.random()*BIOMES.length)];
  const d=DIFFICULTES[state.difficulte]||DIFFICULTES.normal;
  const base=creerBase(state.secteur,state.difficulte); base.reveillee=true;
  state.planete={
    biome:biome.id,
    base,
    tourelles:creerTourelles(biome.id,state.secteur,state.difficulte),
    tourCompteur:0,
    prochaineGarnison:2+Math.floor(Math.random()*2)+d.garnisonDelta,
  };
  state.ailes=[]; state.asteroides=[]; state.bonus=[]; state.boss=null; state.obstacles=[];
  state.trousNoirs=[]; state.champs=[]; state.menacesWarn=[]; state.hangar=null; state.tirsGratuits=0;
  state.killsThisWave=0; state.scoreAvantVague=state.score; state.onObstacleDetruit=null;
  for(const f of state.fighters){ f.capUsed=false; f.provoque=false; f.gele=0; }
  reorganiserVaisseaux();
  appliquerMecaniqueBiome(biome.id);
  state.suiteDemarrerTour=demarrerTourJoueurPlanete;
  state.suiteFinPlanete=finMissionPlanete;
  demarrerTourJoueurPlanete();
}

/* équivalent de demarrerTourJoueur() (combat.js) mais sans les réglages propres au croiseur
   (tirsGratuits/tourelleDouble) et sans sauvegarde automatique (reprise de mission en cours :
   étape 7 de la roadmap, pas encore gérée). */
export function demarrerTourJoueurPlanete(){
  state.phase='joueur';
  for(const f of state.fighters){ if(f.gele>0){ f.gele--; f.used=true; } else f.used=false; f.provoque=false; }
  state.actionFaite=false; state.modeTourelle=false; state.modeCapacite=null;
  setMusicPhase('calme');
}

/* phase ennemie d'une mission planète : tourelles fixes qui tirent sur le vaisseau le plus
   proche à portée, avance de la garnison vers l'escadrille (même mécanique que l'avance des
   ailes en combat spatial, sans percée finale puisqu'il n'y a pas de croiseur à percuter — la
   garnison s'arrête simplement à la dernière rangée), puis production périodique d'une nouvelle
   garnison par la base. */
export function finDuTourPlanete(){
  if(state.phase!=='joueur'||state.paused) return;
  state.toursJoueurTotal=(state.toursJoueurTotal||0)+1;
  const pl=state.planete;
  state.phase='ennemi'; state.selection=null; state.lockTimer=0.9;
  setMusicPhase('tense');

  // (1) tourelles fixes : tirent sur le vaisseau le plus proche à portée (distance de Chebyshev),
  // sauf si endormie/camouflée (reveillee===false) ou couverte par une tempête de sable (désert)
  let tirs=false;
  for(const tr of pl.tourelles){
    if(!tr.reveillee||champEn(tr.c)) continue;
    let cible=null, meilleure=Infinity;
    for(const f of state.fighters){ const d=Math.max(Math.abs(f.c-tr.c),Math.abs(f.r-tr.r)); if(d<=tr.portee&&d<meilleure){ meilleure=d; cible=f; } }
    if(!cible) continue;
    tirs=true;
    state.lasers.push({x1:tr.x,y1:tr.y,x2:cible.x,y2:cible.y,t:0,ennemi:true,gros:true});
    state.trails.push({x1:tr.x,y1:tr.y,x2:cible.x,y2:cible.y,t:0,ennemi:true,gros:true});
    const mort=blesser(cible); exploser(cible.x,cible.y,false); if(mort) tuerFighter(cible);
  }
  if(tirs) sonTirEnnemi();

  // (2) avance de la garnison vers l'escadrille (1 rangée/tour, comme une aile 'normal'), avec
  // glissade supplémentaire sur une plaque de verglas (biome Glace)
  for(const a of [...state.ailes]){
    if(!state.ailes.includes(a)) continue;
    const nr=a.r+1;
    if(nr>state.RANGS-1) continue;   // arrêt à la dernière rangée : pas de percée façon éperonnage
    const f=fighterEn(a.c,nr);
    if(f){ exploser(a.x,a.y,false); state.ailes.splice(state.ailes.indexOf(a),1); const mort=blesser(f); exploser(f.x,f.y,false); if(mort) tuerFighter(f); sonBoom(); continue; }
    if(tourelleEn(a.c,nr)) continue;   // ne s'installe pas sur une tourelle alliée
    a.r=nr;
    appliquerGlissade(a,0,1);
  }

  // (3) production de garnison par la base, à intervalle régulier (ajusté par la difficulté)
  pl.tourCompteur++;
  if(pl.tourCompteur>=pl.prochaineGarnison){
    produireGarnison(pl.base);
    const d=DIFFICULTES[state.difficulte]||DIFFICULTES.normal;
    pl.prochaineGarnison=pl.tourCompteur+Math.max(1,3+Math.floor(Math.random()*2)+d.garnisonDelta);
  }

  // (4) mécaniques de biome : tempête de sable (désert), réveil différé (grotte)
  gererTempeteDesert(pl);
  verifierReveilGrotte(pl);
}

/* fin de mission (victoire = base détruite, échec = escadrille détruite) : réutilise l'écran de
   récap existant (ouvrirMission) et, en cas de victoire, le circuit de récompense du nœud élite
   (choix d'amélioration garanti). En cas d'échec, retour direct à la carte — pas de fin de
   partie, seul le nœud est manqué (voir ROADMAP.md, décision verrouillée). */
export function finMissionPlanete(victoire){
  state.planete=null; state.suiteFinPlanete=null; state.suiteDemarrerTour=null;
  reorganiserVaisseaux();
  setMusicPhase('calme');
  const lignes=[];
  if(state.killsThisWave>0) lignes.push({label:t('mission_recap_kills',{n:state.killsThisWave}), points:state.killsThisWave});
  if(victoire){ state.score+=5; lignes.push({label:t('mission_recap_base'), points:5}); }
  const recap={avant:state.scoreAvantVague, apres:state.score, lignes};
  state.suiteMission = victoire
    ? ()=>{ state.suiteAmelioration=ouvrirCarte; ouvrirAmelioration(); }
    : ouvrirCarte;
  ouvrirMission('planete', victoire, recap);
}
