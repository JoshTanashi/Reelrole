import { motion } from 'motion/react';
import type { Catalogue } from '../../data/catalogue';
import { Poster } from '../../design/Poster';
import { useSheet } from '../../store/sheet';
import { haptics } from '../../haptics/haptics';
import { spring } from '../../design/motion';

export function PosterRow({ title, cat, indices, numbered = false }: { title: string; cat: Catalogue; indices: number[]; numbered?: boolean }) {
  const open = useSheet((s) => s.openTitle);
  if (!indices.length) return null;
  return (
    <section className="mt-7">
      <h2 className="px-5 text-[1.1rem] font-bold tracking-tight">{title}</h2>
      <div className="no-scrollbar mt-2.5 flex snap-x snap-mandatory gap-2.5 overflow-x-auto scroll-px-5 px-5 pb-1">
        {indices.map((i, n) => {
          const t = cat.titles[i]!;
          return (
            <motion.button
              key={t.id}
              whileTap={{ scale: 0.96 }}
              transition={spring}
              className={`relative shrink-0 snap-start ${numbered ? 'flex items-end pl-1' : ''}`}
              onClick={() => {
                haptics.light();
                open(t.id);
              }}
              aria-label={t.title}
            >
              {numbered && (
                <span
                  aria-hidden
                  className="font-title -mr-4 select-none text-[6.2rem] leading-[0.78]"
                  style={{ WebkitTextStroke: '2px rgba(246,243,250,0.55)', color: 'var(--bg-0)', fontVariationSettings: "'wdth' 62" }}
                >
                  {n + 1}
                </span>
              )}
              <Poster title={t} size="w342" className={numbered ? 'w-[96px]' : 'w-[112px]'} />
            </motion.button>
          );
        })}
      </div>
    </section>
  );
}
