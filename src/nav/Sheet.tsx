import { useEffect, useState, type ReactNode } from 'react';
import { AnimatePresence, animate, motion, useDragControls, useMotionValue, useReducedMotion, useTransform } from 'motion/react';
import { springGentle } from '../design/motion';
import { haptics } from '../haptics/haptics';
import { sheetProgress } from './sheetProgress';

/** Visible fraction of the viewport for each detent (HANDOVER §6.2: 40% / 88% / full). */
export const DETENTS = [0.4, 0.88, 1] as const;

interface SheetProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  /** Index into DETENTS to open at. */
  initial?: number;
  /** Bubbles the 0..1 "how open" progress so the app behind can scale. */
  onProgress?: (p: number) => void;
  label?: string;
}

const vh = () => (typeof window === 'undefined' ? 844 : window.innerHeight);

export function Sheet(props: SheetProps) {
  return <AnimatePresence>{props.open && <SheetBody key="sheet" {...props} />}</AnimatePresence>;
}

function SheetBody({ onClose, children, initial = 1, onProgress, label = 'Details' }: SheetProps) {
  const reduce = useReducedMotion();
  const H = vh();
  const yFor = (d: number) => H * (1 - d);
  const y = useMotionValue(H);
  const controls = useDragControls();
  const [detent, setDetent] = useState(initial);
  const backdrop = useTransform(y, [yFor(1), H], [0.62, 0]);

  useEffect(() => {
    const unsub = y.on('change', (v) => {
      const p = Math.min(1, Math.max(0, 1 - (v - yFor(DETENTS[1])) / (H - yFor(DETENTS[1]))));
      sheetProgress.set(p);
      onProgress?.(p);
    });
    const a = animate(y, yFor(DETENTS[initial]!), reduce ? { duration: 0.2 } : springGentle);
    return () => {
      unsub();
      a.stop();
      sheetProgress.set(0);
      onProgress?.(0);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const settle = (to: number | 'close') => {
    if (to === 'close') {
      animate(y, H, reduce ? { duration: 0.18 } : { ...springGentle, velocity: y.getVelocity() }).then(onClose);
      return;
    }
    if (to !== detent) haptics.selection();
    setDetent(to);
    animate(y, yFor(DETENTS[to]!), reduce ? { duration: 0.18 } : { ...springGentle, velocity: y.getVelocity() });
  };

  return (
    <motion.div className="fixed inset-0 z-50" role="dialog" aria-modal aria-label={label} exit={{ opacity: 1 }}>
      <motion.div className="absolute inset-0 bg-black" style={{ opacity: backdrop }} onClick={() => settle('close')} />
      <motion.div
        className="absolute inset-x-0 bottom-0 flex h-[100dvh] flex-col overflow-hidden rounded-t-sheet bg-bg-1 shadow-[0_-20px_60px_rgba(0,0,0,0.6)]"
        style={{ y }}
        drag="y"
        dragListener={false}
        dragControls={controls}
        dragConstraints={{ top: 0, bottom: H }}
        dragElastic={{ top: 0.04, bottom: 0.6 }}
        dragMomentum={false}
        onDragEnd={(_, info) => {
          const projected = y.get() + info.velocity.y * 0.18;
          if (info.velocity.y > 900 || projected > yFor(DETENTS[0]) + 90) return settle('close');
          let best = 0;
          DETENTS.forEach((d, i) => {
            if (Math.abs(yFor(d) - projected) < Math.abs(yFor(DETENTS[best]!) - projected)) best = i;
          });
          settle(best);
        }}
      >
        {/* Drag zone: handle + whatever the content marks with data-sheet-drag */}
        <div
          className="absolute inset-x-0 top-0 z-20 flex h-7 touch-none justify-center pt-2"
          onPointerDown={(e) => controls.start(e)}
        >
          <div className="h-[5px] w-10 rounded-full bg-white/30" />
        </div>
        <div
          className="no-scrollbar relative flex-1 overflow-y-auto overscroll-contain"
          style={{ paddingBottom: `calc(var(--sab) + ${H * (1 - DETENTS[detent]!)}px + 24px)` }}
          onPointerDown={(e) => {
            const target = e.target as HTMLElement;
            if (target.closest('[data-sheet-drag]')) controls.start(e);
          }}
        >
          {children}
        </div>
      </motion.div>
    </motion.div>
  );
}
