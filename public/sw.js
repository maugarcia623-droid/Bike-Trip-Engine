// Cadence Service Worker — App Shell, Map Tiles, Offline Prefetch & Share Target
const SHARE_CACHE_NAME = 'cadence-share-v1';
const SHELL_CACHE_NAME = 'cadence-shell-v1';
const TILE_CACHE_NAME = 'cadence-tiles-v1';
const SHARED_FILE_KEY = '/__cadence_shared_route_file__';
const MAX_CACHED_TILES = 300;

const TILE_HOSTS = [
  'tile.openstreetmap.org',
  'basemaps.cartocdn.com',
  'tile.opentopomap.org',
];

function isTileRequest(url) {
  return TILE_HOSTS.some((host) => url.hostname === host || url.hostname.endsWith(`.${host}`));
}

function isStaticShellAsset(url) {
  if (url.origin !== self.location.origin) return false;
  return (
    url.pathname.startsWith('/assets/') ||
    url.pathname === '/manifest.json' ||
    url.pathname === '/site.webmanifest' ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.ico') ||
    url.pathname.endsWith('.woff2') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.js')
  );
}

async function trimTileCache() {
  try {
    const cache = await caches.open(TILE_CACHE_NAME);
    const keys = await cache.keys();
    if (keys.length > MAX_CACHED_TILES) {
      const toDelete = keys.slice(0, keys.length - MAX_CACHED_TILES);
      await Promise.all(toDelete.map((req) => cache.delete(req)));
    }
  } catch {
    // Ignore cache trim errors
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE_NAME)
      .then((cache) => cache.addAll(['/', '/index.html', '/manifest.json']).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter(
              (k) =>
                k !== SHARE_CACHE_NAME &&
                k !== SHELL_CACHE_NAME &&
                k !== TILE_CACHE_NAME
            )
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  const data = event.data;
  if (!data || typeof data !== 'object') return;

  if (data.type === 'SKIP_WAITING') {
    self.skipWaiting();
    return;
  }

  if (data.type === 'PREFETCH_TILES' && Array.isArray(data.urls)) {
    const urls = data.urls.slice(0, 60).filter((u) => typeof u === 'string');
    event.waitUntil(
      (async () => {
        const cache = await caches.open(TILE_CACHE_NAME);
        for (let i = 0; i < urls.length; i += 4) {
          const batch = urls.slice(i, i + 4);
          await Promise.all(
            batch.map(async (tileUrl) => {
              try {
                const existing = await cache.match(tileUrl);
                if (existing) return;
                const res = await fetch(tileUrl, { mode: 'cors' });
                if (res && res.ok) {
                  await cache.put(tileUrl, res);
                }
              } catch {
                // Ignore individual tile fetch failures
              }
            })
          );
        }
        await trimTileCache();
      })()
    );
  }
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 1. PWA Share Target POST handler
  if (url.pathname === '/share-target' && event.request.method === 'POST') {
    event.respondWith(
      (async () => {
        try {
          const formData = await event.request.formData();
          const file = formData.get('route_file');
          const sharedUrl = String(formData.get('shared_url') || '').trim();
          const sharedText = String(formData.get('shared_text') || '').trim();

          if (file && typeof file === 'object' && 'arrayBuffer' in file && file.size > 0) {
            const cache = await caches.open(SHARE_CACHE_NAME);
            const buffer = await file.arrayBuffer();
            const fileName = encodeURIComponent(file.name || 'shared-route.gpx');
            await cache.put(
              SHARED_FILE_KEY,
              new Response(buffer, {
                headers: {
                  'Content-Type': file.type || 'application/octet-stream',
                  'X-Share-Filename': fileName,
                },
              })
            );
            return Response.redirect('/?shared_file=1', 303);
          }

          const params = new URLSearchParams();
          if (sharedUrl) params.set('shared_url', sharedUrl);
          if (sharedText) params.set('shared_text', sharedText);
          const qs = params.toString();
          return Response.redirect(qs ? `/?${qs}` : '/', 303);
        } catch {
          return Response.redirect('/', 303);
        }
      })()
    );
    return;
  }

  if (event.request.method !== 'GET') return;

  // 2. Navigation requests: Network-first with cached shell fallback
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(SHELL_CACHE_NAME).then((cache) => cache.put('/index.html', copy)).catch(() => {});
          }
          return res;
        })
        .catch(async () => {
          const cached =
            (await caches.match(event.request)) ||
            (await caches.match('/index.html')) ||
            (await caches.match('/'));
          return cached || Response.error();
        })
    );
    return;
  }

  // 3. Same-origin static assets: Cache-first with network fill
  if (isStaticShellAsset(url)) {
    event.respondWith(
      caches.open(SHELL_CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(event.request);
        if (cached) return cached;
        const res = await fetch(event.request);
        if (res && res.ok) {
          cache.put(event.request, res.clone()).catch(() => {});
        }
        return res;
      })
    );
    return;
  }

  // 4. Map tiles: Cache-first with background refresh
  if (isTileRequest(url)) {
    event.respondWith(
      caches.open(TILE_CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(event.request);
        if (cached) return cached;
        try {
          const res = await fetch(event.request);
          if (res && res.ok) {
            cache.put(event.request, res.clone()).then(() => trimTileCache()).catch(() => {});
          }
          return res;
        } catch {
          return cached || Response.error();
        }
      })
    );
  }
});
