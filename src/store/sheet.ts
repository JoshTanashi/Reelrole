import { create } from 'zustand';

export interface Rect { x: number; y: number; w: number; h: number }

/** Global title detail sheet (HANDOVER §9.8): opens from anywhere. */
interface SheetState {
  titleId: number | null;
  /** Where the tapped poster was, for the poster → sheet flight. */
  origin: Rect | null;
  flying: boolean;
  openTitle: (id: number, from?: Element | null) => void;
  landed: () => void;
  close: () => void;
}

export const useSheet = create<SheetState>((set, get) => ({
  titleId: null,
  origin: null,
  flying: false,
  openTitle: (id, from) => {
    const r = from?.getBoundingClientRect();
    // Only fly when opening fresh (not when hopping between titles inside the sheet).
    const origin = r && get().titleId === null ? { x: r.left, y: r.top, w: r.width, h: r.height } : null;
    set({ titleId: id, origin, flying: !!origin });
  },
  landed: () => set({ flying: false, origin: null }),
  close: () => set({ titleId: null, origin: null, flying: false }),
}));
