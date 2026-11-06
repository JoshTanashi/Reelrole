import { create } from 'zustand';

export type Tab = 'find' | 'swipe' | 'roll' | 'library';
export const TABS: Tab[] = ['find', 'swipe', 'roll', 'library'];

interface NavState {
  tab: Tab;
  tabBarHidden: boolean;
  /** Bumped when the active tab is tapped again → screen scrolls to top / resets. */
  reset: Record<Tab, number>;
  setTab: (t: Tab) => void;
  setTabBarHidden: (h: boolean) => void;
}

export const useNav = create<NavState>((set, get) => ({
  tab: 'find',
  tabBarHidden: false,
  reset: { find: 0, swipe: 0, roll: 0, library: 0 },
  setTab: (t) => {
    const s = get();
    if (s.tab === t) set({ reset: { ...s.reset, [t]: s.reset[t] + 1 }, tabBarHidden: false });
    else set({ tab: t, tabBarHidden: false });
  },
  setTabBarHidden: (h) => get().tabBarHidden !== h && set({ tabBarHidden: h }),
}));
