import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { idbStorage } from './idbStorage';

export interface UserTitle {
  onList: boolean;
  /** true = liked, false = disliked, null = no opinion */
  liked: boolean | null;
  watched: boolean;
  watchedAt: number | null;
  myRating: number | null; // 1..5
  notForMe: boolean;
  updatedAt: number;
}

const blank = (): UserTitle => ({ onList: false, liked: null, watched: false, watchedAt: null, myRating: null, notForMe: false, updatedAt: 0 });

interface LibraryState {
  items: Record<number, UserTitle>;
  hydrated: boolean;
  get: (id: number) => UserTitle;
  toggleList: (id: number) => boolean;
  toggleLike: (id: number) => boolean;
  setWatched: (id: number, watched: boolean, rating?: number | null) => void;
  setRating: (id: number, rating: number | null) => void;
  toggleNotForMe: (id: number) => boolean;
  clear: () => void;
}

export const useLibrary = create<LibraryState>()(
  persist(
    (set, get) => {
      const patch = (id: number, p: Partial<UserTitle>) =>
        set((s) => ({ items: { ...s.items, [id]: { ...(s.items[id] ?? blank()), ...p, updatedAt: Date.now() } } }));
      return {
        items: {},
        hydrated: false,
        get: (id) => get().items[id] ?? blank(),
        toggleList: (id) => {
          const on = !get().get(id).onList;
          patch(id, on ? { onList: true, notForMe: false } : { onList: false });
          return on;
        },
        toggleLike: (id) => {
          const on = get().get(id).liked !== true;
          patch(id, on ? { liked: true, notForMe: false } : { liked: null });
          return on;
        },
        setWatched: (id, watched, rating) =>
          patch(id, { watched, watchedAt: watched ? Date.now() : null, ...(rating !== undefined ? { myRating: rating } : {}) }),
        setRating: (id, rating) => patch(id, { myRating: rating, ...(rating && rating >= 4 ? { liked: true } : {}) }),
        toggleNotForMe: (id) => {
          const on = !get().get(id).notForMe;
          patch(id, on ? { notForMe: true, onList: false, liked: get().get(id).liked === true ? null : get().get(id).liked } : { notForMe: false });
          return on;
        },
        clear: () => set({ items: {} }),
      };
    },
    {
      name: 'reelrole.library.v1',
      storage: createJSONStorage(() => idbStorage),
      partialize: (s) => ({ items: s.items }),
      onRehydrateStorage: () => () => useLibrary.setState({ hydrated: true }),
    },
  ),
);

export type Segment = 'list' | 'liked' | 'watched' | 'nope';
export const inSegment = (u: UserTitle, seg: Segment) =>
  seg === 'list' ? u.onList : seg === 'liked' ? u.liked === true : seg === 'watched' ? u.watched : u.notForMe;
