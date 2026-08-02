/* =====================================================================
   RENDER — disposition du canvas, fond, dessin de la scène de jeu,
   de la carte de secteur et de l'illustration d'accueil
   ===================================================================== */
import { state, centreCase } from './state.js';
import { COLS_N, RANGS_N, CELL_N, DEP_N, ULTIME_MAX, CAPACITES, OBSTACLES, SKINS_CROISEUR } from './config.js';
import { cuire, cuireFit, PAL, CROISEUR, JOUEUR, ROUGE, AILE, BOSS_GRIDS, ENEMY_BASE, TOURELLE_GRIDS,
         imgBonusPV, imgBonusTIR, imgBonusVAIS, imgIcoVaisseau, imgIcoTourelle, imgIcoBouclier,
         NFRAMES, framesBoom, iconImage } from './sprites.js';
import { cuireUnites, imgVaisseau, imgObstacle, imgsDebrisVaisseau, getImgMimic, fighterEn, aileEn, estProtege } from './entities.js';
import { casesMouvement, casesMouvementCapacite, analyseTir, cibleLaser, trajectoire } from './combat.js';
import { noeudsAtteignables, posNoeud, COUL_NOEUD, NOM_NOEUD, texteObjectif } from './map.js';
import { t as trad } from './i18n.js';

const canvas=document.getElementById('jeu'), ctx=canvas.getContext('2d');
ctx.imageSmoothingEnabled=false;
const wrap=document.getElementById('wrap'), scene=document.getElementById('scene');

/* Échelle de radius du HUD dessiné sur le canvas — même échelle que --radius-* dans
   theme.css (le canvas ne peut pas lire les variables CSS). Une seule valeur pour toutes
   les barres/boutons du HUD (PV du croiseur, jauge/bouton d'ultime, actions, fin du tour) :
   c'était avant 6/7/9/12 selon l'élément, sans raison. */
const RADIUS={bar:8};

/* petites icônes pixel-art dessinées directement sur le canvas de jeu (remplacent les emoji ⚠❄⚡🔥) */
const imgAlerte=iconImage('alerte',3), imgGel=iconImage('gel',3), imgEclairIco=iconImage('eclair',3), imgFeuIco=iconImage('feu',3);
function dessinerIcone(img,cx,cy,alpha=1){ ctx.globalAlpha=alpha; ctx.drawImage(img,Math.round(cx-img.width/2),Math.round(cy-img.height/2)); ctx.globalAlpha=1; }

/* mini flottaison des vaisseaux (immobiles au sol) : léger balancement vertical, jamais synchronisé
   entre deux vaisseaux (phase aléatoire mémorisée sur l'objet lui-même, pas sur sa position — sinon
   elle sauterait à chaque déplacement). Purement visuel : ne touche jamais f.x/f.y réels. */
export function flotte(o,t){ if(o.__bob===undefined) o.__bob=Math.random()*Math.PI*2; return Math.sin(t/480+o.__bob)*1.3; }

let imgCroiseur, imgBossMap, croiseurSC;
let imgBaseMap, imgTourelleMap;
let nebuleuses, planete;
/* ré-applique la teinte cosmétique du croiseur en cours (après un changement de skin dans le menu méta) */
export function rafraichirSkinCroiseur(){ if(croiseurSC) imgCroiseur=cuire(CROISEUR,croiseurSC,(SKINS_CROISEUR[(state.meta&&state.meta.skinCroiseur)||0]||SKINS_CROISEUR[0]).over); }
/* accès en lecture seule au sprite d'un boss par type, pour le guide (bestiaire) */
export function imgBossGuide(type){ return imgBossMap && (imgBossMap[type]||imgBossMap.canon); }
/* idem, base ennemie et tourelles des missions planète (guide) */
export function imgBaseGuide(){ return imgBaseMap; }
export function imgTourelleGuide(type){ return imgTourelleMap && (imgTourelleMap[type]||imgTourelleMap.canon); }
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
  const MARGE=14; state.LARGEUR=state.COLS*state.CELL+2*MARGE; state.GX=MARGE;
  // Cadre HUD au-dessus de la grille : boutons son/pause, secteur, score, statut et objectif
  // de vague y sont tous regroupés (voir dessinerCadreHUD()) — GY laisse la place nécessaire.
  state.GY=108; state.GRID_BAS=state.GY+state.RANGS*state.CELL;
  // Croiseur : pleine largeur du terrain (mêmes marges que la grille), comme Fin du tour et
  // la barre de PV. PV et ultime restent incrustées sur sa coque (voir dessinerConsoleCroiseur()).
  const sc=Math.max(3,Math.round((state.LARGEUR-2*MARGE)/CROISEUR[0].length)); croiseurSC=sc;
  imgCroiseur=cuire(CROISEUR,sc,(SKINS_CROISEUR[(state.meta&&state.meta.skinCroiseur)||0]||SKINS_CROISEUR[0]).over); const BANDE=CROISEUR.length*sc;
  imgBossMap={}; for(const kk in BOSS_GRIDS){ const g=BOSS_GRIDS[kk]; imgBossMap[kk]=cuire(g,Math.max(4,Math.round(3*state.CELL/g[0].length))); }
  imgBaseMap=cuire(ENEMY_BASE,Math.max(4,Math.round(3*state.CELL/ENEMY_BASE[0].length)));
  imgTourelleMap={}; for(const kk in TOURELLE_GRIDS){ imgTourelleMap[kk]=cuireFit(TOURELLE_GRIDS[kk],state.CELL); }
  cuireUnites(state.CELL);
  const actY=state.GRID_BAS+6, actH=44; state.cruiserY=actY+actH+6; state.BANDE=BANDE;
  state.CROISEUR_X=Math.round((state.LARGEUR-imgCroiseur.width)/2);
  const consX=state.CROISEUR_X+Math.round(imgCroiseur.width*0.06), consW=Math.round(imgCroiseur.width*0.88), cy0=state.cruiserY;
  state.PV={x:consX,w:consW,y:cy0+10,h:16};
  // Barre d'ultime plus haute que la PV (26px vs 16) : c'est le bouton le plus important à
  // toucher une fois prête (déclenche la frappe orbitale), elle mérite une cible plus large.
  state.ULT={x:consX,w:consW,y:cy0+34,h:26};
  state.BTN={x:consX,w:consW,y:cy0+68,h:44};
  state.HAUTEUR=Math.round(cy0+Math.max(BANDE,state.BTN.h+(state.BTN.y-cy0))+18);
  canvas.width=state.LARGEUR; canvas.height=state.HAUTEUR; ctx.imageSmoothingEnabled=false;
  // boutons d'action : pleine largeur du terrain de jeu (mêmes marges que la grille), pas une
  // largeur plafonnée par bouton qui laissait un vide inutile de chaque côté sur grand écran.
  const gap=8, ax=MARGE, aw=(state.LARGEUR-2*MARGE-2*gap)/3;
  state.ACT=[{id:'vaisseau',lblKey:'hud_vaisseau',x:ax,y:actY,w:aw,h:actH},{id:'tourelle',lblKey:'hud_tourelle',x:ax+aw+gap,y:actY,w:aw,h:actH},{id:'bouclier',lblKey:'hud_bouclier',x:ax+2*(aw+gap),y:actY,w:aw,h:actH}];
  state.HP_MAX=Math.round(100*state.COLS/7); state.MAX_VAISSEAUX=Math.max(6,Math.round(state.COLS*0.8)); state.AILES_MAX=Math.max(10,Math.round(state.COLS*1.5));
  state.STARTF=Math.max(4,Math.round(state.COLS*0.5)); state.STARTA=Math.max(3,Math.round(state.COLS*0.4)); state.RANG_TIR=Math.max(2,Math.round(state.RANGS*0.25)); state.RECHARGE=Math.round(state.HP_MAX*0.10);
  state.nebuleuses=[{x:state.LARGEUR*0.25,y:state.HAUTEUR*0.30,r:state.LARGEUR*0.55,c1:'rgba(90,55,150,.16)',v:3},{x:state.LARGEUR*0.82,y:state.HAUTEUR*0.18,r:state.LARGEUR*0.5,c1:'rgba(40,95,150,.14)',v:5}];
  planete={x:state.LARGEUR*0.80,y:state.HAUTEUR*0.11,r:Math.min(state.LARGEUR,state.HAUTEUR)*0.10};
}
/* Sur mobile (Safari surtout), window.innerHeight/innerWidth ne suivent pas fidèlement la barre
   d'adresse qui apparaît/disparaît : visualViewport reflète, lui, la zone RÉELLEMENT visible à
   l'instant présent, ce qui évite qu'une mise en page calculée avant que la barre ne réapparaisse
   ne déborde de l'écran (titre ou boutons coupés en haut/bas sans pouvoir défiler pour les voir). */
export function redimensionner(){ const fe=document.fullscreenElement, vv=window.visualViewport;
  const availW=fe?fe.clientWidth:(vv?vv.width:window.innerWidth), availH=fe?fe.clientHeight:(vv?vv.height:window.innerHeight);
  const ar=canvas.width/canvas.height; let w=availW,h=w/ar; if(h>availH){ h=availH; w=h*ar; } scene.style.width=w+'px'; scene.style.height=h+'px'; }
window.addEventListener('resize',redimensionner);
if(window.visualViewport){ window.visualViewport.addEventListener('resize',redimensionner); window.visualViewport.addEventListener('scroll',redimensionner); }

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
   CADRE HUD (au-dessus de la grille) — regroupe dans un seul encart, même
   style que les autres panneaux du HUD (radius, cadre) : secteur/vague,
   score, statut du tour et objectif de vague. Les boutons son/pause (DOM,
   coin haut-gauche) se posent par-dessus son côté gauche, laissé vide.
   ===================================================================== */
function dessinerCadreHUD(){
  // Tout le contenu (hors boutons son/pause, en DOM par-dessus le coin haut-gauche) est
  // centré sur la largeur du cadre — secteur/vague et score regroupés sur une seule ligne
  // plutôt que collés chacun à un bord, pour un rendu plus propre et mieux équilibré.
  const marge=state.GX, fx=marge, fy=4, fw=state.LARGEUR-2*marge, fh=state.GY-10, cx=fx+fw/2;
  arrondi(fx,fy,fw,fh,RADIUS.bar); ctx.fillStyle='rgba(10,14,28,.8)'; ctx.fill();
  ctx.strokeStyle='#4a5a86'; ctx.lineWidth=2; ctx.stroke();
  ctx.textAlign='center';
  ctx.font='8px "Press Start 2P", monospace'; ctx.fillStyle='#7fd0b0';
  const secTxt=trad('carte_secteur')+' '+state.secteur+' · V'+state.vague, secW=ctx.measureText(secTxt).width;
  ctx.font='10px "Press Start 2P", monospace'; const scoreTxt=String(state.score).padStart(3,'0'), scoreW=ctx.measureText(scoreTxt).width;
  const gap=16, demi=(secW+gap+scoreW)/2;
  ctx.font='8px "Press Start 2P", monospace'; ctx.textAlign='left'; ctx.fillText(secTxt,cx-demi,fy+22);
  ctx.font='10px "Press Start 2P", monospace'; ctx.fillStyle='#ffd23d'; ctx.fillText(scoreTxt,cx-demi+secW+gap,fy+22);
  ctx.textAlign='center'; ctx.font='9px "Press Start 2P", monospace'; ctx.fillStyle=state.phase==='joueur'?'#37e0ff':'#ff8f6b';
  ctx.fillText(state.phase==='joueur'?(state.modeTourelle?trad('hud_choisis_cible'):trad('hud_a_toi_de_jouer')):trad('hud_ennemis_attaquent'),cx,fy+46);
  // Le libellé "OBJECTIF SECONDAIRE" clarifie que cette mission de vague est un bonus
  // (récompense en cas de réussite) et non une condition d'échec de la vague en cours.
  if(state.objectifVague){
    ctx.font='7px "Press Start 2P", monospace'; ctx.fillStyle='rgba(159,176,216,.85)';
    ctx.fillText(trad('objectif_secondaire').toUpperCase(),cx,fy+65);
    ctx.font='8px "Press Start 2P", monospace'; ctx.fillStyle='rgba(127,208,176,.95)';
    ctx.fillText('» '+texteObjectif(state.objectifVague),cx,fy+80);
  }
  ctx.textAlign='left';
}

/* =====================================================================
   CARTE : rendu de la constellation de secteur
   ===================================================================== */
function planetePixel(px,py,R,c1,c2,d){ const pas=Math.max(3,Math.round(R/4)); px=Math.round(px); py=Math.round(py);
  for(let gx=-R;gx<=R;gx+=pas) for(let gy=-R;gy<=R;gy+=pas){ const cx=gx+pas/2, cy=gy+pas/2; if(Math.hypot(cx,cy)>R) continue;
    const s=cx+cy; ctx.fillStyle = s<-R*0.35?c1 : s>R*0.45?d : c2; ctx.fillRect(px+gx,py+gy,pas,pas); } }
function dessinerCarte(t){ const pulse=.5+.5*Math.sin(t/300);
  ctx.clearRect(0,0,state.LARGEUR,state.HAUTEUR); fond();
  ctx.fillStyle='#37e0ff'; ctx.font='16px "Press Start 2P", monospace'; ctx.textAlign='center'; ctx.fillText(trad('carte_secteur')+' '+state.secteur,state.LARGEUR/2,40);
  ctx.fillStyle='#9fb0d8'; ctx.font='8px "Press Start 2P", monospace'; ctx.fillText(trad('carte_choisis_route'),state.LARGEUR/2,62);
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
  if(boss.type==='sniper'||boss.type==='electrique'){ const cibles=[...state.fighters].sort((a,b)=>Math.hypot(a.x-boss.x,a.y-boss.y)-Math.hypot(b.x-boss.x,b.y-boss.y)).slice(0,boss.type==='electrique'?2:3); for(const f of cibles){ ctx.beginPath(); ctx.moveTo(boss.x,boss.y); ctx.lineTo(f.x,f.y); ctx.stroke(); } }
  else if(boss.type==='rayon'){ if(boss.charge){ const gx0=Math.max(state.GX,state.GX+(boss.c-1)*state.CELL); ctx.save(); ctx.setLineDash([]); ctx.fillStyle='rgba(55,224,255,'+(.12+.12*pulse)+')'; ctx.fillRect(gx0,state.GY,Math.min(5*state.CELL,state.GX+state.COLS*state.CELL-gx0),state.RANGS*state.CELL); ctx.restore(); } }
  else if(boss.type==='nuee'||boss.type==='blinde'||boss.type==='nid'){ ligne(boss.c+1); }
  else { for(let dc=0;dc<3;dc++) ligne(boss.c+dc); }
}

/* deux segments parallèles décalés perpendiculairement à (x1,y1)-(x2,y2) — donne le double
   faisceau laser (purement visuel, voir dessiner() ci-dessous : chaque tir du jeu, allié comme
   ennemi, se dessine désormais en deux traits parallèles au lieu d'un seul, sans rien changer
   à la résolution du tir elle-même). */
function segmentsParalleles(x1,y1,x2,y2,decal){
  const dx=x2-x1, dy=y2-y1, len=Math.hypot(dx,dy)||1, ox=-dy/len*decal, oy=dx/len*decal;
  return [[x1+ox,y1+oy,x2+ox,y2+oy],[x1-ox,y1-oy,x2-ox,y2-oy]];
}

/* Durée du "vol" d'un tir laser, indépendante de la distance parcourue : au-delà, le tir a
   atteint sa cible et disparaît — voir traitBref() ci-dessous. Un vrai trait continu de la
   source à la cible ne se lit pas comme un tir (juste une ligne qui apparaît puis s'efface) ;
   un court segment qui parcourt la distance en un temps fixe, façon sabre/blaster, se lit
   bien mieux comme un projectile même si la portée varie beaucoup d'un tir à l'autre. */
const VOL_LASER=0.085;
/* [tx,ty,hx,hy,p] : tête (hx,hy) et queue (tx,ty) du court segment visible d'un tir dont la
   progression `p` (0→1) va de (x1,y1) à (x2,y2) ; `p` dépasse 1 une fois le tir arrivé (plus
   rien à dessiner). `longueur` est la longueur fixe du segment en pixels, jamais plus long
   que le trajet lui-même. */
function traitBref(x1,y1,x2,y2,tAnim,longueur){
  const p=tAnim/VOL_LASER;
  const dx=x2-x1, dy=y2-y1, len=Math.hypot(dx,dy)||1, ux=dx/len, uy=dy/len;
  const headDist=Math.min(len,p*len), tailDist=Math.max(0,headDist-longueur);
  return [x1+ux*tailDist,y1+uy*tailDist,x1+ux*headDist,y1+uy*headDist,p];
}

/* barre de PV en petits carrés (pleins = couleur, vides = gris), centrée sur cx, sous l'unité — commune alliés/ennemis/obstacles */
function dessinerPV(cx,by,hp,maxhp,coul){ const sq=5,gap=2,tot=maxhp*sq+(maxhp-1)*gap, bx=Math.round(cx-tot/2);
  for(let i=0;i<maxhp;i++){ ctx.fillStyle=i<hp?coul:'#4a5262'; ctx.fillRect(bx+i*(sq+gap),by,sq,sq);
    ctx.strokeStyle='rgba(0,0,0,.4)'; ctx.lineWidth=1; ctx.strokeRect(bx+i*(sq+gap)+.5,by+.5,sq-1,sq-1); } }

/* =====================================================================
   DESSIN — scène de jeu
   ===================================================================== */
export function dessiner(t){
  // rien à voir : l'accueil (opaque, plein écran) et l'attente (avant le choix de difficulté)
  // recouvrent entièrement ce canvas — inutile de dessiner la scène de jeu en dessous.
  if(state.phase==='accueil'||state.phase==='attente') return;
  if(state.phase==='carte'){ dessinerCarte(t); return; }
  const pulse=.5+.5*Math.sin(t/160);
  ctx.clearRect(0,0,state.LARGEUR,state.HAUTEUR); ctx.save(); if(state.secousse>0) ctx.translate((Math.random()-.5)*state.secousse,(Math.random()-.5)*state.secousse);
  fond();
  dessinerCadreHUD();
  // fond du champ de bataille (délimite clairement la zone jouable) — même radius que les
  // cadres HUD haut/bas (RADIUS.bar), pas des coins vifs qui détonnaient avec le reste du HUD.
  // Teinté par biome en mission planète (désert/glace/grotte/villes anciennes), sinon le bleu
  // spatial habituel.
  const teinteBiome={desert:'rgba(150,110,55,.4)',glace:'rgba(120,180,210,.35)',grotte:'rgba(10,6,16,.7)',villes_anciennes:'rgba(110,90,55,.38)'};
  arrondi(state.GX,state.GY,state.COLS*state.CELL,state.RANGS*state.CELL,RADIUS.bar); ctx.fillStyle=(state.planete&&teinteBiome[state.planete.biome])||'rgba(18,28,55,.5)'; ctx.fill();
  arrondi(state.GX-1,state.GY-1,state.COLS*state.CELL+2,state.RANGS*state.CELL+2,RADIUS.bar); ctx.strokeStyle='rgba(95,135,215,.55)'; ctx.lineWidth=2; ctx.stroke();
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
      dessinerIcone(imgAlerte,w.dir>0?state.GX+4+imgAlerte.width/2:state.GX+state.COLS*state.CELL-4-imgAlerte.width/2,state.GY+w.r*state.CELL+state.CELL*0.7-6,al); }
    else if(w.kind==='trou'){ ctx.strokeStyle='rgba(180,120,255,'+al+')'; ctx.lineWidth=3; ctx.strokeRect(state.GX+(w.c-1)*state.CELL+3,state.GY+(w.r-1)*state.CELL+3,3*state.CELL-6,3*state.CELL-6); dessinerIcone(imgAlerte,centreCase(w.c,w.r).x,centreCase(w.c,w.r).y,al); }
    else { ctx.fillStyle='rgba(155,107,214,'+(.12+.12*pulse)+')'; ctx.fillRect(state.GX+w.c0*state.CELL,state.GY,(w.c1-w.c0+1)*state.CELL,state.RANGS*state.CELL);
      dessinerIcone(imgAlerte,state.GX+((w.c0+w.c1+1)/2)*state.CELL-24,state.GY+14,al);
      ctx.fillStyle='rgba(200,160,255,'+al+')'; ctx.font='11px monospace'; ctx.textAlign='center'; ctx.fillText(trad('hud_champ'),state.GX+((w.c0+w.c1+1)/2)*state.CELL+6,state.GY+18); }
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

    // largages télégraphiés des transporteurs ennemis : case cible visible 1 tour avant l'arrivée
    for(const a of state.ailes){ if(a.type!=='transporteur'||!a.largageCible) continue;
      const cc=centreCase(a.largageCible.c,a.largageCible.r), al=.5+.4*pulse;
      ctx.save(); ctx.setLineDash([4,4]); ctx.strokeStyle='rgba(174,183,196,'+al+')'; ctx.lineWidth=2;
      ctx.strokeRect(state.GX+a.largageCible.c*state.CELL+3,state.GY+a.largageCible.r*state.CELL+3,state.CELL-6,state.CELL-6);
      ctx.restore();
      dessinerIcone(imgAlerte,cc.x,cc.y-state.CELL*0.3,al); }

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
      const col = bm.kind==='ennemi' ? 'rgba(80,170,255,.65)'    // bleu = tir allié, cible atteignable
                : bm.kind==='menace' ? 'rgba(255,176,61,.5)'     // orange = bloqué par une menace
                :                      'rgba(80,170,255,.18)';   // bleu pâle = voie libre, pas de cible
      ctx.strokeStyle=col; ctx.beginPath(); ctx.moveTo(sx,sy); ctx.lineTo(cc.x,cc.y); ctx.stroke(); }
    ctx.restore();
    // cases de déplacement : BLEU (bien distinct du tir en rouge) — étendues pendant un "bond"
    const enBond = state.modeCapacite && state.modeCapacite.kind==='bond' && state.modeCapacite.ship===state.selection;
    ctx.fillStyle=enBond?'rgba(255,210,61,.85)':'rgba(80,150,255,.85)'; for(const p of (enBond?casesMouvementCapacite(state.selection):casesMouvement(state.selection))){ const c2=centreCase(p.c,p.r); ctx.beginPath(); ctx.arc(c2.x,c2.y,7,0,7); ctx.fill(); }
    // cercle rouge UNIQUEMENT sur les ennemis réellement atteignables (ligne de mire dégagée)
    ctx.strokeStyle='#ff5a5a'; ctx.lineWidth=3; for(const a of an.ailesOk){ ctx.beginPath(); ctx.arc(a.x,a.y,state.CELL*0.42,0,7); ctx.stroke(); }
    if(an.mimicsOk) for(const m of an.mimicsOk){ ctx.beginPath(); ctx.arc(m.x,m.y,state.CELL*0.42,0,7); ctx.stroke(); }
    if(an.jam){ ctx.fillStyle='rgba(155,107,214,.9)'; ctx.font='9px "Press Start 2P", monospace'; ctx.textAlign='center'; ctx.fillText(trad('hud_brouille'),state.selection.x,state.selection.y-state.CELL*0.5); ctx.textAlign='left'; } }
  if(state.modeTourelle){ ctx.strokeStyle='#ffd23d'; ctx.lineWidth=3; for(const a of state.ailes){ if(a.r<0) continue; ctx.beginPath(); ctx.arc(a.x,a.y,state.CELL*0.42,0,7); ctx.stroke(); } if(state.boss){ ctx.strokeRect(state.GX+state.boss.c*state.CELL+4,state.GY+state.boss.r*state.CELL+4,3*state.CELL-8,2*state.CELL-8); } }

  // croiseur (endommagé visuel) — absent en mission planète (pas de croiseur à l'écran, le
  // joueur attaque au lieu de défendre) ; la console d'action reste affichée à sa place fixe.
  if(!state.planete){
    const dmgRatio=1-Math.max(0,state.hpCruiser/state.HP_MAX);
    ctx.save(); ctx.shadowColor='rgba(74,163,255,.35)'; ctx.shadowBlur=16;
    ctx.drawImage(imgCroiseur,Math.round((state.LARGEUR-imgCroiseur.width)/2),Math.round(state.cruiserY));
    ctx.restore();
    if(dmgRatio>0.3){ ctx.globalAlpha=dmgRatio*.6; ctx.fillStyle='#e5484d'; ctx.fillRect(Math.round((state.LARGEUR-imgCroiseur.width)/2),Math.round(state.cruiserY),imgCroiseur.width,imgCroiseur.height); ctx.globalAlpha=1; }
    if(dmgRatio>0.6){ ctx.globalAlpha=.4+.2*Math.sin(t/100); ctx.fillStyle='#3a1515'; ctx.fillRect(Math.round((state.LARGEUR-imgCroiseur.width)/2),Math.round(state.cruiserY),imgCroiseur.width,imgCroiseur.height); ctx.globalAlpha=1; }
    if(state.flashCroiseur>0){ ctx.fillStyle='rgba(229,72,77,'+(state.flashCroiseur*.4)+')'; ctx.fillRect(0,state.cruiserY-4,state.LARGEUR,imgCroiseur.height+8); }
    if(state.flashRecharge>0){ ctx.fillStyle='rgba(47,214,160,'+(state.flashRecharge*.4)+')'; ctx.fillRect(0,state.cruiserY-4,state.LARGEUR,imgCroiseur.height+8); }
  }
  // aperçu du vaisseau en construction : au-dessus de la console (pas dessus, elle l'aurait
  // sinon recouvert), dans la zone des tourelles en haut de la coque.
  if(state.hangar){ const him=imgVaisseau(state.hangar.type), hy=state.cruiserY-him.height-4; ctx.globalAlpha=.5; ctx.drawImage(him,Math.round(state.LARGEUR/2-him.width/2),Math.round(hy)); ctx.globalAlpha=1; ctx.fillStyle='#ffd23d'; ctx.font='9px "Press Start 2P", monospace'; ctx.textAlign='center'; ctx.fillText('⏳'+(state.hangar.tours>1?' '+state.hangar.tours:''),state.LARGEUR/2,hy-4); ctx.textAlign='left'; }

  // obstacles (débris, station, barrière, mines, gaz, gravité)
  if(state.obstacles) for(const o of state.obstacles){ const def=OBSTACLES[o.type], im=imgObstacle(o), cx=state.GX+o.c*state.CELL+state.CELL/2, cy=state.GY+o.r*state.CELL+state.CELL/2;
    if(o.type==='gaz'){ ctx.fillStyle='rgba(140,255,90,'+(.14+.10*pulse)+')'; ctx.fillRect(state.GX+o.c*state.CELL,state.GY+o.r*state.CELL,state.CELL,state.CELL);
      ctx.fillStyle='rgba(140,255,90,'+(.4+.3*pulse)+')'; for(let k=0;k<4;k++){ const a=k*1.6+t/500, rr=state.CELL*0.28; ctx.fillRect(Math.round(cx+Math.cos(a)*rr-1),Math.round(cy+Math.sin(a)*rr-1),3,3); } }
    else if(o.type==='gravite'){ ctx.fillStyle='rgba(74,163,255,'+(.12+.08*pulse)+')'; ctx.fillRect(state.GX+o.c*state.CELL,state.GY+o.r*state.CELL,state.CELL,state.CELL);
      ctx.strokeStyle='rgba(120,180,255,'+(.5+.3*pulse)+')'; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(cx,cy,state.CELL*0.3*(0.6+0.4*Math.sin(t/300)),0,7); ctx.stroke(); }
    else if(o.type==='mines'){ ctx.fillStyle='rgba(229,72,77,'+(.10+.08*pulse)+')'; ctx.fillRect(state.GX+o.c*state.CELL,state.GY+o.r*state.CELL,state.CELL,state.CELL);
      for(const[dx,dy]of[[-.22,-.22],[.22,-.22],[-.22,.22],[.22,.22],[0,0]]){ ctx.fillStyle='#e5484d'; ctx.beginPath(); ctx.arc(cx+dx*state.CELL,cy+dy*state.CELL,3,0,7); ctx.fill(); ctx.strokeStyle='#8f2b2f'; ctx.lineWidth=1; for(let a=0;a<4;a++){ ctx.beginPath(); ctx.moveTo(cx+dx*state.CELL,cy+dy*state.CELL); ctx.lineTo(cx+dx*state.CELL+Math.cos(a*1.57)*5,cy+dy*state.CELL+Math.sin(a*1.57)*5); ctx.stroke(); } } }
    else if(o.type==='glace'){ ctx.fillStyle='rgba(191,233,255,'+(.20+.10*pulse)+')'; ctx.fillRect(state.GX+o.c*state.CELL,state.GY+o.r*state.CELL,state.CELL,state.CELL);
      ctx.strokeStyle='rgba(191,233,255,.7)'; ctx.lineWidth=1; ctx.strokeRect(state.GX+o.c*state.CELL+2,state.GY+o.r*state.CELL+2,state.CELL-4,state.CELL-4); }
    // épave de vaisseau allié : 3 petits bouts de coque éparpillés dans la case (2 agencements
    // possibles selon `variante`), plutôt qu'une seule image centrée — pour bien lire "morceaux"
    // et rester visuellement plus petit que le débris classique (imgDebris1/2, plein cellule).
    else if(o.type==='debris_vaisseau'){ const frags=imgsDebrisVaisseau();
      const dispo1=[[-0.24,-0.16],[0.20,-0.06],[-0.02,0.24]], dispo2=[[0.22,-0.20],[-0.22,0.04],[0.04,0.24]];
      const dispo=o.variante?dispo2:dispo1;
      for(let i=0;i<3;i++){ const im2=frags[i], [dx,dy]=dispo[i]; if(!im2) continue;
        ctx.drawImage(im2,Math.round(cx+dx*state.CELL-im2.width/2),Math.round(cy+dy*state.CELL-im2.height/2)); } }
    else if(im){ ctx.drawImage(im,Math.round(cx-im.width/2),Math.round(cy-im.height/2)); }
    // PV des obstacles destructibles à plusieurs PV (station)
    if(def.destructible && (o.maxhp||def.hp)>1) dessinerPV(cx,Math.round(cy+state.CELL*0.32),o.hp,o.maxhp||def.hp,'#ff2a5a');
  }

  // bonus (le mimic se déguise en bonus jaune)
  for(const b of state.bonus){ const img=b.type==='mimic'?getImgMimic():b.type==='pv'?imgBonusPV:b.type==='tir'?imgBonusTIR:imgBonusVAIS; ctx.globalAlpha=.9+.1*pulse; ctx.drawImage(img,Math.round(b.x-img.width/2),Math.round(b.y-img.height/2)); ctx.globalAlpha=1;
    if(b.type==='mimic'){ ctx.strokeStyle='rgba(255,60,80,'+(.35+.35*pulse)+')'; ctx.lineWidth=2; const s=state.CELL*0.42; ctx.strokeRect(Math.round(b.x-s),Math.round(b.y-s),Math.round(s*2),Math.round(s*2)); } }

  // ailes + barres de vie (les ailes pas encore entrées dans la grille — rangée < 0, ex : formation en V —
  // restent invisibles et hors de portée tant qu'elles n'ont pas atteint la rangée 0)
  for(const a of state.ailes){
    if(a.r<0) continue;
    const ay=a.y+flotte(a,t);
    if(a.r>=state.RANGS-2){ ctx.fillStyle='rgba(229,72,77,.22)'; ctx.fillRect(state.GX+a.c*state.CELL,state.GY+a.r*state.CELL,state.CELL,state.CELL); }
    ctx.drawImage(a.img,Math.round(a.x-a.img.width/2),Math.round(ay-a.img.height/2));
    if(a.type==='porteur'){ ctx.strokeStyle='rgba(255,210,61,'+(.4+.3*pulse)+')'; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(a.x,ay,state.CELL*0.52,0,7); ctx.stroke(); }
    else if(a.type==='brouilleur'){ ctx.strokeStyle='rgba(155,107,214,'+(.4+.3*pulse)+')'; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(a.x,ay,state.CELL*0.52,0,7); ctx.stroke(); }
    else if(a.type==='regenerateur'){ ctx.fillStyle='rgba(140,255,90,'+(.5+.5*pulse)+')'; ctx.fillRect(Math.round(a.x-1),Math.round(ay-a.img.height/2-9),3,7); ctx.fillRect(Math.round(a.x-4),Math.round(ay-a.img.height/2-7),9,3); }   // croix verte clignotante
    else if(a.type==='void'){ ctx.strokeStyle='rgba(107,63,160,'+(.4+.4*pulse)+')'; ctx.lineWidth=2; for(let k=1;k<=2;k++){ ctx.beginPath(); ctx.arc(a.x,ay,state.CELL*0.4*k*(0.7+0.3*Math.sin(t/240+k)),0,7); ctx.stroke(); } }
    if(a.bouclier){ ctx.strokeStyle='rgba(255,210,61,.85)'; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(a.x,ay+2,state.CELL*0.4,Math.PI*0.15,Math.PI*0.85); ctx.stroke(); }
    else if(estProtege(a)){ ctx.fillStyle='rgba(155,107,214,.18)'; ctx.beginPath(); ctx.arc(a.x,ay,state.CELL*0.42,0,7); ctx.fill(); }
    // PV : petits carrés (rouge = plein, gris = vide) pour les ennemis blindés (maxhp>1)
    if(a.maxhp>1) dessinerPV(a.x,Math.round(ay+a.img.height/2+2),a.hp,a.maxhp,'#ff2a5a');
    // marqueurs des attaques spéciales (saboteur : électrique, brûleur : incendiaire)
    if(a.type==='saboteur') dessinerIcone(imgEclairIco,a.x,ay-a.img.height/2-7,.6+.4*pulse);
    else if(a.type==='bruleur') dessinerIcone(imgFeuIco,a.x,ay-a.img.height/2-7,.6+.4*pulse);
  }
  // marqueurs cibles alliées
  if(state.phase==='joueur'){ ctx.strokeStyle='rgba(255,70,70,'+(.55+.4*pulse)+')'; ctx.lineWidth=3; const marque=(x,y)=>{ ctx.beginPath(); ctx.moveTo(x-9,y-9); ctx.lineTo(x+9,y+9); ctx.moveTo(x+9,y-9); ctx.lineTo(x-9,y+9); ctx.stroke(); };
    for(const a of state.ailes){ const cb=cibleLaser(a); if(cb&&cb.type==='fighter') marque(cb.f.x,cb.f.y); }
    if(state.boss){ for(let dc=0;dc<3;dc++){ const bc=state.boss.c+dc; let hf=null; for(let rr=state.boss.r+2;rr<state.RANGS;rr++){ const f=fighterEn(bc,rr); if(f){hf=f;break;} } if(hf) marque(hf.x,hf.y); } } }

  // boss (sprite + contour + étiquette selon le type)
  if(state.boss){ const im=imgBossMap[state.boss.type]||imgBossMap.canon;
    const tint={canon:'#ff5a5a',sniper:'#9b6bd6',rayon:'#37e0ff',nuee:'#5fce6a',blinde:'#8b95a3',
      feu:'#ff8a3d',electrique:'#37e0ff',nid:'#b6ab9f',miroir:'#bfe9ff',forge:'#e0a13d',eclipse:'#9b6bd6'}[state.boss.type]||'#ff5a5a';
    ctx.drawImage(im,Math.round(state.boss.x-im.width/2),Math.round(state.boss.y-im.height/2));
    ctx.strokeStyle=tint; ctx.lineWidth=2; ctx.strokeRect(state.GX+state.boss.c*state.CELL+3,state.GY+state.boss.r*state.CELL+3,3*state.CELL-6,2*state.CELL-6);
    const bw=3*state.CELL-14, bx=state.GX+state.boss.c*state.CELL+7, by=state.GY+state.boss.r*state.CELL-8; ctx.fillStyle='#3a1520'; ctx.fillRect(bx,by,bw,6); ctx.fillStyle=tint; ctx.fillRect(bx,by,bw*Math.max(0,state.boss.hp/state.boss.maxhp),6);
    ctx.fillStyle=tint; ctx.font='7px "Press Start 2P", monospace'; ctx.textAlign='center';
    const txtBoss=trad('boss_label')+' '+trad('boss_'+state.boss.type+'_nom').toUpperCase(); ctx.fillText(txtBoss,state.boss.x,by-4);
    if(state.boss.type==='rayon'&&state.boss.charge) dessinerIcone(imgEclairIco,state.boss.x+ctx.measureText(txtBoss).width/2+8,by-6,1);
    ctx.textAlign='left'; }

  // mission planète : base ennemie + tourelles fixes (sprites dédiés, voir sprites.js)
  if(state.planete){ const pl=state.planete, base=pl.base;
    // endormie (biome Grotte) : invisible tant qu'aucun vaisseau n'est à 2 cases ou moins
    if(base.reveillee!==false && imgBaseMap){
      ctx.drawImage(imgBaseMap,Math.round(base.x-imgBaseMap.width/2),Math.round(base.y-imgBaseMap.height/2));
      const by0=state.GY+base.r*state.CELL+3, bw0=base.w*state.CELL-6, bx0=state.GX+base.c*state.CELL+3;
      const bbw=bw0-8, bbx=bx0+4, bby=by0-8; ctx.fillStyle='#2a1040'; ctx.fillRect(bbx,bby,bbw,6);
      ctx.fillStyle='#a355e0'; ctx.fillRect(bbx,bby,bbw*Math.max(0,base.hp/base.maxhp),6);
      ctx.fillStyle='#a355e0'; ctx.font='7px "Press Start 2P", monospace'; ctx.textAlign='center';
      ctx.fillText(trad('planete_base_label'),base.x,bby-4); ctx.textAlign='left';
    }

    // tourelles endormies (Grotte) ou camouflées (Villes anciennes) : invisibles tant que non révélées
    for(const tr of pl.tourelles){ if(!tr.reveillee) continue;
      const im=imgTourelleMap&&(imgTourelleMap[tr.id]||imgTourelleMap.canon);
      if(im) ctx.drawImage(im,Math.round(tr.x-im.width/2),Math.round(tr.y-im.height/2));
      const ty0=state.GY+tr.r*state.CELL+6;
      if(tr.maxhp>1){ const n=tr.maxhp, sq=4, gap=2, tot=n*sq+(n-1)*gap, hbx=Math.round(tr.x-tot/2), hby=Math.round(ty0-6);
        for(let i=0;i<n;i++){ ctx.fillStyle=i<tr.hp?'#e5484d':'#4a5262'; ctx.fillRect(hbx+i*(sq+gap),hby,sq,sq); } }
    }
  }

  // astéroïdes (le gros est plus grand ; PV affichés s'il est blindé)
  for(const o of state.asteroides){ const sc=o.type==='gros'?1.4:o.type==='essaim'?0.7:1;
    ctx.save(); ctx.translate(o.x,o.y); ctx.rotate(o.ang); ctx.drawImage(o.img,-o.img.width*sc/2,-o.img.height*sc/2,o.img.width*sc,o.img.height*sc); ctx.restore();
    if(o.maxhp>1){ const n=o.maxhp, sq=4, gap=2, tot=n*sq+(n-1)*gap, bx=Math.round(o.x-tot/2), by=Math.round(o.y+o.img.height*sc/2+1); for(let i=0;i<n;i++){ ctx.fillStyle=i<o.hp?'#ff2a5a':'#4a5262'; ctx.fillRect(bx+i*(sq+gap),by,sq,sq); } } }

  // trails (traînée floue derrière le tir) — court segment mobile, double trait parallèle
  for(const l of state.trails){ const [tx,ty,hx,hy,p]=traitBref(l.x1,l.y1,l.x2,l.y2,l.t,l.gros?60:40); if(p>=1) continue;
    ctx.globalAlpha=.35; const lw=l.gros?4:2; ctx.strokeStyle=l.ennemi?'#ff7a5a':'#bff3ff'; ctx.lineWidth=lw;
    for(const [ax,ay,bx,by] of segmentsParalleles(tx,ty,hx,hy,l.gros?3:2)){ ctx.beginPath(); ctx.moveTo(ax,ay); ctx.lineTo(bx,by); ctx.stroke(); }
    ctx.globalAlpha=1; }

  // lasers — court trait lumineux qui parcourt la distance (façon sabre/blaster), double trait parallèle
  for(const l of state.lasers){ const [tx,ty,hx,hy,p]=traitBref(l.x1,l.y1,l.x2,l.y2,l.t,l.gros?46:30); if(p>=1) continue;
    ctx.globalAlpha=1; const lw=l.gros?5:3;
    for(const [ax,ay,bx,by] of segmentsParalleles(tx,ty,hx,hy,l.gros?3:2)){
      ctx.strokeStyle=l.ennemi?'#ff7a5a':'#bff3ff'; ctx.lineWidth=lw; ctx.beginPath(); ctx.moveTo(ax,ay); ctx.lineTo(bx,by); ctx.stroke();
      ctx.strokeStyle=l.ennemi?'#e5484d':'#37e0ff'; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(ax,ay); ctx.lineTo(bx,by); ctx.stroke();
    }
    ctx.globalAlpha=1; }

  // vaisseaux joueur
  for(const f of state.fighters){ const fy=f.y+flotte(f,t); if(f===state.selection){ ctx.strokeStyle='rgba(255,210,61,'+(.6+.4*pulse)+')'; ctx.lineWidth=4; const cc=centreCase(f.c,f.r); ctx.strokeRect(cc.x-state.CELL/2+5,cc.y-state.CELL/2+5,state.CELL-10,state.CELL-10); }
    // améliorations du Vaisseau Rouge : aura élargie (rouge_range) + réacteurs arrière (rouge_back)
    if(f.type==='rouge'&&state.ups){ if(state.ups.rouge_range){ ctx.strokeStyle='rgba(229,72,77,'+(.25+.2*pulse)+')'; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(f.x,fy,state.CELL*0.62,0,7); ctx.stroke(); }
      if(state.ups.rouge_back){ ctx.fillStyle='#ff8a3d'; for(const dx of [-6,0,6]){ ctx.fillRect(Math.round(f.x+dx-1),Math.round(fy+f.img.height/2+1),3,4); } } }
    ctx.globalAlpha=f.used?.4:1; ctx.drawImage(f.img,Math.round(f.x-f.img.width/2),Math.round(fy-f.img.height/2)); ctx.globalAlpha=1;
    if(f.gele>0) dessinerIcone(imgGel,f.x,fy,.7+.3*pulse);
    // PV : mêmes carrés harmonisés que les ennemis, sous le vaisseau (rouge = coque renforcée, bleu = cuirassé)
    if(f.maxhp>1){ const coul=f.type==='rouge'?'#ff5a5a':f.type==='bouclier'?'#4aa3ff':'#ff2a5a'; dessinerPV(f.x,Math.round(fy+f.img.height/2+2),f.hp,f.maxhp,coul); }
    // grade du vaisseau (kills) : 1-3 points jaunes puis étoile dorée à 15+
    { const k=f.kills||0; if(k>=1){ const gy=Math.round(fy-f.img.height/2-16);
      if(k>=15){ ctx.fillStyle='#ffd23d'; ctx.beginPath(); for(let i=0;i<10;i++){ const ang=-Math.PI/2+i*Math.PI/5, rr=(i%2)?2.4:5.5, x=f.x+Math.cos(ang)*rr, y=gy+Math.sin(ang)*rr; i?ctx.lineTo(x,y):ctx.moveTo(x,y); } ctx.closePath(); ctx.fill(); ctx.strokeStyle='#fff6c0'; ctx.lineWidth=1; ctx.stroke(); }
      else { const n=k<5?1:k<10?2:3; ctx.fillStyle='#ffe14d'; for(let i=0;i<n;i++){ ctx.beginPath(); ctx.arc(f.x-(n-1)*3.5+i*7, gy, 2, 0, 7); ctx.fill(); } } } }
    // pastille de capacité active disponible
    if(CAPACITES[f.type] && !f.capUsed){ const bx=f.x+f.img.width/2-2, by=fy-f.img.height/2-2;
      ctx.fillStyle='rgba(255,210,61,'+(0.7+0.3*pulse)+')'; ctx.beginPath(); ctx.arc(bx,by,4,0,7); ctx.fill();
      ctx.strokeStyle='#fff'; ctx.lineWidth=1; ctx.stroke(); } }

  // explosions + particules + éclairage
  for(const e of state.explosions){ const idx=Math.min(NFRAMES-1,Math.floor(e.t/0.05)), im=framesBoom[idx], dw=im.width*e.scale, dh=im.height*e.scale;
    // Éclairage dynamique autour de l'explosion
    const glow=ctx.createRadialGradient(e.x,e.y,0,e.x,e.y,dw); glow.addColorStop(0,'rgba(255,138,61,'+(.3*(1-e.t/(NFRAMES*0.05)))+')'); glow.addColorStop(1,'rgba(255,138,61,0)');
    ctx.fillStyle=glow; ctx.fillRect(e.x-dw,e.y-dw,dw*2,dh*2);
    ctx.drawImage(im,e.x-dw/2,e.y-dh/2,dw,dh); }
  for(const p of state.particules){ ctx.globalAlpha=Math.max(0,1-p.t/p.vie); ctx.fillStyle=p.c; ctx.fillRect(p.x,p.y,p.taille,p.taille); } ctx.globalAlpha=1;

  // dégâts : "-N" rouge qui monte et s'efface à l'endroit précis du coup, à côté de l'explosion
  for(const d of state.dmgTexts){ const p=Math.min(1,d.t/.8); ctx.globalAlpha=Math.max(0,1-p*p);
    ctx.save(); ctx.shadowColor='rgba(0,0,0,.9)'; ctx.shadowBlur=2;
    ctx.font='9px "Press Start 2P", monospace'; ctx.textAlign='center'; ctx.fillStyle='#ff4a4a';
    ctx.fillText(d.txt,d.x,d.y-10-p*22);
    ctx.restore(); }
  ctx.globalAlpha=1;

  if(state.ondeChoc>0){ const cx=state.LARGEUR/2, cy=state.cruiserY, R=(1-state.ondeChoc)*Math.max(state.LARGEUR,state.HAUTEUR)*1.15; ctx.strokeStyle='rgba(255,210,61,'+(state.ondeChoc*0.85)+')'; ctx.lineWidth=2+10*state.ondeChoc; ctx.beginPath(); ctx.arc(cx,cy,R,0,7); ctx.stroke(); ctx.strokeStyle='rgba(255,255,255,'+(state.ondeChoc*0.5)+')'; ctx.lineWidth=3; ctx.beginPath(); ctx.arc(cx,cy,R*0.82,0,7); ctx.stroke(); }

  ctx.restore();

  // ================= CONSOLE DU CROISEUR =================
  // PV et ultime restent incrustées sur la coque — même style de barre (radius, cadre), seule
  // la couleur de remplissage change : vert/jaune/rouge selon les PV, violet→jaune pour
  // l'ultime (qui devient un vrai bouton une fois prête). Secteur/score/statut/objectif sont
  // dans le cadre HUD au-dessus de la grille (voir dessinerCadreHUD()), pas sur le croiseur.
  if(state.planete){
    // même barre, même position : PV de la base au lieu du croiseur. Tant qu'elle est endormie
    // (biome Grotte, avant réveil), ses PV restent cachés — juste le cadre et un « ??? ».
    const base=state.planete.base, pv=state.PV;
    arrondi(pv.x,pv.y,pv.w,pv.h,RADIUS.bar); ctx.fillStyle='rgba(10,14,28,.8)'; ctx.fill();
    if(base.reveillee===false){
      arrondi(pv.x,pv.y,pv.w,pv.h,RADIUS.bar); ctx.strokeStyle='#4a5a86'; ctx.lineWidth=2; ctx.stroke();
      ctx.fillStyle='#5b6580'; ctx.font='9px "Press Start 2P", monospace'; ctx.textAlign='center';
      ctx.fillText('???',pv.x+pv.w/2,pv.y+pv.h/2+3); ctx.textAlign='left';
    } else {
      const ratio=Math.max(0,base.hp/base.maxhp);
      const coul=ratio>.5?'#a355e0':(ratio>.25?'#ffd23d':'#e5484d');
      ctx.fillStyle=coul; ctx.fillRect(pv.x+2,pv.y+2,Math.max(0,(pv.w-4)*ratio),pv.h-4);
      arrondi(pv.x,pv.y,pv.w,pv.h,RADIUS.bar); ctx.strokeStyle='#4a5a86'; ctx.lineWidth=2; ctx.stroke();
      ctx.fillStyle='#eef3ff'; ctx.font='9px "Press Start 2P", monospace'; ctx.textAlign='left'; ctx.fillText(trad('hud_base'),pv.x+8,pv.y+pv.h/2+3);
    }
  } else { const ratio=Math.max(0,state.hpCruiser/state.HP_MAX), pv=state.PV;
    arrondi(pv.x,pv.y,pv.w,pv.h,RADIUS.bar); ctx.fillStyle='rgba(10,14,28,.8)'; ctx.fill();
    let coul=ratio>.5?'#2fd6a0':(ratio>.25?'#ffd23d':'#e5484d'); if(ratio<=.25) coul='rgba(229,72,77,'+(.55+.45*pulse)+')';
    ctx.fillStyle=coul; ctx.fillRect(pv.x+2,pv.y+2,Math.max(0,(pv.w-4)*ratio),pv.h-4);
    if(state.flashCroiseur>0){ ctx.fillStyle='rgba(255,255,255,'+(state.flashCroiseur*.5)+')'; ctx.fillRect(pv.x+2,pv.y+2,pv.w-4,pv.h-4); }
    arrondi(pv.x,pv.y,pv.w,pv.h,RADIUS.bar); ctx.strokeStyle='#4a5a86'; ctx.lineWidth=2; ctx.stroke();
    ctx.fillStyle='#eef3ff'; ctx.font='9px "Press Start 2P", monospace'; ctx.textAlign='left'; ctx.fillText(trad('tt_pv'),pv.x+8,pv.y+pv.h/2+3);
    if(state.enFeu>0){ dessinerIcone(imgFeuIco,pv.x+pv.w-14,pv.y+pv.h/2,.6+.4*pulse); ctx.fillStyle='rgba(255,138,61,'+(.6+.4*pulse)+')'; ctx.font='9px monospace'; ctx.textAlign='right'; ctx.fillText('×'+state.enFeu,pv.x+pv.w-24,pv.y+pv.h/2+3); ctx.textAlign='left'; }
  }
  { const seuil=state.ultimeSeuil||ULTIME_MAX; const pr=Math.min(1,state.ultimeJauge/seuil), pret=state.ultimeJauge>=seuil, u=state.ULT;
    if(!pret){
      arrondi(u.x,u.y,u.w,u.h,RADIUS.bar); ctx.fillStyle='rgba(10,14,28,.8)'; ctx.fill();
      ctx.fillStyle='#7a3fd6'; ctx.fillRect(u.x+2,u.y+2,Math.max(0,(u.w-4)*pr),u.h-4);
      arrondi(u.x,u.y,u.w,u.h,RADIUS.bar); ctx.strokeStyle='#4a5a86'; ctx.lineWidth=2; ctx.stroke();
      ctx.fillStyle='#cbd6f0'; ctx.font='8px "Press Start 2P", monospace'; ctx.textAlign='center';
      ctx.fillText(trad('hud_ultime',{n:Math.floor(pr*100)}),state.LARGEUR/2,u.y+u.h/2+3); ctx.textAlign='left';
    } else {
      // prête : un vrai bouton jaune, à la même place et à la même échelle que la barre.
      arrondi(u.x,u.y,u.w,u.h,RADIUS.bar); ctx.fillStyle='rgba(255,210,61,'+(0.75+0.25*pulse)+')'; ctx.fill();
      ctx.strokeStyle='#ffd23d'; ctx.lineWidth=2; ctx.stroke();
      ctx.fillStyle='#241a00'; ctx.font='9px "Press Start 2P", monospace'; ctx.textAlign='center';
      const txtUlt=trad('hud_frappe_orbitale'), cyUlt=u.y+u.h/2+3, w=ctx.measureText(txtUlt).width;
      dessinerIcone(imgEclairIco,state.LARGEUR/2-w/2-10,cyUlt-3,1);
      ctx.fillText(txtUlt,state.LARGEUR/2,cyUlt); ctx.textAlign='left';
    }
  }

  // boutons d'action
  for(const a of state.ACT){ if(state.planete&&(a.id==='tourelle'||a.id==='bouclier')) continue;   // pas de sens sans croiseur à l'écran (masquées, pas juste grisées)
    const dispo=state.phase!=='joueur'?false:a.id==='tourelle'?(!state.actionFaite||state.tirsGratuits>0):a.id==='vaisseau'?(!state.actionFaite&&state.fighters.length<state.MAX_VAISSEAUX&&!state.hangar):a.id==='bouclier'?(!state.actionFaite&&state.boucliersRestants>0):(!state.actionFaite); const vise=a.id==='tourelle'&&state.modeTourelle;
    arrondi(a.x,a.y,a.w,a.h,RADIUS.bar); ctx.fillStyle=vise?'#e5a13d':(dispo?'#274a8a':'#243048'); ctx.fill(); ctx.strokeStyle=vise?'#ffd23d':'#3b5aa0'; ctx.lineWidth=2; ctx.stroke();
    // génération d'un vaisseau en cours : le bouton se remplit progressivement (tours écoulés / tours nécessaires)
    if(a.id==='vaisseau'&&state.hangar){ const ratio=Math.max(0,Math.min(1,1-state.hangar.tours/(state.hangar.toursInitial||2)));
      ctx.save(); arrondi(a.x,a.y,a.w,a.h,RADIUS.bar); ctx.clip(); ctx.fillStyle='rgba(47,214,160,.55)'; ctx.fillRect(a.x,a.y,a.w*ratio,a.h); ctx.restore(); }
    if(a.anim>0){ arrondi(a.x,a.y,a.w,a.h,RADIUS.bar); ctx.fillStyle='rgba(255,255,255,'+(a.anim*0.5)+')'; ctx.fill(); }
    ctx.fillStyle=dispo||vise?'#e8eefc':'#5b6580'; ctx.textAlign='center';
    let lbl=trad(a.lblKey); if(a.id==='tourelle'&&state.tirsGratuits>0) lbl=trad('hud_tourelle_x',{n:state.tirsGratuits+(state.actionFaite?0:1)});
    const ico=a.id==='vaisseau'?imgIcoVaisseau:a.id==='tourelle'?imgIcoTourelle:imgIcoBouclier;
    const cx=a.x+a.w/2, iy=a.y+5;
    if(ico){ ctx.save(); ctx.globalAlpha=(dispo||vise)?1:0.4;
      if(a.id==='vaisseau'){ const dy=Math.sin(t/280)*2.5; ctx.drawImage(ico,Math.round(cx-ico.width/2),Math.round(iy+dy)); }          // décollage : va-et-vient
      else if(a.id==='tourelle'){ ctx.translate(cx,iy+ico.height/2); ctx.rotate(Math.sin(t/380)*0.5); ctx.drawImage(ico,-ico.width/2,-ico.height/2); }  // pivote
      else { const s=1+0.18*(0.5+0.5*Math.sin(t/240)), w=ico.width*s, h=ico.height*s; ctx.drawImage(ico,cx-w/2,iy+ico.height/2-h/2,w,h); }             // bouclier : pulse
      ctx.restore(); }
    ctx.font='8px "Press Start 2P", monospace'; ctx.fillText(lbl,cx,a.y+a.h-7); ctx.textAlign='left'; }

  // Une fois l'action du tour posée (vaisseau/tourelle/bouclier), plus rien d'autre à faire :
  // le bouton scintille pour signaler qu'il n'y a plus qu'à valider (sans tirs gratuits restants,
  // qui autorisent encore d'autres tirs de tourelle avant de finir le tour).
  const actif=state.phase==='joueur', prete=actif&&state.actionFaite&&state.tirsGratuits<=0;
  arrondi(state.BTN.x,state.BTN.y,state.BTN.w,state.BTN.h,RADIUS.bar);
  ctx.fillStyle=prete?'rgba(255,210,61,'+(0.85+0.15*pulse)+')':(actif?'#2fd6a0':'#26424a'); ctx.fill();
  if(prete){ ctx.strokeStyle='#ffd23d'; ctx.lineWidth=2; ctx.stroke();
    ctx.fillStyle='rgba(255,255,255,'+(0.12+0.18*pulse)+')'; arrondi(state.BTN.x+3,state.BTN.y+3,state.BTN.w-6,state.BTN.h-6,RADIUS.bar-2); ctx.fill(); }
  ctx.fillStyle=prete?'#241a00':(actif?'#07240f':'#4b5f66'); ctx.font='13px "Press Start 2P", monospace'; ctx.textAlign='center'; ctx.fillText(trad('hud_fin_du_tour'),state.BTN.x+state.BTN.w/2,state.BTN.y+state.BTN.h/2+5); ctx.textAlign='left';

  // Transition phase
  if(state.phase==='ennemi'&&state.lockTimer>0.7){ ctx.fillStyle='rgba(229,72,77,'+(.2*(state.lockTimer-0.7)/0.2)+')'; ctx.fillRect(0,0,state.LARGEUR,state.HAUTEUR); }
}
function arrondi(x,y,w,h,r){ ctx.beginPath(); ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r); ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath(); }

/* =====================================================================
   ILLUSTRATION PIXEL ART DE L'ACCUEIL — ciel étoilé animé plein écran,
   rejoué en continu (boucle() l'appelle à chaque frame tant que phase
   est 'accueil' ou 'attente'), pas un décor statique dessiné une fois.
   ===================================================================== */
/* Tire un nouveau fond (thème de couleur + motif) pour l'illustration d'accueil — à appeler à
   chaque arrivée sur l'accueil (etatVide() au démarrage, retourAccueil() depuis la pause),
   jamais à chaque frame (sinon le fond changerait sans arrêt au lieu d'une fois par visite). */
export function randomiserAccueil(){ state.accueilThemeIdx=Math.floor(Math.random()*THEMES.length); state.accueilPatternIdx=Math.floor(Math.random()*4); }
/* astre pixel-art pour l'illustration d'accueil (variante de dessinerAstrePixel() ci-dessus,
   paramétrée par un contexte de canvas arbitraire — celui de l'illustration, pas celui du jeu). */
function astreIllustration(cc,px,py,R,a){
  const pas=Math.max(3,Math.round(R/7)); px=Math.round(px); py=Math.round(py);
  if(a.kind==='soleil'){ cc.fillStyle=a.c1; const ray=pas;
    for(let k=0;k<8;k++){ const aa=k*Math.PI/4, rx=px+Math.cos(aa)*(R+pas*1.6), ry=py+Math.sin(aa)*(R+pas*1.6); cc.globalAlpha=.6; cc.fillRect(Math.round(rx-ray/2),Math.round(ry-ray/2),ray,ray); } cc.globalAlpha=1; }
  for(let gx=-R;gx<=R;gx+=pas) for(let gy=-R;gy<=R;gy+=pas){ const cx=gx+pas/2, cy=gy+pas/2; if(Math.hypot(cx,cy)>R) continue;
    const s=(cx+cy)/R; cc.fillStyle = s<-0.4?a.c1 : (s>0.5?a.c3:a.c2); cc.fillRect(px+gx,py+gy,pas,pas); }
}
let illusEtoiles=null;
function initIllusEtoiles(W,H){
  illusEtoiles=[];
  const L=[{n:50,v:5,sz:1,a:.35,col:'#8ea0c8'},{n:34,v:12,sz:1.5,a:.6,col:'#cdd8ff'},{n:16,v:22,sz:2,a:.9,col:'#ffffff'}];
  for(const l of L) for(let i=0;i<l.n;i++) illusEtoiles.push({x:Math.random()*W,baseY:Math.random()*H,v:l.v,sz:l.sz,a:l.a,col:l.col});
}
export function dessinerIllustration(t){
  const cv=document.getElementById('illus'); if(!cv) return; const c=cv.getContext('2d'); c.imageSmoothingEnabled=false;
  // calque transparent au-dessus du titre/boutons (voir #illusImpact dans index.html) : seule
  // l'explosion (souffle + étincelles) s'y dessine, pour vraiment recouvrir le titre au moment
  // de l'impact plutôt que de rester cachée derrière lui comme le reste de l'illustration.
  const cvI=document.getElementById('illusImpact'), ci=cvI&&cvI.getContext('2d');
  if(ci) ci.imageSmoothingEnabled=false;
  const W=state.LARGEUR||240, H=state.HAUTEUR||420;
  if(cv.width!==W||cv.height!==H){ cv.width=W; cv.height=H; illusEtoiles=null; }
  if(cvI&&(cvI.width!==W||cvI.height!==H)){ cvI.width=W; cvI.height=H; }
  if(ci) ci.clearRect(0,0,W,H);
  if(!illusEtoiles) initIllusEtoiles(W,H);
  c.clearRect(0,0,W,H); c.fillStyle='#070b18'; c.fillRect(0,0,W,H);
  // étoiles qui défilent doucement vers le bas, en boucle (position dérivée de t, pas d'état à faire évoluer)
  for(const s of illusEtoiles){ const y=(s.baseY+t*s.v/1000)%H; c.globalAlpha=s.a; c.fillStyle=s.col; c.fillRect(Math.round(s.x),Math.round(y),s.sz,s.sz); } c.globalAlpha=1;
  // Fond (astre/nébuleuse/amas) tiré au hasard à CHAQUE arrivée sur l'accueil (voir
  // randomiserAccueil(), appelée par etatVide() et retourAccueil()) — jamais le même fond que
  // la fois précédente. Réutilise la palette des thèmes de secteur (THEMES) pour rester cohérent
  // avec le reste du jeu plutôt qu'une couleur ad hoc propre à l'accueil.
  const thAccueil=THEMES[(state.accueilThemeIdx||0)%THEMES.length], patAccueil=state.accueilPatternIdx||0;
  if(patAccueil===0){
    for(let i=0;i<2;i++){ const nx=W*(i===0?0.28:0.78), ny=H*(i===0?0.16:0.24), nr=W*0.5;
      const g=c.createRadialGradient(nx,ny,0,nx,ny,nr); g.addColorStop(0,thAccueil.neb[i%thAccueil.neb.length]); g.addColorStop(1,'rgba(7,11,24,0)');
      c.fillStyle=g; c.fillRect(nx-nr,ny-nr,nr*2,nr*2); }
  } else if(patAccueil===2){
    let seedA=1234567+(state.accueilThemeIdx||0)*777; const rndA=()=>((seedA=seedA*16807%2147483647)/2147483647);
    const cxA=W*0.5, cyA=H*0.22, RA=W*0.5;
    for(let k=0;k<90;k++){ const aa=rndA()*7, rr=Math.pow(rndA(),0.6)*RA, x=cxA+Math.cos(aa)*rr, y=cyA+Math.sin(aa)*rr*0.6;
      c.globalAlpha=0.3+rndA()*0.6; c.fillStyle=rndA()<0.35?thAccueil.star:'#cdd8ff'; c.fillRect(Math.round(x),Math.round(y),1,1); } c.globalAlpha=1;
  } else if(patAccueil===3){ astreIllustration(c, W*0.82, H*0.15, Math.round(W*0.22), thAccueil.astre);
  } else { astreIllustration(c, W-Math.round(W*0.16)*0.9, H*0.13, Math.round(W*0.16), thAccueil.astre); }
  // +1px sur chaque case : avec une échelle non entière (le croiseur/les alliés/l'ennemi de
  // l'illustration d'accueil sont volontairement à une échelle fractionnaire — scC pour
  // remplir exactement la largeur, scJ/eSc pour des proportions précises), le point de départ
  // de chaque case arrondi indépendamment (Math.round) ne retombe pas toujours exactement à
  // la case suivante : ça laissait un pixel de fond (noir) visible en seam entre certaines
  // cases adjacentes. La case suivante (dessinée juste après, plus à droite/en bas) redessine
  // par-dessus ce léger débordement, donc ça ne change rien au résultat visuel — sauf à
  // combler la fissure.
  const cellPx=sc=>Math.ceil(sc)+1;
  const drawSur=(ctx,g,ox,oy,sc)=>{ const cp=cellPx(sc); for(let y=0;y<g.length;y++){ const row=g[y]; for(let x=0;x<row.length;x++){ const col=PAL[row[x]]; if(!col) continue; ctx.fillStyle=col; ctx.fillRect(Math.round(ox+x*sc),Math.round(oy+y*sc),cp,cp); } } };
  const draw=(g,ox,oy,sc)=>drawSur(c,g,ox,oy,sc);
  const sc=Math.max(3,Math.round(W/95)), bob=ph=>Math.sin(t/480+ph)*3;
  // Tout se joue dans la bande basse de l'écran : le croiseur (pleine largeur, collé au bord
  // bas) et les deux vaisseaux alliés qui veillent juste au-dessus. La bande médiane (titre +
  // boutons, en DOM par-dessus) reste entièrement vide — jamais traversée par l'illustration.
  const scC=W/CROISEUR[0].length, croiseurH=CROISEUR.length*scC, croiseurY=H-croiseurH;
  draw(CROISEUR, 0, croiseurY, scC);

  const scJ=sc*1.05, alliesY=croiseurY-JOUEUR.length*scJ-H*0.025;
  const xGauche=W*0.20, xDroite=W*0.80-ROUGE[0].length*scJ;
  const posGauche={x:xGauche+JOUEUR[0].length*scJ/2, y:alliesY+JOUEUR.length*scJ/2};
  const posDroite={x:xDroite+ROUGE[0].length*scJ/2, y:alliesY+ROUGE.length*scJ/2};
  draw(JOUEUR, xGauche, alliesY+bob(0), scJ);
  draw(ROUGE,  xDroite, alliesY+bob(2.4), scJ);

  // Des chasseurs ennemis (Ailes) descendent du haut de l'écran, en vol continu, en passant
  // devant le titre "CROISEUR" (calque de devant ci, au-dessus du DOM) — jamais un temps
  // d'arrêt/pause : chacun est abattu EN PLEIN VOL par l'un des deux alliés au sol, au niveau
  // du titre, sans jamais décélérer jusqu'à s'immobiliser (vitesse constante — voir p ci-dessous,
  // pas d'ease-out qui ralentirait artificiellement l'arrivée). N_VAGUE chasseurs sont
  // entrelacés (leur horloge propre est décalée de STAGGER) : à tout instant, plusieurs sont
  // visibles à des stades différents (arrivée/explosion), pour une impression de vague massive
  // plutôt qu'un assaut isolé toutes les 2.3s. Cycle rejoué en boucle sans état à mémoriser côté
  // dessin : tout dérive de t comme le reste de l'illustration ; hash() en tire un pseudo-aléatoire
  // stable par vague (quel allié tire, où l'impact tombe, par où le chasseur entre en haut) sans
  // jamais appeler Math.random() à chaque frame (ça scintillerait). Seule la secousse du titre
  // (DOM) a besoin d'un vrai état : voir déclencherSecousseTitre().
  const CYCLE=2300, T_ENTREE=850, T_TIR=180, T_BOOM=300, N_VAGUE=3, STAGGER=CYCLE/N_VAGUE;
  const hash=n=>{ const x=Math.sin(n*12.9898)*43758.5453; return x-Math.floor(x); };
  const eSc=sc*0.6, eW=AILE[0].length*eSc, eH=AILE.length*eSc;

  if(ci) for(let i=0;i<N_VAGUE;i++){
    const tv=t-i*STAGGER; if(tv<0) continue;
    const cycleIdx=Math.floor(tv/CYCLE), tc=tv-cycleIdx*CYCLE, seed=cycleIdx*17+i*101;
    // Tir allié (ou croiseur, voir plus bas) : toujours bleu (même convention que le laser en
    // jeu — rouge = tir ennemi, bleu = tir allié).
    // Le point d'impact suit le titre : ~36% de la hauteur de l'écran, là où #accueil-contenu
    // place "CROISEUR" (même boîte #scene que le canvas, donc la fraction reste valable quelle
    // que soit la résolution réelle). Large éventail en X (au lieu d'une zone étroite) : un
    // nouvel impact à chaque fois "pas au même endroit" le long du titre.
    // startXHaut varie largement (entrée en haut d'écran, pas au même endroit à chaque vague) ;
    // restX ne s'en écarte plus que de quelques pixels (léger cap "diagonal") au lieu d'un tirage
    // indépendant qui pouvait faire dériver le chasseur en grand travers de l'écran.
    const startXHaut=W*(0.1+0.8*hash(seed+5.5));
    const restX=Math.max(W*0.06,Math.min(W*0.94,startXHaut+(hash(seed+7.7)-0.5)*28)), restY=H*0.36+H*0.02*(hash(seed+3.3)-0.5);
    // De temps en temps, c'est le croiseur lui-même qui tire (tir plus gros/plus puissant)
    // plutôt qu'un des deux alliés — casse la régularité "toujours les mêmes tireurs".
    const croiseurTire=hash(seed+50.5)<0.22;
    const attaquant=croiseurTire?{x:W*0.5,y:croiseurY+2}:(hash(seed)<0.5?posGauche:posDroite);

    if(tc<T_ENTREE){
      // vitesse constante (p linéaire, pas d'ease-out) : le chasseur file jusqu'au point
      // d'impact sans jamais ralentir ni se figer — il n'y a pas de "case" arrêtée à viser,
      // le laser des dernières ms converge sur sa position réelle, toujours en mouvement.
      const p=tc/T_ENTREE;
      const ex=startXHaut+(restX-startXHaut)*p, ey=-eH+(restY-(-eH))*p;
      ci.globalAlpha=Math.min(1,p*4); drawSur(ci,AILE, ex-eW/2, ey-eH/2, eSc); ci.globalAlpha=1;
      if(tc>T_ENTREE-T_TIR){
        // tir bref (façon sabre/blaster) qui parcourt la distance plutôt qu'une longue ligne
        // statique, double trait parallèle comme tous les autres lasers du jeu. Tir du croiseur :
        // trait plus large/plus lumineux (même convention que "gros" en jeu).
        const [tx,ty,hx,hy,pb]=traitBref(attaquant.x,attaquant.y,ex,ey,(tc-(T_ENTREE-T_TIR))/1000,croiseurTire?52:36);
        if(pb<1){ const decal=croiseurTire?4:2, lw=croiseurTire?4:2;
          for(const [ax,ay,bx,by] of segmentsParalleles(tx,ty,hx,hy,decal)){
            ci.lineWidth=lw; ci.strokeStyle='rgba(80,170,255,.85)'; ci.beginPath(); ci.moveTo(ax,ay); ci.lineTo(bx,by); ci.stroke();
            ci.strokeStyle='rgba(55,224,255,1)'; ci.lineWidth=croiseurTire?2:1; ci.beginPath(); ci.moveTo(ax,ay); ci.lineTo(bx,by); ci.stroke();
          }
        }
      }
    } else if(tc<T_ENTREE+T_BOOM){
      const tb=tc-T_ENTREE, idx=Math.min(NFRAMES-1,Math.floor(tb/50)), im=framesBoom[idx], dw=W*0.22, dh=dw;
      declencherSecousseTitre(seed);
      const glow=ci.createRadialGradient(restX,restY,0,restX,restY,dw); glow.addColorStop(0,'rgba(255,138,61,'+(.5*(1-tb/T_BOOM))+')'); glow.addColorStop(1,'rgba(255,138,61,0)');
      ci.fillStyle=glow; ci.fillRect(restX-dw,restY-dh,dw*2,dh*2);
      ci.drawImage(im, restX-dw/2, restY-dh/2, dw, dh);
      // étincelles qui jaillissent en éventail vers le haut, au-dessus du point d'impact —
      // le souffle rond seul ne "lisait" pas assez comme une explosion au niveau du titre.
      const prog=tb/T_BOOM;
      for(let k=0;k<6;k++){
        const ang=-Math.PI/2+(hash(seed+20+k)-0.5)*Math.PI*0.9, spd=W*(0.05+0.06*hash(seed+30+k));
        const px=restX+Math.cos(ang)*spd*prog, py=restY+Math.sin(ang)*spd*prog;
        ci.globalAlpha=Math.max(0,1-prog); ci.fillStyle=k%2?'#ffd23d':'#ff8a3d';
        ci.fillRect(Math.round(px-1.5),Math.round(py-1.5),3,3);
      }
      ci.globalAlpha=1;
    }
  }
  // brillance dorée occasionnelle du titre, cycle indépendant des vagues de chasseurs
  declencherBrillanceTitre(Math.floor(t/BRILLANCE_CYCLE));
}
const BRILLANCE_CYCLE=7000;
/* secoue le titre de l'accueil (DOM) à l'instant précis où l'ennemi explose à sa hauteur —
   un seul état mutable de tout le module (dernierCycleSecoue), pour ne déclencher la
   secousse qu'une fois par explosion malgré dessinerIllustration() rappelée à 60 fps :
   sans lui, la classe serait réappliquée à chaque frame du souffle (~18 fois de suite). */
let dernierCycleSecoue=-1;
function declencherSecousseTitre(cycleIdx){
  if(cycleIdx===dernierCycleSecoue) return; dernierCycleSecoue=cycleIdx;
  const h1=document.querySelector('#accueil h1'); if(!h1) return;
  h1.classList.remove('secousse'); void h1.offsetWidth; h1.classList.add('secousse');
  setTimeout(()=>h1.classList.remove('secousse'),400);
}
/* brillance dorée périodique du titre (voir @keyframes brillanceTitre dans index.html) — même
   pattern de dédoublonnage que déclencherSecousseTitre(), sur son propre cycle (BRILLANCE_CYCLE,
   indépendant de celui des vagues de chasseurs). */
let dernierCycleBrille=-1;
function declencherBrillanceTitre(cycleIdx){
  if(cycleIdx===dernierCycleBrille) return; dernierCycleBrille=cycleIdx;
  const h1=document.querySelector('#accueil h1'); if(!h1) return;
  h1.classList.remove('brille'); void h1.offsetWidth; h1.classList.add('brille');
  setTimeout(()=>h1.classList.remove('brille'),1600);
}
