/* Service worker — Défense du Croiseur
   Stratégie : "app shell" mise en cache à l'installation, puis réseau
   d'abord avec repli sur le cache (network-first). Le jeu reste jouable
   hors-ligne et installable, mais un joueur en ligne récupère toujours
   la dernière version au prochain chargement — sans ça, un cache-first
   pouvait servir indéfiniment une version périmée sur certains navigateurs
   (Safari/Firefox mobile) même après un rechargement normal.
   Incrémente CACHE à chaque nouvelle version. */
const CACHE = 'croiseur-v64';
const ASSETS = [
  './',
  './index.html',
  './theme.css',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './icon-512-maskable.png',
  './fonts/PressStart2P.woff2',
  './src/config.js',
  './src/i18n.js',
  './src/sprites.js',
  './src/audio.js',
  './src/state.js',
  './src/entities.js',
  './src/combat.js',
  './src/map.js',
  './src/ui.js',
  './src/render.js',
  './src/main.js',
  './src/tuto.js',
  './src/version.js'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request).then(resp => {
      // réseau disponible : toujours la version la plus fraîche, et on la met en cache au passage
      const copy = resp.clone();
      caches.open(CACHE).then(c => { try { c.put(e.request, copy); } catch (_) {} });
      return resp;
    }).catch(() =>
      // hors-ligne : on retombe sur le cache (app shell installé), sinon sur la page d'accueil
      caches.match(e.request).then(hit => hit || caches.match('./index.html'))
    )
  );
});
