/* =====================================================================
   ENTITÉS — création, prédicats et cycle de vie (vaisseaux, ailes,
   astéroïdes, boss, bonus)
   ===================================================================== */
import { state, centreCase } from './state.js';
import { ULTIME_MAX, DIFFICULTES } from './config.js';
import { cuireFit, JOUEUR, ROUGE, JOUEUR_RAPIDE, JOUEUR_BOMBER, JOUEUR_BOUCLIER,
         AILE, CHASSEUR, BOMBARDIER, ECLAIREUR, ASTER, AILE_PORTEUR, AILE_BROUILLEUR } from './sprites.js';
import { sonRenfort } from './audio.js';
import { logMsg } from './ui.js';

/* images des unités, recuites à la taille de case courante (voir cuireUnites) */
let imgJoueur,imgRouge,imgAile,imgAster,imgChasseur,imgBomber,imgEclaireur,imgVRapide,imgVBombardier,imgVBouclier,imgPorteur,imgBrouilleur;
export function cuireUnites(CELL){
  imgJoueur=cuireFit(JOUEUR,CELL); imgRouge=cuireFit(ROUGE,CELL); imgAile=cuireFit(AILE,CELL); imgAster=cuireFit(ASTER,CELL);
  imgChasseur=cuireFit(CHASSEUR,CELL); imgBomber=cuireFit(BOMBARDIER,CELL); imgEclaireur=cuireFit(ECLAIREUR,CELL);
  imgVRapide=cuireFit(JOUEUR_RAPIDE,CELL); imgVBombardier=cuireFit(JOUEUR_BOMBER,CELL); imgVBouclier=cuireFit(JOUEUR_BOUCLIER,CELL);
  imgPorteur=cuireFit(AILE_PORTEUR,CELL); imgBrouilleur=cuireFit(AILE_BROUILLEUR,CELL);
}
export function getImgAster(){ return imgAster; }
export function imgVaisseau(type){ return type==='rouge'?imgRouge : type==='rapide'?imgVRapide : type==='bombardier'?imgVBombardier : type==='bouclier'?imgVBouclier : imgJoueur; }
export function nouveauVaisseau(c,r,type,depuisBas){ const p=centreCase(c,r); type=type||'normal';
  const hp = type==='rouge'?2 : type==='bouclier'?3 : 1;
  return {c,r,x:p.x,y:depuisBas?p.y+50:p.y,used:false,type,hp,img:imgVaisseau(type),capUsed:false,provoque:false}; }
export function spread(n){ const out=[]; for(let i=0;i<n;i++) out.push(Math.max(0,Math.min(state.COLS-1,Math.round((i+0.5)*state.COLS/n-0.5)))); return [...new Set(out)]; }

export function fighterEn(c,r){ return state.fighters.find(f=>f.c===c&&f.r===r); }
export function aileEn(c,r){ return state.ailes.find(a=>a.c===c&&a.r===r); }
export function asterEn(c,r){ return state.asteroides.find(a=>a.c===c&&a.r===r); }
export function bonusEn(c,r){ return state.bonus.find(b=>b.c===c&&b.r===r); }
export function bossEn(c,r){ return state.boss&&c>=state.boss.c&&c<=state.boss.c+2&&r>=state.boss.r&&r<=state.boss.r+1; }
export function occupe(c,r){ return fighterEn(c,r)||aileEn(c,r)||bossEn(c,r); }
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
  const r=Math.random(); return r<0.55?'normal':r<0.72?'chasseur':r<0.87?'eclaireur':'bombardier'; }
export function faireAile(c,r,type){ const p=centreCase(c,r); type=type||'normal';
  const img=type==='chasseur'?imgChasseur:type==='bombardier'?imgBomber:type==='eclaireur'?imgEclaireur:type==='porteur'?imgPorteur:type==='brouilleur'?imgBrouilleur:imgAile;
  const vitesse=(type==='chasseur'||type==='eclaireur')?2:1, hp=(type==='bombardier'||type==='porteur'||type==='brouilleur')?2:1;
  state.ailes.push({c,r,x:p.x,y:p.y-state.CELL,img,type,vitesse,hp,maxhp:hp}); }
export function apparaitreEscadrille(){ if(state.ailes.length>=state.AILES_MAX) return; const forme=Math.random()<0.5?'ligne':'V', taille=2+Math.floor(Math.random()*2), dep=Math.floor(Math.random()*state.COLS);
  if(forme==='ligne'){ for(let k=0;k<taille;k++){ const c=(dep+k)%state.COLS; if(!aileEn(c,0)&&!(state.boss&&bossEn(c,0))&&state.ailes.length<state.AILES_MAX) faireAile(c,0,typeAile()); } }
  else { const ce=dep; if(!aileEn(ce,0)&&state.ailes.length<state.AILES_MAX) faireAile(ce,0,typeAile());
    for(let k=1;k<=taille;k++){ const cg=ce-k,cd=ce+k,rr=-k; if(state.ailes.length>=state.AILES_MAX) break;
      if(cg>=0&&!aileEn(cg,rr)) faireAile(cg,rr,typeAile()); if(cd<state.COLS&&!aileEn(cd,rr)&&state.ailes.length<state.AILES_MAX) faireAile(cd,rr,typeAile()); } } }

export function tuerAile(a){ state.ailes.splice(state.ailes.indexOf(a),1); state.score++; state.killsThisWave++; state.ultimeJauge=Math.min(ULTIME_MAX,state.ultimeJauge+1); if(Math.random()<0.18+0.08*state.ups.bonusPlus) larguerBonus(a.c,Math.max(0,a.r)); }

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
export function spawnBoss(){ const c=Math.max(0,Math.min(state.COLS-3,Math.round((state.COLS-3)/2))); const p=centreCase(c+1,0);
  const pool = state.bossVaincus>=3 ? ['canon','sniper','rayon','nuee','blinde'] : ['canon','sniper','rayon'];
  const type=pool[Math.floor(Math.random()*pool.length)];
  let hp=6+Math.floor(state.vague/3); if(type==='rayon') hp+=3; if(type==='blinde') hp+=6;
  state.boss={c,r:0,w:3,h:2,hp,maxhp:hp,x:p.x,y:p.y+state.CELL/2-state.CELL,type,charge:false}; }
