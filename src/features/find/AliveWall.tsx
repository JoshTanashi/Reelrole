import { AnimatePresence, motion, useReducedMotionConfig } from 'motion/react';
import { img, type Catalogue } from '../../data/catalogue';

/**
 * Wall of the leading alive titles (HANDOVER §9.3). Eliminated posters flip and fall
 * (staggered 8ms), survivors re-layout, revived ones fade up. Capped to the top 120 so it
 * stays light; the odometer carries the true count.
 */
export function AliveWall({ cat, ids }: { cat: Catalogue; ids: number[] }) {
  const reduce = useReducedMotionConfig();
  return (
    <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[62%] overflow-hidden" style={{ perspective: 800 }}>
      <div className="grid grid-cols-8 gap-1.5 px-2 pt-[calc(var(--sat)+8px)] opacity-60">
        <AnimatePresence initial={false}>
          {ids.map((id, n) => {
            const i = cat.indexById.get(id);
            if (i === undefined) return null;
            const t = cat.titles[i]!;
            return (
              <motion.div
                key={id}
                layout={!reduce}
                className="aspect-[2/3] overflow-hidden rounded-[5px]"
                style={{ backgroundColor: t.color }}
                initial={{ opacity: 0, y: 10, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1, rotateX: 0 }}
                exit={
                  reduce
                    ? { opacity: 0, transition: { duration: 0.2 } }
                    : { opacity: 0, rotateX: -80, y: 70, transition: { duration: 0.45, ease: [0.5, 0, 0.75, 0], delay: Math.min(n, 120) * 0.008 } }
                }
                transition={{ type: 'spring', stiffness: 260, damping: 30 }}
              >
                <img src={img(t.poster, 'w92')} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
      <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(7,6,10,0.35) 0%, rgba(7,6,10,0.55) 45%, var(--bg-0) 100%)' }} />
    </div>
  );
}
