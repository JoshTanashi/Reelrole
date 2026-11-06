/// <reference lib="webworker" />
// Custom service worker (injectManifest). Keeps the app shell + catalogue offline and updates reliably.
import { PrecacheController, PrecacheRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';
import { StaleWhileRevalidate } from 'workbox-strategies';

declare const self: ServiceWorkerGlobalScope & { __WB_MANIFEST: Array<{ url: string; revision: string | null }> };

// Builds up to M9 cached TMDB posters here as *opaque* responses. Browsers count each of those as several MB,
// so the quota filled up and every later update failed to install (phones got stuck on an old version).
// Posters now rely on the browser's HTTP cache (TMDB sends max-age = 1 year), so this cache must go.
const LEGACY_CACHES = ['tmdb-images'];

const precache = new PrecacheController();
precache.addToCacheList(self.__WB_MANIFEST);

self.addEventListener('install', (event) => {
  void self.skipWaiting();
  event.waitUntil(
    (async () => {
      await Promise.all(LEGACY_CACHES.map((c) => caches.delete(c))); // free the quota *before* precaching
      await precache.install(event);
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      await precache.activate(event);
      await Promise.all(LEGACY_CACHES.map((c) => caches.delete(c)));
      await self.clients.claim();
    })(),
  );
});

cleanupOutdatedCaches();
registerRoute(new PrecacheRoute(precache));
registerRoute(new NavigationRoute(precache.createHandlerBoundToURL('/index.html')));
// Catalogue: instant from cache, refreshed in the background. Same-origin + small, so no quota risk.
registerRoute(({ url }) => url.origin === self.location.origin && url.pathname.startsWith('/catalogue/'), new StaleWhileRevalidate({ cacheName: 'catalogue' }));
