import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DEFAULT_FILTERS, type RollFilters } from './pool';

interface RollState {
  filters: RollFilters;
  /** Title ids of recent rolls (never repeat within 30). */
  recent: number[];
  setFilters: (f: Partial<RollFilters>) => void;
  pushRecent: (id: number) => void;
}

export const useRoll = create<RollState>()(
  persist(
    (set) => ({
      filters: DEFAULT_FILTERS,
      recent: [],
      setFilters: (f) => set((s) => ({ filters: { ...s.filters, ...f } })),
      pushRecent: (id) => set((s) => ({ recent: [...s.recent.filter((x) => x !== id), id].slice(-30) })),
    }),
    { name: 'reelrole.roll.v1' },
  ),
);
