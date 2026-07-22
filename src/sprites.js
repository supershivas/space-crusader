/* =====================================================================
   PIXEL ART — palettes, grilles de sprites, cuisson en canvas
   ===================================================================== */
export const PAL={'.':null,
 'W':'#c9d0da','w':'#e6ebf2','D':'#7d8794','C':'#37e0ff','A':'#4aa3ff','E':'#ff8a3d','e':'#ffd23d','G':'#aeb7c4',
 'B':'#242a35','b':'#474e5c','S':'#8b95a3','s':'#c3ccd8','O':'#37e0ff',
 'F':'#eef2f8','f':'#c3ccd8','Q':'#ff6b3d',
 'R':'#e5484d','r':'#ff8f92','K':'#8f2b2f',
 'N':'#8f857a','n':'#b6ab9f','m':'#5c544c',
 'I':'#bfe9ff','i':'#37a0d6','M':'#ffb26b','o':'#e07a2f','y':'#ffd23d','V':'#8cff5a','v':'#4fce2f','x':'#8f2b3a','g':'#3a3f4a',
 'X':'#c94257','q':'#ff6b3d','k':'#20242e','u':'#6b3fa0','U':'#9b6bd6','c':'#1f7a9c','j':'#2f7a3a','J':'#5fce6a','z':'#4a5262','Z':'#8b95a3'};
export const CROISEUR=["...G...G...G...G...G...G...G...G...G...","wWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWw","WWWWWWWCCWWWWWWWWCCCCCWWWWWWWWCCWWWWWWW","WWWWWWWCWWWWWWWWwWCCCWwWWWWWWWWCWWWWWWW","WWWWWWDWWWWWWDWWWWWDWWWWWDWWWWWWDWWWWWW","WWWWWWDWWWWWWDWWWWWDWWWWWDWWWWWWDWWWWWW","DDWWWWDWWWWWWDWWWWWDWWWWWDWWWWWWDWWWWDD","ADDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDA","A.EeE...EeE...EeE...EeE...EeE...EeE...A"];
export const JOUEUR=["BB.......BB","BB..sss..BB","BB.sSSSs.BB","BBbSSOSSbBB","BB.sSSSs.BB","BB..sss..BB","BB.......BB","Bb.......bB","bB.......Bb"];
export const ROUGE=[".R.......R.","RR.......RR","RR..sss..RR","RR.sSSSs.RR","RRKSSESSKRR","RR.sSSSs.RR","RR..sss..RR","RR.......RR",".R.......R."];
/* vaisseaux alliés à construire : coque de couleur + silhouette différentes */
export const JOUEUR_RAPIDE=["BB...C...BB","BB..sCs..BB","BB.sSCSs.BB","BBbSSCSSbBB","BB.sSCSs.BB","BB..sCs..BB","BB...C...BB","Bb.......bB",".B.......B."];
export const JOUEUR_BOMBER=["BB.......BB","BB..sss..BB","BB.sSSSs.BB","BBbSSESSbBB","BB.sSSSs.BB","BB..sEs..BB","BB...E...BB","Bb..EEE..bB","bB.......Bb"];
export const JOUEUR_BOUCLIER=["BBAAAAAAABB","BB..sss..BB","BB.sSSSs.BB","BBbSSASSbBB","BB.sSSSs.BB","BB..sss..BB","BBAAAAAAABB","Bb.......bB","bB.......Bb"];
/* allié SNIPER : long canon vert, tir à longue portée (±2 colonnes) */
export const JOUEUR_SNIPER=["BB...V...BB","BB...V...BB","BB..sVs..BB","BBbSSVSSbBB","BB.sSSSs.BB","BB..sss..BB","BB.......BB","Bb.......bB","bB.......Bb"];

/* --- Nouveaux sprites basés sur les images uploadées --- */
export const AILE=[
"....W....",
".W.WwW.W.","WwWwWwWwW","WwWWWWWwW","WwWwWwWwW",
".W.WwW.W.","..WwWwW..","..WwWwW..","..WwWwW..",
"..WwWwW..","..WwWwW..","..WwWwW..","..WwWwW..",
"...WwW...","...WwW...","...WwW...","...WwW...",
"....W....","....W....","....Q...."
];
export const CHASSEUR=[
"....W....",
".W.WyW.W.","WyWyWyWyW","WyWWWWWwW","WyWyWyWyW",
".W.WyW.W.","..WyWyW..","..WyWyW..","..WyWyW..",
"...WyW...","...WyW...","...WyW...",
"....W....","....y...."
];
export const BOMBARDIER=[
".....W.....",
".W..WwW..W.","WwWWWWWWWwW","WwWWWWWWWwW","WwWWWWWWWwW",
"WwWWWWWWWwW","WwWWWWWWWwW","WwWWCCWWWwW","WwWWWCWWWwW",
".W.WWCW.W.","..WWWCWW..","..WWWCWW..","..WWWCWW..",
"...WWCW...","...WWCW...","...WWCW...",
"....WCW...","....WCW...","....WWW...","....WQW..."
];
export const ECLAIREUR=[
"....W....",
".W.WwW.W.","WvWwWwWvW","WvWWWWWvW","WvWvWvWvW",
".W.WvW.W.","..WvWvW..","..WvWvW..","..WvWvW..",
"..WvWvW..","..WvWvW..","..WvWvW..",
"...WvW...","...WvW...","...WvW...",
"....W....","....W....","....V...."
];
export const ASTER=["...NNNN....","..NnNNNNN..",".NnnNNNNNN.",".NNNNNNNNm.","NNNNNNNNNNm","NNNNNNNNNNm","NNNNNNNNNmm",".NNNNNNNNm.",".mNNNNNNm..","..mmNNmm...","...mmmm...."];
/* ennemi LOURD : aile blindée acier à noyau rouge (3 PV, avance lentement) */
export const AILE_LOURD=[
".ZZ...ZZ.",
"ZZZZ.ZZZZ","ZZsSSSsZZ","ZsSSKSSsZ","ZsSKRKSsZ",
"ZsSKRKSsZ","ZsSSKSSsZ","ZZsSSSsZZ",".ZZSSSZZ.",
"..ZSSSZ..","..ZSKSZ..","...ZKZ...","...ZKZ...",
"....K...."
];
/* ailes d'élite : porteur (doré, renforce) et brouilleur (violet, protège) */
export const AILE_PORTEUR=["....e....",".e.eMe.e.","eMeMeMeMe","eMeeeeeMe","eMeMeMeMe",".e.eMe.e.","..eMeMe..","..eMeMe..","..eMeMe..","..eMeMe..","..eMeMe..","..eMeMe..","..eMeMe..","...eMe...","...eMe...","...eMe...","...eMe...","....e....","....e....","....e...."];
export const AILE_BROUILLEUR=["....U....",".U.UuU.U.","UuUuUuUuU","UuUUUUUuU","UuUuUuUuU",".U.UuU.U.","..UuUuU..","..UuUuU..","..UuUuU..","..UuUuU..","..UuUuU..","..UuUuU..","..UuUuU..","...UuU...","...UuU...","...UuU...","...UuU...","....U....","....U....","....u...."];
export const BOSS_CANON=["..XXXXXXXXXXX..",".XXXXXXXXXXXXX.","XXXXggqqqggXXXX","XXXXgqqqqqgXXXX","XXXXXXXXXXXXXXX","XXXXXXXXXXXXXXX",".XX.XXXXXXX.XX.",".yy.XXXXXXX.yy.",".yy.........yy."];
export const BOSS_SNIPER=[".....uUu.....",".....uUu.....","...uuUUUuu...","..uUUUUUUUu..",".uUUUqqqUUUu.","uUUUUqQqUUUUu","uUUUUUUUUUUUu",".uUU.....UUu.","..u.......u.."];
export const BOSS_RAYON=["...cccCccc...","..ccCCCCCcc..",".ccCCCCCCCcc.","ccCCCqqqCCCcc","ccCCqqQqqCCcc","ccCCCqqqCCCcc",".ccCCCCCCCcc.","..cc.CCC.cc..","...c..C..c..."];
export const BOSS_NUEE=[".JJJJJJJJJJJ.","JJJJJJJJJJJJJ","JkkJJkkJJkkJJ","JkkJJkkJJkkJJ","JJJJJJJJJJJJJ","JJJqJJqJJqJJJ",".JJJJJJJJJJJ.","..JJJJJJJJJ..","...JJJJJJJ..."];
export const BOSS_BLINDE=["ZZZZZZZZZZZZZ","ZkZZkZZkZZkZZ","ZZZZZZZZZZZZZ","ZZzzzZqZzzzZZ","ZZzzzqQqzzzZZ","ZZZZZZZZZZZZZ","ZkZZkZZkZZkZZ","ZZZZZZZZZZZZZ",".ZZZZZZZZZZZ."];
export const BOSS_GRIDS={canon:BOSS_CANON,sniper:BOSS_SNIPER,rayon:BOSS_RAYON,nuee:BOSS_NUEE,blinde:BOSS_BLINDE};

export function cuire(grille,echelle){ const w=grille[0].length,h=grille.length,off=document.createElement('canvas'); off.width=w*echelle; off.height=h*echelle;
  const c=off.getContext('2d'); for(let y=0;y<h;y++) for(let x=0;x<w;x++){ const col=PAL[grille[y][x]]; if(!col) continue; c.fillStyle=col; c.fillRect(x*echelle,y*echelle,echelle,echelle); } return off; }

/* recuit un sprite pour qu'il tienne DANS la case (selon la taille de case courante) */
export function cuireFit(g,CELL){ const md=Math.max(g[0].length,g.length); return cuire(g,Math.max(1,Math.floor(CELL*0.92/md))); }

/* bonus & icônes */
export const BONUS_PV=[".R.R.","RRRRR","RRRRR",".RRR.","..R.."];
export const BONUS_VAIS=["y.M.y","y.M.y","yMMMy","y.M.y","y...y"];
export const BONUS_TIR=["..o..",".ooo.","oo.oo",".ooo.","..o.."];
export const ICO_VAISSEAU=["..F..",".FFF.","FC.CF",".FFF.","..F.."];
export const ICO_TOURELLE=["..y..",".y.y.","y.R.y",".y.y.","..y.."];
export const ICO_BOUCLIER=["..A..",".AAA.","AAAAA","AAAAA",".AAA.","..A.."];
export const imgBonusPV=cuire(BONUS_PV,4), imgBonusTIR=cuire(BONUS_TIR,4), imgBonusVAIS=cuire(BONUS_VAIS,4);
export const imgIcoVaisseau=cuire(ICO_VAISSEAU,3), imgIcoTourelle=cuire(ICO_TOURELLE,3), imgIcoBouclier=cuire(ICO_BOUCLIER,3);

/* explosions : anneaux qui grandissent */
export const NFRAMES=6, EG=15, EPS=4;
export const framesBoom=(function(){ const fr=[]; for(let f=0;f<NFRAMES;f++){ const off=document.createElement('canvas'); off.width=EG*EPS; off.height=EG*EPS; const c=off.getContext('2d');
  const cx=(EG-1)/2, cy=(EG-1)/2, outer=1.2+f*1.75, inner=outer-2.4;
  for(let y=0;y<EG;y++) for(let x=0;x<EG;x++){ const d=Math.hypot(x-cx,y-cy); let col=null;
    if(f<2&&d<=inner+.6) col='#fff2b0'; else if(d<=outer&&d>=inner) col=d<inner+1?'#ffe14d':(d<inner+2?'#ff8a3d':'#ff5a3d');
    if(col){ c.globalAlpha=Math.max(.15,1-f*.13); c.fillStyle=col; c.fillRect(x*EPS,y*EPS,EPS,EPS); } } fr.push(off); } return fr; })();
