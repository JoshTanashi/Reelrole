import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { setHapticsEnabled } from '../haptics/haptics';

interface Prefs {
  sound: boolean;
  haptics: boolean;
  reducedMotion: boolean;
  set: (p: Partial<Omit<Prefs, 'set'>>) => void;
}

export const usePrefs = create<Prefs>()(
  persist(
    (set) => ({
      sound: true,
      haptics: true,
      reducedMotion: false,
      set: (p) => {
        if (p.haptics !== undefined) setHapticsEnabled(p.haptics);
        set(p);
      },
    }),
    {
      name: 'reelrole.prefs.v1',
      onRehydrateStorage: () => (s) => s && setHapticsEnabled(s.haptics),
    },
  ),
);
