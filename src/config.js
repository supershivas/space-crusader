/* =====================================================================
   CONFIG — constantes de jeu (grille, dégâts, catalogues d'objets)
   ===================================================================== */
export const COLS_N=8,  RANGS_N=10, CELL_N=66, DEP_N=1;
export const COLS_G=21, RANGS_G=18, CELL_G=46, DEP_G=2;

export const DEG_LASER=8, DEG_EPERON=16, DEG_ASTEROIDE=20;
export const TOURS_VAGUE=8;

export const ULTIME_MAX=18;
export const ULTIME_INCREMENT=6;  // le seuil de l'ultime augmente de ce montant à chaque utilisation
export const BOUCLIER_USAGES_MAX=2;  // nombre d'utilisations de l'action BOUCLIER autorisées par combat

/* ===== PROFONDEUR : améliorations, vaisseaux ===== */
export const UPGRADES=[
 {id:'portee',       ico:'cible',     nom:'Tir élargi',       desc:'+1 colonne de portée', max:1},
 {id:'deplacement',  ico:'vent',      nom:'Propulseurs',      desc:'+1 case de déplacement', max:1},
 {id:'bouclier',     ico:'bouclier',  nom:'Bouclier renforcé',desc:'Recharge +25%', max:2},
 {id:'tourelleDouble',ico:'eclair',   nom:'Double tourelle',  desc:'+1 tir de tourelle / tour', max:2},
 {id:'bonusPlus',    ico:'aimant',    nom:'Aimant à bonus',    desc:'Bonus plus fréquents', max:2},
 {id:'regen',        ico:'cle',       nom:'Auto-réparation',   desc:'+2% PV / tour', max:3},
 // améliorations spécifiques au Vaisseau Rouge (proposées seulement s'il est en jeu)
 {id:'rouge_pv',     ico:'coeur',     nom:'Blindage rouge',    desc:'Vaisseau Rouge : +1 PV', max:2},
 {id:'rouge_range',  ico:'explosion', nom:'Onde de choc',      desc:'Vaisseau Rouge : zone de tir ±2', max:1},
 {id:'rouge_back',   ico:'feu',       nom:'Rétro-tir',         desc:'Vaisseau Rouge : tire aussi vers l\'arrière', max:1},
];
export const SHIPS=[
 {id:'normal',    ico:'vaisseau',  nom:'Standard',    desc:'Prêt en 1 tour'},
 {id:'rapide',    ico:'vent',      nom:'Intercepteur',desc:'+1 déplacement · 2 tours'},
 {id:'bombardier',ico:'explosion', nom:'Bombardier',  desc:'Détruit la colonne · 2 tours'},
 {id:'bouclier',  ico:'bouclier',  nom:'Cuirassé',    desc:'3 PV · 2 tours'},
 {id:'sniper',    ico:'cible',     nom:'Tireur',      desc:'Tir à ±2 colonnes · 2 tours'},
 {id:'transporteur',ico:'satellite',nom:'Transporteur',desc:'Largue des mini-navettes · 2 tours'},
 {id:'medic',      ico:'coeur',     nom:'Médic',       desc:'Soigne un allié adjacent · 2 tours', metaRequis:'vaisseauMedic'},
];
export const SHIP_ROUGE={id:'rouge', nom:'Vaisseau Rouge', desc:'Tir de zone · 2 PV · prend 2 tours'};

/* ===== HÉROS DU VAISSEAU ROUGE (roadmap "Héros du Vaisseau Rouge") =====
   Chaque héros équipe le Vaisseau Rouge pour la durée d'une run (bonus passif
   fixe, pas de montée en puissance en cours de partie — voir ROADMAP.md).
   Le déblocage permanent réutilise le mécanisme générique decouvrir()/
   estDecouvert() de state.js avec la catégorie 'heros' (pas de nouveau
   store). `bonus.id` sera lu par entities.js/combat.js une fois le lot
   "Intégration combat" de la roadmap réalisé — pour l'instant c'est une
   donnée descriptive, pas encore appliquée en jeu.
   `rarete` est un score théorique (grille à 4 axes détaillée dans
   ROADMAP.md) servant de point de départ — à réajuster à la main après
   tests, comme n'importe quelle autre donnée d'équilibrage. */
export const ANDROIDE={
  id:'androide', nom:'Androïde standard',
  desc:'Remplace un héros perdu au combat : aucun visage distinctif, aucun bonus passif.',
  bonus:null,
};
/* `ico` référence une clé de ICONS (sprites.js) — icône de remplacement le temps qu'un vrai
   portrait pixel-art (pixel-editor.html) soit dessiné pour chaque héros. */
export const HEROS=[
 // score 2/0/3/0=5 → rare
 {id:'darkor', nom:'Darkor', desc:'Casqué tout noir, reflets brillants.', rarete:'rare', ico:'crane',
  bonus:{id:'degats_tir', valeur:1, desc:'+1 dégât de tir, en permanence'}},
 // score 3/0/2/0=5 → rare
 {id:'odysseus', nom:'Odysseus', desc:'Barbu, yeux clairs, peau claire.', rarete:'rare', ico:'carte',
  bonus:{id:'evasion_mortelle', desc:"Évite automatiquement une attaque qui l'aurait détruit, une fois par combat"}},
 // score 2/0/2/-1=3 → peu_commun
 {id:'acheen', nom:"L'Achéen", desc:"Cheveux blonds bouclés, peau claire, boucle d'oreille dorée.", rarete:'peu_commun', ico:'epee',
  bonus:{id:'bouclier_premier_tir', desc:'Immunisé au premier tir subi à chaque combat, mais +1 dégât reçu sur tous les tirs suivants ce combat-là'}},
 // score 3/0/3/-1=5 → rare
 {id:'polypheme', nom:'Polyphème', desc:'Cyclope, force brute.', rarete:'rare', ico:'explosion',
  bonus:{id:'degats_pourcent', valeur:0.5, malusPvMax:1, desc:'+50% dégâts de tir, -1 PV max'}},
 // score 1/0/3/0=4 → peu_commun
 {id:'slum', nom:'Slum', desc:'Peau verte gluante, deux yeux globuleux.', rarete:'peu_commun', ico:'aimant',
  bonus:{id:'regen_tour', valeur:0.02, desc:'+2% PV régénérés par tour, en permanence'}},
 // score 1/2/3/0=6 → rare
 {id:'bar4bar4', nom:'Bar4-bar4', desc:'Femme brune, peau mate.', rarete:'rare', ico:'gemme',
  bonus:{id:'aura_precision_ennemie', desc:'Les ailes ennemies adjacentes à elle ont une précision réduite'}},
 // score 2/0/3/0=5 → rare
 {id:'demonokos', nom:'Demonokos', desc:'Aigle aveugle.', rarete:'rare', ico:'vent',
  bonus:{id:'portee_brouillage', valeur:1, desc:'+1 portée de tir, immunisé aux effets de brouillage (brouilleur/void)'}},
];
export function heroParId(id){ return HEROS.find(h=>h.id===id)||null; }

/* ===== ARBRE MÉTA PAR HÉROS (roadmap "Héros du Vaisseau Rouge", lot 6) =====
   Persisté dans state.metaHeros[heroId] = niveau atteint (0..META_HEROS_MAX), coûte des
   cristaux comme le reste de META. Barème générique volontairement simple plutôt que 7
   formules ad hoc : un seul incrément par palier, propre à l'id du bonus passif (voir HEROS) —
   à ajuster après tests, comme la rareté théorique. */
export const META_HEROS_MAX=3;
export function coutMetaHero(niveau){ return 4+niveau*3; }
export function appliquerMetaHero(bonus,niveau){
  if(!bonus||!niveau) return bonus;
  const b={...bonus};
  if(b.id==='degats_tir') b.valeur=(b.valeur||0)+niveau;                        // Darkor : +1 dégât / niveau
  else if(b.id==='degats_pourcent') b.valeur=(b.valeur||0)+0.15*niveau;         // Polyphème : +15% dégâts / niveau
  else if(b.id==='regen_tour') b.valeur=(b.valeur||0)+0.01*niveau;              // Slum : +1% régén / niveau
  else if(b.id==='portee_brouillage') b.valeur=(b.valeur||0)+(niveau>=2?1:0);   // Demonokos : +1 portée au niveau 2
  else if(b.id==='aura_precision_ennemie') b.chanceRatee=0.3+0.1*niveau;        // Bar4-bar4 : +10% de tir raté / niveau
  else if(b.id==='evasion_mortelle') b.usages=1+niveau;                         // Odysseus : +1 évasion/combat / niveau
  else if(b.id==='bouclier_premier_tir') b.usages=1+niveau;                     // L'Achéen : +1 tir absorbé/combat / niveau
  return b;
}

/* palettes cosmétiques (débloquées via la méta 'cosmetiques') : recolorent l'accent du croiseur / des vaisseaux alliés */
export const SKINS_CROISEUR=[
 {id:'defaut',   nom:'Défaut',   over:{}},
 {id:'ecarlate', nom:'Écarlate', over:{C:'#ff5a5a'}},
 {id:'emeraude', nom:'Émeraude', over:{C:'#5fce6a'}},
 {id:'or',       nom:'Or',       over:{C:'#ffd23d'}},
];
export const SKINS_VAISSEAUX=[
 {id:'defaut',   nom:'Défaut',   over:{}},
 {id:'ecarlate', nom:'Écarlate', over:{O:'#ff5a5a',S:'#c98a8a',s:'#e6c3c3'}},
 {id:'emeraude', nom:'Émeraude', over:{O:'#5fce6a',S:'#8ac99a',s:'#c3e6cf'}},
 {id:'or',       nom:'Or',       over:{O:'#ffd23d',S:'#c9b98a',s:'#e6dcc3'}},
];

/* ===== MÉTA-PROGRESSION (déblocages permanents) ===== */
export const META=[
 {id:'pvBonus',      nom:'Blindage',      desc:'+10 PV de départ',              max:5, cout:l=>3+l*2},
 {id:'deptAmelio',   nom:'Prototype',     desc:'+1 amélioration au départ',     max:3, cout:l=>6+l*4},
 {id:'ultimeRapide', nom:'Réacteur dopé', desc:'Ultime déjà chargé au départ',  max:3, cout:l=>5+l*3},
 {id:'vaisseauBonus',nom:'Escadrille',    desc:'+1 vaisseau au départ',         max:3, cout:l=>5+l*3},
 // variété (n'augmentent pas la puissance en combat)
 {id:'reroll',       nom:'Reroll',        desc:'+1 reroll gratuit sur les propositions', max:2, cout:l=>4+l*3},
 {id:'vaisseauMedic',nom:'Ingénierie',    desc:'Débloque le Médic au hangar (soigne, ne combat pas)', max:1, cout:l=>8},
 {id:'cosmetiques',  nom:'Atelier peinture',desc:'Débloque des teintes pour le croiseur et les vaisseaux', max:1, cout:l=>6},
];

/* ===== DIFFICULTÉ (menu d'accueil) =====
   hpMult : multiplicateur des PV de départ du croiseur
   squadDelta : ajustement de la taille des escadrons (demarrerCombat)
   menaceDelta : ajustement de l'intervalle avant la prochaine menace (+ = plus rare)
   eliteVagueDelta : ajustement de la vague à partir de laquelle les élites peuvent apparaître (+ = plus tard)
   eliteProbMult : multiplicateur de la probabilité d'apparition d'une élite
   trousNoirs : autorise ou non les trous noirs parmi les menaces
   tourelleDmgMult : multiplicateur des dégâts infligés par les tourelles (missions planète)
   baseHpMult : multiplicateur des PV de la base ennemie (missions planète)
   garnisonDelta : ajustement de l'intervalle entre deux productions de garnison par la base
                   (missions planète, + = plus rare, même logique que menaceDelta) */
export const DIFFICULTES = {
  facile:    { label:'Facile',    hpMult:1.25, squadDelta:-1, menaceDelta:2,  eliteVagueDelta:2,  eliteProbMult:0.5, trousNoirs:false, tourelleDmgMult:0.8, baseHpMult:0.85, garnisonDelta:2  },
  normal:    { label:'Normal',    hpMult:1,    squadDelta:0,  menaceDelta:0,  eliteVagueDelta:0,  eliteProbMult:1,   trousNoirs:true,  tourelleDmgMult:1,   baseHpMult:1,    garnisonDelta:0  },
  difficile: { label:'Difficile', hpMult:0.8,  squadDelta:1,  menaceDelta:-1, eliteVagueDelta:-1, eliteProbMult:1.6, trousNoirs:true,  tourelleDmgMult:1.3, baseHpMult:1.15, garnisonDelta:-1 },
};

/* ===== OBSTACLES (Lot 1 + Lot missions planète) =====
   bloque : empêche déplacement ET tirs (débris, station, barrière, mines, ruine)
   destructible / hp : peut être détruit par un tir allié
   champ : traversable, applique un effet par tour (gaz, gravité, glace) */
export const OBSTACLES = {
  debris:   { nom:'Débris',           desc:'Bloque tirs et déplacements. Destructible (1 PV).', bloque:true,  destructible:true,  hp:1, col:'#8f857a' },
  station:  { nom:'Épave de station', desc:'Bloque. Largue un bonus si détruite (2 PV).',        bloque:true,  destructible:true,  hp:2, col:'#37e0ff' },
  barriere: { nom:'Barrière',         desc:'Indestructible. Bloque tout.',                       bloque:true,  destructible:false, hp:0, col:'#37e0ff' },
  mines:    { nom:'Champ de mines',   desc:'Explose en zone (dégâts 2) si détruit.',             bloque:true,  destructible:true,  hp:1, col:'#e5484d' },
  gaz:      { nom:'Gaz toxique',      desc:'Traversable. 1 dégât/tour aux unités dedans.',       bloque:false, destructible:false, hp:0, champ:'gaz',     col:'#8cff5a' },
  gravite:  { nom:'Champ de gravité', desc:'Traversable. Ralentit les ennemis (vitesse 1).',     bloque:false, destructible:false, hp:0, champ:'gravite', col:'#4aa3ff' },
  glace:    { nom:'Plaque de glace',  desc:'Traversable. Fait glisser d\'une case de plus dans le sens du déplacement (mission planète, biome Glace).', bloque:false, destructible:false, hp:0, champ:'glace', col:'#bfe9ff' },
  ruine:    { nom:'Ruine',            desc:'Bloque tirs et déplacements. Destructible (1 PV). Peut dissimuler une tourelle (mission planète, biome Villes anciennes).', bloque:true, destructible:true, hp:1, col:'#c9a97a' },
};

/* ===== MISSIONS PLANÈTE =====
   Une mission planète (nœud de carte 'planete') est un combat inversé : pas de croiseur à
   l'écran, l'escadrille doit avancer jusqu'à une base ennemie fixe (rangées du haut) et la
   détruire, en franchissant des tourelles fixes et la garnison produite périodiquement par
   la base. Catalogues de données uniquement ici — la boucle de jeu dédiée (planete.js) et
   l'intégration à la carte (map.js) viennent dans les étapes suivantes de la roadmap. */
// biomes de la V1 : chacun porte une mécanique de terrain signature (voir ROADMAP.md)
export const BIOMES = [
  {id:'desert',          mecanique:'tempete'},
  {id:'glace',            mecanique:'glissade'},
  {id:'grotte',           mecanique:'obscurite'},
  {id:'villes_anciennes', mecanique:'embuscade'},
];
// tourelles fixes défendant l'approche de la base, sur le modèle des archétypes de boss
export const TOURELLES = [
  {id:'canon',  ico:'cible',   hp:2, portee:1, degats:8},
  {id:'sniper', ico:'cible',   hp:1, portee:2, degats:6},
  {id:'lourde', ico:'bouclier',hp:3, portee:1, degats:12},
];
// PV de la base ennemie : croît avec le secteur (comme la difficulté globale du jeu),
// ajusté par le multiplicateur de difficulté (baseHpMult)
export function basePvMax(secteur,difficulte){
  const d=DIFFICULTES[difficulte]||DIFFICULTES.normal;
  return Math.round((30+secteur*12)*d.baseHpMult);
}

/* ===== JAUGE D'ALERTE (mission planète, refonte) =====
   Monte tant que l'escadrille ne progresse pas vers la base — jamais un chrono dur : elle
   redescend à 0 dès qu'un vaisseau bat son propre record de rapprochement (voir planete.js,
   mettreAJourAlerte). ALERTE_PALIER1 : la garnison est produite plus vite. ALERTE_PALIER2 :
   les dernières rangées deviennent hostiles (dégâts de zone, jamais létaux d'un coup),
   toujours télégraphié 1 tour avant. */
export const ALERTE_PALIER1=3, ALERTE_PALIER2=6, ALERTE_ZONE_RANGS=2;

/* ===== CAPACITÉS ACTIVES DES VAISSEAUX (une fois par combat) =====
   Déclenchées par un second appui sur le vaisseau déjà sélectionné. */
export const CAPACITES = {
  rapide:     { nom:'Bond',        desc:'Bond de 2 cases en plus, sans perdre le tir' },
  bouclier:   { nom:'Provocation', desc:'Les ailes adjacentes le ciblent au tour suivant' },
  bombardier: { nom:'Tir chargé',  desc:'Vise une cible : détruit 2 colonnes au lieu d\'une' },
  transporteur:{ nom:'Largage',    desc:'Lance une mini-navette sur une case libre adjacente (diagonales incluses)' },
  medic:      { nom:'Réparation', desc:'Soigne 1 PV à un allié adjacent (diagonales incluses)' },
};

/* ===== RARETÉ (éléments non jouables : ennemis, boss, bonus, menaces) =====
   Sert à la fois à l'affichage dans l'encyclopédie et pilote réellement les tirages
   aléatoires "à choix plat" du jeu (butin largué, obstacle généré, type de boss dans
   son palier, aile de base) — voir tirageParRarete() et ses appels dans entities.js.
   Les ennemis à déblocage progressif (porteur, titan, etc.) gardent leurs probabilités
   par vague déjà finement réglées ; leur niveau ici ne fait que refléter leur fréquence
   réelle pour l'encyclopédie, il ne pilote pas de tirage supplémentaire. */
export const RARETES = ['commun','peu_commun','rare','epique'];
export const RARETE_POIDS = { commun:10, peu_commun:5, rare:2, epique:1 };
export const RARETE = {
  aile: {
    normal:'commun', chasseur:'commun', mini_navette:'commun',
    bombardier:'peu_commun', eclaireur:'peu_commun', lourd:'peu_commun', regenerateur:'peu_commun',
    mini_sniper:'peu_commun', diagonal_d:'peu_commun', diagonal_g:'peu_commun', saboteur:'peu_commun', bruleur:'peu_commun',
    stronghold:'rare', transporteur:'rare', porteur:'rare', brouilleur:'rare', void:'rare',
    titan:'epique',
  },
  boss: {
    canon:'commun', sniper:'commun',
    rayon:'peu_commun', nuee:'peu_commun', blinde:'peu_commun',
    feu:'rare', electrique:'rare', nid:'rare',
    miroir:'epique', forge:'epique', eclipse:'epique',
  },
  bonus: { pv:'commun', tir:'commun', vaisseau:'peu_commun', mimic:'rare' },
  menace: {
    debris:'commun', aster_essaim:'commun', aster_normal:'commun',
    station:'peu_commun', mines:'peu_commun', barriere:'peu_commun', aster_gros:'peu_commun', aster_diagonal:'peu_commun',
    gaz:'rare', gravite:'rare', trounoir:'rare', champ:'rare',
  },
};
/* tire un type au hasard parmi `types`, pondéré par son niveau de rareté dans `dict` */
export function tirageParRarete(dict,types){
  const pool=types.map(t=>({t,p:RARETE_POIDS[dict[t]]||1}));
  let total=0; for(const x of pool) total+=x.p;
  let r=Math.random()*total;
  for(const x of pool){ r-=x.p; if(r<=0) return x.t; }
  return pool[pool.length-1].t;
}
