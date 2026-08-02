/* =====================================================================
   MISSIONS PLANÈTE — entités, boucle de tour dédiée, victoire/échec
   ===================================================================== */
import { state, centreCase, sauvegarderPartie, decouvrir } from './state.js';
import { DIFFICULTES, TOURELLES, BIOMES, OBSTACLES, basePvMax, ALERTE_PALIER1, ALERTE_PALIER2, ALERTE_ZONE_RANGS,
         BASE_POINT_FAIBLE_INTERVAL, BASE_POINT_FAIBLE_MULT, SABORDAGE_DEGATS_RATIO } from './config.js';
import { faireAile, aileEn, tourelleEn, fighterEn, blesser, tuerFighter,
         champObstacleEn, champEn, obstacleEn, dansGrille, occupe } from './entities.js';
import { exploser } from './combat.js';
import { sonBoom, sonTirEnnemi, setMusicPhase, setMusicBiome, sonVictoirePlanete } from './audio.js';
import { ouvrirMission, ouvrirAmelioration, montrerToast, ouvrirEtapeBanner, checkAchievements } from './ui.js';
import { ouvrirCarte, reorganiserVaisseaux, serialiserCarte } from './map.js';
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
    decouvrir('planete_tourelle',modele.id);
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

/* couverture (ruines destructibles, bloquent les tirs directs) — généralisée aux 4 biomes
   (refonte étape 6, voir ROADMAP.md) : avancer devient une vraie décision tactique (s'exposer vs.
   contourner) sur toute mission planète, pas seulement Villes anciennes. Cette dernière reste la
   plus dense (identité du biome) et la seule où une ruine-cachette est posée près de chaque
   tourelle camouflée (détruite => tourelle révélée, voir verifierCamouflage) — les autres biomes
   n'ont que la couverture, sans lien avec le camouflage (aucune de leurs tourelles n'est
   camouflee). */
function placerRuine(c,r){ const p=centreCase(c,r); const o={c,r,type:'ruine',hp:OBSTACLES.ruine.hp,maxhp:OBSTACLES.ruine.hp,x:p.x,y:p.y,variante:Math.random()<0.5,ang:0}; state.obstacles.push(o); return o; }
function genererRuines(pl,biomeId){
  const nb=(biomeId==='villes_anciennes'?2:1)+Math.floor(Math.random()*2), depart=state.obstacles.length;
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
/* callback state.onObstacleDetruit (consommé par frapperObstacle, combat.js) : à reposer aussi
   bien à la création de la mission qu'à sa reprise après rechargement (reprendrePartie, main.js),
   qui reconstruit state.planete sans repasser par appliquerMecaniqueBiome. */
export function activerRappelsBiome(biomeId){
  if(biomeId==='villes_anciennes') state.onObstacleDetruit=(o)=>{ if(o.type==='ruine') verifierCamouflage(); };
}
function appliquerMecaniqueBiome(biomeId){
  const pl=state.planete;
  if(biomeId==='desert') initDesert(pl);
  else if(biomeId==='grotte'){ for(const tr of pl.tourelles) tr.reveillee=false; pl.base.reveillee=false; }
  else if(biomeId==='glace') genererGlace();
  genererRuines(pl,biomeId);   // couverture généralisée aux 4 biomes (étape 6, voir plus haut)
  activerRappelsBiome(biomeId);
}

/* ===== JAUGE D'ALERTE (refonte) ===== */

/* distance (en rangées) entre un vaisseau et la rangée avant de la base — sert de mesure de
   "progrès vers la base" pour la jauge d'alerte (indépendante de la colonne, contrairement à
   distanceRect, pour ne pas pénaliser un repositionnement latéral). */
function distanceFrontBase(f,base){ return Math.max(0,f.r-(base.r+base.h-1)); }
function meilleureDistanceActuelle(pl){
  if(!state.fighters.length) return pl.meilleureDistance;
  return Math.min(...state.fighters.map(f=>distanceFrontBase(f,pl.base)));
}
/* met à jour la jauge d'alerte à partir des positions du tour qui vient de s'achever (avant
   toute résolution ennemie) : progrès réel (nouveau record de rapprochement) -> retombe à 0 ;
   sinon incrémente. Toujours réversible, jamais un chrono qu'on ne peut pas désamorcer.
   Retourne le palier atteint (0/1/2) et gère les toasts d'avertissement/activation. */
function mettreAJourAlerte(pl){
  const dist=meilleureDistanceActuelle(pl);
  const progres=dist<pl.meilleureDistance;
  if(progres){ pl.meilleureDistance=dist; if(pl.alerte>0) montrerToast(t('toast_alerte_apaisee'),'ok'); pl.alerte=0; }
  else pl.alerte++;
  if(pl.alerte===ALERTE_PALIER1-1) montrerToast(t('alerte_palier1_avert'),'bad');
  if(pl.alerte===ALERTE_PALIER2-1) montrerToast(t('alerte_palier2_avert'),'bad');
  const niveauAvant=pl.alerteNiveau||0;
  const niveau=pl.alerte>=ALERTE_PALIER2?2:pl.alerte>=ALERTE_PALIER1?1:0;
  if(niveau>niveauAvant){
    if(niveau===1) montrerToast(t('alerte_palier1_actif'),'bad');
    else montrerToast(t('alerte_palier2_actif_'+pl.biome),'bad');
  }
  pl.alerteNiveau=niveau;
  return niveau;
}
/* palier 2 : les 2 dernières rangées deviennent hostiles — dégâts de zone (jamais létaux d'un
   coup, comme les autres champs de dégâts du jeu), habillés par biome mais mécaniquement
   identiques sur les 4 biomes (voir ROADMAP.md). */
function appliquerZoneHostile(pl,niveau){
  if(niveau<2) return;
  const rMin=state.RANGS-ALERTE_ZONE_RANGS;
  for(const f of [...state.fighters]){
    if(f.r<rMin) continue;
    const mort=blesser(f); exploser(f.x,f.y,false); if(mort) tuerFighter(f);
  }
}

/* ===== INTENTIONS VISIBLES (étape 4 de la refonte) =====
   À la Slay the Spire : ce qu'une tourelle s'apprête à faire est toujours visible pendant que le
   joueur décide ses actions, jamais révélé au moment du tir lui-même. */

/* recalcule la cible de chaque tourelle active (distance de Chebyshev, portée tr.portee — un
   carré de (2*portee+1) colonnes/rangées, visualisé en jeu, voir render.js : "zone de contrôle"
   de l'étape 5) à partir des positions APRÈS résolution de ce tour — donc visible dès l'ouverture
   du tour joueur suivant, et c'est cette même cible qui sera utilisée au tir du tour d'après (voir
   finDuTourPlanete, étape 1). Non appelée au démarrage de la mission : la toute première salve
   d'une tourelle n'arrive donc jamais avant le tour 2, le temps que son intention ait été visible
   au moins un tour complet.
   Pivot (étape 5, inspiration échecs) : à portée égale, une tourelle évite de reviser la colonne
   qu'elle vient de viser dès qu'un autre vaisseau menacé existe sur une colonne différente —
   empêche de camper indéfiniment une colonne "morte" pendant qu'un allié isolé encaisse à sa
   place ; si un seul vaisseau est à portée, elle continue logiquement de le viser. */
export function annoncerCiblesTourelles(pl){
  for(const tr of pl.tourelles){
    const derniereColonne=tr.cible?tr.cible.c:null;
    tr.cible=null;
    if(!tr.reveillee||champEn(tr.c)) continue;
    let meilleure=Infinity, meilleureAutreCol=Infinity, cible=null, cibleAutreCol=null;
    for(const f of state.fighters){ const d=Math.max(Math.abs(f.c-tr.c),Math.abs(f.r-tr.r)); if(d>tr.portee) continue;
      if(d<meilleure){ meilleure=d; cible=f; }
      if(f.c!==derniereColonne&&d<meilleureAutreCol){ meilleureAutreCol=d; cibleAutreCol=f; } }
    tr.cible=cibleAutreCol||cible;
  }
}

/* point faible mobile de la base (étape 5, inspiration échecs) : seule la colonne pointFaible
   encaisse les dégâts pleins (voir toucherBase, combat.js) — les autres n'infligent que
   BASE_POINT_FAIBLE_MULT, pour empêcher de camper la première colonne d'approche trouvée. Change
   toutes les BASE_POINT_FAIBLE_INTERVAL tours, toujours visible (surlignage sur la base, voir
   render.js) — pas une attaque, donc pas besoin d'un tour de préavis comme les autres menaces. */
function gererPointFaibleBase(pl){
  const base=pl.base;
  if(pl.tourCompteur%BASE_POINT_FAIBLE_INTERVAL!==0) return;
  const options=[]; for(let c=base.c;c<base.c+base.w;c++) if(c!==base.pointFaible) options.push(c);
  if(!options.length) return;
  base.pointFaible=options[Math.floor(Math.random()*options.length)];
  montrerToast(t('toast_point_faible_deplace'),'gold');
}

/* charge de salve de zone de la base : périodique (intervalle aléatoire, ajusté par la
   difficulté comme la garnison), toujours annoncée 1 tour à l'avance (1-2 colonnes surlignées
   via state.menacesWarn, même mécanisme visuel que les alertes du combat spatial) avant de
   frapper — le joueur peut replier les vaisseaux exposés ou foncer détruire la base avant que
   la charge n'aboutisse (elle est simplement annulée si la base meurt entretemps). */
function gererChargeBase(pl){
  const base=pl.base;
  if(base.chargeCols){
    for(const f of [...state.fighters]){
      if(f.c<base.chargeCols.c0||f.c>base.chargeCols.c1) continue;
      const mort=blesser(f); exploser(f.x,f.y,false); if(mort) tuerFighter(f);
    }
    sonBoom(); montrerToast(t('toast_charge_base_impact'),'bad');
    base.chargeCols=null;
    state.menacesWarn=state.menacesWarn.filter(w=>w.kind!=='baseCharge');
    const d=DIFFICULTES[state.difficulte]||DIFFICULTES.normal;
    base.prochaineCharge=pl.tourCompteur+4+Math.floor(Math.random()*3)+(d.garnisonDelta||0);
    return;
  }
  if(pl.tourCompteur>=base.prochaineCharge){
    const c0=Math.floor(Math.random()*Math.max(1,state.COLS-1));
    const c1=Math.min(state.COLS-1,c0+(Math.random()<0.5?0:1));
    base.chargeCols={c0,c1};
    state.menacesWarn.push({kind:'baseCharge',c0,c1});
    montrerToast(t('toast_charge_base_avert'),'bad');
  }
}

/* ===== FLUX DE MISSION ===== */

/* démarrage d'une mission planète : crée la base et les tourelles sur le biome choisi au
   briefing (voir ouvrirBriefingPlanete, ui.js), repositionne l'escadrille sur les 2 dernières
   rangées (reorganiserVaisseaux, comme secteurSuivant()) et ouvre le premier tour joueur.
   state.enCombat reste volontairement à false pendant toute la mission : le check de victoire
   automatique de combat.js (gagnerCombat) est réservé au combat spatial (ailes.length===0), ce
   qui n'a pas de sens ici (les ailes sont la garnison, produite progressivement, pas une vague
   fixe à épuiser).
   biomeId : imposé par le briefing (choisi avant que le joueur ne voie l'écran) — jamais tiré
   ici, pour que la description du briefing corresponde exactement à la mission qui démarre.
   approche : 'standard' (défaut) ou 'agressive' — choix léger façon FTL fait au briefing :
   l'escadrille gagne une rangée d'avance immédiate, mais la jauge d'alerte démarre déjà proche
   de son premier palier (à 1 tour de l'avertissement, jamais l'activation directe — toujours
   télégraphié, cf. doctrine du jeu). */
export function demarrerMissionPlanete(biomeId,approche){
  const biome=BIOMES.find(b=>b.id===biomeId)||BIOMES[Math.floor(Math.random()*BIOMES.length)];
  const d=DIFFICULTES[state.difficulte]||DIFFICULTES.normal;
  const base=creerBase(state.secteur,state.difficulte); base.reveillee=true;
  base.chargeCols=null; base.prochaineCharge=4+Math.floor(Math.random()*3)+d.garnisonDelta;
  base.pointFaible=base.c+Math.floor(Math.random()*base.w);
  decouvrir('planete_biome',biome.id); decouvrir('planete_base','base');
  state.planete={
    biome:biome.id,
    base,
    tourelles:creerTourelles(biome.id,state.secteur,state.difficulte),
    tourCompteur:0,
    prochaineGarnison:2+Math.floor(Math.random()*2)+d.garnisonDelta,
    alerte:0, alerteNiveau:0, meilleureDistance:state.RANGS,
  };
  state.ailes=[]; state.asteroides=[]; state.bonus=[]; state.boss=null; state.obstacles=[];
  state.trousNoirs=[]; state.champs=[]; state.menacesWarn=[]; state.hangar=null; state.tirsGratuits=0;
  state.killsThisWave=0; state.scoreAvantVague=state.score; state.onObstacleDetruit=null;
  for(const f of state.fighters){ f.capUsed=false; f.provoque=false; f.gele=0; }
  reorganiserVaisseaux();
  if(approche==='agressive'){
    for(const f of state.fighters) f.r=Math.max(0,f.r-1);
    state.planete.alerte=Math.max(0,ALERTE_PALIER1-2);
  }
  state.planete.meilleureDistance=meilleureDistanceActuelle(state.planete);
  appliquerMecaniqueBiome(biome.id);
  setMusicBiome(biome.id);
  annoncerMissionPlanete(biome.id);
  state.suiteDemarrerTour=demarrerTourJoueurPlanete;
  state.suiteFinPlanete=finMissionPlanete;
  demarrerTourJoueurPlanete();
}
/* bannière de début de mission (carte compacte + explosions), même principe que
   annoncerEtape() pour le combat spatial (map.js) mais avec le biome en sous-titre plutôt
   qu'un objectif secondaire — les missions planète n'en ont pas. */
function annoncerMissionPlanete(biomeId){
  ouvrirEtapeBanner(t('etape_planete_titre'), t('biome_'+biomeId+'_nom'), t('mission_secteur')+' '+state.secteur);
  const by=state.HAUTEUR*0.3;
  for(let i=0;i<3;i++) exploser(state.LARGEUR*(0.25+0.25*i),by,true);
  setTimeout(()=>{ for(let i=0;i<2;i++) exploser(state.LARGEUR*(0.38+0.24*i),by+18,true); },160);
}

/* équivalent de demarrerTourJoueur() (combat.js) mais sans les réglages propres au croiseur
   (tirsGratuits/tourelleDouble) ; sauvegarde à chaque tour comme en combat spatial (étape 7). */
export function demarrerTourJoueurPlanete(){
  state.phase='joueur';
  // sabordage (étape 7) : un vaisseau en canal d'assaut reste immobilisé (used=true) le temps
  // du canal, prioritaire sur le dégel habituel — voir finDuTourPlanete, étape 8.
  for(const f of state.fighters){ if(f.sabordage>0) f.used=true; else if(f.gele>0){ f.gele--; f.used=true; } else f.used=false; f.provoque=false; }
  state.actionFaite=false; state.modeTourelle=false; state.modeCapacite=null;
  setMusicPhase('calme'); sauvegarderPartie(serialiserCarte);
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

  // (0) jauge d'alerte : mesurée sur les positions du tour qui vient de s'achever, avant toute
  // résolution ennemie — reflète uniquement la décision du joueur ce tour-ci.
  const niveauAlerte=mettreAJourAlerte(pl);

  // (1) tourelles fixes : tirent sur la cible annoncée à l'ouverture de ce tour joueur (voir
  // annoncerCiblesTourelles, appelée en fin de fonction), jamais une cible recalculée au dernier
  // moment — l'intention affichée pendant que le joueur décidait est exactement ce qui se passe
  // ici. Si la cible est morte ou a été déplacée hors de portée, le tir rate simplement (aucune
  // tourelle ne peut donc jamais surprendre : sa toute première salve n'arrive qu'au tour 2).
  let tirs=false;
  for(const tr of pl.tourelles){
    if(!tr.reveillee||champEn(tr.c)||!tr.cible) continue;
    const cible=tr.cible;
    if(!state.fighters.includes(cible)) continue;
    const d=Math.max(Math.abs(cible.c-tr.c),Math.abs(cible.r-tr.r));
    if(d>tr.portee) continue;
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

  // (3) production de garnison par la base, à intervalle régulier (ajusté par la difficulté) —
  // accélérée dès le palier 1 d'alerte (jamais retardée, seulement rapprochée)
  pl.tourCompteur++;
  if(niveauAlerte>=1) pl.prochaineGarnison=Math.min(pl.prochaineGarnison,pl.tourCompteur+1);
  if(pl.tourCompteur>=pl.prochaineGarnison){
    produireGarnison(pl.base);
    const d=DIFFICULTES[state.difficulte]||DIFFICULTES.normal;
    pl.prochaineGarnison=pl.tourCompteur+Math.max(1,3+Math.floor(Math.random()*2)+d.garnisonDelta);
  }

  // (4) mécaniques de biome : tempête de sable (désert), réveil différé (grotte)
  gererTempeteDesert(pl);
  verifierReveilGrotte(pl);

  // (5) palier 2 d'alerte : zone hostile aux dernières rangées
  appliquerZoneHostile(pl,niveauAlerte);

  // (6) charge de salve de la base : périodique, toujours annoncée 1 tour à l'avance
  gererChargeBase(pl);

  // (7) point faible mobile de la base : périodique, toujours visible (pas une attaque)
  gererPointFaibleBase(pl);

  // (8) sabordage : vaisseaux rapides en canal d'assaut contre la base (étape 7) — annulé sans
  // autre effet si le vaisseau est détruit avant terme (il n'est simplement plus dans
  // state.fighters, rien de plus à faire).
  for(const f of state.fighters){
    if(!f.sabordage) continue;
    f.sabordage--;
    if(f.sabordage<=0){
      const deg=Math.round(pl.base.maxhp*SABORDAGE_DEGATS_RATIO);
      pl.base.hp=Math.max(0,pl.base.hp-deg);
      exploser(f.x,f.y,true); exploser(pl.base.x,pl.base.y,true); sonBoom();
      montrerToast(t('toast_sabordage_impact'),'gold');
    }
  }

  // (9) intentions du tour suivant : calculées maintenant (positions à jour après résolution
  // ennemie), affichées dès l'ouverture du prochain tour joueur (voir render.js).
  annoncerCiblesTourelles(pl);
}

/* fin de mission (victoire = base détruite, échec = escadrille détruite) : réutilise l'écran de
   récap existant (ouvrirMission) et, en cas de victoire, le circuit de récompense du nœud élite
   (choix d'amélioration garanti). En cas d'échec, retour direct à la carte — pas de fin de
   partie, seul le nœud est manqué (voir ROADMAP.md, décision verrouillée). */
export function finMissionPlanete(victoire){
  state.planete=null; state.suiteFinPlanete=null; state.suiteDemarrerTour=null;
  reorganiserVaisseaux();
  setMusicPhase('calme'); setMusicBiome(null);
  const lignes=[];
  if(state.killsThisWave>0) lignes.push({label:t('mission_recap_kills',{n:state.killsThisWave}), points:state.killsThisWave});
  if(victoire){ state.score+=5; lignes.push({label:t('mission_recap_base'), points:5}); state.achievements.base_slayer=true; checkAchievements(); sonVictoirePlanete(); }
  const recap={avant:state.scoreAvantVague, apres:state.score, lignes};
  state.suiteMission = victoire
    ? ()=>{ state.suiteAmelioration=ouvrirCarte; ouvrirAmelioration(); }
    : ouvrirCarte;
  ouvrirMission('planete', victoire, recap);
}
