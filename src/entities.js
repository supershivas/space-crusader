/* =====================================================================
   ENTITÉS — création, prédicats et cycle de vie (vaisseaux, ailes,
   astéroïdes, boss, bonus)
   ===================================================================== */
import { state, centreCase } from './state.js';
import { DIFFICULTES, OBSTACLES } from './config.js';
import { cuireFit, JOUEUR, ROUGE, JOUEUR_RAPIDE, JOUEUR_BOMBER, JOUEUR_BOUCLIER, JOUEUR_SNIPER,
         AILE, CHASSEUR, BOMBARDIER, ECLAIREUR, ASTER, AILE_PORTEUR, AILE_BROUILLEUR, AILE_LOURD,
         DEBRIS_1, DEBRIS_2, STATION_PIECE, BARRIERE,
         STRONGHOLD, MINI_NAVETTE, REGENERATEUR, MINI_SNIPER, DIAGONAL_D, DIAGONAL_G, MIMIC, VOID } from './sprites.js';
import { sonRenfort } from './audio.js';
import { logMsg } from './ui.js';

/* images des unités, recuites à la taille de case courante (voir cuireUnites) */
let imgJoueur,imgRouge,imgAile,imgAster,imgChasseur,imgBomber,imgEclaireur,imgVRapide,imgVBombardier,imgVBouclier,imgVSniper,imgPorteur,imgBrouilleur,imgLourd;
let imgDebris1,imgDebris2,imgStation,imgBarriere;
let imgStronghold,imgMiniNavette,imgRegen,imgMiniSniper,imgDiagD,imgDiagG,imgMimic,imgVoid;
export function cuireUnites(CELL){
  imgJoueur=cuireFit(JOUEUR,CELL); imgRouge=cuireFit(ROUGE,CELL); imgAile=cuireFit(AILE,CELL); imgAster=cuireFit(ASTER,CELL);
  imgChasseur=cuireFit(CHASSEUR,CELL); imgBomber=cuireFit(BOMBARDIER,CELL); imgEclaireur=cuireFit(ECLAIREUR,CELL);
  imgVRapide=cuireFit(JOUEUR_RAPIDE,CELL); imgVBombardier=cuireFit(JOUEUR_BOMBER,CELL); imgVBouclier=cuireFit(JOUEUR_BOUCLIER,CELL); imgVSniper=cuireFit(JOUEUR_SNIPER,CELL);
  imgPorteur=cuireFit(AILE_PORTEUR,CELL); imgBrouilleur=cuireFit(AILE_BROUILLEUR,CELL); imgLourd=cuireFit(AILE_LOURD,CELL);
  imgDebris1=cuireFit(DEBRIS_1,CELL); imgDebris2=cuireFit(DEBRIS_2,CELL); imgStation=cuireFit(STATION_PIECE,CELL); imgBarriere=cuireFit(BARRIERE,CELL);
  imgStronghold=cuireFit(STRONGHOLD,CELL); imgMiniNavette=cuireFit(MINI_NAVETTE,CELL); imgRegen=cuireFit(REGENERATEUR,CELL); imgMiniSniper=cuireFit(MINI_SNIPER,CELL);
  imgDiagD=cuireFit(DIAGONAL_D,CELL); imgDiagG=cuireFit(DIAGONAL_G,CELL); imgMimic=cuireFit(MIMIC,CELL); imgVoid=cuireFit(VOID,CELL);
}
function imgAilePourType(type){ return type==='chasseur'?imgChasseur:type==='bombardier'?imgBomber:type==='eclaireur'?imgEclaireur:type==='porteur'?imgPorteur:type==='brouilleur'?imgBrouilleur:type==='lourd'?imgLourd:type==='stronghold'?imgStronghold:type==='mini_navette'?imgMiniNavette:type==='regenerateur'?imgRegen:type==='mini_sniper'?imgMiniSniper:type==='diagonal_d'?imgDiagD:type==='diagonal_g'?imgDiagG:type==='void'?imgVoid:imgAile; }
export function getImgMimic(){ return imgMimic; }
export function imgObstacle(o){ return o.type==='debris'?(o.variante?imgDebris2:imgDebris1) : o.type==='station'?imgStation : o.type==='barriere'?imgBarriere : null; }
export function getImgAster(){ return imgAster; }
export function imgVaisseau(type){ return type==='rouge'?imgRouge : type==='rapide'?imgVRapide : type==='bombardier'?imgVBombardier : type==='bouclier'?imgVBouclier : type==='sniper'?imgVSniper : imgJoueur; }
export function nouveauVaisseau(c,r,type,depuisBas){ const p=centreCase(c,r); type=type||'normal';
  const hp = type==='rouge'?(2+((state.ups&&state.ups.rouge_pv)||0)) : type==='bouclier'?3 : 1;
  return {c,r,x:p.x,y:depuisBas?p.y+50:p.y,used:false,type,hp,img:imgVaisseau(type),capUsed:false,provoque:false,kills:0}; }
/* effets spéciaux à l'acquisition d'une amélioration (ex : PV du Vaisseau Rouge) */
export function appliquerAmeliorationEffet(id){ if(id==='rouge_pv'){ for(const f of state.fighters){ if(f.type==='rouge') f.hp+=1; } } }
export function spread(n){ const out=[]; for(let i=0;i<n;i++) out.push(Math.max(0,Math.min(state.COLS-1,Math.round((i+0.5)*state.COLS/n-0.5)))); return [...new Set(out)]; }

export function fighterEn(c,r){ return state.fighters.find(f=>f.c===c&&f.r===r); }
export function aileEn(c,r){ return state.ailes.find(a=>a.c===c&&a.r===r); }
export function asterEn(c,r){ return state.asteroides.find(a=>a.c===c&&a.r===r); }
export function bonusEn(c,r){ return state.bonus.find(b=>b.c===c&&b.r===r); }
export function bossEn(c,r){ return state.boss&&c>=state.boss.c&&c<=state.boss.c+2&&r>=state.boss.r&&r<=state.boss.r+1; }
export function obstacleEn(c,r){ return state.obstacles?state.obstacles.find(o=>o.c===c&&o.r===r):undefined; }
export function obstacleBloquant(c,r){ const o=obstacleEn(c,r); return (o && OBSTACLES[o.type].bloque)?o:undefined; }
export function champObstacleEn(c,r){ const o=obstacleEn(c,r); return (o && OBSTACLES[o.type].champ)?OBSTACLES[o.type].champ:null; }
export function occupe(c,r){ return fighterEn(c,r)||aileEn(c,r)||bossEn(c,r)||obstacleBloquant(c,r); }
export function dansGrille(c,r){ return c>=0&&c<state.COLS&&r>=0&&r<state.RANGS; }
export function trouNoirEn(c,r){ return state.trousNoirs.find(t=>t.c===c&&t.r===r); }
export function champEn(c){ return state.champs.some(ch=>c>=ch.c0&&c<=ch.c1); }

export function tuerFighter(f){ if(state.fighters.includes(f)){ state.fighters.splice(state.fighters.indexOf(f),1); state.shipsLostThisWave++; } }

export function estElite(a){ return a.type==='porteur'||a.type==='brouilleur'; }
export function porteurAura(a){ return state.ailes.some(p=>p.type==='porteur'&&p!==a&&Math.abs(p.c-a.c)<=1&&Math.abs(p.r-a.r)<=1); }
export function brouilleurAura(a){ return state.ailes.some(p=>p.type==='brouilleur'&&p!==a&&Math.abs(p.c-a.c)<=1&&Math.abs(p.r-a.r)<=1); }
export function estProtege(a){ return !estElite(a)&&brouilleurAura(a); }

export function blesser(f){ f.hp=(f.hp||1)-1; return f.hp<=0; }

/* ---- ennemis & formations ---- */
export function typeAile(){
  const d=DIFFICULTES[state.difficulte]||DIFFICULTES.normal;
  if(state.vague>=Math.max(1,2+d.eliteVagueDelta) && Math.random()<0.06*d.eliteProbMult) return 'porteur';
  if(state.vague>=Math.max(1,3+d.eliteVagueDelta) && Math.random()<0.05*d.eliteProbMult) return 'brouilleur';
  if(state.vague>=4 && Math.random()<0.05) return 'stronghold';   // forteresse (3 PV, se scinde)
  if(state.vague>=3 && Math.random()<0.06) return 'regenerateur'; // se régénère
  if(state.vague>=3 && Math.random()<0.06) return 'mini_sniper';  // vise l'arrière-garde
  if(state.vague>=2 && Math.random()<0.07) return Math.random()<0.5?'diagonal_d':'diagonal_g'; // trajectoire en diagonale
  if(state.vague>=4 && Math.random()<0.04) return 'void';         // attire tes vaisseaux
  if(state.vague>=3 && Math.random()<0.10) return 'lourd';   // aile blindée à partir de la vague 3
  const r=Math.random(); return r<0.55?'normal':r<0.72?'chasseur':r<0.87?'eclaireur':'bombardier'; }
export function faireAile(c,r,type){ const p=centreCase(c,r); type=type||'normal';
  const img=imgAilePourType(type);
  const vitesse=type==='void'?0:(type==='chasseur'||type==='eclaireur')?2:1;   // la faille (void) est immobile mais attire
  const hp=type==='stronghold'?3:type==='lourd'?3:(type==='bombardier'||type==='porteur'||type==='brouilleur'||type==='regenerateur')?2:1;
  const a={c,r,x:p.x,y:p.y-state.CELL,img,type,vitesse,hp,maxhp:hp};
  if(type==='regenerateur') a.regenTimer=3;
  if(type==='diagonal_d') a.dc=1; if(type==='diagonal_g') a.dc=-1;
  state.ailes.push(a); }
export function apparaitreEscadrille(){ if(state.ailes.length>=state.AILES_MAX) return; const forme=Math.random()<0.5?'ligne':'V', taille=2+Math.floor(Math.random()*2), dep=Math.floor(Math.random()*state.COLS);
  if(forme==='ligne'){ for(let k=0;k<taille;k++){ const c=(dep+k)%state.COLS; if(!aileEn(c,0)&&!(state.boss&&bossEn(c,0))&&state.ailes.length<state.AILES_MAX) faireAile(c,0,typeAile()); } }
  else { const ce=dep; if(!aileEn(ce,0)&&state.ailes.length<state.AILES_MAX) faireAile(ce,0,typeAile());
    for(let k=1;k<=taille;k++){ const cg=ce-k,cd=ce+k,rr=-k; if(state.ailes.length>=state.AILES_MAX) break;
      if(cg>=0&&!aileEn(cg,rr)) faireAile(cg,rr,typeAile()); if(cd<state.COLS&&!aileEn(cd,rr)&&state.ailes.length<state.AILES_MAX) faireAile(cd,rr,typeAile()); } } }

export function tuerAile(a){ state.ailes.splice(state.ailes.indexOf(a),1); state.score++; state.killsThisWave++; state.ultimeJauge=Math.min(state.ultimeSeuil,state.ultimeJauge+1);
  if(a.type==='stronghold'){ // se scinde en 2 mini-navettes sur les cases adjacentes libres
    let poses=0; for(const [dc,dr] of [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[1,1]]){ if(poses>=2) break; const c=a.c+dc, r=a.r+dr; if(c>=0&&c<state.COLS&&r>=0&&r<state.RANGS-1&&!aileEn(c,r)&&!occupe(c,r)){ faireAile(c,r,'mini_navette'); poses++; } } }
  if(Math.random()<0.18+0.08*state.ups.bonusPlus) larguerBonus(a.c,Math.max(0,a.r)); }

/* bonus */
export function larguerBonus(c,r){ const t=['pv','tir','vaisseau'][Math.floor(Math.random()*3)]; const p=centreCase(c,r); state.bonus.push({c,r,type:t,x:p.x,y:p.y,ttl:4}); }
export function ramasser(b){ state.bonus.splice(state.bonus.indexOf(b),1); sonRenfort();
  if(b.type==='pv'){ state.hpCruiser=Math.min(state.HP_MAX,state.hpCruiser+Math.round(state.HP_MAX*0.2)); state.flashRecharge=1; logMsg('Soin !','log-grn'); }
  else if(b.type==='tir'){ state.tirsGratuits++; logMsg('Tir gratuit','log-ylw'); }
  else if(b.type==='vaisseau'){ deployerVaisseau(); logMsg('Renfort !','log-grn'); } }
export function deployerVaisseau(type){ type=type||'normal'; const r=state.RANGS-1,centre=Math.round((state.COLS-1)/2),libres=[]; for(let c=0;c<state.COLS;c++) if(!occupe(c,r)) libres.push(c);
  if(!libres.length) return false; libres.sort((a,b)=>Math.abs(a-centre)-Math.abs(b-centre)); state.fighters.push(nouveauVaisseau(libres[0],r,type,true)); return true; }

export function spawnAsteroide(){
  const s=2+Math.floor(Math.random()*2), rc=n=>Math.floor(Math.random()*n);
  const md=[()=>({c:0,r:1+rc(state.RANGS-2),dc:s,dr:0}),()=>({c:state.COLS-1,r:1+rc(state.RANGS-2),dc:-s,dr:0})];
  const m=md[rc(md.length)](); const p=centreCase(Math.max(0,Math.min(state.COLS-1,m.c)),Math.max(0,m.r));
  const type=Math.random()<0.3?'gros':(Math.random()<0.5?'normal':'rapide');
  const hp=type==='gros'?2:1; const img=type==='gros'?imgAster:imgAster;
  state.asteroides.push({c:m.c,r:m.r,dc:m.dc,dr:m.dr,x:p.x,y:p.y,ang:0,img,hp,maxhp:hp,type});
}
/* place un faux bonus (mimic) dans les rangées centrales */
export function spawnMimic(){
  for(let t=0;t<12;t++){ const c=Math.floor(Math.random()*state.COLS), r=2+Math.floor(Math.random()*Math.max(1,state.RANGS-4));
    if(aileEn(c,r)||occupe(c,r)||obstacleEn(c,r)||bonusEn(c,r)) continue;
    const p=centreCase(c,r); state.bonus.push({c,r,type:'mimic',ttl:99,x:p.x,y:p.y}); return true; }
  return false;
}
/* génère quelques obstacles au début d'un combat, dans les rangées centrales
   (jamais sur la 1re rangée d'apparition ni sur les 2 rangées du bas) */
export function genererObstacles(){
  state.obstacles=[];
  const types=Object.keys(OBSTACLES);
  const d=DIFFICULTES[state.difficulte]||DIFFICULTES.normal;
  const nb=Math.max(0, 1+Math.floor(Math.random()*3)+(d.squadDelta||0));   // 1-3 (± difficulté)
  const rMin=1, rMax=state.RANGS-3;
  let tries=0;
  while(state.obstacles.length<nb && tries<40){
    tries++;
    const c=Math.floor(Math.random()*state.COLS), r=rMin+Math.floor(Math.random()*Math.max(1,rMax-rMin+1));
    if(occupe(c,r)||aileEn(c,r)||obstacleEn(c,r)||asterEn(c,r)) continue;
    const type=types[Math.floor(Math.random()*types.length)];
    const p=centreCase(c,r);
    state.obstacles.push({c,r,type,hp:OBSTACLES[type].hp,maxhp:OBSTACLES[type].hp,x:p.x,y:p.y,variante:Math.random()<0.5,ang:0});
  }
}
export function spawnBoss(){ const c=Math.max(0,Math.min(state.COLS-3,Math.round((state.COLS-3)/2))); const p=centreCase(c+1,0);
  const pool = state.bossVaincus>=3 ? ['canon','sniper','rayon','nuee','blinde'] : ['canon','sniper','rayon'];
  const type=pool[Math.floor(Math.random()*pool.length)];
  let hp=6+Math.floor(state.vague/3); if(type==='rayon') hp+=3; if(type==='blinde') hp+=6;
  state.boss={c,r:0,w:3,h:2,hp,maxhp:hp,x:p.x,y:p.y+state.CELL/2-state.CELL,type,charge:false}; }
