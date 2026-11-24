// Offline cache for the 3D runner. Network first, cache only when offline.
// Bump CACHE whenever the file list changes.
const CACHE = 'runner-v8';
const FILES = [
  './',
  'index.html',
  'manifest.webmanifest',
  'vendor/three.module.min.js',
  'vendor/postprocessing.min.js',
  'vendor/GLTFLoader.js',
  'vendor/BufferGeometryUtils.js',
  'vendor/SkeletonUtils.js',
  'js/main.js',
  'js/config.js',
  'js/patterns.js',
  'js/courier.js',
  'js/courier-placeholder.js',
  'js/input.js',
  'js/v2/gfx.js',
  'js/v2/geo.js',
  'js/v2/mat.js',
  'js/v2/models.js',
  'js/v2/models2.js',
  'js/v2/world.js',
  'js/v2/entities.js',
  'js/v2/crowd.js',
  'js/v2/fx.js',
  'assets/courier.glb',
  'assets/crowd/crowd-anim.glb',
  'assets/crowd/person-k1.glb',
  'assets/crowd/person-m1.glb',
  'assets/crowd/person-m2.glb',
  'assets/crowd/person-o1.glb',
  'assets/crowd/person-w1.glb',
  'assets/crowd/person-w2.glb',
  'assets/tex/fabric.jpg',
  'assets/tex/floor_color.jpg',
  'assets/tex/marble.jpg',
  'assets/tex/metal.jpg',
  'assets/tex/oak.jpg',
  'assets/tex/plaster.jpg',
  'assets/tex/woodwall.jpg',
  'icons/icon-180.png',
  'icons/icon-192.png',
  'icons/icon-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES.map((f) => new Request(f, { cache: 'reload' })))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('runner-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(
    caches.open(CACHE).then(async (cache) => {
      // Network first (so a new version always shows up at once, never a mix of old and new files),
      // with the cache as the fallback when there is no connection.
      const fresh = await fetch(req, { cache: 'no-store' })
        .then((res) => {
          if (res && res.ok) cache.put(req, res.clone());
          return res;
        })
        .catch(() => null);
      if (fresh) return fresh;
      const cached = await cache.match(req, { ignoreSearch: true });
      return cached || (await cache.match('index.html')) || Response.error();
    })
  );
});
