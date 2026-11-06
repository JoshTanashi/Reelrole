import { useCallback, useEffect, useRef, useState } from 'react';

type Perm = 'unsupported' | 'needs-permission' | 'granted' | 'denied';

/** Shake-to-roll (HANDOVER §9.6). iOS needs a permission tap first. */
export function useShake(onShake: () => void, enabled: boolean) {
  const [perm, setPerm] = useState<Perm>(() => {
    if (typeof window === 'undefined' || typeof DeviceMotionEvent === 'undefined') return 'unsupported';
    const D = DeviceMotionEvent as unknown as { requestPermission?: () => Promise<string> };
    return typeof D.requestPermission === 'function' ? 'needs-permission' : 'granted';
  });
  const cb = useRef(onShake);
  cb.current = onShake;
  const last = useRef({ x: 0, y: 0, z: 0, t: 0, fired: 0 });

  const request = useCallback(async () => {
    const D = DeviceMotionEvent as unknown as { requestPermission?: () => Promise<string> };
    try {
      const r = await D.requestPermission?.();
      setPerm(r === 'granted' ? 'granted' : 'denied');
    } catch {
      setPerm('denied');
    }
  }, []);

  useEffect(() => {
    if (perm !== 'granted' || !enabled) return;
    const on = (e: DeviceMotionEvent) => {
      const a = e.accelerationIncludingGravity;
      if (!a || a.x === null || a.y === null || a.z === null) return;
      const L = last.current;
      const now = performance.now();
      const delta = Math.abs(a.x - L.x) + Math.abs(a.y - L.y) + Math.abs(a.z - L.z);
      L.x = a.x;
      L.y = a.y;
      L.z = a.z;
      if (L.t && delta > 32 && now - L.fired > 1400) {
        L.fired = now;
        cb.current();
      }
      L.t = now;
    };
    window.addEventListener('devicemotion', on);
    return () => window.removeEventListener('devicemotion', on);
  }, [perm, enabled]);

  return { perm, request };
}
