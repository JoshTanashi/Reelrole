import { useEffect } from 'react';
import { MotionConfig, motion, useTransform } from 'motion/react';
import { usePrefs } from '../store/prefs';
import { useSheet } from '../store/sheet';
import { MeshGradient } from '../design/MeshGradient';
import { Grain } from '../design/Grain';
import { useMood, type Mood } from '../design/moods';
import { TabBar } from '../nav/TabBar';
import { sheetProgress } from '../nav/sheetProgress';
import { useNav, type Tab } from '../store/nav';
import { FindScreen } from '../features/find/FindScreen';
import { SwipeScreen } from '../features/swipe/SwipeScreen';
import { RollScreen } from '../features/roll/RollScreen';
import { LibraryScreen } from '../features/library/LibraryScreen';
import { TitleSheetHost } from '../features/title/TitleSheet';
import { Sting } from './Sting';

/** Each tab tints the living background; Find will take over mood per answer in M7. */
const TAB_MOOD: Record<Tab, [Mood, number]> = {
  find: ['brand', 0.6],
  swipe: ['romance', 0.45],
  roll: ['comedy', 0.5],
  library: ['drama', 0.35],
};

export function App() {
  const tab = useNav((s) => s.tab);
  const setMood = useMood((s) => s.setMood);
  useEffect(() => setMood(...TAB_MOOD[tab]), [tab, setMood]);

  // iOS card-modal: the app recedes behind an open sheet.
  const scale = useTransform(sheetProgress, [0, 1], [1, 0.94]);
  const radius = useTransform(sheetProgress, [0, 0.05, 1], [0, 18, 28]);
  const dim = useTransform(sheetProgress, [0, 1], [0, 0.35]);

  const reducedMotion = usePrefs((s) => s.reducedMotion);
  const sheetOpen = useSheet((s) => s.titleId !== null);

  return (
    <MotionConfig reducedMotion={reducedMotion ? 'always' : 'user'}>
    <div className="fixed inset-0 overflow-hidden bg-black">
      <motion.div className="absolute inset-0 overflow-hidden" style={{ scale, borderRadius: radius }} aria-hidden={sheetOpen || undefined}>
        <MeshGradient />
        <main className="absolute inset-0">
          <FindScreen />
          <SwipeScreen />
          <RollScreen />
          <LibraryScreen />
        </main>
        <TabBar />
        <motion.div className="pointer-events-none absolute inset-0 z-40 bg-black" style={{ opacity: dim }} />
      </motion.div>
      <TitleSheetHost />
      <Grain />
      <Sting />
    </div>
    </MotionConfig>
  );
}
