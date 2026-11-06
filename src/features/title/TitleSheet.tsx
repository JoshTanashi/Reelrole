import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { PlayIcon } from '@phosphor-icons/react';
import { loadDetail, img, type TitleDetail } from '../../data/catalogue';
import { useCatalogue } from '../../data/useCatalogue';
import { vibesFor } from '../../data/vibes';
import { useSheet } from '../../store/sheet';
import { useLibrary } from '../../store/library';
import { Sheet } from '../../nav/Sheet';
import { Poster } from '../../design/Poster';
import { spring } from '../../design/motion';
import { haptics } from '../../haptics/haptics';
import { ActionRow } from './ActionRow';
import { Providers } from './Providers';
import { Cast } from './Cast';
import { MoreLikeThis } from './MoreLikeThis';
import { TrailerModal } from './Trailer';
import { fmtVotes, lengthLabel } from './format';

/** Global Title Detail Sheet (HANDOVER §9.8). */
export function TitleSheetHost() {
  const { titleId, close } = useSheet();
  return (
    <Sheet open={titleId !== null} onClose={close} label="Title details">
      <AnimatePresence mode="wait" initial={false}>
        {titleId !== null && (
          <motion.div key={titleId} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.16 }}>
            <TitleSheetContent id={titleId} />
          </motion.div>
        )}
      </AnimatePresence>
    </Sheet>
  );
}

function TitleSheetContent({ id }: { id: number }) {
  const cat = useCatalogue();
  const [detail, setDetail] = useState<TitleDetail | null>(null);
  const [more, setMore] = useState(false);
  const [trailer, setTrailer] = useState(false);
  const myRating = useLibrary((s) => s.items[id]?.myRating ?? null);
  const root = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    root.current?.closest('.overflow-y-auto')?.scrollTo({ top: 0 });
  }, [id]);
  useEffect(() => {
    let live = true;
    loadDetail(id).then((d) => live && setDetail(d));
    return () => {
      live = false;
    };
  }, [id]);

  if (!cat) return null;
  const i = cat.indexById.get(id);
  if (i === undefined) return null;
  const t = cat.titles[i]!;
  const vibes = vibesFor(cat, i, 5);
  const length = lengthLabel(t);

  return (
    <div ref={root}>
      {/* Hero */}
      <div data-sheet-drag className="relative h-[58vw] max-h-80 min-h-52 touch-none" style={{ backgroundColor: t.color }}>
        {t.backdrop && <img src={img(t.backdrop, 'w1280')} alt="" draggable={false} className="h-full w-full object-cover" />}
        <div className="absolute inset-0 bg-gradient-to-t from-bg-1 via-bg-1/25 to-black/30" />
        {detail?.trailer && (
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            whileTap={{ scale: 0.92 }}
            transition={spring}
            onClick={() => {
              haptics.light();
              setTrailer(true);
            }}
            className="glass absolute right-4 top-1/2 flex -translate-y-1/2 items-center gap-2 rounded-full py-2.5 pl-3 pr-4 text-sm font-semibold"
          >
            <PlayIcon size={18} weight="fill" /> Trailer
          </motion.button>
        )}
      </div>

      <div className="relative px-5">
        <div className="-mt-16 flex items-end gap-4">
          <Poster title={t} size="w342" eager className="w-[104px] shrink-0 shadow-[0_16px_40px_-10px_rgba(0,0,0,0.9)]" />
          <div className="min-w-0 pb-1">
            <h2 className="font-title text-[1.9rem] leading-[1.0]">{t.title}</h2>
            {detail?.originalTitle && <div className="mt-1 truncate text-xs text-lo">{detail.originalTitle}</div>}
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-sm text-mid">
          {t.year && <span>{t.year}</span>}
          {length && <span>· {length}</span>}
          {t.cert && <span className="rounded border border-white/25 px-1.5 py-[1px] text-[11px] font-semibold text-hi/80">{t.cert}</span>}
          {detail?.status && t.kind === 'series' && (
            <span className="rounded-full bg-white/[0.08] px-2 py-[2px] text-[11px] font-semibold">{detail.status === 'Ended' || detail.status === 'Canceled' ? 'Ended' : 'Still going'}</span>
          )}
        </div>

        {/* Ratings */}
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="flex items-center gap-1.5 rounded-full border border-line bg-white/[0.04] px-3 py-1.5 text-sm">
            <span className="font-semibold text-gold">★ {t.rating.toFixed(1)}</span>
            <span className="text-lo">TMDB · {fmtVotes(t.votes)}</span>
          </span>
          {detail?.imdbId && (
            <a href={`https://www.imdb.com/title/${detail.imdbId}/`} target="_blank" rel="noreferrer" className="rounded-full border border-line bg-white/[0.04] px-3 py-1.5 text-sm text-mid">
              IMDb ↗
            </a>
          )}
          {myRating && <span className="rounded-full border border-line bg-white/[0.04] px-3 py-1.5 text-sm text-mid">You: {'★'.repeat(myRating)}</span>}
        </div>

        <ActionRow id={id} />

        {/* Overview */}
        {detail?.tagline && <p className="mt-6 text-[0.95rem] font-medium italic text-hi/85">{detail.tagline}</p>}
        <button className="mt-2 block text-left" onClick={() => setMore((m) => !m)}>
          <p className={`text-[0.95rem] leading-relaxed text-mid ${more ? '' : 'line-clamp-3'}`}>{detail?.overview || ' '}</p>
          {!more && (detail?.overview?.length ?? 0) > 160 && <span className="text-sm font-semibold text-hi">more</span>}
        </button>

        {/* Genres + vibes */}
        <div className="mt-4 flex flex-wrap gap-1.5">
          {t.genres.slice(0, 3).map((g) => (
            <span key={g} className="rounded-full border border-line px-2.5 py-1 text-xs text-mid">{cat.genres[g]}</span>
          ))}
          {vibes.map((v) => (
            <span key={v.key} className="rounded-full bg-white/[0.08] px-2.5 py-1 text-xs text-hi">{v.label}</span>
          ))}
        </div>

        <Providers cat={cat} t={t} link={detail?.watchLink ?? null} />
        {detail && <Cast cast={detail.cast} />}
        <MoreLikeThis cat={cat} index={i} />

        <p className="mt-8 text-center text-[11px] text-lo">Title data from TMDB</p>
      </div>

      {detail?.trailer && <TrailerModal ytKey={detail.trailer} open={trailer} onClose={() => setTrailer(false)} />}
    </div>
  );
}
