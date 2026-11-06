import { useMemo } from 'react';
import { motion } from 'motion/react';
import type { Catalogue } from '../../data/catalogue';
import { similar } from '../../data/similar';
import { Poster } from '../../design/Poster';
import { useSheet } from '../../store/sheet';
import { useLibrary } from '../../store/library';
import { haptics } from '../../haptics/haptics';
import { spring } from '../../design/motion';

export function MoreLikeThis({ cat, index }: { cat: Catalogue; index: number }) {
  const open = useSheet((s) => s.openTitle);
  const items = useLibrary((s) => s.items);
  const picks = useMemo(() => similar(cat, index, 10, (i) => !!items[cat.titles[i]!.id]?.notForMe), [cat, index, items]);
  return (
    <section className="mt-8">
      <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-lo">More like this</h3>
      <div className="mt-3 grid grid-cols-3 gap-2.5">
        {picks.map((i) => (
          <motion.button
            key={cat.titles[i]!.id}
            whileTap={{ scale: 0.95 }}
            transition={spring}
            aria-label={cat.titles[i]!.title}
            onClick={() => {
              haptics.light();
              open(cat.titles[i]!.id);
            }}
          >
            <Poster title={cat.titles[i]!} size="w342" />
          </motion.button>
        ))}
      </div>
    </section>
  );
}
