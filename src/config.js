/* =====================================================================
   CONFIG — constantes de jeu (grille, dégâts, catalogues d'objets)
   ===================================================================== */
export const COLS_N=7,  RANGS_N=9,  CELL_N=66, DEP_N=1;
export const COLS_G=21, RANGS_G=18, CELL_G=46, DEP_G=2;

export const DEG_LASER=8, DEG_EPERON=16, DEG_ASTEROIDE=20;
export const TOURS_VAGUE=8;

export const ULTIME_MAX=18;
export const ULTIME_INCREMENT=6;  // le seuil de l'ultime augmente de ce montant à chaque utilisation
export const BOUCLIER_USAGES_MAX=2;  // nombre d'utilisations de l'action BOUCLIER autorisées par combat

/* ===== PROFONDEUR : améliorations, vaisseaux ===== */
export const UPGRADES=[
 {id:'portee',       emo:'🎯', nom:'Tir élargi',       desc:'+1 colonne de portée', max:1},
 {id:'deplacement',  emo:'🚀', nom:'Propulseurs',      desc:'+1 case de déplacement', max:1},
 {id:'bouclier',     emo:'🛡', nom:'Bouclier renforcé',desc:'Recharge +25%', max:2},
 {id:'tourelleDouble',emo:'⚡', nom:'Double tourelle',  desc:'+1 tir de tourelle / tour', max:2},
 {id:'bonusPlus',    emo:'🧲', nom:'Aimant à bonus',    desc:'Bonus plus fréquents', max:2},
 {id:'regen',        emo:'🔧', nom:'Auto-réparation',   desc:'+2% PV / tour', max:3},
 // améliorations spécifiques au Vaisseau Rouge (proposées seulement s'il est en jeu)
 {id:'rouge_pv',     emo:'❤',  nom:'Blindage rouge',    desc:'Vaisseau Rouge : +1 PV', max:2},
 {id:'rouge_range',  emo:'💥', nom:'Onde de choc',      desc:'Vaisseau Rouge : zone de tir ±2', max:1},
 {id:'rouge_back',   emo:'🔥', nom:'Rétro-tir',         desc:'Vaisseau Rouge : tire aussi vers l\'arrière', max:1},
];
export const SHIPS=[
 {id:'normal',    emo:'🚀', nom:'Standard',    desc:'Prêt en 1 tour'},
 {id:'rapide',    emo:'💨', nom:'Intercepteur',desc:'+1 déplacement · 2 tours'},
 {id:'bombardier',emo:'💥', nom:'Bombardier',  desc:'Détruit la colonne · 2 tours'},
 {id:'bouclier',  emo:'🛡', nom:'Cuirassé',    desc:'3 PV · 2 tours'},
 {id:'sniper',    emo:'🎯', nom:'Tireur',      desc:'Tir à ±2 colonnes · 2 tours'},
];
export const SHIP_ROUGE={id:'rouge', nom:'Vaisseau Rouge', desc:'Tir de zone · 2 PV · prend 2 tours'};

/* ===== MÉTA-PROGRESSION (déblocages permanents) ===== */
export const META=[
 {id:'pvBonus',      nom:'Blindage',      desc:'+10 PV de départ',              max:5, cout:l=>3+l*2},
 {id:'deptAmelio',   nom:'Prototype',     desc:'+1 amélioration au départ',     max:3, cout:l=>6+l*4},
 {id:'ultimeRapide', nom:'Réacteur dopé', desc:'Ultime déjà chargé au départ',  max:3, cout:l=>5+l*3},
 {id:'vaisseauBonus',nom:'Escadrille',    desc:'+1 vaisseau au départ',         max:3, cout:l=>5+l*3},
];

/* ===== DIFFICULTÉ (menu d'accueil) =====
   hpMult : multiplicateur des PV de départ du croiseur
   squadDelta : ajustement de la taille des escadrons (demarrerCombat)
   menaceDelta : ajustement de l'intervalle avant la prochaine menace (+ = plus rare)
   eliteVagueDelta : ajustement de la vague à partir de laquelle les élites peuvent apparaître (+ = plus tard)
   eliteProbMult : multiplicateur de la probabilité d'apparition d'une élite
   trousNoirs : autorise ou non les trous noirs parmi les menaces */
export const DIFFICULTES = {
  facile:    { label:'Facile',    hpMult:1.25, squadDelta:-1, menaceDelta:2,  eliteVagueDelta:2,  eliteProbMult:0.5, trousNoirs:false },
  normal:    { label:'Normal',    hpMult:1,    squadDelta:0,  menaceDelta:0,  eliteVagueDelta:0,  eliteProbMult:1,   trousNoirs:true  },
  difficile: { label:'Difficile', hpMult:0.8,  squadDelta:1,  menaceDelta:-1, eliteVagueDelta:-1, eliteProbMult:1.6, trousNoirs:true  },
};

/* ===== OBSTACLES (Lot 1) =====
   bloque : empêche déplacement ET tirs (débris, station, barrière, mines)
   destructible / hp : peut être détruit par un tir allié
   champ : traversable, applique un effet par tour (gaz, gravité) */
export const OBSTACLES = {
  debris:   { nom:'Débris',           desc:'Bloque tirs et déplacements. Destructible (1 PV).', bloque:true,  destructible:true,  hp:1, col:'#8f857a' },
  station:  { nom:'Épave de station', desc:'Bloque. Largue un bonus si détruite (2 PV).',        bloque:true,  destructible:true,  hp:2, col:'#37e0ff' },
  barriere: { nom:'Barrière',         desc:'Indestructible. Bloque tout.',                       bloque:true,  destructible:false, hp:0, col:'#37e0ff' },
  mines:    { nom:'Champ de mines',   desc:'Explose en zone (dégâts 2) si détruit.',             bloque:true,  destructible:true,  hp:1, col:'#e5484d' },
  gaz:      { nom:'Gaz toxique',      desc:'Traversable. 1 dégât/tour aux unités dedans.',       bloque:false, destructible:false, hp:0, champ:'gaz',     col:'#8cff5a' },
  gravite:  { nom:'Champ de gravité', desc:'Traversable. Ralentit les ennemis (vitesse 1).',     bloque:false, destructible:false, hp:0, champ:'gravite', col:'#4aa3ff' },
};

/* ===== CAPACITÉS ACTIVES DES VAISSEAUX (une fois par combat) =====
   Déclenchées par un second appui sur le vaisseau déjà sélectionné. */
export const CAPACITES = {
  rapide:     { nom:'Bond',        desc:'Bond de 2 cases en plus, sans perdre le tir' },
  bouclier:   { nom:'Provocation', desc:'Les ailes adjacentes le ciblent au tour suivant' },
  bombardier: { nom:'Tir chargé',  desc:'Vise une cible : détruit 2 colonnes au lieu d\'une' },
};
