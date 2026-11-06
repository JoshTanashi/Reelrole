import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { loadCatalogue, loadDetail, trait, img, type Catalogue, type TitleDetail } from '../data/catalogue';
import { Poster } from '../design/Poster';
import { spring, springGentle } from '../design/motion';
import { haptics } from '../haptics/haptics';
import traitsMeta from '../../data/traits.json';

const VIBES = [...traitsMeta.scales, ...traitsMeta.bools].map((t) => ({
  key: t.key,
  label: t.humanLabel,
  showAt: 'showAt' in t ? (t.showAt as number) : 0.9,
}));

const fmtRuntime = (m: number) => `${Math.floor(m / 60)}h ${m % 60}m`;

/** M1 check: proves the real catalogue loads on the phone. Replaced by real screens from M2. */
export function CatalogueCheck() {
  const [cat, setCat] = useState<Catalogue | null>(null);
  const [err, setErr] = useState('');
  const [seed, setSeed] = useState(0);
  const [open, setOpen] = useState<number | null>(null);
  const [detail, setDetail] = useState<TitleDetail | null>(null);

  useEffect(() => {
    loadCatalogue().then(setCat, (e) => setErr(String(e)));
  }, []);

  const sample = useMemo(() => {
    if (!cat) return [];
    const idx = new Set<number>();
    while (idx.size < 18) idx.add(Math.floor(Math.random() * cat.titles.length));
    return [...idx];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cat, seed]);

  useEffect(() => {
    setDetail(null);
    if (open !== null && cat) loadDetail(cat.titles[open]!.id).then(setDetail);
  }, [open, cat]);

  if (err) return <p className="text-sm text-no">Catalogue failed to load: {err}</p>;
  if (!cat) return <p className="text-sm text-mid">Loading catalogue…</p>;

  const movies = cat.titles.filter((t) => t.kind === 'movie').length;
  const t = open !== null ? cat.titles[open]! : null;
  const vibes = open !== null ? VIBES.filter((v) => trait(cat, open, v.key) >= v.showAt).slice(0, 5) : [];
  const streams = t ? (t.providers.flatrate ?? []).map((id) => cat.providerById.get(id)).filter(Boolean) : [];

  return (
    <div>
      <div className="flex items-end justify-between">
        <div>
          <div className="font-title tabular text-[3.2rem] leading-none">{cat.titles.length.toLocaleString()}</div>
          <div className="mt-1 text-sm text-mid">
            {movies.toLocaleString()} movies · {(cat.titles.length - movies).toLocaleString()} series
          </div>
        </div>
        <motion.button
          whileTap={{ scale: 0.95 }}
          transition={spring}
          className="h-10 rounded-full border border-line bg-white/[0.06] px-4 text-sm font-semibold"
          onClick={() => {
            haptics.light();
            setSeed((s) => s + 1);
          }}
        >
          Shuffle
        </motion.button>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2.5">
        {sample.map((i) => (
          <motion.button
            key={`${seed}-${i}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring, delay: (sample.indexOf(i) % 9) * 0.035 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => {
              haptics.light();
              setOpen(i);
            }}
          >
            <Poster title={cat.titles[i]!} size="w342" />
          </motion.button>
        ))}
      </div>

      <AnimatePresence>
        {t && (
          <motion.div
            className="fixed inset-0 z-50 flex items-end"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(null)}
          >
            <div className="absolute inset-0 bg-black/60" />
            <motion.div
              className="relative w-full overflow-hidden rounded-t-sheet bg-bg-1 pb-[calc(var(--sab)+20px)]"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={springGentle}
              onClick={(e) => e.stopPropagation()}
            >
              {t.backdrop && (
                <div className="relative h-44">
                  <img src={img(t.backdrop, 'w780')} alt="" className="h-full w-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-bg-1 via-bg-1/40 to-transparent" />
                </div>
              )}
              <div className="-mt-10 relative px-5">
                <h3 className="font-title text-[1.9rem] leading-[1.02]">{t.title}</h3>
                <p className="mt-1.5 text-sm text-mid">
                  {[t.year, t.runtime ? fmtRuntime(t.runtime) : t.seasons ? `${t.seasons} season${t.seasons > 1 ? 's' : ''}` : null, t.cert, `★ ${t.rating.toFixed(1)}`]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {t.genres.slice(0, 3).map((g) => (
                    <span key={g} className="rounded-full border border-line px-2.5 py-1 text-xs text-mid">{cat.genres[g]}</span>
                  ))}
                  {vibes.map((v) => (
                    <span key={v.key} className="rounded-full bg-white/[0.08] px-2.5 py-1 text-xs text-hi">{v.label}</span>
                  ))}
                </div>
                <p className="mt-3 line-clamp-3 text-[0.95rem] leading-relaxed text-mid">{detail?.overview ?? ' '}</p>
                <div className="mt-4 text-xs font-semibold uppercase tracking-[0.14em] text-lo">Stream in SA</div>
                <div className="mt-2 flex items-center gap-2">
                  {streams.length ? (
                    streams.map((p) => <img key={p!.id} src={img(p!.logo, 'w92')} alt={p!.name} title={p!.name} className="h-9 w-9 rounded-[10px]" />)
                  ) : (
                    <span className="text-sm text-mid">Not streaming in SA right now</span>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
