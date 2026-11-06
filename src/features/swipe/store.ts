import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DEFAULT_SWIPE_FILTERS, type SwipeFilters } from './feed';

export type Dir = 'right' | 'left' | 'up';

interface SwipeState {
  swiped: number[]; // title ids
  count: number;
  filters: SwipeFilters;
  /** Raw log for the learning loop (M9 syncs it). */
  log: { id: number; dir: Dir; at: number }[];
  record: (id: number, dir: Dir) => void;
  unrecord: (id: number) => void;
  setFilters: (f: Partial<SwipeFilters>) => void;
}

export const useSwipe = create<SwipeState>()(
  persist(
    (set) => ({
      swiped: [],
      count: 0,
      filters: DEFAULT_SWIPE_FILTERS,
      log: [],
      record: (id, dir) =>
        set((s) => ({ swiped: [...s.swiped, id], count: s.count + 1, log: [...s.log, { id, dir, at: Date.now() }].slice(-2000) })),
      unrecord: (id) =>
        set((s) => {
          const at = s.swiped.lastIndexOf(id);
          const swiped = at >= 0 ? [...s.swiped.slice(0, at), ...s.swiped.slice(at + 1)] : s.swiped;
          const li = s.log.map((l) => l.id).lastIndexOf(id);
          const log = li >= 0 ? [...s.log.slice(0, li), ...s.log.slice(li + 1)] : s.log;
          return { swiped, log, count: Math.max(0, s.count - 1) };
        }),
      setFilters: (f) => set((s) => ({ filters: { ...s.filters, ...f } })),
    }),
    { name: 'reelrole.swipe.v1' },
  ),
);
