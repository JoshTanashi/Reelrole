import { img, type Catalogue, type ProvType, type Title } from '../../data/catalogue';

const GROUPS: { label: string; types: ProvType[] }[] = [
  { label: 'Stream', types: ['flatrate', 'free', 'ads'] },
  { label: 'Rent', types: ['rent'] },
  { label: 'Buy', types: ['buy'] },
];

/**
 * Where to watch in SA (HANDOVER §9.8). Info only (Joshie, M1): shown only when the
 * title has providers; taps open the TMDB/JustWatch watch page.
 */
export function Providers({ cat, t, link }: { cat: Catalogue; t: Title; link: string | null }) {
  const groups = GROUPS.map((g) => ({
    ...g,
    items: [...new Set(g.types.flatMap((ty) => t.providers[ty] ?? []))].map((id) => cat.providerById.get(id)).filter((p) => !!p),
  })).filter((g) => g.items.length);
  if (!groups.length) return null;

  return (
    <section className="mt-7">
      <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-lo">Where to watch in South Africa</h3>
      <div className="mt-3 space-y-3">
        {groups.map((g) => (
          <div key={g.label} className="flex items-center gap-3">
            <span className="w-14 shrink-0 text-sm text-mid">{g.label}</span>
            <div className="no-scrollbar -mr-5 flex gap-2 overflow-x-auto pr-5">
              {g.items.map((p) => (
                <a
                  key={p.id}
                  href={link ?? undefined}
                  target="_blank"
                  rel="noreferrer"
                  className="flex shrink-0 items-center gap-2 rounded-full border border-line bg-white/[0.04] py-1 pl-1 pr-3 active:scale-95"
                >
                  <img src={img(p.logo, 'w92')} alt="" className="h-7 w-7 rounded-full" />
                  <span className="text-sm">{p.name}</span>
                </a>
              ))}
            </div>
          </div>
        ))}
      </div>
      <p className="mt-2.5 text-[11px] text-lo">Availability powered by JustWatch</p>
    </section>
  );
}
