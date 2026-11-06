import { useMemo } from 'react';
import { motion, useReducedMotionConfig } from 'motion/react';
import { img, type Catalogue } from '../../data/catalogue';

/** Faint drifting wall of tiny posters behind Find (HANDOVER §9.2). w92, 30% opacity. */
export function PosterWall({ cat, count = 72 }: { cat: Catalogue; count?: number }) {
  const reduce = useReducedMotionConfig();
  const picks = useMemo(() => {
    const top = cat.titles.map((_, i) => i).sort((a, b) => cat.titles[b]!.popularity - cat.titles[a]!.popularity).slice(0, 600);
    return top.sort(() => Math.random() - 0.5).slice(0, count);
  }, [cat, count]);

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <motion.div
        className="absolute -inset-x-[20%] -top-[10%] grid grid-cols-8 gap-2 opacity-30"
        style={{ rotate: -8 }}
        animate={reduce ? undefined : { y: ['0%', '-12%', '0%'] }}
        transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
      >
        {picks.map((i) => {
          const t = cat.titles[i]!;
          return (
            <div key={t.id} className="aspect-[2/3] overflow-hidden rounded-md" style={{ backgroundColor: t.color }}>
              <img src={img(t.poster, 'w92')} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
            </div>
          );
        })}
      </motion.div>
      <div className="absolute inset-0" style={{ background: 'radial-gradient(70% 55% at 50% 50%, rgba(7,6,10,0.25) 0%, rgba(7,6,10,0.85) 100%)' }} />
    </div>
  );
}
