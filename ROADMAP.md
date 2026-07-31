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

**Prochaine étape** : détailler la mécanique de terrain propre à chacun des
4 biomes de la V1 (pas seulement un habillage visuel), puis commencer
l'implémentation.
