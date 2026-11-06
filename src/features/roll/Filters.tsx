import { useState } from 'react';
import { motion } from 'motion/react';
import { CaretDownIcon, CheckIcon } from '@phosphor-icons/react';
import type { Catalogue, Kind } from '../../data/catalogue';
import { Sheet } from '../../nav/Sheet';
import { spring } from '../../design/motion';
import { haptics } from '../../haptics/haptics';
import { useRoll } from './store';

const KINDS: { id: Kind | 'both'; label: string }[] = [
  { id: 'both', label: 'Both' },
  { id: 'movie', label: 'Movies' },
  { id: 'series', label: 'Series' },
];

export function RollFilters({ cat, poolSize }: { cat: Catalogue; poolSize: number }) {
  const { filters, setFilters } = useRoll();
  const [genreSheet, setGenreSheet] = useState(false);
  const genreLabel = filters.genres.length === 0 ? 'Any genre' : filters.genres.length === 1 ? cat.genres[filters.genres[0]!] : `${filters.genres.length} genres`;

  return (
    <div className="mt-3">
      <div className="no-scrollbar -mx-5 flex items-center gap-2 overflow-x-auto px-5">
        <div className="flex shrink-0 rounded-full border border-line bg-white/[0.04] p-0.5">
          {KINDS.map((k) => (
            <button
              key={k.id}
              className="relative h-8 px-3.5 text-[13px] font-semibold"
              onClick={() => {
                haptics.selection();
                setFilters({ kind: k.id });
              }}
            >
              {filters.kind === k.id && <motion.span layoutId="roll-kind" className="absolute inset-0 rounded-full bg-white/[0.12]" transition={spring} />}
              <span className={`relative ${filters.kind === k.id ? 'text-hi' : 'text-lo'}`}>{k.label}</span>
            </button>
          ))}
        </div>
        <Chip
          active={filters.genres.length > 0}
          onClick={() => {
            haptics.light();
            setGenreSheet(true);
          }}
        >
          {genreLabel} <CaretDownIcon size={12} weight="bold" />
        </Chip>
        <Chip
          active={filters.fromMyList}
          onClick={() => {
            haptics.selection();
            setFilters({ fromMyList: !filters.fromMyList });
          }}
        >
          {filters.fromMyList && <CheckIcon size={13} weight="bold" />} From my list
        </Chip>
      </div>
      <div className="mt-2 text-xs text-lo">{poolSize.toLocaleString()} in the reel</div>

      <Sheet open={genreSheet} onClose={() => setGenreSheet(false)} initial={0} label="Genres">
        <div className="px-5 pt-9">
          <div className="flex items-center justify-between">
            <h2 className="font-title text-[1.6rem]">Genres</h2>
            {filters.genres.length > 0 && (
              <button className="text-sm font-semibold text-ember" onClick={() => setFilters({ genres: [] })}>
                Clear
              </button>
            )}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {cat.genres.map((g, gi) => {
              const on = filters.genres.includes(gi);
              return (
                <Chip
                  key={g}
                  active={on}
                  onClick={() => {
                    haptics.selection();
                    setFilters({ genres: on ? filters.genres.filter((x) => x !== gi) : [...filters.genres, gi] });
                  }}
                >
                  {g}
                </Chip>
              );
            })}
          </div>
        </div>
      </Sheet>
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      transition={spring}
      onClick={onClick}
      className={`flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-semibold ${active ? 'border-white/20 bg-white/[0.14] text-hi' : 'border-line bg-white/[0.04] text-mid'}`}
    >
      {children}
    </motion.button>
  );
}
