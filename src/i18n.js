/* =====================================================================
   INTERNATIONALISATION (i18n)
   Fondations pour le multilingue. FR est complet ; EN couvre pour l'instant
   les menus (accueil, paramètres, infos, pause, difficulté). Le reste du jeu
   (infobulles, journal de combat) reste en français — traduction à venir.

   Utilisation :
   - texte statique : <span data-i18n="cle"></span>       → textContent = t(cle)
   - texte riche    : <div  data-i18n-html="cle"></div>   → innerHTML  = t(cle)
   - dans le code   : t('cle')
   ===================================================================== */
import { state } from './state.js';

export const LANGUES = ['fr', 'en'];
export const NOM_LANGUE = { fr:'Français', en:'English' };

const STRINGS = {
  fr: {
    // Accueil
    home_reprendre:'↻ REPRENDRE',
    home_jouer:'▶ JOUER',
    home_params:'⚙ PARAMÈTRES',
    home_ameliorations:'⚙ AMÉLIORATIONS',
    // Choix de difficulté (après « Jouer »)
    diff_titre:'CHOISIS LA DIFFICULTÉ',
    diff_facile:'Facile',        diff_facile_d:'Croiseur renforcé, moins d\'ennemis. Idéal pour découvrir.',
    diff_normal:'Normal',        diff_normal_d:'L\'équilibre voulu par le jeu.',
    diff_difficile:'Difficile',  diff_difficile_d:'Croiseur fragile, ennemis nombreux et coriaces.',
    diff_annuler:'Retour',
    // Paramètres (menu)
    params_titre:'⚙ PARAMÈTRES',
    params_infos:'ℹ Comment jouer',
    params_fermer:'Fermer',
    // Infos (aide)
    info_titre:'ℹ COMMENT JOUER',
    info_body:'<b style="color:#ffd23d">But</b> — protège ton croiseur (barre de PV en bas) vague après vague jusqu\'au bout du secteur.<br><br>'
      +'<b style="color:#ffd23d">Ton tour</b> — touche un vaisseau, puis :<br>• tire sur une cible cerclée de rouge (ennemi, astéroïde, leurre) ;<br>• ou déplace-toi sur un point bleu.<br>Puis 1 action de croiseur : <span style="color:#37e0ff">VAISSEAU</span> · <span style="color:#37e0ff">TOURELLE</span> · <span style="color:#37e0ff">BOUCLIER</span>. Termine avec <b>FIN DU TOUR</b>.<br><br>'
      +'<b style="color:#ffd23d">Vaisseaux</b> — chaque ennemi détruit fait monter leur grade (• Recrue → ★ As). Le <span style="color:#ff8f92">Rouge</span> tire en zone (2 PV, +1 déplacement).<br><br>'
      +'<b style="color:#ffd23d">Menaces</b> — astéroïdes, débris, barrières, mines, gaz : détruis-les ou évite-les. Le <span style="color:#ff8f92">leurre</span> (contour rouge) imite un renfort : c\'est un piège.<br><br>'
      +'<b style="color:#ffd23d">Ultime</b> ⚡ — remplis la jauge en haut puis tape-la pour une frappe orbitale.<br><br>'
      +'<b style="color:#ffd23d">Raccourcis</b> — Espace : fin du tour · 1/2/3 : actions · U : ultime · Échap : annuler · P : pause',
    info_fermer:'Fermer',
    info_revoir_tuto:'🎓 Revoir le tutoriel',
    // Pause
    pause_continuer:'▶ Continuer',
    pause_recommencer:'↻ Recommencer',
    pause_options:'⚙ Options',
    pause_accueil:'🏠 Accueil',
    pause_hint:'P = pause · Échap = annuler l\'action',
    // Divers
    mission_continuer:'Continuer ▶',
    fin_rejouer:'↻ REJOUER',
  },
  en: {
    home_reprendre:'↻ RESUME',
    home_jouer:'▶ PLAY',
    home_params:'⚙ SETTINGS',
    home_ameliorations:'⚙ UPGRADES',
    diff_titre:'CHOOSE DIFFICULTY',
    diff_facile:'Easy',       diff_facile_d:'Tougher cruiser, fewer enemies. Great to learn.',
    diff_normal:'Normal',     diff_normal_d:'The balance the game intends.',
    diff_difficile:'Hard',    diff_difficile_d:'Fragile cruiser, many tough enemies.',
    diff_annuler:'Back',
    params_titre:'⚙ SETTINGS',
    params_infos:'ℹ How to play',
    params_fermer:'Close',
    info_titre:'ℹ HOW TO PLAY',
    info_body:'<b style="color:#ffd23d">Goal</b> — protect your cruiser (HP bar at the bottom) wave after wave to the end of the sector.<br><br>'
      +'<b style="color:#ffd23d">Your turn</b> — tap a ship, then:<br>• fire at a red-circled target (enemy, asteroid, decoy);<br>• or move to a blue dot.<br>Then 1 cruiser action: <span style="color:#37e0ff">SHIP</span> · <span style="color:#37e0ff">TURRET</span> · <span style="color:#37e0ff">SHIELD</span>. Finish with <b>END TURN</b>.<br><br>'
      +'<b style="color:#ffd23d">Ships</b> — each kill raises their rank (• Rookie → ★ Ace). The <span style="color:#ff8f92">Red</span> ship fires in an area (2 HP, +1 move).<br><br>'
      +'<b style="color:#ffd23d">Hazards</b> — asteroids, debris, barriers, mines, gas: destroy or avoid them. The <span style="color:#ff8f92">decoy</span> (red outline) mimics a reinforcement — it\'s a trap.<br><br>'
      +'<b style="color:#ffd23d">Ultimate</b> ⚡ — fill the gauge at the top then tap it for an orbital strike.<br><br>'
      +'<b style="color:#ffd23d">Shortcuts</b> — Space: end turn · 1/2/3: actions · U: ultimate · Esc: undo · P: pause',
    info_fermer:'Close',
    info_revoir_tuto:'🎓 Replay the tutorial',
    pause_continuer:'▶ Continue',
    pause_recommencer:'↻ Restart',
    pause_options:'⚙ Options',
    pause_accueil:'🏠 Home',
    pause_hint:'P = pause · Esc = undo action',
    mission_continuer:'Continue ▶',
    fin_rejouer:'↻ PLAY AGAIN',
  },
};

export function t(cle){
  const l = state.langue || 'fr';
  return (STRINGS[l] && STRINGS[l][cle]) || STRINGS.fr[cle] || cle;
}

const LANGUE_KEY = 'dc_langue';
export function chargerLangue(){
  try{ const l = localStorage.getItem(LANGUE_KEY); if(l && LANGUES.includes(l)) state.langue = l; }catch(e){}
  if(!state.langue) state.langue = 'fr';
}
export function definirLangue(l){
  if(!LANGUES.includes(l)) return;
  state.langue = l;
  try{ localStorage.setItem(LANGUE_KEY, l); }catch(e){}
  appliquerLangue();
}
export function langueSuivante(){
  const i = LANGUES.indexOf(state.langue || 'fr');
  definirLangue(LANGUES[(i + 1) % LANGUES.length]);
}

/* Applique la langue courante à tout le DOM balisé (data-i18n / data-i18n-html)
   et met à jour le libellé dynamique du bouton de langue. */
export function appliquerLangue(){
  document.querySelectorAll('[data-i18n]').forEach(el=>{ el.textContent = t(el.getAttribute('data-i18n')); });
  document.querySelectorAll('[data-i18n-html]').forEach(el=>{ el.innerHTML = t(el.getAttribute('data-i18n-html')); });
  const bl = document.getElementById('btnParamsLangue');
  if(bl) bl.textContent = '🌐 ' + (state.langue==='fr'?'Langue : ':'Language: ') + NOM_LANGUE[state.langue||'fr'];
  try{ document.documentElement.lang = state.langue || 'fr'; }catch(e){}
}
