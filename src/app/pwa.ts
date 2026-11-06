import { registerSW } from 'virtual:pwa-register';

/**
 * Keep the installed app fresh (iOS home-screen PWAs otherwise sit on an old cached build).
 * - Checks for a new version on launch, every time the app comes back to the foreground, and every 30 min.
 * - registerType 'autoUpdate': once the new version has downloaded and taken over, the page reloads itself.
 *   A Find round in progress resumes from its snapshot, so nothing is lost.
 */
export function setupPWA() {
  if (!('serviceWorker' in navigator)) return;
  registerSW({
    immediate: true,
    onRegisteredSW(_url, reg) {
      if (!reg) return;
      const check = () => {
        if (navigator.onLine === false) return;
        reg.update().catch(() => {});
      };
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') check();
      });
      window.setInterval(check, 30 * 60 * 1000);
      check();
    },
  });
}

export const BUILD_ID = ((import.meta.env.VITE_BUILD_ID as string | undefined) || 'dev').slice(0, 7);
(globalThis as { __REELROLE_BUILD__?: string }).__REELROLE_BUILD__ = BUILD_ID;
