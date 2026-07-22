/* =====================================================================
   CONFIG — constantes de jeu (grille, dégâts, catalogues d'objets)
   ===================================================================== */
export const COLS_N=7,  RANGS_N=9,  CELL_N=66, DEP_N=1;
export const COLS_G=21, RANGS_G=18, CELL_G=46, DEP_G=2;

export const DEG_LASER=8, DEG_EPERON=16, DEG_ASTEROIDE=20;
export const TOURS_VAGUE=8;

export const ULTIME_MAX=18;

/* ===== PROFONDEUR : améliorations, vaisseaux ===== */
export const UPGRADES=[
 {id:'portee',       emo:'🎯', nom:'Tir élargi',       desc:'+1 colonne de portée', max:1},
 {id:'deplacement',  emo:'🚀', nom:'Propulseurs',      desc:'+1 case de déplacement', max:1},
 {id:'bouclier',     emo:'🛡', nom:'Bouclier renforcé',desc:'Recharge +25%', max:2},
 {id:'tourelleDouble',emo:'⚡', nom:'Double tourelle',  desc:'+1 tir de tourelle / tour', max:2},
 {id:'bonusPlus',    emo:'🧲', nom:'Aimant à bonus',    desc:'Bonus plus fréquents', max:2},
 {id:'regen',        emo:'🔧', nom:'Auto-réparation',   desc:'+2% PV / tour', max:3},
];
export const SHIPS=[
 {id:'normal',    emo:'🚀', nom:'Standard',    desc:'Prêt en 1 tour'},
 {id:'rapide',    emo:'💨', nom:'Intercepteur',desc:'+1 déplacement · 2 tours'},
 {id:'bombardier',emo:'💥', nom:'Bombardier',  desc:'Détruit la colonne · 2 tours'},
 {id:'bouclier',  emo:'🛡', nom:'Cuirassé',    desc:'3 PV · 2 tours'},
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

/* ===== CAPACITÉS ACTIVES DES VAISSEAUX (une fois par combat) =====
   Déclenchées par un second appui sur le vaisseau déjà sélectionné. */
export const CAPACITES = {
  rapide:     { nom:'Bond',        desc:'Bond de 2 cases en plus, sans perdre le tir' },
  bouclier:   { nom:'Provocation', desc:'Les ailes adjacentes le ciblent au tour suivant' },
  bombardier: { nom:'Tir chargé',  desc:'Vise une cible : détruit 2 colonnes au lieu d\'une' },
};
