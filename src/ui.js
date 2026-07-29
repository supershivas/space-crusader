/* =====================================================================
   UI — DOM (modales, infobulle, journal, HUD texte) + entrées
   (souris + clavier)
   ===================================================================== */
import { state, centreCase, saveState, ACHIEVEMENTS_DEF, saveData, effacerSauvegarde, enregistrerStat, statsEquilibrage, sauvegardeExiste } from './state.js';
import { DEG_ASTEROIDE, UPGRADES, SHIPS, SHIP_ROUGE, META, CAPACITES, OBSTACLES, SKINS_CROISEUR, SKINS_VAISSEAUX } from './config.js';
import { fighterEn, aileEn, asterEn, bonusEn, bossEn, trouNoirEn, champEn, occupe,
         estProtege, imgVaisseau, ramasser, obstacleEn, appliquerAmeliorationEffet, rafraichirSkinVaisseaux } from './entities.js';
import { rafraichirSkinCroiseur } from './render.js';
import { initAudio, sonSelect, sonTir, sonUndo, sonPause, sonAchievement, sonRenfort, startMusic, stopMusic, toggleSound } from './audio.js';
import { casesMouvement, casesMouvementCapacite, analyseTir, tirer, tirerTourelle, finirTourelle, toucherBoss,
         ultimePret, declencheUltime, choisirAction, finDuTour, porteeDep, demarrerTourJoueur,
         peutActiverCapacite, activerCapacite, tirerCharge, degLaserActuel, frapperObstacle, declencheMimic, frapperAster } from './combat.js';
import { noeudsAtteignables, posNoeud, entrerNoeud, EVENEMENTS, apresEvenement, NOM_NOEUD, DESC_NOEUD, ICONE, texteObjectif } from './map.js';
import { iconCanvas } from './sprites.js';
import { t, L } from './i18n.js';

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
const carteDiv=document.getElementById('carte'), carteChoixDiv=document.getElementById('carteChoix');
const missionDiv=document.getElementById('mission'), missionTitre=document.getElementById('missionTitre'), missionStats=document.getElementById('missionStats');
const metaDiv=document.getElementById('meta'), metaCristaux=document.getElementById('metaCristaux'), metaCards=document.getElementById('metaCards');
const planeteDiv=document.getElementById('planete'), planeteTitre=document.getElementById('planeteTitre'), planeteCards=document.getElementById('planeteCards');
const resultatDiv=document.getElementById('resultat'), resultatTexte=document.getElementById('resultatTexte');
const majDiv=document.getElementById('maj'), majVersion=document.getElementById('majVersion');

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
  const entry={score:state.score,vague:state.vague,date:new Date().toLocaleDateString('fr-FR')};
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
  for(const u of choix){ const niv=state.ups[u.id]?' · Niv.'+(state.ups[u.id]+1):'';
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
function appliquerAmelioration(id){ state.ups[id]=(state.ups[id]||0)+1; appliquerAmeliorationEffet(id); upgradeDiv.classList.remove('visible'); sonAchievement(); logMsg('⬆ '+t('log_amelioration_acquise'),'log-grn'); const suite=state.suiteAmelioration||demarrerTourJoueur; state.suiteAmelioration=null; suite(); }

function apercuVaisseau(type){
  const src=imgVaisseau(type), box=52;
  const cv=document.createElement('canvas'); cv.width=box; cv.height=box;
  const c=cv.getContext('2d'); c.imageSmoothingEnabled=false;
  const sc=Math.min((box-10)/src.width,(box-10)/src.height), w=src.width*sc, h=src.height*sc;
  c.drawImage(src,(box-w)/2,(box-h)/2,w,h);
  return cv;
}
export function ouvrirBuild(){ state.choixBuild=true; tooltip.classList.remove('visible'); buildCards.innerHTML='';
  const liste=SHIPS.filter(s=>!s.metaRequis||(state.meta[s.metaRequis]||0)>0);
  if(!state.fighters.some(f=>f.type==='rouge')) liste.push(SHIP_ROUGE);   // reconstruire le rouge s'il est détruit
  for(const s of liste){ const b=document.createElement('div'); b.className='card';
    b.appendChild(apercuVaisseau(s.id));
    const d=document.createElement('div'); d.innerHTML='<div class="nom">'+t('ship_'+s.id+'_nom')+'</div><div class="desc">'+t('ship_'+s.id+'_desc')+'</div>'; b.appendChild(d);
    b.onclick=()=>choisirBuild(s.id); buildCards.appendChild(b); }
  buildDiv.classList.add('visible');
}
function choisirBuild(type){ const tours=(type==='normal')?1:2; state.hangar={type,tours}; state.actionFaite=true; state.modeTourelle=false; state.choixBuild=false; buildDiv.classList.remove('visible'); sonRenfort(); logMsg(t('log_hangar')+' '+t('ship_'+type+'_nom'),'log-grn'); }
buildDiv.addEventListener('click',e=>{ if(e.target===buildDiv){ state.choixBuild=false; buildDiv.classList.remove('visible'); } });

export function ouvrirEvenement(){ state.phase='evenement'; tooltip.classList.remove('visible');
  const ev=EVENEMENTS[Math.floor(Math.random()*EVENEMENTS.length)];
  eventTitre.textContent='✦ '+L(ev.titre); eventDesc.textContent=L(ev.desc); eventCards.innerHTML='';
  for(const ch of ev.choix){ const b=document.createElement('div'); b.className='card';
    b.appendChild(divEmo(ch.ico));
    const d=document.createElement('div'); d.innerHTML='<div class="nom">'+L(ch.nom)+'</div><div class="desc">'+L(ch.desc)+'</div>'; b.appendChild(d);
    b.onclick=()=>{ ch.effet(); eventDiv.classList.remove('visible'); apresEvenement(); }; eventCards.appendChild(b); }
  eventDiv.classList.add('visible');
}

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
/* modale de résultat (bouton OK) : utilisée après le choix d'un événement aléatoire, pour que le
   joueur voie clairement ce qui s'est passé avant de revenir à la carte. */
export function ouvrirResultat(texte,suite){
  resultatTexte.textContent=texte; resultatDiv.classList.add('visible');
  const fermer=()=>{ resultatDiv.classList.remove('visible'); resultatDiv.removeEventListener('click',surFond); btnResultatOk.removeEventListener('click',fermer); if(suite) suite(); };
  const surFond=(e)=>{ if(e.target===resultatDiv) fermer(); };
  const btnResultatOk=document.getElementById('btnResultatOk');
  btnResultatOk.addEventListener('click',fermer);
}

/* scène de planète sans combat : décor sur le canvas + choix en haut de l'écran (nom/desc déjà résolus par map.js) */
export function ouvrirScenePlanete(scene){
  state.phase='planete'; state.scenePlanete={kind:scene.kind,titre:scene.titre}; state.selection=null; state.modeTourelle=false; state.modeCapacite=null;
  tooltip.classList.remove('visible');
  planeteTitre.textContent=scene.titre; planeteCards.innerHTML='';
  for(const ch of scene.choix){ const b=document.createElement('div'); b.className='card';
    b.appendChild(divEmo(ch.ico));
    const d=document.createElement('div'); d.innerHTML='<div class="nom">'+ch.nom+'</div><div class="desc">'+ch.desc+'</div>'; b.appendChild(d);
    b.onclick=()=>{
      const suite=scene.suite;
      if(scene.kind==='marche'){
        const resultat=capturerResultat(ch.effet, ch.desc);
        planeteDiv.classList.remove('visible'); state.scenePlanete=null;
        ouvrirResultat(resultat, suite);
      } else {
        ch.effet(); planeteDiv.classList.remove('visible'); state.scenePlanete=null; if(suite) suite();
      }
    };
    planeteCards.appendChild(b); }
  planeteDiv.classList.add('visible');
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
      const row=document.createElement('div'); row.style.display='flex'; row.style.gap='6px';
      liste.forEach((s,i)=>{ const sw=document.createElement('div'); sw.title=s.nom;
        sw.style.width='24px'; sw.style.height='24px'; sw.style.borderRadius='5px'; sw.style.cursor='pointer';
        sw.style.background=s.over.C||s.over.O||'#4a5a86'; sw.style.border=(state.meta[cle]||0)===i?'2px solid #ffd23d':'2px solid #24406e';
        sw.onclick=()=>{ state.meta[cle]=i; saveData(); appliquer(); ouvrirMeta(); };
        row.appendChild(sw); });
      wrap.appendChild(row); skinCards.appendChild(wrap);
    };
    carteSkin(t('skin_croiseur'),SKINS_CROISEUR,'skinCroiseur',rafraichirSkinCroiseur);
    carteSkin(t('skin_vaisseaux'),SKINS_VAISSEAUX,'skinVaisseaux',rafraichirSkinVaisseaux);
  } else cosmBloc.style.display='none';

  metaDiv.classList.add('visible');
}
document.getElementById('btnResetProgression').addEventListener('click',()=>{
  if(!confirm(t('meta_reset_confirm'))) return;
  try{ localStorage.removeItem('dc_meta'); localStorage.removeItem('dc_achievements'); localStorage.removeItem('dc_highscores'); localStorage.removeItem('dc_partie'); localStorage.removeItem('dc_stats'); }catch(e){}
  state.meta={cristaux:0,pvBonus:0,deptAmelio:0,ultimeRapide:0,vaisseauBonus:0,reroll:0,vaisseauMedic:0,cosmetiques:0,skinCroiseur:0,skinVaisseaux:0};
  state.achievements={}; state.highscores=[];
  rafraichirSkinCroiseur(); rafraichirSkinVaisseaux();
  logMsg(t('meta_reset_fait'),'log-red'); ouvrirMeta();
});

export function ouvrirMission(type,reussi){ state.phase='mission'; tooltip.classList.remove('visible');
  missionTitre.textContent = type==='boss'?t('mission_boss_titre'):(type==='elite'?t('mission_elite_titre'):t('mission_normal_titre'));
  const obj = state.objectifVague ? ((reussi?'✅ ':'✗ ')+texteObjectif(state.objectifVague)) : '';
  missionStats.innerHTML = (obj?obj+'<br>':'')+t('mission_secteur')+' '+state.secteur+' · '+t('mission_score')+' '+state.score+'<br>'+t('mission_croiseur')+' '+state.hpCruiser+'/'+state.HP_MAX+' '+t('mission_pv');
  missionDiv.classList.add('visible'); }

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
  document.getElementById('fin').classList.remove('cache');
}

/* Retour à l'écran d'accueil depuis le menu pause. */
export function retourAccueil(){
  state.paused=false; pauseDiv.classList.remove('visible');
  stopMusic(); state.phase='accueil';
  document.getElementById('pauseBtn').style.display='none';
  document.getElementById('fin').classList.add('cache');
  document.getElementById('accueil').classList.remove('cache');
  document.getElementById('btnReprendre').style.display = sauvegardeExiste()?'':'none';
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
    const nomKey=['normal','rouge','rapide','bombardier','bouclier','sniper'].includes(f.type)?'ship_'+f.type+'_nom':'ship_normal_nom';
    const info={nom:t(nomKey), role:t('tt_role_'+f.type)||''};
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

canvas.addEventListener('pointerdown', ev=>{
  initAudio(); if(state.paused) return;
  const {x,y}=coord(ev.clientX,ev.clientY);
  if(state.phase==='carte'){ for(const nd of noeudsAtteignables()){ const p=posNoeud(nd); if(Math.hypot(x-p.x,y-p.y)<28){ tooltip.classList.remove('visible'); entrerNoeud(nd); return; } } return; }
  if(state.phase!=='joueur') return;
  saveState();
  if(ultimePret()&&dansRect(x,y,state.ULT)){ declencheUltime(); return; }
  if(dansRect(x,y,state.BTN)){ finDuTour(); return; }
  for(const a of state.ACT){ if(dansRect(x,y,a)){ a.anim=1; choisirAction(a.id); return; } }
  const cell=caseDe(x,y); if(!cell){ state.selection=null; state.modeTourelle=false; state.modeCapacite=null; return; } const {c,r}=cell;
  if(state.modeTourelle){ if(bossEn(c,r)){ const px=centreCase(c,r).x,py=centreCase(c,r).y; state.lasers.push({x1:state.LARGEUR/2,y1:state.cruiserY+4,x2:px,y2:py,t:0,ennemi:false,gros:true}); state.trails.push({x1:state.LARGEUR/2,y1:state.cruiserY+4,x2:px,y2:py,t:0,ennemi:false,gros:true}); sonTir(); finirTourelle(); setTimeout(()=>toucherBoss(2,px,py),120); } else { const t=aileEn(c,r); if(t){ tirerTourelle(t); } else state.modeTourelle=false; } return; }
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
  if(bossEn(c,r)){ if(an.boss){ const px=centreCase(c,r).x,py=centreCase(c,r).y; state.lasers.push({x1:f.x,y1:f.y-6,x2:px,y2:py,t:0,ennemi:false}); state.trails.push({x1:f.x,y1:f.y-6,x2:px,y2:py,t:0,ennemi:false}); sonTir(); const deg=f.type==='rouge'?2:1; f.used=true; state.selection=null; setTimeout(()=>toucherBoss(deg,px,py),130); } else logMsg(an.jam?t('tt_vaisseau_brouille'):t('tt_tir_bloque_court'),'log-red'); return; }
  const cible=aileEn(c,r); if(cible){ if(an.ailesOk.has(cible)){ tirer(f,cible); } else logMsg(an.jam?t('tt_vaisseau_brouille_champ'):t('tt_tir_bloque'),'log-red'); return; }
  const ob=obstacleEn(c,r); if(ob){ if(an.obstaclesOk.has(ob)){ const tx=centreCase(c,r).x,ty=centreCase(c,r).y; state.lasers.push({x1:f.x,y1:f.y-6,x2:tx,y2:ty,t:0,ennemi:false}); state.trails.push({x1:f.x,y1:f.y-6,x2:tx,y2:ty,t:0,ennemi:false}); sonTir(); f.used=true; state.selection=null; setTimeout(()=>frapperObstacle(ob),130); } else logMsg(t('tt_tir_bloque'),'log-red'); return; }
  const asterCible=asterEn(c,r); if(asterCible){ if(an.asteroidesOk.has(asterCible)){ const tx=centreCase(c,r).x,ty=centreCase(c,r).y; state.lasers.push({x1:f.x,y1:f.y-6,x2:tx,y2:ty,t:0,ennemi:false}); state.trails.push({x1:f.x,y1:f.y-6,x2:tx,y2:ty,t:0,ennemi:false}); sonTir(); f.used=true; state.selection=null; setTimeout(()=>frapperAster(asterCible),130); } else logMsg(t('tt_tir_bloque'),'log-red'); return; }
  const mimicCible=bonusEn(c,r); if(mimicCible&&mimicCible.type==='mimic'){ if(an.mimicsOk&&an.mimicsOk.has(mimicCible)){ const tx=centreCase(c,r).x,ty=centreCase(c,r).y; state.lasers.push({x1:f.x,y1:f.y-6,x2:tx,y2:ty,t:0,ennemi:false}); state.trails.push({x1:f.x,y1:f.y-6,x2:tx,y2:ty,t:0,ennemi:false}); sonTir(); f.used=true; state.selection=null; setTimeout(()=>declencheMimic(mimicCible,null),130); } else logMsg(t('tt_tir_bloque'),'log-red'); return; }
  if(!occupe(c,r)&&!asterEn(c,r)&&!trouNoirEn(c,r)&&casesMouvement(f).some(p=>p.c===c&&p.r===r)){ f.c=c; f.r=r; f.used=true; state.deplacementsJoueurTotal++; const b=bonusEn(c,r); if(b){ if(b.type==='mimic') declencheMimic(b,f); else ramasser(b); } state.selection=null; return; }
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
  state.selection=null; state.modeTourelle=false; sonUndo(); logMsg('↺ '+t('log_annule'),'log-ylw');
}
export function togglePause(){ state.paused=!state.paused; pauseDiv.classList.toggle('visible',state.paused); tooltip.classList.remove('visible'); if(state.paused){ stopMusic(); sonPause(); } else { startMusic(); } }

document.addEventListener('keydown', ev=>{
  if(ev.key==='Escape'){ undo(); ev.preventDefault(); }
  else if(ev.key===' '||ev.key==='Enter'){ if(state.phase==='joueur'&&!state.paused&&!state.choixBuild){ finDuTour(); } ev.preventDefault(); }
  else if(ev.key==='p'||ev.key==='P'){ togglePause(); ev.preventDefault(); }
  else if(ev.key==='1'){ if(state.phase==='joueur'&&!state.choixBuild) choisirAction('vaisseau'); }
  else if(ev.key==='2'){ if(state.phase==='joueur'&&!state.choixBuild) choisirAction('tourelle'); }
  else if(ev.key==='3'){ if(state.phase==='joueur'&&!state.choixBuild) choisirAction('bouclier'); }
  else if(ev.key==='u'||ev.key==='U'){ if(state.phase==='joueur'&&!state.choixBuild&&ultimePret()) declencheUltime(); }
});

document.getElementById('son').addEventListener('click',()=>{ const on=toggleSound(); const slot=document.querySelector('#son .ico-slot'); slot.innerHTML=''; icone(slot,on?'son_on':'son_off',16); });
