import { create } from 'zustand';

/** HANDOVER §5.2 mood palettes for the living background. */
export const MOODS = {
  brand: ['#FF2E4D', '#E81CFF', '#6A3BFF'],
  horror: ['#8B0012', '#FF2E4D', '#1A0005'],
  romance: ['#FF7AA2', '#FFC2A8', '#B83280'],
  scifi: ['#00E5FF', '#6A3BFF', '#0A1A3F'],
  comedy: ['#FFD23F', '#FF7A00', '#FF2E8A'],
  drama: ['#C77DFF', '#3C096C', '#FF9E7A'],
  action: ['#FF5400', '#FFBD00', '#390099'],
  fantasy: ['#7CFFCB', '#74F2CE', '#8E7DFF'],
  crime: ['#2EC4B6', '#011627', '#E71D36'],
  documentary: ['#E9ECEF', '#ADB5BD', '#3D5A80'],
} as const;
export type Mood = keyof typeof MOODS;

interface MoodState {
  mood: Mood;
  /** 0..1 — how loud the background is. Netflix-feel default keeps it low. */
  intensity: number;
  setMood: (m: Mood, intensity?: number) => void;
}

export const useMood = create<MoodState>((set) => ({
  mood: 'brand',
  intensity: 0.55,
  setMood: (mood, intensity) => set((s) => ({ mood, intensity: intensity ?? s.intensity })),
}));
