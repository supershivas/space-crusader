# Roadmap — Croiseur

Ce fichier liste les grosses mises à jour de gameplay envisagées mais pas encore
implémentées. Une entrée passe de "brainstorming" à "en cours" quand une branche
de travail démarre, puis disparaît (ou est archivée) une fois fusionnée sur `main`.

## Héros du Vaisseau Rouge

**Statut : conception validée, pas encore implémenté.**

### Concept

Le Vaisseau Rouge (`SHIP_ROUGE`, `src/config.js`) devient incarné par un **héros** :
un personnage avec un visage/casque, un caractère, un bonus passif et un catalogue
de héros déblocables — plutôt qu'un simple type de vaisseau générique.

### Décisions de design (tranchées)

- **Progression en run** : pas de montée en puissance du bonus passif pendant une
  partie. Le bonus du héros équipé est fixe du début à la fin de la run (seules les
  `UPGRADES` génériques déjà en jeu, `rouge_pv`/`rouge_range`/`rouge_back`, continuent
  à s'appliquer par-dessus comme aujourd'hui).
- **Méta-progression entre parties** : double mécanisme —
  1. **Déblocage permanent** : un héros rencontré/sauvé via un événement de carte
     reste débloqué à vie (persisté comme `state.decouvertes`/`META`).
  2. **Arbre par héros** : en plus du déblocage, on peut dépenser des cristaux
     (méta-progression, façon `META` actuel dans `config.js`) pour booster
     durablement un héros précis choisi — à concevoir en détail (paliers, coût,
     effets) lors du chiffrage de ce lot.
- **Mort du héros équipé** : si le Vaisseau Rouge est détruit puis régénéré plus
  tard dans la même run, il est remplacé par un **androïde standard neutre unique**
  (pas de bonus passif particulier, un seul type d'androïde, pas de tirage parmi
  les héros débloqués).
- **Mission spéciale solo (champ d'astéroïdes, vaisseau héros seul)** : idée notée,
  **non prioritaire** — pas conçue en détail pour l'instant, à reprendre dans une
  itération future une fois le socle héros en place.
- **Événements de récupération/déblocage sur la carte de secteur** : nouveau type
  de noeud **dédié** ajouté à `NOEUD_TYPES` (`src/map.js`), avec sa propre
  icône/couleur sur la carte — pas un simple sous-cas du noeud `event` existant.
- **Portrait de héros** : un visage détaillé, en pixel-art plus grand/plus lisible
  que les sprites de vaisseaux actuels (grille plus large que les ~9-12px de
  `ROUGE`), affiché :
  - au survol du Vaisseau Rouge en combat ;
  - sur l'écran de choix du héros en début de partie.
  Le **sprite de combat** du Vaisseau Rouge (sur la grille de jeu) reste
  globalement le même gabarit que `ROUGE`, mais peut recevoir de **légères
  variations visuelles par héros** définies au cas par cas selon le personnage
  (ex. un héros "Slimy" ajoute des taches de bave sur la coque). Portrait et
  sprite de combat sont deux assets distincts, produits par deux éditeurs
  différents (voir plus bas).
- **Outillage pixel-art** : deux éditeurs **autonomes hors-jeu** (fichiers HTML
  séparés à la `design-system.html`, non chargés par le jeu en prod, sans risque
  pour la prod) :
  1. éditeur de **portraits de héros** (grille plus grande, palette `PAL`) ;
  2. éditeur de **sprites de vaisseaux** (grille au gabarit des sprites `sprites.js`
     actuels), indépendant du premier.
  Les deux exportent une chaîne/grille compatible `PAL` à coller dans `sprites.js`.

### Reste à préciser avant chiffrage détaillé

- Liste des premiers héros (nom, caractère, bonus passif, variation visuelle
  éventuelle du sprite de combat) — ex. "Slimy" cité en exemple.
- Barème de l'arbre méta par héros (coût en cristaux, paliers, effets).
- Contenu exact des événements de récupération (sauvetage / escorte / combat
  spécial) et taux d'apparition sur la carte.
- Icône/couleur du nouveau type de noeud sur la carte de secteur.
- Contenu de la section Encyclopédie dédiée aux héros (cartes, stats, lore,
  état verrouillé/débloqué — même pattern que `carteGuide()`/`ouvrirGuideDetail()`
  dans `src/ui.js`).

### Impacts techniques identifiés

- `config.js` : catalogue `HEROS` (remplace/étend `SHIP_ROUGE`) + entrées d'arbre méta.
- `state.js` : `heroActif`, `herosDecouverts`, méta par héros ; sérialisation dans
  la sauvegarde de run (`sauvegarderPartie`) pour survivre à un refresh en cours de partie.
- `entities.js` : `creerVaisseau('rouge', …)` doit lire le héros actif (stats,
  bonus, variation de sprite) et gérer la bascule vers l'androïde après une mort.
- `sprites.js` : gabarit de portrait (nouvelle grille plus grande) + variations
  optionnelles du sprite `ROUGE` par héros.
- `map.js` : nouveau type dans `NOEUD_TYPES`, génération/traitement du noeud dans
  `entrerNoeud()`.
- `ui.js` : écran de choix de héros en début de partie, section Héros dans
  `ouvrirGuide()`.
- `i18n.js` : entrées FR/EN pour chaque héros (nom, description, bonus, lore).
- `design-system.html` : nouvelle section "carte héros" dès que le composant existe.
- Deux nouveaux fichiers HTML autonomes (éditeurs pixel-art portraits/vaisseaux),
  hors chaîne de build, non référencés par `index.html`/`sw.js`.
