/// <reference lib="webworker" />
// Reelrole service worker. Design goal: an update must ALWAYS be able to install, whatever state the
// phone's storage is in, and a launch while online must ALWAYS show the latest version.
//
// Why: builds up to M9 cached TMDB posters as opaque responses, which browsers count as ~7 MB each
// (117 posters ≈ 880 MB). Storage filled up, every new worker failed to install with QuotaExceededError,
// and installed apps stayed on an old build. So:
// - install writes nothing (cannot hit the quota) and deletes the legacy caches;
// - the app page is network-first (latest build every online launch; cached copy only when offline);
// - hashed assets / fonts / icons / catalogue are cached as they're used, and failed writes are ignored;
// - posters are never stored here: the browser's HTTP cache keeps them (TMDB sends max-age = 1 year).

export {};
declare const self: ServiceWorkerGlobalScope;

const APP = 'reelrole-app-v2';
const CATALOGUE = 'reelrole-catalogue-v2';
const KEEP = new Set([APP, CATALOGUE]);

const put = async (cacheName: string, key: Request | string, res: Response) => {
  try {
    const c = await caches.open(cacheName);
    await c.put(key, res);
  } catch {
    /* full or unavailable storage: serving still works, we just don't cache */
  }
};

self.addEventListener('install', (event) => {
  void self.skipWaiting();
  event.waitUntil(caches.delete('tmdb-images').then(() => undefined));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      for (const k of await caches.keys()) if (!KEEP.has(k)) await caches.delete(k); // old precache, poster cache, etc.
      await self.clients.claim();
    })(),
  );
});

async function appPage(req: Request): Promise<Response> {
  try {
    const res = await fetch(req, { cache: 'no-store' });
    if (res.ok) void put(APP, '/index.html', res.clone());
    return res;
  } catch {
    return (await caches.match('/index.html', { cacheName: APP })) ?? Response.error();
  }
}

async function cacheFirst(req: Request, cacheName: string): Promise<Response> {
  const hit = await caches.match(req, { cacheName });
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok && res.type === 'basic') void put(cacheName, req, res.clone());
  return res;
}

async function staleWhileRevalidate(req: Request, cacheName: string): Promise<Response> {
  const hit = await caches.match(req, { cacheName });
  const fresh = fetch(req)
    .then((res) => {
      if (res.ok && res.type === 'basic') void put(cacheName, req, res.clone());
      return res;
    })
    .catch(() => undefined);
  return hit ?? (await fresh) ?? Response.error();
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // TMDB, Supabase, YouTube: straight to the network / HTTP cache

  if (req.mode === 'navigate') return event.respondWith(appPage(req));
  if (url.pathname.startsWith('/catalogue/')) return event.respondWith(staleWhileRevalidate(req, CATALOGUE));
  if (url.pathname.startsWith('/assets/') || url.pathname.startsWith('/icons/') || url.pathname === '/manifest.webmanifest')
    return event.respondWith(cacheFirst(req, APP));
});
