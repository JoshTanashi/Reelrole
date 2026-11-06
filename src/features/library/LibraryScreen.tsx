import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { GearSixIcon, RowsIcon, SquaresFourIcon } from '@phosphor-icons/react';
import { Screen } from '../../nav/Screen';
import { LargeTitle } from '../../nav/LargeTitle';
import { useCatalogue } from '../../data/useCatalogue';
import type { Catalogue } from '../../data/catalogue';
import { spring } from '../../design/motion';
import { haptics } from '../../haptics/haptics';
import { voiceSession } from '../../voice/reactions';
import { useLibrary, inSegment, type Segment, type UserTitle } from '../../store/library';
import { useSheet } from '../../store/sheet';
import { Poster } from '../../design/Poster';
import { PosterRow } from './Rows';
import { browseRows } from './browse';
import { libraryStats } from './stats';
import { SearchField, SearchOverlay } from './Search';
import { SettingsSheet } from './Settings';

const SEGMENTS: { id: Segment; label: string; empty: string; suffix: string }[] = [
  { id: 'list', label: 'My List', empty: 'emptyList', suffix: 'on your list' },
  { id: 'liked', label: 'Liked', empty: 'emptyLiked', suffix: 'you liked' },
  { id: 'watched', label: 'Watched', empty: 'emptyWatched', suffix: "you've watched" },
  { id: 'nope', label: 'Not for me', empty: 'emptyList', suffix: 'not for you' },
];

export function LibraryScreen() {
  const cat = useCatalogue();
  const items = useLibrary((s) => s.items);
  const [seg, setSeg] = useState<Segment>('list');
  const [grid, setGrid] = useState(false);
  const [searching, setSearching] = useState(false);
  const [settings, setSettings] = useState(false);
  const rows = useMemo(() => (cat ? browseRows(cat) : []), [cat]);
  const empties = useMemo(() => ({ list: voiceSession.say('emptyList'), liked: voiceSession.say('emptyLiked'), watched: voiceSession.say('emptyWatched'), nope: 'Nothing you’ve ruled out. Open-minded 😌' }), []);
  const stats = useMemo(() => (cat ? libraryStats(cat, items) : null), [cat, items]);
  const segInfo = SEGMENTS.find((s) => s.id === seg)!;

  const mine = useMemo(() => {
    if (!cat) return [];
    return Object.entries(items)
      .filter(([, u]) => inSegment(u, seg))
      .sort((a, b) => b[1].updatedAt - a[1].updatedAt)
      .map(([id]) => cat.indexById.get(Number(id)))
      .filter((i): i is number => i !== undefined);
  }, [cat, items, seg]);

  return (
    <Screen tab="library" hideBarOnScroll>
      {(ref) => (
        <div className="pb-[calc(var(--sab)+110px)]">
          <LargeTitle
            title="Library"
            scrollRef={ref}
            right={
              <button
                aria-label="Settings"
                className="grid h-9 w-9 place-items-center rounded-full text-mid"
                onClick={() => {
                  haptics.light();
                  setSettings(true);
                }}
              >
                <GearSixIcon size={23} />
              </button>
            }
          />
          {stats && <p className="px-5 pt-1 text-[13px] font-medium text-mid">{stats}</p>}
          <SearchField
            onOpen={() => {
              haptics.light();
              setSearching(true);
            }}
          />

          {/* Segmented control */}
          <div className="mx-5 mt-4 flex rounded-full border border-line bg-white/[0.04] p-1">
            {SEGMENTS.map((s) => (
              <button
                key={s.id}
                className="relative h-9 flex-1 text-[13px] font-semibold"
                onClick={() => {
                  haptics.selection();
                  setSeg(s.id);
                }}
              >
                {seg === s.id && <motion.span layoutId="lib-seg" className="absolute inset-0 rounded-full bg-white/[0.12]" transition={spring} />}
                <span className={`relative ${seg === s.id ? 'text-hi' : 'text-lo'}`}>{s.label}</span>
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={seg + (grid ? 'g' : 'r')} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
              {!cat ? null : mine.length === 0 ? (
                <div className="mx-5 mt-4 grid h-36 place-items-center rounded-card border border-dashed border-white/10 text-center">
                  <p className="px-8 text-[15px] text-mid">{empties[seg]}</p>
                </div>
              ) : (
                <>
                  <div className="mt-5 flex items-center justify-between px-5">
                    <span className="text-sm text-mid">
                      {mine.length} title{mine.length > 1 ? 's' : ''}
                    </span>
                    <button
                      aria-label={grid ? 'Show rows' : 'Show grid'}
                      className="grid h-8 w-8 place-items-center rounded-full text-mid"
                      onClick={() => {
                        haptics.selection();
                        setGrid((g) => !g);
                      }}
                    >
                      {grid ? <RowsIcon size={20} /> : <SquaresFourIcon size={20} />}
                    </button>
                  </div>
                  {grid ? <Grid cat={cat} indices={mine} /> : <MyRows cat={cat} indices={mine} items={items} suffix={segInfo.suffix} />}
                </>
              )}
            </motion.div>
          </AnimatePresence>

          {cat && (
            <>
              <h2 className="font-title mt-12 px-5 text-[1.6rem]">Browse</h2>
              {rows.map((r) => (
                <PosterRow key={r.title} cat={cat} title={r.title} indices={r.items} numbered={'numbered' in r && r.numbered} />
              ))}
            </>
          )}

          {cat && <SearchOverlay cat={cat} open={searching} onClose={() => setSearching(false)} />}
          <SettingsSheet open={settings} onClose={() => setSettings(false)} />
        </div>
      )}
    </Screen>
  );
}

/** Netflix-style grouping: by kind, then top genres (HANDOVER §9.7). */
function MyRows({ cat, indices, suffix }: { cat: Catalogue; indices: number[]; items: Record<number, UserTitle>; suffix: string }) {
  const groups: { title: string; items: number[] }[] = [];
  const series = indices.filter((i) => cat.titles[i]!.kind === 'series');
  const movies = indices.filter((i) => cat.titles[i]!.kind === 'movie');
  if (series.length && movies.length) {
    groups.push({ title: `Series ${suffix}`, items: series }, { title: `Movies ${suffix}`, items: movies });
  } else groups.push({ title: series.length ? `Series ${suffix}` : `Movies ${suffix}`, items: indices });

  const byGenre = new Map<number, number[]>();
  for (const i of indices) for (const g of cat.titles[i]!.genres.slice(0, 2)) byGenre.set(g, [...(byGenre.get(g) ?? []), i]);
  [...byGenre.entries()]
    .filter(([, xs]) => xs.length >= 3 && xs.length < indices.length)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 3)
    .forEach(([g, xs]) => groups.push({ title: `${cat.genres[g]} ${suffix}`, items: xs }));

  return (
    <div className="-mt-3">
      {groups.map((g) => (
        <PosterRow key={g.title} cat={cat} title={g.title} indices={g.items} />
      ))}
    </div>
  );
}

function Grid({ cat, indices }: { cat: Catalogue; indices: number[] }) {
  const open = useSheet((s) => s.openTitle);
  return (
    <div className="mt-3 grid grid-cols-3 gap-2.5 px-5">
      {indices.map((i) => (
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
  );
}
