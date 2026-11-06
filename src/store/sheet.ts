import { create } from 'zustand';

/** Global title detail sheet (HANDOVER §9.8): opens from anywhere. */
interface SheetState {
  titleId: number | null;
  openTitle: (id: number) => void;
  close: () => void;
}

export const useSheet = create<SheetState>((set) => ({
  titleId: null,
  openTitle: (id) => set({ titleId: id }),
  close: () => set({ titleId: null }),
}));
