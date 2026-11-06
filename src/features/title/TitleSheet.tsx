import { useEffect, useState } from 'react';
import { loadDetail, img, trait, type TitleDetail } from '../../data/catalogue';
import { useCatalogue } from '../../data/useCatalogue';
import { useSheet } from '../../store/sheet';
import { Sheet } from '../../nav/Sheet';
import traitsMeta from '../../../data/traits.json';

const VIBES = [...traitsMeta.scales, ...traitsMeta.bools].map((t) => ({ key: t.key, label: t.humanLabel, showAt: 'showAt' in t ? (t.showAt as number) : 0.9 }));
const fmtRuntime = (m: number) => `${Math.floor(m / 60)}h ${m % 60}m`;

/** Global title sheet. M2: hero + essentials. M3 adds actions, trailer, cast, more-like-this. */
export function TitleSheetHost() {
  const { titleId, close } = useSheet();
  return (
    <Sheet open={titleId !== null} onClose={close} label="Title details">
      {titleId !== null && <TitleSheetContent id={titleId} />}
    </Sheet>
  );
}

function TitleSheetContent({ id }: { id: number }) {
  const cat = useCatalogue();
  const [detail, setDetail] = useState<TitleDetail | null>(null);
  useEffect(() => {
    loadDetail(id).then(setDetail);
  }, [id]);
  if (!cat) return null;
  const i = cat.indexById.get(id);
  if (i === undefined) return null;
  const t = cat.titles[i]!;
  const vibes = VIBES.filter((v) => trait(cat, i, v.key) >= v.showAt).slice(0, 5);
  const streams = (t.providers.flatrate ?? []).map((pid) => cat.providerById.get(pid)).filter((p) => !!p);
  const meta = [t.year, t.runtime ? fmtRuntime(t.runtime) : t.seasons ? `${t.seasons} season${t.seasons > 1 ? 's' : ''}` : null, t.cert].filter(Boolean).join(' · ');

  return (
    <div>
      <div data-sheet-drag className="relative h-[46vw] max-h-72 min-h-48 touch-none" style={{ backgroundColor: t.color }}>
        {t.backdrop && <img src={img(t.backdrop, 'w780')} alt="" draggable={false} className="h-full w-full object-cover" />}
        <div className="absolute inset-0 bg-gradient-to-t from-bg-1 via-bg-1/30 to-black/20" />
      </div>
      <div className="relative -mt-12 px-5">
        <h2 className="font-title text-[2rem] leading-[1.02]">{t.title}</h2>
        <p className="mt-2 text-sm text-mid">
          {meta}
          <span className="ml-2 font-semibold text-gold">★ {t.rating.toFixed(1)}</span>
        </p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {t.genres.slice(0, 3).map((g) => (
            <span key={g} className="rounded-full border border-line px-2.5 py-1 text-xs text-mid">{cat.genres[g]}</span>
          ))}
          {vibes.map((v) => (
            <span key={v.key} className="rounded-full bg-white/[0.08] px-2.5 py-1 text-xs text-hi">{v.label}</span>
          ))}
        </div>
        {detail?.tagline && <p className="mt-4 text-[0.95rem] italic text-hi/80">{detail.tagline}</p>}
        <p className="mt-2 text-[0.95rem] leading-relaxed text-mid">{detail?.overview ?? ' '}</p>
        {streams.length > 0 && (
          <>
            <div className="mt-6 text-xs font-semibold uppercase tracking-[0.14em] text-lo">Stream in South Africa</div>
            <div className="mt-2.5 flex flex-wrap items-center gap-2.5">
              {streams.map((p) => (
                <div key={p.id} className="flex items-center gap-2 rounded-full border border-line bg-white/[0.04] py-1 pl-1 pr-3">
                  <img src={img(p.logo, 'w92')} alt="" className="h-7 w-7 rounded-full" />
                  <span className="text-sm">{p.name}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
