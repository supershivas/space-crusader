# Roadmap — Croiseur

Suivi des grosses évolutions de gameplay envisagées ou en cours. Chaque entrée
reste ici jusqu'à son implémentation complète (puis peut être déplacée dans
une section "Fait" ou simplement supprimée une fois fusionnée sur `main`).

## À l'étude

### Missions sur planète — refonte post-playtest (tension tactique)

**Statut** : implémentation complète (8/8 étapes), testée en jeu réel à
chaque étape, fusionnée sur `main`. Fait suite au diagnostic de la V1
ci-dessous (section "Missions sur planète — tower attack"), implémentée et
en production, mais jugée peu intéressante après plusieurs parties jouées.

**Diagnostic (parties réelles jouées, clics simulés, pas de raccourcis)** :
sur une mission secteur 1/facile, l'escadrille est restée immobile à la
rangée de départ du tour 1 au tour 8, en cliquant juste "tirer sur la base"
— PV de la base 36→0 sans qu'aucune tourelle ne touche un seul vaisseau ni
qu'une garnison n'arrive à temps. Trois causes identifiées dans le code :
1. `analyseTir()` (repris tel quel du combat spatial) balaie toute la colonne
   jusqu'à la rangée 0 — la portée ne limite que le nombre de colonnes, pas
   la distance. Un vaisseau resté à la dernière rangée peut donc tirer sur
   la base à l'autre bout de la carte dès le tour 1 : aucun intérêt à avancer.
2. La portée des tourelles (1-2 cases) est dérisoire face à une grille de
   8-10 rangées — sans être forcées de s'approcher (cause 1), elles ne
   tirent quasiment jamais.
3. La base (3 colonnes de large) n'est souvent couverte que par 1-2 tourelles
   (1 colonne chacune) : il y a presque toujours une colonne "gratuite"
   jusqu'à la base, ou à l'inverse — si le joueur n'a que des colonnes
   bloquées — l'impression que "la base est indestructible" faute de retour
   visuel clair sur ce qui est réellement touché.

**Design validé** :
- **Correctif de portée (prérequis à tout le reste)** : en mission planète,
  la portée de tir est limitée à une distance réelle (rangées devant le
  vaisseau), pas seulement à des colonnes — avancer redevient nécessaire
  pour agir.
- **Briefing de mission**, affiché avant la bannière d'engagement (au moment
  d'entrer sur le nœud) : rappel de la mécanique du biome, force de défense
  approximative (jauge "légère/moyenne/lourde", pas le nombre exact de
  tourelles — un peu de brouillard, pas une fiche technique), rappel de la
  jauge d'alerte, et un choix d'approche optionnel et léger façon FTL
  (ex. partir avec l'alerte à zéro contre 1 tourelle de plus révélée d'entrée).
- **Jauge d'alerte** (état de mission, pas un chrono dur — cohérent avec la
  doctrine du jeu qui ne punit jamais par une limite de tours) : monte tant
  que l'escadrille reste loin/inactive.
  - Palier 1 : la garnison est produite plus vite/plus forte.
  - Palier 2 : les rangées arrière deviennent hostiles (réutilise le système
    de `champs`/dégâts de zone déjà existant, PAS une mort instantanée —
    juste des dégâts qui grignotent qui s'y attarde), toujours télégraphié
    plusieurs tours à l'avance. Habillage par biome : tempête de sable qui
    s'étend (désert), blizzard qui gagne (glace), obscurité qui gagne
    (grotte), effondrement de structure (villes anciennes) — réutilise les
    mécaniques déjà en place plutôt que d'en inventer une nouvelle.
- **Intentions visibles** (à la Slay the Spire) : une tourelle réveillée
  affiche sa cible/prochaine action ; la base "charge" périodiquement une
  salve de zone annoncée 1 tour à l'avance — le joueur peut toujours réagir
  (replier, foncer casser la source avant qu'elle n'agisse), jamais de coup
  surprise.
- **Tourelles à zone de contrôle mobile** et **point faible de la base qui
  se déplace** (à la façon échecs) : une tourelle menace 2-3 colonnes
  proches et peut pivoter si un vaisseau s'y expose trop longtemps ; la
  colonne réellement vulnérable de la base change périodiquement — empêche
  de figer une solution unique trouvée au tour 1 et d'y camper.
- **Couverture généralisée** : le mécanisme de ruines destructibles (V1 :
  réservé au biome villes anciennes) étendu aux 4 biomes, avec une densité/
  un habillage propre à chacun — avancer devient une vraie décision
  tactique (s'exposer vs. contourner) au lieu d'un couloir de tir dégagé
  par défaut.
- **Capacité de sabordage** (à la FTL) : un vaisseau rapide arrivé au contact
  de la base peut lancer un canal multi-tours à gros dégâts/quasi one-shot,
  interrompu s'il est détruit — un choix risque/récompense distinct du
  siège prudent, qui récompense l'agressivité.

**Plan d'implémentation envisagé** (mêmes principes que la V1 : chaque étape
testable avant la suivante, ordre pensé pour tester le correctif fondateur
en premier) :
1. ✅ Correctif de portée (limite de distance réelle) — seul, pour valider que
   l'avance redevient nécessaire, avant d'ajouter la couche de pression.
2. ✅ Jauge d'alerte (2 paliers, télégraphiée, habillée par biome).
3. ✅ Écran de briefing (biome, force de défense approximative, rappel
   d'alerte, choix d'approche optionnel).
4. ✅ Intentions visibles (tourelles + charge de salve de la base).
5. ✅ Zone de contrôle mobile des tourelles + point faible mobile de la base.
6. ✅ Couverture (ruines) généralisée aux 4 biomes.
7. ✅ Capacité de sabordage (vaisseau rapide, assaut final).
8. ✅ Vérifications transverses : re-playtest complet (parties réelles jouées,
   pas de raccourcis), équilibrage des PV/dégâts vs. durée de mission,
   non-régression du combat spatial et du reste des missions planète,
   version + cache du service worker, fusion sur `main`.

---

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

7. ✅ **Sauvegarde/reprise** (`state.js` `sauvegarderPartie`/`chargerSauvegarde`,
   `main.js` `reprendrePartie`) : sérialiser une mission planète en cours
   (base, tourelles, biome, compteurs de mécanique) sur le modèle de ce qui
   existe pour un combat spatial en cours.

8. ✅ **Habillage** : sprites de base/tourelles/ruines, décor par biome
   (`render.js`, `sprites.js`), nouvelle section `design-system.html`,
   traduction FR/EN complète (`i18n.js`), entrées d'encyclopédie (base,
   tourelles par type, biomes), éventuels nouveaux achievements.

9. ✅ **Vérifications transverses avant fusion** : le tutoriel scripté
   (`tuto.js`) n'est jamais impacté par un nœud planète en première
   position ; le mode combat spatial existant n'est pas régressé (tests
   Playwright du flux existant) ; test Playwright dédié pour chacun des 4
   biomes (victoire, défaite flotte détruite, reprise de partie en cours de
   mission) ; incrément `VERSION` (`src/version.js`) et cache du service
   worker (`sw.js`) comme à chaque changement livré.

**Statut final** : les 9 étapes sont terminées et vérifiées. Mode missions
planète intégralement fonctionnel (4 biomes, base, tourelles, garnison,
sauvegarde/reprise, habillage, encyclopédie), fusionné sur `main`.
**Note** : après plusieurs parties jouées, ce mode s'est révélé peu
intéressant tactiquement (voir le diagnostic dans la section "refonte
post-playtest" ci-dessus, qui prend le relais) — cette section reste comme
trace de la V1 livrée, mais le développement actif se poursuit dans la
section de refonte.

### Ambiance sonore — enrichissement de l'audio procédural

**Statut** : lots 1, 2, 3, 5 livrés et vérifiés (aucune erreur console, testé
via Playwright headless — chargement, curseurs de volume, persistance après
rechargement, appel de toutes les nouvelles fonctions d'`audio.js`) ; lot 7
livré à titre d'**essai** (voir note dédiée plus bas) ; lots 4 et 6 restent à
l'étude, non implémentés.

**Contexte technique (état actuel de `src/audio.js`)** : tout le son du jeu
est **procédural**, généré en direct via la Web Audio API (`OscillatorNode`/
`GainNode`), sans aucun fichier audio. Deux briques existent :
- des **bips d'effets** ponctuels (`sonTir`, `sonBoom`, `sonAie`, `sonSelect`,
  `sonRenfort`, `sonRadar`, `sonVague`, `sonUndo`, `sonPause`,
  `sonAchievement`, `sonVoix` — ce dernier "parle" en associant une fréquence
  à chaque lettre d'un mot) ;
- une **musique d'ambiance générative** (`startMusic`/`stopMusic`/
  `scheduleMusic`) : nappe grave tenue + notes aléatoires en gamme
  pentatonique mineure, avec 3 phases (`calme`/`tense`/`boss`) pilotées
  ailleurs dans le code (`setMusicPhase` appelé depuis `combat.js`, `map.js`,
  `planete.js` selon le déroulé du combat).

Un seul réglage existe côté joueur : le bouton `#son` (`ui.js`) qui bascule
tout le son on/off (`toggleSound`). Pas de volume ajustable, pas de séparation
effets/musique, pas de variation d'ambiance par biome (les 4 biomes des
missions planète — désert/glace/grotte/villes anciennes, voir plus haut dans
cette roadmap — sonnent identiquement aujourd'hui).

**Contrainte de conception à respecter** : le jeu est statique, sans build ni
dépendance npm, hébergé sur GitHub Pages. Pas de fichiers audio volumineux à
héberger/streamer sans réflexion (poids, cache du service worker, temps de
chargement mobile) — privilégier autant que possible l'extension de la
synthèse procédurale existante (comme la police auto-hébergée, tout doit
rester servi par le jeu lui-même, jamais un CDN externe).

**Propositions (à trier/prioriser avec l'utilisateur avant de chiffrer)** :

1. ✅ **Réglage de volume séparé musique / effets** : deux curseurs dans
   l'écran Paramètres (`#params`, `index.html`), remplaçant le tout-ou-rien
   du bouton `#son` du HUD (qui reste le coupe-son global). Deux `GainNode`
   maîtres (`gainEffets`/`gainMusique`) créés dans `initAudio()`, tous les
   `bip()`/`playSoft()` reroutés dessus au lieu de `AC.destination`
   directement. Valeurs persistées (`dc_vol_musique`/`dc_vol_effets` dans
   `localStorage`, lues dès le chargement du module `audio.js`). Nouveau
   composant `.volume-bloc`/`.volume-row` documenté dans
   `design-system.html`. Testé : curseurs déplacés, valeur persistée après
   rechargement complet de la page, aucune erreur console.
2. ✅ **Ambiance par biome (missions planète)** : nouvelle fonction
   `setMusicBiome(biomeId)` dans `audio.js`, table `BIOME_SONORE` (bass/mel/
   type d'oscillateur/densité/dissonance par biome) qui prend le pas sur les
   paramètres calme/tense/boss dans `scheduleMusic` dès qu'une mission
   planète est active — désert clairsemé (`triangle`), glace scintillante
   (`sine`, plus d'octaves hautes), grotte grave et étouffée (`sawtooth`,
   très peu de notes, cohérent avec sa mécanique d'obscurité), villes
   anciennes plus dense avec une pointe de dissonance (frottement d'un demi-
   ton/triton par-dessus la gamme pentatonique). Appelée dans
   `demarrerMissionPlanete()` (`planete.js`) et réinitialisée à `null` dans
   `finMissionPlanete()` et `demarrerCombat()` (`map.js`, au cas où une
   reprise de partie interromprait une mission planète). Le calme/tense de
   `setMusicPhase` continue d'agir par-dessus (tempo), sans conflit.
3. ✅ **Spatialisation de la musique** : `playSoft()` (musique) prend
   désormais un panoramique lent calculé par une pseudo-LFO
   (`Math.sin(Date.now()/6000)`, recalculée à chaque note plutôt qu'un nœud
   audio dédié vu la brièveté des notes) — la nappe grave et la mélodie
   errent doucement dans le champ stéréo, l'harmonie secondaire prenant le
   côté opposé pour une sensation d'espace.
4. **Réverbe légère procédurale** (non fait) : un `ConvolverNode` avec une
   impulse response générée par bruit blanc décroissant (quelques lignes de
   code, pas de fichier `.wav` à héberger) sur le bus musique, pour sortir du
   son "bip sec" actuel et donner une texture plus spatiale/aérienne
   cohérente avec le thème croiseur spatial.
5. ✅ **Stings renforcés aux moments clés** : 4 nouvelles fanfares dans
   `audio.js` (`sonVictoireSecteur`, `sonVictoirePlanete`, `sonHerosDebloque`,
   `sonEpique`), branchées respectivement sur la victoire de secteur (boss
   vaincu, `gagnerCombat()` dans `map.js` — remplace le simple `sonVague()`
   pour ce cas précis, les autres vagues gardent `sonVague()`), la victoire
   de mission planète (`finMissionPlanete(true)`, `planete.js`), le
   déblocage d'un héros via le nœud "Signal de détresse" (`map.js`), et
   l'apparition d'un boss de rareté épique (`miroir`/`forge`/`eclipse`,
   vérifié via `RARETE.boss` déjà présent dans `config.js`). Pas
   d'équivalent "amélioration épique" trouvé côté `UPGRADES` (aucune n'a de
   palier de rareté dans le code actuel) : le sting épique a donc été posé
   sur l'élément du jeu qui porte réellement cette rareté aujourd'hui, le
   boss, plutôt que d'inventer une rareté d'amélioration qui n'existe pas.
6. **Retour haptique mobile en complément** (non fait) : `navigator.vibrate`
   synchronisé sur les effets déjà existants (tir, dégât reçu, boss qui
   apparaît) — chaque plateforme mobile n'a pas forcément le son activé, la
   vibration est un canal de feedback complémentaire gratuit à ajouter.
7. ✅ **Voix de synthèse contextuelle pour `sonVoix` (essai)** : `sonVoix`
   accepte désormais un 2ᵉ paramètre de contexte (`'alerte'`/`'victoire'`/
   `'normal'`, ce dernier par défaut = comportement d'origine inchangé) qui
   module multiplicateur de fréquence/type d'oscillateur/tempo — plus grave,
   `sawtooth` et plus lent pour l'alerte boss (`map.js`, apparition), plus
   aigu, `square` et plus rapide pour la victoire (`combat.js`, boss
   détruit). **Marqué "essai"** : avec seulement ces deux appels existants
   dans le jeu (le mot "BOSS" dans les deux cas), la différence de timbre
   est le principal levier testable pour l'instant — à réévaluer en jeu
   avant d'étendre le principe à d'autres messages vocaux futurs.

**Autres boucles sonores proposées** (au-delà des 7 pistes ci-dessus, pour
prochaine itération) :

- **Boucle "hangar"** : un timbre calme et mécanique dédié à l'écran de choix
  de vaisseau (`#build`) et à l'attente en hangar, distinct de l'ambiance de
  combat — actuellement la musique ne change pas d'état pendant ces pauses.
- **Boucle "carte de secteur"** : ambiance propre à l'écran `#carte` (choix de
  destination) et à la marche entre les nœuds, plus aérienne/exploratoire que
  le combat, pour marquer la transition qu'apporte déjà visuellement la carte.
- **Boucle "défaite / game over"** : aujourd'hui la fin de partie n'a pas de
  traitement musical dédié (retour à `calme` comme un combat normal) ; un
  thème descendant, plus lent, en mineur plus marqué, renforcerait le poids
  de l'écran de fin.
- **Boucle "montée en tension progressive de secteur"** : plutôt qu'un
  binaire calme/tense/boss, faire dériver légèrement le tempo/la densité de
  `scheduleMusic` selon `state.vague` au sein d'un même secteur (de plus en
  plus dense à mesure qu'on approche du boss), sans nouvelle phase explicite
  à gérer ailleurs dans le code.
- **Boucle "victoire de run" (fin de partie réussie)** : un thème de
  cadence complète (progression d'accords qui se résout, contrairement aux
  fanfares courtes de `sonVictoireSecteur`/`sonVictoirePlanete`), pour
  distinguer une fin de run pleinement réussie d'une simple victoire de
  combat.
- **Variation de boucle par difficulté choisie** (`state.difficulte`) : un
  soupçon de tempo/densité en plus en difficulté élevée dès le début de
  partie, pas seulement pendant les combats de boss — cohérent avec
  `DIFFICULTES` qui pilote déjà plusieurs autres paramètres du jeu.

**Non retenu pour l'instant (à documenter si la question revient)** : musique
enregistrée (fichiers `.mp3`/`.ogg`) plutôt que procédurale — irait à
l'encontre de la philosophie "tout auto-hébergé, tout léger" du projet et
ajouterait un poids de téléchargement significatif pour un jeu qui doit
rester rapide à charger sur mobile ; à ne considérer que si la synthèse
procédurale montre clairement ses limites après les essais ci-dessus.

**Reste à faire avant de chiffrer un plan d'implémentation détaillé** :
prioriser avec l'utilisateur laquelle de ces 7 pistes apporte le plus (le
réglage de volume séparé et l'ambiance par biome semblent les gains les plus
immédiats pour l'expérience joueur) et valider si toutes doivent être faites
ou seulement un sous-ensemble.

### Héros du Vaisseau Rouge

**Statut final** : les 7 lots sont terminés et vérifiés, uniforme commun
dynamique inclus. Système entièrement fonctionnel (sélection, bonus en
combat, déblocage, arbre méta, habillage), fusionné sur `main`.

**Pitch** : le Vaisseau Rouge (`SHIP_ROUGE`, `src/config.js`) devient incarné
par un **héros** : un personnage avec un visage/casque, un caractère, un
bonus passif et un catalogue de héros déblocables — plutôt qu'un simple type
de vaisseau générique.

**Décisions de design (tranchées)** :
- **Progression en run** : pas de montée en puissance du bonus passif pendant
  une partie. Le bonus du héros équipé est fixe du début à la fin de la run
  (seules les `UPGRADES` génériques déjà en jeu, `rouge_pv`/`rouge_range`/
  `rouge_back`, continuent à s'appliquer par-dessus comme aujourd'hui).
- **Méta-progression entre parties** : double mécanisme —
  1. **Déblocage permanent** : un héros rencontré/sauvé via un événement de
     carte reste débloqué à vie (persisté comme `state.decouvertes`/`META`).
  2. **Arbre par héros** : en plus du déblocage, on peut dépenser des
     cristaux (méta-progression, façon `META` actuel dans `config.js`) pour
     booster durablement un héros précis choisi — à concevoir en détail
     (paliers, coût, effets) lors du chiffrage de ce lot.
- **Mort du héros équipé** : si le Vaisseau Rouge est détruit puis régénéré
  plus tard dans la même run, il est remplacé par un **androïde standard
  neutre unique** (pas de bonus passif particulier, un seul type d'androïde,
  pas de tirage parmi les héros débloqués).
- **Mission spéciale solo (champ d'astéroïdes, vaisseau héros seul)** : idée
  notée, **non prioritaire** — pas conçue en détail pour l'instant, à
  reprendre dans une itération future une fois le socle héros en place.
- **Événements de récupération/déblocage sur la carte de secteur** : nouveau
  type de nœud **dédié** ajouté à `NOEUD_TYPES` (`src/map.js`), avec sa
  propre icône/couleur sur la carte — pas un simple sous-cas du nœud `event`
  existant.
- **Portrait de héros** : un visage détaillé, en pixel-art plus grand/plus
  lisible que les sprites de vaisseaux actuels (grille plus large que les
  ~9-12px de `ROUGE`), affiché :
  - au survol du Vaisseau Rouge en combat ;
  - sur l'écran de choix du héros en début de partie.
  Le **sprite de combat** du Vaisseau Rouge (sur la grille de jeu) reste
  globalement le même gabarit que `ROUGE`, mais peut recevoir de **légères
  variations visuelles par héros** définies au cas par cas selon le
  personnage (ex. un héros "Slimy" ajoute des taches de bave sur la coque).
  Portrait et sprite de combat sont deux assets distincts, produits par deux
  éditeurs différents (voir plus bas).
- **Outillage pixel-art** : deux éditeurs **autonomes hors-jeu** (fichiers
  HTML séparés à la `design-system.html`, non chargés par le jeu en prod,
  sans risque pour la prod) :
  1. éditeur de **portraits de héros** (grille plus grande, palette `PAL`) ;
  2. éditeur de **sprites de vaisseaux** (grille au gabarit des sprites
     `sprites.js` actuels), indépendant du premier.
  Les deux exportent une chaîne/grille compatible `PAL` à coller dans
  `sprites.js`.
  → **Premier jet livré** : `pixel-editor.html` (dessin pixel libre, taille de
  grille configurable, palette réelle importée de `src/sprites.js`, export
  JS prêt à coller, projets sauvegardés en `localStorage`). Sert déjà aux
  portraits ET aux sprites de vaisseaux (un seul outil générique plutôt que
  deux, plus simple à maintenir qu'anticipé). L'évolution **paramétrique**
  ci-dessous (traits assemblables plutôt que pixel libre) reste à construire
  par-dessus, en V2 de l'outil.

**Éditeur — évolution paramétrique (V2, pas encore construite)** : au-delà du
dessin pixel libre, produire un héros par **assemblage de traits** plutôt que
de redessiner un portrait complet à chaque fois :
- forme de crâne (silhouette de tête, plusieurs presets) ;
- couleur de peau, y compris des teintes extraterrestres (vert, bleu, gris…
  au-delà des carnations réalistes) ;
- pilosité : cheveux / barbe / moustache, chacun avec plusieurs styles et
  couleurs, activables indépendamment (un héros peut n'avoir aucune pilosité) ;
- accessoires : bijoux, chapeau, casque — superposés par-dessus la base ;
- caractéristiques spéciales : traits hors gabarit standard (ex. un seul œil
  pour Polyphème, pas d'yeux pour Demonokos, peau gluante avec reflets pour
  Slum) — nécessite que le gabarit de base reste assez flexible pour ces cas
  qui cassent le moule "visage humanoïde standard".
- **Uniforme commun** : costume noir de base partagé par tous les héros, avec
  un nombre de médailles/décorations qui reflète l'avancement de la
  méta-progression du héros (arbre par héros décrit plus haut) — dessiné une
  seule fois puis réutilisé, seule la tête/le visage change par héros.

**Catalogue initial des héros (bonus proposés + rareté théorique)** :

Méthode de notation (à réutiliser pour tout futur héros ajouté à l'éditeur) :
score sur 4 axes, chacun noté 0 à 3, sauf la contrepartie qui retire des
points :
- **Puissance brute** : comparée aux barèmes déjà en jeu (`UPGRADES` :
  `rouge_pv`/`rouge_range`/`rouge_back`) — même ordre de grandeur = 1,
  un cran au-dessus = 2, transformateur = 3.
- **Portée d'effet** : le héros seul (0-1), toute l'escadrille (2), escadrille
  + croiseur (3).
- **Uptime / conditions** : permanent sans condition = 3, déclenché souvent
  (à chaque kill…) = 2, conditionné à une situation rare = 1, usage unique
  par combat = 0.
- **Contrepartie** : un bonus avec inconvénient retire 1 point ; pur upside
  ne retire rien.

Score total → palier : 0-2 `commun`, 3-4 `peu_commun`, 5-6 `rare`, 7-9
`epique`. Ce score est un **point de départ théorique** : le champ `rarete`
reste modifiable à la main dans `config.js` après tests en jeu, comme
n'importe quelle autre donnée d'équilibrage du jeu — le score sert de
justification traçable, pas de calcul figé.

| Héros | Portrait (brief visuel) | Bonus passif proposé | Score (puiss./portée/uptime/contrepartie) | Rareté théorique |
|---|---|---|---|---|
| Darkor | Casqué tout noir, reflets brillants (façon Vador) | +1 dégât de tir, permanent | 2/0/3/0 = 5 | rare |
| Odysseus | Barbu, yeux clairs, peau claire | Évite automatiquement une attaque qui l'aurait détruit, une fois par combat | 3/0/2/0 = 5 | rare |
| L'Achéen | Cheveux blonds bouclés, peau claire, boucle d'oreille dorée (façon Achille) | Immunisé au premier tir subi chaque combat, mais +1 dégât reçu sur tous les tirs suivants ce combat-là (référence au talon d'Achille) | 2/0/2/-1 = 3 | peu_commun |
| Polyphème | Cyclope, force brute | +50% dégâts de tir, -1 PV max | 3/0/3/-1 = 5 | rare |
| Slum | Peau verte gluante, deux yeux globuleux | +2% PV régénérés par tour, en permanence (équivalent d'un palier gratuit de l'amélioration Auto-réparation) | 1/0/3/0 = 4 | peu_commun |
| Bar4-bar4 | Femme brune, peau mate | Aura défensive : les ailes ennemies adjacentes à elle ont une précision réduite | 1/2/3/0 = 6 | rare |
| Demonokos | Aigle aveugle | +1 portée de tir, immunisé aux effets de brouillage (brouilleur/void) | 2/0/3/0 = 5 | rare |
| *Androïde standard* (remplaçant neutre, hors tirage) | Uniforme sans visage distinctif | Aucun bonus passif | — | `commun` (fixe, pas de rareté tirée) |

Répartition obtenue : 1 `commun` (androïde, hors pool), 2 `peu_commun`,
5 `rare`, 0 `epique` — cohérent avec un premier lot de héros solides mais pas
tous exceptionnels ; l'`epique` reste à débloquer par un futur héros plus
marquant, une fois ce premier lot testé.

**Reste à préciser avant chiffrage détaillé** :
- Barème de l'arbre méta par héros (coût en cristaux, paliers, effets) —
  les bonus passifs ci-dessus sont figés pour la V1, seul leur *ampleur*
  évoluerait avec l'arbre méta (ex. Darkor : +1 dégât → +2 à un palier
  ultérieur), formule à définir.
- Contenu exact des événements de récupération (sauvetage / escorte / combat
  spécial) et taux d'apparition sur la carte.
- Icône/couleur du nouveau type de nœud sur la carte de secteur.
- Contenu de la section Encyclopédie dédiée aux héros (cartes, stats, lore,
  état verrouillé/débloqué — même pattern que `carteGuide()`/
  `ouvrirGuideDetail()` dans `src/ui.js`).
- Ajustement des raretés théoriques ci-dessus après premiers tests en jeu.

**Impacts techniques identifiés** :
- `config.js` : catalogue `HEROS` (remplace/étend `SHIP_ROUGE`) + entrées
  d'arbre méta.
- `state.js` : `heroActif`, `herosDecouverts`, méta par héros ; sérialisation
  dans la sauvegarde de run (`sauvegarderPartie`) pour survivre à un refresh
  en cours de partie.
- `entities.js` : `creerVaisseau('rouge', …)` doit lire le héros actif
  (stats, bonus, variation de sprite) et gérer la bascule vers l'androïde
  après une mort.
- `sprites.js` : gabarit de portrait (nouvelle grille plus grande) +
  variations optionnelles du sprite `ROUGE` par héros.
- `map.js` : nouveau type dans `NOEUD_TYPES`, génération/traitement du nœud
  dans `entrerNoeud()`.
- `ui.js` : écran de choix de héros en début de partie, section Héros dans
  `ouvrirGuide()`.
- `i18n.js` : entrées FR/EN pour chaque héros (nom, description, bonus, lore).
- `design-system.html` : nouvelle section "carte héros" dès que le composant
  existe.
- Deux nouveaux fichiers HTML autonomes (éditeurs pixel-art
  portraits/vaisseaux), hors chaîne de build, non référencés par
  `index.html`/`sw.js`.
  → Réalisé sous forme d'un seul outil générique, `pixel-editor.html`
  (voir plus haut).

**Plan d'implémentation** (chaque étape reste jouable/testable avant de
passer à la suivante) :

1. ✅ **Fondations données** (`config.js`, `state.js`) : catalogue `HEROS`
   (les 7 héros ci-dessus, bonus décrit en donnée), `ANDROIDE` (remplaçant
   neutre), champ `state.heroActif` (run en cours, sérialisé dans la
   sauvegarde), `state.metaHeros` (squelette persisté), déblocage permanent
   via le mécanisme `decouvrir()`/`estDecouvert()` déjà existant (catégorie
   `'heros'`, pas de nouveau store). Vérifié sans régression (partie lancée
   de bout en bout jusqu'à la carte de secteur, aucune erreur console).
2. ✅ **Intégration combat** (`entities.js`, `combat.js`) : `nouveauVaisseau`
   fige le héros actif à la création (`f.heroId`) et ajuste ses PV (malus
   éventuel, ex. Polyphème) ; `tuerFighter` bascule `state.heroActif` sur
   `'androide'` quand le Vaisseau Rouge meurt. Bonus branchés : Darkor/
   Polyphème (dégâts du tir de zone, `combat.js:tirer`), Odysseus/L'Achéen
   (évasion/bouclier du premier coup, `entities.js:blesser`), Slum
   (régénération du croiseur, `combat.js:finDuTour`), Bar4-bar4 (précision
   réduite des ailes adjacentes, `combat.js:finDuTour`), Demonokos (portée +
   immunité au brouillage, `combat.js:analyseTir`). Testé en forçant
   temporairement `state.heroActif` sur un héros doté d'un bonus : plusieurs
   tours de combat joués sans erreur, puis revérifié avec l'androïde par
   défaut.
3. ✅ **UI de sélection** (`ui.js`, `main.js`) : écran `#heroChoix` affiché
   après le choix de la difficulté (`demarrerAvecDifficulte`) et avant
   « Rejouer » (`btnRejouer`) — une carte par héros (icône provisoire tirée
   de `ICONS`/`sprites.js` en attendant un vrai portrait via
   `pixel-editor.html`, badge de rareté) + bouton Aléatoire, réutilisant le
   pattern `.cards`/`.card` du design system. Choisir un héros le marque
   découvert dans l'Encyclopédie (même logique que `decouvrir('vaisseau',…)`
   pour les autres types de vaisseaux). **Simplification actuelle** : les 7
   héros sont tous proposés dès la première partie (rien n'étant encore
   débloqué avant le lot 5, un filtrage par `estDecouvert` viderait l'écran)
   — à revoir une fois les événements de récupération/déblocage livrés, pour
   ne proposer que les héros réellement débloqués + l'aléatoire.
4. ✅ **Encyclopédie** (`ui.js`) : section « Héros » dans `#guide`
   (`guideHeros`), même pattern `carteGuide()`/`ouvrirGuideDetail()` que les
   autres catégories (portrait provisoire, rareté, statut verrouillé/
   débloqué, fiche détail avec le texte du bonus passif).
   Testé en jeu (FR et EN) : écran de choix, sélection d'un héros, partie
   lancée, entrée correspondante débloquée dans l'Encyclopédie avec badge de
   rareté et détail du bonus — aucune erreur console.
5. ✅ **Événements de carte** (`map.js`) : nouveau type de nœud `heros`
   (icône `trophee`, couleur rose dédiée), tiré parmi les nœuds
   intermédiaires comme `planete` (au plus 1/secteur, jamais garanti,
   `PROBA_HEROS=0.4`), et seulement s'il reste au moins un héros non
   débloqué (sinon jamais tiré — pas de nœud sans rien à offrir). Scène
   « Signal de détresse » (même moteur que les autres scènes sans combat,
   `construireScene`/`ouvrirScenePlanete`) : *Secourir* (-10% PV, débloque
   un héros non encore rencontré au hasard) ou *Ignorer* (+10% PV). Repli
   neutre (petit butin) si généré alors que tous les héros sont déjà
   débloqués. Testé : ~27% d'occurrence sur 30 générations de secteur,
   scène de sauvetage jouée jusqu'au bout (héros débloqué visible dans
   `dc_decouvertes`), aucune erreur console.
6. ✅ **Arbre méta par héros** (`config.js`, `state.js`, `ui.js`) :
   `state.metaHeros[heroId]` = niveau (0-3, `META_HEROS_MAX`), coût en
   cristaux `coutMetaHero(niveau)=4+niveau×3` (même ordre de grandeur que
   `META`), persisté (`dc_meta_heros`). `appliquerMetaHero()` renforce le
   bonus selon son `id` (barème générique, un seul palier par formule,
   volontairement simple — à ajuster après tests) : Darkor +1 dégât/niveau,
   Polyphème +15% dégâts/niveau, Slum +1% régén/niveau, Demonokos +1 portée
   au niveau 2, Odysseus/L'Achéen +1 usage de leur défense/niveau,
   Bar4-bar4 +10% de tir raté/niveau. Nouvelle section « Arbre des héros »
   dans l'écran Améliorations permanentes (`#meta`), visible dès qu'au moins
   un héros est débloqué, même pattern carte que `META`. Le modal `#meta`
   est désormais scrollable (`.guide-scroll`, réutilisé de l'Encyclopédie)
   pour ne jamais couper son contenu sur petit écran. Testé : investissement
   d'un niveau sur Darkor (cristaux décomptés, palier affiché, persisté),
   aucune erreur console.
7. ✅ **Habillage** (`sprites.js`, `entities.js`, `ui.js`, `design-system.html`) :
   - 8 portraits pixel-art (15×19, `PORTRAIT_*`/`PORTRAITS_HEROS`) — les 7
     héros + l'androïde standard, dessinés à la main (silhouette de tête
     partagée, traits distinctifs par héros : visière de Darkor, barbe
     d'Odysseus, boucles blondes + boucle d'oreille de L'Achéen, œil unique
     de Polyphème, coulures de bave de Slum, chevelure de Bar4-bar4, bec
     crochu de Demonokos). Cuits une fois (`imgPortraitsHeros`), affichés à
     l'écran de choix du héros, dans l'Encyclopédie et dans l'infobulle au
     survol du Vaisseau Rouge en combat (nom + bonus passif inclus).
   - Variation du sprite de combat par héros : même gabarit que `ROUGE` pour
     tous, seul l'accent central change de couleur
     (`HERO_ROUGE_OVERRIDES`) — sauf Slum, seul à casser aussi la silhouette
     (`ROUGE_SLUM`, coulures de bave qui débordent sous la coque), comme
     évoqué dans le brainstorming initial. L'androïde garde la couleur par
     défaut, neutre.
   - Nouvelle section « Héros du Vaisseau Rouge » dans `design-system.html`
     (sprite de combat + portraits, synchronisés en direct avec `sprites.js`
     comme le reste de la page).
   - Au passage : mode miroir horizontal activé par défaut dans
     `pixel-editor.html` (la plupart des sprites du jeu sont symétriques).
   Testé en jeu : écran de choix (portraits affichés), combat avec Slum
   (variante de sprite + infobulle avec portrait/nom/bonus), page
   design-system (16 cartes : 8 sprites + 8 portraits) — aucune erreur
   console.
   → **Complété ensuite par l'uniforme commun dynamique** (demandé après
   coup) : bandeau épaules/costume noir partagé par tous les héros
   (`UNIFORME_HEROS`, `grillePortraitComplet()` dans `sprites.js`), accolé
   sous chaque tête. Le nombre de médailles dorées (0 à 3) reflète en direct
   le niveau investi dans l'arbre méta de CE héros (`state.metaHeros`,
   lot 6) — recuit une fois par niveau possible (`imgPortraitsHeros[id]` =
   tableau de 4 images), `imgHeroPortrait()` choisit la bonne selon le
   niveau courant. Nouvelle section dédiée dans `design-system.html`
   (Darkor aux 4 niveaux + l'androïde, toujours à 0 médaille). Testé :
   écran de choix avec un héros pré-chargé à un niveau méta non nul
   (médailles visibles immédiatement), page design-system — aucune erreur
   console.

**Les 7 lots de la roadmap "Héros du Vaisseau Rouge" sont maintenant tous
livrés**, uniforme commun inclus. Reste ouvert pour une itération future
(notés comme simplifications assumées en cours de route) :
- le déblocage se fait uniquement en jouant un héros (choix libre dès la
  première partie) ou via le nœud "Signal de détresse" — pas encore de
  distinction stricte "héros non débloqué = non sélectionnable" à l'écran
  de choix (étape 3) ;
- la mission spéciale solo (champ d'astéroïdes, vaisseau héros seul) évoquée
  dans le brainstorming initial n'a jamais été chiffrée (notée non
  prioritaire dès le départ).

### Édition en direct des sprites (pixel-editor.html → jeu)

**Statut** : livré pour les portraits de héros + l'uniforme commun ; prévu
ensuite pour les vaisseaux, tuiles de décor, menaces et icônes.

**Pitch** : jusqu'ici, modifier un sprite dans `pixel-editor.html` voulait
dire copier l'export à la main dans `sprites.js`. Désormais, un sprite du
"catalogue" (`REGISTRE_SPRITES` dans `sprites.js`) peut être chargé, édité,
puis **publié** directement depuis l'éditeur — il devient la version active
de ce sprite dans **tout** le jeu (combat, encyclopédie, écran de choix,
`design-system.html`) au prochain rechargement de ces pages, sans toucher au
code.

**Comment ça marche** :
- `grilleEffective(id)` (`sprites.js`) renvoie la version personnalisée
  stockée en `localStorage` (`dc_sprite_overrides`) si elle existe, sinon le
  défaut d'usine (`REGISTRE_SPRITES[id]`). Tout le code qui affiche un
  sprite du catalogue passe par cette fonction plutôt que de lire les
  constantes `PORTRAIT_*`/`UNIFORME_HEROS` directement — c'est ce qui fait
  qu'une publication se répercute partout.
- `publierSprite(id, grille)` écrit la nouvelle version active et pousse
  l'ancienne dans un historique (`dc_sprite_historique`, 20 versions max par
  sprite, jamais écrasées silencieusement).
- `reinitialiserSprite(id)` retire la version personnalisée (retour au
  défaut d'usine), en gardant elle aussi une trace dans l'historique.
- Côté éditeur : sélecteur du sprite à charger (regroupé par catégorie —
  `portrait:`, `uniforme:` pour l'instant), boutons Charger/Publier/
  Réinitialiser, et une liste d'historique avec vignette + date + bouton
  Restaurer par version. La colonne "Projet libre" (dessin depuis zéro,
  export JS à coller à la main) reste disponible pour un sprite pas encore
  dans le jeu.
- **Limite assumée** : la publication est stockée en `localStorage`, donc
  propre à CE navigateur — elle ne modifie jamais `src/sprites.js` sur le
  disque et n'est pas partagée avec d'autres joueurs. Pour que ça devienne
  la version livrée à tout le monde, il faut encore répercuter le contenu
  publié dans `sprites.js` et déployer (étape manuelle, hors de portée d'une
  page statique sans backend) — voir le pont ci-dessous.
- **Pont vers le code source** : fieldset « Exporter mes personnalisations »
  dans l'éditeur — génère, pour chaque sprite publié dans le navigateur, le
  bloc `export const NOM=[...]` prêt à remplacer la constante correspondante
  dans `src/sprites.js` (`NOM_CONSTANTE_SPRITE`, table id → nom de constante,
  `sprites.js`). Un bouton "Copier tout" pour transmettre le résultat.
- Au passage : palette de l'éditeur triée par teinte (au lieu de l'ordre
  d'insertion dans `PAL`) — beaucoup plus facile à parcourir visuellement.

Testé : chargement de `portrait:darkor`, édition, publication, vérifié
visible après rechargement dans `pixel-editor.html` lui-même, dans
`design-system.html` et dans l'écran de choix du jeu réel (même navigateur,
onglets différents) ; réinitialisation vérifiée (retour au défaut, ancienne
version conservée dans l'historique) ; export global vérifié avec deux
sprites publiés (`portrait:darkor` + `uniforme:heros`) — les deux blocs
`export const` générés étaient corrects et prêts à coller — aucune erreur
console sur aucune des
trois pages.
