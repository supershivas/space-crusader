/* =====================================================================
   UI — DOM (modales, infobulle, journal, HUD texte) + entrées
   (souris + clavier)
   ===================================================================== */
import { state, centreCase, saveState, ACHIEVEMENTS_DEF, saveData, effacerSauvegarde, enregistrerStat, statsEquilibrage } from './state.js';
import { DEG_ASTEROIDE, UPGRADES, SHIPS, SHIP_ROUGE, META, CAPACITES, OBSTACLES } from './config.js';
import { fighterEn, aileEn, asterEn, bonusEn, bossEn, trouNoirEn, champEn, occupe,
         estProtege, imgVaisseau, ramasser, obstacleEn } from './entities.js';
import { initAudio, sonSelect, sonTir, sonUndo, sonPause, sonAchievement, sonRenfort, startMusic, stopMusic, toggleSound } from './audio.js';
import { casesMouvement, casesMouvementCapacite, analyseTir, tirer, tirerTourelle, finirTourelle, toucherBoss,
         ultimePret, declencheUltime, choisirAction, finDuTour, porteeDep, demarrerTourJoueur,
         peutActiverCapacite, activerCapacite, tirerCharge, degLaserActuel, frapperObstacle, declencheMimic } from './combat.js';
import { noeudsAtteignables, posNoeud, entrerNoeud, EVENEMENTS, apresEvenement, NOM_NOEUD, DESC_NOEUD, ICONE } from './map.js';

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

/* =====================================================================
   JOURNAL + ACHIEVEMENTS + HIGHSCORES
   ===================================================================== */
export function logMsg(txt,cls=''){
  const d=document.createElement('div'); d.className='log-entry '+cls; d.textContent=txt;
  logDiv.appendChild(d); if(logDiv.children.length>6) logDiv.removeChild(logDiv.firstChild);
  setTimeout(()=>{ if(d.parentNode) d.parentNode.removeChild(d); }, 5000);
}
export function checkAchievements(){
  for(const [id,def] of Object.entries(ACHIEVEMENTS_DEF)){
    if(!state.achievements[id] && def.check()){
      state.achievements[id]=true; saveData(); showAchievement(def.name, def.desc);
    }
  }
}
export function showAchievement(title,desc){
  achieveTxt.innerHTML='<div class="ach-title">🏆 '+title+'</div><div>'+desc+'</div>';
  achieveDiv.classList.add('visible'); sonAchievement();
  setTimeout(()=>achieveDiv.classList.remove('visible'), 3000);
}
export function addHighscore(){
  const entry={score:state.score,vague:state.vague,date:new Date().toLocaleDateString('fr-FR')};
  state.highscores.push(entry); state.highscores.sort((a,b)=>b.score-a.score); state.highscores=state.highscores.slice(0,5); saveData();
  const tbl=document.getElementById('highscores');
  tbl.innerHTML='<tr><td colspan="3" style="color:#ffd23d">🏆 MEILLEURS SCORES</td></tr>'+state.highscores.map((h,i)=>'<tr class="'+(h.score===state.score?'hs-new':'')+'"><td>#'+(i+1)+'</td><td>'+h.score+'</td><td>V'+h.vague+'</td></tr>').join('');
}

/* =====================================================================
   AMÉLIORATIONS / CONSTRUCTION / ÉVÉNEMENTS / MÉTA (fenêtres modales)
   ===================================================================== */
export function ouvrirAmelioration(){
  const dispo=UPGRADES.filter(u=>(state.ups[u.id]||0)<(u.max||9));
  if(dispo.length===0){ const suite=state.suiteAmelioration||demarrerTourJoueur; state.suiteAmelioration=null; suite(); return; }
  state.phase='amelioration';
  const choix=[...dispo].sort(()=>Math.random()-0.5).slice(0,3);
  upgradeCards.innerHTML='';
  for(const u of choix){ const niv=state.ups[u.id]?' · Niv.'+(state.ups[u.id]+1):'';
    const b=document.createElement('div'); b.className='card';
    b.innerHTML='<div class="emo">'+u.emo+'</div><div class="nom">'+u.nom+niv+'</div><div class="desc">'+u.desc+'</div>';
    b.onclick=()=>appliquerAmelioration(u.id); upgradeCards.appendChild(b); }
  upgradeDiv.classList.add('visible');
}
function appliquerAmelioration(id){ state.ups[id]=(state.ups[id]||0)+1; upgradeDiv.classList.remove('visible'); sonAchievement(); logMsg('⬆ Amélioration acquise','log-grn'); const suite=state.suiteAmelioration||demarrerTourJoueur; state.suiteAmelioration=null; suite(); }

function apercuVaisseau(type){
  const src=imgVaisseau(type), box=52;
  const cv=document.createElement('canvas'); cv.width=box; cv.height=box;
  const c=cv.getContext('2d'); c.imageSmoothingEnabled=false;
  const sc=Math.min((box-10)/src.width,(box-10)/src.height), w=src.width*sc, h=src.height*sc;
  c.drawImage(src,(box-w)/2,(box-h)/2,w,h);
  return cv;
}
export function ouvrirBuild(){ state.choixBuild=true; buildCards.innerHTML='';
  const liste=[...SHIPS]; if(!state.fighters.some(f=>f.type==='rouge')) liste.push(SHIP_ROUGE);   // reconstruire le rouge s'il est détruit
  for(const s of liste){ const b=document.createElement('div'); b.className='card';
    b.appendChild(apercuVaisseau(s.id));
    const t=document.createElement('div'); t.innerHTML='<div class="nom">'+s.nom+'</div><div class="desc">'+s.desc+'</div>'; b.appendChild(t);
    b.onclick=()=>choisirBuild(s.id); buildCards.appendChild(b); }
  buildDiv.classList.add('visible');
}
function choisirBuild(type){ const tours=(type==='normal')?1:2; state.hangar={type,tours}; state.actionFaite=true; state.modeTourelle=false; state.choixBuild=false; buildDiv.classList.remove('visible'); sonRenfort(); logMsg('Hangar : '+type,'log-grn'); }
buildDiv.addEventListener('click',e=>{ if(e.target===buildDiv){ state.choixBuild=false; buildDiv.classList.remove('visible'); } });

export function ouvrirEvenement(){ state.phase='evenement';
  const ev=EVENEMENTS[Math.floor(Math.random()*EVENEMENTS.length)];
  eventTitre.textContent='✦ '+ev.titre; eventDesc.textContent=ev.desc; eventCards.innerHTML='';
  for(const ch of ev.choix){ const b=document.createElement('div'); b.className='card';
    b.innerHTML='<div class="emo">'+(ch.emo||'▸')+'</div><div class="nom">'+ch.nom+'</div><div class="desc">'+ch.desc+'</div>';
    b.onclick=()=>{ ch.effet(); eventDiv.classList.remove('visible'); apresEvenement(); }; eventCards.appendChild(b); }
  eventDiv.classList.add('visible');
}

/* scène de planète sans combat : décor sur le canvas + choix en haut de l'écran */
export function ouvrirScenePlanete(scene){
  state.phase='planete'; state.scenePlanete={kind:scene.kind,titre:scene.titre}; state.selection=null; state.modeTourelle=false; state.modeCapacite=null;
  tooltip.classList.remove('visible');
  planeteTitre.textContent=scene.titre; planeteCards.innerHTML='';
  for(const ch of scene.choix){ const b=document.createElement('div'); b.className='card';
    b.innerHTML='<div class="emo">'+(ch.emo||'▸')+'</div><div class="nom">'+ch.nom+'</div><div class="desc">'+ch.desc+'</div>';
    b.onclick=()=>{ ch.effet(); planeteDiv.classList.remove('visible'); state.scenePlanete=null; const s=scene.suite; if(s) s(); };
    planeteCards.appendChild(b); }
  planeteDiv.classList.add('visible');
}
export function ouvrirMeta(){ metaCristaux.textContent='💎 Cristaux : '+(state.meta.cristaux||0); metaCards.innerHTML='';
  for(const m of META){ const lvl=state.meta[m.id]||0, cout=m.cout(lvl), atMax=lvl>=m.max, peut=!atMax&&(state.meta.cristaux||0)>=cout;
    const b=document.createElement('div'); b.className='card';
    b.innerHTML='<div class="nom">'+m.nom+'</div><div class="desc">'+m.desc+'</div><div class="desc" style="color:#8fd0ff">'+'●'.repeat(lvl)+'○'.repeat(m.max-lvl)+'</div><div class="desc" style="color:#ffd23d">'+(atMax?'MAX':cout+' 💎')+'</div>';
    if(peut){ b.onclick=()=>{ state.meta.cristaux-=cout; state.meta[m.id]=lvl+1; saveData(); ouvrirMeta(); }; } else b.style.opacity=atMax?'.6':'.4';
    metaCards.appendChild(b); }
  metaDiv.classList.add('visible');
}

export function ouvrirMission(type,reussi){ state.phase='mission';
  missionTitre.textContent = type==='boss'?'FORTERESSE DÉTRUITE !':(type==='elite'?'ÉLITES ANÉANTIS !':'ZONE SÉCURISÉE');
  const obj = state.objectifVague ? ((reussi?'✅ ':'✗ ')+state.objectifVague.texte) : '';
  missionStats.innerHTML = (obj?obj+'<br>':'')+'Secteur '+state.secteur+' · Score '+state.score+'<br>Croiseur '+state.hpCruiser+'/'+state.HP_MAX+' PV';
  missionDiv.classList.add('visible'); }

export function finPartie(){
  state.phase='fin'; stopMusic(); effacerSauvegarde();
  enregistrerStat(state.secteur,state.vague,state.score);
  const gagne=Math.floor(state.score/8)+state.vague; state.meta.cristaux=(state.meta.cristaux||0)+gagne; saveData();
  document.getElementById('cristauxGagnes').textContent='💎 +'+gagne+' cristaux (total : '+state.meta.cristaux+')';
  addHighscore();
  document.getElementById('scoreFin').textContent='Score : '+state.score+'   ·   Vague '+state.vague;
  document.getElementById('fin').classList.remove('cache');
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
    const info={
      normal:{nom:'Aile',role:'Avance et tire droit devant.'},
      chasseur:{nom:'Chasseur',role:'Rapide (2 cases/tour), tire dès le 1er rang.'},
      bombardier:{nom:'Bombardier',role:'Vise le croiseur, dégâts x2. Avance 1 tour sur 2.'},
      eclaireur:{nom:'Éclaireur',role:'Rapide, ne tire pas : fonce pour éperonner.'},
      porteur:{nom:'Porteur (élite)',role:'Renforce d\'un bouclier les ailes voisines.'},
      brouilleur:{nom:'Brouilleur (élite)',role:'Protège de tes tirs les ailes voisines.'},
      lourd:{nom:'Aile lourde',role:'Blindée : encaisse 3 tirs. Avance lentement.'},
      stronghold:{nom:'Forteresse',role:'3 PV. Se scinde en 2 navettes à sa destruction.'},
      mini_navette:{nom:'Navette',role:'Débris de forteresse. Fragile.'},
      regenerateur:{nom:'Régénérateur',role:'Se soigne d\'1 PV tous les 3 tours.'},
      mini_sniper:{nom:'Traqueur',role:'Vise tes 2 vaisseaux les plus proches du croiseur.'},
      diagonal_d:{nom:'Intercepteur oblique',role:'Avance en diagonale, rebondit sur les bords.'},
      diagonal_g:{nom:'Intercepteur oblique',role:'Avance en diagonale, rebondit sur les bords.'},
      void:{nom:'Faille',role:'Attire tes vaisseaux (sauf cuirassés) d\'une case.'},
    }[a.type]||{nom:'Aile',role:''};
    const deg=a.type==='eclaireur'?0:(a.type==='bombardier'?degLaserActuel()*2:degLaserActuel());
    html='<div class="tt-name">'+info.nom+'</div>';
    html+='<div class="tt-spd" style="color:#cbd6f0">'+info.role+'</div>';
    html+='<div class="tt-hp">PV: '+a.hp+'/'+a.maxhp+'</div>';
    html+='<div class="tt-dmg">Dégâts: '+(deg>0?deg:'aucun (éperonnage)')+'</div>';
    html+='<div class="tt-spd">Avance: '+a.vitesse+' case'+(a.vitesse>1?'s':'')+'/tour</div>';
    if(a.bouclier) html+='<div class="tt-spd" style="color:#ffd23d">🛡 Renforcé (1 tir absorbé)</div>';
    if(estProtege(a)) html+='<div class="tt-spd" style="color:#b06bff">Protégé — vise le brouilleur</div>';
  } else if(f){
    const info={
      normal:{nom:'Vaisseau standard',role:'Tir en colonne ±1.'},
      rouge:{nom:'Vaisseau Rouge',role:'Tir de zone (3×3) · 2 PV · +1 déplacement.'},
      rapide:{nom:'Intercepteur',role:'+1 déplacement.'},
      bombardier:{nom:'Bombardier',role:'Tir qui détruit toute une colonne.'},
      bouclier:{nom:'Cuirassé',role:'Encaisse 3 PV.'},
      sniper:{nom:'Tireur',role:'Tir à longue portée (±2 colonnes).'},
    }[f.type]||{nom:'Vaisseau',role:''};
    html='<div class="tt-name">'+info.nom+'</div>';
    html+='<div class="tt-spd" style="color:#cbd6f0">'+info.role+'</div>';
    html+='<div class="tt-hp">PV: '+f.hp+'</div>';
    html+='<div class="tt-spd">Déplacement: '+porteeDep(f)+' case'+(porteeDep(f)>1?'s':'')+'</div>';
    const cap=CAPACITES[f.type];
    if(cap) html+='<div class="tt-spd" style="color:#ffd23d">⚡ '+cap.nom+' — '+(f.capUsed?'déjà utilisée':cap.desc+' (2e appui)')+'</div>';
  } else if(b){
    const names={'pv':'Soin','tir':'Tir gratuit','vaisseau':'Renfort','mimic':'Renfort'};
    html='<div class="tt-name">Bonus: '+(names[b.type]||'Renfort')+'</div>';
    if(b.type!=='mimic') html+='<div class="tt-spd">Disparaît dans '+b.ttl+' tour'+(b.ttl>1?'s':'')+'</div>';
  } else if(ast){
    html='<div class="tt-name">Astéroïde</div>';
    html+='<div class="tt-dmg">Dégâts: '+DEG_ASTEROIDE+'</div>';
  } else if(obstacleEn(c,r)){ const ob=obstacleEn(c,r), def=OBSTACLES[ob.type];
    html='<div class="tt-name">'+def.nom+'</div><div class="tt-spd" style="color:#cbd6f0">'+def.desc+'</div>';
    if(def.destructible) html+='<div class="tt-hp">PV: '+ob.hp+'/'+(ob.maxhp||def.hp)+'</div>';
  } else if(trouNoirEn(c,r)){ const tn=trouNoirEn(c,r);
    html='<div class="tt-name">Trou noir</div><div class="tt-dmg">Aspire tout autour (1 case)</div><div class="tt-spd">Encore '+tn.turns+' tour(s)</div>';
  } else if(champEn(c)){
    html='<div class="tt-name">Champ magnétique</div><div class="tt-dmg">Brouille tes tirs dans cette colonne</div>';
  } else if(bossEn(c,r)){
    const bn={canon:'Canonnier · 3 colonnes',sniper:'Sniper · vise 3 vaisseaux',rayon:'Rayon · charge puis balaye',nuee:'Nuée · lâche des ailes',blinde:'Blindé · gros tir central'};
    html='<div class="tt-name">BOSS — '+(state.boss?bn[state.boss.type]:'')+'</div>';
    html+='<div class="tt-hp">PV: '+(state.boss?state.boss.hp+'/'+state.boss.maxhp:'?')+'</div>';
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
  let html='<div class="tt-name">'+(ICONE[trouve.type]||'')+' '+(NOM_NOEUD[trouve.type]||trouve.type)+'</div>';
  html+='<div class="tt-spd">'+(DESC_NOEUD[trouve.type]||'')+'</div>';
  html+='<div class="tt-'+(cur?'grn':(reach?'dmg':'hp'))+'" style="color:'+(cur?'#8fa0c8':(reach?'#ffd23d':'#e5484d'))+'">'+(cur?'Position actuelle':(reach?'▸ Accessible':'Hors de portée'))+'</div>';
  tooltip.innerHTML=html; tooltip.classList.add('visible');
}
function tooltipBouton(a){
  let html='';
  if(a.id==='vaisseau'){ html='<div class="tt-name">Générer un vaisseau</div>';
    if(state.fighters.length>=state.MAX_VAISSEAUX) html+='<div class="tt-hp">Maximum atteint ('+state.MAX_VAISSEAUX+' vaisseaux). Perds-en un pour pouvoir en reconstruire.</div>';
    else if(state.hangar) html+='<div class="tt-hp">Un vaisseau est déjà en préparation (⏳).</div>';
    else html+='<div class="tt-spd">Sort du hangar au tour suivant · '+state.fighters.length+'/'+state.MAX_VAISSEAUX+'</div>'; }
  else if(a.id==='tourelle'){ html='<div class="tt-name">Tourelle du croiseur</div><div class="tt-dmg">Détruit une aile n\'importe où sur la carte</div>'; }
  else { html='<div class="tt-name">Recharger le bouclier</div><div class="tt-grn" style="color:#2fd6a0">+'+state.RECHARGE+' PV au croiseur</div><div class="tt-spd">'+(state.boucliersRestants>0?state.boucliersRestants+' utilisation'+(state.boucliersRestants>1?'s':'')+' restante'+(state.boucliersRestants>1?'s':'')+' ce combat':'Épuisé pour ce combat')+'</div>'; }
  tooltip.innerHTML=html; tooltip.classList.add('visible');
}

/* =====================================================================
   ENTRÉES (souris + clavier)
   ===================================================================== */
function coord(cx,cy){ const b=canvas.getBoundingClientRect(); return {x:(cx-b.left)*(state.LARGEUR/b.width), y:(cy-b.top)*(state.HAUTEUR/b.height)}; }
function caseDe(x,y){ if(x<state.GX||x>=state.GX+state.COLS*state.CELL||y<state.GY||y>=state.GY+state.RANGS*state.CELL) return null; return {c:Math.floor((x-state.GX)/state.CELL), r:Math.floor((y-state.GY)/state.CELL)}; }
function dansRect(x,y,R){ return x>=R.x&&x<=R.x+R.w&&y>=R.y&&y<=R.y+R.h; }

canvas.addEventListener('pointermove', ev=>{
  if(state.paused) return;
  const rect=scene.getBoundingClientRect();
  tooltip.style.left=(ev.clientX-rect.left+14)+'px'; tooltip.style.top=(ev.clientY-rect.top+14)+'px';
  const {x,y}=coord(ev.clientX,ev.clientY);
  if(state.phase==='carte'){ tooltipCarte(x,y); state.hoverCell=null; return; }
  if(state.phase!=='joueur'){ tooltip.classList.remove('visible'); state.hoverCell=null; return; }
  const btn=state.ACT.find(a=>dansRect(x,y,a));
  if(btn && state.phase==='joueur'){ tooltipBouton(btn); state.hoverCell=null; return; }
  updateTooltip(x,y);
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
        ship.c=c; ship.r=r; ship.capUsed=true; state.modeCapacite=null; state.deplacementsJoueurTotal++; sonTir(); logMsg('💨 Bond !','log-ylw');
        const b=bonusEn(c,r); if(b) ramasser(b);
      } else { state.modeCapacite=null; state.selection=null; }
    } else if(kind==='charge'){
      const cible=aileEn(c,r); const an=analyseTir(ship);
      if(cible && an.ailesOk.has(cible)){ tirerCharge(ship,cible); }
      else { state.modeCapacite=null; state.selection=null; logMsg('Tir chargé annulé','log-ylw'); }
    }
    return;
  }
  if(!state.selection){ const f=fighterEn(c,r); if(f&&!f.used){ state.selection=f; sonSelect(); } return; }
  const f=state.selection;
  if(f.c===c&&f.r===r){ if(activerCapacite(f)) return; state.selection=null; return; }
  const autre=fighterEn(c,r); if(autre&&!autre.used){ state.selection=autre; sonSelect(); return; }
  const an=analyseTir(f);
  if(bossEn(c,r)){ if(an.boss){ const px=centreCase(c,r).x,py=centreCase(c,r).y; state.lasers.push({x1:f.x,y1:f.y-6,x2:px,y2:py,t:0,ennemi:false}); state.trails.push({x1:f.x,y1:f.y-6,x2:px,y2:py,t:0,ennemi:false}); sonTir(); const deg=f.type==='rouge'?2:1; f.used=true; state.selection=null; setTimeout(()=>toucherBoss(deg,px,py),130); } else logMsg(an.jam?'Vaisseau brouillé':'Tir bloqué','log-red'); return; }
  const cible=aileEn(c,r); if(cible){ if(an.ailesOk.has(cible)){ tirer(f,cible); } else logMsg(an.jam?'Vaisseau brouillé (champ magnétique)':'Tir bloqué / hors d’atteinte','log-red'); return; }
  const ob=obstacleEn(c,r); if(ob){ if(an.obstaclesOk.has(ob)){ const tx=centreCase(c,r).x,ty=centreCase(c,r).y; state.lasers.push({x1:f.x,y1:f.y-6,x2:tx,y2:ty,t:0,ennemi:false}); state.trails.push({x1:f.x,y1:f.y-6,x2:tx,y2:ty,t:0,ennemi:false}); sonTir(); f.used=true; state.selection=null; setTimeout(()=>frapperObstacle(ob),130); } else logMsg('Tir bloqué / hors d’atteinte','log-red'); return; }
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
  state.selection=null; state.modeTourelle=false; sonUndo(); logMsg('↺ Annulé','log-ylw');
}
export function togglePause(){ state.paused=!state.paused; pauseDiv.classList.toggle('visible',state.paused); if(state.paused){ stopMusic(); sonPause(); } else { startMusic(); } }

document.addEventListener('keydown', ev=>{
  if(ev.key==='Escape'){ undo(); ev.preventDefault(); }
  else if(ev.key===' '||ev.key==='Enter'){ if(state.phase==='joueur'&&!state.paused&&!state.choixBuild){ finDuTour(); } ev.preventDefault(); }
  else if(ev.key==='p'||ev.key==='P'){ togglePause(); ev.preventDefault(); }
  else if(ev.key==='1'){ if(state.phase==='joueur'&&!state.choixBuild) choisirAction('vaisseau'); }
  else if(ev.key==='2'){ if(state.phase==='joueur'&&!state.choixBuild) choisirAction('tourelle'); }
  else if(ev.key==='3'){ if(state.phase==='joueur'&&!state.choixBuild) choisirAction('bouclier'); }
  else if(ev.key==='u'||ev.key==='U'){ if(state.phase==='joueur'&&!state.choixBuild&&ultimePret()) declencheUltime(); }
});

document.getElementById('son').addEventListener('click',()=>{ const on=toggleSound(); document.getElementById('son').textContent=on?'🔊':'🔇'; });
