/* =====================================================================
   UI — DOM (modales, infobulle, journal, HUD texte) + entrées
   (souris + clavier)
   ===================================================================== */
import { state, centreCase, saveState, ACHIEVEMENTS_DEF, saveData, effacerSauvegarde, enregistrerStat, statsEquilibrage, sauvegardeExiste, estDecouvert, decouvrir } from './state.js';
import { DEG_ASTEROIDE, UPGRADES, SHIPS, SHIP_ROUGE, META, CAPACITES, OBSTACLES, SKINS_CROISEUR, SKINS_VAISSEAUX, RARETE, TOURELLES, HEROS, META_HEROS_MAX, coutMetaHero, BIOMES, forceDefensePlanete } from './config.js';
import { fighterEn, aileEn, asterEn, bonusEn, bossEn, tourelleEn, baseEn, trouNoirEn, champEn, occupe,
         estProtege, imgVaisseau, ramasser, obstacleEn, appliquerAmeliorationEffet, rafraichirSkinVaisseaux, imgAileGuide, getImgMimic,
         imgObstacle, getImgAster, hpAile, vitesseAile, hpVaisseauBase } from './entities.js';
import { rafraichirSkinCroiseur, imgBossGuide, imgBaseGuide, imgTourelleGuide, randomiserAccueil } from './render.js';
import { initAudio, sonSelect, sonTir, sonUndo, sonPause, sonAchievement, sonRenfort, startMusic, stopMusic, toggleSound } from './audio.js';
import { casesMouvement, casesMouvementCapacite, analyseTir, tirer, tirerTourelle, finirTourelle, toucherBoss, toucherBase, frapperTourelle,
         ultimePret, declencheUltime, choisirAction, finDuTour, porteeDep, demarrerTourJoueur,
         peutActiverCapacite, activerCapacite, tirerCharge, degLaserActuel, frapperObstacle, declencheMimic, frapperAster } from './combat.js';
import { finDuTourPlanete, appliquerGlissade, verifierCamouflage, demarrerMissionPlanete } from './planete.js';
import { noeudsAtteignables, posNoeud, entrerNoeud, NOM_NOEUD, DESC_NOEUD, ICONE, texteObjectif } from './map.js';
import { iconCanvas, imgBonusPV, imgBonusTIR, imgBonusVAIS } from './sprites.js';
import { t } from './i18n.js';

/* icône pixel-art (clé de ICONS) suivie d'un libellé texte, pour un conteneur DOM */
function icone(container,ico,px=18){ if(!ico) return; const cv=iconCanvas(ico,px); cv.className='pixel-ico'; container.appendChild(cv); }
/* div .emo contenant une icône pixel-art, pour les cartes de choix (améliorations/événements) */
function divEmo(ico){ const d=document.createElement('div'); d.className='emo'; icone(d,ico||'point',26); return d; }

const canvas=document.getElementById('jeu');
const scene=document.getElementById('scene');
const tooltip=document.getElementById('tooltip'), logDiv=document.getElementById('log');
const pauseDiv=document.getElementById('pause'), achieveDiv=document.getElementById('achieve'), achieveTxt=document.getElementById('achieveTxt');
const upgradeDiv=document.getElementById('upgrade'), upgradeCards=document.getElementById('upgradeCards');
const buildDiv=document.getElementById('build'), buildCards=document.getElementById('buildCards');
const eventDiv=document.getElementById('event'), eventTitre=document.getElementById('eventTitre'), eventDesc=document.getElementById('eventDesc'), eventCards=document.getElementById('eventCards');
const briefingDiv=document.getElementById('planeteBriefing'), briefingBiomeNom=document.getElementById('briefingBiomeNom'),
  briefingMecanique=document.getElementById('briefingMecanique'), briefingForce=document.getElementById('briefingForce'),
  briefingAlerte=document.getElementById('briefingAlerte'), briefingCards=document.getElementById('briefingCards');
const carteDiv=document.getElementById('carte'), carteChoixDiv=document.getElementById('carteChoix');
const missionDiv=document.getElementById('mission'), missionTitre=document.getElementById('missionTitre'), missionObjectif=document.getElementById('missionObjectif'),
  missionRecap=document.getElementById('missionRecap'), missionScoreVal=document.getElementById('missionScoreVal'), missionScoreLigne=document.getElementById('missionScoreLigne'), missionInfos=document.getElementById('missionInfos');
const metaDiv=document.getElementById('meta'), metaCristaux=document.getElementById('metaCristaux'), metaCards=document.getElementById('metaCards');
const resultatDiv=document.getElementById('resultat'), resultatTexte=document.getElementById('resultatTexte');
const majDiv=document.getElementById('maj'), majVersion=document.getElementById('majVersion');
const guideDiv=document.getElementById('guide');
document.getElementById('btnFermerGuideDetail').addEventListener('click',()=>{ document.getElementById('guideDetail').classList.remove('visible'); });

/* =====================================================================
   JOURNAL + ACHIEVEMENTS + HIGHSCORES
   ===================================================================== */
export function logMsg(txt,cls=''){
  const d=document.createElement('div'); d.className='log-entry '+cls; d.textContent=txt;
  logDiv.appendChild(d); if(logDiv.children.length>6) logDiv.removeChild(logDiv.firstChild);
  setTimeout(()=>{ if(d.parentNode) d.parentNode.removeChild(d); }, 5000);
}
/* Toast : notification temporaire, lisible (10px), fond coloré, bordure 3px, 3s. */
const toastZone=document.getElementById('toast');
export function montrerToast(txt,type=''){
  if(!toastZone) return;
  const d=document.createElement('div');
  d.className='toast'+(type?(' t-'+type):''); d.textContent=txt;
  toastZone.appendChild(d);
  requestAnimationFrame(()=>d.classList.add('show'));
  setTimeout(()=>{ d.classList.remove('show'); setTimeout(()=>{ if(d.parentNode) d.parentNode.removeChild(d); },300); }, 3000);
  while(toastZone.children.length>3) toastZone.removeChild(toastZone.firstChild);
}

/* Surmodale de confirmation (remplace les confirm() natifs du navigateur, jamais stylés
   comme le reste du jeu) : affiche `texte`, exécute `onConfirm` seulement si le joueur
   valide. Réutilisable pour toute action destructive (abandon de partie, effacement des
   données…). */
const confirmationDiv=document.getElementById('confirmation'), confirmationTexte=document.getElementById('confirmationTexte');
let confirmationCallback=null;
export function demanderConfirmation(texte,onConfirm){
  confirmationTexte.textContent=texte;
  confirmationCallback=onConfirm;
  confirmationDiv.classList.add('visible');
}
document.getElementById('btnConfirmationConfirmer').addEventListener('click',()=>{
  confirmationDiv.classList.remove('visible');
  const cb=confirmationCallback; confirmationCallback=null;
  if(cb) cb();
});
document.getElementById('btnConfirmationAnnuler').addEventListener('click',()=>{
  confirmationDiv.classList.remove('visible'); confirmationCallback=null;
});

export function checkAchievements(){
  for(const [id,def] of Object.entries(ACHIEVEMENTS_DEF)){
    if(!state.achievements[id] && def.check()){
      state.achievements[id]=true; saveData(); showAchievement(t('ach_'+id+'_nom'), t('ach_'+id+'_desc'));
    }
  }
}
export function showAchievement(title,desc){
  tooltip.classList.remove('visible');
  achieveTxt.innerHTML='<div class="ach-title">'+title+'</div><div>'+desc+'</div>';
  achieveDiv.classList.add('visible'); sonAchievement();
  setTimeout(()=>achieveDiv.classList.remove('visible'), 3000);
}
export function addHighscore(){
  const entry={score:state.score,vague:state.vague,date:new Date().toLocaleDateString(state.langue==='en'?'en-US':'fr-FR')};
  state.highscores.push(entry); state.highscores.sort((a,b)=>b.score-a.score); state.highscores=state.highscores.slice(0,5); saveData();
  const tbl=document.getElementById('highscores');
  tbl.innerHTML='';
  const trHead=document.createElement('tr'); const tdHead=document.createElement('td'); tdHead.colSpan=3; tdHead.style.color='#ffd23d'; tdHead.style.display='flex'; tdHead.style.alignItems='center'; tdHead.style.justifyContent='center';
  icone(tdHead,'trophee',14); tdHead.appendChild(document.createTextNode(' '+t('succes_meilleurs_scores'))); trHead.appendChild(tdHead); tbl.appendChild(trHead);
  tbl.insertAdjacentHTML('beforeend',state.highscores.map((h,i)=>'<tr class="'+(h.score===state.score?'hs-new':'')+'"><td>#'+(i+1)+'</td><td>'+h.score+'</td><td>V'+h.vague+'</td></tr>').join(''));
}

/* =====================================================================
   AMÉLIORATIONS / CONSTRUCTION / ÉVÉNEMENTS / MÉTA (fenêtres modales)
   ===================================================================== */
const btnReroll=document.getElementById('btnReroll'), rerollLabel=document.getElementById('rerollLabel');
function rendreChoixAmelioration(dispo){
  const choix=[...dispo].sort(()=>Math.random()-0.5).slice(0,3);
  upgradeCards.innerHTML='';
  for(const u of choix){ const niv=state.ups[u.id]?t('up_niveau',{n:state.ups[u.id]+1}):'';
    const b=document.createElement('div'); b.className='card';
    b.appendChild(divEmo(u.ico));
    const d=document.createElement('div'); d.innerHTML='<div class="nom">'+t('up_'+u.id+'_nom')+niv+'</div><div class="desc">'+t('up_'+u.id+'_desc')+'</div>'; b.appendChild(d);
    b.onclick=()=>appliquerAmelioration(u.id); upgradeCards.appendChild(b); }
  btnReroll.style.display=(state.rerollsRestants>0)?'':'none';
  rerollLabel.textContent='Reroll ('+(state.rerollsRestants||0)+')';
}
export function ouvrirAmelioration(){
  const dispo=UPGRADES.filter(u=>(state.ups[u.id]||0)<(u.max||9) && (!u.id.startsWith('rouge_')||state.fighters.some(f=>f.type==='rouge')));
  if(dispo.length===0){ const suite=state.suiteAmelioration||demarrerTourJoueur; state.suiteAmelioration=null; suite(); return; }
  state.phase='amelioration'; tooltip.classList.remove('visible');
  rendreChoixAmelioration(dispo);
  upgradeDiv.classList.add('visible');
}
btnReroll.addEventListener('click',()=>{
  if(!(state.rerollsRestants>0)) return;
  const dispo=UPGRADES.filter(u=>(state.ups[u.id]||0)<(u.max||9) && (!u.id.startsWith('rouge_')||state.fighters.some(f=>f.type==='rouge')));
  state.rerollsRestants--; sonSelect(); rendreChoixAmelioration(dispo);
});
function appliquerAmelioration(id){ state.ups[id]=(state.ups[id]||0)+1; appliquerAmeliorationEffet(id); upgradeDiv.classList.remove('visible'); sonAchievement(); montrerToast('⬆ '+t('up_'+id+'_nom'),'ok'); const suite=state.suiteAmelioration||demarrerTourJoueur; state.suiteAmelioration=null; suite(); }

function apercuVaisseau(type){
  const src=imgVaisseau(type), box=52;
  const cv=document.createElement('canvas'); cv.width=box; cv.height=box;
  const c=cv.getContext('2d'); c.imageSmoothingEnabled=false;
  const sc=Math.min((box-10)/src.width,(box-10)/src.height), w=src.width*sc, h=src.height*sc;
  c.drawImage(src,(box-w)/2,(box-h)/2,w,h);
  return cv;
}
// Coût de construction (en tours) par type de vaisseau — varié (1 à 4) selon la puissance/
// l'utilité plutôt qu'un simple "1 tour pour Standard, 2 pour tout le reste" : les vaisseaux
// les plus impactants (zone, soin) coûtent plus cher à faire sortir du hangar.
const TOURS_CONSTRUCTION={normal:1,rapide:2,sniper:2,bombardier:3,bouclier:3,transporteur:3,medic:4,rouge:2};
function toursConstruction(type){ return TOURS_CONSTRUCTION[type]||2; }
export function ouvrirBuild(){ state.choixBuild=true; tooltip.classList.remove('visible'); buildCards.innerHTML='';
  const liste=SHIPS.filter(s=>!s.metaRequis||(state.meta[s.metaRequis]||0)>0);
  if(!state.fighters.some(f=>f.type==='rouge')) liste.push(SHIP_ROUGE);   // reconstruire le rouge s'il est détruit
  for(const s of liste){ const b=document.createElement('div'); b.className='card';
    b.appendChild(apercuVaisseau(s.id));
    const tours=toursConstruction(s.id);
    const d=document.createElement('div'); d.innerHTML='<div class="nom">'+t('ship_'+s.id+'_nom')+'</div><div class="desc">'+t('ship_'+s.id+'_desc')+'</div><div class="card-tours">'+t('build_tours',{n:tours})+'</div>'; b.appendChild(d);
    b.onclick=()=>choisirBuild(s.id); buildCards.appendChild(b); }
  buildDiv.classList.add('visible');
}
function choisirBuild(type){ const tours=toursConstruction(type); state.hangar={type,tours,toursInitial:tours}; state.actionFaite=true; state.modeTourelle=false; state.choixBuild=false; buildDiv.classList.remove('visible'); sonRenfort(); logMsg(t('log_hangar')+' '+t('ship_'+type+'_nom'),'log-grn'); }
buildDiv.addEventListener('click',e=>{ if(e.target===buildDiv){ state.choixBuild=false; buildDiv.classList.remove('visible'); } });

/* =====================================================================
   CHOIX DU HÉROS (Vaisseau Rouge) — écran affiché en début de partie
   ===================================================================== */
const heroChoixDiv=document.getElementById('heroChoix'), heroChoixCards=document.getElementById('heroChoixCards');
let heroChoixCallback=null;
function carteHero(h,onClick){
  const b=document.createElement('div'); b.className='card';
  b.appendChild(divEmo(h.ico));
  const d=document.createElement('div');
  d.innerHTML='<div class="nom">'+t('hero_'+h.id+'_nom')+'</div><div class="desc">'+t('hero_'+h.id+'_desc')+'</div>'+badgeRarete(h.rarete);
  b.appendChild(d);
  b.onclick=onClick;
  return b;
}
/* callback(heroId) appelé après le choix (bouton ou carte) ; le héros choisi est marqué
   découvert dans l'Encyclopédie (même logique que decouvrir('vaisseau',type) pour les autres
   types de vaisseaux — jouer un héros suffit à le révéler, pas besoin d'attendre les
   événements de récupération de la roadmap). */
export function ouvrirChoixHero(callback){
  heroChoixCallback=callback;
  tooltip.classList.remove('visible');
  heroChoixCards.innerHTML='';
  for(const h of HEROS){
    heroChoixCards.appendChild(carteHero(h,()=>{
      decouvrir('heros',h.id); heroChoixDiv.classList.remove('visible'); heroChoixCallback=null; callback(h.id);
    }));
  }
  heroChoixDiv.classList.add('visible');
}
document.getElementById('btnHeroAleatoire').addEventListener('click',()=>{
  if(!heroChoixCallback) return;
  const h=HEROS[Math.floor(Math.random()*HEROS.length)];
  decouvrir('heros',h.id); heroChoixDiv.classList.remove('visible');
  const cb=heroChoixCallback; heroChoixCallback=null; cb(h.id);
});

/* Exécute effet() et récupère le(s) message(s) de journal qu'il a produits pendant son exécution
   (logMsg ajoute une entrée dans #log) : ça donne le résultat RÉEL de l'effet (utile pour les
   effets à issue aléatoire) sans avoir à dupliquer cette logique dans chaque événement.
   S'il n'a rien loggé (effet silencieux et déterministe), on retombe sur le texte du choix. */
function capturerResultat(effet, descFallback){
  const avant=logDiv.children.length;
  effet();
  const nouveaux=[...logDiv.children].slice(avant).map(d=>d.textContent);
  return nouveaux.length ? nouveaux.join(' · ') : descFallback;
}
/* modale affichée une seule fois après une mise à jour (version différente de la dernière
   version vue sur cet appareil) : informe le joueur et affiche le numéro de version.
   Le bouton OK n'est activé qu'après un court délai : ça évite qu'un "clic fantôme" venant
   du tap qui a lancé la partie (fréquent sur mobile, juste après un chargement/rechargement
   de page) ne referme la modale instantanément sans que le joueur ait eu le temps de la lire. */
export function ouvrirMaj(version){
  majVersion.textContent=version; majDiv.classList.add('visible');
  const btn=document.getElementById('btnMajOk');
  btn.disabled=true; btn.style.opacity='.5';
  setTimeout(()=>{
    btn.disabled=false; btn.style.opacity='';
    btn.addEventListener('click',()=>majDiv.classList.remove('visible'),{once:true});
  }, 600);
}
/* bannière de début d'étape (combat / élite / boss) : carte compacte avec un effet de zoom à
   l'apparition, jamais pleine largeur — voir map.js:annoncerEtape() pour les particules qui
   l'accompagnent. Se referme d'elle-même après un court délai. */
let etapeBannerTimeout=null;
export function ouvrirEtapeBanner(titre,sousTitre,secteurTexte){
  const banniere=document.getElementById('etapeBanner');
  const titreEl=document.getElementById('etapeBannerTitre'); titreEl.textContent=titre; ajusterTitreModale(titreEl);
  const sousEl=document.getElementById('etapeBannerSous'); sousEl.textContent=sousTitre||''; sousEl.style.display=sousTitre?'':'none';
  document.getElementById('etapeBannerSecteur').textContent=secteurTexte||'';
  // top:30% fixe (CSS) ne centre la bannière que par hasard : la grille ne commence pas à 30%
  // de la hauteur totale (le cadre HUD au-dessus varie en taille). On centre ici précisément
  // sur la grille elle-même (state.GY → state.GRID_BAS), en % de state.HAUTEUR.
  const centreGrille=(state.GY+state.GRID_BAS)/2;
  banniere.style.top=(centreGrille/state.HAUTEUR*100)+'%';
  banniere.classList.remove('visible');
  void banniere.offsetWidth;   // force un reflow pour rejouer l'animation si une étape s'enchaîne vite
  banniere.classList.add('visible');
  clearTimeout(etapeBannerTimeout);
  etapeBannerTimeout=setTimeout(()=>banniere.classList.remove('visible'),2200);
}
/* modale de résultat (bouton OK) : utilisée après le choix d'un événement aléatoire, pour que le
   joueur voie clairement ce qui s'est passé avant de revenir à la carte. */
export function ouvrirResultat(texte,suite){
  resultatTexte.textContent=texte; resultatDiv.classList.add('visible');
  const fermer=()=>{ resultatDiv.classList.remove('visible'); resultatDiv.removeEventListener('click',surFond); btnResultatOk.removeEventListener('click',fermer); if(suite) suite(); };
  const surFond=(e)=>{ if(e.target===resultatDiv) fermer(); };
  resultatDiv.addEventListener('click',surFond);
  const btnResultatOk=document.getElementById('btnResultatOk');
  btnResultatOk.addEventListener('click',fermer);
}

/* scène de planète sans combat (repos, marché, événement…) : même modale propre que les
   autres écrans de choix (.modal, cf. #upgrade/#build) — avant un bandeau DOM en haut
   d'écran + décor sur le canvas, qui ne suivait pas le design system et laissait le joueur
   chercher l'action sur son escadrille, purement décorative sur cette scène. Le canvas
   derrière reste celui de la carte (state.phase n'est pas changé), comme les autres modales. */
const ICONE_SCENE={station:'cle',tresor:'gemme',hangar:'satellite',forge:'engrenage',marche:'point',heros:'coeur'};
export function ouvrirScenePlanete(scene){
  state.selection=null; state.modeTourelle=false; state.modeCapacite=null;
  tooltip.classList.remove('visible');
  eventTitre.innerHTML=''; icone(eventTitre,ICONE_SCENE[scene.kind]||'alerte',16); eventTitre.appendChild(document.createTextNode(scene.titre));
  eventDesc.style.display='none';
  eventCards.innerHTML='';
  for(const ch of scene.choix){ const b=document.createElement('div'); b.className='card';
    b.appendChild(divEmo(ch.ico));
    const d=document.createElement('div'); d.innerHTML='<div class="nom">'+ch.nom+'</div><div class="desc">'+ch.desc+'</div>'; b.appendChild(d);
    b.onclick=()=>{
      const suite=scene.suite;
      const resultat=capturerResultat(ch.effet, ch.desc);
      eventDiv.classList.remove('visible');
      ouvrirResultat(resultat, suite);
    };
    eventCards.appendChild(b); }
  eventDiv.classList.add('visible');
}

/* briefing de mission planète (étape 3 de la refonte) : affiché avant la bannière d'engagement,
   au moment d'entrer sur le nœud — le biome est tiré ici (pas dans demarrerMissionPlanete) pour
   que le texte affiché corresponde exactement à la mission qui démarrera. Force de défense
   volontairement floue (légère/moyenne/lourde, voir forceDefensePlanete) plutôt qu'un compte
   exact de tourelles, pour garder un peu de brouillard de guerre (cf. ROADMAP.md). Le choix
   d'approche (façon FTL, léger) est géré par demarrerMissionPlanete lui-même. */
export function ouvrirBriefingPlanete(){
  state.selection=null; state.modeTourelle=false; state.modeCapacite=null;
  tooltip.classList.remove('visible');
  const biome=BIOMES[Math.floor(Math.random()*BIOMES.length)];
  const force=forceDefensePlanete(state.secteur,state.difficulte);
  briefingBiomeNom.textContent=t('biome_'+biome.id+'_nom');
  briefingMecanique.textContent=t('biome_'+biome.id+'_desc');
  briefingForce.innerHTML=''; icone(briefingForce,'cible',12); briefingForce.appendChild(document.createTextNode(' '+t('briefing_force_label')+' : '+t('briefing_force_'+force)));
  briefingAlerte.innerHTML=''; icone(briefingAlerte,'alerte',12); briefingAlerte.appendChild(document.createTextNode(' '+t('briefing_alerte_rappel')));
  briefingCards.innerHTML='';
  const approches=[
    {ico:'cle',  nom:t('briefing_approche_standard_nom'),  desc:t('briefing_approche_standard_desc'),  approche:'standard'},
    {ico:'epee', nom:t('briefing_approche_agressive_nom'), desc:t('briefing_approche_agressive_desc'), approche:'agressive'},
  ];
  for(const ap of approches){ const b=document.createElement('div'); b.className='card';
    b.appendChild(divEmo(ap.ico));
    const d=document.createElement('div'); d.innerHTML='<div class="nom">'+ap.nom+'</div><div class="desc">'+ap.desc+'</div>'; b.appendChild(d);
    b.onclick=()=>{ briefingDiv.classList.remove('visible'); demarrerMissionPlanete(biome.id,ap.approche); };
    briefingCards.appendChild(b); }
  briefingDiv.classList.add('visible');
}
export function ouvrirMeta(){ tooltip.classList.remove('visible'); metaCristaux.innerHTML=''; icone(metaCristaux,'gemme',14); metaCristaux.appendChild(document.createTextNode(' '+t('meta_cristaux')+' : '+(state.meta.cristaux||0))); metaCards.innerHTML='';
  for(const m of META){ const lvl=state.meta[m.id]||0, cout=m.cout(lvl), atMax=lvl>=m.max, peut=!atMax&&(state.meta.cristaux||0)>=cout;
    const b=document.createElement('div'); b.className='card';
    const cout_div=document.createElement('div'); cout_div.className='desc'; cout_div.style.color='#ffd23d';
    if(atMax) cout_div.textContent=t('meta_max'); else { icone(cout_div,'gemme',12); cout_div.appendChild(document.createTextNode(' '+cout)); }
    b.innerHTML='<div class="nom">'+t('meta_'+m.id+'_nom')+'</div><div class="desc">'+t('meta_'+m.id+'_desc')+'</div><div class="desc" style="color:#8fd0ff">'+'●'.repeat(lvl)+'○'.repeat(m.max-lvl)+'</div>';
    b.appendChild(cout_div);
    if(peut){ b.onclick=()=>{ state.meta.cristaux-=cout; state.meta[m.id]=lvl+1; saveData(); ouvrirMeta(); }; } else b.style.opacity=atMax?'.6':'.4';
    metaCards.appendChild(b); }

  const cosmBloc=document.getElementById('cosmetiquesBloc'), skinCards=document.getElementById('skinCards');
  if((state.meta.cosmetiques||0)>0){
    cosmBloc.style.display=''; skinCards.innerHTML='';
    const carteSkin=(titre,liste,cle,appliquer)=>{
      const wrap=document.createElement('div'); wrap.style.display='flex'; wrap.style.flexDirection='column'; wrap.style.gap='6px'; wrap.style.alignItems='center';
      const d=document.createElement('div'); d.className='desc'; d.textContent=titre; wrap.appendChild(d);
      const row=document.createElement('div'); row.style.display='flex'; row.style.gap='10px';
      liste.forEach((s,i)=>{ const sw=document.createElement('div'); sw.title=s.nom;
        sw.style.width='40px'; sw.style.height='40px'; sw.style.borderRadius='var(--radius-sm)'; sw.style.cursor='pointer';
        sw.style.background=s.over.C||s.over.O||'#4a5a86'; sw.style.border=(state.meta[cle]||0)===i?'2px solid #ffd23d':'2px solid #24406e';
        sw.onclick=()=>{ state.meta[cle]=i; saveData(); appliquer(); ouvrirMeta(); };
        row.appendChild(sw); });
      wrap.appendChild(row); skinCards.appendChild(wrap);
    };
    carteSkin(t('skin_croiseur'),SKINS_CROISEUR,'skinCroiseur',rafraichirSkinCroiseur);
    carteSkin(t('skin_vaisseaux'),SKINS_VAISSEAUX,'skinVaisseaux',rafraichirSkinVaisseaux);
  } else cosmBloc.style.display='none';

  // Arbre méta par héros (roadmap "Héros du Vaisseau Rouge", lot 6) : un héros débloqué
  // (rencontré/joué au moins une fois) peut être renforcé durablement, comme le reste de META.
  const heroMetaBloc=document.getElementById('heroMetaBloc'), heroMetaCards=document.getElementById('heroMetaCards');
  const herosDebloques=HEROS.filter(h=>estDecouvert('heros',h.id));
  if(herosDebloques.length){
    heroMetaBloc.style.display=''; heroMetaCards.innerHTML='';
    for(const h of herosDebloques){
      const lvl=(state.metaHeros&&state.metaHeros[h.id])||0, cout=coutMetaHero(lvl), atMax=lvl>=META_HEROS_MAX, peut=!atMax&&(state.meta.cristaux||0)>=cout;
      const b=document.createElement('div'); b.className='card';
      b.appendChild(divEmo(h.ico));
      const d=document.createElement('div');
      d.innerHTML='<div class="nom">'+t('hero_'+h.id+'_nom')+'</div><div class="desc">'+t('hero_'+h.id+'_bonus')+'</div>'
        +'<div class="desc" style="color:#8fd0ff">'+'●'.repeat(lvl)+'○'.repeat(META_HEROS_MAX-lvl)+'</div>';
      b.appendChild(d);
      const cout_div=document.createElement('div'); cout_div.className='desc'; cout_div.style.color='#ffd23d';
      if(atMax) cout_div.textContent=t('meta_max'); else { icone(cout_div,'gemme',12); cout_div.appendChild(document.createTextNode(' '+cout)); }
      b.appendChild(cout_div);
      if(peut){ b.onclick=()=>{ state.meta.cristaux-=cout; state.metaHeros[h.id]=lvl+1; saveData(); ouvrirMeta(); }; } else b.style.opacity=atMax?'.6':'.4';
      heroMetaCards.appendChild(b);
    }
  } else heroMetaBloc.style.display='none';

  metaDiv.classList.add('visible');
}
/* ===== ENCYCLOPÉDIE : catalogue des vaisseaux/ennemis/boss/bonus/menaces déjà rencontrés =====
   Chaque entrée non jouable (tout sauf "Vaisseaux alliés") porte un niveau de rareté — le même
   qui pilote réellement certains tirages aléatoires en jeu (voir config.js RARETE / entities.js). */
const GUIDE_ALLIES=['normal','rapide','bombardier','bouclier','sniper','transporteur','medic','rouge'];
const GUIDE_ENNEMIS=['normal','chasseur','bombardier','eclaireur','porteur','brouilleur','lourd','stronghold','mini_navette','regenerateur','mini_sniper','diagonal_d','diagonal_g','void','saboteur','bruleur','titan','transporteur'];
const GUIDE_BOSS=['canon','sniper','rayon','nuee','blinde','feu','electrique','nid','miroir','forge','eclipse'];
const GUIDE_BONUS=['pv','tir','vaisseau','mimic'];
/* menaces : obstacles + astéroïdes + trou noir + champ magnétique — icônes de rappel dédiées
   (imgObstacle/getImgAster) quand elles existent, sinon un pictogramme générique thématique. */
const GUIDE_MENACES=[
  {type:'debris',    nomKey:'obs_debris_nom',    descKey:'obs_debris_desc',    img:()=>imgObstacle({type:'debris',variante:false})},
  {type:'station',   nomKey:'obs_station_nom',   descKey:'obs_station_desc',   img:()=>imgObstacle({type:'station'})},
  {type:'barriere',  nomKey:'obs_barriere_nom',  descKey:'obs_barriere_desc',  img:()=>imgObstacle({type:'barriere'})},
  {type:'mines',     nomKey:'obs_mines_nom',     descKey:'obs_mines_desc',     ico:'alerte'},
  {type:'gaz',       nomKey:'obs_gaz_nom',       descKey:'obs_gaz_desc',       ico:'alerte'},
  {type:'gravite',   nomKey:'obs_gravite_nom',   descKey:'obs_gravite_desc',   ico:'gel'},
  {type:'aster_normal',  nomKey:'ast_default_nom', descKey:'ast_normal_desc',  img:()=>getImgAster()},
  {type:'aster_gros',    nomKey:'ast_gros_nom',    descKey:'ast_gros_desc',    img:()=>getImgAster()},
  {type:'aster_essaim',  nomKey:'ast_essaim_nom',  descKey:'ast_essaim_desc',  img:()=>getImgAster()},
  {type:'aster_diagonal',nomKey:'ast_diagonal_nom',descKey:'ast_diagonal_desc',img:()=>getImgAster()},
  {type:'trounoir',  nomKey:'tt_trounoir_nom',   descKey:'tt_trounoir_desc',   ico:'demon'},
  {type:'champ',     nomKey:'tt_champ_nom',      descKey:'tt_champ_desc',      ico:'aimant'},
];
/* mission planète : tourelles + biomes — icônes de rappel génériques (pas de sprite pour un
   biome, c'est un terrain, pas une entité) */
const GUIDE_TOURELLES=['canon','sniper','lourde'];
const GUIDE_BIOMES=[{type:'desert',ico:'alerte'},{type:'glace',ico:'gel'},{type:'grotte',ico:'demon'},{type:'villes_anciennes',ico:'carte'}];
/* Résumé des entrées d'encyclopédie découvertes (toutes catégories confondues), pour l'écran
   de fin de partie — mêmes listes/images que ouvrirGuide(), sans dupliquer le catalogue.
   Renvoie des descripteurs de carte (img/ico/nomKey/tier), pas juste des noms : l'écran de fin
   affiche les vraies vignettes (non cliquables), pas une liste de texte. */
function decouvertesResume(){
  const cartes=[];
  const imgBonusParType={pv:imgBonusPV,tir:imgBonusTIR,vaisseau:imgBonusVAIS,mimic:getImgMimic()};
  for(const type of GUIDE_ALLIES) if(estDecouvert('vaisseau',type)) cartes.push({img:imgVaisseau(type),nomKey:'ship_'+type+'_nom'});
  for(const type of GUIDE_ENNEMIS) if(estDecouvert('aile',type)) cartes.push({img:imgAileGuide(type),nomKey:'ail_'+type+'_nom',tier:RARETE.aile[type]});
  for(const type of GUIDE_BOSS) if(estDecouvert('boss',type)) cartes.push({img:imgBossGuide(type),nomKey:'boss_'+type+'_nom',tier:RARETE.boss[type]});
  for(const type of GUIDE_BONUS) if(estDecouvert('bonus',type)) cartes.push({img:imgBonusParType[type],nomKey:'bonus_'+type+'_nom',tier:RARETE.bonus[type]});
  for(const m of GUIDE_MENACES) if(estDecouvert('menace',m.type)) cartes.push({img:m.img?m.img():null,ico:m.ico,nomKey:m.nomKey,tier:RARETE.menace[m.type]});
  if(estDecouvert('planete_base','base')) cartes.push({img:imgBaseGuide(),nomKey:'planete_base_guide_nom'});
  for(const type of GUIDE_TOURELLES) if(estDecouvert('planete_tourelle',type)) cartes.push({img:imgTourelleGuide(type),nomKey:'tourelle_'+type+'_nom'});
  for(const b of GUIDE_BIOMES) if(estDecouvert('planete_biome',b.type)) cartes.push({ico:b.ico,nomKey:'biome_'+b.type+'_nom'});
  const total=GUIDE_ALLIES.length+GUIDE_ENNEMIS.length+GUIDE_BOSS.length+GUIDE_BONUS.length+GUIDE_MENACES.length+1+GUIDE_TOURELLES.length+GUIDE_BIOMES.length;
  return {cartes, total};
}
/* Carte d'encyclopédie non cliquable (récap de fin de partie) : même rendu visuel que
   carteGuide() mais sans état verrouillé (toujours découverte) ni interaction — le détail
   complet reste consultable dans l'Encyclopédie elle-même. */
function carteGuideMini(img,ico,nomKey,tier){
  const b=document.createElement('div'); b.className='guide-card guide-card-mini';
  if(img){ const cv=document.createElement('canvas'); cv.width=img.width; cv.height=img.height;
    cv.getContext('2d').drawImage(img,0,0); b.appendChild(cv); }
  else if(ico) icone(b,ico,22);
  const d=document.createElement('div');
  d.innerHTML='<div class="nom">'+t(nomKey)+'</div>'+(tier?badgeRarete(tier):'');
  b.appendChild(d);
  return b;
}
function badgeRarete(tier){
  if(!tier) return '';
  const coul={commun:'#9fb0d8',peu_commun:'#2fd6a0',rare:'#37e0ff',epique:'#ffd23d'}[tier]||'#9fb0d8';
  return '<div class="rarete" style="color:'+coul+';border-color:'+coul+'">'+t('rarete_'+tier)+'</div>';
}
function carteGuide(img,ico,nomKey,descKey,decouvert,tier,onClick){
  const b=document.createElement('div'); b.className='guide-card'+(decouvert?'':' verrouille');
  if(decouvert && img){ const cv=document.createElement('canvas'); cv.width=img.width; cv.height=img.height;
    cv.getContext('2d').drawImage(img,0,0); b.appendChild(cv); }
  else if(decouvert && ico){ icone(b,ico,22); }
  else { icone(b,'point',22); }
  const d=document.createElement('div');
  d.innerHTML='<div class="nom">'+(decouvert?t(nomKey):t('guide_inconnu'))+'</div>'
    +(decouvert&&tier?badgeRarete(tier):'');
  b.appendChild(d);
  if(decouvert) b.onclick=onClick;
  return b;
}
/* modale de détail : description complète + stats, ouverte au clic sur une carte découverte */
function ouvrirGuideDetail(img,ico,nomKey,descKey,tier,stats){
  const zone=document.getElementById('guideDetailZone'); zone.innerHTML='';
  const imgWrap=document.createElement('div'); imgWrap.style.display='flex'; imgWrap.style.justifyContent='center'; imgWrap.style.marginBottom='8px';
  if(img){ const cv=document.createElement('canvas'); cv.width=img.width*1.6; cv.height=img.height*1.6; cv.style.imageRendering='pixelated';
    cv.getContext('2d').drawImage(img,0,0,cv.width,cv.height); imgWrap.appendChild(cv); }
  else if(ico) icone(imgWrap,ico,40);
  zone.appendChild(imgWrap);
  const titre=document.createElement('div'); titre.className='nom'; titre.style.fontSize='11px'; titre.style.marginBottom='6px'; titre.textContent=t(nomKey); zone.appendChild(titre);
  if(tier){ const bd=document.createElement('div'); bd.style.display='flex'; bd.style.justifyContent='center'; bd.style.marginBottom='8px'; bd.innerHTML=badgeRarete(tier); zone.appendChild(bd); }
  const desc=document.createElement('div'); desc.className='desc'; desc.style.marginBottom='10px';
  const loreKey=descKey.replace(/_desc$/,'_lore'), lore=t(loreKey);
  desc.textContent=t(descKey)+(lore!==loreKey?' '+lore:'');
  zone.appendChild(desc);
  if(stats&&stats.length){ const st=document.createElement('div'); st.className='guide-stats';
    st.innerHTML=stats.map(([lbl,val])=>'<div><span>'+lbl+'</span><span>'+val+'</span></div>').join('');
    zone.appendChild(st); }
  document.getElementById('guideDetail').classList.add('visible');
}
export function ouvrirGuide(){
  tooltip.classList.remove('visible');
  const zoneAllies=document.getElementById('guideAllies'); zoneAllies.innerHTML='';
  for(const type of GUIDE_ALLIES){ const dec=estDecouvert('vaisseau',type), img=imgVaisseau(type);
    const nomKey='ship_'+type+'_nom', descKey='ship_'+type+'_desc';
    zoneAllies.appendChild(carteGuide(img,null,nomKey,descKey,dec,null,()=>{
      const cap=CAPACITES[type];
      const stats=[[t('guide_pv'),hpVaisseauBase(type)]]; if(cap) stats.push([t('cap_'+type+'_nom'),t('cap_'+type+'_desc')]);
      ouvrirGuideDetail(img,null,nomKey,descKey,null,stats);
    })); }
  const zoneHeros=document.getElementById('guideHeros'); zoneHeros.innerHTML='';
  for(const h of HEROS){ const dec=estDecouvert('heros',h.id);
    const nomKey='hero_'+h.id+'_nom', descKey='hero_'+h.id+'_desc';
    zoneHeros.appendChild(carteGuide(null,h.ico,nomKey,descKey,dec,h.rarete,()=>{
      const stats=[[t('guide_hero_bonus'),t('hero_'+h.id+'_bonus')]];
      ouvrirGuideDetail(null,h.ico,nomKey,descKey,h.rarete,stats);
    })); }
  const zoneEnnemis=document.getElementById('guideEnnemis'); zoneEnnemis.innerHTML='';
  for(const type of GUIDE_ENNEMIS){ const dec=estDecouvert('aile',type), img=imgAileGuide(type), tier=RARETE.aile[type];
    const nomKey='ail_'+type+'_nom', descKey='ail_'+type+'_desc';
    zoneEnnemis.appendChild(carteGuide(img,null,nomKey,descKey,dec,tier,()=>{
      const v=vitesseAile(type);
      const stats=[[t('guide_pv'),hpAile(type)],[t('guide_vitesse'),v+' '+(v>1?t('guide_cases_tour'):t('guide_case_tour'))]];
      ouvrirGuideDetail(img,null,nomKey,descKey,tier,stats);
    })); }
  const zoneBoss=document.getElementById('guideBoss'); zoneBoss.innerHTML='';
  for(const type of GUIDE_BOSS){ const dec=estDecouvert('boss',type), img=imgBossGuide(type), tier=RARETE.boss[type];
    const nomKey='boss_'+type+'_nom', descKey='boss_'+type+'_desc';
    zoneBoss.appendChild(carteGuide(img,null,nomKey,descKey,dec,tier,()=>ouvrirGuideDetail(img,null,nomKey,descKey,tier,[]))); }
  const zoneBonus=document.getElementById('guideBonus'); zoneBonus.innerHTML='';
  const imgBonusParType={pv:imgBonusPV,tir:imgBonusTIR,vaisseau:imgBonusVAIS,mimic:getImgMimic()};
  for(const type of GUIDE_BONUS){ const dec=estDecouvert('bonus',type), img=imgBonusParType[type], tier=RARETE.bonus[type];
    const nomKey='bonus_'+type+'_nom', descKey='bonus_'+type+'_desc';
    zoneBonus.appendChild(carteGuide(img,null,nomKey,descKey,dec,tier,()=>ouvrirGuideDetail(img,null,nomKey,descKey,tier,[]))); }
  const zoneMenaces=document.getElementById('guideMenaces'); zoneMenaces.innerHTML='';
  for(const m of GUIDE_MENACES){ const dec=estDecouvert('menace',m.type), tier=RARETE.menace[m.type], img=m.img?m.img():null;
    zoneMenaces.appendChild(carteGuide(img,m.ico,m.nomKey,m.descKey,dec,tier,()=>{
      const stats=[]; const ob=OBSTACLES[m.type];
      if(ob) stats.push([t('guide_pv'), ob.destructible?ob.hp:t('guide_indestructible')]);
      if(m.type==='mines') stats.push([t('guide_degats'),2]);
      if(m.type.startsWith('aster')) stats.push([t('guide_pv'), m.type==='aster_gros'?2:1],[t('guide_degats'),DEG_ASTEROIDE]);
      ouvrirGuideDetail(img,m.ico,m.nomKey,m.descKey,tier,stats);
    })); }
  const zonePlanete=document.getElementById('guidePlanete'); zonePlanete.innerHTML='';
  { const dec=estDecouvert('planete_base','base'), nomKey='planete_base_guide_nom', descKey='planete_base_guide_desc', img=imgBaseGuide();
    zonePlanete.appendChild(carteGuide(img,null,nomKey,descKey,dec,null,()=>ouvrirGuideDetail(img,null,nomKey,descKey,null,[]))); }
  for(const type of GUIDE_TOURELLES){ const dec=estDecouvert('planete_tourelle',type), img=imgTourelleGuide(type), modele=TOURELLES.find(m=>m.id===type);
    const nomKey='tourelle_'+type+'_nom', descKey='tourelle_'+type+'_desc';
    zonePlanete.appendChild(carteGuide(img,null,nomKey,descKey,dec,null,()=>{
      const stats=modele?[[t('guide_pv'),modele.hp],[t('guide_portee'),modele.portee],[t('guide_degats'),modele.degats]]:[];
      ouvrirGuideDetail(img,null,nomKey,descKey,null,stats);
    })); }
  for(const b of GUIDE_BIOMES){ const dec=estDecouvert('planete_biome',b.type), nomKey='biome_'+b.type+'_nom', descKey='biome_'+b.type+'_desc';
    zonePlanete.appendChild(carteGuide(null,b.ico,nomKey,descKey,dec,null,()=>ouvrirGuideDetail(null,b.ico,nomKey,descKey,null,[]))); }
  guideDiv.classList.add('visible');
}

document.getElementById('btnResetProgression').addEventListener('click',()=>{
  demanderConfirmation(t('meta_reset_confirm'),()=>{
    try{ localStorage.removeItem('dc_meta'); localStorage.removeItem('dc_meta_heros'); localStorage.removeItem('dc_achievements'); localStorage.removeItem('dc_highscores'); localStorage.removeItem('dc_partie'); localStorage.removeItem('dc_stats'); localStorage.removeItem('dc_decouvertes'); }catch(e){}
    state.meta={cristaux:0,pvBonus:0,deptAmelio:0,ultimeRapide:0,vaisseauBonus:0,reroll:0,vaisseauMedic:0,cosmetiques:0,skinCroiseur:0,skinVaisseaux:0};
    state.metaHeros={};
    state.achievements={}; state.highscores=[]; state.decouvertes={};
    rafraichirSkinCroiseur(); rafraichirSkinVaisseaux();
    document.getElementById('params').classList.remove('visible');
    montrerToast(t('meta_reset_fait'),'bad');
  });
});

/* Rétrécit un titre --fs-display (mission/fin de partie) pour qu'il tienne sur une seule
   ligne, comme ajusterTitreAccueil() dans main.js — même technique (mesure le rendu réel via
   scrollWidth plutôt que deviner une taille), dupliquée ici plutôt qu'importée pour éviter
   une dépendance circulaire ui.js↔main.js. Sans ça, un titre long ("FORTERESSE DÉTRUITE !",
   "ÉLITES ANÉANTIS !") retombe sur 2 lignes et vient chevaucher le texte juste en dessous. */
function ajusterTitreModale(h1){
  if(!h1) return; h1.style.fontSize='';
  const disponible=h1.parentElement.clientWidth-2*16-6;
  if(h1.scrollWidth>disponible && disponible>0){
    const taille=parseFloat(getComputedStyle(h1).fontSize);
    h1.style.fontSize=Math.max(14,Math.floor(taille*disponible/h1.scrollWidth))+'px';
  }
}

/* décompte animé du score (easing ease-out), du total d'avant-étape jusqu'au nouveau total —
   voir ouvrirMission() ci-dessous. Un petit "pop" (échelle) marque l'arrivée sur la valeur finale. */
function animerDecompteScore(el,de,vers,duree=700){
  if(de===vers){ el.textContent=vers; return; }
  const t0=performance.now();
  function etape(now){
    const p=Math.min(1,(now-t0)/duree), ease=1-Math.pow(1-p,3);
    el.textContent=Math.round(de+(vers-de)*ease);
    if(p<1) requestAnimationFrame(etape);
    else { el.textContent=vers; missionScoreLigne.classList.add('pop'); setTimeout(()=>missionScoreLigne.classList.remove('pop'),350); }
  }
  requestAnimationFrame(etape);
}
/* écran de fin d'étape ("ZONE SÉCURISÉE" / élites / boss) : récapitule chaque ligne de bonus
   gagnée ce combat (révélées une à une, effet "wow" cohérent avec la bannière de début
   d'étape), puis décompte le score animé jusqu'au nouveau total. recap = {avant,apres,lignes}
   fourni par gagnerCombat() dans map.js. */
export function ouvrirMission(type,reussi,recap){ state.phase='mission'; tooltip.classList.remove('visible');
  missionTitre.textContent = type==='boss'?t('mission_boss_titre'):type==='elite'?t('mission_elite_titre'):type==='planete'?(reussi?t('mission_planete_titre'):t('mission_planete_echec_titre')):t('mission_normal_titre');
  missionObjectif.textContent = state.objectifVague ? ((reussi?'✅ ':'✗ ')+t('objectif_secondaire')+' : '+texteObjectif(state.objectifVague)) : '';
  missionRecap.innerHTML='';
  const lignes=(recap&&recap.lignes)||[];
  lignes.forEach((l,i)=>{
    const row=document.createElement('div'); row.innerHTML='<span>'+l.label+'</span><span class="recap-plus">+'+l.points+'</span>';
    missionRecap.appendChild(row);
    setTimeout(()=>row.classList.add('visible'), 150+i*140);
  });
  const avant=recap?recap.avant:state.score, apres=recap?recap.apres:state.score;
  missionScoreVal.textContent=avant; missionScoreLigne.classList.remove('pop');
  setTimeout(()=>animerDecompteScore(missionScoreVal,avant,apres), 150+lignes.length*140+150);
  missionInfos.innerHTML = t('mission_secteur')+' '+state.secteur+' · '+t('mission_croiseur')+' '+state.hpCruiser+'/'+state.HP_MAX+' '+t('mission_pv');
  missionDiv.classList.add('visible'); ajusterTitreModale(missionTitre); }

export function finPartie(){
  state.phase='fin'; stopMusic(); effacerSauvegarde();
  enregistrerStat(state.secteur,state.vague,state.score);
  const gagne=Math.floor(state.score/8)+state.vague; state.meta.cristaux=(state.meta.cristaux||0)+gagne; saveData();
  document.getElementById('cristauxGagnes').textContent='💎 +'+gagne+' '+t('fin_cristaux_gagnes')+' (total : '+state.meta.cristaux+')';
  addHighscore();
  document.getElementById('scoreFin').textContent=t('fin_score')+' : '+state.score+'   ·   '+t('fin_vague')+' '+state.vague;
  document.getElementById('pauseBtn').style.display='none';
  // Bilan de la partie
  const fs=document.getElementById('finStats');
  if(fs) fs.innerHTML='📍 '+t('fin_secteur_atteint')+' : '+state.secteur+'&nbsp;·&nbsp;🏆 '+t('fin_boss_vaincus')+' : '+(state.bossVaincus||0)+'<br>⚡ '+t('fin_meilleur_combo')+' : '+(state.bestCombo||0)+'&nbsp;·&nbsp;🎖 '+Object.keys(state.achievements).filter(k=>state.achievements[k]===true).length+' '+t('fin_succes_debloques');
  // Succès débloqués (liste)
  const succ=document.getElementById('finSucces');
  if(succ){
    const noms=Object.keys(ACHIEVEMENTS_DEF).filter(id=>state.achievements[id]).map(id=>t('ach_'+id+'_nom'));
    succ.innerHTML = noms.length ? '🏅 '+noms.join(' · ') : '';
  }
  // Encyclopédie découverte (décompte persistant, toutes parties confondues) : les vraies
  // vignettes (non cliquables — le détail complet reste dans l'Encyclopédie elle-même),
  // avec un compte en en-tête plutôt qu'une liste de noms en texte.
  const dec=document.getElementById('finDecouvertes'); dec.innerHTML='';
  { const r=decouvertesResume();
    if(r.cartes.length){
      const header=document.createElement('div'); header.className='fin-dec-header';
      header.textContent='📖 '+t('fin_encyclopedie')+' '+r.cartes.length+'/'+r.total;
      dec.appendChild(header);
      const wrap=document.createElement('div'); wrap.className='cards';
      for(const c of r.cartes) wrap.appendChild(carteGuideMini(c.img,c.ico,c.nomKey,c.tier));
      dec.appendChild(wrap);
    }
  }
  // Toujours revenir à la 1ère page (résultat + score) : une partie précédente peut avoir laissé
  // l'écran de fin sur sa dernière page consultée.
  document.getElementById('finPage1').classList.remove('cache');
  document.getElementById('finPage2').classList.add('cache');
  document.getElementById('finPage3').classList.add('cache');
  document.getElementById('fin').classList.remove('cache');
  document.getElementById('fin').scrollTop=0;
  ajusterTitreModale(document.querySelector('#fin h1'));
}
// Les 3 pages partagent le même conteneur défilant (#fin, overflow-y:auto) : sans remise à
// zéro explicite, la nouvelle page hérite du défilement laissé par la précédente et peut
// s'afficher entamée au lieu de commencer en haut.
document.getElementById('btnFinSuivant1').addEventListener('click',()=>{
  document.getElementById('finPage1').classList.add('cache');
  document.getElementById('finPage2').classList.remove('cache');
  document.getElementById('fin').scrollTop=0;
});
document.getElementById('btnFinSuivant2').addEventListener('click',()=>{
  document.getElementById('finPage2').classList.add('cache');
  document.getElementById('finPage3').classList.remove('cache');
  document.getElementById('fin').scrollTop=0;
});
document.getElementById('btnFinPrecedent2').addEventListener('click',()=>{
  document.getElementById('finPage2').classList.add('cache');
  document.getElementById('finPage1').classList.remove('cache');
  document.getElementById('fin').scrollTop=0;
});
document.getElementById('btnFinPrecedent3').addEventListener('click',()=>{
  document.getElementById('finPage3').classList.add('cache');
  document.getElementById('finPage2').classList.remove('cache');
  document.getElementById('fin').scrollTop=0;
});

/* Meilleur score déjà réalisé, affiché sur l'accueil (juste sous le titre) pour donner un
   objectif immédiat sans devoir ouvrir les Améliorations. Rien à afficher tant qu'aucune
   partie n'est terminée (state.highscores vide). */
export function majMeilleurScoreAccueil(){
  const el=document.getElementById('homeMeilleurScore'); if(!el) return;
  const meilleur=state.highscores[0];
  if(!meilleur){ el.style.display='none'; return; }
  el.textContent=t('home_meilleur_score',{n:meilleur.score}); el.style.display='';
}

/* Retour à l'écran d'accueil depuis le menu pause. */
export function retourAccueil(){
  state.paused=false; pauseDiv.classList.remove('visible');
  stopMusic(); state.phase='accueil'; randomiserAccueil();
  document.getElementById('pauseBtn').style.display='none';
  document.getElementById('fin').classList.add('cache');
  document.getElementById('accueil').classList.remove('cache');
  document.getElementById('btnReprendre').style.display = sauvegardeExiste()?'':'none';
  majMeilleurScoreAccueil();
}

/* Abandon volontaire depuis le menu pause : ferme la pause puis affiche
   le même écran de bilan (score, succès, cristaux) qu'une vraie défaite,
   avant que le joueur ne retourne à l'accueil via le bouton dédié de #fin. */
export function abandonnerPartie(){
  state.paused=false; pauseDiv.classList.remove('visible');
  finPartie();
}

/* =====================================================================
   INFOBULLE
   ===================================================================== */
function updateTooltip(x,y){
  const cell=caseDe(x,y);
  if(!cell){ tooltip.classList.remove('visible'); return; }
  const {c,r}=cell;
  let html='';
  const a=aileEn(c,r); const f=fighterEn(c,r); const b=bonusEn(c,r); const ast=asterEn(c,r);
  if(a){
    const info={nom:t('ail_'+a.type+'_nom')||t('ail_normal_nom'), role:t('ail_'+a.type+'_desc')||''};
    const deg=a.type==='eclaireur'?0:(a.type==='bombardier'?degLaserActuel()*2:degLaserActuel());
    html='<div class="tt-name">'+info.nom+'</div>';
    html+='<div class="tt-spd" style="color:#cbd6f0">'+info.role+'</div>';
    html+='<div class="tt-hp">'+t('tt_pv')+': '+a.hp+'/'+a.maxhp+'</div>';
    html+='<div class="tt-dmg">'+t('tt_degats')+': '+(deg>0?deg:t('tt_aucun_eperonnage'))+'</div>';
    html+='<div class="tt-spd">'+t('tt_avance')+': '+a.vitesse+' '+(a.vitesse>1?t('tt_cases'):t('tt_case'))+t('tt_par_tour')+'</div>';
    if(a.bouclier) html+='<div class="tt-spd" style="color:#ffd23d">🛡 '+t('tt_bouclier_actif')+'</div>';
    if(estProtege(a)) html+='<div class="tt-spd" style="color:#b06bff">'+t('tt_protege')+'</div>';
  } else if(f){
    // Liste complète des types de vaisseaux alliés existants (voir SHIPS/SHIP_ROUGE dans
    // config.js + 'navette', larguée par le Transporteur) — un type absent de cette liste
    // retombait sur "Standard", un nom trompeur pour Transporteur/Médic/Mini-navette.
    const nomKey=['normal','rouge','rapide','bombardier','bouclier','sniper','transporteur','medic','navette'].includes(f.type)?'ship_'+f.type+'_nom':'ship_normal_nom';
    const info={nom:t(nomKey), role:t('tt_role_'+f.type)};
    html='<div class="tt-name">'+info.nom+'</div>';
    html+='<div class="tt-spd" style="color:#cbd6f0">'+info.role+'</div>';
    html+='<div class="tt-hp">'+t('tt_pv')+': '+f.hp+'</div>';
    html+='<div class="tt-spd">'+t('tt_deplacement')+': '+porteeDep(f)+' '+(porteeDep(f)>1?t('tt_cases'):t('tt_case'))+'</div>';
    { const k=f.kills||0, grade=k>=15?'★ '+t('tt_grade_as'):k>=10?'••• '+t('tt_grade_veteran'):k>=5?'•• '+t('tt_grade_confirme'):k>=1?'• '+t('tt_grade_recrue'):t('tt_grade_bleu'); html+='<div class="tt-spd" style="color:#ffe14d">'+t('tt_grade')+' : '+grade+' ('+t('tt_kills_fmt',{n:k})+')</div>'; }
    const cap=CAPACITES[f.type];
    if(cap) html+='<div class="tt-spd" style="color:#ffd23d">⚡ '+t('cap_'+f.type+'_nom')+' — '+(f.capUsed?'déjà utilisée':t('cap_'+f.type+'_desc')+' (2e appui)')+'</div>';
  } else if(b){
    if(b.type==='mimic'){
      html='<div class="tt-name" style="color:#ff8f92">'+t('bonus_mimic_nom')+'</div>';
      html+='<div class="tt-spd" style="color:#cbd6f0">'+t('bonus_mimic_desc')+'</div>';
    } else {
      const names={'pv':t('bonus_pv_nom'),'tir':t('bonus_tir_nom'),'vaisseau':t('bonus_vaisseau_nom')};
      html='<div class="tt-name">'+(names[b.type]||t('bonus_vaisseau_nom'))+'</div>';
      html+='<div class="tt-spd">'+t('tt_disparait',{n:b.ttl})+'</div>';
    }
  } else if(ast){
    const an=t('ast_'+ast.type+'_nom')||t('ast_default_nom');
    html='<div class="tt-name">'+an+'</div>';
    html+='<div class="tt-spd" style="color:#cbd6f0">'+t('ast_desc')+(ast.type==='gros'?t('ast_desc_trainee'):'')+'</div>';
    if(ast.maxhp>1) html+='<div class="tt-hp">'+t('tt_pv')+': '+ast.hp+'/'+ast.maxhp+'</div>';
    html+='<div class="tt-dmg">'+t('tt_degats')+': '+DEG_ASTEROIDE+'</div>';
  } else if(obstacleEn(c,r)){ const ob=obstacleEn(c,r);
    html='<div class="tt-name">'+t('obs_'+ob.type+'_nom')+'</div><div class="tt-spd" style="color:#cbd6f0">'+t('obs_'+ob.type+'_desc')+'</div>';
    const def=OBSTACLES[ob.type]; if(def.destructible) html+='<div class="tt-hp">'+t('tt_pv')+': '+ob.hp+'/'+(ob.maxhp||def.hp)+'</div>';
  } else if(trouNoirEn(c,r)){ const tn=trouNoirEn(c,r);
    html='<div class="tt-name">'+t('tt_trounoir_nom')+'</div><div class="tt-dmg">'+t('tt_trounoir_desc')+'</div><div class="tt-spd">'+t('tt_trounoir_tours',{n:tn.turns})+'</div>';
  } else if(champEn(c)){
    html='<div class="tt-name">'+t('tt_champ_nom')+'</div><div class="tt-dmg">'+t('tt_champ_desc')+'</div>';
  } else if(bossEn(c,r)){
    html='<div class="tt-name">'+t('tt_boss')+' — '+(state.boss?t('boss_'+state.boss.type+'_nom')+' · '+t('boss_'+state.boss.type+'_desc'):'')+'</div>';
    html+='<div class="tt-hp">'+t('tt_pv')+': '+(state.boss?state.boss.hp+'/'+state.boss.maxhp:'?')+'</div>';
  }
  if(html){ tooltip.innerHTML=html; tooltip.classList.add('visible'); }
  else tooltip.classList.remove('visible');
}
/* infobulle de la carte des secteurs : type + description au survol d'une planète */
function tooltipCarte(x,y){
  if(!state.carte){ tooltip.classList.remove('visible'); return; }
  const atteign=noeudsAtteignables();
  let trouve=null;
  for(const lvl of state.carte) for(const nd of lvl){ const p=posNoeud(nd); const R=nd.type==='boss'?18:14; if(Math.hypot(x-p.x,y-p.y)<=R+10){ trouve=nd; break; } }
  if(!trouve){ tooltip.classList.remove('visible'); return; }
  const reach=atteign.includes(trouve), cur=trouve===state.noeudActuel;
  tooltip.innerHTML='';
  const nameDiv=document.createElement('div'); nameDiv.className='tt-name';
  icone(nameDiv,ICONE[trouve.type],14); nameDiv.appendChild(document.createTextNode(' '+(NOM_NOEUD[trouve.type]||trouve.type)));
  tooltip.appendChild(nameDiv);
  let html='<div class="tt-spd">'+(DESC_NOEUD[trouve.type]||'')+'</div>';
  html+='<div class="tt-'+(cur?'grn':(reach?'dmg':'hp'))+'" style="color:'+(cur?'#8fa0c8':(reach?'#ffd23d':'#e5484d'))+'">'+(cur?t('carte_position_actuelle'):(reach?t('carte_accessible'):t('carte_hors_portee')))+'</div>';
  tooltip.insertAdjacentHTML('beforeend',html); tooltip.classList.add('visible');
}
function tooltipBouton(a){
  let html='';
  if(a.id==='vaisseau'){ html='<div class="tt-name">'+t('tt_vaisseau_generer_nom')+'</div>';
    if(state.fighters.length>=state.MAX_VAISSEAUX) html+='<div class="tt-hp">'+t('tt_vaisseau_max',{n:state.MAX_VAISSEAUX})+'</div>';
    else if(state.hangar) html+='<div class="tt-hp">'+t('tt_vaisseau_prep')+'</div>';
    else html+='<div class="tt-spd">'+t('tt_vaisseau_hangar',{a:state.fighters.length,b:state.MAX_VAISSEAUX})+'</div>'; }
  else if(a.id==='tourelle'){ html='<div class="tt-name">'+t('tt_tourelle_nom')+'</div><div class="tt-dmg">'+t('tt_tourelle_desc')+'</div>'; }
  else { html='<div class="tt-name">'+t('tt_bouclier_nom')+'</div><div class="tt-grn" style="color:#2fd6a0">'+t('tt_bouclier_gain',{n:state.RECHARGE})+'</div><div class="tt-spd">'+(state.boucliersRestants>0?t(state.boucliersRestants>1?'tt_bouclier_restants':'tt_bouclier_restant',{n:state.boucliersRestants}):t('tt_bouclier_epuise'))+'</div>'; }
  tooltip.innerHTML=html; tooltip.classList.add('visible');
}

/* =====================================================================
   ENTRÉES (souris + clavier)
   ===================================================================== */
function coord(cx,cy){ const b=canvas.getBoundingClientRect(); return {x:(cx-b.left)*(state.LARGEUR/b.width), y:(cy-b.top)*(state.HAUTEUR/b.height)}; }
function caseDe(x,y){ if(x<state.GX||x>=state.GX+state.COLS*state.CELL||y<state.GY||y>=state.GY+state.RANGS*state.CELL) return null; return {c:Math.floor((x-state.GX)/state.CELL), r:Math.floor((y-state.GY)/state.CELL)}; }
function dansRect(x,y,R){ return x>=R.x&&x<=R.x+R.w&&y>=R.y&&y<=R.y+R.h; }

/* positionne l'infobulle près du curseur/doigt SANS jamais déborder de l'écran
   (bascule à gauche/au-dessus quand elle déborderait à droite/en bas — utile
   sur mobile où le doigt touche souvent près d'un bord). */
function positionnerTooltip(clientX,clientY){
  const rect=scene.getBoundingClientRect();
  const tw=tooltip.offsetWidth, th=tooltip.offsetHeight;
  let left=clientX-rect.left+14, top=clientY-rect.top+14;
  if(left+tw>rect.width) left=clientX-rect.left-tw-14;
  if(top+th>rect.height) top=clientY-rect.top-th-14;
  left=Math.max(4,Math.min(left,rect.width-tw-4)); top=Math.max(4,Math.min(top,rect.height-th-4));
  tooltip.style.left=left+'px'; tooltip.style.top=top+'px';
}
canvas.addEventListener('pointermove', ev=>{
  if(state.paused) return;
  const {x,y}=coord(ev.clientX,ev.clientY);
  if(state.phase==='carte'){ tooltipCarte(x,y); state.hoverCell=null; positionnerTooltip(ev.clientX,ev.clientY); return; }
  if(state.phase!=='joueur'){ tooltip.classList.remove('visible'); state.hoverCell=null; return; }
  const btn=state.ACT.find(a=>dansRect(x,y,a));
  if(btn && state.phase==='joueur'){ tooltipBouton(btn); state.hoverCell=null; positionnerTooltip(ev.clientX,ev.clientY); return; }
  updateTooltip(x,y);
  positionnerTooltip(ev.clientX,ev.clientY);
  const cell=caseDe(x,y); state.hoverCell=cell; state.hoverTime=performance.now();
});
/* Sur tactile, il n'y a pas de "pointermove" continu après avoir relâché le doigt (contrairement
   à la souris) : sans ça, l'infobulle affichée au dernier point de contact restait affichée à
   l'écran indéfiniment, jusqu'au prochain survol. On la cache donc explicitement dès que le
   doigt/curseur quitte le canvas ou se relève. */
canvas.addEventListener('pointerup', ()=>{ tooltip.classList.remove('visible'); state.hoverCell=null; });
canvas.addEventListener('pointercancel', ()=>{ tooltip.classList.remove('visible'); state.hoverCell=null; });
canvas.addEventListener('pointerleave', ()=>{ tooltip.classList.remove('visible'); state.hoverCell=null; });

/* Diagnostique pourquoi un tir sur la case (c) a échoué, pour un message clair au lieu du
   générique "Tir bloqué / hors d'atteinte" d'avant (qui confondait plusieurs causes très
   différentes) : colonne hors de la portée latérale (au-delà de ±p), cible protégée par
   l'aura d'un brouilleur à proximité (estProtege — n'a rien à voir avec un obstacle sur la
   trajectoire), tir intercepté par un de nos propres vaisseaux plus proche dans la même
   colonne, ou enfin bloqué par un obstacle/une menace (cas générique restant). */
function raisonTirBloque(an,c,cible){
  if(an.jam) return t('tt_vaisseau_brouille_champ');
  const beam=an.beams.find(b=>b.c===c);
  if(!beam) return t('tt_hors_de_portee');
  if(cible && estProtege(cible)) return t('tt_cible_protegee');
  if(cible && OBSTACLES[cible.type] && !OBSTACLES[cible.type].destructible) return t('tt_obstacle_indestructible');
  if(beam.kind==='allie') return t('tt_bloque_par_allie');
  return t('tt_tir_bloque');
}

canvas.addEventListener('pointerdown', ev=>{
  initAudio(); if(state.paused) return;
  const {x,y}=coord(ev.clientX,ev.clientY);
  if(state.phase==='carte'){ for(const nd of noeudsAtteignables()){ const p=posNoeud(nd); if(Math.hypot(x-p.x,y-p.y)<28){ tooltip.classList.remove('visible'); entrerNoeud(nd); return; } } return; }
  if(state.phase!=='joueur') return;
  saveState();
  if(ultimePret()&&dansRect(x,y,state.ULT)){ declencheUltime(); return; }
  if(dansRect(x,y,state.BTN)){ if(state.planete) finDuTourPlanete(); else finDuTour(); return; }
  for(const a of state.ACT){ if(dansRect(x,y,a)){ a.anim=1; choisirAction(a.id); return; } }
  const cell=caseDe(x,y); if(!cell){ state.selection=null; state.modeTourelle=false; state.modeCapacite=null; return; } const {c,r}=cell;
  if(state.modeTourelle){ if(bossEn(c,r)){ const px=centreCase(c,r).x,py=centreCase(c,r).y; state.lasers.push({x1:state.LARGEUR/2,y1:state.cruiserY+4,x2:px,y2:py,t:0,ennemi:false,gros:true}); state.trails.push({x1:state.LARGEUR/2,y1:state.cruiserY+4,x2:px,y2:py,t:0,ennemi:false,gros:true}); sonTir(); finirTourelle(); const gen=state.actionGen; setTimeout(()=>{ if(state.actionGen===gen) toucherBoss(2,px,py); },120); } else { const t=aileEn(c,r); if(t){ tirerTourelle(t); } else state.modeTourelle=false; } return; }
  if(state.modeCapacite){
    const {ship,kind}=state.modeCapacite;
    if(kind==='bond'){
      if(!occupe(c,r)&&!asterEn(c,r)&&!trouNoirEn(c,r)&&casesMouvementCapacite(ship).some(p=>p.c===c&&p.r===r)){
        ship.c=c; ship.r=r; ship.capUsed=true; state.modeCapacite=null; state.deplacementsJoueurTotal++; sonTir(); logMsg(t('log_bond'),'log-ylw');
        const b=bonusEn(c,r); if(b){ if(b.type==='mimic') declencheMimic(b,ship); else ramasser(b); }
      } else { state.modeCapacite=null; state.selection=null; }
    } else if(kind==='charge'){
      const cible=aileEn(c,r); const an=analyseTir(ship);
      if(cible && an.ailesOk.has(cible)){ tirerCharge(ship,cible); }
      else { state.modeCapacite=null; state.selection=null; logMsg(t('log_tir_charge_annule'),'log-ylw'); }
    }
    return;
  }
  if(!state.selection){ const f=fighterEn(c,r); if(f&&!f.used){ state.selection=f; sonSelect(); } return; }
  const f=state.selection;
  if(f.c===c&&f.r===r){ if(activerCapacite(f)) return; state.selection=null; return; }
  const autre=fighterEn(c,r); if(autre&&!autre.used){ state.selection=autre; sonSelect(); return; }
  const an=analyseTir(f);
  if(bossEn(c,r)){ if(an.boss){ const px=centreCase(c,r).x,py=centreCase(c,r).y; state.lasers.push({x1:f.x,y1:f.y-6,x2:px,y2:py,t:0,ennemi:false}); state.trails.push({x1:f.x,y1:f.y-6,x2:px,y2:py,t:0,ennemi:false}); sonTir(); const deg=f.type==='rouge'?2:1; f.used=true; state.selection=null; const gen=state.actionGen; setTimeout(()=>{ if(state.actionGen===gen) toucherBoss(deg,px,py); },130); } else montrerToast(an.jam?t('tt_vaisseau_brouille'):t('tt_tir_bloque_court'),'bad'); return; }
  if(state.planete && baseEn(c,r)){ if(an.base){ const px=centreCase(c,r).x,py=centreCase(c,r).y; state.lasers.push({x1:f.x,y1:f.y-6,x2:px,y2:py,t:0,ennemi:false}); state.trails.push({x1:f.x,y1:f.y-6,x2:px,y2:py,t:0,ennemi:false}); sonTir(); const deg=f.type==='rouge'?2:1; f.used=true; state.selection=null; const gen=state.actionGen; setTimeout(()=>{ if(state.actionGen===gen) toucherBase(deg,px,py,c); },130); } else montrerToast(an.jam?t('tt_vaisseau_brouille'):t('tt_tir_bloque_court'),'bad'); return; }
  if(state.planete){ const tourCible=tourelleEn(c,r); if(tourCible){ if(an.tourellesOk.has(tourCible)){ const tx=centreCase(c,r).x,ty=centreCase(c,r).y; state.lasers.push({x1:f.x,y1:f.y-6,x2:tx,y2:ty,t:0,ennemi:false}); state.trails.push({x1:f.x,y1:f.y-6,x2:tx,y2:ty,t:0,ennemi:false}); sonTir(); f.used=true; state.selection=null; setTimeout(()=>frapperTourelle(tourCible),130); } else montrerToast(raisonTirBloque(an,c),'bad'); return; } }
  const cible=aileEn(c,r); if(cible){ if(an.ailesOk.has(cible)){ tirer(f,cible); } else montrerToast(raisonTirBloque(an,c,cible),'bad'); return; }
  const ob=obstacleEn(c,r); if(ob){ if(an.obstaclesOk.has(ob)){ const tx=centreCase(c,r).x,ty=centreCase(c,r).y; state.lasers.push({x1:f.x,y1:f.y-6,x2:tx,y2:ty,t:0,ennemi:false}); state.trails.push({x1:f.x,y1:f.y-6,x2:tx,y2:ty,t:0,ennemi:false}); sonTir(); f.used=true; state.selection=null; setTimeout(()=>frapperObstacle(ob),130); } else montrerToast(raisonTirBloque(an,c,ob),'bad'); return; }
  const asterCible=asterEn(c,r); if(asterCible){ if(an.asteroidesOk.has(asterCible)){ const tx=centreCase(c,r).x,ty=centreCase(c,r).y; state.lasers.push({x1:f.x,y1:f.y-6,x2:tx,y2:ty,t:0,ennemi:false}); state.trails.push({x1:f.x,y1:f.y-6,x2:tx,y2:ty,t:0,ennemi:false}); sonTir(); f.used=true; state.selection=null; setTimeout(()=>frapperAster(asterCible),130); } else montrerToast(raisonTirBloque(an,c),'bad'); return; }
  const mimicCible=bonusEn(c,r); if(mimicCible&&mimicCible.type==='mimic'){ if(an.mimicsOk&&an.mimicsOk.has(mimicCible)){ const tx=centreCase(c,r).x,ty=centreCase(c,r).y; state.lasers.push({x1:f.x,y1:f.y-6,x2:tx,y2:ty,t:0,ennemi:false}); state.trails.push({x1:f.x,y1:f.y-6,x2:tx,y2:ty,t:0,ennemi:false}); sonTir(); f.used=true; state.selection=null; setTimeout(()=>declencheMimic(mimicCible,null),130); } else montrerToast(raisonTirBloque(an,c),'bad'); return; }
  if(!occupe(c,r)&&!asterEn(c,r)&&!trouNoirEn(c,r)&&casesMouvement(f).some(p=>p.c===c&&p.r===r)){
    const dc=Math.sign(c-f.c), dr=Math.sign(r-f.r);
    f.c=c; f.r=r; f.used=true; state.deplacementsJoueurTotal++;
    if(state.planete) appliquerGlissade(f,dc,dr);   // biome Glace : glisse d'une case de plus si la case d'arrivée est du verglas
    if(state.planete) verifierCamouflage();          // biome Villes anciennes : révèle une tourelle camouflée si approchée
    const b=bonusEn(c,r); if(b){ if(b.type==='mimic') declencheMimic(b,f); else ramasser(b); } state.selection=null; return;
  }
  state.selection=null;
});

/* Clavier */
export function undo(){
  if(state.undoStack.length===0||state.phase!=='joueur') return;
  const s=state.undoStack.pop();
  state.fighters=s.fighters; state.ailes=s.ailes; state.asteroides=s.asteroides; state.bonus=s.bonus; state.boss=s.boss;
  state.trousNoirs=s.trousNoirs||[]; state.champs=s.champs||[]; state.menacesWarn=s.menacesWarn||[]; state.obstacles=s.obstacles||[]; state.bossVaincus=s.bossVaincus||0;
  state.killsThisWave=s.killsThisWave||0; state.shipsLostThisWave=s.shipsLostThisWave||0; state.bossKilledThisWave=s.bossKilledThisWave||false; state.ultimeJauge=s.ultimeJauge||0;
  state.hpCruiser=s.hpCruiser; state.score=s.score; state.vague=s.vague; state.actionFaite=s.actionFaite; state.tirsGratuits=s.tirsGratuits; state.hangar=s.hangar;
  state.tourCompteur=s.tourCompteur; state.prochainAsteroide=s.prochainAsteroide; state.prochainBoss=s.prochainBoss;
  state.selection=null; state.modeTourelle=false; state.actionGen++; sonUndo(); logMsg('↺ '+t('log_annule'),'log-ylw');
}
export function togglePause(){ state.paused=!state.paused; pauseDiv.classList.toggle('visible',state.paused); tooltip.classList.remove('visible');
  // La pause reste sous les modales (voir le commentaire CSS sur #pause) : une modale de choix
  // déjà ouverte (construction d'un vaisseau) la masquerait sinon complètement. On la ferme
  // donc à l'entrée en pause plutôt que de la laisser flotter au-dessus, invisible mais active.
  if(state.paused && state.choixBuild){ state.choixBuild=false; buildDiv.classList.remove('visible'); }
  if(state.paused){ stopMusic(); sonPause(); } else { startMusic(); } }

document.addEventListener('keydown', ev=>{
  if(ev.key==='Escape'){ undo(); ev.preventDefault(); }
  else if(ev.key===' '||ev.key==='Enter'){ if(state.phase==='joueur'&&!state.paused&&!state.choixBuild){ if(state.planete) finDuTourPlanete(); else finDuTour(); } ev.preventDefault(); }
  else if(ev.key==='p'||ev.key==='P'){ togglePause(); ev.preventDefault(); }
  else if(ev.key==='1'){ if(state.phase==='joueur'&&!state.choixBuild) choisirAction('vaisseau'); }
  else if(ev.key==='2'){ if(state.phase==='joueur'&&!state.choixBuild) choisirAction('tourelle'); }
  else if(ev.key==='3'){ if(state.phase==='joueur'&&!state.choixBuild) choisirAction('bouclier'); }
  else if(ev.key==='u'||ev.key==='U'){ if(state.phase==='joueur'&&!state.choixBuild&&ultimePret()) declencheUltime(); }
  else if(ev.key==='g'||ev.key==='G'){ ouvrirGuide(); ev.preventDefault(); }
});

document.getElementById('son').addEventListener('click',()=>{ const on=toggleSound(); const slot=document.querySelector('#son .ico-slot'); slot.innerHTML=''; icone(slot,on?'son_on':'son_off',16); });
