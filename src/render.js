/* =====================================================================
   RENDER — disposition du canvas, fond, dessin de la scène de jeu,
   de la carte de secteur et de l'illustration d'accueil
   ===================================================================== */
import { state, centreCase } from './state.js';
import { COLS_N, RANGS_N, CELL_N, DEP_N, ULTIME_MAX, CAPACITES, OBSTACLES } from './config.js';
import { cuire, PAL, CROISEUR, JOUEUR, ROUGE, AILE, BOSS_GRIDS,
         imgBonusPV, imgBonusTIR, imgBonusVAIS, imgIcoVaisseau, imgIcoTourelle, imgIcoBouclier,
         NFRAMES, framesBoom } from './sprites.js';
import { cuireUnites, imgVaisseau, imgObstacle, getImgMimic, fighterEn, aileEn, estProtege } from './entities.js';
import { casesMouvement, casesMouvementCapacite, analyseTir, cibleLaser, trajectoire } from './combat.js';
import { noeudsAtteignables, posNoeud, COUL_NOEUD, NOM_NOEUD } from './map.js';

const canvas=document.getElementById('jeu'), ctx=canvas.getContext('2d');
ctx.imageSmoothingEnabled=false;
const wrap=document.getElementById('wrap'), scene=document.getElementById('scene');

let imgCroiseur, imgBossMap;
let nebuleuses, planete;
const etoiles=[];

/* =====================================================================
   THÈMES DE SECTEUR — chaque secteur a ses couleurs, son astre et ses
   étoiles (tout en pixel art). Cyclés selon le numéro de secteur.
   ===================================================================== */
const THEMES=[
  { neb:['rgba(90,55,150,.16)','rgba(40,95,150,.14)'],  astre:{kind:'planete',c1:'#7fb0e0',c2:'#3a5f9e',c3:'#22355e'}, star:'#cdd8ff' }, // 1 · bleu
  { neb:['rgba(150,80,50,.16)','rgba(150,100,40,.13)'], astre:{kind:'soleil', c1:'#ffe08a',c2:'#ff9a3d',c3:'#e0561f'}, star:'#ffe6c8' }, // 2 · soleil orange
  { neb:['rgba(45,120,90,.16)','rgba(40,100,120,.13)'], astre:{kind:'planete',c1:'#8fe89a',c2:'#3f9e6a',c3:'#1f5540'}, star:'#c8ffe0' }, // 3 · vert
  { neb:['rgba(120,55,150,.17)','rgba(90,50,150,.14)'], astre:{kind:'planete',c1:'#d0a0ff',c2:'#8a5fce',c3:'#4a2f7a'}, star:'#ecd8ff' }, // 4 · violet
  { neb:['rgba(160,50,70,.17)','rgba(120,40,60,.14)'],  astre:{kind:'soleil', c1:'#ffb0b0',c2:'#ff5a5a',c3:'#a01f2f'}, star:'#ffd6d6' }, // 5 · naine rouge
  { neb:['rgba(40,110,140,.16)','rgba(60,60,150,.13)'], astre:{kind:'planete',c1:'#a0e8ff',c2:'#37a0d6',c3:'#215f8f'}, star:'#d8f4ff' }, // 6 · cyan glacé
];
function themeSecteur(){ return THEMES[(((state.secteur||1)-1)%THEMES.length+THEMES.length)%THEMES.length]; }
/* astre pixel-art : planète ombrée ou soleil rayonnant */
function dessinerAstrePixel(px,py,R,a){
  const pas=Math.max(3,Math.round(R/7)); px=Math.round(px); py=Math.round(py);
  if(a.kind==='soleil'){ ctx.fillStyle=a.c1; const ray=pas;
    for(let k=0;k<8;k++){ const aa=k*Math.PI/4, rx=px+Math.cos(aa)*(R+pas*1.6), ry=py+Math.sin(aa)*(R+pas*1.6); ctx.globalAlpha=.6; ctx.fillRect(Math.round(rx-ray/2),Math.round(ry-ray/2),ray,ray); } ctx.globalAlpha=1; }
  for(let gx=-R;gx<=R;gx+=pas) for(let gy=-R;gy<=R;gy+=pas){ const cx=gx+pas/2, cy=gy+pas/2; if(Math.hypot(cx,cy)>R) continue;
    const s=(cx+cy)/R; ctx.fillStyle = s<-0.4?a.c1 : (s>0.5?a.c3:a.c2); ctx.fillRect(px+gx,py+gy,pas,pas); }
}

/* =====================================================================
   DISPOSITION + FOND
   ===================================================================== */
export function configurer(){
  state.COLS=COLS_N; state.RANGS=RANGS_N; state.CELL=CELL_N; state.PORTEE_DEP=DEP_N;
  const MARGE=14; state.LARGEUR=state.COLS*state.CELL+2*MARGE; state.GX=MARGE; state.GY=86; state.GRID_BAS=state.GY+state.RANGS*state.CELL;
  const sc=Math.ceil(state.LARGEUR/CROISEUR[0].length); imgCroiseur=cuire(CROISEUR,sc); const BANDE=CROISEUR.length*sc;
  imgBossMap={}; for(const kk in BOSS_GRIDS){ const g=BOSS_GRIDS[kk]; imgBossMap[kk]=cuire(g,Math.max(4,Math.round(3*state.CELL/g[0].length))); }
  cuireUnites(state.CELL);
  const actY=state.GRID_BAS+6, actH=44; state.cruiserY=actY+actH+6;
  state.BTN={w:Math.min(320,state.LARGEUR-80),h:50}; state.BTN.x=(state.LARGEUR-state.BTN.w)/2; state.BTN.y=state.cruiserY+BANDE+8; state.HAUTEUR=state.BTN.y+state.BTN.h+50;
  state.ULT={w:Math.min(230,state.LARGEUR-40),h:15}; state.ULT.x=(state.LARGEUR-state.ULT.w)/2; state.ULT.y=22;
  canvas.width=state.LARGEUR; canvas.height=state.HAUTEUR; ctx.imageSmoothingEnabled=false;
  const gap=8, aw=Math.min(150,(state.LARGEUR-2*MARGE-2*gap)/3), tot=aw*3+gap*2, ax=(state.LARGEUR-tot)/2;
  state.ACT=[{id:'vaisseau',lbl:'VAISSEAU',x:ax,y:actY,w:aw,h:actH},{id:'tourelle',lbl:'TOURELLE',x:ax+aw+gap,y:actY,w:aw,h:actH},{id:'bouclier',lbl:'BOUCLIER',x:ax+2*(aw+gap),y:actY,w:aw,h:actH}];
  state.HP_MAX=Math.round(100*state.COLS/7); state.MAX_VAISSEAUX=Math.max(6,Math.round(state.COLS*0.8)); state.AILES_MAX=Math.max(10,Math.round(state.COLS*1.5));
  state.STARTF=Math.max(4,Math.round(state.COLS*0.5)); state.STARTA=Math.max(3,Math.round(state.COLS*0.4)); state.RANG_TIR=Math.max(2,Math.round(state.RANGS*0.25)); state.RECHARGE=Math.round(state.HP_MAX*0.10);
  state.nebuleuses=[{x:state.LARGEUR*0.25,y:state.HAUTEUR*0.30,r:state.LARGEUR*0.55,c1:'rgba(90,55,150,.16)',v:3},{x:state.LARGEUR*0.82,y:state.HAUTEUR*0.18,r:state.LARGEUR*0.5,c1:'rgba(40,95,150,.14)',v:5}];
  planete={x:state.LARGEUR*0.80,y:state.HAUTEUR*0.11,r:Math.min(state.LARGEUR,state.HAUTEUR)*0.10};
}
export function redimensionner(){ const fe=document.fullscreenElement, availW=fe?fe.clientWidth:window.innerWidth, availH=fe?fe.clientHeight:window.innerHeight;
  const ar=canvas.width/canvas.height; let w=availW,h=w/ar; if(h>availH){ h=availH; w=h*ar; } scene.style.width=w+'px'; scene.style.height=h+'px'; }
window.addEventListener('resize',redimensionner);

export function initEtoiles(){ etoiles.length=0; const L=[{n:40,v:4,sz:1,a:.35,col:'#8ea0c8',big:false},{n:34,v:11,sz:1.5,a:.6,col:'#cdd8ff',big:false},{n:16,v:22,sz:2,a:.9,col:'#ffffff',big:true}];
  for(const l of L) for(let i=0;i<l.n;i++) etoiles.push({x:Math.random()*state.LARGEUR,y:Math.random()*state.HAUTEUR,v:l.v,sz:l.sz,a:l.a,col:l.col,big:l.big}); }

/* ---- décors de fond variés selon secteur % 5 ---- */
function fondAmas(th){ let seed=1234567; const rnd=()=>((seed=seed*16807%2147483647)/2147483647);
  const cx=state.LARGEUR*0.5, cy=state.HAUTEUR*0.30, R=state.LARGEUR*0.55;
  for(let i=0;i<170;i++){ const a=rnd()*7, rr=Math.pow(rnd(),0.6)*R, x=cx+Math.cos(a)*rr, y=cy+Math.sin(a)*rr*0.75;
    ctx.globalAlpha=0.3+rnd()*0.6; ctx.fillStyle=rnd()<0.35?th.star:'#cdd8ff'; ctx.fillRect(Math.round(x),Math.round(y),1+(rnd()<0.2?1:0),1); } ctx.globalAlpha=1; }
function fondSpirale(th){ const cx=state.LARGEUR*0.5, cy=state.HAUTEUR*0.30, col=th.neb[0];
  for(let arm=0;arm<2;arm++) for(let i=0;i<90;i++){ const t=i/90, ang=arm*Math.PI+t*6.2, r=t*state.LARGEUR*0.42, x=cx+Math.cos(ang)*r, y=cy+Math.sin(ang)*r*0.68, sz=Math.max(2,Math.round(7*(1-t)));
    ctx.globalAlpha=0.5*(1-t)+0.08; ctx.fillStyle=col; ctx.fillRect(Math.round(x-sz/2),Math.round(y-sz/2),sz,sz); } ctx.globalAlpha=1;
  const g=ctx.createRadialGradient(cx,cy,0,cx,cy,state.LARGEUR*0.13); g.addColorStop(0,th.star); g.addColorStop(1,'rgba(7,11,24,0)'); ctx.fillStyle=g; ctx.fillRect(cx-state.LARGEUR*0.13,cy-state.LARGEUR*0.13,state.LARGEUR*0.26,state.LARGEUR*0.26); }
function fondPlaneteGeante(th){ dessinerAstrePixel(state.LARGEUR*0.9,state.HAUTEUR*0.26,Math.round(state.LARGEUR*0.30),th.astre); }
function fondEtoileGeante(){ const px=state.LARGEUR*0.13, py=state.HAUTEUR*0.10, R=Math.round(state.LARGEUR*0.15);
  const g=ctx.createRadialGradient(px,py,0,px,py,R*3.2); g.addColorStop(0,'rgba(255,205,95,.5)'); g.addColorStop(0.5,'rgba(255,140,50,.18)'); g.addColorStop(1,'rgba(7,11,24,0)'); ctx.fillStyle=g; ctx.fillRect(px-R*3.2,py-R*3.2,R*6.4,R*6.4);
  dessinerAstrePixel(px,py,R,{kind:'soleil',c1:'#ffe4a0',c2:'#ff9a3d',c3:'#e0561f'}); }
function fond(){
  const th=themeSecteur(), s5=((state.secteur||1)%5);
  if(s5===1||s5===4){ state.nebuleuses.forEach((nb,i)=>{ const col=th.neb[i%th.neb.length]; const g=ctx.createRadialGradient(nb.x,nb.y,0,nb.x,nb.y,nb.r); g.addColorStop(0,col); g.addColorStop(1,'rgba(7,11,24,0)'); ctx.fillStyle=g; ctx.fillRect(nb.x-nb.r,nb.y-nb.r,nb.r*2,nb.r*2); }); }
  if(s5===1) dessinerAstrePixel(planete.x,planete.y,Math.round(planete.r),th.astre);   // 1 · nébuleuses + planète
  else if(s5===2) fondAmas(th);            // 2 · amas d'étoiles dense
  else if(s5===3) fondSpirale(th);         // 3 · galaxie spirale
  else if(s5===4) fondPlaneteGeante(th);   // 4 · planète géante
  else fondEtoileGeante();                 // 0 · étoile géante
  for(const s of etoiles){ s.y+=s.v*.016; if(s.y>state.HAUTEUR){s.y=0;s.x=Math.random()*state.LARGEUR;} ctx.globalAlpha=s.a; ctx.fillStyle=s.big?th.star:s.col; ctx.fillRect(s.x,s.y,s.sz,s.sz); } ctx.globalAlpha=1;
}

/* =====================================================================
   CARTE : rendu de la constellation de secteur
   ===================================================================== */
function planetePixel(px,py,R,c1,c2,d){ const pas=Math.max(3,Math.round(R/4)); px=Math.round(px); py=Math.round(py);
  for(let gx=-R;gx<=R;gx+=pas) for(let gy=-R;gy<=R;gy+=pas){ const cx=gx+pas/2, cy=gy+pas/2; if(Math.hypot(cx,cy)>R) continue;
    const s=cx+cy; ctx.fillStyle = s<-R*0.35?c1 : s>R*0.45?d : c2; ctx.fillRect(px+gx,py+gy,pas,pas); } }
function dessinerCarte(t){ const pulse=.5+.5*Math.sin(t/300);
  ctx.clearRect(0,0,state.LARGEUR,state.HAUTEUR); fond();
  ctx.fillStyle='#37e0ff'; ctx.font='16px "Press Start 2P", monospace'; ctx.textAlign='center'; ctx.fillText('SECTEUR '+state.secteur,state.LARGEUR/2,40);
  ctx.fillStyle='#9fb0d8'; ctx.font='8px "Press Start 2P", monospace'; ctx.fillText('CHOISIS TA ROUTE',state.LARGEUR/2,62);
  ctx.strokeStyle='rgba(120,150,220,.3)'; ctx.lineWidth=2; ctx.setLineDash([4,5]);
  for(const lvl of state.carte) for(const nd of lvl){ const p=posNoeud(nd); for(const l of nd.liens){ const q=posNoeud(l); ctx.beginPath(); ctx.moveTo(p.x,p.y); ctx.lineTo(q.x,q.y); ctx.stroke(); } }
  ctx.setLineDash([]);
  const atteign=noeudsAtteignables();
  for(const lvl of state.carte) for(const nd of lvl){ const p=posNoeud(nd), reach=atteign.includes(nd), cur=nd===state.noeudActuel, c=COUL_NOEUD[nd.type];
    ctx.globalAlpha=(nd.visite||reach||cur)?1:.4;
    const R=nd.type==='boss'?18:14;
    if(reach){ ctx.fillStyle='rgba(255,210,61,'+(.25+.2*pulse)+')'; ctx.beginPath(); ctx.arc(p.x,p.y,R+8,0,7); ctx.fill(); }
    planetePixel(p.x,p.y,R,c.c1,c.c2,c.d);
    if(cur){ ctx.strokeStyle='#fff'; ctx.lineWidth=2; ctx.strokeRect(Math.round(p.x-R-4),Math.round(p.y-R-4),(R+4)*2,(R+4)*2); }
    ctx.globalAlpha=1;
    if(reach||cur||nd.visite){ ctx.fillStyle=reach?'#ffd23d':'#8fa0c8'; ctx.font='7px "Press Start 2P", monospace'; ctx.textAlign='center'; ctx.fillText(NOM_NOEUD[nd.type],p.x,p.y+R+15); }
  }
  ctx.textAlign='left'; }

/* Prévisualisation des tirs du boss (ctx doit être en pointillés rouges) */
function dessinerMenaceBoss(pulse){
  const boss=state.boss;
  const ligne=(bc)=>{ if(bc<0||bc>=state.COLS) return; let hf=null; for(let rr=boss.r+2;rr<state.RANGS;rr++){ const f=fighterEn(bc,rr); if(f){hf=f;break;} } const fx=centreCase(bc,boss.r).x; ctx.beginPath(); ctx.moveTo(fx,boss.y); ctx.lineTo(hf?hf.x:fx,hf?hf.y:state.GRID_BAS+8); ctx.stroke(); };
  if(boss.type==='sniper'){ const cibles=[...state.fighters].sort((a,b)=>Math.hypot(a.x-boss.x,a.y-boss.y)-Math.hypot(b.x-boss.x,b.y-boss.y)).slice(0,3); for(const f of cibles){ ctx.beginPath(); ctx.moveTo(boss.x,boss.y); ctx.lineTo(f.x,f.y); ctx.stroke(); } }
  else if(boss.type==='rayon'){ if(boss.charge){ const gx0=Math.max(state.GX,state.GX+(boss.c-1)*state.CELL); ctx.save(); ctx.setLineDash([]); ctx.fillStyle='rgba(55,224,255,'+(.12+.12*pulse)+')'; ctx.fillRect(gx0,state.GY,Math.min(5*state.CELL,state.GX+state.COLS*state.CELL-gx0),state.RANGS*state.CELL); ctx.restore(); } }
  else if(boss.type==='nuee'||boss.type==='blinde'){ ligne(boss.c+1); }
  else { for(let dc=0;dc<3;dc++) ligne(boss.c+dc); }
}

/* =====================================================================
   SCÈNE DE PLANÈTE (nœud sans combat) — décor pixel-art + nos vaisseaux
   ===================================================================== */
function dessinerStructurePlanete(kind){
  const cx=state.LARGEUR/2, cy=state.HAUTEUR*0.30, u=Math.max(4,Math.round(state.CELL*0.16));
  const blk=(gx,gy,gw,gh,col)=>{ ctx.fillStyle=col; ctx.fillRect(Math.round(cx+gx*u),Math.round(cy+gy*u),gw*u,gh*u); };
  if(kind==='hangar'){                       // baie de dock avec un vaisseau à l'intérieur
    blk(-9,-5,18,10,'#2a3550'); blk(-8,-4,16,8,'#141d34');
    blk(-8,-4,16,1,'#37e0ff');
    blk(-1,-3,2,4,'#c3ccd8'); blk(-2,-2,1,3,'#8b95a3'); blk(1,-2,1,3,'#8b95a3');
    for(let i=-8;i<8;i+=3) blk(i,5,2,1,'#4a5a86');
  } else if(kind==='station'){               // plateforme de réparation + croix verte
    blk(-8,3,16,3,'#3a4a6a'); blk(-8,2,16,1,'#4a5a86');
    blk(-1,-4,2,6,'#2fd6a0'); blk(-3,-1,6,2,'#2fd6a0');
  } else if(kind==='tresor'){                // coffre-fort
    blk(-6,-1,12,6,'#8f6a1f'); blk(-6,-3,12,2,'#ffd23d'); blk(-6,1,12,1,'#e0a13d'); blk(-1,1,2,2,'#ffd23d');
  } else if(kind==='forge'){                 // enclume / atelier
    blk(-6,-2,12,2,'#8b95a3'); blk(-3,0,6,3,'#4a5262'); blk(-2,3,4,1,'#3a3f4a'); blk(4,-4,1,3,'#e0a13d');
  } else {                                    // marché / événement : étal avec auvent
    blk(-8,-4,16,2,'#c94257'); blk(-8,-2,16,1,'#ff8f6b'); blk(-7,-1,14,5,'#2a3550'); blk(-5,1,3,3,'#37e0ff'); blk(2,1,3,3,'#ffd23d');
  }
}
function dessinerScenePlanete(t){
  const pulse=.5+.5*Math.sin(t/300);
  ctx.clearRect(0,0,state.LARGEUR,state.HAUTEUR); ctx.save(); fond();
  // zone jouable (rappel du combat) en plus discret
  ctx.fillStyle='rgba(18,28,55,.35)'; ctx.fillRect(state.GX,state.GY,state.COLS*state.CELL,state.RANGS*state.CELL);
  ctx.strokeStyle='rgba(95,135,215,.4)'; ctx.lineWidth=2; ctx.strokeRect(state.GX-1,state.GY-1,state.COLS*state.CELL+2,state.RANGS*state.CELL+2);
  dessinerStructurePlanete(state.scenePlanete?state.scenePlanete.kind:'marche');
  // titre de la planète
  if(state.scenePlanete){ ctx.fillStyle='#37e0ff'; ctx.font='11px "Press Start 2P", monospace'; ctx.textAlign='center'; ctx.fillText(state.scenePlanete.titre,state.LARGEUR/2,state.HAUTEUR*0.58); ctx.fillStyle='rgba(159,176,216,'+(0.6+0.4*pulse)+')'; ctx.font='8px "Press Start 2P", monospace'; ctx.fillText('Choisis en haut de l\'écran',state.LARGEUR/2,state.HAUTEUR*0.58+18); ctx.textAlign='left'; }
  // croiseur + nos vaisseaux (comme en combat)
  ctx.drawImage(imgCroiseur,Math.round((state.LARGEUR-imgCroiseur.width)/2),Math.round(state.cruiserY));
  for(const f of state.fighters){ ctx.drawImage(f.img,Math.round(f.x-f.img.width/2),Math.round(f.y-f.img.height/2)); }
  ctx.restore();
}

/* =====================================================================
   DESSIN — scène de jeu
   ===================================================================== */
export function dessiner(t){
  if(state.phase==='carte'){ dessinerCarte(t); return; }
  if(state.phase==='planete'){ dessinerScenePlanete(t); return; }
  const pulse=.5+.5*Math.sin(t/160);
  ctx.clearRect(0,0,state.LARGEUR,state.HAUTEUR); ctx.save(); if(state.secousse>0) ctx.translate((Math.random()-.5)*state.secousse,(Math.random()-.5)*state.secousse);
  fond();
  // fond du champ de bataille (délimite clairement la zone jouable)
  ctx.fillStyle='rgba(18,28,55,.5)'; ctx.fillRect(state.GX,state.GY,state.COLS*state.CELL,state.RANGS*state.CELL);
  ctx.strokeStyle='rgba(95,135,215,.55)'; ctx.lineWidth=2; ctx.strokeRect(state.GX-1,state.GY-1,state.COLS*state.CELL+2,state.RANGS*state.CELL+2);
  // grille
  ctx.strokeStyle='rgba(120,150,220,.14)'; ctx.lineWidth=1;
  for(let c=0;c<=state.COLS;c++){ ctx.beginPath(); ctx.moveTo(state.GX+c*state.CELL,state.GY); ctx.lineTo(state.GX+c*state.CELL,state.GRID_BAS); ctx.stroke(); }
  for(let r=0;r<=state.RANGS;r++){ ctx.beginPath(); ctx.moveTo(state.GX,state.GY+r*state.CELL); ctx.lineTo(state.GX+state.COLS*state.CELL,state.GY+r*state.CELL); ctx.stroke(); }

  // ---- ZONES DE MENACE (sous les vaisseaux) ----
  for(const ch of state.champs){ ctx.fillStyle='rgba(155,107,214,'+(.12+.08*pulse)+')'; ctx.fillRect(state.GX+ch.c0*state.CELL,state.GY,(ch.c1-ch.c0+1)*state.CELL,state.RANGS*state.CELL); }
  for(const tn of state.trousNoirs){ const g=ctx.createRadialGradient(tn.x,tn.y,2,tn.x,tn.y,state.CELL*1.25); g.addColorStop(0,'#000'); g.addColorStop(.55,'rgba(80,35,130,.7)'); g.addColorStop(1,'rgba(0,0,0,0)'); ctx.fillStyle=g; ctx.beginPath(); ctx.arc(tn.x,tn.y,state.CELL*1.25,0,7); ctx.fill();
    ctx.save(); ctx.translate(tn.x,tn.y); ctx.rotate(tn.ang); ctx.strokeStyle='rgba(190,140,255,.7)'; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(0,0,state.CELL*0.32,0,5); ctx.stroke(); ctx.restore();
    ctx.strokeStyle='rgba(180,120,255,.35)'; ctx.lineWidth=1; ctx.strokeRect(state.GX+(tn.c-1)*state.CELL,state.GY+(tn.r-1)*state.CELL,3*state.CELL,3*state.CELL); }
  // ---- ALERTES (prévention un tour avant) ----
  for(const w of state.menacesWarn){ const al=.45+.45*pulse; ctx.save();
    if(w.kind==='astero'){ ctx.fillStyle='rgba(255,176,61,.16)'; ctx.fillRect(state.GX,state.GY+w.r*state.CELL,state.COLS*state.CELL,state.CELL);
      ctx.fillStyle='rgba(255,176,61,'+al+')'; ctx.font='18px monospace'; ctx.textAlign=w.dir>0?'left':'right'; ctx.fillText('⚠',w.dir>0?state.GX+4:state.GX+state.COLS*state.CELL-4,state.GY+w.r*state.CELL+state.CELL*0.7); }
    else if(w.kind==='trou'){ ctx.strokeStyle='rgba(180,120,255,'+al+')'; ctx.lineWidth=3; ctx.strokeRect(state.GX+(w.c-1)*state.CELL+3,state.GY+(w.r-1)*state.CELL+3,3*state.CELL-6,3*state.CELL-6); ctx.fillStyle='rgba(190,140,255,'+al+')'; ctx.font='16px monospace'; ctx.textAlign='center'; ctx.fillText('⚠',centreCase(w.c,w.r).x,centreCase(w.c,w.r).y+6); }
    else { ctx.fillStyle='rgba(155,107,214,'+(.12+.12*pulse)+')'; ctx.fillRect(state.GX+w.c0*state.CELL,state.GY,(w.c1-w.c0+1)*state.CELL,state.RANGS*state.CELL); ctx.fillStyle='rgba(200,160,255,'+al+')'; ctx.font='11px monospace'; ctx.textAlign='center'; ctx.fillText('⚠ CHAMP',state.GX+((w.c0+w.c1+1)/2)*state.CELL,state.GY+18); }
    ctx.textAlign='left'; ctx.restore(); }

  if(state.phase==='joueur'){
    // survol d'un ennemi -> montre sa future destination
    if(state.hoverCell){ const ha=aileEn(state.hoverCell.c,state.hoverCell.r);
      if(ha){ let steps=ha.vitesse; if(ha.type==='bombardier'&&state.tourCompteur%2===1) steps=0; const dr=Math.min(state.RANGS-1,ha.r+steps);
        ctx.save(); ctx.setLineDash([4,4]); ctx.strokeStyle='rgba(90,160,255,.9)'; ctx.lineWidth=2;
        const cc=centreCase(ha.c,ha.r), dd=centreCase(ha.c,dr); ctx.beginPath(); ctx.moveTo(cc.x,cc.y); ctx.lineTo(dd.x,dd.y); ctx.stroke();
        ctx.fillStyle='rgba(90,160,255,.22)'; ctx.fillRect(state.GX+ha.c*state.CELL+2,state.GY+dr*state.CELL+2,state.CELL-4,state.CELL-4); ctx.restore(); } }
    // trajectoires astéroïdes (orange)
    ctx.save(); ctx.setLineDash([5,6]); ctx.strokeStyle='rgba(255,176,61,'+(.4+.3*pulse)+')'; ctx.lineWidth=3;
    for(const o of state.asteroides){ const pts=trajectoire(o); ctx.beginPath(); ctx.moveTo(o.x,o.y);
      for(const p of pts){ const cc=centreCase(Math.max(0,Math.min(state.COLS-1,p.c)),Math.min(state.RANGS-1,Math.max(0,p.r))); ctx.lineTo(cc.x,p.r>state.RANGS-1?state.GRID_BAS+8:cc.y); } ctx.stroke();
      for(const p of pts){ if(p.r<0||p.r>state.RANGS-1||p.c<0||p.c>state.COLS-1) continue; ctx.fillStyle='rgba(255,176,61,.30)'; ctx.fillRect(state.GX+p.c*state.CELL+2,state.GY+p.r*state.CELL+2,state.CELL-4,state.CELL-4); } }
    ctx.restore();
    // menaces ailes + boss (rouge)
    ctx.save(); ctx.setLineDash([6,7]); ctx.strokeStyle='rgba(255,70,70,'+(.3+.25*pulse)+')'; ctx.lineWidth=3;
    for(const a of state.ailes){ const cb=cibleLaser(a); if(!cb) continue; const tx=cb.type==='fighter'?cb.f.x:a.x, ty=cb.type==='fighter'?cb.f.y:state.GRID_BAS+8; ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(tx,ty); ctx.stroke(); }
    if(state.boss){ dessinerMenaceBoss(pulse); }
    ctx.restore();

    // Prévisualisation mouvement (hover)
    if(state.hoverCell&&state.selection){
      const cc=centreCase(state.hoverCell.c,state.hoverCell.r);
      if(casesMouvement(state.selection).some(p=>p.c===state.hoverCell.c&&p.r===state.hoverCell.r)){
        ctx.globalAlpha=.25; ctx.drawImage(state.selection.img,Math.round(cc.x-state.selection.img.width/2),Math.round(cc.y-state.selection.img.height/2));
        ctx.globalAlpha=1;
      }
    }
  }

  // sélection
  if(state.selection){ const an=analyseTir(state.selection); const sx=state.selection.x, sy=state.selection.y;
    // faisceaux de visée : partent DU vaisseau vers la cible (diagonale pour une colonne latérale)
    ctx.save(); ctx.setLineDash([5,6]); ctx.lineWidth=2;
    for(const bm of an.beams){ if(bm.kind==='allie') continue;   // pas de ligne de tir entre alliés
      const cc=centreCase(bm.c,bm.r1);
      const col = bm.kind==='ennemi' ? 'rgba(255,80,80,.6)'
                : bm.kind==='menace' ? 'rgba(255,176,61,.5)'     // orange = bloqué par une menace
                :                      'rgba(255,120,120,.16)';  // rouge pâle = voie libre
      ctx.strokeStyle=col; ctx.beginPath(); ctx.moveTo(sx,sy); ctx.lineTo(cc.x,cc.y); ctx.stroke(); }
    ctx.restore();
    // cases de déplacement : BLEU (bien distinct du tir en rouge) — étendues pendant un "bond"
    const enBond = state.modeCapacite && state.modeCapacite.kind==='bond' && state.modeCapacite.ship===state.selection;
    ctx.fillStyle=enBond?'rgba(255,210,61,.85)':'rgba(80,150,255,.85)'; for(const p of (enBond?casesMouvementCapacite(state.selection):casesMouvement(state.selection))){ const c2=centreCase(p.c,p.r); ctx.beginPath(); ctx.arc(c2.x,c2.y,7,0,7); ctx.fill(); }
    // cercle rouge UNIQUEMENT sur les ennemis réellement atteignables (ligne de mire dégagée)
    ctx.strokeStyle='#ff5a5a'; ctx.lineWidth=3; for(const a of an.ailesOk){ ctx.beginPath(); ctx.arc(a.x,a.y,state.CELL*0.42,0,7); ctx.stroke(); }
    if(an.mimicsOk) for(const m of an.mimicsOk){ ctx.beginPath(); ctx.arc(m.x,m.y,state.CELL*0.42,0,7); ctx.stroke(); }
    if(an.jam){ ctx.fillStyle='rgba(155,107,214,.9)'; ctx.font='9px "Press Start 2P", monospace'; ctx.textAlign='center'; ctx.fillText('BROUILLÉ',state.selection.x,state.selection.y-state.CELL*0.5); ctx.textAlign='left'; } }
  if(state.modeTourelle){ ctx.strokeStyle='#ffd23d'; ctx.lineWidth=3; for(const a of state.ailes){ ctx.beginPath(); ctx.arc(a.x,a.y,state.CELL*0.42,0,7); ctx.stroke(); } if(state.boss){ ctx.strokeRect(state.GX+state.boss.c*state.CELL+4,state.GY+state.boss.r*state.CELL+4,3*state.CELL-8,2*state.CELL-8); } }

  // croiseur (endommagé visuel)
  const dmgRatio=1-Math.max(0,state.hpCruiser/state.HP_MAX);
  ctx.save(); ctx.shadowColor='rgba(74,163,255,.35)'; ctx.shadowBlur=16;
  ctx.drawImage(imgCroiseur,Math.round((state.LARGEUR-imgCroiseur.width)/2),Math.round(state.cruiserY));
  ctx.restore();
  if(dmgRatio>0.3){ ctx.globalAlpha=dmgRatio*.6; ctx.fillStyle='#e5484d'; ctx.fillRect(Math.round((state.LARGEUR-imgCroiseur.width)/2),Math.round(state.cruiserY),imgCroiseur.width,imgCroiseur.height); ctx.globalAlpha=1; }
  if(dmgRatio>0.6){ ctx.globalAlpha=.4+.2*Math.sin(t/100); ctx.fillStyle='#3a1515'; ctx.fillRect(Math.round((state.LARGEUR-imgCroiseur.width)/2),Math.round(state.cruiserY),imgCroiseur.width,imgCroiseur.height); ctx.globalAlpha=1; }
  if(state.flashCroiseur>0){ ctx.fillStyle='rgba(229,72,77,'+(state.flashCroiseur*.4)+')'; ctx.fillRect(0,state.cruiserY-4,state.LARGEUR,imgCroiseur.height+8); }
  if(state.flashRecharge>0){ ctx.fillStyle='rgba(47,214,160,'+(state.flashRecharge*.4)+')'; ctx.fillRect(0,state.cruiserY-4,state.LARGEUR,imgCroiseur.height+8); }
  if(state.hangar){ const him=imgVaisseau(state.hangar.type); ctx.globalAlpha=.5; ctx.drawImage(him,Math.round(state.LARGEUR/2-him.width/2),Math.round(state.cruiserY+8)); ctx.globalAlpha=1; ctx.fillStyle='#ffd23d'; ctx.font='9px "Press Start 2P", monospace'; ctx.textAlign='center'; ctx.fillText('⏳'+(state.hangar.tours>1?' '+state.hangar.tours:''),state.LARGEUR/2,state.cruiserY+6); ctx.textAlign='left'; }

  // obstacles (débris, station, barrière, mines, gaz, gravité)
  if(state.obstacles) for(const o of state.obstacles){ const def=OBSTACLES[o.type], im=imgObstacle(o), cx=state.GX+o.c*state.CELL+state.CELL/2, cy=state.GY+o.r*state.CELL+state.CELL/2;
    if(o.type==='gaz'){ ctx.fillStyle='rgba(140,255,90,'+(.14+.10*pulse)+')'; ctx.fillRect(state.GX+o.c*state.CELL,state.GY+o.r*state.CELL,state.CELL,state.CELL);
      ctx.fillStyle='rgba(140,255,90,'+(.4+.3*pulse)+')'; for(let k=0;k<4;k++){ const a=k*1.6+t/500, rr=state.CELL*0.28; ctx.fillRect(Math.round(cx+Math.cos(a)*rr-1),Math.round(cy+Math.sin(a)*rr-1),3,3); } }
    else if(o.type==='gravite'){ ctx.fillStyle='rgba(74,163,255,'+(.12+.08*pulse)+')'; ctx.fillRect(state.GX+o.c*state.CELL,state.GY+o.r*state.CELL,state.CELL,state.CELL);
      ctx.strokeStyle='rgba(120,180,255,'+(.5+.3*pulse)+')'; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(cx,cy,state.CELL*0.3*(0.6+0.4*Math.sin(t/300)),0,7); ctx.stroke(); }
    else if(o.type==='mines'){ ctx.fillStyle='rgba(229,72,77,'+(.10+.08*pulse)+')'; ctx.fillRect(state.GX+o.c*state.CELL,state.GY+o.r*state.CELL,state.CELL,state.CELL);
      for(const[dx,dy]of[[-.22,-.22],[.22,-.22],[-.22,.22],[.22,.22],[0,0]]){ ctx.fillStyle='#e5484d'; ctx.beginPath(); ctx.arc(cx+dx*state.CELL,cy+dy*state.CELL,3,0,7); ctx.fill(); ctx.strokeStyle='#8f2b2f'; ctx.lineWidth=1; for(let a=0;a<4;a++){ ctx.beginPath(); ctx.moveTo(cx+dx*state.CELL,cy+dy*state.CELL); ctx.lineTo(cx+dx*state.CELL+Math.cos(a*1.57)*5,cy+dy*state.CELL+Math.sin(a*1.57)*5); ctx.stroke(); } } }
    else if(im){ ctx.drawImage(im,Math.round(cx-im.width/2),Math.round(cy-im.height/2)); }
    // PV des obstacles destructibles à plusieurs PV (station)
    if(def.destructible && (o.maxhp||def.hp)>1){ const n=o.maxhp||def.hp, sq=5, gap=2, tot=n*sq+(n-1)*gap, bx=Math.round(cx-tot/2), by=Math.round(cy+state.CELL*0.32);
      for(let i=0;i<n;i++){ ctx.fillStyle=i<o.hp?'#ff2a5a':'#4a5262'; ctx.fillRect(bx+i*(sq+gap),by,sq,sq); } }
  }

  // bonus (le mimic se déguise en bonus jaune)
  for(const b of state.bonus){ const img=b.type==='mimic'?getImgMimic():b.type==='pv'?imgBonusPV:b.type==='tir'?imgBonusTIR:imgBonusVAIS; ctx.globalAlpha=.9+.1*pulse; ctx.drawImage(img,Math.round(b.x-img.width/2),Math.round(b.y-img.height/2)); ctx.globalAlpha=1;
    if(b.type==='mimic'){ ctx.strokeStyle='rgba(255,60,80,'+(.35+.35*pulse)+')'; ctx.lineWidth=2; const s=state.CELL*0.42; ctx.strokeRect(Math.round(b.x-s),Math.round(b.y-s),Math.round(s*2),Math.round(s*2)); } }

  // ailes + barres de vie
  for(const a of state.ailes){
    if(a.r>=state.RANGS-2){ ctx.fillStyle='rgba(229,72,77,.22)'; ctx.fillRect(state.GX+a.c*state.CELL,state.GY+a.r*state.CELL,state.CELL,state.CELL); }
    ctx.drawImage(a.img,Math.round(a.x-a.img.width/2),Math.round(a.y-a.img.height/2));
    if(a.type==='porteur'){ ctx.strokeStyle='rgba(255,210,61,'+(.4+.3*pulse)+')'; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(a.x,a.y,state.CELL*0.52,0,7); ctx.stroke(); }
    else if(a.type==='brouilleur'){ ctx.strokeStyle='rgba(155,107,214,'+(.4+.3*pulse)+')'; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(a.x,a.y,state.CELL*0.52,0,7); ctx.stroke(); }
    else if(a.type==='regenerateur'){ ctx.fillStyle='rgba(140,255,90,'+(.5+.5*pulse)+')'; ctx.fillRect(Math.round(a.x-1),Math.round(a.y-a.img.height/2-9),3,7); ctx.fillRect(Math.round(a.x-4),Math.round(a.y-a.img.height/2-7),9,3); }   // croix verte clignotante
    else if(a.type==='void'){ ctx.strokeStyle='rgba(107,63,160,'+(.4+.4*pulse)+')'; ctx.lineWidth=2; for(let k=1;k<=2;k++){ ctx.beginPath(); ctx.arc(a.x,a.y,state.CELL*0.4*k*(0.7+0.3*Math.sin(t/240+k)),0,7); ctx.stroke(); } }
    if(a.bouclier){ ctx.strokeStyle='rgba(255,210,61,.85)'; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(a.x,a.y+2,state.CELL*0.4,Math.PI*0.15,Math.PI*0.85); ctx.stroke(); }
    else if(estProtege(a)){ ctx.fillStyle='rgba(155,107,214,.18)'; ctx.beginPath(); ctx.arc(a.x,a.y,state.CELL*0.42,0,7); ctx.fill(); }
    // PV : petits carrés (rouge = plein, gris = vide) pour les ennemis blindés (maxhp>1)
    if(a.maxhp>1){ const n=a.maxhp, sq=5, gap=2, tot=n*sq+(n-1)*gap, bx=Math.round(a.x-tot/2), by=Math.round(a.y+a.img.height/2+2);
      for(let i=0;i<n;i++){ ctx.fillStyle=i<a.hp?'#ff2a5a':'#4a5262'; ctx.fillRect(bx+i*(sq+gap),by,sq,sq);
        ctx.strokeStyle='rgba(0,0,0,.4)'; ctx.lineWidth=1; ctx.strokeRect(bx+i*(sq+gap)+.5,by+.5,sq-1,sq-1); } }
  }
  // marqueurs cibles alliées
  if(state.phase==='joueur'){ ctx.strokeStyle='rgba(255,70,70,'+(.55+.4*pulse)+')'; ctx.lineWidth=3; const marque=(x,y)=>{ ctx.beginPath(); ctx.moveTo(x-9,y-9); ctx.lineTo(x+9,y+9); ctx.moveTo(x+9,y-9); ctx.lineTo(x-9,y+9); ctx.stroke(); };
    for(const a of state.ailes){ const cb=cibleLaser(a); if(cb&&cb.type==='fighter') marque(cb.f.x,cb.f.y); }
    if(state.boss){ for(let dc=0;dc<3;dc++){ const bc=state.boss.c+dc; let hf=null; for(let rr=state.boss.r+2;rr<state.RANGS;rr++){ const f=fighterEn(bc,rr); if(f){hf=f;break;} } if(hf) marque(hf.x,hf.y); } } }

  // boss (sprite + contour + étiquette selon le type)
  if(state.boss){ const im=imgBossMap[state.boss.type]||imgBossMap.canon;
    const tint={canon:'#ff5a5a',sniper:'#9b6bd6',rayon:'#37e0ff',nuee:'#5fce6a',blinde:'#8b95a3'}[state.boss.type]||'#ff5a5a';
    ctx.drawImage(im,Math.round(state.boss.x-im.width/2),Math.round(state.boss.y-im.height/2));
    ctx.strokeStyle=tint; ctx.lineWidth=2; ctx.strokeRect(state.GX+state.boss.c*state.CELL+3,state.GY+state.boss.r*state.CELL+3,3*state.CELL-6,2*state.CELL-6);
    const bw=3*state.CELL-14, bx=state.GX+state.boss.c*state.CELL+7, by=state.GY+state.boss.r*state.CELL-8; ctx.fillStyle='#3a1520'; ctx.fillRect(bx,by,bw,6); ctx.fillStyle=tint; ctx.fillRect(bx,by,bw*Math.max(0,state.boss.hp/state.boss.maxhp),6);
    const noms={canon:'CANONNIER',sniper:'SNIPER',rayon:'RAYON',nuee:'NUÉE',blinde:'BLINDÉ'}; ctx.fillStyle=tint; ctx.font='7px "Press Start 2P", monospace'; ctx.textAlign='center'; ctx.fillText('BOSS '+noms[state.boss.type]+(state.boss.type==='rayon'&&state.boss.charge?' ⚡':''),state.boss.x,by-4); ctx.textAlign='left'; }

  // astéroïdes (le gros est plus grand ; PV affichés s'il est blindé)
  for(const o of state.asteroides){ const sc=o.type==='gros'?1.4:o.type==='essaim'?0.7:1;
    ctx.save(); ctx.translate(o.x,o.y); ctx.rotate(o.ang); ctx.drawImage(o.img,-o.img.width*sc/2,-o.img.height*sc/2,o.img.width*sc,o.img.height*sc); ctx.restore();
    if(o.maxhp>1){ const n=o.maxhp, sq=4, gap=2, tot=n*sq+(n-1)*gap, bx=Math.round(o.x-tot/2), by=Math.round(o.y+o.img.height*sc/2+1); for(let i=0;i<n;i++){ ctx.fillStyle=i<o.hp?'#ff2a5a':'#4a5262'; ctx.fillRect(bx+i*(sq+gap),by,sq,sq); } } }

  // trails (traînées lasers)
  for(const l of state.trails){ ctx.globalAlpha=Math.max(0,.35-l.t/.35); const lw=l.gros?4:2; ctx.strokeStyle=l.ennemi?'#ff7a5a':'#bff3ff'; ctx.lineWidth=lw; ctx.beginPath(); ctx.moveTo(l.x1,l.y1); ctx.lineTo(l.x2,l.y2); ctx.stroke(); ctx.globalAlpha=1; }

  // lasers
  for(const l of state.lasers){ ctx.globalAlpha=1-l.t/.16; const lw=l.gros?5:3; ctx.strokeStyle=l.ennemi?'#ff7a5a':'#bff3ff'; ctx.lineWidth=lw; ctx.beginPath(); ctx.moveTo(l.x1,l.y1); ctx.lineTo(l.x2,l.y2); ctx.stroke();
    ctx.strokeStyle=l.ennemi?'#e5484d':'#37e0ff'; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(l.x1,l.y1); ctx.lineTo(l.x2,l.y2); ctx.stroke(); ctx.globalAlpha=1; }

  // vaisseaux joueur
  for(const f of state.fighters){ if(f===state.selection){ ctx.strokeStyle='rgba(255,210,61,'+(.6+.4*pulse)+')'; ctx.lineWidth=4; const cc=centreCase(f.c,f.r); ctx.strokeRect(cc.x-state.CELL/2+5,cc.y-state.CELL/2+5,state.CELL-10,state.CELL-10); }
    // améliorations du Vaisseau Rouge : aura élargie (rouge_range) + réacteurs arrière (rouge_back)
    if(f.type==='rouge'&&state.ups){ if(state.ups.rouge_range){ ctx.strokeStyle='rgba(229,72,77,'+(.25+.2*pulse)+')'; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(f.x,f.y,state.CELL*0.62,0,7); ctx.stroke(); }
      if(state.ups.rouge_back){ ctx.fillStyle='#ff8a3d'; for(const dx of [-6,0,6]){ ctx.fillRect(Math.round(f.x+dx-1),Math.round(f.y+f.img.height/2+1),3,4); } } }
    ctx.globalAlpha=f.used?.4:1; ctx.drawImage(f.img,Math.round(f.x-f.img.width/2),Math.round(f.y-f.img.height/2)); ctx.globalAlpha=1;
    if(f.type==='rouge'){ for(let i=0;i<f.hp;i++){ ctx.fillStyle='#ff5a5a'; ctx.fillRect(f.x-8+i*10,f.y-f.img.height/2-8,6,6); } }
    if(f.type==='bouclier'){ for(let i=0;i<f.hp;i++){ ctx.fillStyle='#4aa3ff'; ctx.fillRect(f.x-9+i*7,f.y-f.img.height/2-8,5,5); } }
    // grade du vaisseau (kills) : 1-3 points jaunes puis étoile dorée à 15+
    { const k=f.kills||0; if(k>=1){ const gy=Math.round(f.y-f.img.height/2-16);
      if(k>=15){ ctx.fillStyle='#ffd23d'; ctx.beginPath(); for(let i=0;i<10;i++){ const ang=-Math.PI/2+i*Math.PI/5, rr=(i%2)?2.4:5.5, x=f.x+Math.cos(ang)*rr, y=gy+Math.sin(ang)*rr; i?ctx.lineTo(x,y):ctx.moveTo(x,y); } ctx.closePath(); ctx.fill(); ctx.strokeStyle='#fff6c0'; ctx.lineWidth=1; ctx.stroke(); }
      else { const n=k<5?1:k<10?2:3; ctx.fillStyle='#ffe14d'; for(let i=0;i<n;i++){ ctx.beginPath(); ctx.arc(f.x-(n-1)*3.5+i*7, gy, 2, 0, 7); ctx.fill(); } } } }
    // pastille de capacité active disponible
    if(CAPACITES[f.type] && !f.capUsed){ const bx=f.x+f.img.width/2-2, by=f.y-f.img.height/2-2;
      ctx.fillStyle='rgba(255,210,61,'+(0.7+0.3*pulse)+')'; ctx.beginPath(); ctx.arc(bx,by,4,0,7); ctx.fill();
      ctx.strokeStyle='#fff'; ctx.lineWidth=1; ctx.stroke(); } }

  // explosions + particules + éclairage
  for(const e of state.explosions){ const idx=Math.min(NFRAMES-1,Math.floor(e.t/0.05)), im=framesBoom[idx], dw=im.width*e.scale, dh=im.height*e.scale;
    // Éclairage dynamique autour de l'explosion
    const glow=ctx.createRadialGradient(e.x,e.y,0,e.x,e.y,dw); glow.addColorStop(0,'rgba(255,138,61,'+(.3*(1-e.t/(NFRAMES*0.05)))+')'); glow.addColorStop(1,'rgba(255,138,61,0)');
    ctx.fillStyle=glow; ctx.fillRect(e.x-dw,e.y-dw,dw*2,dh*2);
    ctx.drawImage(im,e.x-dw/2,e.y-dh/2,dw,dh); }
  for(const p of state.particules){ ctx.globalAlpha=Math.max(0,1-p.t/p.vie); ctx.fillStyle=p.c; ctx.fillRect(p.x,p.y,p.taille,p.taille); } ctx.globalAlpha=1;

  // Combo display
  if(state.comboCount>1){ ctx.fillStyle='rgba(255,210,61,'+(0.7+0.3*pulse)+')'; ctx.font='11px "Press Start 2P", monospace'; ctx.textAlign='center'; ctx.fillText('x'+state.comboCount+' COMBO',state.LARGEUR/2,state.GY-12); ctx.textAlign='left'; }

  if(state.ondeChoc>0){ const cx=state.LARGEUR/2, cy=state.cruiserY, R=(1-state.ondeChoc)*Math.max(state.LARGEUR,state.HAUTEUR)*1.15; ctx.strokeStyle='rgba(255,210,61,'+(state.ondeChoc*0.85)+')'; ctx.lineWidth=2+10*state.ondeChoc; ctx.beginPath(); ctx.arc(cx,cy,R,0,7); ctx.stroke(); ctx.strokeStyle='rgba(255,255,255,'+(state.ondeChoc*0.5)+')'; ctx.lineWidth=3; ctx.beginPath(); ctx.arc(cx,cy,R*0.82,0,7); ctx.stroke(); }

  ctx.restore();

  // ================= HUD =================
  const hudBase=state.HAUTEUR-18;
  const bx=44,by=hudBase-16,bw=Math.min(300,state.LARGEUR-210),bh=16,ratio=Math.max(0,state.hpCruiser/state.HP_MAX);
  arrondi(bx,by,bw,bh,5); ctx.fillStyle='#1a2340'; ctx.fill();
  let coul=ratio>.5?'#2fd6a0':(ratio>.25?'#ffd23d':'#e5484d'); if(ratio<=.25) coul='rgba(229,72,77,'+(.55+.45*pulse)+')';
  ctx.fillStyle=coul; ctx.fillRect(bx+2,by+2,Math.max(0,(bw-4)*ratio),bh-4);
  if(state.flashCroiseur>0){ ctx.fillStyle='rgba(255,255,255,'+(state.flashCroiseur*.5)+')'; ctx.fillRect(bx+2,by+2,bw-4,bh-4); }
  arrondi(bx,by,bw,bh,5); ctx.strokeStyle='#4a5a86'; ctx.lineWidth=2; ctx.stroke();
  ctx.fillStyle='#9fb0d8'; ctx.font='10px "Press Start 2P", monospace'; ctx.textAlign='left'; ctx.fillText('PV',14,hudBase-3);
  ctx.fillStyle='#ffd23d'; ctx.font='15px "Press Start 2P", monospace'; ctx.textAlign='right'; ctx.fillText(String(state.score).padStart(3,'0'),state.LARGEUR-14,hudBase-2);
  ctx.font='8px "Press Start 2P", monospace'; ctx.textAlign='left'; ctx.fillStyle='#7fd0b0'; ctx.fillText('VAGUE '+state.vague,14,hudBase-32);
  ctx.textAlign='center'; ctx.font='9px "Press Start 2P", monospace'; ctx.fillStyle=state.phase==='joueur'?'#37e0ff':'#ff8f6b';
  ctx.fillText(state.phase==='joueur'?(state.modeTourelle?'CHOISIS UNE CIBLE':'À TOI DE JOUER'):'LES ENNEMIS ATTAQUENT…',state.LARGEUR/2,hudBase-32); ctx.textAlign='left';
  if(state.objectifVague){ ctx.font='8px "Press Start 2P", monospace'; ctx.textAlign='center'; ctx.fillStyle='rgba(127,208,176,.95)'; ctx.fillText('» '+state.objectifVague.texte,state.LARGEUR/2,15); ctx.textAlign='left'; }
  { const seuil=state.ultimeSeuil||ULTIME_MAX; const pr=Math.min(1,state.ultimeJauge/seuil), pret=state.ultimeJauge>=seuil;
    arrondi(state.ULT.x,state.ULT.y,state.ULT.w,state.ULT.h,7); ctx.fillStyle='#141d34'; ctx.fill();
    ctx.fillStyle=pret?('rgba(255,210,61,'+(0.6+0.4*pulse)+')'):'#7a3fd6'; ctx.fillRect(state.ULT.x+2,state.ULT.y+2,(state.ULT.w-4)*pr,state.ULT.h-4);
    arrondi(state.ULT.x,state.ULT.y,state.ULT.w,state.ULT.h,7); ctx.strokeStyle=pret?'#ffd23d':'#4a5a86'; ctx.lineWidth=2; ctx.stroke();
    ctx.fillStyle=pret?'#241a00':'#cbd6f0'; ctx.font='8px "Press Start 2P", monospace'; ctx.textAlign='center';
    ctx.fillText(pret?'⚡ FRAPPE ORBITALE':'ULTIME '+Math.floor(pr*100)+'%',state.LARGEUR/2,state.ULT.y+state.ULT.h-4); ctx.textAlign='left'; }

  // boutons d'action
  for(const a of state.ACT){ const dispo=state.phase!=='joueur'?false:a.id==='tourelle'?(!state.actionFaite||state.tirsGratuits>0):a.id==='vaisseau'?(!state.actionFaite&&state.fighters.length<state.MAX_VAISSEAUX&&!state.hangar):a.id==='bouclier'?(!state.actionFaite&&state.boucliersRestants>0):(!state.actionFaite); const vise=a.id==='tourelle'&&state.modeTourelle;
    arrondi(a.x,a.y,a.w,a.h,9); ctx.fillStyle=vise?'#e5a13d':(dispo?'#274a8a':'#243048'); ctx.fill(); ctx.strokeStyle=vise?'#ffd23d':'#3b5aa0'; ctx.lineWidth=2; ctx.stroke();
    if(a.anim>0){ arrondi(a.x,a.y,a.w,a.h,9); ctx.fillStyle='rgba(255,255,255,'+(a.anim*0.5)+')'; ctx.fill(); }
    ctx.fillStyle=dispo||vise?'#e8eefc':'#5b6580'; ctx.textAlign='center';
    let lbl=a.lbl; if(a.id==='tourelle'&&state.tirsGratuits>0) lbl='TOUR.x'+(state.tirsGratuits+(state.actionFaite?0:1));
    const ico=a.id==='vaisseau'?imgIcoVaisseau:a.id==='tourelle'?imgIcoTourelle:imgIcoBouclier;
    const cx=a.x+a.w/2, iy=a.y+5;
    if(ico){ ctx.save(); ctx.globalAlpha=(dispo||vise)?1:0.4;
      if(a.id==='vaisseau'){ const dy=Math.sin(t/280)*2.5; ctx.drawImage(ico,Math.round(cx-ico.width/2),Math.round(iy+dy)); }          // décollage : va-et-vient
      else if(a.id==='tourelle'){ ctx.translate(cx,iy+ico.height/2); ctx.rotate(Math.sin(t/380)*0.5); ctx.drawImage(ico,-ico.width/2,-ico.height/2); }  // pivote
      else { const s=1+0.18*(0.5+0.5*Math.sin(t/240)), w=ico.width*s, h=ico.height*s; ctx.drawImage(ico,cx-w/2,iy+ico.height/2-h/2,w,h); }             // bouclier : pulse
      ctx.restore(); }
    ctx.font='8px "Press Start 2P", monospace'; ctx.fillText(lbl,cx,a.y+a.h-7); ctx.textAlign='left'; }

  const actif=state.phase==='joueur'; arrondi(state.BTN.x,state.BTN.y,state.BTN.w,state.BTN.h,12); ctx.fillStyle=actif?'#2fd6a0':'#26424a'; ctx.fill();
  ctx.fillStyle=actif?'#07240f':'#4b5f66'; ctx.font='13px "Press Start 2P", monospace'; ctx.textAlign='center'; ctx.fillText('FIN DU TOUR ▶',state.BTN.x+state.BTN.w/2,state.BTN.y+state.BTN.h/2+5); ctx.textAlign='left';


  // bannière de vague
  if(state.banniereTimer>0){ const al=Math.min(1,state.banniereTimer/0.6); ctx.globalAlpha=al; ctx.fillStyle='rgba(7,11,24,.55)'; ctx.fillRect(0,state.HAUTEUR*0.34,state.LARGEUR,64);
    ctx.fillStyle='#ffd23d'; ctx.font='15px "Press Start 2P", monospace'; ctx.textAlign='center'; ctx.fillText(state.banniereTxt,state.LARGEUR/2,state.HAUTEUR*0.34+40); ctx.textAlign='left'; ctx.globalAlpha=1; }

  // Transition phase
  if(state.phase==='ennemi'&&state.lockTimer>0.7){ ctx.fillStyle='rgba(229,72,77,'+(.2*(state.lockTimer-0.7)/0.2)+')'; ctx.fillRect(0,0,state.LARGEUR,state.HAUTEUR); }
}
function arrondi(x,y,w,h,r){ ctx.beginPath(); ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r); ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath(); }

/* =====================================================================
   ILLUSTRATION PIXEL ART DE L'ACCUEIL
   ===================================================================== */
export function dessinerIllustration(){
  const cv=document.getElementById('illus'); if(!cv) return; const c=cv.getContext('2d'); c.imageSmoothingEnabled=false;
  const W=cv.width,H=cv.height; c.clearRect(0,0,W,H);
  c.fillStyle='#080d1c'; c.fillRect(0,0,W,H);
  let seed=7; const rnd=()=>((seed=seed*16807%2147483647)/2147483647);
  for(let i=0;i<40;i++){ const x=Math.floor(rnd()*W),y=Math.floor(rnd()*H),b=120+Math.floor(rnd()*135); c.fillStyle='rgb('+b+','+b+',255)'; c.fillRect(x,y,1+(rnd()<0.2?1:0),1); }
  // planète en pixel art (coin haut droit)
  const px=W-34,py=30,R=22,pas=4;
  for(let gx=-R;gx<=R;gx+=pas) for(let gy=-R;gy<=R;gy+=pas){ const cx=gx+pas/2,cy=gy+pas/2; if(Math.hypot(cx,cy)>R) continue;
    const t=cx+cy; c.fillStyle=t<-R*0.35?'#7ea8e0':t>R*0.45?'#1e2f55':'#4a6ea8'; c.fillRect(px+gx,py+gy,pas,pas); }
  const draw=(g,ox,oy,sc)=>{ for(let y=0;y<g.length;y++){ const row=g[y]; for(let x=0;x<row.length;x++){ const col=PAL[row[x]]; if(!col) continue; c.fillStyle=col; c.fillRect(ox+x*sc,oy+y*sc,sc,sc); } } };
  draw(AILE,44,4,2); draw(AILE,W-92,10,2);                 // ennemis en haut
  draw(JOUEUR,26,72,3); draw(ROUGE,W/2-16,64,3); draw(JOUEUR,W-56,72,3);  // escadrille
  draw(CROISEUR,Math.round((W-CROISEUR[0].length*3)/2),H-30,3);           // croiseur en bas
  // lasers
  c.strokeStyle='#37e0ff'; c.lineWidth=2; c.beginPath(); c.moveTo(41,72); c.lineTo(48,26); c.moveTo(W-46,72); c.lineTo(W-84,32); c.stroke();
}
