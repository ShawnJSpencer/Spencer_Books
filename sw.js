// Spencer Library service worker: opens offline, picks up updates automatically.
const CACHE = 'sbooks-v16';
const SHELL = ['./', 'index.html', 'app.js', 'scanner.js', 'config.js', 'manifest.webmanifest', 'icons/icon-180.png', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-32.png'];

self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
// App files: network first (so updates arrive), cache as fallback. Fonts, libraries, covers: cache first.
self.addEventListener('fetch', e => {
  const req = e.request; if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (/firestore|identitytoolkit|securetoken|googleapis\.com\/books|openlibrary\.org\/(api|search)/.test(url.href)) return;   // live data
  if (url.origin === location.origin) {
    e.respondWith(fetch(req).then(r => { if (r.ok) { const cp = r.clone(); caches.open(CACHE).then(c => c.put(req, cp)); } return r; })
      .catch(() => caches.match(req, { ignoreSearch: true }).then(r => r || caches.match('index.html'))));
  } else if (req.destination === 'image' || /fonts\.(googleapis|gstatic)|unpkg\.com|jsdelivr\.net|gstatic\.com\/firebasejs/.test(url.href)) {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(r => { if (r.ok || r.type === 'opaque') { const cp = r.clone(); caches.open(CACHE).then(c => c.put(req, cp)); } return r; })));
  }
});
