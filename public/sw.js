// Cadence Service Worker — PWA Share Target handler
const SHARE_CACHE_NAME = 'cadence-share-v1';
const SHARED_FILE_KEY = '/__cadence_shared_route_file__';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

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
  }
});
