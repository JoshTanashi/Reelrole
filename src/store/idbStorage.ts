import { get, set, del } from 'idb-keyval';
import type { StateStorage } from 'zustand/middleware';

/** Zustand persist adapter over IndexedDB (HANDOVER §7.5: local-first). Never throws. */
export const idbStorage: StateStorage = {
  getItem: async (name) => {
    try {
      return (await get<string>(name)) ?? null;
    } catch {
      return null;
    }
  },
  setItem: async (name, value) => {
    try {
      await set(name, value);
    } catch {
      /* storage blocked: library stays in memory for this session */
    }
  },
  removeItem: async (name) => {
    try {
      await del(name);
    } catch {
      /* ignore */
    }
  },
};
