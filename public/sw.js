const CACHE_NAME = 'conecta-pontos-v1';

self.addEventListener('install', (event) => {
  // Activate immediately
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Claim clients immediately so the new SW takes control
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  // For API requests, try network first, then cache
  // For other requests, you could use cache-first
  // This is a minimal implementation to satisfy PWA requirements
  event.respondWith(
    fetch(event.request).catch(() => {
      // Offline fallback can be implemented here
      return new Response('You are currently offline.');
    })
  );
});
