/* =====================================================================
   COMBAT — ciblage, déplacement, résolution de tour, tirs, boucle jeu
   ===================================================================== */
import { state, centreCase, saveState, sauvegarderPartie } from './state.js';
import { DEG_LASER, DEG_EPERON, DEG_ASTEROIDE, ULTIME_MAX } from './config.js';
import { fighterEn, aileEn, asterEn, bossEn, occupe, dansGrille, trouNoirEn, champEn,
         tuerFighter, tuerAile, estElite, estProtege, porteurAura, blesser, faireAile, larguerBonus,
         deployerVaisseau, ramasser, getImgAster } from './entities.js';
import { sonTir, sonTirEnnemi, sonBoom, sonAie, sonVague, sonVoix, sonRenfort, setMusicPhase, canPlayAmbiance, sonRadar } from './audio.js';
import { NFRAMES } from './sprites.js';
import { logMsg, ouvrirBuild, finPartie, checkAchievements } from './ui.js';
import { gagnerCombat, serialiserCarte } from './map.js';

/* ---- ciblage / déplacement ---- */
export function tirable(f,a){ return Math.abs(a.c-f.c)<=1; }
export function porteeDep(f){ return state.PORTEE_DEP + (f.type==='rouge'||f.type==='rapide'?1:0) + (state.ups?state.ups.deplacement:0); }
export function casesMouvement(f){ const out=[],p=porteeDep(f); for(let dc=-p;dc<=p;dc++) for(let dr=-p;dr<=p;dr++){ if((dc===0&&dr===0)||Math.abs(dc)+Math.abs(dr)>p) continue;
  const c=f.c+dc,r=f.r+dr; if(dansGrille(c,r)&&!occupe(c,r)&&!asterEn(c,r)&&!trouNoirEn(c,r)) out.push({c,r}); } return out; }
export function peutViserBoss(f){ return state.boss&&f.c>=state.boss.c-1&&f.c<=state.boss.c+3; }

export function cibleLaser(a){ if(a.type==='eclaireur'||a.r<0) return null;
  if(a.r<state.RANG_TIR && a.type!=='chasseur') return null;   // le chasseur attaque dès son 1er tour
  if(a.type==='bombardier') return {type:'croiseur',bomber:true};
  for(let rr=a.r+1;rr<state.RANGS;rr++){ const f=fighterEn(a.c,rr); if(f) return {type:'fighter',f}; } return {type:'croiseur'}; }
export function trajectoire(ast){ const pts=[]; let c=ast.c,r=ast.r; for(let i=0;i<14;i++){ c+=ast.dc; r+=ast.dr; pts.push({c,r}); if(r>state.RANGS-1||c<0||c>state.COLS-1||r<0) break; } return pts; }

/* Visée en ligne de mire : le faisceau monte et s'arrête au 1er obstacle
   (aile/boss = cible ; allié/menace = bloqué). */
export function analyseTir(f){
  if(champEn(f.c)) return {ailesOk:new Set(),boss:false,beams:[],jam:true};
  const ailesOk=new Set(); let bossOk=false; const beams=[]; const p=1+(state.ups?state.ups.portee:0);
  for(let dc=-p;dc<=p;dc++){ const c=f.c+dc; if(c<0||c>=state.COLS) continue;
    const start=f.r-1; if(start<0) continue;   // on ne regarde QUE ce qui est devant (au-dessus)
    let kind='vide', r1=0;
    for(let rr=start; rr>=0; rr--){
      const al=aileEn(c,rr); if(al){ if(estProtege(al)){ kind='menace'; r1=rr; break; } ailesOk.add(al); kind='ennemi'; r1=rr; break; }
      if(bossEn(c,rr)){ bossOk=true; kind='ennemi'; r1=rr; break; }
      if(fighterEn(c,rr)){ kind='allie'; r1=rr; break; }
      if(asterEn(c,rr)||trouNoirEn(c,rr)){ kind='menace'; r1=rr; break; }
      r1=rr;
    }
    beams.push({c,r0:start,r1,kind});
  }
  return {ailesOk,boss:bossOk,beams,jam:false};
}

/* planifie une menace : ajoute une ALERTE visible un tour avant */
export function programmerMenace(){
  const kinds = state.bossVaincus>0 ? ['astero','astero','trou','champ'] : ['astero','astero','astero','trou'];
  const kind = kinds[Math.floor(Math.random()*kinds.length)];
  if(kind==='astero'){ state.menacesWarn.push({kind:'astero',r:1+Math.floor(Math.random()*(state.RANGS-2)),dir:Math.random()<0.5?1:-1,s:2+Math.floor(Math.random()*2)}); }
  else if(kind==='trou'){ state.menacesWarn.push({kind:'trou',c:1+Math.floor(Math.random()*(state.COLS-2)),r:2+Math.floor(Math.random()*Math.max(1,state.RANGS-4))}); }
  else { const c0=Math.floor(Math.random()*(state.COLS-2)); state.menacesWarn.push({kind:'champ',c0,c1:Math.min(state.COLS-1,c0+1+Math.floor(Math.random()*2))}); }
}
/* transforme les alertes en menaces réelles */
export function materialiserMenaces(){
  for(const w of state.menacesWarn){
    if(w.kind==='astero'){ const c=w.dir>0?-1:state.COLS, y=centreCase(0,w.r).y, x=w.dir>0?state.GX-state.CELL/2:state.GX+state.COLS*state.CELL+state.CELL/2;
      state.asteroides.push({c,r:w.r,dc:w.dir*w.s,dr:0,x,y,ang:0,img:getImgAster(),hp:1,maxhp:1,type:'normal'}); }
    else if(w.kind==='trou'){ const p=centreCase(w.c,w.r); state.trousNoirs.push({c:w.c,r:w.r,turns:3,x:p.x,y:p.y,ang:0}); logMsg('Trou noir !','log-red'); }
    else if(w.kind==='champ'){ state.champs.push({c0:w.c0,c1:w.c1,turns:3}); logMsg('Champ magnétique !','log-ylw'); }
  }
  state.menacesWarn=[];
}

export function demarrerTourJoueur(){ state.phase='joueur'; for(const f of state.fighters) f.used=false; state.actionFaite=false; state.modeTourelle=false; state.tirsGratuits=state.ups.tourelleDouble; for(const a of state.ailes) a.bouclier=!estElite(a)&&porteurAura(a); setMusicPhase('calme'); sauvegarderPartie(serialiserCarte); }

/* actions du croiseur */
export function choisirAction(id){
  if(id==='tourelle'){ if(state.actionFaite&&state.tirsGratuits<=0) return; state.modeTourelle=!state.modeTourelle; state.selection=null; return; }
  if(state.actionFaite) return;
  if(id==='vaisseau'){ if(!state.hangar&&state.fighters.length<state.MAX_VAISSEAUX){ ouvrirBuild(); } }
  else if(id==='bouclier'){ const soin=Math.round(state.RECHARGE*(1+0.25*state.ups.bouclier)); state.hpCruiser=Math.min(state.HP_MAX,state.hpCruiser+soin); state.actionFaite=true; state.modeTourelle=false; state.flashRecharge=1; sonRenfort(); logMsg('Bouclier +'+soin,'log-grn'); }
}
export function tirerTourelle(a){
  state.lasers.push({x1:state.LARGEUR/2,y1:state.cruiserY+4,x2:a.x,y2:a.y,t:0,ennemi:false,gros:true});
  state.trails.push({x1:state.LARGEUR/2,y1:state.cruiserY+4,x2:a.x,y2:a.y,t:0,ennemi:false,gros:true});
  sonTir(); finirTourelle();
  const cible=a;
  setTimeout(()=>{ if(state.ailes.includes(cible)){ exploser(cible.x,cible.y,true); tuerAile(cible); state.comboCount++; state.comboTimer=2; if(state.comboCount>state.bestCombo) state.bestCombo=state.comboCount; sonBoom(); checkAchievements(); } }, 120);
}
export function finirTourelle(){ if(state.actionFaite&&state.tirsGratuits>0) state.tirsGratuits--; else state.actionFaite=true; state.modeTourelle=false; }
export function toucherBoss(deg,px,py){ if(!state.boss) return; state.boss.hp-=deg; exploser(px,py,false); sonBoom();
  if(state.boss.hp<=0){
    state.achievements.boss_slayer=true;
    exploser(state.boss.x,state.boss.y,true); exploser(state.boss.x-24,state.boss.y+12,true); exploser(state.boss.x+24,state.boss.y-12,true);
    state.secousse=18; state.score+=5; state.bossVaincus++; state.bossKilledThisWave=true; larguerBonus(state.boss.c+1,Math.min(state.RANGS-1,state.boss.r+1)); state.boss=null;
    logMsg('BOSS DÉTRUIT !','log-ylw'); sonVoix('BOSS');
    checkAchievements();
  } }

export function tirer(f,aile){
  state.lasers.push({x1:f.x,y1:f.y-6,x2:aile.x,y2:aile.y,t:0,ennemi:false});
  state.trails.push({x1:f.x,y1:f.y-6,x2:aile.x,y2:aile.y,t:0,ennemi:false});
  sonTir(); f.used=true; state.selection=null;
  const type=f.type, cible=aile;
  setTimeout(()=>{                          // l'explosion arrive APRÈS le laser
    if(type==='rouge'){ const zone=state.ailes.filter(a=>Math.abs(a.c-cible.c)<=1&&Math.abs(a.r-cible.r)<=1); let kills=0;
      for(const a of zone){ if(frapperAile(a,true)) kills++; }
      state.secousse=Math.max(state.secousse,9); state.comboCount+=kills; state.comboTimer=2; if(state.comboCount>state.bestCombo) state.bestCombo=state.comboCount;
      if(kills>=3) logMsg(kills+' ENNEMIS ! 🔥','log-ylw'); }
    else if(type==='bombardier'){ const col=state.ailes.filter(a=>a.c===cible.c); let kills=0;
      for(const a of col){ if(frapperAile(a,true)) kills++; }
      state.secousse=Math.max(state.secousse,8); state.comboCount+=kills; state.comboTimer=2; if(state.comboCount>state.bestCombo) state.bestCombo=state.comboCount;
      if(kills>=3) logMsg(kills+' EN LIGNE ! 💥','log-ylw'); }
    else if(state.ailes.includes(cible)){ if(frapperAile(cible,false)){ state.comboCount++; state.comboTimer=2; if(state.comboCount>state.bestCombo) state.bestCombo=state.comboCount; } }
    sonBoom(); checkAchievements();
  }, 130);
}
export function ultimePret(){ return state.ultimeJauge>=ULTIME_MAX; }
export function declencheUltime(){
  for(const a of [...state.ailes]){ exploser(a.x,a.y,true); state.score++; state.killsThisWave++; } state.ailes=[];
  for(const o of [...state.asteroides]){ exploser(o.x,o.y,true); } state.asteroides=[];
  if(state.boss){ state.boss.hp-=4; if(state.boss.hp<=0){ exploser(state.boss.x,state.boss.y,true); state.score+=5; state.bossVaincus++; state.bossKilledThisWave=true; larguerBonus(state.boss.c+1,Math.min(state.RANGS-1,state.boss.r+1)); state.boss=null; } }
  state.hpCruiser=Math.min(state.HP_MAX,state.hpCruiser+Math.round(state.HP_MAX*0.2));
  state.secousse=22; state.flashRecharge=1; state.ondeChoc=1; state.ultimeJauge=0;
  sonBoom(); sonVague(); logMsg('⚡ FRAPPE ORBITALE !','log-ylw'); checkAchievements();
}
export function frapperAile(a,grand){ if(a.bouclier){ a.bouclier=false; exploser(a.x,a.y,false); return false; } exploser(a.x,a.y,grand); tuerAile(a); return true; }

/* =====================================================================
   FIN DU TOUR (phase ennemie)
   ===================================================================== */
export function laserAile(a,tx,ty){
  const ex=a.img.width*0.30, ey=a.img.height*0.34;
  for(const s of [-1,1]){ const x1=a.x+s*ex, y1=a.y-ey, dx=tx-x1, dy=ty-y1, k=1.22;
    state.lasers.push({x1,y1,x2:x1+dx*k,y2:y1+dy*k,t:0,ennemi:true});
    state.trails.push({x1,y1,x2:x1+dx*k,y2:y1+dy*k,t:0,ennemi:true}); }
}
export function finDuTour(){
  if(state.phase!=='joueur'||state.paused||state.choixBuild) return;
  saveState(); state.undoStack=[]; // clear undo after committing
  state.phase='ennemi'; state.selection=null; state.modeTourelle=false; state.lockTimer=0.9; state.comboCount=0; state.comboTimer=0;
  setMusicPhase('tense');
  materialiserMenaces();   // les alertes du tour précédent deviennent réelles

  // (1) TIRS des ailes + du boss
  const tirs=state.ailes.map(a=>({a,cb:cibleLaser(a)})).filter(o=>o.cb); let degats=0;
  for(const {a,cb} of tirs){
    const tx=cb.type==='fighter'?cb.f.x:a.x, ty=cb.type==='fighter'?cb.f.y:(state.GRID_BAS+10);
    if(a.type==='bombardier'){ state.lasers.push({x1:a.x,y1:a.y,x2:a.x,y2:ty,t:0,ennemi:true}); state.trails.push({x1:a.x,y1:a.y,x2:a.x,y2:ty,t:0,ennemi:true}); }
    else { laserAile(a,tx,ty); }
    if(cb.type==='fighter'){ const f=cb.f; if(state.fighters.includes(f)){ const mort=blesser(f); exploser(f.x,f.y,false); if(mort) tuerFighter(f); } }
    else { degats+=cb.bomber?DEG_LASER*2:DEG_LASER; } }
  if(state.boss){ degats+=tirsBoss(); }
  if(tirs.length||state.boss) sonTirEnnemi();
  if(degats>0){ state.hpCruiser=Math.max(0,state.hpCruiser-degats); state.damageThisWave+=degats; state.flashCroiseur=1; state.secousse=Math.max(state.secousse,7); sonAie(); logMsg('-'+degats+' PV','log-red'); }

  // (2) AVANCE des ailes (vitesse par type) + collisions + éperonnage
  for(const a of [...state.ailes].sort((x,y)=>y.r-x.r)){ if(!state.ailes.includes(a)) continue;
    let steps=a.vitesse; if(a.type==='bombardier'&&state.tourCompteur%2===1) steps=0;
    for(let s=0;s<steps;s++){ if(!state.ailes.includes(a)) break; const nr=a.r+1;
      if(nr>state.RANGS-1){ state.ailes.splice(state.ailes.indexOf(a),1); state.hpCruiser=Math.max(0,state.hpCruiser-DEG_EPERON); state.damageThisWave+=DEG_EPERON; state.flashCroiseur=1; state.secousse=15; sonAie(); exploser(centreCase(a.c,state.RANGS-1).x,state.GRID_BAS,true); exploser(centreCase(a.c,state.RANGS-1).x,state.cruiserY+8,true); logMsg('💥 Éperonnage ! -'+DEG_EPERON+' PV','log-red'); break; }
      a.r=nr; const f=fighterEn(a.c,nr); if(f){ exploser(a.x,a.y,false); state.ailes.splice(state.ailes.indexOf(a),1); const m=blesser(f); exploser(f.x,f.y,false); if(m) tuerFighter(f); sonBoom(); break; } } }

  // (3) BOSS avance
  if(state.boss){ if(!(state.boss.type==='blinde'&&state.tourCompteur%2===1)) state.boss.r+=1;
    if(state.boss.r+state.boss.h-1>state.RANGS-1){ state.hpCruiser=Math.max(0,state.hpCruiser-DEG_EPERON*2); state.damageThisWave+=DEG_EPERON*2; state.flashCroiseur=1; state.secousse=18; sonAie(); exploser(state.boss.x,state.cruiserY+8,true); exploser(state.boss.x,state.GRID_BAS,true); state.boss=null; logMsg('💥 Le boss percute le croiseur !','log-red'); } }

  // (4) ASTÉROÏDES
  for(const ast of [...state.asteroides]){ const ux=Math.sign(ast.dc), uy=Math.sign(ast.dr), steps=Math.max(Math.abs(ast.dc),Math.abs(ast.dr));
    let cc=ast.c, rr=ast.r, out=false, crash=false;
    for(let s=0;s<steps;s++){ cc+=ux; rr+=uy; if(rr>state.RANGS-1){ crash=true; break; } if(cc<0||cc>state.COLS-1||rr<0){ out=true; break; }
      const f=fighterEn(cc,rr); if(f){ exploser(f.x,f.y,true); const m=blesser(f); if(m) tuerFighter(f); sonBoom(); }
      const a=aileEn(cc,rr); if(a){ exploser(a.x,a.y,false); state.ailes.splice(state.ailes.indexOf(a),1); }
      if(bossEn(cc,rr)){ state.boss.hp-=1; exploser(centreCase(cc,rr).x,centreCase(cc,rr).y,false); if(state.boss.hp<=0){ exploser(state.boss.x,state.boss.y,true); state.score+=5; state.bossVaincus++; state.bossKilledThisWave=true; larguerBonus(state.boss.c+1,Math.min(state.RANGS-1,state.boss.r+1)); state.boss=null; } } }
    ast.c=cc; ast.r=rr;
    if(crash){ state.hpCruiser=Math.max(0,state.hpCruiser-DEG_ASTEROIDE); state.damageThisWave+=DEG_ASTEROIDE; state.flashCroiseur=1; state.secousse=12; sonAie(); exploser(centreCase(Math.max(0,Math.min(state.COLS-1,cc)),state.RANGS-1).x,state.GRID_BAS+8,true); state.asteroides.splice(state.asteroides.indexOf(ast),1); logMsg('Astéroïde !','log-red'); }
    else if(out) state.asteroides.splice(state.asteroides.indexOf(ast),1); }

  // (4b) TROUS NOIRS : aspirent tout autour ; CHAMPS MAGNÉTIQUES : décompte
  for(let i=state.trousNoirs.length-1;i>=0;i--){ const tn=state.trousNoirs[i];
    for(let dc=-1;dc<=1;dc++) for(let dr=-1;dr<=1;dr++){ const c=tn.c+dc,r=tn.r+dr;
      const f=fighterEn(c,r); if(f){ exploser(f.x,f.y,true); const m=blesser(f); if(m) tuerFighter(f); }
      const a=aileEn(c,r); if(a){ exploser(a.x,a.y,false); state.ailes.splice(state.ailes.indexOf(a),1); } }
    tn.turns--; if(tn.turns<=0){ exploser(tn.x,tn.y,true); state.trousNoirs.splice(i,1); } }
  for(let i=state.champs.length-1;i>=0;i--){ state.champs[i].turns--; if(state.champs[i].turns<=0) state.champs.splice(i,1); }

  // (5) bonus : avancent vers les vaisseaux, ramassés au passage, disparaissent vite
  for(let i=state.bonus.length-1;i>=0;i--){ const b=state.bonus[i]; b.r+=1; b.ttl--;
    const f=fighterEn(b.c,b.r); if(f){ ramasser(b); continue; }
    if(b.r>state.RANGS-1||b.ttl<=0) state.bonus.splice(i,1); }

  // (6) menaces uniquement (combat discret : pas de respawn continu)
  state.tourCompteur++;
  if(state.tourCompteur>=state.prochainAsteroide){ programmerMenace(); state.prochainAsteroide=state.tourCompteur+3+Math.floor(Math.random()*2); }
  if(state.ups.regen>0) state.hpCruiser=Math.min(state.HP_MAX,state.hpCruiser+Math.round(state.HP_MAX*0.02*state.ups.regen));

  // (7) défaite ?
  if(state.hpCruiser<=0){ finPartie(); return; }
}

/* Attaques du boss selon son type. Renvoie les dégâts infligés au croiseur. */
export function tirsBoss(){
  let deg=0;
  const tirColonne=(bc)=>{ if(bc<0||bc>=state.COLS) return; let hf=null; for(let rr=state.boss.r+2;rr<state.RANGS;rr++){ const f=fighterEn(bc,rr); if(f){hf=f;break;} }
    const fx=centreCase(bc,state.boss.r).x, fy=state.boss.y;
    if(hf){ state.lasers.push({x1:fx,y1:fy,x2:hf.x,y2:hf.y,t:0,ennemi:true,gros:true}); if(state.fighters.includes(hf)){ const m=blesser(hf); exploser(hf.x,hf.y,false); if(m) tuerFighter(hf); } }
    else { deg+=DEG_LASER; state.lasers.push({x1:fx,y1:fy,x2:fx,y2:state.GRID_BAS+10,t:0,ennemi:true,gros:true}); } };
  if(state.boss.type==='sniper'){                 // vise les 3 vaisseaux les plus proches
    const cibles=[...state.fighters].sort((a,b)=>Math.hypot(a.x-state.boss.x,a.y-state.boss.y)-Math.hypot(b.x-state.boss.x,b.y-state.boss.y)).slice(0,3);
    if(cibles.length===0){ deg+=DEG_LASER*2; state.lasers.push({x1:state.boss.x,y1:state.boss.y,x2:state.boss.x,y2:state.GRID_BAS+10,t:0,ennemi:true,gros:true}); }
    for(const f of cibles){ state.lasers.push({x1:state.boss.x,y1:state.boss.y,x2:f.x,y2:f.y,t:0,ennemi:true,gros:true}); const m=blesser(f); exploser(f.x,f.y,false); if(m) tuerFighter(f); }
  } else if(state.boss.type==='rayon'){           // charge un tour, puis balaye 5 colonnes
    if(!state.boss.charge){ state.boss.charge=true; logMsg('Boss charge son rayon…','log-red'); }
    else { state.boss.charge=false; for(let bc=state.boss.c-1;bc<=state.boss.c+3;bc++) tirColonne(bc); }
  } else if(state.boss.type==='nuee'){          // porte-vaisseaux : lâche des ailes + 1 colonne
    for(let n=0;n<2;n++){ const cc=state.boss.c+Math.floor(Math.random()*3), rr=Math.min(state.RANGS-1,state.boss.r+2);
      if(!aileEn(cc,rr)&&state.ailes.length<state.AILES_MAX) faireAile(cc,rr,Math.random()<0.5?'chasseur':'normal'); }
    tirColonne(state.boss.c+1);
  } else if(state.boss.type==='blinde'){        // forteresse : gros tir central lourd
    const bc=state.boss.c+1; let hf=null; for(let rr=state.boss.r+2;rr<state.RANGS;rr++){ const f=fighterEn(bc,rr); if(f){hf=f;break;} }
    const fx=centreCase(bc,state.boss.r).x, fy=state.boss.y;
    if(hf){ state.lasers.push({x1:fx,y1:fy,x2:hf.x,y2:hf.y,t:0,ennemi:true,gros:true}); if(state.fighters.includes(hf)){ const m=blesser(hf); exploser(hf.x,hf.y,false); if(m) tuerFighter(hf); } }
    else { deg+=DEG_LASER*2; state.lasers.push({x1:fx,y1:fy,x2:fx,y2:state.GRID_BAS+10,t:0,ennemi:true,gros:true}); }
  } else {                                   // canonnier : 3 colonnes
    for(let dc=0;dc<3;dc++) tirColonne(state.boss.c+dc);
  }
  return deg;
}

export function exploser(x,y,grand){ state.explosions.push({x,y,t:0,scale:grand?2.0:1.05}); const n=grand?22:14;
  for(let i=0;i<n;i++){ const a=Math.random()*Math.PI*2, sp=40+Math.random()*(grand?220:150); state.particules.push({x,y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,vie:.5+Math.random()*.35,t:0,c:['#ffe14d','#ff8a3d','#ff5a3d'][i%3],taille:3+Math.random()*3}); } }

/* =====================================================================
   BOUCLE + ANIMATIONS
   ===================================================================== */
export function animer(dt){
  for(const f of state.fighters){ const p=centreCase(f.c,f.r); f.x+=(p.x-f.x)*.25; f.y+=(p.y-f.y)*.25; }
  for(const a of state.ailes){ const p=centreCase(a.c,a.r); a.x+=(p.x-a.x)*.2; a.y+=(p.y-a.y)*.2; }
  for(const o of state.asteroides){ const p=centreCase(Math.max(0,Math.min(state.COLS-1,o.c)),Math.max(0,Math.min(state.RANGS-1,o.r))); o.x+=(p.x-o.x)*.2; o.y+=(p.y-o.y)*.2; o.ang+=dt*1.5; }
  for(const b of state.bonus){ const p=centreCase(Math.max(0,Math.min(state.COLS-1,b.c)),Math.max(0,Math.min(state.RANGS-1,b.r))); b.x+=(p.x-b.x)*.2; b.y+=(p.y-b.y)*.2; }
  if(state.boss){ const p=centreCase(state.boss.c+1,state.boss.r); const ty=p.y+state.CELL/2; state.boss.x+=(p.x-state.boss.x)*.2; state.boss.y+=(ty-state.boss.y)*.2; }
  for(let i=state.particules.length-1;i>=0;i--){ const p=state.particules[i]; p.t+=dt; p.x+=p.vx*dt; p.y+=p.vy*dt; p.vy+=200*dt; if(p.t>=p.vie) state.particules.splice(i,1); }
  for(let i=state.explosions.length-1;i>=0;i--){ state.explosions[i].t+=dt; if(state.explosions[i].t>=NFRAMES*0.05) state.explosions.splice(i,1); }
  for(let i=state.lasers.length-1;i>=0;i--){ state.lasers[i].t+=dt; if(state.lasers[i].t>.16) state.lasers.splice(i,1); }
  for(let i=state.trails.length-1;i>=0;i--){ state.trails[i].t+=dt; if(state.trails[i].t>.35) state.trails.splice(i,1); }
  if(state.flashCroiseur>0) state.flashCroiseur=Math.max(0,state.flashCroiseur-dt*2);
  if(state.flashRecharge>0) state.flashRecharge=Math.max(0,state.flashRecharge-dt*2);
  if(state.secousse>0) state.secousse=Math.max(0,state.secousse-dt*40);
  if(state.banniereTimer>0) state.banniereTimer=Math.max(0,state.banniereTimer-dt);
  if(state.comboTimer>0){ state.comboTimer-=dt; if(state.comboTimer<=0) state.comboCount=0; }
  if(state.phase==='joueur'&&canPlayAmbiance()){ state.ambianceT+=dt; if(state.ambianceT>2.4){ state.ambianceT=Math.random()*0.6; sonRadar(); } }
  if(state.phase==='ennemi'){ state.lockTimer-=dt; if(state.lockTimer<=0){ if(state.hangar){ state.hangar.tours--; if(state.hangar.tours<=0){ deployerVaisseau(state.hangar.type); state.hangar=null; } } demarrerTourJoueur(); } }
  if(state.enCombat && state.phase==='joueur' && !state.boss && state.ailes.length===0) gagnerCombat();
  for(const tn of state.trousNoirs) tn.ang+=dt*2.2;
  if(state.ondeChoc>0) state.ondeChoc=Math.max(0,state.ondeChoc-dt*1.5);
  for(const a of state.ACT) if(a.anim>0) a.anim=Math.max(0,a.anim-dt*3);
  // Parallaxe nébuleuses
  for(const nb of state.nebuleuses){ nb.x-=nb.v*dt*2; if(nb.x<-nb.r) nb.x=state.LARGEUR+nb.r; }
}
