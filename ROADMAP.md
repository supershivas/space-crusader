# Roadmap — Croiseur

Suivi des grosses évolutions de gameplay envisagées ou en cours. Chaque entrée
reste ici jusqu'à son implémentation complète (puis peut être déplacée dans
une section "Fait" ou simplement supprimée une fois fusionnée sur `main`).

## À l'étude

### Missions sur planète — "tower attack" (jeu inversé)

**Statut** : conception intégralement verrouillée avec l'utilisateur le
2026-07-31 (toutes les décisions ci-dessous tranchées), implémentation non
démarrée.

**Pitch** : sur certains nœuds de la carte de secteur, au lieu d'un combat spatial
classique (défendre le croiseur contre des vagues d'ailes), le joueur atterrit
sur une planète et doit **détruire une base ennemie** située en haut
du champ de bataille. Le croiseur n'apparaît pas à l'écran : le joueur ne
défend plus, il **attaque**. Des tourelles ennemies fixes défendent le
terrain, et la base produit régulièrement des vaisseaux ennemis pour freiner
la progression de l'escadrille.

**Grandes lignes d'implémentation envisagées** (à affiner avant de coder) :
- Nouveau type de nœud sur la carte de secteur (`planete`), au même niveau que
  `combat`/`elite`/`boss`, avec son propre pool de biomes et ses propres
  icône/couleur/i18n.
- Nouvelle boucle de résolution de tour dédiée (distincte de `finDuTour` dans
  `combat.js`, qui est entièrement pensée autour de la défense du croiseur) :
  avance des vaisseaux du joueur vers la base, tirs des tourelles fixes,
  production périodique de vaisseaux ennemis par la base.
- Nouvelles entités : base ennemie (PV, position fixe en haut de grille,
  cadence de production), tourelles (PV, portée, dégâts — variantes par
  biome ou par palier de difficulté, sur le modèle des archétypes de boss
  existants).
- Condition de victoire : PV de la base à 0. Condition d'échec (tranchée) :
  flotte entièrement détruite → mission ratée, retour à la carte sans perte
  de progression du secteur (pas de limite de tours, cohérent avec le reste
  du jeu qui ne punit jamais par un chrono).
- Progression (tranchée) : siège multi-tours — l'escadrille démarre en bas
  de la grille et avance tour après tour (même système de déplacement que
  le combat spatial actuel) jusqu'à portée des tourelles puis de la base.
  Pas d'engagement immédiat.
- Tourelles (tranché) : destructibles, comme les obstacles actuels (PV,
  détruites par un tir allié) — choix tactique entre dégager le passage et
  foncer sur la base.
- Placement sur la carte (tranché) : ajoutée au tirage des nœuds
  intermédiaires comme `elite`, mais plafonnée à 1 occurrence par secteur
  et jamais en position de tout premier nœud (tutoriel).
- Actions du croiseur `tourelle`/`bouclier` (à repenser plus tard) :
  masquées pour la première version faute de sens sans croiseur à l'écran ;
  on y reviendra si le mode manque de profondeur d'action une fois testé.
  L'ultime (frappe orbitale) reste disponible et garde son thème.
- Décors par biome (fond, palette, obstacles thématiques) en cohérence avec
  le design system existant (`design-system.html`, `theme.css`) : nouvelle
  section à y ajouter une fois le premier biome posé.
- Bilingue FR/EN dès la première ligne de texte (noms de biomes, tourelles,
  base, textes de mission) via `src/i18n.js`.
- Biomes (tranché) : V1 limitée à 4 — désert, glace, grotte, villes anciennes
  — pour limiter le travail d'art/i18n avant de valider que le mode est
  amusant. Jungle et lacs restent en réserve pour une vague suivante.
  Chacun a une mécanique de terrain signature (pas qu'un habillage visuel),
  pensée pour s'accrocher aux systèmes existants plutôt qu'en inventer de
  nouveaux :
  - **Désert — tempête de sable** : toutes les quelques tours, une tempête
    balaie 1-2 colonnes (réutilise `state.champs`/`champEn()`, déjà géré en
    `jam:true` dans `analyseTir`) — ni le joueur ni les tourelles ne
    peuvent tirer à travers tant qu'elle dure.
  - **Glace — sol glissant** : certaines cases (nouveau type `OBSTACLES`
    traversable, `champ:'glace'`) font glisser d'une case de plus dans la
    même direction tout vaisseau qui s'y déplace — joueur comme ennemis
    produits par la base.
  - **Grotte — obscurité** : portée de tir réduite de 1 pendant toute la
    mission ; tourelles et base « endormies » (invisibles, ne tirent pas)
    tant qu'aucun vaisseau allié n'est à 2 cases ou moins, puis se
    réveillent au tour suivant.
  - **Villes anciennes — ruines + tourelles embusquées** : terrain dense en
    ruines destructibles (variante de l'obstacle `debris`/`station`
    existant) bloquant les lignes de tir directes ; 1-2 tourelles
    camouflées, invisibles/inactives jusqu'à approche à 1 case ou
    destruction de la ruine qui les cache.
- Récompense de fin de mission (tranché) : traitée comme un nœud `elite`
  (choix d'amélioration garanti après victoire), cohérent avec la durée/
  l'enjeu d'un siège multi-tours.
- Sauvegarde/reprise de partie (`sauvegarderPartie`/`chargerSauvegarde`) à
  étendre pour une mission planète en cours, sur le modèle de ce qui existe
  déjà pour un combat spatial en cours.
- Répercussions à vérifier systématiquement avant fusion : génération de
  carte (le nœud planète ne doit pas pouvoir tomber sur le tout premier nœud,
  pour ne pas interférer avec le tutoriel scripté de `tuto.js`), écran de
  récap de fin de mission (`ouvrirMission`), achievements, guide/encyclopédie
  (nouvelles entrées tourelle/base/biome), équilibrage par difficulté
  (`DIFFICULTES`).

**Plan d'implémentation** (chaque étape doit rester jouable/testable avant de
passer à la suivante — jamais tout d'un bloc) :

1. ✅ **Données de base** (`config.js`, `state.js`) : catalogue `BIOMES` (id V1 :
   `desert`/`glace`/`grotte`/`villes_anciennes`, avec sa mécanique associée),
   catalogue `TOURELLES` (types PV/portée/dégâts, sur le modèle des
   archétypes de boss), formule de PV de la base par secteur/difficulté,
   extension de `DIFFICULTES` (multiplicateurs dégâts tourelle / PV base /
   cadence de garnison), nouvelles entrées `OBSTACLES` (`glace` traversable,
   `ruine` = variante destructible de `debris`/`station`). Nouveaux champs
   `state.planete` (base, tourelles, biome courant, compteurs propres à
   chaque mécanique). Pas d'écran atteignable encore, juste les fondations.

2. ✅ **Intégration carte** (`map.js`) : nouveau type de nœud `planete` dans
   `NOEUD_TYPES`/`ICONE`/`COUL_NOEUD`/`NOM_NOEUD`/`DESC_NOEUD`, tirage au
   même titre que `elite` mais plafonné à 1/secteur et jamais au nœud de
   colonne 0. `entrerNoeud` aiguille vers une nouvelle fonction
   `demarrerMissionPlanete()` plutôt que `demarrerCombat`. i18n minimal (nom/
   description du nœud) pour que la carte reste cohérente visuellement, même
   sans contenu de mission réel derrière pour l'instant.

3. ✅ **Entités planète** (nouveau module, ex. `planete.js`, + ajouts dans
   `entities.js`) : création de la base (PV, position fixe rangées du haut),
   des tourelles fixes, et de la fonction de production de garnison par la
   base (réutilise la logique d'avance des ailes de `finDuTour`, sans la
   branche de percée finale qui suppose un croiseur — à remplacer par un
   arrêt en ligne de défense devant la base).

4. ✅ **Boucle de tour dédiée** : `demarrerTourJoueurPlanete()` (identique au
   combat spatial mais sans actions `tourelle`/`bouclier`) et
   `finDuTourPlanete()` (tirs des tourelles fixes + avance de la garnison +
   check victoire base à 0 PV / échec flotte à 0 vaisseau). Réutilise au
   maximum les primitives existantes de `combat.js` (`tirer`, `frapperAile`,
   `tuerAile`, `exploser`, `casesMouvement`) plutôt que de les dupliquer.
   Point de test : un combat "boîte grise" jouable de bout en bout, sans
   mécanique de biome ni habillage.

5. ✅ **Mécaniques de biome**, une à la fois, dans l'ordre du moins au plus
   coûteux en nouveau code : désert (réutilise `champs`/`champEn` presque
   tel quel) → grotte (malus de portée + flag "endormi" sur tourelles/base)
   → glace (nouveau `champ:'glace'` + glissade au déplacement) → villes
   anciennes (ruines denses + flag "camouflée" sur tourelles, détection par
   proximité/destruction). Chaque mécanique testée isolément avant la
   suivante.

6. ✅ **UI/HUD** (`ui.js`, `render.js`) : barre de PV de la base à la place de
   la barre de PV croiseur, masquage des actions `tourelle`/`bouclier`,
   récap de fin de mission réutilisant `ouvrirMission`/le circuit de
   récompense `elite` (choix d'amélioration).

7. **Sauvegarde/reprise** (`state.js` `sauvegarderPartie`/`chargerSauvegarde`,
   `main.js` `reprendrePartie`) : sérialiser une mission planète en cours
   (base, tourelles, biome, compteurs de mécanique) sur le modèle de ce qui
   existe pour un combat spatial en cours.

8. **Habillage** : sprites de base/tourelles/ruines, décor par biome
   (`render.js`, `sprites.js`), nouvelle section `design-system.html`,
   traduction FR/EN complète (`i18n.js`), entrées d'encyclopédie (base,
   tourelles par type, biomes), éventuels nouveaux achievements.

9. **Vérifications transverses avant fusion** : le tutoriel scripté
   (`tuto.js`) n'est jamais impacté par un nœud planète en première
   position ; le mode combat spatial existant n'est pas régressé (tests
   Playwright du flux existant) ; test Playwright dédié pour chacun des 4
   biomes (victoire, défaite flotte détruite, reprise de partie en cours de
   mission) ; incrément `VERSION` (`src/version.js`) et cache du service
   worker (`sw.js`) comme à chaque changement livré.

**Prochaine étape** : étape 7 (sauvegarde/reprise d'une mission planète en
cours — aujourd'hui, quitter en pleine mission renvoie à la carte au
rechargement, sans faire perdre la progression du secteur, mais sans non
plus reprendre le siège où il en était).
