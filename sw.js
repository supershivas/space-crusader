/* Service worker — Défense du Croiseur
   Stratégie : "app shell" mise en cache à l'installation, puis
   cache-first avec repli réseau. Le jeu devient jouable hors-ligne
   et installable. Incrémente CACHE à chaque nouvelle version. */
const CACHE = 'croiseur-v23';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './icon-512-maskable.png',
  './src/config.js',
  './src/sprites.js',
  './src/audio.js',
  './src/state.js',
  './src/entities.js',
  './src/combat.js',
  './src/map.js',
  './src/ui.js',
  './src/render.js',
  './src/main.js',
  './src/tuto.js'
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
    caches.match(e.request).then(hit => {
      if (hit) return hit;
      return fetch(e.request).then(resp => {
        // met en cache au passage (utile pour la police Google si dispo)
        const copy = resp.clone();
        caches.open(CACHE).then(c => { try { c.put(e.request, copy); } catch (_) {} });
        return resp;
      }).catch(() => caches.match('./index.html')); // repli hors-ligne
    })
  );
});
