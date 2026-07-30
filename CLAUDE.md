# Croiseur — instructions permanentes

Jeu web statique (HTML/CSS/JS vanilla, modules ES, sans build), jouable en famille,
hébergé sur GitHub Pages (`pershivas.github.io`). Pas de bundler, pas de dépendances npm.

## À faire systématiquement, sans qu'on ait besoin de le redemander

- **Numéro de version** (`src/version.js`, `VERSION`) : l'incrémenter à chaque changement
  poussé en production, même mineur. C'est ce numéro qui déclenche la modale "mise à jour
  installée" côté joueur (comparaison avec la dernière version vue, stockée en localStorage).
- **Cache du service worker** (`sw.js`, `const CACHE = 'croiseur-vNN'`) : incrémenter `vNN`
  dès qu'un fichier de `ASSETS` change (à peu près à chaque commit qui touche `src/*.js`,
  `index.html`, ou un nouvel asset). Si un nouveau fichier est ajouté et qu'il doit être
  disponible hors-ligne, l'ajouter à la liste `ASSETS`.
- **Fusion en production** : une fois les changements vérifiés (tests Playwright ok, pas de
  bug bloquant), fusionner la branche de travail sur `main` avec `git merge --ff-only` et
  pousser — sans attendre une demande explicite à chaque fois, sauf avis contraire de
  l'utilisateur. Ne jamais force-push. Si le fast-forward échoue (main a divergé), le signaler
  plutôt que de forcer.
- **Tester avant de fusionner** : servir le repo avec `python3 -m http.server` et piloter un
  Chromium headless via Playwright (`/opt/pw-browsers/chromium`) pour vérifier le flux
  concerné avant de pousser. Ne pas se contenter de `node --check`.
- **Bilingue FR/EN systématique** : toute chaîne visible par le joueur passe par
  `src/i18n.js` (`t('cle')` ou `L({fr,en})`), avec une entrée dans les DEUX blocs `fr`/`en`.
  Le français est la langue de référence (`lang="fr"` par défaut, `state.langue` par défaut
  `'fr'`) ; ne jamais ajouter de texte en dur dans le HTML ou le JS sans passer par l'i18n.
- **Police auto-hébergée** : `fonts/PressStart2P.woff2` est servi depuis le jeu lui-même.
  Ne jamais réintroduire de dépendance à un CDN externe (Google Fonts ou autre) pour
  l'identité visuelle du jeu — un chargement externe qui échoue silencieusement fait
  perdre le rendu pixel-art (déjà arrivé une fois). **Ne jamais retélécharger une copie
  fraîche de cette police depuis Google Fonts/un CDN** : le fichier a été corrigé à la
  main (glyphes `Eacute`/`Egrave`/`Ecircumflex`/`Agrave`/`Icircumflex`/`Ocircumflex`/
  `Ucircumflex` reconstruits via fontTools, l'original mappait les majuscules
  accentuées vers un corps de lettre minuscule) — un remplacement écraserait ce correctif.
- **Design system — toujours le consulter avant de styler quoi que ce soit** : la page
  `design-system.html` (racine du repo, liée discrètement en bas des Paramètres du jeu) est
  la référence visuelle vivante du projet. Avant d'ajouter un nouveau composant visuel
  (bouton, carte, modale, badge…), y jeter un œil pour réutiliser l'existant plutôt
  qu'inventer une taille/couleur ad hoc. Elle documente actuellement :
  - la police (Press Start 2P, auto-hébergée) ;
  - les couleurs de base (fond, texte, accent cyan, primaire vert, or, secondaire bleu,
    danger rouge, texte atténué) ;
  - les niveaux de rareté des éléments non jouables (commun/peu commun/rare/épique) ;
  - l'échelle typographique complète : `--fs-display` / `--fs-titre` / `--fs-modale` /
    `--fs-souligne` / `--fs-corps` / `--fs-petit` (variables CSS définies une seule fois dans
    `theme.css`, chargé par `<link>` depuis `index.html` ET `design-system.html` — plus besoin
    de dupliquer à la main, une modification dans `theme.css` vaut pour les deux) ;
  - l'échelle d'espacement (`--space-xs/sm/md/lg/xl`, aussi dans `theme.css`) et l'échelle de
    radius (`--radius-sm/md/lg/xl`) — jamais une marge, un gap ou un border-radius inventé au
    cas par cas ; les éléments dessinés sur le canvas de jeu (barres/boutons du HUD) suivent la
    même échelle de radius via la constante `RADIUS` dans `render.js` ;
  - les boutons (`button.jouer` primaire, `.secondaire`, `.danger`, état désactivé) ;
  - les cartes de choix (améliorations/événements) et les cartes d'encyclopédie (avec/sans
    badge de rareté, état verrouillé) ;
  - les modales (fenêtre semi-plein écran type `.modal`, titre centré, texte
    d'accompagnement, cartes, bouton de fermeture), la bannière de début d'étape ("wow
    effect" : carte compacte + zoom d'apparition + `--fs-display`) et la modale de
    confirmation à un seul bouton OK (résultat d'événement / mise à jour) ;
  - les toasts (neutre/succès/avertissement/erreur/or).
  **Quand ajouter/modifier une section de `design-system.html`** : dès qu'un nouveau
  pattern visuel réutilisable apparaît dans `index.html` (nouvelle classe de composant,
  nouvelle couleur sémantique, nouvel effet d'animation notable) — pas besoin que
  l'utilisateur le redemande. La page est un aperçu statique autonome (elle ne charge pas
  `index.html`) : toute démonstration doit être recréée avec des extraits de CSS/HTML
  fidèles, pas un simple lien vers le vrai composant.
- **Titres cohérents** : les titres de type "h1" (accueil, écrans de fin/mission, bannière
  de début d'étape) utilisent tous `--fs-display` et doivent rester centrés et sur une seule
  ligne quand c'est possible (voir `ajusterTitreAccueil()` dans `src/main.js` pour l'exemple
  d'un ajustement JS qui mesure le rendu réel plutôt que de deviner une taille CSS fixe).
- **Mobile d'abord** : le jeu tourne en plein écran sur téléphone (Safari/Chrome iOS et
  Android). Toujours garder à l'esprit les barres d'outils dynamiques (adresse qui
  apparaît/disparaît) : préférer `visualViewport` à `window.innerHeight` pour les mesures
  de mise en page, et `dvh` à `vh`/`%` quand c'est pertinent.
- **Commits en français**, descriptifs, expliquant le pourquoi plus que le quoi.

## Repères techniques rapides

- Point d'entrée : `index.html` → `src/main.js` (cycle de vie, boucle de jeu).
- Rendu : tout le jeu (grille, HUD, animations) est dessiné sur un seul `<canvas>` via
  `src/render.js` ; les modales/menus sont du DOM classique par-dessus.
- État partagé : `src/state.js` exporte un objet `state` unique, importé partout.
- `src/tuto.js` : tutoriel scripté (mission fixe, vaisseaux capturés par référence au
  démarrage — ne jamais recibler sur "la sélection courante", ça a été une source de bugs).
- `src/entities.js` / `src/combat.js` / `src/map.js` : logique de jeu (spawns, tours,
  carte de secteur). `config.js` centralise les catalogues de données (vaisseaux, boss,
  obstacles, rareté).
- Guide en jeu = "Encyclopédie" (`ouvrirGuide()` dans `ui.js`) : catalogue déblocable au fil
  des rencontres, persisté séparément (`dc_decouvertes`).
