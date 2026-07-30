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
 'X':'#c94257','q':'#ff6b3d','k':'#20242e','u':'#6b3fa0','U':'#9b6bd6','c':'#1f7a9c','j':'#2f7a3a','J':'#5fce6a','z':'#4a5262','Z':'#8b95a3',
 'H':'#ff2a5a','h':'#ff6b8a','L':'#2a8fff','l':'#6bb8ff','P':'#ffcc00','p':'#ffee88','T':'#5a4a3a','t':'#8a7a6a'};
/* croiseur : tourelles à 2 étages (base large + canon), rivets sur la coque haute et entre
   les hublots, lignes de structure verticales déjà présentes conservées. */
export const CROISEUR=["...D...D...D...D...D...D...D...D...D...","..GGG.GGG.GGG.GGG.GGG.GGG.GGG.GGG.GGG..","wWWWWDWWWDWWWDWWWDWWWDWWWDWWWDWWWDWWWWw","WWWWWWWCCWWWWWWWWCCCCCWWWWWWWWCCWWWWWWW","WWDWWWWCWWWDWWWWwWCCCWwWWWWDWWWCWWWDWWW","WWWWWWDWWWWWWDWWWWWDWWWWWDWWWWWWDWWWWWW","WWWWWWDWWWWWWDWWWWWDWWWWWDWWWWWWDWWWWWW","DDWWWWDWWWWWWDWWWWWDWWWWWDWWWWWWDWWWWDD","ADDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDA","A.EeE...EeE...EeE...EeE...EeE...EeE...A"];
export const JOUEUR=["BB.......BB","BB..sss..BB","BB.sSSSs.BB","BBbSSOSSbBB","BB.sSSSs.BB","BB..sss..BB","BB.......BB","Bb.......bB","bB.......Bb"];
export const ROUGE=[".R.......R.","RR.......RR","RR..sss..RR","RR.sSSSs.RR","RRKSSESSKRR","RR.sSSSs.RR","RR..sss..RR","RR.......RR",".R.......R."];
/* vaisseaux alliés à construire : coque de couleur + silhouette différentes */
export const JOUEUR_RAPIDE=["BB...C...BB","BB..sCs..BB","BB.sSCSs.BB","BBbSSCSSbBB","BB.sSCSs.BB","BB..sCs..BB","BB...C...BB","Bb.......bB",".B.......B."];
export const JOUEUR_BOMBER=["BB.......BB","BB..sss..BB","BB.sSSSs.BB","BBbSSESSbBB","BB.sSSSs.BB","BB..sEs..BB","BB...E...BB","Bb..EEE..bB","bB.......Bb"];
export const JOUEUR_BOUCLIER=["BBAAAAAAABB","BB..sss..BB","BB.sSSSs.BB","BBbSSASSbBB","BB.sSSSs.BB","BB..sss..BB","BBAAAAAAABB","Bb.......bB","bB.......Bb"];
/* allié SNIPER : long canon vert, tir à longue portée (±2 colonnes) */
export const JOUEUR_SNIPER=["BB...V...BB","BB...V...BB","BB..sVs..BB","BBbSSVSSbBB","BB.sSSSs.BB","BB..sss..BB","BB.......BB","Bb.......bB","bB.......Bb"];
/* allié TRANSPORTEUR : large soute (baie de largage), largue des mini-navettes près du croiseur */
export const JOUEUR_TRANSPORTEUR=["BB.......BB","BB.ggggg.BB","BG.sSSSs.GB","BGbSSOSSbGB","BG.sSSSs.GB","BB.ggggg.BB","BB.......BB","Bb.......bB","bB.......Bb"];
/* allié MÉDIC : croix verte, soigne un allié adjacent au lieu de combattre */
export const JOUEUR_MEDIC=["BB.......BB","BB..VVV..BB","BB.sVSVs.BB","BBbSSVSSbBB","BB.sVSVs.BB","BB..VVV..BB","BB.......BB","Bb.......bB","bB.......Bb"];
/* mini-navette alliée, larguée par le Transporteur (case libre proche du croiseur, diagonales incluses) */
export const MINI_NAVETTE_ALLIEE=["..B..",".BBB.","BBCBB",".BBB.","..B.."];

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
".W.WyW.W.","WyWyWyWyW","WyWWWWWyW","WyWyWyWyW",
".W.WyW.W.","..WyWyW..","..WyWyW..","..WyWyW..",
"...WyW...","...WyW...","...WyW...",
"....W....","....y...."
];
export const BOMBARDIER=[
".....W.....",
".W..WwW..W.","WwWWWWWWWwW","WwWWWWWWWwW","WwWWWWWWWwW",
"WwWWWWWWWwW","WwWWWWWWWwW","WwWWCCCWWwW","WwWWWCWWWwW",
".W.WWCWW.W.","..WWWCWWW..","..WWWCWWW..","..WWWCWWW..",
"...WWCWW...","...WWCWW...","...WWCWW...",
"....WCW....","....WCW....","....WWW....","....WQW...."
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
/* ---- NOUVEAUX ENNEMIS (Lot 1) ---- */
export const STRONGHOLD=["...BBBBBBBBB...","..BBBBBBBBBBB..",".BBBBBBBBBBBBB.","BBBBBRRRRRBBBBB","BBBBBRrrrRBBBBB","BBBBBRrKrRBBBBB","BBBBBRrrrRBBBBB","BBBBBRRRRRBBBBB",".BBBBBBBBBBBBB.","..BBBBBBBBBBB..","...BBBBBBBBB...","....BBBBBBB....",".....BBBBB.....","......BBB......",".......B......."];
export const MINI_NAVETTE=["..B..",".BBB.","BBRBB",".BBB.","..B.."];
export const REGENERATEUR=["....G....",".G.GwG.G.","GwGwGwGwG","GwWWWWWwG","GwWwWwWwG",".G.WwW.G.","..GwWwG..","..GvWvG..","..GvWvG..","..GvWvG..","...vWv...","...vWv...","...vWv...","....W....","....W...."];
export const MINI_SNIPER=["....W....",".W.WyW.W.","WyWyWyWyW","WyWWWWWwW","WyWyWyWyW",".W.WyW.W.","..WyWyW..","..WyWyW..","..WyWyW..","..WyWyW..","...WyW...","...WyW...","...WyW...","....W....","....W...."];
export const DIAGONAL_D=["....W....",".W.WAW.W.","WAWAWAWAW","WAWWWWWAW","WAWAWAWAW",".W.WAW.W.","..WAWAW..","..WAWAW..","..WAWAW..","..WAWAW..","...WAW...","...WAW...","...WAW...","....W....","....A...."];
export const DIAGONAL_G=["....W....",".W.WHW.W.","WHWHWHWHW","WHWWWWWHW","WHWHWHWHW",".W.WHW.W.","..WHWHW..","..WHWHW..","..WHWHW..","..WHWHW..","...WHW...","...WHW...","...WHW...","....W....","....H...."];
export const MIMIC=["....y....",".y.yMy.y.","yMyMyMyMy","yMyyyyyMy","yMyMyMyMy",".y.yMy.y.","..yMyMy..","..yMyMy..","..yMyMy..","..yMyMy..","...yMy...","...yMy...","...yMy...","....y....","....y...."];
export const VOID=["....k....",".k.kkk.k.","kkkUUUkkk","kkUUUUUkk","kkkUUUkkk",".k.kUk.k.","..kUUUk..","..kUUUk..","..kUUUk..","..kUUUk..","...kUk...","...kUk...","...kUk...","....k....","....k...."];
/* ennemi SABOTEUR : décharge électrique, gèle un allié 1 tour */
export const SABOTEUR=["....W....",".W.WCW.W.","WCWCWCWCW","WCWWWWWCW","WCWCWCWCW",".W.WCW.W.","..WCWCW..","..WCWCW..","..WCWCW..","...WCW...","...WCW...","...WCW...","....W....","....C...."];
/* ennemi BRÛLEUR : tir incendiaire, brûle le croiseur (1 PV/tour) */
export const BRULEUR=["....W....",".W.WEW.W.","WEWEWEWEW","WEWWWWWEW","WEWEWEWEW",".W.WEW.W.","..WEWEW..","..WEWEW..","..WEWEW..","...WEW...","...WEW...","...WEW...","....W....","....E...."];
/* ennemi TRANSPORTEUR : largue une mini-navette ennemie dans le camp allié (cible visible 1 tour avant) */
export const AILE_TRANSPORTEUR=["....W....",".W.WGW.W.","WGWGWGWGW","WGWWWWWGW","WGWGWGWGW",".W.WGW.W.","..WGWGW..","..WGWGW..","..WGWGW..","...WGW...","...WGW...","...WGW...","....W....","....G...."];
/* élite TITAN : variante dorée de l'aile blindée, encore plus de PV */
export const TITAN=[".ZZ...ZZ.","ZZZZ.ZZZZ","ZZsSSSsZZ","ZsSSeSSsZ","ZsSeMeSsZ","ZsSeMeSsZ","ZsSSeSSsZ","ZZsSSSsZZ",".ZZSSSZZ.","..ZSSSZ..","..ZSeSZ..","...ZeZ...","...ZeZ...","....e...."];

/* ---- OBSTACLES (Lot 1) ---- */
export const DEBRIS_1=[".nNNn.","NmWmmN","NmmmWn","nWmmmN","NmmWmN",".nNNn."];
export const DEBRIS_2=["..NNn.",".NmWmN","NmWmmn","nmmWmN","NmWmN.","nNNn.."];
export const STATION_PIECE=["bBBBBBBBb","BSWssWSB.","BsCiiCsBB","BSiOOOiSB","BsCiiCsB.","BSWssWSBb","bBB..BBb.",".b..bB..."];
export const BARRIERE=["WDDDDDW","DCiCiCD","DiCiCiD","DCiCiCD","DiCiCiD","DCiCiCD","WDDDDDW"];

/* ailes d'élite : porteur (doré, renforce) et brouilleur (violet, protège) */
export const AILE_PORTEUR=["....e....",".e.eMe.e.","eMeMeMeMe","eMeeeeeMe","eMeMeMeMe",".e.eMe.e.","..eMeMe..","..eMeMe..","..eMeMe..","..eMeMe..","..eMeMe..","..eMeMe..","..eMeMe..","...eMe...","...eMe...","...eMe...","...eMe...","....e....","....e....","....e...."];
export const AILE_BROUILLEUR=["....U....",".U.UuU.U.","UuUuUuUuU","UuUUUUUuU","UuUuUuUuU",".U.UuU.U.","..UuUuU..","..UuUuU..","..UuUuU..","..UuUuU..","..UuUuU..","..UuUuU..","..UuUuU..","...UuU...","...UuU...","...UuU...","...UuU...","....U....","....U....","....u...."];
export const BOSS_CANON=["..XxXxXgXxXxX..",".XxXXxXGXxXXxX.","XXggqQqGqQqggXX","XxgqQQqGqQQqgxX","XXGgGgXGXgGgGXX","XxgGgGXGXGgGgxX",".XXkXXXGXXXkXX.",".yykXXXGXXXkyy.",".yy.XXXGXXX.yy."];
export const BOSS_SNIPER=[".....uUu.....",".....uUu.....","...uuUUUuu...","..uUUUuUUUu..",".uUUqQuQqUUu.","uUUUqQuQqUUUu","uUUUUUuUUUUUu",".uUUUUuUUUUu.","..u...u...u.."];
export const BOSS_RAYON=["...cccCccc...","..ccCCCCCcc..",".ccCCiIiCCcc.","ccCCqQiQqCCcc","ccCiqQIQqiCcc","ccCCqQiQqCCcc",".ccCCiIiCCcc.","..cc.CCC.cc..","...c..C..c..."];
export const BOSS_NUEE=[".JjJjJJJjJjJ.","JjJjJJJJJjJjJ","JkJkkJJJkkJkJ","JkjkkjJjkkjkJ","JjJvJJJJJvJjJ","JJJqJJJJJqJJJ",".JjJjJJJjJjJ.","..JjJJJJJjJ..","...JjJJJjJ..."];
export const BOSS_BLINDE=["ZzZzZzZzZzZzZ","ZkzZkzZzkZzkZ","ZzZzZzZzZzZzZ","ZzzzZqZqZzzzZ","ZzzzqQzQqzzzZ","ZzZzZzZzZzZzZ","ZkzZkzZzkZzkZ","ZzZzZzZzZzZzZ",".ZzZzZZZzZzZ."];
/* ---- NOUVEAUX BOSS ---- */
export const BOSS_FEU=["..EeEeEoEeEeE..",".EeEEeEMEeEEeE.","EEMMQqmMmqQMMEE","EeMqQQmMmQQqMeE","EEMoMoEMEoMoMEE","EeoMoMEMEMoMoeE",".EEkEEEMEEEkEE.",".ookEEEMEEEkoo.",".oo.EEEMEEE.oo."];
export const BOSS_ELECTRIQUE=[".....ACA.....",".....ACA.....","...AAcCcAA...","..ACCcCcCCA..",".ACCcWWWcCCA.","ACCCcWWWcCCCA","ACCCCcCcCCCCA",".ACC..C..CCA.","..A...A...A.."];
export const BOSS_NID=[".nNnNnNnNnNn.","nNnNnNNNnNnNn","nmNmmNNNmmNmn","nmnmmnNnmmnmn","nNnVnNNNnVnNn","nnNVnNNNnVNnn",".nNnNnNnNnNn.","..nNnNNNnNn..","...nNnNnNn..."];
export const BOSS_MIROIR=["...iiiIiii...","..iiIIIIIii..",".iiIIiIiIIii.","iiIIWLWLWIIii","iiIiWLWLWiIii","iiIIWLWLWIIii",".iiIIiIiIIii.","..ii.III.ii..","...i..I..i..."];
export const BOSS_FORGE=["ZzZzZzZzZzZzZ","ZkzZkzZzkZzkZ","ZzZzZzZzZzZzZ","ZzzzZoZoZzzzZ","ZzzzoMzMozzzZ","ZzZzZzZzZzZzZ","ZkzZkzZzkZzkZ","ZzZzZzZzZzZzZ",".ZzZzZZZzZzZ."];
export const BOSS_ECLIPSE=[".....kuk.....",".....kuk.....","...kkuuukk...","..kuuuUuuuk..",".kuuUUUUUuuk.","kuuuUUUUUuuuk","kuuuuuUuuuuuk",".kuu..u..uuk.","..k...k...k.."];
export const BOSS_GRIDS={canon:BOSS_CANON,sniper:BOSS_SNIPER,rayon:BOSS_RAYON,nuee:BOSS_NUEE,blinde:BOSS_BLINDE,
 feu:BOSS_FEU,electrique:BOSS_ELECTRIQUE,nid:BOSS_NID,miroir:BOSS_MIROIR,forge:BOSS_FORGE,eclipse:BOSS_ECLIPSE};

export function cuire(grille,echelle,override){ const w=grille[0].length,h=grille.length,off=document.createElement('canvas'); off.width=w*echelle; off.height=h*echelle;
  const c=off.getContext('2d'); for(let y=0;y<h;y++) for(let x=0;x<w;x++){ const ch=grille[y][x]; const col=(override&&override[ch])||PAL[ch]; if(!col) continue; c.fillStyle=col; c.fillRect(x*echelle,y*echelle,echelle,echelle); } return off; }

/* recuit un sprite pour qu'il tienne DANS la case (selon la taille de case courante) ; `override` = palette cosmétique optionnelle (voir SKINS_*) */
export function cuireFit(g,CELL,override){ const md=Math.max(g[0].length,g.length); return cuire(g,Math.max(1,Math.floor(CELL*0.92/md)),override); }

/* bonus & icônes */
export const BONUS_PV=[".R.R.","RRRRR","RRRRR",".RRR.","..R.."];
export const BONUS_VAIS=["y.M.y","y.M.y","yMMMy","y.M.y","y...y"];
export const BONUS_TIR=["..o..",".ooo.","oo.oo",".ooo.","..o.."];
export const ICO_VAISSEAU=["..F..",".FFF.","FC.CF",".FFF.","..F.."];
export const ICO_TOURELLE=["..y..",".y.y.","y.R.y",".y.y.","..y.."];
export const ICO_BOUCLIER=["..A..",".AAA.","AAAAA","AAAAA",".AAA.","..A.."];
export const imgBonusPV=cuire(BONUS_PV,4), imgBonusTIR=cuire(BONUS_TIR,4), imgBonusVAIS=cuire(BONUS_VAIS,4);
export const imgIcoVaisseau=cuire(ICO_VAISSEAU,3), imgIcoTourelle=cuire(ICO_TOURELLE,3), imgIcoBouclier=cuire(ICO_BOUCLIER,3);

/* =====================================================================
   LIBRAIRIE D'ICÔNES PIXEL ART — remplace les emoji d'interface
   (améliorations, vaisseaux, carte, difficulté, boutons, superpositions)
   ===================================================================== */
export const ICONS={
  vaisseau:   ["..F..",".FFF.","FC.CF",".FFF.","..F.."],
  bouclier:   ["..A..",".AAA.","AAAAA","AAAAA",".AAA.","..A.."],
  cible:      [".RRRRR.","RR...RR","R.RRR.R","R.R.R.R","R.RRR.R","RR...RR",".RRRRR."],
  coeur:      [".RR.RR.","RRRRRRR","RRRRRRR",".RRRRR.","..RRR..","...R...","......."],
  explosion:  ["..e.e..",".eEQEe.","eEQQQEe","EQQQQQE","eEQQQEe",".eEQEe.","..e.e.."],
  eclair:     ["...ee..","..ee...",".eee...","eeeee..","...eee.","...ee..","..ee..."],
  aimant:     ["SS...SS","SS...SS","SS...SS","SSSSSSS","RR...RR","RR...RR","RR...RR"],
  cle:        ["..SS...",".S..S..",".S..S..","..SS...","...SS..","....SS.",".....SS"],
  feu:        ["...e...","..eEe..",".eEQEe.",".EQQQE.",".eEQEe.","..eEe..","...e..."],
  vent:       ["CC.....",".CC....","..CC...","CCC....",".CC....","..CC...","......."],
  epee:       ["S.....S",".S...S.","..S.S..","...X...","..S.S..",".S...S.","S.....S"],
  crane:      [".WWWWW.","WWWWWWW","WWBWBWW","WWWWWWW","W.WWW.W","WW.W.WW",".WWWWW."],
  point:      [".eee...","e...e..","....e..","...e...","..e....",".......","..e...."],
  gemme:      ["...I...","..IiI..",".IiiiI.","IiiiiiI",".IiiiI.","..IiI..","...I..."],
  satellite:  ["..SSS..",".S...S.","S..C..S","S..C..S",".S...S.","..SSS..","......."],
  engrenage:  [".S.S.S.","SSSSSSS","S.SSS.S","SSSSSSS","S.SSS.S","SSSSSSS",".S.S.S."],
  demon:      ["X.....X",".X...X.","..WWW..",".WBWBW.","..WWW..",".W...W.","X.....X"],
  sourire_facile:   [".eeeee.","eeeeeee","eeBeBee","eeeeeee","eeeeeee","eBeeeBe","eeeBeee"],
  sourire_normal:   [".eeeee.","eeeeeee","eeBeBee","eeeeeee","eeeeeee","eeeeeee","eeBBBee"],
  sourire_difficile:[".eeeee.","eeeeeee","eeBeBee","eeeeeee","eeeeeee","eeeBeee","eBeeeBe"],
  son_on:     ["..S....",".SS....","SSS.C..","SSS..C.","SSS.C..",".SS....","..S...."],
  son_off:    ["..S....",".SS....","SSS..X.","SSS.X.X","SSS..X.",".SS....","..S...."],
  pause:      [".......",".SS.SS.",".SS.SS.",".SS.SS.",".SS.SS.",".SS.SS.","......."],
  play:       [".......","e......","ee.....","eee....","ee.....","e......","......."],
  restart:    [".SSS...","S...S..","S....S.","S....S.","S...S..",".SSS...","...SS.."],
  maison:     ["...W...","..WWW..",".WWWWW.","WWWWWWW","W.SSS.W","W.S.S.W","WWWWWWW"],
  globe:      [".AAAAA.","A.....A","A.AAA.A","AAAAAAA","A.AAA.A","A.....A",".AAAAA."],
  chapeau:    ["...W...","..WWW..",".WWWWW.","WWWWWWW","..WWW..","..W.W..","..W.W.."],
  info:       [".SSSSS.","S.....S","S..W..S","S.....S","S..W..S","S..W..S",".SSSSS."],
  carte:      ["..W.W..",".WWWWW.","W.WWW.W","WW.W.WW","W.WWW.W",".WWWWW.","..W.W.."],
  alerte:     ["...e...","..eee..",".eeeee.",".eeBee.",".eeBee.",".eeeee.","eeeeeee"],
  gel:        ["...C...",".C.C.C.","..CCC..","CCCCCCC","..CCC..",".C.C.C.","...C..."],
  panier:     [".......","W.....W","WWWWWWW",".WWWWW.","..WWW..","...W...","......."],
  refuser:    ["R.....R",".R...R.","..R.R..","...R...","..R.R..",".R...R.","R.....R"],
  loupe:      [".SSS...","S...S..","S...S..",".SSS...","...SS..","....SS.",".....SS"],
  de:         [".WWWWW.","W.....W","W.R.R.W","W.....W","W.R.R.W","W.....W",".WWWWW."],
  main:       ["..W.W..",".WWWWW.","WWWWWWW","WWWWWWW",".WWWWW.","..WWW..","...W..."],
  fleche_haut:["...W...","..WWW..",".WWWWW.","...W...","...W...","...W...","......."],
  trophee:    [".eeeee.","eeeeeee","eeeeeee",".eeeee.","..eee..","..eee..",".eeeee."],
};
/* fournit un <canvas> pixel-art prêt à insérer dans le DOM (taille ~px, mise à l'échelle entière la plus proche) */
export function iconCanvas(key,px=20){
  const g=ICONS[key]; if(!g) return document.createElement('canvas');
  const echelle=Math.max(1,Math.round(px/g[0].length));
  return cuire(g,echelle);
}
/* fournit l'image déjà cuite (pour dessiner sur le canvas de jeu via drawImage) */
export function iconImage(key,echelle=3){ return cuire(ICONS[key],echelle); }

/* explosions : anneaux qui grandissent */
export const NFRAMES=6, EG=15, EPS=4;
export const framesBoom=(function(){ const fr=[]; for(let f=0;f<NFRAMES;f++){ const off=document.createElement('canvas'); off.width=EG*EPS; off.height=EG*EPS; const c=off.getContext('2d');
  const cx=(EG-1)/2, cy=(EG-1)/2, outer=1.2+f*1.75, inner=outer-2.4;
  for(let y=0;y<EG;y++) for(let x=0;x<EG;x++){ const d=Math.hypot(x-cx,y-cy); let col=null;
    if(f<2&&d<=inner+.6) col='#fff2b0'; else if(d<=outer&&d>=inner) col=d<inner+1?'#ffe14d':(d<inner+2?'#ff8a3d':'#ff5a3d');
    if(col){ c.globalAlpha=Math.max(.15,1-f*.13); c.fillStyle=col; c.fillRect(x*EPS,y*EPS,EPS,EPS); } } fr.push(off); } return fr; })();
