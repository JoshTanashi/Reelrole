import { motion } from 'motion/react';
import type { Catalogue } from '../../data/catalogue';
import { Sheet } from '../../nav/Sheet';
import { spring } from '../../design/motion';
import { haptics } from '../../haptics/haptics';
import { useSwipe } from './store';
import type { SwipeFilters } from './feed';

const KINDS: { id: SwipeFilters['kind']; label: string }[] = [
  { id: 'both', label: 'Both' },
  { id: 'movie', label: 'Movies' },
  { id: 'series', label: 'Series' },
];
const ERAS: { id: SwipeFilters['era']; label: string }[] = [
  { id: 'any', label: 'Any era' },
  { id: 'classic', label: 'Classics' },
  { id: 'retro', label: '80s & 90s' },
  { id: 'y2k', label: '2000s' },
  { id: 'tens', label: '2010s' },
  { id: 'recent', label: 'Last few years' },
];

export function SwipeFilterSheet({ cat, open, onClose }: { cat: Catalogue; open: boolean; onClose: () => void }) {
  const { filters, setFilters } = useSwipe();
  const chip = (on: boolean) =>
    `h-9 rounded-full border px-3.5 text-[13px] font-semibold ${on ? 'border-white/20 bg-white/[0.14] text-hi' : 'border-line bg-white/[0.04] text-mid'}`;
  const tap = (fn: () => void) => () => {
    haptics.selection();
    fn();
  };
  return (
    <Sheet open={open} onClose={onClose} label="Swipe filters">
      <div className="px-5 pt-9">
        <div className="flex items-center justify-between">
          <h2 className="font-title text-[1.8rem]">Filters</h2>
          <button className="text-sm font-semibold text-ember" onClick={tap(() => setFilters({ kind: 'both', genres: [], era: 'any' }))}>
            Reset
          </button>
        </div>
        <h3 className="mt-5 text-xs font-semibold uppercase tracking-[0.14em] text-lo">Show me</h3>
        <div className="mt-2 flex gap-2">
          {KINDS.map((k) => (
            <motion.button key={k.id} whileTap={{ scale: 0.95 }} transition={spring} className={chip(filters.kind === k.id)} onClick={tap(() => setFilters({ kind: k.id }))}>
              {k.label}
            </motion.button>
          ))}
        </div>
        <h3 className="mt-6 text-xs font-semibold uppercase tracking-[0.14em] text-lo">Era</h3>
        <div className="mt-2 flex flex-wrap gap-2">
          {ERAS.map((e) => (
            <motion.button key={e.id} whileTap={{ scale: 0.95 }} transition={spring} className={chip(filters.era === e.id)} onClick={tap(() => setFilters({ era: e.id }))}>
              {e.label}
            </motion.button>
          ))}
        </div>
        <h3 className="mt-6 text-xs font-semibold uppercase tracking-[0.14em] text-lo">Genres</h3>
        <div className="mt-2 flex flex-wrap gap-2">
          {cat.genres.map((g, gi) => {
            const on = filters.genres.includes(gi);
            return (
              <motion.button
                key={g}
                whileTap={{ scale: 0.95 }}
                transition={spring}
                className={chip(on)}
                onClick={tap(() => setFilters({ genres: on ? filters.genres.filter((x) => x !== gi) : [...filters.genres, gi] }))}
              >
                {g}
              </motion.button>
            );
          })}
        </div>
      </div>
    </Sheet>
  );
}
