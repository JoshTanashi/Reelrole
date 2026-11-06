/**
 * Keep the installed app fresh (iOS home-screen PWAs otherwise sit on an old cached build).
 * - Checks for a new version on launch, every time the app returns to the foreground, and every 30 min.
 * - The service worker skips waiting + claims clients, so when a new version takes control while the app
 *   is open we reload once. A Find round in progress resumes from its snapshot, so nothing is lost.
 */
export function setupPWA() {
  if (!('serviceWorker' in navigator) || import.meta.env.DEV) return;
  const hadController = !!navigator.serviceWorker.controller; // false on the very first install: no reload then
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController || reloading) return;
    reloading = true;
    window.location.reload();
  });
  navigator.serviceWorker
    .register('/sw.js', { scope: '/' })
    .then((reg) => {
      const check = () => {
        if (navigator.onLine === false) return;
        reg.update().catch(() => {});
        void checkForNewBuild();
      };
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') check();
      });
      window.setInterval(check, 30 * 60 * 1000);
    })
    .catch(() => {});
}

/** The JS bundle this page is running (content-hashed by Vite). */
const runningBundle = () => (document.querySelector('script[type="module"][src*="/assets/index-"]') as HTMLScriptElement | null)?.getAttribute('src') ?? '';
let lastCheck = 0;

/**
 * iOS home-screen apps often *resume* instead of relaunching, so a new deploy would wait until the app is
 * killed. When the app comes back to the foreground, ask the server which bundle is live and reload if it
 * changed. (A Find round in progress resumes from its snapshot.)
 */
async function checkForNewBuild() {
  if (Date.now() - lastCheck < 60_000) return;
  lastCheck = Date.now();
  try {
    const html = await fetch('/', { cache: 'no-store' }).then((r) => r.text());
    const live = /\/assets\/index-[\w-]+\.js/.exec(html)?.[0];
    const mine = runningBundle();
    if (live && mine && !mine.endsWith(live)) window.location.reload();
  } catch {
    /* offline: try next time */
  }
}

export const BUILD_ID = ((import.meta.env.VITE_BUILD_ID as string | undefined) || 'dev').slice(0, 7);
(globalThis as { __REELROLE_BUILD__?: string }).__REELROLE_BUILD__ = BUILD_ID;
