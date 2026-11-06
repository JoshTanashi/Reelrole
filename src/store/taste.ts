import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Catalogue } from '../data/catalogue';
import { normalised } from '../data/similar';

/**
 * Running taste vector (HANDOVER §8.1 taste_sim): a weighted sum of the mean-centred,
 * normalised trait vectors of titles the user reacted to. Positive weights pull toward,
 * negative push away. taste_sim(t) = cosine(taste, title) in [-1, 1].
 */
export const SIGNAL = {
  swipeRight: 1.0,
  swipeLeft: -0.35,
  seenLoved: 0.9,
  seenFine: 0.2,
  seenHated: -0.7,
  like: 0.6,
  list: 0.5,
  notForMe: -0.8,
  onboardingPick: 1.0,
} as const;

interface TasteState {
  vec: number[]; // length K (catalogue traitKeys order)
  version: string; // catalogue version the vector was built against
  signals: number;
  add: (cat: Catalogue, index: number, weight: number) => void;
  reset: () => void;
}

export const useTaste = create<TasteState>()(
  persist(
    (set, get) => ({
      vec: [],
      version: '',
      signals: 0,
      add: (cat, index, weight) => {
        const K = cat.traitKeys.length;
        const v = normalised(cat);
        const s = get();
        const base = s.version === cat.version && s.vec.length === K ? [...s.vec] : new Array<number>(K).fill(0);
        for (let k = 0; k < K; k++) base[k]! += weight * v[index * K + k]!;
        set({ vec: base, version: cat.version, signals: s.signals + (weight > 0 ? 1 : 0) });
      },
      reset: () => set({ vec: [], version: '', signals: 0 }),
    }),
    { name: 'reelrole.taste.v1' },
  ),
);

/** Returns a fast taste_sim(index) for the current vector, or null if there's no taste yet. */
export function tasteSimFn(cat: Catalogue, vec: number[]): ((i: number) => number) | null {
  const K = cat.traitKeys.length;
  if (vec.length !== K) return null;
  const norm = Math.sqrt(vec.reduce((a, x) => a + x * x, 0));
  if (norm < 1e-6) return null;
  const u = vec.map((x) => x / norm);
  const v = normalised(cat);
  return (i: number) => {
    let s = 0;
    for (let k = 0; k < K; k++) s += u[k]! * v[i * K + k]!;
    return s;
  };
}
